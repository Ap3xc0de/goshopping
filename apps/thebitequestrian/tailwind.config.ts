import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          hover: 'var(--accent-hover)',
          foreground: 'var(--accent-foreground)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        label: ['var(--font-label)', 'sans-serif'],
      },
      borderRadius: {
        sm: '2px',
      },
      letterSpacing: {
        widest2: '0.3em',
      },
    },
  },
  plugins: [],
};

export default config;
