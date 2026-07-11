# Çalışma Biçimi — Operasyon Rehberi

> Bu dosya CLAUDE.md'nin ikizi. CLAUDE.md **ne durumda olduğumuzu** tutar;
> bu dosya **nasıl düşündüğümüzü** tutar. Selefinden (Fable 5) halefine
> (Opus 4.8 ve sonrası) devir: aşağıdaki her ilke bu projede gerçekten
> kırılan bir şeyin üstüne yazıldı. Hiçbiri teori değil.
>
> Sen güçlüsün ama en zor akıl yürütmede bir adım geride olabilirsin.
> O boşluğu yetenek kapatmaz — **prosedür kapatır.** Prosedürü atlama.

Son güncelleme: 11 Temmuz 2026

---

## 1. Kelimelerin altında ne sorulduğunu oku

**Prosedür:**
1. İsteği oku. "Hangi aracı istiyor?" sorusunu BIRAK, "hangi sonuca varmak
   istiyor?" sorusunu sor.
2. Ali Bey sahada çalışan sağlıkçı — teknik kelime dağarcığı sınırlı, niyeti
   net. İstek bir araç adı içeriyorsa (örn. "2D'ye geç", "X kütüphanesini
   ekle"), aracı değil aracın çözeceği derdi tespit et.
3. Derdi tek cümleyle kendine yaz. Çözümün o cümleye hizmet ettiğini kontrol
   et. Araca hizmet edip derde etmiyorsa, dur ve alternatifi öner.

**Örnek:** 11 Tem — "3D kısmından çık, 2D hastaya yönelmek istiyorum, sanırım
bazı şeyleri yanlış yapıyorum." Yüzeydeki istek: render teknolojisi değişimi.
Altındaki dert: *efor yanlış yerde, ürün ilerlemiyor* (veri doğruladı: 76
commit 3D'ye, 17 senaryoya, 16/400 vaka, 0 kullanıcı). Doğru cevap "3D'yi
2D'ye çevireyim" değildi — "3D'yi DONDUR, eforu içerik+pilota kaydır" oldu.
2D'ye aktif dönüş de aynı hatanın ayna görüntüsü olurdu.

**Önlediği hata:** İstenen aracı harfiyen inşa edip asıl derdi büyütmek.
Kullanıcının teşhisini sorgusuz kabul eden ajan, kullanıcının kendine
koyamadığı teşhisi hiç koyamaz.

---

## 2. Zor problemi ayrı kontrol edilebilir parçalara böl

**Prosedür:**
1. İş tek oturuşta, tek doğrulamayla bitmiyorsa → böl.
2. Bölme ölçütü konu değil, **doğrulanabilirlik**: her parçanın kendi
   "bitti kanıtı" olmalı (test yeşili, screenshot, ölçüm, tsc 0).
3. Her parça = bir commit. Parça kanıtını vermeden sonrakine geçme.
4. Parça başarısız olursa yalnız o parça geri alınır — önceki kazanımlar korunur.

**Örnek:** STEMI olgunlaştırma 6 aşamada yapıldı (vital düzeltme → faz →
dallanma → semptom → muhakeme → review), her aşama ayrı commit + ayrı
doğrulama. 11 Tem güvenlik paketi 8 maddeydi → 5 mantıklı commit
(backend sertleştirme / chat güvenliği / ErrorBoundary+perf / eslint / docs),
her biri kendi test kanıtıyla. HASTA v2 hattı da aynı: prune → build_variant
→ merge-animations → inject-parts → optimize; hangi halka kırılırsa orada
teşhis edildi.

**Önlediği hata:** "Büyük patlama" teslimi — 15 dosyalık tek commit çöktüğünde
neyin kırdığını bilememek, hepsini geri almak, geceyi kaybetmek.

---

## 3. Gerçek riskin nerede olduğuna karar ver

**Prosedür:**
1. İşe başlamadan sor: "Bu iş nereden ölür?" — cevap çoğu zaman işin en
   büyük parçası DEĞİL, en kırılgan parçasıdır.
2. Çabayı oraya yığ. Kalanına asgari özen yeter.
3. Kırılganlık işaretleri: geri alınamazlık, dış bağımlılık (lisans, API,
   üretim tutarlılığı), sessiz bozulma (test görmeyen yol), klinik içerik.

**Örnek:** 2D pivot değerlendirmesinde kodun tamamı incelendi ve hüküm netti:
takas noktası 15 satır, motor etkilenmiyor — **kod risk değil.** Gerçek risk:
Higgsfield'ın aynı hastayı 5 durumda aynı kimlik/poz/ışıkla üretememesi.
Çaba oraya kaydı: "STEMI kanıt seti doğrulanmadan toplu üretim YOK" kuralı
kondu. Benzer: 161MB GLB'de herkes geometriyi suçlardı — ölçüm bloat'un
dokuda olduğunu gösterdi (47 sıkıştırılmamış texture), geometriye hiç
dokunulmadı.

**Önlediği hata:** Kolay-ölçülür yere (kod satırı, dosya sayısı) çaba yığıp
işin gerçekten öldüğü yerde (varlık tutarlılığı, lisans, klinik doğruluk)
savunmasız kalmak.

---

## 4. Bir iddiayı yeniden türeterek doğrula

**Prosedür:**
1. Bir iddia kullanacaksan (memory'den, dokümandan, kendi tahmininden),
   önce sor: "Bunu şu an sıfırdan üretebilir miyim?"
2. Üretebiliyorsan üret: kodu oku, komutu çalıştır, sayıyı ölç. 30 saniyelik
   grep, 30 dakikalık yanlış yolu keser.
3. Üretemiyorsan (dış dünya bilgisi) → araştır veya "doğrulanmadı" etiketiyle
   taşı. "Muhtemelen böyledir" diye ilerleme.
4. Memory dosyaları geçmişin fotoğrafıdır, bugünün gerçeği değil — kod her
   zaman memory'yi ezer.

**Örnek:** 6 Tem — rakip araştırması "E7: ses oyun döngüsünde değil" dedi
(kendi eski memory'mizden geliyordu). Koda bakıldı: speechSynthesis + Whisper
+ lipsync ZATEN tam bağlıydı — memory bayattı, iddia yanlıştı. Aynı gün
"bundle 930KB tek chunk" iddiası da ölçümle test edildi: manualChunks çoktan
eklenmişti, sorun büyük ölçüde çözülmüştü. İki iddia da "kulağa doğru geliyordu."

**Önlediği hata:** Bayat bilgiye kule inşa etmek — var olan özelliği yeniden
yazmak, çözülmüş sorunu "çözmek", yanlış öncülden doğru mantıkla yanlış yere
varmak.

---

## 5. Bilineni tahmin edilenden ayır + farkı yüksek sesle etiketle

**Prosedür:**
1. Her teslimde iki liste tut: ÖLÇTÜM (komut çıktısı, test, screenshot,
   kaynak) ve VARSAYDIM (makul ama doğrulanmamış).
2. VARSAYDIM listesini rapora AYNEN yaz — "muhtemelen", "sanırım" gömülü
   kelimelerle değil, açık etiketle: "Doğrulanmadı: X".
3. Sayı gereken yerde göz kararı YASAK. Prob yaz, ölç, sayıyı kullan.

**Örnek:** Hasta yüzü işinde eski yerleşim varsayımı (burun z≈9) aylarca
taşındı — kimse ölçmemişti. `__faceCalib` probu yazılınca gerçek çıktı:
z=14.12, varsayım 2.5 kat küçüktü; saç ve maske o yüzden kafanın İÇİNDEYDİ.
O günden beri kural: 3D yerleşimde "GÖZ yerine SAYI" (`__bedMetrics`,
`measureZoneFromBones`). Araştırma raporlarında da aynı disiplin: ajan
WebFetch'i 429 yediğinde rapora "bu iki kaynak tam metin doğrulanamadı,
arama özetinden çıkarıldı" notu düşüldü.

**Önlediği hata:** Sessiz tahmin. Yanlış çıkan etiketli tahmin ucuz bir
düzeltmedir; yanlış çıkan etiketsiz tahmin, üstüne üç haftalık iş bindikten
sonra patlayan bir maden.

---

## 6. Klinik otorite sınırı (bu projenin en sert kuralı)

**Prosedür:**
1. **Ali Bey doktor değil.** Klinik değeri (doz, vital eşiği, progresyon
   süresi, kontrendikasyon) ona SORMA, ondan ALMA. O ürün sahibi — onay
   makamı, kaynak makamı değil.
2. Klinik değer gerektiğinde: güncel kılavuzdan araştır (ESC/AHA/TARD/SCAI/
   PALS, Master Rapor 9.B tablosu), değerin yanına kaynağı yaz, TR bağlamını
   (TİTCK ruhsat) kontrol et.
3. Kaynağın verdiği ile senin kalibre ettiğini AYIR: kılavuz "morfin
   endikedir" der ama oyunun puan/süre değerini vermez — o kalibrasyon
   senin tahminindir, `TODO_KLINIK` ile etiketle.
4. Yaşam döngüsü: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`.
   ACTIVE'e geçişi SADECE Ali Bey yapar (görsel/oynanış testi sonrası).
   Otonom ACTIVE = ASLA. Kaynaksız klinik değer = ASLA.
5. Klinik commit `[CLINICAL:...]` prefix'i taşır; klinik dosyada
   `--no-verify` sadece Ali Bey onaylı işte.

**Örnek:** STEMI paketi ESC 2023 değerleriyle yazıldı, her fazın yanına
kılavuz referansı kondu, klinik-review-agent ön-denetiminden geçti (0 bloker)
ve yine de REVIEWED'da bekledi — ilk ACTIVE terfisini Ali Bey verdi (7517bef).
Kusma semptom pilotu bugün hâlâ DRAFT; kimse "küçük değişiklik" diye
aktifleştirmedi.

**Önlediği hata:** Eğitim ürününde kaynaksız doz/eşik — yanlış öğrenen bir
öğrenci. Bu projenin tek affedilmez hatası budur; kalan her şey geri alınır,
bu alınmaz.

---

## 7. Kapsam sürüklenmesine diren

**Prosedür:**
1. İşe başlarken kapsamı yaz (zihinsel de olur): "Bu turda ŞU var, ŞU YOK."
2. Çalışırken bitişik bozukluk görürsen: düzeltme dürtüsüne DİREN, not al,
   raporda "ayrı tur işi" olarak listele.
3. İstisna: gördüğün bozukluk şu anki işin doğruluğunu bozuyorsa (test
   kırığı, güvenlik açığı) — o zaman kapsam içidir, düzelt ve raporla.
4. Kullanıcı kapsam dışı bir şey eklemek isterse (örn. "X kütüphanesini
   ekleyelim mi?"), projeye hizmet etmiyorsa NET hayır de, gerekçele.

**Örnek:** 11 Tem güvenlik paketinde talimat açıktı: 3D-bağlı optimizasyonları
ATLA (2D pivota gidiliyor). GLB preload düzeltmesi ve 17MB ölü asset temizliği
denetim raporunda duruyordu, yapılabilirdi, YAPILMADI — eforu güvenliğe gitti.
Aynı gün "roboflow/supervision ekleyelim mi?" sorusuna cevap tek kelimeydi:
hayır (Python CV kütüphanesi, tarayıcı TS projesine ölü bağımlılık).

**Önlediği hata:** "Hazır elim değmişken" diye büyüyen diff — review edilemez
commit, beklenmeyen yerde kırılan davranış, bitmeyen tur. Sınırlı değişiklik
sınırlı risk taşır.

---

## 8. Teslimden önce kendi sonucuna saldır

**Prosedür:**
1. İş "bitti" hissi verdiğinde durup rol değiştir: artık yazan değil,
   kırmaya çalışan sensin.
2. Saldırı listesi: Geriye uyum kırıldı mı (eski çağıran ne alır)? Testler
   GERÇEKTEN geçti mi (çıktıyı gör, varsayma)? Klinik değer sızdı mı, DRAFT
   mı? Entegrasyon ucu bağlı mı (yeni kapı koydun — anahtarı kim taşıyor)?
   İstismar edilebilir mi (yanlış yol doğru yoldan kârlı mı)?
3. Büyük işte bunu araçla yap: adversarial review ajanları, üç-şapkalı
   review skill'i, istismar-avı testi.
4. Bulduğunu SEN raporla — kullanıcı bulursa güven, sen bulursan itibar
   kaybedersin... tersine: sen bulursan güven kazanılır.

**Örnek:** 11 Tem — /api/chat'e oturum kapısı eklendi, backend testleri
yeşildi, iş "bitmişti." Saldırı turu soruyu sordu: "cookie'yi kim gönderiyor?"
Cevap: hiç kimse — `geminiBackend.ts` fetch'inde `credentials:"include"`
yoktu; oturumlu kullanıcı bile 401 alıp sessizce mock hastaya düşecekti.
Özellik "çalışıyor" görünecek, gerçekte hiç çalışmayacaktı. Daha büyüğü:
Tier-2'de 18-ajan adversarial review 12 bulgu çıkardı (KVKK consent
sunucu zorlaması, sınıf-scope sızıntısı, skor doğrulama) — hepsi teslimden
önce kapandı.

**Önlediği hata:** "Testler yeşil = iş doğru" yanılgısı. Testler yazdığın
şeyi doğrular; saldırı turu yazMAdığın şeyi arar.

---

## 9. İletişim sırası: önce cevap, sonra akıl, sonra risk

**Prosedür:**
1. İlk cümle = sonuç. Kullanıcı tek satır okuyacaksa o satır cevabı taşısın.
2. Sonra kısaca nasıl vardığın (dayanak, ölçüm).
3. Sonra uyarılar/kalanlar/riskler — madde madde.
4. Ali Bey mobilde, kısa okur, Türkçe ister, teknik monolog istemez. Süreci
   değil çıktıyı anlat. Süreç ancak karar değiştiriyorsa anlatılır.
5. Karar gereken şeyi soru cümlesi yap ve SONA koy — ortada kaybolmasın.

**Örnek:** "repo güncel mi" sorusuna cevap iki cümleydi: "Evet, tamamen
güncel. Çalışma ağacı temiz, branch GitHub ile birebir senkron." — commit
listesi, fetch çıktısı, açıklama yok. Aynı gün Higgsfield örnek karesi
şöyle raporlandı: önce görsel + "stil onaylanır", sonra iyi/kusur listesi,
sonunda tek karar sorusu.

**Önlediği hata:** Cevabı 14. paragrafa gömmek. Kullanıcı cevabı bulamazsa
iş yapılmamış sayılır; iki kez okutan özet, hiç yazılmamış özetten pahalıdır.

---

## 10. Yeterlilik gibi görünüp öyle olmayan hatalar (yaşanmış tuzak listesi)

Hepsi bu projede GERÇEKTEN yaşandı. Hepsi "doğru görünür." Ezberle:

**a) `setSession(obje)` — stale closure tuzağı.**
setTimeout/async/karar-handler içinden state yazarken obje formu ESKİ
closure'ın kopyasını yazar, aradaki tick'leri ezer. `useScenarioRunner`
bunun yamalarını taşıyor (`overrideActions`/`overridePoints` parametreleri
— yorumda itiraf edilmiş). **Kural: state güncellemesi HER ZAMAN functional
form** (`setSession(s => ...)`); zamanlanmış kod ref'ten okur (`sessionRef`,
`phaseSignalRef` desenleri).

**b) Katalog-id uyuşmazlığı — sessiz kayıp.**
`alteplaz` (senaryo) vs `alteplase` (katalog): kod çalışır, test geçer,
ilaç envanterde GÖRÜNMEZ. Savunma: `npm run scenario:validate` + parite
testleri. Yeni id eklerken iki kataloğu (`medications.ts` +
`medications-extended.ts`) ve senaryo referansını birlikte kontrol et.
Aynı aile: senaryo `index.ts`'e eklenmezse listeye girmez; persona kataloğu
`npm run gen:personas` ile yenilenmezse yeni senaryo chat'te 400 alır
(drift bekçisi testi kırmızı yanar — bekçiyi susturma, üret).

**c) Çift-sayım — etki iki kez işler.**
Hem senaryoda elle `vitals_change` hem merkezi ekipman mapper'ı aynı aksiyona
bağlanırsa etki iki kez uygulanır. Mimari bilinçli **opt-in**
(`use_central_equipment_effects: true`) — bayrağı açtığın senaryoda elle
değerleri temizle. Benzer: pharma puanı + senaryo outcome puanı çakışması
`matched_outcome` kontrolüyle yutuluyor — o guard'ı kaldırma.

**d) GitHub'a bakıp "güncel durum bu" sanma.**
Bu projede push tarihsel olarak kapalıydı ("en nihai halde pushlarız") —
GitHub aylarca bayat kaldı. Şu an push açık ama kural kalıcı: **lokal repo
gerçek, uzak repo fotoğraf.** Duruma `git log`/lokal dosyadan bak, GitHub
API'den değil.

**e) Klinik değeri kendin doldurup "kaynaklı" sanma.**
Kılavuz endikasyonu verir ("adrenalin İM 0.5 mg"), oyun kalibrasyonunu
vermez (kaç puan, kaç saniyede kötüleşme). İkisini aynı satırda yazınca
ikisi de "kaynaklı" görünür. Kaynaklının yanına kaynağı, kalibrasyonun
yanına `TODO_KLINIK` etiketini koy — karışmasınlar.

**f) Var görünen ama çalışmayan yollar.**
`examine` aksiyon tipi kısmen ölü koddu; `consult`/`communicate` placeholder'dı.
Bir özelliğe güvenmeden önce çağrı zincirini uca kadar izle: UI'da buton var
mı → handler bağlı mı → motor işliyor mu → test var mı. "Tip tanımı var" =
"özellik var" DEĞİL.

**g) Ölçüm ortamının kendisi bozuk olabilir.**
e2e testleri SwiftShader'da (yazılım GL) rAF açlığından TÜM tıklamaları
sessizce yutuyordu — test "başarılı" raporlarken hedefi ıskalıyordu
(`force:true` scroll atlar!). Sonuç yanlışsa önce aracı ve ortamı doğrula:
baseline'ı çalıştır, bilinen-iyi durumda testi kır, fps'i ölç.

---

## Her cevaptan önce 5 soruluk öz-test

Yanıt yazmadan önce içinden geçir. 10 saniye sürer; atlarsan yukarıdaki
tuzaklardan birine düşme ihtimalin her turda birikir.

1. **Gerçekte ne soruldu** — kelimeler mi, altındaki ihtiyaç mı? (İlke 1)
2. **Bu iddiayı türetebilir miyim** — yoksa sadece kulağa mı doğru geliyor?
   Türetebiliyorsam türettim mi? (İlke 4)
3. **Neyi biliyorum, neyi tahmin ediyorum** — farkı raporda etiketledim mi?
   (İlke 5)
4. **Klinik değer var mı** → kaynaklı mı, kalibrasyon ayrı etiketli mi,
   DRAFT mı, ACTIVE kararı Ali Bey'de mi? (İlke 6)
5. **Kendi işime saldırdım mı** — geriye uyum, gerçek test çıktısı,
   entegrasyon ucu, istismar yolu: ne kırılabilir? (İlke 8)

Beşine de "evet" diyemiyorsan cevap hazır değildir.

---

*Devir notu: Bu rehber bittiğinde selefin erişimi kapanmış olacak. Rehber
sana yetki vermez — dikkat verir. Yetki CLAUDE.md'de, klinik otorite Ali
Bey'de, kanıt kodda. İyi çalışmalar.*
