import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { issueAsOf, netFailure, parseRecipe, runEnd } from '../bench/ext.mjs'
import { releaseRoot } from './bench-root.mjs'

// A local fixture repo stands in for GitHub, a fake gh answers the PR and issue queries, and a fixed recipe (or a fake
// recipe agent) stands in for the sealed agent. Tests that build or run containers need BENCH_EXT_DOCKER=1: every run
// leaves its bench-ext-* containers and bench-ext/* images (nothing here removes what it did not record).
const DOCKER = process.env.BENCH_EXT_DOCKER === '1'
const dtest = DOCKER ? test : test.skip
const dropRoot = releaseRoot()
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-ext-check-')))
afterAll(() => { rmSync(tmp, { recursive: true, force: true }); dropRoot() })
const rand = () => Math.random().toString(36).slice(2, 8)

const fx = join(tmp, 'fixture')
mkdirSync(join(fx, 'tests'), { recursive: true }); mkdirSync(join(fx, 'src'))
const git = (...a) => Bun.spawnSync(['git', '-C', fx, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
git('init', '-q')
writeFileSync(join(fx, 'tests/zebra_ok.sh'), 'exit 0\n')
writeFileSync(join(fx, 'tests/zebra_needs.sh'), 'test -f src/feature.txt\n')
writeFileSync(join(fx, 'tests/zebra_old.sh'), 'exit 1\n')
writeFileSync(join(fx, 'tests/zebra_flip.sh'), 'exit 1\n') // fixed by the PR's test change alone: p2p only when the base runs the end's version
writeFileSync(join(fx, 'src/base.txt'), 'base\n')
writeFileSync(join(fx, 'tests/zebra.txt'), 'data\n') // a data file under tests/: the probe's extra path (ruling 10)
writeFileSync(join(fx, '.dockerignore'), 'tests/\n') // the build must not apply it, or no test is in the image
git('add', '.'); git('commit', '-qm', 'base')
const c0 = git('rev-parse', 'HEAD')
// PR 1: adds the file the check needs, touches both checks, deletes one
writeFileSync(join(fx, 'src/feature.txt'), 'feature\n')
writeFileSync(join(fx, 'tests/zebra_needs.sh'), '# needs the feature\ntest -f src/feature.txt\n')
writeFileSync(join(fx, 'tests/zebra_ok.sh'), '# always\nexit 0\n')
writeFileSync(join(fx, 'tests/zebra_flip.sh'), 'exit 0\n')
rmSync(join(fx, 'tests/zebra_old.sh'))
git('add', '-A'); git('commit', '-qm', 'one')
const c1 = git('rev-parse', 'HEAD')
// PR 2: a test that passes before and after
writeFileSync(join(fx, 'tests/zebra_ok.sh'), '# always, really\nexit 0\n')
writeFileSync(join(fx, 'src/other.txt'), 'other\n')
git('add', '-A'); git('commit', '-qm', 'two')
const c2 = git('rev-parse', 'HEAD')

const platform = process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'
// one case per file, and nothing_old, which fails while the file PR 1 deletes is still there (so deletions must apply)
const junitTest = [
  'echo "<testsuite>" > /out/junit.xml',
  'if [ -e tests/zebra_old.sh ]; then echo "<testcase classname=\\"fx\\" name=\\"nothing_old\\"><failure/></testcase>"; else echo "<testcase classname=\\"fx\\" name=\\"nothing_old\\"/>"; fi >> /out/junit.xml',
  'for f in "$@"; do n=$(basename "$f" .sh); if sh "$f"; then echo "<testcase classname=\\"fx\\" name=\\"$n\\"/>"; else echo "<testcase classname=\\"fx\\" name=\\"$n\\"><failure/></testcase>"; fi; done >> /out/junit.xml',
  'echo "</testsuite>" >> /out/junit.xml',
].join('\n') + '\n'
const recipe = { platform, dockerfile: 'FROM alpine:3.22\nCOPY . /work\nWORKDIR /work\n', test: junitTest, probe: ['tests/zebra_ok.sh'] }
const badRecipe = { ...recipe, probe: ['tests/zebra_needs.sh'] } // fails at the base: no passing case
const netRecipe = { ...recipe, dockerfile: recipe.dockerfile + 'RUN echo "fetch: dial tcp 10.0.0.1:443: connect: refused" && exit 1\n' }
const killedRecipe = { ...recipe, test: '[ $# -gt 2 ] && exit 137\n' + junitTest } // the probe (2 paths) runs, the base run (3) is killed
// fails on any path that is not a shell check, as a script that cannot run a data file would
const strictRecipe = { ...recipe, test: 'for f in "$@"; do case "$f" in *.sh) ;; *) echo "cannot run $f"; exit 2 ;; esac; done\n' + junitTest }

const cfg = {
  seed: 'hstack-bench-2026-10-27', window: { createdFrom: '2026-07-01T00:00:00Z', mergedBefore: '2026-11-01T00:00:00Z' },
  repo: { starsMin: 1000, tier2StarsMin: 500, pushedFrom: '2026-07-01', createdBefore: '2026-01-01' }, licences: ['MIT'], maxFiles: 100, perStack: 8, perRepo: 2, usedInHstack: [],
  groups: [{ id: 's1', languages: ['Lang1'], markers: [], testPaths: ['(^|/)tests/'] }],
}
const prs = {
  1: { end: c1, files: ['src/feature.txt', 'tests/zebra_flip.sh', 'tests/zebra_needs.sh', 'tests/zebra_ok.sh', 'tests/zebra_old.sh'], issue: 11 },
  2: { end: c2, files: ['src/other.txt', 'tests/zebra_ok.sh'], issue: 12 },
}
const prAnswer = (p) => ({ data: { repository: { licenseInfo: { spdxId: 'MIT' }, defaultBranchRef: { name: 'main' }, pullRequest: {
  createdAt: '2026-08-10T00:00:00Z', mergedAt: '2026-08-12T00:00:00Z', mergeCommit: { oid: p.end }, commits: { totalCount: 1 }, baseRefName: 'main',
  files: { totalCount: p.files.length, nodes: p.files.map((path) => ({ path })) }, closingIssuesReferences: { nodes: [{ number: p.issue, createdAt: '2026-08-01T00:00:00Z' }] } } } } })
const issueAnswer = { data: { repository: { issue: { title: 'Issue title', body: 'Issue body', createdAt: '2026-08-01T00:00:00Z', lastEditedAt: null,
  userContentEdits: { nodes: [] }, timelineItems: { nodes: [] } } } } }

// the runner: imports main from bench/ext.mjs with a fake gh, the fixture as the remote and a fake recipe agent
const runner = join(tmp, 'runner.mjs')
writeFileSync(runner, `import { main } from ${JSON.stringify(join(import.meta.dir, '../bench/ext.mjs'))}
const c = JSON.parse(process.argv[2])
const gh = async (argv) => {
  const n = +argv.find((a) => a.startsWith('n=')).slice(2), q = argv.find((a) => a.startsWith('query='))
  return JSON.stringify(q.includes('pullRequest(') ? c.pr[n] : c.issue)
}
let i = 0
const recipeAgent = async () => (Array.isArray(c.reply) ? c.reply[i++] ?? null : c.reply)
process.exit(await main(c.args, { gh, remote: () => c.remote, recipeAgent }))
`)

// a data folder with its own repo owner, so container and image names never meet those of another test or run
const BRIEF_SHA = new Bun.CryptoHasher('sha256').update('RECIPE BRIEF\n').digest('hex') // the brief setup writes
function setup({ withRecipe = true, use = recipe, briefSha = BRIEF_SHA } = {}) {
  const owner = `fx${rand()}`, data = join(tmp, owner), ext = join(data, 'ext'), key = `${owner}__app`
  mkdirSync(join(ext, 'briefs'), { recursive: true })
  writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(ext, 'groups.json'), JSON.stringify(cfg))
  writeFileSync(join(ext, 'briefs/recipe.md'), 'RECIPE BRIEF\n')
  const head = ['stack', 'tier', 'rank', 'key', 'id', 'repo', 'stars', 'pr_created', 'merged_at', 'issue', 'issue_created', 'static']
  const rows = [1, 2].map((n) => ['s1', '1', n, `k${n}`, `${owner}/app#${n}`, `${owner}/app`, 1500, '2026-08-10T00:00:00Z', '2026-08-12T00:00:00Z', prs[n].issue, '2026-08-01T00:00:00Z', 'ok'])
  writeFileSync(join(ext, 'candidates-1.tsv'), [head, ...rows].map((l) => l.join('\t')).join('\n') + '\n')
  if (withRecipe) {
    mkdirSync(join(ext, 'recipes', key), { recursive: true })
    writeFileSync(join(ext, 'recipes', key, 'recipe.json'), JSON.stringify(briefSha ? { ...use, briefSha } : use))
  }
  return { owner, data, ext, key, slug: (n) => `${key}__${n}` }
}
async function run(s, args, { reply = null, env = {} } = {}) {
  const c = { args: [args[0], join(s.ext, 'groups.json'), ...args.slice(1)], pr: { 1: prAnswer(prs[1]), 2: prAnswer(prs[2]) }, issue: issueAnswer, remote: fx, reply }
  const p = Bun.spawn(['bun', runner, JSON.stringify(c)], { env: { ...process.env, HSTACK_BENCH_MACHINE: join(s.data, 'machine.json'), ...env }, stdout: 'pipe', stderr: 'pipe' })
  return { stdout: await new Response(p.stdout).text(), stderr: await new Response(p.stderr).text(), code: await p.exited }
}
const json = (f) => JSON.parse(readFileSync(f, 'utf8'))
const walkRows = (s) => readFileSync(join(s.ext, 'walk.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'))
const docker = (...a) => Bun.spawnSync(['docker', ...a], { stdout: 'pipe', stderr: 'pipe' })
const exists = (kind, name) => docker(kind === 'image' ? 'image' : 'container', 'inspect', name).exitCode === 0

// one accepted check, shared by the tests that read it
let first
const accepted = () => (first ??= (async () => { const s = setup(); return { s, r: await run(s, ['check', 's1', '1']) } })())

dtest('finds one fail-to-pass test in the fixture and writes meta.json (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s, r } = await accepted()
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n`)
  const meta = json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))
  expect(meta).toMatchObject({ id: `${s.owner}/app#1`, slug: s.slug(1), stack: 's1', tier: 1, rank: 1, url: `https://github.com/${s.owner}/app/pull/1`, defaultBranch: 'main',
    pr: 1, prCreated: '2026-08-10T00:00:00Z', mergedAt: '2026-08-12T00:00:00Z', issue: 11, issueCreated: '2026-08-01T00:00:00Z', end: c1, base: c0, method: 'single',
    licence: 'MIT', stars: 1500, f2p: 1, p2p: 3, editHistory: 'none', platform, recipeRounds: 0 })
  expect(meta.images).toEqual([`bench-ext/${s.slug(1)}:${c0.slice(0, 7)}`, `bench-ext/${s.slug(1)}:${c1.slice(0, 7)}`])
  // zebra_flip passes at the base only in the end's version; nothing_old only once the deletion is applied
  expect(json(join(s.ext, 'sealed', s.slug(1), 'f2p.json'))).toEqual({ f2p: ['fx::zebra_needs'], p2p: ['fx::nothing_old', 'fx::zebra_flip', 'fx::zebra_ok'] })
  expect(meta.runs).toEqual([['probe-reuse-1', 3], ['base-1', 4], ['end-1-1', 4], ['end-1-2', 4]].map(([label, cases]) => ({ label, timedOut: false, exitCode: 0, cases })))
  // the commit is pinned by a ref, so a later gc keeps it
  expect(Bun.spawnSync(['git', '-C', join(s.ext, 'repos', s.key), 'rev-parse', `refs/ext/${c1}`]).stdout.toString().trim()).toBe(c1)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'issue.json'))).toEqual({ title: 'Issue title', body: 'Issue body', asOf: '2026-08-10T00:00:00Z', editHistory: 'none' })
  expect(walkRows(s)).toEqual([['s1', '1', '1', `${s.owner}/app#1`, 'ok']])
  expect(existsSync(join(s.ext, 'tasks', s.slug(1), 'check.err'))).toBe(false)
}, 300000)

