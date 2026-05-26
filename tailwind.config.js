/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:  '#FF8008',
          pink:    '#E91E8C',
          purple:  '#8B35C4',
          navy:    '#1B1B5E',
          'light-purple': '#B06FD8',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF8008 0%, #E91E8C 50%, #8B35C4 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #FF800820 0%, #E91E8C20 50%, #8B35C420 100%)',
        'hero-gradient': 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 50%, #1B1B5E 100%)',
      },
      fontFamily: {
        arabic: ['Almarai', 'sans-serif'],
        display: ['Montserrat', 'Almarai', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(233, 30, 140, 0.25)',
        'brand-lg': '0 8px 40px rgba(139, 53, 196, 0.35)',
      },
    },
  },
  plugins: [],
}
