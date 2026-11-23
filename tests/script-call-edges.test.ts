// The builder's tests of spec 3: the edges of `docs/specs/2026-11-22-script-call-and-dir-rule.decisions.md`.
// Run: bun test tests/script-call-edges.test.ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const flat = (s: string) => s.replace(/\s+/g, ' ')

test('E1: the playbook\'s paragraph on H goes on, after the sentence on calling the script, with the two sentences it had', () => {
  const found = raw('skills/build/SKILL.md').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.startsWith('`H` below is'))
  expect(found.length).toBe(1)
  const p = flat(found[0])
  const call = p.lastIndexOf('hstack.ts" "$@"; }`)'), rest = 'Shell variables do not survive between Bash calls, so write the absolute paths of the script and of `S` into each command. Pass both to every agent you start.'
  expect(call).toBeGreaterThan(0)
  expect(p.endsWith(rest)).toBe(true)
  expect(p.indexOf(rest)).toBeGreaterThan(call)
})

// the points of the section "## In hstack" of the brainstorm skill: its lines that start with "- "
function points(): string[] {
  const text = raw('skills/brainstorm/SKILL.md'), from = text.indexOf('\n## In hstack\n')
  expect(from).toBeGreaterThan(0)
  const rest = text.slice(from + 1), end = rest.indexOf('\n## ', 1)
  return (end < 0 ? rest : rest.slice(0, end)).split('\n').filter((l) => l.startsWith('- ')).map(flat)
}

test('E2: the fourth point of In hstack holds the spec\'s words in the spec\'s order, and keeps its sentence on the spike and the mock-ups', () => {
  expect(points()[3]).toBe('- **Nothing in the repository changes before the spec is approved but the spec file itself,** and until the playbook\'s `start` no command of the loop\'s script runs but `dir`: before `start` the script itself refuses `spec`, `phase` and `approve`, and the loop\'s stop hook holds a turn that ends after `start` with no spec shown. From `start` on, the playbook says which command runs (`spec <file>` before a question to your human partner). A spike is built outside the repository, and mock-ups live in the loop\'s state folder.')
})

test('E3: the section In hstack keeps its five points, in their order', () => {
  expect(points().map((l) => /^- \*\*(.*?)\*\*/.exec(l)?.[1])).toEqual([
    'The written design of this skill is the spec of the build loop.',
    'Your first message always comes,',
    'Only what was discussed and agreed is written.',
    'Nothing in the repository changes before the spec is approved but the spec file itself,',
    'Looking includes the project\'s records:',
  ])
})

test('E14: the type-check reads the two test files of this spec', () => {
  const include = JSON.parse(raw('tsconfig.json')).include as string[]
  for (const f of ['tests/script-call-and-dir-rule.test.ts', 'tests/script-call-edges.test.ts']) expect(`tsconfig.json includes ${f}: ${include.includes(f)}`).toBe(`tsconfig.json includes ${f}: true`)
})

// the two sentences on calling the script, as the spec quotes them (section 2, "The words"), word for word
const CALL = 'In a command, write both words out (`bun "<the path>/scripts/hstack.ts" <verb>`): a variable that holds `bun <path>` is not split into two words by every shell. A shell function (`H() { bun "<the path>/scripts/hstack.ts" "$@"; }`) also works, but a coding tool may refuse a command that defines one.'

test('E15: the playbook holds the two sentences on calling the script word for word', () => {
  expect(`the playbook holds the two sentences: ${flat(raw('skills/build/SKILL.md')).includes(CALL)}`).toBe('the playbook holds the two sentences: true')
})

test('E15: the feedback skill holds the two sentences on calling the script word for word, and its paragraph on H ends with them', () => {
  const found = raw('skills/hstack-feedback/SKILL.md').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.startsWith('`H` below is'))
  expect(found.length).toBe(1)
  expect(`the paragraph ends with the two sentences: ${flat(found[0]).endsWith(CALL)}`).toBe('the paragraph ends with the two sentences: true')
})
