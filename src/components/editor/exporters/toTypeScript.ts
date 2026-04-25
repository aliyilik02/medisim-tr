import type { Scenario, PatientVitals, Patient } from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";

const DEFAULT_VITALS: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 80,
  spo2: 98, temp: 37.0, rr: 16, gcs: 15,
};

const DEFAULT_PATIENT: Patient = {
  age: 50, sex: "M", weight_kg: 70,
  chief_complaint: "", history_items: [], allergies: [],
  current_medications: [], modifiers: {},
};

const DEFAULT_SCORING = {
  max_points: 100,
  passing_score: 60,
  grade_bands: { A: 90, B: 75, C: 60, D: 45 },
};

const DEFAULT_DEBRIEF = { key_learnings: [], references: [] };

export function draftToScenario(draft: Partial<StoredScenario>): Scenario {
  const now = new Date().toISOString().split("T")[0];
  return {
    id: draft.id ?? `local-${Date.now()}`,
    version: draft.version ?? "1.0.0",
    title: draft.title?.trim() ?? "Adsız Senaryo",
    description: draft.description ?? "",
    specialty: draft.specialty ?? "dahiliye",
    tags: draft.tags ?? [],
    difficulty: draft.difficulty ?? 3,
    supported_difficulties: draft.supported_difficulties ?? [3],
    estimated_minutes: draft.estimated_minutes ?? 15,
    modes: draft.modes ?? ["quiz"],
    language: "tr",
    author: draft.author,
    reviewed_by: draft.reviewed_by,
    last_updated: draft.last_updated ?? now,
    patient: draft.patient ?? DEFAULT_PATIENT,
    initial_vitals: draft.initial_vitals ?? DEFAULT_VITALS,
    available_medications: draft.available_medications ?? [],
    available_equipment: draft.available_equipment ?? [],
    steps: draft.steps ?? [],
    start_step_id: draft.start_step_id ?? "",
    ekg_pattern: draft.ekg_pattern,
    scoring: draft.scoring ?? DEFAULT_SCORING,
    debrief: draft.debrief ?? DEFAULT_DEBRIEF,
  };
}

function toCamelId(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z_]/, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
}

export function toTypeScript(draft: Partial<StoredScenario>): string {
  const scenario = draftToScenario(draft);
  const date = new Date().toISOString().split("T")[0];
  const rawId = scenario.id.replace(/local-\d+/, "senaryo");
  const varName = `scenario_${toCamelId(rawId)}`;
  const body = JSON.stringify(scenario, null, 2);

  return [
    `// MediSim TR editöründen üretildi — ${date}`,
    `// Projeye eklemek için:`,
    `//   1. Bu dosyayı src/data/scenarios/<dosya-adı>.ts olarak kaydet`,
    `//   2. src/data/scenarios/index.ts'e ekle:`,
    `//      import { ${varName} } from "./<dosya-adı>";`,
    `//      SCENARIOS dizisine ekle: [..., ${varName}]`,
    ``,
    `import type { Scenario } from "@/engine";`,
    ``,
    `export const ${varName}: Scenario = ${body};`,
  ].join("\n");
}
