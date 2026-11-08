import { test, expect, spyOn, afterAll } from 'bun:test'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nRule, sigmaD, trial } from '../bench/trial.mjs'
import { pairedTasks } from '../bench/power.mjs'
import { queuePick } from '../bench/lib/oracle.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-trial-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const SEED = 'seed-trial'
const EXT = ['t1', 't2', 'cold', 'walked'] // in sample.tsv; the private tasks p1, p2 are not
const PRIV = ['p1', 'p2']
const ALL = [...EXT, ...PRIV]
const shaOf = (branch) => createHash('sha1').update(branch).digest('hex')
const nameOf = (task, arm, n) => `${task}-${arm}-${n}`
const json = (f) => JSON.parse(readFileSync(f, 'utf8'))

const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out: out.join('\n') } } catch (e) { return { code: 'threw', out: out.join('\n'), error: e.message } } finally { a.mockRestore(); b.mockRestore() }
}
const withData = async (d, fn) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await fn() } finally { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
}
const go = (d, args, inj) => withData(d, () => quiet(() => trial(args, inj)))

// t1 t2 external with step ids; p1 p2 real-estate shaped: step/oracle with ids. tasks.txt names t1 t2 p1 p2
function world(name, { tasks = ['t1', 't2', 'p1', 'p2'] } = {}) {
  const d = join(tmp, name)
  for (const t of ALL) for (const x of ['grades', 'step/grades', 'build']) mkdirSync(join(d, t, x), { recursive: true })
  for (const x of ['ext', 'env/box', 'results', 'trial', 'step11']) mkdirSync(join(d, x), { recursive: true })
  const head = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tcold_setup'
  writeFileSync(join(d, 'ext/sample.tsv'), [head, ...EXT.map((t) => `${t}\ts1\t1\t1\town/${t}#1\tu\t1\t1\tbase-${t}\tend-${t}\t${t === 'cold' ? 'yes' : 'no'}`), ''].join('\n'))
  writeFileSync(join(d, 'tasks.json'), JSON.stringify(Object.fromEntries(PRIV.map((t) => [t, { base: `base-${t}`, end: `end-${t}` }]))))
  writeFileSync(join(d, 'ext/groups.json'), JSON.stringify({ seed: SEED, groups: [] }))
  writeFileSync(join(d, 'arms.json'), JSON.stringify({ model: 'M', smallModel: 'S', cli: 'x', plugins: { H: [], W: [] } }))
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'trial/tasks.txt'), tasks.join('\n') + '\n')
  writeFileSync(join(d, 'step11/walked.txt'), 'walked\np2x\n')
  writeFileSync(join(d, 'trial/floor.json'), JSON.stringify(Object.fromEntries(ALL.map((t) => [t, { H: 0, B: 0 }])))) // a trial already started with no earlier run
  for (const t of ALL) {
    writeFileSync(join(d, 'env/box', `${t}.json`), JSON.stringify({ name: t, repo: join(d, 'repo'), db: null, port: 4000, start: null, ready: null, setup: [], teardown: [], oracle: 'x', junit: 'out/junit.xml', timeoutSec: 60 }))
    writeFileSync(join(d, t, 'step.json'), JSON.stringify(PRIV.includes(t) ? { oracle: 'step/oracle', ids: ['a1', 'a2'], candidates: 1, seed: 's' } : { oracle: 'oracle', ids: ['a1', 'a2'], candidates: 1, seed: 's' }))
  }
  return d
}

