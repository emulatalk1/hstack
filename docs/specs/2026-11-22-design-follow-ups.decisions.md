---
type: decision
title: "Decisions of the builder: Spec 7, three follow-ups of spec 6"
description: "What the builder decided alone while building spec 7: the entry points, its design, 14 edges with the test of each, the gate's three removed lines, the one edit to a copied file, and what the review, the exploratory test and the planted faults led to. Not approved by the user."
status: draft
generated: { by: claude-code/2.1.328, at: "2026-11-23T01:05:00+07:00" }
sources:
  - id: spec
    resource: /specs/2026-11-22-design-follow-ups.md
---

Decided by the builder while building docs/specs/2026-11-22-design-follow-ups.md. Not approved by the user.

# Decisions of the builder: spec 7, three follow-ups of spec 6

## Entry points

- A person who looks at a mock-up in the browser: `scripts/mockup-frame.html`, the rule of `.mock-input`, served by `scripts/mockup.ts` around every fragment.
- A builder at step 4 who plans a split of an old file: `skills/build-implement/design-note.md`, its last part.
- A reviewer at step 6: `skills/build-implement/design-review.md` (the line on a split) and `agents/reviewer.md` (the part on severity).
- The playbook, `skills/build/SKILL.md`: step 10, the item on the log.
- Not reached: `scripts/mockup.ts` itself, the other classes of the frame, `skills/build-implement/SKILL.md`, the README and the version.

## Design

Rules: none of the project's own for how its texts or the frame are arranged; the way the existing files do it is followed.

- `scripts/mockup-frame.html` (changed): one declaration in the rule of `.mock-input`. The colour is the frame's own variable `--text-primary`, whose two values (light and dark) stay where they are, in `:root`: the rule names the variable and holds no colour of its own.
- `skills/build-implement/design-note.md` (changed): owns when a split may leave a line that exports again, with the three conditions, in the part on the split, after the condition on tests.
- `skills/build-implement/design-review.md` (changed): owns what the reviewer makes of such a line, in its line on a split.
- `agents/reviewer.md` (changed): owns every severity; the sentence before the passage on severity and the heading of that part.
- `skills/build/SKILL.md` (changed): owns what the log holds: "Design debt".
- Places that repeat a rule on purpose: none.

## Edges

