import { test, expect, afterAll, spyOn } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hunkOwners, agreement, usable, mergeLabels, introducer, oracleSha, queuePick } from '../bench/lib/oracle.mjs'
import { oracle } from '../bench/oracle.mjs'
import { check } from '../bench/input-check.mjs'

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
writeFileSync(join(data, 'briefs/oracle-re.json'), JSON.stringify({ suffix: '.spec.ts', imports: ['runner-lib'], kinds: ['browser', 'http', 'api', 'none'] }))
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
    [`${s}-T7.spec.ts`]: `def test_${s}_T7(): pass  # names built on prefix '${s}'\n`, // the id prefix in other forms is no leak
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
  expect(r.out).not.toContain('SENTINEL')
  const again = await quiet(() => oracle(['write', task, k3], { agent })) // the writer's record stands: only the move again
  expect(calls).toHaveLength(1)
  expect(again.out).not.toContain('SENTINEL')
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
  expect(r.out).not.toContain('SENTINEL')
})

// one fake writer run on k1 (in-task t1, hunk src/a.txt:4) with the given entries and files; its record is dropped after
const k1Run = async (entries, files) => {
  useSources()
  const s = k1.slice(0, 7), calls = []
  for (const f of [s, `${s}-2`]) for (const x of ['.reply.md', '.reply.md.run.json']) rmSync(join(data, 're-work', f + x), { force: true })
  const r = await quiet(() => oracle(['write', task, k1], { agent: writer(() => ({ 'manifest.json': JSON.stringify(entries(s)), ...files(s) }), calls) }))
  return { ...r, s, calls }
}

test('write refuses a task-repo check that imports anything but the runner', async () => {
  const { code, out, s } = await k1Run((s) => [entry(`${s}-T1`, 'src/a.txt:4'), entry(`${s}-T2`, 'src/a.txt:4'), entry(`${s}-T3`, 'src/a.txt:4'), entry(`${s}-T4`, 'src/a.txt:4')], (s) => ({
    [`${s}-T1.spec.ts`]: "import { test } from 'runner-lib'\n",
    [`${s}-T2.spec.ts`]: "import { test } from 'runner-lib'\nimport { price } from '../src/price'\n",
    [`${s}-T3.spec.ts`]: "const fs = require('node:fs')\n",
    [`${s}-T4.spec.ts`]: "const m = await import(name)\n",
  }))
  expect(code).toBe(0)
  expect(out).toContain('entries 4, written 1, refused 3')
  expect(out).toContain('refused: import 3')
  expect(manifestOf('t1').filter((m) => m.id.startsWith(s)).map((m) => m.id)).toEqual([`${s}-T1`])
})

test('write refuses a task-repo check whose file is not named <id> and the suffix', async () => {
  const { out } = await k1Run((s) => [entry(`${s}-T1`, 'src/a.txt:4'), entry(`${s}-T2`, 'src/a.txt:4')], (s) => ({ [`${s}-T1.spec.ts`]: 'one\n', [`${s}-T2.ts`]: 'two\n' }))
  expect(out).toContain('entries 2, written 1, refused 1')
  expect(out).toContain('refused: file 1')
})

test('write refuses a task-repo check with a kind of interface the task repo has not', async () => {
  const { out } = await k1Run((s) => [entry(`${s}-T1`, 'src/a.txt:4', { interface: 'cli' }), entry(`${s}-T2`, 'src/a.txt:4', { interface: 'http' })], (s) => ({ [`${s}-T1.spec.ts`]: 'one\n', [`${s}-T2.spec.ts`]: 'two\n' }))
  expect(out).toContain('entries 2, written 1, refused 1')
  expect(out).toContain('refused: interface 1')
})

test('write reruns once a writer that left no entry or only interface none, and the second run stands', async () => {
  useSources()
  const s = k1.slice(0, 7), calls = [], none = (id) => entry(id, 'src/a.txt:4', { interface: 'none' })
  for (const f of [s, `${s}-2`]) for (const x of ['.reply.md', '.reply.md.run.json']) rmSync(join(data, 're-work', f + x), { force: true })
  const runs = [[], [none(`${s}-T1`), none(`${s}-T2`)]]
  const agent = writer(() => ({ 'manifest.json': JSON.stringify(runs[calls.length - 1]) }), calls)
  const r = await quiet(() => oracle(['write', task, k1], { agent }))
  expect(r.code).toBe(0)
  expect(calls.map((a) => a[1])).toEqual([`write-${s}`, `write-${s}-2`])
  const a = calls[1], arg = (k) => a[a.indexOf(k) + 1]
  expect(arg('--out')).toBe(join(data, 're-work', `${s}-2.reply.md`))
  expect(arg('--prompt')).toBe(calls[0][calls[0].indexOf('--prompt') + 1])
  expect(JSON.parse(readFileSync(arg('--settings'), 'utf8')).permissions.additionalDirectories).toEqual([join(data, 're-work', `${s}-2`)])
  expect(existsSync(join(data, 're-work', `${s}.reply.md.run.json`))).toBe(true) // the first record stays
  expect(r.out).toContain('entries 2, written 2, refused 0')
  expect(r.out).toContain('rerun: the first run left no entry or only interface none; the second run stands')
  expect(manifestOf('t1').filter((m) => m.id.startsWith(s)).map((m) => m.interface)).toEqual(['none', 'none'])
  const again = await quiet(() => oracle(['write', task, k1], { agent })) // all none again: it stands, no third run
  expect(calls).toHaveLength(2)
  expect(again.out).toContain('writer reused code 0, entries 2, written 2')
})

test('write refuses to reuse a writer whose prompt has changed since it ran', async () => {
  useSources()
  const s = k1.slice(0, 7), calls = []
  const agent = writer(() => ({}), calls)
  const rec = join(data, 're-work', `${s}-2.reply.md.run.json`), prompt = join(data, 're-work/prompts', `${s}.md`)
  expect(JSON.parse(readFileSync(rec, 'utf8')).promptSha).toBe(new Bun.CryptoHasher('sha256').update(readFileSync(prompt, 'utf8')).digest('hex'))
  writeFileSync(join(data, 'briefs/oracle-re.md'), 'RE-BRIEF CHANGED\n')
  try {
    const r = await quiet(() => oracle(['write', task, k1], { agent }))
    expect(r.code).toBe(1)
    expect(r.out).toBe(`write ${s}: refused 1 writer run whose prompt differs from the one it ran with`)
    expect(calls).toHaveLength(0)
    expect(readFileSync(prompt, 'utf8')).toStartWith('RE-BRIEF\n') // the prompt on file is still the one the writer saw
  } finally { writeFileSync(join(data, 'briefs/oracle-re.md'), 'RE-BRIEF\n') }
})

