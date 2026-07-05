=== BEKLEYEN DOSYALAR TAM LİSTE ===
 M .mcp.json
 M docs/memory/medisim_rakip_analiz.md
?? BILINMEYEN.md
?? DURUM-BRIEF.md
?? public/sounds/auscultation/heart_61bpm.ogg
?? public/sounds/auscultation/heart_normal.ogg
?? public/sounds/auscultation/lung_crackles.ogg
?? public/sounds/auscultation/lung_wheeze.ogg

=== .ogg DOSYALARI NEREDE / NE İŞE YARIYOR ===
./.claude/worktrees/vibrant-newton-e326e8/dist/sounds/auscultation/heart_61bpm.ogg
./.claude/worktrees/vibrant-newton-e326e8/dist/sounds/auscultation/heart_normal.ogg
./.claude/worktrees/vibrant-newton-e326e8/dist/sounds/auscultation/lung_crackles.ogg
./.claude/worktrees/vibrant-newton-e326e8/dist/sounds/auscultation/lung_wheeze.ogg
./.claude/worktrees/vibrant-newton-e326e8/public/sounds/auscultation/heart_61bpm.ogg
./.claude/worktrees/vibrant-newton-e326e8/public/sounds/auscultation/heart_normal.ogg
./.claude/worktrees/vibrant-newton-e326e8/public/sounds/auscultation/lung_crackles.ogg
./.claude/worktrees/vibrant-newton-e326e8/public/sounds/auscultation/lung_wheeze.ogg
./dist/sounds/auscultation/heart_61bpm.ogg
./dist/sounds/auscultation/heart_normal.ogg
./dist/sounds/auscultation/lung_crackles.ogg
./dist/sounds/auscultation/lung_wheeze.ogg
./public/sounds/auscultation/heart_61bpm.ogg
./public/sounds/auscultation/heart_normal.ogg
./public/sounds/auscultation/lung_crackles.ogg
./public/sounds/auscultation/lung_wheeze.ogg
--- bunları kullanan kod ---
src/components/patient-3d/auscultationAudio.ts
src/components/patient-3d/regions.ts
src/engine/types.ts

=== .mcp.json İÇERİĞİ ===
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ]
    },
    "blender": {
      "type": "stdio",
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "C:\\Users\\Mehmet Ali Yılık\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\Claude Extensions\\ant.dir.gh.blender.blender-mcp",
        "blender-mcp"
      ]
    }
  }
}
=== KVKK İLE İLGİLİ NE VAR ===
src/clinical/fhir/scenarioToFhir.ts
src/components/editor/AIStepAssist.tsx
src/components/editor/Step2Library.tsx
src/components/patient-3d/InspectionPanel.tsx
src/components/patient-3d/LICENSE-3D.md
src/components/patient-3d/procedures/types.ts
src/data/equipment.ts
src/data/medications-extended.ts
src/data/scenarios/anaflaksi.ts
src/data/scenarios/bronsiyolit.ts

=== YENİ BODY MODEL DOSYALARI ===
public/3d/er-room.glb
public/3d/patient-animated-child.glb
public/3d/patient-animated-elderly.glb
public/3d/patient-animated-male.glb
public/3d/patient-animated.glb
public/3d/patient-child.glb
public/3d/patient-elderly.glb
public/3d/patient-female-adult.glb
public/3d/patient-male-adult.glb
public/3d/patient-mimikli.glb
total 26M
-rw-r--r-- 1 Mehmet Ali Yılık 197121 7.5K Jun 15 01:22 3D-ASSETS-LICENSE.md
-rw-r--r-- 1 Mehmet Ali Yılık 197121 3.0M Jun 15 00:25 er-room.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121  727 May 23 01:16 export_glb.py
-rw-r--r-- 1 Mehmet Ali Yılık 197121 892K Jun 13 19:48 patient-animated-child.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 989K Jun 13 20:48 patient-animated-elderly.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 984K Jun 13 20:48 patient-animated-male.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 869K Jun 13 19:10 patient-animated.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 549K Jun 13 06:35 patient-child.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 534K Jun 13 06:35 patient-elderly.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 539K Jun 13 06:35 patient-female-adult.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121 532K Jun 13 06:35 patient-male-adult.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121  17M Jun 13 05:48 patient-mimikli.glb
-rw-r--r-- 1 Mehmet Ali Yılık 197121  35K May 23 01:16 patient-mimikli.tsx

=== MEVCUT AUTH/LOGIN KODU ===
--- routing'de auth route var mı ---

