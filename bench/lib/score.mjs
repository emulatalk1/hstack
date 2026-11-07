import { createHash } from 'node:crypto'
import { checkId } from './junit.mjs'

const WEIGHT = { high: 3, medium: 2, low: 1 }
const RANK = { pass: 0, fail: 1, precondition: 2, error: 3 }
// a line that starts with the marker (after an optional "<Word>Error:"), not a code frame that quotes it
const PRECONDITION = /^\s*(?:\w*Error:\s*)?PRECONDITION:/m

// cases: readJunit output, or null when there is no readable JUnit file. The worst case of an id wins.
export function results(cases, ids) {
  const out = new Map(ids.map((id) => [id, 'error']))
  const seen = new Set()
  for (const c of cases ?? []) {
    const id = checkId(c.name)
    if (!out.has(id)) continue
    const r = c.status === 'skip' ? 'error' : c.status === 'fail' ? (PRECONDITION.test(c.message) ? 'precondition' : 'fail') : 'pass'
    if (!seen.has(id) || RANK[r] > RANK[out.get(id)]) out.set(id, r)
    seen.add(id)
  }
  return out
}

export function score(checks, res) {
  const share = (bucket) => {
    const cs = checks.filter((c) => c.bucket === bucket)
    const total = cs.reduce((n, c) => n + WEIGHT[c.severity], 0)
    return total ? cs.reduce((n, c) => n + (res.get(c.id) === 'pass' ? WEIGHT[c.severity] : 0), 0) / total : null
  }
  const scored = checks.filter((c) => c.bucket !== 'out')
  const missing = scored.filter((c) => res.get(c.id) === 'precondition').length
  return { build: share('build'), requirement: share('requirement'), featureMissing: scored.length ? missing / scored.length : 0, scored: scored.length }
}

// bad: the result on one known-bad version, or a list of them (the fix's parent and the task's end product)
export function verdict({ ref, bad, base }) {
  const bads = [].concat(bad)
  if (ref !== 'pass') return 'broken'
  if (bads.includes('pass')) return 'weak'
  // ruling 10: with no base run the known-bad version is the base, so a missing feature there is the task itself
  if (bads.some((b) => b !== 'fail')) return base === undefined && bads.every((b) => b === 'fail' || b === 'precondition') ? 'absent-at-base' : 'broken'
  if (base === 'fail') return 'pre-existing'
  if (base === 'precondition') return 'absent-at-base'
  if (base === 'error') return 'broken' // the base run could not be validated
  return 'valid'
}

// spec 7.1: a weak, broken or pre-existing check counts in no score, nor one whose validation could not run (error, ruling 10);
// validations: the parsed validation-*.json files
const UNSCORED = ['weak', 'broken', 'pre-existing', 'error']
export function unscored(validations, ids) {
  const out = []
  for (const v of validations) for (const c of v.checks ?? [])
    if (ids.includes(c.id) && UNSCORED.includes(c.verdict) && !out.some((e) => e.id === c.id)) out.push({ id: c.id, verdict: c.verdict })
  return out
}

// manifest entries without `dropped` and with an interface other than 'none' are the checks; labels: { id: bucket }
export function checksFrom(manifest, labels = {}) {
  const checks = [], unlabelled = []
  for (const m of manifest) {
    if (m.dropped === true || m.interface === 'none') continue
    const l = labels[m.id]
    if (!(m.severity in WEIGHT)) throw new Error(`check ${m.id}: severity ${JSON.stringify(m.severity)} must be high, medium or low`)
    if (l !== undefined && !['build', 'requirement', 'out', 'partly'].includes(l)) throw new Error(`check ${m.id}: label ${JSON.stringify(l)} must be build, requirement, out or partly`)
    if (l === undefined) unlabelled.push(m.id)
    checks.push({ id: m.id, bucket: l === 'partly' ? 'requirement' : l ?? 'out', severity: m.severity })
  }
  return { checks, unlabelled }
}

// a manifest fix_commit and a ref match when one is a prefix of the other, compared on at most 7 characters
export const fixMatches = (fix, ref) => { const a = fix.slice(0, 7), b = ref.slice(0, 7), n = Math.min(a.length, b.length); return n > 0 && a.slice(0, n) === b.slice(0, n) }

// ruling 7 of step 6 (9.1 as section 2 amends it). fix, step: grade files; step null reads the ids from fix.
// An id absent from its grade counts as a high check that did not pass, so a missing step check never helps a score.
export function floorScore(fix, step, ids) {
  const src = (step ?? fix).checks, byId = new Map(src.map((c) => [c.id, c]))
  const share = (cs) => {
    const total = cs.reduce((n, c) => n + WEIGHT[c.severity], 0)
    return total ? cs.reduce((n, c) => n + (c.result === 'pass' ? WEIGHT[c.severity] : 0), 0) / total : null
  }
  const mine = ids.map((id) => byId.get(id) ?? { id, severity: 'high', result: 'error' })
  const out = new Set((fix.excluded ?? []).map((e) => e.id))
  return {
    // H2 counts every non-excluded check whatever its bucket, `out` too (today only unlabelled or disputed, ruling 7); a future `out` label would be counted
    build: share(mine), requirement: share(fix.checks.filter((c) => !out.has(c.id))),
    passed: ids.length ? mine.every((c) => c.severity === 'low' || c.result === 'pass') : null,
  }
}

