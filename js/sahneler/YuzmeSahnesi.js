// Yüzme bölümü (3. bölüm, v1.55). Kamera sabit; deniz durmadan sola akar (biz sağa yüzüyoruz), Popeye ekranda
// yukarı / aşağı / sağa / sola yüzer. Suyun tamamı kodla çizilir (görsel dosyası yok) — SuFX, kameranın son işlemi:
//   1) SU_ARKA: su yarım çözünürlükte çizilir — derinlik rengi, yüzey, ışık huzmeleri, kostik (ışık ağı),
//      paralaks kayalar (uzak → yakın, sisli), kum, akıntıyla yatan yosun. Alfa kanalı = öndekilerin üstüne düşen ışık.
//   2) SU_SON: Popeye + baloncuk + toz katmanı kırılma dalgalanmasıyla suyun üstüne bindirilir, derinliğe göre su
//      rengine boyanır, üstüne ışık düşer; kenar karartma + bant kırıcı gren.
// Sayılar CONFIG.yuzme (ayarlar.js). Düşman yok (şimdilik).
// v1.60: sesler — roket açılışında fırlatma, zincirli topta patlama, kulaç çekişinde kulaç sesi, iç içe geçerek dönen ambiyans.
// v1.58: zincirli deniz mayını — dipteki halkadan zincirle yükselir, salınır; topuna değince kopup patlar (1 can).
// v1.57: dipteki mayınlar — ekrana girince açılır, sivri roket yukarı fırlar (taban zeminle akar); değerse 1 can.
// v1.56: kontrol parmak / fare sürükleme (yön tuşu yok); elmaslar — her oyunda aynı sayı ve toplam para, sadece yerleri rastgele.

