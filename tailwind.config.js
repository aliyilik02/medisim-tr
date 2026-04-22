/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Instrument Serif'", "serif"],
        sans: ["'Geist'", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#0a0a0b",
          900: "#0f0f11",
          800: "#141416",
          700: "#1c1c1f",
          600: "#26262a",
          500: "#3a3a3f",
          400: "#5c5c63",
          300: "#8a8a85",
          200: "#b8b8b0",
          100: "#e5e5de",
          50: "#f5f5f0",
        },
        clinical: {
          critical: "#ef4444",
          warning: "#f59e0b",
          stable: "#10b981",
          info: "#60a5fa",
          neutral: "#8a8a85",
        },
        brand: {
          DEFAULT: "#7cb342",
          dark: "#558b2f",
          light: "#aed581",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "heartbeat": "heartbeat 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        heartbeat: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.05)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
