---
type: spec
title: "Spec 2: step 1 starts with a brainstorm that ends in the spec, and the spec can be grilled before the approval"
description: "Part B of feedback issue 6: the build loop starts with the brainstorming skill the user works with, copied whole and adapted, which ends by writing the spec; the builder's first message always comes, in every session, and the user's answer decides whether the spec is written at once; only what was discussed and agreed is written; the spec has a section for it and is handed over by its path, never pasted; the user may have it grilled with the grill skill they work with. hstack 0.4.2."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-21T20:00:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-21T23:26:55+07:00" }
sources:
  - id: part-a
    resource: /specs/2026-11-21-mockup-server.md
---

# Spec 2: step 1 starts with a brainstorm that ends in the spec, and the spec can be grilled before the approval

## 1. The request

Feedback issue 6 of `emulatalk1/hstack` ("step 1 goes from the request straight to a spec, with no stage to talk the approach over with the user first"), part B. Part A, the mock-up server, is spec 1. The user, in the session of 2026-11-21:

> I dont quite like it, usually i do brainstorming with agent first, then every clear agent can write spec, after that I use grill-me on that spec, then everything clear cover all aspect then i approve the spec. The point of brainstorming that make thing clear avoid vague, like in real life sometimes client does know what they want, we help them develop their idea

> Ý tôi kết thúc brainstorming bằng viết spec, sau đó có thể grill-me spec đó

> Không bỏ cái nào cho brainstorming cả chie cần adapt cho hstack là được, bạn có hiểu ý tôi ko

> Grill cũng là optional sau khi viết spec, kiểu như có muốn double checking trên spec đã viết hay không

> Tại sao bạn lại show toàn văn của spec ở đây?

> Cái gì đây đâu phải yêu càu của tôi, tôi đã nói làm phải thảo luận với nhau rõ ràng trước khi viết xuống mà

## 2. Agreed in the brainstorm

**Why.** A spec written with no talk before it buries the choices: in the case the issue reports, the builder found that half of an agreed fix could not work, and the user first saw that as an open point at the end of twelve behaviours. A person who asks for something has often not finished working out what they want; the brainstorm is where the agent helps them do that.

**Goals.** The loop starts the way the user already works: brainstorm, then the spec, then a grill if the user wants one, then the approval. It does so for anyone who installs hstack, so the two skills are hstack's own. Things are discussed and agreed before they are written down.

**Not goals.** A plan of tasks after the spec. A run that builds without an approval (a one-shot prompt): feedback issue 7. A new state or verb of the script for a question to the user.

**What would make it a failure.** A builder that judges by itself that a request is clear and hands over a finished spec. A builder that writes its own answer to an open question into the spec and asks for the approval of the document. A copy of the brainstorm that is thinner than the one the user works with. A spec pasted whole into the chat.

**Approaches.** (1) A talk that the builder starts only when it finds a problem, with a new verb of the script: the user did not like it. (2) The two skills written anew in hstack's own words: thinner than what the user works with. (3) The session's own brainstorming skill, whichever it has: someone else has none, and it ends in a design document and a plan, not in hstack's spec. (4), picked by the user: the two skills the user works with, copied whole into hstack and changed only where hstack forces it, with their licences beside them.

**Decided by the user.**

