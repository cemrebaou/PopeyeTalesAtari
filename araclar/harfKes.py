# Harf görselleri kesici (v0.45). Kaynak: assets/kaynak/harf_seti.png (4 satır: büyük harf ×2, küçük harf ×2)
# + rakamlar assets/ui/r0..r9, rArti, rBolu. Her karakter assets/harf/<kod>.png; ölçüler js/veri/assetlar.js → ASSETLER.harf
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
# v0.51 ek karakterler: assets/kaynak/ui_ek.png (Q q, noktalama, matematik, semboller). Ölçek '!' yüksekliği = büyük harf.
ek = np.array(Image.open(KOK + '/assets/kaynak/ui_ek.png').convert('RGBA'))
EA = ek[:, :, 3] > 150
def kolon(y0, y1):
    v = EA[y0:y1].sum(0) > 0; out, inr = [], False
    for i, x in enumerate(v):
        if x and not inr: st, inr = i, True
        if not x and inr: out.append((st, i)); inr = False
    return [q for q in out if q[1] - q[0] >= 20 or EA[y0:y1, q[0]:q[1]].sum() > 300]
def kirp(y0, y1, x0, x1):
    p = ek[y0:y1, x0:x1].copy(); p[p[:, :, 3] < 40] = 0
    m = p[:, :, 3] > 40; ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    return p[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1], y0 + ys[0], y0 + ys[-1] + 1
BANT = {'A': (90, 245, 'Qq@+−×÷=%'), 'B': (250, 345, '!?.,;:…’”“()[]{}<>«»'), 'C': (348, 435, '@#$€₺&*^~_|\\/')}
# A satırında 3. parça Popeye başı (atlanır: '@' yer tutucu)
parcalar = {}
for k, (y0, y1, kar_) in BANT.items():
    kol = kolon(y0, y1)
    assert len(kol) == len(kar_), (k, len(kol), len(kar_))
    for (x0, x1), ch in zip(kol, kar_):
        if k == 'A' and ch == '@': continue
        parcalar[ch] = kirp(y0, y1, x0, x1)
unlem = parcalar['!']; hU = unlem[2] - unlem[1]; se = round(capH / hU, 4)
tabanB = unlem[2]
tabanA = parcalar['%'][2]; tabanC = parcalar['&'][2]
for ch, (p, top, bot) in parcalar.items():
    if ch in 'Qq': tb = parcalar['Q'][2] - round(0.06 * (parcalar['Q'][2] - parcalar['Q'][1]))
    elif ch in '+−×÷=%': tb = tabanA
    elif ch in '@#$€₺&*^~_|\\/': tb = tabanC
    else: tb = tabanB
    if ch in harf: continue   # '+' '/' rakam setinden kalır
    Image.fromarray(p).save(KOK + '/assets/harf/%d.png' % ord(ch), optimize=True)
    harf[ch] = [int(p.shape[1]), int(p.shape[0]), int(top - tb), se]
# klavye eksisi '-' = '−' görseli; düz tırnaklar kıvrık tırnak görseliyle
import shutil
for a_, b_ in [('-', '−'), ("'", '’'), ('"', '”')]:
    shutil.copy(KOK + '/assets/harf/%d.png' % ord(b_), KOK + '/assets/harf/%d.png' % ord(a_)); harf[a_] = harf[b_]

ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'// Harf görselleri.*?;\n', '', s, flags=re.S)
s += '// Harf görselleri (araclar/harfKes.py): assets/harf/<kod>.png; k: karakter → [w, h, dy (taban çizgisine göre), ek ölçek]\nASSETLER.harf = ' + json.dumps({'capH': capH, 'k': harf}, ensure_ascii=False) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(len(harf), 'karakter, capH', capH)
