import { ListOrdered } from "lucide-react";

export function Step3Steps() {
  return (
    <div className="panel p-16 text-center animate-fade-in">
      <ListOrdered className="w-10 h-10 text-ink-600 mx-auto mb-4" />
      <div className="font-display text-2xl text-ink-300 mb-2">
        Vaka Adımları
      </div>
      <p className="text-ink-500 text-sm max-w-sm mx-auto">
        Bu adım Sohbet 2'de hazır olacak.
        Aksiyon, karar ve bilgi adımları akışı burada kurulacak.
      </p>
    </div>
  );
}
