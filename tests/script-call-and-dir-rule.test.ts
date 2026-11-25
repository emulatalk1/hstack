// Acceptance tests of spec 3 ("both words first when calling the script, and the rule on `dir` holds until `start`"),
// written from the spec alone. Run: bun test tests/script-call-and-dir-rule.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
const lacks = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": false`) }

// a section: from its heading line to the next heading of its level
function section(text: string, heading: string): string {
  const m = new RegExp(`^${esc(heading)}[ \\t]*$`, 'm').exec(text)
  expect(`section "${heading}": ${m !== null}`).toBe(`section "${heading}": true`)
  if (!m) return ''
  const rest = text.slice(m.index + m[0].length), end = rest.search(/^## /m)
  return end < 0 ? rest : rest.slice(0, end)
}

// the paragraph of a skill that starts with "`H` below is": there is exactly one, and it is not empty
function paragraphOnH(file: string): string {
  const found = raw(file).split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.startsWith('`H` below is'))
  expect(`${file}: paragraphs that start with "\`H\` below is": ${found.length}`).toBe(`${file}: paragraphs that start with "\`H\` below is": 1`)
  return flat(found[0] ?? '')
}

const PLAYBOOK = 'skills/build/SKILL.md'
const FEEDBACK = 'skills/hstack-feedback/SKILL.md'
const BRAINSTORM = 'skills/brainstorm/SKILL.md'

// the words of the spec (section 2, "The words")
const BOTH_WORDS = 'In a command, write both words out (`bun "<the path>/scripts/hstack.ts" <verb>`)'
const FUNCTION_SECOND = 'A shell function (`H() { bun "<the path>/scripts/hstack.ts" "$@"; }`) also works, but a coding tool may refuse a command that defines one'
const VARIABLE = 'a variable that holds `bun <path>` is not split into two words by every shell'
const FUNCTION_FIRST = 'call it through a shell function'

// behaviours 1 and 3: both words stand in the paragraph, before the words "shell function"
function bothWordsFirst(file: string) {
  const p = paragraphOnH(file), where = `the paragraph on H of ${file}`
  holds(where, p, [BOTH_WORDS, 'shell function'])
  const both = p.indexOf(flat(BOTH_WORDS)), fn = p.indexOf('shell function')
  expect(`${where}: both words stand before the words "shell function": ${both >= 0 && fn >= 0 && both < fn}`).toBe(`${where}: both words stand before the words "shell function": true`)
}

// behaviours 2 and 4: the shell function is the second way, the reason for both words stays, the old order is gone
function functionSecond(file: string) {
  const p = paragraphOnH(file), where = `the paragraph on H of ${file}`
  holds(where, p, [FUNCTION_SECOND, VARIABLE])
  lacks(where, p, [FUNCTION_FIRST])
}

// ---------- the playbook (skills/build/SKILL.md) ----------

test('1: in skills/build/SKILL.md, the paragraph that starts with "H below is" holds "In a command, write both words out (bun "<the path>/scripts/hstack.ts" <verb>)", before the words "shell function"', () => {
  bothWordsFirst(PLAYBOOK)
})

test('2: that paragraph holds the shell function as a way that also works and that a coding tool may refuse, holds the clause on a variable that holds bun <path>, and no longer holds "call it through a shell function"', () => {
  functionSecond(PLAYBOOK)
})

// ---------- the feedback skill (skills/hstack-feedback/SKILL.md) ----------

test('3: in skills/hstack-feedback/SKILL.md, the paragraph that starts with "H below is" holds "In a command, write both words out (bun "<the path>/scripts/hstack.ts" <verb>)", before the words "shell function"', () => {
  bothWordsFirst(FEEDBACK)
})

test('4: that paragraph holds the shell function as a way that also works and that a coding tool may refuse, holds the clause on a variable that holds bun <path>, and no longer holds "call it through a shell function"', () => {
  functionSecond(FEEDBACK)
})

// ---------- the brainstorm skill (skills/brainstorm/SKILL.md), its section "In hstack" ----------

test('5: the section "## In hstack" holds "until the playbook\'s start no command of the loop\'s script runs but dir" and no longer holds "during the conversation but"', () => {
  const s = section(raw(BRAINSTORM), '## In hstack')
  holds('the section In hstack', s, ['until the playbook\'s `start` no command of the loop\'s script runs but `dir`'])
  lacks('the section In hstack', s, ['during the conversation but'])
})

test('6: that section holds "From start on, the playbook says which command runs (spec <file> before a question to your human partner)"', () => {
  const s = section(raw(BRAINSTORM), '## In hstack')
  holds('the section In hstack', s, ['From `start` on, the playbook says which command runs (`spec <file>` before a question to your human partner)'])
})

test('8: the section "## In hstack" holds "Nothing in the repository changes before the spec is approved but the spec file itself"', () => {
  const s = section(raw(BRAINSTORM), '## In hstack')
  holds('the section In hstack', s, ['Nothing in the repository changes before the spec is approved but the spec file itself'])
})

// ---------- the version and the README ----------

test('7: .claude-plugin/plugin.json holds "version": "0.4.8", and the README\'s status paragraph starts with "**Status: v0.4.8.**"', () => {
  expect(raw('.claude-plugin/plugin.json')).toContain('"version": "0.4.8"')
  const status = raw('README.md').split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
  expect(`the status paragraph starts with "**Status: v0.4.8.**": ${status.startsWith('**Status: v0.4.8.**')}`).toBe('the status paragraph starts with "**Status: v0.4.8.**": true')
})

// ---------- kept (the spec, sections 2 and 4): these pass before the change and must stay ----------

test('kept: the playbook\'s item "Brainstorm" still says that during the brainstorm no verb of $H runs but dir', () => {
  const t = raw(PLAYBOOK), from = t.search(/^## 1\. /m), to = t.search(/^## 2\. /m)
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from)
  const step1 = t.slice(from, to), b = /^\d+\. \*\*Brainstorm\.\*\*/m.exec(step1), st = /^\d+\. \*\*Start\.\*\*/m.exec(step1)
  expect(b).not.toBeNull(); expect(st).not.toBeNull()
  expect(b!.index).toBeLessThan(st!.index)
  holds('the item Brainstorm', step1.slice(b!.index, st!.index), ['During the brainstorm nothing in the repository changes and no verb of `$H` runs but `dir`'])
})

test('kept: the status paragraph of the README still holds the words "brainstorm" and "grilled"', () => {
  const status = raw('README.md').split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
  for (const w of ['brainstorm', 'grilled']) expect(`the status paragraph holds the word "${w}": ${new RegExp(`\\b${w}\\b`).test(status)}`).toBe(`the status paragraph holds the word "${w}": true`)
})
