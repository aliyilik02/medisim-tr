import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Waves } from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";

// Sprint A — Standalone 3D demo. Senaryo motoruna bağlı değil.
// Sadece doğrudan URL ile erişilir: /3d-demo

export function PatientBody3DDemoPage() {
  const [breathing, setBreathing] = useState(true);

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
            Sprint A · Standalone Demo
          </div>
          <h1 className="font-display text-lg leading-tight">
            Patient Body 3D <span className="text-ink-500">— teknik iskelet</span>
          </h1>
        </div>
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
        <PatientBody3D regions={DEFAULT_REGIONS} breathing={breathing} />
      </div>

      <footer className="border-t border-ink-700/50 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 flex items-center justify-between">
        <span>Bölge konumları placeholder · Sprint A sonrası klinik review</span>
        <span>5 bölge · {breathing ? "60fps target" : "demand frameloop"}</span>
      </footer>
    </div>
  );
}
