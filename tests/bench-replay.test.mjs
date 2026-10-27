import { test, expect, afterAll } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { excludedTitles, caught } from '../bench/lib/replay.mjs'
import { clean } from '../bench/env.mjs'

const vitest = String.raw`^\s*(?:it|test)(?:\.each\([^)]*\))?\(\s*['"\x60](.+?)['"\x60]`
test('takes added and changed test titles, not titles in source files', () => {
  const diff = ['+++ b/tests/unit/a.test.ts', '@@ -1,1 +1,2 @@', "+  it('rejects a name of only spaces', () => {",
    "-  test('old title', () => {", "+  test('new title', () => {", '+++ b/src/a.ts', '@@ -1 +1 @@', "+  it('not a test', () => {"].join('\n')
  expect(excludedTitles(diff, new Map(), vitest)).toEqual(['rejects a name of only spaces', 'new title'])
})
test('an assertion added inside an old test excludes that test', () => {
  const post = new Map([['tests/e2e/r.spec.ts', ["test('a request asks for the contact data again', async () => {", '  await go()', '  expect(x).toBe(1)', '})'].join('\n')]])
  const diff = ['+++ b/tests/e2e/r.spec.ts', '@@ -2,0 +3,1 @@', '+  expect(x).toBe(1)'].join('\n')
  expect(excludedTitles(diff, post, vitest)).toEqual(['a request asks for the contact data again'])
})
test('a failure of an excluded test is not a catch', () => {
  const cases = [{ name: 'suite > rejects a name of only spaces', status: 'fail', message: '' }, { name: 'other', status: 'pass', message: '' }]
  expect(caught(cases, ['rejects a name of only spaces'])).toBe(false)
  expect(caught([...cases, { name: 'older test', status: 'fail', message: '' }], ['rejects a name of only spaces'])).toBe(true)
})

test('a removed line never counts, even one that looks like a test title', () => {
  const diff = ['+++ b/tests/a.test.ts', '@@ -1,2 +1,1 @@', "-  it('gone', () => {", '-  expect(1)'].join('\n')
  expect(excludedTitles(diff, new Map([['tests/a.test.ts', "it('kept', () => {})"]]), vitest)).toEqual([])
})
test('a deleted test file adds nothing', () => {
  const diff = ['--- a/tests/a.test.ts', '+++ /dev/null', '@@ -1,1 +0,0 @@', "-it('gone', () => {})", '+++ b/tests/b.test.ts', '@@ -0,0 +1,1 @@', "+it('fresh', () => {})"].join('\n')
  expect(excludedTitles(diff, new Map(), vitest)).toEqual(['fresh'])
})
test('a hunk header without a count means one line, and added text that looks like a header is content', () => {
  const post = new Map([['tests/a.test.ts', ["it('outer', () => {", '  expect(2)', '})'].join('\n')]])
  const diff = ['+++ b/tests/a.test.ts', '@@ -2 +2 @@', '-  expect(1)', '+  expect(2)', '@@ -9 +9,2 @@', '-x', '++++ b/src/x.ts', "+it('after', () => {})"].join('\n')
  expect(excludedTitles(diff, post, vitest)).toEqual(['outer', 'after'])
})
test('a title found twice is listed once, at its first appearance', () => {
  const diff = ['+++ b/tests/a.test.ts', '@@ -0,0 +1,3 @@', "+it('a', () => {})", "+it('b', () => {})", "+it('a', () => {})"].join('\n')
  expect(excludedTitles(diff, new Map(), vitest)).toEqual(['a', 'b'])
})
test('a diff without a test file gives no titles, and caught ignores skips and passes', () => {
  expect(excludedTitles('+++ b/src/a.ts\n@@ -1 +1 @@\n+x', new Map(), vitest)).toEqual([])
  expect(caught([{ name: 'a', status: 'skip', message: '' }, { name: 'b', status: 'pass', message: '' }], [])).toBe(false)
})

