import { describe, expect, test } from "vitest";
import { seededShuffle } from "@/lib/shuffle";

describe("seededShuffle — determinism", () => {
  test("aynı seed → aynı sıra", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const a = seededShuffle(items, "seed-x");
    const b = seededShuffle(items, "seed-x");
    expect(a).toEqual(b);
  });

  test("farklı seed → farklı sıra (yeterince büyük listede)", () => {
    const items = Array.from({ length: 12 }, (_, i) => `item-${i}`);
    const a = seededShuffle(items, "seed-1");
    const b = seededShuffle(items, "seed-2");
    expect(a).not.toEqual(b);
  });
});

describe("seededShuffle — integrity", () => {
  test("orijinal dizi mutasyona uğramaz", () => {
    const items = ["a", "b", "c"];
    const snapshot = [...items];
    seededShuffle(items, "seed");
    expect(items).toEqual(snapshot);
  });

  test("uzunluk korunur, eleman seti aynı kalır", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const out = seededShuffle(items, "k");
    expect(out).toHaveLength(items.length);
    expect([...out].sort()).toEqual([...items].sort());
  });
});

describe("seededShuffle — edge cases", () => {
  test("boş dizi", () => {
    expect(seededShuffle<number>([], "seed")).toEqual([]);
  });

  test("tek eleman", () => {
    expect(seededShuffle(["solo"], "seed")).toEqual(["solo"]);
  });

  test("iki eleman — bazen swap, her zaman aynı içerik", () => {
    const out = seededShuffle(["a", "b"], "seed-z");
    expect([...out].sort()).toEqual(["a", "b"]);
    expect(out).toHaveLength(2);
  });

  test("seed boş string olsa bile çalışır (rng |1 fallback)", () => {
    expect(() => seededShuffle([1, 2, 3], "")).not.toThrow();
  });
});

describe("seededShuffle — generic tip korunur", () => {
  test("obje dizisinde alan referansları aynı kalır", () => {
    const a = { id: "a", n: 1 };
    const b = { id: "b", n: 2 };
    const c = { id: "c", n: 3 };
    const out = seededShuffle([a, b, c], "seed");
    expect(out).toContain(a);
    expect(out).toContain(b);
    expect(out).toContain(c);
  });
});
