# v1.08: dükkan odası görselleri.
#  kaynak/dukkan_karolar.png → assets/dukkan/<ad>.png (7 parça: zemin sol/orta/sağ, duvar sol/orta/sağ, tavan), 128 px genişlik
#  kaynak/dukkan_satici.gif  → assets/dukkan/satici.png (yatay şerit); tüm karelerin alt kenarı aynı satıra sabitlenir (kayma olmasın)
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
fr = [np.array(f.convert('RGBA')) for f in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/dukkan_satici.gif'))]
alt = [np.where(f[:, :, 3] > 0)[0].max() for f in fr]; A = max(alt)
W, H = fr[0].shape[1], fr[0].shape[0]
serit = Image.new('RGBA', (W * len(fr), H))
for i, f in enumerate(fr):
    k = np.zeros_like(f); d = A - alt[i]; k[d:] = f[:H - d] if d else f   # alt kenar A satırına
    serit.paste(Image.fromarray(k), (i * W, 0))
serit.save(KOK + '/assets/dukkan/satici.png', optimize=True)
meta['satici'] = {'w': W, 'h': H, 'alt': int(A), 'kare': len(fr)}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Dükkan[^\n]*\nASSETLER.dukkan = [^\n]*;\n', '\n', s)
s += '\n// Dükkan odası (araclar/dukkanUret.py)\nASSETLER.dukkan = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta)
