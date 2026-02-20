/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      borderRadius: {
        'material-xl': '28px',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        expressive: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  daisyui: {
    themes: [
      {
        material: {
          "primary": "#6750A4",
          "primary-content": "#ffffff",
          "secondary": "#958DA5",
          "secondary-content": "#ffffff",
          "accent": "#2DD4BF",
          "accent-content": "#ffffff",
          "neutral": "#1C1B1F",
          "neutral-content": "#ffffff",
          "base-100": "#fef7ff", // Surface
          "base-200": "#f3edf7", // Surface Container
          "base-300": "#eaddff", // Surface Container High
          "info": "#7C4DFF",
          "success": "#22C55E",
          "warning": "#F59E0B",
          "error": "#B3261E",
          "--rounded-box": "1.75rem", // 28px
          "--rounded-btn": "9999px",  // Pill shaped
          "--rounded-badge": "0.5rem",
          "--tab-radius": "0.75rem",
        },
        material_dark: {
          "primary": "#D0BCFF",
          "primary-content": "#381E72",
          "secondary": "#CCC2DC",
          "secondary-content": "#332D41",
          "accent": "#2DD4BF",
          "accent-content": "#003735",
          "neutral": "#E6E1E5",
          "neutral-content": "#313033",
          "base-100": "#1C1B1F", // Dark Surface
          "base-200": "#2B2930", // Dark Surface Container
          "base-300": "#49454F", // Dark Surface Container High
          "info": "#D0BCFF",
          "success": "#22C55E",
          "warning": "#F59E0B",
          "error": "#F2B8B5",
          "--rounded-box": "1.75rem", // 28px
          "--rounded-btn": "9999px",  // Pill shaped
          "--rounded-badge": "0.5rem",
          "--tab-radius": "0.75rem",
        },
      },
    ],
    darkTheme: "material_dark",
  },
  plugins: [],
}
