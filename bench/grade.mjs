#!/usr/bin/env bun
// Grade the oracle at a commit (or validate checks on ref/bad/base). Logic lives in lib/score.mjs.
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { ROOT, withEnv } from './env.mjs'
import { readJunit } from './lib/junit.mjs'
import { runGroup } from './lib/proc.mjs'
import { checksFrom, fixMatches, results, score, unscored, verdict } from './lib/score.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/grade.mjs <task.json> <oracle dir> --at <commit> | --validate <ref> --bad <commit> [--bad <commit> ...] [--base <commit>]'

export async function resolveCommit(repo, commit) {
  const p = Bun.spawn(['git', '-C', repo, 'rev-parse', '--verify', `${commit}^{commit}`], { stdout: 'pipe', stderr: 'pipe' })
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]
  if (code !== 0) throw new Error(`unknown commit ${commit} in ${repo}`)
  return out.trim()
}

// Run cmd in the env fn received; stale JUnit deleted first, its group killed after task.timeoutSec and after it exits. stdio: 2 (stderr) or 'ignore'.
export async function runForJunit(task, { dir, junitPath, env }, cmd, extraEnv = {}, stdio = 2) {
  rmSync(junitPath, { force: true }) // a stale file must not be graded
  // the exit code does not matter: failing tests exit non-zero
  const { code } = await runGroup(['sh', '-c', cmd], { cwd: dir, env: { ...env, ...extraEnv }, stdout: stdio, stderr: stdio, timeoutSec: task.timeoutSec })
  if (code === 'timeout') return { cases: null, junit: 'timeout' } // whatever file it left is partial
  try { return { cases: readJunit(await Bun.file(junitPath).text()), junit: 'ok' } } catch { return { cases: null, junit: 'missing' } }
}

// the JUnit file must live inside the worktree: it is deleted before the run and the worktree is removed after
export function checkJunitPath(task) {
  if (isAbsolute(task.junit) || relative('/w', resolve('/w', task.junit)).startsWith('..')) throw new Error(`task junit ${task.junit} must be a relative path inside the worktree`)
}

const runOracle = (task, oracleDir, commit, root) =>
  withEnv(task, commit, `grade-${commit.slice(0, 7)}`, (e) => runForJunit(task, e, task.oracle, { BENCH_ORACLE: oracleDir }), { root })

export async function grade(args, { root = ROOT } = {}) {
  const pos = [], flags = { bad: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--at' || a === '--base' || a === '--validate') flags[a.slice(2)] = args[++i] ?? ''
    else if (a === '--bad') flags.bad.push(args[++i] ?? '')
    else pos.push(a)
  }
  if (flags.validate !== undefined && !flags.bad.length && pos.length === 3) flags.bad.push(pos.pop()) // the old form --validate <ref> <bad>
  const [taskPath, oracleArg] = pos
  const v = flags.validate !== undefined
  if (!taskPath || !oracleArg || pos.length !== 2 || (flags.at === undefined) === !v || [flags.at, flags.validate, flags.base, ...flags.bad].includes('')
    || (v && !flags.bad.length) || (!v && (flags.base !== undefined || flags.bad.length))) throw new Error(USAGE)
  const task = await loadTask(taskPath)
  checkJunitPath(task)
  const oracleDir = resolve(oracleArg), evDir = dirname(oracleDir)
  const labelsFile = Bun.file(join(evDir, 'labels.json'))
  const manifest = await Bun.file(join(oracleDir, 'manifest.json')).json()
  const manifestFix = new Map(manifest.map((m) => [m.id, String(m.fix_commit ?? '')]))
  const { checks, unlabelled } = checksFrom(manifest, (await labelsFile.exists()) ? await labelsFile.json() : {})
  const ids = checks.map((c) => c.id)
  const validations = []
  for (const f of readdirSync(evDir).filter((f) => /^validation-.+\.json$/.test(f)).sort())
    validations.push(await Bun.file(join(evDir, f)).json().catch(() => { throw new Error(`${join(evDir, f)} is not valid JSON`) }))
  const excluded = unscored(validations, ids), scoredChecks = checks.filter((c) => !excluded.some((e) => e.id === c.id))

  const run = async (full) => {
    const { cases, junit } = await runOracle(task, oracleDir, full, root)
    const res = results(cases, ids)
    const g = { commit: full, task: task.name, at: new Date().toISOString(), junit,
      checks: checks.map((c) => ({ ...c, result: res.get(c.id) })), excluded, unlabelled, score: score(scoredChecks, res) }
    const file = join(evDir, 'grades', `${full.slice(0, 7)}.json`)
    mkdirSync(join(evDir, 'grades'), { recursive: true })
    await Bun.write(file, JSON.stringify(g, null, 2) + '\n')
    const n = (r) => g.checks.filter((c) => c.result === r).length
    console.log(`${full.slice(0, 7)} junit=${junit} pass=${n('pass')} fail=${n('fail')} precondition=${n('precondition')} error=${n('error')} excluded=${excluded.length} build=${g.score.build} requirement=${g.score.requirement} featureMissing=${g.score.featureMissing}`)
    return { full, res, junit, file }
  }

  // resolve every commit before the first env run, so a typo costs nothing
  const resolveAll = (list) => Promise.all(list.map((c) => resolveCommit(task.repo, c)))
  // the grade file is written either way; a run with no readable JUnit is not a grade
  if (flags.at !== undefined) return (await run((await resolveAll([flags.at]))[0])).junit === 'ok' ? 0 : 1
  const [refFull, ...rest] = await resolveAll([flags.validate, ...flags.bad, ...(flags.base ? [flags.base] : [])])
  const badFull = rest.slice(0, flags.bad.length), baseFull = rest[flags.bad.length]
  const ref = await run(refFull), bads = []
  for (const b of badFull) bads.push(await run(b))
  const base = baseFull ? await run(baseFull) : null
  // a run without results would turn every check into `broken` and silently disqualify them
  for (const r of [ref, ...bads, base]) if (r && r.junit !== 'ok') throw new Error(`no results for ${r.full} (junit ${r.junit}); validation not written; see ${r.file}`)
  const mine = checks.filter((c) => fixMatches(manifestFix.get(c.id) ?? '', ref.full))
  const out = { ref: ref.full, bad: bads.map((b) => b.full), base: base?.full ?? null, at: new Date().toISOString(),
    checks: mine.map((c) => {
      const r = { ref: ref.res.get(c.id), bad: bads.map((b) => b.res.get(c.id)), base: base ? base.res.get(c.id) : null }
      return { id: c.id, ...r, verdict: verdict({ ref: r.ref, bad: r.bad, base: r.base ?? undefined }) }
    }) }
  await Bun.write(join(evDir, `validation-${ref.full.slice(0, 7)}.json`), JSON.stringify(out, null, 2) + '\n')
  console.log(`validation-${ref.full.slice(0, 7)}: ${out.checks.map((c) => `${c.id}=${c.verdict}`).join(' ') || 'no checks for this ref'}`)
  return 0
}

if (import.meta.main) {
  try { process.exit(await grade(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
