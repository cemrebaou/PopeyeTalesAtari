# Zemin karo ızgarasını (level1.js → 'on') çarpışma bloklarından yeniden döşer.
# Çalıştırma (repo kökünde): python3 araclar/zeminDose.py   — bloklar değişince çalıştır.
# Malzeme: yeraltı (YERALTI_SATIR ve altı) → topraklı kök 't', üstü → gri parke taş 's'.
# Yüzen zeminler, ara kayalar, basamaklar ve taş bloklar karo almaz (kendi görselleri var),
# ama komşu sayılır (üstlerindeki/altlarındaki zemin kenarı buna göre seçilir).
import re, json, random
KOK = __file__.rsplit('/araclar/', 1)[0]
YERALTI_SATIR = 115          # 3680 px / 32
lp = KOK + '/level1.js'
L = open(lp, encoding='utf8').read()
NO = json.loads(re.search(r'"tile": (\{.*?\})', open(KOK + '/assetlar.js', encoding='utf8').read(), re.S).group(1))
alf = re.search(r"alfabe: '(.*?)',", L).group(1)
def sayilar(ad):
    m = re.search(r"\n  " + ad + r": \[(.*?)\n  \]", L, re.S)
    return [s.split(',') for s in re.findall(r"\[([-\d,'a-z]+)\]", m.group(1))] if m else []
T = int(re.search(r"karo: (\d+)", L).group(1))
GX = int(re.search(r"genislik: (\d+)", L).group(1)) // T
GY = int(re.search(r"yukseklik: (\d+)", L).group(1)) // T
dolu = [[0] * GX for _ in range(GY)]   # 0 boş, 1 karo, 2 karosuz dolu
def isaretle(x, y, w, h, v):
    for j in range(y // T, (y + h) // T):
        for i in range(x // T, (x + w) // T):
            if 0 <= i < GX and 0 <= j < GY: dolu[j][i] = v
for b in sayilar('bloklar'): isaretle(*map(int, b), 1)
for b in sayilar('yuzenler'): isaretle(int(b[0]), int(b[1]), int(b[2]), T, 2)
for b in sayilar('basamaklar'): isaretle(*map(int, b), 2)
for b in sayilar('kayalar') + sayilar('taslar'): isaretle(int(b[0]), int(b[1]), T, T, 2)
def bos(i, j):
    if i < 0 or i >= GX or j < 0 or j >= GY: return False
    return dolu[j][i] == 0
rnd = random.Random(7)
on = []
for j in range(GY):
    r = ''
    for i in range(GX):
        if dolu[j][i] != 1: r += alf[0]; continue
        m = 't' if j >= YERALTI_SATIR else 's'
        if bos(i, j - 1):
            sol, sag = bos(i - 1, j), bos(i + 1, j)
            p = ('TL' if sol and not sag else 'TR' if sag and not sol else 'TM') + str(rnd.randint(0, 1))
        else: p = 'F' + str(rnd.randint(0, 3))
        r += alf[NO[m + p] + 1]
    on.append(r)
m = re.search(r"\n  on: \[.*?\n  \]", L, re.S)
L = L[:m.start()] + '\n  on: [\n' + ',\n'.join("    '" + r + "'" for r in on) + '\n  ]' + L[m.end():]
open(lp, 'w', encoding='utf8').write(L)
print('on yeniden döşendi')
