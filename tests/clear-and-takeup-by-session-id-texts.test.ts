// Acceptance tests of spec 11 (`docs/specs/2026-11-24-clear-and-takeup-by-session-id.md`), written from the spec
// alone: the texts, behaviours 19, 20, 22 and 23. Each test names its behaviour by its number.
// The hooks and the script (behaviours 1 to 18 and 21) are in tests/clear-and-takeup-by-session-id.test.ts.
// Run: bun test tests/clear-and-takeup-by-session-id-texts.test.ts
// Each test reads only files of this repository. A phrase is looked for word for word; a line break inside a phrase
// counts as a space. Where the spec leaves the words to the builder ("says that …"), a test looks for the few words of
// the spec's own sentence that any wording of it needs.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
const lacks = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": false`) }
const says = (where: string, text: string, what: string, re: RegExp) => expect(`${where} says ${what}: ${re.test(flat(text))}`).toBe(`${where} says ${what}: true`)

// ---------- behaviours 19 and 20: the step 4 skill says nothing of the time ----------

// an item of a numbered list: from the line "<n>. " to the next line that starts an item or a heading
function item(file: string, num: number): string {
  const ls = raw(file).split('\n'), i = ls.findIndex((l) => l.startsWith(`${num}. `))
  expect(`${file} has an item ${num}: ${i >= 0}`).toBe(`${file} has an item ${num}: true`)
  if (i < 0) return ''
  let j = i + 1
  while (j < ls.length && !/^([0-9]+\. |#)/.test(ls[j])) j++
  return ls.slice(i, j).join('\n')
}

test('19: item 6 of skills/implement/SKILL.md holds "every suite whole that the capabilities allow before step 9", and no longer holds "the widest suite the time allows"', () => {
  const t = item('skills/implement/SKILL.md', 6)
  holds('item 6 of skills/implement/SKILL.md', t, ['every suite whole that the capabilities allow before step 9'])
  lacks('item 6 of skills/implement/SKILL.md', t, ['the widest suite the time allows'])
  lacks('skills/implement/SKILL.md', raw('skills/implement/SKILL.md'), ['the widest suite the time allows'])
})

test('20: skills/implement/tdd.md holds "as wide as the capabilities allow", and no longer holds "as wide as the time allows"', () => {
  const t = raw('skills/implement/tdd.md')
  holds('skills/implement/tdd.md', t, ['as wide as the capabilities allow'])
  lacks('skills/implement/tdd.md', t, ['as wide as the time allows'])
})

// ---------- behaviour 22: five hooks ----------

const paragraphs = (file: string) => raw(file).split(/\n\s*\n/).map((p) => flat(p.trim()))
function status(): string {
  const found = paragraphs('README.md').filter((p) => p.startsWith('**Status:'))
  expect(`README.md: paragraphs that start with "**Status:": ${found.length}`).toBe('README.md: paragraphs that start with "**Status:": 1')
  return found[0] ?? ''
}

test('22: the README\'s status paragraph holds "Five hooks" and no longer "Four hooks"; its paragraph on a machine where bun is not on the PATH holds "five hooks" and no longer "four hooks"', () => {
  const s = status()
  holds('the status paragraph', s, ['Five hooks'])
  lacks('the status paragraph', s, ['Four hooks'])
  const found = paragraphs('README.md').filter((p) => p.includes('`bun` is not on the `PATH`'))
  expect(`README.md: paragraphs on bun not on the PATH: ${found.length}`).toBe('README.md: paragraphs on bun not on the PATH: 1')
  holds('the paragraph on bun and the PATH', found[0] ?? '', ['five hooks'])
  lacks('the paragraph on bun and the PATH', found[0] ?? '', ['four hooks'])
})

test('22: the row of hooks/ in the README\'s table of paths names SessionEnd', () => {
  const row = raw('README.md').split('\n').find((l) => l.startsWith('| `hooks/` |')) ?? ''
  expect(`README.md has a row of hooks/: ${row !== ''}`).toBe('README.md has a row of hooks/: true')
  holds('the row of hooks/', row, ['SessionEnd'])
})

test('22: CLAUDE.md\'s part on the hooks names the end hook and says that a cleared session keeps its run', () => {
  const t = raw('CLAUDE.md'), i = t.indexOf('\n## Hooks of `hstack:build`\n')
  expect(`CLAUDE.md has the part "## Hooks of \`hstack:build\`": ${i >= 0}`).toBe('CLAUDE.md has the part "## Hooks of `hstack:build`": true')
  const rest = t.slice(i + 1), j = rest.indexOf('\n## ', 1)
  const sec = j < 0 ? rest : rest.slice(0, j)
  // the words are the builder's: the end hook is named by its event or as the hook run when a session ends
  says("CLAUDE.md's part on the hooks", sec, 'the end hook', /SessionEnd|\bend hook\b|when (a|the) session ends|session ends/i)
  // one sentence (or list item) speaks of a clear and of the session keeping its run
  const sentences = flat(sec).split(/(?<=\.)\s|\s-\s/)
  const keeps = sentences.some((x) => /clear/i.test(x) && /\bkeeps?\b[^.]{0,80}\brun\b|\brun\b[^.]{0,80}\b(is kept|stays with|goes with)\b/i.test(x))
  expect(`CLAUDE.md's part on the hooks says that a cleared session keeps its run: ${keeps}`).toBe("CLAUDE.md's part on the hooks says that a cleared session keeps its run: true")
})

// ---------- behaviour 23: the version stays 0.4.8 ----------

test('23 (guard: the base already has it): .claude-plugin/plugin.json still holds "version": "0.4.8", and the README\'s status paragraph still starts with **Status: v0.4.8.**', () => {
  holds('.claude-plugin/plugin.json', raw('.claude-plugin/plugin.json'), ['"version": "0.4.8"'])
  expect(`the status paragraph starts with "**Status: v0.4.8.**": ${status().startsWith('**Status: v0.4.8.**')}`).toBe('the status paragraph starts with "**Status: v0.4.8.**": true')
})
