#!/usr/bin/env bun
// External task selection. `list`: search the repo universe of a tier, read each repo's stack markers, read every merged
// PR of the window that links an issue, and write them sorted by key. Every response is saved under <data>/ext/raw/
// before it is parsed, and a rerun reuses a saved one (resume). Prints counts only: never a PR title, body, path or issue.
import { appendFileSync, closeSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fwImage, netCheck, pinHosts, rulesCommand } from './box.mjs'
import { withExport } from './env.mjs'
import { oracleFiles } from './grade.mjs'
import { check as inputCheck } from './input-check.mjs'
import { CAP_DROPS, fwScript } from './lib/arm.mjs'
import { baseOf, coldSetup, exists, extraProbe, failToPass, keptIds, nextToCheck, repoOut, sampleOf, sortKey, stackOf, staticOut } from './lib/ext.mjs'
import { readJunit } from './lib/junit.mjs'
import { oracleSha } from './lib/oracle.mjs'
import { runGroup } from './lib/proc.mjs'

const USAGE = `usage: bun bench/ext.mjs list <groups.json> --tier <1|2>
       bun bench/ext.mjs check <groups.json> <stack> <rank> [--tier <1|2>]
       bun bench/ext.mjs walk <groups.json> <stack> [--tier <1|2>] [--remove-out]
       bun bench/ext.mjs sample <groups.json> [--tier <1|2>]
       bun bench/ext.mjs task-env <groups.json> <task> (--reply <reply file> --sha <sha256> | --from-meta)
       bun bench/ext.mjs box-env <task>
       bun bench/ext.mjs serve <groups.json> <task>
       bun bench/ext.mjs oracle-run <task>   (grade's oracle command: BENCH_DIR, BENCH_ORACLE, BENCH_JUNIT, BENCH_TRUSTED)
       bun bench/ext.mjs remove <task>`
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
  if (/HTTP 50[234]|unexpected end of JSON input|EOF|connection reset|timeout|timed out/i.test(err)) return 'transient'
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

// `check`: one candidate in containers (rulings 9-11). `walk`: candidates in sort order until a stack has perStack accepted.
// stdout: one verdict line per check; repo output goes to rounds/ (the base only) or sealed/ (after the PR's tests are in).
const PR_Q = `query($o: String!, $r: String!, $n: Int!) { repository(owner: $o, name: $r) { licenseInfo { spdxId } defaultBranchRef { name } pullRequest(number: $n) {
  createdAt mergedAt mergeCommit { oid } commits { totalCount } files(first: 100) { totalCount nodes { path } } baseRefName closingIssuesReferences(first: 5) { nodes { number createdAt } } } } }`
const ISSUE_Q = `query($o: String!, $r: String!, $n: Int!) { repository(owner: $o, name: $r) { issue(number: $n) { title body createdAt lastEditedAt
  userContentEdits(first: 100) { nodes { editedAt diff } } timelineItems(itemTypes: [RENAMED_TITLE_EVENT], first: 100) { nodes { ... on RenamedTitleEvent { createdAt previousTitle currentTitle } } } } } }`
const PLATFORMS = ['linux/arm64', 'linux/amd64']
const WALK = ['stack', 'tier', 'rank', 'id', 'result']
const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
export const word = (s) => `'${s.replaceAll("'", `'\\''`)}'` // one single-quoted sh word
const later = (a, b) => Date.parse(a) > Date.parse(b)
const isError = (result) => result.startsWith('error ')

// the issue's title and body as they stood at asOf (ruling 11). Checked on cli/cli on 2026-11-02: a UserContentEdit's diff is
// the whole body of that version, nodes come newest first, the oldest holds the text as created; lastEditedAt moves on body
// edits only (a title rename is a RenamedTitleEvent)
export function issueAsOf(issue, asOf) {
  const edits = (issue.userContentEdits?.nodes ?? []).filter((e) => e?.editedAt).sort((a, b) => Date.parse(b.editedAt) - Date.parse(a.editedAt))
  const renames = (issue.timelineItems?.nodes ?? []).filter((e) => e?.createdAt && later(e.createdAt, asOf)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const title = renames.length ? renames[0].previousTitle : issue.title
  if (!(issue.lastEditedAt && later(issue.lastEditedAt, asOf)) && !edits.some((e) => later(e.editedAt, asOf))) return { title, body: issue.body, editHistory: 'none' }
  const v = edits.find((e) => !later(e.editedAt, asOf)) // the version in force at asOf; an older one would be the wrong text
  return typeof v?.diff === 'string' ? { title, body: v.diff, editHistory: 'recovered' } : { title, body: issue.body, editHistory: 'unverified' }
}

const UNSAFE = /--network[= ]+host|--security[= ]+insecure|--mount[= ][^\n]*type=(ssh|secret)/i
// the reply is data: its shape is checked before any field reaches docker
export function parseRecipe(text) {
  const r = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  const probe = Array.isArray(r?.probe) && r.probe.length >= 1 && r.probe.length <= 3 && r.probe.every((p) => typeof p === 'string' && p)
  if (!PLATFORMS.includes(r?.platform) || typeof r.dockerfile !== 'string' || !r.dockerfile || typeof r.test !== 'string' || !probe) throw new Error('the recipe is not { platform, dockerfile, test, probe: [1 to 3 paths] }')
  if (!/^\s*COPY\s+\.\s+\/work\/?\s*$/im.test(r.dockerfile) || !/^\s*WORKDIR\s+\/work\/?\s*$/im.test(r.dockerfile)) throw new Error('the dockerfile must have COPY . /work and WORKDIR /work')
  if (UNSAFE.test(r.dockerfile)) throw new Error('the dockerfile may not use --network=host, --security=insecure or an ssh or secret mount')
  return { platform: r.platform, dockerfile: r.dockerfile, test: r.test, probe: r.probe }
}
// a build that fails twice with one of these in its log tail is the network's failure, not the repo's
const NET = Object.entries({ 'failed to resolve source metadata': /failed to resolve source metadata/i, toomanyrequests: /toomanyrequests/i, 'dial tcp': /dial tcp/i,
  'no such host': /no such host/i, 'Temporary failure in name resolution': /temporary failure in name resolution/i, 'Could not resolve host': /could not resolve host/i,
  'i/o timeout': /i\/o timeout/i, 'TLS handshake timeout': /tls handshake timeout/i, 'connection reset': /connection reset/i, ECONNRESET: /ECONNRESET/, ETIMEDOUT: /ETIMEDOUT/,
  'HTTP 503': /HTTP[^\n]{0,12}\b503\b|503 Service Unavailable/i, 'HTTP 502': /HTTP[^\n]{0,12}\b502\b|502 Bad Gateway/i })
// the network signature in a failed build's log tail, or null. A tag or image that does not exist says `failed to resolve
// source metadata ... not found` too: that is the recipe's failure (a spent round the agent is told of), never the network's
// how a run ended: our limit fired (a finished run), killed for memory, killed from outside, or exited by itself
export function runEnd(timedOut, exitCode, oom) {
  if (timedOut) return 'finished'
  if (oom === 'true') return 'oom' // ruling 10: the repo does not fit this machine, an out reason
  return exitCode === '137' || exitCode === '143' ? 'killed' : 'finished' // killed from outside: the machine's failure
}

// a full Docker disk in a log tail: the machine's failure, never the repo's (ruling 10)
export function diskFailure(text) {
  return /no space left on device/i.test(text) ? 'no space left on device' : /disk quota exceeded/i.test(text) ? 'disk quota exceeded' : null
}

// a `docker system df` size (decimal units, as docker prints them) in bytes, or NaN
export function parseSize(s) {
  const m = /^([\d.]+)\s*([kMGTP]?)B$/.exec(s.trim())
  return m ? Number(m[1]) * 1000 ** ' kMGTP'.indexOf(m[2] || ' ') : NaN
}

export const DISK_FLOOR_GB = 15
// a disk-full message is the machine's only when the disk is then below the floor, or cannot be told (ruling 10): a repo whose
// tests print it on a roomy disk is judged by its run
export const diskIsLow = (free) => free === null || free < DISK_FLOOR_GB

// free GB of a disk of limit bytes, 90% of it usable (the VM's root filesystem was 58.4 GB of a 64 GB limit), given the sizes
// `docker system df` prints; null when a size does not parse
export function freeGB(limit, sizes) {
  const used = sizes.map(parseSize).reduce((a, b) => a + b, 0)
  return Number.isFinite(used) ? (0.9 * limit - used) / 1e9 : null
}

// Docker's free disk in GB without a container: the disk limit (Docker Desktop's DiskSizeMiB, else the VM disk image's
// apparent size), see freeGB; null when it cannot be told
export async function dockerDiskFree() {
  const store = join(homedir(), 'Library/Group Containers/group.com.docker/settings-store.json')
  const raw = join(homedir(), 'Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw')
  let limit = null
  try { limit = JSON.parse(readFileSync(store, 'utf8')).DiskSizeMiB * 1048576 } catch {}
  if (!(limit > 0)) try { limit = statSync(raw).size } catch {}
  if (!(limit > 0)) return null
  const df = await sp(['docker', 'system', 'df', '--format', '{{.Size}}'])
  if (df.code) return null
  return freeGB(limit, df.out.trim().split('\n'))
}

// ruling 10, the feedback round: the base run and both end runs gave no case and exited non-zero
export const needsFeedback = (runs) => runs.length === 3 && runs.every((r) => r.cases === 0 && r.exitCode !== 0)
export const FEEDBACK = "Given the PR's test files the script exited with an error and ran no test; accept any repo-relative path under a test folder, map it to the runner's own selection, and run the owning tests when none is runnable."

export function netFailure(text) {
  if (/failed to resolve source metadata[^\n]*(not found|pull access denied|manifest unknown)/i.test(text)) return null // on that line only
  return NET.find(([, re]) => re.test(text))?.[0] ?? null
}
const tail = (file) => readFileSync(file, 'utf8').split('\n').slice(-200).join('\n')
const retryText = (f) => f.what === 'end' ? `\nA previous recipe served at this commit and not at the later commit it must also serve. The recipe:\n\n\`\`\`json\n${JSON.stringify(f.r, null, 2)}\n\`\`\`\n` : f.what === 'brief' ? `\nA recipe written under an earlier version of this brief follows. Start from it and change what this brief asks for:\n\n\`\`\`json\n${JSON.stringify(f.r, null, 2)}\n\`\`\`\n` : f.what === 'reply' ? `\nThe previous reply was not a valid recipe: ${f.message}\n` : `\nA previous recipe failed. The recipe:\n\n\`\`\`json\n${JSON.stringify(f.r, null, 2)}\n\`\`\`\n\nThe last 200 lines of its ${f.what} log:\n\n\`\`\`\n${tail(f.log)}\n\`\`\`\n`

