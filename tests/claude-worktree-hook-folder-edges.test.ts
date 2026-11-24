// The builder's edges of spec 10 (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.md`): each test names its
// edge in `docs/specs/2026-11-24-claude-worktree-hook-folder-readme.decisions.md` (E<n>).
// Run: bun test tests/claude-worktree-hook-folder-edges.test.ts
// Every scene makes scratch repositories and a state folder of its own under the system's temporary folder.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-worktree-edges-')))
afterAll(() => rmSync(T, { recursive: true, force: true }))

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !['CLAUDE_PROJECT_DIR', 'HSTACK_STATE', 'HSTACK_FEEDBACK_REPO'].includes(k) && !k.startsWith('GIT_')) CLEAN[k] = v
CLEAN.HOME = `${T}/home`
mkdirSync(CLEAN.HOME, { recursive: true })

type Out = { code: number; out: string; err: string }
const sh = (cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode ?? -1, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}
let n = 0
function gitRepo(path: string) {
  mkdirSync(`${path}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], path, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${path}/src/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  return git
}
// a project's folder, a worktree W beside it, a state folder; hooks get CLAUDE_PROJECT_DIR = the project's folder
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`, W = `${dir}/w`
  const git = gitRepo(repo)
  expect(git('worktree', 'add', '-q', '-b', 'worktree-w', W, 'HEAD').code).toBe(0)
  const project = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  const h = (cwd: string, ...args: string[]) => sh([BUN, SCRIPT, ...args], cwd, { HSTACK_STATE: state })
  const hook = (verb: string, input: Record<string, unknown>, env: Record<string, string> = project) => sh([BUN, SCRIPT, verb], repo, env, JSON.stringify(input))
  const stop = (id: string | undefined, cwd: string) => hook('hook-stop', { ...(id === undefined ? {} : { session_id: id }), hook_event_name: 'Stop', stop_hook_active: false, cwd }).out
  const prompt = (id: string | undefined, cwd: string) => hook('hook-prompt', { ...(id === undefined ? {} : { session_id: id }), hook_event_name: 'UserPromptSubmit', prompt: 'a request', cwd })
  const startHook = (id: string, source: string, cwd: string) => hook('hook-start', { session_id: id, hook_event_name: 'SessionStart', source, cwd }).out
  const wt = (id: string, cwd: string, toolInput: Record<string, unknown> = { name: 'other' }) => hook('hook-worktree', { session_id: id, hook_event_name: 'PreToolUse', tool_name: 'EnterWorktree', tool_input: toolInput, cwd })
  // a spec shown by session id in the work tree wt, and, when approve is true, approved
  const run = (id: string | undefined, wt: string, approve = true) => {
    prompt(id, wt)
    expect(h(wt, 'start').code).toBe(0)
    const f = `${dir}/2026-11-24-feature-${++n}.md`; writeFileSync(f, 'what the feature does\n')
    expect(h(wt, 'spec', f).code).toBe(0)
    expect(stop(id, wt)).toBe('')
    if (approve) { prompt(id, wt); expect(h(wt, 'approve').out).toBe('approved') }
    return f
  }
  return { dir, repo, state, W, git, h, hook, stop, prompt, startHook, wt, run }
}
const HELD = '{"decision":"block"'

test('E7: a feedback verb typed in the worktree where this session\'s run is lets the next turn end once there', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.W)
  expect(s.stop('x', s.W).startsWith(HELD)).toBe(true)
  s.prompt('x', s.W)
  expect(sh([BUN, SCRIPT, 'feedback', 'draft'], s.W, { HSTACK_STATE: s.state, CLAUDE_PROJECT_DIR: s.repo }).code).toBe(0)
  expect(s.stop('x', s.W)).toBe('')
  expect(s.stop('x', s.W).startsWith(HELD)).toBe(true) // once
})

