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

// ── Sabit renkler (RGB) ──────────────────────────────────────────
type RGB = [number, number, number];
const C = {
  brand:    [124, 179, 66]  as RGB,
  dark:     [20,  20,  30]  as RGB,
  mid:      [80,  80,  95]  as RGB,
  light:    [150, 150, 165] as RGB,
  bgCard:   [240, 242, 247] as RGB,
  red:      [220, 53,  69]  as RGB,
  green:    [16,  185, 129] as RGB,
  amber:    [217, 119, 6]   as RGB,
  white:    [255, 255, 255] as RGB,
};

// ── Sayfa sabitleri ──────────────────────────────────────────────
const PW = 210;   // A4 genişlik mm
const PH = 297;   // A4 yükseklik mm
const ML = 14;    // sol kenar boşluğu
const MR = 14;    // sağ kenar boşluğu
const MT = 14;    // üst kenar boşluğu
const MB = 18;    // alt (footer için geniş)
const CW = PW - ML - MR; // içerik genişliği = 182

// ── Yardımcı: çizgi ─────────────────────────────────────────────
function hRule(doc: jsPDF, y: number, r: RGB = C.bgCard): void {
  doc.setDrawColor(...r);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
}

// ── Yardımcı: renkli kutu ────────────────────────────────────────
function fillRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: RGB,
  rounding = 0
): void {
  doc.setFillColor(...fill);
  if (rounding > 0) {
    doc.roundedRect(x, y, w, h, rounding, rounding, "F");
  } else {
    doc.rect(x, y, w, h, "F");
  }
}

// ── Yardımcı: metin kısalt ───────────────────────────────────────
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

// ── Footer çiz (sayfa değiştikten sonra çağırılır) ───────────────
function drawFooterOnPage(
  doc: jsPDF,
  page: number,
  total: number,
  fontName: string
): void {
  doc.setPage(page);
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.light);
  doc.text(
    "Bu rapor eğitim amaçlıdır, klinik karar yerine geçmez. MediSim TR",
    ML,
    PH - 8
  );
  doc.text(
    `Sayfa ${page} / ${total}`,
    PW - MR,
    PH - 8,
    { align: "right" }
  );
  // alt çizgi
  doc.setDrawColor(...C.bgCard);
  doc.setLineWidth(0.2);
  doc.line(ML, PH - 11, PW - MR, PH - 11);
}

// ── Ana export fonksiyonu ────────────────────────────────────────

