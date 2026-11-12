# Zincirli deniz mayını (v1.58): kaynak/dmayin.gif (kare 0 bekleme, 1–7 patlama; altında kısa zincir) → nesne/dmayin.png
# (9 kare: 8. kare = top kopmuş, sadece zincir) ; dmayin_zincir.png → nesne/dmayinHalka.png (tekrarlanan bir halka boyu) ;
# dmayin_taban.png → nesne/dmayinTaban.png (zemindeki halka, kırpılmış) + ASSETLER.dmayin
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
g = Image.open(KOK + '/assets/kaynak/dmayin.gif')
kareler = [f.convert('RGBA') for f in ImageSequence.Iterator(g)]
W, H = g.size
a0 = np.array(kareler[0])
al = a0[:, :, 3]
en = (al > 0).sum(axis=1)
# topun bittiği satır: aşağıdan yukarı çıkarken zincirden (dar) topa (geniş) geçiş
ys = np.where(al.any(axis=1))[0]; alt = int(ys.max())
kes = next(y for y in range(alt, 0, -1) if en[y] > 60) + 1
xs = np.where(al[alt - 30:alt + 1] > 0)[1]; zx = float(xs.mean())          # zincir ekseni
zinEn = int(np.percentile((al[kes:alt] > 0).sum(axis=1), 90))
ust = int(ys.min())
govde = np.where(al[(ust + kes) // 2] > 0)[0]
sadeZincir = a0.copy(); sadeZincir[:kes] = 0
out = Image.new('RGBA', (W * 9, H))
for i, f in enumerate(kareler[:8] + [Image.fromarray(sadeZincir)]): out.alpha_composite(f, (i * W, 0))
out.save(KOK + '/assets/nesne/dmayin.png', optimize=True)

z = Image.open(KOK + '/assets/kaynak/dmayin_zincir.png').convert('RGBA')
za = np.array(z)[:, :, 3]
ys, xs = np.where(za > 20); zx0, zx1, zy0, zy1 = xs.min(), xs.max(), ys.min(), ys.max()
zen = (za > 20).sum(axis=1)
# dar noktalar (yan duran halkaların ortası): yerel en küçükler → halka boyu
dar = [y for y in range(zy0 + 20, zy1 - 10) if zen[y] <= 14 and zen[y] == zen[y - 6:y + 7].min()]
grup = [dar[0]]
for y in dar[1:]:
    if y - grup[-1] > 15: grup.append(y)
adim = grup[-1] - grup[-2]
PAY = 3   # üst üste binme
halka = z.crop((zx0 - 1, grup[-2] - PAY, zx1 + 2, grup[-1] + PAY)); halka.save(KOK + '/assets/nesne/dmayinHalka.png', optimize=True)
zk = zinEn / int(np.percentile(zen[zy0 + 10:zy1], 90))   # gif zinciri / ek zincir ölçeği

t = Image.open(KOK + '/assets/kaynak/dmayin_taban.png').convert('RGBA')
ta = np.array(t)
ys, xs = np.where(ta[:, :, 3] > 20); tx0, tx1, ty0, ty1 = xs.min(), xs.max(), ys.min(), ys.max()
mavi = (ta[:, :, 3] > 20) & (ta[:, :, 2].astype(int) > ta[:, :, 0].astype(int) + 15) & (ta[:, :, 2] > ta[:, :, 1])
hx = np.where(mavi[ty0 + 2:ty0 + 30])[1]; halkaX = float(hx.mean())
t.crop((tx0, ty0, tx1 + 1, ty1 + 1)).save(KOK + '/assets/nesne/dmayinTaban.png', optimize=True)
meta = {'w': W, 'h': H, 'ox': round(zx / W, 4), 'oy': round(alt / H, 4),            # top karesinin tutma noktası: zincirin alt ucu
        'merkez': round(alt - (ust + kes) / 2, 1), 'yaricap': round((govde.max() - govde.min()) / 2 * 0.92, 1),   # top ortası (uçtan yukarı) ve çarpma yarıçapı
        'ustZincir': int(alt - kes), 'zinEn': zinEn,
        'halka': {'w': halka.width, 'h': halka.height, 'adim': int(adim), 'pay': PAY, 'olcek': round(zk, 3)},
        'taban': {'w': int(tx1 - tx0 + 1), 'h': int(ty1 - ty0 + 1), 'halkaX': round(halkaX - tx0, 1)}}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Zincirli mayın[^\n]*\nASSETLER.dmayin = [^\n]*;\n', '\n', s)
s += '\n// Zincirli mayın (araclar/dmayinKes.py): top karesi + tutma noktası, top ortası / yarıçapı, ek halka (adım, ölçek), taban\nASSETLER.dmayin = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta, 'kes', kes, 'dar', grup)
