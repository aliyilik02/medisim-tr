import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SessionState, Scenario } from "@/engine/types";
import { registerTurkishFont } from "./fonts";
import {
  formatDateTime,
  formatFileDatetime,
  formatDuration,
  formatPercent,
  difficultyLabel,
  modeLabel,
  specialtyLabel,
  actionTypeLabel,
} from "./helpers";

type RGB = [number, number, number];

const C = {
  brand:      [124, 179, 66]  as RGB,
  brandDark:  [90,  130, 45]  as RGB,
  dark:       [16,  17,  26]  as RGB,
  headerBg:   [22,  24,  38]  as RGB,
  mid:        [90,  95,  115] as RGB,
  light:      [155, 160, 178] as RGB,
  bgPage:     [248, 249, 252] as RGB,
  bgCard:     [237, 240, 248] as RGB,
  bgCardAlt:  [228, 232, 244] as RGB,
  red:        [211, 47,  47]  as RGB,
  redLight:   [255, 235, 235] as RGB,
  green:      [30,  158, 110] as RGB,
  greenLight: [232, 248, 242] as RGB,
  amber:      [205, 100, 0]   as RGB,
  amberLight: [255, 242, 220] as RGB,
  white:      [255, 255, 255] as RGB,
  divider:    [210, 214, 228] as RGB,
};

const PW = 210;
const PH = 297;
const ML = 14;
const MR = 14;
const MB = 16;
const CW = PW - ML - MR;

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: RGB, r = 0) {
  doc.setFillColor(...fill);
  r > 0 ? doc.roundedRect(x, y, w, h, r, r, "F") : doc.rect(x, y, w, h, "F");
}

function hLine(doc: jsPDF, y: number, color: RGB = C.divider, lw = 0.25) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(ML, y, PW - MR, y);
}

function sectionHeader(doc: jsPDF, y: number, title: string, fontName: string): number {
  fillRect(doc, ML, y, 3, 6.5, C.brand);
  doc.setFont(fontName, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.dark);
  doc.text(title, ML + 5.5, y + 5);
  hLine(doc, y + 6.5, C.divider, 0.2);
  return y + 10;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function gradeColor(grade: string): RGB {
  if (grade === "A") return C.green;
  if (grade === "B") return C.brand;
  if (grade === "F") return C.red;
  return C.amber;
}

function gradeBg(grade: string): RGB {
  if (grade === "A") return C.greenLight;
  if (grade === "B") return [240, 248, 230] as RGB;
  if (grade === "F") return C.redLight;
  return C.amberLight;
}

function drawFooter(doc: jsPDF, page: number, total: number, fontName: string) {
  doc.setPage(page);
  hLine(doc, PH - 12, C.divider, 0.2);
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.light);
  doc.text("Bu rapor eğitim amaçlıdır — klinik karar yerine geçmez.  MediSim TR", ML, PH - 8);
  doc.text(`${page} / ${total}`, PW - MR, PH - 8, { align: "right" });
}

// ── Sayfa zeminini temiz açık gri yap ───────────────────────────
function drawPageBg(doc: jsPDF) {
  fillRect(doc, 0, 0, PW, PH, C.bgPage);
}

// ── Küçük metrik kutu ────────────────────────────────────────────
function metricCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string, valueColor: RGB,
  bg: RGB, fontName: string
) {
  fillRect(doc, x, y, w, h, bg, 2.5);
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.mid);
  doc.text(label.toUpperCase(), x + w / 2, y + 5, { align: "center" });
  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...valueColor);
  doc.text(value, x + w / 2, y + 15, { align: "center" });
}

