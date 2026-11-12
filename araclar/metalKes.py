# 4. bölüm demosu (v1.66): metal karo sayfaları (3×3, siyah zemin) → karo/metal_<kat>.png (9 karo yan yana, her biri 128 px)
#   kaynak/metal_pasli.png → pasli (alt kat) · metal_koyu.png → koyu (orta kat) · metal_parlak.png → parlak (üst kat)
# Her karo kendi kutusundan kırpılır (köşe yuvarlaklığı kalmasın diye kenardan %2 içeri), kare yapılır.
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
B = 128
for ad in ('pasli', 'koyu', 'parlak'):
    im = Image.open(KOK + '/assets/kaynak/metal_' + ad + '.png').convert('RGB')
    a = np.array(im).astype(int)
    m = a.max(-1) > 28
    # ızgara: satır / sütun doluluğu düşük olan yerler oluk; aradaki 3 dolu aralık karo
    def araliklar(oran):
        dolu = oran > 0.35
        r, bas = [], None
        for i, d in enumerate(np.r_[dolu, False]):
            if d and bas is None: bas = i
            if not d and bas is not None:
                if i - bas > 100: r.append((bas, i))
                bas = None
        return r
    sat, sut = araliklar(m.mean(1)), araliklar(m.mean(0))
    assert len(sat) == 3 and len(sut) == 3, (ad, sat, sut)
    k = [(slice(a, b), slice(c, d)) for a, b in sat for c, d in sut]
    out = Image.new('RGB', (B * 9, B))
    for i, s in enumerate(k):
        y0, y1, x0, x1 = s[0].start, s[0].stop, s[1].start, s[1].stop
        py, px = int((y1 - y0) * 0.02), int((x1 - x0) * 0.02)
        out.paste(im.crop((x0 + px, y0 + py, x1 - px, y1 - py)).resize((B, B), Image.LANCZOS), (i * B, 0))
    out.save(KOK + '/assets/karo/metal_' + ad + '.png', optimize=True)
    print(ad, 'ok')
