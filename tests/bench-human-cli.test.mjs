import { test, expect, afterAll, spyOn } from 'bun:test'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { human } from '../bench/human.mjs'
import { eventKey } from '../bench/lib/human.mjs'
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
  expect(outs.map((r) => r.out)).toEqual(['build inputs: rows 1, parts 3', 'build oracle-7.1: rows 3, parts 9', 'build rerate-7.2: rows 1, parts 4', 'build classify: rows 1, parts 4, cold left out 0', 'build labels: rows 1, parts 5', 'build pairs: rows 1, parts 2'])
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

// --- history (ruling 8): a fixture transcripts folder against a fixture plan table with controlled commit times ---
const hRepo = join(tmp, 'hrepo'), hd = join(tmp, 'hdata'), tr = join(tmp, 'transcripts'), hTask = join(tmp, 'htask.json')
const hgit = (...a) => Bun.spawnSync(['git', '-C', hRepo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const hcommit = (at, msg) => {
  writeFileSync(join(hRepo, 'f.txt'), msg)
  hgit('add', '-A')
  Bun.spawnSync(['git', '-C', hRepo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', msg], { env: { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at } })
  return hgit('rev-parse', 'HEAD')
}
mkdirSync(hRepo, { recursive: true }); hgit('init', '-q')
const [h0, h1, h2] = [hcommit('2026-01-01T00:00:00Z', 'a'), hcommit('2026-01-02T00:00:00Z', 'b'), hcommit('2026-01-03T00:00:00Z', 'c')]
writeFileSync(hTask, JSON.stringify({ ...envOf('ht'), repo: hRepo }))
const ent = (type, sid, at, content, extra = {}) => JSON.stringify({ type, sessionId: sid, timestamp: at, message: { content }, ...extra })
const usr = (sid, at, c) => ent('user', sid, at, c)
const ast = (sid, at, c) => ent('assistant', sid, at, c)
const REJ = [{ type: 'tool_result', content: [{ type: 'text', text: "The user doesn't want to proceed with this tool use. SENTINEL-REJ" }] }]
const FILLERS = Array.from({ length: 22 }, (_, i) => `f${String(i).padStart(2, '0')}`)
const KEYS = ['p1:sA', 'p1:sB', ...FILLERS.map((f) => `p1:${f}`), 'p2:sA', 'p2:sC']
// a seed whose 20 of 26 segments include the rich sessions, so the page tests have rows to read
const HSEED = Array.from({ length: 200 }, (_, i) => `hseed-${i}`).find((s) => { const p = queuePick(KEYS, 20, s); return ['p1:sA', 'p1:sB', 'p2:sA'].every((k) => p.includes(k)) })
put(tr, {
  'sA.jsonl': [
    usr('sA', '2026-01-01T01:00:00Z', 'SENTINEL-H0 start'), ast('sA', '2026-01-01T01:01:00Z', [{ type: 'text', text: 'SENTINEL-A1 plan' }]),
    usr('sA', '2026-01-01T02:00:00Z', [{ type: 'text', text: '<bash-input>SENTINEL-BASH ls</bash-input>' }]),
    ast('sA', '2026-01-01T02:30:00Z', [{ type: 'text', text: 'SENTINEL-A3 ok' }]), ast('sA', '2026-01-01T02:31:00Z', [{ type: 'tool_use', name: 'x', input: {} }]),
    usr('sA', '2026-01-01T03:00:00Z', REJ), usr('sA', '2026-01-01T03:00:01Z', [{ type: 'text', text: '[Request interrupted by user for tool use]' }]),
    usr('sA', '2026-01-01T03:00:05Z', 'SENTINEL-H7 do it differently'), 'not json', ast('sA', '2026-01-01T04:00:00Z', [{ type: 'text', text: 'SENTINEL-A9' }]),
    usr('sA', '2025-12-31T05:00:00Z', 'SENTINEL-OUT'), usr('sA', '2026-01-02T05:00:00Z', 'SENTINEL-P2'),
  ].join('\n') + '\n',
  'sB.jsonl': [usr('sB', '2026-01-01T10:00:00Z', 'SENTINEL-B0'), ast('sB', '2026-01-01T10:01:00Z', [{ type: 'text', text: 'SENTINEL-B1' }]), usr('sB', '2026-01-01T11:00:00Z', 'SENTINEL-B2')].join('\n') + '\n',
  'sC.jsonl': usr('sC', '2026-01-02T06:00:00Z', 'SENTINEL-C0') + '\n',
  'notes.txt': 'not a session',
  'sub/deep.jsonl': usr('deep', '2026-01-01T05:00:00Z', 'SENTINEL-DEEP') + '\n', // a subfolder is not read
  ...Object.fromEntries(FILLERS.map((f, i) => [`${f}.jsonl`, usr(f, `2026-01-01T12:${String(i).padStart(2, '0')}:00Z`, `SENTINEL-${f}`) + '\n'])),
})
put(hd, {
  'machine.json': { forbid: { paths: [] } },
  'tasks.json': { p1: { base: h0, end: h1 }, p2: { base: h1, end: h2 } },
  'ext/groups.json': { seed: HSEED, groups: [] },
})
const runH = (args) => withData(hd, () => quiet(() => human(args)))
let histRun // lazy, once: the console spy is shared, so it must not overlap another test's run
const hist = () => (histRun ??= runH(['history', tr, hTask]))
const segsOf = () => jsonAt(join(hd, 'history/segments.json'))
const hpage = () => jsonAt(join(hd, 'step9/pages/history.json'))

test('history reads a fixture folder and writes no text into segments.json', async () => {
  const r = await hist(), segs = segsOf(), inSample = segs.filter((s) => queuePick(KEYS, 20, HSEED).includes(s.key)).reduce((n, s) => n + s.events.length, 0)
  expect(r.code).toBe(0)
  expect(r.out.split('\n')).toEqual([
    `history: sessions 25, unparsable lines 1, segments 26, events 29, outside 1, sample 20, events in sample ${inSample}`,
    'history p1 segments=24 rule1=2 rule2=24 rule3=0 notcounted=1',
    'history p2 segments=2 rule1=0 rule2=1 rule3=0 notcounted=1',
  ])
  expect(r.out).not.toContain('SENTINEL')
  expect(segs.map((s) => s.key).sort()).toEqual([...KEYS].sort())
  const a = segs.find((s) => s.key === 'p1:sA')
  expect(a.events.map((e) => [e.kind, e.line, e.tool])).toEqual([['message', 0, 'not counted'], ['bash', 2, 'rule 2'], ['reject', 5, 'rule 1']])
  expect(segs.find((s) => s.key === 'p2:sC').events[0].tool).toBe('rule 2')
  expect(segs.flatMap((s) => s.events).every((e) => Object.keys(e).sort().join() === 'at,kind,line,tool,turn')).toBe(true)
  expect(JSON.stringify(segs)).not.toContain('SENTINEL')
})

test('the sample is queuePick of segment keys', async () => {
  await hist()
  const want = queuePick(segsOf().map((s) => s.key), 20, HSEED)
  expect(want).toHaveLength(20)
  expect([...new Set(hpage().map((r) => r.key.split(':').slice(0, 2).join(':')))].sort()).toEqual([...want].sort())
})

test('the history page holds the human text and the agent text before it, and no tool label', async () => {
  await hist()
  const rows = new Map(hpage().map((r) => [r.key, r.parts])), text = (k, i) => rows.get(k)[i].text
  expect(rows.get('p1:sA:5').map((p) => p.title)).toEqual(['Agent, before', 'Human', 'Where'])
  expect(text('p1:sA:0', 0)).toBe('')
  expect(text('p1:sA:0', 1)).toBe('SENTINEL-H0 start')
  expect(text('p1:sA:2', 0)).toBe('SENTINEL-A1 plan')
  expect(text('p1:sA:2', 1)).toBe('SENTINEL-BASH ls')
  expect(text('p1:sA:5', 0)).toBe('SENTINEL-A3 ok') // the last assistant entry with text; the tool use after it has none
  for (const s of ['SENTINEL-REJ', 'Request interrupted', 'SENTINEL-H7']) expect(text('p1:sA:5', 1)).toContain(s)
  expect(text('p1:sA:5', 2)).toBe('task p1, session 1 of 24, event 3 of 3')
  expect(text('p2:sA:11', 2)).toBe('task p2, session 1 of 2, event 1 of 1')
  expect(rows.has('p1:sA:10')).toBe(false) // the outside event
  const all = JSON.stringify(hpage())
  expect(all).not.toMatch(/rule [123]|not counted|SENTINEL-DEEP|SENTINEL-OUT/)
  expect(all).not.toContain(tmp)
  const seen = readFileSync(join(hd, 'step9/seen.tsv'), 'utf8').split('\n')
  expect(seen).toContain('history\tp1\tp1:sA:5')
  expect(seen.filter((l) => l.startsWith('history\t'))).toHaveLength(hpage().length)
  // serve works unchanged on it: the history answer set per row
  const sv = await runH(['serve', 'history']), s = { server: sv.code, token: readFileSync(join(hd, 'step9/pages/history.token'), 'utf8').trim() }
  started.push(sv.code)
  const data = await (await fetch(url(s, `/${s.token}/data`))).json()
  expect(data.rows[0].answers).toEqual(['rule 1', 'rule 2', 'rule 3', 'not counted'])
  expect((await post(s, { key: 'p1:sA:5', answer: 'rule 1' })).status).toBe(200)
  expect((await post(s, { key: 'p1:sA:5', answer: 'same' })).status).toBe(400)
})

const answerFile = join(hd, 'step9/answers/history.tsv')
const answers = (pairs) => { mkdirSync(join(hd, 'step9/answers'), { recursive: true }); writeFileSync(answerFile, pairs.map(([k, a]) => `${k}\t${a}\t\t2026-11-08T00:00:00Z\n`).join('')) }
const sampled = () => { const pick = queuePick(segsOf().map((s) => s.key), 20, HSEED); return segsOf().filter((s) => pick.includes(s.key)).flatMap((s) => s.events.map((e, i) => [eventKey(s, i), e.tool])) }

test('kappa history stops below 0.7', async () => {
  await hist()
  answers(sampled().map(([k]) => [k, 'rule 1']))
  const r = await runH(['kappa', 'history'])
  expect(r.code).toBe(3)
  expect(r.out).toMatch(/^history kappa=-?\d\.\d\d raw=0\.\d\d ac1=-?\d\.\d\d n=\d+ answered=\d+\/\d+ gate stop$/)
  expect(Number(r.out.match(/kappa=(\S+)/)[1])).toBeLessThan(0.7)
})

test('kappa history counts only answered sample events', async () => {
  await hist()
  const all = sampled(), total = all.length, half = all.slice(0, total - 1)
  answers([...half, ['p1:nosuch:0', 'rule 1']]) // an answer outside the sample counts for nothing
  const part = await runH(['kappa', 'history'])
  expect(part.out).toMatch(new RegExp(`^history kappa=1\\.00 raw=1\\.00 ac1=1\\.00 n=${total - 1} answered=${total - 1}/${total} gate stop$`))
  expect(part.code).toBe(3)
  answers(all)
  const full = await runH(['kappa', 'history'])
  expect(full.out).toBe(`history kappa=1.00 raw=1.00 ac1=1.00 n=${total} answered=${total}/${total} gate pass`)
  expect(full.code).toBe(0)
  rmSync(answerFile)
  expect((await runH(['kappa', 'history'])).out).toBe(`history kappa=none raw=none ac1=none n=0 answered=0/${total} gate stop`)
})

// --- apply (rulings 2, 4-6), the cold rule of the classification batches, classify-2 and recount (ruling 9) ---
// a copy of the built fixture with no answers yet
const copyOf = async (name) => {
  await built
  const c = join(tmp, name)
  cpSync(d, c, { recursive: true })
  rmSync(join(c, 'step9/answers'), { recursive: true, force: true })
  return c
}
const answer = (c, batch, rows) => { mkdirSync(join(c, 'step9/answers'), { recursive: true }); writeFileSync(join(c, 'step9/answers', `${batch}.tsv`), rows.map(([k, a]) => `${k}\t${a}\tSENTINEL-NOTE\t2026-11-08T00:00:00Z\n`).join('')) }
const runIn = (c, args) => withData(c, () => quiet(() => human(args)))
const sha = (f) => new Bun.CryptoHasher('sha256').update(readFileSync(f)).digest('hex')

test('apply refuses a batch with an unanswered row', async () => {
  const c = await copyOf('ap1'), m = readFileSync(join(c, 'r1/oracle/manifest.json'), 'utf8')
  answer(c, 'oracle-7.1', [[id, 'different'], [xid, 'same']])
  expect(await runIn(c, ['apply', 'oracle-7.1'])).toEqual({ code: 1, out: 'apply oracle-7.1: refused, unanswered 1 of 3' })
  expect(readFileSync(join(c, 'r1/oracle/manifest.json'), 'utf8')).toBe(m)
  expect(existsSync(join(c, 'step9/answers/oracle-7.1.applied'))).toBe(false)
  answer(c, 'classify', [[id, 'same']]) // an answer the batch does not take is no answer
  expect(await runIn(c, ['apply', 'classify'])).toEqual({ code: 1, out: 'apply classify: refused, unanswered 1 of 1' })
  expect(jsonAt(join(c, 'r1/labels.json'))).toEqual({ other: 'build' })
})

test('partly applies as requirement', async () => {
  const c = await copyOf('ap2'), agr = readFileSync(join(c, 'r1/agreement.json'), 'utf8'), file = join(c, 'step9/answers/classify.tsv')
  answer(c, 'classify', [[id, 'traceable'], [id, 'partly']]) // the last row of a key wins
  const r = await runIn(c, ['apply', 'classify'])
  expect(r).toEqual({ code: 0, out: 'apply classify: rows 1, build 0, requirement 1' })
  expect(jsonAt(join(c, 'r1/labels.json'))).toEqual({ other: 'build', [id]: 'requirement' })
  expect(readFileSync(join(c, 'r1/agreement.json'), 'utf8')).toBe(agr)
  expect(readFileSync(join(c, 'step9/answers/classify.applied'), 'utf8')).toBe(`${sha(file)}\n`)
  expect(await runIn(c, ['apply', 'classify'])).toEqual(r) // the same answers apply again the same way
  writeFileSync(file, readFileSync(file, 'utf8') + `${id}\ttraceable\t\t2026-11-09T00:00:00Z\n`)
  expect(await runIn(c, ['apply', 'classify'])).toEqual({ code: 1, out: 'apply classify: refused, the answers changed after apply' })
  expect(jsonAt(join(c, 'r1/labels.json'))[id]).toBe('requirement')
})

test('a 7.1 different drops the check and is counted against the gate', async () => {
  const c = await copyOf('ap3'), xm = readFileSync(join(c, 'x1-01/oracle/manifest.json'), 'utf8'), sm = readFileSync(join(c, 'r1/step/oracle/manifest.json'), 'utf8')
  answer(c, 'oracle-7.1', [[id, 'different'], [xid, 'unclear'], [sid, 'same']])
  const r = await runIn(c, ['apply', 'oracle-7.1'])
  expect(r.code).toBe(3)
  expect(r.out.split('\n')).toEqual(['apply oracle-7.1: rows 3, same 1, different 1, unclear 1', 'gate oracle-7.1 task-repo 0/1 stop', 'gate oracle-7.1 x1 0/1 stop', 'gate oracle-7.1 task-repo-step 1/1 pass'])
  expect(jsonAt(join(c, 'r1/oracle/manifest.json'))).toEqual([{ ...entry(id), dropped: true, drop_reason: 'human 7.1' }])
  expect(readFileSync(join(c, 'x1-01/oracle/manifest.json'), 'utf8')).toBe(xm) // unclear drops nothing
  expect(readFileSync(join(c, 'r1/step/oracle/manifest.json'), 'utf8')).toBe(sm)
  expect(existsSync(join(c, 'step9/answers/oracle-7.1.applied'))).toBe(true) // written, then the stop
})

test('a 7.1 drop of a step check leaves step.json ids and score still reads the task', async () => {
  const c = await copyOf('ap4'), sid2 = `${e7}-T3`, step = (x) => entry(x, { fix_commit: end, origin: 'tests/s.test.ts::SENTINEL-STEP-TITLE', step: '1' })
  const g = (ids) => ({ checks: ids.map((x) => ({ id: x, bucket: 'build', severity: 'high', result: 'pass' })), excluded: [] })
  // a step grade made after the drop holds no dropped check
  put(c, { 'r1/step/oracle/manifest.json': [step(sid), step(sid2)], 'r1/step.json': { oracle: 'step/oracle', ids: [sid, sid2], candidates: 2, seed: SEED },
    [`r1/grades/${e7}.json`]: g([id]), [`r1/step/grades/${e7}.json`]: g([sid2]) })
  const score = () => withData(c, () => quiet(() => oracle(['score', 'r1', end])))
  expect(await score()).toEqual({ code: 1, out: `r1 score ${e7}: 1 step ids not in the grade` })
  answer(c, 'oracle-7.1', [[id, 'same'], [xid, 'same'], [sid, 'different']])
  const r = await runIn(c, ['apply', 'oracle-7.1'])
  expect(r.out.split('\n').slice(1)).toEqual(['gate oracle-7.1 task-repo 1/1 pass', 'gate oracle-7.1 x1 1/1 pass', 'gate oracle-7.1 task-repo-step 0/1 stop'])
  expect(jsonAt(join(c, 'r1/step.json'))).toEqual({ oracle: 'step/oracle', ids: [sid2], candidates: 2, seed: SEED })
  expect(jsonAt(join(c, 'r1/step/oracle/manifest.json')).map((m) => [m.id, m.dropped, m.drop_reason])).toEqual([[sid, true, 'human 7.1'], [sid2, undefined, undefined]])
  expect(jsonAt(join(c, 'r1/oracle/manifest.json'))).toEqual([entry(id)])
  expect(await score()).toEqual({ code: 0, out: `r1 ${e7} build=1.00 requirement=1.00 passed=yes` })
})

test('apply prints the 7.2 and input gates, writes batch2.tsv and counts the pairs', async () => {
  const c = await copyOf('ap5')
  put(c, { 'r1/labels.json': { [id]: 'requirement' } })
  answer(c, 'rerate-7.2', [[id, 'not traceable']])
  answer(c, 'inputs', [['r1', 'leak']])
  answer(c, 'labels', [[`r1:${fix}`, 'fix']])
  answer(c, 'pairs', [['x1-01', 'same']])
  expect(await runIn(c, ['apply', 'rerate-7.2'])).toEqual({ code: 0, out: 'gate rerate-7.2 task-repo 1/1 pass' })
  expect(await runIn(c, ['apply', 'inputs'])).toEqual({ code: 3, out: 'gate inputs 0/1 stop' })
  expect(await runIn(c, ['apply', 'labels'])).toEqual({ code: 0, out: 'apply labels: rows 1, fix 1, not fix 0' })
  expect(readFileSync(join(c, 'step9/batch2.tsv'), 'utf8')).toBe(`commit\ttask\tkind\n${fix}\tr1\tin-task\n`)
  expect(await runIn(c, ['apply', 'pairs'])).toEqual({ code: 0, out: 'apply pairs: rows 1, B- worse 0, same 1, B- better 0' })
  expect(jsonAt(join(c, 'r1/labels.json'))).toEqual({ [id]: 'requirement' }) // a re-rating changes no label
  put(c, { 'r1/labels.json': { [id]: 'build' } })
  answer(c, 'rerate-7.2', [[id, 'partly']]) // partly agrees with nothing
  rmSync(join(c, 'step9/answers/rerate-7.2.applied'))
  expect(await runIn(c, ['apply', 'rerate-7.2'])).toEqual({ code: 3, out: 'gate rerate-7.2 task-repo 0/1 stop' })
  for (const b of ['rerate-7.2', 'inputs', 'labels', 'pairs']) expect(existsSync(join(c, 'step9/answers', `${b}.applied`))).toBe(true)
  await expect(runIn(c, ['apply', 'nope'])).rejects.toThrow('usage: ')
})

test('build classify leaves out cold-task rows', async () => {
  const c = await copyOf('cold')
  put(c, {
    'ext/sample.tsv': `${SAMPLE_HEAD}\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\t${c0}\t${end}\tyes\n`,
    'step9/classify.tsv': `task\tid\nr1\t${id}\nx1-01\t${xid}\n`,
    'x1-01/agreement.json': { disputed: [xid], splitRounds: [{ name: 'classify-b2', ids: [xid], disputed: [xid] }] },
    'x1-01/work/classify/input.md': 'SENTINEL-COLD\n', 'x1-01/work/classify/interface.md': 'SENTINEL-COLD\n',
    'x1-01/work/classify/manifest.json': [{ id: xid, behaviour: 'SENTINEL-COLD', interface: 'browser', severity: 'high' }], [`x1-01/work/classify/${xid}.spec.ts`]: 'SENTINEL-COLD\n',
  })
  expect(await runIn(c, ['build', 'classify'])).toEqual({ code: 0, out: 'build classify: rows 1, parts 4, cold left out 1' })
  expect(await runIn(c, ['build', 'classify-2'])).toEqual({ code: 0, out: 'build classify-2: rows 0, parts 0, cold left out 1' })
  expect(JSON.stringify(jsonAt(join(c, 'step9/pages/classify.json')))).not.toContain('SENTINEL-COLD')
  expect(readFileSync(join(c, 'step9/seen.tsv'), 'utf8')).not.toMatch(/^classify(-2)?\tx1-01\t/m)
})

test('build classify-2 takes the b2 rounds\' disputes', async () => {
  const c = await copyOf('c2'), [b1, b2, b3] = [5, 7, 9].map((n) => `${f7}-T${n}`)
  const folder = (n, x) => ({ [`r1/work/${n}/input.md`]: 'SENTINEL-INPUT\n', [`r1/work/${n}/interface.md`]: 'SENTINEL-SHEET\n',
    [`r1/work/${n}/manifest.json`]: [{ id: x, behaviour: 'SENTINEL-B', interface: 'browser', severity: 'high' }], [`r1/work/${n}/${x}.spec.ts`]: `SENTINEL-CHECK ${x}\n` })
  const agr = { disputed: [id], splitRounds: [{ name: 'classify-split', ids: [b3], disputed: [b3] }, { name: 'classify-b2', ids: [b1], disputed: [b1] }, { name: 'classify-split-b2', ids: [b2], disputed: [b2] }] }
  put(c, { 'r1/agreement.json': agr, ...folder('classify-b2', b1), ...folder('classify-split-b2', b2), ...folder('classify-split', b3) })
  expect(await runIn(c, ['build', 'classify-2'])).toEqual({ code: 0, out: 'build classify-2: rows 2, parts 8, cold left out 0' })
  const rows = jsonAt(join(c, 'step9/pages/classify-2.json'))
  expect(rows.map((r) => r.key)).toEqual([b1, b2])
  expect(rows[1].parts.at(-1).text).toBe(`SENTINEL-CHECK ${b2}\n`)
  answer(c, 'classify-2', [[b1, 'traceable'], [b2, 'not traceable']])
  expect(await runIn(c, ['apply', 'classify-2'])).toEqual({ code: 0, out: 'apply classify-2: rows 2, build 1, requirement 1' })
  expect(jsonAt(join(c, 'r1/labels.json'))).toEqual({ other: 'build', [b1]: 'build', [b2]: 'requirement' })
  expect(jsonAt(join(c, 'r1/agreement.json'))).toEqual(agr)
})

test('recount counts human fix sources and leaves 7.1 drops out', async () => {
  const s = join(tmp, 'rc'), e = (x, o) => ({ id: x, fix_commit: x.slice(0, 7).padEnd(40, '0'), interface: 'browser', severity: 'high', ...o })
  const v = (k, list) => ({ [`validation-${k}.json`]: { checks: list.map(([x, verdict]) => ({ id: `${k}-T${x}`, verdict })) } })
  const at = (t, files) => Object.fromEntries(Object.entries(files).map(([f, x]) => [`${t}/${f}`, x]))
  put(s, {
    'machine.json': { forbid: { paths: [] } },
    'tasks.json': { r1: {}, r2: {}, r3: {}, r4: {} },
    ...at('r1', { 'oracle/manifest.json': [e('aaaaaaa-T1'), e('aaaaaaa-T2', { batch: 2 }), e('aaaaaaa-T3', { batch: 2 }), e('aaaaaaa-T4', { dropped: true, drop_reason: 'human 7.1' }), e('aaaaaaa-T5', { interface: 'none' }), e('aaaaaaa-T6')],
      ...v('aaaaaaa', [[1, 'valid'], [2, 'absent-at-base'], [3, 'valid'], [4, 'valid'], [5, 'valid'], [6, 'weak']]) }),
    ...at('r2', { 'oracle/manifest.json': [e('bbbbbbb-T1'), e('bbbbbbb-T2'), e('bbbbbbb-T3', { dropped: true, drop_reason: 'human 7.1' })], ...v('bbbbbbb', [[1, 'valid'], [2, 'valid'], [3, 'valid']]) }),
    ...at('r4', { 'oracle/manifest.json': [1, 2, 3].map((n) => e(`ccccccc-T${n}`)), ...v('ccccccc', [[1, 'valid'], [2, 'valid'], [3, 'valid']]) }),
  })
  expect(await runIn(s, ['recount', '--drop', 'r4'])).toEqual({ code: 0, out: ['recount r1 scored=3 meets yes', 'recount r2 scored=2 meets no', 'recount r3 scored=0 meets no', 'recount: meets 1 of 3'].join('\n') })
  expect((await runIn(s, ['recount'])).out.split('\n').slice(-2)).toEqual(['recount r4 scored=3 meets yes', 'recount: meets 2 of 4'])
  await expect(runIn(s, ['recount', '--drop', 'r9'])).rejects.toThrow('--drop r9 is not a task of tasks.json')
})
