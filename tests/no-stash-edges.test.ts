// The builder's tests of spec 5 ("no stash in a run"): the edges the builder decided, each named by its number in
// docs/specs/2026-11-22-no-stash-in-a-run.decisions.md. The acceptance tests of the behaviours are in
// tests/no-stash-script.test.ts and tests/no-stash-texts.test.ts.
// Run: bun test tests/no-stash-edges.test.ts
// Each test makes its own throwaway git repository and its own state folder in a temp folder, and stashes only there:
// `stash` below refuses any other place. No test runs a stash command in this repository or in a worktree of it.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const ROOT = join(import.meta.dir, '..')
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(ROOT, 'scripts/hstack.ts') // HSTACK_SCRIPT: another copy of the script, as in tests/hstack.test.ts
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-no-stash-edges-')))
afterAll(() => rmSync(T, { recursive: true, force: true })) // the tests leave nothing behind

const BASE_ENV: Record<string, string> = { ...(process.env as Record<string, string>), HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: 'junk', GITHUB_TOKEN: 'junk' }
// a caller's value would send git or the script to another repository
for (const k of ['CLAUDE_PROJECT_DIR', 'HSTACK_FEEDBACK_REPO', 'HSTACK_STATE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete BASE_ENV[k]

// one world per test: a folder with a repository `r` and a state folder
type World = { dir: string; r: string; env: Record<string, string> }
type Ran = { code: number; out: string; err: string }
let worlds = 0
function sh(w: World, cmd: string[], cwd = w.r, o: { stdin?: string; env?: Record<string, string> } = {}): Ran {
  const p = Bun.spawnSync(cmd, { cwd, env: { ...w.env, ...(o.env ?? {}) }, stdin: o.stdin === undefined ? 'ignore' : Buffer.from(o.stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: p.exitCode, out: p.stdout.toString().replace(/\n+$/, ''), err: p.stderr.toString() }
}
const git = (w: World, args: string[], cwd = w.r) => { const p = sh(w, ['git', ...args], cwd); if (p.code !== 0) throw new Error(`git ${args.join(' ')} in ${cwd}: ${p.err}`); return p.out }
const h = (w: World, args: string[], cwd = w.r) => sh(w, [process.execPath, SCRIPT, ...args], cwd)
function world(): World {
  const dir = `${T}/w${++worlds}`, w: World = { dir, r: `${dir}/r`, env: { ...BASE_ENV, HSTACK_STATE: `${dir}/state` } }
  mkdirSync(`${w.r}/src`, { recursive: true }); git(w, ['init', '-q']); git(w, ['config', 'user.email', 't@t']); git(w, ['config', 'user.name', 't']); git(w, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(`${w.r}/src/a.txt`, 'x = 1\n'); git(w, ['add', '-A']); git(w, ['commit', '-qm', 'base'])
  return w
}

// every stash command of this file goes through here: only in a repository under this file's temp folder
function stash(w: World, args: string[]) {
  const top = realpathSync(git(w, ['rev-parse', '--show-toplevel']))
  if (!T.startsWith(realpathSync(tmpdir())) || !top.startsWith(`${T}/`) || top !== realpathSync(w.r)) throw new Error(`no stash outside the throwaway repositories: ${top}`)
  return git(w, ['stash', ...args])
}
// a new entry on the stash: a change of a tracked file, stashed. Its commit is returned.
let changes = 0
function push(w: World, label?: string): string {
  writeFileSync(`${w.r}/src/a.txt`, `x = ${++changes + 1}\n`)
  stash(w, label === undefined ? ['push', '-q'] : ['push', '-q', '-m', label])
  return git(w, ['rev-parse', 'refs/stash'])
}
const count = (w: World) => { const o = stash(w, ['list']); return o === '' ? 0 : o.split('\n').length }
const started = (w: World) => expect(`start exits ${h(w, ['start']).code}`).toBe('start exits 0')
const stashLines = (p: Ran) => `${p.out}\n${p.err}`.split('\n').filter((l) => l.startsWith('STASH'))

// a spec shown and approved: the run is the user's from here on
let specs = 0
function shown(w: World) {
  const f = `${w.dir}/spec-${++specs}.md`, S = h(w, ['dir']).out
  writeFileSync(f, 'what the feature does\n')
  expect(h(w, ['spec', f]).code).toBe(0)
  for (let i = 0; i < 3 && !existsSync(`${S}/spec-shown`); i++) sh(w, [process.execPath, SCRIPT, 'hook-stop'], w.r, { stdin: '{"hook_event_name":"Stop","stop_hook_active":false}', env: { CLAUDE_PROJECT_DIR: w.r } })
}
// the rest of a run up to where `done` can end it: the spec approved, a commit, every step recorded but `leave`
function finishable(w: World, leave: string[] = []) {
  shown(w)
  expect(h(w, ['approve']).out).toBe('approved')
  writeFileSync(`${w.r}/src/b.txt`, 'the feature\n'); git(w, ['add', '-A']); git(w, ['commit', '-qm', 'feature'])
  expect(h(w, ['records-check', '--none', 'a test repository with no records']).code).toBe(0)
  for (const p of h(w, ['missing']).out.split(' ').filter((x) => x !== '' && !leave.includes(x))) h(w, ['phase', p])
}

// ---------- the script ----------

test('E2: a STASH line ends with the entry\'s commit in brackets, which names a commit git still has after the entry is gone', () => {
  const w = world()
  const held = push(w, 'held at start')
  started(w)
  stash(w, ['drop', '-q'])
  const came = push(w, 'came after start')
  expect(held).toMatch(/^[0-9a-f]{40}$/); expect(came).not.toBe(held)
  const branch = git(w, ['branch', '--show-current']) // git names the first branch as the machine is set up
  expect(stashLines(h(w, ['gate'])).sort()).toEqual([`STASH ADDED: On ${branch}: came after start (${came})`, `STASH GONE: On ${branch}: held at start (${held})`])
  expect(git(w, ['cat-file', '-t', held])).toBe('commit') // the entry is gone from the stash; its commit can still be looked at
})

test('E3: a run whose start recorded no stash: gate says it was not compared and prints no STASH line, and done ends the run with none', () => {
  const w = world()
  push(w, 'in the stash all along')
  started(w)
  rmSync(`${h(w, ['dir']).out}/stash-base`) // as a run that an earlier version of the script started
  finishable(w)
  const g = h(w, ['gate'])
  expect(g.out.split('\n')).toContain('stash: not recorded at start, not compared')
  expect(stashLines(g)).toEqual([])
  expect(g.code).toBe(0)
  const d = h(w, ['done'])
  expect(stashLines(d)).toEqual([])
  expect(d.out.split('\n')).toEqual([`done at ${git(w, ['rev-parse', 'HEAD'])}`])
  expect(d.code).toBe(0)
})

test('E7: a stash that git cannot read is not compared: gate says so and calls no entry gone, and exits as it would', () => {
  const w = world()
  push(w, 'held at start')
  started(w)
  writeFileSync(`${w.r}/.git/refs/stash`, `${'1'.repeat(40)}\n`) // the stash now names an object the repository does not have
  expect(() => stash(w, ['list'])).toThrow() // git itself cannot list it
  const g = h(w, ['gate'])
  expect(g.out.split('\n')).toContain('stash: could not be read, not compared')
  expect(stashLines(g)).toEqual([])
  expect(g.code).toBe(0)
})

test('E7: a stash that git cannot read at start is not recorded: an entry that was there all along is not called added later', () => {
  const w = world()
  const held = push(w, 'held before the run')
  writeFileSync(`${w.r}/.git/refs/stash`, `${'1'.repeat(40)}\n`)
  started(w)
  writeFileSync(`${w.r}/.git/refs/stash`, `${held}\n`) // readable again, with the entry it always had
  expect(count(w)).toBe(1)
  const g = h(w, ['gate'])
  expect(stashLines(g)).toEqual([])
  expect(g.out.split('\n')).toContain('stash: not recorded at start, not compared')
})

test('E1: an entry is known by its commit: of two entries with the same message, the one added after start gets its line, and the one held at start gets none', () => {
  const w = world()
  const held = push(w) // no label: git names it by the branch and the commit it was made on
  started(w)
  const came = push(w) // made on the same commit: the same message, another entry
  const messages = stash(w, ['list', '--format=%gs']).split('\n')
  expect(messages.length).toBe(2); expect(messages[0]).toBe(messages[1]); expect(came).not.toBe(held)
  expect(stashLines(h(w, ['gate']))).toEqual([`STASH ADDED: ${messages[0]} (${came})`])
})

test('E4: a start while a spec waits keeps the run and its record of the stash: an entry added before that second start still gets its line', () => {
  const w = world(); started(w)
  shown(w) // the spec waits for the user
  const came = push(w, 'while the spec waits')
  started(w) // that run stays
  expect(stashLines(h(w, ['gate']))).toEqual([`STASH ADDED: On ${git(w, ['branch', '--show-current'])}: while the spec waits (${came})`])
})

test('E5: a done that refuses prints no STASH line; the done that then ends the run prints it', () => {
  const w = world(); started(w)
  finishable(w, ['records']) // one step is not recorded yet
  const came = push(w, 'left behind')
  const refused = h(w, ['done'])
  expect(refused.code).not.toBe(0)
  expect(stashLines(refused)).toEqual([])
  expect(h(w, ['phase', 'records']).code).toBe(0)
  const d = h(w, ['done'])
  expect(stashLines(d)).toEqual([`STASH ADDED: On ${git(w, ['branch', '--show-current'])}: left behind (${came})`])
  expect(d.code).toBe(0)
})

test('E8: a label with letters outside ASCII stands in the line as it was written', () => {
  const w = world(); started(w)
  const came = push(w, 'cất tạm đồ của tôi')
  expect(stashLines(h(w, ['gate']))).toEqual([`STASH ADDED: On ${git(w, ['branch', '--show-current'])}: cất tạm đồ của tôi (${came})`])
})

test('E20: gate in a repository where no run was started says nothing about the stash', () => {
  const w = world()
  push(w, 'in the stash, and no run')
  const g = h(w, ['gate'])
  expect(`${g.out}\n${g.err}`.split('\n').filter((l) => /^stash/i.test(l))).toEqual([])
  expect(g.code).toBe(0)
})

test('E21: a line of the record that is no entry is not called an entry that is gone', () => {
  const w = world()
  const held = push(w, 'held at start')
  started(w)
  const record = `${h(w, ['dir']).out}/stash-base`
  expect(readFileSync(record, 'utf8')).toBe(`${held} On ${git(w, ['branch', '--show-current'])}: held at start\n`)
  writeFileSync(record, `\n\nnot a commit line\n${readFileSync(record, 'utf8')}`) // a record somebody edited by hand
  expect(stashLines(h(w, ['gate']))).toEqual([])
})

test('E22: gate prints no empty line for the stash: not when it is as at start, not before a STASH line', () => {
  const w = world(); started(w)
  // the output as it is written, its last line break too
  const gate = () => Bun.spawnSync([process.execPath, SCRIPT, 'gate'], { cwd: w.r, env: w.env, stdout: 'pipe', stderr: 'pipe' }).stdout.toString()
  const same = gate()
  expect(same.endsWith('\n')).toBe(true); expect(same.slice(0, -1).split('\n')).not.toContain('')
  push(w, 'came after start')
  const changed = gate()
  expect(changed).toContain('STASH ADDED: '); expect(changed.slice(0, -1).split('\n')).not.toContain('')
})

// ---------- the texts ----------
// A phrase is looked for word for word; a line break inside a phrase counts as a space.

const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
// the lines of a text from the one line that starts with `from` to the next line that matches `until` (or the end)
function part(text: string, from: string, until: RegExp): string {
  const ls = text.split('\n'), starts = ls.map((l, i) => (l.startsWith(from) ? i : -1)).filter((i) => i >= 0)
  expect(`lines that start with "${from}": ${starts.length}`).toBe(`lines that start with "${from}": 1`)
  const rest = ls.slice(starts[0] + 1), end = rest.findIndex((l) => until.test(l))
  return [ls[starts[0]], ...(end < 0 ? rest : rest.slice(0, end))].join('\n')
}
const PLAYBOOK = 'skills/build/SKILL.md'
const WAY = "Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards."

test('E18: the added sentences stand directly after the sentence the spec names, in item 4 and in the item of tdd.md', () => {
  const item4 = flat(part(raw('skills/build-implement/SKILL.md'), '4. ', /^5\. /))
  expect(item4).toContain(`undo that one edit by hand (your code is not committed yet). ${WAY} Never \`git stash\` for this, in any form: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session. A change to what the product does after its test passes`)
  const tdd = flat(part(raw('skills/build-implement/tdd.md'), "- **A test that passes at once on this run's own code.**", /^(- \*\*|#)/))
  expect(tdd).toContain(`that would throw the step's work away. Never \`git stash\` either, in any form: the stash is one stack shared by every worktree of the repository. ${WAY} If no break of this run's code makes it fail`)
})

const STEP5_PARAGRAPH = 'A `STASH ADDED` or `STASH GONE` line says that the stash of the repository is not as `start` found it: an entry has been added, or an entry that was there is gone. The line does not say who did it: the stash is shared with the user and with every other session. It does not make the gate fail. Run no stash command to put it right: no pop, no apply, no drop. Step 10 lists each such line under "Needs your ruling", with what you know of it: whether this run made the change.'

test('E15: step 5 of the playbook holds the whole paragraph on a STASH line, word for word, before the sentence on gate.txt', () => {
  const step5 = part(raw(PLAYBOOK), '## 5. ', /^## /)
  expect(step5).toContain(`\n\n${STEP5_PARAGRAPH}\n\nSave the output to \`$S/gate.txt\`.`) // a paragraph of its own
})

test('E16: the item The log of step 10 says that each STASH line of the last gate stands under Needs your ruling, as printed, with whether this run made the change', () => {
  const step10 = part(raw(PLAYBOOK), '## 10. ', /^## /)
  const log = flat(part(step10, '7. **The log.**', /^\d+\. /))
  expect(log).toContain('and "Needs your ruling", with each `STASH ADDED` or `STASH GONE` line of the last `gate` among it, as it was printed, and whether this run made the change. Do not repeat the decisions.')
})

test('E17: the item of step 10 with $H done says what to do with a STASH line that done prints and the log entry does not hold', () => {
  const step10 = part(raw(PLAYBOOK), '## 10. ', /^## /)
  const item = flat(part(step10, '11. `$H phase records`', /^\d+\. /))
  expect(item).toContain('then `$H done` (it refuses while a step is unrecorded or a change in the code repository is uncommitted). A `STASH ADDED` or `STASH GONE` line that `done` prints and the log entry does not hold: append it to the entry\'s "Needs your ruling", commit the log by path, and run `$H done` again.')
})
