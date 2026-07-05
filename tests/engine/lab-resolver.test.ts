// ============================================================
// Lab resolver — panel snapshot zaman çizelgesi + gecikme (saf)
// ============================================================

import { describe, expect, test } from "vitest";
import {
  resolveLabPanel,
  getLabHistory,
  getResultDelaySec,
  getEffectiveDelaySec,
} from "@/engine";
import type { Scenario, LabPanel, LabTimelineEntry, LabValue } from "@/engine";

// ── Sentetik fixture'lar ──

function hgb(value: number): LabValue[] {
  return [{ parameter: "Hgb", value, unit: "g/dL", reference_range: "12-16" }];
}

const initialCbc: LabPanel = {
  id: "tam_kan_sayimi",
  name_tr: "Tam Kan Sayımı",
  results: hgb(13.5),
};

const timeline: LabTimelineEntry[] = [
  // Bilinçli KARIŞIK sırada — resolver sıralamayı kendisi yapmalı
  { at_minute: 20, panel_id: "tam_kan_sayimi", results: hgb(9.0) },
  { at_minute: 10, panel_id: "tam_kan_sayimi", results: hgb(11.2) },
  { at_minute: 15, panel_id: "troponin", results: [{ parameter: "hs-cTnT", value: 350, unit: "ng/L" }] },
];

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test-lab-001",
    version: "1",
    title: "Lab Testi",
    description: "d",
    specialty: "dahiliye",
    tags: [],
    difficulty: 3,
    estimated_minutes: 10,
    modes: ["quiz"],
    language: "tr",
    last_updated: "2026-07-05",
    patient: { age: 40, sex: "M", weight_kg: 70 } as Scenario["patient"],
    initial_vitals: {} as Scenario["initial_vitals"],
    available_medications: [],
    available_equipment: [],
    steps: [],
    start_step_id: "s1",
    scoring: {} as Scenario["scoring"],
    debrief: { key_learnings: [], references: [] } as unknown as Scenario["debrief"],
    lab_panels: { tam_kan_sayimi: initialCbc },
    lab_timeline: timeline,
    result_delay_seconds: { tam_kan_sayimi: 300 },
    ...overrides,
  };
}

// ── resolveLabPanel ──

describe("resolveLabPanel — zaman çizelgesi", () => {
  test("timeline entry dolmadan (at_minute > currentMinute) initial panel döner", () => {
    const p = resolveLabPanel(makeScenario(), "tam_kan_sayimi", 5);
    expect(p).not.toBeNull();
    expect(p!.results[0].value).toBe(13.5); // hâlâ initial
  });

  test("at_minute tam currentMinute'a eşitse entry GEÇERLİ sayılır (<=)", () => {
    const p = resolveLabPanel(makeScenario(), "tam_kan_sayimi", 10);
    expect(p!.results[0].value).toBe(11.2);
    expect(p!.collected_at_min).toBe(10);
  });

  test("birden fazla geçmiş entry → EN GÜNCEL olanı döner (karışık sıraya rağmen)", () => {
    const p = resolveLabPanel(makeScenario(), "tam_kan_sayimi", 60);
    expect(p!.results[0].value).toBe(9.0);
    expect(p!.collected_at_min).toBe(20);
  });

  test("başka panelin entry'leri karışmaz (panel_id filtresi)", () => {
    // troponin entry'si (15 dk) tam_kan_sayimi çözümünü etkilemez
    const p = resolveLabPanel(makeScenario(), "tam_kan_sayimi", 16);
    expect(p!.results[0].value).toBe(11.2); // 10 dk entry'si, troponin değil
  });

  test("lab_panels'te olmayan panel timeline'dan çözülür — name_tr panelId'ye düşer", () => {
    const p = resolveLabPanel(makeScenario(), "troponin", 30);
    expect(p).not.toBeNull();
    expect(p!.name_tr).toBe("troponin"); // initial panel yok → id fallback
    expect(p!.results[0].value).toBe(350);
  });

  test("ne timeline ne initial panel varsa → null", () => {
    expect(resolveLabPanel(makeScenario(), "bilinmeyen_panel", 60)).toBeNull();
    // troponin'in initial'ı yok, timeline entry'si 15 dk'da → 5 dk'da null
    expect(resolveLabPanel(makeScenario(), "troponin", 5)).toBeNull();
  });

  test("timeline hiç yoksa initial lab_panels döner", () => {
    const sc = makeScenario({ lab_timeline: undefined });
    expect(resolveLabPanel(sc, "tam_kan_sayimi", 60)!.results[0].value).toBe(13.5);
  });
});

// ── getLabHistory ──

describe("getLabHistory — trend", () => {
  test("initial (0 dk) + geçmiş entry'ler ARTAN zaman sırasıyla döner", () => {
    const h = getLabHistory(makeScenario(), "tam_kan_sayimi", 60);
    expect(h).toHaveLength(3);
    expect(h.map((p) => p.collected_at_min)).toEqual([0, 10, 20]);
    expect(h.map((p) => p.results[0].value)).toEqual([13.5, 11.2, 9.0]); // düşen Hgb trendi
  });

  test("uptoMinute gelecekteki entry'leri keser", () => {
    const h = getLabHistory(makeScenario(), "tam_kan_sayimi", 12);
    expect(h.map((p) => p.collected_at_min)).toEqual([0, 10]);
  });

  test("initial paneli olmayan panel → sadece timeline snapshot'ları", () => {
    const h = getLabHistory(makeScenario(), "troponin", 60);
    expect(h).toHaveLength(1);
    expect(h[0].collected_at_min).toBe(15);
  });

  test("hiç veri yoksa boş dizi", () => {
    expect(getLabHistory(makeScenario(), "bilinmeyen_panel", 60)).toEqual([]);
  });
});

// ── getResultDelaySec / getEffectiveDelaySec ──

describe("sonuç gecikmesi", () => {
  test("tanımlı gecikme döner, tanımsızda varsayılan 5 sn", () => {
    const sc = makeScenario();
    expect(getResultDelaySec(sc, "tam_kan_sayimi")).toBe(300);
    expect(getResultDelaySec(sc, "troponin")).toBe(5);
  });

  test("result_delay_seconds alanı hiç yoksa da 5 sn", () => {
    const sc = makeScenario({ result_delay_seconds: undefined });
    expect(getResultDelaySec(sc, "tam_kan_sayimi")).toBe(5);
  });

  test("sinav modunda gerçek gecikme, diğer modlarda sabit 5 sn", () => {
    const sc = makeScenario();
    expect(getEffectiveDelaySec(sc, "tam_kan_sayimi", "sinav")).toBe(300);
    expect(getEffectiveDelaySec(sc, "tam_kan_sayimi", "egitim")).toBe(5);
    expect(getEffectiveDelaySec(sc, "tam_kan_sayimi", "klinik")).toBe(5);
    expect(getEffectiveDelaySec(sc, "tam_kan_sayimi")).toBe(5); // mode verilmezse
  });
});
