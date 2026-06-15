// ============================================================
// STEMI deterioration — faz zinciri + reperfüzyon halt/recovery
// ============================================================
// Klinik DEĞERLER review bekliyor (DRAFT); bu test MOTOR davranışını
// doğrular: tedavisiz kötüleşme, escalation, reperfüzyon (tenecteplase +
// PCI kararı) ile halt + recovery.

import { describe, expect, test } from "vitest";
import { createSimplePhysiologyProvider } from "@/engine";
import { scenario_stemi } from "@/data/scenarios/stemi";
import type { PatientVitals, ActionRef } from "@/engine";

function fresh() {
  return createSimplePhysiologyProvider(scenario_stemi);
}
const INIT: PatientVitals = scenario_stemi.initial_vitals;

/** dtSec'lik adımlarla toplam `seconds` simüle et. */
function run(
  provider: ReturnType<typeof fresh>,
  start: PatientVitals,
  seconds: number,
  dt = 1
): PatientVitals {
  let v = start;
  for (let t = 0; t < seconds; t += dt) v = provider.tick(v, dt);
  return v;
}

describe("STEMI deterioration — tedavisiz seyir", () => {
  test("senaryoda deterioration tanımlı (4 faz)", () => {
    expect(scenario_stemi.deterioration?.length).toBe(4);
    expect(scenario_stemi.clinical_review?.status).toBe("DRAFT");
    expect(scenario_stemi.clinical_review?.draft_areas).toContain("deterioration");
  });

  test("tedavisiz SBP düşer (iskemi fazı, floor 100)", () => {
    const p = fresh();
    const after = run(p, { ...INIT }, 120);
    expect(after.bp_systolic).toBeLessThan(INIT.bp_systolic);
    // İlk faz floor'u 100; bir sonraki faz aktifleşene kadar 100'ün çok altına inmez.
    expect(after.bp_systolic).toBeGreaterThanOrEqual(60);
  });

  test("tedavisiz HR yükselir (taşikardi)", () => {
    const p = fresh();
    const after = run(p, { ...INIT }, 120);
    expect(after.hr).toBeGreaterThan(INIT.hr);
  });

  test("180sn sonra şok fazı (stemi-sok) eskalasyonla aktifleşir", () => {
    const p = fresh();
    run(p, { ...INIT }, 200);
    expect(p.getState().activated).toContain("stemi-sok");
  });

  test("uzun tedavisiz seyir SBP'yi şok eşiğinin altına çeker (<90)", () => {
    const p = fresh();
    const after = run(p, { ...INIT }, 400);
    expect(after.bp_systolic).toBeLessThan(90);
  });
});

describe("STEMI deterioration — reperfüzyon halt + recovery", () => {
  const TNK: ActionRef = { type: "give_medication", target_id: "tenecteplase" };
  const PCI: ActionRef = { type: "decision", target_id: "opt_pci_transfer" };

  test("tenecteplase (fibrinoliz) tüm fazları durdurur", () => {
    const p = fresh();
    run(p, { ...INIT }, 60);
    p.applyIntervention(INIT, TNK);
    const halted = p.getState().halted;
    expect(halted).toContain("stemi-iskemi");
  });

  test("PCI kararı (opt_pci_transfer) deterioration'ı durdurur", () => {
    const p = fresh();
    p.applyIntervention(INIT, PCI);
    expect(p.getState().halted).toContain("stemi-iskemi");
  });

  test("reperfüzyon sonrası SBP toparlanır (recovery_trends)", () => {
    const p = fresh();
    // Uzun tedavisiz seyir → SBP recovery hedefinin (120) belirgin altına insin.
    const low = run(p, { ...INIT }, 480);
    expect(low.bp_systolic).toBeLessThan(110);
    p.applyIntervention(low, TNK);
    const recovered = run(p, low, 120);
    expect(recovered.bp_systolic).toBeGreaterThan(low.bp_systolic);
  });

  test("alakasız aksiyon deterioration'ı durdurmaz", () => {
    const p = fresh();
    p.applyIntervention(INIT, { type: "give_medication", target_id: "aspirin" });
    expect(p.getState().halted).not.toContain("stemi-iskemi");
  });
});
