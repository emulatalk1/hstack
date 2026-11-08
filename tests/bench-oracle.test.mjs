import { test, expect, afterAll, spyOn } from 'bun:test'
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hunkOwners, agreement, usable, mergeLabels, introducer, oracleSha, queuePick, f2pOf, nextNumber, caseId, changedRanges, inChanged, applyEdit, EDGES } from '../bench/lib/oracle.mjs'
import { diffHunks, oracle, seedRepo, seedCommit, highestOf } from '../bench/oracle.mjs'
import { loadTask } from '../bench/lib/task.mjs'
import { unscored } from '../bench/lib/score.mjs'
import { oracleFiles } from '../bench/grade.mjs'
const O8 = (dir) => oracleSha(oracleFiles(dir)).slice(0, 8) // the oracle a readiness line names (step 11 ruling 7)
import { check } from '../bench/input-check.mjs'
import { taskOf } from '../bench/ext.mjs'

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
test('diffHunks reads --- and +++ as headers only between diff --git and the file\'s first @@', () => {
  const diff = ['diff --git a/src/q.sql b/src/q.sql', 'index 1111111..2222222 100644', '--- a/src/q.sql', '+++ b/src/q.sql',
    '@@ -3 +3 @@', '--- a comment line', '+++ b new line', '@@ -9,2 +8,0 @@', '-x', '-y',
    'diff --git a/src/gone.txt b/src/gone.txt', 'deleted file mode 100644', 'index 3333333..0000000', '--- a/src/gone.txt', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye', ''].join('\n')
  expect(diffHunks(diff)).toEqual([{ file: 'src/q.sql', old: 3 }, { file: 'src/q.sql', old: 9 }, { file: 'src/gone.txt', old: 1 }])
})

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
    writeFileSync(join(ev, 'grades', `${c.slice(0, 7)}.json`), JSON.stringify({ commit: c, junit: 'ok', checks: list.map((m) => ({ id: m.id, result: table(c, m.id, o) })) }))
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
  expect(r.out).toContain('s9-01: checks 2, valid 2, weak 0, broken 0, error 0, pre-existing 0, absent-at-base 0, interface none 1, fixer rounds 0, changed 0, kept 0, comparer changed 0, gate refused 0, out of scope 0')
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
  expect(r.out).toContain('t1: checks 1, valid 0, weak 0, broken 1, error 0, pre-existing 0, absent-at-base 0, interface none 0, fixer rounds 2, changed 2, kept 0, comparer changed 2, gate refused 0, out of scope 0')
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
  expect(r.out).toContain('t1: checks 3, valid 3, weak 0, broken 0, error 0, pre-existing 0, absent-at-base 0, interface none 0, fixer rounds 1, changed 5, kept 2, comparer changed 0, gate refused 0, out of scope 3') // k1's copy: a, b, c; m1's: b, c
  expect(r.out).not.toContain('SENTINEL')
})

test('a fixed file the comparer calls same is still refused when it fails the writer\'s gates', async () => {
  // task repo: a, b and c broken; a's fix imports a module the rules do not allow, b's names the fix hash, c's is clean
  const a = `${k1}-T1`, b = `${k1}-T2`, c = `${k1}-T3`
  const o = freshTask('t1', [entryAt(a, k1Full), entryAt(b, k1Full), entryAt(c, k1Full)], { [`${a}.spec.ts`]: 'A\n', [`${b}.spec.ts`]: 'B\n', [`${c}.spec.ts`]: 'C\n' })
  const edit = (f) => (f.startsWith(a) ? "import x from 'other-lib'\n" : f.startsWith(b) ? `// ${k1Full.slice(0, 9)}\n` : "import { test } from 'runner-lib'\n")
  const r = await quiet(() => oracle(['validate', task, 't1'], { grade: fakeGrade(() => 'broken', []), agent: fakeAgents({ edit }) }))
  expect(readFileSync(join(o, `${a}.spec.ts`), 'utf8')).toBe('A\n')
  expect(readFileSync(join(o, `${b}.spec.ts`), 'utf8')).toBe('B\n')
  expect(readFileSync(join(o, `${c}.spec.ts`), 'utf8')).toBe("import { test } from 'runner-lib'\n")
  expect(r.out).toContain('fixer rounds 2, changed 5, kept 1, comparer changed 0, gate refused 4, out of scope 0') // round 2: a and b again
  // external: runner.json must still parse with a RUN-only layer, and no file may name an origin's path
  extSample()
  const s = k3Full.slice(0, 7), eo = extOracle(s)
  writeFileSync(join(eo, 'runner.json'), JSON.stringify({ layer: ['RUN true'], run: 'run' }))
  const agent = async (args) => {
    const label = args[1], out = flagOf(args, '--out')
    if (label.startsWith('fix-')) {
      const dir = JSON.parse(readFileSync(flagOf(args, '--settings'), 'utf8')).permissions.additionalDirectories[0]
      writeFileSync(join(dir, 'runner.json'), JSON.stringify({ layer: ['COPY . /x'], run: 'run' }))
      writeFileSync(join(dir, 'checks/group.ts'), '// see src/x.spec.ts\n')
    } else writeFileSync(out, JSON.stringify([`${s}-T1`, `${s}-T2`, 'runner.json'].map((id) => ({ id, verdict: 'same' }))))
    writeFileSync(`${out}.run.json`, '{"code":0}')
    return 0
  }
  const x = await quiet(() => oracle(['validate', 's9-01'], { grade: fakeGrade(() => 'broken', []), agent }))
  expect(readFileSync(join(eo, 'checks/group.ts'), 'utf8')).toBe('BEFORE\n')
  expect(JSON.parse(readFileSync(join(eo, 'runner.json'), 'utf8')).layer).toEqual(['RUN true'])
  expect(x.out).toContain('kept 0, comparer changed 0, gate refused 4, out of scope 0')
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

test('an external run that never got ready gives error, is not judged, and its grade file is not reused', async () => {
  const ext = extSample(), s = k3Full.slice(0, 7), b = k1Full.slice(0, 7), ev = join(data, 's9-01'), agents = []
  extOracle(s)
  mkdirSync(join(ev, 'build'), { recursive: true })
  // oracle-run appends a line a run: the base's last run got ready, the end's did not; another oracle's lines do not count
  const o8 = O8(join(ev, 'oracle'))
  writeFileSync(join(ev, 'build/readiness.tsv'), `${b}\t${o8}\tnot ready\n${s}\t${o8}\tready\n${s}\t${o8}\tnot ready\n${b}\t${o8}\tready\n${s}\t99999999\tready\n${b}\t99999999\tnot ready\n`)
  // as grade would: an empty JUnit gives broken; each run leaves its grade file
  const inner = fakeGrade(() => 'broken', [])
  const grade = async (args) => { mkdirSync(join(ev, 'grades'), { recursive: true }); for (const x of [s, b]) writeFileSync(join(ev, 'grades', `${x}.json`), '{}'); return inner(args) }
  const r = await quiet(() => oracle(['validate', 's9-01'], { grade, agent: fakeAgents({}, agents) }))
  expect(r.code).toBe(0)
  expect(agents).toHaveLength(0) // error is not broken: no fixer
  const v = JSON.parse(readFileSync(join(ev, `validation-${s}.json`), 'utf8'))
  expect(v.stage).toBe(`not ready at ${s}`)
  expect(v.checks.map((x) => [x.id, x.verdict, x.stage])).toEqual([1, 2].map((n) => [`${s}-T${n}`, 'error', `not ready at ${s}`]))
  expect(existsSync(join(ev, 'grades', `${s}.json`))).toBe(false)
  expect(existsSync(join(ev, 'grades', `${b}.json`))).toBe(true)
  expect(r.out).toContain(`validation-${s} (not ready at ${s}): error 2`)
  expect(r.out).toContain('s9-01: checks 2, valid 0, weak 0, broken 0, error 2,')
  expect(r.out).toContain('s9-01 not judged: 2 checks error')
  expect(r.out).not.toContain('dropped')
  expect(existsSync(join(ext, 'walk.tsv'))).toBe(false)
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
  const r = Number(args[1].match(/^classify(?:-split\d*)?(?:-b2(?:-n\d+)?)?-(\d)-/)[1])
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

test('classify gives the raters only the id, behaviour, interface, severity and file of each manifest entry', async () => {
  const d = clData('cl1'), e = END.slice(0, 7), calls = []
  clTask(d, 'x1-01', END, [[`${e}-T1`, 'valid', { file: 'checks/group.ts', leak: 'SENTINEL-LEAK' }], [`${e}-T2`, 'absent-at-base', { file: 'checks/group.ts' }], [`${e}-T3`, 'broken', { file: `${e}-T3.ts` }],
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
  for (const m of shown) for (const k of Object.keys(m)) expect(['id', 'behaviour', 'interface', 'severity', 'file']).toContain(k) // an unknown field too
  expect(readFileSync(join(folder, 'manifest.json'), 'utf8')).not.toContain('SENTINEL-LEAK')
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
  clTask(d, 'r1', FIX, [1, 2, 3, 4, 5].map((n) => [id(n), 'valid', { leak: 'SENTINEL-LEAK' }]), Object.assign({}, ...[1, 2, 3, 4, 5].map(spec)))
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
  expect(s.out).toBe('r1 split partly=2 split=1 failed=1 restored=0 settled=0 stale=0 new=2 classified=2 build=1 requirement=1 disputed=0')
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
  expect(again.out).toBe(s.out.replace('split=1', 'split=0').replace('classified=2 build=1 requirement=1', 'classified=0 build=0 requirement=0')) // nothing new to classify
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
  expect(again).toEqual({ code: 0, out: 'r1 split partly=1 split=0 failed=0 restored=0 settled=0 stale=0 new=2 classified=2 build=0 requirement=2 disputed=0' })
  expect(vcalls).toEqual([[task, 'r1']])
  expect(await withData(d, () => quiet(() => oracle(['split', task, 'r1'], { agent, validate: async () => 4 })))).toMatchObject({ code: 0 }) // all validated: not called
  expect(calls.filter((a) => a[1].startsWith('split-'))).toHaveLength(1)
})

test('a split none of whose new checks is scored restores the original as requirement, through validate and grade', async () => {
  const d = clData('cl13'), e = END.slice(0, 7), id = (n) => `${e}-T${n}`, calls = [], gcalls = []
  writeFileSync(join(d, 'ext/sample.tsv'), `task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\t${'b'.repeat(40)}\t${END}\n`)
  for (const b of ['fix.md', 'compare.md']) writeFileSync(join(d, 'briefs', b), 'BRIEF\n')
  clTask(d, 'x1-01', END, [[id(1), 'valid', { file: `${id(1)}.ts` }], [id(2), 'valid', { file: `${id(2)}.ts` }]], { [`${id(1)}.ts`]: 'x\n', [`${id(2)}.ts`]: 'x\n', 'runner.json': '{"layer":[],"run":"r"}' })
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low' }))), [`${ids[0]}.ts`]: 'x\n', [`${ids[1]}.ts`]: 'x\n' })
  const base = fake(calls, { rate: () => 'partly', split })
  const agent = async (args, opts) => { // a fixer changes nothing, so no comparer runs
    if (/^(fix|compare)-/.test(args[1])) { calls.push(args); writeFileSync(`${argOf(args, '--out')}.run.json`, '{"code":0}'); writeFileSync(argOf(args, '--out'), 'done'); return 0 }
    return base(args, opts)
  }
  // grade --validate: the verdict of each check of the oracle as it is (dropped entries are not graded); an original is valid
  let verdicts = {}
  const grade = async (a) => {
    gcalls.push(a)
    const live = jsonAt(join(a[1], 'manifest.json')).filter((m) => !m.dropped).map((m) => m.id)
    writeFileSync(join(a[1], '..', `validation-${e}.json`), JSON.stringify({ ref: END, checks: live.map((x) => ({ id: x, verdict: verdicts[x] ?? 'valid' })) }))
    return 0
  }
  const go = () => withData(d, () => quiet(() => oracle(['split', 'x1-01'], { agent, grade })))
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent })))
  // T1 -> T3 broken, T4 weak: no scored half, restored. T2 -> T5 error, T6 broken: not judged, neither restored nor decided
  verdicts = { [id(3)]: 'broken', [id(4)]: 'weak', [id(5)]: 'error', [id(6)]: 'broken' }
  const s = await go()
  expect(s.out.split('\n').at(-1)).toBe('x1-01 split partly=2 split=2 failed=0 restored=1 settled=1 stale=0 new=2 classified=0 build=0 requirement=0 disputed=0')
  // the broken new checks had 2 fixer rounds of their own (label fix-split-<round>); the original was graded again
  expect(calls.filter((a) => a[1].startsWith('fix-')).map((a) => a[1])).toEqual([`fix-split-1-x1-01-${e}`, `fix-split-2-x1-01-${e}`])
  expect(existsSync(join(d, 'x1-01/work/fix-split-1'))).toBe(true)
  expect(gcalls).toHaveLength(2)
  const byId = () => new Map(jsonAt(join(d, 'x1-01/oracle/manifest.json')).map((x) => [x.id, x]))
  expect(byId().get(id(1))).toMatchObject({ restored_from_split: [id(3), id(4)] })
  for (const n of [3, 4]) expect(existsSync(join(d, 'x1-01/oracle', `${id(n)}.ts`))).toBe(false) // its new checks' files left the oracle
  expect(byId().get(id(1)).dropped).toBeUndefined()
  for (const n of [3, 4]) expect(byId().get(id(n))).toMatchObject({ dropped: true, drop_reason: 'split gave no scored half' })
  expect(jsonAt(join(d, 'x1-01', `validation-${e}.json`)).checks.find((x) => x.id === id(1)).verdict).toBe('valid') // its own verdict again
  expect(jsonAt(join(d, 'x1-01/labels.json'))).toEqual({ [id(1)]: 'requirement' })
  expect(jsonAt(join(d, 'x1-01/agreement.json')).splitDone).toEqual([id(1)])
  // T5 now validates: T2's split stands and its scored half is classified; T1 is decided and left alone
  verdicts = { [id(5)]: 'valid', [id(6)]: 'broken' }
  const t = await go()
  expect(t.out.split('\n').at(-1)).toBe('x1-01 split partly=2 split=0 failed=0 restored=0 settled=0 stale=0 new=2 classified=1 build=0 requirement=1 disputed=0')
  expect(jsonAt(join(d, 'x1-01/agreement.json')).splitDone).toEqual([id(1), id(2)])
  // an earlier restore whose split now has a scored half is undone: the split stands and the original leaves the labels
  const a = jsonAt(join(d, 'x1-01/agreement.json'))
  writeFileSync(join(d, 'x1-01/agreement.json'), JSON.stringify({ ...a, splitDone: [id(2)] }))
  verdicts = { [id(3)]: 'absent-at-base', [id(4)]: 'weak', [id(6)]: 'broken' }
  const u = await go()
  expect(u.out.split('\n').at(-1)).toBe('x1-01 split partly=2 split=0 failed=0 restored=0 settled=0 stale=0 new=4 classified=1 build=0 requirement=1 disputed=0')
  expect(byId().get(id(1))).toMatchObject({ dropped: true, split_into: [id(3), id(4)] })
  expect(byId().get(id(1)).restored_from_split).toBeUndefined()
  for (const n of [3, 4]) expect(byId().get(id(n)).dropped).toBeUndefined()
  for (const n of [3, 4]) expect(existsSync(join(d, 'x1-01/oracle', `${id(n)}.ts`))).toBe(true) // and their files came back
  expect(jsonAt(join(d, 'x1-01/labels.json'))).toEqual({ [id(5)]: 'requirement', [id(3)]: 'requirement' })
  expect(jsonAt(join(d, 'x1-01/agreement.json')).splitRounds.map((x) => [x.name, x.ids])).toEqual([['classify-split', [id(5)]], ['classify-split2', [id(3)]]])
})

test('restoring a split of a shared file puts the file back as it was before the split', async () => {
  const d = clData('cl14'), e = END.slice(0, 7), id = (n) => `${e}-T${n}`, calls = []
  writeFileSync(join(d, 'ext/sample.tsv'), `task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\nx1-01\tx1\t1\t1\town/rp#7\tu\t7\t6\t${'b'.repeat(40)}\t${END}\n`)
  for (const b of ['fix.md', 'compare.md']) writeFileSync(join(d, 'briefs', b), 'BRIEF\n')
  clTask(d, 'x1-01', END, [[id(1), 'valid', { file: 'checks/group.ts' }], [id(2), 'valid', { file: 'checks/group.ts' }]], { 'checks/group.ts': 'OLD\n', 'runner.json': '{"layer":[],"run":"r"}' })
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low', file: 'checks/group.ts' }))) })
  const base = fake(calls, { rate: (r, x) => (x === id(1) ? 'partly' : 'traceable'), split })
  const agent = async (args, opts) => {
    if (/^(fix|compare)-/.test(args[1])) { writeFileSync(`${argOf(args, '--out')}.run.json`, '{"code":0}'); writeFileSync(argOf(args, '--out'), 'done'); return 0 }
    if (args[1].startsWith('split-')) { mkdirSync(join(argOf(args, '--out'), '..', 'out/checks'), { recursive: true }); writeFileSync(join(argOf(args, '--out'), '..', 'out/checks/group.ts'), 'NEW\n') }
    return base(args, opts)
  }
  // the halves never build: the grade reads the shared file, and an original is valid only in the file as it was
  const grade = async (a) => {
    const live = jsonAt(join(a[1], 'manifest.json')).filter((m) => !m.dropped).map((m) => m.id), old = readFileSync(join(a[1], 'checks/group.ts'), 'utf8') === 'OLD\n'
    writeFileSync(join(a[1], '..', `validation-${e}.json`), JSON.stringify({ ref: END, checks: live.map((x) => ({ id: x, verdict: [id(3), id(4)].includes(x) ? 'broken' : old ? 'valid' : 'broken' })) }))
    return 0
  }
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent })))
  const s = await withData(d, () => quiet(() => oracle(['split', 'x1-01'], { agent, grade })))
  expect(s.out.split('\n').at(-1)).toBe('x1-01 split partly=1 split=1 failed=0 restored=1 settled=1 stale=0 new=0 classified=0 build=0 requirement=0 disputed=0')
  expect(readFileSync(join(d, 'x1-01/oracle/checks/group.ts'), 'utf8')).toBe('OLD\n')
  const v = new Map(jsonAt(join(d, 'x1-01', `validation-${e}.json`)).checks.map((x) => [x.id, x.verdict]))
  expect([v.get(id(1)), v.get(id(2))]).toEqual(['valid', 'valid'])
  expect(jsonAt(join(d, 'x1-01/labels.json'))).toEqual({ [id(2)]: 'build', [id(1)]: 'requirement' })
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
  expect(s.out.split('\n').at(-1)).toBe('x1-01 split partly=1 split=1 failed=0 restored=0 settled=0 stale=0 new=2 classified=2 build=0 requirement=2 disputed=0')
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
  expect(s.out).toBe('x1-01 split partly=1 split=1 failed=0 restored=0 settled=0 stale=0 new=2 classified=1 build=1 requirement=0 disputed=0') // the weak half is not classified
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

