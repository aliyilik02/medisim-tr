// ============================================================
// CompactVitalsHUD — Sprint B.3 — 3D demo overlay
// ============================================================
// Sağ üst köşe küçük kart: HR / BP / SpO2 / RR / Temp + mini EKG.
// Yaş-spesifik PALS alarm threshold (vital-thresholds.ts).
// Senaryo seçildiğinde initial_vitals + patient.age göre dinamik.
// Skill: .claude/skills/vital-signs-hud/SKILL.md
// ============================================================

import type { PatientVitals } from "@/engine";
import {
  evaluateVitals,
  worstVitalStatus,
  getAgeGroup,
  AGE_GROUP_LABEL,
  type VitalStatus,
} from "@/clinical/vital-thresholds";
import { Activity, AlertTriangle, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { EcgStrip } from "@/components/EcgStrip";
import { TwelveLeadEcg } from "@/components/TwelveLeadEcg";
import { PARAM_COLOR, type MonitorParam } from "@/lib/monitorColors";
import { cn } from "@/lib/cn";

interface Props {
  vitals: PatientVitals;
  patientAge: number;
  /** Senaryo ekg_pattern (örn. "stemi", "afib"). EcgStrip'e geçilir. */
  ecgPattern?: string;
  className?: string;
}

// Dış kart çerçevesi — en kötü vital durumuna göre (subtle).
const STATUS_BORDER: Record<VitalStatus, string> = {
  stable: "border-ink-700/60",
  warning: "border-clinical-warning/50",
  critical: "border-clinical-critical/70",
};

// Hücre durum katmanı: parametre rengi sayıda SABİT kalır; durum yalnız
// ring/flash ile gösterilir (Philips/IEC 60601-1-8). reduced-motion → statik ring.
const STATUS_RING: Record<VitalStatus, string> = {
  stable: "ring-1 ring-ink-700/50",
  warning:
    "ring-1 ring-clinical-warning/50 animate-monitor-flash-med motion-reduce:animate-none",
  critical:
    "ring-1 ring-clinical-critical/70 animate-monitor-flash-high motion-reduce:animate-none",
};

export function CompactVitalsHUD({
  vitals,
  patientAge,
  ecgPattern = "normal",
  className,
}: Props) {
  const [showTwelveLead, setShowTwelveLead] = useState(false);
  const statuses = evaluateVitals(vitals, patientAge);
  const worst = worstVitalStatus(statuses);
  const ageGroup = getAgeGroup(patientAge);

  // MAP hesabı
  const map = Math.round(
    vitals.bp_diastolic + (vitals.bp_systolic - vitals.bp_diastolic) / 3,
  );

  return (
    <aside
      data-testid="compact-vitals-hud"
      className={`bg-black/85 backdrop-blur-sm border ${STATUS_BORDER[worst]} rounded-lg p-3 w-[280px] font-mono text-[10px] shadow-xl ${className ?? ""}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-2 pb-1.5 border-b border-ink-700/50">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-brand" />
          <span className="uppercase tracking-[0.18em] text-brand text-[9px]">
            Monitor
          </span>
        </div>
        <span className="text-ink-400 text-[9px]">
          {AGE_GROUP_LABEL[ageGroup]} · {patientAge}y
        </span>
      </header>

      {/* Vital grid 2×3 — sayı = parametre rengi, ring = durum (Philips) */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <VitalCell label="NB" param="hr" value={vitals.hr} unit="/dk" status={statuses.hr} />
        <VitalCell
          label="TA"
          param="bp"
          value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`}
          unit={`MAP ${map}`}
          status={statuses.sbp}
        />
        <VitalCell label="SpO₂" param="spo2" value={vitals.spo2} unit="%" status={statuses.spo2} />
        <VitalCell label="SS" param="rr" value={vitals.rr} unit="/dk" status={statuses.rr} />
        <VitalCell
          label="Sıcaklık"
          param="temp"
          value={vitals.temp.toFixed(1)}
          unit="°C"
          status={statuses.temp}
        />
        {vitals.gcs !== undefined && (
          <VitalCell
            label="GKS"
            param="gcs"
            value={vitals.gcs}
            unit="/15"
            status={vitals.gcs <= 8 ? "critical" : vitals.gcs <= 13 ? "warning" : "stable"}
          />
        )}
      </div>

      {/* Mini EKG strip */}
      <div className="border-t border-ink-700/40 pt-2">
        <div className="text-[8px] uppercase tracking-[0.15em] text-ink-500 mb-1 flex items-center justify-between">
          <span>EKG (Lead II)</span>
          <div className="flex items-center gap-1">
            {ecgPattern !== "normal" && (
              <span className="text-clinical-warning">{ecgPattern}</span>
            )}
            <button
              type="button"
              onClick={() => setShowTwelveLead(true)}
              className="text-ink-400 hover:text-brand-light transition px-1 py-0.5 rounded hover:bg-ink-800 flex items-center gap-1 text-[8px] uppercase tracking-[0.1em]"
              title="12-derivasyon EKG aç"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              12-Lead
            </button>
          </div>
        </div>
        <div className="h-14 bg-black rounded border border-ink-700/40 overflow-hidden">
          <EcgStrip hr={vitals.hr} pattern={ecgPattern} />
        </div>
      </div>

      {/* Critical alarm banner */}
      {worst === "critical" && (
        <div className="mt-2 px-2 py-1 bg-clinical-critical/15 border border-clinical-critical/40 rounded flex items-center gap-1.5 text-clinical-critical text-[9px] uppercase tracking-[0.12em]">
          <AlertTriangle className="w-3 h-3" />
          Kritik vital
        </div>
      )}

      {/* 12-Lead EKG modal */}
      {showTwelveLead && (
        <TwelveLeadModal
          onClose={() => setShowTwelveLead(false)}
          hr={vitals.hr}
          pattern={ecgPattern}
        />
      )}
    </aside>
  );
}

function TwelveLeadModal({
  hr,
  pattern,
  onClose,
}: {
  hr: number;
  pattern: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/95 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
      data-testid="twelve-lead-modal"
    >
      <div
        className="bg-ink-950 border border-ink-700/60 rounded-xl p-6 max-w-6xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
              12-Derivasyon EKG
            </div>
            <h2 className="font-display text-xl text-ink-50">
              HR {hr}/dk · Pattern: {pattern}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 p-2 rounded hover:bg-ink-800 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <TwelveLeadEcg hr={hr} pattern={pattern} />
        <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 text-center">
          Klinik karar destek değildir · Eğitim amaçlı simülasyon
        </div>
      </div>
    </div>
  );
}

interface VitalCellProps {
  label: string;
  param: MonitorParam;
  value: string | number;
  unit: string;
  status: VitalStatus;
}

function VitalCell({ label, param, value, unit, status }: VitalCellProps) {
  return (
    <div className={cn("rounded-md bg-ink-950/80 px-2.5 py-1.5", STATUS_RING[status])}>
      <div className="flex items-baseline justify-between">
        <span className="text-ink-400 text-[8px] uppercase tracking-[0.18em]">{label}</span>
        {status !== "stable" && (
          <span
            className="text-[8px] uppercase tracking-[0.12em] font-bold"
            style={{ color: status === "critical" ? "#EF4444" : "#F59E0B" }}
          >
            {status === "critical" ? "!" : "·"}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between mt-1">
        <span
          className="font-bold tabular-nums leading-none text-[1.7rem]"
          style={{ color: PARAM_COLOR[param] }}
        >
          {value}
        </span>
        <span className="text-ink-500 text-[8px] lowercase mb-1">{unit}</span>
      </div>
    </div>
  );
}
