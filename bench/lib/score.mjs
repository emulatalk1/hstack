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
  if (bads.some((b) => b !== 'fail')) return 'broken'
  if (base === 'fail') return 'pre-existing'
  if (base === 'precondition') return 'absent-at-base'
  if (base === 'error') return 'broken' // the base run could not be validated
  return 'valid'
}

// spec 7.1: a weak, broken or pre-existing check counts in no score; validations: the parsed validation-*.json files
const UNSCORED = ['weak', 'broken', 'pre-existing']
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
