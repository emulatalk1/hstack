import { test, expect, spyOn, afterAll } from 'bun:test'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { boxEnv, removeRecorded, SERVE_EMPTY, suiteRun } from '../bench/ext.mjs'
import { h5, portEdit } from '../bench/h5.mjs'
import { editCommit } from '../bench/oracle.mjs'
import { oracleFiles } from '../bench/grade.mjs'
import { oracleSha } from '../bench/lib/oracle.mjs'
import { releaseRoot } from './bench-root.mjs'

// H5 (step 13 ruling 9) on a fixture data folder: a store with the base and two products, a sealed repo that reaches another repo
// first, kept bugs with checks. grade, the porter and the suite are injected; the suite run itself needs BENCH_EXT_DOCKER=1
const DOCKER = process.env.BENCH_EXT_DOCKER === '1'
const dtest = DOCKER ? test : test.skip
const dropRoot = releaseRoot()
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-h5-')))
const docked = [] // the suite-run fixtures: their recorded names are removed at the end
afterAll(async () => {
  for (const d of docked) await removeRecorded(d.data, d.task, d.slug)
  rmSync(tmp, { recursive: true, force: true })
  dropRoot()
}, 600000)
const json = (f) => JSON.parse(readFileSync(f, 'utf8'))
const gitIn = (dir, ...a) => {
  const p = Bun.spawnSync(['git', '-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { stdout: 'pipe', stderr: 'pipe' })
  return { code: p.exitCode, out: p.stdout.toString().trim() }
}
const git = (dir, ...a) => gitIn(dir, ...a).out
const lines = (f) => Array.from({ length: 20 }, (_, i) => `const l${i + 1} = ${f(i + 1)}`).join('\n') + '\n'
const platform = process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'

const TASK = 's1-01', CHECK1 = 'aaaaaaa-T1', CHECK2 = 'aaaaaaa-T2'
const BUG1 = 'sb-s1-01-1', BUG2 = 'sb-s1-01-2'
// a data folder: the store (ext/repos/<key>) with the base and the products of H 1 (test files added, one deleted) and H 2 (none),
// the sealed repo pointing at a copy of the base only, the box task files, the seeded bugs and oracle
function world(name, { owner = 'o' } = {}) {
  const d = join(tmp, name), src = join(d, 'src'), key = `${owner}__r`, store = join(d, 'ext/repos', key), sealed = join(d, 'seeded/repos', `${key}.git`), copy = join(d, 'copy')
  for (const x of ['ext/repos', 'results', 'briefs', 'seeded/repos', `${TASK}/seeded/oracle`]) mkdirSync(join(d, x), { recursive: true })
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  mkdirSync(join(src, 'src'), { recursive: true }); mkdirSync(join(src, 'tests'))
  git(src, 'init', '-q')
  writeFileSync(join(src, 'src/app.js'), lines((n) => n))
  writeFileSync(join(src, 'tests/old.test.js'), 'old\n')
  writeFileSync(join(src, 'tests/kept.test.js'), 'kept\n')
  git(src, 'add', '-A'); git(src, 'commit', '-qm', 'base')
  const base = git(src, 'rev-parse', 'HEAD')
  git(src, 'clone', '-q', '--bare', src, copy) // the sealed repo's first source: it has the base and no product
  git(src, 'checkout', '-qb', 'bench/s1-01-h-1')
  writeFileSync(join(src, 'tests/env.test.js'), 'env\n') // the box's starting tree: a test path, not the arm's
  git(src, 'add', '-A'); git(src, 'commit', '-qm', 'env')
  const env1 = git(src, 'rev-parse', 'HEAD')
  writeFileSync(join(src, 'src/app.js'), lines((n) => (n === 5 ? 'five' : n)))
  mkdirSync(join(src, 'checks')); mkdirSync(join(src, 'docs'))
  writeFileSync(join(src, 'tests/new.test.js'), 'new\n')
  writeFileSync(join(src, 'checks/extra.sh'), 'extra\n') // a test path of the stack only
  writeFileSync(join(src, 'docs/notes.md'), 'notes\n')
  rmSync(join(src, 'tests/old.test.js'))
  git(src, 'add', '-A'); git(src, 'commit', '-qm', 'h1')
  const p1 = git(src, 'rev-parse', 'HEAD')
  git(src, 'checkout', '-q', base); git(src, 'checkout', '-qb', 'bench/s1-01-h-2')
  writeFileSync(join(src, 'src/app.js'), lines((n) => (n === 6 ? 'six' : n)))
  git(src, 'commit', '-qam', 'h2')
  const p2 = git(src, 'rev-parse', 'HEAD')
  git(d, 'clone', '-q', '--bare', src, store)
  git(d, 'init', '-q', '--bare', sealed)
  writeFileSync(join(sealed, 'objects/info/alternates'), `${join(copy, 'objects')}\n`)
  writeFileSync(join(d, 'ext/sample.tsv'), `task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup\n${TASK}\ts1\t1\t1\t${owner}/r#7\tu\t7\t3\t${base}\t${base}\tmerge\t1\t\t${platform}\tno\n`)
  writeFileSync(join(d, 'ext/groups.json'), JSON.stringify({ seed: 'x', groups: [{ id: 's1', testPaths: ['(^|/)checks/'] }] }))
  for (const n of [1, 2]) writeFileSync(join(d, 'results', `${TASK}-H-${n}.json`), JSON.stringify({ arm: 'H', run: n, branch: `bench/s1-01-h-${n}`, machine: null, ...(n === 1 ? { envCommit: env1 } : {}) }))
  mkdirSync(join(d, 'step13'), { recursive: true })
  writeFileSync(join(d, 'step13/floor.json'), JSON.stringify({ [TASK]: { H: 0, B: 0, W: 0 } }))
  writeFileSync(join(d, 'briefs/porter.md'), 'PORTER BRIEF\n')
  const bug = (n, check, find, replace, state = 'kept') => ({ id: `sb-s1-01-${n}`, task: TASK, base, end: null, fix: base, check, edge: 'boundary', severity: 'high',
    description: `DESC-${n} the total is off`, behaviour: `BEHAVIOUR-${n}`, hunk: null, edit: { file: 'src/app.js', find, replace }, state, why: null })
  writeFileSync(join(d, TASK, 'seeded/bugs.json'), JSON.stringify([bug(1, CHECK1, 'const l12 = 12', 'const l12 = 13'), bug(2, CHECK2, 'const l14 = 14', 'const l14 = 15'),
    bug(3, 'aaaaaaa-T3', 'const l16 = 16', 'const l16 = 17', 'dropped')]))
  writeFileSync(join(d, TASK, 'seeded/oracle/manifest.json'), JSON.stringify([CHECK1, CHECK2].map((id) => ({ id, interface: 'http' }))))
  writeFileSync(join(d, TASK, 'seeded/oracle', `${CHECK1}.sh`), 'ORACLE-SECRET\n')
  const w = { d, store, sealed, copy, base, p1, p2, key, env1 }
  withMachine(w, () => { boxEnv([TASK], { data: d }); boxEnv([TASK, '--seeded'], { data: d }) })
  return w
}
function withMachine(w, fn) {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(w.d, 'machine.json')
  const done = () => { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
  let r
  try { r = fn() } catch (e) { done(); throw e }
  if (r instanceof Promise) return r.finally(done)
  done()
  return r
}
const arg = (a, k) => a[a.indexOf(k) + 1]
// the port's bug, from the h5 ref that points at the commit
const bugAt = (w, sha) => git(w.sealed, 'for-each-ref', '--points-at', sha, '--format=%(refname:lstrip=2)', 'refs/h5/')
// fakes: grade writes the grade --out names (results at P, else at the port), the porter replies the bug's own edit (or reply(bug)),
// the suite writes a JUnit per commit (cases at P, else per bug)
// atP: the results at P, or a list of them, one per grade; notReady: per port, how many grades there leave a `not ready` readiness line first;
// suiteStatus: per commit ('P', or a port's `<arm>-<run>/<bug>`) the suite's status, or a list of them, one per run ('ok' when none is left);
// a status other than 'ok' writes no JUnit. down: the machine reads as failed
function fakes(w, { atP, atE = {}, reply, suiteP = [], suiteE = {}, agentCode = 0, suiteStatus = {}, notReady = {}, down = false }) {
  const calls = { grade: [], agent: [], prompts: [], suite: [] }
  const grade = async (a) => {
    const sha = arg(a, '--at')
    calls.grade.push({ env: a[0], oracle: a[1], sha, args: a })
    const isP = sha === w.p1 || sha === w.p2, key = bugAt(w, sha), never = !isP && (notReady[key] ?? 0) > 0
    if (never) notReady[key]--
    const res = isP ? (Array.isArray(atP) ? atP.shift() ?? {} : atP) : never ? {} : atE[key] ?? {}
    // oracle-run's readiness line of this commit and oracle, as the real grade leaves it
    mkdirSync(join(w.d, TASK, 'build'), { recursive: true })
    appendFileSync(join(w.d, TASK, 'build/readiness.tsv'), `${sha.slice(0, 7)}\t${oracleSha(oracleFiles(a[1])).slice(0, 8)}\t${never ? 'not ready' : 'ready'}\n`)
    writeFileSync(arg(a, '--out'), JSON.stringify({ commit: sha, junit: 'ok', checks: Object.entries(res).map(([id, result]) => ({ id, result })) }))
    return 0
  }
  const agent = async (a) => {
    const out = arg(a, '--out'), prompt = readFileSync(arg(a, '--prompt'), 'utf8'), bug = /DESC-(\d)/.exec(prompt)?.[1]
    calls.agent.push(a); calls.prompts.push(prompt)
    const bugs = json(join(w.d, TASK, 'seeded/bugs.json'))
    if (agentCode === 0) writeFileSync(out, reply ? reply(bug) : `Here:\n${JSON.stringify(bugs[bug - 1].edit)}\n`)
    writeFileSync(`${out}.run.json`, JSON.stringify({ code: agentCode }))
    return agentCode ? 1 : 0
  }
  const suite = async (a) => {
    const sha = arg(a, '--at'), files = readFileSync(arg(a, '--files'), 'utf8').split('\n').filter(Boolean)
    calls.suite.push({ env: a[0], sha, files })
    const k = sha === w.p1 || sha === w.p2 ? 'P' : bugAt(w, sha), v = suiteStatus[k], status = Array.isArray(v) ? v.shift() ?? 'ok' : v ?? 'ok'
    if (status !== 'ok') return status
    const cases = sha === w.p1 || sha === w.p2 ? suiteP : suiteE[bugAt(w, sha)] ?? []
    writeFileSync(arg(a, '--out'), `<testsuite>${cases.map(([n, s]) => `<testcase classname="fx" name="${n}">${s === 'fail' ? '<failure/>' : ''}</testcase>`).join('')}</testsuite>`)
    return 'ok'
  }
  return { calls, inj: { data: w.d, grade, agent, suite, machineDown: async () => down } }
}
async function run(w, args, inj) {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await withMachine(w, () => h5(args, inj)), out } } finally { a.mockRestore() }
}
const box = (w) => join(w.d, 'env/box', `${TASK}.json`), seededBox = (w) => join(w.d, 'env/box-seeded', `${TASK}.json`)
const rows = (w, n = 1) => json(join(w.d, TASK, 'seeded/h5', `H-${n}.json`))

test('box-env --seeded changes only repo', () => {
  const w = world('seeded-env')
  expect(json(seededBox(w))).toEqual({ ...json(box(w)), repo: w.sealed })
  // the sealed repo keeps its first source and now reaches the store's objects: a product only the store has
  const alt = () => readFileSync(join(w.sealed, 'objects/info/alternates'), 'utf8')
  expect(alt()).toBe(`${join(w.copy, 'objects')}\n${join(w.store, 'objects')}\n`)
  expect(git(w.sealed, 'cat-file', '-t', w.p1)).toBe('commit')
  withMachine(w, () => boxEnv([TASK, '--seeded'], { data: w.d }))
  expect(alt()).toBe(`${join(w.copy, 'objects')}\n${join(w.store, 'objects')}\n`) // added once
  // no sealed repo yet: made bare and empty, reaching the store
  rmSync(w.sealed, { recursive: true }); rmSync(seededBox(w))
  withMachine(w, () => boxEnv([TASK, '--seeded'], { data: w.d }))
  expect(git(w.sealed, 'rev-parse', '--is-bare-repository')).toBe('true')
  expect(alt()).toBe(`${join(w.store, 'objects')}\n`)
  expect(json(seededBox(w))).toEqual({ ...json(box(w)), repo: w.sealed })
})

test('a fail at the product is a miss with no porter', async () => {
  const w = world('miss'), f = fakes(w, { atP: { [CHECK1]: 'fail', [CHECK2]: 'precondition' } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r).toEqual({ code: 0, out: [`h5 ${TASK} H 1 bugs=2 miss=1 ported=0 caught=0 na=1 refused=0 notready=0 nosuite=0`] })
  expect(rows(w)).toEqual([{ bug: BUG1, at: 'fail', port: null, testFiles: 2, suite: null, caught: false }, { bug: BUG2, at: 'precondition', port: null, testFiles: 2, suite: null, caught: null }])
  expect(f.calls.agent).toEqual([])
  expect(f.calls.suite).toEqual([])
  // one grade, at P, of the seeded oracle through the box task file
  expect(f.calls.grade.map((g) => [g.env, g.oracle, g.sha])).toEqual([[box(w), join(w.d, TASK, 'seeded/oracle'), w.p1]])
  expect(f.calls.grade[0].args).toContain('--sealed')
})

test('the porter\'s prompt holds no check', async () => {
  const w = world('prompt'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'fail' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' } } })
  await run(w, [TASK, 'H', '1'], f.inj)
  expect(f.calls.prompts.length).toBe(1)
  const p = f.calls.prompts[0], bug = json(join(w.d, TASK, 'seeded/bugs.json'))[0]
  expect(p).toStartWith('PORTER BRIEF\n')
  for (const s of [bug.description, bug.edit.find, bug.edit.replace, bug.edit.file]) expect(p).toContain(s)
  for (const s of [CHECK1, CHECK2, 'aaaaaaa', 'ORACLE-SECRET', 'seeded/oracle', 'BEHAVIOUR-1', 'DESC-2', 'const l14', 'DESC-3', 'bugs.json', w.d]) expect(p).not.toContain(s)
  // P's files and nothing else: the store's task file at P, read tools only, no settings
  const a = f.calls.agent[0]
  expect(a.slice(0, 2)).toEqual([box(w), `h5-h-1-${BUG1}`])
  expect(arg(a, '--at')).toBe(w.p1)
  expect(arg(a, '--tools')).toBe('Read,Glob,Grep')
  expect(a).not.toContain('--settings')
})

test('a port lands only in the sealed repo', async () => {
  const w = world('lands'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } } })
  const storeRefs = git(w.store, 'for-each-ref')
  await run(w, [TASK, 'H', '1'], f.inj)
  const e = git(w.sealed, 'rev-parse', `refs/h5/H-1/${BUG1}`)
  expect(git(w.sealed, 'rev-parse', `${e}^`)).toBe(w.p1)
  expect(git(w.sealed, 'diff', '--name-only', w.p1, e)).toBe('src/app.js')
  expect(git(w.sealed, 'show', `${e}:src/app.js`)).toContain('const l12 = 13')
  expect(gitIn(w.store, 'cat-file', '-e', e).code).not.toBe(0) // the arm's store has neither the commit nor a ref
  expect(git(w.store, 'for-each-ref')).toBe(storeRefs)
  expect(git(w.sealed, 'for-each-ref', '--format=%(refname)', 'refs/seeded/')).toBe('')
  // every grade and suite run at P + edit goes through the seeded box file
  for (const g of f.calls.grade.filter((x) => x.sha !== w.p1)) expect(g.env).toBe(seededBox(w))
  for (const s of f.calls.suite) expect(s.env).toBe(s.sha === w.p1 ? box(w) : seededBox(w))
})