test('write gives a hunk an in-task pair and a later pair both list to the later pair\'s task', async () => {
  useSources()
  const s = k1.slice(0, 7), calls = []
  writeFileSync(join(src, 'pairs.tsv'), ['commit\ttask\tkind\thunks', `${k1}\tt2\tlater\tsrc/a.txt:4`, `${k1}\tt1\tin-task\tsrc/a.txt:4,src/b.txt:9`].join('\n') + '\n')
  writeFileSync(join(src, 'labels.tsv'), ['commit\ttask\tkind\tl1\tl2\tsource', `${k1}\tt1\tin-task\tfix\tfix\tyes`, `${k1}\tt2\tlater\tfix\tfix\tyes`].join('\n') + '\n')
  for (const f of [s, `${s}-2`]) for (const x of ['.reply.md', '.reply.md.run.json']) rmSync(join(data, 're-work', f + x), { force: true })
  const agent = writer(() => ({ 'manifest.json': JSON.stringify([entry(`${s}-T1`, 'src/a.txt:4'), entry(`${s}-T2`, 'src/b.txt:9')]), [`${s}-T1.spec.ts`]: '1\n', [`${s}-T2.spec.ts`]: '2\n' }), calls)
  const r = await quiet(() => oracle(['write', task, k1], { agent }))
  expect(r.out).toContain('per task: t2 1, t1 1')
  expect(manifestOf('t2').filter((m) => m.id.startsWith(s)).map((m) => m.id)).toEqual([`${s}-T1`])
  expect(manifestOf('t1').filter((m) => m.id.startsWith(s)).map((m) => m.id)).toEqual([`${s}-T2`])
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

// --- validate and sweep (rulings 10-13): a fake grade writes what `table(commit, id, oracle dir)` says, as the real one
// would; fake agents edit the copy their settings grant (a fixer) or reply (a comparer) ---
const m1Full = git('rev-parse', m1), n1Full = git('rev-parse', n1)
const parentOf = (c) => git('rev-parse', `${c}^`)
writeFileSync(join(data, 'briefs/fix.md'), 'FIX-BRIEF\n')
writeFileSync(join(data, 'briefs/compare.md'), 'COMPARE-BRIEF\n')
const freshTask = (t, entries, files = {}) => {
  rmSync(join(data, t), { recursive: true, force: true })
  const o = join(data, t, 'oracle')
  mkdirSync(o, { recursive: true })
  writeFileSync(join(o, 'manifest.json'), JSON.stringify(entries))
  for (const [f, text] of Object.entries(files)) { mkdirSync(join(o, f, '..'), { recursive: true }); writeFileSync(join(o, f), text) }
  return o
}
const entryAt = (id, fix, o = {}) => ({ id, fix_commit: fix, task: 't1', hunk: 'src/a.txt:8', origin: 'src/x.spec.ts::seven', behaviour: `SENTINEL-BEHAVIOUR ${id}`, interface: 'browser', severity: 'high', ...o })
const flagOf = (args, k) => args[args.indexOf(k) + 1]
// a verdict for --validate, a result for --at; a throw is the grade's
const fakeGrade = (table, calls, events = []) => async (args) => {
  calls.push(args)
  const o = args[1], ev = join(o, '..'), list = JSON.parse(readFileSync(join(o, 'manifest.json'), 'utf8'))
  if (args.includes('--at')) {
    const c = flagOf(args, '--at')
    events.push(`at ${c.slice(0, 7)}`)
    mkdirSync(join(ev, 'grades'), { recursive: true })
    writeFileSync(join(ev, 'grades', `${c.slice(0, 7)}.json`), JSON.stringify({ commit: c, checks: list.map((m) => ({ id: m.id, result: table(c, m.id, o) })) }))
    return 0
  }
  const ref = flagOf(args, '--validate')
  events.push(`grade ${ref.slice(0, 7)}`)
  const mine = list.filter((m) => m.interface !== 'none' && m.fix_commit.slice(0, 7) === ref.slice(0, 7))
  const checks = mine.map((m) => ({ id: m.id, verdict: table(ref, m.id, o) }))
  writeFileSync(join(ev, `validation-${ref.slice(0, 7)}.json`), JSON.stringify({ ref, checks }))
  return 0
}
// a fixer writes `edit(file)` over each check file of its copy; a comparer replies `say(id)` for every id its prompt names
const fakeAgents = ({ edit = () => 'FIXED\n', say = () => 'same' } = {}, calls = [], events = []) => async (args) => {
  calls.push(args)
  const label = args[1], out = flagOf(args, '--out')
  events.push(label.replace(/-[0-9a-f]{7}$/, ''))
  if (label.startsWith('fix-')) {
    const dir = JSON.parse(readFileSync(flagOf(args, '--settings'), 'utf8')).permissions.additionalDirectories[0]
    for (const f of readdirSync(dir, { recursive: true })) if (/T\d+\.spec\.ts$|group\.ts$/.test(f)) writeFileSync(join(dir, f), edit(f))
    writeFileSync(out, 'SENTINEL-FIXER')
  } else {
    const ids = [...new Set(readFileSync(flagOf(args, '--prompt'), 'utf8').match(/[0-9a-f]{7}-T\d+|runner\.json/g))]
    writeFileSync(out, JSON.stringify(ids.map((id) => ({ id, verdict: say(id) }))))
  }
  writeFileSync(`${out}.run.json`, '{"code":0}')
  return 0
}
const extSample = () => {
  const ext = join(data, 'ext')
  mkdirSync(ext, { recursive: true })
  writeFileSync(join(ext, 'sample.tsv'), ['task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend', `s9-01\ts9\t1\t1\town/rp#7\tu\t7\t6\t${k1Full}\t${k3Full}`].join('\n') + '\n')
  rmSync(join(ext, 'walk.tsv'), { force: true })
  return ext
}
const extOracle = (s) => freshTask('s9-01', [
  entryAt(`${s}-T1`, k3Full, { task: 's9-01', interface: 'cli', file: 'checks/group.ts' }),
  entryAt(`${s}-T2`, k3Full, { task: 's9-01', interface: 'cli', file: 'checks/group.ts' }),
  entryAt(`${s}-T3`, k3Full, { task: 's9-01', interface: 'none' }),
], { 'checks/group.ts': 'BEFORE\n', 'runner.json': '{}' })

test('an external task validates end against base with no base run', async () => {
  extSample()
  const s = k3Full.slice(0, 7), o = extOracle(s), calls = []
  const r = await quiet(() => oracle(['validate', 's9-01'], { grade: fakeGrade(() => 'valid', calls), agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(calls).toEqual([[join(data, 'env/s9-01.json'), o, '--validate', k3Full, '--bad', k1Full, '--sealed', '--reuse']])
  expect(r.out).toContain('s9-01: checks 2, valid 2, weak 0, broken 0, error 0, pre-existing 0, absent-at-base 0, interface none 1, fixer rounds 0, changed 0, kept 0, refused 0')
  expect(r.out).not.toContain('dropped')
  expect(r.out).not.toContain('SENTINEL')
})

test('a real-estate fix inside the task gets no end as a bad version', async () => {
  const o = freshTask('t1', [entryAt(`${k1}-T1`, k1Full), entryAt(`${m1}-T1`, m1Full), entryAt(`${m1}-T2`, m1Full, { interface: 'none' })])
  const calls = []
  const r = await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(() => 'valid', calls), agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(calls).toEqual([
    [task, o, '--validate', k1Full, '--bad', parentOf(k1Full), '--base', c0, '--sealed', '--reuse'], // k1 is inside t1 = c0..k3
    [task, o, '--validate', m1Full, '--bad', parentOf(m1Full), '--bad', k3, '--base', c0, '--sealed', '--reuse'],
  ])
  expect(r.out).toContain('t1: checks 2, valid 2,')
  expect(r.out).toContain('interface none 1,')
})

test('a fixed check the comparer calls changed stays broken', async () => {
  const id = `${k1}-T1`, o = freshTask('t1', [entryAt(id, k1Full)], { [`${id}.spec.ts`]: 'BEFORE\n' })
  const calls = [], agents = []
  const r = await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(() => 'broken', calls), agent: fakeAgents({ say: () => 'changed' }, agents) }))
  expect(r.code).toBe(0)
  expect(readFileSync(join(o, `${id}.spec.ts`), 'utf8')).toBe('BEFORE\n')
  expect(calls).toHaveLength(1) // nothing kept: no pass after either round
  expect(agents.map((a) => a[1])).toEqual([`fix-1-t1-${k1}`, `compare-1-t1-${k1}`, `fix-2-t1-${k1}`, `compare-2-t1-${k1}`])
  const cmp = agents[1]
  expect(flagOf(cmp, '--tools')).toBe('Read')
  expect(cmp).not.toContain('--at')
  const prompt = readFileSync(flagOf(cmp, '--prompt'), 'utf8')
  for (const x of ['COMPARE-BRIEF', 'BEFORE', 'FIXED', id]) expect(prompt).toContain(x)
  expect(prompt).not.toContain('SENTINEL-BEHAVIOUR') // the comparer sees the two files only
  expect(r.out).toContain('t1: checks 1, valid 0, weak 0, broken 1, error 0, pre-existing 0, absent-at-base 0, interface none 0, fixer rounds 2, changed 2, kept 0, refused 2')
  expect(r.out).not.toContain('SENTINEL')
})

test('a fixer round covers every broken check before the next pass', async () => {
  const a = `${k1}-T1`, b = `${k1}-T2`, c = `${m1}-T1`
  const o = freshTask('t1', [entryAt(a, k1Full), entryAt(b, k1Full), entryAt(c, m1Full)], { [`${a}.spec.ts`]: 'A\n', [`${b}.spec.ts`]: 'B\n', [`${c}.spec.ts`]: 'C\n', 'run.config.ts': 'CONFIG\n' })
  const logs = join(data, 't1/logs')
  mkdirSync(logs)
  for (const n of [1, 2]) writeFileSync(join(logs, `${k1}-${n}.log`), 'SENTINEL-LOG\n')
  const events = [], calls = [], agents = []
  // a check is valid once its file says FIXED; b is valid from the start
  const table = (ref, id, dir) => (id === b || readFileSync(join(dir, `${id}.spec.ts`), 'utf8') === 'FIXED\n' ? 'valid' : 'broken')
  const r = await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(table, calls, events), agent: fakeAgents({ edit: (f) => (f.endsWith(`${b}.spec.ts`) ? 'B2\n' : 'FIXED\n') }, agents, events) }))
  expect(r.code).toBe(0)
  expect(events).toEqual([`grade ${k1}`, `grade ${m1}`, 'fix-1-t1', 'compare-1-t1', 'fix-1-t1', 'compare-1-t1', `grade ${k1}`, `grade ${m1}`])
  const fix = agents[0], work = join(data, 't1/work/fix-1', k1)
  expect(flagOf(fix, '--at')).toBe(k1Full)
  expect(flagOf(fix, '--tools')).toBe('Read,Glob,Grep,Write,Edit')
  const perm = JSON.parse(readFileSync(flagOf(fix, '--settings'), 'utf8')).permissions
  expect(perm.additionalDirectories).toEqual([work, logs])
  expect(perm.allow).toEqual([`Read(/${work}/**)`, `Edit(/${work}/**)`, `Read(/${logs}/**)`])
  const prompt = readFileSync(flagOf(fix, '--prompt'), 'utf8')
  for (const x of ['FIX-BRIEF', a, 'src/x.spec.ts::seven', join(logs, `${k1}-2.log`), work]) expect(prompt).toContain(x)
  expect(prompt).not.toContain(`${k1}-1.log`)
  expect(prompt).not.toContain(`"${b}"`)
  expect(readFileSync(join(o, `${a}.spec.ts`), 'utf8')).toBe('FIXED\n')
  expect(readFileSync(join(o, `${b}.spec.ts`), 'utf8')).toBe('B\n') // not broken: out of scope, not copied
  expect(readFileSync(join(o, `${c}.spec.ts`), 'utf8')).toBe('FIXED\n')
  expect(readFileSync(join(o, 'run.config.ts'), 'utf8')).toBe('CONFIG\n')
  expect(r.out).toContain('t1: checks 3, valid 3, weak 0, broken 0, error 0, pre-existing 0, absent-at-base 0, interface none 0, fixer rounds 1, changed 5, kept 2, refused 3') // k1's copy: a, b, c; m1's: b, c
  expect(r.out).not.toContain('SENTINEL')
})

