import type { Config } from 'tailwindcss'

// Remapping the stock palettes restyles the many pages that use literal
// utility colors (bg-indigo-600, text-slate-500, ...) without touching them.
const navy = {
  50: '#f1f5fa', 100: '#e2eaf3', 200: '#c5d4e6', 300: '#9db5d2', 400: '#6f8fb8',
  500: '#4a6f9d', 600: '#2f5382', 700: '#24436b', 800: '#1c3556', 900: '#172a45', 950: '#0e1a2c',
}
const wine = {
  50: '#fbf3f4', 100: '#f5e3e6', 200: '#eac6cc', 300: '#d99ea8', 400: '#c1717f',
  500: '#a5505f', 600: '#8a3a4a', 700: '#722e3d', 800: '#5e2834', 900: '#4f242e', 950: '#2c1117',
}
const ink = {
  50: '#f9f8f5', 100: '#f2f0eb', 200: '#e5e2da', 300: '#d0cbc0', 400: '#9f9b92',
  500: '#6b6a67', 600: '#52535a', 700: '#3d3f4a', 800: '#262a35', 900: '#181b24', 950: '#0e1017',
}
const gold = {
  50: '#fbf7ef', 100: '#f5ecd8', 200: '#ead6ad', 300: '#dcbb7d', 400: '#cda35a',
  500: '#b88b43', 600: '#9a7a43', 700: '#7c5f33', 800: '#664e2d', 900: '#554128', 950: '#302313',
}

const config: Config = {
  darkMode: ['class', ':is([data-theme=dark],[data-theme=ocean],[data-theme=forest],[data-theme=rose],[data-theme=lavender])'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-display)', 'Georgia', 'Cambria', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        primary: navy,
        indigo: navy,
        violet: navy,
        purple: wine,
        slate: ink,
        gray: ink,
        gold,
        accent: {
          400: gold[400],
          500: gold[500],
          600: gold[600],
        },
        glass: {
          white: 'rgba(255,255,255,0.1)',
          dark: 'rgba(0,0,0,0.2)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #1f3a5f 0%, #172a45 100%)',
        'card-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'success-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'warm-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'cool-gradient': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.12)',
        'glow': '0 0 0 3px rgba(31,58,95,0.18)',
        'glow-accent': '0 0 30px rgba(249,115,22,0.4)',
        'deep': '0 25px 50px -12px rgba(0,0,0,0.4)',
        'card': '0 10px 40px rgba(0,0,0,0.15)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 3s ease infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
export default config
