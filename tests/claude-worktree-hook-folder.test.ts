// Acceptance tests of spec 10 (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.md`), written from the spec
// alone: the hooks and the script, behaviours 3, 13 to 30 and 33 to 38. Each test names its behaviour by its number.
// The texts (the playbook, the README, CLAUDE.md, the agents, the version, the skill's name) are in
// tests/claude-worktree-hook-folder-texts.test.ts.
// Run: bun test tests/claude-worktree-hook-folder.test.ts
// Every scene makes scratch repositories and a state folder of its own under the system's temporary folder
// (HSTACK_STATE, and HOME pointed there too), so the machine's ~/.hstack is never touched. No test waits for the clock:
// where the clock matters (behaviour 38), the script is run with a preload that moves Date.now() by a given offset.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const ROOT = resolve(dirname(SCRIPT), '..')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-claude-worktree-test-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe)

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO' && !k.startsWith('GIT_')) CLEAN[k] = v
CLEAN.HOME = `${T}/home`
mkdirSync(CLEAN.HOME, { recursive: true })

// a preload that moves the script's clock: Date.now() + HSTACK_TEST_CLOCK_OFFSET seconds
const PRELOAD = `${T}/clock.ts`
writeFileSync(PRELOAD, 'const o = Number(process.env.HSTACK_TEST_CLOCK_OFFSET || 0) * 1000\nconst r = Date.now\nDate.now = () => r() + o\n')

type Out = { code: number; out: string; err: string }
function sh(cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode ?? -1, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

// the verb of the worktree hook: the one the entry PreToolUse of hooks/hooks.json names (behaviour 26)
function worktreeVerb(): string {
  const j = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf8')) as { hooks?: Record<string, { matcher?: string; hooks?: { command?: string }[] }[]> }
  const entries = j.hooks?.PreToolUse ?? []
  const cmd = entries.flatMap((e) => e.hooks ?? []).map((x) => x.command ?? '').find((c) => c.includes('scripts/hstack.ts')) ?? ''
  expect(`hooks/hooks.json has a PreToolUse entry that runs scripts/hstack.ts: ${cmd !== ''}`).toBe('hooks/hooks.json has a PreToolUse entry that runs scripts/hstack.ts: true')
  const m = /scripts\/hstack\.ts"?\s+(\S+)\s*$/.exec(cmd)
  return m ? m[1] : ''
}

let n = 0
const noRepo = () => { const d = `${T}/norepo-${++n}`; mkdirSync(d, { recursive: true }); expect(sh(['git', 'rev-parse', '--git-dir'], d, {}).code).not.toBe(0); return d }
function gitRepo(path: string) {
  mkdirSync(`${path}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], path, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${path}/src/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  return git
}

// a scene: the project's folder (a git repository), a state folder of its own; every hook gets CLAUDE_PROJECT_DIR =
// the project's folder, a session_id and a cwd
function scene(branch?: string) {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`
  const git = gitRepo(repo)
  if (branch) expect(git('checkout', '-q', '-b', branch).code).toBe(0)
  let offset = 0
  const clock = (seconds: number) => { offset = seconds }
  const run = (args: string[], cwd: string, extra: Record<string, string>, stdin?: string) =>
    sh([BUN, '--preload', PRELOAD, SCRIPT, ...args], cwd, { HSTACK_STATE: state, HSTACK_TEST_CLOCK_OFFSET: String(offset), ...extra }, stdin)
  const project = { CLAUDE_PROJECT_DIR: repo }
  const input = (id: string, event: string, cwd: string | undefined, extra: Record<string, unknown>) => JSON.stringify({ session_id: id, hook_event_name: event, ...extra, ...(cwd === undefined ? {} : { cwd }) })
  // the script's verbs, typed in a folder (the main folder by default)
  const h = (cwd: string, ...args: string[]) => run(args, cwd, {})
  const hookStart = (id: string, source: string, cwd: string = repo) => run(['hook-start'], repo, project, input(id, 'SessionStart', cwd, { source }))
  const prompt = (id: string, cwd: string = repo) => { const r = run(['hook-prompt'], repo, project, input(id, 'UserPromptSubmit', cwd, { prompt: 'a request' })); expect(r.code).toBe(0); return r }
  const stopR = (id: string, cwd: string = repo) => run(['hook-stop'], repo, project, input(id, 'Stop', cwd, { stop_hook_active: false }))
  const stop = (id: string, cwd: string = repo) => { const r = stopR(id, cwd); expect(`the stop hook exits 0: ${r.code}`).toBe('the stop hook exits 0: 0'); return r.out }
  const wtHook = (id: string, cwd: string = repo, tool = 'EnterWorktree', toolInput: Record<string, unknown> = { name: 'other-work' }) => {
    const verb = worktreeVerb()
    return run([verb], repo, project, input(id, 'PreToolUse', cwd, { tool_name: tool, tool_input: toolInput }))
  }
  // a worktree of the project's repository: beside the project's folder, or under .claude/worktrees/ inside it
  const worktree = (name: string, inside = false) => {
    const path = inside ? `${repo}/.claude/worktrees/${name}` : `${dir}/${name}`
    if (inside) exclude()
    expect(git('worktree', 'add', '-q', '-b', `worktree-${name}`, path, 'HEAD').code).toBe(0)
    return path
  }
  const exclude = () => {
    const common = sh(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], repo, {}).out
    const f = `${common}/info/exclude`
    if (!readFileSync(f, 'utf8').split('\n').includes('.claude/worktrees/')) appendFileSync(f, '\n.claude/worktrees/\n')
  }
  // an approved run of session id in the work tree wt, with a spec named name
  const approved = (id: string, wt: string, name: string) => {
    prompt(id, wt)
    expect(h(wt, 'start').code).toBe(0)
    const f = `${dir}/${name}.md`; writeFileSync(f, 'what the feature does\n')
    expect(h(wt, 'spec', f).code).toBe(0)
    ends('the turn that shows the spec', stop(id, wt)) // the first hook that judges the run's work tree after start: id's
    prompt(id, wt)
    expect(h(wt, 'approve').out).toBe('approved')
    return f
  }
  const waitingSpec = (id: string, wt: string, name: string) => {
    prompt(id, wt)
    expect(h(wt, 'start').code).toBe(0)
    const f = `${dir}/${name}.md`; writeFileSync(f, 'what the feature does\n')
    expect(h(wt, 'spec', f).code).toBe(0)
    ends('the turn that shows the spec', stop(id, wt))
    return f
  }
  const finish = (wt: string) => {
    writeFileSync(`${wt}/src/built.txt`, 'the feature\n')
    expect(sh(['git', 'add', '--', 'src/built.txt'], wt, {}).code).toBe(0)
    expect(sh(['git', 'commit', '-qm', 'the feature', '--', 'src/built.txt'], wt, {}).code).toBe(0)
    for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) expect(h(wt, 'phase', p).code).toBe(0)
    expect(h(wt, 'records-check', '--none', 'a test repository with no records').code).toBe(0)
    expect(h(wt, 'phase', 'records').code).toBe(0)
    expect(h(wt, 'done').code).toBe(0)
  }
  const edit = (wt: string) => writeFileSync(`${wt}/src/a.txt`, `changed ${++n}\n`)
  return { dir, repo, state, git, h, hookStart, prompt, stop, stopR, wtHook, worktree, exclude, approved, waitingSpec, finish, edit, clock }
}
type Scene = ReturnType<typeof scene>

