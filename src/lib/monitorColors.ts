// ============================================================
// MediSim TR — Vital monitör parametre renkleri (TEK KAYNAK)
// ============================================================
// Philips IntelliVue / APSF konvansiyonu: her parametrenin SABİT kimlik rengi
// vardır (sayı + dalga aynı renk). Durum/alarm rengi AYRI katmandır (ring + flash,
// IEC 60601-1-8). Sayıyı durum rengiyle boyamak Philips ilkesine aykırıdır.
//
// Çakışma kararları (gerekçeli):
// - Temp = turuncu (Philips cyan kullanır ama bizde SpO₂ cyan → çakışmayı önle, Dräger turuncu).
// - EtCO₂ = beyaz (Philips sarı/beyaz; RR zaten sarı → beyaz seçildi).
// ============================================================

export const PARAM_COLOR = {
  hr: "#00E676", // ECG / nabız — Philips yeşili
  spo2: "#22D3EE", // pleth — cyan
  bp: "#EF4444", // ABP / NIBP — kırmızı
  rr: "#FACC15", // solunum — sarı
  temp: "#FB923C", // sıcaklık — turuncu
  etco2: "#FFFFFF", // kapnografi — beyaz
  gcs: "#A78BFA", // nörolojik — mor
  glucose: "#F472B6", // glukoz — pembe
} as const;

export type MonitorParam = keyof typeof PARAM_COLOR;
