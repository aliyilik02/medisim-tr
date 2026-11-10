#!/usr/bin/env bash
# ============================================================
# Hasta v3 (B yolu) üretim hattı — tek komut
#   bash scripts/patient-v3.sh [hair] [eyebrow] [eye] [skin] [aday_adi]
# Sıra: build_v3 (Blender) → texpass_v3 (Blender+numpy) → inject-v3 → retex-v3
#       → gltf-transform optimize (meshopt+webp, morph korunur) → GLB kapısı
# Çıktı: public/3d/candidates/<aday_adi>.glb (canlıya BAĞLANMAZ)
# ============================================================
set -euo pipefail
HAIR="${1:-short02}"; BROW="${2:-eyebrow001}"; EYE="${3:-brown}"; SKIN="${4:-old_caucasian_male}"; CAND="${5:-patient-v3-male}"
BLENDER="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.1/blender.exe}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WROOT="$(cd "$ROOT" && pwd -W)"
MPFB="$APPDATA/Blender Foundation/Blender/5.1/extensions/.user/blender_org/mpfb/data"
SRC="$WROOT/assets/3d-src"
cd "$ROOT"
"$BLENDER" -b --python assets/blender-scripts/build_v3.py -- \
  "$SRC/patient-animated-male-raw.glb" "$SRC/patient-v3-male" "$HAIR" "$BROW" "$EYE" "$SKIN" 2>&1 | grep -E "UV ada|EXPORT|Traceback|Error:" || true
SKINPNG=$(ls "$MPFB/skins/$SKIN/"*.png | grep -vi thumb | head -1)
"$BLENDER" -b --python assets/blender-scripts/texpass_v3.py -- \
  "$SRC/patient-v3-male-vmaster.glb" "$SKINPNG" "$MPFB/hair/$HAIR/${HAIR}_diffuse.png" \
  "$MPFB/clothes/wdg_mycenaean_tunic/Mycenaean_Tunic_texture.png" "$MPFB/eyebrows/$BROW/$BROW.png" "$SRC/tex-v3" 2>&1 | grep -E "YAZILDI|sapma|kafa|Traceback|Error:" || true
node scripts/inject-v3.mjs public/3d/patient-v2-male.glb assets/3d-src/patient-v3-male-vmaster.glb assets/3d-src/patient-v3-male-inject.glb | grep -E "ÇEVİRİ|YENİDEN|MORPH|UYARI|yazıldı"
node scripts/retex-v3.mjs assets/3d-src/patient-v3-male-inject.glb assets/3d-src/patient-v3-male-retex.glb assets/3d-src/tex-v3
mkdir -p public/3d/candidates
npx gltf-transform optimize assets/3d-src/patient-v3-male-retex.glb "public/3d/candidates/$CAND.glb" \
  --compress meshopt --texture-compress webp --texture-size 2048 \
  --simplify false --join false --weld false --prune true --instance false | tail -1
node scripts/validate-glb.mjs public/3d/candidates/$CAND.glb --min-morph=52 | tail -1