test('a grade that throws records error for that commit\'s checks and the task goes on', async () => {
  freshTask('t1', [entryAt(`${k1}-T1`, k1Full), entryAt(`${m1}-T1`, m1Full)])
  const calls = [], agents = []
  const table = (ref) => { if (ref === k1Full) throw new Error('port 3999 busy'); return 'valid' }
  const r = await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(table, calls), agent: fakeAgents({}, agents) }))
  expect(r.code).toBe(0)
  expect(calls).toHaveLength(2)
  expect(agents).toHaveLength(0) // an error is not broken: no fixer
  const v = JSON.parse(readFileSync(join(data, 't1', `validation-${k1}.json`), 'utf8'))
  expect(v.checks).toEqual([{ id: `${k1}-T1`, verdict: 'error', stage: 'port 3999 busy' }])
  expect(r.out).toContain(`validation-${k1}: error 1 (port 3999 busy)`)
  expect(r.out).toContain('t1: checks 2, valid 1, weak 0, broken 0, error 1,')
})

test('an external task with no valid check is dropped', async () => {
  const ext = extSample()
  extOracle(k3Full.slice(0, 7))
  const r = await quiet(() => oracle(['validate', 's9-01'], { grade: fakeGrade(() => 'weak', []), agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(r.out).toContain('s9-01 dropped no valid check')
  expect(readFileSync(join(ext, 'walk.tsv'), 'utf8').trim().split('\n').at(-1)).toBe('s9\t1\t1\town/rp#7\tdropped')
})

test('sweep runs each distinct boundary once and moves a pre-existing check to its introducer', async () => {
  // t1 = c0..k3, t2 = k3..m1, t3 = m1..n1; x (owned by t2) fails at t1's end and passes at its base; y fails at both
  const x = `${n1}-T1`, y = `${n1}-T2`
  rmSync(join(data, 't1'), { recursive: true, force: true })
  rmSync(join(data, 't3'), { recursive: true, force: true })
  const o2 = freshTask('t2', [entryAt(x, n1Full, { task: 't2' }), entryAt(y, n1Full, { task: 't2' })], { [`${x}.spec.ts`]: 'X\n', [`${y}.spec.ts`]: 'Y\n' })
  writeFileSync(join(data, 't2', `validation-${n1}.json`), JSON.stringify({ checks: [{ id: x, verdict: 'pre-existing' }, { id: y, verdict: 'pre-existing' }] }))
  const calls = [], events = []
  const table = (c, id) => (c.length > 7 ? 'valid' : c === k3 ? 'fail' : c === c0 ? (id === x ? 'pass' : 'fail') : 'fail')
  const r = await quiet(() => oracle(['sweep', task, '--drop', 't3'], { grade: fakeGrade(table, calls, events), agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(events).toEqual([`at ${n1}`, `at ${m1}`, `at ${k3}`, `at ${c0}`, `grade ${n1}`])
  expect(calls[0]).toEqual([task, join(data, 'sweep/oracle'), '--at', n1, '--sealed', '--reuse'])
  expect(calls[4]).toEqual([task, join(data, 't1/oracle'), '--validate', n1Full, '--bad', parentOf(n1Full), '--bad', k3, '--base', c0, '--sealed', '--reuse'])
  expect(ls(join(data, 'sweep/oracle'))).toEqual([`${x}.spec.ts`, `${y}.spec.ts`, 'manifest.json', 'node_modules', 'package.json', 'run.config.ts'])
  expect(manifestOf('t1')).toEqual([entryAt(x, n1Full, { task: 't1' })])
  expect(ls(join(data, 't1/oracle'))).toEqual([`${x}.spec.ts`, 'manifest.json', 'node_modules', 'package.json', 'run.config.ts'])
  expect(manifestOf('t2').map((m) => m.id)).toEqual([y])
  expect(ls(o2)).toEqual([`${y}.spec.ts`, 'manifest.json'])
  expect(JSON.parse(readFileSync(join(data, 't2/moves.json'), 'utf8'))).toEqual([{ id: x, to: 't1', moved: true }, { id: y, to: null, moved: false }])
  expect(r.out).toContain(`${x} moved to t1`)
  expect(r.out).toContain(`${y} recorded none`)
  expect(r.out).toContain('sweep: pre-existing 2, boundaries 4, moved 1, recorded 1')
  expect(r.out).toContain('t1: checks 1, valid 1,')
  expect(r.out).not.toContain('SENTINEL')
})

test('a task-repo base without the app file is not run and gives precondition at the base', async () => {
  // tests/a.test.txt is the app file here: k1 adds it, so t1's base c0 has none
  const appTask = join(tmp, 'task-app.json')
  writeFileSync(appTask, JSON.stringify({ ...JSON.parse(readFileSync(task, 'utf8')), appFile: 'tests/a.test.txt' }))
  const a = `${k1}-T1`, b = `${m1}-T1`
  freshTask('t1', [entryAt(a, k1Full), entryAt(b, m1Full)])
  const calls = []
  const grade = async (args) => { // as grade writes it with no --base: every check's results, base null
    calls.push(args)
    const ref = flagOf(args, '--validate'), id = ref === k1Full ? a : b, bad = ref === k1Full ? ['fail'] : ['fail', 'precondition']
    writeFileSync(join(data, 't1', `validation-${ref.slice(0, 7)}.json`), JSON.stringify({ ref, bad: [], base: null, checks: [{ id, ref: 'pass', bad, base: null, verdict: 'absent-at-base' }] }))
    return 0
  }
  const r = await quiet(() => oracle(['validate', appTask, 't1'], { grade, agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(calls.every((x) => !x.includes('--base'))).toBe(true)
  const v = JSON.parse(readFileSync(join(data, 't1', `validation-${k1}.json`), 'utf8'))
  expect(v.base).toBe(c0)
  expect(v.checks).toEqual([{ id: a, ref: 'pass', bad: ['fail'], base: 'precondition', stage: 'no app at base', verdict: 'absent-at-base' }])
  // a precondition failure on a known-bad version stays broken: the base-run rule, not the external one
  expect(JSON.parse(readFileSync(join(data, 't1', `validation-${m1}.json`), 'utf8')).checks[0].verdict).toBe('broken')
  expect(r.out).toContain(`validation-${k1} (no app at base): ${a}=absent-at-base`)
  // a base that has the app file is run as usual
  const runs = []
  await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(() => 'valid', runs), agent: fakeAgents() }))
  expect(runs[0]).toContain('--base')
})

test('sweep reads a boundary without the app file as precondition for every check, with no run', async () => {
  // as the sweep test, with tests/a.test.txt the app file: t1's base c0 has none, so y (which fails at c0) moves too
  const appTask = join(tmp, 'task-app.json'), x = `${n1}-T1`, y = `${n1}-T2`
  writeFileSync(appTask, JSON.stringify({ ...JSON.parse(readFileSync(task, 'utf8')), appFile: 'tests/a.test.txt' }))
  rmSync(join(data, 't1'), { recursive: true, force: true })
  rmSync(join(data, 't3'), { recursive: true, force: true })
  freshTask('t2', [entryAt(x, n1Full, { task: 't2' }), entryAt(y, n1Full, { task: 't2' })], { [`${x}.spec.ts`]: 'X\n', [`${y}.spec.ts`]: 'Y\n' })
  writeFileSync(join(data, 't2', `validation-${n1}.json`), JSON.stringify({ checks: [{ id: x, verdict: 'pre-existing' }, { id: y, verdict: 'pre-existing' }] }))
  const events = []
  const table = (c, id) => (c.length > 7 ? 'valid' : c === c0 ? (id === x ? 'pass' : 'fail') : 'fail')
  const r = await quiet(() => oracle(['sweep', appTask, '--drop', 't3'], { grade: fakeGrade(table, [], events), agent: fakeAgents() }))
  expect(r.code).toBe(0)
  expect(events.filter((e) => e.startsWith('at '))).toEqual([`at ${n1}`, `at ${m1}`, `at ${k3}`]) // c0 is not run
  expect(r.out).toContain(`sweep ${c0}: no app, every check precondition`)
  expect(manifestOf('t1').map((m) => m.id)).toEqual([x, y])
  expect(r.out).toContain('sweep: pre-existing 2, boundaries 4, moved 2, recorded 0')
})

// --- bench/oracle.mjs sheet (ruling 14) ---
const sheetSetup = () => {
  const ext = join(data, 'ext')
  for (const d of ['env', 'briefs']) mkdirSync(join(ext, d), { recursive: true })
  const cols = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend'
  writeFileSync(join(ext, 'sample.tsv'), [cols, `s9-01\ts9\t1\t1\town/rp#7\tu\t7\t6\t${k1Full}\t${k3Full}`, `s9-02\ts9\t1\t2\town/rp#8\tu\t8\t5\t${k1Full}\t${k3Full}`].join('\n') + '\n')
  writeFileSync(join(ext, 'env/own__rp.json'), JSON.stringify({ name: 'own__rp', repo, db: null, port: 3998, start: 'true', ready: 'http://127.0.0.1:3998/', oracle: 'true', junit: 'r.xml' }))
  writeFileSync(join(ext, 'briefs/interface.md'), 'SHEET-BRIEF\n')
  writeFileSync(join(ext, 'groups.json'), JSON.stringify({ groups: [{ id: 's9', testPaths: ['\\.spec\\.ts$'] }] }))
  for (const t of ['s9-01', 's9-02']) { mkdirSync(join(data, t), { recursive: true }); writeFileSync(join(data, t, 'input.md'), '# INPUT-TITLE\n\nINPUT-BODY\n') }
  return ext
}
const replier = (replies, calls) => async (args) => {
  calls.push(args)
  const out = args[args.indexOf('--out') + 1]
  writeFileSync(`${out}.run.json`, '{"code":0}')
  writeFileSync(out, replies[calls.length - 1])
  return 0
}
// at k3: A7 and A3 are in src/a.txt (a source file); `spec` only in src/x.spec.ts (the stack's testPaths); `one` only in
// tests/a.test.txt (isTestPath); SENTINEL-ABSENT nowhere
const SHEET_REPLY = ['Here is the sheet.', '# Interface sheet', '',
  '## /SENTINEL-PAGE', '- button text: "A7"', '- URL path: "src/SENTINEL.ts"', '- heading: "spec"', '- heading: "one"', '- heading: "SENTINEL-ABSENT"', '- SENTINEL kind: "A3"', 'SENTINEL prose', '',
  '## src/SENTINEL.ts', '- heading: "A3"', '',
  '## SENTINEL-CMD', '- flag: "A3"', '    - nested: "SENTINEL-X"', '',
  '## SENTINEL-EMPTY', '- heading: "SENTINEL-ABSENT-2"', ''].join('\n')

test('sheet deletes flagged lines and then passes input-check', async () => {
  const ext = sheetSetup(), calls = []
  const r = await quiet(() => oracle(['sheet', 's9-01'], { agent: replier([SHEET_REPLY], calls) }))
  expect(r.code).toBe(0)
  // deleted: a flagged bullet, a bad kind, prose, a nested bullet; notfound: spec, one, the two absent
  expect(r.out).toBe('s9-01 sheet names=3 deleted=4 notfound=4 input-check=PASS')
  const sheet = readFileSync(join(data, 's9-01/interface.md'), 'utf8')
  expect(check(sheet)).toEqual([])
  // the preamble is dropped, a flagged heading is renamed by its position and keeps its bullet, and the section every
  // name of which was not found is dropped
  expect(sheet).toBe('# Interface sheet\n\n## /SENTINEL-PAGE\n- button text: "A7"\n\n## Unnamed section 2\n- heading: "A3"\n\n## SENTINEL-CMD\n- flag: "A3"\n')
  const a = calls[0], arg = (k) => a[a.indexOf(k) + 1]
  expect(a[0]).toBe(join(ext, 'env/own__rp.json'))
  expect(arg('--at')).toBe(k3Full)
  expect(arg('--tools')).toBe('Read,Glob,Grep')
  expect(arg('--out')).toBe(join(data, 's9-01/interface.reply.md'))
  expect(a).not.toContain('--settings')
  const prompt = readFileSync(arg('--prompt'), 'utf8')
  expect(prompt).toStartWith('SHEET-BRIEF\n')
  expect(prompt).toContain('INPUT-BODY')
  expect(JSON.parse(readFileSync(join(data, 's9-01/interface.reply.md.run.json'), 'utf8')).promptSha).toHaveLength(64)
  // an existing sheet with its run record is reused, not rerun
  const again = await quiet(() => oracle(['sheet', 's9-01'], { agent: replier([SHEET_REPLY], calls) }))
  expect(again.out).toBe(r.out)
  expect(calls).toHaveLength(1)
})

test('sheet prints no name', async () => {
  sheetSetup()
  const calls = []
  const r = await quiet(() => oracle(['sheet', 's9-02'], { agent: replier(['SENTINEL-NOT-A-SHEET\n', '# Interface sheet\n\n## SENTINEL\n- URL path: "src/SENTINEL.ts"\n- heading: "SENTINEL-ABSENT"\n'], calls) }))
  expect(r.code).toBe(1)
  expect(r.out).toBe('s9-02 sheet failed') // a title with no bullet left (deleted or not found) is not a sheet either
  expect(calls.map((a) => a[a.indexOf('--out') + 1])).toEqual([join(data, 's9-02/interface.reply.md'), join(data, 's9-02/interface-2.reply.md')])
  expect(existsSync(join(data, 's9-02/interface.md'))).toBe(false)
  const reused = await quiet(() => oracle(['sheet', 's9-01'], { agent: replier([], calls) }))
  expect(reused.out).not.toContain('SENTINEL')
  expect(calls).toHaveLength(2)
})

// --- bench/oracle.mjs classify, split, queue (rulings 15, 16): each test has a data folder of its own ---
const FIX = 'abcdef1'.padEnd(40, '0'), END = '1234567'.padEnd(40, '0'), SEED = 'seed-t'
const CLASSES = ['traceable', 'not traceable', 'partly']
const clData = (name) => {
  const d = join(tmp, name), ext = join(d, 'ext')
  for (const x of ['briefs', 'ext/briefs', 'env', 'sources']) mkdirSync(join(d, x), { recursive: true })
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'tasks.json'), JSON.stringify({ r1: { base: 'b', end: 'e' }, r2: { base: 'b', end: 'e' } }))
  writeFileSync(join(ext, 'sample.tsv'), 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\tb\te\nx2-01\tx2\t1\t1\town/rq#8\tu\t8\t5\tb\te\n')
  writeFileSync(join(ext, 'groups.json'), JSON.stringify({ seed: SEED, groups: [] }))
  writeFileSync(join(d, 'briefs/classify.md'), 'CLASSIFY-BRIEF\n')
  writeFileSync(join(d, 'briefs/split.md'), 'SPLIT-BRIEF\n')
  writeFileSync(join(d, 'briefs/oracle-re.md'), 'RE-RULES\n')
  writeFileSync(join(d, 'briefs/oracle-re.json'), JSON.stringify({ suffix: '.spec.ts', imports: ['@playwright/test'], kinds: ['browser', 'http', 'api', 'none'] }))
  writeFileSync(join(ext, 'briefs/oracle.md'), 'EXT-RULES\n')
  writeFileSync(join(d, 'sources/labels.tsv'), 'commit\ttask\tkind\tl1\tl2\tsource\naaaaaaa\tr1\tlater\tfix\trequirement change\tstep9\nbbbbbbb\tr1\tlater\tfix\tfix\tyes\n')
  return d
}
// a task folder: input, sheet, oracle (rows [id, verdict, extra fields], files) and the validation of its fix commit
const clTask = (d, t, fix, rows, files) => {
  const o = join(d, t, 'oracle')
  mkdirSync(o, { recursive: true })
  writeFileSync(join(d, t, 'input.md'), 'SENTINEL-INPUT\n')
  writeFileSync(join(d, t, 'interface.md'), 'SENTINEL-SHEET\n')
  writeFileSync(join(o, 'manifest.json'), JSON.stringify(rows.map(([id, , x]) => ({ id, fix_commit: fix, task: t, hunk: 'src/a.ts:3', origin: 'SENTINEL-ORIGIN.spec.ts::t', behaviour: 'SENTINEL-BEHAVIOUR', interface: 'browser', severity: 'high', ...x }))))
  for (const [f, text] of Object.entries(files)) { mkdirSync(join(o, f, '..'), { recursive: true }); writeFileSync(join(o, f), text) }
  writeFileSync(join(d, t, `validation-${fix.slice(0, 7)}.json`), JSON.stringify({ ref: fix, checks: rows.filter(([, v]) => v).map(([id, v]) => ({ id, verdict: v })) }))
}
// a fake sealed agent: a classifier labels each id of its prompt by rate(rater, id) (undefined: left out); a splitter
// writes split(ids, label) into its out/ folder, or nothing; stream(args), when given, is the transcript the record hook reads
// a classifier reads every file of its folder unless read(label, files) picks fewer
const readsOf = (paths) => paths.map((f, i) => [JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: `r${i}`, name: 'Read', input: { file_path: f } }] } }),
  JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `r${i}` }] } })].join('\n')).join('\n')
