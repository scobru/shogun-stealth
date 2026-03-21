## 2025-05-15 - Redundant Stealth Address Wallet Derivation
**Learning:** `checkStealthAddress` was performing a full `openStealthAddress` call (which involves expensive EC multiplication and wallet derivation) but only returning a boolean. `scanAnnouncements` would then call `openStealthAddress` again if the check passed, doubling the work for every match.
**Action:** Refactored `checkStealthAddress` to return the `ethers.Wallet` instance (or `null`) so that `scanAnnouncements` can reuse the already computed wallet, eliminating the redundant call.
