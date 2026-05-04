// ============================================================
// Türk Klinik Kural Motoru — Senaryo Çapraz Doğrulayıcısı
// ============================================================
// Bir kural setini gerçek senaryolar üzerinde validate eder.
//
// Önemli: Bu modül engine flow'una dokunmaz. evaluateAction /
// evaluateDecision çağrılmaz. Validator bir SCAN aracıdır:
//   - DRAFT_NEEDS_REVIEW kural → severity "info"  (engine'i kırmaz)
//   - REVIEWED_PENDING_ACTIVATION → severity "warning"
//   - ACTIVE → severity "error" (CI'da fail edebilir)
//
// Şu an tüm kurallar DRAFT, dolayısıyla validator daima passed döner.
// İlerideki ACTIVE aktivasyon için altyapı hazır.
//
// "Engine bağı YOK" testi için: bu dosya src/engine/ altında DEĞİL,
// src/data/clinical-rules/ altında. Engine import etmiyor.
// ============================================================

import type { ClinicalRule, ClinicalRuleSet, ClinicalRuleStatus } from "../schema";
import type { Scenario, Step } from "@/engine/types";

export type RuleSeverity = "info" | "warning" | "error";

export interface RuleValidationIssue {
  rule_id: string;
  severity: RuleSeverity;
  scenario_id?: string;
  step_id?: string;
  message: string;
}

export interface RuleValidationReport {
  total_rules: number;
  active_rules: number;
  reviewed_rules: number;
  draft_rules: number;
  issues: RuleValidationIssue[];
  /** ACTIVE kurallarda hata yoksa true. DRAFT/REVIEWED hatalar engelleyici değil. */
  passed: boolean;
}

const STATUS_TO_SEVERITY: Record<ClinicalRuleStatus, RuleSeverity> = {
  DRAFT_NEEDS_REVIEW: "info",
  REVIEWED_PENDING_ACTIVATION: "warning",
  ACTIVE: "error",
};

function findStep(scenario: Scenario, stepId: string): Step | undefined {
  return scenario.steps.find((s) => s.id === stepId);
}

function checkValidationTypeAgainstStep(rule: ClinicalRule, step: Step): string | null {
  switch (rule.validation.type) {
    case "decision_correct":
      if (step.kind !== "decision") {
        return `validation.type=decision_correct ama step '${step.id}' bir 'decision' değil (kind=${step.kind})`;
      }
      return null;
    case "expected_outcome":
      if (step.kind !== "action") {
        return `validation.type=expected_outcome ama step '${step.id}' bir 'action' değil (kind=${step.kind})`;
      }
      return null;
    case "min_difficulty":
      return null;
    case "score":
      return null;
    default:
      return `Bilinmeyen validation.type: ${(rule.validation as { type?: string }).type}`;
  }
}

export function validateRuleAgainstScenarios(
  rule: ClinicalRule,
  scenarios: Scenario[]
): RuleValidationIssue[] {
  const severity = STATUS_TO_SEVERITY[rule.status] ?? "warning";
  const issues: RuleValidationIssue[] = [];

  for (const scenarioId of rule.affects_scenarios) {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      issues.push({
        rule_id: rule.id,
        severity,
        scenario_id: scenarioId,
        message: `Kural bilinmeyen senaryoyu hedefliyor: ${scenarioId}`,
      });
      continue;
    }

    if (!rule.affects_steps?.length) continue;

    for (const stepId of rule.affects_steps) {
      const step = findStep(scenario, stepId);
      if (!step) {
        issues.push({
          rule_id: rule.id,
          severity,
          scenario_id: scenarioId,
          step_id: stepId,
          message: `Kural ${scenarioId} senaryosunda olmayan adımı hedefliyor: ${stepId}`,
        });
        continue;
      }

      const typeIssue = checkValidationTypeAgainstStep(rule, step);
      if (typeIssue) {
        issues.push({
          rule_id: rule.id,
          severity,
          scenario_id: scenarioId,
          step_id: stepId,
          message: typeIssue,
        });
      }
    }
  }

  return issues;
}

export function validateRuleSetAgainstScenarios(
  ruleSet: ClinicalRuleSet,
  scenarios: Scenario[]
): RuleValidationReport {
  const issues: RuleValidationIssue[] = [];
  let active = 0;
  let reviewed = 0;
  let draft = 0;

  for (const rule of ruleSet.rules) {
    if (rule.status === "ACTIVE") active++;
    else if (rule.status === "REVIEWED_PENDING_ACTIVATION") reviewed++;
    else if (rule.status === "DRAFT_NEEDS_REVIEW") draft++;
    issues.push(...validateRuleAgainstScenarios(rule, scenarios));
  }

  const blockingErrors = issues.filter((i) => i.severity === "error");

  return {
    total_rules: ruleSet.rules.length,
    active_rules: active,
    reviewed_rules: reviewed,
    draft_rules: draft,
    issues,
    passed: blockingErrors.length === 0,
  };
}

/**
 * Bir senaryo için geçerli kuralları döner. UI/raporlama amaçlı.
 * Kuralı "uygulamaz" — sadece eşleşen kuralı listeler.
 */
export function getApplicableRules(
  ruleSet: ClinicalRuleSet,
  scenarioId: string
): ClinicalRule[] {
  return ruleSet.rules.filter((r) => r.affects_scenarios.includes(scenarioId));
}
