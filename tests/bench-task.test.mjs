import { test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseTask, loadTask } from '../bench/lib/task.mjs'

const machine = { forbid: { paths: ['/work/outsourcing'] } }
const ok = { name: 're', repo: '/work/copy/real-estate', db: 'bench_re8b', port: 3000, setup: ['pnpm seed:demo'],
  start: 'pnpm dev', ready: 'http://localhost:3000/', oracle: 'playwright test', junit: 'junit.xml', teardown: [] }
test('accepts a valid task and defaults the timeout to 1800 s', () => {
  expect(parseTask(ok, machine).timeoutSec).toBe(1800)
})
test('refuses a database name outside bench_', () => {
  expect(() => parseTask({ ...ok, db: 'real_estate' }, machine)).toThrow('db')
  expect(() => parseTask({ ...ok, db: 'bench_x; drop' }, machine)).toThrow('db')
})
test('refuses a repo under a forbidden path', () => {
  expect(() => parseTask({ ...ok, repo: '/work/outsourcing/real-estate' }, machine)).toThrow('repo')
  expect(() => parseTask({ ...ok, repo: '/work/outsourcing' }, machine)).toThrow('repo')
  expect(() => parseTask({ ...ok, repo: '/work/x/../outsourcing/a' }, machine)).toThrow('repo')
})
test('refuses a relative repo, a port outside 1024-65535 and a missing oracle', () => {
  expect(() => parseTask({ ...ok, repo: 'real-estate' }, machine)).toThrow('repo')
  expect(() => parseTask({ ...ok, port: 80 }, machine)).toThrow('port')
  expect(() => parseTask({ ...ok, oracle: '' }, machine)).toThrow('oracle')
})
test('accepts a null db and passes testTitle and layers through; defaults layers to {}', () => {
  const t = parseTask({ ...ok, db: null, testTitle: '^login', layers: { unit: 'bun test', a: { brief: 'b.md' } } }, machine)
  expect(t.db).toBeNull()
  expect(t.testTitle).toBe('^login')
  expect(t.layers.a.brief).toBe('b.md')
  const d = parseTask(ok, machine)
  expect(d.testTitle).toBeUndefined()
  expect(d.layers).toEqual({})
  expect(d.teardown).toEqual([])
})
test('refuses a bad name, a bad testTitle regex and non-object layers', () => {
  for (const name of ['', '../x', 'A b', '-x']) expect(() => parseTask({ ...ok, name }, machine)).toThrow('name')
  expect(() => parseTask({ ...ok, testTitle: '(' }, machine)).toThrow('testTitle')
  expect(() => parseTask({ ...ok, testTitle: 5 }, machine)).toThrow('testTitle')
  expect(() => parseTask({ ...ok, layers: [] }, machine)).toThrow('layers')
  expect(() => parseTask({ ...ok, layers: 'x' }, machine)).toThrow('layers')
})
test('refuses bad list, timeout and string fields', () => {
  expect(() => parseTask({ ...ok, setup: 'x' }, machine)).toThrow('setup')
  expect(() => parseTask({ ...ok, teardown: [1] }, machine)).toThrow('teardown')
  expect(() => parseTask({ ...ok, timeoutSec: 0 }, machine)).toThrow('timeoutSec')
  expect(() => parseTask({ ...ok, port: 3000.5 }, machine)).toThrow('port')
  expect(() => parseTask({ ...ok, start: '' }, machine)).toThrow('start')
  expect(() => parseTask({ ...ok, junit: undefined }, machine)).toThrow('junit')
})
test('refuses a symlink that points into a forbidden path', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'bench-task-')))
  const forbidden = join(dir, 'forbidden'); mkdirSync(forbidden)
  const link = join(dir, 'link'); symlinkSync(forbidden, link)
  expect(() => parseTask({ ...ok, repo: link }, { forbid: { paths: [forbidden] } })).toThrow('repo')
})
test('loadTask reads the task and machine files, and needs HSTACK_BENCH_MACHINE', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bench-task-'))
  writeFileSync(join(dir, 'task.json'), JSON.stringify(ok))
  writeFileSync(join(dir, 'machine.json'), JSON.stringify(machine))
  const prev = process.env.HSTACK_BENCH_MACHINE
  try {
    delete process.env.HSTACK_BENCH_MACHINE
    await expect(loadTask(join(dir, 'task.json'))).rejects.toThrow('set HSTACK_BENCH_MACHINE')
    process.env.HSTACK_BENCH_MACHINE = join(dir, 'machine.json')
    expect((await loadTask(join(dir, 'task.json'))).name).toBe('re')
  } finally {
    if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE
    else process.env.HSTACK_BENCH_MACHINE = prev
  }
})
