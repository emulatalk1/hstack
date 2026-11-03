#!/usr/bin/env bun
// Run one headless agent that sees only its prompt and, with --at, the files of one commit (no .git, no project
// settings). Generic: the input filter and the interface-sheet writer run through it, so they cannot read anything else.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, withExport } from './env.mjs'
import { runClaude } from './agent-replay.mjs'
import { finalText, toolUses, usage } from './lib/agent.mjs'
import { initInfo } from './lib/arm.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/sealed-agent.mjs <task.json> <label> --prompt <file> --out <file> [--at <commit>] [--tools <name,name,...>] [--settings <file>]'

export async function sealedAgent(args, { root = ROOT, record } = {}) {
  const pos = [], flags = {}
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { pos.push(args[i]); continue }
    const k = args[i].slice(2)
    if (!['prompt', 'out', 'at', 'tools', 'settings'].includes(k) || args[i + 1] === undefined || Object.hasOwn(flags, k)) throw new Error(USAGE)
    flags[k] = args[++i]
  }
  if (pos.length !== 2 || !flags.prompt || !flags.out) throw new Error(USAGE)
  const [taskPath, label] = pos, rec = `${flags.out}.run.json`
  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(label)) throw new Error(`label ${label} must match ^[a-z0-9][a-z0-9_.-]*$`)
  for (const f of [flags.out, rec]) if (existsSync(f)) throw new Error(`${f} exists`)
  const prompt = await Bun.file(flags.prompt).text().catch(() => null)
  if (prompt === null) throw new Error(`prompt file ${flags.prompt} is missing or unreadable`)
  // absolute: the agent runs in the export folder, where a relative path would point elsewhere
  const settings = flags.settings ? resolve(flags.settings) : null
  if (settings && !existsSync(settings)) throw new Error(`settings file ${settings} is missing`)
  const task = await loadTask(taskPath)
  const tools = flags.tools ? flags.tools.split(',') : []
  const at = flags.at ?? null

  const start = new Date().toISOString()
  const run = await withExport(task, at, `sealed-${label}`, (cwd) => runClaude({ prompt, settings, permissionMode: 'default', noPersist: true, tools }, cwd, { timeoutSec: task.timeoutSec }), root, { dropSettings: true })
  let info = { version: null, tools: null }
  try { info = initInfo(run.out) } catch {}
  const { models, ...u } = usage(run.out)
  let text = null
  if (run.code === 0) try { text = finalText(run.out) } catch {}
  await Bun.write(rec, JSON.stringify({ label, at, settings, start, end: new Date().toISOString(), code: run.code, version: info.version, tools: info.tools, usage: u, models, toolUses: toolUses(run.out), ...record?.(run.out) }, null, 2) + '\n')
  if (text === null) return 1
  await Bun.write(flags.out, text)
  return 0
}

if (import.meta.main) {
  try { process.exit(await sealedAgent(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
