import type { Scenario } from "@/engine";
import { scenario_stemi } from "./stemi";
import { scenario_anaflaksi } from "./anaflaksi";
import { scenario_dka } from "./dka";
import { scenario_pediatrik_sepsis } from "./pediatrik-sepsis";

export const SCENARIOS: Scenario[] = [
  scenario_stemi,
  scenario_anaflaksi,
  scenario_dka,
  scenario_pediatrik_sepsis,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenariosBySpecialty(specialty: string): Scenario[] {
  return SCENARIOS.filter((s) => s.specialty === specialty);
}
