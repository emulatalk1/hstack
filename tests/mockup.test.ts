// Acceptance tests of scripts/mockup.ts, the mock-up server of a brainstorm, written from the spec alone
// (docs/specs, "Spec 1: the mock-up server of the brainstorm, in TypeScript on Bun"). Run: bun test tests/mockup.test.ts
// Each test names the behaviour of the spec it checks by its number. Every test is its own story: it starts the
// servers it needs on a free local port, ends them, and removes its folders. No test opens a browser or listens on
// another address than this machine's own.
import { afterAll, afterEach, expect, setDefaultTimeout, test } from 'bun:test'
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

setDefaultTimeout(60000)
const ROOT = join(import.meta.dir, '..')
const SCRIPT = process.env.HSTACK_MOCKUP_SCRIPT ?? join(ROOT, 'scripts/mockup.ts') // HSTACK_MOCKUP_SCRIPT runs another copy of the script
const HSTACK = join(ROOT, 'scripts/hstack.ts')
const BUN = process.execPath
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-mockup-test-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
process.on('exit', wipe)

// a clean environment: nothing of a caller's server settings reaches the servers of these tests
const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith('BRAINSTORM_') && k !== 'CODEX_CI' && k !== 'CLAUDE_PROJECT_DIR') CLEAN[k] = v
// a server a test forgot would end by itself after a minute
const SAFE = { BRAINSTORM_IDLE_TIMEOUT_MS: '60000', BRAINSTORM_LIFECYCLE_CHECK_MS: '200' }
const KEY = 'test-key-0123456789abcdef'

type Json = Record<string, any>
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const read = (p: string) => readFileSync(p, 'utf8')
const readOr = (p: string) => { try { return read(p) } catch { return '' } }
const jsonLines = (text: string): Json[] => text.split('\n').flatMap((l) => { try { const v = JSON.parse(l); return v && typeof v === 'object' ? [v as Json] : [] } catch { return [] } })
const alive = (pid: number) => { try { process.kill(pid, 0); return true } catch { return false } }
const mode = (p: string) => statSync(p).mode & 0o777
let n = 0
const fresh = (name: string) => `${T}/${name}-${++n}`
async function until<V>(fn: () => V | Promise<V>, ms = 6000, stop: () => boolean = () => false): Promise<V | undefined> {
  const end = Date.now() + ms
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end || stop()) return (await fn()) || undefined; await sleep(40) }
}

const cleanups: (() => void | Promise<void>)[] = []
afterAll(wipe) // after the last cleanup: the folders of every test go
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { try { await c() } catch { /* a cleanup never fails a test */ } } })

// one run of the command; its output goes to files, so that a server that keeps a pipe open cannot hold the test
type Proc = { proc: ReturnType<typeof Bun.spawn>; out: () => string; err: () => string; all: () => string }
function spawn(args: string[], env: Record<string, string> = {}, cwd = T): Proc {
  const o = fresh('out'), e = fresh('err')
  const all: Record<string, string> = { ...CLEAN, ...SAFE, ...env }
  for (const k of Object.keys(all)) if (all[k] === '') delete all[k] // an empty value here means: not set
  const proc = Bun.spawn([BUN, SCRIPT, ...args], { cwd, env: all, stdin: 'ignore', stdout: Bun.file(o), stderr: Bun.file(e) })
  cleanups.push(async () => { if (proc.exitCode === null) { proc.kill('SIGKILL'); await proc.exited } })
  return { proc, out: () => readOr(o), err: () => readOr(e), all: () => readOr(o) + '\n' + readOr(e) }
}
const exited = async (p: Proc, ms = 15000) => (await Promise.race([p.proc.exited.then(() => true), sleep(ms).then(() => false)]))
async function run(args: string[], env: Record<string, string> = {}, cwd = T) {
  const p = spawn(args, env, cwd)
  const done = await exited(p)
  if (!done) { p.proc.kill('SIGKILL'); await p.proc.exited }
  return { code: done ? p.proc.exitCode : null, out: p.out(), err: p.err(), all: p.all(), lines: jsonLines(p.all()) }
}
const started = (text: string) => jsonLines(text).find((l) => l.type === 'server-started')
const keyOf = (info: Json) => new URL(info.url).searchParams.get('key') as string

// `start` in the background; the session is stopped and removed when the test ends
function guard(info: Json) {
  const session = dirname(info.state_dir as string)
  cleanups.push(async () => {
    const pid = Number(readOr(`${info.state_dir}/server.pid`).trim())
    if (existsSync(`${info.state_dir}/server.pid`)) await run(['stop', session])
    if (pid > 1 && alive(pid)) { await sleep(300); if (alive(pid)) process.kill(pid, 'SIGKILL') }
    rmSync(session, { recursive: true, force: true })
  })
}
async function start(args: string[] = [], env: Record<string, string> = {}, cwd = T) {
  const r = await run(['start', ...args], env, cwd)
  const info = started(r.out)
  if (info) guard(info)
  if (!info) throw new Error(`start gave no server-started line (exit ${r.code}): ${r.all.slice(0, 600)}`)
  return { r, info, session: dirname(info.state_dir as string), key: keyOf(info), base: `http://127.0.0.1:${info.port}` }
}

// `serve` run directly on a session folder of the test
type Server = Proc & { info: Json; port: number; base: string; dir: string; content: string; state: string; lines: () => Json[] }
async function serve(env: Record<string, string> = {}, screens: Record<string, string> = {}): Promise<Server> {
  const dir = env.BRAINSTORM_DIR ?? fresh('session')
  mkdirSync(`${dir}/content`, { recursive: true }); mkdirSync(`${dir}/state`, { recursive: true })
  for (const [f, text] of Object.entries(screens)) writeFileSync(`${dir}/content/${f}`, text)
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, ...env })
  const info = await until(() => started(p.out()), 10000, () => p.proc.exitCode !== null)
  if (!info) throw new Error(`serve gave no server-started line (exit ${p.proc.exitCode}): ${p.all().slice(0, 600)}`)
  return { ...p, info, port: info.port as number, base: `http://127.0.0.1:${info.port}`, dir, content: `${dir}/content`, state: `${dir}/state`, lines: () => jsonLines(p.all()) }
}
const get = (base: string, path: string, headers: Record<string, string> = {}) => fetch(`${base}${path}`, { headers, redirect: 'manual' })
// the cookie the server sets for the right key, as `name=value`
async function cookieOf(base: string, key = KEY) {
  const r = await get(base, `/?key=${encodeURIComponent(key)}`)
  const set = r.headers.get('set-cookie') ?? ''
  await r.text()
  return set.split(';')[0].trim()
}
const page = async (base: string, path: string, cookie: string) => { const r = await get(base, path, { Cookie: cookie }); return { status: r.status, type: r.headers.get('content-type') ?? '', text: await r.text(), headers: r.headers } }

