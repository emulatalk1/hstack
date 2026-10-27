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

test('flags template code but not prices', () => {
  expect(check('- message: "Lỗi ở tệp ${file}"').map((h) => h.rule)).toEqual(['template code'])
  expect(check('- message: "Thiếu mã ở cột $1"').map((h) => h.rule)).toEqual(['template code'])
  expect(check('A villa costs 5 tỷ, about $ 5 million.')).toEqual([])
})

const rulesOf = (text) => check(text).map((h) => h.rule)

test('flags framework config values, module specifiers and named framework identifiers', () => {
  for (const t of ["`idType: 'uuid'`", '`overrideAccess: false`', '`draft: true`', '`revalidate = 600`', "`dynamic = 'force-dynamic'`", '`images: { unoptimized: true }`'])
    expect(rulesOf(t)).toContain('config value')
  for (const t of ['`next/image`', '`react-dom/server.edge`']) expect(rulesOf(t)).toContain('module specifier')
  for (const t of ['generateStaticParams', '`generateStaticParams`', 'searchParams', '`searchParams`']) expect(rulesOf(t)).toContain('framework name')
})

test('flags the names the sweep found: admin slots, redirect(), next build and backticked Tailwind names', () => {
  for (const t of ['`providers`', '`graphics`', '`admin.group`', '`meta.icons`', '`redirect()`', 'a plain `next build`', 'Tailwind `md` 721 px', 'never `font-bold`'])
    expect(rulesOf(t)).toContain('framework name')
  expect(check('Breakpoints md and lg in prose; a redirect to the list.')).toEqual([])
  expect(rulesOf('compile mode (`--experimental-build-mode compile`)')).toContain('framework name')
})

test('matches providers, graphics and next build only as a whole backticked span', () => {
  for (const t of ['email providers and graphics cards', 'carried to the next build of the site']) expect(check(t)).toEqual([])
})

test('leaves headers, CSS, phone links and API field names alone', () => {
  for (const t of ['`Cache-Control: private, no-cache`', '`x-nextjs-cache: HIT`', '`min-width: 0`', '`prefers-reduced-motion: reduce`', '`tel:+84900000001`', '`/_next/image`', '`SCHEMA_PUSH=false`', '`propertyType`', '`externalId, title, price`', '`subject:"Lê Thị Cúc"`', '`trang/[n]`', '`image/png`', '`image/svg+xml`'])
    expect([t, check(t)]).toEqual([t, []])
})
