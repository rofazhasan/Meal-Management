/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        outfit: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        anek: ['"Anek Bangla"', '"Hind Siliguri"', 'sans-serif'],
        bengali: ['"Hind Siliguri"', '"Anek Bangla"', 'sans-serif'],
        sans: ['"Outfit"', '"Plus Jakarta Sans"', 'Inter', '"Hind Siliguri"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bauhaus: {
          red: '#D02020',
          blue: '#1040C0',
          yellow: '#F0C020',
          black: '#121212',
          canvas: '#F0F0F0',
          muted: '#E0E0E0',
          cream: '#FFF9C4',
        },
        dark: {
          950: '#050811',
          900: '#090d1a',
          850: '#0f172a',
          800: '#1e293b',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
      },
      boxShadow: {
        'bauhaus-sm': '3px 3px 0px 0px #121212',
        'bauhaus': '4px 4px 0px 0px #121212',
        'bauhaus-md': '6px 6px 0px 0px #121212',
        'bauhaus-lg': '8px 8px 0px 0px #121212',
        'bauhaus-white': '4px 4px 0px 0px #F0F0F0',
        'bauhaus-white-lg': '8px 8px 0px 0px #F0F0F0',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-dark': '0 12px 40px 0 rgba(0, 0, 0, 0.5)',
        'glow-cyan': '0 0 30px -5px rgba(6, 182, 212, 0.4)',
        'glow-emerald': '0 0 30px -5px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 30px -5px rgba(245, 158, 11, 0.4)',
        'glow-violet': '0 0 30px -5px rgba(139, 92, 246, 0.4)',
        'glass-border': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 4s infinite',
        'pulse-subtle': 'pulseSubtle 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'glow-rotate': 'glowRotate 10s linear infinite',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(3deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowRotate: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '24px',
        '3xl': '40px',
      }
    },
  },
  plugins: [],
}
