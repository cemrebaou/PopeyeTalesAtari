# Oyuncu yeni kareleri (v0.76): duruş (GIF), tırmanma (GIF, arkadan), bastonla zıplama (pogo) ve eğik yürüme.
# Taban: assets/kaynak/oyuncu_taban.png (eski oyuncu.png, 10×6 hücre 176×141, ayak çizgisi y=125).
# Çıktı: assets/oyuncu/oyuncu.png — 10×10 hücre (74–81 uzun beklemede ayak vurma, 82–93 koşma). Değişen kareler:
#   60–65 dur (oyuncu_dur.gif), 66–73 tirman (oyuncu_tirman.gif), 49 pogoHava + 50–52 pogoSek (oyuncu_pogo.png),
#   53–57 egil (oyuncu_egil.png). Eski 0–3 ve 29–32 boşaltılır.
# Her yeni animasyon eski karelerinin piksel boyuna ölçeklenir; şapka ortası eski şapka ortasına, alt kenar ayak
# çizgisine hizalanır. GIF'ler tek kutuyla kesilir (karedeki doğal iniş-çıkış korunur).
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
K = 2   # v0.78: yüksek çözünürlük — hücreler eskinin 2 katı (oyun küçültür, büyütmez)
W, H, AY, SUT = 176 * K, 141 * K, 125 * K, 10
src = open(KOK + '/araclar/dusmanKes.py').read()
temizle_kod = src[src.index('def temizle'):src.index('KAYNAK = {')]
exec(temizle_kod.replace("KOK + '/assets/kaynak/' + ad", "KOK + '/assets/kaynak/' + ad"))