- The brainstorming skill is copied whole, nothing left out ("Không bỏ cái nào"); it ends by writing the spec.
- One way for every session. The builder's first message always comes: "this is what I understood, this is what I found, what is wrong?". The user's answer decides: when the builder has it right, the spec is written at once; else the talk goes on. There is no short cut in the request, and the builder does not guess whether a person is there ("Tôi nghĩ trường hợp thường có thể handle luôn case viết spec thẳng luôn được rồi"; "Đúng rôid").
- Only what was discussed and agreed is written into the spec. A question that comes up later, the second agent's too, is brought to the user and discussed first; its answer is written down after ("cuối cùng là có phải thảo luận trước, đồng ý rồi mới viết spec ra file đúng ko?").
- The spec gets this section, "Agreed in the brainstorm"; the decisions file stays what the builder decided alone ("Ok đông ý với bạn").
- The throwaway build is made in a scratch folder outside the repository. The mock-ups use part A's server, their files in the state folder; the server is opened to the network only after the agent asked the user. A second agent reads the spec before the user is asked to approve it. The guide's paragraphs for three other coding tools are not copied. In a session that also has another brainstorming skill, a build uses hstack's. The original's project and author are named in the licence files only ("Không có chỗ nào sai").
- The spec is never pasted whole, in any session: the turn that hands it over gives its path, the points to decide and three choices ("Tại sao bạn lại show toàn văn của spec ở đây?"; on one rule for every session: "Ok"). The script's own messages that say "end this turn with its text" change with it.
- The grill is the user's grill skill copied whole; it runs on the spec, only when the user asks, and its answers go into the spec file. An approval given in the middle of a grill is answered with what the grill changed first. The version is 0.4.2 ("Đồng ya").
- A run from a one-shot prompt that builds without waiting for an approval is not built now: feedback issue 7 ("tạo issue rồi làm sau").
- Settled in the grill of this spec, round 1 (the user: "Question còn lại đồng ý"):
  - The user's "that is right" to the first message settles what is asked, not how it is built: where there is more than one way to build it that the user would see, the builder lays the ways out and the user picks before the spec is written; with one sensible way, the spec is written at once.
  - A place where the request goes against an earlier decision is raised in the brainstorm; the spec's section "Against the record" records what the user chose, and no longer offers lettered options the user sees there first.
  - The spec's section "Open points" holds only what the user said to leave open; the builder's own proposals no longer go there. A spec is then handed over with its path and the three choices, and with a point to decide only when the user left one open.
  - A mock-up server that the brainstorm started is stopped when the brainstorm comes to the spec; the mock-ups stay in the state folder.
  - The two sizes of the original stay: a small change has a short spec and no read by a second agent, a project has the full spec and the read; the builder says which it takes the work for, and the user can change that.
  - In this run, the exploratory tester may run a real first turn of a session with the new plugin on a small sample project, to see that the turn ends with the builder's first message and not with a spec; it costs a little money for the model. The user allowed one such turn, and in round 2 up to three when a turn shows a fault that is then fixed; after three the builder stops and reports.
- Settled in the grill, round 2:
  - The two skills have short names, `hstack:brainstorm` and `hstack:grill` ("tên ngắn").
  - hstack's text at the start of a session says that for a build the brainstorm is hstack's own skill, not another brainstorming skill ("ok").
  - "That is right, go ahead" in answer to the first message is no approval: the spec is still written, handed over and approved before anything is built ("ok").
- Settled in the grill, round 3 ("đồng ý" to both):
  - `/hstack:brainstorm <a request>`, typed by the user, is the start of a build and goes the one way of this spec; it is no free brainstorm that leads to no build. `/hstack:grill` runs only on a spec that waits for the approval; with none waiting it says so and does nothing.
  - A brainstorm that is under way is not kept when the session is cleared or a new one starts: the new session starts it again. A spec that waits is kept, as today. Keeping a brainstorm would need a new state of the script; if the loss hurts, that is a new issue.

**Left to the builder.** The words of each edit, beyond the phrases this spec names. Where in the copied texts the section "In hstack" stands. How step 1 knows that a spec already waits without running `start` (the text at the start of the session, the state folder; no new verb). The tests.

## 3. Behaviours

A text in backticks is in the named file, or in the text the script prints, word for word. "The original" of a copied file is the file of the skill the user works with.

**The playbook (`skills/build/SKILL.md`)**