// a WebSocket of a stand-in browser
type Sock = { opened: boolean; messages: string[]; closed: () => boolean; send: (s: string) => void; close: () => void }
async function socket(s: { base: string; port?: number }, o: { key?: string; cookie?: string; origin?: string | null } = {}): Promise<Sock> {
  const host = s.base.replace('http://', '')
  const headers: Record<string, string> = {}
  if (o.cookie) headers.Cookie = o.cookie
  if (o.origin !== null) headers.Origin = o.origin ?? `http://${host}`
  const ws = new WebSocket(`ws://${host}/${o.key ? `?key=${encodeURIComponent(o.key)}` : ''}`, { headers } as any)
  const messages: string[] = []
  let closed = false
  ws.onmessage = (e) => { messages.push(String(e.data)) }
  const opened = await new Promise<boolean>((res) => {
    ws.onopen = () => res(true); ws.onerror = () => res(false); ws.onclose = () => { closed = true; res(false) }
    setTimeout(() => res(false), 4000)
  })
  cleanups.push(() => { try { ws.close() } catch { /* closed already */ } })
  return { opened, messages, closed: () => closed, send: (m) => ws.send(m), close: () => ws.close() }
}
const reloads = (k: Sock) => k.messages.filter((m) => { try { return JSON.parse(m).type === 'reload' } catch { return false } }).length

