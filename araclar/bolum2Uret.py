# 2. bölüm üretici (v1.33): js/veri/level2.js'i baştan yazar, sonra zeminDose.py ile karolar döşenir.
# Çalıştırma: python3 araclar/bolum2Uret.py && python3 araclar/zeminDose.py level2 && node araclar/erisim.js level2
#
# Yerleşim (240 × 198 karo = 7680 × 6336 px). Dünya tamamen taştır, odalar oyulur.
# 9 koridor üst üste (A1 A2 A3 · K1 K2 K3 · M1 M2 M3); üç bölge: A açık gri taş (satır < 66), K koyu taş (66–131),
# M mor kristal (132+). Akış YILAN gibidir: en üstteki koridorda sola → sağa gidilir, sağ uçtaki iniş bacasından bir alt
# koridora inilir, orada sağa → sola, sol uçtan inilir … en alttaki koridorun sağ ucunda çıkış kapısı.
# Başlangıç en üst sol, bitiş en alt sağ. Her bacada zincir var (geri çıkılır).
# Akışı DELEN kısayollar yetenek ister:
#   • tıkaç deliği: zeminde 1 karelik delik, üstünde havada duran kırılır taş. Taş Kırma ile kırılınca delikten bir alt
#     koridora düşülür (bastonla zıplama kırma yeteneği vermez).
#   • anahtar + kilitli kapı: bastonla asılarak çıkılan bacanın tepesindeki oyukta anahtar; alınınca hemen altındaki
#     kilitli kapı açılır, kapıdan ↑ ile 2 koridor aşağı ışınlanılır.
# Gizli yerler: sahte duvarlı odalar, şelale ardı zemin, asılma bacası oyukları, pogo çıkıntıları, itilir taş rafları.
# Her toplanabilir yerleşimi doğrulanır (taşın / zeminin içine giren elmas atılır); düşmanlar sadece ana koridor
# zeminlerine ve geniş platformlara konur.
import json, os
KOK = __file__.rsplit('/araclar/', 1)[0]
W, H, T = 240, 198, 32
g = [[1] * W for _ in range(H)]          # 1 taş, 0 boşluk
E, OZ, SAN, TAS, KON, ZIN, DIK, GIZ, SAH, SEL, IPU = [], [], [], [], [], [], [], [], [], [], []

def bos(c0, r0, c1, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): g[r][c] = 0
def tas(c0, r0, c1, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): g[r][c] = 1
def kat(r): return 'gri' if r < 66 else 'koyu' if r < 132 else 'mor'
# --- eşyalar (rf: üstünde durulan zeminin satırı) ---
def elmas(c, rf, yuk=0): E.append([round(c * T + 16), rf * T - 18 - round(yuk * T)])
def elmasSira(c0, c1, rf, adim=2, yuk=0):
    for c in range(c0, c1 + 1, adim): elmas(c, rf, yuk)
def elmasYay(c0, c1, rf, tepe=3, n=5):     # zıplama yayı boyunca (rf: kalkış zemini)
    for i in range(n):
        t = i / (n - 1); elmas(c0 + (c1 - c0) * t, rf, 0.6 + tepe * 4 * t * (1 - t))
def sandik(c, rf, odul): SAN.append([c * T + 16, rf * T, odul])
def ozel(tip, c, rf, yuk=0): OZ.append([tip, c * T + 16, rf * T - 22 - round(yuk * T)])
def kir(c, rf, tur=None, gecit=0, ust=0, sabit=0): TAS.append([c * T, (rf - 1 - ust) * T, tur or kat(rf), sabit, gecit])
def kasa(c, rf, ust=0): kir(c, rf, 'kasa', ust=ust)
def kapiTas(c, rf, n=3):                    # üst üste n taş: kırılıp geçilen kapı (erisim.js geçilebilir sayar)
    for i in range(n): kir(c, rf, gecit=1, ust=i)
def zincir(c, ust, alt):                    # c: 2 sütunluk yerin sol sütunu (zincir ikisinin ortasında)
    ZIN.append([c * T + 32, ust * T, (alt - ust) * T])
def bayrak(c, rf): KON.append([c * T + 16, rf * T])
def diken(c0, c1, rf): DIK.append([c0 * T, rf * T, (c1 - c0 + 1) * T])
def gizli(c, r): GIZ.append([c * T + 16, r * T])
def sahte(c0, r0, c1, r1): SAH.append([c0 * T, r0 * T, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T])
def selale(c0, w, r0, r1, onde=0): SEL.append([c0 * T, w * T, r0 * T, r1 * T, onde])
def ipucu(c, r, yazi): IPU.append([c * T, r * T, yazi])

