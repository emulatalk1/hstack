// Acceptance tests of spec 6 ("the builder writes the design before the code, and the reviewer reads the code against
// it, by the user's design rules"), written from the spec alone.
// Run: bun test tests/design-before-code-texts.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const has = (text: string, phrase: string) => flat(text).includes(flat(phrase))
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} holds "${p}"`, has(text, p)) }
const lacks = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} does not hold "${p}"`, !has(text, p)) }
// `later` stands after the first place of `earlier`
const after = (where: string, text: string, earlier: string, later: string) => {
  const t = flat(text), a = t.indexOf(flat(earlier)), z = t.indexOf(flat(later), a < 0 ? 0 : a + flat(earlier).length)
  yes(`${where}: "${later}" stands after "${earlier}"`, a >= 0 && z >= 0)
}
// a set of texts holds a phrase when one of its files does; it holds none of a list when every file is without each
const setHolds = (where: string, files: string[], phrases: string[]) => { for (const p of phrases) yes(`${where} hold "${p}"`, files.some((f) => has(raw(f), p))) }
const setLacks = (where: string, files: string[], phrases: string[]) => { for (const p of phrases) for (const f of files) yes(`${f} does not hold "${p}"`, !has(raw(f), p)) }

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
const isLicence = (f: string) => basename(f).startsWith('LICENSE')

const BI = 'skills/build-implement'
const STEP4 = `${BI}/SKILL.md`
const TDD = `${BI}/tdd.md`
const REVIEWER = 'agents/reviewer.md'
const PLAYBOOK = 'skills/build/SKILL.md'
const README = 'README.md'
const PLUGIN = '.claude-plugin/plugin.json'

// ---------- the terms of the spec (section 3) ----------

const RULES_TITLE = '# Design Rules (code modules & skills)'
// the rules file: the one file of skills/build-implement/ whose first line is the title
const rulesFiles = () => filesOf(BI).filter((f) => raw(f).split('\n')[0].trimEnd() === RULES_TITLE)
const rulesFile = (): string => {
  const fs = rulesFiles()
  expect(`files of ${BI}/ whose first line is "${RULES_TITLE}": ${fs.length}`).toBe(`files of ${BI}/ whose first line is "${RULES_TITLE}": 1`)
  return fs.length === 1 ? fs[0] : ''
}
// a design file: a .md file of skills/build-implement/ other than SKILL.md, tdd.md and writing-good-tests.md
const designFiles = () => filesOf(BI).filter((f) => f.endsWith('.md') && ![STEP4, TDD, `${BI}/writing-good-tests.md`].includes(f))
const namedBy = (file: string) => designFiles().filter((f) => raw(file).includes(basename(f)))
const builderTexts = () => [STEP4, ...namedBy(STEP4)] // skills/build-implement/SKILL.md and every design file whose file name it holds
const reviewerTexts = () => [REVIEWER, ...namedBy(REVIEWER)] // agents/reviewer.md and every design file whose file name it holds
const BUILDER = "the builder's design texts"
const REVIEW = "the reviewer's texts"

