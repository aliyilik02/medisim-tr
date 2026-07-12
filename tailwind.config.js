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
        // Neon aksan paleti (UI yenileme pilotu, 12 Tem 2026 — docs/DESIGN-TOKENS.md).
        // Klinik semantiği ÇALMAZ: kırmızı/amber/yeşil alarm dili dokunulmaz kalır.
        // Kategori kimlikleri: ekipman=cyan, ilaç=pink, tetkik=violet (tekil aksan;
        // mor GRADIENT yasağı geçerli — violet yalnız düz aksan olarak kullanılır).
        neon: {
          teal:   "#2dd4bf", // brand-light ile aynı — marka neon çekirdeği
          cyan:   "#22d3ee", // ekipman kategorisi
          pink:   "#f472b6", // ilaç kategorisi
          violet: "#a78bfa", // tetkik kategorisi (lab+görüntüleme)
          blue:   "#60a5fa", // bilgi vurgusu (clinical-info ile hizalı)
        },
      },
      // Neon glow gölgeleri — renk --glow CSS değişkeninden gelir (GlowIcon /
      // .neon-* class'ları set eder). box-shadow bilinçli tercih: filter/
      // drop-shadow GPU'da pahalı, 8Hz tick dersine (R4) uymaz.
      boxShadow: {
        "glow-xs": "0 0 6px -1px var(--glow, rgba(45,212,191,0.45))",
        "glow-sm": "0 0 10px -1px var(--glow, rgba(45,212,191,0.45))",
        "glow-md": "0 0 18px -2px var(--glow, rgba(45,212,191,0.5)), 0 0 4px -1px var(--glow, rgba(45,212,191,0.6))",
        "glow-lg": "0 0 32px -4px var(--glow, rgba(45,212,191,0.55)), 0 0 8px -2px var(--glow, rgba(45,212,191,0.65))",
        "glow-line": "inset 0 -1px 0 0 var(--glow, rgba(45,212,191,0.5))",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "heartbeat": "heartbeat 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        // Monitör alarm flash (IEC 60601-1-8) — box-shadow ring yanıp söner,
        // sayı okunaklı kalır. steps() = sert blink (monitör estetiği).
        // GÜVENLİK: flash-high 0.6s = ~1.67Hz — 2Hz stroboskopik sınırın altında,
        // hızlandırma. Dekoratif glow bu kutulara BİNMEZ (alarm ring'ini ezer).
        "monitor-flash-high": "monitorFlashHigh 0.6s steps(2, end) infinite",
        "monitor-flash-med": "monitorFlashMed 1.6s steps(2, end) infinite",
        // Neon UI seti — dekoratif (prefers-reduced-motion'da index.css kapatır)
        "glow-breathe": "glowBreathe 2.6s ease-in-out infinite",
        "icon-pop": "iconPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "shimmer": "shimmer 1.8s linear infinite",
        "scanline": "scanline 7s linear infinite",
        "stagger-in": "staggerIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        monitorFlashHigh: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(239,68,68,0.9)" },
          "50%": { boxShadow: "0 0 0 2px rgba(239,68,68,0.18)" },
        },
        monitorFlashMed: {
          "0%, 100%": { boxShadow: "0 0 0 1.5px rgba(245,158,11,0.75)" },
          "50%": { boxShadow: "0 0 0 1.5px rgba(245,158,11,0.22)" },
        },
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
        // Neon seti — hepsi transform/opacity/box-shadow (ucuz kanallar).
        glowBreathe: {
          "0%, 100%": { boxShadow: "0 0 10px -2px var(--glow, rgba(45,212,191,0.4))" },
          "50%": { boxShadow: "0 0 22px -2px var(--glow, rgba(45,212,191,0.65))" },
        },
        iconPop: {
          "0%": { transform: "scale(0.7)", opacity: "0.4" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        staggerIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
