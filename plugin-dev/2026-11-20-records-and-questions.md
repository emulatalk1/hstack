# hstack: the spec, the builder's decisions, the project's records, and the code repository (design)

Status: draft 4, 2026-11-20. Every decision in it has the user's answer (list below); not committed. Adds to the v0.2 design (`2026-11-10-hstack-plugin-design.md`); section "What this replaces in v0.2" says where the two differ. Takes up feedback issue 3 (no planning stage with the user) for the spec itself; not for tasks.

From the user, 2026-11-20: a requirement that goes against an earlier ruling stops the run with a push notification, and the user decides; the two default record files of decision 3; the builder writes `.hstack/repo` and commits the records without asking; and the principle that the user and the agent agree on the feature's behaviour before anything is built (issue 3). Later the same day the user agreed to the mechanism of decision 2 (the wait, the guards, the commit at the approval), to no tasks, and asked why the document would live in `progress/`. Last, after reading how the skill set they work with uses the words, the user named the document a **spec**, not a plan (there the design document, or spec, is what the user approves and what binds, and a plan is the task list written from it), and agreed that the builder's own `spec.md` goes into `decisions.md`, which is committed beside the spec with less authority than it. All answers: the last section.

## Intent

Before a run builds anything, the user and the agent agree on what the feature does. After it, a person who was not there can read what the project now does, which of it is checked, and what waits for their decision. v0.2 has neither: the builder reads the request alone, and its notes stay in the state folder.

## Facts this design rests on

- **Trial, 2026-11-19** (`.evidence/trial-2026-11-19/findings.md`; one `claude -p` run on one small requirement, so nothing here is a rate):
  - Finding 3. The builder appended an entry to the project's progress log by itself and did not touch the feature list or the coverage file. No step of the loop owns these files.
  - Finding 4. The progress log carried the item with a condition, after a recorded ruling against it. The builder wrote "the task wins" and built it. The requirement named the log and quoted the item, and the builder's third tool call searched the log for the item's term.
  - The same run made an earlier acceptance step false. The builder's fourth tool call, before the oracle step, searched the records for an example input, and its output held that step's line in the feature list and its coverage row. The builder said nothing of the step until its last two calls, where it reported the record as old. It saw the conflict early and no rule told it what to do with it. The step holds none of the requirement's own terms; the search that found it used an input taken from the log and the code.
  - Finding 1. The project keeps its code in a nested repository and its records in the outer one, and forbids a launch inside the code repository. The trial launched inside it.
  - Finding 2. All three Write-tool calls of the run were by agents, for their report files, and all three were refused. The texts came back in the agents' replies. Every file the builder wrote with a shell command was written. The cause is not isolated.
  - Finding 6. The builder ended with what it built, the test counts, what it did not run and three open points. The playbook asks for none of this.
- **The trial project's rules** (its instructions, read 2026-11-20). They know two documents: a design or spec, saved in its design folder, and an implementation plan with tasks, saved in its plans folder. Its records hang on the plan: a feature entry names its plan file, and a coverage ID starts with the plan's number. A run of hstack has a spec and no plan. A spec can meet the folder, file name, frontmatter, index and log rules; it cannot meet the rules for tasks, the scratch build, the review by two models, or the session routine around them, which describes the earlier harness. What the plan field and the ID's number hold for a run is for the rewrite of that routine (answer 7).
- **Spike, 2026-11-20** (two temporary repositories, an outer one that ignores a nested `code/`; the script only, no agent):
  - Today, launched from the outer folder: `start` takes the outer repository's HEAD as the base, and a change in `code/` gives no Stop block.
  - With one added line in `state()` that follows a one-line file `<top>/.hstack/repo`: both hooks and every verb use the code repository, from the outer folder, a subfolder and inside `code/` (one state folder). A change in the outer repository alone gives no block; a change in `code/` blocks. `lock` takes paths relative to the code repository; `gate` and `done` work unchanged.
  - The same, with the file written after SessionStart and an earlier session's `stop-blocks` at the cap: the Stop gate does not block an unfinished run, and the state folder has no `session-head`. After a reset of `stop-blocks` it blocks.
