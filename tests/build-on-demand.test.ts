// Acceptance tests of spec 9 ("the build loop runs only when the user invokes it, and the stop hook holds only a run
// of this session", feedback issue 9), written from the spec alone: the texts of the skills, the start hook's text and
// the stop hook, behaviours 1 to 8, 14, 19 to 30. Each test names its behaviour by its number.
// Run: bun test tests/build-on-demand.test.ts
// Every hook test makes a scratch repository and a state folder of its own under the system's temporary folder
// (HSTACK_STATE, and HOME pointed there too), so the machine's ~/.hstack is never touched. No test waits for the clock.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const ROOT = resolve(dirname(SCRIPT), '..') // the plugin's folder: skills/, hooks/, README.md, CLAUDE.md
const PLAYBOOK = join(ROOT, 'skills/build/SKILL.md')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-on-demand-test-')))
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
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

// ---------- the texts ----------

const front = (rel: string) => { const t = read(rel); const m = /^---\n([\s\S]*?)\n---\n/.exec(t); expect(m).not.toBeNull(); return m ? m[1] : '' }
const description = (rel: string) => /^description: (.*)$/m.exec(front(rel))?.[1] ?? ''
// a section of a markdown file: from its heading to the next heading of the same or a higher level
function section(rel: string, heading: string): string {
  const t = read(rel), i = t.indexOf(`\n${heading}\n`)
  expect(`${rel} has a section "${heading}": ${i >= 0}`).toBe(`${rel} has a section "${heading}": true`)
  const rest = t.slice(i + heading.length + 2), level = heading.split(' ')[0]
  const end = rest.search(new RegExp(`\\n#{1,${level.length}} `))
  return end < 0 ? rest : rest.slice(0, end)
}
const has = (what: string, text: string, phrase: string) => expect(`${what} holds "${phrase}": ${text.includes(phrase)}`).toBe(`${what} holds "${phrase}": true`)
const lacks = (what: string, text: string, phrase: string) => expect(`${what} holds "${phrase}": ${text.includes(phrase)}`).toBe(`${what} holds "${phrase}": false`)

test('1: the header of skills/build/SKILL.md holds disable-model-invocation: true, and its description no longer says it is for any request to build, change or fix code', () => {
  const f = front('skills/build/SKILL.md')
  expect(f).toMatch(/^disable-model-invocation: true\s*$/m)
  lacks('the description of build', description('skills/build/SKILL.md'), 'Use for any request to build, change or fix code')
})

const STEPS = ['skills/brainstorm/SKILL.md', 'skills/grill/SKILL.md', 'skills/build-implement/SKILL.md']

test('5: the descriptions of brainstorm, grill and build-implement no longer send every request to hstack:build, each names /hstack:build, and none is closed to the agent', () => {
  for (const f of STEPS) {
    const d = description(f)
    lacks(`the description of ${f}`, d, 'For any request to build, change or fix code')
    expect(`${f}: the description ends with "invoke hstack:build, not this.": ${d.trimEnd().endsWith('invoke hstack:build, not this.')}`).toBe(`${f}: the description ends with "invoke hstack:build, not this.": false`)
    has(`the description of ${f}`, d, '/hstack:build')
    lacks(`the header of ${f}`, front(f), 'disable-model-invocation')
  }
})

// the first paragraph of build-implement: the one after its title
function firstParagraph(rel: string): string {
  const body = read(rel).replace(/^---\n[\s\S]*?\n---\n/, '')
  const parts = body.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== '' && !p.startsWith('#'))
  return parts[0] ?? ''
}

