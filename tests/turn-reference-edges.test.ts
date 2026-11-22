// The builder's tests of spec 4 ("the stop hook judges a turn by what changed in it", feedback issue 8): the edges it
// decided alone, each named as in the decisions file beside the spec (docs/specs/2026-11-22-turn-reference.decisions.md).
// Run: bun test tests/turn-reference-edges.test.ts
// Every test is its own story, in a scratch repository and a state folder of its own under the system's temporary
// folder; both are removed at the end. "The user's change" is made before the prompt hook of a turn, "the builder's
// change" after it. No test starts a Claude Code session.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-turn-edges-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe)

// nothing of the caller's session reaches the script
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v

type Out = { code: number; out: string; err: string }
function sh(cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

const PROMPT_INPUT = '{"hook_event_name":"UserPromptSubmit","session_id":"x","prompt":"a question"}'
// a git repository with one commit
function repoAt(repo: string) {
  mkdirSync(`${repo}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], repo, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/src/a.txt`, 'x = 1\n')
  git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  return git
}
let n = 0
// a scene: a scratch repository, a state folder of its own, and the three hooks as Claude Code calls them there
function scene(project?: string) {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`
  const git = repoAt(repo)
  const env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: project ?? repo }
  const h = (...args: string[]) => sh([BUN, SCRIPT, ...args], repo, { HSTACK_STATE: state })
  const hookStart = (source = 'startup') => sh([BUN, SCRIPT, 'hook-start'], repo, env, `{"session_id":"x","hook_event_name":"SessionStart","source":"${source}"}`).out
  const stop = () => sh([BUN, SCRIPT, 'hook-stop'], repo, env, '{"session_id":"x","hook_event_name":"Stop","stop_hook_active":false}').out
  const promptRaw = (stdin: string | undefined = PROMPT_INPUT, e: Record<string, string> = env, cwd = repo) => sh([BUN, SCRIPT, 'hook-prompt'], cwd, e, stdin)
  const prompt = () => { const r = promptRaw(); expect(`the prompt hook: exit ${r.code}, printed "${r.out}${r.err}"`).toBe('the prompt hook: exit 0, printed ""') }
  let c = 0
  const commit = (g = git, where = repo) => { const f = `note-${++c}.txt`; writeFileSync(`${where}/${f}`, 'a note\n'); expect(g('add', '--', f).code).toBe(0); expect(g('commit', '-qm', `note ${c}`, '--', f).code).toBe(0) }
  const edit = (where = repo) => writeFileSync(`${where}/src/a.txt`, `changed ${++c}\n`)
  return { dir, repo, state, env, S: h('dir').out, git, h, hookStart, stop, prompt, promptRaw, commit, edit }
}
type Scene = ReturnType<typeof scene>

const HELD = '{"decision":"block"'
const ends = (what: string, out: string) => expect(`${what}: the stop hook printed "${out}"`).toBe(`${what}: the stop hook printed ""`)
const held = (what: string, out: string, phrase = '') => {
  expect(`${what}: the stop hook holds the turn: ${out.startsWith(HELD)}`).toBe(`${what}: the stop hook holds the turn: true`)
  const reason = out.startsWith(HELD) ? String((JSON.parse(out) as { reason?: unknown }).reason) : ''
  if (phrase) expect(`${what}: the reason holds "${phrase}": ${reason.includes(phrase)}`).toBe(`${what}: the reason holds "${phrase}": true`)
  return reason
}
const NO_WORKFLOW = 'the repository changed without the hstack:build workflow'

// ---------- which starts of a session end a turn left open ----------

for (const source of ['resume', 'clear']) test(`E2: a turn left open by an interrupt ends at a ${source}: the next message takes a new note`, () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt() // a turn starts, and is interrupted: no stop hook runs
  s.commit() // the user's own commit
  s.hookStart(source)
  s.prompt()
  ends(`the first turn after the ${source}`, s.stop())
})

for (const source of ['compact', 'fork']) test(`E2: a ${source} in the middle of a turn does not end it: the builder's change before it is still held`, () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt()
  s.edit() // the builder's change, in this turn
  s.hookStart(source)
  s.prompt() // a message that arrives in the same turn
  held(`the turn with a ${source} in it`, s.stop(), NO_WORKFLOW)
})

// ---------- the ways out of the stop hook that end a turn ----------

