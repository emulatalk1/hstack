---
type: decision
title: "Decisions of the builder: Spec 11, a /clear keeps the session's run by its mark, approve and takeup by the calling session"
description: "What the builder decided alone while building spec 11: the entry points, twelve edges with the test of each (where the mark lies, what a clear hands over, the list of sessions that came, the calling session, the notice), the earlier tests changed under the items the user approved, and the design with its corrections after two review rounds, the exploratory test and a focused reading. Not approved by the user."
status: draft
generated: { by: claude-code, at: "2026-11-25T03:45:08+07:00" }
sources:
  - id: spec
    resource: /specs/2026-11-24-clear-and-takeup-by-session-id.md
---

Decided by the builder while building docs/specs/2026-11-24-clear-and-takeup-by-session-id.md. Not approved by the user.

# Decisions of the builder: spec 11, a /clear keeps the session's run by its mark, approve and takeup by the calling session

## Entry points

- `hooks/hooks.json`: a new entry `SessionEnd`, command `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts" hook-end`; the four entries of before stay.
- `scripts/hstack.ts`: the new verb `hook-end`; `hook-start` (the clear's hand-over by the mark, the removal of a startup's or a resume's mark, the notice beside another session's run, the waiting spec's line); `meet` and the worktree hook (the list of sessions that came); `approve` and `takeup` (the calling session's id from `CLAUDE_CODE_SESSION_ID`); the usage lines.
- `skills/implement/SKILL.md` item 6 and `skills/implement/tdd.md` (the two sentences on the time).
- `README.md` (status paragraph, the paragraph on `bun` and the `PATH`, the row of `hooks/`), `CLAUDE.md` (its part on the hooks).

## Edges

