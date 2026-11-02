// Düşmanlar, patron, toplanabilirler ve sandıklar
Object.assign(GameScene.prototype, {

  dusmanYarat(e) {
    const T = CONFIG.tile, Z = this.L.zeminSatir;
    const row = e.row !== undefined ? e.row : Z - 1;
    const y = (row + 1) * T;
    let d;

    if (e.tip === 'boss') {
      d = this.dusmanlar.create(e.col * T + 32, y, 'boss').setOrigin(0.5, 1);
      d.body.setSize(56, 60).setOffset(4, 4);
      d.hp = CONFIG.patron.can;
      d.aktif = false;
      d.durum = 'yuru'; d.durumZaman = 2; d.dokunulmaz = 0; d.yon = -1;
    } else if (e.tip === 'walker') {
      d = this.dusmanlar.create(e.col * T + 16, y, 'walker').setOrigin(0.5, 1);
      d.body.setSize(24, 26).setOffset(2, 2);
      d.hp = 1;
    } else if (e.tip === 'jumper') {
      d = this.dusmanlar.create(e.col * T + 16, y, 'jumper').setOrigin(0.5, 1);
      d.body.setSize(24, 26).setOffset(2, 2);
      d.hp = 1; d.zamanlayici = 1 + Math.random();
    } else { // flyer
      d = this.dusmanlar.create(e.col * T + 16, y, 'flyer').setOrigin(0.5, 1);
      d.body.setAllowGravity(false);
      d.hp = 1; d.tabanY = y; d.faz = Math.random() * 6;
    }
    d.tip = e.tip;
    d.oldu = false;
    d.yon = d.yon || 1;
    d.minX = (e.min !== undefined ? e.min : e.col) * T;
    d.maxX = (e.max !== undefined ? e.max : e.col) * T + T;
    d.setDepth(6);
    return d;
  },

  updateDusmanlar(time, dt) {
    const p = this.player;
    this.dusmanlar.getChildren().forEach(d => {
      if (!d.active || d.oldu) return;
      if (d.tip !== 'boss' && Math.abs(d.x - p.x) > 900) return; // uzaktakiler uyuyor
      const b = d.body;
      switch (d.tip) {
        case 'walker':
        case 'jumper': {
          const hiz = d.tip === 'walker' ? 60 : 75;
          if (d.x <= d.minX) d.yon = 1; else if (d.x >= d.maxX) d.yon = -1;
          if (b.blocked.left) d.yon = 1; else if (b.blocked.right) d.yon = -1;
          b.setVelocityX(d.yon * hiz);
          d.setFlipX(d.yon < 0);
          if (d.tip === 'jumper') {
            d.zamanlayici -= dt;
            if (d.zamanlayici <= 0 && (b.blocked.down || b.touching.down)) {
              b.setVelocityY(-430);
              d.zamanlayici = 1.4 + Math.random();
            }
          }
          break;
        }
        case 'flyer':
          if (d.x <= d.minX) d.yon = 1; else if (d.x >= d.maxX) d.yon = -1;
          d.x += d.yon * 70 * dt;
          d.y = d.tabanY + Math.sin(time * 0.003 + d.faz) * 36;
          break;
        case 'boss':
          this.bossGuncelle(d, dt);
          break;
      }
    });
  },

  bossGuncelle(d, dt) {
    const p = this.player, b = d.body;
    if (!d.aktif) {
      if (p.x > CONFIG.patron.tetikCol * CONFIG.tile && !this.durum.olu) {
        d.aktif = true;
        this.arenaKilit();
        this.popup(d.x, d.y - 90, 'PATRON!');
      } else { b.setVelocityX(0); return; }
    }
    if (d.dokunulmaz > 0) {
      d.dokunulmaz -= dt;
      d.setAlpha(Math.floor(d.dokunulmaz * 12) % 2 ? 0.4 : 1);
    } else d.setAlpha(1);

    const hizli = d.hp <= 3;
    d.durumZaman -= dt;
    switch (d.durum) {
      case 'yuru': {
        const yon = Math.sign(p.x - d.x) || 1;
        b.setVelocityX(yon * (hizli ? 110 : 80));
        d.setFlipX(yon < 0);
        if (d.durumZaman <= 0) { d.durum = 'hazir'; d.durumZaman = 0.6; b.setVelocityX(0); d.setTint(0xffff66); }
        break;
      }
      case 'hazir':
        if (d.durumZaman <= 0) {
          d.durum = 'saldir'; d.durumZaman = hizli ? 1.2 : 1.0;
          d.yon = Math.sign(p.x - d.x) || 1;
          d.setFlipX(d.yon < 0);
          d.clearTint();
        }
        break;
      case 'saldir':
        b.setVelocityX(d.yon * (hizli ? 330 : 280));
        if (d.durumZaman <= 0 || b.blocked.left || b.blocked.right) {
          d.durum = 'dinlen'; d.durumZaman = 1.0; b.setVelocityX(0);
        }
        break;
      case 'dinlen':
        if (d.durumZaman <= 0) { d.durum = 'yuru'; d.durumZaman = hizli ? 1.8 : 2.6; }
        break;
    }
  },

  arenaKilit() {
    const T = CONFIG.tile, c = CONFIG.patron.arenaCol;
    const z = this.add.zone(c * T, 0, T, this.dunyaY).setOrigin(0, 0);
    this.physics.add.existing(z, true);
    this.solids.add(z);
    this.cameras.main.setBounds((c + 1) * T, 0, this.dunyaG - (c + 1) * T, this.dunyaY);
  },

  dusmanTemas(p, d) {
    if (!d.active || d.oldu || this.durum.olu) return;
    const b = p.body;
    const ustten = b.velocity.y > 50 && (b.bottom - d.body.top) < 22;
    if (this.pogoModu && ustten) {
      this.dusmanHasar(d, 1);
      this.pogoZipla();
      return;
    }
    if (d.tip === 'boss' && !d.aktif) return;
    this.oyuncuHasar(d.x);
  },

  dusmanHasar(d, n) {
    if (!d.active || d.oldu) return false;
    if (d.tip === 'boss') {
      if (d.dokunulmaz > 0 || !d.aktif) return false;
      d.hp -= n;
      d.dokunulmaz = 1.1;
      this.cameras.main.shake(150, 0.006);
      if (d.hp <= 0) this.bossYen(d);
      return true;
    }
    d.hp -= n;
    if (d.hp <= 0) {
      d.oldu = true;
      const renk = d.tip === 'walker' ? 0xff6fb5 : d.tip === 'jumper' ? 0xff9a1f : 0x9b4dff;
      this.parcala(d.x, d.y - 14, renk);
      this.puanEkle(CONFIG.puan.dusman, d.x, d.y - 34);
      d.disableBody(true, true);
    }
    return true;
  },

  bossYen(d) {
    d.oldu = true;
    d.aktif = false;
    d.clearTint();
    d.body.setVelocity(0, 0);
    d.body.checkCollision.none = true;
    this.puanEkle(CONFIG.puan.patron, d.x, d.y - 80);
    for (let i = 0; i < 4; i++) this.parcala(d.x + (i - 2) * 16, d.y - 30, 0xd62828);
    this.tweens.add({ targets: d, alpha: 0, scale: 1.4, duration: 900, onComplete: () => d.destroy() });
    this.time.delayedCall(900, () => this.cikisAc(d.x));
  },

  cikisAc(bossX) {
    const T = CONFIG.tile, Z = this.L.zeminSatir;
    // Ödül sandığı
    const s = this.sandiklar.create(Phaser.Math.Clamp(bossX, 170 * T, 195 * T), (Z - 1) * T + 16, 'sandik');
    s.odul = 'buyuk'; s.acik = false;
    // Çıkış bayrağı
    this.cikis = this.physics.add.staticImage(this.L.cikisCol * T + 16, Z * T, 'cikis')
      .setOrigin(0.5, 1).refreshBody();
    this.physics.add.overlap(this.player, this.cikis, () => this.bolumBitti());
    this.popup(this.cikis.x, this.cikis.y - 110, 'Çıkışa git →');
  },

  elmasAl(e) {
    if (!e.active) return;
    e.disableBody(true, true);
    this.durum.elmas++;
    this.durum.puan += CONFIG.puan.elmas;
    this.hudGuncelle();
  },

  kalpAl(h) {
    if (!h.active) return;
    h.disableBody(true, true);
    this.kalpVer(h.x, h.y);
  },

  kalpVer(x, y) {
    const S = this.durum;
    if (S.can < CONFIG.oyuncu.canMax) {
      S.can++;
      this.popup(x, y - 20, '+1 ♥');
    } else {
      S.puan += CONFIG.puan.kalpFazla;
      this.popup(x, y - 20, '+' + CONFIG.puan.kalpFazla);
    }
    this.hudGuncelle();
  },

  sandikAc(s) {
    if (s.acik) return;
    s.acik = true;
    s.setTexture('sandikAcik');
    if (s.odul === 'kalp') {
      this.kalpVer(s.x, s.y);
    } else {
      this.durum.puan += CONFIG.puan.buyuk;
      this.popup(s.x, s.y - 20, '+' + CONFIG.puan.buyuk);
      const el = this.add.image(s.x, s.y - 10, 'buyukelmas').setDepth(20);
      this.tweens.add({ targets: el, y: s.y - 60, alpha: 0, duration: 800, onComplete: () => el.destroy() });
    }
    this.hudGuncelle();
  }
});
