---
type: decision
title: "Decisions of the builder: Spec 12, a /clear gives the handed-over run its three holds back"
description: "What the builder decided alone while building spec 12: the entry points, seven edges (a clear from another work tree, the flag pass, a second cap, two clears in a row, a resume, holds left, a run of another session), the design (the holds go back in clearHandOver only), the eight earlier tests that took 0.4.8, and the equivalent mutants."
status: draft
generated: { by: claude-code, at: "2026-11-25T08:00:00+07:00" }
sources:
  - id: spec
    resource: /specs/2026-11-25-clear-gives-holds-back.md
---

Decided by the builder while building docs/specs/2026-11-25-clear-gives-holds-back.md. Not approved by the user.

# Decisions of the builder: spec 12, a /clear gives the handed-over run its three holds back

## Entry points

- The start hook (`hook-start`, entry `SessionStart` of `hooks/hooks.json`) with `"source":"clear"`, after the end hook (`hook-end`, entry `SessionEnd`) left a mark: `clearHandOver` in `scripts/hstack.ts`, the one place a clear hands runs over.
- The stop hook (`hook-stop`), which reads the count `stop-blocks` beside the run it judges, here or in another work tree.
- `CLAUDE.md`, the agent's reference: the line on the stop gate.
- `.claude-plugin/plugin.json` (`version`) and the README's status paragraph: the version.

## Edges

- E1. A clear whose start hook's `cwd` is in another work tree of the repository than the run (oracle's open edge 1): the hand-over of spec 11 is made for every work tree of the repository, and the holds go back where the hand-over is made, so the run in W gets its holds back when the start hook's `cwd` is in W2. Outside any repository no hand-over is made (spec 11, E11), so no count changes. Test: tests/clear-gives-holds-back-edges.test.ts "E1: a clear whose hooks have their cwd in W2 gives the holds back to the run in W that it hands over: …"
- E2. The flag `pass` at a clear: not touched (the spec, section 2, "the flag a feedback verb leaves for one turn (`pass`) is not touched at a clear"). No test: the base already leaves it at a clear, and this run does not touch the line that removes it.
- E3. A second cap after the clear records a second `intervention` entry of the feedback ledger, as a second cap after a resume does at the base (the stop hook records one entry each time the count reaches the cap). No test: the base decides it, by the same code after a resume.
- E4. Two clears in a row in one process (A to N, then N to M, each with its mark): each hand-over gives the holds back again; M is held three times. Test: tests/clear-gives-holds-back-edges.test.ts "E4: two clears in a row in one process, each with its mark: …"
- E5. A resume after a clear: the base gives the holds back at every resume. No test: the base decides it.
- E6. A handed-over run with holds left (one or two used): the count goes back to zero, three holds again, as `takeup` does (`wr(stop-blocks, 0)`). No test: the same write as behaviour 1; behaviour 1's test fails if the count is not set to zero.
- E7. The run of another session, or a run of an earlier session (`stale`), beside the clear: not handed over, so its count is not changed (the spec, "A failure"). Test: tests/clear-gives-holds-back.test.ts "edge (A failure): a clear of A gives no holds back to the run of another session B in W2 …" (the oracle's).

## Design

Project rules for how code is written: none written (CLAUDE.md and README.md describe the hooks and the scripts, not how code is written).

- `scripts/hstack.ts`, `clearHandOver`: after `giveRun(dir, to)`, write `0` to `${dir}/stop-blocks`. The rule "a clear's hand-over gives the holds back" lives there and nowhere else. Not in `giveRun`, which `handOver` (approve, takeup) also calls: an approval gives no holds back (the spec, section 6), and `takeup` writes its own zero beside its other resets.
- The comment above the startup/resume reset in `hook-start` names the clear's hand-over as the third place the holds come back.
- `CLAUDE.md`: the line on the stop gate as behaviour 6 quotes it (no backticks around `/clear`, as the spec's quoted line has none).
- `.claude-plugin/plugin.json` and the README's status paragraph: 0.4.8. The eight earlier tests that pin 0.4.7 take the new number (the spec, section 4).

## Earlier tests changed under the items approved in "Against the record"

- The eight tests that pinned `0.4.7` now pin `0.4.8`, every other word kept (the gate's REMOVED lines of `gate.txt`, all of them): `tests/brainstorm-texts.test.ts` "40: …" (S2-F1-S40), `tests/script-call-and-dir-rule.test.ts` "7: …" (S3-F1-S7), `tests/turn-reference-texts.test.ts` "21: …" (S4-F1-S21), `tests/design-before-code-texts.test.ts` "36: …" (S6-F1-S43), `tests/design-follow-ups-texts.test.ts` "11 (holds at the base, and must stay): …" (S7-F1-S11), `tests/last-reply-step-lines-and-log-texts.test.ts` "13: …" (S8-F1-S13), `tests/claude-worktree-hook-folder-texts.test.ts` "43: …" (S10-F1-S43), `tests/clear-and-takeup-by-session-id-texts.test.ts` "23 (guard: the base already has it): …" (S11-F1-S23), with its section comment. Item: the version, spec 12 section 4 (behaviour 7).

## Mutation

- Survivors M3 and M15 (`mutants.md`): equivalent, as the mutator shows. M14 (the guard `startedAt` dropped from `clearHandOver`, a guard spec 11 wrote): judged equivalent in what a user sees: a finished run is never held and never named by a start text, so handing it to the new id changes only its owner file, which no verb shows for a finished run. No test.
