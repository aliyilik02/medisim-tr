# Senaryo Şablon — MediSim TR

Bu şablon `klinik-senaryo-yazar` skill tarafından referans olarak kullanılır.
Gerçek senaryolar için: `src/data/scenarios/stemi.ts` ve `anaflaksi.ts`

---

## TypeScript Şablonu

```typescript
import type { Scenario } from "@/engine";

export const scenario_ISIM: Scenario = {
  id: "specialty-tani-001",          // slug, benzersiz
  version: "0.1.0",
  title: "XX Yaş Cinsiyet — Ana Şikayet",
  description: "1-2 cümle klinik özet.",
  specialty: "acil",                 // kardiyoloji | dahiliye | acil | pediatri | cerrahi | anestezi | kadin_dogum | hemsirelik | askeri_tccc
  tags: ["tani1", "tani2"],
  difficulty: 3,                     // 1-5 arası (default gösterim zorluğu)
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 12,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2023 §X, AHA 2022",
  last_updated: "2026-04-25",

  patient: {
    age: 45,
    sex: "M",                        // "M" | "F"
    weight_kg: 75,
    height_cm: 175,
    chief_complaint: "Hastanın kendi ifadesiyle ana şikayet.",
    history_items: [
      "Hastalık 1 (kaç yıl)",
      "Kullandığı ilaç",
    ],
    allergies: [],
    current_medications: ["İlaç 1", "İlaç 2"],
    modifiers: {
      beta_blocker: false,
      karaciger_yetm: false,
      bobrek_yetm: false,
    },
  },

  initial_vitals: {
    hr: 90,
    bp_systolic: 130,
    bp_diastolic: 80,
    spo2: 96,
    temp: 36.8,
    rr: 18,
    pain: 5,         // opsiyonel, 0-10
    glucose: 110,    // opsiyonel, mg/dL
    gcs: 15,         // opsiyonel
  },

  available_medications: [
    "aspirin",
    "morfin",
    // medications.ts id'leri
  ],

  available_equipment: [
    "monitor",
    "ekg_12_lead",
    // equipment.ts id'leri
  ],

  ekg_pattern: "normal",             // normal | stemi_anterior | stemi_inferior | afib | vt | vf | lbbb | rbbb

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ── Aksiyon adımı ──────────────────────────
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt: "Hasta geldi. İlk 2 dakikada ne yaparsınız?",
      time_limit_sec: 120,
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback: "Doğru — sürekli monitörizasyon gerekli.",
          vitals_change: {},
        },
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: 20,
          feedback: "Doğru — 300 mg çiğneme tableti.",
          vitals_change: {},
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback: "Dikkat — morfin rutin önerilmiyor (CRUSADE skoru).",
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback: "Bu aşamada öncelik değil.",
      next_step_id: "s2_karar",
    },

    // ── Tekli karar adımı ──────────────────────
    {
      id: "s2_karar",
      kind: "decision",
      allow_multiple: false,
      title: "Klinik Karar",
      prompt: "EKG'de ne görüyorsunuz?",
      options: [
        {
          id: "opt_stemi",
          text: "ST elevasyonu, STEMI",
          correct: true,
          points: 20,
          feedback: "Doğru — V1-V4 ST elevasyonu, anterior STEMI.",
        },
        {
          id: "opt_normal",
          text: "Normal EKG",
          correct: false,
          points: -10,
          feedback: "Yanlış — ST elevasyonu gözden kaçtı.",
        },
      ],
      next_step_id: "s3_bilgi",
    },

    // ── Çoklu karar adımı ──────────────────────
    {
      id: "s2b_coklu",
      kind: "decision",
      allow_multiple: true,
      partial_credit: true,
      title: "Klinik Bulgular",
      prompt: "Bu tabloyu destekleyen bulgular hangileridir? (Birden fazla seçin)",
      options: [
        {
          id: "opt_a",
          text: "Bulgu A",
          correct: true,
          points: 10,
          feedback: "Doğru — açıklama.",
        },
        {
          id: "opt_b",
          text: "Bulgu B",
          correct: true,
          points: 10,
          feedback: "Doğru — açıklama.",
        },
        {
          id: "opt_c",
          text: "Yanlış bulgu",
          correct: false,
          points: -5,
          feedback: "Yanlış — açıklama.",
        },
      ],
      next_step_id: "s3_bilgi",
    },

    // ── Bilgi adımı ────────────────────────────
    {
      id: "s3_bilgi",
      kind: "info",
      title: "Klinik Özet",
      prompt: "Okuyun ve devam edin.",
      content: "Önemli klinik bilgi veya sonuç. Birden fazla paragraf içerebilir.",
    },
  ],

  scoring: {
    max_points: 65,          // tüm doğru seçim toplamı
    passing_score: 39,       // max * 0.60
    grade_bands: {
      A: 57,                 // max * 0.87
      B: 47,                 // max * 0.73
      C: 39,                 // max * 0.60
      D: 31,                 // max * 0.48
    },
  },

  debrief: {
    key_learnings: [
      "En kritik öğrenme noktası.",
      "İkinci kritik nokta.",
    ],
    references: [
      "ESC 2023 STEMI Kılavuzu §5.1",
      "TKD 2022 Reperfüzyon Protokolü",
    ],
    red_flags: [
      "Kritik hata 1 — neden tehlikeli",
      "Kritik hata 2",
    ],
  },
};
```

---

## Puanlama hesabı

| Band | Formül |
|------|--------|
| passing_score | max_points × 0.60 |
| A | max_points × 0.87 |
| B | max_points × 0.73 |
| C | max_points × 0.60 (= passing) |
| D | max_points × 0.48 |

## Sık yapılan hatalar

- `start_step_id` steps[] içinde olmayan bir id → build değil runtime hatası
- `allow_multiple: true` ama `partial_credit` yazılmamış → motor varsayılan davranış belirsiz
- `available_medications` içinde olmayan `target_id` → envanter görünmez
- `max_points` ile gerçek option puanları arasında büyük fark → scoring hatası
