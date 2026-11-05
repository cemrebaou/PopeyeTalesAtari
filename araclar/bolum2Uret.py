# 2. bölüm üretici (v0.68): js/veri/level2.js'i baştan yazar, sonra zeminDose.py ile karolar döşenir.
# Çalıştırma: python3 araclar/bolum2Uret.py && python3 araclar/zeminDose.py level2 && node araclar/erisim.js level2
#
# Yerleşim (240 × 198 karo = 7680 × 6336 px, 1. bölümün ~2 katı). Dünya tamamen taştır, odalar oyulur.
# 3 kat: A (satır 0–65) açık gri taş · K (66–131) koyu taş · M (132–197) mor kristal. Her katta 3 koridor:
#   üst (zemin satırı +18), ana (+40), alt (+60). Ana yol: A ana (sağa) → sağda büyük iniş mağarası → K ana (sola) →
#   solda iniş mağarası → M ana (sağa) → çıkış kapısı. Üst / alt koridorlar ödüllü yan yollar (zincir, delik, mağara ile bağlı).
# Gizli yerler: şelale arkasındaki görünmez zemin + sahte duvarlı oda (A sol), sahte duvarlı odalar, bastonla duvara
#   asılarak çıkılan bacalar, pogo ile çıkılan yüksek çıkıntılar, kırılır taş kapılar, itilir taşla çıkılan çıkıntılar.
# Düşman yok (şimdilik). Her bölgenin kırılır taşı: A gri · K koyu · M mor (+ kristal: içinden küçük elmas).
import json
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
    if c1 - c0 > 12: adim = max(adim, 5)     # uzun sıralar seyrek
    elif c1 - c0 > 7: adim = max(adim, 4)
    elif c1 - c0 > 2: adim = max(adim, 2)
    for c in range(c0, c1 + 1, adim): elmas(c, rf, yuk)
def elmasYay(c0, c1, rf, tepe=3, n=5):     # zıplama yayı boyunca (rf: kalkış zemini)
    for i in range(n):
        t = i / (n - 1); elmas(c0 + (c1 - c0) * t, rf, 0.6 + tepe * 4 * t * (1 - t))
def sandik(c, rf, odul): SAN.append([c * T + 16, rf * T, odul])
def ozel(tip, c, rf, yuk=0): OZ.append([tip, c * T + 16, rf * T - 22 - round(yuk * T)])
def kir(c, rf, tur=None, gecit=0, ust=0): TAS.append([c * T, (rf - 1 - ust) * T, tur or kat(rf), 0, gecit])
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
def delik(c, r0, r1): bos(c, r0, c + 1, r1)  # 2 genişlikli dikey delik
def asilmaBacasi(c, rf, ustSatir, tepe):
    # Koridor tavanı bacanın çevresinde rf-5'e iner; 3 genişlikli baca tepe satırına çıkar.
    # Zıplayınca baston baca duvarına takılır; duvardan duvara asılıp zıplayarak çıkılır.
    tas(c - 3, ustSatir, c + 5, rf - 5)
    bos(c, tepe, c + 2, rf - 5)

# ======================================================================= A KATI (açık gri taş)
A1, A2, A3 = 18, 40, 60                       # zemin satırları (boşluk: 4–17, 24–39, 46–59)

