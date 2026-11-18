import { test, expect, spyOn, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { analyse, holm } from '../bench/lib/analysis.mjs'
import { bootstrapMean, bootstrapP, bootstrapRatio } from '../bench/lib/score.mjs'
import { scored } from '../bench/scored.mjs'

// synthetic rows only: tasks t1..t6 of set 'ext', r1..r2 of set 're'
const SEED = 'seed-x:step14'
const T = ['t1', 't2', 't3', 't4', 't5', 't6']
const RE = ['r1', 'r2']
const row = (task, arm, run, v, o = {}) => ({ task, set: task.startsWith('r') ? 're' : 'ext', arm, run, build: v, requirement: v, passed: true, featureMissing: 0,
  noresult: false, tokens: 10, minutes: 1, interventions: 0, end: 'done', ...o })
// 3 runs per arm; per task i (0-based) H scores h(i), B b, W w (W on 'ext' tasks only)
const world = ({ h = (i) => 0.6 + 0.05 * i, b = 0.4, w = 0.3, tasks = T, re = [] } = {}) => [
  ...tasks.flatMap((t, i) => ['H', 'B', 'W'].flatMap((arm) => [1, 2, 3].map((n) => row(t, arm, n, arm === 'H' ? h(i) : arm === 'B' ? b : w)))),
  ...re.flatMap((t, i) => ['H', 'B'].flatMap((arm) => [1, 2, 3].map((n) => row(t, arm, n, arm === 'H' ? h(i) : b)))),
]
const set = (runs, match, o) => runs.map((r) => (match(r) ? { ...r, ...o } : r))
const is = (task, arm, run) => (r) => r.task === task && r.arm === arm && (run === undefined || r.run === run)
const UNSCORED = { build: null, requirement: null, passed: null, featureMissing: null }
const H5 = T.map((task) => ({ task, set: 'ext', run: 1, bugs: [{ bug: 'b1', caught: true }, { bug: 'b2', caught: false }] }))
const SETS = { h1: [...T, 'r1'], external: T, realEstate: RE, h5Drop: ['b2'] }
const EXPECT = { noresult: [], unscored: [], caught: 6, miss: 6 }
const run = (o = {}) => analyse({ runs: world(), h5: H5, sets: SETS, expect: EXPECT, seed: SEED, ...o })
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

test('a noresult run with a final grade counts as scored, and its without line leaves it out', () => {
  const runs = set(world(), is('t1', 'H', 1), { noresult: true, build: 0, requirement: 0 }) // every check `error`: scores what it gave
  const r = run({ runs, expect: { ...EXPECT, noresult: ['t1 H-1'] } })
  expect(r.integrity.runs.noresult).toEqual(['t1 H-1'])
  // H4 d_t = 2·h − 0.6 = 0.6 + 0.1i; t1's H mean is (0 + 1.2 + 1.2)/3 = 0.8, so d = 0.2
  expect(r.h4.tasks).toBe(6)
  expect(r.h4.mean).toBeCloseTo(avg([0.2, 0.7, 0.8, 0.9, 1.0, 1.1]), 9)
  expect(r.h4.withoutNoresult.mean).toBeCloseTo(avg([0.6, 0.7, 0.8, 0.9, 1.0, 1.1]), 9)
  expect(r.h1.mean).toBeCloseTo(avg([0, 0.25, 0.3, 0.35, 0.4, 0.45]), 9) // t1: (0 + 0.6 + 0.6)/3 − 0.4
  expect(r.h1.withoutNoresult.mean).toBeCloseTo(avg([0.2, 0.25, 0.3, 0.35, 0.4, 0.45]), 9)
  expect(r.h2.withoutNoresult.tasks).toBe(6)
})

test('a run with no score adds nothing, and a task missing an arm leaves the pair', () => {
  let runs = set(world(), is('t2', 'H', 1), UNSCORED)
  runs = set(runs, is('t5', 'W'), UNSCORED).filter((r) => !is('t6', 'W')(r)) // t5: W unscored, t6: no W run
  const r = run({ runs, expect: { ...EXPECT, unscored: ['t2 H-1', 't5 W-1', 't5 W-2', 't5 W-3'] } })
  expect(r.integrity.ok).toBe(true)
  expect(r.h4.out).toEqual(['t5', 't6'])
  expect(r.h4.tasks).toBe(4)
  expect(r.h4.mean).toBeCloseTo(avg([0.6, 0.7, 0.8, 0.9]), 9) // t2's H mean is its 2 scored runs': no 0 for the unscored one
  expect(r.h1.out).toEqual([])
  expect(r.h1.tasks).toBe(6)
})

test('interventions, tokens and minutes count every standing run, scored or not', () => {
  const runs = set(world(), is('t1', 'H', 1), { ...UNSCORED, interventions: 3, tokens: 100, minutes: 7 })
  const r = run({ runs, expect: { ...EXPECT, unscored: ['t1 H-1'] } })
  expect(r.h3.a.mean).toBeCloseTo(1 / 6, 9) // t1's H mean is 3/3 = 1
  expect(r.h3.b.mean).toBeCloseTo(1 / 6, 9)
  const H = r.cost.find((c) => c.set === 'ext' && c.arm === 'H')
  expect(H).toEqual({ set: 'ext', arm: 'H', runs: 18, tokens: 15, minutes: 24 / 18 })
  expect(r.featureMissing.find((c) => c.set === 'ext' && c.arm === 'H').runs).toBe(17) // a share over scored runs only
})

test('an integrity mismatch stops before H4', () => {
  const a = run({ expect: { ...EXPECT, noresult: ['t1 H-1'] } })
  expect(Object.keys(a)).toEqual(['integrity'])
  expect(a.integrity.runs.ok).toBe(false)
  const b = run({ expect: { ...EXPECT, caught: 5 } })
  expect(Object.keys(b)).toEqual(['integrity'])
  expect(b.integrity).toMatchObject({ ok: false, runs: { ok: true }, h5: { caught: 6, miss: 6, ok: false } })
  const c = run({ expect: { ...EXPECT, miss: 5 } }) // miss alone differs
  expect(Object.keys(c)).toEqual(['integrity'])
  expect(c.integrity).toMatchObject({ ok: false, runs: { ok: true }, h5: { ok: false } })
  const d = run({ runs: set(world(), is('t1', 'H', 1), UNSCORED) }) // an unscored run the lock does not list
  expect(Object.keys(d)).toEqual(['integrity'])
  expect(d.integrity).toMatchObject({ ok: false, runs: { unscored: ['t1 H-1'], ok: false }, h5: { ok: true } })
})

test('H1 reads build and H2 requirement', () => {
  const runs = world().map((r) => ({ ...r, ...{ H: { build: 0.8, requirement: 0.6 }, B: { build: 0.4, requirement: 0.5 }, W: { build: 0, requirement: 0 } }[r.arm] }))
  const r = run({ runs })
  expect(r.h1.mean).toBeCloseTo(0.4, 9)
  expect(r.h2.mean).toBeCloseTo(0.1, 9)
})

test('H1 runs only on the external tasks with step ids', () => {
  const r = run({ sets: { ...SETS, h1: ['t1', 't2', 't3', 'r1'] } })
  expect([r.h1.tasks, r.h2.tasks, r.h3.b.tasks]).toEqual([3, 6, 6])
  expect(r.h1.out).toEqual([])
})

test('H4 prints build and requirement apart', () => {
  const runs = world().map((r) => ({ ...r, requirement: 0.5 })) // requirement d is 0; build d is h − 0.3
  const r = run({ runs })
  expect(r.h4.build.mean).toBeCloseTo(avg(T.map((_, i) => 0.3 + 0.05 * i)), 9)
  expect(r.h4.requirement.mean).toBe(0)
  expect(r.h4.mean).toBeCloseTo(r.h4.build.mean + r.h4.requirement.mean, 9)
  expect(r.h4.build.met).toBeUndefined() // decides nothing
  expect(r.h4.met).toBe(true)
})

test('H4 not met: no H minus B line', () => {
  const r = run({ runs: world({ w: 0.9 }) })
  expect(r.h4.met).toBe(false)
  expect(Object.keys(r)).toEqual(['integrity', 'h4', 'h5', 'cost', 'ends'])
})

test('Holm steps down by p and stops at the first not met', () => {
  const levels = []
  const h = (id, p, ok) => ({ id, p, clears: (level) => { levels.push(level); return { met: ok, bounds: [{ lower: 0, upper: 1 }] } } })
  const out = holm([h('H1', 0.03, true), h('H2', 0.01, true), h('H3', 0.02, false)])
  expect(out.map((x) => [x.id, x.met])).toEqual([['H2', true], ['H3', false], ['H1', false]]) // H1 clears but comes after the stop
  expect(out.map((x) => x.level)).toEqual([1 - 0.05 / 3, 1 - 0.05 / 2, 1 - 0.05 / 1])
  expect(levels).toEqual([1 - 0.05 / 3, 1 - 0.05 / 2, 1 - 0.05 / 1])
  expect(holm([h('H3', 0.01, true), h('H1', 0.01, true), h('H2', 0, true)]).map((x) => x.id)).toEqual(['H2', 'H1', 'H3']) // a tie goes by ID
})

test('Holm reads each interval at its level from the hypothesis seed', () => {
  const r = run()
  expect(r.holm.map((x) => x.id)).toEqual(['H1', 'H2', 'H3']) // every p is 0 here: by ID
  const dH1 = T.map((_, i) => 0.2 + 0.05 * i)
  const at = bootstrapMean(dH1.map((d) => Math.round(d * 1e9) / 1e9), `${SEED}:H1`, 10000, 1 - 0.05 / 3)
  expect(r.holm[0].bounds).toEqual([{ lower: at.lower, upper: at.upper }])
  expect(r.holm[2].bounds).toHaveLength(2) // H3: both of its tests
  expect(r.holm.every((x) => x.met)).toBe(true)
})

// Holm end to end: H − B build d1 and requirement d2 per task, H's interventions per task as a count of its 3 runs (B none), B = 1, W = 0
const holmRun = (d1, d2, iv = d1.map(() => 0)) => {
  const ts = d1.map((_, i) => `h${i + 1}`)
  const runs = ts.flatMap((t, i) => [1, 2, 3].flatMap((n) => [row(t, 'H', n, 0, { build: 1 + d1[i], requirement: 1 + d2[i], interventions: n <= iv[i] ? 1 : 0 }), row(t, 'B', n, 1), row(t, 'W', n, 0)]))
  return run({ runs, sets: { h1: ts, external: ts, realEstate: [], h5Drop: ['b2'] } })
}

test('the verdicts are Holm\'s: a hypothesis that clears its own 95% is not met after the first not met', () => {
  // H3 (p 0), then H2 (p 0.039) fails at 97.5% though its 95% clears, so H1 (p 0.0426) is not met though its 95% and point clear
  const r = holmRun([0.1, 0.1, 0.1, 0.1, 0.1, 0.3, 0.3, -0.2], [0.1, 0.1, 0.1, 0.1, 0.1, 0.4, 0.4, -0.2])
  expect(r.holm.map((x) => [x.id, x.met])).toEqual([['H3', true], ['H2', false], ['H1', false]])
  expect(r.holm[1].bounds[0].lower).toBeLessThan(0)
  expect([r.h2.lower, r.h1.lower]).toEqual([0.025, 0.0125]) // both 95% lower bounds clear 0
  expect(r.h1.point).toBe(true)
  expect([r.h1.met, r.h2.met, r.h3.met]).toEqual([false, false, true])
  // H2 (p 0), then H1 (p 0.029) fails at 97.5%, so H3 (p 0.0342), whose two 95% bounds clear, is not met
  const q = holmRun([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, -0.2], Array(10).fill(0.5), [0, 0, 0, 0, 1, 1, 1, 2, 2, 2])
  expect(q.holm.map((x) => [x.id, x.met])).toEqual([['H2', true], ['H1', false], ['H3', false]])
  expect(q.h3.a.upper).toBeLessThanOrEqual(1)
  expect(q.h3.b.upper).toBeLessThanOrEqual(0.5)
  expect(q.h3.met).toBe(false)
})

test('H1 needs its point at 0.10 after Holm', () => {
  const r = run({ runs: world({ h: () => 0.45, w: 0.3 }) }) // H − B is 0.05 on every task: the bound clears, the point does not
  expect(r.holm.find((x) => x.id === 'H1').met).toBe(true)
  expect(r.h1.point).toBe(false)
  expect(r.h1.met).toBe(false)
  expect(r.h2.met).toBe(true) // the point clause does not stop the step-down
  expect(r.h3.met).toBe(true)
  expect(run().h1.met).toBe(true)
})

test('H3 takes the larger p of its two bounds', () => {
  const runs = world().map((r) => (r.arm === 'H' && T.indexOf(r.task) % 2 ? { ...r, interventions: 1 } : r)) // H − B: 0, 1, 0, 1, 0, 1
  const r = run({ runs })
  const ds = [0, 1, 0, 1, 0, 1]
  expect(r.h3.a.p).toBe(bootstrapP(ds, `${SEED}:H3a`, 1, 'upper'))
  expect(r.h3.b.p).toBe(bootstrapP(ds, `${SEED}:H3b`, 0.5, 'upper'))
  expect(r.h3.b.p).toBeGreaterThan(r.h3.a.p)
  expect(r.h3.p).toBe(r.h3.b.p)
  expect(r.holm.find((x) => x.id === 'H3').p).toBe(r.h3.b.p)
  const [a, b] = r.holm.find((x) => x.id === 'H3').bounds // both must clear: (a) does, (b) does not
  expect(a.upper).toBeLessThanOrEqual(1)
  expect(b.upper).toBeGreaterThan(0.5)
  expect(r.h3.met).toBe(false)
})

test('each bound test at its boundary: lower is strict, upper and H5 are not', () => {
  const zero = run({ runs: world({ h: () => 0.4 }) }) // H − B exactly 0: lower bound 0 is not > 0
  expect(zero.h4.met).toBe(true)
  expect([zero.h1.lower, zero.h2.lower]).toEqual([0, 0])
  expect([zero.h1.met, zero.h2.met, zero.h3.met]).toEqual([false, false, true])
  expect(zero.holm.map((x) => x.id)).toEqual(['H3', 'H1', 'H2'])
  const one = run({ runs: world().map((r) => (r.arm === 'W' ? r : { ...r, interventions: 1 })) }) // H3a's upper exactly 1.0, H3b's 0
  expect([one.h3.a.upper, one.h3.b.upper]).toEqual([1, 0])
  expect(one.h3.met).toBe(true)
  expect(run().h5.pooled).toMatchObject({ rate: 0.5, lower: 0.5, met: true }) // every task 1 of 2: lower bound exactly 0.5
})

test('pass^j is C(c,j)/C(k,j)', () => {
  const runs = set(world(), is('t1', 'H', 3), { passed: false })
  const r = run({ runs, sets: { ...SETS, h1: ['t1'] } })
  const of = (j) => r.passK.find((x) => x.set === 'ext' && x.arm === 'H' && x.j === j)
  expect(of(1).mean).toBeCloseTo(2 / 3, 9)
  expect(of(3).mean).toBe(0)
})

test('pass^j leaves a task with fewer than j runs', () => {
  let runs = set(world(), is('t2', 'H', 3), UNSCORED) // t2 has 2 runs with `passed`
  runs = set(runs, is('t2', 'H', 2), { passed: false })
  const r = run({ runs, sets: { ...SETS, h1: ['t1', 't2'] }, expect: { ...EXPECT, unscored: ['t2 H-3'] } })
  const of = (j) => r.passK.find((x) => x.set === 'ext' && x.arm === 'H' && x.j === j)
  expect(of(1)).toMatchObject({ tasks: 2, out: [] })
  expect(of(1).mean).toBeCloseTo((1 + 1 / 2) / 2, 9)
  expect(of(3)).toMatchObject({ tasks: 1, out: ['t2'], mean: 1 })
  expect(r.passK.filter((x) => x.set === 'ext').map((x) => `${x.arm}${x.j}`)).toEqual(['B1', 'B3', 'H1', 'H3', 'W1', 'W3'])
})

test('H5 sums caught and miss per task, skips tasks with neither, and drops listed bugs only in the line without them', () => {
  const h5 = [
    { task: 't1', set: 'ext', run: 1, bugs: [{ bug: 'a', at: 'pass', port: 'ported', caught: true }, { bug: 'b', at: 'fail', port: null, caught: false }] },
    { task: 't1', set: 'ext', run: 2, bugs: [{ bug: 'a', at: 'pass', port: 'ported', caught: true }, { bug: 'c', at: 'error', port: null, caught: null }] },
    { task: 't1', set: 'ext', run: 3, bugs: [{ bug: 'x', at: 'pass', port: 'ported', caught: true }] },
    { task: 't2', set: 'ext', run: 1, bugs: [{ bug: 'a', at: 'pass', port: 'refused', caught: null }, { bug: 'b', at: 'pass', port: 'notready', caught: null }, { bug: 'c', at: 'pass', port: 'ported', caught: null }] },
    { task: 'r1', set: 're', run: 1, bugs: [{ bug: 'a', at: 'fail', port: null, caught: false }] },
  ]
  const r = run({ h5, sets: { ...SETS, h5Drop: ['x'] }, expect: { ...EXPECT, caught: 3, miss: 2 } })
  expect(r.integrity.h5).toMatchObject({ caught: 3, miss: 2, ok: true }) // the drop does not touch the integrity sums
  expect(r.h5.pooled).toMatchObject({ tasks: 2, skipped: ['t2'], caught: 3, miss: 2, ...bootstrapRatio([[3, 4], [0, 1]], `${SEED}:H5`) })
  expect(r.h5.pooled.rate).toBeCloseTo(3 / 5, 9)
  expect(r.h5.pooled.met).toBe(r.h5.pooled.lower >= 0.5)
  expect(r.h5.pooled.classes).toEqual({ na: 1, refused: 1, notready: 1, nosuite: 1 })
  expect(r.h5.external).toMatchObject({ tasks: 1, caught: 3, miss: 1, ...bootstrapRatio([[3, 4]], `${SEED}:H5-ext`) })
  expect(r.h5.realEstate).toMatchObject({ tasks: 1, caught: 0, miss: 1, rate: 0 })
  expect(r.h5.without).toMatchObject({ drop: ['x'], caught: 2, miss: 2, ...bootstrapRatio([[2, 3], [0, 1]], `${SEED}:H5-no-x`) })
})

test('the same seed gives the same result, from the seeds ruling 4 names', () => {
  const runs = world({ re: RE })
  const a = run({ runs }), b = run({ runs })
  expect(a).toEqual(b)
  const dH4 = T.map((_, i) => Math.round((0.6 + 0.1 * i) * 1e9) / 1e9)
  const bm = bootstrapMean(dH4, `${SEED}:H4`)
  expect([a.h4.mean, a.h4.lower, a.h4.upper]).toEqual([bm.mean, bm.lower, bm.upper]) // bootstrapMean at its default level
  expect(a.h4.p).toBe(bootstrapP(dH4, `${SEED}:H4`, 0, 'lower'))
  expect(a.h4.build).toMatchObject({ lower: bootstrapMean(T.map((_, i) => Math.round((0.3 + 0.05 * i) * 1e9) / 1e9), `${SEED}:H4`).lower })
  // real-estate: H1 only where the task has step ids (r1), seeds re-<measure>, no Holm and no verdict
  expect(a.realEstate.h1).toMatchObject({ tasks: 1, ...bootstrapMean([0.2], `${SEED}:re-H1`) })
  expect(a.realEstate.h2).toMatchObject({ tasks: 2, ...bootstrapMean([0.2, 0.25], `${SEED}:re-H2`) })
  expect(a.realEstate.h2.met).toBeUndefined()
  expect(a.passK.find((x) => x.set === 're' && x.arm === 'B' && x.j === 1)).toMatchObject({ tasks: 1, ...bootstrapMean([1], `${SEED}:passk-re-B-1`) })
  const c = run({ runs, seed: 'other:step14' })
  expect(c.h4.mean).toBe(a.h4.mean)
})

test('a deciding line with no task refuses rather than deciding', () => {
  expect(() => run({ runs: world().filter((r) => r.arm !== 'W') })).toThrow('H4')
})

// the command, on a synthetic data folder
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-analysis-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))
const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out } } catch (e) { return { code: 'threw', out, error: e.message } } finally { a.mockRestore(); b.mockRestore() }
}
const TSV = ['set\ttask\tstatus\th1_ids', ...T.map((t, i) => `external\t${t}\tscored\t${i < 4 ? 1 : 0}`), 'external\tt9\tdropped\t1', 'real-estate\tr1\tscored\t2', 'real-estate\tr2\tscored\t0'].join('\n') + '\n'
function dataDir(name, { runs = world({ re: RE }), registered = true, table = true } = {}) {
  const d = join(tmp, name)
  mkdirSync(join(d, 'step13'), { recursive: true })
  mkdirSync(join(d, 'logs/step13'), { recursive: true })
  if (registered) { mkdirSync(join(d, 'step14'), { recursive: true }); writeFileSync(join(d, 'step14/registered'), '{}') }
  if (table) writeFileSync(join(d, 'step13/table.json'), JSON.stringify({ at: 'x', runs }))
  const standing = []
  for (const task of [...T, 'r1']) for (const n of [1, 2]) {
    mkdirSync(join(d, task, 'seeded/h5'), { recursive: true })
    writeFileSync(join(d, task, `seeded/h5/H-${n}.json`), JSON.stringify([{ bug: 'b1', at: 'pass', port: 'ported', caught: n === 1 }, { bug: 'b2', at: 'pass', port: 'ported', caught: true }]))
    standing.push(`h5 ${task} H ${n} bugs=2 miss=${n === 1 ? 0 : 1} ported=2 caught=${n === 1 ? 2 : 1}`)
  }
  writeFileSync(join(d, 'H-9.json'), '[]') // not listed in the standing file: never read
  writeFileSync(join(d, 'logs/step13/h5-standing.out'), standing.join('\n') + '\n')
  writeFileSync(join(d, 'tasks.tsv'), TSV)
  return d
}
const EXP = JSON.stringify({ noresult: [], unscored: [], caught: 21, miss: 7 })
const cli = async (d, expectJson = EXP, drop = 'b2') => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await quiet(() => scored(['analyse', join(d, 'tasks.tsv'), '--h5-drop', drop, '--expect', expectJson])) }
  finally { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
}

