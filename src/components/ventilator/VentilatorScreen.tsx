/* =========================================================================
   VentilatorScreen.tsx — Dräger / Hamilton estetiği mekanik ventilatör ekranı.

   `monitor/VitalMonitorScreen.tsx` + `monitor/WaveLane.tsx` desenleriyle aynı
   çatı: TopBar, lane layout, glow-without-shadowBlur, dense yaklaşımı.
   Referans MANTIK: github.com/fedebarra/open-vent-sim (MIT) — kod kopyalanmadı.

   İçerik:
   - 3 dalga formu lane (basınç / akış / hacim) — tek <canvas> sweep, rAF,
     props ref'ten okunur (prop değişimi döngüyü YENİDEN BAŞLATMAZ).
   - mod göstergesi + büyük numerik parametre kutuları
   - preset seçici (Normal / ARDS / KOAH) + mod değiştirici butonlar

   Props: { settings, onChangeMode?, onPickPreset?, patientName?, dense? }
   (Slider'lar sayfa katmanında — bu ekran ölçülen/ayarlı değerleri gösterir.)
   ========================================================================= */
import { useRef, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Wind, Activity, Gauge, Bell, Wifi, BatteryFull } from "lucide-react";
import {
  sampleVentWave,
  deriveVentValues,
  clamp,
  VENT_WAVE,
  VENT_WAVE_LABEL,
  MODE_LABEL,
  MODE_SHORT,
  VENT_PRESETS,
  type VentSettings,
  type VentMode,
  type VentWaveKind,
  type VentPresetKey,
} from "./ventilator-engine";

const MONO = "'Geist Mono', ui-monospace, monospace";
const MODES: VentMode[] = ["VCV", "PCV", "SIMV", "PSV", "CPAP"];
const PRESET_ORDER: VentPresetKey[] = ["normal", "ards", "copd"];

/* Lane başına dikey yerleşim (WaveLane LANE_GEOM deseni).
   pressure/volume tabandan yükselir → baseline alta yakın.
   flow çift yönlü (insp +, eksp −) → baseline ortada. */
const VENT_LANE_GEOM: Record<VentWaveKind, { baseline: number; gain: number }> = {
  pressure: { baseline: 0.9, gain: 0.78 },
  flow: { baseline: 0.5, gain: 0.4 },
  volume: { baseline: 0.9, gain: 0.78 },
};

/* ---------- VentWaveLane: tek canvas sweep (WaveLane portu) ----------
   getSettings: () => VentSettings  (güncel ayarları ref üzerinden okur). */
interface VentLaneProps {
  kind: VentWaveKind;
  color: string;
  speed: number;
  glow: number;
  lineWidth: number;
  getSettings: () => VentSettings;
}

interface VentLaneState {
  samples: (number | null)[];
  cursor: number;
  phase: number; // solunum fazı (tam kısım = solunum index)
  last: number;
  penCol: number;
  penY: number;
  cssW: number;
  cssH: number;
  dpr: number;
}