# --- A2 ana koridor (16–213)
bos(16, 24, 213, 39)
BASLA = (24, A2)
# Sol uç gizemi: görünür zemin 16'da biter → 13–15 uçurum → 8–13 şelale (ardında 8–12 görünmez zemin, oyuncu da görünmez)
# → 2–7 sahte duvarlı gizli oda. Şelaleye atlayan zemine basar, sola yürüyünce oda açılır. Kaçıran alt koridora düşer.
bos(8, 20, 15, 59)
bos(2, 30, 7, 39)
tas(2, A2, 12, A2)                                     # zeminin ucu da şelalenin içinde kalır (kenarda duran görünmez)
for c in (8, 10, 12): selale(c, 2, 20, A3, onde=1)          # yan yana 3 şelale
sahte(2, 30, 7, 39)
gizli(5, A2 - 1)
sandik(3, A2, 'yasam'); ozel('buyuk', 6, A2); elmasSira(4, 7, A2, 1, 2.2)
# Başlangıç
elmasSira(18, 22, A2, 2)
kasa(26, A2); kasa(27, A2); kasa(27, A2, ust=1)
# Basamaklar (3 ve 5 yüksek) → çukur (alt koridora açılır, zincirle geri çıkılır)
tas(30, 37, 32, 39); tas(33, 35, 35, 39)
elmasSira(30, 32, 37, 1); elmasSira(33, 35, 35, 1)
bos(40, A2, 42, 45)
zincir(40, A2 - 2, A3)
elmasYay(39, 43, A2, 2.5)
# A1'e zincir (yan yol) + yüzen platform
delik(50, A1, 23); zincir(50, 6, A2)
elmasSira(46, 48, A2, 1); elmasSira(53, 59, A2, 2)
tas(55, 36, 58, 36); elmasSira(55, 58, 36, 1)
# Sütunlar ve diken çukuru (atla ya da pogo ile sek)
tas(62, 36, 63, 39); tas(70, 35, 71, 39); tas(66, 33, 67, 33)
bos(64, A2, 69, A2 + 3); diken(64, 69, A2 + 4)
elmasYay(63, 70, 36, 2.5, 6)
# İtilir taş bulmacası: 5 yukarıdaki çıkıntıda sandık; taşı altına it, üstünden zıpla (altından yürünür)
tas(88, 35, 97, 35)
kir(78, A2)
sandik(95, 35, 'kalp'); elmasSira(89, 93, 35, 2)
elmasSira(74, 86, A2, 3)
# Kontrol noktası, kasa yığını
bayrak(103, A2)
kasa(107, A2); kasa(108, A2); kasa(109, A2); kasa(108, A2, ust=1)
# Taş kapı (tavan iner, 3 gri taş) ve arkasında sandık
tas(116, 24, 118, 36); kapiTas(117, A2, 3)
sandik(121, A2, 'kizil'); elmasSira(119, 125, A2, 2, 1)
# Alt koridora delik (zincirle geri)
delik(130, A2, 45); zincir(130, A2 - 3, A3)
elmasSira(127, 128, A2, 1); elmasSira(133, 138, A2, 2)
# Büyük salon (A1 ile birleşik, 140–180): basamak platformlarla tepedeki sandığa; zincirle yüksek rafa
bos(140, 6, 180, 39)
for c0, c1, r in [(142, 147, 36), (149, 153, 33), (144, 148, 30), (151, 156, 27), (158, 163, 24), (165, 170, 21), (172, 179, 18)]:
    tas(c0, r, c1, r); elmasSira(c0 + 1, c1 - 1, r, 2)
tas(140, A1, 141, A1)                                  # A1 koridoru salona açılır
sandik(177, A1, 'kizil'); elmasYay(148, 152, 33, 2, 4)
tas(151, 12, 155, 12); zincir(156, 7, 24)              # yüksek raf: platformdan zincirle çık, sola atla
ozel('buyuk', 152, 12); elmas(154, 12)
kasa(160, A2); kasa(161, A2); kasa(166, A2); kasa(167, A2); kasa(167, A2, ust=1)
# Arka şelale ve elmaslı sığ havuz
selale(186, 3, 24, A2 + 1)
bos(184, A2, 191, A2 + 1)
elmasSira(185, 190, A2 + 2, 2)
# Bastonla asılma bacası → A1–A2 arasındaki gizli oyuk (yakut)
asilmaBacasi(196, A2, 24, 19)
bos(193, 19, 198, 21)
ozel('kizil', 194, 22); elmasSira(195, 198, 22, 1, 0.6); gizli(195, 21)
ipucu(203, 31, 'Zıpla, duvara doğru bas:\nbastonla asılırsın.\nDuvardan duvara zıpla!')
bayrak(205, A2)
kasa(209, A2); kasa(210, A2)
elmasSira(203, 212, A2, 3)

