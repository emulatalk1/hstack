// Acceptance tests of spec 4 ("the stop hook judges a turn by what changed in it", feedback issue 8), written from
// the spec alone: the texts and the version, behaviours 19 to 23.
// Run: bun test tests/turn-reference-texts.test.ts
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
// the paragraphs of a file: what stands between two empty lines, each on one line
const paragraphs = (file: string) => raw(file).split(/\n\s*\n/).map((p) => flat(p.trim()))

const BRAINSTORM = 'skills/brainstorm/SKILL.md'

// the words of the spec (section 2, "The words")
const REASON = 'before `start` the script itself refuses `spec`, `phase` and `approve`, and the loop\'s stop hook holds a turn in which the repository changed, and a turn that ends after `start` with no spec shown'
const OLD_REASON = 'the loop\'s stop hook would hold such a turn'
const POINT = '- **Nothing in the repository changes before the spec is approved but the spec file itself,** and until the playbook\'s `start` no command of the loop\'s script runs but `dir`: before `start` the script itself refuses `spec`, `phase` and `approve`, and the loop\'s stop hook holds a turn in which the repository changed, and a turn that ends after `start` with no spec shown. From `start` on, the playbook says which command runs (`spec <file>` before a question to your human partner). A spike is built outside the repository, and mock-ups live in the loop\'s state folder.'
const SPIKE_END = 'before the spec is approved, nothing in the repository changes but the spec file itself.'
const SPIKE_LAST = 'Build a spike in a scratch folder outside the repository: before the spec is approved, nothing in the repository changes but the spec file itself.'

// ---------- the brainstorm skill ----------

test('19: the section "## In hstack" of skills/brainstorm/SKILL.md holds the new reason (the script refuses spec, phase and approve before start, and the stop hook holds a turn in which the repository changed, and a turn that ends after start with no spec shown), and no longer holds "the loop\'s stop hook would hold such a turn"', () => {
  const s = section(raw(BRAINSTORM), '## In hstack')
  holds('the section In hstack', s, [REASON])
  lacks('the section In hstack', s, [OLD_REASON])
})

test('19: only the reason of the fourth point of "In hstack" changes: the point is the one the spec quotes, word for word (section 2, "The words")', () => {
  const points = section(raw(BRAINSTORM), '## In hstack').split('\n').filter((l) => l.startsWith('- ')).map(flat)
  const found = points.filter((l) => l.startsWith('- **Nothing in the repository changes before the spec is approved but the spec file itself,**'))
  expect(`points of In hstack that start with "Nothing in the repository changes before the spec is approved but the spec file itself,": ${found.length}`).toBe('points of In hstack that start with "Nothing in the repository changes before the spec is approved but the spec file itself,": 1')
  expect(found[0] ?? '').toBe(POINT)
  expect(points.indexOf(POINT)).toBe(3) // it is still the fourth point
})

test('20: the paragraph of skills/brainstorm/SKILL.md that starts with "**Spike to feel things out.**" ends with "before the spec is approved, nothing in the repository changes but the spec file itself."', () => {
  const found = paragraphs(BRAINSTORM).filter((p) => p.startsWith('**Spike to feel things out.**'))
  expect(`paragraphs that start with "**Spike to feel things out.**": ${found.length}`).toBe('paragraphs that start with "**Spike to feel things out.**": 1')
  const p = found[0] ?? ''
  expect(`the paragraph ends with "${SPIKE_END}": ${p.endsWith(SPIKE_END)}`).toBe(`the paragraph ends with "${SPIKE_END}": true`)
  // its last sentence, whole, as the spec quotes it (section 2, "The words")
  expect(`the paragraph ends with "${SPIKE_LAST}": ${p.endsWith(SPIKE_LAST)}`).toBe(`the paragraph ends with "${SPIKE_LAST}": true`)
})

// ---------- the version and the README ----------

// the README's status paragraph: the one that starts with "**Status:"
function status(): string {
  const found = paragraphs('README.md').filter((p) => p.startsWith('**Status:'))
  expect(`README.md: paragraphs that start with "**Status:": ${found.length}`).toBe('README.md: paragraphs that start with "**Status:": 1')
  return found[0] ?? ''
}

test('21: .claude-plugin/plugin.json holds "version": "0.4.4", and the README\'s status paragraph starts with "**Status: v0.4.4.**"', () => {
  expect(raw('.claude-plugin/plugin.json')).toContain('"version": "0.4.4"')
  expect((JSON.parse(raw('.claude-plugin/plugin.json')) as { version?: string }).version).toBe('0.4.4')
  const s = status()
  expect(`the status paragraph starts with "**Status: v0.4.4.**": ${s.startsWith('**Status: v0.4.4.**')}`).toBe('the status paragraph starts with "**Status: v0.4.4.**": true')
})

test('21: the status paragraph of the README still holds the words "brainstorm" and "grilled" (section 4, item 1)', () => {
  const s = status()
  for (const w of ['brainstorm', 'grilled']) expect(`the status paragraph holds the word "${w}": ${new RegExp(`\\b${w}\\b`).test(s)}`).toBe(`the status paragraph holds the word "${w}": true`)
})

test('22: the README\'s status paragraph holds "Three hooks", and no longer holds "Two hooks" or "before anything changed"', () => {
  const s = status()
  holds('the status paragraph', s, ['Three hooks'])
  lacks('the status paragraph', s, ['Two hooks', 'before anything changed'])
})

test('23: the README\'s paragraph on a machine where bun is not on the PATH holds "three hooks", and no longer holds "Both hooks" or "both hooks"', () => {
  // the paragraph that says what happens there: it names `bun`, the `PATH` and the hooks
  const found = paragraphs('README.md').filter((p) => p.includes('`bun` is not on the `PATH`'))
  expect(`README.md: paragraphs that hold "\`bun\` is not on the \`PATH\`": ${found.length}`).toBe('README.md: paragraphs that hold "`bun` is not on the `PATH`": 1')
  const p = found[0] ?? ''
  holds('the paragraph on bun and the PATH', p, ['three hooks'])
  lacks('the paragraph on bun and the PATH', p, ['Both hooks', 'both hooks'])
})
