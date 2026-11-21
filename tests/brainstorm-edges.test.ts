// Tests of scripts/hstack.ts beside the acceptance tests of tests/brainstorm-script.test.ts: the edges the builder
// decided for spec 2 (E-numbers of the decisions file beside the spec). Run: bun test tests/brainstorm-edges.test.ts
// HSTACK_SCRIPT runs another copy of the script (a broken copy that a test must catch).
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-brainstorm-edges-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe)

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v
function sh(cmd: string[], cwd: string, env: Record<string, string> = {}, stdin?: string) {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

test('E6: the stop hook\'s answer for a spec that waits in a changed repository is one whole piece of JSON, and its reason names the playbook\'s item', () => {
  const repo = `${T}/repo`, state = `${T}/state`, env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  mkdirSync(`${repo}/docs`, { recursive: true })
  const git = (...a: string[]) => sh(['git', ...a], repo)
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  const h = (...a: string[]) => sh([process.execPath, SCRIPT, ...a], repo, env)
  sh([process.execPath, SCRIPT, 'hook-start'], repo, env, '{"session_id":"x","source":"startup"}')
  expect(h('start').code).toBe(0)
  writeFileSync(`${repo}/docs/spec.md`, 'the behaviours\n'); expect(h('spec', 'docs/spec.md').code).toBe(0)
  writeFileSync(`${repo}/a.txt`, 'x = 2\n') // built before the approval: the turn may not end
  const out = sh([process.execPath, SCRIPT, 'hook-stop'], repo, env, '{"hook_event_name":"Stop","stop_hook_active":false}').out
  const answer = JSON.parse(out) as { decision: string; reason: string } // a quote inside the reason would break this
  expect(answer.decision).toBe('block')
  expect(answer.reason).toContain("a spec waits for the user's approval and nothing is built before it")
  expect(answer.reason).toContain("the playbook's item 'Show it'")
})

// ---------- from the review of round 1 ----------

import { existsSync, readFileSync } from 'node:fs'
const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const holds = (where: string, text: string, phrases: string[]) => { for (const p of phrases) expect(`${where} holds "${p}": ${flat(text).includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
const lacks = (where: string, text: string, phrases: string[]) => { for (const p of phrases) expect(`${where} holds "${p}": ${flat(text).includes(flat(p))}`).toBe(`${where} holds "${p}": false`) }
// an item of the playbook's step 1, from its "N. **Name.**" to the next item
function item(name: string): string {
  const t = raw('skills/build/SKILL.md'), s = t.slice(t.search(/^## 1\. /m), t.search(/^## 2\. /m))
  const m = new RegExp(`^\\d+\\. \\*\\*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`, 'm').exec(s)
  expect(`step 1 has an item **${name}**: ${m !== null}`).toBe(`step 1 has an item **${name}**: true`)
  if (!m) return ''
  const rest = s.slice(m.index + m[0].length), end = rest.search(/^\d+\. \*\*/m)
  return end < 0 ? rest : rest.slice(0, end)
}
const section = (text: string, heading: string) => { const at = text.indexOf(`\n${heading}\n`); expect(`section "${heading}": ${at >= 0}`).toBe(`section "${heading}": true`); const rest = text.slice(at + heading.length + 2), end = rest.search(/^## /m); return end < 0 ? rest : rest.slice(0, end) }
// a part of a skill: from its bold name to the next bold name at the start of a line, or the next heading
const part = (text: string, name: string) => { const at = text.indexOf(name); expect(`part "${name}": ${at >= 0}`).toBe(`part "${name}": true`); const rest = text.slice(at + name.length), end = rest.search(/^(\*\*|## |<)/m); return end < 0 ? rest : rest.slice(0, end) }

// a scratch repository with one commit, a state folder of its own, and the script's verbs and hooks in it
let scenes = 0
function scene() {
  const dir = `${T}/scene-${++scenes}`, repo = `${dir}/repo`, state = `${dir}/state`, env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  mkdirSync(`${repo}/docs`, { recursive: true })
  const git = (...a: string[]) => sh(['git', ...a], repo)
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  const h = (...a: string[]) => sh([process.execPath, SCRIPT, ...a], repo, env)
  const hookStart = () => sh([process.execPath, SCRIPT, 'hook-start'], repo, env, '{"session_id":"x","source":"startup"}').out
  const hookStop = () => sh([process.execPath, SCRIPT, 'hook-stop'], repo, env, '{"hook_event_name":"Stop","stop_hook_active":false}').out
  return { repo, h, hookStart, hookStop, S: () => h('dir').out }
}

test('6: the sign the playbook gives for a spec that waits is true only while it waits: the file spec of the state folder stays after the approval', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['the state folder holds the file `spec` and its file `phases` has no line `spec`'])
  // why the second half is needed: after the approval the file is still there, and nothing waits
  const s = scene(); s.hookStart(); expect(s.h('start').code).toBe(0)
  writeFileSync(`${s.repo}/docs/spec.md`, 'the behaviours\n'); expect(s.h('spec', 'docs/spec.md').code).toBe(0)
  const waits = () => existsSync(`${s.S()}/spec`) && !readFileSync(`${s.S()}/phases`, 'utf8').split('\n').includes('spec')
  expect(waits()).toBe(true)
  expect(s.hookStop()).toBe(''); expect(s.h('approve').code).toBe(0)
  expect(existsSync(`${s.S()}/spec`)).toBe(true) // the file alone would say "a spec waits"
  expect(waits()).toBe(false)
  expect(s.hookStart()).not.toContain('A spec waits')
})

test('9: a question for the user that comes up after start goes out only after spec <file>: the turn can then end, and without it the stop hook holds it', () => {
  holds('the item The spec file', item('The spec file.'), ['A question for the user that comes up after `start`: run `$H spec <file>` on the file as far as it is written, then ask'])
  holds('the item What goes against the record', item('What goes against the record'), ['during the brainstorm, before `start`'])
  const s = scene(); s.hookStart(); expect(s.h('start').code).toBe(0)
  expect(s.hookStop()).toContain('"decision":"block"') // a turn that ends here, with a question, is held
  writeFileSync(`${s.repo}/docs/spec.md`, 'as far as it is written\n'); expect(s.h('spec', 'docs/spec.md').code).toBe(0)
  expect(s.hookStop()).toBe('') // now the question can go out
  expect(s.h('elapsed').out).toBe('0')
})

test('42: taking up the offer to just write the spec does not skip the user\'s pick of the way', () => {
  const first = section(raw('skills/brainstorm/SKILL.md'), '## Your First Message')
  holds('the section Your First Message', first, ['where there is more than one way that they would see, lay the ways out first and let them pick'])
  lacks('the section Your First Message', first, ['the conversation is done: state any significant'])
})

test('24: the builder check puts no answer of the builder into the spec: not for a minor point, not from the project, and no list of calls to check while reading', () => {
  const skill = raw('skills/brainstorm/SKILL.md'), check = skill.slice(skill.indexOf('**Builder check**'), skill.indexOf('<HARD-GATE>'))
  expect(check.length).toBeGreaterThan(200)
  lacks('the part Builder check', check, ['a short list of the calls you made', 'Settle it yourself', 'put the answer in the spec'])
  holds('the part Builder check', check, ['name it in the spec under what is left to the builder, without an answer', 'What the project answers goes to your human partner too'])
  const made = part(skill, '**How it gets made.**')
  lacks('the part How it gets made', made, ['goes in the design as your call'])
  holds('the part How it gets made', made, ['stands in the spec under what is left to the builder, without your pick'])
})

test('49: in the grill skill the sentence on no waiting spec comes before the one that sends other callers to hstack:build', () => {
  const s = flat(section(raw('skills/grill/SKILL.md'), '## In hstack'))
  const none = s.indexOf("With no spec waiting for the user's approval, say so and do nothing"), other = s.indexOf('do nothing here and invoke `hstack:build`')
  expect(none).toBeGreaterThanOrEqual(0); expect(other).toBeGreaterThan(none)
})

test('43: the reviewer reads what the user chose from the spec\'s section "Against the record", not from an option in the reply', () => {
  const reviewer = raw('agents/reviewer.md')
  lacks('the reviewer', reviewer, ['which option of each item they took'])
  holds('the reviewer', reviewer, ['the spec\'s section "Against the record" records what the user chose for each item'])
})

test('10: for a project, the read by a second agent comes before the spec is shown', () => {
  holds('the item Show it', item('Show it.'), ['For a project, a second agent has read the spec before this'])
})

// ---------- from the exploratory test ----------

test('E13: elapsed with no run started refuses in one line, as the other verbs do', () => {
  const s = scene(); s.hookStart()
  const r = s.h('elapsed')
  expect(r.code).toBe(1)
  expect(r.err.trim()).toBe('hstack: no run started: run start first')
  expect(r.out).toBe('')
})
