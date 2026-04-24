import type { Specialty } from "@/engine/types";

export interface SpecialtyTheme {
  accent: string;       // Ana aksan rengi (hex)
  accentDim: string;    // Koyu ton
  accentGlow: string;   // Rgba glow (focus ring)
  accentBg: string;     // Çok hafif arkaplan tonu (%8 opacity)
  label: string;        // "Acil Tıp"
  description: string;  // Uzmanlık özeti
}

const THEMES: Record<Specialty, SpecialtyTheme> = {
  kardiyoloji: {
    accent:      "#10b981",
    accentDim:   "#059669",
    accentGlow:  "rgba(16,185,129,0.20)",
    accentBg:    "rgba(16,185,129,0.06)",
    label:       "Kardiyoloji",
    description: "Kalp-damar sistemi — akut ve kronik tablolar",
  },
  acil: {
    accent:      "#ef4444",
    accentDim:   "#dc2626",
    accentGlow:  "rgba(239,68,68,0.20)",
    accentBg:    "rgba(239,68,68,0.06)",
    label:       "Acil Tıp",
    description: "Hızlı tanı ve müdahale gerektiren durumlar",
  },
  pediatri: {
    accent:      "#3b82f6",
    accentDim:   "#2563eb",
    accentGlow:  "rgba(59,130,246,0.20)",
    accentBg:    "rgba(59,130,246,0.06)",
    label:       "Pediatri",
    description: "Çocuk yaş grubu — doz ve klinik farklılıklar",
  },
  dahiliye: {
    accent:      "#8b5cf6",
    accentDim:   "#7c3aed",
    accentGlow:  "rgba(139,92,246,0.20)",
    accentBg:    "rgba(139,92,246,0.06)",
    label:       "Dahiliye",
    description: "İç hastalıkları — metabolik ve sistemik tablolar",
  },
  askeri_tccc: {
    accent:      "#84cc16",
    accentDim:   "#65a30d",
    accentGlow:  "rgba(132,204,22,0.20)",
    accentBg:    "rgba(132,204,22,0.06)",
    label:       "Askeri / TCCC",
    description: "Saha koşulları — travma ve taktik tıp",
  },
  anestezi: {
    accent:      "#06b6d4",
    accentDim:   "#0891b2",
    accentGlow:  "rgba(6,182,212,0.20)",
    accentBg:    "rgba(6,182,212,0.06)",
    label:       "Anestezi",
    description: "Anestezi yönetimi ve yoğun bakım",
  },
  cerrahi: {
    accent:      "#f59e0b",
    accentDim:   "#d97706",
    accentGlow:  "rgba(245,158,11,0.20)",
    accentBg:    "rgba(245,158,11,0.06)",
    label:       "Cerrahi",
    description: "Perioperatif dönem ve komplikasyonlar",
  },
  hemsirelik: {
    accent:      "#ec4899",
    accentDim:   "#db2777",
    accentGlow:  "rgba(236,72,153,0.20)",
    accentBg:    "rgba(236,72,153,0.06)",
    label:       "Hemşirelik",
    description: "Hemşirelik bakımı ve hasta izlemi",
  },
  kadin_dogum: {
    accent:      "#f97316",
    accentDim:   "#ea580c",
    accentGlow:  "rgba(249,115,22,0.20)",
    accentBg:    "rgba(249,115,22,0.06)",
    label:       "Kadın Doğum",
    description: "Obstetri ve jinekoloji acilleri",
  },
};

export function getSpecialtyTheme(specialty: Specialty): SpecialtyTheme {
  return THEMES[specialty] ?? THEMES.dahiliye;
}

export function useSpecialtyTheme(specialty: Specialty): SpecialtyTheme {
  return getSpecialtyTheme(specialty);
}

// ScenarioPlayPage mount'ta çağırır — root CSS değişkenlerini inject eder
export function applySpecialtyTheme(specialty: Specialty): void {
  const t = getSpecialtyTheme(specialty);
  const root = document.documentElement;
  root.style.setProperty("--accent",      t.accent);
  root.style.setProperty("--accent-dim",  t.accentDim);
  root.style.setProperty("--accent-glow", t.accentGlow);
  root.style.setProperty("--accent-bg",   t.accentBg);
}

export function resetSpecialtyTheme(): void {
  const root = document.documentElement;
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-dim");
  root.style.removeProperty("--accent-glow");
  root.style.removeProperty("--accent-bg");
}
