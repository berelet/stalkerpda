/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#f2a736',
        'background-dark': '#221b10',
        'surface-dark': '#2d2418',
        'border-dark': '#675232',
        'input-bg': '#342919',
        'text-muted': '#cab391',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
