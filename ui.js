// Arayüz: ayrı sahne (UI) — HUD, dokunmatik tuşlar, tam ekran, bitiş ekranları.
// Oyun kamerasının yakınlaştırmasından etkilenmez; ekran boyutu / yönü değişince yeniden yerleşir.

// Tam ekran aç/kapa; açılınca telefonu yatay konuma kilitler
function tamEkranDegistir() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    const cik = d.exitFullscreen || d.webkitExitFullscreen;
    if (cik) cik.call(d);
    try { screen.orientation.unlock(); } catch (e) {}
    return;
  }
  const iste = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!iste) return;
  // Yatay kilit (Android Chrome; iPhone Safari desteklemez). İlk deneme olmazsa kısa süre sonra bir kez daha.
  const kilitle = () => {
    const o = screen.orientation;
    if (o && o.lock) o.lock('landscape').catch(() => setTimeout(() => o.lock('landscape').catch(() => {}), 400));
    else if (screen.lockOrientation) screen.lockOrientation('landscape');
  };
  const sonuc = iste.call(el, { navigationUI: 'hide' });
  if (sonuc && sonuc.then) sonuc.then(kilitle).catch(() => {});
  else setTimeout(kilitle, 300);
}

// Görsel yazı: rakamlar (assets/ui/r0..r9, rArti, rBolu) ve ikonlar yan yana, dikeyde ortalı.
// parcalar: metin ('+12/30') ve/veya 'ui_...' doku anahtarları. boy = rakam yüksekliği. Container döner (genislik alanıyla).
function gorselYazi(sahne, parcalar, boy, ikonBoy) {
  const c = sahne.add.container(0, 0), arali = boy * 0.02;
  let x = 0;
  const ekle = (key, h) => {
    const img = sahne.add.image(x, 0, key).setOrigin(0, 0.5);
    const s = h / img.height; img.setScale(s);
    c.add(img); x += img.width * s + arali;
  };
  parcalar.forEach(p => {
    if (p.startsWith('ui_')) { ekle(p, ikonBoy || boy * 1.15); x += boy * 0.12; return; }
    for (const ch of p) ekle(ch === '+' ? 'ui_rArti' : ch === '/' ? 'ui_rBolu' : 'ui_r' + ch, boy);
  });
  c.genislik = x;
  return c;
}

