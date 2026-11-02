// Ana oyun sahnesi: kurulum ve seviye inşası.
// Oyuncu mantığı -> oyuncu.js, düşmanlar -> dusman.js, arayüz -> ui.js
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const T = CONFIG.tile, L = LEVEL1;
    this.L = L;
    this.dunyaG = L.cols * T;
    this.dunyaY = L.rows * T;

    this.durum = {
      puan: 0, elmas: 0, elmasToplam: 0,
      can: CONFIG.oyuncu.canMax, yasam: CONFIG.oyuncu.yasam,
      olu: false, bitti: false, oyunBitti: false
    };
    this.dokunulmaz = 0; this.knock = 0;
    this.saldiriZaman = 0; this.saldiriBekleme = 0; this.vurulan = new Set();
    this.pogoModu = false; this.tirmaniyor = false; this.bakis = 1;
    this.coyote = 0; this.ziplaTampon = 0; this.ziplarken = false;
    this.oncekiZipla = false; this.oncekiZiplaTus = false; this.oncekiSaldir = false;
    this.bantItme = 0;
    this.k = null;
    this.touch = { sol: false, sag: false, yukari: false, asagi: false, zipla: false, saldir: false };

    this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.dunyaG, this.dunyaY);
    this.cameras.main.setBackgroundColor(0x5ec8f2);

    // Arka plan bulutları (yavaş kayar)
    for (let i = 0; i < 16; i++) {
      this.add.image(i * 210 + (i % 3) * 40, 40 + (i % 4) * 45, 'bulut')
        .setScrollFactor(0.3).setDepth(-10);
    }

    this.buildLevel();
    this.createPlayer();
    this.createColliders();
    this.createInput();
    this.createHud();
    this.createTouch();
  }

  // Zemin: görünmez çarpışma gövdesi + köşe/orta/dolgu görselleri
  zeminCiz(x0, x1) {
    const T = CONFIG.tile, A = ASSETLER, Z = this.L.zeminSatir * T;
    const z = this.add.zone(x0, Z, x1 - x0, 3 * T).setOrigin(0, 0);
    this.physics.add.existing(z, true);
    this.solids.add(z);

    const OV = 1.2;                    // parçalar arası bindirme: aralarında boşluk kalmasın
    const yUst = Z - A.zTM.yuzey;      // üst sıranın görsel üstü
    const yDolgu = yUst + A.zTM.yb - A.zFM.yt - 0.8;   // dolgu sırası, üst sıranın toprak altına bindirir

    // Arka dolgu: ince çatlaklardan gökyüzü görünmesin
    this.add.rectangle(x0 + 3, Z + 6, x1 - x0 - 6, this.dunyaY - Z + 40, A.zFM.renk)
      .setOrigin(0, 0).setDepth(0.5);

    // Parçalar toprağın gerçek kenarlarına (xl/xr) göre hizalanır
    const gor = (ad, x, y) => this.add.image(x, y, ad).setOrigin(0, 0)
      .setDisplaySize(A[ad].w, A[ad].h).setDepth(1);
    const sw = (ad) => A[ad].xr - A[ad].xl;

    // Üst sıra: sol köşe, sağ köşe, ortası
    gor('zTL', x0 - A.zTL.xl, Z - A.zTL.yuzey);
    gor('zTR', x1 - A.zTR.xr, Z - A.zTR.yuzey);
    this.serit('zTM', x0 + sw('zTL') - OV, x1 - sw('zTR') + OV, yUst, OV);
    // Dolgu sırası: sol kenar, sağ kenar, ortası
    gor('zFL', x0 - A.zFL.xl, yDolgu);
    gor('zFR', x1 - A.zFR.xr, yDolgu);
    this.serit('zFM', x0 + sw('zFL') - OV, x1 - sw('zFR') + OV, yDolgu, OV);
  }

  // Bir parçayı xs..xe arasında, toprak kenarları birbirine bindirilerek yan yana döşer
  serit(ad, xs, xe, y, ov) {
    const A = ASSETLER[ad];
    const tex = this.textures.get(ad).getSourceImage();
    const sx = A.w / tex.width, sy = A.h / tex.height;
    const sw = A.xr - A.xl;
    for (let x = xs; x < xe - 0.3; x += sw - ov) {
      const gorunen = Math.min(sw, xe - x);
      const im = this.add.image(x - A.xl, y, ad).setOrigin(0, 0).setScale(sx, sy).setDepth(1);
      if (gorunen < sw - 0.1) im.setCrop(0, 0, (A.xl + gorunen) / sx, tex.height);
    }
  }

  // Tek yönlü platform: görsel + ince, görünmez, sadece üstten çarpışan gövde
  tekYonluYarat(ad, x, yuzeyY, dinamik) {
    const A = ASSETLER[ad];
    const img = this.add.image(x, yuzeyY - A.yuzey, ad).setOrigin(0, 0)
      .setDisplaySize(A.w, A.h).setDepth(3);
    const z = this.add.zone(x + A.cx0, yuzeyY, A.cx1 - A.cx0, 12).setOrigin(0, 0);
    this.physics.add.existing(z, !dinamik);
    z.body.checkCollision.down = false;
    z.body.checkCollision.left = false;
    z.body.checkCollision.right = false;
    z.img = img; z.ox = A.cx0; z.oy = A.yuzey;
    return z;
  }

  buildLevel() {
    const T = CONFIG.tile, L = this.L, Z = L.zeminSatir;

    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.bantlar = this.physics.add.staticGroup();
    this.catlaklar = this.physics.add.staticGroup();
    this.yapraklar = this.physics.add.staticGroup();
    this.breakables = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.elmaslar = this.physics.add.staticGroup();
    this.kalpler = this.physics.add.staticGroup();
    this.sandiklar = this.physics.add.staticGroup();
    this.dusmanlar = this.physics.add.group();
    this.spikeRects = [];
    this.vineRects = [];
    this.checkpoints = [];

    // Zemin
    L.zemin.forEach(([a, b]) => this.zeminCiz(a * T, (b + 1) * T));

    // Sabit tek yönlü platformlar
    L.platformlar.forEach(p => {
      this.platforms.add(this.tekYonluYarat(p.tip, p.col * T, p.row * T, false));
    });

    // Yatay hareketli platformlar
    L.hareketli.forEach(h => {
      const A = ASSETLER[h.tip];
      const z = this.tekYonluYarat(h.tip, h.min * T, h.row * T, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.minX = h.min * T + A.cx0;
      z.maxX = h.max * T - A.w + A.cx0;
      z.hiz = h.hiz;
      z.body.setVelocityX(h.hiz);
    });

    // Asansörler (dikey hareketli)
    L.asansorlar.forEach(e => {
      const z = this.tekYonluYarat('asansor', e.col * T, e.alt * T, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.dikey = true; z.minY = e.ust * T; z.maxY = e.alt * T;
      z.yon = -1; z.bekle = 0.8; z.hiz = e.hiz;
    });

    // Konveyör bantlar
    L.bantlar.forEach(b => {
      const z = this.tekYonluYarat('bant', b.col * T, b.row * T, false);
      this.bantlar.add(z);
      z.itme = b.yon * CONFIG.fizik.bant;
      if (b.yon < 0) z.img.setFlipX(true);
    });

    // Çatlak taşlar
    L.catlaklar.forEach(c => {
      const z = this.tekYonluYarat('catlak', c.col * T, c.row * T, false);
      this.catlaklar.add(z);
      z.durum = 'hazir'; z.x0 = z.img.x; z.y0 = z.img.y;
    });

    // Zıplatan yapraklar (zeminde durur)
    L.yapraklar.forEach(y => {
      const A = ASSETLER.yaprak;
      const alt = y.row * T + 2;
      const img = this.add.image(y.col * T, alt, 'yaprak').setOrigin(0, 1)
        .setDisplaySize(A.w, A.h).setDepth(3);
      const z = this.add.zone(y.col * T + A.cx0, alt - A.h + A.yuzey, A.cx1 - A.cx0, 12).setOrigin(0, 0);
      this.physics.add.existing(z, true);
      z.body.checkCollision.down = false;
      z.body.checkCollision.left = false;
      z.body.checkCollision.right = false;
      z.img = img;
      this.yapraklar.add(z);
    });

    // Kırılabilir bloklar
    L.kirilir.forEach(([c, r, w, h]) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          const bl = this.breakables.create((c + i) * T, (r + j) * T, 'kirilir');
          bl.setOrigin(0, 0).refreshBody();
        }
      }
    });

    // Dikenler (çarpışma dikdörtgenleri elle kontrol edilir)
    L.dikenler.forEach(([c, r, w]) => {
      for (let i = 0; i < w; i++) this.add.image((c + i) * T, r * T, 'diken').setOrigin(0, 0).setDepth(1);
      this.spikeRects.push(new Phaser.Geom.Rectangle(c * T + 4, r * T + 14, w * T - 8, 18));
    });

    // Sarmaşıklar (üstten 12px uzatılır, platformun üstünden de tutunulabilsin)
    L.sarmasiklar.forEach(([c, r1, r2]) => {
      for (let r = r1; r <= r2; r++) this.add.image(c * T, r * T, 'sarmasik').setOrigin(0, 0).setDepth(1);
      this.vineRects.push(new Phaser.Geom.Rectangle(c * T + 8, r1 * T - 12, 16, (r2 - r1 + 1) * T + 12));
    });

    // Kontrol noktaları
    L.kontrol.forEach(c => {
      const spr = this.add.image(c * T + 16, Z * T, 'bayrak0').setOrigin(0.5, 1).setDepth(1);
      this.checkpoints.push({ x: c * T + 16, spr, aktif: false });
    });

    // Toplanabilirler
    L.elmaslar.forEach(([c, r]) => this.elmaslar.create(c * T + 16, r * T + 16, 'elmas'));
    this.durum.elmasToplam = L.elmaslar.length;
    L.kalpler.forEach(([c, r]) => this.kalpler.create(c * T + 16, r * T + 16, 'kalp'));
    L.sandiklar.forEach(([c, r, odul]) => {
      const s = this.sandiklar.create(c * T + 16, r * T + 16, 'sandik');
      s.odul = odul; s.acik = false;
    });

    // İpuçları
    L.ipuclari.forEach(i => {
      this.add.text(i.col * T, i.row * T, i.text, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3
      }).setDepth(4);
    });

    // Düşmanlar
    L.dusmanlar.forEach(e => this.dusmanYarat(e));
  }

  createPlayer() {
    const T = CONFIG.tile, Z = this.L.zeminSatir;
    this.spawn = { x: this.L.baslangic.col * T + 16, y: Z * T - 2 };
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, 'oyuncu')
      .setOrigin(0.5, 1).setDepth(10);
    this.player.body.setSize(24, 26).setOffset(2, 2);
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(1000, CONFIG.fizik.maxDusme);
    this.baston = this.add.image(0, 0, 'baston').setOrigin(0.5, 0).setVisible(false).setDepth(9);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(80, 40);
  }

  tekYonlu(p, pl) {
    return !this.tirmaniyor && p.body.velocity.y >= 0 &&
      (p.body.prev.y + p.body.height) <= pl.body.y + 8;
  }

  createColliders() {
    const P = this.player;
    const ty = (p, pl) => this.tekYonlu(p, pl);
    this.physics.add.collider(P, this.solids);
    this.physics.add.collider(P, this.breakables, (p, bl) => this.kirilirTemas(p, bl));
    this.physics.add.collider(P, this.platforms, null, ty);
    this.physics.add.collider(P, this.movers, null, ty);
    this.physics.add.collider(P, this.bantlar, (p, z) => {
      if (p.body.touching.down) this.bantItme = z.itme;
    }, ty);
    this.physics.add.collider(P, this.catlaklar, (p, z) => {
      if (p.body.touching.down && z.durum === 'hazir') this.catlakBasla(z);
    }, ty);
    this.physics.add.collider(P, this.yapraklar, (p, z) => {
      if (p.body.touching.down) this.yaprakZipla(z);
    }, ty);
    this.physics.add.collider(this.dusmanlar, this.solids);
    this.physics.add.collider(this.dusmanlar, this.breakables);
    this.physics.add.overlap(P, this.dusmanlar, (p, d) => this.dusmanTemas(p, d));
    this.physics.add.overlap(P, this.elmaslar, (p, e) => this.elmasAl(e));
    this.physics.add.overlap(P, this.kalpler, (p, h) => this.kalpAl(h));
    this.physics.add.overlap(P, this.sandiklar, (p, s) => this.sandikAc(s));
  }

  createInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      sol: 'LEFT', sag: 'RIGHT', yukari: 'UP', asagi: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      zipla: 'SPACE', z: 'Z', saldir: 'X', k: 'K', r: 'R'
    });
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.keys.r.on('down', () => this.scene.restart());
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.durum.bitti || this.durum.oyunBitti) return;
    this.updatePlayer(time, dt);
    this.updateDusmanlar(time, dt);
    this.updateHareketli(dt);
    this.updateCheckpoints();
  }

  // Yatay hareketli platformlar ve asansörler; görselleri gövdeye bağlar
  updateHareketli(dt) {
    this.movers.getChildren().forEach(m => {
      if (m.dikey) {
        if (m.bekle > 0) {
          m.bekle -= dt;
          m.body.setVelocityY(0);
        } else if (m.yon < 0 && m.y <= m.minY) {
          m.y = m.minY; m.yon = 1; m.bekle = 1; m.body.setVelocityY(0);
        } else if (m.yon > 0 && m.y >= m.maxY) {
          m.y = m.maxY; m.yon = -1; m.bekle = 1; m.body.setVelocityY(0);
        } else {
          m.body.setVelocityY(m.yon * m.hiz);
        }
      } else if (m.x <= m.minX) {
        m.body.setVelocityX(m.hiz);
      } else if (m.x >= m.maxX) {
        m.body.setVelocityX(-m.hiz);
      }
      m.img.setPosition(m.x - m.ox, m.y - m.oy);
    });
  }

  // Çatlak taş: sallanır, düşer, bir süre sonra geri gelir
  catlakBasla(z) {
    z.durum = 'sallan';
    const F = CONFIG.fizik;
    this.tweens.add({ targets: z.img, x: z.x0 + 2, duration: 50, yoyo: true, repeat: Math.floor(F.catlakGecikme / 100) - 1 });
    this.time.delayedCall(F.catlakGecikme, () => {
      z.durum = 'dusuyor';
      z.body.enable = false;
      this.parcala(z.x + 40, z.y, 0x9a9a8c);
      this.tweens.add({ targets: z.img, y: z.y0 + 180, alpha: 0, duration: 450, ease: 'Quad.easeIn' });
      this.time.delayedCall(F.catlakYenilen, () => {
        z.img.setPosition(z.x0, z.y0).setAlpha(1);
        z.body.enable = true;
        z.durum = 'hazir';
      });
    });
  }

  // Zıplatan yaprak
  yaprakZipla(z) {
    this.player.body.setVelocityY(CONFIG.fizik.yaprak);
    this.ziplarken = false;
    this.coyote = 0;
    this.tweens.add({ targets: z.img, scaleY: z.img.scaleY * 0.75, duration: 80, yoyo: true });
  }

  updateCheckpoints() {
    const p = this.player;
    this.checkpoints.forEach(c => {
      if (!c.aktif && p.x >= c.x) {
        c.aktif = true;
        c.spr.setTexture('bayrak1');
        this.spawn = { x: c.x, y: this.L.zeminSatir * CONFIG.tile - 2 };
        this.popup(c.x, c.spr.y - 60, 'Kontrol noktası!');
      }
    });
  }
}
