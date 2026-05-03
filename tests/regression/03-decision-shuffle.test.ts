// ============================================================
// REGRESYON: commits 6c7b9f2 + b1308f0
// 6c7b9f2: "fix(ui): karar opsiyonlarını deterministic shuffle"
// b1308f0: "feat(ui): opsiyon shuffle seed'ine session.started_at ekle"
// ============================================================
// Bug: decision step opsiyonları senaryo yazıldığı sırada gösteriliyordu;
// 1. şık çoğu zaman doğru cevaptı → öğrenci ezberden hile yapabiliyordu.
// Fix: seededShuffle ile karıştır. b1308f0: her oynayışta farklı sıra için
// seed'e session.started_at eklendi.
// ============================================================

import { describe, expect, test } from "vitest";
import { seededShuffle } from "@/lib/shuffle";
import { getStep } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const hipoglisemi = getScenario("dahiliye-hipoglisemi-001");
if (!hipoglisemi) throw new Error("Hipoglisemi senaryosu bulunamadı");

describe("regresyon: deterministic shuffle (commit 6c7b9f2)", () => {
  test("aynı seed iki kez → tutarlı sıra", () => {
    const items = ["a", "b", "c", "d", "e"];
    const a = seededShuffle(items, "test-seed");
    const b = seededShuffle(items, "test-seed");
    expect(a).toEqual(b);
  });

  test("farklı seed → farklı sıra (yeterince büyük listede)", () => {
    const items = ["opt-a", "opt-b", "opt-c", "opt-d", "opt-e", "opt-f", "opt-g", "opt-h"];
    const a = seededShuffle(items, "seed-1");
    const b = seededShuffle(items, "seed-2");
    expect(a).not.toEqual(b);
  });
});

describe("regresyon: shuffle hipoglisemi step-3-takip (4 opsiyon)", () => {
  test("decision options shuffle sonrası içerik aynı, sıra değişiyor", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    if (step.kind !== "decision") throw new Error("decision step bekleniyordu");
    const original = step.options.map((o) => o.id);

    // Her oturum farklı seed (b1308f0): senaryo_id + step_id + session.started_at
    const seedV2 = `${hipoglisemi.id}-${step.id}-${1700000000000}`;
    const shuffled = seededShuffle(original, seedV2);

    // İçerik korunmuş
    expect([...shuffled].sort()).toEqual([...original].sort());
    // En azından bir seed için sıra orijinalden farklı olmalı —
    // birden fazla seed dene (4 elemanlı listede %4'lük şans)
    const seeds = ["s1", "s2", "s3", "s4", "s5"];
    const someDiffer = seeds.some(
      (s) => seededShuffle(original, s).join(",") !== original.join(",")
    );
    expect(someDiffer).toBe(true);
  });
});

describe("regresyon: session.started_at ile her oynayış farklı (commit b1308f0)", () => {
  test("session1 ve session2 zamanları farklıysa shuffle sonuçları da", () => {
    const items = ["A", "B", "C", "D", "E", "F"];
    const seed1 = `session-${1700000000000}`;
    const seed2 = `session-${1700000005000}`;
    const a = seededShuffle(items, seed1);
    const b = seededShuffle(items, seed2);
    // Genelde farklı olmalı (5 saniye sonra başka oturum)
    expect(a).not.toEqual(b);
  });
});
