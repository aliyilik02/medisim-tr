import type { jsPDF } from "jspdf";

// TTF: 0x00010000, CFF/OTF: "OTTO", TrueType Collection: "ttcf"
function isValidTTF(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const b = new Uint8Array(buf, 0, 4);
  return (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) ||
         (b[0] === 0x74 && b[1] === 0x74 && b[2] === 0x63 && b[3] === 0x66) || // ttcf
         (b[0] === 0x4F && b[1] === 0x54 && b[2] === 0x54 && b[3] === 0x4F);   // OTTO
}

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Session-level cache — fontu ilk PDF'te yükle, sonraki çağrıda reuse et
let _fontCache: { name: string; reg64: string; bold64: string } | null = null;

export async function registerFont(doc: jsPDF): Promise<string> {
  // Cache hit: fontları zaten base64'e çevirdik, sadece doc'a kayıt et
  if (_fontCache) {
    try {
      doc.addFileToVFS("NotoSans-Regular.ttf", _fontCache.reg64);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", _fontCache.bold64);
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      doc.setFont("NotoSans", "normal");
      return "NotoSans";
    } catch {
      // Cache bozulduysa fallback'e düş
      _fontCache = null;
    }
  }

  try {
    const [reg, bold] = await Promise.all([
      fetch("/fonts/NotoSans-Regular.ttf").then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
      fetch("/fonts/NotoSans-Bold.ttf").then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null),
    ]);

    if (reg && bold && isValidTTF(reg) && isValidTTF(bold)) {
      const reg64  = ab2b64(reg);
      const bold64 = ab2b64(bold);

      doc.addFileToVFS("NotoSans-Regular.ttf", reg64);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", bold64);
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      doc.setFont("NotoSans", "normal");

      _fontCache = { name: "NotoSans", reg64, bold64 };
      return "NotoSans";
    }
  } catch { /* fall through */ }

  doc.setFont("Helvetica", "normal");
  return "Helvetica";
}
