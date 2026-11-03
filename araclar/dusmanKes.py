# Düşman sprite sayfası kesici (v0.24). Kaynak: assets/kaynak/dusman_seti.png (kullanıcı görseli).
# Kenardaki renkli haleyi (kırmızı/sarı/yeşil/mor) dışarıdan temizler, her düşmanı kendi sayfasına keser:
# assets/d_<ad>.png (yatay şerit, eşit hücre), mermiler assets/atesTopu.png, assets/mizrak.png,
# ölçüler assetlar.js → ASSETLER.dusman. Çalıştırma: python3 araclar/dusmanKes.py
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
im = np.array(Image.open(KOK + '/assets/kaynak/dusman_seti.png').convert('RGBA')).astype(int)
r, g, b, a = [im[:, :, i] for i in range(4)]
hale = ((r > 200) & (g < 70) & (b < 70)) | ((r > 210) & (g > 210) & (b < 70)) | \
       ((g > 200) & (r < 170) & (b < 90) & (g - r > 60)) | ((r > 200) & (b > 200) & (g < 80))
aday = hale | (a < 40)
dis = a < 10
for _ in range(12):
    yeni = ndimage.binary_dilation(dis) & aday & ~dis
    if not yeni.any(): break
    dis |= yeni
im[dis] = 0
im = im.astype(np.uint8)
A = im[:, :, 3] > 60

def parcalar(y0, y1, bol=()):
    col = A[y0:y1].sum(0)
    seg, inr = [], False
    for x, v in enumerate(col > 0):
        if v and not inr: s, inr = x, True
        if not v and inr: seg.append([s, x]); inr = False
    if inr: seg.append([s, len(col)])
    seg = [s for s in seg if A[y0:y1, s[0]:s[1]].sum() > 40]
    for i in sorted(bol, reverse=True):   # iki kare birleşik: en ince sütundan böl
        s0, s1 = seg[i]; m = s0 + (s1 - s0) // 4 + int(np.argmin(col[s0 + (s1 - s0) // 4: s1 - (s1 - s0) // 4]))
        seg[i:i + 1] = [[s0, m], [m, s1]]
    return seg

def birlestir(seg, n):
    while len(seg) > n:
        gaps = [seg[i + 1][0] - seg[i][1] for i in range(len(seg) - 1)]
        i = min(range(len(gaps)), key=lambda i: gaps[i])
        seg[i] = [seg[i][0], seg[i + 1][1]]; del seg[i + 1]
    return seg

# ad: (satır y0, y1, kare sayısı, böl, animasyonlar {ad: [kareler]}, mermi indeksi, oyundaki görünür boy px)
DUS = {
  'gul':      (4, 111, 10, (), {'yuru': [0,1,2,3,4,5], 'ol': [6,7,8,9]}, None, 36),
  'yilan':    (136, 209, 10, (), {'yuru': [0,1,2,3,4,5], 'ol': [6,7,8,9]}, None, 22),
  'yuvarlak': (238, 333, 10, (), {'yuru': [0,1,2,3,4,5], 'ol': [6,7,8,9]}, None, 32),
  'ari':      (352, 445, 8, (), {'uc': [0,1,2,3], 'ol': [4,5,6,7]}, None, 30),
  'orumcek':  (465, 575, 6, (), {'bekle': [0,1], 'ol': [2,3,4,5]}, None, 34),
  'maymun':   (590, 681, 9, (), {'dur': [0], 'at': [0,1,2,3], 'ol': [4,5,6,7]}, 8, 38),
  'kopek':    (698, 781, 16, (7,), {'yuru': [0,1,2,3,4,5], 'at': [6,7,8,9], 'ol': [10,11,12,13,14]}, 15, 40),
  'boss':     (797, 933, 14, (), {'yuru': [0,1,2,3,4,5], 'saldir': [6,7,8,9], 'ol': [10,11,12,13]}, None, 84),
}
MERMI = {'maymun': ('atesTopu', 22), 'kopek': ('mizrak', 44)}   # oyundaki genişlik px
meta = {}
for ad, (y0, y1, n, bol, an, mi, boy) in DUS.items():
    seg = parcalar(y0, y1, bol)
    seg = birlestir(seg, n)
    assert len(seg) == n, (ad, len(seg))
    kareler = [i for i in range(n) if i != mi]
    # ilk animasyonun (yürüme/uçma) kutusu: ayak çizgisi ve boy
    ilk = list(an.values())[0]
    kutu = []
    for i in kareler:
        x0, x1 = seg[i]; sub = A[y0:y1, x0:x1]; ys = np.where(sub.any(1))[0]
        kutu.append((ys[0], ys[-1]))
    alt = max(kutu[kareler.index(i)][1] for i in ilk) + 1
    ust = min(kutu[kareler.index(i)][0] for i in ilk)
    W = max(seg[i][1] - seg[i][0] for i in kareler) + 4
    H = y1 - y0
    serit = Image.new('RGBA', (W * len(kareler), H), (0, 0, 0, 0))
    for k, i in enumerate(kareler):
        x0, x1 = seg[i]
        parca = Image.fromarray(im[y0:y1, x0:x1])
        serit.paste(parca, (k * W + (W - (x1 - x0)) // 2, 0))
    serit.save(KOK + '/assets/d_' + ad + '.png', optimize=True)
    yeniNo = {i: k for k, i in enumerate(kareler)}
    meta[ad] = {'w': W, 'h': H, 'ayak': int(alt), 'ust': int(ust), 'boy': boy,
                'anim': {k: [yeniNo[i] for i in v] for k, v in an.items()}}
    if mi is not None:
        x0, x1 = seg[mi]; sub = im[y0:y1, x0:x1]
        ys = np.where(sub[:, :, 3].any(1))[0]
        p = Image.fromarray(sub[ys[0]:ys[-1] + 1])
        isim, gen = MERMI[ad]
        p.save(KOK + '/assets/' + isim + '.png', optimize=True)
        meta[isim] = {'w': p.width, 'h': p.height, 'gen': gen}
ap = KOK + '/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Düşman sayfaları.*', '', s, flags=re.S)
s += '\n// Düşman sayfaları (araclar/dusmanKes.py ile üretildi): hücre w×h, ayak çizgisi, görünür boy (oyun px), animasyon kareleri\nASSETLER.dusman = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(json.dumps({k: (v.get('w'), v.get('h'), v.get('ayak')) for k, v in meta.items()}))
