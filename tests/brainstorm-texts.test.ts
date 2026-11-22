// Acceptance tests of the texts of spec 2 ("step 1 starts with a brainstorm that ends in the spec, and the spec can be
// grilled before the approval"), written from the spec alone. Run: bun test tests/brainstorm-texts.test.ts
// Each test names the behaviour of the spec it checks by its number, and reads only files of this repository.
// A phrase is looked for word for word; a line break inside a phrase counts as a space.
import { expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const raw = (file: string) => readFileSync(join(ROOT, file), 'utf8') // throws when the file is missing: no check passes on an absent file
const flat = (s: string) => s.replace(/\s+/g, ' ')
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// one line per phrase, so that a failure names the phrase
const holds = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": true`) }
const lacks = (where: string, text: string, phrases: string[]) => { const t = flat(text); for (const p of phrases) expect(`${where} holds "${p}": ${t.includes(flat(p))}`).toBe(`${where} holds "${p}": false`) }

const front = (text: string) => { expect(text.startsWith('---\n')).toBe(true); return text.split('\n---')[0] }
const description = (text: string) => ((front(text).match(/^description: (.*)$/m) ?? [])[1] ?? '').trim().replace(/^["']|["']$/g, '')

// a section: from its heading line to the next heading of its level
function section(text: string, heading: string): string {
  const m = new RegExp(`^${esc(heading)}[ \\t]*$`, 'm').exec(text)
  expect(`section "${heading}": ${m !== null}`).toBe(`section "${heading}": true`)
  if (!m) return ''
  const rest = text.slice(m.index + m[0].length), end = rest.search(/^## /m)
  return end < 0 ? rest : rest.slice(0, end)
}
const hasHeading = (text: string, heading: string) => new RegExp(`^${esc(heading)}[ \\t]*$`, 'm').test(text)

// the playbook
const PLAYBOOK = 'skills/build/SKILL.md'
const step1 = () => { const t = raw(PLAYBOOK), from = t.search(/^## 1\. /m), to = t.search(/^## 2\. /m); expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from); return t.slice(from, to) }
const itemStart = (s: string, name: string) => new RegExp(`^\\d+\\. \\*\\*${esc(name)}\\*\\*`, 'm').exec(s)
// an item of step 1: from its "N. **Name.**" to the next item of the list; its nested list and its indented paragraphs belong to it
function item(name: string): string {
  const s = step1(), m = itemStart(s, name)
  expect(`step 1 has an item **${name}**: ${m !== null}`).toBe(`step 1 has an item **${name}**: true`)
  if (!m) return ''
  const rest = s.slice(m.index + m[0].length), end = rest.search(/^\d+\. \*\*/m)
  return m[0] + (end < 0 ? rest : rest.slice(0, end))
}
// a case of an item: a bullet that starts with the case's name, to the next bullet of the same depth or the item's end
function caseOf(text: string, name: string): string {
  const ls = text.split('\n'), i = ls.findIndex((l) => new RegExp(`^\\s*[-*] \\**${esc(name)}`).test(l))
  expect(`a case "${name}": ${i >= 0}`).toBe(`a case "${name}": true`)
  if (i < 0) return ''
  const depth = ls[i].search(/\S/), out = [ls[i]]
  for (const l of ls.slice(i + 1)) { if (/^\s*[-*] /.test(l) && l.search(/\S/) <= depth) break; out.push(l) }
  return out.join('\n')
}

// ---------- the playbook (skills/build/SKILL.md) ----------

test('1: the description of the playbook holds "asks the user only before the approval", no longer "asks the user once", and still the steps of the loop', () => {
  const d = description(raw(PLAYBOOK))
  holds('the description', d, ['asks the user only before the approval', 'written before the code, the implementation, a gate'])
  lacks('the description', d, ['asks the user once'])
})

test('2: the first paragraph says the user is asked only before the approval: in the brainstorm, at the spec, and in a grill', () => {
  const text = raw(PLAYBOOK), body = text.slice(text.indexOf('\n---', 4) + 4)
  const first = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p !== '' && !p.startsWith('#')) ?? ''
  holds('the first paragraph', first, ['You ask the user only before the approval: in the brainstorm, at the spec, and in a grill when the user wants one'])
  lacks('the first paragraph', first, ['You ask the user once'])
  holds('the playbook', text, ['After the approval nobody answers a question'])
})

test('3: step 1 has an item **Brainstorm.** before the item **Start.**, which invokes hstack:brainstorm whatever other brainstorming skill the session has', () => {
  const s = step1(), b = itemStart(s, 'Brainstorm.'), st = itemStart(s, 'Start.')
  expect(b).not.toBeNull(); expect(st).not.toBeNull()
  expect(b!.index).toBeLessThan(st!.index)
  holds('the item Brainstorm', item('Brainstorm.'), ['invoke the `hstack:brainstorm` skill', 'whatever other brainstorming skill the session has'])
})

test('4: the brainstorm is never left out by the builder\'s own judgement, and the first message always comes', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['Never leave the brainstorm out by your own judgement', 'Your first message always comes; the user\'s answer to it decides whether you write the spec at once or the talk goes on'])
})

test('5: the builder does not guess whether a person is in the session', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['Do not guess whether a person is in the session'])
})

test('6: with a spec that already waits for the approval there is no brainstorm', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['If a spec already waits for the user\'s approval, there is no brainstorm'])
})

