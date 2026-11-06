# v0.99: zehirli çiçek (bitki) ölüm animasyonu (assets/kaynak/bitki_ol.gif, 12 kare) → assets/dusman/bitkiOl.png (yatay şerit)
# Ölçek: GIF'in ilk karesindeki çiçek genişliği = bitki.png ilk karesinin genişliği → oyunda aynı s ile çizilir.
# ayak = ilk karenin alt kenarı (bitki.png'deki ayak çizgisiyle eşlenir).
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
_m = re.search(r'"bitki": \{"w": (\d+), "h": (\d+), "ayak": (\d+)', open(KOK + '/js/veri/assetlar.js').read())
BW, BH, BA = int(_m.group(1)), int(_m.group(2)), int(_m.group(3))
b = Image.open(KOK + '/assets/dusman/bitki.png').crop((0, 0, BW, BH)).getbbox(); bitkiG = b[2] - b[0]
fr = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/bitki_ol.gif'))]
g0 = fr[0].getbbox(); r = bitkiG / (g0[2] - g0[0])
W, H = round(fr[0].width * r), round(fr[0].height * r)
serit = Image.new('RGBA', (W * len(fr), H))
for i, f in enumerate(fr):
    a = np.array(f.resize((W, H), Image.LANCZOS)); a[a[:, :, 3] < 30] = 0
    serit.paste(Image.fromarray(a), (i * W, 0))
serit.save(KOK + '/assets/dusman/bitkiOl.png', optimize=True)
meta = {'w': W, 'h': H, 'ayak': round(g0[3] * r), 'kare': len(fr)}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Bitki ölüm[^\n]*\nASSETLER.bitkiOl = [^\n]*;\n', '\n', s)
s += '\n// Bitki ölüm şeridi (araclar/bitkiOlKes.py): hücre, ayak çizgisi (bitki.png ölçeğinde)\nASSETLER.bitkiOl = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta, r)
