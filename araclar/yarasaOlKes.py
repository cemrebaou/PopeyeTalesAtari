# v0.98: yarasa ölüm animasyonu (assets/kaynak/yarasa_ol.gif, 9 kare) → assets/dusman/yarasaOl.png (yatay şerit)
# Ölçek: GIF'in ilk karesindeki (uçan) yarasa genişliği = yarasa.png uçma karesinin genişliği → oyunda aynı s ile çizilir.
# Kareler: 0–3 havada vurulma, 3 düşerken, 4 yere yaklaşınca, 5–8 yerde. ayak = yerdeki karelerin alt çizgisi, merkez = 0. karenin gövde ortası.
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
yar = Image.open(KOK + '/assets/dusman/yarasa.png'); _m = re.search(r'"yarasa": \{"w": (\d+), "h": (\d+)', open(KOK + '/js/veri/assetlar.js').read())
YW = int(_m.group(1)); b = yar.crop((0, 0, YW, yar.height)).getbbox(); yarasaG = b[2] - b[0]
fr = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/yarasa_ol.gif'))]
g0 = fr[0].getbbox(); r = yarasaG / (g0[2] - g0[0])
W, H = round(fr[0].width * r), round(fr[0].height * r)
serit = Image.new('RGBA', (W * len(fr), H))
for i, f in enumerate(fr):
    a = np.array(f.resize((W, H), Image.LANCZOS)); a[a[:, :, 3] < 30] = 0
    serit.paste(Image.fromarray(a), (i * W, 0))
serit.save(KOK + '/assets/dusman/yarasaOl.png', optimize=True)
ayak = round(np.median([f.getbbox()[3] for f in fr[6:]]) * r)   # yerdeki karelerin alt kenarı (toz hariç)
meta = {'w': W, 'h': H, 'ayak': int(ayak), 'merkez': round((g0[1] + g0[3]) / 2 * r), 'kare': len(fr)}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Yarasa ölüm[^\n]*\nASSETLER.yarasaOl = [^\n]*;\n', '\n', s)
s += '\n// Yarasa ölüm şeridi (araclar/yarasaOlKes.py): hücre, yer çizgisi, uçarkenki gövde ortası (yarasa.png ölçeğinde)\nASSETLER.yarasaOl = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta, r)
