---
type: plan
title: "Spec and records plan"
description: "hstack 0.4.0: every run starts with a spec (the feature's behaviours) that the user approves; the builder's decisions are committed beside it; a `records` step keeps the project's feature list and log; a one-line file points the loop at a code repository that is not the launch folder. The script moves from POSIX sh to TypeScript run with Bun first. Script verbs `repo`, `home`, `spec`, `approve`; two end-to-end runs."
status: stable
generated: { by: claude-code/2.1.329, at: "2026-11-20T09:00:59+07:00" }
verified:
  - { by: claude-code-advisor/2.1.329, at: "2026-11-20T11:55:35+07:00" }
  - { by: human:emulatalk1, at: "2026-11-20T11:55:35+07:00" }
---

# Spec and Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `hstack:build` builds nothing before the user approves a spec of behaviours, keeps the project's records at the end of each run, and works when the code is in a repository other than the launch folder.

**Architecture:** The user's rule (2026-11-20): every script of the harness is TypeScript, run with Bun. So the run-state script is first ported as it is, `scripts/hstack.sh` to `scripts/hstack.ts`, and proven equal by the existing tests (Task P). All new state and every guard then goes into `scripts/hstack.ts`, tested in `tests/hstack.test.ts`. The playbook and the four agent files carry the rest as text. Two `claude -p` runs check the text: one on a scratch project, one on the trial copy.

**Tech Stack:** TypeScript on Bun (1.4.4 here) with Bun's own APIs and `bun test`, git, Markdown skill and agent files, Claude Code CLI for the runs. No runtime dependency; `typescript` and `@types/bun` as development dependencies for `tsc --noEmit`.

