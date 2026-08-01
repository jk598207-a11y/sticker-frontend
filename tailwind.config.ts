import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1d1a',
        paper: '#faf9f5',
        accent: '#2f6f4f',
        line06: '#06c755',
      },
    },
  },
  plugins: [],
};
export default config;
