// ============================================================
// MediSim TR — Türk Klinik Kural Motoru Şeması (DRAFT)
// ============================================================
// AI tarafından önerilen klinik kuralları yapılandırılmış formatta
// taşır. Hiçbir kural otomatik olarak engine'e uygulanmaz —
// kullanıcı manuel review + ACTIVE bayrağı olmadan canlıya çıkmaz.
//
// Bayrak hiyerarşisi:
//   DRAFT_NEEDS_REVIEW         → AI önerdi, klinik review bekliyor
//   REVIEWED_PENDING_ACTIVATION → İnsan review etti, manuel aktivasyon
//   ACTIVE                     → Canlı; engine ve testler zorunlu kılar
// ============================================================

export type ClinicalRuleStatus =
  | "DRAFT_NEEDS_REVIEW"
  | "REVIEWED_PENDING_ACTIVATION"
  | "ACTIVE";

export type ClinicalRuleSource =
  | "TARD"           // Türk Anesteziyoloji ve Reanimasyon Derneği
  | "BDHD"           // Beyin Damar Hastalıkları Derneği (TR)
  | "TKD"            // Türk Kardiyoloji Derneği
  | "Türk Cerrahi"   // Türk Cerrahi Derneği
  | "ACOG-MFTP-TR"   // ACOG (TR çevirisi, MFTP referanslı)
  | "ESC"            // European Society of Cardiology
  | "WAO"            // World Allergy Organization
  | "BTF"            // Brain Trauma Foundation
  | "WALLS"          // Walls Manual of Emergency Airway Management
  | "WSES"           // World Society of Emergency Surgery
  | "SSC"            // Surviving Sepsis Campaign
  | "Other";

export type ClinicalRuleValidationType =
  | "expected_outcome"
  | "decision_correct"
  | "min_difficulty"
  | "score";

export interface ClinicalRule {
  id: string;
  source: ClinicalRuleSource;
  source_year: number;
  source_section?: string;

  rule_text_tr: string;
  rule_text_en?: string;

  affects_scenarios: string[];
  affects_steps?: string[];

  validation: {
    type: ClinicalRuleValidationType;
    description: string;
  };

  status: ClinicalRuleStatus;

  reviewed_by?: string;
  reviewed_at?: string;

  notes?: string;
}

export interface ClinicalRuleSet {
  version: string;
  status: "DRAFT" | "ACTIVE";
  generated_at: string;
  generated_by: string;
  rules: ClinicalRule[];
}
