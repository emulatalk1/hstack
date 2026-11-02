#!/usr/bin/env bun
// External task selection. `list`: search the repo universe of a tier, read each repo's stack markers, read every merged
// PR of the window that links an issue, and write them sorted by key. Every response is saved under <data>/ext/raw/
// before it is parsed, and a rerun reuses a saved one (resume). Prints counts only: never a PR title, body, path or issue.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { exists, repoOut, sortKey, stackOf, staticOut } from './lib/ext.mjs'

const USAGE = 'usage: bun bench/ext.mjs list <groups.json> --tier <1|2>'
const sha = (s) => new Bun.CryptoHasher('sha256').update(s).digest('hex')
const flag = (argv, k) => argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1)
const name = (argv) => (argv.includes('graphql') ? `graphql ${flag(argv, 'q') ?? '(repo batch)'}` : `${argv[3]} ${flag(argv, 'q')} page ${flag(argv, 'page')}`)

// why a gh call failed, from its stdout and stderr: `partial` is an answer whose only errors are missing repos
export function ghFailure(out, err) {
  let body = null
  try { body = JSON.parse(out) } catch {}
  const types = body?.errors?.map((e) => e.type) ?? []
  if (body?.data && types.length && types.every((t) => t === 'NOT_FOUND')) return 'partial'
  if (/secondary rate limit|abuse detection|HTTP 429/i.test(err)) return 'secondary'
  if (types.includes('RATE_LIMITED') || (/rate limit/i.test(err) && /HTTP 403/.test(err))) return 'primary'
  if (/HTTP 50[234]|unexpected end of JSON input|EOF|connection reset|timeout/i.test(err)) return 'transient'
  return 'error'
}

