/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'admin-bg': '#0f172a',
        'admin-surface': '#1e293b',
        'admin-border': '#334155',
        'admin-primary': '#3b82f6',
        'admin-success': '#10b981',
        'admin-warning': '#f59e0b',
        'admin-danger': '#ef4444',
      },
    },
  },
  plugins: [],
}
