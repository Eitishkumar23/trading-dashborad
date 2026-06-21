/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981', // Emerald green
          600: '#059669',
          900: '#064e3b',
        },
        danger: {
          500: '#f43f5e', // Rose red
          600: '#e11d48',
        },
        dark: {
          bg: '#0a0d14', // Deep slate dark background
          card: 'rgba(16, 20, 35, 0.65)', // Glassmorphic card fill
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#f1f5f9',
          muted: '#94a3b8',
        },
        light: {
          bg: '#f8fafc', // Soft light background
          card: 'rgba(255, 255, 255, 0.75)',
          border: 'rgba(0, 0, 0, 0.06)',
          text: '#0f172a',
          muted: '#64748b',
        }
      },
      backdropBlur: {
        'xs': '2px',
        'md': '12px',
        'xl': '24px',
      },
      boxShadow: {
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
      }
    },
  },
  plugins: [],
}