// --- step 6 task 2: the fail-to-pass matcher, id numbering over step oracles, the score command ---
test('f2pOf matches parametrised and qualified names and asks when a segment is in both lists', () => {
  const cid = (c) => caseId(c)
  expect(cid({ classname: 'a.B', name: 'works' })).toBe('a.B::works')
  expect(cid('x::y')).toBe('x::y')
  // exact: a case id, a case's name part, or a case id ending with ::name or .name
  expect(f2pOf('t.spec.ts::adds up', ['t.spec.ts::adds up'], [])).toEqual({ verdict: 'f2p', by: 'exact' })
  expect(f2pOf('t.py::TestA::test_x', ['TestA::test_x'], [])).toEqual({ verdict: 'f2p', by: 'exact' })
  expect(f2pOf('t.py::test_x', ['mod.Cls::test_x'], ['mod.Cls::test_y'])).toEqual({ verdict: 'f2p', by: 'exact' })
  expect(f2pOf('t.go::TestX', ['pkg.TestX'], [])).toEqual({ verdict: 'f2p', by: 'exact' })
  expect(f2pOf('t.go::TestY', [], ['pkg.TestY'])).toEqual({ verdict: 'p2p', by: 'exact' })
  expect(f2pOf('t.py::test_x', ['m::test_x'], ['n::test_x'])).toEqual({ verdict: 'ask', by: null }) // exact in both lists
  // segment: a parametrised id against the bare name
  expect(f2pOf('t.py::test_x', ['t.py::test_x[param]'], ['t.py::test_y[p]'])).toEqual({ verdict: 'f2p', by: 'segment' })
  expect(f2pOf('t.py::test_y', ['t.py::test_x[param]'], ['t.py::test_y[p]'])).toEqual({ verdict: 'p2p', by: 'segment' })
  // a Jest name with ' › ' and a Java-style (…) tail
  expect(f2pOf('a.test.ts::suite › renders', ['a.test.ts::root › suite › renders (2)'], [])).toEqual({ verdict: 'f2p', by: 'segment' })
  expect(f2pOf('A.java::run', ['A.run(int)'], [])).toEqual({ verdict: 'f2p', by: 'segment' })
  // a segment in both lists, or in neither
  expect(f2pOf('t.py::test_x', ['a::test_x[1]'], ['b::test_x[2]'])).toEqual({ verdict: 'ask', by: null })
  expect(f2pOf('t.py::test_z', ['a::test_x'], ['b::test_y'])).toEqual({ verdict: 'ask', by: null })
})

test('nextNumber counts both oracle and step oracle manifests', async () => {
  expect(nextNumber(['abc1234-T1', 'abc1234-T12', 'abc1234-T3', 'def5678-T40', 'abc1234-Tx', 'abc12345-T99'], 'abc1234')).toBe(12)
  expect(nextNumber([], 'abc1234')).toBe(0)
  // highestOf reads <task>/oracle and <task>/step/oracle manifests, dropped entries too: a split numbers after both
  const d = clData('sc0'), e = END.slice(0, 7)
  clTask(d, 'x2-01', END, [[`${e}-T3`, 'valid']], {})
  mkdirSync(join(d, 'x2-01/step/oracle'), { recursive: true })
  writeFileSync(join(d, 'x2-01/step/oracle/manifest.json'), JSON.stringify([{ id: `${e}-T7`, dropped: true }]))
  const calls = []
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((x) => ({ id: x, behaviour: 'b', severity: 'low', file: `${x}.ts` }))), ...Object.fromEntries(ids.map((x) => [`${x}.ts`, 'N\n'])) })
  clTask(d, 'x1-01', END, [[`${e}-T4`, 'valid', { severity: 'high' }]], { [`${e}-T4.ts`]: 'x\n' })
  const rate = (r, id) => (id.endsWith('-T4') ? 'partly' : 'traceable')
  await withData(d, () => quiet(() => oracle(['classify', 'x1-01'], { agent: fake(calls, { rate }) })))
  await withData(d, () => quiet(() => oracle(['split', 'x1-01'], { agent: fake(calls, { rate, split }), validate: async () => 0 })))
  const ids = jsonAt(join(d, 'x1-01/oracle/manifest.json')).map((m) => m.id)
  expect(ids).toEqual([`${e}-T4`, `${e}-T8`, `${e}-T9`])
})

const scoreData = (name, step, grades) => {
  const d = clData(name)
  mkdirSync(join(d, 'x1-01/grades'), { recursive: true })
  if (step) writeFileSync(join(d, 'x1-01/step.json'), JSON.stringify(step))
  for (const [f, g] of Object.entries(grades)) { mkdirSync(join(d, f, '..'), { recursive: true }); writeFileSync(join(d, f), JSON.stringify(g)) }
  return d
}
const gr = (checks, excluded = []) => ({ checks: checks.map(([id, result, severity = 'high', bucket = 'build']) => ({ id, bucket, severity, result })), excluded })

