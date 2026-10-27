import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { claudeArgs, finalText, judgeVerdict, usage } from '../bench/lib/agent.mjs'
import { clean } from '../bench/env.mjs'

test('claudeArgs loads no user settings and no MCP servers, and one plugin dir per plugin', () => {
  const a = claudeArgs({ prompt: 'hi', model: 'm', settings: 's.json', pluginDirs: ['/p1', '/p2'], addDirs: ['/d'] })
  expect(a.slice(0, 8)).toEqual(['-p', 'hi', '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config'])
  expect(a.filter((x) => x === '--plugin-dir').length).toBe(2)
  expect(a).toEqual([...a.slice(0, 8), '--model', 'm', '--plugin-dir', '/p1', '--plugin-dir', '/p2', '--add-dir', '/d', '--settings', 's.json'])
  expect(claudeArgs({ prompt: 'hi' })).toEqual(a.slice(0, 8))
})
test('claudeArgs passes the system prompt, permission mode, tools and allow list only when given; no tools is one empty argument', () => {
  const a = claudeArgs({ prompt: 'x', appendSystemPrompt: 'be brief', permissionMode: 'default', tools: ['Read', 'Grep'], allow: ['Read', 'Bash(git diff:*)'] })
  expect(a.slice(8)).toEqual(['--append-system-prompt', 'be brief', '--permission-mode', 'default', '--tools', 'Read,Grep', '--allowedTools', 'Read,Bash(git diff:*)'])
  expect(claudeArgs({ prompt: 'x', tools: [] }).slice(8)).toEqual(['--tools', ''])
})

const fixture = [
  JSON.stringify({ type: 'system', subtype: 'init', tools: [] }),
  JSON.stringify({ type: 'assistant', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 10, output_tokens: 5 }, content: [] } }),
  JSON.stringify({ type: 'result', subtype: 'success', result: 'done' }),
].join('\n')
test('finalText and usage read a stream-json transcript', () => {
  expect(finalText(fixture)).toBe('done')
  expect(usage(fixture)).toEqual({ input: 10, output: 5, cacheRead: 0, cacheWrite: 0, models: ['claude-x'] })
})
test('usage counts a message split over several assistant events once, and finalText needs a result', () => {
  const ev = (id, model, u) => JSON.stringify({ type: 'assistant', message: { id, model, usage: u, content: [] } })
  const t = [ev('a', 'x', { input_tokens: 1, output_tokens: 1 }), ev('a', 'x', { input_tokens: 1, output_tokens: 4, cache_read_input_tokens: 7, cache_creation_input_tokens: 3 }),
    ev('b', 'y', { input_tokens: 2, output_tokens: 2 }), 'not json'].join('\n')
  expect(usage(t)).toEqual({ input: 3, output: 6, cacheRead: 7, cacheWrite: 3, models: ['x', 'y'] })
  expect(() => finalText(t)).toThrow('no result')
  expect(() => finalText(JSON.stringify({ type: 'result', subtype: 'error_max_turns' }))).toThrow('no result')
})

test('usage takes the totals from the result event when it has them, and adds its models', () => {
  const t = [JSON.stringify({ type: 'assistant', message: { id: 'a', model: 'x', usage: { input_tokens: 2, output_tokens: 7 }, content: [] } }),
    JSON.stringify({ type: 'result', subtype: 'success', result: 'ok', usage: { input_tokens: 4, output_tokens: 168, cache_read_input_tokens: 6396, cache_creation_input_tokens: 3201 }, modelUsage: { x: {}, z: {} } })].join('\n')
  expect(usage(t)).toEqual({ input: 4, output: 168, cacheRead: 6396, cacheWrite: 3201, models: ['x', 'z'] })
})

