import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { results, score, verdict, checksFrom, fixMatches } from '../bench/lib/score.mjs'
import { grade } from '../bench/grade.mjs'
import { clean } from '../bench/env.mjs'

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
  expect(verdict({ ref: 'pass', bad: 'precondition' })).toBe('broken')
  expect(verdict({ ref: 'pass', bad: 'error' })).toBe('broken')
})

test('checksFrom drops dropped and interface none, maps partly to requirement, lists the unlabelled', () => {
  const m = [{ id: 'a-T1', severity: 'high', interface: 'browser' }, { id: 'b-T1', severity: 'low', interface: 'api', dropped: true },
    { id: 'c-T1', severity: 'low', interface: 'none' }, { id: 'd-T1', severity: 'medium' }, { id: 'e-T1', severity: 'low', interface: 'api' }]
  expect(checksFrom(m, { 'a-T1': 'partly', 'e-T1': 'build' })).toEqual({
    checks: [{ id: 'a-T1', bucket: 'requirement', severity: 'high' }, { id: 'd-T1', bucket: 'out', severity: 'medium' }, { id: 'e-T1', bucket: 'build', severity: 'low' }],
    unlabelled: ['d-T1'],
  })
})

test('fixMatches compares 7 characters in either direction', () => {
  expect(fixMatches('d82f2b0', 'd82f2b0aaaaaaaaaaaa')).toBe(true)
  expect(fixMatches('d82f2b0', 'd82f')).toBe(true)
  expect(fixMatches('d82f2b0', 'd82f2b1')).toBe(false)
})

// CLI smoke test: temp repo, oracle command writes a JUnit file (one pass, one PRECONDITION failure)
const ROOT = '/tmp/hstack-bench'
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

const freePort = () => { const l = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } }); const p = l.port; l.stop(true); return p }
const port = freePort()
const xml = `<testsuites><testsuite name="s"><testcase name="${c7}-T1 ok"/><testcase name="${c7}-T2 no form"><failure message="a.spec.ts:3:1 t"><![CDATA[Error: PRECONDITION: no form]]></failure></testcase></testsuite></testsuites>`
const oracleDir = join(tmp, 'ev', 'oracle')
mkdirSync(oracleDir, { recursive: true })
writeFileSync(join(oracleDir, 'xml.txt'), xml)
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
process.env.HSTACK_BENCH_MACHINE = join(tmp, 'machine.json')
const quiet = async (fn) => { const log = console.log; const out = []; console.log = (s) => out.push(s); try { await fn() } finally { console.log = log } return out }

afterAll(async () => {
  await clean(sub)
  rmSync(tmp, { recursive: true, force: true })
})

test('grade writes per-check results, buckets and the score; the oracle sees BENCH_ORACLE', async () => {
  const task = mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"; test -f "$BENCH_ORACLE/manifest.json"; exit 1')
  const out = await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  const g = await Bun.file(join(tmp, 'ev', 'grades', `${c1}.json`)).json()
  expect(out.length).toBe(1)
  expect(g).toMatchObject({ commit: c1, junit: 'ok', unlabelled: ['zzzzzzz-T1'], score: { build: 1, requirement: 0, featureMissing: 0.5, scored: 2 } })
  expect(g.checks).toEqual([
    { id: `${c7}-T1`, bucket: 'build', severity: 'high', result: 'pass' },
    { id: `${c7}-T2`, bucket: 'requirement', severity: 'low', result: 'precondition' },
    { id: 'zzzzzzz-T1', bucket: 'out', severity: 'low', result: 'error' },
  ])
})

test('a missing JUnit file grades every check an error, never a pass', async () => {
  const task = mkTask('true')
  await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  const g = await Bun.file(join(tmp, 'ev', 'grades', `${c1}.json`)).json()
  expect(g.junit).toBe('missing')
  expect(g.checks.map((c) => c.result)).toEqual(['error', 'error', 'error'])
})

test('an oracle that outlives timeoutSec is killed and its results do not count', async () => {
  const task = mkTask('sleep 60', 4)
  const t0 = Date.now()
  await quiet(() => grade([task, oracleDir, '--at', c1], { root: sub }))
  expect(Date.now() - t0).toBeLessThan(30000)
  expect((await Bun.file(join(tmp, 'ev', 'grades', `${c1}.json`)).json()).junit).toBe('missing')
}, 30000)

test('an unknown commit is refused', async () => {
  await expect(grade([mkTask('true'), oracleDir, '--at', 'deadbeef'], { root: sub })).rejects.toThrow(/unknown commit/)
})

test('--validate judges only the checks of the ref and writes validation-<ref7>.json', async () => {
  const task = mkTask('cp "$BENCH_ORACLE/xml.txt" "$BENCH_JUNIT"')
  await quiet(() => grade([task, oracleDir, '--validate', c1, c1], { root: sub }))
  const v = await Bun.file(join(tmp, 'ev', `validation-${c7}.json`)).json()
  expect(v).toMatchObject({ ref: c1, bad: c1, base: null })
  expect(v.checks.map((c) => c.id)).toEqual([`${c7}-T1`, `${c7}-T2`])
  expect(v.checks.map((c) => c.verdict)).toEqual(['weak', 'broken'])
  expect(existsSync(join(tmp, 'ev', 'grades', `${c1}.json`))).toBe(true)
})
