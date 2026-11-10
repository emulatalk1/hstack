import { test, expect, afterAll } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { refusal, serveProxy } from '../bench/proxy.mjs'

// A local fake upstream records what the proxy forwards; nothing leaves localhost.
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-proxy-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const seen = []
let firstRead // resolved by the streaming test once the client has read the first chunk
const gate = new Promise((r) => { firstRead = r })
const upstream = Bun.serve({
  port: 0,
  async fetch(req) {
    seen.push({ method: req.method, url: new URL(req.url).pathname + new URL(req.url).search, headers: Object.fromEntries(req.headers), body: await req.text() })
    const mode = req.headers.get('x-fake')
    if (mode === 'late') { await Bun.sleep(6000); return Response.json({ ok: 'late' }) }
    if (mode === 'pause') {
      const enc = new TextEncoder()
      return new Response(new ReadableStream({ async start(c) { c.enqueue(enc.encode('a')); await Bun.sleep(6000); c.enqueue(enc.encode('b')); c.close() } }))
    }
    if (new URL(req.url).pathname === '/stream') {
      const enc = new TextEncoder()
      const body = new ReadableStream({
        async start(c) {
          c.enqueue(enc.encode('data: one\n\n'))
          await gate // the rest goes out only after the client has read the first chunk, so a buffering proxy hangs
          c.enqueue(enc.encode('data: two\n\n')); c.enqueue(enc.encode('data: three\n\n'))
          c.close()
        },
      })
      return new Response(body, { headers: { 'content-type': 'text/event-stream' } })
    }
    return Response.json({ ok: true })
  },
})
afterAll(() => upstream.stop(true))

