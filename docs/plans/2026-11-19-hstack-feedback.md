---
type: plan
title: "hstack-feedback plan"
description: "A small skill and a `feedback` subcommand of hstack.sh: when the user finds a problem with hstack, the skill writes it up as an issue that can be fixed from (a description plus fixed fields from the run), shows the exact text and posts it to GitHub only after the user's yes; the build loop also records each stumble locally; a collect command lists the open issues."
status: stable
generated: { by: claude-code/2.1.327, at: "2026-11-19T10:28:18+07:00" }
verified:
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T10:52:00+07:00" }
  - { by: human:emulatalk1, at: "2026-11-19T11:09:12+07:00" }
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T12:47:14+07:00" }
  - { by: human:emulatalk1, at: "2026-11-19T13:08:38+07:00" }
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T13:39:35+07:00" }
---

# hstack-feedback Plan

> Built natively in one session, test-first, on branch `hstack-feedback` from main. Every step below is done.

**Goal:** when the user finds a problem with hstack on a real project (a bug, something to update, something to enhance), the skill collects what the problem is and posts it to `emulatalk1/hstack` as an issue someone can fix from, with no customer content in it; the open issues can be listed by phase and kind and closed by the fixing commit.

**Why:** hstack v0.2.0 is about to run on customer work. The benchmark is closed (`progress/final-report.md`) and measured plugin 653af83 only; every later version, this one included, is unmeasured.

**Decided by the user:**

