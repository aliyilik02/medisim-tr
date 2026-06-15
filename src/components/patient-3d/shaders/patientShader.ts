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
 */

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
varying vec3 vClinicalWorldPos;
`;

export const patientFragmentColor = `
#include <dithering_fragment>
gl_FragColor.rgb *= uSkinTint;

// ── Siyanoz: mavi-mor tona doğru harmanla (hipoksik cilt) ──
vec3 cyanoticTint = vec3(0.60, 0.70, 0.96);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * cyanoticTint, uCyanosis);

// ── Solgunluk: doygunluğu azalt + hafif griye/açığa çek ──
float pLum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 paleColor = mix(gl_FragColor.rgb, vec3(pLum) * 1.06, 0.6);
gl_FragColor.rgb = mix(gl_FragColor.rgb, paleColor, uPallor);

// ── Mottled (livedo): world-pos tabanlı benekli koyu-mor desen ──
float mNoise = sin(vClinicalWorldPos.x * 55.0)
             * sin(vClinicalWorldPos.y * 47.0)
             * sin(vClinicalWorldPos.z * 61.0);
float mMask = smoothstep(0.05, 0.55, mNoise) * uMottled;
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.72, 0.58, 0.66), mMask);

// ── Diaforez: terli parlama (hafif additive sheen) ──
gl_FragColor.rgb += vec3(0.035, 0.035, 0.045) * uDiaphoresis;
`;
