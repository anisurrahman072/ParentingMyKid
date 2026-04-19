import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#00A878',
          /** Alias used across forms; same as teal */
          mint: '#00A878',
          purple: '#A020D8',
          pink: '#F472B6',
        },
        bg: {
          base: '#FAFAFF',
          soft: '#F0FFF8',
        },
        text: {
          main: '#1E293B',
          soft: '#475569',
        },
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        /** Editorial display for pull quotes (Latin) */
        quote: ['var(--font-fraunces)', 'Georgia', 'serif'],
        /** Sticky bar / wordmark: rounded, premium geometric sans */
        wordmark: ['var(--font-outfit)', 'var(--font-nunito)', 'system-ui', 'sans-serif'],
        bengali: [
          'var(--font-bengali)',
          'Noto Sans Bengali',
          'system-ui',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #00A878 0%, #A020D8 100%)',
        'gradient-hero': 'linear-gradient(-45deg, #E0FFF4, #F3E8FF, #FFF0F8, #E8F8FF)',
      },
      animation: {
        'gradient-shift': 'gradientShift 14s ease infinite',
        'float-drift': 'floatDrift 7s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        floatDrift: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.75' },
          '33%': { transform: 'translateY(-24px) rotate(6deg)', opacity: '1' },
          '66%': { transform: 'translateY(-12px) rotate(-4deg)', opacity: '0.85' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(0,168,120,0.35)',
          },
          '50%': {
            boxShadow:
              '0 0 40px rgba(0,168,120,0.65), 0 0 80px rgba(160,32,216,0.35)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
