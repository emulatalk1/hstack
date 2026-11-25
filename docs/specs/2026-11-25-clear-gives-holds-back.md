---
type: spec
title: "Spec 12: a /clear gives the handed-over run its three holds back; 0.4.8"
description: "A fix of a gap that a live test of the released 0.4.7 found: the stop hook's count of holds is set back to zero only at a startup or a resume, so a session that used its three holds before a /clear was no longer held after it, though spec 11 handed it its run. Now each run or waiting spec that a clear hands to the new id gets its three holds back. The version becomes 0.4.8."
status: stable
generated: { by: claude-code, at: "2026-11-25T07:00:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-25T07:00:07+07:00" }
sources:
  - id: spec-11
    resource: /specs/2026-11-24-clear-and-takeup-by-session-id.md
  - id: spec-11-decisions
    resource: /specs/2026-11-24-clear-and-takeup-by-session-id.decisions.md
---

# Spec 12: a /clear gives the handed-over run its three holds back; 0.4.8

## 1. The request

After the release of 0.4.7, the builder reported from a live session with the installed plugin: "a `/clear` does not give the stop hook its three holds back (only a startup or a resume does), so a session that used them before the clear gets no hold after it". The user answered:

> Fix the clear

## 2. Agreed in the brainstorm

**Why.** Spec 11 made a `/clear` hand the session's run to its new id, so that the run goes on being held. But the stop hook holds a run at most three times, and the count is set back to zero only when a process starts (a startup or a resume), never at a clear, which runs in the same process. In the live test the session had used its three holds before the clear, and after it the run was not held at all. The cap is there so that an agent never loops; a `/clear` is typed by the user, as a resume is, and `takeup` already gives the holds back when a run is taken up.

**Goal.** Each run, and each waiting spec, that a clear hands to the new id (by the mark of spec 11, in any work tree of the repository) gets its three holds back.

**Not a goal.** Holds given back at any other moment; the number three.

**A failure.** A clear that gives holds back to a run it did not hand over (a run of another session, a run of an earlier session, a clear with no mark); a compaction that gives holds back.

**Approaches.**
- (Picked) Give the holds back to the runs the clear hands over, where the hand-over is made. Same rule as `takeup`.
- Every `/clear` sets the count of its work tree to zero, as a startup does: it would give holds to a run that is not the clearing session's. Dropped.
- Raise the cap above three: the gap stays, only later. Dropped.

**The user decided** ("Theo suggestion", to the advisor's suggestion):
- the version becomes 0.4.8, so that `claude plugin update` takes the fix; the earlier steps that pin 0.4.7 take the new number (section 4);
- only the clear is fixed now; the wider gap is in section 6;
- the flag a feedback verb leaves for one turn (`pass`) is not touched at a clear;
- a waiting spec handed over at a clear gets its count back too;
- `CLAUDE.md` says that a `/clear` gives the holds back.

**Left to the builder.** Where in the script the count is set back.

## 3. Behaviours

The scenes are those of spec 11: session A, the cleared session's new id N, one process `CLAUDE_PID` P; "the clear" is the end hook with `"reason":"clear"` (session A, P), then the start hook with `"source":"clear"` (session N, P). Every hook's `cwd` is W unless a behaviour says otherwise. "Held" means the stop hook prints `{"decision":"block",…}`; "three holds used up" means the stop hook has held that run's turn three times, so that the next stop of its session is not held.

1. With an approved, unfinished run of A in a work tree W and its three holds used up: after the clear, N's stop in W is held, three times, and the fourth stop is not held.
2. With an approved, unfinished run of A in another work tree W2 of the same repository and its three holds used up, while the end hook, the start hook and N's stops have their `cwd` in W: after the clear, N's stop is held by the run in W2, three times.
3. With a spec of A that waits for approval in W, a change of the repository made after the spec was shown, and A's stop held three times for it: after the clear, N's stop in W is held.
4. A clear with no mark (the start hook with `"source":"clear"` and no end hook before it), beside A's run in W with its three holds used up: the count is not given back; A's next stop in W is not held.
5. A start hook with `"source":"compact"` of A, with its three holds used up, gives none back: A's next stop in W is not held.
6. `CLAUDE.md` holds `A stop gate that refuses to end an unfinished run of this session (at most 3 times per process; a /clear gives them back).`, and no longer holds `(at most 3 times per process).`
7. `.claude-plugin/plugin.json` holds `"version": "0.4.8"`, and the README's status paragraph starts with `**Status: v0.4.8.**`.

## 4. Against the record

The version, in eight steps the user approved, each with a test that pins `0.4.7`; each takes `0.4.8` and keeps the rest of its words (behaviour 7):

- S2-F1-S40, S6-F1-S43, S8-F1-S13 and S10-F1-S43: "`.claude-plugin/plugin.json` holds `"version": "0.4.7"`, and the README's status paragraph starts with `**Status: v0.4.7.**` and [still] holds the words `brainstorm` and `grilled`."
- S3-F1-S7 and S4-F1-S21: "`.claude-plugin/plugin.json` holds `"version": "0.4.7"`, and the README's status paragraph starts with `**Status: v0.4.7.**`."
- S7-F1-S11 and S11-F1-S23: "`.claude-plugin/plugin.json` still holds `"version": "0.4.7"`, and the README's status paragraph still starts with `**Status: v0.4.7.**`."
- Their tests: `tests/brainstorm-texts.test.ts` "40: …", `tests/script-call-and-dir-rule.test.ts` "7: …", `tests/turn-reference-texts.test.ts` "21: …", `tests/design-before-code-texts.test.ts` "36: …", `tests/design-follow-ups-texts.test.ts` "11 …", `tests/last-reply-step-lines-and-log-texts.test.ts` "13: …", `tests/claude-worktree-hook-folder-texts.test.ts` "43: …", `tests/clear-and-takeup-by-session-id-texts.test.ts` "23 …".

Decision E1 of spec 4's builder (`docs/specs/2026-11-22-turn-reference.decisions.md`, ruled by the user on 2026-11-22): "In the same process every later stop is silent anyway (`stop-blocks`); when a resume gives the holds back, what was held is held again". Narrowed: in the same process, a clear that hands a run over gives that run its holds back too (behaviours 1 to 3). The rest of E1 stands, and its test, `tests/turn-reference-edges.test.ts` "E1: the silent stop past the cap does not end the run: …", is not changed.

The comment in `scripts/hstack.ts` "a new process gets its blocks back; a compaction inside one does not" stays true; a clear is added beside it. Spec 4 left the cap of three holds per process out of its scope; the number stays.

## 5. Open points

None.

## 6. Not in this spec

- Holds used up before an approval are not given back at the approval, nor at a new message of the user: in the live test the count was already past three after `approve`, before any clear, and the run was then not held for the rest of the process.
- The number of holds.
- The push of `main` and the update of the installed plugin.
