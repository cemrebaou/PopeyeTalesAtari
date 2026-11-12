# v1.08: dükkan odası görselleri.
#  kaynak/dukkan_karolar.png → assets/dukkan/<ad>.png (7 parça: zemin sol/orta/sağ, duvar sol/orta/sağ, tavan), 128 px genişlik
#  kaynak/satici_*.gif      → assets/dukkan/satici.png (ızgara); market her karede aynı boyda ve aynı yerde (v1.17: görüntü eşlemeyle hizalanır)
# Meta: ASSETLER.dukkan = {parca: {ad: {w, h, ust}}, satici: {w, h, kare}}  (ust: zemin parçalarında taş gövdenin başladığı satır)
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
a = np.array(Image.open(KOK + '/assets/kaynak/dukkan_karolar.png').convert('RGBA')); a[a[:, :, 3] < 40] = 0
PARCA = {   # ad: (x0, x1, y0, y1, taş gövde başı) — kaynak pikseli
    'zeminSol': (176, 539, 11, 367, 40), 'zeminOrta': (551, 902, 11, 367, 44), 'zeminSag': (915, 1273, 11, 367, 40),
    'duvarSol': (176, 539, 382, 706, 0), 'duvarOrta': (551, 902, 382, 706, 0), 'duvarSag': (915, 1273, 382, 706, 0),
    'tavan': (546, 902, 722, 1072, 0),
}
meta = {'parca': {}}
for ad, (x0, x1, y0, y1, ust) in PARCA.items():
    p = a[y0:y1, x0:x1]; ys, xs = np.where(p[:, :, 3] > 0); p = p[:, xs.min():xs.max() + 1]
    r = 128 / p.shape[1]; im = Image.fromarray(p).resize((128, round(p.shape[0] * r)), Image.LANCZOS)
    im.save(KOK + '/assets/dukkan/' + ad + '.png', optimize=True)
    meta['parca'][ad] = {'w': im.width, 'h': im.height, 'ust': round(ust * r)}
# v1.09: satıcı 5 GIF'ten tek ızgara (8 sütun). v1.17: hizalama görüntü eşlemeyle —
#  1) her kare kendi GIF'inin ilk karesine faz korelasyonuyla kaydırılır (GIF içi titreme gider),
#  2) her GIF'in ilk karesi, bekle GIF'inin ilk karesine (beklenen ölçeğin ±%20'si taranır + kaydırma, kenar haritası
#     korelasyonu) oturtulur; aynı dönüşüm o GIF'in tüm karelerine uygulanır (market her animasyonda aynı boy ve yerde).
#  Ölçek tek eksenli (en/boy oranı bozulmaz).
from scipy.signal import fftconvolve
from scipy.ndimage import sobel, gaussian_filter
SATICI = [('bekle', 'satici_bekle.gif'), ('nadir1', 'satici_nadir1.gif'), ('basparmak', 'satici_basparmak.gif'),
          ('para', 'satici_para.gif'), ('nadir2', 'satici_nadir2.gif')]
HW, HH, CW, CH, SUT = 210, 210, 232, 222, 8   # içerik en/boy, hücre, sütun
ALT, ORTA = CH - 4, CW // 2

def kareler_oku(gif):
    im = Image.open(KOK + '/assets/kaynak/' + gif); fr, sure = [], []
    for f in ImageSequence.Iterator(im):
        a = np.array(f.convert('RGBA')); a[a[:, :, 3] < 40] = 0; fr.append(a); sure.append(f.info.get('duration', 100))
    return fr, sure

def kenar(a):   # gri kenar haritası (hizalama için), alfa dışı 0
    g = a[:, :, :3].astype(float).mean(-1) * (a[:, :, 3] > 0)
    g = gaussian_filter(g, 1.0)
    e = np.hypot(sobel(g, 0), sobel(g, 1))
    return e - e.mean()

def kaydirma(ref, img):   # img'yi ref'e oturtan (dy, dx) — çapraz korelasyon tepe noktası
    c = fftconvolve(ref, img[::-1, ::-1], mode='full')
    dy, dx = np.unravel_index(np.argmax(c), c.shape)
    return dy - (img.shape[0] - 1), dx - (img.shape[1] - 1), c.max()

def olcekle(a, s):
    im = Image.fromarray(a); return np.array(im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS))

