import { test, expect, spyOn, afterAll } from 'bun:test'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canary, extendedTasks } from '../bench/canary.mjs'
import { oracleCommand } from '../bench/ext.mjs'
import { bootstrapMean, intervalVerdict, tInterval } from '../bench/lib/score.mjs'
import { loadTask } from '../bench/lib/task.mjs'
import { queuePick } from '../bench/lib/oracle.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-canary-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const SEED = 'seed-canary'
// the first two tasks of each stack are the canary's six; the third of s1 and s2 must stay out
const TASKS = ['s1-01', 's1-02', 's1-03', 's2-01', 's2-02', 's2-03', 's3-01', 's3-02']
const SIX = ['s1-01', 's1-02', 's2-01', 's2-02', 's3-01', 's3-02']
const NO_STEP = ['s1-01', 's3-01']
const shaOf = (branch) => createHash('sha1').update(branch).digest('hex')
const nameOf = (task, arm, n) => `${task}-${arm}-${n}`

const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out: out.join('\n') } } finally { a.mockRestore(); b.mockRestore() }
}
const withData = async (d, fn) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await fn() } finally { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
}
const json = (f) => JSON.parse(readFileSync(f, 'utf8'))

function world(name, { small = 'S' } = {}) {
  const d = join(tmp, name)
  for (const x of ['ext', 'env', 'results', ...TASKS.flatMap((t) => [`${t}/grades`, `${t}/build`])]) mkdirSync(join(d, x), { recursive: true })
  const head = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tcold_setup'
  writeFileSync(join(d, 'ext/sample.tsv'), [head, ...TASKS.map((t) => `${t}\t${t.slice(0, 2)}\t1\t1\town/${t}#1\tu\t1\t1\tbase-${t}\tend-${t}\tno`), ''].join('\n'))
  writeFileSync(join(d, 'ext/groups.json'), JSON.stringify({ seed: SEED, groups: [] }))
  writeFileSync(join(d, 'arms.json'), JSON.stringify({ model: 'M', smallModel: small, cli: 'x', plugins: { H: [], W: [] } }))
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  for (const t of TASKS) writeFileSync(join(d, 'env', `${t}.json`), JSON.stringify({ name: t, repo: join(d, 'repo'), db: null, port: 4000, start: null, ready: null, setup: [], teardown: [],
    oracle: `bun /main/bench/ext.mjs oracle-run ${t}`, junit: 'out/junit.xml', timeoutSec: 60 }))
  for (const t of TASKS) writeFileSync(join(d, t, 'step.json'), JSON.stringify(NO_STEP.includes(t) ? { oracle: 'step/oracle', ids: [], candidates: 0, seed: 's' } : { oracle: 'oracle', ids: ['a1'], candidates: 1, seed: 's' }))
  return d
}

// a grade file as grade.mjs writes it: a1 is the step check (build), a2 the other one
// the readiness line is the grade's oracle's (step 11 ruling 7): another oracle's line at the same commit does not count
const OSHA = 'abcdef12'.padEnd(64, '0')
function putGrade(d, task, sha, { pass = ['a1', 'a2'], junit = 'ok', ready = 'ready' } = {}) {
  const sha7 = sha.slice(0, 7), ok = junit === 'ok'
  writeFileSync(join(d, task, 'grades', `${sha7}.json`), JSON.stringify({ commit: sha, task, junit, excluded: [], oracleSha: OSHA,
    checks: ['a1', 'a2'].map((id) => ({ id, bucket: 'requirement', severity: 'high', result: ok && pass.includes(id) ? 'pass' : ok ? 'fail' : 'error' })) }))
  appendFileSync(join(d, task, 'build', 'readiness.tsv'), `${sha7}\t${OSHA.slice(0, 8)}\t${ready}\n${sha7}\t99999999\t${ready === 'ready' ? 'not ready' : 'ready'}\n`)
}
const record = (task, arm, n, o = {}) => ({ task, arm, run: n, base: 'b', model: arm === 'B' ? 'M' : 'S', status: 'done', reason: null, machine: null,
  start: '2026-11-06T10:00:00.000Z', end: '2026-11-06T10:30:00.000Z', usage: { input: 100, output: 50, cacheRead: 1000, cacheWrite: 7 }, models: [],
  toolUses: { Bash: 2 }, envCommit: `env-${task}`, branch: `bench/${nameOf(task, arm, n)}`, ...o })
function putRun(d, task, arm, n, { rec = {}, grade = {} } = {}) {
  writeFileSync(join(d, 'results', `${nameOf(task, arm, n)}.json`), JSON.stringify(record(task, arm, n, rec)))
  if (grade !== null) putGrade(d, task, shaOf(`bench/${nameOf(task, arm, n)}`), grade)
}

