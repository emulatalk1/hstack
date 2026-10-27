# Update Log

## 2026-10-27

* **Approve**: the [benchmark pre-registration plan](/plans/2026-10-27-benchmark-prereg.md) (status `stable`), with the order "whole measuring stick first, then the plugin". The budget line is still open.
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
