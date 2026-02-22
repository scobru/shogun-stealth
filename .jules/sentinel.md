## 2025-02-18 - GunDB Data Validation & Weak RNG
**Vulnerability:** GunDB integration allowed publishing unvalidated announcements and used `Math.random()` for IDs. Clients consumed this data without type checking, risking crashes (DoS) if `ephemeralPubKey` was malformed (e.g. not a string).
**Learning:** Decentralized databases like GunDB are public and untrusted. Clients MUST validate all incoming data before processing, as anyone can write garbage. Also, frontend-generated IDs should use `crypto.randomUUID()` or `uuid` instead of `Math.random()`.
**Prevention:** Always use strict schema validation (e.g. type guards) at the boundary when reading from GunDB. Use cryptographically secure RNGs for IDs.