- F1. Where the new sentence of behaviour 8 stands (the oracle's open edge): directly under the heading `## The severity of a finding`, where the old sentence stood, before the copied passage. Test: tests/design-follow-ups-edges.test.ts "F1: the sentence that says what the passage grades stands directly under the heading, before the passage"
- F2. Whether the four phrases of behaviour 4 stand together (the oracle's open edge): in one sentence of `skills/build-implement/design-note.md`, in its part on the split, directly after the condition that no line of an earlier test changes. Test: tests/design-follow-ups-edges.test.ts "F2: the three conditions of a line that exports again stand in one sentence, after the condition on tests"
- F3. Where "Design debt" stands in the log item (the oracle's open edge): after "Design not fixed" and before "Needs your ruling". Test: tests/design-follow-ups-edges.test.ts "F3: in the log item, "Design debt" stands after "Design not fixed" and before "Needs your ruling""
- F4. The old limiting sentence in another text the reviewer reads (the oracle's open edge): in none of the four design files either. Test: tests/design-follow-ups-edges.test.ts "F4: no design file holds the old sentence that limited the passage"
- F5. The typed value in a real browser (behaviour 2; the oracle's test reads the style sheet, not what a browser paints): a hand check of the exploratory tester, in headless Chrome, in both schemes. No test: the repository has no test that starts a browser (the capabilities).
- F6. The colour of a placeholder text, of a disabled or an autofilled input: not changed; the spec names a typed value. No test: the spec puts it outside ("A colour for any other control or class of the frame").
- F7. The two earlier tests that hold the old sentence (the spec, section 4, item 1): `tests/design-before-code-texts.test.ts` "18:" and `tests/design-before-code-edges.test.ts` "E13" take the new sentence, and nothing else of them changes. No test: they are the tests.
- F8. What the section says of such a line (behaviour 4: "the section names the line as a debt"): the file it is left in and what it exports; the log's "Design debt" takes it from there. Test: tests/design-follow-ups-edges.test.ts "F2: the three conditions of a line that exports again stand in one sentence, after the condition on tests"
- F9. Whether the sixteen classes are checked as selectors (review round 1, finding 1: the oracle's test "3" and the earlier test "38:" look in the whole page, and the helper script names four of the classes, so both pass without the rules of `options`, `option`, `cards` and `card`): a test of the builder looks for each class as a selector in the style sheets of the frame only. It reads the frame's file, which the server serves; that the served page is this frame is what the oracle's tests "1:" to "3" check. Test: tests/design-follow-ups-edges.test.ts "F9: each of the sixteen classes of step S1-F1-S38 is a selector in the style sheets of the frame, not only a word of its scripts"
- F10. A line that exports everything at once, named as a debt (review round 1, finding 2: the spec's sentence of behaviour 6 cleared every line the section names): it is a finding, named or not; the first condition of behaviour 4 says so for the builder, and one more sentence says it for the reviewer. Test: tests/design-follow-ups-edges.test.ts "F10: a line that exports everything at once from the old file is a finding, named as a debt or not"
- F11. A test of the oracle, or an earlier test, that imports through the line (review round 1, finding 3: by "code this run added" the oracle's test would be a finding the builder may not fix): no finding; such a test may not change, and the line is left for it. Test: tests/design-follow-ups-edges.test.ts "F11: a test that may not change and that reaches the moved code through the line is no finding"
- F12. The builder's side of F11 (the exploratory test, its one finding: the second condition, "the code this run adds … never through that line", had no exception for a test of the oracle, which the run adds and may not change, and the builder is not sent to the reviewer's file): `design-note.md` says after the conditions that a test of the oracle, or one that existed at the base, is not such code. Test: tests/design-follow-ups-edges.test.ts "F12: the builder is told, too, that a test which may not change is not "the code this run adds""
- F13. Where the log takes the lines of "Design debt" from (a planted fault that survived, M16: the words "as the section `## Design` names it" could be taken out with no test failing): the words are the builder's, beside the spec's phrase of behaviour 7, and say that the log lists each line as the section names it. Test: tests/design-follow-ups-edges.test.ts "F13: the log takes each line of "Design debt" as the section names it" (killed after the mutation step: the fault was planted once more and the test failed)
- F14. Where the reviewer's sentences on a line that exports again stand (a planted fault that survived, M19: the sentence of behaviour 6 could be moved to another item with no test failing): in the item on a split of `design-review.md`, after "A split the section does not name is a finding.", then the sentence on a line that exports everything, then the one on a test that may not change. Test: tests/design-follow-ups-edges.test.ts "F14: the three sentences on a line that exports again stand in the item on a split, in their order" (killed after the mutation step: the fault was planted once more and the test failed)

## The gate

The gate lists removed lines of two earlier tests, all for one reason: the sentence that limited the passage on severity. In `tests/design-before-code-texts.test.ts`, the line of the phrase list (`b18before`) and the line of the test "18:" that names the sentence; in `tests/design-before-code-edges.test.ts`, the line of "E13" that looks for the start of the sentence. Each now holds the new sentence ("This grades every finding. …") in place of the old ("This grades a design finding only: …"), and nothing else of them changed. They belong to item 1 of the spec's section "Against the record" ("The sentence that limits the passage on severity"), which the user approved: "2. Sửa".

## The copied parts

`scripts/mockup-frame.html` is a copy with edits of a third-party page (`scripts/LICENSE-mockup`; where it came from is in the decisions of spec 1). This change makes one more edit to it: the rule of `.mock-input` gets the declaration `color: var(--text-primary);`, which the original does not have (the spec, section 4, item 4). No other copied part is changed in its copied words: the new sentences of `design-note.md`, `design-review.md` and `agents/reviewer.md` are the builder's own, beside the copied passages.
