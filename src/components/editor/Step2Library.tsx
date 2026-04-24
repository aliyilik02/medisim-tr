import { BookOpen } from "lucide-react";

export function Step2Library() {
  return (
    <div className="panel p-16 text-center animate-fade-in">
      <BookOpen className="w-10 h-10 text-ink-600 mx-auto mb-4" />
      <div className="font-display text-2xl text-ink-300 mb-2">
        İlaç & Ekipman Kütüphanesi
      </div>
      <p className="text-ink-500 text-sm max-w-sm mx-auto">
        Bu adım Sohbet 2'de hazır olacak.
        Senaryo için kullanılacak ilaçlar ve ekipman burada seçilecek.
      </p>
    </div>
  );
}