let n = 0
const start = (over = {}) => {
  const countsFile = join(tmp, `counts-${n++}.txt`)
  const proxy = serveProxy({ port: 0, upstream: `http://localhost:${upstream.port}`, token: 'real-token', authHeader: 'authorization', betas: [], countsFile, ...over })
  afterAll(() => proxy.stop(true))
  return { url: `http://localhost:${proxy.port}`, countsFile }
}
const post = (url, path, body, headers = {}) =>
  fetch(url + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
const counts = (f) => readFileSync(f, 'utf8')

test('the proxy refuses server tools and other paths', async () => {
  const { url, countsFile } = start()
  const model = { model: 'anything', messages: [] }
  const cases = [
    ['/v1/messages', { ...model, tools: [{ type: 'web_search_20250305', name: 'web_search' }] }, 'tool'],
    ['/v1/messages', { ...model, tools: [{ type: 'web_fetch_20250910', name: 'web_fetch' }] }, 'tool'],
    ['/v1/messages', { ...model, mcp_servers: [{ name: 'x' }] }, 'mcp'],
    ['/v1/messages', { ...model, container: 'c1' }, 'container'],
    ['/v1/files', model, 'path'],
    ['/v1/messages', 'not json', 'body'],
    ['/v1/messages', '[1]', 'body'],
  ]
  for (const [path, body, reason] of cases) {
    const r = await post(url, path, body)
    expect(r.status).toBe(403)
    expect(await r.json()).toEqual({ type: 'error', error: { type: 'permission_error', message: `bench proxy: refused ${reason}` } })
  }
  const get = await fetch(url + '/v1/models')
  expect(get.status).toBe(403)
  expect(seen.length).toBe(0)
  expect(counts(countsFile)).toBe('allowed 0 refused 8 body=2 container=1 mcp=1 path=2 tool=2\n')

  for (const body of [
    { ...model, tools: [{ name: 'Bash', input_schema: {} }, { type: 'custom', name: 'Read', input_schema: {} }] },
    { model: 'some-other-model', messages: [] },
  ]) expect((await post(url, '/v1/messages?beta=true', body)).status).toBe(200)
  expect((await post(url, '/v1/messages/count_tokens', model)).status).toBe(200)
  expect(counts(countsFile)).toBe('allowed 3 refused 8 body=2 container=1 mcp=1 path=2 tool=2\n')
  expect(seen.at(-3).url).toBe('/v1/messages?beta=true')
})

test('refusal is pure and checks the path before the body', () => {
  expect(refusal({ method: 'POST', path: '/v1/messages', body: '{}' })).toBeNull()
  expect(refusal({ method: 'GET', path: '/v1/messages', body: '' })).toBe('path')
  expect(refusal({ method: 'POST', path: '/v1/messages/', body: '{}' })).toBe('path')
  expect(refusal({ method: 'POST', path: '/v1/files', body: 'not json' })).toBe('path')
})

test('the proxy puts the token in the configured header and drops the incoming one', async () => {
  seen.length = 0
  const a = start({ betas: ['b-one', 'b-two'] })
  await post(a.url, '/v1/messages', { messages: [] }, { authorization: 'Bearer placeholder', 'x-api-key': 'placeholder', 'anthropic-beta': 'client-beta', 'anthropic-version': '2023-06-01' })
  const h = seen.at(-1).headers
  expect(h.authorization).toBe('Bearer real-token')
  expect(h['x-api-key']).toBeUndefined()
  expect(h['anthropic-beta']).toBe('client-beta,b-one,b-two')
  expect(h['anthropic-version']).toBe('2023-06-01')

  const b = start({ authHeader: 'x-api-key', betas: ['b-one'] })
  await post(b.url, '/v1/messages', { messages: [] }, { authorization: 'Bearer placeholder', 'x-api-key': 'placeholder' })
  const g = seen.at(-1).headers
  expect(g['x-api-key']).toBe('real-token')
  expect(g.authorization).toBeUndefined()
  expect(g['anthropic-beta']).toBe('b-one')
})

test('the proxy streams the answer', async () => {
  // the shared fake streams only on /stream, which the proxy would refuse, so a second fake streams on every path
  const up = Bun.serve({ port: 0, fetch: () => upstream.fetch(new Request('http://x/stream')) })
  afterAll(() => up.stop(true))
  const p = start({ upstream: `http://localhost:${up.port}` })
  const res = await post(p.url, '/v1/messages', { messages: [] })
  const got = []
  for await (const chunk of res.body) { got.push(new TextDecoder().decode(chunk)); firstRead() }
  expect(got.join('')).toBe('data: one\n\ndata: two\n\ndata: three\n\n')
  expect(got.length).toBeGreaterThan(1) // not buffered into one piece
})

test('an upstream failure is a 502 counted apart from refusals', async () => {
  const dead = Bun.serve({ port: 0, fetch: () => new Response('x') })
  const port = dead.port
  dead.stop(true)
  const { url, countsFile } = start({ upstream: `http://localhost:${port}` })
  expect((await post(url, '/v1/messages', { messages: [] })).status).toBe(502)
  expect(counts(countsFile)).toBe('allowed 1 refused 0 upstream=1\n')
})

test('no log line holds a header or a body', async () => {
  const { url, countsFile } = start()
  const secret = 'SECRET-BODY-TEXT'
  await post(url, '/v1/messages', { messages: [{ role: 'user', content: secret }], tools: [{ type: 'web_search_x' }] }, { authorization: 'Bearer SECRET-HEADER' })
  await post(url, '/v1/messages', { messages: [{ role: 'user', content: secret }] }, { authorization: 'Bearer SECRET-HEADER' })
  const text = counts(countsFile)
  expect(text).toMatch(/^allowed \d+ refused \d+( [a-z]+=\d+)*\n$/)
  expect(text).not.toContain('SECRET')
  expect(text).not.toContain('real-token')
})

test('a response silent for longer than the idle timeout still arrives', async () => {
  const { url } = start({ idleTimeout: 1 })
  const late = post(url, '/v1/messages', { messages: [] }, { 'x-fake': 'late' }).then((r) => r.json())
  const pause = post(url, '/v1/messages', { messages: [] }, { 'x-fake': 'pause' }).then((r) => r.text())
  expect(await late).toEqual({ ok: 'late' })
  expect(await pause).toBe('ab')
}, 20000) // Bun checks idleness in ~4 s steps, so a 1 s timeout cuts a 6 s silence

test('the proxy forwards exactly the object it judged', async () => {
  seen.length = 0
  const { url } = start()
  // JSON.parse keeps the last duplicate key; the bytes must not differ from what was judged
  const hidden = '{"model":"m","tools":[{"type":"web_search_20250305","name":"w"}],"tools":[]}'
  expect((await post(url, '/v1/messages', hidden)).status).toBe(200)
  expect(seen.at(-1).body).not.toContain('web_search')
  const shown = '{"model":"m","tools":[],"tools":[{"type":"web_search_20250305","name":"w"}]}'
  expect((await post(url, '/v1/messages', shown)).status).toBe(403)
})

test('the proxy refuses a url source anywhere in the body', async () => {
  const { url, countsFile } = start()
  const doc = { type: 'document', source: { type: 'url', url: 'http://example.test/a.pdf' } }
  const img = { type: 'image', source: { type: 'url', url: 'http://example.test/a.png' } }
  const msg = (c) => ({ model: 'm', messages: [{ role: 'user', content: c }] })
  const bad = [
    msg([doc]),
    msg([img]),
    msg([{ type: 'tool_result', tool_use_id: 't', content: [doc] }]),
    msg([{ type: 'tool_result', tool_use_id: 't', content: [{ type: 'text', text: 'x' }, img] }]),
    { model: 'm', system: [doc], messages: [] },
    { model: 'm', messages: [], source: { type: 'url', url: 'http://example.test' } },
  ]
  for (const b of bad) {
    const r = await post(url, '/v1/messages', b)
    expect(r.status).toBe(403)
    expect((await r.json()).error.message).toBe('bench proxy: refused source')
  }
  expect(counts(countsFile)).toBe(`allowed 0 refused ${bad.length} source=${bad.length}\n`)
  const ok = msg([{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } }, { type: 'text', text: 'source' }])
  expect((await post(url, '/v1/messages', ok)).status).toBe(200)
})

