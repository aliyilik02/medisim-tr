// ============================================================
// Klinik Review Hattı — durum yardımcıları + otomatik checklist
// ============================================================
// CLAUDE.md "Klinik İçerik Disiplini": bayrak DRAFT → REVIEWED_PENDING_
// ACTIVATION → ACTIVE; ACTIVE'e geçişi SADECE Ali Bey yapar. Bu modül saf
// fonksiyonel (React YOK) — durum okuma + senaryonun klinik bütünlüğüne dair
// OTOMATİK ipuçları üretir. Otomatik kontroller insan review'ının yerine
// GEÇMEZ; eksikleri işaretler, Ali Bey'in manuel kararını hızlandırır.
// ============================================================

import type { Scenario, ClinicalReviewStatus } from "./types";

export const CLINICAL_STATUS_ORDER: ClinicalReviewStatus[] = [
  "DRAFT",
  "REVIEWED_PENDING_ACTIVATION",
  "ACTIVE",
];

export const CLINICAL_STATUS_LABEL: Record<ClinicalReviewStatus, string> = {
  DRAFT: "Taslak",
  REVIEWED_PENDING_ACTIVATION: "İncelendi · aktivasyon bekliyor",
  ACTIVE: "Aktif",
};

/** Senaryonun klinik durumu — alan yoksa GÜVENLİ varsayılan DRAFT. */
export function getClinicalStatus(scenario: Scenario): ClinicalReviewStatus {
  return scenario.clinical_review?.status ?? "DRAFT";
}

/** Yalnızca ACTIVE senaryolar klinik olarak "yayında" sayılır. */
export function isScenarioActive(scenario: Scenario): boolean {
  return getClinicalStatus(scenario) === "ACTIVE";
}

export interface ChecklistItem {
  key: string;
  label: string;
  /** Otomatik geçti mi (true), kaldı mı (false), yoksa elle-doğrulanır mı (null). */
  pass: boolean | null;
  detail: string;
}

/**
 * Senaryonun klinik bütünlüğüne dair OTOMATİK kontroller.
 * pass=null → makinece doğrulanamaz, Ali Bey elle bakar.
 */
export function buildReviewChecklist(scenario: Scenario): ChecklistItem[] {
  const isPediatric =
    scenario.patient.age < 18 || (scenario.patient.weight_kg ?? 99) < 40;
  const refs = scenario.debrief?.references ?? [];
  const draftAreas = scenario.clinical_review?.draft_areas ?? [];

  return [
    {
      key: "guideline_references",
      label: "TR/uluslararası kılavuz referansı (≥1)",
      pass: refs.length >= 1,
      detail:
        refs.length >= 1
          ? `${refs.length} referans (debrief)`
          : "debrief.references boş — min 1 kılavuz zorunlu (CLAUDE.md 9.B)",
    },
    {
      key: "icd10",
      label: "ICD-10 kodu",
      pass: Boolean(scenario.clinical_codes?.icd10),
      detail: scenario.clinical_codes?.icd10
        ? scenario.clinical_codes.icd10
        : "clinical_codes.icd10 yok",
    },
    {
      key: "snomed",
      label: "SNOMED CT kodu",
      pass: Boolean(scenario.clinical_codes?.snomed_ct),
      detail: scenario.clinical_codes?.snomed_ct
        ? scenario.clinical_codes.snomed_ct
        : "clinical_codes.snomed_ct yok",
    },
    {
      key: "pediatric_dosing",
      label: isPediatric ? "Pediatrik mg/kg + max doz (elle)" : "Pediatrik doz (uygulanmaz)",
      pass: isPediatric ? null : true,
      detail: isPediatric
        ? `${scenario.patient.age} yaş / ${scenario.patient.weight_kg ?? "?"} kg — mg/kg + max doz elle doğrula (CLAUDE.md 9.D)`
        : "Erişkin senaryo",
    },
    {
      key: "draft_areas",
      label: "Çözülmemiş DRAFT alanı yok",
      pass: draftAreas.length === 0,
      detail:
        draftAreas.length === 0
          ? "—"
          : `Review bekleyen: ${draftAreas.join(", ")}`,
    },
    {
      key: "dose_guideline",
      label: "İlaç dozları kılavuz uyumlu (elle)",
      pass: null,
      detail: "ESC/AHA/TKD 2022-2024 — /ilac-dozaj-dogrulayici ile teyit et",
    },
    {
      key: "age_vitals",
      label: isPediatric ? "PALS yaş-spesifik vital (elle)" : "Yaş-spesifik vital (elle)",
      pass: null,
      detail: "initial_vitals yaş normuyla uyumlu mu (CLAUDE.md 9.C)",
    },
  ];
}

/** Otomatik kontrollerin tümü geçti mi (null = elle olanlar hariç). */
export function autoChecksPass(scenario: Scenario): boolean {
  return buildReviewChecklist(scenario).every((c) => c.pass !== false);
}
