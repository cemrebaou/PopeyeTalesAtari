// Düşmanlar, patron, mermiler, toplanabilirler ve sandıklar
Object.assign(GameScene.prototype, {

  // Düşman yaratma. x, y = ayak noktası (piksel). Uçanlarda y = merkez.
  dusmanYarat(e) {
    // Görsel: ASSETLER.dusman[ad] şeridi; ölçek görünür boya göre. Gövde (bw×bh oyun px) ayak çizgisinde, ortalı.
    // ucan: y = merkez (arı, örümcek), diğerleri y = ayak noktası
    const mk = (ad, bw, bh, ucan, y) => {
      const D = ASSETLER.dusman[ad], s = D.boy / (D.ayak - D.ust);
      const oy = ucan ? (D.ust + D.ayak) / 2 : D.ayak;
      const d = this.dusmanlar.create(e.x, y, 'd_' + ad, 0).setOrigin(0.5, oy / D.h).setScale(s);
      d.body.setSize(bw / s, bh / s, false).setOffset((D.w - bw / s) / 2, ucan ? oy - bh / s / 2 : D.ayak - bh / s);
      d.ad = ad;
      return d;
    };
    let d;
    switch (e.tip) {
      case 'boss':
        d = mk('boss', 56, 60, false, e.y);
        d.hp = CONFIG.patron.can;
        d.aktif = false;
        d.durum = 'yuru'; d.durumZaman = 2; d.dokunulmaz = 0; d.yon = -1;
        d.setFlipX(true);
        break;
      case 'gul':
        d = mk('gul', 24, 26, false, e.y); d.hp = 1; d.hiz = 55; break;
      case 'yilan':
        d = mk('yilan', 30, 14, false, e.y); d.hp = 1; d.hiz = 45; break;
      case 'yuvarlak':
        d = mk('yuvarlak', 26, 26, false, e.y); d.hp = 1; d.hiz = 120; break;
      case 'maymun':
        d = mk('maymun', 24, 28, false, e.y); d.hp = 1; d.hiz = 40;
        d.atesBekle = 1 + Math.random(); d.hazir = 0; break;
      case 'kopek':
        d = mk('kopek', 26, 30, false, e.y); d.hp = 2; d.hiz = 40;
        d.atesBekle = 1 + Math.random(); d.hazir = 0; break;
      case 'ari':
        d = mk('ari', 20, 20, true, e.y);
        d.body.setAllowGravity(false);
        d.hp = 1; d.baslangicX = e.x; d.baslangicY = e.y; d.faz = Math.random() * 6; d.kovala = false;
        break;
      case 'orumcek':
        d = mk('orumcek', 22, 22, true, e.tavan + 20);
        d.body.setAllowGravity(false);
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
    this.dusmanAnim(d, { boss: 'yuru', ari: 'uc', orumcek: 'bekle', maymun: 'dur' }[e.tip] || 'yuru');
    if (e.tip === 'boss') d.anims.pause();
    return d;
  },

  // Düşman animasyonu oynat (aynısı oynuyorsa dokunma)
  dusmanAnim(d, k) {
    const key = 'd_' + d.ad + '_' + k;
    if (!d.anims.currentAnim || d.anims.currentAnim.key !== key) d.play(key);
    else if (d.anims.isPaused) d.anims.resume();
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
          this.ipGrafik.lineStyle(1.5, 0xeeeeee, 0.9).lineBetween(d.x, d.tavan, d.x, d.y - ASSETLER.dusman.orumcek.boy * 0.45);
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
        this.mermiAt(d, d.yon);
        d.atesBekle = d.tip === 'kopek' ? 1.8 : 2.4;
      }
      return;
    }
    d.atesBekle -= dt;
    if (menzilde) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      b.setVelocityX(0);
      if (d.atesBekle <= 0) { d.hazir = 0.4; d.play('d_' + d.ad + '_at'); }   // atış hazırlığı (4 kare, 0.4 sn)
      else if (d.tip === 'kopek') { this.dusmanAnim(d, 'yuru'); d.anims.pause(); }   // menzilde bekler
      else this.dusmanAnim(d, 'dur');
    } else {
      this.devriye(d);
      this.dusmanAnim(d, 'yuru');
    }
  },

  mermiAt(d, yon) {
    const kopek = d.tip === 'kopek', ad = kopek ? 'mizrak' : 'atesTopu', M = ASSETLER.dusman[ad];
    const m = this.mermiler.create(d.x + yon * 18, d.y - (kopek ? 18 : 20), ad).setDepth(7);
    m.setDisplaySize(M.gen, M.gen * M.h / M.w);
    m.body.setAllowGravity(false);
    m.body.setSize(M.w * 0.7, M.h * 0.6, true);
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

  // ---- Patron ----
  bossGuncelle(d, dt) {
    const p = this.player, b = d.body;
    if (!d.aktif) {
      if (Math.abs(p.x - d.x) < CONFIG.patron.uyanMesafe && Math.abs(p.y - d.y) < 300 && !this.durum.olu) {
        d.aktif = true;
        this.popup(d.x, d.y - 90, 'PATRON!');
      } else { b.setVelocityX(0); d.anims.pause(); return; }
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
        this.dusmanAnim(d, 'yuru');
        if (d.durumZaman <= 0) { d.durum = 'hazir'; d.durumZaman = 0.6; b.setVelocityX(0); d.setTint(0xffff66); d.play('d_boss_hazir'); }
        break;
      }
      case 'hazir':
        if (d.durumZaman <= 0) {
          d.durum = 'saldir'; d.durumZaman = hizli ? 1.2 : 1.0;
          d.yon = Math.sign(p.x - d.x) || 1;
          d.setFlipX(d.yon < 0);
          d.clearTint();
          d.play('d_boss_atil');
          if (hizli && b.blocked.down) b.setVelocityY(-420);   // yarı canda zıplayarak atılır
        }
        break;
      case 'saldir':
        b.setVelocityX(d.yon * (hizli ? 330 : 280));
        if (d.durumZaman <= 0 || b.blocked.left || b.blocked.right) {
          d.durum = 'dinlen'; d.durumZaman = 1.0; b.setVelocityX(0); d.play('d_boss_dinlen');
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
      this.puanEkle(CONFIG.puan.dusman, d.x, d.y - 34);
      this.dusmanOlum(d);
    } else {
      d.setTint(0xffffff);
      this.time.delayedCall(120, () => d.active && d.clearTint());
    }
    return true;
  },

  // Ölüm: gövde kapanır, parçalanma animasyonu oynar, sonra solup kaybolur
  dusmanOlum(d, bitince) {
    d.clearTint();
    d.body.setVelocity(0, 0);
    d.body.enable = false;
    d.play('d_' + d.ad + '_ol');
    d.once('animationcomplete', () => {
      this.tweens.add({ targets: d, alpha: 0, duration: 300, onComplete: () => { d.destroy(); if (bitince) bitince(); } });
    });
  },

  bossYen(d) {
    d.oldu = true;
    d.aktif = false;
    d.clearTint();
    d.setAlpha(1);
    this.puanEkle(CONFIG.puan.patron, d.x, d.y - 80);
    const x = d.x, y = d.y;
    this.dusmanOlum(d, () => this.cikisAc(x, y));
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
    if (o.tip === 'kizil') {
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
    this.sandikGovde(s);   // açık sandık da aynı kutu: üstüne çıkılır, çekilebilir
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
