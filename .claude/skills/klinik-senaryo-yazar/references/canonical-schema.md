# Kanonik Şema Özeti (üretim için)

> Tam tip: `src/engine/types.ts`. Kontrat: `SCENARIO-CONTRACT.md`.
> Üretim tipi: `ProductionScenario` (opsiyonelleri zorunlu yapar) + `defineScenario()`.

## defineScenario zorunlu alanları

```ts
import { defineScenario } from "@/engine";

export const scenario_<slug> = defineScenario({
  // ── META ──
  id: "<branş>-<tanı>-001",        // slug, benzersiz
  version: "1.0.0",
  title: "YY Yaş C — Ana Şikayet",
  description: "1-2 cümle klinik özet.",
  specialty: "acil",               // kardiyoloji|dahiliye|acil|pediatri|cerrahi|anestezi|kadin_dogum|hemsirelik|askeri_tccc
  tags: ["tani", "sistem", "aciliyet"],   // ≥2
  difficulty: 3,
  supported_difficulties: [2, 3, 4],      // ≥3 seviye (ZORUNLU)
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  last_updated: "2026-06-21",

  // ── HASTA ──
  patient: {
    age: 34, sex: "M", weight_kg: 70,
    chief_complaint: "...",
    history_items: ["..."],
    allergies: [],
  },
  initial_vitals: { hr: 110, bp_systolic: 90, bp_diastolic: 60, spo2: 78, temp: 36.5, rr: 6 },
  // ⚠️ vital değerleri klinik → TODO_KLINIK (yaşa uygun: pediatride PALS)

  // ── ENVANTER (katalog-id geçerli olmalı) ──
  available_medications: ["nalokson", "..."],
  available_equipment: ["ambu", "oksijen_maske", "monitor", "iv_kateter_18g"],
  use_central_equipment_effects: true,    // ekipman varsa

  // ── AKIŞ ──
  start_step_id: "degerlendirme",
  steps: [ /* ActionStep | DecisionStep | InfoStep — aşağıda */ ],

  // ── KÖTÜLEŞME (ZORUNLU ≥1 faz — cansız yasak) ──
  deterioration: [{
    id: "solunum-depresyonu",
    trends: [
      { vital: "spo2", delta_per_sec: -0.2, floor: 50 },  // TODO_KLINIK: trend hızı
      { vital: "rr", delta_per_sec: -0.05, floor: 2 },
    ],
    halted_by: [{ type: "give_medication", target_id: "nalokson" }],
    recovery_trends: [{ vital: "spo2", delta_per_sec: 0.5, ceiling: 97 }],
  }],

  // ── SONUÇ ──
  scoring: { max_points: 100, passing_score: 60, grading_mode: "auto",
             grade_bands: { A: 85, B: 70, C: 55, D: 40 }, score_floor: 0 },
  debrief: {
    key_learnings: ["...", "..."],         // ≥2
    references: ["..."],                    // ≥1 kılavuz
  },

  // ── KLİNİK REVIEW (ZORUNLU) ──
  clinical_review: { status: "DRAFT", draft_areas: ["doz", "deterioration"] },
});
```

## Step tipleri

```ts
// DecisionStep — dallanma için ideal (unlocks ile yol ayır)
{ id: "tani-karar", kind: "decision", title: "...", prompt: "...",
  options: [
    { id: "o1", text: "Doğru tanı", correct: true, points: 20, feedback: "...",
      // doğru yol ana akışta sürer
    },
    { id: "o2", text: "Yanlış", correct: false, points: -10, feedback: "...", critical: true,
      // not: unlocks DecisionOption'da değil — dallanma ActionStep outcome'ında veya
      // step sıralamasıyla. Karar sonrası komplikasyon adımı için ActionStep unlocks kullan.
    },
  ],
}

// ActionStep — aksiyon + dallanma (unlocks)
{ id: "mudahale", kind: "action", title: "...", prompt: "...",
  expected_outcomes: [
    { action: { type: "give_medication", target_id: "nalokson" },
      points: 30, feedback: "...", unlocks: ["stabilizasyon"] },        // DOĞRU yol
    { action: { type: "use_equipment", target_id: "entubasyon_seti" },
      points: 10, feedback: "Erken; önce antidot dene", unlocks: ["komplikasyon"] }, // DALLANMA
  ],
  default_wrong_penalty: -5,
}
```

## Dallanma kalıbı (gerçek)
- `start` → `tani-karar` (decision) → `mudahale` (action)
- `mudahale` doğru aksiyon → `unlocks: ["stabilizasyon"]` (iyi son)
- `mudahale` eksik/yanlış aksiyon → `unlocks: ["komplikasyon"]` (arrest/kötü son)
- İki ayrı sonuç adımı = öğrenci kararı yolu DEĞİŞTİRİR (validate "dallanma var" der).
