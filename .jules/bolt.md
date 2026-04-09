## 2025-05-15 - Redundant Stealth Address Wallet Derivation
**Learning:** `checkStealthAddress` was performing a full `openStealthAddress` call (which involves expensive EC multiplication and wallet derivation) but only returning a boolean. `scanAnnouncements` would then call `openStealthAddress` again if the check passed, doubling the work for every match.
**Action:** Refactored `checkStealthAddress` to return the `ethers.Wallet` instance (or `null`) so that `scanAnnouncements` can reuse the already computed wallet, eliminating the redundant call.

## 2025-05-20 - Inefficient Uint8Array to Hex Conversion
**Learning:** Using `Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("")` for `Uint8Array` to hex conversion is significantly slower than `Buffer.from(arr).toString("hex")` (measured ~90% performance penalty).
**Action:** Replaced the inefficient manual mapping with `Buffer.from(arr).toString("hex")` in `src/lib/stealthCore.ts`. Correctness was verified with standalone tests and browser compatibility was confirmed via Vite's Node polyfill configuration.
