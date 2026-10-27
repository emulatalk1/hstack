// Which tests were added or changed from a fix on, and does a failing case count as a catch. Pure; the CLI feeds it git output.
export const isTestPath = (p) => /(^|\/)(tests?|__tests__|spec)\//.test(p) || /\.(spec|test)\./.test(p)

export function excludedTitles(diff, postFix, testTitle) {
  const re = new RegExp(testTitle), out = []
  let path = null, oldLeft = 0, newLeft = 0, newLine = 0
  for (const line of diff.split('\n')) {
    if (oldLeft > 0 || newLeft > 0) { // inside a hunk the counts say what a line is, so `+++ x` added text is not a header
      const c = line[0]
      if (c === '\\') continue
      if (c !== '+') oldLeft--
      if (c !== '-') newLeft--
      if (c === '+' && path && isTestPath(path)) {
        const m = re.exec(line.slice(1))
        let title = m && (m[1] ?? m[0])
        if (!m) { // an assertion added inside an old test: take the nearest title at or above this line
          const post = (postFix.get(path) ?? '').split('\n')
          title = tableRowTitle(post, newLine - 1, re)
          for (let i = Math.min(newLine, post.length) - 1; i >= 0 && !title; i--) title = re.exec(post[i])?.[1]
        }
        if (title && !out.includes(title)) out.push(title)
      }
      if (c !== '-') newLine++
      continue
    }
    const h = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (h) { oldLeft = +(h[1] ?? 1); newLeft = +(h[3] ?? 1); newLine = +h[2]; continue }
    if (line.startsWith('+++ ')) path = line === '+++ /dev/null' ? null : line.slice(4).replace(/\t.*$/, '').replace(/^b\//, '')
  }
  return out
}

// A line inside a multi-line table test (`each([` rows, then `])('title %s', ...)`), whose title follows the table: the
// formatted name of its row (the row's first string in the first printf hole), or the title for a line after the rows.
// shortcut: reads the common JS table shape by indentation; a row whose first cell is not a string, or a `$name` title,
// excludes the whole table (every row, also the old ones); parse the table if such a fix test comes up.
const OPEN = /^\s*(?:it|test)\.each\b/, CLOSE = /^\s*\]\)\(\s*(['"`])(.+?)\1/, FIRST = /^\[?\s*(['"`])((?:\\.|(?!\1).)*)\1/
const indent = (s) => /^\s*/.exec(s)[0].length
function tableRowTitle(post, i, re) {
  let open = -1
  for (let j = Math.min(i, post.length - 1); j >= 0; j--) {
    if (re.test(post[j])) return null // a test with its title on its line comes first
    if (OPEN.test(post[j])) { open = j; break }
  }
  if (open < 0) return null
  const close = post.findIndex((l, j) => j > open && CLOSE.test(l))
  if (close < 0) return null
  const template = CLOSE.exec(post[close])[2]
  if (i >= close) return template // the title or the body of the table test
  const first = post.slice(open + 1, close).find((l) => l.trim())
  const rowIndent = first === undefined ? -1 : indent(first)
  // the row starts at the nearest line at the row indent that is not a closing bracket (a row's own `],` has that indent)
  let start = i
  while (start > open && !(post[start].trim() && !/^[\]})]/.test(post[start].trim()) && indent(post[start]) === rowIndent)) start--
  // the row's first cell: a string on its first line after the `[`, or the next line when that line is a bare `[`
  const head = start > open && (post[start].trim() === '[' ? post.slice(start + 1, close).find((l) => l.trim()) ?? '' : post[start]).trim()
  const cell = head && FIRST.exec(head)
  const hole = /%[sdifjoOpc]/.exec(template)
  if (!cell || !hole || /\$[A-Za-z_{]/.test(template)) return template
  return template.slice(0, hole.index) + cell[2] + template.slice(hole.index + 2)
}

// a title of holes only (`%s`, `${x}`) would match every case name, so it excludes nothing; replay reports it in dev mode
export const isExcluded = (name, excluded) => excluded.some((t) => !holeOnly(t) && titlePattern(t).test(name.trim()))

// A title becomes a pattern: printf tokens (%s, %d ...) and template holes ($name, ${expr}) match any text, the rest is literal.
// It must end the case name and start it or follow a separator, so `trims` does not hide `trims the name of a place`.
const HOLE = /%[sdifjoOpc#%]|\$[A-Za-z_]\w*(?:\.\w+)*|\$\{[^}]*\}/g
const titlePattern = (t) => {
  let re = '', last = 0
  for (const m of t.matchAll(HOLE)) { re += esc(t.slice(last, m.index)) + '[\\s\\S]*'; last = m.index + m[0].length }
  return new RegExp(`(?:^|[>›]\\s*)${re}${esc(t.slice(last))}$`)
}
export const holeOnly = (t) => !t.replace(HOLE, '').trim()
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const failingNames = (cases) => new Set(cases.filter((c) => c.status === 'fail').map((c) => c.name.trim()))
// why a failing case is no catch: 'excluded' (a test added or changed from the fix on), 'baseline' (it fails without the bug too), or null
export const notCounted = (name, excluded, baseFails) => (isExcluded(name, excluded) ? 'excluded' : baseFails.has(name.trim()) ? 'baseline' : null)
export const caught = (cases, excluded, baseline = []) => {
  const b = failingNames(baseline)
  return cases.some((c) => c.status === 'fail' && !notCounted(c.name, excluded, b))
}
