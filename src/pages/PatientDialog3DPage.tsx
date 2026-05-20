import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Waves, Droplet } from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { DialogChat } from "@/components/dialog/DialogChat";
import { SCENARIOS } from "@/data/scenarios";
import type { ActionRef } from "@/engine/types";

// ============================================================
// PatientDialog3DPage — Sprint B.2 entegre demo
// ============================================================
// 3D anatomik model + AI hasta diyalog yan yana.
// Hasta yanıt verirken AnatomicPatientModel shader'da ağız bölgesi
// oscillation (mock lipsync). RPM avatar geldiğinde gerçek
// mouthOpen blendshape'e geçilecek.
// Route: /dialog-3d-demo
// ============================================================

const SKIN_TINT_CYCLE: SkinTint[] = ["normal", "cyanosis", "jaundice", "pallor"];
const SKIN_TINT_LABEL: Record<SkinTint, string> = {
  normal: "Normal",
  cyanosis: "Siyanoz",
  jaundice: "İkter",
  pallor: "Solgun",
};

export function PatientDialog3DPage() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [breathing, setBreathing] = useState(true);
  const [skinTint, setSkinTint] = useState<SkinTint>("normal");
  const [speaking, setSpeaking] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  const cycleSkinTint = () => {
    const idx = SKIN_TINT_CYCLE.indexOf(skinTint);
    setSkinTint(SKIN_TINT_CYCLE[(idx + 1) % SKIN_TINT_CYCLE.length]);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProcedureComplete = (_action: ActionRef) => {
    // İleride scenario engine'e iletilebilir
  };

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-50 overflow-hidden">
      {/* Header */}
      <header className="border-b border-ink-700/50 px-6 py-3 flex items-center gap-3 shrink-0">
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Çıkış
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Sprint B.2 · 3D + AI Hasta Diyaloğu
          </div>
          <h1 className="font-display text-base leading-tight truncate">
            {scenario.title}
          </h1>
        </div>
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="bg-ink-900 border border-ink-700 rounded px-2 py-1.5 text-xs text-ink-100 focus:border-brand/50 focus:outline-none max-w-[200px]"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={cycleSkinTint}
          className="px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border bg-ink-900 border-ink-700 text-ink-300 hover:text-ink-100 transition flex items-center gap-2 shrink-0"
          title="Cilt tonu cycle"
        >
          <Droplet className="w-3.5 h-3.5" />
          {SKIN_TINT_LABEL[skinTint]}
        </button>
        <button
          type="button"
          onClick={() => setBreathing((b) => !b)}
          className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border transition flex items-center gap-2 shrink-0 ${
            breathing
              ? "bg-brand/15 border-brand/50 text-brand-light"
              : "bg-ink-900 border-ink-700 text-ink-400 hover:text-ink-100"
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          Solunum {breathing ? "açık" : "kapalı"}
        </button>
      </header>

      {/* Ana içerik — yan yana 2 panel */}
      <div className="flex-1 flex min-h-0">
        {/* Sol: 3D Model */}
        <div className="flex-1 relative min-w-0 border-r border-ink-700/50">
          <PatientBody3D
            regions={DEFAULT_REGIONS}
            breathing={breathing}
            skinTint={skinTint}
            speaking={speaking}
            onProcedureComplete={handleProcedureComplete}
          />
          {/* Speaking indicator */}
          {speaking && (
            <div
              className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-brand/20 border border-brand/40 backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-light"
              data-testid="speaking-indicator"
            >
              <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              Hasta konuşuyor
            </div>
          )}
        </div>

        {/* Sağ: Dialog Chat */}
        <div className="w-[420px] shrink-0 flex flex-col">
          <DialogChat
            key={scenarioId}
            scenario={scenario}
            onSpeakingChange={setSpeaking}
          />
        </div>
      </div>
    </div>
  );
}
