---
type: decision
title: "Decisions of the builder: Spec 8, the last reply, a line before and after each step, the log for a later agent"
description: "What the builder decided alone while building spec 8: the entry points, 18 edges with the test of each, its design, the gate's fourteen removed lines, what the planted faults led to, and where the text of `skills/build/last-reply.md` came from with every edit made to it. Not approved by the user."
status: draft
generated: { by: claude-code/2.1.328, at: "2026-11-23T12:30:00+07:00" }
sources:
  - id: spec
    resource: /specs/2026-11-23-last-reply-step-lines-and-log.md
---

Decided by the builder while building docs/specs/2026-11-23-last-reply-step-lines-and-log.md. Not approved by the user.

# Decisions of the builder: spec 8, the last reply, a line before and after each step, the log for a later agent

The behaviours are the spec's (`docs/specs/2026-11-23-last-reply-step-lines-and-log.md`, section 3). This file holds what the builder decided alone. `P` is the playbook, `skills/build/SKILL.md`; `L` is the new file `skills/build/last-reply.md`; `E` is the builder's test file `tests/last-reply-step-lines-and-log-edges.test.ts`; `O` is the oracle's test file `tests/last-reply-step-lines-and-log-texts.test.ts`.

## Entry points

- `P`, which a builder reads when the skill `hstack:build` is invoked: the new item of "Rules for the whole run", the item "The project's records." of step 1, the first paragraph of step 10, its line of `progress/progress.md`, its item "The log.", and the paragraph "The last reply.".
- `L`, which a builder reads when the paragraph "The last reply." of `P` sends it there. Nothing else names the file but the README.
- `.claude-plugin/plugin.json`, the field `version`, which the plugin manager reads.
- `README.md`, the status paragraph, which a person reads: the version, and what the loop does.
- Looked at and not changed: the four files of `agents/` (an agent reads its own file and what it is started with, never `P`); `skills/brainstorm/SKILL.md`, `skills/grill/SKILL.md`, `skills/build-implement/SKILL.md` and `skills/hstack-feedback/SKILL.md` (none speaks of the last reply, of a line before a step or of the reader of the log); `scripts/hstack.ts` (the three hooks judge a turn by the state of the repository and of the run, not by text the builder writes inside the turn).

## Edges