const filesIn = (d, at = '') => readdirSync(join(d, at), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(d, join(at, e.name)) : [join(d, at, e.name)]))
const fake = (calls, { rate = () => 'traceable', split = () => null, stream, read = (label, files) => files } = {}) => async (args, opts) => {
  calls.push(args)
  const arg = (k) => args[args.indexOf(k) + 1], out = arg('--out'), prompt = readFileSync(arg('--prompt'), 'utf8')
  const ids = [...prompt.matchAll(/`([0-9a-z]+-T\d+)`/g)].map((m) => m[1])
  const folder = args[1].startsWith('classify') ? JSON.parse(readFileSync(arg('--settings'), 'utf8')).permissions.additionalDirectories[0] : null
  const transcript = stream ? stream(args) : folder ? readsOf(read(args[1], filesIn(folder))) : null
  writeFileSync(`${out}.run.json`, JSON.stringify({ code: 0, ...(transcript !== null && opts?.record ? opts.record(transcript) : {}) }))
  if (args[1].startsWith('split-')) {
    const files = split(ids, args[1])
    for (const [f, text] of Object.entries(files ?? {})) writeFileSync(join(out, '..', 'out', f), text)
    writeFileSync(out, files ? 'split' : 'cannot split')
    return 0
  }
  const r = Number(args[1].match(/^classify(?:-split)?-(\d)/)[1])
  writeFileSync(out, `SENTINEL-REPLY\n${JSON.stringify(ids.map((id) => ({ id, label: rate(r, id), quotes: ['SENTINEL-QUOTE'], steps: [] })).filter((x) => x.label))}`)
  return 0
}
const withData = async (d, fn) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await fn() } finally { process.env.HSTACK_BENCH_MACHINE = prev }
}
const argOf = (a, k) => a[a.indexOf(k) + 1]
const jsonAt = (f) => JSON.parse(readFileSync(f, 'utf8'))