test('score prints only the counts line', async () => {
  const sha = 'abcdef1234567890'
  const d = scoreData('sc1', { oracle: 'step/oracle', ids: ['s-T1', 's-T2'], candidates: 2, seed: 's' }, {
    [`x1-01/grades/abcdef1.json`]: gr([['a-T1', 'pass'], ['a-T2', 'fail', 'low', 'out'], ['a-T3', 'pass', 'medium', 'requirement'], ['a-T4', 'pass', 'high', 'build']], [{ id: 'a-T4', verdict: 'weak' }]),
    [`x1-01/step/grades/abcdef1.json`]: gr([['s-T1', 'pass', 'high'], ['s-T2', 'fail', 'low']]),
  })
  const r = await withData(d, () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 abcdef1 build=0.75 requirement=0.83 passed=yes') // a-T4 is excluded: (3 + 2) / (3 + 1 + 2)
})

test('score reads the ids from the fix grade when step.json names oracle, and exits 1 on a missing file', async () => {
  const sha = 'abcdef1234567890'
  const d = scoreData('sc2', { oracle: 'oracle', ids: ['a-T1', 'a-T2'], candidates: 2, seed: 's' }, { 'x1-01/grades/abcdef1.json': gr([['a-T1', 'pass', 'high'], ['a-T2', 'fail', 'medium']]) })
  const r = await withData(d, () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect(r.out).toBe('x1-01 abcdef1 build=0.60 requirement=0.60 passed=no')
  expect(r.code).toBe(0)
  const none = await withData(d, () => quiet(() => oracle(['score', 'x1-01', 'abcdef2'])))
  expect(none.code).toBe(1)
  expect(none.out).toContain('x1-01/grades/abcdef2.json')
  const d2 = scoreData('sc3', { oracle: 'step/oracle', ids: ['s-T1'], candidates: 1, seed: 's' }, { 'x1-01/grades/abcdef1.json': gr([]) })
  const m = await withData(d2, () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect(m.code).toBe(1)
  expect(m.out).toContain('step/grades/abcdef1.json')
  const m2 = await withData(clData('sc4'), () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect(m2.code).toBe(1)
  expect(m2.out).toContain('x1-01/step.json')
  await expect(withData(d, () => oracle(['score', 'x1-01', 'XYZ']))).rejects.toThrow('usage')
})

test('score of a task whose step oracle has no id needs no step grade', async () => {
  const d = scoreData('sc5', { oracle: 'step/oracle', ids: [], candidates: 0, seed: 's' }, { 'x1-01/grades/abcdef1.json': gr([['a-T1', 'pass', 'high'], ['a-T2', 'fail', 'low']]) })
  const r = await withData(d, () => quiet(() => oracle(['score', 'x1-01', 'abcdef1234567890'])))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 abcdef1 build=none requirement=0.75 passed=none')
})

test('score refuses a step.json it cannot read and an id missing from its grade', async () => {
  const sha = 'abcdef1234567890', g = { 'x1-01/grades/abcdef1.json': gr([['a-T1', 'pass']]) }
  for (const [name, step] of [['sc6', { oracle: 'elsewhere', ids: [] }], ['sc7', { oracle: 'oracle', ids: 'a-T1' }], ['sc8', { oracle: 'oracle' }]]) {
    const r = await withData(scoreData(name, step, g), () => quiet(() => oracle(['score', 'x1-01', sha])))
    expect(r.code).toBe(1)
    expect(r.out.trim().split('\n')).toHaveLength(1)
    expect(r.out).toContain('x1-01 score abcdef1')
  }
  // an id missing from the grade it is read from: the fix grade, or the step grade
  const a = await withData(scoreData('sc9', { oracle: 'oracle', ids: ['a-T1', 'a-T9', 'a-T8'] }, g), () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect([a.code, a.out]).toEqual([1, 'x1-01 score abcdef1: 2 step ids not in the grade'])
  const b = await withData(scoreData('sc10', { oracle: 'step/oracle', ids: ['s-T1', 'a-T1'] }, { ...g, 'x1-01/step/grades/abcdef1.json': gr([['s-T1', 'pass']]) }), () => quiet(() => oracle(['score', 'x1-01', sha])))
  expect([b.code, b.out]).toEqual([1, 'x1-01 score abcdef1: 1 step ids not in the grade'])
})

// --- step 6 task 4: an external task's step oracle (ruling 2) ---
// a task x1-01 whose rows are [id, verdict, origin name, label]; f2p.json in ext/sealed/<slug>/; the brief in ext/briefs/
const stData = (name, rows, cases) => {
  const d = clData(name), e = END.slice(0, 7)
  clTask(d, 'x1-01', END, rows.map(([n, v, o]) => [`${e}-T${n}`, v, { origin: `SENTINEL-FILE.spec.ts::${o}` }]), {})
  writeFileSync(join(d, 'x1-01/labels.json'), JSON.stringify(Object.fromEntries(rows.filter((r) => r[3]).map(([n, , , l]) => [`${e}-T${n}`, l]))))
  writeFileSync(join(d, 'ext/briefs/f2p.md'), 'F2P-BRIEF\n')
  const sealed = join(d, 'ext/sealed', taskOf(join(d, 'ext'), 'x1-01').slug)
  mkdirSync(sealed, { recursive: true })
  writeFileSync(join(sealed, 'f2p.json'), JSON.stringify(cases))
  return d
}
// a fake resolver: answers each origin of the prompt's json fence with say(origin) (undefined: left out); its record
// counts reads(label) Read calls
const resolver = (calls, say = () => 'f2p', reads = () => 1) => async (args) => {
  calls.push(args)
  const out = argOf(args, '--out'), prompt = readFileSync(argOf(args, '--prompt'), 'utf8')
  const origins = JSON.parse(prompt.match(/````json\n([\s\S]*?)\n````/)[1])
  writeFileSync(`${out}.run.json`, JSON.stringify({ code: 0, toolUses: reads(args[1]) ? { Read: reads(args[1]) } : {} }))
  writeFileSync(out, `SENTINEL-REPLY\n${JSON.stringify(origins.map((origin) => ({ origin, verdict: say(origin, args[1]) })).filter((x) => x.verdict))}`)
  return 0
}
const step = (d, calls, say, reads) => withData(d, () => quiet(() => oracle(['step', 'x1-01'], { agent: resolver(calls, say, reads) })))
const STEP_ROWS = [[1, 'valid', 'adds one', 'build'], [2, 'absent-at-base', 'keeps two', 'build'], [3, 'valid', 'SENTINEL-ASK', 'build'], [4, 'broken', 'adds one', 'build'],
  [5, 'valid', 'adds one', 'requirement'], [6, 'valid', 'renders six[x]', 'build'], [7, 'valid', 'SENTINEL-ASK', 'requirement'], [8, 'valid', 'SENTINEL-OTHER', undefined]]
const STEP_CASES = { f2p: ['SENTINEL-FILE.spec.ts::adds one', { classname: 'SENTINEL-CLS', name: 'renders six' }, 'a::SENTINEL-ASK'], p2p: ['SENTINEL-FILE.spec.ts::keeps two', 'b::SENTINEL-ASK'] }
const tree = (d) => filesIn(d).filter((f) => !f.includes('/work/')).map((f) => [f, readFileSync(f, 'utf8')])

test('external step writes only step.json, step-f2p.json and its resolver records', async () => {
  const d = stData('st1', STEP_ROWS, STEP_CASES), e = END.slice(0, 7), calls = []
  const before = new Map(tree(join(d, 'x1-01')))
  const r = await step(d, calls, () => 'p2p')
  expect(r.code).toBe(0)
  const after = tree(join(d, 'x1-01'))
  for (const [f, text] of before) expect(after.find(([g]) => g === f)?.[1]).toBe(text)
  expect(after.map(([f]) => f.slice(join(d, 'x1-01').length + 1)).filter((f) => !before.has(join(d, 'x1-01', f))).sort())
    .toEqual(['f2p.reply.md', 'f2p.reply.md.run.json', 'step-f2p.json', 'step.json'])
  expect(ls(join(d, 'x1-01/work'))).toEqual(['f2p.prompt.md'])
  expect(jsonAt(join(d, 'x1-01/step.json'))).toEqual({ oracle: 'oracle', ids: queuePick([`${e}-T1`, `${e}-T6`], 15, SEED), candidates: 2, seed: SEED })
  // every scored check of every label (T4 is broken), in manifest order
  expect(jsonAt(join(d, 'x1-01/step-f2p.json'))).toEqual([[1, 'exact', 'f2p'], [2, 'exact', 'p2p'], [3, 'resolver', 'p2p'], [5, 'exact', 'f2p'], [6, 'segment', 'f2p'], [7, 'resolver', 'p2p'], [8, 'resolver', 'p2p']]
    .map(([n, by, verdict]) => ({ id: `${e}-T${n}`, by, verdict })))
  // one resolver at the end, read only, given the brief, the ask origins and both case lists, never a check
  expect(calls).toHaveLength(1)
  const a = calls[0]
  expect(a[0]).toBe(join(d, 'env/x1-01.json'))
  expect(a[1]).toBe('f2p-x1-01')
  expect(argOf(a, '--at')).toBe('e')
  expect(argOf(a, '--tools')).toBe('Read,Glob,Grep')
  expect(a).not.toContain('--settings')
  const prompt = readFileSync(argOf(a, '--prompt'), 'utf8')
  expect(prompt).toStartWith('F2P-BRIEF\n')
  expect(JSON.parse(prompt.match(/````json\n([\s\S]*?)\n````/)[1])).toEqual(['SENTINEL-FILE.spec.ts::SENTINEL-ASK', 'SENTINEL-FILE.spec.ts::SENTINEL-OTHER'])
  for (const c of ['SENTINEL-CLS::renders six', 'b::SENTINEL-ASK', 'SENTINEL-FILE.spec.ts::keeps two']) expect(prompt).toContain(c)
  expect(prompt).not.toContain('SENTINEL-BEHAVIOUR')
  expect(prompt).not.toContain(`${e}-T`)
  expect(jsonAt(join(d, 'x1-01/f2p.reply.md.run.json')).promptSha).toHaveLength(64)
})

test('step keeps only build-labelled scored checks whose origin is f2p', async () => {
  const d = stData('st2', STEP_ROWS, STEP_CASES), e = END.slice(0, 7), calls = []
  const r = await step(d, calls, (o) => (o.endsWith('SENTINEL-ASK') ? 'f2p' : 'unknown'))
  // T3 (build, resolver f2p) joins T1 and T6; T5 and T7 are f2p but not build, T2 is p2p, T4 is not scored
  expect(r).toEqual({ code: 0, out: 'x1-01 step candidates=3 f2p=5 p2p=1 unknown=1 ids=3 resolver=ran' })
  expect(jsonAt(join(d, 'x1-01/step.json')).ids.sort()).toEqual([`${e}-T1`, `${e}-T3`, `${e}-T6`])
})

test('the resolver runs only for ask origins and unknown is out', async () => {
  // no ask: no resolver
  const d0 = stData('st3', [[1, 'valid', 'adds one', 'build'], [2, 'valid', 'keeps two', 'build']], STEP_CASES), calls = []
  expect(await step(d0, calls)).toEqual({ code: 0, out: 'x1-01 step candidates=1 f2p=1 p2p=1 unknown=0 ids=1 resolver=none' })
  expect(calls).toHaveLength(0)
  expect(existsSync(join(d0, 'x1-01/work'))).toBe(false)
  // a reply that misses an origin is run once more (-2), and the rerun stands: what it still misses, or answers out of
  // the three verdicts, is unknown and out
  const d = stData('st4', STEP_ROWS, STEP_CASES), e = END.slice(0, 7)
  const say = (o, label) => (o.endsWith('SENTINEL-ASK') ? (label.endsWith('-2') ? 'SENTINEL-BAD' : 'f2p') : undefined)
  expect((await step(d, calls, say)).out).toBe('x1-01 step candidates=2 f2p=3 p2p=1 unknown=3 ids=2 resolver=ran')
  expect(calls.map((a) => [a[1], argOf(a, '--out')])).toEqual([['f2p-x1-01', join(d, 'x1-01/f2p.reply.md')], ['f2p-x1-01-2', join(d, 'x1-01/f2p-2.reply.md')]])
  expect(jsonAt(join(d, 'x1-01/step-f2p.json')).filter((x) => x.by === 'resolver')).toEqual([3, 7, 8].map((n) => ({ id: `${e}-T${n}`, by: 'resolver', verdict: 'unknown' })))
  // a run whose record exists is reused; one whose prompt differs is refused and nothing is rewritten
  expect((await step(d, calls, say)).out).toBe('x1-01 step candidates=2 f2p=3 p2p=1 unknown=3 ids=2 resolver=reused')
  expect(calls).toHaveLength(2)
  const kept = readFileSync(join(d, 'x1-01/step.json'), 'utf8')
  writeFileSync(join(d, 'ext/briefs/f2p.md'), 'F2P-BRIEF-2\n')
  expect(await step(d, calls, say)).toEqual({ code: 1, out: 'x1-01 step refused a run whose prompt differs from the one it ran with' })
  expect(calls).toHaveLength(2)
  expect(readFileSync(join(d, 'x1-01/step.json'), 'utf8')).toBe(kept)
})

test('ids are the first 15 by seed', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => [i + 1, 'valid', 'adds one', 'build'])
  const d = stData('st5', rows, STEP_CASES), e = END.slice(0, 7), calls = []
  expect((await step(d, calls)).out).toBe('x1-01 step candidates=20 f2p=20 p2p=0 unknown=0 ids=15 resolver=none')
  expect(jsonAt(join(d, 'x1-01/step.json'))).toEqual({ oracle: 'oracle', ids: queuePick(rows.map(([n]) => `${e}-T${n}`), 15, SEED), candidates: 20, seed: SEED })
})

test('a rerun after labels.json changes reuses the resolver record and changes only ids', async () => {
  const d = stData('st6', STEP_ROWS, STEP_CASES), e = END.slice(0, 7), calls = []
  await step(d, calls, () => 'f2p')
  const f2p = readFileSync(join(d, 'x1-01/step-f2p.json'), 'utf8'), first = jsonAt(join(d, 'x1-01/step.json'))
  expect(first.ids.sort()).toEqual([`${e}-T1`, `${e}-T3`, `${e}-T6`])
  // step 9 moves T7 to build and T1 to requirement
  writeFileSync(join(d, 'x1-01/labels.json'), JSON.stringify({ ...jsonAt(join(d, 'x1-01/labels.json')), [`${e}-T7`]: 'build', [`${e}-T1`]: 'requirement' }))
  const r = await step(d, calls, () => 'p2p')
  expect(r.out).toBe('x1-01 step candidates=3 f2p=6 p2p=1 unknown=0 ids=3 resolver=reused')
  expect(calls).toHaveLength(1)
  expect(readFileSync(join(d, 'x1-01/step-f2p.json'), 'utf8')).toBe(f2p)
  expect(jsonAt(join(d, 'x1-01/step.json')).ids.sort()).toEqual([`${e}-T3`, `${e}-T6`, `${e}-T7`])
})

test('step prints no origin or case name', async () => {
  const d = stData('st7', STEP_ROWS, STEP_CASES), calls = []
  for (const say of [() => 'f2p', () => 'SENTINEL-VERDICT']) {
    const r = await step(d, calls, say)
    expect(r.out).not.toContain('SENTINEL')
    expect(r.out).toMatch(/^x1-01 step candidates=\d+ f2p=\d+ p2p=\d+ unknown=\d+ ids=\d+ resolver=(ran|reused|none)$/)
  }
})

test('a resolver run that made no Read is rerun once and the rerun stands', async () => {
  const d = stData('st8', STEP_ROWS, STEP_CASES), calls = []
  // the first run reads nothing and answers p2p; the rerun, which reads nothing either, stands with its f2p
  const say = (o, label) => (label.endsWith('-2') ? 'f2p' : 'p2p')
  expect((await step(d, calls, say, () => 0)).out).toBe('x1-01 step candidates=3 f2p=6 p2p=1 unknown=0 ids=3 resolver=ran')
  expect(calls.map((a) => a[1])).toEqual(['f2p-x1-01', 'f2p-x1-01-2'])
  expect(jsonAt(join(d, 'x1-01/f2p.reply.md.run.json')).toolUses).toEqual({})
  // no third run: both records are reused
  expect((await step(d, calls, say, () => 0)).out).toBe('x1-01 step candidates=3 f2p=6 p2p=1 unknown=0 ids=3 resolver=reused')
  expect(calls).toHaveLength(2)
  // an existing first record that read nothing gets its -2 run now, and a first run that read stands alone
  const d2 = stData('st9', STEP_ROWS, STEP_CASES), calls2 = []
  await step(d2, calls2, say, (label) => (label.endsWith('-2') ? 1 : 0))
  expect(calls2.map((a) => a[1])).toEqual(['f2p-x1-01', 'f2p-x1-01-2'])
  const d3 = stData('st10', STEP_ROWS, STEP_CASES), calls3 = []
  expect((await step(d3, calls3, say)).out).toBe('x1-01 step candidates=2 f2p=3 p2p=4 unknown=0 ids=2 resolver=ran')
  expect(calls3).toHaveLength(1)
})

// --- step 6 task 5: a real-estate task's step oracle (rulings 3-6) ---
// one repo: R0 has no app file, R1 adds it, RE (the end) holds the tests; r1 = R1..RE (app at base), r2 = R0..RE (none)
const reRepo = join(tmp, 're-repo')
const rgit = (...a) => Bun.spawnSync(['git', '-C', reRepo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const rput = (files, msg) => {
  for (const [f, text] of Object.entries(files)) { mkdirSync(join(reRepo, f, '..'), { recursive: true }); writeFileSync(join(reRepo, f), text) }
  rgit('add', '-A'); rgit('commit', '-qm', msg)
  return rgit('rev-parse', 'HEAD')
}
mkdirSync(reRepo, { recursive: true }); rgit('init', '-q')
const R0 = rput({ 'src/a.txt': 'a\n' }, 'no app'), R1 = rput({ 'package.json': '{}\n' }, 'app')
const RE = rput({
  'tests/a.spec.ts': Array.from({ length: 20 }, (_, i) => `test('SENTINEL-TITLE ${i + 1}', () => {})`).join('\n') + '\n',
  'tests/b.spec.ts': "test('SENTINEL-SHARED', () => {})\n", 'tests/c.spec.ts': "test('SENTINEL-SHARED', () => {})\n",
  'src/doc.txt': 'SENTINEL-NOTTEST\n',
}, 'tests')
const E7 = RE.slice(0, 7)
const reData = (name) => {
  const d = join(tmp, name)
  for (const x of ['briefs', 'ext', 'env', 'r1', 'r2', 'oracle-scaffold/node_modules']) mkdirSync(join(d, x), { recursive: true })
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'tasks.json'), JSON.stringify({ r1: { base: R1.slice(0, 7), end: E7 }, r2: { base: R0.slice(0, 7), end: E7 } }))
  writeFileSync(join(d, 'ext/groups.json'), JSON.stringify({ seed: SEED, groups: [] }))
  writeFileSync(join(d, 'env/re.json'), JSON.stringify({ name: 'rr', repo: reRepo, db: null, port: 3999, start: 'true', ready: 'http://127.0.0.1:3999/', oracle: 'true', junit: 'r.xml', appFile: 'package.json' }))
  for (const [f, text] of [['steps.md', 'STEPS-BRIEF'], ['step-re.md', 'STEP-RE-BRIEF'], ['oracle-re.md', 'RE-RULES'], ['fix.md', 'FIX-BRIEF'], ['compare.md', 'COMPARE-BRIEF']]) writeFileSync(join(d, 'briefs', f), `${text}\n`)
  writeFileSync(join(d, 'briefs/oracle-re.json'), JSON.stringify({ suffix: '.spec.ts', imports: ['@playwright/test'], kinds: ['browser', 'http', 'api', 'none'] }))
  writeFileSync(join(d, 'oracle-scaffold/run.config.ts'), 'SCAFFOLD-CONFIG\n')
  for (const t of ['r1', 'r2']) { writeFileSync(join(d, t, 'filter-source.md'), 'SENTINEL-SOURCE\n'); writeFileSync(join(d, t, 'input.md'), 'SENTINEL-INPUT\n') }
  return d
}
const titled = (n) => ({ step: `SENTINEL-STEP ${n}`, file: 'tests/a.spec.ts', title: `SENTINEL-TITLE ${n}` })
// one fake agent: a lister replies list(label) (a string as it is); a writer writes a check per listed id (write(given)
// may change the entries); a fixer or comparer is fakeAgents'
// a lister's record counts reads(label) Read calls
const reAgent = (calls, { list = () => [titled(1), titled(2)], write = (g) => g.map(({ id, origin }) => ({ id, origin })), fix = {}, reads = () => 1 } = {}) => {
  const fa = fakeAgents(fix, calls)
  return async (args) => {
    const label = args[1], out = argOf(args, '--out')
    if (/^(fix|compare)-/.test(label)) return fa(args)
    calls.push(args)
    if (label.startsWith('steps-')) {
      const r = list(label)
      writeFileSync(out, typeof r === 'string' ? r : `SENTINEL-REPLY\n${JSON.stringify(r)}`)
    } else {
      const dir = JSON.parse(readFileSync(argOf(args, '--settings'), 'utf8')).permissions.additionalDirectories[0]
      const given = [...readFileSync(argOf(args, '--prompt'), 'utf8').matchAll(/^- `([0-9a-f]{7}-T\d+)`: `(.+)`$/gm)].map((m) => ({ id: m[1], origin: m[2] }))
      const entries = write(given, label).map((e) => ({ behaviour: `SENTINEL-BEHAVIOUR ${e.id}`, interface: 'browser', severity: 'high', ...e }))
      for (const e of entries) if (e.interface !== 'none') writeFileSync(join(dir, `${e.id}.spec.ts`), "import { test } from '@playwright/test'\n")
      writeFileSync(join(dir, 'manifest.json'), JSON.stringify(entries))
      writeFileSync(out, 'SENTINEL-REPLY')
    }
    writeFileSync(`${out}.run.json`, JSON.stringify({ code: 0, ...(label.startsWith('steps-') && reads(label) ? { toolUses: { Read: reads(label) } } : {}) }))
    return 0
  }
}
const reStep = (d, t, calls, opts, gradeCalls = [], table = () => 'valid') =>
  withData(d, () => quiet(() => oracle(['step', join(d, 'env/re.json'), t], { agent: reAgent(calls, opts), grade: fakeGrade(table, gradeCalls) })))
const LINE = /^r[12] step listed=\d+ resolved=\d+ picked=\d+ written=\d+ refused=\d+ none=\d+ valid=\d+ absent-at-base=\d+ weak=\d+ broken=\d+ error=\d+ fixer rounds=\d+ ids=\d+$/

test('real-estate step writes only under step and step.json', async () => {
  const d = reData('re1'), calls = [], grades = []
  const before = new Map(filesIn(d).map((f) => [f, readFileSync(f, 'utf8')]))
  const r = await reStep(d, 'r1', calls, {}, grades)
  expect(r.code).toBe(0)
  expect(r.out.split('\n').at(-1)).toBe('r1 step listed=2 resolved=2 picked=2 written=2 refused=0 none=0 valid=2 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=2')
  const after = filesIn(d)
  for (const [f, text] of before) expect(readFileSync(f, 'utf8')).toBe(text)
  expect(after.filter((f) => !before.has(f)).every((f) => f.startsWith(join(d, 'r1/step/')) || f === join(d, 'r1/step.json'))).toBe(true)
  // the lister at the end, read only, given its brief, the plan text and the input
  const [l, w] = calls
  expect([l[0], l[1], argOf(l, '--at'), argOf(l, '--tools'), argOf(l, '--out')]).toEqual([join(d, 'env/re.json'), 'steps-r1', RE, 'Read,Glob,Grep', join(d, 'r1/step/steps.reply.md')])
  expect(argOf(l, '--prompt')).toBe(join(d, 'r1/step/work/steps.prompt.md'))
  const lp = readFileSync(argOf(l, '--prompt'), 'utf8')
  expect(lp).toStartWith('STEPS-BRIEF\n')
  for (const x of ['SENTINEL-SOURCE', 'SENTINEL-INPUT']) expect(lp).toContain(x)
  expect(jsonAt(join(d, 'r1/step/steps.json'))).toEqual([1, 2].map((n) => ({ ...titled(n), resolved: true })))
  // the writer at the end, its prompt the two briefs, the ids with their tests, the test file and the scaffold; never the step text or the input
  expect([w[1], argOf(w, '--at')]).toEqual(['step-r1', RE])
  const wp = readFileSync(argOf(w, '--prompt'), 'utf8')
  expect(wp).toStartWith('STEP-RE-BRIEF\n')
  expect(wp.indexOf('RE-RULES')).toBeGreaterThan(0)
  const ids = queuePick([1, 2].map((n) => `r1:tests/a.spec.ts::SENTINEL-TITLE ${n}`), 15, SEED).map((k, i) => [`${E7}-T${i + 1}`, k.slice(3)])
  for (const [id, o] of ids) expect(wp).toContain(`- \`${id}\`: \`${o}\``)
  for (const x of ["test('SENTINEL-TITLE 20'", 'SCAFFOLD-CONFIG', join(d, 'r1/step/work/write')]) expect(wp).toContain(x)
  for (const x of ['SENTINEL-STEP', 'SENTINEL-SOURCE', 'SENTINEL-INPUT']) expect(wp).not.toContain(x)
  const o = join(d, 'r1/step/oracle'), stepOf = (o) => `SENTINEL-STEP ${o.split(' ').at(-1)}`
  expect(jsonAt(join(o, 'manifest.json'))).toEqual(ids.map(([id, origin]) => ({ id, fix_commit: RE, task: 'r1', step: stepOf(origin), origin, behaviour: `SENTINEL-BEHAVIOUR ${id}`, interface: 'browser', severity: 'high' })))
  expect(ls(o)).toEqual([...ids.map(([id]) => `${id}.spec.ts`), 'manifest.json', 'node_modules', 'run.config.ts'].sort())
  expect(grades).toEqual([[join(d, 'env/re.json'), o, '--validate', RE, '--bad', R1, '--sealed', '--reuse']])
  expect(jsonAt(join(d, 'r1/step/labels.json'))).toEqual(Object.fromEntries(ids.map(([id]) => [id, 'build'])))
  expect(jsonAt(join(d, 'r1/step.json'))).toEqual({ oracle: 'step/oracle', ids: ids.map(([id]) => id), candidates: 2, seed: SEED })
  // a rerun reuses every record and grades with --reuse
  const tree = filesIn(d).filter((f) => !f.includes('/work/') && !f.endsWith('node_modules')).map((f) => [f, readFileSync(f, 'utf8')])
  const again = await reStep(d, 'r1', calls, {}, grades)
  expect(again.out.split('\n').at(-1)).toBe(r.out.split('\n').at(-1))
  expect(calls).toHaveLength(2)
  expect(grades[1]).toEqual(grades[0])
  expect(filesIn(d).filter((f) => !f.includes('/work/') && !f.endsWith('node_modules')).map((f) => [f, readFileSync(f, 'utf8')])).toEqual(tree)
})

test('a title that matches no test file, or two, is unresolved', async () => {
  const d = reData('re2'), calls = []
  const list = (label) => (label.endsWith('-2') ? [
    titled(1),
    { step: 'S2', file: 'a.spec.ts', title: 'SENTINEL-TITLE 1' }, // abbreviated: resolves to the same test, deduplicated
    { step: 'S3', file: 'tests/c.spec.ts', title: 'SENTINEL-SHARED' }, // two matches, the named file wins
    { step: 'S4', file: 'x.spec.ts', title: 'SENTINEL-SHARED' }, // two matches, neither named
    { step: 'S5', file: 'src/doc.txt', title: 'SENTINEL-NOTTEST' }, // not a test file
    { step: 'S6', file: 'tests/a.spec.ts', title: 'SENTINEL-NOWHERE' },
    { step: 'S7', file: 'tests/a.spec.ts', title: 'SENTINEL-TITLE 2\nSENTINEL-TITLE 3' }, // a line break: refused, not listed
  ] : 'SENTINEL-NOT-JSON')
  const r = await reStep(d, 'r1', calls, { list })
  expect(r.out.split('\n').at(-1)).toBe('r1 step listed=6 resolved=2 picked=2 written=2 refused=0 none=0 valid=2 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=2')
  // the first reply did not parse: run once more as -2, and the rerun stands
  expect(calls.map((a) => a[1])).toEqual(['steps-r1', 'steps-r1-2', 'step-r1'])
  expect(argOf(calls[1], '--out')).toBe(join(d, 'r1/step/steps-2.reply.md'))
  expect(jsonAt(join(d, 'r1/step/steps.json'))).toEqual([
    { ...titled(1), resolved: true },
    { step: 'S3', file: 'tests/c.spec.ts', title: 'SENTINEL-SHARED', resolved: true },
    { step: 'S4', file: 'x.spec.ts', title: 'SENTINEL-SHARED', resolved: false },
    { step: 'S5', file: 'src/doc.txt', title: 'SENTINEL-NOTTEST', resolved: false },
    { step: 'S6', file: 'tests/a.spec.ts', title: 'SENTINEL-NOWHERE', resolved: false },
  ])
  // nothing resolved: no writer, no grade, no ids
  const d2 = reData('re2b'), calls2 = [], grades2 = []
  const r2 = await reStep(d2, 'r1', calls2, { list: () => [] }, grades2)
  expect(r2).toEqual({ code: 0, out: 'r1 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0' })
  expect(calls2.map((a) => a[1])).toEqual(['steps-r1'])
  expect(grades2).toHaveLength(0)
  expect(jsonAt(join(d2, 'r1/step.json'))).toEqual({ oracle: 'step/oracle', ids: [], candidates: 0, seed: SEED })
})

test('the pick happens before the writer and takes 15 by seed', async () => {
  const d = reData('re3'), calls = []
  const all = Array.from({ length: 20 }, (_, i) => titled(i + 1))
  const r = await reStep(d, 'r1', calls, { list: () => all })
  expect(r.out.split('\n').at(-1)).toBe('r1 step listed=20 resolved=20 picked=15 written=15 refused=0 none=0 valid=15 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=15')
  const picked = queuePick(all.map((x) => `r1:${x.file}::${x.title}`), 15, SEED).map((k) => k.slice(3))
  const wp = readFileSync(argOf(calls[1], '--prompt'), 'utf8')
  expect([...wp.matchAll(/^- `([0-9a-f]{7}-T\d+)`: `(.+)`$/gm)].map((m) => [m[1], m[2]])).toEqual(picked.map((o, i) => [`${E7}-T${i + 1}`, o]))
  expect(jsonAt(join(d, 'r1/step.json')).ids).toEqual(picked.map((_, i) => `${E7}-T${i + 1}`))
  expect(jsonAt(join(d, 'r1/step.json')).candidates).toBe(20)
})

test('step ids number after the highest of that prefix', async () => {
  const d = reData('re4'), calls = []
  for (const [f, id] of [['x1/oracle', `${E7}-T4`], ['x2/step/oracle', `${E7}-T6`], ['x3/oracle', 'abcdef0-T40']]) {
    mkdirSync(join(d, f), { recursive: true })
    writeFileSync(join(d, f, 'manifest.json'), JSON.stringify([{ id, dropped: true }]))
  }
  // the writer adds an id it was not given and gives one check another test as origin: both refused
  const write = (g) => [{ id: g[0].id, origin: g[0].origin }, { id: g[1].id, origin: 'tests/a.spec.ts::SENTINEL-TITLE 9' }, { id: `${E7}-T99`, origin: g[0].origin }, { id: g[2].id, origin: g[2].origin, interface: 'none' }]
  const r = await reStep(d, 'r1', calls, { list: () => [titled(1), titled(2), titled(3)], write })
  expect(r.out.split('\n').at(-1)).toBe('r1 step listed=3 resolved=3 picked=3 written=2 refused=2 none=1 valid=1 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=1')
  const given = [...readFileSync(argOf(calls[1], '--prompt'), 'utf8').matchAll(/^- `([0-9a-f]{7}-T\d+)`/gm)].map((m) => m[1])
  expect(given).toEqual([7, 8, 9].map((n) => `${E7}-T${n}`))
  expect(jsonAt(join(d, 'r1/step/work/write.reply.md.run.json')).ids).toEqual(given)
  expect(jsonAt(join(d, 'r1/step/oracle/manifest.json')).map((m) => m.id)).toEqual([given[0], given[2]])
  // a rerun keeps the ids its record holds, though the step oracle now holds them
  expect((await reStep(d, 'r1', calls, { list: () => [titled(1), titled(2), titled(3)], write })).out.split('\n').at(-1)).toBe(r.out.split('\n').at(-1))
  expect(calls).toHaveLength(2)
})

test('a base with no app is not run and every step check reads precondition there', async () => {
  const d = reData('re5'), calls = [], grades = []
  const r = await reStep(d, 'r2', calls, {}, grades, (c, id) => (id.endsWith('-T2') ? 'fail' : 'pass'))
  const o = join(d, 'r2/step/oracle')
  // the end alone, again after each round that kept a fix
  for (const g of grades) expect(g).toEqual([join(d, 'env/re.json'), o, '--at', RE, '--sealed', '--reuse'])
  const v = jsonAt(join(d, `r2/step/validation-${E7}.json`))
  expect({ ...v, at: 'x' }).toEqual({ ref: RE, bad: [R0], base: null, at: 'x', stage: 'no app at base', checks: [
    { id: `${E7}-T1`, ref: 'pass', bad: ['precondition'], base: null, verdict: 'absent-at-base', stage: 'no app at base' },
    { id: `${E7}-T2`, ref: 'fail', bad: ['precondition'], base: null, verdict: 'broken', stage: 'no app at base' },
  ] })
  expect(r.out.split('\n').at(-1)).toMatch(/^r2 step .* valid=0 absent-at-base=1 weak=0 broken=1 error=0 fixer rounds=2 ids=1$/)
  expect(jsonAt(join(d, 'r2/step.json')).ids).toEqual([`${E7}-T1`])
  // a grade that throws gives error with its stage
  const d2 = reData('re5b')
  const boom = async () => { throw new Error('setup failed at the end\nmore') }
  const r2 = await withData(d2, () => quiet(() => oracle(['step', join(d2, 'env/re.json'), 'r2'], { agent: reAgent([]), grade: boom })))
  expect(jsonAt(join(d2, `r2/step/validation-${E7}.json`)).checks.map((x) => [x.verdict, x.stage])).toEqual([['error', 'setup failed at the end'], ['error', 'setup failed at the end']])
  expect(r2.out.split('\n').at(-1)).toMatch(/ error=2 fixer rounds=0 ids=0$/)
})

test('a broken step check gets a fixer round and a changed one stays broken', async () => {
  const d = reData('re6'), calls = [], grades = []
  const r = await reStep(d, 'r1', calls, { fix: { say: () => 'changed' } }, grades, () => 'broken')
  expect(r.out.split('\n').at(-1)).toBe('r1 step listed=2 resolved=2 picked=2 written=2 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=2 error=0 fixer rounds=2 ids=0')
  expect(calls.map((a) => a[1])).toEqual(['steps-r1', 'step-r1', `fix-step-1-r1-${E7}`, `compare-step-1-r1-${E7}`, `fix-step-2-r1-${E7}`, `compare-step-2-r1-${E7}`])
  expect(grades).toHaveLength(1) // nothing kept: no pass after a round
  const fixer = calls[2]
  expect(argOf(fixer, '--out')).toBe(join(d, `r1/step/work/fix-step-1/${E7}.fix.reply.md`))
  expect(readFileSync(argOf(fixer, '--prompt'), 'utf8')).not.toContain('SENTINEL-STEP') // a fixer never sees the step text
  for (const r of [1, 2]) { // nor in its folder copy
    const m = readFileSync(join(d, `r1/step/work/fix-step-${r}/${E7}/manifest.json`), 'utf8')
    expect(m).not.toContain('SENTINEL-STEP')
    expect(JSON.parse(m).map((e) => e.id)).toEqual([`${E7}-T1`, `${E7}-T2`])
  }
  expect(readFileSync(join(d, 'r1/step/oracle/manifest.json'), 'utf8')).toContain('SENTINEL-STEP') // the oracle keeps it
  for (const f of readdirSync(join(d, 'r1/step/oracle')).filter((f) => f.endsWith('.spec.ts'))) expect(readFileSync(join(d, 'r1/step/oracle', f), 'utf8')).not.toBe('FIXED\n')
  expect(jsonAt(join(d, 'r1/step/labels.json'))).toEqual({})
  // a fixed one the comparer calls same is kept and validated again
  const d2 = reData('re6b'), calls2 = [], grades2 = []
  const table = (c, id, o) => (readFileSync(join(o, `${id}.spec.ts`), 'utf8') === 'FIXED\n' ? 'valid' : 'broken')
  const r2 = await reStep(d2, 'r1', calls2, {}, grades2, table)
  expect(r2.out.split('\n').at(-1)).toMatch(/ valid=2 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=1 ids=2$/)
  expect(grades2).toHaveLength(2)
})

test('step prints no title, file or behaviour', async () => {
  const d = reData('re7'), calls = []
  const r = await reStep(d, 'r1', calls, { list: () => [titled(1), titled(2), { step: 'S', file: 'x.spec.ts', title: 'SENTINEL-SHARED' }] }, [], (c, id) => (id.endsWith('-T1') ? 'broken' : 'valid'))
  expect(r.out).not.toContain('SENTINEL')
  expect(r.out).not.toContain('spec.ts')
  expect(r.out.split('\n')).toHaveLength(1)
  expect(r.out).toMatch(LINE)
  // a lister prompt that changed since its run is refused, and nothing is rewritten
  writeFileSync(join(d, 'briefs/steps.md'), 'STEPS-BRIEF-2\n')
  const kept = readFileSync(join(d, 'r1/step.json'), 'utf8')
  expect(await reStep(d, 'r1', calls)).toEqual({ code: 1, out: 'r1 step refused a run whose prompt differs from the one it ran with' })
  expect(readFileSync(join(d, 'r1/step.json'), 'utf8')).toBe(kept)
})

test('a lister run that made no Read is rerun once and the rerun stands', async () => {
  const d = reData('re8'), calls = []
  // the first run reads nothing and lists one test; the rerun, which reads nothing either, stands with its two
  const list = (label) => (label.endsWith('-2') ? [titled(1), titled(2)] : [titled(3)])
  const r = await reStep(d, 'r1', calls, { list, reads: () => 0 })
  expect(r.out.split('\n').at(-1)).toMatch(/^r1 step listed=2 resolved=2 picked=2 /)
  expect(calls.map((a) => a[1])).toEqual(['steps-r1', 'steps-r1-2', 'step-r1'])
  // no third run: both records are reused
  await reStep(d, 'r1', calls, { list, reads: () => 0 })
  expect(calls).toHaveLength(3)
  // a first run that read stands alone
  const d2 = reData('re8b'), calls2 = []
  await reStep(d2, 'r1', calls2, { list })
  expect(calls2.map((a) => a[1])).toEqual(['steps-r1', 'step-r1'])
})

test('a title given with no file resolves only when exactly one test file holds it', async () => {
  const d = reData('re9'), calls = []
  const list = () => [{ step: 'S1', file: '', title: 'SENTINEL-TITLE 5' }, { step: 'S2', file: '', title: 'SENTINEL-SHARED' }]
  const r = await reStep(d, 'r1', calls, { list })
  expect(r.out.split('\n').at(-1)).toMatch(/^r1 step listed=2 resolved=1 picked=1 /)
  expect(jsonAt(join(d, 'r1/step/steps.json'))).toEqual([
    { step: 'S1', file: 'tests/a.spec.ts', title: 'SENTINEL-TITLE 5', resolved: true },
    { step: 'S2', file: '', title: 'SENTINEL-SHARED', resolved: false },
  ])
})

test('a writer rerun\'s prompt names its own folder', async () => {
  const d = reData('re10'), calls = []
  // the first writer leaves only interface none; the rerun writes its checks into the folder its prompt names
  const write = (g, label) => g.map(({ id, origin }) => ({ id, origin, ...(label.endsWith('-2') ? {} : { interface: 'none' }) }))
  const r = await reStep(d, 'r1', calls, { write })
  expect(calls.map((a) => a[1])).toEqual(['steps-r1', 'step-r1', 'step-r1-2'])
  const w1 = join(d, 'r1/step/work/write'), w2 = `${w1}-2`
  const p2 = readFileSync(argOf(calls[2], '--prompt'), 'utf8')
  expect(p2).toContain(`\`${w2}\``)
  expect(p2).not.toContain(`\`${w1}\``)
  expect(JSON.parse(readFileSync(argOf(calls[2], '--settings'), 'utf8')).permissions.additionalDirectories[0]).toBe(w2)
  expect(r.out.split('\n').at(-1)).toMatch(/ written=2 refused=0 none=0 valid=2 .* ids=2$/)
})

test('a writer folder reached through a symlink is granted by its real path', async () => {
  // the task folder is a link (as <data>/p8b -> 8b): the writer's and the fixer's folders are granted by both paths
  const d = reData('re11'), calls = []
  const { renameSync, symlinkSync } = await import('node:fs')
  renameSync(join(d, 'r1'), join(d, 'r1-real'))
  symlinkSync(join(d, 'r1-real'), join(d, 'r1'))
  mkdirSync(join(d, 'r1-real/step/logs'), { recursive: true }) // grade's sealed logs (the fake grade writes none)
  await reStep(d, 'r1', calls, { fix: { say: () => 'changed' } }, [], () => 'broken')
  for (const a of calls.filter((x) => /^(step|fix)-/.test(x[1]))) {
    const label = a[1], sub = label.startsWith('step-') ? 'write' : `fix-step-${label.split('-')[2]}/${E7}`
    const link = join(d, 'r1/step/work', sub), real = join(d, 'r1-real/step/work', sub)
    const { permissions: p } = JSON.parse(readFileSync(argOf(a, '--settings'), 'utf8'))
    expect(p.additionalDirectories.slice(0, 2)).toEqual([link, real])
    for (const x of [link, real]) expect(p.allow).toContain(`Edit(/${x}/**)`)
    if (label.startsWith('fix-')) expect(p.additionalDirectories).toContain(join(d, 'r1-real/step/logs'))
    expect(readFileSync(argOf(a, '--prompt'), 'utf8')).not.toContain(real) // the prompt names the folder as the tool gives it
  }
  expect(calls.map((a) => a[1])).toContain(`fix-step-1-r1-${E7}`)
})

test('changedRanges reads added, changed and deleted hunks', () => {
  const diff = [
    'diff --git a/a.js b/a.js', 'index 1..2 100644', '--- a/a.js', '+++ b/a.js',
    '@@ -3 +3 @@', '-x', '+y',
    '@@ -10,0 +11,2 @@', '+p', '+q',
    '@@ -20,2 +22,0 @@', '--- gone', '-b',
    'diff --git a/new.js b/new.js', '--- /dev/null', '+++ b/new.js', '@@ -0,0 +1,3 @@', '+1', '+2', '+3',
    'diff --git a/old.js b/old.js', '--- a/old.js', '+++ /dev/null', '@@ -1,2 +0,0 @@', '-a', '-b',
  ].join('\n')
  expect(changedRanges(diff)).toEqual([
    { file: 'a.js', start: 3, end: 3 }, { file: 'a.js', start: 11, end: 12 }, { file: 'a.js', start: 22, end: 22 },
    { file: 'new.js', start: 1, end: 3 }, { file: 'old.js', start: 0, end: 0 },
  ])
  expect(EDGES).toEqual(['empty', 'null', 'duplicate', 'case', 'deleted', 'boundary'])
})

test('inChanged takes a line within pad and refuses another file', () => {
  const ranges = [{ file: 'a.js', start: 10, end: 12 }]
  expect(inChanged({ file: 'a.js', old: 7 }, ranges)).toBe(true)
  expect(inChanged({ file: 'a.js', old: 15 }, ranges)).toBe(true)
  expect(inChanged({ file: 'a.js', old: 6 }, ranges)).toBe(false)
  expect(inChanged({ file: 'a.js', old: 16 }, ranges)).toBe(false)
  expect(inChanged({ file: 'a.js', old: 16 }, ranges, 4)).toBe(true)
  expect(inChanged({ file: 'b.js', old: 10 }, ranges)).toBe(false)
})

test('applyEdit refuses zero, two and identical matches', () => {
  expect(applyEdit('a b c', 'b', 'X')).toBe('a X c')
  expect(applyEdit('a b c', 'z', 'X')).toBeNull()
  expect(applyEdit('a b b', 'b', 'X')).toBeNull()
  expect(applyEdit('aaa', 'aa', 'X')).toBeNull() // overlapping matches count
  expect(applyEdit('a b c', 'b', 'b')).toBeNull()
  expect(applyEdit('a b c', '', 'X')).toBeNull()
  expect(applyEdit('a.c abc', 'a.c', '$&')).toBe('$& abc') // plain text, not a pattern
})

// --- seeded bugs (step 7, task 3): the sealed repo and the bug commit ---
// sd: base B (30 lines in src/m.js), end E changes line 10 and a test; the branch is then reset to B so E is dangling in the source
const sd = join(tmp, 'sd'), sdata = join(tmp, 'sdata'), sdTask = join(tmp, 'sd-task.json')
const sg = (...a) => Bun.spawnSync(['git', '-C', sd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const lines = (n) => Array.from({ length: 30 }, (_, i) => `const l${i + 1} = ${n(i + 1)}`).join('\n') + '\n'
mkdirSync(join(sd, 'src'), { recursive: true }); mkdirSync(join(sd, 'tests'), { recursive: true }); sg('init', '-q')
writeFileSync(join(sd, 'src/m.js'), lines((i) => i)); writeFileSync(join(sd, 'tests/m.test.js'), 'one\n'); sg('add', '-A'); sg('commit', '-qm', 'base')
const sdBase = sg('rev-parse', 'HEAD')
writeFileSync(join(sd, 'src/m.js'), lines((i) => (i === 10 ? 'ten' : i))); writeFileSync(join(sd, 'tests/m.test.js'), 'two\n'); sg('commit', '-qam', 'end')
const sdEnd = sg('rev-parse', 'HEAD'); sg('reset', '-q', '--hard', sdBase)
writeFileSync(sdTask, JSON.stringify({ name: 're', repo: sd, db: null, port: 3998, start: 'true', ready: 'http://127.0.0.1:3998/', oracle: 'true', junit: 'r.xml' }))
const sealed = join(sdata, 'seeded/repos/sd.git')
const sOpts = { base: sdBase }
const bug = (find, replace, over = {}) => ({ file: 'src/m.js', find, replace, edge: 'boundary', ...over })

test('seedRepo makes a bare repo on the source\'s objects and an env file that differs only in repo', async () => {
  const env = await seedRepo(sdata, sdTask)
  expect(env).toBe(join(sdata, 'env/seeded/sd-task.json'))
  expect(sg('rev-parse', '--is-bare-repository')).toBe('false')
  expect(Bun.spawnSync(['git', '-C', sealed, 'rev-parse', '--is-bare-repository']).stdout.toString().trim()).toBe('true')
  expect(JSON.parse(readFileSync(env, 'utf8'))).toEqual({ ...JSON.parse(readFileSync(sdTask, 'utf8')), repo: sealed })
  expect(readFileSync(join(sealed, 'objects/info/alternates'), 'utf8')).toBe(`${join(sd, '.git/objects')}\n`)
  expect(await seedRepo(sdata, sdTask)).toBe(env) // idempotent
  expect(readFileSync(join(sealed, 'objects/info/alternates'), 'utf8')).toBe(`${join(sd, '.git/objects')}\n`)
})

test('seedRepo sees a dangling end through its alternates', async () => {
  await seedRepo(sdata, sdTask)
  expect(sg('for-each-ref', '--contains', sdEnd)).toBe('') // no ref of the source reaches the end
  expect(Bun.spawnSync(['git', '-C', sealed, 'cat-file', '-t', sdEnd]).stdout.toString().trim()).toBe('commit')
})

test('seedRepo works from a bare source fetched at depth 2, and takes its shallow file again when it deepens', async () => {
  const deep = join(tmp, 'deep'), src = join(tmp, 'shallow-src'), d = join(tmp, 'sdata-shallow'), file = join(tmp, 'shallow-task.json'), wt = join(tmp, 'shallow-wt')
  const run = (cwd, ...a) => Bun.spawnSync(['git', '-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]), text = (cwd, ...a) => run(cwd, ...a).stdout.toString().trim()
  mkdirSync(deep, { recursive: true }); mkdirSync(src, { recursive: true }); mkdirSync(join(deep, 'src')); mkdirSync(d)
  run(deep, 'init', '-q'); run(src, 'init', '-q', '--bare')
  const commit = (n, i) => { writeFileSync(join(deep, 'src/m.js'), lines((l) => (l === 10 ? n : l))); run(deep, 'add', '-A'); run(deep, 'commit', '-qm', `c${i}`); return text(deep, 'rev-parse', 'HEAD') }
  const [c1, c2, c3] = ['one', 'two', 'three'].map(commit)
  expect(run(src, 'fetch', '-q', '--depth', '2', `file://${deep}`, 'HEAD:refs/heads/main').exitCode).toBe(0)
  expect(existsSync(join(src, 'shallow'))).toBe(true)
  writeFileSync(file, JSON.stringify({ name: 'sh', repo: src, db: null, port: 3997, start: 'true', ready: 'http://127.0.0.1:3997/', oracle: 'true', junit: 'r.xml' }))
  const env = await seedRepo(d, file), repo = join(d, 'seeded/repos/shallow-src.git')
  expect((await loadTask(env)).repo).toBe(repo)
  for (const c of [c2, c3]) expect(text(repo, 'cat-file', '-t', c)).toBe('commit')
  expect(run(repo, 'cat-file', '-e', c1).exitCode).not.toBe(0)
  expect(text(repo, 'rev-list', '--count', c3)).toBe('2')
  const r = await seedCommit(repo, c3, bug('const l12 = 12', 'const l12 = 13'), 'sb-sh-1', { base: c2 })
  expect(r.hunk).toEqual({ file: 'src/m.js', old: 12 })
  expect(text(repo, 'rev-parse', `${r.commit}^`)).toBe(c3)
  expect(run(src, 'cat-file', '-e', r.commit).exitCode).not.toBe(0)
  expect(run(repo, 'worktree', 'add', '-q', '--detach', wt, r.commit).exitCode).toBe(0)
  const out = Bun.spawnSync(['sh', '-c', `git -C ${wt} archive HEAD | tar -xO src/m.js`]).stdout.toString()
  run(repo, 'worktree', 'remove', '--force', wt)
  expect(out).toContain('const l12 = 13')
  expect(out).toContain('const l10 = three')
  expect(run(src, 'fetch', '-q', '--depth', '3', `file://${deep}`, 'HEAD:refs/heads/main').exitCode).toBe(0)
  await seedRepo(d, file)
  expect(text(repo, 'rev-list', '--count', c3)).toBe('3')
})

test('a seeded commit exists only in the sealed repo', async () => {
  await seedRepo(sdata, sdTask)
  const r = await seedCommit(sealed, sdEnd, bug('const l12 = 12', 'const l12 = 13'), 'sb-x-1', sOpts)
  expect(r.hunk).toEqual({ file: 'src/m.js', old: 12 })
  const s = (...a) => Bun.spawnSync(['git', '-C', sealed, ...a])
  expect(s('rev-parse', 'refs/seeded/sb-x-1').stdout.toString().trim()).toBe(r.commit)
  expect(s('log', '-1', '--format=%P|%an|%ae|%cn|%ad|%s', '--date=iso-strict', r.commit).stdout.toString().trim()).toBe(`${sdEnd}|bench|bench@localhost|bench|2026-10-27T00:00:00+00:00|seeded`)
  expect(Bun.spawnSync(['git', '-C', sd, 'cat-file', '-e', r.commit]).exitCode).not.toBe(0) // the source does not have it
  expect(sg('for-each-ref', 'refs/seeded')).toBe('')
  expect(readdirSync(sealed).filter((f) => f.includes('index'))).toEqual([]) // the temp index is gone
})

test('the same edit gives the same sha', async () => {
  await seedRepo(sdata, sdTask)
  const a = await seedCommit(sealed, sdEnd, bug('const l12 = 12', 'const l12 = 13'), 'sb-x-1', sOpts)
  const b = await seedCommit(sealed, sdEnd, bug('const l12 = 12', 'const l12 = 13'), 'sb-x-2', sOpts)
  expect(b.commit).toBe(a.commit)
})

test('seedCommit refuses a test file, a two-hunk edit and a line outside the changed ranges', async () => {
  await seedRepo(sdata, sdTask)
  const refs = () => Bun.spawnSync(['git', '-C', sealed, 'for-each-ref', 'refs/seeded/r-']).stdout.toString().trim()
  const why = async (e, id, o = sOpts) => (await seedCommit(sealed, sdEnd, e, id, o)).why
  expect(await why(bug('const l12 = 12', 'x', { edge: 'nope' }), 'r-1')).toBe('edge')
  expect(await why(bug('two', 'three', { file: 'tests/m.test.js' }), 'r-2')).toBe('test file')
  expect(await why(bug('const l12 = 12', 'x', { file: 'lib/a.js' }), 'r-3', { ...sOpts, testPaths: ['^lib/'] })).toBe('test file')
  expect(await why(bug('const l12 = 12', 'x', { file: 'src/gone.js' }), 'r-4')).toBe('no file')
  expect(await why(bug('const l12 = 99', 'x'), 'r-5')).toBe('find')
  expect(await why(bug('const l12 = 12', 'const l12 = 12'), 'r-5b')).toBe('find') // find equal to replace
  const span = Array.from({ length: 12 }, (_, i) => `const l${i + 12} = ${i + 12}`).join('\n')
  expect(await why(bug(span, span.replace('l12 = 12', 'l12 = 0').replace('l23 = 23', 'l23 = 0')), 'r-6')).toBe('hunks')
  expect(await why(bug('const l30 = 30', 'const l30 = 31'), 'r-7')).toBe('outside')
  for (const file of ['../x.js', '', '/etc/hosts', ':(top)src/m.js', './src/m.js', 'src/../src/m.js', 'src//m.js']) expect(await why(bug('const l12 = 12', 'x', { file }), 'r-8')).toBe('no file') // git would refuse or read another path
  expect(refs()).toBe('') // a refused candidate has no ref
  await expect(seedCommit(sealed, '0'.repeat(40), bug('const l12 = 12', 'x'), 'r-9', sOpts)).rejects.toThrow('git ls-tree failed') // a plumbing failure is no refusal
})

test('a worktree of the sealed repo archives the bug at HEAD', async () => {
  await seedRepo(sdata, sdTask)
  const { commit } = await seedCommit(sealed, sdEnd, bug('const l12 = 12', 'const l12 = 13'), 'sb-x-1', sOpts)
  const wt = join(tmp, 'sd-wt')
  Bun.spawnSync(['git', '-C', sealed, 'worktree', 'add', '-q', '--detach', wt, commit])
  const out = Bun.spawnSync(['sh', '-c', `git -C ${wt} archive HEAD | tar -xO src/m.js`]).stdout.toString()
  Bun.spawnSync(['git', '-C', sealed, 'worktree', 'remove', '--force', wt])
  expect(out).toContain('const l12 = 13')
  expect(out).toContain('const l10 = ten')
})

test('loadTask accepts the seeded env file', async () => {
  const env = await seedRepo(sdata, sdTask)
  expect(await loadTask(env)).toMatchObject({ name: 're', repo: sealed, port: 3998 })
})

test('highestOf counts seeded manifests', () => {
  const d = join(tmp, 'hd')
  mkdirSync(join(d, 't1/seeded/oracle'), { recursive: true }); mkdirSync(join(d, 't1/oracle'), { recursive: true })
  writeFileSync(join(d, 't1/oracle/manifest.json'), JSON.stringify([{ id: 'abc1234-T2' }]))
  writeFileSync(join(d, 't1/seeded/oracle/manifest.json'), JSON.stringify([{ id: 'abc1234-T5', dropped: true }]))
  expect(highestOf(d, 'abc1234')).toBe(5)
})

// --- seeded bugs (step 7, task 4): seed and kills ---
// the sd repo again: a data folder with one real-estate task r1 and one external task x1-01 on it
const S7 = sdEnd.slice(0, 7), ST = (n) => `${S7}-T${n}`, RE_ARGS = (d) => [join(d, 'env/re.json'), 'r1'], EXT_ARGS = () => ['x1-01']
const seedData = (name) => {
  const d = join(tmp, name), ext = join(d, 'ext')
  for (const x of ['briefs', 'ext/briefs', 'env', 'r1', 'x1-01', 'oracle-scaffold/node_modules']) mkdirSync(join(d, x), { recursive: true })
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'tasks.json'), JSON.stringify({ r1: { base: sdBase.slice(0, 7), end: S7 } }))
  writeFileSync(join(ext, 'groups.json'), JSON.stringify({ seed: SEED, groups: [{ id: 's9', testPaths: ['^checks/'] }] }))
  writeFileSync(join(ext, 'sample.tsv'), `task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\nx1-01\ts9\t1\t1\town/rp#7\tu\t7\t6\t${sdBase}\t${sdEnd}\n`)
  for (const f of ['re.json', 'x1-01.json']) writeFileSync(join(d, 'env', f), readFileSync(sdTask))
  for (const [f, text] of [['briefs/seed-re.md', 'SEED-RE-BRIEF'], ['briefs/oracle-re.md', 'RE-RULES'], ['ext/briefs/seed.md', 'SEED-EXT-BRIEF'], ['ext/briefs/oracle.md', 'EXT-RULES'], ['briefs/fix.md', 'FIX-BRIEF'], ['briefs/compare.md', 'COMPARE-BRIEF'], ['oracle-scaffold/run.config.ts', 'SCAFFOLD-CONFIG'], ['r1/input.md', 'SENTINEL-INPUT'], ['x1-01/input.md', 'SENTINEL-INPUT']]) writeFileSync(join(d, f), `${text}\n`)
  writeFileSync(join(d, 'briefs/oracle-re.json'), JSON.stringify({ suffix: '.spec.ts', imports: ['@playwright/test'], kinds: ['browser', 'http', 'api', 'none'] }))
  const t = taskOf(ext, 'x1-01')
  for (const x of [`serve/${t.key}`, `tasks/${t.slug}`]) mkdirSync(join(ext, x), { recursive: true })
  writeFileSync(join(ext, 'serve', t.key, 'serve.json'), JSON.stringify({ briefSha: 'SENTINEL-BRIEFSHA', layer: [], start: 'SERVE-START', ready: 'true' }))
  writeFileSync(join(ext, 'tasks', t.slug, 'task-recipe.json'), JSON.stringify({ dockerfile: 'RECIPE-DOCKERFILE', test: 'RECIPE-TEST' }))
  return d
}
// five candidates, each one line within 3 of the changed line 10 of src/m.js, each a check file of its id
const LINES = [7, 8, 9, 11, 12]
const candidate = (id, i) => ({ id, origin: `src/m.js::${EDGES[i]}`, behaviour: `SENTINEL-BEHAVIOUR ${id}`, description: `SENTINEL-DESCRIPTION ${id}`, interface: 'browser', severity: 'medium', edge: EDGES[i],
  edit: { file: 'src/m.js', find: `const l${LINES[i]} = ${LINES[i]}`, replace: `const l${LINES[i]} = SENTINEL` } })
const CHECK = "import { test } from '@playwright/test'\n", FIXED = `${CHECK}// fixed\n`
// a seeder writes a candidate per id its prompt gives (tweak may change one, or drop it with null); fixers and comparers are fakeAgents'
const seeder = (calls, { tweak = (e) => e, fix, runner = JSON.stringify({ layer: ['RUN true'], run: 'true' }), manifest } = {}) => {
  const fa = fakeAgents(fix, calls)
  return async (args) => {
    const label = args[1], out = argOf(args, '--out')
    if (/^(fix|compare)-/.test(label)) return fa(args)
    calls.push(args)
    const dir = JSON.parse(readFileSync(argOf(args, '--settings'), 'utf8')).permissions.additionalDirectories[0]
    const ids = [...readFileSync(argOf(args, '--prompt'), 'utf8').matchAll(/^- `([0-9a-f]{7}-T\d+)`$/gm)].map((m) => m[1]), grouped = label.startsWith('seed-x')
    const entries = ids.map((id, i) => tweak({ ...candidate(id, i), ...(grouped ? { file: `${id}.spec.ts` } : {}) }, i)).filter(Boolean)
    for (const e of entries) writeFileSync(join(dir, `${e.id}.spec.ts`), CHECK)
    if (grouped && runner !== null) writeFileSync(join(dir, 'runner.json'), runner)
    if (manifest !== null) writeFileSync(join(dir, 'manifest.json'), JSON.stringify(entries))
    writeFileSync(out, 'SENTINEL-REPLY')
    writeFileSync(`${out}.run.json`, JSON.stringify({ code: 0 }))
    return 0
  }
}
const sealedGit = (d, ...a) => Bun.spawnSync(['git', '-C', join(d, 'seeded/repos/sd.git'), ...a]).stdout.toString().trim()
const bugSha = (d, id) => sealedGit(d, 'rev-parse', '-q', '--verify', `refs/seeded/${id}`)
const kOf = (d, c) => Number(sealedGit(d, 'for-each-ref', '--format=%(refname)', '--points-at', c, 'refs/seeded').match(/-(\d+)$/)?.[1])
// each check passes at the end; at a bug its own check gives own(k) and the others pass
const ownFails = (d, own = () => 'fail') => (c, id) => (c === sdEnd || id !== ST(kOf(d, c)) ? 'pass' : own(kOf(d, c)))
// over: by commit, how the grade ends: 'throw', 'exit' (exit 1, no file), 'missing' (a run with no JUnit), 'not ready' (its empty JUnit reads ok)
const seedGrade = (table, calls = [], over = () => null, events = []) => async (args) => {
  const c = argOf(args, '--at'), how = over(c)
  if (how === 'throw' || how === 'exit') { calls.push(args); if (how === 'throw') throw new Error('SENTINEL-THROW'); return 1 }
  if (how === 'not ready') {
    const build = join(args[1].replace(/(\/seeded|\/step)?\/oracle$/, ''), 'build')
    mkdirSync(build, { recursive: true })
    appendFileSync(join(build, 'readiness.tsv'), `${c.slice(0, 7)}\t${O8(args[1])}\tnot ready\n`)
    return fakeGrade(() => 'error', calls, events)(args)
  }
  await fakeGrade(table, calls, events)(args)
  if (how !== 'missing') return 0
  const f = join(args[1], '..', 'grades', `${c.slice(0, 7)}.json`)
  writeFileSync(f, JSON.stringify({ ...jsonAt(f), junit: 'missing' }))
  return 1
}
const seedRun = (d, args, calls, opts, grade) => withData(d, () => quiet(() => oracle(['seed', ...args], { agent: seeder(calls, opts), grade })))
const bugsOf = (d, t) => jsonAt(join(d, t, 'seeded/bugs.json'))
const validationIn = (d, t) => jsonAt(join(d, t, `seeded/validation-${S7}.json`))
const atCalls = (grades) => grades.map((g) => argOf(g, '--at'))
const seedTree = (d) => filesIn(d).filter((f) => !f.includes('/work/') && !f.includes('/seeded/repos/') && !f.endsWith('node_modules') && !f.includes('validation-')).map((f) => [f, readFileSync(f, 'utf8')])

test('seed writes only under seeded', async () => {
  const d = seedData('sb1'), calls = [], grades = [], env = join(d, 'env/seeded/re.json'), o = join(d, 'r1/seeded/oracle')
  const before = new Map(filesIn(d).map((f) => [f, readFileSync(f, 'utf8')]))
  const r = await seedRun(d, RE_ARGS(d), calls, {}, seedGrade(ownFails(d), grades))
  expect(r.code).toBe(0)
  expect(r.out).toBe('r1 seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  for (const [f, text] of before) expect(readFileSync(f, 'utf8')).toBe(text)
  const fresh = filesIn(d).filter((f) => !before.has(f))
  expect(fresh.every((f) => [join(d, 'r1/seeded/'), join(d, 'seeded/repos/'), join(d, 'env/seeded/')].some((p) => f.startsWith(p)))).toBe(true)
  // the seeder on the sealed repo's env file, at the end, granted its own folder
  const [a] = calls, dir = join(d, 'r1/seeded/work/seed')
  expect(calls).toHaveLength(1)
  expect([a[0], a[1], argOf(a, '--at'), argOf(a, '--tools'), argOf(a, '--out')]).toEqual([env, 'seed-r1', sdEnd, 'Read,Glob,Grep,Write,Edit', join(d, 'r1/seeded/work/seed.reply.md')])
  expect(JSON.parse(readFileSync(argOf(a, '--settings'), 'utf8')).permissions.additionalDirectories).toEqual([dir])
  const p = readFileSync(argOf(a, '--prompt'), 'utf8')
  expect(p).toStartWith('SEED-RE-BRIEF\n')
  expect(p).toContain(`RE-RULES\n\n## The requirement\n\n\`\`\`\`markdown\nSENTINEL-INPUT\n\`\`\`\`\n\n## The changed ranges\n\nsrc/m.js:10-10\n\n## The bugs to write\n\n2 bugs, one check each, with these ids:\n\n- \`${ST(1)}\`\n- \`${ST(2)}\`\n`)
  expect(p).toContain('### run.config.ts\n\n````\nSCAFFOLD-CONFIG\n````')
  expect(p.trimEnd()).toEndWith(`## Your output folder\n\n\`${dir}\``)
  expect(p).not.toContain('tests/m.test.js')
  // the checks into the oracle with the scaffold; edge, edit and description stay in bugs.json
  expect(ls(o)).toEqual([`${ST(1)}.spec.ts`, `${ST(2)}.spec.ts`, 'manifest.json', 'node_modules', 'run.config.ts'].sort())
  expect(jsonAt(join(o, 'manifest.json'))).toEqual([1, 2].map((n) => ({ id: ST(n), fix_commit: sdEnd, task: 'r1', origin: `src/m.js::${EDGES[n - 1]}`, behaviour: `SENTINEL-BEHAVIOUR ${ST(n)}`, interface: 'browser', severity: 'medium' })))
  const order = queuePick(['sb-r1-1', 'sb-r1-2'], 2, SEED), kept = order[0], k = Number(kept.at(-1))
  expect(grades).toEqual([[env, o, '--at', sdEnd, '--sealed', '--reuse'], [env, o, '--at', bugSha(d, kept), '--sealed', '--reuse']])
  const bugs = bugsOf(d, 'r1')
  expect(bugs.map((b) => [b.id, b.state, b.why])).toEqual([1, 2].map((n) => [`sb-r1-${n}`, n === k ? 'kept' : 'ungraded', null]))
  expect(bugs[k - 1]).toEqual({ id: kept, task: 'r1', base: sdBase, end: bugSha(d, kept), fix: sdEnd, check: ST(k), edge: EDGES[k - 1], severity: 'medium', description: `SENTINEL-DESCRIPTION ${ST(k)}`, behaviour: `SENTINEL-BEHAVIOUR ${ST(k)}`,
    hunk: { file: 'src/m.js', old: LINES[k - 1] }, edit: candidate(ST(k), k - 1).edit, state: 'kept', why: null })
  expect(jsonAt(join(d, 'r1/seeded/work/seed.reply.md.run.json')).ids).toEqual([ST(1), ST(2)])
  expect(Bun.spawnSync(['git', '-C', sd, 'for-each-ref', 'refs/seeded']).stdout.toString()).toBe('')
})

test('external seed writes five candidates with the recipes, keeps its runner and grades the first three', async () => {
  const d = seedData('sb2'), calls = [], grades = [], o = join(d, 'x1-01/seeded/oracle')
  const r = await seedRun(d, EXT_ARGS(), calls, {}, seedGrade(ownFails(d), grades))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3')
  expect(calls[0][0]).toBe(join(d, 'env/seeded/x1-01.json'))
  const p = readFileSync(argOf(calls[0], '--prompt'), 'utf8')
  expect(p).toStartWith('SEED-EXT-BRIEF\n')
  expect(p).toContain(`EXT-RULES\n\n## The requirement`)
  expect(p).toContain(`\n5 bugs, one check each, with these ids:\n\n${[1, 2, 3, 4, 5].map((n) => `- \`${ST(n)}\``).join('\n')}\n`)
  for (const x of ['RECIPE-DOCKERFILE', 'RECIPE-TEST', 'SERVE-START', `\`${join(d, 'x1-01/seeded/work/seed')}\` (copied to \`/oracle\` in the container)`]) expect(p).toContain(x)
  for (const x of ['SENTINEL-BRIEFSHA', 'SCAFFOLD-CONFIG']) expect(p).not.toContain(x)
  expect(ls(o)).toEqual([...[1, 2, 3, 4, 5].map((n) => `${ST(n)}.spec.ts`), 'manifest.json', 'runner.json'].sort())
  expect(jsonAt(join(o, 'manifest.json'))[0].file).toBe(`${ST(1)}.spec.ts`)
})

test('bugs are graded in queuePick order and stop at the count', async () => {
  const d = seedData('sb3'), grades = []
  await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d), grades))
  const order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED)
  expect(atCalls(grades)).toEqual([sdEnd, ...order.slice(0, 3).map((id) => bugSha(d, id))])
  const states = Object.fromEntries(bugsOf(d, 'x1-01').map((b) => [b.id, b.state]))
  expect(order.map((id) => states[id])).toEqual(['kept', 'kept', 'kept', 'ungraded', 'ungraded'])
})

