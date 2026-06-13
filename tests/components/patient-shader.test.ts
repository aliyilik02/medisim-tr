import { describe, expect, test } from "vitest";
import {
  patientVertexCommon,
  patientVertexDisplacement,
  patientFragmentCommon,
  patientFragmentColor,
} from "@/components/patient-3d/shaders/patientShader";

describe("Patient 3D Shaders — Modüler Yapı Testi", () => {
  test("tüm shader parçaları başarıyla export edilmiş olmalı", () => {
    expect(patientVertexCommon).toBeDefined();
    expect(patientVertexDisplacement).toBeDefined();
    expect(patientFragmentCommon).toBeDefined();
    expect(patientFragmentColor).toBeDefined();
  });

  test("vertex shader parçaları gerekli uniform tanımlamalarını içermeli", () => {
    expect(patientVertexCommon).toContain("uniform float uTime;");
    expect(patientVertexCommon).toContain("uniform float uBreathAmplitude;");
    expect(patientVertexCommon).toContain("uniform float uSpeaking;");
    expect(patientVertexCommon).toContain("uniform float uBreathSpeed;");
  });

  test("vertex shader displacement formülü uBreathSpeed'i kullanmalı", () => {
    // bPhase formülü artık dinamik uBreathSpeed kullanmalı
    expect(patientVertexDisplacement).toContain("sin(uTime * uBreathSpeed)");
  });

  test("fragment shader parçaları cilt tonu uSkinTint uniformunu içermeli", () => {
    expect(patientFragmentCommon).toContain("uniform vec3 uSkinTint;");
    expect(patientFragmentColor).toContain("gl_FragColor.rgb *= uSkinTint;");
  });
});
