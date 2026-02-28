## 2025-02-18 - GunDB Data Validation & Weak RNG
**Vulnerability:** GunDB integration allowed publishing unvalidated announcements and used `Math.random()` for IDs. Clients consumed this data without type checking, risking crashes (DoS) if `ephemeralPubKey` was malformed (e.g. not a string).
**Learning:** Decentralized databases like GunDB are public and untrusted. Clients MUST validate all incoming data before processing, as anyone can write garbage. Also, frontend-generated IDs should use `crypto.randomUUID()` or `uuid` instead of `Math.random()`.
**Prevention:** Always use strict schema validation (e.g. type guards) at the boundary when reading from GunDB. Use cryptographically secure RNGs for IDs.

## 2025-02-18 - Public Key Length & Metadata DoS
**Vulnerability:** Stealth registry and announcements accepted arbitrary length hex strings as public keys (e.g., "0x123") and unbounded metadata strings. This could lead to downstream cryptographic failures (invalid point on curve) or memory exhaustion/DoS attacks.
**Learning:** Checking for `0x` and hex characters is insufficient for public keys. Cryptographic libraries expect specific byte lengths (32, 33, 65). Unbounded string fields in decentralized storage are a DoS vector.
**Prevention:** Enforce strict length checks for cryptographic primitives (e.g. 66/68/132 hex chars for keys). Limit variable-length fields (e.g. max 4KB for metadata).

## 2025-02-28 - Exposing Auth Result in Logs & Unsecured Form Inputs
**Vulnerability:**
1. The `handleLoginSuccess` function in `App.tsx` logged the full `result` object to the browser console. Depending on the `shogun-core` implementation, this object could leak sensitive authorization tokens or even the raw SEA keypair (`epriv`), making it accessible to malicious browser extensions or exposed if users paste their logs.
2. The master private key input in `ManualVault.tsx` lacked `autoComplete="off"` and `spellCheck="false"`. This allowed browsers and password managers (like LastPass) to cache, prompt to save, or autocomplete the master private key, posing a severe local security threat.
**Learning:**
Frontend applications handling raw private keys must adopt strict data hygiene. Console logging should never include sensitive authentication responses. Additionally, standard DOM security attributes (`autoComplete`, `spellCheck`, and vendor-specific ones like `data-lpignore`) are critical for inputs that receive raw cryptographic keys.
**Prevention:**
Always review `console.log` statements for objects that might contain sensitive data in production environments. Explicitly disable autocomplete and spellcheck on all input fields designed for private keys or seeds.
