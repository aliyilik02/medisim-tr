/* =========================================================================
   VitalMonitorScreen.tsx — Philips/Dräger estetiği başucu monitörü.

   Harici monitör repo'sundan (`scratch/eval-monitor/src/monitor.jsx` —
   PatientMonitor layout'u) SADELEŞTİRİLMİŞ port. Defib/vent/drugs/wall/
   authoring/profiles UI'ları ATLANDI; yalnızca layout + kompozisyon alındı.

   Props: { vitals: VitalState }  (NATIVE — adaptör YOK).
   Render: 4 dalga lane (EKG/pleth/co2/art) + 7 vital kutusu
   (HR/SpO₂/NIBP/ABP/RR/EtCO₂/Temp) + üst bar (saat + disclaimer).

   Trend sparkline'ları RingBuffer ile kendi içinde tick/interval besler.
   ========================================================================= */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Droplet,
  Gauge,
  Activity,
  Wind,
  Thermometer,
  Bell,
  Wifi,
  BatteryFull,
  AlertTriangle,
} from "lucide-react";
import { WaveLane } from "./WaveLane";
import {
  PARAM,
  WAVE,
  LIMITS,
  RHYTHM_LABEL,
  LETHAL_RHYTHMS,
  hasPerfusion,
  evaluateAlarms,
  clamp,
  RingBuffer,
  type VitalState,
  type AlarmLevel,
  type LimitKey,
} from "./waveform-engine";

/* ---------- numerik gösterim yardımcıları (monitor.jsx displayVitals portu) ---------- */
function displayVitals(v: VitalState) {
  const lethal = LETHAL_RHYTHMS.includes(v.rhythm);
  const noPulse = !hasPerfusion(v);
  return {
    hr: noPulse ? "--" : String(Math.round(v.hr)),
    spo2: noPulse ? "--" : String(Math.round(clamp(v.spo2, 0, 100))),
    rr: v.rr < 2 ? "--" : String(Math.round(v.rr)),
    etco2: String(Math.round(v.etco2)),
    temp: v.temp.toFixed(1),
    sbp: v.sbp < 30 ? null : Math.round(v.sbp),
    dbp: v.dbp < 20 ? null : Math.round(v.dbp),
    ibpS: noPulse ? 0 : Math.round(v.sbp),
    ibpD: noPulse ? 0 : Math.round(v.dbp),
    lethal,
    noPulse,
  };
}

/* ---------- TrendSparkline (widgets.jsx portu — saf inline SVG) ---------- */
function TrendSparkline({
  data,
  color = "#9aa",
  width = 132,
  height = 26,
  critical = false,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  critical?: boolean;
}) {
  if (!data || data.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of data) {
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  if (hi - lo < 1e-6) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.18;
  lo -= pad;
  hi += pad;
  const n = data.length;
  const pts = data.map((d, i) => {
    const x = (i / (n - 1)) * (width - 2) + 1;
    const y = height - 2 - ((d - lo) / (hi - lo)) * (height - 4);
    return [x, y] as const;
  });
  const path = pts
    .map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden="true" className="block">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx={last[0]} cy={last[1]} r="2.1" fill={critical ? "#ff5a5a" : color} />
    </svg>
  );
}

const MONO = "'Geist Mono', ui-monospace, monospace";

// alarm seviyesine göre kenar + flash sınıfı (IEC 60601-1-8 estetiği)
function alarmBox(level: AlarmLevel): string {
  if (level === "crit") return "border-red-500 animate-monitor-flash-high";
  if (level === "warn") return "border-amber-400/70 animate-monitor-flash-med";
  return "border-white/10";
}

