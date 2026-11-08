// Pure rules of the human steps (step 9, rulings 2, 3 and 8). No stack, tool or customer is named here.
import { agreement, queuePick } from './oracle.mjs'

const TRACE = ['traceable', 'not traceable', 'partly']
export const BATCHES = {
  inputs: { answers: ['clean', 'leak'] },
  'oracle-7.1': { answers: ['same', 'different', 'unclear'] },
  'rerate-7.2': { answers: TRACE },
  classify: { answers: TRACE },
  'classify-2': { answers: TRACE },
  labels: { answers: ['fix', 'requirement change', 'build'] }, // the row's kind picks two of these
  pairs: { answers: ['B- worse', 'same', 'B- better'] },
  history: { answers: ['rule 1', 'rule 2', 'rule 3', 'not counted'] },
}
const LABELS = { later: ['fix', 'requirement change'], 'in-task': ['fix', 'build'] }

export function answersFor(batch, row) {
  if (!Object.hasOwn(BATCHES, batch)) throw new Error(`unknown batch ${batch}`)
  return batch === 'labels' ? (LABELS[row?.kind] ?? []) : BATCHES[batch].answers
}
export const answerOk = (batch, row, answer) => answersFor(batch, row).includes(answer)

// `key answer note at` rows, tab-separated; the last row of a key wins
export function parseAnswers(tsv) {
  const out = new Map()
  for (const line of tsv.split('\n')) {
    if (!line.trim()) continue
    // a tab inside a note must not shift `at`: key and answer are the first two fields, `at` the last
    const f = line.replace(/\r$/, '').split('\t')
    out.set(f[0], { answer: f[1], note: f.length > 3 ? f.slice(2, -1).join('\t') : (f[2] ?? ''), at: f.length > 3 ? f.at(-1) : '' })
  }
  return out
}

// ruling 3: per set, the pick over the pool without cold keys; queuePick sorts and cuts, so every non-cold row of the old pick stays, in order
export function coldSwap(rows, pool, n, isCold, seed) {
  const sets = [...new Set([...rows.map((r) => r.set), ...n.keys()])]
  const out = sets.flatMap((set) => {
    const keep = (pool.get(set) ?? []).filter((k) => !isCold(k)), want = n.get(set) ?? 0
    if (keep.length < want) throw new Error(`the pool of ${set} has ${keep.length} non-cold keys, fewer than ${want}`)
    return queuePick(keep, want, seed).map((key) => ({ set, key }))
  })
  // ruling 10: the message names the set and a count, never a key
  const lost = rows.filter((r) => !isCold(r.key) && !out.some((o) => o.set === r.set && o.key === r.key))
  if (lost.length) throw new Error(`the pool of ${lost[0].set} cannot give ${lost.filter((r) => r.set === lost[0].set).length} rows of the old pick`)
  return out
}

export const planWindows = (tasks, time) => tasks.map(({ task, base, end }) => ({ task, from: time(base), to: time(end) }))

const REJECT = "The user doesn't want to"
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text ?? '').join('') : '')
const NOT_TEXT = ['<command-', '<local-command', '<system-reminder>', '<task-notification>', '<bash-stdout>', '<bash-stderr>']

const partsOf = (l) => { const c = l.message?.content; return typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : [] }
const main = (l) => l && !l.isSidechain && !l.isMeta && !l.isCompactSummary
// what one content part is, if it is a human act: reject | interrupt | bash | clear | message
function partKind(p) {
  if (p.type === 'tool_result') return textOf(p.content).trimStart().startsWith(REJECT) ? 'reject' : null
  if (p.type !== 'text') return null
  const t = p.text.trimStart()
  if (t.startsWith('[Request interrupted')) return 'interrupt'
  if (t.startsWith('<bash-input>')) return 'bash'
  if (t.startsWith('<command-')) return /<command-name>\s*\/(clear|compact)\s*<\/command-name>/.test(t) ? 'clear' : null
  return NOT_TEXT.some((s) => t.startsWith(s)) || !t ? null : 'message'
}

