import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Pretendard', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#b7d4ff',
          300: '#89b7ff',
          400: '#5691ff',
          500: '#2f6bff',
          600: '#1a4ce6',
          700: '#153bb4',
          800: '#15328e',
          900: '#152d70',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#48546b',
          faint: '#8b95a8',
        },
        surface: {
          DEFAULT: '#f4f6fb',
          card: '#ffffff',
          sunken: '#eef1f8',
        },
        line: {
          DEFAULT: '#e6eaf2',
          soft: '#eef1f7',
        },
        gold: {
          50: '#fdf6e8',
          400: '#f0b429',
          500: '#e0a319',
          600: '#c48a0f',
        },
        // shadcn/ui 컴포넌트(components/ui)가 사용하는 CSS 변수 기반 팔레트.
        // 공개 페이지는 기존 brand.* / gray.* 유틸리티를 그대로 쓰고, 이 팔레트는
        // /admin, /partner 등 shadcn 컴포넌트를 쓰는 화면에서만 사용된다.
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      maxWidth: {
        board: '720px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 8px -2px rgb(15 23 42 / 0.06)',
        'card-hover': '0 8px 24px -8px rgb(15 23 42 / 0.16), 0 2px 8px -2px rgb(15 23 42 / 0.06)',
        nav: '0 -2px 12px -4px rgb(15 23 42 / 0.08)',
        header: '0 1px 0 0 rgb(15 23 42 / 0.05)',
        pop: '0 4px 16px -4px rgb(26 76 230 / 0.28)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
