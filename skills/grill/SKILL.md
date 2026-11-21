---
name: grill
description: Step 1 of the hstack build loop - the grill of the spec that waits for the user's approval, when the user asks for one. Invoked by hstack:build at its step 1 and by nothing else. For any request to build, change or fix code, invoke hstack:build, not this.
---

## In hstack

A grill is of a spec. With no spec waiting for the user's approval, say so and do nothing (a spec waits when the loop's state folder holds the file `spec` and its file `phases` has no line `spec`). With one waiting: you are here from step 1 of `hstack:build`, at the case "A grill" of its item "The user's next message", because the user asked for a grill. If the loop did not send you, do nothing here and invoke `hstack:build`, which sends you back here.

The text below is followed as it stands; what hstack adds to it:

- It runs on the spec that waits for the user's approval. The design tree is the spec's: what each behaviour leaves unsettled (its edges, its failures), what was agreed and what follows from it, what goes against the project's record, what is left outside.
- Write each answer that changes the spec into the spec file, then run `$H spec <file>` again. An answer is written when the user has given it, never before. Writing it down is not acting on it: nothing is built before the approval.
- Change no file but the spec.
- When the frontier is empty and the user has confirmed, go back to the playbook: its case "A grill" says how the turn ends. Never take a word of the user in the middle of a round for the approval of the spec.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
