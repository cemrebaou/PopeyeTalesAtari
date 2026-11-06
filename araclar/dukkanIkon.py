# v1.10: dükkan simgeleri. kaynak/dukkan_ikonlar.png (4×3 yetenek + 5 kalp + 5 can) → assets/dukkan/ikon.png
# Her simge saydam boşluklarla ayrılmış bileşen olarak bulunur, satır-sütun sırasıyla dizilir, 112×112 kareye getirilir.
# Baston vuruşu (3) ve kancalı kol (11) kullanılmaz. Meta: ASSETLER.dukkan.ikon = {boyut, sut, ad: kare}
import json, re
import numpy as np
from PIL import Image
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
AD = ['ciftZipla', 'kasaKir', 'tasKir', None, 'asilma', 'duvarZipla', 'pogo', 'itTek', 'itCift', 'cekTek', 'cekCift', None,
      'kalp1', 'kalp2', 'kalp3', 'kalp4', 'kalp5', 'can1', 'can2', 'can3', 'can4', 'can5']
B, SUT = 112, 5
a = np.array(Image.open(KOK + '/assets/kaynak/dukkan_ikonlar.png').convert('RGBA')); a[a[:, :, 3] < 40] = 0
m = ndimage.binary_opening(a[:, :, 3] > 100, iterations=2)
lab, n = ndimage.label(m)
kut = [(s[0].start, s[0].stop, s[1].start, s[1].stop) for s in ndimage.find_objects(lab) if s[0].stop - s[0].start > 150 and s[1].stop - s[1].start > 150]
kut.sort(key=lambda k: (round((k[0] + k[1]) / 2 / 120), k[2]))
assert len(kut) == len(AD), len(kut)
secilen = [(ad, k) for ad, k in zip(AD, kut) if ad]
sat = -(-len(secilen) // SUT)
out = Image.new('RGBA', (B * SUT, B * sat)); kare = {}
for i, (ad, (y0, y1, x0, x1)) in enumerate(secilen):
    out.paste(Image.fromarray(a[y0:y1, x0:x1]).resize((B, B), Image.LANCZOS), ((i % SUT) * B, (i // SUT) * B)); kare[ad] = i
out.save(KOK + '/assets/dukkan/ikon.png', optimize=True)
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Dükkan simgeleri[^\n]*\nASSETLER.dukkanIkon = [^\n]*;\n', '\n', s)
s += '\n// Dükkan simgeleri (araclar/dukkanIkon.py)\nASSETLER.dukkanIkon = ' + json.dumps({'boyut': B, 'kare': kare}) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(kare)
