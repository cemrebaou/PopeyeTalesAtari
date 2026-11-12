# v1.28: kaynak/arayuz2.png (tek sayfa, saydam) → assets/ui/*.png parçaları.
#  Kutular elle (kaynak piksel). Düşük alfalı kenar kirleri (< ESIK) silinir; parça kırpılıp kenar boşluğu atılır.
#  Uzun / büyük parçalar oyundaki en büyük boyutun ~2 katına küçültülür (dosya boyutu).
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar', 1)[0]
A = np.array(Image.open(KOK + '/assets/kaynak/arayuz2.png').convert('RGBA'))
al = A[:, :, 3]
# İki mücevher ve iki yükleme barı birbirine değiyor: aradaki en boş sütun / satır
col = (al[6:226, 1150:1240] > 40).sum(0); GEM = 1150 + int(np.argmin(col))
row = (al[560:625, 111:1375] > 40).sum(1); YUK = 560 + int(np.argmin(row))
PARCA = {   # ad: (x0, x1, y0, y1, eşik, en büyük genişlik)
  'kivilcim':  (40, 284, 8, 228, 12, 160),
  'mermiKir':  (302, 530, 15, 219, 12, 160),
  'zehirDamla': (560, 679, 14, 203, 30, 64),     # en büyük damla (saat 1 yönüne fırlıyor)
  'ip':        (856, 894, 6, 235, 30, 24),
  'odulBos':   (939, GEM, 4, 228, 30, 200),
  'odulDolu':  (GEM, 1450, 4, 228, 30, 200),
  'barBos':    (160, 1352, 222, 350, 30, 900),
  'barDolu':   (160, 1352, 350, 478, 30, 900),
  'yukBos':    (108, 1378, 474, YUK, 30, 900),
  'yukDolu':   (108, 1378, YUK, 717, 30, 900),
  'alBtn':     (100, 510, 870, 1025, 30, 240),
  'rozet':     (544, 708, 864, 1030, 30, 96),
  'secim':     (775, 1010, 840, 1045, 30, 200),
  'tabela':    (1062, 1382, 883, 1005, 30, 320),
}
CIFT = [('odulBos', 'odulDolu'), ('barBos', 'barDolu'), ('yukBos', 'yukDolu')]   # boş / dolu aynı kırpımla (üst üste otursun)
def temizle(ad):
  x0, x1, y0, y1, esik, gmax = PARCA[ad]
  p = A[y0:y1, x0:x1].copy()
  m = p[:, :, 3] >= esik
  # ana gövdeye bağlı olmayan küçük kırıntılar (kenar çizgileri) silinir
  lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3))
  if n > 1:
    boy = ndimage.sum(m, lab, range(1, n + 1)); m &= np.isin(lab, [i + 1 for i, b in enumerate(boy) if b >= boy.max() * 0.02])
  p[~m] = 0
  ys, xs = np.where(m)
  return p, (xs.min(), xs.max() + 1, ys.min(), ys.max() + 1)
sonuc = {ad: temizle(ad) for ad in PARCA}
kutu = {ad: k for ad, (p, k) in sonuc.items()}
for a_, b_ in CIFT:
  ka, kb = kutu[a_], kutu[b_]
  ortak = (min(ka[0], kb[0]), max(ka[1], kb[1]), min(ka[2], kb[2]), max(ka[3], kb[3]))
  kutu[a_] = kutu[b_] = ortak
for ad, (p, _) in sonuc.items():
  x0, x1, y0, y1 = kutu[ad]
  H, W = max(y1, p.shape[0]), max(x1, p.shape[1])
  t = np.zeros((H, W, 4), np.uint8); t[:p.shape[0], :p.shape[1]] = p
  im = Image.fromarray(t[y0:y1, x0:x1])
  gmax = PARCA[ad][5]
  if im.width > gmax: im = im.resize((gmax, round(im.height * gmax / im.width)), Image.LANCZOS)
  im.save(KOK + '/assets/ui/' + ad + '.png', optimize=True)
  print(ad, im.size)

# v1.31: ip ince çizilince (oyunda ~3 px) ince lifler sönük kalıyordu: yatayda 4'er px en büyük değerle 6 px'e indirilir,
# alfa ve parlaklık artırılır (her yerde belirgin, düzgün ip)
ip = np.array(Image.open(KOK + '/assets/ui/ip.png').convert('RGBA')).astype(float)
h, w = ip.shape[:2]; g = w // 6
yeni = np.zeros((h, 6, 4))
for i in range(6):
  dilim = ip[:, i * g:(i + 1) * g]
  k = np.argmax(dilim[:, :, 3], axis=1)
  yeni[:, i] = dilim[np.arange(h), k]
yeni[:, :, 3] = np.clip(yeni[:, :, 3] * 1.7, 0, 255)
yeni[:, :, :3] = np.clip(yeni[:, :, :3] * 1.1 + 20, 0, 255)
Image.fromarray(yeni.astype(np.uint8)).save(KOK + '/assets/ui/ip.png', optimize=True)
print('ip', yeni.shape)
