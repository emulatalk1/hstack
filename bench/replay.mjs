#!/usr/bin/env bun
// Replay a bug against a test layer: reintroduce it in a worktree, run the layer, and count only failures the fix's own tests did not cause.
import { dirname, resolve } from 'node:path'
import { ROOT, withEnv } from './env.mjs'
import { checkJunitPath, resolveCommit, runForJunit } from './grade.mjs'
import { caught, excludedTitles, isTestPath } from './lib/replay.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/replay.mjs <task.json> <bug.json> <layer> [--sealed]'

async function git(cwd, ...args) {
  const p = Bun.spawn(['git', '-C', cwd, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  if (code !== 0) throw new Error(`git ${args.join(' ')} failed (exit ${code}): ${err.trim()}`)
  return out
}

export async function replay(args, { root = ROOT } = {}) {
  const sealed = args.includes('--sealed')
  const pos = args.filter((a) => a !== '--sealed')
  if (pos.length !== 3) throw new Error(USAGE)
  const [taskPath, bugPath, layer] = pos
  const task = await loadTask(taskPath)
  checkJunitPath(task)
  const cmd = Object.hasOwn(task.layers, layer) ? task.layers[layer] : undefined
  if (typeof cmd !== 'string' || cmd === '') throw new Error(`layer ${layer} must be a command string in the task's layers`)
  if (!task.testTitle) throw new Error('task testTitle is required for replay')
  const bug = await Bun.file(bugPath).json()
  if (typeof bug?.id !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(bug.id)) throw new Error('bug id must match ^[A-Za-z0-9_.-]+$')
  for (const f of ['at', 'patch', 'fix']) if (typeof bug[f] !== 'string' || bug[f] === '') throw new Error(`bug ${f} must be a non-empty string`)
  const patch = resolve(dirname(resolve(bugPath)), bug.patch) // relative to bug.json
  const [at, fix] = await Promise.all([resolveCommit(task.repo, bug.at), resolveCommit(task.repo, bug.fix)])

  const merge = await git(task.repo, 'rev-parse', '-q', '--verify', `${fix}^2`).then(() => true, () => false)
  if (merge) throw new Error(`fix ${fix} is a merge commit; give the commit that made the change`)

  // the fix's diff and the post-fix test files, read before any env starts
  const diff = await git(task.repo, 'show', '--format=', fix)
  const postFix = new Map()
  for (const path of (await git(task.repo, 'show', '--format=', '--name-only', '-z', fix)).split('\0').filter(isTestPath))
    try { postFix.set(path, await git(task.repo, 'show', `${fix}:${path}`)) } catch {} // deleted by the fix
  const excluded = excludedTitles(diff, postFix, task.testTitle)

  // sealed: git's own messages quote the bug's lines (trailing whitespace warnings, failed hunks)
  const apply = async (dir, ...a) => {
    const q = sealed ? 'ignore' : 2
    const code = await Bun.spawn(['git', 'apply', '--whitespace=nowarn', ...a, patch], { cwd: dir, stdout: q, stderr: q }).exited
    if (code !== 0) throw new Error(sealed ? `${bug.id} patch does not apply` : `git apply ${a.join(' ')} ${patch} failed (exit ${code})`)
  }
  const { cases } = await withEnv(task, at, `replay-${bug.id}`, async (e) => {
    const file = `${e.dir}/.bench-exclude`
    await Bun.write(file, excluded.map((t) => t + '\n').join(''))
    // sealed: the layer's own output would show the bug
    return runForJunit(task, e, cmd, { BENCH_EXCLUDE: file }, sealed ? 'ignore' : 2)
  }, { root, quiet: sealed, before: async (dir) => { await apply(dir, '-R', '--check'); await apply(dir, '-R') } })

  // zero non-skip cases means the layer ran nothing (a wrong project filter), which must not read as a miss
  if (!cases || !cases.some((c) => c.status !== 'skip')) { console.log(`${bug.id} error`); return 1 }
  if (!sealed) for (const c of cases) if (c.status === 'fail') console.log(`FAIL ${c.name}${excluded.some((t) => c.name.includes(t)) ? ' (excluded)' : ''}`)
  console.log(`${bug.id} ${caught(cases, excluded) ? 'caught' : 'missed'}`)
  return 0
}

if (import.meta.main) {
  try { process.exit(await replay(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
