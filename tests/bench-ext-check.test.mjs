import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { issueAsOf } from '../bench/ext.mjs'
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
writeFileSync(join(fx, 'src/base.txt'), 'base\n')
git('add', '.'); git('commit', '-qm', 'base')
const c0 = git('rev-parse', 'HEAD')
// PR 1: adds the file the check needs, touches both checks, deletes one
writeFileSync(join(fx, 'src/feature.txt'), 'feature\n')
writeFileSync(join(fx, 'tests/zebra_needs.sh'), '# needs the feature\ntest -f src/feature.txt\n')
writeFileSync(join(fx, 'tests/zebra_ok.sh'), '# always\nexit 0\n')
rmSync(join(fx, 'tests/zebra_old.sh'))
git('add', '-A'); git('commit', '-qm', 'one')
const c1 = git('rev-parse', 'HEAD')
// PR 2: a test that passes before and after
writeFileSync(join(fx, 'tests/zebra_ok.sh'), '# always, really\nexit 0\n')
writeFileSync(join(fx, 'src/other.txt'), 'other\n')
git('add', '-A'); git('commit', '-qm', 'two')
const c2 = git('rev-parse', 'HEAD')

const platform = process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'
const junitTest = [
  'echo "<testsuite>" > /out/junit.xml',
  'for f in "$@"; do n=$(basename "$f" .sh); if sh "$f"; then echo "<testcase classname=\\"fx\\" name=\\"$n\\"/>"; else echo "<testcase classname=\\"fx\\" name=\\"$n\\"><failure/></testcase>"; fi; done >> /out/junit.xml',
  'echo "</testsuite>" >> /out/junit.xml',
].join('\n') + '\n'
const recipe = { platform, dockerfile: 'FROM alpine:3.22\nCOPY . /work\nWORKDIR /work\n', test: junitTest, probe: ['tests/zebra_ok.sh'] }
const badRecipe = { ...recipe, probe: ['tests/zebra_needs.sh'] } // fails at the base: no passing case

const cfg = {
  seed: 'hstack-bench-2026-10-27', window: { createdFrom: '2026-07-01T00:00:00Z', mergedBefore: '2026-11-01T00:00:00Z' },
  repo: { starsMin: 1000, tier2StarsMin: 500, pushedFrom: '2026-07-01', createdBefore: '2026-01-01' }, licences: ['MIT'], maxFiles: 100, perStack: 8, perRepo: 2, usedInHstack: [],
  groups: [{ id: 's1', languages: ['Lang1'], markers: [], testPaths: ['(^|/)tests/'] }],
}
const prs = {
  1: { end: c1, files: ['src/feature.txt', 'tests/zebra_needs.sh', 'tests/zebra_ok.sh', 'tests/zebra_old.sh'], issue: 11 },
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
process.exit(await main(c.args, { gh, remote: () => c.remote, recipeAgent: async () => c.reply }))
`)

// a data folder with its own repo owner, so container and image names never meet those of another test or run
function setup({ withRecipe = true } = {}) {
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
    writeFileSync(join(ext, 'recipes', key, 'recipe.json'), JSON.stringify(recipe))
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
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=1\n`)
  const meta = json(join(s.ext, 'tasks', s.slug(1), 'meta.json'))
  expect(meta).toMatchObject({ id: `${s.owner}/app#1`, slug: s.slug(1), stack: 's1', tier: 1, rank: 1, url: `https://github.com/${s.owner}/app/pull/1`, defaultBranch: 'main',
    pr: 1, prCreated: '2026-08-10T00:00:00Z', mergedAt: '2026-08-12T00:00:00Z', issue: 11, issueCreated: '2026-08-01T00:00:00Z', end: c1, base: c0, method: 'single',
    licence: 'MIT', stars: 1500, f2p: 1, p2p: 1, editHistory: 'none', platform, recipeRounds: 0 })
  expect(meta.images).toEqual([`bench-ext/${s.slug(1)}:${c0.slice(0, 7)}`, `bench-ext/${s.slug(1)}:${c1.slice(0, 7)}`])
  expect(json(join(s.ext, 'sealed', s.slug(1), 'f2p.json'))).toEqual({ f2p: ['fx::zebra_needs'], p2p: ['fx::zebra_ok'] })
  expect(json(join(s.ext, 'tasks', s.slug(1), 'issue.json'))).toEqual({ title: 'Issue title', body: 'Issue body', asOf: '2026-08-10T00:00:00Z', editHistory: 'none' })
  expect(walkRows(s)).toEqual([['s1', '1', '1', `${s.owner}/app#1`, 'ok']])
  expect(existsSync(join(s.ext, 'tasks', s.slug(1), 'check.err'))).toBe(false)
}, 300000)

dtest('prints only the verdict and counts (needs BENCH_EXT_DOCKER=1)', async () => {
  const { r } = await accepted()
  const lines = r.stdout.split('\n').filter(Boolean)
  expect(lines.length).toBe(1)
  expect(lines[0]).toMatch(/^\S+ (ok f2p=\d+ p2p=\d+|out [a-z0-9 ]+)$/)
  expect(r.stdout).not.toMatch(/zebra|tests\/|feature/)
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
  expect(r.stdout).toBe(`${s.slug(1)} ok f2p=1 p2p=1\n${s.slug(2)} out no fail-to-pass test\ns1 tier 1: accepted 1, checked 2, list end yes\n`)
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

test('a docker daemon failure is error, not out', async () => {
  const s = setup()
  const r = await run(s, ['check', 's1', '1'], { env: { DOCKER_HOST: `unix:///nonexistent-${rand()}.sock` } })
  expect(r.stdout).toBe(`${s.slug(1)} error build\n`)
  expect(walkRows(s)).toEqual([['s1', '1', '1', `${s.owner}/app#1`, 'error build']])
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
  // renames after the PR are undone; one before stays
  const renames = { timelineItems: { nodes: [{ createdAt: '2026-08-02T00:00:00Z', previousTitle: 'first', currentTitle: 'second' },
    { createdAt: '2026-08-15T00:00:00Z', previousTitle: 'second', currentTitle: 'third' }, { createdAt: '2026-08-16T00:00:00Z', previousTitle: 'third', currentTitle: 'now' }] } }
  expect(issueAsOf(issue(renames), at).title).toBe('second')
})
