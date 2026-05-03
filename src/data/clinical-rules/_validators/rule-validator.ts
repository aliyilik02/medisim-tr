// ============================================================
// Klinik Kural Şema Doğrulayıcısı (engine bağı YOK)
// ============================================================
// JSON kural dosyasının yapı doğruluğunu kontrol eder. Bu fonksiyon
// engine logic'i değil — sadece veri katmanı sağlığı.
// ============================================================

import type { ClinicalRule, ClinicalRuleSet } from "../schema";

const VALID_SOURCES = new Set([
  "TARD", "BDHD", "TKD", "Türk Cerrahi", "ACOG-MFTP-TR",
  "ESC", "WAO", "BTF", "WALLS", "WSES", "SSC", "Other",
]);

const VALID_VALIDATION_TYPES = new Set([
  "expected_outcome", "decision_correct", "min_difficulty", "score",
]);

const VALID_STATUSES = new Set([
  "DRAFT_NEEDS_REVIEW", "REVIEWED_PENDING_ACTIVATION", "ACTIVE",
]);

export function validateRule(rule: ClinicalRule): string[] {
  const issues: string[] = [];
  if (!rule.id) issues.push("id eksik");
  if (!VALID_SOURCES.has(rule.source)) issues.push(`source bilinmiyor: ${rule.source}`);
  if (typeof rule.source_year !== "number") issues.push("source_year sayısal olmalı");
  if (!rule.rule_text_tr || rule.rule_text_tr.length < 20) {
    issues.push("rule_text_tr en az 20 karakter olmalı");
  }
  if (!Array.isArray(rule.affects_scenarios) || rule.affects_scenarios.length === 0) {
    issues.push("affects_scenarios boş olmamalı");
  }
  if (!rule.validation || !VALID_VALIDATION_TYPES.has(rule.validation.type)) {
    issues.push(`validation.type bilinmiyor: ${rule.validation?.type}`);
  }
  if (!VALID_STATUSES.has(rule.status)) {
    issues.push(`status bilinmiyor: ${rule.status}`);
  }
  return issues;
}

export function validateRuleSet(ruleSet: ClinicalRuleSet): string[] {
  const issues: string[] = [];
  if (!ruleSet.version) issues.push("version eksik");
  if (!["DRAFT", "ACTIVE"].includes(ruleSet.status)) {
    issues.push(`set status bilinmiyor: ${ruleSet.status}`);
  }
  if (!Array.isArray(ruleSet.rules)) {
    issues.push("rules array değil");
    return issues;
  }
  const ids = new Set<string>();
  for (const rule of ruleSet.rules) {
    if (ids.has(rule.id)) issues.push(`duplike rule id: ${rule.id}`);
    ids.add(rule.id);
    const ri = validateRule(rule);
    for (const e of ri) issues.push(`${rule.id}: ${e}`);
  }
  return issues;
}
