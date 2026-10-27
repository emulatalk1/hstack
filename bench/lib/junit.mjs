// shortcut: regex reader for the testcase subset of JUnit, not a full XML parser; replace if a runner emits CDATA names.
const ATTRS = '((?:"[^"]*"|[^>"])*?)'
const CASE = new RegExp(`<testcase\\b${ATTRS}(?:/>|>([\\s\\S]*?)</testcase>)`, 'g')
const FAIL = new RegExp(`<(?:failure|error)\\b${ATTRS}(?:/>|>([\\s\\S]*?)</(?:failure|error)>)`)

const codePoint = (cp, raw) => (cp <= 0x10ffff ? String.fromCodePoint(cp) : raw) // out-of-range entity stays as written

// Playwright writes element text as CDATA: take it raw, undecoded.
const text = (s) => {
  const cdata = [...s.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
  return cdata.length ? cdata.map((m) => m[1]).join('') : decode(s)
}

const decode = (s) =>
  s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi, (_, d, h, n) =>
    n ? { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n.toLowerCase()]
      : codePoint(d ? +d : parseInt(h, 16), _))

const attr = (attrs, key) => {
  const m = new RegExp(`(?:^|\\s)${key}="([^"]*)"`).exec(attrs)
  return m ? decode(m[1]) : ''
}

export function readJunit(xml) {
  return [...xml.matchAll(CASE)].map(([, attrs, body = '']) => {
    const name = attr(attrs, 'name')
    // their text may contain look-alike tags; a self-closing one has no text and must not swallow a later <failure>
    body = body.replace(/<system-(?:out|err)\b(?:[^>]*\/>|[\s\S]*?<\/system-(?:out|err)>)/g, '')
    const f = FAIL.exec(body)
    if (f) {
      // Playwright puts "file:line title" in the attribute and the real error in the text.
      const message = [attr(f[1], 'message'), text(f[2] ?? '')].map((s) => s.trim()).filter(Boolean).join('\n')
      return { name, status: 'fail', message }
    }
    return { name, status: /<skipped\b/.test(body) ? 'skip' : 'pass', message: '' }
  })
}

export function checkId(name) {
  const m = /^[0-9a-f]{7}-T\d+|^[A-Za-z0-9_.-]+-T\d+/.exec(name)
  return m ? m[0] : null
}
