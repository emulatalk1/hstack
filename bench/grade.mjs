#!/usr/bin/env bun
// Grade the oracle at a commit (or validate checks on ref/bad/base). Logic lives in lib/score.mjs.
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { ROOT, withEnv } from './env.mjs'
import { readJunit } from './lib/junit.mjs'
import { checksFrom, fixMatches, results, score, verdict } from './lib/score.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/grade.mjs <task.json> <oracle dir> --at <commit> | --validate <ref> <bad> [--base <commit>]'

export async function resolveCommit(repo, commit) {
  const p = Bun.spawn(['git', '-C', repo, 'rev-parse', '--verify', `${commit}^{commit}`], { stdout: 'pipe', stderr: 'pipe' })
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]
  if (code !== 0) throw new Error(`unknown commit ${commit} in ${repo}`)
  return out.trim()
}

// Run cmd in the env fn received; stale JUnit deleted first, killed after task.timeoutSec. stdio: 2 (stderr) or 'ignore'.
export async function runForJunit(task, { dir, junitPath, env }, cmd, extraEnv = {}, stdio = 2) {
  rmSync(junitPath, { force: true }) // a stale file must not be graded
  const proc = Bun.spawn(['sh', '-c', cmd], { cwd: dir, env: { ...env, ...extraEnv }, detached: true, stdin: 'ignore', stdout: stdio, stderr: stdio })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-proc.pid, 'SIGKILL') } catch {} }, task.timeoutSec * 1000)
  await proc.exited // the exit code does not matter: failing tests exit non-zero
  clearTimeout(timer)
  if (timedOut) return { cases: null, junit: 'timeout' } // whatever file it left is partial
  try { return { cases: readJunit(await Bun.file(junitPath).text()), junit: 'ok' } } catch { return { cases: null, junit: 'missing' } }
}

// the JUnit file must live inside the worktree: it is deleted before the run and the worktree is removed after
export function checkJunitPath(task) {
  if (isAbsolute(task.junit) || relative('/w', resolve('/w', task.junit)).startsWith('..')) throw new Error(`task junit ${task.junit} must be a relative path inside the worktree`)
}

const runOracle = (task, oracleDir, commit, root) =>
  withEnv(task, commit, `grade-${commit.slice(0, 7)}`, (e) => runForJunit(task, e, task.oracle, { BENCH_ORACLE: oracleDir }), { root })

export async function grade(args, { root = ROOT } = {}) {
  const pos = [], flags = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--at' || a === '--base') flags[a.slice(2)] = args[++i]
    else if (a === '--validate') flags.validate = [args[++i], args[++i]]
    else pos.push(a)
  }
  const [taskPath, oracleArg] = pos
  if (!taskPath || !oracleArg || pos.length !== 2 || (!flags.at && !flags.validate) || (flags.at && flags.validate) || (flags.validate && flags.validate.some((x) => !x)) || (flags.base && !flags.validate)) throw new Error(USAGE)
  const task = await loadTask(taskPath)
  checkJunitPath(task)
  const oracleDir = resolve(oracleArg), evDir = dirname(oracleDir)
  const labelsFile = Bun.file(join(evDir, 'labels.json'))
  const manifest = await Bun.file(join(oracleDir, 'manifest.json')).json()
  const manifestFix = new Map(manifest.map((m) => [m.id, String(m.fix_commit ?? '')]))
  const { checks, unlabelled } = checksFrom(manifest, (await labelsFile.exists()) ? await labelsFile.json() : {})
  const ids = checks.map((c) => c.id)

  const run = async (full) => {
    const { cases, junit } = await runOracle(task, oracleDir, full, root)
    const res = results(cases, ids)
    const g = { commit: full, task: task.name, at: new Date().toISOString(), junit,
      checks: checks.map((c) => ({ ...c, result: res.get(c.id) })), unlabelled, score: score(checks, res) }
    const file = join(evDir, 'grades', `${full.slice(0, 7)}.json`)
    mkdirSync(join(evDir, 'grades'), { recursive: true })
    await Bun.write(file, JSON.stringify(g, null, 2) + '\n')
    const n = (r) => g.checks.filter((c) => c.result === r).length
    console.log(`${full.slice(0, 7)} pass=${n('pass')} fail=${n('fail')} precondition=${n('precondition')} error=${n('error')} build=${g.score.build} requirement=${g.score.requirement} featureMissing=${g.score.featureMissing}`)
    return { full, res, junit, file }
  }

  // resolve every commit before the first env run, so a typo costs nothing
  const resolveAll = (list) => Promise.all(list.map((c) => resolveCommit(task.repo, c)))
  if (flags.at) return void (await run((await resolveAll([flags.at]))[0]))
  const [refFull, badFull, baseFull] = await resolveAll([...flags.validate, ...(flags.base ? [flags.base] : [])])
  const ref = await run(refFull), bad = await run(badFull), base = baseFull ? await run(baseFull) : null
  // a run without results would turn every check into `broken` and silently disqualify them
  for (const r of [ref, bad, base]) if (r && r.junit !== 'ok') throw new Error(`no results for ${r.full} (junit ${r.junit}); validation not written; see ${r.file}`)
  const mine = checks.filter((c) => fixMatches(manifestFix.get(c.id) ?? '', ref.full))
  const v = { ref: ref.full, bad: bad.full, base: base?.full ?? null, at: new Date().toISOString(),
    checks: mine.map((c) => {
      const r = { ref: ref.res.get(c.id), bad: bad.res.get(c.id), base: base ? base.res.get(c.id) : null }
      return { id: c.id, ...r, verdict: verdict({ ref: r.ref, bad: r.bad, base: r.base ?? undefined }) }
    }) }
  await Bun.write(join(evDir, `validation-${ref.full.slice(0, 7)}.json`), JSON.stringify(v, null, 2) + '\n')
  console.log(`validation-${ref.full.slice(0, 7)}: ${v.checks.map((c) => `${c.id}=${c.verdict}`).join(' ') || 'no checks for this ref'}`)
}

if (import.meta.main) {
  try { await grade(process.argv.slice(2)) } catch (e) { console.error(e.message); process.exit(2) }
}
