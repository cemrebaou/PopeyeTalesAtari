# 4. bölüm üretici (v1.68) — "Demir Kule": js/veri/level4.js'i baştan yazar, sonra zeminDose.py karoları döşer.
# Çalıştırma: python3 araclar/bolum4Uret.py && python3 araclar/zeminDose.py level4 && node araclar/erisim.js level4
# (L4_ONIZLEME=/yol/l4.png ile küçük harita görseli.)
#
# 240 × 198 karo (7680 × 6336 px, 2. bölümle aynı). Dünya tamamen metaldir, odalar oyulur. 2. bölümün tersine AŞAĞIDAN
# YUKARI çıkılır ve hiçbir kısım ötekinin tekrarı değildir — 11 ayrı bölge, her birinin kendi fikri var:
#   alt kat (pas, satır 132+)      A Kazan Dairesi → B Boru Labirenti (sürünme tünelleri) → C Hurda Kuyusu (dikey tırmanış)
#                                   → D Paslı Köprü (adadan adaya, altı hurdalık) → zincirle orta kata
#   orta kat (koyu çelik, 66–131)  E Dişli Salonu (dev dişlilerin içinden geçilir) → F Pres Hattı (eğil / atla) →
#                                   G Asansör Boşluğu (kabin, halat) → zincirle üst kata        · yan oda: H Depo
#   yan yollar                     L Soğutma Tankları (C'deki sahte duvardan; zincirden zincire, org direkleri, delikli katlar → A'ya düşer)
#                                   M Bakım Katı (G'nin üst sahanlığından; salyangoz koridor, ortasında hazine)
#   üst kat (parlak çelik, < 66)   I Kumanda Köprüleri (diken hendeği üstü) → J Reaktör (dev kürenin üstünden) →
#                                   K Kule Tepesi (büyük merdiven, çıkış)                        · yan oda: Arşiv, Hazine Kasası
# Ana yol sadece yürüme / zıplama / eğilme / zincirle yapılır (yetenek istemez, rahat zıplama kuralı — erisim.js denetler).
# Yetenek isteyen özel yerler:
#   Bastonla Asılma / Duvar Zıplama  A'daki baca oyuğu · G'de halat ile ray arasındaki oluk → gizli bonus odası kapısı
#   Bastonla Zıplama (pogo)          D hurdalığındaki diken tarlasının ortasında anahtar · C ve J'de yüksek çıkıntılar
#   Çift Zıplama                     D'de yüksek raf · (pogo ile de) yüksek çıkıntılar
#   Taş Kırma                        B'de alt tünel kısayolu · Arşiv kapısı · K'de zemindeki tıkaç → Hazine Kasası
#   Kasa Kırma / İtme / Çekme        H Depo: kasa duvarı, itilen taş + raf, çekilen taş + raf
#   anahtar + kilitli kapı           D'nin sonundaki kapı → Hazine Kasası (üst kat); ilk geçişten sonra iki yönlü
# Zor ama yeteneksiz: E'de dişliden direğe, direkten üst kanala 4 karelik atlayışlar (gizli kanal) · I'da tek karelik direkler.
import json, os, math
KOK = __file__.rsplit('/araclar/', 1)[0]
W, H, T = 240, 198, 32
g = [[1] * W for _ in range(H)]          # 1 metal, 0 boşluk
E, OZ, SAN, TAS, KON, ZIN, DIK, GIZ, SAH, IPU = [], [], [], [], [], [], [], [], [], []
ELLE = []                                 # elle eşya konan alanlar (c0, r0, c1, r1): otomatik elmas buraya gelmez

def bos(c0, r0, c1, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): g[r][c] = 0
def tas(c0, r0, c1, r1):
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1): g[r][c] = 1
def plat(c0, c1, r): tas(c0, r, c1, r)    # tek sıra platform (r: üstüne basılan satır)
def disk(cx, cy, R, ic=None):             # dolu daire; ic verilirse halka (ic < uzaklık ≤ R)
    for r in range(int(cy - R) - 1, int(cy + R) + 2):
        for c in range(int(cx - R) - 1, int(cx + R) + 2):
            d = math.hypot(c - cx, r - cy)
            if d <= R and (ic is None or d > ic): g[r][c] = 1
def kat(r): return 'gri' if r < 66 else 'koyu' if r < 132 else 'tugla'   # kırılır taş türü (kata uyan)
# --- eşyalar (rf: üstünde durulan zeminin satırı) ---
def elmas(c, rf, yuk=0): E.append([round(c * T + 16), rf * T - 18 - round(yuk * T)])
def elmasSira(c0, c1, rf, adim=2, yuk=0):
    for c in range(c0, c1 + 1, adim): elmas(c, rf, yuk)
def elmasYay(c0, c1, rf, tepe=3, n=5):
    for i in range(n):
        t = i / (n - 1); elmas(c0 + (c1 - c0) * t, rf, 0.6 + tepe * 4 * t * (1 - t))