const FRAGMENT = '<h2 id="frag">Pick one</h2>\n<div class="options"><div class="option" data-choice="a">A</div></div>\n'
const FULL = '<!DOCTYPE html>\n<html><head><title>my own page</title></head><body><p id="full">a whole page of the agent</p></body></html>\n'
const HEADERS: Record<string, string> = { 'referrer-policy': 'no-referrer', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'", 'cross-origin-resource-policy': 'same-origin' }

// ---------- Start ----------

test('1: start prints one server-started line with its fields, exits 0, and the server goes on running', async () => {
  const D = fresh('dir')
  const { r, info, key, base } = await start(['--dir', D])
  expect(r.code).toBe(0)
  expect(r.out.trim().split('\n').length).toBe(1)
  for (const f of ['port', 'host', 'url_host', 'url', 'screen_dir', 'state_dir', 'idle_timeout_ms']) expect(info).toHaveProperty(f)
  expect(typeof info.port).toBe('number')
  expect((await get(base, `/?key=${key}`)).status).toBe(200) // the command returned and the server answers
})

test('30: idle_timeout_ms is 4 hours when not set', async () => {
  const { info } = await start(['--dir', fresh('dir')], { BRAINSTORM_IDLE_TIMEOUT_MS: '', BRAINSTORM_LIFECYCLE_CHECK_MS: '' })
  expect(info.idle_timeout_ms).toBe(4 * 60 * 60 * 1000)
})

test('2: the url is http://<url_host>:<port>/?key=<key>', async () => {
  const { info, key } = await start(['--dir', fresh('dir')])
  expect(key.length).toBeGreaterThan(0)
  expect(info.url).toBe(`http://${info.url_host}:${info.port}/?key=${key}`)
})

test('2: an IPv6 host of the url is in square brackets', async () => {
  const { info, key } = await start(['--dir', fresh('dir'), '--url-host', '::1'])
  expect(info.url).toBe(`http://[::1]:${info.port}/?key=${key}`)
})

test('3: the same line is in server-info of the state folder, which only its owner can read', async () => {
  const { r, info } = await start(['--dir', fresh('dir')])
  const file = `${info.state_dir}/server-info`
  expect(JSON.parse(read(file))).toEqual(JSON.parse(r.out.trim()))
  expect(read(file).trim().split('\n').length).toBe(1)
  expect(mode(file) & 0o077).toBe(0)
})

test('4: with --dir the session folder is <folder>/<a new id>/ with content and state in it', async () => {
  const D = fresh('dir'); mkdirSync(D)
  const a = await start(['--dir', D]), b = await start(['--dir', D])
  for (const s of [a, b]) {
    expect(dirname(s.session)).toBe(D)
    expect(s.info.screen_dir).toBe(`${s.session}/content`); expect(s.info.state_dir).toBe(`${s.session}/state`)
    expect(statSync(s.info.screen_dir).isDirectory()).toBe(true); expect(statSync(s.info.state_dir).isDirectory()).toBe(true)
  }
  expect(a.session).not.toBe(b.session) // a new id each time
})

test('4: a relative --dir is taken from where the command was called, and is made when it is missing', async () => {
  const cwd = fresh('cwd'); mkdirSync(cwd)
  const { info, session } = await start(['--dir', 'mock/ups'], {}, cwd)
  expect(dirname(session)).toBe(`${cwd}/mock/ups`)
  expect(statSync(info.screen_dir).isDirectory()).toBe(true)
})

test('5: without --dir the session folder is under the system temporary folder', async () => {
  const cwd = fresh('cwd'); mkdirSync(cwd)
  const { info, session } = await start([], {}, cwd)
  expect(realpathSync(session).startsWith(realpathSync(tmpdir()) + sep)).toBe(true)
  expect(realpathSync(session).startsWith(cwd + sep)).toBe(false)
  expect(info.screen_dir).toBe(`${session}/content`); expect(info.state_dir).toBe(`${session}/state`)
})

test('6: the host is 127.0.0.1 and the url host localhost when not given', async () => {
  const { info } = await start(['--dir', fresh('dir')])
  expect(info.host).toBe('127.0.0.1'); expect(info.url_host).toBe('localhost')
  expect(info.url.startsWith(`http://localhost:${info.port}/`)).toBe(true)
})

test('6: --host is the address the server listens on, --url-host the host in the url', async () => {
  const { info, key } = await start(['--dir', fresh('dir'), '--host', '127.0.0.1', '--url-host', 'mockups.test'])
  expect(info.host).toBe('127.0.0.1'); expect(info.url_host).toBe('mockups.test')
  expect(info.url).toBe(`http://mockups.test:${info.port}/?key=${key}`)
  expect((await get(`http://127.0.0.1:${info.port}`, `/?key=${key}`)).status).toBe(200)
})

test('7: --idle-timeout-minutes sets idle_timeout_ms to n minutes', async () => {
  const { info } = await start(['--dir', fresh('dir'), '--idle-timeout-minutes', '7'], { BRAINSTORM_IDLE_TIMEOUT_MS: '' })
  expect(info.idle_timeout_ms).toBe(7 * 60 * 1000)
})

test('7: anything but a whole number above 0 is refused with an error line and exit 1', async () => {
  expect(existsSync(SCRIPT)).toBe(true)
  for (const bad of ['0', 'abc', '1.5', '-3']) {
    const D = fresh('dir')
    const r = await run(['start', '--dir', D, '--idle-timeout-minutes', bad])
    const info = started(r.out); if (info) guard(info)
    expect(r.lines.map((l) => l.error)).toContain('--idle-timeout-minutes must be a positive integer')
    expect(r.code).toBe(1); expect(info).toBeUndefined()
  }
})

test('8: an argument start does not know is refused with an error line and exit 1', async () => {
  const r = await run(['start', '--dir', fresh('dir'), '--no-such-option'])
  const info = started(r.out); if (info) guard(info)
  expect(r.lines.map((l) => l.error)).toContain('Unknown argument: --no-such-option')
  expect(r.code).toBe(1); expect(info).toBeUndefined()
})

// start in the foreground: the command is still there after the line, server.pid names a live process, and both end at stop
async function foreground(args: string[], env: Record<string, string> = {}) {
  const p = spawn(['start', '--dir', fresh('dir'), ...args], env)
  const info = await until(() => started(p.out()), 10000, () => p.proc.exitCode !== null)
  if (info) guard(info)
  expect(info).toBeDefined()
  await sleep(1200)
  expect(p.proc.exitCode).toBeNull() // start has not returned
  const pid = Number(read(`${info!.state_dir}/server.pid`).trim())
  expect(pid).toBeGreaterThan(1); expect(alive(pid)).toBe(true)
  expect((await get(`http://127.0.0.1:${info!.port}`, `/?key=${keyOf(info!)}`)).status).toBe(200)
  const stop = await run(['stop', dirname(info!.state_dir)])
  expect(stop.lines.map((l) => l.status)).toContain('stopped')
  expect(await exited(p, 6000)).toBe(true) // and returns when the server ends
  expect(await until(() => !alive(pid), 3000)).toBe(true)
}
test('9: with --foreground start does not return until the server ends, and server.pid holds the server process id', async () => { await foreground(['--foreground']) })
test('9: --no-daemon is another name for --foreground', async () => { await foreground(['--no-daemon']) })
test('9: start chooses the foreground by itself when CODEX_CI is set', async () => { await foreground([], { CODEX_CI: '1' }) })
test('9: --background and --daemon keep it in the background when CODEX_CI is set', async () => {
  for (const flag of ['--background', '--daemon']) {
    const { r, info, base, key } = await start(['--dir', fresh('dir'), flag], { CODEX_CI: '1' })
    expect(r.code).toBe(0) // start returned
    expect((await get(base, `/?key=${key}`)).status).toBe(200)
    expect(existsSync(`${info.state_dir}/server-info`)).toBe(true)
  }
})

// ---------- Stop ----------

test('10: stop ends the session server, prints status stopped, removes server-info and writes server-stopped with reason stop', async () => {
  const { info, session, base, key } = await start(['--dir', fresh('dir')])
  expect((await get(base, `/?key=${key}`)).status).toBe(200)
  const pid = Number(readOr(`${info.state_dir}/server.pid`).trim())
  const r = await run(['stop', session])
  expect(r.lines.map((l) => l.status)).toContain('stopped')
  expect(existsSync(`${info.state_dir}/server-info`)).toBe(false)
  expect(read(`${info.state_dir}/server-stopped`)).toMatch(/"reason"\s*:\s*"stop"/)
  expect(await get(base, `/?key=${key}`).then(() => 'answers', () => 'gone')).toBe('gone')
  if (pid > 1) expect(alive(pid)).toBe(false)
})

test('11: after stop a session made without --dir is deleted', async () => {
  const cwd = fresh('cwd'); mkdirSync(cwd)
  const { info, session } = await start([], {}, cwd)
  writeFileSync(`${info.screen_dir}/a.html`, FRAGMENT)
  expect((await run(['stop', session])).lines.map((l) => l.status)).toContain('stopped')
  expect(await until(() => !existsSync(session), 4000)).toBe(true)
})

test('11: after stop a session made with --dir keeps its folder and its screens, under the temporary folder too', async () => {
  const D = fresh('dir') // T, and so D, lies under the system temporary folder
  const { info, session } = await start(['--dir', D])
  writeFileSync(`${info.screen_dir}/a.html`, FRAGMENT)
  expect((await run(['stop', session])).lines.map((l) => l.status)).toContain('stopped')
  await sleep(500)
  expect(read(`${session}/content/a.html`)).toBe(FRAGMENT)
  expect(existsSync(`${session}/state`)).toBe(true)
})

test('12: stop for a session with no server.pid prints status not_running', async () => {
  const s = fresh('session'); mkdirSync(`${s}/state`, { recursive: true }); mkdirSync(`${s}/content`)
  const r = await run(['stop', s])
  expect(r.lines.map((l) => l.status)).toContain('not_running')
})

test('12: stop with no folder prints an error line with its usage and exits 1', async () => {
  const r = await run(['stop'])
  expect(r.lines.some((l) => typeof l.error === 'string')).toBe(true)
  expect(r.all).toMatch(/usage/i); expect(r.all).toContain('stop')
  expect(r.code).toBe(1)
})

for (const [what, id] of [['is missing', null], ['names another server', 'another-server-id']] as const) {
  test(`13: stop does not signal a live process that is not this session's server (server-instance-id ${what})`, async () => {
    const s = fresh('session'); mkdirSync(`${s}/state`, { recursive: true }); mkdirSync(`${s}/content`)
    const other = Bun.spawn(['sleep', '60'], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
    cleanups.push(async () => { other.kill('SIGKILL'); await other.exited })
    writeFileSync(`${s}/state/server.pid`, `${other.pid}\n`)
    if (id) writeFileSync(`${s}/state/server-instance-id`, `${id}\n`)
    const r = await run(['stop', s])
    expect(r.lines.map((l) => l.status)).toContain('stale_pid')
    expect(read(`${s}/state/server-stopped`)).toMatch(/"reason"\s*:\s*"stale_pid"/)
    await sleep(300)
    expect(other.exitCode).toBeNull(); expect(alive(other.pid)).toBe(true)
  })
}

// ---------- What it serves ----------

test('14: with no screen in content, GET / gives the waiting page', async () => {
  const s = await serve()
  const p = await page(s.base, '/', await cookieOf(s.base))
  expect(p.status).toBe(200); expect(p.text).toContain('Waiting for the agent to push a screen...')
})

test('15: GET / gives the newest .html file of content, by time of change', async () => {
  const s = await serve({}, { 'one.html': '<p>screen number one</p>', 'two.html': '<p>screen number two</p>' })
  const cookie = await cookieOf(s.base), now = Date.now() / 1000
  utimesSync(`${s.content}/one.html`, now - 50, now - 50); utimesSync(`${s.content}/two.html`, now - 100, now - 100)
  let p = await page(s.base, '/', cookie)
  expect(p.text).toContain('screen number one'); expect(p.text).not.toContain('screen number two')
  utimesSync(`${s.content}/two.html`, now - 10, now - 10)
  p = await page(s.base, '/', cookie)
  expect(p.text).toContain('screen number two'); expect(p.text).not.toContain('screen number one')
})

test('16: a screen that starts with <!DOCTYPE or <html is served as it is, not inside the frame', async () => {
  for (const full of [FULL, '<html><head><title>mine</title></head><body><p id="full">a whole page of the agent</p></body></html>\n']) {
    const s = await serve({}, { 'full.html': full })
    const p = await page(s.base, '/', await cookieOf(s.base))
    expect(p.status).toBe(200)
    expect(p.text).toContain('<p id="full">a whole page of the agent</p>')
    expect(p.text.trimStart().startsWith(full.slice(0, 5))).toBe(true)
    expect(p.text).not.toContain('hstack brainstorm') // the frame's title is not there
  }
})

test('16: any other screen is a fragment and is served inside the frame, its text unchanged, a $& in it too', async () => {
  const fragment = '<h2 id="frag">Costs $& more: $1, $$, $` and $\' stay</h2>\n<p class="subtitle">second line</p>\n'
  const s = await serve({}, { 'frag.html': fragment })
  const p = await page(s.base, '/', await cookieOf(s.base))
  expect(p.status).toBe(200)
  expect(p.text).toContain(fragment.trim())
  expect(p.text).toContain('<title>hstack brainstorm</title>')
  expect(p.text.split('id="frag"').length).toBe(2) // once
})

test('17: every page served at / carries the browser script and has the content type text/html', async () => {
  for (const screens of [{}, { 'frag.html': FRAGMENT }, { 'full.html': FULL }] as Record<string, string>[]) {
    const s = await serve({}, screens)
    const cookie = await cookieOf(s.base)
    const p = await page(s.base, '/', cookie)
    expect(p.status).toBe(200); expect(p.type.startsWith('text/html')).toBe(true)
    expect(p.text).toMatch(/<script[\s>]/i)
    expect(await scripts(s.base, p.text, cookie)).toContain('toggleSelect')
  }
})
// the text of the scripts of a page: those written in it, and those it loads from this server
async function scripts(base: string, html: string, cookie: string) {
  let text = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n')
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']?(\/[^"'\s>]*)/gi)) text += '\n' + (await page(base, m[1], cookie)).text
  return text
}

