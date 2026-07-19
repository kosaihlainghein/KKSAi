/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Myanmar', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        kks: {
          bg: '#0a0700',
          panel: '#15100a',
          card: '#1f1810',
          border: '#3d2e1a',
          accent: '#d97706',
          gold: '#f59e0b',
          amber: '#fbbf24',
          text: '#e8d5b0',
          muted: '#a08866',
          dim: '#6b5840',
          success: '#10b981',
          danger: '#ef4444',
          warn: '#f97316',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
};
