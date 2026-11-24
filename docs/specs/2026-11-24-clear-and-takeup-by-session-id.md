---
type: spec
title: "Spec 11: a /clear keeps the session's run by a mark the session leaves, approve and takeup know which session calls them, two texts on the time and the start text's line; 0.4.7"
description: "A fix of what a review after the run of spec 10 found, built into the unreleased 0.4.7. A fifth hook, run when a session ends, leaves a mark when the session is cleared, and the start hook of the clear hands the old id's runs to the new id only by that mark; with no mark, a start hook that is not a startup names an unfinished run of another session in its work tree and the command that takes it up. `approve` and `takeup` read the calling session's id from the environment, trusted only for a session that came to the run's work tree, so a take-up or an approval is never undone by which session's hook came last. Two sentences on the time in the step 4 skill and the start text's line that asks for the command again are reworded."
status: stable
generated: { by: claude-code, at: "2026-11-24T23:40:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-25T00:00:12+07:00" }
sources:
  - id: spec-10
    resource: /specs/2026-11-24-claude-worktree-hook-folder-readme.md
  - id: spec-10-decisions
    resource: /specs/2026-11-24-claude-worktree-hook-folder-readme.decisions.md
---

# Spec 11: a /clear keeps the session's run by a mark the session leaves, approve and takeup know which session calls them, two texts on the time and the start text's line; 0.4.7

## 1. The request

The user typed `/hstack:build` with these words:

> sửa quy tắc /clear và khe hở take-up theo review sau run spec 10 (dùng SessionEnd reason clear và CLAUDE_CODE_SESSION_ID), kèm hai câu về thời gian trong skills/implement và câu đòi gõ lại lệnh ở đầu session

## 2. Agreed in the brainstorm

**Why.** Spec 10 is built on `main` as 0.4.7 and is neither pushed nor installed. After its run, a review of the two commits no reviewer had read (44559e6 and c134d72) found, and reproduced in scratch repositories:

- Critical: a `/clear` typed in the terminal of the session a run was taken from (by `takeup`), or of the session that wrote a spec another session approved, gives the run back to the cleared session's new id, and the session that took it up or approved it is let go (the review's scenes K1, K2, K3). The cause: decision E20 of spec 10 hands the run of the work tree to the new id when `came` is empty, and an empty `came` does not show who clears.
- Important: a `/clear` of a session that only came to another session's work tree gives it that run (scene K0).
- Important: with commit 44559e6, a hook of the earlier owner between another session's coming and its `takeup` cancels that take-up (scene S44). Both rest on the verbs not knowing which session runs them, so the loop guesses by "the last to come".

The review, verbatim, and copies of its scratch reproductions lie in the run's state folder, `evidence/2026-11-24-claude-worktree-hook-folder-readme/` (`review-after-run.md`, `review-after-run-r3/`). Two more points were left for a ruling after the run, and the user had them built here: the two sentences of the step 4 skill that still say "as wide as the time allows", against spec 10's rule "Time.", and the start text's line for a waiting spec ("If the user answers it without that command, tell them to type it"), which made an agent ask for the command again after the user had typed it.

**Probed before the spec** (Claude Code 2.1.331; the evidence is `probe-after-run-session-ids.md` in the same folder):

