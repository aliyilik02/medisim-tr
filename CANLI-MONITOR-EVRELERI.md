# Canlı Monitör — Sonraki Evreler Planı

**Durum (23 Nisan 2026):** Evre 1 MVP tamamlandı — baseline + pharma delta ile gerçek zamanlı vitaller, yön okları, aktif ilaç rozeti. Sıradaki evreler:

---

## Evre 2 — Trend mini-chart (1 gün)

**Amaç:** Son 60 sn'nin vital seyrini küçük SVG sparkline grafiği olarak her VitalBox'ın altında göstermek. Kullanıcı anlık değeri görmenin yanında **yön eğilimini** de görsel algılıyor.

### Teknik

**Yeni dosya:** `src/hooks/useVitalsHistory.ts`
- Her tick'te mevcut `session.vitals`'ı FIFO buffer'a ekler (max 60 eleman)
- Sadece HR, SBP, SpO₂, RR için tutar (önemli olanlar)
- Return: `{ hr: number[], bp_systolic: number[], spo2: number[], rr: number[] }`

**Yeni dosya:** `src/components/VitalsSparkline.tsx`
- 80×20 px SVG
- `values: number[]` alır, min-max normalizasyonu yapar, path çizer
- Renk vital'in status'üne göre (stable=yeşil, warning=sarı, critical=kırmızı)
- Son nokta belirgin (dot ekle)

**Entegrasyon:** `VitalsMonitor.tsx` içinde VitalBox'a history prop'u geçirilir, altta sparkline çizilir.

### Tasarım

```
┌─────────────────────┐
│ NABIZ       uyarı   │
│ 98 /dk   ↑3         │
│ ╱╲╱╲─╱╲╲            │  ← SVG sparkline
└─────────────────────┘
```

---

## Evre 3 — EKG dalga formu animasyonu (2 gün)

**Amaç:** Üstte tam genişlikte küçük bir EKG şeridi. PQRST kompleksi HR'ye senkron sürekli akar.

### Teknik

**Yeni dosya:** `src/components/EcgStrip.tsx`
- Canvas veya SVG path animate — performans için canvas tercih
- HR'den period hesaplanır: `period = 60000 / hr` ms
- Her period'da PQRST path çizer
- RR interval varyasyonu (aritmi hissi) — opsiyonel
- Senaryoya `ekg_pattern: "normal" | "stemi" | "vt" | "vf"` alanı eklenebilir

**Preset dalgalar:**
- **Normal sinüs:** standart PQRST
- **STEMI:** ST elevasyon (T dalgası öncesi yüksek ST segmenti)
- **VT:** geniş QRS, senkop
- **VF:** düzensiz kaotik çizgi
- **Asistoli:** düz çizgi

**Senaryo entegrasyonu:** Step'e eklenebilir `ekg_override?: string` — belirli anlarda ritmi değiştir (örn. ST elevasyon → VT'ye geç).

---

## Evre 4 — Ses (1 gün)

**Amaç:** Gerçek monitör hissi — HR bip'i + alarm sesleri.

### Teknik

**Yeni dosya:** `src/hooks/useMonitorSounds.ts`
- Web Audio API — sentez ile bip (oscillator, 0.05sn, ~800 Hz)
- HR'ye senkron: her period'da bip
- SpO₂ < 90 → düşük ton alarm (her 3 sn)
- HR < 50 veya > 140 → farklı ton alarm
- Kullanıcı sesi kapatabilmeli (toggle, üst bar'da ikon)

**Kısıtlar:**
- Browser autoplay policy — ilk kullanıcı etkileşimi gerekli
- Sesi varsayılan olarak **kapalı** başlat, kullanıcı açsın
- Sınav modunda zorunlu olmamalı (bazıları kütüphanede oynayacak)

### Tasarım

Üst bar'a ses ikonu ekle:
- `🔇` kapalı (varsayılan)
- `🔊` açık
- Hover: "Monitör sesleri"

---

## Evre 5 — Zaman damgası (30 dk)

**Amaç:** Dijital saat tarzı zaman göstergesi — "senaryo başlangıcından beri ne kadar geçti".

### Teknik

**Yeni dosya:** `src/components/MonitorClock.tsx`
- `started_at` → `Date.now()` farkı MM:SS formatında
- Her saniye güncellenir (kendi interval'i)
- Geist Mono, tabular-nums, tracking-wider
- Monitör başlığı yanında

### Tasarım

```
Hasta Monitörü        12:34 ⏱
Vital Bulgular
```

---

## Uygulama sırası önerisi

1. **Evre 2 (trend chart)** → düşük risk, büyük görsel kazanım
2. **Evre 5 (saat)** → kolay, 30 dk
3. **Evre 3 (EKG)** → orta risk, büyük wow-faktör
4. **Evre 4 (ses)** → en son, çünkü autoplay/toggle karmaşıklığı

---

## Evre 1 sonrası bilinen kısıtlar

- **Aktif ilaç görünmüyor** — hangi ilaçların şu an etki ettiğini kullanıcı göremiyor, sadece sayıyı. Evre 2 veya 6'da: hover'da liste açılsın.
- **Senaryo pause yok** — kullanıcı telefonu bırakırsa tick devam eder, gerçek dışı sonuç. Evre 4 sonrası: sekme odağı kaybında pause (`document.visibilityState === "hidden"` → `paused: true`).
- **Tick hızı tek baz** — tüm ilaçlar aynı hızda. Bazı ilaçlar gerçekte çok hızlı etki eder (adrenalin 30 sn), bazıları yavaş (morfin 5 dk). Şu an motor `onset/peak/duration` zaten doğru işliyor, sadece tick aralığı sabit. Sorun değil.

---

**Evre 1 test edildikten sonra Evre 2'ye geçmek için:**

```
claude "VitalsMonitor'a trend mini-chart ekle — /docs/CANLI-MONITOR-EVRELERI.md Evre 2 bölümüne göre. useVitalsHistory hook + VitalsSparkline component."
```
