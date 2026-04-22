# 👋 Buradan Başla

Elindeki klasör: **MediSim TR v0.1 · alpha**

Eski iki sohbetteki vizyonun yeniden çalışmaya ve büyümeye hazır halde.
Artık "tek bir HTML artifact" değil — gerçek bir yazılım projesi.

---

## Şu an yapman gerekenler (sırasıyla)

### 1. **[KURULUM.md](./KURULUM.md)** dosyasını oku ve uygula

Node.js yükle → projeyi bilgisayarında çalıştır. 30-45 dakika.
Tarayıcıda MediSim TR karşına gelecek, iki senaryoyu oynayabileceksin
(STEMI + Anaflaksi).

### 2. **[docs/GITHUB-REHBERI.md](./docs/GITHUB-REHBERI.md)** ile projeyi GitHub'a yükle

Yedek + versiyon kontrol + Claude Code'un üzerinde çalışabilmesi için şart.

### 3. Claude Code'u kur ve projede aç

```bash
npm install -g @anthropic-ai/claude-code
cd medisim-tr
claude
```

Claude Code açıldığında `CLAUDE.md` dosyasını otomatik okur; proje
hakkında her şeyi bilerek başlar. Ona Türkçe istek atabilirsin:

```
> Sistemi deneyelim. npm install ve npm run dev çalıştır.
> 3. senaryo olarak DKA (Diyabetik Ketoasidoz) ekle.
> index.ts'e eklemeyi unutma.
```

### 4. **[docs/YOL-HARITASI.md](./docs/YOL-HARITASI.md)** dosyasını oku

Ne zaman ne yapacağımızın planı. Faz 1 → Faz 5.

---

## Dosya haritası

| Dosya | Neden önemli |
|---|---|
| **[README.md](./README.md)** | Projenin genel tanıtımı |
| **[KURULUM.md](./KURULUM.md)** | İlk açılış için adım adım |
| **[CLAUDE.md](./CLAUDE.md)** | Claude Code için talimatlar (otomatik okunur) |
| **[docs/MIMARI.md](./docs/MIMARI.md)** | Teknik tasarım — nasıl çalışıyor |
| **[docs/SENARYO-YAZIM-REHBERI.md](./docs/SENARYO-YAZIM-REHBERI.md)** | Kendi senaryonu yazmak için |
| **[docs/YOL-HARITASI.md](./docs/YOL-HARITASI.md)** | 6 aylık plan |
| **[docs/GITHUB-REHBERI.md](./docs/GITHUB-REHBERI.md)** | GitHub kurulumu |

---

## Önemli notlar

🟢 **Ne hazır:** Tam çalışır quiz platformu, 2 senaryo, eğitim + sınav modu,
puanlama, debrief, responsive tasarım.

🟡 **Ne eksik:** Backend, hesap, 3D modül, askeri modül, ödeme. Bunlar
sıradaki fazlar — [yol haritasında](./docs/YOL-HARITASI.md) yazılı.

🔴 **Tuzaklara dikkat:** Eski sohbette "her şeyi birden yap" yaparak
takılmıştık. Bu sefer **sırayla**. Önce 15-20 iyi senaryo, sonra backend,
sonra 3D. Acele etme.

---

## Hazır olduğunda bana gel

- Senaryo yazdın → "bu taslağı ekle"
- Bir özellik istedin → "şunu da yapalım"
- Bir yerde takıldın → hatayı yapıştır, çözeriz
- Yeni yatırımcı/kurum demoya çağırmış → "demo için şunu hazırla"

**Her sohbette CLAUDE.md otomatik okunacak** (Claude Code'da) — o yüzden
her seferinde projeyi baştan anlatmana gerek yok. Hemen işe koyuluruz.

Kolay gelsin. 🩺
