import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { list, ghFailure } from '../bench/ext.mjs'
import { sortKey } from '../bench/lib/ext.mjs'

// A fake gh answers from a small universe; every request it answers is recorded. No network.
const tmp = mkdtempSync(join(tmpdir(), 'bench-ext-list-'))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))
const cfg = {
  seed: 'hstack-bench-2026-10-27', window: { createdFrom: '2026-07-01T00:00:00Z', mergedBefore: '2026-11-01T00:00:00Z' },
  repo: { starsMin: 1000, tier2StarsMin: 500, pushedFrom: '2026-07-01', createdBefore: '2026-01-01' }, licences: ['MIT'], maxFiles: 100, perStack: 8, perRepo: 2, usedInHstack: [],
  groups: [{ id: 's1', languages: ['Lang1'], markers: [[{ path: 'manage.py', text: 'SETTINGS' }]], testPaths: ['(^|/)tests/'] }],
}
const meta = { license: { spdx_id: 'MIT' }, fork: false, archived: false, mirror_url: null, created_at: '2020-01-01T00:00:00Z', pushed_at: '2026-10-01T00:00:00Z', default_branch: 'main' }
const pr = (number, o = {}) => ({ number, createdAt: '2026-08-10T00:00:00Z', mergedAt: '2026-08-12T00:00:00Z', author: { __typename: 'User' }, baseRefName: 'main', changedFiles: 2,
  mergeCommit: { oid: 'abc' }, commits: { totalCount: 1 }, files: { totalCount: 2, nodes: [{ path: 'src/a' }, { path: 'tests/a' }] },
  closingIssuesReferences: { totalCount: 1, nodes: [{ number: 100 + number, createdAt: '2026-08-01T00:00:00Z', repository: { nameWithOwner: 'a/app' } }] }, ...o })
const base = [
  { full_name: 'a/app', language: 'Lang1', stargazers_count: 1500, ...meta, root: ['manage.py', 'src'], dirs: { src: ['x'] }, texts: { 'manage.py': 'x SETTINGS y' },
    prs: [pr(1), pr(2), pr(3), pr(4, { author: { __typename: 'Bot' } }), pr(5, { closingIssuesReferences: { totalCount: 2, nodes: [] } })] },
  { full_name: 'a/plain', language: 'Lang1', stargazers_count: 1200, ...meta, root: ['setup.cfg'], dirs: {}, texts: {}, prs: [pr(9)] },
  { full_name: 'a/nolicence', language: 'Lang1', stargazers_count: 1100, ...meta, license: null, root: ['manage.py'], dirs: {}, texts: { 'manage.py': 'SETTINGS' }, prs: [pr(8)] },
]