def sandik(c, rf, odul): SAN.append([c * T + 16, rf * T, odul]); ELLE.append((c - 1, rf - 2, c + 1, rf))
def ozel(tip, c, rf, yuk=0): OZ.append([tip, c * T + 16, rf * T - 22 - round(yuk * T)]); ELLE.append((c, rf - 2 - int(yuk), c, rf))
def kir(c, rf, tur=None, gecit=0, ust=0, sabit=0):
    TAS.append([c * T, (rf - 1 - ust) * T, tur or kat(rf), sabit, gecit]); ELLE.append((c - 1, rf - 3 - ust, c + 1, rf))
def kasa(c, rf, ust=0): kir(c, rf, 'kasa', ust=ust)
def kapiTas(c, rf, n=3):
    for i in range(n): kir(c, rf, gecit=1, ust=i)
def zincir(c, ust, alt):                    # c: 2 sütunluk yerin sol sütunu (zincir ikisinin ortasında)
    ZIN.append([c * T + 32, ust * T, (alt - ust) * T]); ELLE.append((c - 1, ust - 1, c + 2, alt))
    # zincir üstündeki ilk metale asılır (oyun 12 karoya kadar arar); yoksa 5 kare yukarı asma bloğu
    if not any(g[r][c + 1] for r in range(max(0, ust - 12), ust)): tas(c, ust - 5, c + 1, ust - 5); print('asma bloğu eklendi', c, ust - 5)
def bayrak(c, rf): KON.append([c * T + 16, rf * T]); ELLE.append((c - 1, rf - 3, c + 1, rf))
def diken(c0, c1, rf): DIK.append([c0 * T, rf * T, (c1 - c0 + 1) * T])
def gizli(c, r): GIZ.append([c * T + 16, r * T])
def sahte(c0, r0, c1, r1): SAH.append([c0 * T, r0 * T, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T]); ELLE.append((c0 - 1, r0, c1 + 1, r1 + 1))
def elle(c0, r0, c1, r1): ELLE.append((c0, r0, c1, r1))
def sahteOda(c0, r0, c1, rf, odul=('yasam', 'buyuk')):   # dış duvardaki sahte duvarlı gizli oda (rf: zemin satırı)
    bos(c0, r0, c1, rf - 1); sahte(c0, r0, c1, rf - 1)
    m = (c0 + c1) // 2
    sandik(m - 1, rf, odul[0]); ozel(odul[1], m + 1, rf); gizli(m, rf - 1)
    elmasSira(c0 + 1, c1 - 1, rf, 1, 2)

# ============================================================================================ ALT KAT (pas)
# ---------------------------------------------------------------- A. Kazan Dairesi (başlangıç)
bos(6, 172, 78, 193)
BASLA, DUKKAN = (12, 194), (8, 194)
sahteOda(1, 189, 5, 194)                                 # sol dış duvarda gizli oda
bayrak(16, 194)
tas(21, 190, 27, 193); tas(19, 192, 20, 193); tas(28, 192, 29, 193)        # 1. kazan (iki yanında basamak)
elmasSira(22, 26, 190, 2); kasa(24, 190)
plat(15, 18, 187); plat(9, 12, 184); sandik(10, 184, 'kizil'); plat(14, 20, 180); ozel('buyuk', 17, 180)   # kazandan yukarı yan tırmanış
bos(33, 194, 35, 196); diken(33, 35, 197); elmasYay(32, 36, 194, 1.5, 4); elle(31, 188, 37, 197)   # diken çukuru
kasa(39, 194); kasa(40, 194); kasa(41, 194); kasa(40, 194, ust=1)
tas(45, 185, 54, 192); elmasSira(46, 53, 194, 1)                            # 2. kazan: altından sürünülür, üstüne iskeleden inilir
sandik(49, 185, 'kalp'); elmasSira(46, 53, 185, 7)
plat(30, 43, 182); plat(56, 59, 182); plat(62, 70, 182)                     # iskele (zincirle çıkılır)
zincir(60, 179, 194)
elmasSira(63, 66, 182, 1); sandik(68, 182, 'kizil')
# iskelenin batı ucunda asılma bacası → gizli oyuk
tas(30, 172, 38, 177); bos(33, 158, 35, 177); bos(33, 158, 41, 160)
sandik(38, 161, 'yasam'); ozel('buyuk', 40, 161); gizli(39, 160); elmasSira(37, 41, 161, 2, 1.2); elle(29, 157, 42, 182)
kir(64, 194, 'kristal'); kir(67, 194, 'kristal'); kir(67, 194, 'kristal', ust=1)
bayrak(74, 194)
bos(79, 190, 80, 193)

# ---------------------------------------------------------------- B. Boru Labirenti (sürünme tünelleri, küçük kavşak odaları)
bos(81, 188, 85, 193)                                    # K1 giriş odası
bos(86, 193, 93, 193); elmasSira(87, 92, 194, 1)         # alt tünel
bos(94, 189, 99, 193)                                    # K2
bos(94, 181, 99, 184); bos(96, 185, 97, 188); zincir(96, 182, 194)   # K3 (K2'nin üstünde, zincirle)
bos(100, 184, 107, 184); elmasSira(101, 106, 185, 1)     # orta tünel
bos(108, 184, 113, 189); tas(108, 187, 109, 189)         # K4 (içinde dönüş basamağı)
bos(114, 189, 119, 189); elmasSira(115, 118, 190, 1)     # tünel → K5
bos(120, 186, 126, 193); tas(120, 190, 121, 192); tas(122, 192, 123, 192)   # K5 çıkış odası (basamakların altından kısayol tüneli geçer)
bos(127, 190, 129, 193)
bos(100, 193, 123, 193); kir(100, 194, gecit=1, sabit=1); elmasSira(102, 118, 194, 2)   # kısayol: taş tıkaçlı alt tünel (Taş Kırma)
bos(108, 174, 113, 177); bos(110, 178, 111, 183); zincir(110, 175, 190)                # K4'ün üstünde çıkmaz oda
sandik(108, 178, 'kizil'); elmasSira(112, 113, 178, 1); gizli(109, 177)
bos(86, 184, 93, 184); bos(82, 181, 85, 184); ozel('kizil', 83, 185); elmasSira(87, 92, 185, 1)   # K3'ün batısında çıkmaz hücre
elle(80, 173, 129, 193)

