// ============================================================
// KVKK Aydınlatma + Açık Rıza metni — TASLAK
// ============================================================
// HUKUKÇU ONAYI BEKLİYOR — bu metin PLACEHOLDER taslaktır. Üretime
// geçmeden önce VKED (Veri Koruma) + avukat onaylı nihai metinle
// değiştirilecek. Ayrı dosyada tutulur ki hukuk ekibi kolayca güncellesin.
//
// Bağlam: KVKK 6698 + 24 Kasım 2025 Üretken Yapay Zekâ Rehberi.
// Kullanıcı = eğitmen/hoca (öğrenci yönetimi inc-3). PII minimal:
// e-posta (yalnız eğitmen) + pseudonim handle. TC/ad TOPLANMAZ.
// ============================================================

export interface ConsentSection {
  id: string;
  title: string;
  body: string;
  /** required: işleme için zorunlu (rıza geri çekilemez veri sağlama temeli);
   *  explicit: açık rıza (checkbox ile alınır). */
  kind: "required" | "explicit";
}

export const KVKK_VERSION = "taslak-2026-06-15"; // metin sürümü (onayda değişecek)

export const KVKK_INTRO =
  // HUKUKÇU ONAYI BEKLİYOR — taslak
  "MediSim TR (\"Platform\"), tıp eğitimi amaçlı sanal hasta simülasyonu sunar. " +
  "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında " +
  "veri sorumlusu sıfatıyla kişisel verilerinizin işlenmesine ilişkin aydınlatma " +
  "ve açık rıza beyanıdır. Platform yalnızca eğitim amaçlıdır; gerçek hasta " +
  "verisi işlemez, klinik karar destek sistemi değildir.";

export const KVKK_SECTIONS: ConsentSection[] = [
  {
    id: "data_processing",
    kind: "required",
    title: "Zorunlu Veri İşleme",
    // HUKUKÇU ONAYI BEKLİYOR — taslak
    body:
      "Hesabınızı oluşturmak ve oturum güvenliğini sağlamak için e-posta " +
      "adresiniz, kurum bilginiz ve takma adınız (handle) işlenir. Şifreniz " +
      "geri döndürülemez biçimde özetlenerek (hash) saklanır. TC kimlik " +
      "numarası, ad-soyad gibi doğrudan kimlik verileri TOPLANMAZ. Bu veriler " +
      "hizmetin sunulması için zorunludur (KVKK m.5/2-c, sözleşmenin ifası).",
  },
  {
    id: "explicit_consent",
    kind: "explicit",
    title: "Açık Rıza",
    // HUKUKÇU ONAYI BEKLİYOR — taslak
    body:
      "Eğitim ilerlemenizin (tamamladığınız senaryolar, puanlar) hesabınızla " +
      "ilişkilendirilerek saklanmasına ve eğitim kalitesini iyileştirmek için " +
      "anonim/toplulaştırılmış biçimde analiz edilmesine açık rıza veriyorum. " +
      "Rızamı dilediğim zaman hesap ayarlarından geri çekebileceğimi, verilerimin " +
      "silinmesini talep edebileceğimi (KVKK m.7, m.11) biliyorum.",
  },
];

export const KVKK_FOOTER =
  // HUKUKÇU ONAYI BEKLİYOR — taslak
  "Verileriniz yurt içinde Cloudflare altyapısında işlenir. Haklarınız ve " +
  "başvuru yöntemleri için Gizlilik Politikası'na bakınız. Bu taslak metin " +
  "hukuki onay sürecindedir.";
