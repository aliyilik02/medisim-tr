import { useEffect, useRef } from "react";
import type { EcgEffect } from "@/engine/pharmacology/types";

export type EcgPattern =
  | "normal"
  | "stemi"
  | "vt"
  | "vf"
  | "asistoli"
  | "sinus_brad"
  | "sinus_tach"
  | "af"
  | "aflutter"
  | "avb_1"
  | "avb_2_mobitz1"
  | "avb_2_mobitz2"
  | "avb_3"
  | "svt"
  | "torsade"
  | "lbbb"
  | "rbbb"
  | "pacemaker";

interface EcgStripProps {
  hr: number;
  pattern?: string;        // EcgPattern | unknown string → defaults to "normal"
  ecgParams?: EcgEffect;   // İlaç kaynaklı EKG parametre değişimleri
}

// Piecewise linear ECG template segments.
// Each entry: [t_start, t_end, y_start, y_end]
// y: 0 = top of canvas (positive deflection), 1 = bottom (negative deflection), 0.5 = baseline
const SEGMENTS: Record<EcgPattern, [number, number, number, number][]> = {
  normal: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.14, 0.50, 0.40],
    [0.14, 0.18, 0.40, 0.50],
    [0.18, 0.25, 0.50, 0.50],
    [0.25, 0.27, 0.50, 0.57],
    [0.27, 0.30, 0.57, 0.06],
    [0.30, 0.34, 0.06, 0.88],
    [0.34, 0.38, 0.88, 0.50],
    [0.38, 0.50, 0.50, 0.50],
    [0.50, 0.62, 0.50, 0.36],
    [0.62, 0.75, 0.36, 0.50],
    [0.75, 1.00, 0.50, 0.50],
  ],
  stemi: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.14, 0.50, 0.40],
    [0.14, 0.18, 0.40, 0.50],
    [0.18, 0.25, 0.50, 0.50],
    [0.25, 0.27, 0.50, 0.57],
    [0.27, 0.30, 0.57, 0.06],
    [0.30, 0.36, 0.06, 0.55],
    [0.36, 0.55, 0.55, 0.26],
    [0.55, 0.68, 0.26, 0.46],
    [0.68, 0.75, 0.46, 0.50],
    [0.75, 1.00, 0.50, 0.50],
  ],
  vt: [
    [0.00, 0.05, 0.50, 0.50],
    [0.05, 0.20, 0.50, 0.14],
    [0.20, 0.42, 0.14, 0.86],
    [0.42, 0.58, 0.86, 0.50],
    [0.58, 1.00, 0.50, 0.50],
  ],
  vf: [],
  asistoli: [],

  // Sinüs bradikardi — normal morfoloji, rate düşük (HR param ile görsel olarak yavaş)
  sinus_brad: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.15, 0.50, 0.38],  // Belirgin P dalgası
    [0.15, 0.20, 0.38, 0.50],
    [0.20, 0.30, 0.50, 0.50],  // Normal PR
    [0.30, 0.32, 0.50, 0.57],
    [0.32, 0.35, 0.57, 0.05],
    [0.35, 0.39, 0.05, 0.87],
    [0.39, 0.43, 0.87, 0.50],
    [0.43, 0.55, 0.50, 0.50],
    [0.55, 0.68, 0.50, 0.35],  // Düzgün T
    [0.68, 0.80, 0.35, 0.50],
    [0.80, 1.00, 0.50, 0.50],
  ],

  // Sinüs taşikardi — normal morfoloji, kısa QT
  sinus_tach: [
    [0.00, 0.08, 0.50, 0.50],
    [0.08, 0.12, 0.50, 0.42],
    [0.12, 0.16, 0.42, 0.50],
    [0.16, 0.22, 0.50, 0.50],
    [0.22, 0.24, 0.50, 0.57],
    [0.24, 0.27, 0.57, 0.06],
    [0.27, 0.31, 0.06, 0.88],
    [0.31, 0.35, 0.88, 0.50],
    [0.35, 0.44, 0.50, 0.50],
    [0.44, 0.54, 0.50, 0.38],  // Kısa T
    [0.54, 0.64, 0.38, 0.50],
    [0.64, 1.00, 0.50, 0.50],
  ],

  // Atriyal fibrilasyon — düzensiz QRS (segment + noise logic'te özel case)
  af: [],

  // Atriyal flutter — testere dişi dalgalar + QRS
  aflutter: [],

  // 1. derece AV blok — uzun PR (normal QRS, uzun önce izoelektrik)
  avb_1: [
    [0.00, 0.08, 0.50, 0.50],
    [0.08, 0.12, 0.50, 0.41],
    [0.12, 0.17, 0.41, 0.50],
    [0.17, 0.35, 0.50, 0.50],  // UZUN PR (AVB-1 belirleyici özelliği)
    [0.35, 0.37, 0.50, 0.57],
    [0.37, 0.40, 0.57, 0.06],
    [0.40, 0.44, 0.06, 0.88],
    [0.44, 0.48, 0.88, 0.50],
    [0.48, 0.58, 0.50, 0.50],
    [0.58, 0.71, 0.50, 0.36],
    [0.71, 0.82, 0.36, 0.50],
    [0.82, 1.00, 0.50, 0.50],
  ],

  // Mobitz I (Wenckebach) — her 3 P'de 1 QRS düşer, özel case
  avb_2_mobitz1: [],

  // Mobitz II — sabit PR ama ani QRS düşmesi, özel case
  avb_2_mobitz2: [],

  // 3. derece (tam) AV blok — yavaş ventriküler escape
  avb_3: [],

  // SVT — dar QRS, çok hızlı, P yok
  svt: [
    [0.00, 0.20, 0.50, 0.50],  // Uzun izoelektrik (hızda anlamlı)
    [0.20, 0.22, 0.50, 0.57],
    [0.22, 0.25, 0.57, 0.06],
    [0.25, 0.29, 0.06, 0.88],
    [0.29, 0.33, 0.88, 0.50],
    [0.33, 0.50, 0.50, 0.50],
    [0.50, 0.60, 0.50, 0.38],  // Kısa T
    [0.60, 0.70, 0.38, 0.50],
    [0.70, 1.00, 0.50, 0.50],
  ],

  // Torsades de pointes — dönen aks (özel sinüzoidal case)
  torsade: [],

  // LBBB — geniş çentikli QRS, lateral görünüm, ters T
  lbbb: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.15, 0.50, 0.42],
    [0.15, 0.20, 0.42, 0.50],
    [0.20, 0.28, 0.50, 0.50],
    [0.28, 0.36, 0.50, 0.20],  // Geniş R upstroke
    [0.36, 0.41, 0.20, 0.24],  // Çentik (notch) — LBBB'nin belirtici kertezi
    [0.41, 0.48, 0.24, 0.16],  // İkinci R tepe
    [0.48, 0.56, 0.16, 0.50],  // J noktası
    [0.56, 0.70, 0.50, 0.62],  // ST depresyonu + ters T (discordance)
    [0.70, 0.82, 0.62, 0.50],
    [0.82, 1.00, 0.50, 0.50],
  ],

  // RBBB — rSR' pattern (V1 görünümü), geniş QRS
  rbbb: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.14, 0.50, 0.43],
    [0.14, 0.18, 0.43, 0.50],
    [0.18, 0.26, 0.50, 0.50],
    [0.26, 0.30, 0.50, 0.44],  // Küçük r (küçük ilk tepe)
    [0.30, 0.36, 0.44, 0.80],  // S derin
    [0.36, 0.41, 0.80, 0.50],
    [0.41, 0.49, 0.50, 0.18],  // R' yüksek ikinci tepe (RBBB belirleyici)
    [0.49, 0.56, 0.18, 0.50],
    [0.56, 0.68, 0.50, 0.60],  // Ters T (V1'de beklenen)
    [0.68, 0.80, 0.60, 0.50],
    [0.80, 1.00, 0.50, 0.50],
  ],

  // Pacemaker — spike + geniş QRS
  pacemaker: [
    [0.00, 0.15, 0.50, 0.50],
    [0.15, 0.16, 0.50, 0.10],  // Pacemaker spike (dar, çok keskin)
    [0.16, 0.17, 0.10, 0.50],
    [0.17, 0.20, 0.50, 0.58],
    [0.20, 0.25, 0.58, 0.08],  // Geniş QRS upstroke
    [0.25, 0.33, 0.08, 0.88],
    [0.33, 0.40, 0.88, 0.50],
    [0.40, 0.55, 0.50, 0.50],
    [0.55, 0.68, 0.50, 0.60],  // Ters T (pacemaker capture)
    [0.68, 0.80, 0.60, 0.50],
    [0.80, 1.00, 0.50, 0.50],
  ],
};

