import { test, expect } from 'bun:test'
import { sortKey, stackOf, staticOut, repoOut, baseOf, failToPass, nextToCheck, coldSetup, extraProbe, sampleOf } from '../bench/lib/ext.mjs'

const SEED = 'hstack-bench-2026-10-27'
const groups = [
  { id: 's1', languages: ['Python', 'Ruby'], markers: [[{ path: 'manage.py', text: 'DJANGO_SETTINGS_MODULE' }], [{ path: 'config/application.rb' }, { path: 'bin/rails' }]],
    testPaths: ['(^|/)tests?/', '(^|/)test_[^/]*\\.py$', '(^|/)spec/'] },
  { id: 's2', languages: ['TypeScript'], markers: [[{ path: 'package.json', text: '"electron"\\s*:' }, { path: 'forge.config.js' }]],
    testPaths: ['(^|/)(tests?|__tests__)/', '\\.(spec|test)\\.[cm]?[jt]sx?$', '(^|/)(vitest|jest)\\.config\\.[cm]?[jt]s$'] },
  { id: 's3', languages: ['Rust'], markers: [[{ path: 'Cargo.toml', root: true }, { path: 'src-tauri', absent: true }]], testPaths: ['(^|/)tests/'] },
]

test('sortKey matches the registered vectors', () => {
  expect(sortKey('octocat/hello-world#42', SEED)).toBe('bea5910fe308bac50ac3fe749d703078d7b3e8b3092710af42634f494c6a8c19')
  expect(sortKey('OctoCat/Hello-World#7', SEED)).toBe('3215ff12f22f2e4479f5b9d3b6720760bffad246a8bf123b1ece0900606d9359')
})

test('stackOf finds a Django app one folder down and ignores a manage.py without the settings variable', () => {
  const tree = { root: ['README.md', 'web'], dirs: { web: ['manage.py'] } }
  expect(stackOf(tree, { 'web/manage.py': 'os.environ.setdefault("DJANGO_SETTINGS_MODULE", "x")' }, groups, 'Python')).toBe('s1')
  expect(stackOf(tree, { 'web/manage.py': 'print(1)' }, groups, 'Python')).toBeNull()
  expect(stackOf(tree, {}, groups, 'Python')).toBeNull()
  const rails = { root: ['config', 'bin'], dirs: { config: ['application.rb'], bin: ['rails'] } }
  expect(stackOf(rails, {}, groups, 'Ruby')).toBe('s1')
})

test('stackOf needs the electron dependency and a packaging config in the same folder', () => {
  const pkg = { 'app/package.json': '{"devDependencies": {"electron": "^30"}}', 'package.json': '{"electron": "1"}' }
  expect(stackOf({ root: ['app'], dirs: { app: ['package.json', 'forge.config.js'] } }, pkg, groups, 'TypeScript')).toBe('s2')
  // config at the root, package.json one folder down: not the same folder
  expect(stackOf({ root: ['app', 'forge.config.js'], dirs: { app: ['package.json'] } }, pkg, groups, 'TypeScript')).toBeNull()
  expect(stackOf({ root: ['package.json', 'forge.config.js'], dirs: {} }, { 'package.json': '{"name": "x"}' }, groups, 'TypeScript')).toBeNull()
})

test('stackOf returns null for a language of no group', () => {
  expect(stackOf({ root: ['manage.py'], dirs: {} }, { 'manage.py': 'DJANGO_SETTINGS_MODULE' }, groups, 'Go')).toBeNull()
})

test('a root-only cond does not match one folder down', () => {
  const g = [{ id: 'r', languages: ['Rust'], markers: [[{ path: 'Cargo.toml', root: true }]], testPaths: [] }]
  expect(stackOf({ root: ['Cargo.toml'], dirs: {} }, {}, g, 'Rust')).toBe('r')
  expect(stackOf({ root: ['crates'], dirs: { crates: ['Cargo.toml'] } }, {}, g, 'Rust')).toBeNull()
})

