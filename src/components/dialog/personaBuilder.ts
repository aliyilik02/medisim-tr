// ============================================================
// Patient Persona Builder — Sprint B.2 + AgentClinic çok-ajanlı port
// ============================================================
// Senaryo data'sından Gemini 2.5 Flash için sistem prompt sentezler.
// Calgary-Cambridge process backbone'una uygun "hasta rol" prompt.
// Backend chat.ts SAFETY_PREFIX'i de ekler — bu fonksiyon sadece
// hastanın özel bilgilerini formatlar.
//
// Referans: docs/MASTER-REPORT-v3.md Bölüm 5 (AI hasta diyaloğu).
// Skill: .claude/skills/calgary-cambridge/SKILL.md
//
// ── AgentClinic atıfı (mimari ilham) ────────────────────────
// AgentClinic (MIT, Schmidgall et al. 2024 — github.com/SamuelSchmidgall/AgentClinic)
// çok-ajanlı OSCE deseni: ayrı Hasta / Ölçüm / Moderatör ajanları, her biri
// kendi sistem promptuyla. Bu dosya HASTA ajanını porter — desen ilham,
// KOD KOPYALANMADI, TR'ye özgün yazıldı. Ölçüm ajanı measurementPrompt.ts,
// moderatör rubriği moderatorRubric.ts.
//
// AgentClinic "bias" parametresine karşılık gelen davranış katmanı buraya
// PatientBehaviorProfile olarak eklendi — ama bu yalnızca İLETİŞİM/DUYGU
// tonunu değiştirir. Hiçbir TIBBİ GERÇEK üretmez (klinik içerik üretimi
// senaryo data'sından gelir, asla bu profilden değil).
// ============================================================

import type { Scenario } from "@/engine";

const SEX_TR: Record<string, string> = {
  M: "Erkek",
  F: "Kadın",
};

// ------------------------------------------------------------
// Davranış / iletişim profili (AgentClinic "bias/persona" deseninden)
// ------------------------------------------------------------
// SADECE iletişim biçimi + duygu tonu. Klinik içerik DEĞİL → ACTIVE OK.
// Senaryo verisinden türetilir (vital/şikayet), uydurulmaz.

/** Hastanın baskın duygu tonu — vital + ana şikayetten türetilir. */
export type PatientAffect =
  | "sakin"        // stabil, ağrısız
  | "endiseli"     // hafif sıkıntı / belirsizlik kaygısı
  | "agrili"       // belirgin ağrı (pain >= 5)
  | "panik"        // solunum sıkıntısı / kritik vital
  | "bitkin";      // düşük enerji, halsizlik (düşük GKS / hipotansiyon)

/** İletişim zorluğu — opsiyonel rol-oyun katmanı (klinik değil). */
export type CommunicationStyle =
  | "isbirlikci"   // soruları açık yanıtlar
  | "az_konusan"   // kısa, çekingen, detayı zor verir
  | "dagdinik"     // konudan sapar, endişeyle araya girer
  | "asiri_detayci"; // alakasız detaylara boğar (anamnezi zorlaştırır)

/**
 * Hasta ajanının davranış/iletişim profili. AgentClinic'in ajan-başı
 * "persona/bias" parametresinin TR karşılığı. Hiçbir alan tıbbi gerçek
 * üretmez — yalnızca üslubu ayarlar.
 */
export interface PatientBehaviorProfile {
  affect?: PatientAffect;
  communication?: CommunicationStyle;
  /**
   * Tutarlılık zorlaması açık mı? (AgentClinic: hasta önceki cevaplarıyla
   * çelişmemeli). Varsayılan: true.
   */
  enforceConsistency?: boolean;
}

const AFFECT_DIRECTIVE: Record<PatientAffect, string> = {
  sakin:
    "Şu an sakinsin. Sakin, ölçülü bir tonla konuş; aceleci değilsin.",
  endiseli:
    "İçten içe endişelisin. Cümlelerine hafif tedirginlik kat ('iyi miyim doktorum?' gibi), ama panik yok.",
  agrili:
    "Belirgin ağrın var. Kısa, kesik cümleler kur; ağrı tonunu yansıt ('çok kötü ağrıyor', 'dayanamıyorum').",
  panik:
    "Nefes almakta zorlanıyor/çok korkmuş gibisin. Çok kısa, soluk soluğa cümleler ('nefes... alamıyorum', 'korkuyorum').",
  bitkin:
    "Bitkin ve halsizsin. Yavaş, alçak sesli, az kelimeyle konuş; çabuk yoruluyorsun.",
};

const COMMUNICATION_DIRECTIVE: Record<CommunicationStyle, string> = {
  isbirlikci:
    "Sorulara açık ve işbirlikçi yanıt verirsin, ama yine de istenmeden tüm hikâyeyi dökmezsin.",
  az_konusan:
    "Çekingensin; çok kısa yanıt verirsin. Detayı ancak doktor açıkça üsteleyince paylaşırsın.",
  dagdinik:
    "Kaygıdan konudan saparsın; bazen sorulan şey yerine aklındaki başka endişeyi söylersin. Doktor seni nazikçe geri yönlendirebilir.",
  asiri_detayci:
    "Alakasız ayrıntılara dalma eğilimindesin; doktorun asıl bilgiyi seçip çıkarması gerekir. Yine de yalan/uydurma bilgi vermezsin.",
};

