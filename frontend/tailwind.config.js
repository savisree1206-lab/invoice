/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#C9A84C',
          600: '#B8922A',
          700: '#92700D',
          800: '#78590A',
          900: '#4A3500',
        },
        primary: '#C9A84C',
        accent: '#E8C96A',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0f0f0f 0%, #080808 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 168, 76, 0.4)',
        'gold-lg': '0 0 40px rgba(201, 168, 76, 0.3)',
        'inner-gold': 'inset 0 1px 0 rgba(201, 168, 76, 0.2)',
      },
    },
  },
  plugins: [],
}
