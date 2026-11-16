# -*- coding: utf-8 -*-
"""MetaHuman yuz -> ARKit-52 poz bake'i (Unreal tarafi, adim 1/3).

Amac:
  MetaHuman yuzunu RigLogic ile ARKit'in 52 pozunda degerlendirip sonucu
  (son kemik donusumleri + morph target agirliklari) duz bir AnimSequence'a bake eder.
  Blender tarafi (blender/arkit_from_baked_anim.py) bu pozlari sekil anahtarina cevirir.

Nasil calisir:
  1. AS_MetaHuman_ARKit_Mapping'deki CTRL_expressions_* egrilerini okur (kare 0 = Default,
     kare 1..51 = PA_MetaHuman_ARKit_Mapping poz sirasi). Kare 0 degerleri cikarilir
     (eslemede noseWrinkleUpper her karede 1.0 sabit; additive taban).
  2. Hedef yuz iskeletinde "surucu" AnimSequence olusturur (54 kare @30fps):
        0 = notr, 1..51 = ARKit pozlari, 52 = jawOpen+mouthLipsTogether (mouthClose yardimcisi),
        53 = ham kare 0 (tani: tabani cikarmamanin etkisi).
  3. Gecici SkeletalMeshActor + LevelSequence kurar, yuz mesh'i (post-process ABP = RigLogic)
     surucu animi oynatir; SequencerTools.export_anim_sequence ile kemik + morph egrilerini
     bake eder (RigLogic LOD = secilen LOD).
  4. Kare->ARKit adi tablosunu ve her kare icin sifirdan farkli morph agirliklarini JSON'a yazar
     (glTF exporter morph agirlik animasyonu YAZMAZ: GLTFBoneUtilities curve filtresi DisallowAll).

Girdi (MH_ARGS ile degistirilebilir, varsayilanlar Taro icin):
  face_mesh, mapping_anim, mapping_pose, out_folder (/Game/MediSim/...), lod, out_dir (disk).
Cikti:
  <out_folder>/AS_<name>_ARKitDriver, <out_folder>/AS_<name>_ARKitBaked, <out_folder>/LS_<name>_ARKitBake
  <out_dir>/<name>_arkit_frames.json

Calistirma (editor acik):
  python scripts/ue/ue_py.py -f scripts/ue/mh_bake_arkit.py
  # baska karakter:
  python scripts/ue/ue_py.py -c "MH_ARGS={'name':'Hasta','face_mesh':'/Game/MetaHumans/Hasta/Face/Hasta_FaceMesh'}; exec(open(r'scripts/ue/mh_bake_arkit.py',encoding='utf-8').read())"
"""
import json
import os
import time

import unreal

DEFAULTS = {
    "name": "Taro",
    "face_mesh": "/Game/MetaHumans/Taro/Face/Taro_FaceMesh",
    "mapping_anim": "/MetaHumanCharacter/Face/ARKit/AS_MetaHuman_ARKit_Mapping",
    "mapping_pose": "/MetaHumanCharacter/Face/ARKit/PA_MetaHuman_ARKit_Mapping",
    "out_folder": "/Game/MediSim/ARKitBake/Taro",
    "lod": 0,  # RigLogic/morph LOD'u: morph target verisi yalniz LOD0'da var
    "out_dir": r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src\metahuman\taro-test",
    "fps": 30,          # surucu/bake kare hizi (proje varsayilani 30 ile uyumlu olmali)
    "mapping_fps": 24,  # AS_MetaHuman_ARKit_Mapping kare hizi
}
ARGS = dict(DEFAULTS)
ARGS.update(globals().get("MH_ARGS", {}) or {})

AL = unreal.AnimationLibrary
EAL = unreal.EditorAssetLibrary
ASSET_TOOLS = unreal.AssetToolsHelpers.get_asset_tools()

# Standart ARKit 52 (Apple ARFaceAnchor.BlendShapeLocation sirasi)
ARKIT_52 = [
    "eyeBlinkLeft", "eyeLookDownLeft", "eyeLookInLeft", "eyeLookOutLeft", "eyeLookUpLeft", "eyeSquintLeft", "eyeWideLeft",
    "eyeBlinkRight", "eyeLookDownRight", "eyeLookInRight", "eyeLookOutRight", "eyeLookUpRight", "eyeSquintRight", "eyeWideRight",
    "jawForward", "jawLeft", "jawRight", "jawOpen",
    "mouthClose", "mouthFunnel", "mouthPucker", "mouthLeft", "mouthRight", "mouthSmileLeft", "mouthSmileRight",
    "mouthFrownLeft", "mouthFrownRight", "mouthDimpleLeft", "mouthDimpleRight", "mouthStretchLeft", "mouthStretchRight",
    "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthPressLeft", "mouthPressRight",
    "mouthLowerDownLeft", "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight",
    "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
    "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "noseSneerLeft", "noseSneerRight", "tongueOut",
]
LIPS_TOGETHER = ["ctrl_expressions_mouthlipstogetherul", "ctrl_expressions_mouthlipstogetherur",
                 "ctrl_expressions_mouthlipstogetherdl", "ctrl_expressions_mouthlipstogetherdr"]