// every external call has a limit: its process group is killed after timeoutSec and code is 'timeout'
export async function sp(argv, timeoutSec = 300) {
  const p = Bun.spawn(argv, { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', detached: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-p.pid, 'SIGKILL') } catch {} }, timeoutSec * 1000)
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
  clearTimeout(timer)
  return { out, err, code: timedOut ? 'timeout' : code }
}
// quiet: the message has the exit code only (the stderr of a sealed-phase call can name the PR's test files)
export const must = async (argv, what, { timeoutSec = 300, quiet = false } = {}) => {
  const r = await sp(argv, timeoutSec)
  if (r.code === 'timeout') throw new Error(`${what} timed out after ${timeoutSec} s`)
  if (r.code) throw new Error(`${what} failed (exit ${r.code})${quiet ? '' : `: ${r.err.trim().slice(-500)}`}`)
  return r.out
}
const limit = (promise, sec, what) => {
  let t
  return Promise.race([promise, new Promise((_, no) => { t = setTimeout(() => no(new Error(`${what} timed out after ${sec} s`)), sec * 1000) })]).finally(() => clearTimeout(t))
}
// grade runs this command with the product checkout as cwd, and Bun reads a runtime config and an env file from the cwd: so it
// first leaves the checkout (for this one, which holds neither file) and loads no env file; product content never runs on the host
const sq = (x) => `'${x.replaceAll("'", `'\\''`)}'`
export const oracleCommand = (task, script = join(import.meta.dir, 'ext.mjs')) => `cd ${sq(import.meta.dir)} && bun --no-env-file ${sq(script)} oracle-run ${task}`
export const dataOf = (data) => {
  const d = data ?? (process.env.HSTACK_BENCH_MACHINE && dirname(process.env.HSTACK_BENCH_MACHINE))
  if (!d) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  return d
}
const readTsv = (f) => {
  const [head, ...rows] = readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split('\t'))
  return rows.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])))
}
export const appendWalk = (ext, row, result) => {
  const f = join(ext, 'walk.tsv')
  if (!existsSync(f)) writeFileSync(f, WALK.join('\t') + '\n')
  appendFileSync(f, [row.stack, row.tier, row.rank, row.id, result].join('\t') + '\n')
}

export const daemon = async () => {
  const r = await sp(['docker', 'version', '--format', '{{.Server.Version}}'])
  if (r.code) throw new Error(`docker daemon: ${r.code === 'timeout' ? 'no answer in 300 s' : r.err.trim().slice(-300)}`)
}

// the image of commit (its files by scratch, plus .bench.Dockerfile, an empty .bench.Dockerfile.dockerignore and
// .bench-test.sh) tagged tag: its id; false when the build fails (the repo's failure), a throw when the daemon, the
// network or a low disk does
export async function buildImage({ scratch, dockerfile, test, platform, commit, tag, log, diskFree }) {
  return scratch('ctx', commit, async (dir) => {
    // a commit's symlink under one of these names would have the write land outside the folder
    for (const f of ['.bench.Dockerfile', '.bench.Dockerfile.dockerignore', '.bench-test.sh']) rmSync(join(dir, f), { force: true })
    writeFileSync(join(dir, '.bench.Dockerfile'), dockerfile)
    writeFileSync(join(dir, '.bench.Dockerfile.dockerignore'), '') // BuildKit reads it instead of the repo's .dockerignore
    writeFileSync(join(dir, '.bench-test.sh'), test)
    const iid = `${log}.iid`
    const once = async (flag) => {
      rmSync(iid, { force: true })
      const fd = openSync(log, flag)
      try {
        return (await runGroup(['docker', 'build', '--progress=plain', '--platform', platform, '-f', join(dir, '.bench.Dockerfile'), '--iidfile', iid, '-t', tag, dir], { timeoutSec: 2700, stdout: fd, stderr: fd })).code
      } finally { closeSync(fd) }
    }
    let code = await once('w')
    // once more from the BuildKit cache: a network blip passes then, the repo's own failure fails again
    if (code !== 0 && code !== 'timeout') { await daemon(); code = await once('a') }
    if (code !== 0) {
      await daemon()
      const t = tail(log), disk = diskFailure(t), sig = (disk && diskIsLow(await diskFree()) ? disk : null) ?? netFailure(t)
      if (sig) throw new Error(sig) // the signature's name only: the log is the repo's output
      return false
    }
    return readFileSync(iid, 'utf8').trim()
  })
}

// one run in a new container `name` of image with no network (or net) and a static command: files(dir) writes what goes in to
// dest (/work) by docker cp; created() records the name as soon as it exists. { how, timedOut, exitCode, oom } (how: runEnd);
// a throw when Docker fails, the run is killed from outside, or it prints a disk-full message while the disk is low
async function runContainer({ scratch, name, image, platform, cmd, files, created, log, timeoutSec, diskFree, stage, dest = '/work', net = ['--network', 'none'] }) {
  stage('run')
  await must(['docker', 'create', ...net, '--platform', platform, '--name', name, image, ...cmd], `docker create ${name}`)
  created()
  stage('cp')
  await scratch('in', null, async (dir) => {
    await files(dir)
    await must(['docker', 'cp', `${dir}/.`, `${name}:${dest}`], `docker cp into ${name}`, { quiet: true })
  })
  stage('run')
  const fd = openSync(log, 'w')
  let code
  try { ({ code } = await runGroup(['docker', 'start', '-a', name], { timeoutSec, stdout: fd, stderr: fd })) } finally { closeSync(fd) }
  const timedOut = code === 'timeout'
  if (timedOut) await sp(['docker', 'kill', name]) // this tool created it
  const st = await sp(['docker', 'inspect', '-f', '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}', name])
  if (st.code) { await daemon(); throw new Error(`docker inspect ${name} failed (exit ${st.code})`) }
  const [status, exitCode, oom] = st.out.trim().split(' ')
  if (status !== 'exited') throw new Error(`container ${name} is ${status}, not exited`)
  const how = runEnd(timedOut, exitCode, oom)
  const disk = exitCode !== '0' && diskFailure(tail(log))
  if (disk && diskIsLow(await diskFree())) throw new Error(disk) // the signature only: the log is the repo's output
  if (how === 'killed') throw new Error(`container ${name} was killed (exit ${exitCode}, OOMKilled ${oom})`)
  return { how, timedOut, exitCode, oom }
}

// rounds.tsv (`k slug result`): one row per round, written as soon as its reply exists (an interrupted round still counts),
// its result filled in after
const roundRows = (tsv) => (existsSync(tsv) ? readFileSync(tsv, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')) : [])
function setRound(tsv, k, slug, result) {
  const rows = roundRows(tsv).map((r) => r.join('\t'))
  const line = `${k}\t${slug}\t${result}`, i = rows.findIndex((l) => l.startsWith(`${k}\t${slug}\t`))
  if (i >= 0) rows[i] = line
  else rows.push(line)
  writeFileSync(`${tsv}.tmp`, rows.join('\n') + '\n')
  renameSync(`${tsv}.tmp`, tsv)
}
// a round number no file in dir and no rounds.tsv row has taken
const nextRound = (tsv, dir) => 1 + Math.max(0, ...roundRows(tsv).map((r) => Number(r[0])), ...readdirSync(dir).map((f) => Number(/^(\d+)\./.exec(f)?.[1] ?? 0)))
// ruling 10: 3 rounds for the repo's first task that needs them (the first slug in rounds.tsv), 1 for each further task
const roundsLeft = (tsv, slug) => { const done = roundRows(tsv); return ((done[0]?.[1] ?? slug) === slug ? 3 : 1) - done.filter((d) => d[1] === slug).length }

// the default recipe agent: a sealed agent with read tools on the files of the base; null when it gives no reply
async function sealedRecipe({ env, label, at, prompt, out }) {
  const r = await sp([process.execPath, join(import.meta.dir, 'sealed-agent.mjs'), env, label, '--at', at, '--tools', 'Read,Glob,Grep', '--prompt', prompt, '--out', out], 4000) // the agent's own limit is 3600 s
  return r.code === 0 && existsSync(out) ? readFileSync(out, 'utf8') : null
}

export async function check(row, cfg, { gh = realGh, remote = (repo) => `https://github.com/${repo}.git`, recipeAgent = sealedRecipe, diskFree = dockerDiskFree, data } = {}) {
  const started = Date.now(), ext = join(dataOf(data), 'ext')
  const [owner, name] = row.repo.split('/'), n = Number(row.id.split('#')[1])
  const key = slugOf(`${owner}__${name}`), slug = `${key}__${n}`
  const repoDir = join(ext, 'repos', key), recipes = join(ext, 'recipes', key), rounds = join(recipes, 'rounds')
  const taskDir = join(ext, 'tasks', slug), sealed = join(ext, 'sealed', slug), logs = join(sealed, 'logs')
  for (const d of [rounds, taskDir, logs, join(ext, 'env')]) mkdirSync(d, { recursive: true })
  const group = cfg.groups.find((g) => g.id === row.stack)
  const metaFile = join(taskDir, 'meta.json'), prev = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {}
  // the names of earlier attempts stay recorded for --remove-out; each attempt names its run containers anew
  const meta = { id: row.id, slug, stack: row.stack, tier: Number(row.tier), rank: Number(row.rank), url: `https://github.com/${row.repo}/pull/${n}`, defaultBranch: null,
    pr: n, prCreated: null, mergedAt: null, issue: Number(row.issue), issueCreated: null, end: null, base: null, method: null, licence: null, stars: Number(row.stars),
    f2p: null, p2p: null, editHistory: null, platform: null, images: prev.images ?? [], recipeRounds: 0, recipeSha: null, minutes: null,
    attempt: (prev.attempt ?? 0) + 1, containers: prev.containers ?? [], imageIds: prev.imageIds ?? [], runs: prev.runs ?? [] }
  const save = () => writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n')
  const task = { name: key, repo: repoDir, db: null, port: 1024, start: 'true', ready: 'http://localhost:1', oracle: 'true', junit: 'junit.xml', timeoutSec: 3600 }
  const envFile = join(ext, 'env', `${key}.json`)
  const git = (a, o) => must(['git', '--literal-pathspecs', '-C', repoDir, ...a], `git ${a[0]}`, o)
  let stage = 'fetch', seq = 0, end
  const scratch = (what, commit, fn) => withExport(task, commit, `${what}-${slug}-${process.pid}-${seq++}`, fn)
  const gql = async (query, vars) => {
    const argv = ['api', 'graphql', '-f', `query=${query}`, ...Object.entries(vars).flatMap(([k, v]) => [typeof v === 'number' ? '-F' : '-f', `${k}=${v}`])]
    const body = JSON.parse(await limit(gh(argv), 300, 'gh graphql'))
    if (!body?.data?.repository) throw new Error(`gh graphql: ${JSON.stringify(body?.errors ?? body).slice(0, 300)}`)
    return body.data.repository
  }
  // the image of commit with the recipe: false when the build fails (the repo's failure), a throw when the daemon or the
  // network does
  const build = async (recipe, commit, tag, log) => {
    stage = 'build'
    const id = await buildImage({ scratch, dockerfile: recipe.dockerfile, test: recipe.test, platform: recipe.platform, commit, tag, log, diskFree })
    if (!id) return false
    if (!meta.images.includes(tag)) meta.images.push(tag)
    if (!meta.imageIds.includes(id)) meta.imageIds.push(id)
    save()
    return true
  }
  const archive = async (paths, dir) => {
    const tar = join(dir, '.bench-tests.tar')
    await git(['archive', '-o', tar, end, '--', ...paths], { quiet: true })
    await must(['tar', '-x', '-f', tar, '-C', dir], 'tar -x', { quiet: true })
    rmSync(tar)
  }
  // one run in a new container of image with no network: the scripts (and, with copy, the PR's test files from end) go in
  // by docker cp, its command names no file, and its JUnit comes out by docker cp; [] when it wrote none
  const runIn = async (recipe, image, label, files, { del = [], copy = false, log, xml }) => {
    const c = `bench-ext-${slug}-${label}`
    const { how, timedOut, exitCode } = await runContainer({ scratch, name: c, image, platform: recipe.platform, cmd: ['sh', '/work/.bench-run.sh'], log, timeoutSec: 1800, diskFree,
      stage: (s) => { stage = s },
      created: () => { meta.containers.push(c); save() },
      files: async (dir) => {
        if (copy) await archive(files, dir)
        writeFileSync(join(dir, '.bench-test.sh'), recipe.test) // also here: a repo's .dockerignore may have kept it out of the image
        writeFileSync(join(dir, '.bench-run.sh'), ['rm -f /out/junit.xml', 'cd /work', 'mkdir -p /out', ...del.map((f) => `rm -f -- ${word(f)}`), `exec sh /work/.bench-test.sh ${files.map(word).join(' ')}`, ''].join('\n'))
      } })
    if (how === 'oom') { // the repo does not fit this machine: null, and the log says so (a probe's goes to the next round)
      appendFileSync(log, '\nbench: the container was killed for memory (OOMKilled)\n')
      meta.runs.push({ label, timedOut, exitCode: Number(exitCode), oom: true, cases: 0 })
      save()
      return null
    }
    stage = 'cp'
    rmSync(xml, { force: true })
    const got = await sp(['docker', 'cp', `${c}:/out/junit.xml`, xml])
    // no JUnit after a finished run is the repo's (ruling 10: at the base every case is then missing)
    const missing = got.code && got.code !== 'timeout' && /could not find the file/i.test(got.err)
    if (got.code && !missing) throw new Error(`docker cp out of ${c} failed: ${got.code === 'timeout' ? 'no answer in 300 s' : got.err.trim().slice(-300)}`)
    const cases = missing ? [] : readJunit(readFileSync(xml, 'utf8'))
    meta.runs.push({ label, timedOut, exitCode: Number(exitCode), cases: cases.length })
    save()
    return cases
  }

  const verdict = async () => {
    stage = 'fetch'
    const repo = await gql(PR_Q, { o: owner, r: name, n }), pr = repo.pullRequest
    if (!pr?.mergeCommit?.oid) throw new Error(`${row.id}: the answer has no merge commit`)
    writeFileSync(join(sealed, 'pr.json'), JSON.stringify(repo, null, 2) + '\n')
    end = pr.mergeCommit.oid
    const prFiles = (pr.files?.nodes ?? []).map((f) => f.path)
    Object.assign(meta, { defaultBranch: repo.defaultBranchRef?.name ?? null, licence: repo.licenseInfo?.spdxId ?? null, prCreated: pr.createdAt, mergedAt: pr.mergedAt, end })
    stage = 'clone'
    if (!existsSync(join(repoDir, 'HEAD'))) { mkdirSync(repoDir, { recursive: true }); await git(['init', '-q', '--bare']) }
    const url = await sp(['git', '-C', repoDir, 'config', '--get', 'remote.origin.url'])
    if (url.code === 'timeout') throw new Error('git config timed out after 300 s')
    if (url.code) await git(['remote', 'add', 'origin', remote(row.repo)])
    stage = 'fetch'
    // into a ref, so a later gc keeps the commit; a transfer slower than 1 kB/s for 5 minutes is given up
    await must(['git', '-c', 'http.lowSpeedLimit=1000', '-c', 'http.lowSpeedTime=300', '-C', repoDir, 'fetch', '-q', '--depth', '2', 'origin', `${end}:refs/ext/${end}`], 'git fetch', { timeoutSec: 1800 })
    stage = 'base'
    const parents = (await git(['rev-list', '--parents', '-n', '1', end])).trim().split(/\s+/).slice(1)
    const diffFiles = (await git(['diff', '-z', '--name-only', `${end}^1`, end])).split('\0').filter(Boolean)
    const b = baseOf({ parents, commits: pr.commits?.totalCount, prFiles, diffFiles })
    Object.assign(meta, { base: b.base ?? null, method: b.method ?? null })
    save()
    if (b.out) return b.out

    stage = 'issue'
    const issue = (await gql(ISSUE_Q, { o: owner, r: name, n: meta.issue })).issue
    if (!issue) throw new Error(`issue ${meta.issue}: not in the answer`)
    const snap = issueAsOf(issue, pr.createdAt)
    writeFileSync(join(taskDir, 'issue.json'), JSON.stringify({ title: snap.title, body: snap.body, asOf: pr.createdAt, editHistory: snap.editHistory }, null, 2) + '\n')
    Object.assign(meta, { issueCreated: issue.createdAt, editHistory: snap.editHistory })
    save()

    stage = 'recipe-agent'
    writeFileSync(envFile, JSON.stringify(task, null, 2) + '\n')
    const baseTag = `bench-ext/${slug}:${b.base.slice(0, 7)}`, saved = join(recipes, 'recipe.json'), roundsTsv = join(recipes, 'rounds.tsv')
    // a recipe passes when its image of the base builds and a probe file passes in it; that image is the base image.
    // The probe also gets one file of the base under the test paths with an extension no probe file has (extraProbe)
    const baseFiles = (await git(['ls-tree', '-r', '-z', '--full-tree', b.base], { quiet: true })).split('\0').filter((l) => l.split(' ')[1] === 'blob').map((l) => l.slice(l.indexOf('\t') + 1))
    const attempt = async (r, file, label) => {
      const log = join(rounds, `${file}.build.log`), probe = join(rounds, `${file}.probe`)
      if (!(await build(r, b.base, baseTag, log))) return { r, what: 'build', log }
      const extra = extraProbe(baseFiles, group.testPaths, r.probe)
      const cases = await runIn(r, baseTag, `probe-${label}`, extra ? [...r.probe, extra] : r.probe, { log: `${probe}.log`, xml: `${probe}.xml` })
      return cases?.some((c) => c.status === 'pass') ? null : { r, what: 'probe', log: `${probe}.log` }
    }
    const brief = readFileSync(join(ext, 'briefs', 'recipe.md'), 'utf8'), briefSha = sha(brief)
    let left = roundsLeft(roundsTsv, slug)
    let recipe = null, failed = null
    if (existsSync(saved)) { // the repo's recipe, reused: not a round; when it fails here, the first round is told why
      const text = readFileSync(saved, 'utf8'), r = parseRecipe(text)
      // ruling 10: a recipe written under another brief (or with no briefSha) is never used: regenerated first, from the old one
      // (with no round left, the candidate is recipe failed)
      if (JSON.parse(text).briefSha !== briefSha) failed = { r, what: 'brief' }
      else {
        failed = await attempt(r, `reuse-${slug}-${meta.attempt}`, `reuse-${meta.attempt}`)
        if (!failed) recipe = r
      }
    }
    const setRow = (k, result) => setRound(roundsTsv, k, slug, result)
    // one recipe round, its prompt the brief plus extra: the recipe that passed (saved), or null with failed saying why
    const round = async (extra, note = '') => {
      stage = 'recipe-agent'
      const k = nextRound(roundsTsv, rounds), prompt = join(rounds, `${k}.prompt.md`), out = join(rounds, `${k}.reply.md`)
      writeFileSync(prompt, brief.trimEnd() + '\n' + extra)
      const reply = await recipeAgent({ env: envFile, label: `recipe-${slug}-${k}`, at: b.base, prompt, out })
      if (reply == null) throw new Error(`recipe round ${k}: no reply`) // a tool failure: the round is not spent
      if (!existsSync(out)) writeFileSync(out, reply)
      setRow(k, `${note}replied`)
      meta.recipeRounds++
      let r
      try { r = parseRecipe(reply) } catch (e) { // a spent round: the next one is told why
        failed = { what: 'reply', message: e.message }
        setRow(k, `${note}bad reply`)
        return null
      }
      failed = await attempt(r, String(k), String(k))
      setRow(k, `${note}${failed ? `${failed.what} failed` : 'pass'}`)
      if (failed) return null
      writeFileSync(saved, JSON.stringify({ ...r, briefSha }, null, 2) + '\n')
      return r
    }
    while (!recipe && left-- > 0) recipe = await round(failed ? retryText(failed) : '')
    meta.platform = recipe?.platform ?? null
    meta.recipeSha = recipe ? sha(JSON.stringify(recipe)) : null // the recipe this check used: recipe.json is the repo's latest
    save()
    if (!recipe) return 'recipe failed'

    stage = 'base'
    // the test files: the PR's files matching the stack's test paths that exist at end; the others the PR deleted
    const tests = prFiles.filter((f) => group.testPaths.some((p) => new RegExp(p).test(f)))
    const atEnd = new Set(tests.length ? (await git(['ls-tree', '-r', '-z', '--name-only', end, '--', ...tests], { quiet: true })).split('\0').filter(Boolean) : [])
    const files = tests.filter((f) => atEnd.has(f)), del = tests.filter((f) => !atEnd.has(f))
    const endTag = `bench-ext/${slug}:${end.slice(0, 7)}`
    // the end image, then one base run with the PR's tests and two end runs: their cases, or an out reason
    const runAll = async (rec, sfx) => {
      if (!(await build(rec, end, endTag, join(logs, `end${sfx}.build.log`)))) return 'end build failed'
      if (!files.length) return 'PR tests do not pass at end' // no file to run: never call the test script with none
      const a = `${meta.attempt}${sfx}`, run = (image, label, o) => runIn(rec, image, label, files, { log: join(logs, `${label}.log`), xml: join(logs, `${label}.xml`), ...o })
      const atBase = await run(baseTag, `base-${a}`, { del, copy: true })
      const e1 = atBase && (await run(endTag, `end-${a}-1`)), e2 = e1 && (await run(endTag, `end-${a}-2`))
      return e2 ? [atBase, e1, e2] : 'out of memory'
    }
    let runs = await runAll(recipe, '')
    if (typeof runs === 'string') return runs
    // ruling 10: no case and an error in all three runs gets one more round (even at a spent budget), told only FEEDBACK
    if (needsFeedback(meta.runs.slice(-3))) {
      const r = await round(`\n${FEEDBACK}\n`, 'feedback ')
      if (r) {
        recipe = r
        meta.platform = r.platform
        meta.recipeSha = sha(JSON.stringify(r))
        save()
        runs = await runAll(r, 'f')
        if (typeof runs === 'string') return runs
      }
    }
    const [atBase, e1, e2] = runs
    const { f2p, p2p, endPass } = failToPass(atBase, e1, e2)
    writeFileSync(join(sealed, 'f2p.json'), JSON.stringify({ f2p, p2p }, null, 2) + '\n')
    Object.assign(meta, { f2p: f2p.length, p2p: p2p.length })
    if (!endPass) return 'PR tests do not pass at end'
    return f2p.length ? 'ok' : 'no fail-to-pass test'
  }

  let result
  // any throw, a bug of check's own included, is an error of the stage it was in: never an out reason
  try { result = await verdict() } catch (e) {
    result = `error ${stage}`
    writeFileSync(join(taskDir, 'check.err'), `${stage}: ${e.message}\n`)
  }
  if (!isError(result)) rmSync(join(taskDir, 'check.err'), { force: true })
  meta.minutes = Math.round((Date.now() - started) / 600) / 100
  save()
  appendWalk(ext, row, result)
  const line = result === 'ok' ? `${slug} ok f2p=${meta.f2p} p2p=${meta.p2p}` : isError(result) ? `${slug} ${result}` : `${slug} out ${result}`
  return { slug, result, line }
}

// --remove-out: the containers and images check recorded for this out candidate, by exact name, never with -f
// after a verdict: an accepted task keeps its recipe and image digests, not its images (ruling 10), so both are removed alike
export async function removeOut(ext, slug, { ok = false } = {}) {
  const metaFile = join(ext, 'tasks', slug, 'meta.json'), meta = JSON.parse(readFileSync(metaFile, 'utf8')), gone = []
  if (ok) {
    meta.imageDigests = {}
    for (const i of meta.images) {
      const r = await sp(['docker', 'image', 'inspect', '--format', '{{.Id}}', i])
      meta.imageDigests[i] = r.code === 0 ? r.out.trim() : null
    }
    writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n')
  }
  const images = meta.images.filter((i) => {
    if (ok && i.startsWith(`bench-ext/${slug}:`) && !meta.imageDigests[i]) { console.error(`kept ${i}: no digest recorded`); return false } // never remove what has no record
    return true
  })
  await removeNames(ext, slug, { containers: meta.containers, images, ids: meta.imageIds })
}

// containers, then images, by exact name and never with -f, only names of this slug (`bench-ext-<slug>-`, a box's proxy
// `bench-arm-proxy-bench-ext-<slug>-`, `bench-ext/<slug>:`); then each recorded image id no tag points at any more (a later build of the same tag left it
// untagged). Each name removed is appended to removed.txt; one already gone is passed over
async function removeNames(ext, slug, { containers, images, ids }) {
  const gone = []
  const rm = async (verb, name) => {
    const r = await sp(['docker', verb, name])
    if (r.code === 0) gone.push(name)
    else if (!/no such (container|image)/i.test(r.err)) console.error(`could not remove ${name}`)
  }
  // killed first (an error when it is not running): a SIGKILLed oracle-run leaves its container running, and rm has no -f
  for (const c of new Set(containers)) if (c.startsWith(`bench-ext-${slug}-`) || c.startsWith(`bench-arm-proxy-bench-ext-${slug}-`)) { await sp(['docker', 'kill', c]); await rm('rm', c) }
  for (const i of new Set(images)) if (i.startsWith(`bench-ext/${slug}:`)) await rm('rmi', i)
  for (const id of new Set(ids)) {
    const t = await sp(['docker', 'image', 'inspect', '-f', '{{len .RepoTags}}', id])
    if (t.code === 0 && t.out.trim() === '0') await rm('rmi', id)
  }
  if (gone.length) appendFileSync(join(ext, 'removed.txt'), gone.map((g) => `${g}\n`).join(''))
  return gone
}

// step 5 (the user's decision of 2026-11-03): what <data>/<task>/docker.json records is removed as soon as the step that
// built it ends. Each image name still present first gets its digest (`docker image inspect .Id`) in docker.json `digests`
export async function removeRecorded(data, task, slug) {
  const f = join(data, task, 'docker.json')
  if (!existsSync(f)) return []
  const d = JSON.parse(readFileSync(f, 'utf8')), present = []
  d.digests ??= {}
  for (const n of new Set(d.images.map((i) => i.name))) {
    if (!n.startsWith(`bench-ext/${slug}:`)) continue
    const r = await sp(['docker', 'image', 'inspect', '--format', '{{.Id}}', n])
    if (r.code === 0) { d.digests[n] = r.out.trim(); present.push(n) }
  }
  writeFileSync(f, JSON.stringify(d, null, 2) + '\n')
  return removeNames(join(data, 'ext'), slug, { containers: d.containers, images: present, ids: d.images.map((i) => i.id).filter(Boolean) })
}
// <data>/<task>/docker.json changed by f, written back
export function recordDocker(file, f) {
  const d = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { images: [], containers: [] }
  f(d)
  writeFileSync(file, JSON.stringify(d, null, 2) + '\n')
  return d
}

function parseArgs(args, nPos, allowRemove) {
  const pos = [], o = { tier: '1', removeOut: false }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tier' && ['1', '2'].includes(args[i + 1])) o.tier = args[++i]
    else if (args[i] === '--remove-out' && allowRemove) o.removeOut = true
    else if (args[i].startsWith('--')) throw new Error(USAGE)
    else pos.push(args[i])
  }
  if (pos.length !== nPos) throw new Error(USAGE)
  return { pos, ...o }
}

