// ============================================================
// Anaflaksi DRAFT deterioration + oskültasyon alanları (Faz 1)
// ============================================================
// ⚠️ Bu testler KLİNİK DRAFT içeriği doğrular — şema uyumu ve
// motor davranışı. Klinik değerlerin kendisi Ali Bey review bekliyor.
import { describe, expect, test } from "vitest";
import { createSimplePhysiologyProvider } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const anaflaksi = getScenario("acil-anaflaksi-001");
if (!anaflaksi) throw new Error("Anaflaksi senaryosu bulunamadı");

describe("anaflaksi — DRAFT deterioration alanları (şema uyumu)", () => {
  test("deterioration fazı tanımlı ve adrenalin ile durduruluyor", () => {
    expect(anaflaksi.deterioration).toBeDefined();
    const provider = createSimplePhysiologyProvider(anaflaksi);

    // Başta aktif (active_from_step_id yok)
    const t1 = provider.tick(anaflaksi.initial_vitals, 30);
    expect(t1.bp_systolic).toBeLessThan(anaflaksi.initial_vitals.bp_systolic);
    expect(t1.spo2).toBeLessThan(anaflaksi.initial_vitals.spo2);

    // Adrenalin IM → durur
    provider.applyIntervention(t1, {
      type: "give_medication",
      target_id: "adrenalin",
      site: "im_uyluk",
    });
    expect(provider.isPhaseHalted("untreated-anaphylaxis")).toBe(true);

    // İyileşme başlar
    const t2 = provider.tick(t1, 60);
    expect(t2.bp_systolic).toBeGreaterThan(t1.bp_systolic);
  });

  test("taban değerler aşılmaz (SBP 50, SpO2 72, HR tavan 152)", () => {
    const provider = createSimplePhysiologyProvider(anaflaksi);
    const late = provider.tick(anaflaksi.initial_vitals, 3600);
    expect(late.bp_systolic).toBe(50);
    expect(late.spo2).toBe(72);
    expect(late.hr).toBe(152);
  });

  test("oskültasyon eşlemesi 3 göğüs bölgesini kapsıyor, sesler asset setinde", () => {
    const validSounds = [
      "heart_normal",
      "heart_61bpm",
      "lung_wheeze",
      "lung_crackles",
    ];
    expect(anaflaksi.auscultation).toBeDefined();
    for (const [regionId, o] of Object.entries(anaflaksi.auscultation!)) {
      expect(regionId).toMatch(/^chest-/);
      expect(validSounds).toContain(o.sound_id);
      if (o.resolved_sound_id) {
        expect(validSounds).toContain(o.resolved_sound_id);
      }
      expect(o.phase_id).toBe("untreated-anaphylaxis");
    }
  });
});
