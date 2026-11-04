# Bölge karoları (v0.58): her bölge için 3×3 sayfa — 1. satır basılan üst (sol / orta / sağ),
# 2. satır alt dolgu (sol / orta / sağ), 3. satır arka plan (3 çeşit). Kaynaklar assets/kaynak/bolge_*.png.
# Karolar 128×128'e getirilir (oran gerekirse bozulur), köşe boşlukları en yakın renkle doldurulur.
# assets/karo/tileset.png sıfırdan bu 27 karoyla kurulur, js/veri/assetlar.js → ASSETLER.tile / tileset güncellenir.
# Sonra: python3 araclar/zeminDose.py (seviyenin karo ızgaraları yeniden döşenir). Çalıştırma: python3 araclar/bolgeKaro.py
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
B, EX = 128, 2
BOLGE = {   # önek: dosya
    'p': 'bolge_tapinak.png',   # en üst: tapınak
    'c': 'bolge_orta.png',      # orta: yosunlu parke taş, koyu kaya arka plan
    'd': 'bolge_toprak.png',    # yeraltı: toprak ve kökler
}
ADLAR = ['TL', 'TM', 'TR', 'FL', 'FM', 'FR', 'B0', 'B1', 'B2']
def seg(v):
    s, inr = [], False
    for i, x in enumerate(v):
        if x and not inr: st, inr = i, True
        if not x and inr: s.append((st, i)); inr = False
    if inr: s.append((st, len(v)))
    return s
def doldur(arr, ust_bos):
    # şeffaf pikselleri en yakın opak pikselin rengiyle doldur (üst karolarda üstteki bitki boşlukları kalır)
    a = arr[:, :, 3] > 200
    _, (iy, ix) = ndimage.distance_transform_edt(~a, return_indices=True)
    out = arr[iy, ix].copy(); out[:, :, 3] = 255
    if ust_bos:
        h = arr.shape[0]; ust = int(h * 0.3)
        out[:ust] = np.where(arr[:ust, :, 3:4] > 200, out[:ust], 0)
        bit = arr[:ust, :, 3] > 200; out[:ust][bit] = arr[:ust][bit]; out[:ust][bit, 3] = 255
    return out
KOLON = 9
P = B + 2 * EX
ts = Image.new('RGBA', (KOLON * P, P), (0, 0, 0, 0))
NO = {}
for on, dosya in BOLGE.items():
    im = np.array(Image.open(KOK + '/assets/kaynak/' + dosya).convert('RGBA'))
    im[im[:, :, 3] < 200] = 0
    A = im[:, :, 3] > 200
    satir = [q for q in seg(A.sum(1) > 30)]; kolon = [q for q in seg(A.sum(0) > 30)]
    assert len(satir) == 3 and len(kolon) == 3, (dosya, satir, kolon)
    k = 0
    for ri, (y0, y1) in enumerate(satir):
        for (x0, x1) in kolon:
            parca = im[y0:y1, x0:x1]
            b = parca[:, :, 3] > 200; ys, xs = np.where(b.any(1))[0], np.where(b.any(0))[0]
            parca = parca[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
            # yuvarlak köşe kırpıntısı olmasın: kenarlardan 3 px içeri al
            parca = parca[3:-3, 3:-3] if ri else parca[:, 3:-3][:-3]
            t = np.array(Image.fromarray(parca).resize((B, B), Image.LANCZOS))
            t = doldur(t, ri == 0)
            ad = on + ADLAR[k]; k += 1
            i = len(NO); NO[ad] = i
            ox, oy = (i % KOLON) * P, (i // KOLON) * P
            if oy + P > ts.height:
                y = Image.new('RGBA', (ts.width, oy + P), (0, 0, 0, 0)); y.paste(ts, (0, 0)); ts = y
            timg = Image.fromarray(t)
            ts.paste((0, 0, 0, 0), (ox, oy, ox + P, oy + P))
            ts.paste(timg.resize((P, P), Image.NEAREST), (ox, oy))
            ts.paste(timg, (ox + EX, oy + EX))
ts.save(KOK + '/assets/karo/tileset.png', optimize=True)
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'"tile": \{.*?\},\n "tileset": \{.*?\}', lambda _: '"tile": ' + json.dumps(NO) + ',\n "tileset": '
           + json.dumps({'boyut': B, 'extrude': EX, 'kolon': KOLON}), s, count=1, flags=re.S)
open(ap, 'w', encoding='utf8').write(s)
print(len(NO), 'karo')
