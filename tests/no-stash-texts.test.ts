// Acceptance tests of spec 5 ("no stash in a run: step 4 names the way without one, and the gate reports a changed
// stash"), the behaviours on the texts of the skills (1 to 6, 12 and 13), written from the spec alone.
// Run: bun test tests/no-stash-texts.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
// `later` stands after the first place of `earlier`
const after = (where: string, text: string, earlier: string, later: string) => {
  const t = flat(text), a = t.indexOf(flat(earlier)), z = t.indexOf(flat(later), a < 0 ? 0 : a + flat(earlier).length)
  expect(`${where}: "${later}" stands after "${earlier}": ${a >= 0 && z >= 0}`).toBe(`${where}: "${later}" stands after "${earlier}": true`)
}

// the lines of a file from the one line that starts with `from` to the next line that matches `until` (or the end)
function part(file: string, from: string, until: RegExp, within = raw(file)): string {
  const ls = within.split('\n'), starts = ls.map((l, i) => (l.startsWith(from) ? i : -1)).filter((i) => i >= 0)
  expect(`${file}: lines that start with "${from}": ${starts.length}`).toBe(`${file}: lines that start with "${from}": 1`)
  if (starts.length !== 1) return ''
  const rest = ls.slice(starts[0] + 1), end = rest.findIndex((l) => until.test(l))
  return [ls[starts[0]], ...(end < 0 ? rest : rest.slice(0, end))].join('\n')
}

const STEP4 = 'skills/build-implement/SKILL.md'
const TDD = 'skills/build-implement/tdd.md'
const PLAYBOOK = 'skills/build/SKILL.md'

