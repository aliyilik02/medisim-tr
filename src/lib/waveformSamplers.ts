// Dalga form sampler'ları — phase ∈ [0,1] tek atım/döngü içinde
// Dönüş: 0 (üst) ↔ 1 (alt), 0.5 = baseline.

export type WaveSampler = (phase: number, ctx: SampleContext) => number;

export interface SampleContext {
  hr: number;
  rr: number;
  sbp: number;
  dbp: number;
}

// Pleth (SpO2) — sistolik tepe + dikrotik notch
export const samplePleth: WaveSampler = (phase) => {
  const p = phase % 1;
  if (p < 0.05) return 0.50;
  if (p < 0.18) {
    const t = (p - 0.05) / 0.13;
    return 0.50 - 0.42 * Math.sin(t * Math.PI * 0.5);
  }
  if (p < 0.35) {
    const t = (p - 0.18) / 0.17;
    return 0.08 + 0.28 * t;
  }
  if (p < 0.42) {
    const t = (p - 0.35) / 0.07;
    return 0.36 - 0.06 * Math.sin(t * Math.PI);
  }
  if (p < 0.85) {
    const t = (p - 0.42) / 0.43;
    return 0.36 + 0.14 * (1 - Math.exp(-2.5 * t));
  }
  return 0.50;
};

// Arteriyel basınç — keskin sistolik tepe + dikrotik çentik
export const sampleArt: WaveSampler = (phase) => {
  const p = phase % 1;
  if (p < 0.04) return 0.60;
  if (p < 0.14) {
    const t = (p - 0.04) / 0.10;
    return 0.60 - 0.50 * t;
  }
  if (p < 0.22) {
    const t = (p - 0.14) / 0.08;
    return 0.10 + 0.20 * t;
  }
  if (p < 0.30) {
    const t = (p - 0.22) / 0.08;
    return 0.30 + 0.05 * Math.sin(t * Math.PI);
  }
  if (p < 0.38) {
    const t = (p - 0.30) / 0.08;
    return 0.32 - 0.08 * Math.sin(t * Math.PI);
  }
  if (p < 0.95) {
    const t = (p - 0.38) / 0.57;
    return 0.40 + 0.20 * (1 - Math.exp(-1.8 * t));
  }
  return 0.60;
};

// Kapnografi (EtCO₂) — kare-omuz dalga: hızlı ekspiratuvar yükseliş,
// hafif yukarı eğimli alveoler plato (tepe = EtCO₂), inspirasyonda hızlı düşüş.
// Faz I baseline ≈ 0 CO₂ (sampler dönüşünde alt = 1.0).
export const sampleCapno: WaveSampler = (phase) => {
  const p = phase % 1;
  const top = 0.10;     // plato tepesi (EtCO₂ — ekranda üst)
  const base = 0.92;    // inspiratuvar baseline (CO₂ ≈ 0 — ekranda alt)
  // Faz I — soluk alma/baseline (düz, sıfıra yakın CO₂)
  if (p < 0.30) return base;
  // Faz II — ekspiratuvar hızlı yükseliş (dik omuz)
  if (p < 0.42) {
    const t = (p - 0.30) / 0.12;
    return base - (base - top - 0.04) * t;
  }
  // Faz III — alveoler plato (hafif yukarı eğimli, tepe = EtCO₂)
  if (p < 0.85) {
    const t = (p - 0.42) / 0.43;
    return (top + 0.04) - 0.04 * t; // plato sonunda en yüksek (EtCO₂ tepesi)
  }
  // İnspirasyon başı — hızlı düşüş (dik iniş omzu) baseline'a
  const t = (p - 0.85) / 0.15;
  return top + (base - top) * t;
};

// Solunum — yavaş asimetrik sinüs
export const sampleResp: WaveSampler = (phase) => {
  const p = phase % 1;
  if (p < 0.40) {
    const t = p / 0.40;
    return 0.50 - 0.35 * Math.sin(t * Math.PI * 0.5);
  }
  const t = (p - 0.40) / 0.60;
  return 0.15 + 0.35 * Math.sin(t * Math.PI * 0.5 + Math.PI * 0.5);
};
