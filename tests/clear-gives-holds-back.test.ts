// Acceptance tests of spec 12 (`docs/specs/2026-11-25-clear-gives-holds-back.md`), written from the spec alone:
// the hooks, behaviours 1 to 5, and one edge of the spec's "A failure" (a run of another session). Each test names its
// behaviour by its number. The texts (behaviours 6 and 7) are in tests/clear-gives-holds-back-texts.test.ts.
// Run: bun test tests/clear-gives-holds-back.test.ts
// Every scene makes a scratch repository with worktrees and a state folder of its own under the system's temporary
// folder (HSTACK_STATE, and HOME pointed there too). The environment of every command is built here: every CLAUDE*
// variable of the shell that runs the tests is removed, and CLAUDE_PID and CLAUDE_CODE_SESSION_ID are set only where a
// behaviour names them, so the tests give the same result in a Claude Code session and in a plain terminal.
// The end hook's verb is the one the entry SessionEnd of hooks/hooks.json names.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const ROOT = resolve(import.meta.dir, '..')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-clear-holds-')))
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

type HookEntry = { hooks?: { command?: string }[] }
function endVerb(): string {
  const hooks = (JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf8')) as { hooks?: Record<string, HookEntry[]> }).hooks ?? {}
  const cmds = (hooks.SessionEnd ?? []).flatMap((e) => e.hooks ?? []).map((x) => x.command ?? '')
  const m = /scripts\/hstack\.ts" (\S+)$/.exec(cmds[0] ?? '')
  if (!m) throw new Error('no end hook verb in hooks/hooks.json')
  return m[1]
}

let n = 0
const pid = () => String(process.pid * 1000 + ++n)
function gitRepo(path: string) {
  mkdirSync(`${path}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], path, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${path}/src/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  return git
}

const HELD = '{"decision":"block"'
const MAX = 3

// a scene: the project's folder (a git repository) and two worktrees W and W2 of it; a state folder of its own.
// Every hook gets CLAUDE_PROJECT_DIR = the project's folder, a session_id and a cwd; CLAUDE_PID only where given.
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`, W = `${dir}/w`, W2 = `${dir}/w2`
  const git = gitRepo(repo)
  expect(git('worktree', 'add', '-q', '-b', 'worktree-w', W, 'HEAD').code).toBe(0)
  expect(git('worktree', 'add', '-q', '-b', 'worktree-w2', W2, 'HEAD').code).toBe(0)
  const hookRun = (verb: string, input: string, p?: string) => sh([BUN, SCRIPT, verb], repo, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo, ...(p === undefined ? {} : { CLAUDE_PID: p }) }, input)
  const json = (id: string, event: string, cwd: string, extra: Record<string, unknown>) => JSON.stringify({ session_id: id, hook_event_name: event, ...extra, cwd })
  // the script's verbs typed in a folder, with no CLAUDE_CODE_SESSION_ID and no CLAUDE_PID
  const h = (cwd: string, args: string[]) => sh([BUN, SCRIPT, ...args], cwd, { HSTACK_STATE: state })
  const startHook = (id: string, source: string, cwd: string, p?: string) => {
    const r = hookRun('hook-start', json(id, 'SessionStart', cwd, { source }), p)
    expect(`the start hook (${source}, ${id}) exits 0: ${r.code}`).toBe(`the start hook (${source}, ${id}) exits 0: 0`)
  }
  const endHook = (id: string, reason: string, cwd: string, p?: string) => {
    const r = hookRun(endVerb(), json(id, 'SessionEnd', cwd, { reason }), p)
    expect(`the end hook (${reason}, ${id}) exits 0: ${r.code}`).toBe(`the end hook (${reason}, ${id}) exits 0: 0`)
  }
  // the clear: the end hook (clear, old, P), then the start hook (clear, neu, P), both with cwd
  const clear = (old: string, neu: string, cwd: string, P: string) => { endHook(old, 'clear', cwd, P); startHook(neu, 'clear', cwd, P) }
  const prompt = (id: string, cwd: string) => expect(hookRun('hook-prompt', json(id, 'UserPromptSubmit', cwd, { prompt: 'a request' })).code).toBe(0)
  const stop = (id: string, cwd: string) => { const r = hookRun('hook-stop', json(id, 'Stop', cwd, { stop_hook_active: false })); expect(r.code).toBe(0); return r.out }
  const held = (id: string, cwd: string) => stop(id, cwd).startsWith(HELD)
  const label = (cwd: string) => (cwd === W ? 'W' : cwd === W2 ? 'W2' : cwd === repo ? 'the project folder' : cwd)
  // k stops of session id in cwd, each held; then, when last is given, one more stop that is held or not
  const expectHeldTimes = (id: string, cwd: string, k: number, what: string) => {
    for (let i = 1; i <= k; i++) expect(`${what}: stop ${i} of ${id} in ${label(cwd)} is held: ${held(id, cwd)}`).toBe(`${what}: stop ${i} of ${id} in ${label(cwd)} is held: true`)
  }
  const expectNotHeld = (id: string, cwd: string, what: string) =>
    expect(`${what}: the stop of ${id} in ${label(cwd)} is held: ${held(id, cwd)}`).toBe(`${what}: the stop of ${id} in ${label(cwd)} is held: false`)
  // the three holds of session id's run used up: three stops held, and the next stop not held
  const useUp = (id: string, cwd: string) => { expectHeldTimes(id, cwd, MAX, 'before the clear'); expectNotHeld(id, cwd, `before the clear, after ${MAX} holds`) }
  // a spec shown by session id in the work tree at (no approval)
  const shown = (id: string, at: string) => {
    prompt(id, at)
    expect(h(at, ['start']).code).toBe(0)
    const f = `${dir}/2026-11-25-feature-${++n}.md`; writeFileSync(f, 'what the feature does\n')
    expect(h(at, ['spec', f]).code).toBe(0)
    expect(stop(id, at)).toBe('') // the turn that shows the spec ends
    return f
  }
  // an approved run of session id in the work tree at
  const approved = (id: string, at: string) => {
    const f = shown(id, at)
    prompt(id, at)
    expect(h(at, ['approve']).out).toBe('approved')
    return f
  }
  return { dir, repo, state, W, W2, git, h, startHook, endHook, clear, prompt, stop, held, expectHeldTimes, expectNotHeld, useUp, shown, approved }
}

// ---------- behaviour 1 ----------

test('1: with an approved, unfinished run of A in a work tree W and its three holds used up: after the clear, N\'s stop in W is held, three times, and the fourth stop is not held', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo, pid())
  s.approved('A', s.W)
  s.useUp('A', s.W)
  s.clear('A', 'N', s.W, pid())
  s.expectHeldTimes('N', s.W, MAX, 'after the clear')
  s.expectNotHeld('N', s.W, `after the clear, after ${MAX} holds`)
})

