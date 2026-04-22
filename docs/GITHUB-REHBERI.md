# GitHub Rehberi

**Hedef:** Projeyi GitHub'a yükle, yedek al, Claude Code'dan kullan.

Git/GitHub bilmiyorsan bu rehber yeterli. 15-20 dakika.

---

## Neden gerekli?

- **Yedek** — bilgisayar bozulsa bile kod GitHub'da güvende
- **Versiyon kontrolü** — "dün çalışıyordu bugün çalışmıyor" derdini çözer
- **Claude Code entegrasyonu** — `claude` komutu GitHub'a push yapabilir
- **Gelecekte ekip** — başka biri projeye katılırsa GitHub üstünden çalışır

---

## 1. GitHub hesabı

Zaten varsa geç. Yoksa:

1. https://github.com/signup
2. Email, şifre, kullanıcı adı
3. Doğrula, giriş yap

---

## 2. SSH anahtarı (bir kerelik, bir daha şifre sormasın diye)

Biraz teknik, ama **Claude Code sana bunu otomatik yaptırabilir**.
Claude Code açıkken şunu yaz:

```
GitHub için SSH anahtarı kur ve hesabıma bağla, rehberlik et
```

Claude Code seni adım adım yönlendirir.

**Manuel yapmak istersen:**

### Windows / Mac / Linux

Terminal'de:
```bash
ssh-keygen -t ed25519 -C "seninmailin@example.com"
```

Üç kez Enter (varsayılanlar yeterli).

Anahtarını görüntüle:
```bash
# Windows (PowerShell)
cat ~\.ssh\id_ed25519.pub

# Mac / Linux
cat ~/.ssh/id_ed25519.pub
```

Çıkan metni **baştan sona kopyala** (ssh-ed25519 ile başlıyor).

GitHub'a ekle:
1. https://github.com/settings/keys
2. **New SSH key**
3. Title: "Laptop" falan, Key: kopyaladığın metni yapıştır
4. Add SSH key

Test:
```bash
ssh -T git@github.com
```
"Hi [kullanıcıadın]! You've successfully authenticated..." diyorsa tamam.

---

## 3. Projeyi GitHub'a yükle

### Yol A — Claude Code ile (kolay)

Terminalde proje klasörüne gir, `claude` komutunu çalıştır, sonra:

```
Bu projeyi GitHub'a yeni bir private repo olarak yükle.
Repo adı: medisim-tr
```

Gerisini kendi halleder.

### Yol B — Manuel komutlar

Proje klasöründe terminal aç:

```bash
# Git başlat
git init
git add .
git commit -m "İlk commit — MediSim TR v0.1 alpha"
git branch -M main

# GitHub'da yeni repo oluştur (web üzerinden veya gh cli ile)
# Aşağıdaki URL'yi kendi kullanıcı adınla değiştir
git remote add origin git@github.com:SENIN_KULLANICI_ADIN/medisim-tr.git

# Push et
git push -u origin main
```

**Repo'yu önce GitHub'da oluşturman lazım:** https://github.com/new
- Name: `medisim-tr`
- **Private** seç
- README, gitignore, license **boş bırak** (hepsi projede zaten var)
- Create

### Yol C — GitHub Desktop (grafik arayüz, en kolay)

1. https://desktop.github.com indir, kur, giriş yap
2. **File → Add Local Repository** → proje klasörünü seç
3. "Not a git repository" uyarısı → **Create a repository** tıkla
4. Summary: "İlk commit" yaz, **Commit to main**
5. Sağ üst **Publish repository** → private seç → publish

---

## 4. Sonraki değişiklikler

Her iş yaptıktan sonra:

### Claude Code ile:
```
Yaptığım değişiklikleri commit'le ve push et. Mesaj: "DKA senaryosu eklendi"
```

### Manuel:
```bash
git add .
git commit -m "DKA senaryosu eklendi"
git push
```

### GitHub Desktop ile:
1. Sol panelde değişiklikleri gör
2. Summary yaz
3. **Commit to main**
4. Sağ üst **Push origin**

---

## 5. Yedekten geri dönme

"Bozdum, geri alayım":

```bash
# Son committen sonraki tüm değişiklikleri sil
git reset --hard HEAD

# Belirli bir dosyayı geri al
git checkout -- src/data/scenarios/stemi.ts
```

Claude Code da bunu sana yaptırabilir: "stemi.ts'i son committeki haline döndür" de.

---

## Sık sorulan

**S: Private vs Public?**
C: Ticari potansiyeli olan bir girişim, **private** tut. Düzgün iş modelin
netleştiğinde public açık-kaynak versiyon düşünürsün.

**S: .env dosyası veya şifre yükledim yanlışlıkla, ne yaparım?**
C: Hemen Claude Code'a söyle: "GitHub'a yanlışlıkla X yükledim, geçmişten
temizle." Ayrıca o şifreleri **değiştir** — bir kez internete düşen şifre
artık güvensiz.

**S: Başkası projeme bakabilir mi?**
C: Private repo'yu sadece sen ve davet ettiklerin görür. **Settings →
Collaborators**.

**S: GitHub ücretli mi?**
C: Bireysel private repo **ücretsiz**. Takım özellikleri için Pro/Team
planları var ama şimdilik gerek yok.

---

## İpuçları

- **Her akşam push** — gün içinde yaptığın her şey yedekte olsun
- **Anlamlı commit mesajları** — gelecekteki kendine teşekkür edeceksin
- **Büyük değişiklik → branch** — ileride öğrenirsin, şimdilik gerek yok
- **Gitignore**'a dokunma — zaten doğru kurulu
