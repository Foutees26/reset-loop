import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f6f7fb',
        surface: '#ffffff',
        primary: '#5b8dff',
        primarySoft: '#dce6ff',
        accent: '#7dd3fc',
        positive: '#34d399',
        border: '#e5e7eb',
      },
      boxShadow: {
        card: '0 20px 40px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
