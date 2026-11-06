# v1.00: düşmanlara ayrı GIF'lerden ek animasyon şeritleri (assets/dusman/<ad>.png), ana şerit (dusmanKes.py) değişmeden.
# Ölçek: GIF'in ilk karesinin genişliği = ana şeridin ilk karesinin genişliği (oyunda aynı s ile çizilir).
# Yatay: ilk karelerin kutu ortası ana şeritteki ilk karenin kutu ortasına (hücre ortasına göre) hizalanır.
# ayak = ilk karenin alt kenarı (ana şeridin ayak çizgisiyle eşlenir). Oyun bu hücreye geçerken origin / gövde ofsetini ayarlar.
import json, re
import numpy as np
from PIL import Image, ImageSequence
KOK = __file__.rsplit('/araclar/', 1)[0]
EK = {   # ad: (düşman, kaynak GIF, fps, döngü)
    'bitkiOl': ('bitki', 'bitki_ol.gif', 9, False),            # v0.99: yerinde ölüm
    'bitkiBekle': ('bitki', 'bitki_bekle.gif', 7, True),       # v1.00: saldırmazken duruş
    'kertenkeleOl': ('kertenkele', 'kertenkele_ol.gif', 7, False),   # v1.00: yerinde ölüm, sonra 1 sn bekleyip solar
    'kediOl': ('kedi', 'kedi_ol.gif', 7, False),               # v1.00: bıçaklı leopar
    'domuzOl': ('domuz', 'domuz_ol.gif', 6, False),            # v1.00: yaban domuzu
    'kopekOl': ('kopek', 'kopek_ol.gif', 7, False),            # v1.01: mızraklı
}
ap = KOK + '/js/veri/assetlar.js'; s = open(ap, encoding='utf8').read()
D = json.loads(re.search(r'ASSETLER.dusman = (\{.*\});', s).group(1))
meta = {}
for ad, (dus, gif, fps, dongu) in EK.items():
    d = D[dus]; b = Image.open(KOK + '/assets/dusman/' + dus + '.png').crop((0, 0, d['w'], d['h'])).getbbox()
    fr = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(KOK + '/assets/kaynak/' + gif))]
    g0 = fr[0].getbbox(); r = (b[2] - b[0]) / (g0[2] - g0[0])
    W, H = round(fr[0].width * r), round(fr[0].height * r)
    dx = round(((b[0] + b[2]) / 2 - d['w'] / 2) - ((g0[0] + g0[2]) / 2 * r - W / 2))
    serit = Image.new('RGBA', (W * len(fr), H))
    for i, f in enumerate(fr):
        a = np.array(f.resize((W, H), Image.LANCZOS)); a[a[:, :, 3] < 30] = 0
        c = Image.new('RGBA', (W, H)); c.paste(Image.fromarray(a), (dx, 0)); serit.paste(c, (i * W, 0))
    serit.save(KOK + '/assets/dusman/' + ad + '.png', optimize=True)
    meta[ad] = {'dusman': dus, 'w': W, 'h': H, 'ayak': round(g0[3] * r), 'kare': len(fr), 'fps': fps, 'dongu': dongu}
s = re.sub(r'\n// Bitki ölüm[^\n]*\nASSETLER.bitkiOl = [^\n]*;\n', '\n', s)
s = re.sub(r'\n// Düşman ek şeritleri[^\n]*\nASSETLER.ekKare = [^\n]*;\n', '\n', s)
s += '\n// Düşman ek şeritleri (araclar/ekKareKes.py): hücre, ayak çizgisi, fps (ana şerit ölçeğinde)\nASSETLER.ekKare = ' + json.dumps(meta) + ';\n'
open(ap, 'w', encoding='utf8').write(s); print(meta)
