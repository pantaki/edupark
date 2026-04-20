import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Baloo 2'", "cursive"],
        body: ["'Nunito'", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        fun: {
          green: "#22c55e",
          orange: "#f97316",
          purple: "#8b5cf6",
          pink: "#ec4899",
          yellow: "#fbbf24",
          red: "#ef4444",
          teal: "#14b8a6",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      scale: {
        "98": "0.98",
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "pop-in": "pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "shake": "shake 0.4s ease-in-out",
        "correct": "correct 0.4s ease",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(59,130,246,0.5)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 12px rgba(59,130,246,0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(59,130,246,0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-8px)" },
          "75%": { transform: "translateX(8px)" },
        },
        correct: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
