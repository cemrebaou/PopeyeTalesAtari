// v1.08: Dükkan odası. Bölümde L.dukkan.kapi'daki açık kapının önünde yukarı (↑ / W / dokunmatik ▲) basınca oyuncu
// dükkana ışınlanır; dükkandaki kapıda yukarı basınca geri döner. Oda haritanın sağında, dünya dışında bir kamera
// boyunda kapalı alan (13×6 kare, 64 px): solda/sağda duvar, altta zemin, yukarısı koyu arka duvar (tavan çarpışması var).
// Odada kamera sabit, odayı gösterir; çevre ekran oranı ne olursa olsun duvarla dolar.
// Solda satıcı; yanına gelince satış paneli (v1.10). Oyuncu sağdaki kapının önünde belirir.
const DUKKAN = { kare: 64, sut: 13, sat: 6, saticiBoy: 90, nadir: [8000, 9000] };   // v1.09: satıcı %45 (200 → 90)

Object.assign(OyunSahnesi.prototype, {
  dukkanKur() {
    const L = this.L;
    this.dukkanda = false;
    this.kapiKilit = false;
    if (!L.dukkan) return;
    const K = DUKKAN.kare, P = ASSETLER.dukkan.parca, ox = L.genislik + 512, oy = 1024;
    const W = K * DUKKAN.sut, H = K * DUKKAN.sat, zeminY = oy + H - K;
    this.dukkanOda = { x: ox, y: oy, w: W, h: H, zeminY };

    // Bölümdeki kapı (açık)
    const [kx, ky] = L.dukkan.kapi;
    this.boyutla(this.add.image(kx, ky + 2, 'kapiAcik').setOrigin(0.41, 1).setDepth(1.6), 'kapiAcik', { h: 72 });
    this.dukkanKapilar = [{ x: kx, y: ky, hedef: 'ic' }];

    // v1.10: arka duvar koyu ve yukarı doğru sürer; sol/sağ duvarlar ve zemin ekran ne kadar genişse dışarı doğru sürer
    // (kamera odayı ortalar, kenarlarda boşluk görünmez). Tavan görseli yok, çarpışması var.
    const E = K * 12, D = P.duvarOrta, dolgu = (x, y, w, h) =>
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
    for (let r = -12; r < DUKKAN.sat; r++) { koy('duvarSag', 0, r); koy('duvarSol', DUKKAN.sut - 1, r); }   // taş sütunlar odanın içine bakar
    for (let c = 1; c < DUKKAN.sut - 1; c++) koy('zeminOrta', c, DUKKAN.sat - 1);
    const kati = (x, y, w, h) => { const z = this.add.zone(x, y, w, h).setOrigin(0, 0); this.physics.add.existing(z, true); this.solids.add(z); };
    kati(ox, oy, W, K); kati(ox, zeminY, W, K); kati(ox, oy, K, H); kati(ox + W - K, oy, K, H);

    // Satıcı (döngü), sağında oyuncunun belireceği yer, sağda kapı
    const S = ASSETLER.dukkan.satici, ss = DUKKAN.saticiBoy / S.icerikY, sx = ox + K + 24 + S.w * ss / 2;
    this.satici = this.add.sprite(sx, zeminY + 3, 'dk_satici', 0).setOrigin(0.5, S.alt / S.h).setScale(ss).setDepth(1.2);
    this.saticiBekle();
    const ix = ox + W - K - 44;
    this.dukkanGiris = { x: ix, y: zeminY - 2 };   // v1.10: dükkana girince kapının önünde
    this.boyutla(this.add.image(ix, zeminY + 2, 'kapiAcik').setOrigin(0.41, 1).setDepth(1.6), 'kapiAcik', { h: 72 });
    this.dukkanKapilar.push({ x: ix, y: zeminY, hedef: 'dis' });
    this.dukkanPanelKur(sx + S.w * ss / 2 + 16, oy + K + 6, ox + W - K - 8);
  },

  // ---- v1.10 Satış paneli ----
  // Satıcının yanına gelince açılır: üstte bilgi kutusu (ad, açıklama, fiyat, AL), altta simgeler.
  // Solda yetenekler (2×5: itme, çift itme, çekme, çift çekme, çift zıplama / kasa kırma, taş kırma, asılma, duvar zıplama,
  // pogo), sağda kalp (1–5) ve can (1–5) seviyeleri. Sahip olunan: renkli + altın tik · alınabilir: renkli · sırası gelmemiş: sönük.
  dukkanUrunler() {
    const u = [];
    ['itTek', 'itCift', 'cekTek', 'cekCift', 'ciftZipla', 'kasaKir', 'tasKir', 'asilma', 'duvarZipla', 'pogo'].forEach((k, i) =>
      u.push({ k, ikon: k, sut: i % 5, sat: Math.floor(i / 5), blok: 0 }));
    ['kalp', 'can'].forEach((tur, sat) => { for (let n = 1; n <= 5; n++) u.push({ k: tur + n, tur, n, ikon: tur + n, sut: n - 1, sat, blok: 1 }); });
    return u;
  },
  urunBilgi(u) {
    if (u.tur) {
      const sahip = KAYIT[u.tur] >= u.n, acik = KAYIT[u.tur] >= u.n - 1;
      return { ad: (u.tur === 'kalp' ? 'Kalp ' : 'Can ') + u.n + '. seviye', fiyat: DUKKAN_FIYAT.seviye[u.n - 1], sahip, acik,
        aciklama: u.tur === 'kalp' ? 'En fazla kalp sayısı 1 artar.' : 'Yaşam hakkı 1 artar (her bölüm başında da).',
        gerek: (u.tur === 'kalp' ? 'Kalp ' : 'Can ') + (u.n - 1) + '. seviye' };
    }
    const Y = YETENEKLER[u.k];
    return { ad: Y.ad, fiyat: DUKKAN_FIYAT.yetenek, sahip: yetenekVar(u.k), acik: !Y.once || yetenekVar(Y.once), aciklama: Y.aciklama,
      gerek: Y.once ? YETENEKLER[Y.once].ad : '' };
  },

  dukkanPanelKur(x0, y0, x1) {
    const B = 48, ara = 6, blokG = 5 * B + 4 * ara, w = x1 - x0, kutuH = 62;
    const c = this.add.container(0, 0).setDepth(20).setVisible(false).setAlpha(0);
    this.dukkanPanel = { c, x0, y0, w, kutuH, ikonlar: [], secili: null, acik: false };
    const g = this.add.graphics();
    g.fillStyle(0x0b0907, 0.86).fillRoundedRect(x0, y0, w, kutuH, 8).lineStyle(2, 0xd9a441, 1).strokeRoundedRect(x0, y0, w, kutuH, 8);
    c.add(g);
    this.dukkanPanel.bilgi = this.add.container(0, 0); c.add(this.dukkanPanel.bilgi);
    const blokX = [x0, x0 + w - blokG], iy = y0 + kutuH + 8;
    this.dukkanUrunler().forEach(u => {
      const x = blokX[u.blok] + u.sut * (B + ara), y = iy + u.sat * (B + ara);
      const img = this.add.image(x, y, 'dk_ikon', ASSETLER.dukkanIkon.kare[u.ikon]).setOrigin(0, 0).setDisplaySize(B, B)
        .setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.dukkanSec(u));
      const tik = this.add.graphics();
      tik.fillStyle(0xd9a441, 1).fillCircle(x + B - 7, y + 7, 7).lineStyle(2.5, 0x2a1a08, 1)
        .beginPath().moveTo(x + B - 11, y + 7).lineTo(x + B - 8, y + 10).lineTo(x + B - 3, y + 3).strokePath();
      c.add([img, tik]);
      this.dukkanPanel.ikonlar.push({ u, img, tik, x, y });
    });
    this.dukkanPanel.cerceve = this.add.graphics(); c.add(this.dukkanPanel.cerceve);
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
    P.cerceve.clear();
    const s = P.ikonlar.find(i => i.u === P.secili);
    if (s) P.cerceve.lineStyle(3, 0xffe08a, 1).strokeRoundedRect(s.x - 2, s.y - 2, 52, 52, 6);
  },

  dukkanSec(u) {
    if (!this.dukkanPanel.acik) return;
    this.dukkanPanel.secili = u;
    this.dukkanYenile();
    this.dukkanBilgiYaz(u);
  },

  // Bilgi kutusu: seçili ürünün adı, açıklaması, fiyatı ve durumu (AL düğmesi / alındı / önce …)
  dukkanBilgiYaz(u, not) {
    const P = this.dukkanPanel, x0 = P.x0, y0 = P.y0, sag = x0 + P.w - 10;
    P.bilgi.removeAll(true);
    if (!u) {
      P.bilgi.add(harfYazi(this, 'Satın almak için bir simgeye dokun.', 10, 'sol').setPosition(x0 + 12, y0 + 24));
      return;
    }
    const b = this.urunBilgi(u);
    P.bilgi.add(harfYazi(this, b.ad, 11, 'sol').setPosition(x0 + 12, y0 + 8));
    P.bilgi.add(harfYazi(this, b.aciklama, 6.5, 'sol').setPosition(x0 + 12, y0 + 29));
    const fiyat = gorselYazi(this, ['ui_altin', String(b.fiyat)], 10, 13);
    fiyat.setPosition(sag - fiyat.genislik, y0 + 15);
    P.bilgi.add(fiyat);
    let durum;
    if (b.sahip) durum = 'Alındı';
    else if (!b.acik) durum = 'Önce: ' + b.gerek;
    if (durum || not) {
      const y = harfYazi(this, not || durum, 7, 'sol');
      y.setPosition(sag - y.genislik, y0 + 34);
      P.bilgi.add(y);
      return;
    }
    const bw = 64, bh = 20, bx = sag - bw, by = y0 + 32;
    const btn = this.add.graphics();
    btn.fillStyle(0x3d8a2c, 1).fillRoundedRect(bx, by, bw, bh, 5).lineStyle(2, 0xd9a441, 1).strokeRoundedRect(bx, by, bw, bh, 5);
    const yaz = harfYazi(this, 'AL', 9, 'sol');
    yaz.setPosition(bx + (bw - yaz.genislik) / 2, by + 4);
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
    else if (u.tur === 'can') { KAYIT.can++; S.yasam++; }
    else KAYIT.yetenek[u.k] = true;
    KAYIT.puan = S.puan; kayitYaz();
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
    const ac = this.dukkanda && this.player.x < P.x0 + P.w * 0.45;
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
    if (!this.dukkanKapilar) return;
    this.dukkanPanelGuncelle();
    if (this.durum.olu || this.gecisVar) return;
    const K = this.keys, yukari = K.yukari.isDown || K.w.isDown || this.touch.yukari;
    if (!yukari) { this.kapiKilit = false; return; }
    if (this.kapiKilit) return;
    const p = this.player, b = p.body;
    if (!b.blocked.down || this.tirmaniyor) return;
    const k = this.dukkanKapilar.find(k => Math.abs(p.x - k.x) < 26 && Math.abs(b.bottom - k.y) < 20);
    if (!k) return;
    this.kapiKilit = true;
    this.dukkanGec(k.hedef === 'ic');
  },

  dukkanGec(ice) {
    const cam = this.cameras.main, p = this.player, b = p.body;
    this.gecisVar = true;
    this.ses('kapiAcil');
    cam.fadeOut(160, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.dukkanda = ice;
      const L = this.L, O = this.dukkanOda;
      if (ice) {
        this.physics.world.setBounds(0, 0, O.x + O.w, this.dunyaY + 300);
        b.reset(this.dukkanGiris.x, this.dukkanGiris.y);
        this.bakis = -1; p.setFlipX(true);
      } else {
        this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
        b.reset(L.dukkan.kapi[0], L.dukkan.kapi[1] - 2);
        cam.setBounds(0, 0, this.dunyaG, this.dunyaY).startFollow(p, true, 0.12, 0.12).setDeadzone(60, 40);
      }
      b.setVelocity(0, 0);
      this.kameraAyarla();
      if (!ice) cam.centerOn(p.x, p.y);   // takip kaymadan kapının başında başlasın
      cam.fadeIn(160, 0, 0, 0);
      this.gecisVar = false;
    });
  }
});
