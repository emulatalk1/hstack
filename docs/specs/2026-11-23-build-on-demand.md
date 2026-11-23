---
type: spec
title: "Spec 9: the build loop runs only when the user invokes it, and the stop hook holds only a run of this session"
description: "Feedback issue 9: hstack does nothing until the user types `/hstack:build`. The skill can no longer be invoked by the agent; the text at the start of a session and the descriptions of the loop's other skills no longer send every change to it; the stop hook no longer holds a turn that changed the repository when no run of this session is going, so a git sync, a small fix or a docs edit ends the turn. A run of this session that is not finished, and a spec of this session that waits for approval, are held as before; a waiting spec, or an approved run that an earlier session did not finish, is taken up in a new session with `/hstack:build <the spec's name>`."
status: stable
generated: { by: claude-code, at: "2026-11-23T19:00:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-23T22:02:41+07:00" }
sources:
  - id: spec-2
    resource: /specs/2026-11-21-brainstorm-and-grill.md
  - id: spec-4
    resource: /specs/2026-11-22-turn-reference.md
  - id: spec-6
    resource: /specs/2026-11-22-design-before-code.md
---

# Spec 9: the build loop runs only when the user invokes it, and the stop hook holds only a run of this session

## 1. The request

The user, after `hstack feedback collect` listed the open feedback issues: "#9". Issue 9 of `emulatalk1/hstack`, in its words:

> What happened: the local default branch had diverged from its remote after the remote history was rewritten; every local commit was already on the remote. On the user's word the agent ran `git reset --hard origin/main`. No code was built. The stop hook then blocked each end of turn with "the repository changed without the hstack:build workflow" until it reached its cap. The playbook has no way to end for a change that needs no spec.
>
> What the user wants: hstack:build on demand. The loop and its stop-hook enforcement apply only after the user invokes the skill directly (for example `/hstack:build`). Other changes (a git sync, a small fix the user asks for, a docs edit) end the turn with no block.

## 2. Agreed in the brainstorm

**Why.** Today every change to a repository with hstack installed goes through the loop: the skill's description says "Use for any request to build, change or fix code", the text at the start of a session says "invoke the hstack:build skill first", the loop's other skills say "For any request to build, change or fix code, invoke hstack:build", and the stop hook holds any turn that changed the repository while no run is going. A change that needs no spec cannot end its turn: it is held three times and then let go.

**Goal.** In the user's words, as the builder summed it up and the user worked it out: the user types `/hstack:build` when they want the loop, and `/hstack:build <the spec's name>` to take a spec up again; nothing else is needed. In the session where the user typed it, the playbook is already loaded and nothing invokes it again ("khi tôi muốn bắt đầu playbook thì đã trigger hstack:build rồi mà"). When the user has not typed it, hstack stays out of the way.

**Not a goal.** What the stop hook does inside a run that this session started and has not finished: it holds as before, whether or not the turn changed the repository. The cap of three holds. The benchmark in `bench/`, which sends its tasks without `/hstack:build` and is closed. A spec the user wrote being taken as approved without the loop's own spec and approval (issue 7).

**A failure, even if it works.** A run of this session is let go half-way; a spec is approved for a repository that changed while it waited; the agent starts the loop on its own for a change the user did not ask to run through it.

**Approaches.** Three were put to the user:
1. Only the user can start the loop: `build` gets `disable-model-invocation: true` (the user can still type `/hstack:build`: the flag only stops the agent invoking it, as Claude Code's changelog for 2.1.110 says); the stop hook holds only a run of this session and a spec that waits. The advisor's pick and the builder's.
2. Words only: no flag; the description and the start text say "only when the user asks". The agent may still start the loop by itself, which the issue asks to end.
3. The hook only: nothing else changes; the agent still starts the loop for every change.

The user asked about their own way ("Còn cách của tôi nào thì sao?"): type `/hstack:build` for the loop, `/hstack:build <tên spec>` for a spec. The builder showed that approach 1, cut down as the advisor advised, is that way, with one addition: the descriptions of the loop's three other skills change, because they are always shown to the agent and would still send every fix to a skill it cannot invoke. The user then said: "Bỏ cái này đi hstack:build duyệt": a spec that waits is not taken up with `/hstack:build duyệt`; it is taken up with `/hstack:build <the spec's name>`, and the answer (approve, change, grill) is given after, in that session. Then: "Chỉ cần tên spec thôi": the name is enough, not the path.

