---
type: plan
title: "Plugin lock plan"
description: "Prereg step 12: record arm W's plugin (hstack 9c4b267, the designer's removal-only variant of H 653af83) in arms.json, probe it in the trial boxes, and lock the plugin commits of H and W, the model IDs, the CLI and N = 24 with an amended manifest; no change from here."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-11T19:55:33+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-11T19:57:04+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: trial
    resource: /plans/2026-11-08-bench-trial.md
  - id: phase-b
    resource: /plans/2026-11-10-bench-trial-phase-b.md
---

# Plugin Lock Implementation Plan

> **For agentic workers:** every task here is the controller's (real data, the token, the box). No implementer or reviewer subagent gets the token, `<data>` write paths or real data. No `bench/` or `tests/` file changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 12: "Lock: the plugin commits of arms H and W, the model IDs, N. No change from here." Arm W enters `arms.json`, is probed in the box, and the lock pins H, W, the models, the CLI and N, with a manifest of `<data>` that step 13 compares against.

**Spec:** prereg section 3 (the arms: W = H with the reviewer in its own context, the independent oracle and the gate against weakened tests off; the builder reviews itself; "the stick's canary"), section 12 steps 12–13, "Applied at step 11" rulings 2 (plugin entries), 3 (sealing of this session), 11 (the amended stick lock) and decision 4 (what reaches the designer), "Decided by the user on 2026-11-11" (the token kept); `progress/step11-lock.md` (open points for step 12); `progress/step11a-lock.md` (open points for step 13).

## What is locked

| item | value | source |
|---|---|---|
| H | `hstack`, commit `653af835fd613e3eb25feb48e4ccc9bfb534ae6e`, paths `.claude-plugin agents hooks scripts skills`, 21 files, sha256 `727d6781…1843`, dependencies none | `arms.json` since step 11 B1; pinned by `refs/bench/plugins/hstack-653af83` |
| W | `hstack`, commit `9c4b267a11f9553533ad2fa882acc2e6bdebd0b8` (branch `plugin-w`), the same paths, 19 files, sha256 `03b4fd1233b202fcb2047ea0c872ebe748b658d68b71f31d1e33b2061e1b1bae` (computed 2026-11-11 by the controller), dependencies none | the designer's handover of 2026-11-11; pinned by `refs/bench/plugins/hstack-9c4b267` (local) |
| model | `claude-opus-5-5` (H, B, W); small model `claude-sonnet-5-5` | `arms.json`; every trial run's `models` and `probeModels` read `claude-opus-5-5`, `fallback` null |
| CLI | 2.1.318 (`arms.json` `cli` `arm/claude-2.1.318`) | the trial records' `version` |
| N | 24 | `trial/report.json` (step 11) |

W's name equals H's (`hstack`), so `probeOk` checks W's init the same way; the run record's `plugins` (name, commit, sha256) tells the arms apart. Controller check at the handover: `9c4b267` descends from `653af83` and `git diff --stat 653af83 9c4b267 -- <paths>` touches 5 files (+18/−92), as the designer said. Whether W removes exactly section 3's three parts is the designer's statement; this session does not read plugin content to judge it (ruling 3).

## Facts recorded at the handover (for the user's decision 1)

