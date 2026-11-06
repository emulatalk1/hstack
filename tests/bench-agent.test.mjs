import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apiError, claudeArgs, fallbackOf, fellBack, finalText, judgeVerdict, usage } from '../bench/lib/agent.mjs'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

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
test('claudeArgs turns session persistence off only when asked', () => {
  expect(claudeArgs({ prompt: 'x', noPersist: true }).slice(8)).toEqual(['--no-session-persistence'])
  expect(claudeArgs({ prompt: 'x' })).not.toContain('--no-session-persistence')
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
test('finalText throws on a result marked is_error, even one that carries text', () => {
  expect(() => finalText(JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'API Error: 500' }))).toThrow('is_error')
  expect(finalText(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'ok' }))).toBe('ok')
})

test('usage sums every result event', () => {
  // a turn with a background tool ends one segment, then another: each result holds its own segment's usage
  const res = (u, models) => JSON.stringify({ type: 'result', subtype: 'success', result: 'ok', usage: u, modelUsage: models })
  const t = [JSON.stringify({ type: 'assistant', message: { id: 'a', model: 'x', usage: { input_tokens: 1, output_tokens: 1 }, content: [] } }),
    res({ input_tokens: 4, output_tokens: 19785, cache_read_input_tokens: 10, cache_creation_input_tokens: 5 }, { x: {} }),
    res({ input_tokens: 2, output_tokens: 384, cache_read_input_tokens: 7 }, { x: {}, z: {} })].join('\n')
  expect(usage(t)).toEqual({ input: 6, output: 20169, cacheRead: 17, cacheWrite: 5, models: ['x', 'z'] })
  expect(finalText(t)).toBe('ok')
  // a later result with no usage adds nothing and does not hide the earlier one
  expect(usage([res({ input_tokens: 4, output_tokens: 9 }, { x: {} }), JSON.stringify({ type: 'result', result: 'ok' })].join('\n'))).toMatchObject({ input: 4, output: 9 })
})

test('one result is unchanged', () => {
  const t = JSON.stringify({ type: 'result', subtype: 'success', result: 'ok', usage: { input_tokens: 4, output_tokens: 168, cache_read_input_tokens: 6396, cache_creation_input_tokens: 3201 }, modelUsage: { x: {} } })
  expect(usage(t)).toEqual({ input: 4, output: 168, cacheRead: 6396, cacheWrite: 3201, models: ['x'] })
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
const { agentReplay, agentEnv } = await import('../bench/agent-replay.mjs')
const dropRoot = releaseRoot()
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-agent-')))
const data = join(tmp, 'data'), repo = join(tmp, 'repo'), log = join(tmp, 'stub.log')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(join(repo, '.claude/agents'), { recursive: true })
git('init', '-q')
writeFileSync(join(repo, 'src/a.txt'), 'start\n')
// the task repo's own hook must not run inside an audit agent
writeFileSync(join(repo, '.claude/settings.json'), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'sleep 3000' }] }] } }))
writeFileSync(join(repo, '.claude/agents/x.md'), 'an agent')
git('add', '-f', '.'); git('commit', '-qm', 'base')
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
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
const a = process.argv.slice(2), judge = a[a.indexOf('--tools') + 1] === '' && a.includes('--tools')
const say = (o) => console.log(JSON.stringify(o))
const url = /http:\\/\\/localhost:\\d+/.exec(a[1])?.[0]
const page = url ? await (await fetch(url)).text() : null
const dsize = existsSync('task.diff') ? statSync('task.diff').size : null, diff = dsize !== null && dsize < 10000 ? readFileSync('task.diff', 'utf8') : null
const dot = existsSync('.claude') ? readdirSync('.claude') : null, env = Object.keys(process.env).filter((k) => /BENCH/.test(k))
appendFileSync(process.env.STUB_LOG, JSON.stringify({ judge, args: a, cwd: process.cwd(), files: readdirSync(process.cwd()).sort(), dot, env, page, dsize, diff }) + '\\n')
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
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }); dropRoot() })

