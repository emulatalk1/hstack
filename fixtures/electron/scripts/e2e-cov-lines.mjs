// Prints the src/ lines one e2e test covered, per process, from the V8 coverage in <dir>.
// <dir>/main: NODE_V8_COVERAGE output of the Electron main process.
// <dir>/window.json: page.coverage.stopJSCoverage() of the window (preload + renderer).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, relative } from 'node:path'
import { TraceMap, eachMapping } from '@jridgewell/trace-mapping'

const dir = process.argv[2]
const out = resolve('out')
const entries = []
for (const f of readdirSync(`${dir}/main`)) entries.push(...JSON.parse(readFileSync(`${dir}/main/${f}`, 'utf8')).result)
if (existsSync(`${dir}/window.json`)) entries.push(...JSON.parse(readFileSync(`${dir}/window.json`, 'utf8')))

const lines = {} // source file -> Set of covered lines
for (const e of entries) {
  const file = e.url.startsWith('file:') ? fileURLToPath(e.url) : e.url
  if (!file.startsWith(out) || !existsSync(`${file}.map`)) continue
  const code = readFileSync(file, 'utf8')
  const shift = e.source ? e.source.indexOf(code) : 0 // Electron may wrap the preload
  const ranges = e.functions.flatMap((fn) => fn.ranges)
  const count = (off) => {
    let best = null // innermost range wins
    for (const r of ranges)
      if (r.startOffset <= off && off < r.endOffset && (!best || r.endOffset - r.startOffset < best.endOffset - best.startOffset)) best = r
    return best ? best.count : 0
  }
  const lineStart = [0]
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStart.push(i + 1)
  const map = new TraceMap(readFileSync(`${file}.map`, 'utf8'), `${file}.map`)
  eachMapping(map, (m) => {
    if (!m.source || m.source.includes('node_modules') || m.originalLine == null) return
    const src = relative(process.cwd(), m.source.startsWith('file:') ? fileURLToPath(m.source) : m.source)
    if (!src.startsWith('src/') || count(shift + lineStart[m.generatedLine - 1] + m.generatedColumn) === 0) return
    ;(lines[`${src} [${relative(out, file).split('/')[0]}]`] ??= new Set()).add(m.originalLine)
  })
}
for (const [k, v] of Object.entries(lines).sort()) console.log(k, [...v].sort((a, b) => a - b).join(','))
