// Tests of scripts/hstack.ts and its two hooks. Run: bun test tests/hstack.test.ts
// The tests of a section share one repository and one state folder and run in file order, as one story: a test
// depends on the ones before it, so a name filter (-t) on a single test does not work.
// HSTACK_SCRIPT and HSTACK_RUN run another copy of the script (a broken copy that a guard must catch, or the sh
// script these tests were moved from).
import { expect, setDefaultTimeout, test } from 'bun:test'
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cksum } from '../scripts/lib/cksum.ts'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const RUN = process.env.HSTACK_RUN ?? process.execPath
const TS = !SCRIPT.endsWith('.sh') // three checks hold for the TypeScript script only (see the tests that use it)
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-test-')))
process.on('exit', () => rmSync(T, { recursive: true, force: true }))

// No test may reach GitHub, even if PATH slips past the fake gh below: a dead proxy and junk tokens.
const ENV: Record<string, string> = { ...(process.env as Record<string, string>), HSTACK_STATE: `${T}/state`, HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: 'junk', GITHUB_TOKEN: 'junk', GH_CONFIG_DIR: `${T}/ghconfig`, PATH: `${T}/bin:${process.env.PATH}` }
delete ENV.CLAUDE_PROJECT_DIR // a caller's value would send the hooks and the pass to another repository
delete ENV.HSTACK_FEEDBACK_REPO