test('classify gives the raters the manifest without fix_commit, origin, hunk or task', async () => {
  const d = clData('cl1'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'valid', { file: 'checks/group.ts' }], [`${e}-T2`, 'absent-at-base', { file: 'checks/group.ts' }], [`${e}-T3`, 'broken', { file: `${e}-T3.ts` }],
    [`${e}-T4`, 'valid', { interface: 'none' }], [`${e}-T5`, 'valid', { file: `${e}-T5.ts`, dropped: true }], [`${e}-T6`, 'valid', { file: `${e}-T6.ts` }]],
  { 'checks/group.ts': 'SENTINEL-CHECK\n', [`${e}-T3.ts`]: 'x\n', [`${e}-T5.ts`]: 'x\n', [`${e}-T6.ts`]: 'SENTINEL-CHECK\n', 'runner.json': '{}' })
  const rate = (r, id) => (id.endsWith('T6') && r === 2 ? 'partly' : 'traceable')
  const folder = join(d, 'x1-01/work/classify')
  // the transcript the record hook counts: a Read in the folder, one that failed, one outside it
  const use = (id, file_path) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Read', input: { file_path } }] } })
  const res = (id, is_error) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error }] } })
  const stream = () => [use('a', `${folder}/input.md`), res('a', false), use('b', `${folder}/manifest.json`), res('b', true), use('c', '/elsewhere/x'), res('c', false)].join('\n')
  const r = await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate, stream }) })))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 classified=3 build=2 requirement=0 partly=0 disputed=1 kappa=0.00 raw=0.67 ac1=0.61')
  expect(jsonAt(join(d, 'x1-01/classify-1.reply.md.run.json'))).toMatchObject({ reads: 2, readsInFolder: 1, filesInFolder: 1 })
  // the reading gate: each rater read 1 of the folder's 5 files, so each ran once more; the rerun stands whatever it reads
  expect(calls.map((a) => a[1]).sort()).toEqual(['classify-1-x1-01', 'classify-1-x1-01-2', 'classify-2-x1-01', 'classify-2-x1-01-2'])
  calls.splice(0)
  for (const r of [1, 2]) for (const x of ['', '-2']) rmSync(join(d, `x1-01/classify-${r}${x}.reply.md.run.json`))
  for (const r of [1, 2]) for (const x of ['', '-2']) rmSync(join(d, `x1-01/classify-${r}${x}.reply.md`), { force: true })
  expect((await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))).out).toBe(r.out)
  expect(ls(folder)).toEqual([`${e}-T6.ts`, 'checks', 'input.md', 'interface.md', 'manifest.json'])
  const shown = jsonAt(join(folder, 'manifest.json'))
  expect(shown.map((m) => m.id)).toEqual([`${e}-T1`, `${e}-T2`, `${e}-T6`])
  for (const m of shown) for (const k of ['fix_commit', 'origin', 'hunk', 'task']) expect(m).not.toHaveProperty(k)
  expect(calls.map((a) => a[1]).sort()).toEqual(['classify-1-x1-01', 'classify-2-x1-01'])
  expect(argOf(calls[0], '--prompt')).toBe(argOf(calls[1], '--prompt'))
  for (const a of calls) {
    expect(a[0]).toBe(join(d, 'env/x1-01.json'))
    expect(a).not.toContain('--at')
    expect(argOf(a, '--tools')).toBe('Read,Glob,Grep')
    expect(jsonAt(argOf(a, '--settings')).permissions).toEqual({ additionalDirectories: [folder], allow: [`Read(/${folder}/**)`] })
  }
  expect(readFileSync(argOf(calls[0], '--prompt'), 'utf8')).toStartWith('CLASSIFY-BRIEF\n')
  expect(jsonAt(join(d, 'x1-01/labels.json'))).toEqual({ [`${e}-T1`]: 'build', [`${e}-T2`]: 'build' })
  expect(jsonAt(join(d, 'x1-01/agreement.json'))).toMatchObject({ n: 3, agree: 2, checks: 3, usable: false, partly: [], disputed: [`${e}-T6`] })
  // a task of tasks.json needs its task file; a run with its record and the same prompt is reused
  await withData(d, () => expect(oracle(['classify', 'r1'], { agent: fake(calls) })).rejects.toThrow('give its task file'))
  const again = await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))
  expect(again.out).toBe(r.out)
  expect(calls).toHaveLength(2)
  // a changed brief: refused before any run, and the prompt the raters ran with stays
  const prompt = readFileSync(argOf(calls[0], '--prompt'), 'utf8')
  writeFileSync(join(d, 'briefs/classify.md'), 'CLASSIFY-BRIEF-2\n')
  expect(await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))).toEqual({ code: 1, out: 'x1-01 classify refused a run whose prompt differs from the one it ran with' })
  expect(readFileSync(argOf(calls[0], '--prompt'), 'utf8')).toBe(prompt)
  expect(calls).toHaveLength(2)
})

