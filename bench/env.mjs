#!/usr/bin/env bun
// Throwaway environment: a detached git worktree under /tmp/hstack-bench, the task's app started in it, and cleanup.
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { loadTask } from './lib/task.mjs'

export const ROOT = '/tmp/hstack-bench'

// realpath of the nearest existing ancestor plus the rest, so a root that does not exist yet still resolves
const realish = (p) => (existsSync(p) ? realpathSync(p) : join(realish(dirname(p)), basename(p)))
const under = (p, root) => p === root || p.startsWith(root + '/')

function checkRoot(root) {
  const top = realish(ROOT), r = realish(resolve(root))
  if (!under(top, realpathSync('/tmp'))) throw new Error(`root ${ROOT} resolves outside /tmp (${top})`)
  if (!under(r, top)) throw new Error(`root ${root} is not ${ROOT} or under it`)
  return r
}

const connects = (hostname, port) => Bun.connect({ hostname, port, socket: { data() {} } }).then((s) => (s.end(), true), () => false)
// Bun.listen sets SO_REUSEPORT, so a listen that succeeds proves little; the connect probes carry the check
export async function portBusy(port) {
  if ((await connects('127.0.0.1', port)) || (await connects('::1', port))) return true
  try { Bun.listen({ hostname: '127.0.0.1', port, socket: { data() {} } }).stop(true); return false } catch { return true }
}

async function run(cmd, cwd, env) {
  // output to stderr so a CLI that prints results on stdout stays clean
  const code = await Bun.spawn(['sh', '-c', cmd], { cwd, env, stdout: 2, stderr: 2 }).exited
  if (code !== 0) throw new Error(`command failed (exit ${code}): ${cmd}`)
}

