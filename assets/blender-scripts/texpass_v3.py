# ============================================================
# texpass_v3 — Hasta v3 doku geçişi (Blender python + numpy)
# ============================================================
# Kullanım:
#   blender -b --python texpass_v3.py -- <inject.glb> <skin.png> <hair.png> <gown.png> <brow.png> <out_dir>
# Çıktılar (out_dir): skin_base.png · skin_normal.png · hair_gray.png · gown_hospital.png
#
# 1. Dikiş çizgisi: MakeHuman cilt dokusunda UV ada KENARLARI koyu boyanmış
#    (boyunda görünen koyu halka). Gövde UV'si rasterize edilir; ada kenarından
#    RING_PX içerisi, içeriden normalize-konvolüsyonla doldurulur; ada dışı da
#    doldurulur (mip taşması da biter).
# 2. Normal haritası: cilt parlaklığının yüksek-geçiren bileşeni = yükseklik
#    (gözenek, kırışıklık boyalı ayrıntı) → OpenGL/glTF (+Y) teğet normal.
#    Kaynak dokudan TÜRETİLMİŞ — yeni lisans girdisi yok (CC0 üstüne).
# 3. Saç: 62 yaş — kırlaştırma (desatüre + aydınlat, alfa korunur).
# 4. Önlük: antik tunik deseni → açık mavi-gri hastane önlüğü (kumaş kıvrım
#    ayrıntısı parlaklıktan korunur, çizgiler bastırılır).
# ============================================================
import bpy, sys, os
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
argv = sys.argv[sys.argv.index("--") + 1:]
GLB, SKIN, HAIR, GOWN, BROW, OUT = argv
os.makedirs(OUT, exist_ok=True)
RING_PX = 12

bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4), img


def save(arr, name, like):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.colorspace_settings.name = "Non-Color" if "normal" in name else "sRGB"
    img.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    img.filepath_raw = os.path.join(OUT, name + ".png")
    img.file_format = "PNG"
    img.save()
    print("YAZILDI:", img.filepath_raw, arr.shape)


def box_blur(a, r):
    """Ayrılabilir kutu bulanıklığı (kenar tekrar), 2 geçiş ≈ gauss."""
    for _ in range(2):
        for axis in (0, 1):
            pad = [(0, 0)] * a.ndim
            pad[axis] = (r + 1, r)
            p = np.pad(a, pad, mode="edge")
            c = np.cumsum(p, axis=axis)
            hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
            lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
            a = (hi - lo) / (2 * r + 1)
    return a


def erode(mask, r):
    m = mask.copy()
    for _ in range(r):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    return m


def norm_fill(img, valid, r):
    """valid=False piksellerini geçerli komşuların ağırlıklı ortalamasıyla doldur."""
    v = valid.astype(np.float32)[..., None]
    num = box_blur(img[..., :3] * v, r)
    den = box_blur(v, r)
    filled = num / np.maximum(den, 1e-6)
    # den çok küçükse (uzak arka plan) bir tur daha geniş
    far = den[..., 0] < 0.02
    if far.any():
        num2 = box_blur(img[..., :3] * v, r * 6)
        den2 = box_blur(v, r * 6)
        filled[far] = (num2 / np.maximum(den2, 1e-6))[far]
    return filled


# ── gövde UV'si → ada maskesi ──
bpy.ops.import_scene.gltf(filepath=GLB)
body = next(o for o in bpy.data.objects if o.name.startswith("PatientBody"))
me = body.data
me.calc_loop_triangles()
uv = np.array([d.uv[:] for d in me.uv_layers.active.data], dtype=np.float32)

skin, _ = load(SKIN)
H, W = skin.shape[:2]
mask = np.zeros((H, W), dtype=bool)
head_mask = np.zeros((H, W), dtype=bool)  # boyun üstü (yN>0.86) üçgenler: kafa derisi + sakal bölgesi
zs = np.array([v.co.z for v in me.vertices])
z0, z1 = zs.min(), zs.max()
for tri in me.loop_triangles:
    p = uv[list(tri.loops)] * np.array([W, H], dtype=np.float32)
    x0, y0 = np.floor(p.min(0)).astype(int)
    x1, y1 = np.ceil(p.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, W - 1), min(y1, H - 1)
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx, cy) = p
    d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(d) < 1e-9:
        continue
    l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
    l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
    l3 = 1 - l1 - l2
    inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
    mask[y0:y1 + 1, x0:x1 + 1] |= inside
    if min((zs[v] - z0) / (z1 - z0) for v in tri.vertices) > 0.86:
        head_mask[y0:y1 + 1, x0:x1 + 1] |= inside
