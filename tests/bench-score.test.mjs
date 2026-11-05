import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { results, score, verdict, checksFrom, fixMatches, unscored, floorScore } from '../bench/lib/score.mjs'
import { grade } from '../bench/grade.mjs'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

test('weights high 3, medium 2, low 1 and keeps the buckets apart', () => {
  const checks = [{ id: 'a', bucket: 'build', severity: 'high' }, { id: 'b', bucket: 'build', severity: 'low' },
    { id: 'c', bucket: 'requirement', severity: 'medium' }, { id: 'd', bucket: 'out', severity: 'high' }]
  const res = new Map([['a', 'pass'], ['b', 'fail'], ['c', 'precondition'], ['d', 'pass']])
  expect(score(checks, res)).toEqual({ build: 0.75, requirement: 0, featureMissing: 1 / 3, scored: 3 })
  expect(score([checks[3]], res)).toEqual({ build: null, requirement: null, featureMissing: 0, scored: 0 })
})

test('a missing result file makes every check an error', () => {
  expect([...results(null, ['a', 'b']).values()]).toEqual(['error', 'error'])
})

test('results: precondition needs a line that starts with the marker, not a quoted code frame', () => {
  const c = (name, status, message = '') => ({ name, status, message })
  const r = results([
    c('a-T1 x', 'fail', 'a.spec.ts:3:1 t\nError: PRECONDITION: no form'),
    c('b-T1 x', 'fail', "a.spec.ts:3:1 t\nError: expect(received).toBe(1)\n\n  11 |   expect(f, 'PRECONDITION: form').toBeVisible()\n> 12 |   expect(x).toBe(1)"),
    c('c-T1 x', 'skip'),
    c('d-T1 x', 'pass'), c('d-T1 y', 'fail', 'boom'), c('d-T1 z', 'fail', 'PRECONDITION: gone'),
    c('e-T1 x', 'pass'), c('e-T1 y', 'fail', 'boom'),
    c('other', 'pass'),
  ], ['a-T1', 'b-T1', 'c-T1', 'd-T1', 'e-T1', 'f-T1'])
  expect(Object.fromEntries(r)).toEqual({ 'a-T1': 'precondition', 'b-T1': 'fail', 'c-T1': 'error', 'd-T1': 'precondition', 'e-T1': 'fail', 'f-T1': 'error' })
})

test('a precondition failure at the base is not pre-existing', () => {
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'precondition' })).toBe('absent-at-base')
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'fail' })).toBe('pre-existing')
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'pass' })).toBe('valid')
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'error' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: 'pass' })).toBe('weak')
  expect(verdict({ ref: 'fail', bad: 'fail' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: 'precondition', base: 'pass' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: 'error' })).toBe('broken')
})

test('absent at the known-bad version with no base run is absent-at-base', () => {
  expect(verdict({ ref: 'pass', bad: 'precondition' })).toBe('absent-at-base')
  expect(verdict({ ref: 'pass', bad: ['fail', 'precondition'] })).toBe('absent-at-base')
  expect(verdict({ ref: 'pass', bad: ['precondition', 'error'] })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: ['precondition', 'pass'] })).toBe('weak')
  expect(verdict({ ref: 'fail', bad: 'precondition' })).toBe('broken')
})

test('a precondition failure on a bad version with a base run is still broken', () => {
  for (const base of ['pass', 'fail', 'precondition', 'error']) {
    expect(verdict({ ref: 'pass', bad: 'precondition', base })).toBe('broken')
    expect(verdict({ ref: 'pass', bad: ['fail', 'precondition'], base })).toBe('broken')
  }
})

test('with several known-bad versions a check is weak if it passes on any, broken if any is neither pass nor fail', () => {
  expect(verdict({ ref: 'pass', bad: ['fail', 'fail'], base: 'pass' })).toBe('valid')
  expect(verdict({ ref: 'pass', bad: ['fail', 'pass'] })).toBe('weak')
  expect(verdict({ ref: 'pass', bad: ['precondition', 'pass'] })).toBe('weak')
  expect(verdict({ ref: 'pass', bad: ['fail', 'precondition'], base: 'pass' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: ['fail', 'error'], base: 'pass' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: ['fail', 'fail'], base: 'fail' })).toBe('pre-existing')
})

