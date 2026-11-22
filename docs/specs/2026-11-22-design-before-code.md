---
type: spec
title: "Spec 6: the builder writes the design before the code, and the reviewer reads the code against it, by the user's design rules"
description: "The user's four design rules enter the build loop at the two moments the user uses them: at step 4 the builder writes a section `## Design` into its decisions before any product code, and at step 6 the reviewer reads the code against that section and against the rules. The rules stand word for word in one file that both read; parts of four third-party works say how to design and how to review; a design finding is fixed in the run by a change of structure that changes no behaviour. hstack 0.4.5."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-22T20:25:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-22T21:05:28+07:00" }
sources:
  - id: spec-2
    resource: /specs/2026-11-21-brainstorm-and-grill.md
  - id: spec-5
    resource: /specs/2026-11-22-no-stash-in-a-run.md
---

# Spec 6: the builder writes the design before the code, and the reviewer reads the code against it, by the user's design rules

## 1. The request

The user, 2026-11-22, with the four design rules they work by (their text is in section 2, "The rules", as it stands after two changes of words the user chose):

> Đây là principle của tôi khi develo skills hay viết code: […] Bạn có ý tưởng gì có thể đưa vào hstack không?

> Ý tôi là có ý tưởng gì appky vào hstack workflow hay ko?

> Tôi thường dùng rule này để thiết kế trước khi code và dùng để review code

And, when the talk had settled what follows: "Ok bắt đầu đi".

## 2. Agreed in the brainstorm

**Why.** The user designs before the code and reviews the code by four rules of their own. In the loop today nothing looks at the structure of the code: the builder goes from the spec to the code with the structure in its head, and the reviewer's file says "No style remarks". The rules alone would not be enough. The user: "Tôi cảm thấy nếu chỉ để rule vào đó thì khá là vague".

**Goals.** The builder writes down how it will arrange the code before it writes the code, so that the arrangement can be checked. The reviewer checks the code against what was written and against the rules, with findings as concrete as its other findings. The rules reach the builder and the reviewer in the user's words, from one file.

**Not goals.** A proof that a reviewer who reads these texts reviews well: the tests of this spec show that the sentences are there, not that an agent obeys them (as in spec 5). A second agent that reads the design before the code is written. A design that the user approves, or that stands in the spec. Any change to the brainstorm. A tool that enforces a rule. A rework of hstack's own skills and script by these rules.

**What would make it a failure.** A reviewer that, asked to find design problems, always finds some and pushes the builder to add layers nobody needs. A builder that leaves its written design without saying so. A run that stops to ask the user about a change of the design. The rules written again in other files, in other words, so that the copies drift apart. A design section left out because the builder judged the work small.

**Approaches.**

- Who reads the design before the code is written, three ways. (A) Nobody: the builder writes the design and codes; the reviewer of step 6 reads the design and the code. Cheapest; a wrong design is found when the code already stands on it. (B) A second agent reads the design by the rules before the code. Found earlier; one more agent in every run; none of the pages of Anthropic that the builder read, and none of the three works the user asked about, has an agent judge a design before the code in its main flow. (C) The user reads it: what those three works do, but the loop would stop once more after the approval, or the design would stand in the spec, in the part of the talk the user keeps for the business ("Brainstorming chủ yếu là disscuss về bussines"). The builder's pick moved from B to A after the reading; A is contained in B, so B can be added later if runs show designs found late. The user did not choose a letter; they chose the rule that only holds under A, and confirmed the builder's summary with it: "quy tắc "sửa bản thiết kế trước, ghi lý do, không dừng run"".
- Where the rules come from, three ways. (a) hstack carries the user's four rules, for every project. (b) Only a project's own rules: a project that states none gets no design check. (c) hstack carries them, and a project's own rules come first: what all three works do. The user: "C".
- A design finding of the reviewer, two ways. (A) The builder fixes it in the run. (B) The builder only reports it, and the code ships with a known design problem. The user: "A".
- A small change, two ways. (a) The design is always written, as long as the work needs: one line for a small change. (b) The builder leaves it out when it judges the work small. The user: "a".

**Decided by the user.**