// the stop line when Docker's disk is below the floor, else null; an estimate that cannot be made is said on stderr (once)
async function diskStop(stack, inj, state = {}) {
  const free = await (inj.diskFree ?? dockerDiskFree)()
  if (free === null && !state.told) { console.error('docker disk: free space cannot be estimated; going on'); state.told = true }
  return free !== null && free < DISK_FLOOR_GB ? `${stack} stopped: docker disk low (${free.toFixed(1)} GB free)` : null
}

async function checkCmd(args, inj) {
  const { pos: [groupsPath, stack, rank], tier } = parseArgs(args, 3, false)
  const cfg = await Bun.file(groupsPath).json(), ext = join(dataOf(inj.data), 'ext')
  const row = readTsv(join(ext, `candidates-${tier}.tsv`)).find((r) => r.stack === stack && r.static === 'ok' && r.rank === rank)
  if (!row) throw new Error(`no ${stack} row of rank ${rank} in candidates-${tier}.tsv`)
  const low = await diskStop(stack, inj)
  if (low) return { line: low, code: 3 }
  return check(row, cfg, inj)
}

// the step 5 sample: the live sample.tsv, else step 4's locked copy
const sampleRows = (ext) => readTsv(existsSync(join(ext, 'sample.tsv')) ? join(ext, 'sample.tsv') : join(import.meta.dir, '../progress/step4/sample.tsv'))
const keyOf = (id) => {
  const [owner, rest] = id.split('/'), [name, n] = rest.split('#'), key = slugOf(`${owner}__${name}`)
  return { key, slug: `${key}__${n}` }
}
// a task id's sample row with its key, slug and 0-based row index
export function taskOf(ext, task) {
  const rows = sampleRows(ext), index = rows.findIndex((r) => r.task === task)
  if (index < 0) return privateTask(ext, task)
  return { ...rows[index], ...keyOf(rows[index].id), index }
}
// step 11 ruling 8: the private task set (<data>/tasks.json) has the shape of an external task. Its store key and stack name are
// these constants (README); the index starts past any external one, so a port or a name never collides. registry: the names its
// boxes and make containers reach on 443 (decision 6 (a)), pinned when each is made
export const PRIVATE_SET = { key: 'real-estate', stack: 're', indexFrom: 1000, registry: ['registry.npmjs.org'] }
function privateTask(ext, task) {
  const f = join(dirname(ext), 'tasks.json'), tasks = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}, pos = Object.keys(tasks).indexOf(task)
  if (pos < 0) throw new Error(`no task ${task} in sample.tsv`)
  const store = join(ext, 'repos', PRIVATE_SET.key)
  const full = (s) => { // 7-hex as tasks.json holds them, full when the store exists
    if (!existsSync(store)) return s
    const r = Bun.spawnSync(['git', '-C', store, 'rev-parse', '--verify', `${s}^{commit}`], { stdout: 'pipe', stderr: 'pipe' })
    if (r.exitCode !== 0) throw new Error(`${task}: ${s} is not a commit of ${store}`)
    return r.stdout.toString().trim()
  }
  return { task, slug: PRIVATE_SET.key, key: PRIVATE_SET.key, stack: PRIVATE_SET.stack, base: full(tasks[task].base), end: full(tasks[task].end), index: PRIVATE_SET.indexFrom + pos }
}

