# Tasarım Kararları

**Bu doküman projenin klinik motor ve içerik tasarımına dair verilmiş tüm kararları topluyor.** Kodlamaya başlamadan önce alınan mimari + klinik kararlar buradadır. Claude Code bu dosyayı otomatik okur — yeni sohbet açıldığında projenin düşünsel durumuna hızla hakim olur.

**Son güncelleme:** 22 Nisan 2026
**Durum:** Kararlar alındı, kodlama bekleniyor.

---

## 1. Kullanıcı geri bildirimleri (özet)

Kullanıcının (Mehmet Ali, sağlık profesyoneli) projeye bakıp istediği iyileştirmeler:

- **A.** İlaç ve ekipman kütüphanesi genişlesin, dozlar doğru olsun, **doz hata payı** olsun
- **B.** İlaç/ekipman uygulandığında **monitör canlı tepki versin** (farmakokinetik)
- **C.** Raporlama olsun — yapılan işlemler kayıt altında, **PDF/Excel** indirilebilir
- **D.** Geçmiş oturumlar izlenebilsin (backend bekler)
- **E.** Eğitmenler kendi senaryolarını oluşturabilsin (backend bekler)
- **F.** Tasarım kimliği — şu anki UI "jenerik AI dashboard" havasında, **MediSim TR'ye özgü** olsun

**Sıralama kararı:**
- Hafta 1: Klinik motor (A + B)
- Hafta 2: PDF/Excel export (C kısmi) + 2 yeni senaryo (DKA, pediatrik sepsis)
- Hafta 3: Tasarım kimliği (F)
- Faz 2 ile birlikte: Kalıcı raporlama (C tam + D), eğitmen editörü (E)

---

## 2. Farmakoloji motoru — 5 temel karar

### Karar 1: Doz değerlendirme

**Sistem:** Yüzdelik band.

- Varsayılan: %80-120 = doğru, dışı = hata
- İlaca özel istisna mümkün (örn. digoksin %90-110)

**İmplementasyon:**
```typescript
interface MedicationDoseBand {
  default_dose: number;  // mg, IU, vb.
  dose_unit: string;
  band_lower_pct: number;  // 0.8 varsayılan
  band_upper_pct: number;  // 1.2 varsayılan
  // İstisna: digoksin.band_lower_pct = 0.9
}
```

### Karar 2: İlaç etki şiddeti

**Sistem:** Sayısal aralık + preset şablonları (tıkla-doldur + manuel ince ayar).

- İlaç kataloğunda her vital için sayısal aralık: HR +20 ilâ +40
- Ortak preset'ler: "sempatomimetik-güçlü", "beta-bloker", "vazodilatör", vs.
- Senaryo yazarı preset'i tıklar, otomatik dolar; gerekirse manuel düzenler

**İmplementasyon:**
```typescript
// src/engine/pharmacology/presets.ts
export const PHARMACOLOGY_PRESETS = {
  'sempatomimetik-guclu': {
    hr_range: [20, 40],
    sbp_range: [30, 50],
    spo2_range: [2, 5],
    onset_sec: 30,
    peak_min: 2,
    duration_min: 8,
  },
  // ...
};

// src/data/medications.ts
adrenalin: {
  preset: 'sempatomimetik-guclu',
  overrides: { /* opsiyonel ince ayar */ }
}
```

### Karar 3: Hasta profili çarpanları

**Sistem:** Kilo + yaş grubu + 4 komorbidite çarpan olarak etkiler.

**Çarpan değişkenleri:**
- `beta_blocker` (hasta beta-bloker altında mı?)
- `karaciger_yetm`
- `bobrek_yetm`
- `gebelik`

**Her ilaç için:**
```typescript
adrenalin: {
  modifiers: {
    beta_blocker: 0.4,      // etki %40'a iner
    yasli_70plus: 0.7,
    gebelik: 'kontrendike',
    karaciger_yetm: 1.0,
    bobrek_yetm: 1.0,
  }
}
```

**Hesap:** `gerçek_etki = temel_etki × beta_blocker × yasli × ...` (çarpan zinciri)

### Karar 4: Kontrendike ilaç davranışı

**Sistem:** Anında yan etki + kritik durumda pop-up + düzeltme süresi.

**Şiddet seviyeleri:**
- `uyari`: Puan kaybı + debrief notu (monitör tepkisi yok)
- `orta`: Anında vital değişim (örn. bronkospazm → SpO2 düşer) + monitör uyarısı
- `kritik`: Pop-up + kırmızı monitör flash + düzeltme süresi (örn. 60 sn) + süre dolarsa senaryo başarısız

**Örnek:**
```typescript
beta_bloker + astim: { severity: 'orta', effect: 'bronkospazm' }
morfin + koah: { severity: 'kritik', effect: 'solunum_depresyonu', grace_sec: 60 }
```

### Karar 5: Vital tepki zamanlaması

