## 2024-05-23 - Lazy Loading & Shared Chunks
**Learning:** Lazy loading components that share a heavy dependency (`ethers` via `stealthContract`) successfully moved that dependency out of the `main` bundle into a shared chunk (`stealthContract-...js`).
**Action:** When optimizing React apps, look for shared dependencies in child components. Lazy loading them can "cleanse" the main bundle of these heavy libs if the parent doesn't use them directly.
