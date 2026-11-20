---
type: plan
title: "Step times, canary and base check plan"
description: "hstack 0.4.1: the script records the time of each step (`phase-times`, verb `times`), shown in the last reply and never in a project's records; Setup runs a canary through every test command line and makes a whole run at the base only under an estimated 5 minutes; a red test of a suite the base did not measure is checked in a temporary worktree of the base before any code changes for it. Feedback issue 1's saved Setup is not built. One new fixture, at most three end-to-end runs."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-20T22:31:22+07:00" }
verified:
  - { by: claude-code-advisor/2.1.328, at: "2026-11-20T22:45:00+07:00" }
  - { by: human:emulatalk1, at: "2026-11-20T23:00:00+07:00" }
---

# Step Times, Canary and Base Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A run says how long each of its steps took, proves every test command with a canary, and never changes code for a red test before it knows whether the base already had it.

**Architecture:** The script gets one new state file and one new verb; nothing it already writes changes. Everything else is text of the playbook, of step 4's skill and of the oracle's file, pinned by sentence tests and checked by paid `claude -p` runs on a new fixture, then on the trial copy.

**Tech Stack:** TypeScript on Bun (1.4.5 here) with `bun test`, git, Markdown skill and agent files, Claude Code CLI for the runs, `gh` for the comment on issue 1.

