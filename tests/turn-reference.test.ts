// Acceptance tests of spec 4 ("the stop hook judges a turn by what changed in it", feedback issue 8), written from
// the spec alone: the three hooks of scripts/hstack.ts, behaviours 1 to 18.
// Run: bun test tests/turn-reference.test.ts
// Each test names the behaviour of the spec it checks by its number. Every test is its own story: it makes a scratch
// repository and a state folder of its own under the system's temporary folder, and they are removed at the end.
// The prompt hook's verb is the builder's to name: it is read from the UserPromptSubmit entry of hooks/hooks.json.
// "The user's change" is made before the prompt hook of a turn, "the builder's change" after it. No test waits for
// the clock, and none starts a Claude Code session.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts') // HSTACK_SCRIPT runs another copy of the script
const HOOKS = join(dirname(SCRIPT), '../hooks/hooks.json') // the hooks of that copy
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-turn-test-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe) // a run that ends before afterAll

// nothing of the caller's session reaches the script: its own state folder, and no project folder of a real session
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v

type Out = { code: number; out: string; err: string }
function sh(cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

// ---------- hooks/hooks.json ----------

const PREFIX = 'bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" '
// the commands of one event of hooks/hooks.json
function commands(event: string): string[] {
  const all = (JSON.parse(readFileSync(HOOKS, 'utf8')) as { hooks?: Record<string, { hooks?: { type?: string; command?: string }[] }[]> }).hooks ?? {}
  return (all[event] ?? []).flatMap((e) => e.hooks ?? []).filter((h) => h.type === 'command').map((h) => h.command ?? '')
}
// the verb of the prompt hook: the one word after the script in the command of UserPromptSubmit
function promptVerb(): string {
  const found = commands('UserPromptSubmit')
  expect(`hooks/hooks.json: commands of UserPromptSubmit: ${found.length}`).toBe('hooks/hooks.json: commands of UserPromptSubmit: 1')
  const c = found[0] ?? ''
  expect(`the command of UserPromptSubmit is ${PREFIX}<one verb>: ${c.startsWith(PREFIX) && /^[a-z][a-z-]*$/.test(c.slice(PREFIX.length))}`).toBe(`the command of UserPromptSubmit is ${PREFIX}<one verb>: true`)
  return c.slice(PREFIX.length)
}

// ---------- a scene: a scratch repository with one commit, and a state folder of its own ----------

let n = 0
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`
  mkdirSync(`${repo}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], repo, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/src/a.txt`, 'x = 1\n'); writeFileSync(`${repo}/src/b.txt`, 'y = 1\n')
  git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  const env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  const h = (...args: string[]) => sh([BUN, SCRIPT, ...args], repo, { HSTACK_STATE: state })
  // the three hooks, as Claude Code calls them: the hook's JSON on stdin, the session's id in each
  const hookStart = (source = 'startup', id = 'x') => sh([BUN, SCRIPT, 'hook-start'], repo, env, `{"session_id":"${id}","hook_event_name":"SessionStart","source":"${source}"}`).out
  const stop = (id = 'x') => sh([BUN, SCRIPT, 'hook-stop'], repo, env, `{"session_id":"${id}","hook_event_name":"Stop","stop_hook_active":false}`).out
  // the prompt hook: it prints nothing and exits 0, whatever the state (behaviour 2)
  const prompt = (id = 'x') => {
    const r = sh([BUN, SCRIPT, promptVerb()], repo, env, `{"hook_event_name":"UserPromptSubmit","session_id":"${id}","prompt":"a question"}`)
    expect(`the prompt hook: exit ${r.code}, printed "${r.out}"`).toBe('the prompt hook: exit 0, printed ""')
  }
  const S = h('dir').out
  expect(S.startsWith(`${state}/`)).toBe(true) // the state of this test, not the machine's
  let c = 0
  // a commit of a new file of its own: the commit changes, the list of changed files does not
  const commit = () => { const f = `note-${++c}.txt`; writeFileSync(`${repo}/${f}`, 'a note\n'); expect(git('add', '--', f).code).toBe(0); expect(git('commit', '-qm', `note ${c}`, '--', f).code).toBe(0) }
  // changes that are not committed
  const edit = (f = 'src/a.txt') => writeFileSync(`${repo}/${f}`, `changed ${++c}\n`)
  const add = () => writeFileSync(`${repo}/new-${++c}.txt`, 'a new file\n')
  return { dir, repo, S, git, h, hookStart, stop, prompt, commit, edit, add }
}
type Scene = ReturnType<typeof scene>

const HELD = '{"decision":"block"'
// the reason of a hold: the stop hook printed one JSON object with "decision": "block"
function reason(out: string): string {
  expect(`the stop hook holds the turn: ${out.startsWith(HELD)}`).toBe('the stop hook holds the turn: true')
  if (!out.startsWith(HELD)) return ''
  const o = JSON.parse(out) as { decision?: string; reason?: unknown }
  expect(o.decision).toBe('block'); expect(typeof o.reason).toBe('string')
  return String(o.reason)
}
const heldWith = (out: string, phrase: string) => { const r = reason(out); expect(`the reason holds "${phrase}": ${r.includes(phrase)}`).toBe(`the reason holds "${phrase}": true`) }
const ends = (what: string, out: string) => expect(`${what}: the stop hook printed "${out}"`).toBe(`${what}: the stop hook printed ""`)

const NO_WORKFLOW = 'the repository changed without the hstack:build workflow'
const AFTER_FINAL = 'the repository changed after the last final check'
const NOT_RECORDED = 'steps not recorded'
const SPEC_WAITS = 'a spec waits for the user\'s approval'
const DECIDE = 'Decide from the approved spec and the code'
const REPLY = 'end with exactly the reply the task asked for'

// a spec outside the repository: the run changes nothing in it
const specOut = (s: Scene) => { const f = `${s.dir}/spec.md`; writeFileSync(f, 'what the feature does\n'); return f }
// a run up to the approval, with or without the prompt hook at each message of the user:
// the first turn ends with the spec shown, the second starts with the approval
function approved(s: Scene, withPrompt: boolean, id = 'x') {
  if (withPrompt) s.prompt(id)
  expect(s.h('start').code).toBe(0)
  expect(s.h('spec', specOut(s)).code).toBe(0)
  ends('the turn that shows the spec', s.stop(id))
  if (withPrompt) s.prompt(id)
  expect(s.h('approve').out).toBe('approved')
}
// the rest of the run, to its end: every step recorded, the run's one commit, done
function finish(s: Scene) {
  writeFileSync(`${s.repo}/src/built.txt`, 'the feature\n'); expect(s.git('add', '--', 'src/built.txt').code).toBe(0); expect(s.git('commit', '-qm', 'the feature', '--', 'src/built.txt').code).toBe(0)
  for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) expect(s.h('phase', p).code).toBe(0)
  expect(s.h('records-check', '--none', 'a test repository with no records').code).toBe(0)
  expect(s.h('phase', 'records').code).toBe(0); expect(s.h('done').code).toBe(0)
}
// a run that this session finished: its last turn ends at done
function finishedHere(s: Scene) {
  s.hookStart('startup'); approved(s, true); finish(s)
  ends('the turn that finishes the run', s.stop())
}
// an earlier session and its run, then a new session: finished, approved and left, or started and left with no spec shown
type Earlier = 'finished' | 'approved and left unfinished' | 'started and left with no spec shown'
const EARLIER: Earlier[] = ['finished', 'approved and left unfinished', 'started and left with no spec shown']
// (withPrompt false: the earlier session ran no prompt hook, as a session of 0.4.3 or earlier)
function besideEarlier(s: Scene, kind: Earlier, withPrompt = true) {
  s.hookStart('startup', 'w')
  if (kind === 'started and left with no spec shown') { if (withPrompt) s.prompt('w'); expect(s.h('start').code).toBe(0) } else {
    approved(s, withPrompt, 'w')
    if (kind === 'finished') { finish(s); ends('the turn that finishes the earlier run', s.stop('w')) } else expect(s.h('phase', 'setup').code).toBe(0)
  }
  s.hookStart('startup', 'x') // the new session
}

// ---------- the new hook ----------

test('1: hooks/hooks.json holds, beside SessionStart and Stop, an entry UserPromptSubmit whose command is bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" followed by one verb of the script', () => {
  expect(commands('SessionStart')).toEqual([`${PREFIX}hook-start`])
  expect(commands('Stop')).toEqual([`${PREFIX}hook-stop`])
  const verb = promptVerb()
  // a new command: none of the verbs the script had
  const had = 'dir repo home start spec approve phase records-check ruled missing lock gate elapsed times done feedback hook-start hook-stop'.split(' ')
  expect(`the verb "${verb}" is a new command of the script: ${verb !== '' && !had.includes(verb)}`).toBe(`the verb "${verb}" is a new command of the script: true`)
})

test('2: the prompt hook prints nothing and exits 0 in a repository with no run', () => {
  const s = scene()
  const run = () => sh([BUN, SCRIPT, promptVerb()], s.repo, { HSTACK_STATE: `${s.dir}/state`, CLAUDE_PROJECT_DIR: s.repo }, '{"hook_event_name":"UserPromptSubmit","session_id":"x","prompt":"a question"}')
  const first = run() // before any other hook of the session
  expect([first.code, first.out, first.err]).toEqual([0, '', ''])
  s.hookStart('startup')
  const second = run()
  expect([second.code, second.out, second.err]).toEqual([0, '', ''])
  s.edit() // and in a turn that is open, in a repository that changed
  const third = run()
  expect([third.code, third.out, third.err]).toEqual([0, '', ''])
})

test('2: the prompt hook prints nothing and exits 0 in a repository with a run: started, with a waiting spec, approved, finished', () => {
  const s = scene()
  const run = (what: string) => {
    const r = sh([BUN, SCRIPT, promptVerb()], s.repo, { HSTACK_STATE: `${s.dir}/state`, CLAUDE_PROJECT_DIR: s.repo }, '{"hook_event_name":"UserPromptSubmit","session_id":"x","prompt":"a question"}')
    expect(`${what}: exit ${r.code}, stdout "${r.out}", stderr "${r.err}"`).toBe(`${what}: exit 0, stdout "", stderr ""`)
  }
  s.hookStart('startup')
  expect(s.h('start').code).toBe(0); run('a run started')
  expect(s.h('spec', specOut(s)).code).toBe(0); run('a spec waits')
  ends('the turn that shows the spec', s.stop())
  run('a spec waits and was shown')
  expect(s.h('approve').out).toBe('approved'); run('the run is approved')
  finish(s); run('the run is finished')
})

test('2: the prompt hook prints nothing and exits 0 outside a git repository', () => {
  const dir = `${T}/outside-${++n}`, state = `${dir}/state`, plain = `${dir}/plain`
  mkdirSync(plain, { recursive: true })
  expect(sh(['git', 'rev-parse', '--show-toplevel'], plain, {}).code).not.toBe(0) // the folder is in no repository
  const r = sh([BUN, SCRIPT, promptVerb()], plain, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: plain }, '{"hook_event_name":"UserPromptSubmit","session_id":"x","prompt":"a question"}')
  expect([r.code, r.out, r.err]).toEqual([0, '', ''])
})

// ---------- a turn that changed nothing ends ----------

test('3: with no run started, after the start hook (startup), a commit made in the repository and then the prompt hook, the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup')
  s.commit(); s.prompt()
  ends('the turn after the user\'s commit', s.stop())
})

test('3: the user commits between two turns of a brainstorm, and again: each turn that only talks ends', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); ends('turn 1', s.stop())
  s.commit()
  s.prompt(); ends('turn 2, after the user\'s commit', s.stop())
  s.prompt(); ends('turn 3, nothing changed', s.stop())
  s.commit(); s.commit()
  s.prompt(); ends('turn 4, after two commits of the user', s.stop())
})

test('4: the same when the change made before the prompt hook is not committed (a tracked file edited): the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup')
  s.edit('src/a.txt'); s.prompt()
  ends('the turn after the user\'s edit', s.stop())
  s.prompt(); ends('the turn after it, the edit still not committed', s.stop())
})

test('4: the same when the change made before the prompt hook is not committed (a new file): the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); ends('turn 1', s.stop())
  s.add(); s.prompt()
  ends('the turn after the user\'s new file', s.stop())
})

test('5: with no run started, after the start hook (resume) in a repository whose reference was taken by an earlier session, a commit made since, and then the prompt hook, the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup', 'w') // the earlier session takes the reference
  s.commit() // the user's commit, before the session is resumed
  s.hookStart('resume')
  s.prompt()
  ends('the turn of the resumed session', s.stop())
})

test('5: the same when the earlier session had a turn that ended, and when the commit is made after the resume', () => {
  const s = scene()
  s.hookStart('startup', 'w'); s.prompt('w'); ends('the turn of the earlier session', s.stop('w'))
  s.hookStart('resume')
  s.commit() // the user's commit, after the resume and before the message
  s.prompt()
  ends('the turn of the resumed session', s.stop())
})

for (const source of ['resume', 'clear']) {
  test(`6: in a repository whose state folder holds no reference yet, after the start hook (${source}) and with no prompt hook, the stop hook lets a turn end in which nothing changed, and, with no run (spec 9), one in which the repository changed`, () => {
    const s = scene()
    s.hookStart(source)
    ends('a turn in which nothing changed', s.stop())
    ends('a second one', s.stop())
    s.edit()
    ends('a turn with no run in which the repository changed', s.stop())
  })
  test(`6: the same after the start hook (${source}) when the change is a commit: with no run (spec 9), the turn ends`, () => {
    const s = scene()
    s.hookStart(source)
    ends('a turn in which nothing changed', s.stop())
    s.commit()
    ends('a commit with no run', s.stop())
  })
}

test('7: after a run that this session finished (done): a commit made in the repository, then the prompt hook, and the stop hook lets the turn end', () => {
  const s = scene()
  finishedHere(s)
  s.commit(); s.prompt()
  ends('the turn after the user\'s commit', s.stop())
  s.prompt(); ends('the turn after it, nothing changed', s.stop())
})

for (const kind of EARLIER) test(`8: beside a run of an earlier session (${kind}): after the start hook (startup), a commit made in the repository, and then the prompt hook, the stop hook lets the turn end`, () => {
  const s = scene()
  besideEarlier(s, kind)
  s.commit(); s.prompt()
  ends('the turn after the user\'s commit', s.stop())
  s.prompt(); ends('the turn after it, nothing changed', s.stop())
})

for (const kind of EARLIER) test(`8: the same beside a run (${kind}) of an earlier session in which the prompt hook never ran`, () => {
  const s = scene()
  besideEarlier(s, kind, false)
  s.commit(); s.prompt()
  ends('the turn after the user\'s commit', s.stop())
})

// ---------- what is still held ----------

for (const [what, change] of [['a tracked file edited', (s: Scene) => s.edit()], ['a new file', (s: Scene) => s.add()], ['a commit', (s: Scene) => s.commit()]] as [string, (s: Scene) => void][])
  test(`9: with no run started, a change made in the repository after the prompt hook (${what}) ends the turn (spec 9: the loop runs only when the user invokes it)`, () => {
    const s = scene()
    s.hookStart('startup')
    s.prompt(); change(s)
    ends('a change with no run', s.stop())
  })

test('9: with no run, a change ends the turn also when the user changed the repository before it: a commit, the prompt hook, then a change (spec 9)', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); ends('turn 1', s.stop())
  s.commit(); s.edit('src/a.txt') // the user's: a commit, and an edit that is not committed
  s.prompt()
  s.edit('src/b.txt') // the agent's, in another file
  ends('a change with no run', s.stop())
})

for (const [what, change] of [['a tracked file edited', (s: Scene) => s.edit()], ['a commit', (s: Scene) => s.commit()]] as [string, (s: Scene) => void][])
  test(`10: after a run that this session finished, a change made in the repository after the prompt hook (${what}) ends the turn (spec 9)`, () => {
    const s = scene()
    finishedHere(s)
    s.prompt(); change(s)
    ends('a change after the finished run', s.stop())
  })

test('10: the same when the user committed before that turn: a commit, the prompt hook, then a change', () => {
  const s = scene()
  finishedHere(s)
  s.commit(); s.prompt()
  s.edit()
  ends('a change after the finished run', s.stop())
})

for (const kind of EARLIER) test(`11: beside a run of an earlier session (${kind}), a change made in the repository after the prompt hook ends the turn (spec 9)`, () => {
  const s = scene()
  besideEarlier(s, kind)
  s.commit(); s.prompt()
  s.edit()
  ends('a change beside an earlier session\'s run', s.stop())
})

test('11: the same when the change is a commit made after the prompt hook, beside a finished run of an earlier session', () => {
  const s = scene()
  besideEarlier(s, 'finished')
  s.prompt(); s.commit()
  ends('a commit beside an earlier session\'s finished run', s.stop())
})

test('12: an approved run that is not finished, in the session that started it, is held when the prompt hook ran, with a reason that holds "steps not recorded"', () => {
  const s = scene()
  s.hookStart('startup'); approved(s, true)
  expect(s.git('status', '--porcelain').out).toBe('') // nothing changed in the repository in this turn
  heldWith(s.stop(), NOT_RECORDED)
})

test('12: an approved run that is not finished is held when the prompt hook did not run (as 0.4.3 does)', () => {
  const s = scene()
  s.hookStart('startup'); approved(s, false)
  heldWith(s.stop(), NOT_RECORDED)
})

test('12: a run with no spec shown yet, in the session that started it, is held when the prompt hook ran, with a reason that holds "steps not recorded"', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); expect(s.h('start').code).toBe(0)
  heldWith(s.stop(), NOT_RECORDED)
})

test('12: a run with no spec shown yet is held when the prompt hook did not run (as 0.4.3 does)', () => {
  const s = scene()
  s.hookStart('startup')
  expect(s.h('start').code).toBe(0)
  heldWith(s.stop(), NOT_RECORDED)
})

// a spec in the repository, where the playbook puts it, shown to the user: the turn that shows it has ended
function waiting(s: Scene, withPrompt: boolean) {
  s.hookStart('startup')
  if (withPrompt) s.prompt()
  expect(s.h('start').code).toBe(0)
  mkdirSync(`${s.repo}/docs/specs`, { recursive: true }); const f = `${s.repo}/docs/specs/2026-01-01-topic.md`; writeFileSync(f, 'what the feature does\n')
  expect(s.h('spec', f).code).toBe(0)
  ends('the turn that shows the spec', s.stop())
}

test('13: while a spec waits for the user\'s approval, a commit made in the repository and then the prompt hook change nothing: the stop hook holds the turn, with a reason that holds "a spec waits for the user\'s approval"', () => {
  const s = scene()
  waiting(s, true)
  s.commit(); s.prompt()
  heldWith(s.stop(), SPEC_WAITS)
  expect(s.h('approve').code).not.toBe(0) // and approve refuses, as before
})

test('13: the same with no prompt hook (as 0.4.3 does)', () => {
  const s = scene()
  waiting(s, false)
  s.commit()
  heldWith(s.stop(), SPEC_WAITS)
})

test('13: while a spec waits and nothing changed, a turn after the prompt hook ends, as before', () => {
  const s = scene()
  waiting(s, true)
  s.prompt(); ends('a turn that answers a question about the spec', s.stop())
})

// ---------- the note is taken only when the turn before has ended ----------

test('14: with no run started, a change made in the repository after the prompt hook, and then the prompt hook once more before any stop hook: the turn ends (spec 9)', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); s.edit()
  s.prompt() // a message that arrives in the middle of the turn
  ends('a change with no run', s.stop())
})

test('14: the same when the change is a commit, in a turn after one that ended', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt(); ends('turn 1', s.stop())
  s.prompt(); s.commit()
  s.prompt(); s.prompt()
  ends('a commit with no run', s.stop())
})

test('15: a turn that the stop hook held stays the same turn: the prompt hook after that hold changes nothing, and the next stop hook holds again (up to the cap of three holds), inside a run of this session (spec 9)', () => {
  const s = scene()
  s.hookStart('startup'); approved(s, true)
  s.edit()
  heldWith(s.stop(), NOT_RECORDED)
  s.prompt()
  heldWith(s.stop(), NOT_RECORDED)
  s.prompt()
  heldWith(s.stop(), NOT_RECORDED)
  s.prompt()
  ends('the stop past the cap', s.stop())
})

test('16: after a turn that was interrupted (its prompt hook ran, no stop hook did): a commit, then the prompt hook, and with no run (spec 9) the turn ends', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt() // the turn the user interrupts: no stop hook runs
  s.commit(); s.prompt()
  ends('a commit after an interrupted turn, with no run', s.stop())
})

// ---------- without the new hook ----------

test('17: in a session in which the prompt hook never runs, after the start hook (startup) and a commit made in the repository, with no run the stop hook lets the turn end (spec 9)', () => {
  const s = scene()
  s.hookStart('startup')
  ends('a turn before anything changed', s.stop())
  s.commit()
  ends('a commit with no run', s.stop())
})

test('17: the same after a resume, which keeps the reference of the session that was resumed', () => {
  const s = scene()
  s.hookStart('startup')
  s.commit()
  s.hookStart('resume')
  ends('a commit with no run, after a resume', s.stop())
})

// ---------- the reason of a hold ----------

test('18: with no run started there is no hold, and so no reason (spec 9)', () => {
  const s = scene()
  s.hookStart('startup'); s.edit()
  ends('a change with no run', s.stop())
})

test('18: the reason of the hold while a spec waits does not hold "Decide from the approved spec and the code", and holds "end with exactly the reply the task asked for"', () => {
  const s = scene()
  waiting(s, false); s.edit()
  const r = reason(s.stop())
  expect(`the reason holds "${SPEC_WAITS}": ${r.includes(SPEC_WAITS)}`).toBe(`the reason holds "${SPEC_WAITS}": true`)
  expect(`the reason holds "${DECIDE}": ${r.includes(DECIDE)}`).toBe(`the reason holds "${DECIDE}": false`)
  expect(`the reason holds "${REPLY}": ${r.includes(REPLY)}`).toBe(`the reason holds "${REPLY}": true`)
})

test('18: the reason of the hold of an approved, unfinished run holds "Decide from the approved spec and the code" and "end with exactly the reply the task asked for"', () => {
  const s = scene()
  s.hookStart('startup'); approved(s, false)
  const r = reason(s.stop())
  expect(`the reason holds "${NOT_RECORDED}": ${r.includes(NOT_RECORDED)}`).toBe(`the reason holds "${NOT_RECORDED}": true`)
  expect(`the reason holds "${DECIDE}": ${r.includes(DECIDE)}`).toBe(`the reason holds "${DECIDE}": true`)
  expect(`the reason holds "${REPLY}": ${r.includes(REPLY)}`).toBe(`the reason holds "${REPLY}": true`)
})

test('18: the two reasons are the same when the prompt hook ran, and with no run there is still no hold (spec 9)', () => {
  const none = scene()
  none.hookStart('startup'); none.prompt(); none.edit()
  ends('a change with no run', none.stop())
  const waits = scene()
  waiting(waits, true); waits.prompt(); waits.edit()
  const b = reason(waits.stop())
  const run = scene()
  run.hookStart('startup'); approved(run, true)
  const c = reason(run.stop())
  expect([b.includes(DECIDE), c.includes(DECIDE)]).toEqual([false, true])
  expect([b.includes(REPLY), c.includes(REPLY)]).toEqual([true, true])
})