// fakes. runPlan['<task>-<arm>-<n>']: an exit code (2: no record) or { code, ...record fields }; gradePlan[sha7]: results of its calls in turn
function fakes(d, { runPlan = {}, gradePlan = {}, passOf = (arm) => (arm === 'B' ? ['a1', 'a2'] : ['a2']), daemonDown = () => false, cache = 1e9, free = 100 } = {}) {
  const calls = [], pruned = [], seen = {}, armOf = {}
  const runArm = async (args) => {
    const [taskFile, arm, n] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1'), name = nameOf(task, arm, n)
    calls.push(`run ${name}`)
    expect(args.slice(3)).toEqual(['--input', join(d, task, 'input.md'), '--at', `base-${task}`])
    expect(taskFile).toBe(join(d, 'env', `${task}.json`))
    const plan = runPlan[name] ?? 0
    if (plan === 'throw') throw new Error('runArm blew up')
    const code = typeof plan === 'number' ? plan : plan.code ?? 0
    if (code === 2) return 2
    const { code: _c, ...extra } = typeof plan === 'number' ? {} : plan
    writeFileSync(join(d, 'results', `${name}.json`), JSON.stringify(record(task, arm, Number(n), { model: arm === 'B' ? 'M' : json(join(d, 'arms.json')).smallModel, ...(code === 3 ? { status: 'abandoned', reason: 'machine', machine: 'killed', branch: null, ...extra } : extra) })))
    armOf[shaOf(`bench/${name}`)] = arm
    return code
  }
  const grade = async (args) => {
    const [taskFile, oracle, at, sha, sealed, ...more] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1')
    expect(taskFile).toBe(join(d, 'env/canary', `${task}.json`)) // never the task file whose oracle is the main checkout's
    expect([at, sealed, more.length]).toEqual(['--at', '--sealed', 0]) // sealed, and no --reuse
    expect(oracle).toBe(join(d, task, 'oracle'))
    calls.push(`grade ${task} ${sha.slice(0, 7)}`)
    const k = seen[sha] = (seen[sha] ?? 0) + 1, step = (gradePlan[sha.slice(0, 7)] ?? [])[k - 1] ?? 'ok'
    if (step === 'throw') throw new Error('grade blew up')
    if (step === 'daemon') throw new Error('docker daemon: gone')
    const arm = [...Object.entries(armOf)].find(([s]) => s === sha)?.[1] ?? 'B'
    if (step === 'nofile') return 1 // a grade that wrote nothing
    if (step === 'ok') putGrade(d, task, sha, { pass: passOf(arm) })
    else if (step === 'allerror') { putGrade(d, task, sha); const f = join(d, task, 'grades', `${sha.slice(0, 7)}.json`), g = json(f); g.checks.forEach((c) => { c.result = 'error' }); writeFileSync(f, JSON.stringify(g)) } // ready, JUnit ok, no result
    else if (step === 'memory') { putGrade(d, task, sha, { junit: 'missing', ready: 'memory' }); return 1 }
    else putGrade(d, task, sha, { junit: step === 'nojunit' ? 'missing' : 'ok', ready: step === 'notready' ? 'not ready' : 'ready', pass: [] })
    return step === 'ok' ? 0 : 1
  }
  return { calls, pruned, runArm, grade, sha: (_t, branch) => shaOf(branch), daemon: async () => { if (daemonDown()) throw new Error('docker daemon: down') }, diskFree: async () => free,
    cacheBytes: async () => cache, prune: async () => { pruned.push(1) } }
}
const go = (d, args, inj) => withData(d, () => quiet(() => canary(args, inj)))
// the arm slots of queuePick for a task, as ['B', 'B-', ...]
const order = (task) => queuePick(['B:1', 'B:2', 'B-:1', 'B-:2'].map((s) => `${task}:${s}`), 4, SEED).map((s) => s.split(':')[1])

test('runs go in queuePick order, each graded right after it', async () => {
  const d = world('order'), f = fakes(d)
  const r = await go(d, ['run', 's2-01'], f)
  expect(r.code).toBe(0)
  const seq = order('s2-01'), count = {}, want = []
  for (const arm of seq) { const n = (count[arm] = (count[arm] ?? 0) + 1); const name = nameOf('s2-01', arm, n); want.push(`run ${name}`, `grade s2-01 ${shaOf(`bench/${name}`).slice(0, 7)}`) }
  expect(f.calls).toEqual(want)
  expect(r.out.split('\n').filter((l) => l.startsWith('s2-01 '))).toEqual(seq.map((arm, i) => `s2-01 ${arm} ${seq.slice(0, i + 1).filter((a) => a === arm).length} done grade=ok`))
})