// ruling 8's filter, for the lines of one session in file order. `turn` counts the assistant entries before the event, `line` is the entry's index in `lines`.
// A reject, the interrupt in the next entry and the message after them with no assistant entry between are one event (the first of them); no text is kept.
export function events(lines) {
  const out = []
  let turn = 0
  for (const [line, l] of lines.entries()) {
    if (!main(l)) continue
    if (l.type === 'assistant') { turn++; continue }
    if (l.type !== 'user') continue
    let messaged = false // at most one message event per entry
    for (const p of partsOf(l)) {
      const k = partKind(p), prev = out.at(-1), open = prev?.turn === turn ? prev.kind : null
      if (!k) continue
      const add = () => out.push({ at: l.timestamp, kind: k, turn, line })
      if (k === 'reject') { if (open !== 'reject') add() }
      else if (k === 'interrupt') { if (open !== 'reject' && open !== 'interrupt') add() }
      else if (k === 'message') { if (!messaged && open !== 'reject' && open !== 'interrupt') { add(); messaged = true } }
      else add()
    }
  }
  return out
}

// the key of segment.events[i]: its line, and #n when an earlier event of the segment has the same line
export function eventKey(seg, i) {
  const n = seg.events.slice(0, i).filter((x) => x.line === seg.events[i].line).length
  return `${seg.key}:${seg.events[i].line}${n ? `#${n}` : ''}`
}

// the human's text of an event, from the session's entries (events' `line` indexes them). A reject or interrupt takes what events() merged into it:
// the rejects, interrupts and messages up to the next assistant entry or the next bash or clear command.
export function humanText(entries, e) {
  const group = e.kind === 'reject' || e.kind === 'interrupt', out = []
  let started = false
  for (let j = e.line; j < entries.length; j++) {
    const l = entries[j]
    if (!main(l)) continue
    if (l.type === 'assistant') break
    if (l.type !== 'user') continue
    for (const p of partsOf(l)) {
      const k = partKind(p), text = p.type === 'tool_result' ? textOf(p.content) : p.text
      if (!k) continue
      if (!group) { if (k === e.kind) { out.push(k === 'bash' ? text.replace(/<\/?bash-input>/g, '') : text); if (k === 'message') return text } continue }
      if (k === 'bash' || k === 'clear') { if (started) return out.join('\n'); continue }
      if (k === 'message' && !started) continue
      started = true
      out.push(text)
    }
    if (!group) break
  }
  return out.join('\n')
}

// the text of the last assistant entry before `line` that has any; empty when there is none
export function lastAgentText(entries, line) {
  for (let j = line - 1; j >= 0; j--) {
    if (!main(entries[j]) || entries[j].type !== 'assistant') continue
    const t = partsOf(entries[j]).filter((p) => p.type === 'text').map((p) => p.text).join('\n')
    if (t.trim()) return t
  }
  return ''
}

// a segment is a (task, session) pair with an event in the window (from, to]; an event in no window is counted, not kept
export function segments(sessions, windows) {
  const segs = []
  let outside = 0
  for (const { id, events: evs } of sessions) {
    const per = new Map()
    for (const e of evs) {
      const t = Date.parse(e.at)
      const w = windows.find((x) => t > x.from.getTime() && t <= x.to.getTime())
      if (!w) { outside++; continue }
      per.set(w.task, [...(per.get(w.task) ?? []), e])
    }
    for (const [task, es] of per) segs.push({ key: `${task}:${id}`, task, events: es })
  }
  // by the first event's time, so a caller takes a plan's first segment by index
  return { segments: segs.sort((a, b) => Date.parse(a.events[0].at) - Date.parse(b.events[0].at)), outside }
}

// ruling 8's tool rule; rule 3 is never given
export const toolLabel = (segment, isFirstOfPlan) =>
  segment.events.map((e, i) => (i === 0 ? (isFirstOfPlan ? 'not counted' : 'rule 2') : e.kind === 'bash' || e.kind === 'clear' ? 'rule 2' : 'rule 1'))

export const historyKappa = (human, tool) => agreement(human, tool, BATCHES.history.answers)
