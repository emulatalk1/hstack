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

export const caught = (cases, excluded) =>
  cases.some((c) => c.status === 'fail' && !excluded.some((t) => c.name.includes(t)))
