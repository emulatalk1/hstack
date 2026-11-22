---
type: spec
title: "Spec 3: both words first when calling the script, and the rule on `dir` holds until `start`"
description: "Two fixes of wording the user ruled on after 0.4.2: the sentence on calling the script names the form with both words first and the shell function second, in the playbook and in the feedback skill; the brainstorm skill's rule that no command of the script runs but `dir` holds until the playbook's `start`, so that it agrees with its part \"Builder check\", and its rule that nothing in the repository changes before the approval excepts the spec file. hstack 0.4.3."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-22T01:25:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-22T09:56:15+07:00" }
sources:
  - id: spec-2
    resource: /specs/2026-11-21-brainstorm-and-grill.md
---

# Spec 3: both words first when calling the script, and the rule on `dir` holds until `start`

## 1. The request

The user, 2026-11-22:

> Sửa hai chỗ chữ trong hstack, cả hai đều ghi ở mục cuối của progress/progress.md:
>
> 1. Trong skills/build/SKILL.md và skills/hstack-feedback/SKILL.md, câu hướng dẫn cách gọi script đang đưa cách dùng shell function lên trước. Trong một lượt chạy thật, công cụ đã từ chối cách này ("Contains brace with quote character"). Đổi cho cách viết đủ hai từ (bun "<đường dẫn>/scripts/hstack.ts" ...) đứng trước, shell function chỉ là cách phụ.
>
> 2. Trong skills/brainstorm/SKILL.md, mục "In hstack" nói trong lúc brainstorm không chạy lệnh nào của script ngoài `dir`, nhưng phần "Builder check" lại bảo chạy `$H spec <file>`. Sửa cho hai chỗ khớp nhau.

## 2. Agreed in the brainstorm

**Why.** Both are in the last entry of `progress/progress.md`. In a real turn the coding tool refused the form the playbook names first for calling the script, a shell function ("Contains brace with quote character"); the builder lost a call and then wrote both words out. And the brainstorm skill says two things that cannot both hold: its section "In hstack" lets no command of the script run "during the conversation" but `dir`, and its part "Builder check", which belongs to the same conversation, says to run `$H spec <file>`.

**Goals.** A builder that reads the sentence on calling the script takes the form that works first. A builder that reads the brainstorm skill finds one rule: only `dir` until the playbook's `start`, and after it the commands the playbook names.

**Not a goal.** Any change to the script, to the stop hook, or to what a builder does in a brainstorm. **A failure** would be a text that lets a command of the script but `dir` run before `start`, or that takes `spec <file>` out of the part "Builder check".

**Approaches.**

- The sentence on calling the script: one way, the one the request names. The builder's first message gave the sentence as it would stand; the user did not correct it.
- The contradiction, two ways. (a) Change the section "In hstack": its rule holds until the playbook's `start`. (b) Change the part "Builder check": no `spec <file>` there. Way (b) does not fit: that phrase of the part is behaviour 24 of spec 2, which the user approved; and the command is needed, because at the builder check `start` has run, and the stop hook holds a turn that ends after `start` with no spec shown. The builder's first message said so and gave the new words of the section; the user did not correct them. Way (a).
- The version, two ways, put to the user as a question. Stay 0.4.2: only the three skill files change, and the builder could not establish whether an update brings new text to an installed copy when the number is the same (the installed copy lies in a folder named by the version). Go to 0.4.3: `.claude-plugin/plugin.json` and the README's status line change too, and step 40 of spec 2 gets new words and its test a new number. The builder's pick was 0.4.3. The user: "Theo suggest".

**Decided by the user.** The version is 0.4.3 ("Theo suggest"). The request itself: both words first, the shell function a second way; the two places of the brainstorm skill agree.

**The words.** Proposed by the builder in its first message; the user agreed to them in the grill (answers 2, 6, 7 and 8, below):

- The sentence on calling the script, in both files, after the sentence that says what `H` is:

  > In a command, write both words out (`bun "<the path>/scripts/hstack.ts" <verb>`): a variable that holds `bun <path>` is not split into two words by every shell. A shell function (`H() { bun "<the path>/scripts/hstack.ts" "$@"; }`) also works, but a coding tool may refuse a command that defines one.

- The fourth point of the section "In hstack" of `skills/brainstorm/SKILL.md`:

  > - **Nothing in the repository changes before the spec is approved but the spec file itself,** and until the playbook's `start` no command of the loop's script runs but `dir`: the loop's stop hook would hold such a turn. From `start` on, the playbook says which command runs (`spec <file>` before a question to your human partner). A spike is built outside the repository, and mock-ups live in the loop's state folder.

- The playbook's own sentence in its item "Brainstorm" ("During the brainstorm nothing in the repository changes and no verb of `$H` runs but `dir`") stays as it is: that item stands before the item "Start".