- **Tools.** The init event of all three `claude -p` sessions of the trial lists `PushNotification` and no `AskUserQuestion`. Whether a notification reaches a phone depends on the user's Remote Control; "not sent" is a normal result. A `-p` run that ends its turn can be resumed with the user's answer.
- **A later session** (`hstack.sh`, 0.3.3): a resume keeps the run. A new session marks it `stale`; a `stale` run with nothing changed since the session began does not block a stop.
- **Earlier design.** `layers.md` ("The loop for one plan") has a plan step: "Write the features and their steps. Each step is observable." The brief asks for each project's "own progress files"; the foundation plan names `progress/features.json` and `progress/progress.md` (line 173) and leaves the log and the migration for later (lines 266–267). Gap rows 1–3, 6 and 17 of `progress/2026-11-19-outsourcing-gap.md` are what this design takes up.

## Decisions

### 1. Two folders: the records home and the code repository

- The **records home** is the top of the repository the session is launched in. The **code repository** is the same folder, unless the file `.hstack/repo` in the records home holds the relative path of another repository.
- The state folder, the base, the lock, the gate, `done` and both hooks read the code repository. The Stop gate never judges the records home by its git state; it requires the `records` step (decision 4).
- The pointer is written before `start` and never in the middle of a run (the verb refuses then: the pointer moves the state folder, and the gate would look away from the run). It names the top of a repository of its own, not a folder inside one.
- The builder writes the file with the script's verb `repo <path>` at the start of a run, when the project's own instructions name a separate code repository and the file is absent. The verb also does for the code repository what SessionStart does for a new session (the third spike result shows why), and refuses when the file exists. The builder reports it in the log entry.
- The records home is fixed when the pointer is followed. A command run from inside the code repository must not make the code repository the records home, or records would be written into it.
- Every git command and every project command of the playbook and of the four agents runs in the code repository (`git -C <it>`, or a subshell that changes to it). The session's folder never changes. No agent file, spec or record enters the code repository in this layout.
- `.hstack/manifest.json` of the retired `hstack-init` is not reused: it needs Bun and a known stack, and it names paths the trial project does not have.

### 2. The spec: what the user and the agent agree on

Every run starts with a spec, and builds nothing before the user approves it.

- **What it holds: behaviour only.**
  1. The request, in the user's words.
  2. **Behaviours**, numbered. Each is one sentence that a user can check by one observation. These are the feature's acceptance steps.
  3. **Against the record**: each place where the request contradicts a recorded decision or would make an earlier step false or weaker, with the record's line quoted and lettered options, the recommended one first.
  4. **Open points**: what the request and the code leave open, each with the builder's proposal.
  5. **Not in this spec.**

  It holds no tasks, no code design and no file list. A small fix has a spec of a few lines.
- **Where it lives.** In the project's place for specs under the project's rules, when it has one; else `docs/specs/YYYY-MM-DD-<topic>.md` in the records home. Not `progress/`: that folder is the working record of what was done, and a spec is a document the user reads and approves before anything is done.
- **How the builder finds what goes against the record** (cap 15 minutes, read-only, before any probe):
  - it searches the records for the request's own terms (names, quoted strings, the feature's nouns), and reads the open or carried items of the last log entry;
  - it finds the tests of the code the change will touch, and through the coverage file or the `test` field reads the step each of them checks, and it searches the records for the inputs and texts those tests use. In the trial a search of the second kind found the false step.
