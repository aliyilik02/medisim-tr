import type {
  ActionStep,
  DecisionStep,
  InfoStep,
} from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";

export type ScenarioDraft = Partial<StoredScenario>;

export interface Issue {
  code: string;
  message: string;
  path?: string;
  jumpToStep?: number;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

// ── Helpers ────────────────────────────────────────────────────

export function computeMax(draft: ScenarioDraft): number {
  let total = 0;
  for (const step of draft.steps ?? []) {
    if (step.kind === "action") {
      for (const outcome of (step as ActionStep).expected_outcomes) {
        if (outcome.points > 0) total += outcome.points;
      }
    } else if (step.kind === "decision") {
      for (const option of (step as DecisionStep).options) {
        if (option.points > 0) total += option.points;
      }
    }
  }
  return total;
}

// ── Main validator ─────────────────────────────────────────────

export function validateScenario(draft: ScenarioDraft): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  // ── Meta ─────────────────────────────────────────────────────
  if (!draft.title?.trim())
    errors.push({ code: "META_TITLE", message: "Senaryo başlığı boş.", jumpToStep: 1 });
  if (!draft.description?.trim())
    errors.push({ code: "META_DESC", message: "Açıklama boş.", jumpToStep: 1 });
  if (!draft.specialty)
    errors.push({ code: "META_SPECIALTY", message: "Uzmanlık alanı seçilmedi.", jumpToStep: 1 });
  if (!draft.difficulty)
    errors.push({ code: "META_DIFFICULTY", message: "Varsayılan zorluk seçilmedi.", jumpToStep: 1 });
  if (!draft.estimated_minutes || draft.estimated_minutes < 1)
    errors.push({ code: "META_MINUTES", message: "Tahmini süre geçersiz.", jumpToStep: 1 });
  if (!draft.supported_difficulties?.length)
    errors.push({ code: "META_DIFFS", message: "En az 1 desteklenen zorluk seçilmeli.", jumpToStep: 1 });

  // ── Hasta ─────────────────────────────────────────────────────
  const p = draft.patient;
  if (!p) {
    errors.push({ code: "PATIENT_MISSING", message: "Hasta profili eksik.", jumpToStep: 1 });
  } else {
    if (p.age === undefined || p.age < 0)
      errors.push({ code: "PATIENT_AGE", message: "Hasta yaşı geçersiz.", jumpToStep: 1 });
    if (!p.sex)
      errors.push({ code: "PATIENT_SEX", message: "Hasta cinsiyeti seçilmedi.", jumpToStep: 1 });
    if (!p.weight_kg || p.weight_kg < 1)
      errors.push({ code: "PATIENT_WEIGHT", message: "Hasta kilosu geçersiz.", jumpToStep: 1 });
    if (!p.chief_complaint?.trim())
      errors.push({ code: "PATIENT_COMPLAINT", message: "Ana şikayet boş.", jumpToStep: 1 });
  }

  // ── Vitaller ─────────────────────────────────────────────────
  const v = draft.initial_vitals;
  if (!v) {
    errors.push({ code: "VITALS_MISSING", message: "Başlangıç vitalleri eksik.", jumpToStep: 1 });
  } else {
    const requiredVitals: (keyof NonNullable<typeof v>)[] = [
      "hr", "bp_systolic", "bp_diastolic", "spo2", "temp", "rr",
    ];
    for (const key of requiredVitals) {
      if (v[key] === undefined || v[key] === null)
        errors.push({
          code: `VITAL_${key.toUpperCase()}`,
          message: `Vital eksik: ${key}`,
          jumpToStep: 1,
        });
    }
  }

  // ── Envanter ─────────────────────────────────────────────────
  if ((draft.available_medications?.length ?? 0) < 3)
    errors.push({
      code: "INV_MEDS",
      message: `En az 3 ilaç seçilmeli (şu an: ${draft.available_medications?.length ?? 0}).`,
      jumpToStep: 2,
    });
  if ((draft.available_equipment?.length ?? 0) < 2)
    errors.push({
      code: "INV_EQ",
      message: `En az 2 ekipman seçilmeli (şu an: ${draft.available_equipment?.length ?? 0}).`,
      jumpToStep: 2,
    });
  if (!draft.ekg_pattern)
    errors.push({ code: "INV_EKG", message: "EKG başlangıç ritmi seçilmedi.", jumpToStep: 2 });

