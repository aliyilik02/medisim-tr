# Claude Code İçin Talimatlar

Bu dosyayı Claude Code projeye girdiğinde otomatik okur. Proje hakkında
hızlıca hakim olmak için tasarlandı. Kullanıcı da buradan fikir alabilir.

---

## Proje özeti

**MediSim TR** — Türkiye'ye özel, web tabanlı sanal hasta simülasyon
platformu. Tıp eğitimi, hemşirelik, acil sağlık ve saha sağlıkçıları için
senaryo tabanlı serious game.

Referans ürünler: Body Interact, Dimedus, MVR/Nasco.

## Kullanıcı profili

- **Kullanıcı sağlık profesyoneli.** Yazılım bilgisi sınırlı.
- Türkçe yazıyor, Türkçe cevap bekliyor.
- Bu bir girişim projesi — günde 2-3 saat zaman ayırıyor.
- Projeyi yalnız götürüyor; ekip yok.

## Senin rolün (Claude Code)

Kullanıcı teknik kararları sana bırakıyor. Ama körü körüne yapma:

1. **Kısa Türkçe açıklama yap** — ne yapacağını, niye yapacağını bir cümleyle söyle
2. **Yap** — kodu yaz, testi çalıştır
3. **Sonuç bildir** — başardım/başaramadım, sonraki adım ne olabilir

Uzun teknik monolog yazma. Kullanıcının gözü kaymasın.

---

## Teknik yığın

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS (özel palet: `ink-*`, `clinical-*`, `brand`)
- **Fontlar:** Instrument Serif (display), Geist (sans), Geist Mono (mono)
- **State:** useState (karmaşık durumlarda Zustand)
- **Icon:** lucide-react

**Henüz yok, gelecekte:**
- Backend: Node.js + Fastify + PostgreSQL + Prisma
- 3D: Three.js + React Three Fiber
- Auth: Lucia / BetterAuth
- Ödeme: iyzico

---

## Mimari kuralları

1. **Engine/UI ayrımı kutsaldır.** `src/engine/` içinde React import etme.
2. **Senaryo şeması** `src/engine/types.ts`'de tanımlı. Değiştirirken tüm
   mevcut senaryoları (`src/data/scenarios/*.ts`) güncellemen gerek.
3. **Senaryolar TS objesi.** `src/data/scenarios/` altında her biri bir
   dosya. `index.ts`'e eklenmezse listeye girmez.
4. **İlaç ve ekipman** `src/data/medications.ts` ve `src/data/equipment.ts`.
   Senaryoda kullanmadan önce katalogda tanımlı olmalı.
5. **Tailwind utility-first.** Tekrar eden stil → `@layer components`
   `src/index.css`'de.

---

## Tasarım dili

- **Dark mode**, klinik monitör estetiği
- Ana renkler: ink (siyah tonları) + brand yeşili (#7cb342) + clinical renkler
  (critical/warning/stable/info)
- Typography: display için Instrument Serif italic, body için Geist
- Asla: mor gradient, Inter/Roboto, cookie-cutter AI-look
- Kalıcı motifler: dijital tabular-num rakamlar, pulse-dot,
  font-mono uppercase tracking-wider etiketler

---

## Sık yapılacak işler

### Yeni senaryo ekle

1. `src/data/scenarios/<isim>.ts` oluştur
2. Scenario tipinde obje export et
3. `src/data/scenarios/index.ts`'e import + `SCENARIOS` dizisine ekle
4. Eksik ilaç/ekipman varsa kataloğa ekle

Kullanıcı sana **markdown taslak** verebilir (bkz.
`docs/SENARYO-YAZIM-REHBERI.md`). Onu TS'e çevir.

### Yeni ilaç/ekipman ekle

`src/data/medications.ts` veya `equipment.ts`'e ekle. `default_dose`
klinik olarak doğru olmalı — emin değilsen kullanıcıya sor.

### Deploy

Henüz deploy kurulumu yok. Kullanıcı isterse:
- **Frontend:** Vercel (free tier) — `vercel deploy`
- **Backend (gelecek):** Railway veya Fly.io

---

## Proje kurulum kontrolü

Kullanıcı sana proje açıldığında geldiyse ilk şunları kontrol et:

```bash
# Node version (>=18 gerekli)
node --version

# Bağımlılıklar yüklü mü?
ls node_modules 2>/dev/null && echo "OK" || npm install

# Dev server çalışıyor mu?
# npm run dev ile 5173'te açılmalı
```

---

## Sık karşılaşılan istekler ve cevap örnekleri

### "Senaryo X ekle"
1. Kullanıcıya "Detayları var mı yoksa ben mi klinik kılavuzdan türeteyim?" sor
2. `docs/SENARYO-YAZIM-REHBERI.md`'deki formatla eksik bilgileri topla
3. `src/data/scenarios/` altına TS dosyası yaz
4. `index.ts`'e ekle
5. `npm run dev` ile test et, tarayıcıda açılıp oynanıyor mu gör

### "3D ekle"
Bu büyük bir iş. Kullanıcıya önce **kapsamı daralt**:
- Hangi prosedür? (örn. sadece oskültasyon)
- Hangi senaryo için?

Sonra:
1. Three.js + R3F yükle
2. Ready Player Me / Sketchfab'tan hazır model
3. Hotspot sistemi kur
4. Tek prosedürü aşamalı implement et

Asla "tüm 3D'yi bir seferde" deneme.

### "Backend kur"
Ayrı bir konuşma gerektirir. Önce:
- Hangi veritabanı hosting? (Supabase / Railway / Neon)
- Auth nasıl?
- Frontend→backend sözleşmesi (REST / tRPC)?

Bunlar netleşmeden kod yazma.

### "Test yaz"
`engine/` saf fonksiyon, Vitest kolay. Başla:
```bash
npm i -D vitest @vitest/ui
```
`src/engine/__tests__/engine.test.ts` oluştur.

---

## Git / commit alışkanlığı

Her anlamlı değişiklikten sonra commit at. Mesajlar Türkçe ve açıklayıcı:

```
feat: DKA senaryosu eklendi (5 adım, dahiliye)
fix: sınav modunda feedback görünmesi engellendi
docs: senaryo yazım rehberi güncellendi
refactor: inventory panel filtre mantığı sadeleştirildi
```

---

## Takılırsan

Kullanıcı teknik ayrıntı bilmiyor. Takıldığında:

1. **Sorunu Türkçe, sade dille anlat** — "npm paketinde çakışma var, çözüyorum"
2. Yanlış gidiyorsa **durdur, sor** — "3D için hangi seviye gerçekçilik?"
3. Alternatif önerirken **en iyi 2 seçeneği** ver, 10 seçeneği değil

Sabır, kalite, iletişim — kod hızından daha değerli.
