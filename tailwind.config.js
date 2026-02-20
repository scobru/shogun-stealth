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
        materialExpressive: {
          "primary": "#D4E157",      // Vibrant Lime
          "secondary": "#F4B4CE",    // Soft Pink
          "accent": "#C1E8FF",       // Light Blue
          "neutral": "#1E1F20",
          "base-100": "#131314",     // Core Surface
          "base-200": "#1E1F20",     // Surface Container
          "base-300": "#2B2C2E",     // Surface Container High
          "info": "#7CAFEC",
          "success": "#B9E9B3",
          "warning": "#F1E5AC",
          "error": "#F3B4AD",
          "--rounded-box": "1.75rem", // 28px
          "--rounded-btn": "9999px",  // Pill
          "--rounded-badge": "9999px",
          "--tab-radius": "9999px",
        },
      },
    ],
    darkTheme: "materialExpressive",
  },
  plugins: [],
}
