# Plans

* [hstack foundation plan](2026-10-26-hstack-foundation.md) - The plugin skeleton, init, the manifest, the OKF checker and the safety checks every later hstack step calls.
* [Bun runtime plan](2026-10-26-bun-runtime.md) - Move hstack's scripts, tests and skills from Node to Bun, using Bun's own APIs wherever Bun has one.
* [Own services plan (stack A)](2026-10-27-own-services.md) - Superseded, never built. init gives a stack A project its own Postgres and Mailpit in a named compose file, assigns their ports and writes the ports into the app's .env.
* [Measuring stick: pre-registration plan (Part 1)](2026-10-27-benchmark-prereg.md) - Hypotheses, task set, oracle, validation, task and run counts, cost and acceptance thresholds of the benchmark that measures the hstack harness, registered before any run.
* [Benchmark tools plan](2026-10-27-bench-tools.md) - Step 2 of the benchmark pre-registration: the throwaway environment, the oracle grader, the bug replay for test and agent layers, and the arm runner with its fixed responder.
* [Benchmark inputs and replay readiness plan](2026-10-27-bench-inputs.md) - Prereg step 3a (filtered input, filter log and interface sheet of every real-estate task, each by a sealed agent) and the three gaps to close before the sealed replays of step 3.
* [Held-out set and layer replay plan](2026-10-27-bench-replay.md) - Prereg step 3: sweep framework identifiers out of the inputs, extend the held-out set by a sealed agent, replay the existing layers on the dev and held-out sets, and lock the result.
* [External task selection plan](2026-11-02-bench-external.md) - Prereg step 4: register the rulings section 4.2 leaves open, enumerate and sort the external candidates once, walk the list in order checking each task in a container, and lock 24 tasks.
