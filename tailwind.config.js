/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#c0daff',
          300: '#90bcff',
          400: '#5095ff',
          500: '#2563eb', // primary blue
          600: '#1d4ed8',
          700: '#153eb8',
          800: '#10309c',
          900: '#0c2580',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(17, 24, 39, 0.04), 0 2px 8px -1px rgba(17, 24, 39, 0.02)',
        'premium-hover': '0 12px 30px -4px rgba(17, 24, 39, 0.08), 0 4px 12px -2px rgba(17, 24, 39, 0.03)',
        'blue-glow': '0 8px 30px -4px rgba(37, 99, 235, 0.12), 0 2px 10px -2px rgba(37, 99, 235, 0.05)',
      }
    },
  },
  plugins: [],
}
