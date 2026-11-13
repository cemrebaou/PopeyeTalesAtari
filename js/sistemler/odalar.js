// v1.37: Odalar — haritanın dışında (sağında, dükkanın yanında), dükkan taşlarıyla örülü kapalı alanlar.
//  • Bonus odası (L.bonus.kapi): gizli bir yerdeki kapalı taş kapı (gizliKapi). Oyuncu yaklaşınca bir kez açılır; ↑ ile girilir.
//    İçeride CONFIG.bonusSure (30 sn) sayar. İki katlı: üst katta açıkta elmas / yakut / sandık, sağ uçta zemindeki deliği kapatan
//    kasa; kırılınca alt kata inilir — orada kasalar, kristaller ve taşla kapatılmış sandık. Toplananlar kalıcı kayda yazılır
//    (bir daha toplanamaz, çeteleye girer). Süre bitince (ya da ölünce) oyuncu kapının önüne atılır, kapı kapanır ve o
//    bölüm oynanışında bir daha açılmaz. v1.40: içerideki her şey alınmışsa sonraki oynanışlarda kapı hiç açılmaz, spiralin
//    ortasında altın tik rozeti durur. Kamera genişliğe oturur, yukarı / aşağı oyuncuyu izler.
//  • Patron arenası (L.patron.kapi): patron açıkta beklemez; kapalı patron kapısı oyuncu yaklaşınca açılır, ↑ ile arenaya
//    ışınlanılır (kamera sabit, odanın tamamı). Patron arenanın sağında bekler, yaklaşınca uyanır. Öldürülünce bölüm biter.
//    2. bölüm patronu Kobra Bekçi (v1.69, dusmanlar.js kobraGuncelle), 4. bölüm patronu Paslı Dev (v1.70, robotGuncelle).
const ODA = { kare: 64, cerceve: 9.6 };

