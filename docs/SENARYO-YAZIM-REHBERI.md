# Senaryo Yazım Rehberi

**Hedef:** Bir hekim/hemşire/sağlık profesyoneli olarak kendi senaryonu yazmak.

Kod bilmek zorunda değilsin — ama senaryo dosyası belli bir formata uymalı.
Claude Code'a yazdığın taslağı vererek bu formatı kendisi kurabilir. Bu
rehber "ne tür bilgiler vermen gerektiğini" anlatır.

---

## Bir senaryoda olması gerekenler

### 1. Vaka künyesi

- **Başlık:** "62 yaş erkek, göğüs ağrısı" gibi klinik özet
- **Uzmanlık alanı:** kardiyoloji, dahiliye, acil, pediatri, askeri-tccc...
- **Zorluk:** 1 (basit) — 5 (zor)
- **Tahmini süre:** kaç dakika oynanacak (5-20)
- **Etiketler:** `stemi`, `hipertansiyon`, `şok` gibi arama kelimeleri

### 2. Hasta profili

- Yaş, cinsiyet, kilo, boy
- Ana şikayet (1-2 cümle, hastanın ifadesiyle)
- Özgeçmiş: kronik hastalıklar, kullandığı ilaçlar, ameliyatlar
- Alerjiler (varsa, yoksa boş bırak)

### 3. İlk vital bulgular

Nabız, TA (sistolik/diyastolik), SpO₂, ateş, solunum sayısı,
(varsa) kan şekeri, ağrı skoru, GKS.

### 4. Kullanılabilir envanter

Senaryoda hangi ilaçlar ve ekipmanlar erişilebilir olsun? Hepsini koymana
gerek yok — sadece bu vakada ihtiyaç duyulabilecekler. Örneğin STEMI için
tromboliz, aspirin, heparin, defibrilatör, EKG önemli; ama ateşli silah
yarası için turnike, combat gauze.

### 5. Adımlar (en önemli kısım!)

Senaryonun kalbi. Her adım şu üç türden biridir:

#### Aksiyon adımı (action)
Öğrenci envanterden bir şey seçiyor.

Örnek:
> **Adım 1 — İlk Değerlendirme**
> "Hasta geldi, ilk 2 dakikada ne yaparsın?"
>
> Beklenen aksiyonlar:
> - EKG → +20 puan, "İlk 10 dk içinde zorunlu"
> - Monitör bağla → +15 puan
> - IV yolu aç → +15 puan
> - Morfin ver → −5 puan, "Erken tercih değil"
> - Metoprolol IV → **−15 puan (kritik)**, "STEMI'de erken IV BB riskli"

Her aksiyon için **puan değeri** ve **feedback** (doğruysa neden doğru,
yanlışsa neden yanlış) yazmalısın. Bu en uzun iş ama en değerli kısım.

#### Karar adımı (decision)
Çoktan seçmeli soru.

Örnek:
> **Adım 2 — EKG Yorumu**
> "V1-V4'te ST elevasyonu var. Tanın ne?"
>
> Seçenekler:
> - Anterior STEMI → ✅ doğru, +30 puan
> - NSTEMI → ❌, −15 puan, "ST elevasyonu var, bu STEMI"
> - Perikardit → ❌, −10 puan, "Lokalize, diffüz değil"
> - Erken repolarizasyon → ❌, −20, "Klinik uyumsuz, asla atlanmaz"

Opsiyonel olarak bir **görüntü** ekleyebilirsin (EKG fotoğrafı, radyolojik
görüntü, lab sonucu). Şu an görüntü placeholderı gösteriliyor, gerçek
görüntü entegrasyonu sonraki fazda.

#### Bilgi adımı (info)
Öğrenciye bir metin gösterir, sadece "Devam" der. Geçiş/bilgi için.

### 6. Puanlama

- **Max puan:** tüm adımların max puanı toplamı
- **Geçme notu:** genelde %60
- **Harf notları:** A (90%+), B (75%), C (60%), D (45%)

### 7. Debrief (senaryo sonu)

Bu kısım çok önemli — öğrencinin **ne öğrendiği** burada pekişiyor.

- **Temel öğrenim noktaları** (5-7 madde) — vakada yoğunlaşılan klinik bilgiler
- **Kaynaklar** — hangi kılavuz/makale referans (ESC 2023, TKD, AHA...)
- **Red flag'lar** (opsiyonel) — bu vakada atlanırsa hayati olacak noktalar
- **Önerilen sonraki senaryolar** (opsiyonel)

---

## Yazım ipuçları

### İyi bir senaryo için

1. **Gerçek vakaya dayan** — kitap vakası değil, klinik deneyimden
2. **Tuzaklar koy** — "cazip ama yanlış" aksiyonlar (öğrenci'nin refleksle
   yaptığı ama aslında kontrendike olanlar). Bu pedagojik olarak en güçlü
   kısım.
3. **Referansla** — "ESC 2023 Class I" gibi. Öğrenci "neden böyle" sormasın.
4. **Feedback yaz** — sadece "doğru/yanlış" yeterli değil, "neden" açıkla.
   Bu debrief'in yarısı kadar değerli.

### Zorluk kalibrasyonu

