import { test, expect, afterAll, spyOn } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hunkOwners, agreement, usable, mergeLabels, introducer, oracleSha, queuePick } from '../bench/lib/oracle.mjs'
import { oracle } from '../bench/oracle.mjs'

const order = ['p1', 'p2', 'p3']

test('hunkOwners gives each hunk one owner, ties to the earlier task', () => {
  const rows = [
    { task: 'p3', commit: 'abc1234', file: 'a.py', old: 10, lines: 5 },
    { task: 'p2', commit: 'abc1234', file: 'a.py', old: 10, lines: 3 },
    { task: 'p2', commit: 'abc1234', file: 'a.py', old: 10, lines: 2 }, // p2 sums to 5, ties p3: the earlier task wins
    { task: 'p3', commit: 'abc1234', file: 'b.py', old: 1, lines: 4 },
    { task: 'p1', commit: 'abc1234', file: 'b.py', old: 1, lines: 1 },
    { task: 'p1', commit: 'def5678', file: 'a.py', old: 10, lines: 9 },
  ]
  const m = hunkOwners(rows, order)
  expect(m.size).toBe(3)
  expect(m.get('abc1234\ta.py\t10')).toBe('p2')
  expect(m.get('abc1234\tb.py\t1')).toBe('p3')
  expect(m.get('def5678\ta.py\t10')).toBe('p1')
})

test('agreement reproduces p8b', () => {
  const cats = ['traceable', 'partly', 'not traceable']
  const pairs = [[21, 'not traceable', 'not traceable'], [1, 'partly', 'partly'], [1, 'not traceable', 'partly'], [1, 'partly', 'not traceable'], [1, 'traceable', 'partly']]
  const a = [], b = []
  for (const [k, x, y] of pairs) for (let i = 0; i < k; i++) { a.push(x); b.push(y) }
  const s = agreement(a, b, cats)
  expect(s.n).toBe(25)
  expect(s.agree).toBe(22)
  expect(s.raw).toBeCloseTo(0.88, 2)
  expect(s.kappa).toBeCloseTo(0.44, 2)
  expect(s.ac1).toBeCloseTo(0.87, 2)
  expect(s.top).toBeCloseTo(0.88, 2)
  expect(usable(s)).toBe(true) // top 0.88 > 0.8, raw 0.88, AC1 0.87
})

test('agreement guards a zero chance agreement', () => {
  expect(agreement(['x', 'x'], ['x', 'x'], ['x'])).toMatchObject({ kappa: 1, ac1: 1 })
  expect(agreement(['x', 'x'], ['x', 'x'], ['x', 'y'])).toMatchObject({ kappa: 1 })
})

test('usable takes the AC1 branch when one label covers more than 80%', () => {
  expect(usable({ kappa: 0.6, raw: 0, ac1: 0, top: 0 })).toBe(true)
  expect(usable({ kappa: 0.59, raw: 0.9, ac1: 0.8, top: 0.8 })).toBe(false) // top must exceed 0.8
  expect(usable({ kappa: 0.2, raw: 0.9, ac1: 0.8, top: 0.81 })).toBe(true)
  expect(usable({ kappa: 0.2, raw: 0.84, ac1: 0.8, top: 0.9 })).toBe(false)
  expect(usable({ kappa: 0.2, raw: 0.9, ac1: 0.69, top: 0.9 })).toBe(false)
})

test('mergeLabels keeps agreed labels and lists partly and disputed', () => {
  const c1 = [{ id: 'a', label: 'traceable' }, { id: 'b', label: 'not traceable' }, { id: 'c', label: 'partly' }, { id: 'd', label: 'traceable' }, { id: 'e', label: 'partly' }]
  const c2 = [{ id: 'a', label: 'traceable' }, { id: 'b', label: 'not traceable' }, { id: 'c', label: 'partly' }, { id: 'd', label: 'not traceable' }, { id: 'f', label: 'traceable' }]
  expect(mergeLabels(c1, c2)).toEqual({ labels: { a: 'build', b: 'requirement' }, partly: ['c'], disputed: ['d', 'e', 'f'] })
})

