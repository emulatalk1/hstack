// The builder's tests of spec 6 ("the builder writes the design before the code, and the reviewer reads the code against
// it, by the user's design rules"): the edges the spec leaves open, as the builder decided them (the decisions file beside
// the spec, section "Edges"). Run: bun test tests/design-before-code-edges.test.ts
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const has = (text: string, phrase: string) => flat(text).includes(flat(phrase))
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for
const holds = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} holds "${p}"`, has(text, p)) }
const filesOf = (dir: string): string[] =>
  (readdirSync(join(ROOT, dir), { recursive: true }) as string[]).map((f) => `${dir}/${f.split('\\').join('/')}`).filter((f) => statSync(join(ROOT, f)).isFile()).sort()
// the lines of a text from the one line that starts with `from` to the next line that matches `until` (or the end)
function part(where: string, text: string, from: string, until: RegExp): string {
  const ls = text.split('\n'), starts = ls.map((l, i) => (l.startsWith(from) ? i : -1)).filter((i) => i >= 0)
  expect(`${where}: lines that start with "${from}": ${starts.length}`).toBe(`${where}: lines that start with "${from}": 1`)
  if (starts.length !== 1) return ''
  const rest = ls.slice(starts[0] + 1), end = rest.findIndex((l) => until.test(l))
  return [ls[starts[0]], ...(end < 0 ? rest : rest.slice(0, end))].join('\n')
}

const BI = 'skills/build-implement'
const RULES = `${BI}/design-rules.md`
const NOTE = `${BI}/design-note.md`
const MODULES = `${BI}/deep-modules.md`
const REVIEW = `${BI}/design-review.md`
const DESIGN_FILES = [RULES, NOTE, MODULES, REVIEW]
const STEP4 = `${BI}/SKILL.md`
const REVIEWER = 'agents/reviewer.md'
const PLAYBOOK = 'skills/build/SKILL.md'

// the user's rules, as the spec's section 2 gives them ("The rules"), after the title and an empty line
const THE_RULES = `# Design Rules (code modules & skills)

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
`

test('E1: the rules file is its title and the rules, and nothing else', () => {
  expect(raw(RULES)).toBe(THE_RULES)
})

test('E11: the copied text on modules has no header block', () => {
  const t = raw(MODULES)
  expect(t.split('\n')[0]).toBe('# Codebase Design') // a file of a skill, not a skill: its first line is its title
  yes(`${MODULES} holds no line "---"`, !t.split('\n').includes('---'))
  yes(`${MODULES} holds no line that starts with "name:" or "description:"`, !t.split('\n').some((l) => /^(name|description):/.test(l)))
})

const item2 = () => part(STEP4, raw(STEP4), '2. ', /^3\. /)

test("E10: item 2 sends the builder to three files of the skill's base directory", () => {
  const t = item2()
  holds(`item 2 of ${STEP4}`, t, ['`design-rules.md`, `design-note.md` and `deep-modules.md` in this skill\'s base directory', 'all three to the end'])
  yes(`item 2 of ${STEP4} does not name design-review.md`, !t.includes('design-review.md'))
})

test('E14: the description of the step 4 skill and its row in the README name the design', () => {
  const front = raw(STEP4).split('\n---')[0]
  holds(`the header of ${STEP4}`, front, ['description: Step 4 of the hstack build loop - the entry points, the edges and the design, the feature written test-first, the checks.'])
  yes(`the description of ${STEP4} still ends with "invoke hstack:build, not this."`, /^description: .*invoke hstack:build, not this\.$/m.test(front))
  const row = raw('README.md').split('\n').find((l) => l.startsWith('| `build-implement` |')) ?? ''
  holds('the row of build-implement in the README', row, ['the entry points, the edges and the design, the feature written test-first, the checks'])
})

test('E7: the reworded words of the copied lines', () => {
  holds(NOTE, raw(NOTE), ['Before any line of product code, map out which files will be created or modified and what each one is responsible for.'])
  holds(REVIEW, raw(REVIEW), ['Is the implementation following the file structure from the section `## Design`?'])
  holds(REVIEWER, raw(REVIEWER), ['Important means this change cannot be trusted until it is fixed'])
  for (const f of [NOTE, REVIEW, REVIEWER]) for (const old of ['in the plan', 'from the plan', 'this task']) yes(`${f} does not hold "${old}"`, !has(raw(f), old))
})

