// ============================================================
// MediSim TR — FHIR eşleme katmanı public API
// ============================================================
// Senaryo → FHIR R4 (Patient/Condition/MedicationRequest/Observation)
// saf eşleme fonksiyonları. Kullanım:
//   import { scenarioToPatient, vitalsToObservations } from "@/clinical/fhir";
// ============================================================

export {
  scenarioToPatient,
  scenarioToConditions,
  scenarioToMedicationRequests,
  vitalsToObservations,
  type ScenarioToPatientOptions,
} from "./scenarioToFhir";
