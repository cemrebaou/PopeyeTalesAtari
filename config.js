// Popeye Tales (Atari) - ayarlar
const CONFIG = {
  surum: "v0.37",
  tile: 32,
  bayrakBoy: 57.6,      // kontrol noktası bayrağı (v0.33: %10 küçük, 64 → 57.6)
  dusmanOlcek: 0.9,     // v0.32: tüm düşmanlar %10 küçük (görsel + gövde)
  tasUstYuz: 0.15,      // taş blok görselinde 3B üst yüzün oranı (üst üste dizerken örtüşme)
  selaleHiz: 140,       // şelale suyunun aşağı akış hızı (dünya px/sn)
  kamera: {
    gorunurY: 360,      // ekranda görünen dünya yüksekliği (px) — küçük = daha yakın kamera
    minGorunurX: 560    // dar/dikey ekranda en az bu kadar dünya genişliği görünür
  },
  fizik: {
    yercekimi: 1400,
    yurume: 200,
    egilYurume: 100,
    itme: 90,           // sandık itme hızı
    asiliZipla: 160,    // bastonla asılıyken zıplayınca duvardan uzağa hız    // eğilerek yürüme hızı
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
    boy: 52.8,           // v0.32: %10 büyük (48 → 52.8); animOlcek oranları bunun üstüne çarpılır, gövde aynı             // karakterin ekrandaki boyu (dünya px, ayakta)
    kare: { w: 176, h: 141, ayakY: 125, ayakBoy: 117 },
    kare2: { w: 176, h: 220, ayakY: 200 },   // assets/oyuncu2.png (asılma, itme, darbe kareleri) — aynı ölçek  // assets/oyuncu.png hücresi: ayak çizgisi, ayakta boy (px)
    kancaY: 52,          // asılma karesinde bastonun ayaklardan yüksekliği (px); kanca bu hizada taşa değince asılır
    ayakGomme: 2,        // ayaklar zemin çizgisinin bu kadar altına çizilir (px) — çimene basmış görünür
    govdeG: 18,          // çarpışma gövdesi genişliği (px)
    govdeY: 42,          // çarpışma gövdesi yüksekliği (px) — ayaktayken 1 karelik (32 px) aralığa sığmaz
    govdeEgik: 26,       // eğikken gövde yüksekliği — 1 karelik aralıktan eğilerek geçilir
    // animasyona göre görsel ölçek: tırmanma %30 büyük, çekme %16 büyük (v0.25: %30'dan %11 küçültüldü), eğilerek yürüme %16 küçük, pogo %20 büyük, baston vuruşu %10 büyük
    animOlcek: { tirman: 1.3, uzat: 1.16, cek: 1.16, egil: 0.84, pogoHava: 1.2, pogoSek: 1.2, vur: 1.1,
      asili: 0.7, it: 0.7, h_tirman: 0.7, h_egil: 0.7, h_hava: 0.7, h_cek: 0.7, h_it: 0.7, h_asili: 0.7, olum: 0.7 },   // v0.34: oyuncu2 kareleri %30 küçük
    dokunulmaz: 1.5,     // sn
    saldiriSure: 0.24,   // sn
    saldiriBekleme: 0.32 // sn
  },
  cek: {
    menzil: 30,          // baston kancasının uzanabildiği mesafe (oyuncu gövdesinden sandığa, px)
    hiz: 110,            // geri yürüyerek çekme hızı (px/sn)
    uzatSure: 0.2        // baston uzatma süresi (sn)
  },
  puan: { elmas: 100, buyuk: 1000, kizil: 500, altin: 50, kalpFazla: 500, dusman: 200, patron: 5000 },
  toplanBoy: { elmas: 16, buyukelmas: 26, kizilelmas: 24, kalp: 22, yasam: 24, altin: 18 },   // oyundaki boy (px)
  patron: { can: 4, uyanMesafe: 520 }
};
