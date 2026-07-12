# Tasarım Token'ları — Neon UI Seti

> Pilot: oyun ekranı (`/hasta/:id`), 12 Tem 2026. Ali Bey kararı: genç öğrenci
> kitlesi için görsel zenginlik — koyu tema + neon aksan + glow + parlayan
> kategori ikonları. Pilot tutarsa diğer ekranlara çoğaltılır.
> Kaynak dosyalar: `tailwind.config.js` (token) + `src/index.css` (`neon-*`
> class'ları) + `src/components/ui/GlowIcon.tsx` + `category-icons.ts`.

## Palet

| Token | Hex | Kullanım |
|-------|-----|----------|
| `neon-teal` | `#2dd4bf` | Marka neon çekirdeği (brand-light ile aynı) — genel vurgu, sekmeler, çerçeveler |
| `neon-cyan` | `#22d3ee` | **Ekipman** kategorisi |
| `neon-pink` | `#f472b6` | **İlaç** kategorisi |
| `neon-violet` | `#a78bfa` | **Tetkik** kategorisi (lab + görüntüleme) |
| `neon-blue` | `#60a5fa` | Bilgi vurgusu (clinical-info hizalı) |

Kategori mantığı: **3 grup rengi** (sekme kimliği), alt kategori **ikonla**
ayrışır (21 ayrı renk değil — öğrenci "neredeyim"i renkten okur).

## Değişken akışı

`.neon-<ton>` class'ı `--neon` (düz renk) + `--glow` (gölge rgba) set eder;
tüketiciler: `shadow-glow-{xs,sm,md,lg}` (Tailwind boxShadow token'ları),
`.neon-text`, `.neon-border`, `.neon-panel`, `.neon-row`, `.neon-tab-active`,
`.skeleton-shimmer`, `.neon-scene-frame`, `GlowIcon`.

## Animasyonlar

| Ad | Süre | Kanal | Ne için |
|----|------|-------|---------|
| `glow-breathe` | 2.6s | box-shadow | Seçili/aktif öğe nefesi |
| `icon-pop` | 0.35s | transform+opacity | İkon giriş parlaması |
| `shimmer` | 1.8s | background-position | Bekleme iskeleti |
| `stagger-in` | 0.45s | transform+opacity | Liste kademeli girişi (`animationDelay` ile) |
| `scanline` | 7s | transform | Atmosfer (opsiyonel, ölçülü) |

Hepsi ucuz kanallar (transform/opacity/box-shadow) — `filter: blur` YOK
(8Hz tick perf dersi, R4). `prefers-reduced-motion: reduce` dekoratif seti
kapatır (index.css); **klinik alarm flash'ları kapsam dışı** — güvenlik sinyali.

## GÜVENLİK SINIRLARI (estetik değil — değiştirme)

1. **Vital sayıları dokunulmaz:** `VitalMonitorScreen` sayı renk/font/glow'una
   `neon-*` uygulanmaz. Kimlik renkleri `waveform-engine.ts PARAM`'dan gelir,
   kritikte `#ff6b6b`'ye döner (IEC 60601-1-8 yorumu kodda). Text-shadow sayıyı
   bulanıklaştırır → YASAK.
2. **Alarm kutularına dekoratif box-shadow BİNMEZ:** `monitor-flash-high/med`
   keyframe'leri box-shadow'u anime eder; statik glow onları ezer. Monitörün
   glow'u DIŞ sarmalayıcıda (sayfa tarafında) kalır.
3. **Yanıp sönme hızı:** `flash-high` 0.6s ≈ 1.67Hz — 2Hz stroboskopik sınırın
   altında. Yeni hiçbir animasyon 2Hz'i aşamaz.
4. **Klinik renk semantiği mutlak:** kırmızı=kritik, amber=uyarı, yeşil=stabil.
   `neon-critical/warning/stable` yalnız bu anlamlarda; dekor için kullanma.
5. **Mor GRADIENT yasağı sürüyor** (CLAUDE.md): violet yalnız düz aksan.
6. **Global class'lar (.panel/.btn-*/.tag) DEĞİŞMEDİ** — neon seti ayrı
   class'lar; pilot dışı sayfalar etkilenmez. Çoğaltma bilinçli karar ister.

## Çoğaltma rehberi (pilot sonrası)

Yeni ekranı neonlaştırırken: kök konteynere `neon-teal` + alt öğelere
`neon-panel/.neon-row` + kategori ikonlarına `GlowIcon`. Monitör/klinik
gösterge içeren her yüzeyde yukarıdaki 6 sınır aynen geçerli.
