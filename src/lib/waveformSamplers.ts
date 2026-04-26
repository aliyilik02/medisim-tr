// Dalga form sampler'ları — phase ∈ [0,1] tek atım/döngü içinde
// Dönüş: 0 (üst) ↔ 1 (alt), 0.5 = baseline. EcgStrip ile aynı konvansiyon.

export type WaveSampler = (phase: number, ctx: SampleContext) => number;

export interface SampleContext {
  hr: number;
  rr: number;
  sbp: number;
  dbp: number;
}

// Pleth (SpO2) — yumuşak sistolik tepe + dikrotik notch
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
  const t = (p - 0.85) / 0.15;
  return 0.50 + 0.00 * t;
};

// Arteriyel basınç — keskin sistolik tepe + belirgin dikrotik çentik
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

// Solunum — yavaş asimetrik sinüs (inspirasyon hızlı, ekspirasyon yavaş)
export const sampleResp: WaveSampler = (phase) => {
  const p = phase % 1;
  if (p < 0.40) {
    const t = p / 0.40;
    return 0.50 - 0.35 * Math.sin(t * Math.PI * 0.5);
  }
  const t = (p - 0.40) / 0.60;
  return 0.15 + 0.35 * Math.sin(t * Math.PI * 0.5 + Math.PI * 0.5);
};
