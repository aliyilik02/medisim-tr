// ============================================================
// STEMI — Fizik muayene bulguları (faza göre)
// ============================================================
// ⚠️ KLİNİK İÇERİK — DRAFT. ACTIVE'e yalnız Ali Bey geçirir.
//
// Faz eşlemesi (stemi.ts deterioration id'leri):
//   default (stemi-iskemi) → SCAI B, Killip I   : perfüzyon korunmuş, akciğer temiz
//   stemi-sok              → SCAI C, Killip II  : soğuk-nemli cilt, bazal ral, S3
//   stemi-kotulesme        → SCAI D, Killip III : bilinç bulanık, yaygın ral, benekli cilt
//   stemi-arrest           → SCAI E             : yanıtsız, nabız/solunum yok
//   recovering             → reperfüzyon sonrası düzelme
//
// KAYNAKLI olan: hangi bulgunun hangi evrede beklendiği (aşağıdaki `sources`).
// KALİBRASYON olan (TODO_KLINIK — kılavuz verisi DEĞİL, pedagojik seçim):
//   - kapiller dolum saniyeleri (kaynak yalnız ">2 sn uzamış" der; 4/6 sn seçimdir)
//   - arrestte pupil çapı/yanıtı ve bunun zamanlaması
//   - "recovering" bulgularının hepsi (düzelme hızı modellenmedi)
// Doğrulanmadı: kaynak metinleri hafızadan aktarıldı, tam metinle satır satır
//   karşılaştırılmadı — bu yüzden DRAFT.
// Bilinen sınır: S3 galo ve "derinden kalp sesi" için lisanslı ses kaydı yok
//   (auscultationAudio.ts PLACEHOLDER) → metin S3 der, çalan ses S3 DEĞİL.
// ============================================================

import type { ScenarioExam } from "@/engine";

const ABDOMEN_NOTE = "Yumuşak, hassasiyet yok.";

