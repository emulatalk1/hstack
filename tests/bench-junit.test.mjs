import { test, expect } from 'bun:test'
import { readJunit, checkId } from '../bench/lib/junit.mjs'

test('reads pass, fail and skip test cases', () => {
  const xml = `<testsuites><testsuite><testcase name="d82f2b0-T7 refuses spaces"/>
    <testcase name="d82f2b0-T8 trims"><failure message="Expected: 400">stack</failure></testcase>
    <testcase name="x-T1 later"><skipped/></testcase></testsuite></testsuites>`
  expect(readJunit(xml)).toEqual([
    { name: 'd82f2b0-T7 refuses spaces', status: 'pass', message: '' },
    { name: 'd82f2b0-T8 trims', status: 'fail', message: 'Expected: 400\nstack' },
    { name: 'x-T1 later', status: 'skip', message: '' },
  ])
})
test('decodes entities and keeps Vietnamese letters', () => {
  const xml = '<testcase name="a-T1 &quot;Lọc bất động sản&quot; &amp; Back"><error message="PRECONDITION: no form"/></testcase>'
  expect(readJunit(xml)).toEqual([{ name: 'a-T1 "Lọc bất động sản" & Back', status: 'fail', message: 'PRECONDITION: no form' }])
})
test('a Playwright failure keeps the assertion error from the element text', () => {
  const xml = '<testcase name="a-T2 x" classname="a.spec.ts"><failure message="a.spec.ts:3:1 a-T2 x" type="FAILURE">Error: PRECONDITION: no form&#10;&#10;  12 |   x</failure></testcase>'
  const [r] = readJunit(xml)
  expect(r.name).toBe('a-T2 x')
  expect(r.status).toBe('fail')
  expect(r.message.split('\n')).toContain('Error: PRECONDITION: no form')
})
test('checkId takes the id at the start of a name', () => {
  expect(checkId('24c426f-T3 an import fails')).toBe('24c426f-T3')
  expect(checkId('no id here')).toBe(null)
})
