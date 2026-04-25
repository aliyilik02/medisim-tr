import type { StoredScenario } from "@/storage/scenarioStorage";
import type { ActionStep, DecisionStep, InfoStep } from "@/engine";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";

const SPECIALTY_LABELS: Record<string, string> = {
  kardiyoloji: "Kardiyoloji", dahiliye: "Dahiliye", acil: "Acil Tıp",
  pediatri: "Pediatri", cerrahi: "Cerrahi", anestezi: "Anestezi",
  kadin_dogum: "Kadın Doğum", hemsirelik: "Hemşirelik", askeri_tccc: "Askeri / TCCC",
};

export function toMarkdown(draft: Partial<StoredScenario>): string {
  const lines: string[] = [];
  const p = draft.patient;
  const v = draft.initial_vitals;
  const sc = draft.scoring;
  const db = draft.debrief;

  lines.push(`# Senaryo: ${draft.title ?? "Adsız Senaryo"}`);
  lines.push(``);
  lines.push(`Uzmanlık: ${SPECIALTY_LABELS[draft.specialty ?? ""] ?? draft.specialty ?? "—"}`);
  lines.push(`Zorluk: ${draft.difficulty ?? "—"}/5`);
  lines.push(`Süre: ~${draft.estimated_minutes ?? "—"} dk`);
  if (draft.tags?.length) lines.push(`Etiketler: ${draft.tags.join(", ")}`);
  if (draft.author) lines.push(`Yazar: ${draft.author}`);
  if (draft.reviewed_by) lines.push(`Gözden geçiren: ${draft.reviewed_by}`);
  lines.push(``);

  if (p) {
    lines.push(`## Hasta`);
    lines.push(
      `- ${p.age} yaş, ${p.sex === "M" ? "erkek" : "kadın"}, ${p.weight_kg} kg` +
        (p.height_cm ? `, ${p.height_cm} cm` : "")
    );
    if (p.chief_complaint) lines.push(`- Ana şikayet: ${p.chief_complaint}`);
    if (p.history_items?.length) lines.push(`- Özgeçmiş: ${p.history_items.join("; ")}`);
    if (p.allergies?.length) lines.push(`- Alerjiler: ${p.allergies.join(", ")}`);
    if (p.current_medications?.length)
      lines.push(`- Kullandığı ilaçlar: ${p.current_medications.join(", ")}`);
    lines.push(``);
  }

  if (v) {
    lines.push(`## İlk Vitaller`);
    const vStr = [
      `HR ${v.hr}`,
      `TA ${v.bp_systolic}/${v.bp_diastolic}`,
      `SpO₂ ${v.spo2}%`,
      `Ateş ${v.temp}°C`,
      `SS ${v.rr}/dk`,
      v.gcs !== undefined ? `GKS ${v.gcs}` : null,
      v.glucose !== undefined ? `Glu ${v.glucose} mg/dL` : null,
      v.pain !== undefined ? `Ağrı ${v.pain}/10` : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(vStr);
    lines.push(``);
  }

  if (draft.available_medications?.length || draft.available_equipment?.length) {
    lines.push(`## Envanter`);
    if (draft.available_medications?.length)
      lines.push(
        `İlaçlar: ${draft.available_medications
          .map((id) => MEDICATIONS[id]?.name_tr ?? id)
          .join(", ")}`
      );
    if (draft.available_equipment?.length)
      lines.push(
        `Ekipman: ${draft.available_equipment
          .map((id) => EQUIPMENT[id]?.name_tr ?? id)
          .join(", ")}`
      );
    lines.push(``);
  }

  if (draft.steps?.length) {
    lines.push(`## Adımlar`);
    lines.push(``);
    draft.steps.forEach((step, i) => {
      lines.push(`### ${i + 1}. [${step.kind}] ${step.title}`);
      if (step.narrative) lines.push(`*${step.narrative}*`);
      lines.push(`Prompt: "${step.prompt}"`);
      lines.push(``);

      if (step.kind === "action") {
        const s = step as ActionStep;
        if (s.expected_outcomes.length > 0) {
          lines.push(`Beklenen aksiyonlar:`);
          for (const o of s.expected_outcomes) {
            const pts = o.points >= 0 ? `+${o.points}` : String(o.points);
            lines.push(
              `- ${o.action.type} / ${o.action.target_id || "—"} → ${pts} puan` +
                (o.critical ? " [KRİTİK]" : "") +
                (o.feedback ? `: "${o.feedback}"` : "")
            );
          }
          lines.push(``);
        }
      } else if (step.kind === "decision") {
        const s = step as DecisionStep;
        if (s.options.length > 0) {
          lines.push(`Seçenekler:`);
          for (const o of s.options) {
            const pts = o.points >= 0 ? `+${o.points}` : String(o.points);
            lines.push(
              `- ${o.correct ? "✅" : "❌"} "${o.text}" → ${pts} puan` +
                (o.feedback ? `: "${o.feedback}"` : "")
            );
          }
          lines.push(``);
        }
      } else {
        lines.push((step as InfoStep).content);
        lines.push(``);
      }
    });
  }

  if (sc) {
    lines.push(`## Puanlama`);
    lines.push(`Max: ${sc.max_points}`);
    lines.push(`Geçme: ${sc.passing_score}`);
    if (sc.grade_bands)
      lines.push(
        `A: ${sc.grade_bands.A}, B: ${sc.grade_bands.B}, C: ${sc.grade_bands.C}, D: ${sc.grade_bands.D}`
      );
    lines.push(``);
  }

  if (db) {
    lines.push(`## Debrief`);
    if (db.key_learnings?.length) {
      lines.push(`Öğrenim noktaları:`);
      db.key_learnings.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
    }
    if (db.references?.length) {
      lines.push(``);
      lines.push(`Kaynaklar:`);
      db.references.forEach((r) => lines.push(`- ${r}`));
    }
    if (db.red_flags?.length) {
      lines.push(``);
      lines.push(`Red flags:`);
      db.red_flags.forEach((r) => lines.push(`- ${r}`));
    }
    lines.push(``);
  }

  return lines.join("\n");
}
