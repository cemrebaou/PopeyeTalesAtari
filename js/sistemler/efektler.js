// Dünya içi efektler (uçan yazılar, parçacıklar), puan ve arayüz köprüleri, bölüm sonu.
Object.assign(OyunSahnesi.prototype, {

  ui() {
    const u = this.scene.get('UI');
    return u && u.hazir ? u : null;
  },

  hudGuncelle() {
    const u = this.ui();
    if (u) u.guncelle();
  },

  // Yukarı süzülüp kaybolan yazı (ekran içinde kalır). '+50', '+1' gibi sayılar rakam görselleriyle (ikon: 'ui_kalp' vb.),
  // diğerleri harf görselleriyle.
  popup(x, y, yazi, ikon) {
    const v = this.cameras.main.worldView;
    y = Phaser.Math.Clamp(y, v.y + 30, v.bottom - 30);
    x = Phaser.Math.Clamp(x, v.x + 60, v.right - 60);
    let c;
    if (/^[+\d\/]+$/.test(yazi)) {
      c = gorselYazi(this, ikon ? [yazi, ikon] : [yazi], 13, 16);
      c.setPosition(x - c.genislik / 2, y);
    } else {
      c = harfYazi(this, yazi, 11, 'orta');
      c.setPosition(x - c.genislik / 2, y - c.yukseklik / 2);
    }
    c.setDepth(50);
    this.tweens.add({ targets: c, y: c.y - 40, alpha: 0, duration: 1100, onComplete: () => c.destroy() });
  },

  puanEkle(n, x, y) {
    this.durum.puan += n;
    this.popup(x, y, '+' + n);
    this.hudGuncelle();
  },

  // Küçük kare parçacıklar saçılır
  parcala(x, y, renk) {
    for (let i = 0; i < 8; i++) {
      const r = this.add.rectangle(x, y, 6, 6, renk).setDepth(20);
      this.tweens.add({
        targets: r, x: x + Phaser.Math.Between(-40, 40), y: y + Phaser.Math.Between(-50, 30),
        alpha: 0, duration: 500, onComplete: () => r.destroy()
      });
    }
  },

  // Taş parçaları (assets/nesne/kirParca.png, sağa fırlayan çizimler): yon yönüne yay çizerek uçar, döner, solar
  tasParcala(x, y, tur, adet, yon) {
    const P = ASSETLER.kirParca, r = Math.max(0, KIRTAS.indexOf(tur)), g = CONFIG.fizik.yercekimi * 0.8, R = Phaser.Math;
    for (let i = 0; i < adet; i++) {
      const k = R.Between(0, P.sayi[r] - 1), boy = R.FloatBetween(6, 11) * (0.55 + 0.45 * P.boy[r][k]);
      const x0 = x + R.Between(-6, 6), y0 = y + R.Between(-8, 6);
      const p = this.add.image(x0, y0, 'kirParca', r * P.sutun + k).setDepth(20).setScale(boy / P.huc).setFlipX(yon < 0);
      const vx = yon * R.Between(40, 150) + R.Between(-25, 25), vy = -R.Between(110, 280), don = R.FloatBetween(2, 9) * yon;
      const sure = R.Between(450, 700) / 1000;
      this.tweens.addCounter({ from: 0, to: sure, duration: sure * 1000, onUpdate: tw => {
        const t = tw.getValue();
        p.setPosition(x0 + vx * t, y0 + vy * t + 0.5 * g * t * t).setRotation(don * t).setAlpha(Math.min(1, (sure - t) / (sure * 0.4)));
      }, onComplete: () => p.destroy() });
    }
  },

  bolumBitti() {
    const S = this.durum;
    if (S.bitti) return;
    S.bitti = true;
    this.ses('kazanma');
    this.player.body.setVelocity(0, 0).setAllowGravity(false);
    const no = this.bolumNo, sonraki = no + 1 < BOLUMLER.length;
    this.registry.set('bolum', sonraki ? no + 1 : no);   // dokununca sonraki bölüm açılır
    this.bitisGoster((no + 1) + '. BÖLÜM TAMAMLANDI!',
      'Puan: ' + S.puan + '\nElmas: ' + S.elmas + '/' + S.elmasToplam + '\n\nDokun: ' + (sonraki ? 'sonraki bölüm' : 'tekrar oyna'));
  },

  oyunBitti() {
    this.durum.oyunBitti = true;
    this.ses('tamKaybet');
    this.bitisGoster('OYUN BİTTİ', 'Puan: ' + this.durum.puan + '\n\nDokun: tekrar dene');
  },

  bitisGoster(baslik, alt) {
    const u = this.ui();
    if (u) u.bitisEkrani(baslik, alt);
  }
});
