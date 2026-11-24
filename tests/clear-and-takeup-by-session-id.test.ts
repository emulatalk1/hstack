// Acceptance tests of spec 11 (`docs/specs/2026-11-24-clear-and-takeup-by-session-id.md`), written from the spec
// alone: the hooks and the script, behaviours 1 to 18 and 21. Each test names its behaviour by its number.
// The texts (the step 4 skill, the README, CLAUDE.md, the version) are in tests/clear-and-takeup-by-session-id-texts.test.ts.
// Run: bun test tests/clear-and-takeup-by-session-id.test.ts
// Every scene makes scratch repositories and a state folder of its own under the system's temporary folder (HSTACK_STATE,
// and HOME pointed there too). The environment of every command is built here: every CLAUDE* variable of the shell that
// runs the tests is removed, and CLAUDE_PID and CLAUDE_CODE_SESSION_ID are set only where a behaviour names them, so the
// tests give the same result in a Claude Code session and in a plain terminal.
// The end hook's verb is the one the entry SessionEnd of hooks/hooks.json names (the spec leaves the verb to the builder).
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const ROOT = resolve(import.meta.dir, '..')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-clear-session-id-')))
afterAll(() => rmSync(T, { recursive: true, force: true }))

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith('CLAUDE') && !['HSTACK_STATE', 'HSTACK_FEEDBACK_REPO'].includes(k) && !k.startsWith('GIT_')) CLEAN[k] = v
CLEAN.HOME = `${T}/home`
mkdirSync(CLEAN.HOME, { recursive: true })