function VentWaveLane({
  kind,
  color,
  getSettings,
  speed = 90,
  glow = 9,
  lineWidth = 1.9,
  className = "",
  style,
  ariaLabel,
}: {
  kind: VentWaveKind;
  color: string;
  getSettings: () => VentSettings;
  speed?: number;
  glow?: number;
  lineWidth?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef<VentLaneState>({
    samples: [],
    cursor: 0,
    phase: 0,
    last: 0,
    penCol: -1,
    penY: 0,
    cssW: 0,
    cssH: 0,
    dpr: 1,
  });

  // güncel proplar ref'te — tek rAF döngüsü taze değer görsün
  const propsRef = useRef<VentLaneProps>({ kind, color, speed, glow, lineWidth, getSettings });
  propsRef.current = { kind, color, speed, glow, lineWidth, getSettings };

  // ayarlardan o anki örnek değeri hesapla (faz → normalize genlik)
  const valueAt = (P: VentLaneProps, phase: number, s: VentSettings): number => {
    const d = deriveVentValues(s);
    const iFraction = clamp(d.iTime / Math.max(1e-3, d.cycleTime), 0.05, 0.95);
    const peepNorm = clamp(s.peep / Math.max(1, s.pPeak), 0, 1);
    const plateauNorm = clamp(s.pPlateau / Math.max(1, s.pPeak), 0, 1);
    return sampleVentWave(P.kind, phase, s.mode, iFraction, peepNorm, plateauNorm);
  };

  // faz/px ilerleme hızı: solunum frekansı (RR/60) / sweep hızı
  const perPxPhase = (P: VentLaneProps, s: VentSettings): number => {
    const rr = Math.max(0, s.rr || 0);
    return P.speed > 0 ? rr / 60 / P.speed : 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = stateRef.current;

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

    const GAP = 16;

    // shadowBlur'suz glow: ince crisp geçişin altında translucent kalın geçiş
    const segDraw = (x0: number, y0: number, x1: number, y1: number) => {
      const P = propsRef.current;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = P.color;
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

    const fullDraw = () => {
      const P = propsRef.current;
      const W = S.cssW;
      const H = S.cssH;
      if (W < 2 || H < 2) return;
      ctx.clearRect(0, 0, W, H);
      const geom = VENT_LANE_GEOM[P.kind] || VENT_LANE_GEOM.pressure;
      const base = geom.baseline * H;
      const gain = geom.gain * H;
      ctx.strokeStyle = P.color;
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
      S.penCol = -1;
    };

    // statik tek boyamada (screenshot / reduced-motion) bir dalga görünsün diye
    const prime = () => {
      const P = propsRef.current;
      const W = S.cssW;
      if (W < 2) return;
      const s = P.getSettings();
      const step = perPxPhase(P, s);
      let phase = S.phase;
      for (let x = 0; x < W; x++) {
        phase += step;
        S.samples[x] = valueAt(P, phase, s);
      }
      S.phase = phase;
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
      if (dt > 0.1) dt = 0.1; // arka plan sekmesi sonrası clamp

      const W = S.cssW;
      const H = S.cssH;
      if (W < 2 || H < 2) return;

      const s = P.getSettings();
      const step = perPxPhase(P, s);
      const geom = VENT_LANE_GEOM[P.kind] || VENT_LANE_GEOM.pressure;
      const base = geom.baseline * H;
      const gain = geom.gain * H;

      let target = S.cursor + P.speed * dt;
      let guard = 0;
      while (S.cursor < target && guard < W * 2) {
        guard++;
        S.cursor += 1;
        let col = Math.floor(S.cursor) % W;
        if (col < 0) col += W;
        S.phase += step;
        const val = valueAt(P, S.phase, s);
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
      aria-label={ariaLabel || VENT_WAVE_LABEL[kind].label + " dalga formu"}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

/* ---------- VentParamBox: tek büyük numerik (VitalBox deseni) ---------- */
function VentParamBox({
  label,
  unit,
  color,
  value,
  sub,
  big = false,
  k = 1,
  icon,
}: {
  label: string;
  unit: string;
  color: string;
  value: string;
  sub?: string;
  big?: boolean;
  k?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={
        "relative h-full rounded-md border border-white/10 bg-[#0a1410]/80 px-3 flex flex-col justify-between overflow-hidden " +
        (k < 1 ? "py-1.5 " : "py-2.5 ")
      }
    >
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="text-[12px] font-semibold tracking-wide" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] text-white/35">{unit}</span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color, fontSize: `${(big ? 3.4 : 2.4) * k}rem`, fontFamily: MONO }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="text-white/55 mb-1 tabular-nums"
            style={{ fontSize: `${(big ? 1.2 : 0.95) * k}rem`, fontFamily: MONO }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- üst bar (TopBar deseni — ventilatör başlığı + saat) ---------- */
function VentTopBar({
  patientName,
  bedLabel,
  modeLabel,
  clock,
  dense = false,
}: {
  patientName: string;
  bedLabel: string;
  modeLabel: string;
  clock: { time: string; date: string };
  dense?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between px-4 border-b border-white/10 bg-[#03100a] " +
        (dense ? "h-9" : "h-14")
      }
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center font-bold text-black text-sm"
            style={{ background: "#0d9488" }}
          >
            MS
          </div>
          <span className="font-semibold text-white/90 text-sm hidden sm:block">MediSim Vent</span>
        </div>
        <div className="h-7 w-px bg-white/10 hidden sm:block" />
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm truncate">{patientName}</div>
          <div className="text-white/45 text-[11px] truncate">{bedLabel}</div>
        </div>
        <span className="hidden lg:inline-flex items-center text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300/80 uppercase">
          Simülasyon · tıbbi cihaz değildir
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand/40 text-brand-light text-sm">
          <Activity size={16} />
          <span className="hidden sm:inline tabular-nums" style={{ fontFamily: MONO }}>
            {modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/15 text-white/70 text-sm">
          <Bell size={16} />
          <span className="hidden sm:inline">Alarm</span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-white text-base tabular-nums" style={{ fontFamily: MONO }}>
              {clock.time}
            </div>
            <div className="text-[10px] text-white/40">{clock.date}</div>
          </div>
          <Wifi size={17} color="rgba(140,230,180,0.8)" />
          <BatteryFull size={20} color="rgba(140,230,180,0.8)" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   VentilatorScreen — ana kompozisyon
   ========================================================================= */
export interface VentilatorScreenProps {
  settings: VentSettings;
  /** mod butonuna basılınca (verilmezse butonlar salt-okunur görünür) */
  onChangeMode?: (mode: VentMode) => void;
  /** preset butonuna basılınca */
  onPickPreset?: (key: VentPresetKey) => void;
  /** o an seçili preset (vurgu için; yoksa hiçbiri vurgulanmaz) */
  activePreset?: VentPresetKey | null;
  patientName?: string;
  bedLabel?: string;
  /** gömülü/dar slot için yoğun yerleşim (numerik fontlar küçülür) */
  dense?: boolean;
}

export function VentilatorScreen({
  settings,
  onChangeMode,
  onPickPreset,
  activePreset = null,
  patientName = "Demo Hasta",
  bedLabel = "Yatak 1 · Yoğun Bakım",
  dense = false,
}: VentilatorScreenProps) {
  const k = dense ? 0.62 : 1;

  // getSettings: VentWaveLane'ler güncel ayarları ref üzerinden okur (re-render yok)
  const settingsRef = useRef<VentSettings>(settings);
  settingsRef.current = settings;
  const getSettings = useRef(() => settingsRef.current).current;

  // saat için ~4 Hz tick
  const [clock, setClock] = useState(() => fmtClock(new Date()));
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock(new Date())), 250);
    return () => clearInterval(t);
  }, []);

  const d = useMemo(() => deriveVentValues(settings), [settings]);

  const lanes: { kind: VentWaveKind; color: string; speed: number }[] = [
    { kind: "pressure", color: VENT_WAVE.pressure, speed: 90 },
    { kind: "flow", color: VENT_WAVE.flow, speed: 90 },
    { kind: "volume", color: VENT_WAVE.volume, speed: 90 },
  ];

  const clockObj = { time: clock, date: fmtDate(new Date()) };

  return (
    <div
      className="relative flex flex-col h-full bg-[#02100a] text-white"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <VentTopBar
        patientName={patientName}
        bedLabel={bedLabel}
        modeLabel={MODE_LABEL[settings.mode]}
        clock={clockObj}
        dense={dense}
      />

      {/* ana alan */}
      <div className={"flex-1 min-h-0 flex " + (dense ? "gap-1.5 p-1.5" : "gap-2 p-2")}>
        {/* SOL — dalga formları */}
        <div className="flex flex-col gap-2" style={{ flexBasis: "62%", flexGrow: 1, minWidth: 0 }}>
          {lanes.map((ln) => (
            <div
              key={ln.kind}
              className="relative flex-1 min-h-0 rounded-md border border-white/10 overflow-hidden"
            >
              <div className="absolute top-1.5 left-2 z-10 flex items-baseline gap-2 pointer-events-none">
                <span className="text-[12px] font-semibold tracking-wide" style={{ color: ln.color }}>
                  {VENT_WAVE_LABEL[ln.kind].label}
                </span>
                <span
                  className="text-[11px] text-white/45 tabular-nums"
                  style={{ fontFamily: MONO }}
                >
                  {VENT_WAVE_LABEL[ln.kind].unit}
                </span>
              </div>
              <VentWaveLane
                kind={ln.kind}
                color={ln.color}
                getSettings={getSettings}
                speed={ln.speed}
                glow={9}
                lineWidth={1.9}
                ariaLabel={VENT_WAVE_LABEL[ln.kind].label}
              />
            </div>
          ))}
        </div>

        {/* SAĞ — numerikler + mod/preset kontrolleri */}
        <div className="flex flex-col gap-2" style={{ flexBasis: "38%", minWidth: 300, maxWidth: 460 }}>
          {/* mod + preset şeridi */}
          <div className="rounded-md border border-white/10 bg-[#0a1410]/80 p-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Mod</span>
              <span className="text-[10px] text-white/35">{MODE_LABEL[settings.mode]}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeMode?.(m)}
                  disabled={!onChangeMode}
                  className={
                    "text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors tabular-nums " +
                    (settings.mode === m
                      ? "text-black border-transparent bg-brand"
                      : "text-white/60 border-white/15 hover:border-white/35 disabled:hover:border-white/15")
                  }
                  style={{ fontFamily: MONO }}
                >
                  {MODE_SHORT[m]}
                </button>
              ))}
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Preset</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_ORDER.map((key) => {
                const p = VENT_PRESETS[key];
                const active = activePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => onPickPreset?.(key)}
                    disabled={!onPickPreset}
                    title={p.note}
                    className={
                      "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors " +
                      (active
                        ? "text-black border-transparent bg-brand-light"
                        : "text-white/60 border-white/15 hover:border-white/35 disabled:hover:border-white/15")
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* numerik kutular */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
            <VentParamBox
              label="Vt"
              unit="mL"
              color={VENT_WAVE.volume}
              value={String(Math.round(settings.vt))}
              sub={`${(settings.vt / 70).toFixed(1)}/kg`}
              big
              k={k}
              icon={<Wind size={15} color={VENT_WAVE.volume} />}
            />
            <VentParamBox
              label="MV"
              unit="L/dk"
              color="#f4f7f5"
              value={d.minuteVolume.toFixed(1)}
              sub={`RR ${Math.round(settings.rr)}`}
              big
              k={k}
              icon={<Activity size={15} color="#f4f7f5" />}
            />
            <VentParamBox
              label="Ppeak"
              unit="cmH₂O"
              color={VENT_WAVE.pressure}
              value={String(Math.round(settings.pPeak))}
              sub={`Pplat ${Math.round(settings.pPlateau)}`}
              k={k}
              icon={<Gauge size={15} color={VENT_WAVE.pressure} />}
            />
            <VentParamBox
              label="PEEP"
              unit="cmH₂O"
              color={VENT_WAVE.flow}
              value={String(Math.round(settings.peep))}
              sub={`ΔP ${Math.round(d.pDriving)}`}
              k={k}
              icon={<Gauge size={15} color={VENT_WAVE.flow} />}
            />
            <VentParamBox
              label="FiO₂"
              unit="%"
              color="#2ad4ee"
              value={String(Math.round(settings.fio2))}
              k={k}
            />
            <VentParamBox
              label="I:E"
              unit="oran"
              color="#f4f7f5"
              value={`1:${settings.ie}`}
              sub={`Ti ${d.iTime.toFixed(1)}s`}
              k={k}
            />
          </div>

          {/* türetilen özet şeridi */}
          <div className="rounded-md border border-white/10 bg-[#0a1410]/80 px-3 py-2 flex items-center justify-between text-[11px] text-white/55 tabular-nums" style={{ fontFamily: MONO }}>
            <span>
              Kompliyans <span className="text-white/80">{Math.round(d.compliance)}</span> mL/cmH₂O
            </span>
            <span>
              Döngü <span className="text-white/80">{d.cycleTime.toFixed(1)}</span> s
            </span>
            <span>
              İnsp <span className="text-white/80">{Math.round(d.iPercent)}</span>%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- saat formatlayıcıları (Türkçe locale — VitalMonitorScreen ile aynı) ---------- */
function fmtClock(d: Date): string {
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