# ---------------------------------------------------------------- C. Hurda Kuyusu (dikey tırmanış: çıkıntılar, zincir, sahanlık, yığınlar)
bos(130, 143, 168, 193)
diken(144, 156, 194)
plat(133, 137, 191); plat(140, 143, 189); plat(147, 152, 187); plat(156, 160, 185); plat(163, 168, 182)
plat(157, 161, 179); plat(150, 154, 177)
tas(130, 166, 168, 166); bos(147, 166, 148, 166); bos(160, 166, 162, 166)   # sahanlık (zincir deliği + iniş deliği)
tas(132, 162, 137, 165); tas(138, 164, 139, 165); tas(134, 159, 136, 161)   # hurda yığını (basamak basamak)
plat(139, 148, 157); plat(149, 153, 155); plat(156, 162, 153); plat(165, 168, 150)
zincir(147, 163, 178)
plat(149, 152, 149); sandik(150, 149, 'buyuk'); elmas(152, 149)             # yüksek çıkıntı (pogo / çift zıplama)
sandik(131, 166, 'kalp'); bayrak(153, 166)
bos(169, 146, 171, 149)

# ---------------------------------------------------------------- L. Soğutma Tankları (gizli yan yol; sonunda başlangıca / dükkana geri düşülür)
# Giriş: Hurda Kuyusu sahanlığının batı ucundaki sandığın arkasındaki sahte duvar. Üç tank, üçü de ayrı fikir:
bos(126, 163, 129, 165); sahte(126, 163, 129, 165); gizli(123, 165)
bos(106, 148, 125, 165); diken(110, 120, 166)                                # 3. tank: diken havuzu üstünde zincirden zincire
for c in (117, 114, 111): zincir(c, 152, 164)
elmas(116.5, 166, 4.5); elmas(113.5, 166, 4.5); bayrak(123, 166); elle(106, 148, 125, 166)
bos(102, 165, 105, 165)                                                      # boru (sürünülür)
bos(82, 140, 101, 165)                                                       # 2. tank: org boruları gibi yükselen direkler, araları diken
for i, c in enumerate((98, 94, 90, 86)): tas(c, 163 - 3 * i, c + 1, 165)
tas(82, 151, 83, 151); bos(79, 148, 81, 150)
diken(96, 97, 166); diken(92, 93, 166); diken(88, 89, 166); diken(82, 85, 166)
bos(50, 140, 78, 165)                                                        # 1. tank: delikli katlardan aşağı (her katta dikenler)
tas(73, 151, 78, 151); tas(53, 154, 78, 154); tas(50, 160, 74, 160)
diken(66, 68, 154); diken(58, 60, 154); diken(65, 66, 160); diken(57, 58, 160); diken(60, 61, 166); diken(68, 69, 166)
sandik(77, 154, 'kizil'); sandik(77, 166, 'buyuk'); kir(70, 160, 'kristal'); kir(62, 160, 'kristal'); kir(72, 166, 'kristal')
bos(51, 166, 53, 171)                                                        # zemindeki delik → Kazan Dairesi'ne (2. kazanın üstüne) düşülür

# ---------------------------------------------------------------- D. Paslı Köprü (adalar) + altında Hurdalık
bos(172, 140, 233, 193)
tas(172, 150, 177, 152)                                                      # giriş iskelesi
plat(180, 184, 151); plat(187, 188, 149); plat(192, 197, 151); plat(200, 201, 148)
plat(204, 210, 146); plat(214, 216, 147); tas(222, 145, 233, 147)
plat(183, 186, 143); sandik(184, 143, 'yasam'); elmas(183, 143); elmas(186, 143)   # yüksek raf (çift zıplama / pogo)
bayrak(224, 145)
KILIT_UST = (227, 145)                                                       # anahtarla açılan kapı → Hazine Kasası
# hurdalık (zemin 194): batıda yığınlar, ortada diken tarlası ve anahtar direği, doğuda sahte duvarlı oda
zincir(178, 147, 194); zincir(219, 142, 194)
tas(183, 191, 188, 193); tas(185, 189, 187, 190); sandik(186, 189, 'kalp')
kasa(191, 194); kasa(192, 194); kir(175, 194, 'kristal')
diken(196, 207, 194); diken(212, 216, 194)
tas(208, 188, 211, 193); plat(202, 217, 182); elle(201, 180, 218, 194)       # anahtar direği + üstünde sundurma
ANAHTAR = [209 * T + 32, 188 * T - 24]
sahteOda(234, 189, 238, 194, ('kalp', 'buyuk'))
bos(229, 128, 230, 139)                                                      # orta kata çıkan zincir bacası
zincir(229, 125, 145)