def log(*a):
    print("[mh_bake]", *a)


def ensure_new(path, cls, factory):
    if EAL.does_asset_exist(path):
        EAL.delete_asset(path)
    folder, name = path.rsplit("/", 1)
    return ASSET_TOOLS.create_asset(name, folder, cls, factory)


def read_mapping():
    """Esleme animinden 53 anahtarli (kare 0..52) CTRL egrilerini okur."""
    src = unreal.load_asset(ARGS["mapping_anim"])
    pa = unreal.load_asset(ARGS["mapping_pose"])
    pose_names = [str(p) for p in pa.get_pose_names()]
    curves = {}
    skipped = []
    nkeys_ref = None
    for c in AL.get_animation_curve_names(src, unreal.RawCurveTrackTypes.RCT_FLOAT):
        c = str(c)
        if not c.lower().startswith("ctrl_"):
            continue  # onceden hesaplanmis morph/wrinkle egrileri: RigLogic yeniden uretir
        t, v = AL.get_float_keys(src, c)
        frames = [round(x * ARGS["mapping_fps"]) for x in t]
        if frames != list(range(len(frames))):
            skipped.append((c, len(frames)))  # duzensiz zamanli (sikistirilmis) egri: guvenilmez
            continue
        curves[c.lower()] = list(v)
        nkeys_ref = len(v)
    return pose_names, curves, skipped, nkeys_ref


def build_frames(pose_names, curves):
    """Kare listesi: [(etiket, {egri: deger})]."""
    base = {c: v[0] for c, v in curves.items()}
    frames = [("neutral", {})]
    table = []
    for i in range(1, 52):
        pn = pose_names[i]
        arkit = pn[0].lower() + pn[1:]
        vals = {}
        for c, v in curves.items():
            if c == "ctrl_riglogic_offon":
                continue
            d = v[i] - base[c]
            if abs(d) > 1e-4:
                vals[c] = max(0.0, min(1.0, d))
        frames.append((arkit, vals))
        table.append((i, pn, arkit, sorted(vals.items())))
    jaw = dict(frames[pose_names.index("JawOpen")][1])
    helper = dict(jaw)
    for c in LIPS_TOGETHER:
        helper[c] = 1.0
    frames.append(("_jawOpen_lipsTogether", helper))
    raw0 = {c: base[c] for c in curves if c != "ctrl_riglogic_offon" and abs(base[c]) > 1e-4}
    frames.append(("_raw_frame0", raw0))
    return frames, table


def make_driver(skeleton, frames, ctrl_names):
    fps = ARGS["fps"]
    path = "%s/AS_%s_ARKitDriver" % (ARGS["out_folder"], ARGS["name"])
    fac = unreal.AnimSequenceFactory()
    fac.set_editor_property("target_skeleton", skeleton)
    anim = ensure_new(path, unreal.AnimSequence, fac)
    ctl = anim.controller
    ctl.open_bracket(unreal.Text("driver"), True)
    ctl.set_frame_rate(unreal.FrameRate(fps, 1), True)
    ctl.set_number_of_frames(unreal.FrameNumber(len(frames) - 1), True)
    ctl.close_bracket(True)
    times = [i / float(fps) for i in range(len(frames))]
    ctl.open_bracket(unreal.Text("curves"), False)  # tek bracket: her egride yeniden sikistirma olmasin
    for c in ctrl_names + ["ctrl_riglogic_offon"]:
        vals = [1.0 if c == "ctrl_riglogic_offon" else f[1].get(c, 0.0) for f in frames]
        AL.add_curve(anim, c, unreal.RawCurveTrackTypes.RCT_FLOAT, False)
        AL.add_float_curve_keys(anim, c, times, vals)
    ctl.close_bracket(False)
    EAL.save_loaded_asset(anim)
    return anim


