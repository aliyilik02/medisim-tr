// ============================================================
// evaluateDecisionMulti — çoklu karar değerlendirme testleri
// ============================================================
// Hat A kapsam boşluğu: fonksiyon UI'da canlı (handleDecisionMulti,
// allow_multiple adımlar) ama birim testi yoktu (engine.ts 458-500).
// ============================================================

import { describe, expect, test } from "vitest";
import { evaluateDecisionMulti } from "@/engine/engine";
import type { Step } from "@/engine";

const step: Step = {
  id: "coklu",
  kind: "decision",
  title: "İlk müdahale paketi",
  description: "Uygulanacakları seç",
  allow_multiple: true,
  partial_credit: true,
  options: [
    { id: "o2", text: "Oksijen", points: 10, correct: true, feedback: "Doğru — hipoksi var." },
    { id: "iv", text: "IV yol", points: 8, correct: true, feedback: "Doğru — ilaç yolu gerekli." },
    { id: "beta", text: "Beta-bloker", points: -12, correct: false, feedback: "Kontrendike." },
    {
      id: "ileri",
      text: "İleri seviye seçenek",
      points: 6,
      correct: true,
      feedback: "İleri.",
      min_difficulty: 4,
    },
  ],
} as unknown as Step;

describe("evaluateDecisionMulti", () => {
  test("decision olmayan adım → null", () => {
    const actionStep = { id: "a", kind: "action" } as unknown as Step;
    expect(evaluateDecisionMulti(actionStep, ["o2"])).toBeNull();
  });

  test("tüm doğrular seçili → tam puan + all_correct", () => {
    const r = evaluateDecisionMulti(step, ["o2", "iv"], 3)!;
    expect(r.points).toBe(18);
    expect(r.all_correct).toBe(true);
    expect(r.missed_correct_options).toHaveLength(0);
    expect(r.feedback).toContain("✓ Oksijen");
    expect(r.feedback).toContain("✓ IV yol");
  });

  test("yanlış seçenek eklenirse all_correct düşer, puanı düşürür", () => {
    const r = evaluateDecisionMulti(step, ["o2", "iv", "beta"], 3)!;
    expect(r.points).toBe(18 - 12);
    expect(r.all_correct).toBe(false);
    expect(r.feedback).toContain("✗ Beta-bloker");
  });

  test("partial_credit: atlanan doğru %50 ceza + feedback'te listelenir", () => {
    const r = evaluateDecisionMulti(step, ["o2"], 3)!;
    // iv atlandı → ceza round(|8|*0.5)=4 → 10-4=6
    expect(r.points).toBe(6);
    expect(r.missed_correct_options.map((o) => o.id)).toEqual(["iv"]);
    expect(r.feedback).toContain("Atlanan doğru seçenekler:");
    expect(r.feedback).toContain("– IV yol");
    expect(r.all_correct).toBe(false);
  });

  test("partial_credit kapalı: atlanana ceza yok", () => {
    const noPartial = { ...(step as any), partial_credit: false } as Step;
    const r = evaluateDecisionMulti(noPartial, ["o2"], 3)!;
    expect(r.points).toBe(10);
  });

  test("zorluk kapısı: d3'te min_difficulty 4 seçenek görünmez — seçilse de sayılmaz, atlanmış da sayılmaz", () => {
    const withHidden = evaluateDecisionMulti(step, ["o2", "iv", "ileri"], 3)!;
    expect(withHidden.points).toBe(18); // ileri yok sayıldı
    expect(withHidden.all_correct).toBe(true);
    // d5'te görünür → atlanınca cezalanır
    const d5 = evaluateDecisionMulti(step, ["o2", "iv"], 5)!;
    expect(d5.missed_correct_options.map((o) => o.id)).toEqual(["ileri"]);
    expect(d5.points).toBe(18 - Math.round(6 * 0.5));
  });

  test("boş seçim: 0 taban - atlanan cezaları, all_correct false", () => {
    const r = evaluateDecisionMulti(step, [], 3)!;
    expect(r.points).toBe(-(Math.round(10 * 0.5) + Math.round(8 * 0.5)));
    expect(r.all_correct).toBe(false);
    expect(r.selected_options).toHaveLength(0);
  });

  test("difficulty verilmezse senaryo difficulty → o da yoksa 3", () => {
    const r = evaluateDecisionMulti(step, ["o2", "iv"]);
    expect(r!.points).toBe(18); // d3 varsayılanında 'ileri' gizli → ceza yok
  });
});
