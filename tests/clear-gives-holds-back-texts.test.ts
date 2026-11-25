// Acceptance tests of spec 12 (`docs/specs/2026-11-25-clear-gives-holds-back.md`), written from the spec alone:
// the texts, behaviours 6 and 7. The hooks (behaviours 1 to 5) are in tests/clear-gives-holds-back.test.ts.
// Run: bun test tests/clear-gives-holds-back-texts.test.ts
// Each test reads only files of this repository. A phrase is looked for word for word; a line break inside a phrase
// counts as a space, and in CLAUDE.md a backtick counts as nothing (the spec quotes the line in a code span, so it
// cannot show whether /clear is written in backticks there).
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')
const has = (where: string, text: string, p: string, yes: boolean) => expect(`${where} holds "${p}": ${flat(text).includes(flat(p))}`).toBe(`${where} holds "${p}": ${yes}`)

test('6: CLAUDE.md holds "A stop gate that refuses to end an unfinished run of this session (at most 3 times per process; a /clear gives them back).", and no longer holds "(at most 3 times per process)."', () => {
  const t = raw('CLAUDE.md').replace(/`/g, '')
  has('CLAUDE.md', t, 'A stop gate that refuses to end an unfinished run of this session (at most 3 times per process; a /clear gives them back).', true)
  has('CLAUDE.md', t, '(at most 3 times per process).', false)
})

test('7: .claude-plugin/plugin.json holds "version": "0.4.8", and the README\'s status paragraph starts with **Status: v0.4.8.**', () => {
  const plugin = raw('.claude-plugin/plugin.json')
  expect(`plugin.json holds "version": "0.4.8": ${plugin.includes('"version": "0.4.8"')}`).toBe('plugin.json holds "version": "0.4.8": true')
  expect((JSON.parse(plugin) as { version?: string }).version).toBe('0.4.8')
  const status = raw('README.md').split('\n').filter((l) => l.includes('**Status:'))
  expect(`the README has one status paragraph: ${status.length}`).toBe('the README has one status paragraph: 1')
  expect(`the README's status paragraph starts with **Status: v0.4.8.**: ${(status[0] ?? '').startsWith('**Status: v0.4.8.**')}`).toBe("the README's status paragraph starts with **Status: v0.4.8.**: true")
})
