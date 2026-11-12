# v1.47: örümcek yumurtası ve yavru örümcek (kullanıcı GIF'leri) → yatay şerit sprite sayfaları
#   assets/kaynak/yumurta.gif (12 kare: 0–3 bekleme, 4–11 çatlayıp açılma) → assets/dusman/yumurta.png
#   assets/kaynak/yavruOrumcek.gif (12 kare: 0–5 yürüme, 6–11 ısırma; sağa bakar) → assets/dusman/yavru.png
# Ölçüler js/veri/assetlar.js → ASSETLER.dusmanEk (BootSahnesi ASSETLER.dusman'a katar; dusmanKes.py yeniden çalışsa da silinmez)
# Çalıştırma: python3 araclar/yumurtaKes.py
import json, os, re
import numpy as np
from PIL import Image, ImageSequence
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IS = {'yumurta': ('yumurta.gif', 150, 44, {'bekle': [0, 1, 2, 3], 'acil': [4, 5, 6, 7, 8, 9, 10, 11], 'ol': [11]}),
      'yavru': ('yavruOrumcek.gif', 110, 22, {'yuru': [0, 1, 2, 3, 4, 5], 'saldir': [6, 7, 8, 9, 10, 11], 'ol': [0]})}
meta = {}
for ad, (dosya, hucreH, boy, anim) in IS.items():
    kareler = [np.array(k.convert('RGBA')) for k in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/' + dosya))]
    for k in kareler: k[..., 3] = np.where(k[..., 3] < 20, 0, k[..., 3])
    hepsi = np.zeros(kareler[0].shape[:2], bool)
    for k in kareler: hepsi |= k[..., 3] > 0
    ys = np.where(hepsi.any(1))[0]; xs = np.where(hepsi.any(0))[0]
    y0, y1, x0, x1 = ys[0], ys[-1] + 1, xs[0], xs[-1] + 1   # tüm kareler aynı kutudan: kareler arası kayma olmaz
    olc = hucreH / (y1 - y0)
    w = round((x1 - x0) * olc)
    serit = Image.new('RGBA', (w * len(kareler), hucreH))
    # gövdenin üstü (ilk karede) — görünür boy ölçeği için
    k0 = kareler[0][y0:y1, x0:x1, 3] > 0
    ust = int(np.where(k0.any(1))[0][0] * olc)
    for i, k in enumerate(kareler):
        g = Image.fromarray(k[y0:y1, x0:x1]).resize((w, hucreH), Image.LANCZOS)
        serit.paste(g, (i * w, 0))
    serit.save(KOK + '/assets/dusman/' + ad + '.png', optimize=True)
    meta[ad] = {'w': w, 'h': hucreH, 'ayak': hucreH, 'ust': ust, 'boy': boy, 'anim': anim}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Ek düşmanlar[^\n]*\nASSETLER.dusmanEk = [^\n]*;\n', '\n', s)
s += '\n// Ek düşmanlar (araclar/yumurtaKes.py): örümcek yumurtası, yavru örümcek\nASSETLER.dusmanEk = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