function sampleEcgBase(phase: number, pattern: EcgPattern): number {
  const p = ((phase % 1) + 1) % 1;

  if (pattern === "asistoli") {
    return 0.5 + 0.008 * Math.sin(p * Math.PI * 47);
  }

  if (pattern === "vf") {
    return (
      0.5 +
      0.22 * Math.sin(p * Math.PI * 11 + 0.73) +
      0.14 * Math.sin(p * Math.PI * 17 + 1.31) +
      0.09 * Math.sin(p * Math.PI * 7 + 2.1)
    );
  }

  // Atriyal fibrilasyon — düzensiz fibrilasyon dalgaları + QRS
  if (pattern === "af") {
    const fibBaseline =
      0.5 +
      0.035 * Math.sin(p * Math.PI * 43 + 1.2) +
      0.025 * Math.sin(p * Math.PI * 67 + 2.3) +
      0.018 * Math.sin(p * Math.PI * 29 + 0.8);
    // QRS kompleksi ~0.30-0.44 arası
    if (p >= 0.28 && p < 0.44) {
      const q = p - 0.28;
      if (q < 0.02) return fibBaseline + 0.06 * (q / 0.02);  // Q
      if (q < 0.05) return fibBaseline - 0.42 * ((q - 0.02) / 0.03);  // R spike up
      if (q < 0.09) return fibBaseline - 0.42 + 0.80 * ((q - 0.05) / 0.04);  // S down
      if (q < 0.16) return fibBaseline + 0.38 - 0.38 * ((q - 0.09) / 0.07);  // S recovery
    }
    return fibBaseline;
  }

  // Atriyal flutter — testere dişi flutter dalgaları (4:1 blok, QRS 4. dişten sonra)
  if (pattern === "aflutter") {
    // 4 flutter dalgası periyod boyunca, QRS en sona ekli
    const flutterWave = (ph: number) =>
      ph < 0.5
        ? -0.12 * (ph / 0.5)   // inişli backslash
        : -0.12 + 0.24 * ((ph - 0.5) / 0.5);  // çıkışlı slash
    // QRS ~0.72-0.86
    if (p >= 0.70 && p < 0.86) {
      const q = p - 0.70;
      if (q < 0.02) return 0.5 + 0.07 * (q / 0.02);
      if (q < 0.05) return 0.5 - 0.42 * ((q - 0.02) / 0.03);
      if (q < 0.09) return 0.5 - 0.42 + 0.78 * ((q - 0.05) / 0.04);
      if (q < 0.16) return 0.5 + 0.36 - 0.36 * ((q - 0.09) / 0.07);
    }
    // 4 flutter dalga döngüsü — her 0.25 periyotta bir
    const flutterP = (p * 4) % 1;
    return 0.5 + flutterWave(flutterP) * 1.0;
  }

  // Wenckebach (Mobitz I) — 4:3 blok; 3 P-QRS ve 1 P-no-QRS döngüsü
  if (pattern === "avb_2_mobitz1") {
    // Döngü 4 periyot gibi düşün, 3 QRS var
    const cycleP = p * (4 / 3); // normalleştir
    const beat = cycleP % 1;
    const beatNum = Math.floor(cycleP) % 4;
    if (beatNum === 3) {
      // 4. atım — sadece P, QRS yok
      if (beat >= 0.08 && beat < 0.22) {
        const b = beat - 0.08;
        if (b < 0.07) return 0.5 - 0.10 * (b / 0.07);
        return 0.5 - 0.10 + 0.10 * ((b - 0.07) / 0.07);
      }
      return 0.5;
    }
    // Giderek uzayan PR: beat 0→0.4 P dalgası, sonra QRS
    const prOffset = 0.15 + beatNum * 0.05;  // her atımda PR uzar
    if (beat >= 0.05 && beat < 0.18) {
      const b = beat - 0.05;
      if (b < 0.06) return 0.5 - 0.09 * (b / 0.06);
      return 0.5 - 0.09 + 0.09 * ((b - 0.06) / 0.07);
    }
    const qrsStart = prOffset;
    if (beat >= qrsStart && beat < qrsStart + 0.18) {
      const q = beat - qrsStart;
      if (q < 0.02) return 0.5 + 0.07 * (q / 0.02);
      if (q < 0.05) return 0.5 - 0.42 * ((q - 0.02) / 0.03);
      if (q < 0.09) return 0.5 - 0.42 + 0.80 * ((q - 0.05) / 0.04);
      if (q < 0.16) return 0.5 + 0.38 - 0.38 * ((q - 0.09) / 0.07);
    }
    if (beat >= qrsStart + 0.18 && beat < qrsStart + 0.36) {
      const t = beat - (qrsStart + 0.18);
      if (t < 0.09) return 0.5 - 0.12 * (t / 0.09);
      return 0.5 - 0.12 + 0.12 * ((t - 0.09) / 0.09);
    }
    return 0.5;
  }

  // Mobitz II — sabit PR, ani QRS kaybı (2:1 blok)
  if (pattern === "avb_2_mobitz2") {
    // Her iki P'den biri QRS üretiyor
    const halfP = (p * 2) % 1;
    const isQrsBeat = Math.floor(p * 2) % 2 === 0;
    // P dalgası her atımda
    if (halfP >= 0.08 && halfP < 0.22) {
      const b = halfP - 0.08;
      if (b < 0.06) return 0.5 - 0.10 * (b / 0.06);
      return 0.5 - 0.10 + 0.10 * ((b - 0.06) / 0.07);
    }
    if (!isQrsBeat) return 0.5;  // QRS düşmüş
    if (halfP >= 0.30 && halfP < 0.48) {
      const q = halfP - 0.30;
      if (q < 0.02) return 0.5 + 0.07 * (q / 0.02);
      if (q < 0.05) return 0.5 - 0.42 * ((q - 0.02) / 0.03);
      if (q < 0.09) return 0.5 - 0.42 + 0.80 * ((q - 0.05) / 0.04);
      if (q < 0.16) return 0.5 + 0.38 - 0.38 * ((q - 0.09) / 0.07);
    }
    if (halfP >= 0.48 && halfP < 0.72) {
      const t = halfP - 0.48;
      if (t < 0.12) return 0.5 - 0.12 * (t / 0.12);
      return 0.5 - 0.12 + 0.12 * ((t - 0.12) / 0.12);
    }
    return 0.5;
  }

  // Tam AV blok — yavaş ventriküler escape, P'ler bağımsız
  if (pattern === "avb_3") {
    // Ventriküler escape ~30/dk = normal HR'ın ~0.5x'i
    // P dalgaları 3x hızda bağımsız (80/dk), QRS yavaş
    const pRatio = 3.0;
    const pPhase = (p * pRatio) % 1;
    let pContrib = 0;
    if (pPhase >= 0.08 && pPhase < 0.22) {
      const b = pPhase - 0.08;
      pContrib = b < 0.07
        ? -0.08 * (b / 0.07)
        : -0.08 + 0.08 * ((b - 0.07) / 0.07);
    }
    // Geniş ventriküler QRS (escape ritim)
    const qrsOffset = 0.20;
    if (p >= qrsOffset && p < qrsOffset + 0.28) {
      const q = p - qrsOffset;
      if (q < 0.03) return 0.5 + 0.10 * (q / 0.03);
      if (q < 0.08) return 0.5 - 0.42 * ((q - 0.03) / 0.05);
      if (q < 0.14) return 0.5 - 0.42 + 0.85 * ((q - 0.08) / 0.06);
      if (q < 0.22) return 0.5 + 0.43 - 0.43 * ((q - 0.14) / 0.08);
    }
    if (p >= qrsOffset + 0.28 && p < qrsOffset + 0.55) {
      const t = p - (qrsOffset + 0.28);
      if (t < 0.14) return 0.5 - 0.14 * (t / 0.14);
      return 0.5 - 0.14 + 0.14 * ((t - 0.14) / 0.13);
    }
    return 0.5 + pContrib;
  }

  // Torsades de pointes — dönen aks, polimorfik VT
  if (pattern === "torsade") {
    const twistCycles = 1.5;
    const twist = Math.sin(p * Math.PI * 2 * twistCycles);
    return (
      0.5 +
      twist * 0.32 * Math.sin(p * Math.PI * 9.7 + 0.8) +
      0.08 * Math.sin(p * Math.PI * 13.3 + 1.6) +
      0.04 * Math.sin(p * Math.PI * 5.1 + 2.1)
    );
  }

  // Segment tablosundan al (normal, stemi, vt, sinus_brad, sinus_tach, avb_1, svt, lbbb, rbbb, pacemaker)
  const segs = SEGMENTS[pattern] ?? SEGMENTS.normal;
  for (const [t0, t1, y0, y1] of segs) {
    if (p >= t0 && p < t1) {
      const frac = (p - t0) / (t1 - t0);
      return y0 + (y1 - y0) * frac;
    }
  }
  return 0.5;
}

