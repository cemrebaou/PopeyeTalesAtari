// Ortak yardımcılar: fizik kısayolları, ses, tam ekran, görsel yazı (harf / rakam görselleri).

// Gövde yere basıyor mu (zemine ya da başka gövdeye)
const yerdeMi = (b) => b.blocked.down || b.touching.down;

// Arcade gövdesinin dikdörtgeni
const govdeRect = (b) => new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);

// ---- Ses ----
// Tek seferlik ses. Yüklü değilse (dosyası yoksa) sessiz geçer.
function sesCal(sahne, ad, ayar) {
  if (!sahne.cache.audio.exists(ad) || !sesAcik(ad)) return;   // v1.61: ayardan kapalı tür çalmaz
  try { sahne.sound.play(ad, Object.assign({ volume: 0.6 }, ayar)); } catch (e) { /* ses kapalı / desteklenmiyor */ }
}

// Kontrol edilebilir ses (durdurulabilir, döngü vb.). Yüklü değilse null.
function sesBaslat(sahne, ad, ayar) {
  if (!sahne.cache.audio.exists(ad)) return null;
  try { const s = sahne.sound.add(ad, Object.assign({ volume: 0.6 }, ayar)); s.play(); if (!sesAcik(ad)) s.setMute(true); return s; } catch (e) { return null; }
}

// sesBaslat ile başlatılan sesi durdurur; her zaman null döner (değişkeni sıfırlamak için: x = sesDurdur(x))
// Sesler oyun açıldıktan sonra arka planda yüklenir (açılışı bekletmez); yüklenmeyen ses sessizce atlanır.
function sesleriYukle(sahne) {
  const eksik = SESLER.filter(ad => !sahne.cache.audio.exists(ad));
  if (!eksik.length) return;
  eksik.forEach(ad => sahne.load.audio(ad, SES_YOL[ad]));
  sahne.load.start();
}

// v1.79: müzik (döngü) — yüklü değilse önce yükler, yüklenince başlatır. Dönen tutacak .durdur() ile susturulur
// (yükleme bitmeden durdurulursa hiç başlamaz).
function muzikBaslat(sahne, ad, ayar) {
  const t = { ses: null, bitti: false, durdur() { this.bitti = true; this.ses = sesDurdur(this.ses); } };
  const cal = () => { if (!t.bitti && sahne.sys.isActive()) t.ses = sesBaslat(sahne, ad, Object.assign({ loop: true, volume: CONFIG.muzikSes }, ayar)); };
  if (sahne.cache.audio.exists(ad)) cal();
  else if (SES_YOL[ad]) {
    sahne.load.once('filecomplete-audio-' + ad, cal);
    sahne.load.audio(ad, SES_YOL[ad]);
    sahne.load.start();
  }
  return t;
}

function sesDurdur(s) {
  if (s) { s.stop(); s.destroy(); }
  return null;
}

// ---- Tam ekran ----
// Aç/kapa; açılınca telefonu yatay kilitler (Android Chrome; iPhone Safari kilit desteklemez)
function tamEkranDegistir() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    const cik = d.exitFullscreen || d.webkitExitFullscreen;
    if (cik) cik.call(d);
    try { screen.orientation.unlock(); } catch (e) { /* desteklenmiyor */ }
    return;
  }
  const iste = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!iste) return;
  const kilitle = () => {   // ilk deneme olmazsa kısa süre sonra bir kez daha
    const o = screen.orientation;
    if (o && o.lock) o.lock('landscape').catch(() => setTimeout(() => o.lock('landscape').catch(() => {}), 400));
    else if (screen.lockOrientation) screen.lockOrientation('landscape');
  };
  const sonuc = iste.call(el, { navigationUI: 'hide' });
  if (sonuc && sonuc.then) sonuc.then(kilitle).catch(() => {});
  else setTimeout(kilitle, 300);
}

// ---- Görsel yazı ----
// Rakam görselleri (assets/ui/r0..r9, rArti, rBolu) ve ikonlar yan yana, dikeyde ortalı.
// parcalar: metin ('+12/30') ve/veya 'ui_...' doku anahtarları. boy = rakam yüksekliği.
// Container döner (genislik alanıyla), orijin sol-orta.
function gorselYazi(sahne, parcalar, boy, ikonBoy) {
  const c = sahne.add.container(0, 0), ara = boy * 0.02;
  let x = 0;
  const ekle = (key, h) => {
    const img = sahne.add.image(x, 0, key).setOrigin(0, 0.5);
    const s = h / img.height;
    img.setScale(s);
    c.add(img);
    x += img.width * s + ara;
  };
  parcalar.forEach(p => {
    if (p.startsWith('ui_')) { ekle(p, ikonBoy || boy * 1.15); x += boy * 0.12; return; }
    for (const ch of p) ekle(ch === '+' ? 'ui_rArti' : ch === '/' ? 'ui_rBolu' : 'ui_r' + ch, boy);
  });
  c.genislik = x;
  return c;
}

