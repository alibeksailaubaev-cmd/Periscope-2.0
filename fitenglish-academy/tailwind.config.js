/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette requested by the curriculum team.
        blaze: {
          DEFAULT: '#FF6B35', 50: '#FFF3ED', 100: '#FFE3D5', 200: '#FFC5AB',
          300: '#FFA37D', 400: '#FF854F', 500: '#FF6B35', 600: '#EF5119',
          700: '#C43D0F', 800: '#933012', 900: '#762A13',
        },
        mint: {
          DEFAULT: '#00B894', 50: '#E7FBF6', 100: '#C6F5EA', 200: '#8FEAD6',
          300: '#55DBBF', 400: '#22C9A6', 500: '#00B894', 600: '#009678',
          700: '#00775F', 800: '#045C4B', 900: '#064B3E',
        },
        ink: {
          DEFAULT: '#2D3436', 50: '#F4F6F6', 100: '#E5E9EA', 200: '#CAD2D3',
          300: '#A4B0B2', 400: '#748486', 500: '#566467', 600: '#3F4B4D',
          700: '#2D3436', 800: '#232829', 900: '#171B1C',
        },
      },
      fontFamily: {
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '16px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        premium: '0 4px 20px rgba(0,0,0,0.08)',
        'premium-lg': '0 12px 40px rgba(0,0,0,0.12)',
        glow: '0 0 0 4px rgba(255,107,53,0.15)',
      },
      backgroundImage: {
        'grad-blaze': 'linear-gradient(135deg, #FF854F 0%, #FF6B35 55%, #EF5119 100%)',
        'grad-mint': 'linear-gradient(135deg, #22C9A6 0%, #00B894 60%, #009678 100%)',
        'grad-ink': 'linear-gradient(135deg, #3F4B4D 0%, #2D3436 60%, #171B1C 100%)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.92)', opacity: '0.75' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        flicker: {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)', opacity: '1' },
          '50%': { transform: 'scale(1.14) rotate(3deg)', opacity: '0.85' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-7px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.24,0.6,0.35,1) infinite',
        flicker: 'flicker 1.6s ease-in-out infinite',
        shake: 'shake 0.42s ease-in-out',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
