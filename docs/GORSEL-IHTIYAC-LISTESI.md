# Görsel İhtiyaç Listesi — STEMI Pilotu (hastane × erişkin-erkek)

> Görselli vaka akışı (`/vaka/:id`) için Higgsfield üretim listesi.
> Üretilen her dosya `public/patients/hastane-eriskin-e/` altına, buradaki
> **dosya adıyla birebir** konur → `src/visuals/visual-manifest.ts`'e eklenir
> (vitest kapısı dosya varlığını doğrular).
> Son güncelleme: 13 Temmuz 2026 — P1 kanıt seti ✅ + kalıcı iz (D kararı) bölümü E.

## ⚠️ Üretim disiplini (pivot değerlendirmesi §3 — tutarlılık kuralı)

- **TÜM kareler aynı hasta + aynı kamera + aynı kadraj + aynı ışık.**
  Referans: eldeki 5 durum karesi (62 yaş erkek, açık mavi hasta önlüğü,
  beyaz yastık/sedye, hafif üstten önden kadraj, nötr gri arka plan).
- Yeni kareleri SERBEST üretme — mevcut baseline karesini (durum-01)
  image-to-image/edit girdisi olarak kullan, eller/ekipman EKLE.
- Format: **PNG, portre ~3:4, min 1024×1365** (mevcut set ~876×1164 — daha
  yükseği iyi, oynatıcı `object-cover` kırpar).
- Eller/sağlık personeli görünüyorsa: **eldivenli eller, kadraja sadece
  el/önkol girer** — yüz girmez (kimlik tutarlılığı + KVKK temizliği).
- Motion turu (sonra): her karenin 3-5sn'lik döngü videosu (image-to-video,
  nefes/el hareketi) — dosya adı aynı, uzantı `.mp4`, manifest `video` alanı.

## A. DURUM kareleri — ✅ 5/5 HAZIR

| Dosya | İçerik | Durum |
|-------|--------|-------|
| `durum-01-baseline.png` | Bilinçli, göğüs ağrısı, eli göğsünde | ✅ |
| `durum-02-sok.png` | Solgun, terli, yarı bilinçli | ✅ |
| `durum-03-siyanoz.png` | Dudak morarması, korku ifadesi | ✅ |
| `durum-04-derin-sok.png` | Gri cilt, gözler kapalı, yanıtsız | ✅ |
| `durum-05-arrest.png` | Bilinçsiz, ağız açık, gri-mavi | ✅ |

