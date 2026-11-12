# Ayarlar / HUD arayüz görselleri (v1.65 — yeni orman temalı sayfalar, saydam zeminli):
#   kaynak/ikonlar.png (6×6 madalyon simge) → ui/ik_<ad>.png
#   kaynak/cerceveler.png → ui/ayarPanel.png, ui/ayarBaslik.png, ui/yetSerit.png, ui/yetAd.png
# Kenardaki sarı / kırmızı yarı saydam hale atılır (alfa < 200 silinir), kenar 1 px yumuşatılır.
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
KOK = __file__.rsplit('/araclar/', 1)[0]
UI = KOK + '/assets/ui/'

def parcalar(yol):
    im = np.array(Image.open(yol).convert('RGBA'))
    lab, n = ndimage.label(im[:, :, 3] > 200)
    boy = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
    k = [s for i, s in enumerate(ndimage.find_objects(lab)) if boy[i] > 3000]
    k.sort(key=lambda s: (round(s[0].start / 40), s[1].start))   # satır satır, soldan sağa
    return im, k

def kes(im, s, ad, boyut=None, pay=4):
    y0, y1, x0, x1 = s[0].start - pay, s[0].stop + pay, s[1].start - pay, s[1].stop + pay
    k = im[max(0, y0):y1, max(0, x0):x1].copy()
    m = k[:, :, 3] > 200
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m); b = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
    m = np.isin(lab, [i + 1 for i in range(n) if b[i] > 40])   # kopuk küçük lekeler atılır, yaprak uçları kalır
    a = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    k[:, :, 3] = np.minimum(np.array(a), k[:, :, 3].astype(int) * 0 + 255)
    out = Image.fromarray(k, 'RGBA'); out = out.crop(out.getbbox())
    if boyut: out = out.resize(boyut, Image.LANCZOS)
    out.save(UI + ad + '.png', optimize=True)
    return out.size

# --- simgeler (satır, sütun) ---
AD = {'yetenekler': (0, 5), 'ayarlar': (1, 2), 'kapat': (1, 4), 'amb': (2, 0), 'ambKapali': (2, 1), 'ses': (2, 2), 'sesKapali': (2, 3),
      'muzik': (2, 4), 'muzikKapali': (2, 5), 'gr0': (4, 1), 'gr1': (4, 2), 'gr2': (4, 3)}
im, k = parcalar(KOK + '/assets/kaynak/ikonlar.png')
assert len(k) == 32, len(k)
for ad, (r, c) in AD.items(): kes(im, k[r * 6 + c], 'ik_' + ad, (192, 192))
# --- çerçeveler (sayfadaki sıra: 0 dik panel, 1 geniş panel, 2 orta panel, 3 başlık levhası, … 10 uzun satır levhası, 12 küçük hap)
im, k = parcalar(KOK + '/assets/kaynak/cerceveler.png')
assert len(k) == 16, len(k)
SEC = {'ayarPanel': 2, 'ayarBaslik': 3, 'yetSerit': 10, 'yetAd': 12}
for ad, i in SEC.items(): print(ad, kes(im, k[i], ad))
