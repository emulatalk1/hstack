# The design section

What the section `## Design` of `$S/decisions.md` says, and when it changes. The builder writes it at step 4, before any line of product code; the reviewer of step 6 reads the code against it. The rules it is written by are in `design-rules.md`, in this folder: that file is "the rules file" below. How to design a module is in `deep-modules.md`.

Every line of the section must be one that can be checked against the code.

## The order of the sources

A project's own written rules come first; then the way the existing code already does it; then the rules file; then everything else in these texts.

- **A project's own written rules.** Look where the project keeps its rules for how code is written: its instructions file, a contributing or coding-standards file, its README. The first line of the section names the files that hold such rules, or says that there are none. This first line stands before the design and is not counted in its length: a small change has it, and then its one line.
- **The way the existing code already does it.** Read the code around the change, and arrange the new code as that code is arranged.
- **The rules file** binds the code this run adds. Nobody restructures the rest by it.
- **Everything else in these texts** (this file, `deep-modules.md`, and what the reviewer reads) says how to follow the rules; where it seems to say more than they do, they hold.

## What the section says

Before any line of product code, map out which files will be created or modified and what each one is responsible for.

- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the design is reasonable.

The split of such a file has its own part, the last of this file.

## One home for each rule

This is rule 4 of the rules file, said for the section.

Before you write a rule, a number or a format into new code, ask: Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.

For each rule, number or format that the spec brings in or changes, the section names the one file that holds it.

When what is built is a skill, the section names the file that owns each rule and each place that repeats it on purpose, with the reason. A copy that the section names with its reason is how rule 4 holds for a skill, not a breach of it. An agent that runs apart has only its own file and what it is started with, so a rule it must follow is repeated in its file, and the section says so.

## When the design proves wrong

When the design proves wrong, or cannot be applied, while you write the code: write the correction into the section first, with what you found and why, and keep the earlier line. Then go on with the code, by the corrected design. The run does not stop for it.

## The split of a file that existed before the run

The test rules leave the code that existed at the base as it is (`tdd.md`, the part on the refactor step). A split is the one thing a run may do to such code, on three conditions:

- A split of a file that existed before the run is made only when the section names it before any line of product code; it is made first, before any other line of product code of the feature, and never after the review.
- Its reason is a rule of the rules file (a file that does several unrelated jobs), never a count of lines.
- It changes no behaviour: every test that passed before it passes after it, in the forms the capabilities allow at this step, and no line changes in a test that existed at the base or in a test of the oracle. When it would need such a line to change, do not split, and write that in the section.

This split is the one exception to the order of the sources: here the rules file is put before the way the existing code already does it. It is for the file the change must modify and no other, and it is allowed, never required.

A split that the section named and you did not make is named in the log entry of the run (step 10 of the playbook).
