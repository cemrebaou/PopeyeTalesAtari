// v1.61: Ayarlar menüsü — oyun ekranındaki dişli tuşuyla açılır, çağıran sahne (Game ya da Yuzme) durur, kapatınca devam eder.
// v1.80: üç satır — 1) ses efektleri / müzik / ambiyans aç-kapa (kapalıyken simge çizgili) + dil bayrağı (dokununca değişir),
// 2) grafik düşük / orta / yüksek (seçili olan parlak), 3) Bölümler: yuvarlak 1–N tuşları. Ulaşılan bölümler açık, gerisi soluk;
// bulunulan bölüm işaretli (dokununca bir şey olmaz); başka açık bölüme dokununca "N. bölüme geçilsin mi?" Evet / Hayır sorulur.
// Ayarlar KAYIT.ayar'da, dil KAYIT.dil'de kalıcı. Panel dokuz parçalı çizilir (çerçeve gerilmeden uzar).
const AYAR_SES = [['sfx', 'ses', 'Efekt'], ['muz', 'muzik', 'Müzik'], ['amb', 'amb', 'Ambiyans']];
const AYAR_GR = ['Düşük', 'Orta', 'Yüksek'];

class AyarSahnesi extends Phaser.Scene {
  constructor() { super('Ayar'); }

  init(veri) { this.geri = veri.geri; this.soru = null; }

