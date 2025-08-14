/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-purple': '#8b5cf6',
        'neon-pink': '#ec4899',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
