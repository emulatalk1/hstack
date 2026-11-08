import { test, expect, afterAll } from 'bun:test'
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { refusal, serveProxy } from '../bench/proxy.mjs'

// A local fake upstream records what the proxy forwards; nothing leaves localhost.
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-proxy-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const seen = []
const upstream = Bun.serve({
  port: 0,
  fetch(req) {
    seen.push({ method: req.method, url: new URL(req.url).pathname + new URL(req.url).search, headers: Object.fromEntries(req.headers) })
    if (new URL(req.url).pathname === '/stream') {
      const enc = new TextEncoder()
      const body = new ReadableStream({
        async start(c) {
          for (const s of ['one', 'two', 'three']) { c.enqueue(enc.encode(`data: ${s}\n\n`)); await Bun.sleep(60) }
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
  for await (const chunk of res.body) got.push(new TextDecoder().decode(chunk))
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
