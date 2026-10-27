// The four arms, the intervention count and the probe check. Pure.
import { events } from './agent.mjs'

const SHORT = 'Write no tests. Do not run or check your work. Stop after one pass.'

export function armArgs(arm, cfg) {
  if (arm === 'B') return { model: cfg.model, pluginDirs: [], appendSystemPrompt: undefined }
  if (arm === 'B-') return { model: cfg.smallModel, pluginDirs: [], appendSystemPrompt: SHORT }
  if (arm === 'H' || arm === 'W') return { model: cfg.model, pluginDirs: cfg.plugins[arm], appendSystemPrompt: undefined }
  throw new Error(`arm ${arm} must be B, B-, H or W`)
}

export const countInterventions = ({ hookLines, resumes, abandoned }) => hookLines + resumes.filter((r) => r !== 'DONE').length + (abandoned ? 3 : 0)

export function initInfo(streamJson) {
  const init = events(streamJson).find((e) => e?.type === 'system' && e.subtype === 'init')
  if (!init) throw new Error('transcript has no init event')
  // builtin plugins load for every arm alike
  return { plugins: (init.plugins ?? []).filter((p) => p.path !== 'builtin').map((p) => p.name), commands: init.slash_commands ?? [], tools: init.tools ?? [],
    version: init.claude_code_version ?? null }
}

export function probeOk(arm, info, expectedPlugins, userSkills) {
  const got = [...info.plugins].sort(), want = [...expectedPlugins].sort()
  if (got.join('\n') !== want.join('\n')) return `plugins at init [${got}] differ from the arm's [${want}]`
  if (arm !== 'B' && arm !== 'B-') return null
  const bad = info.commands.filter((c) => c.includes(':') || userSkills.includes(c))
  return bad.length ? `arm ${arm} loads a plugin command or user skill: ${bad.join(', ')}` : null
}