# ======================================================================= koridorlar
# (ilk açık satır, zemin satırı); yön: çift sıra → sağa, tek sıra → sola
KAT = [(4, 18), (24, 40), (46, 60), (70, 84), (90, 106), (112, 126), (136, 150), (156, 172), (178, 192)]
SOL, SAG = 6, 233
BACA_G = 7                                   # iniş bacası genişliği
for tv, rf in KAT: bos(SOL, tv, SAG, rf - 1)
BASLA = (10, KAT[0][1])
CIKIS = (229, KAT[8][1])
DOLU_KAPI = []                               # yerleşim yasak bölgeleri (c0, r0, c1, r1): özellik alanları

def yon(i): return 1 if i % 2 == 0 else -1
def bacaSutun(i):                            # i. koridorun sonundaki iniş bacasının sol sütunu
    return SAG - BACA_G + 1 if yon(i) > 0 else SOL

# --- iniş bacası: koridor sonunda, bir alt koridora. Zincir dış duvarda; içeride sağlı sollu 3'lük çıkıntılar (düz düşüş yok)
def inisBacasi(i):
    tv2, rf2 = KAT[i + 1]
    rf = KAT[i][1]
    s0 = bacaSutun(i)
    bos(s0, rf, s0 + BACA_G - 1, tv2 - 1)
    dis = s0 + BACA_G - 2 if yon(i) > 0 else s0       # zincir: dış duvar tarafındaki 2 sütun
    zincir(dis, rf - 3, rf2)
    ic0 = s0 if yon(i) > 0 else s0 + 2                # çıkıntıların olabileceği 5 sütun
    k = 0
    for r in range(rf + 6, rf2 - 3, 6):
        if k % 2 == 0: tas(ic0, r, ic0 + 2, r)
        else: tas(ic0 + 2, r, ic0 + 4, r)
        elmas(ic0 + 1 + 2 * (k % 2), r)
        k += 1
    DOLU_KAPI.append((s0 - 2, rf - 3, s0 + BACA_G + 1, rf2))

# --- tıkaç deliği (kısayol, Taş Kırma ister): zeminde 1 karelik delik, üstünde havada duran kırılır taş (1 kare yukarıda).
# Taş kırılınca delikten bir alt koridora düşülür. Kırılmazsa üstünden atlanıp geçilir.
def tikac(c, i):
    rf = KAT[i][1]; tv2 = KAT[i + 1][0]
    bos(c, rf, c, tv2 - 1)
    kir(c, rf, sabit=1)
    DOLU_KAPI.append((c - 2, rf - 3, c + 2, tv2))

# --- bastonla asılma bacası → tepesinde gizli oyuk
def asilmaBacasi(c, rf, tv, tepe=None, sol=3, sag=5):
    # tavan bacanın çevresinde (c-sol … c+sag) rf-5'e iner; 3 genişlikli baca (c…c+2) tepe satırına çıkar.
    # Zıplayınca baston baca duvarına takılır; duvardan duvara asılıp zıplayarak çıkılır.
    tepe = tepe if tepe is not None else tv + 2
    tas(c - sol, tv, c + sag, rf - 5)
    bos(c, tepe, c + 2, rf - 5)
    DOLU_KAPI.append((c - sol - 1, tv, c + sag + 1, rf))
    return tepe

BONUS = None
def bacaOyugu(c, rf, tv, sag=True, odul=('yasam', 'buyuk'), bonus=False):
    # baca tepesinden yana açılan oyuk (3 satır), içinde sandık + mavi elmas, gizli yer
    # bonus=True: oyuğun sağ ucunda gizli bonus odası kapısı (v1.37, odalar.js); sandık ve elmas sola kayar
    global BONUS
    tepe = asilmaBacasi(c, rf, tv, sol=3 if sag else 8, sag=(12 if bonus else 10) if sag else 5)
    if sag: bos(c, tepe, c + (9 if bonus else 7), tepe + 2); oc = c + 4
    else: bos(c - 5, tepe, c + 2, tepe + 2); oc = c - 3
    if bonus:
        assert sag
        BONUS = [(c + 8) * T + 16, (tepe + 3) * T]
        sandik(oc - 1, tepe + 3, odul[0]); ozel(odul[1], oc + 1, tepe + 3); gizli(oc, tepe + 2)
    else:
        sandik(oc - 1, tepe + 3, odul[0]); ozel(odul[1], oc + 1, tepe + 3); gizli(oc, tepe + 2)
        elmasSira(oc - 1, oc + 1, tepe + 3, 1, 1.2)

# --- anahtar bacası: tepedeki oyukta anahtar; hemen altında kilitli kapı (2 koridor aşağı)
ANAHTAR, KILIT = None, None
def anahtarBacasi(c, i):
    global ANAHTAR, KILIT
    tv, rf = KAT[i]
    tepe = asilmaBacasi(c, rf, tv, sol=8, sag=5)
    bos(c - 5, tepe, c + 2, tepe + 2)
    ANAHTAR = [(c - 3) * T + 16, (tepe + 3) * T - 24]
    gizli(c - 3, tepe + 2)
    elmasSira(c - 5, c - 1, tepe + 3, 2, 1)
    rf2 = KAT[i + 2][1]
    KILIT = [(c + 1) * T + 16, rf * T, (c + 1) * T + 16, rf2 * T]   # kapı x, y · varış x, y
    DOLU_KAPI.append((c - 3, rf2 - 4, c + 5, rf2))

