import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        memoria: {
          50:  '#f0f0ff',
          100: '#e0e1ff',
          200: '#c6c8ff',
          300: '#a4a7fd',
          400: '#817cf8',
          500: '#6558f5',
          600: '#5542e8',
          700: '#4932d0',
          800: '#3d2aaa',
          900: '#342687',
          950: '#1f1650',
        },
        aurora: {
          pink:   '#f472b6',
          violet: '#a78bfa',
          cyan:   '#22d3ee',
          lime:   '#a3e635',
          amber:  '#fbbf24',
          coral:  '#fb7185',
          teal:   '#2dd4bf',
          indigo: '#818cf8',
        },
        dark: {
          base:    '#0a0a0f',
          surface: '#111118',
          card:    '#16161f',
          border:  '#2a2a3a',
          muted:   '#3a3a4f',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-purple': '0 0 30px rgba(101,88,245,0.5)',
        'glow-pink':   '0 0 30px rgba(244,114,182,0.5)',
        'glow-cyan':   '0 0 30px rgba(34,211,238,0.5)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover':  '0 8px 40px rgba(101,88,245,0.3)',
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-glow':     'pulseGlow 2s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'slide-up':       'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':       'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'bounce-in':      'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'gradient-shift': 'gradientShift 4s ease infinite',
        'spin-slow':      'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':     { transform: 'translateY(-14px) rotate(3deg)' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 20px rgba(101,88,245,0.4)' },
          '50%':     { boxShadow: '0 0 40px rgba(101,88,245,0.8)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          from: { opacity: '0', transform: 'scale(0.5)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}

export default config
