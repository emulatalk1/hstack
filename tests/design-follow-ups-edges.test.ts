// The builder's tests of spec 7 ("three follow-ups of spec 6"): the edges the spec leaves open, as the builder decided
// them (the decisions file beside the spec, section "Edges"). Run: bun test tests/design-follow-ups-edges.test.ts
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

const NOTE = 'skills/build-implement/design-note.md'

test('F2: the three conditions of a line that exports again stand in one sentence, after the condition on tests', () => {
  const t = flat(raw(NOTE))
  const before = 'When it would need such a line to change, do not split, and write that in the section.'
  const sentence = 'A line that exports the moved code again from the old file, so that an earlier test still reaches it, is part of the split, on three conditions: it names what it exports, never everything at once; the code this run adds reaches the moved code at its new place, never through that line; and the section names the line as a debt, with the file it is left in and what it exports.'
  const a = t.indexOf(before), z = t.indexOf(sentence)
  yes(`${NOTE} holds the whole sentence on a line that exports again`, z >= 0)
  yes(`${NOTE}: that sentence stands after "${before}"`, a >= 0 && z > a)
})

const PLAYBOOK = 'skills/build/SKILL.md'

test('F3: in the log item, "Design debt" stands after "Design not fixed" and before "Needs your ruling"', () => {
  const t = flat(raw(PLAYBOOK)), log = t.slice(t.indexOf('**The log.**'), t.indexOf('**Other records.**'))
  const a = log.indexOf('"Design not fixed"'), b = log.indexOf('"Design debt", with each line that a split left in an old file to export the moved code again'), c = log.indexOf('"Needs your ruling"')
  yes(`the log item of ${PLAYBOOK} holds "Design not fixed", then "Design debt", then "Needs your ruling"`, a >= 0 && b > a && c > b)
})

const REVIEWER = 'agents/reviewer.md'
const DESIGN_FILES = ['design-rules.md', 'design-note.md', 'deep-modules.md', 'design-review.md'].map((f) => `skills/build-implement/${f}`)

test('F1: the sentence that says what the passage grades stands directly under the heading, before the passage', () => {
  const ls = raw(REVIEWER).split('\n'), h = ls.indexOf('## The severity of a finding')
  yes(`${REVIEWER} has the line "## The severity of a finding"`, h >= 0)
  const next = ls.slice(h + 1).filter((l) => l.trim() !== '')
  expect(next[0]).toBe('This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands.')
  yes(`the next paragraph of ${REVIEWER} starts the passage on severity`, (next[1] ?? '').startsWith('Categorize issues by actual severity. Not everything is Critical.'))
})

test('F4: no design file holds the old sentence that limited the passage', () => {
  for (const f of [...DESIGN_FILES, REVIEWER]) yes(`${f} does not hold "grades a design finding only"`, !flat(raw(f)).includes('grades a design finding only'))
})