- **Approval.** The builder runs the script's verb `spec <file>`, calls the session's notification tool if it has one, and ends its turn with the spec as plain text. The user approves, or asks for changes; a changed spec is shown again. On approval the builder runs `approve`, writes the index or log entries the project's rules want for a spec, commits the spec and those entries in the records home, and goes on with setup. Before the approval the spec file is the only change.
- **Guards** (each a hook test):
  - the Stop gate lets a turn end while a spec waits, and stamps the wait when it does. `approve` refuses a wait that has no stamp, so the builder cannot approve in the turn it asked;
  - `approve` refuses when the file differs from the one that was shown;
  - `spec` records the state of the code repository, and the Stop gate lets a turn with a waiting spec end only while that state is unchanged: nothing is built before the approval;
  - `approve` refuses when the code repository changed while the spec waited: the run's base is the commit at `start`, and what the user did since must not be judged as the run's work. The spec is then dropped and written again for the code as it is;
  - `start` refuses an approved run of this session that is not finished: a second `start` would be a way out of it. Only a new session starts another run in its place;
  - `spec --drop` ends the run: nothing was built, and the session goes on as if no run had been started;
  - `spec` refuses once `setup` is recorded, and `phase` refuses while a spec waits, so the wait is not a way out of the loop;
  - the script cannot check the user's words. An approval the user did not give is still possible in a later turn; the log entry quotes the user's reply so that a reader sees it.
- **A new session.** An approval can come in a resumed session (the run is as it was) or a new one: the SessionStart text shows that a spec waits, `start` does not move that run away, and `approve` removes the `stale` mark. The waiting time is taken off the run's clock.
- **The oracle works from the approved spec.** `requirement.md` holds the user's request verbatim, then the approved spec, then the user's approving reply verbatim. The oracle's inputs and rules stay as they are; it writes at least one test for each numbered behaviour and its report maps each number to its tests. It never gets a spec nobody approved.
- **After approval the builder decides alone**, as in v0.2, and writes each decision down. Agents never ask.

### 3. Records: the project's own, or three default files in the form of the source harness

At the start of a run the builder finds the project's records from its instructions and README: the feature list, the log a person reads, a coverage file and a place for specs if there are any, and the rules the project gives for each (quoted). It writes them to `$S/records.md`: `<role> | <path> | <rules, quoted>`.

When the project lacks one of the three, hstack creates it in the records home. The form is the source harness's (the user, 2026-11-20). An earlier draft folded the coverage into the feature list, one file with five fields a step; it had run once, on a scratch project, and the source harness's form has carried a real project of more than a hundred features.

- `progress/feature_list.json`: what the product does for its users. An array of `{ "description", "spec", "steps": [ "<one sentence>", … ], "passes" }`. A step is a behaviour of an approved spec. A step is never dropped. `passes` is one value for the feature.
- `progress/test-coverage.md`: how each step is checked. One section per spec, one row per step with its ID (`S<spec>-F<feature>-S<step>`; the full form is `S<spec>-P<plan>-F<feature>-S<step>`, and a level that does not exist is left out), its coverage (`full`, `partial`, `none`, `manual`), its tests and proofs, and the user's rulings. The file starts with its rules.
- `progress/progress.md`: one entry per run, appended, never edited.

Left out of the default, as parts of one project: the levels `setup` and `command`, the numbered classes of `manual`, and a file name that holds a tool's name.

**The two files cannot drift apart unseen.** The feature list and the coverage file say things about the same steps in two places. The script's verb `records-check` compares them: every step has its one row, no row is without its step, each level is a known one, each spec or plan file exists. The `records` step cannot be recorded until the check has passed on the two files as they are, and it comes after `final`; `done` looks at the two files once more. In a run, one feature must name the spec that the user approved, so that the records of before the run, or two empty files, do not pass. A limit: `records-check --none <why>` is for a project whose own records have another form, and it passes with nothing compared; the playbook asks for the reason in the log entry, and nothing checks that. Run on the trial copy's own records, read-only, it prints that they agree.

**A rule a run cannot meet.** The builder does not bend a project's rule and does not invent what the rule needs. It writes every record it can within the rules (the log entry always), leaves the others, and lists each under "Needs your ruling" with the rule quoted.

### 4. Who marks a step passed: the `records` step

