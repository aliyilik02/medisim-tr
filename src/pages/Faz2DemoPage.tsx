import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";
import type { PatientClip } from "@/components/patient-3d/AnimatedPatientModel";

// Yatak (supine) senaryolarına uygun klipler.
const BED_CLIPS: { id: PatientClip; label: string }[] = [
  { id: "laying_idle", label: "Sakin yatıyor" },
  { id: "talk_gesture", label: "Konuşuyor" },
  { id: "cough_mild", label: "Hafif öksürük" },
  { id: "cough_severe", label: "Şiddetli öksürük" },
  { id: "pain", label: "Ağrı" },
];

// Faz 2 — Klinik Sahne demo: supine animasyonlu hasta + acil servis odası.
export function Faz2DemoPage() {
  const [clip, setClip] = useState<PatientClip>("laying_idle");
  const [speaking, setSpeaking] = useState(false);

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
        <PatientRoomScene clip={clip} speaking={speaking} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
          {BED_CLIPS.map((c) => (
            <button
              key={c.id}
              onClick={() => setClip(c.id)}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                clip === c.id
                  ? "bg-brand/20 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {c.label}
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
