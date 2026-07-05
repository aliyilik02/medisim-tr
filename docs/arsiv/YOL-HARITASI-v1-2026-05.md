# Yol Haritası

**Nerede olduğumuz ve nereye gittiğimiz.** Her şey değişebilir; bu bir
rehber, anayasa değil.

---

## ✅ Şu an (v0.1 · alpha)

Tamamlanmış olanlar:

- [x] Proje iskeleti (React + TS + Vite + Tailwind)
- [x] Senaryo motoru — tip sistemi, değerlendirme, puanlama
- [x] Eğitim ve sınav modları
- [x] Hasta kartı + klinik vital monitör
- [x] İlaç (20) ve ekipman (30) kataloğu
- [x] 2 tam senaryo (STEMI + Anaflaksi)
- [x] Debrief ekranı — harf notu, öğrenim noktaları, kaynaklar
- [x] Ana sayfa + senaryo listesi + arama/filtre
- [x] Responsive (mobil çalışır)
- [x] Türkçe dokümantasyon

**Test amaçlı her şey çalışıyor ama şunlar YOK:**
- Kullanıcı hesabı / giriş
- Gerçek veritabanı / ilerleme kaydı
- 3D modül
- Görsel EKG / lab
- Ödeme

---

## 🎯 Faz 1 — Tam Quiz Platformu (1-2 ay)

Amaç: Quiz modülünü "çalışır ürün" seviyesine çıkarmak.

- [ ] **5-10 senaryo daha** (hedef: her uzmanlıkta en az 2)
  - Kardiyoloji: Kardiyojenik şok, aritmi
  - Dahiliye: DKA, sepsis, akut pankreatit
  - Pediatri: Sepsis, ateşli havale, bronşiyolit
  - Acil: İnme, GİS kanama, pnömotoraks
  - Hemşirelik: IV kateter, hasta güvenliği
- [ ] **Görsel EKG entegrasyonu** — gerçek EKG görüntüleri
- [ ] **Lab/görüntüleme** — tetkik sonucunu gösteren componentler
- [ ] **Hasta hikayesi derinleşmesi** — anamnez alma alt adımları
- [ ] **Engine testleri** (Vitest ile unit test)
- [ ] **Senaryo doğrulama scripti** — her senaryo şemaya uyuyor mu
- [ ] **PWA** — "ana ekrana ekle" → mobilde app gibi görünür

**Başarı ölçüsü:** 1-2 tıp fakültesi hocasına göster, "bunu öğrencilerime
kullandırırım" desin.

---

## 🏗️ Faz 2 — Backend & Hesap (2-3 ay)

Amaç: "Tek kişilik demo" olmaktan çıkıp "çok kullanıcılı platform" olmak.

- [ ] **Backend kurulumu** (Node.js + Fastify + PostgreSQL)
- [ ] **Kimlik doğrulama** (email/şifre + e-posta doğrulama)
- [ ] **İlerleme kaydı** — hangi senaryo oynandı, puan geçmişi
- [ ] **Kurumsal hesaplar** — hocalar sınıfını görür
- [ ] **Basit analitik** — hoca için: "öğrenciler en çok nerede takılıyor"
- [ ] **Lisans modelleri**
  - Bireysel (aylık / yıllık)
  - Kurumsal (tıp fakültesi — öğrenci başı)
  - Askeri (TSK özel paket)
- [ ] **iyzico ödeme entegrasyonu**
- [ ] **Deploy pipeline** — Vercel (FE) + Railway (BE)

**Başarı ölçüsü:** 1 tıp fakültesi ile pilot anlaşma, 100+ aktif öğrenci.

---

## 🎮 Faz 3 — 3D İnteraktif Modül (3-5 ay)

Amaç: Body Interact tarzı etkileşim, ama uygun fiyatla.

