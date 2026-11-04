// Popeye Tales (Atari) — oyun ayarları. Tüm uzunluklar dünya pikseli (1 karo = 32 px), süreler saniye.
const CONFIG = {
  surum: 'v0.62',
  bayrakBoy: 57.6,      // kontrol noktası bayrağının boyu
  dusmanOlcek: 0.9,     // tüm düşmanlar (görsel + gövde)
  selaleHiz: 140,       // şelale suyunun aşağı akış hızı (px/sn)
  kamera: {
    gorunurY: 360,      // ekranda görünen dünya yüksekliği — küçük = daha yakın kamera
    minGorunurX: 560    // dar/dikey ekranda en az bu kadar dünya genişliği görünür
  },
  fizik: {
    yercekimi: 1400,
    yurume: 200,
    egilYurume: 100,
    itme: 90,           // sandık / taş itme hızı
    asiliZipla: 160,    // bastonla asılıyken zıplayınca duvardan uzaklaşma hızı
    ziplama: -625,      // tepe ≈ 140 px ≈ 4.4 karo
    pogo: -700,         // ≈ 5.5 karo
    pogoYuksek: -790,   // pogo + zıpla basılı ≈ 7 karo
    maxDusme: 720,
    sarmasik: 120       // tırmanma hızı
  },
  oyuncu: {
    canMax: 3,
    yasam: 3,
    boy: 60.19,         // ayakta görünür boy; animOlcek bunun üstüne çarpılır, çarpışma gövdesi değişmez
    kare: { w: 176, h: 141, ayakY: 125, ayakBoy: 117 },   // assets/oyuncu/oyuncu.png hücresi
    kare2: { w: 240, h: 220, ayakY: 200 },                // assets/oyuncu/oyuncu2.png hücresi (aynı ölçek)
    kancaY: 59,         // asılırken bastonun ayaklardan yüksekliği; bu hizada taşa değince asılır
    ayakGomme: 2,       // ayaklar zemin çizgisinin bu kadar altına çizilir
    govdeG: 18,         // çarpışma gövdesi genişliği
    govdeY: 42,         // ayakta gövde yüksekliği — 1 karelik aralığa sığmaz
    govdeEgik: 26,      // eğikken gövde yüksekliği — 1 karelik aralıktan eğilerek geçilir
    // animasyona göre görsel ölçek (yoksa 1)
    animOlcek: {
      tirman: 1.3, uzat: 1.16, cek: 1.16, egil: 0.84, pogoHava: 1.2, pogoSek: 1.2, vur: 1.1,
      asili: 0.7, it: 0.77, h_tirman: 0.7, h_egil: 0.7, h_hava: 0.7, h_cek: 0.7, h_it: 0.7, h_asili: 0.7, olum: 0.7
    },
    dokunulmaz: 1.5,    // hasar sonrası
    saldiriSure: 0.24,
    saldiriBekleme: 0.32
  },
  cek: {
    menzil: 30,         // baston kancasının uzanabildiği mesafe (gövdeden sandığa)
    hiz: 110,           // geri yürüyerek çekme hızı
    uzatSure: 0.2
  },
  puan: { elmas: 10, buyuk: 100, kizil: 50, altin: 5, kalpFazla: 50, dusman: 20, patron: 500 },
  toplanBoy: { elmas: 16, buyukelmas: 26, kizilelmas: 24, kalp: 22, yasam: 24, altin: 18 },
  patron: { can: 4, uyanMesafe: 520 }
};

// assets/ses/<ad>.mp3 — yüklenen sesler. Kodda çalınıp burada olmayan ses sessizce atlanır (sesCal):
// 'kapiAcil' (çıkış kapısı açılınca) ve 'kazanma' (kapıdan girince) dosyaları gelince buraya eklenir.
const SESLER = [
  // oyuncu
  'bastonSalla', 'bastonVur', 'bastonTakil', 'cekTakil', 'sekme1', 'sekme2', 'inis', 'tirmanCik', 'tirmanIn',
  'adim1', 'adim2', 'adim3', 'kaydir1', 'kaydir2', 'zipla1', 'zipla2', 'zipla3', 'zipla4', 'zipla5', 'zipla6',
  'olum', 'tamKaybet',
  // toplanabilir, nesne, ortam
  'elmas', 'kizilElmas', 'buyukElmas', 'can', 'gizli', 'bayrak', 'sandikDus',
  'tasVur1', 'tasVur2', 'tasKir', 'selale',
  // düşmanlar
  'ates1', 'ates2', 'mizrak', 'ari', 'olMaymun', 'olKopek', 'olGul', 'olYuvarlak', 'olAri', 'olOrumcek', 'olYilan',
  'olBoss', 'boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7', 'boss8', 'boss9', 'boss10', 'boss11', 'boss12', 'boss13',
  // arayüz
  'tik'
];

// assets/nesne/kirTas.png satırları (araclar/kirTasKes.py ile aynı sıra)
const KIRTAS = ['kasa', 'gri', 'koyu', 'kristal', 'toprak', 'kizil', 'tugla', 'kum', 'mor', 'yosun'];