- **Reports come back in the reply.** Each of the four agents returns its report as its reply. The builder stores it, unchanged, in the state folder with a shell command. No agent uses the Write tool (finding 2).
- **When a step is left to its test (`full`).** The user's rule (2026-11-20), the one the source harness already has: `full` means that from now on the test is trusted and nobody walks the step by hand, so two questions must both have the answer yes. Does the test check all of the step? The reviewer, not the builder, lists from the step's sentence what a user can observe in it and names the assertion for each point; a point with no assertion is an Important finding. Does the test fail when the code is wrong? The mutator plants one fault for each behaviour, in the code that makes it, and that behaviour's own test must fail. With both, `full`; without one, `partial`, with what is missing. A test that fails before the code exists does not answer the second question: it stops at its first assertion. The tests of a behaviour are the oracle's and the ones the builder adds to close a missing point (the oracle's files are locked). A behaviour that already held at the base gets its fault in the unchanged code that makes it. The user's point (2026-11-20): `partial` is not only a test that lacks something. Some steps hold a point that no code can check (how a page looks), and such a step is `partial` for good and needs a hand check, by an agent. So the reviewer says for each point without an assertion whether code can check it (a finding: the builder adds a test) or not (`by hand`: no finding). The explorer does the hand check: it does the step, saves what it saw (a screenshot), and gives the verdict. And the explorer of every later run walks the `partial` and `none` steps of earlier work again, as the evaluator of the source harness did (gap row 4); a `FAIL` there is a finding like any other. The log entry lists these steps under headings of their own, which ask the user nothing.
- **The explorer gives the verdict.** It gets the spec's behaviours and returns `PASS`, `FAIL` or `UNCLEAR` for each, with what it did and saw.
- **A new step, `records`,** after the final test run and before `done`. The Stop gate requires it, and it cannot be recorded as skipped, for time or anything else (the same holds for `spec`). The builder:
  1. adds the feature and, for each behaviour of the spec, a step in the feature list and a row in the coverage file, under the rules in `records.md`; where the project's rules want a list of each step's test, it writes that list where they say, or into the decisions file; never into the spec. After the commit at the approval the spec file does not change: what the user approved gains no line they did not see;
  2. sets `passes` of the feature to true only when every step's test passed in the final run and the explorer's verdict on every step is `PASS`. Otherwise it stays false, and each step that keeps it false is listed under "Needs your ruling" with the reason:
     - `FAIL`, then fixed by the builder: the explorer walks the failed behaviours once more, inside the time rules, and that verdict counts. With no time left: false, "fixed, not walked again".
     - `UNCLEAR`, or explore skipped for time: false, with the reason.
     - No capability can run the product from outside at all: the test alone decides, and `note` says "test only".
     - Later, only a ruling changes it: the user rules, and the step's row gets `Ruling (date): pass` or `fail`, with `passes` set to match.
     - **Who records a ruling.** The builder, on the user's message, without a spec and without a run: it writes the ruling in the record, commits those files, and runs the script's verb `ruled`, which accepts the change only when every file changed since the run finished is a record file and none is a test file. Without this, in a project with one repository the Stop gate would read the change as new work.
  3. changes the words of an earlier step only when the user approved a spec that replaces it (its "Against the record" section): the step then states the behaviour after the run, and its row gets `Ruling (date): spec <number> changes the behaviour that this step names, approved by the user`. This is the source harness's own practice, and the record stays a list of what is true of the product, which the explorer walks. A step that the run made false without such an approval keeps its words (decision 5);
  4. commits `decisions.md` beside the spec (decision 6), and appends one log entry: first any test that already failed at the base, then the spec, the user's approving reply, the commit range, the test counts, what was not run, a pointer to the decisions file, and "Needs your ruling";
  5. commits the records in the records home, in one commit, unless the project's rules say otherwise.
- **The last reply.** When the task names its reply, the builder gives exactly that. When it names none, the builder ends with the short form of the log entry.

### 5. What building reveals after approval

The user's rule (2026-11-20): what is wrong gets fixed; that needs no question.

- **An earlier step that the build made false is a defect of the build.** The builder finds it from the gate's `REMOVED` and `PRE-EXISTING TEST` lines, a test of earlier behaviour that now fails, or an explorer finding, and fixes the code so that the earlier step and the spec's behaviours both hold. No question, no ruling. The gate step changes with this: in v0.2 an entry in `decisions.md` that quotes the requirement lets the builder alter a test of earlier behaviour, and the trial's builder did so. Now only an item the user approved under "Against the record" lets a test of earlier behaviour change; any other `REMOVED` or `PRE-EXISTING TEST` line means the test goes back, or the case below. The reviewer checks each such line against the approved spec.
- **Only when both cannot hold** (the approved spec states one behaviour and an earlier step states the opposite, and the spec stage did not show it) is there a choice between two things the user asked for. The spec is the later word, so the builder goes on with it, finishes, and does not reword the earlier step. It changes the earlier step's test only as far as the spec's behaviour needs, and writes down why no code satisfies both; the reviewer gets that note and checks the claim, so that this is not "the task wins" by another door. A conflict found after the review step gets the reviewer once more if the time rules allow; else the log entry says "conflict not reviewed". It sets that step's `passes` to false with the note "decisions in conflict, not ruled: spec <name>" (the user's name for it, 2026-11-20: a conflict of decisions that has no ruling yet), lists it under "Needs your ruling" with two options, and sends the notification at the end. Then:
  - the user answers "the spec stands": the earlier step gets `Ruling (date): replaced by <the new step>`. A change of the record only;
  - the user answers "the earlier step stands": that is a new request, with its own spec, to change the behaviour back.
  - Until the answer, nothing is merged.