test('7: the item **Start.** runs start only when the brainstorm has come to the spec, and requirement.md holds every message of the brainstorm', () => {
  holds('the item Start', item('Start.'), ['run `$H start` only when the brainstorm has come to the spec', '$S/requirement.md', 'every message of the user from the brainstorm, verbatim'])
})

test('8: the item **The spec file.** lists, after the request, a section **Agreed in the brainstorm** with its five parts', () => {
  const it = item('The spec file.')
  const request = it.toLowerCase().indexOf('the request'), agreed = it.indexOf('**Agreed in the brainstorm**'), behaviours = it.indexOf('**Behaviours**', Math.max(agreed, 0))
  expect(request).toBeGreaterThan(0)
  expect(agreed).toBeGreaterThan(request) // after the request
  expect(behaviours).toBeGreaterThan(agreed) // the other sections stay, after it
  const entry = it.slice(agreed, behaviours)
  holds('the entry of "Agreed in the brainstorm"', entry, ['goals, what is not a goal, and what would make it a failure', 'the approaches considered and the one the user picked', 'what the user decided of the how', 'what is left to the builder'])
  expect(`the entry names "why": ${/\bwhy\b/.test(entry)}`).toBe('the entry names "why": true')
})

test('9: the spec no longer holds behaviour only: of the how, what the user decided, and only what was discussed and agreed', () => {
  const it = item('The spec file.')
  lacks('the item The spec file', it, ['It holds behaviour only', 'no code design'])
  holds('the item The spec file', it, ['Of the how, only what the user decided', 'Write into the spec only what was discussed and agreed with the user'])
})

test('10: the item **Show it.** ends the turn with the path of the spec and the three choices, and never pastes the whole text', () => {
  const it = item('Show it.')
  holds('the item Show it', it, ['end your turn with the path of the spec and the three choices', 'approve it, say what to change, or have it grilled', 'and any point the user said to leave open', 'Never paste the whole text of the spec'])
  lacks('the item Show it', it, ['the whole text of the spec and one line'])
})

test('11: the item **The user\'s next message.** has a case "A grill:", which invokes hstack:grill while the spec goes on waiting, and never by itself', () => {
  const c = caseOf(item('The user\'s next message.'), 'A grill:')
  holds('the case A grill', c, ['invoke the `hstack:grill` skill', 'the spec goes on waiting', 'Never start a grill the user did not ask for'])
})