/* ---------- VitalBox: tek büyük numerik parametre ---------- */
function VitalBox({
  label,
  unit,
  color,
  value,
  sub,
  level = "normal",
  low,
  high,
  trend = [],
  icon,
  big = false,
  k = 1,
}: {
  label: string;
  unit: string;
  color: string;
  value: string;
  sub?: string;
  level?: AlarmLevel;
  low?: number;
  high?: number;
  trend?: number[];
  icon: React.ReactNode;
  big?: boolean;
  /** numerik ölçek faktörü (dense=0.62, normal=1) */
  k?: number;
}) {
  const crit = level === "crit";
  const numColor = crit ? "#ff6b6b" : color;
  return (
    <div
      className={
        "group relative h-full rounded-md border bg-[#06180f]/80 px-3 flex flex-col justify-between overflow-hidden " +
        (k < 1 ? "py-1 " : "py-2 ") +
        alarmBox(level)
      }
      role={crit ? "alert" : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-[12px] font-semibold tracking-wide" style={{ color }}>
            {label}
          </span>
          <span className="text-[10px] text-white/35">{unit}</span>
        </div>
        {low != null && (
          <div
            className="text-[10px] leading-tight text-white/30 text-right tabular-nums"
            style={{ fontFamily: MONO }}
          >
            <div>{high}</div>
            <div>{low}</div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color: numColor, fontSize: `${(big ? 4.6 : 3.4) * k}rem`, fontFamily: MONO }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="text-white/55 mb-1.5 tabular-nums"
            style={{ fontSize: `${(big ? 1.5 : 1.1) * k}rem`, fontFamily: MONO }}
          >
            {sub}
          </span>
        )}
      </div>

      <div className="mt-1">
        <TrendSparkline
          data={trend}
          color={color}
          critical={crit}
          width={big ? 170 : 134}
          height={(big ? 30 : 24) * k}
        />
      </div>
    </div>
  );
}

/* ---------- NibpBox: otomatik kaf döngüsü (sadeleştirilmiş) ---------- */
function NibpBox({
  sbp,
  dbp,
  level,
  trend,
  accent,
  k = 1,
}: {
  sbp: number;
  dbp: number;
  level: AlarmLevel;
  trend: number[];
  accent: string;
  k?: number;
}) {
  const [intervalMin, setIntervalMin] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const crit = level === "crit";
  const mean = sbp > 0 ? Math.round((sbp + 2 * dbp) / 3) : 0;
  const intervals = [5, 15, 30];

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? intervalMin * 60 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [intervalMin]);

  const fmtMMSS = (totalSec: number) => {
    const s = Math.max(0, Math.round(totalSec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div
      className={
        "relative h-full rounded-md border bg-[#06180f]/80 px-3 py-2 flex flex-col justify-between " +
        alarmBox(level)
      }
      role={crit ? "alert" : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Gauge size={15} color={PARAM.nibp.color} />
          <span className="text-[12px] font-semibold tracking-wide text-white">NIBP</span>
          <span className="text-[10px] text-white/35">mmHg</span>
        </div>
        <span className="text-[10px] text-white/30 tabular-nums" style={{ fontFamily: MONO }}>
          {LIMITS.sbp.dispHi}/{LIMITS.sbp.dispLo}
        </span>
      </div>

      <div className="flex items-end gap-1">
        <span
          data-testid="monitor-nibp-sys"
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color: crit ? "#ff6b6b" : "#f4f7f5", fontSize: `${3.0 * k}rem`, fontFamily: MONO }}
        >
          {sbp > 0 ? sbp : "--"}
        </span>
        <span
          className="font-bold leading-none text-white/45"
          style={{ fontSize: `${2.0 * k}rem`, fontFamily: MONO }}
        >
          /
        </span>
        <span
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color: crit ? "#ff6b6b" : "#f4f7f5", fontSize: `${3.0 * k}rem`, fontFamily: MONO }}
        >
          {dbp > 0 ? dbp : "--"}
        </span>
        <span
          className="text-white/45 mb-1 ml-1 tabular-nums"
          style={{ fontSize: `${1.1 * k}rem`, fontFamily: MONO }}
        >
          ({mean || "--"})
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {intervals.map((m) => (
            <button
              key={m}
              onClick={() => {
                setIntervalMin(m);
                setSecondsLeft(m * 60);
              }}
              className={
                "text-[10px] px-1.5 py-0.5 rounded border transition-colors tabular-nums " +
                (m === intervalMin
                  ? "text-black border-transparent"
                  : "text-white/55 border-white/15 hover:border-white/30")
              }
              style={m === intervalMin ? { background: accent, fontFamily: MONO } : { fontFamily: MONO }}
            >
              {m}dk
            </button>
          ))}
        </div>
        <span
          className="text-[10px] text-white/40 tabular-nums"
          style={{ fontFamily: MONO }}
        >
          Sonraki: {fmtMMSS(secondsLeft)}
        </span>
      </div>

      <div className="mt-1">
        <TrendSparkline data={trend} color="#f4f7f5" critical={crit} width={134} height={22} />
      </div>
    </div>
  );
}

