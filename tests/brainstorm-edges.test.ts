// Tests of scripts/hstack.ts beside the acceptance tests of tests/brainstorm-script.test.ts: the edges the builder
// decided for spec 2 (E-numbers of the decisions file beside the spec). Run: bun test tests/brainstorm-edges.test.ts
// HSTACK_SCRIPT runs another copy of the script (a broken copy that a test must catch).
import { afterAll, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

setDefaultTimeout(60000)
const SCRIPT = process.env.HSTACK_SCRIPT ?? join(import.meta.dir, '../scripts/hstack.ts')
const T = realpathSync(mkdtempSync(join(tmpdir(), 'hstack-brainstorm-edges-')))
const wipe = () => rmSync(T, { recursive: true, force: true })
afterAll(wipe)
process.on('exit', wipe)

const CLEAN: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && k !== 'CLAUDE_PROJECT_DIR' && k !== 'HSTACK_STATE' && k !== 'HSTACK_FEEDBACK_REPO') CLEAN[k] = v
function sh(cmd: string[], cwd: string, env: Record<string, string> = {}, stdin?: string) {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...CLEAN, ...env }, stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString().replace(/\n+$/, ''), err: r.stderr.toString() }
}

test('E6: the stop hook\'s answer for a spec that waits in a changed repository is one whole piece of JSON, and its reason names the playbook\'s item', () => {
  const repo = `${T}/repo`, state = `${T}/state`, env = { HSTACK_STATE: state, CLAUDE_PROJECT_DIR: repo }
  mkdirSync(`${repo}/docs`, { recursive: true })
  const git = (...a: string[]) => sh(['git', ...a], repo)
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false')
  writeFileSync(`${repo}/a.txt`, 'x = 1\n'); git('add', '-A'); expect(git('commit', '-qm', 'base').code).toBe(0)
  const h = (...a: string[]) => sh([process.execPath, SCRIPT, ...a], repo, env)
  sh([process.execPath, SCRIPT, 'hook-start'], repo, env, '{"session_id":"x","source":"startup"}')
  expect(h('start').code).toBe(0)
  writeFileSync(`${repo}/docs/spec.md`, 'the behaviours\n'); expect(h('spec', 'docs/spec.md').code).toBe(0)
  writeFileSync(`${repo}/a.txt`, 'x = 2\n') // built before the approval: the turn may not end
  const out = sh([process.execPath, SCRIPT, 'hook-stop'], repo, env, '{"hook_event_name":"Stop","stop_hook_active":false}').out
  const answer = JSON.parse(out) as { decision: string; reason: string } // a quote inside the reason would break this
  expect(answer.decision).toBe('block')
  expect(answer.reason).toContain("a spec waits for the user's approval and nothing is built before it")
  expect(answer.reason).toContain("the playbook's item 'Show it'")
})