On a run that an earlier session approved and did not finish, the builder first proposed that it is not continued in a new session (the user resumes the old session, or starts again). The user: "Build continue i think we do have the progess.md right? Advisor có ý kiến gì?" The builder and the advisor answered: yes, it can go on, from the run's state folder under `~/.hstack/` (its steps recorded, its requirement, capabilities, oracle report and decisions), not from `progress/progress.md`, which gets its entry only at the last step; so it goes on in this checkout on this machine, not from a fresh clone. It is taken up the same way as a waiting spec, `/hstack:build <the spec's name>`, from the first step not recorded. A run is not taken up when its base commit or its oracle's commit is no longer in the history of `HEAD` (as after the issue's own `git reset --hard`); commits made since its last step are shown to the user, and it goes on at their yes.

The user's answers on the way there: "đúng rồi, viết spec đi" (to the first design); "Sao lạ vậy, khi tôi muốn bắt đầu playbook thì đã trigger hstack:build rồi mà"; "Ví dụ như có spec rồi thì gọi hstack:build <tên spec> thì thế nào?"; "Còn cách của tôi nào thì sao?"; "Bỏ cái này đi hstack:build duyệt"; "Chỉ cần tên spec thôi"; "Build continue i think we do have the progess.md right? Advisor có ý kiến gì?".

**The grill.** The user asked for a grill of this spec ("Grill me"). Its answers:
- A name that matches no waiting spec and no unfinished run is a new request, and the brainstorm starts as usual (the builder's recommendation; the user: "Còn lại có").
- When the user turns down a take-up because of commits made in between, the unfinished run is left as it is. New work beside an unfinished run goes into a new worktree, so that it does not break the unfinished run: "Nếu muốn làm việc mới thì tạo worktree mới tránh break loop đang dỡ". The loop makes the worktree itself, and the session is moved into it: "Phải đảm bảo session đó attach với worktree đó".
- When the run in the new worktree is done, the user approves the merge and the agent makes it: "Q6 tôi approve bạn merge". The agent asks; on the user's yes it merges the worktree's branch into the branch the worktree was made from; it never merges without that yes.
- In a session whose own approved run is not finished, a new request with `/hstack:build` is refused, as today, and the user is told to open another session in another worktree for work side by side: moving this session away would leave its run half-way (the user: "Đúng vậy có là đồng ý").
- Small work that goes through no loop (a git sync, a docs edit) is done in place beside an unfinished run; a later take-up shows the commits it made ("Còn lại có").
- When the user changes code without `/hstack:build`, the agent does it directly and does not suggest hstack ("Còn lại có").
- Two sessions in the same working folder: accepted as a limit, with the advice to use a worktree for work side by side. hstack keeps a run's state per working folder, so each worktree has its own (the user asked "cùng repo hay cùng branch?"; the answer: the same folder).
- The time in which no session worked on an unfinished run is taken off its clock both at a take-up in a new session and when the old session is resumed ("Còn lại có").

**What the user decided of the how.**
- The skill `build` gets `disable-model-invocation: true`.
- The stop hook holds a turn only for a run of this session that is started and not `done` (as before), and while a spec of this session waits and the repository changed (as before). With no run, after a finished run, and beside a run or a waiting spec of an earlier session, it lets the turn end.
- A spec that waits is taken up in a new session with `/hstack:build <the spec's name>` (the name alone, not the path), not with `/hstack:build duyệt`; an approved run that an earlier session did not finish is taken up the same way, and goes on from its first step not recorded.
- The descriptions of `brainstorm`, `grill` and `build-implement` no longer send every request to `hstack:build`.
- The tests, `CLAUDE.md` and the README follow.
- Known and accepted: before `start` (the brainstorm) no hook keeps the repository still; only the skill's text does.

