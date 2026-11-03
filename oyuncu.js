// Oyuncu mekanikleri: yürüme, zıplama, POGO, baston, sandık çekme, sarmaşık, hasar, ölüm, animasyon
Object.assign(GameScene.prototype, {

  girdi() {
    const K = this.keys, T = this.touch;
    const ziplaTus = K.zipla.isDown || K.z.isDown || T.zipla;   // sarmaşıktan atlamak için (↑ hariç)
    const zipla = ziplaTus || K.yukari.isDown || K.w.isDown;    // ↑ de zıplatır
    const saldir = K.saldir.isDown || K.k.isDown || T.saldir;
    const cek = K.cek.isDown || K.l.isDown || T.cek;
    const k = {
      sol: K.sol.isDown || K.a.isDown || T.sol,
      sag: K.sag.isDown || K.d.isDown || T.sag,
      yukari: K.yukari.isDown || K.w.isDown || T.yukari,
      asagi: K.asagi.isDown || K.s.isDown || T.asagi,
      zipla, saldir, cek,
      ziplaBas: zipla && !this.oncekiZipla,
      ziplaBasTus: ziplaTus && !this.oncekiZiplaTus,
      saldirBas: saldir && !this.oncekiSaldir,
      cekBas: cek && !this.oncekiCek
    };
    this.oncekiZipla = zipla;
    this.oncekiZiplaTus = ziplaTus;
    this.oncekiSaldir = saldir;
    this.oncekiCek = cek;
    return k;
  },

  updatePlayer(time, dt) {
    const p = this.player, b = p.body, S = this.durum, F = CONFIG.fizik;
    if (S.olu) return;

    // Çukura düşme
    if (p.y > this.dunyaY + 60) { this.oyuncuOl(); return; }

    const k = this.girdi();
    this.k = k;
    const bant = this.bantItme;   // konveyör bant itmesi (çarpışma adımında ayarlanır)
    this.bantItme = 0;

    if (this.dokunulmaz > 0) this.dokunulmaz -= dt;
    if (this.knock > 0) this.knock -= dt;
    if (this.saldiriBekleme > 0) this.saldiriBekleme -= dt;
    if (this.pogoSekZaman > 0) this.pogoSekZaman -= dt;
    if (this.inisZaman > 0) this.inisZaman -= dt;
    if (this.sersemZaman > 0) this.sersemZaman -= dt;
    p.setAlpha(this.dokunulmaz > 0 && Math.floor(time / 90) % 2 ? 0.35 : 1);

    const yerde = b.blocked.down || b.touching.down;
    if (yerde && this.havadaydi && !this.pogoModu) this.inisZaman = 0.1;   // iniş tozu karesi
    this.havadaydi = !yerde;
    this.coyote = yerde ? 0.09 : this.coyote - dt;
    this.ziplaTampon = k.ziplaBas ? 0.11 : this.ziplaTampon - dt;

    // Sarmaşık
    this.sarmasikGuncelle(k, yerde);
    if (this.tirmaniyor) {
      this.pogoModu = false; this.pogoAktif = false;
      this.cekBirak();
      this.egik = false; this.tavan = false;
      this.animasyon(yerde);
      return;
    }

    // Bastonla duvara asılma: havada düşerken duvara doğru basılıysa bastonla takılır.
    // Zıpla → duvardan uzağa sıçrar; ters yön / ↓ / duvar biterse bırakır.
    if (this.asiliBekle > 0) this.asiliBekle -= dt;
    if (this.yatayKilit > 0) this.yatayKilit -= dt;
    if (this.asili) {
      const ters = this.asili > 0 ? k.sol : k.sag;
      if (k.ziplaBas) {
        this.asiliBirak();
        this.bakis = -this.asiliSon; p.setFlipX(this.bakis < 0);
        b.setVelocity(this.bakis * F.asiliZipla, F.ziplama);
        this.ziplarken = true; this.ziplaTampon = 0; this.yatayKilit = 0.15;   // kısa süre yatay kontrol yok (duvardan uzaklaşsın)
      } else if (ters || k.asagi || yerde || !this.duvarVar(this.asili)) {
        this.asiliBirak();
      } else {
        b.setVelocity(0, 0);
        this.animasyon(yerde);
        return;
      }
    } else if (!yerde && this.asiliBekle <= 0 && b.velocity.y > 0 && this.knock <= 0 && !this.pogoModu) {
      const y = k.sag && !k.sol ? 1 : (k.sol && !k.sag ? -1 : 0);
      if (y && this.duvarVar(y)) {
        this.asili = y; this.asiliSon = y; this.bakis = y; p.setFlipX(y < 0);
        b.setAllowGravity(false); b.setVelocity(0, 0);
        this.pogoModu = false; this.pogoAktif = false; this.saldiriZaman = 0;
        this.animasyon(yerde);
        return;
      }
    }

    // Sandık çekme (C basılı): baston uzanır, sandığa takılır, geri yürüyerek sandık çekilir
    this.cekGuncelle(k, yerde, dt);
    const cekiyor = this.cekDurum !== null;
    if (cekiyor) { this.egik = false; this.tavan = false; }

    // Yürüme (çekerken kendi hareketi cekGuncelle'de)
    if (!cekiyor) {
      const yon = (k.sag ? 1 : 0) - (k.sol ? 1 : 0);
      if (yon) { this.bakis = yon; p.setFlipX(yon < 0); }
      // Eğilme: yerdeyken ↓ basılı (pogo değil) → eğilerek yavaş yürür. Üstü kapalıysa (1 karelik aralık) kalkamaz.
      this.tavan = this.egik && this.tavanVar();
      this.egik = (yerde && k.asagi && !this.pogoModu) || this.tavan;
      let hiz = this.egik ? F.egilYurume : F.yurume;
      // Sandık itme: yerde, önünde (aynı zeminde, bitişik) sandık varsa yavaşça iteriz
      this.itiyor = false;
      if (yon && yerde && !this.egik && this.knock <= 0) {
        const s = this.itHedefBul(yon);
        if (s) {
          this.itiyor = true; hiz = F.itme;
          s.body.setVelocityX(s.body.blocked[yon > 0 ? 'right' : 'left'] ? 0 : yon * F.itme);
        }
      }
      // Duvara doğru basarken yatay hız verme (gövde duvara sürtünüp zıplamayı engellemesin)
      const vx = yon && this.duvarVar(yon) ? 0 : yon * hiz;
      if (this.knock <= 0 && !(this.yatayKilit > 0)) b.setVelocityX(vx + (yerde ? bant : 0));
    } else this.itiyor = false;

    // Zıplama (basılı tut = yüksek, bırak = kısa)
    if (!cekiyor && !this.tavan && this.ziplaTampon > 0 && this.coyote > 0 && this.knock <= 0) {
      b.setVelocityY(F.ziplama);
      this.ziplaTampon = 0; this.coyote = 0; this.ziplarken = true;
    }
    if (this.ziplarken && !k.zipla && b.velocity.y < -200) {
      b.setVelocityY(b.velocity.y * 0.5);
      this.ziplarken = false;
    }
    if (yerde && b.velocity.y >= 0) this.ziplarken = false;

    // POGO: sadece havadayken açılır (önce zıpla, sonra ↓ basılı tut). Yerde ↓ basmak bir şey yapmaz.
    // Açıldıktan sonra ↓ basılı kaldıkça her yere (zemin, düşman, diken, sandık) seker.
    if (!k.asagi || cekiyor) this.pogoAktif = false;
    else if (!yerde) this.pogoAktif = true;
    this.pogoModu = this.pogoAktif;
    if (this.pogoModu && yerde && b.velocity.y >= 0 && this.knock <= 0) this.pogoZipla();

    // Baston vuruşu (X) — yerde ve havada
    if (k.saldirBas && this.saldiriBekleme <= 0 && !cekiyor && !this.pogoModu) {
      this.saldiriZaman = CONFIG.oyuncu.saldiriSure;
      this.saldiriBekleme = CONFIG.oyuncu.saldiriBekleme;
      this.vurulan = new Set();
    }
    if (this.saldiriZaman > 0) {
      this.saldiriZaman -= dt;
      this.saldiriVur();
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

    this.animasyon(yerde);
  },

  // ---- Sandık çekme ----
  cekGuncelle(k, yerde, dt) {
    const C = CONFIG.cek, p = this.player, b = p.body;
    // Bırakma koşulları
    if (this.cekDurum && (!k.cek || !yerde || this.knock > 0 || k.ziplaBas)) this.cekBirak();
    // Başlat: C'ye basınca baston uzanır; önünde sandık varsa takılır
    if (!this.cekDurum && k.cekBas && yerde && this.knock <= 0 && this.saldiriZaman <= 0) {
      this.cekDurum = 'uzat';
      this.cekZaman = C.uzatSure;
      this.cekSandik = this.cekHedefBul();
    }
    if (!this.cekDurum) return;
    if (this.cekDurum === 'uzat') {
      b.setVelocityX(0);
      this.cekZaman -= dt;
      if (this.cekZaman <= 0) {
        if (this.cekSandik && this.cekSandik.active) {
          this.cekDurum = 'cek';
          this.cekMesafe = Math.max(0, this.cekBosluk(this.cekSandik));
        } else {
          this.cekBirak();   // boşa uzatıldı
        }
      }
      return;
    }
    // 'cek': sadece geri (sandıktan uzağa) yürünebilir, sandık aynı mesafede peşinden gelir
    const s = this.cekSandik;
    if (!s || !s.active || !(s.body.blocked.down || s.body.touching.down)) { this.cekBirak(); return; }
    const geri = (this.bakis > 0 ? k.sol : k.sag) ? -this.bakis : 0;
    b.setVelocityX(geri * C.hiz);
    const fark = this.cekBosluk(s) - this.cekMesafe;
    if (fark > C.menzil) { this.cekBirak(); return; }
    s.body.setVelocityX(b.velocity.x - this.bakis * fark * 10);
  },

  asiliBirak() {
    this.asili = 0;
    this.asiliBekle = 0.25;
    this.player.body.setAllowGravity(true);
  },

  // İtme hedefi: yürünen yönde, aynı zeminde, gövdeye bitişik sandık
  itHedefBul(yon) {
    const b = this.player.body;
    return this.sandiklar.getChildren().find(s => {
      if (!s.active || Math.abs(s.body.bottom - b.bottom) > 10) return false;
      const bosluk = yon > 0 ? s.body.left - b.right : b.left - s.body.right;
      return bosluk >= -4 && bosluk <= 2;
    }) || null;
  },

  // Oyuncu ile sandık arasındaki yatay boşluk (bakılan yönde)
  cekBosluk(s) {
    const b = this.player.body;
    return this.bakis > 0 ? s.body.left - b.right : b.left - s.body.right;
  },

  // Bakılan yönde, aynı zeminde, baston menzilindeki en yakın sandık
  cekHedefBul() {
    const b = this.player.body;
    let en = null, enB = Infinity;
    this.sandiklar.getChildren().forEach(s => {
      if (!s.active) return;
      if (Math.abs(s.body.bottom - b.bottom) > 10) return;
      const bosluk = this.cekBosluk(s);
      if (bosluk < -4 || bosluk > CONFIG.cek.menzil) return;
      if (bosluk < enB) { en = s; enB = bosluk; }
    });
    return en;
  },

  cekBirak() {
    if (this.cekSandik && this.cekSandik.active) this.cekSandik.body.setVelocityX(0);
    this.cekDurum = null;
    this.cekSandik = null;
  },

  // Oyuncu sandığa değince: pogo ile üstüne inerse sandık açılır ve seker
  sandikTemas(p, s) {
    if (this.pogoModu && p.body.touching.down && s.body.touching.up) {
      this.sandikAc(s);
      this.pogoZipla();
    }
  },

  // ---- Animasyon ----
  animasyon(yerde) {
    const p = this.player, b = p.body;
    let a, durdur = false;
    if (this.sersemZaman > 0 || this.knock > 0) a = this.hasarAnim || 'sersem';
    else if (this.asili) a = 'asili';
    else if (this.tirmaniyor) { a = 'tirman'; durdur = b.velocity.y === 0; }
    else if (this.cekDurum === 'uzat') a = 'uzat';
    else if (this.cekDurum === 'cek') { a = 'cek'; durdur = b.velocity.x === 0; }
    else if (this.saldiriZaman > 0) a = 'vur';
    else if (this.pogoModu && (!yerde || this.pogoSekZaman > 0)) a = this.pogoSekZaman > 0 ? 'pogoSek' : 'pogoHava';
    else if (!yerde && !this.egik) a = b.velocity.y < 0 ? 'zipla' : 'dus';
    else if (this.egik) { a = 'egil'; durdur = Math.abs(b.velocity.x) <= 10; }
    else if (this.inisZaman > 0) a = 'in';
    else if (this.itiyor) { a = 'it'; durdur = Math.abs(b.velocity.x) <= 10; }
    else if (Math.abs(b.velocity.x) > 10) a = 'kos';
    else a = 'dur';
    if (!p.anims.currentAnim || p.anims.currentAnim.key !== a) p.play(a);
    // Animasyona göre görsel ölçek (CONFIG.oyuncu.animOlcek; yoksa 1)
    this.gorselOlcek(CONFIG.oyuncu.animOlcek[a] || 1);
    if (durdur) { if (!p.anims.isPaused) p.anims.pause(); }
    else if (p.anims.isPaused) p.anims.resume();
  },

  pogoZipla() {
    const F = CONFIG.fizik;
    this.player.body.setVelocityY(this.k && this.k.zipla ? F.pogoYuksek : F.pogo);
    this.ziplarken = false;
    this.coyote = 0;
    // Değme anı: sarı kıvılcımlı kare → sekme kareleri → (havada) tekrar bastonlu kare
    this.pogoSekZaman = 3 / 14;
    this.player.play('pogoSek');
  },

  govdeRect(body) {
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  },

  saldiriVur() {
    const b = this.player.body, U = 30;
    const r = new Phaser.Geom.Rectangle(this.bakis > 0 ? b.right : b.x - U, b.y + 4, U, b.height - 4);
    const kesisir = (g) => Phaser.Geom.Intersects.RectangleToRectangle(r, g);
    this.dusmanlar.getChildren().forEach(d => {
      if (!d.active || d.oldu || this.vurulan.has(d)) return;
      if (kesisir(this.govdeRect(d.body))) {
        this.vurulan.add(d);
        this.dusmanHasar(d, 1);
      }
    });
    this.breakables.getChildren().slice().forEach(bl => {
      if (bl.active && kesisir(new Phaser.Geom.Rectangle(bl.x, bl.y, 32, 32))) this.blokKir(bl);
    });
    // Kırmızı takozlar bastonla kırılır
    this.takozlar.getChildren().slice().forEach(t => {
      if (t.active && kesisir(t.getBounds())) {
        this.parcala(t.x, t.y, 0xd62828);
        t.destroy();
      }
    });
    // Sandık bastonla açılır
    this.sandiklar.getChildren().forEach(s => {
      if (s.active && !s.acik && kesisir(this.govdeRect(s.body))) this.sandikAc(s);
    });
    // Bastonla mermileri boz
    this.mermiler.getChildren().slice().forEach(m => {
      if (kesisir(this.govdeRect(m.body))) {
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
        const yon = (k.sag ? 1 : 0) - (k.sol ? 1 : 0);
        if (yon) { this.bakis = yon; p.setFlipX(yon < 0); }
        b.setVelocity(yon * 140, F.ziplama * 0.8);
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
    // Darbe karesi o anki duruma göre (yerde ayakta → eski sersem animasyonu)
    const yerde = b.blocked.down || b.touching.down;
    this.hasarAnim = this.asili ? 'h_asili' : this.tirmaniyor ? 'h_tirman' : this.cekDurum ? 'h_cek'
      : this.itiyor ? 'h_it' : this.egik ? 'h_egil' : !yerde ? 'h_hava' : null;
    S.can--;
    this.hudGuncelle();
    this.tirmaniyor = false;
    this.cekBirak();
    if (this.asili) this.asiliBirak();
    this.itiyor = false;
    b.setAllowGravity(true);
    if (S.can <= 0) { this.oyuncuOl(); return; }
    this.dokunulmaz = CONFIG.oyuncu.dokunulmaz;
    this.knock = 0.25;
    this.sersemZaman = 0.5;
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
    this.cekBirak();
    this.pogoModu = false; this.pogoAktif = false;
    b.setAllowGravity(true);
    b.checkCollision.none = true;
    b.setVelocity(0, -420);
    if (this.asili) this.asiliBirak();
    p.setTint(0x666666).setAlpha(1);
    p.play('sersem');
    this.gorselOlcek(1);
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
    this.sersemZaman = 0;
    p.play('dur');
    this.egik = false; this.gorselOlcek(1);
    this.hudGuncelle();
  }
});