// sample.tsv: per stack (in id order) its sampleOf rows with the meta.json fields of step 5; a row keeps the id the previous
// sample gave it, a new one takes its stack's next unused number (keptIds)
export async function sample(args, inj = {}) {
  const { pos: [groupsPath], tier } = parseArgs(args, 1, false)
  const cfg = await Bun.file(groupsPath).json(), data = dataOf(inj.data), ext = join(data, 'ext')
  const walked = readTsv(join(ext, 'walk.tsv')), prev = sampleRows(ext), used = readdirSync(data)
  const cols = ['task', 'stack', 'tier', 'rank', 'id', 'url', 'pr', 'issue', 'base', 'end', 'method', 'f2p', 'edit_history', 'platform', 'cold_setup']
  const out = [cols.join('\t')]
  for (const g of [...cfg.groups].sort((a, b) => a.id.localeCompare(b.id))) {
    const rows = ['1', '2'].slice(0, Number(tier)).flatMap((t) => readTsv(join(ext, `candidates-${t}.tsv`)).filter((r) => r.stack === g.id && r.static === 'ok'))
    const picked = sampleOf(rows, walked, cfg), cold = coldSetup(picked.map((r) => ({ repo: r.repo, rank: Number(r.rank) }))), ids = keptIds(picked, g.id, prev, used)
    out.push(...picked.map((r, i) => {
      const m = JSON.parse(readFileSync(join(ext, 'tasks', keyOf(r.id).slug, 'meta.json'), 'utf8'))
      const v = { task: ids[i], stack: g.id, tier: r.tier, rank: r.rank, id: r.id, url: m.url, pr: m.pr, issue: m.issue, base: m.base,
        end: m.end, method: m.method, f2p: m.f2p, edit_history: m.editHistory, platform: m.platform, cold_setup: r.repo === cold ? 'yes' : 'no' }
      return cols.map((c) => v[c]).join('\t')
    }).sort()) // in id order: a replacement after the kept rows
  }
  writeFileSync(join(ext, 'sample.tsv'), out.join('\n') + '\n')
  return out.length - 1
}

