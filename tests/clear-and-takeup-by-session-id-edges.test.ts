// The builder's edges of spec 11 (`docs/specs/2026-11-24-clear-and-takeup-by-session-id.md`): each test names its edge
// in `docs/specs/2026-11-24-clear-and-takeup-by-session-id.decisions.md` (E<n>).
// Run: bun test tests/clear-and-takeup-by-session-id-edges.test.ts
// Every CLAUDE* variable of the shell is removed; CLAUDE_PID and CLAUDE_CODE_SESSION_ID are set only where named.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(120000)
const SCRIPT = join(import.meta.dir, '../scripts/hstack.ts')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-clear-edges-')))
afterAll(() => rmSync(T, { recursive: true, force: true }))
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith('CLAUDE') && !['HSTACK_STATE', 'HSTACK_FEEDBACK_REPO'].includes(k) && !k.startsWith('GIT_')) CLEAN[k] = v
CLEAN.HOME = `${T}/home`
mkdirSync(CLEAN.HOME, { recursive: true })
const sh = (cmd: string[], cwd: string, env: Record<string, string>, stdin?: string) => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode ?? -1, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}
let n = 0
const pid = () => String(process.pid * 1000 + 500 + ++n)
const HELD = '{"decision":"block"'
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`, W = `${dir}/w`
  mkdirSync(`${repo}/src`, { recursive: true })
  const git = (...a: string[]) => sh(['git', ...a], repo, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/src/a.txt`, 'x\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  expect(git('worktree', 'add', '-q', '-b', 'worktree-w', W, 'HEAD').code).toBe(0)
  const hook = (verb: string, input: Record<string, unknown>, p?: string) => sh([BUN, SCRIPT, verb], repo, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo, ...(p ? { CLAUDE_PID: p } : {}) }, JSON.stringify(input))
  const startHook = (id: string, source: string, cwd: string, p?: string) => hook('hook-start', { session_id: id, hook_event_name: 'SessionStart', source, cwd }, p).out
  const endHook = (input: Record<string, unknown>, p?: string) => hook('hook-end', { hook_event_name: 'SessionEnd', ...input }, p)
  const prompt = (id: string, cwd: string) => hook('hook-prompt', { session_id: id, hook_event_name: 'UserPromptSubmit', prompt: 'x', cwd })
  const stop = (id: string, cwd: string) => hook('hook-stop', { session_id: id, hook_event_name: 'Stop', stop_hook_active: false, cwd }).out
  const h = (cwd: string, ...a: string[]) => sh([BUN, SCRIPT, ...a], cwd, { HSTACK_STATE: state })
  const shown = (id: string, at: string) => {
    prompt(id, at); expect(h(at, 'start').code).toBe(0)
    const f = `${dir}/2026-11-25-f-${++n}.md`; writeFileSync(f, 'what\n'); expect(h(at, 'spec', f).code).toBe(0)
    expect(stop(id, at)).toBe('')
    return f
  }
  const approved = (id: string, at: string) => { shown(id, at); prompt(id, at); expect(h(at, 'approve').out).toBe('approved') }
  return { dir, repo, state, W, startHook, endHook, prompt, stop, h, shown, approved }
}

test('E2: a spec that waits, of the cleared session, goes to its new id: a change after it is held for the new id', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.shown('A', s.W)
  const p = pid()
  s.endHook({ session_id: 'A', reason: 'clear', cwd: s.W }, p)
  s.startHook('N', 'clear', s.W, p)
  s.prompt('N', s.W)
  writeFileSync(`${s.W}/src/a.txt`, 'changed while the spec waits\n')
  expect(s.stop('N', s.W).startsWith(HELD)).toBe(true)
})

test('E3: a resume removes the mark of its own process number: a later clear of that number hands nothing over', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.approved('A', s.W)
  const p = pid()
  s.endHook({ session_id: 'A', reason: 'clear', cwd: s.W }, p)
  s.startHook('R', 'resume', s.repo, p)
  s.startHook('N', 'clear', s.W, p)
  expect(s.stop('N', s.W)).toBe('')
  expect(s.stop('A', s.W).startsWith(HELD)).toBe(true)
})

test('E10: an end hook of a clear with no session_id leaves no mark', () => {
  const s = scene()
  const p = pid()
  expect(s.endHook({ reason: 'clear', cwd: s.W }, p).code).toBe(0)
  expect(existsSync(`${s.state}/clear/${p}`)).toBe(false)
  s.endHook({ session_id: 'A', reason: 'clear', cwd: s.W }, p)
  expect(existsSync(`${s.state}/clear/${p}`)).toBe(true)
})

test('E5: a run of spec 10 with a file came and no list: that session is the one a take-up with no known caller gives the run to', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.approved('A', s.W)
  const S = s.h(s.W, 'dir').out
  rmSync(`${S}/seen`, { force: true })
  writeFileSync(`${S}/came`, 'B\n')
  expect(s.h(s.W, 'takeup').code).toBe(0)
  s.prompt('B', s.W)
  expect(s.stop('B', s.W).startsWith(HELD)).toBe(true)
  expect(s.stop('A', s.W)).toBe('')
})

test('E2: two clears in a row in one process: the run goes on to the newest id', () => {
  const s = scene()
  s.startHook('A', 'startup', s.repo)
  s.approved('A', s.W)
  const p = pid()
  s.endHook({ session_id: 'A', reason: 'clear', cwd: s.W }, p); s.startHook('N', 'clear', s.W, p)
  s.endHook({ session_id: 'N', reason: 'clear', cwd: s.W }, p); s.startHook('M', 'clear', s.W, p)
  expect(s.stop('N', s.W)).toBe('')
  expect(s.stop('M', s.W).startsWith(HELD)).toBe(true)
})
