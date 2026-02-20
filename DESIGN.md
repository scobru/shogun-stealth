# Material Expressive Design System (Google 2026)

This document defines the visual identity and UI/UX guidelines for the Shogun ecosystem, inspired by the "Expressive Bloom" evolution of Material You.

## 🎨 Visual Identity

### 1. Color Palette (Dynamic Tones)

The system uses high-contrast, vibrant accents paired with deep surfaces.

- **Primary (Vibrant Lime)**: `#D4E157` - Used for primary actions, feature highlights, and active states.
- **Surface (Deep Charcoal)**: `#131314` - The main background for dark mode.
- **Surface Containers**:
  - `base-100`: `#131314` (Background)
  - `base-200`: `#1E1F20` (Cards, Sidebars)
  - `base-300`: `#2B2C2E` (Modals, Active Items)
- **Accent (Muted Pink/Lavender)**: `#F4B4CE` - Used for secondary expressive elements.

### 2. Typography

- **Primary Font**: `Inter` or `Outfit` (Geometric Sans-Serif).
- **Headings**: "Expressive" style. Large, medium/semi-bold weight, with slightly tightened letter-spacing (`-0.02em`).
- **Body**: Clean, high readability, ample line height (`1.6`).

---

## 📐 Layout & Surfaces

### 1. Shape System (High Curvature)

Material Expressive 2026 favors organic, soft shapes over sharp corners.

- **Buttons/Chips**: `rounded-full` (Pill shape).
- **Cards/Sections**: `rounded-[28px]` or `3xl`.
- **Modals/Dialogs**: `rounded-[32px]`.
- **Input Fields**: `rounded-2xl` with internal padding.

### 2. Elevation & Hierarchy

Avoid traditional drop shadows. Use **Surface Toning** and **Thin Outlines**.

- **Level 0 (Background)**: `base-100`.
- **Level 1 (Card)**: `base-200`.
- **Level 2 (Hover/Modal)**: `base-300` or a very subtle `1px` border in a slightly lighter shade.
- **Gloom/Glow**: For high-emphasis elements, use colored, ultra-diffuse shadows (e.g., `shadow-[0_0_40px_-10px_rgba(212,225,87,0.2)]`).

---

## 🧩 Component Specifications

### 1. Action Buttons

- **Standard**: Pill-shaped, semi-bold text, subtle hover transition (scale up slightly).
- **FAB (Floating Action Button)**: Large, `rounded-3xl`, high-contrast color (Primary), fixed bottom-right.

### 2. Interaction Feedback

- **Active States**: Use a "Pill" background behind icons or text.
- **Micro-animations**: Smooth `200ms` transitions for all hover and active states.

### 3. Navigation

- **Top Bar**: Minimalist, glassmorphism effect (`backdrop-blur-md`) with low opacity background.
- **Bottom Nav**: High containers, icons inside active pill indicators.

---

## 🛠️ Tailwind & DaisyUI Config

```javascript
// tailwind.config.js snippet
module.exports = {
  daisyui: {
    themes: [
      {
        materialExpressive: {
          primary: "#D4E157", // Vibrant Lime
          secondary: "#F4B4CE", // Soft Pink
          accent: "#C1E8FF", // Light Blue
          neutral: "#1E1F20",
          "base-100": "#131314", // Core Surface
          "base-200": "#1E1F20", // Surface Container
          "base-300": "#2B2C2E", // Surface Container High
          info: "#7CAFEC",
          success: "#B9E9B3",
          warning: "#F1E5AC",
          error: "#F3B4AD",
          "--rounded-box": "1.75rem", // 28px
          "--rounded-btn": "9999px", // Pill
          "--rounded-badge": "9999px",
        },
      },
    ],
  },
};
```