test("E9: the first line of the section names the project's own written rules, and the reviewer reads them from it", () => {
  holds(NOTE, raw(NOTE), ['The first line of the section names the files that hold such rules, or says that there are none.'])
  holds(REVIEW, raw(REVIEW), ["A project's own written rules are in the files that the first line of the section names: read them before you judge the design."])
})

test('E2: no design file and not the reviewer\'s file holds "the rules file wins" in any letter case', () => {
  for (const f of [...DESIGN_FILES, REVIEWER, STEP4]) yes(`${f} does not hold "the rules file wins" in any letter case`, !flat(raw(f)).toLowerCase().includes('the rules file wins'))
})

test("E3: item 5 of the reviewer's file gives the six labels of a design finding in one sentence, in order", () => {
  const item5 = part(REVIEWER, raw(REVIEWER), '5. ', /^6\. /)
  holds(`item 5 of ${REVIEWER}`, item5, ['A design finding is written with `Severity:`, `Where:`, `What this is:`, `Problem:`, `Fix:` and `If we skip it:`, in place of `Case:`, `Expected:` and `Test:`'])
})

test('E13: the passage on severity lies in the reviewer\'s file, after the sentence that limits it', () => {
  const t = flat(raw(REVIEWER))
  const limit = t.indexOf('This grades a design finding only:'), passage = t.indexOf('Categorize issues by actual severity. Not everything is Critical. Important means this change cannot be trusted until it is fixed: incorrect or fragile behavior, a missed requirement, or maintainability damage you would block a merge over — verbatim duplication of a logic block, swallowed errors, tests that assert nothing. "Coverage could be broader" and polish suggestions are Minor.')
  yes(`${REVIEWER} holds the sentence that limits the passage, and the whole passage after it`, limit >= 0 && passage > limit)
  for (const f of DESIGN_FILES) yes(`${f} does not hold the passage on severity`, !has(raw(f), 'Not everything is Critical'))
})

const step6 = () => part(PLAYBOOK, raw(PLAYBOOK), '## 6. ', /^## /)

test("E8: the reviewer's file and step 6 name the four design files, and step 6 says where they lie", () => {
  const input = raw(REVIEWER).split('\n').find((l) => l.startsWith('**Input:**')) ?? ''
  for (const f of DESIGN_FILES) yes(`the input of ${REVIEWER} names ${basename(f)}`, input.includes(`\`${basename(f)}\``))
  // among what the reviewer is started with: from "Start `hstack:reviewer` with" to "Store its reply", not anywhere in the step
  const s = step6(), a = s.indexOf('Start `hstack:reviewer` with'), z = s.indexOf('Store its reply', a)
  yes(`step 6 of ${PLAYBOOK} holds "Start \`hstack:reviewer\` with" and, after it, "Store its reply"`, a >= 0 && z > a)
  const started = s.slice(a, z)
  for (const f of DESIGN_FILES) yes(`what step 6 of ${PLAYBOOK} starts the reviewer with names ${basename(f)}`, started.includes(`\`${basename(f)}\``))
  holds(`what step 6 of ${PLAYBOOK} starts the reviewer with`, started, ['`${CLAUDE_PLUGIN_ROOT}/skills/build-implement/`', "`../build-implement/` from this skill's base directory"])
})

test('E15: step 6 still runs round 2 after any fix, and the review file says where the question on a fix is asked', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), ['If you fixed any, run round 2 into `review-2.md` (not past 180 minutes).'])
  holds(REVIEW, raw(REVIEW), ['Ask it in round 2, of each design finding the builder fixed:'])
})

