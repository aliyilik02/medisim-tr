# Genel Değerlendirme + Rakip/Teknoloji Araştırması — 6 Temmuz 2026

> Ali Bey isteği: "hekim + yazılımcı + oyun geliştirici olarak değerlendir; rakiplere bak;
> motor/görsel/UI-web ne gelişebilir." İki paralel derin web araştırması (rakip analizi +
> teknoloji trendleri) + kod tabanı içi üç-şapkalı denetim sentezi.
> Yol haritası önceliklerine girecek maddeler sonda işaretli.

---

## 1. KRİTİK DIŞ GELİŞMELER (hemen bilinmeli)

1. **Ready Player Me KAPANDI (31 Ocak 2026, Netflix satın alması).** `rpm-avatar` skill'i
   ve Sprint D.2 planı ölü referans — MPFB2/CC0 hattı artık tek stratejik yol (bağımlılık
   riski kanıtlandı). Aksiyon: rpm-avatar skill'i arşivle/güncelle.
2. **Pulse Engine'in tarayıcı yolu YOK** — resmi tek yol Unity WebGL; saf JS/WASM binding
   kimse yapmamış. Node sidecar planımız (pulse-engine-binding) doğru; tarayıcı-içi WASM bekleme.
3. **Body Interact'ın AI diyalog dillerinde Türkçe YOK** — TR pazarı penceresi açık ama
   kalıcı değil. Yerli tarayıcı-tabanlı 3D+fizyoloji+LLM rakip **tespit edilemedi**
   (SimuleHasta Moodle-tabanlı; Dijital Hastane doğrulanamadı).
4. **İsim çakışması riski:** aramada `medisim.pages.dev` "SimuleHasta" başlığıyla listelendi —
   Ali Bey marka/alan adı kontrolü yapmalı.

## 2. REKABET KONUMU (özet — tam matris ajan raporunda)

**Savunulabilir farklarımız:** Türkçe+TR kılavuz disiplini (tam boş alan; Body Interact dahil
kimsede yok) · açıklanabilir/test-edilebilir deterministik motor (1220 vitest) · KVKK-yerli
mimari (tarayıcı-içi STT, pseudonim öğrenci) · sıfır donanım maliyeti · cezasız klinik
muhakeme katmanı.

**Somut eksiklerimiz (önem sırası):**
| # | Eksik | Rakip referansı |
|---|---|---|
| E1 | Vaka hacmi: 16 vs 250-1500 | Body Interact 1500+; ilk kurumsal soru bu |
| E2 | Ventilasyon+kan gazı (ABG) fizyolojisi | Body Interact'ın ana teknik farkı |
| E3 | Eğitmene açık vaka-yazma aracı | OMS Create, Full Code Creator, SimX marketplace |
| E4 | Kılavuz-karşılaştırmalı debrief raporu | Body Interact'ın en övülen özelliği |
| E5 | Yarışma/turnuva modu | BI Student Challenge — öğrenci topluluğu büyüme motoru |
| E6 | LMS/SSO/LTI entegrasyonu | OMS: SSO+LMS+ISO27001 kurumsal eşik |
| E7 | Sesli diyalog oyun döngüsünde | OMS/BI sesli; bizde altyapı hazır ama bağlı değil |
| E8 | CME/STE kredilendirme | Full Code'un bireysel abonelik meşrulaştırıcısı |

## 3. ÜÇ ŞAPKALI İÇ DEĞERLENDİRME (kod tabanı, 6 Tem gecesi durumu)

### 🩺 Hekim
- **Güçlü:** kılavuz-atıf disiplini, DRAFT→ACTIVE yönetişimi (bu gece ilk ACTIVE: STEMI),
  farmakoloji kontrendikasyon motoru, yaş-spesifik vital kapısı testte.
- **Eksik:** ① senaryo çeşitliliği dar (kardiyoloji ağır; nöroloji/psikiyatri/toksikoloji
  1'er) ② fizik muayene derinliği sınırlı (inspeksiyon/oskültasyon var; palpasyon-perküsyon
  bulgu motoru yok) ③ at