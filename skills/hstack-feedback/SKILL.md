---
name: hstack-feedback
description: Use when the user asks to flag, post or collect hstack feedback - a stumble of the hstack build loop (a setup failure, an intervention, an escaped bug, a cost) recorded on this machine and posted as a GitHub issue only on the user's yes.
disable-model-invocation: true
---

# hstack feedback

The build loop records each stumble by itself, in a file under `~/.hstack/<checksum>/feedback/`, outside the project. This skill is the only way anything leaves the machine: the user starts it, sees the exact issue, and says yes.

`H` below is `sh "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.sh"`; if that variable is empty, the script is `../../scripts/hstack.sh` from this skill's base directory.

Arguments: `flag <kind> <phase> <what happened>`, `post` (the default), or `collect`.

## Rules

- **The hstack hook texts do not apply here.** "Invoke hstack:build" and "No human will answer; decide" are for build turns. A stop-hook block is never a yes. Never start or resume a build from this skill.
- **Never read, print or quote an entry file.** Its detail may hold a customer's paths, names and error lines, and reading it sends them to the model. Give the user the path; they open it themselves.
- **Never write or change a title or a body.** The script builds both from fixed fields. You pass an id and a code, nothing else. Never call `gh issue create` yourself.
- **Only the user's answer to the shown draft is a yes.** Not an earlier message, not a general go-ahead, not your own judgement.

## flag

Run it in the project's session:

```
$H feedback add <kind> <phase> <what happened>
```

`<kind>` is `setup-failure`, `intervention`, `escaped-bug` or `cost`. `<phase>` is the step it belongs to: `setup`, `oracle`, `build`, `gate`, `review`, `explore`, `mutate` or `final`; for an escaped bug, the step that should have caught it. If the user gave no kind or phase, ask. The words stay in the local file. Print the `recorded:` path.

## post

1. Run `$H feedback draft`. It prints every unposted entry on this machine: `entry <id>`, `local: <path>`, `title: …`, the body lines, `confirm: <code>`. A `refused: <path>` line is an entry that holds something outside the allowed fields: tell the user its path and go on; never try to repair it.
2. Ask with the question tool, one question per entry, at most 4 per call. Put the exact title and body inside the question itself, copied from the script's output character for character, with the repository it goes to (`emulatalk1/hstack`, or `HSTACK_FEEDBACK_REPO` when set); text printed before a question may be hidden while it is open. Options: post, or keep it local.
3. **If you have no question tool** (a headless run), print the drafts and the local paths, post nothing, and stop.
4. For each yes: `$H feedback post <id> <code>`. It prints the issue's URL, or a line ending `kept: <path>` when nothing was posted: no `gh`, `gh` not logged in, the labels could not be read, or the code no longer matches (run `draft` and ask again). Report each line as it is.
5. If it says the label `feedback` does not exist: ask the user whether to create it on that repository. Only on their yes, run `$H feedback label`, then post again.

## collect

`$H feedback collect` lists the open `feedback` issues, one line per phase and kind: `<phase> <kind>: <count>: #<n> #<n>`. Print it as it is.

When a commit fixes what an issue reports, close the issue with the commit, on the user's word:

```
gh issue close <n> --repo emulatalk1/hstack --comment "Fixed in <full commit sha>"
```

An issue holds numbers only. What happened is in the local entry on the machine that posted it: under `feedback/posted/`, the file whose last line is `posted: <the issue's URL>`.