test('introducer skips a task whose base already fails and returns null when none fits', () => {
  const b = (task, base, end) => ({ task, base, end })
  expect(introducer([b('p3', 'pass', 'pass'), b('p2', 'fail', 'fail'), b('p1', 'precondition', 'fail')])).toBe('p1')
  expect(introducer([b('p3', 'pass', 'fail'), b('p2', 'pass', 'fail')])).toBe('p3')
  expect(introducer([b('p3', 'fail', 'fail'), b('p2', 'error', 'fail'), b('p1', 'pass', 'error')])).toBeNull()
  expect(introducer([])).toBeNull()
})

test('oracleSha changes with one byte of one file and not with file order', () => {
  const f = [{ path: 'a.py', text: 'one' }, { path: 'b.py', text: 'two' }]
  const sha = oracleSha(f)
  expect(sha).toMatch(/^[0-9a-f]{64}$/)
  expect(oracleSha([...f].reverse())).toBe(sha)
  expect(oracleSha([f[0], { path: 'b.py', text: 'twp' }])).not.toBe(sha)
  expect(oracleSha([{ path: 'a.py', text: 'onetwo' }, { path: 'b.py', text: '' }])).not.toBe(oracleSha([{ path: 'a.py', text: 'one' }, { path: 'b.py', text: 'two' }]))
  expect(oracleSha([{ path: 'a', text: 'bc' }])).not.toBe(oracleSha([{ path: 'ab', text: 'c' }]))
})

