## 2024-05-22 - Stealth Scanning Performance
**Learning:** Checking stealth addresses involves expensive elliptic curve math (~5.5ms per check). Doing this synchronously for 1000+ items freezes the UI for >5 seconds. Optimization attempts involving manual key derivation proved risky due to library-specific implementation details.
**Action:** Use async chunking (yielding to event loop) for heavy CPU tasks like scanning. Use `Promise.all` for independent data fetches.

## 2024-05-23 - Stealth Scanning EC Math Optimization
**Learning:** During stealth address scanning, 32-byte X-only public keys require testing both `0x02` and `0x03` compressed keys. Running `computeSharedSecret` twice incurs heavy elliptic curve multiplication overhead. Since the two points share the same X-coordinate and their Y-coordinates negate to the field prime `P_FIELD`, we can compute the `0x02` shared secret and derive the `0x03` secret via simple modular subtraction (`P_FIELD - Y`).
**Action:** When evaluating dual states for X-only keys with tags, use EC multiplication for the first state and derive the second state mathematically, halving the EC operational cost.