# --- küçük özellikler (c: sol sütun; rf zemin satırı; d yön)
def basamaklar(c, rf, d=1):                   # 2 ve 4 yüksek iki basamak (iki yönden de aşılır), üstlerinde elmas
    a, b = (c, c + 3) if d > 0 else (c + 3, c)
    tas(a, rf - 2, a + 2, rf - 1); tas(b, rf - 4, b + 2, rf - 1)
    elmasSira(a, a + 2, rf - 2, 1); elmasSira(b, b + 2, rf - 4, 1)
    DOLU_KAPI.append((c - 1, rf - 6, c + 6, rf))

def dikenCukuru(c, rf, w=6):                 # w genişlik diken çukuru, ortasında basamak taşı, elmas yayları
    bos(c, rf, c + w - 1, rf + 2); diken(c, c + w - 1, rf + 3)
    m = c + w // 2 - 1
    tas(m, rf - 2, m + 1, rf - 2); elmasSira(m, m + 1, rf - 2, 1)
    elmasYay(c - 1, m, rf, 1.5, 3); elmasYay(m + 1, c + w, rf - 2, 1.5, 3)
    DOLU_KAPI.append((c - 2, rf - 4, c + w + 1, rf + 3))

def kasaYigini(c, rf, n=3, ust=1):           # yan yana n kasa, ortadakinin üstünde ust kasa
    for k in range(n): kasa(c + k, rf)
    for k in range(ust): kasa(c + n // 2, rf, ust=k + 1)
    DOLU_KAPI.append((c - 1, rf - 3, c + n, rf))

def tasKapi(c, rf, odul='kizil', d=1):       # 4 yüksek taş kutu oda (üstünden atlanır); kapısı 3 taş (Taş Kırma), içinde sandık
    tas(c, rf - 4, c + 9, rf - 1); bos(c + 1, rf - 3, c + 8, rf - 1)
    kp = c if d > 0 else c + 9
    bos(kp, rf - 3, kp, rf - 1); kapiTas(kp, rf, 3)
    sandik(c + 6 if d > 0 else c + 3, rf, odul); elmasSira(c + 2, c + 7, rf, 1, 0.3)
    DOLU_KAPI.append((c - 2, rf - 6, c + 11, rf))

def itTas(c, rf, d=1):                       # itilir taş + 5 yukarıda raf (taşı altına it, üstünden zıpla); rafta sandık
    r0 = c + 10 * d
    a, b = sorted((r0, r0 + 7 * d))
    tas(a, rf - 5, b, rf - 5)
    kir(c, rf)
    sandik(b if d > 0 else a, rf - 5, 'kalp'); elmasSira(a + 1, b - 1, rf - 5, 2)
    elmasSira(min(c, a) + 1, max(c, b) - 1, rf, 3)
    DOLU_KAPI.append((min(c, a) - 2, rf - 7, max(c, b) + 2, rf))

def pogoCikinti(c, rf, odul='kizil'):        # 6 yukarıda çıkıntı: pogo / duvar zıplama ile
    tas(c, rf - 6, c + 3, rf - 6); ozel(odul, c + 1, rf - 6); elmas(c + 2, rf - 6)
    DOLU_KAPI.append((c - 1, rf - 8, c + 4, rf - 5))

def yuksekBlok(c, rf, odul='kalp'):          # iki yandan basamakla çıkılan yüksek blok (6 yüksek), üstünde sandık
    tas(c, rf - 6, c + 8, rf - 1)
    tas(c + 9, rf - 3, c + 11, rf - 1); tas(c + 12, rf - 1, c + 12, rf - 1)
    tas(c - 3, rf - 3, c - 1, rf - 1); tas(c - 4, rf - 1, c - 4, rf - 1)
    sandik(c + 4, rf - 6, odul); elmasSira(c + 1, c + 7, rf - 6, 3); elmasSira(c + 9, c + 11, rf - 3, 1); elmasSira(c - 3, c - 1, rf - 3, 1)
    DOLU_KAPI.append((c - 5, rf - 8, c + 13, rf))

def alcakTunel(c0, c1, rf, tv):              # eğilerek geçilen 1 karelik tünel
    tas(c0, tv, c1, rf - 2); elmasSira(c0 + 1, c1 - 1, rf, 2)
    DOLU_KAPI.append((c0 - 1, tv, c1 + 1, rf))

def selaleHavuz(c, rf, tv):                  # arka şelale (mor bölgede yok) ve 2 derin sığ havuz, içinde elmas
    if rf < 132: selale(c + 2, 3, tv, rf + 2)   # v1.41: havuzun dibine kadar iner; mor kristal bölgesinde şelale yok
    bos(c, rf, c + 7, rf + 1); elmasSira(c + 1, c + 6, rf + 2, 1)
    DOLU_KAPI.append((c - 1, rf - 2, c + 8, rf + 2))

def yuzenPlatformlar(c, rf, n=5):            # uzun sığ çukur (dikensiz, 3 derin), üstünde kademeli yüzen platformlar
    w = n * 6 + 2
    bos(c, rf, c + w - 1, rf + 2)
    for k in range(n):
        r = rf - 2 - (k % 3)
        x0 = c + 2 + k * 6
        tas(x0, r, x0 + 2, r); elmas(x0 + 1, r)
    elmasSira(c + 1, c + w - 2, rf + 3, 3)
    DOLU_KAPI.append((c - 2, rf - 6, c + w + 1, rf + 3))

def kristalBahce(c, rf):                     # kristal taşlar (içinden küçük elmas) + aralarda kırılır taşlar
    for k, dx in enumerate((0, 3, 6, 10, 13)):
        kir(c + dx, rf, 'kristal')
        if k == 2: kir(c + dx, rf, 'kristal', ust=1)
    kir(c + 8, rf); kir(c + 8, rf, ust=1)
    elmasSira(c + 1, c + 12, rf, 3, 1.6)
    DOLU_KAPI.append((c - 1, rf - 4, c + 14, rf))

def sahteOda(i, odul=None):                  # koridorun iniş yapılan (başlangıç) ucundaki dış duvarda sahte duvarlı gizli oda
    tv, rf = KAT[i]
    odul = odul or (('yasam', 'buyuk') if i % 2 == 0 else ('kalp', 'kizil'))
    if i == 0: c0, c1 = 1, 5
    elif yon(i) > 0: c0, c1 = 1, 5          # sağa giden koridor sol uçtan başlar → sol dış duvar
    else: c0, c1 = 234, 238
    r0 = rf - 5
    bos(c0, r0, c1, rf - 1); sahte(c0, r0, c1, rf - 1)
    m = (c0 + c1) // 2
    sandik(m - 1, rf, odul[0]); ozel(odul[1], m + 1, rf); gizli(m, rf - 1)
    elmasSira(c0 + 1, c1 - 1, rf, 1, 2)
    DOLU_KAPI.append((c0 - 1, r0, c1 + 1, rf))

def selaleGizli(c, i, d=1):                  # v1.52: önde akan şelale, ardında yukarı gizli tırmanış: tavandaki gizli oyuğa çıkılır
    # c: şelalenin başladığı sütun (3 şelale yan yana = 6 sütun). Şelale oyuğun tepesinden zemine kadar iner, ardındaki
    # sağlı sollu çıkıntıları, tavandaki deliği ve oyuğu örter. Oyukta sandık + mavi elmas, gizli yer.
    tv, rf = KAT[i]
    oy0, oy1 = tv - 4, tv - 2                  # oyuk (3 satır), tabanı tavan satırı tv - 1
    bos(c, oy0, c + 5, oy1)
    bos(c + 4, tv - 1, c + 5, tv - 1)          # tavandaki delik (sağ üstte)
    for r, (a, b) in zip((rf - 4, rf - 7, rf - 10, rf - 13), ((c, c + 2), (c + 3, c + 5), (c, c + 2), (c + 3, c + 5))):
        tas(a, r, b, r)                        # çıkıntılar: 3 satır arayla, en üstteki deliğin altında
        elmas(a + 1, r)
    for k in range(3): selale(c + 2 * k, 2, oy0, rf, onde=1)
    sandik(c + 1, oy1 + 1, 'yasam'); ozel('buyuk', c + 3, oy1 + 1); gizli(c + 2, oy1)
    elmasSira(c, c + 2, oy1 + 1, 1, 1)
    DOLU_KAPI.append((c - 2, oy0, c + 7, rf))

# ======================================================================= koridor içerikleri
# Koridor 0 — A1 (en üst), sağa. Başlangıç, anahtar bacası + kilitli kapı, tıkaç kısayolu
I = 0; tv, rf = KAT[0]
sahteOda(0)
bayrak(BASLA[0] + 4, rf)
kasaYigini(22, rf, 3)
basamaklar(32, rf)
dikenCukuru(44, rf, 6)
anahtarBacasi(62, 0)                          # anahtar: baca c=62–64, kapı sütun 63 → A3'e
itTas(74, rf)
bayrak(94, rf)
tikac(100, 0)                                 # kısayol → A2
kasaYigini(106, rf, 2, 1)
tasKapi(122, rf, 'kizil', yon(I))
yuzenPlatformlar(136, rf, 5)
kasaYigini(174, rf, 3, 2)
selaleHavuz(182, rf, tv)
pogoCikinti(196, rf)
bayrak(206, rf)
dikenCukuru(212, rf, 7)
inisBacasi(0)

# Koridor 1 — A2, sola. Üst / alt geçitler, bacalı oyuk
I = 1; tv, rf = KAT[1]
sahteOda(1)
bayrak(220, rf)
kasaYigini(212, rf, 3, 1)
basamaklar(198, rf, -1)
alcakTunel(180, 190, rf, tv)
kristalBahce(160, rf)
bacaOyugu(146, rf, tv, sag=False)
bayrak(132, rf)
dikenCukuru(120, rf, 8)
tasKapi(106, rf, 'buyuk', yon(I))
yuksekBlok(84, rf)
tikac(68, 1)                                  # kısayol → A3
yuzenPlatformlar(40, rf, 4)
kasaYigini(30, rf, 2, 1)
bayrak(22, rf)
inisBacasi(1)

# Koridor 2 — A3, sağa. Kilitli kapının varış yeri (sütun 63)
I = 2; tv, rf = KAT[2]
sahteOda(2)
bayrak(18, rf)
kasaYigini(24, rf, 3, 1)
dikenCukuru(34, rf, 6)
basamaklar(48, rf)
# 63: kapı varışı (boş bırakılır)
selaleHavuz(72, rf, tv)
kasaYigini(86, rf, 2)
pogoCikinti(96, rf)
bayrak(108, rf)
tasKapi(118, rf, 'kizil', yon(I))
itTas(132, rf)
kristalBahce(160, rf)
alcakTunel(180, 188, rf, tv)
bacaOyugu(200, rf, tv, sag=True, bonus=True)   # oyuğun ucunda gizli bonus odası kapısı
bayrak(212, rf)
kasaYigini(218, rf, 3, 1)
inisBacasi(2)

# Koridor 3 — K1, sola
I = 3; tv, rf = KAT[3]
sahteOda(3)
bayrak(220, rf)
basamaklar(208, rf, -1)
yuzenPlatformlar(170, rf, 6)
kasaYigini(160, rf, 3, 2)
tikac(150, 3)                                 # kısayol → K2
bayrak(140, rf)
dikenCukuru(126, rf, 8)
selaleHavuz(110, rf, tv)
tasKapi(98, rf, 'kizil', yon(I))
yuksekBlok(74, rf, 'kalp')
bacaOyugu(60, rf, tv, sag=False)
bayrak(46, rf)
kristalBahce(28, rf)
kasaYigini(18, rf, 2, 1)
inisBacasi(3)

# Koridor 4 — K2, sağa
I = 4; tv, rf = KAT[4]
sahteOda(4)
bayrak(18, rf)
selaleGizli(24, 4, 1)                         # v1.52: önde şelale, ardında yukarı gizli tırmanış ve tavan oyuğu
kasaYigini(40, rf, 3, 1)
dikenCukuru(50, rf, 7)
itTas(64, rf)
bayrak(90, rf)
alcakTunel(98, 108, rf, tv)
pogoCikinti(116, rf, 'buyuk')
kristalBahce(126, rf)
tikac(146, 4)                                 # kısayol → K3
tasKapi(156, rf, 'buyuk', yon(I))
yuzenPlatformlar(170, rf, 5)
bayrak(206, rf)
basamaklar(212, rf)
kasaYigini(222, rf, 2, 1)
inisBacasi(4)

# Koridor 5 — K3, sola
I = 5; tv, rf = KAT[5]
sahteOda(5)
bayrak(220, rf)
kasaYigini(210, rf, 3, 1)
bacaOyugu(198, rf, tv, sag=True)
dikenCukuru(184, rf, 6)
yuksekBlok(164, rf, 'kalp')
bayrak(150, rf)
selaleHavuz(138, rf, tv)
tasKapi(126, rf, 'kizil', yon(I))
kristalBahce(104, rf)
tikac(94, 5)                                  # kısayol → M1
yuzenPlatformlar(56, rf, 5)
basamaklar(44, rf, -1)
bayrak(30, rf)
kasaYigini(20, rf, 2, 1)
inisBacasi(5)

# Koridor 6 — M1, sağa
I = 6; tv, rf = KAT[6]
sahteOda(6)
bayrak(18, rf)
kristalBahce(24, rf)
kasaYigini(42, rf, 3, 2)
dikenCukuru(52, rf, 8)
pogoCikinti(66, rf)
bacaOyugu(80, rf, tv, sag=True)
bayrak(96, rf)
tasKapi(104, rf, 'buyuk', yon(I))
itTas(118, rf)
alcakTunel(144, 152, rf, tv)
tikac(160, 6)                                 # kısayol → M2
yuzenPlatformlar(168, rf, 5)
bayrak(204, rf)
selaleHavuz(210, rf, tv)
kasaYigini(222, rf, 2, 1)
inisBacasi(6)

# Koridor 7 — M2, sola
I = 7; tv, rf = KAT[7]
sahteOda(7)
bayrak(220, rf)
basamaklar(208, rf, -1)
kristalBahce(190, rf)
dikenCukuru(176, rf, 7)
yuksekBlok(156, rf, 'kalp')
bayrak(146, rf)
kasaYigini(136, rf, 3, 1)
tikac(132, 7)                                 # kısayol → M3
tasKapi(116, rf, 'kizil', yon(I))
bacaOyugu(100, rf, tv, sag=False)
selaleHavuz(80, rf, tv)
yuzenPlatformlar(44, rf, 5)
bayrak(34, rf)
kasaYigini(22, rf, 2, 1)
inisBacasi(7)

# Koridor 8 — M3 (en alt), sağa. Çıkış sağ uçta
I = 8; tv, rf = KAT[8]
sahteOda(8)
bayrak(18, rf)
kasaYigini(24, rf, 3, 1)
kristalBahce(34, rf)
dikenCukuru(54, rf, 8)
itTas(68, rf)
bayrak(94, rf)
selaleHavuz(100, rf, tv)
pogoCikinti(114, rf, 'buyuk')
tasKapi(124, rf, 'buyuk', yon(I))
yuzenPlatformlar(138, rf, 5)
bacaOyugu(180, rf, tv, sag=True)
dikenCukuru(190, rf, 7)
bayrak(206, rf)
kasaYigini(214, rf, 3, 2)
elmasSira(222, 227, rf, 1, 1)

# ======================================================================= açıktaki elmaslar (boş zemin şeritleri)
# Özellik alanları (DOLU_KAPI) dışındaki her düz zeminde 10 sütunda bir 3'lü elmas grubu + arada 1'li.
def yasakAlan(c, r):
    return any(c0 <= c <= c1 and r0 <= r <= r1 for c0, r0, c1, r1 in DOLU_KAPI)
for i, (tv, rf) in enumerate(KAT):
    c = SOL + 2
    while c < SAG - 2:
        if g[rf][c] and not g[rf - 1][c] and not g[rf - 2][c] and not yasakAlan(c, rf - 1) and not yasakAlan(c, rf - 2):
            s0 = c
            while c < SAG - 2 and g[rf][c] and not g[rf - 1][c] and not yasakAlan(c, rf - 1): c += 1
            uz = c - s0
            if uz >= 5:
                k = s0 + 1
                while k + 2 < c:
                    elmasSira(k, k + 2, rf, 1)          # 3'lü grup
                    if k + 6 < c: elmas(k + 5, rf, 1)   # arada havada tek
                    k += 10
        else: c += 1

# ======================================================================= elmas doğrulama
# Elmasın 4 köşesi (±9 px) boş karede olmalı (zemin, kırılır taş, sandık karesi değil); altında en çok 6 satırda zemin olmalı.
tasH = {}
for x, y, tur, sabit, gecit in TAS: tasH[(y // T, x // T)] = tur
sanH = set((y // T - 1, x // T) for x, y, _ in SAN)
dikH = set()
for x, y, w in DIK:
    for c in range(x // T, (x + w) // T): dikH.add((y // T - 1, c)); dikH.add((y // T - 2, c))
def doluKare(r, c):
    if r < 0 or r >= H or c < 0 or c >= W: return True
    return g[r][c] == 1 or (r, c) in tasH or (r, c) in sanH
def elmasGecerli(x, y):
    for dx, dy in ((-9, -9), (9, -9), (-9, 9), (9, 9)):
        if doluKare((y + dy) // T, (x + dx) // T): return False
    r, c = y // T, x // T
    if (r, c) in dikH: return False
    return any(doluKare(r + k, c) for k in range(1, 7))
E2, atilan = [], 0
for x, y in E:
    if elmasGecerli(x, y): E2.append([x, y])
    else: atilan += 1
E = E2
OZ = [o for o in OZ if elmasGecerli(o[1], o[2])]   # özeller de aynı kurala uyar
# sandık ve bayrak: durdukları kare zemin olmalı, üstleri boş
for x, y, _ in SAN: assert g[y // T][x // T] == 1 and g[y // T - 1][x // T] == 0, ('sandık havada / taşta', x // T, y // T)
for x, y in KON: assert g[y // T][x // T] == 1 and g[y // T - 1][x // T] == 0, ('bayrak havada / taşta', x // T, y // T)
assert g[CIKIS[1]][CIKIS[0]] == 1 and g[CIKIS[1] - 1][CIKIS[0]] == 0
assert g[KILIT[3] // T][KILIT[2] // T] == 1 and g[KILIT[3] // T - 1][KILIT[2] // T] == 0, 'kapı varışı zeminde değil'

# ======================================================================= düşmanlar
# Zemin parçalarına (en az 8 karo, üstü 2 karo boş, diken / delik / taş / sandık yok) dağıtılır; başlangıç, çıkış, kontrol
# noktası, zincir dibi, gizli odalar, bacalar ve kapı çevresi boş kalır. Ana koridor zeminleri ve geniş platformlar.
import random
random.seed(11)
DUS = []
def yasak(c, rf):
    x, y = c * T + 16, rf * T
    if abs(c - BASLA[0]) < 12 and abs(rf - BASLA[1]) < 4: return True
    if abs(c - CIKIS[0]) < 8 and abs(rf - CIKIS[1]) < 4: return True
    if any(abs(x - kx) < 6 * T and abs(y - ky) < 4 * T for kx, ky in KON): return True
    if any(abs(x - zx) < 4 * T and zy - 2 * T <= y <= zy + zh + 2 * T for zx, zy, zh in ZIN): return True
    if any(sx - 2 * T <= x <= sx + sw + 2 * T and sy <= y <= sy + sh + T for sx, sy, sw, sh in SAH): return True
    if any(abs(x - gx) < 7 * T and abs(y - gy) < 4 * T for gx, gy in GIZ): return True
    if abs(x - KILIT[0]) < 4 * T and abs(y - KILIT[1]) < 2 * T: return True
    if abs(x - KILIT[2]) < 4 * T and abs(y - KILIT[3]) < 2 * T: return True
    for i in range(8):
        s0 = bacaSutun(i)
        if s0 - 1 <= c <= s0 + BACA_G and KAT[i][1] - 2 <= rf <= KAT[i + 1][1] + 1: return True
    return False
parcalar_ = []
for rf in range(3, H):
    c = 0
    while c < W:
        ok = lambda c: g[rf][c] and not g[rf - 1][c] and not g[rf - 2][c] and (rf, c) not in dikH and (rf - 1, c) not in dikH \
            and (rf - 1, c) not in tasH and (rf - 1, c) not in sanH and not yasak(c, rf)
        if ok(c):
            s0 = c
            while c < W and ok(c): c += 1
            if c - s0 >= 8: parcalar_.append((rf, s0, c - 1))
        else: c += 1
AGIRLIK = {'a': [('kedi', 4), ('kertenkele', 2), ('domuz', 1), ('bitki', 3), ('fici', 1)],      # bitki sadece üstte
           'k': [('domuz', 4), ('kedi', 2), ('kertenkele', 2), ('fici', 3), ('buyucu', 2)],
           'm': [('golem', 4), ('kertenkele', 2), ('buyucu', 2), ('kedi', 1), ('fici', 1)]}   # golem sadece morda
secilen = []
for rf, c0, c1 in sorted(parcalar_, key=lambda p: -(p[2] - p[1])):
    # uzun parçalara birden çok düşman (her 22 sütunda bir)
    adaylar = list(range(c0 + 4, c1 - 3, 22)) if c1 - c0 >= 26 else [(c0 + c1) // 2]
    for cx in adaylar:
        if any(abs(cx - sx) < 18 and abs(rf - sr) < 6 for sr, sx in secilen): continue
        secilen.append((rf, cx))
        bol = 'a' if rf < 66 else 'k' if rf < 132 else 'm'
        turler = [t for t, a in AGIRLIK[bol] for _ in range(a)]
        tip = random.choice(turler)
        if tip in ('domuz', 'golem', 'fici') and c1 - c0 < 10: tip = 'kedi' if bol == 'a' else 'kertenkele'
        DUS.append({'tip': tip, 'x': cx * T + 16, 'y': rf * T})
# Yarasalar: koridor havasında, zeminin ~5 karo üstünde, etrafı 5×5 boş
YARASA = []
for tv, rf in KAT:
    r = rf - 5
    for c in range(SOL + 4, SAG - 4):
        if not all(g[r + dy][c + dx] == 0 for dy in range(-2, 3) for dx in range(-2, 3)): continue
        x, y = c * T + 16, r * T + 16
        if abs(c - BASLA[0]) < 14 and abs(rf - BASLA[1]) < 6: continue
        if any(abs(x - kx) < 6 * T and abs(y - ky) < 6 * T for kx, ky in KON): continue
        if any(sx - 3 * T <= x <= sx + sw + 3 * T and sy - 3 * T <= y <= sy + sh + 3 * T for sx, sy, sw, sh in SAH): continue
        if any(abs(x - gx) < 8 * T and abs(y - gy) < 6 * T for gx, gy in GIZ): continue
        YARASA.append((rf, c, x, y))
random.shuffle(YARASA)
yer_ = []
for rf, c, x, y in YARASA:
    if any(abs(c - c2) < 40 and abs(rf - r2) < 10 for r2, c2 in yer_): continue
    if any(abs(x - d['x']) < 6 * T and abs(rf * T - d['y']) < 3 * T for d in DUS): continue
    yer_.append((rf, c))
    DUS.append({'tip': 'yarasa', 'x': x, 'y': y})
    if len(yer_) >= 18: break
DUS += [{'tip': 'yumurta', 'x': 4592, 'y': 1920}, {'tip': 'yumurta', 'x': 2576, 'y': 3392}]   # v1.47: örümcek yumurtaları
DUS.sort(key=lambda d: (d['y'], d['x']))

# ======================================================================= çıktı
def bloklar():
    # yatay şeritler; aynı şerit alt satırda da varsa dikey birleşir
    acik, out = {}, []
    for r in range(H + 1):
        simdi = set()
        if r < H:
            c = 0
            while c < W:
                if g[r][c]:
                    s = c
                    while c < W and g[r][c]: c += 1
                    simdi.add((s, c - 1))
                else: c += 1
        for k in list(acik):
            if k not in simdi:
                r0 = acik.pop(k); out.append([k[0] * T, r0 * T, (k[1] - k[0] + 1) * T, (r - r0) * T])
        for k in simdi:
            if k not in acik: acik[k] = r
    return sorted(out, key=lambda b: (b[1], b[0]))

alf = open(KOK + '/js/veri/level1.js', encoding='utf8').read().split("alfabe: '")[1].split("',")[0]
satir = lambda ad, liste: '  ' + ad + ': [\n' + ',\n'.join('    ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in liste) + '\n  ],\n'
s = '// 2. bölüm: araclar/bolum2Uret.py üretir (elle düzenleme üretici yeniden çalışınca kaybolur). Karolar: araclar/zeminDose.py level2\n'
s += 'const LEVEL2 = {\n'
s += "  ad: '2. Bölüm - Mor Derinlikler',\n"
s += f'  genislik: {W * T},\n  yukseklik: {H * T},\n  karo: {T},\n'
s += f'  baslangic: [{BASLA[0] * T + 16},{BASLA[1] * T}],\n  cikis: [{CIKIS[0] * T + 16},{CIKIS[1] * T}],\n'
s += "  tirmanma: 'zincir',\n"
s += "  bolgeler: [[0,'a'],[66,'k'],[132,'m']],\n"
s += f'  anahtar: {json.dumps(ANAHTAR)},\n'
s += '  // [kapı x, kapı y (zemin), varış x, varış y (zemin)] kilitli kapı: anahtar alınınca açılır, ↑ ile 2 koridor aşağı\n'
s += f'  kilitKapi: {json.dumps(KILIT)},\n'
s += '  // v1.37: patron açıkta beklemez — çıkıştaki patron kapısından arenaya (odalar.js); gizli bonus odası kapısı A3 baca oyuğunda\n'
s += f'  patron: {{ kapi: [{CIKIS[0] * T + 16},{CIKIS[1] * T}] }},\n  bonus: {{ kapi: {json.dumps(BONUS)} }},\n'
s += "  alfabe: '" + alf + "',\n"
B = bloklar()
s += satir('bloklar', B)
s += satir('dikenler', DIK) + satir('sarmasiklar', ZIN) + satir('sandiklar', SAN) + satir('elmaslar', E)
s += satir('ozeller', OZ) + '  kayalar: [\n\n  ],\n'
s += '  // [x, y (sol üst), tür, sabit, geçit]\n' + satir('kirTaslar', TAS)
s += satir('kontrol', KON) + satir('ipuclari', IPU) + satir('dusmanlar', DUS)
s += satir('gizliler', GIZ)
s += '  // [x, y, w, h] sahte duvar: taş görünür, çarpışmasız gizli oda\n' + satir('sahte', SAH)
s += '  // [x, w, y0, y1, önde] önde=1: oyuncunun önünde (arkası görünmez)\n' + satir('selaleler', SEL)
s += "  on: [\n  ],\n  arka: [\n  ]\n};\n"
open(KOK + '/js/veri/level2.js', 'w', encoding='utf8').write(s)
# kaba önizleme: her karakter 1 karo (araclar/.l2onizleme.txt, depoya girmez)
onz = os.environ.get('L2_ONIZLEME')
if onz: open(onz, 'w').write('\n'.join(''.join('#' if v else '.' for v in row) for row in g))
print('düşman', len(DUS), {t: sum(d['tip'] == t for d in DUS) for t in ('kedi', 'domuz', 'kertenkele', 'yarasa', 'golem', 'bitki', 'fici', 'buyucu')})
print('blok', len(B), 'elmas', len(E), '(atılan', atilan, ') özel', len(OZ), 'sandık', len(SAN), 'taş', len(TAS),
      'kasa', sum(t[2] == 'kasa' for t in TAS), 'kristal', sum(t[2] == 'kristal' for t in TAS), 'zincir', len(ZIN), 'gizli', len(GIZ), 'bayrak', len(KON))