  // ── Adımlar ───────────────────────────────────────────────────
  const steps = draft.steps ?? [];
  if (steps.length === 0) {
    errors.push({ code: "STEPS_EMPTY", message: "En az bir adım eklenmeli.", jumpToStep: 3 });
  } else {
    if (!draft.start_step_id)
      errors.push({ code: "STEPS_NO_START", message: "Başlangıç adımı seçilmedi.", jumpToStep: 3 });
    else if (!steps.find((s) => s.id === draft.start_step_id))
      errors.push({ code: "STEPS_BAD_START", message: "Seçili başlangıç adımı listede yok.", jumpToStep: 3 });

    const stepIds = new Set(steps.map((s) => s.id));

    for (const step of steps) {
      if (!step.title?.trim())
        errors.push({ code: "STEP_TITLE", message: `Adım "${step.id}": başlık boş.`, jumpToStep: 3 });

      if (step.kind === "action") {
        const s = step as ActionStep;
        if (s.expected_outcomes.length === 0)
          errors.push({
            code: "STEP_NO_OUTCOMES",
            message: `"${step.title || step.id}": en az 1 beklenen aksiyon gerekli.`,
            jumpToStep: 3,
          });
        for (const outcome of s.expected_outcomes) {
          if (
            outcome.action.type === "give_medication" &&
            outcome.action.target_id &&
            !(draft.available_medications ?? []).includes(outcome.action.target_id)
          )
            errors.push({
              code: "REF_MED",
              message: `"${step.title || step.id}": ilaç "${outcome.action.target_id}" envanterde yok.`,
              jumpToStep: 3,
            });
          if (
            outcome.action.type === "use_equipment" &&
            outcome.action.target_id &&
            !(draft.available_equipment ?? []).includes(outcome.action.target_id)
          )
            errors.push({
              code: "REF_EQ",
              message: `"${step.title || step.id}": ekipman "${outcome.action.target_id}" envanterde yok.`,
              jumpToStep: 3,
            });
          for (const unlockId of outcome.unlocks ?? []) {
            if (!stepIds.has(unlockId))
              errors.push({
                code: "REF_UNLOCK",
                message: `"${step.title || step.id}": unlock adımı "${unlockId}" bulunamadı.`,
                jumpToStep: 3,
              });
          }
        }
      }

      if (step.kind === "decision") {
        const s = step as DecisionStep;
        if (s.options.length < 2)
          errors.push({
            code: "STEP_FEW_OPTS",
            message: `"${step.title || step.id}": en az 2 seçenek gerekli (şu an ${s.options.length}).`,
            jumpToStep: 3,
          });
        if (s.options.length >= 2 && !s.options.some((o) => o.correct))
          errors.push({
            code: "STEP_NO_CORRECT",
            message: `"${step.title || step.id}": en az 1 doğru seçenek işaretlenmeli.`,
            jumpToStep: 3,
          });
        // Dallanan karar: next_step_id hedefi var olmalı (kırık dal = kayıp akış)
        for (const o of s.options) {
          if (o.next_step_id && !stepIds.has(o.next_step_id))
            errors.push({
              code: "REF_BRANCH",
              message: `"${step.title || step.id}": "${o.text}" seçeneğinin dal hedefi "${o.next_step_id}" bulunamadı.`,
              jumpToStep: 3,
            });
        }
      }

      if (step.kind === "info") {
        if (!(step as InfoStep).content?.trim())
          errors.push({
            code: "STEP_EMPTY_INFO",
            message: `"${step.title || step.id}": bilgi adımı içeriği boş.`,
            jumpToStep: 3,
          });
      }
    }
  }

