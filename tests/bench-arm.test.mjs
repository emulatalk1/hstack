import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { armArgs, countInterventions, initInfo, probeOk } from '../bench/lib/arm.mjs'
import { claudeArgs } from '../bench/lib/agent.mjs'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

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
  expect(armArgs('B', cfg)).toEqual({ model: 'big', pluginDirs: [], appendSystemPrompt: undefined })
  expect(armArgs('B-', cfg)).toEqual({ model: 'small', pluginDirs: [], appendSystemPrompt: 'Write no tests. Do not run or check your work. Stop after one pass.' })
  expect(armArgs('H', cfg)).toEqual({ model: 'big', pluginDirs: ['/h', '/dep'], appendSystemPrompt: undefined })
  expect(armArgs('W', cfg)).toEqual({ model: 'big', pluginDirs: ['/w'], appendSystemPrompt: undefined })
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
writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [], W: [] }, turnTimeoutSec: 20 }))
const task = join(tmp, 'task.json')
writeFileSync(task, JSON.stringify({ name: 't1', repo, db: null, port: 4999, start: 'true', ready: 'http://127.0.0.1:4999/', oracle: 'true', junit: 'r.xml' }))

// STUB_DONE: the turn (0 = the first prompt, 1 = the first resume) that answers DONE, or never; STUB_PLUGINS: the probe's plugin list;
// STUB_PLANT: a marker file the main turn's planted post-commit hook and fsmonitor would write (it also plants a tag);
// STUB_SAY: text the main turn writes in its transcript
const stub = join(tmp, 'claude-stub')
writeFileSync(stub, `#!/usr/bin/env bun
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
const a = process.argv.slice(2), probe = a[1] === 'Reply OK.'
const prev = existsSync(process.env.STUB_LOG) ? readFileSync(process.env.STUB_LOG, 'utf8').trim().split('\\n').length - 1 : 0 // main turns so far
appendFileSync(process.env.STUB_LOG, JSON.stringify({ probe, args: a, cwd: process.cwd(), files: readdirSync(process.cwd()).sort(), env: Object.keys(process.env).filter((k) => /BENCH/.test(k)) }) + '\\n')
const say = (o) => console.log(JSON.stringify(o))
say({ type: 'system', subtype: 'init', claude_code_version: '9.9.9', tools: ['Bash'], slash_commands: [], plugins: JSON.parse(process.env.STUB_PLUGINS ?? '[]') })
say({ type: 'assistant', message: { id: 'm', model: probe ? 'probe-m' : 'main-m', usage: {}, content: [{ type: 'text', text: !probe && prev === 0 ? process.env.STUB_SAY ?? '' : '' }] } })
if (!probe) writeFileSync('made.txt', 'turn ' + prev + '\\n')
const mark = process.env.STUB_PLANT
if (!probe && prev === 0 && mark) {
  Bun.spawnSync(['git', 'tag', 'planted'])
  mkdirSync('.git/hooks', { recursive: true })
  for (const f of ['.git/hooks/post-commit', '.git/fsmon']) { writeFileSync(f, '#!/bin/sh\\necho ' + f + ' >> ' + mark + '\\n'); chmodSync(f, 0o755) }
  Bun.spawnSync(['git', 'config', 'core.fsmonitor', process.cwd() + '/.git/fsmon'])
}
const done = !probe && String(prev) === process.env.STUB_DONE
say({ type: 'result', subtype: 'success', result: probe ? 'OK' : done ? ' DONE\\n' : 'Which colour should it be?', usage: { input_tokens: probe ? 1 : 10, output_tokens: 2 } })
`)
chmodSync(stub, 0o755)

