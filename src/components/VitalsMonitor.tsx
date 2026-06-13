import type { PatientVitals } from "@/engine";
import type { EcgEffect } from "@/engine/pharmacology/types";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown } from "lucide-react";
import { MonitorClock } from "./MonitorClock";
import { EcgStrip } from "./EcgStrip";
import { WaveStrip } from "./WaveStrip";
import { samplePleth, sampleArt, sampleResp } from "@/lib/waveformSamplers";

function hrStatus(hr: number): "stable" | "warning" | "critical" {
  if (hr < 50 || hr > 140) return "critical";
  if (hr < 60 || hr > 100) return "warning";
  return "stable";
}
function bpStatus(s: number): "stable" | "warning" | "critical" {
  if (s < 90 || s > 180) return "critical";
  if (s < 100 || s > 160) return "warning";
  return "stable";
}
function spo2Status(v: number): "stable" | "warning" | "critical" {
  if (v < 90) return "critical";
  if (v < 95) return "warning";
  return "stable";
}
function rrStatus(v: number): "stable" | "warning" | "critical" {
  if (v < 8 || v > 30) return "critical";
  if (v < 12 || v > 20) return "warning";
  return "stable";
}
function tempStatus(t: number): "stable" | "warning" | "critical" {
  if (t < 35 || t > 39.5) return "critical";
  if (t < 36 || t > 38) return "warning";
  return "stable";
}

const STATUS_RING: Record<string, string> = {
  stable:   "ring-clinical-stable/25",
  warning:  "ring-clinical-warning/40",
  critical: "ring-clinical-critical/50 animate-pulse",
};

interface VitalsMonitorProps {
  vitals: PatientVitals;
  baseline?: PatientVitals;
  activeMedCount?: number;
  startedAt?: number;
  ecgPattern?: string;
  ecgParams?: EcgEffect;
}

