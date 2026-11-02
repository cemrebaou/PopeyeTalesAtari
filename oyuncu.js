// Oyuncu mekanikleri: yürüme, zıplama, POGO, baston, sarmaşık, hasar, ölüm
Object.assign(GameScene.prototype, {

  girdi() {
    const K = this.keys, T = this.touch;
    const ziplaTus = K.zipla.isDown || K.z.isDown || T.zipla;   // sarmaşıktan atlamak için (↑ hariç)
    const zipla = ziplaTus || K.yukari.isDown || K.w.isDown;    // ↑ de zıplatır
    const saldir = K.saldir.isDown || K.k.isDown || T.saldir;
    const bomba = K.bomba.isDown || K.l.isDown || T.bomba;
    const k = {
      sol: K.sol.isDown || K.a.isDown || T.sol,
      sag: K.sag.isDown || K.d.isDown || T.sag,
      yukari: K.yukari.isDown || K.w.isDown || T.yukari,
      asagi: K.asagi.isDown || K.s.isDown || T.asagi,
      zipla, saldir,
      ziplaBas: zipla && !this.oncekiZipla,
      ziplaBasTus: ziplaTus && !this.oncekiZiplaTus,
      saldirBas: saldir && !this.oncekiSaldir,
      bombaBas: bomba && !this.oncekiBomba
    };
    this.oncekiZipla = zipla;
    this.oncekiZiplaTus = ziplaTus;
    this.oncekiSaldir = saldir;
    this.oncekiBomba = bomba;
    return k;
  },

  updatePlayer(time, dt) {
    const p = this.player, b = p.body, S = this.durum, F = CONFIG.fizik;
    if (S.olu) { this.baston.setVisible(false); return; }

    // Çukura düşme
    if (p.y > this.dunyaY + 60) { this.oyuncuOl(); return; }

    const k = this.girdi();
    this.k = k;
    const bant = this.bantItme;   // konveyör bant itmesi (çarpışma adımında ayarlanır)
    this.bantItme = 0;

    if (this.dokunulmaz > 0) this.dokunulmaz -= dt;
    if (this.knock > 0) this.knock -= dt;
    if (this.saldiriBekleme > 0) this.saldiriBekleme -= dt;
    p.setAlpha(this.dokunulmaz > 0 && Math.floor(time / 90) % 2 ? 0.35 : 1);

    const yerde = b.blocked.down || b.touching.down;
    this.coyote = yerde ? 0.09 : this.coyote - dt;
    this.ziplaTampon = k.ziplaBas ? 0.11 : this.ziplaTampon - dt;

    // Sarmaşık
    this.sarmasikGuncelle(k, yerde);
    if (this.tirmaniyor) { this.baston.setVisible(false); this.pogoModu = false; return; }

    // Yürüme
    const yon = (k.sag ? 1 : 0) - (k.sol ? 1 : 0);
    if (yon) { this.bakis = yon; p.setFlipX(yon < 0); }
    if (this.knock <= 0) b.setVelocityX(yon * F.yurume + (yerde ? bant : 0));

    // Zıplama (basılı tut = yüksek, bırak = kısa)
    if (this.ziplaTampon > 0 && this.coyote > 0 && this.knock <= 0) {
      b.setVelocityY(F.ziplama);
      this.ziplaTampon = 0; this.coyote = 0; this.ziplarken = true;
    }
    if (this.ziplarken && !k.zipla && b.velocity.y < -180) {
      b.setVelocityY(b.velocity.y * 0.5);
      this.ziplarken = false;
    }
    if (yerde && b.velocity.y >= 0) this.ziplarken = false;

    // POGO: aşağı basılı tutunca baston çıkar; havada düşmana/dikene, yerde zemine zıplar
    this.pogoModu = k.asagi;
    if (this.pogoModu && yerde && b.velocity.y >= 0 && this.knock <= 0) this.pogoZipla();

    // Bomba at (C / L)
    if (k.bombaBas) this.bombaAt();

    // Baston salla (X)
    if (k.saldirBas && this.saldiriBekleme <= 0) {
      this.saldiriZaman = CONFIG.oyuncu.saldiriSure;
      this.saldiriBekleme = CONFIG.oyuncu.saldiriBekleme;
      this.vurulan = new Set();
    }
    if (this.saldiriZaman > 0) {
      this.saldiriZaman -= dt;
      this.saldiriVur();
    }

    // Baston görseli
    if (this.saldiriZaman > 0) {
      this.baston.setVisible(true).setAngle(this.bakis > 0 ? -90 : 90).setPosition(p.x, p.y - 12);
    } else if (this.pogoModu) {
      this.baston.setVisible(true).setAngle(0).setPosition(p.x, p.y - 4);
    } else {
      this.baston.setVisible(false);
    }

    // Dikenler (pogo ile güvenli)
    const ext = this.pogoModu ? 18 : 0;
    const pr = new Phaser.Geom.Rectangle(b.x + 2, b.y, b.width - 4, b.height + ext);
    for (const s of this.spikeRects) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, s)) {
        if (this.pogoModu && b.velocity.y > 0) this.pogoZipla();
        else this.oyuncuHasar(s.centerX);
        break;
      }
    }
  },

  pogoZipla() {
    const F = CONFIG.fizik;
    this.player.body.setVelocityY(this.k && this.k.zipla ? F.pogoYuksek : F.pogo);
    this.ziplarken = false;
    this.coyote = 0;
  },

  govdeRect(body) {
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  },

  saldiriVur() {
    const b = this.player.body;
    const r = new Phaser.Geom.Rectangle(this.bakis > 0 ? b.right : b.x - 36, b.y, 36, b.height);
    this.dusmanlar.getChildren().forEach(d => {
      if (!d.active || d.oldu || this.vurulan.has(d)) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, this.govdeRect(d.body))) {
        this.vurulan.add(d);
        this.dusmanHasar(d, 1);
      }
    });
    this.breakables.getChildren().slice().forEach(bl => {
      if (!bl.active) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, new Phaser.Geom.Rectangle(bl.x, bl.y, 32, 32))) {
        this.blokKir(bl);
      }
    });
    // Bastonla mermileri boz
    this.mermiler.getChildren().slice().forEach(m => {
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, this.govdeRect(m.body))) {
        this.parcala(m.x, m.y, 0xffffff);
        m.destroy();
      }
    });
  },

  kirilirTemas(p, bl) {
    // Pogo ile üstüne inince blok kırılır ve oyuncu seker
    if (this.pogoModu && p.body.touching.down && bl.active) {
      this.blokKir(bl);
      this.pogoZipla();
    }
  },

  blokKir(bl) {
    this.parcala(bl.x + 16, bl.y + 16, 0xd9a05b);
    bl.disableBody(true, true);
  },

  sarmasikBul(b) {
    const r = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    return this.vineRects.find(v => Phaser.Geom.Intersects.RectangleToRectangle(r, v));
  },

  sarmasikGuncelle(k, yerde) {
    const p = this.player, b = p.body, F = CONFIG.fizik;
    if (!this.tirmaniyor) {
      const v = this.sarmasikBul(b);
      if (!v) return;
      const altindaVar = this.vineRects.some(r => r.contains(b.center.x, b.bottom + 10));
      if (k.yukari || (k.asagi && yerde && altindaVar)) {
        this.tirmaniyor = true;
        p.x = v.centerX;
        b.setVelocity(0, 0);
      }
      return;
    }
    const v = this.sarmasikBul(b);
    if (!v || k.ziplaBasTus || (yerde && k.asagi && !k.yukari)) {
      this.tirmaniyor = false;
      b.setAllowGravity(true);
      if (k.ziplaBasTus) {
        b.setVelocity(((k.sag ? 1 : 0) - (k.sol ? 1 : 0)) * 140, F.ziplama * 0.8);
        this.ziplaTampon = 0;
      } else if (!v && k.yukari) {
        b.setVelocityY(-260);   // sarmaşığın tepesinden platforma sıçra
      }
    } else {
      b.setAllowGravity(false);
      b.setVelocity(0, k.yukari ? -F.sarmasik : (k.asagi ? F.sarmasik : 0));
    }
  },

  oyuncuHasar(kaynakX) {
    const S = this.durum, p = this.player, b = p.body;
    if (this.dokunulmaz > 0 || S.olu || S.bitti) return;
    S.can--;
    this.hudGuncelle();
    this.tirmaniyor = false;
    b.setAllowGravity(true);
    if (S.can <= 0) { this.oyuncuOl(); return; }
    this.dokunulmaz = CONFIG.oyuncu.dokunulmaz;
    this.knock = 0.25;
    b.setVelocity((p.x < kaynakX ? -1 : 1) * 180, -300);
    this.cameras.main.shake(120, 0.004);
  },

  oyuncuOl() {
    const S = this.durum, p = this.player, b = p.body;
    if (S.olu) return;
    S.olu = true;
    S.can = 0;
    S.yasam--;
    this.hudGuncelle();
    this.tirmaniyor = false;
    b.setAllowGravity(true);
    b.checkCollision.none = true;
    b.setVelocity(0, -420);
    p.setTint(0x666666).setAlpha(1);
    this.time.delayedCall(1200, () => {
      if (S.yasam <= 0) this.oyunBitti();
      else this.canlan();
    });
  },

  canlan() {
    const S = this.durum, p = this.player, b = p.body;
    S.olu = false;
    S.can = CONFIG.oyuncu.canMax;
    b.checkCollision.none = false;
    b.setAllowGravity(true);
    p.clearTint();
    b.reset(this.spawn.x, this.spawn.y);
    this.dokunulmaz = 2;
    this.knock = 0;
    this.hudGuncelle();
  }
});
