#!/usr/bin/env bun
// Stick v1 (prereg step 10, rulings 5 and 6): hash every file of the measuring stick under <data>, and compare a lock
// or a manifest with the files as they are now. Prints counts and paths only, never a file's content.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { dataDir } from './oracle.mjs'

const USAGE = 'usage: bun bench/stick.mjs hash --out <file> | compare <file> [--reasons <tsv>]'
const REPO = resolve(import.meta.dir, '..')
const sha256 = (f) => new Bun.CryptoHasher('sha256').update(readFileSync(f)).digest('hex')
const bytewise = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))
// ruling 5: the files left out by name (`*` is one path segment)
const LEFT_FILES = {
  secret: new Bun.Glob('{arm/box.env,step9/pages/*.token}'),
  transcript: new Bun.Glob('results/*/*.jsonl'),
  rewritten: new Bun.Glob('{*/docker.json,*/build/readiness.tsv,ext/removed.txt}'),
}
// a git store is a folder directly under one of these; inside it only its identity and its refs are hashed
const STORE_PARENTS = new Set(['ext/repos', 'seeded/repos'])
const STORE_KEEP = /^(HEAD|config|shallow|packed-refs|refs|refs\/.+|objects|objects\/info|objects\/info\/alternates)$/

export function hashTree(root) {
  const left = { link: 0, node_modules: 0, store: 0, secret: 0, transcript: 0, rewritten: 0 }
  const files = []
  // the Dirent's own type, never a stat: a link is counted and not followed; a folder left out counts once
  const walk = (dir, rel, store) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name
      if (e.isSymbolicLink()) left.link++
      else if (store && !STORE_KEEP.test(p.slice(store.length + 1))) left.store++
      else if (e.isDirectory()) {
        if (e.name === 'node_modules') left.node_modules++
        else walk(join(dir, e.name), p, store ?? (STORE_PARENTS.has(rel) ? p : null))
      } else if (e.isFile()) {
        const kind = Object.keys(LEFT_FILES).find((k) => LEFT_FILES[k].match(p))
        if (kind) left[kind]++
        else files.push(p)
      }
    }
  }
  walk(root, '', null)
  files.sort(bytewise)
  return { lines: files.map((p) => `${sha256(join(root, p))}  ${p}`), left }
}

export const parseReasons = (tsv) => tsv.split('\n').filter((l) => l.trim()).map((l) => {
  const i = l.indexOf('\t')
  if (i < 1) throw new Error(`reasons: not <glob>\t<reason>: ${l}`)
  return { glob: l.slice(0, i), reason: l.slice(i + 1) }
})
export const reasonOf = (path, reasons) => reasons.find((r) => new Bun.Glob(r.glob).match(path))?.reason ?? null

function hash(out) {
  const { lines, left } = hashTree(dataDir())
  writeFileSync(out, lines.join('\n') + '\n')
  console.log(`stick hash: files ${lines.length}, ${Object.entries(left).map(([k, v]) => `${k} ${v}`).join(', ')}`)
  // root-level files count under `.`
  const tops = new Map()
  for (const l of lines) { const p = l.slice(66), t = p.includes('/') ? p.slice(0, p.indexOf('/')) : '.'; tops.set(t, (tops.get(t) ?? 0) + 1) }
  for (const t of [...tops.keys()].sort(bytewise)) console.log(`stick hash ${t} ${tops.get(t)}`)
  return 0
}

function compare(file, reasonsTsv) {
  const reasons = reasonsTsv === undefined ? [] : parseReasons(readFileSync(reasonsTsv, 'utf8'))
  const data = dataDir()
  // the last line of a path supersedes earlier ones
  const want = new Map()
  for (const l of readFileSync(file, 'utf8').split('\n')) { const m = l.match(/^([0-9a-f]{64})  (.+)$/); if (m) want.set(m[2], m[1]) }
  const state = new Map()
  for (const [p, h] of want) {
    const f = p.startsWith('progress/') ? join(REPO, p) : join(data, p)
    state.set(p, !existsSync(f) ? 'missing' : sha256(f) === h ? 'equal' : 'changed')
  }
  const of = (s) => [...state].filter(([, v]) => v === s).map(([p]) => p)
  const changed = of('changed'), missing = of('missing')
  const unexplained = [...changed, ...missing].filter((p) => reasonOf(p, reasons) === null).length
  console.log(`stick compare ${file}: hashed=${want.size} equal=${of('equal').length} changed=${changed.length} missing=${missing.length} unexplained=${unexplained}`)
  for (const p of changed) console.log(`changed ${p} ${reasonOf(p, reasons) ?? 'unexplained'}`)
  for (const p of missing) console.log(`missing ${p} ${reasonOf(p, reasons) ?? 'unexplained'}`)
  // per glob, every hashed path it matches (not first-match): a predicted change that did not happen shows as changed=0
  for (const { glob } of reasons) {
    const g = new Bun.Glob(glob), hit = [...state].filter(([p]) => g.match(p))
    console.log(`reason ${glob} changed=${hit.filter(([, v]) => v === 'changed').length} equal=${hit.filter(([, v]) => v === 'equal').length}`)
  }
  return missing.length || unexplained ? 1 : 0
}

export async function stick(args) {
  const [cmd, a, b, c] = args
  if (cmd === 'hash' && a === '--out' && b && args.length === 3) return hash(b)
  if (cmd === 'compare' && a && (args.length === 2 || (args.length === 4 && b === '--reasons' && c))) return compare(a, c)
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await stick(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
