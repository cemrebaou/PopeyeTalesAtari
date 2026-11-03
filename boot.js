// Görselleri yükler; karakter, düşman ve toplanabilirler için yer tutucu görseller üretir
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Zemin + arka plan karoları (tek tileset) ve objeler (assets/ klasörü)
    this.load.image('tileset', 'assets/tileset.png');
    this.load.image('cimen', 'assets/cimen.png');     // çimen şapkası (toprak üst kenarlarına)
    this.load.image('kenar', 'assets/kenar.png');     // toprak sol/sağ kenar yosunu
    this.load.image('toprak', 'assets/toprak.jpg');   // kesintisiz toprak dokusu (tüm toprak zeminler)
    Object.keys(ASSETLER.obje).forEach(ad => this.load.image(ad, 'assets/' + ad + '.png'));
    // Ana karakter sprite sheet: 1536x1024, 10 sütun x 5 satır, her kare 153x204 (beyaz arkaplan)
    this.load.spritesheet('oyuncuSprite', 'assets/oyuncu_sprite.png', {
      frameWidth: 153, frameHeight: 204
    });
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

    // Baston
    yap('baston', 4, 24, g => {
      g.fillStyle(0xffd23f, 1).fillRect(0, 0, 4, 5);
      g.fillStyle(0x6b3f1d, 1).fillRect(0, 5, 4, 19);
    });
    g.destroy();

    // Ana karakter animasyonları (sprite sheet: 10 sütun x 5 satır = 50 kare)
    const A = this.anims;
    A.create({ key: 'idle',      frames: A.generateFrameNumbers('oyuncuSprite', { start: 0,  end: 3  }), frameRate: 6,  repeat: -1 });
    A.create({ key: 'run',       frames: A.generateFrameNumbers('oyuncuSprite', { start: 4,  end: 9  }), frameRate: 10, repeat: -1 });
    A.create({ key: 'jump',      frames: A.generateFrameNumbers('oyuncuSprite', { start: 10, end: 12 }), frameRate: 8,  repeat: 0  });
    A.create({ key: 'land',      frames: A.generateFrameNumbers('oyuncuSprite', { start: 13, end: 13 }), frameRate: 6,  repeat: 0  });
    A.create({ key: 'hurt',      frames: A.generateFrameNumbers('oyuncuSprite', { start: 14, end: 16 }), frameRate: 8,  repeat: 0  });
    A.create({ key: 'saldir',    frames: A.generateFrameNumbers('oyuncuSprite', { start: 20, end: 23 }), frameRate: 12, repeat: 0  });
    A.create({ key: 'havaSaldir',frames: A.generateFrameNumbers('oyuncuSprite', { start: 24, end: 26 }), frameRate: 12, repeat: 0  });
    A.create({ key: 'pogo',      frames: A.generateFrameNumbers('oyuncuSprite', { start: 30, end: 32 }), frameRate: 10, repeat: -1 });
    A.create({ key: 'cek',       frames: A.generateFrameNumbers('oyuncuSprite', { start: 33, end: 35 }), frameRate: 8,  repeat: -1 });
    A.create({ key: 'bastonilet',frames: A.generateFrameNumbers('oyuncuSprite', { start: 40, end: 44 }), frameRate: 10, repeat: 0  });
    A.create({ key: 'it',        frames: A.generateFrameNumbers('oyuncuSprite', { start: 45, end: 49 }), frameRate: 8,  repeat: -1 });

    this.scene.start('Game');
  }
}
