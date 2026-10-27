# Plans

* [hstack foundation plan](2026-10-26-hstack-foundation.md) - The plugin skeleton, init, the manifest, the OKF checker and the safety checks every later hstack step calls.
* [Bun runtime plan](2026-10-26-bun-runtime.md) - Move hstack's scripts, tests and skills from Node to Bun, using Bun's own APIs wherever Bun has one.
* [Own services plan (stack A)](2026-10-27-own-services.md) - Superseded, never built. init gives a stack A project its own Postgres and Mailpit in a named compose file, assigns their ports and writes the ports into the app's .env.
