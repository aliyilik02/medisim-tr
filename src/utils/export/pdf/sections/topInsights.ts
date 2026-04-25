import type { jsPDF } from "jspdf";
import type { ActionStep } from "@/engine/types";
import { C } from "../colors";
import { fillRect, ensureSpace } from "../primitives/page";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";
import { actionTypeLabel } from "../../helpers";

interface Insight {
  label:   string;
  points:  number;
  stepNum: number;
}

function actionsMatch(takenType: string, takenId: string, expType: string, expId: string): boolean {
  return takenType === expType && takenId === expId;
}

function collectInsights(data: SectionData): { errors: Insight[]; wins: Insight[] } {
  const all: Insight[] = [];
  const difficulty = data.selected_difficulty;

  data.session.results.forEach((r, idx) => {
    const step = data.scenario.steps.find(s => s.id === r.step_id);
    if (!step || step.kind !== "action") return;

    const actionStep = step as ActionStep;
    r.actions_taken.forEach(action => {
      const matched = actionStep.expected_outcomes.find(o => {
        if (o.min_difficulty !== undefined && difficulty < o.min_difficulty) return false;
        if (o.max_difficulty !== undefined && difficulty > o.max_difficulty) return false;
        return actionsMatch(action.type, action.target_id, o.action.type, o.action.target_id);
      });

      const pts = matched ? matched.points : (actionStep.default_wrong_penalty ?? -5);
      const label = `${actionTypeLabel(action.type)}: ${action.target_id}`;
      all.push({ label, points: pts, stepNum: idx + 1 });
    });
  });

  const sorted = [...all].sort((a, b) => a.points - b.points);
  // Sadece gerçek negatifler hata; düşük pozitifler "hata" sayılmaz
  const errors = sorted.filter(i => i.points < 0).slice(0, 3);
  // En iyi aksiyonlar: yüksek pozitifler (10+)
  const wins = [...sorted].reverse().filter(i => i.points >= 10).slice(0, 3);
  return { errors, wins };
}

function insightCard(
  doc: jsPDF, fontName: string,
  x: number, y: number, w: number,
  title: string, items: Insight[], mode: "error" | "win"
) {
  const ITEM_H = 11;
  const HEADER_H = 8;
  const totalH = HEADER_H + items.length * ITEM_H + 4;

  const headerColor = mode === "error" ? C.criticalBg : C.stableBg;
  const accentColor = mode === "error" ? C.critical : C.gradeA;

  fillRect(doc, x, y, w, totalH, C.bgStripe, 2);
  fillRect(doc, x, y, w, HEADER_H, headerColor, 2);
  fillRect(doc, x, y, 2.5, totalH, accentColor);

  doc.setFont(fontName, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...accentColor);
  doc.text(title.toUpperCase(), x + 6, y + 5.5);

  items.forEach((item, i) => {
    const iy = y + HEADER_H + i * ITEM_H + 2;
    const ptsStr = item.points > 0 ? `+${item.points}` : `${item.points}`;

    doc.setFont(fontName, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.inkDark);
    const label = item.label.length > 28 ? item.label.slice(0, 27) + "…" : item.label;
    doc.text(label, x + 5, iy + 4.5);

    doc.setFont(fontName, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...accentColor);
    doc.text(ptsStr, x + w - 4, iy + 4.5, { align: "right" });

    doc.setFont(fontName, "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.inkLight);
    doc.text(`Adım ${item.stepNum}`, x + 5, iy + 9);
  });

  return totalH;
}

export function renderTopInsights(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const { errors, wins } = collectInsights(data);
  if (errors.length === 0 && wins.length === 0) return y;

  y = ensureSpace(doc, y, 50, layout);

  const half = (layout.CW - 4) / 2;

  if (errors.length > 0) {
    const errTitle = errors.some(i => i.points <= -5) ? "En Büyük Hatalar" : "Iyilestirilebilecek Alanlar";
    insightCard(doc, fontName, layout.ML, y, half, errTitle, errors, "error");
  }
  if (wins.length > 0) {
    insightCard(doc, fontName, layout.ML + half + 4, y, half, "En İyi Aksiyonlar", wins, "win");
  }

  const maxH = Math.max(
    errors.length > 0 ? 8 + errors.length * 11 + 4 : 0,
    wins.length > 0   ? 8 + wins.length   * 11 + 4 : 0
  );

  return y + maxH + 6;
}
