# SINIF YÖNETİMİ + İLERLEME TAKİBİ — ALTYAPI HARİTASI

> Keşif raporu, 21 Haziran 2026. Kod-temelli, varsayım yok.
> **ÖNEMLİ:** Tier-2 inc-3 (sınıf/öğrenci/attempt + eğitmen paneli) bu seans
> **implemente edildi + lokal CANLI doğrulandı** (branch `feat/backend-cf-worker`, PUSH YOK).
> İlgili commit'ler: `8368886` inc-3 çekirdek, `f127bdb` CORS dev-port, `a8337c3` öğrenci
> ilerleme sayfası, `6691c01` handle case-insensitive fix.
>
> **21 Haz CANLI DURUM:** backend `wrangler dev --local` @8787 + local D1 (migration 0001+0002
> uygulı) + frontend @5175 (gerçek auth) AYAKTA. Uçtan uca akış gerçek backend'e karşı
> **12/12 PASS**. Hazır test hesabı: kurum `test-kurum` / kullanıcı `demo` / şifre `demo1234`
> (rıza verilmiş). Tarayıcı rehberi: `TEST-REHBERI.md`. Bulgular: `BULGULAR.md`.

---

## 1. BACKEND ROL SİSTEMİ — ✅ İMPLEMENTE

- **Roller:** `users.role TEXT CHECK (role IN ('admin','instructor','student'))`
  — `backend/migrations/0001_init.sql:21`. Üç rol şema seviyesinde tanımlı.
- **Rol JWT'de taşınıyor:** `JwtPayload.role` (`backend/src/auth/jwt.ts:12`),
  imza/doğrulama `signJwt`/`verifyJwt`. Cookie `medisim_session` (httpOnly).
- **Login/me rol dönüyor:** `toUserPublic()` `role` alanını içerir
  (`backend/src/types.ts:60-69`). `GET /api/auth/me` → `{ user: { role, ... } }`.
- **Rol-bazlı yetkilendirme:** `authorize(request, env, roles[])`
  (`backend/src/middleware/require-auth.ts`) — oturum + rol + **KVKK rıza** kapısı.
  Yetkisiz rol → 403 forbidden; rıza yoksa → 403 consent_required.
  - Sınıf uçları: `["instructor","admin"]`.
  - Attempt uçları: `["student","instructor","admin"]`.
  - admin kurum (institution) sınırına bağlı (global süper-admin YOK).

## 2. ÖĞRENCİ HESABI — ✅ İMPLEMENTE

- **Öğrenci girişi (kurum slug + handle + şifre, e-postasız):** `handleLogin`
  `body.institution + body.handle` → `findUserByHandle` (slug→institution JOIN).
  Slug **ve handle** login'de lowercase normalize edilir → büyük/küçük harf duyarsız
  (`6691c01`; handle oluşturmada da lowercase saklanır). Alt çizgi/Türkçe karakter
  birebir. (`backend/src/handlers/auth.ts`, `backend/src/db/users.ts:17-31`).
  KVKK: öğrenci `email = NULL`.
- **Öğrenci oluşturma (eğitmen yaratır):** `POST /api/classes/:id/students`
  → `handleCreateStudent` (`backend/src/handlers/classes.ts`). handle+şifre,
  role=student, eğitmenin kurumuna bağlanır, sınıfa kaydedilir (enroll).
  Çakışan handle → 409. Şifre ≥6.

## 3. SINIF / GRUP YAPISI — ✅ İMPLEMENTE (1 yarım: self-join)

- **Sınıf tablosu:** `classes (id, institution_id, instructor_id, name, join_code UNIQUE, created_at)`
  — `0001_init.sql:33-40`.
- **join_code sistemi:** üretim `uniqueJoinCode` (kafa-karıştırmayan alfabe,
  çakışma retry) — `handlers/classes.ts`. Lookup `findClassByJoinCode` db'de **VAR**.
  ⚠️ **YARIM:** öğrenci join_code ile KENDİ kendine katılma ENDPOINT'i YOK (db hazır, route yok).
- **Öğrenci-sınıf ilişkisi (M:N):** `enrollments (class_id, user_id, PK(class_id,user_id))`
  — `0001_init.sql:42-47`. Bir öğrenci çok sınıfa kayıtlanabilir (model destekliyor).