test('unscored lists a check whose validation recorded error', () => {
  expect(unscored([{ checks: [{ id: 'a-T1', verdict: 'error', stage: 'port busy' }, { id: 'a-T2', verdict: 'valid' }] }], ['a-T1', 'a-T2'])).toEqual([{ id: 'a-T1', verdict: 'error' }])
})

test('unscored lists each check of this oracle that a validation found weak, broken or pre-existing, once', () => {
  const v = [{ checks: [{ id: 'a-T1', verdict: 'weak' }, { id: 'a-T2', verdict: 'valid' }, { id: 'a-T3', verdict: 'absent-at-base' }] },
    { checks: [{ id: 'b-T1', verdict: 'pre-existing' }, { id: 'b-T2', verdict: 'broken' }, { id: 'a-T1', verdict: 'broken' }, { id: 'gone-T1', verdict: 'weak' }] }]
  expect(unscored(v, ['a-T1', 'a-T2', 'a-T3', 'b-T1', 'b-T2'])).toEqual([{ id: 'a-T1', verdict: 'weak' }, { id: 'b-T1', verdict: 'pre-existing' }, { id: 'b-T2', verdict: 'broken' }])
  expect(unscored([], ['a-T1'])).toEqual([])
})

test('checksFrom drops dropped and interface none, maps partly to requirement, lists the unlabelled', () => {
  const m = [{ id: 'a-T1', severity: 'high', interface: 'browser' }, { id: 'b-T1', severity: 'low', interface: 'api', dropped: true },
    { id: 'c-T1', severity: 'low', interface: 'none' }, { id: 'd-T1', severity: 'medium' }, { id: 'e-T1', severity: 'low', interface: 'api' }]
  expect(checksFrom(m, { 'a-T1': 'partly', 'e-T1': 'build' })).toEqual({
    checks: [{ id: 'a-T1', bucket: 'requirement', severity: 'high' }, { id: 'd-T1', bucket: 'out', severity: 'medium' }, { id: 'e-T1', bucket: 'build', severity: 'low' }],
    unlabelled: ['d-T1'],
  })
})

test('checksFrom refuses an unknown severity or label, naming the id', () => {
  expect(() => checksFrom([{ id: 'a-T1', severity: 'urgent', interface: 'api' }])).toThrow(/a-T1.*severity/)
  expect(() => checksFrom([{ id: 'b-T1', interface: 'api' }])).toThrow(/b-T1.*severity/)
  expect(() => checksFrom([{ id: 'c-T1', severity: 'low', interface: 'api' }], { 'c-T1': 'maybe' })).toThrow(/c-T1.*label/)
})

test('fixMatches compares 7 characters in either direction', () => {
  expect(fixMatches('d82f2b0', 'd82f2b0aaaaaaaaaaaa')).toBe(true)
  expect(fixMatches('d82f2b0', 'd82f')).toBe(true)
  expect(fixMatches('d82f2b0', 'd82f2b1')).toBe(false)
})

// CLI smoke test: temp repo, oracle command writes a JUnit file (one pass, one PRECONDITION failure)
const dropRoot = releaseRoot()
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-score-')))
const repo = join(tmp, 'repo')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
mkdirSync(repo)
git('init', '-q')
writeFileSync(join(repo, 'page.txt'), 'v1')
git('add', '.'); git('commit', '-qm', 'one')
const c1 = git('rev-parse', 'HEAD')
const c7 = c1.slice(0, 7)
git('checkout', '-q', '-b', 'side'); writeFileSync(join(repo, 'page.txt'), 'v2'); git('commit', '-qam', 'two')
const c2 = git('rev-parse', 'HEAD')
git('checkout', '-q', '-')