type Opt = { cwd?: string; stdin?: string | Buffer; env?: Record<string, string> }
let cwd = `${T}/r` // where the story is: the sh tests changed directory, these name it
function sh(cmd: string[], o: Opt = {}) {
  const r = Bun.spawnSync(cmd, { cwd: o.cwd ?? cwd, env: { ...ENV, ...(o.env ?? {}) }, stdin: o.stdin === undefined ? 'ignore' : typeof o.stdin === 'string' ? Buffer.from(o.stdin) : o.stdin, stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString(), raw: r.stdout }
}
const h = (args: string[], o: Opt = {}) => sh([RUN, SCRIPT, ...args], o)
const git = (args: string[], dir = cwd) => sh(['git', ...args], { cwd: dir }).out
const F = (args: string[], o: Opt = {}) => h(['feedback', ...args], o)
const has = (text: string, line: string) => text.split('\n').includes(line) // grep -qx
const read = (p: string) => readFileSync(p, 'utf8')
const lines = (p: string) => read(p).replace(/\n$/, '').split('\n')
const repoAt = (dir: string) => { mkdirSync(dir, { recursive: true }); git(['init', '-q'], dir); git(['config', 'user.email', 't@t'], dir); git(['config', 'user.name', 't'], dir) }

let R = `${T}/r` // the repository the two hooks below run in
const stop = (dir = R) => sh([RUN, SCRIPT, 'hook-stop'], { stdin: '{"hook_event_name":"Stop","stop_hook_active":false}', env: { CLAUDE_PROJECT_DIR: dir } }).out
const start = (source: string, dir = R) => sh([RUN, SCRIPT, 'hook-start'], { stdin: `{"session_id":"x","source":"${source}"}`, env: { CLAUDE_PROJECT_DIR: dir } }).out

repoAt(R)
mkdirSync(`${R}/tests`); mkdirSync(`${R}/src`)
writeFileSync(`${R}/tests/old_test.txt`, 'assert a\n'); writeFileSync(`${R}/src/a.txt`, 'x = 1\n')
git(['add', '-A']); git(['commit', '-qm', 'base'])
const S = h(['dir']).out
const head = () => git(['rev-parse', 'HEAD'])
// a run whose project has no feature list and coverage file to compare says so, and why
const noRecords = () => expect(h(['records-check', '--none', 'a test repository with no records']).code).toBe(0)
// a run builds nothing before the user approves a spec: show one, let one turn end (the stop stamps it), approve it
let specs = 0
const specced = () => {
  const f = `${T}/spec-${++specs}.md`, dir = h(['dir']).out
  writeFileSync(f, 'what the feature does\n'); expect(h(['spec', f]).code).toBe(0)
  for (let i = 0; i < 3 && !existsSync(`${dir}/spec-shown`); i++) stop() // a pass left by a feedback verb is consumed first
  expect(h(['approve']).out).toBe('approved')
}

test('the state folder is named by the cksum of the git dir, as the cksum command gives it', () => {
  const b = (s: string) => Buffer.from(s, 'utf8').toString('latin1')
  expect([cksum(b('abc')), cksum(b('/Users/x/repo/.git')), cksum(b('')), cksum(b('/tmp/tiếng Việt/.git'))]).toEqual([1219131554, 1025131966, 4294967295, 3562651089])
  expect(S).toBe(`${T}/state/${cksum(b(git(['rev-parse', '--absolute-git-dir'])))}`)
})

// no repo
test('stop allows outside a git repo', () => { expect(stop('/')).toBe('') })

// hook-start prints the nudge and sets the reference only on startup
test('start prints the nudge', () => { expect(start('startup')).toContain('hstack:build') })
test('stop allows when nothing changed and no run', () => { expect(stop()).toBe('') })
test('with no run, a change is let through, after a resume too (spec 9: the loop runs only when the user invokes it)', () => {
  writeFileSync(`${R}/src/a.txt`, 'x = 2\n'); start('resume')
  expect(stop()).toBe('')
})
test('stop allows after 3 blocks in one process', () => {
  start('resume'); stop(); stop(); stop() // the count is per process: reset by start
  expect(stop()).toBe('')
})
test('a compaction does not give the blocks back', () => { start('compact'); expect(stop()).toBe('') })
test('a capped stop with no run records no feedback', () => { expect(existsSync(`${S}/feedback`)).toBe(false); git(['checkout', '-q', '--', 'src/a.txt']) })

// a run
test('start records the base', () => { start('startup'); h(['start']); expect(read(`${S}/base`).trim()).toBe(head()) })
test('missing lists every phase at first', () => { expect(h(['missing']).out).toBe('spec setup oracle implement gate review explore mutate final records') })
test('stop blocks a started run and names the missing steps', () => { expect(stop()).toContain('steps not recorded: spec setup oracle') })
test('a skipped phase counts', () => {
  specced(); h(['phase', 'setup']); h(['phase', 'oracle']); h(['phase', 'explore', 'skipped:', 'no', 'way', 'to', 'run', 'it'])
  expect(h(['missing']).out).toBe('implement gate review mutate final records')
})
test('phase refuses a bad line', () => { expect(h(['phase', 'explore skipped:']).code).not.toBe(0); expect(h(['phase', 'Build']).code).not.toBe(0) })
test('a bare word skipped does not count', () => { expect(h(['phase', 'mutatex']).code).toBe(0); expect(h(['missing']).out).toContain('mutate') })

// lock and gate
test('gate passes with the oracle unchanged', () => {
  writeFileSync(`${R}/tests/new_test.txt`, 'assert new\n'); h(['lock', 'tests/new_test.txt'])
  expect(h(['gate']).code).toBe(0)
})
test('gate fails on a changed oracle file', () => {
  writeFileSync(`${R}/tests/new_test.txt`, 'assert weaker\n')
  const g = h(['gate']); expect(g.code).not.toBe(0); expect(g.out).toContain('ORACLE CHANGED: tests/new_test.txt')
})
test('added lines in a pre-existing test pass silently', () => {
  writeFileSync(`${R}/tests/new_test.txt`, 'assert new\n'); writeFileSync(`${S}/test-paths`, ':(glob)tests/**\n'); writeFileSync(`${R}/tests/old_test.txt`, 'assert a\nassert b\n')
  expect(h(['gate']).out).not.toMatch(/REMOVED|PRE-EXISTING/)
})
test('a removed line is reported', () => { writeFileSync(`${R}/tests/old_test.txt`, 'assert b\n'); expect(h(['gate']).out).toContain('REMOVED tests/old_test.txt: assert a') })
test('removed lines alone do not fail the gate', () => { expect(h(['gate']).code).toBe(0) })
test('a deleted pre-existing test is reported', () => {
  git(['checkout', '-q', '--', 'tests/old_test.txt']); git(['rm', '-q', 'tests/old_test.txt'])
  expect(h(['gate']).out).toContain('PRE-EXISTING TEST D')
})
test('gate fails on a missing oracle file', () => {
  git(['checkout', '-q', 'HEAD', '--', 'tests/old_test.txt']); rmSync(`${R}/tests/new_test.txt`)
  expect(h(['gate']).out).toContain('ORACLE MISSING')
  writeFileSync(`${R}/tests/new_test.txt`, 'assert new\n')
})

// done
test('done refuses while steps are missing', () => { expect(h(['done']).code).not.toBe(0) })
test('done refuses an uncommitted change', () => { noRecords(); for (const p of ['implement', 'gate', 'review', 'mutate', 'final', 'records']) h(['phase', p]); expect(h(['done']).code).not.toBe(0) })
test('done records HEAD', () => { git(['add', '-A']); git(['commit', '-qm', 'feature']); expect(h(['done']).code).toBe(0); expect(read(`${S}/done`).trim()).toBe(head()) })
test('stop allows after done on a clean tree', () => { start('resume'); expect(stop()).toBe('') })
test('stop lets a change after done through (spec 9)', () => { writeFileSync(`${R}/src/a.txt`, 'x = 3\n'); expect(stop()).toBe(''); git(['checkout', '-q', '--', 'src/a.txt']) })
test('elapsed prints minutes', () => { expect(h(['elapsed']).out).toBe('0') })

// a second run keeps the first
test('start keeps the work tree folder it recorded', () => { h(['start']); specced(); expect(read(`${S}/top`).trim()).toBe(git(['rev-parse', '--show-toplevel'])) })
test('start moves the earlier run to old/', () => {
  expect(readdirSync(`${S}/old`).some((d) => existsSync(`${S}/old/${d}/base`))).toBe(true)
  expect(existsSync(`${S}/done`)).toBe(false); expect(existsSync(`${S}/session-head`)).toBe(true)
})
test('state is never in the work tree or .git', () => { expect(git(['status', '--porcelain'])).toBe(''); expect(existsSync(`${R}/.git/hstack`)).toBe(false); expect(S).toStartWith(`${T}/state/`) })

// feedback: entries in the state dir, a description the user approves, fields from an allow-list, a fake gh that logs its arguments
mkdirSync(`${T}/bin`)
writeFileSync(`${T}/bin/gh`, `#!${process.execPath}
import { appendFileSync, readFileSync } from 'node:fs'
const D = import.meta.dir, a = process.argv.slice(2), mode = readFileSync(D + '/mode', 'utf8')
appendFileSync(D + '/log', 'gh' + a.map((x) => ' [' + x + ']').join('') + '\\n')
const k = a[0] + ' ' + a[1]
if (k === 'auth status') process.exit(mode.includes('logged-out') ? 1 : 0)
if (k === 'label list') { if (mode.includes('label-fail')) process.exit(1); process.stdout.write(readFileSync(D + '/labels')) }
if (k === 'label create') appendFileSync(D + '/labels', 'feedback\\n')
if (k === 'issue create') console.log('https://github.com/x/y/issues/7')
if (k === 'issue list') process.stdout.write(readFileSync(D + '/issues'))
`)
chmodSync(`${T}/bin/gh`, 0o755)
writeFileSync(`${T}/bin/labels`, 'feedback\n'); writeFileSync(`${T}/bin/mode`, ''); writeFileSync(`${T}/bin/log`, '')
const log = () => read(`${T}/bin/log`)
const clearLog = () => writeFileSync(`${T}/bin/log`, '')
const FB = `${S}/feedback`
const entries = (fb = FB) => (existsSync(fb) ? readdirSync(fb).sort().filter((f) => !/^(posted|dismissed)$|\.md$/.test(f)) : [])
const headOf = (p: string) => { const l = lines(p), i = l.indexOf(''); return i < 0 ? l : l.slice(0, i) }
const text = (...l: string[]) => l.join('\n') + '\n' // a description: the summary, an empty line, the rest
const draft = (o: Opt = {}) => F(['draft'], o).out
// gives every entry without a text one, then posts every entry through the fake gh, so the next test starts with none
// (tests delete nothing)
function flush() {
  for (const m of draft().matchAll(/^undescribed (.*): .*$/gm)) F(['describe', m[1]], { stdin: text('a test summary', '', 'a test text') })
  const d = draft(), ids = [...d.matchAll(/^entry (.*)$/gm)].map((m) => m[1]), codes = [...d.matchAll(/^confirm: (.*)$/gm)].map((m) => m[1])
  ids.forEach((id, i) => F(['post', id, codes[i]]))
}
let before = '', e1 = '', id = '', code = '', e2 = '', e = '', idd = ''
const one = () => { const l = entries(); expect(l.length).toBe(1); return l[0] }
const desc = (...l: string[]) => F(['describe', idd], { stdin: text(...l) })
// refused, and for the reason named: by draft (which shows nothing of it) and by post
const refusedText = (why: string) => {
  const d = draft()
  expect(d).toMatch(new RegExp(`^refused: ${FB}/${e}: .*${why}`, 'm')); expect(d).not.toMatch(/^entry /m)
  const p = F(['post', idd, '0']); expect(p.out + p.err).toMatch(new RegExp(`refused: .*${why}`)); expect(log()).not.toContain('create')
}

// capture inside the loop (the run above already skipped explore)
test('the first run recorded its skipped step', () => { expect(sh(['gh', '--version']).code).toBe(0); before = git(['status', '--porcelain', '--ignored']); expect(entries().length).toBe(1) })
test('a recorded stumble has no description: it is listed, not drafted', () => { expect(draft()).toMatch(/^undescribed .*: setup-failure at explore$/m); expect(draft()).not.toMatch(/^entry /m) })
test('a plain phase exits 0, prints nothing and records nothing', () => { flush(); const r = h(['phase', 'setup']); expect([r.code, r.out + r.err]).toEqual([0, '']); expect(entries()).toEqual([]) })
test.skipIf(process.getuid?.() === 0)('phase still fails when its line cannot be written', () => {
  chmodSync(`${S}/phases`, 0o444); const r = h(['phase', 'gate']); chmodSync(`${S}/phases`, 0o644)
  expect(r.code).not.toBe(0)
})
test('a name outside PHASES records nothing', () => { h(['phase', 'mutatex', 'skipped:', 'time']); expect(entries()).toEqual([]) })
test('a skipped phase still exits 0 and prints nothing', () => {
  h(['lock', 'tests/new_test.txt']); h(['lock', 'tests/new_test.txt'])
  const r = h(['phase', 'explore', 'skipped:', '/Users/acme/secret-app', 'cannot', 'run']); expect([r.code, r.out + r.err]).toEqual([0, ''])
  e1 = one(); id = `${S.split('/').pop()}/${e1}`
})
test('a skipped step records a setup-failure, the why in the detail only', () => {
  const hd = headOf(`${FB}/${e1}`)
  expect(hd).toContain('kind=setup-failure'); expect(hd).toContain('phase=explore'); expect(read(`${FB}/${e1}`)).toContain('secret-app'); expect(hd.join('\n')).not.toContain('secret')
})
test('the counts come from the state files', () => { const hd = headOf(`${FB}/${e1}`); for (const l of ['oracle_files=1', 'dispute_rounds=1', 'skipped_phases=2', 'elapsed=0']) expect(hd).toContain(l) })
test('post refuses an entry without a description', () => { clearLog(); const r = F(['post', id, '0']); expect(r.out + r.err).toContain('no description'); expect(log()).not.toContain('create') })
test('describe writes the text beside the entry', () => {
  F(['describe', id], { stdin: text('explore is skipped when the product is a CLI', '', 'The explorer found no way to run the product, so the step was skipped.', '', 'Expected: it runs the CLI the capabilities list.') })
  expect(existsSync(`${FB}/${e1}.md`)).toBe(true)
})
test('the draft is the description, a rule, then the fields', () => {
  const d = draft()
  for (const l of ['title: [feedback] explore setup-failure: explore is skipped when the product is a CLI', '| The explorer found no way to run the product, so the step was skipped.', '| ---', '| phase: explore']) expect(has(d, l)).toBe(true)
  expect(d).not.toMatch(/^\| explore is skipped/m)
})
test('the detail never reaches a draft', () => { expect(draft()).not.toMatch(/acme|secret|cannot run|Users/) })
test('draft names the local file and works outside a repository', () => { expect(has(draft({ cwd: T }), `local: ${FB}/${e1}`)).toBe(true); code = /^confirm: (.*)$/m.exec(draft())![1] })

// nothing is posted without gh, a login, the label, or the code the user saw
const NOGH = `${T}/nogh`
test('the no-gh PATH holds no gh', () => {
  mkdirSync(NOGH)
  for (const d of ['/usr/bin', '/bin']) for (const f of readdirSync(d)) if (f !== 'gh') try { symlinkSync(`${d}/${f}`, `${NOGH}/${f}`) } catch { /* a name both folders have */ }
  if (!existsSync(`${NOGH}/git`)) symlinkSync(Bun.which('git') as string, `${NOGH}/git`)
  expect(existsSync(`${NOGH}/gh`)).toBe(false)
})
test('no gh keeps the file and prints its path', () => { expect(F(['post', id, code], { env: { PATH: NOGH } }).out).toContain(`kept: ${FB}/${e1}`); expect(existsSync(`${FB}/${e1}`)).toBe(true); expect(log()).not.toContain('create') })
test('a logged-out gh keeps the file and prints its path', () => {
  writeFileSync(`${T}/bin/mode`, 'logged-out\n')
  expect(F(['post', id, code]).out).toContain(`kept: ${FB}/${e1}`); expect(existsSync(`${FB}/${e1}`)).toBe(true); expect(log()).not.toContain('create')
  writeFileSync(`${T}/bin/mode`, '')
})
test('a wrong confirm code posts nothing', () => { expect(F(['post', id, '123']).code).not.toBe(0); expect(log()).not.toContain('create') })
test('an id that is not an entry id is refused', () => {
  const all = (a: string[]) => { const r = F(a); return r.out + r.err }
  expect(all(['post', `../${e1}`, code])).toContain('usage:'); expect(all(['post', `${id}/../x`, code])).toContain('usage:'); expect(all(['post', '1/2', code])).toContain('not an entry id')
})
test('a file whose name is not an entry id is no entry, and its name is never printed', () => {
  mkdirSync(`${T}/state/acme corp/feedback`, { recursive: true }); writeFileSync(`${T}/state/acme corp/feedback/20000101-000000-2`, 'version=0.3.0\nkind=cost\nphase=implement\n\n')
  writeFileSync(`${FB}/acme-name`, 'version=0.3.0\nkind=cost\nphase=implement\n\n')
  expect(draft()).not.toContain('acme')
  rmSync(`${FB}/acme-name`)
})
// the sh script ran grep for the allow-list of fields, and a grep that fails must refuse the draft. hstack.ts runs no
// grep, so this check is for the sh script only.
test.skipIf(TS)('a grep that fails refuses the draft', () => {
  mkdirSync(`${T}/badgrep`); writeFileSync(`${T}/badgrep/grep`, `#!/bin/sh\ncase $1 in -Ev*) exit 2 ;; esac\nexec ${Bun.which('grep')} "$@"\n`); chmodSync(`${T}/badgrep/grep`, 0o755)
  const d = draft({ env: { PATH: `${T}/badgrep:${ENV.PATH}` } })
  expect(d).toMatch(new RegExp(`^refused: ${FB}/${e1}: `, 'm')); expect(d).not.toMatch(/^entry /m)
})
test('a verb that does not exist writes no pass', () => {
  stop() // consumes the pass the drafts above wrote
  expect(existsSync(`${S}/pass`)).toBe(false); expect(F(['bogus']).code).not.toBe(0); expect(existsSync(`${S}/pass`)).toBe(false)
})
test('a missing label posts nothing and creates none', () => {
  writeFileSync(`${T}/bin/labels`, 'bug\n')
  const r = F(['post', id, code]); expect(r.code).not.toBe(0); expect(r.out).toContain('feedback label'); expect(existsSync(`${FB}/${e1}`)).toBe(true); expect(log()).not.toContain('create')
})
test('a failed label list posts nothing', () => {
  writeFileSync(`${T}/bin/mode`, 'label-fail\n')
  expect(F(['post', id, code]).code).not.toBe(0); expect(existsSync(`${FB}/${e1}`)).toBe(true); expect(log()).not.toContain('create')
  writeFileSync(`${T}/bin/mode`, '')
})
test('only feedback label creates the label', () => { F(['label']); expect(log()).toMatch(/^gh \[label\] \[create\] \[feedback\] \[--repo\] \[emulatalk1\/hstack\]/m) })

// the post
let shown = '', posted = ''
test('post creates the issue with the repo, the label and the shown title', () => {
  clearLog(); shown = [...draft().matchAll(/^\| (.*)$/gm)].map((m) => m[1]).join('\n'); posted = F(['post', id, code]).out
  expect(log()).toContain('gh [issue] [create] [--repo] [emulatalk1/hstack] [--label] [feedback] [--title] [[feedback] explore setup-failure: explore is skipped when the product is a CLI] [--body] [The explorer found')
})
test('the posted body is the shown body', () => {
  const l = log(), body = l.slice(l.indexOf('[--body] [') + 10).replace(/\]\n$/, '')
  expect(shown).not.toBe(''); expect(body).toBe(shown)
})
test('the posted text holds nothing of the detail', () => { expect(log()).not.toMatch(/acme|secret|cannot run|Users/) })
test('the posted entry and its text move to posted/ with the URL', () => {
  expect(existsSync(`${FB}/posted/${e1}`)).toBe(true); expect(existsSync(`${FB}/posted/${e1}.md`)).toBe(true)
  expect(has(read(`${FB}/posted/${e1}`), 'posted: https://github.com/x/y/issues/7')).toBe(true); expect(posted).toContain('issues/7'); expect(entries()).toEqual([])
})
test('every gh call names the repo', () => { for (const l of log().split('\n').filter((x) => x.startsWith('gh ') && !x.startsWith('gh [auth]'))) expect(l).toContain('[--repo] [emulatalk1/hstack]') })