// CLI smoke test. Layers write JUnit by hand: the "bug" is the word buggy in src/a.txt, which the fix changed.
const { replay } = await import('../bench/replay.mjs')
const ROOT = '/tmp/hstack-bench'
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-replay-')))
const repo = join(tmp, 'repo')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(join(repo, 'tests'))
git('init', '-q')
writeFileSync(join(repo, 'src/a.txt'), 'buggy\n')
git('add', '.'); git('commit', '-qm', 'zero')
const c0 = git('rev-parse', 'HEAD')
writeFileSync(join(repo, 'src/a.txt'), 'fixed\n')
writeFileSync(join(repo, 'tests/a.test.js'), "it('new check', () => {})\n")
git('add', '.'); git('commit', '-qm', 'fix')
const fix = git('rev-parse', 'HEAD')
mkdirSync(join(tmp, 'bugs'))
writeFileSync(join(tmp, 'bugs/fix.patch'), git('diff', c0, fix, '--', 'src/a.txt') + '\n')
const bug = (id, extra = {}) => {
  const f = join(tmp, 'bugs', `${id}.json`)
  writeFileSync(f, JSON.stringify({ id, at: fix, patch: 'fix.patch', fix, ...extra }))
  return f
}
const port = (() => { const l = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } }); const p = l.port; l.stop(true); return p })()
// the layer prints a secret to both streams, then writes one failing case named by $1 when the bug is present
const layer = (failing) => `echo SECRET-OUT; echo SECRET-ERR >&2; { echo '<testsuite>'; if grep -q buggy src/a.txt; then echo '<testcase name="suite > ${failing}"><failure message="boom"/></testcase>'; fi; echo '</testsuite>'; } > "$BENCH_JUNIT"; echo "excluded: $(cat "$BENCH_EXCLUDE")" >&2`
const mkTask = (layers, extra = {}) => {
  const f = join(tmp, `task-${rand()}.json`)
  writeFileSync(f, JSON.stringify({
    name: `t${rand()}`, repo, db: null, port, start: `bun -e "Bun.serve({ port: Number(process.env.BENCH_PORT), fetch: () => new Response('ok') })"`,
    ready: `http://127.0.0.1:${port}/`, oracle: 'true', junit: 'results.xml', timeoutSec: 20, testTitle: vitest, layers, ...extra,
  }))
  return f
}
writeFileSync(join(tmp, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
// a real subprocess, so stdout and stderr are what a user would see
const cli = async (args) => {
  const p = Bun.spawn(['bun', '-e', `import { replay } from '${join(import.meta.dir, '../bench/replay.mjs')}'; try { process.exit(await replay(JSON.parse(process.argv[1]), { root: '${sub}' })) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(tmp, 'machine.json') }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  return { stdout, stderr, code }
}
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }) })

test('sealed: a failure outside the fix tests prints exactly "<id> caught" and nothing else', async () => {
  const r = await cli([mkTask({ unit: layer('older check') }), bug('b1'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b1 caught\n', code: 0 })
  expect(r.stderr).not.toContain('SECRET')
  expect(r.stderr).not.toContain('older check')
})
test('sealed: only the fix\'s own test failing is "<id> missed", and the layer saw it in BENCH_EXCLUDE', async () => {
  const r = await cli([mkTask({ unit: layer('new check') }), bug('b2'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b2 missed\n', code: 0 })
  expect(r.stderr).not.toContain('SECRET')
})
test('dev mode names the failing cases, marks the excluded one, and passes the layer output to stderr', async () => {
  const r = await cli([mkTask({ unit: layer('new check') }), bug('b3'), 'unit'])
  expect(r.stdout).toBe('FAIL suite > new check (excluded)\nb3 missed\n')
  expect(r.stderr).toContain('SECRET-ERR')
  expect(r.stderr).toContain('excluded: new check')
})
test('a layer that leaves no JUnit prints "<id> error" and exits non-zero', async () => {
  const r = await cli([mkTask({ unit: 'echo SECRET-OUT' }), bug('b4'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b4 error\n', code: 1 })
  expect(r.stderr).not.toContain('SECRET')
})
test('a patch that does not reverse-apply is an error, never "missed"', async () => {
  writeFileSync(join(tmp, 'bugs/bad.patch'), 'not a patch\n')
  const r = await cli([mkTask({ unit: layer('x') }), bug('b5', { patch: 'bad.patch' }), 'unit', '--sealed'])
  expect(r.code).toBe(2)
  expect(r.stdout).toBe('')
})
test('refuses a missing or non-string layer, a missing testTitle and an unsafe id', async () => {
  expect((await cli([mkTask({ unit: layer('x') }), bug('b6'), 'e2e'])).stderr).toContain('layer e2e')
  expect((await cli([mkTask({ unit: 5 }), bug('b6'), 'unit'])).stderr).toContain('layer unit')
  expect((await cli([mkTask({ unit: layer('x') }, { testTitle: undefined }), bug('b6'), 'unit'])).stderr).toContain('testTitle')
  expect((await cli([mkTask({ unit: layer('x') }), bug('bad id'), 'unit'])).stderr).toContain('id')
  for (const r of [await cli([mkTask({ unit: layer('x') }), bug('b6'), 'constructor'])]) expect(r.code).toBe(2)
})