// ---------- behaviour 2 ----------

test('2: with an approved, unfinished run of A in another work tree W2 of the same repository and its three holds used up, while the end hook, the start hook and N\'s stops have their cwd in W: after the clear, N\'s stop is held by the run in W2, three times', () => {
  const s = scene()
  s.startHook('A', 'startup', s.W, pid())
  s.approved('A', s.W2)
  // A's stops in W are held by its run in W2: the count of holds is that run's
  s.useUp('A', s.W)
  s.clear('A', 'N', s.W, pid())
  for (let i = 1; i <= MAX; i++) {
    const o = s.stop('N', s.W)
    expect(`after the clear: stop ${i} of N in W is held: ${o.startsWith(HELD)}`).toBe(`after the clear: stop ${i} of N in W is held: true`)
    expect(`after the clear: hold ${i} of N in W names the folder W2: ${o.includes(s.W2)} (${o})`).toBe(`after the clear: hold ${i} of N in W names the folder W2: true (${o})`)
  }
})

// ---------- behaviour 3 ----------

test('3: with a spec of A that waits for approval in W, a change of the repository made after the spec was shown, and A\'s stop held three times for it: after the clear, N\'s stop in W is held', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo, pid())
  s.shown('A', s.W)
  s.prompt('A', s.W)
  writeFileSync(`${s.W}/src/b.txt`, 'a change after the spec was shown\n')
  s.useUp('A', s.W)
  s.clear('A', 'N', s.W, pid())
  expect(`after the clear: the stop of N in W is held: ${s.held('N', s.W)}`).toBe('after the clear: the stop of N in W is held: true')
})

// ---------- behaviour 4 (guards what already holds: a clear with no mark changes no count) ----------

test('4: a clear with no mark (the start hook with "source":"clear" and no end hook before it), beside A\'s run in W with its three holds used up: the count is not given back; A\'s next stop in W is not held', () => {
  const s = scene()
  const P = pid()
  s.startHook('A', 'startup', s.repo, P)
  s.approved('A', s.W)
  s.useUp('A', s.W)
  s.startHook('N', 'clear', s.W, P)
  s.expectNotHeld('A', s.W, 'after a clear with no mark')
  s.expectNotHeld('N', s.W, 'after a clear with no mark')
})

// ---------- behaviour 5 (guards what already holds: a compaction gives no hold back) ----------

test('5: a start hook with "source":"compact" of A, with its three holds used up, gives none back: A\'s next stop in W is not held', () => {
  const s = scene()
  const P = pid()
  s.startHook('A', 'startup', s.repo, P)
  s.approved('A', s.W)
  s.useUp('A', s.W)
  s.startHook('A', 'compact', s.W, P)
  s.expectNotHeld('A', s.W, 'after a compaction')
})

// ---------- edge of "A failure": a clear gives no holds back to a run it did not hand over ----------

test('edge (A failure): a clear of A gives no holds back to the run of another session B in W2 whose three holds are used up', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo, pid())
  s.approved('A', s.W)
  s.startHook('B', 'startup', s.W2, pid())
  s.approved('B', s.W2)
  s.useUp('B', s.W2)
  s.clear('A', 'N', s.W, pid())
  s.expectNotHeld('B', s.W2, 'after the clear of A')
  // the run A's clear handed over is held, and N's stops are held by it, not by B's run
  const o = s.stop('N', s.W)
  expect(`after the clear: the stop of N in W is held: ${o.startsWith(HELD)}`).toBe('after the clear: the stop of N in W is held: true')
  expect(`after the clear: the hold of N does not name W2: ${!o.includes(s.W2)}`).toBe('after the clear: the hold of N does not name W2: true')
})
