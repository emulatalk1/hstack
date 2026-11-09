import { test, expect, afterAll } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withExport } from '../bench/env.mjs'
import { buildImage, diskFailure, diskIsLow, FEEDBACK, freeGB, gradeMode, issueAsOf, needsFeedback, netFailure, parseRecipe, parseSize, overlayScript, productImage, rebuild, recordDocker, removeOut, removeRecorded, runEnd, SERVE_EMPTY, trustedCommit, word } from '../bench/ext.mjs'
import { oracleFiles } from '../bench/grade.mjs'
import { oracleSha } from '../bench/lib/oracle.mjs'
import { releaseRoot } from './bench-root.mjs'

// A local fixture repo stands in for GitHub, a fake gh answers the PR and issue queries, and a fixed recipe (or a fake
// recipe agent) stands in for the sealed agent. Tests that build or run containers need BENCH_EXT_DOCKER=1: the
// bench-ext-* containers and bench-ext/* images a check records are removed at the end by their recorded names (serve
// removes its own); nothing here removes a name it did not record.
const DOCKER = process.env.BENCH_EXT_DOCKER === '1'
const dtest = DOCKER ? test : test.skip
const dropRoot = releaseRoot()
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-ext-check-')))
const made = [] // every data folder setup made
const ovFixtures = [] // the productImage fixtures' promises
// image ids that existed before this run: a cached build can give one of them again, and a container this run did not
// create may hold it, so it is never this run's to remove
const idsBefore = new Set(DOCKER ? Bun.spawnSync(['docker', 'images', '-a', '-q', '--no-trunc']).stdout.toString().split('\n').filter(Boolean) : [])
afterAll(async () => {
  if (DOCKER) for (const s of made) for (const n of [1, 2]) {
    const f = join(s.ext, 'tasks', s.slug(n), 'meta.json'), meta = existsSync(f) && json(f)
    if (!meta?.images) continue // no check ran there
    writeFileSync(f, JSON.stringify({ ...meta, imageIds: meta.imageIds.filter((id) => !idsBefore.has(id)) }))
    await removeOut(s.ext, s.slug(n))
  }
  for (const f of ovFixtures) { const { data, slug } = await f; await removeRecorded(data, 'ov', slug) } // productImage's fixtures, by their records
  rmSync(tmp, { recursive: true, force: true })
  dropRoot()
}, 600000)
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
const diskRecipe = { ...recipe, test: '[ $# -gt 2 ] && { echo "write /tmp/x: no space left on device"; exit 1; }\n' + junitTest } // the base run (3 paths) prints it
const usageRecipe = { ...recipe, test: '[ $# -gt 2 ] && { echo "usage: unexpected argument"; exit 2; }\n' + junitTest } // the probe (2 paths) passes, the PR's runs (3) exit with no JUnit
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
let i = 0, j = 0, k = 0
const recipeAgent = async () => (Array.isArray(c.reply) ? c.reply[i++] ?? null : c.reply)
const serveAgent = async () => (Array.isArray(c.serveReply) ? c.serveReply[j++] ?? null : c.serveReply ?? null)
const rebuildAgent = async () => (Array.isArray(c.rebuildReply) ? c.rebuildReply[k++] ?? null : c.rebuildReply ?? null)
process.exit(await main(c.args, { gh, remote: () => c.remote, recipeAgent, serveAgent, rebuildAgent, ...(c.readySec ? { readySec: c.readySec } : {}),
  ...(c.prune ? { prune: async () => console.error('bench-test: builder prune') } : {}),
  ...('diskFree' in c ? { diskFree: async () => (Array.isArray(c.diskFree) ? (c.diskFree.length > 1 ? c.diskFree.shift() : c.diskFree[0]) : c.diskFree) } : {}) }))
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
  const s = { owner, data, ext, key, slug: (n) => `${key}__${n}` }
  made.push(s)
  return s
}
async function run(s, args, { reply = null, env = {}, disk, more = {} } = {}) {
  const c = { args: ['oracle-run', 'remove', 'rebuild'].includes(args[0]) ? args : [args[0], join(s.ext, 'groups.json'), ...args.slice(1)], pr: { 1: prAnswer(prs[1]), 2: prAnswer(prs[2]) }, issue: issueAnswer, remote: fx, reply, ...more, ...(disk === undefined ? {} : { diskFree: disk }) }
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
  expect(meta.recipeSha).toBe(new Bun.CryptoHasher('sha256').update(JSON.stringify(recipe)).digest('hex')) // the recipe it used
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

dtest('--remove-out removes only the names check recorded, for an out and an accepted candidate, and keeps the accepted one\'s digests (needs BENCH_EXT_DOCKER=1)', async () => {
  if (!exists('container', 'bench-ext-other')) expect(docker('create', '--name', 'bench-ext-other', 'alpine:3.22', 'true').exitCode).toBe(0)
  const s = setup()
  const r = await run(s, ['walk', 's1', '--remove-out'])
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n${s.slug(2)} out no fail-to-pass test\ns1 tier 1: accepted 1, checked 2, list end yes\n`)
  const out = json(join(s.ext, 'tasks', s.slug(2), 'meta.json')), ok = json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))
  expect(out.containers.length).toBe(4)
  const removed = readFileSync(join(s.ext, 'removed.txt'), 'utf8').trim().split('\n')
  expect(removed).toEqual([...ok.containers, ...ok.images, ...out.containers, ...out.images])
  for (const c of [...out.containers, ...ok.containers]) expect(exists('container', c)).toBe(false)
  for (const i of [...out.images, ...ok.images]) expect(exists('image', i)).toBe(false)
  // an accepted task keeps its image digests, not its images (step 5 rebuilds)
  expect(Object.keys(ok.imageDigests)).toEqual(ok.images)
  for (const d of Object.values(ok.imageDigests)) expect(d).toMatch(/^sha256:[0-9a-f]{64}$/)
  expect(out.imageDigests).toBeUndefined()
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
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).recipeSha).toBe(null)
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

test('a stale recipe with no round left is recipe failed and is never built', async () => {
  const s = setup({ briefSha: null })
  const tsv = join(s.ext, 'recipes', s.key, 'rounds.tsv'), spent = [1, 2, 3].map((k) => `${k}\t${s.slug(1)}\tbad reply\n`).join('')
  writeFileSync(tsv, spent)
  const r = await run(s, ['check', 's1', '1'], { reply: ['nope'] })
  expect(r.stdout).toBe(`${s.slug(1)} out recipe failed\n`)
  expect(readFileSync(tsv, 'utf8')).toBe(spent)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).containers).toEqual([])
}, 60000)

test('the repo\'s first task keeps its 3 rounds after a further task spent one; a further task gets 1', async () => {
  const s = setup({ withRecipe: false })
  const tsv = join(s.ext, 'recipes', s.key, 'rounds.tsv')
  mkdirSync(join(s.ext, 'recipes', s.key), { recursive: true })
  writeFileSync(tsv, `1\t${s.slug(1)}\tbad reply\n2\t${s.slug(2)}\tbad reply\n`)
  expect((await run(s, ['check', 's1', '1'], { reply: ['nope', 'nope', 'nope'] })).stdout).toBe(`${s.slug(1)} out recipe failed\n`)
  expect(readFileSync(tsv, 'utf8').trim().split('\n').map((l) => l.split('\t')[1])).toEqual([s.slug(1), s.slug(2), s.slug(1), s.slug(1)]) // 2 more: 3 in all
  expect((await run(s, ['check', 's1', '2'], { reply: ['nope'] })).stdout).toBe(`${s.slug(2)} out recipe failed\n`)
  expect(readFileSync(tsv, 'utf8').trim().split('\n').length).toBe(4) // its 1 round is spent
}, 60000)

test('a round is recorded as soon as its reply exists, so a check that dies after it still counts it', async () => {
  const s = setup({ withRecipe: false })
  const r = await run(s, ['check', 's1', '1'], { reply: [JSON.stringify(recipe)], env: { DOCKER_HOST: `unix:///nonexistent-${rand()}.sock` } })
  expect(r.stdout).toBe(`${s.slug(1)} error build\n`) // the daemon is gone once the reply is in
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\treplied\n`)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).recipeRounds).toBe(1)
}, 60000)

test('check stops before anything when Docker\'s disk is low, as walk does', async () => {
  const s = setup()
  const r = await run(s, ['check', 's1', '1'], { disk: 9.96 })
  expect(r).toMatchObject({ code: 3, stdout: 's1 stopped: docker disk low (10.0 GB free)\n' })
  expect(existsSync(join(s.ext, 'walk.tsv'))).toBe(false)
  expect(existsSync(join(s.ext, 'tasks', s.slug(1)))).toBe(false)
}, 60000)

test('sample writes the first 8 accepted rows per stack with the meta.json fields and the cold-setup repo', async () => {
  const s = setup()
  writeFileSync(join(s.ext, 'walk.tsv'), `stack\ttier\trank\tid\tresult\ns1\t1\t1\t${s.owner}/app#1\tok\ns1\t1\t2\t${s.owner}/app#2\tok\n`)
  writeFileSync(join(s.ext, 'sample.tsv'), SAMPLE_HEAD + '\n') // a live sample with no row: no id to keep
  for (const n of [1, 2]) {
    mkdirSync(join(s.ext, 'tasks', s.slug(n)), { recursive: true })
    writeFileSync(join(s.ext, 'tasks', s.slug(n), 'meta.json'), JSON.stringify({ url: `u${n}`, pr: n, issue: 10 + n, base: `b${n}`, end: `e${n}`, method: 'squash', f2p: n, editHistory: 'none', platform: 'linux/arm64' }))
  }
  const r = await run(s, ['sample'])
  expect(r).toMatchObject({ code: 0, stdout: 'sample.tsv: 2 rows\n' })
  expect(readFileSync(join(s.ext, 'sample.tsv'), 'utf8')).toBe([
    'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup',
    `s1-01\ts1\t1\t1\t${s.owner}/app#1\tu1\t1\t11\tb1\te1\tsquash\t1\tnone\tlinux/arm64\tyes`,
    `s1-02\ts1\t1\t2\t${s.owner}/app#2\tu2\t2\t12\tb2\te2\tsquash\t2\tnone\tlinux/arm64\tyes`, ''].join('\n'))
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

test('a full disk in a log is the machine\'s, by its signature only', () => {
  expect(diskFailure('ERROR: failed to copy: write /var/lib/docker/x: no space left on device')).toBe('no space left on device')
  expect(diskFailure('error: Disk quota exceeded (os error 122)')).toBe('disk quota exceeded')
  expect(diskFailure('error[E0425]: cannot find value')).toBe(null)
})

test('a disk-full message is the machine\'s only below the floor or with no estimate; 90% of the limit is usable', () => {
  expect([null, 0, 14.9, 15, 40].map(diskIsLow)).toEqual([true, true, true, false, false])
  expect(freeGB(64e9, ['26.63GB', '0B', '385.8MB'])).toBeCloseTo(57.6 - 26.63 - 0.3858, 6)
  expect(freeGB(64e9, ['26.63GB', 'n/a'])).toBe(null)
})

dtest('a run that prints a disk-full message is error run only when the disk is low (needs BENCH_EXT_DOCKER=1)', async () => {
  const low = setup({ use: diskRecipe })
  const r1 = await run(low, ['check', 's1', '1'], { disk: [40, 5] }) // roomy at the pre-check, low once the run has failed
  expect(r1.stdout).toBe(`${low.slug(1)} error run\n`)
  expect(readFileSync(join(low.ext, 'tasks', low.slug(1), 'check.err'), 'utf8')).toBe('run: no space left on device\n')
  const roomy = setup({ use: diskRecipe })
  const r2 = await run(roomy, ['check', 's1', '1'], { disk: 40, reply: ['nope'] }) // the feedback round's reply is no recipe
  expect(r2.stdout).toBe(`${roomy.slug(1)} out PR tests do not pass at end\n`) // judged by its run: the repo's own output
  expect(readFileSync(join(roomy.ext, 'recipes', roomy.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${roomy.slug(1)}\tfeedback bad reply\n`)
}, 300000)

test('a test file path reaches the script as one intact argument, whatever it holds', () => {
  const paths = ['tests/a b.rs', 'tests/[id]/x.ts', 'tests/@scope/$x.rs', "tests/it's (1).rs", 'tests/"q".rs', 'tests/-n', 'tests/a\nb.rs']
  const p = Bun.spawnSync(['sh', '-c', `for a in ${paths.map(word).join(' ')}; do printf '%s\\0' "$a"; done`])
  expect(p.stdout.toString().split('\0').slice(0, -1)).toEqual(paths)
})

test('the feedback round is due only when all three runs gave no case and exited non-zero', () => {
  const r = (exitCode, cases) => ({ label: 'x', timedOut: false, exitCode, cases })
  expect(needsFeedback([r(2, 0), r(1, 0), r(94, 0)])).toBe(true)
  expect(needsFeedback([r(2, 0), r(0, 0), r(1, 0)])).toBe(false) // one run exited 0
  expect(needsFeedback([r(1, 6), r(1, 0), r(1, 0)])).toBe(false) // the base ran cases
  expect(needsFeedback([r(1, 0), r(1, 0)])).toBe(false)
})

dtest('three runs with no case and an error get one feedback round, told only the fixed sentence (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = setup({ use: usageRecipe })
  const r = await run(s, ['check', 's1', '1'], { reply: [JSON.stringify(recipe)] })
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=3\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tfeedback pass\n`)
  expect(readFileSync(join(s.ext, 'recipes', s.key, 'rounds', '1.prompt.md'), 'utf8')).toBe(`RECIPE BRIEF\n\n${FEEDBACK}\n`)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'meta.json')).runs.map((x) => [x.label, x.exitCode, x.cases]))
    .toEqual([['probe-reuse-1', 0, 3], ['base-1', 2, 0], ['end-1-1', 2, 0], ['end-1-2', 2, 0], ['probe-1', 0, 3], ['base-1f', 0, 4], ['end-1f-1', 0, 4], ['end-1f-2', 0, 4]])
}, 300000)

test('docker system df sizes parse in decimal units', () => {
  expect(['26.63GB', '32.35MB', '385.8MB', '0B', '1.5kB', '2TB'].map(parseSize)).toEqual([26.63e9, 32.35e6, 385.8e6, 0, 1500, 2e12])
  expect(parseSize('n/a')).toBeNaN()
})

test('walk stops before a check when Docker\'s disk is low, and goes on (saying so once) when it cannot tell', async () => {
  const s = setup()
  const low = await run(s, ['walk', 's1'], { disk: 10.04 })
  expect(low).toMatchObject({ code: 3, stdout: 's1 stopped: docker disk low (10.0 GB free)\n' })
  expect(existsSync(join(s.ext, 'walk.tsv'))).toBe(false)
  const unknown = await run(s, ['walk', 's1'], { disk: null, env: { DOCKER_HOST: `unix:///nonexistent-${rand()}.sock` } })
  expect(unknown).toMatchObject({ code: 4, stdout: `${s.slug(1)} error build\n${s.slug(1)} error build\ns1 tier 1: accepted 0, checked 2, list end no, stopped on 2 errors in a row\n` })
  expect(unknown.stderr.split('\n').filter((l) => l.includes('docker disk')).length).toBe(1)
}, 60000)

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

// step 5: task files and the serve check. A live sample.tsv names the fixture's PR 1 as s1-01; the bare clone is the
// fixture's, as check leaves it
const SAMPLE_HEAD = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup'
const sha256 = (s) => new Bun.CryptoHasher('sha256').update(s).digest('hex')
const RECIPE_SHA = sha256(JSON.stringify(recipe))
function step5({ serveRequired = ['s1'] } = {}) {
  const s = setup()
  Bun.spawnSync(['git', 'clone', '-q', '--bare', fx, join(s.ext, 'repos', s.key)])
  writeFileSync(join(s.ext, 'sample.tsv'), [SAMPLE_HEAD, `s1-01\ts1\t1\t1\t${s.owner}/app#1\tu\t1\t11\t${c0}\t${c1}\tsingle\t1\tnone\t${platform}\tyes`, ''].join('\n'))
  writeFileSync(join(s.ext, 'walk.tsv'), `stack\ttier\trank\tid\tresult\ns1\t1\t1\t${s.owner}/app#1\tok\n`)
  mkdirSync(join(s.ext, 'tasks', s.slug(1)), { recursive: true })
  writeFileSync(join(s.ext, 'tasks', s.slug(1), 'meta.json'), JSON.stringify({ id: `${s.owner}/app#1`, slug: s.slug(1), base: c0, end: c1, recipeSha: RECIPE_SHA }))
  writeFileSync(join(s.ext, 'tasks', s.slug(1), 'issue.json'), JSON.stringify({ title: 'Make the zebra stripe', body: 'It should stripe.\n```\nzebra()\n```\nSee src/zebra.py too.', asOf: 'x', editHistory: 'none' }))
  writeFileSync(join(s.ext, 'step5.json'), JSON.stringify({ serveRequired }))
  writeFileSync(join(s.ext, 'briefs/serve.md'), 'SERVE BRIEF\n')
  return s
}
const withRecipe = (s) => writeFileSync(join(s.ext, 'tasks', s.slug(1), 'task-recipe.json'), JSON.stringify(recipe, null, 2) + '\n')
const SERVE_BRIEF_SHA = sha256('SERVE BRIEF\n')
// busybox httpd (the layer installs it: the build has network) serves the files of /work; start also lists the
// container's network interfaces into the readable base log
const serveRecipe = { layer: ['RUN apk add --no-cache busybox-extras'], start: 'ls /sys/class/net; busybox-extras httpd -p 8080 -h /work', ready: 'wget -q -O /dev/null http://127.0.0.1:8080/tests/zebra_ok.sh', notes: 'http://127.0.0.1:8080/' }

test('task-env refuses a reply whose hash differs', async () => {
  const s = step5(), reply = join(s.data, 'reply.md'), text = '```json\n' + JSON.stringify(recipe) + '\n```\n'
  writeFileSync(reply, text)
  const bad = await run(s, ['task-env', 's1-01', '--reply', reply, '--sha', 'f'.repeat(64)])
  expect(bad).toMatchObject({ code: 2, stdout: '' })
  expect(bad.stderr).toContain('SHA-256')
  expect(existsSync(join(s.ext, 'tasks', s.slug(1), 'task-recipe.json'))).toBe(false)
  const good = await run(s, ['task-env', 's1-01', '--reply', reply, '--sha', sha256(text)])
  expect(good.code).toBe(0)
  expect(json(join(s.ext, 'tasks', s.slug(1), 'task-recipe.json'))).toEqual(recipe)
  expect(json(join(s.data, 'env', 's1-01.json'))).toEqual({ name: 's1-01', repo: join(s.ext, 'repos', s.key), db: null, port: 49152, start: null, ready: null, setup: [], teardown: [],
    oracle: `cd '${join(import.meta.dir, '../bench')}' && bun --no-env-file '${join(import.meta.dir, '../bench/ext.mjs')}' oracle-run s1-01`, junit: '.bench-junit.xml', timeoutSec: 7800 })
}, 60000)

test('task-env --from-meta finds the reply by recipeSha', async () => {
  const s = step5(), rounds = join(s.ext, 'recipes', s.key, 'rounds')
  mkdirSync(rounds, { recursive: true })
  writeFileSync(join(rounds, '1.reply.md'), JSON.stringify(badRecipe))
  writeFileSync(join(rounds, '2.reply.md'), 'not a recipe')
  writeFileSync(join(rounds, '3.reply.md'), 'Here:\n' + JSON.stringify(recipe))
  const r = await run(s, ['task-env', 's1-01', '--from-meta'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(json(join(s.ext, 'tasks', s.slug(1), 'task-recipe.json'))).toEqual(recipe)
  rmSync(join(rounds, '3.reply.md'))
  const none = await run(s, ['task-env', 's1-01', '--from-meta'])
  expect(none.code).toBe(2)
  expect(none.stderr).toContain('recipeSha')
}, 60000)

test('task-env writes input.md verbatim and counts input-check hits', async () => {
  const s = step5(), reply = join(s.data, 'reply.md')
  writeFileSync(reply, JSON.stringify(recipe))
  const r = await run(s, ['task-env', 's1-01', '--reply', reply, '--sha', sha256(JSON.stringify(recipe))])
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 input-check hits=4\n', stderr: '' }) // two fence lines, a source path and a file name
  expect(readFileSync(join(s.data, 's1-01', 'input.md'), 'utf8')).toBe('# Make the zebra stripe\n\nIt should stripe.\n```\nzebra()\n```\nSee src/zebra.py too.')
}, 60000)

test('serve gives a stack that needs no serve check the empty serve recipe, with no round', async () => {
  const s = step5({ serveRequired: [] })
  const r = await run(s, ['serve', 's1-01'])
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 servable rounds=0\n' })
  expect(json(join(s.ext, 'serve', s.key, 'serve.json'))).toEqual({ layer: [], start: '', ready: 'true', notes: '', briefSha: null })
  expect(existsSync(join(s.ext, 'serve', s.key, 'rounds.tsv'))).toBe(false)
  expect(existsSync(join(s.data, 's1-01', 'docker.json'))).toBe(false)
}, 60000)

test('serve prunes the BuildKit cache when Docker\'s disk is low, and stops when it stays low', async () => {
  const s = step5()
  withRecipe(s)
  const r = await run(s, ['serve', 's1-01'], { disk: 5, more: { prune: true } })
  expect(r).toMatchObject({ code: 3, stdout: 's1-01 stopped: docker disk low (5.0 GB free)\n' })
  expect(r.stderr).toContain('bench-test: builder prune')
  expect(existsSync(join(s.ext, 'serve', s.key, 'rounds.tsv'))).toBe(false)
}, 60000)

// one served task, shared by the tests that read it; serve removes what it built, so they read the records and the logs
let servedOnce
const served = () => (servedOnce ??= (async () => {
  if (!exists('container', 'bench-ext-other')) expect(docker('create', '--name', 'bench-ext-other', 'alpine:3.22', 'true').exitCode).toBe(0)
  const s = step5()
  withRecipe(s)
  return { s, r: await run(s, ['serve', 's1-01'], { more: { serveReply: ['```json\n' + JSON.stringify(serveRecipe) + '\n```'], readySec: 60 } }) }
})())

dtest('serve passes when ready answers at base and end (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s, r } = await served()
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 servable rounds=1\n', stderr: '' })
  expect(json(join(s.ext, 'serve', s.key, 'serve.json'))).toEqual({ ...serveRecipe, briefSha: SERVE_BRIEF_SHA })
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tpass\n`)
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds', '1.prompt.md'), 'utf8')).toBe('SERVE BRIEF\n')
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds', '1.base.log'), 'utf8')).toContain('bench: ready')
  expect(readFileSync(join(s.ext, 'sealed', s.slug(1), 'logs', 'serve-1.end.log'), 'utf8')).toContain('bench: ready')
  // every name is recorded at creation, with the image ids, and removed by that name once the check ends (digests kept)
  const tag = (c) => `bench-ext/${s.slug(1)}:${c.slice(0, 7)}-serve`, box = (c) => `bench-ext-${s.slug(1)}-serve-${c.slice(0, 7)}-1`
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.images.map((i) => i.name)).toEqual([tag(c0), tag(c1)])
  expect(d.containers).toEqual([box(c0), box(c1)])
  for (const i of d.images) expect(d.digests[i.name]).toBe(i.id)
  for (const i of d.images) expect(i.id).toMatch(/^sha256:[0-9a-f]{64}$/)
  expect(readFileSync(join(s.ext, 'removed.txt'), 'utf8')).toBe([box(c0), box(c1), tag(c0), tag(c1), ''].join('\n'))
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
  expect(exists('container', 'bench-ext-other')).toBe(true)
  // a second serve reuses the saved serve recipe with no round, and names its containers anew
  const again = await run(s, ['serve', 's1-01'], { more: { readySec: 60 } })
  expect(again).toMatchObject({ code: 0, stdout: 's1-01 servable rounds=1\n' })
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tpass\n`)
  const d2 = json(join(s.data, 's1-01', 'docker.json'))
  expect(d2.containers).toEqual([box(c0), box(c1), box(c0).replace(/-1$/, '-2'), box(c1).replace(/-1$/, '-2')])
  for (const c of d2.containers) expect(exists('container', c)).toBe(false)
  for (const i of d2.images) expect(exists('image', i.name)).toBe(false)
}, 600000)

dtest('serve containers use no network (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s } = await served()
  const lines = readFileSync(join(s.ext, 'serve', s.key, 'rounds', '1.base.log'), 'utf8').split('\n')
  expect(lines).toContain('lo')
  expect(lines.filter((l) => /^(eth|en|wl)/.test(l))).toEqual([])
}, 600000)

test('serve spends a round on a reply with an empty start, and tells the next round why', async () => {
  const s = step5()
  withRecipe(s)
  const empty = JSON.stringify({ layer: [], start: ' ', ready: 'true', notes: '' })
  const r = await run(s, ['serve', 's1-01'], { disk: 40, more: { serveReply: empty } })
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 dropped not servable\n', stderr: '' })
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds.tsv'), 'utf8')).toBe([1, 2, 3].map((k) => `${k}\t${s.slug(1)}\tbad reply\n`).join(''))
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds', '2.prompt.md'), 'utf8')).toBe('SERVE BRIEF\n\nThe previous reply was not a valid recipe: start is empty: it must start the app\n')
  expect(existsSync(join(s.ext, 'serve', s.key, 'serve.json'))).toBe(false)
}, 60000)

dtest('serve fails a ready that answers only after the time limit (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = step5()
  withRecipe(s)
  // up at 10 s and each ready takes 3 s: counting 3 passes of 2 s would still pass it at 13 s; the 6 s clock does not
  const late = { ...serveRecipe, start: '(sleep 10; touch /tmp/up) &', ready: 'sleep 3; test -e /tmp/up' }
  const r = await run(s, ['serve', 's1-01'], { more: { serveReply: JSON.stringify(late), readySec: 6 } })
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 dropped not servable\n' })
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds', '1.base.log'), 'utf8')).toContain('bench: ready did not exit 0 within 6 s')
  for (const c of json(join(s.data, 's1-01', 'docker.json')).containers) expect(exists('container', c)).toBe(false)
}, 600000)

