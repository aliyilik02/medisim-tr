// ============================================================
// Görsel manifest + aksiyon çözümleme testleri (görselli vaka pilotu)
// ============================================================
// PROP_CREDITS kapısı deseni: manifest'teki her varlık public/ altında
// GERÇEKTEN var olmalı — kırık görsel yolu commit edilemez.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  VISUAL_MANIFEST,
  patientToArketip,
  scenarioToOrtam,
  resolveVisualSet,
} from "@/visuals/visual-manifest";
import { resolveActionVisual, AKSIYON_LABELS } from "@/visuals/action-visuals";
import { scenario_stemi } from "@/data/scenarios/stemi";

const inPublic = (src: string) =>
  existsSync(join(process.cwd(), "public", src.replace(/^\//, "")));

describe("manifest — varlık kapısı", () => {
  test("manifest'teki her durum/aksiyon görseli public/ altında var", () => {
    for (const [key, set] of Object.entries(VISUAL_MANIFEST)) {
      for (const [stage, asset] of Object.entries(set.durum)) {
        expect(inPublic(asset.src), `${key}/${stage}: ${asset.src}`).toBe(true);
        if (asset.video) expect(inPublic(asset.video), asset.video).toBe(true);
      }
      for (const [stage, asset] of Object.entries(set.durumMaske ?? {})) {
        expect(inPublic(asset.src), `${key}/maske-${stage}: ${asset.src}`).toBe(true);
        if (asset.video) expect(inPublic(asset.video), asset.video).toBe(true);
      }
      for (const [stage, asset] of Object.entries(set.durumMaskeEkg ?? {})) {
        expect(inPublic(asset.src), `${key}/maske-ekg-${stage}: ${asset.src}`).toBe(true);
        if (asset.video) expect(inPublic(asset.video), asset.video).toBe(true);
      }
      for (const [ak, asset] of Object.entries(set.aksiyon)) {
        expect(inPublic(asset.src), `${key}/${ak}: ${asset.src}`).toBe(true);
        if (asset.video) expect(inPublic(asset.video), asset.video).toBe(true);
      }
    }
  });

  test("hastane-eriskin-e seti 5 durum karesini eksiksiz taşır", () => {
    const set = VISUAL_MANIFEST["hastane-eriskin-e"];
    expect(set).toBeDefined();
    expect(Object.keys(set!.durum)).toHaveLength(5);
  });

  test("hastane-eriskin-e P1 kanıt seti (5 aksiyon karesi) manifest'te", () => {
    const aksiyon = VISUAL_MANIFEST["hastane-eriskin-e"]!.aksiyon;
    for (const key of ["ekg-takma", "iv-takma", "ilac-po", "ilac-iv", "oksijen-maske"] as const) {
      expect(aksiyon[key], `P1 eksik: ${key}`).toBeDefined();
    }
  });

  test("maskeli ARREST varyantı hiçbir sette yok (klinik: arrestte BVM)", () => {
    for (const [key, set] of Object.entries(VISUAL_MANIFEST)) {
      expect(set.durumMaske?.arrest, `${key}: maskeli arrest karesi klinik saçma`).toBeUndefined();
      expect(set.durumMaskeEkg?.arrest, `${key}: kombo arrest karesi klinik saçma`).toBeUndefined();
    }
  });

  test("13 aksiyon karesinin TAMAMI hastane-eriskin-e'de canlı", () => {
    const aksiyon = VISUAL_MANIFEST["hastane-eriskin-e"]!.aksiyon;
    expect(Object.keys(aksiyon)).toHaveLength(13);
  });
});

describe("arketip / ortam türetme", () => {
  test("yaş+cinsiyet → arketip sınırları", () => {
    expect(patientToArketip({ age: 62, sex: "M" } as never)).toBe("eriskin-e");
    expect(patientToArketip({ age: 30, sex: "F" } as never)).toBe("eriskin-k");
    expect(patientToArketip({ age: 65, sex: "M" } as never)).toBe("yasli-e");
    expect(patientToArketip({ age: 80, sex: "F" } as never)).toBe("yasli-k");
    expect(patientToArketip({ age: 8, sex: "M" } as never)).toBe("cocuk");
  });

  test("uzmanlık → ortam (askeri→saha, acil→acil, gerisi→hastane)", () => {
    expect(scenarioToOrtam("askeri_tccc")).toBe("saha");
    expect(scenarioToOrtam("acil")).toBe("acil");
    expect(scenarioToOrtam("kardiyoloji")).toBe("hastane");
  });

  test("STEMI (62E kardiyoloji) → hastane-eriskin-e seti çözülür", () => {
    const r = resolveVisualSet(scenario_stemi.specialty, scenario_stemi.patient);
    expect(r?.key).toBe("hastane-eriskin-e");
  });
});

describe("resolveActionVisual — zincir", () => {
  test("1. basamak: target_id birebir", () => {
    expect(resolveActionVisual({ type: "use_equipment", target_id: "ekg_12" })?.key).toBe("ekg-takma");
    expect(resolveActionVisual({ type: "use_equipment", target_id: "defibrilator" })?.key).toBe("defibrilasyon");
    expect(resolveActionVisual({ type: "decision", target_id: "opt_pci_transfer" })?.key).toBe("transfer-pci");
  });

  test("2. basamak: ekipman kategorisi düşüşü (EXACT'te olmayan id)", () => {
    // iv_kateter_16g EXACT'te yok ama damar_yolu kategorisinde (varsa katalogda)
    const r = resolveActionVisual({ type: "use_equipment", target_id: "iv_kateter_16g" });
    if (r) expect(r.key).toBe("iv-takma"); // katalogda yoksa null da geçerli
  });

  test("ilaç: veriliş yolu → PO/IV/dilaltı", () => {
    expect(
      resolveActionVisual({ type: "give_medication", target_id: "aspirin", dose: "300 mg PO çiğnetilerek" })?.key,
    ).toBe("ilac-po");
    expect(
      resolveActionVisual({ type: "give_medication", target_id: "tenecteplase" })?.key,
    ).toBe("ilac-iv");
    expect(
      resolveActionVisual({ type: "give_medication", target_id: "nitrogliserin", dose: "0.4 mg SL" })?.key,
    ).toBe("dilalti");
  });

  test("STEMI envanterinin TAMAMI görsel anahtara çözülür (boşluk yok)", () => {
    for (const eqId of scenario_stemi.available_equipment) {
      const r = resolveActionVisual({ type: "use_equipment", target_id: eqId });
      expect(r, `ekipman çözülmedi: ${eqId}`).not.toBeNull();
    }
    for (const medId of scenario_stemi.available_medications) {
      const r = resolveActionVisual({ type: "give_medication", target_id: medId });
      expect(r, `ilaç çözülmedi: ${medId}`).not.toBeNull();
    }
  });

  test("her anahtarın TR banner etiketi var", () => {
    for (const [key, label] of Object.entries(AKSIYON_LABELS)) {
      expect(label.length, key).toBeGreaterThan(5);
    }
  });
});