// `task-env` (rulings 3 and 4 of step 5): the task's recipe from the reply its accepted check used, its input from the issue
// and its task file. Prints only the input-check hit count
export async function taskEnv(args, inj = {}) {
  const pos = [], o = {}
  for (let i = 0; i < args.length; i++) {
    if (['--reply', '--sha'].includes(args[i]) && args[i + 1] !== undefined && !(args[i].slice(2) in o)) o[args[i].slice(2)] = args[++i]
    else if (args[i] === '--from-meta') o.fromMeta = true
    else if (args[i].startsWith('--')) throw new Error(USAGE)
    else pos.push(args[i])
  }
  if (pos.length !== 2 || (o.fromMeta ? 'reply' in o || 'sha' in o : !('reply' in o && 'sha' in o))) throw new Error(USAGE)
  const data = dataOf(inj.data), ext = join(data, 'ext'), t = taskOf(ext, pos[1]), taskDir = join(ext, 'tasks', t.slug)
  let recipe = null
  if (o.fromMeta) { // a replacement: the repo's reply whose parsed recipe check hashed into meta.json
    const want = JSON.parse(readFileSync(join(taskDir, 'meta.json'), 'utf8')).recipeSha, dir = join(ext, 'recipes', t.key, 'rounds')
    const replies = (existsSync(dir) ? readdirSync(dir) : []).filter((f) => /^\d+\.reply\.md$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))
    for (const f of replies) {
      try { const r = parseRecipe(readFileSync(join(dir, f), 'utf8')); if (want && sha(JSON.stringify(r)) === want) { recipe = r; break } } catch {}
    }
    if (!recipe) throw new Error(`${t.task}: no reply of ${t.key} parses to the recipeSha of meta.json`)
  } else {
    const bytes = readFileSync(o.reply)
    if (sha(bytes) !== o.sha) throw new Error(`${o.reply}: its SHA-256 is not ${o.sha}`)
    recipe = parseRecipe(bytes.toString('utf8'))
  }
  writeFileSync(join(taskDir, 'task-recipe.json'), JSON.stringify(recipe, null, 2) + '\n')
  const issue = JSON.parse(readFileSync(join(taskDir, 'issue.json'), 'utf8')), input = `# ${issue.title}\n\n${issue.body ?? ''}`
  mkdirSync(join(data, t.task), { recursive: true })
  writeFileSync(join(data, t.task, 'input.md'), input)
  mkdirSync(join(data, 'env'), { recursive: true })
  // no host app: grade runs the oracle command, which builds and serves the commit in Docker; the port is never bound
  writeFileSync(join(data, 'env', `${t.task}.json`), taskFileText(ext, t))
  return `${t.task} input-check hits=${inputCheck(input).length}`
}
const taskFileText = (ext, t, extra = {}) => JSON.stringify({ name: t.task, repo: join(ext, 'repos', t.key), db: null, port: 49152 + t.index, start: null, ready: null,
  setup: [], teardown: [], oracle: oracleCommand(t.task), junit: '.bench-junit.xml', timeoutSec: 7800, ...extra }, null, 2) + '\n'

// `box-env <task>` (step 11 ruling 9): the task file every step 11 grade uses, written from this checkout (its oracle command is this
// checkout's) to env/box/<task>.json and nowhere else. A private-set task also names its runner, held outside the hashed oracle folders
export function boxEnv(args, inj = {}) {
  const { pos: [task] } = parseArgs(args, 1, false)
  const data = dataOf(inj.data), ext = join(data, 'ext'), t = taskOf(ext, task)
  mkdirSync(join(data, 'env/box'), { recursive: true })
  writeFileSync(join(data, 'env/box', `${task}.json`), taskFileText(ext, t, t.key === PRIVATE_SET.key ? { runner: join(data, 'env', PRIVATE_SET.key, 'runner.json') } : {}))
  return `${task} box-env written`
}

export const SERVE_EMPTY = { layer: [], start: '', ready: 'true', notes: '' }
// the reply is data: its shape is checked before a line reaches docker
export function parseServe(text) {
  const r = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  if (!Array.isArray(r?.layer) || !r.layer.every((l) => typeof l === 'string') || typeof r.start !== 'string' || typeof r.ready !== 'string' || !r.ready.trim() || typeof r.notes !== 'string') throw new Error('the serve recipe is not { layer: [Dockerfile lines], start, ready, notes }')
  if (r.layer.some((l) => UNSAFE.test(l))) throw new Error('the layer may not use --network=host, --security=insecure or an ssh or secret mount')
  if (!r.start.trim()) throw new Error('start is empty: it must start the app') // an empty recipe would pass with nothing served
  // services: the part of start the box also needs; servicesReady: the command that says they are up (the box's proof runs it)
  for (const k of ['services', 'servicesReady']) if (r[k] !== undefined && typeof r[k] !== 'string') throw new Error(`${k} must be a string`)
  return { layer: r.layer, start: r.start, ready: r.ready, notes: r.notes, ...(r.services === undefined ? {} : { services: r.services }), ...(r.servicesReady === undefined ? {} : { servicesReady: r.servicesReady }) }
}
// a task's recipe and serve layer, the two Dockerfile halves of its serve image
export function serveRecipe(ext, t) {
  const recipe = parseRecipe(readFileSync(join(ext, 'tasks', t.slug, 'task-recipe.json'), 'utf8'))
  const text = readFileSync(join(ext, 'serve', t.key, 'serve.json'), 'utf8')
  const sv = JSON.parse(text).briefSha === null ? SERVE_EMPTY : parseServe(text) // null: a stack with no serve check
  return { recipe, serveDockerfile: `${recipe.dockerfile.trimEnd()}\n${sv.layer.join('\n')}\n`, sv }
}
// the name is recorded before the build, so a run killed meanwhile still leaves it to `remove`; the id when it built
export const imageBuilder = ({ record, scratch, recipe, diskFree }) => async (tag, dockerfile, commit, buildLog) => {
  record((d) => d.images.push({ name: tag, id: null }))
  const id = await buildImage({ scratch, dockerfile, test: recipe.test, platform: recipe.platform, commit, tag, log: buildLog, diskFree })
  if (!id) throw new Error(`${tag}: the build failed`)
  record((d) => { d.images.findLast((i) => i.name === tag && i.id === null).id = id })
  return id
}
// the container's static command: in /work, start (dir/.bench-start.sh) in the background, then ready every 2 s until it
// exits 0 (then the sh line `then`, by default exit 0) or readySec pass by the clock (a background timer's file; exit 3,
// after one more ready run whose output the log keeps). A ready that answers only after the limit fails
const serveScript = (readySec, dir = '/work', then = 'exit 0', start = true) => ['cd /work', 'rm -f /tmp/.bench-ready-limit', `(sleep ${readySec}; touch /tmp/.bench-ready-limit) &`, ...(start ? [`sh ${dir}/.bench-start.sh &`] : []),
  'while :; do', `  if sh ${dir}/.bench-ready.sh >/dev/null 2>&1; then [ -e /tmp/.bench-ready-limit ] && break; echo "bench: ready"; ${then}; fi`,
  '  [ -e /tmp/.bench-ready-limit ] && break', '  sleep 2', 'done',
  `echo "bench: ready did not exit 0 within ${readySec} s; its output now:"`, `sh ${dir}/.bench-ready.sh 2>&1 | tail -n 20`, 'exit 3', ''].join('\n')
// oracle-run's: an empty JUnit first (a run that never gets ready still has results, every check error), then the body
// (serve's script from /oracle; once ready, a marker and the runner's run in /work, which rewrites /out/junit.xml) under
// the container's own limit: a timer marks it and kills the process group (PID 1 survives a kill and exits 124), so the
// container ends even when oracle-run was killed and no host limit is left
const gradeScript = (limitSec) => ['mkdir -p /out', "echo '<testsuites/>' > /out/junit.xml", 'sh /oracle/.bench-body.sh &', 'body=$!',
  `(sleep ${limitSec}; touch /out/.bench-timeout; echo "bench: not done in ${limitSec} s, killed"; kill -9 0) &`,
  'wait $body', 'code=$?', '[ -e /out/.bench-timeout ] && exit 124', 'exit $code', ''].join('\n')
// split: O starts nothing, the app runs in P
const gradeBody = (readySec, split) => serveScript(readySec, '/oracle', 'touch /out/.bench-ready; sh /oracle/.bench-run.sh; echo "bench: run exited $?"; exit 0', !split)

