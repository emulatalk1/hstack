#!/usr/bin/env bun
// Grade the oracle at a commit (or validate checks on ref/bad/base). Logic lives in lib/score.mjs.
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { ROOT, withEnv } from './env.mjs'
import { readJunit } from './lib/junit.mjs'
import { runGroup } from './lib/proc.mjs'
import { checksFrom, fixMatches, results, score, unscored, verdict } from './lib/score.mjs'
import { oracleSha } from './lib/oracle.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/grade.mjs <task.json> <oracle dir> (--at <commit> | --validate <ref> --bad <commit> [--bad <commit> ...] [--base <commit>]) [--sealed] [--reuse]'

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
  try { const xml = await Bun.file(junitPath).text(); return { cases: readJunit(xml), junit: 'ok', xml } } catch { return { cases: null, junit: 'missing' } }
}

// the JUnit file must live inside the worktree: it is deleted before the run and the worktree is removed after
export function checkJunitPath(task) {
  if (isAbsolute(task.junit) || relative('/w', resolve('/w', task.junit)).startsWith('..')) throw new Error(`task junit ${task.junit} must be a relative path inside the worktree`)
}

const runOracle = (task, oracleDir, commit, root, stdio) =>
  withEnv(task, commit, `grade-${commit.slice(0, 7)}`, (e) => runForJunit(task, e, task.oracle, { BENCH_ORACLE: oracleDir }, stdio), { root, start: task.start !== null })

// every file of the oracle folder but node_modules (a symlink by that name too), paths relative to it; latin1 keeps every byte.
// Any other symlink counts by its target, never followed: it may point at a folder or nowhere.
const oracleFiles = (dir, rel = '') => readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((d) => {
  const p = rel ? `${rel}/${d.name}` : d.name
  if (d.name === 'node_modules') return []
  if (d.isSymbolicLink()) return [{ path: p, text: 'link:' + readlinkSync(join(dir, p)) }]
  return d.isDirectory() ? oracleFiles(dir, p) : [{ path: p, text: readFileSync(join(dir, p), 'latin1') }]
})

export async function grade(args, { root = ROOT } = {}) {
  const pos = [], flags = { bad: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--sealed' || a === '--reuse') flags[a.slice(2)] = true
    else if (a === '--at' || a === '--base' || a === '--validate') flags[a.slice(2)] = args[++i] ?? ''
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
  const sha = oracleSha(oracleFiles(oracleDir))

  const run = async (full) => {
    const sha7 = full.slice(0, 7), file = join(evDir, 'grades', `${sha7}.json`)
    // ruling 10: a run is reused when its commit and oracle are the same and it gave results
    const old = flags.reuse && existsSync(file) ? await Bun.file(file).json().catch(() => null) : null // unreadable: run again
    const reused = old?.commit === full && old.oracleSha === sha && old.junit === 'ok'
    let res, junit = 'ok'
    if (reused) res = new Map(ids.map((id) => [id, old.checks.find((c) => c.id === id)?.result ?? 'error']))
    else {
      let stdio = 2
      if (flags.sealed) { // the oracle's output is sealed: <task dir>/logs/<sha7>-<n>.log, the next free n
        mkdirSync(join(evDir, 'logs'), { recursive: true })
        let n = 1
        while (existsSync(join(evDir, 'logs', `${sha7}-${n}.log`))) n++
        stdio = openSync(join(evDir, 'logs', `${sha7}-${n}.log`), 'wx')
      }
      let cases
      try { ({ cases, junit } = await runOracle(task, oracleDir, full, root, stdio)) } finally { if (flags.sealed) closeSync(stdio) }
      res = results(cases, ids)
    }
    const g = { commit: full, task: task.name, at: reused ? old.at : new Date().toISOString(), oracleSha: sha, junit,
      checks: checks.map((c) => ({ ...c, result: res.get(c.id) })), excluded, unlabelled, score: score(scoredChecks, res) }
    mkdirSync(join(evDir, 'grades'), { recursive: true })
    await Bun.write(file, JSON.stringify(g, null, 2) + '\n')
    const n = (r) => g.checks.filter((c) => c.result === r).length
    console.log(`${sha7} junit=${junit} pass=${n('pass')} fail=${n('fail')} precondition=${n('precondition')} error=${n('error')} excluded=${excluded.length} build=${g.score.build} requirement=${g.score.requirement} featureMissing=${g.score.featureMissing}${reused ? ' reused' : ''}`)
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
