#!/usr/bin/env bun
// Run one arm headless on a task, only in its box (bench/box.mjs). The box starts from a fresh repo built from the task base,
// never a worktree of the copy (that would show the task's future commits). A probe turn checks what loaded; then the input and
// the interface sheet, up to 5 resumes until the agent replies DONE, and the product comes back as a git bundle, fetched into the
// task repo as bench/<task>-<arm>-<n>. A run the machine failed (machine in the record) stops at once, has no branch and exits 3.
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { agentEnv } from './agent-replay.mjs'
import { enterBox, freshRepo } from './box.mjs'
import { gitWith, ROOT, withExport } from './env.mjs'
import { resolveCommit } from './grade.mjs'
import { apiError, fallbackOf, fellBack, finalText, toolUses, usage } from './lib/agent.mjs'
import { armArgs, countInterventions, initInfo, probeOk, RESUMES } from './lib/arm.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/run-arm.mjs <task.json> <B|B-|H|W> <run-no> --input <data>/<task>/input.md --at <base>'
const DONE_LINE = '\n\nWhen the task is done, reply exactly DONE.' // so a main turn that ends without DONE is a stop before the work is done
const CONTINUE = 'No more information; decide from the requirement. Continue until the task is done. When it is done, reply exactly DONE.' // the 9.3 answer
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
// git on the task repo with the agent's env scrub and a time limit; no hook or fsmonitor of the task repo runs
const SAFE = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']
const agentGit = (dir, ...args) => gitWith({ env: agentEnv(), timeout: 300_000 }, dir, ...args)