- E1. How the builder finds `L`. `P` gives its place as step 6 of `P` gives the place of the design files: `${CLAUDE_PLUGIN_ROOT}/skills/build/last-reply.md`, and, if that variable is empty, beside `P` in this skill's base directory. Test: E "E1:"
- E2. A task that names its own reply. The paragraph first says "reply exactly that, and nothing else", and the sentence on reading `L` stands after the sentence on the reply the task does not name, so `L` is read only for a reply the builder writes itself. The whole paragraph stays one line, as `tests/skills.test.mjs` ("the times go to the last reply, not to a record") needs. Test: E "E2:"
- E3. `L` and what the reply holds. `L` says how the reply is written; what it holds and in what order stays in `P` (a test that already failed at the base, first). `L` says so, so that "Put the key points in the first few sentences" moves nothing of that order. Test: E "E3:"
- E4. The output of `$H times` in the reply. `P` says "as it is"; `L` says that these lines are not rewritten. Test: E "E4:"
- E5. A name the run made up, in the last reply (a decision's number, a test's name, a step's ID). The guide's sentence "Say what the thing is in a way any reader would understand" stays; one sentence more says that such a name may follow what it names, in brackets, and never stands for it, so that the user can find the thing in the record. Test: E "E5:"
- E6. `L` is a file of a skill, not a skill: no header block, it starts with a heading, as `skills/build-implement/tdd.md` does. Test: E "E6:"
- E7. Where the item "Saying what you do." stands: the last item of "Rules for the whole run", after "Recording.", which says what is done after each step. Its words are the bold name and the three sentences the user saw, and nothing more. Test: E "E7:"
- E8. A step that is recorded as skipped, and an update inside a long step. The item's three sentences are the user's; the builder adds none. A skipped step gets its line after it like any step (the line says that it was skipped and why). No test: nothing is written for it.
- E9. The lines and the stop hook. Text inside a turn ends no turn and changes nothing in the repository; `scripts/hstack.ts` is not changed. No test: the base already decides it (`tests/turn-reference.test.ts` pins what holds a turn).
- E10. The lines and the agents. An agent's reply is its report "and nothing else"; the item is in `P`, which no agent reads. No test: the spec puts the agents' files outside (section 6).
- E11. Where the two sentences of behaviour 8 stand: at the end of the item "The log.", after "No time of a step goes into a record.", on the item's one line. Between them stands one sentence on a step's ID, which the user agreed to in the brainstorm (the spec, section 2: "A step's ID (`S1-F1-S38`) needs no path: the coverage file defines every one."). Test: E "E11:"
- E12. "Do not repeat the decisions" (the item "The log.") beside the new rule. A decision's number with the path of its file names a decision; it does not repeat it. No test: the two sentences do not meet.
- E13. The first paragraph of step 10 ended "and what waits for their decision", which with two readers named no longer says whose. It now ends "and what waits for the user's decision". Test: E "E13:"
- E14. The five earlier tests that hold "0.4.5" (the spec, section 4, item 1): each takes "0.4.6", in its name and in what it looks for, and nothing else of them changes; the two tables `b36` and `b11` take it too. As the run of spec 6 did (its decision E17). No test: they are the tests.
- E15. The README beyond the version: the status paragraph gets two sentences, on the line before and after each step and on `L` and the log entry, with the path `skills/build/last-reply.md`, no link to that file (neither as the text of a link nor as its target), and no name of the guide. Test: E "E15:" and E "E16:"
- E16. Where the text of `L` came from. No licence file and no link in the README (the spec, section 4, item 3). As for the three earlier copies, this file says where the text came from and every edit (the last section, "The copied part"). `L` itself names no source, and neither does the README's status paragraph. Test: O "edge (holds at the base, and must stay): no licence file lies beside skills/build/last-reply.md" and E "E16:"
- E17. The type-check reads a test file only when `tsconfig.json` names it: `E` is added to its `include` (the oracle added `O`). No test: the type-check itself.
- E18. Earlier steps that the change could touch and that stay true: S5-F1-S13, S6-F1-S39 and S7-F1-S7 (texts of the item "The log."), and the test of `tests/skills.test.mjs` on `$H times`. Test: O "12 (holds at the base, and must stay):" and O "5 (holds at the base, and must stay):"

## Design

The project's own written rules for how code is written: `README.md` ("Every script of the harness and every test is TypeScript, run with Bun (`bun <file>.ts`, `bun test`). Add no new `.sh` or `.mjs` file."). `CLAUDE.md` holds a rule for the end of a turn, none for code. There is no coding-standards file.

What is built is text of a skill, and one test file.

- `skills/build/last-reply.md` (new) owns one rule: how the last reply of a run is written for a person who did not see the run (the reader, a reply that stands by itself, plain words, a name the run made up). It has one reason to change: how a person reads that reply.
- `skills/build/SKILL.md` (changed) owns what the last reply holds and in what order, and when `last-reply.md` is read. It holds a pointer to that file and no copy of its rule.
- `skills/build/SKILL.md` owns the rule of the item "Saying what you do." It stands in "Rules for the whole run" because it holds for every step, as its neighbours do; it is not the how of one step.
- `skills/build/SKILL.md`, the item "The log." of step 10, owns the rule of who the log entry is written for and of the path beside a decision's number and a test's name. It stands there because that item already says what the entry holds. This is how of step 10 that stands in the playbook: it adds two sentences to the debt that the log of 2026-11-23 names; the spec puts that debt outside (section 6).
- Two rules look alike and are not one: a name the run made up, in the last reply (say what the thing is; `last-reply.md`), and in the log entry (keep the name, add the path of its file; the item "The log."). They have two readers and two answers, so each has its own home and neither is a copy.
- The version is one fact, held by `.claude-plugin/plugin.json`. The README's status paragraph repeats it on purpose, for a person who reads the README; `tests/skills.test.mjs` keeps the two equal.
- The README's status paragraph repeats in two sentences what the three changes do, on purpose: it is the one place a person reads what the loop does. It holds no rule a builder follows.
- Added after review round 1 (finding 2: the section named the README's copies and not these). Three sentences repeat, on purpose, a rule whose home is another place. In `skills/build/last-reply.md`, its first paragraph: "The lines of `$H times` stand at the end of the reply as they are printed: do not rewrite them." repeats the playbook's "Then the output of `$H times`, as it is." (the paragraph "The last reply."), because the builder reads `last-reply.md` just before it writes, and its sentence on concision could otherwise be read as a reason to shorten those lines; the same paragraph repeats when the file is read ("when the task names no reply of its own", "Read this file to its end before you write that reply"), so that a reader who opens the file alone knows what it is for. In `skills/build/SKILL.md`, step 10: its first paragraph ("first the agent of a later session and then a person") and its line of `progress/progress.md` ("the log of the runs, written first for the agent of a later session") repeat who the log entry is written for, whose home is the item "The log."; the words of both are the spec's (behaviours 10 and 11), and each stands where the playbook already named a reader.
- `tests/last-reply-step-lines-and-log-edges.test.ts` (new) holds the builder's tests of the edges above, in the form of the earlier `tests/*-edges.test.ts` files; `tsconfig.json` names it.
- No file that existed before the run is split.

## The gate

The gate lists fourteen removed lines of earlier tests, in five files: `tests/brainstorm-texts.test.ts` "40" (three lines), `tests/script-call-and-dir-rule.test.ts` "7" (three lines), `tests/turn-reference-texts.test.ts` "21" (four lines), `tests/design-before-code-texts.test.ts` "36" and its line `b36` (two lines) and `tests/design-follow-ups-texts.test.ts` "11" and its line `b11` (two lines). Each held "0.4.5" and now holds "0.4.6", and nothing else of it changed. All belong to item 1 of the spec's section "Against the record" (the version in five earlier steps), which the user approved. The gate lists no other line and no line on the stash.

## The mutation step

Twenty faults were planted; sixteen were killed, one for each of the thirteen behaviours by that behaviour's own test. Four survived, all in words the spec leaves to the builder; each now has a test in `tests/last-reply-step-lines-and-log-edges.test.ts`, proven by planting the fault once more and seeing the test fail:

- M17, the opening sentence of `skills/build/last-reply.md` ("when the task names no reply of its own" made "a reply of its own"). Test: "M17:", which holds the file's first paragraph word for word.
- M18, a sentence of the taken text removed ("The reply is self-contained: …"), one of a class: any sentence of the two paragraphs outside the phrases of behaviours 1 to 3. Test: "M18:", which holds both paragraphs word for word; also seen failing with two other sentences of the class changed.
- M19, the end of the paragraph "The last reply." of the playbook ("for a person who did not see the run" made "who saw the run"). Test: "M19:".
- M20, the README's sentence on the log entry ("come with the path" made "come without the path"). Test: "M20:".

## The copied part

Where the text of `skills/build/last-reply.md` came from, and every edit made to it. The file names no source, the README holds no link to the source, and no licence file lies beside it (the spec, section 4, item 3: the user's choice); this section is the one place of the record that says it. The terms of use of the page were not checked.

**The source.** The page "Prompting Claude Fable 5.2" of Anthropic's prompt engineering guide, `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2`, read on 2026-11-23: its section "Make reports easy to follow", the block of text that the section tells its reader to add to a system prompt, under the heading "# Communicating clearly" (two paragraphs).

**Taken.** Both paragraphs, word for word, but for the edits below. They are the second and third paragraphs of the file.

**Edits.**

1. The block's heading, "# Communicating clearly", is not taken. The file's heading, "# The last reply", and its first paragraph (what the file is for, when it is read, that what the reply holds and its order stay in the playbook, and that the lines of `$H times` are not rewritten) are the builder's.
2. "The person reading has not seen your tool calls, your reasoning or the files you opened, and may be switching in from other work." is two sentences with the reader changed: "The person reading approved the spec and has not seen the run: not your tool calls, not your reasoning, not the files you opened. They may be switching in from other work." (the spec, behaviour 1).
3. "Messages should generally be self-contained: the reader should understand what you mean without having to dig for other context." is "The reply is self-contained: the reader should understand what you mean without having to dig for other context, such as the log, the decisions file or an earlier message.": "Messages" is "The reply", "generally" is left out, and the three examples are added.
4. One sentence is added after it: "It says what you found, what you did, and what is next." Its words are from the same page, section "Signal intent" ("what you found, what you did, and what's next"); the spec, behaviour 2.
5. One sentence is added after "Say what the thing is in a way any reader would understand.": "A decision's number, a test's name or a step's ID may follow what it names, in brackets; it never stands for it." (edge E5).
6. "but do ensure that your messages have the key context" is "but do ensure that the reply has the key context", and "Aim to make your user-facing text as human-readable and clear as possible." is "Aim to make the reply as human-readable and clear as possible."

**Not a copy.** The item "Saying what you do." of the playbook is written by the builder and the user in the brainstorm, after the idea of the same page's section "Signal intent" (a line before the work, brief updates, a recap that stands by itself); it takes no sentence of that section.
