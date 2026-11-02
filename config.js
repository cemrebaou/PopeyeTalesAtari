// Popeye Tales (Atari) - ayarlar
const CONFIG = {
  surum: "v0.10",
  genislik: 960,
  yukseklik: 544,
  tile: 32,
  cimenGenislik: 32,    // çimen görselinin bir tekrarının oyundaki genişliği (px)
  toprakDoku: 320,      // toprak dokusunun bir tekrarının oyundaki boyu (px)
  fizik: {
    yercekimi: 1400,
    yurume: 200,
    ziplama: -520,
    pogo: -600,
    pogoYuksek: -690,   // pogo sırasında zıpla tuşu basılıysa
    maxDusme: 720,
    sarmasik: 120,
    yaprak: -850,       // zıplatan yaprak (~8 tile)
    bant: 70,           // konveyör bant itme hızı
    catlakGecikme: 950, // çatlak taş: bastıktan sonra düşme süresi (ms)
    catlakYenilen: 3000 // çatlak taş: geri gelme süresi (ms)
  },
  oyuncu: {
    canMax: 3,
    yasam: 3,
    dokunulmaz: 1.5,     // sn
    saldiriSure: 0.2,    // sn
    saldiriBekleme: 0.35 // sn
  },
  puan: { elmas: 100, buyuk: 1000, kizil: 500, kalpFazla: 500, dusman: 200, patron: 5000 },
  bomba: { fitil: 1.3, yaricap: 96, bekleme: 0.4 },   // fitil sn, patlama yarıçapı px
  patron: { can: 4, uyanMesafe: 520 }
};
