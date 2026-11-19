---
type: plan
title: "hstack-feedback plan"
description: "A small skill and a `feedback` subcommand of hstack.sh: when the user finds a problem with hstack, the skill writes it up as an issue that can be fixed from (a description plus fixed fields from the run), shows the exact text and posts it to GitHub only after the user's yes; the build loop also records each stumble locally; a collect command lists the open issues."
status: draft
generated: { by: claude-code/2.1.327, at: "2026-11-19T10:28:18+07:00" }
verified:
  - { by: claude-code-advisor/2.1.327, at: "2026-11-19T10:52:00+07:00" }
  - { by: human:emulatalk1, at: "2026-11-19T11:09:12+07:00" }
---

# hstack-feedback Plan

> Built natively in one session, test-first, on branch `hstack-feedback` from main. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** when the user finds a problem with hstack on a real project (a bug, something to update, something to enhance), the skill collects what the problem is and posts it to `emulatalk1/hstack` as an issue someone can fix from, with no customer content in it; the open issues can be listed by phase and kind and closed by the fixing commit.

**Why:** hstack v0.2.0 is about to run on customer work. The benchmark is closed (`progress/final-report.md`) and measured plugin 653af83 only; every later version, this one included, is unmeasured.

**Decided by the user (not reopened here):** public issues on `emulatalk1/hstack` with the label `feedback` (a setting may override the repo; the label is never created without asking); capture is local and automatic, in `${HSTACK_STATE:-$HOME/.hstack}/<cksum>/`; posting only by a command the user invokes, after the exact title and body are shown and the user says yes; the posted draft is built from an allow-list of fixed fields and has no free text; without `gh`, or with `gh` logged out, the file is kept, its path printed and nothing posted; collect is `gh issue list --label feedback --state open` grouped by phase and kind.

## Revision (2026-11-19, after the first build)

The first build posted fixed fields only: a version, a phase, a kind and counts. The user rejected it: such an issue says where hstack stumbled but not what the problem is, so nobody can fix from it. The user's words: the skill is to "collect the problem when the user finds an error and create the issue to fix, update, enhance". Asked whether an issue may then carry a description in words, written by the skill and approved verbatim before posting, the user answered "đúng vậy".

**This lifts one decided item, on the user's word:** "a draft has no free-text field". Everything else decided stands: where issues go, the label, local capture, never posting automatically, the exact title and body shown before the yes, `gh` absent or logged out keeps the file, collect.

What replaces the allow-list as the guard for customer content, in order of weight:

1. **The user reads the exact text.** Unchanged: the title and body sit inside the question, and the confirm code binds the yes to that text and that repository.
2. **The skill writes about hstack, not about the project.** Its rules: describe what hstack did and what it should have done; never copy a path, a project, customer or repository name, requirement text, code, a log or error line, a branch name or a commit hash of the project; paraphrase.
3. **A mechanical net in the script**, for the commonest leak only: a description that contains the user's home path or the project's folder path is refused; one that contains the project folder's name gets a `warning:` line the skill must show in the question; a description over 4000 bytes, or with a first line over 200 bytes, is refused (a log does not fit).

The net cannot tell customer content from other words. Guards 1 and 2 carry the weight, and the plan says so.

**What changes in the design below** (the sections keep their text where it still holds; where it conflicts with this section, this section rules):

- **Kinds.** Three more, for what the user reports: `bug` (hstack did something wrong), `update` (something in hstack is out of date or must change), `enhancement` (something hstack should do better or also do). The four stumble kinds stay for what the script records by itself. `escaped-bug` is a bug in the product that the loop let through; `bug` is a bug in hstack.
- **Phase.** A report that belongs to no step of the loop takes the phase `none`.
- **The description.** A text beside the entry, `S/feedback/<entry>.md`: a first line that is the summary, an empty line, then the description. It is the only text that is posted. The entry's own detail (a skip reason, `unavailable:` lines, a private note) is still never posted and never printed.
  - `feedback add <kind> <phase> [private note]` reads the description from stdin and writes the entry and its text.
  - `feedback describe <id>` reads a description from stdin for an unposted entry: for a stumble the script recorded, or to replace a text the user wants changed. An edit is a `describe`, then `draft` again.
