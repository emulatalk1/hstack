#!/usr/bin/env bun
// Fails when a task input holds code, a test, or a pointer into the source or test tree.
// Usage: bun bench/input-check.mjs <input.md>   (exit 0 clean, 1 hits, 2 usage)
// shortcut: pattern list, not a parser; widen it when a new task shows a leak it misses.
export const RULES = [
  ['code fence', /^\s*(```|~~~)/],
  ['indented code', /^( {4}|\t)\S/],
  ['test or source path', /(^|[\s`'"(])(src|tests?|e2e|spec|__tests__|scripts)\/\S*/],
  ['source file name', /\b[\w.-]+\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|php|cs|sql|scss|css|vue|svelte)\b/],
  ['test file name', /\.(spec|test|e2e)\b/i],
  ['test call', /\b(it|test|describe|expect|assert)\s*\(/],
  ['test title pointer', /—\s*`[^`]+`\s*'[^']+'/],
  ['code syntax', /(=>|\bimport\s+[\w{*]|\brequire\(|\bconst\s+\w+\s*=|\bfunction\s+\w+\s*\(|;\s*$)/],
]

export function check(text) {
  const hits = []
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of RULES) if (re.test(line)) hits.push({ line: i + 1, rule: name, text: line.trim().slice(0, 160) })
  })
  return hits
}

if (import.meta.main) {
  const path = Bun.argv[2]
  if (!path) { console.error('usage: input-check.mjs <input.md>'); process.exit(2) }
  const hits = check(await Bun.file(path).text())
  for (const h of hits) console.log(`${path}:${h.line}: ${h.rule}: ${h.text}`)
  console.log(hits.length ? `FAIL ${hits.length} hits` : 'PASS no code, test or source pointer')
  process.exit(hits.length ? 1 : 0)
}
