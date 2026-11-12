# Kırılır taşlar (v0.58). Kaynak: assets/kaynak/kirilir_taslar.png — 10 satır × 5 (sağlam, çatlak 1, çatlak 2, kırılıyor, enkaz).
# Çıktı: assets/nesne/kirTas.png (5 sütun × 10 satır, hücre 128×128; ilk 4 kare karoya oturacak şekilde kareye getirilir,
# enkaz genişliğe sığdırılıp tabana oturtulur). Satır sırası: KIRTAS listesi (game.js ile aynı).
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
B = 128
KIRTAS = ['kasa', 'gri', 'koyu', 'kristal', 'toprak', 'kizil', 'tugla', 'kum', 'mor', 'yosun']
im = np.array(Image.open(KOK + '/assets/kaynak/kirilir_taslar.png').convert('RGBA')).astype(int)
r, g, b, a = [im[:, :, i] for i in range(4)]
hale = ((r > 200) & (g < 70) & (b < 70)) | ((r > 210) & (g > 210) & (b < 70)) | ((g > 200) & (r < 170) & (b < 90) & (g - r > 60))
aday = hale | (a < 60); dis = a < 10
for _ in range(14):
    yeni = ndimage.binary_dilation(dis) & aday & ~dis
    if not yeni.any(): break
    dis |= yeni
im[dis] = 0; im[im[:, :, 3] < 60] = 0
im = im.astype(np.uint8)
A = im[:, :, 3] > 200
def seg(v):
    s, inr = [], False
    for i, x in enumerate(v):
        if x and not inr: st, inr = i, True
        if not x and inr: s.append((st, i)); inr = False
    if inr: s.append((st, len(v)))
    return s
satir = seg(A.sum(1) > 30); kolon = seg(A.sum(0) > 30)
assert len(satir) == 10 and len(kolon) == 5, (len(satir), len(kolon))
out = Image.new('RGBA', (B * 5, B * 10), (0, 0, 0, 0))
for ri, (y0, y1) in enumerate(satir):
    for ci, (x0, x1) in enumerate(kolon):
        p = im[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6]
        m = p[:, :, 3] > 60
        if not m.any(): continue
        ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
        p = Image.fromarray(p[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1])
        if ci < 4: p = p.resize((B, B), Image.LANCZOS); ox, oy = 0, 0
        else:
            s = B / p.width; p = p.resize((B, max(1, round(p.height * s))), Image.LANCZOS); ox, oy = 0, B - p.height
        out.alpha_composite(p, (ci * B + ox, ri * B + oy))
out.save(KOK + '/assets/nesne/kirTas.png', optimize=True)
print('ok')