// Parametrik örnekleme — ecgParams ile dalga formu modifiye edilir.
// Bölge tanımları normalleştirilmiş faz (0-1) cinsinden:
//   QRS: 0.25-0.38  |  ST: 0.38-0.50  |  T: 0.50-0.76
// qrs_duration_ms / qt_interval_ms → faz uzatma/kaydırma (rrMs gerekli)
function sampleEcg(
  phase: number,
  pattern: EcgPattern,
  rrMs: number,
  params?: EcgEffect
): number {
  const p = ((phase % 1) + 1) % 1;

  if (!params || pattern === "vf" || pattern === "asistoli") {
    return sampleEcgBase(phase, pattern);
  }

  // Faz remap için deltalara dönüştür
  const qrsDeltaFrac = (params.qrs_duration_ms ?? 0) / rrMs;
  const qtDeltaFrac  = (params.qt_interval_ms ?? 0) / rrMs;

  const QRS_S = 0.25, QRS_E = 0.38;
  const T_S   = 0.50, T_E   = 0.76;

  // QRS genişleme/daralma: QRS bölgesindeyse iç faz remapla
  let sampleP = p;
  if (qrsDeltaFrac !== 0 && p >= QRS_S && p < QRS_E + Math.max(0, qrsDeltaFrac)) {
    const origLen = QRS_E - QRS_S;
    const newLen  = Math.max(0.02, origLen + qrsDeltaFrac);
    const frac    = Math.min(1, (p - QRS_S) / newLen);
    sampleP = QRS_S + frac * origLen;
  }

  // QT uzama/kısalma: QRS'deki gibi stretch remap — T şablonunu gerer/sıkıştırır
  const tEnd = T_E + qtDeltaFrac;
  if (qtDeltaFrac !== 0 && p >= T_S && p < tEnd) {
    const frac = (p - T_S) / (tEnd - T_S);
    sampleP = T_S + frac * (T_E - T_S);
  }

  let y = sampleEcgBase(sampleP, pattern);

  // ST elevasyon/depresyon (negatif = yukarı = canvas'ta düşük y)
  const stShift = (params.st_elevation_mv ?? 0) * -0.08;
  const inStT = p >= 0.38 && p < tEnd;
  if (inStT) y += stShift;

  // QRS genliği ölçekleme
  const inQrs = p >= QRS_S && p < QRS_E + Math.max(0, qrsDeltaFrac);
  if (inQrs && params.qrs_amplitude_pct !== undefined) {
    y = 0.5 + (y - 0.5) * params.qrs_amplitude_pct;
  }

  // T genliği ölçekleme (ST'ye gore kaydırılmış baz etrafında)
  const inT = p >= T_S && p < tEnd;
  if (inT && params.t_amplitude_pct !== undefined) {
    const tBase = 0.5 + stShift;
    y = tBase + (y - tBase) * params.t_amplitude_pct;
  }

  return Math.max(0, Math.min(1, y));
}