Eksik YOK — 5 durum, mapper'ın 5 basamağını birebir karşılıyor.
(İleride istenirse 6.: `durum-06-derlenme.png` — reperfüzyon sonrası
rahatlamış yüz; şimdilik baseline karesi recovery'de yeterli.)

## B. AKSİYON kareleri — P1 ✅ 5/5 HAZIR · P2/P3 8 adet üretilecek

Öncelik: **P1 = kanıt seti** (ilk 5 — STEMI akışının en sık aksiyonları,
✅ 13 Tem 2026 üretildi + manifest'e bağlandı) · P2 = akış tamamlayıcı ·
P3 = uç durum.

| # | Öncelik | Dosya adı | Higgsfield içerik tarifi (baseline karesi + ekleme) |
|---|---------|-----------|------------------------------------------------------|
| 1 | **P1 ✅** | `aksiyon-ekg-takma.png` | Hastanın açık göğsüne 12 derivasyon EKG elektrotları yapıştıran iki eldivenli el; göğüste 3-4 beyaz elektrot pedi + renkli kablolar (yeşil/kırmızı/sarı); hasta bilinçli, hafif endişeli |
| 2 | **P1 ✅** | `aksiyon-iv-takma.png` | Hastanın sol ön koluna IV kateter yerleştiren eldivenli eller; turnike bağlı, cilt antiseptikle silinmiş parlıyor, 18G kateter + şeffaf sabitleme bandı; hasta koluna bakıyor |
| 3 | **P1 ✅** | `aksiyon-ilac-po.png` | Hastaya beyaz tablet uzatan eldivenli el + küçük su bardağı; hasta yarı doğrulmuş, ağzına götürüyor (aspirin çiğneme sahnesi) |
| 4 | **P1 ✅** | `aksiyon-ilac-iv.png` | Koldaki IV hattına enjektörle ilaç puşeleyen eldivenli eller; enjektör pistonu yarıda, hat üçyollu musluğa bağlı |
| 5 | **P1 ✅** | `aksiyon-oksijen-maske.png` | Hastanın yüzüne şeffaf oksijen maskesi yerleştiren eldivenli eller; yeşil hortum kadraj kenarına uzanıyor; hasta sakin nefes alıyor |
| 6 | P2 | `aksiyon-monitor-baglama.png` | Hastanın parmağına pulse oksimetre mandalı takan el + göğüste monitör elektrotları; arka planda bulanık monitör ışıltısı |
| 7 | P2 | `aksiyon-tansiyon-olcme.png` | Hastanın sağ üst koluna tansiyon manşonu saran eldivenli eller; manşon yarı sarılı, velcro açık |
| 8 | P2 | `aksiyon-kan-alma.png` | Koldaki IV/damardan kan tüpüne örnek alan eller; mor+sarı kapaklı 2 vakumlu tüp görünür |
| 9 | P2 | `aksiyon-oskultasyon.png` | Hastanın göğsüne stetoskop diyaframı koyan eldivenli el; hasta derin nefes alıyor, gözler hekime dönük |
| 10 | P2 | `aksiyon-dilalti.png` | Hastanın diline küçük sprey/tablet uygulayan el (nitrogliserin SL); hastanın ağzı hafif açık, baş hafif geride |
| 11 | P2 | `aksiyon-transfer-pci.png` | Sedye korkuluğu kalkmış, hasta transfer pozisyonunda; kadraj kenarında sedyeyi iten eller + koridor ışıkları hissi (kateter lab yolu) |
| 12 | P3 | `aksiyon-defibrilasyon.png` | Hastanın çıplak göğsüne yapıştırılan iki defibrilatör pedi (sağ üst + sol alt); eller pedleri bastırıyor; hasta BİLİNÇSİZ (arrest karesi tabanlı — durum-05'ten türet) |
| 13 | P3 | `aksiyon-eko.png` | Göğse jelli EKO probu bastıran eldivenli el; probdan kablo kadraj dışına; hafif jel parlaması |

Not — defibrilasyon istisnası: #12 tek başına durum-05 (arrest) karesinden
türetilir; diğer 12'si durum-01 (baseline) tabanlı. Sebep: defib yalnız
arrest bağlamında anlamlı, bilinçli hastayla üretilirse klinik saçma olur.

## C. Kapsama kanıtı

`resolveActionVisual` zinciri STEMI envanterinin (19 ilaç + 11 ekipman +
tetkik + PCI kararları) TAMAMINI bu 13 anahtara indirger — vitest kilidi:
`tests/visuals/visual-manifest.test.ts` "STEMI envanterinin TAMAMI çözülür".
Yani bu 13 kare + eldeki 5 durum karesi = STEMI pilotu görsel olarak TAM.

## D. Üretim sonrası entegrasyon (Code tarafı — 5 dk/kare)

1. Dosyayı `public/patients/hastane-eriskin-e/` altına at (isim birebir).
2. `visual-manifest.ts` → `HASTANE_ERISKIN_E.aksiyon`'a `MediaAsset` ekle.
3. `npx vitest run tests/visuals` — kapı yeşilse bitti; oynatıcı otomatik
   gösterir (kod değişikliği gerekmez).

## E. KALICI İZ — maske varyantları (D kararı, 13 Tem 2026) — 4 adet ÜRETİLECEK

Müdahaleler kalıcı iz bırakır: **oksijen maskesi TEK görsel-kalıcı iz**
(durum karesi maskeli varyanttan seçilir); IV/EKG/monitör/manşon UI çip
şeridinde taşınır (`persistent-traces.ts`) — kare çarpanı yok.

**Üretim tarifi — overlay DEĞİL, kare başına image-to-image edit:**
girdi her durumun KENDİ karesi (baseline değil!) → poz/ifade otomatik korunur.
Talimat şablonu: *"Aynı hasta, aynı poz, aynı ışık — SADECE yüzüne şeffaf
oksijen maskesi ekle (yeşil hortum kadraj kenarına), başka hiçbir şeyi
değiştirme."*

| # | Dosya adı | Girdi karesi | Not |
|---|-----------|--------------|-----|
| 1 | `durum-01-maske.png` | durum-01-baseline.png | |
| 2 | `durum-02-maske.png` | durum-02-sok.png | solgun/terli ifade korunur |
| 3 | `durum-03-maske.png` | durum-03-siyanoz.png | maske ŞEFFAF şart — dudak siyanozu ardından okunmalı |
| 4 | `durum-04-maske.png` | durum-04-derin-sok.png | |

**ARREST varyantı ÜRETİLMEZ** — klinik: arrestte basit maske çıkar,
BVM/entübasyona geçilir (kod çifte emniyetli: `resolveDurumAsset` arrest'te
maskeyi her koşulda bastırır; vitest kapısı maskeli-arrest'i reddeder).

Entegrasyon: dosyayı klasöre at → `visual-manifest.ts` `durumMaske`'ye ekle →
`npx vitest run tests/visuals`. Varyant gelene dek kod base karelere zarif düşer.

Bilinen ödün (Ali Bey onaylı): maske takıldıktan sonraki aksiyon ara-sahneleri
maskesiz yüz gösterebilir — 4sn "yakın plan an" konvansiyonu, varyantlanmaz.