test('classify fails without labels or agreement when a rater has no labelled reply after its rerun', async () => {
  const d = clData('cl8'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'valid'], [`${e}-T2`, 'valid']], { [`${e}-T1.ts`]: 'x\n', [`${e}-T2.ts`]: 'x\n' })
  const rate = (r) => (r === 2 ? undefined : 'traceable')
  const r = await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))
  expect(r).toEqual({ code: 1, out: 'x1-01 classify failed: rater 2 has no labelled reply (no label, or a run that failed)' })
  expect(calls).toHaveLength(3)
  for (const f of ['labels.json', 'agreement.json', 'classify-2.json']) expect(existsSync(join(d, 'x1-01', f))).toBe(false)
  // a run that ended with a code other than 0 fails the same way, whatever its reply
  const d2 = clData('cl9'), calls2 = []
  clTask(d2, 'x1-01', END, [[`${e}-T1`, 'valid']], { [`${e}-T1.ts`]: 'x\n' })
  const agent = async (args, opts) => { await fake(calls2)(args, opts); if (args[1].startsWith('classify-1')) writeFileSync(`${argOf(args, '--out')}.run.json`, '{"code":1}'); return 0 }
  expect((await withData(d2, () => quiet(() => oracle(['classify', 'x1-01'], { agent })))).out).toBe('x1-01 classify failed: rater 1 has no labelled reply (no label, or a run that failed)')
  expect(existsSync(join(d2, 'x1-01/agreement.json'))).toBe(false)
})

test('classify reruns once a rater that did not open every file of its folder, and the rerun stands', async () => {
  const d = clData('cl12'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'valid'], [`${e}-T2`, 'valid']], { [`${e}-T1.ts`]: 'x\n', [`${e}-T2.ts`]: 'x\n' })
  // rater 1 skips a check file, then its rerun skips one too; rater 2 reads all; a file read twice counts once
  const read = (label, files) => (label.startsWith('classify-1') ? files.filter((f) => !f.endsWith('T2.ts')) : [...files, files[0]])
  const rate = (r, id) => (r === 1 ? 'not traceable' : 'traceable')
  const r = await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate, read }) })))
  expect(r.code).toBe(0)
  expect(calls.map((a) => a[1]).sort()).toEqual(['classify-1-x1-01', 'classify-1-x1-01-2', 'classify-2-x1-01'])
  expect(jsonAt(join(d, 'x1-01/classify-1.reply.md.run.json'))).toMatchObject({ readsInFolder: 4, filesInFolder: 4 })
  expect(jsonAt(join(d, 'x1-01/classify-2.reply.md.run.json'))).toMatchObject({ readsInFolder: 6, filesInFolder: 5 })
  expect(jsonAt(join(d, 'x1-01/classify-1.json')).map((x) => x.label)).toEqual(['not traceable', 'not traceable'])
  // a rerun of the command reuses both runs: the gate does not run a third time
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate, read }) })))
  expect(calls).toHaveLength(3)
})

test('classify reruns a bad reply once and leaves an id the rerun still misses disputed', async () => {
  const d = clData('cl6'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'valid'], [`${e}-T2`, 'valid']], { [`${e}-T1.ts`]: 'x\n', [`${e}-T2.ts`]: 'x\n' })
  const rate = (r, id) => (r === 2 && id.endsWith('T2') ? undefined : 'traceable')
  const r = await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))
  expect(r.out).toBe('x1-01 classified=2 build=1 requirement=0 partly=0 disputed=1 kappa=1.00 raw=1.00 ac1=1.00')
  expect(calls.map((a) => a[1]).sort()).toEqual(['classify-1-x1-01', 'classify-2-x1-01', 'classify-2-x1-01-2'])
  expect(jsonAt(join(d, 'x1-01/classify-2.json'))).toEqual([{ id: `${e}-T1`, label: 'traceable' }])
})

test('classify refuses when nothing is scored or a file is missing', async () => {
  const d = clData('cl2'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'broken'], [`${e}-T2`, 'valid', { interface: 'none' }]], { [`${e}-T1.ts`]: 'x\n' })
  clTask(d, 'x2-01', END, [[`${e}-T1`, 'valid']], {})
  const run = (t) => withData(d, () => quiet(() => oracle(['classify', t], { agent: fake(calls) })))
  expect(await run('x1-01')).toEqual({ code: 1, out: 'x1-01 classify refused: no scored check' })
  expect(await run('x2-01')).toEqual({ code: 1, out: 'x2-01 classify refused: a scored check has no file' })
  rmSync(join(d, 'x2-01/interface.md'))
  expect(await run('x2-01')).toEqual({ code: 1, out: 'x2-01 classify refused: no interface.md' })
  expect(calls).toHaveLength(0)
  expect(existsSync(join(d, 'x1-01/labels.json'))).toBe(false)
})