test('judgeVerdict accepts one JSON object and throws on prose', () => {
  expect(judgeVerdict('{"caught": true, "quote": "the total is off"}')).toEqual({ caught: true, quote: 'the total is off' })
  expect(judgeVerdict(' {"caught": false, "quote": ""}\n')).toEqual({ caught: false, quote: '' })
  expect(() => judgeVerdict('Yes, finding 2 describes it.')).toThrow()
  expect(() => judgeVerdict('Yes: {"caught": true, "quote": "x"}')).toThrow()
  expect(() => judgeVerdict('{"caught": "yes", "quote": "x"}')).toThrow()
  expect(() => judgeVerdict('{"caught": true}')).toThrow()
  expect(() => judgeVerdict('[{"caught": true, "quote": "x"}]')).toThrow()
})
test('judgeVerdict accepts the object inside a single json fence, and its error never quotes the reply', () => {
  expect(judgeVerdict('```json\n{"caught": true, "quote": "q"}\n```')).toEqual({ caught: true, quote: 'q' })
  expect(() => judgeVerdict('```json\n{"caught": true, "quote": "q"}\n```\n```json\n{"caught": false, "quote": ""}\n```')).toThrow()
  expect(() => judgeVerdict('SECRET prose')).toThrow(expect.objectContaining({ message: expect.not.stringContaining('SECRET') }))
})

// CLI smoke tests. A stub stands in for claude: the judge call is the one with `--tools ""`.
const { agentReplay } = await import('../bench/agent-replay.mjs')
const ROOT = '/tmp/hstack-bench'
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-agent-')))
const data = join(tmp, 'data'), repo = join(tmp, 'repo'), log = join(tmp, 'stub.log')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
mkdirSync(join(repo, 'src'), { recursive: true })
git('init', '-q')
writeFileSync(join(repo, 'src/a.txt'), 'start\n')
git('add', '.'); git('commit', '-qm', 'base')
const base = git('rev-parse', 'HEAD')
writeFileSync(join(repo, 'src/a.txt'), 'buggy\n')
git('commit', '-qam', 'task end')
const end = git('rev-parse', 'HEAD')
writeFileSync(join(repo, 'src/a.txt'), 'fixed\n')
git('commit', '-qam', 'fix')
const fix = git('rev-parse', 'HEAD')
mkdirSync(join(tmp, 'bugs'))
writeFileSync(join(tmp, 'bugs/fix.patch'), git('diff', end, fix) + '\n')
mkdirSync(join(data, 'p1'), { recursive: true })
writeFileSync(join(data, 'p1/input.md'), 'FILTERED-INPUT of p1\n')
writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
writeFileSync(join(tmp, 'review.md'), 'REVIEW-BRIEF\n')

// STUB_LAYER: result | noresult | fail; STUB_JUDGE: the judge's reply text
const stub = join(tmp, 'claude-stub')
writeFileSync(stub, `#!/usr/bin/env bun
import { appendFileSync, readdirSync } from 'node:fs'
const a = process.argv.slice(2), judge = a[a.indexOf('--tools') + 1] === '' && a.includes('--tools')
const say = (o) => console.log(JSON.stringify(o))
const url = /http:\\/\\/localhost:\\d+/.exec(a[1])?.[0]
const page = url ? await (await fetch(url)).text() : null
appendFileSync(process.env.STUB_LOG, JSON.stringify({ judge, args: a, cwd: process.cwd(), files: readdirSync(process.cwd()), page }) + '\\n')
console.error('STUB-ERR FINDING-SECRET')
say({ type: 'system', subtype: 'init' })
say({ type: 'assistant', message: { id: judge ? 'j' : 'l', model: judge ? 'judge-m' : 'layer-m', usage: { input_tokens: judge ? 3 : 10, output_tokens: 2 }, content: [] } })
const mode = process.env.STUB_LAYER ?? 'result'
if (process.env.STUB_SLEEP === (judge ? 'judge' : 'layer')) await Bun.sleep(60000)
if (judge) say({ type: 'result', subtype: 'success', result: process.env.STUB_JUDGE })
else if (mode === 'result') say({ type: 'result', subtype: 'success', result: 'FINDING-SECRET: a.txt says buggy' })
if (!judge && mode === 'fail') process.exit(3)
`)
chmodSync(stub, 0o755)

