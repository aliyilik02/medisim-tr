# Araştırma — Yeni Hasta Modeli + Hareketler + Poliklinik Odası

> Tarih: 16 Kasım 2026 · Karar sahibi: Ali Bey · Hazırlayan: Fable 5.2
> Yöntem: 3 paralel web araştırması (≈460 sayfa/araç çağrısı) + bu makinede ölçüm.
> Etiketler: **[OKUNDU]** lisans/sayfa metni açılıp okundu · **[DOĞRULANMADI]** arama özeti ya da hafıza.
> Fiyatlar ve lisans metinleri değişir — satın almadan/yayına almadan önce bağlantıdaki güncel metni yeniden oku.

## 1. Özet karar

| Konu | Karar | Durum |
|------|-------|-------|
| Hasta modeli (hedef) | **Epic MetaHuman** — en gerçekçi + düz GLB'ye açıkça izin veren tek gerçekçi kaynak, 0 TL | Bu dizüstünde üretilemez (aşağıda ölçüm) → Ali Bey kararı |
| Hasta modeli (hızlı yol) | **Character Creator** — eldeki beğenilen model zaten bundan çıkmış | Lisans sahipliği + şifreli dağıtım + yazılı onay şart |
| Hasta modeli (şimdi sahnede) | MPFB2 v3 erkek — CC0, 52 yüz şekli | **Geçici yer tutucu**; yenisi gelince tek satırla değişir |
| Hareketler | Mixamo taban + kodla üretilen katman (soluma, bakış, titreme, irkilme, kol uzatma) + elle poz | Hazır "hasta" paketi YOK |
| Oda | Poliklinik muayene odası sıfırdan kuruldu (prosedürel, gerçek metre) | **Canlı** — `/hasta/:id` |
| Eski varlıklar | 4 eski hasta varyantı + acil odası + 2 ölü demo sayfası kapatıldı | Dosyalar diskte, yüklenmiyor |

## 2. Hasta modeli

### 2.1 Asıl engel: lisans, kalite değil

Web uygulamasında GLB dosyası herkesçe indirilebilir (tarayıcı ağ sekmesi). Ticari lisansların neredeyse hepsi "son kullanıcı varlığı çıkaramasın" şartı koyuyor. **Düz GLB'ye koşulsuz izin veren yalnız üç kaynak türü var:** CC0 (MPFB2/MakeHuman), MIT (Microsoft Rocketbox, ICT-FaceKit) ve Epic MetaHuman.

### 2.2 İlk beş

| # | Seçenek | Maliyet | Görünüm (dürüst) | Çıplak gövde / 52 yüz şekli / iskelet | Düz GLB web'de | Emek |
|---|---------|---------|------------------|----------------------------------------|----------------|------|
| 1 | **MetaHuman** (UE 5.6+) | 0 (yıllık gelir < 1 M $) | En iyi; web'e indirilince ≈8/10 | Gövde var (çıplak görünüm doğrulanmadı) / yerleşik değil, 52 şekil fırınlanır / UE iskeleti, dönüştürme gerekir | **İZİNLİ** [OKUNDU] | Yüksek: ilk karakter 4–7 gün |
| 2 | **MPFB2 / MakeHuman** | 0 | 5/10; özel doku + saç kartıyla ≈6.5/10 | Var / var (resmi "Faceunits 01", Şub 2026) / Mixamo uyumlu | **İZİNLİ** (CC0) [OKUNDU] | Düşük: hat hazır |
| 3 | **Character Creator 5** | ≈299 $ kalıcı ya da 99 $/yıl [DOĞRULANMADI] | 8.5/10; yaşlı/kadın/çocuk en kolay | Var / var (ExPlus = 52 ARKit + 11 dil) / var | **KOŞULLU** — düz GLB §6.3'ü ihlal eder [OKUNDU] | Düşük-orta + şifreli yükleyici |
| 4 | **Human Generator Ultimate V4** (Blender) | 128 $ | ≈7/10; yalnız yetişkin | Var / 52 şekil (adlar doğrulanmadı) / oyun iskeleti | **KOŞULLU** ("kapalı biçim") | Düşük: 1–2 gün |
| 5 | Pazar yeri hazır taban (DanilGOE, Superhive) | 199.99 $ ticari | 6–7.5/10 (yalnız ilan görseli) | Büyük olasılıkla / 52 ARKit / belirtilmemiş | **BELİRSİZ** | Çok düşük |