// a report the user makes: add reads the description from stdin
let addOut = ''
test('add records the entry with its text and prints the path', () => {
  addOut = F(['add', 'bug', 'oracle'], { stdin: text('the oracle locks a file twice', '', 'What happened: $H lock ran twice for one file and `gate` printed it twice.', 'Expected: once.') }).out
  e2 = one()
  expect(addOut).toContain(`recorded: ${FB}/${e2}`); expect(headOf(`${FB}/${e2}`)).toContain('kind=bug'); expect(headOf(`${FB}/${e2}`)).toContain('phase=oracle'); expect(existsSync(`${FB}/${e2}.md`)).toBe(true)
})
test('the text is kept as written, dollar signs and backticks too', () => { expect(has(draft(), '| What happened: $H lock ran twice for one file and `gate` printed it twice.')).toBe(true) })
test('add refuses a kind or a phase outside the lists', () => {
  expect(F(['add', 'bugx', 'review']).code).not.toBe(0); expect(F(['add', 'cost', 'nowhere']).code).not.toBe(0); expect(F(['add', 'escaped-bug cost', 'review']).code).not.toBe(0)
  expect(entries()).toEqual([e2])
})

// another repo by the setting; the yes covers it
const FORK = { env: { HSTACK_FEEDBACK_REPO: 'me/fork' } }
const entryId = (d: string) => /^entry (.*)$/m.exec(d)![1]
const confirm = (d: string) => /^confirm: (.*)$/m.exec(d)![1]
test('the yes covers the repository: a code shown for one repo does not post to another', () => { clearLog(); expect(F(['post', entryId(draft()), confirm(draft())], FORK).code).not.toBe(0); expect(log()).not.toContain('create') })
test('draft names the repository it would post to', () => { expect(has(draft(FORK), 'to: me/fork')).toBe(true); expect(has(draft(), 'to: emulatalk1/hstack')).toBe(true) })
test('HSTACK_FEEDBACK_REPO changes the repo on every call', () => {
  F(['post', entryId(draft()), confirm(draft(FORK))], FORK)
  expect(log()).toContain('[issue] [create] [--repo] [me/fork]')
  for (const l of log().split('\n').filter((x) => x.startsWith('gh ') && !x.startsWith('gh [auth]'))) expect(l).toContain('[--repo] [me/fork]')
})
test('a repo that is not owner/name is refused before any gh call', () => {
  clearLog()
  for (const repo of ['a b', 'a/b/c']) { const r = F(['collect'], { env: { HSTACK_FEEDBACK_REPO: repo } }); expect(r.out + r.err).toContain('must be owner/name') }
  expect(log()).toBe('')
})

// a time skip is a cost
test('a time skip records a cost', () => { h(['phase', 'mutate', 'skipped:', 'time,', '185', 'min']); e = one(); expect(headOf(`${FB}/${e}`)).toContain('kind=cost'); expect(headOf(`${FB}/${e}`)).toContain('phase=mutate') })
test('time inside another why is not a cost', () => {
  flush(); h(['phase', 'explore', 'skipped:', 'nothing', 'runs', 'it,', 'like', 'mutate', 'skipped:', 'time']); e = one()
  expect(headOf(`${FB}/${e}`)).toContain('kind=setup-failure'); expect(headOf(`${FB}/${e}`)).toContain('phase=explore')
})

// the description: what the script refuses or flags, whoever wrote it
const AP = `${T}/acme-portal`, WT = `${T}/task-7f3a`
const addIn = (dir: string, ...l: string[]) => F(['add', 'bug', 'none'], { cwd: dir, stdin: text(...l) })
test('the project folder name in a description gives a warning', () => {
  flush(); repoAt(AP); git(['commit', '-q', '--allow-empty', '-m', 'base'], AP); addIn(AP, 'a summary', '', 'seen while building acme-portal')
  expect(draft()).toMatch(/^warning: /m); expect(draft()).toMatch(/^entry /m)
})
test('no warning when the name is not in the text', () => { flush(); addIn(AP, 'a summary', '', 'seen while building a web shop'); expect(draft()).toMatch(/^entry /m); expect(draft()).not.toMatch(/^warning: /m) })
// a linked worktree: its own state dir, its own folder, and the main checkout behind it
test('in a worktree the main checkout name gives the warning too', () => {
  flush(); git(['worktree', 'add', '-q', WT, '-b', 'task'], AP); addIn(WT, 'a summary', '', 'seen while building acme-portal')
  expect(draft()).toMatch(/^warning: /m)
})
const refusedId = () => { const m = new RegExp(`^refused: ${T}/state/([0-9]*)/feedback/([0-9-]*): .*$`, 'm').exec(draft())!; return `${m[1]}/${m[2]}` }
test('in a worktree the main checkout path is refused', () => {
  flush(); addIn(WT, 'a summary', '', `it failed in ${git(['rev-parse', '--show-toplevel'], AP)}/src`)
  expect(draft()).toMatch(/^refused: .*: the description holds a path of this machine/m)
})
test('in a worktree its own path is refused', () => {
  F(['describe', refusedId()], { cwd: WT, stdin: text('a summary', '', 'a text') }); flush()
  addIn(WT, 'a summary', '', `it failed in ${git(['rev-parse', '--show-toplevel'], WT)}/src`)
  expect(draft()).toMatch(/^refused: .*: the description holds a path of this machine/m)
})
test('the worktree entries were given a clean text and posted', () => {
  F(['describe', refusedId()], { cwd: WT, stdin: text('a summary', '', 'a text') }); flush()
  expect(draft()).not.toMatch(/^(refused|entry|undescribed)/m)
})
test('an enhancement with the phase none carries no run numbers', () => {
  F(['add', 'enhancement', 'none'], { stdin: text('a summary', '', 'a text') }); e = one()
  expect(headOf(`${FB}/${e}`).length).toBe(3); expect(headOf(`${FB}/${e}`)).toContain('phase=none')
})
const linesOf = (kind: string, phase: string) => { flush(); F(['add', kind, phase], { stdin: text('a summary', '', 'a text') }); return headOf(`${FB}/${one()}`).length }
test('an update carries no run numbers, whatever its phase', () => { expect(linesOf('update', 'implement')).toBe(3) })
test('nor does an enhancement', () => { expect(linesOf('enhancement', 'implement')).toBe(3) })
test('nor does a report with the phase none', () => { expect(linesOf('bug', 'none')).toBe(3) })
test('a bug at a step of a started run carries them', () => { expect(linesOf('bug', 'implement')).toBe(10) })
test('a description with the home path is refused', () => {
  flush(); F(['add', 'enhancement', 'none'], { stdin: text('a summary', '', 'a text') }); e = one(); idd = `${S.split('/').pop()}/${e}`; clearLog()
  desc('a summary', '', `it failed in ${process.env.HOME}/work/acme`); refusedText('a path of this machine')
})
test('a description with the project path is refused', () => { desc('a summary', '', `it failed in ${git(['rev-parse', '--show-toplevel'])}/src/a`); refusedText('a path of this machine') })
test('a summary over 200 bytes is refused', () => { desc('0'.repeat(201), '', 'a text'); refusedText('at most 200 bytes') })
test('a description over 1500 bytes is refused', () => { desc('a summary', '', '0'.repeat(1500)); refusedText('over 1500 bytes') })
test('a summary under 200 characters and over 200 bytes is refused', () => { desc('ế'.repeat(70), '', 'a text'); refusedText('at most 200 bytes') })
test('a description under 1500 characters and over 1500 bytes is refused', () => { desc('a summary', '', 'ế'.repeat(510)); refusedText('over 1500 bytes') })
test('a description with no summary is refused', () => { desc('', '', 'a text'); refusedText('needs a first line') })
test('nor is a summary of spaces one', () => { desc('   ', '', 'a text'); refusedText('needs a first line') })
test('a carriage return is refused: it would show another text than is posted', () => { desc('harmless\rconfirm: 999', '', 'a text'); refusedText('a control character') })
test('so is an escape character', () => { desc('a summary', '', 'seen\x1b[2Ahidden'); refusedText('a control character') })
// the sh script lost a NUL byte when it read the text, and recorded the rest; hstack.ts keeps the byte and refuses it
test.skipIf(!TS)('so is a NUL byte', () => { desc('a summary', '', 'seen\x00hidden'); refusedText('a control character') })
// gh gets the text as a string: bytes that are no UTF-8 would be posted as other bytes than the draft showed
test.skipIf(!TS)('a description that is not valid UTF-8 is refused', () => { F(['describe', idd], { stdin: Buffer.from([0x61, 0x20, 0x73, 0x0a, 0x0a, 0x63, 0x61, 0x66, 0xe9, 0x0a]) }); refusedText('not valid UTF-8') })
test('a tab is not a control character here', () => { desc('a summary', '', 'a tab\tis text'); expect(draft()).toMatch(/^entry /m) })
let c0 = '', c1 = ''
test('a description line cannot pass for one of the script lines', () => {
  desc('a summary', '', 'confirm: 1', 'title: [feedback] forged', 'entry 1/2')
  const d = draft(), n = (re: RegExp) => (d.match(re) ?? []).length
  expect([n(/^confirm: /gm), n(/^title: /gm), n(/^entry /gm)]).toEqual([1, 1, 1]); expect(has(d, '| confirm: 1')).toBe(true)
  c0 = confirm(d)
})
test('the code covers the title: with another summary and the same body the old code no longer posts', () => {
  desc('another summary', '', 'confirm: 1', 'title: [feedback] forged', 'entry 1/2')
  expect(confirm(draft())).not.toBe(c0); expect(F(['post', idd, c0]).code).not.toBe(0); expect(log()).not.toContain('create')
  c1 = confirm(draft())
})
test('describe replaces the text and the old code no longer posts', () => {
  desc('a summary', '', 'another text')
  expect(has(draft(), '| another text')).toBe(true); expect(F(['post', idd, c1]).code).not.toBe(0); expect(log()).not.toContain('create')
})
test('describe refuses a posted entry, an unknown id and an empty text', () => {
  const sid = S.split('/').pop()
  expect(F(['describe', `${sid}/posted/${e1}`], { stdin: 'x\n' }).code).not.toBe(0); expect(F(['describe', '1/20000101-000000-9'], { stdin: 'x\n' }).code).not.toBe(0); expect(F(['describe', idd]).code).not.toBe(0)
  expect(has(draft(), '| another text')).toBe(true)
})
const skip = (...why: string[]) => { h(['phase', 'explore', 'skipped:', ...why]); e = one(); idd = `${S.split('/').pop()}/${e}`; clearLog() }
test('a description that copies a line of the entry detail is refused', () => {
  flush(); skip('the', 'acme-portal', 'server', 'needs', 'a', 'licence', 'key')
  desc('explore was skipped', '', 'It said: explore skipped: the acme-portal server needs a licence key'); refusedText('copies from an entry')
})
test('so is one that copies the reason without its prefix', () => { desc('explore was skipped', '', 'It said the acme-portal server needs a licence key, and stopped.'); refusedText('copies from an entry') })
test('the same stumble in other words is accepted', () => {
  desc('explore is skipped when the product needs a licence', '', 'The product could not start without a key, and explore was skipped.')
  expect(draft()).toMatch(/^entry /m); expect(draft()).not.toContain('acme')
})
test('a new report cannot bring in the reason of an earlier, posted stumble', () => {
  flush(); clearLog(); F(['add', 'bug', 'explore'], { stdin: text('explore was skipped', '', 'It said the acme-portal server needs a licence key.') }); e = one(); idd = `${S.split('/').pop()}/${e}`
  refusedText('copies from an entry')
})
test('a short, generic reason of an earlier stumble is not refused', () => { desc('explore was skipped', '', 'It said: no way to run it.'); expect(draft()).toMatch(/^entry /m) })

