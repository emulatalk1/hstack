import { test, expect } from 'bun:test'
import { pairedTasks, bugsForHalfWidth } from '../bench/power.mjs'

test('paired task count matches the textbook formula', () => {
  // (2.8016 * 0.25 / 0.15)^2 = 21.8 -> 22
  expect(pairedTasks(0.25, 0.15)).toBe(22)
  expect(pairedTasks(0.2, 0.2)).toBe(8)
})

test('bug count for a catch-rate interval', () => {
  // 1.96^2 * 0.25 / 0.01 = 96.04 -> 97
  expect(bugsForHalfWidth(0.5, 0.1)).toBe(97)
})
