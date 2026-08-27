/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: '#F3F5EF',
        surface: '#FBFDF8',
        'surface-hover': '#ECF0E6',
        primary: '#3C4139',
        secondary: '#767D6E',
        tertiary: '#A2A89A',
        accent: '#56705A',
        'accent-soft': '#DFE7D8',
        'today-dot': '#B5A869',
        'completed-bg': '#EEF1E8',
        danger: '#A96F65'
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
      },
      spacing: {
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
      }
    },
  },
  plugins: [],
}
