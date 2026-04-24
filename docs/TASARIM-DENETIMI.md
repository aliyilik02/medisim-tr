# MediSim TR — Tasarım Kimliği Denetimi

**Tarih:** 25 Nisan 2026
**Kapsam:** Aşama 1 — Gözlem ve öneri raporu. Kod değişikliği yok.
**Denetçi:** Claude Code (otonom ajan)

---

## 1. Mevcut Durum Özeti

**Değerlendirilen dosyalar:**
- `src/App.tsx` — header, footer, nav
- `src/pages/HomePage.tsx` — hero, stat kartları, feature kartları, senaryo önizlemesi
- `src/pages/ScenarioListPage.tsx` — filtreler, senaryo kartları, yerel senaryo yönetimi
- `src/pages/ScenarioPlayPage.tsx` — oyun arayüzü top bar, layout, mod seçici
- `src/components/PatientCard.tsx` — hasta kimlik/anamnez kartı
- `src/components/VitalsMonitor.tsx` — vital bulgular, sparkline, delta okları
- `src/components/EcgStrip.tsx` — canvas tabanlı EKG animasyonu
- `src/components/DebriefScreen.tsx` — sonuç ekranı, vaka akış grafiği
- `src/index.css` — base stiller, component katmanı
- `tailwind.config.js` — palet, font, animasyon tanımları

**Genel estetik izlenim:** Zemin doğru, üst katman jenerik. Dark mode + ink paleti + mono etiketler + EKG animasyonu gerçek bir klinik hava yaratıyor — ancak bunların üzerine oturtulan bileşen dili (ikon kutuları, gradient progress bar, kullanıcı profil kartı gibi hasta kartı) bu atmosferi bozuyor. Şu an iki ayrı tasarım dili çatışıyor: biri klinik monitör estetiği, diğeri 2023 model SaaS ürünü.

**Paletin güçlü yanları:** ink renk skalası mükemmel — #0a0a0b'den #f5f5f0'a neredeyse nötr siyahlar monitör estetiğine tam uyuyor. Tipografi sistemi (Instrument Serif + Geist + Geist Mono) birbiriyle tutarlı ve klinik ciddiyetle uyumlu.

