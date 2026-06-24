/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        ember: '#d73027',
        honey: '#fee08b',
        leaf: '#1a9850',
      },
    },
  },
  plugins: [],
};
