// ============================================================
// Fizik muayene motoru — saf fonksiyonlar (React import YOK)
// ============================================================
// Öğrenci hastanın bedenindeki bir noktaya dokunur → o ANKİ faza göre bulgu
// döner (metin + ses + yakın görsel). Body Interact tarzı "bedende muayene"
// döngüsünün veri/karar katmanı. UI (3B nokta, kart) bu modülü yalnız okur.
//
// Faz çözümü tek kaynaktan: PhaseSignal.phaseId (getActivePhaseSignal) —
// EKG/ses/görsel ile AYNI faz, ayrı saat yok.
// ⚠️ KLİNİK İÇERİK bu dosyada DEĞİL — bulgu metinleri src/data/exam/*'da,
// her biri status bayrağı taşır (DRAFT → ACTIVE'i yalnız Ali Bey verir).
// ============================================================

import type { HeartSound, PatientVitals } from "./types";

/** ABCDE birincil bakı sırası. */
export type AbcdeCategory = "A" | "B" | "C" | "D" | "E";
export const ABCDE_ORDER: AbcdeCategory[] = ["A", "B", "C", "D", "E"];
export const ABCDE_LABEL: Record<AbcdeCategory, string> = {
  A: "Hava yolu",
  B: "Solunum",
  C: "Dolaşım",
  D: "Nörolojik",
  E: "Tam bakı",
};

export type ExamTechnique = "inspeksiyon" | "palpasyon" | "oskultasyon";
export const EXAM_TECHNIQUE_LABEL: Record<ExamTechnique, string> = {
  inspeksiyon: "Bakı",
  palpasyon: "Elle muayene",
  oskultasyon: "Dinleme",
};

/** Bedendeki muayene yeri — 3B çapa tablosu (examAnchors.ts) bu id'lerle eşlenir. */
export type ExamSite =
  | "airway"
  | "pupils"
  | "neck"
  | "heart_base"
  | "heart_apex"
  | "lung_right"
  | "lung_left"
  | "abdomen_ruq"
  | "abdomen_luq"
  | "abdomen_rlq"
  | "abdomen_llq"
  | "radial_pulse"
  | "cap_refill"
  | "leg_edema";

/** Bulguya eşlik eden yakın görsel (kart içinde çizilir). */
export type ExamVisual =
  | {
      kind: "pupil";
      /** Pupil çapı (mm). */
      size_mm: number;
      /** Işık yanıtı. */
      reactivity: "canli" | "yavas" | "yok";
    }
  | {
      kind: "cap_refill";
      /** Kapiller dolum süresi (sn). null → dolum izlenmiyor (dolaşım yok). */
      seconds: number | null;
    };

/**
 * Bulgunun sesi:
 *  - "phase_heart": faz sinyalindeki kalp sesi (tek kaynak — EKG ile senkron)
 *  - { file }: public/sounds/auscultation/{file}.ogg
 *  - { silent: true }: dinlenir ama ses YOK (arrest) — bilinçli sessizlik
 *  - undefined: bu bulguda ses kaydı yok (yalnız metin)
 */
export type ExamSound = "phase_heart" | { file: string } | { silent: true };

export interface ExamFinding {
  /** Bulgu metni. {hr} {rr} {spo2} {sbp} {dbp} {gcs} canlı vitalden doldurulur. */
  text: string;
  sound?: ExamSound;
  visual?: ExamVisual;
  /** Patolojik bulgu mu (kartta vurgulanır; debrief'te "yakaladın" sayılır). */
  abnormal?: boolean;
}

export interface ExamPointSpec {
  id: string;
  site: ExamSite;
  /** Bedende görünen kısa etiket. */
  label: string;
  category: AbcdeCategory;
  technique: ExamTechnique;
  /** Faz eşleşmezse (ve baseline'da) dönen bulgu. */
  default: ExamFinding;
  /** Faz id → bulgu. Anahtar: deterioration faz id'si veya "recovering". */
  by_phase?: Record<string, ExamFinding>;
}

export interface ScenarioExam {
  scenario_id: string;
  /** Klinik yaşam döngüsü — ACTIVE'e yalnız Ali Bey geçirir. */
  status: "DRAFT" | "REVIEWED_PENDING_ACTIVATION" | "ACTIVE";
  /** Bulguların dayandığı kaynaklar. */
  sources: string[];
  points: ExamPointSpec[];
}