export async function exportToPdf(session: SessionState, scenario: Scenario): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const fontName = registerTurkishFont(doc);

  const percent    = formatPercent(session.total_score, scenario.scoring.max_points);
  const grade      = session.grade ?? "F";
  const totalSec   = session.results.length > 0
    ? session.results[session.results.length - 1].time_spent_sec
    : Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);
  const passed      = session.total_score >= scenario.scoring.passing_score;
  const passPct     = formatPercent(scenario.scoring.passing_score, scenario.scoring.max_points);
  const gc          = gradeColor(grade);
  const gb          = gradeBg(grade);

  // ════════════════════════════════════════════════════════════════
  // SAYFA 1
  // ════════════════════════════════════════════════════════════════
  drawPageBg(doc);

  // ── HEADER (koyu band, 52mm) ────────────────────────────────────
  const HEADER_H = 52;
  fillRect(doc, 0, 0, PW, HEADER_H, C.headerBg);
  // sol yeşil şerit
  fillRect(doc, 0, 0, 4, HEADER_H, C.brand);

  // Üst etiket
  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.brand);
  doc.text("MediSim TR  ·  Oturum Raporu", ML + 4, 10);

  // Senaryo başlığı
  doc.setFont(fontName, "bold");
  doc.setFontSize(17);
  doc.setTextColor(...C.white);
  const titleLines = doc.splitTextToSize(scenario.title, CW - 12) as string[];
  doc.text(titleLines, ML + 4, 19);

  // Meta satırı
  const metaY = titleLines.length > 1 ? 33 : 27;
  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(
    `${specialtyLabel(scenario.specialty)}  ·  ${difficultyLabel(session.selected_difficulty)}  ·  ${modeLabel(session.mode)}`,
    ML + 4, metaY
  );
  doc.setFontSize(7.5);
  doc.text(
    `${formatDateTime(session.started_at)}  ·  Süre: ${formatDuration(totalSec)}`,
    ML + 4, metaY + 5.5
  );

  // Pass / Fail badge (sağ üst, header içinde)
  const badgeBg: RGB = passed ? C.green : C.red;
  fillRect(doc, PW - MR - 34, 14, 32, 11, badgeBg, 2);
  doc.setFont(fontName, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(passed ? "GEÇTİ" : "KALDI", PW - MR - 18, 21, { align: "center" });
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.light);
  doc.text(`Sınır: %${passPct}`, PW - MR - 18, 29, { align: "center" });

  let y = HEADER_H + 8;

  // ── SKOR KARTI SATIRI (3 kutu) ───────────────────────────────────
  const CARD_H  = 26;
  const CARD_GAP = 3;
  const CARD_W1 = 42;
  const CARD_W2 = (CW - CARD_W1 - CARD_GAP * 2) / 2;

  // Kart 1: Harf notu + yüzde
  fillRect(doc, ML, y, CARD_W1, CARD_H, gb, 3);
  doc.setFont(fontName, "bold");
  doc.setFontSize(28);
  doc.setTextColor(...gc);
  doc.text(grade, ML + CARD_W1 / 2, y + 17, { align: "center" });
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...gc);
  doc.text(`%${percent}`, ML + CARD_W1 / 2, y + 23, { align: "center" });

  // Kart 2: Puan
  const x2 = ML + CARD_W1 + CARD_GAP;
  metricCard(doc, x2, y, CARD_W2, CARD_H,
    "Puan",
    `${session.total_score} / ${scenario.scoring.max_points}`,
    C.dark, C.bgCard, fontName
  );

  // Kart 3: Adım + Hata
  const x3 = x2 + CARD_W2 + CARD_GAP;
  metricCard(doc, x3, y, CARD_W2, CARD_H,
    "Adım / Kritik Hata",
    `${session.completed_step_ids.length}  ·  ${totalErrors}`,
    totalErrors > 0 ? C.red : C.dark,
    C.bgCard, fontName
  );

  y += CARD_H + 10;

  // ── ADIM PERFORMANS TABLOSU ──────────────────────────────────────
  y = sectionHeader(doc, y, "Adım Bazlı Performans", fontName);

  const tableRows = session.results.map((r, i) => {
    const step    = scenario.steps.find((s) => s.id === r.step_id);
    const prevSec = i > 0 ? session.results[i - 1].time_spent_sec : 0;
    const stepSec = r.time_spent_sec - prevSec;
    return [
      (i + 1).toString(),
      truncate(step?.title ?? r.step_id, 44),
      r.points_earned >= 0 ? `+${r.points_earned}` : `${r.points_earned}`,
      formatDuration(stepSec),
      r.critical_errors > 0 ? `${r.critical_errors} hata` : "—",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Adım", "Puan", "Süre", "Kritik Hata"]],
    body: tableRows,
    margin: { left: ML, right: MR },
    tableWidth: CW,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      font: "Helvetica",
      textColor: C.dark,
      lineColor: C.divider,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.headerBg,
      textColor: C.white,
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: C.bgCard },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 88 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 28, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 4) {
        const v = data.cell.raw as string;
        if (v !== "—") {
          data.cell.styles.textColor = C.red;
          data.cell.styles.fontStyle = "bold";
        }
      }
      if (data.column.index === 2) {
        const v = data.cell.raw as string;
        if (v.startsWith("+")) data.cell.styles.textColor = C.green;
        else if (v.startsWith("-")) data.cell.styles.textColor = C.red;
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => { drawPageBg(doc); },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable = (doc as any).lastAutoTable?.finalY as number | undefined;
  y = (afterTable ?? y) + 8;

  // ── AKSİYON DÖKÜMÜ ──────────────────────────────────────────────
  if (session.results.some((r) => r.actions_taken.length > 0)) {
    if (y + 22 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
    y = sectionHeader(doc, y, "Aksiyon Dökümü", fontName);

    for (const r of session.results) {
      if (r.actions_taken.length === 0) continue;
      const step  = scenario.steps.find((s) => s.id === r.step_id);
      const label = step?.title ?? r.step_id;

      if (y + 14 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }

      // Adım başlık bandı
      fillRect(doc, ML, y, CW, 8, C.bgCardAlt, 1.5);
      fillRect(doc, ML, y, 2.5, 8, C.brand, 0);
      doc.setFont(fontName, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.dark);
      doc.text(truncate(label, 60), ML + 5, y + 5.5);
      const pts = r.points_earned;
      doc.setTextColor(...(pts >= 0 ? C.green : C.red));
      doc.text(pts >= 0 ? `+${pts} puan` : `${pts} puan`, PW - MR - 2, y + 5.5, { align: "right" });
      y += 10;

      for (const action of r.actions_taken) {
        if (y + 5.5 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
        doc.setFont(fontName, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.mid);
        const text = `   · ${actionTypeLabel(action.type)}: ${action.target_id}${action.dose ? ` (${action.dose})` : ""}`;
        doc.text(truncate(text, 88), ML, y);
        y += 5;
      }

      if (r.critical_errors > 0) {
        if (y + 5.5 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
        fillRect(doc, ML, y - 0.5, CW, 5.5, C.redLight, 1);
        doc.setFont(fontName, "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.red);
        doc.text(`   ▲  ${r.critical_errors} kritik hata`, ML, y + 3.5);
        y += 7;
      }
      y += 2;
    }
    y += 2;
  }

  // ── TEMEL ÖĞRENİM NOKTALARI ─────────────────────────────────────
  if (y + 22 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
  y = sectionHeader(doc, y, "Temel Öğrenim Noktaları", fontName);

  scenario.debrief.key_learnings.forEach((item, i) => {
    const num    = `${i + 1}`;
    const lines  = doc.splitTextToSize(`       ${item}`, CW - 6) as string[];
    const blockH = lines.length * 4.6 + 5;
    if (y + blockH > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }

    fillRect(doc, ML, y, CW, blockH, C.bgCard, 2);
    // Numara dairesi
    fillRect(doc, ML + 3, y + (blockH - 5.5) / 2, 5.5, 5.5, C.brand, 2.75);
    doc.setFont(fontName, "bold");
    doc.setFontSize(6);
    doc.setTextColor(...C.white);
    doc.text(num, ML + 5.75, y + (blockH - 5.5) / 2 + 4, { align: "center" });

    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(lines, ML + 3, y + 4.5);
    y += blockH + 2.5;
  });
  y += 3;

  // ── DİKKAT NOKTALARI (red flags) ────────────────────────────────
  if (scenario.debrief.red_flags && scenario.debrief.red_flags.length > 0) {
    if (y + 22 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
    y = sectionHeader(doc, y, "Dikkat Edilmesi Gerekenler", fontName);

    for (const flag of scenario.debrief.red_flags) {
      const lines  = doc.splitTextToSize(`     ${flag}`, CW - 6) as string[];
      const blockH = lines.length * 4.6 + 5;
      if (y + blockH > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }

      fillRect(doc, ML, y, CW, blockH, C.redLight, 2);
      fillRect(doc, ML, y, 2.5, blockH, C.red, 0);
      doc.setFont(fontName, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.red);
      doc.text(lines, ML + 5, y + 4.5);
      y += blockH + 2.5;
    }
    y += 3;
  }

  // ── KAYNAKLAR ────────────────────────────────────────────────────
  if (y + 16 > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
  y = sectionHeader(doc, y, "Kaynaklar", fontName);

  for (const ref of scenario.debrief.references) {
    const lines  = doc.splitTextToSize(`· ${ref}`, CW - 4) as string[];
    const blockH = lines.length * 4.2 + 1;
    if (y + blockH > PH - MB) { doc.addPage(); drawPageBg(doc); y = 14; }
    doc.setFont(fontName, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.mid);
    doc.text(lines, ML + 2, y + 4);
    y += blockH + 2;
  }

  // ── TÜM SAYFALARA FOOTER ─────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) drawFooter(doc, p, totalPages, fontName);

  return doc.output("blob");
}

export function pdfFilename(session: SessionState, scenario: Scenario): string {
  return `medisim-${scenario.id}-${formatFileDatetime(session.started_at)}.pdf`;
}