const item2 = () => part(STEP4, '2. ', /^3\. /) // item 2 of the step 4 skill
const refactor = () => part(TDD, '### REFACTOR - Clean Up', /^#/)
const step4 = () => part(PLAYBOOK, '## 4. ', /^## /)
const step6 = () => part(PLAYBOOK, '## 6. ', /^## /)
const step9 = () => part(PLAYBOOK, '## 9. ', /^## /)
const step10 = () => part(PLAYBOOK, '## 10. ', /^## /)
const logItem = () => { const s = step10(); const m = /^\d+\. \*\*The log\.\*\*/m.exec(s); yes('step 10 has an item that starts with "**The log.**"', m !== null); return m ? part(PLAYBOOK, m[0], /^(\d+\. |\*\*|#)/, s) : '' }
const statusParagraph = () => raw(README).split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
const headings = (file: string) => raw(file).split('\n').map((l) => /^#{1,6}\s+(.*?)\s*$/.exec(l)).filter((m): m is RegExpExecArray => m !== null).map((m) => m[1])

// ---------- the words of the spec ----------

// "The rules" of section 2: the text of the rules file after its first line
const RULES = `
"Module" = anything with an interface and an implementation: a function, class or package in code, or a skill.
"Caller" = whoever uses it (code, user, or agent).
For a skill: interface = name + description (what triggers it);
internals = instructions, scripts, references (progressive disclosure).

1. **Deep Modules (small interface, rich functionality)**
   - Expose the smallest interface that covers real use cases; the common case must be simple.
   - Information hiding: internals stay private, modules interact only through interfaces, callers never coordinate internal pieces (avoid shallow modules).
   - Explicit contract: what it does, when to use it, how it fails.

2. **Separation of Concerns (inside a module)**
   - Separate decisions (policy, business logic) from mechanics and side effects (I/O, tools, external systems).
   - Decision logic must be understandable and testable without running the side effects.

3. **Pragmatic SOLID**
   - **SRP** at the capability level: one coherent capability, one reason to change (one actor driving it). Not one function per module.
   - **DIP & ISP** at seams: depend on narrow interfaces shaped by the module's needs, not the provider's, so the core stays testable and providers stay swappable.

4. **Contextual DRY**
   - **Single Source of Truth** for knowledge: each rule, invariant, or fact lives in exactly one owning module. Consolidate immediately.
   - **Rule of Three** for look-alike code or text: do not abstract until it repeats 3 times and changes for the same reason. Coincidental similarity stays separate.
`.split('\n').map((l) => l.trim()).filter((l) => l !== '')
const RULE_LINES = RULES.filter((l) => l.startsWith('- ')) // the nine lines that begin, after their leading spaces, with "- "

// the seven smells and the two binding rules of section 2, each from its name on (the list mark before it is not looked at)
const SMELLS = [
  '**Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.',
  "**Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.",
  '**Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.',
  '**Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.',
  "**Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.",
  "**Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.",
  '**Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.',
]
const BINDING = [
  '**The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.',
  '**Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.',
]

// the phrases of section 3, by the number of their behaviour
const P = {
  b5: ['Before any line of product code', '## Entry points', '## Edges', '## Design', '$S/decisions.md'],
  b6: ['A small change has a design of one line; the section is never left out.'],
  b7: ['which files will be created or modified and what each one is responsible for', 'Files that change together should live together. Split by responsibility, not by technical layer.', 'In existing codebases, follow established patterns.', "don't unilaterally restructure", 'including a split in the design is reasonable'],
  b7not: ['Prefer smaller, focused files', 'Design units with clear boundaries', 'Before defining tasks', 'get locked in'],
  b8: ["A project's own written rules come first; then the way the existing code already does it; then the rules file; then everything else in these texts."],
  b8not: ['the rules file wins'],
  b9: ['Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.', 'For each rule, number or format that the spec brings in or changes, the section names the one file that holds it.'],
  b10: ['When what is built is a skill, the section names the file that owns each rule and each place that repeats it on purpose, with the reason.', 'A copy that the section names with its reason is how rule 4 holds for a skill, not a breach of it.'],
  b11: ['write the correction into the section first, with what you found and why, and keep the earlier line', 'The run does not stop for it.'],
  b12headings: ['Glossary', 'Deep vs shallow', 'Principles', 'Designing for testability', 'Relationships', 'Rejected framings'],
  b12: ['a lot of behaviour behind a small interface', 'Can I reduce the number of methods?', '**The deletion test.**', '**One adapter means a hypothetical seam. Two adapters means a real one.**', "**Accept dependencies, don't create them.**", "**Return results, don't produce side effects.**"],
  b12not: ['DEEPENING.md', 'DESIGN-IT-TWICE.md'],
  b12a: ['A split of a file that existed before the run is made only when the section names it before any line of product code; it is made first, before any other line of product code of the feature, and never after the review.'],
  b12b: ['Its reason is a rule of the rules file (a file that does several unrelated jobs), never a count of lines.'],
  b12c: ['It changes no behaviour: every test that passed before it passes after it, in the forms the capabilities allow at this step, and no line changes in a test that existed at the base or in a test of the oracle. When it would need such a line to change, do not split, and write that in the section.'],
  b12d: ['Only in code this run added: leave code and tests that existed at the base as they are.', 'One exception: a split that the section `## Design` names (step 4, item 2), made before the first cycle, while every test that passed at the base still passes.', 'Seven things are not violations'],
  b12e: ['This split is the one exception to the order of the sources: here the rules file is put before the way the existing code already does it. It is for the file the change must modify and no other, and it is allowed, never required.'],
  b13: ['No remarks of taste (a name, a layout, a preference). A design finding by the rules file is not a remark of taste.'],
  b13not: ['No style remarks.'],
  b14: ['Is the implementation following the file structure from', 'A difference between the code and the section that no line of the section explains is a finding.'],
  b14a: ['For a design finding, concrete means a place in the code and what happens if it is skipped: it has no input and no wrong result, and is not dropped for that.'],
  b14b: ['A smell is a lead, not a finding: it becomes a finding only when its four parts can be written, and its severity is set then.'],
  b15: ['A design finding in code that existed before this run is marked "outside the change".'],
  b15not: ["Don't flag pre-existing file sizes", 'already large'],
  b16not: ['Mysterious Name', 'Data Clumps', 'Primitive Obsession', 'Repeated Switches', 'Refused Bequest'],
  b18: ['Categorize issues by actual severity. Not everything is Critical.', 'maintainability damage you would block a merge over — verbatim duplication of a logic block, swallowed errors, tests that assert nothing.', '"Coverage could be broader" and polish suggestions are Minor.'],
  b18not: ['plan-mandated', 'Acknowledge what was done well'],
  b18before: ['This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands.'],
  b19: ['Zero findings is a valid result; do not invent one.'],
  b20: ['**Does this refactor reduce complexity or just relocate it?**', 'Count the concepts a reader must hold to follow the change.'],
  b21: ['reuse: the repo already has this helper (name the path)', 'merge: near-copies that must change together'],
  b22: ['A test or a document that states a rule in order to check it or to explain it is not a second place.', 'Two pieces of code that look alike and do not have to change together stay apart.'],
  b23: ['For a skill, a finding is a copy of a rule that the section does not name, or two copies that say different things; a copy the section names with its reason is not one.'],
  b24: ['Severity:', 'Where:', 'What this is:', 'Problem:', 'Fix:', 'If we skip it:'],
  b24still: ['`Case:` (input → wrong result)', '`Test:` (the test that would fail today)'],
  b25: ['## Coverage', '## Verdict', 'Check each finding against the code before you report it'],
  b28: ['a finding of wrong behaviour, with a test that fails before the fix and passes after', 'a design finding, by a change of structure that changes no behaviour', 'every test that passed before it passes after it', 'no line changes in a test that existed at the base or in a test of the oracle', 'a test this run wrote may change how it reaches the code, never what it checks'],
  b28not: ['each with a test that fails before the fix and passes after'],
  b29: ['only in code this run added', 'A finding marked "outside the change" is not fixed'],
  b30: ['A fix that would need a line of such a test to change is no change of structure only: do not make it, and answer the finding with that reason.'],
  b31: ['A finding that the code differs from the section, where the code is right and the section is behind, is closed by writing the missing line into the section, with its reason.'],
  b32: ['design findings outside the change', 'design findings whose fix would have changed an earlier test', 'a split the design named and the builder did not make'],
  b33: ['a fix gets a test that fails first, but a lint, format or type fix'],
  b35: ['Pocock', 'Vincent', 'Osmani', 'Gebert', 'superpowers', 'ponytail', 'agent-skills'],
  b36: ['"version": "0.4.6"', '**Status: v0.4.6.**'],
  b37: ['## Design', 'design rules'],
}
// behaviour 34: a copied phrase, and the copyright line of the licence file beside every file that holds it
const SOURCES: [string, string][] = [
  ['**The deletion test.**', 'Copyright (c) 2026 Matt Pocock'],
  ['**Middle Man**', 'Copyright (c) 2026 Matt Pocock'],
  ['Files that change together should live together', 'Copyright (c) 2025 Jesse Vincent'],
  ['Not everything is Critical', 'Copyright (c) 2025 Jesse Vincent'],
  ['Zero findings is a valid result', 'Copyright (c) 2025 Addy Osmani'],
  ['merge: near-copies that must change together', 'Copyright (c) 2026 DietrichGebert'],
]

// ---------- the rules file ----------

test('1: exactly one file of skills/build-implement/ has "# Design Rules (code modules & skills)" as its first line', () => {
  expect(rulesFiles().length).toBe(1)
})

test('2: the rules file holds every line of "The rules" of section 2, word for word and in that order', () => {
  const f = rulesFile()
  if (!f) return
  const lines = raw(f).split('\n').map((l) => l.trim())
  let at = 0
  for (const rule of RULES) {
    const i = lines.indexOf(rule, at)
    yes(`${f} holds, after the lines before it, the line "${rule}"`, i >= 0)
    if (i < 0) return
    at = i + 1
  }
})

test('3: each of the nine lines of "The rules" that begin, after their leading spaces, with "- " stands in no other file of skills/ and agents/', () => {
  const f = rulesFile()
  expect(RULE_LINES.length).toBe(9)
  if (!f) return
  for (const other of [...filesOf('skills'), ...filesOf('agents')].filter((o) => o !== f)) lacks(other, raw(other), RULE_LINES.map((l) => l.slice(2)))
})

test('4: skills/build-implement/SKILL.md and agents/reviewer.md each hold the file name of the rules file', () => {
  const f = rulesFile()
  if (!f) return
  for (const where of [STEP4, REVIEWER]) yes(`${where} holds the file name "${basename(f)}"`, raw(where).includes(basename(f)))
})

// ---------- the design, before the code (step 4) ----------

test('5: skills/build-implement/SKILL.md still has its six numbered items; its item 2 still holds "Before any line of product code", "## Entry points" and "## Edges", and now also names a third section of $S/decisions.md, "## Design"', () => {
  const numbers = raw(STEP4).split('\n').map((l) => /^(\d+)\. /.exec(l)).filter((m): m is RegExpExecArray => m !== null).map((m) => m[1])
  expect(numbers).toEqual(['1', '2', '3', '4', '5', '6'])
  holds(`item 2 of ${STEP4}`, item2(), P.b5)
})

test('6: item 2 holds "A small change has a design of one line; the section is never left out."', () => {
  holds(`item 2 of ${STEP4}`, item2(), P.b6)
})

test('7: the builder\'s design texts hold the lines on file structure ("which files will be created or modified and what each one is responsible for" to "including a split in the design is reasonable"), and none of "Prefer smaller, focused files", "Design units with clear boundaries", "Before defining tasks" and "get locked in"', () => {
  setHolds(BUILDER, builderTexts(), P.b7)
  setLacks(BUILDER, builderTexts(), P.b7not)
})

test('8: the builder\'s design texts hold "A project\'s own written rules come first; then the way the existing code already does it; then the rules file; then everything else in these texts.", and so do the reviewer\'s texts; neither holds "the rules file wins"', () => {
  setHolds(BUILDER, builderTexts(), P.b8)
  setHolds(REVIEW, reviewerTexts(), P.b8)
  setLacks(BUILDER, builderTexts(), P.b8not)
  setLacks(REVIEW, reviewerTexts(), P.b8not)
})

test('9: the builder\'s design texts hold "Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does." and "For each rule, number or format that the spec brings in or changes, the section names the one file that holds it."', () => {
  setHolds(BUILDER, builderTexts(), P.b9)
})

test('10: the builder\'s design texts hold "When what is built is a skill, the section names the file that owns each rule and each place that repeats it on purpose, with the reason." and "A copy that the section names with its reason is how rule 4 holds for a skill, not a breach of it.", and the reviewer\'s texts hold the second sentence too', () => {
  setHolds(BUILDER, builderTexts(), P.b10)
  setHolds(REVIEW, reviewerTexts(), [P.b10[1]])
})

test('11: the builder\'s design texts hold "write the correction into the section first, with what you found and why, and keep the earlier line" and "The run does not stop for it."', () => {
  setHolds(BUILDER, builderTexts(), P.b11)
})

test('12: the builder\'s design texts hold, each as the text of a heading, "Glossary", "Deep vs shallow", "Principles", "Designing for testability", "Relationships" and "Rejected framings", and the six phrases of the design skill; no heading of them is "Going deeper", and they hold neither "DEEPENING.md" nor "DESIGN-IT-TWICE.md"', () => {
  const hs = builderTexts().flatMap(headings)
  for (const h of P.b12headings) yes(`${BUILDER} hold a heading whose text is "${h}"`, hs.includes(h))
  setHolds(BUILDER, builderTexts(), P.b12)
  yes(`no heading of ${BUILDER} is "Going deeper"`, !hs.includes('Going deeper'))
  setLacks(BUILDER, builderTexts(), P.b12not)
})

test('12a: the builder\'s design texts hold "A split of a file that existed before the run is made only when the section names it before any line of product code; it is made first, before any other line of product code of the feature, and never after the review."', () => {
  setHolds(BUILDER, builderTexts(), P.b12a)
})

test('12b: the builder\'s design texts hold "Its reason is a rule of the rules file (a file that does several unrelated jobs), never a count of lines."', () => {
  setHolds(BUILDER, builderTexts(), P.b12b)
})

test('12c: the builder\'s design texts hold "It changes no behaviour: every test that passed before it passes after it, in the forms the capabilities allow at this step, and no line changes in a test that existed at the base or in a test of the oracle. When it would need such a line to change, do not split, and write that in the section."', () => {
  setHolds(BUILDER, builderTexts(), P.b12c)
})

test('12d: in skills/build-implement/tdd.md, the part "### REFACTOR - Clean Up" still holds "Only in code this run added: leave code and tests that existed at the base as they are.", and after it "One exception: a split that the section ## Design names (step 4, item 2), made before the first cycle, while every test that passed at the base still passes."; the file still holds "Seven things are not violations"', () => {
  // the spec writes the second sentence inside one pair of backticks, with `## Design` in it: the backticks are not compared
  const bare = (s: string) => s.split('`').join('')
  const t = bare(refactor()), where = `the part "### REFACTOR - Clean Up" of ${TDD}`
  holds(where, t, [P.b12d[0], bare(P.b12d[1])])
  after(where, t, P.b12d[0], bare(P.b12d[1]))
  holds(TDD, raw(TDD), [P.b12d[2]])
})

test('12e: the builder\'s design texts hold "This split is the one exception to the order of the sources: here the rules file is put before the way the existing code already does it. It is for the file the change must modify and no other, and it is allowed, never required."', () => {
  setHolds(BUILDER, builderTexts(), P.b12e)
})

// ---------- the review (step 6) ----------

test('13: agents/reviewer.md no longer holds "No style remarks."; it holds "No remarks of taste (a name, a layout, a preference). A design finding by the rules file is not a remark of taste."', () => {
  lacks(REVIEWER, raw(REVIEWER), P.b13not)
  holds(REVIEWER, raw(REVIEWER), P.b13)
})

test('14: the reviewer\'s texts hold "Is the implementation following the file structure from" and "A difference between the code and the section that no line of the section explains is a finding."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b14)
})

test('14a: agents/reviewer.md holds "For a design finding, concrete means a place in the code and what happens if it is skipped: it has no input and no wrong result, and is not dropped for that."', () => {
  holds(REVIEWER, raw(REVIEWER), P.b14a)
})

test('14b: the reviewer\'s texts hold "A smell is a lead, not a finding: it becomes a finding only when its four parts can be written, and its severity is set then."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b14b)
})

test('15: the reviewer\'s texts hold "A design finding in code that existed before this run is marked "outside the change".", and none of "Don\'t flag pre-existing file sizes" and "already large"', () => {
  setHolds(REVIEW, reviewerTexts(), P.b15)
  setLacks(REVIEW, reviewerTexts(), P.b15not)
})

test('16: the reviewer\'s texts hold each of the seven lines of the smells of section 2, word for word, and none of "Mysterious Name", "Data Clumps", "Primitive Obsession", "Repeated Switches" and "Refused Bequest"', () => {
  setHolds(REVIEW, reviewerTexts(), SMELLS)
  setLacks(REVIEW, reviewerTexts(), P.b16not)
})

test('17: the reviewer\'s texts hold the two lines of the binding rules of section 2, word for word', () => {
  setHolds(REVIEW, reviewerTexts(), BINDING)
})

test('18: the reviewer\'s texts hold the sentences on severity, and none of "plan-mandated" and "Acknowledge what was done well"; before those sentences they hold "This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b18)
  setLacks(REVIEW, reviewerTexts(), P.b18not)
  setHolds(REVIEW, reviewerTexts(), P.b18before)
  // "before": earlier in the file that holds the sentences
  const order = (f: string) => { const t = flat(raw(f)), g = t.indexOf(flat(P.b18before[0])); return g >= 0 && P.b18.every((s) => t.indexOf(flat(s), g) > g) }
  yes(`in one of ${REVIEW}, "${P.b18before[0]}" stands before the three sentences on severity`, reviewerTexts().some(order))
})

test('19: the reviewer\'s texts hold "Zero findings is a valid result; do not invent one."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b19)
})

test('20: the reviewer\'s texts hold "**Does this refactor reduce complexity or just relocate it?**" and "Count the concepts a reader must hold to follow the change."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b20)
})

test('21: the reviewer\'s texts hold "reuse: the repo already has this helper (name the path)" and "merge: near-copies that must change together"', () => {
  setHolds(REVIEW, reviewerTexts(), P.b21)
})

test('22: the reviewer\'s texts hold "A test or a document that states a rule in order to check it or to explain it is not a second place." and "Two pieces of code that look alike and do not have to change together stay apart."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b22)
})

test('23: the reviewer\'s texts hold "For a skill, a finding is a copy of a rule that the section does not name, or two copies that say different things; a copy the section names with its reason is not one."', () => {
  setHolds(REVIEW, reviewerTexts(), P.b23)
})

test('24: agents/reviewer.md says that a design finding is written with "Severity:", "Where:", "What this is:", "Problem:", "Fix:" and "If we skip it:", and it still holds "`Case:` (input → wrong result)" and "`Test:` (the test that would fail today)" for its other findings', () => {
  holds(REVIEWER, raw(REVIEWER), ['design finding', ...P.b24, ...P.b24still])
})

test('25 (holds at the base, and must stay): agents/reviewer.md still holds "## Coverage", "## Verdict" and "Check each finding against the code before you report it"', () => {
  holds(REVIEWER, raw(REVIEWER), P.b25)
})

// ---------- the playbook (skills/build/SKILL.md) ----------

test('26: step 4 names "## Design" beside "## Entry points" and "## Edges" among what the step leaves in $S/decisions.md', () => {
  const paragraphs = step4().split(/\n\s*\n/)
  yes(`one paragraph of step 4 of ${PLAYBOOK} holds "## Design", "## Entry points", "## Edges" and "$S/decisions.md"`, paragraphs.some((p) => ['## Design', '## Entry points', '## Edges', '$S/decisions.md'].every((w) => has(p, w))))
})

test('27: step 6 holds the file name of each design file that agents/reviewer.md names, among what the reviewer is started with', () => {
  const named = namedBy(REVIEWER), s = step6()
  yes(`${REVIEWER} names a design file (behaviour 4: the rules file)`, named.length > 0)
  for (const f of named) yes(`step 6 of ${PLAYBOOK} holds the file name "${basename(f)}"`, s.includes(basename(f)))
})

test('28: step 6 holds the two ways of a fix (a finding of wrong behaviour, with a test that fails before the fix and passes after; a design finding, by a change of structure that changes no behaviour) and what proves the second; it no longer holds "each with a test that fails before the fix and passes after"', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), P.b28)
  lacks(`step 6 of ${PLAYBOOK}`, step6(), P.b28not)
})

