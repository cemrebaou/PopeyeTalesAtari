# Yüzme kareleri (v1.55): kaynak/oyuncu_yuz.png (2 sütun × 4 satır, okuma sırası: sol, sağ, alt satır …) →
# oyuncu/yuzme.png (4 sütun × 2 satır, hücre 512×256 — 2'nin kuvveti: küçültülünce de keskin) + ASSETLER.yuzme.
# Kareler kafaya göre hizalanır (kafa her karede aynı yerde durur, kollar / paletler oynar); hepsi aynı ölçekte.
import json, re
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
HW, HH, SUT, PAY = 512, 256, 4, 6

im = np.array(Image.open(KOK + '/assets/kaynak/oyuncu_yuz.png').convert('RGBA'))
im[im[:, :, 3] < 60] = 0   # arka plandaki soluk lekeler
lab, n = ndimage.label(im[:, :, 3] > 0)
boy = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
secili = [i + 1 for i in np.argsort(-boy)[:8]]
kutu = ndimage.find_objects(lab)
# okuma sırası: önce satır (kutu ortası y), sonra sütun
def orta(i):
    s = kutu[i - 1]
    return ((s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2)
satirH = im.shape[0] / 4
secili.sort(key=lambda i: (int(orta(i)[0] // satirH), orta(i)[1]))
kareler = []
for i in secili:
    s = kutu[i - 1]
    k = im[s].copy(); k[lab[s] != i] = 0
    kareler.append(k)

# Kafa şablonu: ilk karenin sağ üst köşesi (gözlük + yüz + pipo). Öbür karelerde aynı yer aranır.
def gri(k):
    return cv2.cvtColor(k, cv2.COLOR_RGBA2GRAY).astype(np.float32) * (k[:, :, 3:4].astype(np.float32) / 255)[:, :, 0]
k0 = kareler[0]
h0, w0 = k0.shape[:2]
SX0, SX1, SY0, SY1 = int(w0 * 0.70), int(w0 * 0.93), 0, int(h0 * 0.42)
sablon = gri(k0)[SY0:SY1, SX0:SX1]
kafa = []   # her karede şablonun sol üst köşesi
for k in kareler:
    r = cv2.matchTemplate(gri(k), sablon, cv2.TM_CCOEFF_NORMED)
    _, v, _, yer = cv2.minMaxLoc(r)
    kafa.append((yer[0], yer[1], v))
print('kafa eşleşmesi:', [round(v, 2) for _, _, v in kafa])

# Ortak kutu (kafa köşesine göre) ve ölçek
sol = max(kx for kx, _, _ in kafa); ust = max(ky for _, ky, _ in kafa)
sag = max(k.shape[1] - kx for k, (kx, _, _) in zip(kareler, kafa)); alt = max(k.shape[0] - ky for k, (_, ky, _) in zip(kareler, kafa))
olc = min((HW - 2 * PAY) / (sol + sag), (HH - 2 * PAY) / (ust + alt))
ox = (HW - (sol + sag) * olc) / 2 + sol * olc; oy = (HH - (ust + alt) * olc) / 2 + ust * olc   # kafa köşesinin hücredeki yeri
out = Image.new('RGBA', (HW * SUT, HH * 2), (0, 0, 0, 0))
for i, (k, (kx, ky, _)) in enumerate(zip(kareler, kafa)):
    g = Image.fromarray(k).resize((round(k.shape[1] * olc), round(k.shape[0] * olc)), Image.LANCZOS)
    out.alpha_composite(g, ((i % SUT) * HW + round(ox - kx * olc), (i // SUT) * HH + round(oy - ky * olc)))
out.save(KOK + '/assets/oyuncu/yuzme.png', optimize=True)

# Gövde ortası (dönme / yerleştirme noktası) ve ağız (baloncuk çıkışı) — ilk kareden, hücre oranı olarak
gx = (ox + (w0 * 0.60 - kafa[0][0]) * olc) / HW; gy = (oy + (h0 * 0.47 - kafa[0][1]) * olc) / HH
ax = (ox + (w0 * 0.93 - kafa[0][0]) * olc) / HW; ay = (oy + (h0 * 0.30 - kafa[0][1]) * olc) / HH
meta = {'w': HW, 'h': HH, 'kare': 8, 'boyPx': round(w0 * olc), 'ox': round(gx, 3), 'oy': round(gy, 3), 'agizX': round(ax, 3), 'agizY': round(ay, 3)}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Yüzme kareleri[^\n]*\nASSETLER.yuzme = [^\n]*;\n', '\n', s)
s += '\n// Yüzme kareleri (araclar/yuzmeKes.py): hücre, kare sayısı, gövde boyu (px), dönme noktası ve ağız (hücre oranı)\nASSETLER.yuzme = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta)
