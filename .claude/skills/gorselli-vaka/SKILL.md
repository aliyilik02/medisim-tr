---
name: gorselli-vaka
description: Görselli vaka akışı (/vaka/:id) üretim + müdahale rehberi — arketip×ortam görsel setleri, Higgsfield kare üretim disiplini (karakter tutarlılığı), kalıcı iz katmanı (D kararı, kombo sınırı), aksiyon çözümleme zinciri, monitör kanal aktivasyonu. Yeni görsel set eklerken, aksiyon karesi bağlarken, durum varyantı üretirken, CaseStage/manifest değişikliği yaparken bu skill'i kullan.
---

# Görselli Vaka Akışı — İş Tipi Rehberi

2D pivot'un vaka oynatıcısı: hasta DURUM görseli deterioration ile değişir,
her müdahale AKSİYON ara-sahnesi tetikler, takılan ekipman KALICI İZ bırakır.
"Hasta hissi olan MedCase" (Ali Bey vizyonu, 12 Tem 2026).

## Dosya haritası (değişiklik nereye?)

| Katman | Dosya | Ne yapar |
|---|---|---|
| Manifest | `src/visuals/visual-manifest.ts` | (arketip×ortam) → görsel seti; senaryo görsel yolu TAŞIMAZ |
| Çözümleme | `src/visuals/action-visuals.ts` | ActionRef → AksiyonKey (3 basamaklı zincir) |
| Kalıcı iz | `src/visuals/persistent-traces.ts` | iz triyajı + durum varyant önceliği (saf TS, React YOK) |
| Sahne | `src/components/case-visual/CaseStage.tsx` | durum crossfade + ara-sahne + çip şeridi |
| Sayfa | `src/pages/VisualCasePlayPage.tsx` | motor bağı + monitör kanalları + responsive yerleşim |
| Severity | `src/clinical/visual2d-mapper.ts` | vitals → 5 durum evresi (çift-eşik + minHold) |
| Kapı | `tests/visuals/*.test.ts` | dosya-varlık + öncelik zinciri + 13/13 sayaç |
| Üretim listesi | `docs/GORSEL-IHTIYAC-LISTESI.md` | Higgsfield tarif tablosu (kare başına prompt) |

## Çekirdek kararlar (İHLAL ETME)

1. **Ölçekleme modeli:** Görseller senaryoya değil (arketip×ortam) setine
   bağlı — 400 senaryo, ~15 set. Senaryoya özel görsel EKLENMEZ.
2. **D kararı (kalıcı iz):** SADECE maske görsel-kalıcı iz (durum varyantı).
   IV/EKG/monitör/manşon → cyan çip şeridi. İstisna: maske+EKG kombosu
   (`durumMaskeEkg`, yalnız baseline) — **BAŞKA KOMBO ÜRETİLMEZ**
   (kombinatoryal patlama sınırı, Ali Bey 13 Tem).
3. **Öncelik zinciri:** kombo → maske → base; her eksik basamak alta düşer.
   **ARREST çifte emniyet:** arrest'te maske/kombo ASLA seçilmez (klinik:
   BVM/entübasyon) + testi var + manifest'e arrest varyantı eklemek test kırar.
4. **Zarif düşüş her yerde:** kare yoksa banner-only, set yoksa görselsiz oyun.
   Görsel katman motoru ASLA kilitlemez.
5. **Kırpma yok:** oynatıcı `object-contain` (13 Tem kararı — kol/saç kesilmez,
   letterbox kabul). Kutu 3:4 varsayımlı ama her oran güvenli.
6. **Monitör kanalları ekipmana bağlı:** VitalMonitorScreen `channels` prop'u —
   takılmayan probdan veri/alarm gelmez; ölümcül-ritim bandı EKG'siz görünmez.

## Higgsfield üretim disiplini (karakter tutarlılığı)

- Master kare = `durum-01-baseline.png`. Yeni kare SERBEST üretilmez —
  baseline image-to-image/edit girdisi olur, eller/ekipman EKLENİR.
  İstisna: defibrilasyon arrest karesinden (durum-05) türetilir.
- Personel: SADECE eldivenli el/önkol kadrajda — yüz girmez (kimlik + KVKK).
- Format: PNG, portre ~3:4, min 1024×1365.
- Teslim gelince SIRALAMA: indir → **Read ile spot içerik kontrolü** (karakter
  aynı mı, ekipman doğru mu, tüp renkleri gibi spec detayları) → public'e koy →
  manifest'e ekle → `npx vitest run tests/visuals` (varlık kapısı) → e2e vaka.
- Motion turu (gelecek): aynı dosya adı `.mp4`, manifest `video` alanı —
  CaseStage `video ?? src` zaten seçiyor.

## Yeni aksiyon türü ekleme (sıra)

1. `AksiyonKey` union'ına anahtar (`visual-manifest.ts`)
2. `AKSIYON_LABELS`'a TR banner etiketi (`action-visuals.ts`)
3. Çözümleme: `EXACT` (id birebir) veya kategori/veriliş-yolu düşüşü
4. Kalıcı iz bırakıyorsa `ACTION_TRACE` + `TRACE_LABELS` + çip ikonu (CaseStage)
5. Kare üret (üretim listesine tarif satırı ekle) → manifest → testler

## Yeni görsel set (arketip×ortam) ekleme

1. `public/patients/<ortam-arketip>/` klasörü — dosya adları STEMI setiyle birebir
2. 5 durum karesi zorunlu; maske varyantı + aksiyonlar kısmi olabilir (düşüş var)
3. `VISUAL_MANIFEST`'e set girişi; `resolveVisualSet` gerisini halleder
4. Çocuk arketip = illüstratif stil (foto-gerçekçi çocuk ÜRETİLMEZ — pivot kararı)

## Yaşanmış tuzaklar

- `object-cover` + `objectPosition` kol/saç kesti → contain'e geçildi; geri dönme.
- Playwright kendi dev server'ını ister (`reuseExistingServer:false`) —
  çalışan 5173 server'ı önce durdur, yoksa "port is already used".
- Mobilde `flex-1 min-h-0` auto-yükseklikli kolonda SIFIRA çöker —
  mobil kırılımda bu ikiliyi `lg:` önekine hapset.
- Aksiyon spam'i: ara-sahne son-kazanır (nonce), kuyruk YOK; arrest karesi
  aksiyon karesiyle EZİLMEZ.
- İz, motor puanı reddetse de düşer (fizik gerçeği: ekipman takıldı) — bug değil.