test('a Rust repo with src-tauri is in no group', () => {
  expect(stackOf({ root: ['Cargo.toml'], dirs: {} }, {}, groups, 'Rust')).toBe('s3')
  expect(stackOf({ root: ['Cargo.toml', 'src-tauri'], dirs: { 'src-tauri': ['Cargo.toml'] } }, {}, groups, 'Rust')).toBeNull()
})

const cfg = { window: { createdFrom: '2026-07-01T00:00:00Z', mergedBefore: '2026-11-01T00:00:00Z' },
  repo: { pushedFrom: '2026-07-01', createdBefore: '2026-01-01' }, licences: ['MIT'], maxFiles: 100, usedInHstack: ['Me/Mine'] }
const repo = { nameWithOwner: 'a/b', licence: 'MIT', isFork: false, isArchived: false, isMirror: false, createdAt: '2020-01-01T00:00:00Z', pushedAt: '2026-10-01T00:00:00Z', defaultBranch: 'main', stars: 2000 }
const pr = { number: 5, createdAt: '2026-08-10T00:00:00Z', mergedAt: '2026-08-12T00:00:00Z', author: { type: 'User' }, baseRefName: 'main', changedFiles: 2,
  files: ['src/a.py', 'tests/test_a.py'], filesTotal: 2, closing: [{ repo: 'a/b', number: 4, createdAt: '2026-08-01T00:00:00Z' }], closingTotal: 1, commits: 1, mergeCommit: 'abc' }
// a PR given only `files` keeps its counts consistent with them
const out = (p = {}, r = {}) => staticOut({ ...pr, ...(p.files && { changedFiles: p.files.length, filesTotal: p.files.length }), ...p }, { ...repo, ...r }, cfg, groups[0])

test('staticOut accepts a clean PR and reports the first reason in registered order', () => {
  expect(out()).toBeNull()
  expect(out({}, { licence: null })).toBe('licence')
  expect(out({}, { isMirror: true })).toBe('fork or archived or mirror')
  expect(out({}, { createdAt: '2026-02-01T00:00:00Z' })).toBe('repo too new')
  expect(out({}, { pushedAt: '2026-06-01T00:00:00Z' })).toBe('inactive')
  expect(out({}, { nameWithOwner: 'me/mine' })).toBe('used in hstack')
  expect(out({ baseRefName: 'dev' })).toBe('not default branch')
  expect(out({ mergedAt: '2026-11-02T00:00:00Z' })).toBe('window')
  expect(out({ createdAt: '2026-06-30T00:00:00Z' })).toBe('window')
  expect(out({ closing: [{ repo: 'x/y', number: 4, createdAt: '2026-08-01T00:00:00Z' }] })).toBe('issue in another repo')
  expect(out({ closing: [{ repo: 'a/b', number: 4, createdAt: '2026-06-01T00:00:00Z' }] })).toBe('issue before window')
  expect(out({ files: ['src/a.py'] })).toBe('no test file')
  expect(out({ author: { type: 'Bot' }, files: ['src/a.py'] })).toBe('bot author')
})

test('repoOut gives the first repo-level reason and staticOut reports it before any PR reason', () => {
  expect(repoOut(repo, cfg)).toBeNull()
  expect(repoOut({ ...repo, licence: 'NOASSERTION', isFork: true }, cfg)).toBe('licence')
  expect(repoOut({ ...repo, isArchived: true, pushedAt: '2026-01-01T00:00:00Z' }, cfg)).toBe('fork or archived or mirror')
  expect(repoOut({ ...repo, nameWithOwner: 'ME/MINE' }, cfg)).toBe('used in hstack')
  expect(out({ author: { type: 'Bot' } }, { pushedAt: '2026-06-01T00:00:00Z' })).toBe('inactive')
})

test('out when changed files exceed 100', () => {
  expect(out({ changedFiles: 101 })).toBe('over 100 files')
  expect(out({ filesTotal: 3 })).toBe('over 100 files')
})

test('out with two closing issues', () => {
  const c = { repo: 'a/b', number: 4, createdAt: '2026-08-01T00:00:00Z' }
  expect(out({ closing: [c, c], closingTotal: 2 })).toBe('closing issues != 1')
  expect(out({ closing: [], closingTotal: 0 })).toBe('closing issues != 1')
})