type Out = { code: number; out: string; err: string }
const sh = (cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode ?? -1, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

type HookEntry = { matcher?: string; hooks?: { type?: string; command?: string }[] }
const hooksJson = () => (JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf8')) as { hooks?: Record<string, HookEntry[]> }).hooks ?? {}
const commandsOf = (event: string) => (hooksJson()[event] ?? []).flatMap((e) => e.hooks ?? []).map((x) => x.command ?? '')
// the verb of the end hook: the one word after scripts/hstack.ts in the command of the entry SessionEnd
function endVerb(): string {
  const cmds = commandsOf('SessionEnd')
  expect(`hooks/hooks.json has an entry SessionEnd with one command: ${cmds.length}`).toBe('hooks/hooks.json has an entry SessionEnd with one command: 1')
  const m = /^bun "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hstack\.ts" (\S+)$/.exec(cmds[0] ?? '')
  expect(`the SessionEnd command is bun "\${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" <one verb>: ${m !== null} (${cmds[0]})`).toBe(`the SessionEnd command is bun "\${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" <one verb>: true (${cmds[0]})`)
  if (!m) throw new Error('no end hook verb in hooks/hooks.json')
  return m[1]
}

let n = 0
// a CLAUDE_PID: a number of its own for each call, never one of another scene
const pid = () => String(process.pid * 1000 + ++n)
const noRepo = () => { const d = `${T}/norepo-${++n}`; mkdirSync(d, { recursive: true }); expect(sh(['git', 'rev-parse', '--git-dir'], d, {}).code).not.toBe(0); return d }
function gitRepo(path: string) {
  mkdirSync(`${path}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], path, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${path}/src/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  return git
}

const HELD = '{"decision":"block"'
const NOT_RECORDED = 'steps not recorded'
type Env = { pid?: string; sid?: string }
const envOf = (e: Env) => ({ ...(e.pid === undefined ? {} : { CLAUDE_PID: e.pid }), ...(e.sid === undefined ? {} : { CLAUDE_CODE_SESSION_ID: e.sid }) })

// a scene: the project's folder (a git repository), a worktree W beside it, a state folder of its own; every hook gets
// CLAUDE_PROJECT_DIR = the project's folder, a session_id and a cwd
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`, W = `${dir}/w`
  const git = gitRepo(repo)
  expect(git('worktree', 'add', '-q', '-b', 'worktree-w', W, 'HEAD').code).toBe(0)
  const hookRun = (verb: string, input: string | undefined, e: Env = {}) => sh([BUN, SCRIPT, verb], repo, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo, ...envOf(e) }, input)
  const json = (id: string, event: string, cwd: string, extra: Record<string, unknown>) => JSON.stringify({ session_id: id, hook_event_name: event, ...extra, cwd })
  // the script's verbs, typed in a folder; CLAUDE_CODE_SESSION_ID only when given
  const h = (cwd: string, args: string[], sid?: string) => sh([BUN, SCRIPT, ...args], cwd, { HSTACK_STATE: state, ...envOf({ sid }) })
  const startHook = (id: string, source: string, cwd: string, p?: string) => {
    const r = hookRun('hook-start', json(id, 'SessionStart', cwd, { source }), { pid: p })
    expect(`the start hook (${source}, ${id}) exits 0: ${r.code}`).toBe(`the start hook (${source}, ${id}) exits 0: 0`)
    return r.out
  }
  const endHook = (id: string, reason: string, cwd: string, p?: string) => {
    const r = hookRun(endVerb(), json(id, 'SessionEnd', cwd, { reason }), { pid: p })
    expect(`the end hook (${reason}, ${id}): exit ${r.code}, printed "${r.out}"`).toBe(`the end hook (${reason}, ${id}): exit 0, printed ""`)
  }
  const clear = (old: string, neu: string, cwd: string, p: string) => { endHook(old, 'clear', cwd, p); return startHook(neu, 'clear', cwd, p) }
  const prompt = (id: string, cwd: string) => { const r = hookRun('hook-prompt', json(id, 'UserPromptSubmit', cwd, { prompt: 'a request' })); expect(r.code).toBe(0) }
  const stop = (id: string, cwd: string) => { const r = hookRun('hook-stop', json(id, 'Stop', cwd, { stop_hook_active: false })); expect(r.code).toBe(0); return r.out }
  const wt = (id: string, cwd: string, toolInput: Record<string, unknown> = { name: 'other-work' }) => hookRun('hook-worktree', json(id, 'PreToolUse', cwd, { tool_name: 'EnterWorktree', tool_input: toolInput })).out
  // a session holds the run of the work tree wt when its stop hook there holds with "steps not recorded"
  const holds = (id: string, wt: string) => { const o = stop(id, wt); return o.startsWith(HELD) && o.includes(NOT_RECORDED) }
  const expectHolds = (id: string, at: string, yes: boolean, what = '') =>
    expect(`${what}session ${id} holds the run of ${at === W ? 'W' : at}: ${holds(id, at)}`).toBe(`${what}session ${id} holds the run of ${at === W ? 'W' : at}: ${yes}`)
  // a spec shown by session id in the work tree at (no approval)
  const shown = (id: string, at: string) => {
    prompt(id, at)
    expect(h(at, ['start']).code).toBe(0)
    const f = `${dir}/2026-11-25-feature-${++n}.md`; writeFileSync(f, 'what the feature does\n')
    expect(h(at, ['spec', f]).code).toBe(0)
    expect(stop(id, at)).toBe('') // the turn that shows the spec ends
    return f
  }
  // an approved run of session id in the work tree at; approve run with CLAUDE_CODE_SESSION_ID sid when given
  const approved = (id: string, at: string, sid?: string) => {
    const f = shown(id, at)
    prompt(id, at)
    expect(h(at, ['approve'], sid).out).toBe('approved')
    return f
  }
  // the scene most behaviours start from: session A started in the project's folder, and A's run in W
  const runOfA = () => { startHook('A', 'startup', repo); return approved('A', W) }
  const takeup = (at: string, sid?: string) => h(at, ['takeup'], sid)
  return { dir, repo, state, W, git, h, startHook, endHook, clear, prompt, stop, wt, holds, expectHolds, shown, approved, runOfA, takeup }
}
const specName = (f: string) => f.slice(f.lastIndexOf('/') + 1).replace(/\.md$/, '')
const expectTakenUp = (r: Out, what: string) => expect(`${what}: exit ${r.code}, ${r.out} ${r.err.trim()}`).toBe(`${what}: exit 0, ${r.out} ${r.err.trim()}`)

// ---------- behaviour 1: the entry SessionEnd ----------

test('1: hooks/hooks.json holds an entry SessionEnd whose command is bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" followed by one verb, and still holds SessionStart, UserPromptSubmit, PreToolUse and Stop', () => {
  const verb = endVerb()
  expect(verb).not.toBe('')
  for (const event of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Stop']) {
    const has = commandsOf(event).some((c) => c.includes('${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts'))
    expect(`hooks/hooks.json still holds the entry ${event}: ${has}`).toBe(`hooks/hooks.json still holds the entry ${event}: true`)
  }
})

// ---------- behaviour 2: the end hook prints nothing and exits 0 ----------

test('2: the end hook exits 0 and prints nothing with no input, with input that is not JSON, and with any reason', () => {
  const s = scene()
  s.runOfA()
  const verb = endVerb()
  const inputs: [string, string | undefined][] = [['no input', undefined], ['empty input', ''], ['input that is not JSON', 'this is not json {'], ['a JSON array', '[1,2]']]
  for (const reason of ['clear', 'logout', 'prompt_input_exit', 'other', 'bypass_permissions_disabled', 'resume', 'no-such-reason'])
    inputs.push([`reason ${reason}`, JSON.stringify({ session_id: 'A', hook_event_name: 'SessionEnd', reason, cwd: s.W })])
  inputs.push(['a reason that is not a string', JSON.stringify({ session_id: 'A', hook_event_name: 'SessionEnd', reason: 7, cwd: s.W })])
  inputs.push(['no session_id', JSON.stringify({ hook_event_name: 'SessionEnd', reason: 'clear', cwd: s.W })])
  for (const [what, input] of inputs) for (const p of [undefined, pid()]) {
    const r = sh([BUN, SCRIPT, verb], s.repo, { HSTACK_STATE: s.state, CLAUDE_PROJECT_DIR: s.repo, ...envOf({ pid: p }) }, input)
    expect(`the end hook, ${what}, ${p ? 'with' : 'without'} CLAUDE_PID: exit ${r.code}, printed "${r.out}"`).toBe(`the end hook, ${what}, ${p ? 'with' : 'without'} CLAUDE_PID: exit 0, printed ""`)
  }
})

// ---------- behaviours 3 and 4: the owner's own clear hands its run to the new id ----------

for (const where of ['in W', 'in the project\'s folder', 'in no git repository'] as const) {
  test(`3: after the end hook (clear, A, P) and the start hook (clear, N, P) with the start hook's cwd ${where}, N holds A's run and A does not, and the worktree hook of N refuses the tool`, () => {
    const s = scene()
    s.runOfA()
    const P = pid()
    const cwd = where === 'in W' ? s.W : where === 'in the project\'s folder' ? s.repo : noRepo()
    s.endHook('A', 'clear', s.W, P)
    s.startHook('N', 'clear', cwd, P)
    s.expectHolds('A', s.W, false)
    s.expectHolds('N', s.W, true)
    const r = s.wt('N', s.W, { name: 'other-work' })
    expect(`the worktree hook of N refuses the tool: ${r.includes('"permissionDecision":"deny"')} (${r})`).toBe(`the worktree hook of N refuses the tool: true (${r})`)
  })
}

for (const where of ['in the project\'s folder (another work tree than W)', 'in no git repository'] as const) {
  test(`4: when the end hook's cwd is ${where}, N still holds the run after the clear`, () => {
    const s = scene()
    s.runOfA()
    const P = pid()
    s.endHook('A', 'clear', where.startsWith('in the project') ? s.repo : noRepo(), P)
    s.startHook('N', 'clear', s.W, P)
    s.expectHolds('A', s.W, false)
    s.expectHolds('N', s.W, true)
  })
}

// ---------- behaviours 5 and 13: no hand-over without the process's mark; takeup by N then ----------

const NO_MARK = [
  { name: 'the end hook with CLAUDE_PID P, the start hook with CLAUDE_PID Q', end: 'P', start: 'Q' },
  { name: 'the end hook with no CLAUDE_PID', end: undefined, start: 'P' },
  { name: 'the start hook with no CLAUDE_PID', end: 'P', start: undefined },
] as const
const pidFor = (k: 'P' | 'Q' | undefined, P: string, Q: string) => (k === undefined ? undefined : k === 'P' ? P : Q)

for (const c of NO_MARK) {
  test(`5: ${c.name}: N does not hold A's run and A still does`, () => {
    const s = scene()
    s.runOfA()
    const P = pid(), Q = pid()
    s.endHook('A', 'clear', s.W, pidFor(c.end, P, Q))
    s.startHook('N', 'clear', s.W, pidFor(c.start, P, Q))
    s.expectHolds('N', s.W, false)
    s.expectHolds('A', s.W, true)
  })

  test(`13: after a clear with no hand-over (${c.name}) whose start hook ran in W, takeup in W with CLAUDE_CODE_SESSION_ID N takes the run up: N holds it and A does not`, () => {
    const s = scene()
    s.runOfA()
    const P = pid(), Q = pid()
    s.endHook('A', 'clear', s.W, pidFor(c.end, P, Q))
    s.startHook('N', 'clear', s.W, pidFor(c.start, P, Q))
    expectTakenUp(s.takeup(s.W, 'N'), 'takeup in W by N')
    s.expectHolds('A', s.W, false)
    s.expectHolds('N', s.W, true)
  })
}

// ---------- behaviour 6: an end that is not a clear leaves no mark ----------

for (const reason of ['prompt_input_exit', 'other', 'logout']) {
  test(`6: after the end hook with reason ${reason} (A, P), a start hook with source clear (N, P) hands nothing over: N does not hold the run`, () => {
    const s = scene()
    s.runOfA()
    const P = pid()
    s.endHook('A', reason, s.W, P)
    s.startHook('N', 'clear', s.W, P)
    s.expectHolds('N', s.W, false)
    s.expectHolds('A', s.W, true)
  })
}

// ---------- behaviours 7 and 8: the mark is used once; a startup removes its process's mark ----------

test('7: after the hand-over to N, a second start hook with source clear (M, P) with no end hook between hands nothing to M: N still holds the run and M does not', () => {
  const s = scene()
  s.runOfA()
  const P = pid()
  s.clear('A', 'N', s.W, P)
  s.startHook('M', 'clear', s.W, P)
  s.expectHolds('M', s.W, false)
  s.expectHolds('N', s.W, true)
})

test('8: after the end hook (clear, A, P), a start hook with source startup, CLAUDE_PID P and a cwd outside W removes the mark: a later start hook with source clear and CLAUDE_PID P hands nothing over', () => {
  const s = scene()
  s.runOfA()
  const P = pid()
  s.endHook('A', 'clear', s.W, P)
  s.startHook('C', 'startup', s.repo, P)
  s.startHook('N', 'clear', s.W, P)
  s.expectHolds('N', s.W, false)
  s.expectHolds('A', s.W, true)
})

// ---------- behaviours 9 to 11: the review's scenes K1, K2, K0 ----------

test('9 (K1): A\'s run taken up by B (B\'s prompt hook in W, takeup with CLAUDE_CODE_SESSION_ID B); then A is cleared (end clear A P, start clear N P): B still holds the run, and neither A nor N holds it', () => {
  const s = scene()
  s.runOfA()
  s.prompt('B', s.W)
  expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
  s.clear('A', 'N', s.W, pid())
  s.expectHolds('A', s.W, false)
  s.expectHolds('N', s.W, false)
  s.expectHolds('B', s.W, true)
})

test('9 (K1): the same with the start hook of the clear in the project\'s folder', () => {
  const s = scene()
  s.runOfA()
  s.prompt('B', s.W)
  expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
  const P = pid()
  s.endHook('A', 'clear', s.W, P)
  s.startHook('N', 'clear', s.repo, P)
  s.expectHolds('A', s.W, false)
  s.expectHolds('N', s.W, false)
  s.expectHolds('B', s.W, true)
})

test('10 (K2): w shows a spec, x\'s prompt hook runs in its work tree and x approves it (CLAUDE_CODE_SESSION_ID x); then w is cleared (end clear w P, start clear N P): x still holds the run and N does not', () => {
  const s = scene()
  s.startHook('w', 'startup', s.repo)
  s.shown('w', s.W)
  s.prompt('x', s.W)
  expect(s.h(s.W, ['approve'], 'x').out).toBe('approved')
  s.clear('w', 'N', s.W, pid())
  s.expectHolds('N', s.W, false)
  s.expectHolds('w', s.W, false)
  s.expectHolds('x', s.W, true)
})

test('11 (K0): with A\'s run in W, B\'s prompt and stop hooks run in W, A\'s prompt hook runs in W, then B is cleared (end clear B P, start clear N P): A still holds the run, and neither B nor N holds it', () => {
  const s = scene()
  s.runOfA()
  s.prompt('B', s.W)
  expect(s.stop('B', s.W)).toBe('')
  s.prompt('A', s.W)
  s.clear('B', 'N', s.W, pid())
  s.expectHolds('B', s.W, false)
  s.expectHolds('N', s.W, false)
  s.expectHolds('A', s.W, true)
})

// ---------- behaviour 12: the notice of a start hook that is not a startup ----------

for (const source of ['clear', 'resume', 'compact', 'fork']) {
  test(`12: a start hook with source ${source} of a session that does not own the run, in W where A's approved run is not finished, names the run's spec, the steps not recorded and /hstack:build with the spec's name`, () => {
    const s = scene()
    const f = s.runOfA()
    expect(s.h(s.W, ['phase', 'setup']).code).toBe(0)
    const missing = s.h(s.W, ['missing']).out
    expect(missing.startsWith('oracle')).toBe(true)
    const text = s.startHook('C', source, s.W)
    for (const want of [specName(f), missing, `/hstack:build ${specName(f)}`])
      expect(`the text of the start hook (${source}) names "${want}": ${text.includes(want)}`).toBe(`the text of the start hook (${source}) names "${want}": true`)
  })
}

// ---------- behaviour 14: a run made an earlier session's is not handed over at a clear ----------

test('14: A\'s run in W made an earlier session\'s by another session\'s startup in W: after the clear (end clear A P, start clear N P, cwd in W), N does not hold the run, and the start hook\'s text names the spec and /hstack:build with its name', () => {
  const s = scene()
  const f = s.runOfA()
  s.startHook('C', 'startup', s.W)
  const P = pid()
  s.endHook('A', 'clear', s.W, P)
  const text = s.startHook('N', 'clear', s.W, P)
  s.expectHolds('N', s.W, false)
  for (const want of [specName(f), `/hstack:build ${specName(f)}`])
    expect(`the text of the start hook of the clear names "${want}": ${text.includes(want)}`).toBe(`the text of the start hook of the clear names "${want}": true`)
})

// ---------- behaviour 15: scene S44 ----------

test('15 (S44): x\'s startup and prompt hooks run in W, then A\'s prompt hook in W, then takeup in W with CLAUDE_CODE_SESSION_ID x: x holds the run and A does not, also after another prompt hook of A in W', () => {
  const s = scene()
  s.runOfA()
  s.startHook('x', 'startup', s.W)
  s.prompt('x', s.W)
  s.prompt('A', s.W)
  expectTakenUp(s.takeup(s.W, 'x'), 'takeup in W by x')
  s.expectHolds('A', s.W, false, 'right after the take-up: ')
  s.expectHolds('x', s.W, true, 'right after the take-up: ')
  s.prompt('A', s.W)
  s.expectHolds('A', s.W, false, 'after another prompt hook of A: ')
  s.expectHolds('x', s.W, true, 'after another prompt hook of A: ')
})

// ---------- behaviour 16: the worktree hook with W's path counts as coming ----------

test('16 (guard: the base already gives the run to the last to come): B\'s worktree hook for EnterWorktree with W\'s path, and no hook of B in W: takeup in W with CLAUDE_CODE_SESSION_ID B takes the run up and B holds it', () => {
  const s = scene()
  s.runOfA()
  expect(s.wt('B', s.repo, { path: s.W })).toBe('')
  expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
  s.expectHolds('A', s.W, false)
  s.expectHolds('B', s.W, true)
})

test('16: B came to W by its worktree hook with W\'s path, and A\'s prompt hook ran in W after it: takeup in W with CLAUDE_CODE_SESSION_ID B still takes the run up and B holds it', () => {
  const s = scene()
  s.runOfA()
  expect(s.wt('B', s.repo, { path: s.W })).toBe('')
  s.prompt('A', s.W)
  expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
  s.expectHolds('A', s.W, false)
  s.expectHolds('B', s.W, true)
})

// ---------- behaviour 17: takeup by the owner and by another session, with and without stale ----------

for (const last of ['A', 'B'] as const) {
  test(`17: a run of A that is not an earlier session's, B came to W, ${last}'s hook came last: takeup with CLAUDE_CODE_SESSION_ID A refuses with "the run is this session's", and A still holds the run`, () => {
    const s = scene()
    s.runOfA()
    if (last === 'B') { s.prompt('A', s.W); s.prompt('B', s.W) } else { s.prompt('B', s.W); s.prompt('A', s.W) }
    const r = s.takeup(s.W, 'A')
    expect(`takeup by A: exit ${r.code}, says "the run is this session's": ${r.err.includes('the run is this session\'s')}`).toBe('takeup by A: exit 1, says "the run is this session\'s": true')
    s.expectHolds('B', s.W, false)
    s.expectHolds('A', s.W, true)
  })

  test(`17: a run of A that is not an earlier session's, B came to W, ${last}'s hook came last: takeup with CLAUDE_CODE_SESSION_ID B takes the run up: B holds it, A does not`, () => {
    const s = scene()
    s.runOfA()
    if (last === 'B') { s.prompt('A', s.W); s.prompt('B', s.W) } else { s.prompt('B', s.W); s.prompt('A', s.W) }
    expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
    s.expectHolds('A', s.W, false)
    s.expectHolds('B', s.W, true)
  })
}

test('17: A\'s run made an earlier session\'s by C\'s startup in W: takeup with CLAUDE_CODE_SESSION_ID A takes it up: A holds it again', () => {
  const s = scene()
  s.runOfA()
  s.startHook('C', 'startup', s.W)
  s.expectHolds('A', s.W, false, 'before the take-up (an earlier session\'s run): ')
  expectTakenUp(s.takeup(s.W, 'A'), 'takeup in W by A')
  s.expectHolds('C', s.W, false)
  s.expectHolds('A', s.W, true)
})

test('17: A\'s run made an earlier session\'s by C\'s startup in W after B came: takeup with CLAUDE_CODE_SESSION_ID B takes it up: B holds it, A does not', () => {
  const s = scene()
  s.runOfA()
  s.prompt('B', s.W)
  s.startHook('C', 'startup', s.W)
  expectTakenUp(s.takeup(s.W, 'B'), 'takeup in W by B')
  s.expectHolds('A', s.W, false)
  s.expectHolds('C', s.W, false)
  s.expectHolds('B', s.W, true)
})

// ---------- behaviour 18: an id that no hook brought to the work tree changes nothing ----------
// Each scene is played with no CLAUDE_CODE_SESSION_ID on approve and takeup, then with an id that no hook brought to the
// run's work tree; the session that holds the run (among the scene's sessions) must be the same, and the one spec 10
// says. These pass at the base too: they guard what must stay.

type Scene18 = { name: string; play: (sid: string | undefined) => { holders: string[]; refusal?: boolean } }
const holdersAt = (s: ReturnType<typeof scene>, at: string, ids: string[]) => ids.filter((id) => s.holds(id, at))
// the id D: a session whose one hook (a prompt hook) ran in another work tree of the repository than the run's
const visit = (s: ReturnType<typeof scene>, sid: string | undefined, at: string) => { if (sid === 'D') s.prompt('D', at) }
const SCENES_18: Scene18[] = [
  { name: 'spec 10 behaviour 33 (A\'s run approved with the id; B only passes)', play: (sid) => {
    const s = scene()
    s.startHook('A', 'startup', s.repo)
    s.shown('A', s.W); s.prompt('A', s.W)
    visit(s, sid, s.repo)
    expect(s.h(s.W, ['approve'], sid).out).toBe('approved')
    s.startHook('B', 'startup', s.repo)
    return { holders: holdersAt(s, s.W, ['B', 'A']) }
  } },
  { name: 'spec 10 behaviour 34, B came by its worktree hook with W\'s path', play: (sid) => {
    const s = scene()
    s.runOfA(); s.startHook('B', 'startup', s.repo)
    expect(s.wt('B', s.repo, { path: s.W })).toBe('')
    visit(s, sid, s.repo)
    expectTakenUp(s.takeup(s.W, sid), 'takeup in W')
    return { holders: holdersAt(s, s.W, ['A', 'B']) }
  } },
  { name: 'spec 10 behaviour 34, B came by a hook in W', play: (sid) => {
    const s = scene()
    s.runOfA(); s.startHook('B', 'startup', s.repo)
    s.prompt('B', s.W)
    visit(s, sid, s.repo)
    expectTakenUp(s.takeup(s.W, sid), 'takeup in W')
    return { holders: holdersAt(s, s.W, ['A', 'B']) }
  } },
  { name: 'R1-1: a spec shown by w, approved after x\'s startup and prompt', play: (sid) => {
    const s = scene()
    s.startHook('w', 'startup', s.repo)
    s.shown('w', s.repo)
    s.startHook('x', 'startup', s.repo)
    s.prompt('x', s.repo)
    visit(s, sid, s.W)
    expect(s.h(s.repo, ['approve'], sid).out).toBe('approved')
    return { holders: holdersAt(s, s.repo, ['w', 'x']) }
  } },
  { name: 'R1-2: B passed through W, then A judged W again', play: (sid) => {
    const s = scene()
    s.runOfA(); s.startHook('B', 'startup', s.repo)
    expect(s.stop('B', s.W)).toBe('')
    s.prompt('A', s.W)
    visit(s, sid, s.repo)
    const r = s.takeup(s.W, sid)
    return { holders: holdersAt(s, s.W, ['B', 'A']), refusal: r.code === 1 && r.err.includes('the run is this session\'s') }
  } },
  { name: 'R2-1: x only opened the project beside w\'s waiting spec; w approves', play: (sid) => {
    const s = scene()
    s.startHook('w', 'startup', s.repo)
    s.shown('w', s.repo)
    s.startHook('x', 'startup', s.repo)
    s.prompt('w', s.repo)
    visit(s, sid, s.W)
    expect(s.h(s.repo, ['approve'], sid).out).toBe('approved')
    return { holders: holdersAt(s, s.repo, ['w', 'x']) } // w first: a run that is no session's goes to the next hook with an id (spec 10)
  } },
]
const EXPECTED_18: Record<string, { holders: string[]; refusal?: boolean }> = {
  'spec 10 behaviour 33 (A\'s run approved with the id; B only passes)': { holders: ['A'] },
  'spec 10 behaviour 34, B came by its worktree hook with W\'s path': { holders: ['B'] },
  'spec 10 behaviour 34, B came by a hook in W': { holders: ['B'] },
  'R1-1: a spec shown by w, approved after x\'s startup and prompt': { holders: ['x'] },
  'R1-2: B passed through W, then A judged W again': { holders: ['A'], refusal: true },
  'R2-1: x only opened the project beside w\'s waiting spec; w approves': { holders: ['w'] },
}
for (const sc of SCENES_18) for (const stranger of ['stranger', 'D'] as const) {
  test(`18 (guard): ${sc.name}: approve and takeup with CLAUDE_CODE_SESSION_ID ${stranger === 'D' ? 'D (a session whose one hook ran in another work tree)' : 'of a session no hook ran for'} decide as with none`, () => {
    const none = sc.play(undefined)
    expect(none).toEqual(EXPECTED_18[sc.name])
    const withId = sc.play(stranger)
    expect(withId).toEqual(none)
  })
}

// ---------- behaviour 21: the start text while a spec waits ----------

test('21: the text that the start hook prints while a spec waits no longer asks to tell the user to type the command; it says that once /hstack:build was typed in the session, the next message is the answer, with no command', () => {
  const s = scene()
  s.startHook('w', 'startup', s.repo)
  s.shown('w', s.repo)
  for (const source of ['startup', 'resume', 'clear']) {
    const text = s.startHook(source === 'startup' ? 'x' : 'w', source, s.repo)
    const i = text.indexOf('A spec waits for the user\'s approval')
    expect(`the start text (${source}) names the waiting spec: ${i >= 0}`).toBe(`the start text (${source}) names the waiting spec: true`)
    const flat = text.replace(/\s+/g, ' '), line = (text.split('\n').find((l) => l.includes('A spec waits for the user\'s approval')) ?? '').replace(/\s+/g, ' ')
    expect(`the start text (${source}) holds "If the user answers it without that command, tell them to type it": ${flat.includes('If the user answers it without that command, tell them to type it')}`)
      .toBe(`the start text (${source}) holds "If the user answers it without that command, tell them to type it": false`)
    // the words are the builder's: the text says that the user has typed /hstack:build in the session, and that the
    // next message is then the answer, with no command
    const says = (what: string, re: RegExp) => expect(`the start text (${source}) says ${what}: ${re.test(line)}`).toBe(`the start text (${source}) says ${what}: true`)
    says('that the user has typed /hstack:build in the session', /\b(has|have|had|once|after|when|since)\b[^.]{0,60}\btyped\b[^.]{0,40}\/hstack:build|\/hstack:build[^.]{0,80}\b(was|has been|is) typed\b/i)
    says('that the next message is then the answer', /next message[^.]{0,80}\b(is|as) (the|their|its) answer\b/i)
    says('that it needs no command', /\b(with no|without (a |the |any )?|needs no|no (other |new |further )?)(command|\/hstack:build)\b|\bno need[^.]{0,40}(command|type)/i)
  }
})
