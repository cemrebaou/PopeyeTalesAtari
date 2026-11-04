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
    this.tirmaniyor = false; this.bakis = 1; this.egilKilit = false; this.sekmeSira = false;
    this.asili = 0; this.asiliSon = 1; this.asiliBekle = 0; this.yatayKilit = 0; this.itiyor = false; this.hasarAnim = null;
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
    if (this.haritaModu) {   // P: tüm harita, kamera sabit
      cam.stopFollow();
      cam.setZoom(Math.min(w / this.dunyaG, h / this.dunyaY));
      cam.centerOn(this.dunyaG / 2, this.dunyaY / 2);
      return;
    }
    cam.setZoom(Math.min(h / K.gorunurY, w / K.minGorunurX));
  }

  // P tuşu: tüm haritayı göster (kamera sabit, en uzak) / geri dön
  haritaDegistir() {
    this.haritaModu = !this.haritaModu;
    const cam = this.cameras.main;
    if (this.haritaModu) cam.removeBounds();
    else { cam.setBounds(0, 0, this.dunyaG, this.dunyaY); cam.startFollow(this.player, true, 0.12, 0.12); }
    this.kameraAyarla();
  }

  // Karo katmanı: level verisindeki karakter satırlarını tilemap'e çevirir (128 px kaynak, 32 px gösterim)
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

  // Şelaleler: baştan sona tek, dikeyde kesintisiz gövde dokusu (assets/selaleOrta.png), aşağı doğru akar.
  // L.selaleler: [x, w, ustY, altY]
  selaleCiz() {
    const tex = this.textures.get('selaleOrta').getSourceImage();
    this.selaleler = (this.L.selaleler || []).map(([x, w, y0, y1]) => {
      const s = w / tex.width;
      return this.add.tileSprite(x, y0, w, y1 - y0, 'selaleOrta').setOrigin(0, 0).setTileScale(s, s).setDepth(-4.9);
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
    this.selaleCiz();
    L.bloklar.forEach(([x, y, w, h]) => this.blokCiz(x, y, w, h));
    // Ara kayalar, basamaklar ve kırılmayan taşlar: çevre objesi taş blok (tasBlok.png), çarpışmalı
    // Üst üste dizilişte her bloğun ön yüzü tam bir kare, 3B üst yüzü karenin üstüne taşar; üstteki blok
    // alttakinin üst yüzünü örter (alttan üste çizilir) → üst yüz sadece en tepede görünür.
    const tasCiz = (x, y, w, h) => {
      const Hd = T / (1 - CONFIG.tasUstYuz);
      for (let i = 0; i < w; i += T) for (let j = h - T, k = 0; j >= 0; j -= T, k++) {
        this.add.image(x + i, y + j + T, 'tasBlok').setOrigin(0, 1).setDisplaySize(T, Hd).setDepth(1.3 + k * 0.001);
      }
      this.blokCiz(x, y, w, h);
    };
    (L.kayalar || []).forEach(([x, y]) => this.blokCiz(x, y, T, T));   // ara kayalar: görseli zemin karosu (zeminDose.py)
    (L.basamaklar || []).forEach(([x, y, w, h]) => tasCiz(x, y, w, h));
    (L.taslar || []).forEach(([x, y]) => tasCiz(x, y, T, T));   // ileride güçlenince kırılacak (tasKirik.png hazır)

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

    // Sarmaşıklar: [x, y(üst), h] — %30 küçültüldü (30 → 21 px). Tam parça sayısı döşenir (son yaprak yarım
    // kesilmez); parça boyu sarmaşık boyuna tam oturacak şekilde dikeyde hafifçe ayarlanır.
    L.sarmasiklar.forEach(([x, y, h], i) => {
      const ad = 'sarmasik' + (i % 3), O = ASSETLER.obje[ad], gen = 21, sx = gen / O.w;
      const n = Math.max(1, Math.round(h / (O.h * sx))), sy = h / (n * O.h);
      this.add.tileSprite(x, y, gen, h, ad).setOrigin(0.5, 0).setDepth(1.5).setTileScale(sx, sy);
      this.vineRects.push(new Phaser.Geom.Rectangle(x - 9, y - 12, 18, h + 12));
    });

    // Kontrol noktaları (bayrak direği)
    L.kontrol.forEach(([x, y]) => {
      const spr = this.boyutla(this.add.image(x, y + 2, 'bayrak0').setOrigin(0.5, 1).setDepth(1.6), 'bayrak0', { h: CONFIG.bayrakBoy });
      this.checkpoints.push({ x, y, spr, aktif: false });
    });

    // Toplanabilirler
    L.elmaslar.forEach(([x, y]) => this.toplananYarat(this.elmaslar, 'elmas', x, y));
    this.durum.elmasToplam = L.elmaslar.length;
    L.sandiklar.forEach(([x, y, odul]) => this.sandikYarat(x, y, odul));
    const ozelTex = { buyuk: 'buyukelmas', kizil: 'kizilelmas', yasam: 'yasam', altin: 'altin' };
    L.ozeller.forEach(([tip, x, y]) => {
      if (!ozelTex[tip]) return;
      const o = this.toplananYarat(this.ozeller, ozelTex[tip], x, y);
      o.tip = tip;
    });

    // Çıkış kapısı (patron ölünce açılır)
    this.kapi = this.boyutla(this.add.image(L.cikis[0], L.cikis[1] + 2, 'kapi').setOrigin(0.5, 1).setDepth(1.6), 'kapi', { h: 72 });

    // İpuçları
    L.ipuclari.forEach(([x, y, text]) => harfYazi(this, text, 11, 'sol').setPosition(x, y).setDepth(4));

    // Düşmanlar ve patron
    // Katı zemin ızgarası (düşman devriye alanları için)
    this.izgara = [...Array(L.yukseklik / T)].map(() => new Uint8Array(L.genislik / T));
    const izIsaret = (x, y, w, h) => { for (let r = y / T; r < (y + h) / T; r++) for (let c = x / T; c < (x + w) / T; c++) if (this.izgara[r]) this.izgara[r][c] = 1; };
    L.bloklar.concat(L.basamaklar || []).forEach(q => izIsaret(...q));
    (L.kayalar || []).concat(L.taslar || []).forEach(([x, y]) => izIsaret(x, y, T, T));
    // Dikenli zemin hücreleri: devriye bunların üstüne çıkmaz (diken ile duvar/uçurum arasında yürür)
    this.dikenHucre = new Set();
    L.dikenler.forEach(([x, y, w]) => { for (let c = Math.floor(x / T); c <= Math.floor((x + w - 1) / T); c++) this.dikenHucre.add(Math.round(y / T) + ',' + c); });
    L.dusmanlar.forEach(e => this.dusmanYarat(e));
    // Gizli yerler: yaklaşınca bir kez gizli yer sesi (L.gizliler [x, y])
    this.gizliler = (L.gizliler || []).map(([x, y]) => ({ x, y, bulundu: false }));
    this.dusmanYarat({ tip: 'boss', x: L.boss[0], y: L.boss[1] });
  }

  // Sandık: x, zemin y (alt kenar), ödül. Ağırlıklı kutu: üstüne çıkılır, bastonla çekilir, vurunca açılır
  // Toplanabilir: dönen görsel (ASSETLER.toplanan), oyundaki boy CONFIG.toplanBoy[ad]
  toplananYarat(grup, ad, x, y) {
    const TP = ASSETLER.toplanan, r = TP.sira.indexOf(ad);
    const o = grup ? grup.create(x, y, 'toplanan', r * 6) : this.add.sprite(x, y, 'toplanan', r * 6);
    o.setScale(CONFIG.toplanBoy[ad] / (TP.h - 8)).setDepth(2);
    o.play({ key: 't_' + ad, startFrame: Phaser.Math.Between(0, 5) });
    if (grup) o.refreshBody();
    return o;
  }

  sandikYarat(x, y, odul) {
    const s = this.sandiklar.create(x, y - 1, 'sandik').setOrigin(0.5, 1).setDepth(2);
    this.boyutla(s, 'sandik', { w: 32 });   // v0.28: %20 küçük
    s.odul = odul; s.acik = false;
    s.govdeW = 30; s.govdeH = s.displayHeight - 2;
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

  // Oyuncu görsel ölçeği (1 = normal). Gövde boyu ve ayak çizgisi değişmez, görsel ayaklardan büyür.
  // Eğikken gövde alçalır (CONFIG.oyuncu.govdeEgik) → 1 karelik aralıklardan sadece eğilerek geçilir.
  gorselOlcek(f) {
    const p = this.player, ikinci = p.texture.key === 'oyuncu2';
    const egik = !!this.egik, anahtar = f + (egik ? 'e' : '') + (ikinci ? '2' : '');
    if (this.gorselCarpan === anahtar) return;
    this.gorselCarpan = anahtar;
    const O = CONFIG.oyuncu, KR = ikinci ? O.kare2 : O.kare;
    const s = O.boy / O.kare.ayakBoy * f, gomme = O.ayakGomme / s, gw = O.govdeG / s, gh = (egik ? O.govdeEgik : O.govdeY) / s;
    p.setScale(s).setOrigin(0.5, (KR.ayakY - gomme) / KR.h);
    p.body.setSize(gw, gh, false).setOffset(KR.w / 2 - gw / 2, KR.ayakY - gomme - gh);
  }

  // Ayağa kalkacak yer var mı? (eğik gövdenin üstünde, ayakta gövde boyu kadar alan zemin/takoz ile dolu mu)
  tavanVar() {
    const b = this.player.body, O = CONFIG.oyuncu;
    const ek = O.govdeY - O.govdeEgik;
    return this.physics.overlapRect(b.x + 1, b.bottom - O.govdeY, b.width - 2, ek, false, true)
      .some(o => o.gameObject && (this.solids.contains(o.gameObject) || this.takozlar.contains(o.gameObject)));
  }

  // Bakılan yönde gövdeye bitişik duvar (zemin bloğu / takoz) var mı. y0/h verilirse sadece o yükseklik aralığı.
  duvarVar(yon, y0, h) {
    const b = this.player.body;
    const x = yon > 0 ? b.right : b.left - 2;
    if (y0 === undefined) { y0 = b.y + 4; h = b.height - 8; }
    return this.physics.overlapRect(x, y0, 2, h, false, true)
      .find(o => o.gameObject && (this.solids.contains(o.gameObject) || this.takozlar.contains(o.gameObject))) || null;
  }

  // Asılma kancası (baston) önündeki taşa değiyor mu: kanca ayakların CONFIG.oyuncu.kancaY px üstünde
  kancaDuvar(yon) {
    const b = this.player.body;
    return this.duvarVar(yon, b.bottom - CONFIG.oyuncu.kancaY - 3, 6);
  }

  createPlayer() {
    const O = CONFIG.oyuncu;
    this.spawn = { x: this.L.baslangic[0], y: this.L.baslangic[1] - 2 };
    // Hücrede ayak çizgisi KR.ayakY, kafa yatay ortada. Ayakta boy KR.ayakBoy px → oyunda O.boy px.
    // Ayaklar gövdenin O.ayakGomme px altına çizilir (çimene basmış görünür)
    const KR = O.kare, olcek = O.boy / KR.ayakBoy, gomme = O.ayakGomme / olcek;
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, 'oyuncu', 0)
      .setOrigin(0.5, (KR.ayakY - gomme) / KR.h).setDepth(10).setScale(olcek);
    this.gorselCarpan = 0; this.gorselOlcek(1);
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
    // v0.49: düşen sandık düşmanın kafasına inerse düşman ölür (patron 1 hasar)
    this.physics.add.collider(this.dusmanlar, this.sandiklar, null, (d, s) => {
      if (!d.oldu && s.body.velocity.y > 60 && s.body.bottom - d.body.top < 18) {
        this.dusmanHasar(d, d.tip === 'boss' ? 1 : 99);
        return false;
      }
      return yerdeki(d);
    });

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
    kb.on('keydown-P', () => this.haritaDegistir());
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.durum.bitti || this.durum.oyunBitti) return;
    this.updatePlayer(time, dt);
    this.updateDusmanlar(time, dt);
    // Sandık yere düşme sesi: hızla düşen sandık yere değince bir kez
    this.sandiklar.getChildren().forEach(s => {
      if (!s.active || !s.body) return;
      const yerde = s.body.blocked.down || s.body.touching.down;
      if (!yerde && s.body.velocity.y > 150) s.dusuyor = true;
      else if (yerde && s.dusuyor) { s.dusuyor = false; this.ses('sandikDus'); }
    });
    this.gizliler.forEach(z => {
      if (!z.bulundu && Math.abs(this.player.x - z.x) < 110 && Math.abs(this.player.y - z.y) < 90) { z.bulundu = true; this.ses('gizli'); }
    });
    // Şelale akışı (doku koordinatında; ölçekten bağımsız aynı hız)
    this.selaleler.forEach(sp => { sp.tilePositionY -= CONFIG.selaleHiz * dt / sp.tileScaleY; });
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
        this.boyutla(c.spr, 'bayrak1', { h: CONFIG.bayrakBoy });
        this.spawn = { x: c.x, y: c.y - 2 };
        this.popup(c.x, c.y - 80, 'Kontrol noktası!');
        this.ses('bayrak');
      }
    });
  }
}
