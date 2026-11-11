import { test, expect, spyOn, afterAll } from 'bun:test'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { floorOf, scored } from '../bench/scored.mjs'
import { queuePick } from '../bench/lib/oracle.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-scored-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const SEED = 'seed-scored'
const EXT = ['t1', 't2'] // in sample.tsv; the private tasks p1, p2 are not
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
const go = async (d, args, inj) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await quiet(() => scored(args, inj)) } finally { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
}

function world(name, { tasks = ALL, floor = true } = {}) {
  const d = join(tmp, name)
  for (const t of ALL) for (const x of ['grades', 'step/grades', 'build']) mkdirSync(join(d, t, x), { recursive: true })
  for (const x of ['ext', 'env/box', 'results', 'step13/floor']) mkdirSync(join(d, x), { recursive: true })
  const head = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tcold_setup'
  writeFileSync(join(d, 'ext/sample.tsv'), [head, ...EXT.map((t) => `${t}\ts1\t1\t1\town/${t}#1\tu\t1\t1\tbase-${t}\tend-${t}\tno`), ''].join('\n'))
  writeFileSync(join(d, 'tasks.json'), JSON.stringify(Object.fromEntries(PRIV.map((t) => [t, { base: `base-${t}`, end: `end-${t}` }]))))
  writeFileSync(join(d, 'ext/groups.json'), JSON.stringify({ seed: SEED, groups: [] }))
  writeFileSync(join(d, 'arms.json'), JSON.stringify({ model: 'M', smallModel: 'S', cli: 'x', plugins: { H: [], W: [] } }))
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'step13/tasks.txt'), tasks.join('\n') + '\n')
  if (floor) for (const t of ALL) writeFileSync(join(d, 'step13/floor', `${t}.json`), JSON.stringify({ H: 0, B: 0, W: 0 }))
  for (const t of ALL) {
    writeFileSync(join(d, 'env/box', `${t}.json`), JSON.stringify({ name: t, repo: join(d, 'repo'), db: null, port: 4000, start: null, ready: null, setup: [], teardown: [], oracle: 'x', junit: 'out/junit.xml', timeoutSec: 60 }))
    writeFileSync(join(d, t, 'step.json'), JSON.stringify(PRIV.includes(t) ? { oracle: 'step/oracle', ids: ['a1', 'a2'], candidates: 1, seed: 's' } : { oracle: 'oracle', ids: ['a1', 'a2'], candidates: 1, seed: 's' }))
  }
  return d
}

const OSHA = { grades: 'abcdef12', 'step/grades': '12345678' }
function putGrade(d, task, sha, { rel = 'grades' } = {}) {
  const sha7 = sha.slice(0, 7)
  writeFileSync(join(d, task, rel, `${sha7}.json`), JSON.stringify({ commit: sha, task, junit: 'ok', excluded: [], oracleSha: OSHA[rel].padEnd(64, '0'),
    checks: ['a1', 'a2', 'a3'].map((id) => ({ id, bucket: 'requirement', severity: 'high', result: 'pass' })) }))
  appendFileSync(join(d, task, 'build/readiness.tsv'), `${sha7}\t${OSHA[rel]}\tready\n`)
}
const record = (task, arm, n, o = {}) => ({ task, arm, run: n, base: 'b', model: 'M', version: '2.1.318', status: 'done', reason: null, machine: null, interventions: 0,
  start: '2026-11-12T10:00:00.000Z', end: '2026-11-12T10:30:00.000Z', usage: { input: 100, output: 50, cacheRead: 1000, cacheWrite: 7 }, branch: `bench/${nameOf(task, arm, n)}`, ...o })
const putRec = (d, task, arm, n, o) => writeFileSync(join(d, 'results', `${nameOf(task, arm, n)}.json`), JSON.stringify(record(task, arm, n, o)))
function putRun(d, task, arm, n, { grade = true, rec = {} } = {}) {
  putRec(d, task, arm, n, rec)
  if (!grade) return
  const sha = shaOf(`bench/${nameOf(task, arm, n)}`)
  putGrade(d, task, sha)
  if (PRIV.includes(task)) putGrade(d, task, sha, { rel: 'step/grades' })
}

