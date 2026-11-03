#!/usr/bin/env bun
// External task selection. `list`: search the repo universe of a tier, read each repo's stack markers, read every merged
// PR of the window that links an issue, and write them sorted by key. Every response is saved under <data>/ext/raw/
// before it is parsed, and a rerun reuses a saved one (resume). Prints counts only: never a PR title, body, path or issue.
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { withExport } from './env.mjs'
import { baseOf, exists, failToPass, nextToCheck, repoOut, sortKey, stackOf, staticOut } from './lib/ext.mjs'
import { readJunit } from './lib/junit.mjs'
import { runGroup } from './lib/proc.mjs'

const USAGE = `usage: bun bench/ext.mjs list <groups.json> --tier <1|2>
       bun bench/ext.mjs check <groups.json> <stack> <rank> [--tier <1|2>]
       bun bench/ext.mjs walk <groups.json> <stack> [--tier <1|2>] [--remove-out]`
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
const word = (s) => `'${s.replaceAll("'", `'\\''`)}'` // one single-quoted sh word
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

// the reply is data: its shape is checked before any field reaches docker
export function parseRecipe(text) {
  const r = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  const probe = Array.isArray(r?.probe) && r.probe.length >= 1 && r.probe.length <= 3 && r.probe.every((p) => typeof p === 'string' && p)
  if (!PLATFORMS.includes(r?.platform) || typeof r.dockerfile !== 'string' || !r.dockerfile || typeof r.test !== 'string' || !probe) throw new Error('the recipe is not { platform, dockerfile, test, probe: [1 to 3 paths] }')
  if (!/^\s*COPY\s+\.\s+\/work\/?\s*$/im.test(r.dockerfile) || !/^\s*WORKDIR\s+\/work\/?\s*$/im.test(r.dockerfile)) throw new Error('the dockerfile must have COPY . /work and WORKDIR /work')
  if (/--network[= ]+host|--security[= ]+insecure|--mount[= ][^\n]*type=(ssh|secret)/i.test(r.dockerfile)) throw new Error('the dockerfile may not use --network=host, --security=insecure or an ssh or secret mount')
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

export function netFailure(text) {
  if (/failed to resolve source metadata[^\n]*(not found|pull access denied|manifest unknown)/i.test(text)) return null // on that line only
  return NET.find(([, re]) => re.test(text))?.[0] ?? null
}
const tail = (file) => readFileSync(file, 'utf8').split('\n').slice(-200).join('\n')
const retryText = (f) => f.what === 'reply' ? `\nThe previous reply was not a valid recipe: ${f.message}\n` : `\nA previous recipe failed. The recipe:\n\n\`\`\`json\n${JSON.stringify(f.r, null, 2)}\n\`\`\`\n\nThe last 200 lines of its ${f.what} log:\n\n\`\`\`\n${tail(f.log)}\n\`\`\`\n`

// every external call has a limit: its process group is killed after timeoutSec and code is 'timeout'
async function sp(argv, timeoutSec = 300) {
  const p = Bun.spawn(argv, { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', detached: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-p.pid, 'SIGKILL') } catch {} }, timeoutSec * 1000)
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
  clearTimeout(timer)
  return { out, err, code: timedOut ? 'timeout' : code }
}
// quiet: the message has the exit code only (the stderr of a sealed-phase call can name the PR's test files)
const must = async (argv, what, { timeoutSec = 300, quiet = false } = {}) => {
  const r = await sp(argv, timeoutSec)
  if (r.code === 'timeout') throw new Error(`${what} timed out after ${timeoutSec} s`)
  if (r.code) throw new Error(`${what} failed (exit ${r.code})${quiet ? '' : `: ${r.err.trim().slice(-500)}`}`)
  return r.out
}
const limit = (promise, sec, what) => {
  let t
  return Promise.race([promise, new Promise((_, no) => { t = setTimeout(() => no(new Error(`${what} timed out after ${sec} s`)), sec * 1000) })]).finally(() => clearTimeout(t))
}
const dataOf = (data) => {
  const d = data ?? (process.env.HSTACK_BENCH_MACHINE && dirname(process.env.HSTACK_BENCH_MACHINE))
  if (!d) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  return d
}
const readTsv = (f) => {
  const [head, ...rows] = readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split('\t'))
  return rows.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])))
}
const appendWalk = (ext, row, result) => {
  const f = join(ext, 'walk.tsv')
  if (!existsSync(f)) writeFileSync(f, WALK.join('\t') + '\n')
  appendFileSync(f, [row.stack, row.tier, row.rank, row.id, result].join('\t') + '\n')
}

