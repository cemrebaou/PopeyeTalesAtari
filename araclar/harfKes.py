# Harf görselleri kesici (v0.45). Kaynak: assets/kaynak/harf_seti.png (4 satır: büyük harf ×2, küçük harf ×2)
# + rakamlar assets/ui/r0..r9, rArti, rBolu. Her karakter assets/harf/<kod>.png; ölçüler assetlar.js → ASSETLER.harf
# {capH, k: {karakter: [w, h, dy, s]}} (dy = üst kenarın taban çizgisine uzaklığı, s = ek ölçek). Çalıştırma: python3 araclar/harfKes.py
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
SATIR = ['ABCÇDEFGĞHIİJKLM', 'NOÖPRSŞTUÜVWXYZ', 'abcçdefgğhıijklm', 'noöprsştuüvwxyz']
INIS = set('ÇŞçgğjpşy')   # taban çizgisinin altına inenler
im = np.array(Image.open(KOK + '/assets/kaynak/harf_seti.png').convert('RGBA'))
r, g, b, a = [im[:, :, i].astype(int) for i in range(4)]
F = (a > 200) & (r > 170) & (g > 100)          # altın dolgu
lab, n = ndimage.label(F)
objs = ndimage.find_objects(lab); alan = ndimage.sum(F, lab, range(1, n + 1))
buyuk = [i for i in range(n) if alan[i] > 1500]
satirlar = [[], [], [], []]
for i in buyuk:
    o = objs[i]; cy = (o[0].start + o[0].stop) / 2
    satirlar[0 if cy < 195 else 1 if cy < 375 else 2 if cy < 550 else 3].append(i)
gl = {}   # bileşen → karakter
for s, harfler in zip(satirlar, SATIR):
    s.sort(key=lambda i: objs[i][1].start)
    assert len(s) == len(harfler), (harfler, len(s))
    for i, ch in zip(s, harfler): gl[i] = ch
# küçük parçalar (nokta, şapka, çengel): yatayda örtüşen, dikeyde en yakın harfe
for i in range(n):
    if i in gl: continue
    o = objs[i]; cx = (o[1].start + o[1].stop) / 2; cy = (o[0].start + o[0].stop) / 2
    en, enD = None, 1e9
    for j, ch in gl.items():
        p = objs[j]
        if p[1].start - 6 <= cx <= p[1].stop + 6:
            d = abs(cy - (p[0].start + p[0].stop) / 2)
            if d < enD: en, enD = ch, d
    if en: gl[i] = en
kar = sorted(set(gl.values()))
no = {ch: k + 1 for k, ch in enumerate(kar)}
G = np.zeros(F.shape, int)
for i, ch in gl.items(): G[lab == i + 1] = no[ch]
# her opak pikseli en yakın dolgu pikselinin harfine ata (yapışık dış çizgiler ayrılır)
mesafe, (iy, ix) = ndimage.distance_transform_edt(G == 0, return_indices=True)
sahip = G[iy, ix]; sahip[(a < 40) | (mesafe > 16)] = 0
meta, alt = {}, {}
for ch in kar:
    m = sahip == no[ch]
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    meta[ch] = (ys[0], ys[-1] + 1, xs[0], xs[-1] + 1)
taban = {}
for sat in SATIR:
    taban[sat] = float(np.median([meta[ch][1] for ch in sat if ch not in INIS]))
capH = taban[SATIR[0]] - meta['E'][0]
harf = {}
for sat in SATIR:
    for ch in sat:
        y0, y1, x0, x1 = meta[ch]
        p = im[y0:y1, x0:x1].copy(); p[sahip[y0:y1, x0:x1] != no[ch]] = 0
        Image.fromarray(p).save(KOK + '/assets/harf/%d.png' % ord(ch), optimize=True)
        harf[ch] = [int(x1 - x0), int(y1 - y0), round(y0 - taban[sat], 1), 1]
# rakamlar: ui görsellerinden sıkı kırpılır, rakam yüksekliği büyük harf boyuna eşitlenir
rk = {}
for ch, ad in [(str(d), 'r%d' % d) for d in range(10)] + [('+', 'rArti'), ('/', 'rBolu')]:
    p = np.array(Image.open(KOK + '/assets/ui/' + ad + '.png').convert('RGBA'))
    m = p[:, :, 3] > 40; ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    rk[ch] = (p, ys[0], ys[-1] + 1, xs[0], xs[-1] + 1)
dTaban = max(rk[str(d)][2] for d in range(10)); dUst = min(rk[str(d)][1] for d in range(10))
sd = round(capH / (dTaban - dUst), 4)
for ch, (p, y0, y1, x0, x1) in rk.items():
    Image.fromarray(p[y0:y1, x0:x1]).save(KOK + '/assets/harf/%d.png' % ord(ch), optimize=True)
    harf[ch] = [int(x1 - x0), int(y1 - y0), int(y0 - dTaban), sd]
ap = KOK + '/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'// Harf görselleri.*?;\n', '', s, flags=re.S)
s += '// Harf görselleri (araclar/harfKes.py): assets/harf/<kod>.png; k: karakter → [w, h, dy (taban çizgisine göre), ek ölçek]\nASSETLER.harf = ' + json.dumps({'capH': capH, 'k': harf}, ensure_ascii=False) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(len(harf), 'karakter, capH', capH)
