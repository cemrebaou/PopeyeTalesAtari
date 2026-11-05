# Düşman sprite sayfası kesici (v0.24). Kaynak: assets/kaynak/dusman_seti.png (kullanıcı görseli).
# Kenardaki renkli haleyi (kırmızı/sarı/yeşil/mor) dışarıdan temizler, her düşmanı kendi sayfasına keser:
# assets/dusman/<ad>.png (yatay şerit, eşit hücre), mermiler assets/dusman/atesTopu.png ve mizrak.png,
# ölçüler js/veri/assetlar.js → ASSETLER.dusman. Çalıştırma: python3 araclar/dusmanKes.py
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
def temizle(dosya):
    im = np.array(Image.open(KOK + '/assets/kaynak/' + dosya).convert('RGBA')).astype(int)
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
    return im, im[:, :, 3] > 60
KAYNAK = {'1': temizle('dusman_seti.png'), '2': temizle('dusman_seti2.png'),   # v0.52: 2 = maymun, köpek, patron yeni görseller
          '3': temizle('dusman_seti3.png'), '4': temizle('dusman_seti4.png'),
          '5': temizle('dusman_seti5.png'), '6': temizle('dusman_seti6.png')}   # v0.72: 5 = golem, bitki · 6 = fıçı, büyücü   # v0.71: 4 = yarasa                                        # v0.70: 2. bölüm: kedi, domuz, kertenkele
# Kertenkelenin üfleme okunu (8. kare, borunun ucunda) ayrı mermi olarak kes, kareden sil
_im3, _A3 = KAYNAK['3']
OK_KUTU = (725, 768, 1296, 1350)   # y0, y1, x0, x1
_ok = _im3[OK_KUTU[0]:OK_KUTU[1], OK_KUTU[2]:OK_KUTU[3]].copy()
_ys, _xs = np.where(_ok[:, :, 3] > 30)
_ok = _ok[_ys.min():_ys.max() + 1, _xs.min():_xs.max() + 1]
_im3[OK_KUTU[0]:OK_KUTU[1], OK_KUTU[2]:OK_KUTU[3]] = 0
_A3[OK_KUTU[0]:OK_KUTU[1], OK_KUTU[2]:OK_KUTU[3]] = False
# Yarasanın ses dalgası (son kare, ağzın önü) ayrı mermi
_im4, _A4 = KAYNAK['4']
DALGA_KUTU = (60, 200, 1660, 1774)
_dalga = _im4[DALGA_KUTU[0]:DALGA_KUTU[1], DALGA_KUTU[2]:DALGA_KUTU[3]].copy()
_ys, _xs = np.where(_dalga[:, :, 3] > 30)
_dalga = _dalga[_ys.min():_ys.max() + 1, _xs.min():_xs.max() + 1]
_im4[DALGA_KUTU[0]:DALGA_KUTU[1], DALGA_KUTU[2]:DALGA_KUTU[3]] = 0
_A4[DALGA_KUTU[0]:DALGA_KUTU[1], DALGA_KUTU[2]:DALGA_KUTU[3]] = False
# v0.72: ayrı mermiler (zehir, büyü) kutudan kesilip kaynaktan silinir
def mermiKes(k, y0, y1, x0, x1):
    im_, A_ = KAYNAK[k]
    m = im_[y0:y1, x0:x1].copy(); ys, xs = np.where(m[:, :, 3] > 30)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    im_[y0:y1, x0:x1] = 0; A_[y0:y1, x0:x1] = False
    return m
_zehir = mermiKes('5', 540, 640, 1700, 1870)
_buyu = mermiKes('6', 520, 680, 1925, 2100)
# Fıçı: 2. satırdaki (hazırlan, top) kareler 1. satırın sağına, alt çizgileri hizalı tek şeride
_im6, _A6 = KAYNAK['6']
_s1, _s2 = _im6[20:188], _im6[247:403]
_h = max(_s1.shape[0], _s2.shape[0]); _w = _im6.shape[1]
_f = np.zeros((_h, _w * 2, 4), np.uint8)
_f[_h - _s1.shape[0]:, :_w] = _s1; _f[_h - _s2.shape[0]:, _w:] = _s2
KAYNAK['6f'] = (_f, _f[:, :, 3] > 30)
im, A = KAYNAK['1']

