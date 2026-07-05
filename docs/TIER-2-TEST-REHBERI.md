# TEST REHBERİ — Sınıf Yönetimi + Öğrenci İlerleme (Ali Bey)

> Tier-2 inc-3 sınıf sistemini tarayıcıdan uçtan uca dene. 21 Haziran 2026.
> Backend **gerçekten çalışıyor** (lokal D1 + JWT). Otomatik test: **12/12 PASS**.
> Bu rehber tarayıcıdan elle doğrulaman içindir.

---

## 0. ŞU AN ÇALIŞIYOR (hemen deneyebilirsin)

Bu seansta backend + frontend zaten açık:
- **Frontend:** http://localhost:5175
- **Backend:** http://127.0.0.1:8787 (sağlık: tarayıcıda `http://127.0.0.1:8787/api/health` → `{"status":"ok"}`)

⚠️ Bunlar bu oturumla birlikte kapanır. Bilgisayarı/oturumu kapatınca yeniden başlatman gerekir → **Bölüm 1**.

---

## 1. YENİDEN BAŞLATMA (oturum kapandıysa)

**İki terminal** aç (proje kökü: `medisim-tr-master`).

**Terminal 1 — Backend:**
```bash
cd backend
npx wrangler dev --port 8787 --local
```
"Ready on http://127.0.0.1:8787" görünce hazır. (Migration'lar zaten uygulı; ilk kurulumda
veya şüphede: `npx wrangler d1 migrations apply DB --local`.)

**Terminal 2 — Frontend:**
```bash
npm run dev
```
Açılan portu not et (5173 doluysa 5174/5175 seçer — CORS hepsine izin verir).
`.env.local` içinde `VITE_E2E` KAPALI olmalı (gerçek login için). Şu an kapalı.

---

## 2. EĞİTMEN AKIŞI

1. Tarayıcıda **http://localhost:5175/login** aç.
2. **Eğitmen Girişi** (varsayılan ekran):
   - E-posta: `hoca@medisim.test`
   - Şifre: `medisim123`
   - **Giriş Yap** → senaryolar sayfasına düşer. (Bu hesap rıza vermiş; KVKK ekranı çıkmaz.)
3. Üst menüde **EĞİTMEN** linkine tıkla → `/egitmen` paneli açılır.
   - **Ne görmeli:** "Eğitmen Paneli" başlığı, "Yeni Sınıf" kutusu, "Sınıflarım" listesi.
4. **Sınıf oluştur:** "Yeni Sınıf" → ad gir (örn. `Acil Tıp 2026 A`) → **Oluştur**.
   - **Ne görmeli:** liste altında sınıf + 6 haneli **katılım kodu** (örn. `QYJUNK`), "0 öğrenci".
5. Sınıfa tıkla → detay açılır. **Öğrenci Ekle:**
   - Kullanıcı Adı: `ogrenci1`
   - Geçici Şifre: `parola1` (en az 6 karakter)
   - **Ekle**
   - **Ne görmeli:** yeşil kutu — **giriş bilgileri**:
     - Kurum kodu: **`test-kurum`**
     - Kullanıcı adı: `ogrenci1`
     - Şifre: `parola1`
   - ⚠️ **Bu 3 bilgiyi not et** — öğrenci girişinde lazım. (Şifre sadece bir kez gösterilir.)

---

## 3. ÖĞRENCİ AKIŞI (ayrı pencere / gizli sekme)

> Eğitmen oturumunu bozmamak için **gizli/incognito pencere** kullan (ya da başka tarayıcı).

1. Gizli pencerede **http://localhost:5175/login** aç.
2. **"Öğrenci misiniz? Öğrenci girişi →"** linkine tıkla.
3. Öğrenci girişi:
   - Kurum Kodu: `test-kurum`
   - Kullanıcı Adı: `ogrenci1`
   - Şifre: `parola1`
   - **Giriş Yap**
4. **İlk girişte KVKK rıza ekranı** çıkar → açık rıza kutusunu işaretle → kabul et.
   - **Ne görmeli:** senaryolar sayfası. (Üstte **EĞİTMEN** linki YOK — öğrenci göremez.)
5. Bir senaryo seç → oyna → **seansı bitir** (debrief/sonuç ekranına ulaş).
   - **Ne görmeli:** debrief ekranı + sol-üstte "kaydedildi" bildirimi.
   - Arka planda seans backend'e kaydedilir (DebriefScreen otomatik `POST /api/attempts`).

---

## 4. İLERLEMEYİ DOĞRULA (eğitmen penceresine dön)

1. Eğitmen penceresinde `/egitmen` → aynı sınıfa tıkla (veya sayfayı yenile).
2. **Öğrenciler** tablosunda `ogrenci1` satırı:
   - **Deneme:** 1 (veya kaç kez oynadıysa)
   - **En İyi %:** seansın yüzdesi
   - **Son Deneme:** bugünün tarihi
   - **Ne görmeli:** öğrencinin oynadığı seans burada görünür. ✅ Akış tam.

---

## 5. SORUN OLURSA — NE KONTROL ET

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Login "Sunucu hatası / bağlanamadı" | Backend kapalı | Terminal 1'de `wrangler dev` çalışıyor mu, 8787 ayakta mı |
| Login açılır ama hep "mock" gibi, login sormuyor | `.env.local`'da `VITE_E2E=1` açık | Satırı `#` ile kapat + frontend'i yeniden başlat |
| "consent_required" / panel boş | KVKK rıza verilmedi | İlk girişte çıkan rıza ekranını kabul et |
| Öğrenci girişi 401 | Kurum kodu/kullanıcı adı yanlış | Eğitmenin verdiği `test-kurum` + handle + şifre birebir (kurum kodu küçük harf) |
| Öğrenci seansı panelde görünmüyor | Öğrenci tek sınıfta değil / debrief'e ulaşılmadı | Öğrenci yalnız 1 sınıfta olmalı; seansı sonuna kadar bitir |
| Tarayıcı CORS hatası | Frontend portu allowlist dışı | Artık tüm `localhost:*` portlarına izinli; backend'i yeniden başlat |

---

## 6. HAZIR TEST VERİSİ (istersen sıfırdan kurmadan)

Otomatik test zaten bir öğrenci + deneme oluşturdu:
- Kurum kodu: `okul-084846` · öğrenci: `ogr084846` · şifre: `parola1` (1 STEMI denemesi var)
- O öğrencinin eğitmeni: `hoca084846@test.edu` / `instructor-pass`

Temiz test için Bölüm 2'den kendi sınıfını/öğrencini oluşturman önerilir.
