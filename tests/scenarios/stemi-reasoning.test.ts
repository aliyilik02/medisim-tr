// ============================================================
// STEMI klinik muhakeme prompt içeriği — yapı + DRAFT + klinik
// ============================================================

import { describe, expect, test } from "vitest";
import { getScenario } from "@/data/scenarios";

const stemi = getScenario("kardiyoloji-stemi-001")!;
const prompts = stemi.reasoning_prompts ?? [];

describe("STEMI reasoning_prompts", () => {
  test("3 muhakeme noktası tanımlı", () => {
    expect(prompts).toHaveLength(3);
    expect(prompts.map((p) => p.id).sort()).toEqual(["rp-aspirin", "rp-oksijen", "rp-reperfuzyon"]);
  });

  test("hepsi DRAFT (ACTIVE değil — Ali Bey görsel test sonrası)", () => {
    for (const p of prompts) expect(p.status).toBe("DRAFT");
  });

  test("her prompt'ta tam 1 doğru şık + ≥1 çeldirici", () => {
    for (const p of prompts) {
      const correct = p.options.filter((o) => o.correct);
      expect(correct).toHaveLength(1);
      expect(p.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("her prompt'ta klinik kaynak var", () => {
    for (const p of prompts) expect(p.source).toMatch(/ESC 2023/);
  });

  test("reperfüzyon prompt'u PCI + tromboliz + tenecteplase yollarını kapsar", () => {
    const rp = prompts.find((p) => p.id === "rp-reperfuzyon")!;
    expect(rp.triggerIds).toEqual(
      expect.arrayContaining(["opt_pci_transfer", "opt_pci_hesapla", "opt_tromboliz", "tenecteplase"]),
    );
  });

  test("aspirin → aspirin target, oksijen → oksijen_maske target", () => {
    expect(prompts.find((p) => p.id === "rp-aspirin")!.triggerIds).toContain("aspirin");
    expect(prompts.find((p) => p.id === "rp-oksijen")!.triggerIds).toContain("oksijen_maske");
  });

  test("oksijen prompt'unda doğru cevap 'rutin gerekmez' (öğretici tuzak)", () => {
    const ox = prompts.find((p) => p.id === "rp-oksijen")!;
    const correct = ox.options.find((o) => o.correct)!;
    expect(correct.text).toMatch(/GEREKMEZ/);
  });
});