test('agreed partly goes to split and disputed stays unlabelled', async () => {
  const d = clData('cl3'), f = FIX.slice(0, 7), id = (n) => `${f}-T${n}`, calls = [], vcalls = []
  const spec = (n) => ({ [`${id(n)}.spec.ts`]: "import { test } from '@playwright/test'\nSENTINEL-CHECK\n" })
  clTask(d, 'r1', FIX, [1, 2, 3, 4, 5].map((n) => [id(n), 'valid']), Object.assign({}, ...[1, 2, 3, 4, 5].map(spec)))
  clTask(d, 'r2', FIX, [[id(9), 'valid']], spec(9)) // another task holds a check of the same commit: new ids come after it
  const rate = (r, x) => ({ [id(1)]: 'traceable', [id(2)]: 'not traceable', [id(3)]: 'partly', [id(4)]: r === 1 ? 'traceable' : 'not traceable', [id(5)]: 'partly',
    [id(10)]: 'traceable', [id(11)]: 'partly' })[x]
  // the splitter cannot split the first partly check and splits the second
  const split = (ids, label) => (label.endsWith(id(5).toLowerCase()) ? { 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'SENTINEL-B', severity: 'medium' }))), ...spec(10), ...spec(11) } : null)
  const agent = fake(calls, { rate, split }), task = join(d, 'env/r.json')
  const validate = async (a) => { // the new checks validate
    vcalls.push(a)
    const v = join(d, 'r1', `validation-${f}.json`), x = jsonAt(v)
    writeFileSync(v, JSON.stringify({ ...x, checks: [...x.checks, { id: id(10), verdict: 'valid' }, { id: id(11), verdict: 'valid' }] }))
    return 0
  }
  const c = await withData(d, () => quiet(() => oracle(['classify', task, 'r1'], { agent, validate })))
  expect(c.out).toBe('r1 classified=5 build=1 requirement=1 partly=2 disputed=1 kappa=0.71 raw=0.80 ac1=0.70')
  expect(jsonAt(join(d, 'r1/labels.json'))).toEqual({ [id(1)]: 'build', [id(2)]: 'requirement' })
  const s = await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate })))
  expect(s.code).toBe(0)
  expect(s.out).toBe('r1 split partly=2 split=1 failed=1 stale=0 new=2 classified=2 build=1 requirement=1 disputed=0')
  expect(vcalls).toEqual([[task, 'r1']])
  const splits = calls.filter((a) => a[1].startsWith('split-'))
  expect(splits.map((a) => a[1])).toEqual([`split-r1-${id(3)}`, `split-r1-${id(5)}`].map((x) => x.toLowerCase())) // an agent label is lower case
  for (const sp of splits) expect(readFileSync(argOf(sp, '--prompt'), 'utf8')).toContain(`\`${id(10)}\``) // the failed split left no id in an oracle
  expect(jsonAt(join(d, 'r1/work', `split-${id(3)}`, 'split.reply.md.run.json')).ids).toEqual([id(10), id(11)])
  const work = join(d, 'r1/work', `split-${id(3)}`), prompt = readFileSync(argOf(splits[0], '--prompt'), 'utf8')
  expect(jsonAt(argOf(splits[0], '--settings')).permissions.allow).toEqual([`Read(/${work}/**)`, `Edit(/${join(work, 'out')}/**)`])
  expect(prompt).toStartWith('SPLIT-BRIEF\n')
  expect(prompt).toContain('RE-RULES')
  expect(ls(join(work, 'in'))).toEqual([`${id(3)}.spec.ts`, 'entry.json', 'input.md', 'interface.md'])
  expect(Object.keys(jsonAt(join(work, 'in/entry.json'))).sort()).toEqual(['behaviour', 'id', 'interface', 'severity'])
  const byId = new Map(jsonAt(join(d, 'r1/oracle/manifest.json')).map((x) => [x.id, x]))
  expect(byId.get(id(5))).toMatchObject({ dropped: true, split_into: [id(10), id(11)] })
  expect(byId.get(id(3)).dropped).toBeUndefined()
  expect(byId.get(id(10))).toMatchObject({ fix_commit: FIX, task: 'r1', hunk: 'src/a.ts:3', origin: 'SENTINEL-ORIGIN.spec.ts::t', interface: 'browser', severity: 'medium' })
  expect(existsSync(join(d, 'r1/oracle', `${id(11)}.spec.ts`))).toBe(true)
  // the new checks are classified alone: partly again -> requirement; the unsplittable partly -> requirement; disputed stays out
  expect(calls.filter((a) => a[1].startsWith('classify-split'))).toHaveLength(2)
  expect(jsonAt(join(d, 'r1/work/classify-split/manifest.json')).map((x) => x.id)).toEqual([id(10), id(11)])
  expect(jsonAt(join(d, 'r1/labels.json'))).toEqual({ [id(1)]: 'build', [id(2)]: 'requirement', [id(3)]: 'requirement', [id(10)]: 'build', [id(11)]: 'requirement' })
  expect(jsonAt(join(d, 'r1/agreement.json'))).toMatchObject({ disputed: [id(4)], split: { checks: 2, disputed: [] } })
  // a rerun reuses the failed split's run with its recorded ids (not stale, though T10 and T11 now exist), leaves the
  // split check alone and validates nothing again
  const again = await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate })))
  expect(again.out).toBe(s.out.replace('split=1', 'split=0'))
  expect(vcalls).toHaveLength(1)
  expect(calls.filter((a) => a[1].startsWith('split-'))).toHaveLength(2)
})

test('split validates new checks that have no verdict and fails when validate throws', async () => {
  const d = clData('cl10'), f = FIX.slice(0, 7), id = (n) => `${f}-T${n}`, calls = []
  const spec = (n) => ({ [`${id(n)}.spec.ts`]: "import { test } from '@playwright/test'\n" })
  clTask(d, 'r1', FIX, [[id(1), 'valid']], spec(1))
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low' }))), ...spec(2), ...spec(3) })
  const agent = fake(calls, { rate: () => 'partly', split }), task = join(d, 'env/r.json')
  await withData(d, () => quiet(() => oracle(['classify', task, 'r1'], { agent })))
  const bad = async () => { throw new Error('grade died\nSENTINEL-DETAIL') }
  const s = await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate: bad })))
  expect(s).toEqual({ code: 1, out: 'r1 split validate failed (grade died); the new checks are not classified' })
  expect(calls.filter((a) => a[1].startsWith('classify-split'))).toHaveLength(0)
  // the rerun splits nothing again but validates the checks still without a verdict, then classifies them
  const vcalls = []
  const validate = async (a) => { vcalls.push(a); const v = join(d, 'r1', `validation-${f}.json`), x = jsonAt(v); writeFileSync(v, JSON.stringify({ ...x, checks: [...x.checks, { id: id(2), verdict: 'valid' }, { id: id(3), verdict: 'valid' }] })); return 0 }
  const again = await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate })))
  expect(again).toEqual({ code: 0, out: 'r1 split partly=1 split=0 failed=0 stale=0 new=2 classified=2 build=0 requirement=2 disputed=0' })
  expect(vcalls).toEqual([[task, 'r1']])
  expect(await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate: async () => 4 })))).toMatchObject({ code: 0 }) // all validated: not called
  expect(calls.filter((a) => a[1].startsWith('split-'))).toHaveLength(1)
})

test('split validates through the validate command by default', async () => {
  const d = clData('cl11'), e = END.slice(0, 7), id = (n) => `${e}-T${n}`, calls = [], gcalls = []
  writeFileSync(join(d, 'ext/sample.tsv'), `task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\t${'b'.repeat(40)}\t${END}\n`)
  clTask(d, 'x1-01', END, [[id(1), 'valid', { file: `${id(1)}.ts` }]], { [`${id(1)}.ts`]: 'x\n' })
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low' }))), [`${ids[0]}.ts`]: 'x\n', [`${ids[1]}.ts`]: 'x\n' })
  const agent = fake(calls, { rate: () => 'partly', split })
  const grade = async (a) => { // every check of the oracle is valid at the end
    gcalls.push(a)
    const ids = jsonAt(join(a[1], 'manifest.json')).filter((m) => !m.dropped).map((m) => m.id)
    writeFileSync(join(a[1], '..', `validation-${a[a.indexOf('--validate') + 1].slice(0, 7)}.json`), JSON.stringify({ ref: END, checks: ids.map((x) => ({ id: x, verdict: 'valid' })) }))
    return 0
  }
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent, grade })))
  const s = await withData(d, () => quiet(() => oracle(['split', 'x1-01'], { agent, grade })))
  expect(s.code).toBe(0)
  expect(s.out.split('\n').at(-1)).toBe('x1-01 split partly=1 split=1 failed=0 stale=0 new=2 classified=2 build=0 requirement=2 disputed=0')
  expect(gcalls).toHaveLength(1)
  expect(argOf(gcalls[0], '--validate')).toBe(END)
})