**Paletin zayıf yanı:** Brand yeşili (#7cb342) klinik teknoloji çağrışımı yapmıyor; "doğal sağlık" veya "wellness app" çağrışımı yapıyor. Soğuk bir teal veya koyu zümrüt, hem karanlık arka planla daha güçlü kontrast sağlar hem de medikal cihaz estetiğine yakınsar.

---

## 2. "Jenerik AI Dashboard" Tuzakları

### 2.1 Rounded icon box pattern — en yaygın, en zararlı

**Nerede:** `HomePage.tsx:178` — FeatureCard içi, `HomePage.tsx:100-101` — Editor CTA, `ScenarioPlayPage.tsx:629` — ModeSelector kard başlıkları.

**Görünüm:** `w-10 h-10 rounded-md bg-brand/10 border border-brand/20` içinde Lucide ikonu. Bu stil tam olarak Notion, Linear, Vercel, Stripe ve 2021-2024 arasında çıkmış her B2B SaaS ürününde var. Okuyucunun beyninde "tech ürünü" değil "proje yönetim aracı" tetikliyor.

**Alternatif:** İkon kutusunu kaldır. Bunun yerine: specialty'yi belirten tek renkli ince sol kenar çizgisi (`border-l-2 border-clinical-stable`), veya sadece yazı ağırlığıyla hiyerarşi kur. Klinik monitörlerde ikonlara değil etiket + değer çiftine bakılır.

---

### 2.2 Gradient progress bar

**Nerede:** `ScenarioPlayPage.tsx:445` — üst barda adım ilerleme çubuğu, `DebriefScreen.tsx:229-236` — skor çubuğu.

**Görünüm:** `bg-gradient-to-r from-brand-dark to-brand-light`. Bu stil bir SaaS onboarding adım göstergesi veya mobil fitness uygulaması gibi görünüyor. Klinik bir araçta progress izleme bu şekilde yapılmaz — adım numaraları veya segment blokları daha doğru hissi verir.

**Alternatif:** Sabit renkli bir progress bar, veya daha iyisi: `Adım 3 / 7` gibi keskin sayısal gösterim. Gradient hiçbir klinik bilgi taşımıyor; yalnızca "modern ürün" sinyali veriyor.

---

### 2.3 Hasta kartı → kullanıcı profil kartı

**Nerede:** `PatientCard.tsx:8-11` — User lucide ikonu, rounded-md box.

**Görünüm:** Bir Lucide `User` ikonu, gri kare kutu içinde. Bu tam olarak her SaaS uygulamasında gördüğümüz kullanıcı avatarı placeholder'ı. Gerçek bir klinik dosya bu şekilde başlamaz.

**Alternatif:** Sol kenarda dikey `border-l-4` klinik trafik rengi (hasta stabil → yeşil, instabil → sarı, kritik → kırmızı), üst satırda hasta protokol numarası (örn. `VAKA-2847`), yaş/cinsiyet mono etikette. Hiçbir ikon yok. Gerçek hasta dosyası formatı: kimlik üstte, şikayet altında, geçmiş madde madde.

---

### 2.4 Emoji-like semboller

**Nerede:** `ScenarioListPage.tsx:260` — `⏱`, `◆`, `▲` karakterleri senaryo kart altı istatistiklerinde.

**Görünüm:** Unicode semboller metin içinde, boyutu diğer metinle aynı. Bu karakter karışıklığı özenle seçilmiş diğer tipografi stillerinin içinde tutarsız ve amatör duruyor.

**Alternatif:** Lucide ikonları (Clock, Layers, Trophy) veya sadece düz metin + uppercase mono etiket. Sembol kullanılacaksa `·` ayırıcı yeterli — zaten mevcut tasarımda bu kullanılıyor ve daha temiz görünüyor.

---

### 2.5 Senaryo kartları → kurs kataloğu formatı

**Nerede:** `HomePage.tsx:128-158`, `ScenarioListPage.tsx:234-267`.

**Görünüm:** Başlık + açıklama + alt meta bilgi + sağda ok ikonu. Bu tam olarak Coursera, Udemy veya herhangi bir LMS'in kurs kartı formatı. Sağ üstteki ArrowRight hover animasyonu da "git bak" hissini pekiştiriyor.

**Alternatif:** Klinik vaka özeti formatı. Sol üstte ZAMAN BASKISI veya KOMPLEKSITE göstergesi (bir klinik trafik lambası değil, ısı haritası gibi şey), hastanın demografisi (62Y/E, T/A), ana başvuru şikayeti birinci satırda büyük, önerilen müdahale süresi. Bir tıp hocası listeye bakınca "bu hangi vakayı öğretiyor" sorusunu bir saniyede cevaplayabilmeli.

---

### 2.6 Debrief ekranı → sınav sonuç ekranı

**Nerede:** `DebriefScreen.tsx:194-208` — harf notu badge'i, `StepTimeline` bileşeni.

**Görünüm:** Büyük harf notu (A/B/C/F) drop-shadow ile. Bu görsel bir oyun high-score ekranına veya okul sınav sonuçlarına ait. StepTimeline'daki dikey bar chart ise herhangi bir analytics dashboard'unda görülebilir.

**Alternatif:** Klinik rapor formatı. Üstte protokol bilgisi (tarih, senaryo ID, kullanıcı adı, zorluk seviyesi) — not değil. Adım bazlı tablo: Adım No / Müdahale / Sonuç / Puan / Açıklama. Harf notu gizli bir yerde, küçük, ikincil bilgi olarak. Gerçek OSCE (Objective Structured Clinical Examination) değerlendirme formuna bakarak format alınabilir.

---

### 2.7 Stat kartları → ürün metrikleri

**Nerede:** `HomePage.tsx:36-54` — "Aktif Senaryo / Uzmanlık Alanı / Oyun Modu / Klinik Referans" kartları.

**Görünüm:** 4 eşit büyüklükte `panel p-5` kutu, büyük display rakam + mono etiket. Bu tam olarak bir SaaS landing page'de "10.000+ kullanıcı / 50+ özellik / %99 uptime" kartları formatı.

**Alternatif:** Bu bölüm tamamen kaldırılabilir (içerik zayıf — "2 oyun modu" impressive değil). Yerine klinik kimlik vurgulayan bir şey: EKG şeridi grafik olarak header'ı geçen bir banner, veya gerçek bir hasta vaka özeti fragmanı örnek olarak gösterilebilir.

---

## 3. MediSim TR'ye Özgü Unsurlar — Durum

### 3.1 Tabular-num rakamlar

**Durum: İyi ama eksik.** `VitalsMonitor`'da `vital-display` class'ı `tabular-nums` içeriyor ve VitalBox'ta doğru kullanılıyor. Ancak `DebriefScreen`'de StatBox bileşenindeki rakamlar (`font-display`) tabular-nums değil — süre sayacı "2:07" geçici boyuna göre kaymayabilir.

**Öneri:** `StatBox`'a ve `StepTimeline` puan sayılarına `tabular-nums` ekle.

---

### 3.2 EKG şeridi

**Durum: Teknik olarak güçlü, görsel olarak yarım.** Canvas tabanlı gerçek zamanlı animasyon, pattern'e göre renk kodlaması, shadowBlur glow efekti — bunlar gerçekten iyi. Ancak arka plan çok minimal: sadece bir baseline çizgisi ve RR aralığını işaret eden dikey çizgiler var.

**Eksik:** Gerçek EKG kağıdı ızgarası yok. EKG kağıdında küçük kareler 1mm × 1mm (0.04s × 0.1mV), büyük kareler 5mm × 5mm (0.2s × 0.5mV), kırmızımsı/pembemsi renk. Bu ızgara EkG şeridini bir monitör bileşeninden gerçek klinik araca taşır. Şu an bu ızgara olmadan şerit "animasyonlu çizgi grafik" gibi duruyor.

**Öneri:** Canvas'a EKG kağıdı ızgarası ekle — küçük kareler `rgba(255,80,80,0.06)`, büyük kareler `rgba(255,80,80,0.12)`. Bu değişiklik klinik kimliği en hızlı güçlendirecek görsel düzeltme.

---

### 3.3 Monitör rengi ve alarm görsel karşılıkları

**Durum: Renk sistemi doğru, alarm yokluğu hissettiriyor.** `clinical.critical` kırmızı, `clinical.warning` amber, `clinical.stable` yeşil — bu doğru klinik trafik lambası sistemi. Ancak kritik vital (örn. HR < 50) sadece renk değişimiyle gösteriliyor; gerçek monitörlerde kritik alarm durumunda vital değer yanıp söner.

**Öneri:** Kritik status'ta `animate-pulse` animasyonu ekle VitalBox'ta. Bu küçük ama medikal cihaz estetiğine doğru bir adım.

---

### 3.4 Uppercase etiketler ve tracking-wider

**Durum: Tutarlı, güçlü.** `font-mono text-[10px] uppercase tracking-[0.2em]` pattern her yerde tutarlı kullanılıyor — VitalsMonitor, PatientCard, DebriefScreen, header nav. Bu tasarımın en güçlü tarafı. Klinik monitör etiket diline çok yakın.

**Küçük tutarsızlık:** `ScenarioListPage.tsx:260`'daki meta bilgi satırı (`⏱ dk · ◆ adım · ▲ puan`) bu sisteme uymayan bir karakter karışımı içeriyor.

---

### 3.5 Pulse-dot kullanımı

**Durum: Az kullanılıyor.** Pulse-dot footer'da "sistem aktif" yanında ve VitalsMonitor'da "Canlı" yanında görünüyor. İkisi de doğru yer — ama hasta kritik duruma girdiğinde critical renkli pulse-dot gösterilmiyor.

**Öneri:** PatientCard'da sabit bir `pulse-dot` (hasta stabilse yeşil, kritik vitals varsa kırmızı) sol kenar veya başlık yanında olsa hasta durumu tek bakışta anlaşılır.

---

### 3.6 Hasta kartı — gerçek hasta dosyası hissi

**Durum: Jenerik kullanıcı kartı.** `PatientCard` tek satır yaş/cinsiyet, şikayet, özgeçmiş, alerji. Görsel düzeni bir SaaS kullanıcı profil sayfasından farksız.

**Ne eksik:** Vaka numarası, başvuru zamanı (HH:MM), triyaj öncelik rengi, hasta şikayetinin "chief complaint" olarak klinik formatı. Gerçek hasta dosyasında şikayet "göğsümde ağrı var" değil "substernal göğüs ağrısı, 2 saattir, ezici tarzdaki, sol kola yayılıyor" formatında klinik özet.

---

### 3.7 Senaryo kartları — klinik vaka özeti mi, kurs kartı mı?

**Durum: Kurs kartı.** Başlık büyük, açıklama altında, meta bilgi en altta. Okuyucu "bu senaryo ne anlatıyor" sorusuna yavaş ulaşıyor.

**Klinik vaka formatı:** Demografik bilgi (62Y/E), ana şikayet ("substernal göğüs ağrısı"), zorluk görsel göstergesi (trafik rengi değil solid bar), süre ve zorluk düzeyi rakam olarak.

---

### 3.8 Debrief — klinik rapor formatı mı, sınav ekranı mı?

**Durum: Sınav ekranı.** Harf notu en büyük görsel eleman. "Senaryo Tamamlandı" başlığı bir oyun bitiş ekranı gibi hissettiriyor.

**Klinik rapor formatı:** "Vaka Özeti" başlığı, tarih/saat/protokol, senaryo ve kullanıcı bilgisi, ardından adım bazlı tablo. Harf notu tablonun altında, küçük, "Sonuç: A (90/100)" formatında.

---

## 4. Palet ve Tipografi Denetimi

### 4.1 Palet yeterliliği

Mevcut palet işlevsel ama brand rengi yanlış tonda. `#7cb342` (açık sarı-yeşil) şu sorunları yaratıyor:
- Karanlık arka planlarda yeterince parlak ama "lime green" = wellness, fitness, organik ürün çağrışımı
- Medikal teknoloji cihazlarında bu tonu görmüyoruz — orada ya soğuk beyaz/gri ya da acil kırmızısı/monitör yeşili var
- Monitör yeşili (#10b981 = `clinical.stable`) zaten var ve çok daha güçlü bir tıbbi cihaz rengi

**Önerilen brand renkleri (seçimlik):**
- Seçenek A: Teal `#0d9488` — medikal cihaz, soğuk, profesyonel. Karanlıkta harika durur.
- Seçenek B: Zümrüt `#059669` — mevcut `clinical.stable`'a yakın ama biraz daha derin.
- Seçenek C: Kobalt mavi `#2563eb` — teknoloji ağırlıklı. Acil/kritik renkleriyle güçlü kontrast.

Mevcut `#7cb342` tutulacaksa en azından `brand-light`'ı daha soğuk bir tona (`#5ba832`) çekmek gerekiyor.

### 4.2 Eksik ton

Palete `clinical.dim` veya `clinical.resolved` gibi bir "deaktif / tamamlanmış" tonu eklenebilir — beyaz olmayan, gri olmayan, "bu adım geçildi" rengi. `#3f6451` gibi koyu zümrüt bu işe yarar.

### 4.3 Tipografi hiyerarşisi

Hiyerarşi temelde çalışıyor:
- H1-H2: `font-display` (Instrument Serif)
- Body: `font-sans` (Geist, implicit)
- Label/tag: `font-mono uppercase tracking-wider`
- Sayısal değer: `font-mono tabular-nums`

**Sorun:** `DebriefScreen`'de StatBox rakamlar `font-display` kullanıyor (`text-2xl`) — süre gibi değişken genişlikte içerikler için display font yerine mono daha doğru.

**Sorun:** `PatientCard`'da `font-display text-lg` yaş/cinsiyet için — bu küçük boyutta display font görsel hiyerarşiye katkı sağlamıyor, body ile fark yaratmıyor.

### 4.4 Geist Mono tutarlılığı

Tablolarda, istatistiklerde, vital değerlerde Geist Mono tutarlı kullanılıyor. Bir istisna: `HomePage`'deki "3+" "5+" gibi feature senaryo sayıları `font-display` ile gösteriliyor ama bunlar sayısal veri — mono + tabular-nums daha doğru olur.

---

## 5. Marka Kimliği

### 5.1 Logo

Mevcut logo: `Activity` lucide ikonu + küçük heartbeat dot.

**Yeterliliği:** Fonksiyonel ve eğitim amaçlı kullanımda kabul edilebilir. Ancak `Activity` ikonu jenerik — "herhangi bir sağlık/fitness uygulaması" sinyali veriyor. Tıp fakültesi dekanı bu logoyu görürse "bir startup uygulaması" algısı oluşabilir.

**Öneri:** Aşama 2'de özgün bir sembol için tasarımcı desteği değerlendir. Kısa vadede: logonun yanındaki "Sanal Hasta Platformu" monoline yazısını büyüt ve "TR" harflerini brand rengiyle değil farklı bir sembolik elemanla vurgula (örn. küçük bir EKG tepe noktası).

### 5.2 Kelime markası tutarlılığı

"MediSim TR" yazımı tutarlı — footer mono uppercase, header display font italic. Bu tutarlılık iyi. Ancak başka yerlerde "medisim-tr" (slug formatında), "MediSim TR" ve "MediSim" karışık kullanılıyor. Bir stil kılavuzu notu: her zaman "MediSim TR" (boşluklu, TR büyük).

### 5.3 Ses/ton — boş durumlar ve uyarı mesajları

- `PatientCard`: Alerji uyarısı `⚠ Alerjiler` — emoji karışımı, ciddiyet azalıyor
- `ScenarioListPage:191`: "Henüz yerel senaryonuz yok" — tamamı uygun ama "senaryonuz" yerine "kayıtlı vakan" gibi klinik terminoloji kullanılabilir
- `ScenarioPlayPage:397-401`: Senaryo çıkış confirm mesajı "İlerleme kaybolacak" — düz, doğru ton
- Modal ve onay diyalogları genel olarak sade ve uygun tonla yazılmış

**Eksik:** Bir onboarding mesajı yok. Platforma ilk giren öğrenci ne görür? Hero metni iyi ama "bu platform nasıl çalışır, hangi seviyede başlamalıyım" sorusuna görsel cevap yok.

### 5.4 Önerilen 5 kimlik taşı

Bu uygulamayı 1-2 saniyede tanıtabilecek görsel/tipografik öğeler:

1. **Canlı EKG şeridi** — sayfa başında, header arkasında veya hero'da geçen gerçek dalga formu animasyonu. Şu an sadece oyun içinde görünüyor.

2. **Klinik trafik rengi sol kenar** — her içerik kartının sol kenarında 4px border (stable/warning/critical duruma göre). Renk kodu standartlaştırılırsa her kartın anlamı tek bakışta okunur.

3. **Tabular mono timestamp** — her önemli sayısal değerin altında küçük mono uppercase etiket. Zaten var ama tutarsız. Standartlaştırılırsa güçlü görsel dil.

4. **Hasta protokol numarası** — Her vakada benzersiz ID (VAKA-2847 formatında), sayfa başlığında değil header'da küçük mono metin. Gerçek klinik sistemlerin en tanıdık öğesi.

5. **/ Section breadcrumb** — Bu zaten var (`/ Senaryo Kütüphanesi`, `/ Debrief`) ve çok iyi. Tutarlı uygulanırsa güçlü bir kimlik unsuru olabilir. Şu an bazı sayfalarda yok (homepage hero'da yok, mode selector'da eksik).

---

## 6. Specialty Bazı Varyasyon

**Uygulanabilirlik:** Teknik olarak uygulanabilir, pratik açıdan dikkat isteyen bir özellik.

**Önerilen palet haritası:**
| Uzmanlık | Vurgu rengi | Mantık |
|---|---|---|
| Kardiyoloji | Mevcut brand (teal'a geçilirse #0d9488) | EKG yeşili, monitör estetiği |
| Acil | `#dc2626` (clinical.critical tonunda) | Acil = kırmızı, evrensel |
| Pediatri | `#0ea5e9` (açık mavi) | Hem medikal hem "çocuk dostu" |
| Dahiliye | `#7c3aed` (mor) | Akademik, sakin |
| Askeri/TCCC | `#4d7c0f` (koyu khaki-yeşil) | Taktik saha tıbbı |

**Pratik güçlükler:**
- Tailwind utility-first sisteminde her specialty için ayrı renk seti tanımlamak config şişirme yaratır
- CSS custom property (`--specialty-color`) çözümü daha temiz: layout'a `data-specialty="acil"` attribute ver, CSS ile renklendir
- Senaryo içindeki tüm bileşenler (VitalsMonitor, PatientCard, StepDisplay) context'ten bu rengi okur

**Öneri:** Önce 2 specialty'de (kardiyoloji + acil) MVP test et. Eğer kullanıcı testi olumlu sonuç verirse diğerlerine genişlet. Tüm sistemden önce sadece "specialty header badge" rengi değiştirmek bile fark yaratır.

---

## 7. Öncelikli Düzeltme Listesi

### P1 — Bu 3 değişiklik %80 farkı yaratır

**1. EKG kağıdı ızgarası**
- Sorun: EcgStrip canvas'ı arka plan ızgarasız, bir çizgi grafik gibi duruyor.
- Çözüm: Canvas draw'a küçük kare (1mm ≈ 4px) ve büyük kare (5mm ≈ 20px) ızgara ekle, `rgba(255,100,100,0.07)` ve `rgba(255,100,100,0.14)` tonlarında.
- Etki: Yüksek — en güçlü tek görsel kimlik değişikliği
- Süre: 1-2 saat

**2. PatientCard'ı klinik dosya formatına dönüştür**
- Sorun: `User` lucide ikonu + rounded-md kutu = SaaS kullanıcı profili.
- Çözüm: Sol kenar `border-l-4` klinik trafik rengi (stabil/kritik); üstte tek satır protokol numarası (mono, koyu); ikon yok; hasta şikayeti daha büyük ve anında görünür; alerji uyarısı `⚠` karakteri değil kırmızı `!` badge'i.
- Etki: Yüksek — oyun ekranının sol sütunundaki en belirgin bileşen
- Süre: 2-3 saat

**3. Rounded icon kutularını kaldır**
- Sorun: `w-10 h-10 rounded-md bg-brand/10 border border-brand/20` içinde ikon — FeatureCard ve EditorCTA'da.
- Çözüm: İkon kutusunu kaldır. Başlık önüne ince bir `border-l-2` veya sadece başlık + alt çizgi. Klinik protokol listesi formatı.
- Etki: Yüksek — homepage'deki en belirgin SaaS izi
- Süre: 1 saat

---

### P2 — Orta öncelik

**4. Gradient progress bar → segmentli gösterim**
- Sorun: `bg-gradient-to-r from-brand-dark to-brand-light` oyun progress bar'ı ve skor bar'ı için.
- Çözüm: Oyun içi progress bar'ı kaldır, yerine `Adım 3 / 7` text göstergesi. Skor bar'ı sabit brand renk, gradient yok.
- Etki: Orta — ince ama kalıcı bir SaaS sinyali
- Süre: 30 dakika

**5. Senaryo kart alt metadatası**
- Sorun: `⏱ ◆ ▲` karakterler inconsistent ve amatör.
- Çözüm: `Clock · Layers · Trophy` Lucide ikonları 12px, veya sadece `· 15 dk · 7 adım · 120p` düz metin mono format.
- Etki: Orta — detay ama profesyonellik hissi
- Süre: 30 dakika

**6. Kritik vital değerlerde pulse animasyonu**
- Sorun: Critical durumdaki vital sadece kırmızı renk, statik.
- Çözüm: VitalBox'ta `status === "critical"` iken değer `animate-pulse` alır.
- Etki: Orta — klinik cihaz davranışına yakınsar
- Süre: 15 dakika

---

### P3 — Düşük öncelik / vizyon

**7. Brand renk tonu revizyonu**
- Sorun: #7cb342 = wellness/fitness çağrışımı
- Çözüm: Teal (#0d9488) veya soğuk zümrüt (#059669)
- Etki: Yüksek ama tartışmalı — kullanıcı onayı gerekli
- Süre: 2 saat (tailwind.config + tüm brand referansları)

**8. Debrief ekranı format revizyonu**
- Sorun: Harf notu dominant, sınav ekranı hissi
- Çözüm: Klinik rapor formatı — protokol üstte, adım tablosu ana içerik, not küçük ve ikincil
- Etki: Orta — platformun "ciddi eğitim aracı" algısını artırır
- Süre: 3-4 saat

**9. Homepage hero stat kartları**
- Sorun: "2 oyun modu / 5+ uzmanlık" SaaS landing page metrikleri
- Çözüm: Ya kaldır, ya da örnek EKG şeridi fragmanı veya klinik vaka önizlemesi ile değiştir
- Etki: Düşük-orta
- Süre: 2 saat

**10. Specialty bazı renk sistemi MVP**
- Sorun: Tüm uzmanlıklar aynı brand rengi
- Çözüm: CSS custom property + data-attribute, 2 specialty'de test
- Etki: Yüksek — uzun vadede güçlü kimlik ayrımı
- Süre: 4-6 saat

---

## 8. İlham Referansları

**MDCalc (mdcalc.com)**
Tıbbi hesaplama platformu. Neden ilham alınır: Her hesaplama aracı için kaynak kılavuz linki ve klinik bağlam. Bilgi yoğunluğu yüksek ama aşırı yüklemiyor. Beyaz/koyu gri palet, hiçbir gradient yok. Tablo ve sayı ağırlıklı düzen. MediSim için öğrenme: klinisyene yönelik arayüzde hava sahası boşaltmak değil, her pikselde bilgi taşımak.

**Phillips IntelliVue / Mindray hasta monitörü ekranları**
Gerçek klinik monitör UI'ı. Neden ilham alınır: Renk kodlaması, font seçimi (mono, tabular), vital değerlerin görsel hiyerarşisi, alarm gösterimi. EkG kağıdı ızgarası bu referanstan alınabilir. MediSim için öğrenme: vital değerlerin etrafındaki "boş alan" tasarımı — klinisyen yanlışlıkla değerleri okuyamaz, her şey kasıtlı ve net.

**Bloomberg Terminal**
Finans veri terminali. Neden ilham alınır: Bilgi yoğunluğu aşırı yüksek ama öğrenilmiş hiyerarşi sayesinde okunabilir. Renkler sadece anlam taşır (yeşil = artış, kırmızı = düşüş), dekoratif değil. Mono font, tabular hizalama, kısa etiketler. MediSim için öğrenme: "Jenerik AI dashboard" ile "uzman bilgi arayüzü" arasındaki fark tam burada — uzman arayüzler öğrenme eşiği talep eder, ama bir kez öğrenilince çok verimli olur.

---

**Rapor sonu. Aşama 2 için kullanıcı onayı bekleniyor.**