// Harf görselleriyle yazı (v0.45; assets/harf, ASSETLER.harf). boy = büyük harf yüksekliği. Satırlar '\n' ile.
// hiza: 'orta' | 'sol'. Görseli olmayan karakterler (! : . vb.) aynı renkte metinle çizilir.
// Container döner: sol üst köşe orijin, genislik / yukseklik alanlarıyla.
function harfYazi(sahne, metin, boy, hiza) {
  const H = ASSETLER.harf, c = sahne.add.container(0, 0), s0 = boy / H.capH, ara = boy * 0.02, satirH = boy * 1.55;
  const satirlar = String(metin).split('\n').map(satir => {
    const ogeler = []; let x = 0;
    for (const ch of satir) {
      const m = H.k[ch];
      if (ch === ' ') { x += boy * 0.4; continue; }
      if (m) {
        const s = s0 * m[3];
        const img = sahne.add.image(x, boy + m[2] * s, 'h_' + ch.codePointAt(0)).setOrigin(0, 0).setScale(s);
        ogeler.push(img); x += m[0] * s + ara;
      } else {
        const t = sahne.add.text(x, boy, ch, {
          fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(boy * 1.3) + 'px',
          color: '#ffc21a', stroke: '#4a2200', strokeThickness: Math.max(1, boy * 0.16)
        }).setOrigin(0, 0.86);
        ogeler.push(t); x += t.width + ara;
      }
    }
    return { ogeler, w: x };
  });
  const enG = Math.max(0, ...satirlar.map(s => s.w));
  satirlar.forEach((s, i) => {
    const dx = hiza === 'orta' ? (enG - s.w) / 2 : 0;
    s.ogeler.forEach(o => { o.x += dx; o.y += i * satirH; c.add(o); });
  });
  c.genislik = enG; c.yukseklik = satirlar.length * satirH - (satirH - boy * 1.3);
  return c;
}

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.oyunS = this.scene.get('Game');
    this.hazir = true;
    this.events.once('shutdown', () => {
      this.hazir = false;
      this.scale.off('resize', this.yerlestir, this);
    });

    this.hud = [];   // HUD görselleri (guncelle'de yeniden kurulur)
    // Tam ekran tuşu: koyu zemin + harf görselleriyle yazı (yerlestir'de kurulur)
    this.tamBtn = null;
    this.input.keyboard.on('keydown-F', tamEkranDegistir);
    this.surumYazi = this.add.text(0, 0, CONFIG.surum + '  ' + this.oyunS.L.ad, { fontFamily: 'monospace', color: '#ffffff' })
      .setOrigin(0, 1).setAlpha(0.7);

    // Dokunmatik tuşlar (sadece dokunmatik cihazda)
    this.tuslar = [];
    if (this.sys.game.device.input.touch) {
      [['sol', '◀'], ['sag', '▶'], ['yukari', '▲'], ['zipla', 'ZIPLA'], ['saldir', 'VUR'], ['cek', 'ÇEK'], ['asagi', '▼ POGO']]
        .forEach(([anahtar, yazi]) => {
          // Tuş görseli: normal ui_t_<ad>, basılı ui_tb_<ad>
          const r = this.add.image(0, 0, 'ui_t_' + anahtar).setInteractive();
          const boyut = () => r.setDisplaySize(this.tusB || 78, this.tusB || 78);
          const ac = () => { this.oyunS.touch[anahtar] = true; r.setTexture('ui_tb_' + anahtar); boyut(); };
          const kapat = () => { this.oyunS.touch[anahtar] = false; r.setTexture('ui_t_' + anahtar); boyut(); };
          r.on('pointerdown', ac).on('pointerup', kapat).on('pointerout', kapat);
          this.tuslar.push({ anahtar, r, boyut });
        });
    }

    this.ekran = null;   // bitiş ekranı
    this.yerlestir();
    this.scale.on('resize', this.yerlestir, this);
    this.guncelle();
  }

  // Her şeyi ekran boyutuna göre yerleştir (u = arayüz ölçeği, cihaz pikseli cinsinden)
  yerlestir() {
    const W = this.scale.width, H = this.scale.height;
    const css = Math.min(W, H) / DPR;
    const u = DPR * Phaser.Math.Clamp(css / 420, 0.75, 1.4);
    this.u = u;
    this.cameras.main.setSize(W, H);
    const yazi = (t, boy, kal) => t.setFontSize(Math.round(boy * u) + 'px').setStroke('#000000', kal * u);
    if (this.tamBtn) this.tamBtn.destroy();
    const ty = harfYazi(this, 'Tam ekran', 13 * u, 'sol');
    const pad = 7 * u, bw = ty.genislik + pad * 2, bh = ty.yukseklik + pad * 2;
    const zemin = this.add.rectangle(0, 0, bw, bh, 0x000000, 0.45).setOrigin(0, 0);
    ty.setPosition(pad, pad);
    this.tamBtn = this.add.container(W - 12 * u - bw, 92 * u, [zemin, ty]);
    zemin.setInteractive({ useHandCursor: true }).on('pointerup', tamEkranDegistir);
    this.surumYazi.setFontSize(Math.round(11 * u) + 'px').setPosition(8 * u, H - 6 * u);

    const B = 78 * u, yer = {
      sol: [70, -70], sag: [175, -70], asagi: [122, -160],   // v0.47: ↓ (eğil/pogo) solda, ↑ (tırman) zıpla tuşunun üstünde
      zipla: [-70, -70], saldir: [-175, -70], cek: [-280, -70], yukari: [-122, -160]
    };
    this.tusB = B;
    this.tuslar.forEach(({ anahtar, r, boyut }) => {
      const [x, y] = yer[anahtar];
      r.setPosition(x > 0 ? x * u : W + x * u, H + y * u).setAlpha(0.85);
      boyut();
    });

    this.guncelle();
    if (this.ekran) this.ekranCiz();
  }

  guncelle() {
    if (!this.hazir) return;
    const S = this.oyunS.durum, max = CONFIG.oyuncu.canMax, u = this.u, W = this.scale.width;
    this.hud.forEach(n => n.destroy());
    this.hud = [];
    // Sol üst: kalpler (dolu / boş)
    for (let i = 0; i < max; i++) {
      const k = this.add.image((12 + i * 36) * u, 10 * u, i < S.can ? 'ui_kalp' : 'ui_kalpBos').setOrigin(0, 0);
      k.setScale(30 * u / k.height);
      this.hud.push(k);
    }
    // Altında: yaşam (kaptan şapkası) ve elmas sayacı
    const yasam = gorselYazi(this, ['ui_sapka', String(Math.max(0, S.yasam))], 20 * u, 26 * u).setPosition(12 * u, 60 * u);
    const elmas = gorselYazi(this, ['ui_elmas', S.elmas + '/' + S.elmasToplam], 20 * u, 26 * u)
      .setPosition(12 * u + yasam.genislik + 18 * u, 60 * u);
    // Sağ üst: puan (altın para + rakamlar), sağa hizalı
    const puan = gorselYazi(this, ['ui_altin', String(S.puan)], 24 * u, 30 * u);
    puan.setPosition(W - 12 * u - puan.genislik, 24 * u);
    this.hud.push(yasam, elmas, puan);
  }

  // Bitiş ekranı (bölüm bitti / oyun bitti); dokununca bölüm yeniden başlar
  bitisEkrani(baslik, alt) {
    this.ekran = { baslik, alt, nesneler: [] };
    this.ekranCiz();
    this.time.delayedCall(800, () => this.input.once('pointerdown', () => this.oyunS.scene.restart()));
  }

  ekranCiz() {
    const E = this.ekran, W = this.scale.width, H = this.scale.height, u = this.u;
    E.nesneler.forEach(n => n.destroy());
    // Taş çerçeveli panel (yazıya göre boyu biraz uzar)
    const pw = Math.min(W * 0.86, 760 * u), ph = Math.max(pw * 292 / 1406, 230 * u);
    E.nesneler = [
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55),
      this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(pw, ph)
    ];
    // Başlık ve alt yazı harf görselleriyle, panele sığacak şekilde
    let bb = 26 * u, ab = 14 * u;
    const kur = () => {
      const b = harfYazi(this, E.baslik, bb, 'orta'), a = harfYazi(this, E.alt, ab, 'orta');
      return [b, a];
    };
    let [b, a] = kur();
    const sigdir = Math.min(1, (pw * 0.8) / Math.max(b.genislik, a.genislik), (ph * 0.78) / (b.yukseklik + a.yukseklik + 18 * u));
    if (sigdir < 1) { b.destroy(); a.destroy(); bb *= sigdir; ab *= sigdir; [b, a] = kur(); }
    const top = b.yukseklik + 18 * u * Math.min(1, sigdir) + a.yukseklik, y0 = H / 2 - top / 2;
    b.setPosition(W / 2 - b.genislik / 2, y0);
    a.setPosition(W / 2 - a.genislik / 2, y0 + b.yukseklik + 18 * u * Math.min(1, sigdir));
    E.nesneler.push(b, a);
  }
}

