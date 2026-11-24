---
type: spec
title: "Spec 10: new work beside an unfinished run goes into Claude Code's own worktree, the stop hook holds a session's run wherever the session's folder is, the README names the command, no step is cut by the clock, and the step 4 skill is named `implement`; 0.4.7"
description: "Five changes built together as hstack 0.4.7. No step of the loop is skipped or cut short because of the time: the limits in minutes go, each step ends when its work is done, and one item of work is tried at most three ways. The skill of step 4 is named `implement`, not `build-implement`. And three more: The user's ruling on the point spec 9 left open: new work beside an unfinished run of an earlier session goes into a worktree that the session's own worktree tool makes under `.claude/worktrees/`, from the base the tool chooses or the base the user names, and the question about the merge names the base. Feedback issue 10: the three hooks follow the `cwd` of their input only into a work tree of the project's repository and judge the project's folder in every other case, and the stop hook holds a run of this session that is not finished, in whichever work tree of the repository that run is and wherever the session's folder is now. While a run of this session goes on, a fourth hook refuses the worktree tool and the stop hook names a branch that was switched. A run belongs to the session that runs it; a run left in a worktree is named at the start of a session in any work tree of the repository and is taken up from there by its spec's name; a resume treats a run in a worktree as it treats one in the project's folder. A project whose code is in a repository of its own gets no worktree for new work yet (feedback issue 12). Feedback issue 11: the README's opening paragraph and quick start name `/hstack:build`, and say that a request without it is done without the loop."
status: stable
generated: { by: claude-code, at: "2026-11-24T08:10:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-24T17:49:40+07:00" }
sources:
  - id: spec-9
    resource: /specs/2026-11-23-build-on-demand.md
  - id: spec-9-decisions
    resource: /specs/2026-11-23-build-on-demand.decisions.md
---

# Spec 10: new work beside an unfinished run goes into Claude Code's own worktree, the stop hook holds a session's run wherever the session's folder is, the README names the command, no step is cut by the clock, and the step 4 skill is named `implement`; 0.4.7

## 1. The request

The user typed `/hstack:build` with these words:

> version 0.4.7; dùng worktree có sẵn của Claude; issue #10 và #11

Issue 10 of `emulatalk1/hstack`, in its words:

> What happens: the three hooks now judge the folder in the hook input's `cwd` (so that a session moved into a worktree is judged there), and fall back to the project's folder only when that `cwd` does not exist. When the `cwd` exists but is in no git repository, the hook exits silently. When it is a repository nested inside the project, that nested repository is judged instead of the project. In both cases the project's own approved, unfinished run is not held at the end of a turn, and can be left half-way.
>
> Expected: the stop hook holds the run of this session that is not finished, wherever the session's current folder is inside the project.
>
> To reproduce: start an approved run in a repository, then send the stop hook an input whose `cwd` is an existing folder outside any repository (or a nested repository with no run). The hook prints nothing; it should hold.
>
> What would help: fall back to the project's folder also when the `cwd` is in no repository, and judge a nested repository only when it is a worktree of the project's repository.

Issue 11 of `emulatalk1/hstack`, in its words:

> What happens: the build loop now runs only when the user types `/hstack:build` (with a request, or with the name of a spec to take it up again); the agent cannot start it by itself. The README's skills table says so, but its opening line still reads "You ask for a feature." and its quick start does not show the command. A newcomer who asks for a feature in plain words gets the change made directly, with no spec, no oracle and no review, and does not learn why.
>
> Expected: the first lines and the quick start of the README tell the reader to type `/hstack:build <what to build>`, and say that plain requests are done without the loop.
>
> What would help: one sentence in the opening paragraph and one example command in the quick start.

## 2. Agreed in the brainstorm

**Why.** Three things were left after spec 9 (the build loop on demand), which is on `main` and in no release.

- Spec 9 puts the worktree for new work beside the repository (`<this folder>-worktrees/<the new branch>`). Claude Code's worktree tool asks a person before it moves a session into a worktree outside `<repository>/.claude/worktrees/`; with no person (`claude -p`) the move fails. The log entry of spec 9 lists this under "Needs your ruling", and the explorer's verdict on step S9-F1-S13 is `FAIL` because of it.
- Since spec 9 the hooks follow the `cwd` of their input. When that folder is in no repository, or in a repository that is not the project's, the project's own unfinished run is not held (issue 10).
- The README's first lines still tell a newcomer to ask in plain words, which since spec 9 starts no loop (issue 11).

**Goals.**

- New work beside an unfinished run of an earlier session goes into a worktree that Claude Code's own tool makes, with no prompt from the tool, and the user decides what the worktree starts from.
- A run of this session that is not finished is held at the end of a turn wherever the session's folder is: in the project's folder, or in a worktree the session moved into.
- A newcomer who reads the README's first lines or its quick start types `/hstack:build <what to build>`, and knows that a request without it is done without the loop.
- The plugin is 0.4.7.

**Not a goal.** The rest of spec 9: the take-up of a waiting spec or of an unfinished run, the refusal of new work beside this session's own run, what the stop hook holds. Claude Code's settings: hstack never writes `worktree.baseRef`. The push of `main`, the closing of issues 10 and 11, and the update of the installed plugin: they are done on the user's word after the run.

**A failure, even if it works.** A session moves to another worktree or another branch in the middle of its own run. New work is built on a base the user was not told of. The folder of the unfinished run shows a change because the new worktree was made. A run of this session is let go half-way because the session's folder moved. The loop merges into a branch the user did not name. A newcomer who followed the quick start gets a change made with no spec and does not learn why.

**The user's ruling on the worktree.** The builder asked whether "dùng worktree có sẵn của Claude" is a change of the product or an instruction for this run. The user: "Câu đó là cho sản phẩm".

**Approaches for the worktree.** Three were put to the user.