// dismiss: a stumble the user will not post leaves the list, and nothing is deleted
test('dismiss takes the entry off the list, keeps the file and calls no gh', () => {
  flush(); skip('the', 'billing-core', 'service', 'cannot', 'boot', 'here')
  const out = F(['dismiss', idd]).out
  expect(has(out, `dismissed: ${FB}/dismissed/${e}`)).toBe(true); expect(existsSync(`${FB}/dismissed/${e}`)).toBe(true); expect(entries()).toEqual([])
  expect(has(draft(), 'no unposted feedback entry')).toBe(true); expect(log()).not.toMatch(/^gh /m)
})
test('a described entry is dismissed with its text', () => {
  F(['add', 'bug', 'none'], { stdin: text('a summary', '', 'a text') }); e = one(); idd = `${S.split('/').pop()}/${e}`; F(['dismiss', idd])
  expect(existsSync(`${FB}/dismissed/${e}`)).toBe(true); expect(existsSync(`${FB}/dismissed/${e}.md`)).toBe(true); expect(existsSync(`${FB}/${e}.md`)).toBe(false); expect(entries()).toEqual([])
})
test('dismiss refuses an unknown id, a posted entry and one already dismissed', () => {
  const all = (i: string) => { const r = F(['dismiss', i]); return r.out + r.err }
  expect(all('1/20000101-000000-9')).toContain('no unposted entry'); expect(all(`${S.split('/').pop()}/posted/${e1}`)).toContain('usage:'); expect(all(idd)).toContain('no unposted entry')
})
test('the reason of a dismissed stumble is still netted', () => {
  F(['add', 'bug', 'explore'], { stdin: text('explore was skipped', '', 'It said the billing-core service cannot boot here.') }); e = one(); idd = `${S.split('/').pop()}/${e}`
  refusedText('copies from an entry')
})
let out = ''
test('add prints the id of the entry', () => {
  desc('explore was skipped', '', 'A service the product needs could not start.'); flush()
  out = F(['add', 'bug', 'none'], { stdin: text('a summary', '', `it failed in ${process.env.HOME}/work`) }).out; e = one(); idd = `${S.split('/').pop()}/${e}`
  expect(has(out, `id: ${idd}`)).toBe(true)
})
test('a refused entry shows its id, so it can be described again or dismissed', () => {
  expect(draft()).toMatch(new RegExp(`^refused: ${FB}/${e}: `, 'm')); expect(has(draft(), `id: ${idd}`)).toBe(true)
  expect(F(['dismiss', idd]).code).toBe(0); expect(entries()).toEqual([]); expect(existsSync(`${FB}/dismissed/${e}`)).toBe(true)
})
test('dismiss takes several ids', () => {
  h(['phase', 'explore', 'skipped:', 'nothing', 'here']); h(['phase', 'mutate', 'skipped:', 'time'])
  expect(entries().length).toBe(2); expect(F(['dismiss', ...[...draft().matchAll(/^undescribed (.*): .*$/gm)].map((m) => m[1])]).code).toBe(0); expect(entries()).toEqual([])
})
test('dismiss with no id is a usage error', () => { const r = F(['dismiss']); expect(r.out + r.err).toContain('usage:') })

// a description in another script than ASCII is text like any other
test('bytes over 127 are text: the draft shows them as written', () => { F(['add', 'bug', 'none'], { stdin: text('a summary', '', 'café — tiếng Việt') }); expect(has(draft(), '| café — tiếng Việt')).toBe(true) })
test('and they are posted as written', () => { flush(); expect(log()).toContain('café — tiếng Việt') })

// the fields: a head with anything outside the allow-list is refused, by draft and by post
const B = `${FB}/20000101-000000-1`
const bad = (...l: string[]) => writeFileSync(B, [...l, '', 'detail hello'].join('\n') + '\n')
const refused = () => {
  const d = draft(), p = F(['post', `${S.split('/').pop()}/20000101-000000-1`, '0'])
  expect(d).toMatch(new RegExp(`^refused: ${B}: `, 'm')); expect(d).not.toMatch(/^entry .*20000101|hello/m); expect(p.out + p.err).toContain('refused'); expect(log()).not.toContain('create')
}
test('a path as a value is refused', () => { clearLog(); writeFileSync(`${B}.md`, text('a summary', '', 'a text')); bad('version=0.3.0', 'kind=cost', 'phase=/a/path'); refused() })
test('a field outside the list is refused', () => { bad('version=0.3.0', 'kind=cost', 'phase=implement', 'note=hello'); refused() })
test('a count that is not a number is refused', () => { bad('version=0.3.0', 'kind=cost', 'phase=implement', 'elapsed=12x'); refused() })
test('a field given twice is refused', () => { bad('version=0.3.0', 'kind=cost', 'kind=cost', 'phase=implement'); refused() })
test('a missing version is refused', () => { bad('kind=cost', 'phase=implement'); refused() })
test('a kind outside the list is refused', () => { bad('version=0.3.0', 'kind=fix', 'phase=implement'); refused() })
test('text after a phase name is refused', () => { bad('version=0.3.0', 'kind=cost', 'phase=implement and more'); refused() })
test('a line with an invalid byte is refused, not dropped', () => { writeFileSync(B, Buffer.concat([Buffer.from('version=0.3.0\nkind=cost\nphase=implement\nnote=caf'), Buffer.from([0xe9]), Buffer.from(' hello\n\ndetail hello\n')])); refused() })
test('an empty entry is refused', () => { writeFileSync(B, ''); refused() })
test('the same entry with only listed fields is accepted', () => {
  bad('version=0.3.0', 'kind=cost', 'phase=implement', 'elapsed=12')
  const d = draft(); expect(d).toMatch(/^entry .*\/20000101-000000-1$/m); expect(has(d, 'title: [feedback] implement cost: a summary')).toBe(true); expect(has(d, '| elapsed minutes: 12')).toBe(true)
})

// unavailable capabilities at setup
test('an unavailable capability records a setup-failure at setup', () => {
  flush(); writeFileSync(`${S}/capabilities.md`, 'suite | x | probe: pass | canary: pass |\ndb | unavailable: the customer database dump is not on this box\nui | unavailable: no headless driver in /opt/acme\n')
  h(['phase', 'setup']); e = one(); idd = `${S.split('/').pop()}/${e}`
  expect(headOf(`${FB}/${e}`)).toContain('unavailable_capabilities=2'); expect(headOf(`${FB}/${e}`)).toContain('phase=setup'); expect(read(`${FB}/${e}`)).toContain('/opt/acme'); expect(draft()).not.toContain('acme')
})
test('a later line of a detail is netted too', () => { clearLog(); desc('setup found two things unavailable', '', 'The second said: no headless driver in /opt/acme'); refusedText('copies from an entry') })

// the capped stop on a started run
test('the capped stop prints nothing and records one intervention', () => {
  desc('setup found two things unavailable', '', 'A data dump and a headless driver were missing, and nothing said so at the end.'); flush()
  start('resume'); stop(); stop(); stop(); out = stop(); e = one()
  expect(out).toBe(''); const hd = headOf(`${FB}/${e}`); for (const l of ['kind=intervention', 'phase=oracle', 'stop_blocks=3']) expect(hd).toContain(l)
})
test('a second capped stop prints nothing and records none', () => { expect(stop()).toBe(''); expect(entries()).toEqual([e]) })
test('a compaction still does not give the blocks back', () => { start('compact'); expect(stop()).toBe(''); expect(entries()).toEqual([e]) })
// a broken state file (a full disk leaves an empty one) must not break the hook or the loop
test('the capped stop survives an empty started', () => {
  writeFileSync(`${S}/started`, ''); start('resume'); stop(); stop(); stop()
  const r = sh([RUN, SCRIPT, 'hook-stop'], { stdin: '{}', env: { CLAUDE_PROJECT_DIR: R } })
  expect([r.code, r.out]).toEqual([0, '']); expect(read(`${S}/stop-blocks`).trim()).toBe('4')
})
test('so does a skipped phase', () => { const r = h(['phase', 'review', 'skipped:', 'nothing', 'to', 'review']); expect([r.code, r.out + r.err]).toEqual([0, '']); expect(h(['missing']).out).not.toContain('review') })