dtest('serve drops a task whose ready never answers, appending dropped to walk.tsv (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = step5()
  withRecipe(s)
  const never = { ...serveRecipe, ready: 'echo still waiting; false' }
  const r = await run(s, ['serve', 's1-01'], { more: { serveReply: JSON.stringify(never), readySec: 4 } })
  expect(r).toMatchObject({ code: 0, stdout: 's1-01 dropped not servable\n' })
  expect(readFileSync(join(s.ext, 'serve', s.key, 'rounds.tsv'), 'utf8')).toBe([1, 2, 3].map((k) => `${k}\t${s.slug(1)}\tserve failed\n`).join(''))
  expect(walkRows(s).at(-1)).toEqual(['s1', '1', '1', `${s.owner}/app#1`, 'dropped'])
  expect(existsSync(join(s.ext, 'serve', s.key, 'serve.json'))).toBe(false)
  // a retry is told the previous serve recipe and the end of its base log
  const p2 = readFileSync(join(s.ext, 'serve', s.key, 'rounds', '2.prompt.md'), 'utf8')
  expect(p2).toStartWith('SERVE BRIEF\n')
  expect(p2).toContain('The last 200 lines of its serve log')
  expect(p2).toContain('still waiting')
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.containers.length).toBe(3) // the base only: no round served there
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
}, 600000)