_t = Image.open(KOK + '/assets/kaynak/oyuncu_taban.png').convert('RGBA')
taban = np.array(_t.resize((_t.width * K, _t.height * K), Image.LANCZOS))   # eski kareler (kaynağı yok) 2 kat
out = np.zeros((H * 14, W * SUT, 4), np.uint8); out[:taban.shape[0]] = taban
def hucre(i): return (i // SUT) * H, (i % SUT) * W
def eski(i):
    y, x = hucre(i); return taban[y:y + H, x:x + W]
def kutu(a):
    b = a[:, :, 3] > 150; ys = np.where(b.any(1))[0]; xs = np.where(b.any(0))[0]
    return ys[0], ys[-1], xs[0], xs[-1]
def sapka(a):   # en üst 25 satırın yatay ortası
    b = a[:, :, 3] > 150; t = np.where(b.any(1))[0][0]; xs = np.where(b[t:t + 25 * K].any(0))[0]
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
# v0.77: koşma (oyuncu_kos.gif, 12 kare) → 82–93; eski koşma (4–9) boyunda, eski kareler boşaltılır
kos = gif('oyuncu_kos.gif')
print('kos', anim(kos, [4, 5, 6, 7, 8, 9], range(82, 82 + len(kos)), True), len(kos))
for i in range(4, 10): bosalt(i)
# v0.79: zıplama (oyuncu_zipla.gif: dur, çömel, kalk, tepe, düş, iniş …) ve çift zıplama taklası (oyuncu_takla.gif).
# Her kare ayrı kırpılır; ölçek ilk (ayakta) karenin boyu = duruş boyu. Yerdekiler ayak çizgisine, havadakiler
# ayakta gövde ortasına hizalanır (yükseklik oyunda fizikle verilir, karedeki iniş-çıkış atılır).
def gifKare(ad):
    im = Image.open(KOK + '/assets/kaynak/' + ad); fr = []
    for f in ImageSequence.Iterator(im):
        a = lekesiz(np.array(f.convert('RGBA')))
        y0, y1, x0, x1 = kutu(a); fr.append(a[y0:y1 + 1, x0:x1 + 1])
    return fr
durBoy = max(kutu(eski(i))[1] - kutu(eski(i))[0] + 1 for i in [0, 1, 2, 3])
HEDEF_X = np.mean([sapka(eski(i)) for i in [0, 1, 2, 3]])
def ekle(kareler, hedefler, havada, ortadan=False):
    o = durBoy / kareler[0].shape[0]
    for i, k in zip(hedefler, kareler):
        a = k['a'] if isinstance(k, dict) else k
        hx = a.shape[1] / 2 if ortadan else sapka(a)
        if havada: alt = a.shape[0] / 2 + kareler[0].shape[0] / 2 - 1   # merkez → ayakta gövde ortası
        else: alt = a.shape[0] - 1
        koy(i, a, o, hx, alt)
    return o
zp = gifKare('oyuncu_zipla.gif')   # 0 dur 1 çömel 2 kalk 3 tepe 4 tepe 5 düş 6 iniş 7 dur
ekle([zp[0], zp[1]], [94, 95], False)                 # 95: çömel (kalkış)
ekle([zp[0], zp[2], zp[3], zp[4]], [99, 96, 97, 98], True)
ekle([zp[0], zp[6]], [99, 100], False)                # 100: iniş
bosalt(99)
tk = gifKare('oyuncu_takla.gif')   # 3–11 havada dönüş
print('takla', ekle([tk[0]] + tk[3:12], [101] + list(range(102, 111)), True, ortadan=True))
bosalt(101)
for i in range(10, 15): bosalt(i)
# v0.80: iki baston vuruşu (oyuncu_vur1.gif, oyuncu_vur2.gif) sırayla; bekleme kareleri (ilk 3 ve sonuncu) alınmaz.
# Ölçek: ilk karedeki (ayakta) boy = duruş boyu; hiza: ilk karenin şapka ortası, ayaklar ayak çizgisinde.
for n, ad in enumerate(['oyuncu_vur1.gif', 'oyuncu_vur2.gif']):
    v = gif(ad); y0, y1, _, _ = kutu(v[0]); o = durBoy / (y1 - y0 + 1); hx = sapka(v[0])
    for k, a in enumerate(v[3:7]): koy(111 + n * 4 + k, a, o, hx, kutu(a)[1])
for i in range(24, 29): bosalt(i)
# v0.81: kanca uzatma + çekme (oyuncu_cek.gif): 1–3 uzat, 4–11 geri çek; 0 (bekleme) alınmaz. Ölçek/hiza vuruşla aynı.
v = gif('oyuncu_cek.gif'); y0, y1, _, _ = kutu(v[0]); o = durBoy / (y1 - y0 + 1); hx = sapka(v[0])
for k, a in enumerate(v[1:12]): koy(119 + k, a, o, hx, kutu(a)[1])
# v0.82: eğik yürüme (oyuncu_egil.gif): 0 = eğik dururken, 1–7 yürürken döngü. Boy eski eğik karelerle aynı.
v = gif('oyuncu_egil.gif'); egBoy = max(kutu(eski(i))[1] - kutu(eski(i))[0] + 1 for i in range(53, 58))
y0, y1, _, _ = kutu(v[0]); o = egBoy / (y1 - y0 + 1); hx = sapka(v[0])
for k, a in enumerate(v): koy(130 + k, a, o, hx, kutu(a)[1])
# Sıkıştır: sadece kullanılan kareler, animasyon sırasıyla 8 sütunlu sayfaya; kare listesi ASSETLER.oyuncu'ya
ANIM = {'dur': range(60, 66), 'ayakVur': range(74, 82), 'kos': range(82, 94), 'zipla': [95, 96, 97], 'dus': [98], 'in': [100], 'takla': range(102, 111),
        'sersem': [15, 16, 17], 'vur': range(111, 115), 'vur2': range(115, 119), 'tirman': range(66, 74), 'uzat': range(119, 122), 'cek': range(122, 130),
        'pogoHava': [49], 'pogoSek': [50, 51, 52], 'egilDur': [130], 'egil': range(131, 138)}
S2 = 8; sira = [i for v in ANIM.values() for i in v]; yeniNo = {}
sayfa = np.zeros((H * (-(-len(sira) // S2)), W * S2, 4), np.uint8)
for n, i in enumerate(sira):
    yeniNo[i] = n; y, x = hucre(i)
    sayfa[(n // S2) * H:(n // S2 + 1) * H, (n % S2) * W:(n % S2 + 1) * W] = out[y:y + H, x:x + W]
Image.fromarray(sayfa).save(KOK + '/assets/oyuncu/oyuncu.png', optimize=True)
import json, re
ap = KOK + '/js/veri/assetlar.js'; t = open(ap, encoding='utf8').read()
t = re.sub(r'\n// Oyuncu kareleri.*?;\n', '\n', t, flags=re.S)
t += '// Oyuncu kareleri (araclar/oyuncuYeni.py): hücre ve animasyon → kare numaraları (assets/oyuncu/oyuncu.png)\nASSETLER.oyuncu = ' + json.dumps(
    {'kare': {'w': W, 'h': H, 'ayakY': AY, 'ayakBoy': 117 * K}, 'anim': {k: [yeniNo[i] for i in v] for k, v in ANIM.items()}}) + ';\n'
open(ap, 'w', encoding='utf8').write(t)
print('sayfa', sayfa.shape)
