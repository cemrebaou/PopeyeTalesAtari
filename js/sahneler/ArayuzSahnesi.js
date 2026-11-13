// Arayüz sahnesi: HUD, dokunmatik tuşlar, tam ekran tuşu, bitiş ekranları.
// Oyun kamerasının yakınlaştırmasından etkilenmez; ekran boyutu / yönü değişince yeniden yerleşir.
// Dokunmatik tuş yerleri (u birimi; pozitif x soldan, negatif x sağdan; y alttan)
const TUSLAR = {
  sol: [70, -70], sag: [175, -70], asagi: [122, -160],          // solda yürü + eğil (aç/kapa)
  zipla: [-70, -70], saldir: [-175, -70], yukari: [-122, -160]  // sağda zıpla + vur + tırman
};

class ArayuzSahnesi extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.oyunS = this.scene.get('Game');
    this.hazir = true;
    this.events.once('shutdown', () => {
      this.hazir = false;
      this.scale.off('resize', this.yerlestir, this);
    });
    this.hud = [];
    this.tamBtn = null;
    this.yetenekAcik = false;   // v1.44: yetenekler şeridi açık mı
    this.ekran = null;   // bitiş ekranı
    this.input.keyboard.on('keydown-F', tamEkranDegistir);
    this.surumYazi = this.add.text(0, 0, CONFIG.surum + '  ' + this.oyunS.L.ad, { fontFamily: 'monospace', color: '#ffffff' })
      .setOrigin(0, 1).setAlpha(0.7);
    this.tuslariKur();
    this.yerlestir();
    this.scale.on('resize', this.yerlestir, this);
  }

  // Arayüz tıklama sesi (hareket tuşları hariç)
  tik() { sesCal(this, 'tik'); }

  // Dokunmatik tuşlar (her cihazda). Görsel: ui_t_<ad>, basılı ui_tb_<ad>.
  // ▼ (asagi) aç/kapa: bas → eğil (tuş basılı kalır), tekrar bas → kalk; sarmaşıkta basılı tutunca aşağı iner.
  tuslariKur() {
    this.tuslar = [];   // v1.61: bilgisayarda da görünür (mobil oyun; geliştirme bilgisayarda)
    const O = this.oyunS;
    Object.keys(TUSLAR).forEach(ad => {
      const r = this.add.image(0, 0, 'ui_t_' + ad).setInteractive().setAlpha(0.85);
      const bas = (v) => { O.touch[ad] = v; };
      if (ad === 'asagi') {
        r.on('pointerdown', () => { bas(true); if (!O.tirmaniyor) O.egilKilit = !O.egilKilit; });
      } else r.on('pointerdown', () => bas(true));
      r.on('pointerup', () => bas(false)).on('pointerout', () => bas(false));
      this.tuslar.push({ ad, r });
    });
  }

  // Tuş görselleri basılı durumu gösterir (eğilme kilidi dahil)
  update() {
    if (!this.oyunS) return;
    this.tuslar.forEach(({ ad, r }) => {
      const basili = this.oyunS.touch[ad] || (ad === 'asagi' && this.oyunS.egilKilit);
      const key = (basili ? 'ui_tb_' : 'ui_t_') + ad;
      if (r.texture.key !== key) r.setTexture(key).setDisplaySize(this.tusB, this.tusB);
    });
  }

  // Her şeyi ekran boyutuna göre yerleştir (u = arayüz ölçeği, cihaz pikseli)
  yerlestir() {
    const W = this.scale.width, H = this.scale.height;
    const u = DPR * Phaser.Math.Clamp(Math.min(W, H) / DPR / 420, 0.75, 1.4);
    this.u = u;
    this.cameras.main.setSize(W, H);

    if (this.tamBtn) { this.tamBtn.destroy(); this.tamBtn = null; }   // v1.71: tam ekran tuşu kaldırıldı (F tuşu duruyor)
    // v1.44: puanın altında, en sağda yetenekler rozeti (v1.61: kollu parşömen, paraya yakın; solunda ayarlar); tam ekran altta yerinde
    const rb = 46 * u, ry = 56 * u;
    // v1.62: en sağda ayarlar (dişli), solunda yetenekler rozeti
    if (this.yetBtn) this.yetBtn.destroy();
    if (this.ayarBtn) this.ayarBtn.destroy();
    this.ayarBtn = this.add.image(W - 12 * u - rb / 2, ry + rb / 2, 'ik_ayarlar').setDepth(310).setDisplaySize(rb, rb)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => this.ayarAc());
    this.yetBtn = this.add.image(this.ayarBtn.x - rb - 8 * u, ry + rb / 2, 'ui_yetenekBtn').setDepth(310);
    this.yetBtn.setScale(rb / this.yetBtn.height).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { this.tik(); this.yetenekAcik = !this.yetenekAcik; this.yetenekCiz(); });
    this.yetenekCiz();

    this.surumYazi.setFontSize(Math.round(11 * u) + 'px').setPosition(8 * u, H - 6 * u);
    this.tusB = 78 * u;
    this.tuslar.forEach(({ ad, r }) => {
      const [x, y] = TUSLAR[ad];
      r.setPosition(x > 0 ? x * u : W + x * u, H + y * u).setDisplaySize(this.tusB, this.tusB);
    });
    this.guncelle();
    if (this.ekran) this.ekranCiz();
  }

  // v1.61: ayarlar menüsü (AyarSahnesi) — oyun durur, kapanınca sürer
  ayarAc() {
    if (this.scene.isActive('Ayar') || this.ekran) return;
    this.tik();
    this.scene.pause('Game');
    this.scene.launch('Ayar', { geri: 'Game' });
    this.scene.bringToTop('Ayar');
  }

  // v1.44: yetenekler şeridi (alma ekranı değil, sadece sahip olunanlar) — rozete dokununca rozetin solunda tabela
  // çerçevesi içinde açılır / kapanır. Simgeler önce orta boy (34u); alındıkça şerit sola uzar, en fazla ekranın %60'ı:
  // sığmazsa simgeler küçülür, çok küçülürse (22u altı) iki sıraya geçer. Simgeler çerçevenin iç alanında kalır.
  // Simgeye dokununca adı şeridin altında görünür.
  yetenekCiz() {
    if (this.yetSerit) { this.yetSerit.destroy(); this.yetSerit = null; }
    if (!this.hazir || !this.yetBtn) return;
    this.yetBtn.setAlpha(this.yetenekAcik ? 1 : 0.92);
    if (!this.yetenekAcik) return;
    const u = this.u, W = this.scale.width, b = this.yetBtn;
    const sahip = Object.keys(YETENEKLER).filter(k => yetenekVar(k));
    const ara = 5 * u, maxG = W * 0.6;
    let B = 34 * u, sira = 1, n = Math.max(1, sahip.length);
    const sigan = (B, s) => Math.ceil(n / s) * B + (Math.ceil(n / s) - 1) * ara;
    // v1.62: yeni hap levhalar (ui_yetSerit, ui_yetAd) — yatay iç pay: yuvarlak uç (yükseklik × 0.42) + boşluk
    const icPay = h => h * 0.42 + 4 * u;
    const yuk = (B, s) => s * B + (s - 1) * ara + 2 * 9 * u;
    while (sigan(B, sira) + 2 * icPay(yuk(B, sira)) > maxG && B > 22 * u) B -= u;
    if (sigan(B, sira) + 2 * icPay(yuk(B, sira)) > maxG) {
      sira = 2; B = 34 * u;
      while (sigan(B, sira) + 2 * icPay(yuk(B, sira)) > maxG && B > 12 * u) B -= u;
    }
    const h = yuk(B, sira), pay = icPay(h);
    const sut = Math.ceil(n / sira);
    const w = sahip.length ? sigan(B, sira) + 2 * pay : 0;
    const c = this.add.container(0, 0).setDepth(305);
    this.yetSerit = c;
    const x1 = b.x - b.displayWidth / 2 - 6 * u, y0 = b.y - h / 2;   // v1.62: rozet en solda, şerit onun solunda
    if (!sahip.length) {
      const t = harfYazi(this, 'Henüz yetenek yok', 10 * u, 'sol');
      const tw = t.genislik + 2 * icPay(30 * u);
      c.add(ucParca(this, 'ui_yetAd', x1 - tw, b.y - 15 * u, tw, 30 * u, 0.5));
      t.setPosition(x1 - tw + icPay(30 * u), b.y - t.yukseklik / 2);
      c.add(t);
      return;
    }
    c.add(ucParca(this, 'ui_yetSerit', x1 - w, y0, w, h, 0.5));
    const ad = this.add.container(0, 0); c.add(ad);
    sahip.forEach((k, i) => {
      const sx = i % sut, sy = Math.floor(i / sut);
      const img = this.add.image(x1 - w + pay + sx * (B + ara), y0 + 9 * u + sy * (B + ara), 'dk_ikon', ASSETLER.dukkanIkon.kare[k])
        .setOrigin(0, 0).setDisplaySize(B, B).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => {
        this.tik();
        ad.removeAll(true);
        const t = harfYazi(this, YETENEKLER[k].ad, 9 * u, 'sol');
        const tw = t.genislik + 2 * icPay(24 * u), tx = Math.max(8 * u, Math.min(img.x + B / 2 - tw / 2, W - 8 * u - tw));
        ad.add(ucParca(this, 'ui_yetAd', tx, y0 + h + 4 * u, tw, 24 * u, 0.5));
        t.setPosition(tx + icPay(24 * u), y0 + h + 4 * u + 12 * u - t.yukseklik / 2);
        ad.add(t);
      });
      c.add(img);
    });
  }

  // v1.37: bonus odası geri sayımı — üst ortada; null gizler. Son 5 saniye kırmızı.
  sureGoster(sn) {
    if (this.sureYazi) { this.sureYazi.destroy(); this.sureYazi = null; }
    if (sn === null || sn === undefined || !this.hazir) return;
    const u = this.u, W = this.scale.width;
    const e = harfYazi(this, 'SÜRE', 11 * u, 'orta');
    const t = gorselYazi(this, [String(sn)], 24 * u, 30 * u);
    if (sn <= 5) t.list.forEach(i => i.setTint && i.setTint(0xff6a5a));
    e.setPosition(-e.genislik / 2, 0);
    t.setPosition(-t.genislik / 2, 16 * u + 15 * u);
    this.sureYazi = this.add.container(W / 2, 8 * u, [e, t]).setDepth(50);
  }

  // HUD: sol üstte kalpler, altında yaşam ve elmas sayacı; sağ üstte puan
  guncelle() {
    if (!this.hazir) return;
    const S = this.oyunS.durum, u = this.u, W = this.scale.width;
    this.hud.forEach(n => { this.tweens.killTweensOf(n); n.destroy(); });
    this.hud = [];
    for (let i = 0; i < canMaxi(); i++) {
      const k = this.add.image((12 + i * 46) * u, 10 * u, i < S.can ? 'ui_kalp' : 'ui_kalpBos').setOrigin(0, 0);
      this.hud.push(k.setScale(30 * u / k.height));
    }
    const yasam = gorselYazi(this, ['ui_sapka', String(Math.max(0, S.yasam))], 20 * u, 26 * u).setPosition(12 * u, 60 * u);
    const elmas = gorselYazi(this, ['ui_elmas', S.elmas + '/' + S.elmasToplam], 20 * u, 26 * u)
      .setPosition(12 * u + yasam.genislik + 18 * u, 60 * u);
    const puan = gorselYazi(this, ['ui_altin', String(S.puan)], 24 * u, 30 * u);
    puan.setPosition(W - 12 * u - puan.genislik, 24 * u);
    this.hud.push(yasam, elmas, puan);
    this.hud.forEach(n => n.setDepth(300));   // bölüm sonu ekranının da üstünde
    this.puanYazi = puan;
    this.puanHedef = { x: puan.x + 15 * u, y: 24 * u };
  }

  // v1.26: verilen kareden bir kopya (sx, sy) ekran noktasından puan simgesine yay çizerek, yavaşlayarak kayar,
  // küçülür ve kaybolur; varınca puan sayacı hafifçe zıplar
  ucur(doku, kare, sx, sy, boy, bitince) {
    if (!this.hazir || !this.puanHedef) return;
    const u = this.u, img = this.add.image(sx, sy, doku, kare).setDepth(400);
    const s0 = boy / img.height, s1 = 26 * u / img.height;
    img.setScale(s0);
    const tx = this.puanHedef.x, ty = this.puanHedef.y;
    const kx = sx + (tx - sx) * 0.25, ky = Math.min(sy, ty) - 40 * u;   // yayın kontrol noktası (yukarı doğru kavis)
    this.tweens.addCounter({ from: 0, to: 1, duration: 700, ease: 'Sine.easeInOut',
      onUpdate: tw => {
        const t = tw.getValue(), a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        img.setPosition(a * sx + b * kx + c * tx, a * sy + b * ky + c * ty).setScale(s0 + (s1 - s0) * t);
      },
      onComplete: () => {
        img.destroy();
        const p = this.puanYazi;
        if (p && p.active) { this.tweens.killTweensOf(p); p.setScale(1); this.tweens.add({ targets: p, scale: 1.12, duration: 70, yoyo: true }); }
        if (bitince) bitince();
      } });
  }

  // ---- v1.33 Bölüm sonu ekranı ----
  // Başlık, 3 ödül mücevheri (sönük), bar, yüzde, çetele (tür tür alınan / toplam: elmas, yakut, mavi elmas, sandık, kasa,
  // kristal, gizli yer). Bar toplam yüzdesine kadar yavaşça dolar; CONFIG.yildizEsik (%33 / %66 / %99) geçildikçe mücevher
  // yanar. Daha önce ödülü alınmış mücevher sadece yanar; ilk kez yananın içinden turuncu elmas (ui_odulTas) çıkar:
  // odulElmas sesi başlar, elmas sesle birlikte yukarı süzülür, sonra puana uçar (+CONFIG.puan.yildiz). Çerçevedeki görsel kalır.
  // Zamanlayıcı (zincirleme bekleme: iç içe delayedCall'larda takılma olmasın diye tween sayacıyla)
  bekle(ms, fn) { this.tweens.addCounter({ from: 0, to: 1, duration: Math.max(1, ms), onComplete: fn }); }

  sonucEkrani(o) {
    const esik = CONFIG.yildizEsik;
    this.ekran = Object.assign({ tip: 'sonuc', dolu: 0, yanan: 0, alt: null, nesneler: [], esik,
      hedefYildiz: esik.filter(e => o.yuzde >= e - 1e-9).length }, o);
    this.ekranCiz();
    this.bekle(700, () => this.sonucAdim());
  }

  // Bar bir sonraki eşiğe (ya da sona) kadar dolar; eşikte mücevher yanar, gerekirse ödül verilir, sonra devam
  sonucAdim() {
    const E = this.ekran;
    if (!E || E.tip !== 'sonuc') return;
    const sonraki = E.yanan < E.hedefYildiz ? E.esik[E.yanan] : E.yuzde;
    const hedef = Math.min(sonraki, E.yuzde);
    if (hedef <= E.dolu + 1e-9 && E.yanan >= E.hedefYildiz) { this.bekle(300, () => this.sonucBitir()); return; }
    const sure = Math.max(250, (hedef - E.dolu) * 2200);
    const s = sesBaslat(this, 'gizliBonus', { volume: 0.45 });
    this.tweens.addCounter({ from: E.dolu, to: hedef, duration: sure, ease: 'Sine.easeInOut',
      onUpdate: tw => { E.dolu = tw.getValue(); this.barCiz(); },
      onComplete: () => {
        E.dolu = hedef; this.barCiz();
        if (E.yanan < E.hedefYildiz) {
          const k = E.yanan; E.yanan++;
          const odul = k >= E.eskiYildiz;   // daha önce alınmadıysa turuncu elmas çıkar
          this.yildizYak(k, odul, () => this.bekle(odul ? 250 : 500, () => this.sonucAdim()));
        } else this.bekle(300, () => this.sonucBitir());
      } });
  }

  // k. mücevher yanar; odul ise içinden turuncu elmas çıkar: ses hemen başlar, elmas sesle yukarı süzülür, sonra puana uçar
  yildizYak(k, odul, bitince) {
    const E = this.ekran, y = E.yildiz[k], u = this.u;
    this.yildizBoya(y, true);
    this.tweens.add({ targets: y, scale: y.olcek * 1.3, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    if (!odul) { sesCal(this, 'tik'); if (bitince) bitince(); return; }
    const ses = sesBaslat(this, 'odulElmas', { volume: 0.8 });
    const d = ses && ses.duration, sesSure = d > 0.3 && d < 6 ? d : 3.3;
    const yuksel = Math.min(1400, sesSure * 1000 * 0.45);            // yükselme sesin ilk yarısı kadar sürer
    const boy = 44 * u, el = this.add.image(y.x, y.y, 'ui_odulTas').setDepth(400);
    el.setScale(boy * 0.3 / el.height);
    this.tweens.add({ targets: el, scale: boy / el.height, y: y.y - 55 * u, duration: yuksel, ease: 'Quad.easeOut', onComplete: () => {
      const x = el.x, yy = el.y;
      el.destroy();
      this.ucur('ui_odulTas', '__BASE', x, yy, boy, () => {
        const S = this.oyunS.durum;
        S.puan += CONFIG.puan.yildiz;
        KAYIT.puan = S.puan; kayitYaz();
        E.yildizVer(k + 1);
        this.guncelle();
        if (bitince) bitince();
      });
    } });
  }

  sonucBitir() {
    const E = this.ekran;
    if (E.bitti) return;
    E.bitti = true;
    E.alt = E.altYazi();
    E.tuslar = E.tusListe || null;   // v1.48: dokunmak yerine tuşlar (Tekrar Oyna / Sonraki Bölüm)
    this.ekranCiz();
    if (!E.tuslar) this.bekle(600, () => this.input.once('pointerdown', () => { this.tik(); this.oyunS.scene.restart(); }));
  }

  // v1.28: ödül mücevheri boş (ui_odulBos) / dolu (ui_odulDolu)
  yildizBoya(y, yanik) {
    const boy = y.boy;
    y.setTexture(yanik ? 'ui_odulDolu' : 'ui_odulBos');
    y.setScale(boy / y.height);
    y.olcek = boy / y.height;
  }

  barCiz() {
    const E = this.ekran;
    if (E.bar) E.bar.ayarla(Math.min(1, E.dolu));
    if (E.yuzdeYazi) {
      E.yuzdeYazi.destroy();
      const t = gorselYazi(this, [String(Math.round(E.dolu * 100))], E.yuzdeBoy, E.yuzdeBoy).setDepth(110);
      const y = harfYazi(this, '%', E.yuzdeBoy * 0.9, 'sol').setDepth(110);
      const c = this.add.container(E.barG.x + E.barG.w / 2 - (t.genislik + y.genislik + 3) / 2, E.barG.y + E.barG.h + 6 * this.u, [y, t]).setDepth(110);
      y.setPosition(0, 0); t.setPosition(y.genislik + 3, E.yuzdeBoy * 0.62);
      E.yuzdeYazi = c;
    }
  }

  // v1.29: panel görselinin (ui_panel) çerçevesiz iç alanı — yazı ve öğeler çerçeveye / yapraklara değmesin diye
  // (taş üst bant ~%19, alt ~%15, yan sütunlar ~%12; pay eklenmiş)
  // v1.38: sonuc=true → bölüm sonu çerçevesi (ui_panelSonuc): ince taş kenar ~%5, üst köşe yaprakları; pay eklenmiş
  panelIc(pw, ph, sonuc) {
    const W = this.scale.width, H = this.scale.height, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2;
    const [yan, ust, alt] = sonuc ? [0.1, 0.11, 0.11] : [0.16, 0.23, 0.19];
    return { x: x0 + pw * yan, y: y0 + ph * ust, w: pw * (1 - 2 * yan), h: ph * (1 - ust - alt) };
  }

  // Çetele satırı: ikon (ya da etiket) + "alınan/toplam" rakamları; container (sol-orta orijin), genislik alanıyla
  ceteleOge(r, boy) {
    const c = this.add.container(0, 0);
    let x = 0;
    if (r.ikon) {
      const [doku, kare] = r.ikon, img = kare === null || kare === undefined ? this.add.image(0, 0, doku) : this.add.image(0, 0, doku, kare);
      img.setOrigin(0, 0.5).setScale(boy * 1.5 / Math.max(img.width, img.height) * (doku === 'toplanan' ? 1.25 : 1));
      c.add(img); x = img.displayWidth + boy * 0.3;
    } else {
      const t = harfYazi(this, r.etiket, boy * 0.95, 'sol');
      t.setPosition(0, -boy * 0.6); c.add(t); x = t.genislik + boy * 0.3;
    }
    const n = gorselYazi(this, [r.al + '/' + r.top], boy, boy);
    n.setPosition(x, 0); c.add(n);
    c.genislik = x + n.genislik;
    return c;
  }

  sonucCiz() {
    const E = this.ekran, W = this.scale.width, H = this.scale.height;
    E.nesneler.forEach(n => n.destroy());
    if (E.bar) { E.bar.destroy(); E.bar = null; }
    if (E.yuzdeYazi) { E.yuzdeYazi.destroy(); E.yuzdeYazi = null; }
    // v1.38: çerçeve görselinin oranı (1408×1098) korunur, ekrana sığacak en büyük boy
    const PO = 1408 / 1098, pw = Math.min(W * 0.92, H * 0.94 * PO, 760 * this.u), ph = pw / PO;
    const n = [this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6), this.add.image(W / 2, H / 2, 'ui_panelSonuc').setDisplaySize(pw, ph)];
    const ic = this.panelIc(pw, ph, true);
    const satirSay = Math.ceil(E.satirlar.length / 4);
    // Önce k=1 ile yükseklik ölçülür; iç alana sığmazsa her şey k ile küçülür
    const olc = (k) => {
      const u = this.u * k, b = harfYazi(this, E.baslik, 22 * u, 'orta');
      const bs = Math.min(1, ic.w / b.genislik), bh = b.yukseklik * bs;
      b.destroy();
      const bw = Math.min(ic.w * 0.95, 400 * u), barH = bw * 88 / 900;
      let a = 0;
      if (E.alt) { const t = harfYazi(this, E.alt, 13 * u, 'orta'); a = t.yukseklik * Math.min(1, ic.w / t.genislik); t.destroy(); }
      return bh + 12 * u + 78 * u + 10 * u + barH + 6 * u + 16 * u + 10 * u + satirSay * 26 * u + (E.alt ? 12 * u + a : 0)
        + (E.tuslar ? 14 * u + 34 * u : 0);
    };
    const k = Math.min(1, ic.h / olc(1)), u = this.u * k, top = olc(k);
    let y = ic.y + (ic.h - top) / 2;
    const b = harfYazi(this, E.baslik, 22 * u, 'orta');
    const bs = Math.min(1, ic.w / b.genislik);
    if (bs < 1) b.setScale(bs);
    b.setPosition(W / 2 - b.genislik * bs / 2, y); n.push(b);
    y += b.yukseklik * bs + 12 * u;
    E.yildiz = [-1, 0, 1].map((kk, i) => {
      const boy = (i === 1 ? 78 : 64) * u;
      const st = this.add.image(W / 2 + kk * 92 * u, y + 39 * u, 'ui_odulBos');
      st.boy = boy;
      this.yildizBoya(st, i < E.yanan);
      n.push(st);
      return st;
    });
    y += 78 * u + 10 * u;
    const bw = Math.min(ic.w * 0.95, 400 * u);
    E.bar = doluBar(this, 'ui_barBos', 'ui_barDolu', W / 2 - bw / 2, y, bw);   // v1.28: boş / dolu bar görseli
    E.barG = { x: W / 2 - bw / 2, y, w: bw, h: E.bar.h };
    E.yuzdeBoy = 13 * u;
    E.yuzdeYazi = this.add.container(0, 0);   // barCiz doldurur
    y += E.bar.h + 6 * u + 16 * u + 10 * u;
    // Çetele: en çok 4 sütun, satır satır ortalanır
    const ogeBoy = 12 * u, ara = 22 * u;
    for (let r = 0; r < satirSay; r++) {
      const grup = E.satirlar.slice(r * 4, r * 4 + 4).map(sat => this.ceteleOge(sat, ogeBoy));
      const gen = grup.reduce((t, g) => t + g.genislik, 0) + ara * (grup.length - 1);
      const olcek = Math.min(1, ic.w / gen);
      let x = W / 2 - gen * olcek / 2;
      grup.forEach(g => { g.setPosition(x, y + 13 * u).setScale(olcek).setDepth(110); n.push(g); x += (g.genislik + ara) * olcek; });
      y += 26 * u;
    }
    E.nesneler = n;
    n.forEach(o => { if (o.depth < 110) o.setDepth(100); });
    E.bar.setDepth(100);
    this.barCiz();
    if (E.alt) {
      const a = harfYazi(this, E.alt, 13 * u, 'orta').setDepth(110);
      const as = Math.min(1, ic.w / a.genislik);
      if (as < 1) a.setScale(as);
      a.setPosition(W / 2 - a.genislik * as / 2, y + 12 * u);
      n.push(a);
      y += 12 * u + a.yukseklik * as;
    }
    // v1.48: bölüm sonu tuşları — tabela çerçeveli, yan yana, panelin iç alanında; yazı çerçevenin içinde kalır
    if (E.tuslar) {
      const th = 34 * u, ara = 12 * u, pay = th * 0.34 + 8 * u;
      const yazilar = E.tuslar.map(t => harfYazi(this, t.ad, 12 * u, 'sol').setDepth(112));
      let gen = yazilar.map(t => t.genislik + 2 * pay);
      const top = gen.reduce((a, b) => a + b, 0) + ara * (gen.length - 1), ks = Math.min(1, ic.w / top);
      gen = gen.map(g => g * ks);
      let x = W / 2 - (top * ks) / 2;
      const ty = y + 14 * u;
      E.tuslar.forEach((t, i) => {
        const c = ucParca(this, 'ui_tabela', x, ty, gen[i], th).setDepth(111);
        const yz = yazilar[i];
        if (ks < 1) yz.setScale(ks);
        yz.setPosition(x + gen[i] / 2 - yz.genislik * ks / 2, ty + th / 2 - yz.yukseklik * ks / 2);
        const alan = this.add.zone(x, ty, gen[i], th).setOrigin(0, 0).setDepth(113).setInteractive({ useHandCursor: true });
        alan.on('pointerup', () => { this.tik(); t.fn(); });
        alan.on('pointerdown', () => { c.setAlpha(0.8); yz.setAlpha(0.8); });
        alan.on('pointerout', () => { c.setAlpha(1); yz.setAlpha(1); });
        n.push(c, yz, alan);
        x += gen[i] + ara;
      });
    }
  }

  // Bitiş ekranı (bölüm bitti / oyun bitti); dokununca bölüm yeniden başlar
  bitisEkrani(baslik, alt) {
    this.ekran = { baslik, alt, nesneler: [] };
    this.ekranCiz();
    this.time.delayedCall(800, () => this.input.once('pointerdown', () => { this.tik(); this.oyunS.scene.restart(); }));
  }

  // Taş çerçeveli panel; başlık ve alt yazı harf görselleriyle, panele sığacak şekilde küçülür
  ekranCiz() {
    if (this.ekran.tip === 'sonuc') return this.sonucCiz();
    const E = this.ekran, W = this.scale.width, H = this.scale.height, u = this.u;
    E.nesneler.forEach(n => n.destroy());
    const pw = Math.min(W * 0.86, 760 * u), ph = Math.min(H * 0.9, Math.max(pw * 292 / 1406, 300 * u));
    E.nesneler = [
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55),
      this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(pw, ph)
    ];
    const ic = this.panelIc(pw, ph);   // v1.29: yazı çerçeveye değmez
    const kur = (olcek) => [harfYazi(this, E.baslik, 26 * u * olcek, 'orta'), harfYazi(this, E.alt, 14 * u * olcek, 'orta')];
    let [b, a] = kur(1);
    const sigdir = Math.min(1, ic.w / Math.max(b.genislik, a.genislik), ic.h / (b.yukseklik + a.yukseklik + 18 * u));
    if (sigdir < 1) { b.destroy(); a.destroy(); [b, a] = kur(sigdir); }
    const bosluk = 18 * u * sigdir, y0 = ic.y + (ic.h - (b.yukseklik + bosluk + a.yukseklik)) / 2;
    b.setPosition(W / 2 - b.genislik / 2, y0);
    a.setPosition(W / 2 - a.genislik / 2, y0 + b.yukseklik + bosluk);
    E.nesneler.push(b, a);
  }
}
