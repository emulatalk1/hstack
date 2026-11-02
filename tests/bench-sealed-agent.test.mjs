import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

// A stub stands in for claude (BENCH_CLAUDE): it logs its argv, folder listing and BENCH variables.
const { sealedAgent } = await import('../bench/sealed-agent.mjs')
const dropRoot = releaseRoot()
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-sealed-')))
const data = join(tmp, 'data'), repo = join(tmp, 'repo'), log = join(tmp, 'stub.log')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(join(repo, '.claude'), { recursive: true }); mkdirSync(data)
git('init', '-q')
writeFileSync(join(repo, 'src/a.txt'), 'first\n')
writeFileSync(join(repo, '.claude/settings.json'), '{}')
git('add', '-f', '.'); git('commit', '-qm', 'one')
const one = git('rev-parse', 'HEAD')
writeFileSync(join(repo, 'src/a.txt'), 'second\n')
git('commit', '-qam', 'two')
writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
writeFileSync(join(tmp, 'prompt.md'), 'PROMPT-TEXT\n')
const taskFile = join(tmp, 'task.json')
writeFileSync(taskFile, JSON.stringify({ name: `t${rand()}`, repo, db: null, port: 59999, start: 'true', ready: 'http://127.0.0.1:59999/', oracle: 'true', junit: 'r.xml', timeoutSec: 20, layers: {} }))

// STUB_MODE: result | noresult | fail
const stub = join(tmp, 'claude-stub')
writeFileSync(stub, `#!/usr/bin/env bun
import { appendFileSync, readdirSync } from 'node:fs'
const a = process.argv.slice(2), say = (o) => console.log(JSON.stringify(o))
appendFileSync(process.env.STUB_LOG, JSON.stringify({ args: a, cwd: process.cwd(), files: readdirSync(process.cwd()).sort(), env: Object.keys(process.env).filter((k) => /BENCH/.test(k)) }) + '\\n')
const t = a[a.indexOf('--tools') + 1]
say({ type: 'system', subtype: 'init', claude_code_version: '9.9.9', tools: t ? t.split(',') : [] })
say({ type: 'assistant', message: { id: 'm', model: 'stub-m', usage: { input_tokens: 7, output_tokens: 2 }, content: [] } })
const mode = process.env.STUB_MODE ?? 'result'
if (mode === 'result') say({ type: 'result', subtype: 'success', result: 'REPLY-TEXT' })
if (mode === 'fail') process.exit(3)
`)
chmodSync(stub, 0o755)

