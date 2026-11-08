import { test, expect } from 'bun:test'
import { BATCHES, answersFor, parseAnswers, answerOk, coldSwap, planWindows, events, segments, toolLabel, historyKappa } from '../bench/lib/human.mjs'
import { queuePick } from '../bench/lib/oracle.mjs'

test('the last answer of a key wins', () => {
  const m = parseAnswers('a\tsame\tfirst\t2026-11-08T01:00:00Z\n\nb\tunclear\t\t2026-11-08T01:01:00Z\na\tdifferent\tsecond\t2026-11-08T01:02:00Z\n')
  expect([...m.keys()]).toEqual(['a', 'b'])
  expect(m.get('a')).toEqual({ answer: 'different', note: 'second', at: '2026-11-08T01:02:00Z' })
})

test('an answer outside the batch set is refused, and labels take the row kind\'s set', () => {
  expect(answerOk('oracle-7.1', {}, 'same')).toBe(true)
  expect(answerOk('oracle-7.1', {}, 'traceable')).toBe(false)
  expect(answerOk('inputs', {}, 'leak')).toBe(true)
  expect(answerOk('classify', {}, 'partly')).toBe(true)
  expect(answerOk('pairs', {}, 'B- worse')).toBe(true)
  expect(answerOk('history', {}, 'rule 3')).toBe(true)
  expect(answerOk('labels', { kind: 'later' }, 'requirement change')).toBe(true)
  expect(answerOk('labels', { kind: 'later' }, 'build')).toBe(false)
  expect(answerOk('labels', { kind: 'in-task' }, 'build')).toBe(true)
  expect(answerOk('labels', { kind: 'in-task' }, 'requirement change')).toBe(false)
  expect(answersFor('labels', { kind: 'other' })).toEqual([])
  expect(Object.keys(BATCHES)).toEqual(['inputs', 'oracle-7.1', 'rerate-7.2', 'classify', 'classify-2', 'labels', 'pairs', 'history'])
})

test('the cold swap keeps every other row and refills the set', () => {
  const pool = new Map([['s1', ['a1', 'a2', 'a3', 'b1', 'b2', 'b3']]])
  const cold = (k) => k.startsWith('a')
  const old = queuePick(pool.get('s1'), 3, 'seed').map((key) => ({ set: 's1', key }))
  const swapped = coldSwap(old, pool, new Map([['s1', 3]]), cold, 'seed')
  const kept = old.filter((r) => !cold(r.key))
  expect(swapped.filter((r) => !cold(r.key))).toHaveLength(3)
  expect(swapped.some((r) => cold(r.key))).toBe(false)
  expect(swapped.map((r) => r.key)).toEqual(queuePick(['b1', 'b2', 'b3'], 3, 'seed'))
  const idx = kept.map((r) => swapped.findIndex((s) => s.key === r.key))
  expect(idx.every((i) => i >= 0)).toBe(true)
  expect(idx).toEqual([...idx].sort((x, y) => x - y))
})

test('a window is open at the base and closed at the end', () => {
  const t = { b: new Date('2026-01-01T00:00:00Z'), e: new Date('2026-01-02T00:00:00Z') }
  const w = planWindows([{ task: 't1', base: 'b', end: 'e' }], (sha) => t[sha])
  expect(w).toEqual([{ task: 't1', from: t.b, to: t.e }])
  const ev = (at) => [{ id: 's', events: [{ at, kind: 'message', turn: 0 }] }]
  const n = (at) => segments(ev(at), w).segments.length
  expect(n('2026-01-01T00:00:00Z')).toBe(0)
  expect(n('2026-01-01T00:00:01Z')).toBe(1)
  expect(n('2026-01-02T00:00:00Z')).toBe(1)
  expect(n('2026-01-02T00:00:01Z')).toBe(0)
})

const user = (content, at = '2026-01-01T00:00:00Z', extra = {}) => ({ type: 'user', timestamp: at, sessionId: 's', isSidechain: false, message: { content }, ...extra })
const asst = (at = '2026-01-01T00:00:00Z') => ({ type: 'assistant', timestamp: at, sessionId: 's', isSidechain: false, message: { content: [] } })

test('tool results, meta, commands and reminders are not events, an interrupt is', () => {
  const lines = [
    user('hello'),
    user([{ type: 'tool_result', content: 'ok' }]),
    user('x', undefined, { isMeta: true }),
    user('side', undefined, { isSidechain: true }),
    user('summary of the compacted history', undefined, { isCompactSummary: true }),
    user([{ type: 'text', text: '<system-reminder>x</system-reminder>' }]),
    user([{ type: 'text', text: '<task-notification>x</task-notification>' }]),
    user([{ type: 'text', text: '<command-name>/model</command-name>' }]),
    user([{ type: 'text', text: '<local-command-stdout>x</local-command-stdout>' }]),
    user([{ type: 'text', text: '<bash-input>ls</bash-input>' }]),
    user([{ type: 'text', text: '<bash-stdout>x</bash-stdout>' }]),
    user([{ type: 'text', text: '<command-name>/clear</command-name>' }]),
    user([{ type: 'text', text: '<command-name>/compact</command-name>' }]),
    user([{ type: 'tool_result', content: [{ type: 'text', text: "The user doesn't want to proceed with this tool use." }] }]),
    asst(),
    user([{ type: 'text', text: '[Request interrupted by user]' }]),
    { type: 'summary' },
  ]
  expect(events(lines).map((e) => e.kind)).toEqual(['message', 'bash', 'clear', 'clear', 'reject', 'interrupt'])
  expect(events(lines).every((e) => Object.keys(e).sort().join() === 'at,kind,line,turn')).toBe(true)
})

