#!/usr/bin/env bun
// Grade the oracle at a commit (or validate checks on ref/bad/base). Logic lives in lib/score.mjs.
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ROOT, withEnv } from './env.mjs'
import { readJunit } from './lib/junit.mjs'
import { checksFrom, fixMatches, results, score, verdict } from './lib/score.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/grade.mjs <task.json> <oracle dir> --at <commit> | --validate <ref> <bad> [--base <commit>]'

async function resolveCommit(repo, commit) {
  const p = Bun.spawn(['git', '-C', repo, 'rev-parse', '--verify', `${commit}^{commit}`], { stdout: 'pipe', stderr: 'pipe' })
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]
  if (code !== 0) throw new Error(`unknown commit ${commit} in ${repo}`)
  return out.trim()
}

async function runOracle(task, oracleDir, commit, root) {
  return withEnv(task, commit, `grade-${commit.slice(0, 7)}`, async ({ dir, junitPath, env }) => {
    rmSync(junitPath, { force: true }) // a stale file must not be graded
    const proc = Bun.spawn(['sh', '-c', task.oracle], { cwd: dir, env: { ...env, BENCH_ORACLE: oracleDir }, detached: true, stdin: 'ignore', stdout: 2, stderr: 2 })
    const timer = setTimeout(() => { try { process.kill(-proc.pid, 'SIGKILL') } catch {} }, task.timeoutSec * 1000)
    await proc.exited // the exit code does not matter: failing tests exit non-zero
    clearTimeout(timer)
    try { return readJunit(await Bun.file(junitPath).text()) } catch { return null }
  }, { root })
}

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
  const oracleDir = resolve(oracleArg), evDir = dirname(oracleDir)
  const labelsFile = Bun.file(join(evDir, 'labels.json'))
  const manifest = await Bun.file(join(oracleDir, 'manifest.json')).json()
  const manifestFix = new Map(manifest.map((m) => [m.id, String(m.fix_commit ?? '')]))
  const { checks, unlabelled } = checksFrom(manifest, (await labelsFile.exists()) ? await labelsFile.json() : {})
  const ids = checks.map((c) => c.id)

  const run = async (commit) => {
    const full = await resolveCommit(task.repo, commit)
    const cases = await runOracle(task, oracleDir, full, root)
    const res = results(cases, ids)
    const g = { commit: full, task: task.name, at: new Date().toISOString(), junit: cases ? 'ok' : 'missing',
      checks: checks.map((c) => ({ ...c, result: res.get(c.id) })), unlabelled, score: score(checks, res) }
    // a ref spelled safely names its file as written; anything else falls back to the full hash
    const file = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(commit) ? commit : full
    mkdirSync(join(evDir, 'grades'), { recursive: true })
    await Bun.write(join(evDir, 'grades', `${file}.json`), JSON.stringify(g, null, 2) + '\n')
    const n = (r) => g.checks.filter((c) => c.result === r).length
    console.log(`${full.slice(0, 7)} pass=${n('pass')} fail=${n('fail')} precondition=${n('precondition')} error=${n('error')} build=${g.score.build} requirement=${g.score.requirement} featureMissing=${g.score.featureMissing}`)
    return { full, res }
  }

  if (flags.at) return void (await run(flags.at))
  const [refArg, badArg] = flags.validate
  const ref = await run(refArg), bad = await run(badArg), base = flags.base ? await run(flags.base) : null
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
