import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { API_HOSTS, WEB_OFF, armArgs, boxArgs, countInterventions, fwScript, initInfo, netOk, netScript, probeOk, RESUMES } from '../bench/lib/arm.mjs'
import { claudeArgs } from '../bench/lib/agent.mjs'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'
import { hostBox } from './bench-host-box.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-arm-')))
const dropRoot = releaseRoot()
const sub = `${ROOT}/test-arm-${Math.random().toString(36).slice(2, 8)}`
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }); dropRoot() })

test('the hook denies the question with the fixed answer and logs it', async () => {
  const log = join(tmp, 'interventions.jsonl')
  const hook = async (questions) => {
    const p = Bun.spawn(['bun', join(import.meta.dir, '../bench/responder-hook.mjs')], {
      stdin: new Blob([JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: { questions } })]),
      env: { ...process.env, BENCH_INTERVENTIONS: log }, stdout: 'pipe',
    })
    const [out, code] = [await new Response(p.stdout).text(), await p.exited]
    expect(code).toBe(0)
    const o = JSON.parse(out).hookSpecificOutput
    expect(o).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' })
    return o.permissionDecisionReason
  }
  expect(await hook([{ question: 'Which colour?' }])).toBe('No more information; decide from the requirement.')
  expect(await hook([{ question: 'Which?', options: [{ label: 'A' }, { label: 'B' }] }])).toBe('Take the first option: A.')
  const lines = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  expect(lines.length).toBe(2)
  for (const l of lines) { expect(l.tool).toBe('AskUserQuestion'); expect(Number.isNaN(Date.parse(l.t))).toBe(false) }
})

test('a run that stops without DONE counts one intervention per resume', () => {
  expect(countInterventions({ hookLines: 1, resumes: ['other', 'DONE'], abandoned: false })).toBe(2)
  expect(countInterventions({ hookLines: 1, resumes: Array(5).fill('other'), abandoned: true })).toBe(9)
  expect(countInterventions({ hookLines: 0, resumes: [], abandoned: false })).toBe(0)
})

test('B and B- load no plugin, H and W load their list', () => {
  const cfg = { model: 'big', smallModel: 'small', plugins: { H: ['/h', '/dep'], W: ['/w'] } }
  expect(armArgs('B', cfg)).toEqual({ model: 'big', pluginDirs: [], appendSystemPrompt: undefined, disallow: ['WebSearch', 'WebFetch'] })
  expect(armArgs('B-', cfg)).toEqual({ model: 'small', pluginDirs: [], appendSystemPrompt: 'Write no tests. Do not run or check your work. Stop after one pass.', disallow: ['WebSearch', 'WebFetch'] })
  expect(armArgs('H', cfg)).toEqual({ model: 'big', pluginDirs: ['/h', '/dep'], appendSystemPrompt: undefined, disallow: ['WebSearch', 'WebFetch'] })
  expect(armArgs('W', cfg)).toEqual({ model: 'big', pluginDirs: ['/w'], appendSystemPrompt: undefined, disallow: ['WebSearch', 'WebFetch'] })
  expect(armArgs('B', { ...cfg, model: undefined }).model).toBeUndefined()
  expect(() => armArgs('X', cfg)).toThrow()
})

const builtin = [{ name: 'cc-plugin-telemetry', path: 'builtin' }]
const init = (o) => [JSON.stringify({ type: 'system', subtype: 'init', tools: ['Bash', 'Write'], slash_commands: ['debug'], plugins: builtin, ...o }),
  JSON.stringify({ type: 'result', subtype: 'success', result: 'OK' })].join('\n')
test('probeOk refuses a B run whose init lists a plugin, a namespaced command or a user skill, and an H run whose plugins differ from its list', () => {
  const skills = ['cua-driver', 'synced']
  expect(initInfo(init({}))).toMatchObject({ plugins: [], commands: ['debug'], tools: ['Bash', 'Write'], version: null })
  expect(initInfo(init({ claude_code_version: '2.1.310' })).version).toBe('2.1.310')
  expect(probeOk('B', initInfo(init({})), [], skills)).toBeNull()
  expect(probeOk('B-', initInfo(init({ plugins: [...builtin, { name: 'hstack', path: '/p' }] })), [], skills)).toContain('hstack')
  expect(probeOk('B', initInfo(init({ slash_commands: ['debug', 'hstack:hstack-init'] })), [], skills)).toContain('hstack:hstack-init')
  expect(probeOk('B', initInfo(init({ slash_commands: ['debug', 'synced'] })), [], skills)).toContain('synced')
  const h = initInfo(init({ plugins: [...builtin, { name: 'hstack', path: '/p' }], slash_commands: ['hstack:hstack-init'] }))
  expect(probeOk('H', h, ['hstack'], skills)).toBeNull()
  expect(probeOk('H', h, ['hstack', 'dep'], skills)).toContain('dep')
  expect(probeOk('W', h, ['other'], skills)).toContain('other')
  expect(() => initInfo('{"type":"result"}')).toThrow('init')
})

