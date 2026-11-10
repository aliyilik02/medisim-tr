// Senaryo id → fizik muayene verisi. Kaydı olmayan senaryoda muayene katmanı
// kapalıdır (oynama ekranı eski oskültasyon paneline düşer).
import type { ScenarioExam } from "@/engine";
import { STEMI_EXAM } from "./stemi-exam";

export const SCENARIO_EXAMS: ScenarioExam[] = [STEMI_EXAM];

export function getScenarioExam(scenarioId: string): ScenarioExam | undefined {
  return SCENARIO_EXAMS.find((e) => e.scenario_id === scenarioId);
}
