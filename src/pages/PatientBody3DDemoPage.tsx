import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Waves, Droplet } from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import type { ActionRef } from "@/engine/types";

const SKIN_TINT_CYCLE: SkinTint[] = ["normal", "cyanosis", "jaundice", "pallor"];
const SKIN_TINT_LABEL: Record<SkinTint, string> = {
  normal: "Normal",
  cyanosis: "Siyanoz",
  jaundice: "İkter",
  pallor: "Solgun",
};

// Sprint A — Standalone 3D demo. Senaryo motoruna bağlı değil.
// Sadece doğrudan URL ile erişilir: /3d-demo
// Sprint B.2.1: prosedür callback'leri konsola + alt panele logger.

interface ProcedureLogEntry {
  at: string;
  target: string;
  site: string;
}

export function PatientBody3DDemoPage() {
  const [breathing, setBreathing] = useState(true);
  const [skinTint, setSkinTint] = useState<SkinTint>("normal");
  const [log, setLog] = useState<ProcedureLogEntry[]>([]);

  const cycleSkinTint = () => {
    const idx = SKIN_TINT_CYCLE.indexOf(skinTint);
    setSkinTint(SKIN_TINT_CYCLE[(idx + 1) % SKIN_TINT_CYCLE.length]);
  };

  const handleProcedureComplete = (action: ActionRef) => {
    const entry: ProcedureLogEntry = {
      at: new Date().toLocaleTimeString("tr-TR", { hour12: false }),
      target: action.target_id,
      site: action.site ?? "?",
    };
    setLog((prev) => [entry, ...prev].slice(0, 6));
    // eslint-disable-next-line no-console
    console.log("[3d-demo] procedure complete:", action);
  };

  return (
    <div className="h-screen bg-ink-950 text-ink-50 flex flex-col overflow-hidden">
      <header className="border-b border-ink-700/50 px-6 py-3 flex items-center gap-4">
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Çıkış
        </Link>
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Sprint B.2.1 · Standalone Demo
          </div>
          <h1 className="font-display text-lg leading-tight">
            Patient Body 3D <span className="text-ink-500">— prosedür altyapısı</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={cycleSkinTint}
          className="px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border bg-ink-900 border-ink-700 text-ink-300 hover:text-ink-100 hover:border-ink-500 transition flex items-center gap-2"
          title="Cilt tonu cycle (normal → siyanoz → ikter → solgun)"
        >
          <Droplet className="w-3.5 h-3.5" />
          {SKIN_TINT_LABEL[skinTint]}
        </button>
        <button
          type="button"
          onClick={() => setBreathing((b) => !b)}
          className={`px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border transition flex items-center gap-2 ${
            breathing
              ? "bg-brand/15 border-brand/50 text-brand-light"
              : "bg-ink-900 border-ink-700 text-ink-400 hover:text-ink-100"
          }`}
          aria-pressed={breathing}
        >
          <Waves className="w-3.5 h-3.5" />
          Solunum {breathing ? "açık" : "kapalı"}
        </button>
      </header>

      <div className="flex-1 relative min-h-0">
        <PatientBody3D
          regions={DEFAULT_REGIONS}
          breathing={breathing}
          skinTint={skinTint}
          onProcedureComplete={handleProcedureComplete}
        />

        {log.length > 0 && (
          <aside
            data-testid="procedure-log"
            className="absolute bottom-4 left-4 w-[280px] bg-ink-900/90 border border-ink-700/60 rounded-lg p-3 backdrop-blur-md shadow-xl"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand mb-2">
              Prosedür Log
            </div>
            <ul className="flex flex-col gap-1 font-mono text-[10px] text-ink-300">
              {log.map((entry, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-ink-500">{entry.at}</span>
                  <span className="text-brand-light">{entry.target}</span>
                  <span className="text-ink-400">@ {entry.site}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <footer className="border-t border-ink-700/50 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 flex items-center justify-between">
        <span>Bölge konumları placeholder · Sprint A sonrası klinik review</span>
        <span>
          5 bölge · stetoskop chest-* aktif ·{" "}
          {breathing ? "60fps target" : "demand frameloop"}
        </span>
      </footer>
    </div>
  );
}