test('E7: the free end of a feedback verb is used once: after the turn in the worktree ended, a stop with the project\'s folder as cwd holds the run again', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.W)
  s.prompt('x', s.W)
  expect(sh([BUN, SCRIPT, 'feedback', 'draft'], s.W, { HSTACK_STATE: s.state, CLAUDE_PROJECT_DIR: s.repo }).code).toBe(0)
  expect(s.stop('x', s.W)).toBe('')
  s.prompt('x', s.repo)
  expect(s.stop('x', s.repo).startsWith(HELD)).toBe(true)
})

test('E8: a spec of this session that waits in another work tree does not hold a turn whose cwd is elsewhere, even after a change there', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.W, false)
  s.prompt('x', s.repo)
  writeFileSync(`${s.repo}/src/a.txt`, 'changed in the main folder\n')
  expect(s.stop('x', s.repo)).toBe('')
})

test('E4: between start and the moment the spec is shown, the worktree hook lets the tool run', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.prompt('x', s.repo)
  expect(s.h(s.repo, 'start').code).toBe(0)
  const r = s.wt('x', s.repo)
  expect([r.code, r.out]).toEqual([0, ''])
})

test('E5: a run started with no branch checked out, whose folder is then on a branch, is held with words that say so and name the way back', () => {
  const s = scene()
  expect(s.git('checkout', '-q', '--detach').code).toBe(0)
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.repo)
  expect(s.git('checkout', '-q', '-b', 'later-branch').code).toBe(0)
  const out = s.stop('x', s.repo)
  expect(out.startsWith(HELD)).toBe(true)
  const why = String((JSON.parse(out) as { reason?: unknown }).reason)
  expect(why).toContain('no branch checked out')
  expect(why).toContain('later-branch')
  expect(why).toContain('git switch --detach')
})

test('E1: a hook with no session_id judges its folder\'s run as its own, as before, even when the run belongs to a session, and claims no run', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.repo)
  expect(s.stop(undefined, s.repo).startsWith(HELD)).toBe(true)
  // a run shown and approved with hooks that carry no id belongs to no session: the first hook with an id claims it
  s.run(undefined, s.W)
  expect(s.stop('y', s.W).startsWith(HELD)).toBe(true)
  expect(s.stop('z', s.W)).toBe('')
})

test('E11: runs names an unfinished run of a worktree whose folder is gone, with "(folder gone)" after the folder', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  const f = s.run('x', s.W)
  rmSync(s.W, { recursive: true, force: true })
  const r = s.h(s.repo, 'runs')
  expect(r.code).toBe(0)
  expect(r.out).toContain(`unfinished ${s.W} (folder gone) ${f}`)
})

test('E2 (a guard: the base already followed the cwd): with no CLAUDE_PROJECT_DIR, a hook follows its cwd into the repository it is in', () => {
  const s = scene()
  s.startHook('x', 'startup', s.W)
  s.run('x', s.W)
  const noProject = { HSTACK_STATE: s.state }
  const out = s.hook('hook-stop', { session_id: 'x', hook_event_name: 'Stop', stop_hook_active: false, cwd: s.W }, noProject).out
  expect(out.startsWith(HELD)).toBe(true)
})

test('E6: the holds of a run held from another work tree are counted beside the run: once they reach the cap there, a stop in the run\'s own folder lets the turn end too', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.W)
  let holds = 0
  for (let i = 0; i < 10 && s.stop('x', s.repo).startsWith(HELD); i++) holds++
  expect(holds).toBe(3)
  expect(s.stop('x', s.W)).toBe('')
})

test('E9: takeup refuses a run of this session that no other session came to', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.repo)
  s.prompt('x', s.repo)
  const r = s.h(s.repo, 'takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain('the run is this session\'s')
})

test('R1-1: a spec shown by one session and approved in a new session is the new session\'s run: its stop hook holds and its worktree hook refuses', () => {
  const s = scene()
  s.startHook('w', 'startup', s.repo)
  s.run('w', s.repo, false)
  s.startHook('x', 'startup', s.repo)
  s.prompt('x', s.repo)
  expect(s.h(s.repo, 'approve').out).toBe('approved')
  expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  writeFileSync(`${s.repo}/src/a.txt`, 'changed after the approval\n')
  expect(s.stop('x', s.repo).startsWith(HELD)).toBe(true)
  expect(s.wt('x', s.repo).out).toContain('"permissionDecision":"deny"')
  expect(s.stop('w', s.repo)).toBe('')
})

