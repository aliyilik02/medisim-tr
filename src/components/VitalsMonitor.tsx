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
function bpStatus(systolic: number): "stable" | "warning" | "critical" {
  if (systolic < 90 || systolic > 180) return "critical";
  if (systolic < 100 || systolic > 160) return "warning";
  return "stable";
}
function spo2Status(spo2: number): "stable" | "warning" | "critical" {
  if (spo2 < 90) return "critical";
  if (spo2 < 95) return "warning";
  return "stable";
}
function rrStatus(rr: number): "stable" | "warning" | "critical" {
  if (rr < 8 || rr > 30) return "critical";
  if (rr < 12 || rr > 20) return "warning";
  return "stable";
}
function tempStatus(t: number): "stable" | "warning" | "critical" {
  if (t < 35 || t > 39.5) return "critical";
  if (t < 36 || t > 38) return "warning";
  return "stable";
}

const STATUS_RING: Record<string, string> = {
  stable: "ring-clinical-stable/30",
  warning: "ring-clinical-warning/40",
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
    <div className="bg-black rounded-xl border border-ink-700/60 overflow-hidden shadow-[0_0_60px_rgba(0,255,128,0.04)]">
      {/* ÜST BAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-ink-900 to-black border-b border-ink-700/60">
        <div className="flex items-center gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
            Hasta Monitörü
          </div>
          {startedAt !== undefined && <MonitorClock startedAt={startedAt} />}
        </div>
        <div className="flex items-center gap-3">
          {activeMedCount > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-brand-light px-1.5 py-0.5 rounded bg-brand/10 border border-brand/30">
              {activeMedCount} ilaç aktif
            </span>
          )}
          <span className="pulse-dot" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-clinical-stable">
            Canlı
          </span>
        </div>
      </div>

      {/* DALGA ŞERİTLERİ */}
      <div className="bg-black">
        <div className="border-b border-ink-800/60">
          <EcgStrip hr={vitals.hr} pattern={ecgPattern} ecgParams={ecgParams} />
        </div>
        <WaveStrip
          rate={vitals.hr}
          sampler={samplePleth}
          color="#22d3ee"
          label="SpO₂ · PLETH"
          ctx={sampleCtx}
          height={52}
        />
        <WaveStrip
          rate={vitals.hr}
          sampler={sampleArt}
          color="#ef4444"
          label="ART"
          ctx={sampleCtx}
          height={52}
        />
        <WaveStrip
          rate={vitals.rr}
          sampler={sampleResp}
          color="#facc15"
          label="RESP"
          ctx={sampleCtx}
          height={48}
        />
      </div>

      {/* SAYISAL DEĞERLER */}
      <div className="bg-black p-4 space-y-3">
        {/* Birinci satır — HR & SpO2 */}
        <div className="grid grid-cols-2 gap-3">
          <NumericTile
            label="HR"
            unit="bpm"
            color="#00ff66"
            value={vitals.hr}
            baselineValue={baseline?.hr}
            status={hrStatus(vitals.hr)}
            big
          />
          <NumericTile
            label="SpO₂"
            unit="%"
            color="#22d3ee"
            value={vitals.spo2}
            baselineValue={baseline?.spo2}
            status={spo2Status(vitals.spo2)}
            big
          />
        </div>

        {/* İkinci satır — NIBP & RR */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-lg bg-ink-950/80 border border-ink-800 px-3 py-2 ring-1",
              STATUS_RING[bpStatus(vitals.bp_systolic)]
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                NIBP
              </span>
              <span className="font-mono text-[9px] text-ink-500">mmHg</span>
            </div>
            <div
              className="font-mono font-bold tabular-nums leading-none mt-1"
              style={{ color: "#ef4444" }}
            >
              <span className="text-3xl">{vitals.bp_systolic}</span>
              <span className="text-xl text-ink-500 mx-0.5">/</span>
              <span className="text-2xl">{vitals.bp_diastolic}</span>
            </div>
            <div className="font-mono text-[10px] text-ink-400 mt-0.5">
              MAP <span className="text-ink-200">{map}</span>
            </div>
          </div>
          <NumericTile
            label="RR"
            unit="/dk"
            color="#facc15"
            value={vitals.rr}
            baselineValue={baseline?.rr}
            status={rrStatus(vitals.rr)}
          />
        </div>

        {/* Üçüncü satır — Temp + ekstra */}
        <div className="grid grid-cols-2 gap-3">
          <NumericTile
            label="TEMP"
            unit="°C"
            color="#ffffff"
            value={vitals.temp}
            baselineValue={baseline?.temp}
            decimals={1}
            status={tempStatus(vitals.temp)}
          />
          {vitals.glucose !== undefined ? (
            <NumericTile
              label="GLUKOZ"
              unit="mg/dL"
              color="#fb7185"
              value={vitals.glucose}
              baselineValue={baseline?.glucose}
              status={
                vitals.glucose < 70 || vitals.glucose > 250
                  ? "critical"
                  : vitals.glucose > 180
                  ? "warning"
                  : "stable"
              }
            />
          ) : vitals.pain !== undefined ? (
            <NumericTile
              label="AĞRI"
              unit="/10"
              color="#a78bfa"
              value={vitals.pain}
              baselineValue={baseline?.pain}
              status={
                vitals.pain >= 7
                  ? "critical"
                  : vitals.pain >= 4
                  ? "warning"
                  : "stable"
              }
            />
          ) : vitals.gcs !== undefined ? (
            <NumericTile
              label="GKS"
              unit=""
              color="#a78bfa"
              value={vitals.gcs}
              baselineValue={baseline?.gcs}
              status={
                vitals.gcs <= 8
                  ? "critical"
                  : vitals.gcs <= 12
                  ? "warning"
                  : "stable"
              }
            />
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

interface NumericTileProps {
  label: string;
  unit: string;
  color: string;
  value: number;
  baselineValue?: number;
  status: "stable" | "warning" | "critical";
  decimals?: number;
  big?: boolean;
}

function NumericTile({
  label,
  unit,
  color,
  value,
  baselineValue,
  status,
  decimals = 0,
  big = false,
}: NumericTileProps) {
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
  const delta = baselineValue !== undefined ? value - baselineValue : 0;
  const showDelta = Math.abs(delta) >= (decimals > 0 ? 0.2 : 1);

  return (
    <div
      className={cn(
        "rounded-lg bg-ink-950/80 border border-ink-800 px-3 py-2 ring-1",
        STATUS_RING[status]
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
          {label}
        </span>
        <span className="font-mono text-[9px] text-ink-500">{unit}</span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <span
          className={cn(
            "font-mono font-bold tabular-nums leading-none",
            big ? "text-5xl" : "text-3xl"
          )}
          style={{ color }}
        >
          {formatted}
        </span>
        {showDelta && (
          <span className="flex items-center gap-0.5 font-mono text-[10px] text-ink-400 mb-0.5">
            {delta > 0 ? (
              <ArrowUp className="w-2.5 h-2.5" />
            ) : (
              <ArrowDown className="w-2.5 h-2.5" />
            )}
            {Math.abs(delta).toFixed(decimals)}
          </span>
        )}
      </div>
    </div>
  );
}