**Spec:** `plugin-dev/2026-11-20-records-and-questions.md` (this plan calls it "the design", because "spec" below is the document a run shows the user; its last section lists the user's answers). Read it whole before Task 1.

## The two documents of a run, and where they are stored

**The words** (the user, 2026-11-20). The document the user approves is the **spec**: what the feature does. It is not called a plan. In the skill set the user works with, the design document ("spec") is what the user approves and what binds, and a plan is the list of tasks written from it for an implementer; a run of this version has no tasks, so it has no plan. The word stays free for a task plan, if one is ever added.

**The spec** (approved by the user; binding; its behaviours are the acceptance steps):
- A project that has a place for specs: that folder, under the project's rules.
- A project that has none: `docs/specs/YYYY-MM-DD-<topic>.md` in the records home (the folder the session is launched in).
- Never `progress/`: that folder is the record of what was done, and a spec is read and approved before anything is done.
- Before the approval the spec file is the only change and is not committed. At the approval it is committed, with the index and log entries the project's rules want.

**The decisions** (made by the builder alone; long-term memory, with less authority than the spec):
- During the run: `$S/decisions.md` in the state folder, the working file. It now also holds what the builder's own `$S/spec.md` held in 0.3.3, as two sections, `## Entry points` and `## Edges`; that file is gone.
- At the `records` step it is committed beside the spec, with the spec's name: `<spec file name without .md>.decisions.md`. Its first line, after any header block the project's rules require: `Decided by the builder while building <spec file>. Not approved by the user.`
- What binds a decision is its test, which is in the project's suite. What a person or a later run reads is this file.
- A later spec that goes against an earlier decision of the builder lists it under "Against the record", marked as the builder's own decision and not a ruling of the user. The user makes any decision a ruling with one sentence; from then on it binds like the spec.
- Not built: one register of the decisions in force, kept up to date across runs.

In the two-repository layout both files are in the outer repository with the records, never in the code repository.

Built in Tasks 5 and 6; read in run A (both files under `docs/specs/`) and run B (both in the folder the copy's rewritten routine names, in its format).

## Global Constraints

- Branch `spec-and-records`, made from `fix/stop-hook-later-sessions` (f8034b9, not merged). A merge of this branch also merges the Stop-hook fix of issue 2.
- After Task P no `.sh` file is left in the plugin and no new `.mjs` is added. `bun test ./tests` and `bun x tsc --noEmit` pass after every task.
- The plugin now needs Bun on every machine it runs on: both hooks are `bun` commands. v0.2 chose POSIX sh because the benchmark's box had no Bun; the benchmark is closed. The README says so, and Task P checks what a session does when `bun` is not on the PATH.
- Checked on 2026-11-20: no file under `bench/` and no `tests/bench-*` file reads `scripts/hstack.sh`, the test file or `hooks/hooks.json`. Two files hold the name `hstack.sh` as text about the transcripts of old runs: `tests/bench-diagnose.test.mjs` (strings) and `bench/README.md` (line 128). Both stay as they are, and the test still passes after the port.
- Not touched by this plan (the user, 2026-11-20): `bench/` and its tests; everything of the OKF docs format (`scripts/okf-check.mjs`, `scripts/lib/okf.mjs`, their tests, and the `docs/` bundle's rules), which the user has not yet decided to keep or drop; and the older `init` and `check` scripts, which call the OKF check. This plan's own documents still follow the bundle's rules as the repository does today.
- Each new test is seen failing before its code is written. Each new guard is also seen failing on a broken copy of the script (Task 4).
- The plugin names no tool and no stack. The one exception the design gives: the playbook may say "the session's notification tool".
- This repository is public: no client name, no client text and no line of the trial copy's records or instructions enters a tracked file. Such text lives under `.evidence/plan-records-2026-11-20/` (ignored) or in the copy.
- Never touch the original project folder or its database. Never run a command that deletes ignored files in this repository.
- Commit after each task, with no attribution line, and always by path (`git add <paths>`, never `-A` or `.`): `progress/2026-11-19-outsourcing-gap.md` stays untracked until the user says otherwise. No push, no merge: both are the user's.
- A run's notification is a real one: runs A and B each call the notification tool at least once. Whether it reaches the user's devices (sent, "not sent", or refused by the permission mode) is a reading, not a condition of the run.

## Review Focus

0. A machine without Bun: the hooks fail. The session must show that, not run silently without its gate. Checked by hand in Task P.
0b. The feedback verbs after the port: they read an entry as bytes and decide what may be posted to a public repository. A description with an invalid UTF-8 byte or a carriage return is refused by `hstack.ts` with the same reason as by the sh script, and the 200 and 1500 limits count bytes. A NUL byte is the one intended difference: the sh script drops it, `hstack.ts` refuses it. Tests in Task P.
1. A pointer file with a bad value (an absolute path, `..`, a folder that is no repository): `repo` refuses to write it; a hand-written bad one makes each verb say what is wrong, the Stop hook allows the stop without an error, and the SessionStart hook warns. A hand-written value with a trailing space or newline is read without it. Tests in Task 1.
2. The builder approves its own spec in the turn it asked, or after changing the file: `approve` refuses both. Tests in Task 2.
3. A run that skips the spec: `phase` refuses every name while `spec` is not recorded. Test in Task 2.
4. A state folder written by 0.3.3 (a finished run with no `spec` and no `records` line): a stop with `done` equal to HEAD is still allowed; a finished one that changed reads as changed, not as missing steps; an unfinished one is told it cannot be continued. Tests in Task 3.
5. A spec waits and the user starts something else in a new session: `start` keeps the waiting run, and `spec --drop` lets the next `start` move it away. Tests in Task 2.

---

## File Structure

| File | Responsibility after this plan |
|---|---|
| `scripts/hstack.ts` | run state, both hooks, and the new verbs `repo`, `home`, `spec`, `approve`, `ruled`; replaces `scripts/hstack.sh` |
| `tests/hstack.test.ts` | every script behaviour, old and new; replaces `plugin-dev/test-hstack.sh` |
| `hooks/hooks.json`, `tsconfig.json`, `package.json` | the hooks call `bun`; type-check settings; development dependencies |
| `skills/build/SKILL.md` | the playbook: steps 0 (records and spec) to 10 (records) |
| `skills/build-implement/SKILL.md`, `tdd.md` | step 4: entry points and edges go into `decisions.md`, no `spec.md`; wording |
| `agents/oracle.md`, `reviewer.md`, `explorer.md`, `mutator.md` | report in the reply; code repository path; the approved spec's behaviours; `decisions.md` where `spec.md` was read |
| `skills/hstack-feedback/SKILL.md`, `README.md`, `.claude-plugin/plugin.json`, `plugin-dev/2026-11-10-hstack-plugin-design.md` | wording and version |
| `.evidence/plan-records-2026-11-20/` (ignored) | run requests (written), transcripts, state folders, the draft of the copy's routine |

### Task 0: Baseline

- [ ] **Step 1:** `git switch -c spec-and-records fix/stop-hook-later-sessions`.
- [ ] **Step 1b:** the first commit of the branch, by path: `plugin-dev/2026-11-20-records-and-questions.md`, this plan, `docs/plans/index.md`, `docs/log.md`, `README.md`. Before it, grep the five files for the client's names and texts (checked clean on 2026-11-20; the hits in `index.md` and `log.md` are older, committed lines).
- [ ] **Step 2:** `sh plugin-dev/test-hstack.sh </dev/null | tail -1` prints `0 failure(s)` (128 `ok` lines today); `bun test ./tests` passes (733 pass, 65 skip on 2026-11-19; 731 pass, 65 skip, 0 fail on 2026-11-20 with only documents changed since: find which two tests are gone before any code changes). Write both counts under "Results".

### Task P: the script in TypeScript, equal to the sh one

**Files:** Create `scripts/hstack.ts`, `tests/hstack.test.ts`, `tsconfig.json`; Modify `plugin-dev/test-hstack.sh` (step 1, then deleted), `hooks/hooks.json`, `package.json`, every file that defines `H` (`skills/build/SKILL.md`, `skills/build-implement/SKILL.md`, `skills/hstack-feedback/SKILL.md`, the four agents where they name the script); Delete `scripts/hstack.sh`, `plugin-dev/test-hstack.sh`.

**Interfaces — Produces:** `bun scripts/hstack.ts <verb> …` with the verbs, outputs, exit codes, state files and state-folder names of `hstack.sh` 0.3.3, byte for byte where a test reads them. Test helpers in `tests/hstack.test.ts` for the later tasks: `h(cwd, ...args)` returns `{ out, err, code }`; `stop(projectDir)` and `startHook(projectDir, source)` run the two hooks with their JSON on stdin; `repoAt(dir)` makes a repository with one commit.

- [ ] **Step 1: make the old tests able to run another script.** In `plugin-dev/test-hstack.sh` every `sh "$H"` becomes `$RUN "$H"` with `RUN="${HSTACK_RUN:-sh}"`. The file tests a carriage return and an invalid byte already. Add here, and see pass on the sh script first: a summary of fewer than 200 characters and more than 200 bytes (Vietnamese text) is refused as over 200 bytes, and the same for a description against 1500, so a port that counts characters fails. Run it: `0 failure(s)` on the sh script.
  - **The one intended difference.** A NUL byte in a description: the sh script drops it without a word and records the entry (seen on 2026-11-20: exit 0, the draft shows the text without the byte). `hstack.ts` refuses it as a control character. That test exists only in the TypeScript file and is left out of proof (b) below.
- [ ] **Step 2: write `scripts/hstack.ts`,** verb by verb from the sh file. Git through `Bun.spawnSync`. The state folder's name is the POSIX `cksum` of the absolute git dir: compute it in TypeScript (the CRC, no call to a `cksum` binary), so that a state folder written by 0.3.3 is still found.
- [ ] **Step 3: parity.** `HSTACK_RUN=bun HSTACK_SH=$PWD/scripts/hstack.ts sh plugin-dev/test-hstack.sh </dev/null` prints `0 failure(s)` for every name of the sh file (128 today, plus the ones Step 1 added). This is the proof that the port changed nothing; write the count under "Results".
- [ ] **Step 4: the tests in TypeScript.** Write `tests/hstack.test.ts` with `bun test`: one test per `ok` line of the sh file, the same names, plus `cksum` of three strings, one of them a path with non-ASCII letters, against the values the `cksum` command prints for them (written into the test as numbers). The test file takes the script from the environment (`HSTACK_SCRIPT`, and `HSTACK_RUN` for `sh` or `bun`), so the same tests can run both scripts. Three proofs, each written under "Results": (a) the new tests pass on `hstack.ts`; (b) the new tests pass on the old `hstack.sh`, which shows the rewritten tests ask what the old ones asked; (c) the three mutants of 0.3.3 (the Stop gate ignores the fingerprint of a stale run; `start` keeps `stale`; a resume marks `stale`), made again in copies of `hstack.ts`, each fail the tests they failed in sh.
- [ ] **Step 5: switch over.** `hooks/hooks.json` calls `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" hook-start` and `hook-stop`; every text that defines `H` says `bun "<plugin root>/scripts/hstack.ts"`; delete the two sh files. `tsconfig.json` (strict, `noEmit`, `types: ["bun"]`, `include` only `scripts/hstack.ts` and `tests/hstack.test.ts`, so the `.mjs` files this plan does not touch are not checked; `node_modules/` is already ignored by git) and the two development dependencies, with Bun's lockfile committed beside `package.json`; `bun x tsc --noEmit` passes. In the README's "Prerequisites" (written on 2026-11-20, where the user wants this rule kept for users and developers), remove the paragraph about `scripts/hstack.sh` and say that both hooks need Bun; in "Development", add `bun x tsc --noEmit` beside `bun test ./tests`, and change the `plugin-dev/` row of the path table, which names the sh test file.
- [ ] **Step 6: a machine without Bun** (a paid call beside the four runs of the budget, about USD 1). One `claude -p "Reply OK"` from a scratch repository with the plugin loaded and a `PATH` that has no `bun`: write under "Results" what the transcript shows for the two hooks. If the session gets no sign that the gate is off, say so in the README's requirement line and report it to the user; do not add a shell fallback.
- [ ] **Step 7:** `bun test ./tests` passes; commit: "hstack: the run-state script and its tests in TypeScript, run with Bun".

### Task 1: the code repository pointer

**Files:** Modify `scripts/hstack.ts` (`state()`, usage, new verbs); Test `tests/hstack.test.ts` (a new `describe` "two repositories" with its own folders).

**How the test lists of Tasks 1 to 3 are written.** Each line below gives a test's name and its assertion in shell words (`sh "$H"` stands for the script, `$S` for the state folder, `stop` and `ostop` for the Stop hook in the one-repository and the outer folder). Write each as a `bun test` with the helpers of Task P, the same name and the same assertion.

**Interfaces — Produces:**
- `<records home>/.hstack/repo`: one line, a path relative to the records home.
- `state()`: when `git rev-parse --show-toplevel` has a `.hstack/repo`, it changes to that folder before it reads the git dir; it writes the first top to `$S/home` only when it followed a pointer, or when `home` does not exist yet. A verb run from inside the code repository finds no pointer there and must not overwrite `home` with the code repository.
- `hstack.ts repo <path>`: refuses with exit 1 when the pointer exists, when `<path>` starts with `/` or holds `..`, or when `<home>/<path>` is not the top of a git work tree other than the home. Else writes the pointer, and in the code repository's state folder does the SessionStart work of a `startup` (`stop-blocks` to 0, `session-head`, `stale` when `base` exists). Prints the code repository's absolute path.
- `hstack.ts repo` (no argument) prints the code repository's top; `hstack.ts home` prints the records home.
- A pointer that names no git work tree: every verb fails with `hstack: .hstack/repo names <value>, which is not a git repository`; `hook-stop` allows the stop; `hook-start` prints that line before its text, so the session knows the gate is off.

- [ ] **Step 1: Write the failing tests** (outer repository `$T/o` that ignores `code/`; hooks run with `CLAUDE_PROJECT_DIR="$T/o"`):

```sh
ok 'without a pointer, a change in the nested repository is not seen' '[ -z "$(ostop)" ]'
ok 'repo refuses an absolute path' '! (cd "$T/o" && sh "$H" repo "$T/o/code") 2>/dev/null'
ok 'repo refuses a path with ..' '! (cd "$T/o" && sh "$H" repo ../x) 2>/dev/null'
ok 'repo refuses a folder that is no repository' '! (cd "$T/o" && sh "$H" repo docs) 2>/dev/null'
ok 'repo writes the pointer and prints the code repository' '[ "$(cd "$T/o" && sh "$H" repo code)" = "$T/o/code" ] && [ "$(cat "$T/o/.hstack/repo")" = code ]'
ok 'repo refuses when the pointer exists' '! (cd "$T/o" && sh "$H" repo code) 2>/dev/null'
ok 'one state folder from the home, a subfolder and the code repository' '[ "$(cd "$T/o" && sh "$H" dir)" = "$(cd "$T/o/code" && sh "$H" dir)" ] && [ "$(cd "$T/o/docs" && sh "$H" dir)" = "$(cd "$T/o/code" && sh "$H" dir)" ]'
ok 'home prints the records home, repo the code repository' '[ "$(cd "$T/o" && sh "$H" home)" = "$T/o" ] && [ "$(cd "$T/o" && sh "$H" repo)" = "$T/o/code" ]'
ok 'home is still the records home after a verb has run inside the code repository' '(cd "$T/o/code" && sh "$H" dir >/dev/null); [ "$(cd "$T/o/code" && sh "$H" home)" = "$T/o" ]'
ok 'a hand-written pointer with a trailing space or newline is read without it' '<pointer written as "code " and a newline: sh "$H" repo prints "$T/o/code">'
ok 'a change in the home alone does not block' 'echo n >> "$T/o/log.txt"; [ -z "$(ostop)" ]'
ok 'a change in the code repository blocks' 'echo x >> "$T/o/code/src"; ostop | grep -q block'
ok 'repo gives the blocks back: an earlier cap in the code repository does not silence the gate' '<a second pair of folders; stop-blocks 4 in the code state before repo; after repo and a change, ostop prints a block>'
ok 'a hand-written pointer to a missing folder: verbs say so, the stop hook allows, the start hook warns' '<pointer "gone"; sh "$H" dir fails with "hstack: .hstack/repo names" on stderr; ostop prints nothing and exits 0; hook-start prints a line that holds ".hstack/repo names">'
```

  The tests in angle brackets are written out in the test file in the same style; their assertions are the ones named.
- [ ] **Step 2:** run the test file; the new lines print `FAIL` (the first one passes today: it records today's behaviour and must still pass before the pointer is written).
- [ ] **Step 3:** implement the items of "Produces". `lock`, `gate` and `done` need no change (the spike showed them working once `state()` has changed folder).
- [ ] **Step 4:** run the test file: `0 failure(s)`.
- [ ] **Step 5:** commit: "hstack: a pointer file names a code repository that is not the launch folder".

### Task 2: the spec and its approval

**Files:** Modify `scripts/hstack.ts` (`PHASES`, `phase`, `start`, `hook-start`, `hook-stop`, new verbs); Test `tests/hstack.test.ts`.

**Interfaces — Consumes:** `state()` of Task 1. **Produces:**
- `PHASES='spec setup oracle implement gate review explore mutate final'` (Task 3 adds `records`).
- State files: `spec` (line 1 the spec file's absolute path, line 2 its `git hash-object`, line 3 the code repository's `fingerprint` when `spec` ran), `spec-asked` (epoch seconds), `spec-shown` (epoch seconds, written only by `hook-stop`).
- `start` also writes `base-status`: the output of `git status --porcelain -uall` in the code repository.
- `hstack.ts spec <file>`: needs a started run; refuses when `setup` is recorded or the file is missing or empty. It also refuses when anything was built before the spec: HEAD must equal `base`, and `git status --porcelain -uall` must equal `base-status` once the spec file's own line is taken out (`nothing is built before the spec is approved. If these changes are yours, undo them; if the user made them, run spec --drop and start again`). When a spec already waits, it first adds that wait (`now − spec-asked`) to `started`, so every round of changes comes off the clock. Writes `spec` and `spec-asked`, removes `spec-shown`. Prints `the spec waits for the user: end this turn with its text`.
- `hstack.ts spec --drop`: removes the three files; the next `start` moves the run away as today. It does not touch the spec file. The playbook tells the builder to delete that file, which it wrote and nobody approved, unless the user asks to keep it; a file left in a one-repository work tree would read as a change.
- `hstack.ts approve`: refuses (exit 1, a reason on stderr) when no spec waits, when `spec-shown` is absent, or when the file's hash differs from line 2. Else appends the line `spec` to `phases`, adds `now − spec-asked` seconds to `started`, removes `stale`, `spec-asked` and `spec-shown`, keeps `spec`. Prints `approved`.
- `phase`: refuses the name `spec`, also as `spec skipped: …` ("recorded by approve"); refuses every other name while `spec` is not in `phases` ("no approved spec").
- `hook-stop`: when `spec` exists and `spec` is not in `phases`: if the code repository's fingerprint equals line 3, it writes `spec-shown` if absent and allows the stop, without counting a block. This branch runs before every other exit of the hook but the feedback pass, and so before the exit for a `stale` run with nothing changed: a spec shown again in a new session must still get its stamp, or `approve` refuses for ever. If it differs, it blocks (counted, capped as every block): `a spec waits for the user's approval and nothing is built before it. If the changes made since the spec was shown are yours, undo them and end the turn with the spec's text; if the user made them, run spec --drop and start again.`
- `start`: when a spec waits, it moves nothing, prints `S`, and prints `a spec waits for the user's approval: <path>` on stderr.
- `hook-start`: the text becomes the one below; when a spec waits it adds the second line.

```text
hstack is installed. For any request to build, change or fix code in this repository, invoke the hstack:build skill first and follow it to its last step before you reply. It starts with a spec that the user approves; after the approval, decide from the spec and the code, and write each decision down.
A spec waits for the user's approval: <path>. If the user's message approves it, run `hstack.ts approve` and go on with hstack:build from setup. If it asks for changes, change the spec and show it again. If it is other work, say so and run `hstack.ts spec --drop` first.
```

- The Stop-block reason ends: `Decide from the approved spec and the code. When finished, end with exactly the reply the task asked for.`

- [ ] **Step 1: Change the test helper and count the expected breaks.** The helper that starts a run and records steps (`run()` in the old sh file) becomes: `start`, then a helper `specced` (write a one-line spec file outside the work tree, `spec`, one `stop`, `approve`), then the phases. Every place that calls `sh "$H" start` and then `phase` by hand gets `specced` too (4 `start` calls today). Five old tests pin the step list or the block text ('missing lists every phase at first', 'stop blocks a started run and names the missing steps', and the three of "later sessions" that read `steps not recorded: implement`): change their expected text to the new list and wording, and note the count under "Results".
- [ ] **Step 2: Write the failing tests:**

```sh
ok 'phase refuses while no spec is approved' '! sh "$H" phase setup 2>/dev/null'
ok 'phase refuses the name spec, skipped or not' '! sh "$H" phase spec 2>/dev/null && ! sh "$H" phase spec skipped: time 2>/dev/null'
ok 'spec refuses a missing file' '! sh "$H" spec "$T/none.md" 2>/dev/null'
ok 'approve refuses when no spec waits' '! sh "$H" approve 2>/dev/null'
ok 'spec refuses when code changed since the run started' 'echo y >> src/a.txt; ! sh "$H" spec "$T/p.md" 2>/dev/null; r=$?; git checkout -q -- src/a.txt; [ $r -eq 0 ]'
ok 'spec accepts a spec file that is itself new in the repository' '<a spec written to docs/specs/ in the work tree, nothing else changed: spec succeeds>'
ok 'spec records the file' 'sh "$H" spec "$T/p.md" | grep -q "waits for the user" && [ "$(sed -n 1p "$S/spec")" = "$T/p.md" ]'
ok 'approve refuses a spec the user has not seen' '! sh "$H" approve 2>/dev/null'
ok 'a stop with a waiting spec is allowed and counts no block' '[ -z "$(stop)" ] && [ "$(cat "$S/stop-blocks")" = 0 ]'
ok 'the stop stamps the wait' '[ -s "$S/spec-shown" ]'
ok 'a change made while the spec waits blocks the stop' 'echo y >> src/a.txt; stop | grep -q "nothing is built before it"; r=$?; git checkout -q -- src/a.txt; [ $r -eq 0 ]'
ok 'approve refuses a spec changed after it was shown' 'echo more >> "$T/p.md"; ! sh "$H" approve 2>/dev/null'
ok 'a spec shown again loses its stamp' 'sh "$H" spec "$T/p.md" >/dev/null; [ ! -f "$S/spec-shown" ]'
ok 'approve records the step' 'stop >/dev/null; sh "$H" approve | grep -q approved && grep -qx spec "$S/phases"'
ok 'the wait is off the clock' '<spec-asked set 600 s back before approve; elapsed prints 0 after it>'
ok 'after approval an unfinished run blocks again' 'stop | grep -q "steps not recorded: setup"'
ok 'spec refuses once setup is recorded' 'sh "$H" phase setup; ! sh "$H" spec "$T/p.md" 2>/dev/null'
ok 'start keeps a run whose spec waits' '<new run, spec, then start again: base and spec are still there, stderr names the path>'
ok 'spec --drop lets start move the run away' '<spec --drop, start: no spec file, a folder under old/>'
ok 'a new session shows the waiting spec and approve clears stale' '<spec, stop, hook-start startup prints "A spec waits"; approve; no stale file>'
ok 'a spec shown again in a new session is stamped and can be approved' '<spec, stop, hook-start startup (the run is now stale), spec again, stop: spec-shown exists and approve succeeds>'
ok 'the nudge no longer says nobody answers' '! (printf "{\"source\":\"startup\"}" | CLAUDE_PROJECT_DIR="$R" sh "$H" hook-start | grep -q "No human")'
```

- [ ] **Step 3:** run: the new lines `FAIL`.
- [ ] **Step 4:** implement "Produces".
- [ ] **Step 5:** run: `0 failure(s)`.
- [ ] **Step 6:** commit: "hstack: a run starts with a spec that the user approves".

### Task 3: the `records` step

**Files:** Modify `scripts/hstack.ts` (`PHASES`); Test `tests/hstack.test.ts`.

**Interfaces — Produces:**
- `PHASES='spec setup oracle implement gate review explore mutate final records'`; `missing` and `done` read the list.
- `phase` refuses `records skipped: …` ("the records step always runs"): the step this version exists for cannot be dropped for time.
- State folders written by 0.3.3 or earlier, in `hook-stop`:
  - a run that has a `done` file is finished, whatever its `phases` hold: after a change the reason is the one for "changed after the last final check", not a list of steps;
  - a run with no `done` whose `phases` hold a step and no `spec` line cannot go on (`phase` would refuse): the reason is `an hstack:build run of an earlier version was left unfinished and cannot be continued. Run hstack:build from its start.` `start` moves it away as today.

- [ ] **Step 1: Write the failing tests:**

```sh
ok 'a run with every step but records is not finished' 'run setup oracle implement gate review explore mutate final; ! sh "$H" done 2>/dev/null && stop | grep -q "steps not recorded: records"'
ok 'records cannot be skipped' '! sh "$H" phase records skipped: time 2>/dev/null'
ok 'records ends the list' 'sh "$H" phase records && sh "$H" done | grep -q "done at"'
old() { sh "$H" start >/dev/null; printf '%s\n' "$@" > "$S/phases"; } # a run as 0.3.3 recorded it: no spec line
ok 'a run finished by 0.3.3 lets a stop through' 'old setup oracle implement gate review explore mutate final; git rev-parse HEAD > "$S/done"; [ -z "$(stop)" ]'
ok 'a change after a run finished by 0.3.3 reads as a change, not as missing steps' 'start startup; echo z >> src/a.txt; stop | grep -q "changed after the last final check"; r=$?; git checkout -q -- src/a.txt; [ $r -eq 0 ]'
ok 'an unfinished 0.3.3 run cannot be continued and the block says so' 'old setup oracle; start resume; stop | grep -q "cannot be continued. Run hstack:build from its start"'
ok 'start moves the unfinished 0.3.3 run away' 'sh "$H" start >/dev/null && [ ! -s "$S/phases" ] && ls "$S/old" | grep -q .'
```

- [ ] **Step 2:** run: `FAIL`; add `records` to `PHASES` and to every helper call that finishes a run; run: `0 failure(s)`.
- [ ] **Step 3:** commit: "hstack: the records step is required".

### Task 3b: a ruling after the run

The design lets the user rule after a run (a step marked "decisions in conflict, not ruled", an `UNCLEAR` verdict, a step that was not walked). Recording that ruling changes record files only. In a project with one repository that is a change the Stop gate sees, and it would send the session into a whole new run. This task gives it its own short way.

**Files:** Modify `scripts/hstack.ts`; Test `tests/hstack.test.ts`.

**Interfaces — Produces:**
- `$S/record-paths`: written by the builder in the `records` step, one git pathspec per line, relative to the code repository, for each record file and for the decisions files beside the specs (`<specs folder>/*.decisions.md`), where they lie inside it (empty in the two-repository layout). All decisions files, not only this run's: a ruling on an earlier spec's decision must also be accepted. Never the spec files: a spec does not change after its approval.
- `hstack.ts ruled`: refuses (exit 1, a reason on stderr) when there is no `done`, when the tree is not clean, or when `git diff --name-only <done> HEAD` holds a path that is not in `record-paths` or that a line of `test-paths` matches. The builder writes `record-paths` itself, so this guard catches a mistake, not a builder that sets out to evade it; the test-paths check is the part it cannot write around. Else writes HEAD to `done` and prints `ruling recorded at <commit>`.
- The SessionStart text gains one sentence: `A message that only rules on a point the project's record lists as waiting for a ruling is not a build: write the ruling as the record's rules say, commit those files by path, and run hstack.ts ruled.`

- [ ] **Step 1: Write the failing tests:**

```sh
ok 'ruled refuses when no run is finished' '! sh "$H" ruled 2>/dev/null'
ok 'ruled moves done when only record files changed' '<a finished run with record-paths "progress/features.json"; that file edited and committed: ruled prints "ruling recorded", and the stop is allowed>'
ok 'ruled refuses when a file outside the records changed' '<the same, plus a commit that changes src/a.txt: ruled fails and the stop still blocks>'
ok 'ruled refuses a changed test file even when record-paths names it' '<record-paths also names tests/old_test.txt; that file changed and committed: ruled fails>'
ok 'ruled refuses a changed spec file' '<record-paths as the records step writes it; docs/specs/x.md changed and committed: ruled fails>'
ok 'ruled refuses an uncommitted change' '<the record file edited, not committed: ruled fails>'
```

- [ ] **Step 2:** run: `FAIL`; implement; run: `0 failure(s)`. Task 4 gets one more broken copy: `ruled` ignores `record-paths`. And one for Task 3: `phase` accepts a skipped `records`.
- [ ] **Step 3:** commit: "hstack: a ruling after the run is recorded without a new run".

### Task 4: each guard seen failing

- [ ] **Step 1:** in the scratchpad, make one broken copy of the script per guard (a TypeScript file run with Bun that writes them; no removal command): `approve` ignores `spec-shown`; `approve` ignores the hash; `spec` ignores changes made since `start`; `phase` ignores the missing spec; `hook-stop` ignores the fingerprint of a waiting spec; `hook-stop` does not stamp; `hook-stop` takes the exit for a stale run before it looks for a waiting spec; `repo` skips the `stop-blocks` reset; `state()` ignores the pointer.
- [ ] **Step 2:** run the test file on each with `HSTACK_SCRIPT=<copy> bun test tests/hstack.test.ts` (the variable of Task P): each copy fails one or more of the tests named for its guard. A copy that passes means a missing test: add it. Write the table (copy, failing tests) under "Results".

### Task 5: the playbook

**Files:** Modify `skills/build/SKILL.md`. No test file: runs A and B are its check. Keep the file's style (one short paragraph or list per step, absolute paths in every command).

The text must say, and no more than this:

- [ ] **Intro and description.** The builder runs every step to the end. It asks the user once, for the spec; after the approval nobody answers a question, and each decision goes to `$S/decisions.md`. The description no longer says "without asking a human".
- [ ] **Rules for the whole run, new items.**
  - *Two folders.* `$H repo` prints the code repository and `$H home` the records home. Every git command and every project command of this playbook runs in the code repository: `git -C <it> …` or `( cd <it> && … )`; never a bare `cd`. Paths given to `$H lock` are relative to it. Each agent gets its path.
  - *Records home.* Commit there by path (`git -C <home> add <paths>`), never with `-A`. Messages name the change, never hstack.
  - *Reports.* An agent's reply is its report. Store it unchanged in the state file the step names, with a shell command (a here-document), before reading it.
- [ ] **Step 0, "Records and spec", before today's step 2.** In this order:
  1. If the project's instructions name a separate code repository and `$H repo` prints the launch folder: `$H repo <path>`. This comes first: the verb moves the state folder to the code repository, and a run started before it would be left behind in the launch folder's state.
  2. `$H start`. If it says a spec waits, write nothing and go to item 7 with the user's message. Else write the user's request verbatim to `$S/requirement.md`.
  3. Find the project's records and their rules; write `$S/records.md` (`<role> | <path> | <rules, quoted>`; roles `features`, `log`, `coverage`, `specs`). Create a missing `progress/features.json` (`[]`) or `progress/progress.md` only in the `records` step, not here.
  4. Find what goes against the record, by the routes of the design (decision 2), read-only, 15 minutes at most. The record includes the `*.decisions.md` files beside earlier specs.
  5. Write the spec file with the five sections of the design, in the project's specs folder under its rules, else `docs/specs/YYYY-MM-DD-<topic>.md` in the records home. No tasks, no code design, no file list. Under "Against the record", mark each item as the user's (a ruling, an approved step) or as the builder's own earlier decision. Write only that one file now: an index or log entry the project's rules want for a spec is written at the approval (item 7), so that before it the spec file is the only change.
  6. `$H spec <file>`. Call the session's notification tool if the session has one (it may be among tools that must be loaded first), with one line that says a spec waits. End the turn with the spec's text and one line: approve it, or say what to change.
  7. On the user's next message: changes mean edit the file and item 6 again. An approval means `$H approve`; append the spec and the user's reply, verbatim, to `$S/requirement.md`; write the index and log entries the project's rules want for a spec; commit the spec, those entries and a new `.hstack/repo` in the records home, by path; go on.
- [ ] **Step 3 (oracle).** One or more tests per numbered behaviour of the spec; the reply is the report; store it as `$S/oracle-report.md`.
- [ ] **Step 5 (gate).** A `REMOVED` or `PRE-EXISTING TEST` line is allowed only for a test of an item the user approved under "Against the record" (an earlier step, a ruling, or an earlier decision of the builder). Any other: put the test back and fix the code so that both hold. If both cannot hold, go on with the spec: change the earlier test only as far as the spec's behaviour needs, and write an entry in `$S/conflicts.md` (the earlier step, quoted; the number of the spec's behaviour; why no code satisfies both; the test lines changed). A changed test of earlier behaviour with neither an approved item nor such an entry is not allowed. The reviewer gets `conflicts.md`. An entry written after the review step (from explore, mutate or the final gate) has had no reviewer: start the reviewer once more on that entry alone if the time rules allow it, else the log entry marks it "conflict not reviewed" under "Needs your ruling".
- [ ] **Steps 6 to 8.** Each agent's reply stored as `review-<n>.md`, `explore.md`, `mutants.md`. Where the reviewer and the explorer got `spec.md`, they now get `requirement.md` (it holds the approved spec) and `decisions.md`. The explorer gets the spec's behaviours and returns `PASS`, `FAIL` or `UNCLEAR` for each. After a fix of a `FAIL`, start the explorer once more on the failed behaviours only, inside the time rules; store it as `explore-2.md`.
- [ ] **Time rules.** Add to the playbook's start-time rules: `records` always runs and is never recorded as skipped; `final` still starts by 210 minutes, and `records` follows it whatever the clock says.
- [ ] **Step 10, "Records", after `$H phase final`.** The five items of the design's decision 4, the `passes` rules as its four sub-items, the "decisions in conflict, not ruled: spec <name>" note for each entry of `$S/conflicts.md`, the rule for what cannot be met (decision 3, last paragraph). Commit `$S/decisions.md` beside the spec as `<spec name>.decisions.md` with the first line of this plan's section "The two documents of a run"; the log entry points to the spec and to that file and lists what needs a ruling, and does not repeat the decisions. A list of each step's test, where the project's rules want one, goes where they say or into the decisions file, never into the spec: after the commit at the approval the spec file does not change. Default files have the format of the design's decision 3 (`progress/features.json`: `{ "feature", "spec", "steps": [ { "step", "test", "passes", "note" } ] }`; `progress/progress.md`: one appended entry per run). Write `$S/record-paths` (Task 3b). The log entry also says when the builder wrote `.hstack/repo`. Then `$H phase records`, `$H done`. If anything is under "Needs your ruling", call the notification tool once more.
- [ ] **A ruling after the run** (a short section at the end of the playbook). When the user's message only rules on a point listed under "Needs your ruling": no spec and no run. Write the ruling in the record as its rules say (`Ruling (date): …` in the step's `note`, `passes` set to match; for a step the spec replaced, `replaced by <the new step>`), append one line to the log, commit those files by path, and run `$H ruled`. The same way when the user says that a decision of the builder is now their ruling: write `Ruling (date): …` beside it in the decisions file. If the user rules that the earlier step stands, that is a new request: `hstack:build` from its start.
- [ ] **A dropped spec.** When the user's message is other work while a spec waits: `$H spec --drop`, then delete the spec file the builder wrote and nobody approved, unless the user asks to keep it.
- [ ] **The last reply.** Exactly what the task names; when it names none, the short form of the log entry.
- [ ] **Commit:** "build playbook: a spec the user approves, the records step, two folders".

### Task 6: the agents and the other texts

**Files:** Modify `agents/oracle.md`, `agents/reviewer.md`, `agents/explorer.md`, `agents/mutator.md`, `skills/build-implement/SKILL.md`, `skills/build-implement/tdd.md` (line 13), `skills/hstack-feedback/SKILL.md` (line 18), `README.md`, `.claude-plugin/plugin.json`, `plugin-dev/2026-11-10-hstack-plugin-design.md`.

- [ ] **All four agents:** "Write the file you were given" becomes "Reply with the report" in the same format; no agent names the Write tool or gets a file to write. The input list gains the code repository's path, and every git command in the file is written with `git -C <it>`. "No human will answer" stays.
- [ ] **Oracle:** the requirement file now ends with an approved spec; write one or more tests for each of its numbered behaviours, and key `## Behaviours` by the spec's numbers. `## Files` stays the last section (the builder reads the paths from it).
- [ ] **Reviewer and explorer inputs:** every place that names `spec.md` or "the spec" as the builder's file names the approved spec (in `requirement.md`) and `decisions.md`. The places, from a grep on 2026-11-20: `skills/build/SKILL.md` lines 49, 61, 65; `skills/build-implement/SKILL.md` lines 3 and 13; `agents/explorer.md` lines 6, 8, 15; `agents/oracle.md` line 8; `README.md` line 43 (the `build-implement` row); and `tests/skills.test.mjs` line 72, which pins the string `$S/spec.md` in the text of `build-implement`: it will fail, and its string becomes `## Entry points` (an existing `.mjs` test edited in place; no new `.mjs` file). `tdd.md` line 18 speaks of "a decided edge" and stays. The oracle's list of what it must never read keeps `decisions.md` and loses `spec.md`.
- [ ] **Explorer:** add the verdict list, `## Verdicts`: one line per spec behaviour, `<number> PASS|FAIL|UNCLEAR — <what was done and seen>`.
- [ ] **Reviewer:** the "weakened test" check reads: every removed or altered line of a pre-existing test must belong to an item the approved spec lists under "Against the record"; or to an entry of `conflicts.md`; any other is an Important finding. For each entry of `conflicts.md` it checks that the two really cannot both hold: if code can satisfy both, that is an Important finding (put the test back, fix the code).
- [ ] **build-implement:** its commands run in the code repository. Its item 2 no longer writes `$S/spec.md`: it writes two sections, `## Entry points` and `## Edges`, into `$S/decisions.md`, with the same content rule as today (every entry point; every edge with a decision that cites the approved spec or the existing code), before any line of product code. As each edge gets its test, the builder adds the test's file and name to the edge's line, so the committed decisions file says what pins each decision. The behaviours are the approved spec's, by number, and are not written again.
- [ ] **`tdd.md` line 13, `hstack-feedback/SKILL.md` line 18:** the quoted hook wording follows Task 2's text.
- [ ] **README:** the status line (v0.4.0, one sentence on the spec and the records) and the `build` row ("asks once, for the spec").
- [ ] **`plugin.json`:** 0.4.0. **v0.2 design:** one line under its status pointing to the new design for what it replaces.
- [ ] `bun test ./tests` passes (`tests/skills.test.mjs` reads the skill files). Commit: "agents and texts for 0.4.0".

### Task 7: run A, the scratch project (right after Task 6, by itself)

- [ ] **Step 1:** rebuild the 2026-11-10 fixture in the scratchpad (`plugin-dev/2026-11-10-checks.md`, "End-to-end runs": a small Python command-line program with one unittest test, a README that names the test command, a fresh git repository). It has no records and needs no install.
- [ ] **Step 2: turn 1.** From the fixture's folder, with its own `HSTACK_STATE`, cap 30 minutes, in the background:

```sh
HSTACK_STATE=<state> claude -p "<Run A's request, from .evidence/plan-records-2026-11-20/requests.md>" \
  --plugin-dir <this work tree> --setting-sources project,local --strict-mcp-config \
  --permission-mode auto --add-dir <state> --output-format stream-json --verbose > <evidence>/a1.jsonl
```

- [ ] **Step 3: read turn 1.** Each reading goes under "Results": (1) the last reply holds the spec's text with numbered behaviours; (2) a tool call of the notification tool, and its result, recorded as it is: "not sent" or a refusal by the permission mode is a reading, not a failure of the run; (3) `git log` of the fixture has no new commit and the spec file exists under `docs/specs/`; (4) `<state>/…/spec-shown` exists and `phases` is empty; (5) 0 Stop blocks; (6) the SessionStart text of Task 2 is in the transcript, which shows that the hook found `bun` (here `~/.bun/bin`, on the `PATH` from the shell profile).
- [ ] **Step 4: turn 2.** The same command with `--resume <session id of turn 1>` and the prompt `Approved.`, cap 60 minutes, into `a2.jsonl`.
- [ ] **Step 5: read turn 2.** (1) `phases` holds the ten lines and `done` equals HEAD; (2) `progress/features.json` has one step per behaviour of the spec, each with a `test` that exists and a `passes` value that follows the explorer's verdict stored in `explore.md`; (3) `progress/progress.md` has one entry that quotes `Approved.`; (4) `oracle-report.md`, `review-1.md`, `explore.md`, `mutants.md` exist in the state folder and no Write-tool call was refused; (4b) `docs/specs/` holds the spec, unchanged since the approval commit, and its `.decisions.md` with the first line that says who decided and a test named for each edge; in the transcript, `decisions.md` got its `## Entry points` and `## Edges` sections before the first edit of a product source file (the check that the builder still lists them now that they have no file of their own); no `spec.md` in the state folder; (5) the spec, the records and the code are committed and the tree is clean; (6) minutes and cost of both turns.
- [ ] **Step 6:** if a reading fails, the script or the wording is what failed: report it, fix it under the task that owns it (a test first for the script), and run A again. Do not patch a run. The budget holds four full runs: A, B and two repeats in all. Past that, stop and report to the user.
- [ ] **Step 7: turn 1 once more, with the user's own plugins loaded.** Runs A and B load hstack alone. The user's sessions also load other skill sets, and one of them tells the agent to start any new work with its own design and plan skills. On a fresh copy of the fixture, run turn 1 with `--setting-sources user,project,local` (the user's plugins; `--strict-mcp-config` stays), cap 30 minutes, into `a3.jsonl`. Read: which skill is invoked first; whether the turn ends with hstack's spec and the stamp; whether anything was built. This step fixes nothing: a conflict is reported to the user with what the transcript shows. hstack is not installed at user level on this machine (checked 2026-11-20), so the turn loads one copy of it. It is one turn that ends at the spec: a small call beside the four runs, inside the USD 40.
- [ ] **Step 8:** copy the transcripts and the state folder to `.evidence/plan-records-2026-11-20/`; commit the "Results" of this task.

### Task 8: the trial copy's routine (the user approves before Task 9)

- [ ] **Step 1:** read the copy's `CLAUDE.md` whole and write `.evidence/plan-records-2026-11-20/copy-routine.md` as `copy-routine-brief.md` in that folder says (the brief lists what is kept, changed and removed; it is not in this file because it names the project's rules). The project's section on questions and its own Stop hook stay as they are.
- [ ] **Step 2:** the advisor reviews the file. Then the user approves it, or changes it. Nothing below runs before that.

### Task 9: run B, the trial copy (after the user's approval of Task 8)

- [ ] **Step 1: the start state**, each item checked and written to `.evidence/plan-records-2026-11-20/launch-b.md`:
  - The copy's outer repository has no remote (checked 2026-11-20: `git remote -v` prints nothing). The inner one's push address is disabled. Check both again.
  - Outer repository: save the diff of the progress log (the trial's uncommitted entry) to the evidence folder, then restore the file to its committed state. The user approves this with this plan: it removes an uncommitted entry from the copy's log, and the entry stays readable in the saved diff and in the trial's transcript. Then a new branch there, and commit the approved routine in the copy's instructions.
  - Inner repository: a new branch from the branch the trial started from (the trial's branch stays as it is).
  - The copy's own Postgres container is up on port 5433; the Docker socket is cut off and the original's database names are listed before the run, as in the trial's `launch.md`.
  - The copy's own settings load in this launch (`--setting-sources project,local` from the outer folder), and with them its own Stop hook, which the trial never ran: for a turn that ends with a question it waits 50 minutes and then wakes the session to write a handoff entry. What it does to a `-p` turn is not known. It stays on. Before the run: where it keeps its state and its log, and that it ends at once when background work runs.
- [ ] **Step 2: turn 1**, from the copy's **outer** folder, Run B's request, its own `HSTACK_STATE` under `.evidence/plan-records-2026-11-20/state-b`, cap 90 minutes (the spec, plus the project hook's wait), the flags of Task 7 with `DOCKER_HOST` as in the trial, into `b1.jsonl`.
- [ ] **Step 3: read turn 1.** (1) `.hstack/repo` holds the code folder's name, and the state folder's `repo` file names the inner git dir; (2) the spec is in the folder the copy's rewritten routine names, with its frontmatter, and "Against the record" quotes both the ruling's line and the earlier step's line; (3) the notification call and its result; (4) no commit in either repository; (5) the spec's file and the pointer are the only changes in the outer repository, and the inner tree is clean; (6) what the project's own Stop hook did, from its log: whether the turn ended at once or after its wait, and whether a handoff entry was written (then the outer repository has that change too). A wake that makes the builder go on without an approval is a failure of hstack's guards, not of the hook.
- [ ] **Step 4: turn 2**, resumed with the approval text of the requests file, cap 225 minutes, into `b2.jsonl`.
- [ ] **Step 5: read turn 2.** (1) ten phases, `done` equals the inner HEAD; (2) the inner repository has commits of code and tests only, and the project's own history check (`git log -p <base>..HEAD` against its hooks' pattern file) prints nothing; (3) in the outer repository: `.hstack/repo` is committed with the spec; the earlier step is reworded to the behaviour after the run and its coverage row has the ruling with the spec's number; the new steps are there; the decisions file is beside the spec, in the form the copy's rules want; the coverage file has a section `## Spec 1 (…)` with rows `S1-F1-S1` on, each `full` or `partial` with its two proofs or what is missing; `records-check` on the two files prints "records agree"; the log entry names the commit of the one whole run of the build suite and its result; the explorer's `## Earlier steps` has a line for each `partial` step it reached, with a screenshot; the log has one entry that quotes the approval; the legacy `.hstack/manifest.json` is not in any commit; the project's own Stop hook may wake after the last reply and add a handoff entry, which is then one more change there and is read, not counted as a fault; (4) no test of earlier behaviour changed except the ones of the approved item; (5) the original's database name list is the same after the run, and the transcript's tool inputs hold no push, no drop, no path of the original folder; (6) minutes and cost.
- [ ] **Step 6:** failures as in Task 7 Step 6. Copy the evidence; commit the "Results".

### Task 10: close

- [ ] **Step 1:** the advisor reviews the branch diff and the "Results".
- [ ] **Step 2:** report to the user: the readings, what failed and was fixed, the cost, and what is theirs: the merge (it carries the issue 2 fix), the push, issues 2 and 3, the copy's branches; and what is left running: the copy's Postgres container, and the review page's server on port 8765 if it is still up.

## Cost and time

The trial run was about USD 10 and 50 minutes, of which the project's end-to-end suite took about 20 minutes. Run A's fixture took 3 minutes and USD 1.09 on v0.2; expect more with the spec and the records. Budget: USD 40 in all, for four full runs (A, B and two repeats) and two small calls (the machine without Bun, and the one turn with the user's own plugins). Past either limit, stop and ask the user.

## Not built

Everything under "Not in this design" of the design document. Also: no migration of state folders written by 0.3.3 (Task 3 only keeps them from blocking), no fix for a conflict with the user's other skill sets if Task 7 Step 7 shows one, no check of the notification in a session with a person in it, and no check that a session started another way than from a terminal (the desktop app, an IDE) has `bun` on the hooks' `PATH`. The user's first real session is the check of both.

## Approval

**Approved on 2026-11-20.** The user's words: "nếu advisor không có ý kiến gì thì duyệt" (approved if the advisor has no remark). The advisor's verdict on the plan as it stood: no objection, fit to execute; it named three small corrections to fold in (the `ruled` paths, the place of the decisions file's first line, a neutral branch name for run B), which are in. The approval covers the three items below and not the wording of Task 8, which is the next stop for the user. No execution method was named, so the plan runs natively, as recommended.

The user approves, before any code: this plan; the handling of the trial's uncommitted log entry in the copy (Task 9 Step 1); the budget. The execution method is the user's choice (the header's "recommended" is the standard line of the plan format, not this plan's advice): native in one session (recommended here: the tasks share one script and one test file, and two runs with an advisor review check the result), or one subagent per task.

## Results

### Task 0 (2026-11-20)

- Branch `spec-and-records` from `fix/stop-hook-later-sessions` (f8034b9).
- `sh plugin-dev/test-hstack.sh </dev/null`: 151 checks print `ok`, `0 failure(s)`. The "128" used above in this plan counted the source lines that begin with `ok`; other checks sit after a `;` on a line. 151 is the number the parity proofs of Task P must reach.
- `bun test ./tests`: 731 pass, 65 skip, 0 fail, 796 tests in 37 files (198 s).
- **The two tests are not gone.** The run of 2026-11-19 was typed `bun test tests`, without `./`. Bun then takes `tests` as a part of the path and also loads `fixtures/electron/tests/db.int.test.ts` and `note.test.ts`: 39 files, 798 tests, 733 pass. `bun test ./tests` loads the 37 files of `tests/` only. Checked with a name filter that matches nothing: `bun test tests` searches 39 files and 798 tests, `bun test ./tests` 37 and 796, `bun test ./fixtures/electron/tests` 2 and 2. The repository's command is `bun test ./tests`; 731 is the baseline.
- Client names in the files of the first commit: none in the design, this plan and the README; `docs/plans/index.md` and `docs/log.md` hold only older, committed lines.

### Task P (2026-11-20)

- **Step 1.** The sh tests run another script through `$RUN`; two checks added (a summary of 70 Vietnamese letters: 70 characters, 210 bytes; a description of 510: 1530 bytes). On the sh script: 153 checks print `ok`, `0 failure(s)`.
- **Step 3, parity.** The sh tests on `hstack.ts` (`HSTACK_RUN` = the absolute path of bun): 152 of 153 `ok` on the first run. The one `FAIL`, 'a grep that fails refuses the draft', is a difference by intent: it guards a hazard of the sh script only (a broken `grep` on the `PATH` that lets the allow-list of fields pass), and `hstack.ts` runs no `grep`.
- **Step 4, the tests in TypeScript** (`tests/hstack.test.ts`, 156 tests: the 153 names, the `cksum` test, and two for the script in TypeScript only):
  - (a) on `hstack.ts`: 155 pass, 1 skip (the `grep` check), 0 fail.
  - (b) on the old `hstack.sh` (`HSTACK_RUN=/bin/sh`): 154 pass, 2 skip, 0 fail. The rewritten tests ask what the old ones asked.
  - (c) the three broken copies of 0.3.3, made again from `hstack.ts`:

    | Copy | Tests that fail |
    |---|---|
    | the Stop gate ignores the fingerprint of a stale run | 'a change made in the later session still blocks'; 'a change in the later session blocks and names both ways on' |
    | `start` keeps `stale` | 'start takes the run into this session: it blocks with nothing changed'; 'a resume of an unfinished run still blocks' |
    | a resume marks `stale` | 'a resume of an unfinished run still blocks', and four tests of the capped stop |

  - `cksum` in TypeScript gives the numbers of the `cksum` command for four strings, one a path with Vietnamese letters; the state folder of the test repository has the name the sh script gave it.
- **Three differences by intent** between `hstack.ts` and `hstack.sh` 0.3.3, each with its test or its reason:
  1. A NUL byte in a description is refused as a control character; the sh script dropped the byte and recorded the rest.
  2. A description that is not valid UTF-8 is refused ('the description is not valid UTF-8'); the sh script accepted it. `gh` gets the text as a string, so other bytes than the draft showed would be posted.
  3. No `grep` is run, so the check for a failing `grep` does not apply. Also: `phase` refuses a name that holds a newline, which the sh script accepted when one of its lines was a valid step.
- `cksum` is its own module, `scripts/lib/cksum.ts`, so that a test can import it without running the script.
- Commit 68b6600 holds both scripts and both test files, so the parity runs can be made again from it. The next commit removes the two sh files.
- **Step 6, a machine without Bun** (`.evidence/plan-records-2026-11-20/nobun.jsonl`; one turn, USD 0.14). The SessionStart hook ends with `exit_code` 127, `outcome` "error" and the text `/bin/sh: bun: command not found`; its nudge does not reach the agent. At the stop, Claude Code emits a notification, "stop hook problem · ctrl+o to see", and the turn ends. So a person at the screen gets a sign; the agent gets none and works without the gate. The README's "Prerequisites" says so. No shell fallback was added.
- **Two older tests changed with the switch.** `tests/plugin.test.mjs` pinned "no `devDependencies`": it now pins that there are exactly two, `typescript` and `@types/bun`, and still that there is no `dependencies` (the plugin installs nothing). `tests/skills.test.mjs` pinned `sh "…/hstack.sh"` in the feedback skill: it now pins `bun "…/hstack.ts"`. Both are existing `.mjs` files, edited in place.
- TypeScript 7.0.2 and `@types/bun` 1.4.5 as development dependencies; `bun.lock` is committed; `bun x tsc --noEmit` exits 0.

### Tasks 1 to 3b (2026-11-20)

Each task: the new tests seen failing, then the code, then `bun test tests/hstack.test.ts` and `bun x tsc --noEmit`.

| Task | New tests | Seen failing | After the code |
|---|---|---|---|
| 1, the pointer | 14, and 'start keeps the records home' added in Task 2 | 8 (the other 6 assert a refusal or today's behaviour) | 169 pass, 1 skip |
| 2, the spec | 22 | 37 with the helper change | 192 pass, 1 skip |
| 3, records | 7 | 4 | 199 pass, 1 skip |
| 3b, a ruling | 7 | 7 | 206 pass, 1 skip |

- Task 2 changed the helper that starts a run (it now shows a spec, lets one turn end and approves) and three pinned texts: the step list, the block text, and the test of a run recorded with the old step name, which now misses `spec` and `records` and is named 'a run recorded with the old step name misses no step it had'.
- Found while writing Task 2 and fixed with its own test: `start` moved the file `home` away with the earlier run, so a later call from inside the code repository made that repository the records home.
- `ruled` with no file changed since `done` is accepted; it moves nothing.

### Task 4 (2026-11-20): each guard seen failing

Twelve broken copies of `scripts/hstack.ts`, each with one guard off, and the tests run on each (`HSTACK_SCRIPT=<copy> bun test tests/hstack.test.ts`). Every copy fails one or more tests of its guard.

| Copy | Tests of its guard that fail (others fail after them, because the tests are one story) | Failing in all |
|---|---|---|
| `approve` ignores the stamp | 'approve refuses a spec the user has not seen' | 8 |
| `approve` ignores the hash | 'approve refuses a spec changed after it was shown' | 3 |
| `spec` ignores changes made since `start` | 'spec refuses when code changed since the run started' | 1 |
| `phase` ignores the missing spec | 'phase refuses while no spec is approved' | 15 |
| the Stop gate ignores the fingerprint of a waiting spec | 'a change made while the spec waits blocks the stop' | 1 |
| the Stop gate does not stamp | 'the stop stamps the wait', and every test that starts a run through the helper | 105 |
| the Stop gate takes the exit for a stale run first | 'a spec shown again in a new session is stamped and can be approved' | 12 |
| `repo` skips the reset of `stop-blocks` | 'repo gives the blocks back: an earlier cap in the code repository does not silence the gate' | 1 |
| `state()` ignores the pointer | 'repo writes the pointer and prints the code repository' and 8 more of the section | 9 |
| the records home is overwritten | 'home is still the records home after a verb has run inside the code repository'; 'start keeps the records home' | 2 |
| `ruled` ignores `record-paths` | 'ruled refuses a changed spec file'; 'ruled refuses when a file outside the records changed' | 2 |
| `phase` accepts a skipped `records` | 'records cannot be skipped' | 1 |

One copy more than the plan listed: the records home overwritten, a guard that the advisor's last review added to Task 1.

### Task 7, run A (2026-11-20, plugin at c65bba6, model `claude-fable-5-2`)

The fixture: a word-count program in Python, one file and one `unittest` test, a README with the test commands, a `.gitignore` for the cache folder, one commit. Evidence: `.evidence/plan-records-2026-11-20/a1.jsonl`, `a2.jsonl`, `state-a/`.

**Turn 1** (48 seconds, 11 turns of the builder, USD 0.58):

1. The last reply holds the spec's text: the request, 12 behaviours each with a number, "Against the record: nothing" with what it looked at, 6 open points each with a proposal, and "Not in this spec". Yes.
2. The builder loaded the notification tool (`ToolSearch`, `select:PushNotification`) and called it with one line. Result: "Not sent — this terminal is active, so your output here already reaches the user". Recorded as it is.
3. No new commit; `docs/specs/2026-11-20-top-option.md` (39 lines) is the only change. Yes.
4. `spec-shown` exists, `phases` is empty. Yes.
5. 0 Stop blocks (`stop-blocks` 0, no block in the transcript). Yes.
6. The SessionStart text of 0.4.0 is in the transcript, outcome "success": the hook found `bun`. Yes.

Seen and not a reading: the builder's first command set `H="bun <path>"` and ran `$H home`; the session's shell does not split a variable into two words, so the command failed, and the builder went on with a shell function. One call lost. The playbook's line on `H` gets a sentence for this after the run.

**Turn 2**, resumed with `Approved.` (8 minutes 52 seconds, 25 turns of the builder, USD 4.88; 4 agents, one each; 0 permission denials; 0 Stop blocks):

1. `phases` holds the ten lines, `spec` first and `records` last; `done` equals HEAD (5fc35a3). Yes.
2. `progress/features.json`: one feature that names the spec, 12 steps for the 12 behaviours, each with one or more tests by file, class and name; every named test is in the test files. All 12 `passes` are true, and `explore.md` has `PASS` for all 12 under `## Verdicts`. Yes.
3. `progress/progress.md`: one entry; it quotes "Approved.", points to the spec and the decisions file, and ends with "Needs your ruling: Nothing". Yes.
4. `oracle-report.md`, `review-1.md`, `explore.md`, `mutants.md` are in the state folder. No agent called the Write tool: each report came back in the reply and the builder stored it with a shell command. No refusal. Yes. No `spec.md` in the state folder.
5. (4b) `docs/specs/` holds the spec, unchanged since its approval commit (4c5ec39), and `2026-11-20-top-option.decisions.md`, whose first line is the one the playbook gives, with the sections `## Entry points` and `## Edges`. In the transcript the two sections were written (the builder's call 8) after `phase oracle` (call 5) and before its first own test file (call 9) and `phase implement` (call 13). Yes, **but one part fails**: of the 10 edges, 4 name a test, 3 say "no test" and why, and 3 say neither (each is decided by what the base already does, or is a behaviour of the spec).
6. The spec, the records, the decisions file and the code are committed in 6 commits (the spec at the approval; the oracle's tests; the feature; a fix from the review; two tests from the mutation step; the records). The tree is clean. Yes.
7. Both turns: 9 minutes 40 seconds, USD 5.46.

Checked by the controller after the run: `python3 -m unittest` gives 25 tests, OK; `--top 2` on `b a b c` prints `2 b`, `1 a`, `total 4`; `--top 0` exits 2 with the error on stderr.

The review found one defect (a valid N of more than 4300 digits was refused) and the builder fixed it with a test first. The state folder has one feedback entry, a `setup-failure` for two unavailable capabilities (type-check, lint), as 0.3.3 would have recorded.

**Two wordings changed after the run, and run A was not made again for them** (a ruling of the executor; a repeat is kept for a failure that stops a run, and run B reads both lines):
- The line on `H` in `skills/build/SKILL.md` and `skills/hstack-feedback/SKILL.md` now says to call the script through a shell function or to write both words out.
- An edge's line now ends with `Test: <file> <test name>` or with `No test: <why>` (`skills/build-implement/SKILL.md` item 2; step 10 item 5 of the playbook adds what is missing).

**Step 7, turn 1 once more with the user's own plugins loaded** (`a3.jsonl`; a fresh clone of the fixture at its first commit; `--setting-sources user,project,local`; 34 seconds, 8 turns, USD 0.32):

- Loaded beside hstack: the user's two skill sets and four more plugins. Three SessionStart hooks ran, each with outcome "success": the two skill sets' and hstack's.
- The first skill invoked: `hstack:build`. No design or plan skill of the other set was invoked.
- The turn ends with hstack's spec ("Before I build anything, I need your approval on this spec"), `spec-shown` is there, `phases` is empty, no commit, and `docs/` is the only change. Nothing was built.
- The notification tool was loaded and called; result "Not sent", as in turn 1 of run A.
- The first command called the script through a shell function, as the changed line on `H` says, and worked at once.
- The spec is shorter than run A's (fewer behaviours, several values in one behaviour), with the other set's "least code" mode active.
- This is one turn that ends at the spec. It says nothing of the steps after the approval, where the other set's own rules for tests, reviews and finishing a branch could pull against the playbook's.

Run A in all: USD 5.78 for three turns (0.58, 4.88, 0.32), and USD 0.14 for the turn without Bun.

### Task 8 (2026-11-20): the copy's routine, drafted; waits for the user

- The draft is `.evidence/plan-records-2026-11-20/copy-routine.md` (not in this repository): a table of each rule kept, changed or removed, the proposed text, and four choices for the user (where a spec is saved, the number of a spec, a failure at the base, when a coverage row is `full`).
- The advisor reviewed it. Its review also found a defect of the script before run B could meet it: `spec <relative path>` was resolved against the code repository when a pointer is followed. Fixed with its test first ('spec takes a path relative to the launch folder, not to the code repository'; 207 pass, 1 skip).
- The playbook gained a fifth role in `records.md`, `other`, for a further record that a project's rules name; the copy keeps reports of each run in a folder.
- Nothing in the copy has changed. Task 9 waits for the user's approval of the draft.

**The user's answers to the draft's four choices (2026-11-20), and what they changed in the plugin:**

1. A spec of the copy is saved in its `docs/design/`. No change in the plugin: the playbook already saves a spec where the project's rules put specs.
2. A step ID of a run is `S<spec>-F<feature>-S<step>`, with a series of its own for specs from 1; the full form is `S<spec>-P<plan>-F<feature>-S<step>`, a level that does not exist is left out, and the IDs written before stay as they are (the user asked why the spec was no level of the ID; it is the real order: spec, plan, feature, step). No change in the plugin: the ID is a rule of the copy's coverage file.
3. A test that already fails at the base: the run records it, goes on, and names it first. One change in the plugin: the log entry and the last reply name it first (step 10 of the playbook).
4. `full` keeps the meaning it has in the source harness, with its two proofs, done by two agents of the loop. Changes in the plugin: the reviewer checks, point by point, that each behaviour's test checks all of it, and writes `## Coverage`; the mutator plants one fault for each behaviour first and writes `## By behaviour`; step 10 sets a `coverage` level for each step (`full` or `partial`), and the default `progress/features.json` has that field. The earlier wording of this choice in the draft was wrong: a test that fails before the code exists shows that it is not empty, not that it checks all of the step.

Run A was made before these changes to the reviewer, the mutator and step 10; run B is their first run.

**Later the same day, three more answers of the user, and what they changed:**

- **The costly suite.** The copy's end-to-end suite runs about 19 minutes. The user's rule: `main` is taken as green; no whole run before the work; the fewest runs; green before anything goes to `main`. For the copy that is one whole run at the end, of the command that runs every test of the suite. In the plugin: step 9 runs whole, whatever the clock, a suite that the project's rules want green before a merge, and again after a later change of code. The earlier claim to the user that setup "already runs the suites" was wrong for this suite: the trial's `capabilities.md` says "probe: not run whole".
- **What `partial` is for.** The user: some steps cannot be checked by code in full, so an agent must check them by hand, for example on a screenshot. The copy's coverage file has 22 such rows ("measured + spot-check"). In the plugin: the reviewer says for each point without an assertion whether code can check it (a finding) or not (`by hand`); the explorer does the hand check with what it saw saved as evidence; the explorer of every run walks the `partial` and `none` steps of earlier work again. This builds the walk of earlier steps that the design had left out.
- **A step that an approved spec replaces, in the copy:** its text is changed, as the copy did before; the playbook now gives way to a project's own rule for it.
- **The default records take the source harness's form** (the user asked why they differed and what made the plugin's form better; nothing did): `progress/feature_list.json`, `progress/test-coverage.md`, `progress/progress.md`. Step 10 of the playbook is written again for three files; a replaced step is reworded on the user's approval, in the plugin as in the copy.
- **What keeps the two files from drifting** (the user's question): a verb of the script, `records-check`, and `phase records` refuses until it has passed on the two files as they are. 12 tests, seen failing first (27 with the helper change), then 219 pass, 1 skip. Run read-only on the copy's own records, several hundred steps: "records agree".
- **The one-off run of the copy's build suite at the base was refused** by the permission check of the controller's session (the command drops the test database and removes a media folder). Not worked around; put to the user.
- **That one-off run is dropped** (the advisor withdrew its own advice): it goes against the user's rule of the fewest runs. If the end run of run B is red, only the red tests are run again on the base branch, to tell the test bed from a regression.

### Run A, made again (2026-11-20, plugin at 6545420; evidence `a4-1.jsonl`, `a4-2.jsonl`, `state-a4/`)

Why again: after the first run A the reviewer got its point-by-point check, the mutator its fault for each behaviour, the records step its three files and its check, and the explorer its hand check and its walk of earlier steps. The fixture this time already has records of an earlier spec (a feature list, a coverage file with its rules, a log), with one earlier step marked `partial` for a point that no code can check.

**Turn 1** (61 seconds, USD 0.66): the spec is titled "Spec 2" (the coverage file has a section for Spec 1); `records.md` lists the four records with their rules; "Against the record" holds one item, found in the earlier log entry and the README (the request says "only the N lines", and the record has a `total` line), marked as an earlier decision of a builder and not a ruling of the user, with three lettered options. No commit; `spec-shown` is there.

**Turn 2**, resumed with "Approved. Against the record: (a)." (12 minutes 27 seconds, 28 turns, USD 6.67; 5 agents: the oracle, the reviewer twice, the explorer, the mutator; 0 permission denials):

1. Eleven lines in `phases` (`review` twice, once a round), `done` equals HEAD. Yes.
2. `records-check` was run by the builder on the two files, not with `--none`; run again by the controller: "records agree: 2 features, 10 steps". Yes.
3. The reviewer's `## Coverage` has one line for each of the 8 behaviours, each with its points, the count ("4 of 4") and the test file with line numbers, in both rounds. Yes.
4. The mutator's `## By behaviour` has one line for each behaviour, each "killed by" a named test. The behaviour that already held at the base ("without the option the output is as today") got its fault in unchanged code ("one line only without the option") and its test caught it. Yes.
5. The explorer's `## Verdicts`: `PASS` for all 8. Its `## Earlier steps` has a line for `S1-F1-S2`, with the evidence file `evidence/S1-F1-S2-columns.txt`: **`FAIL`**. The words do not start in one column when a count has 8 digits or more. The builder found that this was so before its change, changed no code, and listed it under "Needs your ruling" with two options. The notification tool was called at the end with that point. Yes: the walk of an earlier step, the rule for a failure this run did not cause, and the end notification, each seen once.
6. The coverage file has a section `## Spec 2 (…)` with 8 rows, `S2-F1-S1` to `S2-F1-S8`, each `full` with its tests, "points n of n, review round 2", and the fault and the test that killed it. The feature list has the new feature with its 8 steps and `passes` true. Yes.
7. The decisions file is beside the spec with its first line; all 17 edges end with `Test:` or `No test:`. Yes (the wording that the first run showed to be loose).
8. The spec file is unchanged since its approval commit. Yes.
9. Against the first run A: 12 min 27 s for 8 min 52 s, USD 6.67 for USD 4.88.

Not shown by this repeat: the three default files made from nothing (the fixture had records), and the rewording of a replaced step (the user's option kept the earlier decision). Run B is the first run of the second.

Five more broken copies of the script, for the guards added since Task 4, each failing a test of its guard: the records step without a check; a record changed after the check; a missing row ignored; an extra row ignored; `start` drops the evidence folder. `bun test tests/hstack.test.ts`: 220 pass, 1 skip.

Spent so far: USD 13.4 (the turn without Bun 0.14; run A 5.78; run A again 7.33). One repeat is left in the budget.

### Task 9, run B on the trial copy (2026-11-20, plugin at 746bb2d)

The readings in full, with the names of the project's steps, files and texts, are in `.evidence/plan-records-2026-11-20/run-b-readings.md` and `launch-b.md` (not in this repository). Here: what each reading showed, without the project's detail.

Before the run: the copy's outer repository got a branch with the routine of Task 8 in its instructions. The trial's uncommitted log entry was not thrown away: it is a commit on a branch of its own in the copy, and a diff in the evidence folder. `records-check` on the copy's own records printed "records agree". Whole suite of the plugin before the run: 951 pass, 66 skip, 0 fail; `tsc` 0.

**Turn 1** (52 minutes on the clock, about 2 of them work; 15 turns; USD 2.12; 0 permission denials):

1. The builder ran `repo <the code folder>` before `start`; the pointer holds the folder's name, and the run's state folder names the inner git dir. Yes.
2. The spec is in the project's place for specs, with the header its docs rules ask, titled "Spec 1: …". "Against the record" has three items, each with the record's line quoted, whose it is, and lettered options: an earlier acceptance step that the change makes false; a recorded decision of the user against this very change, with the item the log had carried since; and a second earlier step whose words point at the first. The request named none of them. Yes, and one item more than the two that were expected.
3. The notification tool was loaded and called. Result: "Mobile push not sent (Remote Control inactive)". Recorded as it is.
4. No commit in either repository. Yes.
5. Changes in the outer repository: the spec file, the pointer, and a handoff entry in the progress log (item 6). The inner tree is clean. Yes.
6. The copy's own Stop hook let the turn end, waited 50 minutes, and woke the session. The builder then did what the copy's rules say for an open question: it appended a handoff entry to the progress log (not committed) with the three questions and the prompt for the next session. It built nothing. So a `-p` turn that ends with a spec is held for that hook's whole wait in this project.

`records.md` of the run lists seven records with their rules quoted from the copy's instructions: the four roles and three of the role `other`.

**Turn 2**, resumed with an approval that takes the recommended option of each of the three items (54 minutes, 54 turns, USD 14.59; 4 agents, one each; 1 Stop block; 1 permission denial):

1. Ten lines in `phases`; `done` equals the inner HEAD; the inner tree is clean. Yes.
2. The code repository has three commits, of code and tests only: 5 files, +210 −15. The project's own check of the history for traces of an agent prints nothing. Yes.
3. The outer repository has two commits of the run: at the approval (the pointer, the spec, its index and log entries; the spec file has not changed since), and at the end (the feature and its 7 steps; a section for Spec 1 in the coverage file with 7 rows, each `full` with its test, the reviewer's count of points, the planted fault and the test that killed it, and the explorer's verdict; the decisions file beside the spec, 15 edges, each ending `Test:` or `No test:`; the explorer's report; the log entry; two notes of the project that the change made old). **The two earlier steps are reworded on the user's approval, each with its ruling in its coverage row: the first run of that rule.** `records-check` by the builder, and again by the controller: "records agree", one feature and seven steps more than before. The file of the retired init is in no commit. Yes.
4. The gate lists removed lines in three earlier test files; each belongs to an approved item, and `decisions.md` names the items. No `conflicts.md`. Yes.
5. One behaviour of the spec already held at the base; the mutator planted its fault in unchanged code. Yes.
6. **The explorer walked the 18 `partial` steps of earlier work again**, with 105 screenshots, and said what it could not judge. 17 `PASS`; one `UNCLEAR` (a page differs from its mockup). The builder found that this run did not change that page, changed no code, and put it to the user under "Needs your ruling" with the screenshot and two options. The notification tool was called at the end. Yes.
7. The project's long suite ran whole once, at the end, on the last commit of code: all its tests passed, in 18 minutes. No whole run before the work; single files during the build. Yes.
8. The original's list of database names is the same after the run. The 134 tool calls of both turns hold no push, no drop of a database, no skipped commit hook, no path of the original folder, and one probe of four ports. Yes.
9. The Stop block: the builder ended a turn before `final` and `records`; the hook sent it on. The denial: a command that stops the dev server by its PID and then by name; the copy's rule forbids the second, and the permission check refused it. The port is free after the run.
10. Both turns: 106 minutes on the clock (50 of them the wait of the copy's own hook), USD 16.71.

**The four checks of the design** after run B: the script's tests and the broken copies (1); a project with no records, two turns (2: met by the first run A in the earlier form of the records; in the form the user then chose, by the last run below); the copy from the outer folder (3); a request that names no record and goes against it (4).

**Spent to this point:** USD 30.1 of the 40. No repeat was needed for run B.

### Task 10 (2026-11-20): the review of the whole branch, and one fix pass

One reviewer in a fresh context read the design, this plan, the executor's rulings, the whole script, the tests and the agent texts, and reproduced each finding on the script in scratch repositories. Its count: Critical 0, Important 11, Minor 13. Each Important finding was fixed with a test seen failing first; `bun test tests/hstack.test.ts` after the pass: 238 pass, 1 skip, 0 fail.

| Finding | What could happen | The fix | Its test |
|---|---|---|---|
| `approve` did not look at the code repository | The user commits while a spec waits; the run's base is then older than their commit, and the gate and the reviewer judge their work as the run's | `approve` refuses when the repository changed since `spec` | 'approve refuses when the code repository changed while the spec waited' |
| A second `start` in the middle of an approved run | A way out of the loop: `start`, a new `spec`, and the turn may end with half-built code | `start` refuses an approved, unfinished run of this session; a new session may start another | 'start refuses an unfinished approved run of this session' |
| `repo <path>` in the middle of a run, and for a folder inside a repository | The pointer moves the state folder and the gate looks away from the run; a subfolder made every pathspec relative to itself | `repo` refuses once a run is started in the launch folder, and takes only the top of a repository | 'repo refuses while a run is started in the launch folder'; 'repo refuses a folder inside the code repository' |
| The records step was not tied to the run | Any two files that agree passed, at any time: empty ones, or the records as they were before the run | `phase records` comes after `final`; in a run, one feature must name the approved spec; `done` checks the two files again | 'phase records refuses until final is recorded'; 'records-check refuses when no feature names the approved spec'; 'done refuses when a record changed after the check' |
| `records-check` passed a step with no row | Two sections with one number, or a row under another section | Both are reported | 'two sections with the same head are reported'; 'a row under another section than its own is reported' |
| A waiting spec blocked a question in a new session | After the user changed the repository, three blocks told the agent to undo changes that are not its own | A run of an earlier session is judged by what this session changes, in the waiting case too | 'a waiting spec of an earlier session lets a stop through when this session changed nothing' |
| `spec --drop` left a run that then blocked | Following the text for "other work" ended in a block | `spec --drop` ends the run; the texts say to delete the spec file first | 'a spec dropped for other work ends the run, and the stop goes through' |
| The feedback checks did not know the records home | In the two-repository layout a description with the outer folder's path or name could be drafted for a public issue | The records home is in the list of paths and of names | 'a description with the path of the records home is refused, and its folder name gives the warning' |
| A verb typed in a subfolder | `gate` printed no removed line; `ruled` refused a change of a record | Every verb works from the top of the code repository | 'gate from a subfolder reports a removed line' |
| The session-start text told the agent to run `approve` itself | It skipped the playbook's steps at the approval, and a later `start` moved the approved run away | The text sends the message to step 1 of the playbook | 'the session-start text sends an approval to the playbook, and never tells the agent to run approve by itself' |
| The reviewer's rule for a changed test said "listed", the playbook "approved" | An item where the user kept the earlier behaviour would have let a weakened test pass | The reviewer's text says approved, and how to read which option the user took | 'the reviewer passes a changed test only for an item the user approved' |

Two Minor findings were taken into the pass, because the user writes Vietnamese and a file name may hold it: `spec` refused a spec file whose name has a space or a letter outside ASCII, and `records-check` refused such a path ('spec accepts a spec file with a space and a non-ASCII letter in its name'; 'records-check accepts a spec path with non-ASCII letters'). The playbook's three git commands without `-C` got it.

Six older tests start a run a second time in one session; each now begins a new session first, which is what the new rule asks.

**Run B was made before this pass.** It met none of the fixed cases: the pointer was written before `start`, nothing changed while the spec waited, the records step came after `final`, and its feature names the approved spec. It was not made again.

**Deferred, for the user to decide** (the reviewer's Minor findings and its "declined to judge"):

- With no `git` on the `PATH` both hooks stop with a stack trace (the sh script printed its text and let the stop through).
- `ruled` does not see a test file that was renamed into a record path.
- A pointer written by hand with `..` in it is followed.
- The checks for "nothing built before the approval" compare which files changed, not their content: a file that was already changed before `start` can be changed further unseen.
- A turn that runs a feedback verb and shows a spec is not stamped; one more turn is needed.
- `records-check` reads no row in the full ID form (`S1-P2-F1-S1`) and does not check a `plan` named beside a `spec`.
- In a project with one repository, the playbook says "commit all changes" for the code and "by path" for the records, and a file the user had changed before the run is committed with the run's work.
- The playbook calls the records home "the folder this session started in"; the script takes the top of that folder's repository.
- A builder can call the Stop hook itself and so stamp its own spec in one turn. The design takes this as not checkable.

After the pass the whole suite found one defect more: two runs moved to `old/` in the same second shared one folder, and the second wrote over the first. Fixed with its test ('two runs moved away in the same second keep a folder each'); `bun test tests/hstack.test.ts`: 239 pass, 1 skip, 0 fail.

The fixed `records-check`, run read-only on real records: on the copy's own after run B, with a scratch state folder and again with a copy of run B's state folder (so that the approved spec is known), and on the fixture of the second run A. "records agree" each time.

### The last run (2026-11-20, plugin at 76772a6): a project with no records, after the fix pass

A bare clone of the fixture at its first commit: no records, no spec folder. Evidence: `a5-1.jsonl`, `a5-2.jsonl`, `state-a5/`, `fixture-a5.bundle`.

- **Turn 1** (41 seconds, USD 0.56): "Spec 1", 8 behaviours; no commit; the spec stamped.
- **Turn 2**, resumed with "Approved." (10 minutes 15 seconds, 25 turns, USD 5.29; 0 permission denials; 0 Stop blocks): ten steps recorded, `done` equals HEAD, the tree clean, 42 tests pass.
  - **The three default files were made from nothing**: `progress/feature_list.json` (one feature with `description`, `spec`, 8 steps, `passes` true), `progress/test-coverage.md` (it starts with its rules; a section `## Spec 1 (…)`; 8 rows `S1-F1-S1` to `S1-F1-S8`, each `full`), `progress/progress.md`.
  - The builder ran `records-check` on the two files: "records agree: 1 features, 8 steps"; the controller's run of it agrees.
  - The decisions file is beside the spec.
  - No verb of the script refused anything on this path: the guards of the fix pass do not stand in the way of a normal run.

**The four checks of the design are met**: (1) the script's tests and the broken copies; (2) this run; (3) and (4) run B.

**Spent in all:** USD 35.96 of the 40: the turn without Bun 0.14; run A 5.78 (with the turn that loads the user's plugins); run A again 7.33; run B 16.71; the last run 5.85. Runs: A, A again, B, and this one.

**Rulings at the end:** the plan's workspace under `.superpowers/` is not deleted, though the executing skill says to: it is an ignored folder of this repository, and the user's rule forbids deleting those. The branch is not merged, not pushed and not squashed: all three are the user's.

**For the merge:** commits a36a182 and a094075 of this branch hold run B's readings with names of the client project's steps and files; 72ae40c took them out of the files. A squash merge keeps them out of the history of `main`; the branch must then not be pushed as it is.
