import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          500: '#388E3C',
          600: '#2E7D32',
          700: '#1B5E20',
        },
        accent: {
          500: '#FF6F00',
          600: '#E65100',
        },
      },
    },
  },
  plugins: [],
};

export default config;