test('a check that passes on another bug stays valid', async () => {
  const d = seedData('sb4')
  await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d)))
  const kept = bugsOf(d, 'x1-01').filter((b) => b.state === 'kept'), v = validationIn(d, 'x1-01')
  expect(kept).toHaveLength(3)
  for (const b of kept) {
    expect(jsonAt(join(d, 'x1-01/seeded/grades', `${b.end.slice(0, 7)}.json`)).checks.filter((c) => c.result === 'pass')).toHaveLength(4) // the other checks pass at this bug
    expect(v.checks.find((c) => c.id === b.check)).toEqual({ id: b.check, ref: 'pass', bad: ['fail'], verdict: 'valid' })
  }
  expect(v).toMatchObject({ ref: sdEnd, base: null })
  expect(v.bad).toEqual(queuePick(kept.map((b) => b.id), 3, SEED).map((id) => bugSha(d, id)))
})

test('a bug with no results is error and the next spare is graded', async () => {
  const d = seedData('sb5'), grades = [], order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED)
  const over = (c) => (c === bugSha(d, order[0]) ? 'missing' : c === bugSha(d, order[1]) ? 'throw' : null)
  const r = await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d), grades, over))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=5 valid=3 weak=0 broken=0 error=2 kept=3')
  expect(atCalls(grades)).toEqual([sdEnd, ...order.map((id) => bugSha(d, id))])
  const bugs = new Map(bugsOf(d, 'x1-01').map((b) => [b.id, b]))
  expect(order.map((id) => [bugs.get(id).state, bugs.get(id).why])).toEqual([['dropped', 'error'], ['dropped', 'error'], ['kept', null], ['kept', null], ['kept', null]])
  const v = validationIn(d, 'x1-01')
  expect(v.checks.find((c) => c.id === bugs.get(order[0]).check)).toEqual({ id: bugs.get(order[0]).check, ref: 'pass', bad: ['error'], verdict: 'error', stage: 'grade exit 1' })
  expect(v.checks.find((c) => c.id === bugs.get(order[1]).check).stage).toBe('SENTINEL-THROW')
  expect(v.checks.find((c) => c.id === bugs.get(order[2]).check).stage).toBeUndefined()
})

