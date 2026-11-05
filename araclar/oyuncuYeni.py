# Oyuncu yeni kareleri (v0.76): duruş (GIF), tırmanma (GIF, arkadan), bastonla zıplama (pogo) ve eğik yürüme.
# Taban: assets/kaynak/oyuncu_taban.png (eski oyuncu.png, 10×6 hücre 176×141, ayak çizgisi y=125).
# Çıktı: assets/oyuncu/oyuncu.png — 10×9 hücre (74–81 uzun beklemede ayak vurma). Değişen kareler:
#   60–65 dur (oyuncu_dur.gif), 66–73 tirman (oyuncu_tirman.gif), 49 pogoHava + 50–52 pogoSek (oyuncu_pogo.png),
#   53–57 egil (oyuncu_egil.png). Eski 0–3 ve 29–32 boşaltılır.
# Her yeni animasyon eski karelerinin piksel boyuna ölçeklenir; şapka ortası eski şapka ortasına, alt kenar ayak
# çizgisine hizalanır. GIF'ler tek kutuyla kesilir (karedeki doğal iniş-çıkış korunur).
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
W, H, AY, SUT = 176, 141, 125, 10
src = open(KOK + '/araclar/dusmanKes.py').read()
temizle_kod = src[src.index('def temizle'):src.index('KAYNAK = {')]
exec(temizle_kod.replace("KOK + '/assets/kaynak/' + ad", "KOK + '/assets/kaynak/' + ad"))

