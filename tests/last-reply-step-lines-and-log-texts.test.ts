// Acceptance tests of spec 8 ("the last reply is written for a person who did not see the run, the builder says a
// line before and after each step, and the log entry is written first for the agent of a later session"), written
// from the spec alone: its behaviours 1 to 13, all of them texts.
// Run: bun test tests/last-reply-step-lines-and-log-texts.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const has = (text: string, phrase: string) => flat(text).includes(flat(phrase))
const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} holds "${p}"`, has(text, p)) }
const lacks = (where: string, text: string, phrases: string[]) => { for (const p of phrases) yes(`${where} does not hold "${p}"`, !has(text, p)) }

const PLAYBOOK = 'skills/build/SKILL.md'
const LAST_REPLY = 'skills/build/last-reply.md'
const README = 'README.md'
const PLUGIN = '.claude-plugin/plugin.json'

// the lines of a text from the one line that matches `from` to the next line that matches `until` (or the end).
// Exactly one line may match `from`: with none or with two there is no "that paragraph" or "that item" to read.
function part(what: string, within: string, from: RegExp, until: RegExp): string {
  const ls = within.split('\n'), starts = ls.map((l, i) => (from.test(l) ? i : -1)).filter((i) => i >= 0)
  expect(`${what}: found ${starts.length}`).toBe(`${what}: found 1`)
  if (starts.length !== 1) return ''
  const rest = ls.slice(starts[0] + 1), end = rest.findIndex((l) => until.test(l))
  return [ls[starts[0]], ...(end < 0 ? rest : rest.slice(0, end))].join('\n')
}

const NEXT_ITEM = /^([-*] |\d+\. |\*\*|#)/ // the next item of the list, a paragraph that opens in bold, or a heading: the item before it has ended

// the paragraph of the playbook that starts with "**The last reply.**": from that line to the next empty line
const lastReplyParagraph = () => part(`${PLAYBOOK}: paragraphs that start with "**The last reply.**"`, raw(PLAYBOOK), /^\*\*The last reply\.\*\*/, /^\s*$/)
// the section "## Rules for the whole run" of the playbook: from its heading to the next heading of the same level
const rulesSection = () => part(`${PLAYBOOK}: headings "## Rules for the whole run"`, raw(PLAYBOOK), /^## Rules for the whole run\s*$/, /^## /)
// the item of that section that starts with "**Saying what you do.**"
const sayingItem = () => part(`the section "## Rules for the whole run" of ${PLAYBOOK}: items that start with "**Saying what you do.**"`, rulesSection(), /^\s*([-*]|\d+\.) \*\*Saying what you do\.\*\*/, NEXT_ITEM)
// step 10 of the playbook, and its item that starts with "**The log.**"
const step10 = () => part(`${PLAYBOOK}: headings "## 10. "`, raw(PLAYBOOK), /^## 10\. /, /^## /)
const logItem = () => part(`step 10 of ${PLAYBOOK}: items that start with "**The log.**"`, step10(), /^\s*([-*]|\d+\.) \*\*The log\.\*\*/, NEXT_ITEM)
// the item of the playbook that starts with "**The project's records.**"
const recordsItem = () => part(`${PLAYBOOK}: items that start with "**The project's records.**"`, raw(PLAYBOOK), /^\s*([-*]|\d+\.) \*\*The project's records\.\*\*/, NEXT_ITEM)
// in step 10, the line of `progress/progress.md`: the one line whose item starts with that path
const progressLine = () => part(`step 10 of ${PLAYBOOK}: lines of \`progress/progress.md\``, step10(), /^\s*([-*]|\d+\.) `progress\/progress\.md`/, /^/)
const statusParagraph = () => raw(README).split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''

const SAYING = `the item "Saying what you do." of the section "## Rules for the whole run" of ${PLAYBOOK}`
const LOG = `the item "The log." of step 10 of ${PLAYBOOK}`
const LAST = `the paragraph "The last reply." of ${PLAYBOOK}`
const PROGRESS = `in step 10 of ${PLAYBOOK}, the line of \`progress/progress.md\``

// ---------- the words of the spec, by the number of their behaviour ----------

const P = {
  b1: ['Write for an intelligent but low-context reader.', 'The person reading approved the spec and has not seen the run'],
  b2: ['Put the key points in the first few sentences.', 'what you found, what you did, and what is next', 'Do not use a term or abbreviation that you made up during the work.'],
  b3: [
    'Write mostly in the style of ASD-STE100 Simplified Technical English: short sentences, one idea per sentence, active voice',
    'Use a paragraph of flowing prose where ideas connect, and keep bullets for lists of separate items.',
  ],
  b4: ['Before you write it, read `last-reply.md`'],
  b5: ['When the task names its reply, reply exactly that, and nothing else.', 'end with the short form of the log entry', '`$H times`'],
  b6: ['From the approval on, say in a line what you are about to do before each step, and in a line what it found after it.'],
  b7: ['Each is text inside the turn: never a question, never the end of the turn, and no part of the last reply.', 'A task that names its own reply gets none of these lines.'],
  b8: [
    "The entry is written first for the agent of a later session, which saw nothing of this run: a decision's number and a test's name come with the path of the file that holds them.",
    "A project's own rule for its log comes first.",
  ],
  b9not: ['the log a person reads'],
  b9: ['the log of the runs'],
  b10not: ['The records are for a person who was not here'],
  b10: ['The records are for whoever was not here, first the agent of a later session and then a person:'],
  b11: ['the log of the runs, written first for the agent of a later session.'],
  b11stay: ['One entry per run, appended, never edited.'],
  b12: ['STASH ADDED', 'design findings outside the change', '"Design debt", with each line that a split left in an old file to export the moved code again'],
  b13version: '"version": "0.4.6"',
  b13status: '**Status: v0.4.6.**',
  b13stay: ['brainstorm', 'grilled'],
}

