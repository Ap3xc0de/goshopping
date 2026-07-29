import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E3F2FD',
          100: '#BBDEFB',
          500: '#1565C0',
          600: '#0D47A1',
          700: '#0A3880',
        },
      },
    },
  },
  plugins: [],
};

export default config;