const HELD = '{"decision":"block"'
const NOT_RECORDED = 'steps not recorded'
function reason(what: string, out: string): string {
  expect(`${what}: the stop hook holds the turn: ${out.startsWith(HELD)} (printed "${out}")`).toBe(`${what}: the stop hook holds the turn: true (printed "${out}")`)
  if (!out.startsWith(HELD)) return ''
  const o = JSON.parse(out) as { decision?: string; reason?: unknown }
  expect(o.decision).toBe('block')
  return String(o.reason)
}
const has = (what: string, text: string, phrase: string) => expect(`${what} holds "${phrase}": ${text.includes(phrase)}`).toBe(`${what} holds "${phrase}": true`)
const lacks = (what: string, text: string, phrase: string) => expect(`${what} holds "${phrase}": ${text.includes(phrase)}`).toBe(`${what} holds "${phrase}": false`)
const ends = (what: string, out: string) => expect(`${what}: the stop hook printed "${out}"`).toBe(`${what}: the stop hook printed ""`)
const heldWith = (what: string, out: string, ...phrases: string[]) => { const r = reason(what, out); for (const p of phrases) has(`${what}: the reason`, r, p) }

// the worktree hook: refused = JSON with hookSpecificOutput.permissionDecision "deny" and a reason; let run = nothing
function refused(what: string, r: Out): string {
  expect(`${what}: the worktree hook exits 0: ${r.code}`).toBe(`${what}: the worktree hook exits 0: 0`)
  let o: { hookSpecificOutput?: { permissionDecision?: unknown; permissionDecisionReason?: unknown } } = {}
  try { o = JSON.parse(r.out) } catch { /* not JSON */ }
  expect(`${what}: the worktree hook refuses the tool: ${o.hookSpecificOutput?.permissionDecision === 'deny'} (printed "${r.out}")`).toBe(`${what}: the worktree hook refuses the tool: true (printed "${r.out}")`)
  const why = o.hookSpecificOutput?.permissionDecisionReason
  expect(`${what}: the refusal has a reason: ${typeof why === 'string' && why !== ''}`).toBe(`${what}: the refusal has a reason: true`)
  return String(why ?? '')
}
function letsRun(what: string, r: Out) {
  expect(`${what}: the worktree hook exits 0 and prints nothing: exit ${r.code}, printed "${r.out}"`).toBe(`${what}: the worktree hook exits 0 and prints nothing: exit 0, printed ""`)
}