| Zorluk | Kim için | Adım sayısı | Tuzak sayısı |
|---|---|---|---|
| 1 | 3. sınıf tıp öğrencisi | 3-4 | az, açık |
| 2 | 4-5. sınıf, hemşire | 4-5 | orta |
| 3 | Mezun/asistan | 5-6 | çok, ince |
| 4 | Uzman, subspeciality | 6-8 | atipik sunumlar |
| 5 | Nadir, yaşam tehdit edici + zamanlı | 6-10 | çoklu eş zamanlı karar |

### Süre tahmini

Her adım ortalama 1-2 dk. 5 adımlık senaryo ≈ 8-12 dk.

---

## Senaryo taslağı — Claude Code'a verilecek format

Aşağıdakini bir Word/Google Docs dosyasına yaz, Claude Code'a ver. O gerisini
halleder (TypeScript dosyasını yazar, doğrular, projeye ekler).

```markdown
# Senaryo: [Başlık]

Uzmanlık: kardiyoloji
Zorluk: 3/5
Süre: ~12 dk
Etiketler: stemi, acil, kardiyak
Referans kılavuzlar: ESC 2023, TKD 2022

## Hasta
- 65 yaş erkek, 80 kg
- Ana şikayet: 2 saattir süren göğüs ağrısı
- Özgeçmiş: HT, DM, sigara (30 paket-yıl)
- Alerji: yok

## İlk Vitaller
HR 104, TA 148/92, SpO₂ 94, ateş 36.7, solunum 22, ağrı 8/10

## Envanter
İlaçlar: aspirin, klopidogrel, heparin, nitrogliserin, morfin, metoprolol
Ekipman: EKG, monitör, IV kateter, defibrilatör, oksijen maskesi

## Adımlar

### 1. [action] İlk değerlendirme
Prompt: "İlk 2 dakikada ne yaparsın?"
Min 3 aksiyon gerekli.

Doğru aksiyonlar:
- EKG: +20, "İlk 10 dk zorunlu (ESC)"
- Monitör: +15, "Sürekli ritim takibi şart"
- IV kateter: +15, "Tedavi için gerekli"

Yarı doğru:
- Oksijen maskesi: +5, "SpO₂ 94 sınırda, rutin değil"

Yanlış:
- Morfin: -5, "Rutin önerilmiyor (CRUSADE)"
- Metoprolol IV: -15 [KRİTİK], "Erken IV BB hemodinamik risk"

### 2. [decision] EKG yorumu
Prompt: "EKG'de V1-V4 ST elevasyonu var. Tanın?"
Görüntü: ecg_anterior_stemi.png

Seçenekler:
- Anterior STEMI [DOĞRU, +30]: "LAD oklüzyonu, acil reperfüzyon"
- NSTEMI [-15]: "ST elevasyonu var"
- Perikardit [-10]: "Lokalize ve konveks, STEMI"
- Erken repolarizasyon [-20]: "Klinik uyumsuz, atlama"

### 3. [action] İlk tedavi
...

### 4. [decision] Reperfüzyon stratejisi
...

## Puanlama
Max: 200
Geçme: 120
A: 170, B: 145, C: 120, D: 95

## Debrief
Öğrenim noktaları:
1. STEMI'de ilk 10 dk EKG zorunlu
2. Anterior STEMI = LAD
3. Kapı-balon < 120 dk ise PCI
4. İkili antiplatelet + antikoagülan
5. Morfin rutin değil (CRUSADE)

Kaynaklar:
- ESC 2023 STEMI Kılavuzu
- TKD AKS 2022

Red flags:
- Hipotansiyon → RV MI? kardiyojenik şok?
- VT/VF → hemen defibrilasyon
```

---

## Mevcut senaryoları inceleme

Mevcut örneklerin kod halini `src/data/scenarios/` içinde bulabilirsin:

- [stemi.ts](../src/data/scenarios/stemi.ts) — 5 adımlı kardiyoloji vakası
- [anaflaksi.ts](../src/data/scenarios/anaflaksi.ts) — 4 adımlı acil vakası

Bunlara bakarak "nasıl görünmesi gerektiğini" anlarsın. Yeni senaryo
eklerken Claude Code'a "anaflaksi.ts'e benzer yapıda şu senaryoyu ekle"
diyebilirsin.

---

## Sık sorulan

**S: İlaç dozu nasıl veriliyor?**
C: Envanterdeki her ilaçta `default_dose` var (örn. "300 mg PO"). Öğrenci
sadece ilacı seçiyor, doz şimdilik otomatik. İleride doz hatası modu
eklenecek.

**S: Aynı aksiyon iki kez yapılırsa ne olur?**
C: Şu an her ikisi de puanlanıyor. İleride "zaten yaptın" uyarısı
eklenecek.

**S: Çıkmaz sokağa düşersek?**
C: Min aksiyon sayısını karşıladıktan sonra "Sonraki adıma geç" butonu
çıkar. Zorunlu doğru aksiyon yoksa ilerleyebiliyor.

**S: Çoklu doğru cevap?**
C: Aynı adımda birden fazla doğru aksiyon olabilir. Öğrenci birini
yaparsa puan alır, ikisini yaparsa ikisinin puanı toplanır.

**S: Karar noktasında birden çok doğru?**
C: Şu an tek doğru seçenek. Birden fazla doğru seçenek yapısı ileride
eklenecek.
