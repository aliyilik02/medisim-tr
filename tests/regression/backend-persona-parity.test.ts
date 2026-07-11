// ============================================================
// Backend persona kataloğu drift bekçisi (11 Tem güvenlik paketi)
// ============================================================
// /api/chat persona'yı İSTEMCİDEN ALMAZ — scenario_id ile
// backend/src/generated/personas.ts kataloğundan seçer (prompt
// injection kapanışı). Katalog build-time üretilir; senaryo eklenince
// veya personaBuilder değişince yenilenmezse hasta YANLIŞ/ESKİ persona
// ile konuşur ya da yeni senaryoda 400 unknown_scenario döner.
// Bu test o drift'i yakalar. Düzeltme: npm run gen:personas
// ============================================================

import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/data/scenarios";
import { buildPatientPersona } from "@/components/dialog/personaBuilder";
import { SCENARIO_PERSONAS } from "../../backend/src/generated/personas";

describe("backend persona kataloğu ↔ senaryo paritesi", () => {
  it("her senaryonun katalogda persona'sı var", () => {
    const missing = SCENARIOS.filter((s) => !SCENARIO_PERSONAS[s.id]).map((s) => s.id);
    expect(missing, `Katalogda eksik senaryo(lar): ${missing.join(", ")} — npm run gen:personas çalıştır`).toEqual([]);
  });

  it("katalogda hayalet senaryo yok (silinen senaryo persona'sı kalmamış)", () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    const ghosts = Object.keys(SCENARIO_PERSONAS).filter((id) => !ids.has(id));
    expect(ghosts, `Katalogda artık var olmayan senaryo(lar): ${ghosts.join(", ")} — npm run gen:personas çalıştır`).toEqual([]);
  });

  it("katalog metni güncel (personaBuilder çıktısıyla birebir)", () => {
    for (const s of SCENARIOS) {
      expect(
        SCENARIO_PERSONAS[s.id],
        `"${s.id}" persona'sı bayat — npm run gen:personas çalıştır`,
      ).toBe(buildPatientPersona(s));
    }
  });
});