test('a port that does not flip the check is not applicable', async () => {
  const w = world('flip'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'pass' }, [`H-1/${BUG2}`]: { [CHECK2]: 'error' } } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r.out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=0 ported=0 caught=0 na=2 refused=0 notready=0 nosuite=0`])
  expect(rows(w)).toEqual([BUG1, BUG2].map((bug) => ({ bug, at: 'pass', port: 'not-applicable', testFiles: 2, suite: null, caught: null })))
  expect(f.calls.suite).toEqual([])
})

test('a port the gates refuse is refused and leaves no ref', async () => {
  const replies = { 1: { file: 'tests/new.test.js', find: 'new', replace: 'old' }, 2: { file: 'src/app.js', find: 'const l1', replace: 'x' } } // a test file; find twice
  const w = world('refused'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, reply: (n) => JSON.stringify(replies[n]) })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r.out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=0 ported=0 caught=0 na=0 refused=2 notready=0 nosuite=0`]) // refused apart from na
  expect(rows(w).map((x) => [x.port, x.caught])).toEqual([['refused', null], ['refused', null]])
  expect(git(w.sealed, 'for-each-ref', 'refs/h5/')).toBe('')
  const bug = json(join(w.d, TASK, 'seeded/bugs.json'))[0], work = join(w.d, TASK, 'seeded/h5/x')
  const port = (reply) => withMachine(w, () => portEdit({ data: w.d, task: TASK, bug, product: w.p1, run: '9', work: `${work}${Math.random()}`, agent: fakes(w, { atP: {}, reply: () => reply }).inj.agent }))
  const span = Array.from({ length: 6 }, (_, i) => `const l${i + 12} = ${i + 12}`).join('\n')
  expect(await port(JSON.stringify({ file: 'src/app.js', find: span, replace: span.replace('l12 = 12', 'l12 = 0').replace('l17 = 17', 'l17 = 0') }))).toEqual({ refused: 'hunks' })
  expect(await port('no edit here')).toEqual({ refused: 'reply' })
  expect(await port(JSON.stringify({ file: 'src/app.js', find: 'const l12 = 12', replace: 'const l12 = 13' }))).toMatchObject({ edit: { file: 'src/app.js' }, commit: expect.stringMatching(/^[0-9a-f]{40}$/) })
  expect(git(w.sealed, 'for-each-ref', '--format=%(refname)', 'refs/h5/')).toBe(`refs/h5/9/${BUG1}`)
})

