## 2025-02-18 - GunDB Data Validation & Weak RNG
**Vulnerability:** GunDB integration allowed publishing unvalidated announcements and used `Math.random()` for IDs. Clients consumed this data without type checking, risking crashes (DoS) if `ephemeralPubKey` was malformed (e.g. not a string).
**Learning:** Decentralized databases like GunDB are public and untrusted. Clients MUST validate all incoming data before processing, as anyone can write garbage. Also, frontend-generated IDs should use `crypto.randomUUID()` or `uuid` instead of `Math.random()`.
**Prevention:** Always use strict schema validation (e.g. type guards) at the boundary when reading from GunDB. Use cryptographically secure RNGs for IDs.

## 2025-02-18 - Public Key Length & Metadata DoS
**Vulnerability:** Stealth registry and announcements accepted arbitrary length hex strings as public keys (e.g., "0x123") and unbounded metadata strings. This could lead to downstream cryptographic failures (invalid point on curve) or memory exhaustion/DoS attacks.
**Learning:** Checking for `0x` and hex characters is insufficient for public keys. Cryptographic libraries expect specific byte lengths (32, 33, 65). Unbounded string fields in decentralized storage are a DoS vector.
**Prevention:** Enforce strict length checks for cryptographic primitives (e.g. 66/68/132 hex chars for keys). Limit variable-length fields (e.g. max 4KB for metadata).

## 2026-03-04 - Private Key Input Autocomplete Security
**Vulnerability:** The private key input field in `ManualVault.tsx` did not have protections against browser caching, autocompletion, or password manager/extension snooping.
**Learning:** Frontend inputs that handle sensitive cryptographic keys, like a master private key, must use specific attributes to ensure they are isolated from standard browser behaviors that can cache and leak the value.
**Prevention:** Always use `autoComplete="off"`, `spellCheck="false"`, and `data-lpignore="true"` on sensitive input fields to ensure browsers, spellcheckers, and extensions like LastPass do not read, cache, or auto-fill sensitive cryptographic keys.
