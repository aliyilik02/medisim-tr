import type { PatientRegion } from "./regions";

interface Props {
  region: PatientRegion | null;
  onClose: () => void;
}

export function InspectionPanel({ region, onClose }: Props) {
  if (!region) return null;

  return (
    <aside
      data-testid="patient-3d-inspection-panel"
      className="absolute top-4 right-4 w-[300px] h-[200px] bg-ink-900/95 border border-ink-700/70 rounded-lg p-4 backdrop-blur-md shadow-xl flex flex-col"
    >
      <header className="flex items-start justify-between gap-2 border-b border-ink-700/50 pb-2 mb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand">
            Bölge
          </div>
          <h3 className="font-display text-base text-ink-50 leading-tight">
            {region.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Paneli kapat"
          className="text-ink-400 hover:text-ink-100 transition font-mono text-xs px-1"
        >
          ×
        </button>
      </header>

      <div className="flex-1 text-sm text-ink-300 leading-relaxed">
        {region.placeholderNote}
      </div>

      <footer className="mt-2 pt-2 border-t border-ink-700/40 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-500 flex items-center justify-between">
        <span>id: {region.id}</span>
        <span>{region.side}</span>
      </footer>
    </aside>
  );
}
