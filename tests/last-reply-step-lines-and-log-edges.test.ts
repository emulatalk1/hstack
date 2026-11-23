// The builder's tests of spec 8 ("the last reply, a line before and after each step, the log for a later agent"):
// the edges the spec leaves open, as the builder decided them (the decisions file beside the spec, section "Edges").
// Run: bun test tests/last-reply-step-lines-and-log-edges.test.ts
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

const PLAYBOOK = 'skills/build/SKILL.md'
const LAST_REPLY = 'skills/build/last-reply.md'

test('E6: skills/build/last-reply.md is a file of a skill, not a skill: it has no header block and starts with the heading "# The last reply"', () => {
  const t = raw(LAST_REPLY)
  yes(`${LAST_REPLY} does not start with a header block ("---")`, !t.startsWith('---'))
  expect(t.split('\n')[0]).toBe('# The last reply')
})

test('E3: last-reply.md says how the reply is written, and leaves what it holds and its order to the playbook', () => {
  yes(`${LAST_REPLY} holds the sentence on what the reply holds`, flat(raw(LAST_REPLY)).includes('What the reply holds, and in what order, is in the playbook, in its paragraph "The last reply.": this file changes none of it.'))
})

test('E4: last-reply.md keeps the lines of `$H times` as they are printed', () => {
  yes(`${LAST_REPLY} holds the sentence on the lines of \`$H times\``, flat(raw(LAST_REPLY)).includes('The lines of `$H times` stand at the end of the reply as they are printed: do not rewrite them.'))
})

test('E5: in the last reply a name the run made up may follow what it names, and never stands for it', () => {
  const t = flat(raw(LAST_REPLY)), say = 'Say what the thing is in a way any reader would understand.'
  const s = "A decision's number, a test's name or a step's ID may follow what it names, in brackets; it never stands for it."
  yes(`${LAST_REPLY} holds "${s}" directly after "${say}"`, t.includes(`${say} ${s}`))
})

// the paragraph of the playbook that starts with "**The last reply.**": one line
const lastReplyLines = () => raw(PLAYBOOK).split('\n').filter((l) => l.startsWith('**The last reply.**'))

test('E2: the paragraph "The last reply." is one line, and the sentence on last-reply.md stands after the reply that the task does not name', () => {
  const ls = lastReplyLines()
  expect(ls.length).toBe(1)
  const l = ls[0] ?? ''
  const named = l.indexOf('When the task names its reply, reply exactly that, and nothing else.'), none = l.indexOf('When it names none, end with the short form of the log entry'), times = l.indexOf('Then the output of `$H times`, as it is.'), read = l.indexOf('Before you write it, read `last-reply.md`')
  yes('that line holds the four sentences in this order: the named reply, the reply that is not named, the times, the reading of last-reply.md', named >= 0 && none > named && times > none && read > times)
})

test('E1: the paragraph "The last reply." says where last-reply.md lies, as step 6 does for the design files', () => {
  const l = lastReplyLines()[0] ?? ''
  yes('that line holds "(`${CLAUDE_PLUGIN_ROOT}/skills/build/last-reply.md`; if that variable is empty, it lies beside this file, in this skill\'s base directory)"', l.includes("(`${CLAUDE_PLUGIN_ROOT}/skills/build/last-reply.md`; if that variable is empty, it lies beside this file, in this skill's base directory)"))
})

test('E7: "Saying what you do." is the last item of "Rules for the whole run", after "Recording.", and holds its three sentences and no other', () => {
  const ls = raw(PLAYBOOK).split('\n'), h = ls.indexOf('## Rules for the whole run')
  yes(`${PLAYBOOK} has the line "## Rules for the whole run"`, h >= 0)
  const rest = ls.slice(h + 1), end = rest.findIndex((l) => l.startsWith('## '))
  const items = rest.slice(0, end).filter((l) => l.startsWith('- **'))
  yes('the item before the last one starts with "- **Recording.**"', (items[items.length - 2] ?? '').startsWith('- **Recording.**'))
  expect(items[items.length - 1]).toBe('- **Saying what you do.** From the approval on, say in a line what you are about to do before each step, and in a line what it found after it. Each is text inside the turn: never a question, never the end of the turn, and no part of the last reply. A task that names its own reply gets none of these lines.')
})

test('E11: the item "The log." ends with the sentences on its first reader, with the sentence on a step\'s ID between the two of the spec', () => {
  const ls = raw(PLAYBOOK).split('\n').filter((l) => /^\d+\. \*\*The log\.\*\*/.test(l))
  expect(ls.length).toBe(1)
  const end = "No time of a step goes into a record. The entry is written first for the agent of a later session, which saw nothing of this run: a decision's number and a test's name come with the path of the file that holds them. A step's ID needs no path: the coverage file defines every one. A project's own rule for its log comes first."
  yes(`the item "The log." of ${PLAYBOOK} ends with "${end}"`, (ls[0] ?? '').endsWith(end))
})

test('E13: the first paragraph of step 10 says whose decision waits, now that it names two readers', () => {
  const s = "The records are for whoever was not here, first the agent of a later session and then a person: what the project now does, what is checked, and what waits for the user's decision."
  yes(`${PLAYBOOK} holds "${s}"`, flat(raw(PLAYBOOK)).includes(s))
})

test('E15: the README\'s status paragraph says what the three changes do, names skills/build/last-reply.md, and holds no link to it', () => {
  const status = raw('README.md').split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
  for (const s of [
    'From the approval on the builder says in a line what it is about to do before each step, and in a line what the step found after it.',
    'The last reply is written for a reader who did not see the run, as `skills/build/last-reply.md` says, and the log entry first for the agent of a later session',
  ]) yes(`the status paragraph holds "${s}"`, flat(status).includes(s))
  yes('the README holds no link whose text or target is last-reply.md', !/\[[^\]]*last-reply\.md[^\]]*\]\(|\]\([^)]*last-reply\.md[^)]*\)/.test(raw('README.md')))
})

test('E16: last-reply.md and the README\'s status paragraph name no source of the text: neither its publisher nor the guide', () => {
  const status = raw('README.md').split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
  for (const [where, text] of [[LAST_REPLY, raw(LAST_REPLY)], ['the status paragraph of README.md', status]] as const)
    for (const w of ['anthropic', 'prompting guide', 'communicating clearly', 'make reports easy to follow', 'signal intent']) yes(`${where} does not hold "${w}" in any letter case`, !text.toLowerCase().includes(w))
})
