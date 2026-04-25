import type { StoredScenario } from "@/storage/scenarioStorage";
import { draftToScenario } from "./toTypeScript";

export function toJson(draft: Partial<StoredScenario>): string {
  return JSON.stringify(draftToScenario(draft), null, 2);
}
