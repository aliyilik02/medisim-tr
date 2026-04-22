# Kurulum Rehberi

**Hedef kitle:** Sağlık profesyoneli, yazılımcı değilsin, sadece projeyi
bilgisayarında çalıştırmak istiyorsun.

Bu rehberi adım adım takip edersen, sıfırdan başlayarak 30-45 dakikada
MediSim TR'yi kendi bilgisayarında çalıştırıyor olacaksın.

---

## Ne yapacaksın, özet

1. **Node.js** yükle (yazılımın çalışma ortamı)
2. **GitHub'a proje yükle** (yedek + Claude Code buradan çekecek)
3. **Claude Code kur** (geliştirmeye devam için)
4. **Projeyi çalıştır**

Kolay. Gidelim.

---

## Adım 1: Node.js yükle

Node.js, JavaScript projelerini bilgisayarda çalıştırmaya yarayan programdır.
Bir kez kurunca unut gitsin.

### Windows

1. https://nodejs.org adresine git
2. Büyük yeşil **"LTS"** butonuna tıkla (şu an 20.x)
3. İndirilen `.msi` dosyasını çift tıkla, sonraki → sonraki → kur
4. Kurulum bitince **bilgisayarı kapat-aç** (önemli)
5. Kontrol et: Başlat menüsüne `cmd` yaz, Komut İstemi açılsın.
   İçine şunu yaz ve Enter'a bas:
   ```
   node --version
   ```
   Ekrana `v20.x.x` gibi bir şey yazdıysa başarılı.

### macOS

1. https://nodejs.org adresine git, **LTS** versiyonu indir
2. `.pkg` dosyasını çift tıkla, kurulum asistanını izle
3. Terminal'i aç (Spotlight → Terminal)
4. Kontrol et:
   ```
   node --version
   ```
   `v20.x.x` görüyorsan tamam.

---

## Adım 2: Projeyi GitHub'a yükle

GitHub, kod dosyalarını saklayıp paylaşmak için kullanılan platform. Kodun
yedeği hep orada durur, sonradan istediğin cihazdan ulaşırsın.

### 2.1. GitHub hesabı aç

1. https://github.com adresine git
2. **Sign up** → e-posta, parola, kullanıcı adı gir
3. E-posta doğrula

### 2.2. GitHub Desktop yükle (en kolay yol)

Komut satırıyla uğraşmamak için **GitHub Desktop** kullanacağız.

1. https://desktop.github.com adresinden indir, kur
2. Açınca GitHub hesabınla giriş yap

### 2.3. Yeni repo oluştur

1. GitHub'da sağ üst **+** → **New repository**
2. **Repository name:** `medisim-tr` yaz
3. **Private** seç (başkaları göremesin şimdilik)
4. **Create repository** bas

### 2.4. Bu projeyi repoya yükle

İki seçeneğin var:

**Kolay yol — GitHub Desktop ile:**

1. GitHub Desktop aç → **File → Add local repository**
2. Sana gönderdiğim `medisim-tr` klasörünü seç
3. "This directory does not appear to be a Git repository" uyarısı gelirse
   **"create a repository"** linkine tıkla
4. Sağ üstte **"Publish repository"** → hesabına bağla → yayınla

**Claude Code ile (daha da kolay, ama önce Claude Code kurmamız lazım):**

Claude Code kurulduktan sonra projeye girip şunu yazman yeter:
```
GitHub repo'sunu oluştur ve bu projeyi yükle
```

Claude Code geri kalanını halleder. Adım 3'ten sonra gel buraya.

---

## Adım 3: Claude Code kur

Claude Code, Anthropic'in terminal (siyah ekran) üzerinden çalışan
geliştirici asistanı. Asıl geliştirmeyi bununla yapacağız — sen
Türkçe yaz, o kodu yazsın.

### Kurulum

Komut istemi / Terminal'i aç ve şunu yapıştır:

```
npm install -g @anthropic-ai/claude-code
```

Biraz bekle, "added X packages" gibi bir mesaj geldiyse başarılı.

### İlk açılış

1. Terminal'de projenin bulunduğu klasöre git:
   ```
   cd medisim-tr
   ```
   (Klasörün yeri neyse onu yaz. Windows'ta `cd C:\Users\KullanıcıAdı\Desktop\medisim-tr` gibi.)

2. Claude Code'u başlat:
   ```
   claude
   ```

3. İlk açılışta seni Anthropic hesabına yönlendirecek, giriş yap.

Bundan sonra Claude Code'a **Türkçe** yazıp projede ne istersen yaptırabilirsin.
Örneğin:

```
> Pediatrik sepsis senaryosu ekle, 5 adımlı olsun
> EKG görseli nasıl eklenir? Yapar mısın?
> Kullanıcı hesabı sistemi kur
```

---

## Adım 4: Projeyi çalıştır

### İlk seferlik — bağımlılıkları yükle

Terminal'de projenin klasöründeyken:

```
npm install
```

Bu komut projenin ihtiyacı olan kütüphaneleri indirir. 2-5 dakika sürebilir,
bir sürü satır akar — normal.

### Uygulamayı aç

```
npm run dev
```

Terminalde şuna benzer bir çıktı göreceksin:
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
```

Tarayıcın otomatik açılır. Açılmazsa kendin `http://localhost:5173`
yaz tarayıcıya.

**MediSim TR karşında!** Ana sayfadan "Senaryoları Gör" → STEMI veya
Anaflaksi senaryosu → Eğitim modu → oyna.

### Durdurmak için

Terminal'de **Ctrl + C** (Mac'te Cmd değil, Ctrl).

---

## Sık karşılaşılan sorunlar

### "node not recognized" / "command not found: node"

Node.js düzgün kurulmamış ya da bilgisayarı yeniden başlatmadın.
Kur, yeniden başlat, tekrar dene.

### `npm install` hata verdi

Kablolu internet dene, VPN açıksa kapat. Bazen geçici bir ağ sorunu.
Komutu tekrar dene. Olmazsa:
```
npm cache clean --force
npm install
```

### Tarayıcıda boş beyaz sayfa

Terminalde kırmızı hata var mı? Ctrl+C ile durdur, tekrar
`npm run dev` yap.

### `claude` komutu çalışmıyor

```
npm install -g @anthropic-ai/claude-code
```
komutunu **yönetici olarak** çalıştır. Windows'ta Komut İstemi'ni sağ tıkla →
"Yönetici olarak çalıştır". Mac'te `sudo npm install -g @anthropic-ai/claude-code`.

---

## Sıradaki adım

Proje çalışıyor, Claude Code kurulu. Ne yapacaksın?

1. **[docs/YOL-HARITASI.md](./docs/YOL-HARITASI.md)** dosyasını oku — ileride
   neler yapılacak, hangi sırayla
2. **[docs/SENARYO-YAZIM-REHBERI.md](./docs/SENARYO-YAZIM-REHBERI.md)** — kendi
   senaryonu yazmaya başla
3. Claude Code'a "3. senaryo ekle" de — birlikte genişletin

İyi çalışmalar!