test('caught needs a test that passes at P and fails or is absent at P + edit', async () => {
  // a fails at P; b and c pass at P. The first port: a still fails, b and c pass (not caught). The second: c is absent (caught)
  const w = world('caught'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } },
    suiteP: [['a', 'fail'], ['b', 'pass'], ['c', 'pass']], suiteE: { [`H-1/${BUG1}`]: [['a', 'fail'], ['b', 'pass'], ['c', 'pass']], [`H-1/${BUG2}`]: [['a', 'pass'], ['b', 'pass']] } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r).toEqual({ code: 0, out: [`h5 ${TASK} H 1 bugs=2 miss=1 ported=2 caught=1 na=0 refused=0 notready=0 nosuite=0`] })
  expect(rows(w)).toEqual([{ bug: BUG1, at: 'pass', port: 'ported', testFiles: 2, suite: 'ok', caught: false }, { bug: BUG2, at: 'pass', port: 'ported', testFiles: 2, suite: 'ok', caught: true }])
  // the product's own test files: added or changed since the run's envCommit under a test path (env's, a deleted one and the base's untouched
  // one left out); P's suite once
  expect(f.calls.suite.map((s) => s.files)).toEqual([['checks/extra.sh', 'tests/new.test.js'], ['checks/extra.sh', 'tests/new.test.js'], ['checks/extra.sh', 'tests/new.test.js']])
  expect(f.calls.suite.map((s) => s.sha === w.p1)).toEqual([true, false, false])
  // a rerun reuses the porter's replies: no second porter run
  await run(w, [TASK, 'H', '1'], f.inj)
  expect(f.calls.agent.length).toBe(2)
})