const SPEC_P = '2026-11-24-feature-p' // the run of the earlier session, in the project's folder
const SPEC_W = '2026-11-24-feature-w' // the run of this session, in the worktree W

// an approved run of this session ("x") in the project's folder that is not finished
function ownRun(s: Scene, id = 'x') {
  s.hookStart(id, 'startup')
  s.approved(id, s.repo, SPEC_P)
  expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
}

// ---------- behaviour 3: the new worktree leaves the unfinished run's folder as it was ----------

test('3 (holds at the base, and must stay): beside an unfinished run of an earlier session, the exclude line and a worktree on a new branch under .claude/worktrees/ leave git status, the recorded steps, the branch and the commits of the main folder as they were', () => {
  const s = scene()
  s.hookStart('w', 'startup'); s.approved('w', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  s.hookStart('x', 'startup')
  // the repository ignores nothing: check-ignore does not report the folder
  expect(s.git('check-ignore', '-q', '.claude/worktrees/').code).not.toBe(0)
  const before = { status: s.git('status', '--porcelain').out, all: s.git('status', '--porcelain', '-uall').out, head: s.git('rev-parse', 'HEAD').out, branch: s.git('branch', '--show-current').out, log: s.git('log', '--format=%H').out, missing: s.h(s.repo, 'missing').out }
  expect(before.missing.split(' ')[0]).toBe('oracle')
  s.exclude()
  expect(s.git('check-ignore', '-q', '.claude/worktrees/').code).toBe(0)
  expect(s.git('worktree', 'add', '-q', '-b', 'worktree-new-work', `${s.repo}/.claude/worktrees/new-work`, 'HEAD').code).toBe(0)
  expect(s.git('status', '--porcelain').out).toBe(before.status)
  expect(s.git('status', '--porcelain', '-uall').out).toBe(before.all)
  expect(s.git('rev-parse', 'HEAD').out).toBe(before.head)
  expect(s.git('branch', '--show-current').out).toBe(before.branch)
  expect(s.git('log', '--format=%H').out).toBe(before.log)
  expect(s.h(s.repo, 'missing').out).toBe(before.missing)
})

// ---------- behaviours 13 to 18: the project's folder holds an approved run of this session that is not finished ----------

test('13: with a cwd that is an existing folder in no git repository, the stop hook holds the turn, with "steps not recorded"', () => {
  const s = scene(); ownRun(s)
  heldWith('cwd in no repository', s.stop('x', noRepo()), NOT_RECORDED)
})

test('14: with a cwd in a git repository inside the project\'s folder that is not a work tree of the project\'s repository and holds no run, the stop hook holds the turn, with "steps not recorded"', () => {
  const s = scene(); ownRun(s)
  const nested = `${s.repo}/nested`; gitRepo(nested)
  heldWith('cwd in a nested repository', s.stop('x', nested), NOT_RECORDED)
  const s2 = scene(); ownRun(s2)
  const nested2 = `${s2.repo}/nested`; gitRepo(nested2)
  heldWith('cwd in a sub-folder of a nested repository', s2.stop('x', `${nested2}/src`), NOT_RECORDED)
})

test('15: with a cwd in a git repository outside the project\'s folder that is not a work tree of the project\'s repository and holds no run, the stop hook holds the turn, with "steps not recorded"', () => {
  const s = scene(); ownRun(s)
  const other = `${s.dir}/other`; gitRepo(other)
  heldWith('cwd in another repository', s.stop('x', other), NOT_RECORDED)
})

test('16 (holds at the base, and must stay): with a cwd in a sub-folder of the project\'s folder in the same repository, the stop hook holds the turn, with "steps not recorded"', () => {
  const s = scene(); ownRun(s)
  heldWith('cwd in src/', s.stop('x', `${s.repo}/src`), NOT_RECORDED)
})

for (const inside of [false, true]) {
  const where = inside ? 'under .claude/worktrees/ inside the project\'s folder' : 'beside the project\'s folder'
  test(`17: with a cwd in a worktree of the project's repository that holds no run (${where}), the stop hook holds the turn after a change made there, with "steps not recorded" and the project's folder named as the folder of the run`, () => {
    const s = scene(); ownRun(s)
    const wt = s.worktree('side', inside)
    s.prompt('x', wt)
    s.edit(wt)
    const r = reason('a change in a run-less worktree', s.stop('x', wt))
    has('the reason', r, NOT_RECORDED)
    // the project's folder named, not only as the start of the worktree's path
    has('the reason names the project\'s folder', r.split(wt).join(''), s.repo)
  })
}

test('18 (holds at the base, and must stay): with a cwd that names no existing folder, the stop hook holds the turn', () => {
  const s = scene(); ownRun(s)
  heldWith('cwd that does not exist', s.stop('x', `${s.dir}/no-such-folder`), NOT_RECORDED)
})

// ---------- behaviours 19 to 22: an earlier session's run in the project's folder, this session's run in W ----------

// session w left an approved run unfinished in the project's folder; session x started in the project's folder, made the
// worktree W under .claude/worktrees/ and has an approved run there that is not finished
function sceneW() {
  const s = scene()
  s.hookStart('w', 'startup'); s.approved('w', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  s.hookStart('x', 'startup')
  const W = s.worktree('wx', true)
  s.approved('x', W, SPEC_W)
  return { s, W }
}

test('19 (holds at the base, and must stay): with a cwd in W, the stop hook of this session holds the turn, with "steps not recorded"', () => {
  const { s, W } = sceneW()
  heldWith('cwd in W', s.stop('x', W), NOT_RECORDED)
})

for (const where of ['no repository', 'another repository', 'the project\'s folder'] as const) {
  test(`20: with a cwd in ${where}, the stop hook of this session holds the turn, with "steps not recorded", and names W as the folder of the run`, () => {
    const { s, W } = sceneW()
    const cwd = where === 'no repository' ? noRepo() : where === 'another repository' ? (gitRepo(`${s.dir}/other`), `${s.dir}/other`) : s.repo
    const r = reason(`cwd in ${where}`, s.stop('x', cwd))
    has('the reason', r, NOT_RECORDED)
    has('the reason names W', r, W)
  })
}

test('21: after the run in W is done, the stop hook of this session lets the turn end with a cwd in no repository, in another repository and in the project\'s folder', () => {
  const { s, W } = sceneW()
  const other = `${s.dir}/other`; gitRepo(other)
  const none = noRepo()
  reason('before done, cwd in the project\'s folder', s.stop('x', s.repo)) // the run in W holds until it is done
  s.finish(W)
  ends('after done, cwd in W', s.stop('x', W))
  ends('after done, cwd in no repository', s.stop('x', none))
  ends('after done, cwd in another repository', s.stop('x', other))
  ends('after done, cwd in the project\'s folder (the earlier session\'s run does not hold)', s.stop('x', s.repo))
})

test('22: the stop hook of another session, with a cwd in the project\'s folder, lets the turn end: the run in W does not hold it', () => {
  const { s } = sceneW()
  s.hookStart('y', 'startup')
  s.prompt('y')
  ends('another session, cwd in the project\'s folder', s.stop('y', s.repo))
  reason('this session, cwd in the project\'s folder', s.stop('x', s.repo)) // the control: the run in W is there and is x's
})

// ---------- behaviours 23 to 25 ----------

for (const inside of [false, true]) {
  const where = inside ? 'under .claude/worktrees/ inside the project\'s folder' : 'beside the project\'s folder'
  test(`23 (holds at the base, and must stay): a session with no run of its own, beside an earlier session's unfinished run in the project's folder: a change in a run-less worktree (${where}) ends`, () => {
    const s = scene()
    s.hookStart('w', 'startup'); s.approved('w', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
    s.hookStart('x', 'startup')
    const wt = s.worktree('side', inside)
    s.prompt('x', wt)
    s.edit(wt)
    ends('a change in a run-less worktree, no run of this session', s.stop('x', wt))
  })
}

// a records home whose .hstack/repo names a code repository of its own, nested and ignored
function outer() {
  const dir = `${T}/o${++n}`, home = `${dir}/home`, code = `${home}/code`, state = `${dir}/state`
  const gitHome = gitRepo(home)
  writeFileSync(`${home}/.gitignore`, 'code/\n.hstack/\n'); gitHome('add', '-A'); expect(gitHome('commit', '-qm', 'home').code).toBe(0)
  gitRepo(code)
  mkdirSync(`${home}/.hstack`); writeFileSync(`${home}/.hstack/repo`, 'code\n')
  const h = (cwd: string, ...args: string[]) => sh([BUN, SCRIPT, ...args], cwd, { HSTACK_STATE: state })
  const hook = (verb: string, event: string, cwd: string, extra: Record<string, unknown>) => sh([BUN, SCRIPT, verb], home, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: home }, JSON.stringify({ session_id: 'x', hook_event_name: event, ...extra, cwd }))
  return { dir, home, code, h, hook }
}

test('24: with .hstack/repo naming a code repository that holds an approved run of this session that is not finished, the stop hook holds with a cwd inside the code repository and with a cwd in no git repository', () => {
  const o = outer()
  expect(o.hook('hook-start', 'SessionStart', o.home, { source: 'startup' }).code).toBe(0)
  o.hook('hook-prompt', 'UserPromptSubmit', o.home, { prompt: 'a request' })
  expect(o.h(o.home, 'repo').out).toBe(o.code)
  expect(o.h(o.home, 'start').code).toBe(0)
  const f = `${o.home}/2026-11-24-feature-o.md`; writeFileSync(f, 'what the feature does\n')
  expect(o.h(o.home, 'spec', f).code).toBe(0)
  ends('the turn that shows the spec', o.hook('hook-stop', 'Stop', o.home, { stop_hook_active: false }).out)
  o.hook('hook-prompt', 'UserPromptSubmit', o.home, { prompt: 'yes' })
  expect(o.h(o.home, 'approve').out).toBe('approved')
  heldWith('cwd inside the code repository', o.hook('hook-stop', 'Stop', `${o.code}/src`, { stop_hook_active: false }).out, NOT_RECORDED)
  heldWith('cwd in no git repository', o.hook('hook-stop', 'Stop', noRepo(), { stop_hook_active: false }).out, NOT_RECORDED)
})

test('25: beside an earlier session\'s unfinished run in the project\'s folder, the start hook with "startup" and a cwd in no git repository prints the text that names that run\'s spec and the steps not recorded', () => {
  const s = scene()
  s.hookStart('w', 'startup'); s.approved('w', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  const missing = s.h(s.repo, 'missing').out
  expect(missing.split(' ')[0]).toBe('oracle')
  const t = s.hookStart('x', 'startup', noRepo()).out
  has('the start text', t, SPEC_P)
  has('the start text', t, missing)
})

// ---------- behaviours 26 to 30: no move while a run of this session goes on ----------

test('26: hooks/hooks.json holds an entry PreToolUse with the matcher EnterWorktree|ExitWorktree, whose command is bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" and one verb', () => {
  const j = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf8')) as { hooks?: Record<string, { matcher?: string; hooks?: { type?: string; command?: string }[] }[]> }
  const entries = j.hooks?.PreToolUse ?? []
  const e = entries.find((x) => x.matcher === 'EnterWorktree|ExitWorktree')
  expect(`a PreToolUse entry with the matcher EnterWorktree|ExitWorktree: ${e !== undefined}`).toBe('a PreToolUse entry with the matcher EnterWorktree|ExitWorktree: true')
  const cmds = (e?.hooks ?? []).map((x) => x.command ?? '')
  expect(cmds.length).toBe(1)
  expect(cmds[0]).toMatch(/^bun "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hstack\.ts" [a-z][a-z-]*$/)
  // the three hooks of before are still there
  for (const k of ['SessionStart', 'UserPromptSubmit', 'Stop']) expect(`hooks.json has ${k}: ${(j.hooks?.[k] ?? []).length > 0}`).toBe(`hooks.json has ${k}: true`)
})

test('27: while the project\'s folder holds an approved run of this session that is not finished, the worktree hook refuses the tool, with "is not finished", and says that the run goes on to its end first', () => {
  const s = scene(); ownRun(s)
  for (const [tool, ti] of [['EnterWorktree', { name: 'other-work' }], ['ExitWorktree', { action: 'keep' }]] as const) {
    const why = refused(`${tool}, cwd in the project's folder`, s.wtHook('x', s.repo, tool, ti))
    has(`${tool}: the reason`, why, 'is not finished')
    expect(`${tool}: the reason says the run goes on to its end: ${/\bend\b/i.test(why)}`).toBe(`${tool}: the reason says the run goes on to its end: true`)
  }
})

test('28: with the run of this session in the worktree W, the worktree hook of this session refuses the tool, with a cwd in W and with a cwd in the project\'s folder', () => {
  const { s, W } = sceneW()
  refused('cwd in W', s.wtHook('x', W, 'ExitWorktree', { action: 'keep' }))
  refused('cwd in W, EnterWorktree', s.wtHook('x', W))
  refused('cwd in the project\'s folder', s.wtHook('x', s.repo))
})

test('29: the worktree hook lets the tool run with no run started', () => {
  const s = scene()
  s.hookStart('x', 'startup'); s.prompt('x')
  letsRun('no run started', s.wtHook('x', s.repo))
})

test('29: the worktree hook lets the tool run after a run that this session finished (done)', () => {
  const s = scene(); ownRun(s)
  refused('before done (the control)', s.wtHook('x', s.repo))
  s.finish(s.repo)
  letsRun('after done', s.wtHook('x', s.repo))
  letsRun('after done, ExitWorktree', s.wtHook('x', s.repo, 'ExitWorktree', { action: 'keep' }))
})

test('29: the worktree hook lets the tool run beside an approved run of an earlier session that is not finished', () => {
  const s = scene(); ownRun(s, 'w')
  refused('the session of the run, before a new session (the control)', s.wtHook('w', s.repo))
  s.hookStart('x', 'startup'); s.prompt('x')
  letsRun('a new session beside the earlier run', s.wtHook('x', s.repo))
})

test('29: the worktree hook lets the tool run while a spec of this session waits for the user\'s approval', () => {
  const s = scene()
  s.hookStart('x', 'startup')
  s.waitingSpec('x', s.repo, SPEC_P)
  s.prompt('x')
  letsRun('a spec waits', s.wtHook('x', s.repo))
  expect(s.h(s.repo, 'approve').out).toBe('approved')
  refused('after the approval (the control)', s.wtHook('x', s.repo))
})

test('30: when the folder of this session\'s unfinished run is on another branch than at start, the stop hook holds, with "steps not recorded", naming both branches and telling the agent to go back', () => {
  const s = scene('run-branch-q')
  s.hookStart('x', 'startup'); s.approved('x', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  lacks('the reason on the run\'s own branch', reason('on the run\'s branch', s.stop('x')), 'switched-branch-q')
  expect(s.git('checkout', '-q', '-b', 'switched-branch-q').code).toBe(0)
  const r = reason('on another branch', s.stop('x'))
  has('the reason', r, NOT_RECORDED)
  has('the reason names the run\'s branch', r, 'run-branch-q')
  has('the reason names the folder\'s branch', r, 'switched-branch-q')
  expect(`the reason tells the agent to go back: ${/\bback\b/i.test(r)}`).toBe('the reason tells the agent to go back: true')
})

test('30: a run taken up on another branch than its start is held against the branch of its take-up', () => {
  const s = scene('run-branch-q')
  s.hookStart('w', 'startup'); s.approved('w', s.repo, SPEC_P); expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  s.hookStart('x', 'startup'); s.prompt('x')
  expect(s.git('checkout', '-q', '-b', 'takeup-branch-q').code).toBe(0)
  expect(s.h(s.repo, 'takeup').code).toBe(0)
  const r1 = reason('on the branch of the take-up', s.stop('x'))
  has('the reason', r1, NOT_RECORDED)
  lacks('the reason on the branch of the take-up', r1, 'run-branch-q')
  expect(s.git('checkout', '-q', 'run-branch-q').code).toBe(0)
  const r2 = reason('back on the branch of the start', s.stop('x'))
  has('the reason', r2, NOT_RECORDED)
  has('the reason names the take-up\'s branch', r2, 'takeup-branch-q')
  has('the reason names the folder\'s branch', r2, 'run-branch-q')
})

// a run started by 0.4.6: the script of the base commit, unpacked from this repository's history
const OLD_BASE = '9fc708cbf09cd3610cc58ee2cfe8b2aa50cae019'
const OLD = `${T}/old046`
const oldOk = (() => {
  mkdirSync(OLD, { recursive: true })
  const a = Bun.spawnSync(['git', '-C', ROOT, 'archive', '-o', `${OLD}/s.tar`, OLD_BASE, 'scripts/hstack.ts', 'scripts/lib'], { stdout: 'pipe', stderr: 'pipe' })
  if (a.exitCode !== 0) return false
  return Bun.spawnSync(['tar', '-xf', `${OLD}/s.tar`, '-C', OLD]).exitCode === 0 && existsSync(`${OLD}/scripts/hstack.ts`)
})()
test.skipIf(!oldOk)('30 (holds at the base, and must stay): a run that 0.4.6 started (no branch recorded) is held as before, with no word on a branch, on either branch', () => {
  const s = scene('run-branch-q')
  const old = (args: string[], stdin?: string) => sh([BUN, `${OLD}/scripts/hstack.ts`, ...args], s.repo, { HSTACK_STATE: s.state, CLAUDE_PROJECT_DIR: s.repo }, stdin)
  const inp = (event: string, extra: Record<string, unknown>) => JSON.stringify({ session_id: 'x', hook_event_name: event, ...extra, cwd: s.repo })
  old(['hook-start'], inp('SessionStart', { source: 'startup' }))
  old(['hook-prompt'], inp('UserPromptSubmit', { prompt: 'a request' }))
  expect(old(['start']).code).toBe(0)
  const f = `${s.dir}/${SPEC_P}.md`; writeFileSync(f, 'what the feature does\n')
  expect(old(['spec', f]).code).toBe(0)
  expect(old(['hook-stop'], inp('Stop', { stop_hook_active: false })).out).toBe('')
  old(['hook-prompt'], inp('UserPromptSubmit', { prompt: 'yes' }))
  expect(old(['approve']).out).toBe('approved')
  // from here on the new script: its hooks
  const r1 = reason('0.4.6 run, its branch', s.stop('x'))
  has('the reason', r1, NOT_RECORDED)
  expect(s.git('checkout', '-q', '-b', 'switched-branch-q').code).toBe(0)
  const r2 = reason('0.4.6 run, another branch', s.stop('x'))
  has('the reason', r2, NOT_RECORDED)
  lacks('the reason', r2, 'run-branch-q')
  lacks('the reason', r2, 'switched-branch-q')
})

// ---------- behaviours 33 and 34: whose run it is ----------

// session A started in the project's folder and has an approved run, not finished, in the worktree W (beside the
// project's folder); session B started in the project's folder after it. No start hook ever ran with a cwd in W.
function sceneAB() {
  const s = scene()
  s.hookStart('A', 'startup')
  const W = s.worktree('wa')
  s.approved('A', W, SPEC_W)
  expect(s.h(W, 'phase', 'setup').code).toBe(0)
  s.hookStart('B', 'startup')
  return { s, W }
}

test('33: in a work tree W with an approved run of session A that is not finished, the stop hook of another session B with a cwd in W lets the turn end, and the worktree hook of B lets the tool run', () => {
  const { s, W } = sceneAB()
  heldWith('session A, cwd in W (the control)', s.stop('A', W), NOT_RECORDED)
  refused('session A\'s worktree hook, cwd in W (the control)', s.wtHook('A', W))
  ends('session B, cwd in W', s.stop('B', W))
  letsRun('session B\'s worktree hook, cwd in W', s.wtHook('B', W))
  letsRun('session B\'s worktree hook, ExitWorktree, cwd in W', s.wtHook('B', W, 'ExitWorktree', { action: 'keep' }))
})

for (const how of ['the worktree hook of B for EnterWorktree with W\'s path', 'a hook of B with a cwd in W'] as const) {
  test(`34: after ${how}, takeup run in W takes A's run up; then the stop hook of B with a cwd in W holds, and the stop hook of A lets its turn end`, () => {
    const { s, W } = sceneAB()
    if (how.startsWith('the worktree hook')) letsRun('B enters W', s.wtHook('B', s.repo, 'EnterWorktree', { path: W }))
    else s.prompt('B', W)
    const t = s.h(W, 'takeup')
    expect(`takeup in W: exit ${t.code}, ${t.err.trim()}`).toBe(`takeup in W: exit 0, ${t.err.trim()}`)
    heldWith('session B, cwd in W, after the take-up', s.stop('B', W), NOT_RECORDED)
    ends('session A, cwd in W, after the take-up', s.stop('A', W))
  })
}

test('34: takeup in W, after B came, keeps spec 9\'s question about commits: with a commit made since the run\'s last step it exits 2 and takes nothing up', () => {
  const { s, W } = sceneAB()
  s.prompt('B', W)
  writeFileSync(`${W}/note.txt`, 'a note\n')
  expect(sh(['git', 'add', '--', 'note.txt'], W, {}).code).toBe(0)
  expect(sh(['git', 'commit', '-qm', 'a commit of the user', '--', 'note.txt'], W, {}).code).toBe(0)
  const t = s.h(W, 'takeup')
  expect(t.code).toBe(2)
  has('takeup\'s output', t.out, 'a commit of the user')
  ends('session B, cwd in W: nothing taken up', s.stop('B', W))
  expect(s.h(W, 'takeup', '--with-commits').code).toBe(0)
  heldWith('session B, cwd in W, after the yes', s.stop('B', W), NOT_RECORDED)
})

// ---------- behaviour 35: runs ----------

test('35: runs prints nothing when no work tree holds a waiting spec or an unfinished run, from the main folder and from a worktree', () => {
  const s = scene()
  s.hookStart('x', 'startup')
  const w1 = s.worktree('w1')
  for (const cwd of [s.repo, w1]) {
    const r = s.h(cwd, 'runs')
    expect(`runs in ${cwd}: exit ${r.code}, printed "${r.out}", ${r.err.trim()}`).toBe(`runs in ${cwd}: exit 0, printed "", ${r.err.trim()}`)
  }
  // a finished run is no line either
  s.approved('x', s.repo, SPEC_P); s.finish(s.repo)
  const r = s.h(w1, 'runs')
  expect(`runs after a finished run: exit ${r.code}, printed "${r.out}"`).toBe('runs after a finished run: exit 0, printed ""')
})

test('35: runs prints one line for each work tree with a waiting spec or an unfinished run (waiting/unfinished, the folder, the spec, the steps not recorded), the same from every work tree', () => {
  const s = scene()
  s.hookStart('v', 'startup')
  const w1 = s.worktree('w1'), w2 = s.worktree('w2'), w3 = s.worktree('w3')
  const specMain = s.waitingSpec('v', s.repo, '2026-11-24-feature-main')
  const specW1 = s.approved('u', w1, '2026-11-24-feature-one'); expect(s.h(w1, 'phase', 'setup').code).toBe(0)
  s.approved('t', w3, '2026-11-24-feature-three'); s.finish(w3) // finished: no line
  const missingW1 = s.h(w1, 'missing').out
  expect(missingW1.split(' ')[0]).toBe('oracle')
  const outs = [s.repo, w1, w2, w3].map((cwd) => { const r = s.h(cwd, 'runs'); expect(`runs in ${cwd}: exit ${r.code}`).toBe(`runs in ${cwd}: exit 0`); return r.out })
  const lines = outs[0].split('\n').filter((l) => l.trim() !== '')
  expect(`runs prints ${lines.length} lines: ${outs[0]}`).toBe(`runs prints 2 lines: ${outs[0]}`)
  const waiting = lines.filter((l) => /\bwaiting\b/.test(l)), unfinished = lines.filter((l) => /\bunfinished\b/.test(l))
  expect(waiting.length).toBe(1); expect(unfinished.length).toBe(1)
  has('the waiting line', waiting[0] ?? '', s.repo)
  has('the waiting line', waiting[0] ?? '', specMain)
  has('the unfinished line', unfinished[0] ?? '', w1)
  has('the unfinished line', unfinished[0] ?? '', specW1)
  has('the unfinished line', unfinished[0] ?? '', missingW1)
  lacks('runs', outs[0], w2); lacks('runs', outs[0], w3)
  const sorted = (o: string) => o.split('\n').filter((l) => l.trim() !== '').sort().join('\n')
  for (let i = 1; i < outs.length; i++) expect(sorted(outs[i])).toBe(sorted(outs[0]))
})

// ---------- behaviour 36: the start text names the other work trees ----------

test('36: the start text names each spec that waits and each unfinished run in another work tree that is not this session\'s: the spec, the folder, and /hstack:build with the spec\'s name', () => {
  const s = scene()
  s.hookStart('v', 'startup')
  const w1 = s.worktree('w1'), w2 = s.worktree('w2')
  s.waitingSpec('v', w1, '2026-11-24-feature-one')
  s.approved('u', w2, '2026-11-24-feature-two'); expect(s.h(w2, 'phase', 'setup').code).toBe(0)
  const t = s.hookStart('x', 'startup', s.repo).out
  for (const p of [w1, '2026-11-24-feature-one', '/hstack:build 2026-11-24-feature-one', w2, '2026-11-24-feature-two', '/hstack:build 2026-11-24-feature-two']) has('the start text', t, p)
})

test('36: after a resume, a run of this session in another work tree is named as this session\'s own, with its folder and the steps not recorded, and with no command to take it up', () => {
  const { s, W } = sceneW()
  const missingW = s.h(W, 'missing').out
  expect(missingW.split(' ')[0]).toBe('setup')
  const t = s.hookStart('x', 'resume', s.repo).out
  has('the start text', t, W)
  has('the start text', t, missingW)
  lacks('the start text', t, `/hstack:build ${SPEC_W}`)
})

// ---------- behaviour 38: a resume gives the run in W its holds back and takes its idle time off ----------

test('38: after the stop hook reached its cap for the run in W, a resume with the project\'s folder as cwd gives the holds back, and elapsed in W does not count the time between the last stop hook and the resume', () => {
  const { s, W } = sceneW()
  let holds = 0
  for (let i = 0; i < 10; i++) { const o = s.stop('x', W); if (o === '') break; reason('a hold before the cap', o); holds++ }
  expect(`holds before the cap: ${holds >= 1 && holds < 10}`).toBe('holds before the cap: true')
  ends('at the cap', s.stop('x', W))
  // an hour later, nobody having worked on the run
  s.clock(3600)
  expect(Number(s.h(W, 'elapsed').out)).toBeGreaterThanOrEqual(59) // the hour is on the clock before the resume
  s.hookStart('x', 'resume', s.repo)
  const e = Number(s.h(W, 'elapsed').out)
  expect(`elapsed in W after the resume: ${e} minutes, at most 5: ${e <= 5}`).toBe(`elapsed in W after the resume: ${e} minutes, at most 5: true`)
  heldWith('after the resume, cwd in W', s.stop('x', W), NOT_RECORDED)
})
