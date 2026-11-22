---
type: spec
title: "Spec 7: three follow-ups of spec 6: a split may keep the old import path, one passage grades every finding, and a mock-up input is readable in the dark scheme"
description: "Three points that the run of spec 6 left for the user's ruling, ruled and built together: after a split of an old file, a named line that exports the moved code again from the old file is allowed on three conditions and is listed as a debt; the reviewer's passage on severity grades every finding, and a severity that an item of its file names still stands; text typed into a `mock-input` of the mock-up frame has the frame's colour for text in both schemes. The version stays 0.4.5."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-22T23:12:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-22T23:12:42+07:00" }
sources:
  - id: spec-6
    resource: /specs/2026-11-22-design-before-code.md
  - id: spec-1
    resource: /specs/2026-11-21-mockup-server.md
---

# Spec 7: three follow-ups of spec 6: a split may keep the old import path, one passage grades every finding, and a mock-up input is readable in the dark scheme

## 1. The request

The run of spec 6 ended with three points for the user's ruling. The user, 2026-11-22, to the three as the builder told them with two options each:

> 1. Kiểm tra xem cái này có phải anti-pattern hay không
> 2. Không hiểu
> 3. Nếu nhỏ thì sử luôn

and, after the builder's answers:

> 1. Ok
> 2. Sửa
> Gộp

## 2. Agreed in the brainstorm

**Why.** Each point is a place where the texts of spec 6, or the mock-up frame, say less than they should. A builder that splits an old file does not know whether it may leave a line in the old file that exports the moved code again; the reviewer's passage on severity is limited by a sentence that points to severities its file does not give; a typed value in a mock-up input cannot be read in the dark scheme.

**Goals.** One answer in the texts for each of the three. Nothing else of spec 6 changes.

**Not goals.** The four rules the builder added alone in the run of spec 6 (decisions E28, E31, E32 and E33 of that spec): they still wait for the user's word. Taking such a line out again later, when the earlier tests import from the new place. Any other class or control of the frame.

**What would make it a failure.** A line that exports again and that nobody ever hears of. A reviewer that, with one passage for every finding, grades a point of a behaviour with no assertion as Minor.

**Approaches, and what the user decided.**

- A split that keeps the old way to reach the moved code. Case: `contract.ts` exports `calcTotal`, an earlier test has `import { calcTotal } from './contract'`, the builder moves the function to `pricing.ts` and leaves `export { calcTotal } from './pricing'` in `contract.ts`, so that no line of the earlier test changes. (a) Allow it. (b) Forbid it: then almost every split is stopped, because an earlier test usually imports the very thing that moves. The user asked whether it is an anti-pattern. What the builder found: it is the usual step of moving a function (the old function is made to delegate, and is taken out later) and the first step of a parallel change (expand, migrate, contract); it is a fault when it stays for good: two ways to import one thing, a "Middle Man" by the list of smells the reviewer reads, and the costs known of files that only export again. In this loop a run may not change an earlier test, so the line cannot be taken out in the same run. The builder's pick: allow it on three conditions: it names what it exports, never everything at once; the code the run adds imports from the new place, never through that line; the design marks the line as a debt and the log of the run lists it, so that the user decides when it is taken out. The user: "1. Ok".
- The severity of a finding of wrong behaviour. `agents/reviewer.md` names a severity for three kinds of finding (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks: each Important) and none for "the code does X and the spec says Y". Spec 6 put a passage on severity into that file and limited it with "This grades a design finding only: a finding of wrong behaviour, and a point of a behaviour that no assertion checks, keep the severity this file gives them.", because the passage calls broader coverage Minor. For most findings of wrong behaviour the file gives none; in the trial of spec 6 the reviewer graded such a finding by the passage all the same. (a) Leave it. (b) The passage grades every finding, and a severity that an item of the file names still stands. The user: "2. Sửa".
- The typed value in a mock-up input. `scripts/mockup-frame.html`, the rule of `.mock-input`, sets a background and a border and no `color`; a form control does not take the colour of `body`, so in the dark scheme the value is black on near-black. The builder's design: add `color: var(--text-primary);` to that rule, as every other rule of the file names a variable; not `color: inherit`, and not a rule for every `input`, which is wider than what was asked. The user had said "3. Nếu nhỏ thì sử luôn"; to the builder's question whether the design is right and whether the two other points go into the same spec: "Gộp".
- The version. The builder said that it stays 0.4.5, which is built and not released; the user did not speak against it.

