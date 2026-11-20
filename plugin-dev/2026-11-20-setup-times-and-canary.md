# hstack: the time of each step, the canary of each test command, and a red test the base did not measure (design)

Status: draft 2, 2026-11-20. Every decision in it has the user's answer (the last section); approved by the user ("Duyệt") as the summary of those answers. Not committed. Adds to the 0.4.0 design (`2026-11-20-records-and-questions.md`). Takes up feedback issue 1 (reuse Setup on the same machine) and does not build what it proposes; decision 1 says why.

From the user, 2026-11-20, in their words (translated): measuring is of course to be done, and the question is how to do this right; and, of a test that already failed before the run, "if it is found not to be in the scope of the spec, note it and report to the user, and the user decides; doing it is for a new session". The user also asked whether the design goes against running the end-to-end suite as few times as possible, which is the project's rule recorded in `docs/plans/2026-11-20-spec-and-records.md` ("The costly suite"). The rest was proposed by the author and put to the user one question at a time; the last section has each answer.

## Intent

Issue 1 says that a run repeats Setup on a machine where an earlier run already did it, and asks for the saved result to be reused. The evidence of 2026-11-20 shows that Setup is short, that a saved result could save about a minute of it at most, and that the same text of Setup's canary rule gave two different behaviours on a costly suite. So this design is about being right and about measuring, not about speed: it measures each step, makes the canary rule one that can be read off `capabilities.md`, and says what a run does with a red test when the base was not measured.

## Facts this design rests on

All timings are from per-event timestamps of the runs' transcripts, read on 2026-11-20 by a read-only session on the machine that holds them (the ignored `.evidence/` folders and the benchmark's data folder). This repository cannot reproduce them. Only sums and medians are given here.

