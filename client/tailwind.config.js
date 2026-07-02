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
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },

      // ── Design token colours (backed by CSS variables) ─────────────────
      // Every value is a CSS var reference so dark/light flips automatically
      // when the `.dark` class toggles on <html>.
      colors: {
        // Semantic surface tokens
        page:    'var(--color-bg)',
        surface: 'var(--color-surface)',
        card:    'var(--color-card)',
        sidebar: 'var(--color-sidebar)',

        // Semantic border token
        token: {
          border: 'var(--color-border)',
          hover:  'var(--color-border-hover)',
        },

        // Semantic text tokens
        primary:   'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',

        // Brand / accent
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-hover)',
        },

        // P&L colours
        profit: 'var(--color-profit)',
        loss:   'var(--color-loss)',

        // Existing project aliases (kept for backward compat with other pages)
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
        danger: {
          500: '#f43f5e',
          600: '#e11d48',
        },
        dark: {
          bg:     '#0a0d14',
          card:   'rgba(16,20,35,0.65)',
          border: 'rgba(255,255,255,0.08)',
          text:   '#f1f5f9',
          muted:  '#94a3b8',
        },
        light: {
          bg:     '#f8fafc',
          card:   'rgba(255,255,255,0.75)',
          border: 'rgba(0,0,0,0.06)',
          text:   '#0f172a',
          muted:  '#64748b',
        },
      },

      // ── Box shadows backed by CSS variables ────────────────────────────
      boxShadow: {
        'card':       'var(--shadow-card)',
        'card-hover': 'var(--shadow-hover)',
        'tooltip':    'var(--shadow-tooltip)',
        // legacy aliases
        'glass-dark':  '0 8px 32px 0 rgba(0,0,0,0.37)',
        'glass-light': '0 8px 32px 0 rgba(31,38,135,0.05)',
      },

      backdropBlur: {
        xs: '2px',
        md: '12px',
        xl: '24px',
      },

      borderRadius: {
        card: '20px',
        row:  '14px',
      },
    },
  },
  plugins: [],
};
