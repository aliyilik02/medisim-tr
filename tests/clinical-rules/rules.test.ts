// ============================================================
// Türk Klinik Kural Motoru — Doğrulama + DRAFT İzolasyon Testleri
// ============================================================

import { describe, expect, test } from "vitest";
import ruleSet from "@/data/clinical-rules/turkiye-2024-draft.json";
import {
  validateRuleSet,
  validateRule,
} from "@/data/clinical-rules/_validators/rule-validator";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";
import type { ClinicalRuleSet } from "@/data/clinical-rules/schema";

const typedSet = ruleSet as ClinicalRuleSet;

describe("Clinical rules — Türkiye 2024 DRAFT", () => {
  test("set status DRAFT", () => {
    expect(typedSet.status).toBe("DRAFT");
  });

  test("kural sayısı brief sınırını aşmıyor (≤10)", () => {
    expect(typedSet.rules.length).toBeLessThanOrEqual(10);
  });

  test("tüm kurallar REVIEWED_PENDING_ACTIVATION bayrağı taşıyor (review tamam, aktivasyon bekliyor)", () => {
    for (const rule of typedSet.rules) {
      expect(
        rule.status,
        `${rule.id}: status REVIEWED_PENDING_ACTIVATION olmalı`
      ).toBe("REVIEWED_PENDING_ACTIVATION");
    }
  });

  test("hiçbir kural ACTIVE değil (kullanıcı manuel aktivasyon gerekli)", () => {
    const active = typedSet.rules.filter((r) => r.status === "ACTIVE");
    expect(active.length).toBe(0);
  });

  test("şema doğrulaması: tüm kurallar yapısal olarak geçerli", () => {
    const issues = validateRuleSet(typedSet);
    expect(issues, `şema sorunları: ${issues.join(" | ")}`).toEqual([]);
  });

  test("her kural geçerli senaryo ID'sine işaret ediyor", () => {
    const validIds = new Set(ALL_SCENARIOS.map((s) => s.id));
    for (const rule of typedSet.rules) {
      for (const scenarioId of rule.affects_scenarios) {
        expect(
          validIds.has(scenarioId),
          `${rule.id}: bilinmeyen senaryo '${scenarioId}'`
        ).toBe(true);
      }
    }
  });

  test("kural ID'leri unique", () => {
    const ids = typedSet.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("rule_text_tr en az 20 karakter (anlamlı içerik)", () => {
    for (const rule of typedSet.rules) {
      expect(
        rule.rule_text_tr.length,
        `${rule.id}: rule_text_tr çok kısa`
      ).toBeGreaterThanOrEqual(20);
    }
  });

  test("validation.type bilinen değerlerde", () => {
    const valid = ["expected_outcome", "decision_correct", "min_difficulty", "score"];
    for (const rule of typedSet.rules) {
      expect(valid).toContain(rule.validation.type);
    }
  });

  test("affects_steps belirtilen kurallarda gerçek step ID'leri", () => {
    for (const rule of typedSet.rules) {
      if (!rule.affects_steps) continue;
      for (const scenarioId of rule.affects_scenarios) {
        const sc = ALL_SCENARIOS.find((s) => s.id === scenarioId);
        if (!sc) continue;
        const stepIds = new Set(sc.steps.map((st) => st.id));
        for (const stepId of rule.affects_steps) {
          expect(
            stepIds.has(stepId),
            `${rule.id}: ${scenarioId} senaryosunda '${stepId}' adımı yok`
          ).toBe(true);
        }
      }
    }
  });
});

describe("Rule validator helper — birim testleri", () => {
  test("geçerli kural issues döndürmez", () => {
    const valid = typedSet.rules[0];
    expect(validateRule(valid)).toEqual([]);
  });

  test("source bilinmiyorsa issue döner", () => {
    const bad = { ...typedSet.rules[0], source: "FOO" as never };
    const issues = validateRule(bad);
    expect(issues.some((i) => i.includes("source"))).toBe(true);
  });

  test("rule_text_tr çok kısaysa issue döner", () => {
    const bad = { ...typedSet.rules[0], rule_text_tr: "kısa" };
    const issues = validateRule(bad);
    expect(issues.some((i) => i.includes("rule_text_tr"))).toBe(true);
  });
});

describe("DRAFT izolasyon — engine'e bağlı değil", () => {
  test("engine kaynak dosyaları clinical-rules import etmiyor", async () => {
    // Bu test, DRAFT kuralların yanlışlıkla engine'e enjekte edilmediğini
    // doğrular. Engine kaynaklarında 'clinical-rules' string'i bulunmamalı.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const engineDir = path.resolve(process.cwd(), "src/engine");
    const files = await collectTsFiles(engineDir, fs);
    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      expect(
        content.includes("clinical-rules"),
        `${file} clinical-rules import ediyor — DRAFT canlı engine'e sızmamalı`
      ).toBe(false);
    }
  });

  async function collectTsFiles(
    dir: string,
    fs: typeof import("node:fs/promises")
  ): Promise<string[]> {
    const path = await import("node:path");
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await collectTsFiles(p, fs);
        results.push(...sub);
      } else if (entry.name.endsWith(".ts")) {
        results.push(p);
      }
    }
    return results;
  }
});
