import type { jsPDF } from "jspdf";

// Önce public/fonts/NotoSans-*.ttf'den yükle (tam Türkçe desteği).
// Dosya yoksa Helvetica'ya düş — WinAnsi Ö Ü Ç için yeterli,
// İ ı Ş ş Ğ ğ ise modern görüntüleyiciler tarafından ikame edilir.
//
// Noto Sans indirme: https://fonts.google.com/noto/specimen/Noto+Sans
// → NotoSans-Regular.ttf ve NotoSans-Bold.ttf → public/fonts/ klasörüne koy

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function registerFont(doc: jsPDF): Promise<string> {
  try {
    const [reg, bold] = await Promise.all([
      fetch("/fonts/NotoSans-Regular.ttf").then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
      fetch("/fonts/NotoSans-Bold.ttf").then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
    ]);
    if (reg && bold) {
      doc.addFileToVFS("NotoSans-Regular.ttf", ab2b64(reg));
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", ab2b64(bold));
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      doc.setFont("NotoSans", "normal");
      return "NotoSans";
    }
  } catch { /* fall through */ }
  doc.setFont("Helvetica", "normal");
  return "Helvetica";
}
