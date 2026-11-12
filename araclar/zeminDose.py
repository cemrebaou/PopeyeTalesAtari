# Zemin karo ızgarasını (levelN.js → 'on') çarpışma bloklarından yeniden döşer.
# Çalıştırma (repo kökünde): python3 araclar/zeminDose.py [level2]   — bloklar değişince çalıştır (varsayılan level1).
# Bölümde 'bolgeler: [[satır, önek], ...]' varsa bölgeler oradan okunur (o satırdan itibaren o önek).
# v0.58 bölgeler: TAPINAK_SATIR üstü → tapınak 'p', yeraltı (YERALTI_SATIR ve altı) → toprak 'd', arası → yosunlu parke taş 'c'.
# Zemin: üstü açık kare → üst karo (sol/orta/sağ), diğerleri dolgu (sol/orta/sağ: yanı açıksa kenarlı).
# Arka plan ('arka') da bölgeye göre 3 çeşit arasından rastgele yeniden döşenir.
# Basamaklar ve taş bloklar karo almaz (kendi görselleri var),
# ama komşu sayılır (üstlerindeki/altlarındaki zemin kenarı buna göre seçilir).
import re, json, random, sys
KOK = __file__.rsplit('/araclar/', 1)[0]
BOLUM = sys.argv[1] if len(sys.argv) > 1 else 'level1'
lp = KOK + '/js/veri/' + BOLUM + '.js'
L = open(lp, encoding='utf8').read()
# 1. bölüm (v0.58): tapınak 'p' satır < 48, yosunlu parke 'c', toprak 'd' satır ≥ 117
_b = re.search(r"bolgeler: (\[\[.*?\]\]),", L)
BOLGELER = json.loads(_b.group(1).replace("'", '"')) if _b else [[0, 'p'], [48, 'c'], [117, 'd']]
def bolge(j):
    m = BOLGELER[0][1]
    for s, o in BOLGELER:
        if j >= s: m = o
    return m
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
for b in sayilar('sahte'): isaretle(*map(int, b), 3)                    # v0.68: sahte duvarlar taş gibi döşenir (oyunda çarpışmasız)
# v0.84: sahte duvar komşu için boş sayılır → altındaki gerçek zemin çimli üst karo olur
def bos(i, j, ben=1):   # ben: döşenen kare (3 = sahte duvar; sahte komşusunu dolu sayar)
    if i < 0 or i >= GX or j < 0 or j >= GY: return False
    return dolu[j][i] == 0 or (dolu[j][i] == 3 and ben != 3)
rnd = random.Random(7)
on = []
for j in range(GY):
    r = ''
    for i in range(GX):
        if dolu[j][i] not in (1, 3): r += alf[0]; continue
        m = bolge(j)
        sol, sag = bos(i - 1, j, dolu[j][i]), bos(i + 1, j, dolu[j][i])
        yan = 'L' if sol and not sag else 'R' if sag and not sol else 'M'
        p = ('T' if bos(i, j - 1, dolu[j][i]) else 'F') + yan
        r += alf[NO[m + p] + 1]
    on.append(r)
m = re.search(r"\n  on: \[.*?\n  \]", L, re.S)
L = L[:m.start()] + '\n  on: [\n' + ',\n'.join("    '" + r + "'" for r in on) + '\n  ]' + L[m.end():]
# Arka plan: bölgeye göre 3 çeşit, rastgele
arka = []
for j in range(GY):
    m = bolge(j)
    arka.append(''.join(alf[NO[m + 'B' + str(rnd.randint(0, 2))] + 1] for i in range(GX)))
m = re.search(r"\n  arka: \[.*?\n  \]", L, re.S)
L = L[:m.start()] + '\n  arka: [\n' + ',\n'.join("    '" + r + "'" for r in arka) + '\n  ]' + L[m.end():]
open(lp, 'w', encoding='utf8').write(L)
print('on ve arka yeniden döşendi')
