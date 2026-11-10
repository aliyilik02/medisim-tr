# Devir — Varlık Hattı (Opus için)

> Tarih: 10 Kas 2026 · Devreden: Fable 5.2 · Devralan: Opus
> Önce oku: `CLAUDE.md`, `docs/CALISMA-BICIMI.md`, `docs/YOL-HARITASI.md` ("Yön kararı" bölümü).
> Skill'ler: `blender-medical-modeling`, `meshy-3d-agent:meshy-3d-generation`, `r3f-medical`.

## Amaç

Hedef Body Interact muadili: öğrenci 3B hastaya dokunup muayene ediyor (v1 canlı, commit 34645d7).
Senin işin **3B varlıkları toplamak**: ekipman, oda, hareket klipleri. Kod yazmak değil, varlık üretmek ve kapıdan geçirmek.

## Dokunma listesi (kesin)

- `src/engine/`, `src/data/` (klinik), `src/components/exam/`, `ExamHotspotLayer.tsx`, `examAnchors.ts`, `ScenarioBedPlayPage.tsx` — Fable dönünce devam edecek.
- Canlı sahneyi (`PatientRoomScene.tsx`) DEĞİŞTİRME. Yeni oda ayrı bileşen + bayrak arkasında gelir (aşağıda).
- Yeni hasta/oda canlı sahneye BAĞLANMAZ; aday olarak ayrı dosyada bırakılır (Hat 0).
- Klinik içerik yazma. Prod deploy yok. Ödeme/kredi harcaması aşağıdaki bütçe kuralına bağlı.

## Karar güncellemesi (Ali Bey, 10 Kas 2026 akşam) — SIFIRDAN

Ali Bey mevcut hastayı beğenmiyor ("insana benzemiyor"), hareketler arada sapıtıyor, oda tasarımı yanlış. **Hasta, hareket seti ve oda sıfırdan yapılacak.** Önceki "hasta gövdesine dokunma" kararı KALKTI.

Değişmeyen teknik sınırlar (bunlar olmadan muayene sistemi kırılır):
- İskelet **Mixamo kemik adlarıyla** olmalı (`mixamorigHead`, `Spine`, `Spine2`, `Neck`, `RightForeArm`, `RightHand`, `LeftLeg` …). Muayene noktaları ve ekipman bu adlara bağlı. Meshy modeli Mixamo otomatik iskeletinden geçirilir.
- Hareketler Mixamo'dan (aynı iskelet, dönüştürme yok).
- Önce STEMI hastası: 62 yaş erkek. Diğer varyantlar sonra.

## Hat 0 — Yeni hasta (EN ÖNCE, iki aday yan yana)

Kimse tahminle seçmesin; iki aday üret, Ali Bey gözle seçsin.

| Aday | Nasıl | Artı | Eksi |
|------|-------|------|------|
| A — Meshy | 62 yaş erkek, hasta önlüğü, A-poz, gerçekçi → Mixamo otomatik iskelet | daha insan görünür | yüz hareket etmez (göz kırpma + dudak senkronu YOK) |
| B — MPFB2 yenileme | mevcut hat + gerçek cilt dokusu, yaşlılık detayı, saç/sakal, göz | yüz hareketleri kalır, CC0 | manken hissi tam gitmeyebilir |

Teslim: iki aday da yatakta, aynı ışık ve kamerada ("Tüm beden" + yüz yakın) ekran görüntüsü; `/dev/props` benzeri karşılaştırma sayfası. Canlı sahneye bağlama YOK — seçim Ali Bey'de.
A adayında yüz için ara çözüm dene ve raporla: Blender'da en az `jawOpen` + `eyeBlinkLeft/Right` şekil anahtarı elle eklenebiliyor mu?

## Hareket seti — sıfırdan, az ve temiz

"Sapıtma"nın olası kaynağı (DOĞRULANMADI): ayakta çekilmiş kliplerin yatan hastaya karıştırılması + ağrı katmanı + titreme katmanının üst üste binmesi. Bu yüzden:
- Yalnız **yatar / yarı oturur** klipler. Ayakta klip alınmaz.
- Her klip yerinde (kök hareketi yok), aynı başlangıç pozundan, döngüsü dikişsiz.
- Her klibi **tek başına** 30 sn oynatıp kaydet; sıçrama/kıvrılma görüleni listele ve ele.
- Karıştırma/katman kodu (`animation-director`) Fable'da; sen yalnız temiz klip bırak.

## Oda — önce kroki, sonra üretim

Mevcut yerleşim yanlış kabul edildi. Üretmeden önce gerçek bir acil resusitasyon odasını örnek alıp **kuşbakışı kroki** çıkar (sedye ortada, baş ucunda gaz paneli + monitör, sağda acil arabası, solda çalışma alanı, ayak ucunda kapı) ve `docs/` altına kaydet. Kroki Ali Bey'e gösterilmeden oda parçası üretme; o sırada Hat 1 ekipmanla ilerle.

## Meshy kredi bütçesi

Başlamadan `meshy` hesabındaki kalan krediyi oku ve raporun başına yaz. Her varlık için **önce önizleme**, beğenilirse dokulu üretim. Bir varlıkta 2 başarısız denemeden sonra dur, not al, sıradakine geç. Kredinin %70'i bitince dur ve rapor ver.

## Hat 1 — Ekipman (en yüksek öncelik)

Her biri ayrı GLB, gerçek ölçüde (metre), tek nesne, arka plan/zemin yok.

