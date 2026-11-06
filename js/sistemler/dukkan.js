// v1.08: Dükkan odası. Bölümde L.dukkan.kapi'daki açık kapının önünde yukarı (↑ / W / dokunmatik ▲) basınca oyuncu
// dükkana ışınlanır; dükkandaki kapıda yukarı basınca geri döner. Oda haritanın sağında, dünya dışında bir kamera
// boyunda kapalı alan (13×6 kare, 64 px): üst tavan, solda/sağda duvar, altta zemin. Odada kamera sabit, odayı gösterir.
// Solda satıcı (ileride yetenek satacak), oyuncu onun sağında belirir, kapı sağda.
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

    // Arka duvar (koyulaştırılmış dolgu), çerçeve parçaları, çarpışma
    for (let r = 1; r < DUKKAN.sat - 1; r++) for (let c = 1; c < DUKKAN.sut - 1; c++)
      this.add.image(ox + c * K, oy + r * K, 'dk_duvarOrta').setOrigin(0, 0).setDisplaySize(K + 1, K + 1).setTint(0x6e6e6e).setDepth(-4);
    const koy = (ad, c, r) => {
      const p = P[ad], s = K / p.w;
      this.add.image(ox + c * K, oy + r * K - p.ust * s, 'dk_' + ad).setOrigin(0, 0)
        .setDisplaySize(K + 1, p.ust ? p.h * s : K + 1).setDepth(1);
    };
    for (let c = 0; c < DUKKAN.sut; c++) {
      koy('tavan', c, 0);
      koy(c === 0 ? 'zeminSol' : c === DUKKAN.sut - 1 ? 'zeminSag' : 'zeminOrta', c, DUKKAN.sat - 1);
    }
    for (let r = 1; r < DUKKAN.sat - 1; r++) { koy('duvarSag', 0, r); koy('duvarSol', DUKKAN.sut - 1, r); }   // taş sütunlar odanın içine bakar
    const kati = (x, y, w, h) => { const z = this.add.zone(x, y, w, h).setOrigin(0, 0); this.physics.add.existing(z, true); this.solids.add(z); };
    kati(ox, oy, W, K); kati(ox, zeminY, W, K); kati(ox, oy, K, H); kati(ox + W - K, oy, K, H);

    // Satıcı (döngü), sağında oyuncunun belireceği yer, sağda kapı
    const S = ASSETLER.dukkan.satici, ss = DUKKAN.saticiBoy / S.icerikY, sx = ox + K + 24 + S.w * ss / 2;
    this.satici = this.add.sprite(sx, zeminY + 3, 'dk_satici', 0).setOrigin(0.5, S.alt / S.h).setScale(ss).setDepth(1.2);
    this.saticiBekle();
    this.dukkanGiris = { x: sx + S.w * ss / 2 + 30, y: zeminY - 2 };
    const ix = ox + W - K - 44;
    this.boyutla(this.add.image(ix, zeminY + 2, 'kapiAcik').setOrigin(0.41, 1).setDepth(1.6), 'kapiAcik', { h: 72 });
    this.dukkanKapilar.push({ x: ix, y: zeminY, hedef: 'dis' });
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
    if (!this.dukkanKapilar || this.durum.olu || this.gecisVar) return;
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
