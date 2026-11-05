// Düşmanlar: yaratma, devriye, ateş edenler (maymun, mızraklı köpek), uçanlar (arı, örümcek), patron, mermiler, hasar ve ölüm.
const YURUYEN = ['gul', 'yilan', 'yuvarlak', 'maymun', 'kopek', 'kedi', 'domuz', 'kertenkele'];
const OLUM_SESI = { boss: 'olBoss', maymun: 'olMaymun', kopek: 'olKopek', gul: 'olGul', yuvarlak: 'olYuvarlak', ari: 'olAri', orumcek: 'olOrumcek', yilan: 'olYilan',
  kedi: 'olKopek', domuz: 'olBoss', kertenkele: 'olYilan' };
// tip: [gövde g, gövde y, can, hız, uçan]
const DUSMAN_TIP = {
  boss:     [56, 60, CONFIG.patron.can, 0, false],
  gul:      [24, 26, 1, 55, false],
  yilan:    [30, 14, 1, 45, false],
  yuvarlak: [26, 26, 1, 120, false],
  maymun:   [24, 28, 1, 40, false],
  kopek:    [26, 30, 2, 40, false],
  ari:      [20, 20, 1, 0, true],
  orumcek:  [22, 22, 1, 0, true],
  // 2. bölüm
  kedi:       [24, 38, 3, 70, false],   // yakına gelince bıçakla atılır
  domuz:      [34, 46, 5, 35, false],   // yakına gelince gürzle vurur
  kertenkele: [22, 28, 2, 45, false]    // üfleme okuyla atar
};

