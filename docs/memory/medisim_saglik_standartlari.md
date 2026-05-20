---
name: MediSim — Sağlık Veri Standartları & Türkiye Regülasyonu
description: Uluslararası ve Türkiye sağlık kodlama, interoperability ve veri koruma standartları. Senaryo / API / veri tabanı şeması tasarımında bu dosyaya bak.
type: reference
originSessionId: 0bba8189-fb17-45da-90c4-0cbc0bc9f4a3
---
## Uluslararası Standart Aileleri (4 kategori)

| Kategori | Standart | Kullanım |
|---|---|---|
| **Mesajlaşma / Transport** | HL7 v2.x | Eski hastane sistemleri (LIS/RIS). Hâlâ %90+ HIE veri akışı bunun üzerinden. |
| | HL7 FHIR (R4/R4B/R5) | Modern API tabanlı (REST + JSON/XML). 2025'te 70+ ülke FHIR'i en az bir use case'te kullanıyor. R4 yaygın stable, R5 yeni. |
| | DICOM | Tıbbi görüntüleme (CT, MR, US, EKG dahil). Protokol + format. |
| **Terminoloji / Kodlama** | ICD-10 / ICD-11 | Tanı kodları. ICD-10 hâlâ baskın (Türkiye dahil). ICD-11 WHO tarafından 2022'de yayınlandı, SDK + FHIR uyumlu. |
| | SNOMED CT | En geniş klinik terminoloji (concept-based, ~350k kavram). Tanı + prosedür + bulgu. FHIR Condition.code'da kullanılır. |
| | LOINC | Lab/gözlem kodları (TSH, hemoglobin, kan basıncı vb.). FHIR Observation.code'da kullanılır. |
| | RxNorm | İlaç kodlaması (ABD). Türkiye'de ATC kodları yaygın. |
| | ATC | İlaç sınıflama (WHO, uluslararası). Türkiye dahil. |
| **Belge** | CDA / C-CDA | Klinik belge yapısı (eski). FHIR Bundle'a doğru kayıyor. |
| **Profil** | US Core, IPS | Ulusal/uluslararası FHIR profilleri. Türkiye'de TR-FHIR çalışmaları sürüyor. |

### MediSim Stratejisi

| Veri | Birincil kod | İkincil |
|---|---|---|
| Tanı (senaryo `clinical_codes.icd10`) | ICD-10 | SNOMED CT eşleştirme |
| Lab parametresi | LOINC | — |
| İlaç | ATC | RxNorm referansı |
| Veri taşıma | FHIR R4 JSON | (gelecekte) |
| Görüntü (X-ray, EKG snapshot) | DICOM metadata + JPEG/PNG | — |

## Türkiye Sağlık Sistemi (2025)

### Sağlık Bakanlığı / Ulusal Sistemler

| Sistem | İşlev |
|---|---|
| **USS** (Ulusal Sağlık Sistemi) | Sağlık Bakanlığı veri toplama omurgası. Tüm hastane verileri buraya akar. |
| **e-Nabız** | Bireysel hasta dosyası (kişisel sağlık kaydı). 2025 yönetmelik değişikliği ile güvenlik tercihleri bireyin kontrolünde; acil durumda override edilebilir. |
| **MHRS** | Merkezi Hekim Randevu Sistemi. e-Reçete + e-Rapor MHRS üzerinden uzaktan sağlık hizmetinde verilebiliyor. |
| **USVS** | Ulusal Sağlık Veri Sözlüğü — Türkiye spesifik veri standartı (içeride SKRS kullanır). |
| **SKRS** | Sağlık Kodlama Referans Sunucusu — Türkiye'ye özel kod listeleri (laboratuvar parametre, tetkik, vs.). |

### SGK / Geri Ödeme

| Sistem | İşlev |
|---|---|
| **SUT** (Sağlık Uygulama Tebliği) | SGK'nın ödediği hizmet/ilaç listesi + fiyatları. Resmi mevzuat: mevzuat.gov.tr No.17229. 2025 yıllık tebliği yayınlandı (25 Ocak 2025). |
| **Medula** | SGK hastane provizyon + reçete sistemi. Hastane SGK'ya fatura keserken kullanır. |
| **e-Reçete** | Doktorun yazdığı dijital reçete; eczane Medula üzerinden okur. |
| **e-Rapor** | Sağlık raporu (iş göremezlik, ilaç ödeme rapor vb.). |

### Kişisel Sağlık Verileri Yönetmeliği (KVKK)

**3 Aralık 2025 güncellemesi** (kritik):
- Sağlık verisi işleme **KVKK Madde 6/3** çerçevesinde, **sadece sunulan hizmetin gerektirdiği kadar**.
- e-Nabız güvenlik tercihleri **kullanıcı kontrolünde** — bireysel olarak hangi sağlık kuruluşu hangi veriye erişebilir bireyin tercihine bağlı.
- **Acil durum override:** Acil servis / yatış gibi geciktirilmesi tıbbi risk yaratan durumlarda güvenlik tercihleri uygulanmaz.
- **Açık rıza şartı:** Kapsam genişletilebilir alanlarda (örn. araştırma, eğitim) açık rıza şart.

### MediSim Uyum Listesi

- ✅ Senaryolarda `clinical_codes.icd10` (Faz 9 ile 14 senaryoya eklendi)
- ⏳ `snomed_ct` mapping (DRAFT)
- ⏳ Lab parametreleri için LOINC (`lab_panels` içinde belirtilebilir)
- ⏳ İlaç ATC kodları (`medications-extended.ts` içinde `atc?: string`)
- ⏳ FHIR export — uzun vadeli hedef
- ✅ Gerçek hasta verisi YOK — eğitim simülasyonu, KVKK kapsam dışı (ama klinik dosya disiplini sürdürülmeli)
- ⏳ SUT / SGK ödeme kuralı opsiyonel `scenario.sut_notes?` alanı

## Kaynaklar

- [SUT 2025 mevzuat (Resmi Gazete)](https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=17229&MevzuatTur=9&MevzuatTertip=5)
- [e-Nabız (Sağlık Bakanlığı)](https://enabiz.gov.tr/)
- [KVKK Kişisel Sağlık Verileri 2025 değişikliği](https://www.hanyaloglu-acar.av.tr/malpraktis-tazminat/kisisel-saglik-verileri-yonetmeligi-degisikligi-2025)
- [HL7 FHIR (resmi)](https://hl7.org/fhir/)
- [ICD-11 (WHO)](https://icd.who.int/browse11/)
- [SNOMED CT International](https://www.snomed.org/)
- [LOINC](https://loinc.org/)
- [2025 Healthcare Standards genel bakış (TechTarget)](https://www.techtarget.com/searchhealthit/feature/What-are-the-top-8-healthcare-data-and-coding-standards)