### 6. The builder's decisions: long-term memory, with less authority than the spec

- **One file for what the builder decides alone.** During the run, `decisions.md` in the state folder holds every decision, and two sections the builder must write before any product code: `## Entry points` (each way a user or caller reaches the feature) and `## Edges` (each edge, with a decision that cites the approved spec or the existing code, and the test that pins it, by file and name). The reviewer and the explorer read it with the approved spec.
- **It is kept.** At the `records` step it is committed beside the spec as `<spec name>.decisions.md`. Its first line says: decided by the builder while building this spec, not approved by the user. In the two-repository layout it is in the outer repository.
- **Two layers of memory.** What binds a decision is its test, which stays in the project's suite: a later run that breaks it meets decision 5. What a person or a later run reads is the file, and each edge names its test, so the search that starts from the tests of the code to be changed reaches the decision.
- **Less authority than the spec.** The user did not approve it, and its lines are not acceptance steps. A later spec may go against a decision of the builder, but not in silence: the search of decision 2 reads these files, and the spec lists the item under "Against the record", marked as the builder's own earlier decision. Once the user approves such an item, the test that pins the old decision may change, as for any approved item. The user makes any decision a ruling with one sentence; it then binds like the spec.
- **Not built:** one register of the decisions in force, kept up to date across runs. Worth it only if runs show that a search of the files misses decisions.

## What this replaces in v0.2

- "Finish in the first turn" and "no question to a human" (Goals; section "No questions"): a run now has at least two turns, the spec and the build. The SessionStart text, the Stop-block reason, the description and first paragraph of `skills/build/SKILL.md` and the README table row change with it. The agents' lines stay.
- The builder's own `spec.md` of v0.2 is gone. Its numbered behaviours are the approved spec's; its entry points and edges are two sections of `decisions.md` (decision 6).
- Anti-goal "harness files in the product": the state folder stays outside the repository. The default records and specs are project files that name no harness. A project that must keep its code repository free of them uses decision 1.

## Touch points

