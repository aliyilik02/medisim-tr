// ============================================================
// Mock Dialog Responder — Sprint B.2 erken iskelet
// ============================================================
// Gemini 2.5 Flash backend henüz kurulmadı; bu mock öğrencinin
// yazdığı soruyu senaryo data'sındaki patient/history alanlarıyla
// eşler ve heuristic yanıt üretir.
//
// Backend (B.0 + B.2) kurulduğunda bu modül signature'ını koruyup
// `generateGeminiResponse(...)` ile değiştirilebilir.
// ============================================================

import type { Scenario } from "@/engine";

export type CalgaryStage =
  | "initiating"        // 1. Karşılama
  | "gathering"         // 2. Anamnez (SAMPLE + OPQRST)
  | "physical_exam"     // 3. Fizik muayene (3D ile entegre olacak)
  | "explanation"       // 4. Açıklama ve plan
  | "closing";          // 5. Kapanış

export interface DialogTurn {
  role: "patient" | "student";
  text: string;
  at: number;          // unix ms
  stage?: CalgaryStage;
}

interface ResponderContext {
  scenario: Scenario;
  history: DialogTurn[];
  currentStage: CalgaryStage;
}

// ============================================================
// Anahtar kelime ↔ yanıt haritası
// SAMPLE (Signs/Allergies/Meds/PMH/Last meal/Events) +
// OPQRST (Onset/Provocation/Quality/Region/Severity/Time)
// ============================================================
const KEYWORD_PATTERNS: Array<{
  re: RegExp;
  field: keyof PatternFields;
  category: string;
}> = [
  // Karşılama
  { re: /\b(merhaba|iyi g[üu]nler|selam|adın(ı?)|kim(s|si)niz)\b/i, field: "greeting", category: "greeting" },
  // Onset / zaman
  { re: /(ne zaman|ne zamand[ıi]r|s[üu]re|ka[çc] g[üu]n|ka[çc] saat|başlad|kaçta)/i, field: "onset", category: "onset" },
  // Quality / nitelik
  { re: /(nas[ıi]l(?:\s+bir)?|ne tip|nitelik|s[ıi]z[ıi]m mı|sancı|yan(?:ıyor|ma)|baskı|s[ıi]kışt)/i, field: "quality", category: "quality" },
  // Region / yer
  { re: /(neres[ıi]|nerede|hangi b[öo]lge|yay[ıi]l|yer)/i, field: "region", category: "region" },
  // Severity / şiddet
  { re: /(ne kadar [şs]iddetli|0[-/ ]?10|skala|şiddet|a[ğg]r[ıi] (?:düzeyi|şiddeti)|dayan[ıi]labilir mi)/i, field: "severity", category: "severity" },
  // Provocation
  { re: /(art[ıi]r[ıi]yor|azal[ıi]yor|tetikl|ne yap[ıi]nca|hareket|nefes|yemek|stress)/i, field: "provocation", category: "provocation" },
  // Allergies
  { re: /(alerji|alerjin|hassasiyet|allergic|reaksiyon)/i, field: "allergies", category: "allergies" },
  // Medications
  { re: /(ilaç|ila[çc]\s*kullan|hangi ila[çc]|kronik ila[çc]|reçete)/i, field: "medications", category: "medications" },
  // PMH
  { re: /(geçmiş(?:te)?|ge[çc]irdi[ğg]in|kronik|hipertans|diabet|şeker|kalp hastal|astım|kanser|operasyon|ameliyat)/i, field: "pmh", category: "pmh" },
  // Last meal
  { re: /(son yemek|en son ne yedi[ğg]|aç m[ıi]s[ıi]n|son ö[ğg][üu]n|kaçta yedi[ğg])/i, field: "last_meal", category: "last_meal" },
  // Events
  { re: /(ne oldu|nas[ıi]l başlad|tetikleyen|olay|önce)/i, field: "events", category: "events" },
  // Ateş
  { re: /(ate[şs]|sıcakl[ıi]k|titre|terle)/i, field: "fever", category: "fever" },
  // Kusma
  { re: /(kusma|kustun mu|bulant[ıi])/i, field: "vomiting", category: "vomiting" },
  // İdrar
  { re: /(idrar|işeme|hematuri)/i, field: "urine", category: "urine" },
  // Nefes
  { re: /(nefes|soluk|hava|öksürük|balgam)/i, field: "respiratory", category: "respiratory" },
];