# ============================================================================================ ORTA KAT (koyu çelik)
# ---------------------------------------------------------------- E. Dişli Salonu
bos(150, 92, 233, 127)
tas(229, 120, 233, 120)                                                      # zincirin asıldığı çıkıntı
bayrak(224, 128)
diken(190, 212, 128)                                                         # 1. dişlinin altı diken (pogo ile geçilir)
plat(217, 220, 125); plat(222, 225, 122); plat(217, 220, 119); plat(222, 225, 116); plat(210, 219, 113)   # zikzak basamaklar
def disli(cx, cy, R, ic):
    disk(cx, cy, R, ic)
    for k in range(6):                                                       # 6 diş (açıklıkların hizasında yok)
        a = math.radians(30 + 60 * k)
        g[round(cy + (R + 1.3) * math.sin(a))][round(cx + (R + 1.3) * math.cos(a))] = 1
# 1. dişli: ortasından geçen kol üstünde yürünür; soldaki alt cebe kol üstündeki delikten inilir (sandık), çapraz koldan çıkılır
disli(200, 112, 9, 7)
tas(191, 113, 209, 113); bos(191, 109, 192, 112); bos(208, 109, 209, 112)
tas(200, 104, 200, 106)
for k in range(1, 7): g[113 + k][200 - k] = 1; g[113 + k][200 + k] = 1
bos(196, 113, 197, 113)
sandik(195, 117, 'kizil'); elmas(197, 116)
elmasYay(193, 199, 113, 2.2, 5); elmasYay(201, 207, 113, 2.2, 5); ozel('kizil', 200, 113, 3)
tas(189, 113, 190, 113)
elle(189, 101, 211, 124)
# 2. dişli (küçük, daha yukarıda)
plat(185, 187, 110)
disli(178, 106, 6, 4.3)
tas(172, 107, 184, 107); bos(172, 103, 173, 106); bos(183, 103, 184, 106)
tas(178, 100, 178, 101); tas(178, 108, 178, 111)
elmasSira(174, 182, 107, 2, 1)
tas(168, 107, 171, 107); tas(166, 92, 167, 99); zincir(166, 104, 128)   # zincir tavandan inen kolona asılı
elle(171, 98, 189, 114)
# 3. dişli: dolu küçük disk, üstünde sandık; batısındaki direkten üst kanala zor atlayışlar
disk(162, 112, 4); sandik(161, 109, 'kalp')
plat(154, 155, 109); elmas(154, 109); elmas(155, 109)
elle(153, 105, 167, 117)
kasa(182, 128); kasa(183, 128); kasa(183, 128, ust=1); kir(172, 128, 'kristal'); kir(175, 128, 'kristal')
bayrak(157, 128)
bos(148, 124, 149, 127)

# ---------------------------------------------------------------- F. Pres Hattı (eğil, atla; her engel farklı)
bos(72, 114, 147, 127)
tas(142, 114, 145, 126); elmasSira(142, 145, 128, 1)                         # 1: eğilerek geç
tas(133, 114, 139, 121); bos(135, 128, 137, 130); diken(135, 137, 131)       # 2: alçak tavan altında diken çukuru
tas(124, 125, 130, 127); tas(125, 114, 129, 122); elmasSira(126, 128, 125, 1)   # 3: blok ile pres arasından
tas(115, 114, 120, 126); elmasSira(116, 119, 128, 1)                         # 4: uzun sürünme, çıkışında hemen çukur
bos(110, 128, 112, 130); diken(110, 112, 131)
tas(101, 126, 104, 127); tas(97, 124, 100, 127); tas(96, 114, 105, 119)      # 5: tavan alçalırken basamak
bos(85, 128, 87, 130); diken(85, 87, 131); bos(90, 128, 92, 130); diken(90, 92, 131)   # 6: çukur – dar direk – çukur
elmas(88.5, 128, 1.5)
bayrak(108, 128); bayrak(76, 128)
elle(84, 114, 147, 131)
# üst kanal (gizli): E'deki direkten zor atlayışla girilir, batı ucundaki delikten Pres Hattı'na inilir
bos(96, 104, 149, 108); bos(97, 109, 97, 119)
for c in (120, 124, 128): kir(c, 109, 'kristal')
sandik(100, 109, 'buyuk'); ozel('buyuk', 103, 109); gizli(101, 108); elmasSira(106, 146, 109, 2)
elle(96, 103, 149, 109)
bos(70, 124, 71, 127)

