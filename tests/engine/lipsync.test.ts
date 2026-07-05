// ============================================================
// Lipsync motoru testleri — TR metin → viseme timeline
// ============================================================
// Kanıtlar: harf sınıflandırma (TR-özel harfler + case duyarsızlık),
// timeline ölçekleme + duraklama, sınır-güvenli örnekleme,
// ARKit ağırlık aralığı, tek kanal fallback tutarlılığı, determinizm.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  buildVisemeTimeline,
  classifyChar,
  sampleViseme,
  visemeToArkit,
  visemeToJawAmplitude,
  LIPSYNC_ARKIT_KEYS,
  type Viseme,
  type VisemeFrame,
} from "@/engine/lipsync";

function frameOf(viseme: Viseme): VisemeFrame {
  return { primary: viseme, primaryWeight: 1, secondary: "sil", secondaryWeight: 0 };
}

// ------------------------------------------------------------
// Harf sınıflandırma
// ------------------------------------------------------------

describe("classifyChar — TR harf sınıfları", () => {
  test("m/b/p → dudak-kapali (bilabial)", () => {
    for (const ch of ["m", "b", "p", "M", "B", "P"]) {
      expect(classifyChar(ch)).toBe("dudak-kapali");
    }
  });

  test("f/v → dis-dudak (labiodental)", () => {
    for (const ch of ["f", "v", "F", "V"]) {
      expect(classifyChar(ch)).toBe("dis-dudak");
    }
  });

  test("yuvarlak ünlüler: o/ö → orta-yuvarlak, u/ü → dar-yuvarlak", () => {
    expect(classifyChar("o")).toBe("orta-yuvarlak");
    expect(classifyChar("ö")).toBe("orta-yuvarlak");
    expect(classifyChar("Ö")).toBe("orta-yuvarlak");
    expect(classifyChar("u")).toBe("dar-yuvarlak");
    expect(classifyChar("ü")).toBe("dar-yuvarlak");
    expect(classifyChar("Ü")).toBe("dar-yuvarlak");
  });

  test("düz ünlüler: a → acik, e → on-duz, ı/i → dar-duz", () => {
    expect(classifyChar("a")).toBe("acik");
    expect(classifyChar("e")).toBe("on-duz");
    expect(classifyChar("ı")).toBe("dar-duz");
    expect(classifyChar("i")).toBe("dar-duz");
  });

  test("TR büyük harf kuralı: I → ı, İ → i (ikisi de dar-duz, çökmez)", () => {
    expect(classifyChar("I")).toBe("dar-duz");
    expect(classifyChar("İ")).toBe("dar-duz");
  });

  test("ç/ş TR ünsüzleri dar-aralik, ğ bağlamsız gevsek", () => {
    expect(classifyChar("ç")).toBe("dar-aralik");
    expect(classifyChar("Ç")).toBe("dar-aralik");
    expect(classifyChar("ş")).toBe("dar-aralik");
    expect(classifyChar("Ş")).toBe("dar-aralik");
    expect(classifyChar("ğ")).toBe("gevsek");
    expect(classifyChar("Ğ")).toBe("gevsek");
  });

  test("boşluk ve noktalama → sil; bilinmeyen sembol → null", () => {
    expect(classifyChar(" ")).toBe("sil");
    expect(classifyChar(".")).toBe("sil");
    expect(classifyChar(",")).toBe("sil");
    expect(classifyChar("?")).toBe("sil");
    expect(classifyChar("*")).toBeNull();
    expect(classifyChar("(")).toBeNull();
  });
});

// ------------------------------------------------------------
// Timeline üretimi
// ------------------------------------------------------------

