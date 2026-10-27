import { test, expect, afterAll } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withEnv, withWorktree, clean, portBusy } from '../bench/env.mjs'
import { parseTask } from '../bench/lib/task.mjs'

const ROOT = '/tmp/hstack-bench'
const rand = () => Math.random().toString(36).slice(2, 8)
const sub = `${ROOT}/test-${rand()}`
const subReal = realpathSync('/tmp') + sub.slice('/tmp'.length) // lsof prints realpaths (/private/tmp on macOS)
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-env-')))
const repo = join(tmp, 'repo')
const git = (...a) => Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a]).stdout.toString().trim()

mkdirSync(repo)
git('init', '-q')
writeFileSync(join(repo, 'page.txt'), 'v1')
git('add', '.'); git('commit', '-qm', 'one')
const c1 = git('rev-parse', 'HEAD')
writeFileSync(join(repo, 'page.txt'), 'v2')
git('commit', '-qam', 'two')

const freePort = () => { const l = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } }); const p = l.port; l.stop(true); return p }
const start = `bun -e "Bun.serve({ port: Number(process.env.BENCH_PORT), fetch: () => new Response(Bun.file('page.txt')) })"`
const mk = (extra = {}) => {
  const port = freePort()
  return parseTask({
    name: `t${rand()}`, repo, db: null, port, setup: [], start, ready: `http://127.0.0.1:${port}/`,
    oracle: 'true', junit: 'results.xml', teardown: [], timeoutSec: 20, ...extra,
  }, { forbid: { paths: [] } })
}
const opts = { root: sub, pollMs: 100 }
const serve = (body) => `bun -e "Bun.serve({ port: Number(process.env.BENCH_PORT), fetch: () => ${body} })"`
const pgrep = (pat) => Bun.spawnSync(['pgrep', '-f', pat]).stdout.toString().trim()
const worktrees = () => git('worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).length
const lsofUnder = async (dir) => (await Bun.$`lsof -a -d cwd -Fn`.nothrow().quiet().text()).split('\n').filter((l) => l.startsWith('n' + dir))

afterAll(async () => {
  await clean(sub)
  expect(worktrees()).toBe(1)
  expect(await lsofUnder(subReal)).toEqual([])
  rmSync(tmp, { recursive: true, force: true })
})

test('starts the app at a commit, calls fn with its URL, and leaves no worktree or listener', async () => {
  const task = mk({ setup: ['echo "$BENCH_PORT $BENCH_URL" > setup.txt'], teardown: [`echo "$BENCH_JUNIT" > ${tmp}/teardown.txt`] })
  let seen
  const out = await withEnv(task, c1, 'grade-1', async (e) => {
    seen = e
    expect(e.url).toBe(`http://localhost:${task.port}`)
    expect(await (await fetch(e.url)).text()).toBe('v1')
    expect(await Bun.file(join(e.dir, 'setup.txt')).text()).toBe(`${task.port} ${e.url}\n`)
    expect(e.junitPath).toBe(join(e.dir, 'results.xml'))
    expect(e.env.BENCH_DIR).toBe(e.dir)
    return 42
  }, opts)
  expect(out).toBe(42)
  expect(seen.dir).toBe(`${realpathSync(sub)}/${task.name}-grade-1`)
  expect(existsSync(seen.dir)).toBe(false)
  expect(worktrees()).toBe(1)
  expect(await portBusy(task.port)).toBe(false)
  expect(await Bun.file(`${tmp}/teardown.txt`).text()).toBe(`${seen.junitPath}\n`)
})

test('two labels at one commit get two folders', async () => {
  const a = mk()
  const b = mk({ name: a.name })
  await withEnv(a, c1, 'B-1', async (ea) => {
    await withEnv(b, c1, 'B-2', async (eb) => {
      expect(ea.dir).not.toBe(eb.dir)
      expect(existsSync(ea.dir) && existsSync(eb.dir)).toBe(true)
      expect(await (await fetch(eb.url)).text()).toBe('v1')
    }, opts)
    const c = mk({ name: a.name })
    await expect(withEnv(c, c1, 'B-1', async () => {}, opts)).rejects.toThrow(`worktree ${ea.dir} exists`)
  }, opts)
  expect(worktrees()).toBe(1)
})

for (const hostname of ['0.0.0.0', '::']) {
  test(`refuses a busy port (listener on ${hostname})`, async () => {
    const task = mk()
    const l = Bun.listen({ hostname, port: task.port, socket: { data() {} } })
    try {
      await expect(withEnv(task, c1, 'busy', async () => {}, opts)).rejects.toThrow(`port ${task.port} busy`)
      expect(existsSync(`${sub}/${task.name}-busy`)).toBe(false)
    } finally { l.stop(true) }
  })
}

test('stops the app and removes the worktree when fn throws', async () => {
  const task = mk({ teardown: ['exit 3'] })
  let dir
  await expect(withEnv(task, c1, 'throw', async (e) => { dir = e.dir; throw new Error('boom') }, opts)).rejects.toThrow('boom')
  expect(existsSync(dir)).toBe(false)
  expect(await portBusy(task.port)).toBe(false)
  expect(worktrees()).toBe(1)
})

test('a failing teardown after a good fn throws with the command and its exit code', async () => {
  const task = mk({ teardown: ['exit 3'] })
  await expect(withEnv(task, c1, 'td', async () => 1, opts)).rejects.toThrow(/exit 3.*exit 3/)
  expect(worktrees()).toBe(1)
})

test('a failing setup throws and runs no app', async () => {
  const task = mk({ setup: ['exit 5'] })
  await expect(withEnv(task, c1, 'su', async () => {}, opts)).rejects.toThrow(/exit 5/)
  expect(worktrees()).toBe(1)
})

test('fails at once when start exits before ready, naming the log', async () => {
  const task = mk({ start: 'echo starting; exit 7', timeoutSec: 60 })
  const t0 = Date.now()
  const err = await withEnv(task, c1, 'early', async () => {}, { root: sub }).catch((e) => e)
  expect(Date.now() - t0).toBeLessThan(5000)
  const log = `${realpathSync(sub)}/${task.name}-early.log`
  expect(err.message).toContain('exit 7')
  expect(err.message).toContain(log)
  expect(await Bun.file(log).text()).toBe('starting\n')
})

test('quiet sends setup and teardown output nowhere and removes the start log', async () => {
  const task = mk({ setup: ['echo SETUP-OUT; echo SETUP-ERR >&2'], teardown: ['echo TD-OUT'] })
  const log = `${realpathSync(sub)}/${task.name}-q.log`
  const p = Bun.spawn(['bun', '-e', `import { withEnv } from '${join(import.meta.dir, '../bench/env.mjs')}'; await withEnv(JSON.parse(process.argv[1]), '${c1}', 'q', async () => {}, { root: '${sub}', pollMs: 100, quiet: true })`, JSON.stringify(task)],
    { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  expect({ out, err, code }).toEqual({ out: '', err: '', code: 0 })
  expect(existsSync(log)).toBe(false)
  const loud = await withEnv(task, c1, 'loud', async () => {}, opts).then(() => `${realpathSync(sub)}/${task.name}-loud.log`)
  expect(existsSync(loud)).toBe(true)
})

test('withWorktree alone adds and removes a worktree, running before nothing else', async () => {
  const task = mk()
  const out = await withWorktree(task, c1, 'audit', async (dir) => Bun.file(join(dir, 'page.txt')).text(), sub)
  expect(out).toBe('v1')
  expect(worktrees()).toBe(1)
})

test('refuses a root outside /tmp/hstack-bench', async () => {
  const task = mk()
  for (const root of ['/tmp', '/tmp/hstack-bench-x', `${ROOT}/../elsewhere`, tmp]) {
    await expect(withWorktree(task, c1, 'r', async () => {}, root)).rejects.toThrow(/root/)
    await expect(clean(root)).rejects.toThrow(/root/)
  }
  await expect(withWorktree(task, c1, '../up', async () => {}, sub)).rejects.toThrow(/label/)
})

test('clean removes only its own folder', async () => {
  const mine = `${ROOT}/test-${rand()}-clean`, keep = `${ROOT}/test-${rand()}-keep`
  const wt = `${mine}/stale-1`
  mkdirSync(mine, { recursive: true })
  mkdirSync(keep, { recursive: true })
  writeFileSync(`${keep}/f.txt`, 'keep')
  writeFileSync(`${tmp}/outside.txt`, 'keep')
  git('worktree', 'add', '-q', '--detach', wt, c1)
  const sleeper = Bun.spawn(['sleep', '60'], { cwd: wt, detached: true })
  try {
    await clean(mine)
    expect(await sleeper.exited).not.toBe(0)
    expect(existsSync(mine)).toBe(false)
    expect(worktrees()).toBe(1)
    expect(await Bun.file(`${keep}/f.txt`).text()).toBe('keep')
    expect(await Bun.file(`${tmp}/outside.txt`).text()).toBe('keep')
  } finally {
    sleeper.kill('SIGKILL')
    rmSync(keep, { recursive: true, force: true })
  }
})

test('kills children of the start shell, not only the shell', async () => {
  const mark = `sleep ${3000 + Math.floor(Math.random() * 900)}`
  const task = mk({ start: `${mark} & ${start}` })
  await withEnv(task, c1, 'kids', async () => { expect(pgrep(mark)).not.toBe('') }, opts)
  expect(pgrep(mark)).toBe('')
  expect(await portBusy(task.port)).toBe(false)
})

test('a 404 page counts as ready', async () => {
  const task = mk({ start: serve(`new Response('no', { status: 404 })`) })
  expect(await withEnv(task, c1, 'nf', async (e) => (await fetch(e.url)).status, opts)).toBe(404)
})

test('times out when the app never becomes ready, and stops it', async () => {
  const mark = `sleep ${4000 + Math.floor(Math.random() * 900)}`
  const task = mk({ start: mark, timeoutSec: 1 })
  const log = `${realpathSync(sub)}/${task.name}-slow.log`
  await expect(withEnv(task, c1, 'slow', async () => {}, opts)).rejects.toThrow(`app not ready at ${task.ready} after 1 s; log: ${log}`)
  expect(pgrep(mark)).toBe('')
  expect(worktrees()).toBe(1)
})

test('clean never follows a symlink out of its root', async () => {
  const mine = `${ROOT}/test-${rand()}-link`
  const out = join(tmp, 'outwt')
  git('worktree', 'add', '-q', '--detach', out, c1)
  mkdirSync(mine, { recursive: true })
  symlinkSync(out, `${mine}/link`)
  try {
    await clean(mine)
    expect(await Bun.file(join(out, 'page.txt')).text()).toBe('v1')
    expect(git('worktree', 'list', '--porcelain')).toContain(`worktree ${out}`)
    expect(existsSync(mine)).toBe(false)
  } finally {
    git('worktree', 'remove', '--force', out)
  }
})