test('split puts the new checks of a grouped external file into that file', async () => {
  const d = clData('cl7'), e = END.slice(0, 7), id = (n) => `${e}-T${n}`, calls = [], vcalls = []
  clTask(d, 'x1-01', END, [[id(1), 'valid', { file: 'checks/group.ts', interface: 'cli' }], [id(2), 'valid', { file: 'checks/group.ts', interface: 'cli' }]], { 'checks/group.ts': 'OLD\n', 'runner.json': '{"run":"SENTINEL-RUN"}' })
  const rate = (r, x) => (x === id(1) ? 'partly' : 'traceable')
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low', file: 'checks/group.ts' }))) })
  const agent = async (args, opts) => { // the splitter rewrites the grouped file in out/
    if (args[1].startsWith('split-')) { mkdirSync(join(argOf(args, '--out'), '..', 'out/checks'), { recursive: true }); writeFileSync(join(argOf(args, '--out'), '..', 'out/checks/group.ts'), 'NEW\n') }
    return fake(calls, { rate, split })(args, opts)
  }
  const validate = async (a) => { vcalls.push(a); const v = join(d, 'x1-01', `validation-${e}.json`), x = jsonAt(v); writeFileSync(v, JSON.stringify({ ...x, checks: [...x.checks, { id: id(3), verdict: 'absent-at-base' }, { id: id(4), verdict: 'weak' }] })); return 0 }
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent })))
  const s = await withData(d, () => quiet(() => oracle(['split', 'x1-01'], { agent, validate })))
  expect(s.out).toBe('x1-01 split partly=1 split=1 failed=0 stale=0 new=2 classified=1 build=1 requirement=0 disputed=0') // the weak half is not classified
  expect(vcalls).toEqual([['x1-01']])
  const sp = calls.find((a) => a[1].startsWith('split-')), prompt = readFileSync(argOf(sp, '--prompt'), 'utf8')
  expect(prompt).toContain('EXT-RULES')
  expect(prompt).toContain('SENTINEL-RUN')
  expect(jsonAt(join(d, 'x1-01/work', `split-${id(1)}`, 'in/entry.json')).file).toBe('checks/group.ts')
  expect(readFileSync(join(d, 'x1-01/oracle/checks/group.ts'), 'utf8')).toBe('NEW\n')
  expect(jsonAt(join(d, 'x1-01/oracle/manifest.json')).slice(2).map((m) => [m.id, m.file, m.fix_commit, m.interface])).toEqual([[id(3), 'checks/group.ts', END, 'cli'], [id(4), 'checks/group.ts', END, 'cli']])
})

test('queue picks by seed and prints only counts', async () => {
  const d = clData('cl4'), calls = [], e = END.slice(0, 7), f = FIX.slice(0, 7), g = '7654321'
  const many = (p, k) => Array.from({ length: k }, (_, i) => [`${p}-T${i + 1}`, i % 2 ? 'absent-at-base' : 'valid'])
  const files = (rows) => Object.fromEntries(rows.map(([id]) => [`${id}.ts`, 'SENTINEL-CHECK\n']))
  const re = many(f, 14), x1 = many(e, 12), x2 = [...many(g, 3), [`${g}-T9`, 'broken']]
  clTask(d, 'r1', FIX, re, files(re))
  clTask(d, 'x1-01', END, x1, files(x1))
  clTask(d, 'x2-01', g.padEnd(40, '0'), x2, files(x2))
  const rate = (r, id) => (id.endsWith('-T2') && r === 2 ? 'partly' : id.endsWith('-T3') ? 'not traceable' : id.endsWith('-T4') ? 'partly' : 'traceable')
  for (const a of [[join(d, 'env/r.json'), 'r1'], ['x1-01'], ['x2-01']]) expect((await withData(d, () => quiet(() => oracle(['classify', ...a], { agent: fake(calls, { rate }) })))).code).toBe(0)
  // an agreed partly that a rule made requirement (a failed split) is no agreed classification for 7.2
  writeFileSync(join(d, 'r1/labels.json'), JSON.stringify({ ...jsonAt(join(d, 'r1/labels.json')), [`${f}-T4`]: 'requirement' }))
  const q = await withData(d, () => quiet(() => oracle(['queue'])))
  expect(q.code).toBe(0)
  expect(q.out.split('\n')).toEqual([
    'queue: labels 1, classify 3, sample-7.1 23, sample-7.2 24, inputs 3',
    'task-repo: tasks 1, checks 14, kappa=0.77 raw=0.93 ac1=0.92 usable yes',
    'external: tasks 2, checks 15, kappa=0.69 raw=0.87 ac1=0.83 usable yes',
  ])
  expect(q.out).not.toContain('SENTINEL')
  const tsv = (n) => readFileSync(join(d, 'step9', n), 'utf8').trim().split('\n').map((l) => l.split('\t'))
  expect(tsv('labels.tsv')).toEqual([['commit', 'task', 'kind'], ['aaaaaaa', 'r1', 'later']])
  expect(tsv('classify.tsv').slice(1)).toEqual([['r1', `${f}-T2`], ['x1-01', `${e}-T2`], ['x2-01', `${g}-T2`]])
  const s71 = tsv('sample-7.1.tsv').slice(1), ids = (rows) => rows.map((r) => r[0])
  expect(s71.filter((r) => r[0] === 'task-repo').map((r) => r[2])).toEqual(queuePick(ids(re), 10, SEED))
  expect(s71.filter((r) => r[0] === 'x1').map((r) => r[2])).toEqual(queuePick(ids(x1), 10, SEED))
  expect(s71.filter((r) => r[0] === 'x2').map((r) => r[2])).toEqual(queuePick(ids(x2.slice(0, 3)), 10, SEED)) // not the broken check
  const s72 = tsv('sample-7.2.tsv').slice(1)
  expect(s72.filter((r) => r[0] === 'task-repo').map((r) => r[2])).toEqual(queuePick(ids(re).filter((id) => !/-T[24]$/.test(id)), 20, SEED))
  expect(s72.filter((r) => r[0] === 'external').map((r) => r[2])).toEqual(queuePick([...ids(x1), ...ids(x2.slice(0, 3))].filter((id) => !/-T[24]$/.test(id)), 20, SEED))
  expect(tsv('inputs.tsv').slice(1)).toEqual([['task-repo', 'r1'], ...queuePick(['x1-01', 'x2-01'], 2, SEED).map((t) => ['external', t])])
})

test('queue exits 3 on a set that is not usable', async () => {
  const d = clData('cl5'), calls = [], e = END.slice(0, 7)
  const rows = Array.from({ length: 9 }, (_, i) => [`${e}-T${i + 1}`, 'valid'])
  clTask(d, 'x1-01', END, rows, Object.fromEntries(rows.map(([id]) => [`${id}.ts`, 'x\n'])))
  const rate = (r, id) => CLASSES[(Number(id.split('-T')[1]) + r) % 3] // the raters agree on no check
  expect((await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))).code).toBe(0)
  const q = await withData(d, () => quiet(() => oracle(['queue'])))
  expect(q.code).toBe(3)
  expect(q.out.split('\n').slice(-2)).toEqual(['external: tasks 1, checks 9, kappa=-0.50 raw=0.00 ac1=-0.50 usable no', 'stop: external not usable'])
})