test('18: a file that is no .html, a dot file, a symbolic link and a hard link to a file outside are never served as the screen', async () => {
  const s = await serve({}, { 'real.html': '<p>the real screen</p>' })
  const cookie = await cookieOf(s.base), now = Date.now() / 1000
  const outside = fresh('outside'); mkdirSync(outside)
  writeFileSync(`${outside}/secret.html`, '<p>outside by symlink</p>'); writeFileSync(`${outside}/hard.html`, '<p>outside by hard link</p>')
  utimesSync(`${s.content}/real.html`, now - 500, now - 500)
  writeFileSync(`${s.content}/notes.txt`, '<p>no html ending</p>'); writeFileSync(`${s.content}/.hidden.html`, '<p>dot file</p>')
  symlinkSync(`${outside}/secret.html`, `${s.content}/link.html`); linkSync(`${outside}/hard.html`, `${s.content}/hard.html`)
  await sleep(400)
  let p = await page(s.base, '/', cookie)
  expect(p.status).toBe(200); expect(p.text).toContain('the real screen')
  for (const no of ['no html ending', 'dot file', 'outside by symlink', 'outside by hard link']) expect(p.text).not.toContain(no)
  rmSync(`${s.content}/real.html`)
  p = await page(s.base, '/', cookie)
  expect(p.text).toContain('Waiting for the agent to push a screen...')
  for (const no of ['no html ending', 'dot file', 'outside by symlink', 'outside by hard link']) expect(p.text).not.toContain(no)
})

test('19: GET /files/<name> gives that file of content with the content type of its ending', async () => {
  const s = await serve({}, { 'style.css': 'body { color: red }', 'data.json': '{"a":1}', 'pic.png': 'not really a png', 'pic.svg': '<svg></svg>', 'screen.html': '<p>x</p>' })
  const cookie = await cookieOf(s.base)
  for (const [name, type, text] of [['style.css', 'text/css', 'body { color: red }'], ['data.json', 'application/json', '{"a":1}'], ['pic.png', 'image/png', 'not really a png'], ['pic.svg', 'image/svg+xml', '<svg></svg>'], ['screen.html', 'text/html', '<p>x</p>']]) {
    const p = await page(s.base, `/files/${name}`, cookie)
    expect(p.status).toBe(200); expect(p.type.startsWith(type)).toBe(true); expect(p.text).toBe(text)
  }
})

test('19: an empty name, a dot file, a symbolic link, a hard link to a file outside and a missing file give 404, and the server goes on', async () => {
  const s = await serve({}, { 'ok.txt': 'still here', '.secret': 'dot file' })
  const cookie = await cookieOf(s.base)
  const outside = fresh('outside'); mkdirSync(outside)
  writeFileSync(`${outside}/a.txt`, 'outside by symlink'); writeFileSync(`${outside}/b.txt`, 'outside by hard link')
  symlinkSync(`${outside}/a.txt`, `${s.content}/link.txt`); linkSync(`${outside}/b.txt`, `${s.content}/hard.txt`)
  for (const name of ['', '.secret', 'link.txt', 'hard.txt', 'missing.txt']) {
    const p = await page(s.base, `/files/${name}`, cookie)
    expect(`${name}: ${p.status}`).toBe(`${name}: 404`)
    expect(p.text).not.toContain('outside by'); expect(p.text).not.toContain('dot file')
  }
  const p = await page(s.base, '/files/ok.txt', cookie)
  expect(p.status).toBe(200); expect(p.text).toBe('still here'); expect(s.proc.exitCode).toBeNull()
})

test('20: any other path gives 404', async () => {
  const s = await serve({}, { 'a.html': FRAGMENT })
  const cookie = await cookieOf(s.base)
  for (const path of ['/nothing', '/content/a.html', '/a.html', '/state/events', '/filesx']) expect(`${path}: ${(await page(s.base, path, cookie)).status}`).toBe(`${path}: 404`)
})

// ---------- The key ----------

test('21: a request with no key, or with a wrong key in the URL (a right cookie beside it too), gets 403 and the page Session key required', async () => {
  const s = await serve({}, { 'a.html': '<p>the secret screen</p>', 'f.txt': 'the secret file' })
  const cookie = await cookieOf(s.base)
  expect(cookie).toContain('=')
  const cases: [string, Record<string, string>][] = [['/', {}], ['/files/f.txt', {}], ['/nothing', {}], ['/?key=wrong', {}], ['/?key=', {}], ['/?key=wrong', { Cookie: cookie }], ['/files/f.txt?key=wrong', { Cookie: cookie }], ['/', { Cookie: `${cookie.split('=')[0]}=wrong` }]]
  for (const [path, headers] of cases) {
    const r = await get(s.base, path, headers), text = await r.text()
    expect(`${path}: ${r.status}`).toBe(`${path}: 403`)
    expect(text).toContain('Session key required'); expect(text).not.toContain('the secret')
  }
})

test('22: GET /?key=<the right key> gives a page that keeps the key in the session storage and goes to /, and sets the cookie', async () => {
  const s = await serve({}, { 'a.html': '<p>the secret screen</p>' })
  const r = await get(s.base, `/?key=${KEY}`), text = await r.text()
  expect(r.status).toBe(200)
  expect(text).not.toContain('the secret screen') // not the screen
  expect(text).toContain('sessionStorage'); expect(text).toContain('brainstorm-session-key')
  const set = r.headers.get('set-cookie') ?? ''
  expect(set.startsWith(`brainstorm-key-${s.port}=`)).toBe(true)
  const attrs = set.split(';').slice(1).map((a) => a.trim().toLowerCase())
  expect(attrs).toContain('httponly'); expect(attrs).toContain('samesite=strict'); expect(attrs).toContain('path=/')
})

test('23: GET / and GET /files/<name> with that cookie and no key in the URL are served', async () => {
  const s = await serve({}, { 'a.html': '<p>the secret screen</p>', 'f.txt': 'the secret file' })
  const cookie = await cookieOf(s.base)
  expect(cookie.startsWith(`brainstorm-key-${s.port}=`)).toBe(true)
  const a = await page(s.base, '/', cookie), f = await page(s.base, '/files/f.txt', cookie)
  expect(a.status).toBe(200); expect(a.text).toContain('the secret screen')
  expect(f.status).toBe(200); expect(f.text).toBe('the secret file')
})

test('24: every answer (200, 403, 404) carries the five headers', async () => {
  const s = await serve({}, { 'a.html': FRAGMENT, 'f.txt': 'a file' })
  const cookie = await cookieOf(s.base)
  const cases: [string, Record<string, string>, number][] = [['/', { Cookie: cookie }, 200], [`/?key=${KEY}`, {}, 200], ['/files/f.txt', { Cookie: cookie }, 200], ['/', {}, 403], ['/?key=wrong', {}, 403], ['/nothing', { Cookie: cookie }, 404], ['/files/missing.txt', { Cookie: cookie }, 404]]
  for (const [path, headers, status] of cases) {
    const r = await get(s.base, path, headers); await r.text()
    expect(`${path}: ${r.status}`).toBe(`${path}: ${status}`)
    for (const [name, value] of Object.entries(HEADERS)) expect(`${path} ${status} ${name}: ${r.headers.get(name)}`).toBe(`${path} ${status} ${name}: ${value}`)
  }
})

