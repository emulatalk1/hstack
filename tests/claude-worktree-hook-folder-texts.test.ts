// Acceptance tests of spec 10 (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.md`), written from the spec
// alone: the texts, behaviours 1, 2, 4 to 12, 31, 32, 37 and 39 to 54. Each test names its behaviour by its number.
// The hooks and the script are in tests/claude-worktree-hook-folder.test.ts.
// Run: bun test tests/claude-worktree-hook-folder-texts.test.ts
// Each test reads only files of this repository. A phrase is looked for word for word; a line break inside a phrase
// counts as a space. Where the spec leaves the words to the builder ("says that …"), a test looks for the few words of
// the spec's own sentence that any wording of it needs.
import { expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
const lacks = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": false`) }
const says = (where: string, text: string, what: string, re: RegExp) => expect(`${where} says ${what}: ${re.test(flat(text))}`).toBe(`${where} says ${what}: true`)

const PLAYBOOK = 'skills/build/SKILL.md'
// a part of a file, from a mark to the next mark (the spec names the marks)
function part(file: string, from: string, to: string): string {
  const t = raw(file), i = t.indexOf(from)
  expect(`${file} holds "${from}": ${i >= 0}`).toBe(`${file} holds "${from}": true`)
  if (i < 0) return ''
  const j = t.indexOf(to, i + from.length)
  expect(`${file} holds "${to}" after "${from}": ${j >= 0}`).toBe(`${file} holds "${to}" after "${from}": true`)
  return t.slice(i, j < 0 ? undefined : j)
}
const typed = () => part(PLAYBOOK, '**What the user typed.**', '1. **The code repository.**')
const gitRule = () => part(PLAYBOOK, '- **Git, in the code repository.**', '- **Git, in the records home.**')
const newWorktree = () => part(PLAYBOOK, '**A run made in a new worktree.**', '## A ruling after the run')
// a rule of "Rules for the whole run": its one line
function rule(name: string): string {
  const l = raw(PLAYBOOK).split('\n').find((x) => x.startsWith(`- **${name}.**`))
  expect(`the playbook has the rule "${name}.": ${l !== undefined}`).toBe(`the playbook has the rule "${name}.": true`)
  return l ?? ''
}
// a step of the playbook: from its heading "## <n>." to the next heading of level 2
function step(num: number): string {
  const t = raw(PLAYBOOK), m = new RegExp(`^## ${num}\\. .*$`, 'm').exec(t)
  expect(`the playbook has a step ${num}: ${m !== null}`).toBe(`the playbook has a step ${num}: true`)
  if (!m) return ''
  const rest = t.slice(m.index), end = rest.slice(m[0].length).search(/^## /m)
  return end < 0 ? rest : rest.slice(0, m[0].length + end)
}

// ---------- behaviours 1 to 12: the worktree for new work beside an unfinished run of an earlier session ----------

test('1: the part "What the user typed" makes the worktree with the session\'s own worktree tool by a new name (EnterWorktree), under .claude/worktrees/ on a new branch, and no longer holds the folder beside the repository', () => {
  const t = typed()
  holds('the part What the user typed', t, ['EnterWorktree', '.claude/worktrees/'])
  says('the part What the user typed', t, 'that the tool makes it by a new name', /new name/i)
  says('the part What the user typed', t, 'that it is on a new branch', /new branch/i)
  says('the part What the user typed', t, 'that the session is moved into it', /mov(es|e) the session/i)
  lacks('the part What the user typed', t, ['<this folder>-worktrees/', 'in a folder outside the repository', 'new worktree from `HEAD`'])
})

test('2: the part says that before the worktree is made the loop adds .claude/worktrees/ to .git/info/exclude when git check-ignore in the main folder does not report it, and nothing when it does', () => {
  const t = typed()
  holds('the part What the user typed', t, ['.git/info/exclude', 'git check-ignore', '.claude/worktrees/'])
  says('the part What the user typed', t, 'that the line is added before the worktree is made', /before[\s\S]{0,80}worktree/i)
})

test('4: the part says that the first message of the brainstorm tells the worktree\'s path, its branch, the commit it starts from and the branch that names it, the commits of the folder left that are not in it, and that the user can name another branch or commit', () => {
  const t = typed()
  says('the part What the user typed', t, 'the first message of the brainstorm', /first message/i)
  says('the part What the user typed', t, 'the worktree\'s path', /path/i)
  says('the part What the user typed', t, 'the commit it starts from', /start(s|ed)? from/i)
  says('the part What the user typed', t, 'the commits that are not in it', /commits? [\s\S]{0,200}not in/i)
  says('the part What the user typed', t, 'that the user can name another branch or commit', /(another|other) branch or (a )?commit|a branch or a commit/i)
})

test('5: the part says that, when the user names no base, the worktree stays as the tool made it and the brainstorm goes on', () => {
  const t = typed()
  says('the part What the user typed', t, 'that with no base named the worktree stays', /(no base|names none|no word|does not name|names no)[\s\S]{0,200}(stays|keep|as it is)|(stays|keep|as it is)[\s\S]{0,200}(no base|names none|no word|does not name|names no)/i)
})

test('6: the part says that a named base is taken before start by git merge --ff-only, else by a new worktree from git worktree add under .claude/worktrees/ entered by its path; a base after /hstack:build is taken with no question; taking a base changes nothing of the product', () => {
  const t = typed()
  holds('the part What the user typed', t, ['merge --ff-only', 'worktree add', '/hstack:build'])
  says('the part What the user typed', t, 'that it is taken before `start`', /before `?(\$H )?start`?/)
  says('the part What the user typed', t, 'that a base after /hstack:build is taken with no question', /no question/i)
  says('the part What the user typed', t, 'that taking a base changes nothing of the product', /nothing of the product/i)
})

test('7: the part says that the loop never uses git reset to bring the worktree to a base', () => {
  says('the part What the user typed', typed(), 'never git reset', /never[\s\S]{0,200}git reset|`git reset` is never|no `git reset`/i)
})

test('8: the part says that when the tool is missing or fails, or the base does not exist or cannot be reached, the loop removes every worktree and branch it made, starts nothing, says why, and still tells the user to open a session in a new worktree', () => {
  const t = typed()
  says('the part What the user typed', t, 'that the base the user named may not exist or not be reached', /base[\s\S]{0,200}(does not exist|doesn't exist|cannot be)|(does not exist|doesn't exist|cannot be)[\s\S]{0,200}base/i)
  says('the part What the user typed', t, 'that every worktree and branch it made is removed', /remov[\s\S]{0,200}every worktree|every worktree[\s\S]{0,200}remov/i)
  says('the part What the user typed', t, 'that it starts nothing', /start(s)? nothing/i)
  holds('the part What the user typed', t, ['open a session in a new worktree'])
})

test('9: the Git rule\'s exception names the worktree the session\'s worktree tool makes under .claude/worktrees/ and the one git worktree add makes there for a named base, and no longer holds "makes beside the repository"', () => {
  const t = gitRule()
  holds('the Git rule', t, ['.claude/worktrees/', 'git worktree add'])
  says('the Git rule', t, 'the session\'s worktree tool', /worktree tool/i)
  lacks('the Git rule', t, ['makes beside the repository'])
})

test('10: the paragraph on a run made in a new worktree: the question names what the run\'s branch started from and the branch of the folder left, asks which branch to merge into or whether to leave it, and the loop merges only into the branch the user answers', () => {
  const t = newWorktree()
  says('the paragraph', t, 'what the run\'s branch started from', /start(ed|s) from/i)
  says('the paragraph', t, 'which branch it is merged into', /which branch/i)
  says('the paragraph', t, 'that it may be left as it is', /\bleft\b/i)
  says('the paragraph', t, 'that the loop merges only into the branch the user answers', /only into/i)
})

test('11: the paragraph still makes the merge only on the user\'s answer in a later turn, aborts a conflict and names the files, keeps the worktree; the session first leaves it with its worktree tool (ExitWorktree), keeping it; the merge is made where the answered branch is checked out', () => {
  const t = newWorktree()
  holds('the paragraph', t, ['later turn', 'merge --abort', 'which files conflict', 'The worktree is not removed', 'ExitWorktree'])
  says('the paragraph', t, 'that the session keeps the worktree when it leaves it', /\bkeep/i)
  says('the paragraph', t, 'that the merge is made where the branch is checked out', /checked out/i)
})

test('12: the part says that, in a project whose records home holds .hstack/repo, new work beside an earlier session\'s unfinished run makes no worktree and starts nothing, and the run is taken up with /hstack:build and its spec\'s name', () => {
  const t = typed()
  holds('the part What the user typed', t, ['.hstack/repo'])
  says('the part What the user typed', t, 'that a project whose code is in a repository of its own has no worktree for new work yet', /repository of its own[\s\S]{0,200}no worktree|no worktree[\s\S]{0,200}repository of its own/i)
})

// ---------- behaviour 31: the Git rule on moves ----------

test('31: the Git rule says that from the approval until the run is done the session does not move into another worktree, leave the one it is in, or switch branch; a request to do so is answered as a fact, not as a choice; the one switch is back to the run\'s branch when the stop hook asks', () => {
  const t = gitRule()
  says('the Git rule', t, 'from the approval', /approv/i)
  says('the Git rule', t, 'that the session does not move into another worktree', /another worktree/i)
  says('the Git rule', t, 'that it does not leave the one it is in', /leave/i)
  says('the Git rule', t, 'that it does not switch branch', /switch/i)
  holds('the Git rule', t, ['as a fact, not as a choice', "the run's branch"])
  says('the Git rule', t, 'that the stop hook asks for the switch back', /stop hook/i)
})

// ---------- behaviour 32: four hooks ----------

const paragraphs = (file: string) => raw(file).split(/\n\s*\n/).map((p) => flat(p.trim()))
function status(): string {
  const found = paragraphs('README.md').filter((p) => p.startsWith('**Status:'))
  expect(`README.md: paragraphs that start with "**Status:": ${found.length}`).toBe('README.md: paragraphs that start with "**Status:": 1')
  return found[0] ?? ''
}

test('32: the README\'s status paragraph holds "Five hooks" (spec 11) and not "Three hooks"; the paragraph on bun not on the PATH holds "five hooks" (spec 11) and not "three hooks"', () => {
  const s = status()
  holds('the status paragraph', s, ['Five hooks'])
  lacks('the status paragraph', s, ['Three hooks'])
  const found = paragraphs('README.md').filter((p) => p.includes('`bun` is not on the `PATH`'))
  expect(found.length).toBe(1)
  holds('the paragraph on bun and the PATH', found[0] ?? '', ['five hooks'])
  lacks('the paragraph on bun and the PATH', found[0] ?? '', ['three hooks'])
})

test('32: the row of hooks/ in the README\'s table of paths names the PreToolUse hook beside the three others', () => {
  const row = raw('README.md').split('\n').find((l) => l.startsWith('| `hooks/` |')) ?? ''
  expect(row).not.toBe('')
  holds('the row of hooks/', row, ['PreToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop'])
})

test('32: CLAUDE.md\'s part on the hooks names the fourth hook: the session\'s worktree tool is refused while a run of this session is not finished', () => {
  const t = raw('CLAUDE.md'), i = t.indexOf('\n## Hooks of `hstack:build`\n')
  expect(i).toBeGreaterThanOrEqual(0)
  const rest = t.slice(i + 1), j = rest.indexOf('\n## ', 1)
  const sec = j < 0 ? rest : rest.slice(0, j)
  says("CLAUDE.md's part on the hooks", sec, 'the worktree tool', /worktree tool/i)
  says("CLAUDE.md's part on the hooks", sec, 'that it is refused', /refus/i)
  says("CLAUDE.md's part on the hooks", sec, 'while a run of this session is not finished', /not finished|unfinished/i)
})

// ---------- behaviour 37: a name found in another work tree ----------

test('37: the part "What the user typed" looks a name up among the lines of $H runs, moves the session into that work tree with its worktree tool by its path, else starts nothing and tells the user to open a session there; with this session\'s own run unfinished it moves nothing; a name found nowhere is a new request', () => {
  const t = typed()
  holds('the part What the user typed', t, ['$H runs'])
  says('the part What the user typed', t, 'that the session is moved there by its path', /by its path/i)
  says('the part What the user typed', t, 'that when it cannot be moved the user opens a session in that folder', /open a session in that (folder|work tree|worktree)/i)
  says('the part What the user typed', t, 'that in a session with its own unfinished run such a name moves nothing', /moves? nothing/i)
  says('the part What the user typed', t, 'that the session\'s own run goes on to its end first', /to its end first/i)
  holds('the part What the user typed', t, ['is a new request'])
})

// ---------- behaviours 39 to 42: the README's opening paragraph and quick start ----------

// the opening paragraph: the first paragraph after the line in bold under the title
function opening(): string {
  const ps = raw('README.md').split(/\n\s*\n/).map((p) => p.trim())
  const i = ps.findIndex((p) => /^\*\*[^\n]*\*\*$/.test(p))
  expect(`README.md has a line in bold under the title: ${i >= 0}`).toBe('README.md has a line in bold under the title: true')
  return flat(ps[i + 1] ?? '')
}
function quickStart(): string {
  const t = raw('README.md'), i = t.indexOf('\n## Quick start\n')
  expect(i).toBeGreaterThanOrEqual(0)
  const rest = t.slice(i + 1), j = rest.indexOf('\n## ', 1)
  return j < 0 ? rest : rest.slice(0, j)
}

test('39: the README\'s opening paragraph no longer starts with "You ask for a feature." and says the loop starts when the reader types /hstack:build followed by what they want built', () => {
  const p = opening()
  expect(`the opening paragraph starts with "You ask for a feature.": ${p.startsWith('You ask for a feature.')}`).toBe('the opening paragraph starts with "You ask for a feature.": false')
  holds('the opening paragraph', p, ['/hstack:build'])
  says('the opening paragraph', p, 'that the reader types the command', /\btyp(e|es|ing)\b/i)
})

test('40: the quick start no longer holds "ask for what you want in plain words", and the code block after the install commands holds the line /hstack:build add a CSV export to the invoices page', () => {
  const q = quickStart()
  lacks('the quick start', q, ['ask for what you want in plain words'])
  const blocks = [...q.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1])
  const install = blocks.findIndex((b) => b.includes('/plugin install'))
  expect(`the quick start has a code block with the install commands: ${install >= 0}`).toBe('the quick start has a code block with the install commands: true')
  const next = blocks[install + 1] ?? ''
  const lines = next.split('\n').map((l) => l.trim())
  expect(`the code block after the install commands holds the line: ${lines.includes('/hstack:build add a CSV export to the invoices page')} (${next.trim()})`).toBe(`the code block after the install commands holds the line: true (${next.trim()})`)
})

test('41: the quick start says that a request made without /hstack:build is done directly, without the loop', () => {
  const q = quickStart()
  holds('the quick start', q, ['without the loop'])
  says('the quick start', q, 'that such a request is done directly', /directly/i)
})

test('42 (holds at the base, and must stay): the four numbered steps of the README\'s quick start are as they were', () => {
  const steps = quickStart().split('\n').filter((l) => /^\d+\. /.test(l))
  expect(steps).toEqual([
    '1. The agent answers with what it understood and what it found in your code. You talk until it is clear.',
    '2. It writes a spec and gives you its path. You approve it, say what to change, or have it grilled.',
    '3. After your approval the loop runs to the end without you.',
    '4. Its last reply says what was built, what the tests show, and what needs your ruling.',
  ])
})

// ---------- behaviour 43: the version ----------

test('43: .claude-plugin/plugin.json holds "version": "0.4.7", and the README\'s status paragraph starts with "**Status: v0.4.7.**" and still holds the words brainstorm and grilled', () => {
  expect(raw('.claude-plugin/plugin.json')).toContain('"version": "0.4.7"')
  expect((JSON.parse(raw('.claude-plugin/plugin.json')) as { version?: string }).version).toBe('0.4.7')
  const s = status()
  expect(`the status paragraph starts with "**Status: v0.4.7.**": ${s.startsWith('**Status: v0.4.7.**')}`).toBe('the status paragraph starts with "**Status: v0.4.7.**": true')
  for (const w of ['brainstorm', 'grilled']) expect(`the status paragraph holds the word "${w}": ${new RegExp(`\\b${w}\\b`).test(s)}`).toBe(`the status paragraph holds the word "${w}": true`)
})

// ---------- behaviours 44 to 50: the time ----------

test('44: the rule "Time." no longer holds the start-time rules; it says that $H elapsed and $H times measure the run for the last reply, and that no step is skipped, cut short or made narrower because of the time', () => {
  const r = rule('Time')
  lacks('the rule Time', r, ['Start-time rules', 'elapsed < 150', 'elapsed < 180', '210'])
  holds('the rule Time', r, ['$H elapsed', '$H times', 'last reply', 'cut short', 'narrower'])
  says('the rule Time', r, 'that no step is skipped', /skipped/i)
})

test('45: the headings of steps 2, 3, 7 and 8 have no limit in minutes; "What goes against the record" no longer holds "at most 15 minutes"', () => {
  const lines = raw(PLAYBOOK).split('\n')
  for (const h of ['## 2. Setup: capabilities', '## 3. Oracle', '## 7. Explore', '## 8. Mutate']) expect(`the playbook has the heading line "${h}": ${lines.includes(h)}`).toBe(`the playbook has the heading line "${h}": true`)
  for (const num of [2, 3, 7, 8]) { const l = lines.find((x) => x.startsWith(`## ${num}. `)) ?? ''; expect(`heading of step ${num} "${l}" names minutes: ${/minute/.test(l)}`).toBe(`heading of step ${num} "${l}" names minutes: false`) }
  const item = lines.find((l) => l.includes('**What goes against the record**')) ?? ''
  expect(item).not.toBe('')
  lacks('the item What goes against the record', item, ['at most 15 minutes'])
})

test('46: the playbook gives no agent a deadline (the rule "Agents." and steps 3, 6, 7 and 8), and none of the four agents\' files holds "deadline" or "date +%s"', () => {
  lacks('the rule Agents', rule('Agents'), ['deadline'])
  for (const num of [3, 6, 7, 8]) lacks(`step ${num} of the playbook`, step(num), ['deadline'])
  for (const a of ['oracle', 'reviewer', 'explorer', 'mutator']) lacks(`agents/${a}.md`, raw(`agents/${a}.md`), ['deadline', 'date +%s'])
})

test('47: each agent\'s file says when its work is done: the oracle\'s, every behaviour has one or more tests; the reviewer\'s, every file of the change read; the explorer\'s, every behaviour and earlier step has a verdict; the mutator\'s, every behaviour had a fault planted or none to plant', () => {
  const o = raw('agents/oracle.md'), r = raw('agents/reviewer.md'), e = raw('agents/explorer.md'), m = raw('agents/mutator.md')
  for (const [a, t] of [['oracle', o], ['reviewer', r], ['explorer', e], ['mutator', m]] as const) says(`agents/${a}.md`, t, 'when its work is done', /\bdone\b/i)
  says('agents/oracle.md', o, 'every behaviour of the spec has one or more tests', /every behaviour[\s\S]{0,200}one or more tests/i)
  says('agents/reviewer.md', r, 'that it has read every file of the change', /every (changed )?file( of the change)?/i)
  says('agents/explorer.md', e, 'every behaviour and every earlier step has a verdict', /every behaviour[\s\S]{0,200}every earlier step[\s\S]{0,200}verdict/i)
  says('agents/mutator.md', m, 'every behaviour had a fault planted, or none to plant', /every behaviour[\s\S]{0,200}fault[\s\S]{0,200}(none|no fault|nothing) to plant/i)
})

test('48: the playbook and the four agents\' files say that one item of work is tried at most three ways, then written down as not resolved, with the ways tried', () => {
  for (const f of [PLAYBOOK, 'agents/oracle.md', 'agents/reviewer.md', 'agents/explorer.md', 'agents/mutator.md']) {
    says(f, raw(f), 'at most three ways', /at most three ways/i)
    says(f, raw(f), 'not resolved', /not resolved/i)
  }
  says(PLAYBOOK, raw(PLAYBOOK), 'that such an item goes under "Needs your ruling"', /not resolved[\s\S]*Needs your ruling|Needs your ruling[\s\S]*not resolved/)
})

test('49: step 6 runs round 2 whenever round 1 led to a fix, steps 7 and 8 always start, and the playbook no longer holds the time rules of those steps', () => {
  lacks('the playbook', raw(PLAYBOOK), ['one round only past 180', 'not past 180 minutes', 'start only if elapsed', 'skipped: time'])
  holds('step 6', step(6), ['review-2.md'])
})

test('50: step 9 runs every suite whole on the last commit of code, and no longer holds "the widest suite the time allows"', () => {
  const t = step(9)
  lacks('step 9', t, ['the widest suite the time allows'])
  says('step 9', t, 'every suite whole', /every suite[\s\S]{0,200}whole/i)
  holds('step 9', t, ['last commit of code'])
})

// ---------- behaviours 51 to 54: the step 4 skill is named implement ----------

const sha = (s: string) => new Bun.CryptoHasher('sha256').update(s).digest('hex')
// the texts of skills/build-implement/ at the base commit (SKILL.md without its name line and its first heading)
const BASE: Record<string, string> = {
  'LICENSE-design-1': 'c023919f187c1e814d5cfbb7effc35bc291b126ebf4b2ce90dcd554f502d5f8a',
  'LICENSE-design-2': 'b2b9c69b4bf0f6c22b48c6b8e38c0e190760125cc0fa729a82d7e6cf8e45b128',
  'LICENSE-design-3': '69ef8c984f70a8a65e7f4ad280e6a30408491e121aa9f85788d419fbb8c71d76',
  'LICENSE-design-4': '716e1af48aa0a342c6b56a909dcd01b73226cd690c586b71dec8bfe526707640',
  'LICENSE-tdd': '5e1f81835e0c7b50613a45e705c39136c61197d3d1083da50000c27608d8d526',
  'SKILL.md': 'd8b0594c465fe8a3c974e0a07abfae2b9fa73fb752947ee6d37af1b5bf41ec50', // spec 11 changed item 6's sentence on the time
  'deep-modules.md': '6aaf58cf1325f533016dcc2719781205161c5eec5b8d3ebbfec127a1e5f7994f',
  'design-note.md': '3aab388fbd464a7622dfeb0b82038fcfc6fcda23836bd1e8763502ff8935d7a6',
  'design-review.md': '392ad4c12b498bbdbd704e122dedce80a663468e8bf106166de7b6229b3375ec',
  'design-rules.md': 'f3c5f3c02b2cb37332cf865a9213510117347aedaf2ce2651b636b4b965b131f',
  'tdd.md': '1b664050034afc39e7fe6d4cd88162c78d8fa49d8da2aba6ca48fdfeee812b53', // spec 11 changed its sentence on the time
  'writing-good-tests.md': 'f99bbfc43ea86bff776256f03e27316c7034119e03f981e5c7f220f022cb0b13',
}
const skillBody = (t: string) => { const ls = t.split('\n'); const i = ls.findIndex((l) => l.startsWith('# ')); return ls.filter((l, j) => !/^name: /.test(l) && j !== i).join('\n') }

test('51: skills/implement/ holds the twelve files that skills/build-implement/ held, with their texts, and skills/build-implement/ is gone', () => {
  for (const [f, h] of Object.entries(BASE)) {
    const p = join(ROOT, 'skills/implement', f)
    expect(`skills/implement/${f} exists: ${existsSync(p)}`).toBe(`skills/implement/${f} exists: true`)
    if (!existsSync(p)) continue
    const t = readFileSync(p, 'utf8')
    expect(`skills/implement/${f} has the text it had: ${sha(f === 'SKILL.md' ? skillBody(t) : t) === h}`).toBe(`skills/implement/${f} has the text it had: true`)
  }
  expect(`skills/build-implement exists: ${existsSync(join(ROOT, 'skills/build-implement'))}`).toBe('skills/build-implement exists: false')
})

test('52: the header of skills/implement/SKILL.md holds name: implement, and its first heading names implement and no longer build-implement', () => {
  const t = raw('skills/implement/SKILL.md')
  const m = /^---\n([\s\S]*?)\n---\n/.exec(t)
  expect(m).not.toBeNull()
  expect(m?.[1] ?? '').toMatch(/^name: implement\s*$/m)
  const h = t.split('\n').find((l) => l.startsWith('# ')) ?? ''
  expect(`the first heading "${h}" names implement: ${/\bimplement\b/.test(h)}`).toBe(`the first heading "${h}" names implement: true`)
  lacks('the first heading', h, ['build-implement'])
})

const files = (dir: string): string[] => {
  const p = join(ROOT, dir)
  if (!existsSync(p)) return []
  return readdirSync(p).flatMap((f) => { const q = join(dir, f); return statSync(join(ROOT, q)).isDirectory() ? files(q) : [q] })
}

test('53: step 4 invokes hstack:implement and step 6 gives the reviewer the four design files of skills/implement/; no file under skills/, agents/, scripts/ or hooks/, nor README.md, nor CLAUDE.md, holds build-implement', () => {
  holds('step 4', step(4), ['hstack:implement'])
  const s6 = step(6)
  holds('step 6', s6, ['skills/implement/', 'design-rules.md', 'design-note.md', 'deep-modules.md', 'design-review.md'])
  const all = [...files('skills'), ...files('agents'), ...files('scripts'), ...files('hooks'), 'README.md', 'CLAUDE.md']
  const bad = all.filter((f) => readFileSync(join(ROOT, f)).toString('latin1').includes('build-implement'))
  expect(bad).toEqual([])
})

test('54: the README\'s skills table has a row implement and none build-implement; the row of skills/ names implement; the status paragraph names skills/implement/design-rules.md; the section License names the five licence files by skills/implement/', () => {
  const lines = raw('README.md').split('\n')
  expect(`a row "| \`implement\` |": ${lines.some((l) => l.startsWith('| `implement` |'))}`).toBe('a row "| `implement` |": true')
  expect(`a row "| \`build-implement\` |": ${lines.some((l) => l.startsWith('| `build-implement` |'))}`).toBe('a row "| `build-implement` |": false')
  const row = lines.find((l) => l.startsWith('| `skills/` |')) ?? ''
  holds('the row of skills/', row, ['`implement`'])
  holds('the status paragraph', status(), ['skills/implement/design-rules.md'])
  const t = raw('README.md'), i = t.indexOf('\n## License\n')
  expect(i).toBeGreaterThanOrEqual(0)
  const lic = t.slice(i)
  holds('the section License', lic, ['skills/implement/LICENSE-tdd', 'skills/implement/LICENSE-design-1', 'skills/implement/LICENSE-design-2', 'skills/implement/LICENSE-design-3', 'skills/implement/LICENSE-design-4'])
})
