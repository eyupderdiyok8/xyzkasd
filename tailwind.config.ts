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
        border: 'oklch(92% 0.01 270 / <alpha-value>)',
        input: 'oklch(92% 0.01 270 / <alpha-value>)',
        ring: 'oklch(58% 0.16 270 / <alpha-value>)',
        background: 'oklch(98% 0.01 250 / <alpha-value>)',
        foreground: 'oklch(28% 0.02 270 / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(58% 0.16 270 / <alpha-value>)',
          foreground: 'oklch(100% 0 0 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(96% 0.01 270 / <alpha-value>)',
          foreground: 'oklch(35% 0.02 270 / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(55% 0.2 25 / <alpha-value>)',
          foreground: 'oklch(100% 0 0 / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(96% 0.01 270 / <alpha-value>)',
          foreground: 'oklch(54% 0.03 270 / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(72% 0.16 35 / <alpha-value>)',
          foreground: 'oklch(100% 0 0 / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(100% 0 0 / <alpha-value>)',
          foreground: 'oklch(28% 0.02 270 / <alpha-value>)',
        },
        card: {
          DEFAULT: 'oklch(100% 0 0 / <alpha-value>)',
          foreground: 'oklch(28% 0.02 270 / <alpha-value>)',
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
        kit: '0 6px 16px oklch(58% 0.16 270 / 0.12)',
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