- **0.4.0 does not do what issue 1 asks.** `start` still moves `capabilities.md` and `test-paths` to `old/<time>/` (`scripts/hstack.ts`, `moveRun`), step 2 of the playbook has no branch that reads them back, the state folder is still named by the checkout's own git dir, and `phase` writes no time.
- **Benchmark, step 13, arm H** (plugin v0.2, every run in a new box): 114 standing runs, all reached `phase setup`. From `start` to `phase setup`: median 2.2 minutes, 90th percentile 5.8, maximum 13.3, 5 runs over 10 minutes, none recorded `setup skipped`. Medians by stack: Ruby 1.0, JavaScript and TypeScript 1.1, Rust 1.8, Python 2.2, the private set 4.0. This window also holds writing the requirement and reading code for it, so Setup alone is shorter.
- **The slow runs are a first compile.** The three slowest are one Rust task, 9 to 11.5 minutes of waiting for the test binaries each time; a second Rust task waits 5 to 7 minutes the same way. Each run paid it because each run had a new box. The fifth run over 10 minutes started from an empty repository and installed its dependencies first.
- **The private set** (27 of those runs, one TypeScript project): Setup is a median 4.5% of the run (1.3% to 11.9%; the run's median is 86 minutes). Of the window: 46% lies between calls (the model reading and writing), 29% is the integration tests run whole at the base (27 of 27 runs), 15% is end-to-end runs of one or two files, 6% is type-check, lint and build. The commands that find the test commands take about no time; what the model spends between calls on reading and on writing the requirement and `capabilities.md` is in the 46% and was not split further. 8 runs started the whole end-to-end suite at the base, 6 of them in the background as Setup's last call, so that it ended after the mark.
- **0.4.0 and the trial, on the copy of a real project.** The trial's Setup took 5.3 minutes, 3.2 of them one whole run of the unit and integration suite at the base. Run B's took 2.5 minutes: it made no whole run at the base, as the project's own rule says (plan `docs/plans/2026-11-20-spec-and-records.md`, "The costly suite"). In both, the commands that find the test commands took 1 to 2 seconds: the builder had read the README and the tests while it wrote the spec. Run B spent 57 seconds between calls. The three fixture runs: 0.16 to 0.26 minutes.
- **Two Setups of one project, a day apart, are not the same.** Three command forms differ, and none because a package or build file changed: the launch folder differed, a rule of the project changed, and the builder chose another form for one test by name. A saved copy of the first would also hold values of that one run: port numbers, an absolute path, a commit, test counts, minutes.
- **The canary on the costly suite was done two ways.** The playbook says the suite command and the single-test command must both report the throwaway test as failed. For the end-to-end suite, run B ran the canary through the one-file form only, and the trial ran none. In both runs the integration tests had no canary of their own. In run B the command of the final whole run was another script than the one the canary used, so it ran for the first time at the end. The playbook does not say what follows a canary that fails.
- **Checking a thing at the base has no stated way.** Step 7 of the playbook asks "does the step hold at the base commit?" and the rules for git forbid a stash, a reset and a switch of branch. The plan for run B gave the check of a red end run against the base to the controller ("only the red tests are run again on the base branch"); no rule gives it to the builder.

## Decisions

### 1. No saved Setup

Issue 1's proposal is not built: no copy of `capabilities.md` kept for a later run, no state folder shared by the worktrees of a repository, no hash of package files.

- What a saved Setup can skip is finding the commands and part of writing `capabilities.md`. In run B that is bounded by the 1 to 2 seconds of commands plus the 57 seconds between calls: about a minute at most, of a build turn of 54 minutes.
- What takes the time is the probes at the base and the canary. A probe says what the base is like, so it belongs to one commit; the canary says whether a command reports a failure on this checkout today.
- A saved command can be wrong without any watched file changing (the fact above), and it would be believed.
- An inference, not measured: on one machine the first compile is not paid again in the same checkout, because the build tool keeps its own cache there. A new worktree has no such cache and no installed dependencies, and a saved list of commands gives it neither.

Issue 1 stays open, narrowed to what is left: the cost of the first run in a new worktree, to be read from the times of decision 2 once real runs have them.

### 2. The time of each step

- A new state file, `phase-times`. Each time a step is recorded, the script appends `<epoch seconds> <the line written to phases>`: `approve` for `spec`, `phase` for every other step, a skipped one included. `phases` does not change: the Stop gate compares its lines whole.
- The time of a step is the time from the mark before it to its own mark. The first mark's origin is `started`, which already has the wait for the user's approval taken off.
- A new verb, `times`: one line per mark of the current run, in the order recorded, `<name> <minutes, one decimal>`, then `total` (the last mark minus `started`). A step recorded twice (the Stop gate can ask for `final` again) has two lines. `times --all` prints the same for each run under `old/`, oldest first, each under a line with its start date. A state folder without the file prints `no times recorded`.
- **Where a person sees it: the last reply and the state folder, never the project's records.** The numbers are about the harness and carry the names of its steps; a project's log says what the product does, and in a client's project it is the client's. When the task names no reply of its own, the builder ends its last reply with the output of `times`. No record, spec, decisions file or commit message holds it.
- Limits. A step's time includes what the builder did before recording it, whatever that was: a dispute round counts for `implement`, and an agent started before the mark of the step before it shifts time between the two. The file moves to `old/` with the run and is per checkout, like the rest of the state.

### 3. The canary: one for each test command line

`capabilities.md` has one line per test command the later steps use: for each kind of test the project has (a runner, or a project or configuration of a runner with its own setup or its own pattern for test files), one file and, where it exists, one test by name; and the whole suite.

- **Each such line gets its own canary, through its own command.** The throwaway failing test is put where that line's tests live, so that the line's own pattern has to find it. The field is `canary: pass`. The canary runs that one test, not the project's tests, so its cost does not grow with the suite.
- **A whole-suite line that decision 4 keeps from a whole run at the base** is not run for the canary. Its field is `canary: via <name of another line>`, and that other line must be the same command with one file selected. When the whole-suite command is another command than every narrow line (another script, another build), the builder selects one file through that command's own arguments and runs the canary so. When it cannot be narrowed, the field is `canary: not run: <why>`, and the last reply and the log entry list the command under what was not run: its first run is the final one.
- **`canary: n.a.` is for a line that runs no test** (build, lint, run the product). On a test command it is no longer a value. The canaries of the one-file and one-test lines are never dropped for time; only a whole-suite line may say `via` or `not run`.
- **A canary that fails** (the command does not report the throwaway test as failed):
  1. the line is wrong: the builder looks for the right command once more and runs the canary again;
  2. if it fails again, the field is `canary: fail` and that command is not used. A kind of test with no line whose canary passed is no evidence in this run. The oracle writes its tests in a kind whose canary passed; a behaviour that only the failed kind could test is recorded as not checked by a test, and the last reply and the log entry say which kind and why;
  3. the run goes on with the other kinds. It does not stop to ask.
- **Who checks it.** The builder writes these fields, and the script cannot tell a test line from another. The oracle reads them: it uses only a test command whose line says `pass` or `via`. The rule is checked by reading `capabilities.md` in the runs below.

### 4. A whole run of a suite at the base

Today: "run the full suite only as wide as the time allows", with one exception for a project that asks for the whole suite before new work. What changes:

- **A limit of 5 minutes.** Whole runs at the base are made only while their estimated time, all of them together, stays under 5 minutes: the suites are taken shortest first, and a first compile is not counted, as for the step's own cap. Above it, a suite gets no whole run before the work. Its whole run is the one of step 9, under step 9's own rule: whatever the clock for a suite that must be green before a merge, as wide as the time allows for any other.
- **How the time is known**, in this order: the project says it (its records, its README, its CI file); else an estimate, the time of the one-file run that Setup makes anyway, times the number of test files; else, when neither gives a number the builder would stand by, the suite is taken as slow and is not run whole. The state of an earlier run is not read for this (decision 1).
- A whole run that is still going at 5 minutes is stopped and recorded `probe: not run whole (cut at 5 min)`. None is left running after `phase setup`, in the background or otherwise.
- **The project's rule comes first.** A project that says a suite is not run whole before the work gets no whole run of it at the base, whatever its time. A project that asks for the whole suite before new work gets it, outside the limit, as today. That a suite must be green before a merge decides neither.
- One run may be both probe and canary: the suite run with the throwaway test in place shows the failures of the base and the canary's own. Decision 3 adds no second whole run.
- Step 9 says today that the base is taken as green for a must-be-green suite, "so a test of it that fails here is yours to fix". That sentence gives way to decision 5.

### 5. A red test that the base did not measure

Decision 4 leaves suites whose failures at the base are not known. When a test of such a suite fails in step 4's check or in the final run, the builder finds out whose it is before it changes any code for it.

- **Only evidence makes a red test "not this run's".** The builder never calls a red test "outside the spec" on its own reading of the diff: that would be a way out of a red end.
- **The way: a checkout of the base.** `git -C <the code repository> worktree add --detach <a temporary folder outside the repository> <base>`; run only the red tests there, in the single-test form of `capabilities.md`; remove the worktree (`git worktree remove --force`: a link or a build output is in it). It switches no branch and stashes nothing; the git rule of the playbook names it as the one allowed way to look at the base. The run installs nothing, so the base has the dependencies the checkout already has: the builder links the installed dependency folder into the base checkout, and never copies or installs from the network. It may build there with what is installed. Command, exit code and the end of the output, at the base and at the end, go to `$S/base-check.md`.
- **Also evidence:** a line of the project's own record that names the test as failing at the base commit, quoted.
- **Which tests can be checked so.** Only a test that exists at the base and that the run did not write or edit: never an oracle test, never a test the builder added, never a test the gate lists as changed.
- **Red at the base too:** not this run's. Change no code for it. List it under "Needs your ruling" with the evidence; the log entry names it first, with the tests that Setup found failing at the base, and says "not green: not ready to merge" for a suite that must be green before a merge. A fix is a new request, in a new session (the user's rule).
- **Red at the base counts only when the test ran there as the base would run it.** A failure of the checkout itself (a missing dependency, a service it cannot reach, a database this run has already changed) is "not checked".
- **Green at the base:** this run's. Fix it, as now.
- **A cap of 10 minutes for all base checks of a run.** Past it: the base checkout is removed and nothing more is run at the base; what was checked before keeps its result; every red test left is "not checked".
- **Not checked** (the cap, or the base checkout cannot run the test: no dependencies to link, a service or a port it cannot have twice): the test is taken as this run's, and the builder tries to fix it inside the time rules. Fixed: nothing to report. Not fixed: it is listed under "Needs your ruling" as "red at the end, the base not checked", and the log entry says "not green: not ready to merge". The run ends as every run does: the records step runs, and nothing is merged by the run.
- **The risks that stay, accepted by the user.** In the not-checked case the builder may change code for a failure it did not cause, as it may today; an end-to-end test that needs its own server and data is the likely case. And a test can be red at the base for one cause and red at the end for another, which the run added: `base-check.md` holds both failures, the entry under "Needs your ruling" says when their messages differ, and nothing compares them by machine.
- **Step 7 uses the same checkout** for "does the step hold at the base commit?", inside the same cap. The builder walks the step there, by what the explorer's report says it did; the explorer's file does not change. Its outcomes do not change. When the step cannot be walked at the base, it goes under "Needs your ruling" as "not checked at the base", and no code changes for it. This differs from a red test on purpose: a red test of a must-be-green suite stops a merge and has a test to say when it is fixed; a step walked by hand has neither.

