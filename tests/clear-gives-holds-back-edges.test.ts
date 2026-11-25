// The builder's edge tests of spec 12 (`docs/specs/2026-11-25-clear-gives-holds-back.md`), decisions E1 and E4 of
// `docs/specs/2026-11-25-clear-gives-holds-back.decisions.md`. The scene is the one of the oracle's file
// tests/clear-gives-holds-back.test.ts, copied: every CLAUDE* variable of the shell is removed.
// Run: bun test tests/clear-gives-holds-back-edges.test.ts
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const ROOT = resolve(import.meta.dir, '..')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-clear-holds-edges-')))
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
test('E1: a clear whose hooks have their cwd in W2 gives the holds back to the run in W that it hands over: N\'s stop in W is held three times', () => {
  const s = scene()
  s.startHook('A', 'startup', s.W, pid())
  s.approved('A', s.W)
  s.useUp('A', s.W)
  s.clear('A', 'N', s.W2, pid())
  s.expectHeldTimes('N', s.W, MAX, 'after the clear from W2')
  s.expectNotHeld('N', s.W, `after the clear from W2, after ${MAX} holds`)
})

test('E4: two clears in a row in one process, each with its mark: the second hand-over gives the holds back again, and M is held three times', () => {
  const s = scene()
  const P = pid()
  s.startHook('A', 'startup', s.W, P)
  s.approved('A', s.W)
  s.useUp('A', s.W)
  s.clear('A', 'N', s.W, P)
  s.useUp('N', s.W)
  s.clear('N', 'M', s.W, P)
  s.expectHeldTimes('M', s.W, MAX, 'after the second clear')
  s.expectNotHeld('M', s.W, `after the second clear, after ${MAX} holds`)
})
