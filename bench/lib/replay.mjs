// Which tests did a fix add or change, and does a failing case count as a catch. Pure; the CLI feeds it git output.
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

// A title becomes a pattern: printf tokens (%s, %d ...) and template holes ($name, ${expr}) match any text, the rest is literal.
// It must end the case name and start it or follow a separator, so `trims` does not hide `trims the name of a place`.
const HOLE = /%[sdifjoOpc#%]|\$[A-Za-z_]\w*(?:\.\w+)*|\$\{[^}]*\}/g
const titlePattern = (t) => {
  let re = '', last = 0
  for (const m of t.matchAll(HOLE)) { re += esc(t.slice(last, m.index)) + '[\\s\\S]*'; last = m.index + m[0].length }
  return new RegExp(`(?:^|[>›]\\s*)${re}${esc(t.slice(last))}$`)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function caught(cases, excluded) {
  const pats = excluded.map(titlePattern)
  return cases.some((c) => c.status === 'fail' && !pats.some((re) => re.test(c.name.trim())))
}
