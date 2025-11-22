import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        'nb-bg': '#F8FAFC',
        'nb-ink': '#1E293B',
        'nb-blue': '#4F46E5',   /* Indigo 600 */
        'nb-blue-soft': '#E0E7FF',
        'nb-orange': '#FB923C', /* Orange 400 */
        'nb-orange-soft': '#FFEDD5',
        'nb-red': '#F43F5E',    /* Rose 500 */
        'nb-red-soft': '#FFE4E6',
        'nb-teal': '#2DD4BF',   /* Teal 400 */
        'nb-teal-soft': '#CCFBF1',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'blob': '40% 60% 70% 30% / 40% 50% 60% 50%',
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'glow': '0 0 20px rgba(79, 70, 229, 0.2)',
        'float': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};
export default config;

