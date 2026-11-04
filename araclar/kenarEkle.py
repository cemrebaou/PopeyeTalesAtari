# Zemin yan bitiş karoları (v0.42): assets/kaynak/kenar_tas.png (üstte sağ bitiş, altta sol bitiş)
# → assets/tileset.png'deki boş yuvalara (114 sKR, 115 sKL) eklenir, assetlar.js 'tile' güncellenir.
# Çalıştırma: python3 araclar/kenarEkle.py  (karoUret.py yeniden çalıştırılırsa bundan sonra tekrar çalıştır)
import json, re
from PIL import Image
KOK = __file__.rsplit('/araclar/', 1)[0]
B, EX = 128, 2
src = Image.open(KOK + '/assets/kaynak/kenar_tas.png').convert('RGBA')
ts = Image.open(KOK + '/assets/tileset.png').convert('RGBA')
ap = KOK + '/assetlar.js'
s = open(ap, encoding='utf8').read()
m = re.search(r'"tile": (\{.*?\})', s, re.S); NO = json.loads(m.group(1))
KOLON = json.loads(re.search(r'"tileset": (\{.*?\})', s, re.S).group(1))['kolon']
P = B + 2 * EX
for ad, kutu in [('sKR', (12, 12, 135, 139)), ('sKL', (11, 162, 133, 289))]:
    im = src.crop(kutu).resize((B, B), Image.LANCZOS)
    i = NO.get(ad, max(NO.values()) + 1); NO[ad] = i
    ox, oy = (i % KOLON) * P, (i // KOLON) * P
    if oy + P > ts.height:
        yeni = Image.new('RGBA', (ts.width, oy + P), (0, 0, 0, 0)); yeni.paste(ts, (0, 0)); ts = yeni
    ts.paste(im.resize((P, P), Image.NEAREST), (ox, oy))
    ts.paste(im, (ox + EX, oy + EX))
ts.save(KOK + '/assets/tileset.png', optimize=True)
s = s[:m.start(1)] + json.dumps(NO, indent=1).replace('\n', '\n ') + s[m.end(1):]
open(ap, 'w', encoding='utf8').write(s)
print(NO['sKR'], NO['sKL'])