/** Oturuma yazılan muayene kaydı — CEZASIZ (skor/grade hesabına GİRMEZ). */
export interface ExamLogEntry {
  point_id: string;
  /** Muayene anındaki faz ("baseline" dahil). */
  phase_id: string;
  abnormal: boolean;
  /** ms (Date.now) */
  at: number;
}

/** Çözülmüş bulgu — UI'ın doğrudan gösterdiği hal. */
export interface ResolvedExamFinding {
  point: ExamPointSpec;
  phaseId: string;
  text: string;
  abnormal: boolean;
  visual?: ExamVisual;
  /** Çalınacak dosya kökü; null → bilinçli sessizlik; undefined → ses kaydı yok. */
  soundFile?: string | null;
}

const TOKEN_RE = /\{(hr|rr|spo2|sbp|dbp|gcs)\}/g;

function vitalToken(key: string, v: PatientVitals): string {
  const raw =
    key === "hr" ? v.hr
    : key === "rr" ? v.rr
    : key === "spo2" ? v.spo2
    : key === "sbp" ? v.bp_systolic
    : key === "dbp" ? v.bp_diastolic
    : key === "gcs" ? v.gcs
    : undefined;
  return typeof raw === "number" && Number.isFinite(raw) ? String(Math.round(raw)) : "—";
}

/** Bulgu metnindeki {hr} gibi yer tutucuları canlı vitalle doldurur. */
export function interpolateExamText(text: string, vitals: PatientVitals): string {
  return text.replace(TOKEN_RE, (_, key: string) => vitalToken(key, vitals));
}

/** Faz bağlamı — PhaseSignal'in muayenenin ihtiyaç duyduğu alt kümesi. */
export interface ExamPhaseContext {
  phaseId: string;
  recovering?: boolean;
  heartSound?: HeartSound;
}

/**
 * Bir muayene noktasının o anki bulgusunu çözer.
 * Öncelik: recovering → by_phase.recovering; yoksa by_phase[phaseId]; yoksa default.
 * @param heartSoundFile faz kalp sesi → dosya kökü eşlemesi (UI ses servisinden
 *        enjekte edilir; motor dosya adını bilmez).
 */
export function resolveExamFinding(
  point: ExamPointSpec,
  phase: ExamPhaseContext | null | undefined,
  vitals: PatientVitals,
  heartSoundFile: (s: HeartSound) => string | null,
): ResolvedExamFinding {
  const phaseId = phase?.phaseId ?? "baseline";
  const key = phase?.recovering ? "recovering" : phaseId;
  const finding = point.by_phase?.[key] ?? point.default;

  let soundFile: string | null | undefined;
  const s = finding.sound;
  if (s === "phase_heart") {
    // Faz sinyali yoksa normal kalp sesi (baseline).
    soundFile = heartSoundFile(phase?.heartSound ?? "normal");
  } else if (s && "file" in s) {
    soundFile = s.file;
  } else if (s && "silent" in s) {
    soundFile = null;
  }

  return {
    point,
    phaseId: key,
    text: interpolateExamText(finding.text, vitals),
    abnormal: finding.abnormal ?? false,
    visual: finding.visual,
    soundFile,
  };
}

export interface ExamCoverageRow {
  category: AbcdeCategory;
  total: number;
  done: number;
}

/** ABCDE başına kaç nokta muayene edildi (her nokta bir kez sayılır). */
export function examCoverage(
  exam: ScenarioExam,
  examinedPointIds: Iterable<string>,
): ExamCoverageRow[] {
  const done = new Set(examinedPointIds);
  return ABCDE_ORDER.map((category) => {
    const pts = exam.points.filter((p) => p.category === category);
    return {
      category,
      total: pts.length,
      done: pts.filter((p) => done.has(p.id)).length,
    };
  });
}

/** ABCDE sırasında henüz eksiği olan ilk harf; hepsi tamamsa null. */
export function nextAbcdeCategory(rows: ExamCoverageRow[]): AbcdeCategory | null {
  return rows.find((r) => r.total > 0 && r.done < r.total)?.category ?? null;
}