test('E8: a turn that ends on a feedback verb\'s pass has ended: the user\'s commit after it does not hold the next turn', () => {
  const s = scene()
  s.hookStart('startup')
  s.prompt()
  expect(s.h('feedback', 'draft').code).toBe(0) // the user spent this turn on a feedback verb: it leaves a pass
  ends('the turn of the feedback verb', s.stop())
  s.commit() // the user's own commit, between the two turns
  s.prompt()
  ends('the turn after it', s.stop())
})

// a run of the scene's own session up to a spec that waits and was shown: the spec file is in the repository
function waitingSpec(s: Scene, withPrompt: boolean) {
  s.hookStart('startup')
  if (withPrompt) s.prompt()
  expect(s.h('start').code).toBe(0)
  writeFileSync(`${s.repo}/spec.md`, 'what the feature does\n')
  expect(s.h('spec', 'spec.md').code).toBe(0)
  ends('the turn that shows the spec', s.stop())
}

for (const withPrompt of [true, false]) test(`E11: a turn that drops a waiting spec after the user changed the repository ends, ${withPrompt ? 'with the prompt hook' : 'without the prompt hook (as 0.4.3 does)'}`, () => {
  const s = scene()
  waitingSpec(s, withPrompt)
  s.commit() // the user's own commit while the spec waits: approve would refuse now
  if (withPrompt) s.prompt()
  rmSync(`${s.repo}/spec.md`) // the builder does what the hook's reason says: the spec file goes, the run is dropped
  expect(s.h('spec', '--drop').out).toBe('dropped')
  ends('the turn that drops the spec', s.stop())
})

// a run from start to done, in the scene's session; the stop after it ends the turn
function finishedRun(s: Scene) {
  expect(s.h('start').code).toBe(0)
  const spec = `${s.dir}/spec.md`; writeFileSync(spec, 'what the feature does\n')
  expect(s.h('spec', spec).code).toBe(0)
  ends('the turn that shows the spec', s.stop())
  expect(s.h('approve').out).toBe('approved')
  writeFileSync(`${s.repo}/src/built.txt`, 'the feature\n'); expect(s.git('add', '--', 'src/built.txt').code).toBe(0); expect(s.git('commit', '-qm', 'the feature', '--', 'src/built.txt').code).toBe(0)
  for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) expect(s.h('phase', p).code).toBe(0)
  expect(s.h('records-check', '--none', 'a test repository with no records').code).toBe(0)
  expect(s.h('phase', 'records').code).toBe(0); expect(s.h('done').code).toBe(0)
  ends('the turn that finishes the run', s.stop())
}

test('E11: a message that arrives after spec --drop in the same turn does not take the builder\'s change into the note', () => {
  const s = scene()
  waitingSpec(s, true)
  s.prompt() // the next turn
  rmSync(`${s.repo}/spec.md`); expect(s.h('spec', '--drop').out).toBe('dropped')
  s.edit() // the builder's change, after the drop, with no run
  s.prompt() // a message of another session, in the same turn
  held('the turn of the drop and the change', s.stop(), NO_WORKFLOW)
})

test('E13: the note outlives a start that moves an earlier run away: a run started and dropped in one turn leaves the turn open', () => {
  const s = scene()
  s.hookStart('startup'); finishedRun(s) // an earlier session and its finished run
  s.hookStart('startup') // a new session
  s.prompt()
  expect(s.h('start').code).toBe(0) // the earlier run goes to old/
  writeFileSync(`${s.repo}/spec.md`, 'what the feature does\n'); expect(s.h('spec', 'spec.md').code).toBe(0)
  rmSync(`${s.repo}/spec.md`); expect(s.h('spec', '--drop').out).toBe('dropped')
  s.edit() // the builder's change, with no run
  s.prompt() // a message of another session, in the same turn
  held('the turn of the start, the drop and the change', s.stop())
})

// ---------- a code repository of its own (.hstack/repo) ----------

