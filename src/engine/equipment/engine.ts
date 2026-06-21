// ============================================================
// MediSim TR — Ekipman-Etki Motoru (Blok 2)
// ============================================================
// İlaç motoruna SİMETRİK merkezi ekipman→fizyoloji sistemi.
// Saf fonksiyonel: girdi al, çıktı dön. React/UI bağımsız (mimari kural 1).
//
// AKIŞ: senaryo `use_central_equipment_effects: true` derse, öğrenci ekipman
// kullanınca runner resolveEquipmentEffect'i çağırır → koşul sağlanırsa
// hesaplanan delta'yı functional setSession ile baseline+vitals'a uygular.
// Flag yoksa bu motor HİÇ çağrılmaz → eski elle vitals_change davranışı (çakışma yok).
//
// ⚠️ Etki DEĞERLERİ DRAFT (catalog.ts). Bu motor değerleri "uygular" ama
// değerlerin klinik doğruluğundan sorumlu değildir — o klinik review işi.
// ============================================================

import type { PatientVitals } from "../types";
import type {
  EquipmentEffect,
  EquipmentCondition,
  EquipmentVitalAction,
  EquipmentEffectContext,
  EquipmentResolution,
} from "./types";
import { getEquipmentEffect } from "./catalog";

// ------------------------------------------------------------
// 1. Koşul değerlendirme
// ------------------------------------------------------------

/** Ekipman etki koşulu mevcut bağlamda sağlanıyor mu?
 *  Sağlanmazsa ekipman fizyolojik etki yapmaz (O2 normoksemide etkisiz vb.). */
export function evaluateEquipmentCondition(
  condition: EquipmentCondition | undefined,
  ctx: EquipmentEffectContext
): boolean {
  if (!condition || condition.kind === "always") return true;

  if (condition.kind === "vital") {
    const value = ctx.vitals[condition.vital];
    if (value === undefined || typeof value !== "number") return false;
    switch (condition.op) {
      case "lt":
        return value < condition.value;
      case "gt":
        return value > condition.value;
      case "lte":
        return value <= condition.value;
      case "gte":
        return value >= condition.value;
    }
  }

  if (condition.kind === "rhythm") {
    // Aktif faz ritmi bilinmiyorsa koşul sağlanmaz (güvenli varsayılan:
    // defib ritmi doğrulanamadan etki uygulanmaz).
    if (!ctx.ekg) return false;
    return condition.in.includes(ctx.ekg);
  }

  return false;
}

// ------------------------------------------------------------
// 2. Tek vital etkisi — yönlü clamp
// ------------------------------------------------------------

/** Bir EquipmentVitalAction'ı mevcut vitale uygula, gerçekleşen delta'yı dön.
 *  toward verilmişse hedefi AŞMAZ (aşırı düzeltme engeli). Vital zaten hedefin
 *  doğru tarafındaysa (örn. SpO2 zaten 99, toward 97) o yönde ilerletmez → 0 delta. */
export function computeVitalActionDelta(
  action: EquipmentVitalAction,
  current: number
): number {
  let next = current + action.amount;

  if (action.toward !== undefined) {
    if (action.amount > 0) {
      // Artırıyoruz: hedefin üstüne çıkma. Zaten hedefte/üstündeyse ilerletme.
      if (current >= action.toward) return 0;
      next = Math.min(next, action.toward);
    } else if (action.amount < 0) {
      // Azaltıyoruz: hedefin altına inme. Zaten hedefte/altındaysa ilerletme.
      if (current <= action.toward) return 0;
      next = Math.max(next, action.toward);
    }
  }

  return next - current;
}

// ------------------------------------------------------------
// 3. Ana giriş — ekipman etkisini çöz
// ------------------------------------------------------------

/** Öğrenci ekipman kullandığında runner bunu çağırır.
 *  Koşul sağlanmazsa applied=false + boş delta (vital değişmez) döner. */
export function resolveEquipmentEffect(
  effect: EquipmentEffect,
  ctx: EquipmentEffectContext
): EquipmentResolution {
  const applies = evaluateEquipmentCondition(effect.condition, ctx);

  if (!applies) {
    return {
      equipment_id: effect.equipment_id,
      applied: false,
      delta: {},
      // Yol açma/havayolu güvenliği koşula bağlı değil — her zaman uygulanır.
      airway_secured: effect.airway_secured ?? false,
      opens_iv_route: effect.opens_iv_route ?? false,
      note:
        effect.effects.length > 0
          ? "Ekipman uygulandı ancak mevcut durumda fizyolojik etki koşulu sağlanmadı."
          : effect.note,
    };
  }

  const delta: Partial<PatientVitals> = {};
  for (const a of effect.effects) {
    const cur = ctx.vitals[a.vital];
    if (cur === undefined || typeof cur !== "number") continue;
    const d = computeVitalActionDelta(a, cur);
    if (d !== 0) {
      delta[a.vital] = (delta[a.vital] ?? 0) + d;
    }
  }

  return {
    equipment_id: effect.equipment_id,
    applied: true,
    delta,
    airway_secured: effect.airway_secured ?? false,
    opens_iv_route: effect.opens_iv_route ?? false,
    note: effect.note,
  };
}

/** Katalog id'sinden çöz — kolaylık sarmalayıcısı. Ekipman katalogda yoksa null. */
export function resolveEquipmentById(
  equipmentId: string,
  ctx: EquipmentEffectContext
): EquipmentResolution | null {
  const effect = getEquipmentEffect(equipmentId);
  if (!effect) return null;
  return resolveEquipmentEffect(effect, ctx);
}
