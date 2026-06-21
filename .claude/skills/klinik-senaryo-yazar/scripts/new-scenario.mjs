#!/usr/bin/env node
/**
 * Kontrat-uyumlu senaryo İSKELETİ üretir (klinik-senaryo-yazar skill v2).
 * Kullanım: node new-scenario.mjs <slug> <specialty> [--write]
 *   node new-scenario.mjs toksikoloji-opioid-overdoz acil
 *   node new-scenario.mjs toksikoloji-opioid-overdoz acil --write   (dosyaya yazar)
 *
 * Çıktı: deterioration + gerçek dallanma + clinical_review DRAFT içeren,
 * defineScenario() ile sarılı, validate.mjs'ten geçecek iskelet.
 * ⚠️ Klinik DEĞER yok — hepsi TODO_KLINIK placeholder. Doldurmak skill/Claude.ai işi.
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const [slug, specialty] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const WRITE = process.argv.includes("--write");

if (!slug || !specialty) {
  console.error("Kullanım: node new-scenario.mjs <slug> <specialty> [--write]");
  process.exit(1);
}

const varName = "scenario_" + slug.replace(/-/g, "_");
const today = new Date().toISOString().slice(0, 10);

const tpl = `import { defineScenario } from "@/engine";

// ⚠️ DRAFT — klinik sayısal değerler TODO_KLINIK. ACTIVE onayı: Ali Bey.
export const ${varName} = defineScenario({
  id: "${slug}-001",
  version: "1.0.0",
  title: "TODO: Yaş Cinsiyet — Ana Şikayet",
  description: "TODO: 1-2 cümle klinik özet.",
  specialty: "${specialty}",
  tags: ["TODO", "TODO"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  last_updated: "${today}",

  patient: {
    age: 40, sex: "M", weight_kg: 70,
    chief_complaint: "TODO",
    history_items: ["TODO"],
    allergies: [],
  },
  // TODO_KLINIK: başlangıç vitalleri tabloya uygun mu — kaynak: ilgili kılavuz (yaşa göre PALS/erişkin)
  initial_vitals: { hr: 100, bp_systolic: 110, bp_diastolic: 70, spo2: 92, temp: 36.8, rr: 18 },

  available_medications: [/* TODO: katalog-id (medications.ts) */],
  available_equipment: ["monitor", "oksijen_maske", "iv_kateter_18g"],
  use_central_equipment_effects: true,

  start_step_id: "degerlendirme",
  steps: [
    {
      id: "degerlendirme", kind: "action",
      title: "İlk Değerlendirme", prompt: "TODO: hastayı değerlendir.",
      expected_outcomes: [
        { action: { type: "examine", target_id: "genel" }, points: 10,
          feedback: "TODO", unlocks: ["tani-karar"] },
      ],
      default_wrong_penalty: -5,
    },
    {
      id: "tani-karar", kind: "decision",
      title: "Tanı", prompt: "TODO: en olası tanı?",
      options: [
        { id: "dogru", text: "TODO doğru tanı", correct: true, points: 20, feedback: "TODO" },
        { id: "yanlis", text: "TODO çeldirici", correct: false, points: -10, feedback: "TODO", critical: true },
      ],
    },
    {
      id: "mudahale", kind: "action",
      title: "Müdahale", prompt: "TODO: ne yaparsın?",
      expected_outcomes: [
        // DOĞRU yol → iyi son
        { action: { type: "give_medication", target_id: "TODO" }, points: 30,
          feedback: "TODO", unlocks: ["stabilizasyon"] },
        // DALLANMA → komplikasyon (gerçek dallanma şartı)
        { action: { type: "use_equipment", target_id: "entubasyon_seti" }, points: 5,
          feedback: "TODO erken/yanlış", unlocks: ["komplikasyon"] },
      ],
      default_wrong_penalty: -10,
    },
    { id: "stabilizasyon", kind: "info", title: "Stabilizasyon",
      prompt: "Hasta stabil.", content: "TODO: iyi son anlatımı." },
    { id: "komplikasyon", kind: "info", title: "Komplikasyon",
      prompt: "Durum kötüleşti.", content: "TODO: komplikasyon anlatımı." },
  ],

  // ZORUNLU: en az 1 deterioration (cansız senaryo yasak)
  deterioration: [
    {
      id: "kotulesme",
      trends: [
        // TODO_KLINIK: trend hızı (delta_per_sec) — kaynak: ilgili kılavuz
        { vital: "spo2", delta_per_sec: -0.1, floor: 60 },
      ],
      halted_by: [{ type: "give_medication", target_id: "TODO" }],
      recovery_trends: [{ vital: "spo2", delta_per_sec: 0.3, ceiling: 97 }],
    },
  ],

  scoring: {
    max_points: 90, passing_score: 54, grading_mode: "auto",
    grade_bands: { A: 77, B: 63, C: 50, D: 36 }, score_floor: 0,
  },
  debrief: {
    key_learnings: ["TODO madde 1", "TODO madde 2"],
    references: ["TODO: ilgili kılavuz (clinical-sources.md)"],
  },
  clinical_review: { status: "DRAFT", draft_areas: ["doz", "deterioration", "vitals"] },
});
`;

if (WRITE) {
  const path = join(import.meta.dirname, "../../../../src/data/scenarios", `${slug}.ts`);
  if (existsSync(path)) {
    console.error(`✗ Zaten var: ${path}`);
    process.exit(1);
  }
  writeFileSync(path, tpl, "utf8");
  console.log(`✓ Yazıldı: src/data/scenarios/${slug}.ts`);
  console.log(`  Sonra: index.ts'e ekle, TODO'ları doldur, npm run scenario:validate ${slug}`);
} else {
  console.log(tpl);
}