dtest('prints only the verdict and counts (needs BENCH_EXT_DOCKER=1)', async () => {
  const { r } = await accepted()
  const lines = r.stdout.split('\n').filter(Boolean)
  expect(lines.length).toBe(1)
  expect(lines[0]).toMatch(/^\S+ (ok f2p=\d+ p2p=\d+|out [a-z0-9 ]+)$/)
  expect(r.stdout).not.toMatch(/zebra|nothing_old|tests\/|feature/)
  expect(r.stderr).toBe('')
}, 300000)

dtest('test runs use no network (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s } = await accepted()
  const { containers } = json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))
  expect(containers.length).toBe(4) // the probe of the reused recipe, the base run, two end runs
  for (const c of containers) expect(docker('inspect', '-f', '{{.HostConfig.NetworkMode}}', c).stdout.toString().trim()).toBe('none')
}, 300000)

dtest('--remove-out removes only the names check recorded for an out candidate (needs BENCH_EXT_DOCKER=1)', async () => {
  if (!exists('container', 'bench-ext-other')) expect(docker('create', '--name', 'bench-ext-other', 'alpine:3.22', 'true').exitCode).toBe(0)
  const s = setup()
  const r = await run(s, ['walk', 's1', '--remove-out'])
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n${s.slug(2)} out no fail-to-pass test\ns1 tier 1: accepted 1, checked 2, list end yes\n`)
  const out = json(join(s.ext, 'tasks', s.slug(2), 'meta.json')), ok = json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))
  expect(out.containers.length).toBe(4)
  const removed = readFileSync(join(s.ext, 'removed.txt'), 'utf8').trim().split('\n')
  expect(removed).toEqual([...out.containers, ...out.images])
  for (const c of out.containers) expect(exists('container', c)).toBe(false)
  for (const i of out.images) expect(exists('image', i)).toBe(false)
  // the accepted candidate's end image is the same build as the out candidate's base image: it must survive
  for (const c of ok.containers) expect(exists('container', c)).toBe(true)
  for (const i of ok.images) expect(exists('image', i)).toBe(true)
  expect(exists('container', 'bench-ext-other')).toBe(true)
  expect(walkRows(s).map((w) => w[4])).toEqual(['ok', 'no fail-to-pass test'])
}, 600000)

dtest('out with recipe failed when the probe has no passing case (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ withRecipe: false })
  const r = await run(s, ['check', 's1', '1'], { reply: '```json\n' + JSON.stringify(badRecipe) + '\n```' })
  expect(r.stdout).toBe(`${s.slug(1)} out recipe failed\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t')))
    .toEqual([1, 2, 3].map((k) => [String(k), s.slug(1), 'probe failed']))
  expect(existsSync(join(s.ext, 'recipes', s.key, 'recipe.json'))).toBe(false)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).recipeRounds).toBe(3)
  // a retry is told the previous recipe and the end of its probe log; the first round only gets the brief
  const prompt = (k) => readFileSync(join(s.ext, 'recipes', s.key, 'rounds', `${k}.prompt.md`), 'utf8')
  expect(prompt(1)).toBe('RECIPE BRIEF\n')
  expect(prompt(2)).toStartWith('RECIPE BRIEF\n')
  expect(prompt(2)).toContain('The last 200 lines of its probe log')
  expect(prompt(2)).toContain(JSON.stringify(badRecipe, null, 2))
  expect(walkRows(s)).toEqual([['s1', '1', '1', `${s.owner}/app#1`, 'recipe failed']])
}, 600000)

