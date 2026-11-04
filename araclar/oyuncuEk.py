# Oyuncu ek kareleri (v0.33): bastonla duvara asılma, itme ve durumlara göre darbe kareleri.
# Kaynak: assets/kaynak/oyuncu_ek.png (3 satır) + assets/kaynak/oyuncu_asiliHasar.png (tek kare).
# Çıktı: assets/oyuncu2.png — 10 sütun, hücre 240×220, ayak çizgisi y=200, şapka ortası x=120,
# ölçek ana sayfayla aynı (şapka genişliği eşitlendi). Kareler:
#  0–5 asili (bastonla duvara takılı), 6–11 it, 12 tırmanırken darbe, 13 eğikken darbe,
#  14 havada darbe, 15 çekerken darbe, 16 iterken darbe, 17 asılıyken darbe, 18–23 ölüm (oyuncu_olum.png)
import numpy as np
from PIL import Image
KOK = __file__.rsplit('/araclar/', 1)[0]
W, H, AY, OLCEK = 240, 220, 200, 0.57
C = W // 2   # v0.40: hücre 240 geniş (itme karesi gövdenin arkasına taşabilsin), şapka/gövde ortası x=C
def yukle(p):
    im = np.array(Image.open(KOK + '/assets/kaynak/' + p).convert('RGBA')); im[im[:, :, 3] < 60] = 0; return im
from scipy import ndimage
def kes(im, y0, y1, x0, x1):
    s = im[y0:y1, x0:x1].copy()
    # v0.40: küçük kopuk lekeleri sil (siyah noktalar vb.); yıldız gibi büyük parçalar kalır
    lab, n = ndimage.label(s[:, :, 3] > 0)
    if n > 1:
        boy = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
        for i, v in enumerate(boy):
            if v < 120: s[lab == i + 1] = 0
    b = s[:, :, 3] > 0
    ys, xs = np.where(b.any(1))[0], np.where(b.any(0))[0]
    return s[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
im = yukle('oyuncu_ek.png')
A = im[:, :, 3] > 150
col = A[425:665].sum(0)
itKes = [17] + [c - 40 + int(np.argmin(col[c - 40:c + 40])) for c in (275, 500, 725, 950, 1175)] + [1418]
kareler = []
for x0, x1 in [(47, 247), (285, 482), (518, 710), (744, 937), (974, 1166), (1205, 1398)]:
    kareler.append((kes(im, 49, 358, x0, x1), 0))
for i in range(6):
    kareler.append((kes(im, 425, 665, itKes[i], itKes[i + 1]), 0))
for (x0, x1), alt in zip([(36, 234), (294, 493), (540, 755), (820, 1114), (1140, 1395)], [0, 0, 20, 0, 0]):
    kareler.append((kes(im, 710, 1042, x0, x1), alt))
ek = yukle('oyuncu_asiliHasar.png'); ek = kes(ek, 0, ek.shape[0], 0, ek.shape[1])
asiliBoy = kareler[0][0].shape[0]
kareler.append((ek, 0, asiliBoy / ek.shape[0]))
# v0.37 ölüm kareleri (önden, yatayda kutu ortası hizalı)
ol = yukle('oyuncu_olum.png'); OA = ol[:, :, 3] > 150
for x0, x1 in [(18, 236), (245, 466), (472, 698), (708, 936), (944, 1175), (1182, 1423)]:
    kareler.append((kes(ol, 0, ol.shape[0], x0, x1), 0))
ORTALI = set(range(18, 24))
out = Image.new('RGBA', (W * 10, H * 3), (0, 0, 0, 0))
# v0.36: asılma kareleri (0–5, 17) bastona göre hizalanır → baston her karede aynı yerde sabit, gövde sallanır.
# Hedef: en uzun asılma karesinin ayağı ayak çizgisinde, baston sağ ucu x=KANCA_X.
def baston(arr):   # bastonun (figürün en üst 14 satırı) üstü ve sağ ucu
    b = arr[:, :, 3] > 150; t = np.where(b.any(1))[0][0]
    return t, np.where(b[t:t + 14].any(0))[0][-1]
ASILI = [0, 1, 2, 3, 4, 5, 17]
ITME = [6, 7, 8, 9, 10, 11, 16]
ON_KENAR = C + 9 / (60.19 / 117 * 0.77) + 2   # boy (CONFIG.oyuncu.boy) ve itme ölçeği (animOlcek.it) değişirse güncelle   # gövde yarı genişliği (9 px) hücre pikseline çevrildi
ASILI_BOY = max(round(kareler[i][0].shape[0] * OLCEK * (kareler[i][2] if len(kareler[i]) > 2 else 1)) for i in ASILI[:6])
KANCA_X = C + 38   # v0.43: baston ucu gövdenin ~5.5 px önünde (v0.38'deki ~10.6 px'ten 5 px geri) → kanca taşın içine girer
for n, k in enumerate(kareler):
    arr, alt = k[0], k[1]
    o = OLCEK * (k[2] if len(k) > 2 else 1)
    f = Image.fromarray(arr)
    b = arr[:, :, 3] > 150; ys = np.where(b.any(1))[0]; t = ys[0]
    hx = np.where(b[t:t + 30].any(0))[0]; hc = (hx[0] + hx[-1]) / 2   # şapka/baş üstü ortası
    f = f.resize((max(1, round(f.width * o)), max(1, round(f.height * o))), Image.LANCZOS)
    x = int(round(C - hc * o)); y = AY + alt - f.height
    if n in ORTALI: x = (W - f.width) // 2
    if n in ITME:   # v0.40: itmede el ucu gövdenin ön kenarında → eller nesneye değer, içine girmez
        x = int(round(ON_KENAR - f.width))
    if n in ASILI:
        t, xr = baston(arr)
        x = int(round(KANCA_X - xr * o)); y = int(round(AY - ASILI_BOY - t * o))
    x = max(0, min(W - f.width, x)); y = max(0, y)
    cell = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cell.alpha_composite(f, (x, y))
    # v0.40: soluk kenar kalıntıları ve küçük lekeler temizlenir (ana gövde ve yıldız gibi parçalar kalır)
    c = np.array(cell); c[c[:, :, 3] < 40] = 0
    lab, nn = ndimage.label(c[:, :, 3] > 0)
    if nn > 1:
        boy = ndimage.sum(np.ones(lab.shape), lab, range(1, nn + 1))
        for i, v in enumerate(boy):
            if v < 40: c[lab == i + 1] = 0
    cell = Image.fromarray(c)
    out.paste(cell, ((n % 10) * W, (n // 10) * H))
out.save(KOK + '/assets/oyuncu2.png', optimize=True)
print(len(kareler), 'kare')