# ---------------------------------------------------------------- G. Asansör Boşluğu
bos(44, 70, 69, 127)
plat(63, 67, 125); plat(57, 61, 123); plat(50, 54, 121)
plat(44, 46, 104); plat(49, 49, 104)
tas(44, 96, 48, 96); zincir(47, 101, 120)
tas(51, 101, 52, 103); tas(53, 98, 60, 103)                                  # kabin (yanında basamak)
tas(56, 70, 57, 93)                                                          # halat: kabinin 4 kare üstünde biter (altından geçilir; baca ağzı)
zincir(54, 76, 98)                                                           # halat boyunca uzun zincir
plat(44, 53, 79)                                                             # üst sahanlık
bos(46, 62, 47, 69); zincir(46, 59, 79)                                      # üst kata çıkan zincir
tas(61, 70, 62, 93); bos(61, 79, 62, 82); tas(63, 83, 69, 84)                # ray; halat ile ray arası 3 karelik oluk → gizli oda
BONUS = [66 * T + 16, 83 * T]; gizli(65, 82); elmasSira(58, 60, 98, 1, 1); elle(58, 70, 69, 98)
bayrak(62, 128); bayrak(51, 79)

# ---------------------------------------------------------------- H. Depo (yan oda; kasa duvarı, itilen ve çekilen taş bulmacaları)
bos(6, 104, 41, 127); bos(42, 124, 43, 127)
tas(34, 104, 41, 123)
for k in range(4): kasa(37, 128, ust=k)                                      # kasa duvarı (Kasa Kırma)
kir(30, 128); plat(20, 26, 123); sandik(21, 123, 'kalp'); elmasSira(23, 26, 123, 1)   # taşı rafın altına it
tas(17, 125, 18, 127)                                                        # eşik: taş öteye geçmez
kir(6, 128); plat(10, 15, 123); sandik(13, 123, 'yasam'); elmasSira(10, 12, 123, 1)   # duvar dibindeki taşı çek
kir(24, 128, 'kristal'); kir(27, 128, 'kristal'); kir(15, 128, 'kristal')
sahteOda(1, 123, 5, 128, ('kalp', 'kizil'))
elle(6, 118, 41, 128)

# ---------------------------------------------------------------- M. Bakım Katı (yan yol): salyangoz koridor, ortasında hazine
# Asansör Boşluğu'nun üst sahanlığından batıya. Dış halka → iç halka → orta oda; dikey kollar zincirli (iki yöne de gidilir).
# İç halkanın doğu kolu ile dış halkanın doğu kolu arasındaki duvar sahte (dönüşte / bilen için kestirme).
bos(40, 76, 43, 78)
bos(8, 76, 39, 78); bos(8, 76, 10, 98); bos(8, 96, 39, 98); bos(37, 80, 39, 98)          # dış halka: üst, batı kolu, alt, doğu kolu
bos(12, 80, 39, 82); bos(12, 80, 14, 94); bos(12, 92, 35, 94); bos(33, 84, 35, 94)        # iç halka
bos(16, 84, 31, 90); bos(32, 84, 32, 86)                                                  # orta oda + kapısı
zincir(8, 77, 99); zincir(37, 81, 99); zincir(12, 81, 95); zincir(33, 85, 95)
bos(36, 84, 36, 86); sahte(36, 84, 36, 86)
tas(26, 76, 29, 77); tas(15, 96, 19, 97); tas(22, 80, 24, 81); tas(20, 92, 23, 93)        # alçak tavanlar (sürünülür)
kasa(33, 79); kasa(18, 79); kasa(27, 99); kasa(28, 99); kasa(28, 83); kasa(27, 95)
for c in (21, 30, 24): kir(c, 99 if c != 24 else 95, 'kristal')
sandik(18, 91, 'yasam'); sandik(29, 91, 'kalp'); ozel('buyuk', 22, 91); ozel('buyuk', 25, 91); ozel('kizil', 20, 91); ozel('kizil', 27, 91)
kir(16, 91, 'kristal'); kir(31, 91, 'kristal'); gizli(24, 90); elmasYay(21, 26, 91, 2.5, 6); elle(16, 83, 32, 91)
bayrak(38, 79)

# ============================================================================================ ÜST KAT (parlak çelik)
# ---------------------------------------------------------------- I. Kumanda Köprüleri + Arşiv
bos(40, 42, 112, 61)
tas(40, 55, 47, 55)                                                          # zincirin asıldığı çıkıntı
bayrak(51, 62)
bos(56, 62, 108, 64); diken(56, 108, 65)                                     # diken hendeği
plat(58, 60, 60); plat(63, 65, 58); plat(69, 72, 59); plat(75, 77, 57); plat(80, 84, 55)
zincir(87, 48, 56)
plat(90, 93, 52); plat(97, 98, 54); plat(102, 104, 56)
for c, r in ((67, 54), (74, 53), (79, 51)): plat(c, c, r); ozel('kizil', c, r)   # tek karelik direkler (zor)
bayrak(110, 62)
bos(113, 58, 113, 61)
elle(55, 44, 109, 65)
# Arşiv (batıda yan oda): kapısı 3 taş (Taş Kırma); içeride raflar
bos(6, 46, 37, 61); bos(38, 59, 39, 61); kapiTas(38, 62, 3)
for r, sutunlar in ((59, (9, 17, 25, 33)), (56, (13, 21, 29)), (53, (9, 17, 25)), (50, (13, 29))):
    for c in sutunlar: plat(c, c + 3, r)
sandik(14, 50, 'buyuk'); sandik(30, 50, 'kalp'); ozel('kizil', 22, 56, 1)
sahteOda(1, 57, 5, 62)

