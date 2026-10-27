import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { excludedTitles, caught } from '../bench/lib/replay.mjs'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

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

// a table test whose title follows its rows, as in the showcase folder check of the real-estate replay
const table = [
  "  it('finds no problem in a complete folder', () => {})", // 1
  '',
  '  it.each<[string, () => void, string[]]>([', // 3
  "    ['a repeated property code', () => {}, ['two properties']],", // 4
  '    [', // 5
  "      'a bad link before a bad photo',", // 6
  '      () => {},', // 7
  '      [', // 8
  "        'no property with code SC-9',", // 9
  "        'photo file missing: x.jpg',", // 10
  '      ],', // 11
  '    ],', // 12
  "    ['a survey lead with no province', () => {}, ['no province']],", // 13
  "  ])('names a broken folder: %s', (_, change, problems) => {", // 14
  '    expect(check()).toEqual(problems)', // 15
  '  })', // 16
].join('\n')
const rowDiff = (line, text) => ['+++ b/tests/unit/showcase.test.ts', `@@ -${line - 1},0 +${line},1 @@`, `+${text}`].join('\n')
test('a line added to a row of a table test excludes that row\'s name, not the test above the table', () => {
  const post = new Map([['tests/unit/showcase.test.ts', table]])
  const lines = table.split('\n')
  expect(excludedTitles(rowDiff(13, lines[12]), post, vitest)).toEqual(['names a broken folder: a survey lead with no province'])
  expect(excludedTitles(rowDiff(6, lines[5]), post, vitest)).toEqual(['names a broken folder: a bad link before a bad photo'])
  expect(excludedTitles(rowDiff(10, lines[9]), post, vitest)).toEqual(['names a broken folder: a bad link before a bad photo'])
  expect(excludedTitles(rowDiff(12, lines[11]), post, vitest)).toEqual(['names a broken folder: a bad link before a bad photo']) // the row's own `],`
  expect(excludedTitles(rowDiff(15, lines[14]), post, vitest)).toEqual(['names a broken folder: %s']) // the body: every row
  expect(excludedTitles(rowDiff(3, lines[2]), post, vitest)).toEqual(['names a broken folder: %s']) // a new table
  // an old row still counts as a catch
  const f = (name) => ({ name, status: 'fail', message: '' })
  const ex = excludedTitles(rowDiff(13, lines[12]), post, vitest)
  expect(caught([f('checkShowcase > names a broken folder: a survey lead with no province')], ex)).toBe(false)
  expect(caught([f('checkShowcase > names a broken folder: a repeated property code')], ex)).toBe(true)
})
test('a whole multi-line row added before an unchanged row excludes that row only, and a row without a leading string the whole table', () => {
  const post = new Map([['tests/unit/showcase.test.ts', table]])
  const lines = table.split('\n')
  const added = ['+++ b/tests/unit/showcase.test.ts', '@@ -4,0 +5,8 @@', ...lines.slice(4, 12).map((l) => `+${l}`)].join('\n')
  expect(excludedTitles(added, post, vitest)).toEqual(['names a broken folder: a bad link before a bad photo'])
  const numeric = new Map([['tests/unit/showcase.test.ts', table.replace("    ['a survey lead with no province',", "    [3, 'a survey lead with no province',")]])
  expect(excludedTitles(rowDiff(13, '    [3, ...]'), numeric, vitest)).toEqual(['names a broken folder: %s'])
})
test('a line after a table test belongs to the next titled test, and a $name title excludes the whole table', () => {
  const post = new Map([['tests/unit/showcase.test.ts', [...table.split('\n'), "  it('later', () => {", '    expect(1)', '  })'].join('\n')]])
  expect(excludedTitles(rowDiff(18, '    expect(1)'), post, vitest)).toEqual(['later'])
  const named = new Map([['tests/unit/showcase.test.ts', table.replace('names a broken folder: %s', 'names $name')]])
  expect(excludedTitles(rowDiff(13, table.split('\n')[12]), named, vitest)).toEqual(['names $name'])
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

test('an it.each or template title excludes the runner\'s formatted names, and only whole titles', () => {
  const f = (name) => ({ name, status: 'fail', message: '' })
  expect(caught([f('suite > rejects "a b" for 3')], ['rejects %s for %d'])).toBe(false)
  expect(caught([f('suite > rejects a place')], ['rejects ${name}'])).toBe(false)
  expect(caught([f('suite > rejects a place')], ['rejects $name'])).toBe(false)
  expect(caught([f('suite > rejects a.b place')], ['rejects $row.name'])).toBe(false)
  expect(caught([f('f.test.ts \u203a suite \u203a trims')], ['trims'])).toBe(false)
  expect(caught([f('trims')], ['trims'])).toBe(false)
  expect(caught([f('suite > trims the name of a place')], ['trims'])).toBe(true)
  expect(caught([f('suite > retrims')], ['trims'])).toBe(true)
  expect(caught([f('suite > costs 5 (x)')], ['costs 5 (x)'])).toBe(false) // regex characters are literal
  expect(caught([f('suite > costs 55 xx')], ['costs 5 (x)'])).toBe(true)
})

test('a title of holes only excludes nothing, since it would match every case', () => {
  const f = (name) => ({ name, status: 'fail', message: '' })
  for (const t of ['%s', '${name}', '$name %d', ' %s ']) expect(caught([f('suite > anything')], [t])).toBe(true)
  expect(caught([f('suite > a b')], ['%s', 'a %s'])).toBe(false)
})

// CLI smoke test. Layers write JUnit by hand: the "bug" is the word buggy in src/a.txt, which the fix changed.
const { replay } = await import('../bench/replay.mjs')
const dropRoot = releaseRoot()
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
// the layer prints a secret to both streams, then writes a passing case, one failing case named by failing when the bug
// is present, and one named by always in every run (a test broken without the bug); each run adds a line to runs
const layer = (failing, always = '', runs = '/dev/null') => `echo SECRET-OUT; echo SECRET-ERR >&2; echo run >> ${runs}; { echo '<testsuite><testcase name="suite > steady"/>'; if grep -q buggy src/a.txt; then echo '<testcase name="suite > ${failing}"><failure message="boom"/></testcase>'; fi; ${always ? `echo '<testcase name="suite > ${always}"><failure message="flaky"/></testcase>';` : ''} echo '</testsuite>'; } > "$BENCH_JUNIT"; echo "excluded: $(cat "$BENCH_EXCLUDE")" >&2`
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
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }); dropRoot() })

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
test('dev mode marks a case excluded by a template title, as caught counts it', async () => {
  const each = `${repo}/tests/each.test.js`
  writeFileSync(each, "it.each(['name'])('rejects a %s of spaces', () => {})\n")
  git('add', '.'); git('commit', '-qm', 'fix with a table test')
  const fix2 = git('rev-parse', 'HEAD')
  const r = await cli([mkTask({ unit: layer('rejects a name of spaces') }), bug('b14', { at: fix2, fix: fix2 }), 'unit'])
  expect(r.stdout).toBe('FAIL suite > rejects a name of spaces (excluded)\nb14 missed\n')
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

test('sealed: git apply says nothing about the bug, not even for a re-added line with trailing whitespace', async () => {
  writeFileSync(join(tmp, 'bugs/ws.patch'), readFileSync(join(tmp, 'bugs/fix.patch'), 'utf8').replace('-buggy', '-buggy   '))
  expect(Bun.spawnSync(['git', 'apply', '-R', '--check', join(tmp, 'bugs/ws.patch')], { cwd: repo }).exitCode).not.toBeNull() // fixture sanity
  const r = await cli([mkTask({ unit: layer('older check') }), bug('b7', { patch: 'ws.patch' }), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b7 caught\n', stderr: '', code: 0 })
  const bad = await cli([mkTask({ unit: layer('x') }), bug('b8', { patch: 'bad.patch' }), 'unit', '--sealed'])
  expect(bad).toMatchObject({ stdout: '', stderr: 'b8 patch does not apply\n', code: 2 })
})
test('sealed: setup, teardown and start output are silent and no start log is left behind', async () => {
  const t = mkTask({ unit: layer('older check') }, { setup: ['echo SETUP-OUT; echo SETUP-ERR >&2'], teardown: ['echo TD-OUT; echo TD-ERR >&2'] })
  const r = await cli([t, bug('b9'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b9 caught\n', stderr: '', code: 0 })
  expect(readdirSync(sub).filter((n) => n.endsWith('-replay-b9.log'))).toEqual([])
})
test('a run with no non-skip case is an error, not a miss', async () => {
  const empty = `{ echo '<testsuite>'; echo '<testcase name="s > skipped"><skipped/></testcase>'; echo '</testsuite>'; } > "$BENCH_JUNIT"`
  expect(await cli([mkTask({ unit: empty }), bug('b10'), 'unit', '--sealed'])).toMatchObject({ stdout: 'b10 error\n', code: 1 })
  expect(await cli([mkTask({ unit: 'echo "<testsuite/>" > "$BENCH_JUNIT"' }), bug('b11'), 'unit', '--sealed'])).toMatchObject({ stdout: 'b11 error\n', code: 1 })
})
test('replay starts no app: a start that would fail does not stop the layer', async () => {
  const r = await cli([mkTask({ unit: layer('older check') }, { start: 'exit 1' }), bug('b13'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b13 caught\n', code: 0 })
})
test('the baseline runs once per task, at and layer, without the bug and quiet when sealed; a case failing there is no catch', async () => {
  const runs = join(tmp, `runs-${rand()}`), t = mkTask({ unit: layer('new check', 'broken before', runs) })
  const name = JSON.parse(readFileSync(t, 'utf8')).name, base = join(tmp, 'results', `baseline-${name}-${fix.slice(0, 7)}-unit.xml`)
  const r = await cli([t, bug('b20'), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: 'b20 missed\n', stderr: '', code: 0 })
  expect(readFileSync(base, 'utf8')).toContain('broken before')
  expect(readFileSync(base, 'utf8')).not.toContain('new check') // run without the bug
  const dev = await cli([t, bug('b21'), 'unit'])
  expect(dev.stdout).toBe('FAIL suite > new check (excluded)\nFAIL suite > broken before (fails at baseline)\nb21 missed\n')
  expect(dev.stderr).toContain(`baseline ${base}: 1 failing`)
  expect(readFileSync(runs, 'utf8')).toBe('run\nrun\nrun\n') // one baseline, two bug runs
  expect((await cli([mkTask({ unit: layer('older check', 'broken before') }), bug('b22'), 'unit', '--sealed'])).stdout).toBe('b22 caught\n')
})
test('a baseline with no results is "<id> error", runs no bug run and is not kept', async () => {
  const runs = join(tmp, `runs-${rand()}`)
  const onlyBuggy = `echo run >> ${runs}; if grep -q buggy src/a.txt; then echo '<testsuite><testcase name="x"/></testsuite>' > "$BENCH_JUNIT"; fi`
  const t = mkTask({ unit: onlyBuggy })
  expect(await cli([t, bug('b23'), 'unit', '--sealed'])).toMatchObject({ stdout: 'b23 error\n', stderr: '', code: 1 })
  expect(readFileSync(runs, 'utf8')).toBe('run\n')
  expect(existsSync(join(tmp, 'results', `baseline-${JSON.parse(readFileSync(t, 'utf8')).name}-${fix.slice(0, 7)}-unit.xml`))).toBe(false)
})
test('a test added after the fix, before at, is excluded too, and a title of holes only is dropped and reported', async () => {
  writeFileSync(join(repo, 'tests/later.test.js'), "it('later check', () => {})\nit.each(['a'])('%s', () => {})\n")
  git('add', '.'); git('commit', '-qm', 'a later test')
  const later = git('rev-parse', 'HEAD')
  const r = await cli([mkTask({ unit: layer('later check') }), bug('b24', { at: later }), 'unit'])
  expect(r.stdout).toBe('FAIL suite > later check (excluded)\nb24 missed\n')
  expect(r.stderr).toContain('excluded title dropped (no literal text, it would match every case): %s')
  expect(r.stderr).toMatch(/excluded: new check\n(.+\n)*later check\n/) // the fix's test and the later one reach the layer
  expect(r.stderr.split('\n')).not.toContain('%s') // the dropped title does not
  const sealed = await cli([mkTask({ unit: layer('older check') }), bug('b25', { at: later }), 'unit', '--sealed'])
  expect(sealed).toMatchObject({ stdout: 'b25 caught\n', stderr: '' })
})
test('a merge commit as the fix is refused', async () => {
  const main = git('rev-parse', '--abbrev-ref', 'HEAD')
  git('checkout', '-q', '-b', 'side', c0)
  writeFileSync(join(repo, 'side.txt'), 's'); git('add', '.'); git('commit', '-qm', 'side')
  git('checkout', '-q', main); git('merge', '-q', '--no-ff', 'side', '-m', 'merge')
  const r = await cli([mkTask({ unit: layer('x') }), bug('b12', { fix: git('rev-parse', 'HEAD') }), 'unit', '--sealed'])
  expect(r).toMatchObject({ stdout: '', code: 2 })
  expect(r.stderr).toContain('merge commit')
})
