import { test, expect, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clean } from '../bench/env.mjs'
import { ROOT, releaseRoot } from './bench-root.mjs'

// A repo with two task ranges (t1 = c0..k1, t2 = k1..end2, first parent) and fix commits after them. Only `fixed`
// changes a file; the others are empty, since ownership reads only shas, ranges and the bug's hunks.
const dropRoot = releaseRoot()
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-bugs-')))
const repo = join(tmp, 'repo')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()
const commit = (msg) => { git('commit', '-q', '--allow-empty', '-m', msg); return git('rev-parse', '--short=7', 'HEAD') }
mkdirSync(join(repo, 'src'), { recursive: true })
git('init', '-q')
writeFileSync(join(repo, 'src/a.txt'), 'buggy\n')
git('add', '.')
const c0 = commit('zero')
const k1 = commit('task one'), k2 = commit('task two'), fIn = commit('a fix inside task two'), end2 = commit('task two ends')
writeFileSync(join(repo, 'src/a.txt'), 'fixed\n')
git('add', '.')
const fixed = commit('the fix the patch holds')
const fA = commit('fix A'), fT = commit('fix T'), fNone = commit('fix with no owner')
const main = git('rev-parse', '--abbrev-ref', 'HEAD')
git('checkout', '-q', '-b', 'side', c0)
writeFileSync(join(repo, 'side.txt'), 's'); git('add', '.'); commit('side')
git('checkout', '-q', main); git('merge', '-q', '--no-ff', 'side', '-m', 'merge')
const merge = git('rev-parse', '--short=7', 'HEAD')

const data = join(tmp, 'data')
mkdirSync(join(data, 'tasks'), { recursive: true })
writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
writeFileSync(join(data, 'tasks.json'), JSON.stringify({ t1: { base: c0, end: k1 }, t2: { base: k1, end: end2 } }))
const tsv = (rows) => ['commit\tfile\told_lines\ttask_lines\ttests_changed\tsubject', ...rows.map((r) => [...r, 'yes', 'a subject'].join('\t'))].join('\n') + '\n'
writeFileSync(join(data, 'tasks/t1.tsv'), tsv([
  [fA, 'src/a.txt', '2,1', '1'], [fA, 'src/a.txt', '50,9', '9'], // 50 must not match a hunk at 5
  [fT, 'src/a.txt', '7,1', '1'],
  [fIn, 'src/c.txt', '1,1', '1'],
]))
writeFileSync(join(data, 'tasks/t2.tsv'), tsv([
  [fA, 'src/a.txt', '5,2', '2'],
  [fT, 'src/a.txt', '7,1', '1'],
  [k2, 'src/d.txt', '3,1', '1'],
]))
const task = join(tmp, 'task.json')
writeFileSync(task, JSON.stringify({ name: `t${rand()}`, repo, db: null, port: 3999, start: 'true', ready: 'http://127.0.0.1:3999/', oracle: 'true', junit: 'r.xml' }))
const okPatch = git('diff', `${fixed}^`, fixed, '--', 'src/a.txt') + '\n'

