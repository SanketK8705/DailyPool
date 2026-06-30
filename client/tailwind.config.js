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
        brand: {
          bg: '#0e1012',
          card: '#15171b',
          accent: '#007afc',
          accentHover: '#0062ca',
          secondary: '#007afc',
          border: '#1c1f24',
        },
        'void-black': '#0e1012',
        'deep-charcoal': '#15171b',
        'gunmetal': '#1c1f24',
        'graphite': '#23262d',
        'steel': '#333943',
        'pewter': '#444d5a',
        'slate-mapbox': '#566171',
        'ash': '#8b96aa',
        'fog': '#a0aaba',
        'silver': '#bbc2ce',
        'cloud': '#d5dae2',
        'signal-blue': '#007afc',
        'deep-signal': '#0062ca',
        'map-green': '#228a56',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