const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [])
const run = async (args, env = {}) => {
  rmSync(log, { force: true })
  const p = Bun.spawn(['bun', '-e', `import { sealedAgent } from '${join(import.meta.dir, '../bench/sealed-agent.mjs')}'; try { process.exit(await sealedAgent(JSON.parse(process.argv[1]), { root: '${sub}' })) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(data, 'machine.json'), BENCH_CLAUDE: stub, STUB_LOG: log, ...env }, stdout: 'pipe', stderr: 'pipe' })
  return { stdout: await new Response(p.stdout).text(), stderr: await new Response(p.stderr).text(), code: await p.exited }
}
const out = () => join(tmp, `out-${rand()}.md`)
const base = (o, ...more) => [taskFile, `l-${rand()}`, '--prompt', join(tmp, 'prompt.md'), '--out', o, ...more]
const rec = (o) => JSON.parse(readFileSync(`${o}.run.json`, 'utf8'))
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }); dropRoot() })

test('writes the reply to --out and version, tools, usage and models to the run record', async () => {
  const o = out()
  const r = await run(base(o, '--tools', 'Read,Grep,Glob'))
  expect(r).toMatchObject({ stdout: '', code: 0 })
  expect(readFileSync(o, 'utf8')).toBe('REPLY-TEXT')
  const [c] = calls()
  expect(c.args[1]).toBe('PROMPT-TEXT\n')
  expect(c.args.slice(c.args.indexOf('--permission-mode'), c.args.indexOf('--permission-mode') + 2)).toEqual(['--permission-mode', 'default'])
  expect(c.args.slice(c.args.indexOf('--tools'), c.args.indexOf('--tools') + 2)).toEqual(['--tools', 'Read,Grep,Glob'])
  expect(c.args).toContain('--no-session-persistence')
  const x = rec(o)
  expect(x).toMatchObject({ at: null, code: 0, version: '9.9.9', tools: ['Read', 'Grep', 'Glob'], usage: { input: 7, output: 2, cacheRead: 0, cacheWrite: 0 }, models: ['stub-m'] })
  expect(x.label).toStartWith('l-')
  expect(Date.parse(x.end) >= Date.parse(x.start)).toBe(true)
})

test('with no --tools the agent gets one empty --tools argument and an empty folder', async () => {
  const o = out()
  expect((await run(base(o))).code).toBe(0)
  const [c] = calls()
  expect(c.args.slice(c.args.indexOf('--tools'))).toEqual(['--tools', ''])
  expect(c.files).toEqual([])
  expect(c.env).toEqual([]) // no BENCH_* variable reaches the agent
  expect(c.cwd.startsWith(realpathSync(ROOT))).toBe(true)
  expect(existsSync(c.cwd)).toBe(false)
  expect(rec(o).tools).toEqual([])
})

test('--at runs in an export of that commit with no .git and no .claude/settings.json', async () => {
  const o = out()
  expect((await run(base(o, '--at', one))).code).toBe(0)
  const [c] = calls()
  expect(c.files).toEqual(['.claude', 'src'])
  expect(c.files).not.toContain('.git')
  expect(rec(o).at).toBe(one)
  // the folder is the commit's files: first, not second
  const o2 = out()
  expect((await run(base(o2, '--at', one.slice(0, 7)))).code).toBe(0)
  expect(rec(o2).at).toBe(one.slice(0, 7))
})

test('refuses an existing --out or run record, a bad label and a missing prompt file, naming what is wrong', async () => {
  const o = out()
  writeFileSync(o, 'x')
  expect(await run(base(o))).toMatchObject({ code: 2, stderr: expect.stringContaining(`${o} exists`) })
  const o2 = out()
  writeFileSync(`${o2}.run.json`, '{}')
  expect(await run(base(o2))).toMatchObject({ code: 2, stderr: expect.stringContaining(`${o2}.run.json exists`) })
  const o3 = out()
  expect(await run([taskFile, 'Bad Label', '--prompt', join(tmp, 'prompt.md'), '--out', o3])).toMatchObject({ code: 2, stderr: expect.stringContaining('label Bad Label') })
  expect(await run([taskFile, 'ok', '--prompt', join(tmp, 'nope.md'), '--out', o3])).toMatchObject({ code: 2, stderr: expect.stringContaining(join(tmp, 'nope.md')) })
  expect(await run([taskFile, 'ok', '--out', o3])).toMatchObject({ code: 2, stderr: expect.stringContaining('usage:') })
  expect(calls()).toEqual([])
  expect(existsSync(o3) || existsSync(`${o3}.run.json`)).toBe(false)
})

test('no result event or a non-zero exit: exit 1, a run record with the code, no --out', async () => {
  for (const [mode, code] of [['noresult', 0], ['fail', 3]]) {
    const o = out()
    const r = await run(base(o), { STUB_MODE: mode })
    expect(r.code).toBe(1)
    expect(existsSync(o)).toBe(false)
    expect(rec(o)).toMatchObject({ code, version: '9.9.9', usage: { input: 7 } })
  }
})

test('passes --settings as an absolute path and records it', async () => {
  const s = join(tmp, 'settings.json')
  writeFileSync(s, '{}')
  const o = out()
  expect((await run(base(o, '--settings', relative(process.cwd(), s)))).code).toBe(0)
  const [c] = calls()
  expect(c.args.slice(c.args.indexOf('--settings'), c.args.indexOf('--settings') + 2)).toEqual(['--settings', s])
  expect(rec(o).settings).toBe(s)
  const o2 = out()
  expect((await run(base(o2))).code).toBe(0)
  expect(calls()[0].args).not.toContain('--settings')
  expect(rec(o2).settings).toBeNull()
})

test('refuses a missing settings file, naming it', async () => {
  const o = out(), s = join(tmp, 'no-settings.json')
  expect(await run(base(o, '--settings', s))).toMatchObject({ code: 2, stderr: expect.stringContaining(s) })
  expect(calls()).toEqual([])
  expect(existsSync(o) || existsSync(`${o}.run.json`)).toBe(false)
})
