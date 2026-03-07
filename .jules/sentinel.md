## 2025-02-18 - GunDB Data Validation & Weak RNG
**Vulnerability:** GunDB integration allowed publishing unvalidated announcements and used `Math.random()` for IDs. Clients consumed this data without type checking, risking crashes (DoS) if `ephemeralPubKey` was malformed (e.g. not a string).
**Learning:** Decentralized databases like GunDB are public and untrusted. Clients MUST validate all incoming data before processing, as anyone can write garbage. Also, frontend-generated IDs should use `crypto.randomUUID()` or `uuid` instead of `Math.random()`.
**Prevention:** Always use strict schema validation (e.g. type guards) at the boundary when reading from GunDB. Use cryptographically secure RNGs for IDs.

## 2025-02-18 - Public Key Length & Metadata DoS
**Vulnerability:** Stealth registry and announcements accepted arbitrary length hex strings as public keys (e.g., "0x123") and unbounded metadata strings. This could lead to downstream cryptographic failures (invalid point on curve) or memory exhaustion/DoS attacks.
**Learning:** Checking for `0x` and hex characters is insufficient for public keys. Cryptographic libraries expect specific byte lengths (32, 33, 65). Unbounded string fields in decentralized storage are a DoS vector.
**Prevention:** Enforce strict length checks for cryptographic primitives (e.g. 66/68/132 hex chars for keys). Limit variable-length fields (e.g. max 4KB for metadata).

## 2025-03-05 - Insecure Sensitive Input Fields
**Vulnerability:** Input fields handling sensitive cryptographic keys (like master private keys) lacked HTML attributes to prevent caching and external interception.
**Learning:** Browsers and extensions (like password managers, grammar checkers) can cache, autocomplete, or snooping on input fields by default. This risks leaking private keys to local storage or third-party services.
**Prevention:** Always use `autoComplete="off"`, `spellCheck="false"`, and `data-lpignore="true"` on sensitive frontend inputs.
