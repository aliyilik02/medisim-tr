/* =========================================================================
   WaveLane.tsx — tek bir <canvas> üzerinde sweep tarzı dalga formu.

   Harici monitör repo'sundan (`scratch/eval-monitor/src/waveform.jsx`) PORTLANDI.
   `window.sampleECG` vb. → ES import; `React.useRef/useEffect` → import.
   Props TS-tipli. getVitals: () => VitalState.

   Tasarım kısıtları (orijinal spec):
   - TEK canvas, requestAnimationFrame ile çizilir. SVG/CSS keyframe YOK.
   - Animasyon döngüsü bir kez başlar, güncel vitalleri bir callback (getVitals)
     üzerinden ref ile okur; prop değişimi döngüyü asla yeniden başlatmaz.
   - Gerçek başucu monitörü gibi sweep / önden-silme imleci.
   - HiDPI (devicePixelRatio) keskin + responsive (ResizeObserver).
   - shadowBlur yerine translucent kalın geçiş ile hafif "glow".
   ========================================================================= */
import { useRef, useEffect, type CSSProperties } from "react";
import {
  sampleECG,
  samplePleth,
  sampleArt,
  sampleCO2,
  fibNoise,
  artifactValue,
  hasPerfusion,
  clamp,
  type VitalState,
  type WaveKind,
} from "./waveform-engine";

// Lane başına dikey yerleşim: baseline (değer 0'ın oturduğu yükseklik oranı)
// ve gain (birim genlik başına yükseklik oranı).
const LANE_GEOM: Record<WaveKind, { baseline: number; gain: number }> = {
  ecg: { baseline: 0.6, gain: 0.46 },
  pleth: { baseline: 0.86, gain: 0.7 },
  co2: { baseline: 0.9, gain: 0.78 },
  art: { baseline: 0.88, gain: 0.7 },
};

// Güncel faz + vitallere göre bir lane için tek normalize örnek hesapla.
function laneValue(
  kind: WaveKind,
  beat: number,
  resp: number,
  v: VitalState,
  tAbs: number
): number {
  if (kind === "ecg")
    return sampleECG(beat, v.rhythm, tAbs, v.paced, v.st || 0) + artifactValue(v.artifact, tAbs);

  const perfusing = hasPerfusion(v); // paced yakalama / nabızsız olmayan ritim

  if (kind === "pleth") {
    if (!perfusing) return v.rhythm === "vfib" ? 0.06 + 0.05 * fibNoise(tAbs * 0.6) : 0;
    const amp = clamp((v.spo2 - 70) / 30, 0.22, 1); // kötü sat → küçük nabız
    // solunum genlik salınımı (abartılı = pulsus paradoxus)
    const swing = v.pulsus ? 0.34 : 0.12;
    const respMod = 1 - swing * (0.5 + 0.5 * Math.sin(2 * Math.PI * resp));
    return samplePleth(beat) * amp * respMod;
  }

  if (kind === "co2") {
    if (!perfusing && v.capno !== "rebreathing") return 0; // etkili ventilasyon/perfüzyon yok
    const amp = clamp(v.etco2 / 45, 0.12, 1.05);
    return sampleCO2(resp, v.capno) * amp;
  }

  // arteriyel / IBP
  if (!perfusing) return v.rhythm === "vfib" ? 0.1 + 0.05 * fibNoise(tAbs) : 0.03;
  return sampleArt(beat);
}

