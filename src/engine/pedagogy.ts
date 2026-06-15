// ============================================================
// Pedagojik mod davranışı (Tier-2 — STEMI gerçeklik paketi AŞAMA 3)
// ============================================================
// MEVCUT PlayMode (egitim|klinik|sinav) PEDAGOJİK eksendir — yeni tip
// YARATILMADI. (Render ekseni AYRI: ScenarioMode = quiz|interactive_3d.)
// Eşleme:
//   egitim → ÖĞRETİCI (teaching): sistem doğru aksiyonu otomatik uygular +
//            adım açıklaması (narration). Puan baskısı yok. (autoPlay yalnız
//            sürücüyü bağlayan sayfada çalışır — ör. /hasta; diyalog demosu bağlamaz.)
//   klinik → UYGULAMA (practice): öğrenci aksiyon yapar, ipucu + anlık geri
//            bildirim, puanlı.
//   sinav  → SINAV (exam): ipucu YOK, anlık geri bildirim YOK, puanlı,
//            zaman baskısı (gerçek-zaman ölçek).
//
// Saf TS — React/Three import YOK, %100 test edilebilir.
// ============================================================

import type { PlayMode } from "./types";

export interface PedagogyBehavior {
  /** Kullanıcıya gösterilen etiket. */
  label: string;
  /** Kısa açıklama (mod seçim UI). */
  description: string;
  /** Sistem doğru adımları otomatik uygular (sadece sürücü bağlı sayfada). */
  autoPlay: boolean;
  /** İpucu / rehberlik göster (yanlışta açıklama). */
  showHints: boolean;
  /** Puanlama vurgusu (skor her durumda hesaplanır; bu UI/baskı içindir). */
  scored: boolean;
  /** Anlık geri bildirim toast'ı göster. */
  showFeedback: boolean;
  /** Adım açıklama metni (narration paneli) göster. */
  narration: boolean;
}

export const PEDAGOGY: Record<PlayMode, PedagogyBehavior> = {
  egitim: {
    label: "Öğretici",
    description:
      "Sistem doğru adımları otomatik uygular ve neden yapıldığını açıklar. İzleyerek öğrenirsiniz.",
    autoPlay: true,
    showHints: true,
    scored: false,
    showFeedback: true,
    narration: true,
  },
  klinik: {
    label: "Uygulama",
    description:
      "Kararları siz verirsiniz; ipucu ve anlık geri bildirim alırsınız. Puanlanır.",
    autoPlay: false,
    showHints: true,
    scored: true,
    showFeedback: true,
    narration: false,
  },
  sinav: {
    label: "Sınav",
    description:
      "İpucu ve anlık geri bildirim yok, gerçek zaman baskısı. Performans puanlanır.",
    autoPlay: false,
    showHints: false,
    scored: true,
    showFeedback: false,
    narration: false,
  },
};

export function getPedagogy(mode: PlayMode): PedagogyBehavior {
  return PEDAGOGY[mode] ?? PEDAGOGY.klinik;
}

/** Mod seçim UI için sıralı liste (Öğretici → Uygulama → Sınav). */
export const PEDAGOGY_ORDER: PlayMode[] = ["egitim", "klinik", "sinav"];
