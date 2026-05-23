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
// Sketchfab modeli mesh'leri "explode layout"ta geliyor (Y ekseninde 2.4m
// uzun bir hat). Klinik bir oda görüntüsü için her mesh ad-bazlı ad-merkezli
// olarak yeniden konumlandırılır. Pozisyonlar 3.5m × 3.5m × 2.8m oda
// içinde, hasta yatakta supine pose, kafa +X yönünde — Northwell/HFG
// klinik standardına göre.
//
// Scale 2.3: Sketchfab yatak bbox 44cm, hasta R3F 1m boy → yatağı hasta
// boyuna oranlamak için. Diğer mesh'ler aynı oranda büyür.
//
// Pozisyon konvansiyonu (R3F, hasta-merkezli):
//   +X: hasta kafa yönü      -X: hasta ayak yönü
//   +Y: yukarı (Sketchfab Y-up)  -Y: aşağı
//   +Z: hasta sağ (gözlemci sol görür)  -Z: hasta sol
const S = 2.3;

export const HOSPITAL_ROOM_LAYOUT: Record<string, HospitalAssetSpec> = {
  // Yatak — sahne merkezi
  "Bed-material": { position: [0, -0.10, 0], scale: S },

  // Klinik ekipman — yatak başucu (+X kafa yönü)
  "IvPole-material":     { position: [1.2, 0.4, 0.9],  scale: S }, // başucu sağ
  "Serum-material":      { position: [1.2, 1.4, 0.9],  scale: S }, // IV pole tepe
  "Machine-material":    { position: [1.2, 1.0, -0.9], scale: S }, // başucu sol monitör
  "Machine_O-material":  { position: [1.2, 1.4, -0.9], scale: S }, // monitör ekran
  "OxygenTube-material": { position: [1.5, 0.9, -0.7], scale: S }, // wall console O2
  "ElectricSystm-material": { position: [1.5, 1.6, -0.5], scale: S }, // duvar panel
  "Sign-material":       { position: [1.5, 1.8, 0.5],  scale: S }, // bilgi tabelası

  // Mobilya — yatak çevresinde
  "Commode-material":     { position: [0.2, 0.5, 1.0],  scale: S }, // sağ komodin
  "FoodTable-material":   { position: [0.0, 0.7, 1.0],  scale: S }, // over-bed table
  "Chair-material":       { position: [-1.0, 0.5, 1.0], scale: S }, // sandalye ayak ucu yan
  "Table-material":       { position: [-1.4, 0.7, -1.0], scale: S }, // bilgisayar masası
  "Tv-material":          { position: [-1.3, 1.8, -1.5], scale: S }, // duvar TV
  "TvSystm-material":     { position: [-1.3, 1.5, -1.5], scale: S }, // TV mount

  // Köşe mobilya
  "Sofa-material":        { position: [-1.6, 0.5, 1.5],  scale: S }, // ziyaretçi kanepe
  "Cabinet1-material":     { position: [-1.6, 0.6, -1.4], scale: S }, // ilaç dolabı
  "Cabinet1Door-material": { position: [-1.6, 0.6, -1.4], scale: S },
  "Cabinet1DoorGlass-material": { position: [-1.6, 0.6, -1.4], scale: S },
  "Cabinet2-material":     { position: [-1.4, 0.7, -1.2], scale: S }, // yan dolap
  "Curtain-material":      { position: [1.6, 1.8, 1.5],   scale: S }, // pencere perdesi

  // Aydınlatma — tavan
  "Light1-material":       { position: [0.5, 2.5, 0], scale: S },
  "Light2-material":       { position: [-0.5, 2.5, 0], scale: S },
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
