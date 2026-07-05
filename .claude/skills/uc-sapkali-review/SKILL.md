---
name: uc-sapkali-review
description: MediSim TR senaryo/motor değişikliklerini ÜÇ perspektiften denetler — hekim (klinik doğruluk), yazılımcı (motor bütünlüğü/test), oyun tasarımcısı (pedagojik oynanış). Yeni/değişen senaryo, deterioration fazı, dallanma, semptom olayı, puanlama veya debrief içeriği review edilirken bu skill'i kullan. klinik-review-agent'ın tamamlayıcısıdır — onun yerine geçmez, klinik ACTIVE onayı her zaman Ali Bey'dedir.
---

# Üç Şapkalı Review — MediSim TR

Amaç: bir senaryo/motor değişikliğini üretime yaklaştırmadan önce üç uzmanlık
lensiyle sistematik denetlemek. Her lens kendi çıktısını verir; sonuç tek
raporda birleşir: **BLOKER** (ACTIVE öncesi şart) / **ÖNERİ** (iyileştirme) /
**TEMİZ**.

> ÜST KURAL (Master Rapor 9.E): klinik karar otonom VERİLMEZ. Bu skill klinik
> ön-denetim yapar; DRAFT→ACTIVE geçişi SADECE Ali Bey.

## Şapka 1 — HEKİM (klinik doğruluk)

Referanslar: Master Rapor 9.A-9.E, `ilac-dozaj-dogrulayici`, `vital-signs-hud`
(PALS yaş normları), `medical-terminology`, `calgary-cambridge` (iletişim/anamnez).

Kontrol listesi:
1. **Sayısal iddia taraması** — yeni metindeki HER sayı (vital eşiği, doz,
   süre, oran) ya kılavuza dayanmalı ya çıkarılmalı (presedan: 9f134f7 —
   'SBP <90' anlatımdan çıkarıldı). Mevcut REVIEWED metinden kopyalanan
   sayılar kabul; YENİ sayı = TODO_KLINIK + gerekçe.
2. **Kılavuz tutarlılığı** — feedback metinleri senaryonun guideline_references
   seti ile çelişmemeli (STEMI: ESC 2023 ACS + AHA/ACC 2025 + TKD 2022).
3. **Doz disiplini** — pediatride mg/kg + max doz zorunlu (9.D Kural 1);
   TİTCK ruhsatlı ilaç; fibrinoliz-P2Y12 gibi kombinasyon kuralları.
4. **Yaş-spesifik vitaller** — PALS 2015 default; çocukta erişkin değer YASAK.
5. **Klinik akıl yürütme** — yanlış seçenek feedback'i NEDEN yanlış olduğunu
   öğretmeli; doğru seçenek mekanizma/kılavuz gerekçesi vermeli.
6. **Basitleştirme dürüstlüğü** — motor proxy'leri (örn. "reperfüzyon kararı
   = deterioration durur") klinik gerçeği aşırı çarpıtıyorsa yorum satırıyla
   itiraf edilmeli.
7. **Bayrak/etiket** — yeni klinik içerik DRAFT; commit `[CLINICAL:DRAFT]`;
   savunulamayan değer TODO_KLINIK işaretli.

## Şapka 2 — YAZILIMCI (motor bütünlüğü)

Kontrol listesi:
1. **Tel-örgü (wiring) testleri** — her yeni id-referansı (next_step_id,
   unlocks, halted_by target_id, trigger id) mevcut bir hedefe işaret ediyor
   mu? Test: senaryo-özel wiring test dosyası (`tests/scenarios/*-branching`
   deseni).
2. **Zorluk kapısı düşüşleri** — dal/unlock hedefi min/max_difficulty ile
   gizliyse akış kilitlenmeden linear'a düşmeli (pickNextStep). Her yeni dal
   için d1/d3/d5'te test.
3. **Lineer akış yan etkisi** — araya adım eklendiyse, ÖNCEKİ adımın doğru
   yolları yeni adıma lineer düşüyor mu? (STEMI dersi: doğru kararlara AÇIK
   next_step_id gerekti.)