test('queuePick is stable and seed-dependent', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`)
  const pick = queuePick(ids, 5, 's1')
  expect(pick).toHaveLength(5)
  expect(queuePick([...ids].reverse(), 5, 's1')).toEqual(pick)
  expect(queuePick(ids, 5, 's2')).not.toEqual(pick)
  expect(queuePick(ids, 50, 's1')).toHaveLength(20)
})

// --- bench/oracle.mjs: pairs, label, labels (ruling 7) ---
// t1 = c0..k3, t2 = k3..m1, t3 = m1..n1 (dropped); later commits come only from the tsv files, so they need no git object
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-oracle-')))
const repo = join(tmp, 'repo'), data = join(tmp, 'data'), src = join(data, 'sources')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const put = (files, msg) => {
  for (const [f, text] of Object.entries(files)) { mkdirSync(join(repo, f, '..'), { recursive: true }); writeFileSync(join(repo, f), text) }
  git('add', '-A'); git('commit', '-qm', msg)
  return git('rev-parse', '--short=7', 'HEAD')
}
const ten = (x) => Array.from({ length: 10 }, (_, i) => `${x}${i}`).join('\n') + '\n'
mkdirSync(repo, { recursive: true }); git('init', '-q')
const c0 = put({ 'src/a.txt': ten('a'), 'src/b.txt': ten('b') }, 'zero')
const k1 = put({ 'src/a.txt': ten('a').replace('a3', 'A3'), 'tests/a.test.txt': 'one\n' }, 'add a with its test')
put({ 'src/b.txt': ten('b').replace('b1', 'B1') }, 'change b without a test')
const k3 = put({ 'src/a.txt': ten('a').replace('a3', 'A3').replace('a7', 'A7'), 'src/x.spec.ts': 'spec\n' }, 'fix a seven found later')
const m1 = put({ 'tests/b.test.txt': 'two\n' }, 'test b only')
const n1 = put({ 'tests/c.test.txt': 'three\n', 'src/b.txt': 'gone\n' }, 'dropped task commit')
mkdirSync(join(data, 'tasks'), { recursive: true })
writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
writeFileSync(join(data, 'tasks.json'), JSON.stringify({ t1: { no: 'T1', plan: 'one.md', base: c0, end: k3 }, t2: { no: 'T2', plan: 'two.md', base: k3, end: m1 }, t3: { no: 'T3', plan: 'three.md', base: m1, end: n1 } }))
const tsv = (rows) => ['commit\tfile\told_lines\ttask_lines\ttests_changed\tsubject', ...rows.map((r) => r.join('\t'))].join('\n') + '\n'
writeFileSync(join(data, 'tasks/t1.tsv'), tsv([
  ['aaaaaaa', 'src/a.txt', '4,1', '5', 'yes', 'later fix of a'], // t1 5 > t2 3
  ['aaaaaaa', 'src/c.txt', '1,2', '1', 'yes', 'later fix of a'], // t3 owns it (dropped)
  ['bbbbbbb', 'src/a.txt', '2,1', '4', 'no', 'later change, no test'],
  ['ccccccc', 'src/a.txt', '9,1', '2', 'yes', 'a tie'], // tie with t2: the earlier task
]))
writeFileSync(join(data, 'tasks/t2.tsv'), tsv([
  ['aaaaaaa', 'src/a.txt', '4,1', '3', 'yes', 'later fix of a'],
  ['ccccccc', 'src/a.txt', '9,1', '2', 'yes', 'a tie'],
  ['ddddddd', 'src/b.txt', '5,1', '1', 'yes', 'later fix of b'],
]))
writeFileSync(join(data, 'tasks/t3.tsv'), tsv([['aaaaaaa', 'src/c.txt', '1,2', '2', 'yes', 'later fix of a']]))
const task = join(tmp, 'task.json')
writeFileSync(task, JSON.stringify({ name: 'tt', repo, db: null, port: 3999, start: 'true', ready: 'http://127.0.0.1:3999/', oracle: 'true', junit: 'r.xml' }))
mkdirSync(join(data, 'briefs'))
writeFileSync(join(data, 'briefs/label.md'), 'BRIEF-TEXT\n')
writeFileSync(join(data, 'briefs/label-settings.json'), '{}')
const prevMachine = process.env.HSTACK_BENCH_MACHINE
process.env.HSTACK_BENCH_MACHINE = join(data, 'machine.json')
afterAll(() => {
  if (prevMachine === undefined) delete process.env.HSTACK_BENCH_MACHINE
  else process.env.HSTACK_BENCH_MACHINE = prevMachine
  rmSync(tmp, { recursive: true, force: true })
})

const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  const c = spyOn(process.stdout, 'write').mockImplementation((x) => { out.push(String(x)); return true })
  try { return { code: await fn(), out: out.join('\n') } } finally { a.mockRestore(); b.mockRestore(); c.mockRestore() }
}
const pairRows = () => readFileSync(join(src, 'pairs.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'))

test('pairs lists a later commit only with tests changed and a hunk a step 5 task owns', async () => {
  const r = await quiet(() => oracle(['pairs', task, '--drop', 't3']))
  expect(r.code).toBe(0)
  expect(readFileSync(join(src, 'pairs.tsv'), 'utf8').split('\n')[0]).toBe('commit\ttask\tkind\thunks')
  const later = pairRows().filter((p) => p[2] === 'later')
  expect(later).toEqual([['aaaaaaa', 't1', 'later', 'src/a.txt:4'], ['ccccccc', 't1', 'later', 'src/a.txt:9'], ['ddddddd', 't2', 'later', 'src/b.txt:5']])
  expect(r.out).toContain('t1: in-task 2, later 2')
  expect(r.out).toContain('t2: in-task 1, later 1')
  expect(r.out).not.toContain('t3')
})

test('pairs lists in-task commits that change a test file', async () => {
  await quiet(() => oracle(['pairs', task, '--drop', 't3']))
  const inTask = pairRows().filter((p) => p[2] === 'in-task')
  // the commit between k1 and k3 changes no test; k3's spec file is not a source hunk; m1 changes only a test; t3 is dropped
  expect(inTask).toEqual([[k1, 't1', 'in-task', 'src/a.txt:4'], [k3, 't1', 'in-task', 'src/a.txt:8'], [m1, 't2', 'in-task', '']])
})

const reply = (r, t, text, n = '') => writeFileSync(join(src, `label-${r}-${t}${n}.reply.md`), text)
const ran = (r, t, n = '') => writeFileSync(join(src, `label-${r}-${t}${n}.reply.md.run.json`), '{}')

test('labels marks agreed fix as a source and a disagreement as step9, and a pair with no valid label as unlabelled', async () => {
  await quiet(() => oracle(['pairs', task, '--drop', 't3']))
  const j = (o) => JSON.stringify(Object.entries(o).map(([commit, label]) => ({ commit, label })))
  reply(1, 't1', '```json\n' + j({ aaaaaaa: 'fix', ccccccc: 'fix', [k1]: 'build', [k3]: 'fix' }) + '\n```'); ran(1, 't1')
  reply(2, 't1', j({ aaaaaaa: 'fix', ccccccc: 'requirement change', [k1]: 'build', [k3]: 'fixed' })); ran(2, 't1') // k3: not a label
  reply(1, 't2', 'not json'); ran(1, 't2')
  reply(1, 't2', j({ ddddddd: 'fix', [m1]: 'build' }), '-2'); ran(1, 't2', '-2') // the rerun counts
  reply(2, 't2', j({ ddddddd: 'fix', [m1]: 'build' })); ran(2, 't2')
  const r = await quiet(() => oracle(['labels']))
  expect(r.code).toBe(1) // a pair is unlabelled
  const rows = readFileSync(join(src, 'labels.tsv'), 'utf8').trim().split('\n')
  expect(rows[0]).toBe('commit\ttask\tkind\tl1\tl2\tsource')
  expect(rows.slice(1).map((l) => l.split('\t'))).toEqual([
    [k1, 't1', 'in-task', 'build', 'build', 'no'],
    [k3, 't1', 'in-task', 'fix', 'none', 'none'],
    ['aaaaaaa', 't1', 'later', 'fix', 'fix', 'yes'],
    ['ccccccc', 't1', 'later', 'fix', 'requirement change', 'step9'],
    [m1, 't2', 'in-task', 'build', 'build', 'no'],
    ['ddddddd', 't2', 'later', 'fix', 'fix', 'yes'],
  ])
  expect(r.out).toContain('t1: pairs 4, agreed fix 1, agreed not fix 1, disputed 1, unlabelled 1')
  expect(r.out).toContain('t2: pairs 2, agreed fix 1, agreed not fix 1, disputed 0, unlabelled 0')
  expect(r.out).toContain('later: pairs 3, agreed fix 2, agreed not fix 0, disputed 1, unlabelled 0')
  expect(r.out).toContain('in-task: pairs 3, agreed fix 0, agreed not fix 2, disputed 0, unlabelled 1')
  expect(r.out).toContain('total: pairs 6, agreed fix 2, agreed not fix 2, disputed 1, unlabelled 1')
  expect(r.out).toContain('source commits: 2')
  reply(2, 't1', j({ aaaaaaa: 'fix', ccccccc: 'requirement change', [k1]: 'build', [k3]: 'build' }))
  expect((await quiet(() => oracle(['labels']))).code).toBe(0)
  for (const f of ['label-1-t1', 'label-2-t1', 'label-1-t2', 'label-1-t2-2', 'label-2-t2']) for (const x of ['.reply.md', '.reply.md.run.json']) rmSync(join(src, f + x))
})

test('label prints no reply text', async () => {
  await quiet(() => oracle(['pairs', task, '--drop', 't3']))
  const calls = []
  const agent = async (args) => { // the first run replies with prose only, the rerun with every pair
    const out = args[args.indexOf('--out') + 1]
    calls.push(args)
    writeFileSync(`${out}.run.json`, '{}') // no reading count: read as none
    writeFileSync(out, calls.length === 1 ? 'SENTINEL-REPLY no json here'
      : `SENTINEL-REPLY [{"commit":"${k1}","label":"build"},{"commit":"${k3}","label":"fix"},{"commit":"aaaaaaa","label":"fix"},{"commit":"ccccccc","label":"requirement change"}] SENTINEL-REPLY`)
    return 0
  }
  const r = await quiet(() => oracle(['label', task, '1', 't1'], { agent }))
  expect(r.code).toBe(0)
  expect(r.out).not.toContain('SENTINEL')
  expect(r.out).toContain('label 1 t1: pairs 4, labelled 4, runs 2, read unknown/4')
  expect(calls.map((a) => a[1])).toEqual(['label-1-t1', 'label-1-t1-2'])
  const a = calls[0], arg = (k) => a[a.indexOf(k) + 1]
  expect(arg('--tools')).toBe('Read,Grep,Glob,Bash')
  expect(arg('--settings')).toBe(join(data, 'briefs/label-settings.json'))
  expect(arg('--prompt')).toBe(join(src, 'prompts/label-t1.md'))
  const prompt = readFileSync(arg('--prompt'), 'utf8')
  expect(prompt).toStartWith('BRIEF-TEXT\n')
  for (const s of [k1, 'add a with its test', 'in-task', 'aaaaaaa', 'later fix of a', 'src/a.txt line 4', 'T1', 'one.md']) expect(prompt).toContain(s)
  expect(prompt).not.toContain('ddddddd')
  const again = await quiet(() => oracle(['label', task, '1', 't1'], { agent })) // done: no third run
  expect(calls).toHaveLength(2)
  expect(again.out).toContain('labelled 4, runs 2, read unknown/4')
})

// a stream of Bash calls: [command, is_error]
const stream = (calls) => calls.flatMap(([command, err], i) => [
  { type: 'assistant', message: { id: `m${i}`, content: [{ type: 'tool_use', id: `u${i}`, name: 'Bash', input: { command } }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `u${i}`, is_error: err, content: 'x' }] } },
]).map((e) => JSON.stringify(e)).join('\n')

test('label reruns a run that did not show every listed commit, whatever its labels, and keeps a rerun that still under-reads', async () => {
  await quiet(() => oracle(['pairs', task, '--drop', 't3']))
  const full = git("rev-parse", k3)
  const runs = [
    stream([[`git -C ${repo} show ${k1} ${full}`, false], [`git -C ${repo} show aaaaaaa`, true], [`git -C /elsewhere show ccccccc`, false], [`git -C ${repo} log -1 ccccccc`, false]]),
    stream([[`git -C ${repo} show --stat ${k1}`, false], [`git -C ${repo} show ${k3} aaaaaaa`, false], [`git -C ${repo} show ${k3}:src/a.txt`, false]]),
  ]
  const calls = []
  const agent = async (args, { record }) => { // both runs label every pair; neither shows ccccccc
    const out = args[args.indexOf('--out') + 1]
    writeFileSync(`${out}.run.json`, JSON.stringify(record(runs[calls.length])))
    calls.push(args)
    writeFileSync(out, `[{"commit":"${k1}","label":"build"},{"commit":"${k3}","label":"fix"},{"commit":"aaaaaaa","label":"fix"},{"commit":"ccccccc","label":"fix"}]`)
    return 0
  }
  const r = await quiet(() => oracle(['label', task, '2', 't1'], { agent }))
  expect(r.code).toBe(0)
  expect(calls.map((a) => a[1])).toEqual(['label-2-t1', 'label-2-t1-2'])
  expect(JSON.parse(readFileSync(join(src, 'label-2-t1.reply.md.run.json'), 'utf8'))).toEqual({ shown: 2 }) // k1, k3; aaaaaaa's show failed
  expect(r.out).toContain('label 2 t1: pairs 4, labelled 4, runs 2, read 3/4')
  for (const f of ['label-2-t1', 'label-2-t1-2']) for (const x of ['.reply.md', '.reply.md.run.json']) rmSync(join(src, f + x))
})

// --- bench/oracle.mjs write (ruling 9): fake writers write fake files into the folder their settings grant ---
const k1Full = git('rev-parse', k1), k3Full = git('rev-parse', k3)
const scaffold = join(data, 'oracle-scaffold')
mkdirSync(join(scaffold, 'node_modules'), { recursive: true })
writeFileSync(join(scaffold, 'run.config.ts'), 'SCAFFOLD-CONFIG\n')
writeFileSync(join(scaffold, 'package.json'), '{}\n')
writeFileSync(join(data, 'briefs/oracle-re.md'), 'RE-BRIEF\n')
const useSources = () => {
  writeFileSync(join(src, 'pairs.tsv'), ['commit\ttask\tkind\thunks', `${k1}\tt1\tin-task\tsrc/a.txt:4`, `${k3}\tt1\tin-task\tsrc/a.txt:8`, `${k3}\tt2\tlater\tsrc/b.txt:5`, `${k3}\tt3\tlater\tsrc/c.txt:1`].join('\n') + '\n')
  writeFileSync(join(src, 'labels.tsv'), ['commit\ttask\tkind\tl1\tl2\tsource', `${k1}\tt1\tin-task\tfix\tfix\tyes`, `${k3}\tt1\tin-task\tfix\tfix\tyes`, `${k3}\tt2\tlater\tfix\tfix\tyes`, `${k3}\tt3\tlater\tfix\trequirement change\tstep9`].join('\n') + '\n')
}
// a fake writer: the files `files()` returns land in the folder its settings grant
const writer = (files, calls) => async (args) => {
  calls.push(args)
  const dir = JSON.parse(readFileSync(args[args.indexOf('--settings') + 1], 'utf8')).permissions.additionalDirectories[0], out = args[args.indexOf('--out') + 1]
  for (const [f, text] of Object.entries(files())) { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), text) }
  writeFileSync(`${out}.run.json`, '{"code":0}')
  writeFileSync(out, 'SENTINEL-REPLY 3')
  return 0
}
const entry = (id, hunk, o = {}) => ({ id, hunk, origin: 'src/x.spec.ts::adds seven', behaviour: `SENTINEL-BEHAVIOUR ${id}`, interface: 'browser', severity: 'high', ...o })
const manifestOf = (t) => JSON.parse(readFileSync(join(data, t, 'oracle/manifest.json'), 'utf8'))
const ls = (d) => readdirSync(d).sort()

test('write moves each check into the oracle of its hunk\'s owner', async () => {
  useSources()
  const s = k3.slice(0, 7), t1 = join(data, 't1/oracle')
  mkdirSync(t1, { recursive: true }) // an earlier write of this commit and one of another commit
  writeFileSync(join(t1, 'manifest.json'), JSON.stringify([entry(`${s}-T9`, 'src/a.txt:8'), entry('bbbbbbb-T1', 'src/a.txt:2')]))
  for (const id of [`${s}-T9`, 'bbbbbbb-T1']) writeFileSync(join(t1, `${id}.spec.ts`), 'old\n')
  const calls = []
  const agent = writer(() => ({
    'manifest.json': JSON.stringify([
      entry(`${s}-T1`, 'src/a.txt:8'),
      entry(`${s}-T2`, 'src/b.txt:5', { interface: 'api', severity: 'medium' }),
      entry(`${s}-T3`, 'src/c.txt:1'), // its pair is disputed: no agreed pair owns the hunk
      entry(`${s}-T4`, 'src/a.txt:8', { interface: 'none', severity: 'low' }),
      entry(`${s}-T5`, 'src/a.txt:8'),
      entry(`${s}-T6`, 'src/a.txt:8'),
      entry(`${s}-T7`, 'src/a.txt:8', { interface: 'api' }),
    ]),
    [`${s}-T1.spec.ts`]: `test('${s}-T1 seven', () => {})\n`,
    [`${s}-T7.spec.ts`]: `def test_${s}_T7(): pass  # names rewritten from '${s}'\n`, // the id prefix in other forms is no leak
    [`${s}-T2.spec.ts`]: 'api\n',
    [`${s}-T3.spec.ts`]: 'c\n',
    [`${s}-T5.spec.ts`]: '// from src/x.spec.ts\n',
    [`${s}-T6.spec.ts`]: `// fixed in ${k3Full.slice(0, 9)}\n`,
  }), calls)
  const r = await quiet(() => oracle(['write', task, k3], { agent }))
  expect(r.code).toBe(0)
  const a = calls[0], arg = (k) => a[a.indexOf(k) + 1], work = join(data, 're-work', s)
  expect(a[0]).toBe(task)
  expect(arg('--at')).toBe(k3Full)
  expect(arg('--tools')).toBe('Read,Glob,Grep,Write,Edit')
  const settings = JSON.parse(readFileSync(arg('--settings'), 'utf8')).permissions
  expect(settings.additionalDirectories).toEqual([work])
  expect(settings.allow).toEqual([`Read(/${work}/**)`, `Edit(/${work}/**)`])
  expect(arg('--prompt')).toBe(join(data, 're-work/prompts', `${s}.md`))
  const prompt = readFileSync(arg('--prompt'), 'utf8')
  expect(prompt).toStartWith('RE-BRIEF\n')
  for (const x of [`${s}-T`, 'src/a.txt:8', 't1', 'src/b.txt:5', 't2', '+spec', 'SCAFFOLD-CONFIG', work]) expect(prompt).toContain(x)
  expect(prompt).not.toContain('src/c.txt:1')
  expect(manifestOf('t1').map((m) => m.id)).toEqual(['bbbbbbb-T1', `${s}-T1`, `${s}-T4`, `${s}-T7`])
  expect(manifestOf('t1')[1]).toEqual({ ...entry(`${s}-T1`, 'src/a.txt:8'), fix_commit: k3Full, task: 't1' })
  expect(manifestOf('t2')).toEqual([{ ...entry(`${s}-T2`, 'src/b.txt:5', { interface: 'api', severity: 'medium' }), fix_commit: k3Full, task: 't2' }])
  expect(ls(t1)).toEqual([`${s}-T1.spec.ts`, `${s}-T7.spec.ts`, 'bbbbbbb-T1.spec.ts', 'manifest.json', 'node_modules', 'package.json', 'run.config.ts'].sort())
  expect(ls(join(data, 't2/oracle'))).toEqual([`${s}-T2.spec.ts`, 'manifest.json', 'node_modules', 'package.json', 'run.config.ts'])
  expect(readlinkSync(join(t1, 'node_modules'))).toBe(join(scaffold, 'node_modules'))
  expect(existsSync(join(data, 't3/oracle'))).toBe(false)
  expect(r.out).toContain(`write ${s}: writer ran code 0, entries 7, written 4, refused 3`)
  expect(r.out).toContain('refused: hunk 1, leak 2')
  expect(r.out).toContain('per task: t1 3, t2 1')
  expect(r.out).toContain('interface none: 1')
  expect(r.out).toContain('severity: high 2, medium 1, low 1')
  const again = await quiet(() => oracle(['write', task, k3], { agent })) // the writer's record stands: only the move again
  expect(calls).toHaveLength(1)
  expect(again.out).toContain(`write ${s}: writer reused code 0, entries 7, written 4, refused 3`)
  expect(manifestOf('t1').map((m) => m.id)).toEqual(['bbbbbbb-T1', `${s}-T1`, `${s}-T4`, `${s}-T7`])
  expect(manifestOf('t2').map((m) => m.id)).toEqual([`${s}-T2`])
})