**Settled in the grill of 2026-11-22** (two rounds, each question with the builder's recommended answer; the user, to questions 1 to 5: "Đồng ý q1-q5"; to questions 6 to 8: "Đồng ý hết").

1. The reason beside the shell function stays general, "a coding tool may refuse a command that defines one": the sentence names no tool and does not quote the tool's message, which is one tool's and may change.
2. The same point of "In hstack" opened with "Nothing in the repository changes before the spec is approved", while the spec file itself is written into the repository before the approval (the playbook: "until then the spec file is the only change"). It is put right in this spec, with one clause: "but the spec file itself" (behaviour 8; the words are in the quote above).
3. The two earlier lines of the record that this spec replaces (section 4, items 2 and 3) stay as they were written. This run's decisions file and log entry name them and say they are replaced.
4. No real session turn is run for this spec. That the coding tool takes the form with both words was seen in this session: the builder called `bun "<the path>/scripts/hstack.ts"` with `dir`, `start` and `spec`, and no call was refused. The log entry says so; the rest is checked in the texts.
5. After the run the commits stay on this branch: no push and no merge into `main` until the user says so.
6. The sentence on calling the script stands as quoted above, in both files. Its clause on a variable that holds `bun <path>` is the earlier one, kept: it is the reason for writing both words out.
7. The middle of the point of "In hstack" stands as quoted above. The playbook's `repo <path>`, which a project with a code repository of its own runs before `start`, is in the playbook's first item, before the brainstorm skill is entered, and does not go against it.
8. The playbook's own sentence in its item "Brainstorm" stays as it is. In the README's status paragraph only the number changes: no new sentence on this fix and no new link to a design.

**Left to the builder.** The tests.

## 3. Behaviours

1. In `skills/build/SKILL.md`, the paragraph that starts with `` `H` below is `` holds ``In a command, write both words out (`bun "<the path>/scripts/hstack.ts" <verb>`)``, and these words stand before the words `shell function`.
2. That paragraph holds ``A shell function (`H() { bun "<the path>/scripts/hstack.ts" "$@"; }`) also works, but a coding tool may refuse a command that defines one``, holds ``a variable that holds `bun <path>` is not split into two words by every shell``, and no longer holds `call it through a shell function`.
3. In `skills/hstack-feedback/SKILL.md`, the paragraph that starts with `` `H` below is `` holds ``In a command, write both words out (`bun "<the path>/scripts/hstack.ts" <verb>`)``, and these words stand before the words `shell function`.
4. That paragraph holds ``A shell function (`H() { bun "<the path>/scripts/hstack.ts" "$@"; }`) also works, but a coding tool may refuse a command that defines one``, holds ``a variable that holds `bun <path>` is not split into two words by every shell``, and no longer holds `call it through a shell function`.
5. The section `## In hstack` of `skills/brainstorm/SKILL.md` holds ``until the playbook's `start` no command of the loop's script runs but `dir` `` and no longer holds `during the conversation but`.
6. That section holds ``From `start` on, the playbook says which command runs (`spec <file>` before a question to your human partner)``.
7. `.claude-plugin/plugin.json` holds `"version": "0.4.3"`, and the README's status paragraph starts with `**Status: v0.4.3.**`.
8. The section `## In hstack` of `skills/brainstorm/SKILL.md` holds `Nothing in the repository changes before the spec is approved but the spec file itself`.

## 4. Against the record

1. **The version in step 40 of spec 2** (the user's: an approved step, S2-F1-S40). `docs/specs/2026-11-21-brainstorm-and-grill.md`, behaviour 40: "`.claude-plugin/plugin.json` holds `"version": "0.4.2"`, and the README's status paragraph starts with `**Status: v0.4.2.**` and holds the words `brainstorm` and `grilled`." Now 0.4.3 in both places; the words `brainstorm` and `grilled` stay. Put to the user as a question in the brainstorm; the user chose 0.4.3 ("Theo suggest"). The step's words in the feature list and its test take the new number.
2. **"Not changed"** (an earlier decision of a builder). `docs/specs/2026-11-21-brainstorm-and-grill.decisions.md`, E19: "The playbook's line on calling the script through a shell function was refused by the coding tool in the one real turn of this run ("Contains brace with quote character"); the builder then wrote both words out, the other form the line names. Not changed: the line is older than this spec." Now changed, on the user's ruling in the log entry of 2026-11-22 and this request (behaviours 1 to 4).
3. **The order of the two forms** (an earlier decision of a builder). `docs/plans/2026-11-20-spec-and-records.md`: "The line on `H` in `skills/build/SKILL.md` and `skills/hstack-feedback/SKILL.md` now says to call the script through a shell function or to write both words out." Now the other order, by the request (behaviours 1 to 4).

The lines of items 2 and 3 are not edited: they stay as history (the grill, answer 3).

Kept, not against it: behaviour 24 of spec 2, the part "Builder check" with ``run `$H spec <file>` before that message``, is not touched. The string `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts"`, which `tests/skills.test.mjs` pins, stays in both files. The pages of the mock-up server show the plugin's version, which they read from `.claude-plugin/plugin.json`: they show 0.4.3 with no change to the server.

## 5. Open points

None.

At the approval the header of this file becomes `stable` with the user's approval noted, as the headers of specs 1 and 2 did; no other line changes.

## 6. Not in this spec

- Any change to `scripts/hstack.ts` or to the stop hook.
- The stop hook that holds a brainstorm turn after the user's own commit: feedback issue 8.
- Feedback issues 4, 5 and 7.
- A real session turn with the new texts (the grill, answer 4).
- A push of this branch, the merge into `main`, and updating the installed plugin on a machine: on the user's word, after this run (the grill, answer 5).
