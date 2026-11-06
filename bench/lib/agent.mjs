// Headless claude: the argument list, and what a stream-json transcript and a judge reply say. Pure.

export function claudeArgs({ prompt, model, settings, pluginDirs = [], addDirs = [], appendSystemPrompt, permissionMode, noPersist, tools, allow, disallow, sessionId, resume }) {
  const a = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config']
  if (model) a.push('--model', model)
  for (const d of pluginDirs) a.push('--plugin-dir', d)
  for (const d of addDirs) a.push('--add-dir', d)
  if (settings) a.push('--settings', settings)
  if (appendSystemPrompt) a.push('--append-system-prompt', appendSystemPrompt)
  if (permissionMode) a.push('--permission-mode', permissionMode)
  if (noPersist) a.push('--no-session-persistence') // no transcript under ~/.claude/projects that a later agent could read
  if (tools) a.push('--tools', tools.join(',')) // [] -> '', which turns every tool off
  if (allow) a.push('--allowedTools', allow.join(','))
  if (disallow) a.push('--disallowedTools', disallow.join(','))
  if (sessionId) a.push('--session-id', sessionId)
  if (resume) a.push('--resume', resume)
  return a
}

export const events = (s) => s.split('\n').flatMap((l) => { try { return [JSON.parse(l)] } catch { return [] } })

export function finalText(streamJson) {
  const r = events(streamJson).filter((e) => e?.type === 'result').at(-1)
  if (r?.is_error === true) throw new Error('transcript result is_error') // e.g. an API error text: never a reply to judge
  if (typeof r?.result !== 'string') throw new Error('transcript has no result') // error_* results carry no text
  return r.result
}

// a rate limit or an outage ends the last result with is_error: the machine's failure, never the arm's
export const apiError = (streamJson) => events(streamJson).filter((e) => e?.type === 'result').at(-1)?.is_error === true

// the CLI moved the session to another model (a refusal by the classifier, or an overload): the notice names both models
const FALLBACKS = ['model_fallback', 'model_refusal_fallback']
const notice = (streamJson) => events(streamJson).find((e) => e?.type === 'system' && FALLBACKS.includes(e.subtype))
export const fellBack = (streamJson) => notice(streamJson) !== undefined
export function fallbackOf(streamJson) {
  const e = notice(streamJson)
  return e ? { original: e.original_model ?? null, fallback: e.fallback_model ?? null, category: e.category ?? null } : null
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

// tool calls by tool name: a count that shows whether an agent did the reading its brief asks, without its content
export function toolUses(streamJson) {
  const seen = new Set(), n = {}
  for (const e of events(streamJson)) {
    if (e?.type !== 'assistant' || !Array.isArray(e.message?.content)) continue
    for (const b of e.message.content) {
      if (b?.type !== 'tool_use' || seen.has(b.id)) continue
      seen.add(b.id)
      n[b.name] = (n[b.name] ?? 0) + 1
    }
  }
  return n
}

// the inputs of the calls of one tool whose tool_result is not an error (a denied or failed call is one)
export function okToolInputs(streamJson, name) {
  const input = new Map(), failed = new Set(), done = new Set()
  for (const e of events(streamJson)) for (const b of Array.isArray(e?.message?.content) ? e.message.content : []) {
    if (e.type === 'assistant' && b?.type === 'tool_use' && b.name === name) input.set(b.id, b.input ?? {})
    if (e.type === 'user' && b?.type === 'tool_result') (b.is_error === true ? failed : done).add(b.tool_use_id)
  }
  return [...input].filter(([id]) => done.has(id) && !failed.has(id)).map(([, i]) => i)
}
export const okBashCommands = (streamJson) => okToolInputs(streamJson, 'Bash').map((i) => String(i.command ?? ''))

export function judgeVerdict(text) {
  const body = /^\s*```json\n([\s\S]*?)\n```\s*$/.exec(text)?.[1] ?? text
  let v
  try { v = JSON.parse(body) } catch {}
  // the message never quotes the reply: in sealed mode the reply describes the bug
  if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.caught !== 'boolean' || typeof v.quote !== 'string') throw new Error('judge reply is not one {"caught", "quote"} object')
  return { caught: v.caught, quote: v.quote }
}
