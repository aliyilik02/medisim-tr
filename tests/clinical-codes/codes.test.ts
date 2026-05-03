// ============================================================
// Klinik Kod Doğrulama Testleri
// ============================================================
// ICD-10, SNOMED CT, RxNorm kod dosyalarının yapı uygunluğunu
// kontrol eder. DRAFT bayrağı izolasyonunu koruyor.
// ============================================================

import { describe, expect, test } from "vitest";
import icd10Data from "@/data/clinical-codes/icd10/relevant-codes.json";
import snomedData from "@/data/clinical-codes/snomed/relevant-codes.json";
import rxnormData from "@/data/clinical-codes/rxnorm/medication-mappings.json";
import scenarioMappings from "@/data/clinical-codes/scenario-mappings.json";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";

describe("Clinical codes — ICD-10", () => {
  test("dosya yapı bütünlüğü", () => {
    expect(icd10Data.version).toBeDefined();
    expect(icd10Data.codes.length).toBeGreaterThan(0);
  });

  test("tüm kodlar valid format (X##.# desen veya X## veya XXX.#)", () => {
    const re = /^[A-Z]\d{1,2}(\.\d+)?$|^[A-Z]\d{2}$|^[A-Z]{3}$/;
    for (const c of icd10Data.codes) {
      expect(c.code, `geçersiz ICD-10 format: ${c.code}`).toMatch(re);
      expect(c.system).toBe("ICD10");
      expect(c.display_en.length).toBeGreaterThan(2);
    }
  });

  test("status değeri active veya deprecated", () => {
    for (const c of icd10Data.codes) {
      expect(["active", "deprecated"]).toContain(c.status);
    }
  });

  test("kod listesinde duplike yok", () => {
    const codes = icd10Data.codes.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("Clinical codes — SNOMED CT", () => {
  test("dosya yapı bütünlüğü", () => {
    expect(snomedData.version).toBeDefined();
    expect(snomedData.codes.length).toBeGreaterThan(0);
  });

  test("tüm SNOMED kodları sayısal string", () => {
    for (const c of snomedData.codes) {
      expect(c.code, `SNOMED kodları sayısal olmalı: ${c.code}`).toMatch(/^\d+$/);
      expect(c.system).toBe("SNOMED-CT");
    }
  });
});

describe("Clinical codes — RxNorm", () => {
  test("dosya DRAFT bayrağı taşıyor (otomatik review bekliyor)", () => {
    expect(rxnormData.status).toBe("DRAFT_NEEDS_REVIEW");
  });

  test("tüm CUI'lar sayısal string", () => {
    for (const m of rxnormData.mappings) {
      expect(m.rxnorm_cui, `CUI sayısal olmalı: ${m.rxnorm_cui}`).toMatch(/^\d+$/);
    }
  });

  test("medisim_id'ler unique", () => {
    const ids = rxnormData.mappings.map((m) => m.medisim_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("verified_by automated veya manual", () => {
    for (const m of rxnormData.mappings) {
      expect(["automated", "manual"]).toContain(m.verified_by);
    }
  });
});

describe("Scenario code mappings — DRAFT izolasyonu", () => {
  test("dosya status DRAFT_NEEDS_REVIEW", () => {
    expect(scenarioMappings.status).toBe("DRAFT_NEEDS_REVIEW");
  });

  test("her mapping geçerli senaryo ID'sine işaret ediyor", () => {
    const validIds = new Set(ALL_SCENARIOS.map((s) => s.id));
    for (const m of scenarioMappings.mappings) {
      expect(validIds.has(m.scenario_id), `geçersiz senaryo: ${m.scenario_id}`).toBe(true);
    }
  });

  test("her senaryo eşlemede primary_diagnosis.icd10 dolu", () => {
    for (const m of scenarioMappings.mappings) {
      expect(m.primary_diagnosis.icd10).toBeDefined();
      expect(m.primary_diagnosis.icd10.length).toBeGreaterThan(0);
    }
  });

  test("DRAFT mapping'lerin ICD-10 kodları kod listesinde mevcut", () => {
    const known = new Set(icd10Data.codes.map((c) => c.code));
    for (const m of scenarioMappings.mappings) {
      expect(
        known.has(m.primary_diagnosis.icd10),
        `${m.scenario_id}: ${m.primary_diagnosis.icd10} ICD-10 listesinde yok`
      ).toBe(true);
    }
  });

  test("DRAFT mappings senaryolarda referans EDİLMİYOR (engine bağı yok)", () => {
    // Senaryo şemasında clinical_codes alanı varsa scenarioMappings ile çakışmayı önle.
    // Şu an senaryo dosyalarında bu alan kullanılmıyor — DRAFT verisi engine'e bağlı değil.
    for (const sc of ALL_SCENARIOS) {
      expect(
        sc.clinical_codes,
        `${sc.id}: clinical_codes alanı senaryoda var — DRAFT henüz aktif değil, kullanıcı onayı sonrası ayrı PR olarak eklenmeli`
      ).toBeUndefined();
    }
  });
});
