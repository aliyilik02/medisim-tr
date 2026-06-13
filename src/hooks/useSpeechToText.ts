import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// useSpeechToText — tarayıcı içi Türkçe mikrofon → metin (STT)
// ============================================================
// Akış:
//   1. getUserMedia({audio}) ile mikrofon izni + akış
//   2. MediaRecorder ile kaydet (start/stop)
//   3. Durunca: Blob → AudioContext.decodeAudioData → 16kHz mono Float32
//   4. whisper.worker'a yolla → metin geri döner → onText(text)
//
// KVKK NOTU: Ses verisi cihazdan ÇIKMAZ. Çözümleme whisper.worker
// içinde (transformers.js, tarayıcı) yapılır; sunucuya ses gönderilmez.
//
// SSR / desteklenmeyen tarayıcı: `supported` false → UI butonu gizler.
// ============================================================

interface UseSpeechToText {
  /** Mikrofon kaydı aktif mi? */
  recording: boolean;
  /** Worker model çalıştırıyor (çeviri sürüyor) mu? */
  transcribing: boolean;
  /** Son hata (kullanıcıya gösterilebilir kısa Türkçe mesaj). */
  error: string | null;
  /** Kayda başla (mikrofon izni ister). */
  start: () => Promise<void>;
  /** Kaydı durdur → çeviri tetiklenir. */
  stop: () => void;
  /** Tarayıcı mikrofon + worker destekliyor mu? */
  supported: boolean;
}

const TARGET_SAMPLE_RATE = 16000; // Whisper 16kHz bekler

function sttSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof Worker !== "undefined" &&
    (typeof window.AudioContext !== "undefined" ||
      typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !==
        "undefined")
  );
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/** AudioBuffer'ı 16kHz mono Float32'ye indirir (basit doğrusal yeniden örnekleme). */
function toMono16k(buffer: AudioBuffer): Float32Array {
  const srcRate = buffer.sampleRate;
  // Kanalları mono'ya karıştır
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }

  if (srcRate === TARGET_SAMPLE_RATE) return mono;

  // Doğrusal yeniden örnekleme → 16kHz
  const ratio = srcRate / TARGET_SAMPLE_RATE;
  const newLength = Math.round(length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, length - 1);
    const frac = idx - i0;
    result[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return result;
}

export function useSpeechToText(onText: (text: string) => void): UseSpeechToText {
  const supported = sttSupported();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Worker'ı lazy oluştur (ilk start'ta), mesaj dinleyicilerini bağla.
  const ensureWorker = useCallback((): Worker | null => {
    if (!supported) return null;
    if (workerRef.current) return workerRef.current;
    try {
      const worker = new Worker(
        new URL("../workers/whisper.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.addEventListener("message", (e: MessageEvent) => {
        const msg = e.data as
          | { type: "ready" }
          | { type: "progress"; status: string }
          | { type: "result"; text: string }
          | { type: "error"; error: string };
        if (msg.type === "result") {
          setTranscribing(false);
          const text = msg.text?.trim();
          if (text) {
            onTextRef.current(text);
          } else {
            setError("Ses anlaşılamadı, tekrar deneyin.");
          }
        } else if (msg.type === "error") {
          setTranscribing(false);
          setError("Çeviri başarısız oldu.");
          // eslint-disable-next-line no-console
          console.warn("[whisper]", msg.error);
        }
      });
      worker.addEventListener("error", (e) => {
        setTranscribing(false);
        setError("Konuşma tanıma yüklenemedi.");
        // eslint-disable-next-line no-console
        console.warn("[whisper] worker error", e.message);
      });
      workerRef.current = worker;
      return worker;
    } catch {
      setError("Konuşma tanıma desteklenmiyor.");
      return null;
    }
  }, [supported]);

  // Kayıt durunca: Blob → Float32 16kHz → worker
  const processAudio = useCallback(async (blob: Blob) => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      setError("Ses çözümleyici desteklenmiyor.");
      return;
    }
    const worker = ensureWorker();
    if (!worker) return;

    setTranscribing(true);
    setError(null);
    let ctx: AudioContext | null = null;
    try {
      const arrayBuffer = await blob.arrayBuffer();
      ctx = new Ctor();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const audio = toMono16k(audioBuffer);
      if (audio.length < TARGET_SAMPLE_RATE * 0.3) {
        // < ~0.3sn — çok kısa, anlamlı tanıma yapılamaz
        setTranscribing(false);
        setError("Kayıt çok kısa, biraz daha uzun konuşun.");
        return;
      }
      // Float32Array'i transfer ederek kopya maliyetini önle
      worker.postMessage({ type: "transcribe", audio }, [audio.buffer]);
    } catch {
      setTranscribing(false);
      setError("Ses çözümlenemedi.");
    } finally {
      ctx?.close().catch(() => {});
    }
  }, [ensureWorker]);

  const start = useCallback(async () => {
    if (!supported || recording || transcribing) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      });
      recorder.addEventListener("stop", () => {
        // Mikrofonu serbest bırak
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size > 0) {
          void processAudio(blob);
        }
      });

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      // Worker'ı arkada hazırlamaya başla (model indirme erken tetiklensin)
      ensureWorker();
    } catch (err) {
      setRecording(false);
      // İzin reddi vs.
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Mikrofon izni verilmedi.");
      } else {
        setError("Mikrofona erişilemedi.");
      }
    }
  }, [supported, recording, transcribing, processAudio, ensureWorker]);

  const stop = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
    recorderRef.current = null;
  }, [recording]);

  // Temizlik — unmount'ta worker'ı kapat, mikrofonu bırak.
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { recording, transcribing, error, start, stop, supported };
}
