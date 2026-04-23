# MediSim TR — Yeni Sohbet Başlangıç Paketi

Bu dosya yeni bir Claude sohbetine geçerken kullanılacak.
Son güncelleme: 23 Nisan 2026

---

## Yeni sohbete ilk mesaj olarak bunu yapıştır

```
Merhaba. MediSim TR projesinde devam ediyorum. Projenin zip'ini ekledim.

Önce şu iki dosyayı oku, projenin mevcut durumunu tam hakim ol:
1. docs/TASARIM-KARARLARI.md — tüm mimari ve klinik kararlar
2. YENI-SOHBET-BASLANGIC.md — en güncel ilerleme durumu ve yapılacaklar

Sonra bana Türkçe kısa bir özet ver:
- Projenin şu anki durumu
- Son bitirilen iş
- Sıradaki olası 3-4 görev

Ondan sonra benim ne yapacağımı söyleyeceğim.
```

---

## Projenin mevcut durumu (23 Nisan 2026)

### Faz 1 / Hafta 1 — Farmakoloji motoru ✅ TAMAM

**Kod tarafı:**
- `src/engine/types.ts` — Difficulty, PatientModifiers, zorluk filtreli alanlar eklendi
- `src/engine/engine.ts` — evaluateAction/evaluateDecision/pickNextStep zorluk filtresi kazandı
- `src/engine/pharmacology/types.ts` — tam veri şeması
- `src/engine/pharmacology/presets.ts` — 20 klinik preset
- `src/engine/pharmacology/engine.ts` — administerMedication, tick, modifier zinciri, kontrendikasyon
- `src/data/medications.ts` — 30 kardiyovasküler + 9 eski ilaç
- `src/data/medications-extended.ts` — 30 kardiyovasküler ilaç farmakoloji verisi

**Senaryo:**
- `src/data/scenarios/stemi.ts` — 5 zorluk seviyesi aktif, 10 iyileştirme noktası tamamlandı, 7 adım (s2b ek derivasyonlar, s6 PCI sonrası, s7 VT/VF dahil)

**UI (Parça A tamam):**
- `src/components/DifficultySelector.tsx` — 5 seviyeli buton grid
- `src/components/CriticalContraindicationModal.tsx` — kırmızı flash + countdown
- `src/components/StepDisplay.tsx` — visibleOptions destekliyor
- `src/pages/ScenarioPlayPage.tsx` — mod + zorluk seçimi, farmakoloji motoru entegre, kritik modal bağlı

### Sıradaki — önceliğe göre

**Öncelik 1: UI Parça B — Canlı monitör (kullanıcının en çok istediği)**
Amaç: Vital'ler anlık değil yavaş yavaş değişsin, gerçek hasta monitörü hissi.

