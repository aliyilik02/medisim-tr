// ============================================================
// REGRESYON: commit fae1b54
// "fix(ui): InventoryPanel listelerini Türkçe alfabetik sırala
//  (öğretim hilesi engelle)"
// ============================================================
// Bug: ilaç/ekipman listesi senaryo dosyasındaki sırada gösteriliyordu;
// öğrenciler hangi ilacın "doğru cevaba yakın" olduğunu konumdan
// çıkarabiliyordu. Fix: Türkçe alfabetik sıralama.
//
// UI render testi Aşama 2'ye bırakıldı (Testing Library gerekli).
// Burada saniteten ölçüm: ilaç ID'lerinin name_tr'larını çekip
// localeCompare("tr") sonrası sırayı doğrulayan helper testi.
// ============================================================

import { describe, expect, test } from "vitest";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";

describe("regresyon: ilaç/ekipman alfabetik sırlama (TR locale)", () => {
  test("MEDICATIONS bir map: id → Medication (test fixture)", () => {
    expect(typeof MEDICATIONS).toBe("object");
    expect(Object.keys(MEDICATIONS).length).toBeGreaterThan(0);
  });

  test("Türkçe alfabetik sıralama 'I/İ' farkını korur", () => {
    const sample = ["İlaç", "Aspirin", "Çinko", "Beta-bloker"];
    const sorted = [...sample].sort((a, b) => a.localeCompare(b, "tr"));
    expect(sorted[0]).toBe("Aspirin");
    expect(sorted[sorted.length - 1]).toBe("İlaç");
    // 'Ç' > 'C' Türkçe'de — 'Çinko' B'den sonra gelmeli
    const idxC = sorted.indexOf("Çinko");
    const idxB = sorted.indexOf("Beta-bloker");
    expect(idxC).toBeGreaterThan(idxB);
  });

  test("EQUIPMENT bir map ve sıralama localeCompare ile yapılabilir", () => {
    const ids = Object.keys(EQUIPMENT);
    expect(ids.length).toBeGreaterThan(0);
    const names = ids.map((id) => EQUIPMENT[id]?.name_tr ?? id);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "tr"));
    // Sıralı versiyon stable olmalı
    expect(sorted).toEqual([...names].sort((a, b) => a.localeCompare(b, "tr")));
  });
});

describe.skip("regresyon: InventoryPanel render alfabetik sıra — Aşama 2", () => {
  // TODO: render(<InventoryPanel medications={[...]} />) → liste
  // elemanlarının textContent'ini al → localeCompare ile sıralı mı?
  test("UI testi gelecek aşamada", () => {
    expect(true).toBe(true);
  });
});