Object.assign(OyunSahnesi.prototype, {

  // e: { tip, x, y } (yürüyenlerde y = ayak, arıda y = merkez) | örümcek: { tip, x, tavan, alt }
  dusmanYarat(e) {
    const t = DUSMAN_TIP[e.tip];
    if (!t) return null;
    const [bw0, bh0, hp, hiz, ucan] = t;
    // Görsel ASSETLER.dusman[tip] şeridinden, görünür boya ölçekli; gövde ayak çizgisinde (uçanlarda merkezde) ortalı
    const O = CONFIG.dusmanOlcek, D = ASSETLER.dusman[e.tip], s = D.boy * O / (D.ayak - D.ust);
    const bw = bw0 * O / s, bh = bh0 * O / s;
    const oy = ucan ? (D.ust + D.ayak) / 2 : D.ayak;
    const y = e.tip === 'orumcek' ? e.tavan + 20 : e.y;
    const d = this.dusmanlar.create(e.x, y, 'd_' + e.tip, 0).setOrigin(0.5, oy / D.h).setScale(s).setDepth(6);
    d.body.setSize(bw, bh, false).setOffset((D.w - bw) / 2, ucan ? oy - bh / 2 : D.ayak - bh);
    Object.assign(d, { ad: e.tip, tip: e.tip, hp, hiz, oldu: false, yon: 1 });
    if (ucan) d.body.setAllowGravity(false);

    if (e.tip === 'boss') {
      Object.assign(d, { aktif: false, durum: 'yuru', durumZaman: 2, dokunulmaz: 0, yon: -1 });
      d.setFlipX(true);
    } else if (e.tip === 'maymun' || e.tip === 'kopek' || e.tip === 'kertenkele') {
      d.atesBekle = 1 + Math.random(); d.hazir = 0;
    } else if (e.tip === 'ari') {
      Object.assign(d, { baslangicX: e.x, baslangicY: e.y, faz: Math.random() * 6, kovala: false });
    } else if (e.tip === 'orumcek') {
      Object.assign(d, { tavan: e.tavan, ustY: e.tavan + 24, altY: Math.max(e.alt, e.tavan + 60), faz: Math.random() * 6 });
    }
    if (YURUYEN.includes(e.tip)) this.devriyeAlani(d, e);
    this.dusmanAnim(d, { boss: 'yuru', ari: 'uc', orumcek: 'bekle', maymun: 'dur' }[e.tip] || 'yuru');
    if (e.tip === 'boss') d.anims.pause();
    return d;
  },

  // Yürüyen düşmanın alanı: bastığı zemin parçası (duvar, uçurum ya da dikene kadar); alan dışına asla çıkmaz
  devriyeAlani(d, e) {
    const T = this.L.karo, G = this.izgara, W = G[0].length, H = G.length;
    const c = Math.floor(e.x / T);
    let r = Math.floor((e.y + 1) / T);
    while (r < H && !G[r][c]) r++;
    if (r >= H) return;
    const ok = cc => cc >= 0 && cc < W && G[r][cc] && !G[r - 1][cc] && !this.dikenHucre.has(r + ',' + cc);
    if (!ok(c)) return;
    let a = c, z = c;
    while (ok(a - 1)) a--;
    while (ok(z + 1)) z++;
    const yarim = d.body.width / 2 + 2;
    d.minX = a * T + yarim;
    d.maxX = (z + 1) * T - yarim;
    if (d.maxX < d.minX) d.minX = d.maxX = (a + z + 1) * T / 2;
    d.alanVar = true;
  },

  // Animasyon oynat (aynısı oynuyorsa dokunma, duraklatılmışsa sürdür)
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
      if (d.tip !== 'boss' && (Math.abs(d.x - p.x) > 900 || Math.abs(d.y - p.y) > 700)) return;   // uzaktakiler uyur
      const b = d.body;
      if (d.alanVar && (d.x < d.minX || d.x > d.maxX)) { d.x = Phaser.Math.Clamp(d.x, d.minX, d.maxX); b.setVelocityX(0); }
      if (d.sersem > 0) {   // vuruş sonrası kısa sersemlik
        d.sersem -= dt;
        if (d.sersem <= 0 && b.allowGravity) b.setVelocityX(0);
        return;
      }
      switch (d.tip) {
        case 'gul': case 'yilan': this.devriye(d, dt); break;
        case 'yuvarlak': this.kirpiGuncelle(d, dt); break;
        case 'maymun': case 'kopek': case 'kertenkele': this.atesEden(d, dt); break;
        case 'kedi': case 'domuz': this.yakinSaldiri(d, dt); break;
        case 'ari': this.ariGuncelle(d, time); break;
        case 'orumcek': this.orumcekGuncelle(d, time); break;
        case 'boss': this.bossGuncelle(d, dt); break;
      }
    });
  },

  // Zemin parçasının bir ucundan diğerine. Duvara / sandığa çarpınca döner; dönüşten sonra 0.35 sn tekrar dönmez (titreme olmaz).
  devriye(d, dt) {
    const b = d.body;
    if (d.donBekle > 0) d.donBekle -= dt;
    if (d.x <= d.minX) d.yon = 1;
    else if (d.x >= d.maxX) d.yon = -1;
    else if (!(d.donBekle > 0) && ((b.blocked.left && d.yon < 0) || (b.blocked.right && d.yon > 0))) {
      d.yon = -d.yon;
      d.donBekle = 0.35;
    }
    b.setVelocityX(d.yon * d.hiz);
    d.setFlipX(d.yon < 0);
  },

  // Pembe kirpi: oyuncuyu kadrajda aynı zeminde görünce %25 hızlanıp üstüne koşar; geçince yavaşlar ve
  // oyuncu kadrajdan çıkana ya da başka zemine geçene kadar normal devriyeye döner
  kirpiGuncelle(d, dt) {
    const p = this.player, dx = p.x - d.x;
    const goruyor = !this.durum.olu && this.cameras.main.worldView.contains(d.x, d.y)
      && Math.abs(p.body.bottom - d.body.bottom) < 40 && p.x >= d.minX - 16 && p.x <= d.maxX + 16;
    if (!goruyor) d.gecti = false;
    if (goruyor && !d.gecti) {
      if (!d.kosuyor) { d.kosuyor = true; d.yon = Math.sign(dx) || d.yon; }
      if (Math.sign(dx) !== d.yon && Math.abs(dx) > 8) { d.kosuyor = false; d.gecti = true; }   // geçti
    } else d.kosuyor = false;
    d.hiz = DUSMAN_TIP.yuvarlak[3] * (d.kosuyor ? 1.25 : 1);
    this.devriye(d, dt);
  },

  // Maymun / mızraklı: oyuncu aynı zemine basınca (ayak hizası aynı) döner, hazırlanır ve fırlatır; yoksa devriye
  atesEden(d, dt) {
    const p = this.player, b = d.body, dx = p.x - d.x;
    if (d.hazir > 0) {
      d.hazir -= dt;
      b.setVelocityX(0);
      if (d.hazir <= 0) { this.mermiAt(d, d.yon); d.atesBekle = d.tip === 'kopek' ? 1.8 : 2.4; }
      return;
    }
    d.atesBekle -= dt;
    const ayniZemin = yerdeMi(p.body) && Math.abs(p.body.bottom - b.bottom) < 8;
    if (Math.abs(dx) < 420 && ayniZemin && !this.durum.olu) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      b.setVelocityX(0);
      if (d.atesBekle <= 0) { d.hazir = 0.4; d.play('d_' + d.ad + '_at'); }
      else if (d.tip === 'kopek') { this.dusmanAnim(d, 'yuru'); d.anims.pause(); }
      else this.dusmanAnim(d, 'dur');
    } else {
      this.devriye(d, dt);
      this.dusmanAnim(d, 'yuru');
    }
  },

  // Kedi / domuz: oyuncu aynı zeminde yakına gelince döner ve saldırır. Kedi bıçakla ileri atılır, domuz gürzü indirir;
  // vuruş anında önündeki menzildeyse oyuncu hasar alır. Sonra kısa dinlenme.
  yakinSaldiri(d, dt) {
    const p = this.player, b = d.body, dx = p.x - d.x, kedi = d.tip === 'kedi';
    if (d.saldiri > 0) {
      d.saldiri -= dt;
      b.setVelocityX(kedi && d.saldiri > 0.12 && d.saldiri < 0.36 ? d.yon * 240 : 0);
      if (!d.vurdu && d.saldiri < (kedi ? 0.25 : 0.22)) {
        d.vurdu = true;
        const on = (p.x - d.x) * d.yon;
        if (!this.durum.olu && on > -10 && on < (kedi ? 52 : 70) && Math.abs(p.body.bottom - b.bottom) < 40) this.oyuncuHasar(d.x);
        if (!kedi) this.cameras.main.shake(90, 0.004);
      }
      if (d.saldiri <= 0) { d.dinlen = kedi ? 1 : 1.5; this.dusmanAnim(d, 'dur'); }
      return;
    }
    if (d.dinlen > 0) { d.dinlen -= dt; b.setVelocityX(0); return; }
    const ayni = !this.durum.olu && Math.abs(p.body.bottom - b.bottom) < 24 && p.x >= d.minX - 24 && p.x <= d.maxX + 24;
    if (ayni && Math.abs(dx) < (kedi ? 120 : 80)) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      d.saldiri = kedi ? 0.48 : 0.6;
      d.vurdu = false;
      d.play('d_' + d.ad + '_saldir');
      this.ses(kedi ? 'bastonSalla' : 'bastonVur');
      return;
    }
    this.devriye(d, dt);
    this.dusmanAnim(d, 'yuru');
  },

  // Arı: kamera görüş alanına girince kovalar (girerken sesi başlar, çıkınca / ölünce kesilir); yoksa yerinde süzülür
  ariGuncelle(d, time) {
    const p = this.player, b = d.body, dx = p.x - d.x, dy = p.y - d.y;
    const gorus = this.cameras.main.worldView.contains(d.x, d.y);
    if (gorus && !d.gorundu) d.sesObj = sesBaslat(this, 'ari', { volume: 0.5 });
    if (!gorus && d.sesObj) d.sesObj = sesDurdur(d.sesObj);
    d.gorundu = gorus;
    if (gorus && !this.durum.olu) d.kovala = true;
    else if (Math.hypot(dx, dy) > 520) d.kovala = false;
    if (d.kovala) {
      const a = Math.atan2(dy, dx);
      b.setVelocity(Math.cos(a) * 95, Math.sin(a) * 95);
    } else {
      const hx = d.baslangicX + Math.sin(time * 0.0016 + d.faz) * 50;
      const hy = d.baslangicY + Math.sin(time * 0.003 + d.faz) * 24;
      b.setVelocity((hx - d.x) * 2, (hy - d.y) * 2);
    }
    d.setFlipX(b.velocity.x < 0);
  },

  // Örümcek: tavandan ipiyle inip çıkar
  orumcekGuncelle(d, time) {
    const t = (Math.sin(time * 0.0014 + d.faz) + 1) / 2;
    d.y = d.ustY + (d.altY - d.ustY) * t;
    this.ipGrafik.lineStyle(1.5, 0xeeeeee, 0.9)
      .lineBetween(d.x, d.tavan, d.x, d.y - ASSETLER.dusman.orumcek.boy * CONFIG.dusmanOlcek * 0.45);
  },

  mermiAt(d, yon) {
    const kopek = d.tip === 'kopek', ok = d.tip === 'kertenkele', ad = kopek ? 'mizrak' : ok ? 'ok' : 'atesTopu', M = ASSETLER.dusman[ad];
    if (kopek || ok) this.ses('mizrak');
    else { this.atesSira = !this.atesSira; this.ses(this.atesSira ? 'ates1' : 'ates2'); }
    const m = this.mermiler.create(d.x + yon * (ok ? 24 : 18), d.y - (kopek ? 18 : ok ? 17 : 20), ad).setDepth(7);
    m.setDisplaySize(M.gen, M.gen * M.h / M.w).setFlipX(yon < 0);
    m.body.setAllowGravity(false);
    m.body.setSize(M.w * 0.7, M.h * 0.6, true);
    m.setVelocityX(yon * (kopek ? 280 : ok ? 260 : 210));
    m.omur = 2.6;
  },

  updateMermiler(dt) {
    this.mermiler.getChildren().slice().forEach(m => { if ((m.omur -= dt) <= 0) m.destroy(); });
  },

  // ---- Patron: yürü → hazırlan (sarı) → atıl → dinlen; yarı canın altında hızlanır ve zıplayarak atılır ----
  bossGuncelle(d, dt) {
    const p = this.player, b = d.body;
    if (!d.aktif) {
      if (Math.abs(p.x - d.x) < CONFIG.patron.uyanMesafe && Math.abs(p.y - d.y) < 300 && !this.durum.olu) {
        d.aktif = true;
        this.bossSes(true);
        this.popup(d.x, d.y - 90, 'PATRON!');
      } else { b.setVelocityX(0); d.anims.pause(); return; }
    }
    if (d.dokunulmaz > 0) { d.dokunulmaz -= dt; d.setAlpha(Math.floor(d.dokunulmaz * 12) % 2 ? 0.4 : 1); }
    else d.setAlpha(1);
    // Kapı önündeki çukur açılıp içine düşerse yenilir
    if (d.y > this.L.boss[1] + 60) { d.hp = 0; this.bossYen(d); return; }

    const hizli = d.hp <= Math.ceil(CONFIG.patron.can / 2);
    d.durumZaman -= dt;
    switch (d.durum) {
      case 'yuru': {
        const yon = Math.sign(p.x - d.x) || 1;
        b.setVelocityX(yon * (hizli ? 110 : 80));
        d.setFlipX(yon < 0);
        this.dusmanAnim(d, 'yuru');
        if (d.durumZaman <= 0) {
          Object.assign(d, { durum: 'hazir', durumZaman: 0.6 });
          b.setVelocityX(0);
          d.setTint(0xffff66).play('d_boss_hazir');
          this.bossSes();
        } else if (Math.random() < dt * 0.25) this.bossSes();   // yürürken arada bir
        break;
      }
      case 'hazir':
        if (d.durumZaman > 0) break;
        Object.assign(d, { durum: 'saldir', durumZaman: hizli ? 1.2 : 1.0, yon: Math.sign(p.x - d.x) || 1 });
        d.setFlipX(d.yon < 0).clearTint().play('d_boss_atil');
        if (hizli && b.blocked.down) b.setVelocityY(-420);
        break;
      case 'saldir':
        b.setVelocityX(d.yon * (hizli ? 330 : 280));
        if (d.durumZaman <= 0 || b.blocked.left || b.blocked.right) {
          Object.assign(d, { durum: 'dinlen', durumZaman: 1.0 });
          b.setVelocityX(0);
          d.play('d_boss_dinlen');
        }
        break;
      case 'dinlen':
        if (d.durumZaman <= 0) Object.assign(d, { durum: 'yuru', durumZaman: hizli ? 1.8 : 2.6 });
        break;
    }
  },

  // Patron sesi: boss1..13 rastgele; zorla değilse başka patron sesi çalarken çalmaz (üst üste binmez)
  bossSes(zorla) {
    if (!zorla && this.bossSesObj && this.bossSesObj.isPlaying) return;
    this.bossSesObj = sesDurdur(this.bossSesObj);
    this.bossSesObj = sesBaslat(this, 'boss' + Phaser.Math.Between(1, 13));
  },

  bossYen(d) {
    this.bossSesObj = sesDurdur(this.bossSesObj);
    Object.assign(d, { oldu: true, aktif: false });
    d.clearTint().setAlpha(1);
    this.puanEkle(CONFIG.puan.patron, d.x, d.y - 80);
    const x = d.x, y = d.y;
    this.dusmanOlum(d, () => this.cikisAc(x, y));
  },

  // ---- Temas, hasar, ölüm ----
  dusmanTemas(p, d) {
    if (!d.active || d.oldu || this.durum.olu) return;
    const b = p.body;
    if (this.pogoModu && b.velocity.y > 50 && (b.bottom - d.body.top) < 22) {   // pogo ile üstten
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
      this.bossSes(true);
      this.cameras.main.shake(150, 0.006);
      if (d.hp <= 0) this.bossYen(d);
      return true;
    }
    d.hp -= n;
    if (d.hp <= 0) {
      d.oldu = true;
      this.puanEkle(CONFIG.puan.dusman, d.x, d.y - 34);
      this.dusmanOlum(d);
      return true;
    }
    // Çok canlılarda vuruş belli olsun: beyaz parlama (2 kez), geri savrulma, sersemlik, kıvılcım, hafif sarsıntı
    const yon = Math.sign(d.x - this.player.x) || 1;
    d.setTintFill(0xffffff);
    this.time.delayedCall(90, () => d.active && d.clearTint());
    this.time.delayedCall(180, () => d.active && !d.oldu && d.setTintFill(0xffffff));
    this.time.delayedCall(260, () => d.active && d.clearTint());
    d.sersem = 0.3;
    d.body.setVelocityX(yon * 150);
    if (d.body.allowGravity && yerdeMi(d.body)) d.body.setVelocityY(-140);
    this.parcala(d.x, d.y - 16, 0xffffff);
    this.cameras.main.shake(70, 0.003);
    return true;
  },

  // Ölüm: ses, gövde kapanır, parçalanma animasyonu, solup kaybolur
  dusmanOlum(d, bitince) {
    d.sesObj = sesDurdur(d.sesObj);
    if (OLUM_SESI[d.tip]) this.ses(OLUM_SESI[d.tip]);
    d.clearTint();
    d.body.setVelocity(0, 0);
    d.body.enable = false;
    d.play('d_' + d.ad + '_ol');
    if (ASSETLER.dusman[d.ad].anim.ol.length === 1) {   // ölüm karesi olmayanlar: devrilip söner
      const yon = d.flipX ? 1 : -1;
      this.tweens.add({ targets: d, angle: yon * 80, y: d.y + 4, alpha: 0, duration: 520, ease: 'Quad.easeIn',
        onComplete: () => { d.destroy(); if (bitince) bitince(); } });
      return;
    }
    d.once('animationcomplete', () => this.tweens.add({
      targets: d, alpha: 0, duration: 300, onComplete: () => { d.destroy(); if (bitince) bitince(); }
    }));
  }
});
