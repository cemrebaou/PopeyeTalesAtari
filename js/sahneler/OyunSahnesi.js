// Oyun sahnesi: seviyeyi kurar, kamerayı ve döngüyü yönetir.
// Davranışlar ayrı dosyalarda bu sınıfa eklenir (Object.assign):
//   sistemler/oyuncu.js · sistemler/dusmanlar.js · sistemler/nesneler.js · sistemler/efektler.js
class OyunSahnesi extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.bolumNo = this.registry.get('bolum') || 0;   // BOLUMLER sırası (main.js)
    const L = BOLUMLER[this.bolumNo];
    // v1.55: yüzme bölümü ayrı sahnede (YuzmeSahnesi) — bu sahne kurulmadan oraya geçilir
    this.yuzmeyeGec = !!L.yuzme;
    if (L.yuzme) { this.scene.stop('UI'); this.scene.start('Yuzme'); return; }
    sesleriYukle(this);
    this.L = L;
    this.zeminGomme = CONFIG.zeminGomme;   // v1.63: tüm bölümlerde ortak — yere basan her şey zemin çizgisinin bu kadar altına çizilir
    this.dunyaG = L.genislik;
    this.dunyaY = L.yukseklik;
    this.durum = {
      puan: KAYIT.puan, elmas: 0, elmasToplam: 0,   // v1.10: puan kalıcı (dükkan parası)
      can: canMaxi(), yasam: CONFIG.oyuncu.yasam,
      olu: false, bitti: false, oyunBitti: false
    };
    this.oyuncuDurumuSifirla();
    this.touch = { sol: false, sag: false, yukari: false, asagi: false, zipla: false, saldir: false };
    this.selaleSes = null;
    this.haritaModu = false;

    this.physics.world.setBounds(0, 0, this.dunyaG, this.dunyaY + 300);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, this.dunyaG, this.dunyaY).setBackgroundColor(0x141c26);

    this.seviyeKur();
    this.oyuncuKur();
    this.carpismalariKur();
    if (!L.boss && !L.patron) this.kapiAc(true);   // patronsuz bölüm: çıkış kapısı baştan açık (v1.37: patron kapılı bölümde çıkış kapısı yok)
    this.girdiKur();
    this.kameraAyarla();
    this.scale.on('resize', this.kameraAyarla, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.kameraAyarla, this);
      this.selaleSes = sesDurdur(this.selaleSes);
      this.bossSesObj = sesDurdur(this.bossSesObj);
    });
    // Arayüz (HUD, dokunmatik tuşlar) ayrı sahnede: kamera yakınlaştırmasından etkilenmez
    if (this.scene.isActive('UI')) this.scene.get('UI').scene.restart();
    else this.scene.launch('UI');
  }

  // Tek seferlik ses (yardimci.js → sesCal)
  ses(ad, ayar) { sesCal(this, ad, ayar); }
  // ön1, ön2 … önN sırayla çalar, sondan sonra başa döner
  sesSira(on, n, ayar) {
    this.sesSayac = this.sesSayac || {};
    this.sesSayac[on] = (this.sesSayac[on] || 0) % n + 1;
    this.ses(on + this.sesSayac[on], ayar);
  }

  // ---- Kamera ----
  // Ekranı tam doldurur; yakınlık ekran yüksekliğine göre. Harita modunda (P) tüm dünya, kamera sabit.
  kameraAyarla() {
    const cam = this.cameras.main, K = CONFIG.kamera;
    const w = this.scale.width, h = this.scale.height;
    cam.setSize(w, h);
    const O = this.dukkanda ? this.dukkanOda : this.oda;   // v1.37: dükkan ya da oda (arena / bonus)
    if (O && !this.haritaModu) {
      if (O.tip === 'bonus') {   // iki katlı: genişliğe oturur, oyuncuyu yukarı / aşağı izler
        cam.setZoom(w / O.w);
        cam.setBounds(O.x, O.y - O.K, O.w, O.h + 2 * O.K);
        cam.startFollow(this.player, true, 0.12, 0.12).setDeadzone(0, 30);
        return;
      }
      cam.stopFollow(); cam.removeBounds();   // v1.08: dükkanda / arenada kamera sabit, odanın tamamını gösterir
      cam.setZoom(Math.min(h / O.h, w / O.w));
      cam.centerOn(O.x + O.w / 2, O.y + O.h / 2);
      return;
    }
    if (this.haritaModu) {
      cam.stopFollow();
      cam.setZoom(Math.min(w / this.dunyaG, h / this.dunyaY));
      cam.centerOn(this.dunyaG / 2, this.dunyaY / 2);
      return;
    }
    cam.setZoom(Math.min(h / K.gorunurY, w / K.minGorunurX));
  }

  haritaDegistir() {
    this.haritaModu = !this.haritaModu;
    const cam = this.cameras.main;
    if (this.haritaModu) cam.removeBounds();
    else if (!this.dukkanda && !this.oda) cam.setBounds(0, 0, this.dunyaG, this.dunyaY).startFollow(this.player, true, 0.12, 0.12);
    this.kameraAyarla();
  }

  // ---- Seviye ----
  seviyeKur() {
    const L = this.L, T = L.karo;
    const statik = () => this.physics.add.staticGroup();
    this.solids = statik();
    this.elmaslar = statik();
    this.ozeller = statik();
    this.sandiklar = this.physics.add.group();   // sandıklar ve kırılır taşlar: itilir, çekilir, üst üste durur
    this.dusmanlar = this.physics.add.group();
    this.mermiler = this.physics.add.group({ allowGravity: false });
    this.taneler = this.physics.add.group();   // kristal taştan saçılan küçük elmaslar
    this.ipGrafik = this.add.graphics().setDepth(5);   // örümcek ipleri
    this.dikenRect = [];
    this.sarmasikRect = [];
    this.kontrolNoktalari = [];

    // Karo katmanları (arka plan çarpışmasız) ve şelaleler
    this.karoKatmani(L.arka, -5);
    this.sahteKaroDuzelt();
    this.anaKatman = this.karoKatmani(L.on, 1);
    if (L.metal) this.metalCiz();   // v1.66: 4. bölüm metal demo
    this.sahteDuvarlarKur();
    this.selaleCiz();

    // Katı zemin: görünmez çarpışma gövdeleri + ızgara (devriye alanı, sarmaşık tavanı için)
    this.izgara = [...Array(L.yukseklik / T)].map(() => new Uint8Array(L.genislik / T));
    const kati = (x, y, w, h) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0, 0);
      this.physics.add.existing(z, true);
      this.solids.add(z);
      for (let r = y / T; r < (y + h) / T; r++) for (let c = x / T; c < (x + w) / T; c++) if (this.izgara[r]) this.izgara[r][c] = 1;
    };
    L.bloklar.forEach(q => kati(...q));
    (L.kayalar || []).forEach(([x, y]) => kati(x, y, T, T));
    // Dikenli zemin hücreleri: devriye üstlerine çıkmaz
    this.dikenHucre = new Set();
    L.dikenler.forEach(([x, y, w]) => {
      for (let c = Math.floor(x / T); c <= Math.floor((x + w - 1) / T); c++) this.dikenHucre.add(Math.round(y / T) + ',' + c);
    });

    this.dikenleriKur();
    this.sarmasiklariKur();
    this.nesneleriKur();   // nesneler.js: kontrol noktaları, toplanabilirler, sandıklar, taşlar, kapı, gizli yerler
    L.ipuclari.forEach(([x, y, yazi]) => {
      harfYazi(this, yazi, 11, 'sol').setPosition(x, y).setDepth(4);
      // v1.35: yazının altındaki ilk zemine tabela direği
      const c = Math.floor((x + 20) / T);
      for (let r = Math.floor(y / T); r < this.izgara.length; r++) if (this.izgara[r][c]) {
        this.nesneKoy(this.add.image(c * T + T / 2, r * T + this.zeminGomme, 'tabelaDirek'), 'tabelaDirek', 52 * CONFIG.olcek).setDepth(1.5);
        break;
      }
    });
    L.dusmanlar.forEach(e => this.dusmanYarat(e));
    if (L.boss) this.dusmanYarat({ tip: 'boss', x: L.boss[0], y: L.boss[1] });   // (v1.37: patron artık arenada, odalar.js)
    this.dukkanKur();   // dukkan.js (v1.08)
    this.odalarKur();   // odalar.js (v1.37): patron arenası, bonus odası
    this.susle();       // susler.js (v1.37): bitki / kaya / sarmaşık süsleri
  }

  // v1.66: metal bölüm — bloklar ve arka duvar 64 px metal karolarla (karo/metal_<kat>.png, 9 çeşit). Kat, hücrenin y'sine göre
  // L.metal'den seçilir; çeşit hücre konumundan (her açılışta aynı). Arka duvar aynı karolar, üstünde koyu örtü.
  // v1.67: Blitter yerine tek tek görsel — bazı cihazlarda Blitter ölçeği uygulanmıyor, karolar 2 kat büyük çıkıyordu.
  metalCiz() {
    const L = this.L, S = 64, izgara = new Set();
    const kat = y => L.metal.find(([y0]) => y >= y0)[1];
    const cesit = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;
    const yaz = (c, r, d) => {
      this.add.image(c * S, r * S, 'metal_' + kat(r * S + S / 2), cesit(c, r) % 9).setOrigin(0, 0)
        .setDisplaySize(S + 0.5, S + 0.5).setDepth(d === 'a' ? -6 : 1);   // +0.5: karo arası ince çizgi kalmasın
    };
    L.bloklar.forEach(([x, y, w, h]) => {
      for (let r = y / S; r < (y + h) / S; r++) for (let c = x / S; c < (x + w) / S; c++) { izgara.add(c + ',' + r); yaz(c, r, 'o'); }
    });
    for (let r = 0; r < L.yukseklik / S; r++) for (let c = 0; c < L.genislik / S; c++) if (!izgara.has(c + ',' + r)) yaz(c, r, 'a');
    this.add.rectangle(0, 0, L.genislik, L.yukseklik, 0x04060b, 0.78).setOrigin(0, 0).setDepth(-5.5);   // arka duvar gölgede (zeminden ayırt edilsin)
  }

  // Karo katmanı: seviye verisindeki karakter satırları → tilemap (128 px kaynak, 32 px gösterim)
  karoKatmani(satirlar, derinlik) {
    const A = ASSETLER.tileset, L = this.L;
    if (!this.alfabeNo) {
      this.alfabeNo = {};
      for (let i = 0; i < L.alfabe.length; i++) this.alfabeNo[L.alfabe[i]] = i - 1;
    }
    const veri = satirlar.map(r => Array.from(r, ch => this.alfabeNo[ch]));
    const map = this.make.tilemap({ data: veri, tileWidth: A.boyut, tileHeight: A.boyut });
    const ts = map.addTilesetImage('tileset', 'tileset', A.boyut, A.boyut, A.extrude, A.extrude * 2);
    return map.createLayer(0, ts, 0, 0).setScale(L.karo / A.boyut).setDepth(derinlik);
  }

  zehirPatla(m) {
    if (!m.active) return;
    this.ses('zehirVur');
    // v1.28: damla görseli (ui_zehirDamla, saat 1 yönüne fırlar şekilde çizili) gidiş yönüne döndürülür
    for (let i = 0; i < 6; i++) {
      const y = m.y + 7;   // sıçrama biraz aşağıdan
      const dx = Phaser.Math.Between(-22, 22), dy = -Phaser.Math.Between(4, 18);
      const k = this.add.image(m.x, y, 'ui_zehirDamla').setDepth(8);
      k.setScale(Phaser.Math.Between(6, 10) / k.height).setRotation(Math.atan2(dy, dx) + Math.PI / 3 + Math.PI);   // v1.46: görsel 180° çevrildi (ters görünüyordu)
      this.tweens.add({ targets: k, x: m.x + dx, y: y + dy, alpha: 0, duration: 320, onComplete: () => k.destroy() });
    }
  }

  // v1.34: sahte duvarlı odanın tabanı (çimli üst karo) ve odaya bakan dış duvar kenarı dolgu taşa çevrilir:
  // sahte duvar alttaki ve yandaki taşla yarıksız birleşir; taban çimsiz olunca sandık gömülmez, duvarın altından görünmez.
  sahteKaroDuzelt() {
    const L = this.L, T = L.karo, bos = L.alfabe[0], on = L.on.map(r => Array.from(r));
    const dolu = (r, c) => r >= 0 && r < on.length && c >= 0 && c < on[r].length && on[r][c] !== bos;
    (L.sahte || []).forEach(([x, y, w, h]) => {
      const c0 = x / T, r0 = y / T, c1 = (x + w) / T, r1 = (y + h) / T;
      for (let c = c0; c < c1; c++) if (dolu(r1, c) && dolu(r1 + 1, c)) on[r1][c] = on[r1 + 1][c];
      [c0 - 1, c1].forEach(sc => {
        if (sc < 0 || sc >= on[0].length) return;
        for (let r = r0; r < r1; r++) if (!dolu(r, sc)) return;
        const dis = sc < c0 ? sc - 1 : sc + 1;   // dış duvarın öbür yanı da taş / harita kenarı olmalı
        if (dis >= 0 && dis < on[0].length && !dolu(r0, dis)) return;
        for (let r = r0; r < r1; r++) if (dolu(r1 + 1, sc)) on[r][sc] = on[r1 + 1][sc];
      });
    });
    L.on = on.map(r => r.join(''));
  }

  // Sahte duvarlar [x, y, w, h]: taş gibi görünür ama çarpışması yoktur (gizli oda). Karoları oyuncunun önünde ayrı
  // katmanda çizilir; oyuncu içine girince saydamlaşır, çıkınca yeniden taş olur.
  sahteDuvarlarKur() {
    const L = this.L, T = L.karo, bos = L.alfabe[0];
    this.sahteler = (L.sahte || []).map(([x, y, w, h]) => {
      const c0 = x / T, r0 = y / T, c1 = (x + w) / T, r1 = (y + h) / T;
      const veri = L.on.map((satir, r) => r < r0 || r >= r1 ? bos.repeat(satir.length)
        : Array.from(satir, (ch, c) => c >= c0 && c < c1 ? ch : bos).join(''));
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) this.anaKatman.removeTileAt(c, r);
      return { kat: this.karoKatmani(veri, 11), rect: new Phaser.Geom.Rectangle(x - 6, y - 6, w + 12, h + 12), ici: false };
    });
  }

  sahteGuncelle() {
    const p = this.player;
    this.sahteler.forEach(s => {
      const ici = s.rect.contains(p.x, p.y - 20);
      if (ici === s.ici) return;
      s.ici = ici;
      this.tweens.killTweensOf(s.kat);
      this.tweens.add({ targets: s.kat, alpha: ici ? 0.25 : 1, duration: 250 });
    });
  }

  // Şelaleler [x, w, y0, y1, onde]: dikeyde kesintisiz doku, aşağı akar. Arka planın önünde, zeminin arkasında; uçları zemine 16 px girer.
  // onde=1: oyuncunun ve zeminin önünde çizilir — arkasındaki gizli zemin ve içine giren oyuncu görünmez; taşa taşmasın diye
  // tam y0–y1 arasında (tavanın altından çıkar, alttaki zeminin hizasında kesilir). Yan yana şelaleler farklı evrede akar.
  selaleCiz() {
    const tex = this.textures.get('selaleOrta').getSourceImage();
    const T = this.L.karo, G = this.izgara;
    this.selaleler = (this.L.selaleler || []).map(([x, w, y0, y1, onde]) => {
      if (!onde && G) {   // v1.41: arkadaki şelale her zaman altındaki ilk zemine kadar iner (kısa kalmaz, taşa taşmaz)
        const c = Math.floor((x + w / 2) / T);
        let r = Math.floor(y0 / T) + 1;
        while (r < G.length && G[r] && !G[r][c]) r++;
        if (r < G.length) y1 = r * T;
      }
      const s = w / tex.width, pay = onde ? 0 : 16;
      const sp = this.add.tileSprite(x, y0 - pay, w, y1 - y0 + 2 * pay, 'selaleOrta').setOrigin(0, 0).setTileScale(s, s).setDepth(onde ? 11 : 0.5);
      sp.tilePositionY = Phaser.Math.Between(0, tex.height);
      return sp;
    });
  }

  // Dikenler: [x, zemin y, w]
  dikenleriKur() {
    const O = ASSETLER.obje.diken;
    this.L.dikenler.forEach(([x, y, w]) => {
      const n = Math.max(1, Math.round(w / 48)), pw = w / n, ph = pw * O.h / O.w;
      for (let i = 0; i < n; i++) this.add.image(x + i * pw, y + 3, 'diken').setOrigin(0, 1).setDisplaySize(pw + 1, ph).setDepth(1.5);
      this.dikenRect.push(new Phaser.Geom.Rectangle(x + 4, y - ph * 0.8, w - 8, ph * 0.8));
    });
  }

  // Sarmaşıklar: [x, y (üst), h] tırmanma alanı. Görsel üstteki ilk taşın altından başlar, taşın 8 px içine girer,
  // zeminin arkasında çizilir; tam parça sayısıyla döşenir (son yaprak yarım kalmaz). L.tirmanma 'zincir' ise zincir çizilir.
  sarmasiklariKur() {
    const T = this.L.karo, zincir = this.L.tirmanma === 'zincir', gen = zincir ? 14 : 21;
    this.L.sarmasiklar.forEach(([x, y, h], i) => {
      const ad = zincir ? 'zincir' : 'sarmasik' + (i % 3), O = ASSETLER.obje[ad], sx = gen / O.w;
      const c = Math.floor(x / T);
      let r = Math.floor((y - 1) / T), k = 0;
      while (r >= 0 && !this.izgara[r][c] && k < 12) { r--; k++; }
      const gy = (r >= 0 && this.izgara[r][c] ? (r + 1) * T : y) - 8, gh = y + h - gy;
      const n = Math.max(1, Math.round(gh / (O.h * sx)));
      this.add.tileSprite(x, gy, gen, gh, ad).setOrigin(0.5, 0).setDepth(0.95).setTileScale(sx, gh / (n * O.h));
      this.sarmasikRect.push(new Phaser.Geom.Rectangle(x - 9, y - 12, 18, h + 12));
    });
  }

  // Görseli kaynak oranında boyutlar (genişlik ya da yükseklik verilir)
  // v1.35: nesne2 görseli: dokuyu değiştirir, alt kenardaki gövde ortasından oturtur, boyunu h yapar
  nesneKoy(img, ad, h) {
    img.setTexture(ad).setOrigin((ASSETLER.nesne2[ad] || ASSETLER.nesne3[ad]).ox, 1);
    return this.boyutla(img, ad, { h });
  }

  boyutla(img, anahtar, { w, h }) {
    const O = ASSETLER.nesne2[anahtar] || ASSETLER.nesne3[anahtar] || ASSETLER.obje[anahtar];
    return w ? img.setDisplaySize(w, w * O.h / O.w) : img.setDisplaySize(h * O.w / O.h, h);
  }

  // ---- Çarpışmalar ----
  carpismalariKur() {
    const P = this.player, F = this.physics.add;
    const yerdeki = (d) => d.tip !== 'ari' && d.tip !== 'orumcek';   // uçanlar zeminden etkilenmez
    F.collider(P, this.solids);
    F.collider(P, this.sandiklar, (p, s) => this.sandikTemas(p, s), () => !this.tirmaniyor);
    F.collider(this.sandiklar, this.solids);
    F.collider(this.sandiklar, this.sandiklar);
    F.collider(this.dusmanlar, this.solids, null, yerdeki);
    // Düşen sandık / taş düşmanın kafasına inerse düşman ölür (patron 1 hasar)
    F.collider(this.dusmanlar, this.sandiklar, null, (d, s) => {
      if (!d.oldu && s.body.velocity.y > 60 && s.body.bottom - d.body.top < 18) {
        this.dusmanHasar(d, d.tip === 'boss' ? 1 : 99);
        return false;
      }
      return yerdeki(d);
    });
    F.overlap(this.mermiler, this.solids, (m) => { if (m.zehir) this.zehirPatla(m); m.destroy(); });
    // Mermiler sandık ve tahta kasalardan geçer, kırılır taşlarda durur
    F.overlap(this.mermiler, this.sandiklar, (m) => { if (m.zehir) this.zehirPatla(m); m.destroy(); },
      (m, s) => s.kirTas && s.tur !== 'kasa' && !s.kiriliyor);
    F.overlap(P, this.mermiler, (p, m) => {
      if (!m.active) return;
      const kaynakX = m.x - m.body.velocity.x, hasar = m.hasar || 1;   // destroy'dan önce oku
      if (m.zehir) this.zehirPatla(m);
      m.destroy();
      this.oyuncuHasar(kaynakX, hasar);
    });
    F.overlap(P, this.dusmanlar, (p, d) => this.dusmanTemas(p, d));
    // Toplanabilirler katı değil: işlem geri çağrısında alınır ve false döner → değme bilgisi (yerde / kafa çarpma) oluşmaz
    F.overlap(P, this.elmaslar, null, (p, e) => { this.elmasAl(e); return false; });
    F.overlap(P, this.ozeller, null, (p, o) => { this.ozelAl(o); return false; });
    F.overlap(P, this.taneler, null, (p, t) => { this.taneAl(t); return false; });
    // kristal taştan dökülen her elmas yere ilk değdiğinde bir kez elmasDus çalar
    F.collider(this.taneler, this.solids);
    F.collider(this.taneler, this.sandiklar);
  }

  // ---- Klavye ----
  girdiKur() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      sol: 'LEFT', sag: 'RIGHT', yukari: 'UP', asagi: 'DOWN', a: 'A', d: 'D', w: 'W', s: 'S',
      zipla: 'SPACE', z: 'Z', saldir: 'X', k: 'K', j: 'J', cek: 'C', l: 'L'
    });
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown-R', () => this.scene.restart());
    kb.on('keydown-P', () => this.haritaDegistir());
    // GELİŞTİRME (yayından önce silinecek): O → +10 000 puan (dükkanı denemek için)
    kb.on('keydown-O', () => { this.durum.puan += 10000; this.hudGuncelle(); });
    // GELİŞTİRME (yayından önce silinecek): harita modunda (P) tıklanan yere ışınlan, normal kameraya dön
    this.input.on('pointerdown', ptr => {
      if (!this.haritaModu) return;
      const w = ptr.positionToCamera(this.cameras.main);
      this.player.body.reset(w.x, w.y);
      this.player.body.setVelocity(0, 0);
      this.haritaDegistir();
    });
    // 1, 2, … → o bölümü yükle (bilgisayarda)
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].slice(0, BOLUMLER.length).forEach((ad, i) => {
      const ac = () => { this.registry.set('bolum', i); this.scene.restart(); };
      kb.on('keydown-' + ad, ac);
      kb.on('keydown-NUMPAD_' + ad, ac);
    });
  }

  // ---- Döngü ----
  update(time, delta) {
    if (this.yuzmeyeGec) return;
    const dt = Math.min(delta, 50) / 1000;
    if (this.durum.bitti || this.durum.oyunBitti) return;
    if (this.durum.puan !== KAYIT.puan) { KAYIT.puan = this.durum.puan; kayitYaz(); }
    this.dukkanGuncelle(dt);
    this.odalarGuncelle(dt);
    this.updatePlayer(time, dt);
    this.updateDusmanlar(time, dt);
    this.updateMermiler(dt);
    this.taslariGuncelle(dt);
    this.sandikDusmeGuncelle();
    this.gommeGuncelle();
    this.kontrolNoktalariGuncelle();
    this.gizlilerGuncelle();
    this.sahteGuncelle();
    this.selaleGuncelle(dt);
  }

  // Şelale akışı + sesi. Ses kadraja yaklaşırken (SELALE_DUYMA px) şelalenin olduğu taraftaki hoparlörden kısık başlar,
  // kadraja girdikçe artar ve iki taraftan gelir; uzaklaşırken tersi. En yakın şelale esas alınır.
  selaleGuncelle(dt) {
    this.selaleler.forEach(sp => { sp.tilePositionY -= CONFIG.selaleHiz * dt / sp.tileScaleY; });
    const v = this.cameras.main.worldView, D = CONFIG.selaleDuyma;
    let enSes = 0, enPan = 0;
    (this.L.selaleler || []).forEach(([x, w, y0, y1]) => {
      const dx = x + w < v.x ? x + w - v.x : x > v.right ? x - v.right : 0;   // kadraj dışındaki yatay uzaklık (işaretli)
      const dy = y1 < v.y ? v.y - y1 : y0 > v.bottom ? y0 - v.bottom : 0;
      const ses = Phaser.Math.Clamp(1 - Math.hypot(dx, dy) / D, 0, 1);
      if (ses > enSes) { enSes = ses; enPan = Phaser.Math.Clamp(dx / (D * 0.5), -1, 1); }
    });
    if (enSes > 0 && !this.selaleSes) this.selaleSes = sesBaslat(this, 'selale', { loop: true, volume: 0 });
    if (!this.selaleSes) return;
    if (enSes <= 0) { this.selaleSes = sesDurdur(this.selaleSes); return; }
    this.selaleSes.setVolume(0.4 * enSes * enSes);
    if (this.selaleSes.setPan) this.selaleSes.setPan(enPan);
  }
}
