# 4. bölüm patronu Paslı Dev (v1.70): kaynak/robot_saldir.gif (10 kare: yumruk + namlu ateşi), robot_yuru.gif (8),
# robot_baygin.gif (8), robot_zipla.gif (8) → dusman/robot.png (7 sütun; kareler sırayla saldir, yuru, baygin, zipla);
# kaynak/robot_mermi.gif (8 kare kızgın perçin) → dusman/robotMermi.png (yatay şerit). Ölçüler ASSETLER.robot.
# GIF'ler farklı boyda çizilmiş: OLCEK ile aynı boya getirilir (gövde genişliğinden / namlu çapından ölçüldü).
# Ayak çizgisi ve gövde ortası her karede aynı yerde; zıplama karelerinde her karenin en altı ayak çizgisine oturur
# (zıplamayı oyun yaptırır). Karakter SOLA bakar.
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
GIF = [('saldir', 1.0, 0, False), ('yuru', 303 / 379, 0, False), ('baygin', 0.72, 0, False), ('zipla', 303 / 349, 7, True)]   # ad, ölçek, çapa karesi, her kare yere
KUCULT = 0.55
OYUN_BOY = 150     # ayakta (saldırı ilk karesi, duman dahil) oyundaki boy — dusmanOlcek öncesi
SUT, PAY = 7, 4
YUMRUK, ATES = [4, 5], 6        # saldırı kareleri: yumruğun yerde olduğu kareler, namlunun parladığı kare
NAMLU = (253, 277)              # robot_saldir.gif ATES karesinde namlu ağzının ortası (kaynak px)

def kareler(ad):
    out = []
    for k in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/robot_' + ad + '.gif')):
        a = np.array(k.convert('RGBA')); a[a[:, :, 3] < 128] = 0
        out.append(a)
    return out
def olcu(a):
    ys, xs = np.where(a[:, :, 3] > 0)
    return xs.min(), ys.min(), xs.max(), ys.max()

liste, anim, bilgi = [], {}, {}
for ad, olc, ck, yere in GIF:
    K = kareler(ad); olc *= KUCULT
    x0, y0, x1, y1 = olcu(K[ck]); h = y1 - y0 + 1
    bant = K[ck][y0 + int(h * 0.45):y0 + int(h * 0.7), :, 3] > 0
    capa = np.where(bant)[1].mean()
    yer = max(olcu(a)[3] for a in K) + 1
    anim[ad] = list(range(len(liste), len(liste) + len(K)))
    bilgi[ad] = (olc, yer, capa)
    for a in K: liste.append((a, olc, olcu(a)[3] + 1 if yere else yer, capa))
yari = ust = 0
for a, olc, yer, capa in liste:
    x0, y0, x1, y1 = olcu(a)
    yari = max(yari, (capa - x0) * olc, (x1 + 1 - capa) * olc); ust = max(ust, (yer - y0) * olc)
HW = int(np.ceil(yari)) * 2 + 2 * PAY; HH = int(np.ceil(ust)) + 2 * PAY; AYAK = HH - PAY
out = Image.new('RGBA', (HW * SUT, HH * -(-len(liste) // SUT)), (0, 0, 0, 0))
for i, (a, olc, yer, capa) in enumerate(liste):
    g = Image.fromarray(a)
    g = g.resize((round(g.width * olc), round(g.height * olc)), Image.LANCZOS)
    out.alpha_composite(g, ((i % SUT) * HW + round(HW / 2 - capa * olc), (i // SUT) * HH + round(AYAK - yer * olc)))
out.save(KOK + '/assets/dusman/robot.png', optimize=True)
olc, yer, capa = bilgi['saldir']
S = kareler('saldir')
x0, y0, x1, y1 = olcu(S[0])
UST = round(AYAK - (yer - y0) * olc)
yumruk = round(max(capa - olcu(S[k])[0] for k in YUMRUK) * olc)          # yumruğun en ileri ucu (çapadan ileri)
namlu = [round((capa - NAMLU[0]) * olc), round((yer - NAMLU[1]) * olc)]   # [ileri, yukarı]

# mermi: kafanın sol kenarına göre hizala (kafa sabit, kıvılcım / duman arkada oynar)
M = []
for k in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/robot_mermi.gif')):
    a = np.array(k.convert('RGBA')); a[a[:, :, 3] < 128] = 0; M.append(a)
sag = max(olcu(a)[2] - olcu(a)[0] for a in M) + 1
ustM = min(olcu(a)[1] for a in M); altM = max(olcu(a)[3] for a in M) + 1
mo = 56 / (altM - ustM)
mw, mh = int(np.ceil(sag * mo)) + 4, 56 + 4
ms = Image.new('RGBA', (mw * len(M), mh), (0, 0, 0, 0))
for i, a in enumerate(M):
    x0 = olcu(a)[0]
    g = Image.fromarray(a[ustM:altM, x0:x0 + sag])
    ms.alpha_composite(g.resize((round(g.width * mo), 56), Image.LANCZOS), (i * mw + 2, 2))
ms.save(KOK + '/assets/dusman/robotMermi.png', optimize=True)
kafa = round((olcu(M[0])[2] - olcu(M[0])[0]) * mo)   # ilk karede (dumansız) gövde boyu: çarpışma kutusu için

anim['ol'] = [anim['baygin'][0]]
meta = {'w': HW, 'h': HH, 'ayak': AYAK, 'ust': UST, 'boy': OYUN_BOY, 'anim': anim,
        'yumruk': YUMRUK, 'ates': ATES, 'yumrukUc': yumruk, 'namlu': namlu,
        'mermi': {'w': mw, 'h': mh, 'kare': len(M), 'kafa': kafa, 'boy': 26}}
ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
s = re.sub(r'\n// Paslı Dev[^\n]*\nASSETLER.robot = [^\n]*;\n', '\n', s)
s += '\n// Paslı Dev (araclar/robotKes.py): 4. bölüm patronu — hücre, ayak / üst çizgisi, kareler; yumrukUc: çapadan ileri px; namlu: [ileri, yukarı] (hücre px)\nASSETLER.robot = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s)
print(meta, out.size, ms.size)
