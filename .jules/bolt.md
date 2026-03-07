## 2024-05-22 - Stealth Scanning Performance
**Learning:** Checking stealth addresses involves expensive elliptic curve math (~5.5ms per check). Doing this synchronously for 1000+ items freezes the UI for >5 seconds. Optimization attempts involving manual key derivation proved risky due to library-specific implementation details.
**Action:** Use async chunking (yielding to event loop) for heavy CPU tasks like scanning. Use `Promise.all` for independent data fetches.

## 2024-05-23 - Stealth Scanning String Hoisting
**Learning:** In hot cryptographic paths like `checkStealthAddress`, even simple string manipulations like `toLowerCase()` and `startsWith()` add up when executed inside a closure that runs multiple times (e.g., dual-evaluations of X-only keys).
**Action:** Always hoist string manipulations and constants outside of iterative closures in hot paths.