const SU_ORTAK = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 outTexCoord;
uniform float uZaman;   // sn
uniform float uAkis;    // toplam akış (birim: ekran yüksekliği)
uniform float uOran;    // en / boy
uniform float uKalite;  // v1.61: grafik ayarı (0 düşük · 1 orta · 2 yüksek)
float h1(float n) { return fract(sin(n * 127.1 + 1.7) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const SU_ARKA = SU_ORTAK + `
const float EGIM = 0.42;   // ışık huzmelerinin yatıklığı
float n1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
float n2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Kostik: suyun dibe / gövdeye düşürdüğü oynak ışık ağı (döşenebilir)
float kostik(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0;
  vec2 i = p; float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c = 1.17 - pow(c / 4.0, 1.4);
  return pow(abs(c), 8.0);
}
// Sivri kayalık sırtı (0–1)
float kaya(float x) {
  float a = 1.0 - abs(2.0 * n1(x) - 1.0);
  float b = 1.0 - abs(2.0 * n1(x * 2.7 + 5.3) - 1.0);
  return a * a * 0.6 + b * 0.25 + n1(x * 6.3 + 1.7) * 0.15;
}
// Paralaks katmanı: y < h ise kayanın içi; üst kenarı yukarıdan ışık alır, aşağı doğru koyulaşır
vec3 katman(vec3 c, float y, float h, vec3 renk, float isik, float yum) {
  float e = h - y;
  vec3 k = renk * (1.0 + isik * exp(-max(e, 0.0) * 38.0)) * (1.0 - 0.45 * smoothstep(0.0, 0.25, e));
  return mix(c, k, smoothstep(0.0, yum, e));
}
float kumH(float x) { return 0.088 + 0.022 * n1(x * 1.3) + 0.006 * n1(x * 6.0 + 2.0); }
// Yosun: hücre başına en çok bir sap; akıntıyla sola yatar, ucuna doğru dalgalanır. x = örtü (0–1), y = uca yakınlık.
// taban < 0 ise kumun üstünden çıkar.
vec2 yosun(vec2 q, float hucre, float boyK, float t, float tohum, float taban) {
  float ix = floor(q.x / hucre);
  vec2 o = vec2(0.0);
  for (int k = 0; k <= 2; k++) {
    float id = ix + float(k);
    float varMi = step(0.40, h1(id * 1.7 + tohum));
    float boy = boyK * (0.45 + 0.55 * h1(id * 5.3 + tohum));
    float x0 = (id + 0.25 + 0.5 * h1(id * 9.1 + tohum)) * hucre;
    float tb = taban < 0.0 ? kumH(x0) - 0.012 : taban;
    float yy = (q.y - tb) / boy;
    float yc = clamp(yy, 0.0, 1.0);
    float xc = x0 - 0.38 * boy * yc * yc + (0.014 * sin(yc * 6.5 - t * 2.4 + id * 2.1) - 0.006 * sin(t * 0.9 + id)) * yc;
    float gen = (0.0095 + 0.0045 * sin(yc * 22.0 + id * 4.0)) * (1.0 - 0.7 * yc);
    float m = (1.0 - smoothstep(gen * 0.5, gen, abs(q.x - xc))) * step(0.0, yy) * step(yy, 1.0) * varMi;
    if (m > o.x) o = vec2(m, yc);
  }
  return o;
}
void main() {
  vec2 uv = outTexCoord;
  float d = 1.0 - uv.y;                 // 0 yüzey, 1 dip
  float t = uZaman;
  vec2 p = vec2(uv.x * uOran, uv.y);    // birim: ekran yüksekliği

  // --- su kütlesi: yüzeyde turkuaz, dipte lacivert; içinde yavaş akan aydınlık / koyu bölgeler ---
  vec3 su = mix(vec3(0.13, 0.70, 0.84), vec3(0.03, 0.40, 0.67), smoothstep(0.0, 0.42, d));
  su = mix(su, vec3(0.012, 0.15, 0.36), smoothstep(0.28, 0.80, d));
  su = mix(su, vec3(0.004, 0.06, 0.18), smoothstep(0.70, 1.10, d));
  su *= 0.88 + 0.24 * n2(vec2((p.x + uAkis * 0.25) * 0.9, p.y * 1.5 - t * 0.03));
  // güneşin vurduğu yer
  float gx = p.x + d * EGIM - uOran * 0.62;
  float gunes = exp(-gx * gx * 0.9);
  su += vec3(0.20, 0.42, 0.40) * gunes * exp(-d * 2.6);

  // --- ışık huzmeleri: yüzeyden eğik iner, derinde söner, akışla sola kayar ---
  float rx = p.x + d * EGIM + uAkis * 0.16;
  float isin = smoothstep(0.50, 0.95, n2(vec2(rx * 3.1, t * 0.20))) * 0.85
             + smoothstep(0.55, 0.95, n2(vec2(rx * 7.3 + 13.0, t * 0.33 + 5.0))) * 0.55
             + smoothstep(0.60, 1.00, n2(vec2(rx * 15.0 + 31.0, t * 0.47 + 9.0))) * 0.40;
  isin *= (0.55 + 0.75 * gunes) * exp(-d * 2.3) * smoothstep(0.0, 0.12, d);
  isin *= 0.85 + 0.15 * n2(vec2(rx * 24.0, d * 7.0 - t * 0.7));
  float kv = uKalite > 0.5 ? kostik(vec2(p.x + uAkis * 0.5, p.y) * 1.25, t * 0.55) : 0.0;   // düşükte kostik yok
  vec3 c = su + vec3(0.50, 0.95, 1.00) * isin * 0.42 + vec3(0.35, 0.90, 0.90) * kv * 0.10 * exp(-d * 2.6);

  // --- yüzey (alttan): dalgalı parlak tavan, altında aydınlık ---
  float xs = p.x + uAkis * 0.7;
  float yz = 0.050 + 0.012 * sin(xs * 4.2 + t * 0.9) + 0.007 * sin(xs * 9.7 - t * 1.6) + 0.003 * sin(xs * 21.0 + t * 2.7);
  float par = n2(vec2(xs * 6.0 + t * 0.35, d * 70.0 - t * 0.7)) * 0.6 + n2(vec2(xs * 15.0 - t * 0.5, d * 150.0 + t * 0.4)) * 0.4;
  par = smoothstep(0.48, 0.74, par);   // yatay uzayan ışık çizgileri
  c = mix(c, mix(vec3(0.28, 0.82, 0.91), vec3(0.80, 1.0, 1.0), par), (1.0 - smoothstep(yz - 0.004, yz + 0.004, d)) * 0.8);
  c += vec3(0.70, 1.00, 1.00) * exp(-abs(d - yz) * 160.0) * 0.55;
  c += vec3(0.25, 0.60, 0.60) * exp(-max(d - yz, 0.0) * 7.0) * 0.30;

  // --- paralaks kayalar: uzak (soluk, yavaş) → yakın (koyu, hızlı) ---
  c = katman(c, uv.y, 0.17 + 0.25 * kaya((p.x + uAkis * 0.10) * 1.1 + 40.0), mix(su, vec3(0.03, 0.22, 0.42), 0.38), 0.30, 0.010);
  c = katman(c, uv.y, 0.11 + 0.21 * kaya((p.x + uAkis * 0.26) * 1.7 + 80.0), mix(su, vec3(0.015, 0.13, 0.29), 0.62), 0.70, 0.007);
  c = katman(c, uv.y, 0.07 + 0.15 * kaya((p.x + uAkis * 0.55) * 2.6 + 20.0), mix(su, vec3(0.008, 0.075, 0.18), 0.85), 0.90, 0.005);

  // --- arka yosun sırası, kum (üstünde kostik), öndeki yosunlar ---
  vec2 ya = yosun(vec2(p.x + uAkis * 0.8, uv.y), 0.085, 0.26, t, 11.0, 0.07);
  c = mix(c, mix(su, vec3(0.010, 0.13, 0.13), 0.80) * (0.8 + 0.5 * ya.y), ya.x);
  float xd = p.x + uAkis;
  float e = kumH(xd) - uv.y;
  vec3 kum = vec3(0.07, 0.25, 0.33) * (0.9 + 0.25 * n2(vec2(xd * 30.0, uv.y * 140.0)));
  if (uKalite > 1.5) kum += vec3(0.30, 0.70, 0.66) * kostik(vec2(xd * 1.5, uv.y * 6.0), t * 0.7) * 0.55;   // yalnız yüksekte
  kum += vec3(0.10, 0.28, 0.30) * exp(-max(e, 0.0) * 60.0);
  kum *= 1.0 - 0.55 * smoothstep(0.0, 0.10, e);
  c = mix(c, kum, smoothstep(0.0, 0.004, e));
  vec2 yo = yosun(vec2(xd, uv.y), 0.11, 0.30, t, 3.0, -1.0);
  c = mix(c, mix(vec3(0.010, 0.13, 0.10), vec3(0.05, 0.36, 0.22), yo.y * yo.y), yo.x);   // ucu açık yeşil

  c += vec3(0.50, 0.95, 1.00) * isin * 0.10;   // huzmeler her şeyin önünden de geçer
  gl_FragColor = vec4(c, clamp(isin * 0.6 + kv * 0.8 * exp(-d * 1.2), 0.0, 1.0));
}
`;

const SU_SON = SU_ORTAK + `
uniform sampler2D uMainSampler;   // Popeye + baloncuk + toz (saydam zemin)
uniform sampler2D uArka;          // su (SU_ARKA)
void main() {
  vec2 uv = outTexCoord;
  float d = 1.0 - uv.y;
  float t = uZaman;
  float x = uv.x * uOran + uAkis * 0.6;
  // kırılma: görüntü suyun içinden bakılıyormuş gibi hafifçe dalgalanır
  vec2 k = vec2(sin(uv.y * 21.0 + t * 1.6 + x * 4.0) + 0.5 * sin(uv.y * 43.0 - t * 2.2 + x * 9.0),
                cos(x * 15.0 + t * 1.3 + uv.y * 5.0) + 0.5 * cos(x * 29.0 - t * 1.9 + uv.y * 11.0));
  vec2 kay = k * vec2(0.0017 / uOran, 0.0017);
  vec4 arka = texture2D(uArka, uv + kay * 1.5);
  vec4 s = texture2D(uMainSampler, uv + kay);
  vec3 on = s.rgb * mix(vec3(0.88, 0.98, 1.0), vec3(0.52, 0.76, 0.96), smoothstep(0.05, 1.0, d));   // derinde mavileşir
  on = mix(on, arka.rgb * s.a, 0.10);                       // aradaki su
  on += vec3(0.55, 0.92, 1.0) * arka.a * 0.45 * s.a;        // üstüne düşen huzme + kostik
  vec3 c = arka.rgb * (1.0 - s.a) + on;
  vec2 v = uv - 0.5;
  c *= 1.0 - dot(v, v) * 0.5;
  c += (h2(gl_FragCoord.xy + fract(t) * 61.0) - 0.5) * (1.6 / 255.0);
  gl_FragColor = vec4(c, 1.0);
}
`;

class SuFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'SuFX', shaders: [{ name: 'son', fragShader: SU_SON }, { name: 'arka', fragShader: SU_ARKA }] });
    this.zaman = 0;
    this.akis = 0;
  }

  onDraw(rt) {
    const gl = this.gl, r = this.renderer, son = this.shaders[0], arka = this.shaders[1];
    const ayarla = (sh) => { this.set1f('uZaman', this.zaman, sh); this.set1f('uAkis', this.akis, sh); this.set1f('uOran', r.width / r.height, sh); this.set1f('uKalite', ayarAl().gr, sh); };
    ayarla(arka);
    this.bindAndDraw(rt, this.halfFrame1, true, true, arka);
    ayarla(son);
    this.set1i('uArka', 1, son);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.halfFrame1.texture.webGLTexture);
    this.bindAndDraw(rt, null, true, true, son);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
  }
}