test('12: in a grill each answer goes into the spec file, the spec is shown to the script again, and the grill ends with the path, what changed and the three choices', () => {
  const c = caseOf(item('The user\'s next message.'), 'A grill:')
  holds('the case A grill', c, ['write it into the spec file, then `$H spec <file>` again', 'The grill ends with a turn that gives the path, what the grill changed, and the three choices again'])
})

test('13: an approval given in the middle of a grill is answered with what the grill changed, and counts when given again', () => {
  const c = caseOf(item('The user\'s next message.'), 'A grill:')
  holds('the case A grill', c, ['An approval given in the middle of a grill is answered with what the grill has changed so far and the three choices; it counts when the user gives it again'])
})

// ---------- the brainstorm (skills/brainstorm/) ----------

const B = 'skills/brainstorm'
const B_TEXTS = ['SKILL.md', 'visual-companion.md', 'builder-check-prompt.md']
const MIT = ['Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction',
  'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND']
const COPYRIGHT = /^\s*Copyright (?:\(c\)|©)\s*(?:\d{4}(?:\s*-\s*\d{4})?,?\s+)?(.*\S)\s*$/im
// the holder of the licence's copyright line, in small letters; read from the licence, never written here
function holder(licence: string): string {
  const m = COPYRIGHT.exec(raw(licence))
  expect(`${licence} has a copyright line: ${m !== null}`).toBe(`${licence} has a copyright line: true`)
  const h = (m?.[1] ?? '').toLowerCase()
  expect(h.length).toBeGreaterThan(2)
  return h
}

test('14: skills/brainstorm holds the three texts and LICENSE-brainstorm, which names the three and holds the licence text with its copyright line', () => {
  for (const f of [...B_TEXTS, 'LICENSE-brainstorm']) expect(`${f}: ${statSync(join(ROOT, B, f)).isFile()}`).toBe(`${f}: true`)
  const licence = raw(`${B}/LICENSE-brainstorm`)
  for (const f of B_TEXTS) expect(`the licence names ${f}: ${licence.includes(f)}`).toBe(`the licence names ${f}: true`)
  holds('the licence', licence, MIT)
  expect(licence).toMatch(/^\s*Copyright \(c\) \d{4}.*\S/m)
  holder(`${B}/LICENSE-brainstorm`)
})

test('15: the header of the brainstorm skill: its name, a description that sends every other caller to hstack:build, and the loop can invoke it', () => {
  const text = raw(`${B}/SKILL.md`), f = front(text)
  expect(f).toMatch(/^name: brainstorm$/m)
  const d = description(text)
  holds('the description', d, ['Invoked by hstack:build at its step 1 and by nothing else'])
  expect(`the description ends with "invoke hstack:build, not this.": ${d.endsWith('invoke hstack:build, not this.')}`).toBe('the description ends with "invoke hstack:build, not this.": true')
  expect(f).not.toContain('disable-model-invocation')
})

test('16: the brainstorm skill holds the sections and the parts of the original', () => {
  const text = raw(`${B}/SKILL.md`)
  for (const h of ['## First: What Do You Actually Know?', '## Look Before You Ask', '## Your First Message', '## The Conversation', '## Play It Back', '## Size the Work', '## Red Flags', '## Visual Companion'])
    expect(`a section "${h}": ${hasHeading(text, h)}`).toBe(`a section "${h}": true`)
  holds('SKILL.md', text, ['**Get them describing.**', '**How it gets made.**', '**Ground to cover.**', '**Do recon.**', '**Lay out the approaches.**', '**Show, don\'t tell.**', '**Spike to feel things out.**', '**Builder check**'])
})

test('17: the brainstorm skill has a section "## In hstack": anyone the loop did not send invokes hstack:build, and the written design is the spec', () => {
  const text = raw(`${B}/SKILL.md`)
  holds('the section In hstack', section(text, '## In hstack'), ['do nothing here and invoke `hstack:build`'])
  holds('SKILL.md', text, ['The written design of this skill is the spec of the build loop'])
})

