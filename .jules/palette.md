## 2026-02-23 - Accessibility for Icon-Only Buttons
**Learning:** Icon-only buttons (like the theme toggle) are invisible to screen readers without explicit labels.
**Action:** Always add `aria-label` to icon-only buttons. For sighted users, adding a visual tooltip provides clarity.

## 2024-05-22 - Input Visibility Toggles
**Learning:** When adding a 'Show/Hide' toggle inside an input, ensure the input has right-padding (e.g., `pr-16`) so the text doesn't flow under the button.
**Action:** Always verify spacing when positioning absolute elements over inputs.
