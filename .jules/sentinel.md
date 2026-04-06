## 2025-05-14 - Fix Insecure Randomness in ID Generation
**Vulnerability:** Use of `Math.random()` for generating announcement IDs in `src/lib/gunStealth.ts`. `Math.random()` is not cryptographically secure and can lead to predictable IDs, which might be exploited to guess or collide with existing announcement IDs in a decentralized environment like GunDB.
**Learning:** Always use a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) for identifiers that are used as keys or in sensitive contexts. `uuidv4()` is a reliable choice when the `uuid` package is available.
**Prevention:** Avoid `Math.random()` for anything other than non-critical UI effects. Use `crypto.randomUUID()` or established libraries like `uuid` for secure ID generation.

## 2026-04-05 - Remove Insecure Global Exposure of App State
**Vulnerability:** Exposing the core SDK instance (`shogunCore`), `gun` instance, and a debug object (`shogunDebug`) to the `window` object in development mode. This exposes internal state, cryptographic keys (potentially), and sensitive functionality (like `clearAllData`) to any script running in the browser.
**Learning:** Development-only debug helpers that expose core SDKs to the global scope (`window`) are dangerous anti-patterns that can easily leak into production or be exploited in a multi-tenant environment.
**Prevention:** Avoid attaching internal state or core SDK instances to the global `window` object. Use browser developer tools' local state inspection or dedicated, non-global logging for debugging instead.
