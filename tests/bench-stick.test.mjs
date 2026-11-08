import { test, expect, afterAll, spyOn } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { stick } from '../bench/stick.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-stick-')))
const prevMachine = process.env.HSTACK_BENCH_MACHINE
afterAll(() => {
  if (prevMachine === undefined) delete process.env.HSTACK_BENCH_MACHINE
  else process.env.HSTACK_BENCH_MACHINE = prevMachine
  rmSync(tmp, { recursive: true, force: true })
})
const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out: out.join('\n') } } finally { a.mockRestore(); b.mockRestore() }
}
const put = (root, files) => { for (const [f, text] of Object.entries(files)) { mkdirSync(join(root, f, '..'), { recursive: true }); writeFileSync(join(root, f), text) } }
const sha = (text) => new Bun.CryptoHasher('sha256').update(text).digest('hex')
let n = 0
// a fresh data folder per test, its manifest written outside it
const fixture = (files) => {
  const d = join(tmp, `d${++n}`)
  put(d, { 'machine.json': '{}', ...files })
  return d
}
const run = (d, args) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  return quiet(() => stick(args)).finally(() => { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev })
}
const hash = async (d) => {
  const out = join(tmp, `m${n}.sha256`)
  const r = await run(d, ['hash', '--out', out])
  const text = readFileSync(out, 'utf8')
  return { ...r, text, paths: text.trim().split('\n').map((l) => l.slice(66)), file: out }
}
const lock = (lines) => { const f = join(tmp, `lock${++n}.md`); writeFileSync(f, `# lock\n\n${lines.join('\n')}\n`); return f }
const reasonsFile = (rows) => { const f = join(tmp, `reasons${++n}.tsv`); writeFileSync(f, rows.map((r) => r.join('\t')).join('\n') + '\n'); return f }

test('hash does not follow a link and counts it', async () => {
  const d = fixture({ 'x/a.txt': 'a', 'x/y/b.txt': 'b' })
  symlinkSync('x', join(d, 'px'))
  const r = await hash(d)
  expect(r.code).toBe(0)
  expect(r.paths).toEqual(['machine.json', 'x/a.txt', 'x/y/b.txt'])
  expect(r.out).toContain('stick hash: files 3, link 1, node_modules 0, store 0, secret 0, transcript 0, rewritten 0')
  expect(r.out).toContain('stick hash x 2')
  expect(r.text).toContain(`${sha('a')}  x/a.txt\n`)
})

test('hash leaves out secrets and run transcripts', async () => {
  const d = fixture({
    'arm/box.env': 's', 'arm/claude-1': 'c', 'step9/pages/a.token': 't', 'step9/pages/a.html': 'p',
    'results/r-1/1-main.jsonl': 'j', 'results/r-1.json': '{}', 'results/r-1/settings.json': '{}', 'transcripts/s/t.jsonl': 'j',
  })
  const r = await hash(d)
  for (const p of ['arm/box.env', 'step9/pages/a.token', 'results/r-1/1-main.jsonl']) expect(r.paths).not.toContain(p)
  for (const p of ['arm/claude-1', 'step9/pages/a.html', 'results/r-1.json', 'results/r-1/settings.json', 'transcripts/s/t.jsonl']) expect(r.paths).toContain(p)
  expect(r.out).toContain('secret 2, transcript 1,')
})

test("inside a git store only the refs and the store's identity are hashed", async () => {
  const store = { HEAD: 'h', config: 'c', shallow: 's', 'packed-refs': 'p', 'refs/seeded/sb-1': 'r', 'objects/info/alternates': 'a',
    'objects/ab/cd': 'o', 'objects/pack/p.pack': 'k', FETCH_HEAD: 'f', index: 'i', 'logs/HEAD': 'l', 'hooks/x.sample': 'x', description: 'd' }
  const files = { 'ext/repos/list.txt': 'not a store' }
  for (const s of ['seeded/repos/k.git', 'ext/repos/o__r']) for (const [f, t] of Object.entries(store)) files[`${s}/${f}`] = t
  const r = await hash(fixture(files))
  for (const s of ['seeded/repos/k.git', 'ext/repos/o__r']) {
    for (const f of ['HEAD', 'config', 'shallow', 'packed-refs', 'refs/seeded/sb-1', 'objects/info/alternates']) expect(r.paths).toContain(`${s}/${f}`)
    for (const f of ['objects/ab/cd', 'objects/pack/p.pack', 'FETCH_HEAD', 'index', 'logs/HEAD', 'hooks/x.sample', 'description']) expect(r.paths).not.toContain(`${s}/${f}`)
  }
  expect(r.paths).toContain('ext/repos/list.txt')
  // per store: objects/ab, objects/pack, FETCH_HEAD, index, logs, hooks, description
  expect(r.out).toContain('store 14,')
})

