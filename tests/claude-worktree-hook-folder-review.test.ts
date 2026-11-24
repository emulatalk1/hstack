// Tests the builder added after review round 1 of spec 10 (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.md`)
// for the points of the text behaviours that no test checked. Each test names its behaviour by its number.
// Run: bun test tests/claude-worktree-hook-folder-review.test.ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(p)}`).toBe(`${where} holds "${p}": true`) }
const PLAYBOOK = 'skills/build/SKILL.md'
const part = (from: string, to: string, file = PLAYBOOK) => { const t = raw(file), i = t.indexOf(from), j = t.indexOf(to, i + 1); expect(i >= 0 && j > i).toBe(true); return t.slice(i, j) }
// one item of a list: from its bold name to the next item at the same depth
const item = (text: string, name: string) => { const i = text.indexOf(`- **${name}`); expect(i >= 0).toBe(true); const j = text.indexOf('\n- **', i + 1); return text.slice(i, j < 0 ? undefined : j) }
const typed = () => part('**What the user typed.**', '1. **The code repository.**')
const rule = (name: string) => raw(PLAYBOOK).split('\n').find((l) => l.startsWith(`- **${name}.**`)) ?? ''

test('48 (step 10): the log entry\'s "Needs your ruling" lists the items written down as not resolved', () => {
  const t = part('7. **The log.**', '8. **Other records.**')
  holds('item 7 of step 10', t, ['written down as not resolved', '`## Not resolved`'])
})

test('2: git check-ignore is asked in the repository\'s main folder, and nothing is added when the folder is already ignored', () => {
  const t = item(typed(), 'Before the worktree is made.')
  holds('the item', t, ['ask git, in the repository\'s main folder, whether `.claude/worktrees/` is ignored', 'when it does, add nothing'])
})

test('4: the first message names the worktree\'s branch and the branch that names the commit it starts from', () => {
  const t = item(typed(), 'The first message of the brainstorm')
  holds('the item', t, ['the worktree\'s path; its branch;', 'with the branch that names that commit'])
})

test('5: with no base named, the brainstorm goes on', () => {
  holds('the item', item(typed(), 'The base.'), ['When the user names no base, the worktree stays as the tool made it and the brainstorm goes on.'])
})

test('6: the worktree and its branch are removed before the new one is made from the base, and the session enters it by its path', () => {
  const t = flat(item(typed(), 'The base.'))
  const a = t.indexOf('Else remove the worktree and its branch'), b = t.indexOf('worktree add -b')
  expect(a >= 0 && b > a).toBe(true)
  holds('the item', t, ['move the session into it by its path'])
})

test('8: a session with no worktree tool, or whose tool fails, starts nothing and is told why', () => {
  const t = item(typed(), 'When it cannot be made.')
  holds('the item', t, ['When the session has no worktree tool, the tool fails', 'tell the user why', 'For a session with no worktree tool, or whose tool fails'])
})

test('10: the question about the merge names the branch of the folder the session left', () => {
  holds('the paragraph', part('**A run made in a new worktree.**', '## A ruling after the run'), ['the branch of the folder the session left'])
})

test('12: in a project whose code is in a repository of its own, the item starts nothing and names the take-up by /hstack:build and the spec\'s name', () => {
  const t = item(typed(), 'A project whose code is in a repository of its own')
  holds('the item', t, ['make no worktree and start nothing', 'the unfinished run is taken up with `/hstack:build` and its spec\'s name'])
})

test('31: the Git rule says until the run is done, and that the run goes on to its end first', () => {
  holds('the Git rule', part('- **Git, in the code repository.**', '- **Git, in the records home.**'), ['From the approval until the run is done', 'the run goes on to its end first'])
})

test('37: once moved into the other work tree, the loop goes on there: the waiting spec is shown again; the run is taken up', () => {
  holds('the item', item(typed(), 'A name that is no spec of this folder.'), ['go on there as for a spec or a run of this folder', 'the waiting spec is shown again; the run is taken up'])
})

test('39: the opening paragraph says the command is followed by what the reader wants built', () => {
  holds('README.md', raw('README.md'), ['You type `/hstack:build` followed by what you want built, and the loop starts'])
})

test('48: the rule Time says the ways tried are written down and the work goes on with the next item', () => {
  holds('the rule Time', rule('Time'), ['with the ways tried', 'the work goes on with the next item'])
})

test('49: round 2 runs after any fix of round 1, and a step is skipped only for a reason that is not the time', () => {
  holds('step 6', part('## 6. Review', '## 7. Explore'), ['If you fixed any, run round 2 into `review-2.md`.'])
  holds('the rule Time', rule('Time'), ['A step is recorded as skipped only for a reason that is not the time.'])
})
