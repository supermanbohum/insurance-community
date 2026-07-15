import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      },
      maxWidth: {
        board: '720px',
      },
    },
  },
  plugins: [],
};

export default config;
