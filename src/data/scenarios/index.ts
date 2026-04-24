import type { Scenario } from "@/engine";
import { scenario_stemi } from "./stemi";
import { scenario_anaflaksi } from "./anaflaksi";
import { scenario_dka } from "./dka";
import { scenario_pediatrik_sepsis } from "./pediatrik-sepsis";
import { scenario_hipoglisemi } from "./hipoglisemi";
import { scenario_iskemik_inme } from "./iskemik-inme";
import { scenario_bronsiyolit } from "./bronsiyolit";
import { scenario_kardiyojenik_sok } from "./kardiyojenik-sok";

export const SCENARIOS: Scenario[] = [
  scenario_stemi,
  scenario_anaflaksi,
  scenario_dka,
  scenario_pediatrik_sepsis,
  scenario_hipoglisemi,
  scenario_iskemik_inme,
  scenario_bronsiyolit,
  scenario_kardiyojenik_sok,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenariosBySpecialty(specialty: string): Scenario[] {
  return SCENARIOS.filter((s) => s.specialty === specialty);
}
