// Acceptance tests of scripts/hstack.ts and its two hooks for spec 2 ("step 1 starts with a brainstorm that ends in
// the spec, and the spec can be grilled before the approval"), written from the spec alone.
// Run: bun test tests/brainstorm-script.test.ts
// Each test names the behaviour of the spec it checks by its number. Every test is its own story: it makes a scratch
// repository and a state folder of its own under the system's temporary folder, and they are removed at the end.
// No test waits for the clock: a wait is made by moving the run's two time files back, as tests/hstack.test.ts does
// ("approve records the step").
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts') // HSTACK_SCRIPT runs another copy of the script
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-brainstorm-test-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe) // a run that ends before afterAll

// nothing of the caller's session reaches the script: its own state folder, and no project folder of a real session
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v

type Out = { code: number; out: string; err: string; all: string }
function sh(cmd: string[], cwd: string, env: Record<string, string>, stdin?: string): Out {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  const out = r.stdout.toString().replace(/\n+$/, ''), err = r.stderr.toString()
  return { code: r.exitCode, out, err, all: `${out}\n${err}` }
}

let n = 0
// a scratch repository with one commit, and a state folder of its own
function scene() {
  const dir = `${T}/s${++n}`, repo = `${dir}/repo`, state = `${dir}/state`
  mkdirSync(`${repo}/src`, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], repo, {})
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/src/a.txt`, 'x = 1\n')
  git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  const h = (...args: string[]) => sh([BUN, SCRIPT, ...args], repo, { HSTACK_STATE: state })
  const hookStart = (source = 'startup') => sh([BUN, SCRIPT, 'hook-start'], repo, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }, `{"session_id":"x","source":"${source}"}`).out
  const stop = () => sh([BUN, SCRIPT, 'hook-stop'], repo, { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }, '{"hook_event_name":"Stop","stop_hook_active":false}').out
  const S = h('dir').out
  expect(S.startsWith(`${state}/`)).toBe(true) // the state of this test, not the machine's
  return { dir, repo, S, git, h, hookStart, stop }
}
type Scene = ReturnType<typeof scene>
// a spec file in the repository, where the playbook puts it when the project has no rule: the only change before the approval
const specIn = (s: Scene, text = 'what the feature does\n') => { mkdirSync(`${s.repo}/docs/specs`, { recursive: true }); const f = `${s.repo}/docs/specs/2026-01-01-topic.md`; writeFileSync(f, text); return f }
// the run's clock and the time the spec was shown, moved back: as if that many seconds had passed while the spec waited
const waited = (s: Scene, seconds: number) => { for (const f of ['started', 'spec-asked']) writeFileSync(`${s.S}/${f}`, `${Number(readFileSync(`${s.S}/${f}`, 'utf8').trim()) - seconds}\n`) }
const OLD = ['with its text', 'the spec\'s text']
const noOldWords = (what: string, text: string) => { for (const p of OLD) expect(`${what} holds "${p}": ${text.includes(p)}`).toBe(`${what} holds "${p}": false`) }
const holds = (what: string, text: string, phrases: string[]) => { for (const p of phrases) expect(`${what} holds "${p}": ${text.includes(p)}`).toBe(`${what} holds "${p}": true`) }

// ---------- the text at the start of a session ----------

test('35: hook-start says a build starts with a brainstorm with the user, hstack\'s own, then a spec, and is followed to its last step after the approval', () => {
  const s = scene(), text = s.hookStart('startup')
  holds('the text of hook-start', text, ['hstack:build', 'It starts with a brainstorm with the user, then a spec that the user approves',
    'For a build, the brainstorm is hstack\'s own skill, hstack:brainstorm, not another brainstorming skill', 'after the approval, follow it to its last step'])
  expect(`the text of hook-start holds "follow it to its last step before you reply": ${text.includes('follow it to its last step before you reply')}`).toBe('the text of hook-start holds "follow it to its last step before you reply": false')
  // the same text for a session that is resumed
  holds('the text of hook-start on a resume', s.hookStart('resume'), ['It starts with a brainstorm with the user, then a spec that the user approves'])
})

test('36: while a spec waits, hook-start names the three answers (approve, changes, a grill) and the playbook\'s item by its name, not by a number', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const spec = specIn(s); expect(s.h('spec', spec).code).toBe(0); expect(s.stop()).toBe('')
  const text = s.hookStart('startup')
  const line = text.split('\n').find((l) => l.includes('A spec waits for the user\'s approval:')) ?? ''
  holds('the line of the waiting spec', line, [`A spec waits for the user's approval: ${spec}`, 'approves it, asks for changes to it or asks for a grill of it', 'The user\'s next message'])
  expect(`the line names an item by a number: ${/\bitem \d/i.test(line)}`).toBe('the line names an item by a number: false')
  // without a waiting spec the text has no such line
  expect(scene().hookStart('startup')).not.toContain('A spec waits for the user\'s approval:')
})

