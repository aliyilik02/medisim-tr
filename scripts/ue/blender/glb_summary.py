# -*- coding: utf-8 -*-
"""GLB ozet araci (Blender gerektirmez, saf Python).

Amac: bir GLB'nin JSON bolumunden hizli olcum: mesh/primitive, morph target sayisi + adlari,
skin eklem sayisi, animasyon kanal/kare sayisi, malzeme/doku sayisi.
Kullanim: python scripts/ue/blender/glb_summary.py dosya.glb [--names]
"""
import json
import struct
import sys


def read_glb_json(path):
    with open(path, "rb") as fh:
        magic, ver, length = struct.unpack("<III", fh.read(12))
        if magic != 0x46546C67:
            raise ValueError("GLB degil")
        clen, ctype = struct.unpack("<II", fh.read(8))
        return json.loads(fh.read(clen).decode("utf-8"))


def main():
    path = sys.argv[1]
    g = read_glb_json(path)
    acc = g.get("accessors", [])
    print("file:", path)
    for mi, m in enumerate(g.get("meshes", [])):
        tris = 0
        for p in m["primitives"]:
            if "indices" in p:
                tris += acc[p["indices"]]["count"] // 3
        nt = len(m["primitives"][0].get("targets", []))
        names = (m.get("extras") or {}).get("targetNames", [])
        print("mesh %d %s prims=%d tris=%d morph_targets=%d targetNames=%d" % (mi, m.get("name"), len(m["primitives"]), tris, nt, len(names)))
        if "--names" in sys.argv and names:
            print("  names:", ", ".join(names))
    for si, s in enumerate(g.get("skins", [])):
        print("skin %d joints=%d" % (si, len(s["joints"])))
    for ai, a in enumerate(g.get("animations", [])):
        mx = 0
        for smp in a["samplers"]:
            mx = max(mx, acc[smp["input"]]["count"])
        paths = sorted(set(c["target"]["path"] for c in a["channels"]))
        print("anim %d %s channels=%d max_keys=%d paths=%s" % (ai, a.get("name"), len(a["channels"]), mx, paths))
    print("nodes=%d materials=%d textures=%d images=%d" % (len(g.get("nodes", [])), len(g.get("materials", [])), len(g.get("textures", [])), len(g.get("images", []))))


if __name__ == "__main__":
    main()