// the default recipe agent: a sealed agent with read tools on the files of the base; null when it gives no reply
async function sealedRecipe({ env, label, at, prompt, out }) {
  const r = await sp([process.execPath, join(import.meta.dir, 'sealed-agent.mjs'), env, label, '--at', at, '--tools', 'Read,Glob,Grep', '--prompt', prompt, '--out', out], 4000) // the agent's own limit is 3600 s
  return r.code === 0 && existsSync(out) ? readFileSync(out, 'utf8') : null
}

export async function check(row, cfg, { gh = realGh, remote = (repo) => `https://github.com/${repo}.git`, recipeAgent = sealedRecipe, data } = {}) {
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
    f2p: null, p2p: null, editHistory: null, platform: null, images: prev.images ?? [], recipeRounds: 0, minutes: null,
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
  const daemon = async () => {
    const r = await sp(['docker', 'version', '--format', '{{.Server.Version}}'])
    if (r.code) throw new Error(`docker daemon: ${r.code === 'timeout' ? 'no answer in 300 s' : r.err.trim().slice(-300)}`)
  }
  // the image of commit with the recipe: false when the build fails (the repo's failure), a throw when the daemon or the
  // network does
  const build = (recipe, commit, tag, log) => {
    stage = 'build'
    return scratch('ctx', commit, async (dir) => {
      writeFileSync(join(dir, '.bench.Dockerfile'), recipe.dockerfile)
      writeFileSync(join(dir, '.bench.Dockerfile.dockerignore'), '') // BuildKit reads it instead of the repo's .dockerignore
      writeFileSync(join(dir, '.bench-test.sh'), recipe.test)
      const iid = `${log}.iid`
      const once = async (flag) => {
        rmSync(iid, { force: true })
        const fd = openSync(log, flag)
        try {
          return (await runGroup(['docker', 'build', '--progress=plain', '--platform', recipe.platform, '-f', join(dir, '.bench.Dockerfile'), '--iidfile', iid, '-t', tag, dir], { timeoutSec: 2700, stdout: fd, stderr: fd })).code
        } finally { closeSync(fd) }
      }
      let code = await once('w')
      // once more from the BuildKit cache: a network blip passes then, the repo's own failure fails again
      if (code !== 0 && code !== 'timeout') { await daemon(); code = await once('a') }
      if (code !== 0) {
        await daemon()
        const sig = netFailure(tail(log))
        if (sig) throw new Error(sig) // the signature's name only: the log is the repo's output
        return false
      }
      const id = readFileSync(iid, 'utf8').trim()
      if (!meta.images.includes(tag)) meta.images.push(tag)
      if (!meta.imageIds.includes(id)) meta.imageIds.push(id)
      save()
      return true
    })
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
    stage = 'run'
    const c = `bench-ext-${slug}-${label}`
    await must(['docker', 'create', '--network', 'none', '--platform', recipe.platform, '--name', c, image, 'sh', '/work/.bench-run.sh'], `docker create ${c}`)
    meta.containers.push(c)
    save()
    stage = 'cp'
    await scratch('in', null, async (dir) => {
      if (copy) await archive(files, dir)
      writeFileSync(join(dir, '.bench-test.sh'), recipe.test) // also here: a repo's .dockerignore may have kept it out of the image
      writeFileSync(join(dir, '.bench-run.sh'), ['rm -f /out/junit.xml', 'cd /work', 'mkdir -p /out', ...del.map((f) => `rm -f -- ${word(f)}`), `exec sh /work/.bench-test.sh ${files.map(word).join(' ')}`, ''].join('\n'))
      await must(['docker', 'cp', `${dir}/.`, `${c}:/work`], `docker cp into ${c}`, { quiet: true })
    })
    stage = 'run'
    const fd = openSync(log, 'w')
    let code
    try { ({ code } = await runGroup(['docker', 'start', '-a', c], { timeoutSec: 1800, stdout: fd, stderr: fd })) } finally { closeSync(fd) }
    const timedOut = code === 'timeout'
    if (timedOut) await sp(['docker', 'kill', c]) // this check created it
    const st = await sp(['docker', 'inspect', '-f', '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}', c])
    if (st.code) { await daemon(); throw new Error(`docker inspect ${c} failed (exit ${st.code})`) }
    const [status, exitCode, oom] = st.out.trim().split(' ')
    if (status !== 'exited') throw new Error(`container ${c} is ${status}, not exited`)
    const how = runEnd(timedOut, exitCode, oom)
    if (how === 'killed') throw new Error(`container ${c} was killed (exit ${exitCode}, OOMKilled ${oom})`)
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
    // a recipe passes when its image of the base builds and a probe file passes in it; that image is the base image
    const attempt = async (r, file, label) => {
      const log = join(rounds, `${file}.build.log`), probe = join(rounds, `${file}.probe`)
      if (!(await build(r, b.base, baseTag, log))) return { r, what: 'build', log }
      const cases = await runIn(r, baseTag, `probe-${label}`, r.probe, { log: `${probe}.log`, xml: `${probe}.xml` })
      return cases?.some((c) => c.status === 'pass') ? null : { r, what: 'probe', log: `${probe}.log` }
    }
    let recipe = null, failed = null
    if (existsSync(saved)) { // the repo's recipe, reused: not a round; when it fails here, the first round is told why
      const r = parseRecipe(readFileSync(saved, 'utf8'))
      failed = await attempt(r, `reuse-${slug}-${meta.attempt}`, `reuse-${meta.attempt}`)
      if (!failed) recipe = r
    }
    const done = existsSync(roundsTsv) ? readFileSync(roundsTsv, 'utf8').trim().split('\n').map((l) => l.split('\t')) : []
    const mine = done.filter((d) => d[1] === slug).length
    let left = (done.length > mine ? 1 : 3) - mine // ruling 10: 3 rounds for the repo's first task that needs them, 1 for each further task
    while (!recipe && left-- > 0) {
      stage = 'recipe-agent'
      const k = 1 + Math.max(0, ...readdirSync(rounds).map((f) => Number(/^(\d+)\./.exec(f)?.[1] ?? 0)))
      const prompt = join(rounds, `${k}.prompt.md`), out = join(rounds, `${k}.reply.md`)
      writeFileSync(prompt, readFileSync(join(ext, 'briefs', 'recipe.md'), 'utf8').trimEnd() + '\n' + (failed ? retryText(failed) : ''))
      const reply = await recipeAgent({ env: envFile, label: `recipe-${slug}-${k}`, at: b.base, prompt, out })
      if (reply == null) throw new Error(`recipe round ${k}: no reply`) // a tool failure: the round is not spent
      if (!existsSync(out)) writeFileSync(out, reply)
      meta.recipeRounds++
      let r
      try { r = parseRecipe(reply) } catch (e) { // a spent round: the next one is told why
        failed = { what: 'reply', message: e.message }
        appendFileSync(roundsTsv, `${k}\t${slug}\tbad reply\n`)
        continue
      }
      failed = await attempt(r, String(k), String(k))
      appendFileSync(roundsTsv, `${k}\t${slug}\t${failed ? `${failed.what} failed` : 'pass'}\n`)
      if (!failed) { recipe = r; writeFileSync(saved, JSON.stringify(r, null, 2) + '\n') }
    }
    meta.platform = recipe?.platform ?? null
    save()
    if (!recipe) return 'recipe failed'

    stage = 'base'
    // the test files: the PR's files matching the stack's test paths that exist at end; the others the PR deleted
    const tests = prFiles.filter((f) => group.testPaths.some((p) => new RegExp(p).test(f)))
    const atEnd = new Set(tests.length ? (await git(['ls-tree', '-r', '-z', '--name-only', end, '--', ...tests], { quiet: true })).split('\0').filter(Boolean) : [])
    const files = tests.filter((f) => atEnd.has(f)), del = tests.filter((f) => !atEnd.has(f))
    const endTag = `bench-ext/${slug}:${end.slice(0, 7)}`
    if (!(await build(recipe, end, endTag, join(logs, 'end.build.log')))) return 'end build failed'
    if (!files.length) return 'PR tests do not pass at end' // no file to run: never call the test script with none
    const a = meta.attempt, run = (image, label, o) => runIn(recipe, image, label, files, { log: join(logs, `${label}.log`), xml: join(logs, `${label}.xml`), ...o })
    const atBase = await run(baseTag, `base-${a}`, { del, copy: true })
    const e1 = atBase && (await run(endTag, `end-${a}-1`)), e2 = e1 && (await run(endTag, `end-${a}-2`))
    if (!e2) return 'out of memory'
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
async function removeOut(ext, slug) {
  const meta = JSON.parse(readFileSync(join(ext, 'tasks', slug, 'meta.json'), 'utf8')), gone = []
  const rm = async (verb, name) => { if ((await sp(['docker', verb, name])).code === 0) gone.push(name); else console.error(`could not remove ${name}`) }
  for (const c of meta.containers) if (c.startsWith(`bench-ext-${slug}-`)) await rm('rm', c)
  for (const i of meta.images) if (i.startsWith(`bench-ext/${slug}:`)) await rm('rmi', i)
  // an image a later build of the same tag left untagged has no name: removed by its recorded id, only while no tag points at it
  for (const id of meta.imageIds) {
    const t = await sp(['docker', 'image', 'inspect', '-f', '{{len .RepoTags}}', id])
    if (t.code === 0 && t.out.trim() === '0') await rm('rmi', id)
  }
  if (gone.length) appendFileSync(join(ext, 'removed.txt'), gone.map((g) => `${g}\n`).join(''))
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

async function checkCmd(args, inj) {
  const { pos: [groupsPath, stack, rank], tier } = parseArgs(args, 3, false)
  const cfg = await Bun.file(groupsPath).json(), ext = join(dataOf(inj.data), 'ext')
  const row = readTsv(join(ext, `candidates-${tier}.tsv`)).find((r) => r.stack === stack && r.static === 'ok' && r.rank === rank)
  if (!row) throw new Error(`no ${stack} row of rank ${rank} in candidates-${tier}.tsv`)
  return check(row, cfg, inj)
}

export async function walk(args, inj = {}, print = (s) => console.log(s)) {
  const { pos: [groupsPath, stack], tier, removeOut: remove } = parseArgs(args, 2, true)
  const cfg = await Bun.file(groupsPath).json(), ext = join(dataOf(inj.data), 'ext')
  if (!cfg.groups.some((g) => g.id === stack)) throw new Error(`no stack ${stack} in ${groupsPath}`)
  // tier 2 after tier 1: tier 1's accepted rows count, and its error and repo cap rows come first (ruling 14)
  const rows = ['1', '2'].slice(0, Number(tier)).flatMap((t) => readTsv(join(ext, `candidates-${t}.tsv`)).filter((r) => r.stack === stack && r.static === 'ok'))
  const walked = () => (existsSync(join(ext, 'walk.tsv')) ? readTsv(join(ext, 'walk.tsv')) : [])
  let checked = 0, errors = 0, next
  while (errors < 2 && (next = nextToCheck(rows, walked(), cfg))) {
    const last = new Map(walked().map((w) => [w.id, w.result]))
    for (const c of next.capped) if (last.get(c.id) !== 'repo cap') appendWalk(ext, c, 'repo cap')
    const r = await check(next.row, cfg, inj)
    checked++
    print(r.line)
    errors = isError(r.result) ? errors + 1 : 0
    if (remove && r.result !== 'ok' && !isError(r.result)) await removeOut(ext, r.slug)
  }
  const last = new Map(walked().map((w) => [w.id, w.result])), accepted = rows.filter((r) => last.get(r.id) === 'ok').length
  print(`${stack} tier ${tier}: accepted ${accepted}, checked ${checked}, list end ${!next && accepted < cfg.perStack ? 'yes' : 'no'}`)
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
      return isError(r.result) ? 1 : 0
    } else if (cmd === 'walk') await walk(rest, inj)
    else throw new Error(USAGE)
    return 0
  } catch (e) { console.error(e.message); return 2 }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
