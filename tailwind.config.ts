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
        'page-fade': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'brand-pin': {
          '0%': { opacity: '0', transform: 'scale(0.75)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'brand-shield': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'brand-people': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'brand-text': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'popup-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 18px 0 var(--glow-color, rgba(37,99,235,0.35))' },
          '50%': { boxShadow: '0 0 34px 6px var(--glow-color, rgba(37,99,235,0.55))' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.45' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'page-fade': 'page-fade 220ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        'brand-pin': 'brand-pin 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'brand-shield': 'brand-shield 0.3s ease-out 0.22s both',
        'brand-people': 'brand-people 0.25s ease-out 0.42s both',
        'brand-text': 'brand-text 0.35s ease-out 0.5s both',
        'popup-in': 'popup-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'gradient-pan': 'gradient-pan 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        // 같은 요소에 animate-gradient-pan과 animate-glow-pulse를 동시에 걸면 둘 다
        // `animation` 단축 속성을 통째로 덮어써서 나중 클래스만 적용된다 - 그래서
        // 두 키프레임을 콤마로 묶은 조합 유틸을 하나 더 둔다(HeroCtaButton 전용).
        'cta-glow': 'gradient-pan 6s ease-in-out infinite, glow-pulse 2.4s ease-in-out infinite',
        ripple: 'ripple 0.6s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