test('R1-2: a session that only passed through the work tree of another session\'s run, before that session judged it again, does not get the run at a take-up', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.run('A', s.W)
  s.startHook('B', 'startup', s.repo)
  expect(s.stop('B', s.W)).toBe('') // B passes through W
  s.prompt('A', s.W) // A judges W again
  const r = s.h(s.W, 'takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain('the run is this session\'s')
  expect(s.stop('A', s.W).startsWith(HELD)).toBe(true)
})

test('R1-2: a worktree call that is refused records no coming', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.run('A', s.W)
  s.startHook('B', 'startup', s.repo)
  s.run('B', s.repo) // B has a run of its own, so its worktree calls are refused
  expect(s.wt('B', s.repo, { path: s.W }).out).toContain('"permissionDecision":"deny"')
  const r = s.h(s.W, 'takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain('the run is this session\'s')
})

test('R1-5: a resume takes the idle time off a run that has no owner yet (one that 0.4.6 started)', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.repo)
  const S = s.h(s.repo, 'dir').out
  rmSync(`${S}/owner`, { force: true })
  const t = Math.floor(Date.now() / 1000)
  writeFileSync(`${S}/started`, `${t - 2 * 3600}\n`)
  writeFileSync(`${S}/last-stop`, `${t - 2 * 3600 + 60}\n`)
  s.startHook('x', 'resume', s.repo)
  expect(Number(s.h(s.repo, 'elapsed').out)).toBeLessThanOrEqual(5)
})

test('R1-3 (behaviour 34): a take-up after another session came keeps spec 9\'s refusals: a run whose last step is no longer in the history of HEAD is refused', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.run('A', s.W)
  const base = sh(['git', 'rev-parse', 'HEAD'], s.W, {}).out
  writeFileSync(`${s.W}/src/b.txt`, 'work of the run\n')
  expect(sh(['git', 'add', '--', 'src/b.txt'], s.W, {}).code).toBe(0)
  expect(sh(['git', 'commit', '-qm', 'work of the run', '--', 'src/b.txt'], s.W, {}).code).toBe(0)
  const last = sh(['git', 'rev-parse', 'HEAD'], s.W, {}).out
  expect(s.h(s.W, 'phase', 'setup').code).toBe(0)
  s.startHook('B', 'startup', s.repo)
  s.prompt('B', s.W)
  expect(sh(['git', 'reset', '-q', '--hard', base], s.W, {}).code).toBe(0)
  const r = s.h(s.W, 'takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain(`${last} is no longer in the history of HEAD`)
})

test('R1-3 (behaviour 36): after a resume, the start text names this session\'s own run in another work tree as this session\'s', () => {
  const s = scene()
  s.startHook('x', 'startup', s.repo)
  s.run('x', s.W)
  const t = s.startHook('x', 'resume', s.repo)
  expect(t).toContain(`This session's own approved hstack:build run in the work tree ${s.W} is not finished`)
})

test('R2-1: a session that only opened the project beside a waiting spec does not get the run when the spec\'s own session approves it', () => {
  const s = scene()
  s.startHook('w', 'startup', s.repo)
  s.run('w', s.repo, false)
  s.startHook('x', 'startup', s.repo)
  s.prompt('w', s.repo)
  expect(s.h(s.repo, 'approve').out).toBe('approved')
  expect(s.h(s.repo, 'phase', 'setup').code).toBe(0)
  writeFileSync(`${s.repo}/src/a.txt`, 'changed after the approval\n')
  expect(s.stop('w', s.repo).startsWith(HELD)).toBe(true)
  expect(s.stop('x', s.W)).toBe('')
})