// the new licence files, and a word that only the file each covers holds
const LICENCES: [string, string[], string][] = [
  [`${BI}/LICENSE-design-1`, ['deep-modules.md', 'design-review.md'], 'Copyright (c) 2026 Matt Pocock'],
  [`${BI}/LICENSE-design-2`, ['design-note.md', 'design-review.md'], 'Copyright (c) 2025 Jesse Vincent'],
  [`${BI}/LICENSE-design-3`, ['design-review.md'], 'Copyright (c) 2025 Addy Osmani'],
  [`${BI}/LICENSE-design-4`, ['design-note.md', 'design-review.md'], 'Copyright (c) 2026 DietrichGebert'],
  ['agents/LICENSE-reviewer-1', ['reviewer.md'], 'Copyright (c) 2025 Jesse Vincent'],
  ['agents/LICENSE-reviewer-2', ['reviewer.md'], 'Copyright (c) 2026 DietrichGebert'],
]

test('E4: no licence file of skills/ and agents/ has an extension', () => {
  const licences = [...filesOf('skills'), ...filesOf('agents')].filter((f) => basename(f).startsWith('LICENSE'))
  expect(licences.length).toBe(9) // the three of earlier copies and the six of this change
  for (const f of licences) yes(`${f} has no extension`, !basename(f).includes('.'))
})

test('E12: each new licence file says what it covers and holds the whole licence text', () => {
  for (const [file, covers, copyright] of LICENCES) {
    const t = raw(file)
    yes(`${file} starts with "Applies to "`, t.startsWith('Applies to '))
    for (const c of covers) yes(`the first line of ${file} names ${c}`, t.split('\n')[0].includes(c))
    holds(file, t, ['MIT License', copyright, 'Permission is hereby granted, free of charge, to any person obtaining a copy', 'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND', 'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'])
  }
})

// every .md file of the folder but the step's skill and its two files of test rules: what the spec calls a design file
const designFilesFound = () => filesOf(BI).filter((f) => f.endsWith('.md') && ![STEP4, `${BI}/tdd.md`, `${BI}/writing-good-tests.md`].includes(f))

test("E5: no design file's name is part of another's", () => {
  const names = designFilesFound().map((f) => basename(f))
  yes('the folder holds design files', names.length > 0)
  for (const a of names) for (const b of names) if (a !== b) yes(`"${a}" is not part of "${b}"`, !b.includes(a))
})

test('E6: the design files are the four files, in the folder itself', () => {
  expect(designFilesFound()).toEqual([...DESIGN_FILES].sort())
})

// ---------- from the review, round 1 ----------

test('E20: the reviewer of round 2 is started with the first review and the builder\'s answers, and is told to judge each fix', () => {
  holds(`step 6 of ${PLAYBOOK}`, step6(), ['Start the reviewer of round 2 with what round 1 got and with `review-1.md`, which holds your answer to each finding.'])
  const input = raw(REVIEWER).split('\n').find((l) => l.startsWith('**Input:**')) ?? ''
  holds(`the input of ${REVIEWER}`, input, ["On a second round, also the review of the first round, with the builder's answer to each finding (`fixed`, or `rejected: <why>`)."])
  holds(REVIEWER, raw(REVIEWER), ['On a second round, read each finding the builder answered `fixed`, and judge the fix'])
})

test('E21: the line on the project\'s rules is not counted in the length of a design', () => {
  holds(NOTE, raw(NOTE), ['This first line stands before the design and is not counted in its length: a small change has it, and then its one line.'])
})

test("E22: the reviewer's description and input name the design", () => {
  const front = raw(REVIEWER).split('\n---')[0]
  holds(`the header of ${REVIEWER}`, front, ['checked defects, each with the test that would catch it, and design findings by the design rules. Started by the hstack:build skill.'])
  const input = raw(REVIEWER).split('\n').find((l) => l.startsWith('**Input:**')) ?? ''
  holds(`the input of ${REVIEWER}`, input, ['`decisions.md`: its entry points, its edges, its design, what it decided alone'])
})
