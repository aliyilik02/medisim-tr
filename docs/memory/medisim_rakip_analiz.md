---
name: MediSim — Rakip Analizi & Diferansiyatör
description: Body Interact (web tabanlı en yakın rakip) ve fiziksel manken/AR rakiplerinin özellikleri; MediSim TR'nin diferansiyatör noktaları.
type: reference
originSessionId: 0bba8189-fb17-45da-90c4-0cbc0bc9f4a3
---
## Rakip Karşılaştırma Tablosu

| Ürün | Tip | Anim/Görsel | Ses | Türkiye uyumu | MediSim TR avantajı |
|---|---|---|---|---|---|
| **Body Interact** | Web/iPad | 22 blendshape (blink, mouth, lips, brows), rig'li eye/jaw/neck/torso/breathing/arms/fingers/legs | Lifelike kalp/akciğer/breath sesleri | ❌ (İngilizce/PT/ES) | Türkçe, TKD/SUT, ATT yetki |
| **Gaumard HAL S2225 (ped.)** | Fiziksel manken | Dinamik yüz mimiği, göz hareketi, konuşma | SpO2, EKG, kapnograf, NIBP, pace, defib | Fiziksel ürün, sadece import | Web → her cihaz, 0 maliyet |
| **Laerdal SimMan 3G/Critical Care** | Fiziksel manken | Bling, mouth, nefes, kan dolaşımı | Tam fizyolojik | ~$25k+, eğitim merkezleri | Web simülasyonu öncesi/destekleyici |
| **CAE / Elevate (Maestro AR)** | Manken + AR | AR ile iç organ görüntü | Tam | Üniversite tier | Sadece web, lisans gerektirmez |
| **Anatomage Table** | Touch-table | 3D dijital cadaver, dissection | Yok (anatomi odaklı) | Üniversite tier | Senaryo + karar verme odaklı |

## Body Interact — Detaylı (Bizim hedef rakip)

**Teknik temel:**
- Web tabanlı + native iOS/Android (cross-platform)
- 22 blendshape ile yüz mimiği (Maya/Blender → glTF blend shape)
- Skeletal rig: göz küresi, çene, boyun, gövde, kollar, parmaklar, bacaklar — hepsi ayrı
- Solunum → torso + chest + abdomen kombinasyonlu animasyon (sadece chest shader değil)
- Wolters Kluwer ile partnership (içerik dağıtım)

**Klinik akış (ABCDE approach):**
- **A**irway: Hava yolu değerlendirme + manevralar
- **B**reathing: Solunum, oksijen, ventilasyon
- **C**irculation: Nabız, kan basıncı, IV erişim
- **D**isability: Bilinç düzeyi, GCS, pupil
- **E**xposure: Cilt, yara, ısı, tam vücut muayene

→ Real-time vitals değişimi, hasta kararlara reaksiyon, debrief.

**Görsel özellikleri:**
- Gerçekçi ışıklandırma, deri tonu varyasyonu
- Senaryo ortamı (hastane odası, ambulans, savaş alanı vb.)
- Renk/sıvı efektleri (siyanoz, kanama, terleme)

**Eksik gördüğümüz (bizim diferansiyatör fırsatı):**
- Türkçe yok → MediSim TR Türkçe-ilk
- TKD/SUT/112 protokolü yok → bizde
- ATT/UMKE yetki sınırları yok → bizde
- Türkiye spesifik vakalar (örn. Kafkasya hijama, Türkiye coğrafyası epidemiyolojik vakalar) yok → bizde

## MediSim TR Diferansiyatör Stratejisi

1. **Türkçe-ilk, Türkiye-ilk**
2. **Klinik kılavuz uyumu** — TKD 2022, ESC 2023, AHA 2022, SUT 2025
3. **ATT/UMKE/112 senaryoları** — saha sağlığı (askeri TCCC dahil)
4. **Açık kaynak senaryo formatı** — TypeScript object, klinisyenin düzenleyebileceği
5. **Eğitim ekosistemi entegrasyonu** — TUS, EHU, USS uyumlu çıktılar
6. **Düşük maliyet** — web tabanlı, hardware yok

## Görsel Kalite Hedefi (rakiple eşitleme için yol)

| Özellik | Body Interact | Bizim mevcut (B.2.3) | Sprint hedefi |
|---|---|---|---|
| Tam beden 3D | ✅ | ✅ (chuma6oy) | — |
| Anatomik marker'lar | ✅ | ✅ | — |
| Solunum animasyonu | ✅ (rig+morph) | ✅ (shader, sade) | B.4.1: iyileştir |
| Göz blink/açma | ✅ | ❌ | B.4.2: blend shape veya overlay |
| Ağız hareketi | ✅ | ❌ | B.4.3: jaw + lip morph |
| Pupil ışık refleksi | ✅ | ❌ | B.4.4 (kolay: shader uniform) |
| Auskültasyon sesi | ✅ | ❌ | B.4.5: Web Audio API |
| Siyanoz / cilt rengi | ✅ | ❌ | B.4.6: shader material override |
| Kanama / sıvı efekti | ✅ | ❌ | B.5 (sonraki sprint) |
| Ortam (oda, ambulans) | ✅ | ❌ | B.6 (sonraki sprint) |

## Kaynaklar

- [Body Interact resmi](https://bodyinteract.com/)
- [Body Interact + Wolters Kluwer (Lippincott)](https://www.wolterskluwer.com/en/solutions/lippincott-medicine/medical-education/body-interact-virtual-patient-care-simulator)
- [Body Interact teknik makale (SIM Healthcare)](https://journals.lww.com/simulationinhealthcare/fulltext/2020/04000/the_physical_virtual_patient_simulator__a_physical.9.aspx)
- [Gaumard HAL](https://www.healthysimulation.com/human-patient-simulator/)
- [Laerdal SimMan](https://www.healthysimulation.com/vendors/laerdal-medical/)
- [Anatomage Table](https://medvisionsim.com/blog/medical-simulation-companies-redefining-healthcare-education-safety)