Object.assign(OyunSahnesi.prototype, {
  // Dükkan taşlarıyla sut × sat karelik kapalı oda örer; x: odanın sol kenarı (dünya px), oy: üst kenar
  odaOr(ox, oy, sut, sat, tint) {
    const K = ODA.kare, P = ASSETLER.dukkan.parca, E = Math.round(K * ODA.cerceve);
    const W = K * sut, H = K * sat, zeminY = oy + H - K;
    const D = P.duvarOrta, dolgu = (x, y, w, h) =>
      this.add.tileSprite(x, y, w, h, 'dk_duvarOrta').setOrigin(0, 0).setTileScale(K / D.w, K / D.h);
    dolgu(ox + K, oy - E, W - 2 * K, H - K + E).setTint(tint || 0x3a3232).setDepth(-4);
    dolgu(ox - E, oy - E, E, H + 2 * E).setDepth(1);
    dolgu(ox + W, oy - E, E, H + 2 * E).setDepth(1);
    dolgu(ox, zeminY + K, W, E).setDepth(1);
    const koy = (ad, c, r) => {
      const p = P[ad], s = K / p.w;
      this.add.image(ox + c * K, oy + r * K - p.ust * s, 'dk_' + ad).setOrigin(0, 0)
        .setDisplaySize(K + 1, p.ust ? p.h * s : K + 1).setDepth(1);
    };
    for (let r = -Math.ceil(E / K); r < sat; r++) { koy('duvarSag', 0, r); koy('duvarSol', sut - 1, r); }
    for (let c = 1; c < sut - 1; c++) koy('zeminOrta', c, sat - 1);
    const kati = (x, y, w, h) => { const z = this.add.zone(x, y, w, h).setOrigin(0, 0); this.physics.add.existing(z, true); this.solids.add(z); return z; };
    kati(ox, oy, W, K); kati(ox, zeminY, W, K); kati(ox, oy, K, H); kati(ox + W - K, oy, K, H);
    return { x: ox, y: oy, w: W, h: H, zeminY, K, E, sut, sat, koy, kati };
  },

  // Odaların x'i: dükkan odasının sağından (yoksa haritanın sağından) çerçeve payıyla sırayla
  odaSiradakiX() {
    const K = ODA.kare, E = Math.round(K * ODA.cerceve);
    if (this.sonOdaSag === undefined) this.sonOdaSag = this.dukkanOda ? this.dukkanOda.x + this.dukkanOda.w : this.L.genislik;
    const x = this.sonOdaSag + 2 * E + K;
    return x;
  },

  odalarKur() {
    const L = this.L;
    this.oda = null;
    this.sonOdaSag = undefined;   // sahne yeniden başlayınca sıra sıfırlanır
    if (L.patron) this.arenaKur();
    if (L.bonus) this.bonusKur();
  },

  // Kapı sprite'ı: kapalı / açık görseli aynı genişlikte (nesne3 kapılarında açık ve kapalı boyları farklı olabilir)
  kapiSprite(x, y, kapali, acik, en, odada) {   // odada: oda zemini (bölüm zemin payı yerine 2 px)
    const spr = this.add.image(x, y + (odada ? 2 : this.zeminGomme), kapali).setDepth(1.6);
    const koy = (ad) => { ad = this.tema(ad); const O = this.nesneOlcu(ad); spr.setTexture(ad).setOrigin(O.ox, 1).setDisplaySize(en, en * O.h / O.w); };   // v1.73: tema
    koy(kapali);
    return { spr, kapali, acik, koy };
  },

  // ---- Patron arenası ----
  arenaKur() {
    const L = this.L, K = ODA.kare;
    const ox = this.odaSiradakiX(), oy = 1024;
    const O = this.odaOr(ox, oy, 16, 7, { 1: 0x2e2438, 3: 0x26292e }[this.bolumNo] || 0x3a3232);
    O.tip = 'arena';
    this.sonOdaSag = O.x + O.w;
    this.arena = O;
    O.giris = { x: O.x + K + 40, y: O.zeminY - 2 };
    // Bölümdeki patron kapısı (kapalı; yaklaşınca açılır)
    const [kx, ky] = L.patron.kapi, ad = this.bolumNo === 1 ? 'patron2Kapi' : 'patron1Kapi';
    const k = this.kapiSprite(kx, ky, ad, ad + 'Acik', CONFIG.patronKapiEn * (L.tema ? 1.45 : 1));   // v1.73: metal patron kapısı yatık çizilmiş, geniş konur
    this.dukkanKapilar.push({ x: kx, y: ky, hedef: 'arena', spr: k.spr, kapali: k.kapali, acik: k.acik, koy: k.koy });
    // Patron arenanın sağ yarısında bekler (uyanma: dusmanlar.js bossGuncelle)
    const bx = O.x + O.w - 3 * K, by = O.zeminY;
    this.patronSpr = this.dusmanYarat({ tip: { 1: 'kobra', 3: 'robot' }[this.bolumNo] || 'boss', x: bx, y: by });   // v1.69: 2. bölümde Kobra Bekçi · v1.70: 4. bölümde Paslı Dev
    if (this.patronSpr) this.patronSpr.zeminY = by;
    this.patronBas = { x: bx, y: by, hp: this.patronSpr ? this.patronSpr.hp : CONFIG.patron.can };
    this.events.once('shutdown', () => this.patronMuzikDurdur());
  },

  // v1.43: patron müziği — arenaya girince ve savaş baştan başlayınca en baştan çalar (döngü); yenilince / oyun bitince durur
  patronMuzikBaslat() {
    this.patronMuzikDurdur();
    this.bolumMuzikDurdur();   // v1.79: arenada bölüm müziği susar
    const ad = { 0: 'patron1Muzik', 1: 'patron2Muzik', 3: 'patron3Muzik' }[this.bolumNo];   // bolumNo sıfırdan başlar (0 = 1. bölüm)
    if (ad) this.patronMuzik = muzikBaslat(this, ad, { volume: 0.45 });
  },
  patronMuzikDurdur() { if (this.patronMuzik) { this.patronMuzik.durdur(); this.patronMuzik = null; } },

  // v1.43: arenada ölüp canı kalan oyuncu: ekran kararır, patron canı / yeri / durumu sıfırlanır, oyuncu girişte doğar,
  // müzik baştan başlar, ekran açılır
  arenaBastan() {
    const cam = this.cameras.main;
    this.gecisVar = true;
    cam.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.canlan();
      const d = this.patronSpr, B = this.patronBas;
      if (d && d.active && !d.oldu) {
        d.body.reset(B.x, B.y);
        Object.assign(d, { hp: B.hp, aktif: false, durum: 'yuru', durumZaman: 2, dokunulmaz: 0, yon: -1, sayac: 0 });
        d.setFlipX(!d.kobra && !d.robot).setAlpha(1);   // kobra görseli sola bakar
        d.renk ? d.setTint(d.renk) : d.clearTint();
        d.play('d_' + d.ad + '_yuru'); d.anims.pause();
      }
      this.mermiler.clear(true, true);   // havadaki zehirler
      this.bossSesObj = sesDurdur(this.bossSesObj);
      this.patronMuzikBaslat();
      cam.fadeIn(300, 0, 0, 0);
      this.gecisVar = false;
    });
  },

  // ---- Bonus odası ----
  bonusKur() {
    const L = this.L, K = ODA.kare, T = L.karo;
    const ox = this.odaSiradakiX(), oy = 1024;
    const O = this.odaOr(ox, oy, 13, 13, 0x33302a);
    O.tip = 'bonus';
    this.sonOdaSag = O.x + O.w;
    this.bonusOda = O;
    // Üst kat döşemesi: 6. sıra (64 px kalın), sağ uçta 1 karelik (64 px) delik
    const dR = 6, delikC = 11;
    for (let c = 1; c < 12; c++) if (c !== delikC) O.koy('zeminOrta', c, dR);
    O.kati(O.x + K, O.y + dR * K, (delikC - 1) * K, K);
    const ustZ = O.y + dR * K;        // üst kat zemin üst kenarı (y)
    const altZ = O.zeminY;            // alt kat zemin üst kenarı
    O.giris = { x: O.x + K + 56, y: ustZ - 2 };
    this.kapiSprite(O.x + K + 56, ustZ, 'gizliKapiAcik', 'gizliKapiAcik', CONFIG.gizliKapiEn, true);   // içerideki kapı (açık görünür)
    // İçerik: kimlikler b<n>; kalıcı kayıt (nesneler.js al / toplananSayim bonus sayımı)
    const A = this.kayitB.alinan, icerik = this.bonusIcerik(O);
    this.bonusListe = icerik;
    icerik.forEach((e, i) => {
      const kid = 'b' + i;
      if (e.tur === 'elmas') { if (!A[kid]) this.toplananYarat(this.elmaslar, 'elmas', e.x, e.y).kid = kid; }
      else if (e.tur === 'ozel') { if (!A[kid]) { const o = this.toplananYarat(this.ozeller, ODUL[e.tip].gorsel, e.x, e.y); o.tip = e.tip; o.kid = kid; } }
      else if (e.tur === 'sandik') { const s = this.sandikYarat(e.x, e.y, e.odul); s.kid = kid; if (A[kid]) this.sandikAcikKur(s); }
      else if (e.tur === 'tas') { const s = this.kirTasYarat(e.x, e.y, e.tip, e.sabit); s.kid = kid; if (A[kid]) s.bos = true; }
    });
    // Zemindeki deliği kapatan kasa: sabit, kırılınca aşağı düşer (kimliksiz, sayılmaz)
    this.kirTasYarat(O.x + delikC * K + 16, ustZ - T, 'kasa', 1);
    // Bölümdeki gizli kapı
    const [kx, ky] = L.bonus.kapi;
    const k = this.kapiSprite(kx, ky, 'gizliKapi', 'gizliKapiAcik', CONFIG.gizliKapiEn);
    this.bonusKapi = { x: kx, y: ky, hedef: 'bonus', spr: k.spr, kapali: k.kapali, acik: k.acik, koy: k.koy };
    this.dukkanKapilar.push(this.bonusKapi);
    this.bonusKapali = false;
    this.bonusSure = 0;
    // v1.40: içerideki her şey daha önce alınmışsa kapı açılmaz; spiral kabartmanın ortasında altın tik rozeti
    if (icerik.every((e, i) => A['b' + i])) {
      this.bonusKapali = true;
      const sp = k.spr, sx = 133 / 255, sy = 97 / 185;   // gizliKapi.png içindeki spiral merkezi (oran)
      this.add.image(sp.x + (sx - sp.originX) * sp.displayWidth, sp.y - (1 - sy) * sp.displayHeight, 'ui_rozet')
        .setDisplaySize(CONFIG.gizliKapiEn * 0.2, CONFIG.gizliKapiEn * 0.2).setDepth(1.7);
    }
  },

  // Bonus odasının eşyaları (odaya göre sabit düzen). Konumlar: x orta, y zemin üst kenarı (toplananYarat / sandikYarat / kirTasYarat girdisi)
  bonusIcerik(O) {
    const K = O.K, T = this.L.karo, ustZ = O.y + 6 * K, altZ = O.zeminY, L = [];
    const cx = (c) => O.x + c * T + 16;   // 32'lik sütun (oda içi), sol duvar 2 sütun
    // Üst kat: açıkta
    for (let c = 5; c <= 21; c += 2) L.push({ tur: 'elmas', x: cx(c), y: ustZ - 18 });
    for (let c = 7; c <= 19; c += 6) L.push({ tur: 'elmas', x: cx(c), y: ustZ - 18 - 2 * T });
    L.push({ tur: 'ozel', tip: 'kizil', x: cx(9), y: ustZ - 22 - 3 * T });
    L.push({ tur: 'ozel', tip: 'kizil', x: cx(13), y: ustZ - 22 - 3 * T });
    L.push({ tur: 'ozel', tip: 'kizil', x: cx(17), y: ustZ - 22 - 3 * T });
    L.push({ tur: 'sandik', odul: 'buyuk', x: cx(19), y: ustZ });
    L.push({ tur: 'sandik', odul: 'kizil', x: cx(15), y: ustZ });
    // Alt kat: kırılarak alınır — kasalar (para), kristaller (küçük elmas), taşla kapatılmış sandık
    for (let c = 3; c <= 9; c += 2) L.push({ tur: 'tas', tip: 'kasa', x: cx(c) - 16, y: altZ - T });
    L.push({ tur: 'tas', tip: 'kasa', x: cx(5) - 16, y: altZ - 2 * T });
    L.push({ tur: 'tas', tip: 'kasa', x: cx(7) - 16, y: altZ - 2 * T });
    for (let c = 12; c <= 16; c += 2) L.push({ tur: 'tas', tip: 'kristal', x: cx(c) - 16, y: altZ - T });
    L.push({ tur: 'tas', tip: 'kristal', x: cx(14) - 16, y: altZ - 2 * T });
    L.push({ tur: 'tas', tip: this.bolumNo === 1 ? 'koyu' : 'gri', x: cx(19) - 16, y: altZ - T, sabit: 0 });
    L.push({ tur: 'tas', tip: this.bolumNo === 1 ? 'koyu' : 'gri', x: cx(19) - 16, y: altZ - 2 * T, sabit: 0 });
    L.push({ tur: 'sandik', odul: 'kalp', x: cx(21), y: altZ });
    for (let c = 3; c <= 21; c += 3) L.push({ tur: 'elmas', x: cx(c), y: altZ - 18 - 3 * T });
    L.push({ tur: 'ozel', tip: 'buyuk', x: cx(11), y: altZ - 22 - 4 * T });
    return L;
  },

  // Çetele için bonus odası sayımı: tür → [alınan, toplam]
  bonusSayim() {
    const A = this.kayitB.alinan, s = { elmas: [0, 0], kizil: [0, 0], buyuk: [0, 0], sandik: [0, 0], kasa: [0, 0], kristal: [0, 0] };
    (this.bonusListe || []).forEach((e, i) => {
      const ad = e.tur === 'ozel' ? e.tip : e.tur === 'tas' ? (e.tip === 'kasa' || e.tip === 'kristal' ? e.tip : null) : e.tur;
      if (!ad || !s[ad]) return;
      s[ad][1]++; if (A['b' + i]) s[ad][0]++;
    });
    return s;
  },

  // Odaya giriş / çıkış (dükkan kapı geçişiyle)
  odayaGir(O) {
    this.kapiGecis(() => {
      const b = this.player.body;
      this.oda = O;
      this.physics.world.setBounds(0, 0, O.x + O.w + 100, this.dunyaY + 300);
      b.reset(O.giris.x, O.giris.y);
      this.bakis = 1; this.player.setFlipX(false);
      if (O.tip === 'arena') { this.spawn = { x: O.giris.x, y: O.giris.y }; this.patronMuzikBaslat(); }
      if (O.tip === 'bonus') { this.bonusSure = CONFIG.bonusSure; this.bonusSonSn = -1; }
    });
  },

  // Bonus bitti: dışarı at, kapı kapansın, bu oynanışta açılmasın
  bonusBitir(sessiz) {
    const k = this.bonusKapi;
    if (!k || this.oda !== this.bonusOda) return;
    this.bonusKapali = true;
    this.bonusSure = 0;
    this.ui() && this.ui().sureGoster(null);
    const cik = () => {
      this.oda = null;
      this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
      this.player.body.reset(k.x, k.y - 2);
      k.acikMi = false; k.koy(k.kapali);
    };
    if (sessiz) { cik(); this.kameraAyarla(); return; }
    this.popup(this.player.x, this.player.y - 60, 'Süre doldu!');
    this.kapiGecis(cik);
  },

  odalarGuncelle(dt) {
    if (!this.oda || this.oda.tip !== 'bonus' || this.gecisVar || this.durum.olu) return;
    this.bonusSure -= dt;
    const sn = Math.max(0, Math.ceil(this.bonusSure));
    if (sn !== this.bonusSonSn) {
      this.bonusSonSn = sn;
      this.ui() && this.ui().sureGoster(sn);
      if (sn <= 5 && sn > 0) this.ses('tik');
    }
    if (this.bonusSure <= 0) this.bonusBitir(false);
  }
});