test('sample keeps ids and numbers a replacement after the highest', async () => {
  const s = setup()
  // app#1 stays sampled as s1-01; s1-02 (another PR) was dropped and the folder s1-03 retires that id too
  writeFileSync(join(s.ext, 'walk.tsv'), `stack\ttier\trank\tid\tresult\ns1\t1\t1\t${s.owner}/app#1\tok\ns1\t1\t2\t${s.owner}/app#2\tok\n`)
  writeFileSync(join(s.ext, 'sample.tsv'), [SAMPLE_HEAD, `s1-01\ts1\t1\t1\t${s.owner}/app#1`, `s1-02\ts1\t1\t9\t${s.owner}/app#9`, ''].join('\n'))
  mkdirSync(join(s.data, 's1-03'))
  for (const n of [1, 2]) {
    mkdirSync(join(s.ext, 'tasks', s.slug(n)), { recursive: true })
    writeFileSync(join(s.ext, 'tasks', s.slug(n), 'meta.json'), JSON.stringify({ url: `u${n}`, pr: n, issue: 10 + n, base: `b${n}`, end: `e${n}`, method: 'squash', f2p: n, editHistory: 'none', platform: 'linux/arm64' }))
  }
  expect((await run(s, ['sample'])).stdout).toBe('sample.tsv: 2 rows\n')
  expect(readFileSync(join(s.ext, 'sample.tsv'), 'utf8').split('\n').map((l) => l.split('\t')[0])).toEqual(['task', 's1-01', 's1-04', ''])
}, 60000)

