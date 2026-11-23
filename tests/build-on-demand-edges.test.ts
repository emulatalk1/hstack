// The builder's tests of spec 9 (`docs/specs/2026-11-23-build-on-demand.md`): the edges of its decisions file
// (`docs/specs/2026-11-23-build-on-demand.decisions.md`), each named by its number there. The oracle's tests are in
// tests/build-on-demand.test.ts. Every test makes a scratch repository and a state folder of its own (HSTACK_STATE,
// HOME pointed there too), so the machine's ~/.hstack is never touched.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-on-demand-edges-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe)

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v
CLEAN.HOME = `${T}/home`
mkdirSync(CLEAN.HOME, { recursive: true })

type Out = { code: number; out: string; err: string }
function sh(cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

let n = 0
const STATE = `${T}/state`
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`
  mkdirSync(`${repo}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], repo, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/src/a.txt`, 'x = 1\n'); git('add', '-A'); git('commit', '-qm', 'base')
  // hooks get the session's folder from CLAUDE_PROJECT_DIR, and the input's cwd when one is given
  const env = { HSTACK_STATE: STATE, CLAUDE_PROJECT_DIR: repo }
  const input = (event: string, extra: string, cwd?: string) => `{"session_id":"x","hook_event_name":"${event}"${extra}${cwd ? `,"cwd":${JSON.stringify(cwd)}` : ''}}`
  const h = (...args: string[]) => sh([BUN, SCRIPT, ...args], repo, { HSTACK_STATE: STATE })
  const hookStart = (source = 'startup', cwd?: string) => sh([BUN, SCRIPT, 'hook-start'], repo, env, input('SessionStart', `,"source":"${source}"`, cwd)).out
  const prompt = (cwd?: string) => sh([BUN, SCRIPT, 'hook-prompt'], repo, env, input('UserPromptSubmit', ',"prompt":"a request"', cwd))
  const stop = (cwd?: string) => sh([BUN, SCRIPT, 'hook-stop'], repo, env, input('Stop', ',"stop_hook_active":false', cwd)).out
  let c = 0
  const commit = (msg = '') => { const f = `note-${++c}.txt`; writeFileSync(`${repo}/${f}`, 'a note\n'); git('add', '--', f); expect(git('commit', '-qm', msg || `note ${c}`, '--', f).code).toBe(0) }
  const S = () => h('dir').out
  return { dir, repo, git, h, hookStart, prompt, stop, commit, S }
}
type Scene = ReturnType<typeof scene>
const HELD = '{"decision":"block"'

// an approved run, started and approved in the session that the start hook opened
function approved(s: Scene) {
  s.prompt()
  expect(s.h('start').code).toBe(0)
  const f = `${s.dir}/2026-11-23-feature-y.md`; writeFileSync(f, 'what the feature does\n')
  expect(s.h('spec', f).code).toBe(0)
  expect(s.stop()).toBe('')
  expect(s.h('approve').out).toBe('approved')
}

test('E1: the hooks judge the folder of the input\'s cwd: a change in a worktree with no run ends, though CLAUDE_PROJECT_DIR holds an unfinished run of this session', () => {
  const s = scene()
  s.hookStart('startup'); approved(s); expect(s.h('phase', 'setup').code).toBe(0)
  const wt = `${s.dir}/wt`
  expect(s.git('worktree', 'add', '-q', '-b', 'side', wt, 'HEAD').code).toBe(0)
  expect(s.stop().startsWith(HELD)).toBe(true) // the folder of CLAUDE_PROJECT_DIR: its run is held
  // the session moved into the worktree (no new start hook: a move inside one session)
  s.prompt(wt)
  writeFileSync(`${wt}/src/a.txt`, 'changed in the worktree\n')
  expect(s.stop(wt)).toBe('')
  expect(s.stop().startsWith(HELD)).toBe(true) // the run of the main folder is still this session's, untouched
})

test('E2: a cwd in the input that cannot be entered: the hooks judge the project\'s folder, and its unfinished run is held', () => {
  const s = scene()
  s.hookStart('startup'); approved(s)
  expect(s.stop(`${s.dir}/no-such-folder`).startsWith(HELD)).toBe(true)
})

// an approved run of an earlier session that is not finished: setup recorded, then a new session
function earlierRun(s: Scene) {
  s.hookStart('startup'); approved(s); expect(s.h('phase', 'setup').code).toBe(0)
  s.hookStart('startup')
}

test('E4: takeup refuses with no run, and beside a run of this session', () => {
  const s = scene(); s.hookStart('startup')
  expect(s.h('takeup').code).toBe(1)
  approved(s)
  const r = s.h('takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain('this session')
})

test('E5: takeup with no commit since the run\'s last step takes the run up: this session\'s run from then on, held by the stop hook', () => {
  const s = scene(); earlierRun(s)
  s.prompt()
  expect(s.stop()).toBe('') // beside an earlier session's run, before the take-up
  const r = s.h('takeup')
  expect(r.code).toBe(0)
  expect(existsSync(`${s.S()}/stale`)).toBe(false)
  expect(s.stop().startsWith(HELD)).toBe(true)
})

test('E6: takeup refuses when the run\'s base commit is no longer in the history of HEAD, and takes nothing up', () => {
  const s = scene(); earlierRun(s)
  const base = s.git('rev-parse', 'HEAD').out
  // the history rewritten: HEAD on a new root that does not hold the base
  expect(s.git('checkout', '-q', '--orphan', 'rewritten').code).toBe(0); s.commit('a new root')
  const r = s.h('takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain(base)
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
})

test('E7: takeup refuses when the oracle\'s commit is no longer in the history of HEAD', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  expect(s.h('phase', 'setup').code).toBe(0)
  s.commit('the oracle\'s tests'); const oracle = s.git('rev-parse', 'HEAD').out
  writeFileSync(`${s.S()}/oracle-commit`, oracle + '\n'); expect(s.h('phase', 'oracle').code).toBe(0)
  s.hookStart('startup')
  expect(s.git('reset', '-q', '--hard', 'HEAD~1').code).toBe(0)
  const r = s.h('takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain(oracle)
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
})

test('E8: takeup with commits made since the run\'s last recorded step prints them, exits 2 and takes nothing up', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  s.commit('the run\'s own work'); expect(s.h('phase', 'setup').code).toBe(0)
  s.hookStart('startup')
  s.commit('a git sync of the user'); s.commit('a docs edit')
  const r = s.h('takeup')
  expect(r.code).toBe(2)
  expect(r.out).toContain('a git sync of the user')
  expect(r.out).toContain('a docs edit')
  expect(r.out).not.toContain('the run\'s own work')
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
})

test('E9: takeup --with-commits, on the user\'s yes, takes the run up with those commits in it', () => {
  const s = scene(); earlierRun(s)
  s.commit('a git sync of the user')
  expect(s.h('takeup', '--with-commits').code).toBe(0)
  expect(existsSync(`${s.S()}/stale`)).toBe(false)
})

const now = () => Math.floor(Date.now() / 1000)
const minutes = (s: Scene) => Number(s.h('elapsed').out)

test('E10: takeup takes off the clock the time since the stop hook last ran: a run idle for an hour counts no minute of it', () => {
  const s = scene(); earlierRun(s)
  writeFileSync(`${s.S()}/started`, `${now() - 2 * 3600}\n`) // two hours since start, of which the last hour nobody worked
  writeFileSync(`${s.S()}/last-stop`, `${now() - 3600}\n`)
  expect(s.h('takeup').code).toBe(0)
  expect(minutes(s)).toBeGreaterThanOrEqual(59)
  expect(minutes(s)).toBeLessThanOrEqual(61)
})

test('E11: the stop hook records when it last ran, held or not', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  writeFileSync(`${s.S()}/last-stop`, '1\n')
  expect(s.stop().startsWith(HELD)).toBe(true)
  const t = Number(readFileSync(`${s.S()}/last-stop`, 'utf8'))
  expect(Math.abs(t - now())).toBeLessThanOrEqual(5)
})

test('E12: a resume of the session that holds an approved run not finished takes off the clock the time since the stop hook last ran', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  writeFileSync(`${s.S()}/started`, `${now() - 2 * 3600}\n`)
  writeFileSync(`${s.S()}/last-stop`, `${now() - 3600}\n`)
  s.hookStart('resume')
  expect(minutes(s)).toBeGreaterThanOrEqual(59)
  expect(minutes(s)).toBeLessThanOrEqual(61)
})

test('E13: a resume beside an approved run of an earlier session changes its clock in nothing: only its take-up does', () => {
  const s = scene(); earlierRun(s)
  writeFileSync(`${s.S()}/started`, `${now() - 2 * 3600}\n`)
  writeFileSync(`${s.S()}/last-stop`, `${now() - 3600}\n`)
  s.hookStart('resume')
  expect(minutes(s)).toBeGreaterThanOrEqual(119)
})

// ---------- the playbook's step 1 and last reply: what the agent reads (behaviours 9, 10, 12, 13, 15, 17, 18) ----------

const PLAYBOOK = readFileSync(join(import.meta.dir, '../skills/build/SKILL.md'), 'utf8')
const part = (from: string, to: string) => { const i = PLAYBOOK.indexOf(from), j = PLAYBOOK.indexOf(to, i + 1); expect(i).toBeGreaterThanOrEqual(0); return PLAYBOOK.slice(i, j < 0 ? undefined : j) }

test('E14: step 1 of the playbook takes up a waiting spec by its name with no brainstorm, and an unfinished run through takeup and the user\'s yes on commits made since', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  for (const p of ['with or without `.md`', 'There is no brainstorm', "The user's next message", '`$H takeup`', 'exits 2', '`$H takeup --with-commits`', 'leave the run as it is', '`$H missing`', 'no `start` and no brainstorm']) expect(`${p}: ${t.includes(p)}`).toBe(`${p}: true`)
})

test('E15: step 1 sends new work beside an earlier session\'s unfinished run into a new worktree the session moves into, refuses it beside this session\'s run, and says what to do with no worktree tool', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  for (const p of ['is a new request', 'this session\'s, start nothing', 'never moves it aside', 'new worktree from `HEAD`, on a new branch', '`EnterWorktree`', 'move the session into it', '`$S/worktree-origin`', 'so that no worktree is left, and start nothing']) expect(`${p}: ${t.includes(p)}`).toBe(`${p}: true`)
})

test('E16: the last reply of a run made in such a worktree asks before a merge, merges only on the user\'s yes, aborts a conflict and keeps the worktree', () => {
  const t = part('**A run made in a new worktree.**', '## A ruling after the run')
  for (const p of ['`$S/worktree-origin` exists', 'Only on their yes', 'merge <this branch>', 'merge --abort', 'The worktree is not removed']) expect(`${p}: ${t.includes(p)}`).toBe(`${p}: true`)
})

// ---------- review round 1 ----------

test('R1: a turn of a new session beside an earlier session\'s run does not move the run\'s idle time: takeup still takes it all off', () => {
  const s = scene(); earlierRun(s)
  writeFileSync(`${s.S()}/started`, `${now() - (3 * 3600 + 600)}\n`) // the run began 3h10m ago, its session stopped 3h ago
  writeFileSync(`${s.S()}/last-stop`, `${now() - 3 * 3600}\n`)
  s.prompt(); expect(s.stop()).toBe('') // a question in the new session, before the take-up
  expect(s.h('takeup').code).toBe(0)
  expect(minutes(s)).toBeLessThanOrEqual(11)
})

test('R2: the idle time comes off once: a second resume with no turn between takes nothing more off', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  writeFileSync(`${s.S()}/started`, `${now() - 2 * 3600}\n`)
  writeFileSync(`${s.S()}/last-stop`, `${now() - 3600}\n`)
  s.hookStart('resume'); s.hookStart('resume')
  expect(minutes(s)).toBeGreaterThanOrEqual(59)
  expect(minutes(s)).toBeLessThanOrEqual(61)
})

test('R5: takeup refuses when HEAD was reset back past the run\'s last recorded step', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  expect(s.h('phase', 'setup').code).toBe(0); expect(s.h('phase', 'oracle').code).toBe(0)
  s.commit('the implementation'); const impl = s.git('rev-parse', 'HEAD').out; expect(s.h('phase', 'implement').code).toBe(0)
  s.hookStart('startup')
  expect(s.git('reset', '-q', '--hard', 'HEAD~1').code).toBe(0)
  const r = s.h('takeup')
  expect(r.code).toBe(1)
  expect(r.err).toContain(impl)
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
})

test('R3: the new worktree for new work is made in a folder outside the repository, with git, and the session is then moved into it', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  for (const p of ['in a folder outside the repository', '`git -C <this folder> worktree add -b <a new branch> <that folder> HEAD`', 'move the session into it with its own worktree tool']) expect(`${p}: ${t.includes(p)}`).toBe(`${p}: true`)
})

const has = (what: string, t: string, ps: string[]) => { for (const p of ps) expect(`${what} holds "${p}": ${t.includes(p)}`).toBe(`${what} holds "${p}": true`) }

test('R4a: beside an earlier session\'s unfinished run, the start text says that other work does not need it (behaviour 4)', () => {
  const s = scene(); earlierRun(s)
  has('the start text', s.hookStart('startup'), ['Other work does not need it'])
})

test('R4b: after takeup, a turn that changed the repository is held with "steps not recorded" (behaviour 11)', () => {
  const s = scene(); earlierRun(s)
  expect(s.h('takeup').code).toBe(0)
  s.prompt(); writeFileSync(`${s.repo}/src/a.txt`, 'changed after the take-up\n')
  const o = s.stop()
  expect(o.startsWith(HELD)).toBe(true)
  has('the reason', o, ['steps not recorded'])
})

test('R4c: the start hook judges the folder of the input\'s cwd: a startup in a worktree takes that worktree\'s reference, not the main folder\'s (behaviour 14)', () => {
  const s = scene(); s.hookStart('startup'); approved(s)
  const wt = `${s.dir}/wt`
  expect(s.git('worktree', 'add', '-q', '-b', 'side', wt, 'HEAD').code).toBe(0)
  s.hookStart('startup', wt)
  expect(existsSync(`${s.S()}/stale`)).toBe(false) // the main folder's run is not made an earlier session's by a start in the worktree
})

test('R4d: the texts of the playbook name every point of behaviours 9, 12, 13, 15, 17 and 18', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  has('the part What the user typed', t, ['without its folder', 'as the item "Show it" says', 'the brainstorm, from item 1', 'Tell the user its path and branch', 'run the whole loop there', 'open a session in a new worktree', 'this run goes on to its end', 'done in another session, in a worktree of its own'])
  has('the paragraph on a run made in a new worktree', part('**A run made in a new worktree.**', '## A ruling after the run'), ['tell the user which files conflict'])
})

test('R4e: CLAUDE.md says that the stop gate holds a spec of this session that waits (behaviour 29)', () => {
  const t = readFileSync(join(import.meta.dir, '../CLAUDE.md'), 'utf8')
  has('CLAUDE.md', t, ['a spec of this session that waits for your approval, when the repository changed'])
})

// ---------- review round 2 ----------

test('V1: the new worktree is made in a lasting folder beside the repository, not in the system\'s temporary folder', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  has('the part What the user typed', t, ['`<this folder>-worktrees/<the new branch>`'])
  expect(`the part names the temporary folder: ${t.includes("system's temporary folder")}`).toBe('the part names the temporary folder: false')
})

test('V3: the Git rule\'s exception names the worktree made by git worktree add, as the part "What the user typed" does', () => {
  const rule = part('- **Git, in the code repository.**', '- **Git, in the records home.**')
  has('the Git rule', rule, ['the new worktree on a new branch that `git worktree add` makes beside the repository for new work beside an unfinished run'])
})

test('V2: the brainstorm, typed by the user, tells the agent to run the playbook from its step 1 (behaviour 7)', () => {
  const t = readFileSync(join(import.meta.dir, '../skills/brainstorm/SKILL.md'), 'utf8')
  const i = t.indexOf('\n## In hstack\n'), j = t.indexOf('\n## ', i + 1)
  has('the section In hstack of brainstorm', t.slice(i, j), ['read the playbook beside this skill, `../build/SKILL.md` from this skill\'s base directory, and run it from its step 1'])
})

// the folder the playbook names for the new worktree: beside the repository
const worktreeOf = (s: Scene, branch: string) => `${s.repo}-worktrees/${branch}`
test('V13: the worktree made as the playbook says leaves the unfinished run\'s folder, state, branch and commits as they were (behaviour 13)', () => {
  const s = scene(); earlierRun(s)
  const before = { status: s.git('status', '--porcelain', '-uall').out, head: s.git('rev-parse', 'HEAD').out, branch: s.git('branch', '--show-current').out, phases: readFileSync(`${s.S()}/phases`, 'utf8'), missing: s.h('missing').out }
  expect(s.git('-C', s.repo, 'worktree', 'add', '-q', '-b', 'new-work', worktreeOf(s, 'new-work'), 'HEAD').code).toBe(0)
  expect(s.git('status', '--porcelain', '-uall').out).toBe(before.status)
  expect(s.git('rev-parse', 'HEAD').out).toBe(before.head)
  expect(s.git('branch', '--show-current').out).toBe(before.branch)
  expect(readFileSync(`${s.S()}/phases`, 'utf8')).toBe(before.phases)
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
  expect(s.h('missing').out).toBe(before.missing)
})

// ---------- the exploratory test ----------

test('X2: when the session cannot be moved into the new worktree, the playbook removes the worktree and its branch it made (behaviour 15)', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  has('the part What the user typed', t, ['`git -C <this folder> worktree remove <that folder>`', '`git -C <this folder> branch -D <the new branch>`'])
})

test('X4: a name that matches no spec is a new request: the brainstorm starts with it, with no question whether it is a typo (behaviour 12)', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  has('the part What the user typed', t, ['A name that matches no spec is such a request too'])
})

test('X6: a waiting spec taken up with no answer after its name is shown again, and the user answers in the next message with no command (behaviour 9)', () => {
  const t = part('**What the user typed.**', '1. **The code repository.**')
  has('the part What the user typed', t, ['the user answers in the next message, with no command'])
})

test('X5: beside an earlier session\'s unfinished run, the start text tells the agent not to bring it up unless the user asks', () => {
  const s = scene(); earlierRun(s)
  has('the start text', s.hookStart('startup'), ['Do not bring it up unless the user asks about it.'])
})

test('X7a: takeup refuses an argument it does not know, and changes nothing', () => {
  const s = scene(); earlierRun(s)
  for (const args of [['--yes'], ['--with-commits', 'extra']]) {
    const r = s.h('takeup', ...args)
    expect(r.code).toBe(1)
    expect(existsSync(`${s.S()}/stale`)).toBe(true)
  }
})

test('X7b: takeup shows the uncommitted changes in the folder, as it shows commits made since: it exits 2 and changes nothing until the user\'s yes', () => {
  const s = scene(); earlierRun(s)
  writeFileSync(`${s.repo}/src/a.txt`, 'left uncommitted\n')
  const r = s.h('takeup')
  expect(r.code).toBe(2)
  expect(r.out).toContain('src/a.txt')
  expect(existsSync(`${s.S()}/stale`)).toBe(true)
  expect(s.h('takeup', '--with-commits').code).toBe(0)
})