test('k counts runs that are not machine, and a memory one is printed', async () => {
  const d = world('kmach'), f = fakes(d, { runPlan: { 's1-02-B-1': { code: 3, machine: 'memory' }, 's1-02-B--2': { code: 3, machine: 'killed' } } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(0)
  const runs = f.calls.filter((c) => c.startsWith('run ')).map((c) => c.slice(4))
  expect(runs.filter((n) => n.startsWith('s1-02-B-') && !n.startsWith('s1-02-B--')).sort()).toEqual(['s1-02-B-1', 's1-02-B-2', 's1-02-B-3']) // the rerun takes the next number
  expect(runs.filter((n) => n.startsWith('s1-02-B--')).sort()).toEqual(['s1-02-B--1', 's1-02-B--2', 's1-02-B--3'])
  expect(f.calls.filter((c) => c.startsWith('grade ')).length).toBe(4) // the machine runs are not graded
  expect(r.out).toContain('s1-02 B 1 machine memory')
  expect(r.out).not.toContain('machine killed')
})

test('an api stop exits 3 and a rerun resumes', async () => {
  const d = world('api'), seq = order('s1-02'), second = nameOf('s1-02', seq[1], seq.slice(0, 2).filter((a) => a === seq[1]).length)
  const f = fakes(d, { runPlan: { [second]: { code: 3, machine: 'api' } } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: api')
  expect(f.calls.length).toBe(3) // run, grade, the stopped run
  const f2 = fakes(d)
  expect((await go(d, ['run', 's1-02'], f2)).code).toBe(0)
  expect(f2.calls.filter((c) => c.startsWith('run ')).length).toBe(3) // the api record took no slot; the first run is not repeated
  expect(f2.calls).not.toContain(f.calls[0])
  expect(readdirSync(join(d, 'results')).filter((n) => n.endsWith('.json')).length).toBe(5)
})

test('a refused run stops the task with exit 3 and no record', async () => {
  const d = world('refused'), f = fakes(d, { runPlan: { 's1-02-B-1': 2, 's1-02-B--1': 2 } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: refused')
  expect(f.calls.length).toBe(1)
})

test('no JUnit is graded once more and the second stands', async () => {
  const d = world('again'), sha = shaOf('bench/s1-02-B-1'), s7 = sha.slice(0, 7)
  const f = fakes(d, { gradePlan: { [s7]: ['nojunit', 'ok'] } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(0)
  expect(f.calls.filter((c) => c === `grade s1-02 ${s7}`).length).toBe(2)
  expect(r.out).toContain('s1-02 B 1 done grade=again')
  expect(json(join(d, 'canary/attempts.json'))[sha]).toBe(2)
  // a not-ready grade counts as no result too, and two of them are final
  const d2 = world('noready'), sha2 = shaOf('bench/s1-02-B-1'), g2 = fakes(d2, { gradePlan: { [sha2.slice(0, 7)]: ['notready', 'notready'] } })
  const r2 = await go(d2, ['run', 's1-02'], g2)
  expect(r2.out).toContain('s1-02 B 1 done grade=noresult')
  expect(g2.calls.filter((c) => c === `grade s1-02 ${sha2.slice(0, 7)}`).length).toBe(2)
  const g3 = fakes(d2)
  await go(d2, ['run', 's1-02'], g3)
  expect(g3.calls.filter((c) => c.startsWith('grade ')).length).toBe(0) // finished at 2 attempts, never a third
})

test('a product with no result scores 0 and is counted', async () => {
  const d = world('noresult')
  for (const t of SIX) for (const [arm, n] of [['B', 1], ['B', 2], ['B-', 1], ['B-', 2]]) putRun(d, t, arm, n, { grade: arm === 'B' && t === 's2-01' && n === 1 ? { junit: 'missing' } : {} })
  // not final yet (no attempt counted): no score, so no verdict
  const early = await go(d, ['report'], fakes(d))
  expect(early.out).toContain('verdict=not judged')
  expect(json(join(d, 'canary/report.json')).runs.find((x) => x.task === 's2-01' && x.arm === 'B' && x.run === 1).score).toBe(null)
  mkdirSync(join(d, 'canary'), { recursive: true })
  writeFileSync(join(d, 'canary/attempts.json'), JSON.stringify({ [shaOf('bench/s2-01-B-1')]: 2 })) // two attempts: final
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  const rep = json(join(d, 'canary/report.json'))
  const run = rep.runs.find((x) => x.task === 's2-01' && x.arm === 'B' && x.run === 1)
  expect(run).toMatchObject({ score: 0, noresult: true })
  expect(rep.noresult).toBe(1)
  expect(r.out).toContain('noresult=1')
  expect(rep.verdict).not.toBe('not judged')
})

test('a daemon failure is no score', async () => {
  const d = world('daemon'), first = order('s1-02')[0], s = shaOf(`bench/${nameOf('s1-02', first, 1)}`)
  let down = true
  const g = fakes(d, { gradePlan: { [s.slice(0, 7)]: ['daemon', 'ok'] }, daemonDown: () => down })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: machine')
  expect(existsSync(join(d, 'canary/attempts.json')) ? json(join(d, 'canary/attempts.json'))[s] ?? 0 : 0).toBe(0) // no attempt counted
  down = false
  const g2 = fakes(d)
  expect((await go(d, ['run', 's1-02'], g2)).code).toBe(0)
  expect(g2.calls.filter((c) => c.startsWith('run ')).length).toBe(3) // the first run is not repeated, its grade is
  expect(g2.calls[0]).toBe(`grade s1-02 ${s.slice(0, 7)}`)
})

test('a low disk after a grade that gave nothing is the machine too', async () => {
  const d = world('disk'), g = fakes(d, { gradePlan: { [shaOf(`bench/${nameOf('s1-02', order('s1-02')[0], 1)}`).slice(0, 7)]: ['nojunit'] }, free: 3 })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: machine')
})

test('a throw from grade is never an attempt: it stops the driver with no file and no count', async () => {
  const d = world('throw'), s = shaOf(`bench/${nameOf('s1-02', order('s1-02')[0], 1)}`), g = fakes(d, { gradePlan: { [s.slice(0, 7)]: ['throw', 'ok'] } })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: machine')
  expect(existsSync(join(d, 'canary/attempts.json'))).toBe(false)
  const g2 = fakes(d, { gradePlan: { [s.slice(0, 7)]: ['ok'] } })
  expect((await go(d, ['run', 's1-02'], g2)).code).toBe(0)
  expect(json(join(d, 'canary/attempts.json'))[s]).toBe(1)
})

test('the daemon failure in its real shape (exit 1, a grade file written) is no score, and the report is not judged after it', async () => {
  const d = world('realdaemon'), sha = shaOf(`bench/${nameOf('s1-02', order('s1-02')[0], 1)}`)
  const g = fakes(d, { gradePlan: { [sha.slice(0, 7)]: ['nojunit'] }, daemonDown: () => true })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: machine')
  expect(existsSync(join(d, 's1-02/grades', sha.slice(0, 7) + '.json'))).toBe(false) // the spoiled file is gone
  expect(existsSync(join(d, 'canary/attempts.json'))).toBe(false)
  const rep = await go(d, ['report'], fakes(d))
  expect(rep.out).toContain('verdict=not judged')
  expect(json(join(d, 'canary/report.json')).runs.find((x) => x.task === 's1-02').score).toBe(null)
})

test('a second attempt that writes nothing leaves no grade of the first, and the run has no score', async () => {
  const d = world('nofile'), s = shaOf(`bench/${nameOf('s1-02', order('s1-02')[0], 1)}`)
  const g = fakes(d, { gradePlan: { [s.slice(0, 7)]: ['nojunit', 'nofile'] } })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(0)
  expect(r.out).toContain('grade=noresult')
  expect(json(join(d, 'canary/attempts.json'))[s]).toBe(2)
  expect(existsSync(join(d, 's1-02/grades', s.slice(0, 7) + '.json'))).toBe(false)
})

test('a ready grade with every check error is graded once more and counted', async () => {
  const d = world('allerror'), s = shaOf(`bench/${nameOf('s1-02', order('s1-02')[0], 1)}`)
  const g = fakes(d, { gradePlan: { [s.slice(0, 7)]: ['allerror', 'ok'] } })
  const r = await go(d, ['run', 's1-02'], g)
  expect(r.code).toBe(0)
  expect(g.calls.filter((c) => c === `grade s1-02 ${s.slice(0, 7)}`).length).toBe(2)
  expect(json(join(d, 'canary/attempts.json'))[s]).toBe(2)
})

test('two machine runs in a row for one slot stop the driver', async () => {
  const d = world('cap'), arm = order('s1-02')[0], f = fakes(d, { runPlan: { [nameOf('s1-02', arm, 1)]: { code: 3, machine: 'killed' }, [nameOf('s1-02', arm, 2)]: { code: 3, machine: 'killed' } } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(3)
  expect(r.out).toContain('s1-02 stopped: machine')
  expect(f.calls).toEqual([`run ${nameOf('s1-02', arm, 1)}`, `run ${nameOf('s1-02', arm, 2)}`])
})

test('a throw from runArm is told on stderr and stops with exit 3: refused, or machine when the daemon is down', async () => {
  const d = world('runthrow'), arm = order('s1-02')[0], plan = { runPlan: { [nameOf('s1-02', arm, 1)]: 'throw' } }
  const r = await go(d, ['run', 's1-02'], fakes(d, plan))
  expect(r.code).toBe(3)
  expect(r.out).toContain('runArm blew up')
  expect(r.out).toContain('s1-02 stopped: refused')
  const r2 = await go(d, ['run', 's1-02'], fakes(d, { ...plan, daemonDown: () => true }))
  expect(r2.code).toBe(3)
  expect(r2.out).toContain('s1-02 stopped: machine')
})

test('a run that ended abandoned with no machine failure is graded as it stands', async () => {
  const d = world('abandoned'), arm = order('s1-02')[0], name = nameOf('s1-02', arm, 1)
  const f = fakes(d, { runPlan: { [name]: { status: 'abandoned', reason: 'timeout' } } })
  const r = await go(d, ['run', 's1-02'], f)
  expect(r.code).toBe(0)
  expect(f.calls).toContain(`grade s1-02 ${shaOf(`bench/${name}`).slice(0, 7)}`)
  expect(r.out).toContain(`s1-02 ${arm} 1 abandoned grade=ok`)
})

test('the report tells a product killed for memory with its task', async () => {
  const d = fullWorld('memrep')
  mkdirSync(join(d, 'canary'), { recursive: true })
  putGrade(d, 's2-02', shaOf('bench/s2-02-B--1'), { junit: 'missing', ready: 'memory' })
  writeFileSync(join(d, 'canary/attempts.json'), JSON.stringify({ [shaOf('bench/s2-02-B--1')]: 2 }))
  const r = await go(d, ['report'], fakes(d))
  expect(r.out).toContain('s2-02 B- 1 killed for memory')
  expect(json(join(d, 'canary/report.json')).runs.find((x) => x.task === 's2-02' && x.arm === 'B-' && x.run === 1)).toMatchObject({ memory: true, noresult: true, score: 0 })
})

test('a rerun repeats no finished run or good grade', async () => {
  const d = world('rerun'), f = fakes(d)
  expect((await go(d, ['run', 's3-02'], f)).code).toBe(0)
  const before = readFileSync(join(d, 'canary/attempts.json'), 'utf8')
  const f2 = fakes(d)
  const r = await go(d, ['run', 's3-02'], f2)
  expect(r.code).toBe(0)
  expect(f2.calls).toEqual([])
  expect(readFileSync(join(d, 'canary/attempts.json'), 'utf8')).toBe(before)
})

test('a weaker smallModel leaves the old B- runs out and they get new numbers', async () => {
  const d = world('weaker', { small: 'W' })
  for (const n of [1, 2]) putRun(d, 's2-02', 'B-', n, { rec: { model: 'S' } }) // the older tier
  for (const n of [1, 2]) putRun(d, 's2-02', 'B', n)
  const f = fakes(d)
  expect((await go(d, ['run', 's2-02'], f)).code).toBe(0)
  expect(f.calls.filter((c) => c.startsWith('run '))).toEqual(['run s2-02-B--3', 'run s2-02-B--4'])
})

test('the cache rule prunes the build cache above 15 GB before a task', async () => {
  const d = world('cache'), big = fakes(d, { cache: 16e9 })
  await go(d, ['run', 's3-01'], big)
  expect(big.pruned.length).toBe(1)
  const d2 = world('cache2'), small = fakes(d2, { cache: 15e9 })
  await go(d2, ['run', 's3-01'], small)
  expect(small.pruned.length).toBe(0)
})

function fullWorld(name, { bPass = ['a1', 'a2'], mPass = ['a2'], skip = null } = {}) {
  const d = world(name)
  for (const t of SIX) for (const [arm, n] of [['B', 1], ['B', 2], ['B-', 1], ['B-', 2]]) {
    if (skip === `${t}-${arm}-${n}`) continue
    putRun(d, t, arm, n, { grade: { pass: arm === 'B' ? bPass : mPass }, rec: n === 2 && arm === 'B' ? { end: '2026-11-06T11:00:00.000Z' } : {} })
  }
  return d
}

test('the report gives no verdict while a score is missing', async () => {
  const d = fullWorld('missing', { skip: 's3-02-B--2' })
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('verdict=not judged')
  expect(json(join(d, 'canary/report.json')).verdict).toBe('not judged')
  // a run with a record but no grade file has no score either
  const d2 = fullWorld('nograde')
  rmSync(join(d2, 's1-02/grades', shaOf('bench/s1-02-B-1').slice(0, 7) + '.json'))
  expect((await go(d2, ['report'], fakes(d2))).out).toContain('verdict=not judged')
})

test('the report reads build and requirement from the grade files', async () => {
  const d = fullWorld('readgrades')
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  const rep = json(join(d, 'canary/report.json'))
  expect(rep.tasks.map((t) => t.task)).toEqual(SIX) // the first two of each stack, not the third
  const t = rep.tasks.find((x) => x.task === 's2-01')
  // B: build 1 + requirement 1; B-: build 0 + requirement 0.5
  expect(t).toMatchObject({ b: 2, bMinus: 0.5, d: 1.5, dBuild: 1, dRequirement: 0.5, spread: 0 })
  expect(r.out).toContain('canary mean=')
  expect(r.out).toContain('favour=6/6 verdict=pass')
  const run = rep.runs.find((x) => x.task === 's2-01' && x.arm === 'B' && x.run === 2)
  expect(run).toMatchObject({ tokens: 150, cacheRead: 1000, minutes: 60, status: 'done', machine: null, build: 1, requirement: 1 })
  expect(rep.runs.find((x) => x.arm === 'B-')).toMatchObject({ toolUses: { Bash: 2 } })
  expect(r.out).toContain('tokens=150')
  expect(r.out).toContain('minutes=30.0')
  // the stick fails when B- is as good as B
  const d2 = fullWorld('tie', { mPass: ['a1', 'a2'] })
  const r2 = await go(d2, ['report'], fakes(d2))
  expect(r2.out).toContain('favour=0/6 verdict=fail')
})

test('a task with no step id is scored on requirement', async () => {
  const d = fullWorld('nostep')
  await go(d, ['report'], fakes(d))
  const t = json(join(d, 'canary/report.json')).tasks.find((x) => x.task === 's1-01')
  expect(t).toMatchObject({ b: 1, bMinus: 0.5, d: 0.5, dRequirement: 0.5 })
  expect(t.dBuild === 0 || t.dBuild === null).toBe(true) // build is null for both arms: it adds nothing
})

test('the report leaves a machine run and a superseded one out of the score', async () => {
  const d = fullWorld('machrun')
  putRun(d, 's1-02', 'B', 3, { rec: { machine: 'killed', status: 'abandoned', branch: null }, grade: null })
  putRun(d, 's1-02', 'B-', 3, { rec: { model: 'older' } })
  const r = await go(d, ['report'], fakes(d))
  const rep = json(join(d, 'canary/report.json'))
  expect(r.out).toContain('verdict=pass')
  expect(rep.runs.find((x) => x.task === 's1-02' && x.run === 3 && x.arm === 'B')).toMatchObject({ machine: 'killed', score: null })
  expect(rep.runs.filter((x) => x.task === 's1-02' && x.arm === 'B-' && x.score !== null).length).toBe(2)
})

test('diagnose runs only on B- products and prints only counts', async () => {
  const d = fullWorld('diag')
  // not judged / pass: it refuses
  await go(d, ['report'], fakes(d))
  await expect(withData(d, () => canary(['diagnose'], fakes(d)))).rejects.toThrow('verdict')
  const d2 = fullWorld('diag2', { mPass: ['a1', 'a2'] })
  // give every task a distinct d: B- passes more on later tasks
  SIX.forEach((t, i) => { for (const n of [1, 2]) putGrade(d2, t, shaOf(`bench/${nameOf(t, 'B-', n)}`), { pass: i % 2 ? ['a1'] : ['a1', 'a2'] }) })
  const f = fakes(d2)
  await go(d2, ['report'], f)
  expect(json(join(d2, 'canary/report.json')).verdict).toBe('fail')
  const graded = [], diffs = []
  const inj = { ...f, grade: async (args) => { graded.push(args); const sha = args[3], t = args[0].replace(/^.*\/(.+)\.json$/, '$1')
      expect(args[0]).toBe(join(d2, 'env/canary', `${t}.json`)); expect(args[1]).toBe(join(d2, t, 'seeded/oracle')); expect(args.slice(4)).toEqual(['--sealed'])
      mkdirSync(join(d2, t, 'seeded/grades'), { recursive: true })
      writeFileSync(join(d2, t, 'seeded/grades', `${sha.slice(0, 7)}.json`), JSON.stringify({ commit: sha, junit: 'ok', excluded: [{ id: 'x3', verdict: 'weak' }],
        checks: [['x1', 'pass'], ['x2', 'fail'], ['x3', 'pass'], ['x4', 'precondition'], ['x5', 'error'], ['x6', 'fail']].map(([id, result]) => ({ id, result }))}))
      return 0 },
    diff: async (task, from, to) => { diffs.push([task, from, to]); return `diff of ${task} ${from} ${to}\nSECRET-LINE\n` } }
  const r = await go(d2, ['diagnose'], inj)
  expect(r.code).toBe(0)
  expect(graded.length).toBe(12)
  const shas = new Set(SIX.flatMap((t) => [1, 2].map((n) => shaOf(`bench/${nameOf(t, 'B-', n)}`))))
  expect(graded.map((a) => a[3]).every((s) => shas.has(s))).toBe(true) // B- products only
  // counts of the non-excluded checks only: pass 1 (x1), fail 2, precondition 1, error 1
  expect(r.out).toContain('s1-01 B- 1 seeded pass=1 fail=2 precondition=1 error=1')
  expect(r.out).not.toContain('SECRET')
  expect(r.out).not.toContain('diff of')
  // the 3 lowest d (ties by queuePick), one B and one B- each
  const rep = json(join(d2, 'canary/report.json'))
  const lowest = [...rep.tasks].sort((a, b) => a.d - b.d || queuePick(SIX, 6, SEED).indexOf(a.task) - queuePick(SIX, 6, SEED).indexOf(b.task)).slice(0, 3).map((t) => t.task)
  expect(diffs.length).toBe(6)
  expect(diffs.filter((x) => x[1] === `env-${x[0]}`).length).toBe(6)
  const files = readdirSync(join(d2, 'canary/pairs')).sort()
  expect(files).toEqual(lowest.flatMap((t) => [`${t}-B-.diff`, `${t}-B.diff`]).sort())
  expect(readFileSync(join(d2, 'canary/pairs', `${lowest[0]}-B.diff`), 'utf8')).toContain(`diff of ${lowest[0]} env-${lowest[0]} ${shaOf(`bench/${nameOf(lowest[0], 'B', 1)}`)}`)
})

test('the canary grades through its own task file, which differs only in oracle', async () => {
  const d = world('ownfile'), f = fakes(d)
  await go(d, ['run', 's1-02'], f)
  const own = json(join(d, 'env/canary/s1-02.json')), orig = json(join(d, 'env/s1-02.json'))
  expect(own).toEqual({ ...orig, oracle: `cd '${join(import.meta.dir, '../bench')}' && bun --no-env-file '${join(import.meta.dir, '../bench/ext.mjs')}' oracle-run s1-02` })
  expect(json(join(d, 'env/s1-02.json')).oracle).toBe('bun /main/bench/ext.mjs oracle-run s1-02') // the original is not touched
  expect(existsSync(join(d, 'env/canary/s1-01.json'))).toBe(false) // only a task that is graded gets one
  expect((await withData(d, () => loadTask(join(d, 'env/canary/s1-02.json')))).oracle).toBe(own.oracle)
  writeFileSync(join(d, 'env/canary/s1-02.json'), '{}') // a stale file is written again
  await go(d, ['run', 's1-02'], fakes(d))
  expect(json(join(d, 'env/canary/s1-02.json'))).toEqual(own)
})

// the extended canary: the 14 unused kept tasks, judged by the lower bound of a bootstrap interval of the mean of d
const rowsOf = (task, b, m) => ['B', 'B', 'B-', 'B-'].map((arm) => ({ task, arm, build: 0, requirement: arm === 'B' ? b : m }))
const setOf = (ds) => ({ tasks: ds.map((_, i) => `t${i}`), rows: ds.flatMap((d, i) => rowsOf(`t${i}`, d, 0)) })
const SEED_X = 'hstack-bench-2026-10-27'

test('bootstrapMean gives the same interval for the same seed', () => {
  const ds = [0.5, 1, -0.25, 0.75, 0, 1.5, 0.25]
  const a = bootstrapMean(ds, SEED_X), b = bootstrapMean(ds, SEED_X)
  expect(a).toEqual(b)
  expect(a.mean).toBeCloseTo(3.75 / 7, 9)
  expect(a.lower).toBeLessThanOrEqual(a.mean)
  expect(a.upper).toBeGreaterThanOrEqual(a.mean)
  expect(bootstrapMean(ds, 'another seed')).not.toEqual(a)
})

test('bootstrapMean golden: the PRNG and the quantile index are the record', () => {
  // mulberry32 from the first 4 bytes (big-endian) of sha256(seed); sorted means at index 250 and 9750 of 10,000
  expect(bootstrapMean([0.5, 1, -0.25, 0.75, 0, 1.5, 0.25], SEED_X)).toEqual({ mean: 0.535714286, lower: 0.142857143, upper: 0.964285714 })
})

test('all zeros do not pass', () => {
  const { tasks, rows } = setOf(Array(14).fill(0))
  expect(intervalVerdict(rows, tasks, SEED_X)).toMatchObject({ mean: 0, lower: 0, upper: 0, judged: true, pass: false, favour: 0 })
})

test('a clear positive set passes', () => {
  const { tasks, rows } = setOf([0.5, 0.6, 0.4, 0.55, 0.45, 0.5, 0.6, 0.4, 0.5, 0.5, 0.55, 0.45, 0.5, 0.5])
  const v = intervalVerdict(rows, tasks, SEED_X)
  expect(v).toMatchObject({ judged: true, pass: true, favour: 14 })
  expect(v.lower).toBeGreaterThan(0)
  expect(v.tLower).toBeGreaterThan(0)
})

test('a set with a large negative task can fail where the mean is positive', () => {
  const { tasks, rows } = setOf([...Array(13).fill(0.5), -5])
  const v = intervalVerdict(rows, tasks, SEED_X)
  expect(v.mean).toBeGreaterThan(0)
  expect(v).toMatchObject({ judged: true, pass: false, favour: 13 })
  expect(v.lower).toBeLessThan(0)
})

test('a set is not judged while a task lacks a scored run', () => {
  const { tasks, rows } = setOf([0.5, 0.5, 0.5])
  expect(intervalVerdict(rows.slice(1), tasks, SEED_X)).toMatchObject({ judged: false, pass: false })
  expect(intervalVerdict(rows, [...tasks, 'none'], SEED_X)).toMatchObject({ judged: false, pass: false })
  expect(intervalVerdict([], [], SEED_X)).toMatchObject({ judged: false, pass: false })
})

test('tInterval matches a worked example', () => {
  // mean 2.5, s = sqrt(5/3), n = 4, t(0.975, 3 df) = 3.182: half-width 3.182 * 1.29099 / 2 = 2.0540
  const { lower, upper } = tInterval([1, 2, 3, 4])
  expect(lower).toBeCloseTo(0.446, 3)
  expect(upper).toBeCloseTo(4.554, 3)
})

test('extendedTasks leaves out the canary and the cold tasks', () => {
  const d = join(tmp, 'extsample')
  mkdirSync(join(d, 'ext'), { recursive: true })
  const head = 'task\tstack\tcold_setup', rows = [['s1-01', 's1', 'no'], ['s1-02', 's1', 'no'], ['s1-03', 's1', 'no'], ['s1-04', 's1', 'yes'], ['s2-01', 's2', 'no'], ['s2-02', 's2', 'no'], ['s2-03', 's2', 'no'], ['s2-04', 's2', 'yes'], ['s2-05', 's2', 'no']]
  writeFileSync(join(d, 'ext/sample.tsv'), [head, ...rows.map((r) => r.join('\t')), ''].join('\n'))
  expect(extendedTasks(d)).toEqual(['s1-03', 's2-03', 's2-05'])
})

test('the report gives not judged until every extended task has its 2 runs', async () => {
  const d = fullWorld('extrep')
  const extended = () => json(join(d, 'canary/report.json')).extended
  expect((await go(d, ['report'], fakes(d))).out).toContain('extended mean=none lower=none upper=none t_lower=none t_upper=none favour=0/2 verdict=not judged')
  for (const [t, arm, n] of [['s1-03', 'B', 1], ['s1-03', 'B', 2], ['s1-03', 'B-', 1], ['s1-03', 'B-', 2], ['s2-03', 'B', 1], ['s2-03', 'B', 2], ['s2-03', 'B-', 1]]) putRun(d, t, arm, n, { grade: { pass: arm === 'B' ? ['a1', 'a2'] : ['a2'] } })
  const part = await go(d, ['report'], fakes(d))
  expect(part.out).toContain('s1-03 b=2.00')
  expect(part.out).toContain('verdict=not judged')
  expect(extended()).toMatchObject({ judged: false, pass: false })
  putRun(d, 's2-03', 'B-', 2, { grade: { pass: ['a2'] } })
  const full = await go(d, ['report'], fakes(d))
  expect(full.out).toMatch(/extended mean=1\.500 lower=1\.500000 upper=1\.500000 t_lower=1\.500000 t_upper=1\.500000 favour=2\/2 verdict=pass/)
  expect(full.out).toMatch(/all20 mean=1\.250 lower=0\.\d{6} favour=8\/8 judged=yes/)
  const rep = json(join(d, 'canary/report.json'))
  expect(rep.extended).toMatchObject({ judged: true, pass: true, favour: 2 })
  expect(rep.all20).toMatchObject({ favour: 8, judged: true })
  expect(rep.extended.tUpper).toBe(1.5)
  expect(rep.verdict).toBe('pass') // the original verdict stands apart
})

test('the original verdict line is unchanged', async () => {
  const d = fullWorld('origline')
  const lines = (await go(d, ['report'], fakes(d))).out.split('\n')
  const i = lines.findIndex((l) => /^canary mean=\S+ favour=\d\/6 verdict=(pass|fail|not judged)$/.test(l))
  expect(lines[i]).toBe('canary mean=1.167 favour=6/6 verdict=pass')
  expect(lines[i + 1]).toMatch(/^extended /) // the extended lines come after it
})

// the oracle command runs in grade with the product checkout as cwd: Bun would load that checkout's runtime config and env file
test('a graded commit holding a runtime config and an env file leaves no side effect', async () => {
  const d = join(tmp, 'sidefx'), prod = join(d, 'product')
  mkdirSync(prod, { recursive: true })
  writeFileSync(join(prod, 'bunfig.toml'), 'preload = ["./pre.mjs"]\n')
  writeFileSync(join(prod, 'pre.mjs'), `import { writeFileSync } from 'node:fs'\nwriteFileSync(${JSON.stringify(join(d, 'preload-marker'))}, 'x')\n`)
  writeFileSync(join(prod, '.env'), 'BENCH_CANARY_MARK=1\n')
  const probe = join(d, 'probe.mjs') // stands for ext.mjs: it only reports whether the env file reached it
  writeFileSync(probe, `import { writeFileSync } from 'node:fs'\nif (process.env.BENCH_CANARY_MARK) writeFileSync(${JSON.stringify(join(d, 'env-marker'))}, 'x')\n`)
  const markers = () => ['preload-marker', 'env-marker'].filter((m) => existsSync(join(d, m)))
  const sh = async (cmd) => { const p = Bun.spawn(['sh', '-c', cmd], { cwd: prod, stdout: 'ignore', stderr: 'ignore' }); await p.exited }
  await sh(`bun ${probe}`) // control: run plainly from the product, both files take effect
  expect(markers()).toEqual(['preload-marker', 'env-marker'])
  rmSync(join(d, 'preload-marker')); rmSync(join(d, 'env-marker'))
  await sh(oracleCommand('s1-01', probe)) // the real command shape, grade's cwd
  expect(markers()).toEqual([])
})
