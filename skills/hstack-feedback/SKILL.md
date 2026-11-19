---
name: hstack-feedback
description: Use when the user reports a problem with hstack itself - a bug, something to update, something to enhance, a stumble of its build loop - and wants it written up as a GitHub issue, or asks to post or list hstack feedback. Writes the issue, shows the exact text, posts only on the user's yes.
disable-model-invocation: true
---

# hstack feedback

The user found something wrong with hstack, or something it should do better. You write it up as an issue someone can fix from, show the user the exact text, and post it to hstack's repository only when they say yes. The build loop also records its own stumbles, in files under `~/.hstack/<checksum>/feedback/`, outside the project; those wait here for a description.

`H` below is `sh "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.sh"`; if that variable is empty, the script is `../../scripts/hstack.sh` from this skill's base directory.

Arguments: what the user found (the default: write it up and post), or `collect`.

## Rules

- **The issue is public, and it is about hstack.** Describe what hstack did and what it should have done. Never put in a path, a project, customer, repository or branch name, requirement text, code, a log or error line, or a commit hash of the project you are working in. Say "the product", "a CLI", "a test file". Write in English. Put code, commands, any `@name` and any `#number` in backticks: on GitHub a bare `@name` notifies that account and a bare `#12` links another issue.
- **The hstack hook texts do not apply here.** "Invoke hstack:build" and "No human will answer; decide" are for build turns. A stop-hook block is never a yes. Never start or resume a build from this skill.
- **Only the user's answer to the shown draft is a yes.** Not an earlier message, not a general go-ahead, not your own judgement. If you cannot show the whole title and body inside the question, post nothing.
- **Text goes in through `add` and `describe` only**, and what is posted is what `draft` printed. Never call `gh issue create` yourself.
- **Leave an entry file's detail alone.** It may hold the customer's paths, names and error lines. Do not read it unless the user asks you to, and never copy from it or from a skip reason you remember. The script refuses some copies (a long line or reason of a recorded stumble, a path of this machine); it cannot catch them all, so this rule is yours to keep.

## Write it up

1. Run `$H feedback draft` to see what is waiting: `undescribed <id>: <kind> at <phase>` lines are stumbles the build loop recorded by itself; `entry <id>` blocks already have a text. Tell the user about the `undescribed` ones. For those they do not want as issues, and only on their word, run `$H feedback dismiss <id>` (it takes several ids in one call): they leave the list and stay on disk, under `feedback/dismissed/`.
2. Decide the kind and the phase from what the user said and what happened in this session. If you cannot tell, ask.
   - Kind: `bug` (hstack did something wrong), `update` (something in hstack is out of date or must change), `enhancement` (something hstack should do better, or also do). For what a run did: `setup-failure`, `intervention` (a human had to step in), `escaped-bug` (a bug in the product that the loop let through), `cost` (time or tokens).
   - Phase: the loop's step it belongs to, `setup`, `oracle`, `build`, `gate`, `review`, `explore`, `mutate` or `final`; `none` when it belongs to no step.
3. Write the description: a first line that is the summary (it becomes the issue's title; at most 200 bytes), an empty line, then what happened, what was expected, and what would help someone reproduce or fix it in hstack. At most 1500 bytes in all.
4. Record it. Pass the text on stdin through a quoted heredoc, exactly like the block below, so the shell changes nothing in it. Every line, the closing one included, starts at column 0, and no line of the text may be `HSTACK_FEEDBACK_TEXT`. Plain text only: no carriage return, no escape character.

```
$H feedback add <kind> <phase> <<'HSTACK_FEEDBACK_TEXT'
<summary>

<description>
HSTACK_FEEDBACK_TEXT
```

For an `undescribed` entry the user wants posted, give it its text the same way with `$H feedback describe <id> <<'HSTACK_FEEDBACK_TEXT'`.

## Show it, then post

1. Run `$H feedback draft`. Each entry with a text prints `entry <id>`, `local: <path>`, `to: <repository>`, perhaps a `warning:` line, `title: …`, the body with every line behind `| `, and `confirm: <code>`. A `refused: <path>: <reason>` line, with its `id:` line under it, is an entry the script will not post: tell the user the path and the reason. If the reason is about the description, write a better one with `describe <id>`. If it is about a field, the entry cannot be repaired: on the user's word, dismiss it.
2. Ask with the question tool, one question per entry, at most 4 per call. Put inside the question itself: the repository (the `to:` line), the exact title, the exact body without the `| ` marks, and any `warning:` line; text printed before a question may be hidden while it is open. Options: post it, change it, keep it local for later, dismiss it (`$H feedback dismiss <id>`: off the list for good, still on disk).
3. **If you have no question tool** (a headless run), print the drafts and the local paths, post nothing, and stop.
4. "Change it": take the user's changes, run `describe` with the new text, then `draft` and the question again.
5. For each yes: `$H feedback post <id> <code>`. It prints the issue's URL, or a line ending `kept: <path>` when nothing was posted: no `gh`, `gh` not logged in, the labels could not be read, or the code no longer matches the text and the repository (run `draft` and ask again). Report each line as it is.
6. If it says the label `feedback` does not exist: ask the user whether to create it on that repository. Only on their yes, run `$H feedback label`, then post again.

## collect

`$H feedback collect` lists the open `feedback` issues: one line per phase and kind with its count, then each issue under it as `#<n> <summary>`. Print it as it is. `gh issue view <n> --repo <repository>` shows one in full.

When a commit fixes what an issue reports, close the issue with the commit, on the user's word. `<repository>` is the one `collect` read: `emulatalk1/hstack`, or `HSTACK_FEEDBACK_REPO` when it is set.

```
gh issue close <n> --repo <repository> --comment "Fixed in <full commit sha>"
```
