// Görsel katman bayrağı — 2D pivot (docs/2D-PIVOT-DEGERLENDIRME.md §2/§4).
// 3D SİLİNMEDİ: bayrak arkasında dondurulur (geri dönüş sigortası + satış
// demosu). Öncelik: ?visual= URL override > VITE_VISUAL_MODE env > varsayılan.
// fx kapısındaki desenin aynısı (PatientRoomScene.visualFxEnabled).

export type VisualMode = "2d" | "3d";

export function getVisualMode(): VisualMode {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("visual");
    if (q === "2d" || q === "3d") return q;
  }
  const env = import.meta.env.VITE_VISUAL_MODE;
  if (env === "2d" || env === "3d") return env;
  // e2e motion-guard'ları (__bedMetrics/__animDecision) 3D'ye özgü — açık
  // seçim yoksa Playwright'ta eski davranış korunur.
  if (import.meta.env.VITE_E2E === "1") return "3d";
  // Pilot varsayılanı 2D (Ali Bey kararı, 12 Tem 2026).
  return "2d";
}