**Sistem:** Mod bağımlı hız. Senaryo yazarı geçersiz kılabilir.

- **Eğitim modu:** 3x hızlı (30sn → 10sn, 2dk → 40sn)
- **Sınav modu:** Gerçek zaman (1x)
- **Senaryo override:** Bir senaryo "her iki modda da 1x çalışsın" diyebilir (zaman baskısı özseli senaryolar için)

**İmplementasyon:**
```typescript
// Senaryo dosyasında opsiyonel:
time_scale_override?: { egitim: 1.0, sinav: 1.0 }

// Motor:
tickInterval = baseInterval / (mode === 'egitim' ? 3 : 1);
```

---

## 3. Zorluk seviyeleri sistemi

**Proje her eğitim kademesine hitap etmeli** — bu yüzden aynı senaryo 5 farklı zorluk seviyesinde oynanabilir olmalı.

**5 seviye:**

| Seviye | Hedef Kullanıcı |
|---|---|
| 1 | Öğrenci hemşire / 1-2. sınıf tıp |
| 2 | Son sınıf tıp / intern |
| 3 | Pratisyen / ATT |
| 4 | Kardiyoloji asistan / Acil uzmanı |
| 5 | Yan dal uzman / Kardiyoloji uzmanı |

**Teknik mekanizma:**

Her senaryo **tek dosyada yazılır**, ama her adım ve her seçenek için `min_difficulty` alanı olur. Motor kullanıcının seçtiği seviyeye göre filtreler.

```typescript
interface Step {
  // ...
  min_difficulty?: 1 | 2 | 3 | 4 | 5;  // bu adım hangi seviyeden itibaren görünür
}

interface ExpectedOutcome {
  // ...
  min_difficulty?: 1 | 2 | 3 | 4 | 5;  // bu seçenek hangi seviyeden itibaren görünür
}
```

**Örnek — STEMI senaryosu seviye haritası:**

| Özellik | S1-2 | S3 | S4-5 |
|---|---|---|---|
| A-B-C, EKG, damar yolu | ✅ | ✅ | ✅ |
| ASA + klopidogrel + heparin | ✅ | ✅ | ✅ |
| Tikagrelor/prasugrel seçimi | ❌ | ❌ | ✅ |
| Sağ ventrikül/posterior MI kontrolü | ❌ | kısmi | ✅ |
| Aort diseksiyonu ekartasyonu | ❌ | ✅ | ✅ |
| Komplikasyon dalı (VT/VF) | ❌ | basit | ✅ |
| PCI sonrası yönetim | ❌ | özet | ✅ |
| Koşullu ilaç kararları (morfin nitrat sonrası) | basit | orta | tam |
| Metoprolol kontrendikasyonları | evet/hayır | nüanslı | tam klinik karar |

---

## 4. STEMI senaryosu denetim sonuçları

Mevcut STEMI senaryosu temel olarak sağlam (ESC 2023, AHA/ACC 2022 uyumlu) ama 10 iyileştirme noktası var. Hepsi **zorluk seviyesi filtresi** üzerinden çözülecek.

### Düzeltilecek/eklenecek maddeler

1. **SpO2 %94 O2 kararı** → S1-2: puanla (+5), S3+: nötr (0 puan, hipoksi yoksa gereksiz)

2. **Morfin koşullu puanlama** → Nitrogliserin denenmeden morfin = -5, denendi hâlâ 8/10 ise morfin = +5 (durum takibi motor özelliği)

3. **Metoprolol nüansı** → Feedback güncellenecek: "Erken IV beta-bloker tartışmalı, hasta stabil (HR 104, SBP 148) — mutlak kontrendike değil ama önceliği yok." Puan: -15 → -5

4. **Tikagrelor + prasugrel** kataloğa eklenecek, S4-5 seviyesinde seçenek olacak

5. **Sağ ventrikül + posterior MI kontrolü** → EKG yorumu adımında S3+ için ek soru: V4R, V7-V9 derivasyonları

6. **Kapı-balon hesabı** → S3+ için: "İlk tıbbi temastan balona 120 dk. 45 dk yol + 30 dk hastane = 75 dk. Uygun." Hesaplattıracak seçenek

7. **Aort diseksiyonu ekartasyonu** → S3+ için 5. adımda ek seçenek

8. **Komplikasyon dalı** → Aspirin verilmezse / gecikme olursa → VT/VF → defibrilasyon gerekir (dinamik dal, S3+)

9. **PCI sonrası yönetim** → S3+ için 6. adım olarak eklenecek (DAPT süresi, sekonder koruma, statin, ACEi)

10. **İlaç dozları** → Yeni farmakoloji motoru otomatik halledecek (heparin 60 IU/kg maks 4000 IU gibi)

---

## 5. Ekstra özellikler (sonraki fazlar için kayıt altında)

### A. Hasta ikizi / klinik varyantlar

Aynı senaryonun **2-3 varyantı** tek dosyada. Motor rastgele seçer veya kullanıcı seçer.

