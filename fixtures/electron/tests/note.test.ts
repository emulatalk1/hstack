import { describe, expect, it } from 'vitest'
import { normalizeNote, MAX_NOTE } from '../src/shared/note'

describe('normalizeNote', () => {
  it('trims and caps a note', () => {
    expect(normalizeNote('  hi  ')).toBe('hi')
    expect(normalizeNote('x'.repeat(MAX_NOTE + 5))).toHaveLength(MAX_NOTE)
    expect(() => normalizeNote('   ')).toThrow('empty note')
  })
})
