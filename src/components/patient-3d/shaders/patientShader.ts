/**
 * MediSim TR — Sanal Hasta 3D Materyal Shader Kodları
 *
 * Bu dosya, R3F bileşeninin içindeki karmaşık string replaceleri izole ederek,
 * shader kodlamasını modüler, okunabilir ve hatasız hale getirir.
 * Ayrıca dynamic breathing speed (RR) desteği ekler.
 *
 * KLİNİK GÖRSEL KATMAN (AŞAMA 2): cyanosis/pallor/diaphoresis/mottled sürekli
 * (0-1) uniform'ları cilt rengine uygulanır. Değerler clinicalVisualMapping.ts
 * (saf TS) → mapVitalsToVisuals'tan gelir. mottled deseni için world-pos varying.
 *
 * ZONAL KATMAN (AŞAMA 3): siyanoz/mottling artık anatomik bölge ağırlıklı
 * (perioral + akral siyanoz baskın; livedo ekstremitede belirgin, gövdede az).
 * Bölge formülleri patientZones.ts'teki SAF TS fonksiyonlarla birebir aynıdır
 * (sabitler oradan interpolasyonla gelir) — vitest paritesi oradan sağlanır.
 * Koordinat: vClinicalWorldPos = pre-skinning canonical world (bind pose;
 * tüm varyantlar wrapper scale ile aynı kutuya oturur, ayak y=-0.243).
 *
 * HASTA ÖNLÜĞÜ: shader bölge maskesi (giysi MESH'İ DEĞİL — animasyonlu
 * gövdede clipping sıfır). uGownEnable/uGownColor uniform'ları HİÇ set
 * edilmezse GLSL varsayılanı 0 → önlük kapalı, mevcut görünüm değişmez
 * (geriye uyumlu). Açmak için: Object.assign(shader.uniforms,
 * createGownUniforms()) — patientZones.ts.
 */

import { ZONE, CANON_Y_MIN, CANON_HEIGHT, GOWN_DEFAULT_COLOR } from "./patientZones";

// GLSL float literal üretici — sabitlerin TS ⇄ GLSL paritesini garanti eder.
const f = (n: number) => n.toFixed(4);

export const patientVertexCommon = `
#include <common>
uniform float uTime;
uniform float uBreathAmplitude;
uniform float uBreathSpeed; // Vital RR değerine bağlı dinamik nefes alma hızı
varying vec3 vClinicalWorldPos; // mottled (livedo) deseni için world konum
`;

export const patientVertexDisplacement = `
#include <begin_vertex>
// Çift-center solunum (diafragma simülasyonu).
// Chest + abdomen aynı fazda, aynı yön (AP expansion).
vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);
vClinicalWorldPos = bWorldPos.xyz;

// Chest (4. ICS) — birincil göğüs kafesi genişlemesi
vec3 bChestCenter = vec3(0.0, 0.523, 0.085);
float bChestDist = distance(bWorldPos.xyz, bChestCenter);
float bChestWeight = 1.0 - smoothstep(0.03, 0.08, bChestDist);

// Abdomen (göbek üstü) — diafragmanın öne itilmesi (subtle, %60 etki)
vec3 bAbdomenCenter = vec3(0.0, 0.40, 0.085);
float bAbdomenDist = distance(bWorldPos.xyz, bAbdomenCenter);
float bAbdomenWeight = (1.0 - smoothstep(0.04, 0.10, bAbdomenDist)) * 0.60;

// uBreathSpeed artık statik 0.25Hz yerine vitallerden dinamik gelir
float bPhase = sin(uTime * uBreathSpeed);
float bTotalWeight = bChestWeight + bAbdomenWeight;
transformed += normal * bTotalWeight * bPhase * uBreathAmplitude;
`;