**P1 — STEMI'de elle tutulan / hastaya takılan**
| # | Varlık | Not |
|---|--------|-----|
| 1 | Stetoskop | boyunda asılı duruş + göğüse konmuş duruş için tek model yeter |
| 2 | Tansiyon aleti manşonu | kola sarılı hal (silindir), hortumlu |
| 3 | Pulse oksimetre parmak klipsi | |
| 4 | IV kanül (kola takılı, flasterli) | 18G yeşil / 20G pembe renk kodu |
| 5 | Serum torbası + damla haznesi | hortum koddan çiziliyor (`TubingLayer`), modele ekleme |
| 6 | EKG elektrodu (tek yapışkan ped) + kablo ucu | 10 kopya koddan çoğaltılır |
| 7 | Oksijen maskesi (rezervuarlı) + nazal kanül | |
| 8 | Defibrilatör cihazı + 2 ped | |
| 9 | Muayene ışık kalemi | göz bebeği muayenesi için |
| 10 | Enjektör (10 mL) + ilaç ampulü + flakon | ilaç verme karesi |

**P2 — Yatak başı cihazlar**
12 derivasyon EKG cihazı (arabalı) · hasta başı monitörü (kollu) · taşınabilir EKO/ultrason · kan gazı cihazı · infüzyon pompası · balon-valf-maske · aspiratör · acil arabası (mevcut prosedürel `CrashCart` yerine).

Mevcut 12 prosedürel ekipman `src/components/patient-3d/equipmentMeshes.ts` içinde kutu/silindirden yapılmış. Yenisi gelince **eskisini silme**; yeni GLB'yi yanına koy, karşılaştırma ekran görüntüsü al, değişimi Fable/Ali Bey yapar.

## Hat 2 — Oda (baştan)

Mevcut: `public/3d/er-room.glb` (3 MB) + prosedürel eşyalar. Yeni oda:

- Ölçü: 5 × 4 × 2.6 m, sahne ölçeği mevcut `ROOM_SCALE = 0.64` ile uyumlu.
- Parçalar ayrı GLB: duvar+zemin+tavan kabuğu · kapı · hasta sedyesi (**baş kısmı kalkabilir** — kalp hastası yarı oturur yatar, şu an düz yatıyor) · perde rayı+perde · lavabo · malzeme dolabı · duvar gaz paneli · tavan lambası · duvar saati · atık kovaları · refakatçi sandalyesi.
- **Tavan ayrı parça olmalı** (tepeden "Tüm beden" kamerası tavanın üstünden bakıyor; tavan gizlenebilmeli).
- Yeni oda `PatientRoomSceneV2.tsx` olarak ayrı dosyada, `?room=v2` bayrağıyla açılır. Varsayılan eski oda kalır.
- Tasarım dili: koyu-nötr klinik, teal vurgu. Mor, parlak renk, oyuncak görünümü yok.

## Hat 3 — Hareket klipleri (Mixamo)

Mevcut klipler: `laying_idle`, `laying_breathless`, `cough_mild/severe`, `moaning`, `vomiting`, `take_pill`, `use_inhaler` (+ ayakta olanlar yatakta kullanılmıyor).

Aranacaklar (hepsi **yatar/yarı oturur** pozda):
1. Göğsünü tutma (iskemik ağrı) — şu anki ağrı pozu hastayı kıvırıyor, doğal değil
2. Yarı oturur sakin soluma
3. Huzursuz kıpırdanma
4. Bilinç kaybı — gevşek, hareketsiz
5. Agonal soluma (arrest başlangıcı)
6. Baş çevirip konuşma (yatarken)
7. Kolunu uzatma (tansiyon/IV için)
8. Nöbet (ileriki senaryolar; P2)

Birleştirme hattı `blender-medical-modeling` skill'inde (tek iskelete NLA, konuşma kliplerinde baş düz). Her klip sonrası `npm run glb:check` + morph sayısı 52 kalmalı.

## Kapılar (her varlık için, atlanamaz)

1. `gltf-transform` ile sıkıştır: meshopt + webp. **Morph'lu dosyada Draco YASAK.**
2. Boyut: ekipman ≤ 300 KB, cihaz ≤ 800 KB, oda kabuğu ≤ 3 MB, doku ≤ 1024².
3. `npm run glb:check` hatasız.
4. `/dev/props` sayfasında yan yana diz, ekran görüntüsü al (ölçek + yön doğrulaması). **Göz kararı değil, ölçü.**
5. **Lisans kaydı:** her varlık için kaynak, üretim tarihi, plan, kullanım hakkı → `src/components/patient-3d/LICENSE-3D.md` + gerekiyorsa `/atiflar`. Meshy ücretli plan çıktısının ticari kullanım hakkını ve Mixamo kliplerinin oyun içinde gömülü dağıtım koşulunu **kendi şartlar sayfalarından doğrula**, bağlantıyı yaz. Doğrulayamazsan "DOĞRULANMADI" etiketiyle bırak, commit etme.
6. Varlık başına bir commit. `tsc` + `vitest` yeşil. Bozuk build commit edilmez.

## Bilinen tuzaklar

- Chrome eklentisi bu makinede localhost'a ulaşamıyor → görsel doğrulama için Playwright betiği (`--use-angle=d3d11`).
- Bash heredoc içinde Türkçe karakter bozuluyor → dosyayı Write ile yaz.
- `patient-mimikli.glb` (Daz kökenli) ASLA commit edilmez.
- Meshy modelleri çoğu zaman tek parça ve yüksek poligon gelir: indirince poligon sayısını düşür, pivotu tabana al, +Z öne bakacak şekilde çevir.

## Bitince bırakılacak rapor

`docs/DEVIR-OPUS-RAPOR.md`: üretilen varlık tablosu (ad, boyut, kaynak, lisans durumu, ekran görüntüsü yolu), harcanan kredi, yapılamayanlar ve nedeni, Fable'a sorular. Sahneye **bağlama işi Fable'da** — sen hazır ve kapıdan geçmiş dosya bırak.