def bake(face, driver, nframes):
    fps = ARGS["fps"]
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    actor_sub = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actor_sub.spawn_actor_from_class(unreal.SkeletalMeshActor, unreal.Vector(0, 0, 0))
    actor.set_actor_label("MH_ARKitBake_tmp")
    comp = actor.skeletal_mesh_component
    comp.set_skinned_asset_and_update(face, True)
    comp.set_forced_lod(ARGS["lod"] + 1)  # 0 = otomatik, 1 = LOD0 ...

    ls_path = "%s/LS_%s_ARKitBake" % (ARGS["out_folder"], ARGS["name"])
    ls = ensure_new(ls_path, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    ls.set_display_rate(unreal.FrameRate(fps, 1))
    ls.set_playback_start(0)
    ls.set_playback_end(nframes)
    binding = ls.add_possessable(actor)
    track = binding.add_track(unreal.MovieSceneSkeletalAnimationTrack)
    sec = track.add_section()
    sec.set_range(0, nframes)
    params = sec.get_editor_property("params")
    params.set_editor_property("animation", driver)
    sec.set_editor_property("params", params)

    out_path = "%s/AS_%s_ARKitBaked" % (ARGS["out_folder"], ARGS["name"])
    fac = unreal.AnimSequenceFactory()
    fac.set_editor_property("target_skeleton", face.get_editor_property("skeleton"))
    out = ensure_new(out_path, unreal.AnimSequence, fac)

    opt = unreal.AnimSeqExportOption()
    opt.set_editor_property("export_transforms", True)
    opt.set_editor_property("export_morph_targets", True)
    opt.set_editor_property("export_attribute_curves", False)
    opt.set_editor_property("export_material_curves", False)
    opt.set_editor_property("record_in_world_space", False)
    opt.set_editor_property("evaluate_all_skeletal_mesh_components", False)
    opt.set_editor_property("skip_curves_with_zero_value", True)
    opt.set_editor_property("delay_before_start", unreal.FrameNumber(2))
    opt.set_editor_property("interpolation", unreal.AnimInterpolationType.STEP)
    opt.set_editor_property("curve_interpolation", unreal.RichCurveInterpMode.RCIM_CONSTANT)
    ok = unreal.SequencerTools.export_anim_sequence(world, ls, out, opt, binding, False)
    log("export_anim_sequence ->", ok)
    try:
        out.set_preview_skeletal_mesh(face)
    except Exception as e:  # yalniz glTF exporter icin kolaylik
        log("preview mesh atanamadi:", e)
    EAL.save_loaded_asset(out)
    EAL.save_loaded_asset(ls)
    actor_sub.destroy_actor(actor)
    return out


def dump_json(out_anim, frames, table, skipped):
    names = [str(c) for c in AL.get_animation_curve_names(out_anim, unreal.RawCurveTrackTypes.RCT_FLOAT)]
    nf = AL.get_num_frames(out_anim)
    fps = ARGS["fps"]
    per_frame = [dict() for _ in range(nf + 1)]
    for c in names:
        t, v = AL.get_float_keys(out_anim, c)
        # sabit ara degerleme: her kare icin son anahtar
        keys = sorted(zip([round(x * fps) for x in t], v))
        ki = 0
        cur = 0.0
        for f in range(nf + 1):
            while ki < len(keys) and keys[ki][0] <= f:
                cur = keys[ki][1]
                ki += 1
            if abs(cur) > 1e-5:
                per_frame[f][c] = cur
    tracks = [str(b) for b in AL.get_animation_track_names(out_anim)]
    data = {
        "source_face_mesh": ARGS["face_mesh"],
        "lod": ARGS["lod"],
        "fps": fps,
        "num_frames": nf + 1,
        "frame_labels": [f[0] for f in frames],
        "arkit_52": ARKIT_52,
        "arkit_frame": {lbl: i for i, (lbl, _) in enumerate(frames) if not lbl.startswith("_") and lbl != "neutral"},
        "mouthClose_recipe": {"plus": "_jawOpen_lipsTogether", "minus": "jawOpen"},
        "driver_controls": [{"frame": i, "pose": pn, "arkit": ak, "controls": ctrls} for i, pn, ak, ctrls in table],
        "skipped_irregular_ctrl_curves": skipped,
        "baked_bone_tracks": len(tracks),
        "baked_curve_names": names,
        "morph_weights": per_frame,
    }
    os.makedirs(ARGS["out_dir"], exist_ok=True)
    p = os.path.join(ARGS["out_dir"], "%s_arkit_frames.json" % ARGS["name"].lower())
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1)
    return p, names, tracks


def main():
    t0 = time.time()
    face = unreal.load_asset(ARGS["face_mesh"])
    if not face:
        raise RuntimeError("yuz mesh'i yok: " + ARGS["face_mesh"])
    pose_names, curves, skipped, nkeys = read_mapping()
    log("esleme: %d CTRL egrisi (%d anahtar), atlanan duzensiz: %s" % (len(curves), nkeys, skipped))
    frames, table = build_frames(pose_names, curves)
    for i, pn, ak, ctrls in table:
        log("kare %2d  %-20s -> %-20s %s" % (i, pn, ak, ", ".join("%s=%.2f" % (c.replace("ctrl_expressions_", ""), v) for c, v in ctrls)))
    ctrl_names = sorted(c for c in curves if c != "ctrl_riglogic_offon")
    driver = make_driver(face.get_editor_property("skeleton"), frames, ctrl_names)
    log("surucu anim:", driver.get_path_name(), "kare:", AL.get_num_frames(driver) + 1, "%.1fs" % (time.time() - t0))
    t1 = time.time()
    out = bake(face, driver, len(frames))
    log("bake bitti %.1fs" % (time.time() - t1))
    p, names, tracks = dump_json(out, frames, table, skipped)
    log("bake ciktisi: %d kemik izi, %d egri -> %s" % (len(tracks), len(names), p))
    log("toplam %.1fs" % (time.time() - t0))


main()
