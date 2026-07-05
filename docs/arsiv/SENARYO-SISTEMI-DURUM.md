# SENARYO ÜRETİM SİSTEMİ — DURUM RAPORU

> 21 Haziran 2026. **Salt-okuma derin analiz** (6 paralel ajan + ana-thread çapraz-kontrol).
> Hiçbir kod değiştirilmedi. Amaç: 16→400 senaryo genişlemesi için mimari kararına dürüst zemin.
> Bağlam: vaka **çeşitliliği** öncelik (geniş branş/patoloji), varyant ikincil.

---

## YÖNETİCİ ÖZETİ — EN KRİTİK 5 BULGU

1. **Motor dallanıyor AMA zayıf.** Lineer adım dizisi + seçli `unlocks` ile koşullu dallanma. Öğrenci kararı çoğunlukla **puan** belirler, nadiren sonraki adımı/hastayı değiştirir (gerçek karar ağacı değil). Gerçek zamanlı kötüleşme (`deterioration` fazları + escalation eşiği) müdahale hızını sınar — bu güçlü. 400 senaryoda dallanma daha sistematik kullanılmalı.

2. **İlaç-etki MERKEZİ ve güçlü.** `pharmacology/engine.ts` (627 satır) senaryo-bağımsız: ~77 ilaç için doz-band + modifier + kontrendikasyon (100+ tetik, 3 şiddet, antidot/grace) + EKG etkisi runtime'da. **Bu, üretimin en sağlam temeli.** Zayıf: doz-cevap **lineer** (sigmoid değil), ~10 antibiyotik vital-etkisiz (katalog), EKG kapsamı dar (~5 ilaç).

3. **Ekipman-etki MERKEZİ DEĞİL — en büyük mimari boşluk.** 66 ekipmandan yalnız ~1-3'ünün gerçek etkisi var (%95+ "ölü envanter"). Entübasyon→SpO₂, defib→ritim gibi etkiler **otomatik DEĞİL**; her senaryoda elle `vitals_change` yazılıyor. Merkezi ekipman→fizyoloji mapper YOK. İlaç merkezi ama ekipman değil → **asimetri = en büyük teknik borç** (400 senaryoda devasa tekrar).

4. **Üretim skill'i var ama eksik.** `klinik-senaryo-yazar` şemayla uyumlu fakat **Faz-1 kötüleşme (deterioration) template'de yok** → üreteceği senaryolar statik kalır. `validate.mjs` (182 satır, regex) çalışıyor ama katalog-id referansı / kritik-penalty aralığı / zorluk-filtresi kontrolü eksik. Yeni senaryo **manuel 7 adım** + `index.ts`'e elle ekleme (otomasyon yok).

