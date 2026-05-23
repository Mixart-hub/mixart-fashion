/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rose:  { DEFAULT: '#C88B7F', light: '#D9A89D', dark: '#A86B5F', pale: '#F5EAE7' },
        dark:  { DEFAULT: '#2A2A2E', light: '#3A3A3F', muted: '#6B6B73' },
        cream: { DEFAULT: '#E8D5CE', light: '#F5EAE7', dark: '#D4B8AF' },
        gold:  { DEFAULT: '#C9A96E', light: '#DFC28E' },
      },
      fontFamily: {
        sans:   ['Inter', 'sans-serif'],
        serif:  ['Playfair Display', 'serif'],
        display:['Cormorant Garamond', 'serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:    { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(100%)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft:    { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
}