const git = async (repo, ...args) => {
  const p = Bun.spawn(['git', '-C', repo, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [code, err] = [await p.exited, await new Response(p.stderr).text()]
  if (code !== 0) throw new Error(`git -C ${repo} ${args.join(' ')} failed (exit ${code}): ${err.trim()}`)
}

export async function withWorktree(task, commit, label, fn, root = ROOT) {
  const r = checkRoot(root)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(label)) throw new Error(`label ${label} must match ^[A-Za-z0-9][A-Za-z0-9._-]*$`)
  const dir = join(r, `${task.name}-${label}`)
  if (lstatSync(dir, { throwIfNoEntry: false })) throw new Error(`worktree ${dir} exists`)
  mkdirSync(r, { recursive: true })
  await git(task.repo, 'worktree', 'add', '--detach', dir, commit)
  try {
    return await fn(dir)
  } finally {
    await git(task.repo, 'worktree', 'remove', '--force', dir).catch(() => {})
    rmSync(dir, { recursive: true, force: true })
    await git(task.repo, 'worktree', 'prune').catch(() => {})
  }
}

async function waitReady(task, proc, log, pollMs) {
  let exit = null
  proc.exited.then((c) => { exit = c })
  const deadline = Date.now() + task.timeoutSec * 1000
  for (;;) {
    // bound by the deadline, not the poll interval: a dev server's first request can compile for longer than 2 s
    const signal = AbortSignal.timeout(Math.max(1, deadline - Date.now()))
    const res = await Promise.race([fetch(task.ready, { signal, redirect: 'manual' }).catch(() => null), proc.exited.then(() => null)])
    if (res && res.status >= 200 && res.status < 500) return
    if (exit !== null) throw new Error(`start exited (exit ${exit}) before ready; log: ${log}`)
    if (Date.now() >= deadline) throw new Error(`app not ready at ${task.ready} after ${task.timeoutSec} s; log: ${log}`)
    await Promise.race([Bun.sleep(pollMs), proc.exited])
    if (exit === null) await Bun.sleep(0) // let the exited callback run before the next check
  }
}

const alive = (pid) => { try { process.kill(-pid, 0); return true } catch { return false } }
const signalGroup = (pid, sig) => { try { process.kill(-pid, sig) } catch {} }

async function stop(proc, port) {
  signalGroup(proc.pid, 'SIGTERM')
  for (let i = 0; i < 50 && alive(proc.pid); i++) await Bun.sleep(100)
  signalGroup(proc.pid, 'SIGKILL')
  await proc.exited
  for (let i = 0; i < 100; i++) { if (!(await portBusy(port))) return; await Bun.sleep(100) }
  throw new Error(`port ${port} still busy after stopping the app`)
}

export async function withEnv(task, commit, label, fn, opts = {}) {
  checkRoot(opts.root ?? ROOT)
  if (await portBusy(task.port)) throw new Error(`port ${task.port} busy`)
  return withWorktree(task, commit, label, async (dir) => {
    const url = `http://localhost:${task.port}`
    const junitPath = isAbsolute(task.junit) ? task.junit : join(dir, task.junit)
    const env = { ...process.env, BENCH_DIR: dir, BENCH_DB: task.db ?? '', BENCH_PORT: String(task.port), BENCH_URL: url, BENCH_JUNIT: junitPath }
    let proc, failed = false, later
    try {
      if (opts.before) await opts.before(dir)
      for (const cmd of task.setup) await run(cmd, dir, env)
      const log = `${dir}.log` // next to the worktree, so it survives the worktree's removal
      const fd = openSync(log, 'w')
      try { proc = Bun.spawn(['sh', '-c', task.start], { cwd: dir, env, detached: true, stdin: 'ignore', stdout: fd, stderr: fd }) } finally { closeSync(fd) }
      await waitReady(task, proc, log, opts.pollMs ?? 2000)
      return await fn({ dir, url, db: task.db, junitPath, env })
    } catch (e) {
      failed = true
      throw e
    } finally {
      // fn's error wins; otherwise the first stop or teardown error; every teardown command still runs
      const note = (e) => { if (failed) console.error(e.message); else later ??= e }
      if (proc) await stop(proc, task.port).catch(note)
      for (const cmd of task.teardown) await run(cmd, dir, env).catch(note)
      if (later) throw later
    }
  }, opts.root ?? ROOT)
}

export async function clean(root = ROOT) {
  const r = checkRoot(root)
  if (!existsSync(r)) return
  // kill processes whose cwd is under root; a group leader there is a start we spawned, so kill its group
  const out = await Bun.$`lsof -a -d cwd -Fpn`.nothrow().quiet().text()
  let pid
  for (const line of out.split('\n')) {
    if (line[0] === 'p') pid = Number(line.slice(1))
    else if (line[0] === 'n' && under(line.slice(1), r) && pid !== process.pid) {
      const pgid = Number((await Bun.$`ps -o pgid= -p ${pid}`.nothrow().quiet().text()).trim())
      try { process.kill(pgid === pid ? -pid : pid, 'SIGKILL') } catch {}
    }
  }
  for (const name of readdirSync(r)) {
    const p = join(r, name), dotgit = join(p, '.git')
    // git resolves a symlink and would remove its target; rmSync below unlinks the link itself
    if (!lstatSync(p).isDirectory() || !under(realpathSync(p), r)) continue
    let gitdir
    try { gitdir = readFileSync(dotgit, 'utf8').match(/^gitdir: (.+)$/m)?.[1] } catch {}
    if (gitdir) {
      const common = dirname(dirname(gitdir)) // <repo>/.git/worktrees/<x> -> <repo>/.git
      await git(common, 'worktree', 'remove', '--force', p).catch(() => {})
      await git(common, 'worktree', 'prune').catch(() => {})
    }
  }
  rmSync(r, { recursive: true, force: true })
}

if (import.meta.main) {
  const [cmd, taskPath, commit] = process.argv.slice(2)
  if (cmd === 'clean') await clean()
  else if (cmd === 'up' && taskPath && commit) {
    // handlers before withEnv, so Ctrl-C during setup or the ready wait still lets withEnv's cleanup run
    const stopped = new Promise((res) => { process.once('SIGINT', res); process.once('SIGTERM', res) })
    const task = await loadTask(taskPath)
    await withEnv(task, commit, `up-${commit.slice(0, 12).replace(/[^A-Za-z0-9._-]/g, '_')}`, async ({ url }) => {
      console.log(url)
      await stopped
    })
  } else {
    console.error('usage: bun bench/env.mjs up <task.json> <commit> | bun bench/env.mjs clean')
    process.exit(2)
  }
}