test('29: step 6 holds "only in code this run added" and "A finding marked "outside the change" is not fixed"', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), P.b29)
})

test('30: step 6 holds "A fix that would need a line of such a test to change is no change of structure only: do not make it, and answer the finding with that reason."', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), P.b30)
})

test('31: step 6 holds "A finding that the code differs from the section, where the code is right and the section is behind, is closed by writing the missing line into the section, with its reason."', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), P.b31)
})

test('32: in step 10, the item that starts with "**The log.**" holds "design findings outside the change", "design findings whose fix would have changed an earlier test" and "a split the design named and the builder did not make"', () => {
  holds(`the item "The log." of step 10 of ${PLAYBOOK}`, logItem(), P.b32)
})

test('33 (holds at the base, and must stay): step 9 still holds "a fix gets a test that fails first, but a lint, format or type fix"', () => {
  holds(`step 9 of ${PLAYBOOK}`, step9(), P.b33)
})

// ---------- the sources and their licences ----------

test('34: the folder of every file of skills/ and agents/ that holds a copied phrase also holds a licence file that holds the file\'s name, the words "Permission is hereby granted" and the copyright line given', () => {
  const all = [...filesOf('skills'), ...filesOf('agents')]
  for (const [phrase, copyright] of SOURCES) {
    const holders = all.filter((f) => !isLicence(f) && has(raw(f), phrase))
    yes(`a file of skills/ and agents/ holds "${phrase}" (behaviours 7, 12, 16, 18, 19 and 21)`, holders.length > 0)
    for (const f of holders) {
      const licences = all.filter((l) => isLicence(l) && dirname(l) === dirname(f))
      const ok = licences.some((l) => { const t = raw(l); return t.includes(basename(f)) && has(t, 'Permission is hereby granted') && has(t, copyright) })
      yes(`${dirname(f)}/ holds a licence file that holds "${basename(f)}", "Permission is hereby granted" and "${copyright}" (for "${phrase}")`, ok)
    }
  }
})

