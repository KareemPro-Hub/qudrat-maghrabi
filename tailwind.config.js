/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:  '#FFC83E',
          pink:    '#D946C6',
          purple:  '#7935EB',
          navy:    '#2D174B',
          'light-purple': '#9F44F5',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7935EB 0%, #D946C6 50%, #FFC83E 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #7935EB20 0%, #D946C620 50%, #FFC83E20 100%)',
        'hero-gradient': 'linear-gradient(135deg, #2D174B 0%, #5B2A99 50%, #2D174B 100%)',
      },
      fontFamily: {
        sans: ['FrutigerArabic', 'sans-serif'],
        arabic: ['FrutigerArabic', 'sans-serif'],
        display: ['FrutigerArabic', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(217, 70, 198, 0.25)',
        'brand-lg': '0 8px 40px rgba(121, 53, 235, 0.35)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        float: 'float 3.5s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
      },
    },
  },
  plugins: [],
}
