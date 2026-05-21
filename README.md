# MediSim TR

**GitHub:** https://github.com/aliyilik02/medisim-tr

[![Test](https://github.com/aliyilik02/medisim-tr/actions/workflows/test.yml/badge.svg)](https://github.com/aliyilik02/medisim-tr/actions/workflows/test.yml)

**Türkiye'ye özel, web tabanlı sanal hasta simülasyon platformu.**
Tıp öğrencileri, hemşireler, acil sağlık personeli ve saha sağlıkçıları için
senaryo tabanlı klinik eğitim.

> ⚠️ Proje şu an **v0.3 · alpha** aşamasında (Sprint B.5+ — 3D klinik
> simülasyon canlı). Eğitim amaçlıdır, klinik karar verme aracı olarak
> kullanılamaz.

**Canlı demo route'ları (yerel `npm run dev` sonrası):**
- **/dialog-3d-demo** — 🌟 Tam paket: 3D hasta + 20 anatomik marker + AI hasta diyaloğu (Gemini) + canlı Vital HUD/EKG + cilt kesim + senaryo motor entegre + debrief skor modal
- **/3d-demo** — Standalone 3D model + marker'lar + breathing + cilt tonu + oskültasyon
- **/dialog-demo** — Calgary-Cambridge 5 aşama AI hasta diyaloğu (mock/Gemini)
- **/senaryolar** — Klasik 2D senaryo seçimi (14 senaryo, eğitim/sınav modu)
- **/hakkinda** — Atıflar (CC BY/BY-SA), disclaimer, klinik standartlar

---

## İçindekiler

- [Proje nedir?](#proje-nedir)
- [Hızlı başlangıç](#hızlı-başlangıç) → [Detaylı kurulum rehberi](./KURULUM.md)
- [Ne var içinde?](#ne-var-içinde)
- [Mimari](./docs/MIMARI.md)
- [Senaryo yazım rehberi](./docs/SENARYO-YAZIM-REHBERI.md)
- [Yol haritası](./docs/YOL-HARITASI.md)
- [Claude Code ile çalışma](#-claude-code-ile-çalışma)

---

## Proje nedir?

MediSim TR, öğrencinin gerçek bir hastayı karşıladığında yapması gerekenleri
bilgisayar/mobil ortamda pratik etmesini sağlayan bir **serious game** (ciddi oyun).

**Modüller:**

| Modül | Durum | Açıklama |
|---|---|---|
| **Quiz / Senaryo** | ✅ aktif | Adım adım klinik karar — ilaç, ekipman, tanı, tedavi seçimi |
| **3D İnteraktif** | ✅ beta | Hastaya/ekipmana dokunarak müdahale — 20 anatomik marker, breathing shader, oskültasyon, cilt kesim |
| **AI Hasta Diyaloğu** | ✅ beta | Gemini 2.5 Flash + Calgary-Cambridge 5 aşama (mock fallback) |

**İki oyun modu:**

- **Eğitim modu** — anında feedback, süre baskısı yok
- **Sınav modu** — feedback gizli, zamanlı, sonunda harf notu

**Hedef referans ürünler:** Body Interact, Dimedus, MVR/Nasco — ama
Türkiye müfredatına özel, Türkçe, uygun fiyatlı, askeri (TCCC) modül dahil.

---

## Hızlı başlangıç

Yazılımla aran yoksa [KURULUM.md](./KURULUM.md) dosyasındaki adım adım
rehberi oku. Hızlı versiyonu:

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılacak.

---

## Ne var içinde?

### v0.3 (bu sürüm — Sprint B.5+)

**Senaryo motoru:**
- ✅ TypeScript tipleri + değerlendirme mantığı + farmakoloji tick
- ✅ Eğitim / sınav modu, 5 zorluk seviyesi
- ✅ Puanlama, harf notu (Body Interact uyumlu %85/70/55/40 standart eşikler), debrief modal
- ✅ Hasta kartı, canlı vital monitörü, EKG dalga formu (1-derivasyon + 12-Lead)
- ✅ İlaç + ekipman + lab/görüntüleme envanteri
- ✅ **14 tam senaryo** — kardiyoloji, dahiliye, acil, pediatri, cerrahi, anestezi, kadın doğum, hemşirelik, askeri TCCC

**3D klinik simülasyon (Sprint B.5+):**
- ✅ Sketchfab CC BY 4.0 anatomik manken (chuma6oy Male full body, gltf-transform optimize 1.33 MB)
- ✅ Z-Anatomy Splanchnology iç organlar (CC BY-SA 4.0) + cilt kesim slider
- ✅ **20 anatomik marker** — 5 kardiyak APE-T-M + 4 akciğer lobu + 6 karın kadrant + 2 karotis + 2 femoral
- ✅ Breathing shader (chest + abdomen çift center diafragma simülasyonu)
- ✅ Cilt tonu shader (siyanoz / ikter / solgun / normal preset'leri, vital→cilt otomatik mapping)
- ✅ 4 Wikimedia CC BY/BY-SA oskültasyon sesi (lung_wheeze, lung_crackles, heart_normal, heart_61bpm)
- ✅ Action submit + Decision/Info step UI + Debrief modal + Toast feedback + Vital trend sparkline

**AI hasta diyaloğu (Sprint B.2):**
- ✅ Gemini 2.5 Flash + Cloudflare Workers backend (SSE stream chat)
- ✅ Calgary-Cambridge 5 aşama process backbone
- ✅ Mock fallback (backend yokken)

**Klinik altyapı:**
- ✅ Klinik kod altyapısı (ICD-10 / SNOMED CT / RxNorm) — DRAFT veri katmanı
- ✅ Türk kılavuz kural motoru (DRAFT, 10 örnek kural — TARD, BDHD, ACOG-MFTP-TR, ESC, WAO, WALLS, WSES kaynaklı)
- ✅ PALS 2015 yaş-spesifik vital eşik tabloları
- ✅ Türkçe arayüz + KVKK 6698 + ÜYZ Rehberi 2025 uyumu

**Test/CI:**
- ✅ **475 vitest birim/regresyon/yapı testi** (29 dosya)
- ✅ **25 Playwright E2E test** (smoke + 3D demo + engine flow)
- ✅ GitHub Actions CI (Test + Coverage + E2E)
- ✅ Husky pre-commit + pre-push hooks

### Planlanan (yol haritası)

- 🔜 RPM (Ready Player Me) full-body avatar — göz blink, ağız blendshape, pupilla
- 🔜 Tek tek CC BY organ modelleri (Sketchfab/BodyParts3D — kalp/akciğer/karaciğer)
- 🔜 Pulse Physiology Engine (Apache 2.0) Node sidecar entegrasyonu
- 🔜 Cloudflare BAA Workers/DO prod kurulum
- 🔜 Tailwind v3 → v4 + shadcn/ui geçiş
- 🔜 Kullanıcı hesabı + ilerleme takibi (backend genişletme)
- 🔜 Kurumsal lisans paneli (hocalar için sınıf görünümü)
- 🔜 iyzico ödeme entegrasyonu
- 🔜 Senaryo editörü tam özellik (kod bilmeden senaryo ekleme)
- 🔜 Klinik kural motoru ACTIVE entegrasyonu (DRAFT review sonrası)

---

## Teknoloji

- **Frontend:** React 18 + TypeScript 5 + Vite 5 (build manualChunks ile vendor split)
- **3D:** Three.js r170 + @react-three/fiber + drei (chunk: 730 kB)
- **Styling:** Tailwind CSS v3 + custom design system (ink + brand teal + clinical palette)
- **Routing:** React Router 6
- **State:** React useState + Zustand (gerektiğinde)
- **Backend & AI:** Cloudflare Workers + Durable Objects + Gemini 2.5 Flash (SSE)
- **TTS:** Azure tr-TR Neural TTS (planlanan)
- **Test:** Vitest + Testing Library (happy-dom) + Playwright (chromium)
- **CI:** GitHub Actions + husky pre-commit/pre-push hooks
- **Asset pipeline:** gltf-transform (mesh optimize + meshopt + metalrough)

## Test ve geliştirme

```bash
npm test              # tüm test paketi (475 vitest)
npm run test:watch    # değişikliklerde otomatik
npm run test:ui       # tarayıcıda interaktif panel
npm run test:coverage # HTML coverage raporu
npm run test:e2e      # Playwright e2e (25 test)
npm run test:visual   # 3D vision regression
npm run build         # prod build + tsc check
```

Detaylar: [`tests/README.md`](./tests/README.md). Geçmiş aşama raporları
`tests/PHASE-*.md` dosyalarında.

---

## Katkı

Bu bir girişim projesi. Şu an tek geliştiriciyle ilerliyor ve mimari/şema
kararları güncelleniyor. Geri bildirim için issue açabilirsiniz.

**Senaryo katkısı:** Sağlık profesyoneliyseniz ve senaryo yazmak isterseniz
[Senaryo Yazım Rehberi](./docs/SENARYO-YAZIM-REHBERI.md)'ni inceleyin.

---

## Lisans

Henüz belirlenmedi. Ticari kullanım için iletişime geçin.

### Üçüncü taraf içerik lisansları

3D modeller, oskültasyon sesleri, fontlar ve yazılım bağımlılıkları için
detaylı atıf metinleri:

- **3D Modeller:** [`src/components/patient-3d/LICENSE-3D.md`](./src/components/patient-3d/LICENSE-3D.md) — chuma6oy + MaceLogice + Z-Anatomy (CC BY 4.0 / CC BY-SA 4.0)
- **Oskültasyon Sesleri:** [`public/sounds/auscultation/SOUNDS-LICENSE.md`](./public/sounds/auscultation/SOUNDS-LICENSE.md) — James Heilman MD + Wikimedia Commons (CC BY/BY-SA 3.0)
- **Uygulama içi atıflar:** `/hakkinda` route — tüm açık kaynak içerik için görünür atıf

---

## 🤖 Claude Code ile çalışma

Bu proje **Claude Code otonom ajan** kullanımı için hazırlanmış. Kurulum:

```bash
npm install -g @anthropic-ai/claude-code
cd medisim-tr
claude
```

Claude Code açılınca `CLAUDE.md`'yi otomatik okur — projenin kurallarını, mimarisini ve mevcut yapılacaklar listesini öğrenir.

### Slash komutları

Proje özel komutlar `.claude/commands/` içinde tanımlı. Claude Code içinde kullan:

| Komut | İşlev |
|---|---|
| `/durum` | Projenin güncel durumu + yapılacaklar özeti |
| `/senaryo-ekle <isim>` | Yeni klinik senaryo iskeleti oluşturur |
| `/ilac-ekle <id>` | İlaç kataloğuna yeni ilaç ekler (iki dosyaya da) |
| `/test-calis` | Tip kontrolü + lint + prod build |
| `/build-kontrol` | Commit öncesi zorunlu kontrol + güvenli commit/push |

### Ayarlar

- `.claude/settings.json` — paylaşılan ayarlar (izinli komutlar). Commit edilir.
- `.claude/settings.local.json` — kişisel ayarlar (varsa). `.gitignore`'da, commit edilmez.

### Çalışma prensibi

1. Küçük kararları Claude kendi alır (değişken adı, refactor, kütüphane).
2. Büyük kararlarda durur ve sorar (yeni modül, şema, tıbbi içerik).
3. Klinik içerikte asla doğaçlama yapmaz — emin değilse işaretler, sorar.
4. Her anlamlı iş sonrası Türkçe özet + commit atar.

Detaylı ajan talimatları: [`CLAUDE.md`](./CLAUDE.md).
