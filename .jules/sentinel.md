## 2025-02-18 - GunDB Data Validation & Weak RNG
**Vulnerability:** GunDB integration allowed publishing unvalidated announcements and used `Math.random()` for IDs. Clients consumed this data without type checking, risking crashes (DoS) if `ephemeralPubKey` was malformed (e.g. not a string).
**Learning:** Decentralized databases like GunDB are public and untrusted. Clients MUST validate all incoming data before processing, as anyone can write garbage. Also, frontend-generated IDs should use `crypto.randomUUID()` or `uuid` instead of `Math.random()`.
**Prevention:** Always use strict schema validation (e.g. type guards) at the boundary when reading from GunDB. Use cryptographically secure RNGs for IDs.

## 2025-02-18 - Public Key Length & Metadata DoS
**Vulnerability:** Stealth registry and announcements accepted arbitrary length hex strings as public keys (e.g., "0x123") and unbounded metadata strings. This could lead to downstream cryptographic failures (invalid point on curve) or memory exhaustion/DoS attacks.
**Learning:** Checking for `0x` and hex characters is insufficient for public keys. Cryptographic libraries expect specific byte lengths (32, 33, 65). Unbounded string fields in decentralized storage are a DoS vector.
**Prevention:** Enforce strict length checks for cryptographic primitives (e.g. 66/68/132 hex chars for keys). Limit variable-length fields (e.g. max 4KB for metadata).

## 2025-02-18 - Private Key Input Leakage to Browser Extensions
**Vulnerability:** The master private key input in `ManualVault.tsx` allowed the browser to cache, autocomplete, and potentially expose the key to password managers and extensions.
**Learning:** Browsers aggressively cache and offer autocompletion for inputs, especially those labeled as text or password. Password managers (like LastPass, 1Password) may also attempt to save these keys if not explicitly instructed to ignore them, leading to severe key compromise.
**Prevention:** Frontend inputs handling sensitive cryptographic keys must use `autoComplete="off"`, `spellCheck="false"`, and `data-lpignore="true"` to explicitly prevent browser caching, autocompletion, and extension snooping.