// ---------- the last reply ----------

test('1: the file skills/build/last-reply.md exists and holds "Write for an intelligent but low-context reader." and "The person reading approved the spec and has not seen the run"', () => {
  holds(LAST_REPLY, raw(LAST_REPLY), P.b1)
})

test('2: skills/build/last-reply.md holds "Put the key points in the first few sentences.", "what you found, what you did, and what is next" and "Do not use a term or abbreviation that you made up during the work."', () => {
  holds(LAST_REPLY, raw(LAST_REPLY), P.b2)
})

test('3: skills/build/last-reply.md holds "Write mostly in the style of ASD-STE100 Simplified Technical English: short sentences, one idea per sentence, active voice" and "Use a paragraph of flowing prose where ideas connect, and keep bullets for lists of separate items."', () => {
  holds(LAST_REPLY, raw(LAST_REPLY), P.b3)
})

test('4: in the playbook, the paragraph that starts with "**The last reply.**" holds "Before you write it, read `last-reply.md`"', () => {
  holds(LAST, lastReplyParagraph(), P.b4)
})

test('5 (holds at the base, and must stay): that paragraph still holds "When the task names its reply, reply exactly that, and nothing else.", "end with the short form of the log entry" and "`$H times`"', () => {
  holds(LAST, lastReplyParagraph(), P.b5)
})

// ---------- a line before and after each step ----------

test('6: in the playbook, the section "## Rules for the whole run" holds an item that starts with "**Saying what you do.**" and holds "From the approval on, say in a line what you are about to do before each step, and in a line what it found after it."', () => {
  holds(SAYING, sayingItem(), P.b6)
})

test('7: that item holds "Each is text inside the turn: never a question, never the end of the turn, and no part of the last reply." and "A task that names its own reply gets none of these lines."', () => {
  holds(SAYING, sayingItem(), P.b7)
})

// ---------- the log entry ----------

test('8: in the playbook, step 10, the item that starts with "**The log.**" holds "The entry is written first for the agent of a later session, which saw nothing of this run: a decision\'s number and a test\'s name come with the path of the file that holds them." and "A project\'s own rule for its log comes first."', () => {
  holds(LOG, logItem(), P.b8)
})

test('9: the playbook no longer holds "the log a person reads"; the item that starts with "**The project\'s records.**" holds "the log of the runs"', () => {
  lacks(PLAYBOOK, raw(PLAYBOOK), P.b9not)
  holds(`the item "The project's records." of ${PLAYBOOK}`, recordsItem(), P.b9)
})

test('10: the playbook no longer holds "The records are for a person who was not here"; step 10 holds "The records are for whoever was not here, first the agent of a later session and then a person:"', () => {
  lacks(PLAYBOOK, raw(PLAYBOOK), P.b10not)
  holds(`step 10 of ${PLAYBOOK}`, step10(), P.b10)
})

test('11: in step 10 of the playbook, the line of `progress/progress.md` holds "the log of the runs, written first for the agent of a later session."', () => {
  holds(PROGRESS, progressLine(), P.b11)
})

test('11 (holds at the base, and must stay): in step 10 of the playbook, the line of `progress/progress.md` still holds "One entry per run, appended, never edited."', () => {
  holds(PROGRESS, progressLine(), P.b11stay)
})

test('12 (holds at the base, and must stay): the item that starts with "**The log.**" still holds "STASH ADDED", "design findings outside the change" and ""Design debt", with each line that a split left in an old file to export the moved code again"', () => {
  holds(LOG, logItem(), P.b12)
})

// ---------- the version ----------

test('13: .claude-plugin/plugin.json holds "version": "0.4.6", and the README\'s status paragraph starts with "**Status: v0.4.6.**"', () => {
  holds(PLUGIN, raw(PLUGIN), [P.b13version])
  // the words stand where the plugin's version is read from: the field `version` of the file
  expect(`the field "version" of ${PLUGIN}: ${(JSON.parse(raw(PLUGIN)) as { version?: unknown }).version}`).toBe(`the field "version" of ${PLUGIN}: 0.4.6`)
  yes(`the status paragraph of ${README} starts with "${P.b13status}"`, statusParagraph().startsWith(P.b13status))
})

test('13 (holds at the base, and must stay): the README\'s status paragraph still holds the words "brainstorm" and "grilled"', () => {
  const status = statusParagraph()
  yes(`${README} has a paragraph that starts with "**Status:"`, status !== '')
  holds(`the status paragraph of ${README}`, status, P.b13stay)
})

// ---------- edges that the spec's section 2 decides ("The source of that text") ----------

test('edge (holds at the base, and must stay): the README holds no link to the guide ("So the README holds no link to the guide")', () => {
  lacks(README, raw(README), ['build-with-claude/prompt-engineering', 'prompting-claude-fable-5-2'])
})

test('edge (holds at the base, and must stay): no licence file lies beside skills/build/last-reply.md ("no licence file is written")', () => {
  const licences = readdirSync(join(ROOT, 'skills/build')).filter((f) => /^licen[cs]e/i.test(f)).sort()
  expect(`licence files in skills/build/: ${licences.join(', ') || 'none'}`).toBe('licence files in skills/build/: none')
})
