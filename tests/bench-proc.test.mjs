import { test, expect } from 'bun:test'
import { runGroup } from '../bench/lib/proc.mjs'

const pgrep = (pat) => Bun.spawnSync(['pgrep', '-f', pat]).stdout.toString().trim()

test('runGroup returns the output and kills what the command left running after a normal exit', async () => {
  const mark = `sleep ${5000 + Math.floor(Math.random() * 900)}`
  const t0 = Date.now()
  const r = await runGroup(['sh', '-c', `${mark} & echo hi; exit 4`], { stdout: 'pipe', stderr: 'ignore', timeoutSec: 30 })
  expect(r).toEqual({ out: 'hi\n', code: 4 })
  expect(Date.now() - t0).toBeLessThan(10000)
  expect(pgrep(mark)).toBe('')
})

test('runGroup kills the whole group on timeout and says timeout', async () => {
  const mark = `sleep ${6000 + Math.floor(Math.random() * 900)}`
  const t0 = Date.now()
  const r = await runGroup(['sh', '-c', `${mark} & ${mark}`], { stdout: 'ignore', stderr: 'ignore', timeoutSec: 1 })
  expect(r).toEqual({ out: undefined, code: 'timeout' })
  expect(Date.now() - t0).toBeLessThan(10000)
  expect(pgrep(mark)).toBe('')
})
