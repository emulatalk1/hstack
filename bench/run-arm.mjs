#!/usr/bin/env bun
// Run one arm headless on a task. The agent works in a fresh repo built from the task base, never a worktree of the
// copy (that would show the task's future commits). A probe turn checks what loaded; then the input, up to 5 resumes
// until the agent replies DONE, and the product fetched into the task repo as bench/<task>-<arm>-<n>.
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { agentEnv, runClaude } from './agent-replay.mjs'
import { git, gitWith, ROOT, withExport } from './env.mjs'
import { resolveCommit } from './grade.mjs'
import { finalText, usage } from './lib/agent.mjs'
import { armArgs, countInterventions, initInfo, probeOk } from './lib/arm.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/run-arm.mjs <task.json> <B|B-|H|W> <run-no> --input <data>/<task>/input.md --at <base>'
const DONE_LINE = '\n\nWhen the task is done, reply exactly DONE.' // so a main turn that ends without DONE is a stop before the work is done
const CONTINUE = 'No more information; decide from the requirement. Continue until the task is done. When it is done, reply exactly DONE.' // the 9.3 answer
const RESUMES = 5
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
// the product repo is the agent's: none of its hooks or fsmonitor runs, with the agent's env scrub and a time limit
const SAFE = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']
const BENCH = [...SAFE, '-c', 'user.name=bench', '-c', 'user.email=bench@localhost', '-c', 'commit.gpgsign=false']
const agentGit = (dir, ...args) => gitWith({ env: agentEnv(), timeout: 300_000 }, dir, ...args)

async function loadArms(path) {
  const bad = (why) => { throw new Error(`arms ${path}: ${why}`) }
  const c = await Bun.file(path).json().catch(() => null)
  if (!c || typeof c !== 'object' || Array.isArray(c)) bad('must be { model?, smallModel, plugins: { H: [], W: [] }, turnTimeoutSec? }')
  if (c.model !== undefined && (typeof c.model !== 'string' || !c.model)) bad('model must be a non-empty string')
  if (typeof c.smallModel !== 'string' || !c.smallModel) bad('smallModel must be a non-empty string')
  const turnTimeoutSec = c.turnTimeoutSec ?? 14400
  if (!Number.isInteger(turnTimeoutSec) || turnTimeoutSec <= 0) bad('turnTimeoutSec must be a positive integer')
  const plugins = {}
  for (const arm of ['H', 'W']) {
    const l = c.plugins?.[arm]
    if (!Array.isArray(l) || !l.every((d) => typeof d === 'string')) bad(`plugins.${arm} must be an array of plugin dirs`)
    plugins[arm] = l.map((d) => resolve(dirname(path), d))
    for (const d of plugins[arm]) if (!statSync(d, { throwIfNoEntry: false })?.isDirectory()) bad(`plugin dir ${d} does not exist`)
  }
  return { model: c.model, smallModel: c.smallModel, plugins, turnTimeoutSec }
}

// shortcut: the arm agent has full permissions and can read the oracle (data folder) and the copy (task repo) by absolute
// path; this only flags the transcripts that name either, in the written or the resolved form. A sandbox must replace it
// before prereg step 8.
async function leakTurns(runDir, paths) {
  const needles = [...new Set(paths.flatMap((p) => [p, existsSync(p) ? realpathSync(p) : p]))]
  const hits = []
  for (const f of readdirSync(runDir).filter((f) => f.endsWith('.jsonl')).sort()) {
    const text = await Bun.file(join(runDir, f)).text()
    if (needles.some((n) => text.includes(n))) hits.push(f)
  }
  return hits
}

// the name a plugin dir shows at init: its manifest name, else the folder name
const pluginName = async (dir) => (await Bun.file(join(dir, '.claude-plugin/plugin.json')).json().catch(() => null))?.name ?? basename(dir)

// what each plugin dir was at the run: commit null when it is not in a git repo
async function pluginInfo(dir) {
  const head = await Bun.$`git -C ${dir} rev-parse HEAD`.nothrow().quiet()
  const commit = head.exitCode === 0 ? head.stdout.toString().trim() : null
  const dirty = commit !== null && (await Bun.$`git -C ${dir} status --porcelain -- .`.quiet().text()).trim() !== ''
  return { dir, name: await pluginName(dir), commit, dirty }
}

