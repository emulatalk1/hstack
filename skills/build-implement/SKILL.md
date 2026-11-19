---
name: build-implement
description: Step 4 of the hstack build loop - the spec, the feature written test-first, the checks. Invoked by hstack:build at its step 4 and by nothing else. For any request to build, change or fix code, invoke hstack:build, not this.
---

# hstack build-implement: step 4 of the build loop

You are here from step 4 of `hstack:build`: that loop gave you `H` and `S`, and its steps 1 to 3 ran in this session. If that is not so (you came here straight from a request to build, change or fix something), do nothing here and invoke `hstack:build`, which starts the run. If it is so, run `$H missing`: its first word must be `implement`. If it is another step, go back to that step in the loop; never run `$H start` again in this run.

Do the items below in order, then go back to the loop for the commit and `$H phase implement`.

1. **Read** the code the requirement touches and the neighbouring features that do similar things.
2. **Spec.** Write `$S/spec.md`: numbered behaviours; every entry point the feature is reached by (each page, endpoint, command, public function, import or export path, serializer, setting); each open edge from the oracle report and every other edge you see (empty, missing, invalid, boundary values, errors, permissions, existing data, repeated actions, ordering, other entry points) with a decision that cites the requirement or the existing code it follows. Decide an edge the way this codebase already decides the same case.
3. **The test rules.** Read `tdd.md` and `writing-good-tests.md` in this skill's base directory, both to the end. From here to the end of the run they are the rules for every test and every line of product code you write.
4. **Implement,** in the style of the neighbouring code, one decided edge or rule at a time, by the cycle of the test rules: its test where the project's test command finds it, the run that fails on the missing behaviour, the code, the run that passes. Run tests in their single-file or single-target form from the capabilities.
5. **The oracle's tests.** Make them pass **without editing them**. If one contradicts the requirement or a fact of the existing public interface, use the dispute rule of step 4 in the loop.
6. **Check.** Run the tests near the change, then the widest suite the time allows, then build, type-check and lint as the capabilities have them. No failure the base did not have.