# ---------------------------------------------------------------- J. Reaktör (dev kürenin üstünden geçilir)
bos(114, 8, 178, 61)
disk(146, 36, 13)
plat(122, 126, 59); plat(117, 119, 56); plat(122, 124, 53)
tas(114, 34, 120, 34); zincir(119, 39, 51)
plat(122, 126, 42); plat(129, 132, 39); plat(125, 127, 36); plat(130, 133, 33)
plat(160, 164, 31); plat(168, 172, 31); tas(175, 30, 178, 30)
bos(179, 26, 181, 29)
# kürenin içi: tepedeki sahte kapaktan düşülür, zincirle çıkılır
bos(141, 32, 151, 38); bos(146, 23, 147, 31); sahte(146, 23, 147, 31)
tas(146, 8, 147, 18); zincir(146, 19, 39)                               # tavandan inen kol; zincir kürenin içine iner
sandik(143, 39, 'yasam'); ozel('buyuk', 149, 39); kir(141, 39, 'kristal'); kir(151, 39, 'kristal'); gizli(146, 38)
for c, r in ((135, 30), (136, 28), (138, 26), (141, 24), (144, 24), (149, 24), (151, 24), (154, 26), (156, 28), (157, 30)): elmas(c, r)
elle(132, 20, 160, 50)
bayrak(130, 62); bayrak(176, 30)
kasa(160, 62); kasa(161, 62); kasa(161, 62, ust=1); kir(166, 62, 'kristal'); kir(168, 62, 'kristal')
plat(172, 175, 56); ozel('buyuk', 173, 56); elmas(175, 56)                   # yüksek çıkıntı (pogo / çift zıplama)

# ---------------------------------------------------------------- K. Kule Tepesi (büyük merdiven, çıkış) + altında Hazine Kasası
bos(182, 6, 233, 29)
for c0, c1, r in ((187, 191, 28), (192, 195, 26), (198, 202, 24), (203, 205, 22), (209, 213, 22), (214, 217, 20),
                  (218, 221, 18), (224, 226, 16), (227, 233, 13)): tas(c0, r, c1, 29)
tas(206, 25, 208, 29); diken(206, 208, 25); tas(222, 21, 223, 29)   # basamak aralarındaki çukurlar
CIKIS = (230, 13)
bayrak(186, 30)
bos(184, 30, 185, 35); kir(184, 31, sabit=1); kir(185, 31, sabit=1)          # tıkaç (Taş Kırma) → Hazine Kasası
bos(184, 36, 231, 58)
tas(182, 21, 186, 21); zincir(184, 26, 59)                               # duvardan uzanan vinç kolu; zincir tıkacın içinden kasaya iner
KILIT_VARIS = (190, 59)
plat(194, 198, 55); plat(201, 211, 52); plat(214, 218, 55)
sandik(196, 59, 'kizil'); sandik(206, 59, 'buyuk'); sandik(216, 59, 'yasam')
for c in (200, 201, 210, 211, 220, 221): kir(c, 59, 'kristal')
ozel('buyuk', 206, 52); ozel('kizil', 196, 55); ozel('kizil', 216, 55); gizli(206, 58)
for r in (59, 55, 52):
    for c in range(193, 228, 2):
        if g[r][c] and not g[r - 1][c]: elmas(c, r, 1.3 if r == 59 else 0)
elle(184, 36, 231, 59); elle(182, 18, 187, 30)

