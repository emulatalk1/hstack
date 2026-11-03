// Pure rules of external task selection. Every stack, language and tool string comes from the cfg (groups.json).
export function sortKey(id, seed) {
  return new Bun.CryptoHasher('sha256').update(`${id.toLowerCase()} ${seed}`).digest('hex')
}

// does `path` exist from the root? the listing holds the root and one level of each root folder
export const exists = (tree, path) => {
  const i = path.indexOf('/')
  return i < 0 ? tree.root.includes(path) : !!tree.dirs[path.slice(0, i)]?.includes(path.slice(i + 1))
}

// a cond holds in folder d ('' = root); a path with a slash, or a cond marked `root`, matches in the root only
function holds(tree, texts, d, { path, text, absent, root }) {
  if (absent) return !exists(tree, path) // an exclusion is read from the root whatever folder the group matched in
  if ((path.includes('/') || root) && d) return false
  const full = d ? `${d}/${path}` : path
  const here = d ? tree.dirs[d].includes(path) : exists(tree, path)
  if (!here) return false
  return text === undefined || (texts[full] !== undefined && new RegExp(text).test(texts[full]))
}

export function stackOf(tree, texts, groups, language) {
  const folders = ['', ...Object.keys(tree.dirs)]
  const g = groups.find((g) => g.languages.includes(language) &&
    g.markers.some((and) => folders.some((d) => and.every((c) => holds(tree, texts, d, c)))))
  return g ? g.id : null
}

const time = (s) => Date.parse(s)
const matches = (group, f) => group.testPaths.some((p) => new RegExp(p).test(f))

// the repo-level reasons, first in registered order; `list` reads markers only for a repo with none
export function repoOut(repo, cfg) {
  const reasons = [
    ['licence', !cfg.licences.includes(repo.licence)],
    ['fork or archived or mirror', repo.isFork || repo.isArchived || repo.isMirror],
    ['repo too new', time(repo.createdAt) >= time(cfg.repo.createdBefore)],
    ['inactive', time(repo.pushedAt) < time(cfg.repo.pushedFrom)],
    ['used in hstack', cfg.usedInHstack.some((r) => r.toLowerCase() === repo.nameWithOwner.toLowerCase())],
  ]
  return reasons.find(([, out]) => out)?.[0] ?? null
}

export function staticOut(pr, repo, cfg, group) {
  const issue = pr.closing[0]
  const nonTest = (f) => !matches(group, f) && !/\.md$/.test(f) && !/(^|\/)docs\//.test(f)
  const reasons = [
    ['bot author', pr.author?.type === 'Bot'],
    ['not default branch', pr.baseRefName !== repo.defaultBranch],
    ['window', time(pr.createdAt) < time(cfg.window.createdFrom) || time(pr.mergedAt) >= time(cfg.window.mergedBefore)],
    ['closing issues != 1', pr.closingTotal !== 1],
    ['issue in another repo', issue?.repo.toLowerCase() !== repo.nameWithOwner.toLowerCase()],
    ['issue before window', time(issue?.createdAt) < time(cfg.window.createdFrom)],
    ['issue after PR', time(issue?.createdAt) >= time(pr.createdAt)],
    ['over 100 files', pr.changedFiles > cfg.maxFiles || pr.filesTotal > pr.files.length],
    ['no test file', !pr.files.some((f) => matches(group, f))],
    ['no non-test file', !pr.files.some(nonTest)],
  ]
  return repoOut(repo, cfg) ?? reasons.find(([, out]) => out)?.[0] ?? null
}

export function baseOf({ parents, commits, prFiles, diffFiles }) {
  if (parents.length >= 2) return { base: parents[0], method: 'merge' }
  if (commits === 1) return { base: parents[0], method: 'single' }
  const same = new Set(diffFiles).size === new Set(prFiles).size && prFiles.every((f) => diffFiles.includes(f))
  return same ? { base: parents[0], method: 'squash' } : { out: 'rebase merge of several commits' }
}

// readJunit cases; the id is classname::name
const passing = (cases) => {
  const m = new Map()
  for (const c of cases) {
    const id = `${c.classname}::${c.name}`
    m.set(id, (m.get(id) ?? true) && c.status === 'pass')
  }
  return new Set([...m].filter(([, p]) => p).map(([id]) => id))
}

// ids that failed or errored (a skipped case is neither a failure nor a pass)
const failing = (cases) => new Set(cases.filter((c) => c.status === 'fail' || c.status === 'error').map((c) => `${c.classname}::${c.name}`))

export function failToPass(base, end1, end2) {
  const [b, e1, e2] = [base, end1, end2].map(passing)
  const bf = failing(base)
  const both = [...e1].filter((id) => e2.has(id))
  const missing = (id) => !base.some((c) => `${c.classname}::${c.name}` === id)
  return { f2p: both.filter((id) => bf.has(id) || missing(id)), p2p: both.filter((id) => b.has(id)), endPass: both.length }
}

export function nextToCheck(rows, walked, cfg) {
  const last = new Map(walked.map((w) => [w.id, w.result]))
  const accepted = rows.filter((r) => last.get(r.id) === 'ok')
  if (accepted.length >= cfg.perStack) return null
  const per = new Map()
  for (const r of accepted) per.set(r.repo, (per.get(r.repo) ?? 0) + 1)
  const capped = []
  for (const row of rows) {
    const res = last.get(row.id)
    if (res !== undefined && res !== 'repo cap' && !/^(error|recheck)\b/.test(res)) continue // accepted, dropped or out: final (a recheck row reopens it)
    if ((per.get(row.repo) ?? 0) >= cfg.perRepo) capped.push(row)
    else return { row, capped }
  }
  return null
}

// the extra probe path (ruling 10): the first file at the base, in path order, under the stack's test paths whose
// extension no probe file has, so a test script that fails on a fixture or data file fails in a readable round; null if none
export function extraProbe(paths, testPaths, probe) {
  const ext = (f) => { const b = f.slice(f.lastIndexOf('/') + 1), i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : '' }
  const seen = new Set(probe.map(ext)), res = testPaths.map((p) => new RegExp(p))
  return [...paths].sort().find((f) => !seen.has(ext(f)) && res.some((r) => r.test(f))) ?? null
}

// the sampled repo whose best-ranked task ranks lowest (ruling 13)
export function coldSetup(sample) {
  const best = new Map()
  for (const { repo, rank } of sample) best.set(repo, Math.min(best.get(repo) ?? Infinity, rank))
  if (!best.size) return null
  return [...best].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
}
