---
type: spec
title: "Spec 8: the last reply is written for a person who did not see the run, the builder says a line before and after each step, and the log entry is written first for the agent of a later session"
description: "Three changes to the texts of the build loop, built together. The last reply of a run is written as a new file beside the playbook says (`skills/build/last-reply.md`): for a reader with little context, self-contained, in plain words. From the approval on the builder says in a line what it is about to do before each step and what the step found after it. The log entry is written first for the agent of a later session, so a decision's number and a test's name come with the path of the file that holds them. The version goes to 0.4.6."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-23T10:45:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-23T10:51:00+07:00" }
sources:
  - id: spec-2
    resource: /specs/2026-11-21-brainstorm-and-grill.md
  - id: spec-3
    resource: /specs/2026-11-22-script-call-and-dir-rule.md
  - id: spec-4
    resource: /specs/2026-11-22-turn-reference.md
  - id: spec-6
    resource: /specs/2026-11-22-design-before-code.md
  - id: spec-7
    resource: /specs/2026-11-22-design-follow-ups.md
---

# Spec 8: the last reply is written for a person who did not see the run, the builder says a line before and after each step, and the log entry is written first for the agent of a later session

## 1. The request

The user gave two sections of a prompting guide ("Make reports easy to follow" and "Signal intent") and asked:

> Can they adapt to hstack? If yes give me some suggestion and explain why

To the builder's first suggestion, which took the reader of the log entry to be a person:

> 1. Log entry ưu tiên cho agent

To the builder's three items (1: the guide's text "Communicating clearly" at the last reply; 2: the guide's text on saying what you do, as a line before and after each step; 3: the log entry for the agent of a later session):

> 1 2 3 làm chung hết

To the builder's first message of the brainstorm, with its pick for each of two points and its other proposals:

> Theo đề xuất và không cần thêm link của anthropic

## 2. Agreed in the brainstorm

**Why.** Three texts of the loop each have one reader, and the playbook does not write for that reader today.