const freePort = () => { const l = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } }); const p = l.port; l.stop(true); return p }
const port = freePort()
const xml = `<testsuites><testsuite name="s"><testcase name="${c7}-T1 ok"/><testcase name="${c7}-T2 no form"><failure message="a.spec.ts:3:1 t"><![CDATA[Error: PRECONDITION: no form]]></failure></testcase></testsuite></testsuites>`
const oracleDir = join(tmp, 'ev', 'oracle')
mkdirSync(oracleDir, { recursive: true })
writeFileSync(join(oracleDir, 'xml.txt'), xml)
// at c2 both checks fail plainly
writeFileSync(join(oracleDir, 'xml2.txt'), `<testsuite><testcase name="${c7}-T1 ok"><failure message="no"/></testcase><testcase name="${c7}-T2 no form"><failure message="no"/></testcase></testsuite>`)
writeFileSync(join(oracleDir, 'manifest.json'), JSON.stringify([
  { id: `${c7}-T1`, fix_commit: c7, severity: 'high', interface: 'browser' },
  { id: `${c7}-T2`, fix_commit: c7, severity: 'low', interface: 'browser' },
  { id: 'zzzzzzz-T1', fix_commit: 'zzzzzzz', severity: 'low', interface: 'browser' },
]))
writeFileSync(join(tmp, 'ev', 'labels.json'), JSON.stringify({ [`${c7}-T1`]: 'build', [`${c7}-T2`]: 'partly' }))
const mkTask = (oracle, timeoutSec = 20) => {
  const f = join(tmp, `task-${rand()}.json`)
  writeFileSync(f, JSON.stringify({
    name: `t${rand()}`, repo, db: null, port,
    start: `bun -e "Bun.serve({ port: Number(process.env.BENCH_PORT), fetch: () => new Response('ok') })"`,
    ready: `http://127.0.0.1:${port}/`, oracle, junit: 'results.xml', timeoutSec,
  }))
  return f
}
writeFileSync(join(tmp, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
const prevMachine = process.env.HSTACK_BENCH_MACHINE
process.env.HSTACK_BENCH_MACHINE = join(tmp, 'machine.json')
const quiet = async (fn) => { const log = console.log; const out = []; console.log = (s) => out.push(s); try { out.code = await fn() } finally { console.log = log } return out }
const noValidations = () => { for (const f of readdirSync(join(tmp, 'ev'))) if (f.startsWith('validation-')) rmSync(join(tmp, 'ev', f)) }
const byPage = 'if grep -q v2 page.txt; then cp "$BENCH_ORACLE/xml2.txt" "$BENCH_JUNIT"; else cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"; fi'

afterAll(async () => {
  if (prevMachine === undefined) delete process.env.HSTACK_BENCH_MACHINE
  else process.env.HSTACK_BENCH_MACHINE = prevMachine
  await clean(sub)
  rmSync(tmp, { recursive: true, force: true })
  dropRoot()
})

test('grade writes per-check results, buckets and the score; the oracle sees BENCH_ORACLE', async () => {
  const task = mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"; test -f "$BENCH_ORACLE/manifest.json"; exit 1')
  const out = await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  const g = await Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()
  expect(out).toEqual([`${c7} junit=ok pass=1 fail=0 precondition=1 error=1 excluded=0 build=1 requirement=0 featureMissing=0.5`])
  expect(out.code).toBe(0)
  expect(g).toMatchObject({ commit: c1, junit: 'ok', excluded: [], unlabelled: ['zzzzzzz-T1'], score: { build: 1, requirement: 0, featureMissing: 0.5, scored: 2 } })
  expect(g.checks).toEqual([
    { id: `${c7}-T1`, bucket: 'build', severity: 'high', result: 'pass' },
    { id: `${c7}-T2`, bucket: 'requirement', severity: 'low', result: 'precondition' },
    { id: 'zzzzzzz-T1', bucket: 'out', severity: 'low', result: 'error' },
  ])
})

test('a missing JUnit file grades every check an error, never a pass, and grade --at says so and exits non-zero', async () => {
  const task = mkTask('true')
  const out = await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  expect(out.code).toBe(1)
  expect(out[0]).toStartWith(`${c7} junit=missing `)
  const g = await Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()
  expect(g.junit).toBe('missing')
  expect(g.checks.map((c) => c.result)).toEqual(['error', 'error', 'error'])
})

test('an oracle killed on timeout counts as missing even if it left a file', async () => {
  const task = mkTask(`cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"; sleep 60`, 4)
  const t0 = Date.now()
  await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  expect(Date.now() - t0).toBeLessThan(30000)
  expect((await Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()).junit).toBe('timeout')
}, 30000)

test('--validate refuses to write when a run had no results, and keeps the grade files', async () => {
  rmSync(join(tmp, 'ev', `validation-${c7}.json`), { force: true })
  await expect(quiet(() => grade([mkTask('true'), oracleDir, '--validate', c1, c1], { root: sub }))).rejects.toThrow(new RegExp(`no results for ${c1}.*grades/${c7}.json`))
  expect(existsSync(join(tmp, 'ev', `validation-${c7}.json`))).toBe(false)
  expect((await Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()).junit).toBe('missing')
})

test('the grade file is named by the resolved hash, and a bad later commit fails before any run', async () => {
  const task = mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"')
  rmSync(join(tmp, 'ev', 'grades'), { recursive: true, force: true })
  await quiet(() => grade([task, oracleDir, '--at', 'HEAD'], { root: sub }))
  expect(existsSync(join(tmp, 'ev', 'grades', `${c7}.json`))).toBe(true)
  rmSync(join(tmp, 'ev', 'grades'), { recursive: true, force: true })
  await expect(grade([task, oracleDir, '--validate', c1, 'deadbeef'], { root: sub })).rejects.toThrow(/unknown commit/)
  expect(existsSync(join(tmp, 'ev', 'grades'))).toBe(false)
})

test('an absolute or escaping task junit path is refused', async () => {
  for (const junit of ['/tmp/x.xml', '../x.xml']) {
    const f = join(tmp, `task-${rand()}.json`)
    writeFileSync(f, JSON.stringify({ name: 'tj', repo, db: null, port, start: 'true', ready: 'http://127.0.0.1/', oracle: 'true', junit }))
    await expect(grade([f, oracleDir, '--at', c1], { root: sub })).rejects.toThrow(/inside the worktree/)
  }
})

test('an unknown commit is refused', async () => {
  await expect(grade([mkTask('true'), oracleDir, '--at', 'deadbeef'], { root: sub })).rejects.toThrow(/unknown commit/)
})

test('--validate judges only the checks of the ref and writes validation-<ref7>.json', async () => {
  const task = mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"')
  await quiet(() => grade([task, oracleDir, '--validate', c1, c1], { root: sub }))
  const v = await Bun.file(join(tmp, 'ev', `validation-${c7}.json`)).json()
  expect(v).toMatchObject({ ref: c1, bad: [c1], base: null })
  expect(v.checks.map((c) => c.id)).toEqual([`${c7}-T1`, `${c7}-T2`])
  expect(v.checks.map((c) => c.verdict)).toEqual(['weak', 'broken'])
  expect(existsSync(join(tmp, 'ev', 'grades', `${c7}.json`))).toBe(true)
  noValidations()
})

test('--validate takes --bad more than once: weak when the check passes on any bad, and the file records every bad', async () => {
  noValidations()
  const task = mkTask(byPage), file = join(tmp, 'ev', `validation-${c7}.json`)
  await quiet(() => grade([task, oracleDir, '--validate', c1, '--bad', c2], { root: sub }))
  expect((await Bun.file(file).json()).checks[0]).toEqual({ id: `${c7}-T1`, ref: 'pass', bad: ['fail'], base: null, verdict: 'valid' })
  await quiet(() => grade([task, oracleDir, '--validate', c1, '--bad', c2, '--bad', c1, '--base', c2], { root: sub }))
  const v = await Bun.file(file).json()
  expect(v).toMatchObject({ ref: c1, bad: [c2, c1], base: c2 })
  expect(v.checks[0]).toEqual({ id: `${c7}-T1`, ref: 'pass', bad: ['fail', 'pass'], base: 'fail', verdict: 'weak' })
  await quiet(() => grade([task, oracleDir, '--validate', c1, c2], { root: sub })) // the old positional form
  expect(await Bun.file(file).json()).toMatchObject({ bad: [c2], checks: [{ verdict: 'valid' }, { verdict: 'broken' }] })
  for (const args of [['--validate', c1], ['--validate', c1, '--bad'], ['--at', c1, '--bad', c2], ['--validate', c1, c2, c2], ['--at', c1, '--validate', c1, c2]])
    await expect(grade([task, oracleDir, ...args], { root: sub })).rejects.toThrow('usage')
  noValidations()
}, 30000)

test('grade leaves weak, broken and pre-existing checks out of the score and lists them, keeping their results', async () => {
  noValidations()
  writeFileSync(join(tmp, 'ev', 'validation-aaaaaaa.json'), JSON.stringify({ checks: [{ id: `${c7}-T2`, verdict: 'pre-existing' }, { id: `${c7}-T1`, verdict: 'valid' }] }))
  const out = await quiet(() => grade([mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"'), oracleDir, '--at', c1], { root: sub }))
  expect(out[0]).toContain(' excluded=1 ')
  const g = await Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()
  expect(g.excluded).toEqual([{ id: `${c7}-T2`, verdict: 'pre-existing' }])
  expect(g.checks.find((c) => c.id === `${c7}-T2`).result).toBe('precondition')
  expect(g.score).toEqual({ build: 1, requirement: null, featureMissing: 0, scored: 1 })
  writeFileSync(join(tmp, 'ev', 'validation-bbbbbbb.json'), '{ not json')
  await expect(grade([mkTask('true'), oracleDir, '--at', c1], { root: sub })).rejects.toThrow('validation-bbbbbbb.json is not valid JSON')
  noValidations()
})

test('a task with start null runs setup, oracle and teardown and no app', async () => {
  const marks = join(tmp, `marks-${rand()}`), f = join(tmp, `task-${rand()}.json`), name = `t${rand()}`
  writeFileSync(f, JSON.stringify({ name, repo, db: null, port, start: null, ready: null, junit: 'results.xml', timeoutSec: 20,
    setup: [`echo setup >> ${marks}`], oracle: `echo oracle >> ${marks}; cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"`, teardown: [`echo teardown >> ${marks}`] }))
  const out = await quiet(() => grade([f, oracleDir, '--at', c1], { root: sub }))
  expect(out.code).toBe(0)
  expect(out[0]).toStartWith(`${c7} junit=ok pass=1 `)
  expect(readFileSync(marks, 'utf8')).toBe('setup\noracle\nteardown\n')
  expect(readdirSync(realpathSync(sub)).filter((n) => n.startsWith(`${name}-`))).toEqual([]) // no start log, no worktree
})

// grade in a child process, so the oracle's own stdout and stderr can be seen
const gradeCli = async (args) => {
  const p = Bun.spawn(['bun', '-e', `import { grade } from '${join(import.meta.dir, '../bench/grade.mjs')}'; process.exit(await grade(JSON.parse(process.argv[1]), { root: '${sub}' }))`, JSON.stringify(args)],
    { stdout: 'pipe', stderr: 'pipe', env: { ...process.env } })
  return { out: await new Response(p.stdout).text(), err: await new Response(p.stderr).text(), code: await p.exited }
}

test('sealed grade prints only counts and writes the oracle output to the log folder', async () => {
  noValidations()
  const logs = join(tmp, 'ev', 'logs'), b7 = c2.slice(0, 7)
  rmSync(logs, { recursive: true, force: true })
  const task = mkTask(`echo ORACLE-OUT; echo ORACLE-ERR >&2; ${byPage}`)
  expect(await gradeCli([task, oracleDir, '--at', c1, '--sealed'])).toEqual({ out: `${c7} junit=ok pass=1 fail=0 precondition=1 error=1 excluded=0 build=1 requirement=0 featureMissing=0.5\n`, err: '', code: 0 })
  const v = await gradeCli([task, oracleDir, '--validate', c1, '--bad', c2, '--sealed'])
  expect({ err: v.err, code: v.code }).toEqual({ err: '', code: 0 })
  const lines = v.out.split('\n')
  expect(lines.length).toBe(4)
  expect(lines[0]).toStartWith(`${c7} junit=ok `)
  expect(lines[1]).toStartWith(`${b7} junit=ok `)
  expect(lines.slice(2)).toEqual([`validation-${c7}: ${c7}-T1=valid ${c7}-T2=broken`, ''])
  expect(readdirSync(logs).sort()).toEqual([`${c7}-1.log`, `${c7}-2.log`, `${b7}-1.log`].sort())
  for (const f of readdirSync(logs)) expect(readFileSync(join(logs, f), 'utf8')).toBe('ORACLE-OUT\nORACLE-ERR\n')
  noValidations()
}, 30000)

const counter = () => {
  const f = join(tmp, `runs-${rand()}`)
  return { f, n: () => (existsSync(f) ? readFileSync(f, 'utf8').length / 2 : 0) }
}
const gradeFile = () => Bun.file(join(tmp, 'ev', 'grades', `${c7}.json`)).json()

test('reuse skips a run with the same oracle and commit', async () => {
  noValidations()
  rmSync(join(tmp, 'ev', 'grades'), { recursive: true, force: true })
  const runs = counter(), task = mkTask(`echo x >> ${runs.f}; ${byPage}`)
  await quiet(() => grade([mkTask(`echo x >> ${runs.f}`), oracleDir, '--at', c1], { root: sub })) // junit missing: not reused
  const first = await quiet(() => grade([task, oracleDir, '--at', c1, '--reuse'], { root: sub }))
  expect(runs.n()).toBe(2)
  expect(first[0]).not.toContain('reused')
  const g1 = await gradeFile()
  expect(g1.oracleSha).toMatch(/^[0-9a-f]{64}$/)
  // node_modules (a folder, or a symlink by that name deeper down) is not part of the oracle
  mkdirSync(join(oracleDir, 'node_modules')); writeFileSync(join(oracleDir, 'node_modules', 'x.js'), 'x')
  mkdirSync(join(oracleDir, 'deep')); symlinkSync(tmp, join(oracleDir, 'deep', 'node_modules'))
  try {
    const again = await quiet(() => grade([task, oracleDir, '--at', c1, '--reuse'], { root: sub }))
    expect(runs.n()).toBe(2)
    expect(again).toEqual([`${first[0]} reused`])
    expect(again.code).toBe(0)
    expect(await gradeFile()).toEqual(g1)
    await quiet(() => grade([task, oracleDir, '--validate', c1, '--bad', c2, '--reuse'], { root: sub }))
    expect(runs.n()).toBe(3) // only c2 ran
    const v = await quiet(() => grade([task, oracleDir, '--validate', c1, '--bad', c2, '--reuse'], { root: sub }))
    expect(runs.n()).toBe(3)
    expect(v.slice(0, 2).every((l) => l.endsWith(' reused'))).toBe(true)
    expect(v[2]).toBe(`validation-${c7}: ${c7}-T1=valid ${c7}-T2=broken`)
  } finally {
    rmSync(join(oracleDir, 'node_modules'), { recursive: true, force: true })
    rmSync(join(oracleDir, 'deep'), { recursive: true, force: true })
    noValidations()
  }
}, 30000)

test('a changed check file makes the run happen again', async () => {
  const runs = counter(), task = mkTask(`echo x >> ${runs.f}; ${byPage}`), check = join(oracleDir, 'checks', 'a.txt')
  mkdirSync(join(oracleDir, 'checks')); writeFileSync(check, 'one')
  try {
    await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
    const sha = (await gradeFile()).oracleSha
    writeFileSync(check, 'two')
    const out = await quiet(() => grade([task, oracleDir, '--at', c1, '--reuse'], { root: sub }))
    expect(runs.n()).toBe(2)
    expect(out[0]).not.toContain('reused')
    expect((await gradeFile()).oracleSha).not.toBe(sha)
  } finally { rmSync(join(oracleDir, 'checks'), { recursive: true, force: true }) }
})

test('an oracle folder with a symlinked folder or a dangling symlink grades, and the link target counts in oracleSha', async () => {
  const task = mkTask(`cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"`), dirLink = join(oracleDir, 'linked'), dangling = join(oracleDir, 'dangling')
  symlinkSync(tmp, dirLink); symlinkSync(join(tmp, 'nowhere'), dangling)
  try {
    expect((await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))).code).toBe(0)
    const sha = (await gradeFile()).oracleSha
    rmSync(dirLink); symlinkSync(repo, dirLink)
    expect((await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))).code).toBe(0)
    expect((await gradeFile()).oracleSha).not.toBe(sha)
  } finally { rmSync(dirLink, { force: true }); rmSync(dangling, { force: true }) }
})

test('reuse runs again when the grade file does not parse', async () => {
  const runs = counter(), task = mkTask(`echo x >> ${runs.f}; ${byPage}`)
  mkdirSync(join(tmp, 'ev', 'grades'), { recursive: true })
  writeFileSync(join(tmp, 'ev', 'grades', `${c7}.json`), '{ not json')
  const out = await quiet(() => grade([task, oracleDir, '--at', c1, '--reuse'], { root: sub }))
  expect(out.code).toBe(0)
  expect(runs.n()).toBe(1)
  expect((await gradeFile()).junit).toBe('ok')
})

// --- floor rule (ruling 7 of step 6) ---
const g = (checks, excluded = []) => ({ checks: checks.map(([id, result, severity = 'high', bucket = 'build']) => ({ id, bucket, severity, result })), excluded })

test('floorScore counts every scored fix check in requirement and only step ids in build', () => {
  const fix = g([['f-T1', 'pass', 'high', 'build'], ['f-T2', 'fail', 'medium', 'requirement'], ['f-T3', 'pass', 'low', 'partly'],
    ['f-T4', 'pass', 'high', 'out'], ['f-T5', 'fail', 'high', 'build'], ['f-T6', 'pass', 'high', 'build']], [{ id: 'f-T6', verdict: 'weak' }])
  const step = g([['s-T1', 'pass', 'high'], ['s-T2', 'fail', 'medium'], ['s-T3', 'pass', 'low']])
  // requirement: f-T1 3 + f-T3 1 + f-T4 3 pass of 3+2+1+3+3 = 12 -> 7/12; the excluded f-T6 counts nowhere
  expect(floorScore(fix, step, ['s-T1', 's-T2', 's-T3'])).toEqual({ build: 4 / 6, requirement: 7 / 12, passed: false })
  expect(floorScore(fix, step, ['s-T1', 's-T3']).build).toBe(1)
  // step null: the ids are read from the fix grade
  expect(floorScore(fix, null, ['f-T1', 'f-T5']).build).toBe(0.5)
  // an id absent from the grade is not passed
  expect(floorScore(fix, step, ['s-T1', 'gone']).build).toBe(0.5)
  expect(floorScore(g([['a', 'pass']], [{ id: 'a', verdict: 'broken' }]), null, []).requirement).toBeNull()
})

test('floorScore gives null build and passed for no step id', () => {
  expect(floorScore(g([['a', 'pass']]), g([]), [])).toEqual({ build: null, requirement: 1, passed: null })
})

test('passed needs every high and medium step check to pass', () => {
  const fix = g([['a', 'pass']])
  expect(floorScore(fix, g([['s1', 'pass', 'high'], ['s2', 'pass', 'medium'], ['s3', 'fail', 'low']]), ['s1', 's2', 's3']).passed).toBe(true)
  for (const bad of ['fail', 'precondition', 'error'])
    expect(floorScore(fix, g([['s1', 'pass', 'high'], ['s2', bad, 'medium']]), ['s1', 's2']).passed).toBe(false)
  expect(floorScore(fix, g([['s1', 'fail', 'low'], ['s2', 'error', 'low']]), ['s1', 's2']).passed).toBe(true) // all low: passes on that clause alone
})
