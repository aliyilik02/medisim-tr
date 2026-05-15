// ============================================================
// exportExcel — ExcelJS migration entegrasyon testi
// ============================================================
// xlsx → exceljs geçişinin davranışsal birebirliğini doğrular.
// Gerçek bir senaryoyu auto-play ile oynayıp çıkan SessionState'i
// exportToExcel'e verir, dönen Blob'u ExcelJS ile geri parse eder.
// Kontroller:
//   1. 3 sheet (Özet / Adımlar / Aksiyonlar) doğru isimlerle var
//   2. Türkçe karakterler (ş, ı, ğ, ç) UTF-8 korunmuş
//   3. Header satırı + en az 1 veri satırı oluşmuş
//   4. Hücre stilleri uygulanmış (fill ARGB header'da görünür)
// ============================================================

import { describe, expect, test } from "vitest";
import ExcelJS from "exceljs";
import { exportToExcel, excelFilename } from "@/utils/export/exportExcel";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";
import { autoPlayBestPath } from "../helpers/auto-play";

const stemi = ALL_SCENARIOS.find((s) => s.id === "kardiyoloji-stemi-001");
if (!stemi) throw new Error("STEMI test senaryosu bulunamadı");

describe("exportExcel — ExcelJS migration", () => {
  test("3 sheet doğru isimlerle üretilir (Özet / Adımlar / Aksiyonlar)", async () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const blob = await exportToExcel(finalSession, stemi);
    expect(blob).toBeInstanceOf(Blob);

    const buf = await blob.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    const names = wb.worksheets.map((ws) => ws.name);
    expect(names).toEqual(["Özet", "Adımlar", "Aksiyonlar"]);
  });

  test("Özet sayfası başlık + senaryo ID + skor bilgilerini içerir", async () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const blob = await exportToExcel(finalSession, stemi);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ozet = wb.getWorksheet("Özet")!;

    expect(ozet.getCell("A1").value).toBe("MediSim TR — Oturum Raporu");
    expect(ozet.getCell("A4").value).toBe("Senaryo ID");
    expect(ozet.getCell("B4").value).toBe(stemi.id);
    expect(ozet.getCell("A17").value).toBe("Toplam Puan");
    expect(typeof ozet.getCell("B17").value).toBe("number");
  });

  test("Türkçe karakterler UTF-8 korunur", async () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const blob = await exportToExcel(finalSession, stemi);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ozet = wb.getWorksheet("Özet")!;
    const adimlar = wb.getWorksheet("Adımlar")!;
    const aksiyonlar = wb.getWorksheet("Aksiyonlar")!;

    // Sheet isimleri zaten ş/ı içeriyor — yüklenebildiğine göre tamam
    expect(ozet.name).toBe("Özet");
    expect(adimlar.name).toBe("Adımlar");
    expect(aksiyonlar.name).toBe("Aksiyonlar");

    // Header'larda Türkçe karakter
    expect(adimlar.getCell("A1").value).toBe("Sıra");
    expect(adimlar.getCell("F1").value).toBe("Kümülatif Süre (sn)");
    expect(adimlar.getCell("H1").value).toBe("Kritik Hata");

    // Bölüm başlıkları
    expect(ozet.getCell("A3").value).toBe("SENARYO BİLGİLERİ");
  });

  test("Adımlar sayfasında her oynanan adım için 1 satır vardır", async () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const blob = await exportToExcel(finalSession, stemi);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const adimlar = wb.getWorksheet("Adımlar")!;

    // 1 header + N veri satırı
    expect(adimlar.rowCount).toBe(1 + finalSession.results.length);
  });

  test("Header hücre stilleri uygulanır (yeşil dolgu)", async () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const blob = await exportToExcel(finalSession, stemi);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const adimlar = wb.getWorksheet("Adımlar")!;
    const a1 = adimlar.getCell("A1");

    expect(a1.fill).toBeDefined();
    const fill = a1.fill as ExcelJS.FillPattern;
    expect(fill.type).toBe("pattern");
    expect(fill.fgColor?.argb).toBe("FF7CB342"); // brand yeşili
    expect(a1.font?.bold).toBe(true);
  });

  test("excelFilename Türkçe-güvenli dosya adı üretir", () => {
    const { finalSession } = autoPlayBestPath(stemi, 3);
    const name = excelFilename(finalSession, stemi);
    expect(name).toMatch(/^medisim-kardiyoloji-stemi-001-.*\.xlsx$/);
  });
});
