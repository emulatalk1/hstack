import { test, expect, afterAll } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { replaySummary } from '../bench/replay-summary.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-summary-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))
let n = 0
const fixture = (bugs, files) => { // bugs: [{ id, severity?, dropped?, description? }]; files: { name: content }
  const dir = join(tmp, `f${n++}`), res = join(dir, 'results'), folder = join(dir, 'bugs')
  mkdirSync(res, { recursive: true }); mkdirSync(folder)
  for (const b of bugs) writeFileSync(join(folder, `${b.id}.json`), JSON.stringify(b))
  for (const [name, text] of Object.entries(files)) writeFileSync(join(res, name), typeof text === 'string' ? text : JSON.stringify(text))
  return { res, folder }
}
const record = (id, layer, verdict, extra = {}) => ({ id, layer, sealed: false, verdict, models: { layer: ['claude-x'], judge: ['claude-y'] },
  usage: { layer: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }, judge: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 } }, ...extra })
const row = (md, set, first) => {
  const sec = md.split('## ').find((s) => s.startsWith(`${set}\n`))
  return sec.split('\n').find((l) => l.startsWith(`| ${first} |`))?.split('|').slice(2, -1).map((c) => c.trim())
}

test('counts caught, missed and error per layer and set', () => {
  const a = fixture([{ id: 'ho-01' }, { id: 'ho-02' }, { id: 'ho-03' }, { id: 'ho-04', dropped: 'x' }, { id: 'ho-05' }], {
    'ho-01-unit.out': 'FAIL t\nho-01 caught\n', 'ho-02-unit.out': 'ho-02 missed\n', 'ho-03-unit.out': 'ho-03 error\n',
    'ho-04-unit.out': 'ho-04 caught\n', 'ho-09-unit.out': 'ho-09 caught\n', // dropped bug and a bug in no set: ignored
    'ho-01-review.json': record('ho-01', 'review', 'caught'), 'ho-02-review.json': record('ho-02', 'review', 'missed'),
    'baseline-re-69ebe27-unit.xml': '<testsuite/>',
  })
  const md = replaySummary(['--set', `ho=${a.folder}`, a.res])
  expect(row(md, 'ho', 'unit')).toEqual(['3', '1', '1', '1', '50.0%'])
  expect(row(md, 'ho', 'review')).toEqual(['2', '1', '1', '0', '50.0%'])
  expect(row(md, 'ho', 'e2e')).toEqual(['0', '0', '0', '0', 'n/a'])
})