- Where the rules are used: "Tôi thường dùng rule này để thiết kế trước khi code và dùng để review code". Not in the brainstorm: "Brainstorming chủ yếu là disscuss về bussines, tôi thấy không phù hợp".
- A design that proves wrong, or cannot be applied, while the code is written: the builder corrects the written design first, with the reason, keeps the earlier line, and goes on; the run does not stop, and a place where the code differs from the design with no line that says why is a finding of the reviewer. The user: "quy tắc "sửa bản thiết kế trước, ghi lý do, không dừng run"". This is why the design stands in the builder's decisions and not in the spec, which does not change after the approval.
- The rules go in word for word, as one file that the builder and the reviewer both read; no other file states them again. Put to the user after the builder had rewritten them as four questions of its own and the user had asked "Cái này thì liên quan gì tới principles của tôi"; the user confirmed it with the builder's summary before the build ("Ok bắt đầu đi").
- Two words of the rules change, to agree with the glossary of the first copied work: "Unit" becomes "Module" ("Vậy bỏ unit đi"), and "at boundaries" becomes "at seams" ("Đổi theo peacock"). The text after both changes is "The rules" below.
- When the sources of rules disagree: first a project's own written rules, then the way the existing code already does it, then the rules file. The user: "Theo thé tự 1 2 3". The rules bind the code a run adds; nobody restructures the rest.
- The form of the design: the user has no design of their own to show ("Tôi chưa có"), so the form is the builder's, bound by this: every line can be checked against the code. It says which files are created or changed and what each is responsible for (the passage on file structure of the second work, below).
- What is copied from other works, after the builder had gone through its first list line by line and taken out what repeats the user's rules or lies outside them. The user: "Đồng ý". The parts are under "What is copied" below.
- Rule 4 for code, three points. Before the code, the builder looks in the project for a place that already holds the rule and uses it; else the design says in which one file the rule lives. The reviewer who finds the rule in a second place reports it. Not a finding: a test or a document that states the rule to check or explain it, and two pieces of code that look alike and do not have to change together. The user: "Ok".
- Rule 4 when what is built is a skill, the softer form: the design names the file that owns a rule and each place that repeats it on purpose, with the reason; a finding is only a copy the design does not name, or two copies that say different things; the file of an agent that repeats a rule is an ordinary named copy. The user: "Ok vậy đi". (The reason for the softer form is in the record: spec 5 repeated the rule against `git stash` on purpose, where the builder reads at step 4, because one place had not been enough.)
- A design finding is fixed in the run; the fix is a change of structure that changes no behaviour; the builder may reject a finding with its reason, as today. The user: "A". Where a fix may reach and what proves it were first agreed as "only in what the change added or touched" and "no line of a test changes"; the read by a second agent showed that the first goes against the test rules of step 4 (`skills/build-implement/tdd.md`: "Only in code this run added: leave code and tests that existed at the base as they are.") and that the second cannot hold for a test the run itself wrote, which must follow a function that moves. The user then chose, with the six further points listed below ("Đồng ý"): a design finding is fixed only in code this run added, and one in code that existed before the run is reported to the user, not fixed; no line changes in a test that existed at the base or in a test of the oracle, and a test the run wrote may change how it reaches the code, never what it checks; a fix that would need a line of an earlier test or of an oracle test to change is no change of structure only, so the builder does not make it, writes that reason, and reports the finding to the user.
- The design is always written; a small change has a design of one line. The user: "a".
- Every design finding is written in four parts (what this is, the problem, the fix, what happens if it is skipped); a finding of wrong behaviour keeps its present form. The sentence "No style remarks" changes: remarks of taste stay forbidden, and a design finding by the rules file is not one. The version becomes 0.4.5. The user, to the three together: "Đồng ý".
- The three approved steps that hold "0.4.4" take 0.4.5, and the copied files name no source: only the licence files and the decisions file say where a part came from, as in the two earlier copies. The user: "Đồng ý".
- Six more points, from the read of this spec by a second agent and from the advisor's read of its questions, put to the user as a numbered list with the two of the item on a design finding above. The user, to all eight: "Đồng ý". (3) The last section of the first work's design skill is left out: it only points to two files that are not copied. (4) Of the passage on file structure, the line that repeats rules 1 and 3 and the line that prefers smaller files are left out, and its word "plan" becomes "design". While writing this spec the builder found that the end of the passage's last line ("but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable") goes against two things: the test rules of step 4 leave code that existed at the base as it is, and point 5 puts the size of a file outside the rules. The user first had it cut ("Cắt"), then kept it: "Tôi thay đổi rồi không cắt nữa nhưng mà phải handle conflicy". Two ways were put to the user: (1) the builder may split such a file, under three conditions; (2) the builder never splits, and only reports that the file should be split, which leaves a copied sentence that says the opposite of what the builder does. The user asked whether way 1 stops the run ("Vậy cách 1 dừng run à?"); it does not: the builder writes the split into the design and reports at the end of the run. The user: "Vậy cách 1". The three conditions: the split is named in the design before the code, never made after the review; its reason is a rule of the rules file (a file that does several unrelated jobs), never a count of lines; and it changes no behaviour, proven as in the item on a design finding above (every test passes before and after it, and no line changes in a test that existed at the base or in a test of the oracle). When it cannot be made so, the builder does not split, and the run's log entry says so. The test rules of step 4 get this one exception (section 4, item 2). (5) The reviewer's question on the size of files is left out: the size of a file lies outside the four rules, and pulls against rule 1. (6) Of the passage on severity, only the first four sentences are taken. (7) Where a copied part and the rules file disagree, the rules file wins (the smell "Duplicated Code" speaks at two copies, the Rule of Three waits for the third). (8) A finding that the code differs from the design, where the code is right and the design is behind, is closed by writing the missing line into the design, with its reason.
- Nine points from a check of this spec for contradictions, which the user asked for ("Kiểm tra lại xem còn điểm nào xung đột nữa ko"), made by the builder and, apart from it, by an agent that read the spec against the texts that stay. Seven were the builder's own sentences that did not fit what had been agreed; two were for the user to decide. The user, to the list of nine with the builder's suggestion for each: "Theo suggestion".
  1. The reviewer's file tells it to name "the input, the path through the code and the wrong result" and to "Drop what you cannot make concrete": a design finding has neither, and would be dropped. For a design finding, concrete means a place and what happens if it is skipped.
  2. A smell is "never a hard violation", and the playbook fixes every Important finding: a smell is a lead; it becomes a finding only when its four parts can be written, and its severity is set then.
  3. "The rules file wins over anything else" was wider than point 7 above, and would have overruled the softer form for a skill and the order of the sources. There is one order of four: a project's own written rules, the way the existing code already does it, the rules file, the other parts. The softer form is how rule 4 holds for a skill, not a breach of it.
  4. "Every test passes before and after it" cannot be true at step 4, where the oracle's tests fail on purpose, and cannot always be run before step 9: it is "every test that passed before it passes after it", in the forms the capabilities allow at that step.
  5. Step 6 would have held two proofs for one fix: the test that fails first is for a finding of wrong behaviour, the change of structure for a design finding.
  6. "Before the first test of the feature" was not the real order (the oracle's tests exist from step 3): a split is made before any other line of product code of the feature.
  7. The copied passage on severity calls broader coverage Minor, and the reviewer's file makes a point of a behaviour with no assertion Important: the passage grades design findings only.
  8. (For the user to decide.) The split of an old file goes against "the way the existing code already does it" in a project whose files all do several jobs: it is the one exception to the order of the sources, for the file the change must modify and no other, and it is allowed, never required.
  9. (For the user to decide.) The copied sentence "This is where decomposition decisions get locked in." says the opposite of the rule the user chose for a design that proves wrong: it is left out.

**The rules.** The whole text of the rules file, after its first line `# Design Rules (code modules & skills)`:

```
"Module" = anything with an interface and an implementation: a function, class or package in code, or a skill.
"Caller" = whoever uses it (code, user, or agent).
For a skill: interface = name + description (what triggers it);
internals = instructions, scripts, references (progressive disclosure).

1. **Deep Modules (small interface, rich functionality)**
   - Expose the smallest interface that covers real use cases; the common case must be simple.
   - Information hiding: internals stay private, modules interact only through interfaces, callers never coordinate internal pieces (avoid shallow modules).
   - Explicit contract: what it does, when to use it, how it fails.

2. **Separation of Concerns (inside a module)**
   - Separate decisions (policy, business logic) from mechanics and side effects (I/O, tools, external systems).
   - Decision logic must be understandable and testable without running the side effects.

3. **Pragmatic SOLID**
   - **SRP** at the capability level: one coherent capability, one reason to change (one actor driving it). Not one function per module.
   - **DIP & ISP** at seams: depend on narrow interfaces shaped by the module's needs, not the provider's, so the core stays testable and providers stay swappable.

4. **Contextual DRY**
   - **Single Source of Truth** for knowledge: each rule, invariant, or fact lives in exactly one owning module. Consolidate immediately.
   - **Rule of Three** for look-alike code or text: do not abstract until it repeats 3 times and changes for the same reason. Coincidental similarity stays separate.
```

**What is copied.** Four works, all under the MIT licence; the user asked for each by name ("Obra và mattpocock và oómani", "Tham khảo ponytails làm kiểu gì"). The copies were read at these commits: the first work at `abeeaf95660ba9e8b7c753eb38f441ca707a8823` of `github.com/mattpocock/skills`; the second at version 7.0.2, commit `22f0b463e7a5`, of `github.com/obra/superpowers`; the third at `8c99fa36d90068c82d547f7c12a9d67a3e95f4ee` of `github.com/addyosmani/agent-skills`; the fourth at `ebd8654c2c627f721eb8f9c0d1bd4090a29f9e10` of `github.com/DietrichGebert/ponytail`. Every edit made to a copied part stands in the decisions file of this spec, with the file it came from.

1. From the first work (the skills of Matt Pocock): its skill on the design of a codebase, for how to design: the glossary, deep and shallow modules, the three questions for an interface, the principles (the deletion test among them), designing for testability, the relationships, the rejected framings (the file `skills/engineering/codebase-design/SKILL.md`, without its header block and without its last section, "Going deeper"). And from its skill for reviewing code, the seven code smells that match the user's rules, with its two binding rules:

   ```
   - **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
   - **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
   - **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
   - **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
   - **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
   - **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
   - **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
   ```

   ```
   - **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
   - **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.
   ```

   Its five other smells (Mysterious Name, Data Clumps, Primitive Obsession, Repeated Switches, Refused Bequest) are not taken: they lie outside the user's rules.
2. From the second work (superpowers, of Jesse Vincent): of the passage on file structure of its skill for writing plans, for what the design says, these lines (its line on units and boundaries, which repeats rules 1 and 3, its line that prefers smaller files, and its sentence "This is where decomposition decisions get locked in." are not taken; "Before defining tasks" and "in the plan" are reworded, since the loop has no tasks and no plan):

   ```
   Before defining tasks, map out which files will be created or modified and what each one is responsible for.

   - Files that change together should live together. Split by responsibility, not by technical layer.
   - In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
   ```

   Of its reviewer of a task: the question `Is the implementation following the file structure from the plan?`, with "the plan" reworded (its question on the size of files is not taken); and the first four sentences of its passage on severity, for which finding must be fixed ("this task" is reworded; the three sentences after them, on what a plan mandates and on praise, are not taken):

   ```
   Categorize issues by actual severity. Not everything is Critical. Important means this task cannot be trusted until it is fixed: incorrect or fragile behavior, a missed requirement, or maintainability damage you would block a merge over — verbatim duplication of a logic block, swallowed errors, tests that assert nothing. "Coverage could be broader" and polish suggestions are Minor.
   ```
3. From the third work (agent-skills, of Addy Osmani), two sentences for the reviewer: `Zero findings is a valid result; do not invent one.`, and, to judge the builder's fix of a design finding, the question `**Does this refactor reduce complexity or just relocate it?**` with its text.
4. From the fourth work (ponytail, of DietrichGebert): the question before new code, `Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.`; two lines of its review, `reuse: the repo already has this helper (name the path)` and `merge: near-copies that must change together`; and the four parts of a finding, `What this is:`, `Problem:`, `Fix:`, `If we skip it:`.

**Left to the builder.** The names of the new files and how the parts are spread over them, within the terms of section 3. The words of each new sentence beyond the phrases section 3 names. The words of each edit of a copied part. How the builder finds a project's own written rules and gives them to the reviewer. Where the design check stands in the order of the reviewer's looking. The names of the licence files. How the README says it.

## 3. Behaviours

A text in backticks is in the named file, or in one of the named texts, word for word. The terms:

- **The rules file**: the one file of `skills/build-implement/` whose first line is `# Design Rules (code modules & skills)`.
- **A design file**: a `.md` file of `skills/build-implement/` other than `SKILL.md`, `tdd.md` and `writing-good-tests.md`. The rules file is one.
- **The builder's design texts**: `skills/build-implement/SKILL.md` and every design file whose file name it holds.
- **The reviewer's texts**: `agents/reviewer.md` and every design file whose file name it holds.
- **A licence file**: a file whose name starts with `LICENSE`.

**The rules file**

1. Exactly one file of `skills/build-implement/` has `# Design Rules (code modules & skills)` as its first line.
2. The rules file holds every line of "The rules" of section 2, word for word and in that order.
3. Each of the nine lines of "The rules" that begin, after their leading spaces, with `- ` stands in no other file of `skills/` and `agents/`.
4. `skills/build-implement/SKILL.md` and `agents/reviewer.md` each hold the file name of the rules file.

**The design, before the code (step 4)**

5. `skills/build-implement/SKILL.md` still has its six numbered items; its item 2 still holds `Before any line of product code`, `## Entry points` and `## Edges`, and now also names a third section of `$S/decisions.md`, `## Design`.
6. Item 2 holds `A small change has a design of one line; the section is never left out.`
7. The builder's design texts hold `which files will be created or modified and what each one is responsible for`, `Files that change together should live together. Split by responsibility, not by technical layer.`, `In existing codebases, follow established patterns.`, `don't unilaterally restructure` and `including a split in the design is reasonable`; they hold none of `Prefer smaller, focused files`, `Design units with clear boundaries`, `Before defining tasks` and `get locked in`.
8. The builder's design texts hold `A project's own written rules come first; then the way the existing code already does it; then the rules file; then everything else in these texts.`, and so do the reviewer's texts; neither holds `the rules file wins`.
9. The builder's design texts hold `Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.` and `For each rule, number or format that the spec brings in or changes, the section names the one file that holds it.`
10. The builder's design texts hold `When what is built is a skill, the section names the file that owns each rule and each place that repeats it on purpose, with the reason.` and `A copy that the section names with its reason is how rule 4 holds for a skill, not a breach of it.`, and the reviewer's texts hold the second sentence too.
11. The builder's design texts hold `write the correction into the section first, with what you found and why, and keep the earlier line` and `The run does not stop for it.`
12. The builder's design texts hold, each as the text of a heading, `Glossary`, `Deep vs shallow`, `Principles`, `Designing for testability`, `Relationships` and `Rejected framings`, and the phrases `a lot of behaviour behind a small interface`, `Can I reduce the number of methods?`, `**The deletion test.**`, `**One adapter means a hypothetical seam. Two adapters means a real one.**`, `**Accept dependencies, don't create them.**` and `**Return results, don't produce side effects.**`; no heading of them is `Going deeper`, and they hold neither `DEEPENING.md` nor `DESIGN-IT-TWICE.md`.
12a. The builder's design texts hold `A split of a file that existed before the run is made only when the section names it before any line of product code; it is made first, before any other line of product code of the feature, and never after the review.`
12b. The builder's design texts hold `Its reason is a rule of the rules file (a file that does several unrelated jobs), never a count of lines.`
12c. The builder's design texts hold `It changes no behaviour: every test that passed before it passes after it, in the forms the capabilities allow at this step, and no line changes in a test that existed at the base or in a test of the oracle. When it would need such a line to change, do not split, and write that in the section.`
12d. In `skills/build-implement/tdd.md`, the part `### REFACTOR - Clean Up` still holds `Only in code this run added: leave code and tests that existed at the base as they are.`, and after it `One exception: a split that the section `## Design` names (step 4, item 2), made before the first cycle, while every test that passed at the base still passes.`; the file still holds `Seven things are not violations`.
12e. The builder's design texts hold `This split is the one exception to the order of the sources: here the rules file is put before the way the existing code already does it. It is for the file the change must modify and no other, and it is allowed, never required.`

**The review (step 6)**

13. `agents/reviewer.md` no longer holds `No style remarks.`; it holds `No remarks of taste (a name, a layout, a preference). A design finding by the rules file is not a remark of taste.`
14. The reviewer's texts hold `Is the implementation following the file structure from` and `A difference between the code and the section that no line of the section explains is a finding.`
14a. `agents/reviewer.md` holds `For a design finding, concrete means a place in the code and what happens if it is skipped: it has no input and no wrong result, and is not dropped for that.`
14b. The reviewer's texts hold `A smell is a lead, not a finding: it becomes a finding only when its four parts can be written, and its severity is set then.`
15. The reviewer's texts hold `A design finding in code that existed before this run is marked "outside the change".`, and none of `Don't flag pre-existing file sizes` and `already large`.
16. The reviewer's texts hold each of the seven lines of the smells of section 2, word for word, and none of `Mysterious Name`, `Data Clumps`, `Primitive Obsession`, `Repeated Switches` and `Refused Bequest`.
17. The reviewer's texts hold the two lines of the binding rules of section 2, word for word.
18. The reviewer's texts hold `Categorize issues by actual severity. Not everything is Critical.`, `maintainability damage you would block a merge over — verbatim duplication of a logic block, swallowed errors, tests that assert nothing.` and `"Coverage could be broader" and polish suggestions are Minor.`, and none of `plan-mandated` and `Acknowledge what was done well`; before those sentences they hold `This grades a design finding only: a finding of wrong behaviour, and a point of a behaviour that no assertion checks, keep the severity this file gives them.`
19. The reviewer's texts hold `Zero findings is a valid result; do not invent one.`
20. The reviewer's texts hold `**Does this refactor reduce complexity or just relocate it?**` and `Count the concepts a reader must hold to follow the change.`
21. The reviewer's texts hold `reuse: the repo already has this helper (name the path)` and `merge: near-copies that must change together`.
22. The reviewer's texts hold `A test or a document that states a rule in order to check it or to explain it is not a second place.` and `Two pieces of code that look alike and do not have to change together stay apart.`
23. The reviewer's texts hold `For a skill, a finding is a copy of a rule that the section does not name, or two copies that say different things; a copy the section names with its reason is not one.`
24. `agents/reviewer.md` says that a design finding is written with `Severity:`, `Where:`, `What this is:`, `Problem:`, `Fix:` and `If we skip it:`, and it still holds `` `Case:` (input → wrong result) `` and `` `Test:` (the test that would fail today) `` for its other findings.
25. `agents/reviewer.md` still holds `## Coverage`, `## Verdict` and `Check each finding against the code before you report it`.

**The playbook (`skills/build/SKILL.md`)**

26. Step 4 names `## Design` beside `## Entry points` and `## Edges` among what the step leaves in `$S/decisions.md`.
27. Step 6 holds the file name of each design file that `agents/reviewer.md` names, among what the reviewer is started with.
28. Step 6 holds `a finding of wrong behaviour, with a test that fails before the fix and passes after`, and `a design finding, by a change of structure that changes no behaviour`, `every test that passed before it passes after it`, `no line changes in a test that existed at the base or in a test of the oracle` and `a test this run wrote may change how it reaches the code, never what it checks`; it no longer holds `each with a test that fails before the fix and passes after`.
29. Step 6 holds `only in code this run added` and `A finding marked "outside the change" is not fixed`.
30. Step 6 holds `A fix that would need a line of such a test to change is no change of structure only: do not make it, and answer the finding with that reason.`
31. Step 6 holds `A finding that the code differs from the section, where the code is right and the section is behind, is closed by writing the missing line into the section, with its reason.`
32. In step 10, the item that starts with `**The log.**` holds `design findings outside the change`, `design findings whose fix would have changed an earlier test` and `a split the design named and the builder did not make`.
33. Step 9 still holds `a fix gets a test that fails first, but a lint, format or type fix`.

**The sources and their licences**

34. For each phrase below, the folder of every file of `skills/` and `agents/` that holds it also holds a licence file that holds the file's name, the words `Permission is hereby granted` and the copyright line given: `**The deletion test.**` and `**Middle Man**` with `Copyright (c) 2026 Matt Pocock`; `Files that change together should live together` and `Not everything is Critical` with `Copyright (c) 2025 Jesse Vincent`; `Zero findings is a valid result` with `Copyright (c) 2025 Addy Osmani`; `merge: near-copies that must change together` with `Copyright (c) 2026 DietrichGebert`.
35. No file of `skills/` and `agents/` other than a licence file holds any of `Pocock`, `Vincent`, `Osmani`, `Gebert`, `superpowers`, `ponytail` and `agent-skills`, in any letter case.

**The version and the README**

36. `.claude-plugin/plugin.json` holds `"version": "0.4.5"`, and the README's status paragraph starts with `**Status: v0.4.5.**` and still holds the words `brainstorm` and `grilled`.
37. The README's status paragraph holds `## Design` and `design rules`, and the README holds the path of every licence file of `skills/` and `agents/`.

## 4. Against the record

1. **The version in three approved steps** (the user's: approved steps, S2-F1-S40, S3-F1-S7 and S4-F1-S21). `progress/feature_list.json`: "`.claude-plugin/plugin.json` holds `\"version\": \"0.4.4\"`, and the README's status paragraph starts with `**Status: v0.4.4.**` and holds the words `brainstorm` and `grilled`." (S2-F1-S40, as spec 4 left it), and "`.claude-plugin/plugin.json` holds `\"version\": \"0.4.4\"`, and the README's status paragraph starts with `**Status: v0.4.4.**`." (S3-F1-S7 and S4-F1-S21). Now 0.4.5 in all three; the words `brainstorm` and `grilled` stay. The words of the three steps in the feature list, and their tests (`tests/brainstorm-texts.test.ts` "40", `tests/script-call-and-dir-rule.test.ts` "7", `tests/turn-reference-texts.test.ts` "21"), take the new number. The user, asked in the builder's first message of the brainstorm: "Đồng ý".
2. **The refactor rule of the test rules** (the user's: an approved plan). `docs/plans/2026-11-19-build-playbook-tdd.md`, edit E7 of the copied test rules: "`Only in code this run added: leave code and tests that existed at the base as they are.`" Now with one exception: a split of an existing file that the design names before the code, under the three conditions of section 2 (behaviours 12a to 12d). The sentence itself stays, and the test that holds its first words (`tests/skills.test.mjs`) stays true. The user, told that way 1 needs this rule to change and that the change needs their word: "Vậy cách 1".

Kept, not against it:

- The way of the two earlier copies (steps S1-F1-S42, S2-F1-S14, S2-F1-S29 and S2-F1-S30: a licence file beside the copy that names the files it covers and holds the original's licence text with its copyright line; the original's project and author named in no other file) is followed for the four works (behaviours 34 and 35). The user: "Đồng ý".
- Step S5-F1-S1 names "Item 4 of `skills/build-implement/SKILL.md`": the items of that file keep their numbers (behaviour 5).
- `tests/skills.test.mjs` holds `## Entry points`, `## Edges` and `a fix gets a test that fails first, but a lint, format or type fix` (the plan `docs/plans/2026-11-19-build-playbook-tdd.md`): all three stay (behaviours 5 and 33).
- A design finding of the reviewer is still fixed only in code this run added (behaviour 29): the exception of item 2 is for a split planned before the code, not for a fix after the review. A change of structure that changes no behaviour is the refactor step of the test rules ("Keep tests green. Don't add behavior."). Their list "Seven things are not violations" stays as it is.
- The sentence `No style remarks.` of `agents/reviewer.md` stands in no line of the record: no step, ruling or decision holds it.
- The three places that hold the rule against `git stash` (spec 5, steps S5-F1-S1 to S5-F1-S6) stay as they are: nothing of hstack's own texts is reworked here.

## 5. Open points

None.

## 6. Not in this spec

- A second agent that reads the design before the code is written (way B). It can be added later if runs show designs found late.
- A design in the spec, or one the user approves (way C).
- The brainstorm: neither the rules as the measure of its approaches, nor a standing question on how each behaviour fails.
- A trial read of an earlier change with the rules file, to see what a reviewer reports.
- A tool that enforces a rule (a checker of imports across modules).
- The two other files of the first work's design skill (on deepening a cluster, and on designing an interface several ways with parallel agents), and its five other smells.
- A check of the size of a file.
- A fix of a design finding in code that existed before the run.
- A rework of hstack's own script and skills by the rules.
