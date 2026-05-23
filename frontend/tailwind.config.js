/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#C9956C',
        'primary-dark': '#B87333',
        'primary-light': '#F5EDE8',
        dark: '#1C1C1E',
        brand: {
          50:  '#fdf0f5',
          100: '#fbe3ee',
          200: '#f9c9de',
          500: '#c4689a',
          600: '#8B3A62',
          700: '#6e2d4e',
          900: '#2d1020',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
      }
    }
  },
  plugins: []
}
