import { test, expect } from 'bun:test'
import { hunkOwners, agreement, usable, mergeLabels, introducer, oracleSha, queuePick } from '../bench/lib/oracle.mjs'

const order = ['p1', 'p2', 'p3']

test('hunkOwners gives each hunk one owner, ties to the earlier task', () => {
  const rows = [
    { task: 'p3', commit: 'abc1234', file: 'a.py', old: 10, lines: 5 },
    { task: 'p2', commit: 'abc1234', file: 'a.py', old: 10, lines: 3 },
    { task: 'p2', commit: 'abc1234', file: 'a.py', old: 10, lines: 2 }, // p2 sums to 5, ties p3: the earlier task wins
    { task: 'p3', commit: 'abc1234', file: 'b.py', old: 1, lines: 4 },
    { task: 'p1', commit: 'abc1234', file: 'b.py', old: 1, lines: 1 },
    { task: 'p1', commit: 'def5678', file: 'a.py', old: 10, lines: 9 },
  ]
  const m = hunkOwners(rows, order)
  expect(m.size).toBe(3)
  expect(m.get('abc1234\ta.py\t10')).toBe('p2')
  expect(m.get('abc1234\tb.py\t1')).toBe('p3')
  expect(m.get('def5678\ta.py\t10')).toBe('p1')
})

test('agreement reproduces p8b', () => {
  const cats = ['traceable', 'partly', 'not traceable']
  const pairs = [[21, 'not traceable', 'not traceable'], [1, 'partly', 'partly'], [1, 'not traceable', 'partly'], [1, 'partly', 'not traceable'], [1, 'traceable', 'partly']]
  const a = [], b = []
  for (const [k, x, y] of pairs) for (let i = 0; i < k; i++) { a.push(x); b.push(y) }
  const s = agreement(a, b, cats)
  expect(s.n).toBe(25)
  expect(s.agree).toBe(22)
  expect(s.raw).toBeCloseTo(0.88, 2)
  expect(s.kappa).toBeCloseTo(0.44, 2)
  expect(s.ac1).toBeCloseTo(0.87, 2)
  expect(s.top).toBeCloseTo(0.88, 2)
  expect(usable(s)).toBe(true) // top 0.88 > 0.8, raw 0.88, AC1 0.87
})

test('agreement guards a zero chance agreement', () => {
  expect(agreement(['x', 'x'], ['x', 'x'], ['x'])).toMatchObject({ kappa: 1, ac1: 1 })
  expect(agreement(['x', 'x'], ['x', 'x'], ['x', 'y'])).toMatchObject({ kappa: 1 })
})

test('usable takes the AC1 branch when one label covers more than 80%', () => {
  expect(usable({ kappa: 0.6, raw: 0, ac1: 0, top: 0 })).toBe(true)
  expect(usable({ kappa: 0.59, raw: 0.9, ac1: 0.8, top: 0.8 })).toBe(false) // top must exceed 0.8
  expect(usable({ kappa: 0.2, raw: 0.9, ac1: 0.8, top: 0.81 })).toBe(true)
  expect(usable({ kappa: 0.2, raw: 0.84, ac1: 0.8, top: 0.9 })).toBe(false)
  expect(usable({ kappa: 0.2, raw: 0.9, ac1: 0.69, top: 0.9 })).toBe(false)
})

test('mergeLabels keeps agreed labels and lists partly and disputed', () => {
  const c1 = [{ id: 'a', label: 'traceable' }, { id: 'b', label: 'not traceable' }, { id: 'c', label: 'partly' }, { id: 'd', label: 'traceable' }, { id: 'e', label: 'partly' }]
  const c2 = [{ id: 'a', label: 'traceable' }, { id: 'b', label: 'not traceable' }, { id: 'c', label: 'partly' }, { id: 'd', label: 'not traceable' }, { id: 'f', label: 'traceable' }]
  expect(mergeLabels(c1, c2)).toEqual({ labels: { a: 'build', b: 'requirement' }, partly: ['c'], disputed: ['d', 'e', 'f'] })
})

test('introducer skips a task whose base already fails and returns null when none fits', () => {
  const b = (task, base, end) => ({ task, base, end })
  expect(introducer([b('p3', 'pass', 'pass'), b('p2', 'fail', 'fail'), b('p1', 'precondition', 'fail')])).toBe('p1')
  expect(introducer([b('p3', 'pass', 'fail'), b('p2', 'pass', 'fail')])).toBe('p3')
  expect(introducer([b('p3', 'fail', 'fail'), b('p2', 'error', 'fail'), b('p1', 'pass', 'error')])).toBeNull()
  expect(introducer([])).toBeNull()
})

test('oracleSha changes with one byte of one file and not with file order', () => {
  const f = [{ path: 'a.py', text: 'one' }, { path: 'b.py', text: 'two' }]
  const sha = oracleSha(f)
  expect(sha).toMatch(/^[0-9a-f]{64}$/)
  expect(oracleSha([...f].reverse())).toBe(sha)
  expect(oracleSha([f[0], { path: 'b.py', text: 'twp' }])).not.toBe(sha)
  expect(oracleSha([{ path: 'a.py', text: 'onetwo' }, { path: 'b.py', text: '' }])).not.toBe(oracleSha([{ path: 'a.py', text: 'one' }, { path: 'b.py', text: 'two' }]))
  expect(oracleSha([{ path: 'a', text: 'bc' }])).not.toBe(oracleSha([{ path: 'ab', text: 'c' }]))
})

test('queuePick is stable and seed-dependent', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`)
  const pick = queuePick(ids, 5, 's1')
  expect(pick).toHaveLength(5)
  expect(queuePick([...ids].reverse(), 5, 's1')).toEqual(pick)
  expect(queuePick(ids, 5, 's2')).not.toEqual(pick)
  expect(queuePick(ids, 50, 's1')).toHaveLength(20)
})