4. **Best-path tutarlılığı** — getAchievableMaxPoints + tests/helpers/auto-play
   walker'ı runtime davranışıyla aynı dalı izliyor mu? (Ders: walker karar
   dallarını izlemiyordu — max_points denge testi patladı.)
5. **Zaman ekseni** — değer GERÇEK saniye mi simüle saniye mi? (Ders:
   symptom_events gerçek sn; faz yaşı simüle sn — time_scale 3×'te 180 simüle
   sn faz ≈ 60 gerçek sn. Yanlış eksende değer hiç ateşlenmez.)
6. **Fizyoloji köprüsü** — yeni karar/aksiyon deterioration'ı durdurmalı mıydı?
   halted_by listeleri TÜM eşdeğer doğru varyantları kapsıyor mu? (Ders:
   opt_pci_hesapla unutulmuştu.)
7. **Kapsam** — `npx vitest run --coverage --coverage.include="src/engine/**"`
   eşik %80; yeni motor yolu birim testli mi?
8. **Tam kapı** — tsc 0 + tam vitest + `npm run build` temiz.

## Şapka 3 — OYUN TASARIMCISI (pedagojik oynanış)

Çerçeve: anlamlı seçim + görünür sonuç + adil zorluk + akış (flow) + istismar
avı. Eğitim simülasyonunda "eğlence" = öğrenme döngüsünün gerginliği.

Kontrol listesi:
1. **Anlamlı seçim** — seçenekler gerçekten farklı sonuç doğuruyor mu, yoksa
   puan farkı olan aynı yol mu? Dallanma varsa iki kol da OYNANABİLİR içerik
   mi (ceza ekranı değil)?
2. **Sonucun görünürlüğü** — yanlış kararın bedeli hastada GÖRÜNÜYOR mu
   (vital, animasyon, monitör, anlatım)? Gecikme makul mü (1-3 sn feedback)?
3. **Kurtarılabilirlik/adalet** — hata sonrası oyuncunun ajansı sürüyor mu
   (kurtarma kararı, antidot, geri dönüş)? "Tek hatayla sessiz ölüm" YOK;
   kritik hata açıkça etiketli ve öğretici olmalı.
4. **İstismar avı (exploit)** — puan çiftleme mümkün mü? (dal üzerinden NET
   kazanç: yanlış+kurtarma toplamı, doğrudan doğrunun ALTINDA kalmalı);
   min_actions'ı serbest muayeneyle şişirme; aynı aksiyonu tekrarlama;
   restart-farming.
5. **Zorluk eğrisi** — d1 oyuncusu dallanma/komplikasyon derinliğinden mahrum
   kalıyorsa bilinçli mi? d5 oyuncusuna ek nüans var mı?
6. **Tempo/akış** — adım süresi, deterioration hızı ve time_scale bir arada
   oynandığında ölü bekleme ya da nefessiz koşturma üretmiyor mu? Semptom/
   olay sıklığı sahneyi karikatüre çevirmiyor mu?
7. **Anlatı tutarlılığı** — metin zamanı ("30 dk sonra") ile simülasyon saati
   çelişiyorsa fark not edilmeli; monitör/3D sahne anlatıyı yalanlamamalı.
8. **Gerçek oynanış** — en az bir kez Playwright ile CANLI doğrula
   (`VITE_E2E=1 npm run dev` + screenshot; kritik anlar: dallanma sonrası
   adım, semptom olayı penceresi, arrest görünümü).

## Prosedür

1. Kapsamı belirle: `git show <commit>` / diff.
2. Şapka 1'i uygula — bulguları yaz. Klinik derinlik gerekiyorsa
   `klinik-review-agent`'ı paralel çalıştır, çıktıyı birleştir.
3. Şapka 2'yi uygula — eksik test varsa YAZ, çalıştır.
4. Şapka 3'ü uygula — en az bir canlı oynanış/screenshot.
5. Tek rapor: BLOKER / ÖNERİ / TEMİZ. BLOKER'lar çözülmeden
   REVIEWED_PENDING_ACTIVATION önerilmez. Raporu 2-3 cümle Türkçe özetle bitir.
