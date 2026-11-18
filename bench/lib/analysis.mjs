// Step 14's analysis (the analysis plan's rulings 2–9, registered in the prereg's section 12 "Applied at step 14"). Pure: no fs.
// runs: table.json's rows; h5: [{ task, set, run, bugs: the H5 row file's rows }]; sets: { h1, external, realEstate, h5Drop } (h1: every
// scored task with step ids, of either set); expect: the lock's { noresult, unscored, caught, miss }; seed: '<base>:step14', each line's
// seed is `${seed}:<name>` with the names of ruling 4. Nothing here names a task, a set or a bug.
import { bootstrapMean, bootstrapP, bootstrapRatio, canaryScore, tInterval } from './score.mjs'

const ALPHA = 0.05, R = 10000, POINT = 0.10, H5_MIN = 0.5
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const r9 = (x) => Math.round(x * 1e9) / 1e9 // as the canary's d: float noise in a mean of equal scores cannot move a bound test
const nameOf = (r) => `${r.task} ${r.arm}-${r.run}`
// ruling 3: a run has a score when it has a final grade (table writes both terms null otherwise); a scored run's null term reads 0, as canaryScore
const isScored = (r) => r.build !== null || r.requirement !== null
const every = () => true
const SCORE = (r) => canaryScore(r.build, r.requirement), BUILD = (r) => r.build ?? 0, REQUIREMENT = (r) => r.requirement ?? 0, INTERVENTIONS = (r) => r.interventions

// ruling 4: d_t per task, its mean over the kept runs of arms[0] minus that of arms[1] (arms[0] alone when one arm); a task missing an arm is out
function perTask(runs, { tasks, arms, value, keep = isScored }, also = every) {
  const ds = [], out = []
  for (const task of tasks) {
    const m = arms.map((arm) => mean(runs.filter((r) => r.task === task && r.arm === arm && keep(r) && also(r)).map(value)))
    if (m.includes(null)) out.push(task)
    else ds.push(r9(m.length === 2 ? m[0] - m[1] : m[0]))
  }
  return { ds, out }
}
const interval = (ds, seed, level) => (ds.length ? bootstrapMean(ds, seed, R, level) : { mean: null, lower: null, upper: null })
const clears = (b, { threshold, side }) => b.lower !== null && (side === 'lower' ? b.lower > threshold : b.upper <= threshold)

// one line: the 95% bootstrap (deciding), the t interval beside it; a test's bootstrap p; a score line also without the noresult runs
function line(runs, spec) {
  const { ds, out } = perTask(runs, spec), t = tInterval(ds), l = { tasks: ds.length, out, ...interval(ds, spec.seed), tLower: t.lower, tUpper: t.upper }
  if (spec.side) {
    if (!ds.length) throw new Error(`${spec.id}: no task has a run in every arm it compares`)
    l.p = bootstrapP(ds, spec.seed, spec.threshold, spec.side)
  }
  if (spec.keep === undefined) {
    const w = perTask(runs, spec, (r) => !r.noresult)
    l.withoutNoresult = { tasks: w.ds.length, ...interval(w.ds, spec.seed) }
  }
  return l
}

// ruling 6: ordered by p (ties by ID); the i-th (1-based, of 3) is met when its two-sided 1 − α/(4 − i) interval clears; the first not met stops.
// hs: [{ id, p, clears(level) -> { met, bounds } }]
export function holm(hs) {
  let going = true
  return [...hs].sort((a, b) => a.p - b.p || (a.id < b.id ? -1 : 1)).map((h, i) => {
    const level = 1 - ALPHA / (hs.length - i), { met, bounds } = h.clears(level)
    going = going && met
    return { id: h.id, p: h.p, level, bounds, met: going }
  })
}
const hypothesis = (runs, id, p, specs) => ({ id, p, clears: (level) => {
  const bounds = specs.map((s) => { const { lower, upper } = interval(perTask(runs, s).ds, s.seed, level); return { lower, upper } })
  return { met: bounds.every((b, i) => clears(b, specs[i])), bounds }
} })

