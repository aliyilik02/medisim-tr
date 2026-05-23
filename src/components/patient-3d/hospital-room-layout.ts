// ============================================================
// hospital-room-layout — Sketchfab "explode layout" → klinik oda
// ============================================================
// Sketchfab Auto-converted glTF export çoklu-obje sahnesinde tüm mesh'leri
// origin'de yan yana diziyor. Klinik hasta odası layout'unda her mesh'in
// gerçek konumu burada tanımlanır.
//
// Kaynak: Hospital patient room standardı (SonderCare/Medik clinical guide):
//   - Yatak merkez, 36 inch (~0.9m) clearance her yan
//   - Başucu duvarına yakın → monitor + IV stand + güç paneli
//   - IV rack başucu BIR köşede, power column DİĞER köşede
//   - Ventilator + computer terminal yatak çevresinde
//   - Sandalye + komodin + over-bed table = hasta erişiminde
//
// Koordinat: hasta supine pose'da world (0,0,0)'da yatay. +X kafa yönü,
// -X ayak yönü, +Z hasta sağ tarafı (gözlemci sol görür), -Z hasta sol.
// ============================================================

export type Position3 = [number, number, number];
export type Rotation3 = [number, number, number];

export interface HospitalAssetSpec {
  /** World position [x, y, z] — hasta (0,0,0) referans alınır. */
  position: Position3;
  /** World rotation Euler XYZ radyan. Default [0,0,0]. */
  rotation?: Rotation3;
  /** Scale modeli ek çarpan (default 1 = layout dict scale ile gelir). */
  scale?: number;
}

/**
 * Sketchfab "hospital-room" (UgurYksk CC BY 4.0) modelinin mesh adlarına
 * göre klinik oda layout pozisyonları.
 *
 * Her mesh'i ad bazlı eşleştir + position ata. Eşleşmeyenler `HIDDEN_MESH`
 * setinde ise gizle, yoksa orijinal Sketchfab pozisyonunda kalır.
 */
export const HOSPITAL_ROOM_LAYOUT: Record<string, HospitalAssetSpec> = {
  // Yatak — sahne merkezi (hasta üstte)
  "Bed-material": { position: [0, -0.05, 0] },

  // Klinik ekipman — yatak başucu (+X = kafa yönü)
  "IvPole-material":     { position: [0.55, 0.35, 0.40] },   // sağ üst köşe
  "Serum-material":      { position: [0.55, 0.85, 0.40] },   // IV pole tepesi
  "Machine-material":    { position: [0.55, 0.55, -0.40] },  // sol üst monitör
  "Machine_O-material":  { position: [0.55, 0.85, -0.40] },  // monitör ekran
  "OxygenTube-material": { position: [0.65, 0.40, -0.40] },  // duvar konsolu
  "ElectricSystm-material": { position: [0.70, 1.20, -0.30] }, // duvar panel
  "Sign-material":       { position: [0.70, 1.20, 0.30] },    // hasta info tabelası

  // Mobilya — yatak çevresinde
  "Commode-material":     { position: [0.10, 0.30, 0.55] },  // sağ komodin
  "FoodTable-material":   { position: [0.00, 0.45, 0.55] },  // over-bed table
  "Chair-material":       { position: [-0.40, 0.25, 0.55] }, // yatak ayak ucu sandalye
  "Table-material":       { position: [-0.60, 0.40, -0.60] }, // bilgisayar masası
  "Tv-material":          { position: [-0.50, 1.70, -0.85] }, // duvar TV
  "TvSystm-material":     { position: [-0.50, 1.50, -0.85] }, // TV mount

  // Köşe mobilya — uzak köşe
  "Sofa-material":        { position: [-1.10, 0.35, 0.75] }, // ziyaretçi kanepesi
  "Cabinet1-material":     { position: [-1.20, 0.40, -0.75] }, // ilaç dolabı
  "Cabinet1Door-material": { position: [-1.20, 0.40, -0.75] },
  "Cabinet1DoorGlass-material": { position: [-1.20, 0.40, -0.75] },
  "Cabinet2-material":     { position: [-1.10, 0.50, -0.70] }, // yan dolap
  "Curtain-material":      { position: [1.00, 1.40, 0.90] },  // pencere perdesi

  // Aydınlatma — tavan
  "Light1-material":       { position: [0.30, 2.40, 0] },
  "Light2-material":       { position: [-0.40, 2.40, 0] },
};

/**
 * Eşleşmeyen mesh'lerden gizlenecek olanlar (görsel kalabalık yapan, gereksiz).
 * Door + Wall mesh'leri uzakta kalabilir — onları arka plan duvar olarak
 * gizlemek yerine konumlandırırız (aşağıda HIDDEN_MESH'te tutmuyoruz).
 */
export const HIDDEN_MESH: Set<string> = new Set([
  // Uzak duvarları ve zemini gizle — sahne daha temiz, hasta odağı korunur.
  // Daha sonra zemin/duvar render etmek istenirse buradan çıkar.
  "Ground-material",
  "Wall1-material",
  "Wall2-material",
  "Wall3-material",
  "Wall5-material",
  "WindowWall-material",
  "Door-material",
  "DoorWall-material",
]);
