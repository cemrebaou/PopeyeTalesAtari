// v1.08: Dükkan odası. Bölümde L.dukkan.kapi'daki açık kapının önünde yukarı (↑ / W / dokunmatik ▲) basınca oyuncu
// dükkana ışınlanır; dükkandaki kapıda yukarı basınca geri döner. Oda haritanın sağında, dünya dışında bir kamera
// boyunda kapalı alan (13×6 kare, 64 px): solda/sağda duvar, altta zemin, yukarısı koyu arka duvar (tavan çarpışması var).
// Odada kamera sabit, odayı gösterir; çevre ekran oranı ne olursa olsun duvarla dolar.
// Solda satıcı; yanına gelince satış paneli (v1.10). Oyuncu sağdaki kapının önünde belirir.
const DUKKAN = { kare: 64, cerceve: 9.6, sut: 13, sat: 6, saticiBoy: 90, nadir: [8000, 9000] };   // v1.09: satıcı %45 (200 → 90)

Object.assign(OyunSahnesi.prototype, {
  dukkanKur() {
    const L = this.L;
    this.dukkanda = false;
    this.kapiKilit = false;
    this.dukkanKapilar = [];
    // v1.33: kilitli kapı (nesneler.js anahtarKur): anahtar alınmışsa önünde ↑ → varışa ışınlanır
    if (L.kilitKapi) {
      const [kx, ky, hx, hy] = L.kilitKapi;
      // v1.59: üst kapı bu oyunda anahtar alındıysa açılır; alttaki (varış) kapısı üstten bir kez geçilmeden açılmaz, sonra iki yönlü
      this.dukkanKapilar.push({ x: kx, y: ky, hedef: 'isinla', ust: true, varis: [hx, hy] });
      this.dukkanKapilar.push({ x: hx, y: hy, hedef: 'isinla', ust: false, varis: [kx, ky] });
    }
    if (!L.dukkan) return;
    // v1.14: dış çerçeve (duvar/zemin taşması) %20 küçük (12 → 9.6 kare); oda, çerçevesi oyun alanına girmesin diye
    // bölümün sağ kenarından çerçeve + 1 kare sonra başlar
    const K = DUKKAN.kare, P = ASSETLER.dukkan.parca, E = Math.round(K * DUKKAN.cerceve), ox = L.genislik + E + K, oy = 1024;
    const W = K * DUKKAN.sut, H = K * DUKKAN.sat, zeminY = oy + H - K;
    this.dukkanOda = { x: ox, y: oy, w: W, h: H, zeminY };

    // Bölümdeki kapı (açık)
    const [kx, ky] = L.dukkan.kapi;
    // v1.35: dükkan kapısı kapalı durur, oyuncu önüne gelince açılır
    const dk = this.nesneKoy(this.add.image(kx, ky + this.zeminGomme, 'dukkanKapi').setDepth(1.6), 'dukkanKapi', CONFIG.kapiBoy);
    this.dukkanKapilar.push({ x: kx, y: ky, hedef: 'ic', spr: dk, kapali: 'dukkanKapi', acik: 'dukkanKapiAcik' });

    // v1.10: arka duvar koyu ve yukarı doğru sürer; sol/sağ duvarlar ve zemin ekran ne kadar genişse dışarı doğru sürer
    // (kamera odayı ortalar, kenarlarda boşluk görünmez). Tavan görseli yok, çarpışması var.
    const D = P.duvarOrta, dolgu = (x, y, w, h) =>
      this.add.tileSprite(x, y, w, h, 'dk_duvarOrta').setOrigin(0, 0).setTileScale(K / D.w, K / D.h);
    dolgu(ox + K, oy - E, W - 2 * K, H - K + E).setTint(0x3a3232).setDepth(-4);
    dolgu(ox - E, oy - E, E, H + 2 * E).setDepth(1);
    dolgu(ox + W, oy - E, E, H + 2 * E).setDepth(1);
    dolgu(ox, zeminY + K, W, E).setDepth(1);
    const koy = (ad, c, r) => {
      const p = P[ad], s = K / p.w;
      this.add.image(ox + c * K, oy + r * K - p.ust * s, 'dk_' + ad).setOrigin(0, 0)
        .setDisplaySize(K + 1, p.ust ? p.h * s : K + 1).setDepth(1);
    };
    for (let r = -Math.ceil(E / K); r < DUKKAN.sat; r++) { koy('duvarSag', 0, r); koy('duvarSol', DUKKAN.sut - 1, r); }   // taş sütunlar odanın içine bakar
    for (let c = 1; c < DUKKAN.sut - 1; c++) koy('zeminOrta', c, DUKKAN.sat - 1);
    const kati = (x, y, w, h) => { const z = this.add.zone(x, y, w, h).setOrigin(0, 0); this.physics.add.existing(z, true); this.solids.add(z); };
    kati(ox, oy, W, K); kati(ox, zeminY, W, K); kati(ox, oy, K, H); kati(ox + W - K, oy, K, H);

    // Satıcı (döngü), sağında oyuncunun belireceği yer, sağda kapı
    const S = ASSETLER.dukkan.satici, ss = DUKKAN.saticiBoy / S.icerikY, sx = ox + K + 24 + S.w * ss / 2;
    this.satici = this.add.sprite(sx, zeminY + 3, 'dk_satici', 0).setOrigin(0.5, S.alt / S.h).setScale(ss).setDepth(1.2);
    this.saticiBekle();
    const ix = ox + W - K - 44;
    this.dukkanGiris = { x: ix, y: zeminY - 2 };   // v1.10: dükkana girince kapının önünde
    this.nesneKoy(this.add.image(ix, zeminY + 2, 'dukkanKapiAcik').setDepth(1.6), 'dukkanKapiAcik', CONFIG.kapiBoy);
    this.dukkanKapilar.push({ x: ix, y: zeminY, hedef: 'dis' });
    // v1.49: satış paneli odanın ortasında, tepede
    const pg = 2 * (5 * 44 + 4 * 6) + 48, pmx = ox + W / 2;
    this.dukkanPanelKur(pmx - pg / 2, oy + K + 6, pmx + pg / 2);
  },

  // ---- v1.10 Satış paneli ----
  // Satıcının yanına gelince açılır: üstte bilgi kutusu (ad, açıklama, fiyat, AL), altta simgeler.
  // Solda yetenekler (2×5: itme, çift itme, çekme, çift çekme, çift zıplama / kasa kırma, taş kırma, asılma, duvar zıplama,
  // pogo), sağda kalp (1–5) ve vuruş gücü (1–5, kaslı kol) seviyeleri. Sahip olunan: renkli + altın tik · alınabilir: renkli · sırası gelmemiş: sönük.
  dukkanUrunler() {
    const u = [];
    ['itTek', 'itCift', 'cekTek', 'cekCift', 'ciftZipla', 'kasaKir', 'tasKir', 'asilma', 'duvarZipla', 'pogo'].forEach((k, i) =>
      u.push({ k, ikon: k, sut: i % 5, sat: Math.floor(i / 5), blok: 0 }));
    [['kalp', 'kalp'], ['guc', 'can']].forEach(([tur, ikon], sat) => { for (let n = 1; n <= 5; n++) u.push({ k: tur + n, tur, n, ikon: ikon + n, sut: n - 1, sat, blok: 1 }); });
    return u;
  },
  urunBilgi(u) {
    if (u.tur) {
      const sahip = KAYIT[u.tur] >= u.n, acik = KAYIT[u.tur] >= u.n - 1;
      const ad = u.tur === 'kalp' ? 'Kalp ' : 'Vuruş Gücü ';
      return { ad: ad + u.n + '. seviye', fiyat: (u.tur === 'kalp' ? DUKKAN_FIYAT.seviye : DUKKAN_FIYAT.guc)[u.n - 1], sahip, acik,
        aciklama: u.tur === 'kalp' ? 'En fazla kalp sayısı 1 artar.' : 'Bastonun vuruş gücü ' + ['', '', "2'ye", "3'e", "4'e", "5'e", "6'ya"][u.n + 1] + ' yükselir.',
        gerek: ad + (u.n - 1) + '. seviye' };
    }
    const Y = YETENEKLER[u.k];
    return { ad: Y.ad, fiyat: DUKKAN_FIYAT.yetenek, sahip: yetenekVar(u.k), acik: !Y.once || yetenekVar(Y.once), aciklama: Y.aciklama,
      gerek: Y.once ? YETENEKLER[Y.once].ad : '' };
  },

  dukkanPanelKur(x0, y0, x1) {
    const B = 44, ara = 6, blokG = 5 * B + 4 * ara, w = x1 - x0, kutuH = 66;   // v1.49: simgeler 48 → 44, kutu 66
    const c = this.add.container(0, 0).setDepth(20).setVisible(false).setAlpha(0);
    this.dukkanPanel = { c, x0, y0, w, kutuH, ikonlar: [], secili: null, acik: false };
    c.add(ucParca(this, 'ui_tabela', x0, y0, w, kutuH));   // v1.28: bilgi kutusu tabela görseli
    this.dukkanPanel.bilgi = this.add.container(0, 0); c.add(this.dukkanPanel.bilgi);
    const blokX = [x0, x0 + w - blokG], iy = y0 + kutuH + 8;
    this.dukkanUrunler().forEach(u => {
      const x = blokX[u.blok] + u.sut * (B + ara), y = iy + u.sat * (B + ara);
      const img = this.add.image(x, y, 'dk_ikon', ASSETLER.dukkanIkon.kare[u.ikon]).setOrigin(0, 0).setDisplaySize(B, B)
        .setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.dukkanSec(u));
      const tik = this.add.image(x + B - 7, y + 7, 'ui_rozet').setDisplaySize(16, 16);   // v1.28: alındı rozeti
      c.add([img, tik]);
      this.dukkanPanel.ikonlar.push({ u, img, tik, x, y });
    });
    this.dukkanPanel.cerceve = this.add.image(0, 0, 'ui_secim').setDisplaySize(B + 14, B + 14).setVisible(false); c.add(this.dukkanPanel.cerceve);   // v1.28
    this.dukkanYenile();
    this.dukkanBilgiYaz(null);
  },

  dukkanYenile() {
    const P = this.dukkanPanel;
    if (!P) return;
    P.ikonlar.forEach(({ u, img, tik }) => {
      const b = this.urunBilgi(u);
      tik.setVisible(b.sahip);
      if (b.sahip || b.acik) img.clearTint().setAlpha(1); else img.setTint(0x4a4a4a).setAlpha(0.85);
    });
    const s = P.ikonlar.find(i => i.u === P.secili);
    P.cerceve.setVisible(!!s);
    if (s) { P.cerceve.setPosition(s.x + 22, s.y + 22); P.c.bringToTop(P.cerceve); }
  },

  dukkanSec(u) {
    if (!this.dukkanPanel.acik) return;
    this.dukkanPanel.secili = u;
    this.dukkanYenile();
    this.dukkanBilgiYaz(u);
  },

  // Bilgi kutusu: seçili ürünün adı, açıklaması, fiyatı ve durumu (AL düğmesi / alındı / önce …)
  // v1.49: tüm yazılar tabela çerçevesinin iç alanında kalır (yan pay = kutu yüksekliği × 0.34 + 6, üst/alt pay 9);
  // sığmayan yazı küçülür
  dukkanBilgiYaz(u, not) {
    const P = this.dukkanPanel, H = P.kutuH, pay = H * 0.34 + 6, x0 = P.x0 + pay, sag = P.x0 + P.w - pay, y0 = P.y0 + 9, ih = H - 18;
    P.bilgi.removeAll(true);
    const sigdir = (t, maxW, maxH) => { const k = Math.min(1, maxW / t.genislik, maxH ? maxH / t.yukseklik : 1); if (k < 1) t.setScale(k); t.k = k; return t; };
    if (!u) {
      const t = sigdir(harfYazi(this, 'Satın almak için bir simgeye dokun.', 10, 'sol'), sag - x0, ih);
      P.bilgi.add(t.setPosition(x0, P.y0 + H / 2 - t.yukseklik * t.k / 2));
      return;
    }
    const b = this.urunBilgi(u);
    // sağ sütun: fiyat ve durum / AL
    const fiyat = gorselYazi(this, ['ui_altin', String(b.fiyat)], 10, 13);
    let durum;
    if (b.sahip) durum = 'Alındı';
    else if (!b.acik) durum = 'Önce: ' + b.gerek;
    const bw = 62, bh = 22;
    let sagG = Math.max(fiyat.genislik, bw);
    let dy = null;
    if (durum || not) { dy = harfYazi(this, not || durum, 7, 'sol'); sagG = Math.max(sagG, Math.min(dy.genislik, (sag - x0) * 0.4)); }
    const solSag = sag - sagG - 10;
    // sol: ad ve açıklama
    const ad = sigdir(harfYazi(this, b.ad, 11, 'sol'), solSag - x0, ih * 0.45);
    ad.setPosition(x0, y0);
    const ac = sigdir(harfYazi(this, b.aciklama, 6.5, 'sol'), solSag - x0, ih - ad.yukseklik * ad.k - 3);
    ac.setPosition(x0, y0 + ad.yukseklik * ad.k + 3);
    P.bilgi.add([ad, ac]);
    fiyat.setPosition(sag - fiyat.genislik, y0 + 2);
    P.bilgi.add(fiyat);
    if (dy) {
      sigdir(dy, sagG, ih * 0.45);
      dy.setPosition(sag - dy.genislik * dy.k, y0 + ih - dy.yukseklik * dy.k);
      P.bilgi.add(dy);
      return;
    }
    const bx = sag - bw, by = y0 + ih - bh;
    const btn = this.add.image(bx, by, 'ui_alBtn').setOrigin(0, 0).setDisplaySize(bw, bh);   // v1.28
    const yaz = harfYazi(this, 'AL', 9, 'sol');
    yaz.setPosition(bx + (bw - yaz.genislik) / 2, by + 5);
    const alan = this.add.zone(bx, by, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    alan.on('pointerdown', () => this.dukkanAl(u));
    P.bilgi.add([btn, yaz, alan]);
  },

  dukkanAl(u) {
    const b = this.urunBilgi(u), S = this.durum;
    if (b.sahip || !b.acik || !this.dukkanPanel.acik) return;
    if (S.puan < b.fiyat) {
      this.saticiTepki('para');
      this.dukkanBilgiYaz(u, 'Puan yetmiyor');
      return;
    }
    S.puan -= b.fiyat;
    if (u.tur === 'kalp') { KAYIT.kalp++; S.can = Math.min(S.can + 1, canMaxi()); }
    else if (u.tur === 'guc') KAYIT.guc++;
    else KAYIT.yetenek[u.k] = true;
    KAYIT.puan = S.puan; kayitYaz();
    const ui = this.scene.get('UI'); if (ui && ui.yetenekCiz) ui.yetenekCiz();   // v1.44: yetenekler şeridi yenilensin
    this.ses('yasam');
    this.saticiTepki('basparmak');
    this.hudGuncelle();
    this.dukkanYenile();
    this.dukkanBilgiYaz(u);
  },

  // Oyuncu satıcının yanındayken panel açık (soldan panelin ortasına kadar)
  dukkanPanelGuncelle() {
    const P = this.dukkanPanel;
    if (!P) return;
    const ac = this.dukkanda && this.satici && this.player.x < this.satici.x + 200;   // v1.49: satıcının yanındayken
    if (ac === P.acik) return;
    P.acik = ac;
    this.tweens.killTweensOf(P.c);
    if (ac) { P.c.setVisible(true); this.tweens.add({ targets: P.c, alpha: 1, duration: 200 }); }
    else this.tweens.add({ targets: P.c, alpha: 0, duration: 200, onComplete: () => P.c.setVisible(false) });
  },

  // v1.09: satıcı ana döngüde; 8–9 sn'de bir iki nadir hareketten biri bir kez oynar, sonra ana döngüye döner
  saticiBekle() {
    const s = this.satici;
    if (!s || !s.active) return;
    s.play('dk_satici_bekle');
    if (this.saticiZaman) this.saticiZaman.remove();
    this.saticiZaman = this.time.delayedCall(Phaser.Math.Between(...DUKKAN.nadir), () => this.saticiTepki(Phaser.Utils.Array.GetRandom(['nadir1', 'nadir2'])));
  },
  // Tek seferlik hareket, bitince ana döngü: 'basparmak' (eşya alınca), 'para' (para yetmeyince), 'nadir1' / 'nadir2'
  saticiTepki(ad) {
    const s = this.satici;
    if (!s || !s.active) return;
    if (this.saticiZaman) this.saticiZaman.remove();
    s.play('dk_satici_' + ad);
    s.once('animationcomplete', () => this.saticiBekle());
  },

  // Kapının önünde, yerde, yukarı yeni basıldıysa geçiş. updatePlayer'dan önce çalışır (↑ zıplatmasın diye kilit).
  dukkanGuncelle() {
    if (!this.dukkanKapilar || !this.dukkanKapilar.length) return;
    if (this.dukkanOda) this.dukkanPanelGuncelle();
    this.kapiOkGuncelle();
    if (this.durum.olu || this.gecisVar) return;
    const K = this.keys, yukari = K.yukari.isDown || K.w.isDown || this.touch.yukari;
    if (!yukari) { this.kapiKilit = false; return; }
    if (this.kapiKilit) return;
    const p = this.player, b = p.body;
    if (!b.blocked.down || this.tirmaniyor) return;
    const k = this.dukkanKapilar.find(k => Math.abs(p.x - k.x) < 26 && Math.abs(b.bottom - k.y) < 20);
    if (!k) return;
    this.kapiKilit = true;
    if (k.hedef === 'isinla') {   // v1.33: kilitli kapı
      if (!this.isinlaAcik(k)) { this.popup(k.x, k.y - 90, k.ust ? 'Kilitli. Anahtar gerek.' : 'Kilitli.'); this.ses('tasVur1'); return; }
      if (k.ust && !this.gecitAcik) {   // ilk geçiş: alttaki kapı da açılır
        this.gecitAcik = true;
        this.varisKapi && this.nesneKoy(this.varisKapi, 'kilitKapiAcik', CONFIG.kapiBoy);
      }
      this.kapiGecis(() => {
        b.reset(k.varis[0], k.varis[1] - 2);
        this.spawn = { x: k.varis[0], y: k.varis[1] - 2 };
      });
      return;
    }
    if (k.hedef === 'arena') { this.odayaGir(this.arena); return; }    // v1.37
    if (k.hedef === 'bonus') { if (!this.bonusKapali) this.odayaGir(this.bonusOda); return; }
    this.dukkanGec(k.hedef === 'ic');
  },

  // v1.59: kilitli kapı çifti girilebilir mi — üst: bu oyunda anahtar alındıysa; alt: üstten bu oyunda geçildiyse
  isinlaAcik(k) { return k.ust ? !!this.anahtarBu : !!this.gecitAcik; },

  // v1.35: girilebilir kapının önündeyken üstünde ↑ balonu (kilitli kapıda anahtar alınmışsa); dükkan kapısı yaklaşınca açılır
  kapiOkGuncelle() {
    const p = this.player, b = p.body;
    const yakin = this.dukkanKapilar.find(k => Math.abs(p.x - k.x) < 26 && Math.abs(b.bottom - k.y) < 20
      && (k.hedef !== 'isinla' || this.isinlaAcik(k)) && (k.hedef !== 'bonus' || !this.bonusKapali));
    this.dukkanKapilar.forEach(k => {
      if (!k.spr) return;
      const ac = Math.abs(p.x - k.x) < 70 && Math.abs(b.bottom - k.y) < 60 && !(k.hedef === 'bonus' && this.bonusKapali);
      if (ac === !!k.acikMi) return;
      k.acikMi = ac;
      if (k.koy) k.koy(ac ? k.acik : k.kapali);   // v1.37: oda kapıları (genişlikle boyutlu)
      else this.nesneKoy(k.spr, ac ? k.acik : k.kapali, CONFIG.kapiBoy);
      if (ac && k.hedef !== 'ic') this.ses('kapiAcil');
    });
    if (!this.kapiOk) {
      this.kapiOk = this.add.image(0, 0, 'okBalon').setDepth(20).setVisible(false);
      this.kapiOk.setScale(26 / this.kapiOk.height);
      this.tweens.add({ targets: this.kapiOk, scale: this.kapiOk.scale * 1.12, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const goster = !!yakin && !this.gecisVar;
    this.kapiOk.setVisible(goster);
    if (goster) this.kapiOk.setPosition(yakin.x, yakin.y - CONFIG.kapiBoy - 18);
  },

  // v1.33: ortak kapı geçişi — 'kapiGir' sesiyle karartır, ses bitince ortada() çalışır (oyuncu taşınır), 'kapiCik' sesiyle aydınlanır.
  kapiGecis(ortada) {
    const cam = this.cameras.main, p = this.player, b = p.body;
    this.gecisVar = true;
    b.setVelocity(0, 0); b.moves = false;
    const s = sesBaslat(this, 'kapiGir');
    const d = s && s.duration, sure = (d > 0.25 && d < 3 ? d : 0.77) * 1000;   // ses süresi (okunamazsa 0.77 sn)
    cam.fadeOut(Math.min(200, sure * 0.3), 0, 0, 0);
    this.time.delayedCall(sure, () => {
      ortada();
      b.setVelocity(0, 0); b.moves = true;
      this.inisSessiz = true;   // v1.22: kapıdan çıkınca yere ilk değişte iniş sesi çalmaz
      this.kameraAyarla();
      if (!this.dukkanda && !this.oda) { cam.setBounds(0, 0, this.dunyaG, this.dunyaY).startFollow(p, true, 0.12, 0.12).setDeadzone(60, 40); cam.centerOn(p.x, p.y); }
      cam.fadeIn(200, 0, 0, 0);
      this.ses('kapiCik');
      this.gecisVar = false;
    });
  },

  // v1.19: geçiş — 'kapiGir' (open) sesiyle ekran kararır, ses bitene dek karanlık kalır; biter bitmez yeni ekran
  // (dükkan / oyun) 'kapiCik' (close) sesiyle aydınlanır. Geçiş boyunca oyuncu durur.
  dukkanGec(ice) {
    this.kapiGecis(() => {
      const p = this.player, b = p.body, L = this.L, O = this.dukkanOda;
      this.dukkanda = ice;
      if (ice) {
        this.physics.world.setBounds(0, 0, O.x + O.w, this.dunyaY + 300);
        b.reset(this.dukkanGiris.x, this.dukkanGiris.y);
        this.bakis = -1; p.setFlipX(true);
      } else {
        this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
        b.reset(L.dukkan.kapi[0], L.dukkan.kapi[1] - 2);
      }
    });
  }
});
