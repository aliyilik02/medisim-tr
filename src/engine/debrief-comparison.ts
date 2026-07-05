// ============================================================
// Debrief Kılavuz Karşılaştırması — saf motor (Hat B2, 6 Tem)
// ============================================================
// Body Interact'ın en övülen özelliğinin MediSim karşılığı: debrief'te
// "senin aksiyonun / beklenen aksiyon / kılavuz" yan yana.
//
// KLİNİK İÇERİK ÜRETMEZ: kılavuz etiketleri, senaryonun ZATEN yazılmış
// (review'lı) feedback metinlerinden regex ile ÇEKİLİR — yeni iddia yok.
// Saf fonksiyonel, React import YOK (mimari kural 1).
// ============================================================

import type { Scenario, SessionState, Step, ActionRef, Difficulty } from "./types";
import { isVisibleAtDifficulty } from "./engine";

export interface GuidelineComparisonRow {
  step_id: string;
  step_title: string;
  /** Öğrencinin bu adımda yaptıkları (insan-okur kısa tanım). */
  taken: string[];
  /** Bu zorlukta beklenen pozitif aksiyonlar / doğru kararlar. */
  expected: string[];
  /** Beklenenlerden yapılmayanlar (alt küme — expected ⊃ missed). */
  missed: string[];
  /** İlgili kılavuz etiketleri — feedback metinlerinden çekilmiş. */
  guidelines: string[];
}

/** Onaylı feedback metninden kılavuz kısaltması + yıl çeker (yeni iddia üretmez). */
export function extractGuidelineTags(text: string): string[] {
  const re =
    /\b(ESC|AHA\/ACC|AHA|ACC|TKD|PALS|ACLS|ATLS|NICE(?:\s+NG\d+)?|AAP|ERC|ILCOR|SOAP-II|WHO|UpToDate)\b(?:\s+(\d{4}))?/g;
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tags.add(m[2] ? `${m[1]} ${m[2]}` : m[1]);
  }
  return [...tags];
}

/** ActionRef → kısa Türkçe tanım (UI katalog adlarıyla zenginleştirebilir). */
export function describeActionRef(a: ActionRef): string {
  const t: Record<string, string> = {
    give_medication: "İlaç",
    use_equipment: "Ekipman",
    order_test: "Tetkik",
    examine: "Muayene",
    procedure: "Prosedür",
    consult: "Konsültasyon",
    decision: "Karar",
  };
  const kind = t[a.type] ?? a.type;
  return `${kind}: ${a.target_id}${a.dose ? ` (${a.dose})` : ""}`;
}

function actionMatchesExpected(taken: ActionRef, expected: ActionRef): boolean {
  if (taken.type !== expected.type) return false;
  if (taken.target_id !== expected.target_id) return false;
  if (expected.dose && taken.dose !== expected.dose) return false;
  if (expected.site && taken.site !== expected.site) return false;
  return true;
}

/**
 * Oturum sonuçlarından adım-bazlı kılavuz karşılaştırma satırları üretir.
 * Karar adımlarında "taken", sentetik decision ActionRef kayıtlarından gelir
 * (runner 6 Tem'den beri yazıyor); eski kayıtlarda boş kalabilir.
 */
export function buildGuidelineComparison(
  scenario: Scenario,
  session: SessionState,
  difficulty?: Difficulty,
): GuidelineComparisonRow[] {
  const diff: Difficulty = difficulty ?? session.selected_difficulty ?? scenario.difficulty;
  const rows: GuidelineComparisonRow[] = [];

  for (const r of session.results) {
    const step: Step | undefined = scenario.steps.find((s) => s.id === r.step_id);
    if (!step || step.kind === "info") continue;

    const guidelineSource: string[] = [];
    const expectedRefs: { label: string; match: (a: ActionRef) => boolean }[] = [];

    if (step.kind === "action") {
      for (const o of step.expected_outcomes) {
        if (!isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, diff)) continue;
        if ((o.points ?? 0) <= 0) continue; // beklenen = pozitif outcome'lar
        expectedRefs.push({
          label: describeActionRef(o.action),
          match: (a) => actionMatchesExpected(a, o.action),
        });
        guidelineSource.push(o.feedback ?? "");
      }
    } else if (step.kind === "decision") {
      for (const o of step.options) {
        if (!isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, diff)) continue;
        if (!o.correct) continue;
        expectedRefs.push({
          label: o.text,
          match: (a) => a.type === "decision" && a.target_id === o.id,
        });
        guidelineSource.push(o.feedback ?? "");
      }
    }

    const taken = r.actions_taken.map((a) => {
      // Karar aksiyonunu option metniyle zenginleştir (id yerine okunur metin)
      if (a.type === "decision" && step.kind === "decision") {
        const opt = step.options.find((o) => o.id === a.target_id);
        if (opt) return `Karar: ${opt.text}`;
      }
      return describeActionRef(a);
    });

    const missed = expectedRefs
      .filter((e) => !r.actions_taken.some((a) => e.match(a)))
      .map((e) => e.label);

    const guidelines = extractGuidelineTags(guidelineSource.join(" \n "));

    rows.push({
      step_id: step.id,
      step_title: step.title,
      taken,
      expected: expectedRefs.map((e) => e.label),
      missed,
      guidelines,
    });
  }

  return rows;
}
