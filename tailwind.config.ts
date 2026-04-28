import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#212121',
          secondary: '#171717',
          tertiary: '#2f2f2f',
          input: '#2f2f2f',
        },
        text: {
          primary: '#ececec',
          secondary: '#b4b4b4',
          tertiary: '#8e8e8e',
        },
        accent: {
          openai: '#10a37f',
          gemini: '#4285f4',
          claude: '#cc785c',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
