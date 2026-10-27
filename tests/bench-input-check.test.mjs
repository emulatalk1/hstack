import { test, expect } from 'bun:test'
import { check } from '../bench/input-check.mjs'

test('passes behaviour text with URLs, query keys and UI words', () => {
  expect(check('A visitor on `/bat-dong-san?loai=villa` sees "Xóa lọc"; 2 tỷ is in "Đến 2 tỷ".')).toEqual([])
})

test('flags code fences, paths, file names, test calls and test pointers', () => {
  const text = [
    '```ts',
    'Keys live in `src/lib/filter-keys.ts`.',
    "Step 3. — `tests/e2e/x.e2e.spec.ts` 'a title'",
    "expect(page).toHaveText('x')",
    'const a = 1',
  ].join('\n')
  const rules = new Set(check(text).map((h) => h.rule))
  for (const r of ['code fence', 'test or source path', 'source file name', 'test file name', 'test call', 'test title pointer', 'code syntax'])
    expect(rules.has(r)).toBe(true)
})