// Oyun sahnesinden arayüze köprüler + dünya içi efektler
Object.assign(GameScene.prototype, {

  ui() {
    const u = this.scene.get('UI');
    return u && u.hazir ? u : null;
  },

  hudGuncelle() {
    const u = this.ui();
    if (u) u.guncelle();
  },

  // Dünya içi yazı. '+500', '+1' gibi sayılar rakam görselleriyle (ikon: 'ui_kalp', 'ui_sapka' vb.), diğerleri metin.
  popup(x, y, yazi, ikon) {
    if (/^[+\d\/]+$/.test(yazi)) {
      const c = gorselYazi(this, ikon ? [yazi, ikon] : [yazi], 13, 16);
      c.setPosition(x - c.genislik / 2, y).setDepth(50);
      this.tweens.add({ targets: c, y: y - 40, alpha: 0, duration: 1100, onComplete: () => c.destroy() });
      return;
    }
    const t = harfYazi(this, yazi, 11, 'orta');
    t.setPosition(x - t.genislik / 2, y - t.yukseklik / 2).setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  },

  puanEkle(n, x, y) {
    this.durum.puan += n;
    this.popup(x, y, '+' + n);
    this.hudGuncelle();
  },

  parcala(x, y, renk) {
    for (let i = 0; i < 8; i++) {
      const r = this.add.rectangle(x, y, 6, 6, renk).setDepth(20);
      this.tweens.add({
        targets: r,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-50, 30),
        alpha: 0, duration: 500,
        onComplete: () => r.destroy()
      });
    }
  },

  bitisGoster(baslik, alt) {
    const u = this.ui();
    if (u) u.bitisEkrani(baslik, alt);
  },

  bolumBitti() {
    const S = this.durum;
    if (S.bitti) return;
    S.bitti = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.bitisGoster('1. BÖLÜM TAMAMLANDI!',
      'Puan: ' + S.puan + '\nElmas: ' + S.elmas + '/' + S.elmasToplam + '\n\nR veya dokun: tekrar oyna');
  },

  oyunBitti() {
    this.durum.oyunBitti = true;
    this.bitisGoster('OYUN BİTTİ', 'Puan: ' + this.durum.puan + '\n\nR veya dokun: tekrar dene');
  }
});