**Left to the builder.** How the session is moved into the new worktree (Claude Code's own worktree tool, when the session has it) and how the hooks follow the folder the session works in; how the time in which no session worked on a run is measured. The exact words of the descriptions, of the text at the start of a session and of the stop hook's reasons, within the behaviours below. The version number. The name of the script's verb that takes a run up, and how it knows the commits made since the run's last step.

## 3. Behaviours

The start hook is `hstack.ts hook-start`, the prompt hook `hstack.ts hook-prompt`, the stop hook `hstack.ts hook-stop`; the stop hook **holds** a turn when it prints `{"decision":"block",…}` and **lets it end** when it prints nothing. "Of an earlier session" means that the run or the spec was there when the start hook ran with `startup`.

The skills and the texts:

1. The header of `skills/build/SKILL.md` holds `disable-model-invocation: true`, and its description no longer holds `Use for any request to build, change or fix code`.
2. The text that the start hook prints no longer holds `invoke the hstack:build skill first` or `For any request to build, change or fix code`; it holds `/hstack:build`, `It starts with a brainstorm with the user, then a spec that the user approves`, `For a build, the brainstorm is hstack's own skill, hstack:brainstorm, not another brainstorming skill` and `after the approval, follow it to its last step`, and still holds the sentence on a ruling and `hstack.ts ruled`; it does not tell the agent to suggest `/hstack:build` to the user.
3. While a spec waits, the text that the start hook prints names the spec's path, holds `approves it, asks for changes to it or asks for a grill of it` and `The user's next message`, and says that the user takes it up with `/hstack:build` and the spec's name; it no longer tells the agent to invoke hstack:build, and does not hold `/hstack:build duyệt`.
4. Beside an approved run of an earlier session that is not finished, the text that the start hook prints names its spec and the steps not recorded, says that the user goes on with it by typing `/hstack:build` and the spec's name, and that other work does not need it.
5. The descriptions of `skills/brainstorm/SKILL.md`, `skills/grill/SKILL.md` and `skills/build-implement/SKILL.md` no longer hold `For any request to build, change or fix code` or end with `invoke hstack:build, not this.`; each says it is a step of the loop that the user starts with `/hstack:build`, and none holds `disable-model-invocation`.
6. The section `## In hstack` of `skills/brainstorm/SKILL.md` and of `skills/grill/SKILL.md`, and the first paragraph of `skills/build-implement/SKILL.md`, no longer say ``invoke `hstack:build` ``; each says that an agent the loop did not send does nothing there, and that the user starts the loop with `/hstack:build`.
7. The section `## In hstack` of `skills/brainstorm/SKILL.md` still holds `Invoked by the user themselves, it is the start of a build`, and then tells the agent to read the playbook beside it (`../build/SKILL.md` from the skill's own folder) and run its step 1, not to invoke `hstack:build`.
8. The section `## In hstack` of `skills/brainstorm/SKILL.md` no longer says that the loop's stop hook holds a turn in which the repository changed before `start`.
9. In a session that finds a spec of an earlier session waiting, `/hstack:build` followed by the spec's file name, with or without `.md` and without its folder, takes that spec up: the loop shows its path and the three choices (approve it, say what to change, have it grilled), and starts no new brainstorm.
10. In a session that finds an approved run of an earlier session not finished, `/hstack:build` followed by its spec's file name takes the run up: the loop runs the script's take-up verb, shows the user the commits it prints, and on the user's yes goes on from the first step that `$H missing` prints, with no `start` and no new brainstorm; on a no, the run is left as it is.
11. The take-up verb refuses, and the run is not taken up, when the run's base commit or its oracle's commit is not an ancestor of `HEAD`; it prints each commit of `HEAD` made after the run's last recorded step; after it, `$H elapsed` no longer counts the time between the run's last recorded step and the take-up, and the stop hook holds the run as a run of this session, with a reason that holds `steps not recorded`, whether or not the turn changed the repository.
12. `/hstack:build` followed by a name that is the file name of no waiting spec and of no unfinished run is a new request: the brainstorm starts as usual.
13. In a working folder that holds an approved run not finished, `/hstack:build` with a new request does not move that run aside: the loop makes a new git worktree from `HEAD`, on a new branch, in a folder outside the repository, moves the session into it, and runs the whole loop there; it tells the user the worktree's path and branch. The unfinished run's folder, state, branch and commits stay as they were.
14. After the session moved into that worktree, the start, prompt and stop hooks judge the worktree, by its own state folder, and not the folder that holds the unfinished run.
15. When the session cannot be moved into a new worktree, the loop makes none, starts nothing, and tells the user to open a session in a new worktree of the repository.
16. When a session that holds an approved run not finished is resumed (`resume`), `$H elapsed` no longer counts the time in which no session worked on the run.
17. In a session whose own approved run is not finished, `/hstack:build` with a new request starts nothing and makes no worktree: the loop says that this session's run goes on to its end, and that work side by side is done in another session in another worktree.
18. When a run made in a worktree that the loop made for it (behaviour 13) is done, the last reply asks the user whether to merge its branch into the branch the worktree was made from. Only on the user's yes, in a later turn, the agent merges it, in the folder where that branch is checked out; a merge that conflicts is stopped, left as it was before it, and reported to the user. The worktree is not removed.
19. The reason with which the stop hook holds a run of this session that is not finished names the absolute path of the playbook `skills/build/SKILL.md`, so that an agent whose context no longer holds the playbook can read it.

The stop hook:

20. With no run started: a change made in the repository after the prompt hook, then the stop hook: it lets the turn end.
21. With no run started, in a session in which the prompt hook never runs: after the start hook (`startup`) and a commit made in the repository, the stop hook lets the turn end.
22. With no run started: after `git reset --hard` to another commit in the turn, the stop hook lets the turn end.
23. After a run that this session finished (`done`): a change made in the repository after the prompt hook, then the stop hook: it lets the turn end.
24. Beside a run of an earlier session, finished or left unfinished: after the start hook (`startup`), a change made in the repository after the prompt hook, then the stop hook: it lets the turn end.
25. Beside a spec of an earlier session that waits for approval: after the start hook (`startup`), a commit made in the repository, then the stop hook: it lets the turn end; and `approve` afterwards refuses, as it does today for a repository that changed while the spec waited.
26. A run that this session started and has not finished is held, whether or not the turn changed the repository and whether the prompt hook ran or not, with a reason that holds `steps not recorded`: an approved run, and a run with no spec shown yet.
27. While a spec of this session waits for the user's approval, a change made in the repository and then the stop hook: it holds the turn, with a reason that holds `a spec waits for the user's approval`.
28. No reason the stop hook gives holds `the repository changed without the hstack:build workflow`.

The records of the project:

29. `CLAUDE.md`'s part on the hooks says that the loop runs when the user invokes `/hstack:build`, and that the stop gate holds only a run of this session that is not finished and a spec of this session that waits; it no longer says that the stop gate holds a change with no run.
30. In the README's skills table, the `build` row no longer holds `Any request to build, change or fix code` and holds `/hstack:build`; the `brainstorm` row still says that typed by the user with a request it is the start of a build.

## 4. Against the record

Each of these is a step the user approved, or a decision of a builder; this spec changes it.

Spec 2 (`docs/specs/2026-11-21-brainstorm-and-grill.md`):
- S2-F1-S15: "The header of `SKILL.md` has `name: brainstorm`, a description that holds `Invoked by hstack:build at its step 1 and by nothing else` and ends with `invoke hstack:build, not this.`, and no `disable-model-invocation`." The ending changes (behaviour 5).
- S2-F1-S17: "`SKILL.md` has a section `## In hstack`, which says that anyone the loop did not send must ``do nothing here and invoke `hstack:build` ``" (behaviour 6).
- S2-F1-S31: the same as S2-F1-S15 for the grill's header (behaviour 5).
- S2-F1-S33: the same as S2-F1-S17 for the grill's `## In hstack` (behaviour 6).
- S2-F1-S36: "The text `hook-start` prints while a spec waits holds `approves it, asks for changes to it or asks for a grill of it`, and names the playbook's item by its name". Kept; what the text tells the agent to do changes (behaviour 3).
- S2-F1-S41: "In the README's skills table the `build` row holds `Asks only before the approval`". The row changes (behaviour 30).
- S2-F1-S48: "The section `## In hstack` of `skills/brainstorm/SKILL.md` holds `Invoked by the user themselves, it is the start of a build`." Kept; the sentence after it changes (behaviour 7).
- Decision E14 of the builder (`docs/specs/2026-11-21-brainstorm-and-grill.decisions.md`): "When the user commits something between two turns of a brainstorm, the next turn's end is held by the stop hook". No longer so.

Spec 4 (`docs/specs/2026-11-22-turn-reference.md`):
- S4-F1-S6: "… the stop hook lets a turn end in which nothing changed, and holds one in which the repository changed." With no run, the turn in which the repository changed ends too.
- S4-F1-S9: "With no run started: a change made in the repository after the prompt hook is held, with a reason that holds `the repository changed without the hstack:build workflow`." Now it ends (behaviour 20).
- S4-F1-S10: "After a run that this session finished: a change made in the repository after the prompt hook is held, with a reason that holds `the repository changed after the last final check`." Now it ends (behaviour 23).
- S4-F1-S11: "Beside a run of an earlier session: a change made in the repository after the prompt hook is held." Now it ends (behaviour 24).
- S4-F1-S14: "With no run started: a change made … and then the prompt hook once more before any stop hook: the stop hook holds the turn." Now it ends.
- S4-F1-S15: "A turn that the stop hook held stays the same turn …" Stays true inside a run of this session; with no run there is no hold.
- S4-F1-S16: "After a turn that was interrupted …: a commit, then the prompt hook, and the stop hook holds that turn". With no run, it now ends; inside a run of this session it is still held.
- S4-F1-S17: "In a session in which the prompt hook never runs … it holds the turn, with a reason that holds `the repository changed without the hstack:build workflow`." Now it ends (behaviour 21).
- S4-F1-S18: "… the hold with no run started and the hold while a spec waits do not hold it". The hold with no run started is gone; the rest stands.
- S4-F1-S19: "``… and the loop's stop hook holds a turn in which the repository changed, and a turn that ends after `start` with no spec shown``". The clause on a turn in which the repository changed before `start` goes (behaviour 8).
- Decision E17 of the builder (`docs/specs/2026-11-22-turn-reference.decisions.md`) and its test `tests/turn-reference-edges.test.ts` "E17: while a spec of an earlier session waits, the user's commit in this session still holds the turn, as 0.4.3 does": now it ends (behaviour 25).

Spec 6 (`docs/specs/2026-11-22-design-before-code.md`):
- Decision E14 of the builder and its test `tests/design-before-code-edges.test.ts` "E14: the description of the step 4 skill and its row in the README name the design": the description of the step 4 skill "still ends with `invoke hstack:build, not this.`". The ending changes (behaviour 5); the rest of that test stands.

Tests with no step, which pin what changes: in `tests/hstack.test.ts`, "resume keeps the reference, so a change still blocks", "a change made in the later session still blocks", "a change in the later session blocks and names both ways on", "a change in the code repository blocks", and "block reason restates the ending" and "block output is JSON with decision block" where they rely on a hold with no run; in `tests/skills.test.mjs`, the test of the step 4 skill's description.

## 5. Open points

None.

## 6. Not in this spec

- The benchmark in `bench/` and its prompts.
- Two sessions in the same working folder: a session that started before the other's run started takes that run for its own and is held by it. The advice is a worktree for work side by side.
- What the stop hook does inside a run of this session, and while a spec of this session waits.
- Issue 7 (a one-shot request, or a spec the user wrote, run to its end without the loop's own approval).
