/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kks: {
          bg: '#0d0800',
          panel: '#1a1100',
          border: '#3d2a00',
          accent: '#d97706',
          accent2: '#f59e0b',
          text: '#c4a060',
          muted: '#8a6030',
          dim: '#6a4820',
        },
      },
    },
  },
  plugins: [],
};
