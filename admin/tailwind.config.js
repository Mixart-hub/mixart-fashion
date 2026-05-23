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
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
      }
    }
  },
  plugins: []
}