// v1.56: elmas türleri — puan CONFIG.puan, görsel ASSETLER.toplanan, ses
const YUZ_ELMAS = {
  elmas: { puan: 'elmas', gorsel: 'elmas', ses: 'elmas', boy: 'elmasBoy' },
  kizil: { puan: 'kizil', gorsel: 'kizilelmas', ses: 'kizilElmas', boy: 'kizilBoy' },
  buyuk: { puan: 'buyuk', gorsel: 'buyukelmas', ses: 'buyukElmas', boy: 'buyukBoy' }
};

class YuzmeSahnesi extends Phaser.Scene {
  constructor() { super('Yuzme'); }

  create() {
    const Y = CONFIG.yuzme;
    sesleriYukle(this);
    this.bolumNo = this.registry.get('bolum') || 0;
    this.L = BOLUMLER[this.bolumNo];
    this.t = 0;
    this.akis = 0;
    this.akisCarpan = 1;
    this.hiz = new Phaser.Math.Vector2(0, 0);
    this.surukle = null;   // sürükleyen parmak / fare (pointer id)
    this.nefes = 1.2; this.nefesKalan = 0; this.nefesAra = 0;
    this.izAra = 0; this.dipAra = 0.6;
    this.kaynaklar = [];   // dipten baloncuk çıkaran yerler (akışla sola kayar)
    this.balonlar = [];
    this.ui = [];

    // İki kamera: ana (su efektli dünya) + arayüz (efektsiz)
    const ana = this.cameras.main;
    this.uiKam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.fx = null;
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.game.renderer.pipelines.addPostPipeline('SuFX', SuFX);
      ana.setPostPipeline('SuFX');
      const f = ana.getPostPipeline('SuFX');
      this.fx = Array.isArray(f) ? f[0] : f;
    } else ana.setBackgroundColor(0x0a4f86);
    this.olcuAl();

    this.dokulariUret();
    // Toz / plankton: uzaktakiler küçük, soluk, yavaş; yakındakiler iri, bulanık, hızlı (derinlik hissi)
    this.tozlar = [];
    for (let i = 0; i < Y.tozSayi; i++) {
      const z = Phaser.Math.FloatBetween(0.25, 1.9), yakin = z > 1.45;
      const img = this.dunya(this.add.image(Math.random() * this.G, Math.random() * this.Yuk, 'yz_nokta'));
      const boy = yakin ? Phaser.Math.FloatBetween(7, 15) : 1.6 + 2.6 * z;
      img.setDisplaySize(boy, boy).setTint(0xd4f4ff).setAlpha(yakin ? Phaser.Math.FloatBetween(0.08, 0.16) : 0.18 + 0.4 * Math.random()).setDepth(z < 1 ? 1 : 8);
      this.tozlar.push({ img, z, faz: Math.random() * 6.28, sal: Phaser.Math.FloatBetween(0.4, 1.3) });
    }
    // Akıntı çizgileri: sola hızla kayan ince, soluk çizgiler
    this.cizgiler = [];
    for (let i = 0; i < Y.cizgiSayi; i++) {
      const img = this.dunya(this.add.image(Math.random() * this.G, 0, 'yz_cizgi').setTint(0xc8f2ff));
      const c = { img, z: 1 };
      this.cizgiler.push(c);
      this.cizgiYenile(c, false);
    }

    // Popeye
    const A = ASSETLER.yuzme;
    this.px = this.G * 0.3; this.py = this.Yuk * 0.48;
    this.player = this.dunya(this.add.sprite(this.px, this.py, 'yuzme', 0).setOrigin(A.ox, A.oy).setDepth(5));
    this.player.setScale(Y.boy / A.boyPx);
    this.player.play('yuz');
    this.hedef = new Phaser.Math.Vector2(this.px, this.py);   // parmağın götürdüğü yer

    this.elmasPlani();
    this.can = canMaxi(); this.dokunulmaz = 0; this.olu = false;
    this.mayinlar = [];
    this.zincirler = [];
    this.sonrakiMayin = this.mesafe * Y.mayinBas;

