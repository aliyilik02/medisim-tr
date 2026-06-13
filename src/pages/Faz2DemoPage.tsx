import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";

// Faz 2 — Klinik Sahne demo: supine hasta + acil servis odası.
export function Faz2DemoPage() {
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
      <div className="flex-1 min-h-0">
        <PatientRoomScene />
      </div>
    </div>
  );
}
