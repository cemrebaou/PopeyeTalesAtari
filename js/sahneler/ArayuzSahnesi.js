// Arayüz sahnesi: HUD, dokunmatik tuşlar, tam ekran tuşu, bitiş ekranları.
// Oyun kamerasının yakınlaştırmasından etkilenmez; ekran boyutu / yönü değişince yeniden yerleşir.
// Dokunmatik tuş yerleri (u birimi; pozitif x soldan, negatif x sağdan; y alttan)
const TUSLAR = {
  sol: [70, -70], sag: [175, -70], asagi: [122, -160],          // solda yürü + eğil (aç/kapa)
  zipla: [-70, -70], saldir: [-175, -70], yukari: [-122, -160]  // sağda zıpla + vur + tırman
};

class ArayuzSahnesi extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.oyunS = this.scene.get('Game');
    this.hazir = true;
    this.events.once('shutdown', () => {
      this.hazir = false;
      this.scale.off('resize', this.yerlestir, this);
    });
    this.hud = [];
    this.tamBtn = null;
    this.ekran = null;   // bitiş ekranı
    this.input.keyboard.on('keydown-F', tamEkranDegistir);
    this.surumYazi = this.add.text(0, 0, CONFIG.surum + '  ' + this.oyunS.L.ad, { fontFamily: 'monospace', color: '#ffffff' })
      .setOrigin(0, 1).setAlpha(0.7);
    this.tuslariKur();
    this.yerlestir();
    this.scale.on('resize', this.yerlestir, this);
  }

  // Arayüz tıklama sesi (hareket tuşları hariç)
  tik() { sesCal(this, 'tik'); }

  // Dokunmatik tuşlar (sadece dokunmatik cihazda). Görsel: ui_t_<ad>, basılı ui_tb_<ad>.
  // ▼ (asagi) aç/kapa: bas → eğil (tuş basılı kalır), tekrar bas → kalk; sarmaşıkta basılı tutunca aşağı iner.
  tuslariKur() {
    this.tuslar = [];
    if (!this.sys.game.device.input.touch) return;
    const O = this.oyunS;
    Object.keys(TUSLAR).forEach(ad => {
      const r = this.add.image(0, 0, 'ui_t_' + ad).setInteractive().setAlpha(0.85);
      const bas = (v) => { O.touch[ad] = v; };
      if (ad === 'asagi') {
        r.on('pointerdown', () => { bas(true); if (!O.tirmaniyor) O.egilKilit = !O.egilKilit; });
      } else r.on('pointerdown', () => bas(true));
      r.on('pointerup', () => bas(false)).on('pointerout', () => bas(false));
      this.tuslar.push({ ad, r });
    });
  }

  // Tuş görselleri basılı durumu gösterir (eğilme kilidi dahil)
  update() {
    if (!this.oyunS) return;
    this.tuslar.forEach(({ ad, r }) => {
      const basili = this.oyunS.touch[ad] || (ad === 'asagi' && this.oyunS.egilKilit);
      const key = (basili ? 'ui_tb_' : 'ui_t_') + ad;
      if (r.texture.key !== key) r.setTexture(key).setDisplaySize(this.tusB, this.tusB);
    });
  }

  // Her şeyi ekran boyutuna göre yerleştir (u = arayüz ölçeği, cihaz pikseli)
  yerlestir() {
    const W = this.scale.width, H = this.scale.height;
    const u = DPR * Phaser.Math.Clamp(Math.min(W, H) / DPR / 420, 0.75, 1.4);
    this.u = u;
    this.cameras.main.setSize(W, H);

    // Tam ekran tuşu: koyu zemin + harf görselleriyle yazı
    if (this.tamBtn) this.tamBtn.destroy();
    const ty = harfYazi(this, 'Tam ekran', 13 * u, 'sol');
    const pad = 7 * u, bw = ty.genislik + pad * 2, bh = ty.yukseklik + pad * 2;
    const zemin = this.add.rectangle(0, 0, bw, bh, 0x000000, 0.45).setOrigin(0, 0);
    ty.setPosition(pad, pad);
    this.tamBtn = this.add.container(W - 12 * u - bw, 92 * u, [zemin, ty]);
    zemin.setInteractive({ useHandCursor: true }).on('pointerup', () => { this.tik(); tamEkranDegistir(); });

    this.surumYazi.setFontSize(Math.round(11 * u) + 'px').setPosition(8 * u, H - 6 * u);
    this.tusB = 78 * u;
    this.tuslar.forEach(({ ad, r }) => {
      const [x, y] = TUSLAR[ad];
      r.setPosition(x > 0 ? x * u : W + x * u, H + y * u).setDisplaySize(this.tusB, this.tusB);
    });
    this.guncelle();
    if (this.ekran) this.ekranCiz();
  }

  // HUD: sol üstte kalpler, altında yaşam ve elmas sayacı; sağ üstte puan
  guncelle() {
    if (!this.hazir) return;
    const S = this.oyunS.durum, u = this.u, W = this.scale.width;
    this.hud.forEach(n => n.destroy());
    this.hud = [];
    for (let i = 0; i < CONFIG.oyuncu.canMax; i++) {
      const k = this.add.image((12 + i * 46) * u, 10 * u, i < S.can ? 'ui_kalp' : 'ui_kalpBos').setOrigin(0, 0);
      this.hud.push(k.setScale(30 * u / k.height));
    }
    const yasam = gorselYazi(this, ['ui_sapka', String(Math.max(0, S.yasam))], 20 * u, 26 * u).setPosition(12 * u, 60 * u);
    const elmas = gorselYazi(this, ['ui_elmas', S.elmas + '/' + S.elmasToplam], 20 * u, 26 * u)
      .setPosition(12 * u + yasam.genislik + 18 * u, 60 * u);
    const puan = gorselYazi(this, ['ui_altin', String(S.puan)], 24 * u, 30 * u);
    puan.setPosition(W - 12 * u - puan.genislik, 24 * u);
    this.hud.push(yasam, elmas, puan);
  }

  // Bitiş ekranı (bölüm bitti / oyun bitti); dokununca bölüm yeniden başlar
  bitisEkrani(baslik, alt) {
    this.ekran = { baslik, alt, nesneler: [] };
    this.ekranCiz();
    this.time.delayedCall(800, () => this.input.once('pointerdown', () => { this.tik(); this.oyunS.scene.restart(); }));
  }

  // Taş çerçeveli panel; başlık ve alt yazı harf görselleriyle, panele sığacak şekilde küçülür
  ekranCiz() {
    const E = this.ekran, W = this.scale.width, H = this.scale.height, u = this.u;
    E.nesneler.forEach(n => n.destroy());
    const pw = Math.min(W * 0.86, 760 * u), ph = Math.max(pw * 292 / 1406, 230 * u);
    E.nesneler = [
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55),
      this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(pw, ph)
    ];
    const kur = (olcek) => [harfYazi(this, E.baslik, 26 * u * olcek, 'orta'), harfYazi(this, E.alt, 14 * u * olcek, 'orta')];
    let [b, a] = kur(1);
    const sigdir = Math.min(1, (pw * 0.8) / Math.max(b.genislik, a.genislik), (ph * 0.78) / (b.yukseklik + a.yukseklik + 18 * u));
    if (sigdir < 1) { b.destroy(); a.destroy(); [b, a] = kur(sigdir); }
    const bosluk = 18 * u * sigdir, y0 = H / 2 - (b.yukseklik + bosluk + a.yukseklik) / 2;
    b.setPosition(W / 2 - b.genislik / 2, y0);
    a.setPosition(W / 2 - a.genislik / 2, y0 + b.yukseklik + bosluk);
    E.nesneler.push(b, a);
  }
}
