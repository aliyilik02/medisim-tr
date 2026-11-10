// ============================================================
// Muayene noktası çapaları — kemik + kemik-LOKAL ofset
// ============================================================
// Supine hastada sabit dünya koordinatı poz/varyantla kayıyordu (bkz.
// AuscultationOverlay başlık notu) → noktalar KEMİĞE bağlanır: animasyonu
// ve dört varyantı (kadın/erkek/çocuk/yaşlı) kendiliğinden takip eder.
//
// Birim: kemik-lokal (Mixamo cm-rig; ekipmanla AYNI uzay — equipmentMeshes
// EQUIPMENT_BONE). Eksenler gövde kemiklerinde: +Y başa doğru, +Z öne
// (anterior), +X hastanın SOLU.
// Kalibrasyon dayanakları (ölçülmüş mevcut değerler):
//   - göğüs ön yüzü: Spine2 z≈7.6 (ekg_electrodes ofseti)
//   - ağız/burun:   Head y≈8.2-9.4, z≈12.4-13 (oksijen maskesi / nazal kanül)
//   - parmak ucu:   Hand y≈9 (pulse-ox)
// Noktalar DOM (Html) olarak çizilir, örtülme yok → z yalnız paralaksı etkiler.
// Doğrulama: ekran görüntüsü turu ("Tüm beden" kamerası; erkek varyantında doğrulandı, diğer üç varyant DOĞRULANMADI).
// ============================================================

import type { ExamSite } from "@/engine";

export interface ExamAnchor {
  bone: string;
  offset: [number, number, number];
  /** Etiket yönü; verilmezse x<0 (hastanın sağı) → sol, değilse sağ. */
  labelSide?: "left" | "right";
}

export const EXAM_ANCHORS: Record<ExamSite, ExamAnchor> = {
  airway: { bone: "mixamorigHead", offset: [0, 7.5, 12.5] },
  pupils: { bone: "mixamorigHead", offset: [0, 13.5, 11.5] },
  // Sağ boyun yanı (juguler dolgunluk sağdan değerlendirilir)
  neck: { bone: "mixamorigNeck", offset: [-3.5, 3, 6] },
  // Aort odağı: 2. kaburga arası, sağ sternum kenarı
  heart_base: { bone: "mixamorigSpine2", offset: [-3, 8, 8] },
  // Apeks: 5. kaburga arası, sol orta köprücük hattı
  heart_apex: { bone: "mixamorigSpine2", offset: [7.5, -1.5, 8] },
  lung_right: { bone: "mixamorigSpine2", offset: [-10, 2, 7] },
  lung_left: { bone: "mixamorigSpine2", offset: [11, 4.5, 7] },
  abdomen_ruq: { bone: "mixamorigSpine", offset: [-7, 5, 9] },
  abdomen_luq: { bone: "mixamorigSpine", offset: [7, 5, 9] },
  abdomen_rlq: { bone: "mixamorigSpine", offset: [-7, -5, 9] },
  abdomen_llq: { bone: "mixamorigSpine", offset: [7, -5, 9] },
  // Sağ el bileği (sol elde pulse-ox, sol kolda manşon var)
  radial_pulse: { bone: "mixamorigRightForeArm", offset: [0, 24, 0], labelSide: "left" },
  cap_refill: { bone: "mixamorigRightHand", offset: [0, 9, 0] },
  // Sol kaval ön yüzü, alt üçte bir (pretibial)
  leg_edema: { bone: "mixamorigLeftLeg", offset: [0, 28, 0] },
};