1. The description holds `asks the user only before the approval` and no longer `asks the user once`; it still holds `written before the code, the implementation, a gate`.
2. The first paragraph holds `You ask the user only before the approval: in the brainstorm, at the spec, and in a grill when the user wants one` and no longer `You ask the user once`; the sentence `After the approval nobody answers a question` is still there.
3. Step 1 has an item `**Brainstorm.**`, which comes before the item `**Start.**`; it holds ``invoke the `hstack:brainstorm` skill`` and `whatever other brainstorming skill the session has`.
4. That item holds `Never leave the brainstorm out by your own judgement` and `Your first message always comes; the user's answer to it decides whether you write the spec at once or the talk goes on`.
5. That item holds `Do not guess whether a person is in the session`.
6. That item holds `If a spec already waits for the user's approval, there is no brainstorm`.
7. The item `**Start.**` holds ``run `$H start` only when the brainstorm has come to the spec``, and says `$S/requirement.md` holds `every message of the user from the brainstorm, verbatim`.
8. The item `**The spec file.**` lists, after the request, a section `**Agreed in the brainstorm**` with `why`, `goals, what is not a goal, and what would make it a failure`, `the approaches considered and the one the user picked`, `what the user decided of the how`, and `what is left to the builder`.
9. That item no longer holds `It holds behaviour only` nor `no code design`; it holds `Of the how, only what the user decided` and `Write into the spec only what was discussed and agreed with the user`.
10. The item `**Show it.**` holds `end your turn with the path of the spec and the three choices`, names the choices as `approve it, say what to change, or have it grilled`, holds `and any point the user said to leave open`, holds `Never paste the whole text of the spec`, and no longer holds `the whole text of the spec and one line`.
11. The item `**The user's next message.**` has a case `A grill:`, which holds ``invoke the `hstack:grill` skill``, `the spec goes on waiting`, and `Never start a grill the user did not ask for`.
12. That case holds ``write it into the spec file, then `$H spec <file>` again`` and `The grill ends with a turn that gives the path, what the grill changed, and the three choices again`.
13. That case holds `An approval given in the middle of a grill is answered with what the grill has changed so far and the three choices; it counts when the user gives it again`.

**The brainstorm (`skills/brainstorm/`)**

14. The folder holds `SKILL.md`, `visual-companion.md`, `builder-check-prompt.md` and `LICENSE-brainstorm`; the licence names the three files it covers and holds the original's licence text with its copyright line.
15. The header of `SKILL.md` has `name: brainstorm`, a description that holds `Invoked by hstack:build at its step 1 and by nothing else` and ends with `invoke hstack:build, not this.`, and no `disable-model-invocation`.
16. `SKILL.md` holds the original's sections `## First: What Do You Actually Know?`, `## Look Before You Ask`, `## Your First Message`, `## The Conversation`, `## Play It Back`, `## Size the Work`, `## Red Flags` and `## Visual Companion`, and its parts `**Get them describing.**`, `**How it gets made.**`, `**Ground to cover.**`, `**Do recon.**`, `**Lay out the approaches.**`, `**Show, don't tell.**`, `**Spike to feel things out.**` and `**Builder check**`.
17. `SKILL.md` has a section `## In hstack`, which says that anyone the loop did not send must ``do nothing here and invoke `hstack:build` ``, and holds `The written design of this skill is the spec of the build loop`.
18. `SKILL.md` no longer holds `This is a quick, clear task. Do it, and say what you did.`; it holds `Even then, send your first message before the spec` and `Their answer to it decides: write the spec at once, or go on with the conversation`.
19. `SKILL.md` holds neither `writing-plans` nor `design doc`; it holds `After the spec is approved, go on with step 2 of the playbook and no other skill`.
20. `SKILL.md` holds `Build a spike in a scratch folder outside the repository`.
21. `SKILL.md` has a section `## The Written Spec` and no section `## The Written Design`; the section names `Agreed in the brainstorm`, and holds `Write into the spec only what was discussed and agreed` and `The playbook's step 1 says where the spec goes and what else it holds`.
22. `SKILL.md` holds `Nothing gets built until your human partner approves the spec`, and no longer `the gate goes with it`; it holds `the spec is still approved before anything is built`.
23. The section `## Look Before You Ask` holds `the project's records`.
24. The part `**Builder check**` holds `Bring the "theirs" pile to your human partner in a message of its own, before you hand the spec over`, `Write an answer into the spec only when they have given it`, and ``run `$H spec <file>` before that message``.
25. `visual-companion.md` gives the commands ``bun "${CLAUDE_PLUGIN_ROOT}/scripts/mockup.ts" start --dir <the state folder>/mockups --open`` and ``bun "${CLAUDE_PLUGIN_ROOT}/scripts/mockup.ts" stop <session folder>``; it holds none of `start-server.sh`, `stop-server.sh`, `--project-dir` and `.gitignore`.
26. `visual-companion.md` holds `Ask the user before you open the server to the network`, `--allow-network`, `reachable_at`, `not encrypted on a local network` and `the machine's tailnet address`.
27. `visual-companion.md` holds none of the names `Codex`, `Gemini` and `Copilot`.
28. `builder-check-prompt.md` holds `You've been handed a spec` and no longer `design document`.
29. None of the three text files of the folder holds the word `superpowers`, in any letter case, and the holder of the licence's copyright line is named in none of them.

