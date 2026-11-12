# v1.30: örümcek karelerindeki kısa ip çizimi silinir (kalçadan yukarısı); ipin kalçaya bağlandığı nokta her kare için
# ASSETLER.dusman.orumcek.ip = [[x, y], …] (kare pikseli) olarak yazılır. Oyunda ip tavandan bu noktaya ui_ip ile çizilir.
# dusmanKes.py yeniden çalıştırılırsa bu betik de sonra çalıştırılmalı.
import json, re
import numpy as np
from PIL import Image
KOK = __file__.rsplit('/araclar', 1)[0]
YOL = KOK + '/assets/dusman/orumcek.png'
im = np.array(Image.open(YOL).convert('RGBA'))
A = open(KOK + '/js/veri/assetlar.js').read()
m = re.search(r'ASSETLER.dusman = (\{.*?\});\n', A); D = json.loads(m.group(1)); O = D['orumcek']
W, n = O['w'], im.shape[1] // O['w']
ip = []
for f in range(n):
  fr = im[:, f * W:(f + 1) * W]
  a = fr[:, :, 3] > 30
  # ip sütunu: üst 20 satırda en çok dolu dar sütun
  cx = int(np.argmax(a[:20].sum(0)))
  y = 0
  while y < fr.shape[0]:
    yan = a[y, max(0, cx - 7):max(0, cx - 3)].any() or a[y, cx + 4:cx + 8].any()
    if yan: break   # gövdeye (kalçaya) ulaşıldı
    fr[y, max(0, cx - 3):cx + 4] = 0
    y += 1
  ip.append([cx, y + 2])
Image.fromarray(im).save(YOL, optimize=True)
O['ip'] = ip
A = A[:m.start(1)] + json.dumps(D, separators=(', ', ': '), ensure_ascii=False) + A[m.end(1):]
open(KOK + '/js/veri/assetlar.js', 'w').write(A)
print(ip)
