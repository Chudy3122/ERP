/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#F7941D',
          600: '#F7941D',
          700: '#e08317',
          800: '#c97210',
          900: '#a85f0c',
        },
        brand: {
          orange: '#F7941D',
          'orange-hover': '#e08317',
          cyan: '#00AEEF',
          'cyan-hover': '#0098d4',
        },
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
      animation: {
        blob: 'blob 7s infinite',
      },
    },
  },
  plugins: [],
};