test('an empty .out or a lone .error1 file counts as error', () => {
  const a = fixture([{ id: 'ho-01' }, { id: 'ho-02' }, { id: 'ho-03' }, { id: 'ho-04' }, { id: 'ho-05' }], {
    'ho-01-unit.out': '', 'ho-02-unit.error1.out': '', 'ho-03-unit.error1.out': '', 'ho-03-unit.out': 'ho-03 caught\n', // the rerun succeeded
    'ho-04-unit.out': 'ho-04 patch does not apply\n', 'ho-05-review.error1.json': record('ho-05', 'review', 'caught'),
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(row(md, 'ho', 'unit')).toEqual(['4', '1', '0', '3', '100.0%'])
  expect(row(md, 'ho', 'review')).toEqual(['1', '0', '0', '1', 'n/a'])
})

test('unit+int counts a bug caught by either', () => {
  const a = fixture([{ id: 'ho-01' }, { id: 'ho-02' }, { id: 'ho-03' }, { id: 'ho-04' }], {
    'ho-01-unit.out': 'ho-01 caught\n', 'ho-01-int.out': 'ho-01 missed\n',
    'ho-02-unit.out': 'ho-02 missed\n', 'ho-02-int.out': 'ho-02 caught\n',
    'ho-03-unit.out': 'ho-03 missed\n', 'ho-03-int.out': 'ho-03 missed\n',
    'ho-04-unit.out': 'ho-04 error\n', 'ho-04-int.out': 'ho-04 missed\n',
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(row(md, 'ho', 'unit+int')).toEqual(['4', '2', '1', '1', '66.7%'])
})

test('weighted rate uses 3/2/1 and leaves error runs out', () => {
  const a = fixture([{ id: 'ho-01', severity: 'high' }, { id: 'ho-02', severity: 'medium' }, { id: 'ho-03', severity: 'low' }, { id: 'ho-04', severity: 'high' }, { id: 'ho-05', severity: 'low' }], {
    'ho-01-unit.out': 'ho-01 caught\n', 'ho-02-unit.out': 'ho-02 missed\n', 'ho-03-unit.out': 'ho-03 caught\n',
    'ho-04-unit.out': 'ho-04 error\n', // a high bug that errored: out of numerator and denominator
    'ho-05-unit.out': 'ho-05 missed\n',
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(md).toContain('| unit | 4 | 7 | 57.1% |') // caught 3+1, missed 2+1; the errored high bug is out
  const plain = fixture([{ id: 'ho-01' }], { 'ho-01-unit.out': 'ho-01 caught\n' })
  expect(replaySummary([plain.res, '--set', `p=${plain.folder}`])).not.toContain('Severity-weighted')
})

test('prints no description, quote or finding even when the files hold them', () => {
  const a = fixture([{ id: '69ebe27-01', fix: 'deadbeef1234', description: 'SECRET-DESC', severity: 'high', hunks: [{ file: 'src/secret-file.ts', old: 3 }], patch: 'SECRET-PATCH' }], {
    '69ebe27-01-review.json': record('69ebe27-01', 'review', 'caught', { findings: ['SECRET-FINDING'], quote: 'SECRET-QUOTE', models: { layer: ['SECRET-MODEL'], judge: ['claude-y'] } }),
    '69ebe27-01-unit.out': 'FAIL SECRET-TITLE\n69ebe27-01 caught\n',
  })
  const md = replaySummary([a.res, '--set', `dev=${a.folder}`])
  for (const s of ['SECRET', 'deadbeef', 'secret-file']) expect(md).not.toContain(s)
  expect(md).toContain('| 69ebe27-01 |')
  expect(md).toContain('11/22/33/44') // layer + judge usage summed
  expect(md).toContain('claude-y,other-value') // a model name outside claude-<a-z0-9-> is not printed
})

test('usage sums an errored first run too while the verdict is the rerun\'s', () => {
  const a = fixture([{ id: 'ho-01' }], {
    'ho-01-review.error1.json': record('ho-01', 'review', 'error'), 'ho-01-review.json': record('ho-01', 'review', 'missed'),
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(row(md, 'ho', 'review')).toEqual(['1', '0', '1', '0', '0.0%'])
  expect(md).toContain('| review | 2 | 22/44/66/88 | claude-x,claude-y |')
})

test('a severity that is an Object.prototype name is left out, and the unweighted bugs are counted', () => {
  const a = fixture([{ id: 'ho-01', severity: 'high' }, { id: 'ho-02', severity: 'constructor' }, { id: 'ho-03' }], {
    'ho-01-unit.out': 'ho-01 caught\n', 'ho-02-unit.out': 'ho-02 missed\n', 'ho-03-unit.out': 'ho-03 missed\n',
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(md).toContain('| unit | 3 | 3 | 100.0% |')
  expect(md).toContain('unweighted bugs (no severity): 2')
})

test('a models field that is not an array does not throw and prints as other-value', () => {
  const a = fixture([{ id: 'ho-01' }, { id: 'ho-02' }], {
    'ho-01-review.json': record('ho-01', 'review', 'caught', { models: { layer: 'SECRET-STR', judge: 7 } }),
    'ho-02-review.json': record('ho-02', 'review', 'caught', { models: 'SECRET-TOP' }),
  })
  const md = replaySummary([a.res, '--set', `ho=${a.folder}`])
  expect(md).not.toContain('SECRET')
  expect(md).toContain('| review | 2 | 22/44/66/88 | other-value |')
})
