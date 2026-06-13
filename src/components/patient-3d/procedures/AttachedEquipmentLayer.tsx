import type { ProcedureContext } from "./types";
import { OxygenMaskProcedure } from "./OxygenMaskProcedure";
import { IVCannulaProcedure } from "./IVCannulaProcedure";
import { PulseOxProcedure } from "./PulseOxProcedure";
import { BpCuffProcedure } from "./BpCuffProcedure";
import { EkgElectrodesProcedure } from "./EkgElectrodesProcedure";

// ============================================================
// AttachedEquipmentLayer — kalıcı (persistent) ekipman katmanı (P0)
// ============================================================
// Takma animasyonu biten persistent ekipman (maske, IV, pulse-ox,
// kaf, EKG) buraya taşınır ve sahnede KALIR. Aktif ProcedureOverlay
// tek prosedürle sınırlıyken bu katman aynı anda birden çok ekipmanı
// gösterir (maske + IV + EKG hep birlikte).
//
// Tasarım: aynı Procedure component'leri yeniden kullanılır — mount'ta
// kısa yaklaşma animasyonunu bir kez oynatıp rest pozisyonunda kalırlar
// (lerp endPos'ta sabitlenir). onComplete no-op (ekipman zaten kalıcı).
// Mesh kodu tek yerde (DRY) — ayrı "static" varyant gerekmez.
//
// key: regionId + kind → aynı bölgeye aynı ekipman bir kez (idempotent).
// ============================================================

interface Props {
  attached: ProcedureContext[];
}

const NOOP = () => undefined;

function renderEquipment(ctx: ProcedureContext) {
  const key = `${ctx.kind}@${ctx.regionId}`;
  switch (ctx.kind) {
    case "oxygen_mask":
      return (
        <OxygenMaskProcedure key={key} targetPosition={ctx.targetPosition} onComplete={NOOP} />
      );
    case "iv_line":
      return (
        <IVCannulaProcedure key={key} targetPosition={ctx.targetPosition} onComplete={NOOP} />
      );
    case "pulse_ox":
      return (
        <PulseOxProcedure key={key} targetPosition={ctx.targetPosition} onComplete={NOOP} />
      );
    case "bp_cuff":
      return (
        <BpCuffProcedure key={key} targetPosition={ctx.targetPosition} onComplete={NOOP} />
      );
    case "ekg_electrodes":
      return (
        <EkgElectrodesProcedure key={key} targetPosition={ctx.targetPosition} onComplete={NOOP} />
      );
    // stethoscope / defibrillator persistent değil — bu katmanda yer almaz.
    default:
      return null;
  }
}

export function AttachedEquipmentLayer({ attached }: Props) {
  if (attached.length === 0) return null;
  return <>{attached.map(renderEquipment)}</>;
}