const spawnGh = async (argv) => {
  const p = Bun.spawn(['gh', ...argv], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
  return { out, err, code }
}

async function resetWait(argv) {
  try {
    const r = JSON.parse((await spawnGh(['api', 'rate_limit'])).out).resources
    const res = argv.includes('search/repositories') ? r.search : argv.includes('graphql') ? r.graphql : r.core
    return Math.max(1000, res.reset * 1000 - Date.now() + 1000)
  } catch { return 60000 }
}

let lastSearch = 0
// the default gh: REST searches 2.1 s apart (30 a minute); a rate limit waits and retries up to 10 times, a 5xx twice
// (a GraphQL batch that times out comes back 5xx, and the caller halves it)
export async function realGh(argv) {
  for (let i = 0, transient = 0; ; i++) {
    if (argv.includes('search/repositories')) { await Bun.sleep(Math.max(0, lastSearch + 2100 - Date.now())); lastSearch = Date.now() }
    const { out, err, code } = await spawnGh(argv)
    if (code === 0) return out
    const kind = ghFailure(out, err)
    if (kind === 'partial') return out
    // stderr only: stdout may hold a partial answer with PR fields
    if (kind === 'error' || i >= 10 || (kind === 'transient' && ++transient > 2)) throw Object.assign(new Error(`gh ${name(argv)}: ${err.trim().slice(0, 300)}`), { kind })
    const wait = kind === 'primary' ? await resetWait(argv) : kind === 'secondary' ? 60000 : 15000
    console.error(`${new Date().toISOString()} ${kind} failure on ${name(argv)}, waiting ${Math.round(wait / 1000)} s (${i + 1}/10)`)
    await Bun.sleep(wait)
  }
}

const TREE = 'object(expression: "HEAD:") { ... on Tree { entries { name type object { ... on Tree { entries { name } } } } } }'
const PRS = `query($q: String!, $after: String) { rateLimit { cost } search(type: ISSUE, query: $q, first: 100, after: $after) { issueCount pageInfo { hasNextPage endCursor }
  nodes { ... on PullRequest { number createdAt mergedAt author { __typename } baseRefName changedFiles mergeCommit { oid } commits { totalCount }
  files(first: 100) { totalCount nodes { path } } closingIssuesReferences(first: 5) { totalCount nodes { number createdAt repository { nameWithOwner } } } } } } }`
const DAY = 864e5
const day = (d, end) => new Date(d * DAY).toISOString().slice(0, 10) + (end ? 'T23:59:59Z' : 'T00:00:00Z')

const repoOf = (r, language) => ({ nameWithOwner: r.full_name, licence: r.license?.spdx_id ?? null, isFork: r.fork, isArchived: r.archived, isMirror: !!r.mirror_url,
  createdAt: r.created_at, pushedAt: r.pushed_at, defaultBranch: r.default_branch, stars: r.stargazers_count, language })
// a field GitHub left null keeps its total (an unknown total is Infinity), so the PR falls out with a reason, never silently
const prOf = (n) => ({ number: n.number, createdAt: n.createdAt, mergedAt: n.mergedAt, author: { type: n.author?.__typename }, baseRefName: n.baseRefName,
  changedFiles: n.changedFiles, files: (n.files?.nodes ?? []).map((f) => f?.path).filter(Boolean), filesTotal: n.files?.totalCount ?? Infinity,
  closing: (n.closingIssuesReferences?.nodes ?? []).map((i) => ({ repo: i?.repository?.nameWithOwner ?? '', number: i?.number, createdAt: i?.createdAt })),
  closingTotal: n.closingIssuesReferences?.totalCount ?? Infinity, commits: n.commits?.totalCount, mergeCommit: n.mergeCommit?.oid })
const treeOf = (obj) => {
  const es = obj?.entries ?? []
  return { root: es.map((e) => e.name), dirs: Object.fromEntries(es.filter((e) => e.type === 'tree').map((e) => [e.name, (e.object?.entries ?? []).map((c) => c.name)])) }
}
const repoArg = (r) => { const [o, n] = r.nameWithOwner.split('/'); return `repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)})` }

export async function list(args, { gh = realGh, data = process.env.HSTACK_BENCH_MACHINE && dirname(process.env.HSTACK_BENCH_MACHINE), log = (s) => console.error(s) } = {}) {
  const [groupsPath, t, tier, ...rest] = args
  if (!groupsPath || t !== '--tier' || !['1', '2'].includes(tier) || rest.length) throw new Error(USAGE)
  if (!data) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const cfg = await Bun.file(groupsPath).json()
  const langs = cfg.groups.flatMap((g) => g.languages)
  if (new Set(langs).size !== langs.length) throw new Error('a language is in two groups') // points and counts go to one stack per language
  const ext = join(data, 'ext'), raw = join(ext, 'raw')
  mkdirSync(raw, { recursive: true })
  const stat = { requests: 0, fresh: 0, freshPoints: 0 }
  let cur // the counts of the stack being listed

  const call = async (argv) => {
    const file = join(raw, `${sha(JSON.stringify(argv))}.json`), fresh = !existsSync(file)
    stat.requests++
    if (fresh) {
      const out = await gh(argv), tmp = join(ext, `.raw-${process.pid}.tmp`) // renamed in, so a kill never leaves half a file
      writeFileSync(tmp, out)
      renameSync(tmp, file)
      stat.fresh++
    }
    try { return { file, fresh, body: JSON.parse(readFileSync(file, 'utf8')) } } catch (e) {
      rmSync(file) // a saved answer that does not parse is not kept: a restart asks again
      throw new Error(`${name(argv)}: the answer does not parse (${e.message})`)
    }
  }
  const gql = async (query, vars = {}) => {
    const argv = ['api', 'graphql', '-f', `query=${query}`, ...Object.entries(vars).flatMap(([k, v]) => ['-f', `${k}=${v}`])]
    const { body, fresh } = await call(argv)
    const cost = body.data?.rateLimit?.cost ?? 0
    cur.points += cost
    if (fresh) stat.freshPoints += cost
    return body.data
  }
  const restPage = async (q, page) => {
    const argv = ['api', '-X', 'GET', 'search/repositories', '-f', `q=${q}`, '-f', 'sort=stars', '-f', 'order=desc', '-f', 'per_page=100', '-f', `page=${page}`]
    for (let i = 0; ; i++) {
      const { file, body } = await call(argv)
      if (!body.incomplete_results) return body
      rmSync(file) // a partial page (search timed out) is not kept: ask again
      if (i >= 3) throw new Error(`search ${q} page ${page}: incomplete results 4 times`)
      log(`incomplete results on ${q} page ${page}, asking again in 10 s`)
      await Bun.sleep(10000)
    }
  }
  // GraphQL batches of up to 50 repo aliases, halved while GitHub refuses the query (too big, timed out)
  const batches = async (items, line, use) => {
    let size = 50
    for (let i = 0; i < items.length;) {
      const part = items.slice(i, i + size)
      let d
      try { d = await gql(`query {\nrateLimit { cost }\n${part.map((x, k) => `r${k}: ${line(x)}`).join('\n')}\n}`) } catch (e) {
        if (size === 1) throw e
        size = Math.ceil(size / 2)
        log(`${cur.id} batch refused (${e.message.slice(0, 120)}), size now ${size}`)
        continue
      }
      part.forEach((x, k) => use(x, d[`r${k}`]))
      i += part.length
      log(`${cur.id} markers ${i}/${items.length}`)
    }
  }

  const lo = tier === '1' ? cfg.repo.starsMin : cfg.repo.tier2StarsMin, hi = tier === '1' ? Infinity : cfg.repo.starsMin - 1
  const slices = []
  let a = lo
  for (; hi === Infinity ? a < 128 * lo : 2 * a - 1 < hi; a *= 2) slices.push([a, 2 * a - 1])
  slices.push([a, hi])
  async function searchRepos(language) {
    const repos = new Map(), todo = [...slices]
    while (todo.length) {
      const got = new Set()
      const [a, b] = todo.shift()
      const q = `language:${language} stars:${b === Infinity ? `>=${a}` : `${a}..${b}`} pushed:>=${cfg.repo.pushedFrom} created:<${cfg.repo.createdBefore} archived:false fork:false`
      for (let page = 1; page <= 10; page++) {
        const j = await restPage(q, page)
        if (page === 1 && j.total_count >= 1000) { // the search returns at most 1000: halve the stars range
          if (a === b) throw new Error(`${q}: a one-star range still reaches the search cap`)
          const m = b === Infinity ? 2 * a - 1 : a + Math.floor((b - a) / 2)
          todo.unshift([a, m], [m + 1, b])
          break
        }
        for (const r of j.items) { got.add(r.full_name); if (!repos.has(r.full_name)) repos.set(r.full_name, repoOf(r, language)) }
        if (page * 100 >= j.total_count) {
          // the universe moves while it is read: a small shortfall is expected, and it is counted
          const short = Math.max(0, j.total_count - got.size)
          if (short) log(`${cur.id} ${language} stars ${a}..${b}: total ${j.total_count}, collected ${got.size}`)
          cur.shortfall += short
          break
        }
      }
    }
    return [...repos.values()]
  }

  const d0 = Math.floor(Date.parse(cfg.window.createdFrom) / DAY), d1 = Math.ceil(Date.parse(cfg.window.mergedBefore) / DAY) - 1
  async function prsOf(repo) {
    const prs = new Map(), todo = [[d0, d1]]
    while (todo.length) {
      const [a, b] = todo.shift()
      const q = `repo:${repo.nameWithOwner} is:pr is:merged created:${day(a)}..${day(b, true)} merged:<${cfg.window.mergedBefore} linked:issue`
      const got = new Set()
      for (let after = null, page = 1, first = 100; ; page++) {
        let s
        // a page that keeps failing (too heavy) is asked again with fewer PRs; 100 keeps the query text, so saved answers match
        try { s = (await gql(PRS.replace('first: 100, after', `first: ${first}, after`), after ? { q, after } : { q })).search } catch (e) {
          if (e.kind !== 'transient' || first <= 6) throw e
          first = Math.floor(first / 2)
          log(`${cur.id} PR page refused (${e.message.slice(0, 120)}), first now ${first}`)
          page--
          continue
        }
        if (page === 1 && s.issueCount >= 1000) { // same cap: halve the created range
          if (a === b) throw new Error(`${q}: a one-day range still reaches the search cap`)
          const m = a + Math.floor((b - a) / 2)
          todo.unshift([a, m], [m + 1, b])
          break
        }
        for (const n of s.nodes) if (n) { got.add(n.number); prs.set(n.number, n) }
        if (!s.pageInfo.hasNextPage) {
          if (got.size < s.issueCount) throw new Error(`${q}: ${got.size} PRs collected, issueCount ${s.issueCount}`) // the window is closed: nothing may be missing
          break
        }
        after = s.pageInfo.endCursor
      }
    }
    return [...prs.values()].map(prOf)
  }

  const counts = {}, repoRows = [], rows = []
  for (const g of cfg.groups) {
    cur = counts[g.id] = { repos: 0, markers: 0, prs: 0, ok: 0, reasons: {}, points: 0, shortfall: 0 }
    Object.defineProperty(cur, 'id', { value: g.id }) // for the log, kept out of the printed counts
    for (const language of g.languages) {
      const repos = await searchRepos(language), live = repos.filter((r) => !repoOut(r, cfg))
      cur.repos += repos.length
      log(`${g.id} ${language}: ${repos.length} repos, ${live.length} pass the repo rules`)
      const trees = new Map(), texts = new Map(), unreachable = new Set()
      await batches(live, (r) => `${repoArg(r)} { ${TREE} }`, (r, d) => { if (!d) unreachable.add(r); trees.set(r, treeOf(d?.object)) })
      const conds = g.markers.flat().filter((c) => c.text !== undefined && !c.absent)
      const need = (tree) => [...new Set(conds.flatMap((c) => (c.path.includes('/') || c.root
        ? (exists(tree, c.path) ? [c.path] : [])
        : ['', ...Object.keys(tree.dirs)].filter((d) => (d ? tree.dirs[d].includes(c.path) : tree.root.includes(c.path))).map((d) => (d ? `${d}/${c.path}` : c.path)))))]
      const withFiles = live.filter((r) => need(trees.get(r)).length)
      await batches(withFiles, (r) => `${repoArg(r)} { ${need(trees.get(r)).map((p, k) => `f${k}: object(expression: ${JSON.stringify(`HEAD:${p}`)}) { ... on Blob { text } }`).join(' ')} }`,
        (r, d) => texts.set(r, Object.fromEntries(need(trees.get(r)).map((p, k) => [p, d?.[`f${k}`]?.text]).filter(([, t]) => typeof t === 'string'))))
      for (const r of repos) {
        const out = repoOut(r, cfg)
        r.stack = out ? null : stackOf(trees.get(r), texts.get(r) ?? {}, cfg.groups, language)
        repoRows.push([language, r.nameWithOwner, r.stars, r.stack ?? 'none', out ?? (unreachable.has(r) ? 'unreachable' : 'ok')])
      }
      const stacked = repos.filter((r) => r.stack)
      cur.markers += stacked.length
      for (const [i, r] of stacked.entries()) {
        const group = cfg.groups.find((x) => x.id === r.stack)
        for (const p of await prsOf(r)) {
          const id = `${r.nameWithOwner}#${p.number}`, why = staticOut(p, r, cfg, group) ?? 'ok'
          rows.push({ stack: r.stack, key: sortKey(id, cfg.seed), id, repo: r.nameWithOwner, stars: r.stars, pr_created: p.createdAt, merged_at: p.mergedAt,
            issue: p.closing[0]?.number ?? '', issue_created: p.closing[0]?.createdAt ?? '', static: why })
          const c = counts[r.stack]
          c.prs++
          if (why === 'ok') c.ok++
          else c.reasons[why] = (c.reasons[why] ?? 0) + 1
        }
        log(`${g.id} ${language} PRs: repo ${i + 1}/${stacked.length}, ${cur.prs} PRs so far; requests ${stat.requests} (${stat.fresh} new), new GraphQL points ${stat.freshPoints}`)
      }
    }
  }

  const head = ['stack', 'tier', 'rank', 'key', 'id', 'repo', 'stars', 'pr_created', 'merged_at', 'issue', 'issue_created', 'static']
  const sorted = cfg.groups.flatMap((g) => {
    let rank = 0
    return rows.filter((r) => r.stack === g.id).sort((x, y) => (x.key < y.key ? -1 : 1)).map((r) => ({ ...r, tier, rank: r.static === 'ok' ? ++rank : '' }))
  })
  writeFileSync(join(ext, `candidates-${tier}.tsv`), [head, ...sorted.map((r) => head.map((k) => r[k]))].map((l) => l.join('\t')).join('\n') + '\n')
  writeFileSync(join(ext, `repos-${tier}.tsv`), [['language', 'repo', 'stars', 'stack', 'reason'], ...repoRows].map((l) => l.join('\t')).join('\n') + '\n')
  log(`done: requests ${stat.requests} (${stat.fresh} new), new GraphQL points ${stat.freshPoints}`)
  return counts
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2)
  try {
    if (cmd !== 'list') throw new Error(USAGE)
    const counts = await list(rest)
    for (const [s, c] of Object.entries(counts)) {
      console.log(`${s}: repos searched ${c.repos}, repos with markers ${c.markers}, PRs read ${c.prs}, ok ${c.ok}, GraphQL points ${c.points}, slice shortfall ${c.shortfall}`)
      for (const [r, n] of Object.entries(c.reasons)) console.log(`${s}:   ${r} ${n}`)
    }
  } catch (e) { console.error(e.message); process.exit(2) }
}
