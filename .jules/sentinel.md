## 2025-05-14 - Fix Insecure Randomness in ID Generation
**Vulnerability:** Use of `Math.random()` for generating announcement IDs in `src/lib/gunStealth.ts`. `Math.random()` is not cryptographically secure and can lead to predictable IDs, which might be exploited to guess or collide with existing announcement IDs in a decentralized environment like GunDB.
**Learning:** Always use a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) for identifiers that are used as keys or in sensitive contexts. `uuidv4()` is a reliable choice when the `uuid` package is available.
**Prevention:** Avoid `Math.random()` for anything other than non-critical UI effects. Use `crypto.randomUUID()` or established libraries like `uuid` for secure ID generation.
