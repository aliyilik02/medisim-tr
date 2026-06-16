// ============================================================
// Oskültasyon Ses Servisi — Sprint B.4.7
// ============================================================
// Web Audio API üzerinden tek bir aktif oskültasyon sesi çalar.
// Birden çok prosedür tetiklerse önceki ses durdurulur, yenisi başlar.
//
// Ses dosyaları: public/sounds/auscultation/*.ogg
// Atıf: public/sounds/auscultation/SOUNDS-LICENSE.md
// ============================================================

import type { HeartSound } from "@/engine";

let currentAudio: HTMLAudioElement | null = null;
let stopTimer: number | null = null;

// HeartSound (faz sinyali) → .ogg dosya kökü. null = ses çalma (arrest/sessiz).
// ⚠️ PLACEHOLDER: s3_gallop ve muffled için lisanslı ses dosyası HENÜZ YOK —
// şimdilik mevcut en yakın "alternatif" kalp sesine (heart_61bpm) düşülür.
// Gerçek S3 gallop + muffled sesleri AYRI iş (lisanslı kaynak gerekir):
//   → heart_s3_gallop.ogg (pompa yetmezliği) + heart_muffled.ogg (düşük debi)
// Dosyalar eklenince bu tablodaki değerleri güncelle (kod yapısı hazır).
const HEART_SOUND_FILE: Record<HeartSound, string | null> = {
  normal: "heart_normal",
  tachy: "heart_61bpm", // pragmatik: mevcut tek "alternatif hız" kalp sesi
  s3_gallop: "heart_61bpm", // PLACEHOLDER → heart_s3_gallop.ogg eklenecek
  muffled: "heart_61bpm", // PLACEHOLDER → heart_muffled.ogg eklenecek
  silent: null, // arrest — nabız/ses yok
};

/** Faz kalp sesini .ogg dosya köküne çevirir. null → ses çalınmaz (sessiz). */
export function heartSoundFile(sound: HeartSound): string | null {
  return HEART_SOUND_FILE[sound];
}

/**
 * Oskültasyon sesini çal. Önceki ses çalıyorsa durdurulur.
 * @param soundId - public/sounds/auscultation/{soundId}.ogg
 * @param durationMs - opsiyonel; verilirse bu süre sonunda ses durur. Verilmezse loop.
 */
export function playAuscultation(soundId: string, durationMs?: number): void {
  stopAuscultation();

  const audio = new Audio(`/sounds/auscultation/${soundId}.ogg`);
  audio.volume = 0.65;
  audio.loop = durationMs === undefined;
  audio.play().catch((err) => {
    // Autoplay policy: kullanıcı interaction olmadan ses başlamayabilir.
    // Sessiz fail — InspectionPanel butonu zaten interaction tetikliyor.
    // eslint-disable-next-line no-console
    console.warn("[auscultationAudio] play failed:", err);
  });
  currentAudio = audio;

  if (durationMs !== undefined) {
    stopTimer = window.setTimeout(() => {
      stopAuscultation();
    }, durationMs);
  }
}

export function stopAuscultation(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
}

/** Şu an çalan ses ID'si (debug için). */
export function getCurrentSoundId(): string | null {
  if (!currentAudio) return null;
  const src = currentAudio.src;
  const match = src.match(/\/auscultation\/([^.]+)\.ogg/);
  return match ? match[1] : null;
}