function fakes(d, { version = '2.1.318', mach = () => null } = {}) {
  const calls = []
  const runArm = async (args) => {
    const [taskFile, arm, n] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1'), machine = mach(arm, Number(n))
    calls.push(`run ${nameOf(task, arm, n)}`)
    expect(taskFile).toBe(join(d, 'env/box', `${task}.json`))
    putRec(d, task, arm, Number(n), { version, machine })
    return machine ? 3 : 0
  }
  const grade = async (args) => {
    const [taskFile, oracle, at, sha, sealed, ...more] = args, task = taskFile.replace(/^.*\/(.+)\.json$/, '$1')
    expect(taskFile).toBe(join(d, 'env/box', `${task}.json`))
    expect([at, sealed, more.length]).toEqual(['--at', '--sealed', 0])
    const step = oracle === join(d, task, 'step/oracle')
    expect(oracle === join(d, task, 'oracle') || step).toBe(true)
    calls.push(`grade ${task} ${step ? 'step ' : ''}${sha.slice(0, 7)}`)
    putGrade(d, task, sha, { rel: step ? 'step/grades' : 'grades' })
    return 0
  }
  return { calls, runArm, grade, sha: (_t, branch) => shaOf(branch), daemon: async () => {}, diskFree: async () => 100, cacheBytes: async () => 1e9, prune: async () => {} }
}
const ran = (f) => f.calls.filter((c) => c.startsWith('run ')).map((c) => c.slice(4))

test('the run refuses a task not in tasks.txt and one with no box file', async () => {
  const d = world('refuse', { tasks: ['t1', 'p1'] }), f = fakes(d)
  expect((await go(d, ['run', 't2'], f)).error).toContain('t2 is not in step13/tasks.txt')
  rmSync(join(d, 'env/box/p1.json'))
  expect((await go(d, ['run', 'p1'], f)).error).toContain('p1.json is missing')
  expect(f.calls).toEqual([])
  expect(readdirSync(join(d, 'step13/floor')).sort()).toEqual(ALL.map((t) => `${t}.json`).sort()) // fixture's own; a refused task wrote nothing more
})

test('only runs above the step 13 floor stand: canary and trial records are neither taken nor regraded', async () => {
  const d = world('floor', { floor: false })
  const olds = [['B', 1], ['B', 2], ['H', 1]].map(([arm, n]) => { // a canary and a trial run, graded
    putRun(d, 't1', arm, n)
    const file = join(d, 't1/grades', `${shaOf(`bench/${nameOf('t1', arm, n)}`).slice(0, 7)}.json`)
    return [file, readFileSync(file, 'utf8')]
  })
  const f = fakes(d), r = await go(d, ['run', 't1'], f)
  expect(r.code).toBe(0)
  expect(ran(f).sort()).toEqual(['t1-B-3', 't1-B-4', 't1-B-5', 't1-H-2', 't1-H-3', 't1-H-4', 't1-W-1', 't1-W-2', 't1-W-3'])
  for (const [file, text] of olds) expect(readFileSync(file, 'utf8')).toBe(text)
  expect(json(join(d, 'step13/floor/t1.json'))).toEqual({ H: 1, B: 2, W: 0 })
  const f2 = fakes(d)
  expect((await go(d, ['run', 't1'], f2)).code).toBe(0)
  expect(f2.calls).toEqual([]) // a rerun neither moves the floor nor repeats a run
  expect(json(join(d, 'step13/floor/t1.json'))).toEqual({ H: 1, B: 2, W: 0 })
  expect(json(join(d, 'step13/attempts/t1.json'))[shaOf('bench/t1-W-1')]).toBe(1)
})

test('slots follow the set: 9 for an external task, 6 and no W for a real-estate one', async () => {
  const d = world('slots'), f = fakes(d)
  await go(d, ['run', 't2'], f)
  expect(ran(f).sort()).toEqual(['B', 'H', 'W'].flatMap((a) => [1, 2, 3].map((n) => nameOf('t2', a, n))))
  const g = fakes(d)
  await go(d, ['run', 'p1'], g)
  expect(ran(g).sort()).toEqual(['B', 'H'].flatMap((a) => [1, 2, 3].map((n) => nameOf('p1', a, n))))
  // every product of a real-estate task is graded with both oracle kinds, an external one with one
  expect(g.calls.filter((c) => c.startsWith('grade p1 step')).length).toBe(6)
  expect(f.calls.filter((c) => c.startsWith('grade ') && c.includes('step')).length).toBe(0)
  expect(f.calls.filter((c) => c.startsWith('grade ')).length).toBe(9)
})

test('a machine run takes the next number and the slot is still filled', async () => {
  const d = world('machine'), f = fakes(d, { mach: (arm, n) => (arm === 'B' && n === 1 ? 'model' : null) })
  expect((await go(d, ['run', 'p2'], f)).code).toBe(0)
  expect(ran(f)).toContain('p2-B-4')
  expect(ran(f).length).toBe(7)
})