1. The session's worktree tool makes the worktree by a new name (in Claude Code, `EnterWorktree` with a name): one call, no git command of the loop. The tool chooses the base: `origin/<the default branch>`, or `HEAD` on a machine whose settings hold `worktree.baseRef: head`. Commits that are not pushed, or a session that stands on another branch, are then not in the worktree.
2. `git worktree add` makes it under `.claude/worktrees/` from `HEAD`, and the tool enters it by its path: always from `HEAD`, whatever the machine's settings. The builder's first pick.
3. Way 1 with a check of the base after the session moved.

The user asked "Tại sao ko phải cách 1?"; the builder answered that the one real reason is the base. The user then picked: "Cách 1 có kiểm tra nhưng mà tuỳ mục đích, đôi lúc cần worktree từ nhánh khác, chưa chắc là cần từ nhánh local đang đứng". So the base is the user's to decide, by purpose, and the loop does not force it to `HEAD`.

**What the user decided of the how** (the builder's design, the user: "Đồng ý").

- By default the session's worktree tool makes the worktree by a new name, from the base the tool chooses.
- The first message of the brainstorm, which always waits for the user's answer, says where the new work runs and what it starts from, for example:

  ```
  The new work runs in the worktree .claude/worktrees/csv-export, on the branch worktree-csv-export,
  which starts from origin/main (a1b2c3d).
  The folder you left (branch main) has 5 commits that are not in it.
  To start from another place, name a branch or a commit.
  ```

  With no word of the user on the base, it stays and the brainstorm goes on. A base that the user names in an answer is taken. A base that the user names in the words after `/hstack:build` is taken at once, with no question.
- The worktree is brought to a named base by `git merge --ff-only <the base>` when that is possible. When it is not, the loop drops the worktree, which is still empty, and makes it again with `git worktree add` from that base, also under `.claude/worktrees/`, and the session enters it by its path. The loop never uses `git reset` for it. When neither way works, the loop removes what it made, starts nothing, and says why.
- Before the worktree is made, the line `.claude/worktrees/` goes into the repository's `.git/info/exclude` when the project does not already ignore that folder, so that `git status` in the folder of the unfinished run does not change.
- At the end of a run made in such a worktree, the question about the merge names both what the run's branch started from and the branch of the folder the session left. When the two differ, the user says which branch it is merged into, or that it is left; the loop merges only into the branch the user answers.
- Issue 10: the hooks follow the `cwd` of their input only when it is in the project's repository: its main folder, a worktree of it, or the code repository that `.hstack/repo` names. In every other case they judge the project's folder.
- Issue 11: one sentence in the README's opening paragraph; the quick start's example becomes `/hstack:build add a CSV export to the invoices page`; and a line that a plain request is done directly, without the loop.
- 0.4.7: the number in `.claude-plugin/plugin.json` and at the head of the README's status paragraph; the six earlier tests that pin 0.4.6 take the new number.
- This run is made on `main`, as the run of spec 9 was.

The points on issue 10, issue 11 and the version were the builder's proposals, put to the user in the message that laid out the ways for the worktree, two messages before the "Đồng ý", which answered the design of the worktree and the point on the merge. The user objected to none of them.

**Two questions of the second reader, and the user's answers.** A second agent read this spec as the builder who must plan it, and two questions went to the user.

- Whether the stop hook holds a session's run when the session's folder is not where the run is. Two cases escaped the rule above: (a) the run is in the project's folder and the session's folder is in another worktree of the same repository, which holds no run; (b) the run is in the worktree the loop made, and the session's folder is elsewhere: in no repository, in a nested repository, or back in the main folder, which holds only the earlier session's run. The builder asked: "bạn có muốn Claude luôn bị giữ cho tới khi xong loop của nó, dù lúc đó nó đang đứng ở thư mục nào không?" The user: "Câu 1: có". So the stop hook holds a run of this session in both cases; the hooks must know which run is the session's.
- What happens in a project whose code is in a repository of its own (`.hstack/repo`). The worktree tool makes a worktree of the repository the session started in, the records home: it holds no code, and no verb of the script works in it. The builder offered: 0.4.7 makes no worktree there and says why, or full support (a worktree of the code repository, the records still in the records home) as a spec of its own. The user: "Câu 2: hỗ trợ đầy đủ, nếu quá lớn tạo issue riêng". The builder judged it too large for this spec: where the worktree lies so that the tool enters it without a question, how the script keeps the records home for a run in a worktree of the code repository, and what the tool does with a worktree of a nested repository are all open, and need a brainstorm of their own. Feedback issue 12 of `emulatalk1/hstack` holds it; in 0.4.7 the loop makes no worktree in such a project, starts nothing and says why (behaviour 12).

**No move while a run of this session goes on.** The builder told the user that the answer "Câu 1: có" reverses decision E1 of spec 9's builder, whose test lets a turn end in a worktree with no run while the session's own run is unfinished in the project's folder; the user asked for it to be explained ("-> giải thích"), and then: "Vấn để ở đây tôi đang nói là: nếu loop đang run thì không cho switch branch hay worktree nào cả, chỉ đc switch khi: loop đang dừng và có thể continuew đc hoặc loop done". So: while a run of this session goes on (approved, not finished), the session switches neither branch nor worktree; a switch is allowed only when the loop is stopped and can be continued (a run of an earlier session, taken up with `/hstack:build <its spec's name>`) or when it is done.

Two ways were put to the user:
1. Words only: the playbook says so, and the stop hook holds afterwards if it happens.
2. Way 1, and a real refusal: a new hook that runs before the session's worktree tool and refuses it while the session's own run is not finished; and, because a switch of branch cannot be refused beforehand with certainty (a git command can be typed in many forms), `start` records the run's branch and the stop hook, when the folder is on another branch at the end of a turn, holds and says which branch the run started on and which one the folder is on. The builder's pick.

The user: "Cách 2". The builder also said, and the user did not object: while a spec waits for the user's approval, no run goes on and a move is not refused; the base checkout of step 9 is no move, because the session does not enter it.

**The check for what is missing, and the user's answers.** The user asked, before approving: "Kiểm tra còn thiếu sót hay xung đột gì không". The builder read the spec against the code and the record, a second agent read it on its own, and ten more points were probed. What needed no decision was corrected. Two points went to the user.

- A run left unfinished in a worktree cannot be found from the main folder: the state of a run is kept per work tree, so a session started in the main folder is told nothing of it, and `/hstack:build <its spec's name>` there matches no spec. And a later session that comes into that worktree with the tool is taken for the run's own session: it is held, `takeup` refuses, and the new hook refuses it the way out. The user: "1. Như vậy phải có sổ cái để theo dõi đúng không?" The builder: yes, hstack must see every run of the repository; either a ledger file of its own, which must be kept true, or a view worked out when it is needed from git's own list of worktrees and the state each work tree already keeps. The user: "1. Tôi nghĩ nên có sổ cái riêng tách biệt vì tương lai tôi sẽ có nhiều vm để develop app, hay bạn có ý tưởng gì không?" The builder: a ledger file on one machine is not seen by another machine either, and a run's state is on one machine only; so two layers: in 0.4.7 the view on one machine, and a ledger shared by several machines as an issue of its own, after a brainstorm of its own. The user: "1. Như vậy nếu dùng git worktree list thì chuyện tương lai vm sẽ không ảnh hưởng gì đúng ko?" The builder: right, the view from `git worktree list` is local to a machine and takes nothing away from a shared ledger later. So 0.4.7 works the view out from git's list of worktrees (behaviours 33 to 37); the user confirms this by approving the spec.
- A session that moved into a worktree and is resumed: the start hook of the resume gets the folder the session started in, so the run in the worktree gets neither its holds back nor the time off its clock in which nobody worked on it. The builder asked whether, at a resume, a run in a worktree is treated as a run in the project's folder is. The user also asked why the stop hook holds at most three times ("2. Tại sao lại là 3 lần nhắc? Tại sao phải limit như vậy?"); the builder: it is a fuse against a loop that never ends, and the number is not part of this spec. The user: "2. Có" (behaviour 38).

**Two more parts, added by the user before the approval.** When the builder said that the spec had grown and that the loop's time rules might skip the exploratory test or the mutation step, the user said: "Vậy thì tăng thời gian loop lên nếu thấy spec lớn, tôi muốn thêm 1 phần nữa là đổi tên skills từ build-implement sang implement".

- The time. The builder first proposed to multiply the limits by the number of behaviours of the spec. The user: "Phần A: bỏ thời gian limit đi thì sao?" The builder: the limits are of two kinds, the rules that skip a step by the clock and the deadline of each agent, and proposed to drop the first and keep the second. The user: "Thời gian estimate chạy cũng chỉ là estimate bản thaan tôi thấy làm như vậy cũng giới hạn agent working, bạn có suggestion nào khác cho việc này không?" The builder: bound the work, not the minutes: every limit in minutes goes and no agent gets a deadline; each step has a definition of done; one item of work (a behaviour, a finding to reproduce, a red test to fix) is tried at most three ways, then written down as not resolved, with what was tried, and listed for the user's ruling; the clock stays for the report only. What is thereby given up: nobody can say beforehand how long a run takes. The number three is the builder's; the user was told so. The user: "Đồng ý". This run itself is made that way: no step of it is skipped or cut short for the time.
- The name of the step 4 skill. The builder: the folder `skills/build-implement/` becomes `skills/implement/` and the skill's name `implement`, with no second name kept; the playbook, the README and the tests follow; the recorded steps that name the old path take the new one; earlier specs, decisions files, plans and the log keep the old name, because they are history. The user's "Đồng ý" above answered the message that held this too.

**Probed before the approval.** When the spec was shown, the user said: "Chỗ nào chưa rõ thì probe". The builder ran six real sessions of Claude Code 2.1.330 (`claude -p --permission-mode auto`) in throwaway repositories outside this one, each with hooks that write down their input. What they showed:

- A `PreToolUse` hook with the matcher `EnterWorktree|ExitWorktree` is run for both tools, and its JSON with `"permissionDecision":"deny"` stops the call: no worktree is made and the session stays where it was.
- `EnterWorktree` with a new name makes `<repository>/.claude/worktrees/<name>` on the branch `worktree-<name>` and asks nobody. In a repository whose `main` was one commit ahead of `origin/main`, the worktree started from `origin/main`, not from `HEAD`. Git lists that worktree as `locked`. The tool writes no ignore rule: `git status --porcelain` in the main folder then printed `?? .claude/`, and nothing after the line `.claude/worktrees/` was added to `.git/info/exclude`.
- `EnterWorktree` with the path of a worktree that `git worktree add` made under `.claude/worktrees/` enters it and asks nobody. So does the whole second way of behaviour 6: `ExitWorktree` with `remove` took the worktree and its branch away, then `git worktree add` and `EnterWorktree` with the path.
- Inside a worktree the tool made, Claude Code refuses a git command aimed at the main folder (`git -C <the main folder> …`): "a worktree-isolated session's git operations must target its own worktree". So the loop notes the `HEAD` and the branch of the folder it leaves before the move, and for the merge the session leaves the worktree first (`ExitWorktree` with `keep`).
- A session that was started inside a worktree can still make a new one by name; the tool puts it under `.claude/worktrees/` of the main repository.
- The input of every hook carried `session_id` and `cwd`. After the move, `cwd` named the worktree and `CLAUDE_PROJECT_DIR` still named the folder the session started in. A resumed session (`--resume`) kept its `session_id`. A session that had moved into a worktree and was resumed was in that worktree again (the prompt hook and the stop hook got the worktree as `cwd`), but the start hook of the resume, with `"source":"resume"`, got the folder the session started in as `cwd`.

Four more sessions, after a second reader of the spec named what the first six had not tried:

- After a resume, `ExitWorktree` still works: with `keep` for a worktree entered by its path, and with `remove` for a worktree the tool made (the one git lists as `locked`); the worktree and its branch were gone.
- The agent's own shell command that appends the line to `.git/info/exclude` is run without a question, and `git check-ignore` then reports the folder as ignored.
- From inside a worktree the tool made, a second, detached worktree in a folder outside the repository can be made, used (`cd` into it in a subshell, `git -C` aimed at it) and removed: the base checkout of the playbook's steps 4, 7 and 9 works there. Only a git command aimed at the main folder is refused.
- A session that was started inside a worktree may aim git at the main folder (`git -C <the main folder> …`).

The files of these sessions are in the run's state folder, `evidence/2026-11-24-claude-worktree-hook-folder-readme/probe-*`.

**Left to the builder.**

- The words by which each agent's file and the playbook say when a step's work is done and what one item of work is.

- The name of the new hook's verb. What the stop hook says of a branch when the run started with no branch checked out. What the worktree hook does between `start` and the moment the spec is shown.
- Which count of holds the stop hook's cap uses when the hold comes from another work tree than the one the `cwd` is in, and where the one free end that a feedback verb gives is kept and read for a run in a worktree.
- The name of the worktree and of its branch. The exact words of the playbook, of the README and of `CLAUDE.md`, within the behaviours below.
- How the loop finds what the worktree starts from and how many commits of the folder it left are not in it; how it finds the repository's `.git/info/exclude`; whether the line stays there when the loop removes what it made.
- How the base of the worktree is kept for the last reply.
- Whether a base named in the words after `/hstack:build` is reached through the tool and a fast-forward, or by `git worktree add` at once.
- What the loop does with a base that the user names after `start`.
- What the loop does when the branch the user names for the merge is checked out in no folder.
- How the hooks tell that a folder is in a work tree of the project's repository, and what they judge when `CLAUDE_PROJECT_DIR` is not set.
- How the hooks record which session a run belongs to (the input of a hook carries `session_id`) and find the runs of a session in the other work trees, how `takeup` learns that another session has come into the run's work tree, and what the hooks do with an input that carries no `session_id`.
- How the script finds the state of the other work trees of the repository, and what `runs` prints for a work tree whose folder is gone.
- What the stop hook does, when the `cwd` is elsewhere, for a spec of this session that waits in another work tree.
- How `CLAUDE.md`'s part on the hooks follows.
- How the earlier tests named in section 4 are brought to the new behaviour.

## 3. Behaviours

"The playbook" is `skills/build/SKILL.md`. Its part "What the user typed" runs from `**What the user typed.**` to `1. **The code repository.**`; its Git rule from `- **Git, in the code repository.**` to `- **Git, in the records home.**`; its paragraph on a run made in a new worktree from `**A run made in a new worktree.**` to `## A ruling after the run`.

The start hook is `hstack.ts hook-start`, the prompt hook `hstack.ts hook-prompt`, the stop hook `hstack.ts hook-stop`; each reads a line of JSON on its standard input, which may hold `cwd`. The stop hook **holds** a turn when it prints `{"decision":"block",…}` and **lets it end** when it prints nothing. **The project's folder** is the folder that `CLAUDE_PROJECT_DIR` names. **The project's repository** is the git repository that folder is in, and, when the top of that repository holds the file `.hstack/repo`, the code repository that file names. A **work tree** of a repository is its main folder or a worktree made with `git worktree add`, wherever that worktree's folder lies.

The worktree for new work beside an unfinished run of an earlier session:

1. The part "What the user typed" tells the loop to make the worktree with the session's own worktree tool, by a new name (it holds `EnterWorktree`), says that the tool makes it under `.claude/worktrees/` on a new branch and moves the session into it, and no longer holds `<this folder>-worktrees/`, `in a folder outside the repository` or `new worktree from `HEAD``.
2. The part says that, before the worktree is made, the loop adds the line `.claude/worktrees/` to the repository's `.git/info/exclude` when `git check-ignore`, asked in the repository's main folder, does not report that folder as ignored, and adds nothing when it does.
3. In a repository whose main folder holds an approved run of an earlier session that is not finished and that ignores nothing: after the line of behaviour 2 is added and a worktree is made on a new branch under `.claude/worktrees/` of that folder, `git status --porcelain` in the main folder prints what it printed before, and the run's recorded steps, its branch and its commits are as they were.
4. The part says that the first message of the brainstorm tells the user the worktree's path, its branch, the commit it starts from with the branch that names that commit, the number of commits of the folder the session left that are not in the worktree when there are any, and that the user can name another branch or commit to start from.
5. The part says that, when the user names no base, the worktree stays as the tool made it and the brainstorm goes on.
6. The part says that a base the user names, in an answer of the brainstorm or in the words after `/hstack:build`, is taken before `start`: by `git merge --ff-only` when the worktree can be fast-forwarded to it; else the loop removes the worktree and its branch, makes a new worktree from that base with `git worktree add` in a folder under `.claude/worktrees/` of the repository's main folder, and moves the session into it by its path; that a base named in the words after `/hstack:build` is taken with no question to the user; and that taking a base makes the place of the work and changes nothing of the product, so the brainstorm's rule that nothing in the repository changes before the approval but the spec file does not forbid it.
7. The part says that the loop never uses `git reset` to bring the worktree to a base.
8. The part says that, when the session has no worktree tool, the tool fails, the base the user named does not exist, or the worktree cannot be brought to it, the loop removes every worktree and branch it made, starts nothing and tells the user why; for a session with no worktree tool, or whose tool fails, it still tells the user to open a session in a new worktree of the repository.
9. The Git rule's exception names the worktree that the session's worktree tool makes under `.claude/worktrees/` for new work beside an unfinished run, and the one that `git worktree add` makes there for a base the user named, and no longer holds `makes beside the repository`.
10. The paragraph on a run made in a new worktree says that the last reply's question about the merge names what the run's branch started from and the branch of the folder the session left; that, when the two differ, it asks which branch the run's branch is merged into, or whether it is left as it is; and that the loop merges only into the branch the user answers.
11. That paragraph still says that the merge is made only on the user's answer in a later turn, that a merge that stops on a conflict is ended with `merge --abort` and the user is told which files conflict, and that the worktree is not removed; and it says that a session that entered the worktree with its worktree tool first leaves it with that tool, keeping it (it holds `ExitWorktree`), and that the merge is made in the folder where the branch the user answered is checked out.

12. The part says that, in a project whose records home holds `.hstack/repo`, new work beside an unfinished run of an earlier session makes no worktree and starts nothing: the loop tells the user that a project whose code is in a repository of its own has no worktree for new work yet, and that the unfinished run is taken up with `/hstack:build` and its spec's name.

The folder the hooks judge, and the run the stop hook holds. A hook is **of a session** by the `session_id` of its input. **The folder a hook judges** is the work tree its `cwd` is in when that is a work tree of the project's repository, and the project's folder in every other case: an input with no `cwd`, a `cwd` that does not exist, one in no git repository, one in another repository. A run **belongs to** the session of the first hook that judges the run's work tree after the run was started; after a take-up it belongs to the session whose coming allowed the take-up (behaviour 34) when there is one, else to the session of the first hook that judges its work tree after it. "A run of this session" is a run that belongs to it, and to every other session it is **another session's** run. As in spec 9, a run that was there when the start hook ran with `"source":"startup"` in its work tree is an earlier session's, whatever the `session_id`.

In behaviours 13 to 18 the project's folder holds an approved run of this session that is not finished:

13. With a `cwd` that is an existing folder in no git repository, the stop hook holds the turn, with a reason that holds `steps not recorded`.
14. With a `cwd` in a git repository that lies inside the project's folder, is not a work tree of the project's repository and holds no run, the stop hook holds the turn, with a reason that holds `steps not recorded`.
15. With a `cwd` in a git repository outside the project's folder that is not a work tree of the project's repository and holds no run, the stop hook holds the turn, with a reason that holds `steps not recorded`.
16. With a `cwd` in a sub-folder of the project's folder that is in the same repository, the stop hook holds the turn, with a reason that holds `steps not recorded`.
17. With a `cwd` in a worktree of the project's repository that holds no run, the stop hook holds the turn after a change made there, with a reason that holds `steps not recorded` and names the project's folder as the folder of the run, whether the worktree's folder lies beside the project's folder or under `.claude/worktrees/` inside it.
18. With a `cwd` that names no existing folder, the stop hook holds the turn, as before.

In behaviours 19 to 22 the project's folder holds an approved run of an earlier session that is not finished; W is a worktree of the project's repository; and W holds an approved run of this session that is not finished:

19. With a `cwd` in W, the stop hook of this session holds the turn, with a reason that holds `steps not recorded`, as before.
20. With a `cwd` in no git repository, with a `cwd` in a git repository that is not a work tree of the project's repository, and with a `cwd` in the project's folder, the stop hook of this session holds the turn, each time with a reason that holds `steps not recorded` and names W as the folder of the run.
21. After the run in W is done (`done`), the stop hook of this session lets the turn end with each `cwd` of behaviour 20: the run of the earlier session in the project's folder does not hold it.
22. The stop hook of another session, with a `cwd` in the project's folder, lets the turn end: the run in W does not hold it.

The rest:

23. In a session that has no run of its own, beside an approved run of an earlier session that is not finished in the project's folder: with a `cwd` in a worktree of the project's repository that holds no run, the stop hook lets the turn end after a change made there, whether the worktree's folder lies beside the project's folder or under `.claude/worktrees/` inside it.
24. When the top of the project's repository holds `.hstack/repo` and the code repository it names holds an approved run of this session that is not finished: with a `cwd` inside that code repository, and with a `cwd` in no git repository, the stop hook holds the turn, with a reason that holds `steps not recorded`.
25. The start hook chooses its folder the same way: beside an approved run of an earlier session that is not finished in the project's folder, the start hook with `"source":"startup"` and a `cwd` in no git repository prints the text that names that run's spec and the steps not recorded.

No move while a run of this session goes on. The worktree hook is the command of the entry `PreToolUse` of `hooks/hooks.json`; it reads the hook's JSON on its standard input, as the other hooks do. It **refuses** the tool when it prints JSON whose `hookSpecificOutput` holds `"permissionDecision":"deny"` and a `permissionDecisionReason`, and **lets the tool run** when it prints nothing; it exits 0 either way.

26. `hooks/hooks.json` holds an entry `PreToolUse` with the matcher `EnterWorktree|ExitWorktree`, whose command is `bun "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.ts"` followed by one verb of the script.
27. While the project's folder holds an approved run of this session that is not finished, the worktree hook refuses the tool, with a reason that holds `is not finished` and says that the run goes on to its end first.
28. In the scene of behaviours 19 to 22 (the run of this session is in the worktree W), the worktree hook of this session refuses the tool, with a `cwd` in W and with a `cwd` in the project's folder.
29. The worktree hook lets the tool run with no run started, after a run that this session finished (`done`), beside an approved run of an earlier session that is not finished, and while a spec of this session waits for the user's approval.
30. When the folder of an approved run of this session that is not finished is on another branch than the one it was on at `start`, or at its take-up when it was taken up, the stop hook holds the turn, with a reason that holds `steps not recorded`, names both branches, and tells the agent to go back to the run's branch. A run for which no branch was recorded (one that 0.4.6 started and that was not taken up since) is held as before, with no word on a branch.
31. The playbook's Git rule says that, from the approval until the run is done, the session does not move into another worktree, does not leave the one it is in, and does not switch branch, and that a request of the user to do so in the middle of the run is answered as a fact, not as a choice: the run goes on to its end first; and that the one switch of branch in a run is the one back to the run's branch, when the stop hook asks for it.
32. The README's status paragraph holds `Four hooks` and no longer `Three hooks`; its paragraph on a machine where `bun` is not on the `PATH` holds `four hooks` and no longer `three hooks`; the row of `hooks/` in the README's table of paths names the `PreToolUse` hook beside the three others; and `CLAUDE.md`'s part on the hooks names the fourth hook: the session's worktree tool is refused while a run of this session is not finished.

Whose run it is, and the runs of the repository:

33. In a work tree W that holds an approved run that belongs to session A and is not finished: the stop hook of another session B with a `cwd` in W lets the turn end, and the worktree hook of session B lets the tool run.
34. In that scene, after the worktree hook of session B was run for `EnterWorktree` with W's path, or any hook of session B was run with a `cwd` in W, `hstack.ts takeup` run in W takes the run up as it takes up a run of an earlier session, with the refusals and the question about commits that spec 9 gave it; after it, the stop hook of session B with a `cwd` in W holds the turn, with a reason that holds `steps not recorded`, and the stop hook of session A lets its turn end.
35. `hstack.ts runs` prints one line for each work tree of the repository that holds a spec that waits for approval or an approved run that is not finished: the word `waiting` or `unfinished`, the work tree's folder, the spec's path, and for a run the steps not recorded; it prints nothing when there is none, and it prints the same lines from whichever work tree of the repository it is run in.
36. The text that the start hook prints names, beside what it says of the folder it judges, each spec that waits and each approved run that is not finished in another work tree of the project's repository and is not this session's: the spec, the work tree's folder, and that the user goes on with it by typing `/hstack:build` and the spec's name. A run of this session in another work tree (after a resume) is named as this session's own, with its folder and the steps not recorded, and with no command to take it up.
37. The part "What the user typed" says that a name that is no spec of the session's own folder is looked for among the lines of `$H runs`; that, when it is the spec of another work tree, the loop moves the session into that work tree with its worktree tool, by its path, and goes on there as it does for a spec or a run of the session's own folder (the waiting spec is shown again; the run is taken up); that, when the session cannot be moved there, the loop starts nothing and tells the user to open a session in that folder; that, in a session whose own approved run is not finished, such a name moves nothing and starts nothing: the loop says that this session's run goes on to its end first; and that a name found nowhere is a new request, as before.
38. In the scene of behaviours 19 to 22, after the stop hook reached its cap for the run in W: once the start hook of this session ran with `"source":"resume"` and the project's folder as `cwd`, the stop hook with a `cwd` in W holds the turn again, and `hstack.ts elapsed` run in W does not count the time between the session's last stop hook and the resume.

The README:

39. The README's opening paragraph, which is the first paragraph after the line in bold under the title, no longer starts with `You ask for a feature.`; it holds `/hstack:build` and says that the loop starts when the reader types that command followed by what they want built.
40. The README's quick start no longer holds `ask for what you want in plain words`, and the code block after its install commands holds the line `/hstack:build add a CSV export to the invoices page`.
41. The README's quick start says that a request made without `/hstack:build` is done directly, and holds `without the loop`.
42. The four numbered steps of the README's quick start are as they were.

The version:

43. `.claude-plugin/plugin.json` holds `"version": "0.4.7"`, and the README's status paragraph starts with `**Status: v0.4.7.**` and still holds the words `brainstorm` and `grilled`.

The time:

44. The playbook's rule "Time." no longer holds `Start-time rules`, `elapsed < 150`, `elapsed < 180` or `210`; it says that `$H elapsed` and `$H times` measure the run for the last reply, and that no step is skipped, cut short or made narrower because of the time.
45. The headings of the playbook's steps 2, 3, 7 and 8 are `## 2. Setup: capabilities`, `## 3. Oracle`, `## 7. Explore` and `## 8. Mutate`, with no limit in minutes; the item "What goes against the record" no longer holds `at most 15 minutes`.
46. The playbook gives no agent a deadline: neither its rule "Agents." nor its steps 3, 6, 7 and 8 hold `deadline`; and none of `agents/oracle.md`, `agents/reviewer.md`, `agents/explorer.md` and `agents/mutator.md` holds `deadline` or `date +%s`.
47. Each agent's file says when its work is done: the oracle's, when every behaviour of the spec has one or more tests; the reviewer's, when it has read every file of the change; the explorer's, when every behaviour of the spec, and every earlier step it was given, has a verdict; the mutator's, when every behaviour of the spec has had a fault planted in the code that carries it, or is reported as having none to plant.
48. The playbook and the four agents' files say that one item of work (a behaviour to test or to walk, a finding to reproduce, a red test to fix, a planted fault to kill) is tried at most three ways; after the third it is written down as not resolved, with the ways tried, the work goes on with the next item, and step 10 lists it under "Needs your ruling".
49. The playbook's step 6 runs its second round whenever the first led to a fix, and its steps 7 and 8 always start: the playbook no longer holds `one round only past 180`, `not past 180 minutes`, `start only if elapsed` or `skipped: time`; a step is recorded as skipped only for a reason that is not the time.
50. The playbook's step 9 runs every suite whole on the last commit of code, and no longer holds `the widest suite the time allows`.

The name of the step 4 skill:

51. The folder `skills/implement/` holds the twelve files that `skills/build-implement/` held, with the texts they had, and the folder `skills/build-implement/` is gone.
52. The header of `skills/implement/SKILL.md` holds `name: implement`, and its first heading names `implement` and no longer `build-implement`.
53. The playbook's step 4 invokes `hstack:implement`, and its step 6 gives the reviewer the four design files of `skills/implement/`; no file under `skills/`, `agents/`, `scripts/` or `hooks/`, nor `README.md`, nor `CLAUDE.md`, holds `build-implement`.
54. In the README, the skills table has a row `implement` and none `build-implement`, the row of `skills/` in the table of paths names `implement`, the status paragraph names `skills/implement/design-rules.md`, and the section "License" names the five licence files of that folder by `skills/implement/…`.

## 4. Against the record

Each of these is a step the user approved, or a decision of a builder; this spec changes it or widens it. The user chose each change in the brainstorm (section 2).

Spec 9 (`docs/specs/2026-11-23-build-on-demand.md`):

- S9-F1-S13: "… the loop makes a new git worktree from `HEAD`, on a new branch, in a folder outside the repository, moves the session into it, and runs the whole loop there; it tells the user the worktree's path and branch. The unfinished run's folder, state, branch and commits stay as they were." A step the user approved. The worktree is now made by the session's worktree tool under `.claude/worktrees/` inside the repository, from the base the tool chooses or the base the user names, and the loop tells the user the base too (behaviours 1 to 7). The last sentence stands (behaviour 3).
- S9-F1-S14: "After the session moved into that worktree, the start, prompt and stop hooks judge the worktree, by its own state folder, and not the folder that holds the unfinished run." Kept: the unfinished run there is an earlier session's. It now holds for a worktree inside the project's folder too (behaviour 23).
- S9-F1-S15: "When the session cannot be moved into a new worktree, the loop makes none, starts nothing, and tells the user to open a session in a new worktree of the repository." Kept, and widened to a base that does not exist or cannot be reached (behaviour 8) and to a project whose code is in a repository of its own (behaviour 12).
- S9-F1-S18: "… the last reply asks the user whether to merge its branch into the branch the worktree was made from. Only on the user's yes, in a later turn, the agent merges it, in the folder where that branch is checked out …" The question now names the base and the branch of the folder the session left, and the loop merges into the branch the user answers (behaviours 10 and 11).
- S9-F1-S4: "Beside an approved run of an earlier session that is not finished, the text that the start hook prints names its spec and the steps not recorded, says that the user goes on with it by typing `/hstack:build` and the spec's name, and that other work does not need it." Kept, and widened to the specs and runs of the other work trees of the repository (behaviour 36).
- S9-F1-S9, S9-F1-S10 and S9-F1-S12: a spec that waits, or an approved run that is not finished, is taken up by its spec's file name, and "`/hstack:build` followed by a name that is the file name of no waiting spec and of no unfinished run is a new request". Kept, and widened: the name is also looked for in the other work trees of the repository, and the session moves there (behaviour 37).
- S9-F1-S16: "When a session that holds an approved run not finished is resumed (`resume`), `$H elapsed` no longer counts the time in which no session worked on the run." Kept, and made true for a run in a worktree the session moved into (behaviour 38).
- The spec's sentence on "of an earlier session" ("the run or the spec was there when the start hook ran with `startup`") and its section 6 ("Two sessions in the same working folder: a session that started before the other's run started takes that run for its own and is held by it"). The first is kept and a second mark is added: the session a run belongs to. The second changes: a run belongs to one session, and the other is not held by it (behaviour 33); but which of two sessions in one folder the run belongs to is decided by whose hook is run first there after `start`, not by who started it, so two sessions in one folder stay a limit and the advice stays a worktree. No earlier test has two sessions meet in one folder and expects a hold: where a test gives its hooks two session ids (`tests/build-on-demand.test.ts`, `tests/turn-reference.test.ts`), a start hook with `startup` stands between them and the later session's turn is expected to end, as behaviour 33 has it.
- The spec's section 2, the grill: "The loop makes the worktree itself"; and "Left to the builder. How the session is moved into the new worktree … and how the hooks follow the folder the session works in". Both are now the user's decisions.
- Decisions of the builder (`docs/specs/2026-11-23-build-on-demand.decisions.md`):
  - E1: "The hooks judge the folder the session works in: the `cwd` of the hook's input, else `CLAUDE_PROJECT_DIR`, else `.`." Narrowed: the `cwd` is followed only into a work tree of the project's repository (behaviours 13 to 16, 18, 24, 25). And its test, `tests/build-on-demand-edges.test.ts` "E1: the hooks judge the folder of the input's cwd: a change in a worktree with no run ends, though CLAUDE_PROJECT_DIR holds an unfinished run of this session", is reversed: that turn is now held, because the run in the project's folder is this session's (behaviour 17; the user: "Câu 1: có").
  - E2: "A `cwd` that names no existing folder is not followed: the project's folder is judged, as before." Kept, and widened (behaviours 13 to 15, 18).
  - R3: "The new worktree is made outside the repository." V1: "the new worktree is made in a lasting folder beside the repository". V3: the Git rule's exception "names the worktree made by git worktree add". X1: "Kept as the spec says", listed under "Needs your ruling". The user ruled: the worktree is under `.claude/worktrees/`, made by the tool (behaviours 1, 9).
  - E15, X2 and the lines of its section `## Design` on the worktree: their words on how the worktree is made and removed change with behaviours 1, 6 and 8.
  - E21: "The version stays 0.4.6". Now 0.4.7 (behaviour 43).
- Tests of that spec that pin what changes, all in `tests/build-on-demand-edges.test.ts`: "E15: step 1 sends new work beside an earlier session's unfinished run into a new worktree the session moves into, …" (its phrase ``new worktree from `HEAD`, on a new branch``); "R3: the new worktree for new work is made in a folder outside the repository, with git, and the session is then moved into it"; "V1: the new worktree is made in a lasting folder beside the repository, not in the system's temporary folder"; "V3: the Git rule's exception names the worktree made by git worktree add, …"; "V13: the worktree made as the playbook says leaves the unfinished run's folder, state, branch and commits as they were (behaviour 13)" (it makes the worktree beside the repository); "X2: when the session cannot be moved into the new worktree, the playbook removes the worktree and its branch it made (behaviour 15)" (its two git commands); "E16: the last reply of a run made in such a worktree asks before a merge, merges only on the user's yes, aborts a conflict and keeps the worktree" (its phrases `Only on their yes` and `merge <this branch>`, with behaviours 10 and 11).

Spec 3 (`docs/specs/2026-11-22-script-call-and-dir-rule.md`):

- S3-F1-S8: "The section `## In hstack` of `skills/brainstorm/SKILL.md` holds `Nothing in the repository changes before the spec is approved but the spec file itself`." Kept, word for word. The playbook now says beside it that taking a base for the worktree is not such a change (behaviour 6).

Spec 4 (`docs/specs/2026-11-22-turn-reference.md`), two steps the user approved, changed by the fourth hook (behaviour 32), and a decision of its builder:

- S4-F1-S22: "The README's status paragraph holds `Three hooks`, and no longer holds `Two hooks` or `before anything changed`." Now `Four hooks`. Its test: `tests/turn-reference-texts.test.ts` "22: …".
- S4-F1-S23: "The README's paragraph on a machine where `bun` is not on the `PATH` holds `three hooks`, and no longer holds `Both hooks` or `both hooks`." Now `four hooks`. Its test: `tests/turn-reference-texts.test.ts` "23: …".
- Decision E20 of the builder (`docs/specs/2026-11-22-turn-reference.decisions.md`): the row of `hooks/` in the README's table names three hooks. Now four (behaviour 32).

The version, in the steps of six earlier specs, each a step the user approved, each with a test that pins `0.4.6`:

- S2-F1-S40, S6-F1-S43 and S8-F1-S13: "`.claude-plugin/plugin.json` holds `"version": "0.4.6"`, and the README's status paragraph starts with `**Status: v0.4.6.**` and [still] holds the words `brainstorm` and `grilled`."
- S3-F1-S7 and S4-F1-S21: "`.claude-plugin/plugin.json` holds `"version": "0.4.6"`, and the README's status paragraph starts with `**Status: v0.4.6.**`."
- S7-F1-S11: "`.claude-plugin/plugin.json` still holds `"version": "0.4.6"`, and the README's status paragraph still starts with `**Status: v0.4.6.**`."
- Their tests, which take the new number: `tests/brainstorm-texts.test.ts` "40: …", `tests/script-call-and-dir-rule.test.ts` "7: …", `tests/turn-reference-texts.test.ts` "21: …", `tests/design-before-code-texts.test.ts` "36: …", `tests/design-follow-ups-texts.test.ts` "11 (holds at the base, and must stay): …", `tests/last-reply-step-lines-and-log-texts.test.ts` "13: …".

The name of the step 4 skill, in eight steps the user approved; each takes the new path `skills/implement/…` and keeps the rest of its words (behaviours 51 to 54):

- S5-F1-S1 ("Item 4 of `skills/build-implement/SKILL.md` holds …") and S5-F1-S3 ("In `skills/build-implement/tdd.md`, the item that starts with …").
- S6-F1-S1 ("Exactly one file of `skills/build-implement/` has `# Design Rules (code modules & skills)` as its first line."), S6-F1-S4, S6-F1-S5 and S6-F1-S16, and the description of spec 6's feature.
- S9-F1-S5 and S9-F1-S6 ("… `skills/build-implement/SKILL.md` …").
- Their tests, which take the new path: `tests/skills.test.mjs`, `tests/design-before-code-texts.test.ts`, `tests/design-before-code-edges.test.ts`, `tests/no-stash-texts.test.ts`, `tests/no-stash-edges.test.ts`, `tests/build-on-demand.test.ts`, `tests/design-follow-ups-texts.test.ts` and `tests/design-follow-ups-edges.test.ts`.
- Earlier specs, their decisions files, the plans, the designs in `plugin-dev/` and the logs keep the old name: they say what was so when they were written.

The time: no recorded step and no test pins a limit that goes (the marks at 150, 180 and 210 minutes, the caps of the steps, the agents' deadlines, the 15 minutes of the search against the record). The tests of the script that record a step as `skipped: time` (`tests/hstack.test.ts`) stay as they are: the script still takes any reason.

The README's opening paragraph and quick start: no recorded step and no test pins the sentences that change.

## 5. Open points

None.

## 6. Not in this spec

- The push of `main`, the closing of issues 10 and 11, the update of the installed plugin.
- A worktree for new work in a project whose code is in a repository of its own (`.hstack/repo`): feedback issue 12.
- A ledger of runs shared by several machines, and going on, on one machine, with a run that another machine started: the view of behaviours 35 to 37 is of one machine. The user plans several virtual machines; this is an issue of its own, to be posted on the user's word, with a brainstorm of its own.
- The number of holds of the stop hook's cap.
- Three limits in minutes that tests pin and that were not talked over: step 2's rule that whole runs of a suite at the base are made only while their estimated time stays under 5 minutes, the 10 minutes that all base checks of a run share, and the sentences that hold `whatever the clock`. They stay as they are.
- The time after which the coding tool itself ends a command, and the idle time of the mock-up server.
- A run started with the script from inside a nested repository that is not the project's (no `.hstack/repo` names it): the hooks judge the project's folder, so that run is not held by the stop hook. A project whose code is in a repository of its own names it in `.hstack/repo`.
- A run after whose `start` no hook was ever run with a `cwd` in its work tree belongs to no session yet, and is held from nowhere.
- `runs` and the start text cannot tell a run that was left from one that another session is working on now. A take-up by name takes the run from that session; the user, who types the name, decides.
- The take-up of a waiting spec or of an unfinished run, the refusal of new work beside this session's own run, and what the stop hook holds: as spec 9 left them.
- The benchmark in `bench/`.