test('out when the issue was opened after the PR', () => {
  expect(out({ closing: [{ repo: 'a/b', number: 4, createdAt: '2026-08-11T00:00:00Z' }] })).toBe('issue after PR')
})

test('a test-only PR is out with no non-test file', () => {
  expect(out({ files: ['tests/test_a.py'] })).toBe('no non-test file')
  expect(out({ files: ['tests/test_a.py', 'README.md', 'docs/x.md', 'a/docs/y.png'] })).toBe('no non-test file')
  expect(out({ files: ['tests/test_a.py', 'docs.py'] })).toBeNull()
})

test('baseOf: two parents -> first parent, merge', () => {
  expect(baseOf({ parents: ['p1', 'p2'], commits: 3, prFiles: ['a'], diffFiles: ['b'] })).toEqual({ base: 'p1', method: 'merge' })
})

test('baseOf: one parent, diff equals PR files -> squash', () => {
  expect(baseOf({ parents: ['p1'], commits: 3, prFiles: ['a', 'b'], diffFiles: ['b', 'a'] })).toEqual({ base: 'p1', method: 'squash' })
  expect(baseOf({ parents: ['p1'], commits: 1, prFiles: ['a'], diffFiles: ['a', 'z'] })).toEqual({ base: 'p1', method: 'single' })
})

test('baseOf: one parent, diff differs, 3 commits -> rebase out', () => {
  expect(baseOf({ parents: ['p1'], commits: 3, prFiles: ['a'], diffFiles: ['a', 'z'] })).toEqual({ out: 'rebase merge of several commits' })
})

const c = (id, status) => { const [classname, name] = id.split('::'); return { classname, name, status } }

test('a case failing in one end run is not fail-to-pass', () => {
  const r = failToPass([c('k::a', 'fail'), c('k::b', 'pass')], [c('k::a', 'pass'), c('k::b', 'pass')], [c('k::a', 'fail'), c('k::b', 'pass')])
  expect(r).toEqual({ f2p: [], p2p: ['k::b'], endPass: 1 })
})

test('a case missing at base counts as fail-to-pass', () => {
  const r = failToPass([c('k::b', 'pass')], [c('k::a', 'pass'), c('k::b', 'pass')], [c('k::a', 'pass'), c('k::b', 'pass')])
  expect(r).toEqual({ f2p: ['k::a'], p2p: ['k::b'], endPass: 2 })
})

test('a case skipped at the base is not fail-to-pass', () => {
  const r = failToPass([c('k::a', 'skip'), c('k::b', 'pass')], [c('k::a', 'pass'), c('k::b', 'pass')], [c('k::a', 'pass'), c('k::b', 'pass')])
  expect(r).toEqual({ f2p: [], p2p: ['k::b'], endPass: 2 })
})

const row = (id, repo, rank) => ({ id, repo, rank, static: 'ok' })
const rows = [row('r1#1', 'r1', 1), row('r1#2', 'r1', 2), row('r1#3', 'r1', 3), row('r2#1', 'r2', 4), row('r3#1', 'r3', 5), row('r4#1', 'r4', 6),
  row('r5#1', 'r5', 7), row('r6#1', 'r6', 8), row('r7#1', 'r7', 9), row('r8#1', 'r8', 10), row('r9#1', 'r9', 11)]
const ok = (id) => ({ id, result: 'ok' })
const ncfg = { perStack: 8, perRepo: 2 }

test('nextToCheck skips a third task of a repo as repo cap and stops at 8', () => {
  expect(nextToCheck(rows, [], ncfg).row.id).toBe('r1#1')
  const n = nextToCheck(rows, [ok('r1#1'), ok('r1#2')], ncfg)
  expect(n.row.id).toBe('r2#1')
  expect(n.capped.map((x) => x.id)).toEqual(['r1#3'])
  const eight = ['r1#1', 'r1#2', 'r2#1', 'r3#1', 'r4#1', 'r5#1', 'r6#1', 'r7#1'].map(ok)
  expect(nextToCheck(rows, eight, ncfg)).toBeNull()
})