**The grill (`skills/grill/`)**

30. The folder holds `SKILL.md` and `LICENSE-grill`; the licence names the file it covers and holds the original's licence text with its copyright line, whose holder is named in no other file of the folder.
31. The header of `SKILL.md` has `name: grill`, a description that holds `Invoked by hstack:build at its step 1 and by nothing else` and ends with `invoke hstack:build, not this.`, and no `disable-model-invocation`.
32. `SKILL.md` holds the original's text: `Interview the user relentlessly until you reach a shared understanding`, `design tree`, `frontier`, `Word each question so "yes" accepts your recommended answer`, the round's form with `❓` and `➡️`, and `Finding _facts_ is your job, never the user's`.
33. `SKILL.md` has a section `## In hstack`, which says that anyone the loop did not send must ``do nothing here and invoke `hstack:build` ``, and holds `It runs on the spec that waits for the user's approval`.
34. That section holds ``Write each answer that changes the spec into the spec file, then run `$H spec <file>` again``, `Change no file but the spec`, and `When the frontier is empty and the user has confirmed, go back to the playbook`.

**The script and the hooks (`scripts/hstack.ts`)**

35. The text `hook-start` prints holds `It starts with a brainstorm with the user, then a spec that the user approves`, `For a build, the brainstorm is hstack's own skill, hstack:brainstorm, not another brainstorming skill`, and `after the approval, follow it to its last step`, and no longer `follow it to its last step before you reply`.
36. The text `hook-start` prints while a spec waits holds `approves it, asks for changes to it or asks for a grill of it`, and names the playbook's item by its name, `The user's next message`, not by a number.
37. What `spec <file>` prints holds `give the user the path of the spec, never its whole text`; neither it, nor the refusals of `approve` and of `phase`, nor the stop hook's reason for a spec that waits, holds `with its text` or `the spec's text`.
38. A turn that ends in a brainstorm (no run started, nothing changed in the repository) is not blocked by the stop hook, and `$H elapsed`, after the `start` that follows, counts no minute of it. 0.4.1 already does this (tried in a throwaway repository); a test of its own now keeps it.
39. A turn that ends in a grill (a spec waits; the spec file was changed and `$H spec <file>` run again; nothing else changed) is not blocked by the stop hook, and `$H elapsed` does not count the wait. 0.4.1 already does this (tried the same way); a test of its own now keeps it.

**The version and the README**

40. `.claude-plugin/plugin.json` holds `"version": "0.4.2"`, and the README's status paragraph starts with `**Status: v0.4.2.**` and holds the words `brainstorm` and `grilled`.
41. In the README's skills table the `build` row holds `Asks only before the approval` and no longer `Asks once`, and there is a row for `brainstorm` and one for `grill`; the row of `skills/` in the table of folders names both.

**From the grill, round 1**

42. The item `**Brainstorm.**` of the playbook holds `The user's "that is right" settles what is asked, not how it is built` and `where there is more than one way that the user would see, lay the ways out and let the user pick before you write the spec`.
43. The item `**The spec file.**` of the playbook says of the section "Against the record": `Raise each of them in the brainstorm; the section records what the user chose`, and no longer holds `and lettered options, the one you recommend first`.
44. The same item says of the section "Open points": `only what the user said to leave open`, and no longer holds `each with your proposal`.
45. `skills/brainstorm/visual-companion.md` holds `Stop the server when the brainstorm comes to the spec; the mock-ups stay in the state folder`.
46. The section `## Size the Work` of `skills/brainstorm/SKILL.md` keeps the original's two sizes, `A small change` and `A project`, and the sentence that a small change goes to the user `without the builder check`; it holds `They can override it`.

**From the grill, round 2**

47. The item `**Brainstorm.**` of the playbook holds `An approval given before the spec exists is no approval: write the spec, hand it over, and wait`.

**From the grill, round 3**