// `serve` (ruling 5 of step 5): a serve recipe per repo, from rounds of a sealed agent, that serves the task at its base and
// its end in one offline container of the task's recipe plus the layer. What it builds is removed as soon as it ends
export async function serve(args, inj = {}) {
  const { pos: [groupsPath, task] } = parseArgs(args, 2, false)
  const cfg = await Bun.file(groupsPath).json(), data = dataOf(inj.data), ext = join(data, 'ext'), t = taskOf(ext, task)
  if (!cfg.groups.some((g) => g.id === t.stack)) throw new Error(`no stack ${t.stack} in ${groupsPath}`)
  const { serveRequired } = JSON.parse(readFileSync(join(ext, 'step5.json'), 'utf8'))
  if (!Array.isArray(serveRequired)) throw new Error('step5.json has no serveRequired list')
  const dir = join(ext, 'serve', t.key), rounds = join(dir, 'rounds'), saved = join(dir, 'serve.json'), roundsTsv = join(dir, 'rounds.tsv')
  mkdirSync(rounds, { recursive: true })
  if (!serveRequired.includes(t.stack)) { // its interface is the program or the public API, which its step 4 runs reach
    writeFileSync(saved, JSON.stringify({ ...SERVE_EMPTY, briefSha: null }, null, 2) + '\n')
    return { line: `${task} servable rounds=0`, code: 0 }
  }

  const diskFree = inj.diskFree ?? dockerDiskFree, serveAgent = inj.serveAgent ?? sealedRecipe, readySec = inj.readySec ?? 600
  const logs = join(ext, 'sealed', t.slug, 'logs'), taskDir = join(data, task), dockerJson = join(taskDir, 'docker.json')
  for (const d of [logs, taskDir]) mkdirSync(d, { recursive: true })
  const record = (f) => recordDocker(dockerJson, f)
  let stage = 'task-env', seq = 0
  const scratch = (what, commit, fn) => withExport({ name: t.key, repo: join(ext, 'repos', t.key) }, commit, `${what}-${t.slug}-${process.pid}-${seq++}`, fn)
  const brief = readFileSync(join(ext, 'briefs', 'serve.md'), 'utf8'), briefSha = sha(brief)

  // one serve recipe at one commit: null when ready answered, else 'build', 'serve' or 'oom'
  const serveAt = async (recipe, s, commit, log) => {
    const sha7 = commit.slice(0, 7), tag = `bench-ext/${t.slug}:${sha7}-serve`, box = `bench-ext-${t.slug}-serve-${sha7}-`
    stage = 'build'
    const id = await buildImage({ scratch, dockerfile: `${recipe.dockerfile.trimEnd()}\n${s.layer.join('\n')}\n`, test: recipe.test, platform: recipe.platform, commit, tag, log: `${log}.build.log`, diskFree })
    if (!id) return 'build'
    record((d) => { if (!d.images.some((i) => i.name === tag && i.id === id)) d.images.push({ name: tag, id }) })
    const name = box + (record(() => {}).containers.filter((c) => c.startsWith(box)).length + 1)
    const r = await runContainer({ scratch, name, image: tag, platform: recipe.platform, cmd: ['sh', '/work/.bench-serve.sh'], log: `${log}.log`, timeoutSec: readySec + 300, diskFree,
      stage: (x) => { stage = x },
      created: () => record((d) => d.containers.push(name)),
      files: (dir) => {
        writeFileSync(join(dir, '.bench-serve.sh'), serveScript(readySec))
        writeFileSync(join(dir, '.bench-start.sh'), `${s.start}\n`)
        writeFileSync(join(dir, '.bench-ready.sh'), `${s.ready}\n`)
      } })
    if (r.how === 'oom') { appendFileSync(`${log}.log`, '\nbench: the container was killed for memory (OOMKilled)\n'); return 'oom' }
    return r.exitCode === '0' && !r.timedOut ? null : 'serve'
  }
  // at the base (readable logs), then at the end (sealed logs: the next round is told only that it failed there)
  const attempt = async (recipe, s, label) => {
    const base = join(rounds, `${label}.base`), atBase = await serveAt(recipe, s, t.base, base)
    if (atBase) return atBase === 'oom' ? { what: 'oom' } : { r: s, what: atBase, log: atBase === 'build' ? `${base}.build.log` : `${base}.log` }
    const atEnd = await serveAt(recipe, s, t.end, join(logs, `serve-${label}.end`))
    return atEnd === 'oom' ? { what: 'oom' } : atEnd ? { r: s, what: 'end' } : null
  }

  let result
  try {
    const low = await diskFloor(task, inj, () => { stage = 'prune' })
    if (low) return { line: low, code: 3 }
    stage = 'task-env'
    const recipe = parseRecipe(readFileSync(join(ext, 'tasks', t.slug, 'task-recipe.json'), 'utf8'))
    let served = null, failed = null
    if (existsSync(saved)) { // the repo's serve recipe under this brief, reused: not a round; when it fails here, the first round is told why
      stage = 'reuse'
      const text = readFileSync(saved, 'utf8')
      if (JSON.parse(text).briefSha === briefSha) {
        const s = parseServe(text), n = readdirSync(rounds).filter((f) => f.startsWith(`reuse-${t.slug}-`) && f.endsWith('.base.build.log')).length + 1
        failed = await attempt(recipe, s, `reuse-${t.slug}-${n}`)
        if (!failed) served = s
      }
    }
    for (let left = roundsLeft(roundsTsv, t.slug); !served && failed?.what !== 'oom' && left > 0; left--) {
      stage = 'serve-agent'
      const k = nextRound(roundsTsv, rounds), prompt = join(rounds, `${k}.prompt.md`), out = join(rounds, `${k}.reply.md`)
      writeFileSync(prompt, brief.trimEnd() + '\n' + (failed ? retryText(failed) : ''))
      const reply = await serveAgent({ env: join(ext, 'env', `${t.key}.json`), label: `serve-${t.slug}-${k}`, at: t.base, prompt, out })
      if (reply == null) throw new Error(`serve round ${k}: no reply`) // a tool failure: the round is not spent
      if (!existsSync(out)) writeFileSync(out, reply)
      setRound(roundsTsv, k, t.slug, 'replied')
      let s
      try { s = parseServe(reply) } catch (e) { // a spent round: the next one is told why
        failed = { what: 'reply', message: e.message }
        setRound(roundsTsv, k, t.slug, 'bad reply')
        continue
      }
      failed = await attempt(recipe, s, String(k))
      setRound(roundsTsv, k, t.slug, !failed ? 'pass' : failed.what === 'oom' ? 'out of memory' : `${failed.what} failed`)
      if (!failed) {
        writeFileSync(saved, JSON.stringify({ ...s, briefSha }, null, 2) + '\n')
        served = s
      }
    }
    result = served ? 'servable' : failed?.what === 'oom' ? 'dropped out of memory' : 'dropped not servable'
    if (!served) appendWalk(ext, t, 'dropped') // ruling 14 then replaces it
    rmSync(join(ext, 'tasks', t.slug, 'serve.err'), { force: true })
  } catch (e) {
    result = `error ${stage}`
    writeFileSync(join(ext, 'tasks', t.slug, 'serve.err'), `${stage}: ${e.message}\n`)
  } finally {
    await removeRecorded(data, task, t.slug)
  }
  const mine = roundRows(roundsTsv).filter((r) => r[1] === t.slug).length
  return { line: result === 'servable' ? `${task} servable rounds=${mine}` : `${task} ${result}`, code: isError(result) ? 1 : 0 }
}

// step 5's disk floor: below it the BuildKit cache goes first (the user's decision of 2026-11-03); the stop line when it
// stays low, else null
export async function diskFloor(task, inj, onPrune = () => {}) {
  const told = {}
  if (!(await diskStop(task, inj, told))) return null
  onPrune()
  await (inj.prune ?? (() => must(['docker', 'builder', 'prune', '-f'], 'docker builder prune', { timeoutSec: 1800 })))()
  return diskStop(task, inj, told)
}

// runner.json, the oracle's: { layer: [Dockerfile lines after the serve image], run: a sh body that writes /out/junit.xml }
export function parseRunner(text) {
  let r = null
  try { r = JSON.parse(text) } catch {}
  if (!Array.isArray(r?.layer) || !r.layer.every((l) => typeof l === 'string') || typeof r.run !== 'string' || !r.run.trim()) throw new Error('runner.json is not { layer: [Dockerfile lines], run }')
  if (r.layer.some((l) => UNSAFE.test(l))) throw new Error('runner.json: the layer may not use --network=host, --security=insecure or an ssh or secret mount')
  return { layer: r.layer, run: r.run }
}

