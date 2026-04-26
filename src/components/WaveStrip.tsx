import { useEffect, useRef } from "react";
import type { WaveSampler, SampleContext } from "@/lib/waveformSamplers";

interface WaveStripProps {
  rate: number;
  sampler: WaveSampler;
  color: string;
  label: string;
  valueLabel?: string;
  ctx: SampleContext;
  height?: number;
}

const SCROLL_PX_PER_SEC = 100;

export function WaveStrip({
  rate,
  sampler,
  color,
  label,
  valueLabel,
  ctx,
  height = 44,
}: WaveStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Tüm değişken veriler ref'te — deps [] kalır, canvas hiç resetlenmez
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const samplerRef = useRef(sampler);
  samplerRef.current = sampler;
  const colorRef = useRef(color);
  colorRef.current = color;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const stateRef = useRef({
    phase: 0,
    lastTime: 0,
    buffer: null as Float32Array | null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const W = canvas.offsetWidth || 320;
    const H = canvas.height;
    canvas.width = W;

    const state = stateRef.current;
    state.buffer = new Float32Array(W).fill(H / 2);
    state.phase = 0;
    state.lastTime = 0;

    let animId: number;
    const frame = (ts: number) => {
      if (state.lastTime === 0) state.lastTime = ts;
      const dt = Math.min(ts - state.lastTime, 100) / 1000;
      state.lastTime = ts;

      const safeRate = Math.max(4, Math.min(300, rateRef.current));
      const cycleSec = 60 / safeRate;
      const phasePerPixel = 1 / (cycleSec * SCROLL_PX_PER_SEC);
      const nPx = Math.round(dt * SCROLL_PX_PER_SEC);

      if (nPx > 0 && state.buffer) {
        const buf = state.buffer;
        buf.copyWithin(0, nPx);
        for (let i = W - nPx; i < W; i++) {
          buf[i] = samplerRef.current(state.phase, ctxRef.current) * H;
          state.phase = (state.phase + phasePerPixel) % 1;
        }
      }

      ctx2d.clearRect(0, 0, W, H);

      // Soluk grid çizgisi
      ctx2d.strokeStyle = "rgba(255,255,255,0.04)";
      ctx2d.lineWidth = 0.5;
      ctx2d.beginPath();
      ctx2d.moveTo(0, H / 2);
      ctx2d.lineTo(W, H / 2);
      ctx2d.stroke();

      if (!state.buffer) {
        animId = requestAnimationFrame(frame);
        return;
      }

      // Dalga + glow
      const col = colorRef.current;
      ctx2d.strokeStyle = col;
      ctx2d.lineWidth = 1.5;
      ctx2d.shadowColor = col;
      ctx2d.shadowBlur = 4;
      ctx2d.lineJoin = "round";
      ctx2d.lineCap = "round";
      ctx2d.beginPath();
      for (let x = 0; x < W; x++) {
        if (x === 0) ctx2d.moveTo(x, state.buffer[x]);
        else ctx2d.lineTo(x, state.buffer[x]);
      }
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;

      // Sağ kenarda silici şerit
      ctx2d.fillStyle = "rgba(0,0,0,0.85)";
      ctx2d.fillRect(W - 4, 0, 4, H);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      state.lastTime = 0;
    };
  }, []); // boş deps — mount/unmount'ta çalışır, rate/color değişince resetlenmez

  return (
    <div className="relative bg-black border-b border-ink-800/50">
      <div
        className="absolute left-1.5 top-0.5 font-mono text-[9px] uppercase tracking-[0.15em] z-10 pointer-events-none"
        style={{ color }}
      >
        {label}
      </div>
      {valueLabel && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs font-bold tabular-nums z-10 pointer-events-none"
          style={{ color }}
        >
          {valueLabel}
        </div>
      )}
      <canvas
        ref={canvasRef}
        height={height}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      />
    </div>
  );
}
