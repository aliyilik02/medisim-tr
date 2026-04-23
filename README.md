# MediSim TR

**GitHub:** https://github.com/aliyilik02/medisim-tr

**Türkiye'ye özel, web tabanlı sanal hasta simülasyon platformu.**
Tıp öğrencileri, hemşireler, acil sağlık personeli ve saha sağlıkçıları için
senaryo tabanlı klinik eğitim.

> ⚠️ Proje şu an **v0.1 · alpha** aşamasında. Eğitim amaçlıdır, klinik karar
> verme aracı olarak kullanılamaz.

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

**İki modül planlanıyor:**

| Modül | Durum | Açıklama |
|---|---|---|
| **Quiz / Senaryo** | ✅ aktif | Adım adım klinik karar — ilaç, ekipman, tanı, tedavi seçimi |
| **3D İnteraktif** | 🔜 yakında | Hastaya/ekipmana dokunarak müdahale (Body Interact tarzı) |

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

### v0.1 (bu sürüm)

- ✅ Senaryo motoru (TypeScript tipleri + değerlendirme mantığı)
- ✅ Eğitim / sınav modu
- ✅ Puanlama, harf notu, debrief
- ✅ Hasta kartı, vital monitörü (klinik renk kodlaması)
- ✅ İlaç + ekipman envanteri (20 ilaç, 30 ekipman)
- ✅ 2 tam senaryo (STEMI, Anaflaksi)
- ✅ Türkçe arayüz

### Planlanan (yol haritası)

- 🔜 Three.js / WebGL ile 3D hasta & hotspot sistemi
- 🔜 Askeri TCCC modülü (turnike, penetran toraks, hipotermi)
- 🔜 Kullanıcı hesabı + ilerleme takibi (backend)
- 🔜 Kurumsal lisans paneli (hocalar için sınıf görünümü)
- 🔜 iyzico ödeme entegrasyonu
- 🔜 Senaryo editörü (kod bilmeden senaryo ekleme)
- 🔜 Görsel EKG, lab, görüntüleme entegrasyonu

---

## Teknoloji

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + custom design system
- **Routing:** React Router
- **State:** React useState (gerektiğinde Zustand)
- **3D (planlanan):** Three.js + React Three Fiber
- **Backend (planlanan):** Node.js + Fastify + PostgreSQL

---

## Katkı

Bu bir girişim projesi. Şu an tek geliştiriciyle ilerliyor ve mimari/şema
kararları güncelleniyor. Geri bildirim için issue açabilirsiniz.

**Senaryo katkısı:** Sağlık profesyoneliyseniz ve senaryo yazmak isterseniz
[Senaryo Yazım Rehberi](./docs/SENARYO-YAZIM-REHBERI.md)'ni inceleyin.

---

## Lisans

Henüz belirlenmedi. Ticari kullanım için iletişime geçin.

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
