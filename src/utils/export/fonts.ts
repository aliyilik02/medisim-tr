import type { jsPDF } from "jspdf";

// jsPDF'in CDN/TTF parsing yaklaşımı güvenilmez:
// - Standart olmayan cmap formatları "No unicode cmap for font" hatası verir
// - addFont başarısız olsa bile PubSub üzerinden loglar, exception fırlatmaz
// - getFontList() kırık fontları da "kayıtlı" gösterir
//
// Çözüm: Helvetica kullan — jsPDF'in yerleşik fontu, pdfEscape16 değil
// pdfEscape kullanır, exception fırlatmaz.
// Ö Ü Ç ö ü ç → WinAnsi'de var, doğru render edilir.
// İ ı Ş ş Ğ ğ → Modern PDF görüntüleyiciler (Chrome/Edge/Acrobat) font
//                 ikamesiyle doğru gösterir. Eski görüntüleyicilerde atlanabilir.
//
// İleride yerel TTF eklenirse: public/fonts/ altına koy ve bu dosyayı güncelle.

export function registerTurkishFont(doc: jsPDF): string {
  doc.setFont("Helvetica", "normal");
  return "Helvetica";
}
