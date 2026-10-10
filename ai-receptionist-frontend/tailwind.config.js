/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d2ff',
          300: '#91b0ff',
          400: '#6089ff',
          500: '#3a62f8',
          600: '#2547ee',
          700: '#1d38db',
          800: '#1e30b1',
          900: '#1e2e8c',
          950: '#161e5f',
        },
        surface: {
          DEFAULT: '#0f1117',
          card:    '#161b27',
          border:  '#232b3e',
          hover:   '#1e2537',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3a62f8 0%, #7c3aed 100%)',
        'gradient-dark':  'linear-gradient(180deg, #0f1117 0%, #161b27 100%)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
