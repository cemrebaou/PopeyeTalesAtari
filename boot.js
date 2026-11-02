// Basit renkli şekillerle yer tutucu görseller üretir
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Zemin ve platform görselleri (assets/ klasörü)
    ['zTL', 'zTM', 'zTR', 'zFL', 'zFM', 'zFR',
      'kutuk', 'tas', 'kopru', 'ada', 'dal', 'mantar', 'bant', 'asansor', 'yaprak', 'catlak']
      .forEach(ad => this.load.image(ad, 'assets/' + ad + '.png'));
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const yap = (anahtar, w, h, ciz) => { g.clear(); ciz(g); g.generateTexture(anahtar, w, h); };

    // Oyuncu: mavi küp
    yap('oyuncu', 28, 28, g => {
      g.fillStyle(0x2f6fff, 1).fillRect(0, 0, 28, 28);
      g.fillStyle(0x1a4acc, 1).fillRect(0, 22, 28, 6);
      g.fillStyle(0xffffff, 1).fillRect(15, 6, 8, 8);
      g.fillStyle(0x000000, 1).fillRect(19, 8, 4, 5);
    });
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
    // Bomba (atılan) ve bomba eşyası
    yap('bomba', 16, 16, g => {
      g.fillStyle(0x222222, 1).fillCircle(8, 9, 7);
      g.fillStyle(0xffffff, 0.8).fillCircle(5, 6, 2);
      g.fillStyle(0xff7a1a, 1).fillRect(8, 0, 2, 4);
    });
    yap('bombaItem', 22, 22, g => {
      g.fillStyle(0x222222, 1).fillCircle(11, 13, 9);
      g.lineStyle(2, 0xffe14d, 1).strokeCircle(11, 13, 9);
      g.fillStyle(0xffffff, 0.8).fillCircle(7, 9, 2);
      g.fillStyle(0xff7a1a, 1).fillRect(11, 1, 2, 5);
    });
    // Kırmızı takoz (sadece bomba kırar)
    yap('takoz', 38, 38, g => {
      g.fillStyle(0xd62828, 1).fillRect(0, 0, 38, 38);
      g.lineStyle(3, 0x7a1010, 1).strokeRect(1.5, 1.5, 35, 35);
      g.lineBetween(4, 4, 34, 34).lineBetween(34, 4, 4, 34);
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

    // Zemin / platformlar
    yap('zemin', 32, 32, g => {
      g.fillStyle(0x8b5a2b, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x6e4520, 1).fillRect(0, 0, 32, 3).fillRect(0, 0, 2, 32);
      g.fillStyle(0x7a4c24, 1).fillRect(8, 12, 6, 4).fillRect(20, 22, 6, 4);
    });
    yap('platform', 32, 16, g => {
      g.fillStyle(0xc99a5b, 1).fillRect(0, 0, 32, 16);
      g.fillStyle(0x8b5a2b, 1).fillRect(0, 0, 32, 5);
    });
    yap('platformKoyu', 32, 16, g => {
      g.fillStyle(0x6b6b80, 1).fillRect(0, 0, 32, 16);
      g.fillStyle(0x3c3c4d, 1).fillRect(0, 0, 32, 5);
    });
    yap('kirilir', 32, 32, g => {
      g.fillStyle(0xd9a05b, 1).fillRect(0, 0, 32, 32);
      g.lineStyle(2, 0x7a4f22, 1).strokeRect(1, 1, 30, 30);
      g.lineBetween(1, 1, 31, 31).lineBetween(31, 1, 1, 31);
    });
    yap('diken', 32, 32, g => {
      g.fillStyle(0xd0d4da, 1);
      for (let i = 0; i < 4; i++) g.fillTriangle(i * 8, 32, i * 8 + 4, 14, i * 8 + 8, 32);
    });
    yap('sarmasik', 32, 32, g => {
      g.fillStyle(0x2e8b2e, 1).fillRect(13, 0, 6, 32);
      g.fillStyle(0x3fbf3f, 1).fillRect(7, 6, 6, 4).fillRect(19, 16, 6, 4).fillRect(7, 24, 6, 4);
    });

    // Sandık
    yap('sandik', 32, 32, g => {
      g.fillStyle(0xc58b3a, 1).fillRect(2, 8, 28, 22);
      g.fillStyle(0x9a6a25, 1).fillRect(2, 8, 28, 6);
      g.fillStyle(0xffd23f, 1).fillRect(2, 16, 28, 4);
      g.fillStyle(0x5a3a12, 1).fillRect(14, 14, 4, 8);
    });
    yap('sandikAcik', 32, 32, g => {
      g.fillStyle(0xc58b3a, 1).fillRect(2, 14, 28, 16);
      g.fillStyle(0x3b2410, 1).fillRect(4, 14, 24, 6);
      g.fillStyle(0x9a6a25, 1).fillRect(2, 2, 28, 6);
    });

    // Bayraklar
    const bayrak = (renk) => g => {
      g.fillStyle(0xcccccc, 1).fillRect(2, 0, 3, 48);
      g.fillStyle(renk, 1).fillRect(5, 2, 18, 12);
    };
    yap('bayrak0', 24, 48, bayrak(0xaaaaaa));
    yap('bayrak1', 24, 48, bayrak(0x2ecc40));
    yap('cikis', 32, 96, g => {
      g.fillStyle(0xffd23f, 1).fillRect(4, 0, 4, 96).fillRect(0, 88, 16, 8);
      g.fillStyle(0x2ecc40, 1).fillRect(8, 4, 22, 16);
    });

    // Baston, bulut
    yap('baston', 4, 24, g => {
      g.fillStyle(0xffd23f, 1).fillRect(0, 0, 4, 5);
      g.fillStyle(0x6b3f1d, 1).fillRect(0, 5, 4, 19);
    });
    yap('bulut', 120, 44, g => {
      g.fillStyle(0xffffff, 0.85);
      g.fillEllipse(30, 28, 56, 28).fillEllipse(60, 20, 64, 34).fillEllipse(90, 28, 56, 28);
    });

    g.destroy();
    this.scene.start('Game');
  }
}
