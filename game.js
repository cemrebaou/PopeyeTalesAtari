// Ana oyun sahnesi: kurulum ve seviye inşası.
// Oyuncu mantığı -> oyuncu.js, düşmanlar/bomba -> dusman.js, arayüz -> ui.js
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const L = LEVEL1;
    this.L = L;
    this.dunyaG = L.genislik;
    this.dunyaY = L.yukseklik;

    this.durum = {
      puan: 0, elmas: 0, elmasToplam: 0, bomba: 0,
      can: CONFIG.oyuncu.canMax, yasam: CONFIG.oyuncu.yasam,
      olu: false, bitti: false, oyunBitti: false
    };
    this.dokunulmaz = 0; this.knock = 0;
    this.saldiriZaman = 0; this.saldiriBekleme = 0; this.vurulan = new Set();
    this.bombaBekleme = 0;
    this.pogoModu = false; this.tirmaniyor = false; this.bakis = 1;
    this.coyote = 0; this.ziplaTampon = 0; this.ziplarken = false;
    this.oncekiZipla = false; this.oncekiZiplaTus = false; this.oncekiSaldir = false; this.oncekiBomba = false;
    this.bantItme = 0;
    this.k = null;
    this.touch = { sol: false, sag: false, yukari: false, asagi: false, zipla: false, saldir: false, bomba: false };

    this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.dunyaG, this.dunyaY);
    this.cameras.main.setBackgroundColor(0x5ec8f2);

    // Arka plan bulutları (yavaş kayar, sadece yatay)
    for (let i = 0; i < 16; i++) {
      this.add.image(i * 190 + (i % 3) * 40, 40 + (i % 4) * 45, 'bulut')
        .setScrollFactor(0.3, 0).setDepth(-10);
    }

    this.buildLevel();
    this.createPlayer();
    this.createColliders();
    this.createInput();
    this.createHud();
    this.createTouch();
  }

  // Zemin bloğu: görünmez çarpışma gövdesi + toprak dolgusu (görsel üst şeritler ayrıca çizilir)
  blokCiz(x, y, w, h) {
    const A = ASSETLER;
    const z = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(z, true);
    this.solids.add(z);

    this.add.rectangle(x, y, w, h, A.zFM.renk).setOrigin(0, 0).setDepth(0.5);
    // Çimenin altındaki toprak dokusu (büyük bloklarda döşenir)
    const ys = 36;
    if (h > ys + 6 && w > 8) {
      const tex = this.textures.get('zFM').getSourceImage();
      const ts = this.add.tileSprite(x, y + ys, w, h - ys, 'zFM').setOrigin(0, 0).setDepth(0.8);
      ts.setTileScale(A.zFM.w / tex.width, A.zFM.h / tex.height);
    }
  }

  // Çimenli üst kenar şeridi: [x0, x1, y(yüzey), solAcik, sagAcik]
  ustCiz(x0, x1, Y, solAcik, sagAcik) {
    const A = ASSETLER, OV = 1.2;
    const gor = (ad, x, y) => this.add.image(x, y, ad).setOrigin(0, 0)
      .setDisplaySize(A[ad].w, A[ad].h).setDepth(1);
    const sw = (ad) => A[ad].xr - A[ad].xl;
    const yUst = Y - A.zTM.yuzey;
    let xs = x0, xe = x1;
    if (solAcik && x1 - x0 >= sw('zTL') + sw('zTR')) {
      gor('zTL', x0 - A.zTL.xl, Y - A.zTL.yuzey);
      xs = x0 + sw('zTL') - OV;
    }
    if (sagAcik && x1 - x0 >= sw('zTL') + sw('zTR')) {
      gor('zTR', x1 - A.zTR.xr, Y - A.zTR.yuzey);
      xe = x1 - sw('zTR') + OV;
    }
    this.serit('zTM', xs, xe, yUst, OV);
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
    const L = this.L;

    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.bantlar = this.physics.add.staticGroup();
    this.catlaklar = this.physics.add.staticGroup();
    this.yapraklar = this.physics.add.staticGroup();
    this.breakables = this.physics.add.staticGroup();
    this.takozlar = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.elmaslar = this.physics.add.staticGroup();
    this.kalpler = this.physics.add.staticGroup();
    this.sandiklar = this.physics.add.staticGroup();
    this.ozeller = this.physics.add.staticGroup();
    this.dusmanlar = this.physics.add.group();
    this.mermiler = this.physics.add.group({ allowGravity: false });
    this.bombalar = this.physics.add.group();
    this.ipGrafik = this.add.graphics().setDepth(5);
    this.spikeRects = [];
    this.vineRects = [];
    this.checkpoints = [];

    // Zemin blokları ve çimenli üst kenarlar
    L.bloklar.forEach(([x, y, w, h]) => this.blokCiz(x, y, w, h));
    L.ustler.forEach(([x0, x1, y, sa, sg]) => this.ustCiz(x0, x1, y, sa, sg));

    // (İsteğe bağlı) tek yönlü platformlar ve özel platformlar — bu bölümde boş
    (L.platformlar || []).forEach(p => {
      this.platforms.add(this.tekYonluYarat(p.tip, p.x, p.y, false));
    });
    (L.hareketli || []).forEach(h => {
      const A = ASSETLER[h.tip];
      const z = this.tekYonluYarat(h.tip, h.min, h.y, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.minX = h.min + A.cx0; z.maxX = h.max - A.w + A.cx0; z.hiz = h.hiz;
      z.body.setVelocityX(h.hiz);
    });
    (L.asansorlar || []).forEach(e => {
      const z = this.tekYonluYarat('asansor', e.x, e.alt, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.dikey = true; z.minY = e.ust; z.maxY = e.alt; z.yon = -1; z.bekle = 0.8; z.hiz = e.hiz;
    });

    // Kırmızı takozlar: sadece bomba kırar
    L.takozlar.forEach(([x, y]) => {
      const t = this.takozlar.create(x, y, 'takoz').setDepth(2);
      t.refreshBody();
    });

    // Dikenler (çarpışma dikdörtgenleri elle kontrol edilir)
    L.dikenler.forEach(([x, y, w]) => {
      const n = Math.ceil(w / 32);
      for (let i = 0; i < n; i++) this.add.image(x + i * 32, y - 24, 'diken').setOrigin(0, 0).setDepth(1.5);
      this.spikeRects.push(new Phaser.Geom.Rectangle(x + 4, y - 20, w - 8, 26));
    });

    // Sarmaşıklar (üstten 12px uzatılır, platformun üstünden de tutunulabilsin)
    L.sarmasiklar.forEach(([x, y, h]) => {
      const n = Math.ceil(h / 32);
      for (let i = 0; i < n; i++) this.add.image(x - 16, y + i * 32, 'sarmasik').setOrigin(0, 0).setDepth(1.5);
      this.vineRects.push(new Phaser.Geom.Rectangle(x - 9, y - 12, 18, h + 12));
    });

    // Kontrol noktaları
    L.kontrol.forEach(([x, y]) => {
      const spr = this.add.image(x, y, 'bayrak0').setOrigin(0.5, 1).setDepth(1.6);
      this.checkpoints.push({ x, y, spr, aktif: false });
    });

    // Toplanabilirler
    L.elmaslar.forEach(([x, y]) => this.elmaslar.create(x, y, 'elmas'));
    this.durum.elmasToplam = L.elmaslar.length;
    L.sandiklar.forEach(([x, y, odul]) => {
      const s = this.sandiklar.create(x, y, 'sandik').setDepth(2);
      s.odul = odul; s.acik = false;
    });
    const ozelTex = { buyuk: 'buyukelmas', kizil: 'kizilelmas', bomba: 'bombaItem' };
    L.ozeller.forEach(([tip, x, y]) => {
      const o = this.ozeller.create(x, y, ozelTex[tip]).setDepth(2);
      o.tip = tip;
    });

    // İpuçları
    L.ipuclari.forEach(([x, y, text]) => {
      this.add.text(x, y, text, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3
      }).setDepth(4);
    });

    // Düşmanlar ve patron
    L.dusmanlar.forEach(e => this.dusmanYarat(e));
    this.dusmanYarat({ tip: 'boss', x: L.boss[0], y: L.boss[1] });
  }

  createPlayer() {
    this.spawn = { x: this.L.baslangic[0], y: this.L.baslangic[1] - 2 };
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
    const yerdeki = (d) => d.tip !== 'ari' && d.tip !== 'orumcek';   // uçanlar zeminden etkilenmez
    this.physics.add.collider(P, this.solids);
    this.physics.add.collider(P, this.takozlar);
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

    this.physics.add.collider(this.dusmanlar, this.solids, null, (d) => yerdeki(d));
    this.physics.add.collider(this.dusmanlar, this.takozlar, null, (d) => yerdeki(d));
    this.physics.add.collider(this.dusmanlar, this.breakables);
    this.physics.add.collider(this.dusmanlar, this.platforms, null, (d) => yerdeki(d) && d.body.velocity.y >= 0);

    this.physics.add.collider(this.bombalar, this.solids);
    this.physics.add.collider(this.bombalar, this.takozlar);
    this.physics.add.collider(this.bombalar, this.breakables);
    this.physics.add.collider(this.bombalar, this.platforms, null, (b) => b.body.velocity.y >= 0);
    this.physics.add.overlap(this.bombalar, this.dusmanlar, (b, d) => {
      if (d.active && !d.oldu) this.bombaPatlat(b);
    });

    this.physics.add.overlap(this.mermiler, this.solids, (m) => m.destroy());
    this.physics.add.overlap(this.mermiler, this.takozlar, (m) => m.destroy());
    this.physics.add.overlap(P, this.mermiler, (p, m) => {
      if (!m.active) return;
      m.destroy();
      this.oyuncuHasar(m.x - m.body.velocity.x);
    });

    this.physics.add.overlap(P, this.dusmanlar, (p, d) => this.dusmanTemas(p, d));
    this.physics.add.overlap(P, this.elmaslar, (p, e) => this.elmasAl(e));
    this.physics.add.overlap(P, this.kalpler, (p, h) => this.kalpAl(h));
    this.physics.add.overlap(P, this.ozeller, (p, o) => this.ozelAl(o));
    this.physics.add.overlap(P, this.sandiklar, (p, s) => this.sandikAc(s));
  }

  createInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      sol: 'LEFT', sag: 'RIGHT', yukari: 'UP', asagi: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      zipla: 'SPACE', z: 'Z', saldir: 'X', k: 'K', bomba: 'C', l: 'L', r: 'R'
    });
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.keys.r.on('down', () => this.scene.restart());
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.durum.bitti || this.durum.oyunBitti) return;
    this.updatePlayer(time, dt);
    this.updateDusmanlar(time, dt);
    this.updateMermiler(dt);
    this.updateBombalar(dt);
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
      if (!c.aktif && Math.abs(p.x - c.x) < 50 && Math.abs(p.y - c.y) < 120) {
        c.aktif = true;
        c.spr.setTexture('bayrak1');
        this.spawn = { x: c.x, y: c.y - 2 };
        this.popup(c.x, c.y - 70, 'Kontrol noktası!');
      }
    });
  }
}
