import type { Patient } from "@/engine";
import { User } from "lucide-react";

export function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-md bg-ink-700 flex items-center justify-center">
          <User className="w-5 h-5 text-ink-300" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
            Hasta
          </div>
          <div className="font-display text-lg text-ink-50 leading-tight">
            {patient.age} yaş, {patient.sex === "M" ? "Erkek" : "Kadın"}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
            Kilo
          </div>
          <div className="font-mono text-sm text-ink-100">
            {patient.weight_kg} kg
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-1">
            Ana Şikayet
          </div>
          <p className="text-sm text-ink-100 leading-relaxed">
            {patient.chief_complaint}
          </p>
        </div>

        {patient.history_items.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-1">
              Özgeçmiş
            </div>
            <ul className="text-sm text-ink-200 space-y-0.5">
              {patient.history_items.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ink-500">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {patient.allergies.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-clinical-critical mb-1">
              ⚠ Alerjiler
            </div>
            <p className="text-sm text-clinical-critical">
              {patient.allergies.join(", ")}
            </p>
          </div>
        )}

        {patient.current_medications && patient.current_medications.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-1">
              Kullandığı İlaçlar
            </div>
            <p className="text-sm text-ink-200">
              {patient.current_medications.join(" · ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
