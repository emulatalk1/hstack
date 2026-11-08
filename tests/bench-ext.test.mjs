import { test, expect } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { boxEnv, oracleCommand, oracleRun, parseServe, PRIVATE_SET, productNetwork, readinessOf, rebuildLines, taskOf } from '../bench/ext.mjs'
import { sortKey, stackOf, staticOut, repoOut, baseOf, failToPass, nextToCheck, coldSetup, extraProbe, sampleOf, keptIds } from '../bench/lib/ext.mjs'

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
  const got = sampleOf(rs, walked, { perStack: 8, perRepo: 2 })
  expect(got.map((r) => r.rank)).toEqual(['1', '2', '4', '5', '6', '7', '8', '9']) // rank 3's last row is out; ranks 10 on are past 8
  expect(coldSetup(got.map((r) => ({ repo: r.repo, rank: Number(r.rank) })))).toBe('r2') // r2's rank 3 is out, so it enters the sample last, at rank 9
  expect(sampleOf([...rs].reverse(), walked, { perStack: 8, perRepo: 2 }).map((r) => r.rank)).toEqual(['1', '2', '4', '5', '6', '7', '8', '9'])
})

test('sampleOf takes tier 1 before tier 2 and at most perRepo rows of a repo', () => {
  const row = (id, repo, tier, rank) => ({ id, repo, tier: String(tier), rank: String(rank) })
  const rs = [row('b#9', 'b', 2, 1), row('a#1', 'a', 1, 1), row('a#2', 'a', 1, 2), row('a#3', 'a', 1, 3), row('c#4', 'c', 1, 4)]
  const walked = rs.map((r) => ({ id: r.id, result: 'ok' }))
  expect(sampleOf(rs, walked, { perStack: 4, perRepo: 2 }).map((r) => r.id)).toEqual(['a#1', 'a#2', 'c#4', 'b#9'])
})

test('keptIds keeps a row\'s id and numbers a new row after the highest id its stack has used', () => {
  const prev = [{ task: 's1-01', id: 'a#1' }, { task: 's1-02', id: 'a#2' }, { task: 's1-03', id: 'b#3' }, { task: 's2-01', id: 'c#1' }]
  // b#3 (s1-03) was dropped: its id is retired, so the replacement d#9 takes s1-04
  expect(keptIds([{ id: 'a#1' }, { id: 'd#9' }, { id: 'a#2' }], 's1', prev)).toEqual(['s1-01', 's1-04', 's1-02'])
  // a task folder retires an id too, even after the sample that held it was rewritten
  expect(keptIds([{ id: 'a#1' }, { id: 'd#9' }], 's1', prev.slice(0, 2), ['s1-03', 's1-07', 's10-09', 'p1', 's1-x'])).toEqual(['s1-01', 's1-08'])
  expect(keptIds([{ id: 'e#1' }, { id: 'f#2' }], 's3', prev)).toEqual(['s3-01', 's3-02'])
})

// step 11 ruling 4: the rebuild lines of a product image, as shell lines for its make container
const dockerfile = ['FROM alpine:3.22 AS deps', 'RUN echo deps', 'WORKDIR /deps', 'FROM alpine:3.22', '# a comment', 'ARG V=1', 'ARG BARE', 'WORKDIR /src', 'RUN apk add x',
  'COPY . /work', 'WORKDIR /work', 'ENV A=1 B="two words"', 'ENV LEGACY some value', 'RUN npm ci && \\', '    npm run build', 'EXPOSE 3000', 'CMD ["sh"]',
  'RUN ["sh", "-c", "echo it\'s"]', 'RUN --mount=type=cache,target=/root/.npm npm run x', ''].join('\n')
const recipe = { platform: 'linux/arm64', dockerfile, test: 'true', probe: ['t'] }

