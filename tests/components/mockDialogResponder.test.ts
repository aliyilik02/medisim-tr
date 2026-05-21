// ============================================================
// mockDialogResponder — Unit testler (Sprint B.2)
// ============================================================
// Calgary-Cambridge mock yanıt üretici. Backend yokken DialogChat
// bu modülü kullanır. Pattern matching + stage fallback testleri.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  generateMockResponse,
  getStudentPrompts,
  suggestNextStage,
  CALGARY_STAGE_LABEL,
} from "@/components/dialog/mockDialogResponder";
import { SCENARIOS } from "@/data/scenarios";

// Gerçek senaryo — mockDialogResponder scenario.patient.history_items
// gibi nested field'lara erişiyor; minimal mock yeterli değil.
function makeScenario() {
  return SCENARIOS[0]!;
}

describe("generateMockResponse — fallback", () => {
  test("boş input → 'Sizi anlayamadım' yanıtı", () => {
    const reply = generateMockResponse(
      { scenario: makeScenario(), history: [], currentStage: "initiating" },
      "",
    );
    expect(reply.text).toMatch(/anlayamadım/i);
    expect(reply.role).toBe("patient");
  });

  test("initiating stage + tanımsız soru → 'Merhaba doktor' karşılama", () => {
    const reply = generateMockResponse(
      {
        scenario: makeScenario(),
        history: [],
        currentStage: "initiating",
      },
      "xyzabcsoru",
    );
    expect(reply.text).toMatch(/merhaba|doktor/i);
  });

  test("gathering stage + tanımsız soru → SAMPLE/OPQRST yönlendirmesi", () => {
    const reply = generateMockResponse(
      {
        scenario: makeScenario(),
        history: [],
        currentStage: "gathering",
      },
      "xyzabcsoru",
    );
    expect(reply.text).toMatch(/ağrı|şikayet|ne zaman/i);
  });
});

describe("generateMockResponse — pattern matching", () => {
  test("'ağrı ne zaman' → onset yanıtı", () => {
    const reply = generateMockResponse(
      {
        scenario: makeScenario(),
        history: [],
        currentStage: "gathering",
      },
      "Ağrı ne zaman başladı?",
    );
    expect(reply.role).toBe("patient");
    expect(reply.text.length).toBeGreaterThan(0);
  });

  test("'alerji' kelimesi → allergy yanıtı", () => {
    const reply = generateMockResponse(
      {
        scenario: makeScenario(),
        history: [],
        currentStage: "gathering",
      },
      "Alerjiniz var mı?",
    );
    expect(reply.role).toBe("patient");
  });

  test("yanıtın 'at' timestamp'i Date.now civarında", () => {
    const now = Date.now();
    const reply = generateMockResponse(
      { scenario: makeScenario(), history: [], currentStage: "initiating" },
      "merhaba",
    );
    expect(reply.at).toBeGreaterThanOrEqual(now - 100);
    expect(reply.at).toBeLessThanOrEqual(Date.now() + 100);
  });
});

describe("getStudentPrompts — stage'e göre öneri", () => {
  test("initiating stage → karşılama prompt'ları", () => {
    const prompts = getStudentPrompts("initiating", 0);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.join(" ")).toMatch(/merhaba|nasıl yardımcı|isim|yaş/i);
  });

  test("gathering — düşük turn (0-1) → OPQRST yönlendirme", () => {
    const prompts = getStudentPrompts("gathering", 0);
    expect(prompts.join(" ")).toMatch(/ne zaman|nasıl bir his/i);
  });

  test("gathering — orta turn (2-3) → yayılım/şiddet", () => {
    const prompts = getStudentPrompts("gathering", 2);
    expect(prompts.join(" ")).toMatch(/yayıl|şiddet|0-10/i);
  });

  test("gathering — yüksek turn (4+) → SAMPLE", () => {
    const prompts = getStudentPrompts("gathering", 5);
    expect(prompts.join(" ")).toMatch(/ilaç|alerji|geçmiş|hastalık/i);
  });

  test("physical_exam → 3D modele yönlendirme", () => {
    const prompts = getStudentPrompts("physical_exam", 0);
    expect(prompts.join(" ")).toMatch(/3d|muayene/i);
  });

  test("explanation + closing → boş prompt listesi", () => {
    expect(getStudentPrompts("explanation", 0)).toEqual([]);
    expect(getStudentPrompts("closing", 0)).toEqual([]);
  });
});

describe("suggestNextStage — Calgary geçiş kuralı", () => {
  test("initiating + 2+ tur → gathering", () => {
    expect(suggestNextStage("initiating", 2)).toBe("gathering");
    expect(suggestNextStage("initiating", 5)).toBe("gathering");
  });

  test("initiating + <2 tur → null (henüz geçilmesin)", () => {
    expect(suggestNextStage("initiating", 1)).toBeNull();
  });

  test("gathering + 8+ tur → physical_exam", () => {
    expect(suggestNextStage("gathering", 8)).toBe("physical_exam");
  });

  test("physical_exam + 12+ tur → explanation", () => {
    expect(suggestNextStage("physical_exam", 12)).toBe("explanation");
  });

  test("explanation + 14+ tur → closing", () => {
    expect(suggestNextStage("explanation", 14)).toBe("closing");
  });

  test("closing → null (son stage)", () => {
    expect(suggestNextStage("closing", 100)).toBeNull();
  });
});

describe("CALGARY_STAGE_LABEL", () => {
  test("5 Calgary stage için Türkçe label", () => {
    expect(CALGARY_STAGE_LABEL.initiating).toMatch(/karşılama/i);
    expect(CALGARY_STAGE_LABEL.gathering).toMatch(/anamnez/i);
    expect(CALGARY_STAGE_LABEL.physical_exam).toMatch(/muayene/i);
    expect(CALGARY_STAGE_LABEL.explanation).toMatch(/açıklama/i);
    expect(CALGARY_STAGE_LABEL.closing).toMatch(/kapanış/i);
  });
});