test('analyse refuses without registered', async () => {
  const a = await cli(dataDir('noreg', { registered: false }))
  expect(a.code).toBe('threw')
  expect(a.error).toContain('step14/registered')
  const b = await cli(dataDir('notable', { table: false }))
  expect(b.error).toContain('step13/table.json')
  expect(existsSync(join(tmp, 'notable/step14/analysis.json'))).toBe(false)
})

test('analyse prints the integrity lines, then H4 first, and writes analysis.json', async () => {
  const d = dataDir('ok')
  const r = await cli(d)
  expect(r.code).toBe(0)
  const tags = r.out.map((l) => l.split(' ')[0])
  expect(tags.slice(0, 5)).toEqual(['integrity', 'integrity', 'H4', 'H4', 'H4'])
  expect(r.out[0]).toBe('integrity runs unscored=none noresult=none expected unscored=none noresult=none ok')
  expect(r.out[1]).toBe('integrity h5 caught=21 miss=7 expected caught=21 miss=7 ok')
  expect(r.out[2]).toMatch(/^H4 score H-W tasks=6 out=none mean=0\.8500 95%=\[\S+, \S+\] t=\[\S+, \S+\] p=0\.0000 met \| without noresult: tasks=6 mean=0\.8500 95%=\[\S+, \S+\]$/)
  expect(r.out[3]).toMatch(/^H4 build H-W .* decides nothing$/)
  expect(r.out[4]).toMatch(/^H4 requirement H-W .* decides nothing$/)
  for (const t of ['H1', 'H2', 'H3a', 'H3b', 'holm', 'verdict', 're', 'passk', 'featureMissing', 'cost', 'ends']) expect(tags).toContain(t)
  expect(r.out).toContain('H5 without b2 tasks=7 skipped=none caught=7 miss=7 rate=0.5000 95%=[0.5000, 0.5000]')
  expect(r.out).toContain('verdict H1=met H2=met H3=met')
  const j = JSON.parse(readFileSync(join(d, 'step14/analysis.json'), 'utf8'))
  expect(j.args).toEqual({ tasks: join(d, 'tasks.tsv'), h5Drop: ['b2'], expect: JSON.parse(EXP) })
  expect(j.h4.tasks).toBe(6)
  const bm = bootstrapMean(T.map((_, i) => Math.round((0.6 + 0.1 * i) * 1e9) / 1e9), 'hstack-bench-2026-10-27:step14:H4')
  expect([j.h4.lower, j.h4.upper]).toEqual([bm.lower, bm.upper]) // the command's seed prefix
  expect(j.realEstate.h1.tasks).toBe(1) // r2 has no step ids
  expect([j.h1.tasks, j.h2.tasks]).toEqual([4, 6]) // t5 and t6 have no step ids
  expect(j.h5.pooled).toMatchObject({ caught: 21, miss: 7, tasks: 7 })
})