test('rebuildLines takes the lines after the copy and the serve layer', () => {
  expect(rebuildLines(recipe, { layer: ['RUN echo serve > /tmp/s', 'WORKDIR app'] })).toEqual([
    'cd /', 'export V=1', "mkdir -p '/src' && cd '/src'", // the final stage's state at the copy
    "mkdir -p '/work' && cd '/work'", 'export A=1 B="two words"', "export LEGACY='some value'", "sh -c 'npm ci &&     npm run build'",
    `'sh' '-c' 'echo it'\\''s'`, "sh -c 'npm run x'", "sh -c 'echo serve > /tmp/s'", "mkdir -p 'app' && cd 'app'"])
  expect(rebuildLines({ ...recipe, dockerfile: 'FROM a\nCOPY . /work\n' }, { layer: [] })).toEqual(['cd /'])
})

test('a recipe that copies the repo twice is refused', () => {
  for (const d of ['FROM a\nCOPY . /work\nCOPY --chown=1:1 ./ /work/\n', 'FROM a\nCOPY src /work\n'])
    expect(() => rebuildLines({ ...recipe, dockerfile: d }, { layer: [] })).toThrow('the recipe must copy the repo into /work exactly once')
  expect(() => rebuildLines({ ...recipe, dockerfile: 'FROM a\nCOPY . /work\nCOPY . /work\n' }, { layer: [] }, { lines: [] })).toThrow('the recipe must copy the repo into /work exactly once')
  // what a make container cannot do as a build would: a file from the context, a user switch, a heredoc, a bind mount
  for (const [line, what] of [['ADD x.tgz /opt', 'ADD'], ['COPY package.json /work/', 'COPY'], ['USER node', 'USER'], ['RUN <<EOF', 'heredoc'], ['RUN --mount=type=bind,source=x,target=/x true', 'mount']])
    expect(() => rebuildLines(recipe, { layer: [line] })).toThrow(what)
})

test('the RUN lines keep the shell of the final stage at the copy, and a SHELL that is not JSON is refused', () => {
  const at = (d) => rebuildLines({ ...recipe, dockerfile: d }, { layer: ['RUN echo $0'] })
  expect(at('FROM a\nSHELL ["/bin/bash","-o","pipefail","-c"]\nCOPY . /work\nRUN false | true\nRUN ["true"]\n')).toEqual(
    ['cd /', "'/bin/bash' '-o' 'pipefail' '-c' 'false | true'", "'true'", "'/bin/bash' '-o' 'pipefail' '-c' 'echo $0'"])
  expect(at('FROM a\nSHELL ["/bin/bash","-c"]\nFROM b\nCOPY . /work\nRUN false | true\n')).toEqual(['cd /', "sh -c 'false | true'", "sh -c 'echo $0'"]) // another stage's
  for (const d of ['FROM a\nSHELL /bin/bash -c\nCOPY . /work\n', 'FROM a\nSHELL []\nCOPY . /work\n']) expect(() => at(d)).toThrow('rebuild.json')
})

test('a blank or comment line inside a continuation is skipped, as Docker does', () => {
  expect(rebuildLines({ ...recipe, dockerfile: 'FROM a\nCOPY . /work\nRUN apk add \\\nx \\\n\n  # note\ny\nRUN true\n' }, { layer: [] })).toEqual(['cd /', "sh -c 'apk add x y'", "sh -c 'true'"])
})

test('rebuild.json replaces the recipe lines', () => {
  expect(rebuildLines(recipe, { layer: ['USER node'] }, { lines: ['npm ci --offline', 'cd web && npm run build'] })).toEqual(['npm ci --offline', 'cd web && npm run build'])
  for (const bad of [{}, { lines: 'npm ci' }, { lines: [1] }]) expect(() => rebuildLines(recipe, { layer: [] }, bad)).toThrow('rebuild.json is not { lines: [shell lines] }')
})

