/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cockpit: {
          bg: '#06070B',
          surface: '#0C0F17',
          panel: '#111623',
          border: '#1E273B',
          alert: '#FF3B30',
          green: '#32D74B',
          blue: '#00B7FF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
