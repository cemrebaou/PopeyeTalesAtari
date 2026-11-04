# Zemin karo ızgarasını (level1.js → 'on') çarpışma bloklarından yeniden döşer.
# Çalıştırma (repo kökünde): python3 araclar/zeminDose.py   — bloklar değişince çalıştır.
# v0.58 bölgeler: TAPINAK_SATIR üstü → tapınak 'p', yeraltı (YERALTI_SATIR ve altı) → toprak 'd', arası → yosunlu parke taş 'c'.
# Zemin: üstü açık kare → üst karo (sol/orta/sağ), diğerleri dolgu (sol/orta/sağ: yanı açıksa kenarlı).
# Arka plan ('arka') da bölgeye göre 3 çeşit arasından rastgele yeniden döşenir.
# Basamaklar ve taş bloklar karo almaz (kendi görselleri var),
# ama komşu sayılır (üstlerindeki/altlarındaki zemin kenarı buna göre seçilir).
import re, json, random
KOK = __file__.rsplit('/araclar/', 1)[0]
YERALTI_SATIR = 117          # v0.58: 2 kare aşağı (3744 px / 32) — taşlı bölge daha uzun, toprak daha derinde
TAPINAK_SATIR = 48
lp = KOK + '/js/veri/level1.js'
L = open(lp, encoding='utf8').read()
NO = json.loads(re.search(r'"tile": (\{.*?\})', open(KOK + '/js/veri/assetlar.js', encoding='utf8').read(), re.S).group(1))
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
for b in sayilar('basamaklar'): isaretle(*map(int, b), 2)
for b in sayilar('kayalar'): isaretle(int(b[0]), int(b[1]), T, T, 1)   # v0.33: ara (uçan) kayalar normal zemin karosu
def bos(i, j):
    if i < 0 or i >= GX or j < 0 or j >= GY: return False
    return dolu[j][i] == 0
rnd = random.Random(7)
on = []
for j in range(GY):
    r = ''
    for i in range(GX):
        if dolu[j][i] != 1: r += alf[0]; continue
        m = 'd' if j >= YERALTI_SATIR else 'p' if j < TAPINAK_SATIR else 'c'
        sol, sag = bos(i - 1, j), bos(i + 1, j)
        yan = 'L' if sol and not sag else 'R' if sag and not sol else 'M'
        p = ('T' if bos(i, j - 1) else 'F') + yan
        r += alf[NO[m + p] + 1]
    on.append(r)
m = re.search(r"\n  on: \[.*?\n  \]", L, re.S)
L = L[:m.start()] + '\n  on: [\n' + ',\n'.join("    '" + r + "'" for r in on) + '\n  ]' + L[m.end():]
# Arka plan: bölgeye göre 3 çeşit, rastgele
arka = []
for j in range(GY):
    m = 'd' if j >= YERALTI_SATIR else 'p' if j < TAPINAK_SATIR else 'c'
    arka.append(''.join(alf[NO[m + 'B' + str(rnd.randint(0, 2))] + 1] for i in range(GX)))
m = re.search(r"\n  arka: \[.*?\n  \]", L, re.S)
L = L[:m.start()] + '\n  arka: [\n' + ',\n'.join("    '" + r + "'" for r in arka) + '\n  ]' + L[m.end():]
open(lp, 'w', encoding='utf8').write(L)
print('on ve arka yeniden döşendi')
