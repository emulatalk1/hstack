#!/usr/bin/env bun
// Replay a bug against a test layer: run the layer at `at` once without the bug (the baseline, kept and reused), then
// with the bug reintroduced, and count only failures that neither a test added or changed from the fix on nor the baseline explains.
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ROOT, withEnv, withWorktree } from './env.mjs'
import { checkJunitPath, resolveCommit, runForJunit } from './grade.mjs'
import { readJunit } from './lib/junit.mjs'
import { caught, excludedTitles, failingNames, holeOnly, isTestPath, notCounted } from './lib/replay.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/replay.mjs <task.json> <bug.json> <layer> [--sealed]'

async function git(cwd, ...args) {
  const p = Bun.spawn(['git', '-C', cwd, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  if (code !== 0) throw new Error(`git ${args.join(' ')} failed (exit ${code}): ${err.trim()}`)
  return out
}

// bug.json with a safe id and the given fields as non-empty strings; patch resolved relative to bug.json
export async function readBug(bugPath, fields) {
  const bug = await Bun.file(bugPath).json()
  if (typeof bug?.id !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(bug.id)) throw new Error('bug id must match ^[A-Za-z0-9_.-]+$')
  for (const f of fields) if (typeof bug[f] !== 'string' || bug[f] === '') throw new Error(`bug ${f} must be a non-empty string`)
  if (typeof bug.patch === 'string') bug.patch = resolve(dirname(resolve(bugPath)), bug.patch)
  return bug
}

// withEnv's `before`: reverse-apply the bug's fix patch, checked first (checkOnly: only the check).
// sealed: git's own messages quote the bug's lines (trailing whitespace warnings, failed hunks)
export const reverseApply = (bug, sealed, { checkOnly = false } = {}) => async (dir) => {
  const apply = async (...a) => {
    const q = sealed ? 'ignore' : 2
    const code = await Bun.spawn(['git', 'apply', '--whitespace=nowarn', ...a, bug.patch], { cwd: dir, stdout: q, stderr: q }).exited
    if (code !== 0) throw new Error(sealed ? `${bug.id} patch does not apply` : `git apply ${a.join(' ')} ${bug.patch} failed (exit ${code})`)
  }
  await apply('-R', '--check')
  if (!checkOnly) await apply('-R')
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
  const bug = await readBug(bugPath, ['at', 'patch', 'fix'])
  const [at, fix] = await Promise.all([resolveCommit(task.repo, bug.at), resolveCommit(task.repo, bug.fix)])

  const merge = await git(task.repo, 'rev-parse', '-q', '--verify', `${fix}^2`).then(() => true, () => false)
  if (merge) throw new Error(`fix ${fix} is a merge commit; give the commit that made the change`)

  // spec 8.1: a catch counts only if its assertion existed before the fix, so the tests added or changed anywhere from the
  // fix's parent to `at` are out (read at `at`, before any env starts)
  const diff = await git(task.repo, 'diff', '--no-ext-diff', '--no-color', `${fix}^`, at)
  const post = new Map()
  for (const path of (await git(task.repo, 'diff', '--name-only', '-z', `${fix}^`, at)).split('\0').filter(isTestPath))
    try { post.set(path, await git(task.repo, 'show', `${at}:${path}`)) } catch {} // deleted by at
  const titles = excludedTitles(diff, post, task.testTitle), excluded = titles.filter((t) => !holeOnly(t))
  if (!sealed) for (const t of titles.filter(holeOnly)) console.error(`excluded title dropped (no literal text, it would match every case): ${t}`)

  // sealed: the layer's own output would show the bug; a layer starts the app itself if it needs one
  const runLayer = (label, titleList, before) => withEnv(task, at, label, async (e) => {
    const file = `${e.dir}/.bench-exclude`
    await Bun.write(file, titleList.map((t) => t + '\n').join(''))
    return runForJunit(task, e, cmd, { BENCH_EXCLUDE: file }, sealed ? 'ignore' : 2)
  }, { root, quiet: sealed, before, start: false })
  // zero non-skip cases means the layer ran nothing (a wrong project filter), which must not read as a miss
  const ran = (cases) => cases?.some((c) => c.status !== 'skip')

  // a patch that does not apply costs one checkout here, not a full baseline
  await withWorktree(task, at, `check-${bug.id}`, reverseApply(bug, sealed, { checkOnly: true }), root)

  // the baseline serves every bug at this (task, at, layer), so it runs with an empty exclude list; only a good one is kept
  const results = join(dirname(resolve(process.env.HSTACK_BENCH_MACHINE)), 'results')
  const baseFile = join(results, `baseline-${task.name}-${at.slice(0, 7)}-${layer}.xml`)
  let baseline
  if (existsSync(baseFile)) baseline = readJunit(await Bun.file(baseFile).text())
  else {
    const r = await runLayer(`baseline-${at.slice(0, 7)}-${layer}`, [])
    baseline = r.cases
    if (ran(baseline)) { mkdirSync(results, { recursive: true }); await Bun.write(baseFile, r.xml) }
  }
  if (!ran(baseline)) { console.log(`${bug.id} error`); return 1 }
  const baseFails = failingNames(baseline)
  if (!sealed) console.error(`baseline ${baseFile}: ${baseFails.size} failing`)

  const { cases } = await runLayer(`replay-${bug.id}`, excluded, reverseApply(bug, sealed))
  if (!ran(cases)) { console.log(`${bug.id} error`); return 1 }
  if (!sealed) for (const c of cases) if (c.status === 'fail') {
    const why = notCounted(c.name, excluded, baseFails)
    console.log(`FAIL ${c.name}${why === 'excluded' ? ' (excluded)' : why ? ' (fails at baseline)' : ''}`)
  }
  console.log(`${bug.id} ${caught(cases, excluded, baseline) ? 'caught' : 'missed'}`)
  return 0
}

if (import.meta.main) {
  try { process.exit(await replay(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