export const patientFragmentCommon = `
#include <common>
uniform vec3 uSkinTint;
uniform float uCyanosis;    // 0-1 mavi-mor ton kayması (hipoksi)
uniform float uPallor;      // 0-1 solgunluk (perfüzyon kaybı)
uniform float uDiaphoresis; // 0-1 terleme parlaklığı
uniform float uMottled;     // 0-1 benekli/livedo (şok cildi)
uniform float uGownEnable;  // 0 = önlük kapalı (set edilmezse varsayılan 0 — geriye uyumlu), 1 = açık
uniform vec3 uGownColor;    // önlük rengi (sRGB); (0,0,0) ise dahili #6fa8a0 kullanılır
varying vec3 vClinicalWorldPos;

// ═══ Anatomik bölge (zonal) fonksiyonları ═══
// TS aynası: patientZones.ts — formüller birebir, sabitler oradan interpolasyonlu.
// Girdi: xA = |canonical x| (midline uzaklığı), yN = 0-1 boy oranı, zF = canonical z (ön +).

// Perioral (ağız çevresi): mouth ratio ${f(ZONE.perioralY)} merkezli bant × midline × ön yüz
float msZonePerioral(float xA, float yN, float zF) {
  float bandY = 1.0 - smoothstep(${f(ZONE.perioralYIn)}, ${f(ZONE.perioralYOut)}, abs(yN - ${f(ZONE.perioralY)}));
  float central = 1.0 - smoothstep(${f(ZONE.perioralXIn)}, ${f(ZONE.perioralXOut)}, xA);
  float front = smoothstep(${f(ZONE.perioralZIn)}, ${f(ZONE.perioralZOut)}, zF);
  return bandY * central * front;
}

// Akral: el (gövdeden uzak |x| + bilek bandı) ∪ ayak (mid-calf altı)
float msZoneAcral(float xA, float yN) {
  float hand = smoothstep(${f(ZONE.handXIn)}, ${f(ZONE.handXOut)}, xA)
             * smoothstep(${f(ZONE.handYLo0)}, ${f(ZONE.handYLo1)}, yN)
             * (1.0 - smoothstep(${f(ZONE.handYHi0)}, ${f(ZONE.handYHi1)}, yN));
  float foot = 1.0 - smoothstep(${f(ZONE.footYIn)}, ${f(ZONE.footYOut)}, yN);
  return max(hand, foot);
}

// Siyanoz zonal çarpanı: gövde tabanı ${f(ZONE.cyanBase)} (santral), perioral+akral → 1
float msZoneCyanosis(float xA, float yN, float zF) {
  return ${f(ZONE.cyanBase)} + (1.0 - ${f(ZONE.cyanBase)}) * max(msZonePerioral(xA, yN, zF), msZoneAcral(xA, yN));
}

// Mottling zonal çarpanı: bacak/kol belirgin, gövde tabanı ${f(ZONE.mottleBase)}, yüz 0
float msZoneMottle(float xA, float yN) {
  float leg = 1.0 - smoothstep(${f(ZONE.legY0)}, ${f(ZONE.legY1)}, yN);
  float arm = smoothstep(${f(ZONE.armXIn)}, ${f(ZONE.armXOut)}, xA)
            * (1.0 - smoothstep(${f(ZONE.armYHi0)}, ${f(ZONE.armYHi1)}, yN));
  float faceGate = 1.0 - smoothstep(${f(ZONE.faceGate0)}, ${f(ZONE.faceGate1)}, yN);
  return (${f(ZONE.mottleBase)} + (1.0 - ${f(ZONE.mottleBase)}) * max(leg, arm)) * faceGate;
}

// Hasta önlüğü maskesi: gövde+kalça+uyluk üstü; yaka önde daha aşağı, kollar cilt
float msZoneGown(float xA, float yN, float zF) {
  float hem = smoothstep(${f(ZONE.gownHem0)}, ${f(ZONE.gownHem1)}, yN);
  float front = smoothstep(${f(ZONE.gownZ0)}, ${f(ZONE.gownZ1)}, zF);
  float neckTop = ${f(ZONE.gownNeckBack)} - ${f(ZONE.gownNeckDrop)} * front;
  float top = 1.0 - smoothstep(neckTop, neckTop + ${f(ZONE.gownNeckFeather)}, yN);
  float lateral = 1.0 - smoothstep(${f(ZONE.gownX0)}, ${f(ZONE.gownX1)}, xA);
  return hem * top * lateral;
}
`;