test('the order is queuePick over the tasks', async () => {
  const d = world('order', { tasks: ['t2', 'p1', 't1', 'p2'] })
  const r = await go(d, ['order'])
  expect(r.code).toBe(0)
  expect(r.out.split('\n')).toEqual(queuePick(['t2', 'p1', 't1', 'p2'], 4, SEED))
})

test('a version change stops the driver', async () => {
  const d = world('version')
  putRun(d, 't2', 'H', 1, { rec: { start: '2026-11-11T10:00:00.000Z' } }) // the first standing record of the set
  const f = fakes(d, { version: '2.1.999' }), r = await go(d, ['run', 't1'], f)
  expect(r.code).toBe(3)
  expect(r.out).toContain('t1 stopped: version')
  expect(ran(f).length).toBe(1)
  // a rerun stops again at once: the mismatched record stands but is neither graded nor followed by a run
  const again = fakes(d), r2 = await go(d, ['run', 't1'], again)
  expect(r2.code).toBe(3)
  expect(r2.out).toContain('t1 stopped: version')
  expect(again.calls).toEqual([])
  // the same version goes on
  const g = fakes(d), ok = await go(d, ['run', 'p1'], g)
  expect(ok.code).toBe(0)
})

test('the report prints counts and no score', async () => {
  const d = world('report')
  putRun(d, 't1', 'H', 1, { rec: { interventions: 2, usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 } } })
  putRun(d, 't1', 'B', 1)
  putRun(d, 't1', 'B', 2, { grade: false })
  putRec(d, 't1', 'B', 3, { machine: 'api' })
  putRec(d, 't1', 'B', 4, { machine: 'api' })
  putRun(d, 'p1', 'H', 1)
  const sha = shaOf('bench/t1-B-2')
  writeFileSync(join(d, 't1/grades', `${sha.slice(0, 7)}.json`), JSON.stringify({ commit: sha, junit: 'ok', checks: [{ id: 'a9', result: 'error' }] })) // never good
  mkdirSync(join(d, 'step13/attempts'), { recursive: true })
  writeFileSync(join(d, 'step13/attempts/t1.json'), JSON.stringify({ [sha]: 2 }))
  const r = await go(d, ['report'], fakes(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('external H standing=1 machine=none noresult=0 versions=2.1.318:1 tokens=15 minutes=30.0')
  expect(r.out).toContain('external B standing=2 machine=api:2 noresult=1 versions=2.1.318:2 tokens=300 minutes=60.0')
  expect(r.out).not.toContain('interventions') // H3's measure: none until step 14
  expect(r.out).toContain('external W standing=0')
  expect(r.out).toContain('real-estate H standing=1')
  expect(r.out).not.toContain('real-estate W')
  expect(/build|requirement|score|mean|\ba[0-9]\b/.test(r.out)).toBe(false)
  expect(existsSync(join(d, 'step13/table.json'))).toBe(false)
})

test('the table is refused before step 14 registers, and written after', async () => {
  const d = world('table')
  putRun(d, 't1', 'H', 1)
  const no = await go(d, ['table'], fakes(d))
  expect(no.code).toBe('threw')
  expect(no.error).toContain('step14/registered')
  expect(existsSync(join(d, 'step13/table.json'))).toBe(false)
  mkdirSync(join(d, 'step14'), { recursive: true })
  writeFileSync(join(d, 'step14/registered'), '')
  const ok = await go(d, ['table'], fakes(d))
  expect(ok.code).toBe(0)
  expect(json(join(d, 'step13/table.json')).runs.map((x) => [x.task, x.arm, x.run, x.build])).toEqual([['t1', 'H', 1, 1]])
})

test('a machine run with another version is the machine\'s stop, not a version stop', async () => {
  const d = world('versionmachine')
  putRun(d, 't2', 'H', 1, { rec: { start: '2026-11-11T10:00:00.000Z' } })
  const f = fakes(d, { version: '2.1.999', mach: () => 'api' }), r = await go(d, ['run', 't1'], f)
  expect(r.code).toBe(3)
  expect(r.out).toContain('t1 stopped: api')
})

test('the report shows a mixed set by its versions', async () => {
  const d = world('mixed')
  putRun(d, 't1', 'H', 1)
  putRun(d, 't1', 'H', 2, { rec: { version: '2.1.999' } })
  expect((await go(d, ['report'], fakes(d))).out).toContain('external H standing=2 machine=none noresult=0 versions=2.1.318:1,2.1.999:1')
})

test('two tasks in parallel touch disjoint floor and attempts files', async () => {
  const d = world('parallel', { floor: false }), f = fakes(d), g = fakes(d)
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try {
    const [a, b] = await Promise.all([quiet(() => scored(['run', 't1'], f)), quiet(() => scored(['run', 'p1'], g))])
    expect([a.code, b.code]).toEqual([0, 0])
  } finally { delete process.env.HSTACK_BENCH_MACHINE }
  expect(existsSync(join(d, 'step13/floor.json')) || existsSync(join(d, 'step13/attempts.json'))).toBe(false)
  expect(readdirSync(join(d, 'step13/floor')).sort()).toEqual(['p1.json', 't1.json'])
  expect(readdirSync(join(d, 'step13/attempts')).sort()).toEqual(['p1.json', 't1.json'])
  const keys = (t) => [...new Set(Object.keys(json(join(d, `step13/attempts/${t}.json`))).map((k) => k.replace(/^.*:/, '')))] // a private-set sha also has a step: key
  expect(keys('t1').sort()).toEqual(['B', 'H', 'W'].flatMap((x) => [1, 2, 3].map((n) => shaOf(`bench/${nameOf('t1', x, n)}`))).sort())
  expect(keys('p1').sort()).toEqual(['B', 'H'].flatMap((x) => [1, 2, 3].map((n) => shaOf(`bench/${nameOf('p1', x, n)}`))).sort())
  expect(floorOf(d, 'p1')).toEqual({ H: 0, B: 0, W: 0 })
  expect(floorOf(d, 'nowhere')).toEqual({ H: Infinity, B: Infinity, W: Infinity })
})

test('prune is never called by run', async () => {
  const d = world('noprune'), f = fakes(d)
  let pruned = 0
  f.cacheBytes = async () => 1e15
  f.prune = async () => { pruned++ }
  expect((await go(d, ['run', 't1'], f)).code).toBe(0)
  expect(pruned).toBe(0)
  expect(ran(f).length).toBe(9)
})

const claim = async (d, lane, ...flags) => (await go(d, ['claim', lane, ...flags], {})).out
const queueOf = (d) => json(join(d, 'step13/queue.json'))
const orderOf = (tasks) => queuePick(tasks, tasks.length, SEED)
const setExclusive = (d, groups) => writeFileSync(join(d, 'step13/exclusive.json'), JSON.stringify(groups))

test('claim keeps the global order', async () => {
  const d = world('claim-order', { tasks: EXT })
  const O = orderOf(['t1', 't2'])
  expect(await claim(d, 'a')).toBe(O[0])
  expect(await claim(d, 'b')).toBe(O[1])
  expect(await claim(d, 'a')).toBe('none') // its task is still running
  expect(await claim(d, 'a', '--done', O[0])).toBe('none') // nothing left to give, a lane still runs
  expect(await claim(d, 'b', '--done', O[1])).toBe('empty')
  expect(queueOf(d)).toEqual({ done: [O[0], O[1]], running: {} })
  expect(existsSync(join(d, 'step13/queue.lock'))).toBe(false)
  // the order with four tasks and one lane is the order of `order`
  const e = world('claim-seq'), P = orderOf(ALL), got = []
  for (let prev; ; prev = got.at(-1)) {
    const t = await claim(e, 'a', ...(prev ? ['--done', prev] : []))
    if (t === 'empty') break
    got.push(t)
  }
  expect(got).toEqual(P)
})

test('claim never gives two private-set tasks at once', async () => {
  const d = world('claim-private', { tasks: PRIV })
  const O = orderOf(PRIV)
  expect(await claim(d, 'a')).toBe(O[0])
  expect(await claim(d, 'b')).toBe('none')
  expect(await claim(d, 'a', '--done', O[0])).toBe(O[1])
  expect(await claim(d, 'b')).toBe('none')
  expect(await claim(d, 'a', '--done', O[1])).toBe('empty')
  // an external task is taken past a blocked private one
  const e = world('claim-private-skip')
  const A = await claim(e, 'a'), B = await claim(e, 'b'), C = await claim(e, 'c')
  for (const [x, y] of [[A, B], [A, C], [B, C]]) expect(PRIV.includes(x) && PRIV.includes(y)).toBe(false)
  expect([A, B, C].filter((t) => t !== 'none').length).toBeGreaterThanOrEqual(2)
})

test('claim never gives two of the shared-port tasks at once', async () => {
  const d = world('claim-group', { tasks: ['t1', 't2', 'p1'] })
  setExclusive(d, [['t1', 't2']])
  const A = await claim(d, 'a'), B = await claim(d, 'b'), C = await claim(d, 'c')
  const ext = [A, B, C].filter((t) => t === 't1' || t === 't2')
  expect(ext.length).toBe(1)
  expect([A, B, C].filter((t) => t === 'p1').length).toBe(1)
  expect([A, B, C].filter((t) => t === 'none').length).toBe(1)
  const e = world('claim-nogroup', { tasks: ['t1', 't2'] }) // no exclusive.json: no groups
  expect(await claim(e, 'a')).not.toBe('none')
  expect(await claim(e, 'b')).not.toBe('none')
})

test('a stopped lane keeps its task until released', async () => {
  const d = world('claim-stop', { tasks: ['t1', 't2'] })
  const O = orderOf(['t1', 't2'])
  expect(await claim(d, 'a')).toBe(O[0])
  expect(await claim(d, 'b')).toBe(O[1])
  expect(await claim(d, 'b', '--done', O[1])).toBe('none') // a's task is neither done nor free
  expect(await claim(d, 'a')).toBe('none') // a stopped without --done
  expect(queueOf(d)).toEqual({ done: [O[1]], running: { a: O[0] } })
  expect(await claim(d, 'a', '--release')).toBe('none') // released, not done; nothing claimed
  expect(queueOf(d)).toEqual({ done: [O[1]], running: {} })
  expect(await claim(d, 'b')).toBe(O[0])
  expect((await go(d, ['claim', 'b', '--done', 'nope'])).error).toContain('b is not running nope')
  expect(existsSync(join(d, 'step13/queue.lock'))).toBe(false) // removed after an error too
})

test('the claim lock is reclaimed when stale and respected when live', async () => {
  const d = world('claim-lock', { tasks: ['t1'] }), lock = join(d, 'step13/queue.lock')
  const hold = (pid, ageMin) => {
    mkdirSync(lock, { recursive: true })
    writeFileSync(join(lock, 'pid'), String(pid))
    const t = new Date(Date.now() - ageMin * 60000)
    utimesSync(lock, t, t)
  }
  hold(2 ** 30, 11) // no such process, older than 10 minutes
  expect(await claim(d, 'a')).toBe('t1')
  expect(existsSync(lock)).toBe(false)
  await claim(d, 'a', '--done', 't1')
  rmSync(join(d, 'step13/queue.json'))
  hold(process.pid, 11) // old but alive
  expect((await go(d, ['claim', 'a'], { lockWaitMs: 100 })).error).toContain('queue.lock')
  rmSync(lock, { recursive: true })
  hold(2 ** 30, 1) // dead but fresh
  expect((await go(d, ['claim', 'a'], { lockWaitMs: 100 })).error).toContain('queue.lock')
  expect(existsSync(join(d, 'step13/queue.json'))).toBe(false)
})

test('a malformed exclusive.json stops the claim; a missing one means no groups', async () => {
  const d = world('claim-badgroups', { tasks: ['t1', 't2'] })
  for (const bad of ['{"a":', '{"t1":["t2"]}', '["t1","t2"]', '[["t1",2]]']) {
    writeFileSync(join(d, 'step13/exclusive.json'), bad)
    const r = await go(d, ['claim', 'a'])
    expect(r.code).toBe('threw')
    expect(r.error).toContain('exclusive.json is not')
    expect(existsSync(join(d, 'step13/queue.json'))).toBe(false) // nothing claimed
    expect(existsSync(join(d, 'step13/queue.lock'))).toBe(false)
  }
  setExclusive(d, [])
  expect(await claim(d, 'a')).not.toBe('none')
})

test('queue.json and the floor are written by rename; a stale temp file is ignored; a truncated queue stops the claim', async () => {
  const d = world('atomic', { tasks: ['t1', 't2'], floor: false })
  writeFileSync(join(d, 'step13/queue.json.tmp'), '{"done":["t1","t2"') // a crashed writer's leftover
  writeFileSync(join(d, 'step13/floor/t1.json.tmp'), 'junk')
  const O = orderOf(['t1', 't2'])
  expect(await claim(d, 'a')).toBe(O[0])
  expect(queueOf(d)).toEqual({ done: [], running: { a: O[0] } })
  expect(existsSync(join(d, 'step13/queue.json.tmp'))).toBe(false)
  expect((await go(d, ['run', 't1'], fakes(d))).code).toBe(0)
  expect(json(join(d, 'step13/floor/t1.json'))).toEqual({ H: 0, B: 0, W: 0 })
  expect(floorOf(d, 't1')).toEqual({ H: 0, B: 0, W: 0 })
  writeFileSync(join(d, 'step13/queue.json'), '{"done":["t1"') // truncated: never read as an empty queue
  const r = await go(d, ['claim', 'b'])
  expect(r.error).toContain('queue.json is not valid JSON')
  expect(readFileSync(join(d, 'step13/queue.json'), 'utf8')).toBe('{"done":["t1"')
})