dtest('a build that fails twice on a network signature is error, and check.err names only the signature (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ use: netRecipe })
  const r = await run(s, ['check', 's1', '1'])
  expect(r.stdout).toBe(`${s.slug(1)} error build\n`)
  expect(readFileSync(join(s.ext, 'tasks', s.slug(1), 'check.err'), 'utf8')).toBe('build: dial tcp\n')
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).images).toEqual([])
}, 300000)

dtest('a run killed from outside our limit is error, not out (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ use: killedRecipe })
  const r = await run(s, ['check', 's1', '1'])
  expect(r.stdout).toBe(`${s.slug(1)} error run\n`)
  expect(readFileSync(join(s.ext, 'tasks', s.slug(1), 'check.err'), 'utf8')).toMatch(/^run: container \S+-base-1 was killed \(exit 137, OOMKilled false\)\n$/)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).runs.map((x) => x.label)).toEqual(['probe-reuse-1']) // the killed run records no cases
}, 300000)

dtest('a reply that is not a recipe spends a round, and the next round is told why (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ withRecipe: false })
  const r = await run(s, ['check', 's1', '1'], { reply: ['no recipe here', JSON.stringify(recipe)] })
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tbad reply\n2\t${s.slug(1)}\tpass\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds', '2.prompt.md'), 'utf8')).toStartWith('RECIPE BRIEF\n\nThe previous reply was not a valid recipe: ')
  expect(json(join(s.ext, 'recipes', s.key, 'recipe.json'))).toEqual({ ...recipe, briefSha: BRIEF_SHA })
}, 300000)