export interface WaveLaneProps {
  kind?: WaveKind;
  color?: string;
  getVitals: () => VitalState;
  speed?: number; // saniyede px sweep
  glow?: number; // glow miktarı; küçük döşemeler için 0 geçin
  lineWidth?: number;
  critical?: boolean;
  paused?: boolean;
  mult?: number; // genlik çarpanı
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

interface LaneState {
  samples: (number | null)[];
  cursor: number;
  beat: number;
  resp: number;
  last: number;
  penCol: number;
  penY: number;
  cssW: number;
  cssH: number;
  dpr: number;
}

interface LaneProps {
  kind: WaveKind;
  color: string;
  speed: number;
  glow: number;
  lineWidth: number;
  critical: boolean;
  paused: boolean;
  mult: number;
  getVitals: () => VitalState;
}

export function WaveLane({
  kind = "ecg",
  color,
  getVitals,
  speed = 170,
  glow = 8,
  lineWidth = 1.8,
  critical = false,
  paused = false,
  mult = 1,
  className = "",
  style,
  ariaLabel,
}: WaveLaneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // değişebilir motor durumu ref'lerde yaşar (animasyonda re-render yok)
  const stateRef = useRef<LaneState>({
    samples: [],
    cursor: 0,
    beat: Math.random(),
    resp: Math.random(),
    last: 0,
    penCol: -1,
    penY: 0,
    cssW: 0,
    cssH: 0,
    dpr: 1,
  });

  // en güncel propları ref'te tut ki tek rAF döngüsü taze değerleri görsün
  const propsRef = useRef<LaneProps>({
    kind,
    color: color || WAVE_FALLBACK[kind],
    speed,
    glow,
    lineWidth,
    critical,
    paused,
    mult,
    getVitals,
  });
  propsRef.current = {
    kind,
    color: color || WAVE_FALLBACK[kind],
    speed,
    glow,
    lineWidth,
    critical,
    paused,
    mult,
    getVitals,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = stateRef.current;

    // canvas'ı container'a device pixel ratio ile (yeniden) boyutla
    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(wrap.clientWidth));
      const hgt = Math.max(1, Math.floor(wrap.clientHeight));
      S.dpr = dpr;
      S.cssW = w;
      S.cssH = hgt;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(hgt * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = hgt + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.samples = new Array(w).fill(null);
      S.cursor = 0;
    };

    const GAP = 16; // write head önünde boş piksel

    // güncel vitallerden sweep parametreleri
    const rates = (P: LaneProps, v: VitalState) => {
      const hr = Math.max(0, v.hr || 0);
      const rr = Math.max(0, v.rr || 0);
      const beatRate =
        (P.kind === "ecg" && (v.rhythm === "vtach" || v.rhythm === "torsades")
          ? Math.max(hr, 160)
          : hr) / 60;
      return {
        perPxBeat: P.speed > 0 ? beatRate / P.speed : 0,
        perPxResp: P.speed > 0 ? rr / 60 / P.speed : 0,
      };
    };

    const colorOf = (P: LaneProps) => (P.critical ? "#ff5a5a" : P.color);

    // shadowBlur olmadan glow: crisp ince geçişin altında translucent kalın geçiş
    const segDraw = (x0: number, y0: number, x1: number, y1: number) => {
      const P = propsRef.current;
      const c = colorOf(P);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = c;
      if (P.glow > 0) {
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = P.lineWidth + 3.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = P.lineWidth;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };

    // write head'in hemen önünde GAP genişliğinde şerit sil (wrap-aware)
    const clearAhead = (col: number) => {
      const W = S.cssW;
      const H = S.cssH;
      const start = col + 1;
      if (start + GAP <= W) ctx.clearRect(start, 0, GAP, H);
      else {
        ctx.clearRect(start, 0, W - start, H);
        ctx.clearRect(0, 0, start + GAP - W, H);
      }
    };

    // prime/resize sonrası kalıcı canvas üzerinde tek seferlik tam render
    const fullDraw = () => {
      const P = propsRef.current;
      const W = S.cssW;
      const H = S.cssH;
      if (W < 2 || H < 2) return;
      ctx.clearRect(0, 0, W, H);
      const geom = LANE_GEOM[P.kind] || LANE_GEOM.ecg;
      const base = geom.baseline * H;
      const gain = geom.gain * H;
      ctx.strokeStyle = colorOf(P);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const path = () => {
        ctx.beginPath();
        let pen = false;
        for (let x = 0; x < W; x++) {
          const s = S.samples[x];
          if (s == null) {
            pen = false;
            continue;
          }
          const y = base - s * gain;
          if (!pen) {
            ctx.moveTo(x + 0.5, y);
            pen = true;
          } else ctx.lineTo(x + 0.5, y);
        }
        ctx.stroke();
      };
      if (P.glow > 0) {
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = P.lineWidth + 3.2;
        path();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = P.lineWidth;
      path();
      S.penCol = -1; // tam repaint sonrası incremental kalemi yeniden başlat
    };

    // Tek statik boyamada (screenshot / reduced-motion) bir dalga görünsün diye
    // tam bir iz ön-doldur — rAF döngüsü sonra onu animasyona alır.
    const prime = () => {
      const P = propsRef.current;
      const W = S.cssW;
      if (W < 2) return;
      const v = P.getVitals() || ({} as VitalState);
      const { perPxBeat, perPxResp } = rates(P, v);
      let beat = S.beat;
      let resp = S.resp;
      for (let x = 0; x < W; x++) {
        beat += perPxBeat;
        resp += perPxResp;
        S.samples[x] = laneValue(P.kind, beat, resp, v, x / 60) * (P.mult != null ? P.mult : 1);
      }
      S.beat = beat;
      S.resp = resp;
      S.cursor = W - 1;
      for (let g = 1; g <= GAP; g++) S.samples[(W - 1 + g) % W] = null;
      fullDraw();
    };

    resize();
    prime();

    const ro = new ResizeObserver(() => {
      resize();
      prime();
    });
    ro.observe(wrap);

    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const P = propsRef.current;
      const tSec = now / 1000;
      if (!S.last) S.last = tSec;
      let dt = tSec - S.last;
      S.last = tSec;
      if (dt > 0.1) dt = 0.1; // sekme arka plana atıldıktan sonra clamp
      if (P.paused) return; // kalıcı canvas son kareyi tutar

      const W = S.cssW;
      const H = S.cssH;
      if (W < 2 || H < 2) return;

      const v = P.getVitals() || ({} as VitalState);
      const { perPxBeat, perPxResp } = rates(P, v);
      const geom = LANE_GEOM[P.kind] || LANE_GEOM.ecg;
      const base = geom.baseline * H;
      const gain = geom.gain * H;

      // write head'i CSS piksel-sütunu başına bir ilerlet, yalnızca yeni üretilen
      // segmenti çiz — kare başına tam-canvas redraw yok.
      let target = S.cursor + P.speed * dt;
      let guard = 0;
      while (S.cursor < target && guard < W * 2) {
        guard++;
        S.cursor += 1;
        let col = Math.floor(S.cursor) % W;
        if (col < 0) col += W;
        S.beat += perPxBeat;
        S.resp += perPxResp;
        const val = laneValue(P.kind, S.beat, S.resp, v, tSec) * (P.mult != null ? P.mult : 1);
        S.samples[col] = val;

        const y = base - val * gain;
        if (S.penCol >= 0 && S.penCol === col - 1) segDraw(S.penCol + 0.5, S.penY, col + 0.5, y);
        S.penCol = col;
        S.penY = y;

        clearAhead(col);
        for (let g = 1; g <= GAP; g++) S.samples[(col + g) % W] = null;

        if (S.cursor >= W) {
          S.cursor -= W;
          target -= W;
          S.penCol = -1;
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // tek seferlik başlatma — proplar ref üzerinden okunur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      className={"relative w-full h-full " + className}
      style={style}
      role="img"
      aria-label={ariaLabel || (kind === "ecg" ? "EKG dalga formu" : kind + " dalga formu")}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

// color prop verilmezse kind'a göre varsayılan çizgi rengi
const WAVE_FALLBACK: Record<WaveKind, string> = {
  ecg: "#36e07a",
  pleth: "#2ad4ee",
  co2: "#f5c43a",
  art: "#f0556b",
};