// the pass: a turn the user spends on feedback ends once
test('a feedback verb lets the turn end once, with no block counted', () => { start('resume'); flush(); expect(stop()).toBe(''); expect(read(`${S}/stop-blocks`).trim()).toBe('0'); expect(entries()).toEqual([]) })
test('the next stop blocks again', () => { expect(stop()).toContain('block') })
test('a new process drops a stale pass', () => { draft(); start('resume'); expect(existsSync(`${S}/pass`)).toBe(false) })
test('the pass goes to the session repository, wherever the verb ran', () => { F(['draft'], { cwd: T, env: { CLAUDE_PROJECT_DIR: `${T}/r` } }); expect(existsSync(`${S}/pass`)).toBe(true) })

// run numbers on what the user flags
let e3 = ''
test('add without a text leaves the entry undescribed', () => {
  writeFileSync(`${S}/started`, `${Math.floor(Date.now() / 1000) - 200000}\n`); F(['add', 'intervention', 'implement']); e = one()
  expect(draft()).toMatch(new RegExp(`^undescribed .*/${e}: intervention at implement$`, 'm'))
})
test('an elapsed over a day is left out, the counts stay', () => { const hd = headOf(`${FB}/${e}`); expect(hd.some((l) => l.startsWith('elapsed='))).toBe(false); expect(hd.some((l) => l.startsWith('oracle_files='))).toBe(true) })
test('a flagged escaped-bug on an unfinished run has no elapsed and no counts', () => { flush(); F(['add', 'escaped-bug', 'review']); e3 = one(); expect(headOf(`${FB}/${e3}`).length).toBe(3) })

// entries survive start; a finished run gives an escaped bug its numbers
test('entries survive start', () => {
  start('startup'); h(['start']) // a new session: the approved run of the one before is not started again in it
  expect(existsSync(`${FB}/${e3}`)).toBe(true); expect(existsSync(`${FB}/posted/${e1}`)).toBe(true); expect(existsSync(`${FB}/posted/${e1}.md`)).toBe(true); expect(readdirSync(`${FB}/dismissed`).length).toBeGreaterThan(0)
  expect(readdirSync(`${S}/old`).some((d) => existsSync(`${S}/old/${d}/feedback`))).toBe(false)
})
test('add prints the path of the entry', () => {
  flush(); specced(); noRecords(); for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final', 'records']) h(['phase', p]); h(['done'])
  writeFileSync(`${S}/started`, `${Number(read(`${S}/ended`)) - 600}\n`)
  expect(F(['add', 'escaped-bug', 'review']).out).toContain(`recorded: ${FB}/`)
})
test('with done, elapsed is ended minus started and the counts are there', () => { e = one(); const hd = headOf(`${FB}/${e}`); for (const l of ['elapsed=10', 'oracle_files=0', 'skipped_phases=0']) expect(hd).toContain(l) })
test('a pass written on a finished run is consumed by that stop', () => { expect(existsSync(`${S}/pass`)).toBe(true); expect(stop()).toBe(''); expect(existsSync(`${S}/pass`)).toBe(false) })

// collect
test('collect groups the open issues by phase and kind and lists each one', () => {
  writeFileSync(`${T}/bin/issues`, '12\t[feedback] explore bug: explorer never starts the server\n9\t[feedback] none enhancement: a dry-run flag\n15\t[feedback] explore bug: explorer ignores the CLI\n3\tsomething else\n'); clearLog()
  expect(F(['collect']).out).toBe('explore bug: 2\n  #12 explorer never starts the server\n  #15 explorer ignores the CLI\nnone enhancement: 1\n  #9 a dry-run flag\nother: 1\n  #3 something else')
})
test('collect asks for the open issues with the label, on the repo', () => { expect(log()).toMatch(/^gh \[issue\] \[list\] \[--repo\] \[emulatalk1\/hstack\] \[--label\] \[feedback\] \[--state\] \[open\]/m) })
test('feedback wrote nothing inside the project repository', () => { expect(git(['status', '--porcelain', '--ignored'])).toBe(before); expect(existsSync(`${R}/.git/hstack`)).toBe(false); expect(FB).toStartWith(`${T}/state/`) })

// a run recorded by 0.3.1 or earlier named step 4 build: it must not read as a run waiting at implement
test('a run recorded with the old step name misses no step it had', () => { writeFileSync(`${S}/phases`, 'setup\noracle\nbuild\ngate\nreview\nexplore\nmutate\nfinal\n'); expect(h(['missing']).out).toBe('spec records') })

// later sessions: a run of an earlier session is judged only by what this session changes (a repository of its own)
let S2 = '', b0 = ''
const run = (...phases: string[]) => { start('startup'); h(['start']); specced(); if (phases.includes('records')) noRecords(); for (const p of phases) h(['phase', p]) }
const commit = (file: string, content: string, msg: string) => { writeFileSync(`${R}/${file}`, content); git(['add', '-A']); git(['commit', '-qm', msg]) }
test('a new session allows after the user committed on a finished run', () => {
  R = `${T}/s`; cwd = R; repoAt(R); commit('a.txt', 'x = 1\n', 'base'); S2 = h(['dir']).out; b0 = git(['branch', '--show-current'])
  start('startup'); run('setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final', 'records'); h(['done'])
  commit('b.txt', 'y = 1\n', 'the user commits'); start('startup')
  expect(stop()).toBe('')
})
test('a new session allows on another branch than the finished run', () => { git(['checkout', '-q', '-b', 'other']); commit('b.txt', 'y = 2\n', 'another branch'); start('startup'); expect(stop()).toBe('') })
test('a new session allows with a file left untracked before it', () => { writeFileSync(`${R}/untracked.txt`, 'u\n'); start('startup'); expect(stop()).toBe('') })
test('a change made in the later session is let through (spec 9)', () => { writeFileSync(`${R}/a.txt`, 'x = 2\n'); expect(stop()).toBe('') })
test('a capped stop on a run of an earlier session records no feedback', () => {
  stop(); stop(); expect(stop()).toBe(''); expect(existsSync(`${S2}/feedback`)).toBe(false)
  git(['checkout', '-q', '--', 'a.txt']); rmSync(`${R}/untracked.txt`)
})
// an abandoned run
test('start takes the run into this session: it blocks with nothing changed', () => { start('startup'); run('setup', 'oracle'); expect(stop()).toContain('steps not recorded: implement') })
test('a resume of an unfinished run still blocks', () => { start('resume'); expect(stop()).toContain('steps not recorded: implement') })
test('a new session allows on an abandoned run', () => { start('startup'); expect(stop()).toBe('') })
test('and on another branch than the abandoned run', () => { git(['checkout', '-q', b0]); start('startup'); expect(stop()).toBe('') })
test('a change in the later session beside the abandoned run is let through (spec 9)', () => {
  writeFileSync(`${R}/a.txt`, 'x = 3\n'); const o = stop()
  expect(o).toBe('')
  git(['checkout', '-q', '--', 'a.txt'])
})

// two repositories: the session is launched in an outer folder that keeps the records, and the code is in a nested
// repository of its own, which the outer one ignores. A one-line file, .hstack/repo, points the script at it.
const O = `${T}/o`
const ostop = () => stop(O)
const hin = (dir: string, args: string[]) => h(args, { cwd: dir })
const outer = (dir: string) => {
  repoAt(dir); mkdirSync(`${dir}/docs`); writeFileSync(`${dir}/.gitignore`, 'code/\n'); writeFileSync(`${dir}/log.txt`, 'log\n'); writeFileSync(`${dir}/docs/a.md`, 'a\n')
  git(['add', '-A'], dir); git(['commit', '-qm', 'outer'], dir)
  repoAt(`${dir}/code`); writeFileSync(`${dir}/code/src`, 's\n'); git(['add', '-A'], `${dir}/code`); git(['commit', '-qm', 'code'], `${dir}/code`)
}
test('without a pointer, a change in the nested repository is not seen', () => {
  outer(O); start('startup', O); writeFileSync(`${O}/code/src`, 's\nx\n')
  expect(ostop()).toBe('')
  git(['checkout', '-q', '--', 'src'], `${O}/code`)
})
test('repo refuses an absolute path', () => { expect(hin(O, ['repo', `${O}/code`]).code).not.toBe(0); expect(existsSync(`${O}/.hstack/repo`)).toBe(false) })
test('repo refuses a path with ..', () => { expect(hin(O, ['repo', '../x']).code).not.toBe(0); expect(hin(O, ['repo', 'code/../code']).code).not.toBe(0) })
test('repo refuses a folder that is no repository', () => { expect(hin(O, ['repo', 'docs']).code).not.toBe(0); expect(hin(O, ['repo', 'gone']).code).not.toBe(0); expect(existsSync(`${O}/.hstack/repo`)).toBe(false) })
test('repo writes the pointer and prints the code repository', () => { expect(hin(O, ['repo', 'code']).out).toBe(`${O}/code`); expect(read(`${O}/.hstack/repo`).trim()).toBe('code') })
test('repo refuses when the pointer exists', () => { expect(hin(O, ['repo', 'code']).code).not.toBe(0) })
test('one state folder from the home, a subfolder and the code repository', () => {
  const inCode = hin(`${O}/code`, ['dir']).out
  expect(inCode).toStartWith(`${T}/state/`); expect(hin(O, ['dir']).out).toBe(inCode); expect(hin(`${O}/docs`, ['dir']).out).toBe(inCode)
})
test('home prints the records home, repo the code repository', () => { expect(hin(O, ['home']).out).toBe(O); expect(hin(O, ['repo']).out).toBe(`${O}/code`) })
test('home is still the records home after a verb has run inside the code repository', () => { hin(`${O}/code`, ['dir']); expect(hin(`${O}/code`, ['home']).out).toBe(O); expect(hin(O, ['home']).out).toBe(O) })
test('a hand-written pointer with a trailing space or newline is read without it', () => { writeFileSync(`${O}/.hstack/repo`, 'code \n\n'); expect(hin(O, ['repo']).out).toBe(`${O}/code`); writeFileSync(`${O}/.hstack/repo`, 'code\n') })
test('a change in the home alone does not block', () => { writeFileSync(`${O}/log.txt`, 'log\nn\n'); expect(ostop()).toBe('') })
test('a change in the code repository with no run is let through (spec 9)', () => { writeFileSync(`${O}/code/src`, 's\nx\n'); expect(ostop()).toBe(''); git(['checkout', '-q', '--', 'src'], `${O}/code`) })
test('repo gives the blocks back: an earlier cap in the code repository does not silence the gate', () => {
  const O2 = `${T}/o2`; outer(O2)
  writeFileSync(`${hin(`${O2}/code`, ['dir']).out}/stop-blocks`, '4\n') // an earlier session inside code/ ended at the cap
  start('startup', O2); expect(hin(O2, ['repo', 'code']).code).toBe(0)
  expect(hin(O2, ['start']).code).toBe(0) // a run of this session in the code repository: since spec 9 only such a run is held
  writeFileSync(`${O2}/code/src`, 's\nx\n')
  expect(stop(O2)).toContain('"decision":"block"')
})
test('a hand-written pointer to a missing folder: verbs say so, the stop hook allows, the start hook warns', () => {
  const O3 = `${T}/o3`; outer(O3); mkdirSync(`${O3}/.hstack`); writeFileSync(`${O3}/.hstack/repo`, 'gone\n')
  const d = hin(O3, ['dir']); expect(d.code).not.toBe(0); expect(d.err).toContain('hstack: .hstack/repo names gone, which is not a git repository')
  const s = sh([RUN, SCRIPT, 'hook-stop'], { stdin: '{}', env: { CLAUDE_PROJECT_DIR: O3 } }); expect([s.code, s.out]).toEqual([0, ''])
  expect(start('startup', O3)).toContain('.hstack/repo names gone')
  writeFileSync(`${O3}/.hstack/repo`, 'docs\n') // a folder of the outer repository is not a repository of its own
  expect(hin(O3, ['dir']).err).toContain('hstack: .hstack/repo names docs, which is not a git repository')
})
test('start keeps the records home', () => {
  const O4 = `${T}/o4`; outer(O4); hin(O4, ['repo', 'code']); hin(O4, ['start']); hin(O4, ['start'])
  expect(hin(`${O4}/code`, ['home']).out).toBe(O4)
})
test('spec takes a path relative to the launch folder, not to the code repository', () => {
  const O4 = `${T}/o4`; writeFileSync(`${O4}/docs/x.md`, 'the behaviours\n')
  const r = hin(O4, ['spec', 'docs/x.md']); expect(r.err).toBe(''); expect(r.code).toBe(0)
  expect(read(`${hin(O4, ['dir']).out}/spec`).split('\n')[0]).toBe(`${O4}/docs/x.md`)
})