def parcalar(y0, y1, bol=()):
    col = A[y0:y1].sum(0)
    seg, inr = [], False
    for x, v in enumerate(col > 0):
        if v and not inr: s, inr = x, True
        if not v and inr: seg.append([s, x]); inr = False
    if inr: seg.append([s, len(col)])
    seg = [s for s in seg if A[y0:y1, s[0]:s[1]].sum() > 40]
    bol = bol if isinstance(bol, dict) else {i: 2 for i in bol}
    for i in sorted(bol, reverse=True):   # k kare birleşik: eşit aralık yakınındaki en ince sütunlardan böl
        s0, s1 = seg[i]; k = bol[i]; w = (s1 - s0) / k; kes = [s0]
        for j in range(1, k):
            c = int(s0 + j * w); a0, a1 = int(c - w / 4), int(c + w / 4)
            kes.append(a0 + int(np.argmin(col[a0:a1])))
        kes.append(s1)
        seg[i:i + 1] = [[kes[j], kes[j + 1]] for j in range(k)]
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
  # v0.52: kaynak 2 (dusman_seti2.png)
  'maymun':   (192, 301, 15, (), {'yuru': [0,1,2,3,4,5], 'dur': [0], 'at': [6,7,8,9,10], 'ol': [11,12,13]}, 14, 38, '2'),
  'kopek':    (416, 529, 13, (2,), {'yuru': [0,1,2,3,4,5], 'at': [6,7,8,9], 'ol': [10,11]}, 12, 40, '2'),
  'boss':     (631, 812, 10, {4: 3}, {'yuru': [0,1,2,3], 'saldir': [4,5,6,7], 'ol': [8,9]}, None, 84, '2'),
  # v0.70: kaynak 3 (dusman_seti3.png) — ölüm karesi yok, oyunda devrilip söner
  'kedi':       (170, 324, 10, {6: 4}, {'yuru': [0,1,2,3,4,5], 'saldir': [6,7,8], 'dur': [9], 'ol': [6]}, None, 46, '3'),
  'domuz':      (366, 579, 10, {5: 2}, {'yuru': [0,1,2,3,4,5], 'saldir': [6,7,8], 'dur': [9], 'ol': [7]}, None, 58, '3'),
  'yarasa':     (0, 307, 9, {3: 2, 6: 2}, {'uc': [0,1,2,3,4,5], 'saldir': [6,7,8], 'ol': [8]}, None, 40, '4'),
  'golem':      (11, 250, 10, {2: 4, 4: 3}, {'yuru': [0,1,2,3,4,5], 'saldir': [6,7,8,9], 'dur': [0], 'ol': [7]}, None, 62, '5'),
  'bitki':      (296, 476, 10, {0: 5}, {'bekle': [0,1,2,3,4,5], 'at': [6,7,8,9], 'ol': [8]}, None, 50, '5'),
  'fici':       (0, 168, 7, (), {'yuru': [0,1,2,3,4], 'hazir': [5], 'top': [6], 'ol': [5]}, None, 38, '6f'),
  'buyucu':     (456, 677, 9, {5: 2, 6: 2}, {'yuru': [0,1,2,3], 'buyu': [4,5,6,7,8], 'dur': [4], 'ol': [6]}, None, 44, '6'),
  'kertenkele': (682, 844, 10, {5: 3}, {'yuru': [0,1,2,3,4,5], 'at': [6,7,8], 'dur': [9], 'ol': [8]}, None, 40, '3'),
}
# Ek kareler: ayrı gönderilen görseller → şeridin sonuna eklenir (ölçek: mevcut ilk karenin boyuna eşitlenir)
EK = {}   # v0.27'deki maymun yürüme eki v0.52'de yeni sayfaya geçti
MERMI = {'maymun': ('atesTopu', 22), 'kopek': ('mizrak', 26)}   # v0.58: mızrak %40 küçük (44 → 26)   # oyundaki genişlik px
meta = {}
for ad, (y0, y1, n, bol, an, mi, boy, *kay) in DUS.items():
    im, A = KAYNAK[kay[0] if kay else '1']
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
        pa = im[y0:y1, x0:x1].copy()
        if kay and kay[0] == '4':   # yarasa: sadece gövde (en büyük parça) kalır, ses dalgaları ayrı mermi
            lab, nl = ndimage.label(pa[:, :, 3] > 30)
            if nl > 1:
                bo = ndimage.sum(np.ones_like(lab), lab, range(1, nl + 1))
                pa[(lab > 0) & (lab != int(np.argmax(bo)) + 1)] = 0
        if kay and kay[0] in '356':   # v0.70: komşu kareden kalan küçük kırpıntılar (kenara değen) silinir
            lab, nl = ndimage.label(pa[:, :, 3] > 30)
            for li in range(1, nl + 1):
                m = lab == li; xs = np.where(m.any(0))[0]
                if m.sum() < 1500 and (xs[0] <= 1 or xs[-1] >= pa.shape[1] - 2): pa[m] = 0
        parca = Image.fromarray(pa)
        serit.paste(parca, (k * W + (W - (x1 - x0)) // 2, 0))
    yeniNo = {i: k for k, i in enumerate(kareler)}
    ekNo = []
    if ad in EK:
        dosya, ekAnim, ekSay = EK[ad]
        e = np.array(Image.open(KOK + '/assets/kaynak/' + dosya).convert('RGBA'))
        ea = e[:, :, 3] > 60; col = ea.sum(0); es, inr = [], False
        for x, v in enumerate(col > 0):
            if v and not inr: s0, inr = x, True
            if not v and inr: es.append((s0, x)); inr = False
        if inr: es.append((s0, len(col)))
        es = [q for q in es if ea[:, q[0]:q[1]].sum() > 40][:ekSay]
        ilkBoy = alt - ust
        hs = [np.where(ea[:, x0:x1].any(1))[0] for x0, x1 in es]
        ekOlcek = ilkBoy / max(h[-1] - h[0] + 1 for h in hs)
        yeni = Image.new('RGBA', (serit.width + W * len(es), H), (0, 0, 0, 0)); yeni.paste(serit, (0, 0)); serit = yeni
        for k, ((x0, x1), h) in enumerate(zip(es, hs)):
            f = Image.fromarray(e[h[0]:h[-1] + 1, x0:x1])
            f = f.resize((max(1, round(f.width * ekOlcek)), max(1, round(f.height * ekOlcek))), Image.LANCZOS)
            no = len(kareler) + k
            serit.paste(f, (no * W + (W - f.width) // 2, alt - f.height), f)
            ekNo.append(no)
    serit.save(KOK + '/assets/dusman/' + ad + '.png', optimize=True)
    if ad == 'kertenkele':
        Image.fromarray(_ok).save(KOK + '/assets/dusman/ok.png', optimize=True)
        meta['ok'] = {'w': int(_ok.shape[1]), 'h': int(_ok.shape[0]), 'gen': 24}
    if ad == 'bitki':
        Image.fromarray(_zehir).save(KOK + '/assets/dusman/zehir.png', optimize=True)
        meta['zehir'] = {'w': int(_zehir.shape[1]), 'h': int(_zehir.shape[0]), 'gen': 26}
    if ad == 'buyucu':
        Image.fromarray(_buyu).save(KOK + '/assets/dusman/buyu.png', optimize=True)
        meta['buyu'] = {'w': int(_buyu.shape[1]), 'h': int(_buyu.shape[0]), 'gen': 34}
    if ad == 'yarasa':
        Image.fromarray(_dalga).save(KOK + '/assets/dusman/dalga.png', optimize=True)
        meta['dalga'] = {'w': int(_dalga.shape[1]), 'h': int(_dalga.shape[0]), 'gen': 30}
    meta[ad] = {'w': W, 'h': H, 'ayak': int(alt), 'ust': int(ust), 'boy': boy,
                'anim': {k: [yeniNo[i] for i in v] for k, v in an.items()}}
    if ekNo: meta[ad]['anim'][EK[ad][1]] = ekNo
    if mi is not None:
        x0, x1 = seg[mi]; sub = im[y0:y1, x0:x1]
        ys = np.where(sub[:, :, 3].any(1))[0]
        p = Image.fromarray(sub[ys[0]:ys[-1] + 1])
        isim, gen = MERMI[ad]
        p.save(KOK + '/assets/dusman/' + isim + '.png', optimize=True)
        meta[isim] = {'w': p.width, 'h': p.height, 'gen': gen}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Düşman sayfaları[^\n]*\nASSETLER.dusman = [^\n]*;\n', '\n', s)   # v0.54: sadece kendi satırını sil (eskisi sonraki tüm bölümleri siliyordu)
s += '\n// Düşman sayfaları (araclar/dusmanKes.py ile üretildi): hücre w×h, ayak çizgisi, görünür boy (oyun px), animasyon kareleri\nASSETLER.dusman = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(json.dumps({k: (v.get('w'), v.get('h'), v.get('ayak')) for k, v in meta.items()}))