test('a dropped task reopens its repo\'s repo cap rows first', () => {
  const walked = [ok('r1#1'), ok('r1#2'), { id: 'r1#3', result: 'repo cap' }, ok('r2#1'), { id: 'r1#2', result: 'dropped' }]
  const n = nextToCheck(rows, walked, ncfg)
  expect(n.row.id).toBe('r1#3')
  expect(n.capped).toEqual([])
  // out reasons and dropped stay final
  expect(nextToCheck(rows, [{ id: 'r1#1', result: 'dropped' }, { id: 'r1#2', result: 'recipe failed' }], ncfg).row.id).toBe('r1#3')
})

test('an error row is returned again', () => {
  expect(nextToCheck(rows, [{ id: 'r1#1', result: 'error docker daemon' }], ncfg).row.id).toBe('r1#1')
  expect(nextToCheck(rows, [{ id: 'r1#1', result: 'error x' }, ok('r1#1')], ncfg).row.id).toBe('r1#2')
})

test('coldSetup picks the repo whose best rank is lowest', () => {
  const s = [{ repo: 'a', rank: 1 }, { repo: 'b', rank: 2 }, { repo: 'a', rank: 3 }, { repo: 'c', rank: 9 }, { repo: 'b', rank: 10 }]
  expect(coldSetup(s)).toBe('c')
  expect(coldSetup([])).toBeNull()
})

test('a recheck row makes an out row eligible again, and a later verdict closes it', () => {
  const out = { id: 'r1#1', result: 'PR tests do not pass at end' }, re = { id: 'r1#1', result: 'recheck: probe change' }
  expect(nextToCheck(rows, [out], ncfg).row.id).toBe('r1#2')
  expect(nextToCheck(rows, [out, re], ncfg).row.id).toBe('r1#1')
  expect(nextToCheck(rows, [out, re, { id: 'r1#1', result: 'no fail-to-pass test' }], ncfg).row.id).toBe('r1#2')
})

test('extraProbe: the first file under the test paths, in path order, with an extension no probe file has', () => {
  const tp = ['(^|/)tests/']
  const paths = ['tests/z.rs', 'src/a.json', 'tests/b/data.json', 'tests/a.rs', 'tests/README', 'tests/snap.snap']
  expect(extraProbe(paths, tp, ['tests/a.rs'])).toBe('tests/README') // no extension is an extension of its own
  expect(extraProbe(paths, tp, ['tests/a.rs', 'tests/x/LICENSE'])).toBe('tests/b/data.json')
  expect(extraProbe(paths, tp, ['tests/a.rs', 'tests/x/LICENSE', 'tests/c.json', 'tests/d.snap'])).toBe(null)
  expect(extraProbe(['tests/.gitkeep', 'tests/a.rs'], tp, ['tests/a.rs'])).toBe('tests/.gitkeep') // a dot file has no extension
})

test('sampleOf takes the first perStack accepted rows by rank, even when a recheck left more accepted', () => {
  const rs = Array.from({ length: 12 }, (_, i) => ({ id: `r${i % 6}#${i + 1}`, repo: `r${i % 6}`, rank: String(i + 1) }))
  const ok = (id) => ({ id, result: 'ok' })
  const walked = [...rs.slice(0, 10).map((r) => ok(r.id)), { id: rs[2].id, result: 'no fail-to-pass test' }]
  const got = sampleOf(rs, walked, { perStack: 8 })
  expect(got.map((r) => r.rank)).toEqual(['1', '2', '4', '5', '6', '7', '8', '9']) // rank 3's last row is out; ranks 10 on are past 8
  expect(coldSetup(got.map((r) => ({ repo: r.repo, rank: Number(r.rank) })))).toBe('r2') // r2's rank 3 is out, so it enters the sample last, at rank 9
  expect(sampleOf([...rs].reverse(), walked, { perStack: 8 }).map((r) => r.rank)).toEqual(['1', '2', '4', '5', '6', '7', '8', '9'])
})
