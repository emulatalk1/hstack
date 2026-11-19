---
type: plan
title: "Build playbook and TDD plan"
description: "Make `hstack:build` a playbook: step 4 becomes its own skill, `hstack:build-implement`, that the playbook invokes, and is named `implement` everywhere; its test rules are a third-party test-driven-development skill copied at a pinned commit with a listed set of edits for a run with no human; the build step also runs build, type-check and lint; plugin 0.3.2."
status: stable
generated: { by: claude-code/2.1.327, at: "2026-11-19T15:14:35+07:00" }
verified:
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T15:22:06+07:00" }
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T15:41:44+07:00" }
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T16:54:17+07:00" }
  - { by: human:emulatalk1, at: "2026-11-19T16:54:17+07:00" }
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T17:22:42+07:00" }
---

# Build Playbook and TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended: native, see "Execution") or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the builder writes each of its own tests before the code and sees it fail, by rules the user already works with, and step 4 of `hstack:build` is a skill of its own that the playbook invokes.

**Architecture:** `skills/build/SKILL.md` becomes a playbook (which step, in what order, who, in, out, time). Step 4 moves to a new skill, `hstack:build-implement`, invoked with the Skill tool, the same tool that starts the loop. The test rules are two files copied from obra/superpowers at a pinned commit into that skill's folder, edited only where they need a human or contradict a rule of hstack; the skill tells the builder to read them, as the upstream skill does with its own reference file. In the script step 4's name in the list of steps, `build`, becomes `implement`, so that `build` means the loop and nothing else; `missing` still reads the old name in a run already recorded (added after the review).