- **The draft.** Title: `[feedback] <phase> <kind>: <summary>`. Body: the description, a `---` line, then the fixed-field lines, checked exactly as before. `draft` prints body lines behind `| `, so no line of a description can pass for one of the script's own lines (`entry`, `to:`, `title:`, `confirm:`).
- **No description, no post.** An entry without a text is listed by `draft` as `undescribed <id>: <kind> at <phase>` with its local path, and `post` refuses it. The numbers alone are never an issue again.
- **Still no text at post time.** `post` takes an id and a code. Text enters only through `add` and `describe`, is stored, and is shown by `draft` before any yes.
- **Collect.** One line per phase and kind with its count, then one line per issue under it: `#<n> <summary>`, so an issue can be picked up to fix.
- **The skill.** Invoked with what the user found, it writes the kind, the phase, the summary and the description from what happened in this session and the user's words, runs `add`, then the draft, the question and the post as before. It lists the recorded stumbles that have no description and writes one for those the user wants posted. It reads an entry's detail only when the user asks it to, and never copies from it.

**Tests added:** a description is posted as shown, after the fields' check; an entry without one is not postable; a description with the home path or the project path is refused; the project folder's name gives the warning; an oversized one is refused; a description line that imitates `confirm:` or `title:` cannot change what is posted; `describe` replaces a text and changes the code; an entry's detail never reaches a draft, with or without a description; `none` is a phase for `add` only; collect lists each issue's summary.

**Not verified by the user as a plan:** the user confirmed the direction in one message; the build of this revision is shown to them before any merge.

## What the state holds today

Read from `scripts/hstack.sh` at 159a89c, not from memory:

| File in `S` | Written by | Holds |
|---|---|---|
| `base`, `started` | `start` | the commit and the epoch second of the run's start |
| `phases` | `phase` | one line per step: `<name>` or `<name> skipped: <why>`; the why is model-written |
| `oracle.lock` | `lock` | one `<blob> <path>` line per locked oracle file |
| `stop-blocks` | the hooks | stop-hook blocks in this process (reset on startup and resume, kept by `start`) |
| `done` | `done` | HEAD at the final check |
| `capabilities.md`, `review-<n>.md`, `disputes.md` and the other `.md` files | the build agent | model-written text |

`start` moves every file except `old`, `repo`, `session-head` and `stop-blocks` to `S/old/<time>/`. Nothing counts dispute rounds, and nothing records when a run ended.

## Design

Everything is in `scripts/hstack.sh` (POSIX sh, git; `gh` only for the three verbs that talk to GitHub). `skills/build/SKILL.md` and the agents do not change: the build agent is never told that feedback exists.

### Recording

An entry is one file, `S/feedback/<YYYYmmdd-HHMMSS>-<pid>`:

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

The head (up to the first empty line) holds only the allow-listed fields, snapshotted when the entry is written, because `start` later moves the state they come from. Everything after the empty line is detail. It stays on the machine: no command prints it, and the skill never reads an entry file (reading one would send its text to the model).

**Written automatically, by the script itself** (no step of the skill, so no model has to remember):

| Where | When | Kind | Phase | Detail (local) |
|---|---|---|---|---|
| `phase` | the line is `<name> skipped: time…` (the why starts with `time`) | `cost` | `<name>` | the line |
| `phase` | the line is `<name> skipped: <anything else>` | `setup-failure` | `<name>` | the line |
| `phase` | the line is `setup` and `capabilities.md` has `unavailable` lines | `setup-failure` | `setup` | those lines |
| `hook-stop` | the gate gives up (3 blocks used) on a started run, once per cap | `intervention` | the first step not recorded, or `final` | none |

- Only a name in PHASES records an entry (`phase` accepts any `[a-z]+`).
- Capture is silent and never changes an exit code or the hooks' output: `hook-stop`'s stdout is the JSON decision.
- Mapping every non-`time` skip to `setup-failure` is a guess: the skill names one such skip (explore, when nothing can run the product). The kind is fixed at capture and the user sees it in the draft before posting.
- The cap entry is recorded only when `base` exists. A capped gate with no run has no honest phase. **This row needs the user's ruling** (see Approval): the user's example lists an intervention as flag-only, and the design says a block is not an intervention. The case for it: a capped gate on an unfinished run is exactly the benchmark's intervention (the turn ended unfinished, a human must resume). Its cost: a run left unfinished and never resumed makes each new session in that repository record one more `intervention` after its 3 blocks.

