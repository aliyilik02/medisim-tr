// ============================================================
// STEMI dallanan karar pilotu — tel-örgü (wiring) testleri
// ============================================================
// Klinik DEĞERLERİ test etmez (DRAFT — Ali Bey review); dalların motor
// açısından tutarlılığını test eder: hedefler var, doğru karar s4b'yi
// ATLAR, yanlış karar s4b'ye düşer, kurtarma s5'e döner, kurtarma
// kararları deterioration'ı durdurur.
// ============================================================

import { describe, expect, test } from "vitest";
import { scenario_stemi } from "@/data/scenarios/stemi";
import {
  evaluateDecision,
  pickNextStep,
  getAchievableMaxPoints,
} from "@/engine/engine";
import { createSimplePhysiologyProvider } from "@/engine/physiology";
import type { DecisionStep, Step } from "@/engine";

const step = (id: string): Step => {
  const s = scenario_stemi.steps.find((x) => x.id === id);
  if (!s) throw new Error(`adım yok: ${id}`);
  return s;
};

const s4 = step("s4_reperfuzyon_karari") as DecisionStep;
const s4b = step("s4b_reperfuzyonsuz_kotulesme") as DecisionStep;

describe("STEMI dallanma — hedef bütünlüğü", () => {
  test("tüm next_step_id hedefleri senaryoda mevcut", () => {
    const ids = new Set(scenario_stemi.steps.map((s) => s.id));
    for (const st of scenario_stemi.steps) {
      if (st.kind !== "decision") continue;
      for (const o of st.options) {
        if (o.next_step_id) {
          expect(ids.has(o.next_step_id), `${st.id}/${o.id} → ${o.next_step_id}`).toBe(true);
        }
      }
    }
  });

  test("doğru reperfüzyon kararları s4b'yi ATLAR (s5'e dallanır)", () => {
    for (const id of ["opt_pci_transfer", "opt_pci_hesapla", "opt_tromboliz"]) {
      const ev = evaluateDecision(s4, id, 5, scenario_stemi);
      expect(ev?.next_step_id, id).toBe("s5_transfer_oncesi");
    }
  });

  test("yanlış kararlar (bekle/ertele) komplikasyon koluna dallanır", () => {
    for (const id of ["opt_bekle", "opt_koroner_yogun"]) {
      const ev = evaluateDecision(s4, id, 3, scenario_stemi);
      expect(ev?.next_step_id, id).toBe("s4b_reperfuzyonsuz_kotulesme");
    }
  });

  test("s4b kurtarma seçenekleri ana akışa (s5) döner; izleme ısrarı VF'e gider", () => {
    expect(evaluateDecision(s4b, "opt_kurtarma_pci", 3, scenario_stemi)?.next_step_id).toBe("s5_transfer_oncesi");
    expect(evaluateDecision(s4b, "opt_kurtarma_tromboliz", 3, scenario_stemi)?.next_step_id).toBe("s5_transfer_oncesi");
    expect(evaluateDecision(s4b, "opt_izleme_devam", 3, scenario_stemi)?.next_step_id).toBe("s7_vt_vf_komplikasyonu");
  });

  test("d1-2'de VF hedefi (min_difficulty 3) gizli → zorluk kapısı linear akışa düşürür", () => {
    // s4b'den sonra lineer sıradaki görünür adım s5 → akış kilitlenmez
    expect(pickNextStep(scenario_stemi, "s4b_reperfuzyonsuz_kotulesme", ["s7_vt_vf_komplikasyonu"], 1)).toBe(
      "s5_transfer_oncesi",
    );
    expect(pickNextStep(scenario_stemi, "s4b_reperfuzyonsuz_kotulesme", ["s7_vt_vf_komplikasyonu"], 3)).toBe(
      "s7_vt_vf_komplikasyonu",
    );
  });

  test("best-path ulaşılabilir tavan s4b komplikasyon adımını içermez (doğru karar atlar)", () => {
    // s4'te en iyi doğru (d3: opt_pci_hesapla) s5'e dallanır → s4b puanları tavana girmez
    for (const d of [1, 3, 5] as const) {
      expect(getAchievableMaxPoints(scenario_stemi, d)).toBeGreaterThan(0);
    }
  });
});

describe("STEMI dallanma — fizyoloji köprüsü", () => {
  test("kurtarma kararları + opt_pci_hesapla deterioration fazlarını durdurur", () => {
    for (const optId of ["opt_pci_hesapla", "opt_kurtarma_pci", "opt_kurtarma_tromboliz"]) {
      const provider = createSimplePhysiologyProvider(scenario_stemi);
      provider.applyIntervention(scenario_stemi.initial_vitals, {
        type: "decision",
        target_id: optId,
      });
      expect(provider.getState().halted.length, optId).toBeGreaterThan(0);
    }
  });

  test("izleme ısrarı (opt_izleme_devam) fazı DURDURMAZ — kötüleşme sürer", () => {
    const provider = createSimplePhysiologyProvider(scenario_stemi);
    provider.applyIntervention(scenario_stemi.initial_vitals, {
      type: "decision",
      target_id: "opt_izleme_devam",
    });
    expect(provider.getState().halted).toEqual([]);
  });
});