// step 5, oracle-run: grade runs it as the task's oracle command. The fixture: the served busybox app and an oracle of two
// sh checks writing JUnit, T1 passing at the base and the end, T2 at the end only (the end's file src/feature.txt)
const c17 = c1.slice(0, 7), c07 = c0.slice(0, 7)
const oracleRunner = join(tmp, 'oracle-runner.mjs') // oracle-run with injections (a short ready limit)
writeFileSync(oracleRunner, `import { main } from ${JSON.stringify(join(import.meta.dir, '../bench/ext.mjs'))}\nprocess.exit(await main(['oracle-run', process.argv[2]], JSON.parse(process.argv[3])))\n`)
const RUNNER = { layer: ['RUN mkdir -p /opt/oracle-tools'], run: 'sh /oracle/run.sh' }
function oracleTask({ inj, runner = RUNNER, serve = serveRecipe, rebuild = { lines: ['ls /sys/class/net'] } } = {}) {
  const s = step5()
  withRecipe(s)
  // the serve layer installs with network, which only S's build has: the product's rebuild lines need none
  if (rebuild) writeFileSync(join(s.ext, 'tasks', s.slug(1), 'rebuild.json'), JSON.stringify(rebuild))
  mkdirSync(join(s.ext, 'serve', s.key), { recursive: true })
  writeFileSync(join(s.ext, 'serve', s.key, 'serve.json'), JSON.stringify({ briefSha: SERVE_BRIEF_SHA, ...serve })) // serve may carry briefSha: null, the empty recipe)
  const oracle = join(s.data, 's1-01', 'oracle')
  mkdirSync(oracle, { recursive: true })
  writeFileSync(join(oracle, 'T1.sh'), 'wget -q -O /dev/null http://127.0.0.1:8080/tests/zebra_ok.sh\n')
  writeFileSync(join(oracle, 'T2.sh'), 'wget -q -O /dev/null http://127.0.0.1:8080/src/feature.txt\n')
  writeFileSync(join(oracle, 'run.sh'), ['{ echo "<testsuite>"', 'for n in 1 2; do',
    `  if sh /oracle/T$n.sh; then echo "<testcase classname=\\"fx\\" name=\\"${c17}-T$n serves\\"/>"; else echo "<testcase classname=\\"fx\\" name=\\"${c17}-T$n serves\\"><failure message=\\"not served\\"/></testcase>"; fi`,
    'done', 'echo "</testsuite>"; } > /out/junit.xml', ''].join('\n'))
  if (runner) writeFileSync(join(oracle, 'runner.json'), typeof runner === 'string' ? runner : JSON.stringify(runner))
  writeFileSync(join(oracle, 'manifest.json'), JSON.stringify([1, 2].map((n) => ({ id: `${c17}-T${n}`, fix_commit: c17, severity: 'high', interface: 'http' }))))
  mkdirSync(join(s.data, 'env'), { recursive: true })
  writeFileSync(join(s.data, 'env', 's1-01.json'), JSON.stringify({ name: 's1-01', repo: join(s.ext, 'repos', s.key), db: null, port: 49152, start: null, ready: null, setup: [], teardown: [],
    oracle: inj ? `bun ${oracleRunner} s1-01 '${JSON.stringify(inj)}'` : `bun ${join(import.meta.dir, '../bench/ext.mjs')} oracle-run s1-01`, junit: '.bench-junit.xml', timeoutSec: 7800 }))
  return s
}
async function grade(s, args) {
  const p = Bun.spawn(['bun', join(import.meta.dir, '../bench/grade.mjs'), join(s.data, 'env', 's1-01.json'), join(s.data, 's1-01', 'oracle'), ...args],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(s.data, 'machine.json') }, stdout: 'pipe', stderr: 'pipe' })
  return { stdout: await new Response(p.stdout).text(), stderr: await new Response(p.stderr).text(), code: await p.exited }
}
const box = (s, c, n = 1) => `bench-ext-${s.slug(1)}-grade-${c.slice(0, 7)}-${n}`
const app = (s, c, n = 1) => `bench-ext-${s.slug(1)}-app-${c.slice(0, 7)}-${n}`
const make = (s, c, n = 1) => `bench-ext-${s.slug(1)}-make-${c.slice(0, 7)}-${n}`
const O8 = (s, o = 'oracle') => oracleSha(oracleFiles(join(s.data, 's1-01', o))).slice(0, 8)
// ruling 4: S and R from the base, then the commit's product image
const tags = (s, c) => [`bench-ext/${s.slug(1)}:${c07}-serve`, `bench-ext/${s.slug(1)}:${c07}-runner-${O8(s)}`, `bench-ext/${s.slug(1)}:${c.slice(0, 7)}-product-${O8(s)}`]
const ready = (s, ...rows) => rows.map(([c, r]) => `${c}\t${O8(s)}\t${r}\n`).join('')

// one validation, shared by the tests that read it; oracle-run removes what it built, so they read the records and the logs
let validatedOnce
const validated = () => (validatedOnce ??= (async () => {
  if (!exists('container', 'bench-ext-other')) expect(docker('create', '--name', 'bench-ext-other', 'alpine:3.22', 'true').exitCode).toBe(0)
  const s = oracleTask()
  return { s, r: await grade(s, ['--validate', c1, '--bad', c0, '--sealed']) }
})())

dtest('grade validates a fixture check valid with end against base (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s, r } = await validated()
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toContain(`validation-${c17}: ${c17}-T1=weak ${c17}-T2=valid\n`)
  const v = json(join(s.data, 's1-01', `validation-${c17}.json`))
  expect(v.checks.map((c) => [c.id, c.ref, c.bad, c.verdict])).toEqual([[`${c17}-T1`, 'pass', ['pass'], 'weak'], [`${c17}-T2`, 'pass', ['fail'], 'valid']])
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'ready'], [c07, 'ready']))
  // S is the base's, so its build log is readable at every commit; the runner layer, the make container and the grade run are sealed
  expect(readdirSync(join(s.data, 's1-01', 'build')).filter((f) => f.endsWith('.build.log')).sort()).toEqual([`${c07}-1.serve.build.log`, `${c07}-2.serve.build.log`])
  const sealed = join(s.ext, 'sealed', s.slug(1), 'logs')
  for (const f of [`grade-${c17}-1.runner.build.log`, `grade-${c17}-1.make.log`, `grade-${c07}-2.runner.build.log`, `grade-${c07}-2.make.log`, `grade-${c17}-1.log`]) expect(existsSync(join(sealed, f))).toBe(true)
  expect(readdirSync(sealed).filter((f) => f.includes('serve'))).toEqual([])
  // the container's output reached oracle-run's stderr, which the sealed grade logged
  expect(readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8')).toContain('bench: ready')
}, 900000)

dtest('the grade container uses no network and is recorded in docker.json (needs BENCH_EXT_DOCKER=1)', async () => {
  const { s } = await validated()
  // start lists the app container's interfaces (its log appended to the grade log), the rebuild line the make container's (into the sealed make log)
  for (const f of [join(s.data, 's1-01', 'logs', `${c07}-1.log`), join(s.ext, 'sealed', s.slug(1), 'logs', `grade-${c07}-2.make.log`)]) {
    const lines = readFileSync(f, 'utf8').split('\n')
    expect(lines).toContain('lo')
    expect(lines.filter((l) => /^(eth|en|wl)/.test(l))).toEqual([])
  }
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.containers).toEqual([make(s, c1), app(s, c1), box(s, c1), make(s, c0, 2), app(s, c0, 2), box(s, c0, 2)])
  expect(d.images.map((i) => i.name)).toEqual([...tags(s, c1), ...tags(s, c0)])
  for (const i of d.images.slice(3)) expect(d.digests[i.name]).toBe(i.id) // S and R again, from the cache
  expect(d.digests[tags(s, c1)[2]]).toBe(d.images[2].id)
  for (const i of d.images) expect(i.id).toMatch(/^sha256:[0-9a-f]{64}$/)
  // the make container goes as soon as its image is committed; the rest by exact name as each run ends, digests kept
  expect(readFileSync(join(s.ext, 'removed.txt'), 'utf8')).toBe([app(s, c1), box(s, c1), ...tags(s, c1), app(s, c0, 2), box(s, c0, 2), ...tags(s, c0), ''].join('\n'))
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
  expect(exists('container', 'bench-ext-other')).toBe(true)
}, 900000)

dtest('a run that never gets ready gives every check error and the validation is still written (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask({ inj: { readySec: 4 }, serve: { ...serveRecipe, ready: 'echo still waiting; false' } })
  const r = await grade(s, ['--validate', c1, '--bad', c0, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  const v = json(join(s.data, 's1-01', `validation-${c17}.json`))
  expect(v.checks.map((c) => [c.ref, c.bad])).toEqual([['error', ['error']], ['error', ['error']]])
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'not ready'], [c07, 'not ready']))
  expect(readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8')).toContain('bench: ready did not exit 0 within 4 s')
  for (const c of json(join(s.data, 's1-01', 'docker.json')).containers) expect(exists('container', c)).toBe(false)
  // grade alone reads the empty JUnit as broken; oracle validate reuses both runs and reads them as not judged
  expect(v.checks.map((c) => c.verdict)).toEqual(['broken', 'broken'])
  writeFileSync(join(s.data, 'tasks.json'), '{}')
  const p = Bun.spawn(['bun', join(import.meta.dir, '../bench/oracle.mjs'), 'validate', 's1-01'], { env: { ...process.env, HSTACK_BENCH_MACHINE: join(s.data, 'machine.json') }, stdout: 'pipe', stderr: 'pipe' })
  const o = { stdout: await new Response(p.stdout).text(), stderr: await new Response(p.stderr).text(), code: await p.exited }
  expect(o).toMatchObject({ code: 0, stderr: '' })
  for (const c of [c17, c07]) expect(o.stdout).toMatch(new RegExp(`^${c} junit=ok .* reused$`, 'm')) // no new container
  expect(o.stdout).toContain('s1-01 not judged: 2 checks error\n')
  const w = json(join(s.data, 's1-01', `validation-${c17}.json`))
  expect(w.checks.map((c) => [c.ref, c.bad, c.verdict, c.stage])).toEqual([['error', ['error'], 'error', `not ready at ${c17}`], ['error', ['error'], 'error', `not ready at ${c17}`]])
  for (const c of [c17, c07]) expect(existsSync(join(s.data, 's1-01', 'grades', `${c}.json`))).toBe(false) // the next validate runs them again
}, 900000)