**Written when the user flags it:** `hstack.sh feedback add <kind> <phase> [what happened]`, through the skill, in the project's session. Any of the four kinds; `intervention` and `escaped-bug` have no other source than the row above. The words go to the detail only.

**Fields and where each comes from:**

| Field | Source |
|---|---|
| `version` | `.claude-plugin/plugin.json` beside the script |
| `phase` | the phase name alone, one of PHASES |
| `kind` | `setup-failure`, `intervention`, `escaped-bug` or `cost` |
| `elapsed` | minutes from `started` to now, or to `ended` once the run is done (new file: `done` writes the epoch second to `S/ended`). Left out when over 1440: no run lasts a day, so the number would be the age of a stalled run |
| `oracle_files` | lines of `oracle.lock` |
| `stop_blocks` | `stop-blocks` (this process), at most 3 |
| `dispute_rounds` | lines of `S/locks` minus 1, at least 0 (new file: `lock` appends one line per call; the loop locks once, then once per dispute round) |
| `skipped_phases` | lines of `phases` with ` skipped: ` |
| `review_rounds` | number of `review-*.md` files |
| `unavailable_capabilities` | lines of `capabilities.md` with `unavailable:` |

Elapsed and the counts are written only when `started` exists. For a flagged `escaped-bug` they are written only when `done` exists too: without it the state belongs to a newer run, not to the run the bug escaped from. Known limit: after two finished runs, a late `escaped-bug` flag carries the newer run's counts; the draft shows them before posting.

### The state dir

- `start` keeps `feedback` beside `old`, `repo`, `session-head` and `stop-blocks`, so entries survive every later run.
- `S` is keyed by the absolute git dir, so each worktree has its own. `draft` and `post` read `${HSTACK_STATE:-$HOME/.hstack}/*/feedback/` and work from any folder, inside a git repository or not. An entry's id is `<cksum>/<file name>`.
- A posted entry gets a last line `posted: <issue URL>` and moves to `feedback/posted/`. Nothing is deleted.

### Posting

`hstack.sh feedback draft` prints, for each unposted entry: its id, its local path, the repository it would go to, the exact title, the exact body and a confirm code (the `cksum` of repository, title and body, so the yes covers where it goes). It reads the entry's head only, as bytes (`LC_ALL=C`). Only a file whose state dir and name have the id's shape (digits and `-`) is an entry: a name is never printed as text.

The draft is built by renaming the head's keys to fixed labels, then checked as a whole by one function, the only gate between an entry and GitHub:

- every body line matches one pattern (counted, so a `grep` that fails refuses the entry too): `plugin version: <n.n.n>`, `phase: <one of PHASES>`, `kind: <one of the four>`, or one of the seven count labels followed by 1 to 5 digits;
- `plugin version`, `phase` and `kind` are each present, and no label appears twice;
- the title is `[feedback] <phase> <kind> (hstack <version>)`, built from the checked body.

A head line with any other key, or a value that is not of that shape (a path, a name, text), fails the first rule, so the entry is refused: `draft` prints `refused: <path>` without the line, and `post` exits non-zero. There is no way to pass text in: `post` takes an id and a confirm code, nothing else.

`hstack.sh feedback post <id> <code>`, in this order, and it stops at the first failure with the entry kept and its path printed:

1. Check the id's shape (`<digits>/<file name>`) before any path is built from it. Build the draft again and check it; refuse when the code differs from the one `draft` printed (the entry or the repository changed since the user saw it).
2. `gh` on `PATH` and `gh auth status` succeeds; else `kept: <path>`.
3. `gh label list --repo <repo>` succeeds (a failure is "post nothing", not "label missing") and names `feedback`; else it says the label is missing and that only the user may have it created (`feedback label` runs `gh label create feedback --repo <repo>`).
4. `gh issue create --repo <repo> --label feedback --title <title> --body <body>`; print the URL; move the entry to `posted/`.

`<repo>` is `emulatalk1/hstack`, or `HSTACK_FEEDBACK_REPO` when set (refused unless it is `owner/name`). Every `gh` call carries `--repo`: the working directory is a customer's repository, and `gh` would otherwise use its remote.

**The yes, and the plugin's own hooks.** The stop hook blocks any turn that ends while a run is unfinished, with "No human will answer; decide…", and the session-start text says the same. A feedback turn on a stalled run would be blocked and pushed to decide alone. So:

