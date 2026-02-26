## 2024-05-22 - Stealth Scanning Performance
**Learning:** Checking stealth addresses involves expensive elliptic curve math (~5.5ms per check). Doing this synchronously for 1000+ items freezes the UI for >5 seconds. Optimization attempts involving manual key derivation proved risky due to library-specific implementation details.
**Action:** Use async chunking (yielding to event loop) for heavy CPU tasks like scanning. Use `Promise.all` for independent data fetches.

## 2024-06-25 - ECDH Optimization for X-Only Keys
**Learning:** For X-only public keys (common in stealth announcements), we often need to check both Y parities (0x02 and 0x03). Since `SS_03 = -SS_02` (negation of Y coordinate), we can compute the second shared secret using cheap field subtraction instead of a second expensive EC multiplication. This reduces scanning time by ~50% (from ~12.6ms to ~6.6ms per item).
**Action:** Always look for algebraic shortcuts in heavy cryptographic loops. When hashing EC points, ensure the format (compressed/uncompressed) matches the library's expectation.