// a records home with a nested code repository that the home ignores; the hooks are called in the home
function outer() {
  const dir = `${T}/o${++n}`, home = `${dir}/home`, code = `${home}/code`, state = `${dir}/state`
  const gitHome = repoAt(home)
  writeFileSync(`${home}/.gitignore`, 'code/\n.hstack/\n'); gitHome('add', '-A'); expect(gitHome('commit', '-qm', 'home').code).toBe(0)
  const gitCode = repoAt(code)
  const at = (project: string) => ({ HSTACK_STATE: state, CLAUDE_PROJECT_DIR: project })
  const h = (cwd: string, ...args: string[]) => sh([BUN, SCRIPT, ...args], cwd, { HSTACK_STATE: state })
  const hookStart = (project = home) => sh([BUN, SCRIPT, 'hook-start'], project, at(project), '{"session_id":"x","hook_event_name":"SessionStart","source":"startup"}').out
  const stop = (project = home) => sh([BUN, SCRIPT, 'hook-stop'], project, at(project), '{"session_id":"x","hook_event_name":"Stop","stop_hook_active":false}').out
  const prompt = (project = home) => sh([BUN, SCRIPT, 'hook-prompt'], project, at(project), PROMPT_INPUT)
  let c = 0
  const commitCode = () => { const f = `note-${++c}.txt`; writeFileSync(`${code}/${f}`, 'a note\n'); expect(gitCode('add', '--', f).code).toBe(0); expect(gitCode('commit', '-qm', `note ${c}`, '--', f).code).toBe(0) }
  return { home, code, h, hookStart, stop, prompt, commitCode }
}
const silent = (what: string, r: Out) => expect(`${what}: exit ${r.code}, printed "${r.out}${r.err}"`).toBe(`${what}: exit 0, printed ""`)

test('E12: repo <path> ends a turn that an earlier session left open in the code repository', () => {
  const o = outer()
  // an earlier session, started inside the code repository, was interrupted in the middle of a turn
  o.hookStart(o.code); silent('the prompt hook of the earlier session', o.prompt(o.code))
  o.commitCode() // the user's own commit, after it
  // a new session in the home names the code repository: it starts there as a new session does
  o.hookStart(o.home)
  expect(o.h(o.home, 'repo', 'code').out).toBe(o.code)
  ends('the turn that names the code repository', o.stop(o.home))
})

// ---------- the usage ----------

test('E18: the usage line names hook-prompt', () => {
  const s = scene()
  const r = s.h('no-such-verb')
  expect(r.code).toBe(1)
  expect(`the usage names hook-prompt beside the other two hooks: ${/\|hook-start\|hook-prompt\|hook-stop$/.test(r.err.trim())}`).toBe('the usage names hook-prompt beside the other two hooks: true')
})

// ---------- the session's reference ----------

test('E3: with no reference yet, the start hook takes one also at a compact and at a fork', () => {
  for (const source of ['compact', 'fork']) {
    const s = scene() // a state folder that holds no reference: no session started here before
    s.hookStart(source)
    ends(`after the start hook (${source}), a turn in which nothing changed`, s.stop())
    s.edit()
    held(`after the start hook (${source}), a turn in which the repository changed`, s.stop(), NO_WORKFLOW)
  }
})

test('E14: an empty note is no note: the stop hook compares with the session\'s reference', () => {
  const s = scene()
  s.hookStart('startup')
  writeFileSync(`${s.S}/turn`, '') // a note that could not be written whole
  ends('a turn in which nothing changed since the session started', s.stop())
  expect(existsSync(`${s.S}/turn`)).toBe(false) // and the turn has ended: the empty note is gone
})

test('E15: when the prompt hook is the session\'s first hook call, a turn that changed nothing ends and a turn that changed the repository is held', () => {
  const s = scene() // the plugin was turned on in the middle of a session: no start hook ran here
  s.prompt()
  ends('a turn in which nothing changed', s.stop())
  s.prompt(); s.edit()
  held('a turn in which the repository changed', s.stop(), NO_WORKFLOW)
})

test('E16: in a repository with no commit the prompt hook is silent, and a turn that changed nothing ends', () => {
  const dir = `${T}/empty${++n}`, repo = `${dir}/repo`, env = { HSTACK_STATE: `${dir}/state`, CLAUDE_PROJECT_DIR: repo }
  mkdirSync(repo, { recursive: true }); expect(sh(['git', 'init', '-q'], repo, {}).code).toBe(0)
  silent('the prompt hook', sh([BUN, SCRIPT, 'hook-prompt'], repo, env, PROMPT_INPUT))
  ends('a turn in which nothing changed', sh([BUN, SCRIPT, 'hook-stop'], repo, env, '{"hook_event_name":"Stop","stop_hook_active":false}').out)
})

// ---------- the prompt hook's input ----------

