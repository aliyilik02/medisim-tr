/* =========================================================================
   ecg-morphology.test.ts — ECGSYN (McSharry 2003) sinüs morfolojisi testleri.

   Kontrol eder:
     1) ECG_SINUS_CYCLE tablo uzunluğu/içerik sağlığı.
     2) R-tepe ≈ +1 ve faz konvansiyonuyla (u≈0.252) hizalı.
     3) P–QRS–T fizyolojik sıralaması (P önce, S çukuru sonra, T en sonda).
     4) sampleECG("sinus") tablo morfolojisini kullanıyor (sabit/monoton değil,
        gerçekçi P-QRS-T salınımı).
     5) Diğer ritimler (vtach/vfib) etkilenmedi.
     6) ST sapması parametresi tablo morfolojisine ekleniyor.
   ========================================================================= */

import { describe, expect, test } from "vitest";
import { ECG_SINUS_CYCLE, ECG_SINUS_LEN } from "@/components/monitor/waveform-data";
import { sampleECG } from "@/components/monitor/waveform-engine";

// Faz [0,1) → tablo R konumu (üreteç R_TARGET ile aynı).
const R_PHASE = 0.252;

describe("ECG_SINUS_CYCLE — ECGSYN üretilmiş tablo", () => {
  test("tablo uzunluğu 500 ve ECG_SINUS_LEN ile tutarlı", () => {
    expect(ECG_SINUS_CYCLE.length).toBe(500);
    expect(ECG_SINUS_LEN).toBe(ECG_SINUS_CYCLE.length);
  });

  test("tüm değerler sonlu sayı", () => {
    expect(ECG_SINUS_CYCLE.every((v) => Number.isFinite(v))).toBe(true);
  });

  test("R-tepe ≈ +1.0 (normalize) ve faz u≈0.252'de", () => {
    const max = Math.max(...ECG_SINUS_CYCLE);
    expect(max).toBeCloseTo(1.0, 5);
    const rIdx = ECG_SINUS_CYCLE.indexOf(max);
    expect(rIdx / ECG_SINUS_LEN).toBeCloseTo(R_PHASE, 1);
  });

  test("değerler fizyolojik aralıkta (R=1 referans; aşırı taşma yok)", () => {
    const max = Math.max(...ECG_SINUS_CYCLE);
    const min = Math.min(...ECG_SINUS_CYCLE);
    expect(max).toBeLessThanOrEqual(1.0001);
    // S çukuru negatif ama R'den çok daha küçük genlikte.
    expect(min).toBeLessThan(0);
    expect(min).toBeGreaterThan(-0.8);
  });

  test("P–QRS–T fizyolojik sıralaması doğru", () => {
    const idxOfMaxIn = (lo: number, hi: number) => {
      let bi = lo;
      let best = -Infinity;
      for (let i = lo; i < hi; i++) {
        if (ECG_SINUS_CYCLE[i] > best) {
          best = ECG_SINUS_CYCLE[i];
          bi = i;
        }
      }
      return bi;
    };
    const N = ECG_SINUS_LEN;
    const rIdx = ECG_SINUS_CYCLE.indexOf(Math.max(...ECG_SINUS_CYCLE));
    const sIdx = ECG_SINUS_CYCLE.indexOf(Math.min(...ECG_SINUS_CYCLE));
    const pIdx = idxOfMaxIn(Math.floor(0.05 * N), Math.floor(0.2 * N));
    const tIdx = idxOfMaxIn(Math.floor(0.34 * N), Math.floor(0.65 * N));

    // P, R'den önce; S çukuru ve T tepesi R'den sonra; T, S'ten sonra.
    expect(pIdx).toBeLessThan(rIdx);
    expect(sIdx).toBeGreaterThan(rIdx);
    expect(tIdx).toBeGreaterThan(sIdx);

    // P ve T küçük pozitif dalgalar, R en büyük.
    expect(ECG_SINUS_CYCLE[pIdx]).toBeGreaterThan(0);
    expect(ECG_SINUS_CYCLE[pIdx]).toBeLessThan(0.5);
    expect(ECG_SINUS_CYCLE[tIdx]).toBeGreaterThan(0);
    expect(ECG_SINUS_CYCLE[tIdx]).toBeLessThan(0.6);
    expect(ECG_SINUS_CYCLE[rIdx]).toBeGreaterThan(ECG_SINUS_CYCLE[tIdx]);
  });
});