**STEMI örneği:**
- STEMI-A: 62 yaş erkek, tipik tablo (mevcut)
- STEMI-B: 78 yaş kadın DM'li, **atipik prezentasyon** (nefes darlığı baskın)
- STEMI-C: 45 yaş kadın, gebe 28. hafta (nadir, kritik karar)

**Değer:** Öğrenci aynı senaryoyu 3. kez oynadığında şaşırır → tekrar oynanma artar.

**İmplementasyon notu:**
```typescript
interface Scenario {
  // ...
  variants?: PatientVariant[];  // her varyantın patient, initial_vitals, override'ları var
}
```

**Faz:** Faz 1 sonuna doğru, temel motor oturduktan sonra.

---

### C. İnter-profesyonel akış

Takım üyeleri simülasyonu:
- "Hemşireye söyle: damar yolu aç" → hemşire aksiyonu simüle edilir
- "Kardiyoloji konsültasyonu iste" → 30 sn sonra cevap
- "ATT'ye söyle: hastayı transfere hazırla"

**Değer:**
1. Gerçek klinik pratik → kimse tek başına yönetmez
2. Askeri TCCC modülü için zemin (tim lideri-sağlıkçı iletişimi)
3. Hemşirelik eğitimi için kritik

**Faz:** Faz 2 veya 3 (kompleks, backend'li daha mantıklı).

---

### E. Eğitmen senaryo editörü + paylaşım repo'su

**Amaç:** Tıp fakültesi hocası kendi senaryosunu yazar → öğrencilere verir → sonuçları görür.

**Mekanizma:**
1. Eğitmen dashboard'u (Faz 2 backend ile)
2. Form tabanlı senaryo editörü (preset sistemi sayesinde kolay)
3. Öğrencilere atama
4. Performans analitiği (hangi adımda en çok takılıyorlar)
5. Opsiyonel: topluluk paylaşımı (senaryolar kütüphane olarak)

**Değer:** **Üniversite kurumsal lisansı satış argümanı.** "Bizim hocalarımız kendi müfredatlarını ekleyebilir" = satın alma kararı.

**Faz:** Faz 2 backend + Faz 5 içerik topluluğu.

---

## 6. Yapılacaklar — sırayla

### Hafta 1 — Farmakoloji motoru

- [ ] `src/engine/types.ts` → ilaç tipini genişlet (preset, modifier, band, kontrendikasyon)
- [ ] `src/engine/pharmacology/presets.ts` → ortak preset'ler tanımla
- [ ] `src/engine/pharmacology/engine.ts` → tick-bazlı motor, doz değerlendirme, modifier uygula
- [ ] `src/data/medications.ts` → mevcut 20 ilacı yeni formata geçir + 40 yeni ilaç
- [ ] `src/data/equipment.ts` → 20 yeni ekipman
- [ ] UI: monitör canlı tepki
- [ ] UI: kritik hata pop-up'ı

### Hafta 2 — Raporlama + içerik

- [ ] PDF export (debrief) — `jspdf` veya `react-pdf`
- [ ] Excel export (aksiyon geçmişi) — `xlsx` paketi
- [ ] 3. senaryo: DKA (dahiliye, seviye 2-4)
- [ ] 4. senaryo: Pediatrik sepsis (pediatri, seviye 2-4)

### Hafta 3 — Tasarım kimliği

- [ ] Mevcut UI denetimi — hangi yanlar jenerik?
- [ ] Renk paleti ve tipografi gözden geçir
- [ ] Logo + marka kimliği
- [ ] Ana sayfa, senaryo listesi, monitör görsel yenileme

### Sonraki fazlar

- [ ] Backend (Faz 2)
- [ ] Kalıcı raporlama (Faz 2)
- [ ] Hasta varyantları (Faz 1 sonu)
- [ ] 3D modül (Faz 3)
- [ ] Eğitmen editörü (Faz 2-5)
- [ ] İnter-profesyonel akış (Faz 2-3)
- [ ] TCCC modülü (Faz 4)

---

## 7. Yeni sohbet için başlangıç komutu

Yeni sohbet açıldığında şu mesajı kullan:

```
Merhaba. MediSim TR projesinde önceki bir sohbette tasarım kararlarını
verdik, docs/TASARIM-KARARLARI.md dosyasında kayıt altında. Önce zip'i
açıp bu dosyayı oku, sonra başla.

Şu an yapmak istediğim: [BURAYA YAZ]

Örnekler:
- "Farmakoloji motorunu kodlamaya başlayalım. types.ts'yi genişlet."
- "3. senaryo olarak DKA ekleyelim, zorluk seviyeli olsun."
- "STEMI'yi yeni motora uyarlayalım."
- "Tasarım kimliği üzerine çalışalım, mevcut UI'ı denetleyelim."
```

---

**Bu doküman kararların canlı kaydıdır. Her büyük karar değişikliği buraya işlenir.**
