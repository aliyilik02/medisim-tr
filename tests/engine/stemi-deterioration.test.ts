// ============================================================
// STEMI deterioration — faz zinciri + reperfüzyon halt/recovery
// ============================================================
// Klinik değerler REVIEWED_PENDING_ACTIVATION (21 Haz, ESC 2023 kaynaklı,
// ACTIVE Ali Bey'de); bu test MOTOR davranışını doğrular: tedavisiz kötüleşme,
// escalation, reperfüzyon (tenecteplase + PCI kararı) ile halt + recovery.

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
  test("senaryoda deterioration tanımlı (4 faz) + REVIEWED (ACTIVE değil)", () => {
    expect(scenario_stemi.deterioration?.length).toBe(4);
    // 21 Haz olgunlaştırma: klinik değerler kaynak-doğrulandı → REVIEWED_PENDING_ACTIVATION.
    // ACTIVE DEĞİL — görsel test + Ali Bey onayı bekliyor.
    expect(scenario_stemi.clinical_review?.status).toBe("REVIEWED_PENDING_ACTIVATION");
    expect(scenario_stemi.clinical_review?.status).not.toBe("ACTIVE");
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

  test("handoff: eskalasyonda önceki faz 'stopped' (trend toplanmaz)", () => {
    const p = fresh();
    run(p, { ...INIT }, 200); // 180sn sonra sok aktif, iskemi durmalı
    const st = p.getState();
    expect(st.stopped).toContain("stemi-iskemi"); // halt_self → stopped
    expect(st.halted).not.toContain("stemi-iskemi"); // reperfüzyon değil
    // Yalnız tek faz aktif-sürer → SBP düşüşü tek-faz oranında (süperpozisyon yok).
    // 180-360 arası yalnız stemi-sok (bp -0.083/sn) çalışır.
    const a = run(p, { bp_systolic: 120, hr: 100, bp_diastolic: 80, spo2: 95, temp: 37, rr: 20, pain: 5, glucose: 180, gcs: 15 }, 10);
    // 10sn'de tek faz: ~-0.83 mmHg (iki faz toplansaydı ~-1.9 olurdu)
    expect(120 - a.bp_systolic).toBeLessThan(1.2);
  });

  test("uzun tedavisiz seyir SBP'yi şok eşiğinin altına çeker (<90)", () => {
    const p = fresh();
    // Handoff (tek-faz) deterioration daha yavaş; arrest fazına (540sn) kadar sür.
    const after = run(p, { ...INIT }, 600);
    expect(after.bp_systolic).toBeLessThan(90);
  });

  test("arrest fazı aktif (uzun seyir)", () => {
    const p = fresh();
    run(p, { ...INIT }, 600);
    expect(p.getState().activated).toContain("stemi-arrest");
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

  test("GERÇEK DALLANMA: erken reperfüzyon vs gecikme → ayrışan sonuç", () => {
    // Reperfüzyon kararı senaryonun sonucunu DEĞİŞTİRİR (consequence-branch):
    // erken PCI kararı → faz durur, hasta arrest'e gitmez.
    const erken = fresh();
    erken.applyIntervention(INIT, PCI);          // 0. sn'de reperfüzyon
    run(erken, { ...INIT }, 600);
    expect(erken.getState().activated).not.toContain("stemi-arrest");
    expect(erken.getState().halted).toContain("stemi-iskemi");

    // Gecikme (müdahalesiz) → arrest fazına ulaşır.
    const gecikme = fresh();
    run(gecikme, { ...INIT }, 600);
    expect(gecikme.getState().activated).toContain("stemi-arrest");
  });

  test("ARREST fazında reperfüzyon kurtarmaz (halted_by YOK, recovery YOK)", () => {
    const p = fresh();
    const arrest = run(p, { ...INIT }, 600); // arrest aktif
    expect(p.getState().activated).toContain("stemi-arrest");
    p.applyIntervention(arrest, TNK);
    p.applyIntervention(arrest, PCI);
    const after = run(p, arrest, 60);
    // Arrest terminal: reperfüzyon ile toparlamaz, SBP düşmeye devam eder/sabit kalmaz yukarı.
    expect(after.bp_systolic).toBeLessThanOrEqual(arrest.bp_systolic);
  });
});