dtest('removal deletes only names docker.json records (needs BENCH_EXT_DOCKER=1)', async () => {
  if (!exists('container', 'bench-ext-other')) expect(docker('create', '--name', 'bench-ext-other', 'alpine:3.22', 'true').exitCode).toBe(0)
  const s = step5(), mine = box(s, c1), stray = box(s, c1, 2) // a name of the task docker.json does not record
  try {
    for (const c of [mine, stray]) expect(docker('create', '--name', c, 'alpine:3.22', 'true').exitCode).toBe(0)
    mkdirSync(join(s.data, 's1-01'), { recursive: true })
    writeFileSync(join(s.data, 's1-01', 'docker.json'), JSON.stringify({ images: [], containers: [mine, 'bench-ext-other'] }))
    const r = await run(s, ['remove', 's1-01'])
    expect(r).toMatchObject({ code: 0, stdout: 's1-01 removed 1\n', stderr: '' })
    expect(exists('container', mine)).toBe(false)
    expect(exists('container', stray)).toBe(true)
    expect(exists('container', 'bench-ext-other')).toBe(true)
  } finally { for (const c of [mine, stray]) if (exists('container', c)) docker('rm', c) } // this test created both
}, 600000)

dtest('a run past the container limit ends inside the container: timeout, no JUnit, non-zero (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask({ inj: { timeoutSec: 8 }, runner: { layer: [], run: 'sleep 600' } })
  const started = Date.now(), r = await grade(s, ['--at', c1, '--sealed'])
  expect(Date.now() - started).toBeLessThan(300000) // the 600 s run did not finish
  expect(r).toMatchObject({ code: 1, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=missing `)
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'timeout']))
  expect(readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8')).toContain('bench: not done in 8 s, killed')
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.containers).toEqual([make(s, c1), app(s, c1), box(s, c1)])
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
}, 900000)

dtest('a product\'s symlink named as a bench file is not written through (needs BENCH_EXT_DOCKER=1)', async () => {
  const dir = join(tmp, `ctx-${rand()}`), kept = join(tmp, `kept-${rand()}`), absent = join(tmp, `absent-${rand()}`)
  mkdirSync(dir)
  writeFileSync(kept, 'kept\n')
  symlinkSync(kept, join(dir, '.bench-test.sh'))
  symlinkSync(kept, join(dir, '.bench.Dockerfile'))
  symlinkSync(absent, join(dir, '.bench.Dockerfile.dockerignore'))
  const id = await buildImage({ scratch: (what, commit, fn) => fn(dir), dockerfile: 'FROM scratch\nRUN false\n', test: 'true\n', platform, commit: null, tag: `bench-ext/link-${rand()}:x`, log: join(tmp, `link-${rand()}.log`), diskFree: async () => 100 })
  expect(id).toBe(false) // a build that cannot pass: nothing tagged
  expect(readFileSync(kept, 'utf8')).toBe('kept\n')
  expect(existsSync(absent)).toBe(false)
  for (const f of ['.bench-test.sh', '.bench.Dockerfile', '.bench.Dockerfile.dockerignore']) expect(lstatSync(join(dir, f)).isFile()).toBe(true)
}, 600000)

dtest('a junit.xml that is a link gives no JUnit and is not followed on the host (needs BENCH_EXT_DOCKER=1)', async () => {
  const secret = join(tmp, `secret-${rand()}.xml`)
  writeFileSync(secret, '<testsuite><testcase classname="x" name="stolen"/></testsuite>\n')
  const s = oracleTask({ runner: { layer: [], run: `ln -sf ${secret} /out/junit.xml` } })
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 1, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=missing `)
}, 900000)

dtest('an /out that is a link gives no JUnit and no file behind it is read (needs BENCH_EXT_DOCKER=1)', async () => {
  const planted = join(tmp, `planted-${rand()}`)
  mkdirSync(planted)
  for (const f of ['.bench-ready', '.bench-timeout']) writeFileSync(join(planted, f), '')
  writeFileSync(join(planted, 'junit.xml'), '<testsuite><testcase classname="x" name="stolen"/></testsuite>\n')
  const s = oracleTask({ runner: { layer: [], run: `rm -rf /out; ln -s ${planted} /out` } })
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 1, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=missing `)
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'not ready']))
}, 900000)

test('oracle-run refuses an absent or malformed runner.json before any Docker call', async () => {
  for (const runner of [null, '{"layer": "RUN true", "run": "sh x"}', JSON.stringify({ layer: ['RUN --network=host true'], run: 'sh x' }), JSON.stringify({ layer: [], run: ' ' })]) {
    const s = oracleTask({ runner })
    const r = await run(s, ['oracle-run', 's1-01'], { env: { BENCH_DIR: fx, BENCH_ORACLE: join(s.data, 's1-01', 'oracle'), BENCH_JUNIT: join(s.data, 'junit.xml') }, disk: 40 })
    expect(r.code).not.toBe(0)
    expect(r.stderr).toContain('runner.json')
    expect(existsSync(join(s.data, 's1-01', 'docker.json'))).toBe(false)
    expect(existsSync(join(s.data, 'junit.xml'))).toBe(false)
  }
}, 60000)

test('the trusted path refuses a commit that is no base, end or seeded bug', async () => {
  const s = oracleTask() // the fixture's HEAD is c2, after the task's end
  const r = await run(s, ['oracle-run', 's1-01'], { env: { BENCH_DIR: fx, BENCH_ORACLE: join(s.data, 's1-01', 'oracle'), BENCH_JUNIT: join(s.data, 'junit.xml'), BENCH_TRUSTED: '1' }, disk: 40 })
  expect(r).toMatchObject({ code: 2, stdout: '', stderr: `oracle-run --trusted: ${c2.slice(0, 7)} is no task's base or end and no seeded bug\n` })
  expect(existsSync(join(s.data, 's1-01', 'docker.json'))).toBe(false)
}, 60000)

dtest('the trusted path builds the commit as step 10 did (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask({ rebuild: null })
  const r = await grade(s, ['--at', c1, '--sealed', '--trusted'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=ok pass=2 `)
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect([d.images.map((i) => i.name), d.containers]).toEqual([[`bench-ext/${s.slug(1)}:${c17}-serve`, `bench-ext/${s.slug(1)}:${c17}-grade`], [box(s, c1)]])
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'ready']))
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
}, 900000)

// step 11 ruling 5 (M3): a served task is graded in two containers, the app's (P, from the product image, no network) and the
// oracle's (O, from R, in P's network namespace); a task with no serve start, or with grade-mode shared, in one from the product image
test('gradeMode is split for a serve start, shared for none or a grade-mode file reading shared', () => {
  const s = oracleTask(), t = { slug: s.slug(1), key: s.key }, f = join(s.ext, 'tasks', s.slug(1), 'grade-mode')
  expect(gradeMode(s.ext, t)).toBe('split')
  writeFileSync(f, ' shared\n')
  expect(gradeMode(s.ext, t)).toBe('shared')
  writeFileSync(f, 'split\n')
  expect(gradeMode(s.ext, t)).toBe('split')
  rmSync(f)
  writeFileSync(join(s.ext, 'serve', s.key, 'serve.json'), JSON.stringify({ ...SERVE_EMPTY, briefSha: null }))
  expect(gradeMode(s.ext, t)).toBe('shared')
})
const appPart = (log) => log.split(/^bench: the app's output.*$/m) // [O's part, P's part]
const busybox = (start) => ({ ...serveRecipe, start: `${start}; busybox-extras httpd -p 8080 -h /work` })

dtest('the oracle runs beside the app in split mode (needs BENCH_EXT_DOCKER=1)', async () => {
  // only the app (P) holds the end's file src/feature.txt: R, which O runs, is the base's; T2 fetches it from P over the loopback
  const s = oracleTask({ runner: { layer: [], run: 'sh /oracle/run.sh; [ -e /work/src/feature.txt ] && echo "fx: O holds the product" || echo "fx: O holds the base"' } })
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=ok pass=2 fail=0 `)
  const [graded, appLog] = appPart(readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8'))
  expect(graded).toContain('fx: O holds the base\n')
  expect(appLog.split('\n')).toContain('lo') // P's own interfaces: loopback only
  expect(appLog.split('\n').filter((l) => /^(eth|en|wl)/.test(l))).toEqual([])
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'ready']))
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.containers).toEqual([make(s, c1), app(s, c1), box(s, c1)])
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
}, 900000)

