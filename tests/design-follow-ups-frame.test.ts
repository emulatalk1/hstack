// Acceptance tests of spec 7 ("three follow-ups of spec 6: a split may keep the old import path, one passage grades
// every finding, and a mock-up input is readable in the dark scheme"), written from the spec alone: its behaviours
// 1 to 3, the mock-up frame. Behaviours 4 to 11, the texts, are in tests/design-follow-ups-texts.test.ts.
// Run: bun test tests/design-follow-ups-frame.test.ts
// Each test names the behaviour of the spec it checks by its number. The tests of the served frame start the mock-up
// server on a free local port, end it, and remove their folders. No test opens a browser: the colour a browser
// computes (behaviour 2) is read here from the style sheet of the served frame, and is left to a hand check beyond that.
import { afterAll, afterEach, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const ROOT = join(import.meta.dir, '..')
const FRAME = 'scripts/mockup-frame.html'
const SCRIPT = process.env.HSTACK_MOCKUP_SCRIPT ?? join(ROOT, 'scripts/mockup.ts') // HSTACK_MOCKUP_SCRIPT runs another copy of the script
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-follow-ups-test-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
process.on('exit', wipe)

const yes = (what: string, ok: boolean) => expect(`${what}: ${ok}`).toBe(`${what}: true`) // a failure names what was looked for

// ---------- a style sheet, read as far as these behaviours need ----------

type Rule = { media: string[]; selectors: string[]; body: string }
// the rules of a style sheet in their order, each with the at-rules it stands in
function rulesOf(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ''), out: Rule[] = [], media: string[] = []
  let prelude = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '}') { media.pop(); prelude = '' }
    else if (c === ';') prelude = ''
    else if (c !== '{') prelude += c
    else if (prelude.trim().startsWith('@')) { media.push(prelude.trim().replace(/\s+/g, ' ')); prelude = '' }
    else {
      const end = text.indexOf('}', i)
      out.push({ media: [...media], selectors: prelude.split(',').map((s) => s.trim()), body: text.slice(i + 1, end < 0 ? text.length : end) })
      prelude = ''; i = end < 0 ? text.length : end
    }
  }
  return out
}
// the declarations of a rule, as [property, value], a run of white space as one space
const declarations = (r: Rule): [string, string][] =>
  r.body.split(';').map((d) => d.trim()).filter((d) => d.includes(':')).map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim().replace(/\s+/g, ' ')] as [string, string])
const isDark = (r: Rule) => r.media.some((m) => /prefers-color-scheme\s*:\s*dark/.test(m))
// the rules that count in a colour scheme: those in no at-rule, and for the dark scheme those of `prefers-color-scheme: dark` too
const inScheme = (rules: Rule[], scheme: 'light' | 'dark') => rules.filter((r) => r.media.length === 0 || (scheme === 'dark' && r.media.length === 1 && isDark(r)))
// the last value a property gets from the rules of one selector, in one scheme
const valueOf = (rules: Rule[], scheme: 'light' | 'dark', selector: string, property: string): string | undefined =>
  inScheme(rules, scheme).filter((r) => r.selectors.includes(selector)).flatMap(declarations).filter(([p]) => p === property).map(([, v]) => v).pop()
// a colour as a browser prints it: `rgb(r, g, b)`, from `#rrggbb`, `#rgb` or `rgb(…)`
function rgb(value: string | undefined): string {
  const v = (value ?? '').trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (hex) { const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join('') : hex[1]; return `rgb(${[0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)).join(', ')})` }
  const f = /^rgb\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*\)$/.exec(v)
  return f ? `rgb(${f[1]}, ${f[2]}, ${f[3]})` : `not a colour this test reads: "${value}"`
}
// the colour of the text of an element of the class `mock-input` in one scheme, by the sheet: the `color` of the rule of
// `.mock-input`, and when that is `var(--name)`, the value `:root` gives the name in that scheme
function inputColour(rules: Rule[], scheme: 'light' | 'dark'): string {
  const colour = valueOf(rules, scheme, '.mock-input', 'color')
  if (colour === undefined) return 'the rule of .mock-input sets no color'
  const name = /^var\(\s*(--[\w-]+)\s*\)$/.exec(colour)
  return rgb(name ? valueOf(rules, scheme, ':root', name[1]) : colour)
}
const styleSheets = (html: string) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')

// ---------- the mock-up server, as tests/mockup.test.ts starts it ----------

// a clean environment: nothing of a caller's server settings reaches the servers of these tests
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith('BRAINSTORM_') && k !== 'CODEX_CI' && k !== 'CLAUDE_PROJECT_DIR') CLEAN[k] = v
// a server a test forgot would end by itself after a minute
const SAFE = { BRAINSTORM_IDLE_TIMEOUT_MS: '60000', BRAINSTORM_LIFECYCLE_CHECK_MS: '200' }
const KEY = 'test-key-0123456789abcdef'

type Json = Record<string, any>
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const readOr = (p: string) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
const jsonLines = (text: string): Json[] => text.split('\n').flatMap((l) => { try { const v = JSON.parse(l); return v && typeof v === 'object' ? [v as Json] : [] } catch { return [] } })
let n = 0
const fresh = (name: string) => `${T}/${name}-${++n}`

