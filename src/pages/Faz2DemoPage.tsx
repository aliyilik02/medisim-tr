import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";
import {
  ANIMATED_MODELS,
  ANIMATED_VARIANTS,
  CLIP_LABELS,
  NON_SUPINE_CLIPS,
  type PatientClip,
} from "@/components/patient-3d/AnimatedPatientModel";
import type { PatientVariant } from "@/components/patient-3d/patientModels";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import type { PatientVitals } from "@/engine";
import { vitalsToClip, resolveClipForVariant } from "@/clinical/clip-mapping";
import { vitalsToVisual } from "@/clinical/visual-mapping";

const V: PatientVitals = { hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 98, temp: 36.8, rr: 14, pain: 0 };

// Klinik durum preset'leri — vital değişimi otomatik klip+ten tonu sürer
// (vitalsToClip + vitalsToVisual). Senaryo motoru klip tetiklemesinin demosu.
const CLINICAL_PRESETS: { label: string; vitals: PatientVitals }[] = [
  { label: "Normal", vitals: V },
  { label: "Hipoksi", vitals: { ...V, spo2: 82, rr: 28 } },
  { label: "Solunum sıkıntısı", vitals: { ...V, rr: 32, spo2: 90 } },
  { label: "Şiddetli ağrı", vitals: { ...V, pain: 8, hr: 110 } },
  { label: "Şok", vitals: { ...V, bp_systolic: 78, hr: 124, spo2: 92 } },
];

// Faz 2 — Klinik Sahne demo: supine animasyonlu hasta + acil servis odası.
export function Faz2DemoPage() {
  const [variant, setVariant] = useState<PatientVariant>("female-adult");
  const [clip, setClip] = useState<PatientClip>("laying_idle");
  const [speaking, setSpeaking] = useState(false);
  const [skinTint, setSkinTint] = useState<SkinTint>("normal");
  const [presetLabel, setPresetLabel] = useState<string | null>(null);

  const clips = (ANIMATED_MODELS[variant]?.clips ?? []).filter(
    (c) => !NON_SUPINE_CLIPS.includes(c),
  );

  const onVariant = (v: PatientVariant) => {
    setVariant(v);
    const vc = (ANIMATED_MODELS[v]?.clips ?? []).filter((c) => !NON_SUPINE_CLIPS.includes(c));
    if (!vc.includes(clip)) setClip(vc[0] ?? "laying_idle");
  };

  // Klinik preset → vital → klip (fallback ile varyanta uydur) + ten tonu
  const onPreset = (p: { label: string; vitals: PatientVitals }) => {
    setPresetLabel(p.label);
    const allClips = ANIMATED_MODELS[variant]?.clips ?? [];
    const ideal = vitalsToClip(p.vitals, { speaking });
    setClip(resolveClipForVariant(ideal, allClips));
    setSkinTint(vitalsToVisual(p.vitals).skinTint);
  };

  // Manuel klip seçimi preset'i iptal eder
  const onManualClip = (c: PatientClip) => {
    setClip(c);
    setPresetLabel(null);
  };

  return (
    <div className="fixed inset-0 bg-ink-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-ink-700/50 bg-ink-950/90">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-ink-400 hover:text-ink-100 transition" aria-label="Ana sayfa">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Faz 2 — Klinik Sahne (Acil Servis)
          </span>
        </div>
        <span className="font-mono text-[9px] text-ink-500">
          Eğitim amaçlıdır, klinik karar destek değildir
        </span>
      </header>
      <div className="flex-1 min-h-0 relative">
        <PatientRoomScene variant={variant} clip={clip} speaking={speaking} skinTint={skinTint} />

        {/* Varyant seçici + klinik durum preset */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <div className="flex gap-1.5 px-2 py-1.5 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
            {ANIMATED_VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => onVariant(v)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                  variant === v
                    ? "bg-brand/20 text-brand-light border border-brand/40"
                    : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                }`}
              >
                {ANIMATED_MODELS[v]?.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center px-2 py-1.5 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md max-w-[92vw]">
            <span className="font-mono text-[9px] text-ink-500 self-center px-1">KLİNİK DURUM →</span>
            {CLINICAL_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onPreset(p)}
                className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-[0.06em] transition ${
                  presetLabel === p.label
                    ? "bg-clinical-warning/20 text-clinical-warning border border-clinical-warning/40"
                    : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Klip seçici */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md max-w-[92%]">
          {clips.map((c) => (
            <button
              key={c}
              onClick={() => onManualClip(c)}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                clip === c
                  ? "bg-brand/20 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {CLIP_LABELS[c]}
            </button>
          ))}
          <span className="w-px h-5 bg-ink-700/60 mx-1 self-center" />
          <button
            onClick={() => setSpeaking((s) => !s)}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
              speaking
                ? "bg-clinical-info/20 text-clinical-info border border-clinical-info/40"
                : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
            }`}
          >
            {speaking ? "Konuşuyor ●" : "Konuş"}
          </button>
        </div>
      </div>
    </div>
  );
}