dtest('a product that writes a JUnit in its own container does not change the grade (needs BENCH_EXT_DOCKER=1)', async () => {
  // at the base T2 fails; the product's start plants a JUnit (and the ready marker) with every case passing in its own /out
  const planted = `<testsuite><testcase classname="fx" name="${c17}-T1 serves"/><testcase classname="fx" name="${c17}-T2 serves"/></testsuite>`
  const s = oracleTask({ serve: busybox(`mkdir -p /out; echo '${planted}' > /out/junit.xml; touch /out/.bench-ready`) })
  const r = await grade(s, ['--at', c0, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c07} junit=ok pass=1 fail=1 `)
  expect(json(join(s.data, 's1-01', 'docker.json')).containers).toEqual([make(s, c0), app(s, c0), box(s, c0)])
}, 900000)

dtest('the product cannot read the oracle (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask({ serve: busybox('ls /oracle; ls -a /') })
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=ok pass=2 fail=0 `)
  const [graded, appLog] = appPart(readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8'))
  expect(appLog).toMatch(/^ls: \/oracle: No such file or directory$/m) // in the app's log only
  expect(appLog.split('\n')).not.toContain('oracle')
  expect(appLog.split('\n')).toContain('work')
  expect(graded).not.toContain('/oracle')
}, 900000)

dtest('a task with no serve start is graded in one container (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask({ serve: { ...SERVE_EMPTY, briefSha: null } })
  // with no app the checks read the files: the end's src/feature.txt is in the one container only if it is the product's
  writeFileSync(join(s.data, 's1-01', 'oracle', 'T1.sh'), 'test -e /work/tests/zebra_ok.sh\n')
  writeFileSync(join(s.data, 's1-01', 'oracle', 'T2.sh'), 'test -e /work/src/feature.txt\n')
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=ok pass=2 fail=0 `)
  expect(json(join(s.data, 's1-01', 'docker.json')).containers).toEqual([make(s, c1), box(s, c1)])
  expect(readFileSync(join(s.data, 's1-01', 'build', 'readiness.tsv'), 'utf8')).toBe(ready(s, [c17, 'ready']))
}, 900000)

dtest('grade-mode shared forces one container (needs BENCH_EXT_DOCKER=1)', async () => {
  const s = oracleTask()
  writeFileSync(join(s.ext, 'tasks', s.slug(1), 'grade-mode'), 'shared\n')
  const r = await grade(s, ['--at', c1, '--sealed'])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toStartWith(`${c17} junit=ok pass=2 fail=0 `)
  expect(json(join(s.data, 's1-01', 'docker.json')).containers).toEqual([make(s, c1), box(s, c1)])
  const log = readFileSync(join(s.data, 's1-01', 'logs', `${c17}-1.log`), 'utf8')
  expect(log).not.toMatch(/^bench: the app's output/m)
  expect(log.split('\n')).toContain('lo') // start ran in the grade container
}, 900000)

// productImage alone, on a fixture image whose /work holds the base's tracked files and an untracked build output
const ov = join(tmp, 'overlay')
mkdirSync(join(ov, 'dir with space'), { recursive: true })
const ovGit = (...a) => Bun.spawnSync(['git', '-C', ov, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
ovGit('init', '-q')
writeFileSync(join(ov, 'a'), 'old\n'); writeFileSync(join(ov, 'b'), 'b\n'); writeFileSync(join(ov, 'dir with space', 'c d'), 'c\n')
ovGit('add', '.'); ovGit('commit', '-qm', 'base')
const ovBase = ovGit('rev-parse', 'HEAD')
writeFileSync(join(ov, 'a'), 'new\n'); writeFileSync(join(ov, 'e'), 'e\n'); rmSync(join(ov, 'b')); rmSync(join(ov, 'dir with space'), { recursive: true })
ovGit('add', '-A'); ovGit('commit', '-qm', 'product')
const ovProduct = ovGit('rev-parse', 'HEAD')
const overlayImage = async ({ repo, base, product, dockerfile }) => {
  const slug = `fx${rand()}__ov__1`, data = join(tmp, slug), log = (n) => join(data, `make-${n}.log`)
  for (const d of ['ov', 'ext']) mkdirSync(join(data, d), { recursive: true }) // ext: removed.txt
  const record = (f) => recordDocker(join(data, 'ov', 'docker.json'), f)
  let seq = 0
  const scratch = (what, commit, fn) => withExport({ name: slug, repo }, commit, `${what}-${process.pid}-${seq++}`, fn)
  const baseImage = `bench-ext/${slug}:base`
  record((d) => d.images.push({ name: baseImage, id: null }))
  const id = await buildImage({ scratch, dockerfile, test: 'true\n', platform, commit: base, tag: baseImage, log: join(data, 'base.log'), diskFree: async () => 100 })
  expect(id).toMatch(/^sha256:/)
  const make = (n, lines, osha8) => productImage({ t: { slug, base }, commit: product, baseImage, network: 'none', lines, repo, osha8, n, platform, record, scratch, log: log(n), diskFree: async () => 100 })
  return { slug, data, record, make, log }
}
let ovOnce
const overlayFixture = () => (ovOnce ??= (ovFixtures.push(overlayImage({ repo: ov, base: ovBase, product: ovProduct,
  dockerfile: 'FROM alpine:3.22\nCOPY . /work\nRUN mkdir -p /work/node_modules && echo kept > /work/node_modules/x\n' })), ovFixtures.at(-1)))

dtest('the overlay removes deleted base files and keeps build outputs (needs BENCH_EXT_DOCKER=1)', async () => {
  const { slug, record, make } = await overlayFixture(), look = `bench-ext-${slug}-look-1`
  const id = await make(1, ['cat a > a.copy'], 'abcdef12') // the rebuild lines run in /work, after the overlay
  expect(id).toMatch(/^sha256:[0-9a-f]{64}$/)
  expect(exists('container', `bench-ext-${slug}-make-${ovProduct.slice(0, 7)}-1`)).toBe(false) // committed, then removed
  record((d) => d.containers.push(look))
  expect(docker('create', '--name', look, '--network', 'none', `bench-ext/${slug}:${ovProduct.slice(0, 7)}-product-abcdef12`, 'sh', '-c',
    'cd /work && find . -type f | sort && cat a && ls -A /tmp').exitCode).toBe(0)
  const out = docker('start', '-a', look).stdout.toString().split('\n')
  expect(out).toEqual(['./.bench-test.sh', './.bench.Dockerfile', './.bench.Dockerfile.dockerignore', './a', './a.copy', './e', './node_modules/x', 'new', ''])
}, 600000)

dtest('the product is made with no network (needs BENCH_EXT_DOCKER=1)', async () => {
  const { slug, make, log } = await overlayFixture()
  expect(await make(2, ['ls /sys/class/net', 'nc -zw3 1.1.1.1 443', 'touch /work/reached'], '00000000')).toBe(false)
  expect(exists('image', `bench-ext/${slug}:${ovProduct.slice(0, 7)}-product-00000000`)).toBe(false) // no image: noresult
  expect(exists('container', `bench-ext-${slug}-make-${ovProduct.slice(0, 7)}-2`)).toBe(false)
  const lines = readFileSync(log(2), 'utf8').split('\n')
  expect(lines).toContain('lo')
  expect(lines.filter((l) => /^(eth|en|wl)/.test(l))).toEqual([])
}, 600000)

test('the overlay script touches the product before it copies it in', () => {
  const lines = overlayScript('/l').split('\n'), touch = lines.indexOf('find /tmp/bench-product -exec touch -h {} +')
  expect(touch).toBeGreaterThan(-1)
  expect(touch).toBeLessThan(lines.indexOf('cp -a /tmp/bench-product/. /work/'))
})

dtest("the overlay makes the product newer than the base's build outputs (needs BENCH_EXT_DOCKER=1)", async () => {
  const past = { GIT_AUTHOR_DATE: '2020-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z' } // git archive gives files their commit time
  const mk = join(tmp, 'overlay-make'), g = (...a) => Bun.spawnSync(['git', '-C', mk, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { env: { ...process.env, ...past } }).stdout.toString().trim()
  mkdirSync(mk)
  g('init', '-q')
  writeFileSync(join(mk, 'Makefile'), 'out.txt: src.txt\n\tcp src.txt out.txt\n'); writeFileSync(join(mk, 'src.txt'), 'base\n')
  g('add', '.'); g('commit', '-qm', 'base')
  const base = g('rev-parse', 'HEAD')
  writeFileSync(join(mk, 'src.txt'), 'product\n')
  g('add', '-A'); g('commit', '-qm', 'product')
  const product = g('rev-parse', 'HEAD')
  const f = overlayImage({ repo: mk, base, product, // out.txt is built at the image build, after both commits
    dockerfile: 'FROM alpine:3.22\nRUN apk add --no-cache make\nCOPY . /work\nRUN cd /work && make out.txt\n' })
  ovFixtures.push(f)
  const { slug, record, make } = await f, look = `bench-ext-${slug}-look-1`
  await Bun.sleep(1500) // busybox touch has second resolution: the make must start a second after the image build
  expect(await make(1, ['make out.txt'], 'abcdef12')).toMatch(/^sha256:[0-9a-f]{64}$/)
  record((d) => d.containers.push(look))
  expect(docker('create', '--name', look, '--network', 'none', `bench-ext/${slug}:${product.slice(0, 7)}-product-abcdef12`, 'cat', '/work/out.txt').exitCode).toBe(0)
  expect(docker('start', '-a', look).stdout.toString()).toBe('product\n')
}, 600000)

test('the trusted gate compares the task shas whole, never by prefix', async () => {
  const data = join(tmp, `trust-${rand()}`), ext = join(data, 'ext')
  mkdirSync(ext, { recursive: true })
  writeFileSync(join(ext, 'sample.tsv'), `${SAMPLE_HEAD}\n`) // no external task: only tasks.json's short shas
  writeFileSync(join(data, 'tasks.json'), JSON.stringify({ r1: { base: c0.slice(0, 7), end: c1.slice(0, 7) }, r2: { base: 'nosuchref', end: 'deadbeef' } }))
  const twin = c1.slice(0, 7) + (c1.endsWith('0') ? '1' : '0').repeat(33) // shares only the 7-hex prefix with the end
  expect(await trustedCommit(ext, data, fx, twin)).toBe(false)
  expect(await trustedCommit(ext, data, fx, c1)).toBe(true)
  expect(await trustedCommit(ext, data, fx, c0)).toBe(true)
  expect(await trustedCommit(ext, data, fx, c2)).toBe(false)
})

// step 11 ruling 4, the rebuild rounds: the served fixture task with a rebuild brief. In process, a stand-in maker (image, commit,
// lines, log) -> boolean replaces building S and R and the make, and a stand-in agent the sealed one
const REBUILD_BRIEF_SHA = sha256('REBUILD BRIEF\n')
function rebuildTask(o = {}) {
  const s = oracleTask({ rebuild: null, ...o })
  writeFileSync(join(s.ext, 'briefs/rebuild.md'), 'REBUILD BRIEF\n')
  s.rounds = join(s.ext, 'tasks', s.slug(1), 'rebuild-rounds')
  s.rebuildJson = join(s.ext, 'tasks', s.slug(1), 'rebuild.json')
  s.S = `bench-ext/${s.slug(1)}:${c07}-serve`
  s.R = `bench-ext/${s.slug(1)}:${c07}-runner-${O8(s)}`
  s.build = join(s.data, 's1-01', 'build')
  s.sealedLogs = join(s.ext, 'sealed', s.slug(1), 'logs')
  return s
}
async function rebuildIn(s, maker, replies = [], more = {}) {
  const out = [], calls = [], makes = []
  let i = 0
  const code = await rebuild(['s1-01', ...(more.flags ?? [])], { data: s.data, diskFree: async () => 100, ...more,
    maker: async (image, commit, lines, log) => { makes.push([image, commit, lines]); return maker(image, commit, lines, log) },
    rebuildAgent: async (a) => { calls.push({ ...a, text: readFileSync(a.prompt, 'utf8') }); return replies[i++] ?? null } }, (l) => out.push(l))
  return { code, out, calls, makes }
}
const DEFAULT_LINES = ['cd /', "mkdir -p '/work' && cd '/work'", "sh -c 'apk add --no-cache busybox-extras'"] // the fixture's default lines
const rebuildLogs = (dir) => readdirSync(dir).filter((f) => f.includes('rebuild')).sort()

test('rebuild stops at once when both makes pass in the grade image', async () => {
  const s = rebuildTask({ rebuild: { lines: ['true'] } }), before = readFileSync(s.rebuildJson, 'utf8')
  const r = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'made\n'); return true })
  expect(r.code).toBe(0)
  expect(r.out).toEqual(['s1-01 rebuild make=current-1 lines=1 serve=skipped base=ok end=ok', 's1-01 rebuild base=ok end=ok rounds=0 result=ok'])
  expect(r.makes).toEqual([[s.R, c0, ['true']], [s.R, c1, ['true']]])
  expect(r.calls).toEqual([])
  expect(readFileSync(s.rebuildJson, 'utf8')).toBe(before)
  expect(existsSync(join(s.rounds, 'rounds.tsv'))).toBe(false)
  expect(rebuildLogs(s.build)).toEqual([]) // R's logs are sealed
  expect(rebuildLogs(s.sealedLogs)).toEqual([`rebuild-${c07}-current-1.make.log`, `rebuild-${c17}-current-1.make.log`].sort())
})

test('a failing base make sends the serve image\'s log tail to the agent and a passing candidate writes rebuild.json', async () => {
  const s = rebuildTask()
  const maker = async (image, commit, lines, log) => { writeFileSync(log, `make of ${commit.slice(0, 7)}\n${'filler\n'.repeat(300)}pip: no route to the index\n`); return lines[0] === 'offline ok' }
  const r = await rebuildIn(s, maker, ['The lines:\n```json\n{ "lines": ["offline ok"] }\n```'])
  expect(r.code).toBe(0)
  expect(r.out).toEqual(['s1-01 rebuild make=current-1 lines=3 serve=failed base=failed end=skipped', 's1-01 rebuild make=1 lines=1 serve=ok base=ok end=ok', 's1-01 rebuild base=ok end=ok rounds=1 result=ok'])
  // the readable base make is made from S; the grade's from R, the end only after R's base passed
  expect(r.makes).toEqual([[s.R, c0, DEFAULT_LINES], [s.S, c0, DEFAULT_LINES], [s.S, c0, ['offline ok']], [s.R, c0, ['offline ok']], [s.R, c1, ['offline ok']]])
  expect(r.calls.map(({ text, ...a }) => a)).toEqual([{ env: join(s.ext, 'env', `${s.key}.json`), label: `rebuild-${s.slug(1)}-1`, at: c0, prompt: join(s.rounds, '1.prompt.md'), out: join(s.rounds, '1.reply.md') }])
  const p = r.calls[0].text
  expect(p).toStartWith('REBUILD BRIEF\n')
  for (const part of [recipe.dockerfile.trimEnd(), serveRecipe.layer[0], DEFAULT_LINES.join('\n'), 'The last 200 lines of the base make log', 'pip: no route to the index']) expect(p).toContain(part)
  expect(p).not.toContain(`make of ${c07}`) // the tail only
  expect(p).not.toContain('end:')
  expect(json(s.rebuildJson)).toEqual({ lines: ['offline ok'], briefSha: REBUILD_BRIEF_SHA, round: 1 })
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tpass\n`)
  expect(readFileSync(join(s.rounds, '1.reply.md'), 'utf8')).toContain('offline ok')
  // only S's base logs are readable; both of R's are sealed
  expect(rebuildLogs(s.build)).toEqual([`${c07}-rebuild-1.make.log`, `${c07}-rebuild-current-1.make.log`].sort())
  expect(rebuildLogs(s.sealedLogs)).toEqual([`rebuild-${c07}-1.make.log`, `rebuild-${c07}-current-1.make.log`, `rebuild-${c17}-1.make.log`].sort())
  // a rerun makes with the saved lines in R and spends nothing; its logs take the next number
  const again = await rebuildIn(s, maker)
  expect(again.out.at(-1)).toBe('s1-01 rebuild base=ok end=ok rounds=1 result=ok')
  expect(again.makes).toEqual([[s.R, c0, ['offline ok']], [s.R, c1, ['offline ok']]])
  expect(existsSync(join(s.sealedLogs, `rebuild-${c07}-current-2.make.log`))).toBe(true)
  expect(again.calls).toEqual([])
})

