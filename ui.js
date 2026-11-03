// Arayüz: ayrı sahne (UI) — HUD, dokunmatik tuşlar, tam ekran, bitiş ekranları.
// Oyun kamerasının yakınlaştırmasından etkilenmez; ekran boyutu / yönü değişince yeniden yerleşir.

// Tam ekran aç/kapa; açılınca telefonu yatay konuma kilitler
function tamEkranDegistir() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    const cik = d.exitFullscreen || d.webkitExitFullscreen;
    if (cik) cik.call(d);
    try { screen.orientation.unlock(); } catch (e) {}
    return;
  }
  const iste = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!iste) return;
  // Yatay kilit (Android Chrome; iPhone Safari desteklemez). İlk deneme olmazsa kısa süre sonra bir kez daha.
  const kilitle = () => {
    const o = screen.orientation;
    if (o && o.lock) o.lock('landscape').catch(() => setTimeout(() => o.lock('landscape').catch(() => {}), 400));
    else if (screen.lockOrientation) screen.lockOrientation('landscape');
  };
  const sonuc = iste.call(el, { navigationUI: 'hide' });
  if (sonuc && sonuc.then) sonuc.then(kilitle).catch(() => {});
  else setTimeout(kilitle, 300);
}

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.oyunS = this.scene.get('Game');
    this.hazir = true;
    this.events.once('shutdown', () => {
      this.hazir = false;
      this.scale.off('resize', this.yerlestir, this);
    });

    const st = { fontFamily: 'monospace', color: '#ffffff', stroke: '#000000' };
    this.hudKalp = this.add.text(0, 0, '', { ...st, color: '#ff4d4d' });
    this.hudAlt = this.add.text(0, 0, '', st);
    this.hudPuan = this.add.text(0, 0, '', st).setOrigin(1, 0);
    this.tamBtn = this.add.text(0, 0, '⛶ Tam ekran', { fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#00000088' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerup', tamEkranDegistir);
    this.input.keyboard.on('keydown-F', tamEkranDegistir);
    this.surumYazi = this.add.text(0, 0, CONFIG.surum + '  ' + this.oyunS.L.ad, { fontFamily: 'monospace', color: '#ffffff' })
      .setOrigin(0, 1).setAlpha(0.7);

    // Dokunmatik tuşlar (sadece dokunmatik cihazda)
    this.tuslar = [];
    if (this.sys.game.device.input.touch) {
      [['sol', '◀'], ['sag', '▶'], ['yukari', '▲'], ['zipla', 'ZIPLA'], ['saldir', 'VUR'], ['cek', 'ÇEK'], ['asagi', '▼ POGO']]
        .forEach(([anahtar, yazi]) => {
          const r = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.22).setInteractive();
          const t = this.add.text(0, 0, yazi, { fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5);
          const ac = () => { this.oyunS.touch[anahtar] = true; r.setFillStyle(0xffffff, 0.45); };
          const kapat = () => { this.oyunS.touch[anahtar] = false; r.setFillStyle(0xffffff, 0.22); };
          r.on('pointerdown', ac).on('pointerup', kapat).on('pointerout', kapat);
          this.tuslar.push({ anahtar, r, t });
        });
    }

    this.ekran = null;   // bitiş ekranı
    this.yerlestir();
    this.scale.on('resize', this.yerlestir, this);
    this.guncelle();
  }

  // Her şeyi ekran boyutuna göre yerleştir (u = arayüz ölçeği, cihaz pikseli cinsinden)
  yerlestir() {
    const W = this.scale.width, H = this.scale.height;
    const css = Math.min(W, H) / DPR;
    const u = DPR * Phaser.Math.Clamp(css / 420, 0.75, 1.4);
    this.u = u;
    this.cameras.main.setSize(W, H);
    const yazi = (t, boy, kal) => t.setFontSize(Math.round(boy * u) + 'px').setStroke('#000000', kal * u);
    yazi(this.hudKalp, 22, 4).setPosition(12 * u, 8 * u);
    yazi(this.hudAlt, 18, 4).setPosition(12 * u, 36 * u);
    yazi(this.hudPuan, 20, 4).setPosition(W - 12 * u, 8 * u);
    this.tamBtn.setFontSize(Math.round(14 * u) + 'px').setPadding(6 * u, 4 * u).setPosition(W - 12 * u, 40 * u);
    this.surumYazi.setFontSize(Math.round(11 * u) + 'px').setPosition(8 * u, H - 6 * u);

    const B = 78 * u, yer = {
      sol: [70, -70], sag: [175, -70], yukari: [122, -160],
      zipla: [-70, -70], saldir: [-175, -70], cek: [-280, -70], asagi: [-122, -160]
    };
    this.tuslar.forEach(({ anahtar, r, t }) => {
      const [x, y] = yer[anahtar];
      const px = x > 0 ? x * u : W + x * u, py = H + y * u;
      r.setPosition(px, py).setSize(B, B);
      r.input.hitArea.setTo(0, 0, B, B);
      t.setPosition(px, py).setFontSize(Math.round(15 * u) + 'px');
    });

    if (this.ekran) this.ekranCiz();
  }

  guncelle() {
    if (!this.hazir) return;
    const S = this.oyunS.durum, max = CONFIG.oyuncu.canMax;
    this.hudKalp.setText('♥'.repeat(Math.max(0, S.can)) + '♡'.repeat(Math.max(0, max - S.can)));
    this.hudAlt.setText('◆ ' + S.elmas + '/' + S.elmasToplam + '   Can: ' + S.yasam);
    this.hudPuan.setText('Puan: ' + S.puan);
  }

  // Bitiş ekranı (bölüm bitti / oyun bitti); dokununca bölüm yeniden başlar
  bitisEkrani(baslik, alt) {
    this.ekran = { baslik, alt, nesneler: [] };
    this.ekranCiz();
    this.time.delayedCall(800, () => this.input.once('pointerdown', () => this.oyunS.scene.restart()));
  }

  ekranCiz() {
    const E = this.ekran, W = this.scale.width, H = this.scale.height, u = this.u;
    E.nesneler.forEach(n => n.destroy());
    E.nesneler = [
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65),
      this.add.text(W / 2, H / 2 - 60 * u, E.baslik, {
        fontFamily: 'monospace', fontSize: Math.round(34 * u) + 'px', color: '#ffe14d', stroke: '#000', strokeThickness: 5 * u
      }).setOrigin(0.5),
      this.add.text(W / 2, H / 2 + 30 * u, E.alt, {
        fontFamily: 'monospace', fontSize: Math.round(19 * u) + 'px', color: '#ffffff', align: 'center'
      }).setOrigin(0.5)
    ];
  }
}

// Oyun sahnesinden arayüze köprüler + dünya içi efektler
Object.assign(GameScene.prototype, {

  ui() {
    const u = this.scene.get('UI');
    return u && u.hazir ? u : null;
  },

  hudGuncelle() {
    const u = this.ui();
    if (u) u.guncelle();
  },

  popup(x, y, yazi) {
    const t = this.add.text(x, y, yazi, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffff66', stroke: '#000000', strokeThickness: 3, resolution: 3
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

  bitisGoster(baslik, alt) {
    const u = this.ui();
    if (u) u.bitisEkrani(baslik, alt);
  },

  bolumBitti() {
    const S = this.durum;
    if (S.bitti) return;
    S.bitti = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.bitisGoster('1. BÖLÜM TAMAMLANDI!',
      'Puan: ' + S.puan + '\nElmas: ' + S.elmas + '/' + S.elmasToplam + '\n\nR veya dokun: tekrar oyna');
  },

  oyunBitti() {
    this.durum.oyunBitti = true;
    this.bitisGoster('OYUN BİTTİ', 'Puan: ' + this.durum.puan + '\n\nR veya dokun: tekrar dene');
  }
});