taban = np.array(Image.open(KOK + '/assets/kaynak/oyuncu_taban.png').convert('RGBA'))
out = np.zeros((H * 9, W * SUT, 4), np.uint8); out[:taban.shape[0]] = taban
def hucre(i): return (i // SUT) * H, (i % SUT) * W
def eski(i):
    y, x = hucre(i); return taban[y:y + H, x:x + W]
def kutu(a):
    b = a[:, :, 3] > 150; ys = np.where(b.any(1))[0]; xs = np.where(b.any(0))[0]
    return ys[0], ys[-1], xs[0], xs[-1]
def sapka(a):   # en üst 25 satırın yatay ortası
    b = a[:, :, 3] > 150; t = np.where(b.any(1))[0][0]; xs = np.where(b[t:t + 25].any(0))[0]
    return (xs[0] + xs[-1]) / 2
def lekesiz(a, en=150):
    a = a.copy(); a[a[:, :, 3] < 40] = 0
    lab, n = ndimage.label(a[:, :, 3] > 0)
    if n > 1:
        bo = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
        for i, v in enumerate(bo):
            if v < en: a[lab == i + 1] = 0
    return a
def bosalt(i):
    y, x = hucre(i); out[y:y + H, x:x + W] = 0
def koy(i, a, olcek, hx, alt):
    # a: kesilmiş kare, olcek: ölçek, hx: a içindeki hizalama x'i (şapka ortası), alt: a içindeki alt hiza satırı
    f = Image.fromarray(a); f = f.resize((max(1, round(f.width * olcek)), max(1, round(f.height * olcek))), Image.LANCZOS)
    x0 = int(round(HEDEF_X - hx * olcek)); y0 = int(round(AY - (alt + 1) * olcek))
    cell = Image.new('RGBA', (W, H)); cell.paste(f, (x0, y0), f)
    c = np.array(cell); c[c[:, :, 3] < 30] = 0
    y, x = hucre(i); out[y:y + H, x:x + W] = c

def gif(ad):
    im = Image.open(KOK + '/assets/kaynak/' + ad)
    fr = [lekesiz(np.array(f.convert('RGBA'))) for f in ImageSequence.Iterator(im)]
    b = np.zeros(fr[0].shape[:2], bool)
    for f in fr: b |= f[:, :, 3] > 150
    ys = np.where(b.any(1))[0]; xs = np.where(b.any(0))[0]
    return [f[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1] for f in fr]
def serit(ad, bosluk=10):
    im, A = temizle(ad); im = lekesiz(im, 400)
    col = (im[:, :, 3] > 150).any(0); segs = []; x = 0
    while x < len(col):
        if col[x]:
            s = x
            while x < len(col) and (col[x] or col[x:x + bosluk].any()): x += 1
            segs.append((s, x))
        else: x += 1
    out_ = []
    for s, e in segs:
        a = im[:, s:e]; ys = np.where((a[:, :, 3] > 150).any(1))[0]
        if e - s > 40: out_.append(a[ys[0]:ys[-1] + 1])
    return out_

def anim(yeni, eskiler, hedefler, gif_mi, olcek_kare=None):
    global HEDEF_X
    eb = max(kutu(eski(i))[1] - kutu(eski(i))[0] + 1 for i in eskiler)
    HEDEF_X = np.mean([sapka(eski(i)) for i in eskiler])
    ref = yeni[olcek_kare] if olcek_kare is not None else None
    if gif_mi:
        nb = max(kutu(a)[1] - kutu(a)[0] + 1 for a in yeni)
        o = eb / nb; hx = sapka(yeni[0])
        for i, a in zip(hedefler, yeni): koy(i, a, o, hx, a.shape[0] - 1)
    else:
        nb = (kutu(ref)[1] - kutu(ref)[0] + 1) if ref is not None else max(kutu(a)[1] - kutu(a)[0] + 1 for a in yeni)
        o = eb / nb
        for i, a in zip(hedefler, yeni):
            alt = kutu(a)[1] if ref is None else kutu(a)[0] + kutu(ref)[1] - kutu(ref)[0]   # pogo: şapka hizası sabit
            koy(i, a, o, sapka(a), alt)
    return o

for i in list(range(0, 4)) + list(range(29, 33)) + list(range(49, 58)): bosalt(i)
print('dur', anim(gif('oyuncu_dur.gif'), [0, 1, 2, 3], range(60, 66), True))
print('tirman', anim(gif('oyuncu_tirman.gif'), [29, 30, 31, 32], range(66, 74), True))
pogo = serit('oyuncu_pogo.png')
assert len(pogo) == 4, len(pogo)
# eski pogoHava (49) boyuna göre: 1. kare (efektsiz) ölçü; şapka üstü her karede aynı satırda
print('pogo', anim(pogo, [49], [49, 50, 51, 52], False, olcek_kare=0))
def bilesenler(ad):   # kareler birbirine değiyorsa: her büyük parça bir kare, küçük parçalar en yakın kareye
    im, A = temizle(ad); b = im[:, :, 3] > 150
    lab, n = ndimage.label(b); bo = ndimage.sum(b, lab, range(1, n + 1))
    buyuk = [i + 1 for i, v in enumerate(bo) if v > 2000]
    mer = {i: np.mean(np.where(lab == i)[1]) for i in buyuk}
    sira = sorted(buyuk, key=lambda i: mer[i]); kareler = []
    sl = ndimage.find_objects(lab)
    for i in sira:
        m = lab == i
        for j in range(1, n + 1):
            if j in buyuk or bo[j - 1] < 150: continue
            cx = (sl[j - 1][1].start + sl[j - 1][1].stop) / 2
            if min(sira, key=lambda k: abs(mer[k] - cx)) == i: m |= lab == j
        a = im.copy(); a[~m] = 0
        ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]
        kareler.append(a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1])
    return kareler
egil = bilesenler('oyuncu_egil.png')
assert len(egil) == 5, len(egil)
print('egil', anim(egil, [53, 54, 55, 56, 57], range(53, 58), False))
# v0.76: uzun beklemede ayak vurma (oyuncu_ayakVur.gif) → 74.. ; duruşla aynı ölçek ve hiza
ayak = gif('oyuncu_ayakVur.gif')
print('ayakVur', anim(ayak, [0, 1, 2, 3], range(74, 74 + len(ayak)), True), len(ayak))
Image.fromarray(out).save(KOK + '/assets/oyuncu/oyuncu.png', optimize=True)