- each of the five `feedback` verbs (not a mistyped one) writes `S/pass` in the session's repository (`CLAUDE_PROJECT_DIR`, else the current folder). `hook-stop` consumes it first thing on every stop, whatever the stop's outcome would be, and lets that one stop through with no block counted and no entry recorded. `hook-start` removes a stale one on startup and resume. **This changes the stop gate for every user** (see Approval). Known limits, found by the review of the build: a pass waits for the next stop when the feedback turn ended without one (an interrupt, or a verb run by hand in a terminal), so one later stop in that process goes through unblocked; and a build agent that ran a `feedback` verb before each stop would never be blocked. The gate is a reminder capped at 3 blocks, and nothing tells a build agent the verb exists; a time limit on the pass was not built, because a question the user answers late would then end in a block.
- the skill asks for the yes with the question tool, inside the turn. The exact title and body sit inside the question itself, one question per entry, at most 4 per call: text printed before a question may be hidden while its dialog is open. Where there is no question tool (a headless run), it prints the drafts and the local paths and posts nothing.
- the skill says: the hook texts do not apply to this skill, a hook block is never a yes, and only an answer the user gave to the shown draft is.

### Collect and close

`hstack.sh feedback collect` runs `gh issue list --repo <repo> --label feedback --state open --limit 1000 --json number,title` and prints one line per phase and kind, sorted: `<phase> <kind>: <count>: #<n> #<n>`. A title of another shape is listed under itself.

A fix closes its issues with `gh issue close <n> --repo <repo> --comment "Fixed in <full sha>"`; the skill gives the line. No verb: it is one `gh` command.

### The skill

`skills/hstack-feedback/SKILL.md`, name `hstack-feedback`, `disable-model-invocation: true`, so only the user starts it: `/hstack:hstack-feedback`, with `flag <kind> <phase> <what happened>`, `post` (the default) or `collect`. No Bun: the script is sh.

It prints: for `flag`, the entry's path; for `post`, each draft exactly as the script printed it (again inside its question), then the issue URLs, or `kept: <path>` lines and why; for `collect`, the grouped lines.

Its rules: never read or print an entry file; never write or change a title or body; never call `gh issue create` itself; never run `feedback label` without the user's yes to that question; never resume a build from this skill.

## Tests

In `plugin-dev/test-hstack.sh`. A fake `gh` first on `PATH` appends its arguments to a log and answers from files in the temp dir. No test can reach GitHub even if `PATH` slips (the real `gh` may read its token from the keychain): for the whole file, `HTTPS_PROXY` points at a dead local port, `GH_TOKEN` and `GITHUB_TOKEN` hold junk and `GH_CONFIG_DIR` is under the temp dir; the feedback tests abort unless `command -v gh` is the fake.

Baseline on the clean branch (159a89c plus this plan), before any change: `bun test ./tests` 727 pass, 65 skip, 0 fail; `sh` and `dash plugin-dev/test-hstack.sh` 0 failures. A test that fails after the change is a finding for the user, never a reason to regenerate something locked.

