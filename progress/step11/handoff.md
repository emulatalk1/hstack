> **Done (2026-11-10).** Phase A is locked and approved: see `progress/step11a-lock.md`. This handoff is kept as the record of the 2026-11-10 session start; do not resume from it.

# Step 11 Phase A: handoff (2026-11-10)

Continue building `docs/plans/2026-11-08-bench-trial.md` (Phase A) in this worktree, branch `bench-step11`, subagent-driven. Do not merge or push.

## Where things stand

- **Done and reviewed:** Tasks 1–11 and 12a–12d (code), the proxy probe (Task 4), the proofs (Task 11), the make survey, the rebuild rounds, and the third full regrade (Task 12). Every code task passed its task review; commits are on `bench-step11` (head at the time of writing: see `git log`).
- **The SDD ledger** is `.superpowers/sdd/2026-11-08-bench-trial/progress.md` (gitignored, in this worktree). Read it first: it holds every ruling, every deferred minor, the user's decisions and the regrade results. Tasks with a `complete` line are done.
- **Regrade (Task 12) result:** 70 of 75 grades equal to the locks (`<data>/logs/step11/regrade.lines`, compare with `bun <data>/logs/step11/regrade-compare.mjs <data> [task]`). Differences, classified content-free: s2-08 one oracle check flaky (equal on its repeat); p8a d1ea76b-T13 and p8e eb2b016-T7 need the network at run time (equal with the app container networked); p8e a9c2377-T15 differs in the container either way; s3-08's product cannot be rebuilt offline to match its end (3 sealed rounds).
- **The user's decisions of 2026-11-10** ("Theo đề xuất"): (A) the three private-set checks leave the score by section 7.1, as a listed deviation; (B) s3-08 leaves the H1–H4 set as not gradeable offline, so H1's N is 19 and the s3 walk needs 3 tasks with step ids (s1 needs 2); (C) M3 is recorded as closed only where split mode holds.
- **Grade modes:** `ext/tasks/<slug>/grade-mode` = `shared` for s1-01 s1-03 s1-05 s1-07 s2-01 s2-02 s2-05 s2-07 s2-08 s2-10; none for the private set (`ext/tasks/real-estate/grade-mode` must stay absent: the set shares one slug).
- **Token:** `<data>/arm/box.env` holds the user's setup-token (mode 600, never print it); `arms.json` has `proxy: { auth: authorization, betas: [oauth-2025-04-20], cliVar: ANTHROPIC_AUTH_TOKEN }` and `turnTimeoutSec: { external: 14400, re: 28800 }`. Keep both for Phase B; the token is revoked at the step 11 lock.

## What remains (Phase A)

1. **Apply decisions (A) and (B):** register them in the prereg's "Applied at step 11" block as deviations with reasons (the 3 checks out by 7.1; s3-08 out of H1–H4; H1's N 19; per-stack walk targets s1 +2, s3 +3), and make the scored sets reflect them by a registered, mechanical change (e.g. verdicts or `step.json` ids with a reason), each changed hashed file listed in `progress/step11/reasons.tsv`.
2. **Task 13, the walk:** per the plan (ruling 10, decision 5): s1 until 8 kept tasks with step ids (+2), s3 until 8 counting without s3-08 (+3). Copy the step 5 drivers (`ext/step5-*.sh`) to `<data>/logs/step11/` re-pointed at this checkout; every walked task gets `box-env`, the step 5 pipeline under this branch's `oracle-run`, `rebuild` when its make fails offline, the reader via `oracle queue --tasks … --out <data>/step11/queue` and `human.mjs … --queue`, `oracle step`, `seed`, `kills`; list walked tasks in `<data>/step11/walked.txt`.
3. **Task 14, the lock:** the amended stick hash and compare (ruling 11; `stick hash --out` never inside `<data>`), `progress/stick-v1/tasks-step11.tsv`, the "Amended at step 11" paragraph in `progress/step10-lock.md`, `progress/step11a-lock.md` (carry-overs and how each closed, the proofs, the regrade table, the decisions, deviations, known limits, usage), usage per task in `progress/progress.md`, the SDD ledger copied there, the whole-branch review on the most capable model, then ask the user to approve Phase A.

## Lessons from this session (do not repeat)

- One Docker job at a time. Two at once gave BuildKit `ResourceExhausted` and false make failures.
- Never SIGTERM the regrade driver mid-grade: it leaves a worktree in `/tmp/hstack-bench` that refuses every later grade. Stop the driver loop only and let the running grade end.
- The driver's shared-mode fallback writes `grade-mode` per slug; for the private set (one slug) remove it at once.
- Never read sealed logs, not even through an agent: classify failures content-free (exit codes, file names, a networked or offline repeat of a trusted end).
- In zsh, `set -- $var` does not split words: run such loops under `bash -c`.
- `rebuild` validates by make exit only; a check result at the regrade is what proves a product.
