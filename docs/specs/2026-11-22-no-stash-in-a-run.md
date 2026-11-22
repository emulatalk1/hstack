---
type: spec
title: "Spec 5: no stash in a run: step 4 names the way without one, and the gate reports a changed stash"
description: "Feedback issue 4: in one run the builder ran `git stash` at step 4, against the playbook's git rule, and nothing checked it. The two texts of step 4 and the playbook's git rule now name the way to break and restore code without a stash and forbid every form of it, with the reason; `start` records what the stash holds, and `gate` and `done` print a line for each entry added or gone since, which the builder reports and never puts right itself. The version is not changed here."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-22T12:58:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-22T13:00:21+07:00" }
sources:
  - id: spec-2
    resource: /specs/2026-11-21-brainstorm-and-grill.md
---

# Spec 5: no stash in a run: step 4 names the way without one, and the gate reports a changed stash

## 1. The request

The user, 2026-11-22:

> Sửa feedback issue 4 của emulatalk1/hstack trong repo này: trong một lượt chạy, builder đã chạy git stash ở bước 4, trái với luật git của playbook, và hiện không có gì kiểm tra việc đó. Đọc issue bằng gh issue view 4 --repo emulatalk1/hstack --comments.

With it, what the user set beforehand because a second session works on feedback issue 8 at the same time: this spec is Spec 5 and its IDs are `S5-F1-S<n>` (Spec 4 is the other session's); the version number is not touched; the README's status paragraph is avoided; no push and no merge into `main`.

The issue (open, no comments): in one run of 0.4.1 the builder stashed one file in the middle of step 4, while it proved a test by breaking the code, and popped it in its next call. Nothing was lost; the builder said so itself. "Expected: no stash in a run. Nothing checks it today: `gate` and `done` look at the oracle's files, the tests and the tree, not at the stash." It names two things that would help: the script records `git stash list` at `start`, and `gate` and `done` print a line when an entry was added or is gone; or step 4's skill names the way to break and restore code without a stash, where it already says "undo that one edit by hand".

## 2. Agreed in the brainstorm

**Why.** The stash is one stack for a whole repository: every worktree, the user's own checkout and every other session share it. A stash or a pop made by a run can take or drop an entry that belongs to someone else. The playbook's git rule already says "Never stash", but only in its rules for the whole run. The two texts the builder reads at step 4 (`skills/build-implement/SKILL.md`, item 4, and `skills/build-implement/tdd.md`, the item "A test that passes at once on this run's own code") tell it to break its code and to "undo that one edit by hand", forbid `git checkout` there, name no stash and name no other way. And the run was known to have stashed only because the builder said so.

**Goals.** First, that the builder does it no more. The user, asked which matters more, that the builder does it no more or that the user gets to know each time it does: "Builder không làm nữa". Second, a signal when the stash of the repository was changed during a run all the same.

**Not a goal.** A guarantee that no stash can be made in a run. To see a stash that was made and popped again before the check, which leaves the stash as it was: the comparison this spec adds does not see it, and that is accepted. To say who changed the stash.

**A failure** would be a text that leaves a form of stash open to the builder; a check that makes `gate` fail or `done` refuse because another session used the stash; or a builder that pops, applies or drops an entry to put the stash right.

**Approaches.**

- What the check should see, three ways. (1) Wording only: nothing checks. (2) Wording and a comparison of the stash at `start` with the stash at `gate` and `done`: sees an entry left behind and an entry that is gone; does not see a stash followed by a pop, which is what the issue reports. (3) Those, and a search for the commit a dropped stash leaves in the object store: sees the reported case too, but by the shape of a commit, at the cost of a walk through the object store, and it is a guess. Way (3) was the builder's first pick and was withdrawn when the user said the aim is that the builder does it no more: it serves the knowing, not the keeping from it.
- How to keep the builder from it, two ways. (A) Wording: the texts of step 4 name the way without a stash and forbid it, where the builder reads when it happens. Small; touches nothing the session on issue 8 touches. Its tests can show that the sentences are there, not that a builder obeys them. (B) The wording and a hook that refuses a `git stash` command while a run is under way: a stash cannot happen; but it runs before every shell command of every session, knows a command by its text and would refuse harmless ones, and lies in the hooks, which the session on issue 8 changes. The builder's pick was A, and B as a spec of its own after issue 8 if stashes still happen. The user: "A", and after a second opinion on both: "Vậy A đi".
- A check afterwards beside A, two ways. (1) None. (2) The comparison of way (2) above, only printed: never a failed `gate`, never a refused `done`, because the stash is shared and the line cannot say who did it. The builder's pick was 2: it is the signal that the wording was not enough, and it sees the two cases in which something is lost (an entry of the user's is gone; the builder's code was left in the stash). The user: "2".

**Decided by the user.**

- The aim: "Builder không làm nữa".
- Way A, wording, and no hook: "A"; "Vậy A đi".
- The comparison of the stash, only printed: "2".
- The whole design as the builder told it back, with its three own proposals (the ban covers every form of stash, one with a label too; the files of the four agents are not changed; the README is not changed). Asked what the builder suggests, and told "build it as told, with all three": "Đồng ý".
- Set with the request: this spec is Spec 5 and its IDs are `S5-F1-S<n>`, whatever the coverage file's highest section is in this branch; the version is not touched; no push, no merge.

**The design, as agreed.** The user agreed to its content, told in Vietnamese. The English sentences quoted below are the builder's wording of it, and so is the point that a `STASH` line holds the entry's message; the user approves them with this spec.

1. *Wording, in three places.* The sentences that stand there stay word for word (tests hold them); sentences are added.
   - `skills/build-implement/SKILL.md`, item 4, after "undo that one edit by hand (your code is not committed yet).":

     > Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards. Never `git stash` for this, in any form: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.

   - `skills/build-implement/tdd.md`, the item "A test that passes at once on this run's own code", after "that would throw the step's work away.":

     > Never `git stash` either, in any form: the stash is one stack shared by every worktree of the repository. Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards.

   - `skills/build/SKILL.md`, the rule "Git, in the code repository", after "Never stash, reset, rebase, amend or switch branches.":

     > No `git stash` in any form, with a label or without, whatever else the session is told about stashing: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session. `$H start` records what the stash holds, and `$H gate` and `$H done` print a line `STASH ADDED` or `STASH GONE` for each entry that has come or gone since (step 5).

2. *The comparison, in `scripts/hstack.ts`.* `start` records which entries the stash of the code repository holds. `gate` and `done` compare the stash with that record and print one line for each entry that is there now and was not at `start` (`STASH ADDED: …`) and one for each entry that was there at `start` and is not now (`STASH GONE: …`); the line holds the entry's message, as `git stash list` shows it. The lines are information: `gate` exits as it would without them, and `done` ends the run as it would without them.

3. *What the builder does with a line,* in `skills/build/SKILL.md`. Step 5, a paragraph of its own before "Save the output to `$S/gate.txt`.":

     > A `STASH ADDED` or `STASH GONE` line says that the stash of the repository is not as `start` found it: an entry has been added, or an entry that was there is gone. The line does not say who did it: the stash is shared with the user and with every other session. It does not make the gate fail. Run no stash command to put it right: no pop, no apply, no drop. Step 10 lists each such line under "Needs your ruling", with what you know of it: whether this run made the change.

   And step 10, the item "The log", names these lines among what the entry holds under "Needs your ruling".

**Left to the builder.** The tests, which make and change a stash only in throwaway repositories in temporary folders, never in this repository. The name and the form of the state file `start` writes. What a `STASH` line holds besides its first words and the entry's message. How an entry is known to be the same one at `start` and later. What `gate` and `done` print about the stash for a run whose `start` recorded none (a run started by an earlier version). The playbook's words for a `STASH` line that `done` prints after the log entry is written. The exact words step 10's log item gets, beyond naming the two lines.

## 3. Behaviours

1. Item 4 of `skills/build-implement/SKILL.md` holds ``Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards.``, after the words `undo that one edit by hand`, which it still holds.
2. That item holds ``Never `git stash` for this, in any form: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.``
3. In `skills/build-implement/tdd.md`, the item that starts with `**A test that passes at once on this run's own code.**` holds ``Never `git stash` either, in any form: the stash is one stack shared by every worktree of the repository.``, after the words ``never restore the file with `git checkout` ``, which it still holds.
4. That item of `tdd.md` holds ``Undo a small break by the opposite edit; before a break that takes a whole file's change away, copy the file to a temporary folder outside the repository, and copy it back afterwards.``
5. In `skills/build/SKILL.md`, the rule that starts with `**Git, in the code repository.**` holds ``No `git stash` in any form, with a label or without, whatever else the session is told about stashing: the stash is one stack shared by every worktree of the repository, and a stash or a pop made by a run can take or drop an entry of the user or of another session.``, after the words `Never stash, reset, rebase, amend or switch branches.`, which it still holds.
6. That rule holds ``` `$H start` records what the stash holds, and `$H gate` and `$H done` print a line `STASH ADDED` or `STASH GONE` for each entry that has come or gone since (step 5).```
7. When an entry is added to the stash of the code repository after `hstack.ts start`, `hstack.ts gate` prints a line that starts with `STASH ADDED: ` and holds that entry's message.
8. When an entry that the stash held at `hstack.ts start` is no longer in it, `hstack.ts gate` prints a line that starts with `STASH GONE: ` and holds that entry's message.
9. When the stash holds the same entries as at `hstack.ts start`, `hstack.ts gate` and `hstack.ts done` print no line that starts with `STASH`.
10. A `STASH` line does not change the exit code of `hstack.ts gate`: with such a line and nothing else wrong, it exits 0.
11. `hstack.ts done` prints the same `STASH ADDED: ` and `STASH GONE: ` lines as `gate` would, and still ends the run: it prints `done at <HEAD>` and exits 0.
12. Step 5 of `skills/build/SKILL.md` holds ``Run no stash command to put it right: no pop, no apply, no drop.`` and ``Step 10 lists each such line under "Needs your ruling", with what you know of it: whether this run made the change.``
13. In step 10 of `skills/build/SKILL.md`, the item that starts with `**The log.**` names `STASH ADDED` and `STASH GONE` among what the entry holds under "Needs your ruling".

## 4. Against the record

Nothing in the record goes against this spec. What was looked at:

- `tests/skills.test.mjs` holds, word for word, "undo that one edit by hand", "break that code, see the test fail, undo that one edit by hand" and "never restore the file with `git checkout`". All three stay; sentences are added after them (behaviours 1 and 3).
- The playbook's sentence "Never stash, reset, rebase, amend or switch branches." stays (behaviour 5).
- `agents/mutator.md` already says "Never commit, never stash." It is not changed.
- `docs/specs/2026-11-21-mockup-server.md`, section 4, item 10: an earlier draft spec for this issue was deleted on the user's word, with no copy kept. Nothing of it is used here.
- `docs/specs/2026-11-21-brainstorm-and-grill.md`, section 6: "Feedback issue 4 (a stash made during a run): it stays open, and is taken up after 0.4.2 with this new step 1." This spec is that.
- The steps that name the version (S2-F1-S40, S3-F1-S7) and their tests are not touched.

## 5. Open points

None.

At the approval the header of this file becomes `stable` with the user's approval noted, as the headers of specs 1 to 3 did; no other line changes.

## 6. Not in this spec

- **The version number.** No change to `"version"` in `.claude-plugin/plugin.json`, to the number at the start of the README's status paragraph, or to any test of the version. This change is released in 0.4.4 together with the fix of feedback issue 8, and the session on issue 8 carries the number.
- Any change to `README.md`: it does not describe `gate` or `done`, and its status paragraph gets no sentence on this.
- A hook that refuses a `git stash` command during a run (way B): a spec of its own, after feedback issue 8, if the user wants it.
- A search for the trace of a stash that was made and popped again.
- A `gate` that fails or a `done` that refuses because of the stash.
- The files of the four agents, the two hooks, `hooks/hooks.json`, the brainstorm and grill skills.
- Feedback issues 5, 7 and 8.
- A push of this branch, the merge into `main`, and a comment on or the closing of feedback issue 4: on the user's word, after this run.