test('analyse with H4 not met prints no H minus B line', async () => {
  const r = await cli(dataDir('notmet', { runs: world({ w: 0.9, re: RE }) }))
  expect(r.code).toBe(0)
  const tags = new Set(r.out.map((l) => l.split(' ')[0]))
  for (const t of ['H1', 'H2', 'H3', 'H3a', 'H3b', 'holm', 'verdict', 're', 'passk', 'featureMissing']) expect(tags.has(t)).toBe(false)
  expect(r.out.some((l) => /H-B/.test(l))).toBe(false)
  for (const t of ['H4', 'H5', 'cost', 'ends']) expect(tags.has(t)).toBe(true)
  const j = JSON.parse(readFileSync(join(tmp, 'notmet/step14/analysis.json'), 'utf8'))
  for (const k of ['h1', 'h2', 'h3', 'holm', 'realEstate', 'passK', 'featureMissing']) expect(j[k]).toBeUndefined()
})

test('analyse stops after the integrity lines when they differ, exit 3', async () => {
  const r = await cli(dataDir('differ'), JSON.stringify({ noresult: ['t1 H-1'], unscored: [], caught: 21, miss: 7 }))
  expect(r.code).toBe(3)
  expect(r.out[0]).toBe('integrity runs unscored=none noresult=none expected unscored=none noresult=t1 H-1 differs')
  expect(r.out.some((l) => l.startsWith('H4'))).toBe(false)
})

test('analyse refuses a bad --expect and a listed H5 row file that is missing', async () => {
  expect((await cli(dataDir('badexp'), '{"noresult":[]}')).error).toContain('--expect')
  const d = dataDir('nofile')
  rmSync(join(d, 't1/seeded/h5/H-1.json'))
  expect((await cli(d)).error).toContain('H-1.json')
})

test('analyse refuses an --h5-drop that matches no H5 row', async () => {
  const d = dataDir('nodrop'), r = await cli(d, EXP, 'zzz')
  expect(r.code).toBe('threw')
  expect(r.error).toContain('zzz')
  expect(existsSync(join(d, 'step14/analysis.json'))).toBe(false)
})
