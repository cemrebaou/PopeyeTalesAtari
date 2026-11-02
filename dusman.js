// Düşmanlar, patron, bomba, mermiler, toplanabilirler ve sandıklar
Object.assign(GameScene.prototype, {

  // Düşman yaratma. x, y = ayak noktası (piksel). Uçanlarda y = merkez.
  dusmanYarat(e) {
    const mk = (tex, w, h, ox, oy) => {
      const d = this.dusmanlar.create(e.x, e.y, tex).setOrigin(0.5, 1);
      d.body.setSize(w, h).setOffset(ox, oy);
      return d;
    };
    let d;
    switch (e.tip) {
      case 'boss':
        d = mk('boss', 56, 60, 4, 4);
        d.hp = CONFIG.patron.can;
        d.aktif = false;
        d.durum = 'yuru'; d.durumZaman = 2; d.dokunulmaz = 0; d.yon = -1;
        break;
      case 'gul':
        d = mk('walker', 24, 26, 2, 2); d.hp = 1; d.hiz = 55; break;
      case 'yilan':
        d = mk('yilan', 30, 14, 1, 2); d.hp = 1; d.hiz = 45; break;
      case 'yuvarlak':
        d = mk('yuvarlak', 26, 26, 2, 2); d.hp = 1; d.hiz = 120; break;
      case 'maymun':
        d = mk('maymun', 24, 26, 2, 2); d.hp = 1; d.hiz = 40;
        d.atesBekle = 1 + Math.random(); d.hazir = 0; break;
      case 'kopek':
        d = mk('kopek', 26, 28, 2, 2); d.hp = 2; d.hiz = 40;
        d.atesBekle = 1 + Math.random(); d.hazir = 0; break;
      case 'ari':
        d = this.dusmanlar.create(e.x, e.y, 'ari').setOrigin(0.5, 0.5);
        d.body.setSize(20, 20).setOffset(2, 2).setAllowGravity(false);
        d.hp = 1; d.baslangicX = e.x; d.baslangicY = e.y; d.faz = Math.random() * 6; d.kovala = false;
        break;
      case 'orumcek':
        d = this.dusmanlar.create(e.x, e.tavan + 20, 'orumcek').setOrigin(0.5, 0.5);
        d.body.setSize(22, 22).setOffset(2, 2).setAllowGravity(false);
        d.hp = 1; d.tavan = e.tavan; d.ustY = e.tavan + 24; d.altY = Math.max(e.alt, e.tavan + 60);
        d.faz = Math.random() * 6;
        break;
      default:
        return null;
    }
    d.tip = e.tip;
    d.oldu = false;
    d.yon = d.yon || 1;
    d.minX = e.min !== undefined ? e.min : e.x - 80;
    d.maxX = e.max !== undefined ? e.max : e.x + 80;
    d.setDepth(6);
    return d;
  },

  updateDusmanlar(time, dt) {
    const p = this.player;
    this.ipGrafik.clear();
    this.dusmanlar.getChildren().forEach(d => {
      if (!d.active || d.oldu) return;
      if (d.tip !== 'boss' && (Math.abs(d.x - p.x) > 900 || Math.abs(d.y - p.y) > 700)) return; // uzaktakiler uyuyor
      const b = d.body;
      switch (d.tip) {
        case 'gul':
        case 'yilan':
        case 'yuvarlak':
          this.devriye(d);
          break;
        case 'maymun':
        case 'kopek':
          this.atesEden(d, dt);
          break;
        case 'ari': {
          const dx = p.x - d.x, dy = p.y - d.y;
          const mesafe = Math.hypot(dx, dy);
          if (mesafe < 360 && !this.durum.olu) d.kovala = true;
          else if (mesafe > 520) d.kovala = false;
          if (d.kovala) {
            const a = Math.atan2(dy, dx);
            b.setVelocity(Math.cos(a) * 95, Math.sin(a) * 95);
          } else {
            const hx = d.baslangicX + Math.sin(time * 0.0016 + d.faz) * 50;
            const hy = d.baslangicY + Math.sin(time * 0.003 + d.faz) * 24;
            b.setVelocity((hx - d.x) * 2, (hy - d.y) * 2);
          }
          d.setFlipX(b.velocity.x < 0);
          break;
        }
        case 'orumcek': {
          const t = (Math.sin(time * 0.0014 + d.faz) + 1) / 2;
          d.y = d.ustY + (d.altY - d.ustY) * t;
          this.ipGrafik.lineStyle(2, 0xeeeeee, 0.9).lineBetween(d.x, d.tavan, d.x, d.y - 10);
          break;
        }
        case 'boss':
          this.bossGuncelle(d, dt);
          break;
      }
    });
  },

  // Gidip gelen yürüyen düşman (zemin kenarında/duvarda döner)
  devriye(d) {
    const b = d.body;
    if (d.x <= d.minX) d.yon = 1; else if (d.x >= d.maxX) d.yon = -1;
    if (b.blocked.left) d.yon = 1; else if (b.blocked.right) d.yon = -1;
    b.setVelocityX(d.yon * d.hiz);
    d.setFlipX(d.yon < 0);
  },

  // Maymun / mızraklı köpek: oyuncu menzile girince hazırlanır ve fırlatır
  atesEden(d, dt) {
    const p = this.player, b = d.body;
    const dx = p.x - d.x, dy = p.y - d.y;
    const menzilde = Math.abs(dx) < 420 && Math.abs(dy) < 110 && !this.durum.olu;
    if (d.hazir > 0) {
      d.hazir -= dt;
      b.setVelocityX(0);
      if (d.hazir <= 0) {
        d.clearTint();
        this.mermiAt(d, Math.sign(dx) || 1);
        d.atesBekle = d.tip === 'kopek' ? 1.8 : 2.4;
      }
      return;
    }
    d.atesBekle -= dt;
    if (menzilde) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      b.setVelocityX(0);
      if (d.atesBekle <= 0) { d.hazir = 0.4; d.setTint(0xffff66); }
    } else {
      this.devriye(d);
    }
  },

  mermiAt(d, yon) {
    const kopek = d.tip === 'kopek';
    const m = this.mermiler.create(d.x + yon * 18, d.y - 16, kopek ? 'mizrak' : 'atesTopu').setDepth(7);
    m.body.setAllowGravity(false);
    m.setVelocityX(yon * (kopek ? 280 : 210));
    m.setFlipX(yon < 0);
    m.omur = 2.6;
  },

  updateMermiler(dt) {
    this.mermiler.getChildren().slice().forEach(m => {
      m.omur -= dt;
      if (m.omur <= 0) m.destroy();
    });
  },

  // ---- Bomba ----
  bombaAt() {
    const S = this.durum, p = this.player, B = CONFIG.bomba;
    if (S.bomba <= 0 || S.olu || this.bombaBekleme > 0) return;
    S.bomba--;
    this.bombaBekleme = B.bekleme;
    const b = this.bombalar.create(p.x + this.bakis * 14, p.y - 20, 'bomba').setDepth(8);
    b.setBounce(0.35).setDragX(260);
    b.body.setSize(14, 14).setOffset(1, 1);
    b.setVelocity(this.bakis * 230 + p.body.velocity.x * 0.4, -260);
    b.fitil = B.fitil;
    this.hudGuncelle();
  },

  updateBombalar(dt) {
    if (this.bombaBekleme > 0) this.bombaBekleme -= dt;
    this.bombalar.getChildren().slice().forEach(b => {
      if (!b.active) return;
      b.fitil -= dt;
      b.setTint(Math.floor(b.fitil * 8) % 2 ? 0xff5533 : 0xffffff);
      if (b.fitil <= 0) this.bombaPatlat(b);
    });
  },

  bombaPatlat(b) {
    if (!b.active) return;
    const R = CONFIG.bomba.yaricap, x = b.x, y = b.y;
    b.destroy();
    const halka = this.add.circle(x, y, 10, 0xffb020, 0.85).setDepth(30);
    this.tweens.add({ targets: halka, radius: R, alpha: 0, duration: 320, onComplete: () => halka.destroy() });
    this.parcala(x, y, 0xff7a1a);
    this.cameras.main.shake(180, 0.008);
    const yakin = (o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) <= R;
    this.dusmanlar.getChildren().slice().forEach(d => {
      if (d.active && !d.oldu && yakin(d)) this.dusmanHasar(d, 2);
    });
    this.mermiler.getChildren().slice().forEach(m => { if (yakin(m)) m.destroy(); });
    [this.takozlar, this.breakables].forEach(g => {
      g.getChildren().slice().forEach(o => {
        if (!o.active) return;
        const cx = o.x + (o.displayOriginX === 0 ? 16 : 0), cy = o.y + (o.displayOriginY === 0 ? 16 : 0);
        if (Phaser.Math.Distance.Between(x, y, cx, cy) <= R + 20) {
          this.parcala(cx, cy, g === this.takozlar ? 0xd62828 : 0xd9a05b);
          o.destroy();
        }
      });
    });
  },

  // ---- Patron ----
  bossGuncelle(d, dt) {
    const p = this.player, b = d.body;
    if (!d.aktif) {
      if (Math.abs(p.x - d.x) < CONFIG.patron.uyanMesafe && Math.abs(p.y - d.y) < 300 && !this.durum.olu) {
        d.aktif = true;
        this.popup(d.x, d.y - 90, 'PATRON!');
      } else { b.setVelocityX(0); return; }
    }
    if (d.dokunulmaz > 0) {
      d.dokunulmaz -= dt;
      d.setAlpha(Math.floor(d.dokunulmaz * 12) % 2 ? 0.4 : 1);
    } else d.setAlpha(1);

    const hizli = d.hp <= Math.ceil(CONFIG.patron.can / 2);
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
          if (hizli && b.blocked.down) b.setVelocityY(-420);   // yarı canda zıplayarak atılır
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
      d.hp -= n > 1 ? 2 : n;
      d.dokunulmaz = 1.1;
      this.cameras.main.shake(150, 0.006);
      if (d.hp <= 0) this.bossYen(d);
      return true;
    }
    d.hp -= n;
    if (d.hp <= 0) {
      d.oldu = true;
      const renk = { gul: 0xff6fb5, yilan: 0x3fbf3f, yuvarlak: 0xff5fa0, maymun: 0x8b5a2b, kopek: 0xc9a46b, ari: 0xffd400, orumcek: 0x7a3fbf }[d.tip] || 0xffffff;
      this.parcala(d.x, d.y - 14, renk);
      this.puanEkle(CONFIG.puan.dusman, d.x, d.y - 34);
      d.disableBody(true, true);
    } else {
      d.setTint(0xffffff);
      this.time.delayedCall(120, () => d.active && d.clearTint());
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
    this.time.delayedCall(900, () => this.cikisAc(d.x, d.y));
  },

  cikisAc(bossX, bossY) {
    // Ödül sandığı
    this.sandikYarat(bossX, bossY, 'buyuk');
    // Çıkış kapısı açılır
    const k = this.kapi;
    k.setTexture('kapiAcik').setOrigin(0.41, 1);
    this.boyutla(k, 'kapiAcik', { h: 72 });
    this.cikis = this.add.zone(k.x - 20, k.y - 64, 40, 64).setOrigin(0, 0);
    this.physics.add.existing(this.cikis, true);
    this.physics.add.overlap(this.player, this.cikis, () => this.bolumBitti());
    this.popup(k.x, k.y - 100, 'Kapı açıldı!');
  },

  elmasAl(e) {
    if (!e.active) return;
    e.disableBody(true, true);
    this.durum.elmas++;
    this.durum.puan += CONFIG.puan.elmas;
    this.hudGuncelle();
  },

  ozelAl(o) {
    if (!o.active) return;
    o.disableBody(true, true);
    if (o.tip === 'bomba') {
      this.durum.bomba++;
      this.popup(o.x, o.y - 20, '+1 bomba (C)');
    } else if (o.tip === 'kizil') {
      this.puanEkle(CONFIG.puan.kizil, o.x, o.y - 20);
    } else {
      this.puanEkle(CONFIG.puan.buyuk, o.x, o.y - 20);
    }
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
    this.boyutla(s, 'sandikAcik', { w: 42 });
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