// the texts the spec changes
const item4 = () => part(STEP4, '4. ', /^5\. /) // item 4 of the step 4 skill, "Implement"
const tddItem = () => part(TDD, "- **A test that passes at once on this run's own code.**", /^(- \*\*|#)/)
const gitRule = () => part(PLAYBOOK, '- **Git, in the code repository.**', /^(- \*\*|#)/)
const step5 = () => part(PLAYBOOK, '## 5. ', /^## /)
const step10 = () => part(PLAYBOOK, '## 10. ', /^## /)
const logItem = () => { const s = step10(); const m = /^\d+\. \*\*The log\.\*\*/m.exec(s); expect(`step 10 has an item that starts with "**The log.**": ${m !== null}`).toBe('step 10 has an item that starts with "**The log.**": true'); return m ? part(PLAYBOOK, m[0], /^(\d+\. |\*\*|#)/, s) : '' }

// the words of the spec (section 3)
const WAY = "Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards."
const NEVER_FOR_THIS = 'Never `git stash` for this, in any form: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.'
const NEVER_EITHER = 'Never `git stash` either, in any form: the stash is one stack shared by every worktree of the repository.'
const NO_STASH = 'No `git stash` in any form, with a label or without, whatever else the session is told about stashing: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.'
const WHAT_THE_SCRIPT_DOES = '`$H start` records what the stash holds, and `$H gate` and `$H done` print a line `STASH ADDED` or `STASH GONE` for each entry that has come or gone since (step 5).'
const NO_COMMAND = 'Run no stash command to put it right: no pop, no apply, no drop.'
const STEP10_LISTS = 'Step 10 lists each such line under "Needs your ruling", with what you know of it: whether this run made the change.'

// ---------- skills/build-implement/SKILL.md, item 4 ----------

test('1: item 4 of skills/build-implement/SKILL.md holds "Undo a small break by the opposite edit; before a break that takes a whole file\'s change away, copy the file to a temporary folder outside the repository, and copy it back afterwards.", after the words "undo that one edit by hand", which it still holds', () => {
  const t = item4(), where = `item 4 of ${STEP4}`
  holds(where, t, ['undo that one edit by hand', WAY])
  after(where, t, 'undo that one edit by hand', WAY)
})

test('2: that item holds "Never git stash for this, in any form: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session."', () => {
  holds(`item 4 of ${STEP4}`, item4(), [NEVER_FOR_THIS])
})

// ---------- skills/build-implement/tdd.md, the item "A test that passes at once on this run's own code" ----------

test('3: in skills/build-implement/tdd.md, the item that starts with "**A test that passes at once on this run\'s own code.**" holds "Never git stash either, in any form: the stash is one stack shared by every worktree of the repository.", after the words "never restore the file with git checkout", which it still holds', () => {
  const t = tddItem(), where = `the item "A test that passes at once on this run's own code" of ${TDD}`
  holds(where, t, ['never restore the file with `git checkout`', NEVER_EITHER])
  after(where, t, 'never restore the file with `git checkout`', NEVER_EITHER)
})

test('4: that item of tdd.md holds "Undo a small break by the opposite edit; before a break that takes a whole file\'s change away, copy the file to a temporary folder outside the repository, and copy it back afterwards."', () => {
  holds(`the item "A test that passes at once on this run's own code" of ${TDD}`, tddItem(), [WAY])
})

// ---------- skills/build/SKILL.md, the rule "Git, in the code repository" ----------

test('5: in skills/build/SKILL.md, the rule that starts with "**Git, in the code repository.**" holds "No git stash in any form, with a label or without, whatever else the session is told about stashing: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.", after the words "Never stash, reset, rebase, amend or switch branches.", which it still holds', () => {
  const t = gitRule(), where = `the rule "Git, in the code repository" of ${PLAYBOOK}`
  holds(where, t, ['Never stash, reset, rebase, amend or switch branches.', NO_STASH])
  after(where, t, 'Never stash, reset, rebase, amend or switch branches.', NO_STASH)
})

test('6: that rule holds "$H start records what the stash holds, and $H gate and $H done print a line STASH ADDED or STASH GONE for each entry that has come or gone since (step 5)."', () => {
  holds(`the rule "Git, in the code repository" of ${PLAYBOOK}`, gitRule(), [WHAT_THE_SCRIPT_DOES])
})

// ---------- skills/build/SKILL.md, step 5 and step 10 ----------

test('12: step 5 of skills/build/SKILL.md holds "Run no stash command to put it right: no pop, no apply, no drop." and "Step 10 lists each such line under "Needs your ruling", with what you know of it: whether this run made the change."', () => {
  holds(`step 5 of ${PLAYBOOK}`, step5(), [NO_COMMAND, STEP10_LISTS])
})

test('13: in step 10 of skills/build/SKILL.md, the item that starts with "**The log.**" names STASH ADDED and STASH GONE among what the entry holds under "Needs your ruling"', () => {
  holds(`the item "The log" of step 10 of ${PLAYBOOK}`, logItem(), ['STASH ADDED', 'STASH GONE', '"Needs your ruling"'])
})

// ---------- kept (the spec, sections 2 and 4): these pass before the change and must stay ----------

test('kept: item 4 of the step 4 skill still holds "break that code, see the test fail, undo that one edit by hand (your code is not committed yet)."', () => {
  holds(`item 4 of ${STEP4}`, item4(), ['break that code, see the test fail, undo that one edit by hand (your code is not committed yet).'])
})

test('kept: the item of tdd.md still holds "so never restore the file with git checkout here: that would throw the step\'s work away."', () => {
  holds(`the item "A test that passes at once on this run's own code" of ${TDD}`, tddItem(), ["so never restore the file with `git checkout` here: that would throw the step's work away."])
})

test('kept: step 5 of the playbook still holds "Save the output to $S/gate.txt."', () => {
  holds(`step 5 of ${PLAYBOOK}`, step5(), ['Save the output to `$S/gate.txt`.'])
})

test('kept: the item "The log" of step 10 still holds "Needs your ruling"', () => {
  holds(`the item "The log" of step 10 of ${PLAYBOOK}`, logItem(), ['"Needs your ruling"'])
})