const cleanups: (() => void | Promise<void>)[] = []
afterAll(wipe) // after the last cleanup: the folders of every test go
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { try { await c() } catch { /* a cleanup never fails a test */ } } })

// `serve` run directly on a session folder of the test, with its screens; the server is ended when the test ends
async function serve(screens: Record<string, string>): Promise<{ base: string }> {
  const dir = fresh('session'), o = fresh('out'), e = fresh('err')
  mkdirSync(`${dir}/content`, { recursive: true }); mkdirSync(`${dir}/state`, { recursive: true })
  for (const [f, text] of Object.entries(screens)) writeFileSync(`${dir}/content/${f}`, text)
  const proc = Bun.spawn([BUN, SCRIPT, 'serve'], { cwd: T, env: { ...CLEAN, ...SAFE, BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY }, stdin: 'ignore', stdout: Bun.file(o), stderr: Bun.file(e) })
  cleanups.push(async () => { if (proc.exitCode === null) { proc.kill('SIGKILL'); await proc.exited } })
  const started = () => jsonLines(readOr(o)).find((l) => l.type === 'server-started')
  const end = Date.now() + 10000
  while (!started() && proc.exitCode === null && Date.now() < end) await sleep(40)
  const info = started()
  if (!info) throw new Error(`serve gave no server-started line (exit ${proc.exitCode}): ${(readOr(o) + '\n' + readOr(e)).slice(0, 600)}`)
  return { base: `http://127.0.0.1:${info.port}` }
}
const get = (base: string, path: string, headers: Record<string, string> = {}) => fetch(`${base}${path}`, { headers, redirect: 'manual' })
// the cookie the server sets for the right key, as `name=value`
async function cookieOf(base: string) {
  const r = await get(base, `/?key=${encodeURIComponent(KEY)}`)
  const set = r.headers.get('set-cookie') ?? ''
  await r.text()
  return set.split(';')[0].trim()
}
const page = async (base: string, path: string, cookie: string) => { const r = await get(base, path, { Cookie: cookie }); return { status: r.status, text: await r.text() } }
// the frame the server serves around a screen, and every style sheet it brings: its own and those it links on this server
async function servedFrame(screen: string) {
  const s = await serve({ 'screen.html': screen })
  const cookie = await cookieOf(s.base)
  const p = await page(s.base, '/', cookie)
  let linked = ''
  for (const m of p.text.matchAll(/<link\b[^>]*\bhref\s*=\s*["']?(\/[^"'\s>]*)/gi)) linked += '\n' + (await page(s.base, m[1], cookie)).text
  return { status: p.status, html: p.text, css: styleSheets(p.text) + linked, all: p.text + linked }
}

// ---------- the mock-up frame ----------

test('1: in scripts/mockup-frame.html, the rule of ".mock-input" holds the declaration "color: var(--text-primary)"', () => {
  const rules = rulesOf(styleSheets(readFileSync(join(ROOT, FRAME), 'utf8'))).filter((r) => r.selectors.includes('.mock-input'))
  yes(`${FRAME} has a rule of ".mock-input"`, rules.length > 0)
  // a declaration of its own: the property is `color`, not `border-color` or `background-color`
  yes(`in ${FRAME}, the rule of ".mock-input" holds the declaration "color: var(--text-primary)"`, rules.some((r) => declarations(r).some(([p, v]) => p === 'color' && v === 'var(--text-primary)')))
  // word for word, as the spec writes it
  yes(`in ${FRAME}, the rule of ".mock-input" holds "color: var(--text-primary)" word for word`, rules.some((r) => /(^|[;\s])color: var\(--text-primary\)\s*(;|$)/.test(r.body.trim())))
})

const INPUT = '<input class="mock-input" value="a typed value">'

test('2: in the frame the server serves, by its style sheet, an element of the class "mock-input" with a typed value has the colour rgb(245, 245, 247) in the dark colour scheme and rgb(29, 29, 31) in the light one (what a browser computes is left to a hand check)', async () => {
  const f = await servedFrame(INPUT)
  expect(f.status).toBe(200)
  yes('the served frame holds the element of the class "mock-input" with its typed value', f.html.includes(INPUT))
  const rules = rulesOf(f.css)
  expect(`dark: ${inputColour(rules, 'dark')}`).toBe('dark: rgb(245, 245, 247)')
  expect(`light: ${inputColour(rules, 'light')}`).toBe('light: rgb(29, 29, 31)')
})

// the sixteen classes of step S1-F1-S38 (progress/feature_list.json; docs/specs/2026-11-21-mockup-server.md, behaviour 38)
const CLASSES = ['options', 'option', 'cards', 'card', 'mockup', 'split', 'pros-cons', 'mock-nav', 'mock-sidebar', 'mock-content', 'mock-button', 'mock-input', 'placeholder', 'subtitle', 'section', 'label']

test('3 (holds at the base, and must stay): the frame still has the sixteen classes of step S1-F1-S38', async () => {
  const f = await servedFrame('<p>a fragment</p>')
  expect(f.status).toBe(200)
  expect(f.html).toContain('<p>a fragment</p>')
  expect(CLASSES.length).toBe(16)
  for (const c of CLASSES) yes(`the served frame has the class "${c}"`, new RegExp(`\\.${c}(?![\\w-])`).test(f.all))
})