// ---------- the script's own messages: the path of the spec, never its text ----------

test('37: "spec <file>" tells the builder to give the user the path of the spec, never its whole text', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const r = s.h('spec', specIn(s))
  expect(r.code).toBe(0)
  holds('what spec prints', r.all, ['give the user the path of the spec, never its whole text'])
  noOldWords('what spec prints', r.all)
  // and so again when the spec is shown a second time, after a change
  const spec = specIn(s, 'what the feature does, changed\n'), again = s.h('spec', spec)
  expect(again.code).toBe(0)
  holds('what spec prints again', again.all, ['give the user the path of the spec, never its whole text'])
  noOldWords('what spec prints again', again.all)
})

test('37: the refusals of approve do not ask for the text of the spec', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const none = s.h('approve') // no spec waits
  expect(none.code).not.toBe(0); expect(none.err.trim()).not.toBe(''); noOldWords('approve with no spec', none.all)
  const spec = specIn(s); expect(s.h('spec', spec).code).toBe(0)
  const unseen = s.h('approve') // the turn has not ended: the user has not seen it
  expect(unseen.code).not.toBe(0); expect(unseen.err).toContain('has not seen'); noOldWords('approve of a spec not seen', unseen.all)
  expect(s.stop()).toBe('')
  writeFileSync(spec, 'what the feature does\nand more\n')
  const changed = s.h('approve') // the spec changed after it was shown
  expect(changed.code).not.toBe(0); expect(changed.err).toContain('changed after it was shown'); noOldWords('approve of a changed spec', changed.all)
  expect(s.h('spec', spec).code).toBe(0); expect(s.stop()).toBe('')
  writeFileSync(`${s.repo}/src/a.txt`, 'x = 1\ny\n')
  const built = s.h('approve') // the code repository changed while the spec waited
  expect(built.code).not.toBe(0); expect(built.err.trim()).not.toBe(''); noOldWords('approve after a change of the repository', built.all)
  s.git('checkout', '-q', '--', 'src/a.txt')
  expect(s.h('approve').out).toBe('approved') // and the approval itself still works
})

test('37: the refusals of phase do not ask for the text of the spec', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const early = s.h('phase', 'setup') // no approved spec
  expect(early.code).not.toBe(0); expect(early.err).toContain('no approved spec'); noOldWords('phase with no approved spec', early.all)
  expect(s.h('spec', specIn(s)).code).toBe(0)
  const waiting = s.h('phase', 'setup') // a spec waits, not approved
  expect(waiting.code).not.toBe(0); expect(waiting.err).toContain('no approved spec'); noOldWords('phase while the spec waits', waiting.all)
  for (const args of [['phase', 'spec'], ['phase', 'spec', 'skipped:', 'time'], ['phase', 'records', 'skipped:', 'time'], ['phase', 'Build'], ['phase']]) {
    const r = s.h(...args)
    expect(`${args.join(' ')} is refused: ${r.code !== 0}`).toBe(`${args.join(' ')} is refused: true`)
    noOldWords(args.join(' '), r.all)
  }
  expect(s.h('missing').out.split(' ')[0]).toBe('spec') // nothing was recorded by any of them
})

test('37: the stop hook\'s reason for a spec that waits does not ask for the text of the spec', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  expect(s.h('spec', specIn(s)).code).toBe(0); expect(s.stop()).toBe('')
  writeFileSync(`${s.repo}/src/a.txt`, 'x = 1\ny\n') // something was built while the spec waits
  const reason = s.stop()
  expect(reason.startsWith('{"decision":"block"')).toBe(true)
  holds('the reason', reason, ['nothing is built before it'])
  noOldWords('the reason', reason)
  expect(typeof JSON.parse(reason).reason).toBe('string') // still one JSON object
})

// ---------- the brainstorm and the grill are before the run's clock ----------

