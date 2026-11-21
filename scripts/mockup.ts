#!/usr/bin/env bun
// The mock-up server of a brainstorm: it shows the newest HTML file of a folder in a browser tab and writes the
// user's clicks on choices to a file the agent reads.
// usage: mockup.ts start [--dir <folder>] [--host <host>] [--url-host <host>] [--idle-timeout-minutes <n>] [--open]
//                        [--foreground|--no-daemon] [--background|--daemon] [--allow-network]
//        mockup.ts stop <session folder>
//        mockup.ts serve          the server itself, which start runs; its settings are BRAINSTORM_* variables
// Third-party work, converted: see LICENSE-mockup beside this file.
import { exec, execFile, execFileSync, spawn } from 'node:child_process'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync, watch, writeFileSync } from 'node:fs'
import { networkInterfaces, release, tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'

type Env = Record<string, string | undefined>
const put = (o: unknown) => console.log(JSON.stringify(o))
const fail = (error: string): never => { put({ error }); process.exit(1) }
const readOr = (file: string) => { try { return readFileSync(file, 'utf8') } catch { return '' } }
const alive = (pid: number) => { try { process.kill(pid, 0); return true } catch (e) { return (e as { code?: string }).code === 'EPERM' } }
const ownerOnly = (file: string) => { try { chmodSync(file, 0o600) } catch { /* best effort */ } }

// ---------- what start and the server decide, as functions a test can call ----------

// The hosts of this machine itself: a server on any other is open to the network and needs the user's word.
const OWN_HOSTS = ['127.0.0.1', 'localhost', '::1']
export const isOwnHost = (host: string) => OWN_HOSTS.includes(host)

// A Windows-like shell reaps a background process and cannot name a process the server could watch.
export function windowsLike(platform: string, env: Env): boolean {
  return platform === 'win32' || Boolean(env.MSYSTEM) || /^(msys|cygwin|mingw)/.test(env.OSTYPE ?? '')
}
// Where start runs the server: the user's flags first, then what the place needs.
export function foregroundChoice(flags: { foreground: boolean; background: boolean }, platform: string, env: Env): boolean {
  if (flags.foreground) return true
  if (flags.background) return false
  return Boolean(env.CODEX_CI) || windowsLike(platform, env)
}
// The command that opens a browser; the address is an argument of its own, so no shell reads it.
export function browserLauncher(url: string, platform: string, osRelease: string, env: Env): { bin: string; args: string[] } | null {
  const wsl = platform === 'linux' && /microsoft/i.test(osRelease)
  if (platform === 'darwin') return { bin: 'open', args: [url] }
  if (platform === 'win32' || wsl) return { bin: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] }
  if (env.DISPLAY || env.WAYLAND_DISPLAY) return { bin: 'xdg-open', args: [url] }
  return null
}
// tailscale: an address of the tailnet ranges 100.64.0.0/10 and fd7a:115c:a1e0::/48; network: any other
export function addressKind(address: string): 'tailscale' | 'network' {
  const v4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(address)
  if (v4) return Number(v4[1]) === 100 && Number(v4[2]) >= 64 && Number(v4[2]) <= 127 ? 'tailscale' : 'network'
  return /^fd7a:115c:a1e0:/i.test(address) ? 'tailscale' : 'network'
}
// The browser is opened only when start was told to (--open), on one of this machine's own addresses, and when no
// browser has the page open already.
export function opensBrowser(host: string, open: string | undefined, connected: number): boolean {
  return Boolean(open) && isOwnHost(host) && connected === 0
}
const hostForUrl = (host: string) => (host.startsWith('[') && host.endsWith(']') ? host : host.includes(':') ? `[${host}]` : host)
// Every address on which a server on this host can be reached from another machine: all of the IPv4 kind for
// 0.0.0.0, all of both kinds for ::, the one address for a host that is named, none for this machine's own.
export function reachableAt(host: string, machine: { address: string; family: string | number; internal: boolean }[], port: number, key: string): { address: string; kind: string; url: string }[] {
  const others = machine.filter((a) => !a.internal)
  const addresses = host === '0.0.0.0' ? others.filter((a) => a.family === 'IPv4' || a.family === 4).map((a) => a.address) : host === '::' ? others.map((a) => a.address) : isOwnHost(host) ? [] : [host]
  return addresses.map((address) => ({ address, kind: addressKind(address), url: `http://${hostForUrl(address)}:${port}/?key=${key}` }))
}

