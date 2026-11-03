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
