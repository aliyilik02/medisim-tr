import { Trophy } from "lucide-react";

export function Step4Scoring() {
  return (
    <div className="panel p-16 text-center animate-fade-in">
      <Trophy className="w-10 h-10 text-ink-600 mx-auto mb-4" />
      <div className="font-display text-2xl text-ink-300 mb-2">
        Puanlama & Debrief
      </div>
      <p className="text-ink-500 text-sm max-w-sm mx-auto">
        Bu adım Sohbet 3'te hazır olacak.
        Geçme notu, harf bandları ve anahtar öğrenim çıktıları burada tanımlanacak.
      </p>
    </div>
  );
}