# ============================================================================================ otomatik elmaslar
# Elle eşya konmamış her basılabilir yüzeye, yüzeyin uzunluğuna ve konumuna göre değişen dizilişle (tekrar etmesin diye).
def elleMi(c, r): return any(c0 <= c <= c1 and r0 <= r <= r1 for c0, r0, c1, r1 in ELLE)
def kar(a, b): h = (a * 73856093) ^ (b * 19349663); h = (h ^ (h >> 13)) * 1274126177 & 0xffffffff; return (h ^ (h >> 16))
dikenH = set()
for x, y, w in DIK:
    for c in range(x // T, (x + w) // T):
        for k in range(0, 4): dikenH.add((y // T - k, c))
for r in range(5, H - 3):
    c = 1
    while c < W - 1:
        ok = lambda c: g[r][c] and not g[r - 1][c] and not elleMi(c, r - 1) and (r, c) not in dikenH
        if not ok(c): c += 1; continue
        s0 = c
        while c < W - 1 and ok(c): c += 1
        uz, h = c - s0, kar(r, s0)
        yuksek = not g[r - 2][s0]                                            # üstü 2 kare açık mı (sürünme tüneli değil)
        if uz <= 1:
            if h % 3 == 0: elmas(s0, r)
        elif uz <= 4:
            if h % 2: elmasSira(s0, c - 1, r, 1)
            elif yuksek: elmas(s0 + (uz - 1) / 2, r, 1.2)
        else:
            tur = h % 4
            k = s0 + 1 + h % 3
            while k < c - 1:
                if tur == 0: elmasSira(k, min(k + 2, c - 2), r, 1); k += 8          # üçlü gruplar
                elif tur == 1: elmas(k, r); k += 3                                 # seyrek sıra
                elif tur == 2 and yuksek and k + 4 < c: elmasYay(k, k + 4, r, 1.6, 5); k += 9   # yaylar
                else: elmas(k, r, 1 if yuksek and (k // 2) % 2 else 0); k += 2     # dalgalı sıra

# ============================================================================================ düşmanlar (v1.79)
# Güçlü yürüyenler: domuz (3 can, gürz), golem (4 can, yumruk), büyücü (2 can götüren büyü), fıçı (dönerek atılır).
# Çiçek / arı / örümcek / yarasa / zayıflar yok. En az 6 karoluk, üstü 3 kare açık düz zeminlere, ~10 karoda bir;
# başlangıç, kontrol noktası, kapı, sandık, zincir, diken ve sahte duvarlı gizli odaların yakınına konmaz.
DUS = []
KATLAR = (('golem', 'buyucu', 'fici', 'domuz'), ('golem', 'buyucu', 'golem', 'fici'), ('domuz', 'fici', 'domuz', 'buyucu'))   # üst · orta · alt kat
yasak = [(x // T, y // T) for x, y in KON] + [BASLA, DUKKAN, CIKIS, KILIT_UST, KILIT_VARIS, (BONUS[0] // T, BONUS[1] // T)]
yasak += [(x // T, y // T) for x, y, _ in SAN] + [(x // T, (y + h) // T) for x, y, h in ZIN]
sahteH = set((r, c) for x, y, w, h in SAH for r in range(y // T - 1, (y + h) // T + 2) for c in range(x // T - 3, (x + w) // T + 3))
tasSut = set((y // T + 1, x // T) for x, y, tur, sb, gc in TAS)
def uygun(r, c):
    return (g[r][c] and not g[r - 1][c] and not g[r - 2][c] and not g[r - 3][c] and (r, c) not in dikenH and (r, c) not in sahteH
            and (r, c) not in tasSut and not any(abs(c - yc) < 5 and abs(r - yr) < 4 for yc, yr in yasak))
for r in range(6, H - 3):
    c = 1
    while c < W - 1:
        if not uygun(r, c): c += 1; continue
        s0 = c
        while c < W - 1 and uygun(r, c): c += 1
        if c - s0 < 6: continue
        tipler = KATLAR[0 if r < 66 else 1 if r < 132 else 2]
        k = s0 + 3 + kar(r, s0) % 2
        while k < c - 2:
            DUS.append({'tip': tipler[kar(k, r) % 4], 'x': k * T + 16, 'y': r * T})
            k += 8 + kar(k, r) % 4

# ============================================================================================ doğrulama
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
E2, gor, atilan = [], set(), 0
for x, y in E:
    if elmasGecerli(x, y) and (x, y) not in gor: E2.append([x, y]); gor.add((x, y))
    else: atilan += 1
E = E2
OZ = [o for o in OZ if elmasGecerli(o[1], o[2])]
HATA = []
def denet(kosul, *mesaj):
    if not kosul: HATA.append(mesaj)
for x, y, _ in SAN: denet(g[y // T][x // T] == 1 and g[y // T - 1][x // T] == 0, 'sandık havada / metalde', x // T, y // T)
for x, y in KON: denet(g[y // T][x // T] == 1 and g[y // T - 1][x // T] == 0 and g[y // T - 2][x // T] == 0, 'bayrak', x // T, y // T)
for ad, (c, r) in (('çıkış', CIKIS), ('başlangıç', BASLA), ('dükkan', DUKKAN), ('kilit', KILIT_UST), ('varış', KILIT_VARIS)):
    denet(g[r][c] == 1 and g[r - 1][c] == 0 and g[r - 2][c] == 0, ad, 'zeminde değil')
for x, y, tur, sabit, gecit in TAS:
    denet(not g[y // T][x // T], 'taş metalin içinde', x // T, y // T)
    if not sabit: denet(doluKare(y // T + 1, x // T), 'taş havada', x // T, y // T)
for x, y, h in ZIN: denet(not g[y // T][x // T] and not g[y // T][x // T - 1], 'zincir ucu metalde', x // T, y // T)
for x, y, w in DIK:
    for c in range(x // T, (x + w) // T): denet(g[y // T][c] == 1 and g[y // T - 1][c] == 0, 'diken zeminde değil', c, y // T)
for h in HATA: print('HATA', *h)

# ============================================================================================ çıktı
def bloklar():
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

orta = lambda cr: [cr[0] * T + 16, cr[1] * T]
alf = open(KOK + '/js/veri/level1.js', encoding='utf8').read().split("alfabe: '")[1].split("',")[0]
satir = lambda ad, liste: '  ' + ad + ': [\n' + ',\n'.join('    ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in liste) + '\n  ],\n'
s = '// 4. bölüm — Demir Kule: araclar/bolum4Uret.py üretir (elle düzenleme üretici yeniden çalışınca kaybolur). Karolar: araclar/zeminDose.py level4\n'
s += 'const LEVEL4 = {\n'
s += "  ad: '4. Bölüm - Demir Kule',\n"
s += f'  genislik: {W * T},\n  yukseklik: {H * T},\n  karo: {T},\n'
s += f'  baslangic: {json.dumps(orta(BASLA))},\n  cikis: {json.dumps(orta(CIKIS))},\n'
s += "  tirmanma: 'zincir',\n"
s += "  tema: 'metal',   // v1.73: kapı, bayrak, sandık, anahtar, diken, zincir metal görselleriyle (OyunSahnesi.tema)\n"
s += "  sussuz: true,   // bitki / kaya süsü yok (metal bölüm)\n"
s += "  bolgeler: [[0,'z'],[66,'y'],[132,'x']],   // üst parlak çelik · orta koyu çelik · alt pas\n"
s += f'  dukkan: {{ kapi: {json.dumps(orta(DUKKAN))} }},\n'
s += f'  patron: {{ kapi: {json.dumps(orta(CIKIS))} }},   // v1.70: çıkıştaki patron kapısından arenaya (Paslı Dev)\n'
s += f'  anahtar: {json.dumps(ANAHTAR)},\n'
s += '  // [kapı x, kapı y (zemin), varış x, varış y (zemin)] kilitli kapı: anahtarla açılır, ↑ ile Hazine Kasası\'na; ilk geçişten sonra iki yönlü\n'
s += f'  kilitKapi: {json.dumps(orta(KILIT_UST) + orta(KILIT_VARIS))},\n'
s += f'  bonus: {{ kapi: {json.dumps(BONUS)} }},\n'
s += "  alfabe: '" + alf + "',\n"
B = bloklar()
s += satir('bloklar', B)
s += satir('dikenler', DIK) + satir('sarmasiklar', ZIN) + satir('sandiklar', SAN) + satir('elmaslar', E)
s += satir('ozeller', OZ) + '  kayalar: [\n\n  ],\n'
s += '  // [x, y (sol üst), tür, sabit, geçit]\n' + satir('kirTaslar', TAS)
s += satir('kontrol', KON) + satir('ipuclari', IPU) + satir('dusmanlar', DUS)
s += satir('gizliler', GIZ)
s += '  // [x, y, w, h] sahte duvar: metal görünür, çarpışmasız gizli yer\n' + satir('sahte', SAH)
s += "  on: [\n  ],\n  arka: [\n  ]\n};\n"
open(KOK + '/js/veri/level4.js', 'w', encoding='utf8').write(s)
print('blok', len(B), 'elmas', len(E), '(atılan', atilan, ') özel', len(OZ), 'sandık', len(SAN), 'taş', sum(t[2] not in ('kasa', 'kristal') for t in TAS),
      'kasa', sum(t[2] == 'kasa' for t in TAS), 'kristal', sum(t[2] == 'kristal' for t in TAS), 'zincir', len(ZIN), 'gizli', len(GIZ), 'bayrak', len(KON), 'düşman', len(DUS), {t: sum(d['tip'] == t for d in DUS) for t in ('domuz', 'golem', 'buyucu', 'fici')})

# küçük harita görseli (depoya girmez)
onz = os.environ.get('L4_ONIZLEME')
if onz:
    from PIL import Image, ImageDraw
    S = 5
    im = Image.new('RGB', (W * S, H * S), (12, 16, 24)); d = ImageDraw.Draw(im)
    renk = lambda r: (150, 160, 175) if r < 66 else (95, 100, 115) if r < 132 else (150, 90, 55)
    for r in range(H):
        for c in range(W):
            if g[r][c]: d.rectangle((c * S, r * S, c * S + S - 1, r * S + S - 1), fill=renk(r))
    for x, y, w, h in SAH: d.rectangle((x // T * S, y // T * S, (x + w) // T * S - 1, (y + h) // T * S - 1), fill=(120, 60, 160))
    for x, y, w in DIK: d.rectangle((x // T * S, y // T * S - 2, (x + w) // T * S - 1, y // T * S - 1), fill=(255, 40, 40))
    for x, y, h in ZIN: d.line((x / T * S, y / T * S, x / T * S, (y + h) / T * S), fill=(255, 220, 0), width=1)
    for x, y in E: d.point((x / T * S, y / T * S), fill=(255, 255, 80))
    for t, x, y in OZ: d.rectangle((x / T * S - 1, y / T * S - 1, x / T * S + 1, y / T * S + 1), fill=(80, 160, 255) if t == 'buyuk' else (255, 80, 120))
    for x, y, o in SAN: d.rectangle((x / T * S - 2, y / T * S - 4, x / T * S + 2, y / T * S - 1), fill=(60, 220, 90))
    for x, y, tur, sb, gc in TAS: d.rectangle((x // T * S + 1, y // T * S + 1, x // T * S + S - 2, y // T * S + S - 2), fill=(200, 150, 90) if tur == 'kasa' else (120, 230, 230) if tur == 'kristal' else (230, 230, 230))
    for x, y in KON: d.line((x / T * S, y / T * S - 8, x / T * S, y / T * S), fill=(255, 255, 255), width=1)
    for (x, y), rk in ((orta(BASLA), (0, 255, 0)), (orta(CIKIS), (0, 255, 255)), (orta(KILIT_UST), (255, 0, 255)), (orta(KILIT_VARIS), (255, 0, 255)),
                       (BONUS, (255, 140, 0)), (ANAHTAR, (255, 255, 255)), (orta(DUKKAN), (0, 160, 0))):
        d.rectangle((x / T * S - 2, y / T * S - 7, x / T * S + 2, y / T * S), outline=rk)
    im.save(onz)
assert not HATA, 'yukarıdaki hatalar düzeltilmeli'
