import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Waves, Droplet, Scissors } from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { CompactVitalsHUD } from "@/components/patient-3d/CompactVitalsHUD";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { DialogChat } from "@/components/dialog/DialogChat";
import { SCENARIOS } from "@/data/scenarios";
import type { ActionRef } from "@/engine/types";

// ============================================================
// PatientDialog3DPage — Sprint B.2 + B.3 + B.4 entegre demo
// ============================================================
// 3D anatomik model + AI hasta diyalog + Vital HUD + Cilt kesim.
// Route: /dialog-3d-demo
//
// B.2: Gemini hasta diyaloğu (sağ panel) + mock lipsync (3D shader).
// B.3: Sağ üst CompactVitalsHUD (PALS yaş bazlı + 12-Lead modal).
// B.4: Sol alt Cilt Kesim slider — iç organlar (kalp/akciğer/karaciğer/...)
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
  const [skinClipLevel, setSkinClipLevel] = useState(1.0); // 1=kapalı, 0=tüm açık

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
            Sprint B.2-B.4 · 3D + AI + Vital + Anatomi
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
            skinClipLevel={skinClipLevel}
            organVitals={{
              hr: scenario.initial_vitals.hr,
              rr: scenario.initial_vitals.rr,
            }}
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

          {/* B.3: Vital HUD sağ üst */}
          <div className="absolute top-4 right-4">
            <CompactVitalsHUD
              vitals={scenario.initial_vitals}
              patientAge={scenario.patient.age}
              ecgPattern={scenario.ekg_pattern}
            />
          </div>

          {/* B.4: Cilt Kesim slider sol alt */}
          <div
            className="absolute bottom-4 left-4 bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-lg p-3 w-[240px]"
            data-testid="skin-clip-control"
          >
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="w-3.5 h-3.5 text-brand" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand">
                Cilt Kesim
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-400">
                {Math.round((1 - skinClipLevel) * 100)}% açık
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={skinClipLevel}
              onChange={(e) => setSkinClipLevel(parseFloat(e.target.value))}
              className="w-full accent-brand"
              aria-label="Cilt kesim seviyesi"
            />
            <div className="flex justify-between font-mono text-[8px] text-ink-500 mt-1">
              <span>← Tüm aç</span>
              <span>Kapalı →</span>
            </div>
          </div>
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
