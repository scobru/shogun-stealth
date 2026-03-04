## 2024-05-22 - Stealth Scanning Performance
**Learning:** Checking stealth addresses involves expensive elliptic curve math (~5.5ms per check). Doing this synchronously for 1000+ items freezes the UI for >5 seconds. Optimization attempts involving manual key derivation proved risky due to library-specific implementation details.
**Action:** Use async chunking (yielding to event loop) for heavy CPU tasks like scanning. Use `Promise.all` for independent data fetches.

## 2025-03-03 - Hoisting String Operations in Cryptographic Loops
**Learning:** During stealth address scanning, `tryCheck` is often called multiple times for a single announcement (specifically, dual-evaluations for X-only public keys where both 0x02 and 0x03 prefixes are attempted). By default, string manipulations for `viewTag` normalization (like `toLowerCase()` and `startsWith()`) were trapped inside this closure, causing redundant execution in a hot loop.
**Action:** Always inspect the scope of iterative helper functions (like `tryCheck`) inside scanning loops. Hoist static string manipulation or parsing out of closures that execute multiple times per iteration to eliminate redundant CPU cycles.