**Tech Stack:** Markdown skills, `bun:test` (`tests/skills.test.mjs`), POSIX `sh` (`scripts/hstack.sh`, one word and, after the review, one line in `missing`; `plugin-dev/test-hstack.sh`, the step's name in 20 lines and one new check).

**Spec:** this plan's "Decided" and "For the user to rule on" sections, on top of the plugin design, `plugin-dev/2026-11-10-hstack-plugin-design.md` (its section "Parts" and steps 4 and 9). The design leaves "the exact wording of the skill and agent prompts" free to change.

**Execution:** native, in one session, as the hstack-feedback plan was built. The building tasks are small, mostly text, and each reads the files of the one before; one review of the whole branch comes at the end (Task 4).

## Why

- In `hstack:build` the oracle's tests are written before the code (step 3). The builder's own tests are not: step 4.3 is 26 words, "Implement … Write tests for every decided edge", with no order.
- Step 4 runs tests only. Build, type-check and lint run at Setup (on the base) and at Final, so an error of those kinds in the new code shows after review, explore and mutate, and its fix is read by no reviewer.
- Step 4 is about to carry about 530 lines of test rules. `SKILL.md` is 77 lines and steps 3, 6, 7 and 8 already keep their how in a file of their own.

**What this plan does not show:** that the product gets better. No number in this repository or in superpowers measures that for TDD. The benchmark is closed and measured plugin `653af83` only (`progress/final-report.md`); H5's interval on 191 seeded bugs is [0.608, 0.818], too wide for a few tasks to separate two wordings. What a few runs can show is compliance: whether a failing run of a test comes before the code. Task 5 reads that.

## Decided

Said by the user, 2026-11-19, in the session that wrote this plan:

- Step 4 is written apart and the build skill calls it ("tôi nghĩ mục 4 này nên viết riêng ra rồi build skill gọi tới").
- The build skill is a playbook ("tôi nghĩ skill build là dạng playbook").
- Step 4 is a new skill, `implement`, that the playbook triggers ("tôi nghĩ chúng ta sẽ có 1 skills mới là implement chứ, playbook sẽ trigger nó, không phải à?").
- Superpowers is the skill set the user works with, and the user has never used the other two repositories read in that session ("tôi dùng superpowers của obra là chủ yếu chưa xài skills 2 repo kia lần nào").
- The licence notice is kept: way (a) of the two the author put to the user ("a"). `skills/build-implement/LICENSE-tdd` holds the licence text with its copyright line; nothing else the plugin ships names the upstream project. The user had asked to leave it out, for an edited copy and for a repository soon to be abandoned; the author's reading of the licence's one condition ("The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.") was that neither lifts it, and the other way open was to copy nothing.
- The skill is named `build-implement` ("build-implement"), the author's suggestion: the name shows it is a step of `hstack:build`, and a bare `implement` would match any request to implement something.
- A step 4 that the script still calls `build` is confusing ("điều này làm tôi bối rối"). The author's answer, for the user to accept with the plan: step 4 is renamed `implement` in the playbook's heading, in `$H phase implement`, in the script's list of steps and in the feedback skill's list (Task 3).
- Task 5 runs by itself, right after Task 4, with no further word from the user ("với tinh thần autonomous, tự chạy không cần tôi bảo"). This answers the end-to-end run only; it is not the approval of the plan.

Proposed by the plan's author, for the user to accept with the plan:

- The second draft's `hstack.sh play` verb is withdrawn, and the script does not change. The author had given two reasons for it that the record does not bear out: the failure of run 1 on 2026-11-10 was a write under `.git` and a Bash prefix outside the allowlist, not a refused read; and `hstack-init` and `hstack-safety` are marked `disable-model-invocation` because they need Bun and a stack manifest, not to keep entry points few.
- The test rules are superpowers' test-driven-development skill; mattpocock/skills and addyosmani/agent-skills are not used.
- No outside plugin is installed and none is named in a manifest: the text is copied into `skills/build-implement/`, so a run stays self-contained and superpowers' session-start hook does not come with it.
- The test rules are files of the `implement` skill, not a skill of their own: a second skill with the upstream description would sit beside `superpowers:test-driven-development` in the user's own sessions and compete with it.
- The examples of the copied skill stay as they are (the user asked whether keeping them is a problem). The cost is to the user's rule that the plugin names no tool and no stack: the copied file keeps `npm test` in four places, two of them in the command slot under a line that says "MANDATORY", and names `pytest` and `cargo test` once. What holds the rule is one sentence of "In hstack": every command the builder runs comes from `$S/capabilities.md`, where Setup recorded this project's own single-test and suite commands, each proven by a canary. Three edits that replace the commands (E3, E6, E9 of the first draft) can come back unchanged if the user wants the rule kept to the letter.
- Step 2 (Setup) stays in `SKILL.md`: nothing is waiting to be added to it. It moves by the same pattern when something is.
- The "delete the code written before its test, start over" rule of the copied skill stays. It contradicts no rule of hstack and it is that skill's discipline.
- Refactor stays in the cycle, bounded to code this run added (edit E7).
- Inside the cycle the builder runs the tests near the change; the widest suite runs once, at the end of step 4 (a sentence of "In hstack").

## Approval

Approved by the user on 2026-11-19, on a condition: "nếu advisor không có vấn đề gì với plan này thì duyệt". The advisor then read the plan, had no objection to the design or to what the user decided, and named five gaps to close before any task starts. They were closed in the plan after the user's words and before Task 1:

1. the guard of `hstack:build-implement` reads the run's state (`$H missing`), not only `$S/base`, which a finished run leaves behind;
2. Task 5 runs in the background with a cap of 60 minutes;
3. Task 5's results get a second commit on the branch;
4. the description of `skills/build/SKILL.md` and the skills table of `README.md` take the step's new name and the new skill;
5. this section, the plan's `status` and its `verified` list.

The approval covers a commit on branch `build-playbook` when Task 4 ends and a second one for Task 5's results; push and merge wait for the user's word.

## Global Constraints

- In `scripts/hstack.sh` the word `build` in `PHASES` changes to `implement` and, after the review, `missing` reads a recorded `build` as `implement`; the hooks and the four agents do not change. `sh plugin-dev/test-hstack.sh` passes under `sh` and under `dash`: 140 checks as approved, 141 after the review.
- Text this plan authors (`skills/build-implement/SKILL.md`, the `skills/build/SKILL.md` edits, the "In hstack" section) names no tool or stack. One sentence of "In hstack" says which language the copied examples are in; that is the only exception. The copied examples keep the tools of their example project.
- Nothing the plugin ships names the upstream project, but `skills/build-implement/LICENSE-tdd`, which the licence requires.
- Copied text changes only by the edits listed in Task 1. Anything else found while copying is reported, not fixed.
- Run state stays under `~/.hstack/`; nothing new is written in a project's work tree.
- No new dependency, no network at run time, no question to a human inside a run.
- Every written file is English. The plan is an OKF concept: `bun scripts/okf-check.mjs docs` passes.
- The tasks run to the end without asking, Task 5 included. No push and no merge without the user's word.
- `bench/` is not touched. If a test outside `tests/skills.test.mjs` and `plugin-dev/test-hstack.sh` breaks on the step's new name or on the new skill folder, the work stops and the break is reported.

## Review Focus

Each line names a way this breaks for someone running `hstack:build`, and the check that pins it.

1. **The builder never invokes `hstack:build-implement` and builds from memory.** Step 4 then has no spec and no test order. Pinned by Task 5 (reading 1) and by the first sentence of the step 4 stub.
2. **An agent picks `hstack:build-implement` for a request to build something and skips the loop.** Pinned by the skill's description and its first paragraph, which send anyone who did not come from the loop to `hstack:build`; by the bun test on both; and by the Stop hook, which already blocks a changed repository that has no run (sh test "resume keeps the reference, so a change still blocks").
3. **The loop cannot invoke the new skill.** A skill marked `disable-model-invocation: true`, as `hstack-init` and `hstack-safety` are, cannot be triggered by the playbook. Pinned by the bun test that the mark is absent, and by Task 5 (reading 1).
4. **The builder cannot read the two rule files** from the skill's folder under a strict permission mode. Pinned by Task 5 (readings 1 and 4, "0 permission denials"); under the box's mode every read is allowed.
5. **A red flag of the copied rules fires on something hstack does on purpose** (the oracle's tests, a guard, a mutant-killing test, an empty interface), and the builder deletes work and starts over. Pinned by the seven items of "In hstack" (edit E1) and edits E4, E8 and E11, by the bun test that names each item and each edit, and by Task 5 (reading 4).

Known limits, pinned by nothing:

- A context compaction late in a long run can drop the rules the builder read. Steps 6, 7 and 9 still ask for a failing test with each fix in their own words.
- A feedback entry recorded with `phase: build` by 0.3.1 or earlier is refused by `feedback draft` and can be dismissed. A run recorded with the old name is read correctly by `missing` (added after the review).

## File Structure

| Path | Change | What it is |
|---|---|---|
| `skills/build-implement/SKILL.md` | create | the skill `hstack:build-implement`: step 4 in full |
| `skills/build-implement/tdd.md` | create | upstream's `test-driven-development/SKILL.md` with the edits of Task 1 |
| `skills/build-implement/writing-good-tests.md` | create | upstream's `writing-good-tests.md` with edit W1 |
| `skills/build-implement/LICENSE-tdd` | create | one line naming the two files it covers, a blank line, then upstream's `LICENSE` verbatim |
| `skills/build/SKILL.md` | modify | the description's list of steps, the playbook sentence, step 4 renamed and cut to a stub, step 5's pointer |
| `scripts/hstack.sh` | modify | `PHASES`: `build` becomes `implement`; `missing` reads a recorded `build` as `implement` |
| `plugin-dev/test-hstack.sh` | modify | the step's name in 20 lines, and 1 check added after the review (44, 47, 73, 156, 157, 233, 234, 236, 317–323, 326, 327, 370, 372 and 383) |
| `skills/hstack-feedback/SKILL.md` | modify | the step's name in the list of phases (line 28) |
| `tests/skills.test.mjs` | modify | 3 tests |
| `.claude-plugin/plugin.json`, `README.md` | modify | 0.3.2 and what changed |
| `docs/plans/index.md`, `docs/log.md` | modify | this plan |

Upstream is `https://github.com/obra/superpowers` at `22f0b463e7a5e579904dd6211a520321035526f7` (2026-11-03, v7.0.2, MIT, Copyright (c) 2025 Jesse Vincent). The address and commit of the copy are recorded here and nowhere else in the repository. Line numbers in Task 1 are of the upstream files at that commit.

Every task ends with all suites green. `skills/build/SKILL.md` changes last (Task 3), when the skill it points to exists.

---

### Task 0: Baseline

- [x] **Step 1:** on branch `build-playbook` (from `main` = `607d1b2`), run `bun test ./tests`, `sh plugin-dev/test-hstack.sh` and `dash plugin-dev/test-hstack.sh`. Measured on 2026-11-19 (it depends on no ruling): 728 pass, 65 skip, 0 fail; 140 ok, 0 FAIL under `sh` and under `dash`.

### Task 1: the copied test rules

**Files:**
- Create: `skills/build-implement/tdd.md`, `skills/build-implement/writing-good-tests.md`, `skills/build-implement/LICENSE-tdd`
- Test: `tests/skills.test.mjs`

**Interfaces:**
- Produces: `tdd.md` starts at its title, holds a section headed `## In hstack`, and links `writing-good-tests.md` by that relative name, as upstream does.

- [x] **Step 1: Write the failing test** in `tests/skills.test.mjs`.

```js
const rule = (name) => Bun.file(new URL(`../skills/build-implement/${name}`, import.meta.url)).text();

test("the builder's test rules: no ask of a human, no upstream name, the licence beside them", async () => {
  const [tdd, good, licence] = await Promise.all([rule('tdd.md'), rule('writing-good-tests.md'), rule('LICENSE-tdd')]);
  for (const s of ['NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST', '## In hstack', '$S/capabilities.md', '](writing-good-tests.md)']) expect(tdd).toContain(s);
  // what the loop does on purpose and the copied rules would call a violation: each has its item
  for (const s of ["**The oracle's tests**", '**A guard.**', '**A mutant-killing test**', '**An empty interface.**', '**What the base already had.**', '**A fix no test can show.**', '$S/summary.md', 'Seven things are not violations']) expect(tdd).toContain(s);
  // a guard is for what the base already did, never for what this run's own code does
  for (const s of ['that the code at the base already handles', 'is not a guard; the next item is for its test', "**A test that passes at once on this run's own code.**", 'break the part of your code the edge rests on', 'undo that one edit by hand', 'never restore the file with `git checkout`', 'the test is a guard', 'make it check the edge, or drop it']) expect(tdd).toContain(s);
  // the edits of the copy, each by its new text; the text they replace is gone
  for (const s of ['write the decision in `$S/decisions.md`):**', 'A guard, or a test you then prove by breaking the code (see "In hstack"), stays', 'Only in code this run added', 'and is neither a guard nor proven by breaking the code', 'No exceptions but the ones this file names.']) expect(tdd).toContain(s);
  expect(tdd.split('No error or warning the base did not have').length).toBe(3);
  expect(tdd).not.toMatch(/Output pristine|Fix test\.$/m);
  expect(tdd).not.toMatch(/ask your human partner|human partner's permission|superpowers/i);
  expect(tdd.startsWith('# Test-Driven Development')).toBeTruthy(); // a file of a skill, not a skill: no frontmatter
  expect(good).not.toMatch(/superpowers/i);
  for (const s of ['tdd.md', 'writing-good-tests.md', 'Permission is hereby granted', 'Copyright (c)']) expect(licence).toContain(s);
});
```

- [x] **Step 2:** run `bun test ./tests/skills.test.mjs`. Expected: the new test fails (no such file).

- [x] **Step 3: Copy.** Clone upstream into a scratch folder, check out the pinned commit, and copy `skills/test-driven-development/SKILL.md` to `skills/build-implement/tdd.md`, `skills/test-driven-development/writing-good-tests.md` to `skills/build-implement/writing-good-tests.md`, and `LICENSE` to `skills/build-implement/LICENSE-tdd`, with this line and a blank line put before it: `Applies to tdd.md and writing-good-tests.md in this folder.`

- [x] **Step 4: Edit `tdd.md`,** these and nothing else.

| Id | Upstream lines | Before | After |
|---|---|---|---|
| E0 | 1–5 | the frontmatter and the blank line after it | nothing: the file starts at its title |
| E1 | after 14 (end of Overview) | nothing | the section below |
| E2 | 24 | `**Exceptions (ask your human partner):**` | ``**Exceptions (decide, and write the decision in `$S/decisions.md`):**`` |
| E4 | 126 | `**Test passes?** You're testing existing behavior. Fix test.` | `**Test passes?** You're testing existing behavior. A guard, or a test you then prove by breaking the code (see "In hstack"), stays; any other test: fix it.` |
| E5 | 179 and 302 | `Output pristine (no errors, warnings)` | `No error or warning the base did not have` |
| E7 | after 202 (`Keep tests green. Don't add behavior.`) | nothing | `Only in code this run added: leave code and tests that existed at the base as they are.` |
| E8 | 242 | `- Test passes immediately` | `- Test passes immediately and is neither a guard nor proven by breaking the code` |
| E10 | 312 | `Write wished-for API. Write assertion first. Ask your human partner.` | `Write wished-for API. Write assertion first.` |
| E11 | 330 | `No exceptions without your human partner's permission.` | `No exceptions but the ones this file names.` |

That is 9 kinds of edit in 10 places of a 330-line file (at the branch's tip `diff` prints 10 hunks, one for each place). E3, E6 and E9 of the first draft (the example commands) and E12 of the second (the link, changed for the withdrawn `play` verb) are withdrawn.

The section of E1, exactly:

```markdown
## In hstack

No human is in this run. Where this file would ask one, decide and write the decision in `$S/decisions.md`.

These rules govern every test and every line of product code the builder writes in step 4, and every fix in steps 6, 7 and 9. Seven things are not violations of them, in the rules, the red flags and the checklist alike:

- **The oracle's tests** (step 3) are the failing tests for the stated behaviours. Make them pass; write no second test for what one of them checks.
- **A guard.** A test for a decided edge that the code at the base already handles, before this run changed anything, passes at once. Keep it and mark the edge in `$S/spec.md` as already holding. It is the one test you do not watch fail. An edge that holds only because of code this run wrote is not a guard; the next item is for its test.
- **A test that passes at once on this run's own code.** One piece of code often settles several decided edges, and the cycle puts one test before its code. The test of a further edge, written after that code, is kept only once you have seen it fail: break the part of your code the edge rests on, run the test and see it fail, then undo that one edit by hand and see it pass. The code of step 4 is not committed yet, so never restore the file with `git checkout` here: that would throw the step's work away. If no break of this run's code makes it fail, it checks nothing this run built: where the base already handles the edge, the test is a guard; otherwise make it check the edge, or drop it.
- **A mutant-killing test** (step 8) is written after the code. Its failing run is the run with the mutant applied.
- **An empty interface.** When a test you wrote cannot run because a public interface does not exist yet, add that interface, empty, and run the test again until it fails on the behaviour. The test came first, so this is not code before a test.
- **What the base already had.** A failing test, an error or a warning that Setup recorded at the base is not yours to fix. "All tests pass" and "Other tests fail? Fix now" mean the tests that passed at the base.
- **A fix no test can show.** A lint, format or type error in code this run wrote is fixed without a new test: the failing check is its red run.

Inside the cycle run the tests near the change. The project's suite runs once, as wide as the time allows, at the end of step 4. Where this file says "your report", write `$S/summary.md`.

The examples below are TypeScript, and their commands are those of an example project. Every command you run comes from `$S/capabilities.md`.
```

- [x] **Step 5: Edit `writing-good-tests.md`,** this and nothing else. The two quoted remarks at upstream lines 96 and 132 ("your human partner's correction", "your human partner's question") are quotations, not asks, and stay.

| Id | Upstream lines | Before | After |
|---|---|---|---|
| W1 | 51 | `agent's behavior (superpowers:writing-skills); prose for humans earns no` | `agent's behavior; prose for humans earns no` |

- [x] **Step 6: Check the copy against upstream.** Run `diff <upstream>/skills/test-driven-development/SKILL.md skills/build-implement/tdd.md` and the same for `writing-good-tests.md`; `tail -n +3 skills/build-implement/LICENSE-tdd | cmp - <upstream>/LICENSE` must be silent. Every hunk must be one of the edits listed above. Write the two hunk counts under "Results".

- [x] **Step 7:** run `bun test ./tests`. Expected: 729 pass, 65 skip, 0 fail (Task 0's count plus 1).

### Task 2: the skill `hstack:build-implement`

**Files:**
- Create: `skills/build-implement/SKILL.md`
- Test: `tests/skills.test.mjs`

**Interfaces:**
- Consumes: `tdd.md`, `writing-good-tests.md` (Task 1).
- Produces: a skill named `build-implement`, invoked as `hstack:build-implement`, with no `disable-model-invocation` mark.

- [x] **Step 1: Write the failing test** in `tests/skills.test.mjs`.

```js
test('hstack:build-implement is step 4: the loop can invoke it, and it sends anyone else to the loop', async () => {
  const text = await skill('build-implement');
  const front = text.split('\n---')[0];
  expect(front).toMatch(/^name: build-implement$/m);
  expect(front).toMatch(/^description: .*invoke hstack:build, not this\.$/m);
  expect(front).not.toMatch(/disable-model-invocation/); // the playbook must be able to trigger it
  // the cycle is one test at a time, and a change after green starts a new one: the first run did neither
  for (const s of ['one decided edge or rule per cycle', 'Only then write the next test', 'is a new cycle and starts with a test that fails', "the cycle's refactor step changes none of these", 'A next test that passes at once', 'break that code, see the test fail, undo that one edit by hand']) expect(text).toContain(s);
  for (const s of ['do nothing here and invoke `hstack:build`', 'its first word must be `implement`', 'never run `$H start` again', 'tdd.md', 'writing-good-tests.md', '$S/spec.md', 'without editing them', 'type-check']) expect(text).toContain(s);
});
```

- [x] **Step 2:** run `bun test ./tests/skills.test.mjs`. Expected: the new test fails (no such file).

- [x] **Step 3: Write `skills/build-implement/SKILL.md`,** exactly:

```markdown
---
name: build-implement
description: Step 4 of the hstack build loop - the spec, the feature written test-first, the checks. Invoked by hstack:build at its step 4 and by nothing else. For any request to build, change or fix code, invoke hstack:build, not this.
---

# hstack build-implement: step 4 of the build loop

You are here from step 4 of `hstack:build`: that loop gave you `H` and `S`, and its steps 1 to 3 ran in this session. If that is not so (you came here straight from a request to build, change or fix something), do nothing here and invoke `hstack:build`, which starts the run. If it is so, run `$H missing`: its first word must be `implement`. If it is another step, go back to that step in the loop; never run `$H start` again in this run.

Do the items below in order, then go back to the loop for the commit and `$H phase implement`.

1. **Read** the code the requirement touches and the neighbouring features that do similar things.
2. **Spec.** Write `$S/spec.md`: numbered behaviours; every entry point the feature is reached by (each page, endpoint, command, public function, import or export path, serializer, setting); each open edge from the oracle report and every other edge you see (empty, missing, invalid, boundary values, errors, permissions, existing data, repeated actions, ordering, other entry points) with a decision that cites the requirement or the existing code it follows. Decide an edge the way this codebase already decides the same case.
3. **The test rules.** Read `tdd.md` and `writing-good-tests.md` in this skill's base directory, both to the end. From here to the end of the run they are the rules for every test and every line of product code you write.
4. **Implement,** in the style of the neighbouring code, by the cycle of the test rules, one decided edge or rule per cycle: write one test where the project's test command finds it, run it and see it fail on the missing behaviour, write the code for that one test, run it and see it pass. Only then write the next test: never several tests before their code. A next test that passes at once, because code you already wrote settles its edge, is kept only as the test rules say: break that code, see the test fail, undo that one edit by hand (your code is not committed yet). A change to what the product does after its test passes (an output, a message, an exit code) is a new cycle and starts with a test that fails; the cycle's refactor step changes none of these. Run tests in their single-file or single-target form from the capabilities.
5. **The oracle's tests.** Make them pass **without editing them**. If one contradicts the requirement or a fact of the existing public interface, use the dispute rule of step 4 in the loop.
6. **Check.** Run the tests near the change, then the widest suite the time allows, then build, type-check and lint as the capabilities have them. No failure the base did not have.
```

- [x] **Step 4:** run `bun test ./tests`. Expected: 730 pass, 65 skip, 0 fail.

### Task 3: the playbook

**Files:**
- Modify: `skills/build/SKILL.md` (the opening, step 4, one pointer in step 5), `scripts/hstack.sh` (line 12), `skills/hstack-feedback/SKILL.md` (line 28)
- Test: `tests/skills.test.mjs`, `plugin-dev/test-hstack.sh` (20 lines)

**Interfaces:**
- Consumes: the skill `hstack:build-implement` (Task 2).

- [x] **Step 1: Write the failing test** in `tests/skills.test.mjs`.

```js
test('build is a playbook: step 4 invokes hstack:build-implement', async () => {
  const loop = await skill('build');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) expect(loop).toMatch(new RegExp(`^## ${n}\\. `, 'm'));
  expect(loop.split('\n---')[0]).toContain('written before the code, the implementation, a gate');
  expect(loop).toMatch(/^## 4\. Implement$/m);
  expect(loop).toContain('Invoke the `hstack:build-implement` skill');
  expect(loop).toContain('$H phase implement');
  expect(loop).not.toContain('$H phase build');
  expect(await skill('hstack-feedback')).toContain('`setup`, `oracle`, `implement`, `gate`');
  expect(loop).toContain('(or dispute it, step 4)');
  expect(loop).toContain('**Dispute** (at most 2 rounds)');
  expect(loop).toContain('a fix gets a test that fails first, but a lint, format or type fix'); // step 9 agrees with the test rules
  expect(loop).not.toContain('numbered behaviours'); // the how of step 4 lives in hstack:build-implement
});
```

- [x] **Step 2:** in `plugin-dev/test-hstack.sh` write `implement` for the step `build` on every line that `grep -n 'build' plugin-dev/test-hstack.sh | grep -v 'hstack:build'` prints, but the three that say "building" (209, 212, 218): 20 lines, 44, 47, 73, 156, 157, 233, 234, 236, 317–323, 326, 327, 370, 372 and 383. The entries of lines 317–326 must keep a phase the script knows, or they are refused for the wrong reason and their checks pass without testing anything. Run `bun test ./tests/skills.test.mjs` and `sh plugin-dev/test-hstack.sh`. Expected: the new bun test fails on the heading, and the sh checks that name the step fail.

- [x] **Step 3: The opening.** In the frontmatter's `description`, in the list of the loop's steps, write `the implementation` for `the build`. After the first paragraph ("You are the builder. …A stop before the last step is a failure.") add this paragraph:

```markdown
This file is the playbook: which step runs, in what order, who does it, what goes in, what comes out and how long it may take. How a step is done is in its own file: an agent's file, or a skill this playbook invokes.
```

- [x] **Step 4: Step 4.** Change the heading `## 4. Build` to `## 4. Implement` and replace its seven items with the text below. The Dispute paragraph is the present item 5, word for word.

```markdown
Invoke the `hstack:build-implement` skill with the Skill tool and do what it says, from its first item to its last. In: `$S/requirement.md`, `$S/capabilities.md`, `$S/oracle-report.md`. Out: `$S/spec.md`; the feature and its tests; the oracle's tests passing, unedited; no failure the base did not have.

**Dispute** (at most 2 rounds): if an oracle test contradicts the requirement or a fact of the existing public interface, write the claim in `$S/disputes.md` (test, claim, the quote or fact it rests on) and start `hstack:oracle` again with `requirement.md`, `capabilities.md`, the test file and that dispute entry only. Only the oracle edits its test. Then `$H lock` all oracle files again, commit, and write the new commit to `$S/oracle-commit`.

Commit. `$H phase implement`.
```

- [x] **Step 5: Step 5 and the names.** In `skills/build/SKILL.md` change `(or dispute it, step 4.5)` to `(or dispute it, step 4)`. In `scripts/hstack.sh` line 12 write `PHASES='setup oracle implement gate review explore mutate final'`. In `skills/hstack-feedback/SKILL.md` line 28 write `implement` for `build` in the list of phases.

- [x] **Step 6:** run `bun test ./tests`. Expected: 731 pass, 65 skip, 0 fail (Task 0's count plus 3). Run both sh suites: 140 ok, 0 FAIL each, the count unchanged. `grep -rn 'phase build' skills scripts agents` prints nothing.

### Task 4: version and records

**Files:**
- Modify: `.claude-plugin/plugin.json`, `README.md`, `docs/plans/index.md`, `docs/log.md`

- [x] **Step 1:** `plugin.json` version `0.3.2`.
- [x] **Step 2:** `README.md`: the status line reads `**Status: v0.3.2.**`, and after the sentence that ends "each in its own context." add: "Step 4 is a skill of its own, `hstack:build-implement`, which the loop invokes, with its test rules beside it (`tdd.md`, `writing-good-tests.md`; third-party text, licence in `skills/build-implement/LICENSE-tdd`)." In the skills table add a row under `build`: `build-implement`, "Step 4 of `build`: the spec, the feature written test-first, the checks. Invoked by the loop, not by you." The sentence that every version after `653af83` is unmeasured stays.
- [x] **Step 3:** `docs/plans/index.md` has this plan's line and `docs/log.md` its `Creation` line (both added with the draft); add an `Update` line when the plan turns `stable`.
- [x] **Step 4:** run `bun test ./tests`, both sh runs and `bun scripts/okf-check.mjs docs`. Expected: the counts of Task 3 and a clean checker.
- [x] **Step 5:** one review of the whole diff on the most capable model, its findings fixed with a check each, then the advisor's read. Commit on the branch; push and merge only on the user's word.

### Task 5: one end-to-end run (right after Task 4, by itself)

- [x] **Step 1:** rebuild the 2026-11-10 fixture in the scratchpad: a small command-line program with one test in the language's own test runner, in a fresh git repository; the task "add `--top N`" with an interface sheet and the line "When the task is done, reply exactly DONE."
- [x] **Step 2:** from the fixture's folder, with `HSTACK_STATE` set to a new folder `<state>` in the scratchpad, run the command below. It follows run 2 of 2026-11-10 (`plugin-dev/2026-11-10-checks.md`, "End-to-end runs"), whose record gives the mode and "Bash allowed" but not its list of tools; the list here is this plan's. The model is the session's default. Run it in the background with a cap of 60 minutes. If the cap is hit, write "stopped at 60 minutes" and the steps recorded so far under "Results", and stop: no second run. If the local classifier refuses the nested run, as it did for W on 2026-11-11, write that under "Results" and stop: no other mode is tried.

```sh
HSTACK_STATE=<state> claude -p "<the task, its interface sheet and the DONE line>" \
  --plugin-dir <this work tree> --setting-sources project,local --strict-mcp-config \
  --permission-mode dontAsk --allowedTools Bash Read Write Edit Glob Grep Agent Skill \
  --add-dir <state> --output-format stream-json --verbose > <scratchpad>/run.jsonl
```

- [x] **Step 3: Read the transcript,** tool calls only, and write each reading under "Results":
  1. Between `phase oracle` and `phase implement`: a Skill call of `hstack:build-implement`, then for `tdd.md` and for `writing-good-tests.md` a tool call whose result holds the file (a Read, or a Bash command that prints it), not an error.
  2. For one or more test files the builder wrote in that span: a run of it that exits non-zero comes before the first edit of a non-test source file that follows it. If the builder wrote no test file there, or `spec.md` marks every edge it tested as already holding, the reading is "not exercised" and says nothing about compliance.
  3. Between the Skill call and `phase implement`: the build, type-check and lint commands of `capabilities.md`, or their `unavailable` lines.
  4. All 8 phases recorded, `done` equals HEAD, 0 Stop blocks, 0 permission denials; no source file the run wrote was deleted whole and written again.
  5. Minutes and cost, beside run 2's 3 minutes and USD 1.09. This is scale, not a comparison: the plugin version differs.
- [x] **Step 4:** if reading 1 or 2 fails, the wording is what failed: report it and propose the change; do not patch the run.
- [x] **Step 5:** commit the "Results" of this task as a second commit on the branch.

## Not built

- A `tdd` slot in the manifest, or any way to pick another outside skill. `scripts/lib/manifest.mjs` still writes the old slot defaults, which the build loop does not read; untouched.
- A builder agent for step 4; a skill of its own for the test rules; the `hstack.sh play` verb.
- A full second name for the old step. Tried in a scratch repository: `feedback add bug build` is refused with the usage text; `phase build` is still accepted, as any lowercase word is, and `missing` counts it as `implement` (added after the review). Nothing writes the old name any more.
- A script check of test order (a `red` verb, commits of tests before code).
- Step 2 as a skill; a rule for a builder that cannot make a correct oracle test pass; a clean-tree check in `hstack.sh start`.
- Any new benchmark run or any claim about product quality.

## After the review

Task 4's review (one fresh reviewer on the most capable model, read-only) found no Critical defect, 4 Important and 5 Minor. Each was fixed with a check that failed first, but the last two. The exact texts above, the three test blocks included, are the texts as they stand at the branch's tip; the expected counts in the tasks' steps are those of the plan as approved, and "Results" has the counts measured.

| # | Finding | What was done | Its check |
|---|---|---|---|
| 1, 2 | The guard of `hstack:build-implement` read only the run's state: with no run it could send a cold caller on with "never start again", and with a stale open run it sent a new request into the old run | The guard now turns first on whether the loop sent the builder here in this session; only then does it read `$H missing` | bun: the three sentences of the guard and the description's redirect |
| 3 | The copied rules still asked for a fully green suite and a ticked "watched each test fail", against a base with failures and against a guard | Two additions to "In hstack" ("What the base already had", and the guard is "the one test you do not watch fail"); the copied lines are untouched | bun: each item of "In hstack" by name |
| 4 | The new tests passed with three items of "In hstack" deleted, four edits reverted, the guard changed and the Dispute paragraph removed | The tests name each item, each edit by its new text, the guard's sentences and the Dispute paragraph | the tests themselves |
| 5 | A run recorded by 0.3.1 or earlier has `build` in `phases`, so it read as waiting at `implement` and could be closed with no oracle or review | `missing` reads a recorded `build` as `implement` | sh: "a run recorded with the old step name misses nothing" (141 checks) |
| 6 | A lint or type error in new code has no failing test, and the file allows no unnamed exception | Item "A fix no test can show" added to "In hstack" | bun, as 3 |
| 7 | The copied rules ask for "your report", which the loop does not have | One sentence of "In hstack": it is `$S/summary.md` | bun, as 3 |
| 8 | `docs/plans/index.md` named a skill that does not exist; `plugin-dev/2026-11-10-hstack-plugin-design.md` still lists `build` as a step | The index line is fixed. The design is the dated record of version 0.2.0 and is left as it is | none |
| 9 | "Results" held Task 0 only | Filled in below | none |

Not checked by the reviewer, by its own account: `dash` and the full bun suite (both rerun by the author after the fixes), and a real invocation of the skill (Task 5).

## After the run

Task 5 found two places where the builder left the test rules, and the review had left one known limit. The user's word on 2026-11-19, asked what was needed of them: "cái gì cần sửa thì phải sửa". Fixed, each with a check that failed first:

| What | Before | After | Its check |
|---|---|---|---|
| Six tests written in one batch, then the code in one edit | item 4 of `hstack:build-implement`: "one decided edge or rule at a time, by the cycle of the test rules: its test …, the run that fails …, the code, the run that passes" | "one decided edge or rule per cycle: write one test …, run it and see it fail …, write the code for that one test, run it and see it pass. Only then write the next test: never several tests before their code." | bun: both sentences |
| A change to the code after green with no failing test | nothing said | "A change to what the product does after its test passes (an output, a message, an exit code) is a new cycle and starts with a test that fails; the cycle's refactor step changes none of these." | bun: both halves |
| Step 9 of the playbook said "a fix gets a test", against "In hstack", which lets a lint or type fix go without one | "Fix what fails (a fix gets a test)." | "Fix what fails: a fix gets a test that fails first, but a lint, format or type fix, which no test can show." | bun: the sentence |

The text of `skills/build-implement/SKILL.md` in Task 2 above is the text after this fix.

The second row was first written as "A change to product code after its test passes is a new cycle", which contradicted the refactor step of the copied rules: a refactor is a change to product code after green. The second run below ran on that first wording; the sentence was corrected after it, and no run has read the corrected sentence.

### The second run

The user's word covered the fixes; this run was the author's own decision, not asked for, and it cost USD 3.05 (USD 5.87 for both runs). One more run of Task 5's command, on commit `dadc45c` and on a clean clone of the fixture at its first commit (no untracked cache folders this time), to see whether the new wording of item 4 changed what the builder does. It replied `DONE`: 5 minutes 24 seconds, USD 3.05, 22 turns, 0 permission denials, 8 steps recorded, `done` equals HEAD, 0 Stop blocks; agents: oracle 1, reviewer 1, explorer 1, mutator 1.

- **The skill and the rules:** as in the first run (the Skill call, `$H missing`, both files printed by one `cat`).
- **One test, then its code: yes, for the one edge that needed code.** The oracle's tests ran first and failed (7 of 8). After the code for them, the builder wrote one test (a negative N), ran it alone (1 test, 1 failure: exit code 0 where 2 was expected), then wrote the code for it. The first run had written six tests at once.
- **The other three edge tests were written together,** in the same edit as that code, and passed on their first run; they were never seen failing. `spec.md` marks each as a guard ("Holds from … (guard test)"). This is an open point, not compliance: the guard item of "In hstack" says "the codebase already handles", and here the edges were handled by code the builder had written one call earlier, not by the base. In this run only the mutation step checked those three tests.
- **A change after green with no failing test: again.** Before the commit of step 4 the builder moved the check for a negative N from one place to another, and with it the wording of the message for a value that is not an integer changed. No test asserts that wording, and none failed first. Under the corrected sentence this is either a refactor that should not have changed a message, or a change of behaviour that needed a test.
- **Parts of "In hstack" this run exercised, which the first did not:** guards (above); a fix from review or explore with its test first (a test added and failing, 1 of 5, then the code, then 14 passing); a mutant-killing test (written, the mutant applied and the test failing, the file restored with `git checkout`, the suite passing). Still not exercised by either run: an empty interface, a base with failures, a lint or type fix.

Two runs on one small fixture: they show what the builder did twice, not what it will do on another project.

### The guard, after the second run

The second run's open point was put to the user with the run's own example (the test for `--top 0` written after the code for `--top`, and called a guard). The user's answer to "do you want it fixed": "Có".

- **First wording, commit `6379bad`, wrong.** The guard item was narrowed to an edge "that the code at the base already handles, before this run changed anything", which stands, and ended "its test comes before that code", which does not: item 4 of the skill forbids several tests before their code, and one piece of code often settles several edges (on the fixture, accepting `--top` settles `--top 0`, an empty file and an N larger than the number of words at once). No order of tests and code obeys both. The advisor found this; the author's check had been a string check, and the explanation given to the user carried the same conflict.
- **Repair.** A seventh item of "In hstack", "A test that passes at once on this run's own code": such a test is kept only once it has been seen failing, by breaking the part of the run's code the edge rests on, running the test, and putting the code back; if no break makes it fail, it checks nothing this run built. Edits E4 and E8 and item 4 of the skill name this case. It is the kind of red run step 8 uses for a mutant-killing test, with one difference the item states: in step 4 the code is not committed, so the break is undone by hand and never with `git checkout`, which would discard the step's work. If no break makes the test fail and the base already handles the edge, the test is a guard. Both clauses were added after the advisor's second read of the repair.
- **What the user approved and what this is.** The user approved "the test before the code", as the author had put it. The repair keeps the purpose (every such test is seen failing) and not that letter: the test may come after the code. It is the author's, for the user to accept or turn back.
- **Walked through** `tdd.md`, `SKILL.md` and the playbook on the fixture's edges before the commit: an edge the base handles (a guard), an edge one earlier piece of this run's code settles (proved by breaking it), an edge that needs code (its own cycle), a fix from review, a surviving mutant.

Read by no run: the refactor sentence, the narrowed guard, the new item and its two clauses.

Seen in Task 5's transcript afterwards and not changed: the first mutation agent refused to start because the tree had two untracked cache folders, left there by the fixture's own preparation, and the builder started a second one after clearing the status. A project whose test runs leave untracked files and ignores none of them would meet the same refusal; telling the builder to delete untracked files could delete something the user keeps, so the playbook is left as it is.

## Results

- **Task 0** (2026-11-19, before any change): `bun test ./tests` 728 pass, 65 skip, 0 fail; `sh plugin-dev/test-hstack.sh` and `dash plugin-dev/test-hstack.sh` 140 ok, 0 FAIL each.

- **Task 1:** `diff` against upstream at the pinned commit: `tdd.md` 11 hunks, all of E0–E11 (the insertion E1 printed as two), `writing-good-tests.md` 1 hunk (W1); the licence is identical after its first two lines. `bun test ./tests`: 729 pass, 65 skip, 0 fail.
- **Task 2:** the skill written; `bun test ./tests/skills.test.mjs` 4 pass.
- **Task 3:** before the edits the new bun test failed and 18 sh checks failed on the step's name; after them `bun test ./tests/skills.test.mjs` 5 pass, `sh` and `dash` 140 ok, 0 FAIL; `grep -rn 'phase build' skills scripts agents` prints nothing.
- **Task 4:** version 0.3.2. After the review's fixes: `bun test ./tests` 731 pass, 65 skip, 0 fail; `sh plugin-dev/test-hstack.sh` and `dash plugin-dev/test-hstack.sh` 141 ok, 0 FAIL each; `bun scripts/okf-check.mjs docs` OK.
- **Task 5** (2026-11-19, on commit `f03aef7`; a second run after the fix is under "After the run"). The fixture: a word-count program in one file with one test in the language's own test runner; the task: add `--top N`, with an interface sheet of three lines and the DONE line. The command of step 2 as written, in the background. The first event listed plugin `hstack` with the skills `hstack:build` and `hstack:build-implement`, the harness's own built-in plugins and no other; mode `dontAsk`; the model was the session's default (its name is kept out of the repository). The run replied `DONE`. No call was refused, so the list of allowed tools did not get in the way.
  1. **The skill and the rules: yes.** After `phase oracle` the builder called the Skill tool with `hstack:build-implement`, then ran `$H missing` (first word `implement`) and printed `tdd.md` and `writing-good-tests.md` with one Bash `cat`: 19,539 characters, the last line of each file in the result, not cut. It used no Read call.
  2. **A failing run before the code: yes, with two things the wording did not get.** The builder wrote one test file of 6 tests, ran it (6 failures, 1 error) and only then edited the source file for the first time; the suite then passed (14 tests). But it wrote the six tests in one batch and the code in one edit, not "one decided edge or rule at a time". And after the suite was green it changed the code once more (a clearer message for a value that is not an integer) with no failing test before that change: the existing test of that edge passed before and after.
  3. **Build and lint in step 4: yes.** `capabilities.md` has a build command (a syntax check; the project has no type checker) and `lint | unavailable`. The build command ran twice inside step 4, after each code edit.
  4. **The run as a whole: yes.** 8 steps recorded (`setup oracle implement gate review explore mutate final`), `done` equals HEAD, the tree clean, 0 Stop blocks, 0 permission denials; no file was deleted whole and written again. Agents called: oracle 1, reviewer 1, explorer 1, mutator 2. One tool result was an error: the first command ended on a `cat` of a file that does not exist. The loop recorded one stumble by itself, `setup-failure at setup` (the unavailable linter).
  5. **Scale:** 4 minutes 55 seconds, USD 2.82, 24 turns. Run 2 of 2026-11-10 was about 3 minutes and USD 1.09 on another model and plugin version; this is not a comparison.

  What the run does not show: anything about a project with a slow suite, a compiled language, or a base with failures; whether a second run would behave the same; whether the product is better than without the rules. Reading 2's two misses were the wording's to answer (Task 5 step 4); the wording was changed afterwards, in `dadc45c` and the commit after it ("After the run").