# --- A1 üst yan yol (30–139): 50 zinciriyle çıkılır, salona açılır
bos(30, 4, 139, 17)
tas(30, 15, 33, 17); sandik(31, 15, 'kizil')
elmasSira(34, 48, A1, 2)
tas(38, 12, 41, 12); elmasSira(38, 41, 12, 1)
kasa(55, A1); kasa(56, A1); kasa(57, A1); kasa(56, A1, ust=1)
tas(70, 4, 72, 14); kapiTas(71, A1, 3)
sandik(76, A1, 'kalp'); elmasSira(73, 79, A1, 2)
elmasSira(82, 92, A1, 2)
tas(95, 12, 98, 12); ozel('kizil', 96, 12); elmas(97, 12)          # pogo çıkıntısı (6 yukarı)
tas(104, 14, 105, 17); tas(109, 13, 110, 17); tas(114, 14, 115, 17)  # sütunlar
elmasYay(105, 109, 14, 2, 4); elmasYay(110, 114, 13, 2, 4)
delik(122, A1, 23)                                                   # A2'ye kısayol (taş kapının arkasına iner)
kasa(127, A1); kasa(128, A1); kasa(133, A1); kasa(134, A1)
elmasSira(117, 120, A1, 1)

# --- A3 alt yan yollar
# Sol (2–44): şelalenin düştüğü yer; 40 zinciriyle A2'ye
bos(2, 46, 44, 59)
tas(2, 56, 5, 59); sandik(3, 56, 'kalp')
elmasSira(16, 36, A3, 2)
kasa(20, A3); kasa(21, A3); kasa(21, A3, ust=1)
tas(26, 56, 30, 59); elmasSira(26, 30, 56, 1)
# Orta (100–150): 130 deliğinden inilir
bos(100, 46, 150, 59)
elmasSira(102, 108, A3, 2)
kir(104, A3, 'kristal'); kir(104, A3, 'kristal', ust=1)
tas(110, 54, 114, 59); tas(116, 57, 117, 59); sandik(112, 54, 'yasam')
kasa(120, A3); kasa(121, A3); kasa(122, A3)
elmasSira(124, 128, A3, 2)
tas(134, 56, 135, 59); tas(138, 53, 139, 59); tas(142, 50, 144, 59)
elmasYay(135, 138, 56, 2, 4); elmasYay(139, 142, 53, 2, 4)
sandik(143, 50, 'kizil')
# Sağ (196–213): iniş mağarasından girilir
bos(196, 46, 213, 59)
elmasSira(198, 210, A3, 3); kasa(202, A3); kasa(203, A3); kasa(203, A3, ust=1)

# ===================================================== büyük iniş mağarası A → K (214–237, satır 24–105)
bos(214, 24, 237, 105)
bos(206, 70, 213, 83)                                  # K1'e açılır
for r in range(44, 104, 4):
    if (r - 44) % 8 == 0: tas(214, r, 224, r); elmas(220, r)   # sol: 44, 52, 60 (A3), 68, 76, 84 (K1), 92, 100
    else: tas(227, r, 236, r); elmas(232, r)
kasa(234, 56); kasa(235, 56); kasa(234, 80); kasa(235, 80)
sandik(235, 96, 'kizil')

