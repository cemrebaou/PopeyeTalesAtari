# v1.08: dükkan odası görselleri.
#  kaynak/dukkan_karolar.png → assets/dukkan/<ad>.png (7 parça: zemin sol/orta/sağ, duvar sol/orta/sağ, tavan), 128 px genişlik
#  kaynak/satici_*.gif      → assets/dukkan/satici.png (ızgara); market her karede aynı boyda ve aynı yerde (kayma olmasın)
# Meta: ASSETLER.dukkan = {parca: {ad: {w, h, ust}}, satici: {w, h, kare}}  (ust: zemin parçalarında taş gövdenin başladığı satır)
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
a = np.array(Image.open(KOK + '/assets/kaynak/dukkan_karolar.png').convert('RGBA')); a[a[:, :, 3] < 40] = 0
PARCA = {   # ad: (x0, x1, y0, y1, taş gövde başı) — kaynak pikseli
    'zeminSol': (176, 539, 11, 367, 40), 'zeminOrta': (551, 902, 11, 367, 44), 'zeminSag': (915, 1273, 11, 367, 40),
    'duvarSol': (176, 539, 382, 706, 0), 'duvarOrta': (551, 902, 382, 706, 0), 'duvarSag': (915, 1273, 382, 706, 0),
    'tavan': (546, 902, 722, 1072, 0),
}
meta = {'parca': {}}
for ad, (x0, x1, y0, y1, ust) in PARCA.items():
    p = a[y0:y1, x0:x1]; ys, xs = np.where(p[:, :, 3] > 0); p = p[:, xs.min():xs.max() + 1]
    r = 128 / p.shape[1]; im = Image.fromarray(p).resize((128, round(p.shape[0] * r)), Image.LANCZOS)
    im.save(KOK + '/assets/dukkan/' + ad + '.png', optimize=True)
    meta['parca'][ad] = {'w': im.width, 'h': im.height, 'ust': round(ust * r)}
# v1.09: satıcı 5 GIF'ten tek ızgara (8 sütun). Her GIF'in tüm karelerinin kapladığı alan (market) aynı en × boya
# getirilir; her karede taban (alttaki %8'lik şerit) yatayda ortalanıp aynı noktaya, alt kenar aynı satıra oturtulur.
SATICI = [('bekle', 'satici_bekle.gif'), ('nadir1', 'satici_nadir1.gif'), ('basparmak', 'satici_basparmak.gif'),
          ('para', 'satici_para.gif'), ('nadir2', 'satici_nadir2.gif')]
HW, HH, CW, CH, SUT = 210, 210, 232, 222, 8   # içerik en/boy, hücre, sütun
ALT, ORTA = CH - 4, CW // 2
kareler, anim = [], {}
for ad, gif in SATICI:
    im = Image.open(KOK + '/assets/kaynak/' + gif); fr, sure = [], []
    for f in ImageSequence.Iterator(im):
        a = np.array(f.convert('RGBA')); a[a[:, :, 3] < 40] = 0; fr.append(a); sure.append(f.info.get('duration', 100))
    m = np.any([f[:, :, 3] > 0 for f in fr], axis=0); ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sx, sy = HW / (x1 - x0), HH / (y1 - y0)
    bas = len(kareler)
    for a in fr:
        k = Image.fromarray(a[y0:y1, x0:x1]).resize((HW, HH), Image.LANCZOS); ka = np.array(k)
        yy, xx = np.where(ka[:, :, 3] > 40); alt = yy.max(); taban = xx[yy >= alt - HH * 0.08]
        tc = (taban.min() + taban.max()) / 2
        c = Image.new('RGBA', (CW, CH)); c.paste(k, (round(ORTA - tc), ALT - alt)); kareler.append(c)
    anim[ad] = {'kareler': list(range(bas, len(kareler))), 'sure': sure}
SAT = -(-len(kareler) // SUT)
serit = Image.new('RGBA', (CW * SUT, CH * SAT))
for i, c in enumerate(kareler): serit.paste(c, ((i % SUT) * CW, (i // SUT) * CH))
serit.save(KOK + '/assets/dukkan/satici.png', optimize=True)
meta['satici'] = {'w': CW, 'h': CH, 'alt': ALT, 'icerikY': HH, 'anim': anim}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Dükkan[^\n]*\nASSETLER.dukkan = [^\n]*;\n', '\n', s)
s += '\n// Dükkan odası (araclar/dukkanUret.py)\nASSETLER.dukkan = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta)
