// Ana oyun sahnesi: kurulum ve seviye inşası.
// Oyuncu mantığı -> oyuncu.js, düşmanlar/bomba -> dusman.js, arayüz -> ui.js

// Platform parçaları: s = ölçek (kaynak px -> oyun px), yz = basılan yüzeyin görsel üstten uzaklığı (oyun px)
const PLATFORM = {
  kutuk: { s: 0.5, yz: 6 }, tas: { s: 0.5, yz: 4 }, kopru: { s: 0.5, yz: 6 }, ada: { s: 0.45, yz: 10 },
  dal: { s: 0.45, yz: 12 }, izgara: { s: 0.5, yz: 4 }, bant: { s: 0.5, yz: 4 }, hover: { s: 0.45, yz: 5 }
};

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
    this.cameras.main.setBackgroundColor(0x141c26);

    this.buildLevel();
    this.createPlayer();
    this.createColliders();
    this.createInput();
    this.createHud();
    this.createTouch();
  }

  // Karo katmanı: level verisindeki karakter satırlarını tilemap'e çevirir (64px kaynak, 32px gösterim)
  karoKatmani(satirlar, derinlik) {
    const A = ASSETLER.tileset, L = this.L;
    if (!this.alfabeNo) {
      this.alfabeNo = {};
      for (let i = 0; i < L.alfabe.length; i++) this.alfabeNo[L.alfabe[i]] = i - 1;
    }
    const veri = satirlar.map(r => Array.from(r, ch => this.alfabeNo[ch]));
    const map = this.make.tilemap({ data: veri, tileWidth: A.boyut, tileHeight: A.boyut });
    const ts = map.addTilesetImage('tileset', 'tileset', A.boyut, A.boyut, A.extrude, A.extrude * 2);
    return map.createLayer(0, ts, 0, 0).setScale(L.karo / A.boyut).setDepth(derinlik);
  }

  // Görsel boyutunu kaynak orana göre ayarlar (yükseklik veya genişlik verilir)
  boyutla(img, anahtar, { w, h }) {
    const O = ASSETLER.obje[anahtar];
    if (w) img.setDisplaySize(w, w * O.h / O.w);
    else img.setDisplaySize(h * O.w / O.h, h);
    return img;
  }

  // Görünmez çarpışma gövdesi (görseller karo katmanında)
  blokCiz(x, y, w, h) {
    const z = this.add.zone(x, y, w, h).setOrigin(0, 0);
    this.physics.add.existing(z, true);
    this.solids.add(z);
  }

  // Tek yönlü gövde: sadece üstten çarpışır
  tekYonluGovde(x, yuzeyY, w, dinamik) {
    const z = this.add.zone(x, yuzeyY, w, 12).setOrigin(0, 0);
    this.physics.add.existing(z, !dinamik);
    z.body.checkCollision.down = false;
    z.body.checkCollision.left = false;
    z.body.checkCollision.right = false;
    z.imgs = [];
    return z;
  }

  // Parçalı platform: sol uç + n orta parça + sağ uç. x = sol kenar, yuzeyY = basılan yüzey
  platformYarat(tip, x, yuzeyY, n, dinamik) {
    const P = PLATFORM[tip], O = ASSETLER.obje;
    const parcalar = [tip + 'L'];
    for (let i = 0; i < n; i++) parcalar.push(tip + 'M' + (i % 3));
    parcalar.push(tip + 'R');
    let cx = x;
    const imgs = parcalar.map(ad => {
      const im = this.add.image(cx, yuzeyY - P.yz, ad).setOrigin(0, 0)
        .setDisplaySize(O[ad].w * P.s, O[ad].h * P.s).setDepth(3);
      cx += O[ad].w * P.s - 1;
      return im;
    });
    const z = this.tekYonluGovde(x + 2, yuzeyY, cx - x - 4, dinamik);
    imgs.forEach(im => { im.ox = im.x - z.x; im.oy = im.y - z.y; z.imgs.push(im); });
    z.img = imgs[0];
    return z;
  }

  // Tek görselli tek yönlü obje (asansör, çatlak taş, mantar). yz = yüzeyin görsel üstten uzaklığı
  tekGorselYarat(ad, x, yuzeyY, genislik, yz, dinamik) {
    const im = this.boyutla(this.add.image(x, yuzeyY - yz, ad).setOrigin(0, 0).setDepth(3), ad, { w: genislik });
    const z = this.tekYonluGovde(x + 3, yuzeyY, genislik - 6, dinamik);
    im.ox = im.x - z.x; im.oy = im.y - z.y;
    z.imgs.push(im); z.img = im;
    return z;
  }

  buildLevel() {
    const L = this.L, T = L.karo;

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

    // Karo katmanları: arka duvarlar + şelaleler (çarpışmasız) ve zemin
    this.arkaKatman = this.karoKatmani(L.arka, -5);
    this.onKatman = this.karoKatmani(L.on, 1);
    L.bloklar.forEach(([x, y, w, h]) => this.blokCiz(x, y, w, h));

    // Tek yönlü platformlar: { tip, x, y, n }  (bu bölümde yok, istenirse eklenir)
    (L.platformlar || []).forEach(p => this.platforms.add(this.platformYarat(p.tip, p.x, p.y, p.n || 1, false)));
    // Yatay hareketli (uçan) platformlar: { tip:'hover', y, min, max, n, hiz }
    (L.hareketli || []).forEach(h => {
      const z = this.platformYarat(h.tip || 'hover', h.min, h.y, h.n || 1, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.minX = h.min; z.maxX = h.max - z.body.width; z.hiz = h.hiz || 70;
      z.body.setVelocityX(z.hiz);
    });
    // Asansörler (dikey uçan platform): { x, alt, ust, hiz }
    (L.asansorlar || []).forEach(e => {
      const z = this.tekGorselYarat('asansor', e.x, e.alt, 56, 4, true);
      this.movers.add(z);
      z.body.setAllowGravity(false).setImmovable(true);
      z.dikey = true; z.minY = e.ust; z.maxY = e.alt; z.yon = -1; z.bekle = 0.8; z.hiz = e.hiz || 60;
    });
    // Konveyör bantlar: { x, y, n, yon }
    (L.bantlar || []).forEach(b => {
      const z = this.platformYarat('bant', b.x, b.y, b.n || 2, false);
      this.bantlar.add(z);
      z.itme = b.yon * CONFIG.fizik.bant;
    });
    // Çatlak taşlar: { x, y }
    (L.catlaklar || []).forEach(c => {
      const z = this.tekGorselYarat('catlak0', c.x, c.y, 40, 3, false);
      this.catlaklar.add(z);
      z.durum = 'hazir'; z.x0 = z.img.x; z.y0 = z.img.y;
    });
    // Zıplatan yapraklar (zeminde durur): { x, y }
    (L.yapraklar || []).forEach(y => {
      const z = this.tekGorselYarat('yaprak0', y.x, y.y - 22, 50, 4, false);
      this.yapraklar.add(z);
    });
    // Kırılabilir kasalar: [x, y, w, h] (karo cinsinden genişlik/yükseklik)
    (L.kirilir || []).forEach(([x, y, w, h]) => {
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
        const bl = this.breakables.create(x + i * T, y + j * T, 'kasa').setOrigin(0, 0).setDisplaySize(T, T).setDepth(2);
        bl.refreshBody();
      }
    });

    // Kırmızı takozlar: sadece bomba kırar
    L.takozlar.forEach(([x, y]) => {
      this.takozlar.create(x, y, 'takoz').setDisplaySize(T, T).setDepth(2).refreshBody();
    });

    // Dikenler: [x, zemin y, w]
    L.dikenler.forEach(([x, y, w]) => {
      const n = Math.max(1, Math.round(w / 48)), pw = w / n;
      const O = ASSETLER.obje.diken, ph = pw * O.h / O.w;
      for (let i = 0; i < n; i++) {
        this.add.image(x + i * pw, y + 3, 'diken').setOrigin(0, 1).setDisplaySize(pw + 1, ph).setDepth(1.5);
      }
      this.spikeRects.push(new Phaser.Geom.Rectangle(x + 4, y - ph * 0.8, w - 8, ph * 0.8));
    });

    // Sarmaşıklar: [x, y(üst), h] — dikey döşenen sarmaşık
    L.sarmasiklar.forEach(([x, y, h], i) => {
      const ad = 'sarmasik' + (i % 3), O = ASSETLER.obje[ad], gen = 30;
      this.add.tileSprite(x, y, gen, h, ad).setOrigin(0.5, 0).setDepth(1.5)
        .setTileScale(gen / O.w, gen / O.w);
      this.vineRects.push(new Phaser.Geom.Rectangle(x - 9, y - 12, 18, h + 12));
    });

    // Kontrol noktaları (bayrak direği)
    L.kontrol.forEach(([x, y]) => {
      const spr = this.boyutla(this.add.image(x, y + 2, 'bayrak0').setOrigin(0.5, 1).setDepth(1.6), 'bayrak0', { h: 64 });
      this.checkpoints.push({ x, y, spr, aktif: false });
    });

    // Toplanabilirler
    L.elmaslar.forEach(([x, y]) => this.elmaslar.create(x, y, 'elmas'));
    this.durum.elmasToplam = L.elmaslar.length;
    L.sandiklar.forEach(([x, y, odul]) => this.sandikYarat(x, y, odul));
    const ozelTex = { buyuk: 'buyukelmas', kizil: 'kizilelmas', bomba: 'bombaItem' };
    L.ozeller.forEach(([tip, x, y]) => {
      const o = this.ozeller.create(x, y, ozelTex[tip]).setDepth(2);
      o.tip = tip;
    });

    // Çıkış kapısı (patron ölünce açılır)
    this.kapi = this.boyutla(this.add.image(L.cikis[0], L.cikis[1] + 2, 'kapi').setOrigin(0.5, 1).setDepth(1.6), 'kapi', { h: 72 });

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

  // Sandık: x, zemin y (alt kenar), ödül
  sandikYarat(x, y, odul) {
    const s = this.sandiklar.create(x, y + 2, 'sandik').setOrigin(0.5, 1).setDepth(2);
    this.boyutla(s, 'sandik', { w: 40 });
    s.refreshBody();
    s.odul = odul; s.acik = false;
    return s;
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
      m.imgs.forEach(im => im.setPosition(m.x + im.ox, m.y + im.oy));
    });
  }

  // Çatlak taş: sallanır, kırılır, düşer, bir süre sonra geri gelir
  catlakBasla(z) {
    z.durum = 'sallan';
    const F = CONFIG.fizik;
    z.img.setTexture('catlak1');
    this.tweens.add({ targets: z.img, x: z.x0 + 2, duration: 50, yoyo: true, repeat: Math.floor(F.catlakGecikme / 100) - 1 });
    this.time.delayedCall(F.catlakGecikme, () => {
      z.durum = 'dusuyor';
      z.body.enable = false;
      z.img.setTexture('catlak2');
      this.parcala(z.x + 20, z.y, 0x9a9a8c);
      this.tweens.add({ targets: z.img, y: z.y0 + 180, alpha: 0, duration: 450, ease: 'Quad.easeIn' });
      this.time.delayedCall(F.catlakYenilen, () => {
        z.img.setTexture('catlak0').setPosition(z.x0, z.y0).setAlpha(1);
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
    z.img.setTexture('yaprak1');
    this.time.delayedCall(140, () => z.img.setTexture('yaprak0'));
  }

  updateCheckpoints() {
    const p = this.player;
    this.checkpoints.forEach(c => {
      if (!c.aktif && Math.abs(p.x - c.x) < 50 && Math.abs(p.y - c.y) < 120) {
        c.aktif = true;
        c.spr.setTexture('bayrak1').setOrigin(0.32, 1);
        this.boyutla(c.spr, 'bayrak1', { h: 64 });
        this.spawn = { x: c.x, y: c.y - 2 };
        this.popup(c.x, c.y - 80, 'Kontrol noktası!');
      }
    });
  }
}
