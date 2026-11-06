// Düşmanlar: yaratma, devriye, ateş edenler (maymun, mızraklı köpek), uçanlar (arı, örümcek), patron, mermiler, hasar ve ölüm.
const YURUYEN = ['gul', 'yilan', 'yuvarlak', 'maymun', 'kopek', 'kedi', 'domuz', 'kertenkele', 'golem', 'fici', 'buyucu'];
const OLUM_SESI = { boss: 'olBoss', maymun: 'olMaymun', kopek: 'olKopek', gul: 'olGul', yuvarlak: 'olYuvarlak', ari: 'olAri', orumcek: 'olOrumcek', yilan: 'olYilan',
  kedi: 'olKopek', yarasa: 'olAri', golem: 'olBoss', bitki: 'olGul', fici: 'olYuvarlak', buyucu: 'olMaymun', domuz: 'olBoss', kertenkele: 'olYilan' };
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
  kedi:       [24, 38, 2, 70, false],   // yakına gelince bıçakla atılır
  domuz:      [34, 46, 3, 35, false],   // yakına gelince gürzle vurur
  kertenkele: [22, 28, 1, 45, false],   // üfleme okuyla atar
  golem:      [36, 50, 4, 30, false],   // mor bölge: yakına gelince yumruk
  bitki:      [26, 34, 1, 0, false],    // üst bölge: yerinde durur, eğimli zehir tükürür (7 karo)
  fici:       [30, 32, 2, 50, false],   // görünce top olup dönerek atılır (dönerken vurulmaz)
  buyucu:     [24, 38, 1, 40, false],   // yavaşça büyü hazırlar, 2 can götüren büyü atar
  yarasa:     [26, 20, 2, 0, true]      // uçar, oyuncunun yanına gelip ses dalgası atar
};
// Ayakları zemin çizgisinin bu kadar altına çizilenler (px, çimi örtsün)
const DUSMAN_GOMME = { yuvarlak: 7, kedi: 5, domuz: 5, kertenkele: 5, golem: 5, bitki: 11, fici: 5, buyucu: 5, maymun: 5, yilan: 5, gul: 5 };

