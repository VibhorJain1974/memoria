/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-cabinet)', 'system-ui', 'sans-serif'],
        display: ['var(--font-clash)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        // Memoria brand palette
        memoria: {
          50:  '#f0f0ff',
          100: '#e0e1ff',
          200: '#c6c8ff',
          300: '#a4a7fd',
          400: '#817cf8',
          500: '#6558f5', // primary
          600: '#5542e8',
          700: '#4932d0',
          800: '#3d2aaa',
          900: '#342687',
          950: '#1f1650',
        },
        aurora: {
          pink:    '#f472b6',
          violet:  '#a78bfa',
          cyan:    '#22d3ee',
          lime:    '#a3e635',
          amber:   '#fbbf24',
          coral:   '#fb7185',
          teal:    '#2dd4bf',
          indigo:  '#818cf8',
        },
        dark: {
          base:    '#0a0a0f',
          surface: '#111118',
          card:    '#16161f',
          border:  '#2a2a3a',
          muted:   '#3a3a4f',
        },
      },
      backgroundImage: {
        'aurora-1': 'linear-gradient(135deg, #6558f5 0%, #ec4899 50%, #f97316 100%)',
        'aurora-2': 'linear-gradient(135deg, #22d3ee 0%, #818cf8 50%, #f472b6 100%)',
        'aurora-3': 'linear-gradient(135deg, #2dd4bf 0%, #6558f5 100%)',
        'mesh-1': 'radial-gradient(at 40% 20%, #6558f540 0px, transparent 50%), radial-gradient(at 80% 0%, #ec489940 0px, transparent 50%), radial-gradient(at 0% 50%, #22d3ee30 0px, transparent 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delay': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 9s ease-in-out 1s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow': 'spin 8s linear infinite',
        'gradient-shift': 'gradientShift 4s ease infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'confetti-fall': 'confettiFall 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-12px) rotate(2deg)' },
          '66%': { transform: 'translateY(-6px) rotate(-1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(101, 88, 245, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(101, 88, 245, 0.8), 0 0 60px rgba(236, 72, 153, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          from: { opacity: '0', transform: 'scale(0.5)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(10deg)' },
        },
        confettiFall: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-purple': '0 0 30px rgba(101, 88, 245, 0.5)',
        'glow-pink': '0 0 30px rgba(244, 114, 182, 0.5)',
        'glow-cyan': '0 0 30px rgba(34, 211, 238, 0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(101, 88, 245, 0.3)',
      },
    },
  },
  plugins: [],
}
