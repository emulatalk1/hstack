# The review of a design

How the reviewer of step 6 reads the design of a change: the code this run added, against the section `## Design` of the builder's decisions and against the rules file, `design-rules.md` in this folder. What the section must say, and the order of the sources of rules, are in `design-note.md`; the words "module", "interface" and "seam" are those of `deep-modules.md`.

A project's own written rules are in the files that the first line of the section names: read them before you judge the design.

A design finding is about code this run added: every line that the diff from the base adds or rewrites. Read the older code around it to understand the change, not to search it: report a design problem in older code only where the change runs into it. A design finding in code that existed before this run is marked "outside the change". It is written and graded as any design finding, and it counts in `## Verdict`. The builder does not fix it; it is reported to the user.

## The code against the section

- Is the implementation following the file structure from the section `## Design`?
- A difference between the code and the section that no line of the section explains is a finding. A difference that a later line of the section explains, with what the builder found and why, is none.
- Each rule, number or format to which the section gives one home: look for it in the change. In a second place it is a finding, with both places. A test or a document that states a rule in order to check it or to explain it is not a second place. Two pieces of code that look alike and do not have to change together stay apart.
- A rule, number or format that the spec brings in and to which the section gives no home is a finding: the section is behind.
- For a skill, a finding is a copy of a rule that the section does not name, or two copies that say different things; a copy the section names with its reason is not one.
- Code this run added that breaks one of the project's own written rules is a design finding, graded as any other.
- A split of a file that existed before the run: the section names it, its reason is a rule of the rules file (`design-note.md`, its last part), and the history shows it as a commit of its own before the feature's code. A split the section does not name is a finding. A line that exports moved code again from the old file, and that the section names as a debt, is no finding; code this run added that reaches the moved code through it is one. A line that exports everything at once from the old file is a finding, whether the section names it or not. A test of the oracle, or one that existed at the base, that reaches the moved code through the line is no finding: such a test may not change, and the line is there for it.

## Leads

A smell is a lead, not a finding: it becomes a finding only when its four parts can be written, and its severity is set then. The four parts are in your own file: what this is, the problem, the fix, and what happens if it is skipped.

The smells below are the baseline. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.

Two more leads, for rule 4 of the rules file:

- reuse: the repo already has this helper (name the path)
- merge: near-copies that must change together

A lead never overrules the rules file. "Duplicated Code" speaks at two copies; rule 4 says when two copies are one rule, which is consolidated at once, and when they only look alike, which waits for the third.

## No finding

Zero findings is a valid result; do not invent one.

## The fix of a design finding

Ask it in round 2, of each design finding the builder fixed:

- **Does this refactor reduce complexity or just relocate it?** Count the concepts a reader must hold to follow the change. If a "cleaner" version leaves that count unchanged, it isn't cleaner — prefer the restructuring that makes whole branches, modes, or layers disappear over one that re-centralizes the same logic. Prefer deleting an abstraction to polishing it.
