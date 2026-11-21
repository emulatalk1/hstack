// Tests of scripts/mockup.ts beside the acceptance tests of tests/mockup.test.ts: the page's script, run on a
// stand-in page (behaviours 35 to 37 of spec 1), and the edges the builder decided (E-numbers of the decisions file
// beside the spec). Run: bun test tests/mockup-edges.test.ts
// Every test starts the servers it needs on this machine's own address, ends them, and removes its folders.
// HSTACK_MOCKUP_SCRIPT runs another copy of the script (a broken copy that a test must catch).
import { afterAll, afterEach, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { addressKind, browserLauncher, foregroundChoice, isOwnHost, opensBrowser, reachableAt, windowsLike } from '../scripts/mockup.ts'

setDefaultTimeout(60000)
const ROOT = join(import.meta.dir, '..')
const SCRIPT = process.env.HSTACK_MOCKUP_SCRIPT ?? join(ROOT, 'scripts/mockup.ts')
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-mockup-edges-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
process.on('exit', wipe)
afterAll(wipe)

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith('BRAINSTORM_') && k !== 'CODEX_CI') CLEAN[k] = v
const SAFE = { BRAINSTORM_IDLE_TIMEOUT_MS: '60000', BRAINSTORM_LIFECYCLE_CHECK_MS: '200' } // a forgotten server ends by itself
const KEY = 'edge-key-0123456789abcdef'
type Json = Record<string, any>
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const readOr = (p: string) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
const jsonLines = (text: string): Json[] => text.split('\n').flatMap((l) => { try { const v = JSON.parse(l); return v && typeof v === 'object' ? [v as Json] : [] } catch { return [] } })
const alive = (pid: number) => { try { process.kill(pid, 0); return true } catch { return false } }
const mode = (p: string) => statSync(p).mode & 0o777
let n = 0
const fresh = (name: string) => `${T}/${name}-${++n}`
async function until<V>(fn: () => V | Promise<V>, ms = 6000): Promise<V | undefined> {
  for (const end = Date.now() + ms; ;) { const v = await fn(); if (v || Date.now() > end) return v || undefined; await sleep(40) }
}
const cleanups: (() => void | Promise<void>)[] = []
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) { try { await c() } catch { /* a cleanup never fails a test */ } } })