test('25: a WebSocket on / opens with the right key in the URL or the right cookie', async () => {
  const s = await serve()
  expect((await socket(s, { key: KEY })).opened).toBe(true)
  expect((await socket(s, { cookie: await cookieOf(s.base) })).opened).toBe(true)
})

test('25: a WebSocket is refused with neither key nor cookie, with a wrong key, or when its Origin is not http://<the Host header>', async () => {
  const s = await serve()
  const cookie = await cookieOf(s.base)
  expect((await socket(s, { key: KEY })).opened).toBe(true) // the server takes WebSockets at all
  expect((await socket(s, {})).opened).toBe(false)
  expect((await socket(s, { key: 'wrong' })).opened).toBe(false)
  expect((await socket(s, { key: KEY, origin: 'http://evil.test' })).opened).toBe(false)
  expect((await socket(s, { cookie, origin: 'http://evil.test' })).opened).toBe(false)
  expect((await socket(s, { cookie, origin: `http://localhost:${s.port}` })).opened).toBe(false) // the Host header says 127.0.0.1
  expect((await socket(s, { cookie, origin: `https://127.0.0.1:${s.port}` })).opened).toBe(false)
  expect((await get(s.base, '/', { Cookie: cookie })).status).toBe(200)
})

// ---------- Clicks and screens ----------

const events = (s: Server) => readOr(`${s.state}/events`).split('\n').filter((l) => l.trim() !== '')

test('26: a message with a choice is added to events as one line of JSON; a message without choice is not', async () => {
  const s = await serve()
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  k.send(JSON.stringify({ type: 'click', choice: 'a', text: 'Option A', id: 'opt-a', timestamp: 1700000000000 }))
  expect(await until(() => events(s).length === 1)).toBe(true)
  expect(JSON.parse(events(s)[0])).toMatchObject({ type: 'click', choice: 'a', text: 'Option A', id: 'opt-a', timestamp: 1700000000000 })
  k.send(JSON.stringify({ type: 'hello', text: 'no choice here' }))
  k.send(JSON.stringify({ type: 'click', choice: 'b', text: 'Option B' }))
  expect(await until(() => events(s).length >= 2)).toBe(true)
  await sleep(300)
  expect(events(s).map((l) => JSON.parse(l).choice)).toEqual(['a', 'b'])
})

test('26: a message that is no JSON, or is null, changes nothing and the server goes on', async () => {
  const s = await serve()
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  k.send(JSON.stringify({ type: 'click', choice: 'first' }))
  expect(await until(() => events(s).length === 1)).toBe(true)
  k.send('this is no JSON {'); k.send('null')
  await sleep(500)
  expect(s.proc.exitCode).toBeNull(); expect(events(s).length).toBe(1)
  expect((await get(s.base, '/', { Cookie: await cookieOf(s.base) })).status).toBe(200)
  k.send(JSON.stringify({ type: 'click', choice: 'second' })) // the same socket still works
  expect(await until(() => events(s).length === 2)).toBe(true)
  expect(events(s).map((l) => JSON.parse(l).choice)).toEqual(['first', 'second'])
})

test('27: every message from a browser is a line of JSON with source user-event in the server output', async () => {
  const s = await serve()
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  k.send(JSON.stringify({ type: 'click', choice: 'a', text: 'with a choice' }))
  k.send(JSON.stringify({ type: 'note', text: 'without a choice' }))
  const mine = () => s.lines().filter((l) => l.source === 'user-event')
  expect(await until(() => mine().length >= 2)).toBe(true)
  expect(mine().length).toBe(2)
  expect(JSON.stringify(mine()[0])).toContain('with a choice'); expect(JSON.stringify(mine()[1])).toContain('without a choice')
})

test('27: for a server in the background the output is the file server.log of the state folder', async () => {
  const { info, base, key } = await start(['--dir', fresh('dir')])
  const k = await socket({ base }, { key }); expect(k.opened).toBe(true)
  k.send(JSON.stringify({ type: 'click', choice: 'a', text: 'seen in the log' }))
  const mine = () => jsonLines(readOr(`${info.state_dir}/server.log`)).filter((l) => l.source === 'user-event')
  expect(await until(() => mine().length >= 1)).toBe(true)
  expect(JSON.stringify(mine()[0])).toContain('seen in the log')
})

test('28: a new .html file sends reload to every browser connected, deletes events, and gives the line screen-added', async () => {
  const s = await serve()
  const a = await socket(s, { key: KEY }), b = await socket(s, { cookie: await cookieOf(s.base) })
  expect(a.opened && b.opened).toBe(true)
  a.send(JSON.stringify({ type: 'click', choice: 'old' }))
  expect(await until(() => events(s).length === 1)).toBe(true)
  await sleep(300)
  writeFileSync(`${s.content}/first.html`, FRAGMENT)
  expect(await until(() => reloads(a) >= 1 && reloads(b) >= 1)).toBe(true)
  expect(JSON.parse(a.messages.find((m) => m.includes('reload'))!)).toEqual({ type: 'reload' })
  const added = () => s.lines().filter((l) => l.type === 'screen-added')
  expect(await until(() => added().length >= 1)).toBe(true)
  expect(String(added()[0].file).endsWith('first.html')).toBe(true)
  expect(await until(() => !existsSync(`${s.state}/events`))).toBe(true)
})

test('29: a change to a .html file that was there sends the reload, gives screen-updated, and leaves events as it is', async () => {
  const s = await serve()
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  await sleep(300)
  writeFileSync(`${s.content}/first.html`, FRAGMENT)
  expect(await until(() => s.lines().some((l) => l.type === 'screen-added'))).toBe(true)
  expect(await until(() => reloads(k) >= 1)).toBe(true)
  await sleep(600) // the first write has settled
  k.send(JSON.stringify({ type: 'click', choice: 'kept' }))
  expect(await until(() => events(s).length === 1)).toBe(true)
  const before = reloads(k)
  writeFileSync(`${s.content}/first.html`, FRAGMENT + '<p>changed</p>\n')
  const updated = () => s.lines().filter((l) => l.type === 'screen-updated')
  expect(await until(() => updated().length >= 1)).toBe(true)
  expect(String(updated()[0].file).endsWith('first.html')).toBe(true)
  expect(await until(() => reloads(k) > before)).toBe(true)
  await sleep(400)
  expect(events(s).map((l) => JSON.parse(l).choice)).toEqual(['kept'])
  expect(s.lines().filter((l) => l.type === 'screen-added').length).toBe(1)
})

test('29: a file that is no .html, or whose name starts with a dot, sends nothing', async () => {
  const s = await serve()
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  await sleep(300)
  writeFileSync(`${s.content}/notes.txt`, 'no screen'); writeFileSync(`${s.content}/.draft.html`, '<p>dot</p>'); writeFileSync(`${s.content}/style.css`, 'p{}')
  await sleep(1200)
  expect(k.messages).toEqual([])
  expect(s.lines().filter((l) => l.type === 'screen-added' || l.type === 'screen-updated')).toEqual([])
  writeFileSync(`${s.content}/real.html`, FRAGMENT) // and the server does watch: a screen is announced
  expect(await until(() => reloads(k) >= 1)).toBe(true)
  const added = s.lines().filter((l) => l.type === 'screen-added')
  expect(added.length).toBe(1); expect(String(added[0].file).endsWith('real.html')).toBe(true)
})