// the spec: what the user and the agent agree on before anything is built (a repository of its own)
const P = `${T}/p`, SPEC = `${T}/p.md`
let S3 = ''
test('phase refuses while no spec is approved', () => {
  R = P; cwd = P; repoAt(P); mkdirSync(`${P}/src`); commit('src/a.txt', 'x = 1\n', 'base'); S3 = h(['dir']).out
  start('startup'); h(['start']); writeFileSync(SPEC, 'the behaviours\n')
  const r = h(['phase', 'setup']); expect(r.code).not.toBe(0); expect(r.err).toContain('no approved spec')
})
test('phase refuses the name spec, skipped or not', () => { expect(h(['phase', 'spec']).code).not.toBe(0); expect(h(['phase', 'spec', 'skipped:', 'time']).code).not.toBe(0); expect(read(`${S3}/phases`)).toBe('') })
test('spec refuses a missing file', () => { expect(h(['spec', `${T}/none.md`]).code).not.toBe(0) })
test('approve refuses when no spec waits', () => { expect(h(['approve']).code).not.toBe(0) })
test('spec refuses when code changed since the run started', () => {
  writeFileSync(`${P}/src/a.txt`, 'x = 1\ny\n'); const r = h(['spec', SPEC]); git(['checkout', '-q', '--', 'src/a.txt'])
  expect(r.code).not.toBe(0); expect(r.err).toContain('nothing is built before the spec is approved')
})
test('spec accepts a spec file that is itself new in the repository', () => {
  mkdirSync(`${P}/docs/specs`, { recursive: true }); writeFileSync(`${P}/docs/specs/x.md`, 'the behaviours\n')
  expect(h(['spec', 'docs/specs/x.md']).code).toBe(0); expect(read(`${S3}/spec`).split('\n')[0]).toBe(`${P}/docs/specs/x.md`)
  rmSync(`${P}/docs`, { recursive: true })
})
test('spec records the file', () => { expect(h(['spec', SPEC]).out).toContain('waits for the user'); expect(read(`${S3}/spec`).split('\n')[0]).toBe(SPEC) })
test('approve refuses a spec the user has not seen', () => { const r = h(['approve']); expect(r.code).not.toBe(0); expect(r.err).toContain('has not seen') })
test('a stop with a waiting spec is allowed and counts no block', () => { expect(stop()).toBe(''); expect(read(`${S3}/stop-blocks`).trim()).toBe('0') })
test('the stop stamps the wait', () => { expect(read(`${S3}/spec-shown`).trim()).not.toBe('') })
test('a change made while the spec waits blocks the stop', () => {
  writeFileSync(`${P}/src/a.txt`, 'x = 1\ny\n'); const o = stop(); git(['checkout', '-q', '--', 'src/a.txt'])
  expect(o).toContain('nothing is built before it')
})
test('approve refuses a spec changed after it was shown', () => { writeFileSync(SPEC, 'the behaviours\nmore\n'); const r = h(['approve']); expect(r.code).not.toBe(0); expect(r.err).toContain('changed after it was shown') })
test('a spec shown again loses its stamp', () => { h(['spec', SPEC]); expect(existsSync(`${S3}/spec-shown`)).toBe(false) })
test('approve records the step', () => {
  stop()
  const then = Math.floor(Date.now() / 1000) - 600 // the run began 10 minutes ago and has waited for the user since
  writeFileSync(`${S3}/started`, `${then}\n`); writeFileSync(`${S3}/spec-asked`, `${then}\n`)
  expect(h(['approve']).out).toBe('approved'); expect(lines(`${S3}/phases`)).toContain('spec')
})
test('the wait is off the clock', () => { expect(h(['elapsed']).out).toBe('0') })
test('after approval an unfinished run blocks again', () => { expect(stop()).toContain('steps not recorded: setup') })
test('spec refuses once setup is recorded', () => { expect(h(['phase', 'setup']).code).toBe(0); expect(h(['spec', SPEC]).code).not.toBe(0) })
test('start keeps a run whose spec waits', () => {
  start('startup'); h(['start']); const base = read(`${S3}/base`); h(['spec', SPEC]); const old = readdirSync(`${S3}/old`).length
  const r = h(['start'])
  expect(r.out).toBe(S3); expect(r.err).toContain(`a spec waits for the user's approval: ${SPEC}`)
  expect(read(`${S3}/base`)).toBe(base); expect(existsSync(`${S3}/spec`)).toBe(true); expect(readdirSync(`${S3}/old`).length).toBe(old)
})
test('spec --drop lets start move the run away', () => {
  const old = readdirSync(`${S3}/old`).length
  expect(h(['spec', '--drop']).code).toBe(0); expect(existsSync(`${S3}/spec`)).toBe(false)
  Bun.sleepSync(1100); h(['start']) // old/ folders are named by the second
  expect(readdirSync(`${S3}/old`).length).toBe(old + 1)
})
test('a new session shows the waiting spec and approve clears stale', () => {
  h(['spec', SPEC]); stop()
  expect(start('startup')).toContain(`A spec waits for the user's approval: ${SPEC}`); expect(existsSync(`${S3}/stale`)).toBe(true)
  expect(h(['approve']).out).toBe('approved'); expect(existsSync(`${S3}/stale`)).toBe(false)
})
test('a spec shown again in a new session is stamped and can be approved', () => {
  Bun.sleepSync(1100); start('startup'); h(['start']); h(['spec', SPEC]); stop(); start('startup') // the run is now an earlier session's
  writeFileSync(SPEC, 'the behaviours, changed as the user asked\n'); h(['spec', SPEC]); expect(existsSync(`${S3}/spec-shown`)).toBe(false)
  expect(stop()).toBe(''); expect(existsSync(`${S3}/spec-shown`)).toBe(true); expect(h(['approve']).out).toBe('approved')
})
test('the nudge no longer says nobody answers', () => { const n = start('resume'); expect(n).not.toContain('No human'); expect(n).toContain('a spec that the user approves') })

// the records step, and runs that 0.3.3 recorded (no spec line, no records line)
test('a run with every step but records is not finished', () => {
  Bun.sleepSync(1100); run('setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final')
  expect(h(['done']).code).not.toBe(0); expect(stop()).toContain('steps not recorded: records')
})
test('records cannot be skipped', () => { const r = h(['phase', 'records', 'skipped:', 'time']); expect(r.code).not.toBe(0); expect(r.err).toContain('the records step always runs'); expect(h(['missing']).out).toBe('records') })
test('records ends the list', () => { noRecords(); expect(h(['phase', 'records']).code).toBe(0); expect(h(['done']).out).toContain('done at') })
const old = (...steps: string[]) => { Bun.sleepSync(1100); start('startup'); h(['start']); writeFileSync(`${S3}/phases`, steps.join('\n') + '\n') } // a run as 0.3.3 recorded it: no spec line
test('a run finished by 0.3.3 lets a stop through', () => {
  old('setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final'); writeFileSync(`${S3}/done`, head() + '\n')
  expect(stop()).toBe('')
})
test('a change after a run finished by 0.3.3 is let through, and names no missing steps (spec 9)', () => {
  start('startup'); writeFileSync(`${P}/src/a.txt`, 'x = 1\nz\n'); const o = stop(); git(['checkout', '-q', '--', 'src/a.txt'])
  expect(o).toBe(''); expect(o).not.toContain('steps not recorded')
})
test('an unfinished 0.3.3 run cannot be continued and the block says so', () => {
  old('setup', 'oracle'); start('resume')
  expect(stop()).toContain('an hstack:build run of an earlier version was left unfinished and cannot be continued. Run hstack:build from its start.')
})
test('start moves the unfinished 0.3.3 run away', () => { Bun.sleepSync(1100); const n = readdirSync(`${S3}/old`).length; h(['start']); expect(read(`${S3}/phases`)).toBe(''); expect(readdirSync(`${S3}/old`).length).toBe(n + 1) })