- Public issues on `emulatalk1/hstack` with the label `feedback`. A setting may override the repository. The label is never created without asking.
- Capture is local and automatic, in `${HSTACK_STATE:-$HOME/.hstack}/<cksum>/`, outside the project's work tree and history.
- Posting is never automatic: only a command the user invokes posts, after the exact title and body are shown and the user says yes.
- Without `gh`, or with `gh` logged out: the file is kept, its path printed, nothing posted.
- Collect is `gh issue list --label feedback --state open`, grouped by phase and kind. Each fix closes its issues with a reference to the fixing commit.
- **An issue describes the problem** (2026-11-19, replacing the brief's "a draft has no free-text field"; see History): a description in words, written by the skill and approved verbatim by the user, beside fixed fields from the run.

## History

The brief asked for an allow-list: a posted draft built from fixed fields only (version, phase, kind, minutes, counts), with no free text. The first build did exactly that. The user rejected it: such an issue says where hstack stumbled but not what the problem is, so nobody can fix from it. Their words: the skill is to "collect the problem when the user finds an error and create the issue to fix, update, enhance". Asked whether an issue may then carry a description in words, written by the skill and approved verbatim before posting, the user answered "đúng vậy". The design below is the second build. The fixed fields and their check are kept from the first.

## What the state held before this work

Read from `scripts/hstack.sh` at 159a89c:

| File in `S` | Written by | Holds |
|---|---|---|
| `base`, `started` | `start` | the commit and the epoch second of the run's start |
| `phases` | `phase` | one line per step: `<name>` or `<name> skipped: <why>`; the why is model-written |
| `oracle.lock` | `lock` | one `<blob> <path>` line per locked oracle file |
| `stop-blocks` | the hooks | stop-hook blocks in this process (reset on startup and resume, kept by `start`) |
| `done` | `done` | HEAD at the final check |
| `capabilities.md`, `review-<n>.md`, `disputes.md` and the other `.md` files | the build agent | model-written text |

`start` moved every file except `old`, `repo`, `session-head` and `stop-blocks` to `S/old/<time>/`. Nothing counted dispute rounds, and nothing recorded when a run ended.

## Design

Everything is in `scripts/hstack.sh` (POSIX sh, git; `gh` only for the three verbs that talk to GitHub). `skills/build/SKILL.md` and the agents do not change: the build agent is never told that feedback exists.

### An entry

An entry is a file `S/feedback/<YYYYmmdd-HHMMSS>-<pid>`, and beside it, once it has one, its description `<entry>.md`.

```
version=0.3.0
kind=setup-failure
phase=explore
elapsed=42
oracle_files=3
stop_blocks=0
dispute_rounds=0
skipped_phases=1
review_rounds=1
unavailable_capabilities=0

explore skipped: <the why, as the agent wrote it>
```

- **The head** (up to the first empty line) holds only the fixed fields, snapshotted when the entry is written, because `start` later moves the state they come from.
- **The detail** (after the empty line) is what the script saw: a skip reason, `unavailable:` lines. It may hold a customer's paths and names. It is never posted and never printed, and the skill does not read it unless the user asks.
- **The description** (`<entry>.md`) is the only text that is posted: a first line that is the summary, an empty line, then what happened, what was expected, and what helps to reproduce or fix it in hstack.

**Kinds.** Four for what a run does, which the script can record by itself: `setup-failure`, `intervention`, `escaped-bug` (a bug in the product that the loop let through), `cost`. Three for what the user reports about hstack: `bug` (hstack did something wrong), `update` (something is out of date or must change), `enhancement` (something hstack should do better, or also do).

**Phase.** One of PHASES, or `none` for a report that belongs to no step of the loop.

**Fields and where each comes from:**

| Field | Source |
|---|---|
| `version` | `.claude-plugin/plugin.json` beside the script |
| `kind`, `phase` | as above |
| `elapsed` | minutes from `started` to now, or to `ended` once the run is done (new file: `done` writes the epoch second to `S/ended`). Left out when over 1440: no run lasts a day, so the number would be the age of a stalled run |
| `oracle_files` | lines of `oracle.lock` |
| `stop_blocks` | `stop-blocks` (this process), at most 3 |
| `dispute_rounds` | lines of `S/locks` minus 1, at least 0 (new file: `lock` appends one line per call; the loop locks once, then once per dispute round) |
| `skipped_phases` | lines of `phases` with ` skipped: ` |
| `review_rounds` | number of `review-*.md` files |
| `unavailable_capabilities` | lines of `capabilities.md` with `unavailable:` |

Elapsed and the counts are written only where a run stands behind the entry: `started` exists; the kind is not `update` or `enhancement`; the phase is not `none`; and for `escaped-bug`, `done` exists (without it the state belongs to a newer run). Known limit: after two finished runs, a late `escaped-bug` carries the newer run's counts; the draft shows them before posting.

### Recording

**By the script itself**, with no description (no step of the skill, so no model has to remember):

| Where | When | Kind | Phase | Detail (local) |
|---|---|---|---|---|
| `phase` | the line is `<name> skipped: time…` (the why starts with `time`) | `cost` | `<name>` | the line |
| `phase` | the line is `<name> skipped: <anything else>` | `setup-failure` | `<name>` | the line |
| `phase` | the line is `setup` and `capabilities.md` has `unavailable:` lines | `setup-failure` | `setup` | those lines |
| `hook-stop` | the gate gives up (3 blocks used) on a started run, once per cap | `intervention` | the first step not recorded, or `final` | none |

- Only a name in PHASES records an entry (`phase` accepts any `[a-z]+`).
- Capture is silent and never changes an exit code or the hooks' output: `hook-stop`'s stdout is the JSON decision. The snapshot runs in a subshell, so a broken state file ends the snapshot, never the phase or the hook.
- Mapping every non-`time` skip to `setup-failure` is a guess: the loop names one such skip (explore, when nothing can run the product).
- The cap entry is recorded only when `base` exists. Its cost: a run left unfinished and never resumed makes each new session in that repository record one more `intervention` after its 3 blocks.

**By the user, through the skill:**

- `hstack.sh feedback add <kind> <phase|none>` reads the description from stdin and writes the entry and its text.
- `hstack.sh feedback describe <id>` reads a description from stdin for an unposted entry: for a stumble the script recorded, or to replace a text the user wants changed. An edit is a `describe`, then `draft` again.

The skill passes the text only through a quoted heredoc with its own delimiter (`<<'HSTACK_FEEDBACK_TEXT'`): a description of hstack holds `$H` and backticks, and an unquoted one would be expanded and run.

### The state dir

- `start` keeps `feedback` and `top` beside `old`, `repo`, `session-head` and `stop-blocks`, so entries survive every later run.
- `state()` also writes `S/top`, the work tree's folder as git prints it, for the description's path check.
- `S` is keyed by the absolute git dir, so each worktree has its own. `draft` and `post` read `${HSTACK_STATE:-$HOME/.hstack}/*/feedback/` and work from any folder, inside a git repository or not. An entry's id is `<cksum>/<file name>`.
- A posted entry gets a last line `posted: <issue URL>` and moves with its description to `feedback/posted/`. Nothing is deleted.
- `hstack.sh feedback dismiss <id>...` (added after the merge, plugin 0.3.1; several ids in one call) moves an unposted entry, and its description if it has one, to `feedback/dismissed/`: off `draft`'s list, still on disk. It calls no `gh`. The description net reads dismissed entries too, so a dismissed stumble's reason still cannot be pasted into a new report. The skill runs it only on the user's word.

### The draft and its check

`hstack.sh feedback draft` prints, for each unposted entry:

- with a description: `entry <id>`, `local: <path>`, `to: <repository>`, perhaps a `warning:` line, `title: …`, the body with every line behind `| `, and `confirm: <code>`;
- without one: `undescribed <id>: <kind> at <phase>` and its path;
- refused: `refused: <path>: <reason>` and its `id:` line, never the offending line. A refusal about the description is answered with a new `describe`; one about a field can only be dismissed.

The title is `[feedback] <phase> <kind>: <summary>`. The body is the description, an empty line, a `---` line, then the fixed-field lines. Body lines stand behind `| `, so no line of a description can pass for one of the script's own lines. The confirm code is the `cksum` of repository, title and body, so the yes covers the text and where it goes. Entries are read as bytes (`LC_ALL=C`). Only a file whose state dir and name have the id's shape (digits and `-`) is an entry: a name is never printed as text.

One function builds and checks the draft, and it is the only gate between an entry and GitHub.

**The fields** are checked as a closed list:

- every field line matches one pattern (counted, so a `grep` that fails refuses the entry too): `plugin version: <n.n.n>`, `phase: <one of PHASES, or none>`, `kind: <one of the seven>`, or one of the seven count labels followed by 1 to 5 digits;
- `plugin version`, `phase` and `kind` are each present, and no label appears twice.

A head line with any other key, or a value that is not of that shape (a path, a name, text), refuses the whole entry.

**The description** is free text, so what guards customer content is, in order of weight:

1. **The user reads the exact text.** The title and body sit inside the question, and the confirm code binds the yes to that text and that repository.
2. **The skill writes about hstack, not about the project.** Its rules: describe what hstack did and what it should have done; never copy a path, a project, customer or repository name, requirement text, code, a log or error line, a branch name or a commit hash of the project; paraphrase; write in English; put code, `@name` and `#number` in backticks.
3. **A mechanical net in the script**, for the commonest leaks only. Refused:
   - a description that contains the user's home path, or the folder path of the entry's project or of the session's project (the main checkout's and the work tree's, as git prints them);
   - one that repeats, from any entry of that project (posted ones too), a whole detail line or what follows `skipped: ` or `unavailable: ` in it, when that is over 24 bytes; shorter reasons ("no way to run it") are too generic to refuse;
   - one with a control character other than a newline or a tab: a carriage return or an escape would show the user another text than the one posted;
   - one over 1500 bytes, with a first line over 200 bytes, or with no summary (it must fit inside the question, and a log does not);
   - one whose text file is a symbolic link.

   Flagged with a `warning:` line the skill must show in the question: a description that contains the name of the project's folder, or of the main checkout's when the entry comes from a worktree (names under 4 bytes are not looked for).

   What the net misses, found by the review of the build: a path through a symlink or an alias (`/tmp` for `/private/tmp`), a `~/` or repo-relative path, a path outside home and the project, a path in another letter case; a reason that is reworded, under 25 bytes, or held only in the session's memory and never recorded; a customer's name that is not the folder's name.

The net cannot tell customer content from other words. Guards 1 and 2 carry the weight.

### Posting

`hstack.sh feedback post <id> <code>` takes an id and a code, never text. In this order, and it stops at the first failure with the entry kept and its path printed:

1. Check the id's shape (`<digits>/<file name>`) before any path is built from it. Build the draft again and check it; refuse an entry without a description; refuse when the code differs from the one `draft` printed (the text or the repository changed since the user saw it).
2. `gh` on `PATH` and `gh auth status` succeeds; else `kept: <path>`.
3. `gh label list --repo <repo>` succeeds (a failure is "post nothing", not "label missing") and names `feedback`; else it says the label is missing and that only the user may have it created (`feedback label` runs `gh label create feedback --repo <repo>`).
4. `gh issue create --repo <repo> --label feedback --title <title> --body <body>`; print the URL; move the entry and its description to `posted/`.

`<repo>` is `emulatalk1/hstack`, or `HSTACK_FEEDBACK_REPO` when set (refused unless it is `owner/name`). Every `gh` call carries `--repo`: the working directory is a customer's repository, and `gh` would otherwise use its remote.

**The yes, and the plugin's own hooks.** The stop hook blocks any turn that ends while a run is unfinished, with "No human will answer; decide…", and the session-start text says the same. A feedback turn on a stalled run would be blocked and pushed to decide alone. So:

- each `feedback` verb (not a mistyped one) writes `S/pass` in the session's repository (`CLAUDE_PROJECT_DIR`, else the current folder). `hook-stop` consumes it first thing on every stop, whatever the stop's outcome would be, and lets that one stop through with no block counted and no entry recorded. `hook-start` removes a stale one on startup and resume. Known limits, accepted by the user: a pass waits for the next stop when the feedback turn ended without one (an interrupt, or a verb run by hand in a terminal), so one later stop in that process goes through unblocked; and a build agent that ran a `feedback` verb before each stop would never be blocked. The gate is a reminder capped at 3 blocks, and nothing tells a build agent the verb exists; a time limit on the pass was not built, because a question the user answers late would then end in a block.
- the skill asks for the yes with the question tool, inside the turn. The repository, the exact title and the exact body sit inside the question itself, one question per entry, at most 4 per call: text printed before a question may be hidden while its dialog is open. Where there is no question tool (a headless run), it prints the drafts and the local paths and posts nothing.
- the skill says: the hook texts do not apply to this skill, a hook block is never a yes, and only an answer the user gave to the shown draft is.

### Collect and close

`hstack.sh feedback collect` runs `gh issue list --repo <repo> --label feedback --state open --limit 1000 --json number,title` and prints one line per phase and kind with its count, sorted, then one line per issue under it: `#<n> <summary>`. A title of another shape goes under `other`.

A fix closes its issues with `gh issue close <n> --repo <repo> --comment "Fixed in <full sha>"`; the skill gives the line. No verb: it is one `gh` command.

### The skill

`skills/hstack-feedback/SKILL.md`, name `hstack-feedback`, `disable-model-invocation: true`, so only the user starts it: `/hstack:hstack-feedback <what they found>`, or `collect`. No Bun: the script is sh.

Invoked with what the user found, it decides the kind and the phase, writes the summary and the description from what happened in the session and the user's words, runs `add`, then `draft`, the question (post it, change it, keep it local) and `post`. It lists the recorded stumbles that have no description and writes one for those the user wants posted.

## Tests

In `plugin-dev/test-hstack.sh` (140 checks with the hook tests) and `tests/skills.test.mjs`. A fake `gh` first on `PATH` appends its arguments to a log and answers from files in the temp dir. No test can reach GitHub even if `PATH` slips (the real `gh` may read its token from the keychain): for the whole file, `HTTPS_PROXY` points at a dead local port, `GH_TOKEN` and `GITHUB_TOKEN` hold junk and `GH_CONFIG_DIR` is under the temp dir; the feedback tests abort unless `command -v gh` is the fake. Tests delete nothing: entries are cleared by posting them through the fake.

Baseline on the clean branch, before any change: `bun test ./tests` 727 pass, 65 skip, 0 fail; `sh` and `dash plugin-dev/test-hstack.sh` 0 failures.

- [x] **The detail never leaves.** A skip reason with a path and a name is in the entry's detail and never in a draft or in the fake `gh`'s log; a description that copies it, whole or without its prefix, from a later detail line, or into a new report after the stumble was posted, is refused; the same stumble in other words is accepted.
- [x] **The fields are a closed list.** A path as a value, a field outside the list, a count that is not a number, a field given twice, a missing version, a kind outside the list, text after a phase name, a line with an invalid byte, an empty entry: each refused by `draft` and by `post`, with no `issue create` in the log. A `grep` that fails refuses the draft.
- [x] **The description.** Posted as shown, byte for byte, with `$`, backticks and text beyond ASCII kept. Refused, each for its named reason: the home path, the project path, a worktree's own path and its main checkout's, a summary over 200 bytes or of spaces, a text over 1500 bytes, a carriage return, an escape. A tab is accepted. The folder's name gives the warning, in a worktree the main checkout's name too, and there is none when the name is absent. A line imitating `confirm:`, `title:` or `entry` stays behind `| `.
- [x] **The yes.** A wrong code posts nothing; a changed summary with the same body, a changed text, or another repository each make the old code useless; an entry without a description is not postable.
- [x] **`gh`.** No `gh` (a `PATH` checked to hold none) and a logged-out `gh` keep the file and print its path; a missing label and a failed label list post nothing and create no label; only `feedback label` creates it; every call carries `--repo`, and `HSTACK_FEEDBACK_REPO` changes it on every call.
- [x] **Recording.** A time skip is a `cost`, and `time` inside another why is not; an unavailable capability records a `setup-failure`; a name outside PHASES records nothing; `update`, `enhancement` and the phase `none` carry no run numbers, each rule alone; an unfinished `escaped-bug` has none, a finished one has `ended` minus `started`; an elapsed over a day is left out.
- [x] **The loop is not disturbed.** A plain and a skipped `phase` exit 0 and print nothing; `phase` fails when its line cannot be written; the capped stop prints nothing, records one `intervention` only on a started run and none the second time; an empty `started` breaks neither the capped stop nor `phase`.
- [x] **The pass.** One stop goes through and the next blocks; a pass on a finished run is consumed by that stop; a new process drops a stale one; a mistyped verb writes none; it goes to the session's repository wherever the verb ran.
- [x] **The state dir.** Entries and `top` survive `start`; nothing is written inside the project repository (`git status --porcelain --ignored` unchanged); a file whose name is not an entry id is no entry and its name is not printed; an id that is not an entry id is refused.
- [x] **Dismiss** takes an entry off the list with its text, keeps both files, calls no `gh`, takes several ids, clears a refused entry (whose id `draft` prints), refuses an unknown id, a posted entry and one already dismissed; the reason of a dismissed stumble is still netted; dismissed entries survive `start`.
- [x] **Collect** groups by phase and kind, lists each issue's summary, and asks for the open issues with the label on the repository.
- [x] **The skill file** has its name, `disable-model-invocation: true`, the quoted heredoc for `add` and `describe`, and the README names the plugin's version.

## Tasks

- [x] 1. Tests first; see them fail.
- [x] 2. `scripts/hstack.sh`: the capture points, `ended`, `locks`, `top`, `feedback` kept by `start`, `pass` in both hooks, and `feedback add|describe|draft|post|label|collect`.
- [x] 3. `skills/hstack-feedback/SKILL.md`.
- [x] 4. `.claude-plugin/plugin.json` to 0.3.0; `README.md`: the status line, the skill's row, the feedback paragraph, the benchmark note, and the repository no longer called private.
- [x] 5. `bun test ./tests` (728 pass, 65 skip, 0 fail), `sh plugin-dev/test-hstack.sh` under `sh` and `dash` (140 ok with `dismiss`), `bun scripts/okf-check.mjs docs`.
- [x] 6. A review of each build's diff on the most capable model, its findings fixed with tests; the advisor's final review of each.
- [x] 7. The user's approval of the build, then the merge and the push.

**The README's benchmark note:** the benchmark (`progress/final-report.md`) measured plugin commit 653af835fd613e3eb25feb48e4ccc9bfb534ae6e only; every later version is unmeasured. That commit is in `main`'s history and is pinned by the ref `refs/bench/plugins/hstack-653af83`, pushed to origin with this work; the note gives the fetch line, because a plain clone does not fetch that namespace.

## Limits

- No real issue and no label was created on GitHub by this work; tests use the fake `gh`.
- During the build no `feedback` verb was run by hand outside a guarded environment: the tests' (fake `gh`, dead proxy, junk token), or a scratch repository with `HSTACK_STATE` in the scratchpad and only `add` and `draft`, which call no `gh`.
- No bench test reads the plugin's own files from the work tree, so the new skill folder and the version bump cannot turn one red.
- Nothing under `.evidence/`, `refs/bench/plugins/*` or `plugin-w` was changed, moved or deleted; no `git clean`.
- No customer content, token or `.evidence/` data in anything pushed: the branch's diff was scanned for the home path, the user's address and token shapes before the push.
- **Not verified:** the real `gh`; the skill in a live session (whether a question shows a full 1500-byte body, and the pass against the real Stop hook); any Linux userland (the new code ran with macOS tools, under `sh` and `dash`).
- The script cannot prove a yes: the confirm code binds the text and the repository; the yes is held by the skill and the permission prompt.
- Not built: posting from the hook or the build loop, a `close` verb, bringing a dismissed entry back (move the file by hand), reading entries from `old/`, `collect` printing the local entry beside an issue.

## Approval

1. **The plan**, approved by the user on 2026-11-19 ("duyệt") with the advisor's suggestions on four rulings: the cap entry is recorded automatically; the bench ref is pushed with the final push; a feedback verb lets its turn end once; the version is 0.3.0.
2. **The correction**, the same day: an issue must describe the problem ("đúng vậy" to the restated purpose). See History.
3. **The second build**, approved by the user on 2026-11-19 ("duyệt") after asking how the skill works. With it: the pass's known limits are accepted; `main` is fast-forwarded and pushed together with the one bench ref, by an explicit refspec after a dry run; `collect` printing local entries is dropped.

4. **`dismiss`**, asked for by the user on 2026-11-19 after the merge ("ok làm luôn đi"), built on branch `feedback-dismiss` with plugin 0.3.1. Its merge waits for the user's word.

Chosen by the builder, open to change: seven kinds in one list, the phase `none`, the 200 and 1500 byte limits, issues in English.
