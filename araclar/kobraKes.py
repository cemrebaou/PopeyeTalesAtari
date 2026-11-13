# 2. bölüm patronu Kobra Bekçi (v1.69): kaynak/kobra_yuru.gif (8 kare) + kobra_saldir.gif (10 kare) → dusman/kobra.png
# (6 sütun × 3 satır, kareler 0–7 yürüme, 8–17 saldırı) ve kaynak/kobra_zehir.png → dusman/kobraZehir.png; ölçüler ASSETLER.kobra.
# Saldırı GIF'indeki zehir çizimi silinir (her karede sadece en büyük parça = karakter kalır); zehir oyunda ayrı mermidir.
# Silinen zehrin yeri ağız noktası (mermi buradan çıkar), mızrağın en ileri ucu vuruş menzili olarak kaydedilir.
# İki GIF aynı boya getirilir (ilk karelerin boyu), ayak çizgisi ve gövde ortası her karede aynı yerde. Karakter SOLA bakar.
import json, re
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
BOY = 200          # ayakta boy (mızrak dahil) — kaynaktaki px
OYUN_BOY = 120     # kafa tepesinden ayağa oyundaki boy (dusmanOlcek öncesi)
SUT, PAY = 6, 4
TUKUR, VUR = 6, [3, 5]   # saldırı kareleri: zehrin çıktığı kare, mızrağın ileride olduğu kareler

def kareler(dosya):
    out = []
    for k in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/' + dosya)):
        a = np.array(k.convert('RGBA')); a[a[:, :, 3] < 128] = 0
        lab, n = ndimage.label(a[:, :, 3] > 0)
        boy = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
        ana = int(np.argmax(boy)) + 1
        atik = None                                   # silinenlerin en büyüğü (zehir): ağız noktası için
        if n > 1:
            i2 = int(np.argsort(-boy)[1]) + 1
            if boy[i2 - 1] > 40: atik = ndimage.center_of_mass(lab == i2)
        a[lab != ana] = 0
        out.append((a, atik))
    return out

def olcu(a):
    ys, xs = np.where(a[:, :, 3] > 0)
    return xs.min(), ys.min(), xs.max(), ys.max()

def hazirla(dosya):
    K = kareler(dosya)
    x0, y0, x1, y1 = olcu(K[0][0])
    h = y1 - y0 + 1
    yer = max(olcu(a)[3] for a, _ in K) + 1           # ayak çizgisi (bütün karelerin en altı)
    al = K[0][0][:, :, 3] > 0
    bant = al[y0 + int(h * 0.45):y0 + int(h * 0.7)]   # gövde bandı: yatay ağırlık merkezi = çapa
    capa = np.where(bant)[1].mean()
    return K, h, yer, capa

Y, hY, yerY, capaY = hazirla('kobra_yuru.gif')
S, hS, yerS, capaS = hazirla('kobra_saldir.gif')
liste = [(a, atik, BOY / hY, yerY, capaY) for a, atik in Y] + [(a, atik, BOY / hS, yerS, capaS) for a, atik in S]
# hücre: çapaya göre en geniş yarı genişlik × 2, en yüksek boy
yari = ust = 0
for a, _, olc, yer, capa in liste:
    x0, y0, x1, y1 = olcu(a)
    yari = max(yari, (capa - x0) * olc, (x1 + 1 - capa) * olc); ust = max(ust, (yer - y0) * olc)
HW = int(np.ceil(yari)) * 2 + 2 * PAY; HH = int(np.ceil(ust)) + 2 * PAY; AYAK = HH - PAY
sat = -(-len(liste) // SUT)
out = Image.new('RGBA', (HW * SUT, HH * sat), (0, 0, 0, 0))
agiz = uc = None
for i, (a, atik, olc, yer, capa) in enumerate(liste):
    g = Image.fromarray(a)
    g = g.resize((round(g.width * olc), round(g.height * olc)), Image.LANCZOS)
    out.alpha_composite(g, ((i % SUT) * HW + round(HW / 2 - capa * olc), (i // SUT) * HH + round(AYAK - yer * olc)))
    j = i - len(Y)
    if j == TUKUR and atik is not None:               # ağız: zehrin ilk göründüğü yer (çapanın solu, ayak çizgisinin üstü)
        agiz = [round((capa - atik[1]) * olc), round((yer - atik[0]) * olc)]
    if VUR[0] <= j <= VUR[1]:                          # mızrak ucu: en soldaki nokta
        x0 = olcu(a)[0]; yy = np.where(a[:, x0, 3] > 0)[0].mean()
        u = [round((capa - x0) * olc), round((yer - yy) * olc)]
        if uc is None or u[0] > uc[0]: uc = u
out.save(KOK + '/assets/dusman/kobra.png', optimize=True)
# kafa tepesi (mızraksız): yürüme ilk karesinde çapanın sağındaki en üst nokta (mızrak solda)
a0 = Y[0][0]; x0, y0, x1, y1 = olcu(a0)
kafaUst = np.where(a0[:, int(capaY):, 3] > 0)[0].min()
UST = round(AYAK - (yerY - kafaUst) * BOY / hY)

z = Image.open(KOK + '/assets/kaynak/kobra_zehir.png').convert('RGBA')
za = np.array(z); ys, xs = np.where(za[:, :, 3] > 24)
z = z.crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))
z.save(KOK + '/assets/dusman/kobraZehir.png', optimize=True)

nY = len(Y)
meta = {'w': HW, 'h': HH, 'ayak': AYAK, 'ust': UST, 'boy': OYUN_BOY,
        'anim': {'yuru': list(range(nY)), 'saldir': list(range(nY, len(liste))), 'ol': [nY]},
        'tukur': TUKUR, 'vur': VUR, 'agiz': agiz, 'uc': uc, 'zehir': {'w': z.width, 'h': z.height, 'gen': 34}}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Kobra Bekçi[^\n]*\nASSETLER.kobra = [^\n]*;\n', '\n', s)
s += '\n// Kobra Bekçi (araclar/kobraKes.py): 2. bölüm patronu — hücre, ayak / kafa çizgisi, kareler; agiz / uc: çapaya göre [ileri, yukarı] (hücre px)\nASSETLER.kobra = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta, out.size)
