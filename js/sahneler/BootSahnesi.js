// Açılış sahnesi: yükleme çubuğu gösterir, görselleri yükler (sesler oyunda arka planda: sesleriYukle), animasyonları tanımlar, oyunu başlatır.
class BootSahnesi extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const L = this.load, A = ASSETLER;
    this.yuklemeEkrani();
    // Karolar ve şelale
    L.image('tileset', 'assets/karo/tileset.png');
    L.image('selaleOrta', 'assets/karo/selaleOrta.png');
    // Nesneler (sandık, kapı, bayrak, diken, sarmaşık) — boyutları ASSETLER.obje
    Object.keys(A.obje).filter(ad => !A.nesne2[ad]).forEach(ad => L.image(ad, 'assets/nesne/' + ad + '.png'));
    L.image('zincir', 'assets/nesne/zincir.png');
    // v1.35: kapılar (dükkan / kilitli), anahtar, kontrol bayrağı, tabela, ok balonu, simgeler — ASSETLER.nesne2
    Object.keys(A.nesne2).forEach(ad => L.image(ad, 'assets/nesne/' + ad + '.png'));
    Object.keys(A.nesne3).forEach(ad => L.image(ad, 'assets/nesne/' + ad + '.png'));   // v1.37: bonus / patron kapıları, süsler
    L.spritesheet('kirTas', 'assets/nesne/kirTas.png', { frameWidth: 128, frameHeight: 128 });
    L.spritesheet('kirParca', 'assets/nesne/kirParca.png', { frameWidth: ASSETLER.kirParca.huc, frameHeight: ASSETLER.kirParca.huc });
    L.image('tane', 'assets/nesne/tane.png');
    L.spritesheet('toplanan', 'assets/nesne/toplanan.png', { frameWidth: A.toplanan.w, frameHeight: A.toplanan.h });
    // Oyuncu
    const K1 = ASSETLER.oyuncu.kare, K2 = CONFIG.oyuncu.kare2;
    L.spritesheet('oyuncu', 'assets/oyuncu/oyuncu.png', { frameWidth: K1.w, frameHeight: K1.h });
    L.spritesheet('oyuncu2', 'assets/oyuncu/oyuncu2.png', { frameWidth: K2.w, frameHeight: K2.h });
    L.spritesheet('yuzme', 'assets/oyuncu/yuzme.png', { frameWidth: A.yuzme.w, frameHeight: A.yuzme.h });   // v1.55: yüzme bölümü
    L.spritesheet('mayin', 'assets/nesne/mayin.png', { frameWidth: A.mayin.w, frameHeight: A.mayin.h });   // v1.57: yüzme mayını
    L.image('mayinRoket', 'assets/nesne/mayinRoket.png');
    L.spritesheet('dmayin', 'assets/nesne/dmayin.png', { frameWidth: A.dmayin.w, frameHeight: A.dmayin.h });   // v1.58: zincirli mayın
    L.image('dmayinHalka', 'assets/nesne/dmayinHalka.png');
    L.image('dmayinTaban', 'assets/nesne/dmayinTaban.png');
    // Düşmanlar (her biri yatay şerit) ve mermiler · v1.47: ek düşmanlar (yumurta, yavru örümcek) katılır
    Object.assign(A.dusman, A.dusmanEk || {});
    Object.entries(A.dusman).forEach(([ad, D]) => {
      if (D.anim) L.spritesheet('d_' + ad, 'assets/dusman/' + ad + '.png', { frameWidth: D.w, frameHeight: D.h });
      else L.image(ad, 'assets/dusman/' + ad + '.png');
    });
    // v1.08: dükkan odası
    Object.keys(A.dukkan.parca).forEach(ad => L.image('dk_' + ad, 'assets/dukkan/' + ad + '.png'));
    L.spritesheet('dk_ikon', 'assets/dukkan/ikon.png', { frameWidth: A.dukkanIkon.boyut, frameHeight: A.dukkanIkon.boyut });   // v1.10
    L.spritesheet('dk_satici', 'assets/dukkan/satici.png', { frameWidth: A.dukkan.satici.w, frameHeight: A.dukkan.satici.h });
    Object.entries(A.ekKare).forEach(([ad, E]) => L.spritesheet('d_' + ad, 'assets/dusman/' + ad + '.png', { frameWidth: E.w, frameHeight: E.h }));   // v1.00 ek şeritler
    L.spritesheet('d_yarasaOl', 'assets/dusman/yarasaOl.png', { frameWidth: A.yarasaOl.w, frameHeight: A.yarasaOl.h });   // v0.98
    // Arayüz ve harfler
    A.ui.forEach(ad => L.image('ui_' + ad, 'assets/ui/' + ad + '.png'));
    L.image('ui_panelSonuc', 'assets/ui/panelSonuc.png');
    L.image('ui_yetenekBtn', 'assets/ui/ik_yetenekler.png');   // v1.61: kollu parşömen simgesi
    // v1.61: ayarlar (araclar/ayarUiKes.py)
    ['ayarlar', 'kapat', 'amb', 'ambKapali', 'ses', 'sesKapali', 'muzik', 'muzikKapali', 'gr0', 'gr1', 'gr2'].forEach(a => L.image('ik_' + a, 'assets/ui/ik_' + a + '.png'));
    L.image('ui_ayarPanel', 'assets/ui/ayarPanel.png');
    L.image('ui_ayarBaslik', 'assets/ui/ayarBaslik.png');
    ['pasli', 'koyu', 'parlak'].forEach(k => L.spritesheet('metal_' + k, 'assets/karo/metal_' + k + '.png', { frameWidth: 128, frameHeight: 128 }));   // v1.66: 4. bölüm
    L.image('ui_yetSerit', 'assets/ui/yetSerit.png');   // v1.62: yetenekler şeridi
    L.image('ui_yetAd', 'assets/ui/yetAd.png');         // v1.62: yetenek adı levhası   // v1.44: sağ üstte yetenekler rozeti   // v1.38: bölüm sonu çerçevesi (9:7, gerilmez)
    L.atlas('harf', 'assets/harf/harf.png', 'assets/harf/harf.json');   // araclar/harfAtlas.py
  }

  // Siyah ekranda beklemesin: ortada çubuk + yüzde
  yuklemeEkrani() {
    const W = this.scale.width, H = this.scale.height, u = Math.min(W, H) / 400;
    this.cameras.main.setBackgroundColor('#1a0f08');
    const bw = Math.min(W * 0.6, 420 * u), bh = 14 * u, x = (W - bw) / 2, y = H / 2;
    const cerceve = this.add.rectangle(W / 2, y, bw + 6 * u, bh + 6 * u).setStrokeStyle(2 * u, 0xffc21a);
    const cubuk = this.add.rectangle(x, y, 1, bh, 0xffc21a).setOrigin(0, 0.5);
    const yazi = this.add.text(W / 2, y - 26 * u, 'Yükleniyor 0%', {
      fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(18 * u) + 'px', color: '#ffc21a'
    }).setOrigin(0.5);
    // v1.28: bar görselleri (ui_yukBos / ui_yukDolu) kuyruğun başında; ikisi de inince düz çubuğun yerini alır
    let gBar = null, son = 0;
    this.load.image('ui_yukBos', 'assets/ui/yukBos.png');
    this.load.image('ui_yukDolu', 'assets/ui/yukDolu.png');
    this.load.on('filecomplete', () => {
      if (gBar || !this.textures.exists('ui_yukBos') || !this.textures.exists('ui_yukDolu')) return;
      const gw = Math.min(W * 0.7, 480 * u);
      gBar = doluBar(this, 'ui_yukBos', 'ui_yukDolu', (W - gw) / 2, y - 12 * u, gw, 0.07, 0.93);
      gBar.ayarla(son);
      cerceve.setVisible(false); cubuk.setVisible(false);
      yazi.setY(y - 12 * u - 22 * u);
    });
    this.load.on('progress', p => {
      son = p;
      cubuk.width = Math.max(1, bw * p);
      if (gBar) gBar.ayarla(p);
      yazi.setText('Yükleniyor ' + Math.round(p * 100) + '%');
    });
  }

  create() {
    this.oyuncuAnimasyonlari();
    this.toplananAnimasyonlari();
    this.dusmanAnimasyonlari();
    this.registry.set('bolum', ilkBolum);
    this.scene.start('Game');
  }

  oyuncuAnimasyonlari() {
    const aralik = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const tanimla = (doku, liste) => liste.forEach(([key, kareler, frameRate, repeat]) =>
      this.anims.create({ key, frames: kareler.map(frame => ({ key: doku, frame })), frameRate, repeat }));
    // assets/oyuncu/oyuncu.png
    // assets/oyuncu/oyuncu.png (araclar/oyuncuYeni.py) — kare numaraları ASSETLER.oyuncu.anim'den
    const OA = ASSETLER.oyuncu.anim;
    tanimla('oyuncu', [
      ['dur',      OA.dur,      7,  -1],  // bekleme
      ['ayakVur',  OA.ayakVur,  10, -1],  // uzun beklemede ayak vurma
      ['kos',      OA.kos,      13, -1],
      ['zipla',    OA.zipla,    14, 0],   // çömel → kalk → tepe
      ['dus',      OA.dus,      1,  0],
      ['takla',    OA.takla,    17, 0],   // çift zıplamada havada dönüş
      ['in',       OA.in,       1,  0],   // yere iniş (toz)
      ['sersem',   OA.sersem,   10, -1],  // yerde ayaktayken hasar
      ['vur',      OA.vur,      25, 0],   // baston vuruşu (vur.gif) — düşmana / boşluğa
      ['vurAlt',   OA.vurAlt,   25, 0],   // v1.18: önde sandık / taş / kasa varken aşağı vuruş (vurAsagi.gif)
      ['tirman',   OA.tirman,   8,  -1],
      ['uzat',     OA.uzat,     14, 0],   // baston kancası uzatma
      ['cek',      OA.cek,      10, -1],
      ['pogoHava', OA.pogoHava, 1,  0],
      ['pogoSek',  OA.pogoSek,  14, 0],   // değme anı (kıvılcım) → sekme
      ['egilDur',  OA.egilDur,  1,  0],   // eğik dururken
      ['egil',     OA.egil,     10, -1]   // eğik yürürken döngü
    ]);
    // assets/oyuncu/oyuncu2.png (araclar/oyuncuEk.py)
    tanimla('oyuncu2', [
      ['asili',    aralik(0, 5),   8,  -1],  // bastonla duvara asılı
      ['it',       aralik(6, 11).concat([24]), 10, -1],   // iterken yürüme döngüsü
      ['itDur',    [25],           1,  0],    // iterken durunca (eller önde, ayaklar sabit)
      ['itAlt',    aralik(26, 32), 10, -1],   // tek nesneyi iterken (eller aşağıda)
      ['itAltDur', [33],           1,  0],
      ['h_tirman', [12], 1, 0], ['h_egil', [13], 1, 0], ['h_hava', [14], 1, 0],   // duruma göre darbe kareleri
      ['h_cek',    [15], 1, 0], ['h_it',   [16], 1, 0], ['h_asili', [17], 1, 0],
      ['olum',     aralik(18, 23), 9,  0]    // bir kez oynar, son karede kalır
    ]);
    // assets/oyuncu/yuzme.png (araclar/yuzmeKes.py) — v1.55: yüzme döngüsü (8 kare)
    tanimla('yuzme', [['yuz', aralik(0, ASSETLER.yuzme.kare - 1), 9, -1]]);
    tanimla('dmayin', [['dmayinPatla', aralik(1, 7), 9, 0]]);   // v1.58: zincirli mayın patlaması, bir kez
    tanimla('mayin', [['mayinAc', aralik(0, ASSETLER.mayin.kare - 1), 7, 0]]);   // v1.57: açılış (140 ms/kare), bir kez
  }

  // Toplanabilirler: t_<ad>, 6 karelik dönme
  toplananAnimasyonlari() {
    ASSETLER.toplanan.sira.forEach((ad, r) => this.anims.create({
      key: 't_' + ad, frames: this.anims.generateFrameNumbers('toplanan', { start: r * 6, end: r * 6 + 5 }), frameRate: 10, repeat: -1
    }));
  }

  // Düşmanlar: d_<ad>_<anim>. Patronun saldırısı üç parçaya bölünür: hazır (2 kare) → atıl → dinlen
  dusmanAnimasyonlari() {
    const HIZ = { yuru: 10, uc: 16, bekle: 4, dur: 1, at: 10, ol: 12, saldir: 7, buyu: 4, hazir: 1, top: 1 };
    const DONGU = { yuru: true, uc: true, bekle: true, dur: true };
    Object.entries(ASSETLER.dusman).forEach(([ad, D]) => {
      if (!D.anim) return;
      const ekle = (k, kareler, fps, tekrar) => this.anims.create({
        key: 'd_' + ad + '_' + k, frames: kareler.map(frame => ({ key: 'd_' + ad, frame })), frameRate: fps, repeat: tekrar ? -1 : 0,
        yoyo: (ad === 'bitki' || ad === 'yumurta') && k === 'bekle'   // bitki duruşu / yumurta (1234321) ileri-geri, akıcı
      });
      Object.entries(D.anim).forEach(([k, kareler]) => {
        if (ad === 'boss' && k === 'saldir') {
          ekle('hazir', kareler.slice(0, 2), 4, false);
          ekle('atil', [kareler[2]], 1, false);
          ekle('dinlen', [kareler[3]], 1, false);
        } else if (ad === 'yumurta') ekle(k, kareler, k === 'bekle' ? 6 : 10, k === 'bekle');   // v1.47 (GIF 160 ms)
        else if (ad === 'yavru') ekle(k, kareler, k === 'saldir' ? 12 : 9, k !== 'ol');
        else ekle(k, kareler, ad === 'bitki' && k === 'bekle' ? 8 : HIZ[k] || 10, DONGU[k]);
      });
    });
    // v0.98: yarasa ölümü — 0–3 havada (bir kez), 5–8 yere düşünce (bir kez); 3 düşerken, 4 yere yaklaşınca kare olarak
    const yk = (k, kareler) => this.anims.create({ key: 'd_yarasaOl_' + k, frames: kareler.map(frame => ({ key: 'd_yarasaOl', frame })), frameRate: 12, repeat: 0 });   // v1.07: 8 → 12
    yk('hava', [0, 1, 2, 3]); yk('yer', [5, 6, 7, 8]);
    // v1.09: satıcı animasyonları (GIF süreleriyle): bekle döngü, nadir1/nadir2 ara sıra, basparmak (eşya alınca), para (para yetmeyince)
    Object.entries(ASSETLER.dukkan.satici.anim).forEach(([ad, A]) => this.anims.create({ key: 'dk_satici_' + ad,
      frames: A.kareler.map((frame, i) => ({ key: 'dk_satici', frame, duration: A.sure[i] })), frameRate: 10, repeat: ad === 'bekle' ? -1 : 0 }));
    // v1.00: ek şeritler (araclar/ekKareKes.py): <düşman>Ol → d_<düşman>Ol; <düşman>Bekle / <düşman>Saldir vb. → d_<düşman>_<anim> (eskisinin yerine)
    Object.entries(ASSETLER.ekKare).forEach(([ad, E]) => {
      const an = ad.slice(E.dusman.length).toLowerCase(), key = an === 'ol' ? 'd_' + ad : 'd_' + E.dusman + '_' + an;
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('d_' + ad, { start: 0, end: E.kare - 1 }), frameRate: E.fps, repeat: E.dongu ? -1 : 0 });
    });
  }
}
