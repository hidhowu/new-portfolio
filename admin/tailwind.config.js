/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B6B2E', light: '#2E8B3E' },
        surface: '#FFFFFF',
        bg: '#F7F6F2',
        border: '#E8E6E1',
        text: { DEFAULT: '#1A1A1A', muted: '#6B6B6B' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
