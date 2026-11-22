---
type: decision
title: "Decisions of the builder: Spec 3, both words first when calling the script, and the rule on `dir`"
description: "What the builder decided alone while building spec 3: the entry points, 15 edges with the test of each, the gate's three removed lines, and what the review, the exploratory test and the mutation step led to. Not approved by the user."
status: draft
generated: { by: claude-code/2.1.328, at: "2026-11-22T11:00:00+07:00" }
sources:
  - id: spec
    resource: /specs/2026-11-22-script-call-and-dir-rule.md
---

Decided by the builder while building docs/specs/2026-11-22-script-call-and-dir-rule.md. Not approved by the user.

# Decisions of the builder: spec 3, both words first when calling the script, and the rule on `dir` holds until `start`

## Entry points

- `skills/build/SKILL.md`, the paragraph that starts with `` `H` below is `` (line 12 at the base): read by every builder that the Skill tool sends into `hstack:build`.
- `skills/hstack-feedback/SKILL.md`, the paragraph that starts with `` `H` below is `` (line 11 at the base): read when the user types `/hstack:hstack-feedback`.
- `skills/brainstorm/SKILL.md`, the section `## In hstack`, its fourth point: read at step 1 of the loop, at the item "Brainstorm".
- `.claude-plugin/plugin.json`, the field `version`: read by the coding tool when the plugin is installed or updated (the installed copy lies in a folder named by it), by `scripts/hstack.ts` (line 94, for the feedback records) and by `scripts/mockup.ts` (line 109, shown on its pages).
- `README.md`, the status paragraph: read by a person.

## Edges

- E1. Where the new sentence stands in the paragraph: after the sentence that says what `H` is, in the place of the old sentence (the spec, section 2: "after the sentence that says what `H` is"). In the playbook the rest of the paragraph stays as it is ("Shell variables do not survive between Bash calls, so write the absolute paths of the script and of `S` into each command. Pass both to every agent you start."): the spec quotes one sentence and changes no other. A guard, already holding at the base. Test: tests/script-call-edges.test.ts "E1: the playbook's paragraph on H goes on, after the sentence on calling the script, with the two sentences it had"
- E2. The phrases of behaviours 5, 6 and 8 stand in one point of "In hstack", the fourth, in the order of the spec's quote, and the rest of that point stays ("the loop's stop hook would hold such a turn"; "A spike is built outside the repository, and mock-ups live in the loop's state folder"): the spec, section 2, quotes the whole point. Test: tests/script-call-edges.test.ts "E2: the fourth point of In hstack holds the spec's words in the spec's order, and keeps its sentence on the spike and the mock-ups"
- E3. The section "In hstack" of the brainstorm skill keeps its five points, and the other four are not touched: the spec changes the fourth only. Test: tests/script-call-edges.test.ts "E3: the section In hstack keeps its five points, in their order"
- E4. The existing test "40" of `tests/brainstorm-texts.test.ts` pins `"version": "0.4.2"` and `**Status: v0.4.2.**`. The approved spec changes that step (section 4, item 1: "The step's words in the feature list and its test take the new number"): the test's name and its two assertions take 0.4.3; its check of the words `brainstorm` and `grilled` stays. This is a changed test of earlier behaviour that the user approved under "Against the record", item 1. Test: tests/brainstorm-texts.test.ts "40: the plugin is 0.4.3, and the README's status paragraph starts with it and names the brainstorm and the grill"
- E5. In the README's status paragraph only the number changes (the grill, answer 8): no new sentence, no new link to a design. No test: a test of "nothing else changed" would compare with the base commit; the diff of the paragraph is read in step 4's check and by the reviewer.
- E6. Other places that name 0.4.2 (the log, spec 2 and its decisions file, `docs/log.md`, the descriptions in `progress/feature_list.json` and in `docs/specs/index.md`): they tell what was built then and stay. The words of step 40 of spec 2 in the feature list take the new number in the records step, as the spec's section 4, item 1, says. No test: the spec names only `plugin.json` and the README's status line.
- E7. The pages of the mock-up server show the plugin's version, which `scripts/mockup.ts` reads from `.claude-plugin/plugin.json`; `tests/mockup.test.ts` reads the same field (line 744), so its tests follow the number with no change. No test: the base already decides it and tests/mockup.test.ts pins it ("the version it shows is the plugin's").
- E8. The two history lines of the spec's section 4, items 2 and 3 (`docs/specs/2026-11-21-brainstorm-and-grill.decisions.md`, E19; `docs/plans/2026-11-20-spec-and-records.md`), are not edited (the grill, answer 3). This file names them: E19's "Not changed" and the plan's order "through a shell function or to write both words out" are replaced by behaviours 1 to 4 of this spec. No test: the spec puts an edit of them outside; the gate's diff shows them untouched.
- E9. `scripts/hstack.ts`, the hooks and the agents' files are not changed (the spec: "Not a goal. Any change to the script, to the stop hook"). None of them names the shell function (searched: no match for "shell function" or "both words" outside the two skill files). No test: nothing of this spec.
- E10. The string `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts"` in the first sentence of both paragraphs stays: that sentence is not touched. No test: tests/skills.test.mjs already pins it.
- E11. The part "Builder check" of the brainstorm skill is not touched (the spec, section 4, "Kept"). No test: tests/brainstorm-texts.test.ts "24" already pins it.
- E12. The copy of the plugin installed on this machine (`~/.claude/plugins/cache/...`) is not touched: the spec's section 6 leaves the update to the user's word. No test: outside the repository.