describe("buildVisemeTimeline", () => {
  test("boş metin → boş timeline", () => {
    const tl = buildVisemeTimeline("");
    expect(tl.events).toHaveLength(0);
    expect(tl.totalMs).toBe(0);
  });

  test("timeline süresi metin uzunluğuyla ölçekli", () => {
    const kisa = buildVisemeTimeline("merhaba");
    const uzun = buildVisemeTimeline("merhaba hastam, bugün nasılsınız?");
    expect(uzun.totalMs).toBeGreaterThan(kisa.totalMs);
  });

  test("msPerChar seçeneği süreyi doğrudan belirler", () => {
    const tl = buildVisemeTimeline("aç", { msPerChar: 100 });
    expect(tl.totalMs).toBe(200);
    expect(tl.events).toHaveLength(2); // acik + dar-aralik
  });

  test("olaylar sıralı, bitişik ve çakışmasız", () => {
    const tl = buildVisemeTimeline("merhaba, nasılsınız?");
    let cursor = 0;
    for (const ev of tl.events) {
      expect(ev.startMs).toBe(cursor);
      expect(ev.durationMs).toBeGreaterThan(0);
      cursor += ev.durationMs;
    }
    expect(cursor).toBe(tl.totalMs);
  });

  test("m/b/p metni dudak-kapali olayı üretir (case duyarsız)", () => {
    const tl = buildVisemeTimeline("MaBaPa");
    const kapali = tl.events.filter((e) => e.viseme === "dudak-kapali");
    expect(kapali.length).toBeGreaterThanOrEqual(3);
  });

  test("o/u metni yuvarlak viseme üretir", () => {
    const tl = buildVisemeTimeline("okul");
    const visemeler = tl.events.map((e) => e.viseme);
    expect(visemeler).toContain("orta-yuvarlak");
    expect(visemeler).toContain("dar-yuvarlak");
  });

  test("boşluk kısa, nokta uzun duraklama üretir", () => {
    const pauseMs = 200;
    const bosluk = buildVisemeTimeline("a a", { msPerChar: 50, pauseMs });
    const nokta = buildVisemeTimeline("a.a", { msPerChar: 50, pauseMs });

    const boslukSil = bosluk.events.find((e) => e.viseme === "sil");
    const noktaSil = nokta.events.find((e) => e.viseme === "sil");
    expect(boslukSil?.durationMs).toBe(pauseMs / 2);
    expect(noktaSil?.durationMs).toBe(pauseMs);
    expect(nokta.totalMs).toBeGreaterThan(bosluk.totalMs);
  });

  test("ardışık aynı harf tek olaya birleşir (anne → tek dar-aralik n bloğu)", () => {
    const tl = buildVisemeTimeline("anne", { msPerChar: 60 });
    // a + nn(birleşik) + e = 3 olay
    expect(tl.events).toHaveLength(3);
    expect(tl.events[1].viseme).toBe("dar-aralik");
    expect(tl.events[1].durationMs).toBe(120);
    expect(tl.totalMs).toBe(4 * 60);
  });

  test("ğ önceki ünlüyü uzatır: 'ağ' tek acik olayı, 2 karakter süresi", () => {
    const tl = buildVisemeTimeline("ağ", { msPerChar: 70 });
    expect(tl.events).toHaveLength(1);
    expect(tl.events[0].viseme).toBe("acik");
    expect(tl.events[0].durationMs).toBe(140);
  });

  test("ünlüden sonra gelmeyen ğ gevsek kalır", () => {
    const tl = buildVisemeTimeline("ğa");
    expect(tl.events[0].viseme).toBe("gevsek");
  });

  test("bilinmeyen semboller atlanır, süre eklemez", () => {
    const temiz = buildVisemeTimeline("aç");
    const kirli = buildVisemeTimeline("(aç)*");
    expect(kirli.totalMs).toBe(temiz.totalMs);
  });

  test("deterministik: aynı girdi aynı çıktı", () => {
    const a = buildVisemeTimeline("Merhaba, ben doktorunuz. Şikayetiniz nedir?");
    const b = buildVisemeTimeline("Merhaba, ben doktorunuz. Şikayetiniz nedir?");
    expect(a).toEqual(b);
  });
});