print("UV maske kapsama:", round(mask.mean() * 100, 1), "%")

inner = erode(mask, RING_PX)
fill = norm_fill(skin, inner, RING_PX)
out = skin.copy()
replace = ~inner
out[replace, :3] = fill[replace]
out[..., 3] = 1.0

# ── 62 yaş: kafa derisi + sakal gölgesi kırlaştırma ──
# Dokuda kafa derisi koyu kahve boyalı → kır saç mesh'inin kenarında sert
# sınır. Kafa bölgesinde, cilt medyanından KOYU pikseller (saç/sakal izi)
# kır griye çekilir; cilt (aydınlık) dokunulmaz.
hl_ = 0.299 * out[..., 0] + 0.587 * out[..., 1] + 0.114 * out[..., 2]
hm = head_mask & inner
l_skin = float(np.median(hl_[hm])) if hm.any() else 0.6
hairness = np.clip((l_skin - hl_) / (l_skin * 0.45), 0, 1) * hm
hairness = box_blur(hairness[..., None].astype(np.float32), 2)[..., 0]
gv = np.clip(hl_ * 1.55 + 0.12, 0, 1)
grayc = np.stack([gv * 0.97, gv * 0.95, gv * 0.93], -1)
k = (hairness * 0.8)[..., None]
out[..., :3] = out[..., :3] * (1 - k) + grayc * k
print("kafa bölgesi piksel:", int(hm.sum()), "kırlaştırılan ort.:", round(float(hairness[hm].mean()), 3))
save(out, "skin_base", skin)

# ── normal haritası (yüksek-geçiren parlaklık → yükseklik) ──
lum = 0.299 * out[..., 0] + 0.587 * out[..., 1] + 0.114 * out[..., 2]
hp = lum - box_blur(lum[..., None], 5)[..., 0]
# Ada kenarında yumuşak sönüm (sert maske gradyanı boyunda çizgi üretiyordu)
fade = box_blur(erode(mask, RING_PX + 6).astype(np.float32)[..., None], 6)[..., 0]
hp = hp * fade
STRENGTH = 4.5
gy, gx = np.gradient(hp)
nx, ny, nz = -gx * STRENGTH * 6, -gy * STRENGTH * 6, np.ones_like(hp)
ln = np.sqrt(nx * nx + ny * ny + nz * nz)
nrm = np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5, np.ones_like(hp)], -1)
print("normal sapma ort. (derece):", round(float(np.degrees(np.arccos(np.clip(nz / ln, -1, 1))).mean()), 2))
save(nrm, "skin_normal", skin)

# ── saç: kırlaştır ──
hair, _ = load(HAIR)
hl = 0.299 * hair[..., 0] + 0.587 * hair[..., 1] + 0.114 * hair[..., 2]
g = np.clip(0.30 + hl * 1.9, 0, 1)  # koyu tel → orta gri, açık tel → kır
gray = np.stack([g * 0.97, g * 0.95, g * 0.93], -1)
hair_out = hair.copy()
hair_out[..., :3] = gray
save(hair_out, "hair_gray", hair)

# ── kaş: kırlaştır (alfa korunur) ──
brow, _ = load(BROW)
bl = 0.299 * brow[..., 0] + 0.587 * brow[..., 1] + 0.114 * brow[..., 2]
bg = np.clip(0.38 + bl * 1.4, 0, 1)
brow_out = brow.copy()
brow_out[..., :3] = np.stack([bg * 0.95, bg * 0.92, bg * 0.88], -1)
save(brow_out, "brow_gray", brow)

# ── önlük: hastane mavisi ──
gown, _ = load(GOWN)
gl = 0.299 * gown[..., 0] + 0.587 * gown[..., 1] + 0.114 * gown[..., 2]
ref = np.median(gl[gown[..., 3] > 0.5]) if (gown[..., 3] > 0.5).any() else gl.mean()
detail = np.clip(gl / max(ref, 1e-3), 0.82, 1.12)  # çizgiler (koyu) bastırılır
detail = box_blur(detail[..., None], 1)[..., 0]
base = np.array([0.58, 0.69, 0.78], dtype=np.float32)
gown_out = gown.copy()
gown_out[..., :3] = base[None, None, :] * detail[..., None]
save(gown_out, "gown_hospital", gown)
