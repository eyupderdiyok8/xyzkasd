import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'color-mix(in oklch, var(--border) calc(<alpha-value> * 100%), transparent)',
        input: 'color-mix(in oklch, var(--input) calc(<alpha-value> * 100%), transparent)',
        ring: 'color-mix(in oklch, var(--ring) calc(<alpha-value> * 100%), transparent)',
        background: 'color-mix(in oklch, var(--background) calc(<alpha-value> * 100%), transparent)',
        foreground: 'color-mix(in oklch, var(--foreground) calc(<alpha-value> * 100%), transparent)',
        primary: {
          DEFAULT: 'color-mix(in oklch, var(--primary) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--primary-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        secondary: {
          DEFAULT: 'color-mix(in oklch, var(--secondary) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--secondary-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        destructive: {
          DEFAULT: 'color-mix(in oklch, var(--destructive) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--destructive-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        muted: {
          DEFAULT: 'color-mix(in oklch, var(--muted) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--muted-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        accent: {
          DEFAULT: 'color-mix(in oklch, var(--accent) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--accent-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        popover: {
          DEFAULT: 'color-mix(in oklch, var(--popover) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--popover-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        card: {
          DEFAULT: 'color-mix(in oklch, var(--card) calc(<alpha-value> * 100%), transparent)',
          foreground: 'color-mix(in oklch, var(--card-foreground) calc(<alpha-value> * 100%), transparent)',
        },
        success: 'oklch(62% 0.19 160 / <alpha-value>)',
        warning: 'oklch(72% 0.16 80 / <alpha-value>)',
        danger: 'oklch(55% 0.2 25 / <alpha-value>)',
        placeholder: 'oklch(54% 0.03 270 / <alpha-value>)',
      },
      borderRadius: {
        lg: '1.25rem',
        md: '0.75rem',
        sm: '0.5rem',
      },
      fontFamily: {
        sans: ['Poppins', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        kit: '0 6px 16px color-mix(in oklch, var(--primary) 12%, transparent)',
        card: '0 1px 3px oklch(0% 0 0 / 0.06), 0 1px 2px oklch(0% 0 0 / 0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