| File | Change |
|---|---|
| `scripts/hstack.ts` (the sh script, moved to TypeScript on Bun first: the user's rule of 2026-11-20, kept in the README's "Prerequisites") | `state()` follows `.hstack/repo`; verbs `repo`, `spec`, `approve`, `ruled`; `records` joins the required steps; the Stop gate lets a turn with a waiting spec end and stamps it; `phase` refuses while a spec waits; `start` and the SessionStart text handle a waiting spec; the two hook texts |
| `tests/hstack.test.ts` | tests for each line above, each seen failing first |
| `skills/build/SKILL.md` | the gate step (what may change a test of earlier behaviour); the notification tool may be a deferred one; the code-repository rule; records, the spec and its approval before setup; reports from replies; the explorer's input, verdicts and second walk; the `records` step; the last reply |
| `skills/build-implement/SKILL.md` | its commands run in the code repository; entry points and edges go into `decisions.md`, and no `spec.md` is written; the behaviours are the approved spec's |
| `agents/*.md` (4) | they read `decisions.md` where they read the builder's `spec.md`;  the report is the reply; the code repository's path; the oracle's one test per numbered behaviour; the explorer's verdict per behaviour; the reviewer checks each altered test of earlier behaviour against the approved spec |
| `skills/hstack-feedback/SKILL.md` (line 18), `skills/build-implement/tdd.md` (line 13) | both quote the "no human" text |
| `README.md`, `.claude-plugin/plugin.json`, the v0.2 design | the wording above; version 0.4.0 |

## How we will know it works

1. The hook tests pass, and each new guard is seen failing on a broken copy of the script. Among them: a stop before `records` is blocked; `approve` refuses an unstamped wait and a changed file; `phase` refuses while a spec waits.
2. A scratch project with one repository and no records, in two `-p` turns: the first ends with the spec and the transcript shows the notification call and its result; the second, resumed with an approval, ends with the default record files and each behaviour of the spec as a step with its row in the coverage file. The decisions file is committed beside the spec, with its first line and with a test named for each edge.
3. The trial copy, after its instructions are changed for hstack (answer 7), launched from the outer folder: the spec in the project's specs folder under its rules, commits of code only in the code repository, the feature list, the coverage file and the log updated in the outer one, and the project's own history check of the code repository prints nothing.
4. The same copy with a request that makes a recorded step false and neither names nor quotes the record: the spec shows the step's line under "Against the record"; after approval and the run, the record shows the earlier step with the ruling and the new step beside it.

## Not in this design

- A plan of tasks written from the spec, with a review after each task (the user, 2026-11-20: not now); a review of the spec by two models; two-model final review; a second evaluator on another model (gap rows 4, 7–9; the walk of earlier steps that are not checked in full is built, decision 4).
- The wake-up after a spec has waited (gap row 17) and the handoff entry for the next session.
- The coverage levels of the source harness other than `full` and `partial` (`manual`, `setup`, `command`), standing rulings beyond the `note` field, and a gate line for removed or altered record lines.
- Who chooses the wording of text a user sees (second half of finding 4). The spec's open points are the place for it; no rule here requires it.
- Not checked by this design's runs: the notification in a session with a person in it, where the tool can be a deferred one. The user's first real session is its check.
- Two sessions in one checkout at the same time.
- hstack together with the user's other skill sets: the implementation plan reads one turn with them loaded and reports; it fixes nothing.

## The user's answers (2026-11-20)

1. A requirement against an earlier ruling: stop, push notification, the user decides.
2. Default record files when a project has none: yes.
3. The builder writes `.hstack/repo` and commits the records without asking: yes.
4. A document in which the user and the agent agree on the behaviour (issue 3), with the mechanism of decision 2: yes. It is called a spec, not a plan, and lives in `docs/specs/`, not `progress/`.
5. A plan of tasks, with a review after each task: not now.
6. A step the build makes false: fix it, no question. Two decisions that cannot both hold: the run finishes on the spec, the step is marked "decisions in conflict, not ruled", and the user rules after (the user named the mark and did not object to the flow).
7. The trial copy's `CLAUDE.md` (the copy only; the original project's file is not touched): its session routine is rewritten for hstack, keeping the rules a spec can meet and saying what a run without an implementation plan puts in the records' plan field. The wording is drafted as an uncommitted file in the copy, outside this public repository; the implementation plan only points to it. The user approves it before the file changes. Until then verification 3 cannot pass.
8. A run started as one command with nobody in the session (`claude -p`): it also ends its first turn with the spec and builds only when resumed with an approval. The user's reading: this mode is for testing the plugin, not daily work. Taken by the draft against issue 3's sentence that such a run keeps today's behaviour.
