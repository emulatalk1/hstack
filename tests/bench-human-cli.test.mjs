import { test, expect, afterAll, spyOn } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { human } from '../bench/human.mjs'
import { oracle } from '../bench/oracle.mjs'
import { queuePick } from '../bench/lib/oracle.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-human-')))
const prevMachine = process.env.HSTACK_BENCH_MACHINE
afterAll(() => {
  if (prevMachine === undefined) delete process.env.HSTACK_BENCH_MACHINE
  else process.env.HSTACK_BENCH_MACHINE = prevMachine
  rmSync(tmp, { recursive: true, force: true })
})
const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out: out.join('\n') } } finally { a.mockRestore(); b.mockRestore() }
}
const withData = async (d, fn) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await fn() } finally { process.env.HSTACK_BENCH_MACHINE = prev }
}
const put = (root, files) => { for (const [f, text] of Object.entries(files)) { mkdirSync(join(root, f, '..'), { recursive: true }); writeFileSync(join(root, f), typeof text === 'string' ? text : JSON.stringify(text)) } }
const jsonAt = (f) => JSON.parse(readFileSync(f, 'utf8'))
const SEED = 'seed-h'
const SAMPLE_HEAD = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tcold_setup'

// --- the fixture: a task repo with one fix commit and one test file, a classify folder, a queue with one row per batch ---
const repo = join(tmp, 'repo'), d = join(tmp, 'data')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const commit = (files, msg) => { put(repo, files); git('add', '-A'); git('commit', '-qm', msg); return git('rev-parse', 'HEAD') }
mkdirSync(repo, { recursive: true }); git('init', '-q')
const TEST = "describe('a', () => {\n  test('SENTINEL-TITLE adds up', () => {})\n})\n"
const c0 = commit({ 'src/a.txt': 'a\n' }, 'zero')
const fix = commit({ 'src/a.txt': 'A\n', 'tests/a.test.ts': TEST }, 'SENTINEL-SUBJECT fix a')
const end = commit({ 'tests/a.test.ts': TEST + '// SENTINEL-AT-END\n', 'tests/s.test.ts': "test('SENTINEL-STEP-TITLE', () => {})\n" }, 'end')
const f7 = fix.slice(0, 7), e7 = end.slice(0, 7), id = `${f7}-T1`, sid = `${e7}-T1`, xid = `${e7}-T2`
const taskFile = join(tmp, 'task.json')
const envOf = (name) => ({ name, repo, db: null, port: 3999, start: null, ready: null, oracle: 'true', junit: 'r.xml' })
writeFileSync(taskFile, JSON.stringify(envOf('tt')))
const entry = (x, extra) => ({ id: x, fix_commit: fix, task: 'r1', hunk: 'src/a.txt:1', origin: 'tests/a.test.ts::SENTINEL-TITLE adds up', behaviour: `SENTINEL-BEHAVIOUR-${x}`, interface: 'browser', severity: 'high', ...extra })
put(d, {
  'machine.json': { forbid: { paths: [] } },
  'tasks.json': { r1: { no: 'P1', plan: 'one.md', base: c0, end } },
  'tasks/r1.tsv': 'commit\tfile\told_lines\ttask_lines\ttests_changed\tsubject\n',
  'ext/sample.tsv': `${SAMPLE_HEAD}\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\t${c0}\t${end}\tno\n`,
  'ext/groups.json': { seed: SEED, groups: [] },
  'env/x1-01.json': envOf('x1-01'),
  'briefs/label.md': 'SENTINEL-BRIEF\n',
  'sources/pairs.tsv': `commit\ttask\tkind\thunks\n${fix}\tr1\tin-task\tsrc/a.txt:1\n`,
  'r1/input.md': 'SENTINEL-INPUT\n',
  'r1/interface.md': 'SENTINEL-SHEET\n',
  'r1/oracle/manifest.json': [entry(id)],
  [`r1/oracle/${id}.spec.ts`]: 'SENTINEL-CHECK-FIX\n',
  [`r1/validation-${f7}.json`]: { ref: fix, checks: [{ id, verdict: 'valid' }] },
  'r1/step/oracle/manifest.json': [entry(sid, { fix_commit: end, origin: 'tests/s.test.ts::SENTINEL-STEP-TITLE', step: '1' })],
  [`r1/step/oracle/${sid}.spec.ts`]: 'SENTINEL-CHECK-STEP\n',
  'r1/work/classify/input.md': 'SENTINEL-INPUT\n',
  'r1/work/classify/interface.md': 'SENTINEL-SHEET\n',
  'r1/work/classify/manifest.json': [{ id, behaviour: 'SENTINEL-BEHAVIOUR', interface: 'browser', severity: 'high' }],
  [`r1/work/classify/${id}.spec.ts`]: 'SENTINEL-CHECK-FIX\n',
  'r1/classify-1.json': [{ id, label: 'traceable' }],
  'r1/classify-2.json': [{ id, label: 'not traceable' }],
  'r1/labels.json': { other: 'build' },
  'r1/agreement.json': { disputed: [id] },
  'x1-01/oracle/manifest.json': [entry(xid, { fix_commit: end, task: 'x1-01', file: 'checks/x.test.ts' })],
  'x1-01/oracle/checks/x.test.ts': 'SENTINEL-CHECK-EXT\n',
  'step9/labels.tsv': `commit\ttask\tkind\n${fix}\tr1\tin-task\n`,
  'step9/classify.tsv': `task\tid\nr1\t${id}\n`,
  'step9/p8b-classify.tsv': 'task\tid\n',
  'step9/sample-7.1.tsv': `set\ttask\tid\ntask-repo\tr1\t${id}\nx1\tx1-01\t${xid}\n`,
  'step9/sample-7.1-step.tsv': `set\ttask\tid\ntask-repo\tr1\t${sid}\n`,
  'step9/sample-7.2.tsv': `set\ttask\tid\ntask-repo\tr1\t${id}\n`,
  'step9/inputs.tsv': 'set\ttask\ntask-repo\tr1\n',
  'canary/pairs/x1-01-B.diff': 'SENTINEL-DIFF-B\n',
  'canary/pairs/x1-01-B-.diff': 'SENTINEL-DIFF-BMINUS\n',
  'logs/one.md': `noise\nSENTINEL-LOG ${f7} done\n`,
  'logs/sub/two.md': `SENTINEL-LOG2 ${f7}\n`,
  'attribution.md': `SENTINEL-ATTR ${f7}\nother\n`,
})
const BUILDS = [['inputs'], ['oracle-7.1', taskFile], ['rerate-7.2'], ['classify'], ['labels', taskFile, '--log', join(d, 'logs'), '--attribution', join(d, 'attribution.md')], ['pairs']]
const run = (args) => withData(d, () => quiet(() => human(args)))
const page = (b) => jsonAt(join(d, 'step9/pages', `${b}.json`))
const built = (async () => { const outs = []; for (const b of BUILDS) outs.push(await run(['build', ...b])); return outs })()

