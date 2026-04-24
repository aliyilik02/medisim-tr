import type { Scenario } from "@/engine";
import { scenario_stemi } from "./stemi";
import { scenario_anaflaksi } from "./anaflaksi";
import { scenario_dka } from "./dka";
import { scenario_pediatrik_sepsis } from "./pediatrik-sepsis";
import { scenario_hipoglisemi } from "./hipoglisemi";
import { getLocalScenario } from "@/storage/scenarioStorage";

export const SCENARIOS: Scenario[] = [
  scenario_stemi,
  scenario_anaflaksi,
  scenario_dka,
  scenario_pediatrik_sepsis,
  scenario_hipoglisemi,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id) ?? getLocalScenario(id);
}

export function getScenariosBySpecialty(specialty: string): Scenario[] {
  return SCENARIOS.filter((s) => s.specialty === specialty);
}
