## 2024-05-22 - Stealth Scanning Performance
**Learning:** Checking stealth addresses involves expensive elliptic curve math (~5.5ms per check). Doing this synchronously for 1000+ items freezes the UI for >5 seconds. Optimization attempts involving manual key derivation proved risky due to library-specific implementation details.
**Action:** Use async chunking (yielding to event loop) for heavy CPU tasks like scanning. Use `Promise.all` for independent data fetches.