export async function exportToPdf(
  session: SessionState,
  scenario: Scenario
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  const fontName = await registerTurkishFont(doc);

  const setFont = (size: number, color: RGB = C.dark, style: "normal" | "bold" = "normal") => {
    doc.setFont(fontName, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const percent = formatPercent(session.total_score, scenario.scoring.max_points);
  const grade = session.grade ?? "F";
  const totalSec = session.results.length > 0
    ? session.results[session.results.length - 1].time_spent_sec
    : Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);
  const passed = session.total_score >= scenario.scoring.passing_score;
  const passPct = formatPercent(scenario.scoring.passing_score, scenario.scoring.max_points);

  let y = MT;

  // ── 1. BAŞLIK BLOĞU ─────────────────────────────────────────────
  // Üst marka şeridi
  fillRect(doc, 0, 0, PW, 8, C.brand);
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text("MediSim TR", ML, 5.5);
  doc.text("Oturum Raporu", PW - MR, 5.5, { align: "right" });

  y = 14;

  // Senaryo başlığı
  setFont(16, C.dark);
  doc.text(truncate(scenario.title, 60), ML, y);
  y += 7;

  // Meta satırı 1: uzmanlık + zorluk + mod
  setFont(8.5, C.mid);
  doc.text(
    `${specialtyLabel(scenario.specialty)}  ·  ${difficultyLabel(session.selected_difficulty)}  ·  ${modeLabel(session.mode)}`,
    ML,
    y
  );
  y += 5.5;

  // Meta satırı 2: tarih + süre
  doc.text(
    `Oynanma tarihi: ${formatDateTime(session.started_at)}  ·  Süre: ${formatDuration(totalSec)}`,
    ML,
    y
  );
  y += 6;

  hRule(doc, y);
  y += 5;

  // ── 2. SONUÇ ÖZETİ ──────────────────────────────────────────────
  fillRect(doc, ML, y, CW, 28, C.bgCard, 2);

  // Harf notu (sol büyük)
  const gradeColor: RGB = grade === "A" ? C.green : grade === "F" ? C.red : C.amber;
  doc.setFont(fontName, "normal");
  doc.setFontSize(34);
  doc.setTextColor(...gradeColor);
  doc.text(grade, ML + 8, y + 20);

  // Puan bloğu (orta)
  setFont(9, C.dark);
  doc.text(`${session.total_score} / ${scenario.scoring.max_points} puan`, ML + 28, y + 9);
  setFont(20, gradeColor);
  doc.text(`%${percent}`, ML + 28, y + 21);

  // Geçti/Kaldı badge (sağ)
  const badgeColor: RGB = passed ? C.green : C.red;
  fillRect(doc, ML + 100, y + 5, 36, 10, badgeColor, 1.5);
  doc.setFont(fontName, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(passed ? "GEÇTİ" : "KALDI", ML + 100 + 18, y + 11.5, { align: "center" });

  // Geçme sınırı
  setFont(7.5, C.light);
  doc.text(`Geçme sınırı: %${passPct}`, ML + 100, y + 21);

  // Sağ: adım / kritik hata
  setFont(8, C.mid);
  doc.text(`${session.completed_step_ids.length} adım tamamlandı`, ML + 148, y + 9);
  doc.setTextColor(...(totalErrors > 0 ? C.red : C.mid));
  doc.text(`${totalErrors} kritik hata`, ML + 148, y + 18);

  y += 32;

  // ── 3. ADIM PERFORMANS TABLOSU ───────────────────────────────────
  setFont(9, C.dark);
  doc.text("Adım Bazlı Performans", ML, y);
  y += 4;

  const tableRows = session.results.map((r, i) => {
    const step = scenario.steps.find((s) => s.id === r.step_id);
    const prevSec = i > 0 ? session.results[i - 1].time_spent_sec : 0;
    const stepSec = r.time_spent_sec - prevSec;
    return [
      (i + 1).toString(),
      truncate(step?.title ?? r.step_id, 45),
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
      cellPadding: 2.5,
      textColor: C.dark,
      lineColor: [215, 218, 228] as [number, number, number],
      lineWidth: 0.2,
      font: "Helvetica",   // Helvetica always has normal+bold — safe for header rows
    },
    headStyles: {
      fillColor: C.brand,
      textColor: C.white,
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 28, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const val = data.cell.raw as string;
        if (val !== "—") {
          data.cell.styles.textColor = C.red;
          data.cell.styles.fillColor = [255, 240, 240];
        }
      }
      if (data.section === "body" && data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val.startsWith("+")) data.cell.styles.textColor = C.green;
        else if (val.startsWith("-")) data.cell.styles.textColor = C.red;
      }
    },
    // autoTable internals type y as unknown; cast required
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { y = data.cursor.y as number; },
  });

  // autoTable'dan sonra cursor y'yi al
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable = (doc as any).lastAutoTable?.finalY as number | undefined;
  if (afterTable) y = afterTable + 6;
  else y += 6;

  // ── 4. AKSİYON DÖKÜMÜ ───────────────────────────────────────────
  if (session.results.some((r) => r.actions_taken.length > 0)) {
    if (y + 20 > PH - MB) { doc.addPage(); y = MT; }

    setFont(9, C.dark);
    doc.text("Aksiyon Dökümü", ML, y);
    y += 2;
    hRule(doc, y, [220, 222, 230]);
    y += 4;

    for (const r of session.results) {
      if (r.actions_taken.length === 0) continue;

      const step = scenario.steps.find((s) => s.id === r.step_id);
      const label = step?.title ?? r.step_id;

      if (y + 12 > PH - MB) { doc.addPage(); y = MT; }

      // Adım başlığı
      fillRect(doc, ML, y, CW, 7, [232, 235, 243], 1);
      setFont(8, C.mid);
      doc.text(truncate(label, 65), ML + 3, y + 5);
      setFont(8, r.points_earned >= 0 ? C.green : C.red);
      doc.text(
        r.points_earned >= 0 ? `+${r.points_earned} puan` : `${r.points_earned} puan`,
        PW - MR - 2,
        y + 5,
        { align: "right" }
      );
      y += 9;

      // Aksiyonlar
      for (const action of r.actions_taken) {
        if (y + 5.5 > PH - MB) { doc.addPage(); y = MT; }
        setFont(7.5, C.mid);
        const prefix = "  · ";
        const text = `${prefix}${actionTypeLabel(action.type)}: ${action.target_id}${action.dose ? ` (${action.dose})` : ""}`;
        doc.text(truncate(text, 90), ML, y);
        y += 5;
      }

      if (r.critical_errors > 0) {
        if (y + 5 > PH - MB) { doc.addPage(); y = MT; }
        setFont(7.5, C.red);
        doc.text(`  ⚠ ${r.critical_errors} kritik hata`, ML, y);
        y += 5;
      }
      y += 2;
    }
    y += 2;
  }

  // ── 5. DEBRİEF İÇERİĞİ ──────────────────────────────────────────
  if (y + 20 > PH - MB) { doc.addPage(); y = MT; }

  setFont(9, C.dark);
  doc.text("Temel Öğrenim Noktaları", ML, y);
  y += 2;
  hRule(doc, y, [220, 222, 230]);
  y += 4;

  scenario.debrief.key_learnings.forEach((item, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, CW - 4) as string[];
    const blockH = lines.length * 4.5 + 4;
    if (y + blockH > PH - MB) { doc.addPage(); y = MT; }
    fillRect(doc, ML, y, CW, blockH, C.bgCard, 1.5);
    setFont(8, C.dark);
    doc.text(lines, ML + 3, y + 4.5);
    y += blockH + 2;
  });
  y += 3;

  // Red flags
  if (scenario.debrief.red_flags && scenario.debrief.red_flags.length > 0) {
    if (y + 14 > PH - MB) { doc.addPage(); y = MT; }

    setFont(9, C.red);
    doc.text("Dikkat Edilmesi Gerekenler", ML, y);
    y += 2;
    hRule(doc, y, [220, 222, 230]);
    y += 4;

    for (const flag of scenario.debrief.red_flags) {
      const lines = doc.splitTextToSize(`▲ ${flag}`, CW - 4) as string[];
      const blockH = lines.length * 4.5 + 4;
      if (y + blockH > PH - MB) { doc.addPage(); y = MT; }
      fillRect(doc, ML, y, CW, blockH, [255, 243, 243], 1.5);
      setFont(8, C.red);
      doc.text(lines, ML + 3, y + 4.5);
      y += blockH + 2;
    }
    y += 3;
  }

  // Kaynaklar
  if (y + 14 > PH - MB) { doc.addPage(); y = MT; }
  setFont(9, C.dark);
  doc.text("Kaynaklar", ML, y);
  y += 2;
  hRule(doc, y, [220, 222, 230]);
  y += 4;

  for (const ref of scenario.debrief.references) {
    const lines = doc.splitTextToSize(`· ${ref}`, CW - 4) as string[];
    const blockH = lines.length * 4.5 + 1;
    if (y + blockH > PH - MB) { doc.addPage(); y = MT; }
    setFont(7.5, C.mid);
    doc.text(lines, ML + 2, y + 4);
    y += blockH + 1;
  }

  // ── 6. TÜM SAYFALARA FOOTER ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    drawFooterOnPage(doc, p, totalPages, fontName);
  }

  return doc.output("blob");
}

export function pdfFilename(session: SessionState, scenario: Scenario): string {
  return `medisim-${scenario.id}-${formatFileDatetime(session.started_at)}.pdf`;
}