dtest('the probe also runs a data file under the test paths: a script that fails on it fails the probe (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ use: strictRecipe })
  const r = await run(s, ['check', 's1', '1'], { reply: [JSON.stringify(recipe)] })
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n`)
  // the reused recipe failed its probe, so the first round is told why; the fixed recipe passes
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tpass\n`)
  const prompt = readFileSync(join(s.ext, 'recipes', s.key, 'rounds', '1.prompt.md'), 'utf8')
  expect(prompt).toContain('The last 200 lines of its probe log')
  expect(prompt).toContain('cannot run tests/zebra.txt')
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).runs.slice(0, 2)).toEqual([{ label: 'probe-reuse-1', timedOut: false, exitCode: 2, cases: 0 }, { label: 'probe-1', timedOut: false, exitCode: 0, cases: 3 }])
}, 300000)

test('three replies that are not recipes are out with recipe failed', async () => {
  const s = setup({ withRecipe: false })
  const r = await run(s, ['check', 's1', '1'], { reply: ['nope', '{"platform": "linux/arm64"}', JSON.stringify({ ...recipe, dockerfile: 'FROM alpine:3.22\n' })] })
  expect(r.stdout).toBe(`${s.slug(1)} out recipe failed\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t')[2])).toEqual(['bad reply', 'bad reply', 'bad reply'])
  expect(existsSync(join(s.ext, 'tasks', s.slug(1), 'check.err'))).toBe(false)
}, 60000)

test('a saved recipe written under another brief is regenerated first, from the old recipe, within the round count', async () => {
  for (const briefSha of [null, 'f'.repeat(64)]) { // none recorded, or another brief's
    const s = setup({ briefSha })
    const r = await run(s, ['check', 's1', '1'], { reply: ['nope', 'nope', 'nope', 'nope'] })
    expect(r.stdout).toBe(`${s.slug(1)} out recipe failed\n`)
    expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t')[2])).toEqual(['bad reply', 'bad reply', 'bad reply'])
    const p1 = readFileSync(join(s.ext, 'recipes', s.key, 'rounds', '1.prompt.md'), 'utf8')
    expect(p1).toStartWith('RECIPE BRIEF\n\nA recipe written under an earlier version of this brief follows.')
    expect(p1).toContain(JSON.stringify(recipe.test))
    expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).containers).toEqual([]) // the old recipe was not built or probed
  }
}, 60000)

test('a recipe must copy the repo to /work and may not ask for host network, insecure mode or secrets', () => {
  const ok = { platform: 'linux/arm64', dockerfile: 'FROM alpine:3.22\nCOPY . /work\nWORKDIR /work\nRUN true\n', test: 'true', probe: ['a'] }
  expect(parseRecipe('```json\n' + JSON.stringify(ok) + '\n```')).toEqual(ok)
  const bad = (dockerfile) => () => parseRecipe(JSON.stringify({ ...ok, dockerfile }))
  expect(bad('FROM alpine:3.22\nWORKDIR /work\n')).toThrow('COPY . /work')
  expect(bad('FROM alpine:3.22\nCOPY . /work\n')).toThrow('WORKDIR /work')
  for (const run of ['RUN --network=host true', 'RUN --security=insecure true', 'RUN --mount=type=ssh true', 'RUN --mount=target=/x,type=secret,id=a true'])
    expect(bad(ok.dockerfile + run + '\n')).toThrow('may not use')
  expect(() => parseRecipe(JSON.stringify({ ...ok, platform: 'linux/s390x' }))).toThrow('the recipe is not')
  expect(() => parseRecipe(JSON.stringify({ ...ok, probe: [] }))).toThrow('the recipe is not')
})

test('a run killed for memory is the repo\'s (out of memory), one killed from outside is the machine\'s', () => {
  expect(runEnd(false, '137', 'true')).toBe('oom')
  expect(runEnd(false, '101', 'true')).toBe('oom') // the first datafusion base run: a panic code with OOMKilled set
  expect(runEnd(false, '137', 'false')).toBe('killed')
  expect(runEnd(false, '143', 'false')).toBe('killed')
  expect(runEnd(true, '137', 'false')).toBe('finished') // our own limit stopped it
  expect(runEnd(false, '1', 'false')).toBe('finished')
  expect(runEnd(false, '0', 'false')).toBe('finished')
})

test('a missing image tag is the recipe\'s failure, the network\'s signatures are not', () => {
  expect(netFailure('#2 ERROR: failed to resolve source metadata for docker.io/library/python:9.9: docker.io/library/python:9.9: not found')).toBe(null)
  expect(netFailure('ERROR: failed to resolve source metadata for docker.io/x/y:1: pull access denied, repository does not exist')).toBe(null)
  expect(netFailure('failed to resolve source metadata for docker.io/library/a:1: manifest unknown')).toBe(null)
  expect(netFailure('ERROR: failed to resolve source metadata for docker.io/library/alpine:3.22: dial tcp: lookup registry-1.docker.io: no such host')).toBe('failed to resolve source metadata')
  expect(netFailure('npm ERR! network request failed, reason: getaddrinfo ENOTFOUND\nconnect ETIMEDOUT 1.2.3.4:443')).toBe('ETIMEDOUT')
  expect(netFailure('toomanyrequests: You have reached your pull rate limit')).toBe('toomanyrequests')
  expect(netFailure('error: test failed, exit 1')).toBe(null)
  // a `not found` on another line does not hide the network's failure
  expect(netFailure('sh: 1: foo: not found\nERROR: fetch https://x.example/a: dial tcp 10.0.0.1:443: connect: connection refused')).toBe('dial tcp')
})

dtest('a FROM tag that does not exist is a spent round, told to the next one (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ withRecipe: false })
  const badTag = { ...recipe, dockerfile: recipe.dockerfile.replace('alpine:3.22', 'alpine:9.9.9-no-such-tag') }
  const r = await run(s, ['check', 's1', '1'], { reply: [JSON.stringify(badTag), JSON.stringify(recipe)] })
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tbuild failed\n2\t${s.slug(1)}\tpass\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds', '2.prompt.md'), 'utf8')).toContain('The last 200 lines of its build log')
}, 300000)

test('a docker daemon failure is error, not out', async () => {
  const s = setup()
  const r = await run(s, ['check', 's1', '1'], { env: { DOCKER_HOST: `unix:///nonexistent-${rand()}.sock` } })
  expect(r.stdout).toBe(`${s.slug(1)} error build\n`)
  expect(walkRows(s)).toEqual([['s1', '1', '1', `${s.owner}/app#1`, 'error build']])
  expect(existsSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'))).toBe(false) // the current brief's recipe is reused, no round
  expect(readFileSync(join(s.ext, 'tasks', s.slug(1), 'check.err'), 'utf8')).toMatch(/^build: docker daemon/)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))).toMatchObject({ base: c0, end: c1, containers: [], images: [] })
}, 60000)

