import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import { DialogChat } from "@/components/dialog/DialogChat";

// Sprint B.2 erken — standalone diyalog demo.
// Route: /dialog-demo
// Senaryo seç → DialogChat ile mock AI hasta ile konuş.

export function DialogDemoPage() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-50">
      {/* Senaryo seçici şerit */}
      <div className="border-b border-ink-700/50 px-6 py-2 flex items-center gap-3 bg-ink-900/40">
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Çıkış
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Senaryo:
        </div>
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="bg-ink-900 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:border-brand/50 focus:outline-none"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
          {scenario.specialty} · zorluk {scenario.difficulty}
        </div>
      </div>

      {/* Dialog chat ana alan */}
      <div className="flex-1 min-h-0">
        <DialogChat key={scenarioId} scenario={scenario} />
      </div>
    </div>
  );
}
