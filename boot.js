// Görselleri yükler; karakter, düşman ve toplanabilirler için yer tutucu görseller üretir
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Zemin + arka plan karoları (tek tileset) ve objeler (assets/ klasörü)
    this.load.image('tileset', 'assets/tileset.png');
    this.load.image('selaleOrta', 'assets/selaleOrta.png');  // şelale gövdesi (dikeyde kesintisiz, aşağı akar)
    Object.keys(ASSETLER.obje).forEach(ad => this.load.image(ad, 'assets/' + ad + '.png'));
    // Ana karakter: 53 kare, her hücre 176x141, ayak çizgisi y=125, kafa hücrenin yatay ortasında (CONFIG.oyuncu.kare)
    const KR = CONFIG.oyuncu.kare;
    this.load.spritesheet('oyuncu', 'assets/oyuncu.png', { frameWidth: KR.w, frameHeight: KR.h });
    const K2 = CONFIG.oyuncu.kare2;   // v0.33 ek kareler (araclar/oyuncuEk.py)
    this.load.spritesheet('oyuncu2', 'assets/oyuncu2.png', { frameWidth: K2.w, frameHeight: K2.h });
    // Toplanabilirler (v0.28, araclar/toplananKes.py): 6 satır × 6 karelik dönme
    const TP = ASSETLER.toplanan;
    this.load.spritesheet('toplanan', 'assets/toplanan.png', { frameWidth: TP.w, frameHeight: TP.h });
    // Düşmanlar (v0.24, araclar/dusmanKes.py): her düşman kendi yatay şeridinde, mermiler ayrı görsel
    Object.entries(ASSETLER.dusman).forEach(([ad, D]) => {
      if (D.anim) this.load.spritesheet('d_' + ad, 'assets/d_' + ad + '.png', { frameWidth: D.w, frameHeight: D.h });
      else this.load.image(ad, 'assets/' + ad + '.png');
    });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const yap = (anahtar, w, h, ciz) => { g.clear(); ciz(g); g.generateTexture(anahtar, w, h); };

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
    an('egil',    aralik(53, 57), 10, -1);
    // v0.33 ek kareler (assets/oyuncu2.png)
    const an2 = (key, kareler, frameRate, repeat) =>
      A.create({ key, frames: kareler.map(frame => ({ key: 'oyuncu2', frame })), frameRate, repeat });
    an2('asili',    aralik(0, 5),  8,  -1);  // bastonla duvara asılı
    an2('it',       aralik(6, 11), 10, -1);  // sandık itme
    an2('h_tirman', [12], 1, 0);   // tırmanırken darbe
    an2('h_egil',   [13], 1, 0);   // eğikken darbe
    an2('h_hava',   [14], 1, 0);   // havada darbe
    an2('h_cek',    [15], 1, 0);   // çekerken darbe
    an2('h_it',     [16], 1, 0);   // iterken darbe
    an2('h_asili',  [17], 1, 0);   // asılıyken darbe  // eğilerek yürüme (v0.21, ↓ basılı, yerde)
    // Toplanabilir dönme animasyonları: t_<ad>
    ASSETLER.toplanan.sira.forEach((ad, r) =>
      A.create({ key: 't_' + ad, frames: A.generateFrameNumbers('toplanan', { start: r * 6, end: r * 6 + 5 }), frameRate: 10, repeat: -1 }));
    // Düşman animasyonları: d_<ad>_<anim>
    const HIZ = { yuru: 10, uc: 16, bekle: 4, dur: 1, at: 10, ol: 12 };
    const DONGU = { yuru: true, uc: true, bekle: true, dur: true };
    Object.entries(ASSETLER.dusman).forEach(([ad, D]) => {
      if (!D.anim) return;
      const ekle = (k, kareler, fps, tekrar) =>
        A.create({ key: 'd_' + ad + '_' + k, frames: kareler.map(frame => ({ key: 'd_' + ad, frame })), frameRate: fps, repeat: tekrar ? -1 : 0 });
      Object.entries(D.anim).forEach(([k, kareler]) => {
        if (ad === 'boss' && k === 'saldir') {   // patron: çömel+atıl hazırlık, koşu, duruş
          ekle('hazir', kareler.slice(0, 2), 4, false);
          ekle('atil', [kareler[2]], 1, false);
          ekle('dinlen', [kareler[3]], 1, false);
        } else ekle(k, kareler, HIZ[k] || 10, DONGU[k]);
      });
    });
    this.scene.start('Game');
  }
}
