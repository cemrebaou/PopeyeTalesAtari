# Arayüz görselleri kesici (v0.44). Kaynak: assets/kaynak/ui_seti.png (kullanıcı görseli, şeffaf).
# Çıktı: assets/ui/<ad>.png ve js/veri/assetlar.js → ASSETLER.ui (ad listesi). Çalıştırma: python3 araclar/uiKes.py
import json, re
import numpy as np
from PIL import Image
KOK = __file__.rsplit('/araclar/', 1)[0]
im = np.array(Image.open(KOK + '/assets/kaynak/ui_seti.png').convert('RGBA'))
A = im[:, :, 3] > 100
def seg(v):
    s, inr = [], False
    for i, x in enumerate(v):
        if x and not inr: st, inr = i, True
        if not x and inr: s.append((st, i)); inr = False
    if inr: s.append((st, len(v)))
    return s
SATIR = [
    ['kalp', 'kalpBos', 'sapka', 'elmas', 'altin'],
    ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'rArti', 'rBolu'],
    ['t_sol', 't_sag', 't_yukari', 't_asagi', 't_zipla', 't_saldir', 't_cek'],
    ['tb_sol', 'tb_sag', 'tb_yukari', 'tb_asagi', 'tb_zipla', 'tb_saldir', 'tb_cek'],
    ['panel'],
]
adlar = []
for (y0, y1), isimler in zip(seg(A.sum(1) > 0), SATIR):
    parca = seg(A[y0:y1].sum(0) > 0)
    assert len(parca) == len(isimler), (isimler[0], len(parca))
    for (x0, x1), ad in zip(parca, isimler):
        s = im[y0:y1, x0:x1]; b = s[:, :, 3] > 0
        ys = np.where(b.any(1))[0]
        if ad.startswith('r'):   # rakamlar: aynı satır yüksekliği (taban hizası korunur)
            Image.fromarray(s).save(KOK + '/assets/ui/' + ad + '.png', optimize=True)
        else:
            Image.fromarray(s[ys[0]:ys[-1] + 1]).save(KOK + '/assets/ui/' + ad + '.png', optimize=True)
        adlar.append(ad)
# v0.51: yaşam ikonu yeni şapka (karakterin şapkası, çapalı) — assets/kaynak/ui_ek.png sol alt
ek = np.array(Image.open(KOK + '/assets/kaynak/ui_ek.png').convert('RGBA'))[570:712, 40:255].copy()
ek[ek[:, :, 3] < 40] = 0
m = ek[:, :, 3] > 40; ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
Image.fromarray(ek[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]).save(KOK + '/assets/ui/sapka.png', optimize=True)

ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'// Arayüz görselleri.*?;\n', '', s, flags=re.S)
s += '// Arayüz görselleri (araclar/uiKes.py): assets/ui/<ad>.png\nASSETLER.ui = ' + json.dumps(adlar) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(len(adlar))
