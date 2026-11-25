/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand (Deep civic teal)
        primary: {
          DEFAULT: '#004343',
          container: '#0F5C5C',
          light: '#90D2D1',
          dim: '#90D2D1',
          dark: '#002020',
          hover: '#003333',
        },
        // Secondary / Accent (Warm Indian Saffron / Amber)
        accent: {
          DEFAULT: '#FEA619',
          container: '#FEA619',
          hover: '#E59516',
          dark: '#684000',
          light: '#FFDDB8',
          saffron: '#F59E0B',
        },
        // Background & Surface tokens
        background: '#FCF9F4',
        surface: {
          DEFAULT: '#FCF9F4',
          low: '#F6F3EE',
          lowest: '#FFFFFF',
          high: '#EBE8E3',
          dim: '#DCDAD5',
        },
        // Text tokens
        text: {
          DEFAULT: '#1C1C19',
          main: '#1C1C19',
          muted: '#6F7978',
          variant: '#3F4948',
          inverse: '#FCF9F4',
        },
        // Muted typography & subtle fills
        muted: {
          DEFAULT: '#6F7978',
          foreground: '#6F7978',
          variant: '#3F4948',
        },
        // Border & outline tokens
        outline: {
          DEFAULT: '#6F7978',
          variant: '#BFC8C8',
        },
        // Error tokens
        error: {
          DEFAULT: '#BA1A1A',
          container: '#FFDAD6',
          on: '#FFFFFF',
        },
        // Six Status tokens from BLUEPRINT.md & DESIGN.md
        status: {
          pending: {
            DEFAULT: '#F59E0B',
            bg: '#FEF3C7',
            text: '#92400E',
            border: '#FCD34D',
          },
          verified: {
            DEFAULT: '#3B82F6',
            bg: '#DBEAFE',
            text: '#1E40AF',
            border: '#93C5FD',
          },
          assigned: {
            DEFAULT: '#8B5CF6',
            bg: '#EDE9FE',
            text: '#5B21B6',
            border: '#C4B5FD',
          },
          'in-progress': {
            DEFAULT: '#0F5C5C',
            bg: '#CCFBF1',
            text: '#115E59',
            border: '#5EEAD4',
          },
          resolved: {
            DEFAULT: '#10B981',
            bg: '#D1FAE5',
            text: '#065F46',
            border: '#6EE7B7',
          },
          rejected: {
            DEFAULT: '#E11D48',
            bg: '#FFE4E6',
            text: '#9F1239',
            border: '#FDA4AF',
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        sm: '0.375rem',    // 6px
        md: '0.5rem',      // 8px
        lg: '0.75rem',     // 12px
        xl: '1rem',        // 16px
        '2xl': '1.5rem',   // 24px
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        floating: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};