- The last reply is read by the person who approved the spec and saw nothing of the run. The playbook says what the reply holds and nothing on how it is written. After a large run it carries names the run made up (a decision's number, a test's label) with no word on what they are.
- Between the approval and the last reply the playbook asks the builder for no text at all, for the whole run. The user, who watches the run, sees tool calls only.
- The log entry is read first by the builder of the next run (the playbook's step 1 has it read "the open or carried items of the last log entry"). The playbook calls it "the log a person reads". For an agent a number or an ID is a good handle, when the agent can find the file that holds it. Today's log has names with no file, for example `the new test "F9" checks each class as a selector`.

**Goals.** The last reply can be understood by itself. The user can follow a run step by step. An agent that reads a log entry can open the file behind each decision's number and each test's name.

**Not goals.** A change to what the last reply holds or to the order of it. A change to the four agents' files or to the form of their reports. A new order or new headings for the log entry. A reminder made by a hook.

**What would make it a failure.** A line before or after a step that asks the user a question or ends the turn. A run whose task names its own reply and that replies with anything more than that. A log entry that loses an ID or a label because a sentence took its place.

**Approaches, and what the user decided.**

- **Where the text on how to write the last reply stands** (about 200 words). (a) A file of its own, `skills/build/last-reply.md`, which the playbook tells the builder to read just before it writes the last reply: the text is then fresh at the end of a long run, and the playbook gains one sentence. (b) In the playbook itself, after the paragraph "The last reply": one file less, and more of the how of step 10 in the playbook, which the log of 2026-11-23 already lists as a debt. The builder picked (a). The user: "Theo đề xuất".
- **The words of that text.** The guide's two paragraphs, near word for word, with the reader changed to the person who approved the spec and did not see the run. Not a shorter text of the builder's own: the guide's authors measured their text, and nobody measured a shorter one. The user, to item 1 as the builder told it: "1 2 3 làm chung hết".
- **The source of that text.** The builder proposed a link to the guide in the README, and no licence file beside the new file: the builder saw no licence on the part of the guide's page that it read, and did not check the terms of the page. The user: "Theo đề xuất và không cần thêm link của anthropic". So the README holds no link to the guide, and no licence file is written.
- **The line before and after each step.** One new item in "Rules for the whole run", with the words of behaviour 6. It holds from the approval on. A task that names its own reply gets none of these lines: such a run is started by one command and nobody watches it. The user: "Theo đề xuất".
- **The log entry.** A decision's number and a test's name come with the path of the file that holds them. A step's ID (`S1-F1-S38`) needs no path: the coverage file defines every one. A project's own rule for its log comes first. The user: "1. Log entry ưu tiên cho agent", and "Theo đề xuất" to these words.
- **The three sentences that say the log is for a person.** They change as behaviours 9 to 11 say. The user: "Theo đề xuất".
- **The version.** (a) 0.4.6. (b) It stays 0.4.5. Version 0.4.5 is installed, in a folder named by its number; the builder expects that an update with the same number does not bring the new texts, and has not checked it. The builder picked (a). The user: "Theo đề xuất".

**Left to the builder.** The words of `skills/build/last-reply.md` beyond the phrases of behaviours 1 to 3. Where in "Rules for the whole run" the new item stands. What the README says of the three changes beyond the version, with no link to the guide. What the decisions file says of where the text came from. Where in a log entry a path stands.

## 3. Behaviours

A text in backticks is in the named file word for word. "The playbook" is `skills/build/SKILL.md`.

**The last reply**

1. The file `skills/build/last-reply.md` exists and holds `Write for an intelligent but low-context reader.` and `The person reading approved the spec and has not seen the run`.
2. `skills/build/last-reply.md` holds `Put the key points in the first few sentences.`, `what you found, what you did, and what is next` and `Do not use a term or abbreviation that you made up during the work.`
3. `skills/build/last-reply.md` holds `Write mostly in the style of ASD-STE100 Simplified Technical English: short sentences, one idea per sentence, active voice` and `Use a paragraph of flowing prose where ideas connect, and keep bullets for lists of separate items.`
4. In the playbook, the paragraph that starts with `**The last reply.**` holds `Before you write it, read `last-reply.md``.
5. That paragraph still holds `When the task names its reply, reply exactly that, and nothing else.`, `end with the short form of the log entry` and `` `$H times` ``.

**A line before and after each step**

6. In the playbook, the section `## Rules for the whole run` holds an item that starts with `**Saying what you do.**` and holds `From the approval on, say in a line what you are about to do before each step, and in a line what it found after it.`
7. That item holds `Each is text inside the turn: never a question, never the end of the turn, and no part of the last reply.` and `A task that names its own reply gets none of these lines.`

**The log entry**

8. In the playbook, step 10, the item that starts with `**The log.**` holds `The entry is written first for the agent of a later session, which saw nothing of this run: a decision's number and a test's name come with the path of the file that holds them.` and `A project's own rule for its log comes first.`
9. The playbook no longer holds `the log a person reads`; the item that starts with `**The project's records.**` holds `the log of the runs`.
10. The playbook no longer holds `The records are for a person who was not here`; step 10 holds `The records are for whoever was not here, first the agent of a later session and then a person:`.
11. In step 10 of the playbook, the line of `progress/progress.md` holds `the log of the runs, written first for the agent of a later session.` and still holds `One entry per run, appended, never edited.`
12. The item that starts with `**The log.**` still holds `STASH ADDED`, `design findings outside the change` and `"Design debt", with each line that a split left in an old file to export the moved code again`.

**The version**

13. `.claude-plugin/plugin.json` holds `"version": "0.4.6"`, and the README's status paragraph starts with `**Status: v0.4.6.**` and still holds the words `brainstorm` and `grilled`.

## 4. Against the record

1. **The version in five earlier steps** (the user's: approved steps). Each says that `.claude-plugin/plugin.json` holds `"version": "0.4.5"` and that the README's status paragraph starts with `**Status: v0.4.5.**`: S2-F1-S40 (spec 2), S3-F1-S7 (spec 3), S4-F1-S21 (spec 4), S6-F1-S43 (spec 6) and S7-F1-S11 (spec 7), all in `progress/feature_list.json`. With behaviour 13 each of them states 0.4.6, and the version in its test changes with it: `tests/brainstorm-texts.test.ts` "40:", `tests/script-call-and-dir-rule.test.ts` "7:", `tests/turn-reference-texts.test.ts` "21:", `tests/design-before-code-texts.test.ts` "36:" and its line `b36`, `tests/design-follow-ups-texts.test.ts` "11" and its line `b11`. Nothing else of those steps changes. The user, to the builder's pick "Lên 0.4.6": "Theo đề xuất".
2. **The reader of the log and of the records** (the user's: a design whose decisions the user answered). `plugin-dev/2026-11-20-records-and-questions.md`: "the builder finds the project's records from its instructions and README: the feature list, the log a person reads, a coverage file and a place for specs". The playbook took the phrase over in three places. Now the log entry is written first for the agent of a later session (behaviours 8 to 11). No earlier step holds the phrase. The user: "1. Log entry ưu tiên cho agent". The design file is not edited: it stays as history.
3. **A licence beside a copied text** (the user's: approved steps). Three earlier copies each have a licence file: `scripts/LICENSE-mockup` (S1-F1-S42: "A file `LICENSE-mockup` lies beside the script, names the files it covers and holds the original's licence text with its copyright line"), `skills/brainstorm/LICENSE-brainstorm` (S2-F1-S14) and `skills/grill/LICENSE-grill` (S2-F1-S30); the builders of those runs also wrote into the decisions file where each copy came from and every edit to it. `skills/build/last-reply.md` holds two paragraphs taken from the guide, near word for word, and gets no licence file. Those steps speak of their own files and stay true. The user: "Theo đề xuất", to the builder's "không có file LICENSE-*".

Looked at and not against this spec:

- `plugin-dev/2026-11-20-records-and-questions.md`: "When it names none, the builder ends with the short form of the log entry." It stays (behaviour 5); the new file says how that reply is written.
- `plugin-dev/2026-11-20-setup-times-and-canary.md`: "a project's log says what the product does, and in a client's project it is the client's." It stays: a project's own rule for its log comes first (behaviour 8).
- Step S2-F1-S5: the playbook holds `Do not guess whether a person is in the session`. The lines of behaviour 6 depend on whether the task names its own reply, which the task itself says.
- Steps S5-F1-S13, S6-F1-S39 and S7-F1-S7, on what the item "The log" holds: behaviour 12 keeps their texts.
- `tests/skills.test.mjs`, "the times go to the last reply, not to a record": the line that starts with `**The last reply.**` still holds `` `$H times` `` (behaviour 5).

## 5. Open points

None.

## 6. Not in this spec

- The four agents' files and the form of their reports.
- The turn that shows a spec, and the turns of a brainstorm and of a grill.
- The order and the headings of a log entry; a rewrite of earlier log entries.
- A reminder, made by a hook, that tells the builder to say what it is doing.
- A link to the guide in the README, and a licence file for the text taken from it.
- The debt that the how of steps 2, 9 and 10 stands in the playbook.
