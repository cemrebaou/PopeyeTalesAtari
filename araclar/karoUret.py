# Karo seti ve bölüm karo ızgaraları üretici (v0.20).
# Kaynak: assets/kaynak/zemin_seti.png (kullanıcının gönderdiği tek sayfa set).
# Çıktı: assets/tileset.png, assets/selaleUst/Orta/Dip.png, assetlar.js 'tile' + 'tileset' kısmı,
#        level1.js içindeki 'on', 'arka', 'selaleler' alanları.
# Çalıştırma (repo kökünde): python3 araclar/karoUret.py
# NOT: v0.20'de eski (toprak/çimen) sistemden tek seferlik dönüşüm için yazıldı; eski bant/toprak bilgisini
# araclar/eski_arka.json ve level1.js 'toprak' alanından okur. Tekrar çalıştırmak için git'teki v0.19 level1.js gerekir.
import re, json, random
from PIL import Image, ImageEnhance

KOK = __file__.rsplit('/araclar/', 1)[0]
KAYNAK = KOK + '/assets/kaynak/zemin_seti.png'
B, EX, KOLON = 128, 2, 12          # kaynak karo boyu, kenar uzatma, sütun sayısı
KOYU = 0.5                          # arka plan karartma

src = Image.open(KAYNAK).convert('RGBA')
# Satır y başlangıçları ve yükseklikleri, sütun x başlangıçları (kaynak görselden ölçüldü)
SAT = [(21, 133), (171, 131), (319, 131), (467, 131), (613, 128)]
KOL = [15, 160, 302, 446, 588, 733, 875, 1018, 1162, 1306]
GEN = [129, 127, 129, 128, 129, 127, 128, 129, 128, 128]
MALZ = ['k', 's', 'h', 'w', 't']    # kaya, parke taş (yosunlu), tapınak tuğlası, tahta, topraklı kök
PARCA = ['F0', 'F1', 'F2', 'F3', 'TL0', 'TM0', 'TM1', 'TR0', 'TL1', 'TR1']

def kes(x, y, w, h, kare=True):
    im = src.crop((x, y, x + w, y + h))
    return im.resize((B, B), Image.LANCZOS) if kare else im

def koyu(im, f=KOYU):
    r, g, b, a = im.split()
    rgb = ImageEnhance.Brightness(Image.merge('RGB', (r, g, b))).enhance(f)
    return Image.merge('RGBA', (*rgb.split(), a))

karolar = []   # (ad, görsel)
for m, (y, h) in zip(MALZ, SAT):
    for p, x, w in zip(PARCA, KOL, GEN):
        karolar.append((m + p, kes(x + 1, y + 1, w - 2, h - 2)))
# Arka plan: aynı karolar karartılmış ('a' önekli)
for ad, im in list(karolar):
    karolar.append(('a' + ad, koyu(im)))
# Süsler: tuğla arka planlı, karartılmış; pencere/delik içi koyu gece rengi
SUS = [('dpencere', 15, 129), ('ddelik', 160, 127), ('dsutunU', 302, 100), ('dsutunO', 417, 95),
       ('dsutunA', 528, 98), ('dasma', 642, 114), ('dmesale', 772, 117)]
