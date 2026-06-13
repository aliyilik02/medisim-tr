/**
 * MediSim TR — Sanal Hasta 3D Materyal Shader Kodları
 * 
 * Bu dosya, R3F bileşeninin içindeki karmaşık string replaceleri izole ederek,
 * shader kodlamasını modüler, okunabilir ve hatasız hale getirir.
 * Ayrıca dynamic breathing speed (RR) desteği ekler.
 */

export const patientVertexCommon = `
#include <common>
uniform float uTime;
uniform float uBreathAmplitude;
uniform float uBreathSpeed; // Vital RR değerine bağlı dinamik nefes alma hızı
`;

export const patientVertexDisplacement = `
#include <begin_vertex>
// Çift-center solunum (diafragma simülasyonu).
// Chest + abdomen aynı fazda, aynı yön (AP expansion).
vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);

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
`;

export const patientFragmentColor = `
#include <dithering_fragment>
gl_FragColor.rgb *= uSkinTint;
`;
