// 1. Bölüm - Orman Girişi
// Tüm koordinatlar TILE (32px) cinsindendir. col = sütun, row = satır (ondalık olabilir).
// Zemin üst satırı = 14. Zeminde duran şeyler row 13'te durur.
// Platformlarda row = basılan yüzeyin satırıdır; görsel buna göre yerleşir.
// Oyuncu zıplama yüksekliği ~3 tile, pogo sekmesi ~4 tile, pogo+zıpla basılı ~5 tile,
// zıplatan yaprak ~8 tile.

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
  // Çukurlar: 30-32, 57-59, 85-97 (hareketli platform + çatlak taşlar), 121-123, 151-153
  zemin: [[0, 29], [33, 56], [60, 84], [98, 120], [124, 150], [154, 199]],

  // Tek yönlü platformlar (alttan geçilir, üstüne basılır)
  // tip: kutuk (kütük) | tas (taş levha) | kopru (ip köprü) | ada (yüzen ada) | dal (ağaç dalı) | mantar
  platformlar: [
    { tip: 'kutuk', col: 12, row: 12 },
    { tip: 'kutuk', col: 36, row: 12 },
    { tip: 'kutuk', col: 41, row: 10 },
    { tip: 'tas', col: 50, row: 11 },        // dikenlerin üstü, pogo ile çıkılır
    { tip: 'ada', col: 78, row: 8 },         // asansör veya sarmaşıkla çıkılan gizli bölüm
    { tip: 'kutuk', col: 127, row: 12 },     // tırmanış basamakları
    { tip: 'kutuk', col: 132, row: 10 },
    { tip: 'mantar', col: 137, row: 8 },
    { tip: 'kopru', col: 143, row: 6 },
    { tip: 'kutuk', col: 137, row: 11 },     // alt yol ödülü (sandık)
    { tip: 'dal', col: 172, row: 12 },       // patron arenası
    { tip: 'mantar', col: 188, row: 12.4 }
  ],

  // Yatay hareketli platform: sol sınır (min) ile sağ sınır (max) sütunu arasında gidip gelir
  hareketli: [
    { tip: 'tas', row: 14, min: 85, max: 98, hiz: 70 }
  ],

  // Asansör: alt ve üst yüzey satırı arasında çıkar iner
  asansorlar: [
    { col: 72, alt: 14, ust: 8, hiz: 60 }
  ],

  // Çatlak taşlar: üstüne basınca sallanır, düşer, birkaç saniye sonra geri gelir
  catlaklar: [
    { col: 87, row: 12 }, { col: 93, row: 12 }
  ],

  // Konveyör bant: yon -1 sola, +1 sağa iter
  bantlar: [
    { col: 104, row: 10, yon: -1 }
  ],

  // Zıplatan yaprak (zeminde durur): üstüne inince yüksek zıplatır
  yapraklar: [
    { col: 146, row: 14 }
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
    ...hat(36, 11, 3), ...hat(41, 9, 4), ...hat(50, 10, 4),
    [57, 12], [58, 11], [59, 12],
    ...hat(70, 13, 3),
    ...hat(78, 7, 3),
    ...hat(86, 10, 3), ...hat(90, 9, 3), ...hat(95, 10, 2),
    ...hat(104, 12, 6), [105, 9], [106, 9], [108, 9],
    [121, 12], [122, 11], [123, 12],
    ...hat(127, 11, 3), ...hat(132, 9, 3), ...hat(138, 7, 3), ...hat(143, 5, 3),
    ...hat(131, 12, 12),
    ...hat(157, 13, 3), ...hat(166, 13, 3), ...hat(172, 11, 4), ...hat(188, 11, 4)
  ],

  kalpler: [[69, 13], [107, 9]],

  // [col, row, ödül] ödül: 'buyuk' (+1000 puan) | 'kalp' (+1 can)
  sandiklar: [[81, 7, 'buyuk'], [137, 10, 'buyuk'], [146, 5, 'kalp']],

  // tip: walker (pembe küp, yürür) | jumper (turuncu yuvarlak, zıplar) | flyer (mor yuvarlak, uçar) | boss
  // min/max = devriye sütun aralığı, row = uçanlar için taban satırı
  dusmanlar: [
    { tip: 'walker', col: 20, min: 17, max: 26 },
    { tip: 'walker', col: 45, min: 43, max: 49 },
    { tip: 'walker', col: 62, min: 61, max: 64 },
    { tip: 'jumper', col: 77, min: 76, max: 79 },
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
    { col: 3, row: 9, text: "← →  Yürü\n↑ veya SPACE: Zıpla (basılı tut = daha yüksek)" },
    { col: 37, row: 7, text: "↓ basılı tut = POGO (yerde de seker)!\nDüşmanlara ve dikenlere zıpla" },
    { col: 60, row: 8, text: "X: Bastonu salla\nBlokları kırar, düşmana vurur" },
    { col: 68, row: 7, text: "Asansöre bin: seni yukarı taşır" },
    { col: 74, row: 4, text: "Sarmaşık: ↑ / ↓ ile tırman" },
    { col: 82, row: 10, text: "Hareketli platforma bin\nveya çatlak taşlardan çabuk geç" },
    { col: 101, row: 6, text: "Bant seni geri iter!\nDikenlerde pogo ile sek" },
    { col: 143, row: 9, text: "Yaprak seni çok yükseğe fırlatır" },
    { col: 166, row: 8, text: "PATRON! Üstüne pogo ile zıpla\nveya bastonla vur" }
  ],

  cikisCol: 197
};