48. The section `## In hstack` of `skills/brainstorm/SKILL.md` holds `Invoked by the user themselves, it is the start of a build`.
49. The section `## In hstack` of `skills/grill/SKILL.md` holds `With no spec waiting for the user's approval, say so and do nothing`.

## 4. Against the record

All six are the user's word of 2026-11-21 (section 2); they are named so that the record shows each change.

1. **"The builder asks once, for the spec."** `docs/plans/2026-11-20-spec-and-records.md`: "It asks the user once, for the spec; after the approval nobody answers a question"; `plugin-dev/2026-11-20-records-and-questions.md`: "a run now has at least two turns, the spec and the build". The user's ruling of 2026-11-20. Now: before the approval the user is asked as often as the brainstorm and the grill take; after it nobody answers, as before (behaviours 1 and 2).
2. **A spec of behaviour only.** The same design: "It holds no tasks, no code design and no file list"; the playbook: "It holds behaviour only". The user's ruling of 2026-11-20 (answer 4). Now: the spec also holds what was agreed in the brainstorm, of the how only what the user decided; still no tasks and no file list (behaviours 8 and 9).
3. **The spec shown as plain text.** The same design: "ends its turn with the spec as plain text"; the playbook: "end your turn with the whole text of the spec"; the script: "end this turn with its text". Now, in every session: the path, the points to decide and three choices (behaviours 10 and 37).
4. **A run from one command ends its first turn at the spec.** The same design, the user's answer 8: "A run started as one command with nobody in the session (`claude -p`): it also ends its first turn with the spec and builds only when resumed with an approval." Now: such a run ends its first turn with the brainstorm's first message, like every other, and the spec comes after the answer (behaviours 4 and 5). It still builds only after an approval; a run that does not wait for one is feedback issue 7.
5. **Text from the second source.** `docs/plans/2026-11-19-build-playbook-tdd.md`: "The test rules are superpowers' test-driven-development skill; mattpocock/skills and addyosmani/agent-skills are not used". A decision of that plan, made for the test rules, when the user had used neither. The grill the user now works with is from the second of those sources, and is copied (behaviours 30 to 34).
6. **Two more skills beside the user's own.** The same plan: "The test rules are files of the `implement` skill, not a skill of their own: a second skill with the upstream description would sit beside `superpowers:test-driven-development` in the user's own sessions and compete with it." Now: two skills, each with a description that sends every other caller to `hstack:build` (behaviours 15 and 31), as `hstack:build-implement` has, and the playbook says which one a build uses (behaviour 3).

Kept, not against it: "nothing else the plugin ships names the upstream project" but a licence file (the 2026-11-19 plan): behaviours 14, 29 and 30. The tests pin words of the playbook and of the hook texts ("hstack:build", "written before the code, the implementation, a gate", "end with exactly the reply the task asked for", "A spec waits for the user's approval:", the nine step headings, no "numbered behaviours"): all of them stay. Step 4's test rules (`tdd.md`: nobody answers after the approval) are not touched.

## 5. Open points

None. Every point was settled in the brainstorm (section 2). Two things a reader should know, which are no choice:

- Nothing in the script proves that a brainstorm took place, and the script does not refuse an approval given in the middle of a grill: both are kept by the playbook's words and the tests that pin them (no new verb, no new state).
- The tests show the texts and the script. Whether a builder then brainstorms well with these texts, and the mock-ups from inside a brainstorm, are seen in the user's first session with 0.4.2.

At the approval the header of this file becomes `stable` with the user's approval noted, as spec 1's did; no other line changes. Where the two originals came from is written in the decisions file beside this spec, as for spec 1.

## 6. Not in this spec

- A run from a one-shot prompt that builds without waiting for an approval: feedback issue 7.
- A verb or a waiting state of the script for a question to the user.
- Keeping a brainstorm that is under way across a cleared or a new session.
- A plan of tasks after the spec (the user, 2026-11-20: not now).
- A change to the mock-up server of spec 1, beyond the version its pages show.
- Feedback issue 4 (a stash made during a run): it stays open, and is taken up after 0.4.2 with this new step 1.
- The merge of parts A and B into `main` and the closing comment on feedback issue 6: both on the user's word, after this run.
