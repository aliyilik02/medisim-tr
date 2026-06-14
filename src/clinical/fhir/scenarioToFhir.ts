// ============================================================
// MediSim TR — Senaryo → FHIR R4 eşleme katmanı
// ============================================================
// SAF fonksiyonlar (React/network/server YOK). Engine/UI ayrımına uyar:
// burada hiçbir yan etki yoktur, sadece MediSim Scenario/PatientVitals
// tiplerini @medplum/fhirtypes (Apache-2.0) FHIR R4 kaynaklarına çevirir.
//
// Amaç: dışa aktarım/birlikte çalışabilirlik (interoperability). Bu modül
// klinik karar üretmez; var olan senaryo verisini standart FHIR şeklinde
// yansıtır. Gerçek Scenario/PatientVitals şeması src/engine/types.ts'den
// türetilmiştir — var olmayan alan uydurulmaz, opsiyoneller guard'lanır.
// ============================================================

import type { Scenario, PatientVitals } from "@/engine";
import type {
  Patient as FhirPatient,
  Condition as FhirCondition,
  MedicationRequest as FhirMedicationRequest,
  Observation as FhirObservation,
  CodeableConcept,
  Reference,
} from "@medplum/fhirtypes";

// ------------------------------------------------------------
// Kodlama sistemleri (terminology systems)
// ------------------------------------------------------------

/** ICD-10 (FHIR resmi sid URI'si) */
const ICD10_SYSTEM = "http://hl7.org/fhir/sid/icd-10";
/** SNOMED CT */
const SNOMED_SYSTEM = "http://snomed.info/sct";
/** LOINC — gözlem (Observation) kodları */
const LOINC_SYSTEM = "http://loinc.org";
/** UCUM — ölçü birimleri */
const UCUM_SYSTEM = "http://unitsofmeasure.org";

// ------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------

/** Senaryo id'sinden kararlı (deterministik) bir Patient referansı üretir.
    Senaryo başına tek mantıksal hasta olduğu için id = scenario.id yeterli. */
function patientReference(scenario: Scenario): Reference<FhirPatient> {
  return { reference: `Patient/${scenario.id}` };
}

/** Hastanın yaşından yaklaşık doğum tarihi (YYYY) türetir.
    Saha verisinde tam doğum tarihi yok — FHIR birthDate kısmi (yıl) olabilir.
    referenceYear verilmezse bilinçli olarak sabit bir taban kullanılır ki
    çıktı deterministik olsun (testlerde tarih kayması yaşanmaz). */
function birthYearFromAge(age: number, referenceYear: number): string | undefined {
  if (!Number.isFinite(age) || age < 0) return undefined;
  const year = referenceYear - Math.floor(age);
  // FHIR date: kısmi tarih (yalnız yıl) geçerlidir.
  return String(year);
}

/** MediSim sex (M/F) → FHIR administrative gender. */
function mapGender(sex: "M" | "F"): FhirPatient["gender"] {
  if (sex === "M") return "male";
  if (sex === "F") return "female";
  return "unknown";
}

/** LOINC kodlu CodeableConcept üretir. */
function loincConcept(code: string, display: string): CodeableConcept {
  return {
    coding: [{ system: LOINC_SYSTEM, code, display }],
    text: display,
  };
}

// ------------------------------------------------------------
// Patient
// ------------------------------------------------------------

export interface ScenarioToPatientOptions {
  /** Yaştan doğum yılı türetmek için referans yıl. Verilmezse 2026
      (deterministik çıktı). Çağıran isterse `new Date().getFullYear()` geçer. */
  referenceYear?: number;
  /** Opsiyonel hasta adı (saha verisinde genelde yok — KVKK gereği boş bırakılır). */
  name?: string;
}

/**
 * Senaryonun patient bloğunu FHIR Patient kaynağına çevirir.
 * gender ve (yaştan türetilen) birthDate dolar; name opsiyoneldir.
 */
export function scenarioToPatient(
  scenario: Scenario,
  options: ScenarioToPatientOptions = {},
): FhirPatient {
  const { referenceYear = 2026, name } = options;
  const p = scenario.patient;

  const patient: FhirPatient = {
    resourceType: "Patient",
    id: scenario.id,
    gender: mapGender(p.sex),
  };

  const birthDate = birthYearFromAge(p.age, referenceYear);
  if (birthDate) patient.birthDate = birthDate;

  if (name && name.trim().length > 0) {
    patient.name = [{ text: name.trim() }];
  }

  return patient;
}

// ------------------------------------------------------------
// Condition (tanılar — ICD-10 / SNOMED CT)
// ------------------------------------------------------------

/**
 * Senaryonun clinical_codes alanından Condition[] üretir.
 * ICD-10 birincil coding, SNOMED CT (varsa) ikincil coding olur.
 * Kod yoksa boş dizi döner (guard).
 *
 * NOT: Gerçek şemada tanı kodu scenario.clinical_codes.icd10/snomed_ct'tedir
 * (src/engine/types.ts Scenario). Top-level scenario.icd10 alanı YOKTUR.
 */
