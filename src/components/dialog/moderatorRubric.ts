// ============================================================
// Moderatör Değerlendirme Rubriği — AgentClinic çok-ajanlı port
// ============================================================
// AgentClinic (MIT, Schmidgall et al. 2024 — github.com/SamuelSchmidgall/AgentClinic)
// "ModeratorAgent" desenini porter: görüşme/oturum bitince öğrencinin
// performansını yapılandırılmış boyutlarla değerlendiren ajan. Desen ilham —
// KOD KOPYALANMADI, TR'ye özgün yazıldı.
//
// MVME (Mini-CEX / OSCE tarzı çok-boyutlu değerlendirme) iskeleti:
// anamnez, iletişim (Calgary-Cambridge), klinik muhakeme, yönetim.
// Skill: .claude/skills/calgary-cambridge/SKILL.md
//
// ⚠️ KLİNİK İÇERİK KURALI (CLAUDE.md): Bu dosya SADECE rubrik YAPISI +
// boyut tanımları sağlar (teknik iskelet) — ACTIVE. Somut PUAN EŞİKLERİ ve
// klinik GEÇME KRİTERİ klinik içeriktir → aşağıda `DRAFT — Ali Bey review`
// ile işaretlendi ve ACTIVE değer olarak atanmadı. Canlı puanlama bu DRAFT
// eşikleri kullanmaz; gerçek puan motoru src/engine/grading.ts'tir.
// ============================================================

// ------------------------------------------------------------
// Rubrik boyutları (ACTIVE — teknik tanım, klinik eşik değil)
// ------------------------------------------------------------

/** Değerlendirme boyutu kimlikleri (MVME/OSCE). */
export type RubricDimensionId =
  | "anamnez"            // Öykü alma kapsam ve sistematiği
  | "iletisim"           // Calgary-Cambridge görüşme becerileri
  | "klinik_muhakeme"    // Ayırıcı tanı, veri yorumu, öncelik
  | "yonetim";           // Tedavi/yönetim planı, güvenlik, takip

/** Tek bir değerlendirme boyutunun yapısal tanımı. */
export interface RubricDimension {
  id: RubricDimensionId;
  /** Gösterim adı (TR). */
  label: string;
  /** Bu boyutta nelerin değerlendirildiği — değerlendiriciye yönerge. */
  description: string;
  /** Calgary-Cambridge / OSCE'de bu boyutu oluşturan alt gözlem maddeleri. */
  criteria: string[];
  /**
   * Toplam içindeki göreli ağırlık (0-1). Boyutlar arası DENGE içindir,
   * klinik geçme eşiği DEĞİLDİR (eşikler DRAFT, aşağıda).
   */
  weight: number;
}

/**
 * MVME tarzı dört boyutlu rubrik. Boyut TANIMLARI tekniktir (görüşme
 * becerisi taksonomisi) — somut klinik geçme eşiği içermez.
 */
export const MODERATOR_RUBRIC_DIMENSIONS: readonly RubricDimension[] = [
  {
    id: "anamnez",
    label: "Anamnez (Öykü Alma)",
    description:
      "Öğrencinin öyküyü ne kadar sistematik ve eksiksiz aldığı. SAMPLE/OPQRST yapısı, kırmızı bayrak taraması, ilaç/alerji/özgeçmiş kapsamı.",
    criteria: [
      "Ana şikayeti açık biçimde belirledi mi (OPQRST)",
      "İlgili sistem sorgusu / kırmızı bayrak taraması yaptı mı",
      "İlaç, alerji, özgeçmiş, soygeçmiş (SAMPLE) sorguladı mı",
      "Sosyal/işlevsel öyküyü gerektiğinde aldı mı",
    ],
    weight: 0.3,
  },
  {
    id: "iletisim",
    label: "İletişim (Calgary-Cambridge)",
    description:
      "Hekim-hasta görüşme becerileri: ilişki kurma, açık uçlu soru, aktif dinleme, empati, anlaşılır dil, bilgiyi paylaşma (SPIKES'a uygun).",
    criteria: [
      "Uygun selamlama ve görüşmeyi yapılandırma",
      "Açık uçlu soruyla başlayıp odaklandı mı",
      "Empati ve hastanın endişesini tanıma",
      "Jargonsuz, anlaşılır dil; hastanın anladığını teyit",
    ],
    weight: 0.25,
  },
  {
    id: "klinik_muhakeme",
    label: "Klinik Muhakeme",
    description:
      "Toplanan veriyle ayırıcı tanı oluşturma, objektif bulgu/tetkik yorumu, öncelik ve aciliyet sıralaması.",
    criteria: [
      "Mantıklı bir ayırıcı tanı listesi oluşturdu mu",
      "Vital/tetkik bulgularını doğru yorumladı mı",
      "Aciliyeti ve önceliği doğru sıraladı mı",
      "Yetersiz veriyi fark edip ek bilgi istedi mi",
    ],
    weight: 0.25,
  },
  {
    id: "yonetim",
    label: "Yönetim Planı",
    description:
      "Tanıya/duruma uygun tedavi ve yönetim, hasta güvenliği (doz/kontrendikasyon), izlem ve sevk/konsültasyon kararı.",
    criteria: [
      "Duruma uygun ilk yönetim / stabilizasyon adımları",
      "İlaç güvenliği (doz, alerji, kontrendikasyon) gözetildi mi",
      "İzlem ve yeniden değerlendirme planı",
      "Gerekli konsültasyon / sevk kararı",
    ],
    weight: 0.2,
  },
] as const;

