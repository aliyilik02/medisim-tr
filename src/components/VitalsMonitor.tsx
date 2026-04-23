// ============================================================
// VitalsMonitor — Canlı Hasta Monitörü
// ============================================================
// baseline = ilaçsız temel vitaller (senaryo statik değişimleri dahil)
// live     = farmakoloji tick'in hesapladığı anlık vitaller
// delta    = live - baseline → yön oku + değer gösterimi için
// ============================================================

import type { PatientVitals } from "@/engine";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown } from "lucide-react";
import { MonitorClock } from "./MonitorClock";
import { VitalsSparkline } from "./VitalsSparkline";
import { EcgStrip } from "./EcgStrip";
import { useVitalsHistory } from "@/hooks/useVitalsHistory";

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

const STATUS_COLORS: Record<string, string> = {
  stable: "text-clinical-stable",
  warning: "text-clinical-warning",
  critical: "text-clinical-critical",
};

interface VitalsMonitorProps {
  vitals: PatientVitals;
  baseline?: PatientVitals;
  activeMedCount?: number;
  startedAt?: number;
  ecgPattern?: string;
}

export function VitalsMonitor({
  vitals,
  baseline,
  activeMedCount = 0,
  startedAt,
  ecgPattern,
}: VitalsMonitorProps) {
  const history = useVitalsHistory(vitals);

  return (
    <div className="panel overflow-hidden">
      {/* EKG şeridi — full-width, panel içi üst bant */}
      <div className="bg-ink-900/60 border-b border-ink-700/50 px-1 py-0.5">
        <EcgStrip hr={vitals.hr} pattern={ecgPattern} />
      </div>

      <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Hasta Monitörü
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-ink-50">Vital Bulgular</span>
            {startedAt !== undefined && (
              <MonitorClock startedAt={startedAt} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-2 gap-2">
        <VitalBox
          label="Nabız"
          unit="/dk"
          value={vitals.hr}
          baselineValue={baseline?.hr}
          status={hrStatus(vitals.hr)}
          minShowDelta={2}
          sparklineData={history.hr}
        />
        <VitalBox
          label="TA"
          unit="mmHg"
          valueText={`${vitals.bp_systolic}/${vitals.bp_diastolic}`}
          baselineValue={baseline?.bp_systolic}
          value={vitals.bp_systolic}
          status={bpStatus(vitals.bp_systolic)}
          minShowDelta={3}
          sparklineData={history.sbp}
        />
        <VitalBox
          label="SpO₂"
          unit="%"
          value={vitals.spo2}
          baselineValue={baseline?.spo2}
          status={spo2Status(vitals.spo2)}
          minShowDelta={1}
          sparklineData={history.spo2}
        />
        <VitalBox
          label="Solunum"
          unit="/dk"
          value={vitals.rr}
          baselineValue={baseline?.rr}
          status={rrStatus(vitals.rr)}
          minShowDelta={1}
          sparklineData={history.rr}
        />
        <VitalBox
          label="Ateş"
          unit="°C"
          value={vitals.temp}
          baselineValue={baseline?.temp}
          decimals={1}
          status={tempStatus(vitals.temp)}
          minShowDelta={0.2}
        />
        {vitals.glucose !== undefined && (
          <VitalBox
            label="Glukoz"
            unit="mg/dL"
            value={vitals.glucose}
            baselineValue={baseline?.glucose}
            status={
              vitals.glucose < 70 || vitals.glucose > 250
                ? "critical"
                : vitals.glucose > 180
                ? "warning"
                : "stable"
            }
            minShowDelta={5}
          />
        )}
        {vitals.pain !== undefined && (
          <VitalBox
            label="Ağrı"
            unit="/10"
            value={vitals.pain}
            baselineValue={baseline?.pain}
            status={
              vitals.pain >= 7
                ? "critical"
                : vitals.pain >= 4
                ? "warning"
                : "stable"
            }
            minShowDelta={1}
          />
        )}
        {vitals.gcs !== undefined && (
          <VitalBox
            label="GKS"
            unit=""
            value={vitals.gcs}
            baselineValue={baseline?.gcs}
            status={
              vitals.gcs <= 8
                ? "critical"
                : vitals.gcs <= 12
                ? "warning"
                : "stable"
            }
            minShowDelta={1}
          />
        )}
      </div>
      </div> {/* .p-5 content wrapper */}
    </div>
  );
}

function VitalBox({
  label,
  unit,
  value,
  valueText,
  baselineValue,
  status,
  decimals = 0,
  minShowDelta = 1,
  sparklineData,
}: {
  label: string;
  unit: string;
  value?: number;
  valueText?: string;
  baselineValue?: number;
  status: "stable" | "warning" | "critical";
  decimals?: number;
  minShowDelta?: number;
  sparklineData?: number[];
}) {
  const displayValue =
    valueText ??
    (value !== undefined ? value.toFixed(decimals) : "—");

  const delta =
    value !== undefined && baselineValue !== undefined
      ? value - baselineValue
      : 0;
  const showDelta = Math.abs(delta) >= minShowDelta;
  const deltaDir: "up" | "down" | null = showDelta
    ? delta > 0
      ? "up"
      : "down"
    : null;

  return (
    <div className="panel-inset p-3 relative">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
          {label}
        </span>
        {status !== "stable" && (
          <span
            className={cn(
              "font-mono text-[9px] uppercase tracking-wider",
              STATUS_COLORS[status]
            )}
          >
            {status === "warning" ? "uyarı" : "kritik"}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className={cn(
            "vital-display text-2xl font-semibold tabular-nums",
            STATUS_COLORS[status]
          )}
        >
          {displayValue}
        </span>
        <span className="font-mono text-[10px] text-ink-400">{unit}</span>

        {deltaDir && (
          <span
            className={cn(
              "ml-auto flex items-center gap-0.5 font-mono text-[10px]",
              deltaDir === "up"
                ? "text-clinical-warning"
                : "text-clinical-info"
            )}
            title={`Baseline: ${baselineValue?.toFixed(decimals)}`}
          >
            {deltaDir === "up" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {Math.abs(delta).toFixed(decimals)}
          </span>
        )}
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <div className="mt-1.5">
          <VitalsSparkline data={sparklineData} status={status} width={80} height={18} />
        </div>
      )}
    </div>
  );
}
