---
name: calgary-cambridge
description: Calgary-Cambridge Guide (Silverman/Kurtz/Draper 1998, 71 beceri) — anamnez ve hekim-hasta görüşme process backbone. SAMPLE + OPQRST + SPIKES yapılarını içerir. AI hasta diyaloğu (Sprint B.2), DialogChat component, senaryo `history` field tasarımında bu skill'i kullan.
---

# Calgary-Cambridge — Anamnez Process Backbone

## Ne zaman kullan

- Sprint B.2 AI hasta diyaloğu (Gemini prompt engineering)
- DialogChat component stage stepper tasarımı
- Senaryo `history` field doldururken (Master rapor 9.C)
- Anamnez UI flow (yön gösterici prompt'lar)
- Eğitim debrief — "Calgary-Cambridge'ya göre eksik adım" geri bildirimi

## 5 Aşama (process backbone)

| Aşama | TR | İçerik | Beceri sayısı |
|---|---|---|---|
| 1. **Initiating** | Karşılama | Hazırlık, ilk karşılaşma, görüşme amacı, müzakere | 11 |
| 2. **Gathering Information** | Anamnez | Hastanın hikayesi, exploration, history, summary | 26 |
| 3. **Physical Examination** | Fizik Muayene | Sistemik muayene + hasta rahatlığı | (entegre) |
| 4. **Explanation & Planning** | Açıklama & Plan | Bilgi paylaşımı, ortak karar, gelecek planları | 17 |
| 5. **Closing the Session** | Kapanış | Özetleme, sorular, planlama doğrulama | 6 |
| **Building Relationship** | (sürekli) | Nonverbal, empati, ilgi, kontrol paylaşımı | 8 |
| **Providing Structure** | (sürekli) | Görüşme yapısı, özet, signposting | 3 |

**Toplam:** 71 beceri.

## Anamnez yapıları (Gathering aşamasının alt bileşenleri)

### SAMPLE (TR-acil-kolay)

| Harf | Anlam | TR |
|---|---|---|
| **S** | Signs/Symptoms | Belirtiler |
| **A** | Allergies | Alerjiler |
| **M** | Medications | İlaçlar |
| **P** | Past medical history | Geçmiş hastalık |
| **L** | Last oral intake | Son yenilen |
| **E** | Events | Olay öyküsü |

### OPQRST (ağrı odaklı, TCCC/EMS)

| Harf | Anlam | Soru örneği |
|---|---|---|
| **O** | Onset | Ne zaman başladı? Aniden mi yavaşça mı? |
| **P** | Provocation/Palliation | Ne arttırıyor / azaltıyor? |
| **Q** | Quality | Nasıl bir his — yanma, sıkıştırma, sızlama? |
| **R** | Region/Radiation | Yer + yayılım |
| **S** | Severity | 0-10 şiddet skalası |
| **T** | Time | Süresi, aralıklı mı sürekli mi? |

### SPIKES (kötü haber verme, Hacettepe/Marmara TR adapte)

| Harf | Anlam |
|---|---|
| **S** | Setting (ortam) |
| **P** | Perception (hasta algısı) |
| **I** | Invitation (davet, ne kadar bilmek ister) |
| **K** | Knowledge (bilgi paylaşımı) |
| **E** | Emotions (empati) |
| **S** | Strategy/Summary |

## Gemini prompt engineering (Sprint B.2)

Calgary-Cambridge backbone → system prompt yapısı:

```
SEN: Türk sanal hasta. {age} yaş, {sex}, {chief_complaint}.
GEÇMİŞ: {history_items}, {current_medications}, {allergies}.

KURALLAR:
1. Gerçek hasta gibi konuş — kısa, doğal, kendiliğinden tüm semptomları söyleme.
2. Öğrenci sormadıkça detay verme.
3. Tıp jargonu KULLANMA ("kostokondrit" değil "göğsümde sızı").
4. Calgary-Cambridge aşamasına saygı:
   - "Initiating"de selam ver, kendini tanıt.
   - "Gathering"de SAMPLE/OPQRST sorularına detay ver.
   - "Explanation"da öğrencinin açıklamasına "anladım mı?" diye yaklaş.

ŞU ANKİ AŞAMA: {currentStage}
```

Qin et al. JMIR Kasım 2025 meta-analizi: chain-of-thought + few-shot + role-play kombinasyonu medikal LLM için en iyi.

## DialogChat component'ında uygulanan kurallar

- Stage stepper en üstte (5 aşama)
- Önerilen prompt'lar stage'e göre değişir
- Otomatik stage geçişi turn sayısına bağlı (initiating→gathering: 2, gathering→exam: 8, exam→explanation: 12, explanation→closing: 14)
- Manuel stage atlama da var (stepper'a tıkla)

## Senaryo `history` field eşleme (Master rapor 9.C)

```typescript
history: {
  chief_complaint: string;            // E (Events) ana ifade
  hpi: string;                        // OPQRST detayı
  pmh: string[];                      // P (Past medical history)
  psh: string[];                      // Geçmiş cerrahi
  family_history: string[];
  social_history_detailed: string;
  medications: string[];              // M
  allergies_detailed: string;         // A
}
```

## Gotchas

- ❌ "Gathering"de öğrencinin hangi soruyu sorduğunu **dinleme**dik → hasta her şeyi anlatır. SAMPLE/OPQRST disiplini öğretici değil.
- ❌ AI hastayı "yardımcı asistan" gibi davrandırma — gerçek hasta bilmediği şeyi de söylemez ("kanım kaç?" → "bilmiyorum")
- ❌ Tıbbi jargon — hasta günlük dil kullanır
- ✅ Building Relationship + Providing Structure **sürekli akışta**, ayrı aşama değil — debrief'te öğrenciye empati becerisi geri bildirimi
- ✅ "Explanation"da hekim **açıklayan**, hasta **dinleyen** — rol değişir. AI hasta "anlıyorum" + soru sorabilir.

## Türkçe dil uyumu

- Tu/siz kullanımı: hasta yaş>18 → "siz", çocuk → "sen" (anne/baba ile)
- Selamlaşma: "İyi günler doktor" / "Merhaba"
- Belirsizlik: "Tam bilmiyorum", "Şöyle bir şey"
- Şikayet ifadesi: "Karnım ağrıyor" değil "Karnımda ağrı var" (klinik dilden günlüğe doğal kaymalar)

## Referans dosyalar

- `src/components/dialog/mockDialogResponder.ts` — mevcut mock implementasyon
- `src/components/dialog/DialogChat.tsx` — UI stepper
- `docs/MASTER-REPORT-v3.md` Bölüm 5 — AI diyalog kararları
- Calgary-Cambridge orijinal: Silverman J, Kurtz S, Draper J (1998); Kurtz Acad Med 2003
- Bayram et al. 2025 — TR medikal LLM training data (167K Q&A)