test('6: In hstack of brainstorm and grill, and the first paragraph of build-implement, no longer say invoke `hstack:build`, and name /hstack:build as the user\'s way to start the loop', () => {
  const texts: [string, string][] = [
    ['the section In hstack of brainstorm', section('skills/brainstorm/SKILL.md', '## In hstack')],
    ['the section In hstack of grill', section('skills/grill/SKILL.md', '## In hstack')],
    ['the first paragraph of build-implement', firstParagraph('skills/build-implement/SKILL.md')],
  ]
  for (const [what, t] of texts) {
    lacks(what, t, 'invoke `hstack:build`')
    has(what, t, '/hstack:build')
    expect(`${what} says that an agent the loop did not send does nothing there: ${/do nothing|does nothing/i.test(t)}`).toBe(`${what} says that an agent the loop did not send does nothing there: true`)
  }
})

test('7: In hstack of brainstorm still holds "Invoked by the user themselves, it is the start of a build" and then sends the agent to ../build/SKILL.md, not to invoke hstack:build', () => {
  const t = section('skills/brainstorm/SKILL.md', '## In hstack')
  const i = t.indexOf('Invoked by the user themselves, it is the start of a build')
  expect(i).toBeGreaterThanOrEqual(0)
  const after = t.slice(i)
  has('In hstack of brainstorm, after the sentence', after, '../build/SKILL.md')
  lacks('In hstack of brainstorm, after the sentence', after, 'invoke `hstack:build`')
  lacks('In hstack of brainstorm, after the sentence', after, 'invoke hstack:build')
})

test('8: In hstack of brainstorm no longer says that the stop hook holds a turn in which the repository changed', () => {
  const t = section('skills/brainstorm/SKILL.md', '## In hstack')
  lacks('In hstack of brainstorm', t, 'holds a turn in which the repository changed')
})

test('29: the part of CLAUDE.md on the hooks says the loop runs when the user invokes /hstack:build, and no longer says the stop gate holds a change with no run', () => {
  const t = section('CLAUDE.md', '## Hooks of `hstack:build`')
  has('the hooks part of CLAUDE.md', t, '/hstack:build')
  lacks('the hooks part of CLAUDE.md', t, 'the repository changed without the hstack:build workflow')
  has('the hooks part of CLAUDE.md', t, 'this session')
})

test('30: the README skills table: the build row holds /hstack:build and not "Any request to build, change or fix code"; the brainstorm row still says that typed by the user it starts a build', () => {
  const rows = read('README.md').split('\n')
  const build = rows.find((l) => l.startsWith('| `build` |')) ?? ''
  const brainstorm = rows.find((l) => l.startsWith('| `brainstorm` |')) ?? ''
  expect(build).not.toBe(''); expect(brainstorm).not.toBe('')
  lacks('the build row', build, 'Any request to build, change or fix code')
  has('the build row', build, '/hstack:build')
  expect(brainstorm).toMatch(/[Tt]yped by you/)
  has('the brainstorm row', brainstorm, 'start of a build')
})

// ---------- a scene: a scratch repository and a state folder of its own ----------

let n = 0
function scene(repoPath?: string) {
  const dir = `${T}/s${++n}`, repo = repoPath ?? `${dir}/repo`, state = `${T}/state` // one state root, as on a machine: each repository has its own folder in it
  mkdirSync(dir, { recursive: true })
  const git = (...args: string[]) => sh(['git', ...args], repo, {})
  if (!repoPath) {
    mkdirSync(`${repo}/src`, { recursive: true })
    git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
    writeFileSync(`${repo}/src/a.txt`, 'x = 1\n')
    git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  }
  const env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  const h = (...args: string[]) => sh([BUN, SCRIPT, ...args], repo, { HSTACK_STATE: state })
  const hookStart = (source = 'startup', id = 'x') => sh([BUN, SCRIPT, 'hook-start'], repo, env, `{"session_id":"${id}","hook_event_name":"SessionStart","source":"${source}"}`).out
  const stop = (id = 'x') => sh([BUN, SCRIPT, 'hook-stop'], repo, env, `{"session_id":"${id}","hook_event_name":"Stop","stop_hook_active":false}`).out
  const prompt = (id = 'x') => { expect(sh([BUN, SCRIPT, 'hook-prompt'], repo, env, `{"hook_event_name":"UserPromptSubmit","session_id":"${id}","prompt":"a request"}`).code).toBe(0) }
  let c = 0
  const commit = () => { const f = `note-${++c}.txt`; writeFileSync(`${repo}/${f}`, 'a note\n'); expect(git('add', '--', f).code).toBe(0); expect(git('commit', '-qm', `note ${c}`, '--', f).code).toBe(0) }
  const edit = () => writeFileSync(`${repo}/src/a.txt`, `changed ${++c}\n`)
  return { dir, repo, git, h, hookStart, stop, prompt, commit, edit }
}
type Scene = ReturnType<typeof scene>