- The trial's results request came from a session named "Hstack benchmark step 7 plan" (socket `34956`); W's handover from a session named `bridge-cse-01jxvnal2dkzabg9quunay5e-de` (socket `69613`), both saying they are the plugin-design session.
- `git worktree list`, 2026-11-11: the worktree `.claude/worktrees/bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E` (the one step 11 Phase A's controller ran in: its scripts import `bench/` from there) now has branch `plugin-design` checked out at `d859667`.
- `plugin-design` moved past `653af83` by 2 commits (`9a91143`, `d859667`) that change no exported path; H stays `653af83`.
- Later on 2026-11-11 the user said the plugin-design session is closed and its branch merged: `main` = `dfdbe0a` ("Merge the hstack plugin v0.2 (H, 653af83) and its design records", pushed; `plugin-design` is in `main`, so `653af83` is reachable from `main`). It adds the plugin folders, `plugin-dev/` and a README change, and touches no `bench/`, `tests/`, `progress/` or prereg file. `plugin-w` (`2b14f26`, holding `9c4b267`) is on `origin` and not merged; W stays pinned by its local ref.

## Decisions for the user (asked with this plan)

**Answered by the user on 2026-11-11:** decision 1: the plugin-design session was a new session the user started (in that worktree), not the Phase A controller's conversation continued ("session desgin kia là tôi chạy ở session mới"). The roles stayed apart; nothing is listed for step 14 on this. Decisions 2 and 3: (a) each, by the user's "Theo advisor suggestions" of 2026-11-11, which also approved this plan.

1. **Who designed the plugin.** Section 12 step 10 and ruling 3 of step 11 keep the controller and the designer apart. The plugin-design session runs in the worktree step 11 Phase A's controller used. Only you know whether it is a new conversation started in that folder or the Phase A controller's conversation continued. **(a) Recommended:** you say which; the lock records the observation and your answer, and the plugin lock does not close (Task 3) until the answer is in. If it is the same conversation, it is listed for step 14; this plan redoes nothing.
2. **How much W runs before the lock.** W has never run end to end (the designer's local smoke run was refused by its own permission classifier). The prereg's step 12 runs nothing. **(a) Recommended:** the probe of Task 2 only (init loads `hstack`, no web tool, no `AskUserQuestion`, under the box's `bypassPermissions`), on the 4 trial boxes as step 11 B1 did; W's first full runs are step 13's. (b) As (a) plus one W run on s3-02 (the shortest trial task, about 25 minutes) as a smoke test of the Stop gate in the box. Cost: it leaves `results/s3-02-W-1.json` and a `bench/s3-02-W-1` branch, and `trial/floor.json` covers only H and B, so step 13's plan must add a W floor or that run counts as W's first scored run on a seen task; a listed deviation. (a) is recommended because a W that fails in the box shows in step 13 as W's score, which is what H4 reads anyway.
3. **The token.** Kept by your decision of 2026-11-11. **(a) Recommended:** Task 2 uses the token in `<data>/arm/box.env`; it is revoked when you say so, then `rm`, unread.

## Global Constraints

As the Phase B plan's: branch `bench-step12` from `main` (`dfdbe0a`, rebased from 8954c11); `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench`; logs in `<data>/logs/step12/`; every full test run teed to `<data>/logs/step12/tests-<n>.out`; sealing as step 11 (count lines, record fields, no transcript, product, grade output, oracle or check); Docker removal only by recorded names, never `-f`; pgsnap around every real-estate box. This session takes no design request and writes no plugin content; the designer session is closed, and nothing is sent to a designer in this step.

---

### Task 0: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, "Applied at step 12 (<date>)" after "Decided by the user on 2026-11-11, at the step 11 lock"), `docs/log.md`

- [x] **Step 1:** Write the paragraph: the decisions as answered; W's entry (commit, paths, sha256, pinned by a local ref); the probe of Task 2 (and the run of decision 2 (b) if chosen); the manifest and compare of Task 3 with `progress/step12/reasons.tsv`; "no change from here" as Task 3 step 4 states it; and that `arms.json` `plugins.W` is set only after this paragraph is committed. Commit before any write to `arms.json`.

### Task 1: W in arms.json

**Files:**
- Modify (gitignored): `<data>/arms.json` (`plugins.W`)
- Create (gitignored): `<data>/logs/step12/arms-before.json`, `plugin-export-w.out`, `arms-check.out`

- [x] **Step 1:** Export W through `pluginExport` outside `<data>`: expect files 19 and the sha256 above; a different value stops for the user.
- [x] **Step 2:** Copy `arms.json` to `logs/step12/arms-before.json`; set `plugins.W` to `[{ "name": "hstack", "repo": "../..", "commit": "9c4b267a11f9553533ad2fa882acc2e6bdebd0b8", "paths": [".claude-plugin", "agents", "hooks", "scripts", "skills"], "sha256": "03b4fd12…" }]` (full hex); nothing else changes. `loadArms` accepts it; each arm's loaded entry exports to its recorded sha256 (H's unchanged).
- [x] **Step 3:** The designer session is closed, so nothing is sent; the lock states that W is recorded, with the sha256. Record in `progress/progress.md` ("Step 12"). Commit.

### Task 2: W's probe

**Files:**
- Create (gitignored): `<data>/logs/step12/plugin-probe-w.mjs` (step 11's `plugin-probe-h.mjs` with the arm a parameter), `p.sh`, `p.out`

- [ ] **Step 1:** One W box per trial task (s2-01, s3-02, p8b, p6c), one `Reply OK.` turn under `bypassPermissions`, web tools off, 1800 s, `probeOk('W', initInfo(out), ['hstack'], [])`; one count line per task. pgsnap around p8b and p6c. Expected: every line `turn exit 0 plugins ["hstack"] web 0 askUser 0 probe ok`; anything else stops for the user, and its reason (a run reason, not a score) goes to the user, not the designer.
- [ ] **Step 2 (decision 2 (b) only):** `run-arm` with arm W on s3-02 through `env/box/s3-02.json`, its number above the trial floor; its record's `status`, `machine` and turn codes to the user; no grade read.
- [ ] **Step 3:** No probe container, proxy or image left. Record; commit.

### Task 3: The lock

**Files:**
- Create: `progress/step12/reasons.tsv`, `progress/stick-v1-step12.sha256`, `progress/step12-lock.md`
- Modify: `docs/log.md`, `docs/plans/index.md`, `progress/progress.md`

- [ ] **Step 1:** `progress/step12/reasons.tsv`: `arms.json\tstep 11 B1 recorded plugins.H, step 12 Task 1 plugins.W`. Commit it before the hash.
- [ ] **Step 2:** `bun bench/stick.mjs hash --out <scratchpad>/stick-v1-step12.sha256`, copied to `progress/`; `compare progress/stick-v1-step11.sha256 --reasons progress/step12/reasons.tsv`. Expected: changed 1 (`arms.json`), missing 0, unexplained 0; the trial's and the probes' files new. Anything else stops for the user.
- [ ] **Step 3:** Suite teed, pristine; `git status --short bench tests` empty.
- [ ] **Step 4:** `progress/step12-lock.md`: the table above as locked (H, W, models with their source, CLI, N), the manifest's sha256 and counts, W's probes, the content of `<data>/logs/step11b/handover.md` (now stated, since the plugin is locked), decision 1's observation and answer, the token's state, and step 13's carry-overs: the `grade --reuse` key (grade mode, `rebuild.json` sha, runner sha), s1-11's make, the three accepted minors of step 11, M3's open tasks, a CLI or model change between step 12 and step 13 (prereg step 13: "same model and CLI version"; a change is recorded and B is not reused). "No change from here": any later change to an `arms.json` entry, a pinned commit or the manifest's files outside step 13's outputs stops for the user.
- [ ] **Step 5:** Advisor review, then the user's approval; this plan `stable` with a `human:` verified entry in the same commit; merge and push as the user asks.

## Known limits

- **W is the designer's removal of three parts;** that it removes exactly those is not checked by this session (it reads no plugin content).
- **W's first full run is step 13's** under decision 2 (a); a W that cannot run in the box shows there as W's score, which H4 reads.
- **The trial tasks and their scores are seen by the designer** (4.2 ruling 13), and W was built after the trial.
- **The token is not revoked** (the user's decision of 2026-11-11).

## Not in this plan

Any run but Task 2's; any change to `bench/`, `tests/`, a plugin, an oracle or a score rule; step 13's plan (the scored runs, its order and its fixes).