// a ruling after the run: record files change, and nothing else, without a new run
const put = (file: string, content: string, msg: string) => { mkdirSync(`${P}/${file}`.replace(/\/[^/]*$/, ''), { recursive: true }); commit(file, content, msg) }
test('ruled refuses when no run is finished', () => { const r = h(['ruled']); expect(r.code).not.toBe(0); expect(r.err).toContain('no finished run') })
test('ruled moves done when only record files changed', () => {
  put('progress/features.json', '[]\n', 'records'); put('docs/specs/x.md', 'the spec\n', 'spec'); put('docs/specs/x.decisions.md', 'decided\n', 'decisions'); put('tests/t.txt', 'assert a\n', 'test')
  Bun.sleepSync(1100); run('setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final', 'records')
  writeFileSync(`${S3}/test-paths`, ':(glob)tests/**\n'); writeFileSync(`${S3}/record-paths`, 'progress/features.json\n:(glob)docs/specs/*.decisions.md\n')
  expect(h(['done']).code).toBe(0)
  put('progress/features.json', '[{"note":"Ruling (2026-11-20): pass"}]\n', 'a ruling'); put('docs/specs/x.decisions.md', 'decided\nRuling (2026-11-20): the user makes this theirs\n', 'a ruling on a decision')
  expect(stop()).toBe('') // spec 9: a change after a finished run is let through
  expect(h(['ruled']).out).toBe(`ruling recorded at ${head()}`); expect(read(`${S3}/done`).trim()).toBe(head()); expect(stop()).toBe('')
})
const refusedRuling = (file: string, content: string, back: string) => {
  put(file, content, 'a change'); const r = h(['ruled']); put(file, back, 'back')
  expect(r.code).not.toBe(0); expect(r.err).toContain(file); expect(h(['ruled']).code).toBe(0) // with the file back as it was, the ruling stands
}
test('ruled refuses a changed test file even when record-paths names it', () => {
  writeFileSync(`${S3}/record-paths`, 'progress/features.json\n:(glob)docs/specs/*.decisions.md\ntests/t.txt\n')
  refusedRuling('tests/t.txt', 'assert weaker\n', 'assert a\n')
})
test('ruled refuses a changed spec file', () => { refusedRuling('docs/specs/x.md', 'the spec, changed after its approval\n', 'the spec\n') })
test('ruled refuses an uncommitted change', () => {
  writeFileSync(`${P}/progress/features.json`, '[{"note":"not committed"}]\n'); const r = h(['ruled']); git(['checkout', '-q', '--', 'progress/features.json'])
  expect(r.code).not.toBe(0); expect(r.err).toContain('commit')
})
test('ruled refuses when a file outside the records changed', () => {
  put('src/a.txt', 'x = 1\nbuilt\n', 'code')
  const r = h(['ruled']); expect(r.code).not.toBe(0); expect(r.err).toContain('src/a.txt'); expect(stop()).toBe('') // spec 9: a change after a finished run is let through
})
test('the nudge says how a ruling is recorded', () => { expect(start('resume')).toContain('run hstack.ts ruled') })

// the feature list and the coverage file are two files: a check that they agree, which the records step cannot pass without
const Q = `${T}/q`
let S4 = ''
const FEATURES = [
  { description: 'the top option', spec: 'docs/specs/a.md', steps: ['it prints N lines', 'it refuses 0'], passes: true },
  { description: 'the help text', spec: 'docs/specs/a.md', steps: ['help lists the option'], passes: true },
  { description: 'an older feature', plan: 'docs/plans/old.md', steps: ['it counts words'], passes: true },
]
const ROWS = ['## Spec 1 (`docs/specs/a.md`)', '', '| Step | Coverage | Test or reason | Check |', '| --- | --- | --- | --- |', '| S1-F1-S1 | full | test_a | |', '| S1-F1-S2 | partial | test_b; by hand: the look | |', '| S1-F2-S1 | none | | |', '',
  '## Plan 8b.1 (`docs/plans/old.md`)', '', '| P8b.1-F1-S1 | manual | no code can check it | |']
const records = (features: unknown = FEATURES, rows: string[] = ROWS) => { writeFileSync(`${Q}/progress/feature_list.json`, JSON.stringify(features, null, 2)); writeFileSync(`${Q}/progress/test-coverage.md`, ['# Test coverage', '', ...rows].join('\n') + '\n') }
const check = () => h(['records-check', 'progress/feature_list.json', 'progress/test-coverage.md'])
const without = (row: string) => ROWS.filter((r) => !r.startsWith(row))
test('records-check accepts a feature list and a coverage file that agree', () => {
  R = Q; cwd = Q; repoAt(Q); for (const d of ['progress', 'docs/specs', 'docs/plans']) mkdirSync(`${Q}/${d}`, { recursive: true })
  writeFileSync(`${Q}/docs/specs/a.md`, 'a\n'); writeFileSync(`${Q}/docs/plans/old.md`, 'old\n'); commit('a.txt', 'x\n', 'base'); S4 = h(['dir']).out
  records(); const r = check()
  expect(r.out).toBe('records agree: 3 features, 4 steps'); expect(r.code).toBe(0)
})
test('a step with no coverage row is reported', () => { records(FEATURES, without('| S1-F1-S2')); const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('MISSING ROW S1-F1-S2') })
test('a coverage row with no step is reported', () => { records(FEATURES, [...ROWS.slice(0, 7), '| S1-F2-S2 | full | test_c | |', ...ROWS.slice(7)]); const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('EXTRA ROW S1-F2-S2') })
test('a feature whose spec has no section in the coverage file is reported', () => {
  records([...FEATURES, { description: 'new', spec: 'docs/specs/b.md', steps: ['x'], passes: false }]); writeFileSync(`${Q}/docs/specs/b.md`, 'b\n')
  const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('NO SECTION docs/specs/b.md')
})
test('a coverage level outside the list is reported', () => { records(FEATURES, ROWS.map((r) => r.replace('| S1-F1-S1 | full |', '| S1-F1-S1 | mostly |'))); const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('BAD COVERAGE S1-F1-S1: mostly') })
test('a row given twice is reported', () => { records(FEATURES, [...ROWS.slice(0, 5), '| S1-F1-S1 | full | test_a | |', ...ROWS.slice(5)]); const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('DUPLICATE ROW S1-F1-S1') })
test('a spec or plan file that does not exist is reported', () => {
  records(FEATURES.map((f) => ('plan' in f ? { ...f, plan: 'docs/plans/gone.md' } : f)), ROWS.map((r) => r.replace('docs/plans/old.md', 'docs/plans/gone.md')))
  const r = check(); expect(r.code).not.toBe(0); expect(r.out).toContain('NO FILE docs/plans/gone.md')
})
test('a feature list that is no list of features is refused', () => { records({ not: 'a list' }); expect(check().code).not.toBe(0); records([{ description: 'x', steps: 'not a list' }]); expect(check().code).not.toBe(0) })
test('phase records refuses until the records were checked', () => {
  start('startup'); h(['start']); specced(); for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final']) h(['phase', p])
  const r = h(['phase', 'records']); expect(r.code).not.toBe(0); expect(r.err).toContain('records-check')
  records(FEATURES, without('| S1-F1-S2')); check(); expect(h(['phase', 'records']).code).not.toBe(0) // a check that failed is no check
})
test('phase records refuses when a record changed after the check', () => {
  records(); expect(check().code).toBe(0)
  writeFileSync(`${Q}/progress/test-coverage.md`, read(`${Q}/progress/test-coverage.md`) + '\n')
  const r = h(['phase', 'records']); expect(r.code).not.toBe(0); expect(r.err).toContain('changed after the check')
})
test('phase records passes after a check of the records as they are', () => { expect(check().code).toBe(0); expect(h(['phase', 'records']).code).toBe(0); expect(lines(`${S4}/phases`)).toContain('records') })
test('records-check --none needs a reason and keeps it', () => {
  expect(h(['records-check', '--none']).code).not.toBe(0)
  expect(h(['records-check', '--none', 'the project keeps its records in a wiki']).code).toBe(0); expect(read(`${S4}/records-ok`)).toContain('the project keeps its records in a wiki')
})
test('start keeps the evidence of earlier runs: a log entry names files there', () => {
  mkdirSync(`${S4}/evidence/spec-1`, { recursive: true }); writeFileSync(`${S4}/evidence/spec-1/shot.txt`, 'what the explorer saw\n')
  Bun.sleepSync(1100); start('startup'); h(['start'])
  expect(read(`${S4}/evidence/spec-1/shot.txt`)).toBe('what the explorer saw\n'); expect(existsSync(`${S4}/records-ok`)).toBe(false)
})

