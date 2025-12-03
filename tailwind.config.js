/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Uses CSS variable with Tailwind alpha placeholder
        // primary: {
        //   DEFAULT: 'rgba(22 93 255 / <alpha-value>)',
        //   100: 'rgba(22 93 255 / 0.1)',
        //   200: 'rgba(22 93 255 / 0.2)',
        // },
        // primary: 'rgb(var(--primary) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