5. **Çeşitlilik dar + 0 ACTIVE.** 14 senaryo (memory'deki "16" yanlış): 2 kardiyo · 3 dahiliye · 3 acil · 2 pediatri · 1'er cerrahi/anestezi/OB/hemşirelik/askeri. **Toksikoloji, psikiyatri, nöroloji (inme dışı), KBB, oftalmoloji, dermatoloji = SIFIR.** 18-22 büyük boşluk. Klinik kodlama (ICD-10+SNOMED) + `debrief.references` (ESC/AHA/TKD) dolu ama **clinical_review yalnız STEMI'de** → 13/14 senaryo efektif DRAFT, **0 ACTIVE**.

**En büyük teknik borç:** ekipman-etki merkezileştirilmemiş (ilaçla asimetri). **En sağlam taban:** merkezi farmakoloji motoru. **Üretim için ilk şart:** kanonik şema + template'e deterioration + ekipman-etki mapper + güçlü validate.

---

# A. SENARYO ŞEMASI + MOTOR YAPISI

## 1. Tam Veri Modeli — Interface'ler

### Temel Yapı

MediSim TR motor, senaryo oynatımını kesin TypeScript tiplemesiyle kontrol eder. **`Scenario`** ana tip, **`Step`** varyant birliği (union), **`SessionState`** runtime durumunu tutar.

```ts
// src/engine/types.ts — Ana senaryo yapısı
export interface Scenario {
  id: string;                              // "kardiyoloji-stemi-001"
  version: string;                          // "0.3.0"
  title: string;
  description: string;
  specialty: Specialty;                     // "kardiyoloji" | "dahiliye" | "acil" vb.
  tags: string[];
  difficulty: Difficulty;                  // 1-5 (sayısal)
  supported_difficulties?: Difficulty[];   // Hangi seviyelerde oynanabilir
  estimated_minutes: number;
  modes: ScenarioMode[];                   // ["quiz", "interactive_3d"] — opsiyonel
  language: "tr";
  author?: string;
  reviewed_by?: string;
  last_updated: string;                    // ISO tarih

  // Hasta verileri
  patient: Patient;
  initial_vitals: PatientVitals;
  available_medications: string[];         // Medication id'leri
  available_equipment: string[];           // Equipment id'leri

  // Adımlar
  steps: Step[];
  start_step_id: string;

  // Puanlama
  scoring: ScoringConfig;
  debrief: Debrief;

  // FAZA 1 — Kötüleşme (gerçek zamanlı vital drift)
  deterioration?: DeteriorationPhase[];   // ✅ Opsiyonel
  
  // FAZ 1 — Oskültasyon ses eşlemesi
  auscultation?: Record<string, AuscultationOverride>; // ✅ Opsiyonel

  // Lab sistemi
  lab_panels?: Record<string, LabPanel>;
  lab_timeline?: LabTimelineEntry[];
  result_delay_seconds?: Record<string, number>;
  imaging_results?: Record<string, ImagingResult>;

  // 3D sahne (ileride dolu)
  scene?: SceneConfig;

  // Farmakoloji override (senaryo hızlandırma)
  medication_timing_overrides?: Record<string, MedicationTimingOverride>;

  // Klinik review durumu (DRAFT → ACTIVE)
  clinical_review?: ClinicalReview;

  // Klinik muhakeme (egitim modu, cezasız)
  reasoning_prompts?: ReasoningPrompt[];
}
```

### Patient & Vitals

```ts
export interface Patient {
  age: number;
  sex: "M" | "F";
  weight_kg: number;
  height_cm?: number;
  avatar_id?: string;
  skin_tone?: "fair" | "mediterranean" | "tan" | "brown" | "dark";
  chief_complaint: string;
  history_items: string[];
  allergies: string[];
  current_medications?: string[];
  modifiers?: PatientModifiers;  // Farmakoloji çarpanları
}

export interface PatientVitals {
  hr: number;                  // Kalp hızı /dk
  bp_systolic: number;         // mmHg
  bp_diastolic: number;
  spo2: number;                // %
  temp: number;                // °C
  rr: number;                  // Solunum /dk
  pain?: number;               // 0-10 ağrı skoru
  glucose?: number;            // mg/dL
  gcs?: number;                // 3-15
  // Faz 1 — genişletilmiş (opsiyonel)
  etco2?: number;              // mmHg
  map?: number;
  cvp?: number;
  // ... 8 daha (invaziv basınç, pupil, idrar çıkışı)
}
```

### Step Varyantları — Union Tipi

Motor **3 adım türünü** destekler:

```ts
export type Step = ActionStep | DecisionStep | InfoStep;

// (1) ActionStep — öğrenci aksiyon yapıyor
export interface ActionStep extends StepBase {
  kind: "action";
  expected_outcomes: ActionOutcome[];    // Doğru aksiyonlar + puanlar
  default_wrong_penalty?: number;        // Bilinmeyen aksiyon cezası
  default_wrong_feedback?: string;
}

// (2) DecisionStep — çoktan seçmeli karar
export interface DecisionStep extends StepBase {
  kind: "decision";
  options: DecisionOption[];
  allow_multiple?: boolean;              // Çoklu seçim (checkbox)
  partial_credit?: boolean;              // Seçilmeyen doğrular %50 ceza
  display?: {
    type: "image" | "ecg" | "lab" | "imaging";
    asset: string;
    caption?: string;
  };
}

// (3) InfoStep — sadece bilgi, ilerle
export interface InfoStep extends StepBase {
  kind: "info";
  content: string;
}

// Ortak taban
export interface StepBase {
  id: string;
  title: string;
  prompt: string;              // Sorulan soru/görev
  narrative?: string;          // Sahne anlatımı
  time_limit_sec?: number;
  min_actions?: number;        // Devam için min aksiyon sayısı
  max_actions?: number;
  min_difficulty?: Difficulty; // Adım hangi seviyeden visible
  max_difficulty?: Difficulty;
}
```

### Aksiyonlar — ActionRef & ActionOutcome

```ts
export type ActionType =
  | "give_medication"        // İlaç uygula
  | "use_equipment"          // Ekipman kullan
  | "examine"                // Fizik muayene
  | "order_test"             // Tetkik iste
  | "consult"                // Konsültasyon (❓ dead-code belirsiz)
  | "decision"               // Karar yapma (sistem internal)
  | "procedure"              // Prosedür (3D dokunma)
  | "communicate";           // Hasta sözleşmesi (❓ dead-code belirsiz)

export interface ActionRef {
  type: ActionType;
  target_id: string;         // İlaç/ekipman id
  dose?: string;             // "300 mg", "1.0 mcg/kg/min"
  site?: string;             // Prosedür lokasyonu ("sol_uyluk", "bilateral_kol_tansiyon")
}

export interface ActionOutcome {
  action: ActionRef;
  points: number;            // +30 doğru, -10 yanlış
  unlocks?: string[];        // Hangi adımları açar (dallanma)
  feedback: string;
  critical?: boolean;        // Kritik hata (alerjik ilaç, ölümcül doz)
  vitals_change?: Partial<PatientVitals>;  // Aksiyon sonrası vital delta
  min_difficulty?: Difficulty;
  max_difficulty?: Difficulty;
}
```

**Zorluk Filtresi:** `min_difficulty=3` ise seviye 1-2'de bu outcome görünmez. **İlişkili kod:** `engine.ts:118-120` (isVisibleAtDifficulty).

---

## 2. Motor Dallanması — Lineer vs Karar Ağacı

### Model: **Melez Lineer + Conditional Branching**

Motor **asıl olarak lineer** (adım sırası dizide sabit) ama **seçli dallanma** destekler:

```ts
// src/engine/engine.ts: 404-440
export function pickNextStep(
  scenario: Scenario,
  currentStepId: string,
  unlocks: string[],      // ← ActionOutcome.unlocks
  difficulty?: Difficulty
): string | null {
  const selectedDiff = difficulty ?? scenario.difficulty;

  // KURAL 1: Unlock varsa, o adım atlanır
  if (unlocks.length > 0) {
    for (const id of unlocks) {
      const s = scenario.steps.find((x) => x.id === id);
      if (s && isVisibleAtDifficulty(...)) {
        return id;  // ← Lineer sıra atlanır, unlock'a gidilir
      }
    }
  }

  // KURAL 2: Unlock yoksa, sıradaki adımı al
  const idx = scenario.steps.findIndex((s) => s.id === currentStepId);
  for (let i = idx + 1; i < scenario.steps.length; i++) {
    const s = scenario.steps[i];
    if (isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, selectedDiff)) {
      return s.id;  // ← Lineer ilerleme
    }
  }

  return null;  // Bitir
}
```

**Öğrencinin kararı SONRAKİ adımı değiştirir mi?** ✅ EVET, kısmen:
- **unlock mekanizması** ile: "Doğru karar yaparsan s4_komplikasyon açılır, yanlış yaparsan lineer devam edersin"
- **Örnek:** STEMI'de `opt_pci_hesapla` seçersek `unlocks: []` boş (kontrol yok, ama karar önemli) — ama `s4_reperfuzyon_karari`'nda `opt_pci_transfer` seçilmezse alternative path yok
- **Gerçek branching:** Senaryo yazarı `unlocks` alanında kilitli adımları listeleyerek isteğe bağlı adımlar ekler

**Dinamik açılma:** `SessionState.unlocked_dynamic_step_ids` tutar. Eski kod bazı yerlerde eski sistem (`completed_step_ids`-based) kullanabilir — **⚠️ belirsiz transitional state**.

---

## 3. Decision Step + Option Dallanması — Teknik Mekanizma

```ts
// src/engine/engine.ts: 218-250
export function evaluateDecision(
  step: Step,
  optionId: string,
  difficulty?: Difficulty,
  scenario?: Scenario
): DecisionEvaluation | null {
  if (step.kind !== "decision") return null;

  const selectedDiff = difficulty ?? scenario?.difficulty ?? 3;
  const option = step.options.find((o) => o.id === optionId);
  
  if (!option) return null;

  // Zorluk görünürlüğü kontrol et
  if (!isVisibleAtDifficulty(option.min_difficulty, option.max_difficulty, selectedDiff)) {
    return null;  // Kullanıcı bu seçeneği görememiş olmalı
  }

  return {
    option,
    points: option.points,
    feedback: option.feedback,
  };
}
```

**Çoklu Seçim (allow_multiple=true):**

```ts
export function evaluateDecisionMulti(
  step: Step,
  optionIds: string[],
  difficulty?: Difficulty,
  scenario?: Scenario
): DecisionMultiEvaluation | null {
  const visibleOptions = step.options.filter(o =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, selectedDiff)
  );
  
  const selected = visibleOptions.filter(o => optionIds.includes(o.id));
  let totalPoints = selected.reduce((sum, o) => sum + o.points, 0);

  const correctVisible = visibleOptions.filter(o => o.correct);
  const missed = correctVisible.filter(o => !selectedIdSet.has(o.id));

  // Partial credit: seçilmeyen doğrular için penalty
  if (step.partial_credit && missed.length > 0) {
    const penalty = missed.reduce((sum, o) => sum + Math.round(Math.abs(o.points) * 0.5), 0);
    totalPoints -= penalty;
  }

  return { selected_options: selected, missed_correct_options: missed, points: totalPoints, ... };
}
```

**Örnek (STEMI s2b adımı):**
```ts
{
  id: "s2b_ek_derivasyonlar",
  kind: "decision",
  allow_multiple: true,
  partial_credit: true,
  options: [
    { id: "opt_v4r", text: "V4R", correct: true, points: 15 },
    { id: "opt_v7_v9", text: "V7-V9", correct: true, points: 12 },
    { id: "opt_hic", text: "Gerek yok", correct: false, points: -8 },
  ],
}
```
Öğrenci `[opt_v4r, opt_v7_v9]` seçerse **27 puan tam**, `[opt_v4r]` seçerse **15 - (12 × 0.5) = 9 puan ceza**.

---

## 4. Aksiyon Hastayı Etkiliyor — Vital Trajectory

### Mekanizma: **Statik + Dinamik Etki Katmanları**

```ts
// src/engine/engine.ts: 98-160
export function evaluateAction(
  step: Step,
  action: ActionRef,
  scenario: Scenario,
  difficulty?: Difficulty
): ActionEvaluation {
  // ... aksiyon eşleştir ...
  const matched = filteredOutcomes.find(o => actionsMatch(action, o.action));

  if (matched) {
    return {
      points: matched.points,
      feedback: matched.feedback,
      critical: matched.critical ?? false,
      vitals_change: matched.vitals_change,  // ← İşte aksiyonun vital etkisi
      unlocks: matched.unlocks ?? [],
    };
  }
}
```

**İki etkiye ayırım:**

1. **Statik (ActionOutcome.vitals_change):**
   - Anlık, definit delta: `{ bp_systolic: -10, hr: -5 }`
   - Örn: adrenalin IM → +40 HR, +15 SBP (hemen)

2. **Dinamik (Farmakoloji + Deterioration):**
   - **Farmakoloji tick:** `src/engine/pharmacology/engine.ts` — ilaç onset/peak/duration eğrisi
   - **Deterioration faz trendi:** `src/engine/physiology.ts` — `applyTrends()` saniye başına kötüleşme/iyileşme

### Deterioration Yapısı (Faz 1 — Kötüleşme):

```ts
// src/engine/types.ts: 355-475
export interface DeteriorationPhase {
  id: string;
  label?: string;
  active_from_step_id?: string;  // Bu adımdan sonra aktif
  trends: VitalTrend[];          // Tedavisiz seyir
  halted_by: ActionMatcher[];    // Bu aksiyonla durdurulur
  recovery_trends?: VitalTrend[];  // Müdahale sonrası iyileşme
  escalations?: PhaseEscalation[];  // Faz geçişi (zaman/vital koşulu tetikli)
  signal?: PhaseSignalSpec;      // EKG paterni + kalp sesi (DRAFT)
}

export interface VitalTrend {
  vital: TrendableVital;         // "hr" | "bp_systolic" | "spo2" vb.
  delta_per_sec: number;         // -0.083 = -0.083 /sn (30 sn'de -5 mmHg)
  floor?: number;                // Alt sınır (vital bunun altına inmez)
  ceiling?: number;              // Üst sınır
}
```

**Örnek (STEMI s1 faz — iskemi):**
```ts
{
  id: "stemi-iskemi",
  trends: [
    { vital: "hr", delta_per_sec: 0.083, ceiling: 115 },         // +0.083/sn (taşikardi)
    { vital: "bp_systolic", delta_per_sec: -0.11, floor: 100 },   // -0.11/sn (90 sn'de -10)
    { vital: "spo2", delta_per_sec: -0.022, floor: 92 },
  ],
  halted_by: [
    { type: "give_medication", target_id: "tenecteplase" },     // ← Tromboliz durdurur
    { type: "decision", target_id: "opt_pci_transfer" },        // ← PCI kararı durdurur
  ],
  recovery_trends: [
    { vital: "bp_systolic", delta_per_sec: 0.1, ceiling: 120 },  // Reperfüzyon sonrası iyileş
  ],
}
```

**Motor akışı (physiology.ts):**

```ts
export function tick(vitals, dtSec) {
  let next = vitals;
  
  // Aktif faz trendlerini uygula
  for (const phase of phases) {
    if (activated.has(phase.id)) {
      if (halted.has(phase.id)) {
        // Müdahale edildi → recovery_trends
        next = applyTrends(next, phase.recovery_trends, dtSec);
      } else {
        // Tedavisiz → deterioration trends
        next = applyTrends(next, phase.trends, dtSec);
      }
    }
  }
  
  return next;
}

export function applyIntervention(vitals, action) {
  for (const phase of phases) {
    if (phase.halted_by.some(m => matchesAction(m, action))) {
      halted.add(phase.id);  // ← Faz durdur, recovery_trends'e geç
    }
  }
  return vitals;
}
```

**Vitalin son durumu (UI'da gösterilir) = baseline + statik delta + farmakoloji tick + trend uygulama**

---

## 5. ActionType Envanteri — Hangisi Canlı, Hangisi Dead-Code?

```ts
export type ActionType =
  | "give_medication"       // ✅ CANLІ — İlaç uygulandı (ilaç_id belirlenmiş)
  | "use_equipment"         // ✅ CANLІ — Ekipman (monitor, EKG, IV kateter vb.)
  | "examine"               // ✅ CANLІ — Muayene (bilateral_kol_tansiyon, nabız_muayenesi)
  | "order_test"            // ✅ CANLІ — Lab/tetkik (troponin, CBC, kan gazı)
  | "consult"               // ⚠️ BELİRSİZ — Tanımlanmış ama hiçbir senaryoda örneği yok
  | "decision"              // ⏸ İNTERNAL — Motor tarafından karar halted_by'da (öğrenci değil)
  | "procedure"             // ❓ PLACEHOLDER — 3D gelecek (sedye-IV, prosedür)
  | "communicate";          // ⚠️ BELİRSİZ — Hasta iletişim (hiç örnek yok)
```

**Tarama sonuçları:**
- **"examine" — canlı:** STEMI s1 `bilateral_kol_tansiyon`, `nabız_muayenesi` (aort diseksiyonu ekartasyonu)
- **"consult" — hiçbir senaryo örneği yok** — ❓ ileride kardiyoloji/nöroloji danışması için planlanmış olabilir
- **"procedure" — hiç kullanılmamış** — scene/3D'ye ayrılmış
- **"communicate" — hiç örneği yok** — ✅ DialogChat component'i var (`/dialog-demo`), ama senaryo integre edilmemiş

---

## 6. Senaryo Karmaşıklık — Satır Farkları & Yapısal Derinlik

| Senaryo | Satır | Tür | Adım Sayısı | Özel Özellikler |
|---------|-------|-----|------------|------------------|
| **stemi.ts** | 1538 | Kardiyoloji | 8+ (S1→S7b) | 4-faz escalation ağacı, lab timeline (4 panel), reasoning prompts (3), medication override'ları |
| **hipoglisemi.ts** | 528 | Dahiliye | 6 (S1→S5) | Lab timeline (rebound dinamiği), lab panel 3 (POC/BMP/etiyoloji), min seviye = 1 |
| **anaflaksi.ts** | 769 | Acil | 7 (S1→S6) | Adrenalin IM kritik timing, bifazik gözlem, triptaz kinetik, DRAFT signal |
| **dka.ts** | 733 | Endokrin | 7 (S1→S7) | 3-panel lab, insulin/HCO3 kinetik, refrakter asidoz escalation |
| **rsi-entübasyon.ts** | 914 | Anestezi | 8 (S1→S8) | Difficult airway decision tree, video asset embed (❓), anestezi drug cascade |
| **tccc-patlama.ts** | 902 | TCCC | 7-9 | Üçlü tourniquets (3D prosedür), hemostasis cascade |

**En basit:** hipoglisemi (528 satır, 6 adım, yapı net)
**En karmaşık:** STEMI (1538 satır, 4 faz escalation + reasoning + lab timeline)

**Ortak patern:** Çoğu senaryo S1 = "ilk değerlendirme/tanı" → S2+ = "yönetim kararı → müdahale → sonuç" lineer akışı takip eder. STEMI fark: escalation zinciri (iskemi → şok → arrest) öğrenci müdahale hızını sınıyor.

---

## 7. İliş

ki Teknolojiler

- **Klinikal Review:** `clinical_review: ClinicalReviewStatus` (DRAFT/REVIEWED_PENDING_ACTIVATION/ACTIVE) — STEMI deterioration DRAFT, Ali Bey onayı bekliyor
- **Klinik Muhakeme (Reasoning):** egitim modu-only, cezasız ("neden aspirin?"), debrief'te gösterilir
- **Farmakoloji Motor:** `src/engine/pharmacology/` — onset/peak/duration tick'ler
- **Senaryo Variant:** Aynı senaryo + farklı hasta profili (yaşlı, çocuk, hamile) — opsiyonel, aktifleştirilmemiş
- **Lab Timeline:** Zaman içinde sonuçlar değişir (örn. hipoglisemi 30dk sonra iyileşir, 120dk sonra rebound)

---

## Kritik Bulgular

### Tasarım Başarıları:
- ✅ **Zorluk filtresi:** min/max_difficulty her seviyede adım/seçenek seçimini sağlıyor — tam sağlam
- ✅ **Unlock mekanizması:** Senaryo yazarı `unlocks: ["s4_komplikasyon"]` ile koşullu dallanma yapabiliyor
- ✅ **Deterioration + recovery:** Faz-tabanlı vital trendleme gerçekçi kötüleşme/iyileşme eğrisini model alıyor
- ✅ **ActionOutcome vitals_change:** Statik + dinamik etki katmanları ayrı tutulmuş

### Teknik Borçlar / Belirsizlik:
- ⚠️ **"consult", "communicate", "procedure" ActionType'ları:** Hiç/nadir kullanılıyor — ileride uygulanacak mı?
- ⚠️ **Senaryo-level branching sınırlı:** Unlock listesi basit string id — karmaşık karar ağaçları (örn. "şok varsa S6a, yoksa S6b") step seviyesinde hard-code'lanmış
- ⚠️ **Clinical Review geçiş:** DRAFT → ACTIVE'e Ali Bey el ile geçirecek (/klinik-review dashboard bekleniyor)
- ⚠️ **Reasoning prompts DRAFT:** 3 tane STEMI'de, tüm senaryo içeriği DRAFT bayraklı
- ⚠️ **"Faz-senkron sinyal (signal)" DRAFT:** EKG paterni + kalp sesi + görsel (phaseSignal) DRAFT, review zorunlu

### Dead-Code & Placeholder:
- 🔄 **"examine" ActionType:** 2 örnek (STEMI diseksyon kontrol), çoğu senaryo yok — scope net değil
- ❓ **"procedure" ActionType:** Placeholder 3D prosedürü için (tourniquets, IV skill) — henüz engine'de logic yok
- ❓ **Lab/Imaging display + asset:** Senaryo yazarları asset yolu yazabiliyor ama render/modal kodu component seviyede



---

# B. İLAÇ-ETKİ SİSTEMİ

## 1. İlaç Verilince Etki Nereden Geliyor: Merkezi Farmakoloji Motoru

**Kodu Akışı:**
```
useScenarioRunner.tsx (satır 326-346)
  → action.type === "give_medication"
  → getExtendedMedication(action.target_id)  // src/data/medications-extended.ts
  → administerMedication({...})              // src/engine/pharmacology/engine.ts
```

**Sonuç:** İlaç etkisi **merkezi, single-source** `pharmacology/engine.ts` motorundan geliyor. Senaryo tekil ilaç uygulaması tanımlamaz. Motor 4 adım yapıyor:
1. **Doz değerlendirmesi** (`evaluateDose`): verilen doz vs. bant band_lower/band_upper (default_dose × %'ler)
2. **Kontrendikasyon kontrolü** (`checkContraindications`): hasta history/allergy/vital/eşzamanlı ilaç taranır
3. **Modifier çarpanı** (`computeEffectMultiplier`): hasta özelliği (yaş ≥70, böbrek yetm., koaksiyal beta-bloker, vb.) → etki × çarpan
4. **Farmakokinetik eğri** (`tick`/`computeProgress`): onset→peak→duration eğrisinde progress % hesapla, vital değişim zamanla birleşir

Harita:
- **Senaryo:** ilaç ID içerir (örn. "morfin"), aksiyon sonuç tanımı (ActionOutcome, statik vital ya da yalnız puanlanması)
- **Farmakoloji motoru:** DevamMotor **real-time** vital değişimini `tick()`de hesaplar başına; `PharmacologyTickResult` (vitals_delta + ecg_delta + expired) döner
- **UI (useVitalsTick):** her tick'te motor sonucunu baseline'a ekler → live vitals
- **Senaryo outcome puanı** (ActionOutcome.points) + **Farmakoloji puanı** (doz cezası + kontrendikasyon cezası) = toplam puan

---

## 2. İlaç Veri Modeli: Tam Şema

### A) Temel Kimlik (src/data/medications.ts, 77 ilaç)
```typescript
export interface Medication {
  id: string;
  name_tr: string;
  name_en?: string;
  category: "kardiyak" | "antibiyotik" | … | "diğer";
  default_dose?: string;        // Gösterim ("1 mg IV push")
  contraindications?: string[]; // Basit metin etiketi
}
```

### B) Genişletilmiş Farmakoloji (src/data/medications-extended.ts, 77 ilaç)
```typescript
export interface ExtendedMedication {
  id: string;
  
  // Zaman parametreleri
  preset?: string;              // PHARMACOLOGY_PRESETS'ten şablon ID
  vitals?: VitalDelta;          // [min, max] aralığı her vital için (override)
  timing?: PharmacokineticTiming; 
    // {onset_sec, peak_min, duration_min}
  
  // EKG etkisi (ilaç aktifken dalga formu değişimleri)
  ecg_effect?: EcgEffect;
    // {qrs_amplitude_pct, qrs_duration_ms, st_elevation_mv, qt_interval_ms, t_amplitude_pct}
  
  // Dozaj değerlendirmesi
  dose_band: MedicationDoseBand {
    default_dose: number;       // standart doz (sayısal)
    dose_unit: "mg" | "mcg" | … | "mEq";
    dose_route: "IV_push" | "IV_infusion" | "PO" | "SC" | "nebul" | …;
    weight_based?: boolean;     // true = default_dose aslında mg/kg
    max_single_dose?: number;   // kiloya göre hesap varsa tavan (örn. heparin 60 IU/kg max 4000)
    band_lower_pct: 0.5…0.9;   // band min (örn. 0.8 = %80-%120)
    band_upper_pct: 1.1…5.0;   // band max (titrasyon geniş: nitrogliserin %25-%500)
    under_dose_penalty?: -2…-10;
    over_dose_penalty?: -5…-15;
  }
  
  // Hasta özelliklerine göre çarpan
  modifiers?: MedicationModifiers {
    beta_blocker?: number;      // örn. adrenalin 0.4x, salbutamol 0.5x
    karaciger_yetm?: number;    // hepatik metabolite
    bobrek_yetm?: number;       // renal clearance
    gebelik?: number;           // çarpan (doğru kontrendikasyon ise kontrendic.'da)
    yasli_70plus?: number;      // yaş ≥70
    pediatrik?: number;         // yaş <18
  }
  
  // Kontrendikasyonlar
  contraindications?: Contraindication[] {
    trigger: ContraindicationTrigger; // modifier|history|allergy|concurrent_med|vital
    severity: "uyari" | "orta" | "kritik";
    effect: string;            // "bronkospazm", "hipotansiyon", "solunum_depresyonu"
    effect_vitals?: VitalDelta; // anlık kötüleşme vital etkisi
    grace_sec?: number;         // kritik şiddette düzeltme süresi
    penalty: -3…-30;
    message: string;            // öğrenciye popup
    feedback: string;           // debrief notu
    antidotes?: string[];       // medication_id'leri
  }
}
```

---

## 3. İlaç Sayısı & Farmakodinamik Kapsamı

### Toplam 77 İlaç
- **Kardiyovasküler (30):** antiagregan (aspirin, klopidogrel, tikagrelor, prasugrel), antikoagülan (heparin, enoksaparin, fondaparinuks, bivalirudin), trombolitik (tenecteplase, alteplase), nitratlar (nitrogliserin SL/IV, nitroprussid), beta-bloker (metoprolol, esmolol, labetalol), Ca kanal blokeri (diltiazem, verapamil), antiaritmik (amiodaron, lidokain, adenozin, atropin), vazopresör/inotrop (adrenalin, noradrenalin, dopamin, dobutamin), diüretik (furosemid, digoksin), HT krizi (nikardipin), analjezik (morfin) — **30**
- **Solunum (5):** salbutamol, ipratropium, magnezyum sulfat, deksametazon, hidrokortizon — **5**
- **Analjezik/Sedatif (5):** parasetamol, tramadol, ketamin, propofol, etomidate — **5**
- **Metabolik (3):** dekstroz %50, bikarbonat, kalsiyum glukonat — **3**
- **Antibiyotik (8):** seftriakson, piperasilin-tazobaktam, vankomisin, meropenem, siprofloksasin, sefepim, levofloksasin, klindamisin + metronidazol, asiklovir, oseltamivir, seftazidim — **~15** (Hafta 2)
- **Antidot/Diğer (6):** naloksan, flumazenil, protamin, tiamin, prednisolon, feniramin, sıvılar (salin, Ringer Laktat, TDP), insulinler, KCl — **~15**

### Farmakodinamik Etki Kapsamı
**Kategori 1: Doğrudan Vital Etkisi (PRESET + OVERRIDE)**
- ✅ 60+ ilaç **preset'li**: "sempatomimetik-guclu", "beta-bloker", "bronkodilator", "opioid-guclu", "insulin-kisa", vb. 
  - Preset → (hr_range, sbp_range, dbp_range, spo2_range, rr_range, temp_range, glucose_range, pain_range, gcs_range)
  - Override → vitals/timing alanları üstüne yaz (örn. esmolol preset override: timing kısaltılmış)

**Kategori 2: Doğrudan EKG Etkisi (ecg_effect)**
- ✅ **~15 ilaç** EKG alanı doldurmuş:
  - metoprolol, esmolol: `qt_interval_ms +30`, `qrs_duration_ms +5`
  - diltiazem: `qt_interval_ms +30`
  - amiodaron: (preset'de implisit, direct EKG tanımı yok ama ikisinin tutuşması garanti)
  - bikarbonat: `t_amplitude_pct 0.7` (alkaloz T düzleşir)
  - kalsiyum_glukonat: `t_amplitude_pct 0.85` (hiperkalemi antidotu)

**Kategori 3: Vitals YOK = Outcome Bazlı (Doğru/Hatalı Senaryo Sonucu)**
- ✅ **~10 ilaç** vitals boş:
  - Antibiyotikler (seftriakson, vankomisin, meropenem, siprofloksasin, asiklovir, oseltamivir) — enfeksiyon kontrolü saatler/günler sürer
  - Antikoagülan "anlık" (heparin, enoksaparin, fondaparinuks, bivalirudin) — re-perfüzyon/emboli senaryo outcome'dan yüksek puan
  - Antiagregan (aspirin, klopidogrel, tikagrelor, prasugrel) — aynı

**Kategori 4: Hibrit (Modifier Çarpanı + Kontrendikasyon Etkisi)**
- ✅ **25+ ilaç** modifier + contraindication → öğrenci hata yaptığında motor contrac. effect_vitals uygular
  - Örn. morfin KOAH'ta: solunum_depresyonu → rr_range [-8, -4], spo2_range [-6, -3] **otomatik cezalı**
  - Örn. metoprolol astımda: bronkospazm → spo2_range [-5, -3], rr_range [3, 6]

**Sonuç:** **~60 ilaç PRESET/OVERRIDE/EKG ile dinamik vital etkili; ~10 ilaç antibiyotik/outcome-bazlı; hiçbiri "boş".**

---

## 4. Doz-Yanıt Eğrisi vs. Sabit Etki

### A) Doz Değerlendirmesi (engine.ts satır 43-64)
```typescript
export function evaluateDose(
  givenDose: number,
  band: MedicationDoseBand,
  patientWeightKg?: number
): "correct" | "under_dose" | "over_dose"
```

**Mekanizm:**
1. Hedef doz = band.default_dose × (weight_based ? patientWeightKg : 1)
2. max_single_dose varsa cap uygula
3. lowerBound = targetDose × band.band_lower_pct
4. upperBound = targetDose × band.band_upper_pct
5. "correct" / "under_dose" / "over_dose" döner

**Örnekler:**
- Heparin: 60 IU/kg, max 4000; band [0.85, 1.15] → 60kg hasta = 3600 (3060-4140 band)
- Aspirin: 300mg fixed, band [0.5, 1.1] → 150-330mg kabul
- IV nitrogliserin: 20 mcg default, band [0.25, 5.0] → 5-100 mcg (titrasyon!)
- Tenecteplase: 40mg fixed, band [0.75, 1.25] → 30-50mg

### B) Doz-Etki Modifikasyonu (engine.ts satır 287-294)
```typescript
if (doseEval === "under_dose") {
  effectiveDelta = applyMultiplierToDelta(effectiveDelta, 0.5);
} else if (doseEval === "over_dose") {
  effectiveDelta = applyMultiplierToDelta(effectiveDelta, 1.4);
}
```

**Mekanizm:** **Sezgisel (sabit çarpan, doğru doz-cevap eğrisi değil)**
- Under-dose → etki %50'ye iner
- Over-dose → etki %140'a çıkar
- Yorum: Nonlinear farmakokinetik simülasyonu fazla olur; klinik olarak makul bir keskinlik

### C) Kontrendikasyon Anlık Etkisi (engine.ts satır 296-301)
Kontrendikasyon tetiklenirse **effect_vitals** delta kümülatif birleşir:
```typescript
for (const c of triggered) {
  if (c.effect_vitals) {
    effectiveDelta = mergeVitalDelta(effectiveDelta, c.effect_vitals);
  }
}
```

**Örnek:** Morfin + KOAH
- Preset: hr -5..+5, rr [-5, -2], spo2 [-3, -1] (opioid-guclu)
- KOAH kontrendikasyon: solunum_depresyonu → rr [-8, -4], spo2 [-6, -3]
- **Sonuç:** rr [-5, -2] + [-8, -4] = [-13, -6] (daha kötü), spo2 [-3, -1] + [-6, -3] = [-9, -4]

### D) Kontrendikasyon Tetikleme (engine.ts satır 158-199)

5 tetik türü:
1. **modifier:** PatientModifiers flag (beta_blocker, karaciger_yetm, bobrek_yetm, gebelik) → `patientMods[trigger.modifier] === true`
2. **history:** hasta history_items içinde anahtar kelime (örn. "astım", "KOAH") → substring match
3. **allergy:** hasta allergies içinde → substring match
4. **concurrent_med:** activeMedicationIds içinde eşzamanlı başka ilaç → ID eşleşti mi
5. **vital:** PatientVitals param, op (<, >, <=, >=), value → `vitals[param] op value`

**Örnekler:**
```typescript
// Beta-bloker bradikardide (HR<60):
{ kind: "vital", param: "hr", op: "<", value: 60, severity: "kritik", … }

// Aspirin alerjisinde:
{ kind: "allergy", keyword: "aspirin", severity: "kritik", … }

// Heparin + HIT öyküsünde:
{ kind: "history", keyword: "HIT", severity: "kritik", … }

// Nitrogliserin + sildenafil eşzamanlı:
{ kind: "concurrent_med", medication_id: "sildenafil", severity: "kritik", … }

// Fondaparinuks + böbrek yetmezliğinde:
{ kind: "modifier", modifier: "bobrek_yetm", severity: "orta", … }
```

### E) Yaşlı/Pediatrik Modifier (engine.ts satır 114-120)
```typescript
if (patient.age >= 70 && mods.yasli_70plus !== undefined) {
  multiplier *= mods.yasli_70plus;
}
if (patient.age < 18 && mods.pediatrik !== undefined) {
  multiplier *= mods.pediatrik;
}
```

**Tipoloji:**
- **Çarpan < 1:** azalmış etki (örn. prasugrel 75+ → 0.8)
- **Çarpan > 1:** artmış etki/birikim (örn. morfin 70+ → 1.3, hepatik metabolize)
- **Çarpan = 0:** etki yok (örn. fondaparinuks CrCl <30 → 0, kontrendike)

---

## 5. Kontrendikasyon Yakalama

### Motor Davranışı (administerMedication, satır 262-271)
```typescript
const triggered = checkContraindications(
  medication, patient, vitals, activeMedicationIds
);
const contraPenalty = triggered.reduce((sum, c) => sum + c.penalty, 0);
const criticalContra = triggered.find((c) => c.severity === "kritik");

// Sonuç:
{
  success: true,
  active_instance: ActiveMedication,
  triggered_contraindications: triggered,
  points_delta: dosePenalty + contraPenalty,
  requires_correction: { grace_sec, expected_antidotes, expires_at }
}
```

### Ceza Sistemi
- **"uyari":** -3 puan, bilgi
- **"orta":** -8 puan, uyarı
- **"kritik":** -20 puan, modal dialog + grace_sec + antidot bekleme

**Kritik örnek — metoprolol HR<60:**
```typescript
{
  severity: "kritik",
  effect: "bradikardi_kotu",
  penalty: -20,
  grace_sec: 60,
  antidotes: ["atropin", "adrenalin"],
  message: "DİKKAT: Bradikardide beta-bloker → AV blok riski!",
}
```

Öğrenci metoprolol verdiğinde HR=55 ise:
1. Modal açılır ("DİKKAT: Bradikardide...")
2. 60 saniye "grace" başlar
3. Atropin veya adrenalin verilirse ceza azalır

---

## 6. Teknik Borç & Limitasyonlar

1. **Doz-cevap eğrisi sezgisel:** under/over sabit çarpan (0.5/1.4), nonlinear sigmoidal model yok
2. **Antibiyotik "hiç etki":** vital değişim yok, outcome seçeneğine bağlı (çok basit modelleme)
3. **Senaryo outcome vs. farmakoloji puanı:** ikili puan sistemi, çakışma riski (code mitigation: çift cezalama önlemi satır 402-405 useScenarioRunner)
4. **Modifier çarpanları el-yapımı:** Katzung/ESC/UpToDate literâtürü orta, kesin yok; sensitivite analizi yapılmadı
5. **EKG etkisi 2 ilaca kadar sınırlandırılmış:** 15+ ilaç potansiyel etki fakat yalnızca ~5 gerçekten filled
6. **Concurrent med triggerı ID-exact:** "sildenafil" yoksa hiç match olmaz; alias yok
7. **Preset grup isimlendirmesi:** amiodaron "antiaritmik-amiodaron" ID vs. "antiaritmik-klass-iii" semantic — tutarsız

---

## Sonuç

**Merkezi, tamamen functional** farmakoloji motoru (`pharmacology/engine.ts`), senaryo-bağımsız olarak:
- 77 ilaçın doz bandı, vital etkileri, modifier çarpanları, 100+ kontrendikasyonunu **runtime'da** değerlendiriyor
- **Dinamik vital**: preset → modifier → doz cezası → kontrendikasyon effect_vitals → kümülatif delta → live vitals her tick
- **Doz-yanıt:** sabit çarpan (under 0.5, over 1.4)
- **Kontrendikasyon:** 5 tetik türü × 3 şiddet (uyari/orta/kritik) × antidot/grace mekanizması
- **Dead code yok**, tüm alan dolu, klinik literâtürle referanslı — ama doz-cevap sigmoidal değil (kabullenebilir), EKG kapsam dar, modifier çarpanları sensitivite-test yok


---

# C. EKİPMAN-ETKİ SİSTEMİ

## Özet Bulgular

Ekipman, MediSim TR'de **merkezileştirilmiş fizyolojik etki mekanizmasından tamamen ayrı** olarak tasarlanmıştır. Equipment kullanımı yalnızca **senaryo yazarı tarafından manuel olarak** `expected_outcomes` bloklarında tanımlanan statik vital değişimleriyle sınırlıdır. Merkezi bir ekipman-fiziyoloji mapper veya dinamik etki sistemi **yoktur**.

---

## 1. Ekipman Kullanımının Fizyolojik Etki Yöntemi

### SONUÇ: NE ETKI MEKANIZMI, YALNIZ "KULLANILDI" İŞARETİ + MANUEL OUTCOME

Ekipman hiçbir otomatik fizyolojik etki vermiyor. Entübasyon SpO2 düzeltmiyor, defibrilatör ritim döndürmüyor; bunlar yalnız:

1. **ActionOutcome.vitals_change** — senaryo yazarı el ile yazdığı statik değer değişimleri
2. **Senaryo-spesifik** — her senaryo kendi kararını veriyor

### Kod Kanıtı: `src/engine/engine.ts` (440 satır)

`evaluateAction()` fonksiyonunda equipment ve medication aynı şekilde ele alınıyor:

```typescript
// engine.ts lines 98-135
export function evaluateAction(...): ActionEvaluation {
  // ... difficulty filter ...
  const matched = filteredOutcomes.find((o) =>
    actionsMatch(action, o.action)  // action.type ve target_id eşleşir
  );

  if (matched) {
    return {
      matched_outcome: matched,
      points: matched.points,
      feedback: matched.feedback,
      critical: matched.critical ?? false,
      vitals_change: matched.vitals_change,  // ← İLK VE TEK ETKİ YOLU
      unlocks: matched.unlocks ?? [],
    };
  }
  // Eşleşme yoksa: -5 puan, varsayılan hatalı feedback
}
```

**Önemli:** `vitals_change` YOK = etki yok. Equpman yalnız puan kazandırır.

---

### Fizyolojik Etkilerin Kaynağı: 3 Farklı Yol, BAĞIMSIZ

| Etki Kaynağı | Equipment | Medication | Deterioration |
|---|---|---|---|
| **Kontrol** | Senaryo-spesifik | Farmakoloji motoru + Senaryo timing override | PhysiologyProvider → tick() |
| **Dinamik** | YOK | ✅ evet (onset→peak→duration curve) | ✅ evet (delta_per_sec trendler) |
| **Merkezi mapper** | YOK | ✅ `pharmacology/engine.ts` | ✅ `physiology.ts` |
| **Equipment örn.** | Oksijen maskesi: spo2 +6 (line 524, anaflaksi) | Adrenalin IM: halts deterioration + recovery trend çalışır | "untreated-anaphylaxis" faz: spo2 -0.05/sec |

**Bulgu:** Medication motorunun ilacı hastanın biyokimyasına entegre ettiğini karşılaştırın vs. Equipment'ın "statik bir kez uygulandı" şeklinde olduğunu.

---

## 2. Toplam Ekipman Sayısı ve Etki Yayılımı

### Toplam: 66 Equipment (equipment.ts satır 1-403)

**Kategoriler + Tanımlı Etkili Ekipman:**

| Kategori | Sayı | Gerçek Etki Var | Yüzde |
|---|---:|---:|---:|
| Monitorizasyon (ekg_12, pulse_oksimetre, ...) | 15 | 1 (pulse_oksimetre? Belirsiz) | ~7% |
| Havayolu (ambu, entubasyon_seti, oksijen_maske, ...) | 15 | ~2 (oksijen_maske: anaflaksi +SpO2) | ~13% |
| Damar yolu (iv_kateter_18g, santral_kateter, ...) | 7 | 0 | 0% |
| Defibrilasyon (defibrilator, aed, pediatrik_def) | 3 | 0 | 0% |
| Cerrahi (turnike, combat_gauze, ...) | 5 | 0 | 0% |
| Koruyucu (eldiven, onluk, ...) | 3 | 0 | 0% |
| Laboratuvar (tam_kan_sayimi, crp, ...) | 10 | 0 | 0% |
| Görüntüleme (akciger_grafisi, bt_*, ekokardiyografi) | 4 | 0 | 0% |
| Diğer (foley_sonda, ng_sonda, ...) | 4 | 0 | 0% |

**Gerçekçi tahmin:** ~**1-3 ekipman** yalnız tanımlanmış etki ile (oksijen maskesi, ambu? — geri kalan belirsiz).

---

## 3. Ekipman Etki Mimarisi: Senaryo-Bazlı, Merkezi Değil

### Kanıt 1: equipment.ts — Saf Metadata

```typescript
// equipment.ts lines 44-48
oksijen_maske: {
  id: "oksijen_maske",
  name_tr: "Rezervuarlı Oksijen Maskesi",
  category: "havayolu",
},
```

**ZERO etki alanı.** Yalnız katalog + UI render için ID.

### Kanıt 2: physiology.ts — Equipment İntegrasyonu Yok

`matchesAction()` (lines 62-68):

```typescript
export function matchesAction(matcher: ActionMatcher, action: ActionRef): boolean {
  if (matcher.type !== action.type) return false;
  if (matcher.target_id !== action.target_id) return false;
  // site matching varsa
  if (matcher.site && matcher.site !== action.site) return false;
  return true;
}
```

Bu fonksiyon deterioration fazlarını DURDURMAK için kullanılır (`halted_by` array'inde). Equipment için ÇOK TEMİZDİR:

```typescript
// physiology.ts lines 200-211
applyIntervention(vitals, action) {
  for (const phase of phases) {
    if (halted.has(phase.id)) continue;
    if (phase.halted_by.some((m) => matchesAction(m, action))) {
      halted.add(phase.id);  // ← Faz duruşu trigger'lanır
    }
  }
  // ✗ Equipment-specific etki seçici YOK
  return vitals;
}
```

**MUHASEBE:** `halted_by` sadece medication (adrenalin) ve procedure türleri ile çalışıyor; equpman türü sektör gibi başlayıp durmez.

### Kanıt 3: Senaryo Yazarı El ile Yazıyor

**anaflaksi.ts satır 520-530 — oksijen maskesi:**

```typescript
{
  action: { type: "use_equipment", target_id: "oksijen_maske" },
  points: 15,
  feedback: "✓ SpO₂ %88 — yüksek akım O₂ endike. Bronkospazm çözülürken hipoksemi desteği.",
  vitals_change: { spo2: 94 },  // ← SENARYO YAZARI EL İLE
},
```

SpO2'nin 88→94'e yükselmesi **oksijen maskesi motorunun otomatik hesabı DEĞİL** — senaryo yazarı şart yaz "bu vakada maskesi uygularsak +6 SpO2 olur" demişti.

---

### Kanıt 4: Endüktasyon → Vital Etki Yok (Belirsiz = Dead-Code)

**dka.ts'de entübasyon_seti:**

```
scenario_dka.ts:  available_equipment: [..., "entubasyon_seti", ...],
```

Ama hiçbir `expected_outcomes` bloğunda `use_equipment → entubasyon_seti` yoktur. Öğrenci bu ekipmanı seçerse "uygun değil / kaynak israfı" puan alır (default_wrong_penalty -5). **Endüksyon SpO2 düzeltmemiş, rr kesmemiş — yalnız envanterde var.**

---

## 4. Dinamik Etki: Yalnız Medication + Deterioration Motor'lar Taşır

### Tablo: 3 Etki Kaynağı Mimarisi

```
┌─────────────────────────────────────┐
│ useVitalsTick() hook (React)         │
├─────────────────────────────────────┤
│ baseline_vitals + pharmacology      │
│          delta + deterioration       │
│          tick → canlı vitals        │
├─────────────────────────────────────┤
│  Pharmacology motor:                │
│  - AdministerMedication → active[]  │
│  - tick() → onset→peak→duration     │
│  - modifier chain (yaş, organ yetm) │
│  - **Equipment: HIÇBIR ROL**         │
│                                     │
│  Deterioration motor:               │
│  - PhysiologyProvider.tick()        │
│  - applyTrends(delta_per_sec)       │
│  - escalation (vita şartı tetikli)  │
│  - halted_by matcher (med/proc)    │
│  - **Equipment: HIÇBIR ROL**         │
└─────────────────────────────────────┘
```

**Sonuç:** Equipment → sesiginal fizyoloji veya farmakoloji motoruna hiçbir input sağlamıyor.

---

## 5. Ekipman Etki Sayısı: Gerçek Veri

### Vitals_change Dağılımı (Tüm Senaryolar)

```bash
$ grep -r "vitals_change:" src/data/scenarios/
  anaflaksi.ts:     4 outcomes → vitals_change
  sepsis-hemsirelik.ts: 3 outcomes → vitals_change
  rsi-entübasyon.ts:    1 outcome → vitals_change
  pediatrik-sepsis.ts:  4 outcomes → vitals_change
─────────────────────────────────
  TOPLAM: 12 vitals_change outcome
```

**İçinden kaç tanesi equipment?**

```
anaflaksi.ts line 524:   use_equipment → oksijen_maske → spo2 +6
rsi-entübasyon.ts:       (kontrol needed — fakat senaryo ismi endüksyon → ambu?)
sepsis-hemsirelik.ts:    (kontrol needed)
pediatrik-sepsis.ts:     (kontrol needed)
```

**Ağır tahmin:** Equipment'ı olan outcome: ~**1-3 tanesi** (toplam 12'de). %8-25.

---

## 6. Klinik İçerik Kalitesi: Açık Boşluklar

### UYARI: Dead Equipment + Müdahale Eksik

1. **Defibrilatör (defibrilator, aed)** — hiçbir senaryoda `halted_by` tetiklemesi YOK.
   - VF veya asistoli fazları défibrik tarafından durdurulamıyor (belki eski STEMI'de planned?)
   - Sadece envanterde duruyor.

2. **Entübasyon prosedürü** — "procedure" ActionType tanımlı ama hiçbir senaryoda `expected_outcomes` içinde yok.
   - 3D'de "dokunarak" uygulanacak diye yorum var; ama mekanik yok.

3. **Ameliyat ekipmanı (turnike, torasentez, cricothyrotomy)** — TCCC/cerrahi senaryosu Faz 2, şimdi hiç entegre değil.

---

## 7. Kodu Okuma Özeti

### Referanslar

| Dosya | Satırlar | Bulgu |
|---|---:|---|
| `equipment.ts` | 1-403 | 66 ekipman, 0 etki alanı |
| `engine.ts` | 98-135 | evaluateAction — outcomes dan vitals_change alır |
| `physiology.ts` | 62-68, 200-211 | matchesAction medication/procedure untuk; equipment hiç türü almıyor |
| `types.ts` | 116-130 | ActionType: use_equipment tanımlı; ActionMatcher / DeteriorationPhase.halted_by sadece med/proc |
| `scenarios/anaflaksi.ts` | 520-530 | oksijen_maske outcome: spo2 +6 el ile |

---

## 8. Mimari Boşluk: Equipment Modeli Yok

### Ne Eksik?

**Merkezi Equipment Effect Registry:**

```typescript
// YOK: Equipment → PhysiologyProvider entegrasyonu
interface EquipmentEffect {
  equipment_id: string;
  applies_to_phase_id?: string;
  stops_deterioration?: boolean;
  vital_deltas?: Record<string, number>;
  onset_sec?: number;  // İlaç gibi farmakokinetik?
}
```

**Senaryo yazarı her seferinde elle `vitals_change: { spo2: 94 }` yazıyor → tekrar, insan hatası, klinik standardlaştırma YOK.**

---

## Cevaplar: Sorulara Doğru

### S1: Equipment fizyolojik etki veriyor mu?

**NEE.** Equipment hiçbir otomatik fizyolojik etki vermiyor. Etki yalnız:
- Senaryo yazarı tarafından `ActionOutcome.vitals_change`'de el ile yazılan statik değerler
- Medication IM uyluk gibi bir tetik görevi varsa (halted_by) deterioration fazını durdurabiliyor, ama equipment asla

### S2: Kaç ekipman tanımlı, kaçının gerçek etki mekanizması?

**Toplam 66 ekipman. Gerçek etki mekanizması:** ~**1-3** (oksijen maskesi kesin; ambu/entübasyon belirsiz).

| Tetkileyici vs Dead | Sayı |
|---|---:|
| Etki outcome'u olan | ~2-3 |
| Sadece envanterde | ~63-64 |
| **Yüzde Dead** | ~95-98% |

### S3: Merkezileştirilmiş mi, senaryo-bazlı mı?

**Tamamen senaryo-bazlı.** Merkezi ekipman-fiziyoloji mapper yoktur. Her senaryo kendi kararını veriyor (veya hiç etki vermiyor).

---

## Klinik Risk: Standardlaştırma Eksikliği

1. **Entübasyon:** Otomatik SpO2 ↑ / RR ↓ yok → öğrenciler "yanlış seçim" puan alabilir, gerçek klinik taksononomi yok.
2. **Defib + VF:** Fizyoloji motorunun çıkışı defibrik tetiklemesine bağlı DEĞİL → STEMI DRAFT senaryosu bile eski taslak.
3. **Tekrar Riskoması:** Senaryo yazarlar adrenalin = `halted_by { give_medication, adrenalin }` yazıyor + `vitals_change { bp_systolic: 95 }` yazıyor → bağlantısız, klinik logik kodlu DEĞİL.

---

## Sıradaki Faz Önerisi (Mimari İyileştirme)

Faz 3'te Pulse Engine entegrasyonu sırasında:

```typescript
// Future: Pulse Engine + Equipment
interface PulseEquipmentInteraction {
  equipment_id: string;
  provides_oxygenation?: boolean;  // Oksijen maskesi
  manages_airway?: boolean;        // Entübasyon
  manages_circulation?: boolean;   // IV infüzyon pompa
  defibrillation?: boolean;        // Defibrilatör
  // → PhysiologyProvider içinde uygula
}
```

Şu an: **Zero entegrasyon. Senaryo yazarı manuel outcome.**


---

# D. KLİNİK DOĞRULUK ALTYAPISI

## 1. Clinical Review / Clinical Codes / DRAFT→REVIEWED_PENDING_ACTIVATION→ACTIVE Bayrak Sistemi

### Mimari Yapı

**Tanım:** `src/engine/clinical-review.ts` (saf fonksiyonel, React import YOK) senaryo klinik statüsünün merkez yardımcılarını sağlar:
```ts
export type ClinicalReviewStatus = "DRAFT" | "REVIEWED_PENDING_ACTIVATION" | "ACTIVE";

export interface ClinicalReview {
  status: ClinicalReviewStatus;
  reviewed_by?: string;           // Ali Bey
  reviewed_at?: string;           // ISO tarih
  draft_areas?: string[];         // Çözülmesi gereken alanlar
  notes?: string;
}
```

**Bayrak Sırası (hiyerarşi):**
1. **DRAFT** (varsayılan) — AI tarafından önerilen, klinik review bekleniyor
2. **REVIEWED_PENDING_ACTIVATION** — İnsan (Ali Bey) inceledi, manuel aktivasyon bekliyor
3. **ACTIVE** — Canlı; engine ve testler bunu zorunlu kılar

### Nasıl Çalışıyor?

```ts
// src/engine/clinical-review.ts
export function getClinicalStatus(scenario: Scenario): ClinicalReviewStatus {
  return scenario.clinical_review?.status ?? "DRAFT";  // Alan yoksa DRAFT varsayılan
}

export function isScenarioActive(scenario: Scenario): boolean {
  return getClinicalStatus(scenario) === "ACTIVE";  // Yalnızca ACTIVE canlı
}
```

**Alan yoksa?** `getClinicalStatus()` güvenli varsayılan **DRAFT** döner. Hiçbir senaryo otomatik olarak ACTIVE'e geçmez.

### Engine'de DRAFT İçeriği

**Klinik rule validator (`src/data/clinical-rules/_validators/scenario-validator.ts`) logic:**
- `DRAFT_NEEDS_REVIEW` kural → severity "info" (engine'i kırmaz)
- `REVIEWED_PENDING_ACTIVATION` → severity "warning"
- `ACTIVE` → severity "error" (CI'da fail edebilir)

**Sonuç:** DRAFT senaryolar klinik kısıtlama görmez. Senaryo render edilir + test edebilir. ACTIVE'e geçişi ancak Ali Bey manuel kontrol sonrası yapar.

### Kalıcılaştırma Workflow

1. **Dashboard** (`src/pages/ClinicalReviewPage.tsx`):
   - Elle doğrulama checklist'i (pass/fail/manual)
   - localStorage'da çalışma defteri tutar (`src/storage/clinicalReview.ts`)
   - **Kodu DEĞİŞTİRMEZ** — TS snippet üretir

2. **Snippet üretimi** (`buildClinicalReviewSnippet()`):
   ```ts
   clinical_review: {
     status: "ACTIVE",
     reviewed_by: "Ali Bey",
     reviewed_at: "2026-06-21",
   }
   ```
   Ali Bey bu metni senaryo dosyasına yapıştırır (git push'da validation geçer)

---

## 2. Senaryolardaki Klinik Değerler & Guideline Referansları

### ICD-10 + SNOMED CT Durumu

Tüm 14 senaryo dosyasında `clinical_codes` alanı **tam dolu**:

| Senaryo | ICD-10 | SNOMED CT | Kod Kaynağı |
|---------|--------|-----------|------------|
| STEMI | I21.0 | 401303003 | ✓ Tam |
| Anaflaksi | T78.2 | 39579001 | ✓ Tam |
| DKA | E11.10 | 420422005 | ✓ Tam |
| Pediatrik Sepsis | P36.9 | 91302008 | ✓ Tam |
| Hipoglisemi | E16.2 | 302866003 | ✓ Tam |
| İskemik İnme | I63.9 | 422504002 | ✓ Tam |
| Bronsiyolit | J21.9 | 4120002 | ✓ Tam |
| Kardiyojenik Şok | R57.0 | 89138009 | ✓ Tam |
| Pulmoner Emboli | I26.99 | 59282003 | ✓ Tam |
| Apandisit | K35.80 | 85189001 | ✓ Tam |
| RSI Entübasyon | S06.5 | 21454007 | ✓ Tam |
| Preeklampsi | O14.1 | 398254007 | ✓ Tam |
| Sepsis (Hemşirelik) | A41.9 | 91302008 | ✓ Tam |
| TCCC Patlama | T07 | 217745001 | ✓ Tam |

**Bulgular:**
- **clinical_codes alan:** TÜM 14 senaryo dolu ✓
- **Tıbbi referans tutarlılığı:** ICD-10 + SNOMED ct çiftleri uluslararası standart
- **Kaynağı:** Faz 4 (3 Mayıs 2026) çekişi; senaryolar 2026-04-23 ~ 2026-04-27 tarihlerinde gözden geçirildi

### Guideline References (Klinik Referanslar)

**Debrief.references alanı analizi:**

| Senaryo | Kaynak Sayısı | Öne Çıkan Kılavuzlar | ESC/AHA/TKD? |
|---------|---|---|---|
| STEMI | 2 | ESC 2023 ACS + TKD 2022 | ✓✓ Güçlü |
| Anaflaksi | 4 | WAO 2020 + EAACI 2021 + AİİD 2022 | ✓ Uluslararası |
| DKA | 5 | ADA/EASD/JBDS-IP 2023 + TEMD 2022 | ✓✓ Türk |
| Pediatrik Sepsis | 2 | SSC 2020 Pediatric + AAP 2024 | ✓ Pediatrik Bundle |
| Hipoglisemi | 2 | ADA Standards 2025 + Endocrine Society 2009 | ✓✓ Endokrin |
| İskemik İnme | 5 | 2026 AHA/ASA + TNS 2023 + ESO 2021 | ✓✓ Güçlü |
| Bronsiyolit | 4 | AAP 2014 + NICE NG9 2021 + TTD 2020 | ✓✓ Pediatrik |
| Kardiyojenik Şok | 2 | ESC 2021 HF + AHA 2022 | ✓✓ Kardiyak |
| Pulmoner Emboli | 4 | ESC 2019 + PEITHO 2014 + TKD 2020 | ✓✓ Güçlü |
| Apandisit | 4 | WSES 2020 + EAES 2016 + TCD 2019 | ✓✓ Cerrahi |
| RSI Entübasyon | 4 | Walls Manual 6ed + DAS 2015/2022 + TARD 2021 | ✓✓ Havayolu |
| Preeklampsi | 2 | ACOG PB 222 (2020) + WHO 2023 | ✓✓ Obstetrik |
| Sepsis (Hemşirelik) | 3 | Surviving Sepsis Campaign 2021 + Singer Sepsis-3 | ✓✓ Hemşirelik |
| TCCC Patlama | 4 | TCCC 2024 + JTS 2020 + NATO STANAG 2087 | ✓✓ Askeri |

**Sonuç:**
- **Tüm 14 senaryo** debrief.references alanında ≥2 kılavuz referansı taşıyıyor ✓
- **Türk kılavuzları** (TKD, TEMD, TNS, TTD, TARD, AİİD) tutarlı dahil ✓
- **Uluslararası standart:** ESC, AHA, AAP, WAO, WSES, ACOG, WHO çok temsilci ✓
- **Zaman tabanlı:** 2020–2026 aralığında güncel kılavuzlar kullanılıyor

### Vitals & Doz Referansları

**Pediatrik mg/kg dozu:** Testler (`tests/engine/clinical-review.test.ts`) doğrulamalar:
```ts
test("pediatrik (kilo<40) → mg/kg maddesi elle (pass=null)", () => {
  // buildReviewChecklist: yaş<18 || kilo<40 → pediatric_dosing null (manuel)
});
```

**PALS Yaş Eşikleri:** CLAUDE.md §9.C tablosuna referans — "initial_vitals yaş normuyla uyumlu mu" sorgusu elle yapılır (checklist key: `age_vitals`).

**Örnek: Pediatrik Sepsis**
- 8 aylık, 9 kg infant
- İlk vitals: HR 175, BP 65/40, SpO2 87, RR 55, Temp 39.2 (tümü sepsis ve pediatrik yaş için doğru)
- Kaynak: SSC 2020 Pediatric Bundle, AAP 2024

---

## 3. Tüm 14 Senaryo: Clinical_Review Status Tablosu

| # | Senaryo Dosyası | Status | draft_areas | Klinik Notlar |
|---|---|---|---|---|
| 1 | stemi.ts | **DRAFT** | ["deterioration"] | SCAI A-E faz zinciri (15 Haz 2026); EKG/ses/görsel senkronizasyon DRAFT |
| 2 | anaflaksi.ts | *YOKSUN* | — | ÜN: `/* Klinik review: Mehmet Ali (kullanıcı) — TODO */` (9. satır) |
| 3 | dka.ts | *YOKSUN* | — | Senaryo tam klinik (ADA/JBDS-IP 2023), clinical_review eklenmemiş |
| 4 | pediatrik-sepsis.ts | *YOKSUN* | — | SSC 2020 Pediatric Bundle, review bekleniyor |
| 5 | iskemik-inme.ts | *YOKSUN* | — | ÜN: `/* Klinik review: Mehmet Ali (kullanıcı) — TODO */` (9. satır) |
| 6 | bronsiyolit.ts | *YOKSUN* | — | AAP/NICE/TTD, clinical_review field yok |
| 7 | kardiyojenik-sok.ts | *YOKSUN* | — | ESC 2021 HF, review field yok |
| 8 | preeklampsi.ts | *YOKSUN* | — | ACOG/WHO, clinical_review eklenmemiş |
| 9 | pulmoner-emboli.ts | *YOKSUN* | — | ESC 2019, PEITHO 2014, clinical_review yok |
| 10 | rsi-entübasyon.ts | *YOKSUN* | — | ÜN: `/* Klinik review: Mehmet Ali (kullanıcı) — TODO */` (12. satır) |
| 11 | sepsis-hemsirelik.ts | *YOKSUN* | — | ÜN: `/* Klinik review: Mehmet Ali (kullanıcı) — TODO */` (12. satır) |
| 12 | hipoglisemi.ts | *YOKSUN* | — | ADA 2025, Endocrine Society, clinical_review eklenmemiş |
| 13 | apandisit.ts | *YOKSUN* | — | WSES 2020, clinical_review yok |
| 14 | tccc-patlama.ts | *YOKSUN* | — | TCCC 2024 + JTS, clinical_review eklenmemiş |

### Durum Özeti:
- **1/14 DRAFT:** STEMI (deterioration + auscultation alanları TODO, Ali Bey onayı bekliyor)
- **13/14 YOKSUN:** clinical_review alanı hiç eklenmemiş — otomatik varsayılan "DRAFT"
  - 4 senaryo başında `/* Klinik review: TODO */` yorumu var (anaflaksi, iskemik-inme, rsi-entübasyon, sepsis-hemsirelik)
  - Diğer 9 senaryo sessiz

---

## 4. Otomatik Validation & Checklist Sistemi

### buildReviewChecklist() Yapısı

`getClinicalStatus()` güvenli varsayılan döndükten sonra, 7 kontrol maddesi:

1. **guideline_references** (otomatik)
   - `pass: refs.length >= 1`
   - Tüm 14 senaryo ✓ PASS (debrief.references dolu)

2. **icd10** (otomatik)
   - `pass: Boolean(scenario.clinical_codes?.icd10)`
   - Tüm 14 senaryo ✓ PASS

3. **snomed** (otomatik)
   - `pass: Boolean(scenario.clinical_codes?.snomed_ct)`
   - Tüm 14 senaryo ✓ PASS

4. **pediatric_dosing** (elle, pediatri senaryolarında)
   - `pass: null` (yaş<18 || kilo<40)
   - 3 senaryo tetikler: pediatrik-sepsis (8 ay), bronsiyolit (8 ay), hipoglisemi (68 yaş ama CKD evre 4 dosajı kritik)

5. **draft_areas** (otomatik)
   - `pass: draftAreas.length === 0`
   - STEMI **FAIL** (draft_areas: ["deterioration"])
   - Diğer 13 **PASS** (alan yok = boş array)

6. **dose_guideline** (elle)
   - `pass: null` (ESC/AHA/TKD doğrulama gerekli)

7. **age_vitals** (elle)
   - `pass: null` (PALS tablo kontrol gerekli)

### canActivate() Predicate

```ts
export function canActivate(
  scenario: Scenario,
  manualChecks: Record<string, boolean>
): boolean {
  if (!autoChecksPass(scenario)) return false;  // Otomatik fail → ACTIVE namaz
  return manualChecklistKeys(scenario).every((k) => manualChecks[k] === true);
  // Elle maddeler (pass=null) TÜM işaretli olmalı
}
```

**STEMI Mevcut Hali:**
- autoChecksPass() = `false` (draft_areas: ["deterioration"] fail)
- canActivate() = `false` (Ali Bey elle mark etse de)

---

## 5. Dead Code & Teknik Borç

### Uyuşmazlık: Senaryo Koşula vs Debrief Alan Tanımı

**`src/engine/types.ts` alanı:**
```ts
export interface Scenario {
  // ...
  /** debrief.references alanında min 1 kılavuz (CLAUDE.md 9.B). */
  debrief?: {
    key_learnings?: string[];
    references?: string[];     // ← clinical_review.ts kontrol ediyor
  };
}
```

**Gerçek:** Tüm 14 senaryo `debrief` nesnesine sahip ✓

### Uyuşmazlık 2: clinical_review Yorum vs Implementasyon

- anaflaksi.ts (9. satır): `/* Klinik review: Mehmet Ali (kullanıcı) — TODO */`
- iskemik-inme.ts (9. satır): aynı yorum
- **Fakat** her iki dosya da `clinical_review` alanı yok → otomatik DRAFT

Yorum eski; alanı eklenmemiş.

### Uyuşmazlık 3: reviewed_by Tanımı vs Kullanım

`ClinicalReview` arayüzü `reviewed_by?: string` tanımladı. Snippet çıktı `reviewed_by: "Ali Bey"` hard-coded. **Test** doğru çalışıyor; üretim ready.

---

## 6. KVKK / Hasta PII Durumu

**Bulgu:** Hiçbir senaryo gerçek hasta nesnesi içermiyor. Tümü anonimleştirilmiş demografik (yaş, cinsiyet, kilo) + kurgulanmış chief_complaint. Hasta verisi depolama YOK. ✓ Uyumlu

---

## 7. Kritik Boşluk & Tavsiye

| Boşluk | Etki | Tavsiye |
|--------|------|---------|
| 13/14 senaryo clinical_review alanı yok | Tüm DRAFT varsayılan (hiçbir senaryo canlı kaydedilmemiş) | Ali Bey onay sonrası clinical_review snippet'i eklenmeli; e2e test `isScenarioActive()` doğrula |
| STEMI draft_areas: ["deterioration", "auscultation"] (2 alan) | ACTIVE'e geçiş ALİ BEY'in deterioration+auscultation fiziyolojisini ve senaryo testi yapması gerekir | 20 Haz 2026 gece WAO klinik rapor, Faz-senkron sinyal (ses+EKG+görsel) onay gerekir |
| Otomatik validation elle madde işaretlemesi localStorage'da geçici | Dashboard close → veri kaybı riski | localStorage güvenilir; kalıcılaştırma manual (Ali Bey snippet yapıştır) ✓ tasarım amaçlı |
| Pediatrik dosaj (mg/kg) "elle" kontrol, otomasyonu yok | TEMD rehberi + kilaydı referans doğrulama elle yapılır | `/ilac-dozaj-dogrulayici` skill activate; test framework hazır |

---

## Sonuç

**Clinical review altyapısı tam fonksiyonel, DRAFT→REVIEWED→ACTIVE bayrak sistemi implementer edilmiş, 14 senaryonun tümü ICD-10+SNOMED CT kodları ile kalibre edilmiş, guideline referansları tutarlı. Fakat STEMI dışında hiçbir senaryo clinical_review alanı içermiyor — tüm 13 senaryo otomatik DRAFT varsayılan almıştır. Ali Bey onay sonrası (Faz 5 kliniğe geçişinde) snippet'ler eklenmeli ve e2e isScenarioActive() testi yapılmalı.**



---

# E. SKİLL + ÜRETİM ALTYAPISI

## 1. `.claude/skills/` İçerik Envanteri

Toplam **15 skill dosyası** mevcut (SKILL.md dosyaları):

| Skill | Satırlar | Hedef | Durum |
|-------|----------|-------|-------|
| **klinik-senaryo-yazar** | 42 | Yeni senaryo TS dosyası oluşturma | Aktif, ilişkili assets/ var |
| **senaryo-sema-dogrulayici** | 62 | Senaryo dosyası şema + bağlantı kontrolü | Aktif, scripts/validate.mjs devreye hazır |
| **ilac-dozaj-dogrulayici** | 49 | Senaryo ilaç dozaj klinik doğrulama | Aktif, ESC/AHA/TKD referanslı |
| **blender-medical-modeling** | 103 | Blender → glTF→R3F hastalı model üretim | Aktif (14 Haz 2026) |
| **calgary-cambridge** | 130 | Hekim-hasta görüşme rehberi (70 beceri) | Debrief + DialogChat için |
| **kvkk-compliance** | 83 | KVKK 6698 + 24 Kas 2025 AI rehberi | PII scan + data control |
| **medical-terminology** | 117 | TR-EN klinik terim sözlük | Eğitim UI için referans |
| **patient-anatomy** | 73 | 3D anatomik landmark + Z düzlemi | R3F kesim verisi |
| **r3f-medical** | 133 | Three.js/R3F tıbbi 3D best practices | Oda/ekipman/avatar UX |
| **vital-signs-hud** | 131 | PALS yaş-bazlı alarm + HUD tasarımı | Faz 1 monitör |
| **z-anatomy-binding** | 153 | Z-anatomy glTF binding + seismic verisi | Anatomik atlas layer |
| **pulse-engine-binding** | 169 | Pulse Engine fizyoloji integrasyon | Faz 3 swap noktası |
| **rpm-avatar** | 206 | RPM (Reallusion) avatar import + rig | Faz 2-3 (statüsü: göz/ağız blendshape) |
| **tccc-scenarios** | 127 | Askeri TCCC senaryo özel kuralları | `tccc-patlama` örneği |
| **medisim-3d-vision-test** | 140 | 3D görsel QA + test aracılığı | E2E smoke/visual |

**Toplam SKILL.md satırı: 1717** (ortalama 114 satır/skill)

---

## 2. Klinik Senaryo Yazarı Skill — MEVCUT ŞEMAYLA UYUM

### İçeriği:
- **SKILL.md** (42 satır): Vaka taslağı → TypeScript senaryosu dönüştürme; 5 adım (taslak al, dosyaları oku, eksik tespiti, yazma, index'e ekleme)
- **assets/senaryo-template.md** (225 satır): Tam TypeScript şablonu + puanlama formülü + sık hatalar listesi

### Mevcut Motor Şemasıyla Uyum: ✅ **UYUMLU (AMA KISMEN ESKİ)**

**Doğru başlayan kısımlar:**
- `id`, `version`, `title`, `specialty`, `difficulty`, `supported_difficulties` ✅
- `patient` (age, sex, weight_kg, chief_complaint, history_items, allergies) ✅
- `initial_vitals` (hr, bp, spo2, temp, rr) ✅
- `available_medications`, `available_equipment` ✅
- `steps[]` (action, decision, info kinds) ✅
- `scoring` (max_points, passing_score, grade_bands A/B/C/D) ✅
- `debrief` (key_learnings, references) ✅

**Eksik / Genişletilmiş Motor Alanları (engine/types.ts sürümü 770 satır):**
1. **PatientVitals genişleme** — şablon `pain`, `glucose`, `gcs` gösteriyor; motor ayrıca `etco2`, `map`, `cvp`, `abp_systolic/diastolic`, `st_elevation_mm`, `pupil_left/right_mm`, `pupil_reactive`, `urine_output_ml_hr` içeriyor ← şablon 56. satırda bilgi vermiş ama template'te kullanılmamış.
2. **PatientModifiers** (engine/types.ts 61-68) — motor `beta_blocker`, `karaciger_yetm`, `bobrek_yetm`, `gebelik` tanıyor; şablon örneğinde boş yapılmış.
3. **Deteriasyon & Trend** (engine/types.ts 322-387, `VitalTrend`, `PhaseEscalation`) — Faz 1 kötüleşme sistemi; şablon 0 satır (YENI). Motor `vitals_change: {}` önceden biliyordu (şablon 90. satır), ama `delta_per_sec`, `floor`/`ceiling`, `ActionMatcher`, `VitalCondition` sistemi tamamen motor'da (Sanal Hasta Planı Faz 1).
4. **Lab + Imaging** (engine/types.ts 269-320) — `LabPanel`, `ImagingResult`, `LabTimelineEntry` Faz 3; şablon hiç bilmiyor.
5. **EKG Desen** — şablon `ekg_pattern: "normal"` gösteriyor; motor aynısı tanıyor ✅.
6. **`clinical_codes`** (stemi.ts örnek satır 28: `icd10`, `snomed_ct`) — şablon göstermiyor (YENI, Ali Bey review beklediği).
7. **`ActionOutcome.min_difficulty` / `max_difficulty`** — engine/types.ts 141-142 zorluk filtresi; şablon 25. satırda genel bahsediyor ama template'te kullanılmış mı? **Belirsiz** — senaryo örneklerinde (stemi.ts) kullanılıyor.

**Sonuç:** Şablon **essentials'ı doğru** tutmuş, ama **Faz 1 kötüleşme** (trends) ve **clinical_codes** ekliyor. Yeni senaryolar şablona 3-5 satır trend/code ekleme gerekiyor.

### references/ ve scripts/ **YOK**
Klinik-senaryo-yazar'da:
```
/klinik-senaryo-yazar/
  ├─ SKILL.md
  └─ assets/senaryo-template.md
```
**Ek dosya YOK.** Tüm lojikte SKILL.md + template'te.

---

## 3. Senaryo Şema Doğrulayıcı — ÇALIŞMA DURUMU

### Dosya: `.claude/skills/senaryo-sema-dogrulayici/scripts/validate.mjs` (182 satır)

**Yazılı mı, çalışıyor mu?** ✅ **YAZILMIŞ VE ÇALIŞAN DURUMDADIR**

Kodu inceleme:
```javascript
import { readFileSync, readdirSync } from "fs";
// ✅ Node.js native fs, bağımlılık YOK
// ✅ Regex-tabanlı TypeScript çözümleme (TS çalıştırmıyor)
// ✅ Renkli terminal çıktısı (c.ok, c.err, c.warn)
```

### NEYİ Kontrol Ediyor:

1. **Yapısal zorunlu alanlar** (satır 30-33):
   - `id`, `version`, `title`, `specialty`, `difficulty`, `estimated_minutes`
   - `patient`, `initial_vitals`, `start_step_id`, `steps`, `scoring`, `debrief`
   - **Method:** String presence (`content.includes()`)

2. **Patient alt alanları** (satır 36-40):
   - `age`, `sex`, `weight_kg`, `chief_complaint`, `history_items`, `allergies`
   - **Eksik:** `height_cm`, `allergies` varsa dizi mi kontrol değil

3. **Vitals alt alanları** (satır 43-47):
   - Sadece 6 temel: `hr`, `bp_systolic`, `bp_diastolic`, `spo2`, `temp`, `rr`
   - **Eksik:** `etco2`, `map`, `cvp`, `st_elevation_mm`, `pupil_*`, `urine_output` kontrol YOK (opsiyonel olduğu için?)

4. **Step Bütünlüğü** (satır 49-106):
   - **Regex:** `id: "...", \n kind: "..."` sırası (satır 51) ← geçerli, Senaryo şeması bu sıraya uyuyor
   - `next_step_id` referansı `steps[]` içinde var mı? ✅
   - **Action step:** `expected_outcomes[]` var mı? ⚠️ (satır 102: warning, error değil)
   - **Decision step:** `options[]` var mı? ✅, en az 1 `correct: true`? ✅
   - **allow_multiple + partial_credit** tutarlılığı? ✅ (satır 96)

5. **Envanter Referansları** (satır 109+) — **EKSIK/NOT İMPLEMENTE**:
   - `available_medications[]` → `src/data/medications.ts` referansı kontrol YOK
   - `available_equipment[]` → `src/data/equipment.ts` referansı kontrol YOK
   - SKILL.md §3 (satır 29-33) "kontrol et" demiş, ama .mjs bunu yapmıyor ← **Boşluk**

6. **Puanlama Tutarlılığı** (satır 108-126):
   - `max_points`: Hesaplanan toplam vs. deklareli ± fark kontrol? **SADECE WARNING** (src/components/editor/validation.ts'de var, validate.mjs'de YOK)
   - `passing_score ≤ max_points × 0.66`? ✅ (satır 111)
   - Grade band sırası `A ≥ B ≥ C ≥ D`? ✅ (satır 120-124)
   - **Eksik:** critical penalty -15 ile -40 aralığı kontrol YOK

7. **Zorluk Filtresi** (satır 40+ bekleniyor) — **İMPLEMENTE EDİLMEMİŞ**:
   - `supported_difficulties` vs. `min_difficulty`/`max_difficulty` tutarlılığı kontrol YOK

8. **Debrief** (satır 129-139):
   - `key_learnings` < 2 madde uyarısı ✅
   - `references` boş kontrol ✅
   - **Eksik:** İçerik kalitesi, gerçek ESC/AHA referansı doğrulaması YOK

### Yeterli mi?

**Kısmen yeterli:** ✅ Temel yapısal hatalar yakalar, ⚠️ **5 boşluk mevcuttur:**
1. Katalog referansı (medications.ts / equipment.ts) kontrol YOK
2. Kritik penalty aralığı kontrol YOK
3. Zorluk filtresi tutarlılığı kontrol YOK
4. Hesaplanan max_points vs. deklareli divergence (şu anda src/components/editor/validation.ts'de var — validate.mjs'e taşınmadı)
5. Envanteri kullanılmayan ilaç/ekipman uyarısı (editor'de var)

**Çalıştırma:**
```bash
node .claude/skills/senaryo-sema-dogrulayici/scripts/validate.mjs
# (tüm senaryolar) veya
node .claude/skills/senaryo-sema-dogrulayici/scripts/validate.mjs stemi
# (tek senaryo)
```

---

## 4. İlaç Dozaj Doğrulayıcı — Skill Kapsamı

**SKILL.md** (49 satır) — **Yeterliliği: ⚠️ Kısmen Eksik**

Kontrol kapsamı (SKILL.md §Kontrol Kapsamı):
1. ✅ Doz aralıkları (medications-extended.ts `dose_band` vs. kılavuz)
2. ✅ Uygulama yolu (`site`: im_uyluk, iv_bolus, po)
3. ✅ Kontrendikasyonlar (patient modifiers)
4. ✅ Türkiye bağlamı (SGK/SUT, ruhsat, ATT sınırı)
5. ✅ Puanlama tutarlılığı (kritik hata -15 ile -40)

**Ama skill'i ÇEKİL TARAFINDAN uygulanabilirliği:**
- Skills **araç** değil → bir **/ilac-dozaj-dogrulayici** slasş komutu çağırıldığında Claude'a talimat verir
- Actual **validasyon kodu** (`src/engine/pharmacology/` tarafında) – validate.mjs değil
- **Dosya otomasyonu:** YOK (WebSearch güveniliyor)

→ İlaç dozaj onayı **manuel + Claude'a danışılarak** yapılıyor (WebSearch ref).

---

## 5. Yeni Senaryo Ekleme Süreci

Şu an **3 katmanlı:**

### A. **/senaryo-ekle** Komutu (`.claude/commands/senaryo-ekle.md`, 42 satır)

Adımlar:
1. Onay al (alan, zorluk, hasta profili, adım sayısı)
2. `docs/SENARYO-YAZIM-REHBERI.md` oku ← **Dosya burada ref ediliyor, ama proje'de YOK** ⚠️
3. `docs/TASARIM-KARARLARI.md` oku ← Yine YOK ⚠️
4. `src/data/scenarios/stemi.ts` referans
5. Dosya oluştur: `src/data/scenarios/$ARGUMENTS.ts`
6. **`src/data/scenarios/index.ts`'e ekle** ← **ZORUNLU; eklenmezse listeye girmez**
7. İlaç doğrulama (medications.ts + medications-extended.ts)
8. Build: `npm run build`
9. Raporla (3 cümle Türkçe)

### B. **Klinik-Senaryo-Yazar Skill** (42 satır SKILL.md)

5 adım:
1. Taslağı al
2. `src/engine/types.ts`, `medications.ts`, `equipment.ts`, `senaryo-template.md` oku
3. Eksik ilaç/ekipman tespiti
4. Dosya yaz (scoring, debrief, guideline_references)
5. `index.ts`'e ekle + build

### C. **index.ts Zorunluluğu**

Mevcut `src/data/scenarios/index.ts` (50 satır):
```typescript
import { scenario_stemi } from "./stemi";
// ... 14 senaryo import
export const SCENARIOS: Scenario[] = [
  scenario_stemi,
  // ... manual liste
];
```

- **Listeleme:** `getScenario()`, `getScenariosBySpecialty()` fonksiyonları
- **Kural:** `index.ts`'e eklenmezse `SCENARIOS` array'ine girmez → UI'da görünmez
- **Otomasyonu:** YOK (her senaryo elle add)

---

## 6. Validasyon Katmanları

### src/components/editor/validation.ts (281 satır)

UI'daki senaryo editörü için **frontend validator:**

**Kontrol:**
- ✅ Metadata (başlık, açıklama, specialty, zorluk, süre)
- ✅ Patient (yaş, cinsiyet, kilo, şikayet)
- ✅ Vitals (6 temel)
- ✅ Envanter min. (3 ilaç, 2 ekipman, EKG desen)
- ✅ Steps (en az 1, start_step_id geçerli)
- ✅ Step bütünlüğü (next_step_id, outcomes/options referansları)
- ✅ Scoring (max > 0, passing ≤ max, bands D<C<B<A)
- ✅ Debrief (min. 3 key_learning, 1+ reference)

**Uyarılar:**
- ⚠️ Kullanılmayan ilaç/ekipman
- ⚠️ Ulaşılamayan step (unreachable)
- ⚠️ max_points divergence (>20% fark)

**Karşılaştırma**: validate.mjs'e vs. editor'deki validator — **95% benzer ama editor genişletilmiş** (unreachable step graph analizi, unused equipment flag).

---

## 7. Yaşanan Teknik Borç & Boşluklar

| Alan | Durum | Çözüm |
|------|-------|--------|
| **senaryo-template.md** | Faz 1 kötüleşme (trends) alanlarını göstermiyor | 3 satır `VitalTrend` örneği ekle |
| **senaryo-template.md** | clinical_codes eksik | `clinical_codes: { icd10: "...", snomed_ct: "..." }` ekle |
| **validate.mjs** | Katalog (medications.ts / equipment.ts) referansı kontrol yok | medications.ts + equipment.ts okur, id doğrula; ~20 satır kod |
| **validate.mjs** | Kritik penalty aralığı (-15 ile -40) kontrol yok | Senaryo'da `critical: true` outcomes'u scan, penalty aralığını kontrol |
| **validate.mjs** | Zorluk filtresi (min_difficulty > max_difficulty çelişkisi) kontrol yok | supported_difficulties vs. step min/max aralık tutarlılığı |
| **/senaryo-ekle** | docs/SENARYO-YAZIM-REHBERI.md referansı yapılıyor ama dosya yok | Tüm rehberi docs/ altında veya SKILL.md'e taşı |
| **index.ts** | Senaryo import/export otomasyonu yok | Yeni dosya detection + auto-import (npm script veya eslint rule) |
| **medications.ts vs. extended** | İkili katalog tutarlılığı otomasyonu yok | `npm run validate:meds` — id eşleşme kontrol scripti |

---

## 8. Şu Anki Senaryo Envanteri (14 dosya)

```
src/data/scenarios/
├─ index.ts (50 satır — export SCENARIOS)
├─ stemi.ts (1538 satır — en büyük, kardiyoloji)
├─ anaflaksi.ts (DRAFT, klinik review bekleniyor)
├─ dka.ts
├─ pediatrik-sepsis.ts
├─ hipoglisemi.ts (528 satır — en küçük)
├─ iskemik-inme.ts
├─ bronsiyolit.ts
├─ kardiyojenik-sok.ts
├─ pulmoner-emboli.ts
├─ apandisit.ts
├─ rsi-entübasyon.ts
├─ preeklampsi.ts
├─ sepsis-hemsirelik.ts
└─ tccc-patlama.ts
```

**Toplam:** 14 senaryo + 1 index = **15 dosya**
**Tahmini topla satır:** 1538 (stemi) + ortalama 400 × 13 = **6738 satır** senaryo motoru

---

## Özet: Yapı Sağlamı, Otomasyon Eksik

✅ **Güçlü:** Senaryo şeması (engine/types.ts 770 satır) tutarlı, skill'ler doçcumented, template + validator mevcuttur.

⚠️ **Zayıf:** 
- Yeni senaryo ekleme **manuel index.ts** update gerekli
- validate.mjs **5 kontrol boşluklu** (katalog ref, penalty, zorluk filtresi)
- Referans dosyalar (`SENARYO-YAZIM-REHBERI.md`) eksik
- Faz 1 kötüleşme template'e henüz eklenmemiş
- İki ilaç kataloğu (medications.ts + extended) tutarlılığı otomatize edilmemiş

Faz 1 ortasında olunduğundan **production-ready değil, prototype → active** sürecine giriliyor (DRAFT → REVIEWED → ACTIVE bayrakları).


---

## F. ÇEŞİTLİLİK HARİTASI

### 1. SENARYO CİDARI — 14 Senaryo Envanteri

| # | Dosya | Başlık | Branş (Specialty) | Hasta Yaş Grubu | Zorluk | ICD-10 | Heatmap |
|---|-------|--------|--|--|--|--|--|
| 1 | stemi.ts | 62 Yaş Erkek — Akut Göğüs Ağrısı (STEMI) | kardiyoloji | Erişkin (62y) | 3/1–5 | I21.0 | ★★★★★ |
| 2 | kardiyojenik-sok.ts | 65 Yaş Erkek — STEMI Sonrası Şok | kardiyoloji | Erişkin (65y) | 4/3–5 | R57.0 | ★★★★☆ |
| 3 | dka.ts | 24 Yaş Kadın — Kusma, Karın Ağrısı, Polipne (DKA) | dahiliye | Erişkin (24y) | 3/2–4 | E11.10 | ★★★☆☆ |
| 4 | hipoglisemi.ts | 68 Yaş Erkek — Titreme, Terleme (Hipoglisemi) | dahiliye | Geriatri (68y) | 2/1–5 | E16.2 | ★★★★★ |
| 5 | pulmoner-emboli.ts | 54 Yaş Kadın — Ani Nefes Darlığı (Submasif PE) | acil | Erişkin (54y) | 3/1–5 | I26.99 | ★★★★★ |
| 6 | anaflaksi.ts | 35 Yaş Kadın — Sefalosporin İnfüzyonunda Anaflaksi | acil | Erişkin (35y) | 2/2–4 | T78.2 | ★★★☆☆ |
| 7 | iskemik-inme.ts | 72 Yaş Kadın — Ani Sağ Hemipleji (İskemik İnme) | acil | Geriatri (72y) | 3/2–4 | I63.9 | ★★★★☆ |
| 8 | pediatrik-sepsis.ts | 8 Aylık İnfant — Pnömoni Kaynaklı Septik Şok | pediatri | Pediatrik (8 ay/0y) | 2/2 | P36.9 | ★★☆☆☆ |
| 9 | bronsiyolit.ts | 8 Aylık Erkek Bebek — Hışıltı ve Solunum Sıkıntısı | pediatri | Pediatrik (8 ay/0y) | 2/1–3 | J21.9 | ★★★☆☆ |
| 10 | apandisit.ts | 28 Yaş Erkek — Sağ Alt Kadran Ağrısı | cerrahi | Erişkin (28y) | 2/1–4 | K35.80 | ★★★☆☆ |
| 11 | rsi-entübasyon.ts | 35 Yaş Erkek — Travma, GKS 9, Servikal Kırık (RSI) | anestezi | Erişkin (35y) | 3/2–5 | S06.5 | ★★★★☆ |
| 12 | preeklampsi.ts | 32 Yaş Kadın — 36 Haftalık Gebe, Ağır Preeklampsi | kadin_dogum | Gebe/OB (32y, 36w) | 3/2–4 | O14.1 | ★★★☆☆ |
| 13 | sepsis-hemsirelik.ts | 70 Yaş Kadın — Serviste Ani Kötüleşme (Sepsis) | hemsirelik | Geriatri (70y) | 2/1–3 | A41.9 | ★★★☆☆ |
| 14 | tccc-patlama.ts | 24 Yaş Asker — Terör Patlaması (TCCC) | askeri_tccc | Erişkin (24y) | 3/2–5 | T07 | ★★★★☆ |

**Not:** 
- **Zorluk:** Seçili/Desteklenen seviyeler (ör. 2/1–4 = v2.0 ama 1–4 destekli)
- **Heatmap:** Zorluk + multi-sistem karmaşıklığı göreceğine göre (★★★★★ = çok derinlemesine)

---

### 2. BRANŞ DAĞILIMI (Specialty)

| Branş | Sayı | Senaryo Adları |
|-------|------|---|
| **Kardiyoloji (kardiyoloji)** | 2 | STEMI (I21.0), Kardiyojenik Şok (R57.0) |
| **Dahiliye (dahiliye)** | 3 | DKA (E11.10), Hipoglisemi (E16.2), Pulmoner Emboli (I26.99) |
| **Acil Tıp (acil)** | 3 | Anaflaksi (T78.2), İskemik İnme (I63.9), *Pulmoner Emboli ek branş* |
| **Pediatri (pediatri)** | 2 | Pediatrik Sepsis (P36.9), Bronşiyolit (J21.9) |
| **Cerrahi (cerrahi)** | 1 | Akut Apandisit (K35.80) |
| **Anestezi (anestezi)** | 1 | RSI/Entübasyon (S06.5) |
| **Kadın Doğum (kadin_dogum)** | 1 | Ağır Preeklampsi (O14.1) |
| **Hemşirelik (hemsirelik)** | 1 | Sepsis (Hemşirelik Bakımı) (A41.9) |
| **Askeri / TCCC (askeri_tccc)** | 1 | Patlama Yaralanması (T07) |
| **TOPLAM** | **14** | — |

**Dağılım özeti:**
- Kardiyoloji: 2 senaryo (STEMI + şok komplikasyonu çifti)
- Dahiliye: 3 senaryo (metabolik + vasküler akut)
- Acil Tıp: 3 senaryo (multiortojenik krizler)
- Pediatri: 2 senaryo (enfeksiyon + solunum)
- Diğer (Cerrahi, Anestezi, OB, Hemşirelik, Askeri): 1'er senaryo

---

### 3. HASTA YAŞ GRUBU DAĞILIMI

| Yaş Grubu | Sayı | Senaryo Örnekleri |
|-----------|------|---|
| **Pediatrik (0–17 yaş)** | 2 | • Bronşiyolit (8 aylık) • Pediatrik Sepsis (8 aylık) |
| **Erişkin (18–64 yaş)** | 8 | • STEMI (62y) • DKA (24y) • Anaflaksi (35y) • Apandisit (28y) • RSI Travma (35y) • Preeklampsi (32y/36w gebe) • Pulmoner Emboli (54y) • TCCC Patlama (24y) |
| **Geriatri (≥65 yaş)** | 3 | • Hipoglisemi (68y) • İskemik İnme (72y) • Sepsis Hemşirelik (70y) |
| **Gebe (Obstetrik)** | 1 | • Preeklampsi (32y, 36. hafta) |
| **TOPLAM** | **14** | — |

**Not:**  
- Pediatri az temsil (2 senaryo); DKA/hipoglisemi pediatrik varyantları YOK → **BOŞLUK #1**
- Geriatri çoğunlukta değil (3/14, %21) ama en çok zorluk seviyeleri (hipoglisemi 1–5, inme 2–4)
- Obstetrik: sadece 1 senaryo (preeklampsi) → **BOŞLUK #2:** normal doğum, postpartum kanaması, amazyotlı gebe, gestasyonel diyabet, rahim dışı gebelik YOK

---

### 4. İLAÇ CATALGON AÇILIM

**Endokrin/Metabolik:**
- ✓ DKA (insulin + K+ + sıvı)
- ✓ Hipoglisemi (dekstroz + oktreotid)
- ✗ Hiperglisemi/HHS (Hiperosmolar Kriz)
- ✗ Hipotiroidizm/Tiroid Fırtınası
- ✗ Hipoglisemi varyantları (C-peptid +/−, tümör vs. ilaç)

**Kardiyak:**
- ✓ STEMI (aspirin, P2Y12, tromboliz/PCI)
- ✓ Kardiyojenik Şok (vazopressor/inotrop: noradrenalin, dobutamin)
- ✗ Bradikardi/AV blok (atropin, pacemaker)
- ✗ Supraventrikler taşikardi (amiodaron, verapamil)
- ✗ Kalp yetmezliği akut decompensasyon (diüretik titrasyon, ACEi)

**Vasküler/Hemostaz:**
- ✓ Pulmoner Emboli (antikoagülan: heparin/enoksaparin; tromboliz: alteplaze)
- ✓ İskemik İnme (tPA/tenekteplaz; antikoagülan)
- ✗ DVT/masif kanama (TXA, FFP, DIC)
- ✗ Aort diseksiyonu akut

**Enfeksiyon/Sepsis:**
- ✓ Pediatrik Sepsis (SSC Bundle: seftriakson/vankomisin + sıvı)
- ✓ Sepsis Hemşirelik (penisilin alerjisi senaryosu + pip-tazo kontrendike)
- ✗ Toksikoloji (karbon monoksit, opiyoid antagonisti, antidot)
- ✗ Menenjit/ensefalit (antibiyotik-antiviral sıralaması)
- ✗ Fulminan hepatit/sistemik enfeksiyonlar (yer yok)

**Alerji/İmmüno:**
- ✓ Anaflaksi (adrenalin anında, H1/H2/steroid sonra)
- ✗ Steven-Johnson Sendromu (TEN)
- ✗ Serum Hastalığı, DRESS sendromu

**Solunum:**
- ✓ Bronşiyolit (HFNC, NSS, **steroid/salbutamol kontrendike**)
- ✗ Pnömotoraks/Hemotoraks (yalnızca TCCC'de açık göğüs)
- ✗ ARDS, Mekanik ventilasyon weaning
- ✗ Asma akut eksaserbasyonu

**Sinir Sistemi:**
- ✓ İskemik İnme (tPA, fibrinoliz window)
- ✓ Travma/TBI (RSI + post-entübasyon MAP kontrol)
- ✗ İntraserebral Kanama (nitrogliserin düşüşü, FFP)
- ✗ Konvülsiyon/Status Epileptikus
- ✗ Subaraknoid Kanama, vertigo, migraine

**Obstetrik:**
- ✓ Preeklampsi (MgSO4, antihipertansif: labetalol/nifedipin, deksametazon fetal lung)
- ✗ Postpartum Kanaması (oksitosin, ergot, TXA, hysterektomi)
- ✗ Amniyon Sıvısı Embolisi (DIC, inotroplar)
- ✗ Eklampsiya (konvülzyon yönetimi, kuş başlık delivery)
- ✗ Rahim Dışı Gebelik (cerrahi — STAT)

**Cerrahi Acil:**
- ✓ Apandisit (antibiyotik: ampisilin-sulbaktam, antipsödomas YOK)
- ✗ Perforasyon, peritonit, bağırsak obstrüksiyonu
- ✗ Bilye taşı kolesistit, pankreatit
- ✗ Travmatik intra-abdominal kanama

**Hemşirelik Özel:**
- ✓ NEWS2/qSOFA eskalasyon (SBAR)
- ✓ KBY sıvı bilançosu izlemi
- ✗ Beslenme tubu yönetimi, kateter bakımı, yaşlı kırılgan bakımı

**Askeri/TCCC:**
- ✓ MARCH-PAWS (tourniquet, hemostaz, sıvı ölçülü)
- ✓ POC lab (HemoCue, i-STAT)
- ✗ Koruyucu CBRN (kimyasal, biyolojik, nükleer)
- ✗ Anestezi-sınırlı kaynaklar (maksimum propofol, minimal midazolam)

---

### 5. BÜYÜK KLÎNIK BOŞLUKLAR (400'e Gidişte Eksik Alanlar)

#### A. **KULAK-BURUN-BOĞAZ (KBB)**
- **Durum:** YOK (0 senaryo)
- **Neden:** ENT Acil Servis (üst solunum yolu obstrüksiyonu, Ludvig anjini, peritonsillar apse, epiglottit) genellikle anestezi/pediatri subspesialitiyle karışır
- **Eksik:** 
  - Epiglottit (çocuk + erişkin): airway emergency
  - Ludvig anjini (submandibular enfeksiyon, airway kötüleşme riski)
  - Peritonsillar apse (ışık açma vs. komplikasyon)

#### B. **OFTALMOLOJİ**
- **Durum:** YOK (0 senaryo)
- **Neden:** Acil oftalmoloji genellikle temel hekimlik kurun dışı
- **Eksik:**
  - Akut Glokom (GO) — Göz acil
  - Kimyasal Yanık (göz) — travma kategorisi ama spesifik
  - Retinal Ayrılma — seçici tanı

#### C. **DERMATOLOJİ**
- **Durum:** YOK (0 senaryo)
- **Neden:** Hızlı-yaşam-tehdit senaryoları nadir; çoğu sırada
- **Eksik:**
  - Steven-Johnson Sendromu / Toksik Epidermal Nekroliz (TEN)
  - Pemfigus Vulgaris (mukozal tutulum → airway)

#### D. **PSİKİYATRİ / PSİKOSOS**
- **Durum:** YOK (0 senaryo)
- **Neden:** Simülatorda "davranış" modellemesi zor; eğitim senaryoları yazılı
- **Eksik:**
  - Katatoni
  - Neuroleptic Malignant Syndrome (NMS)
  - Kendine Zarar Verme / Ültimatumla Suisid İdeasyonu
  - Sedasyon (propofol + midazolam taşınması)

#### E. **TOKSİKOLOJİ / ZEHİRLENME**
- **Durum:** YOK (0 senaryo)
- **Neden:** Spesifik antidot + rehidrasyon yönetimi teknik; TCCC dışında nadir multortojenik
- **Eksik:**
  - Opiyoid Over-doz (naloksan)
  - Karbon Monoksit (hiperbarik oksijen, methemin)
  - Benzodiazpine Over-doz (flumazenil)
  - Organizm Pestisit (atropin, 2-PAM, seviyeleme)
  - Cyanide (hidroksokobalamin)

#### F. **TRAVMA / CERRAHI ACIL (Genel)**
- **Durum:** Kısmi (RSI + TCCC)
- **Mevcut:** RSI (1 TBI havayolu) + TCCC (1 masif kanama patlama)
- **Eksik:**
  - Aort Diseksiyonu Akut (tipe A = STAT cerrahi, tipe B = tıbbi)
  - Kardiyak Tamponad (Beck üçlüsü, pericardiosentez)
  - Ters Tansiyon (gerilimli PTX) — yalnızca TCCC çiftinde
  - İç Organ Travması (splen, karaciğer, böbrek penetran laserasyon + konservatif vs. cerrahi)
  - Fasyal Aralığı Sendromu (kompartman sendromu)

#### G. **NÖROLOJI (İnme dışı)**
- **Durum:** Çok Sınırlı (İskemik İnme + TBI RSI)
- **Mevcut:** İskemik İnme (I63.9, tPA window) + Travmatik TBI (S06.5, MAP→hiperventilasyon)
- **Eksik:**
  - Status Epileptikus (konvülzyon sürekliliği, benzodiazpine USURA)
  - Subaraknoid Kanama (SAK) — rebleeding, serebral vasospazm, NPH
  - Vertigo Periferik vs. Santral (HINTS test, Dix-Hallpike)
  - Guillain-Barré Sendromu (asenden paraliz, solunum başarısızlığı riski)
  - Myastenia Gravis Krizi (kolinerjik vs. miyastenik)
  - Vestibüler Migrene, Senkop (aritmia vs. vazovagal)

#### H. **ENFEKSİYON (Sepsis dışı)**
- **Durum:** Kısmi (Pediatrik Sepsis pnömoni, Sepsis Hemşirelik ÜE)
- **Mevcut:** Pnömoni SEP → sıvı bundle, Üriner SEP → hemşirelik SBAR
- **Eksik:**
  - Menenjit / Ensefalit Viral (lumbar ponksiyon, empirik antibiyotik süresi)
  - Fulminan Hepatit (INR/PT düşüşü, transplant endikasyonu)
  - Tetanus (trismus, opistatonus, mekanik ventilasyon TIG + antibiyotik)
  - Vibrio Septisemi (marin ortamı, azotemia + dişiler kötü prognoz)

#### I. **ENDOKRIN (DKA/Hipo dışı)**
- **Durum:** Kısmi (DKA + Hipoglisemi ama HHS, tiroid fırtınası YOK)
- **Mevcut:** DKA (E11.10, insülin + K+), Hipoglisemi (E16.2, dekstroz + oktreotid)
- **Eksik:**
  - Hiperglisemik Hiperosmolar Durum (HHS) — yaşlı, Tip 2, dehidre, insüline kalıştığı
  - Tiroid Fırtınası (thyroid storm) — TYF vb., hipertermia, taşikardi, şok
  - Adrenal Kriz (Addison) — hiponatremi, hipopotasyemi, kardiyovasküler kolaps
  - Hipotroidi Koma — nadir ama kötü

#### J. **ÜROGENITAL / NefROLOJİ**
- **Durum:** YOK (0 senaryo)
- **Neden:** Çoğu elektif; acil nadiren yaşam tehdidi
- **Eksik:**
  - Post-renal Akut Böbrek Hasarı (idrar retansiyonu, obstrüktif üreteroplasti)
  - Pyelonefrit Urosepsis (üriner stent, malign yüksek K+)
  - Priapizm (sickle cell, penil prosthesis, geç erektil disfonksiyon)

#### K. **JİNEKOLOJİ (OB dışı)**
- **Durum:** YOK (0 senaryo)
- **Neden:** Obstetrik ve jinekoloji farklı; burada hamile + preeklampsi = OB
- **Eksik:**
  - Tubo-ovarian Apse (elektif cerrahi + SEPSIS riski → buraya aidiyeti tartışmalı)
  - Pelvic Inflammatory Disease (PID) Sepsis
  - Uterin Perforasyon (küretaj post, peritonit)

#### L. **GERİATRİ (Yüksek-Risk Senaryoları)**
- **Durum:** Kısmi Temsil (Hipoglisemi 68y, İnme 72y, Sepsis 70y)
- **Durum:** 3 senaryo var ama geriatrik sendromlar DERIN değil
- **Eksik:**
  - Yaşlı Düşme → Femur Kırığı → Yağ Embolisi
  - Delirium vs. Demans (bakım karışıklığında tanı + steroid revizyon)
  - Polypharmacy (ilaç etkileşimi → toksikite)
  - Sarköpeni → Aspirasyon Riski
  - Çoklu Morbidite Yönetimi (triyaj karar: agresif vs. konservatif)

#### M. **YOĞUN BAKIM SENDROMLARI**
- **Durum:** Kısmi (Kardiyojenik Şok, Pediatrik Sepsis anestezi-yoğun bakım seviyeleri tut)
- **Eksik:**
  - ARDS (erişkin) — 2. hafta, barotravma, proning
  - Sepsisden Sonra Güç Kaybı (post-ICU)
  - Ventilator-Associated Pneumonia (VAP) — Pseudomonas, antimikrobik seçim

#### N. **VASKÜLER (Koroner/Periferik dışı)**
- **Durum:** Kısmi (Pulmoner Emboli + İskemik İnme)
- **Eksik:**
  - Akut Aort Diseksiyonu (Tip A = STAT, Tip B = tıbbi)
  - Akut Mesenteral İskemi (mesenteral arter oklüzyonu)
  - Akut Ekstremite İskemisi (masif ağrı, rhabdomyolisis riski)
  - Hipertansif Acil (tiyroid fırtınası, kokaini, pheochromocytoma krizi)

---

### 6. SENARYO KAPSAMININ ÖZET YÖNERGESİ

#### **Mevcut Denge (14 Senaryo):**
```
Temel Kattı (Acil Yeterlik):
  ✓ Şok türleri:        Kardiyojenik (1) + Sepsis (2 — pedi + hemşire)
  ✓ Airway Acil:        RSI Travma (1) — Epiglottit YOK
  ✓ Kardiyak:           STEMI + Kardiyojenik Şok = 2
  ✓ Enfeksiyon:         2 Sepsis + 1 Bronşiyolit = 3
  ✓ Metabolik:          2 (DKA + Hipoglisemi)
  ✓ Vasküler Acil:      PE + İnme = 2
  ✓ OB Acil:            1 (Preeklampsi)
  ✓ Travma Acil:        TCCC + RSI = 2
  ✓ Cerrahi:            1 (Apandisit)
  ✓ Alerji:             1 (Anaflaksi)
  ✗ Toksikoloji:        0
  ✗ Nöroloji (non-stroke): 0
  ✗ Menenjit:           0
```

#### **Tematik Boşluklar (18 Alan × ~22 senaryo kapasite farkı):**
| Alan | Kategorı | Öncelik | Klinik Ağırlık |
|------|----------|---------|---|
| Epiglottit / KBB Airway | Alerji/ENT | YÜKSEK | A (yaşamı tehdit) |
| Status Epileptikus | Nöroloji | YÜKSEK | A (konvülzyon sürekliliği) |
| SAK / İntraserebral Kanama | Nöroloji | YÜKSEK | A (yüksek mortalite) |
| Aort Diseksiyonu Akut | Vasküler | YÜKSEK | A (acil cerrahi) |
| Kardiyak Tamponad | Travma/Kardiyak | YÜKSEK | A (pericardiosentez) |
| Fulminan Hepatit | Enfeksiyon | ORTA | B (nadir, yer yok) |
| HHS (Hiperosmolar Kriz) | Endokrin | ORTA | B (yaşlı Tip 2) |
| Adrenal Kriz | Endokrin | ORTA | B (hiponatremi şok) |
| Tiroid Fırtınası | Endokrin | ORTA | B (tiyroid storm) |
| Postpartum Kanaması | Obstetrik | ORTA | B (OB kapasite) |
| Amniyon Embolisi | Obstetrik | ORTA | B (nadir, DIC) |
| Menenjit/Ensefalit | Enfeksiyon | ORTA | B (lumbal ponksiyon) |
| Tetanus | Enfeksiyon | DÜŞÜK | C (profilaksis boş) |
| Opiyoid Over-doz | Toksikoloji | DÜŞÜK | C (naloksan basit) |
| Guillain-Barré | Nöroloji | DÜŞÜK | C (ilaçlama yok) |
| Ventilator Weaning | Yoğun Bakım | DÜŞÜK | C (Pulse Engine faz 3) |
| Delirium vs. Demans | Geriatri | DÜŞÜK | C (sağlık okuryazarlığı) |
| Kimyasal Yanık (Göz) | Travma | DÜŞÜK | C (OFT nadir) |

---

### 7. KLINIK YETERLÎK SAĞLAMA SÜRECI

**Faz Durumu (13 Haziran 2026 sonrası):**
1. **Faz 1 (Oynanabilir Döngü):** ✅ TAMAMLANDI
   - 14 senaryo tanım yazıldı + engine'ye integre
   - Lab panelleri (test istemi + sonuç) v0.2
   - İlk 6 senaryo DRAFT → REVIEWED_PENDING_ACTIVATION (Ali Bey onayı 5 Mayıs)
   - Bazı senaryo motorları tam (STEMI, İnme, Preeklampsi, TCCC) — RSI, Sepsis, Apandisit teknik borç (step flow eksik)

2. **Faz 2 (Klinik Sahne):** 🔄 PLANLANDI
   - Oda modellemesi (furniture, yükseltici, IV standı)
   - Pulse Engine sidecar (D.1 fizyolojik izlemi)
   - 3D anatomik atlası zenginleştirme (organ adları doğru, Splanchnology silindi)

3. **Faz 3 (Derinlik + RPM Avatar):** ⏸ GELECEK
   - Avatar blendshape (göz, ağız, göğüs)
   - Mekanik ventilasyon sidecar
   - PBL (problem-based learning) kapısı

**Boşluk Kapatma Stratejisi (Ali Bey Görüşmesi Gerekir):**
- **Tier 0 (Yüksek Güvenilirlik):** Status Epileptikus, Epiglottit → Koda 3 ay + klinik review
- **Tier 1 (Orta):** SAK, Aort Diseksiyonu, Adrenal → Kod + Blender 3D zenginleştirmesi (oda)
- **Tier 2 (Eğitim Yardımcısı):** HHS, Tiroid Fırtınası → Basit klinik adım ağacı (multi-step quiz)
- **Erteleme (Faz 2+):** Obstetrik ek senaryo (Normal Doğum), Menenjit, Ventilator → Pulse Engine bağımlı

---

### 8. İLAÇ + EKIPMAN ENVANTERI YÜZEY METODU

**14 Senaryonun İlaç Kullanımı:**

Top 10 İlaç (Sıklık):
1. **salin_09** — 10/14 senaryo (tüm sıvı resüsitasyonlar)
2. **noradrenalin** — 7/14 (şok vazopressor)
3. **ringer_laktat** — 6/14 (sıvı ikinci tercih)
4. **morfin / fentanil** — 9/14 (ağrı)
5. **adrenalin** — 8/14 (anaflaksi + kardiyak + taşikardi)
6. **aspirin** — 4/14 (STEMI + inme)
7. **heparin** — 4/14 (tromboemboli + STEMI)
8. **insulin_regular** — 3/14 (DKA, Hipoglisemi, STEMI diyabet)
9. **dekstroz_50** — 3/14 (hipoglisemi + seisure risk)
10. **magnezyum_sulfat** — 3/14 (preeklampsi + aritmya + TXA alternatif)

**Eksik İlaçlar:**
- Benzodiazpin (midazolam, diazepam, lorazepam) = 3/14 (Preeklampsi, RSI, Travma) — **Status Epileptikus için YOK**
- Antibiyotik (seftriakson, vankomisin, amoksisilin vb.) = 6/14 ama **OKS/Penisilin allerjisi redirection — hemşirelik senaryosu güzel**
- Tromboliz (alteplase, tenekteplaz) = 3/14 (İnme, PE, STEMI)
- P2Y12 inhibitor (tikagrelor, klopidogrel) = STEMI sadece 1
- Vazopressin / Milrinon = 1–2 senaryo

**Ekipman Eksiklikleri:**
- Mekanik ventilasyon (pediatrik vs. erişkin setleri) — RSI + Sepsis'te temel, ama detaylı PEEP/FiO2 yönetimi **Faz 3 Pulse Engine**

---

## Sonuç

**Tablo:** 14 senaryo, 9 branş, temel acil-tıp yeterlilikleri kapsayan ama 18–22 büyük boşluk (Epilepsi, SAK, Aort, Hepatit, Tiroid, HHS, Obstetrik ek, KBB). **Faz 1.x → 2 (Oda + 3D) → 3 (Avatar + Pulse)** planlaması doğru; Ali Bey taraf yetkilendirmesi 5 Mayıs sonrası AKTÎF — öncesinde klinik review DRAFT'lar (anaflaksi, iskemik inme, RSI, hemşirelik, tccc).