Object.assign(OyunSahnesi.prototype, {

  // e: { tip, x, y } (yürüyenlerde y = ayak, arıda y = merkez) | örümcek: { tip, x, tavan, alt }
  dusmanYarat(e) {
    const t = DUSMAN_TIP[e.tip];
    if (!t) return null;
    const [bw0, bh0, hp, hiz, ucan] = t;
    // Görsel ASSETLER.dusman[tip] şeridinden, görünür boya ölçekli; gövde ayak çizgisinde (uçanlarda merkezde) ortalı
    const O = CONFIG.dusmanOlcek, D = ASSETLER.dusman[e.tip], s = D.boy * O / (D.ayak - D.ust);
    const bw = bw0 * O / s, bh = bh0 * O / s;
    const gom = (DUSMAN_GOMME[e.tip] || 0) * O / s / O;   // görsel px → kare px
    const oy = (ucan ? (D.ust + D.ayak) / 2 : D.ayak) - gom;
    if (e.tip !== 'boss' && e.tip !== 'orumcek') e = { ...e, x: this.dusmanBosX(e.x, e.y, bw0 * O, bh0 * O, ucan) };
    const y = e.tip === 'orumcek' ? e.tavan + 20 : e.y;
    const d = this.dusmanlar.create(e.x, y, 'd_' + e.tip, 0).setOrigin(0.5, oy / D.h).setScale(s).setDepth(6);
    d.body.setSize(bw, bh, false).setOffset((D.w - bw) / 2, ucan ? oy - bh / 2 : D.ayak - bh - gom);
    Object.assign(d, { ad: e.tip, tip: e.tip, hp, hiz, oldu: false, yon: 1 });
    if (ucan) d.body.setAllowGravity(false);

    if (e.tip === 'boss') {
      Object.assign(d, { aktif: false, durum: 'yuru', durumZaman: 2, dokunulmaz: 0, yon: -1 });
      d.setFlipX(true);
    } else if (e.tip === 'maymun' || e.tip === 'kopek' || e.tip === 'kertenkele' || e.tip === 'buyucu' || e.tip === 'bitki') {
      d.atesBekle = 1 + Math.random(); d.hazir = 0;
    } else if (e.tip === 'ari' || e.tip === 'yarasa') {
      Object.assign(d, { baslangicX: e.x, baslangicY: e.y, faz: Math.random() * 6, kovala: false, atesBekle: 1.5, saldiri: 0 });
    } else if (e.tip === 'orumcek') {
      Object.assign(d, { tavan: e.tavan, ustY: e.tavan + 24, altY: Math.max(e.alt, e.tavan + 60), faz: Math.random() * 6 });
    }
    if (YURUYEN.includes(e.tip)) this.devriyeAlani(d, e);
    if (e.tip === 'fici') Object.assign(d, { durum: 'yuru', donus: 2, sonYon: 1 });
    this.dusmanAnim(d, { boss: 'yuru', ari: 'uc', yarasa: 'uc', orumcek: 'bekle', maymun: 'dur', bitki: 'bekle' }[e.tip] || 'yuru');
    if (e.tip === 'boss') d.anims.pause();
    return d;
  },

  // Düşman taşın / sandığın / zeminin içinde doğmasın: gövdesi dolu kareye değiyorsa aynı zeminde en yakın boş yere
  // (sola / sağa 8 px adımlarla, 8 karoya kadar) kayar. Yürüyenlerde yeni yerin altında zemin olmalı.
  dusmanBosX(x, y, w, h, ucan) {
    const T = this.L.karo, D = this.dolu, G = this.izgara;
    const dolu = (r, c) => !D[r] || D[r][c] === undefined || D[r][c];
    const bos = px => {
      const x0 = px - w / 2, y0 = ucan ? y - h / 2 : y - h, y1 = ucan ? y + h / 2 : y - 1;
      for (let r = Math.floor(y0 / T); r <= Math.floor(y1 / T); r++)
        for (let c = Math.floor(x0 / T); c <= Math.floor((x0 + w - 1) / T); c++) if (dolu(r, c)) return false;
      if (!ucan) { const r = Math.floor((y + 1) / T); for (const c of [Math.floor(x0 / T), Math.floor((x0 + w - 1) / T)]) if (!G[r] || !G[r][c]) return false; }
      return true;
    };
    if (bos(x)) return x;
    for (let k = 8; k <= 8 * T; k += 8) { if (bos(x - k)) return x - k; if (bos(x + k)) return x + k; }
    return x;
  },

  // Yürüyen düşmanın alanı: bastığı zemin parçası (duvar, uçurum ya da dikene kadar); alan dışına asla çıkmaz
  devriyeAlani(d, e) {
    const T = this.L.karo, G = this.izgara, W = G[0].length, H = G.length;
    const c = Math.floor(e.x / T);
    let r = Math.floor((e.y + 1) / T);
    while (r < H && !G[r][c]) r++;
    if (r >= H) return;
    const ok = cc => cc >= 0 && cc < W && G[r][cc] && !G[r - 1][cc] && !this.dolu[r - 1][cc] && !this.dikenHucre.has(r + ',' + cc);
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
        case 'maymun': case 'kopek': case 'kertenkele': case 'buyucu': this.atesEden(d, dt); break;
        case 'kedi': case 'domuz': case 'golem': this.yakinSaldiri(d, dt); break;
        case 'bitki': this.bitkiGuncelle(d, dt); break;
        case 'fici': this.ficiGuncelle(d, dt); break;
        case 'ari': this.ariGuncelle(d, time); break;
        case 'yarasa': this.yarasaGuncelle(d, time, dt); break;
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
      if (d.hazir <= 0) { this.mermiAt(d, d.yon); d.atesBekle = { kopek: 1.8, buyucu: 2.6 }[d.tip] || 2.4; }
      return;
    }
    d.atesBekle -= dt;
    const ayniZemin = yerdeMi(p.body) && Math.abs(p.body.bottom - b.bottom) < 8;
    if (Math.abs(dx) < CONFIG.atisMenzil * 32 && ayniZemin && !this.durum.olu) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      b.setVelocityX(0);
      if (d.atesBekle <= 0) {
        // kertenkele: oku taşıyan kare (2.) görünürken atar · büyücü: asalı kareler yavaşça, sonunda atar
        d.hazir = { kertenkele: 0.12, buyucu: 1.25 }[d.tip] || 0.4;
        d.play('d_' + d.ad + (d.tip === 'buyucu' ? '_buyu' : '_at'));
      }
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
    const p = this.player, b = d.body, dx = p.x - d.x, kedi = d.tip === 'kedi', golem = d.tip === 'golem';
    if (d.saldiri > 0) {
      d.saldiri -= dt;
      b.setVelocityX(kedi && d.saldiri > 0.12 && d.saldiri < 0.36 ? d.yon * 240 : 0);
      if (!d.vurdu && d.saldiri < (kedi ? 0.25 : 0.22)) {
        d.vurdu = true;
        const on = (p.x - d.x) * d.yon;
        const kenar = (b.width + p.body.width) / 2;   // gövdeler arası boşluk + menzil
        if (!this.durum.olu && on > -10 && on < (kedi ? 52 : kenar + 22) && Math.abs(p.body.bottom - b.bottom) < 40) this.oyuncuHasar(d.x);
        if (!kedi) this.cameras.main.shake(90, 0.004);
      }
      if (d.saldiri <= 0) { d.dinlen = kedi ? 1 : 1.5; this.dusmanAnim(d, 'dur'); }
      return;
    }
    if (d.dinlen > 0) { d.dinlen -= dt; b.setVelocityX(0); return; }
    const ayni = !this.durum.olu && Math.abs(p.body.bottom - b.bottom) < 24 && p.x >= d.minX - 24 && p.x <= d.maxX + 24;
    const vurMesafe = kedi ? 120 : (b.width + p.body.width) / 2 + 14;   // domuz / golem yanına gelip vurur
    if (ayni && Math.abs(dx) < vurMesafe) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      d.saldiri = kedi ? 0.48 : golem ? 0.7 : 0.6;
      d.vurdu = false;
      d.play('d_' + d.ad + '_saldir');
      this.ses(kedi ? 'bastonSalla' : 'bastonVur');
      return;
    }
    if (!kedi && ayni && Math.abs(dx) < 6 * 32) {   // domuz / golem: oyuncuyu görünce üstüne yürür
      d.yon = Math.sign(dx) || 1; d.setFlipX(d.yon < 0);
      b.setVelocityX(d.yon * d.hiz * 1.4);
    } else this.devriye(d, dt);
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

  // Bitki: yerinde durur, oyuncuya döner; 7 karo içinde ve görüşteyse ağzını açıp eğimli zehir tükürür (2.2 sn arayla)
  bitkiGuncelle(d, dt) {
    const p = this.player, b = d.body, dx = p.x - d.x, dy = p.body.bottom - b.bottom;
    b.setVelocityX(0);
    if (d.hazir > 0) { d.hazir -= dt; if (d.hazir <= 0) this.zehirAt(d); return; }
    d.atesBekle -= dt;
    const gor = !this.durum.olu && this.cameras.main.worldView.contains(d.x, d.y - 20)
      && Math.abs(dx) < 6 * 32 + 16 && dy > -140 && dy < 80;
    if (gor) {
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      if (d.atesBekle <= 0) { d.hazir = 0.2; d.atesBekle = 2.2; d.play('d_bitki_at'); return; }
    }
    if (!(d.anims.isPlaying && d.anims.currentAnim.key === 'd_bitki_at')) this.dusmanAnim(d, 'bekle');
  },

  // Zehir: ağzından hafif yukarı çıkar, alçak bir yayla önündeki 5. karoya düşer; yere ya da oyuncuya çarpınca zehirVur sesi
  zehirAt(d) {
    const M = ASSETLER.dusman.zehir, yon = d.yon, g = CONFIG.fizik.yercekimi;
    const agizY = d.y - 20, h = d.y - agizY, vy = -200;
    const t = (-vy + Math.sqrt(vy * vy + 2 * g * h)) / g;     // ağızdan zemine iniş süresi
    const uzak = 5 * 32 - 18;
    const m = this.mermiler.create(d.x + yon * 18, agizY, 'zehir').setDepth(7);
    m.setDisplaySize(M.gen, M.gen * M.h / M.w);
    m.body.setAllowGravity(true);
    m.body.setSize(M.w * 0.4, M.h * 0.6, true);
    m.setVelocity(yon * uzak / t, vy);
    m.zehir = true; m.omur = 2.6;
    this.ses('zehirAt');
  },

  // Fıçı: aynı zeminde oyuncuyu görünce durur, kurulur (0.5 sn), sonra top olup oyuncuya doğru yavaş yavaş hızlanarak
  // dönerek atılır; zemininin ucuna varınca durur, bir tur (iki dönüş) yürür, sonra yeniden atılabilir.
  // Dönerken vurulmaz, üstünden pogo da işlemez — değen oyuncu hasar alır.
  ficiGuncelle(d, dt) {
    const p = this.player, b = d.body, dx = p.x - d.x;
    if (d.durum === 'hazir') {
      b.setVelocityX(0);
      d.x += Math.sin(this.time.now * 0.08) * 0.6;   // titreme
      if ((d.sure -= dt) <= 0) this.ficiDon(d, true, Math.sign(dx) || d.yon);
      return;
    }
    if (d.durum === 'don') {
      d.hizX = Math.min(d.hizX + 300 * dt, 290);
      b.setVelocityX(d.yon * d.hizX);
      const T = d.topImg, s = d.scaleX;
      T.setPosition(d.x, d.y + DUSMAN_GOMME.fici - (168 - 87) * s);
      T.rotation += d.yon * d.hizX * dt / (75 * s);
      const uc = (d.yon > 0 && d.x >= d.maxX - 1) || (d.yon < 0 && d.x <= d.minX + 1)
        || (b.blocked.right && d.yon > 0) || (b.blocked.left && d.yon < 0);
      if (uc || Math.abs(d.x - d.donX) >= 12 * 32 || (d.sure -= dt) <= 0) {   // en çok 12 karo döner
        this.ficiDon(d, false);
        if (uc) d.yon = -d.yon;
        d.dinlen = 2;   // 2 sn yürür, sonra oyuncu yakınsa yine döner
      }
      return;
    }
    this.devriye(d, dt);
    this.dusmanAnim(d, 'yuru');
    d.setFlipX(d.yon < 0);
    if (d.dinlen > 0) d.dinlen -= dt;
    const gor = !this.durum.olu && Math.abs(p.body.bottom - b.bottom) < 24 && Math.abs(dx) < 6 * 32
      && p.x >= d.minX - 24 && p.x <= d.maxX + 24;
    if (gor && !(d.dinlen > 0)) {
      d.durum = 'hazir'; d.sure = 0.5; d.yon = Math.sign(dx) || 1; d.setFlipX(d.yon < 0);
      this.dusmanAnim(d, 'hazir');
    }
  },

  ficiDon(d, basla, yon) {
    if (basla) {
      d.durum = 'don'; d.yon = yon; d.hizX = 0; d.sure = 6; d.donX = d.x;
      if (!d.topImg) d.topImg = this.add.image(0, 0, 'd_fici', 6).setOrigin(91 / 184, 87 / 168).setDepth(6);
      d.topImg.setScale(d.scaleX).setFlipX(yon < 0).setVisible(true).setRotation(0);
      d.setVisible(false);
      this.ses('kaydir1');
    } else {
      d.durum = 'yuru';
      if (d.topImg) d.topImg.setVisible(false);
      d.setVisible(true);
    }
  },

  // Yarasa: görüş alanına girince oyuncunun 150 px yanına, biraz üstüne uçar; aynı hizadaysa durup ses dalgası atar
  // (2.2 sn arayla). 560 px uzaklaşınca evine döner, orada süzülür.
  yarasaGuncelle(d, time, dt) {
    const p = this.player, b = d.body, dx = p.x - d.x, dy = (p.y - 30) - d.y;
    const gorus = this.cameras.main.worldView.contains(d.x, d.y);
    if (gorus && !this.durum.olu) d.kovala = true;
    else if (Math.hypot(dx, dy) > 560) d.kovala = false;
    d.atesBekle -= dt;
    if (d.saldiri > 0) {
      d.saldiri -= dt; b.setVelocity(0, 0);
      if (!d.atti && d.saldiri < 0.15) { d.atti = true; this.mermiAt(d, d.yon); }
      if (d.saldiri <= 0) this.dusmanAnim(d, 'uc');
      return;
    }
    let hx, hy;
    if (d.kovala) {
      hx = p.x + (dx > 0 ? -150 : 150); hy = p.y - 34 + Math.sin(time * 0.004 + d.faz) * 12;
      d.yon = Math.sign(dx) || 1;
      d.setFlipX(d.yon < 0);
      if (gorus && d.atesBekle <= 0 && Math.abs(dy) < 40 && Math.abs(dx) < CONFIG.atisMenzil * 32) {
        d.saldiri = 0.45; d.atti = false; d.atesBekle = 2.2;
        d.play('d_yarasa_saldir');
        return;
      }
    } else {
      hx = d.baslangicX + Math.sin(time * 0.0014 + d.faz) * 60;
      hy = d.baslangicY + Math.sin(time * 0.003 + d.faz) * 20;
      d.setFlipX(b.velocity.x < 0);
    }
    b.setVelocity(Phaser.Math.Clamp((hx - d.x) * 1.6, -115, 115), Phaser.Math.Clamp((hy - d.y) * 1.6, -95, 95));
  },

  // Örümcek: tavandan ipiyle inip çıkar
  orumcekGuncelle(d, time) {
    const t = (Math.sin(time * 0.0014 + d.faz) + 1) / 2;
    d.y = d.ustY + (d.altY - d.ustY) * t;
    this.ipGrafik.lineStyle(1.5, 0xeeeeee, 0.9)
      .lineBetween(d.x, d.tavan, d.x, d.y - ASSETLER.dusman.orumcek.boy * CONFIG.dusmanOlcek * 0.45);
  },

  mermiAt(d, yon) {
    const kopek = d.tip === 'kopek', ok = d.tip === 'kertenkele', yar = d.tip === 'yarasa', buy = d.tip === 'buyucu';
    const ad = kopek ? 'mizrak' : ok ? 'ok' : yar ? 'dalga' : buy ? 'buyu' : 'atesTopu', M = ASSETLER.dusman[ad];
    if (kopek || ok) this.ses('mizrak');
    else if (yar) this.ses('olAri', { volume: 0.5, rate: 1.6 });
    else if (buy) this.ses('gizli', { volume: 0.6, rate: 1.4 });
    else { this.atesSira = !this.atesSira; this.ses(this.atesSira ? 'ates1' : 'ates2'); }
    const m = this.mermiler.create(d.x + yon * (ok ? 24 : yar ? 26 : buy ? 22 : 18), yar ? d.y + 4 : d.y - (kopek ? 18 : ok ? 20 : buy ? 26 : 20), ad).setDepth(7);
    if (buy) m.hasar = 2;
    m.setDisplaySize(M.gen, M.gen * M.h / M.w).setFlipX(yon < 0);
    m.body.setAllowGravity(false);
    m.body.setSize(M.w * 0.7, M.h * 0.6, true);
    m.setVelocityX(yon * (kopek ? 280 : ok ? 260 : yar ? 230 : buy ? 200 : 210));
    m.omur = 2.6;
    m.baslaX = m.x;
  },

  updateMermiler(dt) {
    this.mermiler.getChildren().slice().forEach(m => {
      if (m.zehir) m.rotation = Math.atan2(m.body.velocity.y, m.body.velocity.x);   // zehir uçuş yönüne bakar
      if ((m.omur -= dt) <= 0 || (m.baslaX !== undefined && Math.abs(m.x - m.baslaX) > CONFIG.mermiMenzil * 32)) m.destroy();
    });
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
    this.bossSira = (this.bossSira || 0) % 13 + 1;   // boss1 … boss13 sırayla
    this.bossSesObj = sesBaslat(this, 'boss' + this.bossSira);
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
    const donuyor = d.tip === 'fici' && d.durum === 'don';
    if (!donuyor && this.pogoModu && b.velocity.y > 50 && (b.bottom - d.body.top) < 22) {   // pogo ile üstten
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
    if (d.tip === 'fici' && d.durum === 'don') return false;   // dönerken vurulmaz
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
    if (d.topImg) { d.topImg.destroy(); d.topImg = null; d.setVisible(true); }
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