test('claudeArgs passes a session id or a resume only when given', () => {
  expect(claudeArgs({ prompt: 'x', sessionId: 'u1' }).slice(8)).toEqual(['--session-id', 'u1'])
  expect(claudeArgs({ prompt: 'x', resume: 'u1' }).slice(8)).toEqual(['--resume', 'u1'])
})

// CLI tests. A stub stands in for claude: the probe is the call whose prompt is "Reply OK.".
const data = join(tmp, 'data'), repo = join(tmp, 'repo'), log = join(tmp, 'stub.log')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a])
mkdirSync(repo); git('init', '-q')
writeFileSync(join(repo, 'a.txt'), 'base\n'); git('add', '.'); git('commit', '-qm', 'base')
writeFileSync(join(repo, 'a.txt'), 'FUTURE\n'); git('commit', '-qam', 'future') // the arm must not see this commit
mkdirSync(join(data, 'p1'), { recursive: true })
writeFileSync(join(data, 'p1/input.md'), 'INPUT of p1\n')
writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
writeFileSync(join(data, 'p1/interface.md'), 'SHEET of p1\n')
const task = join(tmp, 'task.json')
writeFileSync(task, JSON.stringify({ name: 't1', repo, db: null, port: 4999, start: 'true', ready: 'http://127.0.0.1:4999/', oracle: 'true', junit: 'r.xml' }))

// STUB_DONE: the turn (0 = the first prompt, 1 = the first resume) that answers DONE, or never; STUB_PLUGINS: the probe's plugin list;
// STUB_PLANT: a marker file the main turn's planted post-commit hook and fsmonitor would write (it also plants a tag);
// STUB_API: the main turns end with is_error; STUB_MODEL: the model the main turns report (default: the --model given, else main-m);
// STUB_SUB: a subagent on another model in the main turns
// STUB_SAY: text the main turn writes in its transcript
const stub = join(tmp, 'claude-stub')
writeFileSync(stub, `#!/usr/bin/env bun
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
const a = process.argv.slice(2), probe = a[1] === 'Reply OK.'
const prev = existsSync(process.env.STUB_LOG) ? readFileSync(process.env.STUB_LOG, 'utf8').trim().split('\\n').length - 1 : 0 // main turns so far
appendFileSync(process.env.STUB_LOG, JSON.stringify({ probe, args: a, cwd: process.cwd(), files: readdirSync(process.cwd()).sort(), env: Object.keys(process.env).filter((k) => /BENCH/.test(k)) }) + '\\n')
const say = (o) => console.log(JSON.stringify(o))
say({ type: 'system', subtype: 'init', claude_code_version: '9.9.9', tools: ['Bash'], slash_commands: [], plugins: JSON.parse(process.env.STUB_PLUGINS ?? '[]') })
const model = probe ? 'probe-m' : process.env.STUB_MODEL ?? (a.includes('--model') ? a[a.indexOf('--model') + 1] : 'main-m')
say({ type: 'assistant', message: { id: 'm', model, usage: {}, content: [{ type: 'text', text: !probe && prev === 0 ? process.env.STUB_SAY ?? '' : '' }, ...(probe ? [] : [{ type: 'tool_use', id: 't' + prev, name: 'Bash', input: {} }])] } })
if (!probe && process.env.STUB_SUB) say({ type: 'assistant', message: { id: 'm2', model: 'sub-m', usage: {}, content: [] } })
if (!probe) writeFileSync('made.txt', 'turn ' + prev + '\\n')
const mark = process.env.STUB_PLANT
if (!probe && prev === 0 && mark) {
  Bun.spawnSync(['git', 'tag', 'planted'])
  mkdirSync('.git/hooks', { recursive: true })
  for (const f of ['.git/hooks/post-commit', '.git/fsmon']) { writeFileSync(f, '#!/bin/sh\\necho ' + f + ' >> ' + mark + '\\n'); chmodSync(f, 0o755) }
  Bun.spawnSync(['git', 'config', 'core.fsmonitor', process.cwd() + '/.git/fsmon'])
}
const done = !probe && String(prev) === process.env.STUB_DONE
say({ type: 'result', subtype: 'success', is_error: !probe && process.env.STUB_API === '1', result: probe ? 'OK' : done ? ' DONE\\n' : 'Which colour should it be?', usage: { input_tokens: probe ? 1 : 10, output_tokens: 2 } })
`)
chmodSync(stub, 0o755)