- **Eğitmen-sınıf ilişkisi:** `classes.instructor_id → users(id)`. Sahiplik
  `ownedClassOr404` ile her uçta doğrulanır.

## 4. ATTEMPT / SEANS KAYDI — ✅ İMPLEMENTE (detay seviyesi: özet)

- **Endpoint'ler GERÇEKTEN VAR + test edildi + CANLI doğrulandı:** `POST/GET /api/attempts`
  (`backend/src/handlers/attempts.ts`, `index.ts:95-99`). 42 backend vitest + gerçek
  backend'e karşı uçtan uca akışta PASS.
- **Şema:** `attempts (id, user_id, scenario_id, score REAL, max_score REAL,
  started_at, finished_at, summary_json TEXT)` + `class_id` (migration 0002).
- **Bir seans bitince ne kaydediliyor** (`DebriefScreen.tsx:246-260`, best-effort,
  auth'luysa): `scenario_id, score, max_score, started_at, finished_at` +
  `summary_json{ grade, mode, difficulty, percent, critical_errors,
  completion_status, duration_seconds }`. user_id JWT'den. score sunucuda sınırlanır.
- **İlerleme takibine yeter mi?** ✅ "Öğrenci X, senaryo Y, Z puan/%, tarih, tamamlandı mı"
  için YETERLİ.
  ⚠️ **YARIM:** aksiyon-bazlı/karar-bazlı detay (hangi adımı seçti) sunucuda YOK —
  o detay sadece tarayıcı `localStorage` (`SavedSession.session_snapshot.results`)
  içinde, server'a senkron edilmiyor. Aksiyon-seviyesi eğitmen incelemesi şu an mümkün değil.
- **Sınıf atfı:** deneme öğrencinin TEK sınıfına otomatik bağlanır (class_id);
  eğitmen yalnız KENDİ sınıfının denemelerini görür (çok-eğitmenli sızıntı kapalı).

## 5. EĞİTMEN PANELİ (frontend) — ✅ İMPLEMENTE

- **/egitmen → InstructorPage** (`src/pages/InstructorPage.tsx`), `ProtectedRoute
  requireRole={["instructor","admin"]}` ile korunur, Header'da rol-gated nav linki.
  - Sınıf listesi + öğrenci sayısı, yeni sınıf oluştur.
  - Sınıf detayı: roster (pseudonim handle) + **ilerleme tablosu**
    (deneme sayısı / en iyi % / son deneme) — `aggregateProgress`.
  - Öğrenci ekle + giriş bilgisi tek-sefer göster (kurum kodu + handle + şifre).
- **/gecmis (SessionHistoryPage):** ⚠️ **localStorage ONLY** — `listSessions()`
  (`src/pages/SessionHistoryPage.tsx:221,251`), backend çağrısı YOK. Yalnız o
  CİHAZDAKİ kendi seansları. Eğitmen başkasının seansını burada GÖREMEZ; sunucuya
  senkron değil. (Server ilerleme = `/egitmen` paneli.)
- **Öğrenci kendi ilerleme sayfası:** ✅ **EKLENDİ** (`a8337c3`) — `/ilerleme`
  (`src/pages/StudentProgressPage.tsx`). `GET /api/attempts` → senaryo başlığı + % + not +
  tarih, toplam/ortalama/en iyi istatistik. `summarizeAttempts` saf helper (test'li),
  Header'da öğrenci-gated "İlerlemem" linki. `/gecmis`'ten farkı: bu **sunucu-otoritatif**
  (cihazdan bağımsız), `/gecmis` localStorage.

## 6. D1 ŞEMA DURUMU

| Migration | Oluşturduğu |
|---|---|
| `0001_init.sql` | `institutions`, `users`, `classes`, `enrollments`, `attempts` (+ indexler) |
| `0002_attempt_class_scope.sql` | `attempts.class_id` kolonu + index (çok-eğitmenli sızıntı fix) |

**Tüm temel tablolar VAR.** Sınıf yönetimi + ilerleme için ek tablo gerekmez.
(Olası gelecek: `assignments`/`assignment_attempts` ödev bağlamı için — şu an yok.)

✅ **Backend LOKAL ÇALIŞIYOR (21 Haz):** `wrangler dev --local` @8787 + miniflare local D1.
`.dev.vars` mevcut (JWT_SECRET + SIGNUP_INVITE_CODE=`medisim-dev`), migration 0001+0002
uygulı, `VITE_BACKEND_URL=http://localhost:8787`. CORS lokal-port wildcard (`f127bdb`) →
Vite hangi portta açılırsa açılsın tarayıcı bağlanır.
⚠️ **UZAK deploy hâlâ bootstrap bekliyor:** `wrangler.toml` `database_id`/KV id PLACEHOLDER.
Cloudflare'a deploy için: `wrangler d1 create` → gerçek database_id → `secret put` → `deploy`.
(Lokal test için gerekmez.)

---

## 7. BOŞLUK TABLOSU

| Parça | Durum | Sınıf yönetimi + ilerleme için ne eksik |
|---|---|---|
| Rol sistemi (admin/instructor/student) | ✅ implemente | — (şema CHECK + JWT + /me) |
| Rol-bazlı authz + KVKK consent kapısı | ✅ implemente | — (`authorize(roles)`) |
| Öğrenci girişi (slug+handle, e-postasız) | ✅ implemente | — case-insensitive (`6691c01`); alt çizgi/Türkçe karakter birebir |
| Öğrenci oluşturma (eğitmen) | ✅ implemente | — (`POST /api/classes/:id/students`) |
| Sınıf tablosu + CRUD | ✅ implemente | — (`classes`, POST/GET /api/classes) |
| join_code üretimi | ✅ implemente | — (`uniqueJoinCode`) |
| **join_code ile öğrenci self-join** | 🟡 yarım | db hazır (`findClassByJoinCode`), **ROUTE + UI yok** |
| Öğrenci-sınıf (M:N) | ✅ implemente | — (`enrollments`) |
| Eğitmen-sınıf | ✅ implemente | — (`classes.instructor_id` + sahiplik) |
| POST/GET /api/attempts | ✅ implemente + canlı | — (42 backend vitest + uçtan uca PASS) |
| **Attempt detay seviyesi** | 🟡 yarım | özet var; **aksiyon/karar log'u server'da yok** (localStorage'da) |
| Eğitmen paneli (sınıf+roster+ilerleme) | ✅ implemente | — (`/egitmen` InstructorPage) |
| İlerleme görünümü (deneme/%/tarih) | ✅ implemente | — (`aggregateProgress`) |
| **/gecmis server-sync** | ❌ yok | localStorage-only; cihaza özel, eğitmen göremez (kasıtlı — server geçmiş = İlerlemem) |
| **Öğrenci kendi-ilerleme UI** | ✅ **EKLENDİ** (`a8337c3`) | `/ilerleme` StudentProgressPage (sunucu-otoritatif) |
| **Backend lokal çalışır durumda** | ✅ **ÇÖZÜLDÜ** | wrangler dev --local + local D1 + migration'lar; 12/12 PASS |
| **Uzak (Cloudflare) deploy** | ❌ yok | `wrangler.toml` placeholder id; `d1 create`→gerçek id→`deploy` gerek |
| **join_code ile öğrenci self-join** | 🟡 yarım | db hazır, ROUTE+UI yok (+ çok-sınıflı atıf belirsizliği → assignment bağlamı gerek) |
| **Geçici şifre / must_change_password** | ❌ yok | #7 — sunucu-üretimli şifre + ilk-giriş değiştir (Ali Bey kararı) |
| **Ödev/assignment bağlamı** | ❌ yok | attempt→ödev ilişkisi yok (gelecek tablo) |

### Özet yorum
Tier-2 inc-3 ÇEKİRDEĞİ kurulu, **lokal canlı çalışıyor ve uçtan uca doğrulandı** (12/12).
Eklenenler: öğrenci ilerleme sayfası (`/ilerleme`), handle case-insensitive giriş, CORS dev-port.
**Kalan gerçek iş:** (a) öğrenci self-join akışı (+ assignment bağlamı, çok-sınıflı atıf için),
(b) attempt aksiyon-detayını server'a taşımak (derin eğitmen incelemesi), (c) #7 geçici şifre
politikası, (d) uzak Cloudflare deploy (kalıcı erişim). Çekirdek şema değişikliği gerekmez.