**Elenenler (tek satır):** Daz Genesis 9 (şifreleme şartı, ürün başına lisans) · Ready Player Me (31 Oca 2026'da kapandı [DOĞRULANMADI]) · Avaturn / MetaPerson (≈800 $/ay, giysinin altında gövde yok) · Microsoft Rocketbox (MIT ama 10 bin üçgen, giysi gövdeye yapışık) · Renderpeople, TurboSquid, CGTrader, Fab (çıkarılamazlık şartı) · 3D Scan Store (iskeletsiz) · Mixamo karakterleri (yüz şekli yok) · Meshy/yapay zekâ üretimi (yüz şekli yok; eklemek için ücretli Faceit + elle iş).

### 2.3 Lisans kanıtları

- **MetaHuman** — https://www.metahuman.com/license [OKUNDU]: "MetaHuman characters and animation are classed as Non-Engine Products under the Unreal Engine EULA, so neither their use as linear media output or at runtime in games (or other interactive applications) using engines other than Unreal Engine triggers royalty obligations." UE EULA'da Non-Engine Product için şifreleme/koruma şartı yok. **Kalan belirsizlik:** karakterleri bu sınıfa sokan SSS sayfası, EULA gövdesi değil → Epic'ten tek satır yazılı teyit iste.
- **Reallusion içerik sözleşmesi** — https://www.reallusion.com/Content/EULA/EULA.htm ("Updated November 1st, 2026") [OKUNDU] §6.3: "Content incorporated into distributed games or applications must be packaged in proprietary, compiled, or encrypted formats so that it cannot be opened, extracted, or imported into third-party 3D software…" → düz GLB olmaz; şifreli kap + girişli sunum + Reallusion yazılı onayı gerekir.
- **MPFB2** — https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html [OKUNDU]: çekirdek varlıklar CC0. Risk: forum 8 Kas 2026'da kapandı, varlık deposu çevrimdışı → paketleri şimdi yedekle.

### 2.4 Bu makinede ölçülenler (16 Kas 2026)

- **Eldeki `patient-mimikli.glb` Daz değil, Character Creator 4 çıkışı.** Dosya içinden: doku adları `Std_Skin_*`, yüz şekilleri `V_Open…` + `A01_Brow_Inner_Up…` (CC4 ExPlus/ARKit), parçalar `Buzz_Cut`, `Chin_Curtain_Sparse`, `Briefs_Morph`, iskelet Rigify (724 kemik), 16.7 MB. Eski notlardaki "Daz kökenli" ifadesi yanlış.
- **Donanım:** NVIDIA GTX 1650 (4 GB), 16 GB RAM, i5-10300H, C: 63 GB boş. Epic Launcher kurulu, Unreal Engine kurulu değil; Reallusion/Daz yok; Blender 5.1 + Unity var.
- **Sonuç:** Unreal Engine + MetaHuman bu dizüstüne sığmıyor (disk) ve ekran kartı sınırda. Gereksinim rakamları [DOĞRULANMADI] — Epic sayfasından teyit: yaklaşık 100+ GB disk, 32 GB RAM ve 8 GB ekran kartı belleği önerilir.

### 2.5 Önerilen yol

1. **Ali Bey iki soruyu yanıtlar** (yol buna göre seçilir):
   - Character Creator lisansın var mı (hangi sürüm, hangi hesap)? `patient-mimikli.glb` kimin lisansıyla üretildi?
   - Daha güçlü bir bilgisayara erişim var mı (kendi, ödünç ya da birkaç saatlik kiralık bulut bilgisayar)?
2. **Güçlü bilgisayar varsa → MetaHuman.** Ali Bey MetaHuman Creator'da hastayı kurar (62 yaş erkek, kilolu, kır saç, yorgun yüz); dışa aktarır. Blender tarafı betikle: 52 yüz şeklini fırınla → baş+gövdeyi tek iskelette birleştir → kemik adlarını Mixamo adlarına çevir (muayene noktaları ve ekipman bu adlara bağlı) → saç kartı, 2K doku → GLB (meshopt, Draco YOK) → `/dev/hasta-aday` karşılaştırması → kabul ölçüsü.
3. **Character Creator lisansı varsa → eldeki beğenilen modeli yasal hale getir.** Şifreli model yükleyici (dosya sunucuda şifreli, tarayıcıda bellekte çözülür, yalnız girişli kullanıcıya) + Reallusion'dan yazılı onay (sales@reallusion.com). Yükleyici ≈1 gün iş; aynı yükleyici 4. ve 5. seçenekleri de açar.
4. **İkisi de yoksa → MPFB2'yi yükselt** (yeni cilt dokusu, saç kartı, gerçek göz) ya da 128 $ Human Generator + şifreli yükleyici.

Kabul ölçüsü (10 Kas kararı, değişmedi): göz kırpıyor · "Göğsüm ağrıyor" cümlesinde dudak oynuyor · acı ifadesi · ilaç içme klibi · bilinç kaybında yüz gevşiyor.

**Dudak senkronu:** mevcut Türkçe grafem→ağız şekli motoru (`engine/lipsync`) 52 ARKit adıyla çalışıyor; yeni model aynı adları taşırsa değişiklik gerekmez. Hazır kütüphanelerde (TalkingHead, HeadTTS) Türkçe yok.

## 3. Hareketler

**Bulgu:** "muayene edilen hasta" için hazır hareket paketi yok. Listenin ≈%60'ı genel (ayakta/oturan) kliplerle karşılanıyor; klinik olanlar (yarı oturur, göğsünü tutma, tripod, palpasyonda irkilme, tansiyon/damar yolu için kol) boşluk.

| İhtiyaç | En iyi kaynak | Lisans |
|---------|---------------|--------|
| Sırtüstü sakin / uyuyan | Mixamo `Laying Idle`, `Lying On Back Idle`, `Laying Sleeping` | Koşullu |
| Oturur konuşma / baş sallama | Mixamo `Sitting Talking`, `Head Nod Yes`, `Shaking Head No`; Anderson Rohr ücretsiz paketleri | Koşullu |
| Otur ↔ yat, ayağa kalk ↔ otur | Rohr paket 07 (`Wake_Up`, `Lie_Down`), Mixamo `Stand To Sit` | Koşullu |
| Öksürük, nefes nefese, üşüme, baş ağrısı | ActorCore tekil klipler (≈2–4.5 $/klip; toplam ≈35–50 $) | Koşullu (aynı Reallusion sözleşmesi) |
| Yarı oturur duruş, göğsünü/karnını tutma, tripod | **Yok** → Blender'da elle poz (1 karelik klip) + kodla soluma | — |
| Tansiyon/damar yolu için kol, ağrıyan yeri gösterme | **Yok** → kodla iki-kemik kol hedefleme | — |
| İrkilme, titreme, derin nefes, bakış, göz kırpma | Kodla (klip değil) | — |
| Nöbet | Kodla taslak; klinik zamanlama DRAFT | — |

- **Mixamo lisansı** [OKUNDU, 3 belge]: SSS ticari kullanıma izin veriyor; Adobe Genel Koşullar §3.6 varlıkların yalnız son ürüne gömülü dağıtılmasına izin veriyor, tek başına dağıtım yasak. Mixamo kliplerinin "Content Files" sayıldığı çıkarım — Adobe açıkça yazmıyor.
- **Yasak veri setleri** (ticari kullanım yok): AMASS/BABEL/HumanML3D, Bandai Namco, LAFAN1.
- **Koşulsuz serbest:** Quaternius (CC0), Mesh2Motion (CC0), CMU — ama oyun/yürüme ağırlıklı, klinik değeri düşük.
- **Kurallar:** dönüştürmeyi tarayıcıda değil Blender'da yap · duruş aileleri (sırtüstü / yarı oturur / oturan / ayakta) arasında klip karıştırma, geçişi ayrı klip oynat (eski "sapıtma"nın olası nedeni) · tek kişilik video-hareket yakalama yatar pozda kötü, elle düzeltme ister.
- **Ali Bey'den:** Mixamo klipleri Adobe girişi ister — liste bu tabloda; indirince `scripts/merge-animations.mjs` hazır.

## 4. Poliklinik odası

### 4.1 Dayanak

- **Aile Hekimliği Uygulama Yönetmeliği md. 23/1-c** [OKUNDU]: "Muayene odasının, her aile hekimi için en az 10 metrekare olması gerekir. Muayene odasında lavabo bulunur." Md. 24 zorunlu donanım: muayene masası, paravan/perde, tansiyon aleti, otoskop, oftalmoskop, Snellen eşeli, tartı + boy ölçer, keskin atık kabı, ilaç/malzeme dolabı, EKG, O₂ tüpü. 9 Nis 2026 değişikliği nabız oksimetreyi ekledi.
- **Muayenehane Bina Standartları Genelgesi 2011/55** [OKUNDU]: hekim başına en az 16 m² muayene odası.
- İngiltere NHS oda veri sayfası [OKUNDU]: 16 m², tavan 2.70 m.

### 4.2 Kurulan oda (`src/components/patient-3d/polyclinic/`)

4.45 × 4.20 m (18.7 m²), tavan 2.70 m. Gerçek metre ölçüsü, dosya indirmeden, malzeme başına tek parça (≈40 çizim çağrısı).

İçindekiler: muayene sedyesi (kağıt rulo + yastık) · tekerlekli serum askısı · taşınabilir oksijen tüpü (nemlendiricili) · hasta monitörü standı · duvar tanı seti (otoskop, oftalmoskop, tansiyon aleti) · eldiven kutuları + keskin atık kutusu · negatoskop · hekim masası (bilgisayar, telefon, evrak, kolonya, mendil, masa bayrağı) + koltuk + 2 hasta sandalyesi · pansuman arabası (alt rafta EKG) · basamak · paravan · camlı malzeme dolabı · boy-kilo ölçer · lavabo + fayans + sabunluk + kağıt havluluk + el hijyeni afişi · tıbbi/evsel atık kovası · jaluzili pencere + mermer denizlik + panel radyatör · kapı · göz tahtası · hasta hakları panosu · duvar saati · askılık · asma tavan + 4 LED panel.

- **Yerleşim kuralı:** muayene eden hastanın sağında; serum askısı sağ omuz hizasında (kanül sağ ön kolda); pencere ve oksijen tüpü solunda; baş ucu duvara dönük.
- **Maket kesiti:** kamera bir duvarın ya da tavanın dışına çıkınca o parça gizlenir.
- **Ölçümle bulunan eski hata:** hasta modeli baş +Z yönünde kalibre; eski acil odasında yastık ayak ucundaydı. Yeni oda hastaya göre döndürüldü, sedye hastanın ölçülen kutusuna oturtuldu.
- **Araç:** `node scripts/scene-shot.mjs <port>` — her kamera açısının ekran görüntüsü + hasta kutusu + kemik konumları.

### 4.3 Sonraki görsel yükseltme (yapılmadı — karar gerekirse)

- Hazır oda setleri: "Medical Examination Room" — DotBow, Sketchfab, CC-BY 4.0, 7.5 bin yüz (ücretsiz, atıf şart) · "Realistic Doctor's Room Interior" — Oleksandr1987, Fab ≈554 TL, 15.5 bin poligon, GLB (çıkarılamazlık şartı). Görsel olarak incelenmedi.
- CC0 dokular/ışık: Poly Haven `hospital_room_2` (ortam ışığı), ambientCG `OfficeCeiling001–006`, `Tiles107`.
- En büyük kazanç: Blender'da ışık pişirme (gölge + ortam kararması dokuya).

## 5. Skill taraması (`/find-skills`)

Kurulu proje skill'leri (`r3f-medical`, `blender-medical-modeling`, `patient-anatomy`) işi karşılıyor. Dışarıda bulunan, **kalitesi doğrulanmamış** adaylar:

| Skill | Kurulum sayısı | Komut |
|-------|----------------|-------|
| threejs-react-three-fiber | 6.6 bin | `npx skills add cloudai-x/threejs-skills@threejs-react-three-fiber` |
| blender-web-pipeline | 4.1 bin | `npx skills add freshtechbro/claudedesignskills@blender-web-pipeline` |
| blender-motion-state-inspection | 8.6 bin | `npx skills add affaan-m/ecc@blender-motion-state-inspection` |

Kurulmadı (dış kaynak; kurulum kararı Ali Bey'de).