test('a product with no test file is a miss', async () => {
  const w = world('nofile'), f = fakes(w, { atP: { [CHECK1]: 'pass' }, atE: { [`H-2/${BUG1}`]: { [CHECK1]: 'fail' } } })
  const r = await run(w, [TASK, 'H', '2'], f.inj)
  expect(r.out).toEqual([`h5 ${TASK} H 2 bugs=2 miss=1 ported=1 caught=0 na=1 refused=0 notready=0 nosuite=0`])
  expect(rows(w, 2)).toEqual([{ bug: BUG1, at: 'pass', port: 'ported', testFiles: 0, suite: null, caught: false }, { bug: BUG2, at: 'error', port: null, testFiles: 0, suite: null, caught: null }])
  expect(f.calls.suite).toEqual([])
})

test('a suite at P with no JUnit is counted under nosuite, never a miss', async () => {
  const w = world('nosuite'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } }, suiteStatus: { P: 'missing' } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r).toEqual({ code: 0, out: [`h5 ${TASK} H 1 bugs=2 miss=0 ported=2 caught=0 na=0 refused=0 notready=0 nosuite=2`] })
  expect(rows(w)).toEqual([BUG1, BUG2].map((bug) => ({ bug, at: 'pass', port: 'ported', testFiles: 2, suite: 'missing', caught: null })))
  expect(f.calls.suite.map((s) => s.sha)).toEqual([w.p1]) // P's suite once, and no suite at a port it cannot be compared with
})

