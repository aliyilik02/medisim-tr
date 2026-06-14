// ============================================================
// MediSim TR — FHIR R4 Bundle birleştirici (dışa aktarım)
// ============================================================
// SAF fonksiyonlar (React/network/katalog bağımlılığı YOK). Var olan
// scenarioToFhir eşleyicilerini tek bir FHIR "collection" Bundle'ında toplar
// → dışa aktarım/birlikte çalışabilirlik. Oynanan seansın (final vital +
// verilen ilaçlar) klinik anlık görüntüsünü standart FHIR olarak yansıtır.
// Klinik karar üretmez. İlaç adları slug (medication_id) kalır — katalog
// çözümü çağırana bırakılır (modül saf tutulur).
// ============================================================

import type { Scenario, PatientVitals, SessionState } from "@/engine";
import type {
  Bundle,
  BundleEntry,
  Observation,
  MedicationAdministration,
  Reference,
  Patient as FhirPatient,
} from "@medplum/fhirtypes";
import {
  scenarioToPatient,
  scenarioToConditions,
  scenarioToMedicationRequests,
  vitalsToObservations,
  type ScenarioToPatientOptions,
} from "./scenarioToFhir";

function subjectRef(scenario: Scenario): Reference<FhirPatient> {
  return { reference: `Patient/${scenario.id}` };
}

/** Verilen (administered) ilaçları MedicationAdministration[]'a çevirir.
    medication_id slug olarak text'e yazılır (modül katalogdan bağımsız). */
function administeredToFhir(
  scenario: Scenario,
  session: SessionState
): MedicationAdministration[] {
  const actives = session.active_medications ?? [];
  const subject = subjectRef(scenario);
  return actives
    .filter((m) => typeof m.medication_id === "string" && m.medication_id.length > 0)
    .map((m) => ({
      resourceType: "MedicationAdministration",
      status: "completed",
      subject,
      medicationCodeableConcept: { text: m.medication_id },
    }));
}

/**
 * Senaryo + verilen vitalleri FHIR "collection" Bundle'ına toplar.
 * Patient + Condition[] + MedicationRequest[] (ev ilaçları) + Observation[]
 * (vital, subject referansı eklenmiş). Saf — yan etki yok.
 */
export function buildScenarioFhirBundle(
  scenario: Scenario,
  vitals: PatientVitals,
  options: ScenarioToPatientOptions = {}
): Bundle {
  const subject = subjectRef(scenario);
  const observations: Observation[] = vitalsToObservations(vitals).map((o) => ({
    ...o,
    subject,
  }));

  const resources = [
    scenarioToPatient(scenario, options),
    ...scenarioToConditions(scenario),
    ...scenarioToMedicationRequests(scenario),
    ...observations,
  ];

  const entry: BundleEntry[] = resources.map((resource) => ({ resource }));
  return { resourceType: "Bundle", type: "collection", entry };
}

/**
 * Oynanan SEANSI FHIR Bundle'ına çevirir: senaryo bundle'ı (final session
 * vitalleri ile) + verilen ilaçlar (MedicationAdministration). Debrief'te
 * "FHIR Bundle indir" için kullanılır.
 */
export function sessionToFhirBundle(
  scenario: Scenario,
  session: SessionState,
  options: ScenarioToPatientOptions = {}
): Bundle {
  const base = buildScenarioFhirBundle(scenario, session.vitals, options);
  const admins = administeredToFhir(scenario, session).map((resource) => ({ resource }));
  return { ...base, entry: [...(base.entry ?? []), ...admins] };
}