test('a bug run that never gets ready is error, its grade is not reused, and the rerun\'s result stands', async () => {
  const d = seedData('sb35'), order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED), first = () => bugSha(d, order[0])
  const r = await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d), [], (c) => (c === first() ? 'not ready' : null)))
  expect(r.out).toBe('x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=4 valid=3 weak=0 broken=0 error=1 kept=3')
  const sha = first().slice(0, 7), bug1 = bugsOf(d, 'x1-01').find((b) => b.id === order[0])
  expect(existsSync(join(d, 'x1-01/seeded/grades', `${sha}.json`))).toBe(false)
  expect(validationIn(d, 'x1-01').checks.find((c) => c.id === bug1.check)).toEqual({ id: bug1.check, ref: 'pass', bad: ['error'], verdict: 'error', stage: `not ready at ${sha}` })
  appendFileSync(join(d, 'x1-01/build/readiness.tsv'), `${sha}\t${O8(join(d, 'x1-01/seeded/oracle'))}\tready\n`)
  await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d)))
  expect(bugsOf(d, 'x1-01').find((b) => b.id === order[0]).state).toBe('kept')
})

test('a bug whose run gave no result at all is error, its grade file goes, and the rerun\'s result stands', async () => {
  const d = seedData('sb43'), order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED), first = () => bugSha(d, order[0])
  const grades = [], table = (c, id) => (c === first() ? 'error' : ownFails(d)(c, id))
  const r = await seedRun(d, EXT_ARGS(), [], {}, seedGrade(table, grades))
  expect(r.out).toBe('x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=4 valid=3 weak=0 broken=0 error=1 kept=3')
  const bug1 = bugsOf(d, 'x1-01').find((b) => b.id === order[0])
  expect([bug1.state, bug1.why]).toEqual(['dropped', 'error'])
  expect(existsSync(join(d, 'x1-01/seeded/grades', `${first().slice(0, 7)}.json`))).toBe(false)
  grades.length = 0
  await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d), grades))
  expect(atCalls(grades)).toContain(first())
  expect(bugsOf(d, 'x1-01').find((b) => b.id === order[0]).state).toBe('kept')
})