test('write refuses a manifest entry with no severity or a duplicate id', async () => {
  useSources()
  const s = k1.slice(0, 7), calls = []
  const agent = writer(() => ({
    'manifest.json': JSON.stringify([entry(`${s}-T1`, 'src/a.txt:4', { severity: undefined }), entry(`${s}-T2`, 'src/a.txt:4'), entry(`${s}-T2`, 'src/a.txt:4', { severity: 'low' }), entry(`${s}-T3`, 'src/a.txt:4', { severity: 'critical' }), entry(`${s}-T4`, 'src/a.txt:4')]),
    [`${s}-T1.spec.ts`]: 'one\n', [`${s}-T2.spec.ts`]: 'two\n', [`${s}-T3.spec.ts`]: 'three\n', [`${s}-T4.spec.ts`]: 'four\n',
  }), calls)
  const r = await quiet(() => oracle(['write', task, k1], { agent }))
  expect(r.code).toBe(0)
  expect(manifestOf('t1').filter((m) => m.id.startsWith(s)).map((m) => m.id)).toEqual([`${s}-T4`])
  expect(existsSync(join(data, 't1/oracle', `${s}-T2.spec.ts`))).toBe(false)
  expect(r.out).toContain('entries 5, written 1, refused 4')
  expect(r.out).toContain('refused: duplicate id 2, severity 2')
})