// ------------------------------------------------------------
// Örnekleme
// ------------------------------------------------------------

describe("sampleViseme — sınır güvenliği + koartikülasyon", () => {
  const tl = buildVisemeTimeline("mo", { msPerChar: 100 }); // dudak-kapali(0-100) + orta-yuvarlak(100-200)

  test("boş timeline → sil karesi", () => {
    const f = sampleViseme(buildVisemeTimeline(""), 50);
    expect(f.primary).toBe("sil");
    expect(f.primaryWeight).toBe(1);
  });

  test("t<0 güvenli: ilk olayın karesi döner", () => {
    const f = sampleViseme(tl, -500);
    expect(f.primary).toBe("dudak-kapali");
    expect(f.primaryWeight + f.secondaryWeight).toBeCloseTo(1);
  });

  test("t>=totalMs güvenli: sil döner (ağız kapanır)", () => {
    expect(sampleViseme(tl, 200).primary).toBe("sil");
    expect(sampleViseme(tl, 99999).primary).toBe("sil");
  });

  test("olay ortası: primary tam ağırlık", () => {
    const f = sampleViseme(tl, 60);
    expect(f.primary).toBe("dudak-kapali");
    expect(f.primaryWeight).toBe(1);
  });

  test("olay geçişinde yumuşak karışım: ağırlıklar 1'e toplanır, komşu viseme secondary", () => {
    const f = sampleViseme(tl, 110); // ikinci olayın blend penceresi içinde
    expect(f.primary).toBe("orta-yuvarlak");
    expect(f.secondary).toBe("dudak-kapali");
    expect(f.primaryWeight).toBeGreaterThan(0);
    expect(f.primaryWeight).toBeLessThan(1);
    expect(f.primaryWeight + f.secondaryWeight).toBeCloseTo(1);
  });

  test("geçiş boyunca primary ağırlığı monoton artar", () => {
    const w1 = sampleViseme(tl, 101).primaryWeight;
    const w2 = sampleViseme(tl, 125).primaryWeight;
    const w3 = sampleViseme(tl, 149).primaryWeight;
    expect(w2).toBeGreaterThan(w1);
    expect(w3).toBeGreaterThan(w2);
  });

  test("son olayın kuyruğunda sil'e sönüş (ağız takılı kalmaz)", () => {
    const f = sampleViseme(tl, 195);
    expect(f.secondary).toBe("sil");
    expect(f.secondaryWeight).toBeGreaterThan(0);
    expect(f.primaryWeight + f.secondaryWeight).toBeCloseTo(1);
  });
});

// ------------------------------------------------------------
// ARKit eşleme
// ------------------------------------------------------------