test('a suite at P + edit with no JUnit after a good one at P is counted under nosuite, never a miss', async () => {
  const w = world('nosuite-edit'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } },
    suiteP: [['a', 'pass']], suiteE: { [`H-1/${BUG2}`]: [['a', 'fail']] }, suiteStatus: { [`H-1/${BUG1}`]: 'missing' } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r.out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=0 ported=2 caught=1 na=0 refused=0 notready=0 nosuite=1`])
  expect(rows(w)).toEqual([{ bug: BUG1, at: 'pass', port: 'ported', testFiles: 2, suite: 'missing-at-edit', caught: null }, { bug: BUG2, at: 'pass', port: 'ported', testFiles: 2, suite: 'ok', caught: true }])
})

test('a never-ready grade at the port is graded once more, then counted under notready', async () => {
  // the first port is not ready once, then ready; the second stays not ready
  const w = world('notready'), f = fakes(w, { atP: { [CHECK1]: 'pass', [CHECK2]: 'pass' }, atE: { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } },
    notReady: { [`H-1/${BUG1}`]: 1, [`H-1/${BUG2}`]: 5 } })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r.out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=1 ported=1 caught=0 na=0 refused=0 notready=1 nosuite=0`])
  expect(rows(w).map((x) => [x.port, x.caught])).toEqual([['ported', false], ['notready', null]])
  const e2 = git(w.sealed, 'rev-parse', `refs/h5/H-1/${BUG2}`)
  expect(f.calls.grade.map((g) => g.sha)).toEqual([w.p1, git(w.sealed, 'rev-parse', `refs/h5/H-1/${BUG1}`), git(w.sealed, 'rev-parse', `refs/h5/H-1/${BUG1}`), e2, e2])
  expect(existsSync(join(w.d, TASK, 'seeded/h5/H-1/grades', `${e2.slice(0, 7)}.json`))).toBe(false) // --reuse must not keep it
})

