// ============================================================
// Oskültasyon Ses Servisi — Sprint B.4.7
// ============================================================
// Web Audio API üzerinden tek bir aktif oskültasyon sesi çalar.
// Birden çok prosedür tetiklerse önceki ses durdurulur, yenisi başlar.
//
// Ses dosyaları: public/sounds/auscultation/*.ogg
// Atıf: public/sounds/auscultation/SOUNDS-LICENSE.md
// ============================================================

let currentAudio: HTMLAudioElement | null = null;
let stopTimer: number | null = null;

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
