// ============================================================
// ExamDebrief — sonuç ekranında fizik muayene özeti (CEZASIZ)
// ============================================================
// ABCDE basamağı başına kaç noktaya bakıldı + hangi patolojik bulgular
// yakalandı + hiç bakılmayan noktalar. Puana ETKİSİ YOK — öğretici.
// ============================================================

import { Stethoscope, Check, AlertTriangle } from "lucide-react";
import { ABCDE_LABEL, examCoverage, type Scenario, type SessionState } from "@/engine";
import { getScenarioExam } from "@/data/exam";
import { cn } from "@/lib/cn";

export function ExamDebrief({ scenario, session }: { scenario: Scenario; session: SessionState }) {
  const exam = getScenarioExam(scenario.id);
  if (!exam) return null;
  const log = session.exam_log ?? [];
  const examinedIds = new Set(log.map((e) => e.point_id));
  const rows = examCoverage(exam, examinedIds);
  const total = exam.points.length;
  const abnormalIds = new Set(log.filter((e) => e.abnormal).map((e) => e.point_id));
  const caught = exam.points.filter((p) => abnormalIds.has(p.id));
  const missed = exam.points.filter((p) => !examinedIds.has(p.id));

  return (
    <div className="panel p-6 border border-brand/30 bg-brand/[0.03]" data-testid="exam-debrief">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-4 h-4 text-brand-light" />
        <h2 className="font-display text-lg">Fizik Muayene</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
          {examinedIds.size}/{total} nokta · puana etkisi yok
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {rows.map((r) => {
          const complete = r.total > 0 && r.done >= r.total;
          return (
            <div
              key={r.category}
              data-testid={`exam-debrief-${r.category}`}
              className={cn(
                "panel-inset p-3 text-center",
                complete && "border-brand/50",
                r.done === 0 && "opacity-60",
              )}
            >
              <div className="font-display text-2xl leading-none">{r.category}</div>
              <div className="text-[10px] text-ink-400 mt-1">{ABCDE_LABEL[r.category]}</div>
              <div
                className={cn(
                  "font-mono text-xs tabular-nums mt-1 flex items-center justify-center gap-1",
                  complete ? "text-brand-light" : "text-ink-300",
                )}
              >
                {complete && <Check className="w-3 h-3" strokeWidth={3} />}
                {r.done}/{r.total}
              </div>
            </div>
          );
        })}
      </div>

      {caught.length > 0 && (
        <div className="text-[13px] text-ink-100 mb-2">
          <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-clinical-warning" />
          <span className="text-ink-400">Yakaladığın patolojik bulgular: </span>
          {caught.map((p) => p.label).join(", ")}
        </div>
      )}
      {missed.length > 0 && (
        <div className="text-[13px] text-ink-300">
          <span className="text-ink-400">Bakmadığın noktalar: </span>
          {missed.map((p) => p.label).join(", ")}
        </div>
      )}
      {log.length === 0 && (
        <p className="text-[13px] text-ink-300">
          Bu oturumda hastayı muayene etmedin. Bedendeki noktalara dokunarak ABCDE sırasıyla bakabilirsin.
        </p>
      )}
    </div>
  );
}
