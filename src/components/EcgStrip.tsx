import { useEffect, useRef } from "react";
import type { EcgEffect } from "@/engine/pharmacology/types";

export type EcgPattern = "normal" | "stemi" | "vt" | "vf" | "asistoli";

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
  normal:   "#10b981",
  stemi:    "#f59e0b",
  vt:       "#f59e0b",
  vf:       "#ef4444",
  asistoli: "#ef4444",
};

const SCROLL_PX_PER_SEC = 100;

export function EcgStrip({ hr, pattern = "normal", ecgParams }: EcgStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validPattern = (
    ["normal", "stemi", "vt", "vf", "asistoli"] as EcgPattern[]
  ).includes(pattern as EcgPattern)
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