const HELD = '{"decision":"block"'
function reason(out: string): string {
  expect(`the stop hook holds the turn: ${out.startsWith(HELD)}`).toBe('the stop hook holds the turn: true')
  if (!out.startsWith(HELD)) return ''
  const o = JSON.parse(out) as { decision?: string; reason?: unknown }
  expect(o.decision).toBe('block')
  return String(o.reason)
}
const heldWith = (out: string, phrase: string) => has('the reason', reason(out), phrase)
const ends = (what: string, out: string) => expect(`${what}: the stop hook printed "${out}"`).toBe(`${what}: the stop hook printed ""`)

const NO_WORKFLOW = 'the repository changed without the hstack:build workflow'
const NOT_RECORDED = 'steps not recorded'
const SPEC_WAITS = "a spec waits for the user's approval"
const SPEC_NAME = '2026-11-23-feature-x'

const specOut = (s: Scene) => { const f = `${s.dir}/${SPEC_NAME}.md`; writeFileSync(f, 'what the feature does\n'); return f }
function approved(s: Scene, id = 'x') {
  s.prompt(id)
  expect(s.h('start').code).toBe(0)
  expect(s.h('spec', specOut(s)).code).toBe(0)
  ends('the turn that shows the spec', s.stop(id))
  s.prompt(id)
  expect(s.h('approve').out).toBe('approved')
}
function finish(s: Scene) {
  writeFileSync(`${s.repo}/src/built.txt`, 'the feature\n'); expect(s.git('add', '--', 'src/built.txt').code).toBe(0); expect(s.git('commit', '-qm', 'the feature', '--', 'src/built.txt').code).toBe(0)
  for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) expect(s.h('phase', p).code).toBe(0)
  expect(s.h('records-check', '--none', 'a test repository with no records').code).toBe(0)
  expect(s.h('phase', 'records').code).toBe(0); expect(s.h('done').code).toBe(0)
}

// ---------- the start hook's text ----------

test('2: the start hook\'s text no longer sends every change to hstack:build; it names /hstack:build and keeps the brainstorm, the approval and the ruling', () => {
  const s = scene()
  const t = s.hookStart('startup')
  lacks('the start text', t, 'invoke the hstack:build skill first')
  lacks('the start text', t, 'For any request to build, change or fix code')
  for (const p of ['/hstack:build', 'It starts with a brainstorm with the user, then a spec that the user approves', "For a build, the brainstorm is hstack's own skill, hstack:brainstorm, not another brainstorming skill", 'after the approval, follow it to its last step', 'hstack.ts ruled']) has('the start text', t, p)
  has('the start text', t, 'A message that only rules on a point the record of the project lists as waiting for a ruling is not a build')
  expect(`the start text tells the agent to suggest /hstack:build: ${/suggest[^.]*\/hstack:build/i.test(t)}`).toBe('the start text tells the agent to suggest /hstack:build: false')
})