// found by the review of the whole branch: each test is its own small repository
const fresh = (name: string) => {
  const d = `${T}/${name}`; R = d; cwd = d; repoAt(d); for (const f of ['src', 'tests', 'app', 'progress', 'docs/specs']) mkdirSync(`${d}/${f}`, { recursive: true })
  writeFileSync(`${d}/tests/t.txt`, 'assert a\nassert b\n'); writeFileSync(`${d}/docs/specs/v.md`, 'the behaviours\n'); writeFileSync(`${d}/docs/specs/other.md`, 'other\n'); writeFileSync(`${d}/app/x.txt`, 'x\n')
  commit('src/a.txt', 'x = 1\n', 'base'); start('startup'); return h(['dir']).out
}
const waitingSpec = (d: string) => { const f = `${T}/${d.split('/').pop()}-spec.md`; writeFileSync(f, 'the behaviours\n'); h(['start']); expect(h(['spec', f]).code).toBe(0); stop(); return f }
test('approve refuses when the code repository changed while the spec waited', () => {
  const s = fresh('v1'); waitingSpec(R); commit('src/a.txt', 'x = 1\nthe user changed this\n', 'the user commits')
  const r = h(['approve']); expect(r.code).not.toBe(0); expect(r.err).toContain('changed while the spec waited'); expect(read(`${s}/phases`)).toBe('')
})
test('a waiting spec of an earlier session lets a stop through when this session changed nothing', () => { start('startup'); expect(stop()).toBe('') })
test('a spec dropped for other work ends the run, and the stop goes through', () => {
  const s = h(['dir']).out; expect(h(['spec', '--drop']).code).toBe(0)
  expect(existsSync(`${s}/base`)).toBe(false); expect(existsSync(`${s}/spec`)).toBe(false); expect(stop()).toBe('')
})
test('start refuses an unfinished approved run of this session', () => {
  const s = fresh('v2'); h(['start']); specced(); h(['phase', 'setup']); writeFileSync(`${R}/src/a.txt`, 'x = 1\nhalf built\n'); const base = read(`${s}/base`)
  const r = h(['start']); expect(r.code).not.toBe(0); expect(r.err).toContain('not finished'); expect(read(`${s}/base`)).toBe(base); expect(lines(`${s}/phases`)).toContain('setup')
  expect(stop()).toContain('steps not recorded')
})
test('a new session may start another run in its place', () => { git(['checkout', '-q', '--', 'src/a.txt']); start('startup'); expect(h(['start']).code).toBe(0) })
test('repo refuses while a run is started in the launch folder', () => {
  fresh('v3'); writeFileSync(`${R}/.gitignore`, 'vendor/\n'); git(['add', '-A']); git(['commit', '-qm', 'ignore']); start('startup')
  repoAt(`${R}/vendor/lib`); writeFileSync(`${R}/vendor/lib/f`, 'f\n'); git(['add', '-A'], `${R}/vendor/lib`); git(['commit', '-qm', 'lib'], `${R}/vendor/lib`)
  h(['start']); specced(); h(['phase', 'setup'])
  const r = h(['repo', 'vendor/lib']); expect(r.code).not.toBe(0); expect(r.err).toContain('a run is started'); expect(existsSync(`${R}/.hstack/repo`)).toBe(false)
})
test('repo refuses a folder inside the code repository', () => {
  const O5 = `${T}/o5`; outer(O5); mkdirSync(`${O5}/code/sub`); writeFileSync(`${O5}/code/sub/f`, 'f\n'); git(['add', '-A'], `${O5}/code`); git(['commit', '-qm', 'sub'], `${O5}/code`)
  const r = hin(O5, ['repo', 'code/sub']); expect(r.code).not.toBe(0); expect(existsSync(`${O5}/.hstack/repo`)).toBe(false)
})
test('phase records refuses until final is recorded', () => {
  fresh('v4'); h(['start']); specced(); h(['phase', 'setup']); noRecords()
  const r = h(['phase', 'records']); expect(r.code).not.toBe(0); expect(r.err).toContain('final')
})
const recV = (features: unknown, rows: string[]) => { writeFileSync(`${R}/progress/feature_list.json`, JSON.stringify(features, null, 2)); writeFileSync(`${R}/progress/test-coverage.md`, ['# Test coverage', '', ...rows].join('\n') + '\n') }
const checkV = () => h(['records-check', 'progress/feature_list.json', 'progress/test-coverage.md'])
const ONE = (spec: string) => [{ description: 'f', spec, steps: ['a step'], passes: true }]
const SEC = (n: number, spec: string) => [`## Spec ${n} (\`${spec}\`)`, '', `| S${n}-F1-S1 | full | t | |`]
test('records-check refuses when no feature names the approved spec', () => {
  const s = fresh('v5'); h(['start']); expect(h(['spec', 'docs/specs/v.md']).code).toBe(0); stop(); expect(h(['approve']).out).toBe('approved')
  recV(ONE('docs/specs/other.md'), SEC(1, 'docs/specs/other.md')); const r = checkV(); expect(r.code).not.toBe(0); expect(r.out).toContain('NO FEATURE for the approved spec docs/specs/v.md'); expect(existsSync(`${s}/records-ok`)).toBe(false)
  recV(ONE('docs/specs/v.md'), SEC(1, 'docs/specs/v.md')); expect(checkV().code).toBe(0)
})
test('done refuses when a record changed after the check', () => {
  for (const p of ['setup', 'oracle', 'implement', 'gate', 'review', 'explore', 'mutate', 'final', 'records']) expect(h(['phase', p]).code).toBe(0)
  writeFileSync(`${R}/progress/test-coverage.md`, read(`${R}/progress/test-coverage.md`) + '\nnot checked\n'); git(['add', '-A']); git(['commit', '-qm', 'records'])
  const r = h(['done']); expect(r.code).not.toBe(0); expect(r.err).toContain('changed after the check')
})
test('two sections with the same head are reported', () => {
  fresh('v6'); recV([...ONE('docs/specs/v.md'), ...ONE('docs/specs/other.md')], [...SEC(1, 'docs/specs/v.md'), '', '## Spec 1 (`docs/specs/other.md`)'])
  const r = checkV(); expect(r.code).not.toBe(0); expect(r.out).toContain('DUPLICATE SECTION S1')
})
test('a row under another section than its own is reported', () => {
  recV([...ONE('docs/specs/v.md'), ...ONE('docs/specs/other.md')], ['## Spec 1 (`docs/specs/v.md`)', '', '## Spec 2 (`docs/specs/other.md`)', '', '| S1-F1-S1 | full | t | |', '| S2-F1-S1 | full | t | |'])
  const r = checkV(); expect(r.code).not.toBe(0); expect(r.out).toContain('ROW UNDER ANOTHER SECTION S1-F1-S1')
})
test('records-check accepts a spec path with non-ASCII letters', () => {
  writeFileSync(`${R}/docs/specs/tiếng việt.md`, 'x\n'); recV(ONE('docs/specs/tiếng việt.md'), SEC(1, 'docs/specs/tiếng việt.md'))
  const r = checkV(); expect(r.out).toBe('records agree: 1 features, 1 steps'); rmSync(`${R}/docs/specs/tiếng việt.md`); rmSync(`${R}/progress/feature_list.json`); rmSync(`${R}/progress/test-coverage.md`)
})
test('spec accepts a spec file with a space and a non-ASCII letter in its name', () => {
  h(['start']); writeFileSync(`${R}/docs/specs/tiếng việt.md`, 'các hành vi\n')
  const r = h(['spec', 'docs/specs/tiếng việt.md']); expect(r.err).toBe(''); expect(r.code).toBe(0)
})
test('gate from a subfolder reports a removed line', () => {
  const s = fresh('v7'); h(['start']); specced(); writeFileSync(`${s}/test-paths`, ':(glob)tests/**\n'); writeFileSync(`${R}/tests/t.txt`, 'assert b\n')
  expect(hin(R, ['gate']).out).toContain('REMOVED tests/t.txt: assert a'); expect(hin(`${R}/app`, ['gate']).out).toContain('REMOVED tests/t.txt: assert a')
})
test('a description with the path of the records home is refused, and its folder name gives the warning', () => {
  flush(); const AO = `${T}/acme-outer`; outer(AO); hin(AO, ['repo', 'code'])
  F(['add', 'bug', 'none'], { cwd: AO, stdin: text('a summary', '', `it failed in ${AO}/progress/test-coverage.md`) })
  expect(draft()).toMatch(/^refused: .*: the description holds a path of this machine/m)
  F(['describe', refusedId()], { cwd: AO, stdin: text('a summary', '', 'seen while building acme-outer') })
  expect(draft()).toMatch(/^warning: .*acme-outer/m); flush()
})
test('the reviewer passes a changed test only for an item the user approved', async () => {
  const t = await Bun.file(join(import.meta.dir, '../agents/reviewer.md')).text()
  expect(t).toContain('an item that the user approved under "Against the record"'); expect(t).not.toContain('an item the approved spec lists under')
})
test('the session-start text sends an approval to the playbook, and never tells the agent to run approve by itself', () => {
  fresh('v8'); waitingSpec(R); const n = start('startup')
  expect(n).toContain('A spec waits'); expect(n).not.toContain('run `hstack.ts approve`'); expect(n).toContain('step 1')
})
test('two runs moved away in the same second keep a folder each', () => {
  const s = fresh('v9'); const n = () => (existsSync(`${s}/old`) ? readdirSync(`${s}/old`).length : 0)
  const once = () => { const f = `${T}/v9-${n()}.md`; writeFileSync(f, 'the behaviours\n'); h(['start']); h(['spec', f]); expect(h(['spec', '--drop']).code).toBe(0) }
  once(); once(); once()
  expect(n()).toBe(3)
})

// the time of each step: the state file phase-times and the verb times
let PT = ''
const marks = () => lines(`${PT}/phase-times`)
const timesOf = (started: string, text: string) => { writeFileSync(`${PT}/started`, started); writeFileSync(`${PT}/phase-times`, text); return h(['times']) }
test('approve and phase append a mark to phase-times', () => {
  PT = fresh('pt'); h(['start']); specced(); expect(h(['phase', 'setup']).code).toBe(0)
  const m = marks(); expect(m.length).toBe(2); expect(m[0]).toMatch(/^\d+ spec$/); expect(m[1]).toMatch(/^\d+ setup$/)
})
test('a skipped step is marked with its whole line', () => {
  expect(h(['phase', 'explore', 'skipped:', 'time']).code).toBe(0); expect(marks().at(-1)).toMatch(/^\d+ explore skipped: time$/)
})
test('phases is unchanged by the marks', () => { expect(read(`${PT}/phases`)).toBe('spec\nsetup\nexplore skipped: time\n') })
test('times prints the minutes of each mark and the total', () => {
  const r = timesOf('1000\n', '1120 spec\n1330 setup\n1330 explore skipped: time\n1870 final\n1930 final\n')
  expect(r.code).toBe(0); expect(r.out).toBe('spec 2.0\nsetup 3.5\nexplore 0.0 skipped\nfinal 9.0\nfinal 1.0\ntotal 15.5')
})
test('a mark before the one before it counts as zero', () => { expect(timesOf('1000\n', '1120 spec\n1100 setup\n').out).toBe('spec 2.0\nsetup 0.0\ntotal 1.7') })
test('a line that is no mark is left out', () => { expect(timesOf('1000\n', 'junk\n1120 spec\n').out).toBe('spec 2.0\ntotal 2.0') })
test('times without marks says so', () => {
  const none = (r: { code: number | null; out: string }) => { expect(r.code).toBe(0); expect(r.out).toBe('no times recorded') }
  none(timesOf('1000\n', '')); none(timesOf('', '1120 spec\n'))
  writeFileSync(`${PT}/started`, '1000\n'); rmSync(`${PT}/phase-times`); none(h(['times']))
})
test('phase records the step when phase-times cannot be written', () => {
  mkdirSync(`${PT}/phase-times`)
  expect(h(['phase', 'oracle']).code).toBe(0); expect(lines(`${PT}/phases`).at(-1)).toBe('oracle')
  rmSync(`${PT}/phase-times`, { recursive: true })
})
let ptOld = ''
test('start moves the marks to old/ with the run', () => {
  writeFileSync(`${PT}/phase-times`, '1120 spec\n'); start('startup'); expect(h(['start']).code).toBe(0)
  const olds = readdirSync(`${PT}/old`); expect(olds.length).toBe(1); ptOld = olds[0]
  expect(read(`${PT}/old/${ptOld}/phase-times`)).toBe('1120 spec\n'); expect(existsSync(`${PT}/phase-times`)).toBe(false)
})
test('times --all prints each run under its folder', () => {
  expect(h(['times', '--all']).out).toBe(`run old/${ptOld}\nspec 2.0\ntotal 2.0\nrun current\nno times recorded`)
})
