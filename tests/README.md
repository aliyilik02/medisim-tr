# MediSim TR — Test Sistemi

Aşama 1 (3 Mayıs 2026): vitest tabanlı motor + senaryo + regresyon testleri.

---

## Hızlı başlangıç

```bash
npm test                  # tüm testleri tek seferde koştur (CI modu)
npm run test:watch        # değişikliklerde otomatik tekrar
npm run test:ui           # tarayıcıda interaktif test paneli
npm run test:coverage     # coverage HTML raporu
```

Coverage raporu: `coverage/index.html` (tarayıcıda aç).

---

## Klasör yapısı

```
tests/
├── setup/
│   ├── clinical-protection.ts    # fs.write* mock — klinik dosyalar yazılamaz
│   └── protection.test.ts        # mock self-test
├── helpers/
│   ├── all-scenarios.ts          # SCENARIOS export'una test wrapper
│   ├── auto-play.ts              # senaryoyu engine üzerinden oynayan helper
│   └── scoring.ts                # applyDoublePenaltyGuard pure fn (UI'dan ayrıştırılmış)
├── engine/                       # birim testleri (saf motor)
│   ├── seededShuffle.test.ts
│   ├── evaluateAction.test.ts
│   ├── evaluateDecision.test.ts
│   └── scoring.test.ts
├── scenarios/                    # her senaryo için yapı + denge testleri
│   ├── structure.test.ts         # 14 senaryo × 13 yapı kontrolü
│   └── auto-play.test.ts         # en iyi yol → A notu
└── regression/                   # geçmiş bug fix'leri için kalıcı bekçiler
    ├── 01-bronsiyolit-bitir-flush.test.ts
    ├── 02-inventory-alphabetical.test.ts
    ├── 03-decision-shuffle.test.ts
    └── 04-double-penalty.test.ts
```

---

## Yeni senaryo eklediğinde

Test yazmana gerek yok. `tests/helpers/all-scenarios.ts` `SCENARIOS` listesinden besleniyor —
`src/data/scenarios/index.ts`'e yeni senaryoyu eklersen otomatik olarak şu testler ona uygulanır:

- `structure.test.ts`: yapı kontrolleri (id unique, target_id'ler envanter'da, vb.)
- `auto-play.test.ts`: en iyi yol gerçekten A notu veriyor mu

Test bunlardan birinde fail ederse: **klinik veriyi DEĞİŞTİRME**, önce sebebini incele.

---

## Yeni regresyon testi nasıl eklenir

Bir bug yakalandığında:

1. `tests/regression/NN-kisa-aciklama.test.ts` oluştur (NN: sıradaki numara).
2. Üst yorumda commit hash'i + bug açıklaması.
3. Bug'ı yeniden üretebilen minimal test (motor düzeyinde önce — UI'a gitmeden).
4. Test geçtiğinde fix'in kalıcı koruması olur.

UI testi gerekiyorsa Aşama 2'ye `describe.skip` + `TODO` yorumuyla bırak.

---

## Pre-commit hook

`.husky/pre-commit` iki katmanlı koruma sağlar:

1. **Klinik dosya guard'ı**: `src/data/scenarios/`, `medications.ts`, `medications-extended.ts`,
   `equipment.ts` staged'da görünüyorsa commit'i durdurur. Bilerek değişiklik için:
   ```bash
   git commit --no-verify
   ```
2. **lint-staged**: değişen `src/**/*.{ts,tsx}` dosyaları için `vitest related --run`
   (sadece ilgili testler — pre-commit hızlı kalsın diye).

---

## Coverage eşikleri

`vitest.config.ts` içinde:

| Yol            | lines | branches | functions |
|----------------|-------|----------|-----------|
| `src/lib/**`   | %85   | %85      | %85       |
| `src/engine/**`| %80   | %80      | %80       |

`src/data/**`, `src/components/**`, `src/pages/**`, `src/hooks/**` Aşama 1 kapsamı dışında —
coverage'tan exclude edilmiş.

---

## Bilinen FAIL'lar (Aşama 1 sonu)

`npm test` çalıştırınca **11 yapı fail** + **5 auto-play fail** beklenir. Bunlar
gerçek senaryo bug'larıdır. Klinik dosyaya dokunulmadı — kullanıcı sabah
inceleyip düzeltir. Detay: `tests/PHASE-1-REPORT.md`.
