import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";
import {
  ANIMATED_MODELS,
  ANIMATED_VARIANTS,
  CLIP_LABELS,
  type PatientClip,
} from "@/components/patient-3d/AnimatedPatientModel";
import type { PatientVariant } from "@/components/patient-3d/patientModels";

// Yatak senaryolarında ayakta "idle" klibini gizle (supine sahne).
const HIDDEN_BED_CLIPS: PatientClip[] = ["idle"];

// Faz 2 — Klinik Sahne demo: supine animasyonlu hasta + acil servis odası.
export function Faz2DemoPage() {
  const [variant, setVariant] = useState<PatientVariant>("female-adult");
  const [clip, setClip] = useState<PatientClip>("laying_idle");
  const [speaking, setSpeaking] = useState(false);

  const clips = (ANIMATED_MODELS[variant]?.clips ?? []).filter(
    (c) => !HIDDEN_BED_CLIPS.includes(c),
  );

  const onVariant = (v: PatientVariant) => {
    setVariant(v);
    const vc = (ANIMATED_MODELS[v]?.clips ?? []).filter((c) => !HIDDEN_BED_CLIPS.includes(c));
    if (!vc.includes(clip)) setClip(vc[0] ?? "laying_idle");
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
        <PatientRoomScene variant={variant} clip={clip} speaking={speaking} />

        {/* Varyant seçici */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
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

        {/* Klip seçici */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md max-w-[92%]">
          {clips.map((c) => (
            <button
              key={c}
              onClick={() => setClip(c)}
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