test('3: while a spec of an earlier session waits, the start hook\'s text names its path, the three answers and the user\'s next message, and says the user takes it up with /hstack:build and its name', () => {
  const s = scene()
  s.hookStart('startup', 'w'); s.prompt('w')
  expect(s.h('start').code).toBe(0)
  const spec = specOut(s)
  expect(s.h('spec', spec).code).toBe(0)
  ends('the turn that shows the spec', s.stop('w'))
  const t = s.hookStart('startup', 'x')
  has('the start text', t, spec)
  has('the start text', t, 'approves it, asks for changes to it or asks for a grill of it')
  has('the start text', t, "The user's next message")
  has('the start text', t, '/hstack:build')
  has('the start text', t, SPEC_NAME)
  lacks('the start text', t, 'invoke hstack:build')
  lacks('the start text', t, '/hstack:build duyệt')
})

test('4: beside an approved run of an earlier session that is not finished, the start hook\'s text names its spec and the steps not recorded, and says the user goes on with /hstack:build and the spec\'s name', () => {
  const s = scene()
  s.hookStart('startup', 'w'); approved(s, 'w'); expect(s.h('phase', 'setup').code).toBe(0)
  const missing = s.h('missing').out
  expect(missing.split(' ')[0]).toBe('oracle')
  const t = s.hookStart('startup', 'x')
  has('the start text', t, SPEC_NAME)
  has('the start text', t, missing)
  has('the start text', t, '/hstack:build')
})

// ---------- the stop hook ----------

test('20: with no run started, a change made after the prompt hook: the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup'); s.prompt(); s.edit()
  ends('a change with no run', s.stop())
})

test('20: with no run started, a commit made after the prompt hook: the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup'); s.prompt(); s.commit()
  ends('a commit with no run', s.stop())
})

test('21: with no run started, in a session with no prompt hook: after startup and a commit, the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup'); s.commit()
  ends('a commit, no prompt hook', s.stop())
})

test('22: with no run started, git reset --hard to another commit in the turn: the stop hook lets the turn end (the issue\'s own case)', () => {
  const s = scene()
  // a remote-tracking ref on another commit
  s.commit(); const other = s.git('rev-parse', 'HEAD').out
  expect(s.git('update-ref', 'refs/remotes/origin/main', other).code).toBe(0)
  expect(s.git('reset', '-q', '--hard', 'HEAD~1').code).toBe(0)
  s.hookStart('startup'); s.prompt()
  expect(s.git('reset', '-q', '--hard', 'origin/main').code).toBe(0)
  expect(s.git('rev-parse', 'HEAD').out).toBe(other)
  ends('git reset --hard origin/main', s.stop())
  ends('the next stop', s.stop())
})

test('23: after a run this session finished, a change made after the prompt hook: the stop hook lets the turn end', () => {
  const s = scene()
  s.hookStart('startup'); approved(s); finish(s)
  ends('the turn that finishes the run', s.stop())
  s.prompt(); s.edit()
  ends('a change after the finished run', s.stop())
})

for (const kind of ['finished', 'left unfinished'] as const) {
  test(`24: beside a run of an earlier session, ${kind}: after startup, a change made after the prompt hook, the stop hook lets the turn end`, () => {
    const s = scene()
    s.hookStart('startup', 'w'); approved(s, 'w')
    if (kind === 'finished') { finish(s); ends('the earlier run\'s last turn', s.stop('w')) } else expect(s.h('phase', 'setup').code).toBe(0)
    s.hookStart('startup', 'x'); s.prompt('x'); s.edit()
    ends(`a change beside an earlier run, ${kind}`, s.stop('x'))
  })
}

test('25: beside a spec of an earlier session that waits: after startup and a commit, the stop hook lets the turn end, and approve then refuses', () => {
  const s = scene()
  s.hookStart('startup', 'w'); s.prompt('w')
  expect(s.h('start').code).toBe(0); expect(s.h('spec', specOut(s)).code).toBe(0)
  ends('the turn that shows the spec', s.stop('w'))
  s.hookStart('startup', 'x'); s.commit()
  ends('a commit beside a waiting spec of an earlier session', s.stop('x'))
  const a = s.h('approve')
  expect(a.code).not.toBe(0)
})

