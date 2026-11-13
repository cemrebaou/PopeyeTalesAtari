// Popeye Tales (Atari) — oyun ayarları. Tüm uzunluklar dünya pikseli (1 karo = 32 px), süreler saniye.
const CONFIG = {
  surum: 'v1.80',
  olcek: 0.9,           // v1.63: bölümdeki oyuncu, düşman, eşya, kapı, süs görselleri bu oranda (zemin karoları ve arka plan hariç)
  zeminGomme: 7,        // v1.63: tüm bölümlerde ortak — yere basan her şey zemin çizgisinin bu kadar altına çizilir (çimin içine oturur)
  bayrakBoy: 66,        // kontrol noktası bayrağının boyu (v1.35: kaideli yeni görsel)
  kapiBoy: 112,         // v1.35: dükkan / kilitli kapı boyu (v1.49: %40 büyük, 80 → 112)
  cikisKapiBoy: 101,    // v1.49: bölüm sonu kapısı (72 → 101)
  gizliKapiEn: 157,     // v1.37: gizli bonus kapısı genişliği (v1.49: %40 büyük, 112 → 157)
  patronKapiEn: 136,    // v1.37: patron kapısı genişliği
  bonusSure: 15,        // v1.37: bonus odasında kalma süresi (sn) (v1.54: 30 → 15)
  ustUsteGomme: 4,
  tasYukari: 0,         // kırılır taşlar (kasa hariç) yerde bu kadar yukarıda çizilir (v1.63: tüm bölümlerde ortak)
  sandikGomme: 3,       // sandık zemine bu kadar fazladan gömülür
  mermiMenzil: 8,       // düz atılan düşman mermileri bu kadar karo gidip kaybolur
  atisMenzil: 9,        // düşmanlar en çok bu kadar karo uzaktan ateş eder      // üst üste taş / kasa: üstteki, alttakinin üst kenar (perspektif) payına oturur (px)
  dusmanOlcek: 0.9,     // tüm düşmanlar (görsel + gövde)
  selaleHiz: 140,       // şelale suyunun aşağı akış hızı (px/sn)
  selaleDuyma: 420,     // şelale sesi kadrajın bu kadar dışından duyulmaya başlar (px)
  kamera: {
    gorunurY: 327,      // ekranda görünen dünya yüksekliği — küçük = daha yakın kamera (v1.63: %10 yakın, 360 → 327)
    minGorunurX: 509    // dar/dikey ekranda en az bu kadar dünya genişliği görünür (v1.63: 560 → 509)
  },
  fizik: {
    yercekimi: 1400,
    yurume: 200,
    egilYurume: 100,
    itme: 90,           // sandık / taş itme hızı
    asiliZipla: 160,
    duvarZiplaX: 230,   // v1.10: Duvar Zıplama yatay hızı    // bastonla asılıyken zıplayınca duvardan uzaklaşma hızı
    ziplama: -625,      // tepe ≈ 140 px ≈ 4.4 karo
    pogo: -700,         // ≈ 5.5 karo
    pogoYuksek: -790,   // pogo + zıpla basılı ≈ 7 karo
    maxDusme: 720,
    sarmasik: 120       // tırmanma hızı
  },
  oyuncu: {
    canMax: 3,
    yasam: 3,
    itYaklas: 17.27,    // v1.12: iterken görsel nesneye doğru kayma (60 kullanıcı birimi; 230 birim = 66.21 px)
    itCiftGeri: 5.76,   // v1.20: 2'li itmede görsel 20 kullanıcı birimi geri (itYaklas'tan düşülür)
    boy: 66.21,         // ayakta görünür boy (v0.76: %10 büyütüldü); animOlcek bunun üstüne çarpılır, çarpışma gövdesi değişmez
    // assets/oyuncu/oyuncu.png hücresi: ASSETLER.oyuncu.kare (araclar/oyuncuYeni.py, v0.78'den beri 2 kat çözünürlük)
    kare2: { w: 480, h: 440, ayakY: 400 },                // assets/oyuncu/oyuncu2.png hücresi (aynı ölçek, 6 sütun)
    kancaY: 65,         // asılırken bastonun ayaklardan yüksekliği; bu hizada taşa değince asılır
    ayakEk: 1,          // ayaklar zemin payının bu kadar daha altına çizilir
    govdeG: 18,         // çarpışma gövdesi genişliği
    govdeY: 42,         // ayakta gövde yüksekliği — 1 karelik aralığa sığmaz
    govdeEgik: 26,      // eğikken gövde yüksekliği — 1 karelik aralıktan eğilerek geçilir
    // animasyona göre görsel ölçek (yoksa 1)
    animOlcek: {
      tirman: 1.17, uzat: 1.044, cek: 1.044, egil: 0.756, egilDur: 0.756, kos: 1.1, pogoHava: 1.2, pogoSek: 1.2, vur: 0.99, vurAlt: 0.99,
      asili: 0.7, it: 0.77, itDur: 0.77, itAlt: 0.77, itAltDur: 0.77, h_tirman: 0.7, h_egil: 0.7, h_hava: 0.7, h_cek: 0.7, h_it: 0.7, h_asili: 0.7, olum: 0.7
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
  puan: { elmas: 10, buyuk: 100, kizil: 50, altin: 5, capa: 25, tane: 15, kalpFazla: 50, dusman: 20, patron: 500, yildiz: 1000 },   // yildiz: bölüm sonu ödül mücevheri (v1.33)
  yildizEsik: [0.33, 0.66, 0.99],   // v1.33: toplanabilirlerin bu oranı dolunca 1 / 2 / 3 mücevher
  toplanBoy: { elmas: 16, buyukelmas: 26, kizilelmas: 24, kalp: 22, capa: 20, altin: 16, tane: 9 },
  // v1.77: Android paketi (scripts/hazirla.js, .github/workflows/derle.yml) ve reklamlar (js/cekirdek/reklam.js)
  mobil: {
    paketAdi: 'com.air.popeyetales', oyunAdi: 'Popeye Tales Atari',
    surumTaban: 1000,   // versionCode = taban + derleme numarası (Play'deki eski sürümlerin üstünde kalsın)
    reklam: {
      testModu: false,   // true: Google'ın test reklamları
      uygulamaId: 'ca-app-pub-7983529419004158~2440234577',
      banner: 'ca-app-pub-7983529419004158/5546514728',    // kayıtlı, şimdilik gösterilmiyor
      gecis: 'ca-app-pub-7983529419004158/4233433051',     // bölüm sonu
      odullu: 'ca-app-pub-7983529419004158/7633622012',    // hazır, henüz bağlı değil
      acilis: 'ca-app-pub-7983529419004158/2129684245',    // açılışta / uygulamaya dönüşte
      gecisSikligi: 1    // kaç bölüm sonunda bir geçiş reklamı
    }
  },
  metalSandikAsagi: 11.5,   // v1.76: metal temalı bölümde sandık görseli bu kadar px (40 birim) aşağıda çizilir; gövde yerinde
  ikiX: { ton: -22, doygunluk: 0.15, parlaklik: 0.88 },   // v1.80: 2x renk efekti (ton kayması °, doygunluk artışı, parlaklık)
  muzikSes: 0.4,   // v1.79: bölüm / patron müziği ses düzeyi
  patron: { can: 5, uyanMesafe: 520 },
  // v1.69: 2. bölüm patronu Kobra Bekçi. yakin: bu mesafeden yakındaysa zehir yerine mızrak; hiz / bekle / zehirHiz: [normal, yarı canın altında];
  // firlat: mızrak vurunca oyuncuya verilen [yatay hız, yukarı hız, kontrolsüz süre sn]
  patron2: { can: 10, yakin: 170, hiz: [70, 100], bekle: [1.8, 1.1], saldiriFps: 9, zehirHiz: [340, 420], firlat: [420, 300, 0.4] },
  // v1.70: 4. bölüm patronu Paslı Dev. saldiriSayi: zıplamadan önceki en az saldırı; uzak: oyuncu bundan uzaktaysa zıplar (px);
  // baygin: baygın kalma süresi (sn); vurusAra: baygınken iki vuruş arası dokunulmazlık; ziplaSure: havada kalma (sn)
  patron3: { can: 20, hiz: 55, bekle: 1.3, saldiriSayi: 2, uzak: 240, baygin: 2, vurusAra: 0.45, mermiHiz: 360, ziplaSure: 0.9, firlat: [420, 300, 0.4] },
  // v1.55: yüzme bölümü (js/sahneler/YuzmeSahnesi.js). Uzunluklar dünya pikseli (ekran yüksekliği 360), hızlar px/sn.
  yuzme: {
    geriOran: 0.1,      // v1.79: can bitince toplam yolun bu oranı kadar geriden devam
    akisHiz: 150,       // denizin sola akış hızı (biz sağa yüzüyoruz)
    akisIleri: 1.3,     // sağa basarken akış çarpanı (hızlanma hissi)
    akisGeri: 0.8,      // sola basarken
    hizX: 260,          // Popeye'nin ekrandaki en yüksek yatay hızı
    hizY: 230,          // en yüksek dikey hızı
    ivme: 5,            // hızın hedefe yaklaşma oranı (1/sn) — küçük = daha ağır, sulu
    takip: 4.5,         // v1.56: parmağın götürdüğü yere gitme isteği (uzaklık × takip = istenen hız)
    hassas: 0.8,        // v1.56: sürükleme hassasiyeti (küçük = parmak az kayınca çok gider)
    egim: 0.5,          // dalarken / çıkarken gövde eğimi (radyan, en çok)
    boy: 118,           // Popeye'nin uzunluğu (palet ucundan ele)
    tozSayi: 80,        // suda asılı toz / plankton
    cizgiSayi: 8,       // akıntı çizgisi
    balonMax: 80,       // aynı anda en çok baloncuk
    // v1.56: elmaslar — her oyunda aynı sayı ve toplam para (120×10 + 16×50 + 6×100 = 2600), yalnız yerleri rastgele
    sure: 100,          // bölüm uzunluğu (sn, normal akışta)
    elmaslar: { elmas: 120, kizil: 16, buyuk: 6 },
    diziBoy: 5,         // küçük elmaslar 5'li dizi gelir
    diziAra: 26,        // dizide elmas arası (px)
    elmasBoy: 22, kizilBoy: 30, buyukBoy: 34,
    toplaX: 52, toplaY: 26,  // toplama kutusu (gövde ortasından, yarı en / yarı boy)
    // v1.57: mayın — dipte durur, ekrana girince açılır, roket yukarı fırlar; rokete değmek 1 can
    mayinAra: [4, 6.5], // iki mayın arası (sn, normal akışta) — roketli ya da zincirli
    mayinBas: 0.06, mayinSon: 0.9,   // bölümün hangi aralığında çıkar (yol oranı)
    mayinBoy: 84,       // mayının zemindeki genişliği (px)
    mayinZemin: 0.075,  // zemin çizgisinin ekran altından yüksekliği (ekran oranı)
    roketHiz: 25,       // roketin ilk yükselme hızı
    roketIvme: 80,      // yükselme ivmesi (px/sn²)
    dokunulmaz: 1.6,    // hasardan sonra dokunulmazlık (sn)
    // v1.58: zincirli mayın — zemindeki halkadan zincirle yükselir (yüksekliği rastgele), salınır; topa değince patlar
    zincirOran: 0.5,    // çıkan mayının zincirli olma olasılığı (gerisi roketli)
    zincirBoy: 40,      // topun gövde çapı (px, dikenler hariç)
    zincirCarp: 1.2,    // çarpma yarıçapı = gövde yarıçapı × bu (dikenlerin bir kısmı dahil)
    zincirGir: 8,       // halkaların birbirine / tabana geçme payı (kaynak px)
    zincirYatik: -0.1,  // akıntıyla sola yatıklık (radyan, uçta)
    zincirSalinim: 0.14 // salınım genliği (radyan, uçta)
  }
};

// assets/ses/<klasör>/<ad>.mp3 — yüklenen sesler, klasörlere göre. Kodda sesin sadece adı kullanılır (klasör yolu yükleyicide).
// Kodda çalınıp burada olmayan ses sessizce atlanır (sesCal): 'kapiAcil' (çıkış kapısı açılınca) ve 'kazanma' (kapıdan
// girince) dosyaları gelince buraya eklenir.
// v1.63: CONFIG.olcek bölüm görsellerine uygulanır (oyuncu görseli, düşmanlar, toplanabilirler, kapılar, bayrak).
// Sandık ve kırılır taşlar 1 karo kalır (bulmacalar karo ızgarasına göre).
['bayrakBoy', 'kapiBoy', 'cikisKapiBoy', 'gizliKapiEn', 'patronKapiEn', 'dusmanOlcek'].forEach(k => { CONFIG[k] *= CONFIG.olcek; });
CONFIG.oyuncu.boy *= CONFIG.olcek;
Object.keys(CONFIG.toplanBoy).forEach(k => { CONFIG.toplanBoy[k] *= CONFIG.olcek; });

const SES_KLASOR = {
  popeye: ['bastonSalla', 'bastonVur', 'bastonTakil', 'cekTakil', 'sekme1', 'sekme2', 'sekme3', 'inis', 'tirmanCik', 'tirmanIn',
    'adim1', 'adim2', 'adim3', 'kaydir1', 'kaydir2', 'zipla1', 'zipla2', 'zipla3', 'olum', 'tamKaybet', 'ayakVur', 'metalAdim1', 'metalAdim2', 'metalAdim3', 'metalAdim4'],   // v1.75: metal temalı bölümde adım
  elmaslar: ['para1', 'para2', 'para3', 'para4', 'para5', 'elmas', 'elmasDus', 'altin', 'capaAltin', 'kizilElmas', 'buyukElmas',
    'yasam', 'can'],
  cevre: ['kapiGir', 'kapiCik', 'gizliBonus', 'gizli', 'bayrak', 'sandikDus', 'tasVur1', 'tasVur2', 'tasKir', 'tahtaVur', 'tahtaKir', 'selale'],
  dusmanlar: ['ates1', 'ates2', 'mizrak', 'zehirAt', 'zehirVur', 'ari', 'olMaymun', 'olKopek', 'olGul', 'olYuvarlak', 'olAri',
    'olOrumcek', 'olYilan'],
  patron: ['olBoss', 'boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7', 'boss8', 'boss9', 'boss10', 'boss11', 'boss12', 'boss13',
    'kobraTis', 'kobraMizrak1', 'kobraMizrak2', 'kobraTukur', 'kobraZehirVur', 'kobraHasar1', 'kobraHasar2', 'kobraOl', 'patronDus', 'robotZipla'],   // v1.74
  arayuz: ['tik', 'odulElmas'],
  // v1.60: yüzme bölümü (araclar/yuzmeSes.py) — roket fırlatma, zincirli mayın patlaması, döngü ambiyans, kulaç sesleri
  yuzme: ['yzFirlat', 'yzPatla', 'yzAmbiyans', ...Array.from({ length: 16 }, (_, i) => 'yzKulac' + (i + 1))],
  muzik: ['patron1Muzik', 'patron2Muzik', 'patron3Muzik', 'bolum1Muzik', 'bolum2Muzik', 'bolum3Muzik', 'bolum4Muzik']   // v1.43: 1. bölüm patron savaşı müziği (döngü)   // odulElmas (v1.33): bölüm sonu ödül mücevherinden turuncu elmas çıkarken
};
// v1.79: müzikler büyük dosyalar — açılışta topluca değil, çalınacağı zaman yüklenir (yardimci.js muzikBaslat)
const SESLER = Object.values(SES_KLASOR).flat().filter(ad => !SES_KLASOR.muzik.includes(ad));
const SES_YOL = {};
Object.entries(SES_KLASOR).forEach(([k, l]) => l.forEach(ad => { SES_YOL[ad] = 'assets/ses/' + k + '/' + ad + '.mp3'; }));

// assets/nesne/kirTas.png satırları (araclar/kirTasKes.py ile aynı sıra)
const KIRTAS = ['kasa', 'gri', 'koyu', 'kristal', 'toprak', 'kizil', 'tugla', 'kum', 'mor', 'yosun'];