const choose = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c } // 0 when k > n

// ruling 8: per task, caught and miss summed over its rows; the ratio of sums over the tasks with either, a bootstrap resampling them
function h5Line(rows, seed) {
  const per = new Map()
  for (const x of rows) {
    const t = per.get(x.task) ?? per.set(x.task, [0, 0]).get(x.task)
    for (const b of x.bugs) { if (b.caught === true) t[0]++; if (b.caught === true || b.caught === false) t[1]++ }
  }
  const pairs = [...per.values()].filter((p) => p[1] > 0), sum = (k) => pairs.reduce((n, p) => n + p[k], 0)
  return { tasks: pairs.length, skipped: [...per].filter(([, p]) => p[1] === 0).map(([t]) => t), caught: sum(0), miss: sum(1) - sum(0),
    ...(pairs.length ? bootstrapRatio(pairs, seed) : { rate: null, lower: null, upper: null }) }
}

export function analyse({ runs, h5, sets, expect, seed }) {
  const s = (name) => `${seed}:${name}`
  // ruling 5: the integrity lines, against the lock, before any score
  const names = (f) => runs.filter(f).map(nameOf).sort(), same = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort())
  const unscored = names((r) => !isScored(r)), noresult = names((r) => r.noresult === true)
  const bugs = h5.flatMap((x) => x.bugs), count = (f) => bugs.filter(f).length
  const caught = count((b) => b.caught === true), miss = count((b) => b.caught === false)
  const integrity = { runs: { unscored, noresult, ok: same(unscored, expect.unscored) && same(noresult, expect.noresult) }, h5: { caught, miss, ok: caught === expect.caught && miss === expect.miss } }
  integrity.ok = integrity.runs.ok && integrity.h5.ok
  if (!integrity.ok) return { integrity }

  const ext = sets.external, re = sets.realEstate, inSet = new Set([...ext, ...re]), mine = runs.filter((r) => inSet.has(r.task))
  const withIds = (tasks) => tasks.filter((t) => sets.h1.includes(t))
  const HW = ['H', 'W'], HB = ['H', 'B'], lower0 = { threshold: 0, side: 'lower' }
  const spec = {
    H1: { id: 'H1', tasks: withIds(ext), arms: HB, value: BUILD, seed: s('H1'), ...lower0 },
    H2: { id: 'H2', tasks: ext, arms: HB, value: REQUIREMENT, seed: s('H2'), ...lower0 },
    H3a: { id: 'H3a', tasks: ext, arms: ['H'], value: INTERVENTIONS, keep: every, seed: s('H3a'), threshold: 1.0, side: 'upper' }, // every standing run
    H3b: { id: 'H3b', tasks: ext, arms: HB, value: INTERVENTIONS, keep: every, seed: s('H3b'), threshold: 0.5, side: 'upper' },
  }
  // ruling 5: H4 first, H − W on the canary score, met when the 95% lower bound > 0; build and requirement apart decide nothing
  const H4 = { id: 'H4', tasks: ext, arms: HW, value: SCORE, seed: s('H4'), ...lower0 }, apart = (value) => line(mine, { tasks: ext, arms: HW, value, seed: s('H4') })
  const h4 = line(mine, H4)
  h4.met = clears(h4, H4)
  h4.build = apart(BUILD)
  h4.requirement = apart(REQUIREMENT)
  const result = { integrity, h4 }

  if (h4.met) {
    const h1 = line(mine, spec.H1), h2 = line(mine, spec.H2), a = line(mine, spec.H3a), b = line(mine, spec.H3b), h3 = { a, b, p: Math.max(a.p, b.p) }
    const order = holm([hypothesis(mine, 'H1', h1.p, [spec.H1]), hypothesis(mine, 'H2', h2.p, [spec.H2]), hypothesis(mine, 'H3', h3.p, [spec.H3a, spec.H3b])])
    const holmMet = (id) => order.find((h) => h.id === id).met
    h1.point = h1.mean >= POINT // after the step-down, never stopping it
    h1.met = holmMet('H1') && h1.point
    h2.met = holmMet('H2')
    h3.met = holmMet('H3')
    // real-estate: the same lines, H1 only where the task has step ids; no p, no Holm, no verdict
    const reLine = (k, tasks) => { const { threshold, side, ...x } = spec[k]; return line(mine, { ...x, tasks, seed: s(`re-${k}`) }) }
    const realEstate = { h1: reLine('H1', withIds(re)), h2: reLine('H2', re), h3a: reLine('H3a', re), h3b: reLine('H3b', re) }
    // ruling 7: per set and arm over the tasks with step ids; k the runs with `passed`, a task with k < j out of pass^j
    const passK = groups(mine).flatMap(([set, arm]) => [1, 3].map((j) => {
      const ds = [], out = []
      for (const task of withIds([...new Set(mine.filter((r) => r.set === set).map((r) => r.task))])) {
        const ps = mine.filter((r) => r.task === task && r.arm === arm && typeof r.passed === 'boolean')
        if (ps.length < j) out.push(task)
        else ds.push(choose(ps.filter((r) => r.passed).length, j) / choose(ps.length, j))
      }
      return { set, arm, j, tasks: ds.length, out, ...interval(ds, s(`passk-${set}-${arm}-${j}`)) }
    }))
    // ruling 9: the mean over scored runs of each run's precondition share
    const featureMissing = groups(mine).map(([set, arm]) => {
      const xs = mine.filter((r) => r.set === set && r.arm === arm && isScored(r) && typeof r.featureMissing === 'number').map((r) => r.featureMissing)
      return { set, arm, runs: xs.length, mean: mean(xs) }
    })
    Object.assign(result, { h1, h2, h3, holm: order, realEstate, passK, featureMissing })
  }

  // ruling 8: met on the pooled set when the lower bound >= 0.5; the others printed apart; the dropped bugs only in the line without them
  const drop = new Set(sets.h5Drop), n = (f) => bugs.filter(f).length
  const pooled = h5Line(h5, s('H5'))
  pooled.met = pooled.lower !== null && pooled.lower >= H5_MIN
  pooled.classes = { na: n((b) => b.at === 'precondition' || b.at === 'error' || b.port === 'not-applicable'), refused: n((b) => b.port === 'refused'),
    notready: n((b) => b.port === 'notready'), nosuite: n((b) => b.port === 'ported' && b.caught === null) } // h5.mjs's count line
  result.h5 = { pooled, external: h5Line(h5.filter((x) => ext.includes(x.task)), s('H5-ext')), realEstate: h5Line(h5.filter((x) => re.includes(x.task)), s('H5-re')),
    without: { drop: sets.h5Drop, ...h5Line(h5.map((x) => ({ ...x, bugs: x.bugs.filter((b) => !drop.has(b.bug)) })), s(`H5-no-${sets.h5Drop.join(',')}`)) } }
  // ruling 9: tokens and minutes per run and the end reasons, over every standing run, scored or not
  const of = (set, arm) => mine.filter((r) => r.set === set && r.arm === arm)
  result.cost = groups(mine).map(([set, arm]) => { const rs = of(set, arm); return { set, arm, runs: rs.length, tokens: mean(rs.map((r) => r.tokens)), minutes: mean(rs.map((r) => r.minutes)) } })
  result.ends = groups(mine).map(([set, arm]) => ({ set, arm, ends: Object.fromEntries(Object.entries(Object.groupBy(of(set, arm), (r) => String(r.end))).map(([k, v]) => [k, v.length])) }))
  return result
}
// the (set, arm) pairs of the runs, sorted; the set's name is the table's
const groups = (runs) => [...new Set(runs.map((r) => `${r.set}\t${r.arm}`))].sort().map((k) => k.split('\t'))
