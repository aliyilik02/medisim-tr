# Genel Değerlendirme + Rakip/Teknoloji Araştırması — 6 Temmuz 2026

> Ali Bey isteği: "hekim + yazılımcı + oyun geliştirici olarak değerlendir; rakiplere bak;
> motor/görsel/UI-web ne gelişebilir." İki paralel derin web araştırması (rakip analizi +
> teknoloji trendleri) + kod tabanı içi üç-şapkalı denetim sentezi.
> Yol haritası önceliklerine girecek maddeler sonda işaretli.

---

## 1. KRİTİK DIŞ GELİŞMELER (hemen bilinmeli)

1. **Ready Player Me KAPANDI (31 Ocak 2026, Netflix satın alması).** `rpm-avatar` skill'i
   ve Sprint D.2 planı ölü referans — MPFB2/CC0 hattı artık tek stratejik yol (bağımlılık
   riski kanıtlandı). Aksiyon: rpm-avatar skill'i arşivle/güncelle.
2. **Pulse Engine'in tarayıcı yolu YOK** — resmi tek yol Unity WebGL; saf JS/WASM binding
   kimse yapmamış. Node sidecar planımız (pulse-engine-binding) doğru; tarayıcı-içi WASM bekleme.
3. **Body Interact'ın AI diyalog dillerinde Türkçe YOK** — TR pazarı penceresi açık ama
   kalıcı değil. Yerli tarayıcı-tabanlı 3D+fizyoloji+LLM rakip **tespit edilemedi**
   (SimuleHasta Moodle-tabanlı; Dijital Hastane doğrulanamadı).
4. **İsim çakışması riski:** aramada `medisim.pages.dev` "SimuleHasta" başlığıyla listelendi —
   Ali Bey marka/alan adı kontrolü yapmalı.

## 2. REKABET KONUMU (özet — tam matris ajan raporunda)

**Savunulabilir farklarımız:** Türkçe+TR kılavuz disiplini (tam boş alan; Body Interact dahil
kimsede yok) · açıklanabilir/test-edilebilir deterministik motor (1220 vitest) · KVKK-yerli
mimari (tarayıcı-içi STT, pseudonim öğrenci) · sıfır donanım maliyeti · cezasız klinik
muhakeme katmanı.

**Somut eksiklerimiz (önem sırası):**
| # | Eksik | Rakip referansı |
|---|---|---|
| E1 | Vaka hacmi: 16 vs 250-1500 | Body Interact 1500+; ilk kurumsal soru bu |
| E2 | Ventilasyon+kan gazı (ABG) fizyolojisi | Body Interact'ın ana teknik farkı |
| E3 | Eğitmene açık vaka-yazma aracı | OMS Create, Full Code Creator, SimX marketplace |
| E4 | Kılavuz-karşılaştırmalı debrief raporu | Body Interact'ın en övülen özelliği |
| E5 | Yarışma/turnuva modu | BI Student Challenge — öğrenci topluluğu büyüme motoru |
| E6 | LMS/SSO/LTI entegrasyonu | OMS: SSO+LMS+ISO27001 kurumsal eşik |
| E7 | Sesli diyalog oyun döngüsünde | OMS/BI sesli; bizde altyapı hazır ama bağlı değil |
| E8 | CME/STE kredilendirme | Full Code'un bireysel abonelik meşrulaştırıcısı |

## 3. ÜÇ ŞAPKALI İÇ DEĞERLENDİRME (kod tabanı, 6 Tem gecesi durumu)

### 🩺 Hekim
- **Güçlü:** kılavuz-atıf disiplini, DRAFT→ACTIVE yönetişimi (bu gece ilk ACTIVE: STEMI),
  farmakoloji kontrendikasyon motoru, yaş-spesifik vital kapısı testte.
- **Eksik:**
  1. Senaryo çeşitliliği dar — kardiyoloji ağır; nöroloji/psikiyatri/toksikoloji 1'er vaka.
     Atipik prezentasyon kuralı (Master Rapor 9.D Kural 7) çoğu senaryoda uygulanmamış.
  2. Fizik muayene derinliği sınırlı — inspeksiyon/oskültasyon var; **palpasyon, perküsyon,
     nörolojik muayene (GKS bileşenleri, pupil, refleks), 12-derivasyon EKG yorumlatma
     akışı** yüzeysel ya da y  2. Fizik muayene derinliği sınırlı — inspeksiyon/oskültasyon var; palpasyon-perküsyon yok.
  3. Ventilasyon → vital klinik etki bağlı değil, ABG üretimi yok (E2).
- **Karar:** çeşitlilik + muayene derinliği Hat C (içerik) işi; ABG Hat E (Pulse) işi.