describe("sampleECG('sinus') — tablo morfolojisini kullanır", () => {
  // Bir tam beat'i (beat=0..1) örnekle.
  const sample = (u: number) => sampleECG(u, "sinus", u, false, 0);

  test("R fazında (~0.252) tepe ≈ +1, taban civarı çok düşük", () => {
    const rVal = sample(0.252);
    expect(rVal).toBeGreaterThan(0.9);
    // diyastolik taban (faz ~0.65, T sonrası) R'den çok daha düşük.
    const baseVal = sample(0.7);
    expect(baseVal).toBeLessThan(0.3);
    expect(rVal).toBeGreaterThan(baseVal + 0.6);
  });

  test("çıktı monoton DEĞİL — gerçekçi P-QRS-T salınımı var", () => {
    const ys: number[] = [];
    for (let i = 0; i < ECG_SINUS_LEN; i++) ys.push(sample(i / ECG_SINUS_LEN));
    // Birden çok yerel maksimum (P, R, T) ve negatif (Q/S) bölge olmalı.
    const max = Math.max(...ys);
    const min = Math.min(...ys);
    expect(max).toBeGreaterThan(0.9); // R
    expect(min).toBeLessThan(0); // Q/S
    // İşaret değişimi sayısı: morfoloji düz/monoton değil.
    let signChanges = 0;
    for (let i = 1; i < ys.length; i++) {
      if (Math.sign(ys[i]) !== Math.sign(ys[i - 1]) && ys[i] !== 0) signChanges++;
    }
    expect(signChanges).toBeGreaterThanOrEqual(2);
  });

  test("tablo örneklemesi pqrstWave eski sentetik R konumuyla hizalı", () => {
    // R fazı 0.252 civarında, komşu fazlardan belirgin yüksek (sivri QRS).
    const r = sample(0.252);
    expect(r).toBeGreaterThan(sample(0.21));
    expect(r).toBeGreaterThan(sample(0.3));
  });

  test("beat tam-sayı kısmı morfolojiyi etkilemez (faz periyodik)", () => {
    expect(sample(0.4)).toBeCloseTo(sampleECG(3.4, "sinus", 3.4, false, 0), 6);
  });
});

describe("ST sapması — tablo morfolojisine eklenir", () => {
  test("ST elevasyonu S–T arası segmenti yükseltir", () => {
    const u = 0.32; // S sonrası, T öncesi plato bölgesi
    const base = sampleECG(u, "sinus", u, false, 0);
    const elevated = sampleECG(u, "sinus", u, false, 0.25);
    expect(elevated).toBeGreaterThan(base);
  });

  test("ST depresyonu aynı segmenti düşürür", () => {
    const u = 0.32;
    const base = sampleECG(u, "sinus", u, false, 0);
    const depressed = sampleECG(u, "sinus", u, false, -0.2);
    expect(depressed).toBeLessThan(base);
  });

  test("ST=0 iken R-tepesi değişmez (sapma sadece segmentte)", () => {
    const r0 = sampleECG(0.252, "sinus", 0.252, false, 0);
    const rSt = sampleECG(0.252, "sinus", 0.252, false, 0.3);
    expect(rSt).toBeCloseTo(r0, 6);
  });
});

describe("regresyon — diğer ritimler tablodan ETKİLENMEZ", () => {
  test("vtach sinüs tablosunu kullanmaz (kendi sinüzoidal morfolojisi)", () => {
    // vtach çıktısı sinüs R-tepesiyle aynı OLMAMALI.
    const vt = sampleECG(0.252, "vtach", 0.252, false, 0);
    const sn = sampleECG(0.252, "sinus", 0.252, false, 0);
    expect(vt).not.toBeCloseTo(sn, 2);
  });

  test("vfib kaotik kalır (mutlak zaman t'ye bağlı)", () => {
    const a = sampleECG(0.5, "vfib", 1.0, false, 0);
    const b = sampleECG(0.5, "vfib", 2.0, false, 0);
    expect(a).not.toBeCloseTo(b, 3);
  });

  test("paced ritim pacing spike morfolojisini korur (tablo değil)", () => {
    // paced=true iken spike u≈0.205'te; sinüs tablosundan farklı.
    const paced = sampleECG(0.205, "sinus", 0.205, true, 0);
    const normal = sampleECG(0.205, "sinus", 0.205, false, 0);
    expect(paced).not.toBeCloseTo(normal, 2);
  });
});