test('build writes one row per queue row', async () => {
  for (const r of await built) expect(r.code).toBe(0)
  expect(page('inputs').map((r) => r.key)).toEqual(['r1'])
  expect(page('oracle-7.1').map((r) => r.key)).toEqual([id, xid, sid])
  expect(page('rerate-7.2').map((r) => r.key)).toEqual([id])
  expect(page('classify').map((r) => r.key)).toEqual([id])
  expect(page('labels')).toHaveLength(1)
  expect(page('labels')[0].kind).toBe('in-task')
  expect(page('pairs').map((r) => [r.key, r.parts.map((p) => p.text.trim())])).toEqual([['x1-01', ['SENTINEL-DIFF-B', 'SENTINEL-DIFF-BMINUS']]])
  const lab = page('labels')[0].parts.map((p) => p.text).join('\n')
  for (const s of ['SENTINEL-BRIEF', `r1: plan P1 (\`one.md\`), its commits ${c0}..${end} (first parent).`, `- ${fix} (in-task): SENTINEL-SUBJECT fix a`, 'SENTINEL-LOG ', 'SENTINEL-LOG2', 'SENTINEL-ATTR']) expect(lab).toContain(s)
  expect(lab).not.toContain('noise')
  const inp = page('inputs')[0].parts.map((p) => p.text)
  expect(inp).toEqual(['SENTINEL-INPUT\n', 'SENTINEL-SHEET\n', 'PASS no code, test or source pointer'])
  // seen.tsv: one line per row, and a rebuild adds none
  await run(['build', 'pairs'])
  const seen = readFileSync(join(d, 'step9/seen.tsv'), 'utf8').trim().split('\n')
  expect(seen[0]).toBe('batch\ttask\tkey')
  expect(seen.slice(1)).toHaveLength(1 + 3 + 1 + 1 + 1 + 1)
  expect(seen).toContain(`labels\tr1\tr1:${fix}`)
})