test('a recipe agent with no reply is error, not out', async () => {
  const s = setup({ withRecipe: false })
  const r = await run(s, ['check', 's1', '1'])
  expect(r.stdout).toBe(`${s.slug(1)} error recipe-agent\n`)
  expect(existsSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'))).toBe(false) // no reply, no round spent
}, 60000)

test('the issue as it stood when the PR opened', () => {
  const at = '2026-08-10T00:00:00Z'
  const issue = (o) => ({ title: 'now', body: 'body now', lastEditedAt: null, userContentEdits: { nodes: [] }, timelineItems: { nodes: [] }, ...o })
  // never edited, and edited only before the PR
  expect(issueAsOf(issue({}), at)).toEqual({ title: 'now', body: 'body now', editHistory: 'none' })
  expect(issueAsOf(issue({ lastEditedAt: '2026-08-09T00:00:00Z', userContentEdits: { nodes: [{ editedAt: '2026-08-09T00:00:00Z', diff: 'body now' }, { editedAt: '2026-08-01T00:00:00Z', diff: 'v0' }] } }), at).editHistory).toBe('none')
  // edited after: the newest version at or before the PR (nodes come newest first, each the whole body)
  const edits = { lastEditedAt: '2026-08-20T00:00:00Z', userContentEdits: { nodes: [{ editedAt: '2026-08-20T00:00:00Z', diff: 'body now' }, { editedAt: '2026-08-05T00:00:00Z', diff: 'v1' }, { editedAt: '2026-08-01T00:00:00Z', diff: 'v0' }] } }
  expect(issueAsOf(issue(edits), at)).toEqual({ title: 'now', body: 'v1', editHistory: 'recovered' })
  // edited after, no version from before: the current body, flagged
  expect(issueAsOf(issue({ lastEditedAt: '2026-08-20T00:00:00Z', userContentEdits: { nodes: [{ editedAt: '2026-08-20T00:00:00Z', diff: 'body now' }] } }), at))
    .toEqual({ title: 'now', body: 'body now', editHistory: 'unverified' })
  expect(issueAsOf(issue({ lastEditedAt: '2026-08-20T00:00:00Z' }), at).editHistory).toBe('unverified')
  // the version in force has no text: an older version is not it
  expect(issueAsOf(issue({ ...edits, userContentEdits: { nodes: [{ editedAt: '2026-08-20T00:00:00Z', diff: 'body now' }, { editedAt: '2026-08-05T00:00:00Z', diff: null }, { editedAt: '2026-08-01T00:00:00Z', diff: 'v0' }] } }), at))
    .toEqual({ title: 'now', body: 'body now', editHistory: 'unverified' })
  // renames after the PR are undone; one before stays
  const renames = { timelineItems: { nodes: [{ createdAt: '2026-08-02T00:00:00Z', previousTitle: 'first', currentTitle: 'second' },
    { createdAt: '2026-08-15T00:00:00Z', previousTitle: 'second', currentTitle: 'third' }, { createdAt: '2026-08-16T00:00:00Z', previousTitle: 'third', currentTitle: 'now' }] } }
  expect(issueAsOf(issue(renames), at).title).toBe('second')
})
