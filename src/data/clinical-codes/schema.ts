// ============================================================
// MediSim TR — Klinik Kod Şeması
// ============================================================
// ICD-10 / SNOMED CT / RxNorm — uluslararası standart kodlar.
// Bu şema yalnızca veri taşıma için. Engine logic'ine bağlı değil.
//
// Faz 4 (3 Mayıs 2026): Şema + çekim altyapısı kuruldu, veri
// minimum subset olarak yüklendi. Senaryolarda referans verilmesi
// kullanıcı onayı sonrası ayrı bir aşamada yapılacak.
// ============================================================

export interface ClinicalCode {
  system: "ICD10" | "SNOMED-CT" | "RxNorm";
  code: string;
  display_en: string;
  display_tr?: string;
  parent?: string;
  status: "active" | "deprecated";
}

export interface MedicationMapping {
  medisim_id: string;       // bizim ID'miz (örn. "epinefrin")
  rxnorm_cui: string;       // RxNorm Concept Unique Identifier
  rxnorm_name: string;      // standardize isim (İngilizce)
  atc_code?: string;        // WHO ATC sınıfı
  verified_at: string;      // ISO date
  verified_by: "automated" | "manual";
}

export interface ScenarioCodeMapping {
  scenario_id: string;
  primary_diagnosis: {
    icd10: string;
    snomed_ct?: string;
  };
  related_conditions?: Array<{
    icd10: string;
    relationship: "comorbidity" | "complication" | "differential";
  }>;
}

export interface ClinicalCodesFile {
  version: string;
  fetched_at: string;
  source: string;
  codes: ClinicalCode[];
}

export interface ScenarioCodeMappingsFile {
  version: string;
  status: "DRAFT_NEEDS_REVIEW" | "REVIEWED_PENDING_ACTIVATION" | "ACTIVE";
  generated_at: string;
  mappings: ScenarioCodeMapping[];
}