test('35 (holds at the base, and must stay): no file of skills/ and agents/ other than a licence file holds any of "Pocock", "Vincent", "Osmani", "Gebert", "superpowers", "ponytail" and "agent-skills", in any letter case', () => {
  for (const f of [...filesOf('skills'), ...filesOf('agents')].filter((x) => !isLicence(x))) {
    const t = raw(f).toLowerCase()
    for (const w of P.b35) yes(`${f} does not hold "${w}" in any letter case`, !t.includes(w.toLowerCase()))
  }
})

// ---------- the version and the README ----------

test('36: .claude-plugin/plugin.json holds "version": "0.4.6", and the README\'s status paragraph starts with "**Status: v0.4.6.**" and still holds the words "brainstorm" and "grilled"', () => {
  holds(PLUGIN, raw(PLUGIN), [P.b36[0]])
  const status = statusParagraph()
  yes(`the status paragraph of ${README} starts with "${P.b36[1]}"`, status.startsWith(P.b36[1]))
  for (const w of ['brainstorm', 'grilled']) yes(`the status paragraph holds the word "${w}"`, new RegExp(`\\b${w}\\b`).test(status))
})

test('37: the README\'s status paragraph holds "## Design" and "design rules", and the README holds the path of every licence file of skills/ and agents/', () => {
  holds(`the status paragraph of ${README}`, statusParagraph(), P.b37)
  const readme = raw(README)
  for (const l of [...filesOf('skills'), ...filesOf('agents')].filter(isLicence)) yes(`${README} holds the path "${l}"`, readme.includes(l))
})
