import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// useTextToSpeech — Türkçe seslendirme (Sprint B.2 ses + HD yol 6 Tem)
// ============================================================
// İKİ YOL:
// 1) VARSAYILAN (ücretsiz): Web Speech API (`window.speechSynthesis`) —
//    API ANAHTARI GEREKMEZ, tamamen tarayıcıda. KVKK: metin cihazda kalır.
// 2) OPSİYONEL HD (Gemini Flash TTS): localStorage `medisim_tts_hd`="1"
//    iken backend /api/tts denenir (backend bayrağı da açık olmalı —
//    GEMINI_TTS_ENABLED). HERHANGİ bir hatada (501 kapalı, 429 free-tier
//    limiti, ağ) otomatik tarayıcı sesine düşer → ses asla kesilmez,
//    maliyet asla zorunlu olmaz (Ali Bey: "şimdilik ücretsiz").
//    KVKK NOTU: HD yol hasta YANITI metnini (sentetik içerik) sunucuya
//    gönderir; öğrenci sesi/mikrofonu her zaman tarayıcıda kalır (Whisper).
// ============================================================

export const TTS_HD_KEY = "medisim_tts_hd";

interface UseTextToSpeech {
  /** Verilen metni Türkçe sesle okur (önceki konuşmayı iptal eder). */
  speak: (text: string) => void;
  /** Aktif konuşmayı iptal eder. */
  cancel: () => void;
  /** Şu an konuşuyor mu? */
  speaking: boolean;
  /** Tarayıcı speechSynthesis destekliyor mu? */
  supported: boolean;
  /** HD (Gemini) sesi tercih ediliyor mu — toggle durumu. */
  hdEnabled: boolean;
  /** HD tercihini değiştir (localStorage'a yazar). */
  setHdEnabled: (on: boolean) => void;
}

function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function readHdPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TTS_HD_KEY) === "1";
  } catch {
    return false;
  }
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

/** base64 PCM s16le mono → AudioBuffer (HD yol çözücüsü). */
export function pcm16ToAudioBuffer(
  ctx: AudioContext,
  base64: string,
  sampleRate: number,
): AudioBuffer {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
  return buffer;
}

export function useTextToSpeech(): UseTextToSpeech {
  const supported = ttsSupported();
  const [speaking, setSpeaking] = useState(false);
  const [hdEnabled, setHdState] = useState<boolean>(readHdPref);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // speak çağrıları arasında yarış: yalnız SON isteğin sesi çalınır.
  const reqSeqRef = useRef(0);

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
      try {
        sourceRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const setHdEnabled = useCallback((on: boolean) => {
    setHdState(on);
    try {
      window.localStorage.setItem(TTS_HD_KEY, on ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const stopAll = useCallback(() => {
    if (ttsSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore
    }
    sourceRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    reqSeqRef.current++;
    stopAll();
    setSpeaking(false);
  }, [stopAll]);

  /** Ücretsiz yol — tarayıcı speechSynthesis. */
  const browserSpeak = useCallback(
    (trimmed: string) => {
      if (!supported) return;
      try {
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

  /** HD yol — backend /api/tts (Gemini). Başarısızsa tarayıcıya düşer. */
  const hdSpeak = useCallback(
    async (trimmed: string, seq: number) => {
      try {
        const base = import.meta.env.VITE_BACKEND_URL as string | undefined;
        if (!base) throw new Error("backend yok");
        const res = await fetch(`${base}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const data = (await res.json()) as { audio: string; sample_rate: number };
        if (seq !== reqSeqRef.current) return; // bu arada yeni istek geldi
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        const buffer = pcm16ToAudioBuffer(ctx, data.audio, data.sample_rate || 24000);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.onended = () => {
          if (seq === reqSeqRef.current) setSpeaking(false);
        };
        sourceRef.current = src;
        setSpeaking(true);
        src.start();
      } catch {
        // 501 (bayrak kapalı) / 429 (free-tier limit) / ağ → ücretsiz yola düş.
        if (seq === reqSeqRef.current) browserSpeak(trimmed);
      }
    },
    [browserSpeak],
  );

  const speak = useCallback(
    (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const seq = ++reqSeqRef.current;
      stopAll();
      if (hdEnabled) {
        void hdSpeak(trimmed, seq);
      } else {
        browserSpeak(trimmed);
      }
    },
    [hdEnabled, hdSpeak, browserSpeak, stopAll],
  );

  return { speak, cancel, speaking, supported, hdEnabled, setHdEnabled };
}