**Spec:** `plugin-dev/2026-11-20-setup-times-and-canary.md` (this plan calls it "the design"; its last section has the user's 13 answers). Read it whole before Task 1.

## Global Constraints

- This repository is public. No name, path, command, test count, requirement text or log line of the trial copy or of the benchmark's private set enters a tracked file, a commit message or the issue comment. Evidence of the runs lives under `.evidence/plan-step-times-2026-11-20/` (ignored).
- `phases` keeps its format byte for byte: the Stop gate compares its lines whole.
- A step's time is shown in the builder's last reply and kept in the state folder. It enters no record, spec, decisions file or commit message of a project.
- The numbers of the design, used exactly: whole runs at the base only under an estimated **5 minutes** together; **10 minutes** for all base checks of a run; version **0.4.1**.
- The values of a `canary:` field: `pass`, `via <name>`, `not run: <why>`, `fail`; `n.a.` only on a line that runs no test.
- No saved Setup: nothing reads the state of an earlier run (`old/`) but `times --all`.
- Work on branch `step-times-and-canary`. After each task: `bun test ./tests` with 0 fail, and `bunx tsc --noEmit` with exit 0.
- Budget for the runs: about USD 15 for Task 4, about USD 20 for Task 5; past USD 40 in all, stop and ask the user. Task 5 starts only on the user's word, given then.

## Review Focus

What the design implies and no test below would otherwise meet, most likely first. Each has its test or its reading in the task named.

1. A state folder with no `phase-times` (a run started by 0.4.0 and continued, or every run in `old/`): `times` prints `no times recorded` and exits 0; `phase` goes on. Task 1.
2. `phase-times` cannot be written (it is a folder, the disk is full): the step is still recorded in `phases`, exit 0. The time is the lesser file. Task 1.
3. A mark earlier than the one before it (the clock was set back) or a `started` that is empty: no negative minutes, no crash. Task 1.
4. A run interrupted during a base check leaves a worktree registered in the user's repository. The playbook's text removes a leftover one before it adds its own, and the runs are read for `git worktree list`. Tasks 2 and 4.
5. Setup's own one-file probe meets the fixture's red test, so the base check is never reached. Task 4 says what that run then shows and what the second run is for.

---

### Task 1: `phase-times` and the verb `times`

**Files:**
- Modify: `scripts/hstack.ts` (the usage comment at line 11, `approve` at 483, `phase` at 442, a new `case 'times'` beside `elapsed` at 586, the usage line at 600)
- Test: `tests/hstack.test.ts` (a new section at the end, with its own repository made by the file's `fresh` helper)

**Interfaces:**
- Produces: the state file `$S/phase-times`, one line per mark, `<epoch seconds> <the line written to phases>`; the verb `times [--all]`.
- `times` prints, for the current run, one line per mark in file order: `<name> <minutes>` and ` skipped` after it when the mark's line holds ` skipped: `; then `total <minutes>`. Minutes are `((mark - previous) / 60).toFixed(1)`, the first mark's previous being `started`; below 0 prints `0.0`. `total` is the last mark minus `started`. A line that is not `<digits> <text>` is left out. No file, an empty file or an unreadable `started`: the one line `no times recorded`, exit 0.
- `times --all` prints, for each folder of `old/` in name order and then for the current run, a line `run old/<folder>` or `run current`, followed by that run's lines as above.

- [ ] **Step 1: Write the failing tests** (each name and its assertion; `s` is the section's state folder):
  - `'approve and phase append a mark to phase-times'`: after the `specced()` helper and `phase setup`, the file's two lines match `/^\d+ spec$/` and `/^\d+ setup$/`.
  - `'a skipped step is marked with its whole line'`: after `phase explore skipped: time`, the last line matches `/^\d+ explore skipped: time$/`.
  - `'phases is unchanged by the marks'`: `read(phases)` is exactly `'spec\nsetup\nexplore skipped: time\n'`.
  - `'times prints the minutes of each mark and the total'`: with `started` written as `1000` and `phase-times` as `1120 spec`, `1330 setup`, `1330 explore skipped: time`, `1870 final`, `1930 final`: stdout is exactly `spec 2.0\nsetup 3.5\nexplore 0.0 skipped\nfinal 9.0\nfinal 1.0\ntotal 15.5`.
  - `'a mark before the one before it counts as zero'`: marks `1120 spec`, `1100 setup` give `setup 0.0`.
  - `'a line that is no mark is left out'`: `junk` then `1120 spec` gives `spec 2.0\ntotal 2.0`.
  - `'times without marks says so'`: with the file removed, with it empty, and with `started` empty: stdout `no times recorded`, exit 0, each time.
  - `'phase records the step when phase-times cannot be written'`: with `phase-times` replaced by a folder, `phase oracle` exits 0 and `phases` ends with `oracle`.
  - `'start moves the marks to old/ with the run'`: after a finished run, a new session (`start('startup')`) and `start`: one folder of `old/` holds `phase-times`, and the state folder has none.
  - `'times --all prints each run under its folder'`: stdout holds the line `run old/<that folder>` followed by that run's lines, then `run current` followed by `no times recorded`.
- [ ] **Step 2: Run them and see them fail.** `bun test tests/hstack.test.ts`: the ten new tests fail (no file is written, `times` is the usage error), every earlier test passes.
- [ ] **Step 3: Implement.** One helper `mark(line: string)` that appends `${now()} ${line}\n` to `phase-times` inside a `try` with an empty `catch`, called in `approve` right after the `spec` line is appended and in `phase` right after its line is appended. `case 'times'` as the Interfaces block says. Add `times` to both usage lines.
- [ ] **Step 4: Run them and see them pass.** `bun test tests/hstack.test.ts`, then `bun test ./tests` and `bunx tsc --noEmit`.
- [ ] **Step 5: See a test fail on a broken copy.** Copy the script to a scratch file, delete the call of `mark` in `approve`, and run `HSTACK_SCRIPT=<copy> bun test tests/hstack.test.ts`: the first new test fails. Restore nothing in the repository; delete the copy.
- [ ] **Step 6: Commit.** `git add scripts/hstack.ts tests/hstack.test.ts`; message: `hstack: the time of each step (phase-times, the verb times)`.

### Task 2: the playbook, step 4's skill and the oracle

**Files:**
- Modify: `skills/build/SKILL.md` (the git rule at line 17; step 2 at 58 to 62; step 7 at 98; step 9 at 106; step 10 at 146; the last reply at 152)
- Modify: `skills/build-implement/SKILL.md` (item 6, line 17)
- Modify: `agents/oracle.md` (item 2 of "First call", line 17)
- Test: `tests/skills.test.mjs`

**Interfaces:**
- Consumes: the verb `times` of Task 1.
- Produces: the block named **Whose red test** in step 9, which step 2, step 7 and step 4's skill point to by that name.

- [ ] **Step 1: Write the failing tests** in `tests/skills.test.mjs`, reading the three files as the existing tests do:
  - `'setup: a canary for each test command line, a limit for whole runs at the base'`: the playbook contains `Each of these lines gets its own canary`, `canary: via`, `canary: not run:`, `canary: fail`, `under 5 minutes` and `Leave none running after`; it does not contain `only as wide as the time allows`.
  - `'final: a red test the base did not measure is checked at the base first'`: the playbook contains `**Whose red test**`, `worktree add --detach`, `base-check.md`, `share 10 minutes`, `red at the end, the base not checked`; it does not contain `yours to fix`.
  - `'the times go to the last reply, not to a record'`: the last-reply paragraph contains `` `$H times` ``; step 10 contains `No time of a step goes into a record`.
  - `'step 4 and the oracle know the rule'`: `build-implement/SKILL.md` contains `Whose red test`; `agents/oracle.md` contains `canary: pass` and `canary: fail`.
- [ ] **Step 2: Run them and see them fail.** `bun test tests/skills.test.mjs`.
- [ ] **Step 3: Edit the git rule** (line 17). Append: `One exception, to look at the base (steps 4, 7 and 9): a detached worktree of the base commit in a temporary folder outside the repository, removed when the check ends.`
- [ ] **Step 4: Rewrite step 2 from "For each capability" to the line format.** Keep the first sentence (the probe). Replace the rest of that paragraph with these three paragraphs, and give the `canary:` field of the line format the values `<pass | via <name> | not run: <why> | fail | n.a.>`:

  > **The canary.** `capabilities.md` gets one line per test command the later steps use: for each kind of test the project has (a runner, or a project or configuration of a runner with its own setup or its own pattern for test files), its one-file form and, where it exists, its one-test form; and its whole suite. Each of these lines gets its own canary, through its own command: write one throwaway test in the project's own style that must fail, where that line's tests live; confirm the command reports it as failed; delete it; confirm `git -C <the code repository> status` shows nothing left. The canary runs that one test, not the project's tests. A whole-suite line that gets no whole run at the base (below) is not run for the canary: write `canary: via <the name of a line that is the same command with one file selected>`. When the whole-suite command is another command than every narrow line, select one file through its own arguments and run the canary so; when it cannot be narrowed, write `canary: not run: <why>`. `canary: n.a.` is only for a line that runs no test.
  >
  > A canary that fails (the command does not report the throwaway test as failed) means the line is wrong: look for the right command once more and run the canary again. If it fails again, write `canary: fail`. That kind of test is no evidence in this run: the oracle writes no test of that kind, a behaviour only that kind could test is recorded as not checked by a test, and the run goes on with the other kinds.
  >
  > **A whole run of a suite at the base.** The project's rule comes first: a suite the project says is not run whole before the work gets no whole run here, and a project that asks for the whole suite before new work gets it, outside this step's cap, with each failure recorded. Otherwise whole runs at the base are made only while their estimated time, all of them together, stays under 5 minutes. The time is what the project's records, README or CI file say; else the time of the one-file run times the number of test files; else, when neither gives a number you would stand by, the suite is slow and is not run whole. Stop a whole run that is still going at 5 minutes and write `probe: not run whole (cut at 5 min)`. Leave none running after `phase setup`, in the background or otherwise. A whole run made with the throwaway test in place is probe and canary in one. A test of a suite that got no whole run here, when it is red in step 4's check or in step 9, goes through **Whose red test** (step 9).

- [ ] **Step 5: Rewrite step 9, item 1.** Replace the sentence `The base is taken as green for such a suite, so a test of it that fails here is yours to fix.` with: `A suite that got no whole run at the base runs whole here under the same rule as any suite: whatever the clock when it must be green before a merge, else as wide as the time allows. A red test of a suite that Setup ran whole at the base is yours unless Setup recorded it as failing there. A red test of a suite that got no whole run at the base goes through **Whose red test**, below, before any code changes for it.` Then add this block after the step's numbered list:

  > **Whose red test.** For a test that is red in step 4's check or here, of a suite whose failures at the base Setup did not measure. Only evidence makes it not this run's; never your own reading of the diff.
  >
  > - It can be checked only if it exists at the base and this run did not write or edit it: not an oracle test, not a test you added, not a test the gate lists as changed. Any other red test is yours.
  > - The check. If `git -C <the code repository> worktree list` names a folder under the system's temporary folder whose last part is `hstack-base`, an earlier check left it: remove that one. Never remove, move or change any other worktree: they are the user's. Then `git -C <the code repository> worktree add --detach <a new folder under the system's temporary folder>/hstack-base $(cat $S/base)`. If the project has an installed dependency folder, link it into the checkout; never copy it, never install. Run only the red tests there, in the single-test form of the capabilities. Write the command, the exit code and the end of the output, at the base and at the end, to `$S/base-check.md`. Then `git -C <the code repository> worktree remove --force <that folder>`, and confirm that `worktree list` no longer names it. A line of the project's own record that names the test as failing at the base commit, quoted in `base-check.md`, is evidence too.
  > - All base checks of a run share 10 minutes. Past them, remove the checkout and run nothing more at the base: what was checked keeps its result, and every other red test is not checked.
  > - **Red at the base too:** not this run's. Change no code for it. Step 10 lists it under "Needs your ruling" with the lines of `base-check.md`, and says so when the two failures' messages differ.
  > - **Green at the base:** yours. Fix it.
  > - **Not checked** (the 10 minutes; no dependencies to link; a service or a port the base cannot have beside the run's own): taken as yours. Try to fix it inside the time rules. If you cannot, step 10 lists it under "Needs your ruling" as "red at the end, the base not checked".

- [ ] **Step 6: Edit step 7** (line 98). After `(does the step hold at the base commit?)` add: ` Walk the step in a base checkout made as in **Whose red test** (step 9), by what the explorer's report says it did, inside the same 10 minutes.` After the sentence that ends `with the explorer's evidence.` add: ` If the step cannot be walked at the base: change no code for it, and step 10 lists it under "Needs your ruling" as "not checked at the base".`
- [ ] **Step 7: Edit step 10, item 7** (line 146). `any test that already failed at the base (setup recorded it; the run did not fix it)` becomes `any test that already failed at the base (setup recorded it, or \`base-check.md\` shows it; the run did not fix it)`. After `what was not run;` add ` a test command whose canary is \`not run\` or \`fail\`, among it;`. At the end of the item add: ` No time of a step goes into a record.`
- [ ] **Step 8: Edit the last reply** (line 152). At the end of the paragraph add: ` Then the output of \`$H times\`, as it is.`
- [ ] **Step 9: Edit `skills/build-implement/SKILL.md`, item 6.** After `No failure the base did not have.` add: ` A red test of a suite that got no whole run at the base goes through **Whose red test** of the playbook's step 9 before you change code for it.`
- [ ] **Step 10: Edit `agents/oracle.md`, item 2 of "First call".** At its end add: ` Use only a test command whose line there says \`canary: pass\` or \`canary: via …\`. A kind of test whose line says \`canary: fail\` gets no test from you: name in your report each behaviour that this leaves without a test.`
- [ ] **Step 11: Run the tests and see them pass.** `bun test tests/skills.test.mjs`, then `bun test ./tests`.
- [ ] **Step 12: Read the three files once whole** for a sentence the edits left pointing at the old rule (the words `as wide as`, `taken as green`, `both report it`). Fix each, or write under "Results" why it stays.
- [ ] **Step 13: Commit.** Message: `build: a canary for each test command, whole runs at the base under 5 minutes, a red test checked at the base before any fix`.

### Task 2b: a fresh reader of the text (added at the approval, on the user's word)

The user approved native execution with one addition: after Task 2 and before any paid run, a reviewer with a fresh context reads the three text files as a builder would.

- [ ] **Step 1:** Start one agent with no part of this conversation. Give it `skills/build/SKILL.md`, `skills/build-implement/SKILL.md` and `agents/oracle.md`, and the question: reading these as the builder who must follow them, which sentences of step 2, step 7, step 9, step 10 and the last reply can be read two ways, contradict another sentence, or leave a case with no instruction? It gets neither the design nor this plan.
- [ ] **Step 2:** For each finding: change the text (with its sentence test first when a pinned sentence changes), or write under "Results" why the text stays. Whole suite again. Commit.

### Task 3: the README and the version

**Files:**
- Modify: `README.md` (line 5 and wherever Setup, the canary or the last reply are described), `.claude-plugin/plugin.json` (line 3)

- [ ] **Step 1:** `plugin.json`: `"version": "0.4.1"`. README line 5: `v0.4.1`.
- [ ] **Step 2:** In the README's description of the loop, say in one sentence each: every test command is proven by a canary; a whole run at the base is made only when it is short; a red test the base did not measure is checked at the base before any fix; the last reply ends with the time of each step. Name the verb `times` where the script's verbs are listed.
- [ ] **Step 3:** `grep -rn '0\.4\.0' README.md .claude-plugin skills scripts tests`: every hit that names the plugin's current version becomes `0.4.1`; a hit that names the past version (a plan, a design, a test of old state folders) stays.
- [ ] **Step 4:** `bun test ./tests`; commit. Message: `hstack 0.4.1: step times, a canary for each test command, the base check`.

### Task 4: the fixture and its runs (the controller's own task; paid)

**Files:**
- Create, outside this repository: a scratch folder with the fixture and its own `HSTACK_STATE`
- Create: `.evidence/plan-step-times-2026-11-20/` (ignored): `requests.md`, the transcripts `f1-1.jsonl`, `f1-2.jsonl` (and `f2-…` for a second run), a copy of each run's state folder
- Modify: this plan, section "Results"

- [ ] **Step 1: Build the fixture** in the scratch folder, as one commit of a fresh repository:
  - `wordcount.py`: a command-line program that prints the number of words of a file.
  - `tests/unit/test_count.py`: two `unittest` tests that pass. Command: `python3 -m unittest discover -s tests/unit`.
  - `tests/slow/`: three files, `test_a_files.py`, `test_m_encoding.py`, `test_z_report.py`, each with one `unittest` test that runs the program as a process. The test in `test_z_report.py` asserts an output the program does not give and is red at this commit; it has nothing to do with the request. Command: `python3 -m unittest discover -s tests/slow`.
  - `README.md`: the six commands below, and this rule, word for word: `The slow suite is never run whole before work begins. It is run whole once before a merge, and it must be green then.`
  - `.gitignore`: `__pycache__/`.
  - The six commands, word for word in the README: `python3 -m unittest discover -s tests/unit` (unit, whole); the same with `-p test_count.py` (one file); the same with `-k <test name>` (one test); `python3 -m unittest discover -s tests/slow` (slow, whole); the same with `-p test_a_files.py` (one file); the same with `-k <test name>` (one test).
- [ ] **Step 1b: Try it by hand, before any paid run.** Run the six commands: the unit ones pass, the slow whole one reports `test_z_report.py` red and the other two green. Do one canary by hand (a failing test file in `tests/slow`, seen red through the one-file command, deleted, `git status` clean). Do the base check by hand on `test_z_report.py`: a detached worktree of the first commit under the temporary folder, the test red there through the one-test command, the worktree removed, `git worktree list` back to one line. If any of this cannot be done by hand, the fixture is wrong: fix it first.
- [ ] **Step 2: Write the request** to `requests.md`: `Add a --lines option to wordcount.py: with it, the program prints the number of lines of the file instead of the number of words.`
- [ ] **Step 3: Turn 1,** from the fixture's folder, with the command and the flags of Task 7, Step 2 of `docs/plans/2026-11-20-spec-and-records.md`, into `f1-1.jsonl`, cap 30 minutes. It ends with a spec.
- [ ] **Step 4: Turn 2,** the same command with `--resume <session id of turn 1>` and the prompt `Approved.`, cap 60 minutes, into `f1-2.jsonl`.
- [ ] **Step 5: Read turn 2.** Each reading goes under "Results" with yes or no and what was seen:
  1. `capabilities.md` has a line for each of: unit whole, unit one file, unit one test, slow whole, slow one file, slow one test. Each of the three unit lines and the two narrow slow lines says `canary: pass`; the slow whole line says `canary: via <a slow narrow line>` (or `pass`, when the builder ran the canary through the whole command with one file selected). No test line says `n.a.`, and none is missing its canary.
  2. The transcript holds no whole run of the slow suite before the first edit of `wordcount.py`, and none left running in the background at `phase setup`.
  3. The slow suite runs whole in step 9 and `test_z_report.py` is red there.
  4. A base checkout was made with `worktree add --detach`, only that test ran in it, and `base-check.md` holds the command, the exit code and the output of both runs.
  5. No commit of the run changes `test_z_report.py` or changes code for it; the log entry names the test first, lists it under "Needs your ruling", and says "not green: not ready to merge".
  6. After the run, `git worktree list` in the fixture has one line.
  7. The last reply ends with the lines of `times` and a `total`; `grep -rn` of the fixture's tracked files finds no line of `times` (try `oracle ` followed by a number).
  8. `phases` holds the ten lines, `done` equals HEAD, 0 Stop blocks.
  9. Minutes and cost of both turns.
- [ ] **Step 6: If Setup's one-file probe of the slow suite ran `test_z_report.py`,** Setup recorded it as failing at the base and readings 4 to 6 have nothing to show: write that under "Results", and run once more (`f2-…`) on a fresh clone with the request ending `In Setup, probe the slow suite with tests/slow/test_a_files.py.` A second run is also made when a reading says no and a change of the text follows: change the text with its sentence test first, commit, run again. No third run without the user.
- [ ] **Step 7:** Copy the transcripts and the state folders to the evidence folder. Under "Results", name what no run reached (the design lists three: a canary that fails, the 10 minutes of the base checks, a whole run cut at 5 minutes) and anything else the readings did not show. Commit the "Results" of this task.

### Task 5: one run on the trial copy (only on the user's word, on the machine that has the copy)

- [ ] **Step 1:** Ask the user, with Task 4's results in the message. Without a yes, write "not run" under "Results" and go to Task 6.
- [ ] **Step 2:** On that machine: this branch checked out; a new branch in each of the copy's two repositories; a request from the user that touches one page and its tests. Two turns as in Task 9 of `docs/plans/2026-11-20-spec-and-records.md`, with its launch conditions unchanged.
- [ ] **Step 3: Read turn 2,** in generic words only: the `canary:` field of each kind of test (no `n.a.` on a test line, the integration tests included); no whole run of any suite before the implementation; which outcome of **Whose red test** each red test took, or that none was red; `git worktree list` after the run; the lines of `times`; minutes and cost. Write them under "Results".

### Task 6: the comment on issue 1 (posted only on the user's yes to its exact text)

- [ ] **Step 1:** Show the user the text below, with the times of Task 4 added where marked, and ask: post it, change it, or leave it.
- [ ] **Step 2:** On a yes: `gh issue comment 1 --repo emulatalk1/hstack --body-file <a scratch file with that exact text>`. Report the URL it prints. The issue stays open.

```markdown
Measured before building this. Setup is short, and a saved Setup would save about a minute of it at most, so it is not built.

- Benchmark, 114 runs of the plugin at v0.2, each in a new box: from `start` to `phase setup` the median is 2.2 minutes, the 90th percentile 5.8, the maximum 13.3. No run recorded `setup skipped`. Five runs took over 10 minutes: four waited for a first compile of test binaries, and one started from an empty repository and installed its dependencies first.
- Where the time goes, on the one project where it was split: about half is probes at the base (test suites, type-check, lint, build) and the rest is time between commands, which we take to be the model reading and writing (an inference: it was not split further). The commands that find the test commands take seconds.
- A probe says what the base is like, so it belongs to one commit. A canary says whether a command reports a failure on this checkout today. Neither can come from an earlier run.
- Two Setups of one project a day apart gave three different command forms, none because a package or build file changed. A saved command would have been believed.

What 0.4.1 does instead (`plugin-dev/2026-11-20-setup-times-and-canary.md`):

- the script records the time of each step (`hstack.ts times`), so real runs can be measured;
- Setup makes a whole run of a suite at the base only when it is estimated under 5 minutes, and never leaves one running after the step;
- every test command gets a canary, through its one-file form.

What is left of this issue: the first run in a new worktree has no build cache and no installed dependencies. Whether that costs enough to act on is to be read from `times` of real runs. <the fixture run's times go here>
```

### Task 7: the records of this repository

- [ ] **Step 1:** `docs/plans/index.md` has this plan's line; `docs/log.md` has an entry for each of: the plan's creation, its approval, the build, the results. `bun scripts/okf-check.mjs docs` prints `Docs bundle: OK`.
- [ ] **Step 2:** The design's status line says what was built and where the results are. This plan's `status` becomes `stable` on the user's approval, with a `verified` entry for the user and one for each advisor read.
- [ ] **Step 3:** Whole suite and `tsc` once more; then ask the user how the branch goes to `main`.

## Results

### Tasks 1 and 2 (2026-11-20)

- Task 1: the ten tests were written first. Eight failed before the code; two passed at once, being guards of what the script already did (`phases` unchanged, the marks moved to `old/`), and were then seen failing on a broken copy (a time written into `phases`; `phase-times` kept at `start`), with the first test failing on a copy that makes no mark in `approve`. Whole suite after the task: 979 pass, 67 skip, 0 fail; `tsc` 0.
- One whole-suite run in between had 3 fails, none in a file this plan touches: two tests of `tests/bench-h5.test.mjs` and one of `tests/bench-diagnose.test.mjs`, two of them at their 5-second limit. The two files alone passed twice (37 pass), and the next whole run passed. Taken as intermittent under the load of the whole suite; not fixed here.
- Task 2: the four sentence tests failed first, then passed. The capabilities line writes the canary's values with ` / ` between them, not ` | `: that is the separator of the line's own fields. Whole suite: 983 pass, 67 skip, 0 fail.

### Task 2b, the fresh reader (2026-11-20)

One agent with none of this work's context read the three files as the builder and followed them in thought on three projects (one test command; unit, integration and a 19-minute end-to-end suite; a first compile of 10 minutes). Eight findings.

Changed in the text, each pinned first by the test 'setup and the base check leave the builder no guess on five points':

1. A test can be red in the base checkout because of the checkout (a database the run has already changed). The text now says that red at the base counts only when the test ran there as the base would run it; else it is "not checked".
2. `canary: fail` on one line could be read as the loss of the whole kind of test, which on a project with one kind leaves no test at all. Now: the line's command is not used, and a kind is no evidence only when no line of it passed. The oracle's sentence says the same.
3. "All of them together under 5 minutes" could be read as a sum that stops every whole run once one slow suite is in it. Now: shortest first, and no whole run for the suite that would take the sum past 5 minutes, nor for any after it.
4. The 5 minutes could cut a first whole run in the middle of its first compile. Now: a first compile is not counted, as for the step's own cap.
5. Canaries could be dropped when Setup ran out of time, leaving the oracle with no command it may use. Now: the canaries of the one-file and one-test lines are required whatever the clock.

Left as they are, for the user to see:

6. On a project with a long first compile, the base checkout has no build output, the compile uses the 10 minutes, and every red test ends "not checked" and is the builder's to fix. This is the risk the user accepted with the cap (answer 8 of the design), with this very case as the example.
7. "Every checkpoint is a plain `git commit` of all changes" (the code repository) beside "Commit by path, never with `-A`" (the records home), when both are one folder. In the text since 0.4.0; not part of this change.
8. "The widest suite the time allows" in step 4's check and step 9 has no cap of its own, and it is not said whether a CI workflow that runs every suite on a pull request is a "rule" that a suite must be green before a merge. Both in the text since 0.4.0; not part of this change.

### Task 3 (2026-11-20)

README and `plugin.json` at 0.4.1. Whole suite: 984 pass, 67 skip, 0 fail; `tsc` 0.

### Task 4, run f1 on the fixture (2026-11-20, plugin at 7d38662, CLI 2.1.328)

The fixture as Step 1 has it, one commit; tried by hand first (Step 1b): the six commands gave what the plan says, a canary was red through the slow one-file command, and the red test was red in a detached worktree of the first commit, which was then removed. Evidence: `.evidence/plan-step-times-2026-11-20/` (`requests.md`, `fixture-f1.bundle`, `f1-1.jsonl`, `f1-2.jsonl`, `state-f1/`).

**Turn 1** (37 seconds, 8 turns, USD 0.58): a spec of 7 behaviours, the notification call, no commit. The spec puts the message for a file that cannot be opened outside itself.

**Turn 2**, resumed with `Approved.` (8 minutes 42 seconds, 28 turns, USD 5.02; 4 agents, one each; 0 permission denials):

1. `capabilities.md` has the six test lines. The three unit lines and the two narrow slow lines say `canary: pass`; the slow whole line says `probe: not run whole`, with the README's rule quoted, and `canary: via slow-file`. `n.a.` stands only on the lines that run no test. Yes. The unit whole run was made with the throwaway test in place: probe and canary in one.
2. No whole run of the slow suite before the first edit of `wordcount.py`, and none in the background. The only one in the transcript is in the final step. Yes.
3. The slow suite ran whole in step 9: 24 tests, 23 green, `test_z_report.py` red. Yes.
4. The red test was met in step 4's check and checked at the base then: `git worktree add --detach` under the temporary folder, in a folder named `hstack-base`, only that test run there, `base-check.md` with the command, the output and the exit code at the base and at the end, and the line "red at the base too, with the same message". Yes. The check was written twice (the first call's shell form did not split the command); each call removed its worktree. **Not done:** the text asked the builder to look for a leftover base checkout first, and in neither call did it run `worktree list` before `worktree add` (found by the review of the whole branch, below).
5. No commit changes `test_z_report.py`, and the line of `wordcount.py` that prints the message changed only in the name of its variable. The log entry names the test first, says nothing was changed for it and "not green: not ready to merge", and lists it under "Needs your ruling" with two options. Yes.
6. `git worktree list` in the fixture after the run: one line. Yes.
7. The last reply ends with the eleven lines of `times` (`spec 0.3`, `setup 0.3`, `oracle 1.4`, `implement 1.7`, `gate 0.2`, `review 1.1`, `explore 1.3`, `mutate 1.7`, `final 0.5`, `records 0.1`, `total 8.7`). No tracked file of the fixture holds such a line. Yes.
8. Ten lines in `phases`, `done` equals HEAD, the tree clean, 0 Stop blocks. Yes.
9. Both turns: 9 minutes 19 seconds, USD 5.59.

Seen and not part of this plan: the builder made a `git stash` of one file during the implementation, against the playbook's git rule, popped it in its next call, and said so in its summary and its last reply.

No second run: decision 5 was reached in the first. What no run reached: a canary that fails; the 10 minutes of the base checks; a whole run cut at 5 minutes; a red test that is green at the base, or not checked; the walk of an earlier step at the base (step 7).

### The review of the whole branch (2026-11-20, one reviewer with a fresh context, range 452e0b7..e236a29)

Nothing critical. The script: `phases` cannot be changed by the new code; `times` and `times --all` did not crash on any odd file the reviewer tried and always exit 0. Three important findings, all in the text, each fixed with the sentence test 'the base check and the canary cannot excuse what they exist to catch' written first:

1. A linked dependency folder can point back into the code repository (a workspace package, an editable install). The base checkout then runs this run's code, and the run's own regression reads "red at the base too". Now: such a result is "not checked".
2. The base checkout had one fixed name, and `worktree list` is the whole repository's: a run in another worktree of the same repository could remove this run's base checkout as a "leftover". And run f1's builder skipped the look for a leftover. Now: the folder is named after this checkout's state folder, the look is the first command of the check, and only that exact name is ever removed.
3. `canary: fail` per line left three gaps: a whole-suite command that cannot report a failure would still run "whatever the clock" at the end; `via` could name a line that itself failed; the mutator was not told. Now: such a suite is reported as not run (and "not green: not ready to merge" when it must be green), `via` names a line whose canary passed, and the mutator never uses a failed command.

One finding settled in the design, not the code: the design said `times --all` heads each run with its start date; the script prints `run old/<folder>`, as this plan's Task 1 has it. The design's sentence now says so.

Left, minor: a red test that Setup's one-file probe already recorded gets a base check it does not need; a run started by 0.4.0 and continued charges its earlier time to its first mark; `old/…-10` sorts before `…-2` in `times --all`; no test for the order of two old runs, nor for the wait taken off the clock as seen by `times`; in step 4 the gate has not run when "a test the gate lists as changed" is asked; no place where the used minutes of the shared 10 are written; no field value named for a whole-suite command narrowed through its own arguments.

For the user to confirm: while executing, the design was changed in decisions 3 and 4 to match two rulings (a failed canary is per line; the 5 minutes take the suites shortest first and do not count a first compile), and after this review in decisions 2, 3 and 5.

(Run f2 and tasks 5 to 7 are filled in as they run.)