// ---------- How long it lives ----------

test('30: after idle_timeout_ms without use the server ends by itself: sockets closed, server-info removed, server-stopped written', async () => {
  const s = await serve({ BRAINSTORM_IDLE_TIMEOUT_MS: '1200', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  expect(s.info.idle_timeout_ms).toBe(1200)
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  expect(await exited(s, 8000)).toBe(true)
  expect(read(`${s.state}/server-stopped`)).toMatch(/"reason"\s*:\s*"idle timeout"/)
  expect(existsSync(`${s.state}/server-info`)).toBe(false)
  expect(await until(() => k.closed(), 3000)).toBe(true)
})

test('30: start removes server-info of a server that ended by its idle timeout', async () => {
  const { info } = await start(['--dir', fresh('dir')], { BRAINSTORM_IDLE_TIMEOUT_MS: '1000', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  expect(info.idle_timeout_ms).toBe(1000)
  expect(await until(() => existsSync(`${info.state_dir}/server-stopped`), 8000)).toBe(true)
  expect(read(`${info.state_dir}/server-stopped`)).toMatch(/"reason"\s*:\s*"idle timeout"/)
  expect(await until(() => !existsSync(`${info.state_dir}/server-info`), 3000)).toBe(true)
})

test('30: requests with the key put the end off; requests without the key do not', async () => {
  const s = await serve({ BRAINSTORM_IDLE_TIMEOUT_MS: '1500', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  const cookie = await cookieOf(s.base)
  for (const end = Date.now() + 3600; Date.now() < end; await sleep(250)) await get(s.base, '/', { Cookie: cookie }).then((r) => r.text(), () => '')
  expect(s.proc.exitCode).toBeNull() // used all the time: still there after more than twice the timeout
  const from = Date.now()
  while (s.proc.exitCode === null && Date.now() - from < 8000) { await get(s.base, '/').then((r) => r.text(), () => ''); await sleep(150) }
  expect(s.proc.exitCode).not.toBeNull() // asked without the key all the time: gone
  expect(read(`${s.state}/server-stopped`)).toMatch(/"reason"\s*:\s*"idle timeout"/)
})

test('31: when the process named in BRAINSTORM_OWNER_PID has died, the server ends with reason owner process exited', async () => {
  const owner = Bun.spawn(['sleep', '60'], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  cleanups.push(async () => { owner.kill('SIGKILL'); await owner.exited })
  const s = await serve({ BRAINSTORM_OWNER_PID: String(owner.pid), BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  const k = await socket(s, { key: KEY }); expect(k.opened).toBe(true)
  await sleep(800)
  expect(s.proc.exitCode).toBeNull() // the owner lives: so does the server
  owner.kill('SIGKILL'); await owner.exited
  expect(await exited(s, 8000)).toBe(true)
  expect(read(`${s.state}/server-stopped`)).toMatch(/"reason"\s*:\s*"owner process exited"/)
  expect(existsSync(`${s.state}/server-info`)).toBe(false)
  expect(await until(() => k.closed(), 3000)).toBe(true)
})

test('31: start does not name the shell that ran it as the owner: the server outlives that shell', async () => {
  const D = fresh('dir'), o = fresh('out')
  const shell = Bun.spawn(['sh', '-c', `"${BUN}" "${SCRIPT}" start --dir "${D}" > "${o}" 2>&1; exit 0`], { cwd: T, env: { ...CLEAN, ...SAFE, BRAINSTORM_LIFECYCLE_CHECK_MS: '100' }, stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  await Promise.race([shell.exited, sleep(15000)])
  if (shell.exitCode === null) shell.kill('SIGKILL')
  const info = started(readOr(o)); if (info) guard(info)
  expect(info).toBeDefined()
  await sleep(1500) // the shell is dead for many checks now
  expect(existsSync(`${info!.state_dir}/server-stopped`)).toBe(false)
  expect((await get(`http://127.0.0.1:${info!.port}`, `/?key=${keyOf(info!)}`)).status).toBe(200)
})

test('32: a second start with the same --dir, after the first server has ended, takes the same port and the same key', async () => {
  const D = fresh('dir')
  const a = await start(['--dir', D])
  const cookie = await cookieOf(a.base, a.key)
  expect(read(`${D}/.last-port`).trim()).toBe(String(a.info.port)); expect(read(`${D}/.last-token`).trim()).toBe(a.key)
  expect(mode(`${D}/.last-token`) & 0o077).toBe(0)
  expect((await run(['stop', a.session])).lines.map((l) => l.status)).toContain('stopped')
  const b = await start(['--dir', D])
  expect(b.info.port).toBe(a.info.port); expect(b.key).toBe(a.key); expect(b.session).not.toBe(a.session)
  expect(read(`${D}/.last-port`).trim()).toBe(String(a.info.port)); expect(read(`${D}/.last-token`).trim()).toBe(a.key)
  expect(mode(`${D}/.last-token`) & 0o077).toBe(0)
  expect((await get(b.base, '/', { Cookie: cookie })).status).toBe(200) // the tab that was open is let in again
  expect((await socket(b, { cookie })).opened).toBe(true)
})

test('33: when that port is taken, the server takes another port and a new key and leaves .last-port and .last-token as they are', async () => {
  const D = fresh('dir')
  const a = await start(['--dir', D])
  expect((await run(['stop', a.session])).lines.map((l) => l.status)).toContain('stopped')
  const holder = Bun.serve({ port: a.info.port, hostname: '127.0.0.1', fetch: () => new Response('held by the test') })
  cleanups.push(() => { holder.stop(true) })
  const b = await start(['--dir', D])
  expect(b.info.port).not.toBe(a.info.port); expect(b.key).not.toBe(a.key)
  expect((await get(b.base, `/?key=${b.key}`)).status).toBe(200)
  expect(read(`${D}/.last-port`).trim()).toBe(String(a.info.port)); expect(read(`${D}/.last-token`).trim()).toBe(a.key)
})

test('33: when the port is taken and the key was given in BRAINSTORM_TOKEN, the server exits 1', async () => {
  const free = await serve() // the same settings on a free port give a server
  expect(free.proc.exitCode).toBeNull()
  const holder = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('held by the test') })
  cleanups.push(() => { holder.stop(true) })
  const dir = fresh('session'); mkdirSync(`${dir}/content`, { recursive: true }); mkdirSync(`${dir}/state`, { recursive: true })
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, BRAINSTORM_PORT: String(holder.port) })
  expect(await exited(p, 10000)).toBe(true)
  expect(p.proc.exitCode).toBe(1); expect(started(p.out())).toBeUndefined()
  expect(await (await fetch(`http://127.0.0.1:${holder.port}/`)).text()).toBe('held by the test')
})

test('33: BRAINSTORM_PORT is the port the server takes first', async () => {
  const holder = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('x') })
  const port = holder.port as number; holder.stop(true); await sleep(100)
  const s = await serve({ BRAINSTORM_PORT: String(port) })
  expect(s.port).toBe(port)
})

// a stand-in for the command that opens the browser: it writes one line for each call
function opener() {
  const cmd = fresh('opener'), log = `${cmd}.log`
  writeFileSync(cmd, `#!/bin/sh\necho "opened $*" >> "${log}"\n`); chmodSync(cmd, 0o755)
  return { cmd, calls: () => readOr(log).split('\n').filter((l) => l !== '').length }
}

test('34: with --open the browser is opened once, at the first screen and not before', async () => {
  const o = opener()
  const { info } = await start(['--dir', fresh('dir'), '--open'], { BRAINSTORM_OPEN_CMD: o.cmd })
  await sleep(900)
  expect(o.calls()).toBe(0) // no screen yet
  writeFileSync(`${info.screen_dir}/first.html`, FRAGMENT)
  expect(await until(() => o.calls() >= 1)).toBe(true)
  await sleep(500)
  writeFileSync(`${info.screen_dir}/second.html`, FRAGMENT)
  expect(await until(() => jsonLines(readOr(`${info.state_dir}/server.log`)).filter((l) => l.type === 'screen-added').length >= 2)).toBe(true)
  await sleep(700)
  expect(o.calls()).toBe(1)
})

test('34: without --open the browser is never opened', async () => {
  const o = opener()
  const { info } = await start(['--dir', fresh('dir')], { BRAINSTORM_OPEN_CMD: o.cmd })
  writeFileSync(`${info.screen_dir}/first.html`, FRAGMENT)
  expect(await until(() => jsonLines(readOr(`${info.state_dir}/server.log`)).some((l) => l.type === 'screen-added'))).toBe(true)
  await sleep(900)
  expect(o.calls()).toBe(0)
})

test('34: with --open the browser is not opened when a browser is already connected', async () => {
  const o = opener()
  const { info, base, key } = await start(['--dir', fresh('dir'), '--open'], { BRAINSTORM_OPEN_CMD: o.cmd })
  const k = await socket({ base }, { key }); expect(k.opened).toBe(true)
  writeFileSync(`${info.screen_dir}/first.html`, FRAGMENT)
  expect(await until(() => reloads(k) >= 1)).toBe(true)
  await sleep(900)
  expect(o.calls()).toBe(0)
})

// ---------- In the browser: the frame ----------

const CLASSES = ['options', 'option', 'cards', 'card', 'mockup', 'split', 'pros-cons', 'mock-nav', 'mock-sidebar', 'mock-content', 'mock-button', 'mock-input', 'placeholder', 'subtitle', 'section', 'label']
test('38: the frame has the classes for content of the original', async () => {
  const s = await serve({}, { 'frag.html': '<p>a fragment</p>' })
  const cookie = await cookieOf(s.base)
  const p = await page(s.base, '/', cookie)
  let css = p.text
  for (const m of p.text.matchAll(/<link\b[^>]*\bhref\s*=\s*["']?(\/[^"'\s>]*)/gi)) css += '\n' + (await page(s.base, m[1], cookie)).text
  expect(p.text).toContain('<title>hstack brainstorm</title>')
  for (const c of CLASSES) expect(`${c}: ${new RegExp(`\\.${c}(?![\\w-])`).test(css)}`).toBe(`${c}: true`)
})

// ---------- hstack's name, and nothing from the network ----------

const VERSION = JSON.parse(read(join(ROOT, '.claude-plugin/plugin.json'))).version as string

test('39: the frame and the waiting page show hstack v<version>, and the title of the frame is hstack brainstorm', async () => {
  const waiting = await serve()
  expect((await page(waiting.base, '/', await cookieOf(waiting.base))).text).toContain(`hstack v${VERSION}`)
  const s = await serve({}, { 'frag.html': '<p>a fragment</p>' })
  const p = await page(s.base, '/', await cookieOf(s.base))
  expect(p.text).toContain('<p>a fragment</p>'); expect(p.text).toContain(`hstack v${VERSION}`); expect(p.text).toContain('<title>hstack brainstorm</title>')
})

// what the server itself adds: the frame, the waiting page, the 403 page, the page of behaviour 22, the browser script
async function ownPages() {
  const waiting = await serve(), s = await serve({}, { 'frag.html': '<p>a fragment</p>' })
  const wc = await cookieOf(waiting.base), sc = await cookieOf(s.base)
  const pages: Record<string, string> = {}
  pages.waiting = (await page(waiting.base, '/', wc)).text
  pages.frame = (await page(s.base, '/', sc)).text
  pages.refused = await (await get(s.base, '/')).text()
  pages.key = await (await get(s.base, `/?key=${KEY}`)).text()
  pages.script = await scripts(s.base, pages.frame, sc)
  for (const m of pages.frame.matchAll(/<link\b[^>]*\bhref\s*=\s*["']?(\/[^"'\s>]*)/gi)) pages.frame += '\n' + (await page(s.base, m[1], sc)).text
  expect(pages.waiting).toContain('Waiting for the agent'); expect(pages.frame).toContain('hstack brainstorm'); expect(pages.refused).toContain('Session key required'); expect(pages.key).toContain('brainstorm-session-key'); expect(pages.script).toContain('toggleSelect')
  return pages
}

test('40: what the server itself adds holds no address of another host', async () => {
  for (const [name, text] of Object.entries(await ownPages())) {
    const absolute = text.match(/\b[a-z][a-z0-9+.-]*:\/\/(?!localhost\b|127\.0\.0\.1\b)[a-z0-9\[][^\s"'`<>)]*/gi) ?? []
    expect(`${name}: ${absolute.join(' ')}`).toBe(`${name}: `)
    const relative = text.match(/\b(?:src|href|action)\s*=\s*["']?\/\/[^\s"'>]*/gi) ?? []
    expect(`${name}: ${relative.join(' ')}`).toBe(`${name}: `)
    expect(`${name}: ${(text.match(/url\(\s*["']?(?:[a-z]+:)?\/\/[^)]*\)|@import[^;]*/gi) ?? []).join(' ')}`).toBe(`${name}: `)
  }
})

// ---------- The files ----------

const tracked = () => Bun.spawnSync(['git', '-C', ROOT, 'ls-files', '--cached', '--others', '--exclude-standard'], { stdout: 'pipe', stderr: 'pipe' }).stdout.toString().split('\n').filter((f) => f !== '' && existsSync(join(ROOT, f)))

test('41: the server is TypeScript: scripts/mockup.ts is there and tsc checks it', () => {
  expect(existsSync(SCRIPT)).toBe(true)
  const include = JSON.parse(read(join(ROOT, 'tsconfig.json'))).include as string[]
  expect(include.some((i) => i === 'scripts/mockup.ts' || i === 'scripts/*.ts' || i === 'scripts/**/*.ts' || i === 'scripts')).toBe(true)
})

// guards what is so at the base: the repository has no .sh, .cjs or .js file, and 84 .mjs files
test('41: the change adds no .sh, .cjs, .js or .mjs file', () => {
  const files = tracked()
  expect(files.length).toBeGreaterThan(100)
  expect(files.filter((f) => /\.(sh|cjs|js)$/.test(f))).toEqual([])
  expect(files.filter((f) => f.endsWith('.mjs')).length).toBeLessThanOrEqual(84)
  expect(readdirSync(join(ROOT, 'scripts')).filter((f) => f.endsWith('.mjs')).sort()).toEqual(['check.mjs', 'init.mjs', 'okf-check.mjs'])
})

test('42: LICENSE-mockup lies beside the script, names the files it covers and holds the licence text with its copyright line', () => {
  const text = read(join(ROOT, 'scripts/LICENSE-mockup'))
  expect(text).toContain('mockup.ts')
  expect(text).toMatch(/MIT License/i)
  expect(text).toContain('Permission is hereby granted, free of charge, to any person obtaining a copy')
  expect(text).toContain('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND')
  expect(text).toMatch(/^\s*Copyright \(c\) \d{4}.*\S/m)
})

test('42: the holder of that copyright line is named in nothing else: not in the script, the README or the pages', async () => {
  const line = read(join(ROOT, 'scripts/LICENSE-mockup')).match(/^\s*Copyright \(c\) \d{4}(?:\s*-\s*\d{4})?,?\s+(.*\S)\s*$/m)
  expect(line).not.toBeNull()
  const holder = line![1].toLowerCase()
  expect(holder.length).toBeGreaterThan(2)
  expect(read(SCRIPT).toLowerCase()).not.toContain(holder)
  expect(read(join(ROOT, 'README.md')).toLowerCase()).not.toContain(holder)
  for (const [name, text] of Object.entries(await ownPages())) expect(`${name}: ${text.toLowerCase().includes(holder)}`).toBe(`${name}: false`)
})

const readme = () => read(join(ROOT, 'README.md'))
const part = (text: string, heading: RegExp, level: string) => { // the lines under a heading, to the next of its level or above
  const ls = text.split('\n'), from = ls.findIndex((l) => heading.test(l))
  if (from < 0) return ''
  const stop = new RegExp(`^#{1,${level.length}} `)
  const rest = ls.slice(from + 1), to = rest.findIndex((l) => stop.test(l))
  return rest.slice(0, to < 0 ? rest.length : to).join('\n')
}

test('43: the README has the section of mockup under "Scripts", with the two verbs and their options', () => {
  const scriptsPart = part(readme(), /^## Scripts\s*$/, '##')
  expect(scriptsPart.split('\n')).toContain('### `mockup`: the mock-up server of a brainstorm')
  const section = part(scriptsPart, /^### `mockup`: the mock-up server of a brainstorm\s*$/, '###')
  expect(section).toContain('bun scripts/mockup.ts start'); expect(section).toContain('bun scripts/mockup.ts stop')
  for (const option of ['--dir', '--host', '--url-host', '--idle-timeout-minutes', '--foreground', '--background', '--open', '--allow-network']) expect(`${option}: ${section.includes(option)}`).toBe(`${option}: true`)
})

test('47: the README says under "Known limits" that the Windows branch of the mock-up server has not been run on Windows', () => {
  const limits = part(readme(), /^## Known limits\s*$/, '##')
  expect(limits.length).toBeGreaterThan(0)
  const line = limits.split('\n').find((l) => /Windows/.test(l) && /mock-up/i.test(l))
  expect(line).toBeDefined()
  expect(line!).toMatch(/\bnot\b|\bnever\b/i)
})

test('44: hstack start leaves a folder mockups of the state folder where it is, as it leaves evidence', () => {
  const R = fresh('repo'), env = { ...CLEAN, HSTACK_STATE: fresh('hstate'), HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: 'junk', GITHUB_TOKEN: 'junk', GH_CONFIG_DIR: fresh('ghconfig') }
  const sh = (cmd: string[], stdin?: string) => { const r = Bun.spawnSync(cmd, { cwd: R, env: { ...env, CLAUDE_PROJECT_DIR: R }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' }); return { code: r.exitCode, out: r.stdout.toString().trim() } }
  const h = (...args: string[]) => sh([BUN, HSTACK, ...args])
  const hookStart = () => sh([BUN, HSTACK, 'hook-start'], '{"session_id":"x","source":"startup"}')
  mkdirSync(R); sh(['git', 'init', '-q']); sh(['git', 'config', 'user.email', 't@t']); sh(['git', 'config', 'user.name', 't'])
  writeFileSync(`${R}/a.txt`, 'x = 1\n'); sh(['git', 'add', '-A']); sh(['git', 'commit', '-qm', 'base'])
  hookStart(); expect(h('start').code).toBe(0)
  const S = h('dir').out
  expect(S.startsWith(env.HSTACK_STATE)).toBe(true); expect(existsSync(`${S}/base`)).toBe(true)
  mkdirSync(`${S}/mockups/session-1/content`, { recursive: true }); writeFileSync(`${S}/mockups/session-1/content/a.html`, '<p>a mock-up of the brainstorm</p>\n')
  mkdirSync(`${S}/evidence/spec-1`, { recursive: true }); writeFileSync(`${S}/evidence/spec-1/shot.txt`, 'what the explorer saw\n')
  writeFileSync(`${S}/of-the-run`, 'moves with the run\n')
  Bun.sleepSync(1100); hookStart(); expect(h('start').code).toBe(0)
  expect(existsSync(`${S}/of-the-run`)).toBe(false); expect(existsSync(`${S}/old`)).toBe(true) // the earlier run was moved away
  expect(readOr(`${S}/evidence/spec-1/shot.txt`)).toBe('what the explorer saw\n')
  expect(readOr(`${S}/mockups/session-1/content/a.html`)).toBe('<p>a mock-up of the brainstorm</p>\n')
})

// ---------- Opening it to the network ----------

const REFUSAL = ['ask the user first, then add --allow-network', 'not encrypted on a local network']

test('45: start with a --host that is not this machine own address and without --allow-network starts no server and exits 1', async () => {
  expect(existsSync(SCRIPT)).toBe(true)
  const D = fresh('dir')
  const r = await run(['start', '--dir', D, '--host', '0.0.0.0'])
  const info = started(r.all); if (info) guard(info)
  expect(info).toBeUndefined()
  const error = r.lines.map((l) => l.error).find((e) => typeof e === 'string') as string | undefined
  expect(error).toBeDefined()
  expect(error!).toContain('0.0.0.0'); for (const words of REFUSAL) expect(error!).toContain(words)
  expect(r.code).toBe(1)
  const sessions = existsSync(D) ? readdirSync(D).filter((f) => !f.startsWith('.')) : []
  for (const s of sessions) expect(existsSync(`${D}/${s}/state/server-info`)).toBe(false)
})

test('45: a serve run directly with such a BRAINSTORM_HOST and without BRAINSTORM_ALLOW_NETWORK refuses in the same way', async () => {
  const local = await serve({ BRAINSTORM_HOST: '127.0.0.1' }) // on this machine's own address it serves
  expect(local.info.host).toBe('127.0.0.1')
  const dir = fresh('session'); mkdirSync(`${dir}/content`, { recursive: true }); mkdirSync(`${dir}/state`, { recursive: true })
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, BRAINSTORM_HOST: '0.0.0.0' })
  expect(await exited(p, 10000)).toBe(true)
  expect(p.proc.exitCode).toBe(1); expect(started(p.all())).toBeUndefined()
  const error = jsonLines(p.all()).map((l) => l.error).find((e) => typeof e === 'string') as string | undefined
  expect(error).toBeDefined()
  expect(error!).toContain('0.0.0.0'); for (const words of REFUSAL) expect(error!).toContain(words)
})

test('45: the addresses of this machine itself need no --allow-network', async () => {
  const { r, info } = await start(['--dir', fresh('dir'), '--host', 'localhost'])
  expect(r.code).toBe(0); expect(info.host).toBe('localhost')
  expect(existsSync(`${info.state_dir}/server-info`)).toBe(true)
})

test('46: with --allow-network the line has reachable_at, and for a server on this machine own address the list is empty', async () => {
  const { info } = await start(['--dir', fresh('dir'), '--allow-network'])
  expect(info.host).toBe('127.0.0.1')
  expect(info.reachable_at).toEqual([])
})