## Touch points

| File | Change |
|---|---|
| `scripts/hstack.ts` | `approve` and `phase` append to `phase-times`; the verb `times` and `times --all`; the usage lines |
| `tests/hstack.test.ts` | a test for each line above, each seen failing first: the file's lines, a skipped step, a step recorded twice, the wait off the clock, a run moved to `old/`, a state folder without the file, and `phases` unchanged byte for byte |
| `skills/build/SKILL.md` | the git rule (the base checkout); step 2 (the canary of decision 3 and what follows a failed one, the whole run of decision 4); step 9 (decision 5, in place of "yours to fix"); step 7 (the same checkout); step 10 (the base-check tests named first, "red at the end, the base not checked", what was not run); the last reply (the output of `times`) |
| `skills/build-implement/SKILL.md` | item 6, the check: a red test of a suite the base did not measure goes through decision 5 |
| `agents/oracle.md` | it uses only a test command whose canary is `pass` or `via` |
| `README.md`, `.claude-plugin/plugin.json` | the wording above; version 0.4.1 |
| Issue 1 | a comment with the sums above and what the issue is narrowed to; its text is shown to the user and posted only on their yes |

## How we will know it works

1. The script's tests pass, and each new one is seen failing on a broken copy of the script.
2. The playbook text is checked by a paid run, as in 0.4.0: the same text has already given two behaviours. The existing fixture cannot show it: it has one test command and no slow suite. A new fixture, built in a scratch folder and not kept in this repository: Python with no dependencies; two kinds of test with a command each; a rule in its README that the second suite is not run whole before the work and must be green before a merge; one test of that suite already red at its first commit. At most two runs on the machine this design was written on, each in two `-p` turns, read for: a canary through each test command line and no `n.a.` on one; no whole run of the second suite before the implementation; at the end the red test checked in a base checkout, no code changed for it, the test under "Needs your ruling" with `base-check.md` behind it, and "not green: not ready to merge" in the log; the temporary worktree gone; the output of `times` at the end of the last reply and in no record. If Setup's own probe of one file meets the red test first, Setup records it as failing at the base and decision 5 is never reached: that run then shows the canary, the whole run and the log, and decision 5 is listed as not shown, for the second run.
3. After a clean run of 2, and on the user's word then: one run on the trial copy, on the machine that has it, for the case the fixture cannot show: an end-to-end suite with its own server, where the base checkout may not be able to run the test. Read for the same points, and for which outcome of decision 5 it took.
4. Budget: about USD 15 for 2 and about USD 20 for 3, at the cost of the 0.4.0 runs. Past USD 40 in all, stop and ask the user.
5. Not shown by these runs: a canary that fails (decision 3), the cap of decision 5, and the limit of decision 4 cutting a run. Each is text that no planned run reaches.

