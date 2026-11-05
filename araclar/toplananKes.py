# Toplanabilir görsel kesici (v0.28). Kaynak: assets/kaynak/toplanan_seti.png (6 satır × 6 kare dönme döngüsü).
# Düşük alfalı renkli hale silinir, her kare eşit hücreye ortalanır → assets/nesne/toplanan.png (6 sütun),
# hücre boyu ve satır sırası js/veri/assetlar.js → ASSETLER.toplanan. Çalıştırma: python3 araclar/toplananKes.py
import json, re
import numpy as np
from PIL import Image
KOK = __file__.rsplit('/araclar/', 1)[0]
SIRA = ['elmas', 'buyukelmas', 'kizilelmas', 'kalp', 'capa', 'altin']
im = np.array(Image.open(KOK + '/assets/kaynak/toplanan_seti.png').convert('RGBA'))
im[im[:, :, 3] < 60] = 0
A = im[:, :, 3] > 150
def seg(v):
    s, inr = [], False
    for i, x in enumerate(v):
        if x and not inr: st, inr = i, True
        if not x and inr: s.append([st, i]); inr = False
    if inr: s.append([st, len(v)])
    return s
satirlar = seg(A.sum(1) > 2)
assert len(satirlar) == 6
kareler = []
for y0, y1 in satirlar:
    k = seg(A[y0:y1].sum(0) > 0)
    while len(k) > 6:
        gaps = [k[i + 1][0] - k[i][1] for i in range(len(k) - 1)]
        i = gaps.index(min(gaps)); k[i] = [k[i][0], k[i + 1][1]]; del k[i + 1]
    kareler.append([(y0, y1, x0, x1) for x0, x1 in k])
W = max(x1 - x0 for r in kareler for _, _, x0, x1 in r) + 8
H = max(y1 - y0 for r in kareler for y0, y1, _, _ in r) + 8
out = Image.new('RGBA', (W * 6, H * 6), (0, 0, 0, 0))
for r, satir in enumerate(kareler):
    for c, (y0, y1, x0, x1) in enumerate(satir):
        p = Image.fromarray(im[y0 - 4:y1 + 4, x0 - 4:x1 + 4])
        out.paste(p, (c * W + (W - p.width) // 2, r * H + (H - p.height) // 2))
out.save(KOK + '/assets/nesne/toplanan.png', optimize=True)
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Toplanabilirler.*?;\n', '\n', s, flags=re.S)
s += '// Toplanabilirler (araclar/toplananKes.py): hücre w×h, satır sırası (her satır 6 karelik dönme)\nASSETLER.toplanan = ' + json.dumps({'w': W, 'h': H, 'sira': SIRA}) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(W, H)