const OSHA = { grades: 'abcdef12', 'step/grades': '12345678' }
function putGrade(d, task, sha, { pass = ['a1', 'a2', 'a3'], rel = 'grades' } = {}) {
  const sha7 = sha.slice(0, 7)
  writeFileSync(join(d, task, rel, `${sha7}.json`), JSON.stringify({ commit: sha, task, junit: 'ok', excluded: [], oracleSha: OSHA[rel].padEnd(64, '0'),
    checks: ['a1', 'a2', 'a3'].map((id) => ({ id, bucket: 'requirement', severity: 'high', result: pass.includes(id) ? 'pass' : 'fail' })) }))
  appendFileSync(join(d, task, 'build/readiness.tsv'), `${sha7}\t${OSHA[rel]}\tready\n`)
}
const record = (task, arm, n, o = {}) => ({ task, arm, run: n, base: 'b', model: 'M', status: 'done', reason: null, machine: null, interventions: 0,
  start: '2026-11-08T10:00:00.000Z', end: '2026-11-08T10:30:00.000Z', usage: { input: 100, output: 50, cacheRead: 1000, cacheWrite: 7 }, branch: `bench/${nameOf(task, arm, n)}`, ...o })
function putRun(d, task, arm, { pass, grade = true, rec = {} } = {}) {
  writeFileSync(join(d, 'results', `${nameOf(task, arm, 1)}.json`), JSON.stringify(record(task, arm, 1, rec)))
  if (!grade) return
  const sha = shaOf(`bench/${nameOf(task, arm, 1)}`)
  putGrade(d, task, sha, { pass })
  if (PRIV.includes(task)) putGrade(d, task, sha, { pass, rel: 'step/grades' })
}

function fakes(d) {
  const calls = []
  const runArm = async (args) => {
    const [taskFile, arm, n] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1')
    calls.push(`run ${nameOf(task, arm, n)}`)
    expect(taskFile).toBe(join(d, 'env/box', `${task}.json`))
    writeFileSync(join(d, 'results', `${nameOf(task, arm, n)}.json`), JSON.stringify(record(task, arm, Number(n))))
    return 0
  }
  const grade = async (args) => {
    const [taskFile, oracle, at, sha, sealed, ...more] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1')
    expect(taskFile).toBe(join(d, 'env/box', `${task}.json`)) // the box task file, not env/canary/<task>.json
    expect([at, sealed, more.length]).toEqual(['--at', '--sealed', 0])
    const step = oracle === join(d, task, 'step/oracle')
    expect(oracle === join(d, task, 'oracle') || step).toBe(true)
    calls.push(`grade ${task} ${step ? 'step ' : ''}${sha.slice(0, 7)}`)
    putGrade(d, task, sha, { rel: step ? 'step/grades' : 'grades' })
    return 0
  }
  return { calls, runArm, grade, sha: (_t, branch) => shaOf(branch), daemon: async () => {}, diskFree: async () => 100, cacheBytes: async () => 1e9, prune: async () => {} }
}

test('sigmaD is the sample standard deviation', () => {
  expect(sigmaD([0, 0.5, 1, 0.5])).toBeCloseTo(0.408248, 6)
})

test('nRule keeps 24 up to 0.25 and recomputes above', () => {
  expect(nRule(0.25)).toBe(24)
  expect(nRule(0.1)).toBe(24)
  expect(nRule(0.3)).toBe(34)
  expect(nRule(0.3)).toBe(pairedTasks(0.3, 0.15) + 2)
})

test('the trial refuses a task not in tasks.txt, a cold task and a walked task', async () => {
  const d = world('refuse', { tasks: ['t1', 'cold', 'walked'] }), f = fakes(d)
  const no = await go(d, ['run', 'p1'], f)
  expect(no.error).toContain('p1 is not in trial/tasks.txt')
  expect((await go(d, ['run', 'cold'], f)).error).toContain('cold-setup')
  expect((await go(d, ['run', 'walked'], f)).error).toContain('walked')
  expect(f.calls).toEqual([])
})