// Harf görselleriyle yazı (assets/harf, ASSETLER.harf). boy = büyük harf yüksekliği, satırlar '\n' ile.
// {ad} → dokunmatik tuş görseli (ui_t_ad), örn. {zipla} {saldir} {sol}. Görseli olmayan karakter aynı renkte metinle çizilir.
// hiza: 'orta' | 'sol'. Container döner: sol üst orijin, genislik / yukseklik alanlarıyla.
function harfYazi(sahne, metin, boy, hiza) {
  const H = ASSETLER.harf, s0 = boy / H.capH, ara = boy * 0.02;
  metin = String(metin);
  const satirH = boy * (metin.includes('{') ? 2.1 : 1.55);
  const c = sahne.add.container(0, 0);
  const satirlar = metin.split('\n').map(satir => {
    const ogeler = [];
    let x = 0;
    for (const parca of satir.split(/(\{\w+\})/)) {
      const ikon = parca.match(/^\{(\w+)\}$/);
      if (ikon) {
        const img = sahne.add.image(x, boy * 0.5, 'ui_t_' + ikon[1]).setOrigin(0, 0.5);
        img.setScale(boy * 1.7 / img.height);
        ogeler.push(img);
        x += img.displayWidth + boy * 0.15;
        continue;
      }
      for (const ch of parca) {
        if (ch === ' ') { x += boy * 0.4; continue; }
        const m = H.k[ch];
        if (m) {
          const s = s0 * m[3];
          ogeler.push(sahne.add.image(x, boy + m[2] * s, 'harf', String(ch.codePointAt(0))).setOrigin(0, 0).setScale(s));
          x += m[0] * s + ara;
        } else {
          const t = sahne.add.text(x, boy, ch, {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(boy * 1.3) + 'px',
            color: '#ffc21a', stroke: '#4a2200', strokeThickness: Math.max(1, boy * 0.16)
          }).setOrigin(0, 0.86);
          ogeler.push(t);
          x += t.width + ara;
        }
      }
    }
    return { ogeler, w: x };
  });
  const enG = Math.max(0, ...satirlar.map(s => s.w));
  satirlar.forEach((s, i) => {
    const dx = hiza === 'orta' ? (enG - s.w) / 2 : 0;
    s.ogeler.forEach(o => { o.x += dx; o.y += i * satirH; c.add(o); });
  });
  c.genislik = enG;
  c.yukseklik = satirlar.length * satirH - (satirH - boy * 1.3);
  return c;
}

// v1.28: yatay uzayan tabela (sol uç / orta / sağ uç aynı görselden): uçlar sabit, orta uzar. Sol üst orijinli container.
function ucParca(sahne, key, x, y, w, h, kenarOran = 0.34) {
  const tex = sahne.textures.get(key), src = tex.getSourceImage(), W = src.width, H = src.height;
  const k = Math.round(H * kenarOran);
  if (!tex.has('_sol')) { tex.add('_sol', 0, 0, 0, k, H); tex.add('_orta', 0, k, 0, W - 2 * k, H); tex.add('_sag', 0, W - k, 0, k, H); }
  const s = h / H, kw = Math.min(k * s, w / 2), c = sahne.add.container(x, y);
  c.add([sahne.add.image(0, 0, key, '_sol').setOrigin(0, 0).setDisplaySize(kw, h),
    sahne.add.image(kw, 0, key, '_orta').setOrigin(0, 0).setDisplaySize(Math.max(1, w - 2 * kw), h),
    sahne.add.image(w - kw, 0, key, '_sag').setOrigin(0, 0).setDisplaySize(kw, h)]);
  return c;
}

// v1.28: boş / dolu iki görselli bar. Dolu görsel maskeyle soldan açılır; iç kısım görselin L–R oranları arasında.
// ayarla(f): 0–1 doluluk. Sol üst (x, y), genişlik w; yükseklik görsel oranından.
function doluBar(sahne, bosKey, doluKey, x, y, w, L = 0.09, R = 0.92) {
  const bos = sahne.add.image(x, y, bosKey).setOrigin(0, 0);
  const h = w * bos.height / bos.width;
  bos.setDisplaySize(w, h);
  const dolu = sahne.add.image(x, y, doluKey).setOrigin(0, 0).setDisplaySize(w, h);
  const g = sahne.make.graphics({ add: false });
  dolu.setMask(g.createGeometryMask());
  const bar = { bos, dolu, g, h, f: 0,
    ayarla(f) {
      bar.f = f;
      g.clear();
      if (f > 0) g.fillStyle(0xffffff).fillRect(x, y - 2, w * (f >= 1 ? 1 : L + (R - L) * f), h + 4);
      dolu.setVisible(f > 0);
    },
    setDepth(d) { bos.setDepth(d); dolu.setDepth(d + 0.01); return bar; },
    destroy() { bos.destroy(); dolu.destroy(); g.destroy(); } };
  bar.ayarla(0);
  return bar;
}
