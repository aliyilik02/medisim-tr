// ============================================================
// Senaryo Yapı Doğrulayıcısı
// ============================================================
// 14 senaryonun her biri için:
//   - id, start_step_id, step ID'leri unique
//   - action.target_id'ler available_medications/equipment'ta var
//   - decision options (allow_multiple yoksa) tek correct:true
//   - puan değerleri makul aralıkta
//   - scoring.max_points = pozitif outcome+option puanlarının toplamı (yaklaşık)
//   - grade_bands sıralı (A > B > C > D)
//   - lab_panel referansları doğru
//   - feedback string boş değil
//
// Bu testler bug yakalamak için var. Kırmızı çıkarsa klinik dosya
// DEĞİŞTİRİLMEZ — bug raporlanır, kullanıcı düzeltir.
// ============================================================

import { describe, expect, test } from "vitest";
import type { Scenario, Step, ActionStep, DecisionStep } from "@/engine";
import { getEffectiveGradeBands } from "@/engine";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";
import { autoPlayBestPath } from "../helpers/auto-play";

// ------------------------------------------------------------
// Genel: senaryo listesi sağlığı
// ------------------------------------------------------------

describe("Senaryo listesi", () => {
  test("en az 1 senaryo var", () => {
    expect(ALL_SCENARIOS.length).toBeGreaterThan(0);
  });

  test("senaryo id'leri unique", () => {
    const ids = ALL_SCENARIOS.map((s) => s.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  test("her senaryoda en az 1 step var", () => {
    for (const s of ALL_SCENARIOS) {
      expect(s.steps.length, `${s.id}`).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------------------
// Per-senaryo yapı kontrolleri
// ------------------------------------------------------------

describe.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))(
  "Senaryo: %s",
  (_id, scenario: Scenario) => {
    test("start_step_id mevcut bir step'e işaret ediyor", () => {
      const step = scenario.steps.find((s) => s.id === scenario.start_step_id);
      expect(step, `${scenario.id}: start_step_id '${scenario.start_step_id}' bulunamadı`).toBeDefined();
    });

    test("step.id'leri unique", () => {
      const ids = scenario.steps.map((s) => s.id);
      const dup = findDuplicates(ids);
      expect(dup, `${scenario.id}: duplike step id'ler`).toEqual([]);
    });

    test("action step expected_outcomes hedefleri available_medications/equipment içinde", () => {
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind !== "action") continue;
        for (const o of step.expected_outcomes) {
          const t = o.action.type;
          const id = o.action.target_id;
          if (t === "give_medication" && !scenario.available_medications.includes(id)) {
            issues.push(`step ${step.id}: '${id}' available_medications'ta yok`);
          }
          if (t === "use_equipment" && !scenario.available_equipment.includes(id)) {
            issues.push(`step ${step.id}: '${id}' available_equipment'ta yok`);
          }
        }
      }
      expect(issues, `${scenario.id} → outcome.target_id eksiklikleri`).toEqual([]);
    });

    test("decision step (allow_multiple yok) max 1 correct opsiyon", () => {
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind !== "decision") continue;
        if (step.allow_multiple) continue;
        const correct = step.options.filter((o) => o.correct);
        // Zorluk seviyesi 1'de görünenleri ele al
        const visible1 = correct.filter((o) =>
          (o.min_difficulty ?? 1) <= 1 && (o.max_difficulty ?? 5) >= 1
        );
        if (visible1.length > 1) {
          issues.push(
            `step ${step.id}: S1'de görünür birden fazla correct:true opsiyon (${visible1
              .map((o) => o.id)
              .join(", ")})`
          );
        }
      }
      expect(issues, `${scenario.id} → decision çoklu doğru cevap`).toEqual([]);
    });

    test("decision step en az 1 doğru opsiyon içeriyor", () => {
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind !== "decision") continue;
        const correct = step.options.filter((o) => o.correct);
        if (correct.length === 0) {
          issues.push(`step ${step.id}: hiç correct:true opsiyon yok`);
        }
      }
      expect(issues, `${scenario.id} → decision adımı doğru cevapsız`).toEqual([]);
    });

    test("puanlar makul aralıkta (-100 .. +50)", () => {
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind === "action") {
          for (const o of step.expected_outcomes) {
            if (!Number.isFinite(o.points)) {
              issues.push(`step ${step.id}: outcome puanı sayısal değil`);
              continue;
            }
            if (o.points < -100 || o.points > 50) {
              issues.push(`step ${step.id}: outcome puanı aralık dışı (${o.points})`);
            }
          }
        }
        if (step.kind === "decision") {
          for (const o of step.options) {
            if (!Number.isFinite(o.points)) {
              issues.push(`step ${step.id}/${o.id}: opsiyon puanı sayısal değil`);
              continue;
            }
            if (o.points < -100 || o.points > 50) {
              issues.push(`step ${step.id}/${o.id}: opsiyon puanı aralık dışı (${o.points})`);
            }
          }
        }
      }
      expect(issues, `${scenario.id} → puan aralığı`).toEqual([]);
    });

    test("scoring.max_points = pozitif outcome+option puanlarının toplamı (S1, allow_multiple yok)", () => {
      // Bu kontrol denge uyumsuzluğu yakalamak içindir:
      // max_points senaryo yazarınca elle yazılır; gerçekçilik için
      // S1 görünür pozitif puanların toplamı civarında olmalı.
      const computed = sumPositivePointsAtDifficulty(scenario, 1);
      // %20 tolerans (action+decision adımlarında bonus/critical değişiklikler)
      const stated = scenario.scoring.max_points;
      const ratio = computed === 0 ? 0 : stated / computed;
      // Sadece kayda değer sapma flagle (0.5 .. 1.5 dışı)
      if (ratio < 0.5 || ratio > 1.5) {
        throw new Error(
          `${scenario.id}: scoring.max_points=${stated} ile S1 hesaplanan pozitif toplam=${computed} arasında %50'den fazla sapma. Senaryo dengesi gözden geçirilmeli (klinik dosya değiştirilmedi — manuel kontrol).`
        );
      }
    });

    test("scoring.passing_score < max_points", () => {
      expect(
        scenario.scoring.passing_score,
        `${scenario.id} passing_score >= max_points`
      ).toBeLessThan(scenario.scoring.max_points);
    });

    test("grade_bands sıralı (A > B > C > D) — helper sonucuyla", () => {
      const { A, B, C, D } = getEffectiveGradeBands(scenario.scoring);
      expect(A, `${scenario.id} A<=B`).toBeGreaterThan(B);
      expect(B, `${scenario.id} B<=C`).toBeGreaterThan(C);
      expect(C, `${scenario.id} C<=D`).toBeGreaterThan(D);
    });

    test("max_points >= auto-play en iyi skor (denge sanity check)", () => {
      const { totalPoints } = autoPlayBestPath(scenario, 1);
      expect(
        scenario.scoring.max_points,
        `${scenario.id}: max_points (${scenario.scoring.max_points}) auto-play en iyi skor (${totalPoints})'dan küçük`
      ).toBeGreaterThanOrEqual(totalPoints);
      if (scenario.scoring.max_points - totalPoints > 20) {
        // eslint-disable-next-line no-console
        console.warn(
          `${scenario.id}: max_points (${scenario.scoring.max_points}) auto-play sonucu (${totalPoints})'dan çok yüksek — bonus outcome'lar eksik olabilir`
        );
      }
    });

    test("lab_panel referansları (varsa) panel id'leri ile eşleşiyor", () => {
      if (!scenario.lab_panels) return;
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind !== "action") continue;
        for (const o of step.expected_outcomes) {
          if (o.action.type === "order_test") {
            const id = o.action.target_id;
            // Lab panel ID'si lab_panels'da olabilir (lab) veya available_equipment'ta olabilir (görüntüleme)
            const isLab = scenario.lab_panels && id in scenario.lab_panels;
            const isImaging = scenario.imaging_results && id in scenario.imaging_results;
            const isEquipment = scenario.available_equipment.includes(id);
            if (!isLab && !isImaging && !isEquipment) {
              issues.push(`step ${step.id}: order_test '${id}' lab_panels/imaging_results/equipment'ta yok`);
            }
          }
        }
      }
      expect(issues, `${scenario.id} → order_test referansları`).toEqual([]);
    });

    test("debrief.references en az 1 kaynak içeriyor", () => {
      expect(scenario.debrief.references.length, `${scenario.id}`).toBeGreaterThan(0);
    });

    test("feedback metinleri en az 20 karakter", () => {
      const issues: string[] = [];
      for (const step of scenario.steps) {
        if (step.kind === "action") {
          for (const o of step.expected_outcomes) {
            if (!o.feedback || o.feedback.trim().length < 20) {
              issues.push(`step ${step.id}: outcome feedback çok kısa veya boş`);
            }
          }
        }
        if (step.kind === "decision") {
          for (const o of step.options) {
            if (!o.feedback || o.feedback.trim().length < 20) {
              issues.push(`step ${step.id}/${o.id}: opsiyon feedback çok kısa`);
            }
          }
        }
      }
      expect(issues, `${scenario.id} → kısa feedback`).toEqual([]);
    });

    test("supported_difficulties tutarlı (varsa) — senaryo difficulty'si listede", () => {
      if (!scenario.supported_difficulties) return;
      expect(
        scenario.supported_difficulties,
        `${scenario.id} supported_difficulties`
      ).toContain(scenario.difficulty);
    });
  }
);

// ------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const x of arr) {
    if (seen.has(x)) dup.add(x);
    seen.add(x);
  }
  return [...dup];
}

function sumPositivePointsAtDifficulty(scenario: Scenario, d: number): number {
  let total = 0;
  for (const step of scenario.steps) {
    const stepVisible =
      (step.min_difficulty ?? 1) <= d && (step.max_difficulty ?? 5) >= d;
    if (!stepVisible) continue;
    if (isAction(step)) {
      for (const o of step.expected_outcomes) {
        const visible =
          (o.min_difficulty ?? 1) <= d && (o.max_difficulty ?? 5) >= d;
        if (visible && o.points > 0) total += o.points;
      }
    } else if (isDecision(step)) {
      // En yüksek puanlı opsiyon
      const visibleOptions = step.options.filter(
        (o) => (o.min_difficulty ?? 1) <= d && (o.max_difficulty ?? 5) >= d
      );
      const positives = visibleOptions
        .map((o) => o.points)
        .filter((p) => p > 0);
      if (positives.length > 0) total += Math.max(...positives);
    }
  }
  return total;
}

function isAction(step: Step): step is ActionStep {
  return step.kind === "action";
}
function isDecision(step: Step): step is DecisionStep {
  return step.kind === "decision";
}