test('a classification page holds no rater label and no verdict', async () => {
  await built
  const text = JSON.stringify(page('classify')) + JSON.stringify(page('rerate-7.2'))
  const values = [...['classify-1.json', 'classify-2.json'].flatMap((f) => jsonAt(join(d, 'r1', f)).map((x) => x.label)), ...Object.values(jsonAt(join(d, 'r1/labels.json'))),
    ...jsonAt(join(d, 'r1', `validation-${f7}.json`)).checks.map((x) => x.verdict)]
  expect(values).toEqual(['traceable', 'not traceable', 'build', 'valid'])
  for (const v of values) expect(text).not.toContain(v)
  expect(page('classify')[0].parts.map((p) => p.title)).toEqual(['input.md', 'interface.md', 'entry', `check ${id}.spec.ts`])
})

test('a 7.1 page shows the check next to the test at the fix commit', async () => {
  await built
  const [fixRow, extRow, stepRow] = page('oracle-7.1'), text = (r) => r.parts.map((p) => p.text).join('\n')
  expect(text(fixRow)).toContain('SENTINEL-CHECK-FIX')
  expect(text(fixRow)).toContain('behaviour: SENTINEL-BEHAVIOUR-')
  expect(fixRow.parts.at(-1).text).toContain(">>   test('SENTINEL-TITLE adds up'")
  expect(text(fixRow)).not.toContain('SENTINEL-AT-END') // the test file as the fix commit holds it
  expect(JSON.stringify(page('oracle-7.1'))).not.toContain(fix.slice(0, 8)) // never fix_commit (its sha7 is the id prefix)
  expect(JSON.stringify(page('oracle-7.1'))).not.toContain('origin')
  expect(text(extRow)).toContain('SENTINEL-CHECK-EXT')
  expect(text(extRow)).toContain('SENTINEL-AT-END') // the PR's test at the end
  expect(text(stepRow)).toContain('SENTINEL-CHECK-STEP')
  expect(stepRow.parts.at(-1).text).toContain(">> test('SENTINEL-STEP-TITLE'")
})