test('readiness is read per oracle', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-ready-')), f = join(dir, 'readiness.tsv')
  try {
    expect(readinessOf(f, 'abc1234', 'aaaaaaaa')).toBeNull()
    writeFileSync(f, ['abc1234\tready', 'abc1234\taaaaaaaa\tnot ready', 'abc1234\tbbbbbbbb\tready', 'abc1234\taaaaaaaa\tready', 'def5678\taaaaaaaa\tmemory', 'abc1234\tbbbbbbbb\ttimeout', ''].join('\n'))
    expect(readinessOf(f, 'abc1234', 'aaaaaaaa')).toBe('ready')
    expect(readinessOf(f, 'abc1234', 'bbbbbbbb')).toBe('timeout')
    expect(readinessOf(f, 'def5678', 'aaaaaaaa')).toBe('memory')
    expect(readinessOf(f, 'abc1234', 'cccccccc')).toBeNull() // the old two-column row is no oracle's
    expect(readinessOf(f, 'abc1234', undefined)).toBeNull()
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// step 11 task 7: the private task set has the shape of an external task
const git = (dir, ...a) => Bun.spawnSync(['git', '-C', dir, ...a], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).stdout.toString().trim()
const sampleHead = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup\n'
function dataFolder() {
  const data = mkdtempSync(join(tmpdir(), 'bench-priv-')), ext = join(data, 'ext')
  mkdirSync(ext, { recursive: true })
  writeFileSync(join(ext, 'sample.tsv'), sampleHead + 's1-01\ts1\t1\t1\to/r#7\tu\t7\t3\taaa\tbbb\tmerge\t1\t\tlinux/amd64\tno\n')
  writeFileSync(join(data, 'tasks.json'), JSON.stringify({ p1: { plan: 'p1.md', no: 'P1', base: 'aaaaaaa', end: 'bbbbbbb', n: 3, harness: 'h' }, p2: { plan: 'p2.md', no: 'P2', base: 'ccccccc', end: 'ddddddd', n: 4, harness: 'h' } }))
  return { data, ext }
}

test('taskOf reads a real-estate task from tasks.json', () => {
  const { data, ext } = dataFolder()
  try {
    // no store yet: the shas stay as given
    expect(taskOf(ext, 'p2')).toEqual({ task: 'p2', slug: 'real-estate', key: 'real-estate', stack: 're', base: 'ccccccc', end: 'ddddddd', index: 1001 })
    expect(taskOf(ext, 'p1').index).toBe(1000)
    // an external task is unchanged, and a task in neither file is refused
    expect(taskOf(ext, 's1-01')).toMatchObject({ task: 's1-01', stack: 's1', key: 'o__r', slug: 'o__r__7', index: 0, base: 'aaa' })
    expect(() => taskOf(ext, 'zz')).toThrow('no task zz in sample.tsv')
    // a store: the 7-hex shas resolve to full ones
    const work = join(data, 'work'), store = join(ext, 'repos', 'real-estate')
    mkdirSync(work)
    git(work, 'init', '-q'); git(work, 'commit', '-q', '--allow-empty', '-m', 'a'); const a = git(work, 'rev-parse', 'HEAD')
    git(work, 'commit', '-q', '--allow-empty', '-m', 'b'); const b = git(work, 'rev-parse', 'HEAD')
    mkdirSync(join(ext, 'repos'), { recursive: true })
    git(data, 'clone', '-q', '--bare', work, store)
    writeFileSync(join(data, 'tasks.json'), JSON.stringify({ p1: { base: a.slice(0, 7), end: b.slice(0, 7) } }))
    expect(taskOf(ext, 'p1')).toMatchObject({ base: a, end: b })
    writeFileSync(join(data, 'tasks.json'), JSON.stringify({ p1: { base: a.slice(0, 7), end: 'deadbee' } }))
    expect(() => taskOf(ext, 'p1')).toThrow('deadbee')
  } finally { rmSync(data, { recursive: true, force: true }) }
})

test('a private-set product is made with the pinned registry, any other with no network', async () => {
  const pinned = [{ host: 'registry.example', ip: '10.0.0.7' }, { host: 'registry.example', ip: '10.0.0.8' }, { host: 'mirror.example', ip: '10.0.0.7' }]
  let calls = 0
  const pin = async () => { calls++; return pinned }
  expect(await productNetwork({ stack: PRIVATE_SET.stack }, pin)).toEqual({ ips: ['10.0.0.7', '10.0.0.8'], hosts: pinned })
  expect(await productNetwork({ stack: 's1' }, pin)).toBe('none')
  expect(calls).toBe(1) // an external task pins nothing
  expect(PRIVATE_SET.registry).toEqual(['registry.npmjs.org'])
})

test('a serve recipe may name services', () => {
  const r = { layer: [], start: 'run', ready: 'true', notes: '' }
  expect(parseServe(JSON.stringify(r))).toEqual(r) // absent: no field
  expect(parseServe(JSON.stringify({ ...r, services: 'pg_ctl start' }))).toEqual({ ...r, services: 'pg_ctl start' })
  expect(() => parseServe(JSON.stringify({ ...r, services: ['x'] }))).toThrow('services')
  expect(parseServe(JSON.stringify({ ...r, services: 'pg_ctl start', servicesReady: 'pg_isready' }))).toEqual({ ...r, services: 'pg_ctl start', servicesReady: 'pg_isready' })
  expect(() => parseServe(JSON.stringify({ ...r, servicesReady: 1 }))).toThrow('servicesReady')
})

test('box-env writes a task file with no host start and this checkout\'s oracle command', () => {
  const { data, ext } = dataFolder()
  try {
    const out = join(data, 'env/box')
    boxEnv(['p2'], { data })
    expect(JSON.parse(readFileSync(join(out, 'p2.json'), 'utf8'))).toEqual({ name: 'p2', repo: join(ext, 'repos/real-estate'), db: null, port: 49152 + 1001, start: null, ready: null,
      setup: [], teardown: [], oracle: oracleCommand('p2'), junit: '.bench-junit.xml', timeoutSec: 7800, runner: join(data, 'env/real-estate/runner.json') })
    boxEnv(['s1-01'], { data })
    const e = JSON.parse(readFileSync(join(out, 's1-01.json'), 'utf8'))
    expect(e).toMatchObject({ repo: join(ext, 'repos/o__r'), port: 49152, start: null, db: null, oracle: oracleCommand('s1-01') })
    expect('runner' in e).toBe(false)
    // only that file: no env/<task>.json
    expect(existsSync(join(data, 'env/p2.json')) || existsSync(join(data, 'env/s1-01.json')) || existsSync(join(data, 'env/canary'))).toBe(false)
  } finally { rmSync(data, { recursive: true, force: true }) }
})

test('oracle-run takes the runner from the task file when the oracle folder has none', async () => {
  const { data } = dataFolder(), oracle = join(data, 'oracle'), run = { layer: ['RUN true'], run: 'echo ok' }
  const keep = { ...process.env }
  try {
    mkdirSync(oracle)
    const taskFile = join(data, 'box.json'), runnerFile = join(data, 'runner.json')
    writeFileSync(taskFile, JSON.stringify({ name: 'p1', runner: runnerFile }))
    Object.assign(process.env, { BENCH_DIR: data, BENCH_ORACLE: oracle, BENCH_JUNIT: join(data, 'j.xml'), BENCH_TASK_FILE: taskFile })
    // a runner nowhere: a clear error that names both places
    await expect(oracleRun(['p1'], { data })).rejects.toThrow(/runner\.json.*(task file|runner field)/)
    // the task file's: oracleRun goes on past it (and stops later, on the recipe a fixture does not have)
    writeFileSync(runnerFile, JSON.stringify(run))
    await expect(oracleRun(['p1'], { data })).rejects.toThrow(/task-recipe\.json/)
    // a bad runner in the task file is refused as the folder's would be
    writeFileSync(runnerFile, '{}')
    await expect(oracleRun(['p1'], { data })).rejects.toThrow('runner.json is not')
    // the oracle folder's wins
    writeFileSync(join(oracle, 'runner.json'), JSON.stringify(run))
    rmSync(runnerFile)
    await expect(oracleRun(['p1'], { data })).rejects.toThrow(/task-recipe\.json/)
  } finally {
    for (const k of ['BENCH_DIR', 'BENCH_ORACLE', 'BENCH_JUNIT', 'BENCH_TASK_FILE']) { if (k in keep) process.env[k] = keep[k]; else delete process.env[k] }
    rmSync(data, { recursive: true, force: true })
  }
})
