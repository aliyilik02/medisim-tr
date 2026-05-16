import type { ProcedureContext } from "./types";
import { StethoscopeProcedure } from "./StethoscopeProcedure";

// ============================================================
// ProcedureOverlay — generic prosedür dispatcher (Sprint B.2.1)
// ============================================================
// Tek Canvas child'ı. Aktif prosedüre göre alt component mount eder.
// Aynı anda tek prosedür mümkün (klinik akış da öyle: tek el =
// tek müdahale). Active=null'da hiçbir mesh render etmez.
// Yeni prosedür eklemek = switch'e satır eklemek + ilgili Procedure
// component'i import.
// ============================================================

interface Props {
  active: ProcedureContext | null;
  /** Animasyon tamamlandığında çağrılır (component'i unmount etme görevi parent'ta). */
  onComplete: (context: ProcedureContext) => void;
}

export function ProcedureOverlay({ active, onComplete }: Props) {
  if (!active) return null;

  const handleComplete = () => onComplete(active);

  switch (active.kind) {
    case "stethoscope":
      return (
        <StethoscopeProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    // B.2.2: case "oxygen_mask"
    // B.2.3: case "defibrillator"
    default:
      return null;
  }
}
