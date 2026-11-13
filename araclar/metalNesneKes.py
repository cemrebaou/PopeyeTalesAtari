# 4. bölüm (metal tema) nesneleri (v1.73): kaynak/metal_nesne.png (saydam zemin, 4 sıra, 17 nesne) → nesne/<ad>_metal.png
# + ASSETLER.metalNesne (w, h, ox = taban ortası). Sıra AD listesindeki gibi (okuma sırası). Oyun, bölümde `tema: 'metal'`
# varsa aynı adlı görselin yerine bunu kullanır (OyunSahnesi.tema). Kenarlardaki yarı saydam kırmızı hale atılır.
# Diken şeridinin ortasından 3 diken alınır (yan yana döşenir); zincir sıkı kırpılır (alt alta döşenir).
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
AD = ['kapi', 'kapiAcik', 'dukkanKapi', 'dukkanKapiAcik',
      'kilitKapi', 'kilitKapiAcik', 'patron1Kapi', 'patron1KapiAcik',
      'gizliKapi', 'gizliKapiAcik', 'bayrak0', 'bayrak1',
      'sandik', 'sandikAcik', 'anahtar', 'diken', 'zincir']
im = np.array(Image.open(KOK + '/assets/kaynak/metal_nesne.png').convert('RGBA'))
r, g, b, a = [im[:, :, i].astype(int) for i in range(4)]
hale = (a < 250) & (r > 150) & (g < 90) & (b < 90)          # kırmızı hale
im[(a < 140) | hale] = 0
dolu = im[:, :, 3] > 0
lab, n = ndimage.label(ndimage.binary_dilation(dolu, np.ones((9, 9))))
boy = ndimage.sum(dolu, lab, range(1, n + 1))
sec = [i + 1 for i in np.argsort(-boy)[:len(AD)]]
kutu = ndimage.find_objects(lab)
sec.sort(key=lambda i: kutu[i - 1][0].stop)
sira, grup = [], [sec[0]]
for i in sec[1:]:                                             # sıralar: alt kenarı yakın olanlar
    if kutu[i - 1][0].stop - kutu[grup[-1] - 1][0].stop > 60: sira.append(grup); grup = []
    grup.append(i)
sira.append(grup)
assert [len(s) for s in sira] == [4, 4, 4, 5], [len(s) for s in sira]
duz = [i for s in sira for i in sorted(s, key=lambda i: kutu[i - 1][1].start)]
meta = {}
for ad, i in zip(AD, duz):
    s = kutu[i - 1]
    k = im[s].copy(); k[lab[s] != i] = 0
    ys, xs = np.where(k[:, :, 3] > 0)
    k = k[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    if ad == 'diken':                                         # ortadaki 3 diken: tepe profilindeki çukurlardan kes
        ust = np.array([np.argmax(k[:, x, 3] > 0) for x in range(k.shape[1])])
        tepe = [x for x in range(8, len(ust) - 8) if ust[x] == ust[x - 8:x + 9].min() and ust[x] < k.shape[0] * 0.3]
        tepeler = [t[len(t) // 2] for t in np.split(tepe, np.where(np.diff(tepe) > 6)[0] + 1)]
        assert len(tepeler) == 6, tepeler
        adim = (tepeler[-1] - tepeler[0]) / 5
        x0 = round(tepeler[1] - adim / 2); k = k[:, x0:x0 + round(adim * 3)]
    h, w = k.shape[:2]
    alt = np.where(k[int(h * 0.94):, :, 3].any(0))[0]
    meta[ad] = {'w': w, 'h': h, 'ox': round(float((alt.min() + alt.max() + 1) / 2 / w), 3)}
    Image.fromarray(k).save(KOK + '/assets/nesne/' + ad + '_metal.png', optimize=True)
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Metal tema nesneleri[^\n]*\nASSETLER.metalNesne = [^\n]*;\n', '\n', s)
s += '\n// Metal tema nesneleri (araclar/metalNesneKes.py): 4. bölümde aynı adlı görselin yerine — w×h, ox = taban ortası\nASSETLER.metalNesne = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