  // ── Puanlama ─────────────────────────────────────────────────
  const sc = draft.scoring;
  if (!sc) {
    errors.push({ code: "SCORE_MISSING", message: "Puanlama yapılandırması eksik.", jumpToStep: 4 });
  } else {
    if (!sc.max_points || sc.max_points <= 0)
      errors.push({ code: "SCORE_MAX", message: "Maksimum puan 0'dan büyük olmalı.", jumpToStep: 4 });
    if (!sc.passing_score || sc.passing_score <= 0)
      errors.push({ code: "SCORE_PASSING", message: "Geçme notu 0'dan büyük olmalı.", jumpToStep: 4 });
    if (sc.max_points > 0 && sc.passing_score >= sc.max_points)
      errors.push({ code: "SCORE_PASS_GT_MAX", message: "Geçme notu maksimum puandan küçük olmalı.", jumpToStep: 4 });
    if (sc.grade_bands) {
      const { A, B, C, D } = sc.grade_bands;
      if (!(D < C && C < B && B < A))
        errors.push({ code: "SCORE_BANDS_ORDER", message: "Not bantları sıralaması hatalı: D < C < B < A olmalı.", jumpToStep: 4 });
      if (A > sc.max_points)
        errors.push({ code: "SCORE_BAND_A_MAX", message: `A bandı (${A}) maksimumdan (${sc.max_points}) büyük olamaz.`, jumpToStep: 4 });
    }
  }

  // ── Debrief ───────────────────────────────────────────────────
  const db = draft.debrief;
  if (!db) {
    errors.push({ code: "DEBRIEF_MISSING", message: "Debrief bilgileri eksik.", jumpToStep: 4 });
  } else {
    if ((db.key_learnings?.length ?? 0) < 3)
      errors.push({
        code: "DEBRIEF_LEARNINGS",
        message: `En az 3 öğrenim noktası gerekli (şu an: ${db.key_learnings?.length ?? 0}).`,
        jumpToStep: 4,
      });
    if ((db.references?.length ?? 0) < 1)
      errors.push({ code: "DEBRIEF_REFS", message: "En az 1 kaynak belirtilmeli.", jumpToStep: 4 });
  }

  // ── Uyarılar ─────────────────────────────────────────────────

  // Unused medications & equipment
  const usedMeds = new Set<string>();
  const usedEq = new Set<string>();
  for (const step of steps) {
    if (step.kind === "action") {
      for (const o of (step as ActionStep).expected_outcomes) {
        if (o.action.type === "give_medication") usedMeds.add(o.action.target_id);
        if (o.action.type === "use_equipment") usedEq.add(o.action.target_id);
      }
    }
  }
  for (const id of draft.available_medications ?? []) {
    if (!usedMeds.has(id))
      warnings.push({ code: "WARN_UNUSED_MED", message: `İlaç "${id}" seçilmiş ama hiç kullanılmamış.`, jumpToStep: 2 });
  }
  for (const id of draft.available_equipment ?? []) {
    if (!usedEq.has(id))
      warnings.push({ code: "WARN_UNUSED_EQ", message: `Ekipman "${id}" seçilmiş ama hiç kullanılmamış.`, jumpToStep: 2 });
  }

  // Unreachable steps
  if (steps.length > 0 && draft.start_step_id) {
    const reachable = new Set<string>([draft.start_step_id]);
    for (const step of steps) {
      if (step.kind === "action") {
        for (const o of (step as ActionStep).expected_outcomes) {
          for (const id of o.unlocks ?? []) reachable.add(id);
        }
      }
      if (step.kind === "decision") {
        for (const o of (step as DecisionStep).options) {
          if (o.next_step_id) reachable.add(o.next_step_id);
        }
      }
    }
    for (const step of steps) {
      if (!reachable.has(step.id))
        warnings.push({
          code: "WARN_UNREACHABLE",
          message: `"${step.title || step.id}" adımına ulaşılamıyor (başlangıç değil, hiçbir unlock'ta geçmiyor).`,
          jumpToStep: 3,
        });
    }
  }

  // computed_max vs override divergence
  const cMax = computeMax(draft);
  const mMax = sc?.max_points ?? 0;
  if (cMax > 0 && mMax > 0 && Math.abs(cMax - mMax) / Math.max(cMax, mMax) > 0.2)
    warnings.push({
      code: "WARN_MAX_DIVERGE",
      message: `Hesaplanan max (${cMax}) ile girilen max (${mMax}) arasında >%20 fark var.`,
      jumpToStep: 4,
    });

  return { errors, warnings };
}