test('a bug\'s check with no case in a good grade is error with a stage', async () => {
  const d = seedData('sb36'), order = queuePick(['sb-r1-1', 'sb-r1-2'], 2, SEED), first = Number(order[0].at(-1))
  await seedRun(d, RE_ARGS(d), [], {}, seedGrade(ownFails(d, (k) => (k === first ? 'error' : 'fail'))))
  expect(validationIn(d, 'r1').checks.find((c) => c.id === ST(first))).toEqual({ id: ST(first), ref: 'pass', bad: ['error'], verdict: 'error', stage: 'no result for this check' })
})

test('a check that fails at the end gets a fixer round and bugs wait for it', async () => {
  const d = seedData('sb6'), calls = [], grades = [], events = [], agents = []
  const table = (c, id, o) => (c === sdEnd ? (id === ST(2) && readFileSync(join(o, `${id}.spec.ts`), 'utf8') !== FIXED ? 'fail' : 'pass') : ownFails(d)(c, id))
  const agent = seeder(calls, { fix: { edit: () => FIXED } })
  const logged = async (a) => { events.push(a[1]); agents.push(a); return agent(a) }
  const r = await withData(d, () => quiet(() => oracle(['seed', ...RE_ARGS(d)], { agent: logged, grade: seedGrade(table, grades, () => null, events) })))
  expect(r.code).toBe(0)
  expect(r.out).toBe('r1 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  const end = `at ${S7}`
  expect(events.slice(0, 5)).toEqual(['seed-r1', end, `fix-seeded-1-r1-${S7}`, `compare-seeded-1-r1-${S7}`, end])
  expect(events.slice(5)).toHaveLength(1)
  const fix = agents.find((a) => a[1].startsWith('fix-'))
  expect(argOf(fix, '--at')).toBe(sdEnd)
  expect(argOf(fix, '--out')).toBe(join(d, 'r1/seeded/work/fix-seeded-1', `${S7}.fix.reply.md`))
  const fp = readFileSync(argOf(fix, '--prompt'), 'utf8')
  expect(fp).toContain(ST(2))
  expect(fp).not.toContain(`"id": "${ST(1)}"`)
  for (const x of ['edit', 'SENTINEL-DESCRIPTION']) expect(fp).not.toContain(x) // the bug stays out of the fixer's prompt
  expect(readFileSync(join(d, 'r1/seeded/oracle', `${ST(2)}.spec.ts`), 'utf8')).toBe(FIXED)
})

test('a check that still fails at the end after two rounds is broken and its bug is dropped', async () => {
  const d = seedData('sb7'), calls = [], grades = []
  const table = (c, id) => (c === sdEnd ? (id === ST(2) ? 'fail' : 'pass') : ownFails(d)(c, id))
  let round = 0
  const r = await seedRun(d, RE_ARGS(d), calls, { fix: { edit: () => `${CHECK}// fixed ${++round}\n` } }, seedGrade(table, grades))
  expect(r.out).toBe('r1 seed candidates=2 refused=0 pass-at-end=1 fixer=2 graded=1 valid=1 weak=0 broken=1 error=0 kept=1')
  expect(calls.filter((a) => a[1].startsWith('fix-')).map((a) => a[1])).toEqual([`fix-seeded-1-r1-${S7}`, `fix-seeded-2-r1-${S7}`])
  expect(atCalls(grades)).toEqual([sdEnd, sdEnd, sdEnd, bugSha(d, 'sb-r1-1')])
  const [one, two] = bugsOf(d, 'r1')
  expect([one.state, two.state, two.why, two.end]).toEqual(['kept', 'dropped', 'end', bugSha(d, 'sb-r1-2')])
  expect(validationIn(d, 'r1').checks.find((c) => c.id === ST(2))).toEqual({ id: ST(2), ref: 'fail', bad: [], verdict: 'broken' })
})

test('a refused fixer run counts no round', async () => {
  const d = seedData('sb37'), work = join(d, 'r1/seeded/work'), calls = []
  for (const r of [1, 2]) { mkdirSync(join(work, `fix-seeded-${r}`), { recursive: true }); writeFileSync(join(work, `fix-seeded-${r}`, `${S7}.fix.reply.md.run.json`), '{"promptSha":"old"}') }
  const r = await seedRun(d, RE_ARGS(d), calls, {}, seedGrade((c, id) => (c === sdEnd && id === ST(2) ? 'fail' : ownFails(d)(c, id))))
  expect(r.out.split('\n').at(-1)).toBe('r1 seed candidates=2 refused=0 pass-at-end=1 fixer=0 graded=1 valid=1 weak=0 broken=1 error=0 kept=1')
  expect(calls.map((a) => a[1])).toEqual(['seed-r1'])
})

test('a verdict at a bug gets no fixer', async () => {
  const d = seedData('sb8'), calls = [], order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED), res = ['pass', 'precondition', 'fail', 'fail', 'fail']
  const r = await seedRun(d, EXT_ARGS(), calls, {}, seedGrade(ownFails(d, (k) => res[order.indexOf(`sb-x1-01-${k}`)])))
  expect(r.out).toBe('x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=5 valid=3 weak=1 broken=1 error=0 kept=3')
  expect(calls).toHaveLength(1) // the seeder alone
  const by = new Map(bugsOf(d, 'x1-01').map((b) => [b.id, b]))
  expect(order.map((id) => [by.get(id).state, by.get(id).why])).toEqual([['dropped', 'weak'], ['dropped', 'broken'], ['kept', null], ['kept', null], ['kept', null]])
})

