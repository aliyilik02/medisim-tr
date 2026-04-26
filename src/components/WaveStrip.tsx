import { useEffect, useRef } from "react";
import type { WaveSampler, SampleContext } from "@/lib/waveformSamplers";

interface WaveStripProps {
  rate: number;
  sampler: WaveSampler;
  color: string;
  label: string;
  unit?: string;
  ctx: SampleContext;
  height?: number;
}

const SCROLL_PX_PER_SEC = 100;

export function WaveStrip({
  rate,
  sampler,
  color,
  label,
  height = 56,
  ctx,
}: WaveStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const W = canvas.offsetWidth || 800;
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

      const safeRate = Math.max(4, Math.min(300, rate));
      const cycleSec = 60 / safeRate;
      const phasePerPixel = 1 / (cycleSec * SCROLL_PX_PER_SEC);
      const nPx = Math.round(dt * SCROLL_PX_PER_SEC);

      if (nPx > 0 && state.buffer) {
        const buf = state.buffer;
        buf.copyWithin(0, nPx);
        for (let i = W - nPx; i < W; i++) {
          buf[i] = sampler(state.phase, ctxRef.current) * H;
          state.phase = (state.phase + phasePerPixel) % 1;
        }
      }

      ctx2d.clearRect(0, 0, W, H);

      // Soluk grid
      ctx2d.strokeStyle = "rgba(255,255,255,0.04)";
      ctx2d.lineWidth = 0.5;
      ctx2d.beginPath();
      ctx2d.moveTo(0, H / 2);
      ctx2d.lineTo(W, H / 2);
      ctx2d.stroke();
      for (let x = 0; x < W; x += Math.round(cycleSec * SCROLL_PX_PER_SEC)) {
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, H);
        ctx2d.stroke();
      }

      if (!state.buffer) {
        animId = requestAnimationFrame(frame);
        return;
      }

      // Dalga + glow
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = 1.5;
      ctx2d.shadowColor = color;
      ctx2d.shadowBlur = 5;
      ctx2d.lineJoin = "round";
      ctx2d.lineCap = "round";
      ctx2d.beginPath();
      for (let x = 0; x < W; x++) {
        if (x === 0) ctx2d.moveTo(x, state.buffer[x]);
        else ctx2d.lineTo(x, state.buffer[x]);
      }
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;

      // Sağ kenarda silici şerit (scroll edge)
      ctx2d.strokeStyle = "rgba(0,0,0,0.9)";
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(W - 1, 0);
      ctx2d.lineTo(W - 1, H);
      ctx2d.stroke();

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      state.lastTime = 0;
    };
  }, [rate, sampler, color]);

  return (
    <div className="relative bg-black border-b border-ink-800/60">
      <div
        className="absolute left-2 top-1 font-mono text-[10px] uppercase tracking-[0.18em] z-10"
        style={{ color }}
      >
        {label}
      </div>
      <canvas
        ref={canvasRef}
        height={height}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      />
    </div>
  );
}
