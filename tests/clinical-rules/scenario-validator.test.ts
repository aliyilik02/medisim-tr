// ============================================================
// Senaryo Çapraz Doğrulayıcısı — Testler
// ============================================================
// DRAFT kuralların engine'i kırmadığını ve raporlama doğruluğunu test eder.
// ACTIVE kural davranışı simüle edilerek doğrulanır (gerçek kural ACTIVE değil).
// ============================================================

import { describe, expect, test } from "vitest";
import ruleSet from "@/data/clinical-rules/turkiye-2024-draft.json";
import {
  validateRuleAgainstScenarios,
  validateRuleSetAgainstScenarios,
  getApplicableRules,
} from "@/data/clinical-rules/_validators/scenario-validator";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";
import type { ClinicalRule, ClinicalRuleSet } from "@/data/clinical-rules/schema";

const typedSet = ruleSet as ClinicalRuleSet;

describe("Scenario validator — DRAFT kurallar", () => {
  test("rapor 'passed: true' (DRAFT engine'i kırmaz)", () => {
    const report = validateRuleSetAgainstScenarios(typedSet, ALL_SCENARIOS);
    expect(report.passed).toBe(true);
  });

  test("tüm kurallar draft sayısına dahil", () => {
    const report = validateRuleSetAgainstScenarios(typedSet, ALL_SCENARIOS);
    expect(report.draft_rules).toBe(typedSet.rules.length);
    expect(report.active_rules).toBe(0);
    expect(report.reviewed_rules).toBe(0);
  });

  test("üretilen issues severity 'info' (DRAFT için)", () => {
    const report = validateRuleSetAgainstScenarios(typedSet, ALL_SCENARIOS);
    for (const issue of report.issues) {
      expect(issue.severity).toBe("info");
    }
  });

  test("DRAFT kurallarda yapısal hata yok — bilinmeyen senaryo/step gözükmüyor", () => {
    const report = validateRuleSetAgainstScenarios(typedSet, ALL_SCENARIOS);
    const structural = report.issues.filter(
      (i) => i.message.includes("bilinmeyen") || i.message.includes("olmayan")
    );
    expect(
      structural,
      `Yapısal sorun var: ${structural.map((s) => s.message).join(" | ")}`
    ).toEqual([]);
  });
});

describe("Scenario validator — ACTIVE simülasyonu (production hazır mı)", () => {
  test("bilinmeyen senaryoyu hedefleyen ACTIVE kural error üretir", () => {
    const fake: ClinicalRule = {
      ...typedSet.rules[0],
      status: "ACTIVE",
      affects_scenarios: ["bilinmeyen_senaryo_xyz"],
    };
    const issues = validateRuleAgainstScenarios(fake, ALL_SCENARIOS);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("bilinmeyen");
  });

  test("olmayan adımı hedefleyen ACTIVE kural error üretir", () => {
    const sc = ALL_SCENARIOS[0];
    const fake: ClinicalRule = {
      ...typedSet.rules[0],
      status: "ACTIVE",
      affects_scenarios: [sc.id],
      affects_steps: ["bu_adim_yok"],
    };
    const issues = validateRuleAgainstScenarios(fake, ALL_SCENARIOS);
    const stepIssue = issues.find((i) => i.message.includes("olmayan"));
    expect(stepIssue).toBeDefined();
    expect(stepIssue!.severity).toBe("error");
  });

  test("validation.type=decision_correct ama step kind='action' uyumsuz", () => {
    const sc = ALL_SCENARIOS.find((s) => s.steps.some((st) => st.kind === "action"));
    expect(sc).toBeDefined();
    const actionStep = sc!.steps.find((st) => st.kind === "action")!;
    const fake: ClinicalRule = {
      ...typedSet.rules[0],
      status: "ACTIVE",
      affects_scenarios: [sc!.id],
      affects_steps: [actionStep.id],
      validation: { type: "decision_correct", description: "smoke" },
    };
    const issues = validateRuleAgainstScenarios(fake, ALL_SCENARIOS);
    const typeIssue = issues.find((i) => i.message.includes("decision_correct"));
    expect(typeIssue).toBeDefined();
    expect(typeIssue!.severity).toBe("error");
  });

  test("REVIEWED_PENDING_ACTIVATION severity 'warning'", () => {
    const fake: ClinicalRule = {
      ...typedSet.rules[0],
      status: "REVIEWED_PENDING_ACTIVATION",
      affects_scenarios: ["bilinmeyen"],
    };
    const issues = validateRuleAgainstScenarios(fake, ALL_SCENARIOS);
    expect(issues[0]?.severity).toBe("warning");
  });
});

describe("getApplicableRules", () => {
  test("senaryo bazlı kural filtresi", () => {
    const rules = getApplicableRules(typedSet, "kardiyoloji-stemi-001");
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.affects_scenarios).toContain("kardiyoloji-stemi-001");
    }
  });

  test("var olmayan senaryo için boş liste", () => {
    const rules = getApplicableRules(typedSet, "yok_boyle_bir_senaryo");
    expect(rules).toEqual([]);
  });
});
