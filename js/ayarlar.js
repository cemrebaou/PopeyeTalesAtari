// Popeye Tales (Atari) — oyun ayarları. Tüm uzunluklar dünya pikseli (1 karo = 32 px), süreler saniye.
const CONFIG = {
  surum: 'v0.90',
  bayrakBoy: 57.6,      // kontrol noktası bayrağının boyu
  ustUsteGomme: 4,
  tasYukari: 3,         // kırılır taşlar (kasa hariç) yerde bu kadar yukarıda çizilir (bölümde tasZeminYukari varsa o)
  sandikGomme: 3,       // sandık zemine bu kadar fazladan gömülür
  mermiMenzil: 8,       // düz atılan düşman mermileri bu kadar karo gidip kaybolur
  atisMenzil: 9,        // düşmanlar en çok bu kadar karo uzaktan ateş eder      // üst üste taş / kasa: üstteki, alttakinin üst kenar (perspektif) payına oturur (px)
  dusmanOlcek: 0.9,     // tüm düşmanlar (görsel + gövde)
  selaleHiz: 140,       // şelale suyunun aşağı akış hızı (px/sn)
  selaleDuyma: 420,     // şelale sesi kadrajın bu kadar dışından duyulmaya başlar (px)
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
    boy: 66.21,         // ayakta görünür boy (v0.76: %10 büyütüldü); animOlcek bunun üstüne çarpılır, çarpışma gövdesi değişmez
    // assets/oyuncu/oyuncu.png hücresi: ASSETLER.oyuncu.kare (araclar/oyuncuYeni.py, v0.78'den beri 2 kat çözünürlük)
    kare2: { w: 480, h: 440, ayakY: 400 },                // assets/oyuncu/oyuncu2.png hücresi (aynı ölçek, 6 sütun)
    kancaY: 65,         // asılırken bastonun ayaklardan yüksekliği; bu hizada taşa değince asılır
    ayakEk: 2,          // ayaklar zemin payının bu kadar daha altına çizilir
    govdeG: 18,         // çarpışma gövdesi genişliği
    govdeY: 42,         // ayakta gövde yüksekliği — 1 karelik aralığa sığmaz
    govdeEgik: 26,      // eğikken gövde yüksekliği — 1 karelik aralıktan eğilerek geçilir
    // animasyona göre görsel ölçek (yoksa 1)
    animOlcek: {
      tirman: 1.17, uzat: 1.16, cek: 1.16, egil: 0.756, egilDur: 0.756, kos: 1.1, pogoHava: 1.2, pogoSek: 1.2, vur: 1.1,
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
  puan: { elmas: 10, buyuk: 100, kizil: 50, altin: 5, capa: 25, tane: 15, kalpFazla: 50, dusman: 20, patron: 500 },
  toplanBoy: { elmas: 16, buyukelmas: 26, kizilelmas: 24, kalp: 22, capa: 20, altin: 16, tane: 9 },
  patron: { can: 4, uyanMesafe: 520 }
};

// assets/ses/<klasör>/<ad>.mp3 — yüklenen sesler, klasörlere göre. Kodda sesin sadece adı kullanılır (klasör yolu yükleyicide).
// Kodda çalınıp burada olmayan ses sessizce atlanır (sesCal): 'kapiAcil' (çıkış kapısı açılınca) ve 'kazanma' (kapıdan
// girince) dosyaları gelince buraya eklenir.
const SES_KLASOR = {
  popeye: ['bastonSalla', 'bastonVur', 'bastonTakil', 'cekTakil', 'sekme1', 'sekme2', 'sekme3', 'inis', 'tirmanCik', 'tirmanIn',
    'adim1', 'adim2', 'adim3', 'kaydir1', 'kaydir2', 'zipla1', 'zipla2', 'zipla3', 'olum', 'tamKaybet'],
  elmaslar: ['para1', 'para2', 'para3', 'para4', 'para5', 'elmas', 'elmasDus', 'altin', 'capaAltin', 'kizilElmas', 'buyukElmas',
    'yasam', 'can'],
  cevre: ['gizli', 'bayrak', 'sandikDus', 'tasVur1', 'tasVur2', 'tasKir', 'tahtaVur', 'tahtaKir', 'selale'],
  dusmanlar: ['ates1', 'ates2', 'mizrak', 'zehirAt', 'zehirVur', 'ari', 'olMaymun', 'olKopek', 'olGul', 'olYuvarlak', 'olAri',
    'olOrumcek', 'olYilan'],
  patron: ['olBoss', 'boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7', 'boss8', 'boss9', 'boss10', 'boss11', 'boss12', 'boss13'],
  arayuz: ['tik']
};
const SESLER = Object.values(SES_KLASOR).flat();
const SES_YOL = {};
Object.entries(SES_KLASOR).forEach(([k, l]) => l.forEach(ad => { SES_YOL[ad] = 'assets/ses/' + k + '/' + ad + '.mp3'; }));

// assets/nesne/kirTas.png satırları (araclar/kirTasKes.py ile aynı sıra)
const KIRTAS = ['kasa', 'gri', 'koyu', 'kristal', 'toprak', 'kizil', 'tugla', 'kum', 'mor', 'yosun'];
