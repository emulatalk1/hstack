// Acceptance tests of spec 5 ("no stash in a run: step 4 names the way without one, and the gate reports a changed
// stash"), the behaviours of scripts/hstack.ts (7 to 11), written from the spec alone.
// Run: bun test tests/no-stash-script.test.ts
// Each test names the behaviour of the spec it checks by its number. Each test makes its own throwaway git repository
// and its own state folder in a temp folder, and stashes only there: `stash` below refuses any other place.
// No test runs a stash command in this repository or in a worktree of it.
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts') // HSTACK_SCRIPT: another copy of the script, as in tests/hstack.test.ts
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-no-stash-')))
afterAll(() => rmSync(T, { recursive: true, force: true })) // the tests leave nothing behind

const BASE_ENV: Record<string, string> = { ...(process.env as Record<string, string>), HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: 'junk', GITHUB_TOKEN: 'junk' }
// a caller's value would send git or the script to another repository
for (const k of ['CLAUDE_PROJECT_DIR', 'HSTACK_FEEDBACK_REPO', 'HSTACK_STATE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete BASE_ENV[k]

// one world per test: a folder with a repository `r` and a state folder
type World = { dir: string; r: string; env: Record<string, string> }
let worlds = 0
function sh(w: World, cmd: string[], cwd: string, o: { stdin?: string; env?: Record<string, string> } = {}) {
  const p = Bun.spawnSync(cmd, { cwd, env: { ...w.env, ...(o.env ?? {}) }, stdin: o.stdin === undefined ? 'ignore' : Buffer.from(o.stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: p.exitCode, out: p.stdout.toString().replace(/\n+$/, ''), err: p.stderr.toString() }
}
const git = (w: World, args: string[], cwd = w.r) => { const p = sh(w, ['git', ...args], cwd); if (p.code !== 0) throw new Error(`git ${args.join(' ')} in ${cwd}: ${p.err}`); return p.out }
const h = (w: World, args: string[], cwd = w.r) => sh(w, [process.execPath, SCRIPT, ...args], cwd)
const repoAt = (w: World, dir: string) => {
  mkdirSync(`${dir}/src`, { recursive: true }); git(w, ['init', '-q'], dir); git(w, ['config', 'user.email', 't@t'], dir); git(w, ['config', 'user.name', 't'], dir); git(w, ['config', 'commit.gpgsign', 'false'], dir)
  writeFileSync(`${dir}/src/a.txt`, 'x = 1\n'); git(w, ['add', '-A'], dir); git(w, ['commit', '-qm', 'base'], dir)
}
function world(): World {
  const dir = `${T}/w${++worlds}`, w: World = { dir, r: `${dir}/r`, env: { ...BASE_ENV, HSTACK_STATE: `${dir}/state` } }
  repoAt(w, w.r)
  return w
}

// every stash command of this file goes through here: only in a repository under this file's temp folder
function stash(w: World, args: string[], cwd = w.r) {
  const top = realpathSync(git(w, ['rev-parse', '--show-toplevel'], cwd))
  if (!T.startsWith(realpathSync(tmpdir())) || !top.startsWith(`${T}/`) || top !== realpathSync(cwd)) throw new Error(`no stash outside the throwaway repositories: ${top}`)
  return git(w, ['stash', ...args], cwd)
}
// a new entry on the stash: a change of a tracked file, stashed, which leaves the tree clean. A label, or none.
let changes = 0
function push(w: World, label?: string, cwd = w.r) {
  const before = entries(w, cwd).length
  writeFileSync(`${cwd}/src/a.txt`, `x = ${++changes + 1}\n`)
  stash(w, label === undefined ? ['push', '-q'] : ['push', '-q', '-m', label], cwd)
  expect(entries(w, cwd).length).toBe(before + 1)
  expect(git(w, ['status', '--porcelain', '-uno'], cwd)).toBe('') // an untracked file is not stashed and stays
}
// what `git stash list` shows, one entry per line, newest first: "stash@{0}: <message>"
const entries = (w: World, cwd = w.r) => { const o = stash(w, ['list'], cwd); return o === '' ? [] : o.split('\n') }
// an entry's message, as `git stash list` shows it: the text after "stash@{n}: "
const message = (w: World, n: number, cwd = w.r) => { const m = /^stash@\{\d+\}: (.*)$/.exec(entries(w, cwd)[n] ?? ''); if (!m) throw new Error(`no stash entry ${n}`); return m[1] }

const started = (w: World, cwd = w.r) => { const p = h(w, ['start'], cwd); expect(`start exits ${p.code}`).toBe('start exits 0'); return p }
const all = (p: { out: string; err: string }) => `${p.out}\n${p.err}`.split('\n')
const stashLines = (p: { out: string }) => p.out.split('\n').filter((l) => l.startsWith('STASH'))
const added = (p: { out: string }) => p.out.split('\n').filter((l) => l.startsWith('STASH ADDED: '))
const gone = (p: { out: string }) => p.out.split('\n').filter((l) => l.startsWith('STASH GONE: '))
const noStashLine = (what: string, p: { out: string; err: string }) => expect(`${what} prints lines that start with STASH: ${JSON.stringify(all(p).filter((l) => l.startsWith('STASH')))}`).toBe(`${what} prints lines that start with STASH: []`)
// exactly one line of the kind, and it holds the message
const oneWith = (what: string, got: string[], msg: string) => {
  expect(`${what}: ${got.length} line(s)`).toBe(`${what}: 1 line(s)`)
  expect(`${what} holds "${msg}": ${(got[0] ?? '').includes(msg)}`).toBe(`${what} holds "${msg}": true`)
}

// the rest of a run after `start`, up to where `done` can end it: a spec shown and approved, every step recorded
// (the steps are read from `missing`, whatever they are), and every change committed
let specs = 0
function finishable(w: World) {
  const f = `${w.dir}/spec-${++specs}.md`, S = h(w, ['dir']).out
  writeFileSync(f, 'what the feature does\n')
  expect(h(w, ['spec', f]).code).toBe(0)
  for (let i = 0; i < 3 && !existsSync(`${S}/spec-shown`); i++) sh(w, [process.execPath, SCRIPT, 'hook-stop'], w.r, { stdin: '{"hook_event_name":"Stop","stop_hook_active":false}', env: { CLAUDE_PROJECT_DIR: w.r } })
  expect(h(w, ['approve']).out).toBe('approved')
  writeFileSync(`${w.r}/src/b.txt`, 'the feature\n'); git(w, ['add', '-A']); git(w, ['commit', '-qm', 'feature'])
  expect(h(w, ['records-check', '--none', 'a test repository with no records']).code).toBe(0)
  for (const p of h(w, ['missing']).out.split(' ').filter((x) => x !== '')) h(w, ['phase', p])
  expect(h(w, ['missing']).out).toBe('')
  expect(git(w, ['status', '--porcelain'])).toBe('')
}
const doneAtHead = (w: World, p: { code: number; out: string }) => {
  const head = git(w, ['rev-parse', 'HEAD'])
  expect(`done prints the line "done at ${head}": ${p.out.split('\n').includes(`done at ${head}`)}`).toBe(`done prints the line "done at ${head}": true`)
  expect(`done exits ${p.code}`).toBe('done exits 0')
}

// ---------- behaviour 7: an entry added after start ----------

test('7: when an entry is added to the stash of the code repository after start, gate prints a line that starts with "STASH ADDED: " and holds that entry\'s message (an entry with a label)', () => {
  const w = world(); started(w)
  push(w, 'oracle label one')
  const g = h(w, ['gate'])
  oneWith('gate, STASH ADDED', added(g), 'oracle label one')
  oneWith('gate, STASH ADDED', added(g), message(w, 0)) // the message as `git stash list` shows it
  expect(gone(g)).toEqual([])
})

test('7: an entry added without a label gets its line too, with the message git stash list shows for it', () => {
  const w = world(); started(w)
  push(w)
  expect(message(w, 0)).toMatch(/^WIP on /)
  const g = h(w, ['gate'])
  oneWith('gate, STASH ADDED', added(g), message(w, 0))
  expect(gone(g)).toEqual([])
})

test('7: with entries in the stash at start, only the entry added since gets a line: the older ones moved down a place and are still there', () => {
  const w = world()
  push(w, 'held at start, first'); push(w, 'held at start, second')
  started(w)
  push(w, 'came after start')
  const g = h(w, ['gate'])
  oneWith('gate, STASH ADDED', added(g), 'came after start')
  expect(gone(g)).toEqual([])
  expect(stashLines(g).length).toBe(1)
})

test('7: two entries added after start get one line each', () => {
  const w = world(); started(w)
  push(w, 'first of two'); push(w, 'second of two')
  const a = added(h(w, ['gate']))
  expect(`gate, STASH ADDED: ${a.length} line(s)`).toBe('gate, STASH ADDED: 2 line(s)')
  for (const m of ['first of two', 'second of two']) expect(`one STASH ADDED line holds "${m}": ${a.filter((l) => l.includes(m)).length}`).toBe(`one STASH ADDED line holds "${m}": 1`)
})

test('7: the stash is the one of the whole repository: an entry made in the main checkout shows in the gate of a run in a linked worktree', () => {
  const w = world(), wt = `${w.dir}/wt`
  git(w, ['worktree', 'add', '-q', wt, '-b', 'task'])
  started(w, wt)
  push(w, 'made in the main checkout')
  const g = h(w, ['gate'], wt)
  oneWith('gate in the worktree, STASH ADDED', added(g), 'made in the main checkout')
  expect(g.code).toBe(0)
})

// ---------- behaviour 8: an entry held at start that is gone ----------

test('8: when an entry that the stash held at start is no longer in it, gate prints a line that starts with "STASH GONE: " and holds that entry\'s message', () => {
  const w = world()
  push(w, 'the user\'s own entry')
  const msg = message(w, 0)
  started(w)
  stash(w, ['drop', '-q'])
  expect(entries(w)).toEqual([])
  const g = h(w, ['gate'])
  oneWith('gate, STASH GONE', gone(g), 'the user\'s own entry')
  oneWith('gate, STASH GONE', gone(g), msg)
  expect(added(g)).toEqual([])
})

test('8: when the older of two entries is gone, only that one gets a line: the other moved up a place and is still there', () => {
  const w = world()
  push(w, 'older entry'); push(w, 'newer entry')
  started(w)
  stash(w, ['drop', '-q', 'stash@{1}'])
  expect(entries(w).length).toBe(1); expect(message(w, 0)).toContain('newer entry')
  const g = h(w, ['gate'])
  oneWith('gate, STASH GONE', gone(g), 'older entry')
  expect(added(g)).toEqual([])
  expect(stashLines(g).length).toBe(1)
})

test('8: when the newer of two entries is gone, only that one gets a line', () => {
  const w = world()
  push(w, 'older entry'); push(w, 'newer entry')
  started(w)
  stash(w, ['drop', '-q', 'stash@{0}'])
  const g = h(w, ['gate'])
  oneWith('gate, STASH GONE', gone(g), 'newer entry')
  expect(added(g)).toEqual([])
  expect(stashLines(g).length).toBe(1)
})

test('7 and 8: one entry gone and another added since start: gate prints one line of each kind', () => {
  const w = world()
  push(w, 'was there at start')
  started(w)
  stash(w, ['drop', '-q'])
  push(w, 'came after start')
  const g = h(w, ['gate'])
  oneWith('gate, STASH GONE', gone(g), 'was there at start')
  oneWith('gate, STASH ADDED', added(g), 'came after start')
  expect(g.code).toBe(0)
})

// ---------- behaviour 9: the same entries as at start ----------
// These two pass before the change too (the script printed no such line): they guard what must stay.

test('9 (guard): with an empty stash at start and now, gate and done print no line that starts with STASH', () => {
  const w = world(); started(w)
  noStashLine('gate', h(w, ['gate']))
  finishable(w)
  noStashLine('gate', h(w, ['gate']))
  const d = h(w, ['done'])
  noStashLine('done', d); doneAtHead(w, d)
})

test('9 (guard): with the same two entries in the stash as at start, gate and done print no line that starts with STASH', () => {
  const w = world()
  push(w, 'the user\'s first'); push(w)
  started(w)
  noStashLine('gate', h(w, ['gate']))
  finishable(w)
  expect(entries(w).length).toBe(2)
  noStashLine('gate', h(w, ['gate']))
  const d = h(w, ['done'])
  noStashLine('done', d); doneAtHead(w, d)
})

test('9: start records the stash each time: an entry that was there when the run was started again gets no line', () => {
  const w = world(); started(w)
  push(w, 'before the second start')
  oneWith('gate of the first run, STASH ADDED', added(h(w, ['gate'])), 'before the second start')
  started(w) // no spec was approved, so a second start begins a new run
  noStashLine('gate of the second run', h(w, ['gate']))
})

test('9: the stash compared is the one of the code repository: an entry made in the records home, a repository of its own, gets no line', () => {
  const w = world(), home = `${w.dir}/home`, code = `${home}/code`
  repoAt(w, home); writeFileSync(`${home}/.gitignore`, 'code/\n'); git(w, ['add', '-A'], home); git(w, ['commit', '-qm', 'ignore the code'], home)
  repoAt(w, code)
  expect(h(w, ['repo', 'code'], home).out).toBe(code) // the pointer .hstack/repo: the code repository is `code`
  git(w, ['add', '-A'], home); git(w, ['commit', '-qm', 'the pointer'], home)
  started(w, home)
  push(w, 'an entry of the records home', home)
  noStashLine('gate', h(w, ['gate'], home))
  push(w, 'an entry of the code repository', code)
  oneWith('gate, STASH ADDED', added(h(w, ['gate'], home)), 'an entry of the code repository')
})

// ---------- behaviour 10: the exit code of gate ----------

test('10: a STASH ADDED line does not change the exit code of gate: with such a line and the oracle\'s locked file unchanged, it exits 0', () => {
  const w = world(); started(w)
  mkdirSync(`${w.r}/tests`); writeFileSync(`${w.r}/tests/new_test.txt`, 'assert new\n')
  expect(h(w, ['lock', 'tests/new_test.txt']).code).toBe(0)
  expect(h(w, ['gate']).code).toBe(0)
  push(w, 'added while the gate is green')
  expect(existsSync(`${w.r}/tests/new_test.txt`)).toBe(true) // an untracked file is not stashed
  const g = h(w, ['gate'])
  oneWith('gate, STASH ADDED', added(g), 'added while the gate is green')
  expect(`gate exits ${g.code}`).toBe('gate exits 0')
})

test('10: a STASH GONE line does not change the exit code of gate: with such a line and nothing else wrong, it exits 0', () => {
  const w = world()
  push(w, 'gone while the gate is green')
  started(w)
  stash(w, ['drop', '-q'])
  const g = h(w, ['gate'])
  oneWith('gate, STASH GONE', gone(g), 'gone while the gate is green')
  expect(`gate exits ${g.code}`).toBe('gate exits 0')
})

test('10: gate exits as it would without the line: a changed oracle file still fails it, and both lines are printed', () => {
  const w = world(); started(w)
  mkdirSync(`${w.r}/tests`); writeFileSync(`${w.r}/tests/new_test.txt`, 'assert new\n')
  expect(h(w, ['lock', 'tests/new_test.txt']).code).toBe(0)
  push(w, 'added beside a changed oracle file')
  writeFileSync(`${w.r}/tests/new_test.txt`, 'assert weaker\n')
  const g = h(w, ['gate'])
  expect(g.out).toContain('ORACLE CHANGED: tests/new_test.txt')
  oneWith('gate, STASH ADDED', added(g), 'added beside a changed oracle file')
  expect(`gate exits 0: ${g.code === 0}`).toBe('gate exits 0: false')
})

// ---------- behaviour 11: done ----------

test('11: done prints the same STASH ADDED line as gate would, and still ends the run: it prints "done at <HEAD>" and exits 0', () => {
  const w = world(); started(w)
  finishable(w)
  push(w, 'left behind by the run')
  const g = h(w, ['gate']), d = h(w, ['done'])
  oneWith('gate, STASH ADDED', added(g), 'left behind by the run')
  oneWith('done, STASH ADDED', added(d), 'left behind by the run')
  expect(stashLines(d).sort()).toEqual(stashLines(g).sort())
  doneAtHead(w, d)
})

test('11: done prints the same STASH GONE line as gate would, with no gate run before it, and still ends the run', () => {
  const w = world()
  push(w, 'the user\'s entry, dropped')
  started(w)
  finishable(w)
  stash(w, ['drop', '-q'])
  const d = h(w, ['done'])
  oneWith('done, STASH GONE', gone(d), 'the user\'s entry, dropped')
  expect(added(d)).toEqual([])
  doneAtHead(w, d)
})

test('11: with one entry gone and one added, done prints the same two lines as gate, and still ends the run', () => {
  const w = world()
  push(w, 'was there at start'); push(w, 'stays all along')
  started(w)
  finishable(w)
  stash(w, ['drop', '-q', 'stash@{1}'])
  push(w, 'came after start')
  const g = h(w, ['gate']), d = h(w, ['done'])
  oneWith('gate, STASH GONE', gone(g), 'was there at start'); oneWith('gate, STASH ADDED', added(g), 'came after start')
  expect(stashLines(g).length).toBe(2)
  expect(stashLines(d).sort()).toEqual(stashLines(g).sort())
  doneAtHead(w, d)
})
