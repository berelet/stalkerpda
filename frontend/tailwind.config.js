/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'pda-bg': '#0a0f0a',
        'pda-case': '#2b2e25',
        'pda-case-dark': '#1a1c16',
        'pda-screen-bg': '#050805',
        'pda-primary': '#527552',
        'pda-text': '#8cb08c',
        'pda-highlight': '#a3cfa3',
        'pda-amber': '#d69e2e',
        'pda-danger': '#8b0000',
        'pda-phosphor': '#39ff14',
      },
      fontFamily: {
        'mono': ['Share Tech Mono', 'monospace'],
        'pixel': ['VT323', 'monospace']
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1f2f1f 1px, transparent 1px), linear-gradient(to bottom, #1f2f1f 1px, transparent 1px)",
        'noise': "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.05%22/%3E%3C/svg%3E')",
      },
      boxShadow: {
        'crt': 'inset 0 0 20px rgba(0,0,0,0.9), 0 0 10px rgba(57, 255, 20, 0.1)',
        'case-inset': 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05)',
      }
    },
  },
  plugins: [],
}