const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [])
const arms = (o = {}) => writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', cli: stub, plugins: { H: [], W: [] }, turnTimeoutSec: 20, ...o }))
arms()
// real: runArm's own default box, the production one
const cli = async (args, env = {}, { real = false } = {}) => {
  rmSync(log, { force: true })
  const opts = real ? `{ root: '${sub}' }` : `{ root: '${sub}', box: hostBox }`
  const p = Bun.spawn(['bun', '-e', `import { runArm } from '${join(import.meta.dir, '../bench/run-arm.mjs')}'; import { hostBox } from '${join(import.meta.dir, 'bench-host-box.mjs')}'; try { process.exit(await runArm(JSON.parse(process.argv[1]), ${opts})) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(data, 'machine.json'), STUB_LOG: log, ...env }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  return { stdout, stderr, code }
}
const run = (arm, n) => [task, arm, String(n), '--input', join(data, 'p1/input.md'), '--at', 'HEAD~1']
const result = (id) => JSON.parse(readFileSync(join(data, 'results', `${id}.json`), 'utf8'))
const show = (ref) => Bun.spawnSync(['git', '-C', repo, 'show', ref]).stdout.toString()
const opt = (args, flag) => args[args.indexOf(flag) + 1]

test('run-arm: a question then DONE on the first resume is one intervention, and the product is a branch of the task repo', async () => {
  mkdirSync(join(data, 'results', 'p1-B-1'), { recursive: true }); writeFileSync(join(data, 'results', 'p1-B-1', '9-stale.jsonl'), '')
  const r = await cli(run('B', 1), { STUB_DONE: '1' })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-B-1 done\n' })
  const [probe, main, resume, ...rest] = calls()
  expect(rest).toEqual([])
  expect(probe.probe).toBe(true)
  expect(probe.args).not.toContain('--session-id')
  expect(main.files).toEqual(['.git', 'a.txt'])
  expect(main.env).toEqual([])
  expect(main.cwd.startsWith(realpathSync(ROOT))).toBe(true)
  const id = opt(main.args, '--session-id')
  expect(opt(resume.args, '--resume')).toBe(id)
  expect(resume.args).not.toContain('--session-id')
  expect(resume.args[1]).toBe('No more information; decide from the requirement. Continue until the task is done. When it is done, reply exactly DONE.')
  for (const c of [probe, main, resume]) {
    expect(opt(c.args, '--permission-mode')).toBe('bypassPermissions')
    expect(c.args).not.toContain('--model') // B with no cfg.model: the CLI default
    expect(c.args).not.toContain('--plugin-dir')
    expect(c.args).not.toContain('--no-session-persistence') // the arm resumes its session
    expect(readFileSync(opt(c.args, '--settings'), 'utf8')).toBe('{}\n')
  }
  expect(show('bench/p1-B-1:made.txt')).toBe('turn 1\n')
  const dir = join(data, 'results', 'p1-B-1')
  expect(readdirSync(dir).sort()).toEqual(['0-probe.jsonl', '1-main.jsonl', '2-resume-1.jsonl', 'settings.json'])
  expect(readFileSync(join(dir, '2-resume-1.jsonl'), 'utf8')).toContain('" DONE\\n"')
  expect(readdirSync(join(data, 'results')).filter((f) => f.endsWith('.json'))).toEqual(['p1-B-1.json'])
  expect(show('bench/p1-B-1:a.txt')).toBe('base\n')
  expect(show('bench/p1-B-1~2').split('\n')).toContain('    base ' + git('rev-parse', '--short=7', 'HEAD~1').stdout.toString().trim())
  expect(show('bench/p1-B-1~1').split('\n')).toContain('    env')
  const res = result('p1-B-1')
  expect(res).toMatchObject({ task: 'p1', arm: 'B', run: 1, status: 'done', resumes: ['other'], interventions: 1, branch: 'bench/p1-B-1', plugins: [], version: '9.9.9', machine: null,
    usage: { input: 20, output: 4 }, transcripts: dir, probeUsage: { input: 1, output: 2 }, models: ['main-m'], probeModels: ['probe-m'], toolUses: { Bash: 2 },
    box: { name: 'host' }, envCommit: git('rev-parse', 'bench/p1-B-1~1').stdout.toString().trim() })
  expect(res).not.toHaveProperty('leak')
  expect(res).not.toHaveProperty('leakTurns')
  expect(res.turns).toEqual([{ turn: 'probe', code: 0, timedOut: false }, { turn: 'main', code: 0, timedOut: false }, { turn: 'resume-1', code: 0, timedOut: false }])
  expect(Date.parse(res.end) >= Date.parse(res.start)).toBe(true)
  expect(existsSync(main.cwd)).toBe(false)
  // the same run again is refused before any call: the results file exists
  const again = await cli(run('B', 1), { STUB_DONE: '1' })
  expect(again.code).toBe(2)
  expect(calls()).toEqual([])
})

test('run-arm: DONE on the main turn is zero interventions and no resume', async () => {
  const r = await cli(run('B', 5), { STUB_DONE: '0' })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-B-5 done\n' })
  expect(calls().length).toBe(2)
  expect(result('p1-B-5')).toMatchObject({ status: 'done', resumes: [], interventions: 0 })
})

test('run-arm records each plugin dir with its name, commit and whether it is dirty', async () => {
  const hp = join(tmp, 'hp-repo'), plain = join(tmp, 'plain')
  mkdirSync(join(hp, '.claude-plugin'), { recursive: true }); mkdirSync(plain)
  writeFileSync(join(hp, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'hp' }))
  const hg = (...a) => Bun.spawnSync(['git', '-C', hp, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
  hg('init', '-q'); hg('add', '.'); hg('commit', '-qm', 'p'); writeFileSync(join(hp, 'new.md'), 'x')
  arms({ plugins: { H: [hp, plain], W: [] } })
  const r = await cli(run('H', 1), { STUB_DONE: '0', STUB_PLUGINS: JSON.stringify([{ name: 'hp', path: hp }, { name: 'plain', path: plain }]) })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-H-1 done\n' })
  expect(result('p1-H-1').plugins).toEqual([{ dir: hp, name: 'hp', commit: hg('rev-parse', 'HEAD'), dirty: true }, { dir: plain, name: 'plain', commit: null, dirty: false }])
  arms()
})

test('run-arm: a run that never says DONE is abandoned after 5 resumes, 5 + 3 interventions; B- runs the small model with its prompt', async () => {
  const r = await cli(run('B-', 1), { STUB_DONE: 'never' })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-B--1 abandoned\n' })
  const c = calls()
  expect(c.length).toBe(7)
  for (const x of c) { expect(opt(x.args, '--model')).toBe('small-m'); expect(opt(x.args, '--append-system-prompt')).toBe('Write no tests. Do not run or check your work. Stop after one pass.') }
  expect(result('p1-B--1')).toMatchObject({ status: 'abandoned', resumes: Array(5).fill('other'), interventions: 8 })
  expect(show('bench/p1-B--1:made.txt')).toBe('turn 5\n')
  expect(readdirSync(join(data, 'results', 'p1-B--1')).sort()).toEqual(['0-probe.jsonl', '1-main.jsonl', ...[1, 2, 3, 4, 5].map((i) => `${i + 1}-resume-${i}.jsonl`), 'settings.json'])
})

test('run-arm: a B probe whose init lists a plugin stops with exit 2, no main turn and no branch', async () => {
  const r = await cli(run('B', 2), { STUB_DONE: '0', STUB_PLUGINS: JSON.stringify([{ name: 'hstack', path: '/x' }]) })
  expect(r.code).toBe(2)
  expect(r.stderr).toContain('hstack')
  expect(calls().length).toBe(1)
  expect(git('rev-parse', '--verify', '-q', 'refs/heads/bench/p1-B-2').exitCode).not.toBe(0)
  expect(existsSync(join(data, 'results', 'p1-B-2.json'))).toBe(false)
})

const err = async (args, want, env = {}) => { const r = await cli(args, env); expect(r.code).toBe(2); expect(r.stderr).toContain(want); expect(calls()).toEqual([]) }

test('a task with a database is still refused', async () => {
  const dbTask = join(tmp, 'task-db.json')
  writeFileSync(dbTask, JSON.stringify({ ...JSON.parse(readFileSync(task, 'utf8')), db: 'bench_x' }))
  await err([dbTask, ...run('B', 3).slice(1)], 'arm runs have no database guard yet')
})

test('run-arm refuses an unknown arm, a missing plugin dir, a missing cli and an existing branch, before any call', async () => {
  await err(run('X', 3), 'arm')
  await err(run('B', 0), 'run')
  arms({ plugins: { H: [join(tmp, 'nope')], W: [] } })
  await err(run('H', 3), 'nope')
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ cli: stub, plugins: { H: [], W: [] } }))
  await err(run('B', 3), 'smallModel')
  arms({ cli: 'no-such-claude' })
  await err(run('B', 3), 'no-such-claude')
  arms({ cli: tmp }) // a folder is no binary
  await err(run('B', 3), 'cli')
  arms({ cli: undefined })
  await err(run('B', 3), 'cli')
  arms()
  git('branch', 'bench/p1-W-3', 'HEAD')
  await err(run('W', 3), 'bench/p1-W-3')
  mkdirSync(join(data, 'p..1')); writeFileSync(join(data, 'p..1/input.md'), 'x\n'); writeFileSync(join(data, 'p..1/interface.md'), 'y\n')
  await err([task, 'B', '3', '--input', join(data, 'p..1/input.md'), '--at', 'HEAD~1'], 'not a valid git ref')
})

test('run-arm kills a turn that outlives turnTimeoutSec and abandons the run', async () => {
  const slow = join(tmp, 'claude-slow')
  writeFileSync(slow, `#!/bin/sh\ncase "$2" in "Reply OK.") exec "${stub}" "$@";; esac\nsleep 60\n`)
  chmodSync(slow, 0o755)
  arms({ cli: slow, turnTimeoutSec: 1 })
  const t0 = Date.now()
  const r = await cli(run('W', 4))
  expect(r).toMatchObject({ code: 0, stdout: 'p1-W-4 abandoned\n' })
  expect(Date.now() - t0).toBeLessThan(15000)
  expect(result('p1-W-4')).toMatchObject({ status: 'abandoned', resumes: [], interventions: 3, reason: 'timeout', machine: null })
  expect(result('p1-W-4').turns.at(-1)).toEqual({ turn: 'main', code: null, timedOut: true })
  expect(show('bench/p1-W-4:a.txt')).toBe('base\n')
  arms()
})

test('the prompt holds the input and then the interface sheet', async () => {
  expect(await cli(run('B', 20), { STUB_DONE: '0' })).toMatchObject({ code: 0 })
  expect(calls()[1].args[1]).toBe('INPUT of p1\n\n\nSHEET of p1\n\n\nWhen the task is done, reply exactly DONE.')
})

test('a missing sheet is refused before any call', async () => {
  mkdirSync(join(data, 'p2')); writeFileSync(join(data, 'p2/input.md'), 'INPUT of p2\n')
  await err([task, 'B', '1', '--input', join(data, 'p2/input.md'), '--at', 'HEAD~1'], 'interface.md')
  expect(existsSync(join(data, 'results', 'p2-B-1'))).toBe(false)
})

test('the arm gets the web tools off', async () => {
  expect(await cli(run('B', 21), { STUB_DONE: '0' })).toMatchObject({ code: 0 })
  for (const c of calls()) expect(opt(c.args, '--disallowedTools')).toBe('WebSearch,WebFetch')
})

test('an API error marks the run machine and it gets no score', async () => {
  const r = await cli(run('B', 22), { STUB_API: '1' })
  expect(r).toMatchObject({ code: 3, stdout: 'p1-B-22 machine api\n' })
  expect(calls().length).toBe(2) // the probe and the main turn: it stops at once
  expect(result('p1-B-22')).toMatchObject({ machine: 'api', branch: null, status: 'abandoned' })
  expect(git('rev-parse', '--verify', '-q', 'refs/heads/bench/p1-B-22').exitCode).not.toBe(0)
  expect(readdirSync(join(data, 'results', 'p1-B-22')).some((f) => f.endsWith('.bundle'))).toBe(false)
})

test('a run served without its model is machine; a subagent on another model is not', async () => {
  const r = await cli(run('B-', 23), { STUB_DONE: '0', STUB_MODEL: 'fallback-m' })
  expect(r).toMatchObject({ code: 3, stdout: 'p1-B--23 machine model\n' })
  expect(result('p1-B--23')).toMatchObject({ machine: 'model', branch: null, models: ['fallback-m'] })
  expect(git('rev-parse', '--verify', '-q', 'refs/heads/bench/p1-B--23').exitCode).not.toBe(0)
  expect(await cli(run('B-', 24), { STUB_DONE: '0', STUB_SUB: '1' })).toMatchObject({ code: 0, stdout: 'p1-B--24 done\n' })
  expect(result('p1-B--24')).toMatchObject({ machine: null, models: ['small-m', 'sub-m'], branch: 'bench/p1-B--24' })
})

test('a box killed, out of memory or with no product is machine, with its record and no branch', async () => {
  for (const [n, env, why] of [[30, { HOSTBOX_TURN: 'killed' }, 'killed'], [31, { HOSTBOX_TURN: 'memory' }, 'memory'], [32, { HOSTBOX_PRODUCT: 'killed' }, 'killed'], [33, { HOSTBOX_PRODUCT: 'throw' }, 'product']]) {
    expect(await cli(run('B', n), { STUB_DONE: '0', ...env })).toMatchObject({ code: 3, stdout: `p1-B-${n} machine ${why}\n` })
    expect(result(`p1-B-${n}`)).toMatchObject({ machine: why, branch: null })
    expect(git('rev-parse', '--verify', '-q', `refs/heads/bench/p1-B-${n}`).exitCode).not.toBe(0)
    expect(readdirSync(join(data, 'results', `p1-B-${n}`)).some((f) => f.endsWith('.bundle'))).toBe(false)
  }
})

test('a config the agent wrote in .git does not reach the task repo', async () => {
  const marker = join(tmp, 'planted-marker')
  expect(await cli(run('B', 25), { STUB_DONE: '0', STUB_PLANT: marker })).toMatchObject({ code: 0 })
  expect(git('config', '--local', '--list').stdout.toString()).not.toContain('fsmonitor') // planted in the agent's .git/config
  expect(git('tag').stdout.toString()).toBe('') // the agent's tag stays out of the copy
  expect(existsSync(marker)).toBe(false) // neither its post-commit hook nor its fsmonitor ran
  expect(existsSync(join(repo, '.git/hooks/post-commit'))).toBe(false)
})

test('a product bundle fetches into a bare shallow repo and a repo on its alternates still reads', async () => {
  const deep = join(tmp, 'deep'), shallow = join(tmp, 'shallow.git'), seeded = join(tmp, 'seeded.git')
  mkdirSync(deep)
  const d = (...a) => Bun.spawnSync(['git', '-C', deep, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a])
  d('init', '-q')
  for (const n of [1, 2, 3, 4]) { writeFileSync(join(deep, 'a.txt'), `c${n}\n`); d('add', '.'); d('commit', '-qm', `c${n}`) }
  expect(Bun.spawnSync(['git', 'clone', '-q', '--bare', '--depth', '2', `file://${deep}`, shallow]).exitCode).toBe(0)
  const sg = (...a) => Bun.spawnSync(['git', '-C', shallow, ...a])
  expect(sg('rev-parse', '--is-shallow-repository').stdout.toString().trim()).toBe('true')
  // a repo that borrows the task repo's objects, as a seeded one does
  Bun.spawnSync(['git', 'init', '-q', '--bare', seeded])
  writeFileSync(join(seeded, 'objects/info/alternates'), join(shallow, 'objects') + '\n')
  Bun.spawnSync(['git', '-C', seeded, 'update-ref', 'refs/heads/end', sg('rev-parse', 'HEAD').stdout.toString().trim()])
  // an object only the seeded repo keeps, and a task repo that would gc and prune at once after any fetch
  const blob = Bun.spawnSync(['git', '-C', shallow, 'hash-object', '-w', '--stdin'], { stdin: new Blob(['kept\n']) }).stdout.toString().trim()
  const tree = Bun.spawnSync(['git', '-C', shallow, 'mktree'], { stdin: new Blob([`100644 blob ${blob}\tk.txt\n`]) }).stdout.toString().trim()
  const solo = Bun.spawnSync(['git', '-C', shallow, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit-tree', '-m', 'solo', tree]).stdout.toString().trim()
  Bun.spawnSync(['git', '-C', seeded, 'update-ref', 'refs/heads/solo', solo])
  for (const [k, v] of [['gc.auto', '1'], ['gc.autoPackLimit', '1'], ['fetch.unpackLimit', '1'], ['gc.autoDetach', 'false'], ['gc.pruneExpire', 'now'], ['gc.reflogExpire', 'now']]) sg('config', k, v)
  const t = join(tmp, 'task-shallow.json')
  writeFileSync(t, JSON.stringify({ ...JSON.parse(readFileSync(task, 'utf8')), repo: shallow }))
  expect(await cli([t, ...run('B', 26).slice(1)], { STUB_DONE: '0' })).toMatchObject({ code: 0, stdout: 'p1-B-26 done\n' })
  expect(sg('show', 'bench/p1-B-26:made.txt').stdout.toString()).toBe('turn 0\n')
  expect(sg('show', 'bench/p1-B-26:a.txt').stdout.toString()).toBe('c3\n')
  expect(Bun.spawnSync(['git', '-C', seeded, 'cat-file', '-p', 'end:a.txt']).stdout.toString()).toBe('c4\n')
  expect(Bun.spawnSync(['git', '-C', seeded, 'cat-file', '-p', 'solo:k.txt']).stdout.toString()).toBe('kept\n')
})

test('a plugin dir is refused by the real box', async () => {
  const shim = join(tmp, 'shim'), dockerLog = join(tmp, 'docker.log'), plugin = join(tmp, 'a-plugin')
  mkdirSync(shim); mkdirSync(plugin)
  writeFileSync(join(shim, 'docker'), `#!/bin/sh\necho "$@" >> ${dockerLog}\nexit 1\n`); chmodSync(join(shim, 'docker'), 0o755)
  arms({ plugins: { H: [plugin], W: [] } })
  const r = await cli(run('H', 27), { PATH: `${shim}:${process.env.PATH}`, STUB_DONE: '0' }, { real: true })
  expect(r.code).toBe(2)
  expect(r.stderr).toContain('plugin')
  expect(existsSync(dockerLog)).toBe(false) // refused before any Docker call
  expect(calls()).toEqual([])
  expect(existsSync(join(data, 'results', 'p1-H-27.json'))).toBe(false)
  arms()
})

test('every arm has the web tools off and B- alone has the three instructions', () => {
  const cfg = { model: 'big', smallModel: 'small', plugins: { H: [], W: [] } }
  expect(WEB_OFF).toEqual(['WebSearch', 'WebFetch'])
  for (const arm of ['B', 'B-', 'H', 'W']) expect(armArgs(arm, cfg).disallow).toEqual(WEB_OFF)
  expect(armArgs('B-', cfg).appendSystemPrompt.split('. ').length).toBe(3)
  for (const arm of ['B', 'H', 'W']) expect(armArgs(arm, cfg).appendSystemPrompt).toBeUndefined()
  expect(RESUMES).toBe(5)
})

test('probeOk refuses a web tool at init, for every arm', () => {
  for (const arm of ['B', 'B-', 'H', 'W']) {
    expect(probeOk(arm, initInfo(init({ tools: ['Bash', 'WebFetch'] })), [], [])).toContain('WebFetch')
    expect(probeOk(arm, initInfo(init({ tools: ['WebSearch'] })), [], [])).toContain('WebSearch')
  }
  expect(probeOk('H', initInfo(init({ tools: ['Bash'] })), [], [])).toBeNull()
})

const hosts = [{ host: 'api.example', ip: '10.0.0.1' }, { host: 'claude.example', ip: '10.0.0.2' }]
const box = { name: 'bench-ext-x-arm-t-B-1', image: 'img:1-arm', platform: 'linux/arm64', hosts, limitSec: 90000, memoryGB: 6 }
test('boxArgs mounts nothing and asks for no capability', () => {
  const a = boxArgs(box)
  expect(a.slice(0, 2)).toEqual(['create', '--name'])
  expect(a.slice(-2)).toEqual(['img:1-arm', '90000'])
  expect(a.join(' ')).toContain('--memory 6g')
  expect(a.filter((x, i) => a[i - 1] === '--cap-drop').sort()).toEqual(['AUDIT_WRITE', 'FSETID', 'MKNOD', 'NET_BIND_SERVICE', 'NET_RAW', 'SETFCAP', 'SETPCAP', 'SYS_CHROOT']) // Docker's defaults but the six kept; NET_RAW: a raw frame passes under every iptables rule
  expect(a.join(' ')).toContain('--entrypoint sleep img:1-arm')
  expect(a.join(' ')).toContain('--platform linux/arm64')
  expect(a.filter((x) => x === '--add-host').length).toBe(2)
  expect(a).toContain('api.example:10.0.0.1')
  for (const bad of ['-v', '--volume', '--mount', '--privileged', '--cap-add', '--pid', '--ipc', '--network', '--memory-swap']) expect(a).not.toContain(bad)
  expect(a.join(' ')).not.toContain('docker.sock')
  expect(boxArgs({ ...box, hosts: [] })).not.toContain('--add-host')
  expect(API_HOSTS).toEqual(['api.anthropic.com', 'console.anthropic.com', 'platform.claude.com', 'claude.ai'])
})

test('fwScript drops by default and opens only 443 to the given addresses', () => {
  const s = fwScript(['10.0.0.1', '172.17.0.9'])
  expect(s.startsWith('set -e')).toBe(true)
  for (const c of ['iptables', 'ip6tables']) for (const ch of ['INPUT', 'OUTPUT', 'FORWARD']) expect(s).toContain(`${c} -P ${ch} DROP`)
  expect(s).toContain('-o lo -j ACCEPT')
  expect(s).toContain('-i lo -j ACCEPT')
  expect(s.match(/ESTABLISHED,RELATED/g).length).toBe(4)
  const opens = s.split('\n').filter((l) => l.includes('--dport'))
  expect(opens).toEqual(['iptables -A OUTPUT -p tcp --dport 443 -d 10.0.0.1/32 -j ACCEPT', 'iptables -A OUTPUT -p tcp --dport 443 -d 172.17.0.9/32 -j ACCEPT'])
  expect(fwScript([])).not.toContain('--dport')
  expect(() => fwScript(['1.2.3.4; reboot'])).toThrow()
  expect(() => fwScript(['::1'])).toThrow()
})

test('netScript probes each address on 443 and each blocked target; netOk reads the lines', () => {
  const blocked = [{ host: '1.1.1.1', port: 443 }, { host: 'github.com', port: 443 }, { host: '172.17.0.1', port: 5432 }]
  const s = netScript(['10.0.0.1'], blocked)
  expect(s).toContain('nc -zw4 10.0.0.1 443')
  expect(s).toContain('nc -zw4 172.17.0.1 5432')
  expect(s).toContain('ip -6 addr show dev eth0 | grep -c inet6')
  expect(() => netScript(['10.0.0.1'], [{ host: 'a;b', port: 1 }])).toThrow()
  const good = 'reach 10.0.0.1:443\nblocked 1.1.1.1:443\nblocked github.com:443\nblocked 172.17.0.1:5432\nv6 0\n'
  expect(netOk(good, ['10.0.0.1'], blocked)).toBeNull()
})

test('netOk refuses a blocked address that answers and an allowed one that does not', () => {
  const blocked = [{ host: '1.1.1.1', port: 443 }, { host: 'github.com', port: 443 }]
  const ok = ['reach 10.0.0.1:443', 'blocked 1.1.1.1:443', 'blocked github.com:443', 'v6 0']
  const with_ = (f) => f(ok).join('\n')
  expect(netOk(with_((l) => l.map((x) => x === 'blocked 1.1.1.1:443' ? 'reach 1.1.1.1:443' : x)), ['10.0.0.1'], blocked)).toContain('1.1.1.1:443')
  expect(netOk(with_((l) => l.map((x) => x === 'reach 10.0.0.1:443' ? 'blocked 10.0.0.1:443' : x)), ['10.0.0.1'], blocked)).toContain('10.0.0.1:443')
  expect(netOk(with_((l) => l.filter((x) => !x.includes('github'))), ['10.0.0.1'], blocked)).toContain('github.com:443')
  expect(netOk(with_((l) => l.map((x) => x === 'v6 0' ? 'v6 1' : x)), ['10.0.0.1'], blocked)).toContain('IPv6')
  expect(netOk(with_((l) => l.filter((x) => !x.startsWith('v6'))), ['10.0.0.1'], blocked)).toContain('IPv6')
  expect(netOk('', ['10.0.0.1'], blocked)).not.toBeNull()
  expect(netOk(ok.join('\n'), [], blocked)).not.toBeNull() // no allowed address: nothing proves the firewall lets the API through
})