test('an all-error grade at P after 2 attempts is na', async () => {
  const errors = { [CHECK1]: 'error', [CHECK2]: 'error' }, w = world('noresult'), f = fakes(w, { atP: [errors, errors] })
  const r = await run(w, [TASK, 'H', '1'], f.inj)
  expect(r).toEqual({ code: 0, out: [`h5 ${TASK} H 1 bugs=2 miss=0 ported=0 caught=0 na=2 refused=0 notready=0 nosuite=0`] })
  expect(rows(w).map((x) => [x.at, x.port, x.caught])).toEqual([['error', null, null], ['error', null, null]])
  expect(f.calls.grade.map((g) => g.sha)).toEqual([w.p1, w.p1])
  expect(f.calls.agent).toEqual([])
  // once with no result, then results: graded as usual
  const v = world('noresult-once'), g = fakes(v, { atP: [errors, { [CHECK1]: 'fail', [CHECK2]: 'fail' }] })
  expect((await run(v, [TASK, 'H', '1'], g.inj)).out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=2 ported=0 caught=0 na=0 refused=0 notready=0 nosuite=0`])
  // the machine down after a grade with no result: a stop, no results file
  const m = world('noresult-down'), h = fakes(m, { atP: [errors, errors], down: true })
  await expect(run(m, [TASK, 'H', '1'], h.inj)).rejects.toThrow('machine')
  expect(existsSync(join(m.d, TASK, 'seeded/h5/H-1.json'))).toBe(false)
})

test('a suite at P that times out or runs out of memory twice is nosuite', async () => {
  const both = { [CHECK1]: 'pass', [CHECK2]: 'pass' }, flip = { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } }
  for (const status of ['timeout', 'memory']) {
    const w = world(`p-${status}`), f = fakes(w, { atP: both, atE: flip, suiteStatus: { P: [status, status] } })
    expect((await run(w, [TASK, 'H', '1'], f.inj)).out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=0 ported=2 caught=0 na=0 refused=0 notready=0 nosuite=2`])
    expect(rows(w).map((x) => [x.suite, x.caught])).toEqual([[status, null], [status, null]])
    expect(f.calls.suite.map((s) => s.sha)).toEqual([w.p1, w.p1]) // run once more, then no suite at a port
  }
  // once, then a JUnit: judged as usual
  const w = world('p-timeout-once'), f = fakes(w, { atP: both, atE: flip, suiteStatus: { P: ['timeout'] }, suiteP: [['a', 'pass']], suiteE: { [`H-1/${BUG1}`]: [['a', 'fail']], [`H-1/${BUG2}`]: [['a', 'pass']] } })
  expect((await run(w, [TASK, 'H', '1'], f.inj)).out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=1 ported=2 caught=1 na=0 refused=0 notready=0 nosuite=0`])
  // the machine down after a suite that timed out: a stop
  const m = world('p-timeout-down'), g = fakes(m, { atP: both, atE: flip, suiteStatus: { P: ['timeout'] }, down: true })
  await expect(run(m, [TASK, 'H', '1'], g.inj)).rejects.toThrow('machine')
  expect(existsSync(join(m.d, TASK, 'seeded/h5/H-1.json'))).toBe(false)
})

test('a suite at P + edit that times out twice is caught, one out of memory is nosuite', async () => {
  const both = { [CHECK1]: 'pass', [CHECK2]: 'pass' }, flip = { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } }
  const w = world('e-timeout'), f = fakes(w, { atP: both, atE: flip, suiteP: [['a', 'pass']], suiteE: { [`H-1/${BUG2}`]: [['a', 'pass']] },
    suiteStatus: { [`H-1/${BUG1}`]: ['timeout', 'timeout'], [`H-1/${BUG2}`]: ['memory'] } })
  expect((await run(w, [TASK, 'H', '1'], f.inj)).out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=0 ported=2 caught=1 na=0 refused=0 notready=0 nosuite=1`])
  expect(rows(w).map((x) => [x.suite, x.caught])).toEqual([['timeout-at-edit', true], ['memory-at-edit', null]])
  const e = (b) => git(w.sealed, 'rev-parse', `refs/h5/H-1/${b}`)
  expect(f.calls.suite.map((s) => s.sha)).toEqual([w.p1, e(BUG1), e(BUG1), e(BUG2)]) // a timeout runs once more, a memory kill does not
  // a timeout once, then a JUnit with no failing case: not caught
  const v = world('e-timeout-once'), g = fakes(v, { atP: both, atE: flip, suiteP: [['a', 'pass']], suiteE: { [`H-1/${BUG1}`]: [['a', 'pass']], [`H-1/${BUG2}`]: [['a', 'pass']] },
    suiteStatus: { [`H-1/${BUG1}`]: ['timeout'] } })
  expect((await run(v, [TASK, 'H', '1'], g.inj)).out).toEqual([`h5 ${TASK} H 1 bugs=2 miss=2 ported=2 caught=0 na=0 refused=0 notready=0 nosuite=0`])
})

