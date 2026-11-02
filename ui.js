// Arayüz: HUD, dokunmatik tuşlar, yazılar, efektler, bitiş ekranları
Object.assign(GameScene.prototype, {

  createHud() {
    const st = { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.hudKalp = this.add.text(12, 8, '', { ...st, color: '#ff4d4d' }).setScrollFactor(0).setDepth(100);
    this.hudAlt = this.add.text(12, 34, '', st).setScrollFactor(0).setDepth(100);
    this.hudPuan = this.add.text(CONFIG.genislik - 12, 8, '', st).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.add.text(8, CONFIG.yukseklik - 18, CONFIG.surum + '  ' + this.L.ad, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setScrollFactor(0).setDepth(100).setAlpha(0.7);
    this.hudGuncelle();
  },

  hudGuncelle() {
    const S = this.durum, max = CONFIG.oyuncu.canMax;
    this.hudKalp.setText('♥'.repeat(Math.max(0, S.can)) + '♡'.repeat(Math.max(0, max - S.can)));
    this.hudAlt.setText('◆ ' + S.elmas + '/' + S.elmasToplam + '   Can: ' + S.yasam);
    this.hudPuan.setText('Puan: ' + S.puan);
  },

  createTouch() {
    if (!this.sys.game.device.input.touch) return;
    const W = CONFIG.genislik, H = CONFIG.yukseklik;
    const tuslar = [
      ['sol', 70, H - 70, '◀'],
      ['sag', 180, H - 70, '▶'],
      ['yukari', 125, H - 160, '▲'],
      ['zipla', W - 70, H - 70, 'ZIPLA'],
      ['saldir', W - 180, H - 70, 'VUR'],
      ['asagi', W - 125, H - 160, '▼ POGO']
    ];
    tuslar.forEach(([anahtar, x, y, yazi]) => {
      const r = this.add.rectangle(x, y, 84, 84, 0xffffff, 0.25)
        .setScrollFactor(0).setDepth(100).setInteractive();
      this.add.text(x, y, yazi, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(101);
      const ac = () => { this.touch[anahtar] = true; r.setFillStyle(0xffffff, 0.5); };
      const kapat = () => { this.touch[anahtar] = false; r.setFillStyle(0xffffff, 0.25); };
      r.on('pointerdown', ac);
      r.on('pointerup', kapat);
      r.on('pointerout', kapat);
    });
  },

  popup(x, y, yazi) {
    const t = this.add.text(x, y, yazi, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffff66', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  },

  puanEkle(n, x, y) {
    this.durum.puan += n;
    this.popup(x, y, '+' + n);
    this.hudGuncelle();
  },

  parcala(x, y, renk) {
    for (let i = 0; i < 8; i++) {
      const r = this.add.rectangle(x, y, 6, 6, renk).setDepth(20);
      this.tweens.add({
        targets: r,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-50, 30),
        alpha: 0, duration: 500,
        onComplete: () => r.destroy()
      });
    }
  },

  overlay(baslik, alt) {
    const W = CONFIG.genislik, H = CONFIG.yukseklik;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setScrollFactor(0).setDepth(200);
    this.add.text(W / 2, H / 2 - 60, baslik, {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffe14d', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(W / 2, H / 2 + 30, alt, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.time.delayedCall(800, () => this.input.once('pointerdown', () => this.scene.restart()));
  },

  bolumBitti() {
    const S = this.durum;
    if (S.bitti) return;
    S.bitti = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.overlay('1. BÖLÜM TAMAMLANDI!',
      'Puan: ' + S.puan + '\nElmas: ' + S.elmas + '/' + S.elmasToplam + '\n\nR veya dokun: tekrar oyna');
  },

  oyunBitti() {
    this.durum.oyunBitti = true;
    this.overlay('OYUN BİTTİ', 'Puan: ' + this.durum.puan + '\n\nR veya dokun: tekrar dene');
  }
});
