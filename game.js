// Ana oyun sahnesi: kurulum ve seviye inşası.
// Oyuncu mantığı -> oyuncu.js, düşmanlar/sandıklar -> dusman.js, arayüz (ayrı UI sahnesi) -> ui.js

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
      puan: 0, elmas: 0, elmasToplam: 0,
      can: CONFIG.oyuncu.canMax, yasam: CONFIG.oyuncu.yasam,
      olu: false, bitti: false, oyunBitti: false
    };
    this.dokunulmaz = 0; this.knock = 0;
    this.saldiriZaman = 0; this.saldiriBekleme = 0; this.vurulan = new Set();
    this.cekDurum = null; this.cekSandik = null; this.cekZaman = 0;   // sandık çekme: null | 'uzat' | 'cek'
    this.pogoModu = false; this.pogoAktif = false; this.pogoSekZaman = 0;
    this.inisZaman = 0; this.havadaydi = false; this.sersemZaman = 0; this.cekMesafe = 0;
    this.tirmaniyor = false; this.bakis = 1;
    this.coyote = 0; this.ziplaTampon = 0; this.ziplarken = false;
    this.oncekiZipla = false; this.oncekiZiplaTus = false; this.oncekiSaldir = false; this.oncekiCek = false;
    this.bantItme = 0;
    this.k = null;
    this.touch = { sol: false, sag: false, yukari: false, asagi: false, zipla: false, saldir: false, cek: false };

    this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.dunyaG, this.dunyaY);
    this.cameras.main.setBackgroundColor(0x141c26);

    this.buildLevel();
    this.createPlayer();
    this.createColliders();
    this.createInput();
    this.kameraAyarla();
    this.scale.on('resize', this.kameraAyarla, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.kameraAyarla, this));
    // Arayüz (HUD, dokunmatik tuşlar, tam ekran) ayrı sahnede: kamera yakınlaştırmasından etkilenmez
    if (this.scene.isActive('UI')) this.scene.get('UI').scene.restart();
    else this.scene.launch('UI');
  }

  // Kamera: ekran ne boyutta olursa olsun tamamını doldurur; yakınlık ekran yüksekliğine göre ayarlanır
  kameraAyarla() {
    const cam = this.cameras.main, K = CONFIG.kamera;
    const w = this.scale.width, h = this.scale.height;
    cam.setSize(w, h);
    cam.setZoom(Math.min(h / K.gorunurY, w / K.minGorunurX));
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

  // Şelalelerin başına taş ağızlı başlangıç, dibine köpüklü bitiş görseli koyar.
  // Şelale sütunları arka katmandaki şelale karolarından bulunur (her şelale 2 kare genişliğinde).
  selaleUclari() {
    const A = ASSETLER.tile, L = this.L, T = L.karo;
    const su = new Set([A.wselaleU, A.wselale0, A.wselale1, A.wselaleA]);
    const sutunlar = {};   // "üst,alt" → sütun listesi
    for (let x = 0; x < L.arka[0].length; x++) {
      let ust = -1;
      for (let y = 0; y <= L.arka.length; y++) {
        const var_ = y < L.arka.length && su.has(this.alfabeNo[L.arka[y][x]]);
        if (var_ && ust < 0) ust = y;
        if (!var_ && ust >= 0) { (sutunlar[ust + ',' + (y - 1)] = sutunlar[ust + ',' + (y - 1)] || []).push(x); ust = -1; }
      }
    }
    const bas = this.textures.get('selaleBas').getSourceImage(), son = this.textures.get('selaleSon').getSourceImage();
    Object.entries(sutunlar).forEach(([anahtar, xs]) => {
      const [ust, alt] = anahtar.split(',').map(Number);
      xs.sort((a, b) => a - b);
      // yan yana sütunları tek şelale olarak grupla
      const gruplar = [];
      xs.forEach(x => {
        const g = gruplar[gruplar.length - 1];
        if (g && x === g[g.length - 1] + 1) g.push(x); else gruplar.push([x]);
      });
      gruplar.forEach(g => {
        const x = g[0] * T, w = g.length * T;
        // Başlangıç: suyun genişliğine ölçekli, şelalenin en üstüne
        const sb = w / bas.width;
        this.add.image(x, ust * T, 'selaleBas').setOrigin(0, 0).setScale(sb).setDepth(-4.9);
        // Bitiş: su gövdesi (görselde 19..153 px) şelale genişliğine oturur, köpük yanlara taşar;
        // dibi zemin çizgisinin biraz üstünde → köpük çimenin üstünde görünür, alt kenarını çimen örter
        const ss = w / 134;
        this.add.image(x - 19 * ss, (alt + 1) * T - 5, 'selaleSon').setOrigin(0, 1).setScale(ss).setDepth(-4.9);
      });
    });
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
    this.sandiklar = this.physics.add.group();   // çekilebilir, üstüne çıkılabilir sandıklar
    this.ozeller = this.physics.add.staticGroup();
    this.dusmanlar = this.physics.add.group();
    this.mermiler = this.physics.add.group({ allowGravity: false });
    this.ipGrafik = this.add.graphics().setDepth(5);
    this.spikeRects = [];
    this.vineRects = [];
    this.checkpoints = [];

    // Karo katmanları: arka duvarlar + şelaleler (çarpışmasız) ve zemin
    this.arkaKatman = this.karoKatmani(L.arka, -5);
    this.onKatman = this.karoKatmani(L.on, 1);
    this.selaleUclari();
    // Toprak zeminler: tek kesintisiz doku, dünya koordinatına hizalı (bloklar arası dikiş olmaz)
    const tk = CONFIG.toprakDoku / this.textures.get('toprak').getSourceImage().width;
    // Yeraltı arka planı: aynı toprak dokusu, karartılmış, dünyaya hizalı (önündeki toprakla kesintisiz devam eder)
    if (L.yeraltiY !== undefined) {
      this.add.tileSprite(0, L.yeraltiY, this.dunyaG, this.dunyaY - L.yeraltiY, 'toprak').setOrigin(0, 0).setDepth(-4)
        .setTileScale(tk, tk).setTilePosition(0, L.yeraltiY / tk).setTint(CONFIG.yeraltiKarartma);
    }
    (L.toprak || []).forEach(([x, y, w, h]) => {
      this.add.tileSprite(x, y, w, h, 'toprak').setOrigin(0, 0).setDepth(1)
        .setTileScale(tk, tk).setTilePosition(x / tk, y / tk);
    });
    // Toprak yan kenarları: dikey yosun şeridi, bir tekrarı bir kare yüksekliğinde, kenar çizgisine ortalı
    const ks = L.karo / this.textures.get('kenar').getSourceImage().height;
    const kw = this.textures.get('kenar').getSourceImage().width * ks;
    (L.kenarlar || []).forEach(([x, y0, y1]) => {
      this.add.tileSprite(x - kw / 2, y0, kw, y1 - y0, 'kenar').setOrigin(0, 0).setDepth(1.1)
        .setTileScale(ks, ks).setTilePosition(0, y0 / ks);
    });
    // Çimen: dolu kısmı toprak çizgisinin üstüne taşar (toprak kenarı görünmez), karakterin önünde çizilir
    // (ayakkabının alt kısmı çimenin içinde kalır). Doku dünyaya hizalı; görsel kaliteli küçültüldü (assets/cimen_k.png)
    const cimenTex = this.textures.get('cimen').getSourceImage();
    const cs = CONFIG.cimenGenislik / cimenTex.width;
    const ch = cimenTex.height * cs;
    (L.cimen || []).forEach(([x0, x1, y]) => {
      const w = x1 - x0, ust = y - ch * CONFIG.cimenUstOran;
      this.add.tileSprite(x0, ust, w, ch, 'cimen').setOrigin(0, 0).setDepth(CONFIG.cimenDerinlik)
        .setTileScale(cs, cs).setTilePosition(x0 / cs, 0);
    });
    L.bloklar.forEach(([x, y, w, h]) => this.blokCiz(x, y, w, h));
    // Ara taş basamaklar (yüksek duvarlara çıkış için)
    (L.basamaklar || []).forEach(([x, y, w, h]) => {
      for (let i = 0; i < w; i += T) for (let j = 0; j < h; j += T) {
        this.add.image(x + i, y + j, 'tasBlok').setOrigin(0, 0).setDisplaySize(T, T).setDepth(1.3);
      }
      this.blokCiz(x, y, w, h);
    });

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

    // Kırmızı takozlar: baston vuruşuyla kırılır
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
    const ozelTex = { buyuk: 'buyukelmas', kizil: 'kizilelmas' };
    L.ozeller.forEach(([tip, x, y]) => {
      if (!ozelTex[tip]) return;
      const o = this.ozeller.create(x, y, ozelTex[tip]).setDepth(2);
      o.tip = tip;
    });

    // Çıkış kapısı (patron ölünce açılır)
    this.kapi = this.boyutla(this.add.image(L.cikis[0], L.cikis[1] + 2, 'kapi').setOrigin(0.5, 1).setDepth(1.6), 'kapi', { h: 72 });

    // İpuçları
    L.ipuclari.forEach(([x, y, text]) => {
      this.add.text(x, y, text, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3, resolution: 3
      }).setDepth(4);
    });

    // Düşmanlar ve patron
    L.dusmanlar.forEach(e => this.dusmanYarat(e));
    this.dusmanYarat({ tip: 'boss', x: L.boss[0], y: L.boss[1] });
  }

  // Sandık: x, zemin y (alt kenar), ödül. Ağırlıklı kutu: üstüne çıkılır, bastonla çekilir, vurunca açılır
  sandikYarat(x, y, odul) {
    const s = this.sandiklar.create(x, y - 1, 'sandik').setOrigin(0.5, 1).setDepth(2);
    this.boyutla(s, 'sandik', { w: 40 });
    s.odul = odul; s.acik = false;
    s.govdeW = 38; s.govdeH = s.displayHeight - 2;
    this.sandikGovde(s);
    s.body.pushable = false;            // oyuncu yürüyerek itemez, sadece bastonla çekilir (zemine yine çarpar)
    s.body.setDragX(900);
    s.setMaxVelocity(400, CONFIG.fizik.maxDusme);
    return s;
  }

  // Sandık gövdesi: görsel değişse de (açık sandık) aynı kutu boyutu, alt kenara hizalı
  sandikGovde(s) {
    const sx = s.scaleX, sy = s.scaleY;
    const w = s.govdeW / sx, h = s.govdeH / sy;
    s.body.setSize(w, h, false);
    s.body.setOffset((s.frame.width - w) / 2, s.frame.height - h);
  }

  createPlayer() {
    const O = CONFIG.oyuncu;
    this.spawn = { x: this.L.baslangic[0], y: this.L.baslangic[1] - 2 };
    // Hücrede ayak çizgisi KR.ayakY, kafa yatay ortada. Ayakta boy KR.ayakBoy px → oyunda O.boy px.
    // Ayaklar gövdenin O.ayakGomme px altına çizilir (çimene basmış görünür)
    const KR = O.kare, olcek = O.boy / KR.ayakBoy, gomme = O.ayakGomme / olcek;
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, 'oyuncu', 0)
      .setOrigin(0.5, (KR.ayakY - gomme) / KR.h).setDepth(10).setScale(olcek);
    const gw = O.govdeG / olcek, gh = O.govdeY / olcek;
    this.player.body.setSize(gw, gh, false).setOffset(KR.w / 2 - gw / 2, KR.ayakY - gomme - gh);
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(1000, CONFIG.fizik.maxDusme);
    this.player.play('dur');

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(60, 40);
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
    // Sandıklar: üstüne çıkılır; pogo ile üstüne inince açılır
    this.physics.add.collider(P, this.sandiklar, (p, s) => this.sandikTemas(p, s), () => !this.tirmaniyor);
    this.physics.add.collider(this.sandiklar, this.solids);
    this.physics.add.collider(this.sandiklar, this.takozlar);
    this.physics.add.collider(this.sandiklar, this.breakables);
    this.physics.add.collider(this.sandiklar, this.sandiklar);
    this.physics.add.collider(this.sandiklar, this.platforms, null, (s, pl) => s.body.velocity.y >= 0 && s.body.prev.y + s.body.height <= pl.body.y + 8);

    this.physics.add.collider(this.dusmanlar, this.solids, null, (d) => yerdeki(d));
    this.physics.add.collider(this.dusmanlar, this.takozlar, null, (d) => yerdeki(d));
    this.physics.add.collider(this.dusmanlar, this.breakables);
    this.physics.add.collider(this.dusmanlar, this.platforms, null, (d) => yerdeki(d) && d.body.velocity.y >= 0);
    this.physics.add.collider(this.dusmanlar, this.sandiklar, null, (d) => yerdeki(d));

    this.physics.add.overlap(this.mermiler, this.solids, (m) => m.destroy());
    this.physics.add.overlap(this.mermiler, this.takozlar, (m) => m.destroy());
    this.physics.add.overlap(this.mermiler, this.sandiklar, (m) => m.destroy());
    this.physics.add.overlap(P, this.mermiler, (p, m) => {
      if (!m.active) return;
      const kaynakX = m.x - m.body.velocity.x;   // destroy'dan önce oku (sonra body yok, oyun kilitleniyordu)
      m.destroy();
      this.oyuncuHasar(kaynakX);
    });

    this.physics.add.overlap(P, this.dusmanlar, (p, d) => this.dusmanTemas(p, d));
    this.physics.add.overlap(P, this.elmaslar, (p, e) => this.elmasAl(e));
    this.physics.add.overlap(P, this.kalpler, (p, h) => this.kalpAl(h));
    this.physics.add.overlap(P, this.ozeller, (p, o) => this.ozelAl(o));
  }

  createInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      sol: 'LEFT', sag: 'RIGHT', yukari: 'UP', asagi: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      zipla: 'SPACE', z: 'Z', saldir: 'X', k: 'K', cek: 'C', l: 'L', r: 'R'
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