test('38: a turn that ends in a brainstorm (no run started, nothing changed in the repository) is not blocked, and elapsed counts no minute of it', () => {
  const s = scene()
  s.hookStart('startup')
  // the first message, and the turns of the talk after it: each ends with nothing built
  for (let turn = 1; turn <= 5; turn++) expect(`turn ${turn}: ${s.stop()}`).toBe(`turn ${turn}: `)
  // the mock-ups of the brainstorm are in the state folder, a spike in a scratch folder outside the repository
  mkdirSync(`${s.S}/mockups/session-1/content`, { recursive: true }); writeFileSync(`${s.S}/mockups/session-1/content/one.html`, '<p>one</p>\n')
  mkdirSync(`${s.dir}/spike`); writeFileSync(`${s.dir}/spike/try.txt`, 'a throwaway build\n')
  expect(s.stop()).toBe('')
  expect(s.git('status', '--porcelain').out).toBe('')
  // the brainstorm took 40 minutes: everything the state folder holds is that old
  const then = new Date(Date.now() - 40 * 60 * 1000)
  for (const f of readdirSync(s.S, { recursive: true }) as string[]) utimesSync(join(s.S, f), then, then)
  utimesSync(s.S, then, then)
  // it has come to the spec: the run starts now, and its clock with it
  expect(s.h('start').code).toBe(0)
  expect(s.h('elapsed').out).toBe('0')
  expect(existsSync(`${s.S}/mockups/session-1/content/one.html`)).toBe(true) // the mock-ups stay in the state folder
  // spec 9: the loop runs only when the user invokes it: in a session with no run, a turn that changed the repository ends too
  const other = scene()
  other.hookStart('startup'); expect(other.stop()).toBe('')
  writeFileSync(`${other.repo}/src/a.txt`, 'x = 2\n')
  expect(other.stop()).toBe('')
})

test('38: a brainstorm in a new session, after an earlier run that is finished, is not blocked either, and the new run\'s clock starts at its start', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const spec = `${s.dir}/spec.md`; writeFileSync(spec, 'what the feature does\n') // outside the repository: the earlier run built nothing
  expect(s.h('spec', spec).code).toBe(0); expect(s.stop()).toBe(''); expect(s.h('approve').out).toBe('approved')
  for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) expect(s.h('phase', p).code).toBe(0)
  expect(s.h('records-check', '--none', 'a test repository with no records').code).toBe(0)
  expect(s.h('phase', 'records').code).toBe(0); expect(s.h('done').code).toBe(0)
  // that run began three hours ago
  writeFileSync(`${s.S}/started`, `${Math.floor(Date.now() / 1000) - 3 * 3600}\n`)
  // a new session, a new request: the brainstorm's turns end with nothing built
  s.hookStart('startup')
  for (let turn = 1; turn <= 4; turn++) expect(`turn ${turn}: ${s.stop()}`).toBe(`turn ${turn}: `)
  expect(s.h('start').code).toBe(0)
  expect(s.h('elapsed').out).toBe('0')
})

test('39: a turn that ends in a grill (the spec changed and shown to the script again, nothing else changed) is not blocked, and elapsed does not count the wait', () => {
  const s = scene()
  s.hookStart('startup'); expect(s.h('start').code).toBe(0)
  const spec = specIn(s)
  expect(s.h('spec', spec).code).toBe(0)
  expect(s.stop()).toBe('') // the turn that hands the spec over
  waited(s, 600) // ten minutes until the user asks for a grill
  // round 1: the questions go to the user, nothing is written yet
  expect(s.stop()).toBe('')
  waited(s, 600) // ten minutes until the answers
  // the answers go into the spec file, and the spec is shown to the script again
  writeFileSync(spec, 'what the feature does\nsettled in the grill, round 1: the first answer\n')
  expect(s.h('spec', spec).code).toBe(0)
  expect(s.stop()).toBe('')
  expect(s.h('elapsed').out).toBe('0')
  waited(s, 900) // a quarter of an hour until the answers of round 2
  writeFileSync(spec, 'what the feature does\nsettled in the grill, round 1: the first answer\nsettled in the grill, round 2: the second answer\n')
  expect(s.h('spec', spec).code).toBe(0)
  expect(s.stop()).toBe('') // the grill ends: the path, what it changed, the three choices
  expect(s.h('elapsed').out).toBe('0')
  expect(s.git('status', '--porcelain', '-uall').out).toBe('?? docs/specs/2026-01-01-topic.md') // nothing else changed
  waited(s, 300) // five minutes until the approval
  expect(s.h('approve').out).toBe('approved')
  expect(s.h('elapsed').out).toBe('0')
  // from the approval on the run is held to its end again
  expect(s.stop()).toContain('steps not recorded: setup')
})
