import type { Scenario, LabPanel, LabTimelineEntry } from "./types";

// Verilen panel_id ve currentMinute için doğru lab snapshot'ını döndürür.
// Öncelik: lab_timeline (en güncel geçmiş entry) → lab_panels (initial)
export function resolveLabPanel(
  scenario: Scenario,
  panelId: string,
  currentMinute: number
): LabPanel | null {
  const timeline = scenario.lab_timeline;

  if (timeline && timeline.length > 0) {
    // Panel için geçmişteki (at_minute <= currentMinute) en son entry'yi bul
    const applicable = timeline
      .filter((e): e is LabTimelineEntry & { results: NonNullable<LabTimelineEntry["results"]> } =>
        e.panel_id === panelId && e.at_minute <= currentMinute
      )
      .sort((a, b) => b.at_minute - a.at_minute);

    if (applicable.length > 0) {
      const entry = applicable[0];
      return {
        id: panelId,
        name_tr: scenario.lab_panels?.[panelId]?.name_tr ?? panelId,
        collected_at_min: entry.at_minute,
        results: entry.results,
      };
    }
  }

  // Timeline'da uygun entry yoksa initial lab_panels'e bak
  return scenario.lab_panels?.[panelId] ?? null;
}

// Panel için sıralı tüm geçmiş snapshot'ları döndürür (trend gösterimi için)
export function getLabHistory(
  scenario: Scenario,
  panelId: string,
  uptoMinute: number
): LabPanel[] {
  const history: LabPanel[] = [];

  // İlk değer (initial)
  const initial = scenario.lab_panels?.[panelId];
  if (initial) {
    history.push({ ...initial, collected_at_min: 0 });
  }

  // Timeline'daki geçmiş snapshot'lar
  const entries = (scenario.lab_timeline ?? [])
    .filter((e) => e.panel_id === panelId && e.at_minute <= uptoMinute)
    .sort((a, b) => a.at_minute - b.at_minute);

  for (const entry of entries) {
    history.push({
      id: panelId,
      name_tr: scenario.lab_panels?.[panelId]?.name_tr ?? panelId,
      collected_at_min: entry.at_minute,
      results: entry.results,
    });
  }

  return history;
}

// Bir tetkikin sonuç gecikmesini döndürür (saniye cinsinden)
export function getResultDelaySec(scenario: Scenario, panelId: string): number {
  return scenario.result_delay_seconds?.[panelId] ?? 5;
}
