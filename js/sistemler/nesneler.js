// Nesneler: toplanabilirler ve ödüller, sandıklar, kırılır taşlar, kontrol noktaları, gizli yerler, çıkış kapısı.
// Ödül türleri: puan anahtarı (CONFIG.puan), ses, dönen görsel (ASSETLER.toplanan)
const ODUL = {
  buyuk: { ses: 'buyukElmas', gorsel: 'buyukelmas' },   // mavi elmas
  kizil: { ses: 'kizilElmas', gorsel: 'kizilelmas' },   // yakut
  altin: { ses: 'elmas', gorsel: 'altin' },        // küçük altın para (tahta kasadan %75)
  capa: { ses: 'capaAltin', gorsel: 'capa' },       // çapalı altın para (tahta kasadan %25)
  yasam: { gorsel: null },                          // görseli şapka (ui_sapka)
  kalp: { gorsel: 'kalp' }
};

Object.assign(OyunSahnesi.prototype, {

  nesneleriKur() {
    const L = this.L;
    L.kontrol.forEach(([x, y]) => {
      const spr = this.boyutla(this.add.image(x, y + 2, 'bayrak0').setOrigin(0.5, 1).setDepth(1.6), 'bayrak0', { h: CONFIG.bayrakBoy });
      this.kontrolNoktalari.push({ x, y, spr, aktif: false });
    });
    this.doluKareler();
    L.elmaslar.forEach(([x, y]) => this.toplananYarat(this.elmaslar, 'elmas', ...this.bosYer(x, y)));
    this.durum.elmasToplam = L.elmaslar.length;
    L.ozeller.forEach(([tip, x, y]) => { if (ODUL[tip]) this.toplananYarat(this.ozeller, ODUL[tip].gorsel, ...this.bosYer(x, y)).tip = tip; });
    L.sandiklar.forEach(([x, y, odul]) => this.sandikYarat(x, y, odul));
    (L.kirTaslar || []).forEach(([x, y, tur, sabit]) => this.kirTasYarat(x, y, tur, sabit));
    this.kapi = this.boyutla(this.add.image(L.cikis[0], L.cikis[1] + 2, 'kapi').setOrigin(0.5, 1).setDepth(1.6), 'kapi', { h: 72 });
    this.gizliler = (L.gizliler || []).map(([x, y]) => ({ x, y, bulundu: false }));
  },

  // Zemin + başlangıçtaki taş / sandık kareleri: toplanabilir bunların içine konmaz
  doluKareler() {
    const L = this.L, T = L.karo, d = this.izgara.map(r => r.slice());
    const isle = (x, y) => { const r = Math.floor(y / T), c = Math.floor(x / T); if (d[r]) d[r][c] = 1; };
    (L.kirTaslar || []).forEach(([x, y]) => isle(x + 1, y + 1));
    L.sandiklar.forEach(([x, y]) => isle(x, y - 1));
    this.dolu = d;
  },

  // Elmas taşa değiyorsa en yakın boş yere (önce sola / sağa, sonra yukarı) kayar
  bosYer(x, y) {
    const T = this.L.karo, y_ = 9;
    const bos = (px, py) => {
      for (const [ax, ay] of [[px - y_, py - y_], [px + y_, py - y_], [px - y_, py + y_], [px + y_, py + y_]]) {
        const r = Math.floor(ay / T), c = Math.floor(ax / T);
        if (!this.dolu[r] || this.dolu[r][c]) return false;
      }
      return true;
    };
    if (bos(x, y)) return [x, y];
    for (let k = 4; k <= 96; k += 4) {
      if (bos(x - k, y)) return [x - k, y];
      if (bos(x + k, y)) return [x + k, y];
    }
    for (let k = 4; k <= 64; k += 4) if (bos(x, y - k)) return [x, y - k];
    return [x, y];
  },

  // ---- Toplanabilirler ve ödüller ----
  // Dönen görsel (ASSETLER.toplanan), boyu CONFIG.toplanBoy[ad]. grup null ise sadece görsel.
  toplananYarat(grup, ad, x, y) {
    const TP = ASSETLER.toplanan, r = TP.sira.indexOf(ad);
    const o = grup ? grup.create(x, y, 'toplanan', r * 6) : this.add.sprite(x, y, 'toplanan', r * 6);
    o.setScale(CONFIG.toplanBoy[ad] / (TP.h - 8)).setDepth(2);
    o.play({ key: 't_' + ad, startFrame: Phaser.Math.Between(0, 5) });
    if (grup) o.refreshBody();
    return o;
  },

  elmasAl(e) {
    if (!e.active) return;
    e.disableBody(true, true);
    this.ses('para' + Phaser.Math.Between(1, 5));
    this.durum.elmas++;
    this.durum.puan += CONFIG.puan.elmas;
    this.hudGuncelle();
  },

  ozelAl(o) {
    if (!o.active) return;
    o.disableBody(true, true);
    this.odulVer(o.tip, o.x, o.y, false);
  },

  // Ödül ver: kalp (+1 can), yasam (+1 yaşam) ya da puanlı taş/para. goster: görseli yukarı süzülür (sandıktan çıkınca)
  odulVer(tur, x, y, goster) {
    if (tur === 'kalp') this.kalpVer(x, y);
    else if (tur === 'yasam') this.yasamVer(x, y);
    else {
      this.puanEkle(CONFIG.puan[tur], x, y - 20);
      if (ODUL[tur].ses) this.ses(ODUL[tur].ses);
    }
    if (goster) {
      const el = ODUL[tur].gorsel ? this.toplananYarat(null, ODUL[tur].gorsel, x, y - 10).setDepth(20)
        : this.add.image(x, y - 10, 'ui_sapka').setDepth(20);
      if (!ODUL[tur].gorsel) el.setScale(24 / el.height);
      this.tweens.add({ targets: el, y: y - 60, alpha: 0, duration: 800, onComplete: () => el.destroy() });
    }
  },

  yasamVer(x, y) {
    this.durum.yasam++;
    this.ses('can');
    this.popup(x, y - 20, '+1', 'ui_sapka');
    this.hudGuncelle();
  },

  // +1 can; can doluysa puan
  kalpVer(x, y) {
    const S = this.durum;
    this.ses('can');
    if (S.can < CONFIG.oyuncu.canMax) { S.can++; this.popup(x, y - 20, '+1', 'ui_kalp'); this.hudGuncelle(); }
    else this.puanEkle(CONFIG.puan.kalpFazla, x, y - 20);
  },

  // ---- Sandık ----
  // x, zemin y, ödül. Ağırlıklı kutu: üstüne çıkılır, itilir / çekilir; vurunca ya da pogo ile açılır.
  sandikYarat(x, y, odul) {
    const s = this.sandiklar.create(x, y - 1, 'sandik').setOrigin(0.5, 1).setDepth(2);
    this.boyutla(s, 'sandik', { w: 32 });
    Object.assign(s, { odul, acik: false, govdeW: 30, govdeH: s.displayHeight - 2 });
    this.kutuGovdesi(s);
    return s;
  },

  // Sandık / taş ortak gövde ayarı: alt kenara hizalı sabit kutu (görsel değişse de aynı).
  // gommeD: görsel gövdenin bu kadar px altına çizilir (yerde zemin payı, taş üstünde perspektif payı); gövde yerinde kalır.
  kutuGovdesi(s) {
    const w = s.govdeW / s.scaleX, h = s.govdeH / s.scaleY, k = (s.gommeD || 0) / s.scaleY;
    s.setOrigin(0.5, 1 - k / s.frame.height);
    s.body.setSize(w, h, false).setOffset((s.frame.width - w) / 2, s.frame.height - h - k);
    s.body.pushable = false;   // oyuncu çarparak itemez; itme / çekme kodla
    s.body.setDragX(900);
    s.setMaxVelocity(400, CONFIG.fizik.maxDusme);
  },

  sandikAc(s) {
    if (s.acik) return;
    s.acik = true;
    s.setTexture('sandikAcik');
    this.boyutla(s, 'sandikAcik', { w: 34 });
    this.kutuGovdesi(s);   // açık sandık da aynı kutu
    this.odulVer(s.odul, s.x, s.y, true);
    this.hudGuncelle();
  },

  // Açık sandığa vurulunca vuruş yönünde 2 karo kayar (yavaşlayarak durur)
  sandikKaydir(s, yon) {
    s.kaymaYon = yon;
    s.kaymaHedef = s.x + yon * this.L.karo * 2;
  },

  // Sandık kayması + hızla düşen sandık / taş yere değince bir kez ses
  sandikDusmeGuncelle() {
    this.sandiklar.getChildren().forEach(s => {
      if (!s.active || !s.body || !s.body.enable) return;
      if (s.kaymaHedef !== undefined && s.kaymaHedef !== null) {
        const kalan = (s.kaymaHedef - s.x) * s.kaymaYon;
        if (kalan <= 1 || s.body.blocked[s.kaymaYon > 0 ? 'right' : 'left'] || this.cekSandik === s) {
          s.kaymaHedef = null;
          s.body.setVelocityX(0);
        } else s.body.setVelocityX(s.kaymaYon * Phaser.Math.Clamp(kalan * 4, 40, 220));
      }
      // Vurulup kayan sandık düşmana çarparsa düşman ölür (patron 1 hasar)
      if (s.kaymaHedef !== undefined && s.kaymaHedef !== null && Math.abs(s.body.velocity.x) > 20) {
        const r = govdeRect(s.body); r.x -= 3; r.width += 6;
        this.dusmanlar.getChildren().forEach(d => {
          if (d.active && !d.oldu && d.body.enable && Phaser.Geom.Intersects.RectangleToRectangle(r, govdeRect(d.body)))
            this.dusmanHasar(d, d.tip === 'boss' ? 1 : 99);
        });
      }
      const yerde = yerdeMi(s.body);
      if (!yerde && s.body.velocity.y > 150) s.dusuyor = true;
      else if (yerde && s.dusuyor) { s.dusuyor = false; this.ses('sandikDus'); }
    });
  },

  // ---- Kırılır taşlar (assets/nesne/kirTas.png: sağlam, çatlak, çatlak, kırılıyor, enkaz) ----
  // x, y = sol üst (1 karo). sabit: havada durur (itilmez / çekilmez / düşmez), sadece kırılır.
  // Taşlar normalde uykudadır (yerçekimsiz, hareketsiz → üst üste sağlam durur). Altı boşalırsa (alttaki kırıldı / çekildi)
  // fizik motoru yerine elle düşer ve ilk desteğe oturur (üst üste taşlar birbirine gömülmez). İtilen / çekilen taş
  // o sırada fizikle hareket eder (uyanık), durunca yeniden uyur.
  kirTasYarat(x, y, tur, sabit) {
    const T = this.L.karo, sira = Math.max(0, KIRTAS.indexOf(tur)) * 5;
    const s = this.sandiklar.create(x + T / 2, y + T, 'kirTas', sira).setOrigin(0.5, 1).setDepth(2).setDisplaySize(T, T);
    Object.assign(s, { kirTas: true, tur, kirSira: sira, vurus: 0, acik: true, govdeW: T, govdeH: T, dusHiz: 0 });
    this.kutuGovdesi(s);
    if (sabit) { s.sabit = true; s.body.setAllowGravity(false).setImmovable(true); }
    else this.tasUyut(s);
    return s;
  },

  // Her sandık / taş: altında başka taş / sandık varsa onun üst kenar payına oturur, yoksa zemine gömülür.
  // Üstteki alttakinin önünde çizilir.
  gommeGuncelle() {
    const T = this.L.karo, ust = new Map(), liste = this.sandiklar.getChildren().filter(s => s.active && s.body && s.body.enable);
    liste.forEach(s => ust.set(Math.floor(s.body.center.x / T) + ',' + Math.round(s.body.top / T), s));
    liste.sort((a, b) => b.body.bottom - a.body.bottom).forEach(s => {
      const alt = ust.get(Math.floor(s.body.center.x / T) + ',' + Math.round(s.body.bottom / T));
      const taban = alt && alt !== s && Math.abs(alt.body.top - s.body.bottom) < 3 ? (alt.gommeTaban || 0) + CONFIG.ustUsteGomme : this.zeminGomme;
      s.gommeTaban = taban;
      const d = taban - (s.kirTas && s.tur !== 'kasa' ? CONFIG.tasYukari : 0);   // taşlar kasalardan biraz yukarıda durur
      if (s.gommeD === d) return;
      s.gommeD = d;
      s.setDepth(2 + d / 1000);
      this.kutuGovdesi(s);
    });
  },

  tasUyut(s) {
    s.uyanik = false;
    s.body.setVelocity(0, 0).setAllowGravity(false).setImmovable(true);
  },

  // İtme / çekme başlarken: taş fizikle hareket eder
  tasUyandir(s) {
    if (!s || s.sabit) return;
    s.itZaman = this.time.now;
    if (s.uyanik) return;
    s.uyanik = true;
    s.dusHiz = 0;
    s.body.setAllowGravity(true).setImmovable(false);
  },

  // Taşın altındaki ilk desteğin üst kenarı (zemin ızgarası ya da başka sandık / taş)
  destekY(s) {
    const T = this.L.karo, b = s.body, alt = b.bottom;
    let en = this.dunyaY + T;
    for (let c = Math.floor((b.left + 2) / T); c <= Math.floor((b.right - 2) / T); c++) {
      for (let r = Math.max(0, Math.floor((alt - 1) / T)); r < this.izgara.length; r++) {
        if (this.izgara[r][c] && r * T >= alt - 1) { en = Math.min(en, r * T); break; }
      }
    }
    this.sandiklar.getChildren().forEach(u => {
      if (u === s || !u.active || !u.body.enable || u.kiriliyor) return;
      const ub = u.body;
      if (ub.right > b.left + 2 && ub.left < b.right - 2 && ub.top >= alt - 1) en = Math.min(en, ub.top);
    });
    return en;
  },

  // Uykudaki taşlar: altı boşsa elle düşer (yerçekimi), desteğe oturur; düşerken altındaki düşmanı ezer.
  // Uyanık taşlar durunca (yerde, hızsız, 0.25 sn itilmeden) yeniden uyur.
  taslariGuncelle(dt) {
    this.sandiklar.getChildren().forEach(s => {
      if (!s.active || !s.kirTas || s.sabit || s.kiriliyor) return;
      const b = s.body;
      if (s.uyanik) {
        if (this.cekSandik !== s && yerdeMi(b) && Math.abs(b.velocity.y) < 5 && Math.abs(b.velocity.x) < 5
          && this.time.now - (s.itZaman || 0) > 250) this.tasUyut(s);
        return;
      }
      const hedef = this.destekY(s);
      if (hedef <= b.bottom + 0.5) return;
      s.dusHiz = Math.min(s.dusHiz + CONFIG.fizik.yercekimi * dt, CONFIG.fizik.maxDusme);
      const yeni = Math.min(hedef, b.bottom + s.dusHiz * dt);
      s.y = yeni;
      b.reset(s.x, s.y);
      if (s.dusHiz > 60) this.dusmanlar.getChildren().forEach(d => {
        if (d.active && !d.oldu && d.body.enable && Phaser.Geom.Intersects.RectangleToRectangle(govdeRect(b), govdeRect(d.body)))
          this.dusmanHasar(d, d.tip === 'boss' ? 1 : 99);
      });
      if (yeni >= hedef) {   // oturdu
        if (s.dusHiz > 150) this.ses('sandikDus');
        s.dusHiz = 0;
      }
    });
  },

  // Baston ya da pogo vuruşu: 1. ve 2. vuruş çatlatır (rock1, rock2), 3. vuruş kırar → enkaz → solup kaybolur.
  // Tahta kasa (kasa): 2 vuruşta kırılır (tahtaVur → tahtaKir), altın para düşürür (%75 küçük, %25 çapalı).
  // Her vuruşta türüne ait parçalar vuruş yönüne fırlar; kristal taş kırılınca 1–5 küçük elmas saçar.
  tasVur(s) {
    if (!s.active || s.kiriliyor) return;
    s.vurus++;
    const kasa = s.tur === 'kasa', gerek = kasa ? 2 : 3;
    const yon = Math.sign(s.x - this.player.x) || this.bakis || 1;
    this.tasParcala(s.x, s.y - 16, s.tur, s.vurus < gerek ? 3 : 2, yon);
    if (s.vurus < gerek) {
      this.ses(kasa ? 'tahtaVur' : 'tasVur' + s.vurus);
      s.setFrame(s.kirSira + s.vurus);
      this.tweens.add({ targets: s, angle: { from: -2, to: 2 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => s.setAngle(0) });
      return;
    }
    s.kiriliyor = true;
    if (this.cekSandik === s) this.cekBirak();
    this.ses(kasa ? 'tahtaKir' : 'tasKir');
    // Havadaysa kırılan taş önce altındaki ilk desteğe düşer, enkaz orada oluşup solar
    const hedef = Math.min(this.destekY(s), this.dunyaY), dusus = Math.max(0, hedef - s.body.bottom);
    s.body.enable = false;   // üstündekiler desteksiz kalır ve düşer (taslariGuncelle)
    s.setFrame(s.kirSira + 3);
    const sure = dusus > 2 ? Math.sqrt(2 * dusus / CONFIG.fizik.yercekimi) * 1000 : 110;
    this.tweens.add({ targets: s, y: s.y + dusus, duration: sure, ease: 'Quad.easeIn', onComplete: () => {
      if (!s.active) return;
      s.setFrame(s.kirSira + 4);
      this.tasParcala(s.x, s.y - 12, s.tur, 7, yon);
      if (s.tur === 'kristal') this.taneSac(s.x, s.y - 14, yon);
      if (kasa) {
        const tip = Math.random() < 0.75 ? 'altin' : 'capa';
        this.toplananYarat(this.ozeller, ODUL[tip].gorsel, s.x, s.y - 16).tip = tip;
      }
      this.tweens.add({ targets: s, alpha: 0, delay: 90, duration: 300, onComplete: () => s.destroy() });
    } });
  },

  // Kristal taştan 1–5 küçük elmas (tane) saçılır: fizikle zıplayıp yerde durur, toplanınca CONFIG.puan.tane
  taneSac(x, y, yon) {
    const n = Phaser.Math.Between(1, 5);
    for (let i = 0; i < n; i++) {
      const t = this.taneler.create(x + Phaser.Math.Between(-6, 6), y, 'tane').setDepth(3);
      t.setScale(CONFIG.toplanBoy.tane / t.height);
      t.body.setVelocity(yon * Phaser.Math.Between(20, 130) + Phaser.Math.Between(-40, 40), -Phaser.Math.Between(160, 320));
      t.body.setBounce(0.35, 0.35).setDragX(160);
      t.body.mass = 0.01;
      t.alinir = this.time.now + 300;   // hemen toplanmasın, saçıldığı görünsün
    }
  },

  taneAl(t) {
    if (!t.active || this.time.now < t.alinir) return;
    const x = t.x, y = t.y;
    t.destroy();
    this.ses('para' + Phaser.Math.Between(1, 5));
    this.puanEkle(CONFIG.puan.tane, x, y - 10);
  },

  // ---- Kontrol noktaları, gizli yerler, çıkış ----
  kontrolNoktalariGuncelle() {
    const p = this.player;
    this.kontrolNoktalari.forEach(c => {
      if (c.aktif || Math.abs(p.x - c.x) >= 50 || Math.abs(p.y - c.y) >= 120) return;
      c.aktif = true;
      c.spr.setTexture('bayrak1').setOrigin(0.32, 1);
      this.boyutla(c.spr, 'bayrak1', { h: CONFIG.bayrakBoy });
      this.spawn = { x: c.x, y: c.y - 2 };
      this.popup(c.x, c.y - 80, 'Kontrol noktası!');
      this.ses('bayrak');
    });
  },

  // Yaklaşınca bir kez gizli yer sesi; aynı alandaki (300 px içi) noktalar birlikte bulunmuş sayılır
  gizlilerGuncelle() {
    const p = this.player;
    this.gizliler.forEach(z => {
      if (z.bulundu || Math.abs(p.x - z.x) >= 110 || Math.abs(p.y - z.y) >= 90) return;
      this.gizliler.forEach(q => { if (Math.hypot(q.x - z.x, q.y - z.y) < 300) q.bulundu = true; });
      this.ses('gizli');
    });
  },

  // Patron yenilince: ödül sandığı çıkar, kapı açılır, kapıdan girince bölüm biter
  cikisAc(bossX, bossY) {
    this.sandikYarat(bossX, bossY, 'buyuk');
    this.kapiAc(false);
  },

  kapiAc(sessiz) {
    if (!sessiz) this.ses('kapiAcil');
    const k = this.kapi;
    k.setTexture('kapiAcik').setOrigin(0.41, 1);
    this.boyutla(k, 'kapiAcik', { h: 72 });
    const cikis = this.add.zone(k.x - 20, k.y - 64, 40, 64).setOrigin(0, 0);
    this.physics.add.existing(cikis, true);
    this.physics.add.overlap(this.player, cikis, () => this.bolumBitti());
    if (!sessiz) this.popup(k.x, k.y - 100, 'Kapı açıldı!');
  }
});