interface PatternFields {
  greeting: string;
  onset: string;
  quality: string;
  region: string;
  severity: string;
  provocation: string;
  allergies: string;
  medications: string;
  pmh: string;
  last_meal: string;
  events: string;
  fever: string;
  vomiting: string;
  urine: string;
  respiratory: string;
}

// Senaryo data'sından field çıkarma
function extractFields(scenario: Scenario): Partial<PatternFields> {
  const p = scenario.patient;
  const cc = p.chief_complaint;
  const hist = p.history_items;
  const meds = p.current_medications ?? [];
  const allergies = p.allergies;

  const histText = hist.join(" ").toLowerCase();
  const ccLower = cc.toLowerCase();

  return {
    greeting: `Merhaba doktor. ${p.age} yaşındayım. ${cc.split(".")[0]}.`,
    onset: extractOnset(cc, hist),
    quality: ccLower.includes("ağrı")
      ? "Künt, baskı tarzında bir ağrı. Bazen sızlama gibi."
      : cc,
    region: extractRegion(cc),
    severity: "Şiddetli, 7-8 civarı diyebilirim.",
    provocation: extractProvocation(hist),
    allergies: allergies.length > 0
      ? `Şunlara alerjim var: ${allergies.join(", ")}.`
      : "Bildiğim bir alerjim yok.",
    medications: meds.length > 0
      ? `Şu ilaçları kullanıyorum: ${meds.join("; ")}.`
      : "Düzenli ilaç kullanmıyorum.",
    pmh: hist.length > 0
      ? `Geçmişimde şunlar var: ${hist.filter(h => !h.toLowerCase().includes("son")).join("; ") || "belirgin bir şey yok"}.`
      : "Geçmişimde belirgin bir hastalık yok.",
    last_meal: "Son öğünüm... yaklaşık 6-8 saat önceydi sanırım.",
    events: cc,
    fever: histText.includes("ateş")
      ? "Evet, ateşim oldu. Ölçtüğümde 38 üstündeydi."
      : "Ateşim olduğunu fark etmedim.",
    vomiting: ccLower.includes("kusma") || histText.includes("kusma")
      ? "Evet, kusuyorum. Birkaç kez oldu."
      : "Kusmadım.",
    urine: ccLower.includes("idrar") || histText.includes("idrar")
      ? "İdrar yapmamda değişiklik var."
      : "İdrar yapmamda bir sorun fark etmedim.",
    respiratory: ccLower.includes("nefes") || ccLower.includes("öksür")
      ? "Nefes almakta zorlanıyorum, evet."
      : "Nefes almam normal sayılır.",
  };
}

function extractOnset(cc: string, hist: string[]): string {
  // chief_complaint'ten "X gündür", "Y saattir" çıkarmaya çalış
  const m = cc.match(/(\d+)\s*(gün|saat|dakika|hafta|ay)/i);
  if (m) return `Yaklaşık ${m[0]} önce başladı.`;
  const histM = hist.join(" ").match(/(\d+)\s*(gün|saat|dakika|hafta|ay)/i);
  if (histM) return `${histM[0]} kadar olmuştur.`;
  return "Bir süredir, tam olarak söyleyemem.";
}

function extractRegion(cc: string): string {
  const lc = cc.toLowerCase();
  if (lc.includes("göğüs")) return "Göğsümün ortasında, biraz sola doğru.";
  if (lc.includes("karın")) return "Karnımda, daha çok üst tarafta.";
  if (lc.includes("baş")) return "Başımın her tarafında, özellikle alın bölgesi.";
  if (lc.includes("sırt")) return "Sırtımda, omurga boyunca.";
  return "Tam yerini gösteremem, yaygın bir his.";
}