// ------------------------------------------------------------
// ⚠️ DRAFT — Ali Bey review (somut puan eşikleri / geçme kriteri)
// ------------------------------------------------------------
// Aşağıdaki sayısal eşikler KLİNİK İÇERİKTİR (bir öğrencinin "yeterli"
// sayılması için gereken puan). Klinik review olmadan ACTIVE EDİLEMEZ.
// Burada SADECE iskelet/placeholder olarak duruyor; canlı puanlama bunları
// KULLANMAZ (gerçek puanlama src/engine/grading.ts ScoringConfig ile yapılır).
//
// DOLDURULMADI bilerek — boyut bazlı geçme eşiği klinik panel kararıdır.
export interface RubricScoringDraft {
  /** DRAFT: boyut bazlı 0-100 geçme eşiği. ACTIVE değil. */
  passingThresholdByDimension?: Partial<Record<RubricDimensionId, number>>;
  /** DRAFT: toplam geçme yüzdesi. ACTIVE değil. */
  overallPassingPercent?: number;
  /** DRAFT: "kritik hata" otomatik başarısızlık tetikleri (metinsel). */
  criticalFailTriggers?: string[];
}

/**
 * DRAFT — Ali Bey review. Hiçbir alanı ACTIVE değer içermez (boş bırakıldı).
 * Klinik panel, boyut eşiklerini ve kritik-hata tetiklerini doldurana dek
 * canlı akış bu objeyi yalnızca "şema mevcut" kanıtı olarak taşır.
 */
export const MODERATOR_SCORING_DRAFT: RubricScoringDraft = {
  // passingThresholdByDimension: { ... }  // DRAFT — klinik review dolduracak
  // overallPassingPercent: undefined,     // DRAFT — klinik review dolduracak
  // criticalFailTriggers: [ ... ]         // DRAFT — klinik review dolduracak
};

// ------------------------------------------------------------
// Moderatör sistem promptu (ACTIVE — teknik iskelet)
// ------------------------------------------------------------

/**
 * Boyut tanımlarından moderatör (debrief değerlendirici) sistem promptu
 * üretir. AgentClinic ModeratorAgent deseni: oturum dökümünü okuyup
 * yapılandırılmış geri bildirim üretir.
 *
 * NOT: Prompt, modele "yapılandırılmış boyutlarda gözlem yaz" der; somut
 * GEÇME EŞİĞİ vermez (o DRAFT). Böylece teknik iskelet ACTIVE kalır,
 * klinik karar (geçti/kaldı eşiği) klinik review'e bırakılır.
 */
export function buildModeratorRubric(): string {
  const dimensionBlocks = MODERATOR_RUBRIC_DIMENSIONS.map((dim) => {
    const items = dim.criteria.map((c) => `   • ${c}`).join("\n");
    return `## ${dim.label} (ağırlık ${dim.weight})
${dim.description}
${items}`;
  }).join("\n\n");

  return `### Rolün: Eğitim Değerlendirme Moderatörü
Sen ne hasta ne de ölçüm birimisin. Tamamlanan klinik görüşme/oturumun
dökümünü okuyup öğrenciye (hekim adayı) yapılandırılmış, yapıcı geri
bildirim veren bir eğitim değerlendiricisisin. OSCE/Mini-CEX tarzı çok
boyutlu değerlendirme yaparsın.

### Değerlendirme boyutları:
${dimensionBlocks}

### Çıktı kuralları:
- Her boyut için: kısa gözlem + somut iyileştirme önerisi yaz.
- Yalnızca dökümde GÖZLEMLENEN davranışa dayan; öğrencinin yapmadığı bir şeyi
  varsayma, kanıtsız puan verme.
- Yapıcı ve eğitici ton kullan (sıralama/yargılama değil, gelişim odaklı).
- Kesin "geçti/kaldı" hükmü VERME — sayısal geçme eşiği bu sistemde klinik
  review bekleyen DRAFT'tır. Bunun yerine her boyutta güçlü/geliştirilecek
  yönleri belirt.
- Disclaimer: Bu değerlendirme EĞİTİM AMAÇLIDIR, klinik yeterlilik belgesi
  değildir.`;
}