### 💻 Yazılımcı
- **Güçlü:** saf-fonksiyonel motor (React import 0), 1220 vitest, engine kapsam %96,
  faz-senkron tek kaynak, dallanan karar + semptom olayı yeni. tsc 0, build temiz.
- **Eksik:**
  1. Push YOK — ~65 lokal commit tek makinede (risk; Ali Bey "en nihai halde").
  2. Bundle 930KB+ tek chunk (kod-bölme yok; ilk yük yavaş).
  3. CI lint kırık (eslint devDep yok — bilinen).
  4. Backend hata durumu UI'da bugün düzeldi (Failed to fetch → TR mesaj).
- **Karar:** kod-bölme (route lazy) düşük emek-orta etki; push kararı Ali Bey'de.

### 🎮 Oyun geliştirici
- **Güçlü:** 3 pedagojik mod, gerçek-zaman baskısı (deterioration), dallanma yeni,
  istismar-avı testi kilitli, 4 kamera preset + prosedürel canlı sahne.
- **Eksik:**
  1. Gamification yok — leaderboard/rozet/turnuva (E5; BI Student Challenge muadili).
  2. Ses döngüde değil — TTS/STT hazır ama bağlı değil (E7).
  3. Görsel "ucuz demo" hissi — SSS cilt + HDRI + post-proc ile kırılır (aşağıda).
  4. Onboarding/tutorial yok — ilk kez giren öğrenci elle keşfeder.
- **Karar:** ses döngüsü + leaderboard orta emek-yüksek daldırma; görsel 3 hamle net.

## 4. TEKNOLOJİ/GÖRSEL YOL (emek × etki, ajan raporu sentezi)

**Görsel — en yüksek getirili 3 hamle (prosedürel+Mixamo uyumlu, geometri bozmaz):**
1. Ekran-uzayı SSS/translucency cilt shader'ı (`patientShader.ts`, WebGL2) — O emek, 5 etki.
2. HDRI environment + ACES tonemapping (prosedürel odaya) — D-O emek, 4 etki.
3. Hafif post-processing (bloom+vignette+grain) — D emek, 3 etki.

**Motor/sistem — 12 ayda uygulanabilir:**
- Gemini Flash TTS (mevcut SSE hattı, $10/M) — D emek, 4 etki. Sesli hasta.
- WebAudio faz-tabanlı ortam/monitör ses katmanı (getActivePhaseSignal→ses) — D, 4.
- Rubrik-tabanlı LLM debrief (Calgary-Cambridge 71 beceri, grounded) — O, 5.
- Sanal hasta grounding sertleştirme (senaryo JSON tek gerçek, uydurma guard) — D, 4.
- Yetkinlik-haritası dashboard (/ilerleme+/egitmen radar/ısı) — O, 4.
- WCAG 2.2 AA (renk+ikon alarm, 3:1 kontrast, altyazı, renk-körü mod) — O, 3.

**KAÇIN (hype, düşük getiri):** Pulse tarayıcı-içi WASM · BioGears · şimdi WebGPU-only ·
avatar SaaS'a çekirdek bağlama (RPM kapanışı dersi) · FMOD/Wwise · LLM'e serbest tanı.

## 5. YOL HARİTASINA ÖNERİLEN YENİ MADDELER (öncelik sırası)

| Öncelik | Madde | Hat | Emek | Neden |
|---|---|---|---|---|
| 1 | SSS cilt + HDRI + post-proc (görsel 3 hamle) | B | O | En yüksek "gerçek ürün" hissi; demo→ürün |
| 2 | Kılavuz-karşılaştırmalı debrief tablosu | C/A | D | BI'ın en övülen özelliği, veri zaten var |
| 3 | Sesli diyalog döngüye bağlama (Gemini TTS + Whisper STT) | B/A | D-O | OMS/BI sesli deneyim, altyapı hazır |
| 4 | Vaka hacmi doldurma (16→40 ilk hedef) | C | O-Y | E1 — ilk kurumsal soru |
| 5 | Yarışma/leaderboard modu | D | O | E5 — öğrenci topluluğu büyüme |
| 6 | Eğitmen vaka-yazma sihirbazı | D | O-Y | E3 — kurumsal kanca |
| 7 | rpm-avatar skill arşivle (RPM kapandı) | — | D | Ölü referans temizliği |
| 8 | Route kod-bölme (bundle 930KB) | — | D | İlk yük hızı |

## 6. KAYNAKLAR
Rakip analizi + teknoloji trendleri: iki paralel `general-purpose` ajan (WebSearch+WebFetch,
6 Tem 2026). Tam matris + URL'ler ajan transkriptlerinde. Klinik ön-denetim: klinik-review-agent.
İç değerlendirme: canlı Playwright UI turu (home/liste/egitmen/ilerleme/gecmis) + kod okuma.