# ======================================================================= K KATI (koyu taş)
K1, K2, K3 = 84, 106, 126                     # boşluk: 70–83, 90–105, 112–125
# --- K2 ana koridor (26–213), sağdan sola
bos(26, 90, 213, 105)
bayrak(209, K2)
kasa(200, K2); kasa(201, K2); kasa(196, K2)
elmasSira(202, 212, K2, 2)
delik(188, K1, 89); zincir(188, 72, K2)                # K1'e
elmasSira(184, 186, K2, 1)
# Uzun çukur (141–180) üstünde yüzen platformlar — kaçıran K3'e düşer
bos(141, K2, 180, 111)
for c0, c1, r in [(176, 179, 104), (171, 173, 102), (166, 168, 104), (161, 163, 101), (155, 157, 103), (150, 152, 100), (144, 146, 103)]:
    tas(c0, r, c1, r); elmas((c0 + c1) // 2, r)
elmasYay(168, 171, 104, 2, 3); elmasYay(157, 161, 103, 2, 3); elmasYay(146, 150, 103, 2, 3)
# Arka şelale, yüksek blok (basamakla çıkılır, üstünde sandık)
selale(118, 3, 90, K2)
tas(100, 99, 108, 105); tas(110, 103, 112, 105)
sandik(102, 99, 'kalp'); elmasSira(104, 108, 99, 2)
elmasSira(114, 138, K2, 3)
kasa(126, K2); kasa(127, K2); kasa(127, K2, ust=1)
# Bastonla asılma bacası → K1–K2 arasındaki gizli oyuk (mavi elmas)
asilmaBacasi(134, K2, 90, 85)
bos(131, 85, 136, 87)
ozel('buyuk', 132, 88); elmas(133, 88); gizli(132, 87)
# Kontrol noktası, alçak tünel (eğilerek geçilir), kasalar
bayrak(95, K2)
tas(68, 90, 85, 104); elmasSira(68, 85, K2, 2)
kasa(88, K2); kasa(89, K2); kasa(89, K2, ust=1)
# Taş kapı ve iniş mağarasına
elmasSira(30, 64, K2, 3)
tas(45, 90, 47, 102); kapiTas(46, K2, 3)
sandik(40, K2, 'kizil')
# --- K1 üst yan yol (120–213): 188 zinciriyle ya da iniş mağarasından
bos(120, 70, 213, 83)
elmasSira(190, 205, K1, 2)
kasa(180, K1); kasa(181, K1); kasa(182, K1); kasa(181, K1, ust=1)
tas(160, 81, 163, 83); tas(166, 78, 169, 83); tas(170, 81, 172, 83)
sandik(168, 78, 'kizil'); elmasSira(160, 163, 81, 1)
tas(140, 78, 143, 78); ozel('kizil', 141, 78); elmas(142, 78)       # pogo çıkıntısı
elmasSira(145, 156, K1, 3)
tas(129, 70, 131, 80); kapiTas(130, K1, 3)
sandik(124, K1, 'buyuk'); elmasSira(121, 127, K1, 3, 1)
# Sahte duvarlı gizli oda (K1 sol uçtaki "duvar")
bos(110, 74, 119, 83); sahte(110, 74, 119, 83)
sandik(112, K1, 'yasam'); elmasSira(114, 118, K1, 2, 1.5); gizli(114, K1 - 1)
# --- K1 sol yan yol (30–98): 93 zinciriyle
bos(30, 70, 98, 83)
delik(93, K1, 89); zincir(93, 72, K2)
elmasSira(60, 80, K1, 2)
tas(50, 80, 56, 83); sandik(53, 80, 'kalp')
kasa(40, K1); kasa(41, K1); kasa(42, K1); kasa(41, K1, ust=1); kasa(42, K1, ust=1)
tas(32, 80, 36, 83); ozel('kizil', 34, 80); elmas(35, 80)
kir(87, K1); kir(87, K1, ust=1); kir(89, K1)
# --- K3 alt yan yol (120–200): uzun çukurdan düşülür, zincirlerle çıkılır
bos(120, 112, 200, 125)
zincir(147, 96, K3)
zincir(174, 96, K3)                                     # çukurun içinde, platformların arasında
bos(150, K3, 160, 127); diken(150, 160, 128)
tas(153, 122, 157, 122); elmasSira(153, 157, 122, 1)
elmasSira(122, 148, K3, 3); elmasSira(162, 198, K3, 3)
sandik(197, K3, 'kizil'); kasa(190, K3); kasa(191, K3)
kir(124, K3); kir(124, K3, ust=1); sandik(121, K3, 'kalp')

# ===================================================== iniş mağarası K → M (4–25, satır 90–171)
bos(4, 90, 25, 171)
for r in range(110, 171, 4):
    if (r - 110) % 8 == 0: tas(16, r, 25, r); elmas(20, r)   # sağ: 110, 118, 126 (K3), 134, 142, 150 (M1), 158, 166
    else: tas(4, r, 13, r); elmas(9, r)
bos(26, 112, 34, 125); sandik(31, K3, 'kizil'); elmasSira(27, 30, K3, 1)   # K3 sol odası
bos(26, 136, 40, 149)                                                        # M1'e geçit
kasa(5, 138); kasa(6, 138)

# ======================================================================= M KATI (mor kristal)
M1, M2, M3 = 150, 172, 192                    # boşluk: 136–149, 156–171, 178–191
# --- M2 ana koridor (26–237)
bos(26, 156, 237, 171)
bayrak(21, M2)
# Kristal bahçesi (kristal taşlardan küçük elmas dökülür)
for c in (32, 36, 44, 52, 60): kir(c, M2, 'kristal')
kir(44, M2, 'kristal', ust=1)
kir(40, M2); kir(48, M2); kir(48, M2, ust=1); kir(56, M2)
elmasSira(30, 66, M2, 4, 1.4)
# Diken çukurları, ortada basamak taşları
for c0 in (70, 80, 90):
    bos(c0, M2, c0 + 6, M2 + 2); diken(c0, c0 + 6, M2 + 3)
    tas(c0 + 2, 170, c0 + 4, 170); elmasSira(c0 + 2, c0 + 4, 170, 1)
    elmasYay(c0 - 1, c0 + 2, M2, 1.5, 3); elmasYay(c0 + 4, c0 + 7, 170, 1.5, 3)
delik(104, M1, 155); zincir(104, 138, M2)              # M1'e
# Kontrol, itilir taş bulmacası (5 yukarıda raf), asılma bacası
bayrak(110, M2)
kir(118, M2)
tas(128, 167, 135, 167); sandik(133, 167, 'kizil'); elmasSira(129, 131, 167, 1)
asilmaBacasi(142, M2, 156, 151)
bos(139, 151, 144, 153)
ozel('buyuk', 140, 154); elmas(141, 154); gizli(140, 153)
elmasSira(112, 126, M2, 2)
# Arka şelale, havuz, yüzen platformlar
selale(160, 4, 156, M2 + 2)
bos(156, M2, 168, M2 + 2)
elmasSira(157, 167, M2 + 3, 2)
for c0, c1, r in [(170, 173, 169), (176, 179, 166), (182, 185, 169)]:
    tas(c0, r, c1, r); elmasSira(c0, c1, r, 1)
ozel('kizil', 177, 166, 1.5)
kasa(188, M2); kasa(189, M2); kasa(190, M2); kasa(189, M2, ust=1)
# Son düzlük: M3'e delik, kontrol, kristaller, çıkış
delik(196, M2, 177); zincir(196, M2 - 3, M3)
elmasSira(199, 226, M2, 3)
bayrak(208, M2)
kir(220, M2, 'kristal'); kir(222, M2, 'kristal')
CIKIS = (233, M2)
# --- M1 üst yan yol (26–140): iniş mağarasından ya da 104 zinciriyle
bos(40, 136, 140, 149)
sandik(46, M1, 'kizil'); kasa(50, M1); kasa(51, M1)
elmasSira(53, 58, M1, 2)
tas(60, 146, 63, 149); tas(66, 143, 69, 149); tas(72, 140, 75, 140); ozel('kizil', 73, 140)
elmasSira(60, 63, 146, 1); elmasSira(66, 69, 143, 1)
kir(80, M1, 'kristal'); kir(80, M1, 'kristal', ust=1); kir(81, M1, 'kristal')
elmasSira(84, 100, M1, 2); elmasSira(108, 122, M1, 2)
tas(125, 136, 127, 146); kapiTas(126, M1, 3)
sandik(134, M1, 'buyuk'); elmasSira(129, 139, M1, 2)
bos(141, 140, 150, 149); sahte(141, 140, 150, 149)      # sahte duvarlı gizli oda (M1 sağ uç)
sandik(148, M1, 'yasam'); ozel('kizil', 145, M1); elmasSira(142, 146, M1, 2, 1.5); gizli(145, M1 - 1)
# --- M3 alt yan yol (150–236): 196 ve 216 zincirleriyle
bos(150, 178, 236, 191)
elmasSira(152, 194, M3, 3); elmasSira(199, 234, M3, 3)
for c in (166, 170, 174): kir(c, M3, 'kristal')
tas(206, 188, 210, 191); sandik(208, 188, 'kizil')
delik(216, M2, 177); zincir(216, M2 - 3, M3)
kasa(224, M3); kasa(225, M3); kasa(226, M3); kasa(225, M3, ust=1)
sandik(234, M3, 'kalp')
tas(150, 188, 153, 191); ozel('kizil', 151, 188)

# ======================================================================= ek bölgeler (alanı 2 katına çıkarır)
# --- A3 batı-orta (45–99): A3 sol ile orta birleşir
bos(45, 46, 99, 59)
tas(48, 57, 50, 59); elmasSira(48, 50, 57, 1)
bos(55, A3, 60, A3 + 1); diken(55, 60, A3 + 2); tas(57, 57, 58, 57); elmasSira(57, 58, 57, 1)
kasa(65, A3); kasa(66, A3); kasa(67, A3); kasa(66, A3, ust=1); kasa(67, A3, ust=1)
selale(76, 2, 46, A3)
tas(82, 56, 86, 59); sandik(84, 56, 'kalp'); elmasSira(82, 86, 56, 2)
kir(92, A3); kir(92, A3, ust=1)
elmasSira(62, 74, A3, 4); elmasSira(88, 98, A3, 3)
# --- A3 doğu (151–195): A3 orta ile sağ birleşir
bos(151, 46, 195, 59)
tas(155, 57, 157, 59); tas(158, 54, 160, 59); sandik(159, 54, 'kizil'); elmasSira(155, 157, 57, 1)
bos(164, A3, 175, A3 + 1); diken(164, 175, A3 + 2)
tas(166, 57, 167, 57); tas(170, 56, 171, 56); elmasSira(166, 167, 57, 1); elmasSira(170, 171, 56, 1)
kasa(180, A3); kasa(181, A3); kasa(182, A3); kasa(181, A3, ust=1)
kir(188, A3, 'kristal'); kir(190, A3, 'kristal')
elmasSira(177, 194, A3, 4)
# --- A1 doğu (181–213) ve iniş mağarasının tepesi (satır 4–23)
bos(181, 4, 213, 17)
bos(214, 4, 237, 23)
kasa(185, A1); kasa(186, A1); kasa(186, A1, ust=1)
tas(192, 15, 195, 17); tas(199, 12, 202, 12); ozel('kizil', 200, 12); elmasSira(192, 195, 15, 1)
elmasSira(204, 212, A1, 3)
for r, sol in [(40, 0), (36, 1), (32, 0), (28, 1), (24, 0), (20, 1)]:
    if sol: tas(214, r, 224, r); elmas(220, r)
    else: tas(227, r, 236, r); elmas(232, r)
kasa(234, 24); kasa(235, 24); sandik(233, 32, 'kalp')
# --- K3 batı (35–119): iniş mağarasının K3 odası ile K3 birleşir
bos(35, 112, 119, 125)
kasa(38, K3); kasa(39, K3); kasa(40, K3); kasa(39, K3, ust=1)
tas(50, 122, 54, 125); sandik(52, 122, 'kizil'); elmasSira(50, 54, 122, 2)
bos(60, K3, 70, K3 + 1); diken(60, 70, K3 + 2)
tas(62, 123, 63, 123); tas(66, 122, 67, 122); elmasSira(62, 63, 123, 1); elmasSira(66, 67, 122, 1)
tas(79, 112, 81, 122); kapiTas(80, K3, 3)
selale(92, 3, 112, K3 + 1); bos(90, K3, 96, K3 + 1); elmasSira(90, 96, K3 + 2, 2)
elmasSira(42, 48, K3, 3); elmasSira(72, 78, K3, 3); elmasSira(83, 88, K3, 2); elmasSira(99, 118, K3, 4)
kir(108, K3); kir(110, K3); kir(110, K3, ust=1)
# --- K3 doğu (201–236): mağara tabanındaki delikten zincirle
bos(201, 112, 236, 125)
delik(231, K2, 111); zincir(231, 98, K3)
tas(211, 112, 213, 122); kapiTas(212, K3, 3)
sandik(203, K3, 'buyuk'); elmasSira(204, 209, K3, 2, 1)
kasa(216, K3); kasa(217, K3); kasa(218, K3); kasa(217, K3, ust=1)
tas(222, 122, 225, 125); elmasSira(222, 225, 122, 1)
elmasSira(226, 236, K3, 3)
# --- M3 batı (5–149): iniş mağarasının tabanındaki delikten zincirle; M3 boydan boya
bos(5, 178, 149, 191)
delik(14, M2, 177); zincir(14, 160, M3)
sandik(6, M3, 'yasam'); elmasSira(7, 11, M3, 2, 1.5)
for c in (19, 23, 27): kir(c, M3, 'kristal')
kir(23, M3, 'kristal', ust=1)
for c0 in (34, 44):
    bos(c0, M3, c0 + 6, M3 + 2); diken(c0, c0 + 6, M3 + 3)
    tas(c0 + 2, 190, c0 + 4, 190); elmasSira(c0 + 2, c0 + 4, 190, 1)
kir(54, M3); kir(54, M3, ust=1); kir(57, M3)
kasa(60, M3); kasa(61, M3); kasa(61, M3, ust=1)
tas(66, 189, 69, 191); tas(70, 186, 73, 191); sandik(72, 186, 'kizil'); elmasSira(66, 69, 189, 1)
selale(80, 3, 178, M3 + 1); bos(78, M3, 85, M3 + 1); elmasSira(78, 85, M3 + 2, 2)
tas(94, 186, 97, 186); ozel('buyuk', 95, 186); elmas(96, 186)       # pogo çıkıntısı (6 yukarı)
tas(109, 178, 111, 188); kapiTas(110, M3, 3)
sandik(114, M3, 'kalp'); elmasSira(116, 122, M3, 2, 1)
kasa(130, M3); kasa(131, M3); kasa(136, M3)
elmasSira(12, 32, M3, 4); elmasSira(88, 106, M3, 3); elmasSira(124, 148, M3, 4)
# --- M1 doğu (153–236): M2'den 180 zinciriyle
bos(153, 136, 236, 149)
delik(180, M1, 155); zincir(180, 138, M2)
kasa(156, M1); kasa(157, M1); kasa(158, M1); kasa(157, M1, ust=1)
kir(164, M1, 'kristal'); kir(167, M1, 'kristal'); kir(167, M1, 'kristal', ust=1)
tas(188, 144, 191, 144); ozel('kizil', 189, 144); elmas(190, 144)  # pogo çıkıntısı
tas(200, 147, 202, 149); tas(204, 144, 206, 149); sandik(205, 144, 'kalp'); elmasSira(200, 202, 147, 1)
tas(214, 136, 216, 146); kapiTas(215, M1, 3)
sandik(233, M1, 'buyuk'); elmasSira(218, 231, M1, 3, 1)
elmasSira(160, 178, M1, 4); elmasSira(183, 198, M1, 3)

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
s += "  tirmanma: 'zincir',\n  zeminGomme: 6,\n"
s += "  bolgeler: [[0,'a'],[66,'k'],[132,'m']],\n"
s += "  alfabe: '" + alf + "',\n"
B = bloklar()
s += satir('bloklar', B)
s += satir('dikenler', DIK) + satir('sarmasiklar', ZIN) + satir('sandiklar', SAN) + satir('elmaslar', E)
s += satir('ozeller', OZ) + '  kayalar: [\n\n  ],\n'
s += '  // [x, y (sol üst), tür, sabit, geçit]\n' + satir('kirTaslar', TAS)
s += satir('kontrol', KON) + satir('ipuclari', IPU) + '  dusmanlar: [\n\n  ],\n'
s += satir('gizliler', GIZ)
s += '  // [x, y, w, h] sahte duvar: taş görünür, çarpışmasız gizli oda\n' + satir('sahte', SAH)
s += '  // [x, w, y0, y1, önde] önde=1: oyuncunun önünde (arkası görünmez)\n' + satir('selaleler', SEL)
s += "  on: [\n  ],\n  arka: [\n  ]\n};\n"
open(KOK + '/js/veri/level2.js', 'w', encoding='utf8').write(s)
# kaba önizleme (scratch): her karakter 1 karo
open('/tmp/claude-0/-home-claude/85164cd8-761e-5dc1-8ca5-a447e90ed51c/scratchpad/l2.txt', 'w').write(
    '\n'.join(''.join('#' if v else '.' for v in row) for row in g))
print('blok', len(B), 'elmas', len(E), 'özel', len(OZ), 'sandık', len(SAN), 'taş', len(TAS), 'zincir', len(ZIN))