- [x] a skip reason never reaches a draft: `phase explore skipped: <words with a path and a name>` writes an entry whose detail holds the words; `draft`'s output and the fake `gh`'s log after `post` do not.
- [x] a draft with a path or a field outside the list is refused: an entry whose head has `phase=/a/path`, an extra `note=…` line, `elapsed=12x`, a second `kind=` line, or no `version=` line is refused by `draft` and by `post`, and the log has no `issue create`.
- [x] a wrong confirm code posts nothing.
- [x] the happy path: the log shows `issue create --repo emulatalk1/hstack --label feedback` with the shown title and body; the entry is in `posted/` with its URL; `HSTACK_FEEDBACK_REPO` changes `--repo` on every call.
- [x] no `gh` keeps the file: with a `PATH` checked to hold no `gh` at all, and again with the fake `gh` logged out, `post` prints the path, the entry stays, and the log has no `issue create`.
- [x] a missing label, and a failed `gh label list`, post nothing and create no label; `feedback label` alone creates it.
- [x] nothing is written inside the project repo: after every verb above, `git status --porcelain --ignored` is empty and each entry's path starts with the test's state dir.
- [x] entries survive `start`: after a second `start`, the entry is still in `S/feedback/`, not in `old/`.
- [x] capture does not disturb the loop: `phase setup` with no `capabilities.md` exits 0 and prints nothing; `phase mutatex` writes no entry; the capped stop prints nothing, records one `intervention` only on a started run, and a second capped stop records none.
- [x] a flagged `escaped-bug` without `done` has no elapsed and no counts; with `done`, elapsed is `ended` minus `started`.
- [x] `S/pass` lets one stop through on an unfinished run, and the next stop blocks again; a pass written on a finished run is consumed by that turn's stop and does not excuse a later unfinished one.
- [x] `phase mutate skipped: time, 185 min` records a `cost`, not a `setup-failure`.
- [x] `collect` prints the grouped lines from the fake `gh`'s answer.
- [x] from the review of the build: a `grep` that fails refuses the draft; a file whose name is not an entry id is no entry and its name is not printed; an empty `started` breaks neither the capped stop nor `phase`; `phase` fails when its line cannot be written; a mistyped verb writes no pass; a code shown for one repository does not post to another; a line with an invalid byte is refused; the pass goes to the session's repository; `time` inside another why is not a `cost`.
- [x] `tests/skills.test.mjs`: the new skill has its name, `disable-model-invocation: true` and the script's `feedback` command (its own check; `checkFrontmatter` demands the Bun line).

## Tasks

- [x] 1. Tests first: the cases above in `plugin-dev/test-hstack.sh` and `tests/skills.test.mjs`; see them fail.
- [x] 2. `scripts/hstack.sh`: `record`, the three capture points, `ended`, `locks`, `feedback` kept by `start`, `pass` in both hooks, and `feedback add|draft|post|label|collect`.
- [x] 3. `skills/hstack-feedback/SKILL.md`.
- [x] 4. Done: `.claude-plugin/plugin.json` to 0.3.0; `README.md`: the status line, the skill's row, the feedback paragraph, the benchmark note below, and line 22 (the repository is public now).
- [x] 5. `bun test ./tests`, `sh plugin-dev/test-hstack.sh` (also under `dash`), `bun scripts/okf-check.mjs docs`.
- [x] 6. One review of the diff on the most capable model; the advisor's final review. Still to do: ask the user before any merge or push.

**The README's benchmark note:** "The benchmark (`progress/final-report.md`) measured plugin commit 653af835fd613e3eb25feb48e4ccc9bfb534ae6e only; every later version, this one included, is unmeasured. That commit is in `main`'s history and is pinned by the ref `refs/bench/plugins/hstack-653af83`." Today that ref exists only in the user's local clone (`git ls-remote origin` shows `main` alone), and the note says so unless the user has it pushed.

## Limits

- No real issue and no label is created on GitHub by this work; tests use the fake `gh`.
- The real `gh` is on this machine's `PATH` and may be logged in. During the build no `feedback` verb is run by hand outside the tests' guarded environment (fake `gh`, dead proxy, junk token), and any hand run sets `HSTACK_STATE` to the scratchpad, so the user's real `~/.hstack` is never read or written.
- No bench test reads the plugin's own files from the work tree (`tests/bench-arm`, `bench-box` and `bench-diagnose` build their own temp plugins or use strings), so a new skill folder and the version bump cannot turn one red.
- Nothing under `.evidence/`, `refs/bench/plugins/*` or `plugin-w` is changed, moved or deleted; no `git clean`.
- No customer content, token or `.evidence/` data in anything pushed or posted.
- Not built: posting from the hook or the build loop, an edit step for drafts, a `close` verb, deleting entries, reading entries from `old/`.

## Approval

Approved by the user on 2026-11-19 ("duyệt"), as written. The four rulings stand as the plan recommends, which was also the advisor's suggestion:

1. **The cap entry.** An `intervention` is recorded automatically when the stop gate gives up on a started run.
2. **The bench ref.** `refs/bench/plugins/hstack-653af83` is pushed to origin inside the final push, which the user approves separately: one explicit refspec for that ref alone, no force, prune or mirror, after a dry run that lists only that one new ref. The README gives the fetch line, because a plain clone does not fetch that namespace. If the user declines the push, the note says the ref is local.
3. **The pass.** A `feedback` verb lets the turn it runs in end once without a stop-hook block.
4. **The version.** 0.3.0.

Offered and not taken: `collect` printing the local entry's path beside each issue posted from this machine.
