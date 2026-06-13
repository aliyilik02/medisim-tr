/// <reference lib="webworker" />

// ============================================================
// whisper.worker.ts — tarayıcı içi Türkçe konuşma tanıma (STT)
// ============================================================
// `@huggingface/transformers` (transformers.js) ile Whisper modelini
// Web Worker içinde çalıştırır. Model ilk kullanımda tarayıcıya iner
// (~40MB whisper-tiny) ve IndexedDB'de cache'lenir.
//
// KVKK NOTU: Ses TAMAMEN cihazda (tarayıcıda) çözümlenir. Mikrofon
// kaydı hiçbir sunucuya GİTMEZ — sadece model dosyaları HF CDN'inden
// (tek seferlik) indirilir. Öğrenci sesi cihazdan çıkmaz.
//
// transformers.js ana bundle'ı şişirmesin diye DİNAMİK import edilir;
// üstelik ayrı bir worker thread'inde çalışır (UI bloklanmaz).
// ============================================================

// Worker'a gelen mesaj tipleri
type InMessage = {
  type: "transcribe";
  audio: Float32Array; // 16kHz mono PCM
};

// Worker'dan çıkan mesaj tipleri
type OutMessage =
  | { type: "ready" }
  | { type: "progress"; status: string; progress?: number; file?: string }
  | { type: "result"; text: string }
  | { type: "error"; error: string };

// Pipeline lazy-load — ilk transcribe çağrısında oluşur, sonra yeniden kullanılır.
// `any` kullanımı transformers.js dinamik importunun tip belirsizliği yüzünden;
// runtime davranışı net (ASR pipeline çağrısı).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asrPipeline: any = null;

async function getPipeline() {
  if (asrPipeline) return asrPipeline;

  // Dinamik import — worker'a yüklenir, ana bundle'a girmez.
  const { pipeline, env } = await import("@huggingface/transformers");

  // Tarayıcı içi: uzak modelleri (HF CDN) kullan, yerel model arama yapma.
  env.allowLocalModels = false;

  asrPipeline = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny",
    {
      progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
        const msg: OutMessage = {
          type: "progress",
          status: p?.status ?? "loading",
          progress: p?.progress,
          file: p?.file,
        };
        (self as unknown as Worker).postMessage(msg);
      },
    },
  );

  (self as unknown as Worker).postMessage({ type: "ready" } satisfies OutMessage);
  return asrPipeline;
}

self.addEventListener("message", async (event: MessageEvent<InMessage>) => {
  const data = event.data;
  if (!data || data.type !== "transcribe") return;

  try {
    const asr = await getPipeline();

    const output = await asr(data.audio, {
      language: "turkish",
      task: "transcribe",
      // Uzun cümleler için chunk + stride (kısa kayıtlarda da güvenli).
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const text = Array.isArray(output)
      ? output.map((o: { text?: string }) => o.text ?? "").join(" ")
      : (output?.text ?? "");

    const msg: OutMessage = { type: "result", text: String(text).trim() };
    (self as unknown as Worker).postMessage(msg);
  } catch (err) {
    const msg: OutMessage = {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(msg);
  }
});

export {};
