import { Eye } from "lucide-react";

export function Step5Preview() {
  return (
    <div className="panel p-16 text-center animate-fade-in">
      <Eye className="w-10 h-10 text-ink-600 mx-auto mb-4" />
      <div className="font-display text-2xl text-ink-300 mb-2">
        Önizleme & Dışa Aktar
      </div>
      <p className="text-ink-500 text-sm max-w-sm mx-auto">
        Bu adım Sohbet 3'te hazır olacak.
        Test oyna, JSON export/import ve paylaşım seçenekleri burada olacak.
      </p>
    </div>
  );
}