// a folder of bug files; each bug is { id, fix, ...extra } with a hunk at src/a.txt:9 unless given
const folder = (bugs, files = {}) => {
  const dir = join(tmp, `bugs-${rand()}`)
  mkdirSync(dir)
  writeFileSync(join(dir, 'ok.patch'), okPatch)
  writeFileSync(join(dir, 'bad.patch'), 'not a patch\n')
  for (const { id, ...b } of bugs)
    writeFileSync(join(dir, `${id}.json`), JSON.stringify({ id, at: merge, patch: 'ok.patch', description: `"secret clause ${id}". Test title: "hidden title"`, hunks: [{ file: 'src/a.txt', old: 9 }], ...b }))
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
  return dir
}
const read = (dir, id) => JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'))
const cli = async (args) => {
  const p = Bun.spawn(['bun', '-e', `import { bugs } from '${join(import.meta.dir, '../bench/bugs.mjs')}'; try { process.exit(await bugs(JSON.parse(process.argv[1]), { root: '${sub}' })) } catch (e) { console.error(e.message); process.exit(2) }`, JSON.stringify(args)],
    { env: { ...process.env, HSTACK_BENCH_MACHINE: join(data, 'machine.json') }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  return { stdout, stderr, code }
}
const usable = async (dir, layer) => (await cli([task, dir, '--usable', layer])).stdout.split('\n').filter(Boolean).map((p) => p.slice(dir.length + 1)).sort()
afterAll(async () => { await clean(sub); rmSync(tmp, { recursive: true, force: true }); dropRoot() })

test('owner is the task with the most tsv lines over the bug\'s hunks, ties to the earlier task', async () => {
  const dir = folder([
    { id: 'most', fix: fA, hunks: [{ file: 'src/a.txt', old: 2 }, { file: 'src/a.txt', old: 5 }] },
    { id: 'tie', fix: fT, hunks: [{ file: 'src/a.txt', old: 7 }] },
    { id: 'rows', fix: fIn, hunks: [{ file: 'src/c.txt', old: 1 }] }, // a row beats the range of t2
    { id: 'rowend', fix: k2, hunks: [{ file: 'src/d.txt', old: 3 }] }, // owned by its row, and t2's end holds the fix
  ])
  const r = await cli([task, dir])
  expect(r).toMatchObject({ code: 0, stderr: '' })
  expect(r.stdout).toContain('most task=t2 out=ok\n')
  expect(read(dir, 'most')).toMatchObject({ task: 't2', base: k1, end: end2, out: null, patch: 'ok.patch' })
  expect(read(dir, 'tie')).toMatchObject({ task: 't1', base: c0, end: k1, out: null })
  expect(read(dir, 'rows')).toMatchObject({ task: 't1', out: null })
  expect(read(dir, 'rowend')).toMatchObject({ task: 't2', out: 'fix in end' })
})

test('a fix inside a task\'s range with no tsv row makes that task the owner, out "fix in end"', async () => {
  const dir = folder([{ id: 'inside', fix: fIn }])
  expect((await cli([task, dir])).stdout).toStartWith('inside task=t2 out=fix in end\n')
  expect(read(dir, 'inside')).toMatchObject({ task: 't2', base: k1, end: end2, out: 'fix in end' })
  for (const l of ['unit', 'int', 'e2e', 'evaluator']) expect(await usable(dir, l)).toEqual(['inside.json'])
  for (const l of ['review', 'audit']) expect(await usable(dir, l)).toEqual([])
})

test('no tsv row and no range: task null, out "no owner", usable for test layers only', async () => {
  const dir = folder([{ id: 'none', fix: fNone, base: 'stale', end: 'stale' }])
  expect((await cli([task, dir])).stdout).toStartWith('none task=none out=no owner\n')
  const b = read(dir, 'none')
  expect(b).toMatchObject({ task: null, out: 'no owner' })
  expect('base' in b || 'end' in b).toBe(false)
  for (const l of ['unit', 'int', 'e2e']) expect(await usable(dir, l)).toEqual(['none.json'])
  for (const l of ['evaluator', 'review', 'audit']) expect(await usable(dir, l)).toEqual([])
})

test('a patch that does not reverse-apply at at is out of every layer, and so is a merge commit as the fix', async () => {
  const dir = folder([{ id: 'bad', fix: fA, patch: 'bad.patch', hunks: [{ file: 'src/a.txt', old: 2 }] }, { id: 'merged', fix: merge }])
  const r = await cli([task, dir])
  expect(r.code).toBe(0)
  expect(read(dir, 'bad')).toMatchObject({ task: 't1', out: 'patch does not apply' })
  expect(read(dir, 'merged').out).toBe('fix is a merge commit')
  for (const l of ['unit', 'int', 'e2e', 'evaluator', 'review', 'audit']) expect(await usable(dir, l)).toEqual([])
})

test('a dropped bug is counted and never usable', async () => {
  const dir = folder([{ id: 'gone', fix: fA, patch: 'bad.patch', dropped: 'the patch could not be fixed' }, { id: 'kept', fix: fA, hunks: [{ file: 'src/a.txt', old: 2 }] }])
  const r = await cli([task, dir])
  expect(r.stdout).toContain('gone task=none out=dropped\n')
  expect(r.stdout).toContain('bugs: 2\n')
  expect(r.stdout).toContain('out: dropped 1, ok 1\n')
  expect(read(dir, 'gone')).toMatchObject({ task: null, out: 'dropped' })
  for (const l of ['unit', 'int', 'e2e', 'evaluator', 'review', 'audit']) expect(await usable(dir, l)).toEqual(['kept.json'])
})

test('--usable review lists only bugs with out null, one path per line', async () => {
  const dir = folder([{ id: 'own', fix: fA, hunks: [{ file: 'src/a.txt', old: 2 }] }, { id: 'inside', fix: fIn }, { id: 'none', fix: fNone }, { id: 'bad', fix: fA, patch: 'bad.patch' }])
  await cli([task, dir])
  const r = await cli([task, dir, '--usable', 'review'])
  expect(r).toEqual({ stdout: join(dir, 'own.json') + '\n', stderr: '', code: 0 })
  expect(await usable(dir, 'unit')).toEqual(['inside.json', 'none.json', 'own.json'])
})

test('--usable creates no worktree and writes nothing', async () => {
  const dir = folder([{ id: 'own', fix: fA, hunks: [{ file: 'src/a.txt', old: 2 }] }])
  await cli([task, dir])
  const before = Object.fromEntries(readdirSync(dir).map((n) => [n, readFileSync(join(dir, n), 'utf8')]))
  const worktrees = git('worktree', 'list')
  rmSync(sub, { recursive: true, force: true })
  expect((await cli([task, dir, '--usable', 'review'])).code).toBe(0)
  expect(Object.fromEntries(readdirSync(dir).map((n) => [n, readFileSync(join(dir, n), 'utf8')]))).toEqual(before)
  expect(existsSync(sub)).toBe(false) // a check would have made the root for its check-* worktree
  expect(git('worktree', 'list')).toBe(worktrees)
  // a file the check never saw is an error, and no path is printed
  writeFileSync(join(dir, 'new.json'), JSON.stringify({ id: 'new', fix: fA, at: merge, patch: 'ok.patch', description: 'd', hunks: [{ file: 'src/a.txt', old: 1 }] }))
  const r = await cli([task, dir, '--usable', 'unit'])
  expect(r).toMatchObject({ stdout: '', code: 1 })
  expect(r.stderr).toContain('new.json has no out: run the check first')
  writeFileSync(join(dir, 'new.json'), '{ secret-token')
  expect(await cli([task, dir, '--usable', 'unit'])).toEqual({ stdout: '', stderr: 'new.json has no out: run the check first\n', code: 1 })
})

test('sealed mode prints counts and opaque ids only', async () => {
  const dir = folder([
    { id: 'ho-01', fix: fA, source: 'catalog', kind: 'logic', severity: 'high', hunks: [{ file: 'src/a.txt', old: 5 }, { file: 'src/secretfile.ts', old: 4321 }] },
    { id: 'ho-02', fix: fA, source: 'extension', kind: 'data', severity: 'low', patch: 'bad.patch', hunks: [{ file: 'src/a.txt', old: 5 }] },
    { id: 'ho-03', fix: merge, source: 'extension', kind: 'logic', severity: 'low' },
  ], { 'done.json': JSON.stringify({ finished: false, next: 'nextsecret' }), 'ho-04.json': '{ "id": "ho-04", "fix": "secretsha" }' })
  const r = await cli([task, dir, '--sealed'])
  expect(r.code).toBe(1) // ho-04 is not a valid bug file
  expect(r.stderr).toBe('')
  expect(r.stdout).toBe([
    'ho-04.json invalid',
    'bugs: 3',
    'source: catalog 1, extension 2',
    'kind: data 1, logic 2',
    'severity: high 1, low 2',
    'task: none 1, t2 2',
    'out: fix is a merge commit 1, ok 1, patch does not apply 1',
    'usable: unit 1, int 1, e2e 1, evaluator 1, review 1, audit 1',
    'patch does not apply: ho-02',
    'fix is a merge commit: ho-03',
    'finished: false',
    'usage 0/0/0/0 models none',
    '',
  ].join('\n'))
  for (const s of ['secretfile', '4321', 'secret', 'hidden', 'nextsecret', fA, merge, 'src/', repo, tmp]) expect(r.stdout).not.toContain(s)
  expect(read(dir, 'ho-01')).toMatchObject({ task: 't2', out: null })
})

test('usage sums every run record in the folder', async () => {
  const rec = (usage, models) => JSON.stringify({ label: 'x', usage, models })
  const dir = folder([{ id: 'own', fix: fA }], {
    'extension.reply.md.run.json': rec({ input: 1, output: 20, cacheRead: 300, cacheWrite: 4000 }, ['m-a']),
    'extension-2.reply.md.run.json': rec({ input: 2, output: 30, cacheRead: 400, cacheWrite: 5000 }, ['m-a', 'm-b']),
  })
  const r = await cli([task, dir, '--sealed'])
  expect(r.code).toBe(0)
  expect(r.stdout).toContain('bugs: 1\n') // run records are not bug files
  expect(r.stdout).toEndWith('usage 3/50/700/9000 models m-a,m-b\n')
})