test('18: the brainstorm skill no longer does a clear task without a talk: the first message comes, and the answer decides', () => {
  const text = raw(`${B}/SKILL.md`)
  lacks('SKILL.md', text, ['This is a quick, clear task. Do it, and say what you did.'])
  holds('SKILL.md', text, ['Even then, send your first message before the spec', 'Their answer to it decides: write the spec at once, or go on with the conversation'])
})

test('19: the brainstorm skill names no plan skill and no design doc: after the approval, step 2 of the playbook and no other skill', () => {
  const text = raw(`${B}/SKILL.md`)
  lacks('SKILL.md', text, ['writing-plans', 'design doc'])
  holds('SKILL.md', text, ['After the spec is approved, go on with step 2 of the playbook and no other skill'])
})

test('20: a spike is built in a scratch folder outside the repository', () => {
  holds('SKILL.md', raw(`${B}/SKILL.md`), ['Build a spike in a scratch folder outside the repository'])
})

test('21: the brainstorm skill has a section "## The Written Spec" and none "## The Written Design"', () => {
  const text = raw(`${B}/SKILL.md`)
  expect(`a section "## The Written Design": ${/^## The Written Design\b/m.test(text)}`).toBe('a section "## The Written Design": false')
  holds('the section The Written Spec', section(text, '## The Written Spec'), ['Agreed in the brainstorm', 'Write into the spec only what was discussed and agreed', 'The playbook\'s step 1 says where the spec goes and what else it holds'])
})

test('22: nothing gets built until the human partner approves the spec', () => {
  const text = raw(`${B}/SKILL.md`)
  holds('SKILL.md', text, ['Nothing gets built until your human partner approves the spec', 'the spec is still approved before anything is built'])
  lacks('SKILL.md', text, ['the gate goes with it'])
})

test('23: the section "## Look Before You Ask" names the project\'s records', () => {
  holds('the section Look Before You Ask', section(raw(`${B}/SKILL.md`), '## Look Before You Ask'), ['the project\'s records'])
})

