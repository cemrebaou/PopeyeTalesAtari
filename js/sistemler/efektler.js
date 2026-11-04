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

  bolumBitti() {
    const S = this.durum;
    if (S.bitti) return;
    S.bitti = true;
    this.ses('kazanma');
    this.player.body.setVelocity(0, 0).setAllowGravity(false);
    this.bitisGoster('1. BÖLÜM TAMAMLANDI!',
      'Puan: ' + S.puan + '\nElmas: ' + S.elmas + '/' + S.elmasToplam + '\n\nDokun: tekrar oyna');
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
