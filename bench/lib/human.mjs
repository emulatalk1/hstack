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
  if (batch !== 'labels') return BATCHES[batch].answers
  const a = LABELS[row?.kind]
  if (!a) throw new Error(`a labels row needs kind later or in-task, got ${row?.kind}`)
  return a
}
export const answerOk = (batch, row, answer) => answersFor(batch, row).includes(answer)

// `key answer note at` rows, tab-separated; the last row of a key wins
export function parseAnswers(tsv) {
  const out = new Map()
  for (const line of tsv.split('\n')) {
    if (!line.trim()) continue
    const [key, answer, note = '', at = ''] = line.split('\t')
    out.set(key, { answer, note, at })
  }
  return out
}

// ruling 3: per set, the pick over the pool without cold keys; queuePick sorts and cuts, so every non-cold row of the old pick stays, in order
export function coldSwap(rows, pool, n, isCold, seed) {
  const sets = [...new Set([...rows.map((r) => r.set), ...n.keys()])]
  const out = sets.flatMap((set) => queuePick((pool.get(set) ?? []).filter((k) => !isCold(k)), n.get(set) ?? 0, seed).map((key) => ({ set, key })))
  for (const r of rows) if (!isCold(r.key) && !out.some((o) => o.set === r.set && o.key === r.key)) throw new Error(`the old pick holds ${r.key}, which the pool of ${r.set} cannot give`)
  return out
}

export const planWindows = (tasks, time) => tasks.map(({ task, base, end }) => ({ task, from: time(base), to: time(end) }))

const REJECT = "The user doesn't want to proceed"
const NOT_TEXT = ['<command-', '<local-command', '<system-reminder>', '<task-notification>', '<bash-stdout>', '<bash-stderr>']

// ruling 8's filter, for the lines of one session in file order. `turn` counts the assistant entries before the event.
// An interrupt swallows the message after it in the same turn (one event, hence one rule 1); no text is kept.
export function events(lines) {
  const out = []
  let turn = 0
  for (const l of lines) {
    if (l.isSidechain || l.isMeta) continue
    if (l.type === 'assistant') { turn++; continue }
    if (l.type !== 'user') continue
    const c = l.message?.content
    for (const p of typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : []) {
      const add = (kind) => out.push({ at: l.timestamp, kind, turn })
      if (p.type === 'tool_result') { if (JSON.stringify(p.content ?? '').includes(REJECT)) add('reject'); continue }
      if (p.type !== 'text') continue
      const t = p.text.trimStart()
      if (t.startsWith('[Request interrupted')) add('interrupt')
      else if (t.startsWith('<bash-input>')) add('bash')
      else if (t.startsWith('<command-')) { if (/<command-name>\s*\/(clear|compact)\s*<\/command-name>/.test(t)) add('clear') }
      else if (NOT_TEXT.some((s) => t.startsWith(s)) || !t) continue
      else if (!(out.at(-1)?.kind === 'interrupt' && out.at(-1).turn === turn)) add('message')
    }
  }
  return out
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
  return { segments: segs, outside }
}

// ruling 8's tool rule; rule 3 is never given
export const toolLabel = (segment, isFirstOfPlan) =>
  segment.events.map((e, i) => (i === 0 ? (isFirstOfPlan ? 'not counted' : 'rule 2') : e.kind === 'bash' || e.kind === 'clear' ? 'rule 2' : 'rule 1'))

export const historyKappa = (human, tool) => agreement(human, tool, BATCHES.history.answers)
