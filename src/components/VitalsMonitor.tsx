import type { PatientVitals } from "@/engine";
import { cn } from "@/lib/cn";

// Vital normal aralıkları — renk kodlaması için
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

export function VitalsMonitor({ vitals }: { vitals: PatientVitals }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Hasta Monitörü
          </div>
          <div className="font-display text-lg text-ink-50">Vital Bulgular</div>
        </div>
        <div className="flex items-center gap-2">
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
          status={hrStatus(vitals.hr)}
        />
        <VitalBox
          label="TA"
          unit="mmHg"
          valueText={`${vitals.bp_systolic}/${vitals.bp_diastolic}`}
          status={bpStatus(vitals.bp_systolic)}
        />
        <VitalBox
          label="SpO₂"
          unit="%"
          value={vitals.spo2}
          status={spo2Status(vitals.spo2)}
        />
        <VitalBox
          label="Solunum"
          unit="/dk"
          value={vitals.rr}
          status={rrStatus(vitals.rr)}
        />
        <VitalBox
          label="Ateş"
          unit="°C"
          value={vitals.temp}
          decimals={1}
          status={tempStatus(vitals.temp)}
        />
        {vitals.glucose !== undefined && (
          <VitalBox
            label="Glukoz"
            unit="mg/dL"
            value={vitals.glucose}
            status={
              vitals.glucose < 70 || vitals.glucose > 250
                ? "critical"
                : vitals.glucose > 180
                ? "warning"
                : "stable"
            }
          />
        )}
        {vitals.pain !== undefined && (
          <VitalBox
            label="Ağrı"
            unit="/10"
            value={vitals.pain}
            status={
              vitals.pain >= 7
                ? "critical"
                : vitals.pain >= 4
                ? "warning"
                : "stable"
            }
          />
        )}
        {vitals.gcs !== undefined && (
          <VitalBox
            label="GKS"
            unit=""
            value={vitals.gcs}
            status={
              vitals.gcs <= 8
                ? "critical"
                : vitals.gcs <= 12
                ? "warning"
                : "stable"
            }
          />
        )}
      </div>
    </div>
  );
}

function VitalBox({
  label,
  unit,
  value,
  valueText,
  status,
  decimals = 0,
}: {
  label: string;
  unit: string;
  value?: number;
  valueText?: string;
  status: "stable" | "warning" | "critical";
  decimals?: number;
}) {
  const displayValue =
    valueText ??
    (value !== undefined ? value.toFixed(decimals) : "—");
  return (
    <div className="panel-inset p-3">
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
            "vital-display text-2xl font-semibold",
            STATUS_COLORS[status]
          )}
        >
          {displayValue}
        </span>
        <span className="font-mono text-[10px] text-ink-400">{unit}</span>
      </div>
    </div>
  );
}