- In `claude -p` and in an interactive session (run inside tmux and driven by keystrokes from the builder's session): `/clear` runs `SessionEnd` with `"reason":"clear"` and the old `session_id`, then `SessionStart` with `"source":"clear"` and the new `session_id`; both hooks have the same `CLAUDE_PID` in their environment. In an interactive session the whole session is one process: `CLAUDE_PID` stays the same across the clear. In `claude -p` each invocation is a process of its own.
- A `SessionEnd` hook written with `bun`, that reads its input and writes a file, finished at the clear and at the exit; in two clears in a row the start hook of the clear ran about 35 ms after it had written. A `SessionEnd` hook that slept 3 s never finished, at the clear or at the exit: the hook must do its work at once.
- The Bash tool's environment holds `CLAUDE_CODE_SESSION_ID`, equal to the hooks' `session_id`, and it follows the new id after a clear.
- `UserPromptSubmit` runs for a message `/hstack:build …`, with the message and the `session_id`.
- The builder's own shell holds `CLAUDE_CODE_SESSION_ID` and `CLAUDE_PID`, and most test files copy the environment when they run the script: an id from the environment is trusted only for a session that came to the run's work tree, and tests set or remove both variables.

**Goals.**

- A session that is cleared in the middle of its run keeps the run, and no other session's run ever passes to it.
- A take-up by name, and an approval, give the run to the session that typed them, whatever hooks of other sessions ran in between.
- When a run cannot be handed over, the session is told of it and of the command that takes it up.
- The step 4 skill says nothing of the time; the start text does not ask for the command again after the user typed it.

**Not a goal.** Two sessions working on one run at the same time. A shared record of runs across machines. The push of `main`, the closing of issues 10 and 11, the update of the installed plugin: on the user's word after the run. The version stays 0.4.7, which is not released.

**A failure, even if it works.** A run passes to a session that did not run it, did not take it up and did not approve it. A take-up or an approval is undone by a hook of another session. A session's run is let go and the session is not told. A test is green in a Claude Code session and red in a plain terminal, or the other way round.

**Approaches.** Two were put to the user.

1. A mark per process: a new `SessionEnd` hook, at a clear, writes the old id in a small file named by `CLAUDE_PID` and does nothing else; the start hook of the clear, in the same process, reads it, removes it, and hands the old id's runs, in every work tree of the repository, to the new id. `approve` and `takeup` read `CLAUDE_CODE_SESSION_ID`. The builder's pick.
2. No hand-over at a clear: only a notice, and the user types `/hstack:build <the spec's name>` after each clear. `approve` and `takeup` read the id as in 1.

The advisor: 1; 2 is 1's branch with no mark. The user: "Theo suggestin" (to 1, with the five points below).

**What the user decided of the how** (the advisor's points, the user: "Theo suggestin").

- The `SessionEnd` hook only writes the mark, at once: no git, no search of work trees. With no `CLAUDE_PID` in its environment it writes nothing, and a start hook with no `CLAUDE_PID` hands nothing over.
- The mark is used once: the start hook of the clear removes it; a start hook with `"source":"startup"` removes the mark of its own `CLAUDE_PID`, so that a later process with the same number takes nothing.
- One rule of notice: a start hook whose source is not `startup`, in a work tree that holds an approved run of another session that is not finished, names that run's spec, the steps not recorded and the command `/hstack:build <the spec's name>`. It covers a clear with no mark, a fork, and a resume of an older conversation after a clear.
- The sessions that came to a run's work tree are kept in one list per run, in place of `came`: a session comes by any of its hooks judging the work tree, and by its worktree hook for `EnterWorktree` with that work tree's path. `approve` and `takeup` trust `CLAUDE_CODE_SESSION_ID` only when that id is in the list; with no such variable, or an id not in the list, they decide as before (the session that came last, unless the owner's own hook came after it), and that is a limit, written as such.
- The two texts on the time and the start text's line, in the words the builder proposed (behaviours 19 to 21); the version stays 0.4.7.

**Two questions of the second reader, and the user's answers.** A second agent read this spec as the builder who must plan it; two questions went to the user, with the advisor's picks, and the user: "Ok theo suggestion".

- A run that another session's `startup` in its work tree made an earlier session's (`stale`) while its owner file still names its session. Example put to the user: A runs the loop in W; the user opens a terminal C in W only to look; C's start makes A's run an earlier session's, and A's stop hook no longer holds it. Decided: `takeup` called by the run's owner takes such a run back (the code already lets anyone take up an earlier session's run; refusing the owner would let the run go untold); `takeup` refuses only when the caller is the owner and the run is not an earlier session's (behaviour 17). A mark does not hand such a run over at a clear: a clear changes the id, not the run's state; the cleared session is not held, it is told of the run and of `/hstack:build <the spec's name>` (behaviour 14); taking it back is a take-up the user types.
- How the explorer checks the review's scenes again: by replaying the hooks, with the inputs of the probes' logs and both variables set in every command, on the real script, for K0 to K3 and S44 (their order of hooks cannot be steered in real sessions); and by two real interactive sessions run in tmux with the plugin loaded from the repository: the owner's own clear (behaviour 3), and K1 (a take-up, then a clear in the terminal of the session the run was taken from).

**This run** (the user: "Theo suggestion", to the advisor's pick). No step is skipped or cut short for the time: the marks at 150, 180 and 210 minutes, the caps of the steps and the agents' deadlines of the installed playbook 0.4.6 do not apply; one item of work is tried at most three ways, then written down for the user's ruling. A fix made after review round 2 that touches whose run it is (`owner`, the list of sessions that came, `stale`, the hand-over) gets one more reading by a reviewer before step 7. The explorer of step 7 walks spec 10's steps S10-F1-S33 and S10-F1-S34 again, with the review's scenes K0 to K3 and S44, by replaying the hooks on the real script (inputs as the probes logged them, `CLAUDE_CODE_SESSION_ID` and `CLAUDE_PID` set in every command) and, for the owner's own clear and for K1, by real interactive sessions with the plugin loaded from the repository; step 10 writes its verdicts in the rows S10-F1-S33 and S10-F1-S34 of `progress/test-coverage.md`, and sets `passes` of spec 10's feature in `progress/feature_list.json` to true when both verdicts are `PASS`, false otherwise. This is a step of the run, not a behaviour of the product: no test of the oracle checks it.

**Left to the builder.**

- The verb of the `SessionEnd` hook; where the mark is kept, its file's name and form.
- The file and the form of the list of sessions that came; how the order "the last to come" is kept in it for the case with no trusted id; what becomes of `came` in a run that 0.4.7 of spec 10 started.
- Whether a waiting spec (not yet approved) of the old id also passes at a clear.
- The exact words of the notice, of the start text's line, of `README.md` and of `CLAUDE.md`.
- How the earlier tests named in section 4 are brought to the new behaviour.

## 3. Behaviours

The hooks are the script's verbs that `hooks/hooks.json` names, each reading the hook's JSON on its standard input. **The end hook** is the command of the entry `SessionEnd`. A hook's environment holds `CLAUDE_PROJECT_DIR`, and `CLAUDE_PID` where Claude Code sets it; the verbs `approve` and `takeup` are run by the agent, whose environment may hold `CLAUDE_CODE_SESSION_ID`. A session **holds** a run when its stop hook, with a `cwd` in the run's work tree, prints `{"decision":"block",…}` with a reason that holds `steps not recorded`; a session **does not hold** it when that stop hook prints nothing. "A run of A" is an approved run that is not finished and belongs to session A as spec 10 says. Unless a behaviour says otherwise, every command of a behaviour runs with `CLAUDE_CODE_SESSION_ID` and `CLAUDE_PID` set as the behaviour says, and removed when it does not name them.

The end hook and the clear:

1. `hooks/hooks.json` holds an entry `SessionEnd` whose command is `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts"` followed by one verb, and still holds the entries `SessionStart`, `UserPromptSubmit`, `PreToolUse` and `Stop`.
2. The end hook exits 0 and prints nothing, with no input, with input that is not JSON, and with any `reason`.
3. With a run of A in a work tree W: after the end hook with `"reason":"clear"`, session A and `CLAUDE_PID` P, and then the start hook with `"source":"clear"`, session N and `CLAUDE_PID` P, N holds the run and A does not; and the worktree hook of N refuses the tool. This holds whether the start hook's `cwd` is in W, in the project's folder or in no git repository.
4. In the scene of behaviour 3, when the end hook's `cwd` is in another work tree of the repository than W, or in no git repository, N still holds the run.
5. With a run of A in W: when the end hook ran with `CLAUDE_PID` P and the start hook of the clear runs with `CLAUDE_PID` Q, or when either of them runs with no `CLAUDE_PID`, N does not hold the run and A still does.
6. With a run of A in W: after the end hook with a `reason` that is not `clear` (for example `prompt_input_exit` or `other`), session A and `CLAUDE_PID` P, the start hook with `"source":"clear"`, session N and `CLAUDE_PID` P hands nothing over: N does not hold the run.
7. The mark is used once: after behaviour 3's hand-over to N, a second start hook with `"source":"clear"`, session M and `CLAUDE_PID` P, with no end hook between, hands nothing to M: N still holds the run and M does not.
8. After the end hook with `"reason":"clear"`, session A and `CLAUDE_PID` P, a start hook with `"source":"startup"`, `CLAUDE_PID` P and a `cwd` outside W removes the mark: a later start hook with `"source":"clear"` and `CLAUDE_PID` P hands nothing over.
9. Scene K1 of the review: A's run in W is taken up by session B (B's prompt hook in W, then `takeup` in W with `CLAUDE_CODE_SESSION_ID` B); then the end hook with `"reason":"clear"`, session A, `CLAUDE_PID` P, and the start hook with `"source":"clear"`, session N, `CLAUDE_PID` P: B still holds the run, and neither A nor N holds it.
10. Scene K2: session w writes and shows a spec; session x's prompt hook runs in its work tree and x approves it (`approve` with `CLAUDE_CODE_SESSION_ID` x); then w is cleared (end hook `clear`, session w, `CLAUDE_PID` P; start hook `clear`, session N, `CLAUDE_PID` P): x still holds the run and N does not.
11. Scene K0: with A's run in W, B's prompt and stop hooks run in W, A's prompt hook runs in W, and then B is cleared (end hook `clear`, session B, `CLAUDE_PID` P; start hook `clear`, session N, `CLAUDE_PID` P): A still holds the run, and neither B nor N holds it.
12. A start hook whose `source` is not `startup` (`clear`, `resume`, `compact` or `fork`), of a session that does not own the run, in a work tree that holds an approved run of another session that is not finished and is not an earlier session's, prints a text that names the run's spec, the steps not recorded and `/hstack:build` followed by the spec's name.
13. After behaviour 5's clear with no hand-over, where N's start hook ran with a `cwd` in W, `takeup` in W with `CLAUDE_CODE_SESSION_ID` N takes the run up: N holds it and A does not.
14. With A's run in W made an earlier session's by another session's start hook with `"source":"startup"` in W: after the end hook with `"reason":"clear"`, session A, `CLAUDE_PID` P, and the start hook with `"source":"clear"`, session N, `CLAUDE_PID` P, `cwd` in W, N does not hold the run, and the text that start hook prints names the run's spec and `/hstack:build` followed by the spec's name.

Which session calls `approve` and `takeup`:

15. Scene S44: with A's run in W, session x's start hook with `"source":"startup"` and its prompt hook run in W, then A's prompt hook runs in W, then `takeup` in W with `CLAUDE_CODE_SESSION_ID` x takes the run up: x holds it and A does not, also after another prompt hook of A in W.
16. Session B's worktree hook for `EnterWorktree` with W's path counts as B coming to W: with A's run in W and no hook of B with a `cwd` in W, `takeup` in W with `CLAUDE_CODE_SESSION_ID` B takes the run up, and B holds it.
17. `takeup` in W, with `CLAUDE_CODE_SESSION_ID` set to a session that came to W, after the run's last step with no commit since: when the run is A's and is not an earlier session's, it refuses with `the run is this session's` for the caller A, and takes the run up for a caller B (B holds it, A does not); when another session's start hook with `"source":"startup"` in W has made the run an earlier session's, it takes the run up for the caller A (A holds it again) and for a caller B (B holds it, A does not).
18. `approve` and `takeup` with a `CLAUDE_CODE_SESSION_ID` that no hook brought to the run's work tree decide as without it: in the scenes of spec 10's behaviours 33 and 34 and of its builder's tests R1-1, R1-2 and R2-1 (`tests/claude-worktree-hook-folder-edges.test.ts`), run with such an id, the session that holds the run is the one that holds it with no id set.

The texts:

19. Item 6 of `skills/implement/SKILL.md` holds `every suite whole that the capabilities allow before step 9`, and no longer holds `the widest suite the time allows`.
20. `skills/implement/tdd.md` holds `as wide as the capabilities allow`, and no longer holds `as wide as the time allows`.
21. The text that the start hook prints while a spec waits no longer holds `If the user answers it without that command, tell them to type it`; it says that once the user has typed `/hstack:build` in the session, their next message is the answer, with no command.
22. The README's status paragraph holds `Five hooks` and no longer `Four hooks`; its paragraph on a machine where `bun` is not on the `PATH` holds `five hooks` and no longer `four hooks`; the row of `hooks/` in its table of paths names `SessionEnd`; and `CLAUDE.md`'s part on the hooks names the end hook and says that a cleared session keeps its run.
23. `.claude-plugin/plugin.json` still holds `"version": "0.4.7"`, and the README's status paragraph still starts with `**Status: v0.4.7.**`.

## 4. Against the record

Each of these is a step the user approved or a decision of a builder; the user chose each change in the brainstorm (section 2).

Spec 10 (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.md`):

- S10-F1-S32: "The README's status paragraph holds `Four hooks` and no longer `Three hooks`; its paragraph on a machine where `bun` is not on the `PATH` holds `four hooks` and no longer `three hooks`; the row of `hooks/` … names the `PreToolUse` hook beside the three others; and `CLAUDE.md`'s part on the hooks names the fourth hook …". A step the user approved. Now five hooks (behaviour 22); the `PreToolUse` hook and the fourth hook stay named. Its tests: `tests/claude-worktree-hook-folder-texts.test.ts` "32: …" (three tests).
- S10-F1-S51: "The folder `skills/implement/` holds the twelve files that `skills/build-implement/` held, with the texts they had …". A step the user approved. Two sentences change (behaviours 19 and 20); the folder and the other ten files stay. Its test: `tests/claude-worktree-hook-folder-texts.test.ts` "51: …", whose hashes of `SKILL.md` and `tdd.md` change.
- Decision E20 of spec 10's builder (`docs/specs/2026-11-24-claude-worktree-hook-folder-readme.decisions.md`): "at a start hook with `clear`, the run of the work tree it judges passes to the new id when it is started, not done, not `stale`, has an owner, and no other session came to it". Replaced: a run passes only by a mark of the session that owns it, and never a run that is an earlier session's (behaviours 3 to 11, 14). Its tests: `tests/claude-worktree-hook-folder-edges.test.ts` "E20: a clear of the run's own session: the new id gets the run" (it sends no end hook) and its three controls.
- Decisions E9, E10, E14 and the design lines of spec 10 on `came`, `meet` and `handOver`: `came` is replaced by the list of sessions that came; with no trusted id the result is the same (behaviour 18). Their tests stay as they are and keep passing.
- Spec 4 (`docs/specs/2026-11-22-turn-reference.md`), S4-F1-S22 and S4-F1-S23, whose words spec 10 changed to `Four hooks` and `four hooks`: now `Five hooks` and `five hooks`. Their tests: `tests/turn-reference-texts.test.ts` "22: …" and "23: …".
- `tests/turn-reference-edges.test.ts` "E18: the usage line names hook-prompt": the usage line still ends with `hook-start|hook-prompt|hook-stop`.

Spec 9 (`docs/specs/2026-11-23-build-on-demand.md`), S9-F1-S3: the start text while a spec waits "says that the user takes it up with `/hstack:build` and the spec's name". Kept: behaviour 21 changes only the line on an answer given without the command.

## 5. Open points

None.

## 6. Not in this spec

- A session that opens a work tree where another session's run goes on (its start with `startup`) makes that run an earlier session's, as spec 9 decided: the run's own session is then no longer held and is not told. Its owner takes it back with `/hstack:build <the spec's name>` (behaviour 17). Not fixed here.
- Two sessions working on one run at the same time; a run whose sessions never set `CLAUDE_CODE_SESSION_ID` (a shell outside Claude Code) keeps the guess by the last to come.
- A record of runs shared by several machines; feedback issue 12.
- The push of `main`, the closing of issues 10 and 11, the update of the installed plugin.
- The number of holds of the stop hook's cap; the limits in minutes that spec 10 kept (5 minutes of whole runs at the base, 10 minutes of base checks, `whatever the clock`).