async function loadArms(path) {
  const bad = (why) => { throw new Error(`arms ${path}: ${why}`) }
  const c = await Bun.file(path).json().catch(() => null)
  if (!c || typeof c !== 'object' || Array.isArray(c)) bad('must be { model?, smallModel, cli, plugins: { H: [], W: [] }, turnTimeoutSec? }')
  if (c.model !== undefined && (typeof c.model !== 'string' || !c.model)) bad('model must be a non-empty string')
  if (typeof c.smallModel !== 'string' || !c.smallModel) bad('smallModel must be a non-empty string')
  if (typeof c.cli !== 'string' || !c.cli) bad('cli must be the path of the CLI binary, relative to this file')
  const cli = resolve(dirname(path), c.cli)
  if (!statSync(cli, { throwIfNoEntry: false })?.isFile()) bad(`cli ${cli} is not a file`)
  const turnTimeoutSec = c.turnTimeoutSec ?? 14400
  if (!Number.isInteger(turnTimeoutSec) || turnTimeoutSec <= 0) bad('turnTimeoutSec must be a positive integer')
  const plugins = {}
  for (const arm of ['H', 'W']) {
    const l = c.plugins?.[arm]
    if (!Array.isArray(l) || !l.every((d) => typeof d === 'string')) bad(`plugins.${arm} must be an array of plugin dirs`)
    plugins[arm] = l.map((d) => resolve(dirname(path), d))
    for (const d of plugins[arm]) if (!statSync(d, { throwIfNoEntry: false })?.isDirectory()) bad(`plugin dir ${d} does not exist`)
  }
  return { model: c.model, smallModel: c.smallModel, cli, plugins, turnTimeoutSec }
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

export async function runArm(args, { root = ROOT, box = enterBox } = {}) {
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
  // shortcut: a real-estate arm needs Postgres inside its box, plan of step 11
  if (task.db !== null) throw new Error('arm runs have no database guard yet')
  const data = dirname(resolve(process.env.HSTACK_BENCH_MACHINE))
  const cfg = await loadArms(join(data, 'arms.json'))
  const { model, pluginDirs, appendSystemPrompt, disallow } = armArgs(arm, cfg)
  const plugins = await Promise.all(pluginDirs.map(pluginInfo)), expected = plugins.map((p) => p.name)
  const inputPath = resolve(flags.input), id = basename(dirname(inputPath))
  if (!ID.test(id)) throw new Error(`task id ${id} (the input's folder) must match ${ID.source}`)
  const input = await Bun.file(inputPath).text().catch(() => null)
  if (input === null) throw new Error(`input ${inputPath} is missing or unreadable`)
  const sheetPath = join(dirname(inputPath), 'interface.md'), sheet = await Bun.file(sheetPath).text().catch(() => null)
  if (sheet === null) throw new Error(`interface sheet ${sheetPath} is missing or unreadable`)
  const base = await resolveCommit(task.repo, flags.at)
  const name = `${id}-${arm}-${n}`, branch = `bench/${name}`, results = join(data, 'results'), out = join(results, `${name}.json`)
  if (existsSync(out)) throw new Error(`results ${out} exist`)
  if ((await Bun.$`git check-ref-format refs/heads/${branch}`.nothrow().quiet()).exitCode !== 0) throw new Error(`branch name ${branch} is not a valid git ref`)
  if ((await Bun.$`git -C ${task.repo} rev-parse --verify -q refs/heads/${branch}`.nothrow().quiet()).exitCode === 0) throw new Error(`branch ${branch} exists in ${task.repo}`)

  // AskUserQuestion is not among the tools under -p (init of CLI 2.1.310), so a PreToolUse hook on it never fires: the
  // settings hold no hook, every arm gets the same empty file, and interventions come from the turns answered with a resume (hookLines 0).
  // bench/responder-hook.mjs stays for a mode where the tool does reach the agent.
  // the run folder keeps the settings and every turn's raw stream-json (prereg 7.2 labels a sample; 3 reads model ids)
  const runDir = join(results, name), settings = join(runDir, 'settings.json')
  rmSync(runDir, { recursive: true, force: true }) // no stale turns from a killed earlier attempt
  mkdirSync(runDir, { recursive: true })
  await Bun.write(settings, '{}\n')
  const turns = []
  const turn = async (b, o, label) => {
    const r = await b.turn({ model, pluginDirs, appendSystemPrompt, disallow, permissionMode: 'bypassPermissions', ...o })
    await Bun.write(join(runDir, `${turns.length}-${label}.jsonl`), r.out)
    turns.push({ turn: label, code: r.code === 'timeout' ? null : r.code, timedOut: r.code === 'timeout' })
    return r
  }

  // dropSettings off: the task repo's own .claude/ reaches every arm alike
  return withExport(task, base, name, async (dir) => {
    await freshRepo(dir, base)
    const b = await box({ data, task, id, name, base, repoGit: join(dir, '.git'), cli: cfg.cli, turnTimeoutSec: cfg.turnTimeoutSec, pluginDirs })
    try {
      const probe = await turn(b, { prompt: 'Reply OK.' }, 'probe') // its own session, the main run's model, plugins and settings
      let info, why
      try { info = initInfo(probe.out); why = probe.code !== 0 ? `probe exited ${probe.code}` : probeOk(arm, info, expected, []) } catch (e) { why = e.message }
      if (why) { console.error(`probe refused: ${why}`); return 2 }
      const start = new Date().toISOString()

      const sessionId = randomUUID(), outs = [], resumes = []
      let reason = null, machine = null
      for (let i = 0; ; i++) {
        const r = await turn(b, i === 0 ? { prompt: input + '\n\n' + sheet + DONE_LINE, sessionId } : { prompt: CONTINUE, resume: sessionId }, i === 0 ? 'main' : `resume-${i}`)
        outs.push(r.out)
        if (r.code === 'killed' || r.code === 'memory') { machine = r.code; break } // the machine's failure, never the arm's
        if (fellBack(r.out)) { machine = 'model'; break } // the whole session moved to another model, whatever modelUsage lists
        if (apiError(r.out)) { machine = 'api'; break }
        let text = null
        try { text = finalText(r.out) } catch {}
        const done = r.code === 0 && text?.trim() === 'DONE'
        if (done) break
        if (r.code === 'timeout') { reason = 'timeout'; break } // the arm's own timeout: a failed turn is just not DONE
        if (i === RESUMES) { reason = 'no DONE'; break }
        resumes.push('other') // a turn the runner answers with a resume (9.3): the main turn included, the last turn never
      }
      const us = outs.map(usage), sum = (k) => us.reduce((s, u) => s + u[k], 0)
      const models = [...new Set(us.flatMap((u) => u.models))]
      // served on another model than asked (a fallback); a run with no model at all (a cut turn) says nothing
      if (!machine && model && models.length && !models.includes(model)) machine = 'model'
      const tools = {}
      for (const o of outs) for (const [k, v] of Object.entries(toolUses(o))) tools[k] = (tools[k] ?? 0) + v
      const { models: probeModels, ...probeUsage } = usage(probe.out)
      const fallback = [probe.out, ...outs].map(fallbackOf).find((f) => f) ?? null // the probe is on the arm's model too

      let branched = false
      if (!machine) {
        const bundle = join(runDir, 'product.bundle')
        try {
          const p = await b.product(bundle)
          if (p.code !== 0) machine = 'killed'
          else {
            await agentGit(task.repo, ...SAFE, '-c', 'gc.auto=0', 'fetch', '-q', '--no-tags', bundle, `HEAD:refs/heads/${branch}`)
            branched = true
          }
        } catch (e) { console.error(e.message); machine = 'product' } // the record of a long run is written even when its product cannot be saved
        rmSync(bundle, { force: true })
      }
      const abandoned = reason !== null || machine !== null
      const rec = {
        task: id, arm, run: n, base, model: model ?? null, version: info.version, plugins, sessionId, start, end: new Date().toISOString(),
        status: abandoned ? 'abandoned' : 'done', reason: machine ? 'machine' : reason, machine, resumes,
        interventions: countInterventions({ hookLines: 0, resumes, abandoned }), // hookLines 0: no hook under -p, see the settings above
        turns,
        usage: { input: sum('input'), output: sum('output'), cacheRead: sum('cacheRead'), cacheWrite: sum('cacheWrite') },
        models, fallback, probeUsage, probeModels, probe: info, transcripts: runDir, toolUses: tools, box: b.box, envCommit: b.envCommit, branch: branched ? branch : null,
      }
      await Bun.write(out, JSON.stringify(rec, null, 2) + '\n')
      console.log(machine ? `${name} machine ${machine}` : `${name} ${rec.status}`)
      return machine ? 3 : 0
    } finally { await b.leave() }
  }, root)
}

if (import.meta.main) {
  try { process.exit(await runArm(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