const rawName = (argv) => new Bun.CryptoHasher('sha256').update(JSON.stringify(argv)).digest('hex')
const flag = (argv, k) => argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1)
function fake({ total = () => null, issueCount = () => null, fail = () => false, universe = base } = {}) {
  const seen = []
  const gh = async (argv) => {
    const f = fail(argv)
    if (f) throw f instanceof Error ? f : new Error('boom')
    seen.push(argv)
    const q = flag(argv, 'q')
    if (argv.includes('search/repositories')) {
      const m = q.match(/language:(\S+) stars:(?:(\d+)\.\.(\d+)|>=(\d+))/)
      const [lo, hi] = m[4] ? [+m[4], Infinity] : [+m[2], +m[3]]
      const items = universe.filter((r) => r.language === m[1] && r.stargazers_count >= lo && r.stargazers_count <= hi).map(({ root, dirs, texts, prs, ...r }) => r)
      return JSON.stringify({ total_count: total(q) ?? items.length, incomplete_results: false, items: +flag(argv, 'page') === 1 ? items : [] })
    }
    const query = flag(argv, 'query'), data = { rateLimit: { cost: 1 } }
    if (q) {
      const repo = universe.find((r) => q.startsWith(`repo:${r.full_name} `))
      const [, from, to] = q.match(/created:(\S+)\.\.(\S+)/)
      const nodes = repo.prs.filter((p) => p.createdAt >= from && p.createdAt <= to)
      data.search = { issueCount: issueCount(q) ?? nodes.length, pageInfo: { hasNextPage: false, endCursor: null }, nodes }
      return JSON.stringify({ data })
    }
    for (const line of query.split('\n')) {
      const m = line.match(/^(\w+): repository\(owner: "([^"]*)", name: "([^"]*)"\)/)
      if (!m) continue
      const r = universe.find((x) => x.full_name === `${m[2]}/${m[3]}`)
      if (r.gone) { data[m[1]] = null; continue }
      if (line.includes('"HEAD:"')) {
        data[m[1]] = { object: { entries: r.root.map((name) => r.dirs[name] ? { name, type: 'tree', object: { entries: r.dirs[name].map((name) => ({ name })) } } : { name, type: 'blob', object: {} }) } }
      } else {
        data[m[1]] = Object.fromEntries([...line.matchAll(/(\w+): object\(expression: "HEAD:([^"]*)"\)/g)].map(([, f, path]) => [f, { text: r.texts[path] ?? null }]))
      }
    }
    return JSON.stringify({ data })
  }
  return { gh, seen }
}

let n = 0
async function run(f, args = ['--tier', '1'], before = () => {}) {
  const data = join(tmp, `d${n++}`), ext = join(data, 'ext')
  mkdirSync(join(ext, 'raw'), { recursive: true })
  before(join(ext, 'raw'))
  writeFileSync(join(ext, 'groups.json'), JSON.stringify(cfg))
  const counts = await list([join(ext, 'groups.json'), ...args], { gh: f.gh, data, log: () => {} })
  return { data, ext, counts }
}
const tsv = (file) => readFileSync(file, 'utf8').trim().split('\n').map((l) => l.split('\t'))
const searches = (seen) => seen.filter((a) => a.includes('search/repositories')).map((a) => flag(a, 'q'))
const prSearches = (seen) => seen.map((a) => flag(a, 'q')).filter((q) => q?.startsWith('repo:'))

test('splits a slice that reaches the search cap', async () => {
  const f = fake({ total: (q) => (q.includes('stars:1000..1999 ') ? 1000 : null) })
  await run(f)
  const qs = searches(f.seen).map((q) => q.match(/stars:(\S+)/)[1])
  expect(qs.slice(0, 3)).toEqual(['1000..1999', '1000..1499', '1500..1999'])
  expect(qs.at(-1)).toMatch(/^>=/)
  expect(searches(f.seen)[0]).toBe('language:Lang1 stars:1000..1999 pushed:>=2026-07-01 created:<2026-01-01 archived:false fork:false')
})

test('tier 2 searches from the tier 2 minimum to below the tier 1 minimum', async () => {
  const f = fake()
  await run(f, ['--tier', '2'])
  expect(searches(f.seen).map((q) => q.match(/stars:(\S+)/)[1])).toEqual(['500..999'])
})

test('splits a PR date range that reaches the search cap', async () => {
  const whole = 'created:2026-07-01T00:00:00Z..2026-10-31T23:59:59Z'
  const f = fake({ issueCount: (q) => (q.includes(whole) ? 1000 : null) })
  await run(f)
  expect(prSearches(f.seen)).toEqual([`repo:a/app is:pr is:merged ${whole} merged:<2026-11-01T00:00:00Z linked:issue`,
    'repo:a/app is:pr is:merged created:2026-07-01T00:00:00Z..2026-08-31T23:59:59Z merged:<2026-11-01T00:00:00Z linked:issue',
    'repo:a/app is:pr is:merged created:2026-09-01T00:00:00Z..2026-10-31T23:59:59Z merged:<2026-11-01T00:00:00Z linked:issue'])
})

test('reuses a saved response after a restart', async () => {
  const data = join(tmp, 'restart'), ext = join(data, 'ext'), groups = join(ext, 'groups.json')
  mkdirSync(ext, { recursive: true })
  writeFileSync(groups, JSON.stringify(cfg))
  const times = new Map(), counted = (f) => async (argv) => { const out = await f.gh(argv); times.set(JSON.stringify(argv), (times.get(JSON.stringify(argv)) ?? 0) + 1); return out }
  // the first run dies at the PR search; the second resumes from raw/
  await expect(list([groups, '--tier', '1'], { gh: counted(fake({ fail: (a) => !!flag(a, 'q')?.startsWith('repo:') })), data, log: () => {} })).rejects.toThrow('boom')
  const before = times.size
  await list([groups, '--tier', '1'], { gh: counted(fake()), data, log: () => {} })
  expect(before).toBeGreaterThan(0)
  expect([...times.values()].every((c) => c === 1)).toBe(true)
  expect(readdirSync(join(ext, 'raw')).length).toBe(times.size)
  const third = fake()
  await list([groups, '--tier', '1'], { gh: third.gh, data, log: () => {} })
  expect(third.seen).toEqual([])
})

test('writes ok rows sorted by key with ranks and reasons for the rest', async () => {
  const { ext, counts } = await run(fake())
  const [head, ...rows] = tsv(join(ext, 'candidates-1.tsv'))
  expect(head).toEqual(['stack', 'tier', 'rank', 'key', 'id', 'repo', 'stars', 'pr_created', 'merged_at', 'issue', 'issue_created', 'static'])
  const ids = [1, 2, 3, 4, 5].map((i) => `a/app#${i}`)
  expect(rows.map((r) => r[4])).toEqual([...ids].sort((x, y) => (sortKey(x, cfg.seed) < sortKey(y, cfg.seed) ? -1 : 1)))
  for (const r of rows) expect(r[3]).toBe(sortKey(r[4], cfg.seed))
  const ok = rows.filter((r) => r[11] === 'ok')
  expect(ok.map((r) => r[2])).toEqual(['1', '2', '3'])
  expect(rows.filter((r) => r[11] !== 'ok').map((r) => [r[4], r[2], r[11]]).sort()).toEqual([['a/app#4', '', 'bot author'], ['a/app#5', '', 'closing issues != 1']])
  expect(rows.find((r) => r[4] === 'a/app#1')).toEqual(['s1', '1', expect.any(String), sortKey('a/app#1', cfg.seed), 'a/app#1', 'a/app', '1500', '2026-08-10T00:00:00Z', '2026-08-12T00:00:00Z', '101', '2026-08-01T00:00:00Z', 'ok'])
  expect(tsv(join(ext, 'repos-1.tsv'))).toEqual([['language', 'repo', 'stars', 'stack', 'reason'],
    ['Lang1', 'a/app', '1500', 's1', 'ok'], ['Lang1', 'a/plain', '1200', 'none', 'ok'], ['Lang1', 'a/nolicence', '1100', 'none', 'licence']])
  expect(counts.s1).toEqual({ repos: 3, markers: 1, prs: 5, ok: 3, reasons: { 'bot author': 1, 'closing issues != 1': 1 }, points: expect.any(Number), shortfall: 0 })
})

test('a repo without markers reads no PRs', async () => {
  const f = fake()
  await run(f)
  expect(prSearches(f.seen).every((q) => q.startsWith('repo:a/app '))).toBe(true)
  // a repo out at repo level is not even read for markers
  expect(f.seen.some((a) => flag(a, 'query')?.includes('"nolicence"'))).toBe(false)
  expect(f.seen.some((a) => flag(a, 'query')?.includes('"plain"'))).toBe(true)
})

test('ghFailure tells a partial answer, rate limits and transient errors from the rest', () => {
  const notFound = JSON.stringify({ data: { r0: null }, errors: [{ type: 'NOT_FOUND' }] })
  expect(ghFailure(notFound, 'gh: Could not resolve to a Repository')).toBe('partial')
  expect(ghFailure(JSON.stringify({ errors: [{ type: 'RATE_LIMITED' }] }), '')).toBe('primary')
  expect(ghFailure('', 'gh: API rate limit exceeded for user (HTTP 403)')).toBe('primary')
  expect(ghFailure('', 'gh: You have exceeded a secondary rate limit (HTTP 403)')).toBe('secondary')
  expect(ghFailure('', 'gh: too many requests (HTTP 429)')).toBe('secondary')
  expect(ghFailure('', 'gh: HTTP 502')).toBe('transient')
  expect(ghFailure('', 'gh: Resource not accessible (HTTP 403)')).toBe('error')
  expect(ghFailure(JSON.stringify({ data: null, errors: [{ type: 'MAX_NODE_LIMIT_EXCEEDED' }] }), '')).toBe('error')
})

test('counts a slice shortfall and refuses a PR range that collects fewer than issueCount', async () => {
  const { counts } = await run(fake({ total: (q) => (q.includes('stars:1000..1999 ') ? 5 : null) }))
  expect(counts.s1.shortfall).toBe(2)
  await expect(run(fake({ issueCount: (q) => (q.startsWith('repo:a/app ') ? 6 : null) })))
    .rejects.toThrow('repo:a/app is:pr is:merged created:2026-07-01T00:00:00Z..2026-10-31T23:59:59Z merged:<2026-11-01T00:00:00Z linked:issue: 5 PRs collected, issueCount 6')
})

test('a transient error is transient, and a PR page that keeps failing is asked with fewer PRs', async () => {
  for (const err of ['gh: unexpected end of JSON input', 'gh: unexpected EOF', 'gh: read: connection reset by peer', 'gh: i/o Timeout']) expect(ghFailure('', err)).toBe('transient')
  expect(ghFailure('', 'Post "https://api.github.com/graphql": read tcp 10.0.0.2:50845->140.82.112.6:443: read: operation timed out')).toBe('transient')
  const transient = Object.assign(new Error('gh: HTTP 502'), { kind: 'transient' })
  const f = fake({ fail: (a) => (flag(a, 'q')?.startsWith('repo:') && /first: (100|50),/.test(flag(a, 'query')) ? transient : false) })
  const { ext } = await run(f)
  expect(f.seen.filter((a) => flag(a, 'q')?.startsWith('repo:')).map((a) => flag(a, 'query').match(/first: (\d+), after/)[1])).toEqual(['25'])
  expect(tsv(join(ext, 'candidates-1.tsv')).length).toBe(6)
  // a page still refused at 6 PRs gives up
  await expect(run(fake({ fail: (a) => (flag(a, 'q')?.startsWith('repo:') ? transient : false) }))).rejects.toThrow('HTTP 502')
})

test('a PR whose file list or closing issue GitHub left null falls out with a reason', async () => {
  const u = [{ ...base[0], prs: [pr(1, { files: { totalCount: 2, nodes: null } }),
    pr(2, { closingIssuesReferences: { totalCount: 1, nodes: [{ number: 7, createdAt: '2026-08-01T00:00:00Z', repository: null }] } }), pr(3, { files: null })] }]
  const { ext } = await run(fake({ universe: u }))
  expect(tsv(join(ext, 'candidates-1.tsv')).slice(1).map((r) => [r[4], r[11]]).sort()).toEqual([['a/app#1', 'over 100 files'], ['a/app#2', 'issue in another repo'], ['a/app#3', 'over 100 files']])
})

test('a saved answer that does not parse is removed, so the next run asks again', async () => {
  const q = 'language:Lang1 stars:1000..1999 pushed:>=2026-07-01 created:<2026-01-01 archived:false fork:false'
  const argv = ['api', '-X', 'GET', 'search/repositories', '-f', `q=${q}`, '-f', 'sort=stars', '-f', 'order=desc', '-f', 'per_page=100', '-f', 'page=1']
  let file
  const f = fake()
  await expect(run(f, ['--tier', '1'], (raw) => { file = join(raw, `${rawName(argv)}.json`); writeFileSync(file, '{"total_count": 3, "ite') })).rejects.toThrow('does not parse')
  expect(existsSync(file)).toBe(false)
  expect(f.seen).toEqual([])
})

test('a repo GitHub cannot resolve is unreachable in the repo list', async () => {
  const u = [base[0], { ...base[1], gone: true }]
  const { ext } = await run(fake({ universe: u }))
  expect(tsv(join(ext, 'repos-1.tsv')).slice(1)).toEqual([['Lang1', 'a/app', '1500', 's1', 'ok'], ['Lang1', 'a/plain', '1200', 'none', 'unreachable']])
})