// step 11 ruling 4: a product image is made in a container, not built, so its rebuild lines are shell lines. The recipe's
// Dockerfile instructions (a `\` continuation joined, comments dropped) after its one copy of the repo into /work, then the serve
// layer's: RUN under `sh -c` (exec form as its words; a cache or tmpfs mount dropped), ENV and ARG exported, WORKDIR made and
// entered, config-only ones (CMD, EXPOSE, ...) passed over, since the image keeps R's config. Anything that needs the build
// context or a user switch is refused: rebuild.json's lines then replace them. The script starts as the final stage stood at the
// copy: `cd /` and its ARG and WORKDIR lines before it
const COPY_REPO = /^COPY\s+(--\S+\s+)*\.\/?\s+\/work\/?\s*$/i
const CONFIG_ONLY = ['CMD', 'ENTRYPOINT', 'EXPOSE', 'HEALTHCHECK', 'LABEL', 'MAINTAINER', 'STOPSIGNAL']
const instructions = (text) => {
  const out = []
  let cur = null
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue // a comment or a blank line, inside a continuation too, as Docker skips them
    const more = /\\\s*$/.test(line), part = more ? line.replace(/\\\s*$/, '') : line
    cur = cur === null ? part.trimStart() : cur + part
    if (!more) { out.push(cur.trimEnd()); cur = null }
  }
  return cur === null ? out : [...out, cur.trimEnd()]
}
const no = (why) => new Error(`the rebuild lines cannot ${why} in a make container: write ext/tasks/<slug>/rebuild.json`)
// the RUN prefix: the last SHELL of the final stage before the copy (JSON form), else Docker's default sh -c
function stageShell(stage) {
  const ins = stage.findLast((l) => /^SHELL(\s|$)/i.test(l))
  if (!ins) return 'sh -c'
  let argv = null
  try { argv = JSON.parse(ins.replace(/^SHELL\s*/i, '')) } catch {}
  if (!Array.isArray(argv) || !argv.length || !argv.every((a) => typeof a === 'string')) throw no('take a SHELL that is not a JSON array of strings')
  return argv.map(word).join(' ')
}
function shellLine(ins, shell = 'sh -c') {
  const [, op, rest] = /^(\S+)\s*([\s\S]*)$/.exec(ins), kw = op.toUpperCase()
  if (kw === 'RUN') {
    let body = rest
    for (let m; (m = /^--(\S+)\s+/.exec(body)); body = body.slice(m[0].length))
      if (/^mount=/.test(m[1]) && !/(^|,)type=(cache|tmpfs)(,|$)/.test(m[1].slice(6))) throw no(`run a RUN with a ${m[1].split(',')[0]} other than a cache or tmpfs mount`)
    if (/<<-?\s*["']?[A-Za-z_]/.test(body)) throw no('run a RUN heredoc')
    try { const argv = JSON.parse(body); if (Array.isArray(argv)) return argv.map((a) => word(String(a))).join(' ') } catch {} // not JSON: shell form, as Docker reads it
    return `${shell} ${word(body)}`
  }
  if (kw === 'ENV') return /^[^\s=]+=/.test(rest) ? `export ${rest}` : `export ${rest.split(/\s/)[0]}=${word(rest.replace(/^\S+\s+/, ''))}`
  if (kw === 'ARG') return rest.includes('=') ? `export ${rest}` : null
  if (kw === 'WORKDIR') return `mkdir -p ${word(rest)} && cd ${word(rest)}`
  if (CONFIG_ONLY.includes(kw)) return null
  throw no(`run ${kw} (only RUN, ENV, ARG and WORKDIR)`)
}
export function rebuildLines(recipe, serve, rebuild) {
  const ins = instructions(recipe.dockerfile), at = ins.flatMap((l, i) => (COPY_REPO.test(l) ? [i] : []))
  if (at.length !== 1) throw new Error('the recipe must copy the repo into /work exactly once')
  if (rebuild != null) {
    if (!Array.isArray(rebuild.lines) || !rebuild.lines.every((l) => typeof l === 'string')) throw new Error('rebuild.json is not { lines: [shell lines] }')
    return rebuild.lines
  }
  const before = ins.slice(0, at[0]), stage = before.slice(before.findLastIndex((l) => /^FROM\s/i.test(l)) + 1), shell = stageShell(stage)
  const state = stage.filter((l) => /^(ARG|WORKDIR)\s/i.test(l))
  return ['cd /', ...[...state, ...ins.slice(at[0] + 1), ...instructions(serve.layer.join('\n'))].map((l) => shellLine(l, shell)).filter((l) => l !== null)]
}
// the make script's head: every path of the base's tree (a NUL-separated list in the container) goes from /work, so a file
// the product deleted is gone and an untracked build output stays; then the commit's export, copied in at /tmp/bench-product
export const overlayScript = (list) => ['set -e', 'cd /work', `xargs -0 -r rm -rf -- < ${list}`, 'cp -a /tmp/bench-product/. /work/', 'rm -rf /tmp/bench-product', ''].join('\n')

// step 11 ruling 4: the image of commit, made from baseImage (R) in container `bench-ext-<slug>-make-<sha7>-<n>` with the arm's
// network: 'none', or { ips, hosts, blocked? } for Docker's default bridge with the box's capabilities and firewall (443 to ips only),
// set from outside and checked as the box's is (blocked: a test's stand-in for the public targets) before any product line runs. The overlay and the rebuild lines run by `docker exec` as the image's user;
// the container is committed as `bench-ext/<slug>:<sha7>-product-<osha8>` and removed. Both names are recorded first. The id;
// false when the make exits non-zero or passes timeoutSec (the product's failure: no image); a throw when Docker fails or the
// disk is full and low
export async function productImage({ t, commit, baseImage, network, lines, repo, osha8, n, platform, record, scratch, log, diskFree, timeoutSec = 2700 }) {
  const sha7 = commit.slice(0, 7), tag = `bench-ext/${t.slug}:${sha7}-product-${osha8}`, name = `bench-ext-${t.slug}-make-${sha7}-${n}`
  const ls = Bun.spawnSync(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', t.base], { stdout: 'pipe', stderr: 'pipe' })
  if (ls.exitCode !== 0) throw new Error(`git ls-tree of the base ${t.base.slice(0, 7)} failed (exit ${ls.exitCode})`)
  const net = network === 'none' ? ['--network', 'none'] : [...CAP_DROPS, ...(network.hosts ?? []).flatMap((h) => ['--add-host', `${h.host}:${h.ip}`])]
  record((d) => { d.images.push({ name: tag, id: null }); d.containers.push(name) })
  try {
    await must(['docker', 'create', '--name', name, '--platform', platform, ...net, baseImage, 'sleep', String(timeoutSec + 600)], `docker create ${name}`)
    await scratch('make', null, async (dir) => {
      writeFileSync(join(dir, 'base.list'), ls.stdout) // the paths as bytes: a space or a newline stays in its path
      writeFileSync(join(dir, 'make.sh'), [overlayScript('/tmp/.bench-make/base.list'), ...lines, 'rm -rf /tmp/.bench-make', ''].join('\n'))
      await must(['docker', 'cp', `${dir}/.`, `${name}:/tmp/.bench-make`], `docker cp into ${name}`, { quiet: true })
    })
    await scratch('product', commit, (dir) => must(['docker', 'cp', `${dir}/.`, `${name}:/tmp/bench-product`], `docker cp into ${name}`, { quiet: true }))
    await must(['docker', 'start', name], `docker start ${name}`)
    if (network !== 'none') {
      await fwImage(scratch)
      const out = network.ips.map((ip) => ({ ip, port: 443 }))
      await must(rulesCommand(name, fwScript({ out })), 'the firewall rules of the make container', { timeoutSec: 600 })
      await netCheck(name, out, { outside: network.blocked })
    }
    const fd = openSync(log, 'w')
    let code
    try { ({ code } = await runGroup(['docker', 'exec', name, 'sh', '/tmp/.bench-make/make.sh'], { timeoutSec, stdout: fd, stderr: fd })) } finally { closeSync(fd) }
    if (code !== 0) {
      await daemon()
      const disk = diskFailure(tail(log))
      if (disk && diskIsLow(await diskFree())) throw new Error(disk) // the signature only: the log is the product's output
      return false
    }
    const id = (await must(['docker', 'commit', name, tag], `docker commit ${name}`)).trim()
    record((d) => { d.images.findLast((i) => i.name === tag && i.id === null).id = id })
    return id
  } finally {
    await sp(['docker', 'kill', name]) // this run created it, and rm has no -f
    await sp(['docker', 'rm', name])
  }
}

// decision 6 (a): a private-set product is made with the registry its arm's box had, pinned now; any other with no network
export async function productNetwork(t, pin) {
  if (t.stack !== PRIVATE_SET.stack) return 'none'
  const hosts = await (pin ?? (() => pinHosts(PRIVATE_SET.registry)))()
  return { ips: [...new Set(hosts.map((h) => h.ip))], hosts }
}

// step 11 ruling 7: the state of the last readiness line of this commit and oracle, or null; a two-column line names no oracle
export function readinessOf(file, sha7, osha8) {
  let last = null
  for (const l of existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []) { const [s, o, r] = l.split('\t'); if (s === sha7 && o === osha8 && r) last = r }
  return last
}

// step 11 ruling 5: 'split' (the app in P, the oracle in O) unless the serve recipe has no start (the checks then run in the
// runner's own process) or ext/tasks/<slug>/grade-mode reads shared (set only from the end regrade, never from a product)
export function gradeMode(ext, t, sv = serveRecipe(ext, t).sv) {
  const f = join(ext, 'tasks', t.slug, 'grade-mode')
  return !sv.start.trim() || (existsSync(f) && readFileSync(f, 'utf8').trim() === 'shared') ? 'shared' : 'split'
}

// the trusted path takes only a task's base or end (sample.tsv, tasks.json) or a seeded bug, so never an arm's product. Each
// base and end is resolved in the task repo and compared whole: a commit sharing only a short sha's prefix is not the task's
export async function trustedCommit(ext, data, dir, head) {
  const f = join(data, 'tasks.json'), tasks = existsSync(f) ? Object.values(JSON.parse(readFileSync(f, 'utf8'))) : []
  for (const c of new Set([...sampleRows(ext), ...tasks].flatMap((r) => [r.base, r.end]).filter((x) => typeof x === 'string' && x))) {
    const r = await sp(['git', '-C', dir, 'rev-parse', '--verify', '-q', `${c}^{commit}`])
    if (r.code === 0 && r.out.trim() === head) return true // one that does not resolve here (another repo's, ambiguous) is not this commit
  }
  return (await must(['git', '-C', dir, 'for-each-ref', '--points-at', 'HEAD', 'refs/seeded/'], 'git for-each-ref')).trim() !== ''
}

// `oracle-run` (step 5, step 11 rulings 4 and 7): grade's oracle command for an external task. S, the task's base built with the
// recipe plus the serve layer (with network), and R, FROM S with the oracle's runner layer, are built from the BuildKit cache;
// the commit of BENCH_DIR (HEAD) gets its product image from R (productImage, no network). In split mode (gradeMode, ruling 5)
// the app runs alone in an offline container P from it, and a container O from R in P's network namespace waits for ready and
// runs the checks; in shared mode one offline container from the product image does both. O's (or the one's) JUnit goes to
// BENCH_JUNIT. BENCH_TRUSTED=1 (grade --trusted) builds
// HEAD itself as step 10 did, recipe and serve layer with network, then the runner layer, for a task's base or end or a seeded
// bug only. Everything it built is removed when it ends
// the runner: the oracle folder's runner.json, else the file the task file's `runner` names (a private-set runner is held outside the
// oracle folders, which are hashed). grade passes the task file as BENCH_TASK_FILE
export function runnerFor(oracle, taskFile) {
  const own = join(oracle, 'runner.json')
  if (existsSync(own)) return parseRunner(readFileSync(own, 'utf8'))
  const named = taskFile && existsSync(taskFile) ? JSON.parse(readFileSync(taskFile, 'utf8')).runner : undefined
  if (typeof named !== 'string' || !existsSync(named)) throw new Error(`oracle-run: no runner.json in ${oracle}, and the task file has no readable runner field`)
  return parseRunner(readFileSync(named, 'utf8'))
}
export async function oracleRun(args, inj = {}) {
  const { pos: [task] } = parseArgs(args, 1, false)
  const { BENCH_DIR: dir, BENCH_ORACLE: oracle, BENCH_JUNIT: junit } = process.env, trusted = process.env.BENCH_TRUSTED === '1'
  if (!dir || !oracle || !junit) throw new Error('oracle-run is grade\'s oracle command: BENCH_DIR, BENCH_ORACLE and BENCH_JUNIT must be set')
  const data = dataOf(inj.data), ext = join(data, 'ext'), t = taskOf(ext, task)
  const runner = runnerFor(oracle, process.env.BENCH_TASK_FILE)
  const { recipe, serveDockerfile, sv } = serveRecipe(ext, t)
  const rebuildFile = join(ext, 'tasks', t.slug, 'rebuild.json')
  let rebuild = null
  if (existsSync(rebuildFile)) try { rebuild = JSON.parse(readFileSync(rebuildFile, 'utf8')) } catch { rebuild = {} } // refused by rebuildLines
  const lines = trusted ? null : rebuildLines(recipe, sv, rebuild), split = !trusted && gradeMode(ext, t, sv) === 'split'
  const head = (await must(['git', '-C', dir, 'rev-parse', 'HEAD'], 'git rev-parse')).trim(), sha7 = head.slice(0, 7)
  if (trusted && !(await trustedCommit(ext, data, dir, head))) throw new Error(`oracle-run --trusted: ${sha7} is no task's base or end and no seeded bug`)
  const low = await diskFloor(task, inj)
  if (low) throw new Error(low)

  const diskFree = inj.diskFree ?? dockerDiskFree, readySec = inj.readySec ?? 600, limitSec = inj.timeoutSec ?? 1800
  const osha8 = oracleSha(oracleFiles(oracle)).slice(0, 8) // as grade's oracleSha counts the folder
  const build = join(data, task, 'build'), logs = join(ext, 'sealed', t.slug, 'logs')
  for (const d of [build, logs]) mkdirSync(d, { recursive: true })
  const record = (f) => recordDocker(join(data, task, 'docker.json'), f)
  const pfx = `bench-ext/${t.slug}:`, at7 = trusted ? sha7 : t.base.slice(0, 7)
  const serveTag = `${pfx}${at7}-serve`, runnerTag = trusted ? `${pfx}${sha7}-grade` : `${pfx}${at7}-runner-${osha8}`
  // n: one more than the recorded images of this commit (its serve image, its product images; each recorded before it is
  // made), so a run that failed on the way still takes its number and no log is overwritten. The readable serve build log
  // counts its own tag, as the box does
  const recorded = record(() => {}).images.map((i) => i.name)
  const n = recorded.filter((i) => i === `${pfx}${sha7}-serve` || i.startsWith(`${pfx}${sha7}-product-`)).length + 1
  const serveLog = join(build, `${at7}-${recorded.filter((i) => i === serveTag).length + 1}.serve.build.log`)
  const name = `bench-ext-${t.slug}-grade-${sha7}-${n}`, app = `bench-ext-${t.slug}-app-${sha7}-${n}`, sealed = (what) => join(logs, `grade-${sha7}-${n}.${what}`), log = sealed('log')
  let seq = 0
  const scratch = (what, commit, fn) => withExport({ name: t.key, repo: dir }, commit, `${what}-${t.slug}-${process.pid}-${seq++}`, fn)
  const image = imageBuilder({ record, scratch, recipe, diskFree })
  const boxes = []
  const stop = async () => {
    for (const b of boxes) await sp(['docker', 'kill', b]) // this run created them
    await removeRecorded(data, task, t.slug)
    process.exit(143)
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  try {
    // a build log of the base is readable; any other commit may hold the PR, a seeded bug or an arm's product
    await image(serveTag, serveDockerfile, trusted ? 'HEAD' : t.base, !trusted || head === t.base ? serveLog : sealed('serve.build.log'))
    await image(runnerTag, `FROM ${serveTag}\n${runner.layer.join('\n')}\n`, null, sealed(trusted ? 'grade.build.log' : 'runner.build.log'))
    const network = trusted ? null : await productNetwork(t, inj.registryHosts && (async () => inj.registryHosts))
    const product = trusted || await productImage({ t, commit: head, baseImage: runnerTag, network, lines, repo: dir, osha8, n, platform: recipe.platform, record, scratch, log: sealed('make.log'), diskFree })
    if (!product) throw new Error(`${sha7}: the product image was not made (the make failed: its log is sealed)`)
    if (split) {
      // P runs start (its argument, no file: P gets nothing of the oracle's) in /work; the sleep keeps the namespace up
      // whether the app runs or dies, and ends P by itself if oracle-run is killed. Both names recorded first, P's first,
      // so removal kills it first
      record((d) => d.containers.push(app, name))
      await must(['docker', 'create', '--network', 'none', '--platform', recipe.platform, '--name', app, product, 'sh', '-c', `cd /work; sh -c "$1" & exec sleep ${limitSec + 600}`, 'sh', sv.start], `docker create ${app}`)
      boxes.push(app)
      await must(['docker', 'start', app], `docker start ${app}`)
    }
    const r = await runContainer({ scratch, name, image: trusted || split ? runnerTag : product, platform: recipe.platform, cmd: ['sh', '/oracle/.bench-grade.sh'], dest: '/oracle', log, timeoutSec: 1800, diskFree,
      net: split ? ['--network', `container:${app}`] : undefined, // O joins P's namespace: P's loopback, no network object
      stage: () => {}, created: () => { boxes.push(name); if (!split) record((d) => d.containers.push(name)) },
      files: (into) => {
        // as oracleSha counts it (no node_modules, a symlink by its own text), so --reuse stays sound
        cpSync(oracle, into, { recursive: true, verbatimSymlinks: true, filter: (f) => basename(f) !== 'node_modules' })
        writeFileSync(join(into, '.bench-grade.sh'), gradeScript(limitSec))
        writeFileSync(join(into, '.bench-body.sh'), gradeBody(readySec, split))
        if (!split) writeFileSync(join(into, '.bench-start.sh'), `${sv.start}\n`)
        writeFileSync(join(into, '.bench-ready.sh'), `${sv.ready}\n`)
        writeFileSync(join(into, '.bench-run.sh'), `${runner.run}\n`)
      } })
    let appOom = false
    if (split) { // P's output goes to the sealed log after O's; nothing of P's is read for the grade
      appendFileSync(log, `bench: the app's output (${app}):\n`)
      const fd = openSync(log, 'a')
      try { await runGroup(['docker', 'logs', app], { timeoutSec: 300, stdout: fd, stderr: fd }) } finally { closeSync(fd) }
      const st = await sp(['docker', 'inspect', '-f', '{{.State.OOMKilled}}', app])
      if (st.code) { await daemon(); throw new Error(`docker inspect ${app} failed (exit ${st.code})`) }
      appOom = st.out.trim() === 'true'
    }
    const readiness = (s) => appendFileSync(join(build, 'readiness.tsv'), `${sha7}\t${osha8}\t${s}\n`)
    if (r.timedOut) { readiness('timeout'); throw new Error(`${name}: not done in 1800 s, killed`) } // runContainer killed it
    await scratch('out', null, async (o) => {
      await must(['docker', 'cp', `${name}:/out`, o], `docker cp out of ${name}`, { quiet: true })
      // docker cp keeps a link, and the container's link must not be followed on the host: no read through it, no JUnit, a grade with no result
      const out = join(o, 'out'), plain = lstatSync(out).isDirectory()
      if (plain && existsSync(join(out, '.bench-timeout'))) { readiness('timeout'); throw new Error(`${name}: not done in ${limitSec} s, killed inside`) }
      readiness(plain && existsSync(join(out, '.bench-ready')) ? 'ready' : 'not ready')
      if (r.how === 'oom' || appOom) { readiness('memory'); throw new Error(`${r.how === 'oom' ? name : app} was killed for memory (OOMKilled)`) } // the last line says it, so the canary can tell it apart
      if (plain && lstatSync(join(out, 'junit.xml')).isFile()) copyFileSync(join(out, 'junit.xml'), junit)
    })
  } finally {
    process.off('SIGTERM', stop)
    process.off('SIGINT', stop)
    if (existsSync(log)) process.stderr.write(readFileSync(log)) // a sealed grade logs it
    await removeRecorded(data, task, t.slug)
  }
}

export async function walk(args, inj = {}, print = (s) => console.log(s)) {
  const { pos: [groupsPath, stack], tier, removeOut: remove } = parseArgs(args, 2, true)
  const cfg = await Bun.file(groupsPath).json(), ext = join(dataOf(inj.data), 'ext')
  if (!cfg.groups.some((g) => g.id === stack)) throw new Error(`no stack ${stack} in ${groupsPath}`)
  // tier 2 after tier 1: tier 1's accepted rows count, and its error and repo cap rows come first (ruling 14)
  const rows = ['1', '2'].slice(0, Number(tier)).flatMap((t) => readTsv(join(ext, `candidates-${t}.tsv`)).filter((r) => r.stack === stack && r.static === 'ok'))
  const walked = () => (existsSync(join(ext, 'walk.tsv')) ? readTsv(join(ext, 'walk.tsv')) : [])
  let checked = 0, errors = 0, next
  const state = {}
  while (errors < 2 && (next = nextToCheck(rows, walked(), cfg))) {
    const low = await diskStop(stack, inj, state)
    if (low) { print(low); return 3 }
    const last = new Map(walked().map((w) => [w.id, w.result]))
    for (const c of next.capped) if (last.get(c.id) !== 'repo cap') appendWalk(ext, c, 'repo cap')
    const r = await check(next.row, cfg, inj)
    checked++
    print(r.line)
    errors = isError(r.result) ? errors + 1 : 0
    if (remove && !isError(r.result)) await removeOut(ext, r.slug, { ok: r.result === 'ok' })
  }
  const last = new Map(walked().map((w) => [w.id, w.result])), accepted = rows.filter((r) => last.get(r.id) === 'ok').length
  const stopped = errors >= 2 // ruling 8: 2 errors in a row stop the walk, exit 4
  print(`${stack} tier ${tier}: accepted ${accepted}, checked ${checked}, list end ${!next && accepted < cfg.perStack ? 'yes' : 'no'}${stopped ? ', stopped on 2 errors in a row' : ''}`)
  return stopped ? 4 : 0
}

export async function main(argv, inj = {}) {
  const [cmd, ...rest] = argv
  try {
    if (cmd === 'list') {
      const counts = await list(rest, inj)
      for (const [s, c] of Object.entries(counts)) {
        console.log(`${s}: repos searched ${c.repos}, repos with markers ${c.markers}, PRs read ${c.prs}, ok ${c.ok}, GraphQL points ${c.points}, slice shortfall ${c.shortfall}`)
        for (const [r, n] of Object.entries(c.reasons)) console.log(`${s}:   ${r} ${n}`)
      }
    } else if (cmd === 'check') {
      const r = await checkCmd(rest, inj)
      console.log(r.line)
      return r.code ?? (isError(r.result) ? 1 : 0)
    } else if (cmd === 'walk') return await walk(rest, inj)
    else if (cmd === 'sample') console.log(`sample.tsv: ${await sample(rest, inj)} rows`)
    else if (cmd === 'task-env') console.log(await taskEnv(rest, inj))
    else if (cmd === 'box-env') console.log(boxEnv(rest, inj))
    else if (cmd === 'serve') {
      const r = await serve(rest, inj)
      console.log(r.line)
      return r.code
    } else if (cmd === 'oracle-run') await oracleRun(rest, inj)
    else if (cmd === 'remove') { // what <data>/<task>/docker.json records, as a run killed before its own removal left it
      const { pos: [task] } = parseArgs(rest, 1, false), data = dataOf(inj.data)
      console.log(`${task} removed ${(await removeRecorded(data, task, taskOf(join(data, 'ext'), task).slug)).length}`)
    }
    else throw new Error(USAGE)
    return 0
  } catch (e) { console.error(e.message); return 2 }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
