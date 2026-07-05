// ============================================================
// debrief-comparison — kılavuz karşılaştırma motoru testleri
// ============================================================

import { describe, expect, test } from "vitest";
import {
  buildGuidelineComparison,
  extractGuidelineTags,
  describeActionRef,
} from "@/engine/debrief-comparison";
import type { Scenario, SessionState } from "@/engine";

describe("extractGuidelineTags", () => {
  test("kılavuz adı + yıl çeker, tekrarı ayıklar", () => {
    const text =
      "Doğru — ESC 2023: FMC-balon ≤120 dk. AHA/ACC 2025 de aynı yönde. ESC 2023 tekrar.";
    expect(extractGuidelineTags(text).sort()).toEqual(["AHA/ACC 2025", "ESC 2023"]);
  });
  test("yılsız kısaltma + NICE NG deseni", () => {
    expect(extractGuidelineTags("PALS önerisi; NICE NG9 2021 uyumlu")).toEqual([
      "PALS",
      "NICE NG9 2021",
    ]);
  });
  test("kılavuz yoksa boş", () => {
    expect(extractGuidelineTags("Hasta stabil, izleme devam.")).toEqual([]);
  });
});

describe("describeActionRef", () => {
  test("tür Türkçeleşir, doz eklenir", () => {
    expect(describeActionRef({ type: "give_medication", target_id: "aspirin", dose: "300 mg" })).toBe(
      "İlaç: aspirin (300 mg)",
    );
    expect(describeActionRef({ type: "decision", target_id: "opt_x" })).toBe("Karar: opt_x");
  });
});

const scenario = {
  id: "cmp-test",
  difficulty: 3,
  start_step_id: "a1",
  steps: [
    {
      id: "a1",
      kind: "action",
      title: "İlk müdahale",
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "aspirin" }, points: 15, feedback: "Doğru — ESC 2023 sınıf I." },
        { action: { type: "use_equipment", target_id: "monitor" }, points: 10, feedback: "Doğru — sürekli izlem (AHA 2020)." },
        { action: { type: "give_medication", target_id: "morfin" }, points: -10, feedback: "Rutin morfin önerilmez." },
        { action: { type: "order_test", target_id: "ileri-panel" }, points: 8, feedback: "İleri (TKD 2022).", min_difficulty: 4 },
      ],
    },
    {
      id: "k1",
      kind: "decision",
      title: "Reperfüzyon",
      options: [
        { id: "dogru", text: "PCI transferi", correct: true, points: 30, feedback: "ESC 2023 birincil öneri." },
        { id: "yanlis", text: "Bekle", correct: false, points: -20, feedback: "Hatalı." },
      ],
    },
    { id: "i1", kind: "info", title: "Bilgi", content: "..." },
  ],
} as unknown as Scenario;

const session = {
  selected_difficulty: 3,
  results: [
    {
      step_id: "a1",
      actions_taken: [
        { type: "give_medication", target_id: "aspirin" },
        { type: "examine", target_id: "nabiz" },
      ],
      points_earned: 15,
      time_spent_sec: 30,
      critical_errors: 0,
    },
    {
      step_id: "k1",
      actions_taken: [{ type: "decision", target_id: "yanlis" }],
      points_earned: -20,
      time_spent_sec: 12,
      critical_errors: 0,
    },
    { step_id: "i1", actions_taken: [], points_earned: 0, time_spent_sec: 3, critical_errors: 0 },
  ],
} as unknown as SessionState;

describe("buildGuidelineComparison", () => {
  const rows = buildGuidelineComparison(scenario, session);

  test("info adımı atlanır; action+decision satırları üretilir", () => {
    expect(rows.map((r) => r.step_id)).toEqual(["a1", "k1"]);
  });

  test("beklenen = pozitif outcome'lar (negatif morfin girmez), zorluk kapılı (d3'te ileri-panel yok)", () => {
    expect(rows[0].expected).toEqual(["İlaç: aspirin", "Ekipman: monitor"]);
  });

  test("missed = yapılmayan beklenenler (aspirin yapıldı, monitor atlandı)", () => {
    expect(rows[0].missed).toEqual(["Ekipman: monitor"]);
    expect(rows[0].taken).toContain("İlaç: aspirin");
    expect(rows[0].taken).toContain("Muayene: nabiz");
  });

  test("kılavuz etiketleri pozitif feedback'lerden çekilir", () => {
    expect(rows[0].guidelines.sort()).toEqual(["AHA 2020", "ESC 2023"]);
  });

  test("karar satırı: seçim option metniyle, doğru karar missed'a düşer", () => {
    expect(rows[1].taken).toEqual(["Karar: Bekle"]);
    expect(rows[1].expected).toEqual(["PCI transferi"]);
    expect(rows[1].missed).toEqual(["PCI transferi"]);
    expect(rows[1].guidelines).toEqual(["ESC 2023"]);
  });

  test("d5'te zorluk kapısı açılır — ileri-panel beklenenlere girer", () => {
    const d5 = buildGuidelineComparison(scenario, session, 5);
    expect(d5[0].expected).toContain("Tetkik: ileri-panel");
    expect(d5[0].guidelines).toContain("TKD 2022");
  });
});
