import { test, expect } from 'bun:test'
import { readJunit, checkId } from '../bench/lib/junit.mjs'

test('reads pass, fail and skip test cases', () => {
  const xml = `<testsuites><testsuite><testcase name="d82f2b0-T7 refuses spaces"/>
    <testcase name="d82f2b0-T8 trims"><failure message="Expected: 400">stack</failure></testcase>
    <testcase name="x-T1 later"><skipped/></testcase></testsuite></testsuites>`
  expect(readJunit(xml)).toEqual([
    { name: 'd82f2b0-T7 refuses spaces', classname: '', status: 'pass', message: '' },
    { name: 'd82f2b0-T8 trims', classname: '', status: 'fail', message: 'Expected: 400\nstack' },
    { name: 'x-T1 later', classname: '', status: 'skip', message: '' },
  ])
})
test('reads the classname attribute, empty when absent', () => {
  const [a, b] = readJunit('<testcase name="t" classname="a.b &amp; c"/><testcase name="u"/>')
  expect([a.classname, b.classname]).toEqual(['a.b & c', ''])
})
test('decodes entities and keeps Vietnamese letters', () => {
  const xml = '<testcase name="a-T1 &quot;Lọc bất động sản&quot; &amp; Back"><error message="PRECONDITION: no form"/></testcase>'
  expect(readJunit(xml)).toEqual([{ name: 'a-T1 "Lọc bất động sản" & Back', classname: '', status: 'fail', message: 'PRECONDITION: no form' }])
})
test('a Playwright failure with escaped text keeps the assertion error from the element text', () => {
  const xml = '<testcase name="a-T2 x" classname="a.spec.ts"><failure message="a.spec.ts:3:1 a-T2 x" type="FAILURE">Error: PRECONDITION: no form&#10;&#10;  12 |   x</failure></testcase>'
  const [r] = readJunit(xml)
  expect(r.name).toBe('a-T2 x')
  expect(r.status).toBe('fail')
  expect(r.message.split('\n')).toContain('Error: PRECONDITION: no form')
})
test('a Playwright failure with CDATA text is read raw', () => {
  const xml = '<testcase name="a-T2 x" classname="a.spec.ts"><failure message="a.spec.ts:3:1 a-T2 x" type="FAILURE"><![CDATA[Error: PRECONDITION: no form\n  a &amp; b]]></failure></testcase>'
  const [r] = readJunit(xml)
  expect(r.message.split('\n')).toContain('Error: PRECONDITION: no form')
  expect(r.message).toContain('a &amp; b')
  expect(r.message).not.toContain('CDATA')
})
test('system-out text does not change the status', () => {
  const xml = '<testcase name="a-T3 x"><system-out><![CDATA[<skipped/>]]></system-out></testcase>'
  expect(readJunit(xml)).toEqual([{ name: 'a-T3 x', classname: '', status: 'pass', message: '' }])
})
test('a self-closing system-out does not hide a later failure', () => {
  const xml = '<testcase name="a-T5 x"><system-out/><failure message="boom"/><system-err>e</system-err></testcase>'
  expect(readJunit(xml)).toEqual([{ name: 'a-T5 x', classname: '', status: 'fail', message: 'boom' }])
})
test('an out-of-range numeric entity is left unchanged', () => {
  expect(readJunit('<testcase name="a-T4 &#99999999; x"/>')[0].name).toBe('a-T4 &#99999999; x')
})
test('checkId takes the id at the start of a name', () => {
  expect(checkId('24c426f-T3 an import fails')).toBe('24c426f-T3')
  expect(checkId('no id here')).toBe(null)
})