function spawn(args: string[], env: Record<string, string> = {}) {
  const o = fresh('out'), e = fresh('err')
  const proc = Bun.spawn([process.execPath, SCRIPT, ...args], { cwd: T, env: { ...CLEAN, ...SAFE, ...env }, stdin: 'ignore', stdout: Bun.file(o), stderr: Bun.file(e) })
  cleanups.push(async () => { if (proc.exitCode === null) { proc.kill('SIGKILL'); await proc.exited } })
  return { proc, out: () => readOr(o), err: () => readOr(e) }
}
async function run(args: string[], env: Record<string, string> = {}) {
  const p = spawn(args, env)
  await Promise.race([p.proc.exited, sleep(15000)])
  return { code: p.proc.exitCode, out: p.out(), err: p.err(), lines: jsonLines(p.out()) }
}
// the server itself, in a folder of its own, with a known key
async function serve(env: Record<string, string> = {}, before: (content: string, state: string) => void = () => {}) {
  const dir = fresh('session'), content = `${dir}/content`, state = `${dir}/state`
  mkdirSync(content, { recursive: true }); mkdirSync(state, { recursive: true }); before(content, state)
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, ...env })
  const info = await until(() => jsonLines(p.out()).find((l) => l.type === 'server-started'))
  if (!info) throw new Error(`no server-started line: ${p.out()} ${p.err()}`)
  const base = `http://127.0.0.1:${info.port}`, cookie = `brainstorm-key-${info.port}=${KEY}`
  return { ...p, info, base, cookie, content, state, port: info.port as number }
}
async function start(args: string[], env: Record<string, string> = {}) {
  const r = await run(['start', ...args], env)
  const info = r.lines.find((l) => l.type === 'server-started')
  if (!info) throw new Error(`start gave no server-started line (exit ${r.code}): ${r.out} ${r.err}`)
  const session = dirname(info.state_dir as string)
  cleanups.push(async () => {
    const pid = Number(readOr(`${info.state_dir}/server.pid`).trim())
    if (existsSync(`${info.state_dir}/server.pid`)) await run(['stop', session])
    if (pid > 1 && alive(pid)) process.kill(pid, 'SIGKILL')
    rmSync(session, { recursive: true, force: true })
  })
  return { r, info, session }
}
const get = (base: string, path: string, headers: Record<string, string> = {}, method = 'GET') => fetch(base + path, { method, headers, redirect: 'manual' })
// one request with its path as it is written: fetch would fold `..` away before it is sent
function rawGet(port: number, path: string, cookie: string): Promise<string> {
  return new Promise((done, bad) => {
    let text = ''
    const s = connect(port, '127.0.0.1', () => s.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nCookie: ${cookie}\r\nConnection: close\r\n\r\n`))
    s.on('data', (d) => { text += d.toString() }); s.on('end', () => done(text)); s.on('error', bad)
  })
}
type Ws = { ws: WebSocket; messages: Json[]; opened: Promise<boolean>; closed: Promise<void> }
function socket(port: number, headers: Record<string, string>): Ws {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/`, { headers } as any)
  const messages: Json[] = []
  ws.onmessage = (m) => { try { messages.push(JSON.parse(String(m.data))) } catch { /* not ours */ } }
  let shut: () => void = () => {}
  const closed = new Promise<void>((r) => { shut = r })
  const opened = new Promise<boolean>((r) => { ws.onopen = () => r(true); ws.onerror = () => r(false); ws.onclose = () => { r(false); shut() } })
  cleanups.push(() => { try { ws.close() } catch { /* closed */ } })
  return { ws, messages, opened, closed }
}

// ---------- the page's script, on a stand-in page ----------

type El = { id: string; textContent: string; dataset: Record<string, string>; classes: Set<string>; classList: { add(c: string): void; remove(c: string): void; toggle(c: string): void }; closest(sel: string): any; querySelectorAll(sel: string): El[]; style: Json; innerHTML: string }
function element(over: Partial<El> & { parent?: any } = {}): El {
  const classes = new Set<string>()
  const el: any = { id: '', textContent: '', dataset: {}, classes, style: { cssText: '', setProperty() {} }, innerHTML: '', querySelectorAll: () => [], ...over }
  el.classList = { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), toggle: (c: string) => (classes.has(c) ? classes.delete(c) : classes.add(c)) }
  el.closest = over.closest ?? ((sel: string) => (sel === '[data-choice]' && el.dataset.choice !== undefined ? el : (over as any).parent && (over as any).parent.matches?.(sel) ? (over as any).parent : null))
  return el
}
// The script of a served page, run with stand-ins for the browser: a window, a document, a WebSocket whose events the
// test fires, timers the test reads, and a clock the test moves.
async function page(opts: { sessionKey?: string | null } = {}) {
  const s = await serve()
  const html = await (await get(s.base, '/', { Cookie: s.cookie })).text()
  const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
  const sockets: any[] = [], timers: { fn: () => void; ms: number; cleared: boolean }[] = [], appended: any[] = [], reloads: string[] = []
  let now = 1_000_000, clickHandler: (e: any) => void = () => {}
  const status = element()
  class FakeWebSocket {
    static OPEN = 1
    readyState = 0; sent: string[] = []; url: string
    onopen: () => void = () => {}; onclose: () => void = () => {}; onmessage: (m: { data: string }) => void = () => {}; onerror: () => void = () => {}
    constructor(url: string) { this.url = url; sockets.push(this) }
    send(text: string) { this.sent.push(text) }
    close() { this.readyState = 3 }
    open() { this.readyState = 1; this.onopen() }
    drop() { this.readyState = 3; this.onclose() }
  }
  const window: any = {
    location: { host: 'localhost:5555', reload: () => reloads.push('reload'), replace: (u: string) => reloads.push(u) },
    sessionStorage: { getItem: (k: string) => (k === 'brainstorm-session-key' ? opts.sessionKey ?? null : null) },
  }
  const document: any = {
    addEventListener: (type: string, fn: (e: any) => void) => { if (type === 'click') clickHandler = fn },
    querySelector: (sel: string) => (sel === '.status' ? status : null),
    createElement: () => element(),
    body: { appendChild: (el: any) => appended.push(el) },
  }
  const setT = (fn: () => void, ms: number) => { timers.push({ fn, ms, cleared: false }); return timers.length }
  const clearT = (id: number) => { if (timers[id - 1]) timers[id - 1].cleared = true }
  const FakeDate = { now: () => now }
  new Function('window', 'document', 'WebSocket', 'setTimeout', 'clearTimeout', 'Date', code)(window, document, FakeWebSocket, setT, clearT, FakeDate)
  return {
    window, status, sockets, timers, appended, reloads,
    click: (target: any) => clickHandler({ target }),
    advance: (ms: number) => { now += ms },
    now: () => now,
    // the reconnect the page planned last, run as the browser would when its time came
    retry: () => { const t = timers.filter((x) => !x.cleared).pop()!; t.cleared = true; t.fn(); return t.ms },
  }
}

test('35: a click on an element with data-choice sends a message with type click, the choice, the text, the id and a timestamp', async () => {
  const p = await page()
  p.sockets[0].open()
  p.click(element({ id: 'opt-a', textContent: '  Option A - Simple  ', dataset: { choice: 'a' } }))
  expect(p.sockets[0].sent.map((t: string) => JSON.parse(t))).toEqual([{ type: 'click', text: 'Option A - Simple', choice: 'a', id: 'opt-a', timestamp: 1_000_000 }])
})

test('35: a click on an element inside one with data-choice counts for that one; a click elsewhere sends nothing', async () => {
  const p = await page()
  p.sockets[0].open()
  const option = element({ textContent: 'B', dataset: { choice: 'b' } })
  p.click(element({ closest: (sel: string) => (sel === '[data-choice]' ? option : null) }))
  p.click(element({ closest: () => null }))
  expect(p.sockets[0].sent.map((t: string) => JSON.parse(t))).toEqual([{ type: 'click', text: 'B', choice: 'b', id: null, timestamp: 1_000_000 }])
})

test('35: a click made while the server is away is sent when the connection is back', async () => {
  const p = await page()
  p.click(element({ textContent: 'A', dataset: { choice: 'a' } })) // the WebSocket is not open yet
  expect(p.sockets[0].sent).toEqual([])
  p.sockets[0].open()
  expect(p.sockets[0].sent.map((t: string) => JSON.parse(t).choice)).toEqual(['a'])
})

function choices(multi: boolean) {
  const container: any = { dataset: multi ? { multiselect: '' } : {}, matches: (sel: string) => sel === '.options' }
  const a = element({ dataset: { choice: 'a' }, parent: container }), b = element({ dataset: { choice: 'b' }, parent: container })
  container.querySelectorAll = () => [a, b]
  return { a, b }
}
test('35: toggleSelect marks the element selected, alone among the options of its container', async () => {
  const p = await page()
  const { a, b } = choices(false)
  p.window.toggleSelect(a); p.window.toggleSelect(b)
  expect([a.classes.has('selected'), b.classes.has('selected')]).toEqual([false, true])
  expect(p.window.selectedChoice).toBe('b')
})

test('35: in a container with data-multiselect, toggleSelect marks an element beside the others and unmarks it at the next call', async () => {
  const p = await page()
  const { a, b } = choices(true)
  p.window.toggleSelect(a); p.window.toggleSelect(b)
  expect([a.classes.has('selected'), b.classes.has('selected')]).toEqual([true, true])
  p.window.toggleSelect(a)
  expect([a.classes.has('selected'), b.classes.has('selected')]).toEqual([false, true])
})

test('35: brainstorm.choice sends a message of type choice with the value and what was given with it', async () => {
  const p = await page()
  p.sockets[0].open()
  p.window.brainstorm.choice('layout-2', { note: 'wider' })
  expect(p.sockets[0].sent.map((t: string) => JSON.parse(t))).toEqual([{ type: 'choice', value: 'layout-2', note: 'wider', timestamp: 1_000_000 }])
})

test('36: the status says Connected while the WebSocket is open and Reconnecting… when it is lost', async () => {
  const p = await page()
  expect(p.sockets[0].url).toBe('ws://localhost:5555')
  p.sockets[0].open()
  expect(p.status.textContent).toBe('Connected')
  p.sockets[0].drop()
  expect(p.status.textContent).toBe('Reconnecting…')
})

test('36: the page tries again after 500 ms, then twice as long each time, to 30 seconds at most', async () => {
  const p = await page()
  p.sockets[0].open(); p.sockets[0].drop()
  const waits: number[] = []
  for (let i = 0; i < 9; i++) { waits.push(p.retry()); p.sockets[p.sockets.length - 1].drop() }
  expect(waits).toEqual([500, 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])
  expect(p.sockets.length).toBe(10) // one new WebSocket for each try
})

test('36: a connection that comes back starts the waits again at 500 ms', async () => {
  const p = await page()
  p.sockets[0].open(); p.sockets[0].drop()
  p.retry(); p.sockets[1].drop(); p.retry() // 500, then 1000
  p.sockets[2].open(); p.sockets[2].drop()
  expect(p.retry()).toBe(500)
})

test('36: a message of type reload loads the page again; any other message does not', async () => {
  const p = await page()
  p.sockets[0].open()
  p.sockets[0].onmessage({ data: 'not json' }); p.sockets[0].onmessage({ data: '{"type":"other"}' })
  expect(p.reloads).toEqual([])
  p.sockets[0].onmessage({ data: '{"type":"reload"}' })
  expect(p.reloads).toEqual(['reload'])
})

test('37: after 15 seconds without the server the page shows Companion paused over the screen, and Disconnected', async () => {
  const p = await page()
  p.sockets[0].open(); p.sockets[0].drop()
  p.advance(14_999); p.retry(); p.sockets[1].drop()
  expect(p.appended.length).toBe(0) // not yet
  p.advance(1); p.retry(); p.sockets[2].drop()
  expect(p.appended.length).toBe(1)
  expect(p.appended[0].innerHTML).toContain('Companion paused')
  expect(p.status.textContent).toBe('Disconnected')
  p.advance(5000); p.retry(); p.sockets[3].drop()
  expect(p.appended.length).toBe(1) // shown once
})

test('37: when the server is back after that, the page loads again by itself, through the address with the key when the tab has it', async () => {
  const withKey = await page({ sessionKey: 'k e/y' })
  expect(withKey.sockets[0].url).toBe('ws://localhost:5555/?key=k%20e%2Fy')
  withKey.sockets[0].open(); withKey.sockets[0].drop(); withKey.advance(15_000); withKey.retry(); withKey.sockets[1].drop()
  withKey.retry(); withKey.sockets[2].open()
  expect(withKey.reloads).toEqual(['/?key=k%20e%2Fy'])
  const noKey = await page()
  noKey.sockets[0].open(); noKey.sockets[0].drop(); noKey.advance(15_000); noKey.retry(); noKey.sockets[1].drop()
  noKey.retry(); noKey.sockets[2].open()
  expect(noKey.reloads).toEqual(['reload'])
})

test('37: a connection that comes back before the 15 seconds does not load the page again', async () => {
  const p = await page()
  p.sockets[0].open(); p.sockets[0].drop(); p.advance(3000); p.retry(); p.sockets[1].open()
  expect(p.reloads).toEqual([])
  expect(p.status.textContent).toBe('Connected')
})

// ---------- the edges the builder decided ----------

test('E1: a WebSocket with the cookie and no Origin header is let in', async () => {
  const s = await serve()
  expect(await socket(s.port, { Cookie: s.cookie }).opened).toBe(true)
})

test('E2: /files/<name> takes the last part of the path only, and no path that climbs gives a file from outside', async () => {
  const s = await serve({}, (content) => { writeFileSync(`${content}/b.css`, 'b { color: red }'); writeFileSync(`${dirname(content)}/secret.txt`, 'the secret') })
  const sub = await rawGet(s.port, '/files/a/b.css', s.cookie)
  expect(sub.split('\r\n')[0]).toBe('HTTP/1.1 200 OK'); expect(sub).toContain('b { color: red }')
  for (const path of ['/files/../secret.txt', '/files/%2e%2e%2fsecret.txt', '/files/..%2fsecret.txt', '/files/.secret', '/files/..']) {
    const text = await rawGet(s.port, path, s.cookie)
    expect(`${path}: ${text.includes('the secret')}`).toBe(`${path}: false`)
    if (path !== '/files/..') expect(`${path}: ${text.split('\r\n')[0]}`).toBe(`${path}: HTTP/1.1 404 Not Found`)
  }
})

test('E3: a screen that was there before the server started, when it changes, is screen-updated and leaves events as it is', async () => {
  const s = await serve({}, (content, state) => { writeFileSync(`${content}/old.html`, '<p>old</p>'); writeFileSync(`${state}/events`, '{"choice":"a"}\n') })
  await sleep(300)
  writeFileSync(`${s.content}/old.html`, '<p>changed</p>')
  const line = await until(() => jsonLines(s.out()).find((l) => l.type === 'screen-updated' || l.type === 'screen-added'))
  expect(line).toEqual({ type: 'screen-updated', file: `${s.content}/old.html` }) // E4: the file's whole path
  expect(readOr(`${s.state}/events`)).toBe('{"choice":"a"}\n')
})

test('E4: the file of screen-added is the whole path of the new screen', async () => {
  const s = await serve()
  await sleep(300)
  writeFileSync(`${s.content}/first.html`, '<p>first</p>')
  expect(await until(() => jsonLines(s.out()).find((l) => l.type === 'screen-added'))).toEqual({ type: 'screen-added', file: `${s.content}/first.html` })
})

test('E5: several writes of one screen within a tenth of a second give one reload', async () => {
  const s = await serve()
  const w = socket(s.port, { Cookie: s.cookie }); expect(await w.opened).toBe(true)
  await sleep(300)
  for (let i = 0; i < 4; i++) { writeFileSync(`${s.content}/quick.html`, `<p>${i}</p>`); await sleep(15) }
  await until(() => w.messages.length > 0); await sleep(600)
  expect(w.messages).toEqual([{ type: 'reload' }])
})

test('E6: the user-event line is the message with source user-event before its own fields', async () => {
  const s = await serve()
  const w = socket(s.port, { Cookie: s.cookie }); expect(await w.opened).toBe(true)
  w.ws.send(JSON.stringify({ type: 'click', choice: 'a', text: 'A' }))
  const line = await until(() => s.out().split('\n').find((l) => l.includes('user-event')))
  expect(line).toBe('{"source":"user-event","type":"click","choice":"a","text":"A"}')
})

test('E7: stop exits 0 when it stopped the server, when none runs and when the process is not its own; a server that ends by itself exits 0', async () => {
  const a = await start(['--dir', fresh('dir')])
  const stopped = await run(['stop', a.session]); expect([stopped.code, stopped.lines[0]?.status]).toEqual([0, 'stopped'])
  const none = await run(['stop', a.session]); expect([none.code, none.lines[0]?.status]).toEqual([0, 'not_running'])
  const s = await serve({ BRAINSTORM_IDLE_TIMEOUT_MS: '300', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  expect(await Promise.race([s.proc.exited, sleep(8000).then(() => -1)])).toBe(0)
})

test('E8: the lines with error and status are on standard output', async () => {
  expect((await run(['start', '--nonsense'])).out).toContain('"error"')
  expect((await run(['stop', fresh('nothing')])).out).toContain('"status"')
})

test('E9: stop for a server that has ended by itself is stale_pid and keeps the reason the server wrote; stop for a folder that does not exist is not_running', async () => {
  const a = await start(['--dir', fresh('dir')], { BRAINSTORM_IDLE_TIMEOUT_MS: '300', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  const pid = Number(readOr(`${a.info.state_dir}/server.pid`).trim())
  await until(() => !alive(pid) && existsSync(`${a.info.state_dir}/server-stopped`), 8000)
  const r = await run(['stop', a.session])
  expect(r.lines[0]?.status).toBe('stale_pid')
  expect(readOr(`${a.info.state_dir}/server-stopped`)).toContain('"reason":"idle timeout"') // why it ended is not written over
  expect(existsSync(`${a.info.state_dir}/server.pid`)).toBe(false)
  expect((await run(['stop', fresh('nothing')])).lines[0]?.status).toBe('not_running')
})

// a stand-in for the command that opens a browser: it writes the address it was given to a file
function opener() {
  const file = fresh('opened'), cmd = fresh('open-cmd')
  writeFileSync(cmd, `#!/bin/sh\necho "$1" >> "${file}"\n`, { mode: 0o755 })
  return { cmd, calls: () => readOr(file).split('\n').filter(Boolean) }
}
test('E10: BRAINSTORM_OPEN with any value lets the server open the browser at the first screen, with the address that holds the key', async () => {
  const o = opener()
  const s = await serve({ BRAINSTORM_OPEN: 'yes', BRAINSTORM_OPEN_CMD: o.cmd })
  await sleep(300); writeFileSync(`${s.content}/one.html`, '<p>one</p>')
  expect(await until(() => o.calls().length > 0 && o.calls())).toEqual([`http://localhost:${s.port}/?key=${KEY}`])
})

test('E11: for --host localhost the url host is localhost, and the server answers there', async () => {
  const s = await serve({ BRAINSTORM_HOST: 'localhost' })
  expect([s.info.host, s.info.url_host]).toEqual(['localhost', 'localhost'])
  expect((await fetch(`http://localhost:${s.port}/`, { headers: { Cookie: s.cookie } })).status).toBe(200)
})

test('E12: a wrong cookie with no key, and an empty key beside the right cookie, are refused', async () => {
  const s = await serve()
  expect((await get(s.base, '/', { Cookie: `brainstorm-key-${s.port}=wrong` })).status).toBe(403)
  expect((await get(s.base, '/?key=', { Cookie: s.cookie })).status).toBe(403)
})

test('E13: /files/ gives the content type of the ending, and application/octet-stream for one it does not know', async () => {
  const s = await serve({}, (content) => { for (const f of ['a.js', 'a.jpg', 'a.jpeg', 'a.gif', 'a.bin', 'A.PNG']) writeFileSync(`${content}/${f}`, 'x') })
  const type = async (f: string) => (await get(s.base, `/files/${f}`, { Cookie: s.cookie })).headers.get('content-type')
  expect([await type('a.js'), await type('a.jpg'), await type('a.jpeg'), await type('a.gif'), await type('a.bin'), await type('A.PNG')])
    .toEqual(['application/javascript', 'image/jpeg', 'image/jpeg', 'image/gif', 'application/octet-stream', 'image/png'])
})

test('E14: without --dir no .last-port and no .last-token is written, and two starts have two keys', async () => {
  const a = await start([]), b = await start([])
  for (const s of [a, b]) for (const f of ['.last-port', '.last-token']) expect(`${f}: ${existsSync(join(dirname(s.session), f)) || existsSync(join(s.session, f))}`).toBe(`${f}: false`)
  expect(new URL(a.info.url).searchParams.get('key')).not.toBe(new URL(b.info.url).searchParams.get('key'))
})

test('E15: in a whole-page screen the script is put before </body>, or at the end when the page has none', async () => {
  const s = await serve({}, (content) => writeFileSync(`${content}/whole.html`, '<!DOCTYPE html><html><body><p>whole</p></body></html>'))
  const withBody = await (await get(s.base, '/', { Cookie: s.cookie })).text()
  expect(withBody).toMatch(/<p>whole<\/p><script>[\s\S]*toggleSelect[\s\S]*<\/script>\n<\/body><\/html>$/)
  await sleep(50); writeFileSync(`${s.content}/open.html`, '<html><p>no end'); await sleep(50)
  const without = await (await get(s.base, '/', { Cookie: s.cookie })).text()
  expect(without).toMatch(/^<html><p>no end<script>[\s\S]*toggleSelect[\s\S]*<\/script>$/)
})

test('E16: stop does not signal a live process when server-instance-id is malformed, even when that process carries the same words', async () => {
  for (const id of ['short', 'x'.repeat(65), 'bad!chars'.repeat(4)]) {
    // a process whose command line carries the very argument stop looks for: only the form of the id keeps it safe
    const other = Bun.spawn([process.execPath, '-e', 'setTimeout(() => {}, 30000)', `--brainstorm-server-id=${id}`], { stdout: 'ignore', stderr: 'ignore' }); cleanups.push(() => { other.kill() })
    const session = fresh('stale'); mkdirSync(`${session}/state`, { recursive: true })
    writeFileSync(`${session}/state/server.pid`, `${other.pid}\n`); writeFileSync(`${session}/state/server-instance-id`, `${id}\n`)
    await sleep(150)
    expect((await run(['stop', session])).lines[0]?.status).toBe('stale_pid')
    expect(`${id.slice(0, 9)}: ${alive(other.pid)}`).toBe(`${id.slice(0, 9)}: true`)
  }
})

test('E18: a request that is no GET is 404 with the key and 403 without', async () => {
  const s = await serve()
  expect((await get(s.base, '/', { Cookie: s.cookie }, 'POST')).status).toBe(404)
  expect((await get(s.base, '/', {}, 'POST')).status).toBe(403)
})

test('E20: an owner that is dead already when the server starts is not watched: the server says so and goes on', async () => {
  const gone = Bun.spawn(['true']); await gone.exited
  const s = await serve({ BRAINSTORM_OWNER_PID: String(gone.pid), BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  expect(jsonLines(s.out()).find((l) => l.type === 'owner-pid-invalid')).toEqual({ type: 'owner-pid-invalid', pid: gone.pid, reason: 'dead at startup' })
  await sleep(600)
  expect(s.proc.exitCode).toBeNull()
})

test('E21: without the permission the server-started line has no reachable_at', async () => {
  const s = await serve()
  expect('reachable_at' in s.info).toBe(false)
})

test('E21: an address of the tailnet ranges is tailscale, any other is network', () => {
  const kinds = (list: string[]) => list.map((a) => `${a} ${addressKind(a)}`)
  expect(kinds(['100.64.0.1', '100.127.255.254', '100.63.255.255', '100.128.0.1', '10.0.0.5', '192.168.1.20', '101.64.0.1', 'fd7a:115c:a1e0::1', 'FD7A:115C:A1E0:ab12::2', 'fe80::1', 'fd7a:115c:a1e1::1']))
    .toEqual(['100.64.0.1 tailscale', '100.127.255.254 tailscale', '100.63.255.255 network', '100.128.0.1 network', '10.0.0.5 network', '192.168.1.20 network', '101.64.0.1 network', 'fd7a:115c:a1e0::1 tailscale', 'FD7A:115C:A1E0:ab12::2 tailscale', 'fe80::1 network', 'fd7a:115c:a1e1::1 network'])
})

test('E22: only 127.0.0.1, localhost and ::1 need no permission: another address of this machine itself is refused too', async () => {
  expect(['127.0.0.1', 'localhost', '::1', '127.0.0.2', '0.0.0.0', '::', '192.168.1.20', ''].map(isOwnHost)).toEqual([true, true, true, false, false, false, false, false])
  const r = await run(['serve'], { BRAINSTORM_DIR: fresh('refused'), BRAINSTORM_HOST: '127.0.0.2' })
  expect(r.code).toBe(1); expect(r.lines[0]?.error).toContain('--host 127.0.0.2'); expect(r.lines[0]?.error).toContain('ask the user first, then add --allow-network')
})

test('E23: start runs in the foreground by itself on Windows and in a Windows-like shell, and --background keeps it in the background', () => {
  const none = { foreground: false, background: false }
  expect([foregroundChoice(none, 'win32', {}), foregroundChoice(none, 'linux', { MSYSTEM: 'MINGW64' }), foregroundChoice(none, 'linux', { OSTYPE: 'msys' }), foregroundChoice(none, 'linux', { OSTYPE: 'cygwin' }), foregroundChoice(none, 'darwin', { OSTYPE: 'darwin24' }), foregroundChoice(none, 'linux', {})])
    .toEqual([true, true, true, true, false, false])
  expect([foregroundChoice({ foreground: false, background: true }, 'win32', {}), foregroundChoice({ foreground: false, background: true }, 'linux', { CODEX_CI: '1' }), foregroundChoice({ foreground: true, background: false }, 'darwin', {})]).toEqual([false, false, true])
  expect([windowsLike('win32', {}), windowsLike('darwin', {}), windowsLike('linux', { OSTYPE: 'mingw32' })]).toEqual([true, false, true]) // a Windows-like place names no owner either
})

test('E24: a verb the script does not know, and stop with no folder, print an error line that says how to call it, and exit 1', async () => {
  const verb = await run(['restart']); expect(verb.code).toBe(1); expect(verb.lines[0]?.error).toContain('start'); expect(verb.lines[0]?.error).toContain('stop')
  const stop = await run(['stop']); expect(stop.code).toBe(1); expect(stop.lines[0]?.error).toBe('Usage: mockup.ts stop <session folder>')
})

test('E25: a --dir that cannot be made prints an error line and exits 1', async () => {
  const file = fresh('a-file'); writeFileSync(file, 'x')
  const r = await run(['start', '--dir', `${file}/inside`])
  expect([r.code, r.lines[0]?.error]).toEqual([1, 'Cannot create or enter --dir'])
})

test('E26: an option that needs a value and has none prints an error line that names it, and exits 1', async () => {
  for (const option of ['--dir', '--host', '--url-host', '--idle-timeout-minutes']) {
    const r = await run(['start', option])
    expect([option, r.code, r.lines[0]?.error]).toEqual([option, 1, `${option} needs a value`])
  }
})

test('E27: a message above 10 MB closes that connection, and the server goes on', async () => {
  const s = await serve()
  const w = socket(s.port, { Cookie: s.cookie }); expect(await w.opened).toBe(true)
  w.ws.send('x'.repeat(10 * 1024 * 1024 + 1024))
  await Promise.race([w.closed, sleep(8000)])
  expect(w.ws.readyState).toBe(WebSocket.CLOSED)
  expect((await get(s.base, '/', { Cookie: s.cookie })).status).toBe(200)
})

test('E28: the browser is opened by the command of the place, with the address as an argument of its own, and not at all on Linux without a display', () => {
  const url = 'http://localhost:1/?key=k'
  expect(browserLauncher(url, 'darwin', '24.6.0', {})).toEqual({ bin: 'open', args: [url] })
  expect(browserLauncher(url, 'win32', '10.0', {})).toEqual({ bin: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] })
  expect(browserLauncher(url, 'linux', '5.15.90.1-microsoft-standard-WSL2', {})).toEqual({ bin: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] })
  expect(browserLauncher(url, 'linux', '6.8.0', { DISPLAY: ':0' })).toEqual({ bin: 'xdg-open', args: [url] })
  expect(browserLauncher(url, 'linux', '6.8.0', { WAYLAND_DISPLAY: 'wayland-0' })).toEqual({ bin: 'xdg-open', args: [url] })
  expect(browserLauncher(url, 'linux', '6.8.0', {})).toBeNull()
})

test('E30: the files of a session that hold the key or name the server are readable by their owner only', async () => {
  const dir = fresh('dir'), a = await start(['--dir', dir])
  const files = ['server-info', 'server.log', 'server.pid', 'server-instance-id'].map((f) => `${a.info.state_dir}/${f}`).concat(`${dir}/.last-token`)
  expect(files.map((f) => `${f.split('/').pop()} ${mode(f).toString(8)}`)).toEqual(['server-info 600', 'server.log 600', 'server.pid 600', 'server-instance-id 600', '.last-token 600'])
})

// ---------- from the review of round 1 ----------

test('34: the browser is opened for a server on each of this machine\'s own addresses, ::1 too, and never on another address', () => {
  const opened = (host: string) => `${host} ${opensBrowser(host, '1', 0)}`
  expect(['127.0.0.1', 'localhost', '::1', '0.0.0.0', '::', '192.168.1.20', '100.64.0.9'].map(opened))
    .toEqual(['127.0.0.1 true', 'localhost true', '::1 true', '0.0.0.0 false', ':: false', '192.168.1.20 false', '100.64.0.9 false'])
  expect([opensBrowser('127.0.0.1', undefined, 0), opensBrowser('127.0.0.1', '', 0), opensBrowser('127.0.0.1', '1', 1)]).toEqual([false, false, false]) // not asked for; a browser is connected already
})

test('46: reachable_at has one entry for each address of this machine the server can be reached on, with its address, its url with the key, and its kind', () => {
  const machine = [
    { address: '127.0.0.1', family: 'IPv4', internal: true }, { address: '::1', family: 'IPv6', internal: true },
    { address: '192.168.1.20', family: 'IPv4', internal: false }, { address: '100.101.102.103', family: 'IPv4', internal: false },
    { address: 'fd7a:115c:a1e0::9', family: 'IPv6', internal: false }, { address: 'fe80::1c2d', family: 'IPv6', internal: false },
  ]
  const lan = { address: '192.168.1.20', kind: 'network', url: 'http://192.168.1.20:5000/?key=K' }
  const tail = { address: '100.101.102.103', kind: 'tailscale', url: 'http://100.101.102.103:5000/?key=K' }
  const tail6 = { address: 'fd7a:115c:a1e0::9', kind: 'tailscale', url: 'http://[fd7a:115c:a1e0::9]:5000/?key=K' }
  const link6 = { address: 'fe80::1c2d', kind: 'network', url: 'http://[fe80::1c2d]:5000/?key=K' }
  expect(reachableAt('0.0.0.0', machine, 5000, 'K')).toEqual([lan, tail]) // every address of the IPv4 kind but this machine's own
  expect(reachableAt('::', machine, 5000, 'K')).toEqual([lan, tail, tail6, link6])
  expect(reachableAt('100.101.102.103', machine, 5000, 'K')).toEqual([tail]) // one named address: that one alone
  expect(reachableAt('127.0.0.1', machine, 5000, 'K')).toEqual([])
  expect(reachableAt('::1', machine, 5000, 'K')).toEqual([])
})

test('45: start without --allow-network refuses also when the permission is in its own environment', async () => {
  for (const value of ['0', '1']) {
    const r = await run(['start', '--dir', fresh('dir'), '--host', '127.0.0.2'], { BRAINSTORM_ALLOW_NETWORK: value })
    expect([value, r.code]).toEqual([value, 1]); expect(r.lines[0]?.error ?? r.out + r.err).toContain('ask the user first, then add --allow-network')
  }
})

test('45: a start that was refused leaves no session folder behind', async () => {
  const dir = fresh('dir')
  expect((await run(['start', '--dir', dir, '--host', '127.0.0.2'])).code).toBe(1)
  expect(readdirSync(dir).filter((f) => !f.startsWith('.'))).toEqual([])
  // without --dir: the folder that start would have made is named after start's own process
  const p = spawn(['start', '--host', '127.0.0.2']); await Promise.race([p.proc.exited, sleep(15000)])
  expect(p.proc.exitCode).toBe(1)
  expect(readdirSync(tmpdir()).filter((f) => f.startsWith(`brainstorm-${p.proc.pid}-`))).toEqual([])
})

test('24: an answer to a request the server could not serve carries the five headers too', async () => {
  const s = await serve()
  rmSync(s.content, { recursive: true, force: true })
  const r = await get(s.base, '/', { Cookie: s.cookie })
  expect(r.status).toBe(500)
  expect(['referrer-policy', 'cache-control', 'x-frame-options', 'content-security-policy', 'cross-origin-resource-policy'].map((h) => r.headers.get(h)))
    .toEqual(['no-referrer', 'no-store', 'DENY', "frame-ancestors 'none'", 'same-origin'])
  expect(s.proc.exitCode).toBeNull()
})

test('13: stop does not signal a live process whose command line does not carry the id of the state folder, when that id is well-formed', async () => {
  const other = Bun.spawn(['sleep', '30']); cleanups.push(() => { other.kill() })
  const session = fresh('stale'); mkdirSync(`${session}/state`, { recursive: true })
  writeFileSync(`${session}/state/server.pid`, `${other.pid}\n`); writeFileSync(`${session}/state/server-instance-id`, `${'0123456789abcdef'.repeat(3)}\n`)
  const r = await run(['stop', session])
  expect(r.lines[0]?.status).toBe('stale_pid')
  expect(readOr(`${session}/state/server-stopped`)).toContain('"reason":"stale_pid"')
  expect(alive(other.pid)).toBe(true)
})

test('31: start names as the owner the process that ran the shell start was called from: the server lives on when that shell ends, and ends when that process dies', async () => {
  const dir = fresh('dir'), out = fresh('start-out')
  // the stand-in for the coding tool: it runs start through a shell, as such a tool does, and stays alive
  const tool = Bun.spawn([process.execPath, '-e', `Bun.spawnSync(['sh', '-c', ${JSON.stringify(`"${process.execPath}" "${SCRIPT}" start --dir "${dir}" > "${out}" 2>&1; exit 0`)}]); setTimeout(() => {}, 60000)`],
    { env: { ...CLEAN, ...SAFE, BRAINSTORM_LIFECYCLE_CHECK_MS: '100' }, stdout: 'ignore', stderr: 'ignore' })
  cleanups.push(() => { tool.kill('SIGKILL') })
  const info = await until(() => jsonLines(readOr(out)).find((l) => l.type === 'server-started'), 10000)
  expect(info).toBeDefined()
  const pid = Number(readOr(`${info!.state_dir}/server.pid`).trim())
  cleanups.push(() => { if (alive(pid)) process.kill(pid, 'SIGKILL') })
  await sleep(700) // the shell has ended long since; the tool lives
  expect(alive(pid)).toBe(true)
  tool.kill('SIGKILL'); await tool.exited
  expect(await until(() => !alive(pid), 8000)).toBe(true)
  expect(readOr(`${info!.state_dir}/server-stopped`)).toContain('"reason":"owner process exited"')
})

test('22: the page of GET /?key=<key> puts that key into the session storage as brainstorm-session-key and goes to /', async () => {
  const s = await serve()
  const html = await (await get(s.base, `/?key=${KEY}`)).text()
  const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
  const stored: [string, string][] = [], went: string[] = []
  new Function('sessionStorage', 'location', code)({ setItem: (k: string, v: string) => stored.push([k, v]) }, { replace: (u: string) => went.push(u) })
  expect(stored).toEqual([['brainstorm-session-key', KEY]])
  expect(went).toEqual(['/'])
})

test('30: a message from a browser puts the end off', async () => {
  const s = await serve({ BRAINSTORM_IDLE_TIMEOUT_MS: '800', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  const w = socket(s.port, { Cookie: s.cookie }); expect(await w.opened).toBe(true)
  for (const end = Date.now() + 2400; Date.now() < end; await sleep(200)) w.ws.send('{"type":"hover"}')
  expect(s.proc.exitCode).toBeNull() // three times the timeout, and still there
})

test('30: a new or changed screen puts the end off', async () => {
  const s = await serve({ BRAINSTORM_IDLE_TIMEOUT_MS: '800', BRAINSTORM_LIFECYCLE_CHECK_MS: '100' })
  let i = 0
  for (const end = Date.now() + 2400; Date.now() < end; await sleep(200)) writeFileSync(`${s.content}/${i < 3 ? `new-${i}` : 'same'}.html`, `<p>${i++}</p>`)
  expect(s.proc.exitCode).toBeNull()
})

test('6: the server listens on the host it was given and on no other: on ::1 it answers there and not on 127.0.0.1', async () => {
  const dir = fresh('session')
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, BRAINSTORM_HOST: '::1' })
  const info = await until(() => jsonLines(p.out()).find((l) => l.type === 'server-started'))
  expect(info?.url).toBe(`http://[::1]:${info?.port}/?key=${KEY}`)
  expect((await fetch(`http://[::1]:${info!.port}/`, { headers: { Cookie: `brainstorm-key-${info!.port}=${KEY}` } })).status).toBe(200)
  expect(await fetch(`http://127.0.0.1:${info!.port}/`).then((r) => `answered ${r.status}`, () => 'no connection')).toBe('no connection')
})

test('35: toggleSelect marks a card selected, alone among the cards of its container', async () => {
  const p = await page()
  const asked: string[] = []
  const container: any = { dataset: {}, matches: (sel: string) => sel === '.cards' }
  const a = element({ dataset: { choice: 'a' }, parent: container }), b = element({ dataset: { choice: 'b' }, parent: container })
  // a container that answers by the selector it is asked with, as a page does
  container.querySelectorAll = (sel: string) => { asked.push(sel); return sel.split(',').map((x) => x.trim()).includes('.card') ? [a, b] : [] }
  p.window.toggleSelect(a); p.window.toggleSelect(b)
  expect([a.classes.has('selected'), b.classes.has('selected')]).toEqual([false, true])
  expect(asked[0].split(',').map((x) => x.trim()).sort()).toEqual(['.card', '.option'])
})

test('41: the type-check covers every TypeScript file of the mock-up server and its tests', () => {
  const include = JSON.parse(readFileSync(join(ROOT, 'tsconfig.json'), 'utf8')).include as string[]
  for (const file of ['scripts/mockup.ts', 'scripts/lib/mockup-helper.ts', 'tests/mockup.test.ts', 'tests/mockup-edges.test.ts']) expect(`${file}: ${include.includes(file)}`).toBe(`${file}: true`)
})

test('42: the licence names the three files it covers, and its copyright holder is named in no other file of the server, its page, its tests or the README', () => {
  const licence = readFileSync(join(ROOT, 'scripts/LICENSE-mockup'), 'utf8')
  for (const file of ['mockup.ts', 'mockup-frame.html', 'lib/mockup-helper.ts']) expect(`${file}: ${licence.includes(file)}`).toBe(`${file}: true`)
  const holder = (licence.match(/^\s*Copyright \(c\) \d{4}\s+(.*\S)\s*$/m) ?? [])[1]?.toLowerCase()
  expect(holder?.length).toBeGreaterThan(2)
  for (const file of ['scripts/mockup.ts', 'scripts/mockup-frame.html', 'scripts/lib/mockup-helper.ts', 'tests/mockup.test.ts', 'tests/mockup-edges.test.ts', 'README.md'])
    expect(`${file}: ${readFileSync(join(ROOT, file), 'utf8').toLowerCase().includes(holder as string)}`).toBe(`${file}: false`)
})

// ---------- from the review of round 2 ----------

test('34: a server on ::1, one of this machine\'s own addresses, opens the browser at the first screen, with its own address', async () => {
  const o = opener(), dir = fresh('session')
  const p = spawn(['serve'], { BRAINSTORM_DIR: dir, BRAINSTORM_TOKEN: KEY, BRAINSTORM_HOST: '::1', BRAINSTORM_OPEN: '1', BRAINSTORM_OPEN_CMD: o.cmd })
  const info = await until(() => jsonLines(p.out()).find((l) => l.type === 'server-started'))
  await sleep(300); writeFileSync(`${dir}/content/one.html`, '<p>one</p>')
  expect(await until(() => o.calls().length > 0 && o.calls())).toEqual([`http://[::1]:${info!.port}/?key=${KEY}`])
})

test('43: the README\'s section of mockup names the other two names of the foreground and the background', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
  const from = readme.indexOf('### `mockup`: the mock-up server of a brainstorm'), section = readme.slice(from, readme.indexOf('\n## ', from))
  expect(from).toBeGreaterThan(0)
  for (const name of ['--no-daemon', '--daemon']) expect(`${name}: ${new RegExp(`\`${name}\``).test(section)}`).toBe(`${name}: true`)
})

test('45: a start in the foreground that was refused leaves no session folder behind either', async () => {
  const dir = fresh('dir')
  const r = await run(['start', '--dir', dir, '--host', '127.0.0.2', '--foreground'])
  expect(r.code).toBe(1); expect(r.out).toContain('ask the user first, then add --allow-network')
  expect(readdirSync(dir).filter((f) => !f.startsWith('.'))).toEqual([])
})

// ---------- from the exploratory test ----------

test('16: a screen that holds the text </body> is served unchanged, and the page script is put at the page\'s own end', async () => {
  const fragment = '<h2>Tricky</h2><script>var a="</body>"; window.marker = a.length;</script><p id="after">after</p>'
  const s = await serve({}, (content) => writeFileSync(`${content}/tricky.html`, fragment))
  const framed = await (await get(s.base, '/', { Cookie: s.cookie })).text()
  expect(framed).toContain(fragment) // not cut in two by the page's script
  expect(framed.indexOf('toggleSelect')).toBeGreaterThan(framed.indexOf('id="after"'))
  await sleep(50)
  const whole = '<!DOCTYPE html><html><body><script>var a="</body>";</script><p id="after">whole after</p></body></html>'
  writeFileSync(`${s.content}/whole.html`, whole); await sleep(50)
  const served = await (await get(s.base, '/', { Cookie: s.cookie })).text()
  expect(served.startsWith('<!DOCTYPE html><html><body><script>var a="</body>";</script><p id="after">whole after</p><script>')).toBe(true)
  expect(served.endsWith('</script>\n</body></html>')).toBe(true)
})

test('18: a new .html that is a link, and so never the screen, sends no reload, keeps events, and is no screen-added', async () => {
  const s = await serve({}, (content, state) => { writeFileSync(`${dirname(content)}/outside.html`, '<p>outside</p>'); writeFileSync(`${state}/events`, '{"choice":"keep-me"}\n') })
  const w = socket(s.port, { Cookie: s.cookie }); expect(await w.opened).toBe(true)
  await sleep(300)
  symlinkSync(`${dirname(s.content)}/outside.html`, `${s.content}/sym.html`); linkSync(`${dirname(s.content)}/outside.html`, `${s.content}/hard.html`)
  await sleep(700)
  expect(w.messages).toEqual([])
  expect(readOr(`${s.state}/events`)).toBe('{"choice":"keep-me"}\n')
  expect(jsonLines(s.out()).filter((l) => l.type === 'screen-added' || l.type === 'screen-updated')).toEqual([])
})

// ---------- from the planted faults that no test caught ----------

test('3: a server run directly, under the usual umask, writes server-info readable by its owner only', async () => {
  expect(process.umask() & 0o077).not.toBe(0o077) // this test process lets others read what it writes, unless told
  const s = await serve()
  expect(mode(`${s.state}/server-info`).toString(8)).toBe('600')
})

test('11: stop keeps a session folder that the caller named, also when its name looks like one of start\'s own', async () => {
  // a session as a caller could have made it: its folder is called brainstorm-…, but it does not lie in the temporary folder itself
  const session = `${fresh('named')}/brainstorm-1-1`, id = 'a'.repeat(40)
  mkdirSync(`${session}/content`, { recursive: true }); mkdirSync(`${session}/state`, { recursive: true }); writeFileSync(`${session}/content/kept.html`, '<p>kept</p>')
  const p = spawn(['serve', `--brainstorm-server-id=${id}`], { BRAINSTORM_DIR: session, BRAINSTORM_TOKEN: KEY })
  await until(() => jsonLines(p.out()).find((l) => l.type === 'server-started'))
  writeFileSync(`${session}/state/server.pid`, `${p.proc.pid}\n`); writeFileSync(`${session}/state/server-instance-id`, `${id}\n`)
  expect((await run(['stop', session])).lines[0]?.status).toBe('stopped')
  expect(existsSync(`${session}/content/kept.html`)).toBe(true)
})

test('13: stop does not signal another session\'s server: a live process that carries the argument with another well-formed id', async () => {
  const theirs = 'b'.repeat(40), ours = 'c'.repeat(40)
  const other = Bun.spawn([process.execPath, '-e', 'setTimeout(() => {}, 30000)', `--brainstorm-server-id=${theirs}`], { stdout: 'ignore', stderr: 'ignore' }); cleanups.push(() => { other.kill() })
  const session = fresh('stale'); mkdirSync(`${session}/state`, { recursive: true })
  writeFileSync(`${session}/state/server.pid`, `${other.pid}\n`); writeFileSync(`${session}/state/server-instance-id`, `${ours}\n`)
  await sleep(150)
  expect((await run(['stop', session])).lines[0]?.status).toBe('stale_pid')
  expect(alive(other.pid)).toBe(true)
})

test('23: the key\'s cookie is found among the other cookies a browser sends to this machine', async () => {
  const s = await serve()
  expect((await get(s.base, '/', { Cookie: `other=1; ${s.cookie}; last=2` })).status).toBe(200)
})