test('P\'s test files are diffed from the record\'s envCommit, else the base', async () => {
  const both = { [CHECK1]: 'pass', [CHECK2]: 'pass' }, flip = { [`H-1/${BUG1}`]: { [CHECK1]: 'fail' }, [`H-1/${BUG2}`]: { [CHECK2]: 'fail' } }
  const w = world('envcommit'), f = fakes(w, { atP: both, atE: flip })
  await run(w, [TASK, 'H', '1'], f.inj)
  expect(f.calls.suite[0].files).toEqual(['checks/extra.sh', 'tests/new.test.js'])
  const rec = join(w.d, 'results', `${TASK}-H-1.json`), { envCommit, ...noEnv } = json(rec)
  expect(envCommit).toBe(w.env1)
  const v = world('no-envcommit'), g = fakes(v, { atP: both, atE: flip })
  writeFileSync(join(v.d, 'results', `${TASK}-H-1.json`), JSON.stringify(noEnv))
  await run(v, [TASK, 'H', '1'], g.inj)
  expect(g.calls.suite[0].files).toEqual(['checks/extra.sh', 'tests/env.test.js', 'tests/new.test.js'])
  expect(rows(v)[0].testFiles).toBe(3)
})

test('a machine run or a run at or under the step 13 floor is refused', async () => {
  const f = (w) => fakes(w, { atP: { [CHECK1]: 'fail' } }).inj
  const w = world('refuse-machine'), rec = join(w.d, 'results', `${TASK}-H-1.json`)
  writeFileSync(rec, JSON.stringify({ ...json(rec), machine: 'api' }))
  await expect(run(w, [TASK, 'H', '1'], f(w))).rejects.toThrow('machine run')
  const v = world('refuse-floor')
  writeFileSync(join(v.d, 'step13/floor.json'), JSON.stringify({ [TASK]: { H: 1, B: 0, W: 0 } }))
  await expect(run(v, [TASK, 'H', '1'], f(v))).rejects.toThrow('floor')
  expect((await run(v, [TASK, 'H', '2'], f(v))).code).toBe(0) // above it
  rmSync(join(v.d, 'step13/floor.json')) // no floor for the task: nothing stands
  await expect(run(v, [TASK, 'H', '2'], f(v))).rejects.toThrow('floor')
  for (const x of [w, v]) expect(existsSync(join(x.d, TASK, 'seeded/h5/H-1.json'))).toBe(false)
})

test('a porter run that did not end stops it, with no results file', async () => {
  const both = { [CHECK1]: 'pass', [CHECK2]: 'pass' }
  const w = world('stops'), f = fakes(w, { atP: both, agentCode: 1 })
  await expect(run(w, [TASK, 'H', '1'], f.inj)).rejects.toThrow(`porter run of ${BUG1} exited 1`)
  await expect(run(w, [TASK, 'H', '1'], f.inj)).rejects.toThrow('exited 1') // its record stands: no second run, no refusal
  expect(f.calls.agent.length).toBe(1)
  expect(existsSync(join(w.d, TASK, 'seeded/h5/H-1.json'))).toBe(false)
})