## The gate

- The gate lists three removed lines of `tests/brainstorm-texts.test.ts`, all of test "40": its name and its two assertions on `"version": "0.4.2"` and `**Status: v0.4.2.**`. The test belongs to the item the user approved under "Against the record", item 1 of the spec's section 4 ("The step's words in the feature list and its test take the new number"): the change stands (E4). The three lines now name 0.4.3; the test's check of the words `brainstorm` and `grilled` is as it was.

## After the review

- E13. The brainstorm skill's paragraph "Spike to feel things out" still ends "before the spec is approved, nothing in the repository changes", without the clause on the spec file (review round 1, finding 1, Minor). Not changed: the user approved the words of the fourth point of "In hstack" only, and the spec's behaviours name no other place. It is put to the user in the log entry. No test: nothing of this spec. Ruling (2026-11-22): the paragraph gets the same clause in the change that fixes feedback issue 8, which touches the same file (the user: "Đồng ý", to the builder's suggestion); it is noted in a comment on that issue.
- E6, added: the coverage row of S2-F1-S40 takes the test's new name and the new number with the feature list's words, in the records step (review round 1, finding 2). No test: a record of the project, not code; the script's check of the two record files runs in the records step.

## After the exploratory test

- E14. The two test files of this spec were not in `tsconfig.json`'s `include`, so the type-check passed without reading them (the explorer's finding 1, Minor). Every other TypeScript file of `scripts/` and `tests/` is named there; the two are added, as the earlier runs added theirs. Test: tests/script-call-edges.test.ts "E14: the type-check reads the two test files of this spec"

## After the mutation step

- E15. Two planted faults survived: the colon after the form with both words changed to a semicolon, in the playbook (M18) and in the feedback skill (M19). The behaviours pin a phrase on each side of that joint and nothing on it; the spec quotes the two sentences whole (section 2, "The words"; the grill, answer 6). A test now compares the two sentences word for word in each file; each was proven by planting its fault once more and seeing it fail. Test: tests/script-call-edges.test.ts "E15: the playbook holds the two sentences on calling the script word for word"; tests/script-call-edges.test.ts "E15: the feedback skill holds the two sentences on calling the script word for word, and its paragraph on H ends with them"