test('the proxy fails closed', async () => {
  const { url } = start()
  for (const tools of ['x', null, {}, ['x'], [null]]) {
    const r = await post(url, '/v1/messages', { model: 'm', tools })
    expect([tools, r.status]).toEqual([tools, 403])
    expect((await r.json()).error.message).toBe('bench proxy: refused tool')
  }
  expect(refusal({ method: 'POST', path: '/v1/messages', body: '{"tools":[]}' })).toBeNull()

  for (const authHeader of ['Authorization', 'x-other', '']) expect(() => start({ authHeader })).toThrow()

  // a handler that throws answers a fixed 500 and says nothing of the cause
  const broken = start()
  rmSync(broken.countsFile)
  mkdirSync(broken.countsFile)
  const r = await post(broken.url, '/v1/messages', { model: 'm', messages: [] })
  expect(r.status).toBe(500)
  const text = await r.text()
  expect(JSON.parse(text)).toEqual({ type: 'error', error: { type: 'api_error', message: 'bench proxy: internal error' } })
})

test('serve exits 2 on a missing token or a bad auth name, naming no value', () => {
  const run = (env) => Bun.spawnSync(['bun', join(import.meta.dir, '../bench/proxy.mjs'), 'serve'], { env: { PATH: process.env.PATH, ...env }, stdout: 'pipe', stderr: 'pipe' })
  for (const env of [{}, { BENCH_PROXY_TOKEN: 'tok-xyz', BENCH_PROXY_AUTH: 'bogus-name' }]) {
    const r = run(env)
    expect(r.exitCode).toBe(2)
    const out = r.stdout.toString() + r.stderr.toString()
    expect(out).not.toContain('tok-xyz')
    expect(out).not.toContain('bogus-name')
  }
})