// ruling 7 of step 7: a check is judged against its own bug only. A bug that stops the build gives `error`, never `valid`
export const ownVerdict = (end, bug) => (bug === 'error' && end === 'pass' ? 'error' : verdict({ ref: end, bad: bug, base: 'pass' }))

// ruling 10 of step 7: of the non-excluded checks that pass at the end, those the bug turns into a fail or a missing feature.
// `excluded` comes from the bug's grade, written from today's validations; a kept end grade can hold an older list
export function killsOf(endGrade, bugGrade) {
  const out = new Set((bugGrade.excluded ?? []).map((e) => e.id))
  const atBug = new Map(bugGrade.checks.map((c) => [c.id, c.result]))
  const live = endGrade.checks.filter((c) => !out.has(c.id) && c.result === 'pass')
  return { killed: live.filter((c) => ['fail', 'precondition'].includes(atBug.get(c.id))).length, of: live.length }
}

// ruling 9 of step 8: a null term adds nothing, for both arms alike
export const canaryScore = (build, requirement) => (build ?? 0) + (requirement ?? 0)

// rows: scored runs only. Judged when each of the 6 tasks has exactly 2 scored runs in each arm; d is B minus B-, a tie favours nobody.
// Rounded to 1e-9 so that float noise in a mean of two scores cannot turn a tie into a win.
const CANARY_TASKS = 6
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const r9 = (x) => Math.round(x * 1e9) / 1e9
// the per-task numbers of rows (scored runs only): ok when each arm has exactly 2 runs
function perTask(rows) {
  const scored = rows.filter((r) => typeof r.build === 'number' || typeof r.requirement === 'number')
  return [...new Set(scored.map((r) => r.task))].map((task) => {
    const of = (arm) => scored.filter((r) => r.task === task && r.arm === arm)
    const [B, M] = [of('B'), of('B-')]
    const m = (rs, k) => mean(rs.map((r) => k ? r[k] ?? 0 : canaryScore(r.build, r.requirement)))
    const dOf = (k) => B.length && M.length ? r9(m(B, k) - m(M, k)) : null
    const d = dOf()
    return { task, ok: B.length === 2 && M.length === 2, b: m(B), bMinus: m(M), d, dBuild: dOf('build'), dRequirement: dOf('requirement'),
      spread: B.length === 2 ? r9(Math.abs(canaryScore(B[0].build, B[0].requirement) - canaryScore(B[1].build, B[1].requirement))) : null, favour: d > 0 }
  })
}
export function canaryVerdict(rows) {
  const tasks = perTask(rows)
  const judged = tasks.length === CANARY_TASKS && tasks.every((t) => t.ok)
  const ds = tasks.map((t) => t.d).filter((d) => d !== null)
  const favour = tasks.filter((t) => t.favour).length, avg = ds.length ? r9(mean(ds)) : null
  return { tasks: tasks.map(({ ok, ...t }) => t), mean: avg, favour, pass: judged && avg > 0 && favour >= 5, judged }
}

// the interval rule of 10.1: 95% bootstrap over tasks (each task already holds its runs' mean), a PRNG seeded from sha256(seed)
const mulberry32 = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
export function bootstrapMean(ds, seed, resamples = 10000) {
  const rnd = mulberry32(createHash('sha256').update(seed).digest().readUInt32BE(0)), means = []
  for (let i = 0; i < resamples; i++) {
    let sum = 0
    for (let j = 0; j < ds.length; j++) sum += ds[Math.floor(rnd() * ds.length)]
    means.push(sum / ds.length)
  }
  means.sort((a, b) => a - b)
  return { mean: r9(mean(ds)), lower: r9(means[Math.floor(0.025 * resamples)]), upper: r9(means[Math.floor(0.975 * resamples)]) }
}
// Student's t, 0.975 quantile, 1..30 degrees of freedom; shortcut: past 30 the normal 1.96 (under 4% short), when a set that large is judged
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042]
export function tInterval(ds) {
  if (ds.length < 2) return { lower: null, upper: null }
  const n = ds.length, m = mean(ds), s = Math.sqrt(ds.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1)), h = (T975[n - 2] ?? 1.96) * s / Math.sqrt(n)
  return { lower: r9(m - h), upper: r9(m + h) }
}
// rows: scored runs. Judged when each of `tasks` has 2 scored runs in each arm; passes when the bootstrap lower bound of the mean of d is > 0.
export function intervalVerdict(rows, tasks, seed) {
  const per = perTask(rows.filter((r) => tasks.includes(r.task))), got = tasks.map((task) => per.find((t) => t.task === task)).filter(Boolean)
  const ds = got.map((t) => t.d).filter((d) => d !== null)
  const { mean: avg, lower, upper } = ds.length ? bootstrapMean(ds, seed) : { mean: null, lower: null, upper: null }
  const judged = tasks.length > 0 && got.length === tasks.length && got.every((t) => t.ok)
  return { tasks: got.map(({ ok, ...t }) => t), mean: avg, lower, upper, tLower: tInterval(ds).lower, favour: got.filter((t) => t.favour).length, judged, pass: judged && lower > 0 }
}
