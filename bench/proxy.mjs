#!/usr/bin/env bun
// The API proxy between an arm box and the API: it holds the token (the box never gets it) and refuses every server-side
// tool, so an agent in the box cannot reach the web through the API. It writes only counts, never a header or a body.
import { writeFileSync } from 'node:fs'

const PATHS = new Set(['/v1/messages', '/v1/messages/count_tokens'])
const DROP_IN = new Set(['host', 'authorization', 'x-api-key', 'content-length', 'connection'])
// content-encoding and content-length go too: fetch has already decoded the body, so they would describe bytes we do not send
const DROP_OUT = new Set(['connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade', 'proxy-authenticate', 'proxy-authorization', 'content-encoding', 'content-length'])

const AUTHS = ['authorization', 'x-api-key']

// Any depth, iterative so a deeply nested body cannot overflow the stack: the API fetches a url source itself.
function hasUrlSource(root) {
  const todo = [root]
  while (todo.length) {
    const v = todo.pop()
    if (!v || typeof v !== 'object') continue
    if (v.source && typeof v.source === 'object' && v.source.type === 'url') return true
    todo.push(...Object.values(v))
  }
  return false
}

// body is the request text, parsed once: the caller forwards `obj`, the very object judged (JSON.parse keeps the last of
// duplicate keys, so forwarding the raw bytes could carry what the check never saw). Claude Code's own tools carry no
// `type` or `custom`; a server tool carries another type.
function judge({ method, path, body }) {
  if (method !== 'POST' || !PATHS.has(path.split('?')[0])) return { why: 'path' }
  let obj
  try { obj = JSON.parse(body) } catch { return { why: 'body' } }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { why: 'body' }
  if ('tools' in obj && (!Array.isArray(obj.tools) || obj.tools.some((t) => !t || typeof t !== 'object' || ('type' in t && t.type !== 'custom')))) return { why: 'tool' }
  if ('mcp_servers' in obj) return { why: 'mcp' }
  if ('container' in obj) return { why: 'container' }
  if (hasUrlSource(obj)) return { why: 'source' }
  return { obj }
}

export const refusal = (req) => judge(req).why ?? null

export function serveProxy({ port, upstream, token, authHeader, betas, countsFile, idleTimeout = 255 }) {
  if (!AUTHS.includes(authHeader)) throw new Error('bench proxy: authHeader must be authorization or x-api-key')
  let allowed = 0, refused = 0
  const reasons = {}
  const bump = (r) => { reasons[r] = (reasons[r] ?? 0) + 1 }
  // rewritten whole on every request so the file is never half a line
  const flush = () => writeFileSync(countsFile, `allowed ${allowed} refused ${refused}${Object.keys(reasons).sort().map((k) => ` ${k}=${reasons[k]}`).join('')}\n`)
  flush()

  return Bun.serve({
    port,
    idleTimeout,
    development: false,
    error: () => Response.json({ type: 'error', error: { type: 'api_error', message: 'bench proxy: internal error' } }, { status: 500 }),
    async fetch(req, server) {
      const url = new URL(req.url)
      const { why, obj } = judge({ method: req.method, path: url.pathname + url.search, body: await req.text() })
      if (why) {
        refused++; bump(why); flush()
        return Response.json({ type: 'error', error: { type: 'permission_error', message: `bench proxy: refused ${why}` } }, { status: 403 })
      }
      allowed++; flush()
      server.timeout(req, 0) // idleTimeout would cut a model's long silence and abort the upstream call
      const headers = new Headers()
      for (const [k, v] of req.headers) if (!DROP_IN.has(k)) headers.set(k, v)
      if (authHeader === 'authorization') headers.set('authorization', `Bearer ${token}`)
      else headers.set(authHeader, token)
      if (betas.length) headers.set('anthropic-beta', [headers.get('anthropic-beta'), ...betas].filter(Boolean).join(','))
      try {
        const up = await fetch(upstream + url.pathname + url.search, { method: 'POST', headers, body: JSON.stringify(obj), signal: req.signal, redirect: 'manual', timeout: false })
        const out = new Headers()
        for (const [k, v] of up.headers) if (!DROP_OUT.has(k)) out.set(k, v)
        return new Response(up.body, { status: up.status, headers: out })
      } catch {
        bump('upstream'); flush()
        return new Response('bench proxy: upstream failed', { status: 502 })
      }
    },
  })
}

if (import.meta.main && process.argv[2] === 'serve') {
  const e = process.env
  if (!e.BENCH_PROXY_TOKEN) { console.error('bench proxy: BENCH_PROXY_TOKEN is not set'); process.exit(2) }
  if (e.BENCH_PROXY_AUTH && !AUTHS.includes(e.BENCH_PROXY_AUTH)) { console.error('bench proxy: BENCH_PROXY_AUTH must be authorization or x-api-key'); process.exit(2) }
  serveProxy({
    port: Number(e.BENCH_PROXY_PORT || 8080),
    upstream: e.BENCH_PROXY_UPSTREAM || 'https://api.anthropic.com',
    token: e.BENCH_PROXY_TOKEN,
    authHeader: e.BENCH_PROXY_AUTH || 'authorization',
    betas: (e.BENCH_PROXY_BETAS || '').split(',').filter(Boolean),
    countsFile: e.BENCH_PROXY_COUNTS || '/out/proxy-counts.txt',
  })
}