test('26: an approved run of this session that is not finished is held, with or without a change and a prompt hook, with "steps not recorded"', () => {
  const s = scene()
  s.hookStart('startup'); approved(s)
  heldWith(s.stop(), NOT_RECORDED) // no change, prompt hook ran
  s.edit(); heldWith(s.stop(), NOT_RECORDED) // a change
  const t = scene(); t.hookStart('startup')
  expect(t.h('start').code).toBe(0); expect(t.h('spec', specOut(t)).code).toBe(0)
  ends('the turn that shows the spec', t.stop())
  expect(t.h('approve').out).toBe('approved') // no prompt hook anywhere
  heldWith(t.stop(), NOT_RECORDED)
})

test('26: a run of this session with no spec shown yet is held, with "steps not recorded", whether or not the turn changed the repository', () => {
  const s = scene()
  s.hookStart('startup'); s.prompt()
  expect(s.h('start').code).toBe(0)
  heldWith(s.stop(), NOT_RECORDED)
  const t = scene(); t.hookStart('startup') // no prompt hook
  expect(t.h('start').code).toBe(0); t.edit()
  heldWith(t.stop(), NOT_RECORDED)
})

test('27: while a spec of this session waits, a change made in the repository is held with "a spec waits for the user\'s approval"', () => {
  const s = scene()
  s.hookStart('startup'); s.prompt()
  expect(s.h('start').code).toBe(0); expect(s.h('spec', specOut(s)).code).toBe(0)
  ends('the turn that shows the spec', s.stop())
  s.prompt(); s.edit()
  heldWith(s.stop(), SPEC_WAITS)
})

test('28: no reason of the stop hook holds "the repository changed without the hstack:build workflow"', () => {
  const outs: string[] = []
  const a = scene(); a.hookStart('startup'); a.prompt(); a.edit(); outs.push(a.stop()); outs.push(a.stop())
  const b = scene(); b.hookStart('startup'); b.prompt(); expect(b.h('start').code).toBe(0); b.edit(); outs.push(b.stop())
  const c = scene(); c.hookStart('startup'); approved(c); c.edit(); outs.push(c.stop())
  const d = scene(); d.hookStart('startup'); d.prompt(); expect(d.h('start').code).toBe(0); expect(d.h('spec', specOut(d)).code).toBe(0); ends('spec shown', d.stop()); d.prompt(); d.edit(); outs.push(d.stop())
  for (const o of outs) lacks('a stop hook output', o, NO_WORKFLOW)
})

test('19: the reason that holds an unfinished run of this session names the absolute path of the playbook skills/build/SKILL.md', () => {
  const s = scene()
  s.hookStart('startup'); approved(s)
  heldWith(s.stop(), PLAYBOOK)
  const t = scene(); t.hookStart('startup'); t.prompt(); expect(t.h('start').code).toBe(0)
  heldWith(t.stop(), PLAYBOOK)
})

test('14: in a git worktree of a repository whose main folder holds an unfinished run, the hooks judge the worktree by its own state: a change there with no run ends', () => {
  const s = scene()
  s.hookStart('startup', 'w'); approved(s, 'w'); expect(s.h('phase', 'setup').code).toBe(0)
  const wt = `${s.dir}/wt`
  expect(s.git('worktree', 'add', '-q', '-b', 'side', wt, 'HEAD').code).toBe(0)
  const w = scene(wt)
  expect(w.h('dir').out).not.toBe(s.h('dir').out) // a state folder of its own
  w.hookStart('startup', 'x'); w.prompt('x'); w.edit()
  ends('a change in the worktree with no run of its own', w.stop('x'))
  // the unfinished run in the main folder is untouched
  expect(s.h('missing').out.split(' ')[0]).toBe('oracle')
})
