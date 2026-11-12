// v1.61: Ayarlar menüsü — oyun ekranındaki dişli tuşuyla açılır, çağıran sahne (Game ya da Yuzme) durur, kapatınca devam eder.
// Ses efektleri / müzik / ambiyans aç-kapa (simgenin kapalı hali çizgili) ve grafik düşük / orta / yüksek (seçili olan parlak).
// Ayarlar KAYIT.ayar'da kalıcı (kayit.js ayarAl / sesAyarUygula). Grafik ayarının etkisi: OYUN.md "Ayarlar".
const AYAR_SES = [['sfx', 'ses', 'Efekt'], ['muz', 'muzik', 'Müzik'], ['amb', 'amb', 'Ambiyans']];
const AYAR_GR = ['Düşük', 'Orta', 'Yüksek'];

class AyarSahnesi extends Phaser.Scene {
  constructor() { super('Ayar'); }

  init(veri) { this.geri = veri.geri; }

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

  ciz() {
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height, A = ayarAl();
    const u = DPR * Phaser.Math.Clamp(Math.min(W, H) / DPR / 420, 0.75, 1.4);
    this.cameras.main.setSize(W, H);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0, 0).setInteractive();   // arkaya dokunma geçmesin
    // Panel: ui_ayarPanel (425×244). İç alan (çerçeve hariç): yatay %8, dikey %15 pay.
    const p = this.textures.get('ui_ayarPanel').getSourceImage();
    const pw = Math.min(W * 0.86, 520 * u, (H * 0.78) * p.width / p.height), ph = pw * p.height / p.width;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2 + 14 * u;
    this.add.image(px, py, 'ui_ayarPanel').setOrigin(0, 0).setDisplaySize(pw, ph);
    const ix0 = px + pw * 0.08, ix1 = px + pw * 0.92, iy0 = py + ph * 0.15, iy1 = py + ph * 0.85;
    // Başlık levhası panelin üst kenarında; yazı levhanın iç alanında
    const b = this.textures.get('ui_ayarBaslik').getSourceImage();
    const bw = pw * 0.56, bh = bw * b.height / b.width;
    this.add.image(W / 2, py - bh * 0.28, 'ui_ayarBaslik').setDisplaySize(bw, bh);
    const bt = harfYazi(this, 'Ayarlar', bh * 0.24, 'orta');
    bt.setPosition(W / 2 - bt.genislik / 2, py - bh * 0.28 + bh * 0.08 - bt.yukseklik / 2);
    // Kapat: panelin sağ üstünde, çerçevenin dışında (çerçeveye binmez)
    const kb = 40 * u;
    this.add.image(px + pw - kb / 2, py - kb * 0.65, 'ik_kapat').setDisplaySize(kb, kb).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.kapat());

    // İçerik: iki satır — sesler, grafik. Simge boyu iç alana sığacak kadar.
    const ih = iy1 - iy0, iw = ix1 - ix0;
    const yaziB = Math.min(12 * u, ih * 0.08);
    const B = Math.min(ih * 0.3, iw / 8);
    const satir = (y, ogeler) => {
      const ara = Math.min(iw / ogeler.length, B * 2.1), x0 = (ix0 + ix1) / 2 - ara * (ogeler.length - 1) / 2;
      ogeler.forEach((o, i) => {
        const x = x0 + i * ara;
        if (o.secili) this.add.circle(x, y, B * 0.6, 0xffd36a, 0.35).setStrokeStyle(2 * u, 0xffe9a6, 0.9);
        const img = this.add.image(x, y, o.ikon).setDisplaySize(B, B).setAlpha(o.soluk ? 0.55 : 1)
          .setInteractive({ useHandCursor: true }).on('pointerup', () => { o.tik(); });
        const t = harfYazi(this, o.ad, yaziB, 'orta');
        t.setPosition(x - t.genislik / 2, y + B / 2 + 3 * u);
        return img;
      });
    };
    const y1 = iy0 + ih * 0.27, y2 = iy0 + ih * 0.72;
    satir(y1, AYAR_SES.map(([k, ik, ad]) => ({
      ikon: 'ik_' + ik + (A[k] ? '' : 'Kapali'), ad,
      tik: () => { A[k] = A[k] ? 0 : 1; kayitYaz(); sesAyarUygula(this.game); sesCal(this, 'tik'); this.ciz(); }
    })));
    satir(y2, AYAR_GR.map((ad, i) => ({
      ikon: 'ik_gr' + i, ad, secili: A.gr === i, soluk: A.gr !== i,
      tik: () => { A.gr = i; kayitYaz(); sesCal(this, 'tik'); grafikUygula(this.game); this.ciz(); }
    })));
    // Çözünürlük oyun yeniden açılınca değişir (anında değişen: efekt kalitesi)
    if (A.gr !== this.grBas && GR_DPR[A.gr] !== DPR) {
      const n = harfYazi(this, 'Çözünürlük oyun yeniden açılınca değişir', Math.min(10 * u, yaziB), 'orta');
      n.setPosition(W / 2 - n.genislik / 2, py + ph + 6 * u);   // panelin altında
    }
  }
}
