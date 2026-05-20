---
name: kvkk-compliance
description: KVKK 6698 + 24 Kasım 2025 Üretken Yapay Zekâ Rehberi + 12 Mart 2024 yurt dışı aktarım esnetilmesi. Hasta verisi/öğrenci PII içeren her commit, AI çağrı, veri saklama kararından önce bu skill ile kontrol et.
---

# KVKK Compliance — MediSim TR

## Ne zaman kullan

- Hasta verisi içeren senaryo veya component eklerken
- AI (Gemini, ElevenLabs, Azure TTS) çağrısı yazarken
- Öğrenci PII (TC, ad, e-posta, performans) saklayan endpoint/şema tasarımında
- Yurt dışı veri aktarımı içeren entegrasyonlarda (Cloudflare, Google, OpenAI)
- Pre-commit kontrol (KVKK PII scanner skill ile birlikte)
- Aydınlatma metni / açık rıza akışı tasarlarken

## Birincil veri kaynağı

⭐ **Memory:** `memory/medisim_saglik_standartlari.md` — Türkiye KVKK + USS bölümü.
**Master:** `docs/MASTER-REPORT-v3.md` Bölüm 10.

## Temel kurallar

### 1. KVKK m.6 — Sağlık verisi (özel nitelikli)

- **Açık rıza** (granular, geri çekilebilir, belge bırak)
- m.6/3 istisnaları MediSim'de **uygulanmaz**

→ Açık rıza şart. Aydınlatma metni `src/legal/kvkk-aydinlatma.tsx` (hukuk danışmanı onaylı).

### 2. ÜYZ Rehberi (24 Kasım 2025, 64 sayfa, kvkk.gov.tr/Icerik/8547)

- **Privacy by design + by default** zorunlu
- **VKED** (Veri Koruma Etki Değerlendirmesi) zorunlu
- Her ÜYZ adımı (geliştirme/çalıştırma/çıktı) **bağımsız işleme faaliyeti**

### 3. Yurt dışı aktarım (m.9)

- **12 Mart 2024, 7499 sayılı Kanun** esnetildi
- Standart sözleşmeler + bağlayıcı kurumsal kurallar kabul
- Gemini API + Cloudflare → **standart sözleşme imzalanmalı**
- Cloudflare BAA Workers/DO kapsamı yazılı doğrulama ZORUNLU

### 4. Hasta-kullanıcı veri ayrımı (KRİTİK)

| Veri tipi | KVKK kapsam | Tedbir |
|---|---|---|
| **Öğrenci PII** (TC, ad, e-posta, performans) | ✅ m.6 özel nitelikli savunmacı | Açık rıza + minimize + encryption + retention |
| **Sentetik hasta verisi** (vakalar, AI diyalog) | ❌ Gerçek kişiye bağlı değil | KVKK dışı, klinik dosya disiplini sürer |

## Pre-commit kontrol listesi

- [ ] PII sızıntısı yok mu? (.env, credentials, gerçek hasta adı, TC)
- [ ] API key/secret commit edilmiyor mu?
- [ ] Açık rıza akışı güncel mi?
- [ ] Yeni AI çağrısı varsa standart sözleşme listesinde mi?
- [ ] Retention süresi tanımlı mı?
- [ ] Disclaimer var mı? "Eğitim amaçlıdır, klinik karar destek değildir"

## Gotchas

- ❌ Gerçek hasta adı commit etme — SAMPLE/DEMO marker ile sentetik kullan
- ❌ `.env`, `.env.local`, `credentials.json` commit etme — .gitignore'da olsa bile dikkatli
- ❌ ÜYZ rehberi: her ÜYZ adımı **bağımsız işleme** — input + output ayrı dayanak
- ❌ Cloudflare BAA ≠ KVKK uyum. KVKK için **m.12 veri işleyici sözleşmesi** ayrı.
- ✅ Senaryolar sentetik — KVKK kapsam dışı ama disclaimer şart
- ✅ Öğrenci performans kayıt: ayrı tablo, anonim oturum id ile bağlı

## Tıbbi cihaz yazılımı sınırı

**MediSim TR EĞİTİM SİMÜLATÖRÜ — tıbbi cihaz DEĞİL.**
Sınır: "tanı önerisi" verirse MDSW → AB MDR + TR TİTCK ruhsatı gerek.
→ **Her sayfada "Eğitim amaçlıdır" disclaimer ZORUNLU.**

## Slash komut entegrasyonu

`/kvkk-pii-scanner` mevcut — commit öncesi tarama, bu skill ile birlikte kullan.

## Referans dosyalar

- `memory/medisim_saglik_standartlari.md`
- `docs/MASTER-REPORT-v3.md` Bölüm 10
- kvkk.gov.tr/Icerik/8547