export function VitalsMonitor({
  vitals,
  baseline,
  activeMedCount = 0,
  startedAt,
  ecgPattern,
  ecgParams,
}: VitalsMonitorProps) {
  const sampleCtx = {
    hr: vitals.hr,
    rr: vitals.rr,
    sbp: vitals.bp_systolic,
    dbp: vitals.bp_diastolic,
  };

  const map = Math.round(
    vitals.bp_diastolic + (vitals.bp_systolic - vitals.bp_diastolic) / 3
  );

  return (
    <div className="bg-black rounded-xl border border-ink-700/60 overflow-hidden">
      {/* Üst bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-ink-700/60 bg-ink-950/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">Monitor</span>
          {startedAt !== undefined && <MonitorClock startedAt={startedAt} />}
        </div>
        <div className="flex items-center gap-2">
          {activeMedCount > 0 && (
            <span className="font-mono text-[8px] uppercase tracking-wider text-brand-light px-1 py-0.5 rounded bg-brand/10 border border-brand/20">
              {activeMedCount} ilaç
            </span>
          )}
          <span className="pulse-dot" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-clinical-stable">Canlı</span>
        </div>
      </div>

      {/* Dalga şeritleri */}
      <div className="bg-black">
        {/* ECG — EcgStrip'e dokunulmaz, HR overlay eklenir */}
        <div className="relative border-b border-ink-800/50">
          <EcgStrip hr={vitals.hr} pattern={ecgPattern} ecgParams={ecgParams} />
          <div className="absolute left-1.5 top-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#00E676] pointer-events-none z-10">
            II
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs font-bold tabular-nums text-[#00E676] pointer-events-none z-10">
            {Math.round(vitals.hr)} bpm
          </div>
        </div>
        <WaveStrip
          rate={vitals.hr}
          sampler={samplePleth}
          color="#22d3ee"
          label="SpO₂"
          valueLabel={`${Math.round(vitals.spo2)}%`}
          ctx={sampleCtx}
          height={40}
        />
        <WaveStrip
          rate={vitals.hr}
          sampler={sampleArt}
          color="#ef4444"
          label="ART"
          valueLabel={`${vitals.bp_systolic}/${vitals.bp_diastolic}`}
          ctx={sampleCtx}
          height={40}
        />
        <WaveStrip
          rate={vitals.rr}
          sampler={sampleResp}
          color="#facc15"
          label="RESP"
          valueLabel={`${Math.round(vitals.rr)}/dk`}
          ctx={sampleCtx}
          height={36}
        />
      </div>

      {/* Sayısal değerler — 2 sütun compact grid */}
      <div className="bg-black p-2 grid grid-cols-2 gap-1.5">
        <Tile
          label="HR"
          unit="bpm"
          color="#00E676"
          value={vitals.hr}
          baselineValue={baseline?.hr}
          status={hrStatus(vitals.hr)}
          big
        />
        <Tile
          label="SpO₂"
          unit="%"
          color="#22d3ee"
          value={vitals.spo2}
          baselineValue={baseline?.spo2}
          status={spo2Status(vitals.spo2)}
          big
        />

        {/* TA — tam genişlik */}
        <div
          className={cn(
            "col-span-2 rounded-md bg-ink-950/80 border border-ink-800 px-2.5 py-1.5 ring-1",
            STATUS_RING[bpStatus(vitals.bp_systolic)]
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-ink-400">NIBP</span>
            <span className="font-mono text-[8px] text-ink-500">mmHg · MAP {map}</span>
          </div>
          <div className="font-mono font-bold tabular-nums leading-none mt-0.5" style={{ color: "#ef4444" }}>
            <span className="text-2xl">{vitals.bp_systolic}</span>
            <span className="text-base text-ink-500 mx-0.5">/</span>
            <span className="text-xl">{vitals.bp_diastolic}</span>
          </div>
        </div>

        <Tile
          label="RR"
          unit="/dk"
          color="#facc15"
          value={vitals.rr}
          baselineValue={baseline?.rr}
          status={rrStatus(vitals.rr)}
        />
        <Tile
          label="TEMP"
          unit="°C"
          color="#ffffff"
          value={vitals.temp}
          baselineValue={baseline?.temp}
          decimals={1}
          status={tempStatus(vitals.temp)}
        />

        {vitals.glucose !== undefined && (
          <Tile
            label="GLU"
            unit="mg/dL"
            color="#fb7185"
            value={vitals.glucose}
            baselineValue={baseline?.glucose}
            status={
              vitals.glucose < 70 || vitals.glucose > 250
                ? "critical"
                : vitals.glucose > 180 ? "warning" : "stable"
            }
          />
        )}
        {vitals.pain !== undefined && (
          <Tile
            label="AĞRI"
            unit="/10"
            color="#a78bfa"
            value={vitals.pain}
            baselineValue={baseline?.pain}
            status={vitals.pain >= 7 ? "critical" : vitals.pain >= 4 ? "warning" : "stable"}
          />
        )}
        {vitals.gcs !== undefined && (
          <Tile
            label="GKS"
            unit=""
            color="#a78bfa"
            value={vitals.gcs}
            baselineValue={baseline?.gcs}
            status={vitals.gcs <= 8 ? "critical" : vitals.gcs <= 12 ? "warning" : "stable"}
          />
        )}
      </div>
    </div>
  );
}

interface TileProps {
  label: string;
  unit: string;
  color: string;
  value: number;
  baselineValue?: number;
  status: "stable" | "warning" | "critical";
  decimals?: number;
  big?: boolean;
}

function Tile({ label, unit, color, value, baselineValue, status, decimals = 0, big = false }: TileProps) {
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
  const delta = baselineValue !== undefined ? value - baselineValue : 0;
  const showDelta = Math.abs(delta) >= (decimals > 0 ? 0.2 : 1);

  return (
    <div className={cn("rounded-md bg-ink-950/80 border border-ink-800 px-2.5 py-1.5 ring-1", STATUS_RING[status])}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-ink-400">{label}</span>
        <span className="font-mono text-[8px] text-ink-500">{unit}</span>
      </div>
      <div className="flex items-end justify-between mt-0.5">
        <span
          className={cn("font-mono font-bold tabular-nums leading-none", big ? "text-3xl" : "text-2xl")}
          style={{ color }}
        >
          {formatted}
        </span>
        {showDelta && (
          <span className="flex items-center gap-0.5 font-mono text-[9px] text-ink-400">
            {delta > 0 ? <ArrowUp className="w-2 h-2" /> : <ArrowDown className="w-2 h-2" />}
            {Math.abs(delta).toFixed(decimals)}
          </span>
        )}
      </div>
    </div>
  );
}
