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
          DEFAULT: "#0d9488",
          dark: "#0f766e",
          light: "#2dd4bf",
        },
        // Specialty aksan renkleri — her uzmanlık kendi kimliğiyle
        specialty: {
          kardiyoloji: "#10b981",
          acil:        "#ef4444",
          pediatri:    "#3b82f6",
          dahiliye:    "#8b5cf6",
          askeri:      "#84cc16",
          anestezi:    "#06b6d4",
          cerrahi:     "#f59e0b",
          hemsirelik:  "#ec4899",
          kadin_dogum: "#f97316",
        },
        // Klinik durum renkleri — mutlak anlamlar
        status: {
          stable:   "#22c55e",
          warning:  "#eab308",
          critical: "#ef4444",
          info:     "#3b82f6",
          neutral:  "#6b7280",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-3px)" },
        },
        ping: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
