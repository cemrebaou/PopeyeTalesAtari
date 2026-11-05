// Oyuncu: kurulum, girdi, hareket (yürüme, eğilme, zıplama, pogo), baston (vurma, çekme, itme, duvara asılma),
// sarmaşık, hasar / ölüm, animasyon ve sesler.
Object.assign(OyunSahnesi.prototype, {

  oyuncuDurumuSifirla() {
    Object.assign(this, {
      dokunulmaz: 0, knock: 0, sersemZaman: 0, hasarAnim: null,
      saldiriZaman: 0, saldiriBekleme: 0, vurulan: new Set(),
      cekDurum: null, cekSandik: null, cekZaman: 0, cekMesafe: 0,   // çekme: null | 'uzat' | 'cek'
      pogoModu: false, pogoAktif: false, pogoSekZaman: 0,
      inisZaman: 0, havadaydi: false, coyote: 0, ziplaTampon: 0, ziplarken: false,
      tirmaniyor: false, bakis: 1, egik: false, tavan: false, egilKilit: false, itiyor: false,
      asili: 0, asiliSon: 1, asiliBekle: 0, yatayKilit: 0,
      oncekiZipla: false, oncekiZiplaTus: false, oncekiSaldir: false, oncekiCek: false,
      k: null
    });
  },

  oyuncuKur() {
    const O = CONFIG.oyuncu;
    this.spawn = { x: this.L.baslangic[0], y: this.L.baslangic[1] - 2 };
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, 'oyuncu', 0).setDepth(10);
    this.gorselCarpan = null;
    this.gorselOlcek(1);
    this.player.setCollideWorldBounds(true).setMaxVelocity(1000, CONFIG.fizik.maxDusme);
    this.player.play('dur');
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12).setDeadzone(60, 40);
  },

  // Görsel ölçek (animasyona göre) ve çarpışma gövdesi. Gövde ayak çizgisinde sabit kalır, görsel ayaklardan büyür.
  // Eğikken gövde alçalır → 1 karelik aralıklardan sadece eğilerek geçilir.
  gorselOlcek(f) {
    const p = this.player, ikinci = p.texture.key === 'oyuncu2';
    const anahtar = f + (this.egik ? 'e' : '') + (ikinci ? '2' : '');
    if (this.gorselCarpan === anahtar) return;
    this.gorselCarpan = anahtar;
    const O = CONFIG.oyuncu, KR = ikinci ? O.kare2 : O.kare;
    const s = O.boy / O.kare.ayakBoy * f, gomme = this.zeminGomme / s;
    const gw = O.govdeG / s, gh = (this.egik ? O.govdeEgik : O.govdeY) / s;
    p.setScale(s).setOrigin(0.5, (KR.ayakY - gomme) / KR.h);
    p.body.setSize(gw, gh, false).setOffset(KR.w / 2 - gw / 2, KR.ayakY - gomme - gh);
  },

  // ---- Çevre sorguları ----
  // Verilen dikdörtgende katı zemin var mı (ilk gövdeyi döner)
  katiBul(x, y, w, h) {
    return this.physics.overlapRect(x, y, w, h, false, true).find(o => o.gameObject && this.solids.contains(o.gameObject)) || null;
  },
  // Eğikken üstte ayağa kalkacak yer yok mu
  tavanVar() {
    const b = this.player.body, O = CONFIG.oyuncu;
    return !!this.katiBul(b.x + 1, b.bottom - O.govdeY, b.width - 2, O.govdeY - O.govdeEgik);
  },
  // Bakılan yönde gövdeye bitişik duvar (y0/h verilirse sadece o yükseklik aralığı)
  duvarVar(yon, y0, h) {
    const b = this.player.body;
    if (y0 === undefined) { y0 = b.y + 4; h = b.height - 8; }
    return this.katiBul(yon > 0 ? b.right : b.left - 2, y0, 2, h);
  },
  // Asılma kancası (baston, ayakların kancaY üstü) önündeki taşa ya da kırılır taşa değiyor mu
  kancaDuvar(yon) {
    const b = this.player.body, y0 = b.bottom - CONFIG.oyuncu.kancaY - 3, x = yon > 0 ? b.right : b.left - 2;
    return this.duvarVar(yon, y0, 6) || this.physics.overlapRect(x, y0, 2, 6, true, false)
      .find(o => o.enable && o.gameObject && o.gameObject.kirTas && !o.gameObject.kiriliyor) || null;
  },

  // ---- Girdi ----
  girdi() {
    const K = this.keys, T = this.touch;
    const ziplaTus = K.zipla.isDown || K.z.isDown || T.zipla;   // sarmaşıktan atlamak için (↑ hariç)
    const zipla = ziplaTus || K.yukari.isDown || K.w.isDown;    // klavyede ↑ de zıplatır
    const saldir = K.saldir.isDown || K.k.isDown || K.j.isDown || T.saldir;
    const cek = K.cek.isDown || K.l.isDown;                      // klavyede doğrudan çekme (dokunmatikte VUR basılı)
    const asagiKlavye = K.asagi.isDown || K.s.isDown;
    const k = {
      sol: K.sol.isDown || K.a.isDown || T.sol,
      sag: K.sag.isDown || K.d.isDown || T.sag,
      yukari: K.yukari.isDown || K.w.isDown || T.yukari,
      asagi: asagiKlavye || T.asagi,
      egil: asagiKlavye || this.egilKilit,                        // dokunmatik ▼ aç/kapa (egilKilit)
      zipla, saldir, cek,
      ziplaBas: zipla && !this.oncekiZipla,
      ziplaBasTus: ziplaTus && !this.oncekiZiplaTus,
      saldirBas: saldir && !this.oncekiSaldir,
      cekBas: cek && !this.oncekiCek
    };
    this.oncekiZipla = zipla; this.oncekiZiplaTus = ziplaTus; this.oncekiSaldir = saldir; this.oncekiCek = cek;
    return k;
  },

  // VUR tuşu tek başına üç iş yapar: ilk basış HER ZAMAN vuruş; basılı kalırsa (vuruş bitince) öndeki sandığa/taşa
  // kanca atılır ve çekilir (ikinci vuruş olmaz); havada 0.15 sn basılı = pogo
  vurIsle(k, yerde, dt) {
    const tut = k.saldir;
    if (k.saldirBas) { this.vurSure = 0; this.vurCek = false; }
    if (tut) this.vurSure = (this.vurSure || 0) + dt;
    let cekBas = false;
    if (tut && !this.vurCek && !this.vurPogo && yerde && !this.cekDurum
      && this.vurSure >= CONFIG.oyuncu.saldiriSure + 0.04 && this.cekHedefBul()) { this.vurCek = true; cekBas = true; }
    if (!tut) this.vurCek = false;
    this.vurPogo = tut && !this.vurCek && (this.vurPogo || (!yerde && this.vurSure >= 0.15));
    if (this.vurPogo) this.saldiriZaman = 0;
    k.cek = k.cek || this.vurCek;
    k.cekBas = k.cekBas || cekBas;
    k.pogo = this.vurPogo;
  },

  // ---- Ana güncelleme ----
  updatePlayer(time, dt) {
    const p = this.player, b = p.body, S = this.durum, F = CONFIG.fizik;
    if (S.olu) return;
    if (p.y > this.dunyaY + 60) { this.oyuncuOl(); return; }   // çukura düştü

    const k = this.girdi();
    this.k = k;
    ['dokunulmaz', 'knock', 'saldiriBekleme', 'pogoSekZaman', 'inisZaman', 'sersemZaman', 'asiliBekle', 'yatayKilit']
      .forEach(a => { if (this[a] > 0) this[a] -= dt; });
    p.setAlpha(this.dokunulmaz > 0 && Math.floor(time / 90) % 2 ? 0.35 : 1);

    const yerde = yerdeMi(b);
    this.vurIsle(k, yerde, dt);
    if (yerde && this.havadaydi && !this.pogoModu) { this.inisZaman = 0.1; this.ses('inis', { volume: 0.5 }); }
    this.havadaydi = !yerde;
    this.coyote = yerde ? 0.09 : this.coyote - dt;
    this.ziplaTampon = k.ziplaBas ? 0.11 : this.ziplaTampon - dt;

    this.sarmasikGuncelle(k, yerde);
    if (this.tirmaniyor) {
      this.pogoModu = this.pogoAktif = false;
      this.cekBirak();
      this.egik = this.tavan = false;
      this.animasyon(yerde);
      return;
    }
    // Kafa tavana çarparsa geri düşer ve kısa süre asılamaz
    if (b.blocked.up || b.touching.up) {
      if (b.velocity.y < 60) b.setVelocityY(60);
      this.ziplarken = false;
      this.asiliBekle = Math.max(this.asiliBekle, 0.35);
    }
    if (this.asilmaGuncelle(k, yerde)) { this.animasyon(yerde); return; }

    this.cekGuncelle(k, yerde, dt);
    const cekiyor = this.cekDurum !== null;
    if (cekiyor) { this.egik = this.tavan = this.itiyor = false; }
    else this.yurumeGuncelle(k, yerde);

    // Zıplama (basılı tut = yüksek, bırak = kısa)
    if (!cekiyor && !this.tavan && this.ziplaTampon > 0 && this.coyote > 0 && this.knock <= 0) {
      b.setVelocityY(F.ziplama);
      this.ziplaTampon = 0; this.coyote = 0; this.ziplarken = true; this.egilKilit = false;
      this.zipSes();
    }
    if (this.ziplarken && !k.zipla && b.velocity.y < -200) { b.setVelocityY(b.velocity.y * 0.5); this.ziplarken = false; }
    if (yerde && b.velocity.y >= 0) this.ziplarken = false;

    // Pogo: havada VUR basılı → her yere seker
    if (!k.pogo || cekiyor) this.pogoAktif = false;
    else if (!yerde) this.pogoAktif = true;
    this.pogoModu = this.pogoAktif;
    if (this.pogoModu && yerde && b.velocity.y >= 0 && this.knock <= 0) this.pogoZipla();

    // Baston vuruşu (yerde ve havada)
    if (k.saldirBas && this.saldiriBekleme <= 0 && !cekiyor && !this.pogoModu) {
      this.ses('bastonSalla');
      this.saldiriZaman = CONFIG.oyuncu.saldiriSure;
      this.saldiriBekleme = CONFIG.oyuncu.saldiriBekleme;
      this.vurulan = new Set();
    }
    if (this.saldiriZaman > 0) { this.saldiriZaman -= dt; this.saldiriVur(); }

    // Dikenler (pogo ile güvenli)
    const pr = new Phaser.Geom.Rectangle(b.x + 2, b.y, b.width - 4, b.height + (this.pogoModu ? 18 : 0));
    const diken = this.dikenRect.find(s => Phaser.Geom.Intersects.RectangleToRectangle(pr, s));
    if (diken) {
      if (this.pogoModu && b.velocity.y > 0) this.pogoZipla();
      else this.oyuncuHasar(diken.centerX);
    }
    this.animasyon(yerde);
  },

  // Yürüme, eğilme (aç/kapa + 1 karelik geçitte otomatik), sandık / taş itme
  yurumeGuncelle(k, yerde) {
    const p = this.player, b = p.body, F = CONFIG.fizik, O = CONFIG.oyuncu;
    const yon = (k.sag ? 1 : 0) - (k.sol ? 1 : 0);
    if (yon) { this.bakis = yon; p.setFlipX(yon < 0); }
    this.tavan = this.egik && this.tavanVar();   // üstü kapalıysa kalkamaz
    const gecit = yon && yerde && this.duvarVar(yon, b.bottom - O.govdeY + 2, O.govdeY - O.govdeEgik - 4)
      && !this.duvarVar(yon, b.bottom - O.govdeEgik + 4, O.govdeEgik - 8);
    this.egik = (yerde && (k.egil || gecit) && !this.pogoModu) || this.tavan;
    let hiz = this.egik ? F.egilYurume : F.yurume;
    this.itiyor = false;
    if (yon && yerde && !this.egik && this.knock <= 0) {
      const s = this.itHedefBul(yon);
      if (s) {
        this.itiyor = true;
        hiz = F.itme;
        if (s.kirTas) this.tasUyandir(s);
        s.body.setVelocityX(s.body.blocked[yon > 0 ? 'right' : 'left'] ? 0 : yon * F.itme);
      }
    }
    // Duvara doğru basarken yatay hız verme (gövde duvara sürtünüp zıplamayı engellemesin)
    if (this.knock <= 0 && !(this.yatayKilit > 0)) b.setVelocityX(yon && this.duvarVar(yon) ? 0 : yon * hiz);
  },

  // Bastonla duvara asılma. Havada düşerken duvara doğru basılı ve baston kancası yandaki taşa değiyorsa takılır
  // (taş gövdenin üstündeyse — alttan kafa girerse — takılmaz). Zıpla → duvardan uzağa sıçrar; ters yön / ↓ / duvar biterse bırakır.
  // Asılı kaldıysa true döner.
  asilmaGuncelle(k, yerde) {
    const p = this.player, b = p.body, F = CONFIG.fizik;
    if (this.asili) {
      const ters = this.asili > 0 ? k.sol : k.sag;
      if (k.ziplaBas) {
        this.asiliBirak();
        this.bakis = -this.asiliSon; p.setFlipX(this.bakis < 0);
        b.setVelocity(this.bakis * F.asiliZipla, F.ziplama);
        this.zipSes();
        this.ziplarken = true; this.ziplaTampon = 0; this.yatayKilit = 0.15;
        return false;
      }
      if (ters || k.asagi || yerde || !this.kancaDuvar(this.asili)) { this.asiliBirak(); return false; }
      b.setVelocity(0, 0);
      return true;
    }
    if (yerde || this.asiliBekle > 0 || b.velocity.y <= 0 || this.knock > 0 || this.pogoModu) return false;
    const y = k.sag && !k.sol ? 1 : (k.sol && !k.sag ? -1 : 0);
    const duvar = y ? this.kancaDuvar(y) : null;
    if (!duvar || !(y > 0 ? duvar.left >= b.right - 1 : duvar.right <= b.left + 1)) return false;
    const dx = Phaser.Math.Clamp(y > 0 ? duvar.left - b.right : duvar.right - b.left, -4, 4);   // taşa yaslan
    p.x += dx; b.position.x += dx;
    this.asili = this.asiliSon = this.bakis = y;
    p.setFlipX(y < 0);
    this.ses('bastonTakil');
    b.setAllowGravity(false).setVelocity(0, 0);
    this.pogoModu = this.pogoAktif = false;
    this.saldiriZaman = 0;
    return true;
  },

  asiliBirak() {
    this.asili = 0;
    this.asiliBekle = 0.25;
    this.player.body.setAllowGravity(true);
  },

  // ---- Çekme / itme ----
  cekGuncelle(k, yerde, dt) {
    const C = CONFIG.cek, b = this.player.body;
    if (this.cekDurum && (!k.cek || !yerde || this.knock > 0 || k.ziplaBas)) this.cekBirak();
    if (!this.cekDurum && k.cekBas && yerde && this.knock <= 0 && this.saldiriZaman <= 0) {
      this.cekDurum = 'uzat';   // baston uzanır; önünde sandık / taş varsa takılır
      this.cekZaman = C.uzatSure;
      this.cekSandik = this.cekHedefBul();
    }
    if (!this.cekDurum) return;
    if (this.cekDurum === 'uzat') {
      b.setVelocityX(0);
      this.cekZaman -= dt;
      if (this.cekZaman > 0) return;
      if (!this.cekSandik || !this.cekSandik.active) { this.cekBirak(); return; }
      this.cekDurum = 'cek';
      if (this.cekSandik.kirTas) this.tasUyandir(this.cekSandik);   // uyuyan taş / kasa fizikle hareket etsin
      this.ses('cekTakil');
      this.cekMesafe = Math.max(0, this.cekBosluk(this.cekSandik));
      return;
    }
    // 'cek': sadece geri yürünür, nesne aynı mesafede peşinden gelir
    const s = this.cekSandik;
    if (!s || !s.active || !(yerdeMi(s.body) || Math.abs(s.body.velocity.y) < 20)) { this.cekBirak(); return; }
    b.setVelocityX((this.bakis > 0 ? k.sol : k.sag) ? -this.bakis * C.hiz : 0);
    const fark = this.cekBosluk(s) - this.cekMesafe;
    if (fark > C.menzil) { this.cekBirak(); return; }
    if (s.kirTas) this.tasUyandir(s);
    s.body.setVelocityX(b.velocity.x - this.bakis * fark * 10);
  },

  cekBirak() {
    if (this.cekSandik && this.cekSandik.active) this.cekSandik.body.setVelocityX(0);
    this.cekDurum = null;
    this.cekSandik = null;
  },

  // Oyuncu ile nesne arasındaki yatay boşluk (bakılan yönde)
  cekBosluk(s) {
    const b = this.player.body;
    return this.bakis > 0 ? s.body.left - b.right : b.left - s.body.right;
  },

  // Hareket ettirilebilir mi (sabit / kırılmakta olan taşlar hariç), aynı zeminde mi
  tasinabilir(s) {
    return s.active && !s.sabit && !s.kiriliyor && Math.abs(s.body.bottom - this.player.body.bottom) <= 10;
  },

  // Bakılan yönde baston menzilindeki en yakın sandık / taş
  cekHedefBul() {
    let en = null, enB = Infinity;
    this.sandiklar.getChildren().forEach(s => {
      if (!this.tasinabilir(s)) return;
      const bosluk = this.cekBosluk(s);
      if (bosluk >= -4 && bosluk <= CONFIG.cek.menzil && bosluk < enB) { en = s; enB = bosluk; }
    });
    return en;
  },

  // Yürünen yönde gövdeye bitişik sandık / taş
  itHedefBul(yon) {
    const b = this.player.body;
    return this.sandiklar.getChildren().find(s => {
      if (!this.tasinabilir(s)) return false;
      const bosluk = yon > 0 ? s.body.left - b.right : b.left - s.body.right;
      return bosluk >= -4 && bosluk <= 2;
    }) || null;
  },

  // Pogo ile üstüne inince: sandık açılır / taş vurulur, oyuncu seker
  sandikTemas(p, s) {
    if (!this.pogoModu || !p.body.touching.down || !s.body.touching.up) return;
    if (s.kirTas) this.tasVur(s); else this.sandikAc(s);
    this.pogoZipla();
  },

  // ---- Baston vuruşu ----
  // Vuruş başına her hedef bir kez; düşmana ya da kırılmaz zemine değerse vuruş sesi (boşluğa değil)
  saldiriVur() {
    const b = this.player.body, U = 30;
    const r = new Phaser.Geom.Rectangle(this.bakis > 0 ? b.right : b.x - U, b.y + 4, U, b.height - 4);
    const kesisir = (g) => Phaser.Geom.Intersects.RectangleToRectangle(r, g);
    const vurSes = () => { if (!this.vurulan.has('ses')) { this.vurulan.add('ses'); this.ses('bastonVur'); } };
    this.dusmanlar.getChildren().forEach(d => {
      if (!d.active || d.oldu || this.vurulan.has(d) || !kesisir(govdeRect(d.body))) return;
      this.vurulan.add(d);
      vurSes();
      this.dusmanHasar(d, 1);
    });
    // Sandık / taş: sadece öndeki tek karoya (ayak hizasındaki ilk kat), en yakındakine — alttakine ya da üsttekine değil
    const on = new Phaser.Geom.Rectangle(this.bakis > 0 ? b.right : b.x - U, b.bottom - 26, U, 22);
    if (this.katiBul(on.x, on.y, on.width, on.height)) vurSes();
    if (!this.vurulan.has('nesne')) {
      let hedef = null, enB = Infinity;
      this.sandiklar.getChildren().forEach(s => {
        if (!s.active || s.kiriliyor || !Phaser.Geom.Intersects.RectangleToRectangle(on, govdeRect(s.body))) return;
        const bosluk = this.bakis > 0 ? s.body.left - b.right : b.left - s.body.right;
        if (bosluk < enB) { hedef = s; enB = bosluk; }
      });
      if (hedef) {
        this.vurulan.add('nesne');
        if (hedef.kirTas) this.tasVur(hedef);
        else if (!hedef.acik) this.sandikAc(hedef);
        else { vurSes(); this.sandikKaydir(hedef, this.bakis); }   // açık sandık: vuruş yönünde 2 karo kayar
      }
    }
    this.mermiler.getChildren().slice().forEach(m => {   // bastonla mermileri boz
      if (kesisir(govdeRect(m.body))) { this.parcala(m.x, m.y, 0xffffff); m.destroy(); }
    });
  },

  pogoZipla() {
    this.sekmeSira = ((this.sekmeSira || 0) % 3) + 1;   // sekme1 → 2 → 3 sırayla
    this.ses('sekme' + this.sekmeSira);
    const F = CONFIG.fizik;
    this.player.body.setVelocityY(this.k && this.k.zipla ? F.pogoYuksek : F.pogo);
    this.ziplarken = false;
    this.coyote = 0;
    this.pogoSekZaman = 3 / 14;   // değme karesi → sekme kareleri → tekrar havada
    this.player.play('pogoSek');
  },

  zipSes() {
    this.zipNo = ((this.zipNo || 0) % 6) + 1;
    this.ses('zipla' + this.zipNo);
  },

  // ---- Sarmaşık ----
  sarmasikBul(b) {
    const r = govdeRect(b);
    return this.sarmasikRect.find(v => Phaser.Geom.Intersects.RectangleToRectangle(r, v));
  },

  // Havada bir sarmaşığa ilk değişte kendiliğinden tutunur. Bir sarmaşıktan atlayınca, ondan çıkana kadar
  // aynı sarmaşığa ancak ↑ ile tutunulur (başka sarmaşığa yine kendiliğinden). Yerde ↑ / ↓ ile tutunulur.
  sarmasikGuncelle(k, yerde) {
    const p = this.player, b = p.body, F = CONFIG.fizik;
    const v = this.sarmasikBul(b);
    if (this.birakilanSarmasik && v !== this.birakilanSarmasik) this.birakilanSarmasik = null;
    if (!this.tirmaniyor) {
      if (!v) return;
      const altindaVar = this.sarmasikRect.some(r => r.contains(b.center.x, b.bottom + 10));
      const kendiligindan = !yerde && !this.pogoModu && this.knock <= 0 && !this.asili && v !== this.birakilanSarmasik;
      if (kendiligindan || k.yukari || (k.asagi && yerde && altindaVar)) {
        this.tirmaniyor = true;
        p.x = v.centerX;
        b.setVelocity(0, 0);
      }
      return;
    }
    if (!v || k.ziplaBasTus || (yerde && k.asagi && !k.yukari)) {
      this.tirmaniyor = false;
      this.birakilanSarmasik = v || null;
      b.setAllowGravity(true);
      if (k.ziplaBasTus) {
        const yon = (k.sag ? 1 : 0) - (k.sol ? 1 : 0);
        if (yon) { this.bakis = yon; p.setFlipX(yon < 0); }
        b.setVelocity(yon * 140, F.ziplama * 0.8);
        this.ziplaTampon = 0;
      } else if (!v && k.yukari) b.setVelocityY(-260);   // tepeden platforma sıçra
      return;
    }
    b.setAllowGravity(false);
    p.x = v.centerX;   // hep sarmaşığın ortasında
    const vy = k.yukari ? -F.sarmasik : (k.asagi ? F.sarmasik : 0);
    b.setVelocity(0, vy);
    this.tirmanSes = (this.tirmanSes || 0) - this.game.loop.delta / 1000;
    if (vy && this.tirmanSes <= 0) { this.tirmanSes = 0.4; this.ses(vy < 0 ? 'tirmanCik' : 'tirmanIn', { volume: 0.5 }); }
  },

  // ---- Hasar, ölüm ----
  oyuncuHasar(kaynakX, miktar = 1) {
    const S = this.durum, p = this.player, b = p.body;
    if (this.dokunulmaz > 0 || S.olu || S.bitti) return;
    // Darbe karesi o anki duruma göre (yerde ayakta → sersem)
    this.hasarAnim = this.asili ? 'h_asili' : this.tirmaniyor ? 'h_tirman' : this.cekDurum ? 'h_cek'
      : this.itiyor ? 'h_it' : this.egik ? 'h_egil' : !yerdeMi(b) ? 'h_hava' : null;
    S.can = Math.max(0, S.can - miktar);
    this.hudGuncelle();
    this.hareketleriBirak();
    if (S.can <= 0) { this.oyuncuOl(); return; }
    this.dokunulmaz = CONFIG.oyuncu.dokunulmaz;
    this.knock = 0.25;
    this.sersemZaman = 0.5;
    b.setVelocity((p.x < kaynakX ? -1 : 1) * 180, -300);
    this.cameras.main.shake(120, 0.004);
  },

  // Tırmanma, çekme, asılma, itme, pogo bırakılır
  hareketleriBirak() {
    if (this.tirmaniyor) this.birakilanSarmasik = this.sarmasikBul(this.player.body) || null;
    this.tirmaniyor = false;
    this.cekBirak();
    if (this.asili) this.asiliBirak();
    this.itiyor = false;
    this.player.body.setAllowGravity(true);
  },

  oyuncuOl() {
    const S = this.durum, p = this.player, b = p.body;
    if (S.olu) return;
    S.olu = true;
    S.can = 0;
    S.yasam--;
    this.hudGuncelle();
    this.hareketleriBirak();
    this.pogoModu = this.pogoAktif = false;
    b.checkCollision.none = true;
    b.setVelocity(0, -420);
    p.setAlpha(1);
    this.ses('olum');
    p.play('olum');   // bir kez oynar, son karesi sabit kalarak aşağı düşer
    this.gorselOlcek(CONFIG.oyuncu.animOlcek.olum);
    this.time.delayedCall(1200, () => (S.yasam <= 0 ? this.oyunBitti() : this.canlan()));
  },

  canlan() {
    const S = this.durum, p = this.player, b = p.body;
    S.olu = false;
    S.can = CONFIG.oyuncu.canMax;
    b.checkCollision.none = false;
    b.setAllowGravity(true);
    b.reset(this.spawn.x, this.spawn.y);
    this.dokunulmaz = 2;
    this.knock = this.sersemZaman = 0;
    this.egik = false;
    p.play('dur');
    this.gorselOlcek(1);
    this.hudGuncelle();
  },

  // ---- Animasyon ve adım sesleri ----
  animasyon(yerde) {
    if (this.durum.olu) return;   // ölüm animasyonu ezilmesin
    const p = this.player, b = p.body;
    let a, durdur = false;
    if (this.sersemZaman > 0 || this.knock > 0) a = this.hasarAnim || 'sersem';
    else if (this.asili) a = 'asili';
    else if (this.tirmaniyor) { a = 'tirman'; durdur = b.velocity.y === 0; }
    else if (this.cekDurum === 'uzat') a = 'uzat';
    else if (this.cekDurum === 'cek') { a = 'cek'; durdur = b.velocity.x === 0; }
    else if (this.saldiriZaman > 0) a = 'vur';
    else if (this.pogoModu && (!yerde || this.pogoSekZaman > 0)) a = this.pogoSekZaman > 0 ? 'pogoSek' : 'pogoHava';
    else if (!yerde && !this.egik) a = b.velocity.y < 0 ? 'zipla' : 'dus';
    else if (this.egik) { a = 'egil'; durdur = Math.abs(b.velocity.x) <= 10; }
    else if (this.inisZaman > 0) a = 'in';
    else if (this.itiyor) { a = 'it'; durdur = Math.abs(b.velocity.x) <= 10; }
    else if (Math.abs(b.velocity.x) > 10) a = 'kos';
    else a = 'dur';
    if (!p.anims.currentAnim || p.anims.currentAnim.key !== a) p.play(a);
    this.adimSesi(a, durdur);
    this.gorselOlcek(CONFIG.oyuncu.animOlcek[a] || 1);
    if (durdur) { if (!p.anims.isPaused) p.anims.pause(); }
    else if (p.anims.isPaused) p.anims.resume();
  },

  // Koşarken / eğilerek yürürken adım sesleri (adim1-3), çekerken / iterken kaydırma sesleri (kaydir1-2), sırayla
  adimSesi(a, durdur) {
    const kaydir = (a === 'cek' || a === 'it') && !durdur;
    const aralik = a === 'kos' ? 0.3 : kaydir ? 0.4 : (a === 'egil' && !durdur) ? 0.45 : 0;
    if (!aralik) { this.adimZaman = 0; return; }
    this.adimZaman = (this.adimZaman || 0) - this.game.loop.delta / 1000;
    if (this.adimZaman > 0) return;
    this.adimZaman = aralik;
    if (kaydir) { this.kaydirNo = ((this.kaydirNo || 0) % 2) + 1; this.ses('kaydir' + this.kaydirNo, { volume: 0.5 }); }
    else { this.adimNo = ((this.adimNo || 0) % 3) + 1; this.ses('adim' + this.adimNo, { volume: 0.35 }); }
  }
});
