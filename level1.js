// 1. Bölüm - Orman Girişi
// Tüm koordinatlar TILE (32px) cinsindendir. col = sütun, row = satır.
// Zemin üst satırı = 14. Zeminde duran şeyler row 13'te durur.
// Oyuncu zıplama yüksekliği ~3 tile, pogo sekmesi ~4 tile, pogo+zıpla basılı ~5 tile.

function hat(c, r, n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push([c + i, r]);
  return a;
}

const LEVEL1 = {
  ad: "1. Bölüm - Orman Girişi",
  cols: 200,
  rows: 17,
  zeminSatir: 14,
  baslangic: { col: 3 },

  // [ilkSütun, sonSütun] - aradaki boşluklar çukur
  // Çukurlar: 30-32, 57-59, 85-97 (hareketli platform), 121-123, 151-153
  zemin: [[0, 29], [33, 56], [60, 84], [98, 120], [124, 150], [154, 199]],

  // Tek yönlü platformlar [col, row, genişlik] (alttan geçilir, üstüne basılır)
  platformlar: [
    [12, 12, 4],
    [36, 12, 3], [40, 10, 3],
    [50, 11, 5],               // dikenlerin üstü, pogo ile çıkılır
    [78, 8, 6],                // sarmaşıkla çıkılan gizli bölüm
    [106, 11, 3],              // diken yatağı üstü, pogo ile çıkılır
    [127, 12, 3], [131, 10, 3], [135, 8, 3], [139, 6, 3], [143, 6, 7],   // tırmanış
    [136, 11, 3],              // alt yol ödülü (sandık)
    [172, 12, 4], [188, 12, 4] // patron arenası
  ],

  // Hareketli platformlar: sol kenar min..max sütun arası gidip gelir
  hareketli: [
    { col: 85, row: 14, w: 3, min: 85, max: 95, hiz: 70 }
  ],

  // Kırılabilir bloklar [col, row, genişlik(sütun), yükseklik(satır)] - bastonla (X) kırılır
  kirilir: [
    [66, 10, 2, 4]
  ],

  // Dikenler [col, row, genişlik] - sadece pogo ile güvenle üstüne zıplanır
  dikenler: [
    [40, 13, 2], [52, 13, 2], [104, 13, 6], [131, 13, 12]
  ],

  // Sarmaşıklar [col, üstSatır, altSatır]
  sarmasiklar: [
    [80, 8, 13]
  ],

  // Kontrol noktaları (sütun)
  kontrol: [55, 100, 126, 156],

  elmaslar: [
    ...hat(6, 13, 4), ...hat(12, 11, 4), ...hat(24, 13, 2),
    [30, 12], [31, 11], [32, 12],
    ...hat(36, 11, 3), ...hat(40, 9, 3), ...hat(50, 10, 5),
    [57, 12], [58, 11], [59, 12],
    ...hat(70, 13, 3),
    ...hat(78, 7, 4), [83, 7],
    ...hat(86, 10, 3), ...hat(90, 9, 3), ...hat(95, 10, 2),
    ...hat(104, 12, 6), [106, 10], [108, 10],
    [121, 12], [122, 11], [123, 12],
    ...hat(127, 11, 3), ...hat(131, 9, 3), ...hat(135, 7, 3), ...hat(139, 5, 3), ...hat(143, 5, 4),
    ...hat(131, 12, 12),
    ...hat(157, 13, 3), ...hat(166, 13, 3), ...hat(172, 11, 4), ...hat(188, 11, 4)
  ],

  kalpler: [[69, 13], [107, 10]],

  // [col, row, ödül] ödül: 'buyuk' (+1000 puan) | 'kalp' (+1 can)
  sandiklar: [[82, 7, 'buyuk'], [137, 10, 'buyuk'], [148, 5, 'kalp']],

  // tip: walker (pembe küp, yürür) | jumper (turuncu yuvarlak, zıplar) | flyer (mor yuvarlak, uçar) | boss
  // min/max = devriye sütun aralığı, row = uçanlar için taban satırı
  dusmanlar: [
    { tip: 'walker', col: 20, min: 17, max: 26 },
    { tip: 'walker', col: 45, min: 43, max: 49 },
    { tip: 'walker', col: 62, min: 61, max: 64 },
    { tip: 'jumper', col: 75, min: 71, max: 79 },
    { tip: 'flyer', col: 90, row: 8, min: 87, max: 93 },
    { tip: 'flyer', col: 95, row: 7, min: 93, max: 96 },
    { tip: 'walker', col: 114, min: 111, max: 118 },
    { tip: 'jumper', col: 116, min: 112, max: 119 },
    { tip: 'flyer', col: 122, row: 9, min: 120, max: 124 },
    { tip: 'walker', col: 126, min: 125, max: 129 },
    { tip: 'flyer', col: 134, row: 7, min: 131, max: 137 },
    { tip: 'flyer', col: 144, row: 3, min: 141, max: 147 },
    { tip: 'walker', col: 158, min: 157, max: 162 },
    { tip: 'jumper', col: 163, min: 160, max: 166 },
    { tip: 'boss', col: 184 }
  ],

  ipuclari: [
    { col: 3, row: 9, text: "← →  Yürü\nSPACE: Zıpla (basılı tut = daha yüksek)" },
    { col: 37, row: 7, text: "Havadayken ↓ basılı tut = POGO!\nDüşmanlara ve dikenlere zıpla" },
    { col: 60, row: 8, text: "X: Bastonu salla\nBlokları kırar, düşmana vurur" },
    { col: 74, row: 6, text: "Sarmaşık: ↑ / ↓ ile tırman" },
    { col: 82, row: 10, text: "Hareketli platforma bin" },
    { col: 166, row: 8, text: "PATRON! Üstüne pogo ile zıpla\nveya bastonla vur" }
  ],

  cikisCol: 197
};