- [ ] **Three.js kurulumu** — React Three Fiber wrapper
- [ ] **Hazır insan modeli** (Ready Player Me veya benzeri)
- [ ] **Hotspot sistemi** — vücutta tıklanabilir noktalar
- [ ] **Temel prosedürler:**
  - Oskültasyon (stetoskopla vücut bölgesine dokunma → ses)
  - EKG kablosu bağlama (10 lead'i doğru yere yerleştir)
  - IV kateter (damar seçimi + yerleştirme animasyonu)
  - Oksijen maskesi / entübasyon
- [ ] **Envanter drag-and-drop** — ekipmanı hastanın üzerine sürükle
- [ ] **Animasyonlar** — ilaç verince iğne animasyonu, defib için
      şok dalgası
- [ ] **Mevcut senaryoları 3D'ye port etme** — aynı veri, yeni UI

**Başarı ölçüsü:** Demoyu yatırımcıya / üniversite dekanına göster,
"bu Türkiye'ye lazım" desin.

---

## ⚔️ Faz 4 — Askeri / TCCC Modülü (3-4 ay, Faz 3 paralel)

Amaç: Bertaş kanalıyla TSK / askeri sağlık birlikleri için ayrı ürün
konumu.

- [ ] **TCCC protokol senaryoları** (10-15 adet)
  - MARCH algoritması (Massive bleeding, Airway, Respiration, Circulation, Hypothermia)
  - Turnike uygulaması
  - Hemostatik gazlı bez
  - İğne torakostomi
  - Nazofaringeal havayolu
  - Taktik saha triyajı
- [ ] **Askeri sahne tasarımı** — hastane değil, saha/zemin
- [ ] **Gürültü, stres faktörleri** — zaman baskısı artmış
- [ ] **Tematik UI varyantı** — koyu yeşil / olive drab, askeri font
- [ ] **Ayrı lisans katmanı** — askeri modül kurumsal lisansla aktif

---

## 🧠 Faz 5 — İçerik ve Topluluk (sürekli)

- [ ] **Senaryo editörü** — tarayıcıdan form doldurarak senaryo ekleme
      (kod bilmeyen hekimler için)
- [ ] **Senaryo paylaşımı** — kullanıcılar kendi senaryolarını topluluğa açabilir
- [ ] **Adaptif zorluk** — öğrencinin geçmişine göre senaryo öner
- [ ] **Çoklu dil** (İngilizce versiyonu — uluslararası pazara)
- [ ] **VR desteği (WebXR)** — Meta Quest tarayıcıdan 3D sahne

---

## 🚀 Faz 6 — Alışılmışın Dışında Motorlar (vizyon havuzu)

Bu, "Türkiye'de hatta dünyada başka kimse yapmıyor" katmanı. Mevcut faz sırasını bozmaz — Faz 1+2+3+4+5 yine sırayla. Bu havuzdan en az biri Faz 2'den sonra paralel başlayabilir; AI Hasta + Zaman Makinesi en yüksek WOW × düşük risk kombinasyonu.

### 🤖 6.1 — AI Hasta (anamnez gerçek diyalogla)
Hastanın NPC'si Anthropic API üzerinden konuşur. Senaryoda "saklı bilgi havuzu" tanımlanır; doğru soru sorulmazsa bilgi gizli kalır. Anamnez becerisi puanlanır. Hiçbir Türkçe platformda yok.
- Tahmini süre: 1 hafta
- Risk: API maliyeti (per-request limit + caching)
- Bağımlılık: Mevcut motor + ek `anamnesis` step kind

### ⏪ 6.2 — Zaman Makinesi (alternative timeline)
Vaka biter, debrief'te herhangi bir adıma geri dön, farklı karar ver, "ya o anda heparin verseydim" görsele bak. SessionState snapshot'lanır, paralel oynatılır.
- Tahmini süre: 3-4 gün
- Risk: Düşük (state snapshot mimarisi)
- Pedagojik değeri devasa: gerçek hayat hatadan dönüşe izin vermez, simülasyon vermeli

### 🧬 6.3 — Patofizyoloji Canlı Animasyon
Sol tarafta hasta vücudu — DKA'da pankreas/böbrek/glukoz pompası canlı çalışır, STEMI'de tıkalı damar görünür ve tPA verince damar açılır. SVG animasyon (3D değil, daha az iş, daha hafif).
- Tahmini süre: 2-3 hafta
- Risk: İllüstrasyon işi (sanat varlığı bağımlılığı)

### 🇹🇷 6.4 — Türkiye-Özel Motor Katmanı
- TİTCK ilaç ad otomatik (Aspirin → "Coraspin/Asabir")
- SGK SUT geri ödeme uyarısı ("bu ilaç ödenmez, alternatif?")
- **Yerel hastalıklar:** Akdeniz ateşi, KKKA, Brusella, talasemi, Behçet — Türkiye'de bol görülen ama global platformlarda olmayan
- Türkiye epidemiyoloji istatistikleri tanı diferansiyelinde
- Tahmini süre: 1-2 hafta (veri toplama yorucu)
- Pazarda kimsenin yapmadığı diferansiyasyon

### 🧠 6.5 — Klinik Akıl Yürütme Şeması
Her karar otomatik bir karar ağacına ekleniyor: semptom → diferansiyel → test → tanı → tedavi. Vaka sonu kullanıcı kendi düşünce zincirini görsel görür. Tıp eğitiminin kutsal kasesi.
- Tahmini süre: 1 hafta
- Risk: UX tasarım zor (graph layout)

### 🎮 6.6 — Çok-Oyunculu Ekip Simülasyonu
2-4 öğrenci aynı vaka: lider, yardımcı hekim, hemşire, anestezi. Real-time. CPR ekip dinamiği. Backend gerekir (Faz 2 işi).
- Tahmini süre: 1-2 ay
- Bağımlılık: Backend (Faz 2 ile birleşik)
- WOW: rakip yok

### 📊 6.7 — Yetkinlik RPG Haritası
Her vaka oyladıkça branş × beceri matrisinde XP toplar. "Kardiyolojide Lv 7, Endokrinde Lv 3". Heatmap "şu konularda zayıfsın → şu vakaları öner".
- Tahmini süre: 4-5 gün (frontend) + Faz 2 backend ile entegre
- Risk: Backend olmadan zayıf

### Önerilen sıra

| Sıra | Modül | Faza yerleştirme |
|------|-------|------------------|
| 1 | 6.2 Zaman Makinesi | Faz 1 sonrası, mevcut motor üstüne |
| 2 | 6.1 AI Hasta | Faz 2 ile paralel (hesap sistemi rate limit için lazım) |
| 3 | 6.5 Akıl Yürütme | Faz 2 sonrası |
| 4 | 6.4 TR Motoru | Faz 2 sonrası, sürekli devam eden veri katmanı |
| 5 | 6.3 Patofizyoloji | Faz 3 ile paralel (3D yerine SVG fallback) |
| 6 | 6.7 RPG | Faz 2 backend hazır olunca |
| 7 | 6.6 Çok oyunculu | Faz 4 sonrası, en uzun iş |

---

## 📊 Başarı göstergeleri (KPI)

Her fazın sonunda kontrol:

- Aktif kullanıcı sayısı
- Senaryo tamamlama oranı
- Ortalama not (çok yüksekse zorluk az, çok düşükse yanlış tasarlanmış)
- NPS (kullanıcı tavsiye eder mi?)
- Kurumsal lisans sayısı
- MRR (aylık tekrarlayan gelir)

---

## 🔴 Dikkat edilecek tuzaklar

Eski sohbetlerde çok zaman kaybettik, bu tuzaklara tekrar düşmeyelim:

1. **"Her şeyi birden yap" tuzağı** — Her faz sırayla. Faz 3 bitmeden
   Faz 4'e girme.
2. **"100 senaryo" tuzağı** — Önce 20 mükemmel senaryo. Sayı değil
   kalite.
3. **"Unity / Unreal" tuzağı** — Şu an için Three.js yeterli. AAA
   grafik gerekmez.
4. **"Ücretsiz verelim, sonra ücret alırız" tuzağı** — Baştan fiyat
   koy. Üniversitelerle pilot olarak ücretsiz ama ticari model baştan
   net olmalı.
5. **"Önce ekip kuralım" tuzağı** — Sen + Claude Code ile Faz 1'i bitir.
   Ekip, trafiğin geldiği noktada gerekir.

---

## Claude Code'a verilecek öncelikli görevler

Bu listeyi kopyalayıp Claude Code'a ver, sırayla yapsın:

### Haftalık plan (örnek — ilk hafta)

```
1. "Proje çalışıyor mu kontrol et — npm install ve npm run dev."
2. "STEMI senaryosuna bir '6. adım' ekle: taburculuk planlaması."
3. "3. senaryo olarak DKA ekle (Diyabetik Ketoasidoz). 
    5 adımlı, dahiliye, zorluk 3."
4. "src/data/scenarios/index.ts'i güncelle, DKA'yı listeye ekle."
5. "engine/ için ilk unit testleri yaz (Vitest)."
```

### Faz 1'in ilk 10 görevi

```
1. GitHub repo oluştur, ilk commit yap
2. Vercel'e deploy et — canlıya çık (free tier)
3. 3. senaryo ekle: DKA
4. 4. senaryo ekle: Pediatrik sepsis
5. 5. senaryo ekle: Akut inme
6. Engine unit testleri
7. Senaryo şema doğrulayıcı script
8. Görsel EKG componenti (placeholder yerine gerçek)
9. Dark mode toggle (şu an zorla dark, isteğe bağlı yap)
10. 404 sayfası + error boundary
```

Her görevi Claude Code'a tek tek ver. Acele etme. Her biri yapıldıktan
sonra test et, sonra commit. "Hepsini aynı anda yap" deme.