// ---------- serve ----------

function serve(): void {
  const env = process.env
  const HOST = env.BRAINSTORM_HOST || '127.0.0.1'
  // the one place of this check: start only hands the permission on
  if (!isOwnHost(HOST) && !env.BRAINSTORM_ALLOW_NETWORK)
    fail(`--host ${HOST} opens the server to the network: ask the user first, then add --allow-network. The link is not encrypted on a local network.`)
  const URL_HOST = env.BRAINSTORM_URL_HOST || (HOST === '127.0.0.1' ? 'localhost' : HOST)
  const SESSION_DIR = env.BRAINSTORM_DIR || join(tmpdir(), 'brainstorm')
  const CONTENT_DIR = join(SESSION_DIR, 'content')
  const STATE_DIR = join(SESSION_DIR, 'state')
  const PORT_FILE = env.BRAINSTORM_PORT_FILE || ''
  const TOKEN_FILE = env.BRAINSTORM_TOKEN_FILE || ''
  mkdirSync(CONTENT_DIR, { recursive: true }); mkdirSync(STATE_DIR, { recursive: true })

  // an explicit port, else the port this folder's last server had (an open tab connects again), else a random high one
  const randomPort = () => 49152 + Math.floor(Math.random() * 16383)
  const preferredPort = () => {
    if (env.BRAINSTORM_PORT) return Number(env.BRAINSTORM_PORT)
    const p = PORT_FILE ? Number(readOr(PORT_FILE).trim()) : NaN
    return Number.isInteger(p) && p > 1023 && p < 65536 ? p : randomPort()
  }
  // The key rides the URL as ?key= and is mirrored into a cookie at the first load. It is kept beside the port, so
  // that the cookie of an open tab is still good after a restart.
  const newToken = () => randomBytes(32).toString('hex')
  let TOKEN = '', tokenSource = 'generated'
  if (env.BRAINSTORM_TOKEN) { TOKEN = env.BRAINSTORM_TOKEN; tokenSource = 'env' } else {
    const t = TOKEN_FILE ? readOr(TOKEN_FILE).trim() : ''
    if (/^[0-9a-f]{32,}$/i.test(t)) { ownerOnly(TOKEN_FILE); TOKEN = t; tokenSource = 'file' } else TOKEN = newToken()
  }
  let PORT = preferredPort()
  let COOKIE_NAME = `brainstorm-key-${PORT}` // the port that was really taken names it, below

  const idle = Number(env.BRAINSTORM_IDLE_TIMEOUT_MS)
  const IDLE_TIMEOUT_MS = Number.isFinite(idle) && idle > 0 ? idle : 4 * 60 * 60 * 1000
  const check = Number(env.BRAINSTORM_LIFECYCLE_CHECK_MS)
  const LIFECYCLE_CHECK_MS = Number.isFinite(check) && check > 0 ? check : 60 * 1000
  let ownerPid = env.BRAINSTORM_OWNER_PID ? Number(env.BRAINSTORM_OWNER_PID) : 0
  let lastActivity = Date.now()
  const touch = () => { lastActivity = Date.now() }

  // ----- the pages -----
  const version = (() => { try { return String(JSON.parse(readFileSync(join(import.meta.dir, '../.claude-plugin/plugin.json'), 'utf8')).version ?? 'unknown') } catch { return 'unknown' } })()
  const brand = `<div class="brand"><span class="brand-copy">hstack v${version.replace(/[&<>"]/g, '')}</span></div>`
  const branded = (html: string) => html.split('<!-- BRANDING -->').join(brand)
  const frame = readFileSync(join(import.meta.dir, 'mockup-frame.html'), 'utf8')
  const helper = `<script>\n${new Bun.Transpiler({ loader: 'ts' }).transformSync(readFileSync(join(import.meta.dir, 'lib/mockup-helper.ts'), 'utf8'))}\n</script>`
  const waitingPage = () => branded(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Brainstorm Companion</title>
<style>
body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
h1 { color: #333; } p { color: #666; }
.brand { margin-bottom: 1.5rem; color: #666; font-size: 0.9rem; line-height: 1; }
</style>
</head>
<body><!-- BRANDING --><h1>Brainstorm Companion</h1>
<p>Waiting for the agent to push a screen...</p></body></html>`)
  const FORBIDDEN_PAGE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Session key required</title>
<style>body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
h1 { color: #333; } p { color: #666; } code { background: #f0f0f0; padding: 0.1em 0.3em; border-radius: 4px; }</style>
</head>
<body><h1>Session key required</h1>
<p>This page needs the full URL your coding agent gave you, including the
<code>?key=&hellip;</code> part. Copy the complete URL and open it again.</p></body></html>`
  // the page of a first load: it keeps the key for this tab and leaves the URL without it
  const bootstrapPage = (key: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Opening Brainstorm Companion</title></head>
<body>
<script>
try { sessionStorage.setItem('brainstorm-session-key', ${JSON.stringify(key)}); } catch (e) {}
location.replace('/');
</script>
</body>
</html>`
  const MIME: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' }

  // ----- the screens -----
  // a screen or a file is served only when it is a plain file of the content folder: no link leads out of it
  const insideContent = (file: string) => {
    try {
      const st = lstatSync(file)
      if (st.isSymbolicLink() || !st.isFile() || st.nlink !== 1) return false
      return realpathSync(file).startsWith(realpathSync(CONTENT_DIR) + sep)
    } catch { return false }
  }
  const isScreen = (name: string) => !name.startsWith('.') && name.endsWith('.html')
  const newestScreen = () => {
    let best = '', bestTime = -1
    for (const name of readdirSync(CONTENT_DIR)) {
      const file = join(CONTENT_DIR, name)
      if (!isScreen(name) || !insideContent(file)) continue
      const t = statSync(file).mtime.getTime()
      if (t > bestTime) { best = file; bestTime = t }
    }
    return best
  }
  const isFullDocument = (html: string) => { const t = html.trimStart().toLowerCase(); return t.startsWith('<!doctype') || t.startsWith('<html') }

  // ----- the key -----
  const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
  const cookies = (header: string | null) => {
    const out: Record<string, string> = {}
    for (const part of (header ?? '').split(';')) { const eq = part.indexOf('='); if (eq >= 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim() }
    return out
  }
  // the path and the query as the client sent them: nothing is decoded or folded
  const target = (req: Request) => { const u = req.url, at = u.indexOf('/', u.indexOf('//') + 2), raw = at < 0 ? '/' : u.slice(at), q = raw.indexOf('?'); return { path: q < 0 ? raw : raw.slice(0, q), query: new URLSearchParams(q < 0 ? '' : raw.slice(q + 1)) } }
  // a request is let in by the key in the URL or by the cookie; a key in the URL, when there is one, decides alone
  const authorized = (req: Request) => {
    const { query } = target(req)
    if (query.has('key')) { const key = query.get('key'); return Boolean(key && same(key, TOKEN)) }
    const cookie = cookies(req.headers.get('cookie'))[COOKIE_NAME]
    return Boolean(cookie && same(cookie, TOKEN))
  }
  const headers = (more: Record<string, string> = {}) => ({ 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "frame-ancestors 'none'", 'Cross-Origin-Resource-Policy': 'same-origin', ...more })
  const HTML = 'text/html; charset=utf-8'

  // ----- the browsers -----
  type Socket = { send(data: string): unknown; close(): unknown }
  const clients = new Set<Socket>()
  const broadcast = (msg: unknown) => { const text = JSON.stringify(msg); for (const ws of clients) { try { ws.send(text) } catch { clients.delete(ws) } } }
  const onMessage = (text: string) => {
    let event: unknown
    try { event = JSON.parse(text) } catch (e) { console.error('Failed to parse WebSocket message:', (e as Error).message); return }
    touch()
    put({ source: 'user-event', ...(event as object) })
    if (event && (event as { choice?: unknown }).choice) appendFileSync(join(STATE_DIR, 'events'), JSON.stringify(event) + '\n')
  }
  const url = () => `http://${hostForUrl(URL_HOST)}:${PORT}/?key=${TOKEN}`
  // the user's browser is opened once, when the first screen is there to show, and only when start was told to
  let browserOpened = false
  const maybeOpenBrowser = () => {
    if (browserOpened) return
    browserOpened = true
    if (!opensBrowser(HOST, env.BRAINSTORM_OPEN, clients.size)) return
    if (env.BRAINSTORM_OPEN_CMD) { try { exec(`${env.BRAINSTORM_OPEN_CMD} ${JSON.stringify(url())}`, () => {}) } catch { /* best effort */ } return }
    const launcher = browserLauncher(url(), process.platform, release(), env)
    if (launcher) { try { execFile(launcher.bin, launcher.args, () => {}) } catch { /* best effort */ } }
  }

  function answer(req: Request): Response {
    if (!authorized(req)) return new Response(FORBIDDEN_PAGE, { status: 403, headers: headers({ 'Content-Type': HTML }) })
    touch() // only a request with the key counts as use
    // the cookie lets the files of a screen and the WebSocket in after the first load; a page's script cannot read it
    const cookie = { 'Set-Cookie': `${COOKIE_NAME}=${TOKEN}; HttpOnly; SameSite=Strict; Path=/` }
    const { path, query } = target(req)
    if (req.method === 'GET' && path === '/' && query.get('key')) return new Response(bootstrapPage(query.get('key') as string), { headers: headers({ 'Content-Type': HTML, ...cookie }) })
    if (req.method === 'GET' && path === '/') {
      const file = newestScreen()
      let html = file ? ((raw) => (isFullDocument(raw) ? raw : branded(frame).replace('<!-- CONTENT -->', () => raw)))(readFileSync(file, 'utf8')) : waitingPage()
      // at the page's own end: a </body> inside a screen's text or script is the screen's, and stays whole
      const end = html.lastIndexOf('</body>')
      html = end < 0 ? html + helper : `${html.slice(0, end)}${helper}\n${html.slice(end)}`
      return new Response(html, { headers: headers({ 'Content-Type': HTML, ...cookie }) })
    }
    if (req.method === 'GET' && path.startsWith('/files/')) {
      const name = basename(path.slice(7)), file = join(CONTENT_DIR, name)
      if (!name || name.startsWith('.') || !insideContent(file)) return new Response('Not found', { status: 404, headers: headers(cookie) })
      return new Response(readFileSync(file), { headers: headers({ 'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', ...cookie }) })
    }
    return new Response('Not found', { status: 404, headers: headers(cookie) })
  }

  const listen = (port: number) => Bun.serve({
    hostname: HOST, port,
    fetch(req, server) {
      if ((req.headers.get('upgrade') ?? '').toLowerCase() === 'websocket') {
        // a page of another site may reach this port, but not with this origin
        const origin = req.headers.get('origin'), host = req.headers.get('host')
        const ownOrigin = !origin || (Boolean(host) && origin === `http://${host}`)
        if (!authorized(req) || !ownOrigin) return new Response('Forbidden', { status: 403, headers: headers() })
        return server.upgrade(req) ? undefined : new Response('Bad request', { status: 400, headers: headers() })
      }
      return answer(req)
    },
    // a request the server could not serve (the content folder is gone) is answered like any other, and the server goes on
    error() { return new Response('Server error', { status: 500, headers: headers() }) },
    websocket: {
      maxPayloadLength: 10 * 1024 * 1024,
      open(ws) { clients.add(ws) },
      message(_ws, message) { onMessage(typeof message === 'string' ? message : Buffer.from(message).toString()) },
      close(ws) { clients.delete(ws) },
    },
  })
  // when the port is taken (an earlier server may still be alive), one other port is tried
  let fallback = false
  let server: ReturnType<typeof listen>
  try { server = listen(PORT) } catch (e) {
    if ((e as { code?: string }).code !== 'EADDRINUSE') { console.error('Server failed to bind:', (e as Error).message); process.exit(1) }
    if (tokenSource === 'env') { console.error('Server failed to bind: preferred port is in use and BRAINSTORM_TOKEN is set; refusing fallback with explicit token'); process.exit(1) }
    fallback = true
    PORT = randomPort()
    if (tokenSource === 'file') TOKEN = newToken() // the kept key belongs to the server that holds the port
    try { server = listen(PORT) } catch (e2) { console.error('Server failed to bind:', (e2 as Error).message); process.exit(1) }
  }
  COOKIE_NAME = `brainstorm-key-${PORT}`
  // the port and the key are kept for the next start, but not those of a fallback: the kept ones are another server's
  if (PORT_FILE && !fallback) {
    try { writeFileSync(PORT_FILE, String(PORT)) } catch { /* best effort */ }
    if (TOKEN_FILE) { try { writeFileSync(TOKEN_FILE, TOKEN, { mode: 0o600 }); ownerOnly(TOKEN_FILE) } catch { /* best effort */ } }
  }

  // ----- new and changed screens -----
  const known = new Set(readdirSync(CONTENT_DIR).filter(isScreen))
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const watcher = watch(CONTENT_DIR, (_type, filename) => {
    const name = filename ? String(filename) : ''
    if (!name || !isScreen(name)) return
    clearTimeout(timers.get(name))
    timers.set(name, setTimeout(() => {
      timers.delete(name)
      const file = join(CONTENT_DIR, name)
      if (!existsSync(file) || !insideContent(file)) return // gone again, or a link: never the screen
      touch()
      if (!known.has(name)) {
        known.add(name)
        rmSync(join(STATE_DIR, 'events'), { force: true }) // the clicks were on the screen before
        put({ type: 'screen-added', file })
        maybeOpenBrowser()
      } else put({ type: 'screen-updated', file })
      broadcast({ type: 'reload' })
    }, 100))
  })
  watcher.on('error', (e) => console.error('fs.watch error:', (e as Error).message))

  // ----- the end -----
  const shutdown = (reason: string) => {
    put({ type: 'server-stopped', reason })
    rmSync(join(STATE_DIR, 'server-info'), { force: true })
    writeFileSync(join(STATE_DIR, 'server-stopped'), JSON.stringify({ reason, timestamp: Date.now() }) + '\n')
    watcher.close()
    clearInterval(lifecycle)
    for (const ws of clients) { try { ws.close() } catch { /* gone already */ } }
    void server.stop(true)
    process.exit(0)
  }
  const lifecycle = setInterval(() => {
    if (ownerPid && !alive(ownerPid)) shutdown('owner process exited')
    else if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) shutdown('idle timeout')
  }, LIFECYCLE_CHECK_MS)
  // an owner that is dead already was named wrongly: it is not watched, and the idle timeout ends the server
  if (ownerPid && !alive(ownerPid)) { put({ type: 'owner-pid-invalid', pid: ownerPid, reason: 'dead at startup' }); ownerPid = 0 }

  const info: Record<string, unknown> = { type: 'server-started', port: PORT, host: HOST, url_host: URL_HOST, url: url(), screen_dir: CONTENT_DIR, state_dir: STATE_DIR, idle_timeout_ms: IDLE_TIMEOUT_MS }
  if (env.BRAINSTORM_ALLOW_NETWORK) info.reachable_at = reachableAt(HOST, Object.values(networkInterfaces()).flatMap((list) => list ?? []), PORT, TOKEN)
  const line = JSON.stringify(info)
  console.log(line)
  writeFileSync(join(STATE_DIR, 'server-info'), line + '\n', { mode: 0o600 }) // it holds the key
}

// ---------- start ----------

async function start(args: string[]): Promise<void> {
  const env = process.env
  let dir = '', host = '127.0.0.1', urlHost = '', idleMinutes = '', open = false, allow = false
  const flags = { foreground: false, background: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const value = () => { if (i + 1 >= args.length) fail(`${a} needs a value`); return args[++i] }
    if (a === '--dir') dir = value()
    else if (a === '--host') host = value()
    else if (a === '--url-host') urlHost = value()
    else if (a === '--idle-timeout-minutes') idleMinutes = value()
    else if (a === '--open') open = true
    else if (a === '--allow-network') allow = true
    else if (a === '--foreground' || a === '--no-daemon') flags.foreground = true
    else if (a === '--background' || a === '--daemon') flags.background = true
    else fail(`Unknown argument: ${a}`)
  }
  if (!urlHost) urlHost = host === '127.0.0.1' || host === 'localhost' ? 'localhost' : host
  if (idleMinutes !== '' && !/^[0-9]+$/.test(idleMinutes) || idleMinutes !== '' && Number(idleMinutes) < 1) fail('--idle-timeout-minutes must be a positive integer')
  const windows = windowsLike(process.platform, env)
  const foreground = foregroundChoice(flags, process.platform, env)

  process.umask(0o077) // the files of a session hold the key
  const id = `${process.pid}-${Math.floor(Date.now() / 1000)}`
  const childEnv: Record<string, string> = {}
  // the permission to open the server to the network is start's flag alone, never a variable start happens to find
  for (const [k, v] of Object.entries(env)) if (v !== undefined && k !== 'BRAINSTORM_ALLOW_NETWORK') childEnv[k] = v
  let session = join(tmpdir(), `brainstorm-${id}`)
  if (dir) {
    let folder = ''
    try { folder = resolve(dir); mkdirSync(folder, { recursive: true }); if (!statSync(folder).isDirectory()) throw new Error('not a folder') } catch { fail('Cannot create or enter --dir') }
    session = join(folder, id)
    // the port and the key of this folder's last server: a restart takes them again, and an open tab connects
    childEnv.BRAINSTORM_PORT_FILE = join(folder, '.last-port')
    childEnv.BRAINSTORM_TOKEN_FILE = join(folder, '.last-token')
  }
  const state = join(session, 'state')
  mkdirSync(join(session, 'content'), { recursive: true }); mkdirSync(state, { recursive: true })
  const serverId = randomBytes(24).toString('hex')
  writeFileSync(join(state, 'server-instance-id'), serverId + '\n', { mode: 0o600 })

  // The owner is the coding tool's own process: the parent of the shell that tool used to run this command. The
  // shell itself ends as soon as this command does.
  let owner = ''
  if (!windows) {
    try { owner = execFileSync('ps', ['-o', 'ppid=', '-p', String(process.ppid)], { encoding: 'utf8' }).trim() } catch { /* no ps */ }
    if (!owner || owner === '1') owner = String(process.ppid)
  }
  Object.assign(childEnv, { BRAINSTORM_DIR: session, BRAINSTORM_HOST: host, BRAINSTORM_URL_HOST: urlHost, BRAINSTORM_OWNER_PID: owner })
  if (idleMinutes !== '') childEnv.BRAINSTORM_IDLE_TIMEOUT_MS = String(Number(idleMinutes) * 60 * 1000)
  if (open) childEnv.BRAINSTORM_OPEN = '1'
  if (allow) childEnv.BRAINSTORM_ALLOW_NETWORK = '1'
  const command = [import.meta.path, 'serve', `--brainstorm-server-id=${serverId}`]
  const pidFile = join(state, 'server.pid')

  if (foreground) {
    const child = spawn(process.execPath, command, { env: childEnv, stdio: 'inherit' })
    writeFileSync(pidFile, `${child.pid}\n`)
    const code = await new Promise<number>((done) => child.on('exit', (c) => done(c ?? 1)))
    // a server that refused never wrote its line: the session that never was leaves no folder
    if (code !== 0 && !existsSync(join(state, 'server-info')) && !existsSync(join(state, 'server-stopped'))) rmSync(session, { recursive: true, force: true })
    process.exit(code)
  }

  const logFile = join(state, 'server.log')
  const log = openSync(logFile, 'a', 0o600)
  const child = spawn(process.execPath, command, { env: childEnv, stdio: ['ignore', log, log], detached: true })
  let ended = false
  child.on('exit', () => { ended = true })
  child.unref()
  writeFileSync(pidFile, `${child.pid}\n`)
  const lines = () => readOr(logFile).split('\n')
  for (let i = 0; i < 50; i++) {
    const line = lines().find((l) => l.includes('"server-started"'))
    if (line) {
      // a place that reaps background processes shows within two seconds
      for (let j = 0; j < 20 && !ended; j++) await Bun.sleep(100)
      // a server that ended by itself in that time (a short idle timeout) wrote why: it was not killed
      if (ended && !existsSync(join(state, 'server-stopped'))) fail('Server started but was killed. Run start again with --foreground, in a way that keeps the command running')
      console.log(line)
      process.exit(0)
    }
    if (ended) { // the server refused: its own line says why, and the session that never was leaves no folder
      const refusal = lines().find((l) => l.startsWith('{"error"'))
      if (refusal) { rmSync(session, { recursive: true, force: true }); console.log(refusal); process.exit(1) }
      fail(`Server failed to start: ${lines().filter(Boolean).pop() ?? 'no output'}`)
    }
    await Bun.sleep(100)
  }
  fail('Server failed to start within 5 seconds')
}

// ---------- stop ----------

async function stop(session: string | undefined): Promise<void> {
  if (!session) fail('Usage: mockup.ts stop <session folder>')
  const state = join(session as string, 'state'), pidFile = join(state, 'server.pid'), idFile = join(state, 'server-instance-id')
  const mark = (reason: string) => {
    rmSync(join(state, 'server-info'), { force: true })
    try { writeFileSync(join(state, 'server-stopped'), JSON.stringify({ reason, timestamp: Math.floor(Date.now() / 1000) }) + '\n') } catch { /* the folder is gone */ }
  }
  if (!existsSync(pidFile)) { put({ status: 'not_running' }); return }
  const pid = Number(readOr(pidFile).trim())
  // Only a process that carries this session's own id is signalled: after a restart of the machine, the number in a
  // left-over server.pid may be another program's.
  const expected = readOr(idFile).trim()
  const ours = () => {
    if (!Number.isInteger(pid) || pid < 2 || !alive(pid) || !/^[A-Za-z0-9_-]{32,64}$/.test(expected)) return false
    try { return execFileSync('ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim().split(/\s+/).includes(`--brainstorm-server-id=${expected}`) } catch { return false }
  }
  if (!ours()) {
    rmSync(pidFile, { force: true }); rmSync(idFile, { force: true })
    // a server that ended by itself wrote why: that is kept
    if (alive(pid) || !existsSync(join(state, 'server-stopped'))) mark('stale_pid'); else rmSync(join(state, 'server-info'), { force: true })
    put({ status: 'stale_pid' }); return
  }
  try { process.kill(pid) } catch { /* it ended meanwhile */ }
  for (let i = 0; i < 20 && alive(pid); i++) await Bun.sleep(100)
  if (alive(pid)) { try { process.kill(pid, 'SIGKILL') } catch { /* gone */ } await Bun.sleep(100) }
  if (alive(pid)) { put({ status: 'failed', error: 'process still running' }); process.exit(1) }
  for (const f of [pidFile, idFile, join(state, 'server.log')]) rmSync(f, { force: true })
  mark('stop')
  // only a session that start made in the temporary folder by itself is deleted; a folder the caller named is kept
  const real = (p: string) => { try { return realpathSync(p) } catch { return resolve(p) } }
  if (basename(real(session as string)).startsWith('brainstorm-') && dirname(real(session as string)) === real(tmpdir())) rmSync(session as string, { recursive: true, force: true })
  put({ status: 'stopped' })
}

if (import.meta.main) {
  const [verb, ...rest] = process.argv.slice(2)
  if (verb === 'serve') serve()
  else if (verb === 'start') await start(rest)
  else if (verb === 'stop') await stop(rest[0])
  else fail('usage: mockup.ts start [options] | stop <session folder> | serve')
}