/* ---------- IbpBox: canlı (beat-to-beat) invaziv arteriyel basınç ---------- */
function IbpBox({
  sbp,
  dbp,
  level,
  trend,
}: {
  sbp: number;
  dbp: number;
  level: AlarmLevel;
  trend: number[];
}) {
  const crit = level === "crit";
  const mean = sbp > 0 ? Math.round((sbp + 2 * dbp) / 3) : 0;
  return (
    <div
      className={
        "group relative h-full rounded-md border bg-[#06180f]/80 px-3 py-2 flex flex-col justify-between overflow-hidden " +
        alarmBox(level)
      }
      role={crit ? "alert" : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <Activity size={15} color={WAVE.art} />
          <span className="text-[12px] font-semibold tracking-wide" style={{ color: WAVE.art }}>
            ABP
          </span>
          <span className="text-[10px] text-white/35">mmHg</span>
        </div>
        <div
          className="text-[10px] leading-tight text-white/30 text-right tabular-nums"
          style={{ fontFamily: MONO }}
        >
          <div>{LIMITS.sbp.dispHi}</div>
          <div>{LIMITS.sbp.dispLo}</div>
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color: crit ? "#ff6b6b" : "#f0a6ae", fontSize: "2.7rem", fontFamily: MONO }}
        >
          {sbp > 0 ? sbp : "--"}
        </span>
        <span
          className="font-bold leading-none text-white/40"
          style={{ fontSize: "1.7rem", fontFamily: MONO }}
        >
          /
        </span>
        <span
          className="font-bold leading-none tracking-tight tabular-nums"
          style={{ color: crit ? "#ff6b6b" : "#f0a6ae", fontSize: "2.7rem", fontFamily: MONO }}
        >
          {dbp > 0 ? dbp : "--"}
        </span>
        <span
          className="text-white/45 mb-1 ml-1 tabular-nums"
          style={{ fontSize: "1rem", fontFamily: MONO }}
        >
          ({mean || "--"})
        </span>
      </div>
      <div className="mt-1">
        <TrendSparkline data={trend} color={WAVE.art} critical={crit} width={134} height={22} />
      </div>
    </div>
  );
}