test('sealed review prints exactly "<id> caught": the agent sees the brief and the filtered input in the prompt and the task diff as the only file in its folder', async () => {
  const r = await cli([mkTask(layers), bug('b1'), 'review', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b1 caught\n', stderr: '', code: 0 })
  const [l, j] = calls()
  expect(l).toMatchObject({ judge: false, files: ['task.diff'], env: [] })
  expect(l.diff).toBe(git('diff', '--no-ext-diff', '--no-color', base, end) + '\n')
  expect(l.diff).toContain('+buggy')
  expect(l.cwd.startsWith(realpathSync(ROOT))).toBe(true)
  expect(l.args[1]).toBe('REVIEW-BRIEF\n\n\n## Input\n\nFILTERED-INPUT of p1\n\n\n## Diff of the task\n\nThe full diff of the task, from its base to its end, is the file task.diff in your working folder.\n')
  expect(l.args[1]).not.toContain('+buggy')
  expect(l.args.slice(l.args.indexOf('--permission-mode'), l.args.indexOf('--permission-mode') + 2)).toEqual(['--permission-mode', 'default'])
  expect(j).toMatchObject({ judge: true, env: [] })
  for (const c of [l, j]) expect(c.args).toContain('--no-session-persistence')
  expect(j.files).toEqual([])
  expect(j.args[1]).toContain('Did any finding describe this defect (same behaviour, same place)? Reply with one JSON object only.')
  expect(j.args[1]).toContain('DESCRIPTION-SECRET')
  expect(j.args[1]).toContain('FINDING-SECRET: a.txt says buggy')
  for (const s of ['REVIEW-BRIEF', '+buggy', 'FILTERED-INPUT']) expect(j.args[1]).not.toContain(s)
  const res = result('b1', 'review')
  expect(res).toMatchObject({ id: 'b1', layer: 'review', verdict: 'caught', models: { layer: ['layer-m'], judge: ['judge-m'] } })
  expect(res.usage).toEqual({ layer: { input: 10, output: 2, cacheRead: 0, cacheWrite: 0 }, judge: { input: 3, output: 2, cacheRead: 0, cacheWrite: 0 } })
  expect(Date.parse(res.end) >= Date.parse(res.start)).toBe(true)
  expect(JSON.stringify(res)).not.toContain('SECRET')
  expect(existsSync(l.cwd) || existsSync(j.cwd)).toBe(false)
})
test('a task diff over 1 MB reaches the reviewer as a file', async () => {
  const big = join(tmp, 'big')
  mkdirSync(big)
  const g = (...a) => Bun.spawnSync(['git', '-C', big, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
  g('init', '-q')
  writeFileSync(join(big, 'a.txt'), 'start\n'); g('add', '.'); g('commit', '-qm', 'base')
  const b = g('rev-parse', 'HEAD')
  writeFileSync(join(big, 'big.txt'), ('y'.repeat(99) + '\n').repeat(11000)); g('add', '.'); g('commit', '-qm', 'end')
  const e = g('rev-parse', 'HEAD')
  writeFileSync(join(big, 'a.txt'), 'fixed\n'); g('commit', '-qam', 'fix')
  const f = g('rev-parse', 'HEAD')
  const size = Buffer.byteLength(g('diff', '--no-ext-diff', '--no-color', b, e) + '\n')
  expect(size).toBeGreaterThan(1_100_000)
  const task = JSON.parse(readFileSync(mkTask(layers), 'utf8'))
  const t = join(tmp, `task-${rand()}.json`)
  writeFileSync(t, JSON.stringify({ ...task, name: `t${rand()}`, repo: big }))
  const r = await cli([t, bug('b9', { base: b, end: e, fix: f }), 'review', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b9 caught\n', stderr: '', code: 0 })
  const [l] = calls()
  expect(l).toMatchObject({ files: ['task.diff'], dsize: size })
  expect(l.args[1].length).toBeLessThan(1000)
})
test('the agent env carries no database variable and points docker at no daemon', () => {
  const keep = { PGPASSWORD: 'p', PGHOST: 'h', DATABASE_URL: 'u', BENCH_X: 'b', HSTACK_BENCH_MACHINE: 'm', PAYLOAD_DROP_DATABASE: 'true', DOCKER_HOST: 'unix:///var/run/docker.sock' }
  const old = Object.fromEntries(Object.keys(keep).map((k) => [k, process.env[k]]))
  Object.assign(process.env, keep)
  try {
    const env = agentEnv()
    for (const k of Object.keys(keep)) if (k !== 'DOCKER_HOST') expect(env).not.toHaveProperty(k)
    expect(env.DOCKER_HOST).toBe('unix:///nonexistent')
    expect(env.HOME).toBe(process.env.HOME)
  } finally {
    for (const [k, v] of Object.entries(old)) v === undefined ? delete process.env[k] : (process.env[k] = v)
  }
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
    expect(readdirSync(sub)).toEqual([]) // no export or empty folder left after the kill
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
  expect(l).toMatchObject({ files: ['.claude', 'src'], dot: ['agents'] })
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
test('evaluator: a teardown failure after the agent ran still writes the record and is "<id> error"', async () => {
  const r = await cli([mkTask(layers, { teardown: ['echo TD-SECRET; exit 4'] }), bug('b8'), 'evaluator', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b8 error\n', stderr: '', code: 1 })
  expect(calls().length).toBe(1) // the judge does not run
  expect(result('b8', 'evaluator')).toMatchObject({ verdict: 'error', usage: { layer: { input: 10 } } })
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
  await err([t, bug('c1', { fix: undefined }), 'review'], 'fix')
  await err([t, bug('c1', { end: fix }), 'review'], 'already in end')
  await err([t, bug('c1', { fix: base }), 'audit'], 'already in end')
  await err([t, bug('b1'), 'review'], 'b1-review.json exist') // a layer run already recorded
})

test('claudeArgs passes the disallowed tools only when given', () => {
  expect(claudeArgs({ prompt: 'x', disallow: ['WebSearch', 'WebFetch'] }).slice(8)).toEqual(['--disallowedTools', 'WebSearch,WebFetch'])
  expect(claudeArgs({ prompt: 'x' })).not.toContain('--disallowedTools')
})

test('fellBack reads both subtypes and nothing else', () => {
  const sys = (subtype, o = {}) => JSON.stringify({ type: 'system', subtype, ...o })
  expect(fellBack(['x', sys('init'), sys('model_fallback')].join('\n'))).toBe(true)
  expect(fellBack(sys('model_refusal_fallback', { original_model: 'a', fallback_model: 'b', category: 'c', scope: 'session' }))).toBe(true)
  expect(fallbackOf(sys('model_refusal_fallback', { original_model: 'a', fallback_model: 'b', category: 'c' }))).toEqual({ original: 'a', fallback: 'b', category: 'c' })
  expect(fellBack(sys('init'))).toBe(false)
  expect(fellBack(JSON.stringify({ type: 'assistant', subtype: 'model_fallback' }))).toBe(false) // the type matters too
  expect(fellBack(JSON.stringify({ type: 'result', result: 'model_refusal_fallback' }))).toBe(false)
  expect(fellBack('not json')).toBe(false)
  expect(fallbackOf('')).toBeNull()
})

test('apiError reads the last result', () => {
  const r = (o) => JSON.stringify({ type: 'result', ...o })
  expect(apiError([r({ is_error: false }), r({ is_error: true })].join('\n'))).toBe(true)
  expect(apiError([r({ is_error: true }), r({ is_error: false })].join('\n'))).toBe(false)
  expect(apiError(r({ subtype: 'success' }))).toBe(false)
  expect(apiError('not json\n{"type":"assistant"}')).toBe(false)
  expect(apiError('')).toBe(false)
})