test('the order follows queuePick, each product graded right after its run with the task\'s oracle kinds', async () => {
  const d = world('order'), f = fakes(d)
  expect((await go(d, ['run', 'p1'], f)).code).toBe(0)
  const seq = queuePick(['B:1', 'H:1'].map((s) => `p1:${s}`), 2, SEED).map((s) => s.split(':')[1]), want = []
  for (const arm of seq) { const s7 = shaOf(`bench/${nameOf('p1', arm, 1)}`).slice(0, 7); want.push(`run ${nameOf('p1', arm, 1)}`, `grade p1 ${s7}`, `grade p1 step ${s7}`) }
  expect(f.calls).toEqual(want)
  // an external task has the oracle only, and a rerun repeats nothing
  const f2 = fakes(d)
  await go(d, ['run', 't1'], f2)
  expect(f2.calls.filter((c) => c.startsWith('grade')).every((c) => !c.includes('step'))).toBe(true)
  expect(f2.calls.filter((c) => c.startsWith('grade')).length).toBe(2)
  const f3 = fakes(d)
  expect((await go(d, ['run', 'p1'], f3)).code).toBe(0)
  expect(f3.calls).toEqual([])
  expect(json(join(d, 'trial/attempts.json'))[shaOf(`bench/${nameOf('p1', seq[0], 1)}`)]).toBe(1)
})

test('the report is not judged while a run has no score', async () => {
  const d = world('notjudged')
  for (const t of ['t1', 't2', 'p1']) for (const arm of ['B', 'H']) putRun(d, t, arm, { pass: ['a1', 'a2', 'a3'] })
  putRun(d, 'p2', 'B', { pass: ['a1', 'a2', 'a3'] })
  putRun(d, 'p2', 'H', { grade: false })
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('trial not judged')
  expect(r.out).toContain('p2 H build=none requirement=none passed=none tokens=150')
  expect(json(join(d, 'trial/report.json'))).toMatchObject({ judged: false, sigma_d: null, N: null })
})

test('the report prints the measures, sigma_d, N and the walk, and no check id', async () => {
  const d = world('judged')
  const H = { t1: ['a1', 'a2', 'a3'], t2: ['a1', 'a3'], p1: ['a3'], p2: ['a2', 'a3'] } // build(H) 1, 0.5, 0, 0.5 against build(B) 1
  for (const t of ['t1', 't2', 'p1', 'p2']) { putRun(d, t, 'B', { pass: ['a1', 'a2', 'a3'] }); putRun(d, t, 'H', { pass: H[t], rec: { interventions: 2, reason: 'no DONE', status: 'abandoned', usage: { input: 10, output: 5, cacheRead: 99, cacheWrite: 1 } } }) }
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('t1 B build=1.00 requirement=1.00 passed=yes tokens=150 cache=1000 minutes=30.0 interventions=0 end=done')
  expect(r.out).toContain('p1 H build=0.00 requirement=0.33 passed=no tokens=15 cache=99 minutes=30.0 interventions=2 end=no_DONE')
  const ds = [0, -0.5, -1, -0.5]
  expect(r.out).toContain(`trial sigma_d=${sigmaD(ds).toFixed(3)} sigma_d_ext=${sigmaD([0, -0.5]).toFixed(3)} n=4 N=${nRule(sigmaD(ds))} h1_n=4 walk=yes`)
  const rep = json(join(d, 'trial/report.json'))
  expect(rep).toMatchObject({ judged: true, n: 4, h1_n: 4, walk: true, N: nRule(sigmaD(ds)) })
  expect(rep.sigma_d).toBeCloseTo(sigmaD(ds), 9)
  expect(/\ba[123]\b/.test(r.out + JSON.stringify(rep))).toBe(false) // no check id anywhere
  expect(existsSync(join(d, 'trial/report.json'))).toBe(true)
})

// fix round 1
const ids = (d, task, v) => writeFileSync(join(d, task, 'step.json'), JSON.stringify({ oracle: 'oracle', ids: v, candidates: 0, seed: 's' }))