/* ---------- üst bar ---------- */
function TopBar({
  patientName,
  bedLabel,
  severity,
  clock,
  dense = false,
}: {
  patientName: string;
  bedLabel: string;
  severity: AlarmLevel;
  clock: { time: string; date: string };
  dense?: boolean;
}) {
  return (
    <div className={"flex items-center justify-between px-4 border-b border-white/10 bg-[#03100a] " + (dense ? "h-9" : "h-14")}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center font-bold text-black text-sm"
            style={{ background: "#0d9488" }}
          >
            MS
          </div>
          <span className="font-semibold text-white/90 text-sm hidden sm:block">MediSim</span>
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
        <div
          className={
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm " +
            (severity === "crit"
              ? "border-red-500 text-red-300 animate-monitor-flash-high"
              : "border-white/15 text-white/70")
          }
        >
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

/* ---------- WarningBand: ölümcül-ritim uyarısı ---------- */
function WarningBand({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 px-4 py-1.5 text-white font-bold tracking-[0.18em] text-sm animate-monitor-flash-high"
      style={{ background: "rgba(120,12,12,0.92)" }}
    >
      <AlertTriangle size={18} color="#fff" />
      {text}
      <AlertTriangle size={18} color="#fff" />
    </div>
  );
}

/* =========================================================================
   VitalMonitorScreen — ana kompozisyon
   ========================================================================= */
export interface VitalMonitorScreenProps {
  vitals: VitalState;
  patientName?: string;
  bedLabel?: string;
  accent?: string;
  /** ABP (arteriyel) lane + kutusu gösterilsin mi (varsayılan true) */
  showArt?: boolean;
  /** Gömülü/dar slot için yoğun yerleşim — numerik fontlar küçülür, üst bar incelir */
  dense?: boolean;
}

export function VitalMonitorScreen({
  vitals,
  patientName = "Demo Hasta",
  bedLabel = "Yatak 1 · Yoğun Bakım",
  accent = "#06b6d4",
  showArt = true,
  dense = false,
}: VitalMonitorScreenProps) {
  // dense: gömülü başucu slotunda büyük fontlar taşmasın diye numerik ölçek
  const k = dense ? 0.6 : 1;
  // getVitals: WaveLane'ler güncel vitalleri ref üzerinden okur (re-render yok)
  const vitalsRef = useRef<VitalState>(vitals);
  vitalsRef.current = vitals;
  const getVitals = useRef(() => vitalsRef.current).current;

  // trend ring buffer'ları (saniyede 1 örnek)
  const trendsRef = useRef<{
    hr: RingBuffer;
    spo2: RingBuffer;
    sbp: RingBuffer;
    rr: RingBuffer;
    etco2: RingBuffer;
  } | null>(null);
  if (trendsRef.current === null) {
    const t = {
      hr: new RingBuffer(150),
      spo2: new RingBuffer(150),
      sbp: new RingBuffer(60),
      rr: new RingBuffer(150),
      etco2: new RingBuffer(150),
    };
    // boş sparkline olmasın diye ön-doldur
    for (let i = 0; i < 24; i++) {
      t.hr.push(vitals.hr + (Math.random() - 0.5) * 3);
      t.spo2.push(vitals.spo2 + (Math.random() - 0.5) * 1.5);
      t.sbp.push(vitals.sbp + (Math.random() - 0.5) * 4);
      t.rr.push(vitals.rr + (Math.random() - 0.5) * 1.5);
      t.etco2.push(vitals.etco2 + (Math.random() - 0.5) * 1.5);
    }
    trendsRef.current = t;
  }

  // saniyede 1 trend besle + saat için ~4 Hz re-render tick
  const [, setTick] = useState(0);
  const [clock, setClock] = useState(() => fmtClock(new Date()));
  useEffect(() => {
    const trendTimer = setInterval(() => {
      const v = vitalsRef.current;
      const tr = trendsRef.current!;
      tr.hr.push(v.hr);
      tr.spo2.push(v.spo2);
      tr.rr.push(v.rr);
      tr.etco2.push(v.etco2);
      tr.sbp.push(v.sbp);
    }, 1000);
    const renderTimer = setInterval(() => {
      setClock(fmtClock(new Date()));
      setTick((x) => (x + 1) % 1000000);
    }, 250);
    return () => {
      clearInterval(trendTimer);
      clearInterval(renderTimer);
    };
  }, []);

  const v = vitals;
  const d = displayVitals(v);
  const alarms = useMemo(() => evaluateAlarms(v), [v]);
  const lv = alarms.levels;
  const trends = trendsRef.current!;

  const trendArr = (k: LimitKey): number[] => {
    if (k === "hr") return trends.hr.toArray();
    if (k === "spo2") return trends.spo2.toArray();
    if (k === "sbp") return trends.sbp.toArray();
    if (k === "rr") return trends.rr.toArray();
    if (k === "etco2") return trends.etco2.toArray();
    return [];
  };

  // sol taraf dalga lane'leri
  const lanes = [
    {
      kind: "ecg" as const,
      color: WAVE.ecg,
      label: "EKG · II",
      sub: v.paced ? "Pace · yakalama" : RHYTHM_LABEL[v.rhythm],
      crit: lv.hr === "crit" || alarms.lethal,
      speed: 165,
    },
    {
      kind: "pleth" as const,
      color: WAVE.pleth,
      label: "SpO₂ Pleth",
      sub: d.spo2 === "--" ? "nabız yok" : d.spo2 + "%",
      crit: lv.spo2 === "crit",
      speed: 165,
    },
    {
      kind: "co2" as const,
      color: WAVE.co2,
      label: "Kapnografi",
      sub: "EtCO₂ " + d.etco2,
      crit: lv.etco2 === "crit",
      speed: 110,
    },
    {
      kind: "art" as const,
      color: WAVE.art,
      label: "ABP",
      sub: d.ibpS ? `${d.ibpS}/${d.ibpD}` : "--/--",
      crit: lv.sbp === "crit",
      speed: 165,
      optional: true,
    },
  ].filter((ln) => !ln.optional || showArt);

  const clockObj = { time: clock, date: fmtDate(new Date()) };

  return (
    <div
      data-testid="vital-monitor-screen"
      className="relative flex flex-col h-full bg-[#02100a] text-white"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <TopBar
        patientName={patientName}
        bedLabel={bedLabel}
        severity={alarms.severity}
        clock={clockObj}
        dense={dense}
      />

      <WarningBand text={alarms.bandText} />

      {/* ana alan */}
      <div className={"flex-1 min-h-0 flex " + (dense ? "gap-1.5 p-1.5" : "gap-2 p-2")}>
        {/* SOL — dalga formları */}
        <div className="flex flex-col gap-2" style={{ flexBasis: "64%", flexGrow: 1, minWidth: 0 }}>
          {lanes.map((ln) => (
            <div
              key={ln.kind}
              className={
                "relative flex-1 min-h-0 rounded-md border overflow-hidden " +
                (ln.crit ? "border-red-500/70" : "border-white/10")
              }
            >
              <div className="absolute top-1.5 left-2 z-10 flex items-baseline gap-2 pointer-events-none">
                <span className="text-[12px] font-semibold tracking-wide" style={{ color: ln.color }}>
                  {ln.label}
                </span>
                <span className="text-[11px] text-white/45 tabular-nums" style={{ fontFamily: MONO }}>
                  {ln.sub}
                </span>
              </div>
              <WaveLane
                kind={ln.kind}
                color={ln.color}
                getVitals={getVitals}
                speed={ln.speed}
                glow={9}
                lineWidth={1.9}
                critical={ln.crit}
                ariaLabel={ln.label + " dalga formu"}
              />
            </div>
          ))}
        </div>

        {/* SAĞ — numerikler */}
        <div className="flex flex-col gap-2" style={{ flexBasis: "34%", minWidth: 280, maxWidth: 440 }}>
          <div className="flex-1 min-h-0">
            <VitalBox
              label="HR"
              unit="bpm"
              color={PARAM.hr.color}
              value={d.hr}
              level={lv.hr}
              low={LIMITS.hr.critLo}
              high={LIMITS.hr.critHi}
              trend={trendArr("hr")}
              icon={<Heart size={15} color={PARAM.hr.color} />}
              big
              k={k}
            />
          </div>
          <div className="flex-1 min-h-0">
            <VitalBox
              label="SpO₂"
              unit="%"
              color={PARAM.spo2.color}
              value={d.spo2}
              level={lv.spo2}
              low={LIMITS.spo2.critLo}
              high={LIMITS.spo2.critHi}
              trend={trendArr("spo2")}
              icon={<Droplet size={15} color={PARAM.spo2.color} />}
              k={k}
            />
          </div>
          <div className="flex gap-2" style={{ flexBasis: "0", flexGrow: 1.1, minHeight: 0 }}>
            <div className={showArt ? "flex-1 min-w-0" : "w-full"}>
              <NibpBox
                sbp={d.sbp == null ? 0 : d.sbp}
                dbp={d.dbp == null ? 0 : d.dbp}
                level={lv.sbp}
                trend={trendArr("sbp")}
                accent={accent}
                k={k}
              />
            </div>
            {showArt && (
              <div className="flex-1 min-w-0">
                <IbpBox sbp={d.ibpS} dbp={d.ibpD} level={lv.sbp} trend={trendArr("sbp")} />
              </div>
            )}
          </div>
          <div className="flex gap-2" style={{ flexBasis: "0", flexGrow: 1, minHeight: 0 }}>
            <div className="flex-1 min-w-0">
              <VitalBox
                label="RR"
                unit="/dk"
                color={PARAM.rr.color}
                value={d.rr}
                level={lv.rr}
                low={LIMITS.rr.critLo}
                high={LIMITS.rr.critHi}
                trend={trendArr("rr")}
                icon={<Wind size={15} color={PARAM.rr.color} />}
                k={k}
              />
            </div>
            <div className="flex-1 min-w-0">
              <VitalBox
                label="EtCO₂"
                unit="mmHg"
                color={PARAM.etco2.color}
                value={d.etco2}
                level={lv.etco2}
                low={LIMITS.etco2.critLo}
                high={LIMITS.etco2.critHi}
                trend={trendArr("etco2")}
                icon={<Activity size={15} color={PARAM.etco2.color} />}
                k={k}
              />
            </div>
            <div className="flex-1 min-w-0">
              <VitalBox
                label="Temp"
                unit="°C"
                color={PARAM.temp.color}
                value={d.temp}
                level={lv.temp}
                low={LIMITS.temp.critLo}
                high={LIMITS.temp.critHi}
                trend={[]}
                icon={<Thermometer size={15} color={PARAM.temp.color} />}
                k={k}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- saat formatlayıcıları (Türkçe locale) ---------- */
function fmtClock(d: Date): string {
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