test('24: the part **Builder check** brings the "theirs" pile to the user in a message of its own, and writes an answer only when it was given', () => {
  const text = raw(`${B}/SKILL.md`)
  const want = ['Bring the "theirs" pile to your human partner in a message of its own, before you hand the spec over', 'Write an answer into the spec only when they have given it', 'run `$H spec <file>` before that message']
  // the part: from a "**Builder check**" to the next section; the layout of the part inside its section is the builder's
  const parts: string[] = []
  for (let i = text.indexOf('**Builder check**'); i >= 0; i = text.indexOf('**Builder check**', i + 1)) { const rest = text.slice(i), end = rest.search(/^## /m); parts.push(end < 0 ? rest : rest.slice(0, end)) }
  expect(parts.length).toBeGreaterThan(0)
  const best = parts.find((p) => want.every((w) => flat(p).includes(flat(w)))) ?? parts[0]
  holds('the part Builder check', best, want)
})

test('25: visual-companion.md gives the two commands of the mock-up server of this plugin, and none of the original\'s scripts', () => {
  const text = raw(`${B}/visual-companion.md`)
  holds('visual-companion.md', text, ['bun "${CLAUDE_PLUGIN_ROOT}/scripts/mockup.ts" start --dir <the state folder>/mockups --open', 'bun "${CLAUDE_PLUGIN_ROOT}/scripts/mockup.ts" stop <session folder>'])
  lacks('visual-companion.md', text, ['start-server.sh', 'stop-server.sh', '--project-dir', '.gitignore'])
})

test('26: visual-companion.md asks the user before the server is opened to the network, and says who can reach it', () => {
  holds('visual-companion.md', raw(`${B}/visual-companion.md`), ['Ask the user before you open the server to the network', '--allow-network', 'reachable_at', 'not encrypted on a local network', 'the machine\'s tailnet address'])
})

test('27: visual-companion.md names none of the three other coding tools', () => {
  lacks('visual-companion.md', raw(`${B}/visual-companion.md`), ['Codex', 'Gemini', 'Copilot'])
})

test('28: builder-check-prompt.md hands over a spec, no longer a design document', () => {
  const text = raw(`${B}/builder-check-prompt.md`)
  holds('builder-check-prompt.md', text, ['You\'ve been handed a spec'])
  lacks('builder-check-prompt.md', text, ['design document'])
})

test('29: none of the three texts of the brainstorm names the original\'s project or the holder of the licence\'s copyright line', () => {
  const h = holder(`${B}/LICENSE-brainstorm`)
  for (const f of B_TEXTS) {
    const text = flat(raw(`${B}/${f}`)).toLowerCase()
    expect(`${f} holds "superpowers": ${text.includes('superpowers')}`).toBe(`${f} holds "superpowers": false`)
    expect(`${f} names the holder: ${text.includes(h)}`).toBe(`${f} names the holder: false`)
  }
})

// ---------- the grill (skills/grill/) ----------

const G = 'skills/grill'

test('30: skills/grill holds SKILL.md and LICENSE-grill, which names the file and holds the licence text with its copyright line; the holder is in no other file of the folder', () => {
  for (const f of ['SKILL.md', 'LICENSE-grill']) expect(`${f}: ${statSync(join(ROOT, G, f)).isFile()}`).toBe(`${f}: true`)
  const licence = raw(`${G}/LICENSE-grill`)
  expect(licence).toContain('SKILL.md')
  holds('the licence', licence, MIT)
  const h = holder(`${G}/LICENSE-grill`)
  const others = (readdirSync(join(ROOT, G), { recursive: true }) as string[]).filter((f) => f !== 'LICENSE-grill' && statSync(join(ROOT, G, f)).isFile())
  expect(others).toContain('SKILL.md')
  for (const f of others) expect(`${f} names the holder: ${flat(raw(`${G}/${f}`)).toLowerCase().includes(h)}`).toBe(`${f} names the holder: false`)
})

test('31: the header of the grill skill: its name, a description that sends every other caller to hstack:build, and the loop can invoke it', () => {
  const text = raw(`${G}/SKILL.md`), f = front(text)
  expect(f).toMatch(/^name: grill$/m)
  const d = description(text)
  holds('the description', d, ['Invoked by hstack:build at its step 1 and by nothing else'])
  expect(`the description ends with "invoke hstack:build, not this.": ${d.endsWith('invoke hstack:build, not this.')}`).toBe('the description ends with "invoke hstack:build, not this.": true')
  expect(f).not.toContain('disable-model-invocation')
})

test('32: the grill skill holds the original\'s text: the interview, the design tree, the frontier, the round\'s form, the facts', () => {
  const text = raw(`${G}/SKILL.md`)
  holds('SKILL.md', text, ['Interview the user relentlessly until you reach a shared understanding', 'design tree', 'frontier', 'Word each question so "yes" accepts your recommended answer', '❓', '➡', 'Finding _facts_ is your job, never the user\'s'])
})

test('33: the grill skill has a section "## In hstack": anyone the loop did not send invokes hstack:build; it runs on the spec that waits', () => {
  const text = raw(`${G}/SKILL.md`)
  holds('the section In hstack', section(text, '## In hstack'), ['do nothing here and invoke `hstack:build`'])
  holds('SKILL.md', text, ['It runs on the spec that waits for the user\'s approval'])
})

test('34: in a grill each answer that changes the spec goes into the spec file, no other file changes, and it ends back in the playbook', () => {
  holds('the section In hstack', section(raw(`${G}/SKILL.md`), '## In hstack'), ['Write each answer that changes the spec into the spec file, then run `$H spec <file>` again', 'Change no file but the spec', 'When the frontier is empty and the user has confirmed, go back to the playbook'])
})

// ---------- the version and the README ----------

test('40: the plugin is 0.4.3, and the README\'s status paragraph starts with it and names the brainstorm and the grill', () => {
  expect(raw('.claude-plugin/plugin.json')).toContain('"version": "0.4.3"')
  const status = raw('README.md').split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.startsWith('**Status:')) ?? ''
  expect(status.startsWith('**Status: v0.4.3.**')).toBe(true)
  for (const w of ['brainstorm', 'grilled']) expect(`the status paragraph holds the word "${w}": ${new RegExp(`\\b${w}\\b`).test(status)}`).toBe(`the status paragraph holds the word "${w}": true`)
})

test('41: the README\'s skills table: build asks only before the approval, brainstorm and grill have a row, and the row of skills/ names both', () => {
  const rows = raw('README.md').split('\n'), row = (name: string) => rows.filter((l) => new RegExp(`^\\|\\s*\`${esc(name)}\`\\s*\\|`).test(l))
  const build = row('build')
  expect(build.length).toBe(1)
  holds('the build row', build[0], ['Asks only before the approval'])
  lacks('the build row', build[0], ['Asks once'])
  expect(row('brainstorm').length).toBe(1)
  expect(row('grill').length).toBe(1)
  const folders = row('skills/')
  expect(folders.length).toBe(1)
  for (const w of ['brainstorm', 'grill']) expect(`the row of skills/ names ${w}: ${new RegExp(`(^|[^a-z-])${w}([^a-z-]|$)`).test(folders[0])}`).toBe(`the row of skills/ names ${w}: true`)
})

// ---------- from the grill, round 1 ----------

test('42: the user\'s "that is right" settles what is asked, not how it is built: with more than one way the user would see, the user picks', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['The user\'s "that is right" settles what is asked, not how it is built', 'where there is more than one way that the user would see, lay the ways out and let the user pick before you write the spec'])
})

