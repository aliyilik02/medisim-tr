import type { PatientRegion } from "./regions";
import type { ProcedureKind } from "./procedures/types";

// Sprint B.2.1: prosedür kindlerine kullanıcıya dönük etiketleri eşler.
// Yeni prosedür eklenince bu map'e satır eklenir.
const PROCEDURE_LABELS: Record<ProcedureKind, string> = {
  stethoscope: "Stetoskop ile dinle",
  oxygen_mask: "Oksijen maskesi tak",
  defibrillator: "Defibrilatör uygula",
};

interface Props {
  region: PatientRegion | null;
  onClose: () => void;
  /** Sprint B.2.1: prosedür butonu tıklamasında parent'a iletilir. */
  onStartProcedure?: (kind: ProcedureKind, region: PatientRegion) => void;
}

export function InspectionPanel({ region, onClose, onStartProcedure }: Props) {
  if (!region) return null;

  const procedures = region.availableProcedures ?? [];

  return (
    <aside
      data-testid="patient-3d-inspection-panel"
      className="absolute top-4 right-4 w-[300px] bg-ink-900/95 border border-ink-700/70 rounded-lg p-4 backdrop-blur-md shadow-xl flex flex-col"
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

      <div className="text-sm text-ink-300 leading-relaxed mb-3">
        {region.placeholderNote}
      </div>

      {procedures.length > 0 && (
        <div
          data-testid="procedure-list"
          className="border-t border-ink-700/40 pt-2 mb-2 flex flex-col gap-1.5"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500 mb-1">
            Prosedür
          </div>
          {procedures.map((kind) => (
            <button
              key={kind}
              type="button"
              data-testid={`procedure-button-${kind}`}
              onClick={() => onStartProcedure?.(kind, region)}
              className="text-left px-2.5 py-1.5 rounded bg-brand/10 hover:bg-brand/20 border border-brand/30 hover:border-brand/60 transition font-mono text-[11px] text-brand-light"
            >
              {PROCEDURE_LABELS[kind]}
            </button>
          ))}
        </div>
      )}

      <footer className="mt-1 pt-2 border-t border-ink-700/40 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-500 flex items-center justify-between">
        <span>id: {region.id}</span>
        <span>{region.side}</span>
      </footer>
    </aside>
  );
}
