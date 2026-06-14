-- ============================================================
-- MediSim TR — D1 şema 0001 (Tier-2: auth + kurum + seans)
-- ============================================================
-- KVKK: öğrenci PII MİNİMİZE. Gerçek ad/TC YOK — pseudonim `handle`.
-- E-posta yalnızca eğitmen/admin (kurtarma); öğrenci e-postasız olabilir.
-- `consent_at` = KVKK açık rıza zaman damgası (null = rıza yok → erişim kısıtlı).
-- Tüm zaman damgaları UNIX saniye (INTEGER).
-- Uygula:  cd backend && npx wrangler d1 migrations apply DB [--local]
-- ============================================================

CREATE TABLE IF NOT EXISTS institutions (
  id          TEXT PRIMARY KEY,             -- uuid
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,         -- giriş bağlamı (kurum kodu)
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,          -- uuid (pseudonim ana anahtar)
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('admin','instructor','student')),
  handle         TEXT NOT NULL,             -- pseudonim görünen ad (TC/gerçek ad DEĞİL)
  email          TEXT,                      -- NULLABLE — sadece eğitmen/admin
  password_hash  TEXT NOT NULL,             -- pbkdf2$iter$salt$hash
  consent_at     INTEGER,                   -- KVKK açık rıza ts (null=rıza yok)
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at     INTEGER NOT NULL,
  -- handle kurum içinde benzersiz; email global benzersiz (varsa)
  UNIQUE (institution_id, handle)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS classes (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  instructor_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  join_code      TEXT NOT NULL UNIQUE,      -- öğrenci katılım kodu
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (class_id, user_id)
);

-- Seans denemeleri (Tier-2 inc-2'de yazılır; şema şimdiden hazır).
-- KVKK: kişisel veri = user_id ile bağlı performans. summary_json sentetik
-- senaryo verisi (hasta gerçek değil) → düşük hassasiyet.
CREATE TABLE IF NOT EXISTS attempts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id  TEXT NOT NULL,
  score        REAL,
  max_score    REAL,
  started_at   INTEGER NOT NULL,
  finished_at  INTEGER,
  summary_json TEXT                          -- debrief/skor özeti (JSON)
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_scenario ON attempts(scenario_id);
