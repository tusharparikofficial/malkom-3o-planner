/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Capgemini brand — values come from CSS variables set at runtime
        // from AppSetting (see theme bootstrap), defaults in globals.css.
        primary: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          soft: "var(--brand-primary-soft)",
        },
        ink: "var(--brand-ink)",
        surface: "var(--brand-surface)",
      },
      fontFamily: {
        sans: ["Ubuntu", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
};