export async function runArm(args, { root = ROOT } = {}) {
  const pos = [], flags = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '--at') flags[args[i].slice(2)] = args[++i]
    else pos.push(args[i])
  }
  if (pos.length !== 3 || !flags.input || !flags.at) throw new Error(USAGE)
  const [taskPath, arm, runNo] = pos
  if (!['B', 'B-', 'H', 'W'].includes(arm)) throw new Error(`arm ${arm} must be B, B-, H or W`)
  if (!/^[1-9]\d*$/.test(runNo)) throw new Error(`run-no ${runNo} must be a positive integer`)
  const n = Number(runNo)
  const task = await loadTask(taskPath)
  // shortcut: an arm agent with full permissions could point the app at a real database; add a guard before prereg step 8
  if (task.db !== null) throw new Error('arm runs have no database guard yet')
  const data = dirname(resolve(process.env.HSTACK_BENCH_MACHINE))
  const cfg = await loadArms(join(data, 'arms.json'))
  const { model, pluginDirs, appendSystemPrompt } = armArgs(arm, cfg)
  const plugins = await Promise.all(pluginDirs.map(pluginInfo)), expected = plugins.map((p) => p.name)
  const inputPath = resolve(flags.input), id = basename(dirname(inputPath))
  if (!ID.test(id)) throw new Error(`task id ${id} (the input's folder) must match ${ID.source}`)
  const input = await Bun.file(inputPath).text().catch(() => null)
  if (input === null) throw new Error(`input ${inputPath} is missing or unreadable`)
  const base = await resolveCommit(task.repo, flags.at)
  const name = `${id}-${arm}-${n}`, branch = `bench/${name}`, results = join(data, 'results'), out = join(results, `${name}.json`)
  if (existsSync(out)) throw new Error(`results ${out} exist`)
  if ((await Bun.$`git check-ref-format refs/heads/${branch}`.nothrow().quiet()).exitCode !== 0) throw new Error(`branch name ${branch} is not a valid git ref`)
  if ((await Bun.$`git -C ${task.repo} rev-parse --verify -q refs/heads/${branch}`.nothrow().quiet()).exitCode === 0) throw new Error(`branch ${branch} exists in ${task.repo}`)
  let userSkills = []
  try { userSkills = readdirSync(join(homedir(), '.claude/skills')) } catch {}

  // AskUserQuestion is not among the tools under -p (init of CLI 2.1.310), so a PreToolUse hook on it never fires: the
  // settings hold no hook, every arm gets the same empty file, and interventions come from the turns answered with a resume (hookLines 0).
  // bench/responder-hook.mjs stays for a mode where the tool does reach the agent.
  // the run folder keeps the settings and every turn's raw stream-json (prereg 7.2 labels a sample; 3 reads model ids)
  const runDir = join(results, name), settings = join(runDir, 'settings.json')
  rmSync(runDir, { recursive: true, force: true }) // no stale turns from a killed earlier attempt
  mkdirSync(runDir, { recursive: true })
  await Bun.write(settings, '{}\n')
  const turns = []
  const turn = async (o, cwd, label) => {
    const r = await runClaude({ model, pluginDirs, appendSystemPrompt, settings, permissionMode: 'bypassPermissions', ...o }, cwd, { timeoutSec: cfg.turnTimeoutSec })
    await Bun.write(join(runDir, `${turns.length}-${label}.jsonl`), r.out)
    turns.push({ turn: label, code: r.code === 'timeout' ? null : r.code, timedOut: r.code === 'timeout' })
    return r
  }

  // dropSettings off: the task repo's own .claude/ reaches every arm alike
  return withExport(task, base, name, async (dir) => {
    await git(dir, 'init', '-q')
    await git(dir, ...SAFE, 'add', '-A', '-f') // every exported file is tracked in the task repo, ignored or not
    await git(dir, ...BENCH, 'commit', '-q', '--no-verify', '--allow-empty', '-m', `base ${base.slice(0, 7)}`)

    const probe = await turn({ prompt: 'Reply OK.' }, dir, 'probe') // its own session, the main run's model, plugins and settings
    let info, why
    try { info = initInfo(probe.out); why = probe.code !== 0 ? `probe exited ${probe.code}` : probeOk(arm, info, expected, userSkills) } catch (e) { why = e.message }
    if (why) { console.error(`probe refused: ${why}`); return 2 }
    const start = new Date().toISOString()

    const sessionId = randomUUID(), outs = [], resumes = []
    let reason = null
    for (let i = 0; ; i++) {
      const r = await turn(i === 0 ? { prompt: input + DONE_LINE, sessionId } : { prompt: CONTINUE, resume: sessionId }, dir, i === 0 ? 'main' : `resume-${i}`)
      outs.push(r.out)
      let text = null
      try { text = finalText(r.out) } catch {}
      const done = r.code === 0 && text?.trim() === 'DONE'
      if (done) break
      if (r.code === 'timeout') { reason = 'timeout'; break } // a failed turn is just not DONE; a killed one ends the run
      if (i === RESUMES) { reason = 'no DONE'; break }
      resumes.push('other') // a turn the runner answers with a resume (9.3): the main turn included, the last turn never
    }
    const abandoned = reason !== null
    const us = outs.map(usage), sum = (k) => us.reduce((s, u) => s + u[k], 0)
    const { models: probeModels, ...probeUsage } = usage(probe.out)
    const leaks = await leakTurns(runDir, [data, task.repo])
    const rec = {
      task: id, arm, run: n, base, model: model ?? null, version: info.version, plugins, sessionId, start, end: new Date().toISOString(),
      status: abandoned ? 'abandoned' : 'done', reason, resumes,
      interventions: countInterventions({ hookLines: 0, resumes, abandoned }), // hookLines 0: no hook under -p, see the settings above
      turns,
      usage: { input: sum('input'), output: sum('output'), cacheRead: sum('cacheRead'), cacheWrite: sum('cacheWrite') },
      models: [...new Set(us.flatMap((u) => u.models))], probeUsage, probeModels, probe: info, transcripts: runDir, leak: leaks.length > 0, leakTurns: leaks, branch: null,
    }
    let err
    try {
      await agentGit(dir, ...SAFE, 'add', '-A')
      await agentGit(dir, ...BENCH, 'commit', '-q', '--no-verify', '--allow-empty', '-m', `${id} ${arm} ${n}`)
      await agentGit(task.repo, 'fetch', '-q', '--no-tags', dir, `HEAD:refs/heads/${branch}`)
      rec.branch = branch
    } catch (e) { err = e } // the record of a long run is written even when its product cannot be saved
    await Bun.write(out, JSON.stringify(rec, null, 2) + '\n')
    if (err) throw err
    console.log(`${name} ${rec.status}`)
    return 0
  }, root)
}

if (import.meta.main) {
  try { process.exit(await runArm(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
