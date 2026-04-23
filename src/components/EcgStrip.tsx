import { useEffect, useRef } from "react";

export type EcgPattern = "normal" | "stemi" | "vt" | "vf" | "asistoli";

interface EcgStripProps {
  hr: number;
  pattern?: string; // accepts EcgPattern | unknown string → defaults to "normal"
}

// Piecewise linear ECG template segments.
// Each entry: [t_start, t_end, y_start, y_end]
// y: 0 = top of canvas (positive deflection), 1 = bottom (negative deflection), 0.5 = baseline
const SEGMENTS: Record<EcgPattern, [number, number, number, number][]> = {
  normal: [
    [0.00, 0.10, 0.50, 0.50], // TP baseline
    [0.10, 0.14, 0.50, 0.40], // P ascent
    [0.14, 0.18, 0.40, 0.50], // P descent
    [0.18, 0.25, 0.50, 0.50], // PR segment
    [0.25, 0.27, 0.50, 0.57], // Q
    [0.27, 0.30, 0.57, 0.06], // R spike up
    [0.30, 0.34, 0.06, 0.88], // S spike down
    [0.34, 0.38, 0.88, 0.50], // S return
    [0.38, 0.50, 0.50, 0.50], // ST isoelectric
    [0.50, 0.62, 0.50, 0.36], // T ascent
    [0.62, 0.75, 0.36, 0.50], // T descent
    [0.75, 1.00, 0.50, 0.50], // TP baseline
  ],
  stemi: [
    [0.00, 0.10, 0.50, 0.50],
    [0.10, 0.14, 0.50, 0.40],
    [0.14, 0.18, 0.40, 0.50],
    [0.18, 0.25, 0.50, 0.50],
    [0.25, 0.27, 0.50, 0.57],
    [0.27, 0.30, 0.57, 0.06], // R spike
    [0.30, 0.36, 0.06, 0.55], // S (less deep — ST elevation starts)
    [0.36, 0.55, 0.55, 0.26], // Coved ST elevation
    [0.55, 0.68, 0.26, 0.46], // Elevated T wave
    [0.68, 0.75, 0.46, 0.50],
    [0.75, 1.00, 0.50, 0.50],
  ],
  vt: [
    [0.00, 0.05, 0.50, 0.50],
    [0.05, 0.20, 0.50, 0.14], // broad R ascent
    [0.20, 0.42, 0.14, 0.86], // broad descent
    [0.42, 0.58, 0.86, 0.50], // return
    [0.58, 1.00, 0.50, 0.50],
  ],
  vf: [], // handled separately via math
  asistoli: [], // handled separately — flat line
};

function sampleEcg(phase: number, pattern: EcgPattern): number {
  const p = ((phase % 1) + 1) % 1;

  if (pattern === "asistoli") {
    // Flat line with tiny artifact noise
    return 0.5 + 0.008 * Math.sin(p * Math.PI * 47);
  }

  if (pattern === "vf") {
    // Deterministic chaotic waveform via overlapping sinusoids
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

const PATTERN_COLOR: Record<EcgPattern, string> = {
  normal: "#10b981",  // clinical-stable
  stemi: "#f59e0b",   // clinical-warning
  vt: "#f59e0b",
  vf: "#ef4444",      // clinical-critical
  asistoli: "#ef4444",
};

const SCROLL_PX_PER_SEC = 100;

export function EcgStrip({ hr, pattern = "normal" }: EcgStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validPattern = (
    ["normal", "stemi", "vt", "vf", "asistoli"] as EcgPattern[]
  ).includes(pattern as EcgPattern)
    ? (pattern as EcgPattern)
    : "normal";

  // Persistent animation state — survives re-renders when deps don't change
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

    // Match internal resolution to rendered CSS width
    const W = canvas.offsetWidth || 800;
    const H = canvas.height; // 80, set via element attribute

    canvas.width = W;

    // Reset buffer on pattern/HR change
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
      const phasePerPixel = 1 / (rrSec * SCROLL_PX_PER_SEC);
      const nPx = Math.round(dt * SCROLL_PX_PER_SEC);

      if (nPx > 0 && state.buffer) {
        const buf = state.buffer;
        buf.copyWithin(0, nPx); // shift left
        for (let i = W - nPx; i < W; i++) {
          buf[i] = sampleEcg(state.phase, validPattern) * H;
          state.phase = (state.phase + phasePerPixel) % 1;
        }
      }

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Grid — subtle horizontal baseline and vertical beat markers
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

      // ECG trace
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

      // Scan cursor — thin dark line at the leading edge
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
  }, [hr, validPattern]);

  return (
    <canvas
      ref={canvasRef}
      height={80}
      style={{ width: "100%", height: "80px", display: "block" }}
      className="rounded-sm"
    />
  );
}
