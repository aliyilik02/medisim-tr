import type { jsPDF } from "jspdf";

// DejaVu Sans — statik TrueType, tam Unicode (İ ı Ş ş Ğ ğ dahil), ~734 KB
// npm paketi dejavu-fonts-ttf@2.37.3 üzerinden jsDelivr CDN
const FONT_URLS = [
  "/fonts/DejaVuSans.ttf",
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
];

const FONT_NAME = "DejaVuSans";
let cachedBase64: string | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/**
 * Registers DejaVu Sans (full Unicode) on the jsPDF instance.
 * Returns the font name to use in setFont() calls.
 * Falls back to "Helvetica" if all fetches fail or font is invalid.
 */
export async function registerTurkishFont(doc: jsPDF): Promise<string> {
  if (typeof fetch === "undefined") return "Helvetica";

  try {
    if (!cachedBase64) {
      let lastError: unknown;
      for (const url of FONT_URLS) {
        try {
          cachedBase64 = await toBase64(url);
          break;
        } catch (e) {
          lastError = e;
          cachedBase64 = null;
        }
      }
      if (!cachedBase64) throw lastError;
    }

    doc.addFileToVFS(`${FONT_NAME}.ttf`, cachedBase64);
    doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, "normal");

    // jsPDF, geçersiz TTF dosyalarında PubSub üzerinden hata loglar
    // ama istisna fırlatmaz. getFontList() ile gerçekten kaydoldu mu kontrol et.
    const registered = doc.getFontList();
    if (!registered[FONT_NAME]) {
      throw new Error(`Font '${FONT_NAME}' registration failed`);
    }

    doc.setFont(FONT_NAME, "normal");
    return FONT_NAME;
  } catch (err) {
    console.warn("[MediSim] Turkish font load failed, falling back to Helvetica:", err);
    cachedBase64 = null; // bir sonraki denemede tekrar indir
    doc.setFont("Helvetica", "normal");
    return "Helvetica";
  }
}