test('43: of "Against the record" the item **The spec file.** says: raised in the brainstorm, the section records what the user chose; no lettered options', () => {
  const it = flat(item('The spec file.')), named = it.indexOf('**Against the record**'), said = it.indexOf('Raise each of them in the brainstorm; the section records what the user chose')
  expect(named).toBeGreaterThan(0)
  expect(said).toBeGreaterThan(named)
  lacks('the item The spec file', it, ['and lettered options, the one you recommend first'])
})

test('44: of "Open points" the item **The spec file.** says: only what the user said to leave open; no proposal of the builder', () => {
  const it = flat(item('The spec file.')), named = it.indexOf('**Open points**'), said = it.indexOf('only what the user said to leave open')
  expect(named).toBeGreaterThan(0)
  expect(said).toBeGreaterThan(named)
  lacks('the item The spec file', it, ['each with your proposal'])
})

test('45: the mock-up server is stopped when the brainstorm comes to the spec, and the mock-ups stay', () => {
  holds('visual-companion.md', raw(`${B}/visual-companion.md`), ['Stop the server when the brainstorm comes to the spec; the mock-ups stay in the state folder'])
})

test('46: the section "## Size the Work" keeps the two sizes, the small change without the builder check, and the user can override', () => {
  holds('the section Size the Work', section(raw(`${B}/SKILL.md`), '## Size the Work'), ['A small change', 'A project', 'without the builder check', 'They can override it'])
})

// ---------- from the grill, round 2 ----------

test('47: an approval given before the spec exists is no approval', () => {
  holds('the item Brainstorm', item('Brainstorm.'), ['An approval given before the spec exists is no approval: write the spec, hand it over, and wait'])
})

// ---------- from the grill, round 3 ----------

test('48: the brainstorm skill, invoked by the user themselves, is the start of a build', () => {
  holds('the section In hstack', section(raw(`${B}/SKILL.md`), '## In hstack'), ['Invoked by the user themselves, it is the start of a build'])
})

test('49: the grill skill, with no spec waiting for the approval, says so and does nothing', () => {
  holds('the section In hstack', section(raw(`${G}/SKILL.md`), '## In hstack'), ['With no spec waiting for the user\'s approval, say so and do nothing'])
})