test('the trial counts only records above its floor: a canary B run is neither taken nor regraded', async () => {
  const d = world('floor', { tasks: ['t1'] })
  rmSync(join(d, 'trial/floor.json'))
  const olds = [1, 2].map((n) => {
    const name = nameOf('t1', 'B', n), sha = shaOf(`bench/${name}`), f = join(d, 't1/grades', `${sha.slice(0, 7)}.json`)
    writeFileSync(join(d, 'results', `${name}.json`), JSON.stringify(record('t1', 'B', n)))
    putGrade(d, 't1', sha, { pass: ['a1'] })
    writeFileSync(join(d, 't1/build/readiness.tsv'), `${sha.slice(0, 7)}\tready\n`) // a step 8 line: no oracle column
    return [f, readFileSync(f, 'utf8')]
  })
  // before any run the report counts none of them
  const early = await go(d, ['report'], fakes(d))
  expect(early.out).toContain('t1 B no standing run')
  const f = fakes(d), r = await go(d, ['run', 't1'], f)
  expect(r.code).toBe(0)
  expect(f.calls.filter((c) => c.startsWith('run ')).sort()).toEqual(['run t1-B-3', 'run t1-H-1'])
  expect(f.calls.filter((c) => c.startsWith('grade ')).map((c) => c.split(' ')[2]).sort()).toEqual([shaOf('bench/t1-B-3'), shaOf('bench/t1-H-1')].map((x) => x.slice(0, 7)).sort())
  for (const [file, text] of olds) expect(readFileSync(file, 'utf8')).toBe(text)
  expect(json(join(d, 'trial/floor.json'))).toEqual({ t1: { H: 0, B: 2 } })
  const f2 = fakes(d)
  await go(d, ['run', 't1'], f2)
  expect(f2.calls).toEqual([]) // a rerun neither moves the floor nor repeats a run
  expect(json(join(d, 'trial/floor.json'))).toEqual({ t1: { H: 0, B: 2 } })
  await go(d, ['report'], fakes(d))
  expect(json(join(d, 'trial/report.json')).runs.map((x) => [x.arm, x.run]).sort()).toEqual([['B', 3], ['H', 1]])
})

test('a task with no step id is refused by run and tells report not judged', async () => {
  const d = world('nostep')
  ids(d, 't2', [])
  const r = await go(d, ['run', 't2'], fakes(d))
  expect(r.error).toContain('t2: no step id')
  for (const t of ['t1', 'p1', 'p2']) for (const arm of ['B', 'H']) putRun(d, t, arm, { pass: ['a1', 'a2', 'a3'] })
  const rep = await go(d, ['report'], fakes(d))
  expect(rep.code).toBe(0)
  expect(rep.out).toContain('trial not judged: t2: no step id')
  expect(json(join(d, 'trial/report.json'))).toMatchObject({ judged: false, reason: ['t2: no step id'] })
})

test('a task in walked.txt is refused even with no row in sample.tsv', async () => {
  const d = world('walkedp'), f = fakes(d)
  writeFileSync(join(d, 'step11/walked.txt'), 'p2\n')
  expect((await go(d, ['run', 'p2'], f)).error).toContain('p2 is a walked task')
  expect(f.calls).toEqual([])
})

test('report applies the gates of run, and CR line ends do not hide a cold task', async () => {
  const d = world('gates')
  const sample = readFileSync(join(d, 'ext/sample.tsv'), 'utf8').replace(/\n/g, '\r\n')
  writeFileSync(join(d, 'ext/sample.tsv'), sample)
  writeFileSync(join(d, 'trial/tasks.txt'), 't1\r\ncold\r\n')
  expect((await go(d, ['run', 'cold'], fakes(d))).error).toContain('cold-setup')
  expect((await go(d, ['report'], fakes(d))).error).toContain('cold-setup')
  expect((await go(d, ['run', 't1'], fakes(d))).code).toBe(0) // tasks.txt with CRLF still names t1
})

test('report catches only a missing score: any other error propagates', async () => {
  const d = world('propagate', { tasks: ['t1'] })
  putRun(d, 't1', 'B', { pass: ['a1', 'a2', 'a3'] })
  putRun(d, 't1', 'H', { grade: false })
  const sha = shaOf('bench/t1-H-1')
  writeFileSync(join(d, 't1/grades', `${sha.slice(0, 7)}.json`), JSON.stringify({ commit: sha, junit: 'ok' })) // a grade with no checks
  writeFileSync(join(d, 'trial/attempts.json'), JSON.stringify({ [sha]: 2 }))
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe('threw')
  expect(r.error).toMatch(/checks|undefined/)
})
