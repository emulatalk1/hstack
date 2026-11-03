# Update Log

## 2026-11-03
* **Update**: Recorded in ruling 10 of the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (section 4.2) the user's decision of 2026-11-03: Docker keeps 7.6 GB and 8 CPUs, a repo whose tests need more memory is `out of memory`, and every such out is reported to the user.
* **Update**: Added to ruling 10 of the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (section 4.2) that each recipe probe also runs a non-test file from a test folder, and that candidates rejected before this change for `PR tests do not pass at end` are rechecked, after a sealed diagnosis traced the first such reject to the recipe interface.
* **Update**: Added to ruling 10 of the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (section 4.2), after the list commit and before any task was accepted, the out reason `out of memory`: a test run Docker reports OOMKilled is the repo not fitting this machine (7.6 GB, 8 CPUs), after `end build failed`; the recipe brief states the memory limit.

## 2026-11-02
* **Update**: Registered in the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (section 4.2) the rulings for step 4 before any enumeration: the stacks (Django or Rails, Electron, Rust), the repo universe and snapshot window, the sort key with its test vectors, the walk order, the base and end commits, and the user's decisions of 2026-11-02.
* **Creation**: Added the [external task selection plan](/plans/2026-11-02-bench-external.md) (draft), step 4 of the pre-registration: the rulings section 4.2 leaves open, one sorted candidate list committed before any check, and a walk in sort order that checks each task in a container.

* **Update**: Added "Corrections after the final review" to `progress/step3-lock.md`, with no locked line changed: the three kept `setup failed` errors are most likely caused by the bugs themselves, not the harness (not diagnosed); every held-out bug file is at 69ebe27 (`bench/bugs.mjs --at-tally`, new and read-only); ho-04's unit rerun was cut by hand; the judge's caught path was probed before the dev review's 0/18; and the SHA-256 of the owner tables, the dev bug files and the replay scripts. The [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) now says a fix-tally count tells whether a listed sha is a held-out fix, so it runs only on the registered list.
* **Update**: Locked the step 3 replay of the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) in `progress/step3-lock.md`: the summary for the dev and held-out sets, the standing dev results beside the dev replay of review and audit, the second labeller's 21 drops (agreement 76.1%), the three kept `setup failed` errors, and the SHA-256 of the held-out files, the results, the 16 inputs and sheets and the briefs. From that commit the held-out commits may be opened as oracle sources.

## 2026-10-28

* **Creation**: Added the [held-out set and layer replay plan](/plans/2026-10-27-bench-replay.md) (draft), step 3 of the pre-registration. Review and audit run on 18 of the 20 dev bugs: ownership by the blame tables gives no usable task to two.

## 2026-10-27

* **Creation**: Added the [Own services plan (stack A)](/plans/2026-10-27-own-services.md) as a record, status `superseded`: it was drafted (own Postgres and Mailpit per project, assigned ports, the compose file in `.hstack/`) and set aside the same day for a stack-agnostic harness with a throwaway environment per run.
* **Approve**: the built [benchmark tools plan](/plans/2026-10-27-bench-tools.md) (status `stable`). The build departs from the task text where the pre-registration or the evidence required it (precondition marker, replay exclusion over the fix to the replay commit, a baseline run, two known-bad versions, intervention count, no `.git` for replay agents, a fresh repo per arm run); every ruling is in the progress log.
* **Update**: Checked the benchmark tools against the p8b pilot (task 8 of the [benchmark tools plan](/plans/2026-10-27-bench-tools.md)): the five oracle validations, now with a `PRECONDITION:` step per check, give the pilot's 17 non-weak and 3 weak checks, and at the task base 8 checks of older behaviour and 9 of features the task added. Added `bench/README.md`. Replay now starts no app of its own and excludes only the fix's own row of a table test.
* **Creation**: Added the [benchmark tools plan](/plans/2026-10-27-bench-tools.md) (draft), step 2 of the pre-registration.
* **Approve**: the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (status `stable`), with the order "whole measuring stick first, then the plugin". 
* **Update**: [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md): the user set no budget limit; the plan runs to completion and the cut ladder is not used.
* **Creation**: Added the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (draft), with its scripts in `bench/` (oracle sources by blame, input check, sample sizes).

## 2026-10-26

* **Approve**: the decision [hstack runs on Bun](/decisions/2026-10-26-bun-runtime.md) (status `stable`). The user approved it after the Bun runtime build and its final review.
* **Creation**: Added the [hstack runs on Bun](/decisions/2026-10-26-bun-runtime.md) decision (draft): Bun only, no Node fallback, and the behavior changes the build accepted.
* **Approve**: the [Bun runtime plan](/plans/2026-10-26-bun-runtime.md) (status `stable`), with Bun 1.4.4 or later. The user approved it after an advisor round.
* **Creation**: Added the [Bun runtime plan](/plans/2026-10-26-bun-runtime.md) (draft): the user decided to move hstack to Bun completely.
* **Update**: Ran the [Foundation check on both stacks](/foundation-check.md) again on Bun 1.4.4: the manifest and the set of warnings equal the Node run, the client repo stayed clean and the four checks answer as before.
* **Update**: Re-ran the [Foundation check on both stacks](/foundation-check.md) after the final review fixes (docker, port, drop and OKF checks; the compose warning now names the compose file's folder).
* **Creation**: Added the [Foundation check on both stacks](/foundation-check.md), the output of init and the safety checks on both stacks.
* **Approve**: the [hstack foundation plan](/plans/2026-10-26-hstack-foundation.md) (status `stable`). The user approved it after two advisor rounds and chose subagent-driven execution.
* **Update**: Made `docs/` an OKF v0.2 bundle. Moved `brief.md` to [hstack brief](/design/2026-10-25-hstack-brief.md), `layers.md` to [hstack layers](/design/2026-10-26-layers.md), `adapter-schema.md` to [Adapter schema](/design/2026-10-26-adapter-schema.md), `adapters/A.md` and `adapters/B.md` to [Stack A adapter](/references/adapters/2026-10-26-stack-a.md) and [Stack B adapter](/references/adapters/2026-10-26-stack-b.md), `evaluator-brief-exploratory.md` to [Evaluator brief: exploratory first](/references/2026-10-26-evaluator-brief-exploratory.md), and `superpowers/plans/2026-10-26-hstack-foundation.md` to [hstack foundation plan](/plans/2026-10-26-hstack-foundation.md). Added frontmatter, index files and this log.
* **Update**: Added the Knowledge layer section to [hstack layers](/design/2026-10-26-layers.md), and the OKF checker task and OKF paths to the [hstack foundation plan](/plans/2026-10-26-hstack-foundation.md).
* **Creation**: Added the [Stack A adapter](/references/adapters/2026-10-26-stack-a.md), the [Stack B adapter](/references/adapters/2026-10-26-stack-b.md), the [Adapter schema](/design/2026-10-26-adapter-schema.md), the [hstack foundation plan](/plans/2026-10-26-hstack-foundation.md) and the [hstack layers](/design/2026-10-26-layers.md).
* **Creation**: Added the [Evaluator brief: exploratory first](/references/2026-10-26-evaluator-brief-exploratory.md) for the evaluator pilot.

## 2026-10-25

* **Creation**: Added the [hstack brief](/design/2026-10-25-hstack-brief.md).
