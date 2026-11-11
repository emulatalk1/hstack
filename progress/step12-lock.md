# Step 12 lock: the plugin

Written 2026-11-11 by Task 3 of `docs/plans/2026-11-11-bench-plugin-lock.md` (status `draft` until the user approves). Rulings: prereg section 12, "Applied at step 12" (rulings 1–6, ruling 4 changed for the new token). Branch `bench-step12` from `main` (`dfdbe0a`); nothing pushed. `<data>` = `.evidence/bench`.

Every number comes from count lines in `<data>/logs/step12/` (`plugin-export-w.out`, `arms-check.out`, `p.out`, `attempt-1/p.out`, `control.out`, `control-2.out`, `hash.out`, `self.out`, `compare.out`, `tests-1.out`), from run record fields, or from `trial/report.json`. No transcript, product, grade output, oracle or check was opened, and no plugin content was read beyond file lists, `hooks/hooks.json` and the counts below.

## Locked

| item | value |
|---|---|
| H | `hstack`, commit `653af835fd613e3eb25feb48e4ccc9bfb534ae6e`, paths `.claude-plugin agents hooks scripts skills`, 21 files, sha256 `727d67815bf9445672d37a52738f7729a04cee1e0383256c107f60130c271843`, dependencies none; in `main` since `dfdbe0a`; local pin `refs/bench/plugins/hstack-653af83` |
| W | `hstack`, commit `9c4b267a11f9553533ad2fa882acc2e6bdebd0b8`, the same paths, 19 files, sha256 `03b4fd1233b202fcb2047ea0c872ebe748b658d68b71f31d1e33b2061e1b1bae`, dependencies none; on `origin/plugin-w` (`2b14f26`, not merged); local pin `refs/bench/plugins/hstack-9c4b267` |
| models | `claude-opus-5-5` (H, B, W), small model `claude-sonnet-5-5` (`arms.json`); every step 11 trial run's `models` and `probeModels` read only `claude-opus-5-5`, `fallback` null |
| CLI | 2.1.318 in the box (`arms.json` `cli` `arm/claude-2.1.318`, a Linux arm64 build; the trial records' `version`) |
| N | 24 (`trial/report.json`, step 11) |
| `arms.json` | as above plus `turnTimeoutSec` (external 14400, real-estate 28800) and the proxy form of step 11 (`authorization`, beta `oauth-2025-04-20`, `ANTHROPIC_AUTH_TOKEN`) |

**No change from here** (ruling 6): after this lock, a change to an `arms.json` entry, a pinned commit, or a manifest file outside step 13's own outputs stops for the user; a CLI or model change before step 13 is recorded and B is not reused.

## The manifest

`bun bench/stick.mjs hash`: files 25,171 (left out: link 47, node_modules 1, store 1,315, secret 8, transcript 222, rewritten 88, special 0). Manifest `progress/stick-v1-step12.sha256`, sha256 `1220a5ff92e001a50046d6c97469798fef6fbbfcc78f4c758cbdf6e91e146349`, written outside `<data>` and copied in. Self-compare: hashed 25,171, equal 25,171. Against `progress/stick-v1-step11.sha256` with `progress/step12/reasons.tsv`: hashed 24,911, equal 24,910, **changed 1 (`arms.json`, explained), missing 0, unexplained 0**; new files 260 (the trial's records, grades and `trial/`, the step 11b and step 12 logs). A first hash wrote its own count output into `logs/step12/` while hashing, so its self-compare showed that file changed; it was removed and the hash run again with its outputs outside `<data>`; only the second manifest is kept.

Recheck: `HSTACK_BENCH_MACHINE=<data>/machine.json bun bench/stick.mjs compare progress/stick-v1-step12.sha256`.

## W's entry and probes (Tasks 1–2)

- W's export: files 19, sha256 as handed over and as computed by the controller at the handover. `loadArms` accepts `arms.json`; H's and W's loaded entries each export to their recorded sha256.
- **First probe attempt** (`attempt-1/`): s2-01, s3-02, p8b each `turn exit 1 plugins ["hstack"] web 0 askUser 0`; the driver was stopped (ruling 3), p6c not probed. An H control on s3-02 (registered before it ran) exited 1 the same way. A host check (registered before it ran; the host CLI, 2.1.322, since the box's binary is a Linux build) read the account message "You've hit your weekly limit · resets 6pm (Asia/Saigon)": the kept token's account had used its weekly limit (after the step 11 trial). W was not implicated.
- **The user gave a new setup-token** (20:20 +07); `box.env` overwritten (mode 600, never printed); registered as a change to ruling 4. H control on s3-02: `turn exit 0 … probe ok`.
- **Second attempt:** s2-01, s3-02, p8b, p6c each `turn exit 0 plugins ["hstack"] web 0 askUser 0 probe ok`; PGSNAP equal around p8b and p6c (both attempts); no probe container left. No W run before step 13 (decision 2 (a)).

## The designer

- The plugin-design session was a new session the user started in the worktree step 11 Phase A's controller had used (the user's answer to decision 1); the roles stayed apart. It closed after merging `plugin-design` into `main` (`dfdbe0a`).
- What reached the designer in steps 11–12: the 8 per-task and per-arm trial lines (decision 4 (a), σ_d withheld) and one line "W not recorded yet" with W's sha256. Nothing in step 12 after the session closed.
- **The handover note of step 11** (`<data>/logs/step11b/handover.md`), now stated since the plugin is locked: 6 lines in 2 skills of H's export (`skills/hstack-init/SKILL.md` 2, `skills/hstack-safety/SKILL.md` 4) run `bun "${CLAUDE_PLUGIN_ROOT}/scripts/*.mjs"`, and no trial box's recipe installs `bun` (`node:22.20.0-bookworm`, `rust:1.98.1-bookworm`, `node:24-bookworm`); the box adds no runtime for any arm. W's export has the same 6 lines. `hooks/hooks.json` runs only `sh` (SessionStart, Stop). What H or W does when such a line fails is their measured behaviour.

## Checks at the lock

- Suite `tests-1.out`: 638 pass, 64 skip, 0 fail, pristine; `git status --short bench tests` empty.
- Docker: no probe container or proxy left; `bench-arm/proxy:1` and `bench-arm/fw:1` kept.
- Git housekeeping at the user's request: merged branches and two clean worktrees removed (see `progress/progress.md`); kept `main`, `bench-step12`, `plugin-w`, the step 7 branch `worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E` (18 commits not in `main`) and both pin refs. Scripts in `<data>/logs/step11/` that import `bench/` from the removed Phase A worktree are records and no longer run as written.

## Deviations (listed for step 14)

1. **The token was replaced** during step 12 (the old one hit the account's weekly limit); neither the old nor the new token is revoked; both went through this session's transcript.
2. **The host check printed one account message** (55 characters, a usage-limit notice that names no task) beyond the registered fields (exit code, `type`, `subtype`, `is_error`, status number), to read its reset time.
3. **W was never run end to end before the lock** (decision 2 (a)); its first full runs are step 13's.

## Open points for step 13

- **Usage limits:** the step 11 trial (8 runs) used the old token's weekly limit. Step 13's runs (H, B, W on 24 external and 9 real-estate tasks, k per section 10) need far more; its plan must register how the token's limits are met (more accounts, pacing by the reset, or an API key) and treat a limit hit as `machine` (step 8 ruling 11), checked by a host check like this one.
- **The `grade --reuse` key** (grade mode, `rebuild.json` sha, runner sha), s1-11's nondeterministic make, M3's open tasks, the three accepted minors of step 11 (`listens()`, P OOM behind O's timeout, `--extra-round`) (Phase A and step 11 locks).
- **W's floor:** step 13's counting needs a floor or slot for W like `trial/floor.json` for H and B.
- **The CLI on the host auto-updates** (2.1.322 now); the box's binary stays 2.1.318 unless a plan changes `arms.json`.
- **H4 reads W against H;** that W removes exactly section 3's three parts is the designer's statement, not checked by the controller.

## Known limits

- The trial tasks and their scores are seen by the designer (4.2 ruling 13); W was built after the trial.
- σ_d from 4 tasks at k = 1 is rough; N never drops below 24.
- The tokens are not revoked (the user's decisions of 2026-11-11).
- The step 11 and Phase A limits stand.