test('a refused candidate gets no commit and no run', async () => {
  const d = seedData('sb9'), grades = [], calls = []
  const tweak = (e, i) => [
    { ...e, edit: { ...e.edit, file: '../SENTINEL-OUT.js' }, origin: `../SENTINEL-OUT.js::${e.edge}` }, // git refuses a path outside the repo: no file, no crash
    { ...e, interface: 'none', file: undefined },
    { ...e, edit: { ...e.edit, find: 'SENTINEL-ABSENT' } },
    { ...e, edit: { file: 'src/m.js' } },
    e,
  ][i]
  const r = await seedRun(d, EXT_ARGS(), calls, { tweak }, seedGrade(ownFails(d), grades))
  expect(r.code).toBe(0)
  expect(r.out).toBe('x1-01 seed candidates=5 refused=4 pass-at-end=1 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  expect(sealedGit(d, 'for-each-ref', '--format=%(refname)', 'refs/seeded')).toBe('refs/seeded/sb-x1-01-5')
  expect(bugsOf(d, 'x1-01').map((b) => [b.state, b.why, b.end])).toEqual([['dropped', 'no file', null], ['dropped', 'interface', null], ['dropped', 'find', null], ['dropped', 'fields', null], ['kept', null, bugSha(d, 'sb-x1-01-5')]])
  expect(jsonAt(join(d, 'x1-01/seeded/oracle/manifest.json')).map((m) => m.id)).toEqual([ST(5)])
  expect(ls(join(d, 'x1-01/seeded/oracle'))).toEqual([`${ST(5)}.spec.ts`, 'manifest.json', 'runner.json'].sort())
  expect(validationIn(d, 'x1-01').checks.map((c) => c.id)).toEqual([ST(5)])
  expect(atCalls(grades)).toEqual([sdEnd, bugSha(d, 'sb-x1-01-5')])
})

test('seed refuses an origin that does not match its edit', async () => {
  const d = seedData('sb10'), grades = []
  const tweak = (e, i) => (i ? e : { ...e, origin: `src/m.js::${EDGES[3]}` })
  const r = await seedRun(d, RE_ARGS(d), [], { tweak }, seedGrade(ownFails(d), grades))
  expect(r.out).toBe('r1 seed candidates=2 refused=1 pass-at-end=1 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  expect(bugsOf(d, 'r1').map((b) => [b.check, b.state, b.why, b.end])).toEqual([[ST(1), 'dropped', 'origin', null], [ST(2), 'kept', null, bugSha(d, 'sb-r1-2')]])
  expect(bugSha(d, 'sb-r1-1')).toBe('')
})

test('seed refuses a later candidate with the same edit', async () => {
  const d = seedData('sb38'), grades = []
  const tweak = (e, i) => (i ? { ...e, edit: candidate(ST(1), 0).edit } : e) // another edge and check, one commit
  const r = await seedRun(d, RE_ARGS(d), [], { tweak }, seedGrade(ownFails(d), grades))
  expect(r.out).toBe('r1 seed candidates=2 refused=1 pass-at-end=1 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  expect(bugsOf(d, 'r1').map((b) => [b.id, b.state, b.why, b.end])).toEqual([['sb-r1-1', 'kept', null, bugSha(d, 'sb-r1-1')], ['sb-r1-2', 'dropped', 'duplicate', null]])
  expect(bugSha(d, 'sb-r1-2')).toBe('')
  expect(jsonAt(join(d, 'r1/seeded/oracle/manifest.json')).map((m) => m.id)).toEqual([ST(1)])
})

test('seed refuses a later candidate that gives the same commit', async () => {
  const d = seedData('sb42'), grades = [], one = (find, replace) => ({ file: 'src/m.js', find, replace })
  const tweak = (e, i) => ({ ...e, edit: i ? one('l7 = 7', 'l7 = 8') : one('const l7 = 7', 'const l7 = 8') }) // other text, same effect
  const r = await seedRun(d, RE_ARGS(d), [], { tweak }, seedGrade(ownFails(d), grades))
  expect(r.out).toBe('r1 seed candidates=2 refused=1 pass-at-end=1 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  expect(bugsOf(d, 'r1').map((b) => [b.id, b.state, b.why, b.end, b.hunk])).toEqual([['sb-r1-1', 'kept', null, bugSha(d, 'sb-r1-1'), { file: 'src/m.js', old: 7 }], ['sb-r1-2', 'dropped', 'duplicate', null, null]])
  expect(bugSha(d, 'sb-r1-2')).toBe('')
  expect(jsonAt(join(d, 'r1/seeded/oracle/manifest.json')).map((m) => m.id)).toEqual([ST(1)])
  // a rerun refuses it again and leaves the earlier bug
  const again = await seedRun(d, RE_ARGS(d), [], { tweak }, seedGrade(ownFails(d)))
  expect(again.out).toBe(r.out)
  expect(bugSha(d, 'sb-r1-2')).toBe('')
  expect(bugSha(d, 'sb-r1-1')).not.toBe('')
})

test('seed refuses an id it did not give and a check that names the seeded file', async () => {
  const d = seedData('sb11')
  const tweak = (e, i) => (i ? { ...e, id: ST(9) } : e)
  const agent = seeder([], { tweak })
  const naming = async (a) => { const code = await agent(a); if (a[1].startsWith('seed-')) { const dir = join(d, 'r1/seeded/work/seed'); writeFileSync(join(dir, `${ST(1)}.spec.ts`), `${CHECK}// src/m.js\n`) } return code }
  const r = await withData(d, () => quiet(() => oracle(['seed', ...RE_ARGS(d)], { agent: naming, grade: seedGrade(ownFails(d)) })))
  expect(r.out).toBe('r1 seed candidates=2 refused=2 pass-at-end=0 fixer=0 graded=0 valid=0 weak=0 broken=0 error=0 kept=0')
  expect(bugsOf(d, 'r1').map((b) => [b.id, b.why])).toEqual([['sb-r1-1', 'leak'], ['sb-r1-2', 'id']])
  expect(jsonAt(join(d, 'r1/seeded/oracle/manifest.json'))).toEqual([])
})

test('an external seed with no valid runner.json or no manifest stops before any commit', async () => {
  for (const [name, opts, line] of [['sb12', { runner: '{}' }, 'x1-01 seed runner.json missing or invalid'], ['sb13', { runner: null }, 'x1-01 seed runner.json missing or invalid'], ['sb14', { manifest: null }, 'x1-01 seed no manifest']]) {
    const d = seedData(name), grades = []
    const r = await seedRun(d, EXT_ARGS(), [], opts, seedGrade(ownFails(d), grades))
    expect([r.code, r.out.split('\n').at(-1)]).toEqual([1, line])
    expect(grades).toHaveLength(0)
    expect(sealedGit(d, 'for-each-ref', 'refs/seeded')).toBe('')
  }
})

test('an end run that never gets ready is not judged', async () => {
  const d = seedData('sb15'), docker = join(d, 'x1-01/docker.json'), grades = [], g = join(d, 'x1-01/seeded/grades', `${S7}.json`)
  mkdirSync(join(d, 'x1-01/build'), { recursive: true })
  writeFileSync(docker, JSON.stringify({ images: [], containers: [] }))
  // the end's run writes its not-ready line, naming the seeded oracle as it stands then
  const r = await seedRun(d, EXT_ARGS(), [], {}, seedGrade(() => 'error', grades, (c) => (c === sdEnd ? 'not ready' : null)))
  expect([r.code, r.out]).toEqual([1, 'x1-01 seed not judged'])
  expect(existsSync(g)).toBe(false) // so --reuse runs it again
  for (const f of ['bugs.json', `validation-${S7}.json`]) expect(existsSync(join(d, 'x1-01/seeded', f))).toBe(false)
  expect(jsonAt(docker).digests).toEqual({}) // removeRecorded ran
  // the task is run again: its end now ready, nothing was dropped
  appendFileSync(join(d, 'x1-01/build/readiness.tsv'), `${S7}\t${O8(join(d, 'x1-01/seeded/oracle'))}\tready\n`)
  const again = await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d), grades))
  expect([again.code, again.out]).toEqual([0, 'x1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3'])
})

test('a ready end with no results gets its fixer rounds, then is not judged and its grade goes', async () => {
  const d = seedData('sb39'), calls = [], grades = []
  let round = 0
  const r = await seedRun(d, RE_ARGS(d), calls, { fix: { edit: () => `${CHECK}// fixed ${++round}\n` } }, seedGrade(() => 'error', grades))
  expect([r.code, r.out]).toEqual([1, 'r1 seed not judged'])
  expect(calls.filter((a) => a[1].startsWith('fix-'))).toHaveLength(2)
  expect(atCalls(grades)).toEqual([sdEnd, sdEnd, sdEnd]) // no bug graded
  expect(existsSync(join(d, 'r1/seeded/grades', `${S7}.json`))).toBe(false)
  expect(existsSync(join(d, 'r1/seeded/bugs.json'))).toBe(false)
  // a fix that gives results judges the task
  const d2 = seedData('sb40')
  const table = (c, id, o) => (c === sdEnd ? (readFileSync(join(o, `${id}.spec.ts`), 'utf8') === FIXED ? 'pass' : 'error') : ownFails(d2)(c, id))
  const r2 = await seedRun(d2, RE_ARGS(d2), [], { fix: { edit: () => FIXED } }, seedGrade(table))
  expect([r2.code, r2.out]).toEqual([0, 'r1 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=1 valid=1 weak=0 broken=0 error=0 kept=1'])
})

test('a grade at the end that throws, exits non-zero or has no JUnit is not judged', async () => {
  for (const [name, how] of [['sb16', 'throw'], ['sb17', 'exit'], ['sb18', 'missing']]) {
    const d = seedData(name), r = await seedRun(d, RE_ARGS(d), [], {}, seedGrade(ownFails(d), [], () => how))
    expect([r.code, r.out]).toEqual([1, 'r1 seed not judged'])
    expect(existsSync(join(d, 'r1/seeded/bugs.json'))).toBe(false)
  }
  // and after a fixer's round
  const d = seedData('sb19'), n = { end: 0 }
  const over = (c) => (c === sdEnd && ++n.end === 2 ? 'missing' : null)
  const r = await seedRun(d, RE_ARGS(d), [], { fix: { edit: () => FIXED } }, seedGrade((c, id) => (id === ST(1) ? 'fail' : 'pass'), [], over))
  expect([r.code, r.out]).toEqual([1, 'r1 seed not judged'])
})

test('a rerun reuses the seeder record, the grades and a fixer\'s work and keeps the ids when another manifest grew', async () => {
  const d = seedData('sb20'), calls = [], grades = []
  mkdirSync(join(d, 'x9/oracle'), { recursive: true })
  writeFileSync(join(d, 'x9/oracle/manifest.json'), JSON.stringify([{ id: ST(4) }]))
  const table = (c, id, o) => (c === sdEnd ? (readFileSync(join(o, `${id}.spec.ts`), 'utf8') === FIXED || id !== ST(6) ? 'pass' : 'fail') : id === ST(4 + kOf(d, c)) ? 'fail' : 'pass')
  const opts = { fix: { edit: () => FIXED } }
  const r = await seedRun(d, RE_ARGS(d), calls, opts, seedGrade(table, grades))
  expect(r.out).toBe('r1 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=1 valid=1 weak=0 broken=0 error=0 kept=1')
  expect(jsonAt(join(d, 'r1/seeded/oracle/manifest.json')).map((m) => m.id)).toEqual([ST(5), ST(6)])
  const made = calls.length, tree = seedTree(d)
  writeFileSync(join(d, 'x9/oracle/manifest.json'), JSON.stringify([{ id: ST(50) }]))
  const again = await seedRun(d, RE_ARGS(d), calls, opts, seedGrade(table, grades))
  expect(again.out).toBe(r.out.replace('fixer=1', 'fixer=0')) // the fixed check passes now: no round this time
  expect(calls).toHaveLength(made) // no seeder and no fixer ran
  expect(seedTree(d).filter(([f]) => !f.includes('/x9/'))).toEqual(tree.filter(([f]) => !f.includes('/x9/')))
  expect(readFileSync(join(d, 'r1/seeded/oracle', `${ST(6)}.spec.ts`), 'utf8')).toBe(FIXED)
  expect(grades.at(-1).slice(-2)).toEqual(['--sealed', '--reuse'])
})

test('a seeder run whose prompt changed is refused', async () => {
  const d = seedData('sb21')
  await seedRun(d, RE_ARGS(d), [], {}, seedGrade(ownFails(d)))
  writeFileSync(join(d, 'r1/input.md'), 'SENTINEL-CHANGED\n')
  const r = await seedRun(d, RE_ARGS(d), [], {}, seedGrade(ownFails(d)))
  expect([r.code, r.out]).toEqual([1, 'r1 seed refused a run whose prompt differs from the one it ran with'])
})

test('validation lists a dropped check so unscored excludes it', async () => {
  const d = seedData('sb22'), order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED), res = ['pass', 'fail', 'fail', 'fail', 'fail']
  const table = (c, id) => (c === sdEnd && id === ST(Number(order[1].at(-1))) ? 'fail' : ownFails(d, (k) => res[order.indexOf(`sb-x1-01-${k}`)])(c, id))
  await seedRun(d, EXT_ARGS(), [], { fix: { edit: () => CHECK } }, seedGrade(table))
  const bugs = new Map(bugsOf(d, 'x1-01').map((b) => [b.id, b]))
  expect(order.map((id) => bugs.get(id).why)).toEqual(['weak', 'end', null, null, null])
  const ids = jsonAt(join(d, 'x1-01/seeded/oracle/manifest.json')).map((m) => m.id)
  expect(unscored([validationIn(d, 'x1-01')], ids)).toEqual([bugs.get(order[0]).check, bugs.get(order[1]).check].map((id) => ({ id, verdict: id === bugs.get(order[0]).check ? 'weak' : 'broken' })).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)))
})

test('an ungraded spare is excluded by unscored', async () => {
  const d = seedData('sb23'), order = queuePick([1, 2, 3, 4, 5].map((k) => `sb-x1-01-${k}`), 5, SEED)
  await seedRun(d, EXT_ARGS(), [], {}, seedGrade(ownFails(d)))
  const spares = bugsOf(d, 'x1-01').filter((b) => b.state === 'ungraded')
  expect(spares.map((b) => b.id).sort()).toEqual(order.slice(3).sort())
  const v = validationIn(d, 'x1-01')
  for (const b of spares) expect(v.checks.find((c) => c.id === b.check)).toEqual({ id: b.check, ref: 'pass', bad: [], verdict: 'error', stage: 'not graded' })
  const out = unscored([v], [1, 2, 3, 4, 5].map(ST))
  expect(out.map((e) => e.id).sort()).toEqual(spares.map((b) => b.check).sort())
  expect(out.every((e) => e.verdict === 'error')).toBe(true)
})

// kills: r1 seeded with one kept bug, then its fix oracle and, as given, its step oracle
const killData = async (name, step) => {
  const d = seedData(name)
  await seedRun(d, RE_ARGS(d), [], {}, seedGrade(ownFails(d)))
  for (const [o, ids] of [['r1/oracle', ['F1', 'F2', 'F3']], ['r1/step/oracle', ['S1', 'S2']]]) {
    mkdirSync(join(d, o), { recursive: true })
    writeFileSync(join(d, o, 'manifest.json'), JSON.stringify(ids.map((id) => ({ id }))))
  }
  if (step) writeFileSync(join(d, 'r1/step.json'), JSON.stringify(step))
  return d
}
const killRun = (d, args, grade) => withData(d, () => quiet(() => oracle(['kills', ...args], { grade })))

test('kills grades the step oracle only when step.json names it', async () => {
  const d = await killData('sb24', { oracle: 'step/oracle', ids: ['S1'] }), grades = [], env = join(d, 'env/seeded/re.json')
  const b = bugsOf(d, 'r1').find((x) => x.state === 'kept'), before = seedTree(d)
  const table = (c, id) => (c === sdEnd ? (id === 'F3' ? 'fail' : 'pass') : { F1: 'fail', F2: 'pass', F3: 'fail', S1: 'precondition', S2: 'error' }[id])
  const r = await killRun(d, RE_ARGS(d), seedGrade(table, grades))
  expect([r.code, r.out]).toEqual([0, 'r1 kills bugs=1 fix=1/1 step=1/1'])
  const at = (o, c) => [env, join(d, o), '--at', c, '--sealed', '--reuse']
  expect(grades).toEqual([at('r1/oracle', sdEnd), at('r1/oracle', b.end), at('r1/step/oracle', sdEnd), at('r1/step/oracle', b.end)])
  expect(jsonAt(join(d, 'r1/seeded/kills.json'))).toEqual([{ id: b.id, fix: { killed: 1, of: 2 }, step: { killed: 1, of: 2 } }]) // F3 failed at the end; an error is no kill
  // only kills.json and the new grades
  const was = new Map(before)
  expect(seedTree(d).filter(([f, text]) => was.get(f) !== text).map(([f]) => f.slice(d.length + 1)).sort())
    .toEqual(['r1/grades/' + `${S7}.json`, `r1/grades/${b.end.slice(0, 7)}.json`, 'r1/seeded/kills.json', `r1/step/grades/${S7}.json`, `r1/step/grades/${b.end.slice(0, 7)}.json`].sort())
  // an oracle: 'oracle' step, no step ids, no step.json: the fix oracle alone
  for (const [name, step] of [['sb25', { oracle: 'oracle', ids: ['S1'] }], ['sb26', { oracle: 'step/oracle', ids: [] }], ['sb27', null]]) {
    const dd = await killData(name, step), gg = []
    const x = await killRun(dd, RE_ARGS(dd), seedGrade(ownFails(dd), gg))
    expect([x.code, x.out]).toEqual([0, 'r1 kills bugs=1 fix=0/1 step=none'])
    expect(gg.every((g) => g[1] === join(dd, 'r1/oracle'))).toBe(true)
    expect(jsonAt(join(dd, 'r1/seeded/kills.json'))[0].step).toBeNull()
  }
})

test('kills leaves a good end grade byte for byte', async () => {
  const d = await killData('sb41', { oracle: 'step/oracle', ids: ['S1'] }), bug7 = bugsOf(d, 'r1').find((x) => x.state === 'kept').end, sets = ['r1/oracle', 'r1/step/oracle']
  const put = (o, over = {}) => {
    const f = join(d, o, '..', 'grades', `${S7}.json`), ids = jsonAt(join(d, o, 'manifest.json')).map((m) => m.id)
    mkdirSync(join(f, '..'), { recursive: true })
    writeFileSync(f, `${JSON.stringify({ commit: sdEnd, junit: 'ok', oracleSha: oracleSha(oracleFiles(join(d, o))), excluded: [], checks: ids.map((id) => ({ id, result: 'pass' })), ...over }, null, 7)}\n`)
    return f
  }
  const table = (c) => (c === sdEnd ? 'pass' : 'fail')
  const files = sets.map((o) => put(o)), bytes = files.map((f) => readFileSync(f, 'utf8')), grades = []
  const r = await killRun(d, RE_ARGS(d), seedGrade(table, grades))
  expect([r.code, r.out]).toEqual([0, 'r1 kills bugs=1 fix=1/1 step=1/1'])
  expect(files.map((f) => readFileSync(f, 'utf8'))).toEqual(bytes)
  expect(atCalls(grades)).toEqual([bug7, bug7])
  // another commit, a JUnit that was not ok, a changed folder or a not-ready line: it grades
  for (const [over, ready] of [[{ commit: sdBase }], [{ junit: 'missing' }], [{ oracleSha: 'old' }], [{}, `${S7}\t${O8(join(d, 'r1/oracle'))}\tnot ready\n`]]) {
    put('r1/oracle', over)
    rmSync(join(d, 'r1/build'), { recursive: true, force: true })
    if (ready) { mkdirSync(join(d, 'r1/build')); writeFileSync(join(d, 'r1/build/readiness.tsv'), ready) }
    const again = []
    await killRun(d, RE_ARGS(d), seedGrade(table, again))
    expect(atCalls(again)[0]).toBe(sdEnd)
  }
})

test('kills not judged keeps nothing, a not-ready grade goes, and an external task cleans up', async () => {
  const d = await killData('sb28', { oracle: 'step/oracle', ids: ['S1'] }), f = join(d, 'r1/seeded/kills.json')
  const r = await killRun(d, RE_ARGS(d), seedGrade(() => 'pass', [], (c) => (c === sdEnd ? 'missing' : null)))
  expect([r.code, r.out]).toEqual([1, 'r1 kills not judged'])
  expect(existsSync(f)).toBe(false)
  const empty = await killRun(d, RE_ARGS(d), seedGrade(() => 'error'))
  expect([empty.code, empty.out]).toEqual([1, 'r1 kills not judged'])
  expect(existsSync(f)).toBe(false)
  expect(existsSync(join(d, 'r1/grades', `${S7}.json`))).toBe(false) // --reuse would keep it
  // a bug grade with no results is no zero kill: it threw, had no JUnit, never got ready, or every check is `error`
  const bug7 = bugsOf(d, 'r1').find((x) => x.state === 'kept').end.slice(0, 7), end = (c) => c === sdEnd
  for (const [table, how] of [[() => 'fail', 'throw'], [() => 'fail', 'exit'], [() => 'fail', 'missing'], [() => 'fail', 'not ready'], [() => 'error', null]]) {
    const x = await killRun(d, RE_ARGS(d), seedGrade((c, id) => (end(c) ? 'pass' : table(c, id)), [], (c) => (end(c) ? null : how)))
    expect([x.code, x.out]).toEqual([1, 'r1 kills not judged'])
    expect(existsSync(f)).toBe(false)
    if (how === 'not ready' || how === null) expect(existsSync(join(d, 'r1/grades', `${bug7}.json`))).toBe(false)
    rmSync(join(d, 'r1/build'), { recursive: true, force: true })
  }
  // an `error` beside real results is no kill and no failure
  const mixed = await killRun(d, RE_ARGS(d), seedGrade((c, id) => (end(c) || id === 'F2' || id === 'S2' ? 'pass' : 'error')))
  expect([mixed.code, mixed.out]).toEqual([0, 'r1 kills bugs=1 fix=0/1 step=0/1'])
  expect(jsonAt(f)[0].fix).toEqual({ killed: 0, of: 3 })
  // no seed yet: nothing to grade
  const fresh = seedData('sb29')
  expect(await killRun(fresh, RE_ARGS(fresh), seedGrade(() => 'pass'))).toEqual({ code: 1, out: 'r1 kills not judged' })
  // external, three kept, no bug killed by a check that passes; the task's images removed after
  const e = seedData('sb30'), docker = join(e, 'x1-01/docker.json')
  await seedRun(e, EXT_ARGS(), [], {}, seedGrade(ownFails(e)))
  mkdirSync(join(e, 'x1-01/oracle'), { recursive: true })
  writeFileSync(join(e, 'x1-01/oracle/manifest.json'), JSON.stringify([{ id: 'F1' }]))
  writeFileSync(docker, JSON.stringify({ images: [], containers: [] }))
  const x = await killRun(e, EXT_ARGS(), seedGrade((c) => (c === sdEnd ? 'pass' : kOf(e, c) === bugsOf(e, 'x1-01').find((b) => b.state === 'kept').id.at(-1) * 1 ? 'fail' : 'pass')))
  expect([x.code, x.out]).toEqual([0, 'x1-01 kills bugs=3 fix=1/3 step=none'])
  expect(jsonAt(docker).digests).toEqual({})
})

test('seed and kills print only counts', async () => {
  const d = await killData('sb31', null)
  const tweak = (e, i) => (i ? { ...e, interface: 'none', file: undefined } : e)
  const e = seedData('sb32')
  const seeded = await seedRun(e, EXT_ARGS(), [], { tweak }, seedGrade(ownFails(e)))
  const k = await killRun(d, RE_ARGS(d), seedGrade(ownFails(d)))
  const notJudged = await seedRun(seedData('sb33'), EXT_ARGS(), [], {}, seedGrade(() => 'pass', [], () => 'throw'))
  expect(seeded.out).toMatch(/^x1-01 seed candidates=\d+ refused=\d+ pass-at-end=\d+ fixer=\d+ graded=\d+ valid=\d+ weak=\d+ broken=\d+ error=\d+ kept=\d+$/)
  expect(k.out).toMatch(/^r1 kills bugs=\d+ fix=\d+\/\d+ step=(\d+\/\d+|none)$/)
  for (const x of [seeded.out, k.out, notJudged.out]) for (const s of ['SENTINEL', 'src/m.js', 'const l', 'boundary', 'empty']) expect(x).not.toContain(s)
})