const port = (() => { const l = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } }); const p = l.port; l.stop(true); return p })()
const mkTask = (layers, extra = {}) => {
  const f = join(tmp, `task-${rand()}.json`)
  writeFileSync(f, JSON.stringify({
    name: `t${rand()}`, repo, db: null, port, start: `bun -e "Bun.serve({ port: Number(process.env.BENCH_PORT), fetch: () => new Response(Bun.file('src/a.txt')) })"`,
    ready: `http://127.0.0.1:${port}/`, oracle: 'true', junit: 'results.xml', timeoutSec: 20, layers, ...extra,
  }))
  return f
}
const layers = { review: { brief: 'review.md' }, audit: { brief: 'review.md', tools: ['Read', 'Grep'] }, evaluator: { brief: 'review.md', tools: ['WebFetch'] } }
const bug = (id, extra = {}) => {
  const f = join(tmp, 'bugs', `${id}.json`)
  writeFileSync(f, JSON.stringify({ id, at: fix, patch: 'fix.patch', fix, description: 'DESCRIPTION-SECRET a.txt reads buggy', task: 'p1', base, end, ...extra }))
  return f
}
const judgeSays = (caught) => JSON.stringify({ caught, quote: 'QUOTE-SECRET a.txt says buggy' })
const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [])
const cli = async (args, env = {}) => {
  rmSync(log, { force: true })
  const p = Bun.spawn(['bun', '-e', `import { agentReplay } from '${join(import.meta.dir, '../bench/agent-replay.mjs')}'; try { process.exit(await agentReplay(JSON.parse(process.argv[1]), { root: '${sub}' })) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(data, 'machine.json'), BENCH_CLAUDE: stub, STUB_LOG: log, STUB_JUDGE: judgeSays(true), ...env }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  return { stdout, stderr, code }
}
const result = (id, layer) => JSON.parse(readFileSync(join(data, 'results', `${id}-${layer}.json`), 'utf8'))
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }) })

test('sealed review prints exactly "<id> caught": the agent sees the brief, the filtered input and the task diff in an empty folder', async () => {
  const r = await cli([mkTask(layers), bug('b1'), 'review', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b1 caught\n', stderr: '', code: 0 })
  const [l, j] = calls()
  expect(l).toMatchObject({ judge: false, files: [] })
  expect(l.cwd.startsWith(realpathSync(ROOT))).toBe(true)
  expect(l.args[1]).toStartWith('REVIEW-BRIEF')
  expect(l.args[1]).toContain('FILTERED-INPUT of p1')
  expect(l.args[1]).toContain('+buggy')
  expect(l.args[1]).not.toContain('fixed')
  expect(l.args.slice(l.args.indexOf('--permission-mode'), l.args.indexOf('--permission-mode') + 2)).toEqual(['--permission-mode', 'default'])
  expect(j.judge).toBe(true)
  expect(j.files).toEqual([])
  expect(j.args[1]).toContain('Did any finding describe this defect (same behaviour, same place)? Reply with one JSON object only.')
  expect(j.args[1]).toContain('DESCRIPTION-SECRET')
  expect(j.args[1]).toContain('FINDING-SECRET: a.txt says buggy')
  expect(j.args[1]).not.toContain('REVIEW-BRIEF')
  const res = result('b1', 'review')
  expect(res).toMatchObject({ id: 'b1', layer: 'review', verdict: 'caught', models: { layer: ['layer-m'], judge: ['judge-m'] } })
  expect(res.usage).toEqual({ layer: { input: 10, output: 2, cacheRead: 0, cacheWrite: 0 }, judge: { input: 3, output: 2, cacheRead: 0, cacheWrite: 0 } })
  expect(Date.parse(res.end) >= Date.parse(res.start)).toBe(true)
  expect(JSON.stringify(res)).not.toContain('SECRET')
  expect(existsSync(l.cwd) || existsSync(j.cwd)).toBe(false)
})
test('sealed: a judge that says false is "<id> missed"', async () => {
  const r = await cli([mkTask(layers), bug('b2'), 'review', '--sealed'], { STUB_JUDGE: judgeSays(false) })
  expect(r).toMatchObject({ stdout: 'b2 missed\n', stderr: '', code: 0 })
})
test('sealed: no result event, a failing layer or a judge reply that is not one object is "<id> error", exit non-zero, and nothing about the bug', async () => {
  for (const [id, env] of [['b3', { STUB_LAYER: 'noresult' }], ['b3f', { STUB_LAYER: 'fail' }], ['b3j', { STUB_JUDGE: 'QUOTE-SECRET yes it did' }]]) {
    const r = await cli([mkTask(layers), bug(id), 'review', '--sealed'], env)
    expect(r).toMatchObject({ stdout: `${id} error\n`, stderr: '', code: 1 })
    expect(result(id, 'review')).toMatchObject({ verdict: 'error', usage: { layer: { input: 10 } } })
    expect(JSON.stringify(result(id, 'review'))).not.toContain('SECRET')
  }
  expect(calls().length).toBe(2) // the bad judge reply still ran the judge once
})
test('sealed: a layer or judge that outlives timeoutSec is killed and is "<id> error"', async () => {
  for (const [id, who] of [['b7', 'layer'], ['b7j', 'judge']]) {
    const t0 = Date.now()
    const r = await cli([mkTask(layers, { timeoutSec: 1 }), bug(id), 'review', '--sealed'], { STUB_SLEEP: who })
    expect(r).toMatchObject({ stdout: `${id} error\n`, stderr: '', code: 1 })
    expect(Date.now() - t0).toBeLessThan(15000)
    expect(calls().length).toBe(who === 'layer' ? 1 : 2)
  }
})
test('dev mode prints the quote and stores the findings, and passes the agent stderr through', async () => {
  const r = await cli([mkTask(layers), bug('b4'), 'review'])
  expect(r.stdout).toBe('quote: QUOTE-SECRET a.txt says buggy\nb4 caught\n')
  expect(r.stderr).toContain('STUB-ERR')
  expect(result('b4', 'review')).toMatchObject({ findings: 'FINDING-SECRET: a.txt says buggy', quote: 'QUOTE-SECRET a.txt says buggy' })
})
test('audit runs in an export of the task end commit, with no .git and the layer tools', async () => {
  const r = await cli([mkTask(layers), bug('b5'), 'audit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b5 caught\n', stderr: '', code: 0 })
  const [l] = calls()
  expect(l.files).toEqual(['src'])
  expect(l.args[1]).toBe('REVIEW-BRIEF\n')
  expect(l.args.slice(l.args.indexOf('--tools'), l.args.indexOf('--tools') + 2)).toEqual(['--tools', 'Read,Grep'])
  expect(existsSync(l.cwd)).toBe(false)
})
test('evaluator: the agent gets the URL of the app with the bug reapplied, from an empty folder', async () => {
  const r = await cli([mkTask(layers), bug('b6'), 'evaluator', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b6 caught\n', stderr: '', code: 0 })
  const [l] = calls()
  expect(l).toMatchObject({ files: [], page: 'buggy\n' })
  expect(l.args[1]).toContain('FILTERED-INPUT of p1')
  expect(readdirSync(sub)).toEqual([])
})
test('refuses a bad layer, a missing brief, missing bug fields and a missing input, naming what is wrong', async () => {
  const t = mkTask(layers)
  const err = async (args, want) => { const r = await cli(args); expect(r.code).toBe(2); expect(r.stderr).toContain(want); expect(calls()).toEqual([]) }
  await err([t, bug('c1'), 'e2e'], 'layer e2e')
  await err([mkTask({ review: 'review.md' }), bug('c1'), 'review'], 'layer review')
  await err([mkTask({ review: { brief: 'nope.md' } }), bug('c1'), 'review'], 'layer review')
  await err([mkTask({ review: { brief: 'review.md', tools: 'Read' } }), bug('c1'), 'review'], 'layer review')
  await err([mkTask({ unit: { brief: 'review.md' } }), bug('c1'), 'unit'], 'layer unit')
  await err([t, bug('c1', { base: undefined }), 'review'], 'base')
  await err([t, bug('c1', { end: undefined }), 'audit'], 'end')
  await err([t, bug('c1', { patch: undefined }), 'evaluator'], 'patch')
  await err([t, bug('c1', { description: undefined }), 'audit'], 'description')
  await err([t, bug('c1', { task: '..' }), 'review'], 'task')
  await err([t, bug('c1', { task: 'p2' }), 'review'], 'input')
  await err([t, bug('bad id'), 'review'], 'id')
})
