// Açılış sahnesi: yükleme çubuğu gösterir, görselleri yükler (sesler oyunda arka planda: sesleriYukle), animasyonları tanımlar, oyunu başlatır.
class BootSahnesi extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const L = this.load, A = ASSETLER;
    this.yuklemeEkrani();
    // Karolar ve şelale
    L.image('tileset', 'assets/karo/tileset.png');
    L.image('selaleOrta', 'assets/karo/selaleOrta.png');
    // Nesneler (sandık, kapı, bayrak, diken, sarmaşık) — boyutları ASSETLER.obje
    Object.keys(A.obje).forEach(ad => L.image(ad, 'assets/nesne/' + ad + '.png'));
    L.image('zincir', 'assets/nesne/zincir.png');
    L.spritesheet('kirTas', 'assets/nesne/kirTas.png', { frameWidth: 128, frameHeight: 128 });
    L.spritesheet('kirParca', 'assets/nesne/kirParca.png', { frameWidth: ASSETLER.kirParca.huc, frameHeight: ASSETLER.kirParca.huc });
    L.image('tane', 'assets/nesne/tane.png');
    L.spritesheet('toplanan', 'assets/nesne/toplanan.png', { frameWidth: A.toplanan.w, frameHeight: A.toplanan.h });
    // Oyuncu
    const K1 = CONFIG.oyuncu.kare, K2 = CONFIG.oyuncu.kare2;
    L.spritesheet('oyuncu', 'assets/oyuncu/oyuncu.png', { frameWidth: K1.w, frameHeight: K1.h });
    L.spritesheet('oyuncu2', 'assets/oyuncu/oyuncu2.png', { frameWidth: K2.w, frameHeight: K2.h });
    // Düşmanlar (her biri yatay şerit) ve mermiler
    Object.entries(A.dusman).forEach(([ad, D]) => {
      if (D.anim) L.spritesheet('d_' + ad, 'assets/dusman/' + ad + '.png', { frameWidth: D.w, frameHeight: D.h });
      else L.image(ad, 'assets/dusman/' + ad + '.png');
    });
    // Arayüz ve harfler
    A.ui.forEach(ad => L.image('ui_' + ad, 'assets/ui/' + ad + '.png'));
    L.atlas('harf', 'assets/harf/harf.png', 'assets/harf/harf.json');   // araclar/harfAtlas.py
  }

  // Siyah ekranda beklemesin: ortada çubuk + yüzde
  yuklemeEkrani() {
    const W = this.scale.width, H = this.scale.height, u = Math.min(W, H) / 400;
    this.cameras.main.setBackgroundColor('#1a0f08');
    const bw = Math.min(W * 0.6, 420 * u), bh = 14 * u, x = (W - bw) / 2, y = H / 2;
    const cerceve = this.add.rectangle(W / 2, y, bw + 6 * u, bh + 6 * u).setStrokeStyle(2 * u, 0xffc21a);
    const cubuk = this.add.rectangle(x, y, 1, bh, 0xffc21a).setOrigin(0, 0.5);
    const yazi = this.add.text(W / 2, y - 26 * u, 'Yükleniyor 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(18 * u) + 'px', color: '#ffc21a'
    }).setOrigin(0.5);
    this.load.on('progress', p => { cubuk.width = Math.max(1, bw * p); yazi.setText('Yükleniyor ' + Math.round(p * 100) + '%'); });
  }

  create() {
    this.oyuncuAnimasyonlari();
    this.toplananAnimasyonlari();
    this.dusmanAnimasyonlari();
    this.registry.set('bolum', ilkBolum);
    this.scene.start('Game');
  }

  oyuncuAnimasyonlari() {
    const aralik = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const tanimla = (doku, liste) => liste.forEach(([key, kareler, frameRate, repeat]) =>
      this.anims.create({ key, frames: kareler.map(frame => ({ key: doku, frame })), frameRate, repeat }));
    // assets/oyuncu/oyuncu.png
    tanimla('oyuncu', [
      ['dur',      aralik(60, 65), 7,  -1],  // bekleme (v0.76 araclar/oyuncuYeni.py)
      ['ayakVur',  aralik(74, 81), 10, -1],  // uzun beklemede ayak vurma
      ['kos',      aralik(4, 9),   12, -1],
      ['zipla',    [10, 11, 12],   14, 0],   // çömel → kalk → tepe
      ['dus',      [13],           1,  0],
      ['in',       [14],           1,  0],   // yere iniş (toz)
      ['sersem',   aralik(15, 17), 10, -1],  // yerde ayaktayken hasar
      ['vur',      aralik(24, 28), 22, 0],   // baston vuruşu
      ['tirman',   aralik(66, 73), 8,  -1],
      ['uzat',     [41, 42, 43],   14, 0],   // baston kancası uzatma
      ['cek',      aralik(44, 48), 10, -1],
      ['pogoHava', [49],           1,  0],
      ['pogoSek',  [50, 51, 52],   14, 0],   // değme anı (kıvılcım) → sekme
      ['egil',     aralik(53, 57), 10, -1]
    ]);
    // assets/oyuncu/oyuncu2.png (araclar/oyuncuEk.py)
    tanimla('oyuncu2', [
      ['asili',    aralik(0, 5),   8,  -1],  // bastonla duvara asılı
      ['it',       aralik(6, 11),  10, -1],
      ['h_tirman', [12], 1, 0], ['h_egil', [13], 1, 0], ['h_hava', [14], 1, 0],   // duruma göre darbe kareleri
      ['h_cek',    [15], 1, 0], ['h_it',   [16], 1, 0], ['h_asili', [17], 1, 0],
      ['olum',     aralik(18, 23), 9,  0]    // bir kez oynar, son karede kalır
    ]);
  }

  // Toplanabilirler: t_<ad>, 6 karelik dönme
  toplananAnimasyonlari() {
    ASSETLER.toplanan.sira.forEach((ad, r) => this.anims.create({
      key: 't_' + ad, frames: this.anims.generateFrameNumbers('toplanan', { start: r * 6, end: r * 6 + 5 }), frameRate: 10, repeat: -1
    }));
  }

  // Düşmanlar: d_<ad>_<anim>. Patronun saldırısı üç parçaya bölünür: hazır (2 kare) → atıl → dinlen
  dusmanAnimasyonlari() {
    const HIZ = { yuru: 10, uc: 16, bekle: 4, dur: 1, at: 10, ol: 12, saldir: 7, buyu: 4, hazir: 1, top: 1 };
    const DONGU = { yuru: true, uc: true, bekle: true, dur: true };
    Object.entries(ASSETLER.dusman).forEach(([ad, D]) => {
      if (!D.anim) return;
      const ekle = (k, kareler, fps, tekrar) => this.anims.create({
        key: 'd_' + ad + '_' + k, frames: kareler.map(frame => ({ key: 'd_' + ad, frame })), frameRate: fps, repeat: tekrar ? -1 : 0,
        yoyo: ad === 'bitki' && k === 'bekle'   // bitki duruşu ileri-geri, akıcı
      });
      Object.entries(D.anim).forEach(([k, kareler]) => {
        if (ad === 'boss' && k === 'saldir') {
          ekle('hazir', kareler.slice(0, 2), 4, false);
          ekle('atil', [kareler[2]], 1, false);
          ekle('dinlen', [kareler[3]], 1, false);
        } else ekle(k, kareler, ad === 'bitki' && k === 'bekle' ? 8 : HIZ[k] || 10, DONGU[k]);
      });
    });
  }
}
