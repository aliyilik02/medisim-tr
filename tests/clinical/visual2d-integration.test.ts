// ============================================================
// 2D görsel katmanı entegrasyonu — GERÇEK STEMI motoru → durum merdiveni
// ============================================================
// Aşama 3 doğrulaması (2D pivot pilotu): motor hiç değişmedi; bu test
// tedavisiz STEMI seyrini gerçek physiology provider'la tick'leyip
// vitals → mapVitalsToVisuals → applyPhaseVisual(faz sinyali) →
// resolveStage2D zincirinin 5 görseli DOĞRU SIRADA gezdiğini ve
// reperfüzyonda geri döndüğünü kanıtlar. Tarayıcıda 10+ dk süren
// "tedaviyi geciktir, izle" senaryosunun saniyelik motor eşdeğeri.
// ============================================================

import { describe, expect, test } from "vitest";
import { createSimplePhysiologyProvider } from "@/engine";
import type { ActionRef, PatientVitals } from "@/engine";
import { scenario_stemi } from "@/data/scenarios/stemi";
import {
  applyPhaseVisual,
  mapVitalsToVisuals,
} from "@/clinical/clinicalVisualMapping";
import {
  resolveStage2D,
  stageRank,
  type Patient2DStage,
} from "@/clinical/visual2d-mapper";

const INIT: PatientVitals = scenario_stemi.initial_vitals;
const TNK: ActionRef = { type: "give_medication", target_id: "tenecteplase" };

/** Motoru saniye saniye ilerlet; her tick'te 2D durumu (histerezisli) çöz,
    farklı duruma her geçişi kaydet. Patient2DVisual'ın yaptığının test kopyası
    (minHold hariç — o zaman ayağı, sıralamayı değiştirmez). */
function playUntreated(seconds: number, afterSec?: number, action?: ActionRef) {
  const p = createSimplePhysiologyProvider(scenario_stemi);
  let v = { ...INIT };
  let stage: Patient2DStage = "baseline";
  const path: Patient2DStage[] = ["baseline"];
  for (let t = 0; t < seconds; t++) {
    if (action && afterSec !== undefined && t === afterSec) {
      v = p.applyIntervention(v, action);
    }
    v = p.tick(v, 1);
    const signal = p.getActivePhaseSignal?.(v) ?? null;
    const next = resolveStage2D(
      applyPhaseVisual(mapVitalsToVisuals(v), signal?.visual),
      stage,
    );
    if (next !== stage) {
      stage = next;
      path.push(next);
    }
  }
  return { path, stage };
}

describe("2D durum merdiveni — gerçek motor seyri", () => {
  test("tedavisiz seyir 5 görseli sırayla gezer: baseline→sok→siyanoz→derin-sok→arrest", () => {
    const { path, stage } = playUntreated(700); // arrest fazı 540sn'de başlar
    expect(stage).toBe("arrest");
    // Merdiven hiç geriye adım atmaz (tedavisiz iyileşme görseli olamaz)
    // ve basamak atlamaz (crossfade her ara durumu gösterir).
    for (let i = 1; i < path.length; i++) {
      expect(stageRank(path[i]) - stageRank(path[i - 1]), path.join("→")).toBe(1);
    }
    expect(path).toEqual(["baseline", "sok", "siyanoz", "derin-sok", "arrest"]);
  });

  test("reperfüzyon (tenecteplase, kötüleşme fazında) → görsel iyileşme yönünde geri döner", () => {
    // 400. sn: stemi-kotulesme aktif, görsel 'siyanoz'. TNK → halt + recovery_trends;
    // recovering sinyali visual boost taşımaz (dominantSignal → visual: {}).
    const { path, stage } = playUntreated(900, 400, TNK);
    // Zirveden geri dönüş: son durum zirve durumdan hafif (recovery çekti).
    const peak = Math.max(...path.map(stageRank));
    expect(peak).toBeGreaterThanOrEqual(stageRank("sok"));
    expect(stageRank(stage)).toBeLessThan(peak);
    expect(stage).toBe("baseline"); // tam düzelme (SBP→120, SpO2→96)
    // Arrest'e hiç girmedi (reperfüzyon zinciri kırdı).
    expect(path).not.toContain("arrest");
  });
});