const PATTERN_COLOR: Record<EcgPattern, string> = {
  normal:         "#00E676",
  stemi:          "#f59e0b",
  vt:             "#f59e0b",
  vf:             "#ef4444",
  asistoli:       "#ef4444",
  sinus_brad:     "#10b981",
  sinus_tach:     "#f59e0b",
  af:             "#f59e0b",
  aflutter:       "#f59e0b",
  avb_1:          "#84cc16",
  avb_2_mobitz1:  "#f59e0b",
  avb_2_mobitz2:  "#f97316",
  avb_3:          "#ef4444",
  svt:            "#f59e0b",
  torsade:        "#ef4444",
  lbbb:           "#f97316",
  rbbb:           "#84cc16",
  pacemaker:      "#38bdf8",
};

const SCROLL_PX_PER_SEC = 100;

export function EcgStrip({ hr, pattern = "normal", ecgParams }: EcgStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ALL_PATTERNS: EcgPattern[] = [
    "normal", "stemi", "vt", "vf", "asistoli",
    "sinus_brad", "sinus_tach", "af", "aflutter",
    "avb_1", "avb_2_mobitz1", "avb_2_mobitz2", "avb_3",
    "svt", "torsade", "lbbb", "rbbb", "pacemaker",
  ];
  const validPattern = ALL_PATTERNS.includes(pattern as EcgPattern)
    ? (pattern as EcgPattern)
    : "normal";

  // ecgParams ref — değişince canvas reset olmaz, sadece sonraki frame alır
  const ecgParamsRef = useRef(ecgParams);
  ecgParamsRef.current = ecgParams;

  const stateRef = useRef({
    phase: 0,
    lastTime: 0,
    buffer: null as Float32Array | null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 800;
    const H = canvas.height;

    canvas.width = W;

    const state = stateRef.current;
    state.buffer = new Float32Array(W).fill(H / 2);
    state.phase = 0;
    state.lastTime = 0;

    const color = PATTERN_COLOR[validPattern];

    let animId: number;
    const frame = (ts: number) => {
      if (state.lastTime === 0) state.lastTime = ts;
      const dt = Math.min(ts - state.lastTime, 100) / 1000;
      state.lastTime = ts;

      const rrSec = 60 / Math.max(20, Math.min(300, hr));
      const rrMs  = rrSec * 1000;
      const phasePerPixel = 1 / (rrSec * SCROLL_PX_PER_SEC);
      const nPx = Math.round(dt * SCROLL_PX_PER_SEC);

      if (nPx > 0 && state.buffer) {
        const buf = state.buffer;
        buf.copyWithin(0, nPx);
        for (let i = W - nPx; i < W; i++) {
          buf[i] = sampleEcg(state.phase, validPattern, rrMs, ecgParamsRef.current) * H;
          state.phase = (state.phase + phasePerPixel) % 1;
        }
      }

      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      for (let x = 0; x < W; x += Math.round(rrSec * SCROLL_PX_PER_SEC)) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      if (!state.buffer) {
        animId = requestAnimationFrame(frame);
        return;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        if (x === 0) ctx.moveTo(x, state.buffer[x]);
        else ctx.lineTo(x, state.buffer[x]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(10,10,11,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W - 1, 0);
      ctx.lineTo(W - 1, H);
      ctx.stroke();

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      state.lastTime = 0;
    };
  }, [hr, validPattern]); // ecgParams kasıtlı dışarıda — ref üzerinden alınır, reset tetiklemez

  return (
    <canvas
      ref={canvasRef}
      height={80}
      style={{ width: "100%", height: "80px", display: "block" }}
      className="rounded-sm"
    />
  );
}
