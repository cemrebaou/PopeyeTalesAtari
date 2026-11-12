# v1.35: assets/kaynak/nesne2.png (kapılar, anahtar, kontrol bayrağı, tabela, ok balonu, gizli simgesi, çetele simgeleri)
# → assets/nesne/<ad>.png ve js/veri/assetlar.js → ASSETLER.nesne2 {ad: {w, h, ox}} (ox: alt kenardaki gövde ortası / w, origin x için)
# Çalıştırma: python3 araclar/nesne2Kes.py
import json, re, os
import numpy as np
from PIL import Image
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(KOK + '/assets/kaynak/nesne2.png').convert('RGBA')
A = np.array(im)
SATIR = [(40, 453, ['dukkanKapi', 'dukkanKapiAcik', 'kilitKapi', 'kilitKapiAcik']),
         (486, 875, ['anahtar', 'bayrak0', 'bayrak1', 'tabelaDirek', 'okBalon', 'gizliIkon']),
         (946, 1055, ['ikonSandik', 'ikonAnahtar', 'ikonMavi', 'ikonKizil', 'ikonTas'])]
ENBUY = 256
meta = {}
def seg(v, en=15):
    out, s = [], None
    for i, x in enumerate(list(v) + [0]):
        if x > 2 and s is None: s = i
        elif x <= 2 and s is not None:
            if i - s > en: out.append((s, i))
            s = None
    return out
for y0, y1, adlar in SATIR:
    band = A[y0:y1].copy()
    band[..., 3] = np.where(band[..., 3] < 60, 0, band[..., 3])   # yarı saydam hale kırpıntılarını sil
    xs = seg((band[..., 3] > 40).sum(0))
    assert len(xs) == len(adlar), (adlar, xs)
    for (x0, x1), ad in zip(xs, adlar):
        p = band[:, x0:x1]
        m = p[..., 3] > 40
        ys = np.where(m.any(1))[0]; cs = np.where(m.any(0))[0]
        p = p[ys[0]:ys[-1] + 1, cs[0]:cs[-1] + 1]
        m = p[..., 3] > 40
        alt = np.where(m[-max(4, len(m) // 12):].any(0))[0]   # alt şerit: kaide / zemin teması
        ox = (alt[0] + alt[-1]) / 2 / p.shape[1]
        g = Image.fromarray(p)
        s = min(1, ENBUY / max(g.size))
        if s < 1: g = g.resize((round(g.width * s), round(g.height * s)), Image.LANCZOS)
        g.save(KOK + '/assets/nesne/' + ad + '.png', optimize=True)
        meta[ad] = {'w': g.width, 'h': g.height, 'ox': round(ox, 3)}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Nesne2.*?;\n', '\n', s, flags=re.S)
s += '// Nesne2 (araclar/nesne2Kes.py): kapılar, anahtar, kontrol bayrağı, tabela, ok balonu, simgeler — w×h, ox = origin x\nASSETLER.nesne2 = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