const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [])
const cli = async (args, env = {}) => {
  rmSync(log, { force: true })
  const p = Bun.spawn(['bun', '-e', `import { runArm } from '${join(import.meta.dir, '../bench/run-arm.mjs')}'; try { process.exit(await runArm(JSON.parse(process.argv[1]), { root: '${sub}' })) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(data, 'machine.json'), BENCH_CLAUDE: stub, STUB_LOG: log, ...env }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  return { stdout, stderr, code }
}
const run = (arm, n) => [task, arm, String(n), '--input', join(data, 'p1/input.md'), '--at', 'HEAD~1']
const result = (id) => JSON.parse(readFileSync(join(data, 'results', `${id}.json`), 'utf8'))
const show = (ref) => Bun.spawnSync(['git', '-C', repo, 'show', ref]).stdout.toString()
const opt = (args, flag) => args[args.indexOf(flag) + 1]

test('run-arm: a question then DONE on the first resume is one intervention, and the product is a branch of the task repo', async () => {
  mkdirSync(join(data, 'results', 'p1-B-1'), { recursive: true }); writeFileSync(join(data, 'results', 'p1-B-1', '9-stale.jsonl'), '')
  const marker = join(tmp, 'planted-marker')
  const r = await cli(run('B', 1), { STUB_DONE: '1', STUB_PLANT: marker })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-B-1 done\n' })
  const [probe, main, resume, ...rest] = calls()
  expect(rest).toEqual([])
  expect(probe.probe).toBe(true)
  expect(probe.args).not.toContain('--session-id')
  expect(main.args[1]).toBe('INPUT of p1\n\n\nWhen the task is done, reply exactly DONE.')
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
  expect(git('tag').stdout.toString()).toBe('') // the agent's tag stays out of the copy
  expect(existsSync(marker)).toBe(false) // neither its post-commit hook nor its fsmonitor ran
  expect(show('bench/p1-B-1~1').split('\n')).toContain('    base ' + git('rev-parse', '--short=7', 'HEAD~1').stdout.toString().trim())
  const res = result('p1-B-1')
  expect(res).toMatchObject({ task: 'p1', arm: 'B', run: 1, status: 'done', resumes: ['other'], interventions: 1, branch: 'bench/p1-B-1', plugins: [], version: '9.9.9', leak: false, leakTurns: [],
    usage: { input: 20, output: 4 }, transcripts: dir, probeUsage: { input: 1, output: 2 }, models: ['main-m'], probeModels: ['probe-m'] })
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

test('run-arm flags the turns whose transcript names the data folder or the task repo, also by their resolved path', async () => {
  const link = join(tmp, 'data-link'); symlinkSync(data, link)
  const viaLink = { HSTACK_BENCH_MACHINE: join(link, 'machine.json') }
  expect(await cli(run('B', 6), { ...viaLink, STUB_DONE: '1', STUB_SAY: `I read ${data}/p1/oracle/a.spec.ts` })).toMatchObject({ code: 0 })
  expect(result('p1-B-6')).toMatchObject({ leak: true, leakTurns: ['1-main.jsonl'] })
  expect(await cli(run('B', 7), { STUB_DONE: '0', STUB_SAY: `git -C ${repo} log` })).toMatchObject({ code: 0 })
  expect(result('p1-B-7')).toMatchObject({ leak: true, leakTurns: ['1-main.jsonl'] })
})

test('run-arm records each plugin dir with its name, commit and whether it is dirty', async () => {
  const hp = join(tmp, 'hp-repo'), plain = join(tmp, 'plain')
  mkdirSync(join(hp, '.claude-plugin'), { recursive: true }); mkdirSync(plain)
  writeFileSync(join(hp, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'hp' }))
  const hg = (...a) => Bun.spawnSync(['git', '-C', hp, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
  hg('init', '-q'); hg('add', '.'); hg('commit', '-qm', 'p'); writeFileSync(join(hp, 'new.md'), 'x')
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [hp, plain], W: [] }, turnTimeoutSec: 20 }))
  const r = await cli(run('H', 1), { STUB_DONE: '0', STUB_PLUGINS: JSON.stringify([{ name: 'hp', path: hp }, { name: 'plain', path: plain }]) })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-H-1 done\n' })
  expect(result('p1-H-1').plugins).toEqual([{ dir: hp, name: 'hp', commit: hg('rev-parse', 'HEAD'), dirty: true }, { dir: plain, name: 'plain', commit: null, dirty: false }])
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [], W: [] }, turnTimeoutSec: 20 }))
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

test('run-arm refuses a task with a database, an unknown arm, a missing plugin dir and an existing branch, before any call', async () => {
  const err = async (args, want, env = {}) => { const r = await cli(args, env); expect(r.code).toBe(2); expect(r.stderr).toContain(want); expect(calls()).toEqual([]) }
  const dbTask = join(tmp, 'task-db.json')
  writeFileSync(dbTask, JSON.stringify({ ...JSON.parse(readFileSync(task, 'utf8')), db: 'bench_x' }))
  await err([dbTask, ...run('B', 3).slice(1)], 'arm runs have no database guard yet')
  await err(run('X', 3), 'arm')
  await err(run('B', 0), 'run')
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [join(tmp, 'nope')], W: [] } }))
  await err(run('H', 3), 'nope')
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ plugins: { H: [], W: [] } }))
  await err(run('B', 3), 'smallModel')
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [], W: [] }, turnTimeoutSec: 20 }))
  git('branch', 'bench/p1-W-3', 'HEAD')
  await err(run('W', 3), 'bench/p1-W-3')
  mkdirSync(join(data, 'p..1')); writeFileSync(join(data, 'p..1/input.md'), 'x\n')
  await err([task, 'B', '3', '--input', join(data, 'p..1/input.md'), '--at', 'HEAD~1'], 'not a valid git ref')
})

test('run-arm kills a turn that outlives turnTimeoutSec and abandons the run', async () => {
  writeFileSync(join(data, 'arms.json'), JSON.stringify({ smallModel: 'small-m', plugins: { H: [], W: [] }, turnTimeoutSec: 1 }))
  const slow = join(tmp, 'claude-slow')
  writeFileSync(slow, `#!/bin/sh\ncase "$2" in "Reply OK.") exec "${stub}" "$@";; esac\nsleep 60\n`)
  chmodSync(slow, 0o755)
  const t0 = Date.now()
  const r = await cli(run('W', 4), { BENCH_CLAUDE: slow })
  expect(r).toMatchObject({ code: 0, stdout: 'p1-W-4 abandoned\n' })
  expect(Date.now() - t0).toBeLessThan(15000)
  expect(result('p1-W-4')).toMatchObject({ status: 'abandoned', resumes: [], interventions: 3, reason: 'timeout' })
  expect(result('p1-W-4').turns.at(-1)).toEqual({ turn: 'main', code: null, timedOut: true })
  expect(show('bench/p1-W-4:a.txt')).toBe('base\n')
})