function extractProvocation(hist: string[]): string {
  const t = hist.join(" ").toLowerCase();
  if (t.includes("insülin")) return "İnsülinimi son birkaç gün aksattığımda kötüleşti.";
  if (t.includes("efor") || t.includes("yürü")) return "Hareket ederken artıyor, dinlenince hafifliyor.";
  return "Belli bir şey yapınca arttığını fark etmedim.";
}

// ============================================================
// Ana yanıt üretici
// ============================================================
export function generateMockResponse(ctx: ResponderContext, userText: string): DialogTurn {
  const fields = extractFields(ctx.scenario);
  const text = userText.trim();

  // Boş soru
  if (!text) {
    return makeReply("Sizi anlayamadım, tekrar eder misiniz?");
  }

  // Pattern matching
  for (const { re, field, category } of KEYWORD_PATTERNS) {
    if (re.test(text)) {
      const reply = fields[field];
      if (reply) {
        return makeReply(reply, category);
      }
    }
  }

  // Fallback — stage'e göre yönlendirme
  if (ctx.currentStage === "initiating") {
    return makeReply(fields.greeting ?? "Merhaba doktor.", "greeting");
  }
  if (ctx.currentStage === "gathering") {
    return makeReply(
      "Tam olarak anlayamadım. Şikayetimle ilgili sorularınızı sorabilirsiniz: ne zaman başladı, nasıl bir ağrı, nerede gibi.",
      "fallback",
    );
  }
  return makeReply("Bunu nasıl yanıtlayacağımı bilmiyorum.", "fallback");
}

function makeReply(text: string, _category?: string): DialogTurn {
  return {
    role: "patient",
    text,
    at: Date.now(),
  };
}

// ============================================================
// Calgary-Cambridge öneri sistemi
// Mevcut stage + soru sayısına göre öğrenciye prompt verir.
// ============================================================
export function getStudentPrompts(stage: CalgaryStage, turnCount: number): string[] {
  if (stage === "initiating") {
    return [
      "Merhaba, ben Dr. ... Bugün size nasıl yardımcı olabilirim?",
      "Adınız ve yaşınız?",
    ];
  }
  if (stage === "gathering") {
    // SAMPLE + OPQRST yönlendirmesi
    if (turnCount < 2) {
      return [
        "Bu şikayet ne zaman başladı?",
        "Nasıl bir his — sıkıştırma, yanma, sızlama?",
      ];
    }
    if (turnCount < 4) {
      return [
        "Ağrı nereye yayılıyor?",
        "0-10 arası şiddet?",
      ];
    }
    return [
      "Düzenli ilaç kullanıyor musunuz?",
      "Bilinen alerjiniz var mı?",
      "Geçmişte benzer şikayet veya başka hastalık?",
    ];
  }
  if (stage === "physical_exam") {
    return ["3D modelden muayene noktalarına tıklayın."];
  }
  return [];
}

// Hangi stage'e geçilebileceğini söyler (basit kural: gathering'de min 5 tur sonra explanation'a)
export function suggestNextStage(currentStage: CalgaryStage, turnCount: number): CalgaryStage | null {
  if (currentStage === "initiating" && turnCount >= 2) return "gathering";
  if (currentStage === "gathering" && turnCount >= 8) return "physical_exam";
  if (currentStage === "physical_exam" && turnCount >= 12) return "explanation";
  if (currentStage === "explanation" && turnCount >= 14) return "closing";
  return null;
}

export const CALGARY_STAGE_LABEL: Record<CalgaryStage, string> = {
  initiating:    "1. Karşılama",
  gathering:     "2. Anamnez",
  physical_exam: "3. Fizik Muayene",
  explanation:   "4. Açıklama & Plan",
  closing:       "5. Kapanış",
};
