/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safar: {
          bg: '#11151D',
          surface: '#151A23',
          card: '#202631',
          cardHover: '#252B36',
          teal: '#35D0B0',
          tealHover: '#24BFA5',
          textMuted: '#A8AFBA',
          danger: '#FF5F5F',
        },
      },
    },
  },
  plugins: [],
};