- E1. Where the mark lies: one file per process, `<the state root>/clear/<CLAUDE_PID>`, holding the old session id; the state root is the one every state folder lies in (`HSTACK_STATE`, or `~/.hstack`), so that the end hook needs no repository. It is written only for `"reason":"clear"`, a `session_id` that is a string, and a `CLAUDE_PID` made of digits only (a name of a file). Anything else: nothing is written, nothing printed, exit 0, as the prompt and worktree hooks do. Test: tests/clear-and-takeup-by-session-id.test.ts "2: …", "5: …" and "6: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "E10: …".
- E2. What the clear hands over: every state folder of the work trees of the repository that the start hook judges (its own and those `git worktree list` gives) whose run is started and not done, is not an earlier session's (`stale`), and whose owner is the old id; a spec that waits counts too (a waiting spec is the same session's work). The mark is removed whether or not anything passed. Test: tests/clear-and-takeup-by-session-id-edges.test.ts "E2: a spec that waits, of the cleared session, goes to its new id: …" and "E2: two clears in a row in one process: …"; tests/clear-and-takeup-by-session-id.test.ts "14: …" (never an earlier session's run).
- E3. A startup and a resume each remove the mark of their own `CLAUDE_PID`: both start a process, so a mark of that number is of an earlier process. Test: tests/clear-and-takeup-by-session-id.test.ts "8: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "E3: a resume removes the mark of its own process number: …".
- E4. The list of sessions that came (`seen`, one id per line, in the order of their last coming): a hook with an id that judges the work tree of a started, unfinished run moves its id to the end; so does the worktree hook for `EnterWorktree` with that work tree's path, when it lets the tool run. "The session that came last" of spec 10 is the last line when it is not the owner. Test: tests/clear-and-takeup-by-session-id.test.ts "16: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "R1-3: …".
- E5. A run of spec 10's 0.4.7 with a `came` file and no `seen`: its `came` is read as the one line of the list; the next coming writes `seen` and removes `came`. Test: tests/clear-and-takeup-by-session-id-edges.test.ts "E5: a run of spec 10 with a file came and no list: …".
- E6. The calling session of `approve` and `takeup`: `CLAUDE_CODE_SESSION_ID` when it is one of the list; else none, and they decide as spec 10 did (the session that came last, unless the owner came after it; with none and an earlier session's run, the owner is removed and the next hook with an id claims it). Test: tests/clear-and-takeup-by-session-id.test.ts "17: …" and "18 (guard): …"; tests/clear-and-takeup-by-session-id-edges.test.ts "R1-3: …".
- E7. `takeup` refuses when the calling session is the owner and the run is not an earlier session's; with no calling session, as before (not stale, and no other session came last). Test: tests/clear-and-takeup-by-session-id.test.ts "17: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "R1-1: after a clear hands the run over from the project's folder, …".
- E8. After `approve` or `takeup` the new owner is moved to the end of the list: no session came after it. Test: tests/clear-and-takeup-by-session-id-edges.test.ts "R1-1: …" (both).
- E9. The notice of behaviour 12 is printed for the run of the work tree the start hook judges; the runs of the other work trees are named by spec 10's text for other work trees. Test: tests/clear-and-takeup-by-session-id.test.ts "12: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "M-X13: …" and "M-X14: …". The other work trees: No test of this run: spec 10's behaviour 36 and its test name them.
- E11. The mark is handled before the repository is looked at: a startup or a resume drops its process's mark, and a clear takes it, even when the hook's project is no git repository (the exploratory test, finding 1). Test: tests/clear-and-takeup-by-session-id-edges.test.ts "X1: …".
- E12. Only the worktree hook for `EnterWorktree` with a path counts as coming to that work tree; `ExitWorktree` with a path does not (the exploratory test, finding 3). Test: tests/clear-and-takeup-by-session-id-edges.test.ts "X3: …".
- E10. An end hook with `"reason":"clear"` and no `CLAUDE_PID`, or a start hook of a clear with none: no mark, no hand-over (spec section 2). Test: tests/clear-and-takeup-by-session-id.test.ts "5: …"; tests/clear-and-takeup-by-session-id-edges.test.ts "M-X9: …" and "M-X15: …".

## Design

The project's own rules for how code is written: none in a file of their own; `CLAUDE.md` and `README.md` say what the scripts and hooks do.

`scripts/hstack.ts` stays one file. The rule of whose run it is keeps one home, beside `meet`, `handOver` and `ownedBy`:
- `seenOf(dir)` reads the list (and an old `came`), `cameOf(dir)` gives the session that came last when it is not the owner, `callerAt(dir)` the calling session from the environment when the list holds it. `meet` writes the list; `handOver()` (approve and takeup) gives the run to the calling session, else to the one that came last, as before.
- The mark has its own two functions, `markClear(id)` (the end hook) and `takeClear()` (the start hook: read and remove), and `clearHandOver(old, id, dirs)` gives the old id's runs to the new id. The end hook calls only `markClear`: no git, no state(), so that it ends at once.
- The notice and the waiting spec's line are texts of `hook-start`, beside the texts there.

The texts: the step 4 skill's two sentences, the README and CLAUDE.md; hooks.json gets its fifth entry.

Corrections after review round 1 (the lines above stand as first written): the clear's hand-over was first written inline in `hook-start`, and wrote the owner without moving it in the list (finding 1); it is now `clearHandOver(old, to, dirs)`, and both hand-overs go through one function, `giveRun(dir, to)`. `startedAt(dir)` is the one test of a started, unfinished run (a spec that waits counts), for `meet` and the clear. The owner comes back in the list only by a hook that judges its work tree (finding 3).
After the focused reading of eac8fd1: `inputField(input, k)` reads one field of a hook's input, for the end hook's `reason` and the worktree hook's `tool_name`; the reads of spec 10's run stay as they were (outside this change).

## Earlier tests changed under the items approved in "Against the record"

- `tests/claude-worktree-hook-folder-edges.test.ts`, the table of "E20: …": its first case, "a clear of the run's own session", now sends no end hook and expects no hand-over (its name says so, and `handed: false`). Item: decision E20 of spec 10's builder, replaced (spec 11, behaviours 3 to 11, 14); the hand-over with a mark is checked by the oracle's behaviour 3.
- `tests/claude-worktree-hook-folder-texts.test.ts` "32: …" (the status paragraph and the paragraph on `bun`): `Four hooks` and `four hooks` became `Five hooks` and `five hooks`. Item: S10-F1-S32 (behaviour 22).
- `tests/claude-worktree-hook-folder-texts.test.ts` "51: …": the hashes of `SKILL.md` and `tdd.md` are those of the new texts. Item: S10-F1-S51 (behaviours 19 and 20).
- `tests/turn-reference-texts.test.ts` "22: …" and "23: …": `Four hooks` and `four hooks` became `Five hooks` and `five hooks`. Item: S4-F1-S22 and S4-F1-S23 (behaviour 22).

## Rulings after the run

- 2026-11-25, on the user's word ("Theo suggestion", to the advisor's suggestion for each):
  - The test "R1-3 (behaviour 34): …" of `tests/claude-worktree-hook-folder-edges.test.ts`, which reads `CLAUDE_CODE_SESSION_ID` from the shell: left as it is. A real Claude Code id is never "A", and outside Claude Code the variable is not set. A later change that touches that file removes the session variables from its commands, as spec 11's tests do.
  - The planted fault M14 (the owner file of an earlier session's run can name another session): accepted as equivalent in what a user sees; every reader checks `stale` first. Nothing is built for it.
