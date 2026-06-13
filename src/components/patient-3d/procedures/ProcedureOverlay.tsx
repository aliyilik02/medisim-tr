import type { ProcedureContext } from "./types";
import { StethoscopeProcedure } from "./StethoscopeProcedure";
import { OxygenMaskProcedure } from "./OxygenMaskProcedure";
import { IVCannulaProcedure } from "./IVCannulaProcedure";
import { PulseOxProcedure } from "./PulseOxProcedure";
import { BpCuffProcedure } from "./BpCuffProcedure";
import { EkgElectrodesProcedure } from "./EkgElectrodesProcedure";
import { BVMProcedure } from "./BVMProcedure";
import { IntubationProcedure } from "./IntubationProcedure";
import { TourniquetProcedure } from "./TourniquetProcedure";
import { ChestSealProcedure } from "./ChestSealProcedure";
import { NasalCannulaProcedure } from "./NasalCannulaProcedure";
import { GlucometerProcedure } from "./GlucometerProcedure";

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
    case "oxygen_mask":
      return (
        <OxygenMaskProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "iv_line":
      return (
        <IVCannulaProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "pulse_ox":
      return (
        <PulseOxProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "bp_cuff":
      return (
        <BpCuffProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "ekg_electrodes":
      return (
        <EkgElectrodesProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "bvm":
      return (
        <BVMProcedure targetPosition={active.targetPosition} onComplete={handleComplete} />
      );
    case "intubation":
      return (
        <IntubationProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "tourniquet":
      return (
        <TourniquetProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "chest_seal":
      return (
        <ChestSealProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "nasal_cannula":
      return (
        <NasalCannulaProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    case "glucometer":
      return (
        <GlucometerProcedure
          targetPosition={active.targetPosition}
          onComplete={handleComplete}
        />
      );
    // B.2.3: case "defibrillator"
    default:
      return null;
  }
}
