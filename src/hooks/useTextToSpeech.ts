import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// useTextToSpeech — tarayıcı içi Türkçe seslendirme (Sprint B.2 ses)
// ============================================================
// Web Speech API (`window.speechSynthesis`) kullanır — Azure/API ANAHTARI
// GEREKMEZ, tamamen tarayıcıda çalışır. Hasta yanıtlarını gerçek sesle
// okur. SSR / desteklenmeyen tarayıcılarda graceful degrade: `supported`
// false döner, `speak` no-op olur.
//
// KVKK NOTU: Metin sentezi cihazda yapılır; hiçbir veri sunucuya gitmez.
// ============================================================

interface UseTextToSpeech {
  /** Verilen metni Türkçe sesle okur (önceki konuşmayı iptal eder). */
  speak: (text: string) => void;
  /** Aktif konuşmayı iptal eder. */
  cancel: () => void;
  /** Şu an konuşuyor mu? */
  speaking: boolean;
  /** Tarayıcı speechSynthesis destekliyor mu? */
  supported: boolean;
}

function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** getVoices() bazı tarayıcılarda asenkron dolar; `voiceschanged` ile yakalanır. */
function pickTurkishVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Türkçe sesi tercih et; yoksa null → utterance.lang yine 'tr-TR' kalır,
  // tarayıcı default sesi en yakın eşleşmeyi seçer.
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("tr")) ??
    voices.find((v) => v.lang?.toLowerCase().includes("tr")) ??
    null
  );
}

export function useTextToSpeech(): UseTextToSpeech {
  const supported = ttsSupported();
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Sesleri yükle (asenkron dolabilir) ve `voiceschanged` ile güncelle.
  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      voiceRef.current = pickTurkishVoice();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  // Unmount'ta aktif konuşmayı durdur (sayfa değişince ses takılı kalmasın).
  useEffect(() => {
    return () => {
      if (ttsSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const trimmed = text?.trim();
      if (!trimmed) return;
      try {
        // Önceki konuşmayı iptal et — üst üste binmesin.
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(trimmed);
        utter.lang = "tr-TR";
        utter.rate = 1.0;
        utter.pitch = 1.0;
        if (voiceRef.current) utter.voice = voiceRef.current;

        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);

        window.speechSynthesis.speak(utter);
      } catch {
        setSpeaking(false);
      }
    },
    [supported],
  );

  return { speak, cancel, speaking, supported };
}
