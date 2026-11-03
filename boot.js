// Görselleri yükler; karakter, düşman ve toplanabilirler için yer tutucu görseller üretir
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Zemin + arka plan karoları (tek tileset) ve objeler (assets/ klasörü)
    this.load.image('tileset', 'assets/tileset.png');
    this.load.image('selaleUst', 'assets/selaleUst.png');    // şelale başı (taş ağız)
    this.load.image('selaleOrta', 'assets/selaleOrta.png');  // şelale gövdesi (dikey tekrar)
    this.load.image('selaleDip', 'assets/selaleDip.png');    // şelale dibi (köpük)
    Object.keys(ASSETLER.obje).forEach(ad => this.load.image(ad, 'assets/' + ad + '.png'));
    // Ana karakter: 53 kare, her hücre 176x141, ayak çizgisi y=125, kafa hücrenin yatay ortasında (CONFIG.oyuncu.kare)
    const KR = CONFIG.oyuncu.kare;
    this.load.spritesheet('oyuncu', 'assets/oyuncu.png', { frameWidth: KR.w, frameHeight: KR.h });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const yap = (anahtar, w, h, ciz) => { g.clear(); ciz(g); g.generateTexture(anahtar, w, h); };

    // Yürüyen düşman: pembe küp
    yap('walker', 28, 28, g => {
      g.fillStyle(0xff6fb5, 1).fillRect(0, 0, 28, 28);
      g.fillStyle(0xc9407f, 1).fillRect(0, 22, 28, 6);
      g.fillStyle(0xffffff, 1).fillRect(15, 6, 8, 8);
      g.fillStyle(0x000000, 1).fillRect(19, 8, 4, 5);
    });
    // Zıplayan düşman: turuncu yuvarlak
    yap('jumper', 28, 28, g => {
      g.fillStyle(0xff9a1f, 1).fillCircle(14, 14, 14);
      g.fillStyle(0xffffff, 1).fillCircle(19, 10, 4);
      g.fillStyle(0x000000, 1).fillCircle(20, 10, 2);
    });
    // Uçan düşman: mor yuvarlak
    yap('flyer', 26, 26, g => {
      g.fillStyle(0x9b4dff, 1).fillCircle(13, 13, 13);
      g.fillStyle(0xffffff, 1).fillCircle(17, 10, 4);
      g.fillStyle(0x000000, 1).fillCircle(18, 10, 2);
    });
    // Patron: büyük kırmızı küp
    yap('boss', 64, 64, g => {
      g.fillStyle(0xd62828, 1).fillRect(0, 0, 64, 64);
      g.fillStyle(0x8f1717, 1).fillRect(0, 52, 64, 12);
      g.fillStyle(0xffffff, 1).fillRect(12, 16, 16, 16).fillRect(36, 16, 16, 16);
      g.fillStyle(0x000000, 1).fillRect(20, 20, 8, 10).fillRect(44, 20, 8, 10);
      g.fillStyle(0x000000, 1).fillRect(10, 10, 20, 4).fillRect(34, 10, 20, 4);
    });

    // Yılan: yeşil uzun şekil
    yap('yilan', 32, 16, g => {
      g.fillStyle(0x3fbf3f, 1).fillRect(0, 4, 32, 12);
      g.fillStyle(0x2a8a2a, 1).fillRect(0, 12, 32, 4);
      g.fillStyle(0xffffff, 1).fillRect(22, 5, 5, 5);
      g.fillStyle(0x000000, 1).fillRect(25, 6, 2, 3);
    });
    // Yuvarlak: büyük pembe top
    yap('yuvarlak', 30, 30, g => {
      g.fillStyle(0xff5fa0, 1).fillCircle(15, 15, 15);
      g.fillStyle(0xc03c78, 1).fillCircle(15, 21, 8);
      g.fillStyle(0xffffff, 1).fillCircle(20, 11, 4);
      g.fillStyle(0x000000, 1).fillCircle(21, 11, 2);
    });
    // Maymun: kahverengi küp
    yap('maymun', 28, 28, g => {
      g.fillStyle(0x8b5a2b, 1).fillRect(0, 0, 28, 28);
      g.fillStyle(0xd9b38c, 1).fillRect(12, 10, 14, 12);
      g.fillStyle(0x000000, 1).fillRect(18, 12, 4, 4);
    });
    // Mızraklı köpek: açık kahve küp, sarı şerit
    yap('kopek', 30, 30, g => {
      g.fillStyle(0xc9a46b, 1).fillRect(0, 0, 30, 30);
      g.fillStyle(0x7a5a2b, 1).fillRect(0, 24, 30, 6);
      g.fillStyle(0xffffff, 1).fillRect(16, 7, 8, 8);
      g.fillStyle(0x000000, 1).fillRect(20, 9, 4, 5);
    });
    // Arı: sarı yuvarlak, siyah şerit
    yap('ari', 24, 24, g => {
      g.fillStyle(0xffd400, 1).fillCircle(12, 12, 11);
      g.fillStyle(0x000000, 1).fillRect(7, 3, 3, 18).fillRect(14, 3, 3, 18);
      g.fillStyle(0xffffff, 0.8).fillEllipse(9, 3, 10, 6).fillEllipse(15, 3, 10, 6);
    });
    // Örümcek: mor yuvarlak
    yap('orumcek', 26, 26, g => {
      g.fillStyle(0x7a3fbf, 1).fillCircle(13, 13, 11);
      g.lineStyle(2, 0x4d2480, 1);
      g.lineBetween(2, 8, 0, 18).lineBetween(24, 8, 26, 18).lineBetween(3, 17, 1, 25).lineBetween(23, 17, 25, 25);
      g.fillStyle(0xffffff, 1).fillCircle(9, 12, 3).fillCircle(17, 12, 3);
      g.fillStyle(0xff0000, 1).fillCircle(9, 12, 1.5).fillCircle(17, 12, 1.5);
    });
    // Mermiler
    yap('mizrak', 24, 6, g => {
      g.fillStyle(0x6b3f1d, 1).fillRect(0, 2, 18, 2);
      g.fillStyle(0xd0d4da, 1).fillTriangle(24, 3, 17, 0, 17, 6);
    });
    yap('atesTopu', 12, 12, g => {
      g.fillStyle(0xff7a1a, 1).fillCircle(6, 6, 6);
      g.fillStyle(0xffe14d, 1).fillCircle(6, 6, 3);
    });
    // Toplanabilirler
    yap('kizilelmas', 24, 24, g => {
      g.fillStyle(0xff3b3b, 1).fillCircle(12, 12, 11);
      g.lineStyle(2, 0x8f1717, 1).strokeCircle(12, 12, 11);
    });
    yap('elmas', 16, 16, g => {
      g.fillStyle(0xffe14d, 1).fillCircle(8, 8, 7);
      g.lineStyle(2, 0xb8860b, 1).strokeCircle(8, 8, 7);
    });
    yap('buyukelmas', 24, 24, g => {
      g.fillStyle(0x3df0ff, 1).fillCircle(12, 12, 11);
      g.lineStyle(2, 0x0a8fa0, 1).strokeCircle(12, 12, 11);
    });
    yap('kalp', 20, 20, g => {
      g.fillStyle(0xff3b3b, 1).fillCircle(6, 7, 5).fillCircle(14, 7, 5).fillTriangle(1, 9, 19, 9, 10, 19);
    });

    g.destroy();

    // Ana karakter animasyonları (kare numaraları assets/oyuncu.png sırasına göre)
    const A = this.anims;
    const an = (key, kareler, frameRate, repeat) =>
      A.create({ key, frames: kareler.map(frame => ({ key: 'oyuncu', frame })), frameRate, repeat });
    const aralik = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    an('dur',     aralik(0, 3),   5,  -1);  // bekleme (nefes) — v0.19 yeni görsel
    an('kos',     aralik(4, 9),   12, -1);  // koşma — v0.19 yeni görsel
    an('zipla',   [10, 11, 12],   14, 0);   // zıplama: çömel → kalk → tepe
    an('dus',     [13],           1,  0);   // düşüş
    an('in',      [14],           1,  0);   // yere iniş (toz)
    an('sersem',  aralik(15, 17), 10, -1);  // hasar / sersemleme (yıldızlar)
    an('vur',     aralik(24, 28), 22, 0);   // baston vuruşu
    an('tirman',  aralik(29, 32), 8,  -1);  // sarmaşığa tırmanma
    an('pogoHava', [49],          1,  0);   // pogo: havada bastonun üstünde
    an('pogoSek', [50, 51, 52],   14, 0);   // pogo: değme anı (sarı kıvılcım) → sekme → sekme; sonra tekrar pogoHava
    an('uzat',    [41, 42, 43],   14, 0); // baston uzatma (kanca)
    an('cek',     aralik(44, 48), 10, -1);  // sandık çekme
    an('egil',    aralik(53, 57), 10, -1);  // eğilerek yürüme (v0.21, ↓ basılı, yerde)
    this.scene.start('Game');
  }
}