/**
 * Senaryo verisinden (vital + ana şikayet) hastanın baskın duygu tonunu
 * türetir. UYDURMA YOK — yalnızca mevcut sayısal eşiklere göre üslup seçer.
 *
 * ⚠️ Buradaki eşikler iletişim TONU içindir, klinik karar değil. Yine de
 * sınır değerleri konservatif tutuldu. Tıbbi gerçek olarak yorumlanmamalı.
 */
export function deriveAffect(scenario: Scenario): PatientAffect {
  const v = scenario.initial_vitals;
  // Solunum sıkıntısı / kritik → panik
  if (v.spo2 < 90 || v.rr > 28) return "panik";
  // Belirgin ağrı → ağrılı
  if ((v.pain ?? 0) >= 5) return "agrili";
  // Düşük bilinç / hipotansiyon → bitkin
  if ((v.gcs ?? 15) <= 13 || v.bp_systolic < 90) return "bitkin";
  // Hafif sapmalar → endişeli
  if (v.hr > 100 || (v.pain ?? 0) >= 2) return "endiseli";
  return "sakin";
}

// ------------------------------------------------------------
// Hasta persona prompt kurucu (ACTIVE — teknik iskelet)
// ------------------------------------------------------------

/**
 * Senaryo → Gemini systemInstruction içine eklenecek persona metni.
 * Backend SAFETY_PREFIX ile birleşir.
 *
 * İkinci parametre opsiyonel davranış profilidir; verilmezse duygu tonu
 * senaryodan türetilir, iletişim "işbirlikçi", tutarlılık zorunlu olur.
 * Eski çağrılar (DialogChat) tek argümanla aynen çalışır.
 */
export function buildPatientPersona(
  scenario: Scenario,
  behavior?: PatientBehaviorProfile,
): string {
  const p = scenario.patient;
  const sexStr = SEX_TR[p.sex] ?? "Belirsiz";

  const meds = p.current_medications && p.current_medications.length > 0
    ? p.current_medications.join("; ")
    : "yok";
  const allergies = p.allergies.length > 0 ? p.allergies.join("; ") : "bildiğim yok";
  const history = p.history_items.length > 0
    ? p.history_items.join("; ")
    : "belirgin hastalık yok";

  const affect = behavior?.affect ?? deriveAffect(scenario);
  const communication = behavior?.communication ?? "isbirlikci";
  const enforceConsistency = behavior?.enforceConsistency ?? true;

  const consistencyRule = enforceConsistency
    ? "- TUTARLILIK: Daha önce söylediğin hiçbir şeyle çelişme. Sorulan soruya, önceki cevaplarınla uyumlu yanıt ver. Tarih/süre/şiddet bilgilerini değiştirme."
    : "";

  return `### Senin profilin (hastasın):
- Yaş: ${p.age}, Cinsiyet: ${sexStr}, Kilo: ${p.weight_kg} kg${p.height_cm ? `, Boy: ${p.height_cm} cm` : ""}
- Ana şikayet: ${p.chief_complaint}
- Geçmiş bilgi: ${history}
- Şu an kullandığın ilaçlar: ${meds}
- Alerjiler: ${allergies}

### Duygu durumu ve üslup:
- ${AFFECT_DIRECTIVE[affect]}
- ${COMMUNICATION_DIRECTIVE[communication]}

### Davranış kuralları:
- Gerçek hasta gibi konuş: kısa, doğal, kendiliğinden tüm semptomları söyleme.
- Doktor sormadıkça detay verme.
- Tıp jargonu KULLANMA. Örnekler:
  - "Dispnezi" değil → "Nefesim daralıyor"
  - "Sinkop" değil → "Bayıldım"
  - "Pirozis" değil → "Göğsümde yanma"
  - "Polidipsi" değil → "Sürekli su içiyorum"
- Bilmediğin teknik detayı sorulursa "Bilmiyorum doktor bey/hanım" de.
- Acı varsa duygusal tonu yansıt (kısa cümle, panik veya bitkinlik).
- Doktor cinsiyeti bilinmiyor — "doktor bey/hanım" yerine "doktorum" diyebilirsin.
- SADECE yukarıdaki profilde yazan bilgileri biliyorsun. Profilde olmayan
  bir hastalık, ilaç, tahlil değeri veya bulguyu UYDURMA — "bilmiyorum" de.
${consistencyRule}

### Cevap formatı:
- 1-3 cümle, max ~40 kelime.
- Soru sorulduysa odaklı cevap. Selama selamla.
- Hiçbir zaman karakter dışına çıkma. Sen Yapay zekâ olduğunu söylemezsin.`;
}