    this.girdiKur();
    this.arayuzKur();
    this.scale.on('resize', this.yenidenBoyut, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.yenidenBoyut, this);
      (this.ambSesler || []).forEach(s => { try { s.stop(); s.destroy(); } catch (e) { /* zaten bitti */ } });
      this.ambSesler = [];
    });
    this.sesKur();
    this.grafikAyarla();
  }

  // Dünya nesnesi: arayüz kamerası çizmez
  dunya(o) { this.uiKam.ignore(o); return o; }

  // Görünen dünya: yükseklik 360 px (dar / dikey ekranda en az 560 px genişlik)
  olcuAl() {
    const W = this.scale.width, H = this.scale.height;
    const z = Math.min(H / 360, W / 560);   // v1.63: yüzme bölümü kendi 360 px kadrajında kalır (platform kamerası yakınlaştı)
    this.G = W / z; this.Yuk = H / z;
    this.cameras.main.setSize(W, H).setZoom(z).centerOn(this.G / 2, this.Yuk / 2);
    this.uiKam.setSize(W, H);
    // yüzme alanı: yüzeyin altı – kumun üstü
    this.alan = { x0: 74, x1: this.G - 54, y0: this.Yuk * 0.06 + 28, y1: this.Yuk * 0.895 - 30 };
  }

  yenidenBoyut() {
    this.olcuAl();
    this.arayuzKur();
  }

  // Baloncuk, yumuşak nokta ve akıntı çizgisi dokuları (bir kez çizilir)
  dokulariUret() {
    if (this.textures.exists('yz_balon')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 0.10).fillCircle(32, 32, 28);
    g.lineStyle(4, 0xffffff, 0.8).strokeCircle(32, 32, 28);
    g.fillStyle(0xffffff, 0.9).fillEllipse(22, 20, 12, 8);
    g.lineStyle(3, 0xffffff, 0.35).beginPath();
    g.arc(32, 32, 21, 0.2, 1.3);
    g.strokePath();
    g.generateTexture('yz_balon', 64, 64);
    g.clear();
    for (let r = 16; r >= 1; r--) g.fillStyle(0xffffff, 0.08).fillCircle(16, 16, r);
    g.generateTexture('yz_nokta', 32, 32);
    g.clear();
    for (let i = 0; i < 32; i++) {
      const a = Math.sin(Math.PI * i / 31);
      g.fillStyle(0xffffff, a * a * 0.9).fillRect(i * 8, 1, 8, 2);
    }
    g.generateTexture('yz_cizgi', 256, 4);
    g.destroy();
  }

  cizgiYenile(c, sagdan) {
    c.z = Phaser.Math.FloatBetween(1.5, 2.6);
    const boy = Phaser.Math.FloatBetween(50, 150);
    c.img.setDisplaySize(boy, Phaser.Math.FloatBetween(0.7, 1.4)).setAlpha(Phaser.Math.FloatBetween(0.05, 0.13)).setDepth(c.z > 2.1 ? 8 : 2);
    c.img.y = Phaser.Math.FloatBetween(this.Yuk * 0.08, this.Yuk * 0.88);
    if (sagdan) c.img.x = this.G + boy / 2 + Math.random() * this.G * 0.6;
  }

  // v1.56: yön tuşu yok — ekranda parmak / fare basılıyken sürüklemek Popeye'yi aynı yöne götürür (parmak üstünü kapatmaz)
  girdiKur() {
    const kb = this.input.keyboard;
    kb.on('keydown-R', () => this.scene.restart());
    kb.on('keydown-F', tamEkranDegistir);
    // 1, 2, … → o bölümü yükle (bilgisayarda)
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].slice(0, BOLUMLER.length).forEach((ad, i) => {
      const ac = () => { this.registry.set('bolum', i); this.scene.start('Game'); };
      kb.on('keydown-' + ad, ac);
      kb.on('keydown-NUMPAD_' + ad, ac);
    });
    this.input.addPointer(1);
    this.input.on('pointerdown', (p) => {
      if (this.bitti || this.olu || this.surukle !== null) return;
      this.surukle = p.id; this.sonP = { x: p.x, y: p.y };
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.surukle || this.bitti) return;
      const z = this.cameras.main.zoom * CONFIG.yuzme.hassas, R = this.alan;
      this.hedef.x = Phaser.Math.Clamp(this.hedef.x + (p.x - this.sonP.x) / z, R.x0, R.x1);
      this.hedef.y = Phaser.Math.Clamp(this.hedef.y + (p.y - this.sonP.y) / z, R.y0, R.y1);
      this.sonP = { x: p.x, y: p.y };
    });
    const birak = (p) => { if (p.id === this.surukle) this.surukle = null; };
    this.input.on('pointerup', birak);
    this.input.on('pointerupoutside', birak);
  }

  // Arayüz (efektsiz kamerada): sürüm yazısı, tam ekran tuşu, dokunmatik yön tuşları. Ekran değişince yeniden kurulur.
  arayuzKur() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
    const W = this.scale.width, H = this.scale.height, ana = this.cameras.main;
    const u = DPR * Phaser.Math.Clamp(Math.min(W, H) / DPR / 420, 0.75, 1.4);
    const ekle = (o) => {
      const gizle = (q) => { ana.ignore(q); if (q.list) q.list.forEach(gizle); };
      gizle(o);
      this.ui.push(o);
      return o;
    };
    ekle(this.add.text(8 * u, H - 6 * u, CONFIG.surum + '  ' + this.L.ad, { fontFamily: 'monospace', color: '#ffffff', fontSize: Math.round(11 * u) + 'px' })
      .setOrigin(0, 1).setAlpha(0.7));
    // v1.71: öbür bölümlerle aynı yerleşim — sağ üstte para, altında ayarlar tuşu (yetenek tuşu yok); tam ekran tuşu kaldırıldı
    // (sürüklemeyi başlatmasın diye dokunma burada biter)
    const rb = 46 * u;
    ekle(this.add.image(W - 12 * u - rb / 2, 56 * u + rb / 2, 'ik_ayarlar').setDisplaySize(rb, rb)
      .setInteractive({ useHandCursor: true }).on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.ayarAc(); }));
    // toplanan para (sol üst) ve bölüm ilerlemesi (üst orta)
    this.u = u;
    this.sayac = ekle(this.add.container(0, 0));
    this.sayacYaz();
    const cw = Math.min(W * 0.32, 260 * u), ch = 7 * u;
    ekle(this.add.rectangle(W / 2, 18 * u, cw + 4 * u, ch + 4 * u, 0x032a44, 0.55).setStrokeStyle(1.5 * u, 0xbff4ff, 0.6));
    this.cubuk = ekle(this.add.rectangle(W / 2 - cw / 2, 18 * u, cw, ch, 0x8ff0ff, 0.9).setOrigin(0, 0.5));
    this.cubuk.scaleX = Math.min(1, this.yol / this.mesafe);
    this.kalpler = ekle(this.add.container(12 * u, 10 * u));
    this.kalpYaz();
    if (this.bitti) this.bitisPaneli();
  }

  // v1.61: ayarlar menüsü — bu sahne durur, kapanınca sürer
  ayarAc() {
    if (this.scene.isActive('Ayar') || this.bitti || this.olu) return;
    sesCal(this, 'tik');
    this.surukle = null;
    this.scene.pause();
    this.scene.launch('Ayar', { geri: 'Yuzme' });
    this.scene.bringToTop('Ayar');
  }

  // v1.61: grafik ayarı — toz / akıntı çizgisi sayısı (düşük %40, orta %70); su efektinin kalitesi SuFX'te (uKalite)
  grafikAyarla() {
    const oran = [0.4, 0.7, 1][ayarAl().gr];
    this.tozlar.forEach((o, i) => o.img.setVisible(i < this.tozlar.length * oran));
    this.cizgiler.forEach((c, i) => c.img.setVisible(i < this.cizgiler.length * oran));
  }

  kalpYaz() {
    if (!this.kalpler) return;
    this.kalpler.removeAll(true);
    for (let i = 0; i < canMaxi(); i++) {
      const k = this.add.image(i * 46 * this.u, 0, i < this.can ? 'ui_kalp' : 'ui_kalpBos').setOrigin(0, 0);
      k.setScale(30 * this.u / k.height);
      this.cameras.main.ignore(k);
      this.kalpler.add(k);
    }
  }

  // ---- Mayınlar (v1.57) ----
  // Dipte durur, zeminle sola akar. Tamamı ekrana girince açılır (8 kare), sonra taban yerde kalır ve sivri roket
  // yukarı fırlar (yatayda tabanla birlikte gider — kendi yatay hareketi yok). Rokete değmek 1 can.
  mayinCikar() {
    const Y = CONFIG.yuzme, M = ASSETLER.mayin, s = Y.mayinBoy / M.zeminEn;
    const img = this.dunya(this.add.sprite(this.G + M.w * s / 2, this.Yuk * (1 - Y.mayinZemin), 'mayin', 0)
      .setOrigin(0.5, M.zeminY / M.h).setScale(s).setDepth(4));
    this.mayinlar.push({ img, s, durum: 0, roket: null });
  }

  mayinFirlat(m) {
    const M = ASSETLER.mayin, R = M.roket;
    m.img.setFrame(M.kare);   // yerde kalan taban
    m.roket = this.dunya(this.add.image(0, 0, 'mayinRoket').setOrigin(0, 0).setScale(m.s).setDepth(4));
    m.ry = m.img.y - M.zeminY * m.s + R.y * m.s;   // roketin üst kenarı (dünya)
    m.vy = CONFIG.yuzme.roketHiz;
    m.izAra = 0;
    sesCal(this, 'yzFirlat', { volume: 0.55 });   // v1.62: roket kalkmaya başlayıp alev görünce
    this.cameras.main.shake(180, 0.004);
  }

  hasarAl() {
    const Y = CONFIG.yuzme;
    this.can--;
    this.kalpYaz();
    this.dokunulmaz = Y.dokunulmaz;
    this.hiz.y = Math.max(this.hiz.y, 0) + 160;   // darbeyle aşağı itilir
    this.cameras.main.shake(260, 0.01);
    sesCal(this, 'tasVur1', { volume: 0.6 });
    if (this.can > 0) return;
    // can bitti: bölüm baştan (toplanan para kalıcı puana zaten yazıldı)
    this.olu = true; this.surukle = null;
    sesCal(this, 'tamKaybet', { volume: 0.6 });
    this.cameras.main.fadeOut(900, 0, 20, 40);
    this.time.delayedCall(1000, () => this.scene.restart());
  }

  mayinGuncelle(dt, akisHiz) {
    const Y = CONFIG.yuzme, M = ASSETLER.mayin, R = M.roket;
    while (!this.bitti && this.sonrakiMayin <= this.yol && this.yol < this.mesafe * Y.mayinSon) {
      if (Math.random() < Y.zincirOran) this.zincirCikar(); else this.mayinCikar();
      this.sonrakiMayin += Y.akisHiz * Phaser.Math.FloatBetween(Y.mayinAra[0], Y.mayinAra[1]);
    }
    const p = this.player, govde = this.govdeNokta(0.62, 0.5), c = Math.cos(p.rotation), s = Math.sin(p.rotation);
    this.mayinlar = this.mayinlar.filter(m => {
      const i = m.img, yarim = M.w * m.s / 2;
      i.x -= akisHiz * dt;
      if (m.durum === 0 && i.x + yarim * 0.8 < this.G) {   // kameranın içine girdi → açılış
        m.durum = 1;
        i.play('mayinAc');
        i.once('animationcomplete', () => { m.durum = 2; this.mayinFirlat(m); });
      }
      if (m.roket) {
        m.vy += Y.roketIvme * dt;
        m.ry -= m.vy * dt;
        const rx = i.x - yarim + R.x * m.s;
        m.roket.setPosition(rx, m.ry);
        const rw = R.w * m.s, rh = R.h * m.s;
        // alevin ucundan baloncuk izi
        m.izAra -= dt;
        if (m.izAra <= 0) { m.izAra = 0.04; this.balon(rx + rw * Phaser.Math.FloatBetween(0.4, 0.6), m.ry + rh * 0.85, Phaser.Math.FloatBetween(1, 3), 0, 40); }
        // çarpışma: roket gövdesi (daire) ↔ Popeye gövdesi (dönmüş elips)
        const r = rw * 0.36, dx = rx + rw / 2 - govde.x, dy = m.ry + rh * R.govdeY - govde.y;
        const lx = dx * c + dy * s, ly = -dx * s + dy * c;
        if (!this.olu && this.dokunulmaz <= 0 && (lx / (Y.toplaX * 0.8 + r)) ** 2 + (ly / (Y.toplaY + r * 0.8)) ** 2 < 1) this.hasarAl();
        if (m.ry + rh < -10) { m.roket.destroy(); m.roket = null; }
      }
      if (i.x < -yarim && !m.roket) { i.destroy(); return false; }
      return true;
    });
  }

  // ---- Zincirli mayın (v1.58) ----
  // Zemindeki halkadan (taban) zincirle yükselen dikenli top; yüksekliği rastgele. Zincir halka halka çizilir, akıntıyla
  // sola yatık salınır (uca doğru artar); top + üstündeki kısa zincir en uçta tek parça. Yalnız TOPA değmek sayılır
  // (zincire değmek serbest): top kopar, patlar (kare 1–7), geriye zincir kalır. Taban zeminle akar, kendi hareketi yok.
  zincirCikar() {
    const Y = CONFIG.yuzme, D = ASSETLER.dmayin, R = this.alan, s = Y.zincirBoy / (D.yaricap * 2), hs = s * D.halka.olcek;
    const zeminY = this.Yuk * (1 - Y.mayinZemin), x = this.G + 60;
    const taban = this.dunya(this.add.image(x, zeminY, 'dmayinTaban').setOrigin(D.taban.halkaX / D.taban.w, 1).setScale(hs).setDepth(4));
    const y0 = zeminY - (D.taban.h - Y.zincirGir) * hs;                    // zincirin tabandaki halkaya girdiği nokta
    const topY = Phaser.Math.FloatBetween(R.y0 + 6, Math.min(R.y1, y0 - D.merkez * s - 8));   // top ortasının yüksekliği (rastgele)
    const adim = D.halka.adim * hs, n = Math.max(0, Math.round((y0 - topY - D.merkez * s) / adim));
    const halkalar = [];
    for (let i = 0; i < n; i++)
      halkalar.push(this.dunya(this.add.image(x, y0, 'dmayinHalka').setOrigin(0.5, 1 - D.halka.pay / D.halka.h).setScale(hs).setDepth(4)));
    const top = this.dunya(this.add.sprite(x, y0, 'dmayin', 0).setOrigin(D.ox, D.oy - Y.zincirGir / D.h).setScale(s).setDepth(4));
    this.zincirler.push({ taban, halkalar, top, s, adim, y0, patladi: false, faz: Math.random() * 6.28, hiz: Phaser.Math.FloatBetween(1.0, 1.5) });
  }

  zincirGuncelle(dt, akisHiz) {
    const Y = CONFIG.yuzme, D = ASSETLER.dmayin, p = this.player;
    const govde = this.govdeNokta(0.62, 0.5), c = Math.cos(p.rotation), sn = Math.sin(p.rotation);
    this.zincirler = this.zincirler.filter(m => {
      m.taban.x -= akisHiz * dt;
      // salınım: akıntı yönüne (sola) yatık + sağa sola sallanma; açı tabandan uca doğru büyür, üstünde küçük bir dalga gezer
      const N = m.halkalar.length + 1, aci = Y.zincirYatik + Y.zincirSalinim * Math.sin(this.t * m.hiz + m.faz);
      let x = m.taban.x, y = m.y0, a = 0;
      m.halkalar.forEach((h, k) => {
        a = aci * (k + 1) / N + 0.035 * Math.sin(this.t * 2.3 - k * 0.55 + m.faz);
        h.setPosition(x, y).setRotation(a);
        x += Math.sin(a) * m.adim; y -= Math.cos(a) * m.adim;
      });
      a = aci + 0.035 * Math.sin(this.t * 2.3 - N * 0.55 + m.faz);
      m.top.setPosition(x, y).setRotation(a);
      if (!m.patladi && !this.olu) {
        const u = D.merkez * m.s, r = D.yaricap * m.s * Y.zincirCarp;
        const dx = x + Math.sin(a) * u - govde.x, dy = y - Math.cos(a) * u - govde.y;
        const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
        if ((lx / (Y.toplaX * 0.8 + r)) ** 2 + (ly / (Y.toplaY + r * 0.8)) ** 2 < 1) {
          m.patladi = true;
          m.top.play('dmayinPatla');
          m.top.once('animationcomplete', () => m.top.setFrame(8));   // geriye yalnız zincir kalır
          sesCal(this, 'yzPatla', { volume: 0.7 });
          for (let i = 0; i < 14; i++)
            this.balon(x + Math.sin(a) * u + Phaser.Math.FloatBetween(-18, 18), y - Math.cos(a) * u + Phaser.Math.FloatBetween(-18, 18),
              Phaser.Math.FloatBetween(1.2, 4), Phaser.Math.FloatBetween(-70, 70), Phaser.Math.FloatBetween(-70, 20));
          if (this.dokunulmaz <= 0) this.hasarAl(); else this.cameras.main.shake(200, 0.006);
        }
      }
      if (m.taban.x < -90) { m.taban.destroy(); m.top.destroy(); m.halkalar.forEach(h => h.destroy()); return false; }
      return true;
    });
  }

  // ---- Sesler (v1.60) ----
  sesKur() {
    // Kulaç: yüzme döngüsünde kollar geri çekilmeye başlarken (kare 2) bir kulaç sesi — animasyon yavaşlar / hızlanırsa ses de ona uyar.
    // 16 kulaç sesi karışık torbadan çalar (hepsi bir kez çalmadan tekrar yok).
    this.kulacTorba = [];
    this.player.on('animationupdate', (anim, kare) => {
      if (kare.textureFrame !== 2 || this.olu) return;
      if (!this.kulacTorba.length) this.kulacTorba = Phaser.Utils.Array.Shuffle(Array.from({ length: 16 }, (_, i) => 'yzKulac' + (i + 1)));
      sesCal(this, this.kulacTorba.pop(), { volume: 0.35 });
    });
    // Ambiyans: bitmeden 1 sn önce yenisi başlar, 1 sn'de biri söner biri yükselir (kopma olmaz). Yüklenmediyse yüklenince başlar.
    this.ambSesler = [];
    const AMB = 0.5, GECIS = 1000;
    const baslat = () => {
      if (!this.sys.isActive() || !this.cache.audio.exists('yzAmbiyans')) return;
      const s = sesBaslat(this, 'yzAmbiyans', { volume: 0 });
      if (!s) return;
      this.ambSesler.push(s);
      this.tweens.add({ targets: s, volume: AMB, duration: GECIS });
      const ms = Math.max(2000, s.duration * 1000 - GECIS);
      this.time.delayedCall(ms, () => {
        baslat();
        this.tweens.add({ targets: s, volume: 0, duration: GECIS, onComplete: () => {
          s.stop(); s.destroy();
          this.ambSesler = this.ambSesler.filter(q => q !== s);
        } });
      });
    };
    if (this.cache.audio.exists('yzAmbiyans')) baslat();
    else this.load.once('filecomplete-audio-yzAmbiyans', baslat);
  }

  sayacYaz() {
    if (!this.sayac) return;
    this.sayac.removeAll(true);
    // sol üstte (kalplerin altında) bu bölümde toplanan / toplam, sağ üstte toplam para — öbür bölümlerdeki yerlerinde
    const u = this.u, gizle = (y) => { this.cameras.main.ignore(y); y.list.forEach(o => this.cameras.main.ignore(o)); this.sayac.add(y); };
    gizle(gorselYazi(this, ['ui_elmas', this.toplanan + '/' + this.toplam], 20 * u, 26 * u).setPosition(12 * u, 60 * u));
    const para = gorselYazi(this, ['ui_altin', String(KAYIT.puan)], 24 * u, 30 * u);
    gizle(para.setPosition(this.scale.width - 12 * u - para.genislik, 24 * u));
  }

  // ---- Elmaslar (v1.56) ----
  // Liste sabit (CONFIG.yuzme.elmaslar): her oyunda aynı sayıda elmas, aynı toplam para. Rastgele olan yalnız sıraları ve
  // yükseklikleri. Küçük elmaslar 5'li dizi (düz, dalga, eğik), yakut ve mavi elmas tek. Hepsi bölüm boyunca eşit aralıkla gelir.
  elmasPlani() {
    const Y = CONFIG.yuzme, E = Y.elmaslar, P = CONFIG.puan;
    this.toplam = Object.keys(E).reduce((t, k) => t + E[k] * P[YUZ_ELMAS[k].puan], 0);
    this.toplanan = 0;
    this.kayitB = KAYIT.bolum && KAYIT.bolum[this.bolumNo];
    if (!this.kayitB) { KAYIT.bolum = KAYIT.bolum || {}; this.kayitB = KAYIT.bolum[this.bolumNo] = { enIyi: 0 }; }
    const olaylar = [];
    let kalan = E.elmas;
    while (kalan > 0) { const n = Math.min(Y.diziBoy, kalan); olaylar.push({ tur: 'elmas', n }); kalan -= n; }
    for (let i = 0; i < E.kizil; i++) olaylar.push({ tur: 'kizil', n: 1 });
    for (let i = 0; i < E.buyuk; i++) olaylar.push({ tur: 'buyuk', n: 1 });
    Phaser.Utils.Array.Shuffle(olaylar);
    this.mesafe = Y.akisHiz * Y.sure;   // bölüm uzunluğu (px yol)
    const ara = this.mesafe * 0.92 / olaylar.length;
    olaylar.forEach((o, i) => { o.yol = this.mesafe * 0.03 + i * ara; });
    this.olaylar = olaylar;
    this.yol = 0;
    this.elmaslar = [];
    this.bitti = false;
  }

  elmasCikar(o) {
    const R = this.alan, Y = CONFIG.yuzme, x0 = this.G + 40;
    const sekil = Phaser.Math.Between(0, 2), y0 = Phaser.Math.FloatBetween(R.y0 + 20, R.y1 - 20);
    const egim = Phaser.Math.FloatBetween(-0.45, 0.45);
    for (let i = 0; i < o.n; i++) {
      let y = y0;
      if (o.n > 1) {
        if (sekil === 1) y = y0 + Math.sin(i / (o.n - 1) * Math.PI * 2) * 24;
        else if (sekil === 2) y = y0 + (i - (o.n - 1) / 2) * 34 * egim;
      }
      y = Phaser.Math.Clamp(y, R.y0, R.y1);
      const T = YUZ_ELMAS[o.tur], boy = Y[T.boy];
      const img = this.dunya(this.add.sprite(x0 + i * Y.diziAra, y, 'toplanan', ASSETLER.toplanan.sira.indexOf(T.gorsel) * 6).setDepth(5));
      img.setScale(boy / Math.max(img.width, img.height));
      img.play({ key: 't_' + T.gorsel, startFrame: Phaser.Math.Between(0, 5) });
      this.elmaslar.push({ img, tur: o.tur, y, faz: Math.random() * 6.28 });
    }
  }

  elmasTopla(e) {
    const T = YUZ_ELMAS[e.tur];
    this.toplanan += CONFIG.puan[T.puan];
    // kalıcı puana yalnız bu bölümün en iyi sonucunu aşan kısım yazılır — aynı para iki kez kazanılmaz
    if (this.toplanan > this.kayitB.enIyi) {
      KAYIT.puan += this.toplanan - this.kayitB.enIyi;
      this.kayitB.enIyi = this.toplanan;
      kayitYaz();
    }
    sesCal(this, T.ses, { volume: 0.5 });
    for (let i = 0; i < (e.tur === 'elmas' ? 3 : 7); i++)
      this.balon(e.img.x + Phaser.Math.FloatBetween(-6, 6), e.img.y + Phaser.Math.FloatBetween(-6, 6), Phaser.Math.FloatBetween(1, 3), Phaser.Math.FloatBetween(-40, 40), Phaser.Math.FloatBetween(-50, 10));
    e.img.destroy();
    this.sayacYaz();
  }

  // Bölüm sonu: toplanan / toplam, dokununca baştan
  bitisPaneli() {
    const W = this.scale.width, H = this.scale.height, u = this.u, ana = this.cameras.main;
    const gizle = (q) => { ana.ignore(q); if (q.list) q.list.forEach(gizle); this.ui.push(q); return q; };
    gizle(this.add.rectangle(0, 0, W, H, 0x001a2e, 0.45).setOrigin(0, 0));
    const b = harfYazi(this, 'Bölüm Tamamlandı', 30 * u, 'orta');
    gizle(b.setPosition(W / 2 - b.genislik / 2, H * 0.3));
    const s = gorselYazi(this, ['ui_elmas', this.toplanan + '/' + this.toplam], 30 * u);
    gizle(s.setPosition(W / 2 - s.genislik / 2, H * 0.52));
    const t = harfYazi(this, this.bolumNo + 1 < BOLUMLER.length ? 'Sonraki bölüm için dokun' : 'Tekrar oynamak için dokun', 15 * u, 'orta');
    gizle(t.setPosition(W / 2 - t.genislik / 2, H * 0.68));
  }

  // Baloncuk (havuzdan): yükselir, akıntıyla sola sürüklenir, yüzeyde kaybolur
  balon(x, y, r, vx, vy) {
    let b = this.balonlar.find(q => !q.img.visible);
    if (!b) {
      if (this.balonlar.length >= CONFIG.yuzme.balonMax) return;
      b = { img: this.dunya(this.add.image(0, 0, 'yz_balon').setDepth(6)) };
      this.balonlar.push(b);
    }
    b.r = r; b.vx = vx || 0; b.vy = vy || 0; b.faz = Math.random() * 6.28;
    b.img.setPosition(x, y).setDisplaySize(r * 2, r * 2).setAlpha(Phaser.Math.FloatBetween(0.6, 0.9)).setVisible(true);
  }

  // Popeye'nin gövde ortasına göre bir noktanın (hücre oranı) dünyadaki yeri — dönmeyle birlikte
  govdeNokta(ox, oy) {
    const A = ASSETLER.yuzme, p = this.player;
    return new Phaser.Math.Vector2((ox - A.ox) * A.w * p.scaleX, (oy - A.oy) * A.h * p.scaleY).rotate(p.rotation).add({ x: p.x, y: p.y });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, Y = CONFIG.yuzme, p = this.player;
    this.t += dt;

    // ---- Hareket: Popeye parmağın götürdüğü yere su direnciyle gider (hız hedefe yumuşak yaklaşır, süzülür) ----
    const R = this.alan, yak = 1 - Math.exp(-dt * Y.ivme);
    this.hedef.x = Phaser.Math.Clamp(this.hedef.x, R.x0, R.x1);
    this.hedef.y = Phaser.Math.Clamp(this.hedef.y, R.y0, R.y1);
    const ix = Phaser.Math.Clamp((this.hedef.x - this.px) * Y.takip, -Y.hizX, Y.hizX);
    const iy = Phaser.Math.Clamp((this.hedef.y - this.py) * Y.takip, -Y.hizY, Y.hizY);
    this.hiz.x += (ix - this.hiz.x) * yak;
    this.hiz.y += (iy - this.hiz.y) * yak;
    this.px = Phaser.Math.Clamp(this.px + this.hiz.x * dt, R.x0, R.x1);
    this.py = Phaser.Math.Clamp(this.py + this.hiz.y * dt, R.y0, R.y1);
    const gx = Phaser.Math.Clamp(this.hiz.x / Y.hizX, -1, 1), gy = Phaser.Math.Clamp(this.hiz.y / Y.hizY, -1, 1);
    // dalış / çıkış: burun gidilen yöne eğilir (ileri bakmayı bırakmayacak kadar); geri giderken hafif dikleşir
    const egim = gy * Y.egim * (1 - 0.3 * Math.max(0, -gx)) + Math.sin(this.t * 1.3) * 0.02;
    p.rotation += (egim - p.rotation) * (1 - Math.exp(-dt * 5));
    p.setPosition(this.px, this.py + Math.sin(this.t * 2.1) * 2.2 * (1 - Math.abs(gy)));
    p.anims.timeScale = 1 + 0.5 * Math.max(0, gx) - 0.2 * Math.max(0, -gx) + 0.35 * Math.abs(gy);

    // ---- Akış: deniz hep sola akar; sağa yüzerken hızlanır, sola çekilirken yavaşlar ----
    const hedef = 1 + (gx > 0 ? (Y.akisIleri - 1) * gx : (1 - Y.akisGeri) * gx);
    this.akisCarpan += (hedef - this.akisCarpan) * (1 - Math.exp(-dt * 2));
    const akisHiz = Y.akisHiz * this.akisCarpan;
    this.akis += akisHiz * dt / this.Yuk;
    if (this.fx) { this.fx.zaman = this.t; this.fx.akis = this.akis; }

    // ---- Elmaslar: yolu gelince çıkar, denizle sola akar, gövdeye değince toplanır ----
    this.yol += akisHiz * dt;
    while (this.olaylar.length && this.yol >= this.olaylar[0].yol) this.elmasCikar(this.olaylar.shift());
    const govde = this.govdeNokta(0.62, 0.5), c = Math.cos(p.rotation), s = Math.sin(p.rotation);
    this.elmaslar = this.elmaslar.filter(e => {
      const i = e.img;
      i.x -= akisHiz * dt;
      i.y = e.y + Math.sin(this.t * 2 + e.faz) * 3;
      const dx = i.x - govde.x, dy = i.y - govde.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;   // gövdeye göre
      if (!this.olu && Math.abs(lx) < Y.toplaX && Math.abs(ly) < Y.toplaY) { this.elmasTopla(e); return false; }
      if (i.x < -30) { i.destroy(); return false; }
      return true;
    });
    this.mayinGuncelle(dt, akisHiz);
    this.zincirGuncelle(dt, akisHiz);
    if (this.dokunulmaz > 0) {
      this.dokunulmaz -= dt;
      p.setAlpha(this.dokunulmaz > 0 ? 0.35 + 0.65 * (Math.floor(this.t * 12) % 2) : 1);
    }
    if (this.cubuk) this.cubuk.scaleX = Math.min(1, this.yol / this.mesafe);
    if (!this.bitti && !this.olu && !this.olaylar.length && !this.elmaslar.length && this.yol >= this.mesafe) {
      this.bitti = true;
      this.bitisPaneli();
      // v1.71: dokununca sonraki bölüm (yoksa bu bölüm baştan)
      this.time.delayedCall(600, () => this.input.once('pointerup', () => {
        const no = this.bolumNo, sonraki = no + 1 < BOLUMLER.length ? no + 1 : no;
        Reklam.bolumGecti().then(() => {   // v1.77: önce geçiş reklamı (uygulamada)
          this.registry.set('bolum', sonraki);
          BOLUMLER[sonraki].yuzme ? this.scene.restart() : this.scene.start('Game');
        });
      }));
    }

    // ---- Toz ve akıntı çizgileri ----
    this.tozlar.forEach(o => {
      const i = o.img;
      i.x -= akisHiz * o.z * dt;
      i.y += Math.sin(this.t * o.sal + o.faz) * 5 * o.z * dt;
      if (i.x < -12) { i.x = this.G + 12 + Math.random() * 30; i.y = Math.random() * this.Yuk; }
    });
    this.cizgiler.forEach(c => {
      c.img.x -= akisHiz * c.z * dt;
      if (c.img.x < -c.img.displayWidth) this.cizgiYenile(c, true);
    });

    // ---- Baloncuklar ----
    // nefes: ağızdan aralıklı baloncuk kümesi
    this.nefes -= dt;
    if (this.nefes <= 0) { this.nefes = Phaser.Math.FloatBetween(2.2, 3.4); this.nefesKalan = Phaser.Math.Between(5, 9); }
    this.nefesAra -= dt;
    if (this.nefesKalan > 0 && this.nefesAra <= 0) {
      this.nefesKalan--; this.nefesAra = 0.07;
      const a = this.govdeNokta(ASSETLER.yuzme.agizX, ASSETLER.yuzme.agizY);
      this.balon(a.x + Phaser.Math.FloatBetween(-2, 2), a.y, Phaser.Math.FloatBetween(1.8, 4.6), this.hiz.x * 0.5 + 20, -30);
    }
    // palet izi: ayak ucundan minik baloncuklar (hızlandıkça sıklaşır)
    this.izAra -= dt * (1 + 0.8 * Math.max(0, gx) + 0.5 * Math.abs(gy));
    if (this.izAra <= 0) {
      this.izAra = Phaser.Math.FloatBetween(0.07, 0.16);
      const a = this.govdeNokta(0.06, 0.55 + Math.random() * 0.2);
      this.balon(a.x, a.y, Phaser.Math.FloatBetween(0.7, 1.7), -akisHiz * 0.4, Phaser.Math.FloatBetween(-12, 12));
    }
    // dipten çıkan baloncuk sütunları
    this.dipAra -= dt;
    if (this.dipAra <= 0) {
      this.dipAra = Phaser.Math.FloatBetween(0.5, 1.4);
      this.kaynaklar.push({ x: this.G + 20 + Math.random() * 120, kalan: Phaser.Math.Between(4, 12), ara: 0 });
    }
    this.kaynaklar = this.kaynaklar.filter(k => {
      k.x -= akisHiz * dt;
      k.ara -= dt;
      if (k.ara <= 0) {
        k.ara = Phaser.Math.FloatBetween(0.1, 0.24); k.kalan--;
        this.balon(k.x + Phaser.Math.FloatBetween(-3, 3), this.Yuk * 0.91, Phaser.Math.FloatBetween(1.5, 5), -akisHiz, 0);
      }
      return k.kalan > 0 && k.x > -30;
    });
    const yuzeyY = this.Yuk * 0.055;
    this.balonlar.forEach(b => {
      const i = b.img;
      if (!i.visible) return;
      b.vy += (-(34 + b.r * 9) - b.vy) * Math.min(1, dt * 3);     // iri baloncuk hızlı yükselir
      b.vx += (-akisHiz - b.vx) * Math.min(1, dt * 2.5);          // su sola sürükler
      i.x += (b.vx + Math.sin(this.t * 5 + b.faz) * 14) * dt;
      i.y += b.vy * dt;
      b.r *= 1 + 0.1 * dt;                                         // yükseldikçe genleşir
      i.setDisplaySize(b.r * 2, b.r * 2);
      if (i.y < yuzeyY || i.x < -20) i.setVisible(false);
    });
  }
}
