// ============================================================
// TwelveLeadEcg — Sprint B.3.1 — 12-derivasyon EKG grid
// ============================================================
// 4 sıra × 3 sütun grid:
//   Sıra 1: I, aVR, V1, V4
//   Sıra 2: II, aVL, V2, V5
//   Sıra 3: III, aVF, V3, V6
//
// Her lead için EcgStrip ile aynı pattern, lead-spesifik amplitude scale.
// aVR genelde invert (negatif QRS), V1-V3 küçük R/derin S, V4-V6 büyük R.
// STEMI lokalizasyonu lead'lere göre değişir (anterior V1-V4, inferior II/III/aVF vs).
//
// Sade demo amaçlı; klinik doğruluk için Pulse Engine + ECG synthesis gerekir.
// ============================================================

import { EcgStrip } from "./EcgStrip";
import type { EcgEffect } from "@/engine/pharmacology/types";

export interface TwelveLeadEcgProps {
  hr: number;
  pattern?: string;
  ecgParams?: EcgEffect;
}

type LeadName =
  | "I" | "II" | "III"
  | "aVR" | "aVL" | "aVF"
  | "V1" | "V2" | "V3" | "V4" | "V5" | "V6";

interface LeadConfig {
  name: LeadName;
  label: string;
  /** Vertical scale 0-1 (1 = full amplitude). */
  scale: number;
  /** Y eksen invert (aVR için true). */
  invert: boolean;
  /** Anatomik lokalizasyon TR. */
  region: string;
}

// Standart lead konfigürasyonu (klinik 12-lead EKG normal pattern):
// Bu sadeleştirme — gerçek 12-lead axis vektörü hesabı kompleks.
const LEADS: LeadConfig[] = [
  // Sıra 1 (üst): I — aVR — V1 — V4
  { name: "I",   label: "I",   scale: 1.0, invert: false, region: "Lateral" },
  { name: "aVR", label: "aVR", scale: 0.8, invert: true,  region: "Sağ atrium" },
  { name: "V1",  label: "V1",  scale: 0.6, invert: false, region: "Septum" },
  { name: "V4",  label: "V4",  scale: 1.2, invert: false, region: "Apex (LV)" },
  // Sıra 2: II — aVL — V2 — V5
  { name: "II",  label: "II",  scale: 1.1, invert: false, region: "Inferior" },
  { name: "aVL", label: "aVL", scale: 0.7, invert: false, region: "Yüksek lateral" },
  { name: "V2",  label: "V2",  scale: 0.7, invert: false, region: "Septum/RV" },
  { name: "V5",  label: "V5",  scale: 1.3, invert: false, region: "Lateral LV" },
  // Sıra 3: III — aVF — V3 — V6
  { name: "III", label: "III", scale: 0.9, invert: false, region: "Inferior" },
  { name: "aVF", label: "aVF", scale: 0.95, invert: false, region: "Inferior" },
  { name: "V3",  label: "V3",  scale: 0.9, invert: false, region: "Anterior" },
  { name: "V6",  label: "V6",  scale: 1.3, invert: false, region: "Lateral LV" },
];

export function TwelveLeadEcg({ hr, pattern = "normal", ecgParams }: TwelveLeadEcgProps) {
  return (
    <div
      data-testid="twelve-lead-ecg"
      className="grid grid-cols-4 gap-1.5 bg-black p-3 rounded-lg border border-ink-700/60 w-full"
    >
      {LEADS.map((lead) => (
        <LeadCell key={lead.name} lead={lead} hr={hr} pattern={pattern} ecgParams={ecgParams} />
      ))}
    </div>
  );
}

interface LeadCellProps {
  lead: LeadConfig;
  hr: number;
  pattern: string;
  ecgParams?: EcgEffect;
}

function LeadCell({ lead, hr, pattern, ecgParams }: LeadCellProps) {
  return (
    <div className="bg-ink-950/80 rounded border border-ink-800 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-0.5 bg-ink-900/60 border-b border-ink-800/60">
        <span className="font-mono text-[10px] font-bold text-brand-light tracking-wide">
          {lead.label}
        </span>
        <span className="font-mono text-[8px] text-ink-500 uppercase tracking-[0.1em]">
          {lead.region}
        </span>
      </div>
      <div
        className="h-16"
        style={{
          transform: `scaleY(${lead.invert ? -lead.scale : lead.scale})`,
          transformOrigin: "center",
        }}
      >
        <EcgStrip hr={hr} pattern={pattern} ecgParams={ecgParams} />
      </div>
    </div>
  );
}
