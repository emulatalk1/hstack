// Acceptance tests of spec 7 ("three follow-ups of spec 6: a split may keep the old import path, one passage grades
// every finding, and a mock-up input is readable in the dark scheme"), written from the spec alone: its behaviours
// 4 to 11, the texts. Behaviours 1 to 3, the mock-up frame, are in tests/design-follow-ups-frame.test.ts.
// Run: bun test tests/design-follow-ups-texts.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const has = (text: string, phrase: string) => flat(text).includes(flat(phrase))
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} holds "${p}"`, has(text, p)) }
const lacks = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} does not hold "${p}"`, !has(text, p)) }
// a set of texts holds a phrase when one of its files does
const setHolds = (where: string, files: string[], phrases: string[]) => { for (const p of phrases) yes(`${where} hold "${p}"`, files.some((f) => has(raw(f), p))) }

// the lines of a file from the one line that starts with `from` to the next line that matches `until` (or the end)
function part(file: string, from: string, until: RegExp, within = raw(file)): string {
  const ls = within.split('\n'), starts = ls.map((l, i) => (l.startsWith(from) ? i : -1)).filter((i) => i >= 0)
  expect(`${file}: lines that start with "${from}": ${starts.length}`).toBe(`${file}: lines that start with "${from}": 1`)
  if (starts.length !== 1) return ''
  const rest = ls.slice(starts[0] + 1), end = rest.findIndex((l) => until.test(l))
  return [ls[starts[0]], ...(end < 0 ? rest : rest.slice(0, end))].join('\n')
}

// every file under a folder of the repository, as a path from the top of the repository
const filesOf = (dir: string): string[] =>
  (readdirSync(join(ROOT, dir), { recursive: true }) as string[]).map((f) => `${dir}/${f.split('\\').join('/')}`).filter((f) => statSync(join(ROOT, f)).isFile()).sort()

const BI = 'skills/build-implement'
const STEP4 = `${BI}/SKILL.md`
const TDD = `${BI}/tdd.md`
const REVIEWER = 'agents/reviewer.md'
const PLAYBOOK = 'skills/build/SKILL.md'
const README = 'README.md'
const PLUGIN = '.claude-plugin/plugin.json'

// ---------- the terms of spec 6, section 3, which spec 7 uses ----------

// a design file: a .md file of skills/build-implement/ other than SKILL.md, tdd.md and writing-good-tests.md
const designFiles = () => filesOf(BI).filter((f) => f.endsWith('.md') && ![STEP4, TDD, `${BI}/writing-good-tests.md`].includes(f))
const namedBy = (file: string) => designFiles().filter((f) => raw(file).includes(basename(f)))
const builderTexts = () => [STEP4, ...namedBy(STEP4)] // skills/build-implement/SKILL.md and every design file whose file name it holds
const reviewerTexts = () => [REVIEWER, ...namedBy(REVIEWER)] // agents/reviewer.md and every design file whose file name it holds
const BUILDER = "the builder's design texts"
const REVIEW = "the reviewer's texts"

const step10 = () => part(PLAYBOOK, '## 10. ', /^## /)
const logItem = () => { const s = step10(); const m = /^\d+\. \*\*The log\.\*\*/m.exec(s); yes('step 10 has an item that starts with "**The log.**"', m !== null); return m ? part(PLAYBOOK, m[0], /^(\d+\. |\*\*|#)/, s) : '' }
const statusParagraph = () => raw(README).split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''

// ---------- the words of the spec, by the number of their behaviour ----------

const P = {
  b4: [
    'A line that exports the moved code again from the old file, so that an earlier test still reaches it, is part of the split, on three conditions:',
    'it names what it exports, never everything at once',
    'the code this run adds reaches the moved code at its new place, never through that line',
    'the section names the line as a debt',
  ],
  b5: ['When it would need such a line to change, do not split, and write that in the section.'],
  b6: ['A line that exports moved code again from the old file, and that the section names as a debt, is no finding; code this run added that reaches the moved code through it is one.'],
  b7: ['"Design debt", with each line that a split left in an old file to export the moved code again'],
  b8not: ['This grades a design finding only'],
  b8: ['This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands.'],
  // "its three sentences on severity": the three that behaviour 18 of spec 6 names
  severity: [
    'Categorize issues by actual severity. Not everything is Critical.',
    'maintainability damage you would block a merge over — verbatim duplication of a logic block, swallowed errors, tests that assert nothing.',
    '"Coverage could be broader" and polish suggestions are Minor.',
  ],
  b9: '## The severity of a finding',
  b9not: ['## The severity of a design finding'],
  b10: ['Categorize issues by actual severity. Not everything is Critical.', '"Coverage could be broader" and polish suggestions are Minor.', 'The rules file comes before this passage'],
  b11: ['"version": "0.4.5"', '**Status: v0.4.5.**'],
}

// ---------- a split that keeps the old way to reach the moved code ----------

test('4: the builder\'s design texts hold "A line that exports the moved code again from the old file, so that an earlier test still reaches it, is part of the split, on three conditions:", "it names what it exports, never everything at once", "the code this run adds reaches the moved code at its new place, never through that line" and "the section names the line as a debt"', () => {
  setHolds(BUILDER, builderTexts(), P.b4)
})

test('5 (holds at the base, and must stay): the builder\'s design texts still hold "When it would need such a line to change, do not split, and write that in the section."', () => {
  setHolds(BUILDER, builderTexts(), P.b5)
})

test('6: the reviewer\'s texts hold "A line that exports moved code again from the old file, and that the section names as a debt, is no finding; code this run added that reaches the moved code through it is one."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b6)
})

test('7: in skills/build/SKILL.md, step 10, the item that starts with "**The log.**" holds ""Design debt", with each line that a split left in an old file to export the moved code again"', () => {
  holds(`the item "The log." of step 10 of ${PLAYBOOK}`, logItem(), P.b7)
})

// ---------- the severity of a finding ----------

test('8: agents/reviewer.md no longer holds "This grades a design finding only"; before its three sentences on severity it holds "This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands."', () => {
  const text = raw(REVIEWER)
  lacks(REVIEWER, text, P.b8not)
  holds(REVIEWER, text, P.b8)
  holds(REVIEWER, text, P.severity)
  // "before": the sentence stands earlier in the file than each of the three sentences on severity
  const t = flat(text), g = t.indexOf(flat(P.b8[0]))
  for (const s of P.severity) yes(`in ${REVIEWER}, "${P.b8[0]}" stands before "${s}"`, g >= 0 && t.indexOf(flat(s)) > g)
})

test('9: agents/reviewer.md holds the heading "## The severity of a finding", and no longer "## The severity of a design finding"', () => {
  const text = raw(REVIEWER)
  yes(`a line of ${REVIEWER} is the heading "${P.b9}"`, text.split('\n').some((l) => l.trimEnd() === P.b9))
  lacks(REVIEWER, text, P.b9not)
})

test('10 (holds at the base, and must stay): agents/reviewer.md still holds "Categorize issues by actual severity. Not everything is Critical.", ""Coverage could be broader" and polish suggestions are Minor." and "The rules file comes before this passage"', () => {
  holds(REVIEWER, raw(REVIEWER), P.b10)
})

// ---------- the version ----------

test('11 (holds at the base, and must stay): .claude-plugin/plugin.json still holds "version": "0.4.5", and the README\'s status paragraph still starts with "**Status: v0.4.5.**"', () => {
  holds(PLUGIN, raw(PLUGIN), [P.b11[0]])
  yes(`the status paragraph of ${README} starts with "${P.b11[1]}"`, statusParagraph().startsWith(P.b11[1]))
})
