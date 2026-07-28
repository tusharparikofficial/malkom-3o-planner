/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Capgemini brand — values come from CSS variables set at runtime
        // from AppSetting (see theme bootstrap), defaults in globals.css.
        primary: {
          DEFAULT: "rgb(var(--brand-primary-rgb) / <alpha-value>)",
          hover: "rgb(var(--brand-primary-hover-rgb) / <alpha-value>)",
          soft: "rgb(var(--brand-primary-soft-rgb) / <alpha-value>)",
        },
        ink: "var(--brand-ink)",
        surface: "var(--brand-surface)",
        status: {
          done: "#16A34A",
          progress: "#0070AD",
          risk: "#D97706",
          slipped: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["Ubuntu", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -8px rgba(15, 23, 42, 0.08)",
        "card-hover":
          "0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 32px -12px rgba(0, 112, 173, 0.25)",
        fab: "0 8px 24px -6px rgba(0, 112, 173, 0.5)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
