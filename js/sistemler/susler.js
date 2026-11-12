// v1.37: Süsler — çarpışmasız bitki / çiçek / kaya ve tavandan sarkan sarmaşık / çelenk görselleri (nesne3 sayfası).
// Zemin karosu (üstü 2 kare boş) olan yerlere ve tavanlara (altı 3 kare boş) bölüm numarasına göre sabit tohumlu
// rastgelelikle serpilir. Mor kristal bölgesine (bolgeler 'm') konmaz; dikenli hücreler, sahte duvarlı odalar, kapı ve
// başlangıç çevresi boş kalır. Karoların önünde (derinlik 1.3), eşyaların ve oyuncunun arkasında çizilir.
// v1.39: zemin süsleri %10, tavandan sarkanlar %30 küçültüldü. Görseller bu boylara göre araclar/susBuyut.py ile
// üretilir (boy × 1,15 × 4 px): ekranda büyütülmez, hep küçültülerek çizilir. Boy değişirse susBuyut.py yeniden çalıştırılır.
const SUS_ZEMIN = [   // [ad, boy px, ağırlık]
  ['susBitki1', 52, 2], ['susBitki2', 45, 2], ['susBitki3', 36, 3], ['susBitki4', 40, 2], ['susBitki5', 23, 4],
  ['susCicek1', 31, 3], ['susCicek2', 34, 2], ['susKaya1', 18, 3], ['susKaya2', 27, 2]];
const SUS_TAVAN = [['susAsma1', 67, 3], ['susAsma2', 64, 3], ['susCelenk', 105, 2]];   // çelenkte boy = genişlik

Object.assign(OyunSahnesi.prototype, {
  susle() {
    if (this.L.sussuz) return;   // v1.68: metal bölümde bitki / kaya süsü yok
    const L = this.L, T = L.karo, G = this.izgara, H = G.length, W = G[0].length;
    let tohum = 987654 + this.bolumNo * 7919;
    const rnd = () => (tohum = (Math.imul(tohum, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
    const sec = (liste) => { let t = liste.reduce((a, s) => a + s[2], 0) * rnd(); return liste.find(s => (t -= s[2]) < 0) || liste[liste.length - 1]; };
    const mor = (L.bolgeler || []).find(b => b[1] === 'm');
    const morBas = Math.min(mor ? mor[0] : Infinity, L.susSinir || Infinity);   // v1.41: L.susSinir satırından aşağı süs yok (1. bölüm toprak bölgesi)
    const yasakAlan = (L.sahte || []).map(([x, y, w, h]) => new Phaser.Geom.Rectangle(x - T, y - 2 * T, w + 2 * T, h + 3 * T));
    const kapilar = [L.baslangic, L.cikis, L.dukkan && L.dukkan.kapi, L.bonus && L.bonus.kapi, L.patron && L.patron.kapi,
      L.kilitKapi && [L.kilitKapi[0], L.kilitKapi[1]], L.kilitKapi && [L.kilitKapi[2], L.kilitKapi[3]], L.anahtar].filter(Boolean);
    kapilar.forEach(([x, y]) => yasakAlan.push(new Phaser.Geom.Rectangle(x - 80, y - 120, 160, 140)));
    (L.sandiklar || []).forEach(([x, y]) => yasakAlan.push(new Phaser.Geom.Rectangle(x - 30, y - 40, 60, 44)));
    (L.kontrol || []).forEach(([x, y]) => yasakAlan.push(new Phaser.Geom.Rectangle(x - 30, y - 60, 60, 64)));
    (L.ipuclari || []).forEach(([x, y]) => yasakAlan.push(new Phaser.Geom.Rectangle(x - 20, y - 20, 200, 140)));
    const yasak = (x, y) => yasakAlan.some(r => r.contains(x, y));
    const dolu = (r, c) => r < 0 || r >= H || c < 0 || c >= W || G[r][c] === 1;
    const koy = (ad, x, y, boy, tavan) => {
      const O = ASSETLER.nesne3[ad];
      const img = this.add.image(x, y, ad).setDepth(1.3);
      if (ad === 'susCelenk') { img.setOrigin(0.5, 0).setDisplaySize(boy, boy * O.h / O.w); }
      else if (tavan) { img.setOrigin(0.5, 0).setDisplaySize(boy * O.w / O.h, boy); }
      else { img.setOrigin(O.ox, 1).setDisplaySize(boy * O.w / O.h, boy); if (rnd() < 0.5) img.setFlipX(true); }
      return img;
    };
    let sayi = 0;
    // Zemin süsleri: her satırda soldan sağa, aralık 5–11 sütun
    for (let r = 2; r < H; r++) {
      if (r >= morBas) break;
      let c = 1 + Math.floor(rnd() * 4);
      while (c < W - 1) {
        const zemin = dolu(r, c) && !dolu(r - 1, c) && !dolu(r - 2, c) && !this.dikenHucre.has(r + ',' + c) && !this.dikenHucre.has(r + ',' + (c - 1)) && !this.dikenHucre.has(r + ',' + (c + 1));
        if (zemin) {
          const x = c * T + T / 2 + Math.round((rnd() - 0.5) * 10), y = r * T + this.zeminGomme;
          if (!yasak(x, y - 10)) {
            const [ad, boy] = sec(SUS_ZEMIN);
            koy(ad, x, y, boy * CONFIG.olcek * (0.85 + rnd() * 0.3), false); sayi++;
          }
          c += 5 + Math.floor(rnd() * 7);
        } else c++;
      }
    }
    // Tavan süsleri: altı 3 kare boş tavan karoları, aralık 9–18 sütun
    for (let r = 0; r < H - 3; r++) {
      if (r >= morBas) break;
      let c = 2 + Math.floor(rnd() * 8);
      while (c < W - 2) {
        const tavan = dolu(r, c) && !dolu(r + 1, c) && !dolu(r + 2, c) && !dolu(r + 3, c);
        if (tavan) {
          const [ad, boy] = sec(SUS_TAVAN);
          const x = c * T + T / 2, y = (r + 1) * T - 3;
          const genis = ad === 'susCelenk';
          if (!yasak(x, y + 40) && (!genis || (dolu(r, c - 2) && dolu(r, c + 2) && !dolu(r + 1, c - 2) && !dolu(r + 1, c + 2)))) {
            koy(ad, x, y, boy * CONFIG.olcek * (0.85 + rnd() * 0.3), true); sayi++;
          }
          c += 9 + Math.floor(rnd() * 10);
        } else c++;
      }
    }
    this.susSayisi = sayi;
  }
});