export const STEMI_EXAM: ScenarioExam = {
  scenario_id: "kardiyoloji-stemi-001",
  status: "DRAFT",
  sources: [
    "Killip T, Kimball JT. Am J Cardiol 1967;20:457-464 (Killip sınıflaması: ral, S3, akciğer ödemi, şok)",
    "Naidu SS ve ark. SCAI SHOCK Stage Classification Expert Consensus Update. J Am Coll Cardiol 2022;79:933-946 (evreye göre fizik muayene)",
    "Byrne RA ve ark. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826",
  ],
  points: [
    // ── A — Hava yolu ─────────────────────────────────────────
    {
      id: "hava-yolu",
      site: "airway",
      label: "Hava yolu",
      category: "A",
      technique: "inspeksiyon",
      default: {
        text: "Hasta konuşuyor, tam cümle kuruyor. Hava yolu açık; hırıltı veya stridor yok.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Kısa cümlelerle konuşuyor, soluk soluğa. Hava yolu açık.",
        },
        "stemi-kotulesme": {
          text: "Bilinç bulanık, sözleri anlaşılmıyor. Hava yolu şimdilik açık ama kendi koruyamayabilir.",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Yanıt yok. Kendiliğinden solunum yok. Hava yolu korunmuyor.",
          abnormal: true,
        },
        recovering: {
          text: "Konuşuyor, hava yolu açık.",
        },
      },
    },

    // ── B — Solunum ───────────────────────────────────────────
    {
      id: "akciger-sag",
      site: "lung_right",
      label: "Sağ akciğer",
      category: "B",
      technique: "oskultasyon",
      default: {
        text: "Solunum sesleri doğal, iki yanda eşit. Ral yok. Solunum {rr}/dk.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Alt bölgede ince raller (çıtırtı). Solunum {rr}/dk.",
          sound: { file: "lung_crackles" },
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Raller orta bölgeye kadar yayılmış — akciğer ödemi bulgusu. Solunum {rr}/dk.",
          sound: { file: "lung_crackles" },
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Solunum sesi alınmıyor.",
          sound: { silent: true },
          abnormal: true,
        },
        recovering: {
          text: "Solunum sesleri iki yanda alınıyor. Alt bölgede seyrek ral kalmış olabilir.",
        },
      },
    },
    {
      id: "akciger-sol",
      site: "lung_left",
      label: "Sol akciğer",
      category: "B",
      technique: "oskultasyon",
      default: {
        text: "Solunum sesleri doğal, sağ ile eşit. Ral yok.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Alt bölgede ince raller (çıtırtı), sağ ile benzer.",
          sound: { file: "lung_crackles" },
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Yaygın raller, sağ ile benzer — akciğer ödemi bulgusu.",
          sound: { file: "lung_crackles" },
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Solunum sesi alınmıyor.",
          sound: { silent: true },
          abnormal: true,
        },
        recovering: {
          text: "Solunum sesleri alınıyor, sağ ile eşit.",
        },
      },
    },

    // ── C — Dolaşım ───────────────────────────────────────────
    {
      id: "kalp-apeks",
      site: "heart_apex",
      label: "Kalp (apeks)",
      category: "C",
      technique: "oskultasyon",
      default: {
        text: "S1-S2 ritmik, hızlı ({hr}/dk). Üfürüm yok, ek ses yok.",
        sound: "phase_heart",
      },
      by_phase: {
        "stemi-sok": {
          text: "Hızlı ({hr}/dk). S3 galo (ek ses) var — sol kalp yetmezliği bulgusu.",
          sound: "phase_heart",
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Kalp sesleri derinden ve zayıf. Hızlı ({hr}/dk), araya düzensiz vurular giriyor.",
          sound: "phase_heart",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Kalp sesi alınmıyor.",
          sound: { silent: true },
          abnormal: true,
        },
        recovering: {
          text: "S1-S2 ritmik, {hr}/dk. Ek ses yok.",
          sound: "phase_heart",
        },
      },
    },
    {
      id: "kalp-taban",
      site: "heart_base",
      label: "Kalp (aort odağı)",
      category: "C",
      technique: "oskultasyon",
      default: {
        text: "S2 net. Üfürüm yok — aort kapağı yetmezliğini düşündüren ses yok.",
        sound: "phase_heart",
      },
      by_phase: {
        "stemi-kotulesme": {
          text: "Kalp sesleri derinden, zayıf. Üfürüm ayırt edilmiyor.",
          sound: "phase_heart",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Kalp sesi alınmıyor.",
          sound: { silent: true },
          abnormal: true,
        },
      },
    },
    {
      id: "boyun",
      site: "neck",
      label: "Boyun",
      category: "C",
      technique: "inspeksiyon",
      default: {
        text: "Baş 45° yükseltildiğinde boyun damarları dolgun değil. Şah damarı nabzı iki yanda alınıyor.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Boyun damarlarında dolgunluk başlamış. Şah damarı nabzı zayıf.",
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Boyun damarları belirgin dolgun. Şah damarı nabzı zayıf ve hızlı.",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Şah damarı nabzı alınmıyor.",
          abnormal: true,
        },
        recovering: {
          text: "Şah damarı nabzı dolgun. Boyun damarlarındaki dolgunluk geriliyor.",
        },
      },
    },
    {
      id: "nabiz-radial",
      site: "radial_pulse",
      label: "Bilek nabzı",
      category: "C",
      technique: "palpasyon",
      default: {
        text: "Bilek nabzı dolgun, ritmik, {hr}/dk. İki kolda eşit.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Bilek nabzı zayıf ve hızlı ({hr}/dk). Cilt soğuk, nemli.",
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Bilek nabzı ipliksi, zor alınıyor. Eller soğuk.",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Nabız alınmıyor.",
          abnormal: true,
        },
        recovering: {
          text: "Bilek nabzı dolgunlaşıyor, ritmik, {hr}/dk.",
        },
      },
    },
    {
      id: "kapiller-dolum",
      site: "cap_refill",
      label: "Kapiller dolum",
      category: "C",
      technique: "palpasyon",
      default: {
        text: "Kapiller dolum yaklaşık 2 sn — normal (2 sn ve altı).",
        visual: { kind: "cap_refill", seconds: 2 },
      },
      by_phase: {
        "stemi-sok": {
          // TODO_KLINIK: 4 sn pedagojik seçim (kaynak: >2 sn uzamış)
          text: "Kapiller dolum yaklaşık 4 sn — uzamış. Uç dolaşımı bozuluyor.",
          visual: { kind: "cap_refill", seconds: 4 },
          abnormal: true,
        },
        "stemi-kotulesme": {
          // TODO_KLINIK: 6 sn pedagojik seçim
          text: "Kapiller dolum 5 sn'den uzun — belirgin uzamış. Parmaklar soğuk, soluk.",
          visual: { kind: "cap_refill", seconds: 6 },
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Renk geri dönmüyor — dolaşım yok.",
          visual: { kind: "cap_refill", seconds: null },
          abnormal: true,
        },
        recovering: {
          // TODO_KLINIK: düzelme hızı modellenmedi
          text: "Kapiller dolum yaklaşık 3 sn — kısalıyor.",
          visual: { kind: "cap_refill", seconds: 3 },
        },
      },
    },
    {
      id: "bacak-odem",
      site: "leg_edema",
      label: "Bacak",
      category: "C",
      technique: "palpasyon",
      default: {
        text: "Bastırınca iz kalmıyor, ödem yok. Baldır yumuşak ve ağrısız, iki bacak eşit.",
      },
      by_phase: {
        "stemi-sok": {
          text: "Ödem yok. Ayaklar soğuk.",
          abnormal: true,
        },
        "stemi-kotulesme": {
          text: "Ödem yok. Dizlerde ağ biçiminde morarma (benekli cilt) — dolaşım yetersiz.",
          abnormal: true,
        },
        "stemi-arrest": {
          text: "Bacaklar soğuk ve benekli.",
          abnormal: true,
        },
      },
    },

    // ── D — Nörolojik ─────────────────────────────────────────
    {
      id: "pupiller",
      site: "pupils",
      label: "Göz bebekleri",
      category: "D",
      technique: "inspeksiyon",
      default: {
        text: "Göz bebekleri eşit, ışığa yanıt canlı. Bilinç açık (GKS {gcs}), huzursuz ve endişeli.",
        visual: { kind: "pupil", size_mm: 3, reactivity: "canli" },
      },
      by_phase: {
        "stemi-kotulesme": {
          text: "Göz bebekleri eşit, ışığa yanıt var. Bilinç bulanık (GKS {gcs}).",
          visual: { kind: "pupil", size_mm: 3, reactivity: "canli" },
          abnormal: true,
        },
        "stemi-arrest": {
          // TODO_KLINIK: çap + zamanlama pedagojik seçim
          text: "Göz bebekleri geniş, ışığa yanıt alınmıyor. Yanıtsız (GKS {gcs}).",
          visual: { kind: "pupil", size_mm: 6, reactivity: "yok" },
          abnormal: true,
        },
        recovering: {
          text: "Göz bebekleri eşit, ışığa yanıt canlı. Bilinç açık (GKS {gcs}).",
          visual: { kind: "pupil", size_mm: 3, reactivity: "canli" },
        },
      },
    },

    // ── E — Tam bakı (karın) ──────────────────────────────────
    {
      id: "karin-sag-ust",
      site: "abdomen_ruq",
      label: "Karın sağ üst",
      category: "E",
      technique: "palpasyon",
      default: { text: `${ABDOMEN_NOTE} Karaciğer ele gelmiyor.` },
    },
    {
      id: "karin-sol-ust",
      site: "abdomen_luq",
      label: "Karın sol üst",
      category: "E",
      technique: "palpasyon",
      default: { text: `${ABDOMEN_NOTE} Mide bölgesinde ağrı yok.` },
    },
    {
      id: "karin-sag-alt",
      site: "abdomen_rlq",
      label: "Karın sağ alt",
      category: "E",
      technique: "palpasyon",
      default: { text: `${ABDOMEN_NOTE} Bastırıp bırakınca ağrı yok.` },
    },
    {
      id: "karin-sol-alt",
      site: "abdomen_llq",
      label: "Karın sol alt",
      category: "E",
      technique: "palpasyon",
      default: { text: `${ABDOMEN_NOTE} Atım veren kitle ele gelmiyor.` },
    },
  ],
};