test('a base that fails only in the grade image gives stage words, and the runner layer\'s output never reaches the agent', async () => {
  const s = rebuildTask(), SENTINEL = `runner-layer-only-${rand()}`
  // what only R holds (the runner layer) lands in R's make logs; S's makes pass
  const maker = async (image, commit, lines, log) => { writeFileSync(log, image === s.R ? `${SENTINEL}\n` : 'serve fine\n'); return image === s.S }
  const r = await rebuildIn(s, maker, [JSON.stringify({ lines: ['try one'] }), JSON.stringify({ lines: ['try two'] })])
  expect(r.code).toBe(1)
  expect(r.out).toEqual(['s1-01 rebuild make=current-1 lines=3 serve=ok base=failed end=skipped', 's1-01 rebuild make=1 lines=1 serve=ok base=failed end=skipped',
    's1-01 rebuild make=2 lines=1 serve=ok base=failed end=skipped', 's1-01 rebuild base=failed end=skipped rounds=2 result=failed'])
  expect(r.calls.length).toBe(2)
  for (const { text } of r.calls) {
    expect(text).toContain('\nbase (in the grade image): failed\n')
    for (const no of [SENTINEL, 'serve fine', 'The last 200 lines', 'end:']) expect(text).not.toContain(no) // no log of either image
  }
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tgrade base failed\n2\t${s.slug(1)}\tgrade base failed\n`)
  expect(r.out.join('\n')).not.toContain(SENTINEL)
  for (const f of rebuildLogs(s.build)) expect(readFileSync(join(s.build, f), 'utf8')).not.toContain(SENTINEL)
  expect(existsSync(s.rebuildJson)).toBe(false)
})

test('the end\'s failure reaches the agent as one stage word only', async () => {
  const s = rebuildTask(), SENTINEL = `end-only-${rand()}`
  const maker = async (image, commit, lines, log) => { writeFileSync(log, commit === c1 ? `${SENTINEL}\n` : 'base fine\n'); return commit === c0 }
  const r = await rebuildIn(s, maker, [JSON.stringify({ lines: ['try one'] }), JSON.stringify({ lines: ['try two'] })])
  expect(r.code).toBe(1)
  expect(r.calls.length).toBe(2)
  for (const { text } of r.calls) {
    expect(text).toContain('the make passed at the base\nend: failed\n')
    expect(text).not.toContain(SENTINEL)
    expect(text).not.toContain('base fine') // a passing base sends no log
  }
  expect(r.calls[1].text).toContain('try one') // the lines last made
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tend failed\n2\t${s.slug(1)}\tend failed\n`)
  expect(r.out.at(-1)).toBe('s1-01 rebuild base=ok end=failed rounds=2 result=failed')
  expect(r.out.join('\n')).not.toContain(SENTINEL)
})

test('the budget is two rounds per task, then result=failed exit 1', async () => {
  const s = rebuildTask(), reply = JSON.stringify({ lines: ['still online'] })
  const r = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'no index\n'); return false }, [reply, reply, reply])
  expect(r).toMatchObject({ code: 1, calls: [{}, {}] })
  expect(r.out.at(-1)).toBe('s1-01 rebuild base=failed end=skipped rounds=2 result=failed')
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tbase failed\n2\t${s.slug(1)}\tbase failed\n`)
  expect(existsSync(s.rebuildJson)).toBe(false)
  // spent: a rerun makes and asks no agent
  const again = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'no index\n'); return false }, [reply])
  expect(again).toMatchObject({ code: 1, calls: [] })
  expect(again.out.at(-1)).toBe('s1-01 rebuild base=failed end=skipped rounds=2 result=failed')
})

const spend = (s) => { mkdirSync(s.rounds, { recursive: true }); writeFileSync(join(s.rounds, 'rounds.tsv'), `1\t${s.slug(1)}\tbase failed\n2\t${s.slug(1)}\tbase failed\n`) }
const NOTE = 'the install needs a proxy-free index'

test('an extra round runs past a spent budget and carries the note', async () => {
  const s = rebuildTask(); spend(s)
  const r = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'no index\n'); return lines[0] === 'ok' }, [JSON.stringify({ lines: ['ok'] }), JSON.stringify({ lines: ['ok'] })], { flags: ['--extra-round', NOTE] })
  expect(r.code).toBe(0)
  expect(r.calls.length).toBe(1)
  expect(r.calls[0].text).toEndWith(`\nAlso known: ${NOTE}\n`)
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tbase failed\n2\t${s.slug(1)}\tbase failed\n3\t${s.slug(1)}\tpass\textra\n`)
  expect(r.out.at(-1)).toBe('s1-01 rebuild base=ok end=ok rounds=3 result=ok')
  // a failing extra round is the only one: the budget is the rounds spent + 1
  const t = rebuildTask(); spend(t)
  const f = await rebuildIn(t, async (image, commit, lines, log) => { writeFileSync(log, 'no index\n'); return false }, [JSON.stringify({ lines: ['x'] }), JSON.stringify({ lines: ['y'] })], { flags: ['--extra-round', NOTE] })
  expect(f.code).toBe(1)
  expect(f.calls.length).toBe(1)
  expect(readFileSync(join(t.rounds, 'rounds.tsv'), 'utf8')).toEndWith(`3\t${t.slug(1)}\tbase failed\textra\n`)
})

