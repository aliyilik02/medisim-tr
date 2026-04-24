import type { jsPDF } from "jspdf";

// CDN priority: local public dir first, then jsDelivr (Google Fonts repo via CDN)
const FONT_URLS = [
  "/fonts/Roboto-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Regular.ttf",
];

let cachedBase64: string | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  // Process in chunks to avoid call stack limits on large fonts
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/**
 * Registers a Turkish-compatible font on the jsPDF instance.
 * Returns the font name to use with setFont() calls.
 * Falls back to "Helvetica" if all fetches fail (İ, ş, ğ may not render).
 */
export async function registerTurkishFont(doc: jsPDF): Promise<string> {
  if (typeof fetch === "undefined") {
    doc.setFont("Helvetica", "normal");
    return "Helvetica";
  }

  try {
    if (!cachedBase64) {
      let lastError: unknown;
      for (const url of FONT_URLS) {
        try {
          cachedBase64 = await toBase64(url);
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (!cachedBase64) throw lastError;
    }

    doc.addFileToVFS("Roboto-Regular.ttf", cachedBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");
    return "Roboto";
  } catch {
    // Helvetica covers Ö ö Ü ü Ç ç but NOT İ ı Ş ş Ğ ğ in WinAnsi
    doc.setFont("Helvetica", "normal");
    return "Helvetica";
  }
}