const started = []
afterAll(() => { for (const s of started) s.stop(true) })
const serveOn = async (batch) => { const r = await run(['serve', batch]); started.push(r.code); return { server: r.code, out: r.out, token: readFileSync(join(d, 'step9/pages', `${batch}.token`), 'utf8').trim() } }
const url = (s, p) => `http://127.0.0.1:${s.server.port}${p}`
const post = (s, body, token = s.token) => fetch(url(s, `/${token}/answer`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

test('build and serve print counts only', async () => {
  const outs = await built
  expect(outs.map((r) => r.out)).toEqual(['build inputs: rows 1, parts 3', 'build oracle-7.1: rows 3, parts 9', 'build rerate-7.2: rows 1, parts 4', 'build classify: rows 1, parts 4', 'build labels: rows 1, parts 5', 'build pairs: rows 1, parts 2'])
  const s = await serveOn('classify')
  expect(s.out).toBe(`serve classify port ${s.server.port}`)
  expect(s.out).not.toContain('SENTINEL')
  const st = await run(['status'])
  expect(st.out).not.toContain('SENTINEL')
  expect(st.out.split('\n')).toContain('status classify: rows 1, answered 0, applied no')
})

test('the server needs its token', async () => {
  await built
  const s = await serveOn('inputs')
  expect(statSync(join(d, 'step9/pages/inputs.token')).mode & 0o777).toBe(0o600)
  for (const p of ['/', '/data', '/x/', `/${s.token.slice(1)}/`, `/${s.token}x/data`]) expect((await fetch(url(s, p))).status).toBe(404)
  expect((await post(s, { key: 'r1', answer: 'clean' }, 'nope')).status).toBe(404)
  const html = await fetch(url(s, `/${s.token}/`))
  expect(html.status).toBe(200)
  const body = await html.text()
  expect(body).not.toContain('SENTINEL')
  expect(body).not.toMatch(/<script[^>]+src=|<link[^>]+href=|@import|https?:\/\//)
  expect((await fetch(url(s, `/${s.token}`), { redirect: 'manual' })).headers.get('location')).toBe(`/${s.token}/`)
  const data = await (await fetch(url(s, `/${s.token}/data`))).json()
  expect(data.rows.map((r) => [r.key, r.answers])).toEqual([['r1', ['clean', 'leak']]])
})

test('the server refuses an unknown key, an unknown answer and any write after apply', async () => {
  await built
  const s = await serveOn('labels'), file = join(d, 'step9/answers/labels.tsv'), key = `r1:${fix}`
  expect((await post(s, { key: 'nope', answer: 'fix' })).status).toBe(400)
  expect((await post(s, { key, answer: 'requirement change' })).status).toBe(400) // an in-task pair answers fix or build
  expect((await post(s, { key, answer: 'traceable' })).status).toBe(400)
  expect((await fetch(url(s, `/${s.token}/answer`), { method: 'POST', body: 'not json' })).status).toBe(400)
  expect(existsSync(file)).toBe(false)
  mkdirSync(join(d, 'step9/answers'), { recursive: true })
  writeFileSync(join(d, 'step9/answers/labels.applied'), 'sha\n')
  expect((await post(s, { key, answer: 'fix' })).status).toBe(409)
  expect(existsSync(file)).toBe(false)
  expect((await (await fetch(url(s, `/${s.token}/data`))).json()).applied).toBe(true)
})

test('a POST appends one row', async () => {
  await built
  const s = await serveOn('pairs'), file = join(d, 'step9/answers/pairs.tsv')
  expect((await post(s, { key: 'x1-01', answer: 'same', note: 'SENTINEL-NOTE\ta\nb' })).status).toBe(200)
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
  expect(lines).toHaveLength(1)
  const f = lines[0].split('\t')
  expect(f.slice(0, 3)).toEqual(['x1-01', 'same', 'SENTINEL-NOTE a b'])
  expect(Number.isNaN(Date.parse(f[3]))).toBe(false)
  expect((await post(s, { key: 'x1-01', answer: 'B- better', note: 'n'.repeat(3000) })).status).toBe(200)
  expect(readFileSync(file, 'utf8').split('\n').filter(Boolean)[1].split('\t')[2]).toHaveLength(2000)
  const data = await (await fetch(url(s, `/${s.token}/data`))).json()
  expect(data.answers).toEqual({ 'x1-01': 'B- better' }) // the last answer wins; no note
  expect(JSON.stringify(data)).not.toContain('SENTINEL-NOTE')
  expect((await run(['status'])).out.split('\n')).toContain('status pairs: rows 1, answered 1, applied no')
})

// --- swap (ruling 3): the locked files come from `oracle queue` over a fixture whose pools are larger than the picks ---
const swapData = (name) => {
  const s = join(tmp, name), tasks = ['x1-01', 'x1-02', 'x1-03']
  const rows = (t, k, n) => Array.from({ length: n }, (_, i) => `${k}-T${i + 1}`)
  put(s, {
    'machine.json': { forbid: { paths: [] } },
    'tasks.json': { r1: { base: 'b', end: 'e' } },
    'ext/sample.tsv': `${SAMPLE_HEAD}\n${tasks.map((t, i) => `${t}\tx1\t1\t${i + 1}\town/rp#${i}\tu\t${i}\t1\tb\te\tno`).join('\n')}\n`,
    'ext/groups.json': { seed: SEED, groups: [] },
  })
  for (const [t, k, n] of [['r1', 'aaaaaaa', 3], ['x1-01', 'bbbbbbb', 12], ['x1-02', 'ccccccc', 12], ['x1-03', 'ddddddd', 12]]) {
    const ids = rows(t, k, n)
    put(s, {
      [`${t}/oracle/manifest.json`]: ids.map((x) => ({ id: x, fix_commit: k.padEnd(40, '0'), interface: 'browser' })),
      [`${t}/validation-${k}.json`]: { checks: ids.map((x) => ({ id: x, verdict: 'valid' })) },
      [`${t}/classify-1.json`]: ids.map((x) => ({ id: x, label: 'traceable' })),
      [`${t}/classify-2.json`]: ids.map((x) => ({ id: x, label: 'traceable' })),
      [`${t}/agreement.json`]: { disputed: [] },
    })
  }
  return s
}
const tsvAt = (s, f) => readFileSync(join(s, 'step9', f), 'utf8').trim().split('\n').map((l) => l.split('\t'))

test('swap replaces the cold rows and keeps every other row', async () => {
  const s = swapData('sw1')
  expect((await withData(s, () => quiet(() => oracle(['queue'])))).code).toBe(0)
  const locked = Object.fromEntries(['sample-7.1.tsv', 'sample-7.2.tsv', 'inputs.tsv'].map((f) => [f, readFileSync(join(s, 'step9', f), 'utf8')]))
  const cold = tsvAt(s, 'inputs.tsv').find((r) => r[0] === 'external')[1] // a task the locked inputs picked
  writeFileSync(join(s, 'ext/sample.tsv'), readFileSync(join(s, 'ext/sample.tsv'), 'utf8').replace(new RegExp(`^(${cold}\t.*)\tno$`, 'm'), '$1\tyes'))
  const r = await withData(s, () => quiet(() => human(['swap'])))
  expect(r.code).toBe(0)
  const replaced = (f, col) => tsvAt(s, f).slice(1).filter((x) => x[col] === cold).length
  expect(replaced('sample-7.1.tsv', 1) * replaced('sample-7.2.tsv', 1)).toBeGreaterThan(0) // the fixture puts cold rows in both samples
  expect(r.out.split('\n')).toEqual([
    `swap sample-7.1.tsv: reproduced yes, rows 13, replaced ${replaced('sample-7.1.tsv', 1)}`,
    `swap sample-7.2.tsv: reproduced yes, rows 23, replaced ${replaced('sample-7.2.tsv', 1)}`,
    'swap inputs.tsv: reproduced yes, rows 3, replaced 1',
  ])
  for (const [f, text] of Object.entries(locked)) {
    expect(readFileSync(join(s, 'step9', f), 'utf8')).toBe(text) // the locked files are not written
    const v2 = tsvAt(s, f.replace('.tsv', '-v2.tsv')), old = tsvAt(s, f), col = 1
    expect(v2[0]).toEqual(old[0])
    expect(v2.slice(1).some((x) => x[col] === cold)).toBe(false)
    expect(v2.length).toBe(old.length)
    const kept = old.slice(1).filter((x) => x[col] !== cold).map((x) => x.join('\t'))
    expect(v2.slice(1).map((x) => x.join('\t')).filter((x) => kept.includes(x))).toEqual(kept) // every other row, in order
  }
  // the external 7.1 set is the pick over the pool without the cold task's ids
  const pool = ['x1-01', 'x1-02', 'x1-03'].filter((t) => t !== cold).flatMap((t) => jsonAt(join(s, t, 'oracle/manifest.json')).map((m) => m.id))
  expect(tsvAt(s, 'sample-7.1-v2.tsv').slice(1).filter((x) => x[0] === 'x1').map((x) => x[2])).toEqual(queuePick(pool, 10, SEED))
})

test('swap refuses when the rebuilt pool does not reproduce the locked file', async () => {
  const s = swapData('sw2')
  expect((await withData(s, () => quiet(() => oracle(['queue'])))).code).toBe(0)
  const f = join(s, 'step9/sample-7.2.tsv'), text = readFileSync(f, 'utf8')
  writeFileSync(f, text.replace(/[^\t\n]+\n$/, 'zzzzzzz-T99\n')) // the last row's id
  const r = await withData(s, () => quiet(() => human(['swap'])))
  expect(r.code).toBe(1)
  expect(r.out.split('\n')).toEqual(['swap sample-7.1.tsv: reproduced yes, rows 13, replaced 0', 'swap sample-7.2.tsv: reproduced no', 'swap inputs.tsv: reproduced yes, rows 3, replaced 0'])
  expect(existsSync(join(s, 'step9/sample-7.2-v2.tsv'))).toBe(false)
})

test('build refuses a row whose check file is missing', async () => {
  await built
  const f = join(d, 'r1/work/classify', `${id}.spec.ts`), text = readFileSync(f, 'utf8')
  rmSync(f)
  try { await expect(run(['build', 'classify'])).rejects.toThrow('a row of r1 has no check file') } finally { writeFileSync(f, text) }
})

test('an answer with an empty note keeps the earlier note', async () => {
  await built
  const s = await serveOn('rerate-7.2'), file = join(d, 'step9/answers/rerate-7.2.tsv'), note = () => readFileSync(file, 'utf8').trim().split('\n').at(-1).split('\t')[2]
  expect((await post(s, { key: id, answer: 'partly', note: 'SENTINEL-KEEP' })).status).toBe(200)
  expect((await post(s, { key: id, answer: 'traceable', note: '' })).status).toBe(200)
  expect(note()).toBe('SENTINEL-KEEP')
  const data = await (await fetch(url(s, `/${s.token}/data`))).json()
  expect([data.answers, data.hasNote]).toEqual([{ [id]: 'traceable' }, { [id]: true }])
  expect(JSON.stringify(data)).not.toContain('SENTINEL-KEEP')
  expect((await post(s, { key: id, answer: 'traceable', note: 'other' })).status).toBe(200)
  expect(note()).toBe('other')
})

test('a 7.1 page says when the test file is not at the commit', async () => {
  await built
  const m = join(d, 'x1-01/oracle/manifest.json'), text = readFileSync(m, 'utf8')
  writeFileSync(m, text.replace('tests/a.test.ts::', 'tests/gone.test.ts::'))
  try {
    expect((await run(['build', 'oracle-7.1', taskFile])).code).toBe(0)
    expect(page('oracle-7.1')[1].parts.at(-1).text).toBe('the test file is not at this commit')
  } finally { writeFileSync(m, text); await run(['build', 'oracle-7.1', taskFile]) }
})

test('swap --drop leaves out a task the queue did not draw from', async () => {
  const s = swapData('sw3')
  expect((await withData(s, () => quiet(() => oracle(['queue'])))).code).toBe(0)
  // a task-repo task that got its classification after the queue: its checks sort into the picks
  const ids = Array.from({ length: 30 }, (_, i) => `eeeeeee-T${i + 1}`)
  put(s, {
    'tasks.json': { r1: { base: 'b', end: 'e' }, r9: { base: 'b', end: 'e' } },
    'r9/oracle/manifest.json': ids.map((x) => ({ id: x, fix_commit: 'eeeeeee'.padEnd(40, '0'), interface: 'browser' })),
    'r9/validation-eeeeeee.json': { checks: ids.map((x) => ({ id: x, verdict: 'valid' })) },
    'r9/classify-1.json': ids.map((x) => ({ id: x, label: 'traceable' })),
    'r9/classify-2.json': ids.map((x) => ({ id: x, label: 'traceable' })),
    'r9/agreement.json': { disputed: [] },
  })
  const plain = await withData(s, () => quiet(() => human(['swap'])))
  expect(plain.code).toBe(1)
  expect(plain.out.split('\n')).toEqual(['sample-7.1', 'sample-7.2', 'inputs'].map((f) => `swap ${f}.tsv: reproduced no`))
  expect(['sample-7.1', 'sample-7.2', 'inputs'].some((f) => existsSync(join(s, 'step9', `${f}-v2.tsv`)))).toBe(false)
  const dropped = await withData(s, () => quiet(() => human(['swap', '--drop', 'r9'])))
  expect(dropped.code).toBe(0)
  expect(dropped.out.split('\n')).toEqual(['swap sample-7.1.tsv: reproduced yes, rows 13, replaced 0', 'swap sample-7.2.tsv: reproduced yes, rows 23, replaced 0', 'swap inputs.tsv: reproduced yes, rows 3, replaced 0'])
})