// the suite run in Docker: a fixture repo whose base and product build from alpine, a suite.sh that names the files it is given and
// whether /oracle is there, then the recipe's test, which opens a socket first and writes JUnit only when it can
dtest('the suite runs offline and only the product\'s test files (needs BENCH_EXT_DOCKER=1)', async () => {
  const owner = `fx${Math.random().toString(36).slice(2, 8)}`, w = world('suite', { owner }), slug = `${owner}__r__7`, ext = join(w.d, 'ext')
  docked.push({ data: w.d, task: TASK, slug })
  const junit = (body) => ['mkdir -p /out', `{ echo "<testsuite>"; ${body}; echo "</testsuite>"; } > /out/junit.xml`, ''].join('\n')
  const recipe = { platform, dockerfile: 'FROM alpine:3.22\nCOPY . /work\nWORKDIR /work\n', probe: ['tests/kept.test.js'],
    test: 'ls /sys/class/net\nwget -q -T 5 -O /dev/null http://1.1.1.1/ || exit 1\n' + junit('for f in "$@"; do echo "<testcase classname=\\"fx\\" name=\\"$f\\"/>"; done') }
  mkdirSync(join(ext, 'tasks', slug), { recursive: true }); mkdirSync(join(ext, 'serve', w.key), { recursive: true })
  writeFileSync(join(ext, 'tasks', slug, 'task-recipe.json'), JSON.stringify(recipe))
  writeFileSync(join(ext, 'serve', w.key, 'serve.json'), JSON.stringify({ ...SERVE_EMPTY, briefSha: null }))
  writeFileSync(join(ext, 'tasks', slug, 'suite.sh'), junit('for f in "$@"; do [ -e "$f" ] && echo "<testcase classname=\\"fx\\" name=\\"$f\\"/>"; done; [ -e /oracle ] || echo "<testcase classname=\\"fx\\" name=\\"no-oracle\\"/>"'))
  const files = join(w.d, 'files.txt'), out = join(w.d, 'junit.xml')
  writeFileSync(files, 'checks/extra.sh\ntests/new.test.js\n')
  const go = () => withMachine(w, () => suiteRun([box(w), '--at', w.p1, '--files', files, '--out', out], { data: w.d, diskFree: async () => 100 }))
  // the control: suite.sh, copied in at run time, gets exactly the files and no /oracle
  expect(await go()).toBe('ok')
  expect(readFileSync(out, 'utf8').match(/ name="[^"]+"/g)).toEqual([' name="checks/extra.sh"', ' name="tests/new.test.js"', ' name="no-oracle"'])
  const d1 = json(join(w.d, TASK, 'docker.json'))
  expect(d1.containers).toEqual([`bench-ext-${slug}-make-${w.p1.slice(0, 7)}-1`, `bench-ext-${slug}-suite-${w.p1.slice(0, 7)}-1`])
  expect(d1.images.map((i) => i.name)).toEqual([`bench-ext/${slug}:${w.base.slice(0, 7)}-serve`, `bench-ext/${slug}:${w.p1.slice(0, 7)}-product-suite`])
  // a port commit only the sealed repo holds, through the seeded box file: the same files, its own edit in the image
  const e = (await editCommit(w.sealed, w.p1, { file: 'tests/new.test.js', find: 'new', replace: 'ported' }, 'refs/h5/H-1/x', { testPaths: [] }))
  expect(e.why).toBe('test file') // the gates hold here too
  const { commit } = await editCommit(w.sealed, w.p1, { file: 'src/app.js', find: 'const l12 = 12', replace: 'const l12 = 13' }, 'refs/h5/H-1/x')
  expect(gitIn(w.store, 'cat-file', '-e', commit).code).not.toBe(0)
  expect(await withMachine(w, () => suiteRun([seededBox(w), '--at', commit, '--files', files, '--out', out], { data: w.d, diskFree: async () => 100 }))).toBe('ok')
  expect(readFileSync(out, 'utf8').match(/ name="[^"]+"/g)).toEqual([' name="checks/extra.sh"', ' name="tests/new.test.js"', ' name="no-oracle"'])
  // the recipe's test: its socket gets no network, so no result and no --out file; the container saw only its loopback
  rmSync(join(ext, 'tasks', slug, 'suite.sh'))
  expect(await go()).toBe('missing')
  expect(existsSync(out)).toBe(false)
  const log = readFileSync(join(ext, 'sealed', slug, 'logs', `suite-${w.p1.slice(0, 7)}-2.log`), 'utf8').split('\n')
  expect(log).toContain('lo')
  expect(log.filter((l) => /^(eth|en|wl)/.test(l))).toEqual([])
  // every name it recorded is gone
  const d2 = json(join(w.d, TASK, 'docker.json')), inspect = (k, n) => Bun.spawnSync(['docker', k, 'inspect', n], { stdout: 'pipe', stderr: 'pipe' }).exitCode
  expect(d2.containers.length).toBe(6)
  for (const c of d2.containers) expect(inspect('container', c)).not.toBe(0)
  for (const i of d2.images) expect(inspect('image', i.name)).not.toBe(0)
}, 900000)
