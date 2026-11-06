// Pure rules of oracle preparation (step 5). No stack, tool or customer is named here.
import { sortKey } from './ext.mjs'

// the owner of each hunk (commit, file, old start): the task with the most lines, a tie to the earlier task of `order` (the bugs.mjs rule, per hunk)
export function hunkOwners(rows, order) {
  const lines = new Map()
  for (const r of rows) {
    const k = `${r.commit}\t${r.file}\t${r.old}`, per = lines.get(k) ?? new Map()
    per.set(r.task, (per.get(r.task) ?? 0) + r.lines)
    lines.set(k, per)
  }
  return new Map([...lines].map(([k, per]) => [k, order.reduce((best, t) => ((per.get(t) ?? -1) > (per.get(best) ?? -1) ? t : best))]))
}

// pe = 1 leaves nothing to correct: full agreement scores 1, anything else 0
const corrected = (po, pe) => (pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe))

export function agreement(a, b, categories) {
  if (a.length !== b.length || !a.length) throw new Error('agreement needs two equal, non-empty label lists')
  const n = a.length, q = categories.length
  const share = (xs, k) => xs.filter((x) => x === k).length / n
  const raw = a.filter((x, i) => x === b[i]).length / n
  const pi = categories.map((k) => (share(a, k) + share(b, k)) / 2)
  const peKappa = categories.reduce((s, k) => s + share(a, k) * share(b, k), 0)
  const peAc1 = q > 1 ? pi.reduce((s, p) => s + p * (1 - p), 0) / (q - 1) : 1
  return { n, agree: Math.round(raw * n), raw, kappa: corrected(raw, peKappa), ac1: corrected(raw, peAc1), top: Math.max(...pi) }
}

// 7.2 without the human part
export const usable = ({ kappa, raw, ac1, top }) => kappa >= 0.6 || (top > 0.8 && raw >= 0.85 && ac1 >= 0.7)

// ruling 15: agreed labels stay, a check rated by one classifier only is disputed
export function mergeLabels(c1, c2) {
  const l2 = new Map(c2.map((c) => [c.id, c.label]))
  const l1 = new Map(c1.map((c) => [c.id, c.label]))
  const out = { labels: {}, partly: [], disputed: [] }
  for (const id of new Set([...l1.keys(), ...l2.keys()])) {
    const l = l1.get(id)
    if (l === undefined || l !== l2.get(id)) out.disputed.push(id)
    else if (l === 'partly') out.partly.push(id)
    else out.labels[id] = l === 'traceable' ? 'build' : 'requirement'
  }
  return out
}

// ruling 12: boundaries newest first; a boundary whose base already fails is skipped (the bug is older)
export const introducer = (boundaries) =>
  boundaries.find((b) => b.end === 'fail' && (b.base === 'pass' || b.base === 'precondition'))?.task ?? null

// byte-length framing keeps ('a','bc') apart from ('ab','c')
export function oracleSha(files) {
  const h = new Bun.CryptoHasher('sha256')
  for (const { path, text } of [...files].sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0)))
    h.update(`${Buffer.byteLength(path)}\n${path}${Buffer.byteLength(text)}\n${text}`)
  return h.digest('hex')
}

export function queuePick(ids, n, seed) {
  const key = new Map(ids.map((id) => [id, sortKey(id, seed)]))
  return [...ids].sort((x, y) => (key.get(x) < key.get(y) ? -1 : key.get(x) > key.get(y) ? 1 : 0)).slice(0, n)
}

// the highest n of `<sha7>-T<n>` among ids, 0 when none
export function nextNumber(ids, sha7) {
  let max = 0
  for (const id of ids) { const m = String(id).match(/^(.+)-T(\d+)$/); if (m && m[1] === sha7) max = Math.max(max, Number(m[2])) }
  return max
}

// a f2p.json case (a string, or { classname, name }) as one id
export const caseId = (c) => (typeof c === 'string' ? c : `${c.classname}::${c.name}`)

// ruling 2 of step 6: is the origin test (`<file>::<name>`, the name may hold `::`) a fail-to-pass or a pass-to-pass case?
const nameOf = (id) => { const i = id.indexOf('::'); return i < 0 ? id : id.slice(i + 2) }
const lastSegment = (s) => s.replace(/\s*(\[[^\]]*\]|\([^)]*\))$/, '').split(/::|\.|\/| > | › /).at(-1).trim()
export function f2pOf(origin, f2p, p2p) {
  const name = nameOf(origin)
  const exact = (list) => list.some((id) => id === name || nameOf(id) === name || id.endsWith(`::${name}`) || id.endsWith(`.${name}`))
  const [ef, ep] = [exact(f2p), exact(p2p)]
  if (ef !== ep) return { verdict: ef ? 'f2p' : 'p2p', by: 'exact' }
  if (ef) return { verdict: 'ask', by: null }
  const seg = lastSegment(name), has = (list) => seg !== '' && list.some((id) => lastSegment(nameOf(id)) === seg)
  const [sf, sp] = [has(f2p), has(p2p)]
  return sf !== sp ? { verdict: sf ? 'f2p' : 'p2p', by: 'segment' } : { verdict: 'ask', by: null }
}

// seeded bugs (step 7). The edges a candidate may name
export const EDGES = ['empty', 'null', 'duplicate', 'case', 'deleted', 'boundary']

// the new-side ranges of a -U0 diff. File headers are read as diffHunks does (a deleted file keeps its old path).
// `+c,0` is a pure deletion: c is the line it follows, so start = end = c
export function changedRanges(diff) {
  const out = []
  let file = null, head = false
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) { head = true; file = null }
    else if (head && line.startsWith('--- ')) file = line === '--- /dev/null' ? null : line.slice(6)
    else if (head && line.startsWith('+++ ') && line !== '+++ /dev/null') file = line.slice(6)
    const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (m) head = false
    if (m && file) { const c = Number(m[1]), d = m[2] === undefined ? 1 : Number(m[2]); out.push({ file, start: c, end: d === 0 ? c : c + d - 1 }) }
  }
  return out
}

export const inChanged = ({ file, old }, ranges, pad = 3) => ranges.some((r) => r.file === file && old >= r.start - pad && old <= r.end + pad)

// null unless `find` occurs exactly once (overlaps count) and differs from `replace`; slices, so `$` in replace stays literal
export function applyEdit(text, find, replace) {
  if (!find || find === replace) return null
  const at = text.indexOf(find)
  if (at < 0 || text.indexOf(find, at + 1) >= 0) return null
  return text.slice(0, at) + replace + text.slice(at + find.length)
}
