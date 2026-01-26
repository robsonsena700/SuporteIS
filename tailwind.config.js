/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#135bec',
          hover: '#0f48bd',
          light: 'rgba(19, 91, 236, 0.1)',
        },
        background: {
          dark: '#101622',
          surface: '#111722',
          card: '#1a2332',
          input: '#192233'
        },
        border: {
          dark: '#2a3649',
          light: '#324467'
        },
        text: {
          secondary: '#92a4c9',
          muted: '#63748e'
        },
        success: '#0bda5e',
        warning: '#fa6238',
      },
      fontFamily: {
        sans: ['Manrope', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