test('write prints no check name or behaviour', async () => {
  const ext = join(data, 'ext'), base = k1Full, end = k3Full, s = end.slice(0, 7)
  for (const d of ['env', 'briefs', 'sealed/own__rp__7', 'serve/own__rp', 'tasks/own__rp__7', 'step5-logs']) mkdirSync(join(ext, d), { recursive: true })
  const cols = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend'
  writeFileSync(join(ext, 'sample.tsv'), [cols, `s9-01\ts9\t1\t1\town/rp#7\tu\t7\t6\t${base}\t${end}`, `s9-02\ts9\t1\t2\town/rp#8\tu\t8\t5\t${base}\t${end}`].join('\n') + '\n')
  writeFileSync(join(ext, 'env/own__rp.json'), JSON.stringify({ name: 'own__rp', repo, db: null, port: 3998, start: 'true', ready: 'http://127.0.0.1:3998/', oracle: 'true', junit: 'r.xml' }))
  writeFileSync(join(ext, 'groups.json'), JSON.stringify({ groups: [{ id: 's9', testPaths: ['\\.spec\\.ts$'] }] }))
  writeFileSync(join(ext, 'sealed/own__rp__7/pr.json'), JSON.stringify({ pullRequest: { files: { nodes: [{ path: 'src/a.txt' }, { path: 'src/x.spec.ts' }] } } }))
  writeFileSync(join(ext, 'sealed/own__rp__7/f2p.json'), JSON.stringify({ f2p: ['F2P-ID-ONE'], p2p: [] }))
  writeFileSync(join(ext, 'serve/own__rp/serve.json'), JSON.stringify({ layer: [], start: 'START-APP', ready: 'true', notes: 'NOTES-URL', briefSha: 'x' }))
  writeFileSync(join(ext, 'tasks/own__rp__7/task-recipe.json'), JSON.stringify({ dockerfile: 'RECIPE-DOCKERFILE', test: 't', platform: 'p' }))
  // the last row of a task is its verdict
  writeFileSync(join(ext, 'step5-logs/serve.tsv'), ['s9-01\t1\ta\tb\ts9-01 error build', 's9-01\t0\ta\tb\ts9-01 servable rounds=1', 's9-02\t0\ta\tb\ts9-02 dropped not servable'].join('\n') + '\n')
  writeFileSync(join(ext, 'briefs/oracle.md'), 'EXT-BRIEF\n')
  const calls = []
  const agent = writer(() => ({
    'manifest.json': JSON.stringify([
      entry(`${s}-T1`, 'src/a.txt:8', { interface: 'cli', file: 'checks/group.ts' }),
      entry(`${s}-T2`, 'src/a.txt:8', { interface: 'cli', file: 'checks/group.ts', severity: 'low' }),
      entry(`${s}-T3`, 'src/x.spec.ts:0', { interface: 'cli' }), // a test file's hunk is not a source hunk
    ]),
    'runner.json': JSON.stringify({ layer: ['RUN install \\', '  more'], run: 'run-checks > /out/junit.xml' }),
    'checks/group.ts': `SENTINEL-CHECK ${s}-T1 ${s}-T2\n`,
    [`${s}-T3.ts`]: 'SENTINEL-CHECK\n',
  }), calls)
  const r = await quiet(() => oracle(['write', 's9-01'], { agent }))
  expect(r.code).toBe(0)
  expect(r.out).not.toContain('SENTINEL')
  expect(r.out).toContain('write s9-01: writer ran code 0, entries 3, written 2, refused 1')
  const a = calls[0], arg = (k) => a[a.indexOf(k) + 1], work = join(data, 's9-01/work/write')
  expect(a[0]).toBe(join(ext, 'env/own__rp.json'))
  expect(arg('--at')).toBe(end)
  expect(JSON.parse(readFileSync(arg('--settings'), 'utf8')).permissions.additionalDirectories).toEqual([work])
  const prompt = readFileSync(arg('--prompt'), 'utf8')
  expect(prompt).toStartWith('EXT-BRIEF\n')
  for (const x of [`${s}-T`, 'src/a.txt:8', 'src/x.spec.ts', 'F2P-ID-ONE', 'START-APP', 'NOTES-URL', 'RECIPE-DOCKERFILE', '+A7', work]) expect(prompt).toContain(x)
  expect(prompt).not.toContain('briefSha')
  const o = join(data, 's9-01/oracle')
  expect(ls(o)).toEqual(['checks', 'manifest.json', 'runner.json'])
  expect(manifestOf('s9-01').map((m) => [m.id, m.task, m.fix_commit, m.file])).toEqual([[`${s}-T1`, 's9-01', end, 'checks/group.ts'], [`${s}-T2`, 's9-01', end, 'checks/group.ts']])
  expect(r.out).toContain('per task: s9-01 2')
  const skipped = await quiet(() => oracle(['write', 's9-02'], { agent }))
  expect(skipped.out).toBe('s9-02 skipped no serve recipe')
  expect(calls).toHaveLength(1)
})