export function scenarioToConditions(scenario: Scenario): FhirCondition[] {
  const codes = scenario.clinical_codes;
  if (!codes) return [];

  const coding: NonNullable<CodeableConcept["coding"]> = [];

  if (codes.icd10 && codes.icd10.trim().length > 0) {
    coding.push({ system: ICD10_SYSTEM, code: codes.icd10.trim() });
  }
  if (codes.snomed_ct && codes.snomed_ct.trim().length > 0) {
    coding.push({ system: SNOMED_SYSTEM, code: codes.snomed_ct.trim() });
  }

  if (coding.length === 0) return [];

  const condition: FhirCondition = {
    resourceType: "Condition",
    subject: patientReference(scenario),
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active",
        },
      ],
    },
    code: {
      coding,
      // Senaryo başlığını insan-okunur metin olarak ekle.
      text: scenario.title,
    },
  };

  return [condition];
}

// ------------------------------------------------------------
// MedicationRequest (hastanın mevcut ilaçları)
// ------------------------------------------------------------

/**
 * Hastanın current_medications listesinden MedicationRequest[] üretir.
 * Bu ilaçlar hastanın senaryo öncesi kullandığı (ev) ilaçlarıdır → intent "plan".
 * Bunlar serbest metin (TR isim) olduğu için kodlanmış sistem yerine
 * medicationCodeableConcept.text kullanılır. Liste boş/yoksa boş dizi döner.
 */
export function scenarioToMedicationRequests(scenario: Scenario): FhirMedicationRequest[] {
  const meds = scenario.patient.current_medications;
  if (!meds || meds.length === 0) return [];

  const subject = patientReference(scenario);

  return meds
    .filter((m) => typeof m === "string" && m.trim().length > 0)
    .map((m) => {
      const request: FhirMedicationRequest = {
        resourceType: "MedicationRequest",
        status: "active",
        intent: "plan",
        subject,
        medicationCodeableConcept: { text: m.trim() },
      };
      return request;
    });
}

// ------------------------------------------------------------
// Observation (vitaller — LOINC + UCUM)
// ------------------------------------------------------------

/** Tek alanlı vital → Observation tanımı (LOINC kodu + UCUM birimi). */
interface VitalObsSpec {
  loinc: string;
  display: string;
  unit: string; // UCUM kod
  value: number;
}

/** vital-signs kategorisi (FHIR Observation category). */
const VITAL_SIGNS_CATEGORY: CodeableConcept = {
  coding: [
    {
      system: "http://terminology.hl7.org/CodeSystem/observation-category",
      code: "vital-signs",
      display: "Vital Signs",
    },
  ],
  text: "Vital Signs",
};

function buildObservation(spec: VitalObsSpec): FhirObservation {
  return {
    resourceType: "Observation",
    status: "final",
    category: [VITAL_SIGNS_CATEGORY],
    code: loincConcept(spec.loinc, spec.display),
    valueQuantity: {
      value: spec.value,
      unit: spec.unit,
      system: UCUM_SYSTEM,
      code: spec.unit,
    },
  };
}

/**
 * PatientVitals → FHIR Observation[]. Her ölçülen vital ayrı bir gözlemdir.
 * LOINC kodları:
 *   HR 8867-4, SpO2 59408-5, sistolik KB 8480-6, diastolik KB 8462-4,
 *   solunum 9279-1, vücut ısısı 8310-5.
 * Opsiyonel/eksik (NaN, undefined) alanlar guard'lanır — sadece geçerli
 * sayısal değerler gözleme çevrilir.
 */
export function vitalsToObservations(v: PatientVitals): FhirObservation[] {
  const specs: Array<VitalObsSpec | null> = [
    isNum(v.hr) ? { loinc: "8867-4", display: "Heart rate", unit: "/min", value: v.hr } : null,
    isNum(v.spo2) ? { loinc: "59408-5", display: "Oxygen saturation in Arterial blood by Pulse oximetry", unit: "%", value: v.spo2 } : null,
    isNum(v.bp_systolic) ? { loinc: "8480-6", display: "Systolic blood pressure", unit: "mm[Hg]", value: v.bp_systolic } : null,
    isNum(v.bp_diastolic) ? { loinc: "8462-4", display: "Diastolic blood pressure", unit: "mm[Hg]", value: v.bp_diastolic } : null,
    isNum(v.rr) ? { loinc: "9279-1", display: "Respiratory rate", unit: "/min", value: v.rr } : null,
    isNum(v.temp) ? { loinc: "8310-5", display: "Body temperature", unit: "Cel", value: v.temp } : null,
  ];

  return specs.filter((s): s is VitalObsSpec => s !== null).map(buildObservation);
}

/** Sonlu (finite) sayı guard — undefined ve NaN'ı eler. */
function isNum(x: number | undefined): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