for ad, x, w in SUS:
    im = kes(x + 1, 757, w - 2, 136, kare=False)
    im = im.resize((round(im.width * B / im.height), B), Image.LANCZOS)
    alt = Image.new('RGBA', (B, B), (14, 18, 26, 255))
    if ad.startswith('dsutun') or ad in ('dasma', 'dmesale'):
        alt = Image.alpha_composite(alt, karolar[MALZ.index('h') * 10 + 0][1])   # yanlara tuğla
    alt.alpha_composite(im, ((B - im.width) // 2, 0))
    karolar.append((ad, koyu(alt, 0.6)))
# Su ve sis (şimdilik bölümde yok, ileride kullanılır)
for ad, x, w in [('wsu0', 15, 141), ('wsu1', 192, 141), ('wsu2', 370, 142), ('wsuDerin', 545, 142),
                 ('wsuSol', 725, 141), ('wsuSag', 903, 142), ('sis', 1089, 142)]:
    karolar.append((ad, kes(x + 1, 923, w - 2, 159)))

# Tileset: her karo kenarı EX px uzatılır (dikiş/kanama olmasın)
P = B + 2 * EX
satir = (len(karolar) + KOLON - 1) // KOLON
ts = Image.new('RGBA', (KOLON * P, satir * P), (0, 0, 0, 0))
for i, (ad, im) in enumerate(karolar):
    ox, oy = (i % KOLON) * P, (i // KOLON) * P
    big = im.resize((B + 2 * EX, B + 2 * EX), Image.NEAREST)
    ts.paste(big, (ox, oy))
    ts.paste(im, (ox + EX, oy + EX))
ts.save(KOK + '/assets/tileset.png', optimize=True)
NO = {ad: i for i, (ad, _) in enumerate(karolar)}

# Şelale parçaları (oyunda 2 kare = 64 px genişlik)
for ad, x, w in [('selaleUst', 906, 166), ('selaleOrta', 1090, 164), ('selaleDip', 1272, 162)]:
    im = src.crop((x, 756, x + w, 893)).resize((256, 212), Image.LANCZOS)
    im.save(KOK + '/assets/' + ad + '.png', optimize=True)

# assetlar.js: tile + tileset kısmı yeniden yazılır, obje kısmı korunur
ap = KOK + '/assetlar.js'
a = open(ap, encoding='utf8').read()
a = re.sub(r'"tile": \{.*?\},\n "tileset": \{.*?\}', '"tile": ' + json.dumps(NO, indent=1).replace('\n', '\n ')
           + ',\n "tileset": ' + json.dumps({'boyut': B, 'extrude': EX, 'kolon': KOLON}, indent=1).replace('\n', '\n '),
           a, count=1, flags=re.S)
open(ap, 'w', encoding='utf8').write(a)

# ---- Bölüm ızgaraları ----
lp = KOK + '/level1.js'
L = open(lp, encoding='utf8').read()
alf = re.search(r"alfabe: '(.*?)',", L).group(1)
def alan(ad):
    return re.search(r"\n  " + ad + r": \[(.*?)\n  \]", L, re.S)
def sayilar(ad):
    m = alan(ad)
    return [list(map(int, s.split(','))) for s in re.findall(r"\[([-\d,]+)\]", m.group(1))] if m else []
def yazilar(ad):
    return re.findall(r"'([^']*)'", alan(ad).group(1))
T = int(re.search(r"karo: (\d+)", L).group(1))
GX, GY = int(re.search(r"genislik: (\d+)", L).group(1)) // T, int(re.search(r"yukseklik: (\d+)", L).group(1)) // T

# Eski arka ızgara: bant bilgisi (her satırın baskın bandı) ve şelale sütunları
ESKI = {'aharabe': 'h', 'atas': 's', 'akaya': 'k', 'akok': 't'}
eskiNo = json.loads(open(KOK + '/araclar/eski_arka.json').read())  # eski karo no → ad
eskiArka = yazilar('arka')
def eskiAd(ch):
    i = alf.index(ch) - 1
    return eskiNo.get(str(i), '') if i >= 0 else ''
bant = []
for y in range(GY):
    say = {}
    for ch in eskiArka[y]:
        n = re.sub(r'U?\d$', '', eskiAd(ch))
        if n in ESKI: say[n] = say.get(n, 0) + 1
    bant.append(ESKI[max(say, key=say.get)] if say else 'k')

rnd = random.Random(7)
def ch(ad): return alf[NO[ad] + 1]

# Arka: bant dolguları, bant üst sırasında üst kenar, eski süsler aynı yerde, şelale yerine dolgu
arka, su = [], set()
for y in range(GY):
    r = ''
    for x in range(GX):
        e = eskiAd(eskiArka[y][x])
        m = bant[y]
        if e.startswith('wselale'): su.add((x, y))
        if e.startswith('d'): r += ch(e)
        elif y > 0 and bant[y - 1] != m: r += ch('a' + m + 'TM' + str(rnd.randint(0, 1)))
        else: r += ch('a' + m + 'F' + str(rnd.randint(0, 3)))
    arka.append(r)
# Şelaleler: dikey sütun grupları → [x, ustY, altY] (piksel)
sutun = {}
for x in range(GX):
    y = 0
    while y < GY:
        if (x, y) in su:
            y0 = y
            while (x, y) in su: y += 1
            sutun.setdefault((y0, y), []).append(x)
        y += 1
selaleler = []
for (y0, y1), xs in sorted(sutun.items()):
    xs.sort(); g = [xs[0]]
    for x in xs[1:] + [None]:
        if x is not None and x == g[-1] + 1: g.append(x); continue
        selaleler.append([g[0] * T, len(g) * T, y0 * T, y1 * T]); g = [x]

# Ön zemin: çarpışma bloklarından otomatik döşeme
dolu = [[None] * GX for _ in range(GY)]
def isaretle(x, y, w, h, m):
    for j in range(y // T, (y + h) // T):
        for i in range(x // T, (x + w) // T):
            if 0 <= i < GX and 0 <= j < GY: dolu[j][i] = m
toprak = sayilar('toprak')
for x, y, w, h in sayilar('bloklar'): isaretle(x, y, w, h, 's')
for x, y, w, h in toprak: isaretle(x, y, w, h, 't')
for x, y, w, h in sayilar('basamaklar'): isaretle(x, y, w, h, 's')
for x, y in sayilar('kayalar'): isaretle(x, y, T, T, 's')
def bos(i, j):
    if i < 0 or i >= GX or j < 0 or j >= GY: return False
    return dolu[j][i] is None
on = []
for j in range(GY):
    r = ''
    for i in range(GX):
        m = dolu[j][i]
        if m is None: r += alf[0]; continue
        if bos(i, j - 1):
            sol, sag = bos(i - 1, j), bos(i + 1, j)
            if sol and not sag: p = 'TL' + str(rnd.randint(0, 1))
            elif sag and not sol: p = 'TR' + str(rnd.randint(0, 1))
            else: p = 'TM' + str(rnd.randint(0, 1))
        else: p = 'F' + str(rnd.randint(0, 3))
        r += ch(m + p)
    on.append(r)

def yaz_alan(metin, ad, icerik, yorum):
    blok = '  ' + yorum + '\n  ' + ad + ': [\n' + icerik + '\n  ]'
    m = re.search(r"(\n  //[^\n]*)*\n  " + ad + r": \[.*?\n  \]", metin, re.S)
    if m: return metin[:m.start()] + '\n' + blok + metin[m.end():]
    return metin.replace('\n  on: [', '\n' + blok + ',\n  on: [', 1)
def sil_alan(metin, ad):
    return re.sub(r"(\n  //[^\n]*)*\n  " + ad + r": \[.*?\n  \],?", '', metin, count=1, flags=re.S)
L = yaz_alan(L, 'selaleler', ',\n'.join('    ' + json.dumps(s).replace(' ', '') for s in selaleler), "// [x, w, ustY, altY] şelaleler (piksel)")
L = yaz_alan(L, 'on', ',\n'.join("    '" + r + "'" for r in on), "// zemin karoları (çarpışma bloklarından otomatik döşendi: parke taş / topraklı kök)")
L = yaz_alan(L, 'arka', ',\n'.join("    '" + r + "'" for r in arka), "// arka plan karoları (karartılmış; bantlar: tapınak tuğlası → parke taş → kaya → toprak)")
for ad in ('cimen', 'kenarlar', 'toprak'): L = sil_alan(L, ad)
L = re.sub(r"\n  yeraltiY: \d+,[^\n]*", '', L)
open(lp, 'w', encoding='utf8').write(L)
print(len(karolar), 'karo,', len(selaleler), 'şelale')
