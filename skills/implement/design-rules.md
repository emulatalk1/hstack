# Design Rules (code modules & skills)

"Module" = anything with an interface and an implementation: a function, class or package in code, or a skill.
"Caller" = whoever uses it (code, user, or agent).
For a skill: interface = name + description (what triggers it);
internals = instructions, scripts, references (progressive disclosure).

1. **Deep Modules (small interface, rich functionality)**
   - Expose the smallest interface that covers real use cases; the common case must be simple.
   - Information hiding: internals stay private, modules interact only through interfaces, callers never coordinate internal pieces (avoid shallow modules).
   - Explicit contract: what it does, when to use it, how it fails.

2. **Separation of Concerns (inside a module)**
   - Separate decisions (policy, business logic) from mechanics and side effects (I/O, tools, external systems).
   - Decision logic must be understandable and testable without running the side effects.

3. **Pragmatic SOLID**
   - **SRP** at the capability level: one coherent capability, one reason to change (one actor driving it). Not one function per module.
   - **DIP & ISP** at seams: depend on narrow interfaces shaped by the module's needs, not the provider's, so the core stays testable and providers stay swappable.

4. **Contextual DRY**
   - **Single Source of Truth** for knowledge: each rule, invariant, or fact lives in exactly one owning module. Consolidate immediately.
   - **Rule of Three** for look-alike code or text: do not abstract until it repeats 3 times and changes for the same reason. Coincidental similarity stays separate.