**Left to the builder.** The words of each new sentence beyond the phrases section 3 names. Where in each file a sentence stands.

## 3. Behaviours

A text in backticks is in the named file, or in one of the named texts, word for word. "The builder's design texts" and "the reviewer's texts" are the terms of spec 6, section 3.

**The mock-up frame**

1. In `scripts/mockup-frame.html`, the rule of `.mock-input` holds the declaration `color: var(--text-primary)`.
2. In the frame the server serves, an element of the class `mock-input` with a typed value shows that value in `rgb(245, 245, 247)` in the dark colour scheme and in `rgb(29, 29, 31)` in the light one.
3. The frame still has the sixteen classes of step S1-F1-S38.

**A split that keeps the old way to reach the moved code**

4. The builder's design texts hold `A line that exports the moved code again from the old file, so that an earlier test still reaches it, is part of the split, on three conditions:`, `it names what it exports, never everything at once`, `the code this run adds reaches the moved code at its new place, never through that line` and `the section names the line as a debt`.
5. The builder's design texts still hold `When it would need such a line to change, do not split, and write that in the section.`
6. The reviewer's texts hold `A line that exports moved code again from the old file, and that the section names as a debt, is no finding; code this run added that reaches the moved code through it is one.`
7. In `skills/build/SKILL.md`, step 10, the item that starts with `**The log.**` holds `"Design debt", with each line that a split left in an old file to export the moved code again`.

**The severity of a finding**

8. `agents/reviewer.md` no longer holds `This grades a design finding only`; before its three sentences on severity it holds `This grades every finding. Where an item above names a severity (a weakened test, a conflict that is none, a point of a behaviour that no assertion checks), that severity stands.`
9. `agents/reviewer.md` holds the heading `## The severity of a finding`, and no longer `## The severity of a design finding`.
10. `agents/reviewer.md` still holds `Categorize issues by actual severity. Not everything is Critical.`, `"Coverage could be broader" and polish suggestions are Minor.` and `The rules file comes before this passage`.

**The version**

11. `.claude-plugin/plugin.json` still holds `"version": "0.4.5"`, and the README's status paragraph still starts with `**Status: v0.4.5.**`.

## 4. Against the record

1. **The sentence that limits the passage on severity** (the user's: an approved step, S6-F1-S25, behaviour 18 of spec 6). `progress/feature_list.json`: "… before those sentences they hold `This grades a design finding only: a finding of wrong behaviour, and a point of a behaviour that no assertion checks, keep the severity this file gives them.`" Now the sentence of behaviour 8. The words of that step, its test (`tests/design-before-code-texts.test.ts` "18:") and the builder's test of spec 6 that holds the old sentence (`tests/design-before-code-edges.test.ts` "E13") take the new one. Point 7 of the nine of spec 6's section 2 ("the passage grades design findings only") is replaced by this. The user: "2. Sửa".
2. **"Not decided in the text"** (an earlier decision of a builder). `docs/specs/2026-11-22-design-before-code.decisions.md`, E26: "A split that keeps the old way to reach the moved code, by a line that exports it again from the old file … not decided in the text." Now decided: behaviours 4 to 7. The user: "1. Ok".
3. **"Not changed"** (an earlier decision of a builder). The same file, E27: "keep the severity this file gives them … not changed." Now changed: behaviours 8 to 10.
4. **The frame and its original** (the user's: an approved spec). `docs/specs/2026-11-21-mockup-server.md` says of the server that "it does what the original does", and `scripts/LICENSE-mockup` covers the frame as a copy. The frame now holds one declaration that the original does not. Step S1-F1-S38 ("The frame has the original's classes for content …") stays true (behaviour 3). The user: "3. Nếu nhỏ thì sử luôn".

The earlier lines of items 2 and 3 are not edited: they stay as history.

## 5. Open points

None.

## 6. Not in this spec

- The four rules the builder added alone in the run of spec 6 (E28, E31, E32, E33 of its decisions): the user has not ruled on them.
- Taking a line that exports again out of the old file, once the earlier tests can be changed: a later request of the user.
- A colour for any other control or class of the frame.
- A new version number.
