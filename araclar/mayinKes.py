# Yüzme bölümü mayını (v1.57): kaynak/mayin.gif (ilk 8 kare kullanılır) + mayin_taban.png (8. kareden sonra yerde kalan)
# → nesne/mayin.png (9 kare: 0–7 açılış, 8 taban) ; kaynak/mayin_roket.png → nesne/mayinRoket.png (kırpılmış) + ASSETLER.mayin
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
g = Image.open(KOK + '/assets/kaynak/mayin.gif')
kareler = [f.convert('RGBA') for f in ImageSequence.Iterator(g)][:8]
W, H = g.size
taban = Image.open(KOK + '/assets/kaynak/mayin_taban.png').convert('RGBA')
# taban: kendi kutusunun sol alt köşesi gif'in son karesindeki (sadece taban kalmış) zeminin sol alt köşesine
son = np.array([f.convert('RGBA') for f in ImageSequence.Iterator(g)][-1])[:, :, 3]
ys, xs = np.where(son[200:] > 0); gx0, gy1 = xs.min(), ys.max() + 200
ta = np.array(taban)[:, :, 3]; ys, xs = np.where(ta > 20); tx0, tx1, ty1 = xs.min(), xs.max(), ys.max()
tk = Image.new('RGBA', (W, H)); tk.alpha_composite(taban, (int(gx0 - tx0), int(gy1 - ty1)))
out = Image.new('RGBA', (W * 9, H))
for i, f in enumerate(kareler + [tk]): out.alpha_composite(f, (i * W, 0))
out.save(KOK + '/assets/nesne/mayin.png', optimize=True)
# roket: 8. karedeki (fırlayan) gövdenin yerine oturur — üst ucu ve yatay ortası
k7 = np.array(kareler[7])[:, :, 3]
ys, xs = np.where(k7[:150] > 0); ux, uy = xs.mean(), ys.min()
r = Image.open(KOK + '/assets/kaynak/mayin_roket.png').convert('RGBA')
ra = np.array(r)[:, :, 3]; ys, xs = np.where(ra > 20)
kut = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
rk = r.crop(kut); rk.save(KOK + '/assets/nesne/mayinRoket.png', optimize=True)
ys2, xs2 = np.where(ra[kut[1]:kut[1] + 120, kut[0]:kut[2]] > 20)
govdeX = xs2.mean()   # kırpılmış roketin gövde ortası (alev hariç, üst kısım)
meta = {'w': W, 'h': H, 'kare': 8, 'zeminY': int(gy1), 'zeminEn': int(tx1 - tx0),
        'roket': {'w': rk.width, 'h': rk.height, 'x': round(float(ux - govdeX), 1), 'y': int(uy), 'govdeY': 0.33}}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Mayın[^\n]*\nASSETLER.mayin = [^\n]*;\n', '\n', s)
s += '\n// Mayın (araclar/mayinKes.py): hücre, açılış kare sayısı, zemin çizgisi (hücrede y), roketin hücredeki sol üst köşesi\nASSETLER.mayin = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