test('hash leaves out files every grade rewrites', async () => {
  const r = await hash(fixture({ 't/docker.json': '{}', 't/build/readiness.tsv': 'r', 'ext/removed.txt': 'x', 't/build/other.log': 'l', 'a/b/docker.json': '{}' }))
  for (const p of ['t/docker.json', 't/build/readiness.tsv', 'ext/removed.txt']) expect(r.paths).not.toContain(p)
  expect(r.paths).toContain('t/build/other.log')
  expect(r.paths).toContain('a/b/docker.json')
  expect(r.out).toContain('rewritten 3')
})

test('node_modules is left out', async () => {
  const r = await hash(fixture({ 'oracle-scaffold/node_modules/p/index.js': 'x', 'oracle-scaffold/node_modules/q/index.js': 'y', 'oracle-scaffold/package.json': '{}' }))
  expect(r.paths).toEqual(['machine.json', 'oracle-scaffold/package.json'])
  expect(r.out).toContain('node_modules 1,')
})

test('lines are sorted bytewise and odd paths round-trip', async () => {
  const d = fixture({ 'o/é': '1', 'o/a b': '2', 'o/a': '3', 'o/B': '4' })
  const r = await hash(d)
  expect(r.paths).toEqual(['machine.json', 'o/B', 'o/a', 'o/a b', 'o/é'])
  const c = await run(d, ['compare', r.file])
  expect(c.out).toContain(`stick compare ${r.file}: hashed=5 equal=5 changed=0 missing=0 unexplained=0`)
  const l = lock(r.text.trim().split('\n').filter((x) => x.includes('o/')))
  expect((await run(d, ['compare', l])).out).toContain('equal=4 ')
})

test('a changed file no reason matches is unexplained', async () => {
  const d = fixture({ 't/a.txt': 'now' })
  const l = lock([`${sha('then')}  t/a.txt`])
  const r = await run(d, ['compare', l, '--reasons', reasonsFile([['u/*', 'other']])])
  expect(r.code).toBe(1)
  expect(r.out).toContain('hashed=1 equal=0 changed=1 missing=0 unexplained=1')
  expect(r.out).toContain('changed t/a.txt unexplained')
})

test('a changed file takes the first matching reason', async () => {
  const d = fixture({ 't/a.txt': 'now', 't/b.txt': 'b' })
  const l = lock([`${sha('then')}  t/a.txt`, `${sha('b')}  t/b.txt`])
  const r = await run(d, ['compare', l, '--reasons', reasonsFile([['u/*', 'other'], ['t/a.txt', 'first'], ['t/*', 'second']])])
  expect(r.code).toBe(0)
  expect(r.out).toContain('hashed=2 equal=1 changed=1 missing=0 unexplained=0')
  expect(r.out).toContain('changed t/a.txt first')
  expect(r.out).toContain('reason t/a.txt changed=1 equal=0')
  expect(r.out).toContain('reason t/* changed=1 equal=1')
  expect(r.out).toContain('reason u/* changed=0 equal=0')
})

test('a missing file is reported and fails the compare', async () => {
  const d = fixture({ 't/a.txt': 'a' })
  const l = lock([`${sha('a')}  t/a.txt`, `${sha('gone')}  t/gone.txt`])
  const r = await run(d, ['compare', l, '--reasons', reasonsFile([['t/gone.txt', 'removed by step 5']])])
  expect(r.code).toBe(1)
  expect(r.out).toContain('hashed=2 equal=1 changed=0 missing=1 unexplained=0')
  expect(r.out).toContain('missing t/gone.txt removed by step 5')
  const bare = await run(d, ['compare', l])
  expect(bare.code).toBe(1)
  expect(bare.out).toContain('missing t/gone.txt unexplained')
})

test('a progress/ path resolves to the repo', async () => {
  const repo = resolve(import.meta.dir, '..')
  const d = fixture({})
  const l = lock([`${sha(readFileSync(join(repo, 'progress/step3-lock.md')))}  progress/step3-lock.md`])
  const r = await run(d, ['compare', l])
  expect(r.code).toBe(0)
  expect(r.out).toContain('hashed=1 equal=1 changed=0 missing=0')
})

test('a path hashed twice in one lock is compared at its last line', async () => {
  const d = fixture({ 't/a.txt': 'now' })
  const r = await run(d, ['compare', lock([`${sha('then')}  t/a.txt`, `${sha('now')}  t/a.txt`])])
  expect(r.code).toBe(0)
  expect(r.out).toContain('hashed=1 equal=1 changed=0 missing=0 unexplained=0')
})
