# v1.37: assets/kaynak/nesne3.png (gizli bonus kapısı, 1. ve 2. bölüm patron kapıları, süs bitkileri / kayalar / sarmaşıklar)
# → assets/nesne/<ad>.png ve js/veri/assetlar.js → ASSETLER.nesne3 {ad: {w, h, ox}} (nesne2 ile aynı biçim; nesneKoy ikisini de okur)
# Çalıştırma: python3 araclar/nesne3Kes.py
# v1.39: süsler kaynak boyutunda kesilir (en büyük kenar 0); ardından araclar/susBuyut.py 4× yapay zekâ büyütmesiyle oyundaki boylarına göre kaliteli üretir
import json, re, os
import numpy as np
from PIL import Image
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(KOK + '/assets/kaynak/nesne3.png').convert('RGBA')
A = np.array(im)
# (x0, y0, x1, y1, adlar, en büyük kenar px): bölge içinde soldan sağa ayrılır
BOLGE = [(60, 270, 700, 510, ['gizliKapi', 'gizliKapiAcik'], 256),
         (760, 200, 1536, 520, ['patron2Kapi', 'patron2KapiAcik'], 320),
         (40, 590, 700, 920, ['patron1Kapi', 'patron1KapiAcik'], 320),
         (820, 550, 1060, 710, ['susCicek1', 'susKaya1', 'susKaya2'], 0),
         (1060, 550, 1400, 710, ['susCelenk', 'susAsma1', 'susAsma2'], 0),
         (790, 740, 1536, 920, ['susCicek2', 'susBitki1', 'susBitki2', 'susBitki3', 'susBitki4', 'susBitki5'], 0)]
ESIK = 120   # yarı saydam yeşil pus silinir
meta = {}
def seg(v, en=8):
    out, s = [], None
    for i, x in enumerate(list(v) + [0]):
        if x > 0 and s is None: s = i
        elif x <= 0 and s is not None:
            if i - s > en: out.append((s, i))
            s = None
    return out
from scipy import ndimage
def kaydet(p, ad, enbuy):
    m = p[..., 3] > 0
    ys = np.where(m.any(1))[0]; cs = np.where(m.any(0))[0]
    p = p[ys[0]:ys[-1] + 1, cs[0]:cs[-1] + 1]
    m = p[..., 3] > 0
    alt = np.where(m[-max(4, len(m) // 12):].any(0))[0]   # alt şerit: kaide / zemin teması
    ox = (alt[0] + alt[-1]) / 2 / p.shape[1]
    g = Image.fromarray(p)
    s = min(1, enbuy / max(g.size)) if enbuy else 1
    if s < 1: g = g.resize((round(g.width * s), round(g.height * s)), Image.LANCZOS)
    g.save(KOK + '/assets/nesne/' + ad + '.png', optimize=True)
    meta[ad] = {'w': g.width, 'h': g.height, 'ox': round(ox, 3)}

# Kapılar: bölge içinde sütun boşluklarıyla ayrılır
for x0, y0, x1, y1, adlar, enbuy in BOLGE:
    if enbuy == 0: continue
    band = A[y0:y1, x0:x1].copy()
    band[..., 3] = np.where(band[..., 3] < ESIK, 0, band[..., 3])
    xs = seg((band[..., 3] > 0).sum(0))
    b2 = []
    for s_, e_ in xs:
        if b2 and s_ - b2[-1][1] < 6: b2[-1] = (b2[-1][0], e_)
        else: b2.append((s_, e_))
    xs = b2
    assert len(xs) == len(adlar), (adlar, xs)
    for (sx, ex), ad in zip(xs, adlar): kaydet(band[:, sx:ex].copy(), ad, enbuy)

# v1.46: süsler bağlı parçalarla ayrılır (sütun sınırı nesneyi kesmesin — susKaya2 sağ kenarı kesiliyordu).
# Büyük parçalar = nesneler; küçük kopuk yaprak / kırpıntılar en yakın büyük parçaya katılır. Yarı saydam kenarlar korunur
# (yalnız çok soluk pus < 40 silinir), böylece kenarlar kesik / sert görünmez.
SUS = [(780, 540, 1536, 720, ['susCicek1', 'susKaya1', 'susKaya2', 'susCelenk', 'susAsma1', 'susAsma2']),
       (780, 730, 1536, 920, ['susCicek2', 'susBitki1', 'susBitki2', 'susBitki3', 'susBitki4', 'susBitki5'])]
for x0, y0, x1, y1, adlar in SUS:
    band = A[y0:y1, x0:x1].copy()
    band[..., 3] = np.where(band[..., 3] < 40, 0, band[..., 3])
    lab, n = ndimage.label(band[..., 3] >= ESIK)
    alan = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    buyuk = [i + 1 for i in np.argsort(-alan)[:len(adlar)]]
    buyuk.sort(key=lambda k: np.where(lab == k)[1].min())
    # her görünür piksel en yakın büyük parçaya
    uz = []; 
    for k in buyuk: uz.append(ndimage.distance_transform_edt(lab != k))
    sahip = np.argmin(np.stack(uz), 0)
    yakin = np.min(np.stack(uz), 0) < 14
    for j, ad in enumerate(adlar):
        p = band.copy()
        p[..., 3] = np.where((sahip == j) & yakin, p[..., 3], 0)
        kaydet(p, ad, 0)
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Nesne3.*?;\n', '\n', s, flags=re.S)
s += '// Nesne3 (araclar/nesne3Kes.py): gizli bonus kapısı, patron kapıları, süsler — w×h, ox = origin x (nesneKoy ikisini de okur)\nASSETLER.nesne3 = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
