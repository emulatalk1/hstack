#!/usr/bin/env bun
// Replay a bug against an agent layer (review, audit, evaluator), then let a separate judge that sees only the bug's
// sealed description and the layer's findings say whether it was caught. The agent never gets a .git: a worktree
// shares the repo's refs and objects, so `git log --all` would show the fix.
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ROOT, withEnv, withExport } from './env.mjs'
import { resolveCommit } from './grade.mjs'
import { claudeArgs, finalText, judgeVerdict, usage } from './lib/agent.mjs'
import { runGroup } from './lib/proc.mjs'
import { loadTask } from './lib/task.mjs'
import { readBug, reverseApply } from './replay.mjs'

const USAGE = 'usage: bun bench/agent-replay.mjs <task.json> <bug.json> <review|audit|evaluator> [--sealed]'
const JUDGE = 'Did any finding describe this defect (same behaviour, same place)? Reply with one JSON object only.'
const NEEDS = { review: ['task', 'base', 'end'], audit: ['task', 'base', 'end'], evaluator: ['task', 'at', 'patch'] }
const strings = (v) => v === undefined || (Array.isArray(v) && v.every((s) => typeof s === 'string'))

// the agent must not find the data folder (results, other bugs) or the bench's own variables
export const agentEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('BENCH_') && k !== 'HSTACK_BENCH_MACHINE'))

// One headless claude call (binary from BENCH_CLAUDE); its process group is killed after timeoutSec and after it exits.
export async function runClaude(opts, cwd, { timeoutSec, quiet = false }) {
  // shortcut: the prompt rides in argv, so a task diff over ~1 MB (macOS ARG_MAX) fails to start and `ps` shows the
  // sealed description while the judge runs; move the prompt to stdin when a diff that large or a shared machine comes up.
  // The same holds for a layer command: one that passes the BENCH_EXCLUDE titles as a filter (an e2e --grep-invert) shows
  // the bug's test names in `ps`.
  return runGroup([process.env.BENCH_CLAUDE || 'claude', ...claudeArgs(opts)], { cwd, env: agentEnv(), stdout: 'pipe', stderr: quiet ? 'ignore' : 2, timeoutSec })
}

export async function agentReplay(args, { root = ROOT } = {}) {
  const sealed = args.includes('--sealed')
  const pos = args.filter((a) => a !== '--sealed')
  if (pos.length !== 3) throw new Error(USAGE)
  const [taskPath, bugPath, layer] = pos
  const task = await loadTask(taskPath)
  if (!Object.hasOwn(NEEDS, layer)) throw new Error(`layer ${layer} must be review, audit or evaluator`)
  const cfg = Object.hasOwn(task.layers, layer) ? task.layers[layer] : undefined
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg) || typeof cfg.brief !== 'string' || !strings(cfg.tools) || !strings(cfg.allow))
    throw new Error(`layer ${layer} must be { brief: <path>, tools?: string[], allow?: string[] } in the task's layers`)
  const briefPath = resolve(dirname(resolve(taskPath)), cfg.brief)
  const brief = await Bun.file(briefPath).text().catch(() => null)
  if (brief === null) throw new Error(`layer ${layer} brief ${briefPath} is missing or unreadable`)

  const bug = await readBug(bugPath, ['description', ...NEEDS[layer]])
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(bug.task)) throw new Error('bug task must match ^[A-Za-z0-9][A-Za-z0-9_.-]*$')
  const data = dirname(resolve(process.env.HSTACK_BENCH_MACHINE))
  const inputPath = join(data, bug.task, 'input.md') // the filtered input, never the raw plan: its Review Focus can name the bug
  const input = layer === 'audit' ? '' : await Bun.file(inputPath).text().catch(() => null)
  if (input === null) throw new Error(`filtered input ${inputPath} is missing`)

  const claude = (opts, cwd) => runClaude(opts, cwd, { timeoutSec: task.timeoutSec, quiet: sealed }) // sealed: the agent's output shows the bug
  const agent = (prompt, commit) => withExport(task, commit, `agent-${bug.id}-${layer}`,
    (cwd) => claude({ prompt, permissionMode: 'default', tools: cfg.tools, allow: cfg.allow }, cwd), root, { dropSettings: true })

  const start = new Date().toISOString()
  let run, envErr
  if (layer === 'evaluator') {
    const at = await resolveCommit(task.repo, bug.at)
    await withEnv(task, at, `eval-${bug.id}`, async ({ url }) => { run = await agent(`${brief}\n\n## Input\n\n${input}\n\n## App\n\nThe app runs at ${url}.\n`) },
      { root, quiet: sealed, before: reverseApply(bug, sealed) })
      .catch((e) => { if (!run) throw e; envErr = e }) // a stop or teardown failure after the agent ran must not lose its record
  } else {
    // the bug is present at the task's end by construction (its fix came later), so nothing is applied
    const [base, end] = await Promise.all([resolveCommit(task.repo, bug.base), resolveCommit(task.repo, bug.end)])
    if (layer === 'audit') run = await agent(brief, end)
    else run = await agent(`${brief}\n\n## Input\n\n${input}\n\n## Diff of the task\n\n${await Bun.$`git -C ${task.repo} diff --no-ext-diff --no-color ${base} ${end}`.quiet().text()}`)
  }

  const rec = { id: bug.id, layer, sealed, start, end: null, verdict: 'error', models: {}, usage: {} }
  const count = (who, out) => { const { models, ...u } = usage(out); rec.usage[who] = u; rec.models[who] = models }
  count('layer', run.out)
  try {
    if (envErr) throw envErr
    if (run.code !== 0) throw new Error(`layer exited ${run.code}`)
    const findings = finalText(run.out)
    if (!sealed) rec.findings = findings
    const prompt = `${JUDGE} Its shape: {"caught": true|false, "quote": "<the words of the finding that describes it, or empty>"}\n\n## Defect\n\n${bug.description}\n\n## Findings\n\n${findings}\n`
    const j = await withExport(task, null, `judge-${bug.id}-${layer}`, (cwd) => claude({ prompt, tools: [] }, cwd), root) // own empty cwd: no project settings
    count('judge', j.out)
    if (j.code !== 0) throw new Error(`judge exited ${j.code}`)
    const v = judgeVerdict(finalText(j.out))
    rec.verdict = v.caught ? 'caught' : 'missed'
    if (!sealed) { rec.quote = v.quote; console.log(`quote: ${v.quote}`) }
  } catch (e) {
    if (!sealed) console.error(e.message)
  }
  rec.end = new Date().toISOString()
  mkdirSync(join(data, 'results'), { recursive: true })
  await Bun.write(join(data, 'results', `${bug.id}-${layer}.json`), JSON.stringify(rec, null, 2) + '\n')
  console.log(`${bug.id} ${rec.verdict}`)
  return rec.verdict === 'error' ? 1 : 0
}

if (import.meta.main) {
  try { process.exit(await agentReplay(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