test('seed and kills take the task forms step takes', async () => {
  const d = seedData('sb34')
  await expect(withData(d, () => oracle(['seed', 'x1-01', 'r1', 'more']))).rejects.toThrow('usage: ')
  await expect(withData(d, () => oracle(['kills']))).rejects.toThrow('usage: ')
  await expect(withData(d, () => oracle(['seed', 'r1']))).rejects.toThrow('give its task file')
})

// --- step 9 ruling 7: the second batch (write --batch 2, validate --ids, classify --round b2, split of b2 halves) ---
// every file of a folder but node_modules, with its text
const textsOf = (dir) => readdirSync(dir, { recursive: true }).filter((f) => !f.split('/').includes('node_modules') && !lstatSync(join(dir, f)).isDirectory()).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')])

test('a batch 2 write keeps the commit\'s earlier checks and numbers after them', async () => {
  useSources()
  const s = k3.slice(0, 7), t1 = join(data, 't1/oracle'), t3 = join(data, 't3/oracle')
  for (const t of ['t1', 't2', 't3']) rmSync(join(data, t), { recursive: true, force: true })
  // earlier checks of this commit: T1 in t1, T2 in t3 (the scaffold as an earlier write left it), and T5 in a step oracle
  const earlier = (t, id, hunk) => ({ ...entry(id, hunk), fix_commit: k3Full, task: t })
  for (const [o, t, id, hunk] of [[t1, 't1', `${s}-T1`, 'src/a.txt:8'], [t3, 't3', `${s}-T2`, 'src/c.txt:1']]) {
    mkdirSync(o, { recursive: true })
    writeFileSync(join(o, 'manifest.json'), JSON.stringify([earlier(t, id, hunk)], null, 2) + '\n')
    writeFileSync(join(o, `${id}.spec.ts`), 'EARLIER\n')
    writeFileSync(join(o, 'run.config.ts'), 'OLD-CONFIG\n')
  }
  mkdirSync(join(data, 't2/step/oracle'), { recursive: true })
  writeFileSync(join(data, 't2/step/oracle/manifest.json'), JSON.stringify([{ id: `${s}-T5` }]))
  mkdirSync(join(data, 'step9'), { recursive: true })
  writeFileSync(join(data, 'step9/batch2.tsv'), `commit\ttask\tkind\n${s}\tt3\tlater\n`)
  const before1 = textsOf(t1), before3 = readFileSync(join(t3, 'manifest.json'), 'utf8')
  const calls = []
  const agent = writer(() => ({
    'manifest.json': JSON.stringify([entry(`${s}-T6`, 'src/c.txt:1'), entry(`${s}-T5`, 'src/c.txt:1'), entry(`${s}-T7`, 'src/a.txt:8')]),
    [`${s}-T6.spec.ts`]: 'NEW\n', [`${s}-T5.spec.ts`]: 'x\n', [`${s}-T7.spec.ts`]: 'x\n',
  }), calls)
  const r = await quiet(() => oracle(['write', task, k3Full, '--batch', '2'], { agent }))
  expect(r.code).toBe(0)
  const a = calls[0], arg = (k) => a[a.indexOf(k) + 1], work = join(data, 're-work', `${s}-b2`)
  expect(a[1]).toBe(`write-${s}-b2`)
  expect(arg('--prompt')).toBe(join(data, 're-work/prompts', `${s}-b2.md`))
  expect(arg('--out')).toBe(join(data, 're-work', `${s}-b2.reply.md`))
  expect(arg('--settings')).toBe(join(data, 're-work/settings', `${s}-b2.json`))
  expect(JSON.parse(readFileSync(arg('--settings'), 'utf8')).permissions.additionalDirectories).toEqual([work])
  const prompt = readFileSync(arg('--prompt'), 'utf8')
  for (const x of ['RE-BRIEF', `\`${s}-T6\``, 'src/c.txt:1', work]) expect(prompt).toContain(x)
  for (const x of ['src/a.txt:8', 'src/b.txt:5']) expect(prompt).not.toContain(x) // only the hunks of the pairs answered fix
  // the earlier checks stay byte for byte; the new one is appended after them, numbered after every manifest's highest
  expect(textsOf(t1)).toEqual(before1)
  expect(readFileSync(join(t3, `${s}-T2.spec.ts`), 'utf8')).toBe('EARLIER\n')
  expect(readFileSync(join(t3, 'run.config.ts'), 'utf8')).toBe('OLD-CONFIG\n')
  expect(readFileSync(join(t3, `${s}-T6.spec.ts`), 'utf8')).toBe('NEW\n')
  const m3 = manifestOf('t3')
  expect(JSON.stringify(m3[0])).toBe(JSON.stringify(JSON.parse(before3)[0]))
  expect(m3.slice(1)).toEqual([{ ...entry(`${s}-T6`, 'src/c.txt:1'), fix_commit: k3Full, task: 't3', batch: 2 }])
  expect(existsSync(join(data, 't2/oracle'))).toBe(false)
  expect(r.out).toContain(`write ${s}-b2: writer ran code 0, entries 3, written 1, refused 2`)
  expect(r.out).toContain('refused: id 1, hunk 1')
  expect(r.out).not.toContain('SENTINEL')
  // a rerun reuses the writer with the ids it was given (T6 now exists), and appends nothing twice
  const again = await quiet(() => oracle(['write', task, k3, '--batch', '2'], { agent }))
  expect(calls).toHaveLength(1)
  expect(again.out).toContain(`write ${s}-b2: writer reused code 0, entries 3, written 1, refused 2`)
  expect(manifestOf('t3')).toEqual(m3)
})

test('a batch 2 write refuses a commit no fix answer names', async () => {
  useSources()
  const calls = [], agent = writer(() => ({}), calls)
  mkdirSync(join(data, 'step9'), { recursive: true })
  writeFileSync(join(data, 'step9/batch2.tsv'), `commit\ttask\tkind\n${k3}\tt3\tlater\n`)
  expect(await quiet(() => oracle(['write', task, k1, '--batch', '2'], { agent }))).toEqual({ code: 1, out: `write ${k1}-b2 refused: no pair of step9/batch2.tsv names it` })
  rmSync(join(data, 'step9/batch2.tsv'))
  expect(await quiet(() => oracle(['write', task, k3, '--batch', '2'], { agent }))).toEqual({ code: 1, out: `write ${k3}-b2 refused: no pair of step9/batch2.tsv names it` })
  expect(calls).toHaveLength(0)
  await expect(quiet(() => oracle(['write', task, k3, '--batch', '3'], { agent }))).rejects.toThrow('usage: ')
})

test('validate --ids leaves every other entry unchanged', async () => {
  const [a, b, x, y] = [1, 2, 3, 4].map((n) => `${k1}-T${n}`), z = `${m1}-T1`
  const o = freshTask('t1', [entryAt(a, k1Full), entryAt(b, k1Full), entryAt(x, k1Full, { batch: 2 }), entryAt(y, k1Full, { batch: 2 }), entryAt(z, m1Full)],
    Object.fromEntries([a, b, x, y, z].map((id) => [`${id}.spec.ts`, `OLD ${id}\n`])))
  const old = { ref: k1Full, bad: ['p'], base: c0, at: 'old', checks: [{ id: a, ref: 'pass', verdict: 'valid' }, { id: b, verdict: 'weak' }, { id: x, verdict: 'error', stage: 's' }] }
  const vFile = join(data, 't1', `validation-${k1}.json`), oldText = JSON.stringify(old, null, 2) + '\n', manifest = readFileSync(join(o, 'manifest.json'), 'utf8')
  writeFileSync(vFile, oldText)
  writeFileSync(join(data, 't1', `validation-${m1}.json`), 'M1-UNTOUCHED\n')
  const calls = [], agents = [], graded = []
  // x is valid once its file says FIXED, y from the start
  const table = (ref, id, dir) => (id === y || readFileSync(join(dir, `${id}.spec.ts`), 'utf8') === 'FIXED\n' ? 'valid' : 'broken')
  const grade = async (args) => { graded.push(JSON.parse(readFileSync(join(args[1], 'manifest.json'), 'utf8')).map((m) => m.id)); return fakeGrade(table, calls)(args) }
  const r = await quiet(() => oracle(['validate', task, 't1', '--ids', `${x},${y}`], { grade, agent: fakeAgents({}, agents) }))
  expect(r.code).toBe(0)
  const tmpO = join(data, 't1/work/ids-b2/oracle')
  expect(existsSync(join(data, 't1/work/ids'))).toBe(false) // the folder is per call tag
  expect(calls).toEqual([1, 2].map(() => [task, tmpO, '--validate', k1Full, '--bad', parentOf(k1Full), '--base', c0, '--sealed', '--reuse']))
  expect(graded).toEqual([[x, y], [x, y]]) // a pass, and one after the kept fix: only the ids
  expect(ls(tmpO)).toEqual([`${x}.spec.ts`, `${y}.spec.ts`, 'manifest.json', 'node_modules', 'package.json', 'run.config.ts'])
  expect(agents.map((g) => g[1])).toEqual([`fix-b2-1-t1-${k1}`, `compare-b2-1-t1-${k1}`])
  expect(JSON.parse(readFileSync(flagOf(agents[0], '--settings'), 'utf8')).permissions.additionalDirectories[0]).toBe(join(data, 't1/work/fix-b2-1', k1))
  // the ids' entries replaced or added; every other entry and field as it was
  const text = readFileSync(vFile, 'utf8'), v = JSON.parse(text), cut = (t) => t.slice(0, t.indexOf(`"id": "${x}"`))
  expect(cut(text)).toBe(cut(oldText))
  expect({ ...v, checks: null }).toEqual({ ...old, checks: null })
  expect(v.checks).toEqual([...old.checks.slice(0, 2), { id: x, verdict: 'valid' }, { id: y, verdict: 'valid' }])
  expect(readFileSync(join(data, 't1', `validation-${m1}.json`), 'utf8')).toBe('M1-UNTOUCHED\n')
  // the kept fix is in the oracle; every other file and the manifest as they were
  expect(readFileSync(join(o, `${x}.spec.ts`), 'utf8')).toBe('FIXED\n')
  for (const id of [a, b, y, z]) expect(readFileSync(join(o, `${id}.spec.ts`), 'utf8')).toBe(`OLD ${id}\n`)
  expect(readFileSync(join(o, 'manifest.json'), 'utf8')).toBe(manifest)
  expect(r.out).toContain('t1: checks 2, valid 2, weak 0, broken 0, error 0, pre-existing 0, absent-at-base 0, interface none 0, fixer rounds 1,')
  expect(r.out).not.toContain('SENTINEL')
  await expect(quiet(() => oracle(['validate', task, 't1', '--ids', `${x},nope-T1`], { grade, agent: fakeAgents() }))).rejects.toThrow('not a check of its oracle')
  await expect(quiet(() => oracle(['validate', 's9-01', '--ids', x], { grade, agent: fakeAgents() }))).rejects.toThrow('usage: ')
})

test('the split pass of a b2 round regrades no entry outside its ids', async () => {
  const [a, b] = [`${k1}-T1`, `${k1}-T2`], spec = "import { test } from 'runner-lib'\n"
  for (const t of ['t2', 't3']) rmSync(join(data, t), { recursive: true, force: true })
  freshTask('t1', [entryAt(a, k1Full), entryAt(b, k1Full, { batch: 2 })], { [`${a}.spec.ts`]: spec, [`${b}.spec.ts`]: spec })
  for (const f of ['input.md', 'interface.md']) writeFileSync(join(data, 't1', f), 'SENTINEL-INPUT\n')
  for (const f of ['classify.md', 'split.md']) writeFileSync(join(data, 'briefs', f), 'BRIEF\n')
  const old = [{ id: a, ref: 'pass', verdict: 'valid' }, { id: b, verdict: 'valid' }]
  writeFileSync(join(data, 't1', `validation-${k1}.json`), JSON.stringify({ ref: k1Full, checks: old }, null, 2) + '\n')
  writeFileSync(join(data, 't1/labels.json'), JSON.stringify({ [a]: 'build' }))
  writeFileSync(join(data, 't1/agreement.json'), JSON.stringify({ checks: 1, partly: [], disputed: [], splitRounds: [{ name: 'classify-b2', ids: [b], partly: [b], disputed: [] }] }))
  const [h1, h2] = [3, 4].map((n) => `${k1}-T${n}`), calls = [], graded = []
  const split = (ids) => ({ 'manifest.json': JSON.stringify(ids.map((id) => ({ id, behaviour: 'b', severity: 'low' }))), ...Object.fromEntries(ids.map((id) => [`${id}.spec.ts`, spec])) })
  const agent = fake(calls, { rate: (r, id) => (id === h2 && r === 2 ? 'not traceable' : 'traceable'), split })
  const grade = async (args) => { graded.push([args[1], JSON.parse(readFileSync(join(args[1], 'manifest.json'), 'utf8')).map((m) => m.id)]); return fakeGrade(() => 'valid', [])(args) }
  const r = await quiet(() => oracle(['split', task, 't1'], { agent, grade }))
  expect(r.code).toBe(0)
  expect(r.out.split('\n').at(-1)).toBe('t1 split partly=1 split=1 failed=0 restored=0 settled=0 stale=0 new=2 classified=2 build=1 requirement=0 disputed=1')
  expect(graded).toEqual([[join(data, 't1/work/ids-split-b2/oracle'), [h1, h2]]]) // the halves only, never the fix commit's other checks
  expect(jsonAt(join(data, 't1', `validation-${k1}.json`)).checks).toEqual([...old, { id: h1, verdict: 'valid' }, { id: h2, verdict: 'valid' }])
  expect(jsonAt(join(data, 't1/oracle/manifest.json')).find((m) => m.id === b)).toMatchObject({ dropped: true, split_into: [h1, h2] })
  // the halves are classified in a round of their own whose name holds b2, so classify-2 takes its disputes
  expect(calls.filter((c) => c[1].startsWith('classify')).map((c) => c[1]).sort()).toEqual(['classify-split-b2-1-t1', 'classify-split-b2-2-t1'])
  expect(jsonAt(join(data, 't1/agreement.json')).splitRounds.map((x) => [x.name, x.ids, x.disputed])).toEqual([['classify-b2', [b], []], ['classify-split-b2', [h1, h2], [h2]]])
  expect(jsonAt(join(data, 't1/labels.json'))).toEqual({ [a]: 'build', [h1]: 'build' })
  expect(r.out).not.toContain('SENTINEL')
})

test('classify round b2 rates only the new checks', async () => {
  const d = clData('cb1'), f = FIX.slice(0, 7), id = (n) => `${f}-T${n}`, calls = [], task = join(d, 'env/r.json')
  // T1 rated by the main round; T5 scored but not of the second batch; T3 not scored; T4 interface none
  clTask(d, 'r1', FIX, [[id(1), 'valid'], [id(2), 'valid', { batch: 2 }], [id(3), 'broken', { batch: 2 }], [id(4), 'valid', { batch: 2, interface: 'none' }], [id(5), 'valid'], [id(6), 'absent-at-base', { batch: 2 }]],
    Object.fromEntries([1, 2, 3, 5, 6].map((n) => [`${id(n)}.spec.ts`, 'x\n'])))
  const agr = { n: 1, checks: 1, partly: [], disputed: [], usable: true }
  writeFileSync(join(d, 'r1/agreement.json'), JSON.stringify(agr))
  writeFileSync(join(d, 'r1/labels.json'), JSON.stringify({ [id(1)]: 'build' }))
  const rate = (r, x) => (x === id(6) && r === 2 ? 'not traceable' : 'traceable')
  const run = () => withData(d, () => quiet(() => oracle(['classify', task, 'r1', '--round', 'b2'], { agent: fake(calls, { rate }) })))
  expect(await run()).toEqual({ code: 0, out: 'r1 classify-b2 classified=2 build=1 requirement=0 partly=0 disputed=1 kappa=0.00 raw=0.50 ac1=0.38' })
  expect(jsonAt(join(d, 'r1/work/classify-b2/manifest.json')).map((x) => x.id)).toEqual([id(2), id(6)])
  expect(calls.map((c) => c[1]).sort()).toEqual(['classify-b2-1-r1', 'classify-b2-2-r1'])
  expect(jsonAt(join(d, 'r1/labels.json'))).toEqual({ [id(1)]: 'build', [id(2)]: 'build' })
  const a = jsonAt(join(d, 'r1/agreement.json'))
  expect({ ...a, splitRounds: null }).toEqual({ ...agr, splitRounds: null })
  expect(a.splitRounds).toHaveLength(1)
  expect(a.splitRounds[0]).toMatchObject({ name: 'classify-b2', ids: [id(2), id(6)], checks: 2, partly: [], disputed: [id(6)] })
  // nothing new: refused; a later write's new check gets a round of its own
  expect(await run()).toEqual({ code: 1, out: 'r1 classify-b2 refused: no new scored check' })
  const m = jsonAt(join(d, 'r1/oracle/manifest.json')), v = jsonAt(join(d, 'r1', `validation-${f}.json`))
  writeFileSync(join(d, 'r1/oracle/manifest.json'), JSON.stringify([...m, { ...m[1], id: id(7) }]))
  writeFileSync(join(d, 'r1/oracle', `${id(7)}.spec.ts`), 'x\n')
  writeFileSync(join(d, 'r1', `validation-${f}.json`), JSON.stringify({ ...v, checks: [...v.checks, { id: id(7), verdict: 'valid' }] }))
  expect((await run()).out).toBe('r1 classify-b2-n2 classified=1 build=1 requirement=0 partly=0 disputed=0 kappa=1.00 raw=1.00 ac1=1.00')
  expect(jsonAt(join(d, 'r1/agreement.json')).splitRounds.map((x) => [x.name, x.ids])).toEqual([['classify-b2', [id(2), id(6)]], ['classify-b2-n2', [id(7)]]])
  await expect(withData(d, () => oracle(['classify', task, 'r1', '--round', 'b3'], { agent: fake(calls) }))).rejects.toThrow('usage: ')
})
