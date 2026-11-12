# 4. bölüm metal demo (v1.66) → js/veri/level4.js. Üç kat: alt (pas) → sağdaki merdivenle orta (koyu) → soldaki merdivenle üst (parlak).
# Basamak 64×64. Merdivenin son iki basamağının üstü açık (üst döşemede boşluk), alttaki basamakların üstünde döşeme kalır (128 px baş payı).
import json
KOK = __file__.rsplit('/araclar/', 1)[0]
T, W, H = 32, 1984, 1088
bl = []
b = lambda x, y, w, h: bl.append([x, y, w, h])
b(0, 0, W, 64); b(0, 64, 64, H - 64); b(W - 64, 64, 64, H - 64); b(64, 960, W - 128, 128)   # tavan, duvarlar, zemin
# alt kat merdiveni: sağa yükselir, x 1600–1856 (üstler 896, 832, 768, 704); boşluk x 1728–1856
for j in range(4): b(1600 + 64 * j, 896 - 64 * j, 64, 64 + 64 * j)
b(64, 640, 1728 - 64, 64); b(1856, 640, 64, 64)
# orta kat merdiveni: sola yükselir, x 128–384 (sağdan üstler 576, 512, 448, 384); boşluk x 128–256
for j in range(4): b(320 - 64 * j, 576 - 64 * j, 64, 64 + 64 * j)
b(64, 320, 64, 64); b(256, 320, W - 256 - 64, 64)
bos = ['!' * (W // T)] * (H // T)
s = """// 4. bölüm — metal demo (v1.66, araclar/level4Uret.py ile üretilir): üç kat üst üste — alt pas, orta koyu çelik, üst parlak çelik;
// merdivenle çıkılır. Karo ızgarası kullanılmaz ('on' / 'arka' boş): bloklar OyunSahnesi.metalCiz ile karo/metal_<kat>.png'den çizilir.
const LEVEL4 = {
  ad: '4. Bölüm - Demir Kule (demo)',
  genislik: %d, yukseklik: %d, karo: 32,
  metal: [[704, 'pasli'], [384, 'koyu'], [0, 'parlak']],   // [bu y'den aşağısı (blok altı), kat] — ilk uyan
  baslangic: [180, 960],
  cikis: [%d, 320],
  susSinir: 1,
  alfabe: '!"',
  bloklar: %s,
  dikenler: [], sarmasiklar: [], sandiklar: [], elmaslar: [], ozeller: [], kayalar: [], kontrol: [], ipuclari: [], dusmanlar: [],
  on: %s,
  arka: %s
};
""" % (W, H, W - 180, json.dumps(bl), json.dumps(bos), json.dumps(bos))
open(KOK + '/js/veri/level4.js', 'w', encoding='utf8').write(s)
