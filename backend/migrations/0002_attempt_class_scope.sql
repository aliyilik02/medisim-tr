-- ============================================================
-- MediSim TR — D1 şema 0002 (attempt → sınıf kapsamı)
-- ============================================================
-- KVKK / çok-eğitmenli sızıntı düzeltmesi: bir deneme artık üretildiği
-- sınıfa bağlanır (class_id). Eğitmen paneli yalnızca KENDİ sınıfında
-- üretilen denemeleri gösterir — öğrenci birden çok sınıfa kayıtlı olsa
-- bile bir eğitmen diğer sınıfın performans verisini göremez.
--
-- class_id NULLABLE: serbest oyun (sınıf bağlamı olmayan deneme) veya
-- eğitmen kendi test seansı → hiçbir sınıf panelinde görünmez (doğru).
-- Tek sınıfa kayıtlı öğrencide POST /api/attempts otomatik atfeder.
-- Uygula:  cd backend && npx wrangler d1 migrations apply DB [--local]
-- ============================================================

ALTER TABLE attempts ADD COLUMN class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_attempts_class ON attempts(class_id);
