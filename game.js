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
    this.oncekiZipla = false; this.oncekiSaldir = false;
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

  buildLevel() {
    const T = CONFIG.tile, L = this.L, Z = L.zeminSatir;

    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.breakables = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({ allowGravity: false, immovable: true });
    this.elmaslar = this.physics.add.staticGroup();
    this.kalpler = this.physics.add.staticGroup();
    this.sandiklar = this.physics.add.staticGroup();
    this.dusmanlar = this.physics.add.group();
    this.spikeRects = [];
    this.vineRects = [];
    this.checkpoints = [];

    // Zemin (kahve)
    L.zemin.forEach(([a, b]) => {
      const z = this.add.tileSprite(a * T, Z * T, (b - a + 1) * T, 3 * T, 'zemin').setOrigin(0, 0);
      this.physics.add.existing(z, true);
      this.solids.add(z);
    });

    // Tek yönlü platformlar
    L.platformlar.forEach(([c, r, w]) => {
      const p = this.add.tileSprite(c * T, r * T, w * T, 16, 'platform').setOrigin(0, 0);
      this.physics.add.existing(p, true);
      this.platforms.add(p);
      p.body.checkCollision.down = false;
      p.body.checkCollision.left = false;
      p.body.checkCollision.right = false;
    });

    // Hareketli platformlar
    L.hareketli.forEach(h => {
      const m = this.add.tileSprite(h.col * T, h.row * T, h.w * T, 16, 'platformKoyu').setOrigin(0, 0);
      this.physics.add.existing(m, false);
      this.movers.add(m);
      m.body.setAllowGravity(false).setImmovable(true);
      m.body.checkCollision.down = false;
      m.body.checkCollision.left = false;
      m.body.checkCollision.right = false;
      m.minX = h.min * T; m.maxX = h.max * T; m.hiz = h.hiz;
      m.body.setVelocityX(h.hiz);
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
      }).setDepth(2);
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
      (p.body.prev.y + p.body.height) <= pl.body.top + 8;
  }

  createColliders() {
    const P = this.player;
    this.physics.add.collider(P, this.solids);
    this.physics.add.collider(P, this.breakables, (p, bl) => this.kirilirTemas(p, bl));
    this.physics.add.collider(P, this.platforms, null, (p, pl) => this.tekYonlu(p, pl));
    this.physics.add.collider(P, this.movers, null, (p, m) => this.tekYonlu(p, m));
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
    this.updateHareketli();
    this.updateCheckpoints();
  }

  updateHareketli() {
    this.movers.getChildren().forEach(m => {
      if (m.x <= m.minX) m.body.setVelocityX(m.hiz);
      else if (m.x >= m.maxX) m.body.setVelocityX(-m.hiz);
    });
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