test('E6: the prompt hook takes its note with an empty input, with an input that is no JSON, and with no CLAUDE_PROJECT_DIR', () => {
  const cases: [string, (s: Scene) => Out][] = [
    ['an empty input', (s) => s.promptRaw('')],
    ['an input that is no JSON', (s) => s.promptRaw('not json {')],
    ['no CLAUDE_PROJECT_DIR, called in the repository', (s) => s.promptRaw(PROMPT_INPUT, { HSTACK_STATE: s.state }, s.repo)],
  ]
  for (const [what, call] of cases) {
    const s = scene()
    s.hookStart('startup')
    s.commit() // the user's own commit, before the turn
    silent(`the prompt hook with ${what}`, call(s))
    ends(`the turn after the prompt hook with ${what}`, s.stop())
  }
})

test('E12: a message that arrives after repo <path> in the same turn does not take the builder\'s change into the note', () => {
  const o = outer()
  o.hookStart(); silent('the prompt hook of the turn', o.prompt())
  expect(o.h(o.home, 'repo', 'code').out).toBe(o.code)
  writeFileSync(`${o.code}/src/a.txt`, 'x = 2\n') // the builder's change in the code repository, with no run
  silent('the prompt hook of a message in the same turn', o.prompt())
  held('the turn that names the code repository and changes it', o.stop(), NO_WORKFLOW)
})

test('E7: with a code repository of its own, the prompt hook notes the code repository: the user\'s commit there does not hold a turn, the builder\'s change there does', () => {
  const o = outer()
  o.hookStart(); expect(o.h(o.home, 'repo', 'code').out).toBe(o.code)
  ends('the turn that names the code repository', o.stop())
  o.commitCode() // the user's own commit in the code repository
  silent('the prompt hook, called in the home', o.prompt())
  ends('a turn in which nothing changed', o.stop())
  silent('the prompt hook of the next turn', o.prompt())
  writeFileSync(`${o.code}/src/a.txt`, 'x = 2\n') // the builder's change in the code repository
  held('a turn in which the code repository changed', o.stop(), NO_WORKFLOW)
})

test('E7: with a pointer that names no repository the prompt hook prints nothing and exits 0', () => {
  const o = outer()
  mkdirSync(`${o.home}/.hstack`); writeFileSync(`${o.home}/.hstack/repo`, 'gone\n')
  silent('the prompt hook', o.prompt())
})

// ---------- the reason of a hold, where behaviour 18 names no case ----------

const DECIDE = 'Decide from the approved spec and the code'
const REPLY = 'end with exactly the reply the task asked for'
test('E4: the hold after a finished run keeps the sentence on the approved spec, and the hold of a run with no spec shown does not have it', () => {
  const done = scene()
  done.hookStart('startup'); finishedRun(done)
  done.prompt(); done.edit()
  const after = held('after a finished run', done.stop(), 'the repository changed after the last final check')
  expect(`after a finished run, the reason holds "${DECIDE}": ${after.includes(DECIDE)}`).toBe(`after a finished run, the reason holds "${DECIDE}": true`)
  const started = scene()
  started.hookStart('startup'); expect(started.h('start').code).toBe(0)
  const none = held('a run with no spec shown', started.stop(), 'steps not recorded')
  expect(`with no spec shown, the reason holds "${DECIDE}": ${none.includes(DECIDE)}`).toBe(`with no spec shown, the reason holds "${DECIDE}": false`)
  expect(`with no spec shown, the reason holds "${REPLY}": ${none.includes(REPLY)}`).toBe(`with no spec shown, the reason holds "${REPLY}": true`)
})

// ---------- a spec that waits ----------

test('E17: while a spec of an earlier session waits, the user\'s commit in this session still holds the turn, as 0.4.3 does', () => {
  const s = scene()
  waitingSpec(s, true) // an earlier session showed a spec; it waits
  s.hookStart('startup') // a new session
  s.commit() // the user's own commit: approve would refuse now
  s.prompt()
  held('the turn after the commit', s.stop(), 'a spec waits for the user\'s approval')
})

// ---------- the type-check ----------

test('E22: the type-check reads the three test files of this spec', () => {
  const include = (JSON.parse(readFileSync(join(import.meta.dir, '../tsconfig.json'), 'utf8')) as { include: string[] }).include
  for (const f of ['tests/turn-reference.test.ts', 'tests/turn-reference-texts.test.ts', 'tests/turn-reference-edges.test.ts']) expect(`tsconfig.json includes ${f}: ${include.includes(f)}`).toBe(`tsconfig.json includes ${f}: true`)
})