export const patientFragmentColor = `
#include <dithering_fragment>
// ── Zonal koordinatlar: canonical ayakta-poz world (pre-skinning) ──
float zYN = (vClinicalWorldPos.y - (${f(CANON_Y_MIN)})) / ${f(CANON_HEIGHT)};
float zXA = abs(vClinicalWorldPos.x);
float zZF = vClinicalWorldPos.z;

// Işık faktörü — önlüğü kendi rengiyle "yeniden aydınlatmak" için, klinik
// tint uygulanmadan ÖNCE yakalanır (lit renk / albedo ≈ gelen ışık).
vec3 zGownLight = clamp(gl_FragColor.rgb / max(diffuseColor.rgb, vec3(0.02)), 0.0, 4.0);

gl_FragColor.rgb *= uSkinTint;

// ── Siyanoz: perioral + akral baskın zonal ağırlıkla mavi-mor harman ──
vec3 cyanoticTint = vec3(0.60, 0.70, 0.96);
float zCyan = uCyanosis * msZoneCyanosis(zXA, zYN, zZF);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * cyanoticTint, zCyan);

// ── Solgunluk: doygunluğu azalt + hafif griye/açığa çek (jeneralize) ──
float pLum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 paleColor = mix(gl_FragColor.rgb, vec3(pLum) * 1.06, 0.6);
gl_FragColor.rgb = mix(gl_FragColor.rgb, paleColor, uPallor);

// ── Mottled (livedo): ekstremite-ağırlıklı benekli koyu-mor desen ──
float mNoise = sin(vClinicalWorldPos.x * 55.0)
             * sin(vClinicalWorldPos.y * 47.0)
             * sin(vClinicalWorldPos.z * 61.0);
float mMask = smoothstep(0.05, 0.55, mNoise) * uMottled * msZoneMottle(zXA, zYN);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.72, 0.58, 0.66), mMask);

// ── Diaforez: terli parlama (hafif additive sheen) ──
gl_FragColor.rgb += vec3(0.035, 0.035, 0.045) * uDiaphoresis;

// ── Hasta önlüğü: shader bölge maskesi (giysi mesh'i yok → clipping yok) ──
// Klinik cilt bulgularından SONRA harmanlanır → önlük altındaki cilt
// bulguları kumaşla örtülür (klinik olarak da doğru).
float gMask = msZoneGown(zXA, zYN, zZF) * clamp(uGownEnable, 0.0, 1.0);
if (gMask > 0.001) {
  // uGownColor set edilmemişse (0,0,0) → dahili hastane teali #6fa8a0
  vec3 gBase = (uGownColor.r + uGownColor.g + uGownColor.b) < 0.01
    ? vec3(${f(GOWN_DEFAULT_COLOR[0])}, ${f(GOWN_DEFAULT_COLOR[1])}, ${f(GOWN_DEFAULT_COLOR[2])})
    : uGownColor;
  // Kumaş dokusu: mevcut sin-çarpım noise deseninin yüksek frekanslısı
  float gWeave = 1.0 + 0.035 * sin(vClinicalWorldPos.x * 240.0)
                     * sin(vClinicalWorldPos.y * 260.0);
  // Dikiş çizgileri: etek ucu + yan dikiş (hafif koyulaştırma)
  float gHemSeam = 1.0 - smoothstep(0.004, 0.010, abs(zYN - ${f(ZONE.gownHemSeamY)}));
  float gSideSeam = 1.0 - smoothstep(0.003, 0.008, abs(zXA - ${f(ZONE.gownSideSeamX)}));
  float gSeam = max(gHemSeam, gSideSeam);
  vec3 gLit = gBase * gWeave * (1.0 - 0.18 * gSeam) * zGownLight;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gLit, gMask);
}
`;