def yerlestir(a, dy, dx, W, H):   # a'yı (dy, dx) kaydırarak W×H tuvale koyar
    c = np.zeros((H, W, 4), np.uint8)
    y0, x0 = max(0, dy), max(0, dx); sy, sx = max(0, -dy), max(0, -dx)
    h, w = min(a.shape[0] - sy, H - y0), min(a.shape[1] - sx, W - x0)
    if h > 0 and w > 0: c[y0:y0 + h, x0:x0 + w] = a[sy:sy + h, sx:sx + w]
    return c

kareler, anim = [], {}
ref = None
for ad, gif in SATICI:
    fr, sure = kareler_oku(gif)
    # 1) GIF içi: her kare ilk kareye (yalnızca kaydırma; ölçek sabit sayılır)
    H0, W0 = fr[0].shape[:2]
    e0 = kenar(fr[0]); hiz = []
    for a in fr:
        dy, dx, _ = kaydirma(e0, kenar(a)) if a is not fr[0] else (0, 0, 0)
        hiz.append(yerlestir(a, dy, dx, W0, H0))
    if ref is None:
        # bekle: içerik HW×HH'ye tek ölçekle sığdırılır, alt kenar ALT'a, yatayda ortaya
        m = np.any([f[:, :, 3] > 0 for f in hiz], axis=0); ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        s = min(HW / (x1 - x0), HH / (y1 - y0))
        donustur = lambda a: olcekle(a[y0:y1, x0:x1], s)
        k0 = donustur(hiz[0]); yy, xx = np.where(k0[:, :, 3] > 0)
        ofs = (ALT - yy.max(), round(ORTA - (xx.min() + xx.max()) / 2))
        hucreler = [yerlestir(donustur(a), ofs[0], ofs[1], CW, CH) for a in hiz]
        ref = kenar(hucreler[0])
    else:
        # 2) GIF'ler arası: ilk kareyi bekle'ye oturtan ölçek + kaydırma taranır
        en_iyi = None
        m = np.any([f[:, :, 3] > 0 for f in hiz], axis=0); ys, xs = np.where(m)
        s0 = min(HW / (xs.max() + 1 - xs.min()), HH / (ys.max() + 1 - ys.min()))   # beklenen ölçek; ±%20 taranır
        for s in np.arange(s0 * 0.80, s0 * 1.20, s0 * 0.01):
            k = olcekle(hiz[0], s)
            dy, dx, puan = kaydirma(ref, kenar(k))
            puan /= np.sqrt((kenar(k) ** 2).sum() + 1e-9)   # ölçeğe göre normalize
            if en_iyi is None or puan > en_iyi[0]: en_iyi = (puan, s, dy, dx)
        _, s, dy, dx = en_iyi
        for s2 in np.arange(s - s0 * 0.009, s + s0 * 0.01, s0 * 0.002):   # ince tarama
            k = olcekle(hiz[0], s2); dy2, dx2, puan = kaydirma(ref, kenar(k)); puan /= np.sqrt((kenar(k) ** 2).sum() + 1e-9)
            if puan > en_iyi[0]: en_iyi = (puan, s2, dy2, dx2)
        _, s, dy, dx = en_iyi
        print(ad, 'ölçek %.3f kaydırma %d,%d' % (s, dy, dx))
        hucreler = [yerlestir(olcekle(a, s), dy, dx, CW, CH) for a in hiz]
    bas = len(kareler)
    for c in hucreler: kareler.append(Image.fromarray(c))
    anim[ad] = {'kareler': list(range(bas, len(kareler))), 'sure': sure}
SAT = -(-len(kareler) // SUT)
serit = Image.new('RGBA', (CW * SUT, CH * SAT))
for i, c in enumerate(kareler): serit.paste(c, ((i % SUT) * CW, (i // SUT) * CH))
serit.save(KOK + '/assets/dukkan/satici.png', optimize=True)
meta['satici'] = {'w': CW, 'h': CH, 'alt': ALT, 'icerikY': HH, 'anim': anim}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Dükkan[^\n]*\nASSETLER.dukkan = [^\n]*;\n', '\n', s)
s += '\n// Dükkan odası (araclar/dukkanUret.py)\nASSETLER.dukkan = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta)