describe("visemeToArkit", () => {
  const tumVisemeler: Viseme[] = [
    "sil",
    "acik",
    "on-duz",
    "dar-duz",
    "orta-yuvarlak",
    "dar-yuvarlak",
    "dudak-kapali",
    "dis-dudak",
    "dar-aralik",
    "gevsek",
  ];

  test("tüm visemelerde tüm ağırlıklar 0..1 aralığında ve tüm anahtarlar mevcut", () => {
    for (const v of tumVisemeler) {
      const weights = visemeToArkit(frameOf(v));
      for (const key of LIPSYNC_ARKIT_KEYS) {
        expect(weights[key]).toBeGreaterThanOrEqual(0);
        expect(weights[key]).toBeLessThanOrEqual(1);
      }
    }
  });

  test("dudak-kapali → mouthClose baskın, jawOpen 0", () => {
    const w = visemeToArkit(frameOf("dudak-kapali"));
    expect(w.mouthClose).toBeGreaterThan(0.5);
    expect(w.jawOpen).toBe(0);
    expect(w.mouthPressLeft).toBeGreaterThan(0);
    expect(w.mouthPressRight).toBeGreaterThan(0);
  });

  test("acik → jawOpen baskın; dar-yuvarlak → mouthPucker; orta-yuvarlak → mouthFunnel", () => {
    expect(visemeToArkit(frameOf("acik")).jawOpen).toBeGreaterThan(0.5);
    expect(visemeToArkit(frameOf("dar-yuvarlak")).mouthPucker).toBeGreaterThan(0.5);
    expect(visemeToArkit(frameOf("orta-yuvarlak")).mouthFunnel).toBeGreaterThan(0.4);
  });

  test("sil → tüm ağırlıklar 0", () => {
    const w = visemeToArkit(frameOf("sil"));
    for (const key of LIPSYNC_ARKIT_KEYS) expect(w[key]).toBe(0);
  });

  test("karışım karesi lineer harmanlanır", () => {
    const karisim: VisemeFrame = {
      primary: "acik",
      primaryWeight: 0.5,
      secondary: "dudak-kapali",
      secondaryWeight: 0.5,
    };
    const w = visemeToArkit(karisim);
    expect(w.jawOpen).toBeCloseTo(0.35); // 0.7 * 0.5
    expect(w.mouthClose).toBeCloseTo(0.4); // 0.8 * 0.5
  });

  test("bozuk ağırlık girdisi (negatif/>1) clamp'lenir", () => {
    const bozuk: VisemeFrame = {
      primary: "acik",
      primaryWeight: 5,
      secondary: "sil",
      secondaryWeight: -2,
    };
    const w = visemeToArkit(bozuk);
    for (const key of LIPSYNC_ARKIT_KEYS) {
      expect(w[key]).toBeGreaterThanOrEqual(0);
      expect(w[key]).toBeLessThanOrEqual(1);
    }
  });
});

// ------------------------------------------------------------
// Tek kanal fallback
// ------------------------------------------------------------

describe("visemeToJawAmplitude — Mixamo fallback", () => {
  test("her viseme için 0..1 aralığında", () => {
    const visemeler: Viseme[] = [
      "sil",
      "acik",
      "on-duz",
      "dar-duz",
      "orta-yuvarlak",
      "dar-yuvarlak",
      "dudak-kapali",
      "dis-dudak",
      "dar-aralik",
      "gevsek",
    ];
    for (const v of visemeler) {
      const amp = visemeToJawAmplitude(frameOf(v));
      expect(amp).toBeGreaterThanOrEqual(0);
      expect(amp).toBeLessThanOrEqual(1);
    }
  });

  test("tutarlılık: acik > gevsek > dudak-kapali; sil = 0", () => {
    const acik = visemeToJawAmplitude(frameOf("acik"));
    const gevsek = visemeToJawAmplitude(frameOf("gevsek"));
    const kapali = visemeToJawAmplitude(frameOf("dudak-kapali"));
    expect(acik).toBeGreaterThan(gevsek);
    expect(gevsek).toBeGreaterThan(kapali);
    expect(visemeToJawAmplitude(frameOf("sil"))).toBe(0);
  });

  test("karışım karesi ara değer üretir", () => {
    const karisim: VisemeFrame = {
      primary: "acik",
      primaryWeight: 0.5,
      secondary: "sil",
      secondaryWeight: 0.5,
    };
    expect(visemeToJawAmplitude(karisim)).toBeCloseTo(0.5);
  });

  test("timeline üzerinden uçtan uca: konuşma sırasında amplitüd değişir, sonda 0", () => {
    const tl = buildVisemeTimeline("madam", { msPerChar: 100 });
    const orta = visemeToJawAmplitude(sampleViseme(tl, 150)); // 'a' bölgesi
    const kapaliAn = visemeToJawAmplitude(sampleViseme(tl, 70)); // 'm' ortası
    const bitis = visemeToJawAmplitude(sampleViseme(tl, tl.totalMs + 10));
    expect(orta).toBeGreaterThan(kapaliAn);
    expect(bitis).toBe(0);
  });
});
