# Kırılır taş parçaları (v0.67). Kaynak: assets/kaynak/kir_parca.png — her taş türünün sağa fırlayan parçaları
# (üst sıra: kasa, gri, koyu, kristal + tek küçük elmas; alt sıra: toprak, kızıl, tuğla, kum, mor, yosun).
# Çıktı: assets/nesne/kirParca.png (satır = KIRTAS sırası, sütun = parça, hücre eşit) + assets/nesne/tane.png (küçük elmas)
# ve js/veri/assetlar.js → ASSETLER.kirParca. Çalıştırma: python3 araclar/kirParcaKes.py
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage as nd
KOK = __file__.rsplit('/araclar/', 1)[0]
SIRA = ['kasa', 'gri', 'koyu', 'kristal', 'toprak', 'kizil', 'tugla', 'kum', 'mor', 'yosun']
UST = [(290, 'kasa'), (440, 'gri'), (600, 'koyu'), (800, 'kristal'), (9999, 'tane')]
ALT = [(200, 'toprak'), (400, 'kizil'), (580, 'tugla'), (780, 'kum'), (960, 'mor'), (9999, 'yosun')]
im = np.array(Image.open(KOK + '/assets/kaynak/kir_parca.png').convert('RGBA'))
lab, n = nd.label(im[:, :, 3] > 40)
parca = {k: [] for k in SIRA + ['tane']}
for i, sl in enumerate(nd.find_objects(lab)):
    m = lab[sl] == i + 1
    if m.sum() < 40: continue
    cx, cy = (sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2
    tur = next(t for x, t in (UST if cy < 330 else ALT) if cx < x)
    p = im[sl].copy(); p[~m] = 0
    parca[tur].append((m.sum(), Image.fromarray(p)))
HUC = 64   # hücre (kaynak çözünürlük; oyunda çok küçük gösterilir)
def sigdir(p, boy):
    s = boy / max(p.size); return p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
sut = max(len(parca[t]) for t in SIRA)
out = Image.new('RGBA', (HUC * sut, HUC * len(SIRA)))
sayi, boy = [], []
for r, t in enumerate(SIRA):
    lst = sorted(parca[t], key=lambda q: -q[0])
    enb = max(max(p.size) for _, p in lst)
    sayi.append(len(lst)); boy.append([round(max(p.size) / enb, 2) for _, p in lst])   # göreli boy (büyük parça 1)
    for c, (_, p) in enumerate(lst):
        q = sigdir(p, HUC - 4); out.paste(q, (c * HUC + (HUC - q.width) // 2, r * HUC + (HUC - q.height) // 2))
out.save(KOK + '/assets/nesne/kirParca.png', optimize=True)
sigdir(parca['tane'][0][1], 48).save(KOK + '/assets/nesne/tane.png', optimize=True)
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Taş parçaları.*?;\n', '\n', s, flags=re.S)
s += '// Taş parçaları (araclar/kirParcaKes.py): hücre, satır başına parça sayısı ve göreli boyları (KIRTAS sırası)\nASSETLER.kirParca = ' + json.dumps({'huc': HUC, 'sutun': sut, 'sayi': sayi, 'boy': boy}) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(dict(zip(SIRA, sayi)), len(parca['tane']))
