// Popeye Tales (Atari) - ayarlar
const CONFIG = {
  surum: "v0.17",
  tile: 32,
  cimenGenislik: 32,    // çimen görselinin bir tekrarının oyundaki genişliği (px) = bir kare
  cimenUstOran: 0.18,   // çimen görselinin toprak çizgisinin üstüne taşan oranı (≈5 px; dolu kısım çizgiyi örter)
  cimenDerinlik: 1.2,   // çimen zemin katmanında, karakterin arkasında
  toprakDoku: 320,      // toprak dokusunun bir tekrarının oyundaki boyu (px)
  yeraltiKarartma: 0x4a4a4a, // yeraltı arka plan toprağının karartma tonu (koyu = daha karanlık)
  kamera: {
    gorunurY: 360,      // ekranda görünen dünya yüksekliği (px) — küçük = daha yakın kamera
    minGorunurX: 560    // dar/dikey ekranda en az bu kadar dünya genişliği görünür
  },
  fizik: {
    yercekimi: 1400,
    yurume: 200,
    ziplama: -625,      // tepe ≈ 625²/(2·1400) ≈ 140 px ≈ 4.4 kare → 4 karelik basamaklar rahat aşılır
    pogo: -700,         // ≈ 175 px ≈ 5.5 kare
    pogoYuksek: -790,   // pogo sırasında zıpla tuşu basılıysa ≈ 223 px ≈ 7 kare
    maxDusme: 720,
    sarmasik: 120,
    yaprak: -950,       // zıplatan yaprak (~10 kare)
    bant: 70,           // konveyör bant itme hızı
    catlakGecikme: 950, // çatlak taş: bastıktan sonra düşme süresi (ms)
    catlakYenilen: 3000 // çatlak taş: geri gelme süresi (ms)
  },
  oyuncu: {
    canMax: 3,
    yasam: 3,
    boy: 48,             // karakterin ekrandaki boyu (dünya px, ayakta)
    kare: { w: 182, h: 171, ayakY: 153, ayakBoy: 128 },  // assets/oyuncu.png hücresi: ayak çizgisi, ayakta boy (px)
    ayakGomme: 2,        // ayaklar zemin çizgisinin bu kadar altına çizilir (px) — çimene basmış görünür
    govdeG: 18,          // çarpışma gövdesi genişliği (px)
    govdeY: 38,          // çarpışma gövdesi yüksekliği (px)
    dokunulmaz: 1.5,     // sn
    saldiriSure: 0.24,   // sn
    saldiriBekleme: 0.32 // sn
  },
  cek: {
    menzil: 30,          // baston kancasının uzanabildiği mesafe (oyuncu gövdesinden sandığa, px)
    hiz: 110,            // geri yürüyerek çekme hızı (px/sn)
    uzatSure: 0.2        // baston uzatma süresi (sn)
  },
  puan: { elmas: 100, buyuk: 1000, kizil: 500, kalpFazla: 500, dusman: 200, patron: 5000 },
  patron: { can: 4, uyanMesafe: 520 }
};