## Not in this design

- A saved Setup, and a state folder shared by the worktrees of a repository (decision 1).
- Probes skipped because the base is the commit the last run finished green on. It would save at most the minutes of the probes; `times` will say whether that is worth a rule.
- A test that fails once and passes when run again.
- A feedback field for the time of Setup.
- `unavailable capabilities` in a feedback entry counts any line of `capabilities.md` that holds `unavailable:`, a note included: seen in run B, not changed here.

## The user's answers (2026-11-20)

Asked one round at a time; "yes" is the user's word for the proposal as stated.

1. The change is for being right and for measuring, not for speed; no saved Setup: yes.
2. Issue 1 stays open, narrowed to the first run in a new worktree: yes.
3. The time of each step is shown in the last reply and kept in the state folder, not written to the project's log: yes.
4. A canary for every kind of test, through its one-file command, each run. The user asked whether that means a full run as the suite grows; it does not, and with that: yes.
5. Whole runs at the base only under an estimated 5 minutes together, the project's own rule first. The user asked how the builder knows which suite is slow; the three sources of decision 4 are the answer, and with them: yes. The number is the author's.
6. A red test is "not in the scope of the spec" only by evidence that it is red at the base; without it, the builder's to fix: yes.
7. The evidence comes from a temporary worktree of the base, the one exception to the git rule: yes.
8. A cap of 10 minutes for the base checks. The user's first answer: only the tests that are red are run (that is the design). Asked what happens past the cap, and given the sequence of decision 5: yes. The number is the author's.
9. A canary that fails: look for the command again, then the kind is no evidence in this run and the report says so, and the run goes on: yes.
10. A hand-walked step of earlier work that fails and cannot be walked at the base: no code changes, the user decides: yes.
11. The runs and the budget of "How we will know it works"; the run on the trial copy needs the user's word when its time comes: yes.
12. One change, version 0.4.1: yes.
13. The risk of a test red at the base for one cause and at the end for another, with both messages kept and a note when they differ: yes.

The author's own calls, told to the user and not asked: dependencies are linked into the base checkout, never installed; a whole-suite command that cannot be narrowed is `canary: not run`; the fixture is built in a scratch folder; the comment on issue 1 is drafted by the author and posted only after the user has read its exact text.

The author's calls that the user was not told one by one, for the user to see here: the canary also runs through the one-test form and, when the suite is run whole at the base, through the whole-suite command (the user's yes named the one-file form); the sentence in the oracle's file that it uses only a test command whose canary passed; a whole run still going at 5 minutes is stopped; the base check removes only a leftover folder of its own name, never another worktree.