const w2 = [
  { task: 't1', from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-01-02T00:00:00Z') },
  { task: 't2', from: new Date('2026-01-02T00:00:00Z'), to: new Date('2026-01-03T00:00:00Z') },
]
const ev = (at, kind = 'message') => ({ at, kind, turn: 0 })

test('a quoted refusal is not a reject, one entry gives one message, a reject its interrupt and the message are one event', () => {
  const quote = user([{ type: 'tool_result', content: "the log says: The user doesn't want to proceed" }])
  expect(events([quote])).toEqual([])
  expect(events([user([{ type: 'tool_result', content: "The user doesn't want to proceed with this tool use." }])]).map((e) => e.kind)).toEqual(['reject'])
  expect(events([user([{ type: 'text', text: 'one' }, { type: 'text', text: 'two' }])]).map((e) => e.kind)).toEqual(['message'])
  const rej = user([{ type: 'tool_result', content: "The user doesn't want to proceed with this tool use." }], '2026-01-01T00:00:01Z')
  const itr = user([{ type: 'text', text: '[Request interrupted by user for tool use]' }], '2026-01-01T00:00:02Z')
  const msg = user('instead do this', '2026-01-01T00:00:03Z')
  expect(events([asst(), rej, itr, msg])).toEqual([{ at: '2026-01-01T00:00:01Z', kind: 'reject', turn: 1, line: 1 }])
  expect(events([asst(), rej, itr, asst(), msg]).map((e) => e.kind)).toEqual(['reject', 'message'])
})

test('segments of a task come sorted by their first event', () => {
  const r = segments([{ id: 'late', events: [ev('2026-01-01T09:00:00Z')] }, { id: 'early', events: [ev('2026-01-01T01:00:00Z')] }], w2)
  expect(r.segments.map((s) => s.key)).toEqual(['t1:early', 't1:late'])
})

test('the cold swap refuses a pool too small for its count', () => {
  const pool = new Map([['s1', ['a1', 'b1']]])
  expect(() => coldSwap([], pool, new Map([['s1', 2]]), (k) => k.startsWith('a'), 'seed')).toThrow(/fewer than 2/)
  // an old row the pool cannot give: the message names the set and a count, never the key
  expect(() => coldSwap([{ set: 's1', key: 'zz-T9' }], pool, new Map([['s1', 1]]), (k) => k.startsWith('a'), 'seed')).toThrow(/^the pool of s1 cannot give 1 rows of the old pick$/)
})

test('answer parsing and lookup edges', () => {
  expect(() => answersFor('nope', {})).toThrow(/unknown batch nope/)
  expect(answerOk('labels', {}, 'fix')).toBe(false)
  const m = parseAnswers('k\tfix\ta\tb\t2026-11-08T01:00:00Z\r\nj\tsame\n')
  expect(m.get('k')).toEqual({ answer: 'fix', note: 'a\tb', at: '2026-11-08T01:00:00Z' })
  expect(m.get('j')).toEqual({ answer: 'same', note: '', at: '' })
})

test('a session across two windows gives two segments', () => {
  const r = segments([{ id: 's', events: [ev('2026-01-01T05:00:00Z'), ev('2026-01-02T05:00:00Z')] }], w2)
  expect(r.segments.map((s) => [s.key, s.task, s.events.length])).toEqual([['t1:s', 't1', 1], ['t2:s', 't2', 1]])
})

test('an event in no window is counted and left out', () => {
  const r = segments([{ id: 's', events: [ev('2025-12-31T05:00:00Z'), ev('2026-01-01T05:00:00Z'), ev('2026-02-01T00:00:00Z')] }], w2)
  expect(r.outside).toBe(2)
  expect(r.segments).toHaveLength(1)
  expect(r.segments[0].events).toHaveLength(1)
})

test('the plan\'s first event is not counted, a later session\'s first is rule 2, an interrupt and its message are one rule 1', () => {
  const lines = [
    user('start', '2026-01-01T01:00:00Z'), asst(),
    user([{ type: 'text', text: '[Request interrupted by user]' }], '2026-01-01T02:00:00Z'),
    user('do it differently', '2026-01-01T02:00:05Z'), asst(),
    user([{ type: 'text', text: '<bash-input>ls</bash-input>' }], '2026-01-01T03:00:00Z'),
    user('plain', '2026-01-01T04:00:00Z'),
  ]
  const e = events(lines)
  expect(e.map((x) => x.kind)).toEqual(['message', 'interrupt', 'bash', 'message'])
  expect(toolLabel({ events: e }, true)).toEqual(['not counted', 'rule 1', 'rule 2', 'rule 1'])
  expect(toolLabel({ events: e }, false)).toEqual(['rule 2', 'rule 1', 'rule 2', 'rule 1'])
  expect(toolLabel({ events: [ev('x', 'clear')] }, true)).toEqual(['not counted'])
})

test('history kappa is 1 on equal labels', () => {
  const l = ['rule 1', 'rule 2', 'not counted', 'rule 1', 'rule 2']
  expect(historyKappa(l, [...l]).kappa).toBe(1)
  expect(historyKappa(l, l.map(() => 'rule 1')).kappa).toBeLessThan(1)
})