- [ ] Farmakoloji tick motoruna React hook (useEffect + setInterval)
- [ ] SessionState'e baseline_vitals eklenmesi
- [ ] VitalsMonitor'da baseline vs live ayrımı + yön okları (↑↓)
- [ ] Trend mini-chart (son 60 sn SVG path)
- [ ] EKG dalga formu animasyonu (SVG path animate)
- [ ] Monitör bip sesi (HR'ye senkron Web Audio API)
- [ ] Alarm sesleri (SpO2 düşük vb.)
- [ ] Zaman damgası dijital saat
- [ ] Eğitim modu 3x hız / sınav modu 1x hız entegrasyonu tick'e

**Öncelik 2: Claude Code otonom ajan kurulumu**
- [x] CLAUDE.md güncellendi (otonom çalışma talimatları + güncel durum)
- [ ] `.claude/commands/` klasörü oluştur
- [ ] Slash komutları: /senaryo-ekle, /ilac-ekle, /test-calis, /durum, /build-kontrol
- [ ] .claude/settings.local.json — izinli araçlar listesi
- [ ] Git hooks — commit öncesi build kontrolü
- [ ] README'ye "Claude Code ile çalışma" bölümü

**Öncelik 3: İçerik genişletme**
- [ ] equipment.ts — 20 yeni ekipman
- [ ] 30 kardiyo-dışı ilaç medications-extended.ts'e
- [ ] DKA senaryosu (dahiliye, zorluk 2-4)
- [ ] Pediatrik sepsis senaryosu (pediatri, zorluk 2-4)

**Öncelik 4: Raporlama (Hafta 2)**
- [ ] PDF export (jspdf) — debrief çıktısı
- [ ] Excel export (xlsx) — aksiyon geçmişi

**Öncelik 5: Tasarım kimliği (Hafta 3)**
- [ ] Mevcut UI denetimi
- [ ] Specialty bazlı arayüz varyasyonu (kardiyoloji/acil/askeri farklı renk)
- [ ] Logo + marka kimliği

---

## Mimari — ezbere bil

### İki ilaç kataloğu
- `medications.ts` — UI için kimlik (Medication tipi)
- `medications-extended.ts` — farmakoloji motoru verisi (ExtendedMedication)
- İkisi `id` üzerinden eşleşir, yeni ilaç eklerken ikisine de ekle

### Zorluk sistemi
- Step, ActionOutcome, DecisionOption'da opsiyonel `min_difficulty` / `max_difficulty`
- `evaluateAction(step, action, scenario, difficulty)` — seçili zorluğa göre filtre
- `getVisibleOptions(step, difficulty)` — UI için
- `pickNextStep(scenario, currentId, unlocks, difficulty)` — atlanan adımları atlar

### Farmakoloji motoru
- `administerMedication()` — doz değerlendirme + kontrendikasyon + modifier uygula
- `tick()` — aktif ilaçların zaman bazlı vital etkisi (onset→peak→plato→decline)
- `computeLiveVitals(baseline, delta)` — gösterilecek vital = baseline + tick delta
- `getTickIntervalMs(baseMs, mode, override)` — eğitim 3x, sınav 1x

### Kontrendikasyon şiddet
- `uyari` — küçük puan cezası, monitör tepkisi yok
- `orta` — anlık vital değişim + monitör uyarısı
- `kritik` — kırmızı modal + countdown (grace_sec) + antidot önerisi + süre dolarsa -30 ve senaryo biter

---

## Çalışma prensibi (kullanıcı için)

1. Kullanıcı **sahada çalışan sağlık profesyoneli** — yazılım bilgisi sınırlı, gün içinde zaman yok
2. Claude **otonom çalışmalı** — küçük kararları kendi alır, büyük kararlarda sorar
3. İletişim **Türkçe, kısa, sade**
4. Bitirdiğinde **ne yaptım + ne değişti + sıradaki adım** — üç cümle yeter
5. Her anlamlı değişiklikten sonra commit (conventional commit Türkçe mesajlı)

---

## Klinik standart

- Birincil kaynaklar: ESC 2023, TKD 2022, AHA/ACC 2022, UpToDate, Katzung 15e
- Türkiye yerel: SUT, SGK, 112 protokolü, ATT yetki
- Hedef pazar: Türkiye birincil — ama ESC/AHA da destekli çünkü TKD onlara referans veriyor
- Emin olmadığın ilaç dozu için → kullanıcıya sor, doğaçlama yapma

---

## Teknik yığın

- React 18 + TypeScript + Vite
- React Router v6
- Tailwind CSS (palet: ink-*, clinical-*, brand)
- Fontlar: Instrument Serif (display), Geist (sans), Geist Mono (mono)
- lucide-react (icon)
- Henüz yok: backend, 3D, auth, ödeme

---

## Yeni sohbete aktaracağın dosya listesi

Yeni sohbete projeyi zipleyerek yüklerken aşağıdaki dosyaların güncel olduğundan emin ol:

1. `CLAUDE.md` — ajan talimatları (güncellendi)
2. `docs/TASARIM-KARARLARI.md` — ana kararlar
3. `YENI-SOHBET-BASLANGIC.md` — bu dosya
4. Tüm `src/engine/` klasörü
5. Tüm `src/data/` klasörü
6. `src/components/` içinde DifficultySelector + CriticalContraindicationModal (yeni)
7. `src/pages/ScenarioPlayPage.tsx` (güncellendi)

---

## İki sohbet arası Claude Code kullanımı

Eğer Claude Code terminalde kurulu ve çalışıyorsa, sohbetler arasında şu komutları kullanabilirsin:

```
claude "canlı monitör hook'unu yaz, VitalsMonitor'e delta göstergesi ekle"
claude "DKA senaryosu ekle, seviye 2-4"
claude "build temiz mi kontrol et, commit at"
```

Claude Code CLAUDE.md'yi okuyarak senin talimatlarına göre çalışır.