test('the note is refused when empty, multi-line or too long', async () => {
  const s = rebuildTask(); spend(s)
  for (const note of ['', '   ', 'one\ntwo', 'x'.repeat(301), undefined]) {
    const flags = note === undefined ? ['--extra-round'] : ['--extra-round', note]
    await expect(rebuildIn(s, async () => false, [JSON.stringify({ lines: ['x'] })], { flags })).rejects.toThrow('--extra-round takes one non-empty line of at most 300 characters')
  }
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8').split('\n').filter(Boolean).length).toBe(2)
  const ok = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'no index\n'); return false }, [JSON.stringify({ lines: ['x'] })], { flags: ['--extra-round', 'x'.repeat(300)] })
  expect(ok.calls.length).toBe(1)
})

test('without the flag a spent budget still ends result=failed', async () => {
  const s = rebuildTask(); spend(s)
  const r = await rebuildIn(s, async () => false, [JSON.stringify({ lines: ['x'] })])
  expect(r).toMatchObject({ code: 1, calls: [] })
  expect(r.out.at(-1)).toBe('s1-01 rebuild base=failed end=skipped rounds=2 result=failed')
})

test('a pass of the current lines spends no extra round', async () => {
  const s = rebuildTask({ rebuild: { lines: ['true'] } }); spend(s)
  const r = await rebuildIn(s, async () => true, [JSON.stringify({ lines: ['x'] })], { flags: ['--extra-round', NOTE] })
  expect(r).toMatchObject({ code: 0, calls: [] })
  expect(r.out.at(-1)).toBe('s1-01 rebuild base=ok end=ok rounds=2 result=ok')
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8').split('\n').filter(Boolean).length).toBe(2)
})

test('a bad reply spends a round and the next prompt says why', async () => {
  const s = rebuildTask()
  const r = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'offline\n'); return lines[0] === 'ok' }, [JSON.stringify({ lines: 'ok' }), JSON.stringify({ lines: ['ok'] })])
  expect(r.code).toBe(0)
  expect(readFileSync(join(s.rounds, 'rounds.tsv'), 'utf8')).toBe(`1\t${s.slug(1)}\tbad reply\n2\t${s.slug(1)}\tpass\n`)
  expect(r.out).toContain('s1-01 rebuild round=1 reply=bad')
  expect(r.calls[0].text).not.toContain('The previous reply')
  expect(r.calls[1].text).toEndWith('\nThe previous reply was not valid: the reply is not { lines: [at most 60 non-empty shell lines] }\n')
  expect(r.calls[1].text).toContain('The last 200 lines of the base make log') // still the last make's state
  expect(json(s.rebuildJson)).toEqual({ lines: ['ok'], briefSha: REBUILD_BRIEF_SHA, round: 2 })
})

test('default lines a make container cannot replay are a failed base make with no log: the agent gets the refusal', async () => {
  const s = rebuildTask({ serve: { ...serveRecipe, layer: [...serveRecipe.layer, 'USER nobody'] } })
  const r = await rebuildIn(s, async () => true, [JSON.stringify({ lines: ['true'] })])
  expect(r.code).toBe(0)
  expect(r.makes).toEqual([[s.S, c0, ['true']], [s.R, c0, ['true']], [s.R, c1, ['true']]]) // no make of the refused lines
  expect(r.out).toEqual(['s1-01 rebuild make=none base=refused', 's1-01 rebuild make=1 lines=1 serve=ok base=ok end=ok', 's1-01 rebuild base=ok end=ok rounds=1 result=ok'])
  const p = r.calls[0].text
  expect(p).toContain('The default rebuild lines cannot be made: the rebuild lines cannot run USER (only RUN, ENV, ARG and WORKDIR) in a make container')
  expect(p).toContain('USER nobody') // the serve layer, so the agent sees which line
  for (const no of ['The last 200 lines', 'end:', 'grade image']) expect(p).not.toContain(no)
  expect(json(s.rebuildJson)).toEqual({ lines: ['true'], briefSha: REBUILD_BRIEF_SHA, round: 1 })
  // an error that is no refusal is no round's, whatever its message names: an error before anything
  const t = rebuildTask()
  writeFileSync(join(t.ext, 'tasks', t.slug(1), 'task-recipe.json'), JSON.stringify({ ...recipe, dockerfile: 'FROM alpine:3.22\nCOPY . /work\nCOPY . /work\nWORKDIR /work\n' }))
  await expect(rebuildIn(t, async () => true)).rejects.toThrow('the recipe must copy the repo into /work exactly once')
  const u = rebuildTask({ rebuild: { lines: 'true' } }) // its message names rebuild.json, and it carries no refusal mark
  await expect(rebuildIn(u, async () => true)).rejects.toThrow('rebuild.json is not { lines: [shell lines] }')
})

test('a USER naming R\'s final user is no refusal: the default lines are made without it', async () => {
  const s = rebuildTask({ serve: { ...serveRecipe, layer: ['USER root', ...serveRecipe.layer] } })
  const r = await rebuildIn(s, async (image, commit, lines, log) => { writeFileSync(log, 'made\n'); return true }, [], { user: '' })
  expect(r.code).toBe(0)
  expect(r.makes).toEqual([[s.R, c0, DEFAULT_LINES], [s.R, c1, DEFAULT_LINES]])
  expect(r.out).toEqual(['s1-01 rebuild make=current-1 lines=3 serve=skipped base=ok end=ok', 's1-01 rebuild base=ok end=ok rounds=0 result=ok'])
})

dtest('rebuild writes rebuild.json for a fixture whose default lines fail offline, shows the agent only S\'s make, and removes what it built (needs BENCH_EXT_DOCKER=1)', async () => {
  // apk fetch needs the package index: it passes in S's build (with network) and fails in the make container (none), as an
  // install line that fetches its build dependencies does. The runner layer leaves a mark that only a make from R can print
  const SENTINEL = 'RUNNER-LAYER-ONLY'
  const s = rebuildTask({ runner: { ...RUNNER, layer: [`RUN mkdir -p /opt/oracle-tools && echo ${SENTINEL} > /opt/oracle-tools/mark`] },
    serve: { ...serveRecipe, layer: ['RUN cat /opt/oracle-tools/mark 2>/dev/null || true', ...serveRecipe.layer, 'RUN apk fetch --no-cache -o /tmp busybox-extras'] } })
  const candidate = { lines: ['cd /work', 'test -f src/base.txt'] }
  const r = await run(s, ['rebuild', 's1-01'], { more: { rebuildReply: ['```json\n' + JSON.stringify(candidate) + '\n```'] } })
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toBe(['s1-01 rebuild images=2', 's1-01 rebuild make=current-1 lines=5 serve=failed base=failed end=skipped', 's1-01 rebuild make=1 lines=2 serve=ok base=ok end=ok',
    's1-01 rebuild base=ok end=ok rounds=1 result=ok', ''].join('\n'))
  expect(json(s.rebuildJson)).toEqual({ ...candidate, briefSha: REBUILD_BRIEF_SHA, round: 1 })
  const prompt = readFileSync(join(s.rounds, '1.prompt.md'), 'utf8')
  expect(prompt).toContain(readFileSync(join(s.build, `${c07}-rebuild-current-1.make.log`), 'utf8').trimEnd().split('\n').slice(-3).join('\n'))
  // R's make printed the runner layer's mark into its sealed log; nothing readable and no prompt holds it
  expect(readFileSync(join(s.sealedLogs, `rebuild-${c07}-current-1.make.log`), 'utf8')).toContain(SENTINEL)
  expect(prompt).not.toContain(SENTINEL)
  for (const f of rebuildLogs(s.build)) expect(readFileSync(join(s.build, f), 'utf8')).not.toContain(SENTINEL)
  expect(r.stdout).not.toContain(SENTINEL)
  // every name recorded first, then removed by that name: S, R, then per make its product tag (S's `-product-serve`; a failed make keeps id null)
  const tag = (w) => `bench-ext/${s.slug(1)}:${w}`, mk = (c, n) => `bench-ext-${s.slug(1)}-make-${c.slice(0, 7)}-${n}`
  const d = json(join(s.data, 's1-01', 'docker.json'))
  expect(d.images.map((i) => i.name)).toEqual([s.S, s.R, tag(`${c07}-product-${O8(s)}`), tag(`${c07}-product-serve`), tag(`${c07}-product-serve`), tag(`${c07}-product-${O8(s)}`), tag(`${c17}-product-${O8(s)}`)])
  expect(d.images.map((i) => i.id === null)).toEqual([false, false, true, true, false, false, false])
  expect(d.containers).toEqual([mk(c0, 2), mk(c0, 3), mk(c0, 4), mk(c0, 5), mk(c1, 1)])
  for (const c of d.containers) expect(exists('container', c)).toBe(false)
  for (const i of d.images) expect(exists('image', i.name)).toBe(false)
  // the saved lines pass on a rerun: no round, rebuild.json untouched
  const before = readFileSync(s.rebuildJson, 'utf8'), again = await run(s, ['rebuild', 's1-01'])
  expect(again).toMatchObject({ code: 0, stderr: '' })
  expect(again.stdout).toEndWith('s1-01 rebuild make=current-2 lines=2 serve=skipped base=ok end=ok\ns1-01 rebuild base=ok end=ok rounds=1 result=ok\n')
  expect(readFileSync(s.rebuildJson, 'utf8')).toBe(before)
  for (const c of json(join(s.data, 's1-01', 'docker.json')).containers) expect(exists('container', c)).toBe(false)
  for (const i of json(join(s.data, 's1-01', 'docker.json')).images) expect(exists('image', i.name)).toBe(false)
}, 900000)
