// Headless claude: the argument list, and what a stream-json transcript and a judge reply say. Pure.

export function claudeArgs({ prompt, model, settings, pluginDirs = [], addDirs = [], appendSystemPrompt, permissionMode, tools, allow, sessionId, resume }) {
  const a = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config']
  if (model) a.push('--model', model)
  for (const d of pluginDirs) a.push('--plugin-dir', d)
  for (const d of addDirs) a.push('--add-dir', d)
  if (settings) a.push('--settings', settings)
  if (appendSystemPrompt) a.push('--append-system-prompt', appendSystemPrompt)
  if (permissionMode) a.push('--permission-mode', permissionMode)
  if (tools) a.push('--tools', tools.join(',')) // [] -> '', which turns every tool off
  if (allow) a.push('--allowedTools', allow.join(','))
  if (sessionId) a.push('--session-id', sessionId)
  if (resume) a.push('--resume', resume)
  return a
}

export const events = (s) => s.split('\n').flatMap((l) => { try { return [JSON.parse(l)] } catch { return [] } })

export function finalText(streamJson) {
  const r = events(streamJson).filter((e) => e?.type === 'result').at(-1)
  if (typeof r?.result !== 'string') throw new Error('transcript has no result') // error_* results carry no text
  return r.result
}

export function usage(streamJson) {
  const ev = events(streamJson), byId = new Map(), models = []
  ev.forEach((e, i) => {
    if (e?.type !== 'assistant' || !e.message) return
    // fallback only: one API message streams as one event per content block, each with a usage snapshot, so count it once
    byId.set(e.message.id ?? i, e.message.usage ?? {})
    if (e.message.model && !models.includes(e.message.model)) models.push(e.message.model)
  })
  const result = ev.filter((e) => e?.type === 'result').at(-1)
  for (const m of Object.keys(result?.modelUsage ?? {})) if (!models.includes(m)) models.push(m)
  // the result event's usage is the run total; assistant snapshots undercount output
  const parts = result?.usage ? [result.usage] : [...byId.values()]
  const sum = (k) => parts.reduce((n, u) => n + (u[k] ?? 0), 0)
  return { input: sum('input_tokens'), output: sum('output_tokens'), cacheRead: sum('cache_read_input_tokens'), cacheWrite: sum('cache_creation_input_tokens'), models }
}

export function judgeVerdict(text) {
  const body = /^\s*```json\n([\s\S]*?)\n```\s*$/.exec(text)?.[1] ?? text
  let v
  try { v = JSON.parse(body) } catch {}
  // the message never quotes the reply: in sealed mode the reply describes the bug
  if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.caught !== 'boolean' || typeof v.quote !== 'string') throw new Error('judge reply is not one {"caught", "quote"} object')
  return { caught: v.caught, quote: v.quote }
}
