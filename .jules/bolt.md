## 2025-05-24 - Hoist static array in ThemeToggle
**Learning:** React components that define static constants inside the function body trigger redundant allocations and potential reference instability on every render. Hoisting these constants outside the component prevents this.
**Action:** Hoisted the `themes` array and `Theme` type definition in `src/components/ui/ThemeToggle.tsx`.