  create() {
    this.grBas = ayarAl().gr;   // açılıştaki grafik (çözünürlük değişirse not göster)
    this.ciz();
    this.scale.on('resize', this.ciz, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.ciz, this));
    this.input.keyboard.on('keydown-ESC', () => this.kapat());
  }

  kapat() {
    sesCal(this, 'tik');
    this.scene.resume(this.geri);
    this.scene.stop();
  }

  // Başka bölüme geç: çağıran sahne kapanır, seçilen bölüm baştan açılır
  bolumeGec(i) {
    sesCal(this, 'tik');
    this.registry.set('bolum', i);
    if (this.geri !== 'Game') this.scene.stop(this.geri);
    this.scene.start('Game');
  }

  ciz() {
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height, A = ayarAl();
    const u = DPR * Phaser.Math.Clamp(Math.min(W, H) / DPR / 420, 0.75, 1.4);
    this.cameras.main.setSize(W, H);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0).setInteractive();   // arkaya dokunma geçmesin
    // Panel: ui_ayarPanel dokuz parçalı (köşeler 70 px), en / boy 1,42. İç alan (çerçeve hariç): yatay %8, dikey %13 pay.
    const ORAN = 1.42, pw = Math.min(W * 0.88, 540 * u, (H * 0.8) * ORAN), ph = pw / ORAN;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2 + 16 * u;
    const kaynakW = this.textures.get('ui_ayarPanel').getSourceImage().width, ks = pw / kaynakW;
    this.add.nineslice(px, py, 'ui_ayarPanel', null, pw / ks, ph / ks, 70, 70, 70, 70).setOrigin(0, 0).setScale(ks);
    const ix0 = px + pw * 0.08, ix1 = px + pw * 0.92, iy0 = py + ph * 0.13, iy1 = py + ph * 0.9;
    // Başlık levhası panelin üst kenarında; yazı levhanın iç alanında
    const b = this.textures.get('ui_ayarBaslik').getSourceImage();
    const bw = pw * 0.5, bh = bw * b.height / b.width;
    this.add.image(W / 2, py - bh * 0.28, 'ui_ayarBaslik').setDisplaySize(bw, bh);
    const bt = harfYazi(this, 'Ayarlar', bh * 0.24, 'orta');
    bt.setPosition(W / 2 - bt.genislik / 2, py - bh * 0.28 + bh * 0.08 - bt.yukseklik / 2);
    // Kapat: panelin sağ üstünde, çerçevenin dışında (çerçeveye binmez)
    const kb = 40 * u;
    this.add.image(px + pw - kb / 2, py - kb * 0.65, 'ik_kapat').setDisplaySize(kb, kb).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.kapat());

    const ih = iy1 - iy0, iw = ix1 - ix0;
    const yaziB = Math.min(11 * u, ih * 0.058);
    const B = Math.min(ih * 0.2, iw / 9);
    const satir = (y, ogeler) => {
      const ara = Math.min(iw / ogeler.length, B * 2.1), x0 = (ix0 + ix1) / 2 - ara * (ogeler.length - 1) / 2;
      ogeler.forEach((o, i) => {
        const x = x0 + i * ara;
        if (o.secili) this.add.circle(x, y, B * 0.6, 0xffd36a, 0.35).setStrokeStyle(2 * u, 0xffe9a6, 0.9);
        const img = o.ciz ? o.ciz(x, y) : this.add.image(x, y, o.ikon).setDisplaySize(B, B * (o.oran || 1));
        img.setAlpha(o.soluk ? 0.5 : 1);
        if (o.tik) img.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.soru) o.tik(); });
        if (o.ad) { const t = harfYazi(this, o.ad, yaziB, 'orta'); t.setPosition(x - t.genislik / 2, y + B / 2 + 3 * u); }
      });
    };
    // 1) sesler + dil
    const dil = dilAl(), bayrak = dil === 'tr' ? 'ik_dilTr' : 'ik_dilEn';
    satir(iy0 + ih * 0.14, [
      ...AYAR_SES.map(([k, ik, ad]) => ({
        ikon: 'ik_' + ik + (A[k] ? '' : 'Kapali'), ad,
        tik: () => { A[k] = A[k] ? 0 : 1; kayitYaz(); sesAyarUygula(this.game); sesCal(this, 'tik'); this.ciz(); }
      })),
      { ikon: bayrak, ad: 'Dil',
        tik: () => { KAYIT.dil = DILLER[(DILLER.indexOf(dil) + 1) % DILLER.length]; kayitYaz(); sesCal(this, 'tik'); this.dilUygula(); this.ciz(); } }
    ]);
    // 2) grafik
    satir(iy0 + ih * 0.47, AYAR_GR.map((ad, i) => ({
      ikon: 'ik_gr' + i, ad, secili: A.gr === i, soluk: A.gr !== i,
      tik: () => { A.gr = i; kayitYaz(); sesCal(this, 'tik'); grafikUygula(this.game); this.ciz(); }
    })));
    // 3) bölümler: başlık + yuvarlak numara tuşları
    const simdi = this.registry.get('bolum') || 0, ulasilan = Math.max(KAYIT.sonBolum || 0, simdi);
    const by = iy0 + ih * 0.84, bb = harfYazi(this, 'Bölümler', yaziB * 1.15, 'orta');
    bb.setPosition(W / 2 - bb.genislik / 2, by - B * 0.62 - bb.yukseklik - 2 * u);
    satir(by, BOLUMLER.map((L, i) => {
      const acik = i <= ulasilan;
      return {
        soluk: !acik, secili: i === simdi,
        ciz: (x, y) => {
          const r = B * 0.46, c = this.add.container(x, y);
          c.add(this.add.circle(0, 0, r, acik ? 0x7a4a1c : 0x3a3430).setStrokeStyle(2.5 * u, acik ? 0xffc21a : 0x8a8078));
          const n = harfYazi(this, String(i + 1), r * 0.95, 'orta');
          c.add(n.setPosition(-n.genislik / 2, -n.yukseklik / 2));
          return c.setSize(r * 2.2, r * 2.2);
        },
        tik: acik && i !== simdi ? () => { sesCal(this, 'tik'); this.soru = i; this.ciz(); } : null
      };
    }));
    // Çözünürlük oyun yeniden açılınca değişir (anında değişen: efekt kalitesi)
    if (A.gr !== this.grBas && GR_DPR[A.gr] !== DPR) {
      const n = harfYazi(this, 'Çözünürlük oyun yeniden açılınca değişir', Math.min(10 * u, yaziB), 'orta');
      n.setPosition(W / 2 - n.genislik / 2, py + ph + 6 * u);   // panelin altında
    }
    if (this.soru !== null) this.soruCiz(W, H, u);
  }

  // "N. bölüme geçilsin mi?" — karartma üstünde levha, Evet / Hayır
  soruCiz(W, H, u) {
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0, 0).setInteractive();
    const yazi = harfYazi(this, (this.soru + 1) + '. bölüme geçilsin mi?', 15 * u, 'orta');
    const th = 36 * u, ara = 14 * u, pay = 16 * u;
    const tuslar = [['Evet', () => this.bolumeGec(this.soru)], ['Hayır', () => { sesCal(this, 'tik'); this.soru = null; this.ciz(); }]]
      .map(([ad, fn]) => ({ y: harfYazi(this, ad, 13 * u, 'sol'), fn }));
    const tg = Math.max(...tuslar.map(t => t.y.genislik)) + 2 * pay;
    const kw = Math.max(yazi.genislik, tg * 2 + ara) + 2 * 26 * u, kh = yazi.yukseklik + th + 3 * 18 * u;
    const kx = W / 2 - kw / 2, ky = H / 2 - kh / 2;
    const ks = Math.min(1, kh / 200) * 0.9;   // küçük dokuz parçalı çerçeve (yazılar sonra üste alınır)
    this.add.nineslice(kx - 20 * u, ky - 14 * u, 'ui_ayarPanel', null, (kw + 40 * u) / ks, (kh + 28 * u) / ks, 70, 70, 70, 70).setOrigin(0, 0).setScale(ks);
    yazi.setPosition(W / 2 - yazi.genislik / 2, ky + 18 * u); this.children.bringToTop(yazi);
    tuslar.forEach((t, i) => {
      const x = W / 2 + (i ? ara / 2 : -ara / 2 - tg), y = ky + kh - 18 * u - th;
      ucParca(this, 'ui_tabela', x, y, tg, th);
      t.y.setPosition(x + tg / 2 - t.y.genislik / 2, y + th / 2 - t.y.yukseklik / 2); this.children.bringToTop(t.y);
      this.add.zone(x, y, tg, th).setOrigin(0, 0).setInteractive({ useHandCursor: true }).on('pointerup', t.fn);
    });
  }

  // Dil değişince açık sahnelerin yazıları yeniden çizilir
  dilUygula() {
    const ui = this.scene.get('UI');
    if (ui && ui.sys.isActive() && ui.yerlestir) { try { ui.yerlestir(); } catch (e) { /* bir sonraki açılışta */ } }
  }
}
