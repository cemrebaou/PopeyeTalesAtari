# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.31 (`config.js` → `surum`)
Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Görseller (v0.05, yeni set): zemin ve arka plan tek bir karo setinde (`assets/tileset.png`, 64 px kaynak, oyunda 32 px); objeler `assets/*.png` (platform parçaları, sarmaşık/ip/merdiven/zincir, kasa, taş blok, kırmızı takoz, dikenler, sandık, kapı, bayrak). Ana karakter (v0.14): `assets/oyuncu.png` sprite sheet (aşağıda). Düşmanlar (v0.24) ve toplanabilirler (v0.29): kullanıcı görseli. Arayüz hâlâ yer tutucu (renkli şekiller, `boot.js`).

## Görsel sistemi
- **v0.20: yeni karo sistemi** (eski toprak dokusu / çimen / yan yosun / yeraltı katmanı / eski karolar silindi). Kaynak: `assets/kaynak/zemin_seti.png` (kullanıcının gönderdiği tek sayfa set) → `assets/tileset.png` (128 px kaynak karo, oyunda 32 px, 114 karo). Üretici: `python3 araclar/karoUret.py`.
- Karo setinde 5 malzeme, her biri 4 dolgu (F0–F3) + üst kenar parçaları (TL0/TL1 sol köşe, TM0/TM1 orta, TR0/TR1 sağ köşe): `k` kaya, `s` yosunlu parke taş, `h` tapınak tuğlası (sarmaşıklı), `w` tahta, `t` topraklı kök. Arka plan sürümleri aynı karoların %50 karartılmışı (`a` önekli, örn. `ahF0`).
- Zemin (çarpışan): çarpışma bloklarından otomatik döşenir (`python3 araclar/zeminDose.py`, bloklar değişince çalıştır). v0.21: yeraltında (satır 115 / 3680 px altı) topraklı kök `t`, üstünde her yerde gri parke taş `s`. Üstü açık kare → üst kenar (solu açıksa sol köşe, sağı açıksa sağ köşe, ikisi de/hiçbiri → orta), diğerleri dolgu. 
- Arka plan: çarpışmasız, yükseğe göre bantlar: tapınak tuğlası (en üst) → parke taş → kaya → toprak (yeraltı). Bant geçişinde üst kenar karosu. Süsler (karartılmış): kemerli pencere, yuvarlak delik, sütun üst/orta/alt, sarmaşık, meşale.
- Yere değmeyen zeminler (v0.31): normal zemin karoları (v0.21–0.30 arası ada / taş levha görseli kullanılıyordu, kaldırıldı). Çarpışmaları 1 kare yükseklikte kaldı.
- v0.21 taş bloklar: ara kayalar, basamaklar ve kırılmayan taşlar (`taslar`) çevre objesi `assets/tasBlok.png` ile çizilir (karo değil). v0.31: ön yüz tam bir kare, 3B üst yüz (`CONFIG.tasUstYuz` %15) karenin üstüne taşar; üst üste dizilince üstteki blok alttakinin üst yüzünü örter. Kırılışı `tasKirik.png` hazır.
- Engel kuralı (v0.21): kırılması gereken zayıf şeyler → tahta kasa (`kirilir`), kolay kırılmayanlar → taş blok (`taslar`, ileride güçlenince kırılacak), kırmızı takoz sadece patron odası girişinde (`takozlar`, kapı aralığına alındı: x 3344). Eski 4 takoz taş bloğa çevrildi (hiçbiri geçiş için gerekli değildi — `erisim.js` ile kontrol).
- Sarmaşıklar (v0.21): %30 ince (30 → 21 px), tam parça sayısıyla döşenir (son yaprak yarım kesilmez).
- Şelaleler (`level1.js` → `selaleler: [x, w, ustY, altY]`, 4 adet, 2 kare genişliğinde): v0.30'dan beri baştan sona sadece gövde dokusu `assets/selaleOrta.png` (üst/dip parçaları kaldırıldı). Doku dikeyde kesintisiz yapıldı (alt üçte biri üst kısma yumuşak geçişle karıştırıldı → kesim yeri görünmez) ve aşağı doğru akar (`CONFIG.selaleHiz` 140 px/sn).
- Su (3 yüzey, derin, sol/sağ taş duvarlı) ve sis karoları sette hazır, bölümde henüz kullanılmıyor.
- Kontrol noktası: bayrak direği (geçince bayrak kalkar). Çıkış: taş kemerli kapı (patron ölünce açılır). Sandık kapalı/açık görselli.
- Platform türleri kodda hazır, bu bölümde kullanılmıyor: kütük, taş levha, ip köprü, yüzen ada, dal, ızgara (parçalı: sol + orta + sağ), uçan hareketli platform ve asansör (altı kristalli, ipsiz), konveyör bant, çatlak taş (3 aşama), zıplatan yaprak, mantar, kırılabilir kasa.
Not: görseller dosyadan yüklendiği için oyun `file://` ile değil bir web adresinden (GitHub Pages, githack, yerel sunucu) açılmalı.

## Ekran ve kamera (v0.14)
- Oyun açıldığı ekranın/pencerenin tamamını doldurur (sabit en-boy oranı yok, siyah bant yok). Ekran döner ya da pencere değişirse anında yeniden boyutlanır (`main.js`).
- Tuval cihaz piksel oranında (en fazla 2x) çizilir → telefon/retina ekranda keskin görüntü.
- Kamera yakınlığı ekrana göre: her zaman ≈ 360 px dünya yüksekliği görünür (`CONFIG.kamera.gorunurY`, eskisi 544 → ~1.5x yakın); dar/dikey ekranda en az 560 px genişlik (`minGorunurX`).
- Arayüz (HUD, dokunmatik tuşlar, tam ekran tuşu, bitiş ekranı) ayrı `UI` sahnesinde: kamera yakınlaştırmasından etkilenmez, ekran boyutuna göre ölçeklenir.
- Tam ekran tuşu: tam ekrana geçer ve telefonu **yatay kilitler** (`screen.orientation.lock('landscape')`; Android Chrome'da çalışır, iPhone Safari kilit desteklemez). v0.30: "Telefonu yan çevirin" uyarısı kaldırıldı; yatay çevirmeyi tam ekran tuşu yapar (kilit ilk denemede olmazsa bir kez daha dener).

## Ana karakter sprite'ı (v0.14)
`assets/oyuncu.png`: 53 kare, 10 sütun, hücre 176×141 px (`CONFIG.oyuncu.kare`). Kaynak görsel düzensiz ızgaralıydı; kareler tek tek tespit edilip kesildi, kirli hale temizlendi. Her karede ayak çizgisi y=125, kafa hücrenin yatay ortasında (sola dönünce kayma olmaz).
**v0.19: bütün kareler tek ve sabit ölçekte (%100)** — satır bazlı büyütme/küçültme yok (v0.15'teki zıplama %10 / tırmanma %30 büyütmesi iptal). Asıl sorun eski bekleme ve koşma karelerinin büyük çizilmesiydi: 0–9 kullanıcının gönderdiği yeni bekleme (4) ve koşma (6) görselleriyle değiştirildi (kenardaki kırmızı hale temizlendi). 49–52 ayrı gönderilen pogo görselinden. Oyunda bekleme karesinde ayakta boy 48 px (`CONFIG.oyuncu.boy`). Çarpışma gövdesi (v0.26) ayakta 18×42 px → 1 karelik (32 px) aralıklara sığmaz; eğikken 18×26 px (`govdeEgik`) → eğilerek geçilir. Üstü kapalı yerde ↓ bırakılsa da eğik kalır ve zıplanamaz; açık yere çıkınca kalkar.
| Animasyon | Kareler | Ne zaman |
|---|---|---|
| dur | 0–3 | yerde dururken |
| kos | 4–9 | yürürken |
| zipla / dus / in | 10–12 / 13 / 14 | yükselirken / düşerken / yere inişte (toz) |
| sersem | 15–17 | hasar alınca (yıldızlar), ölünce |
| (yürüme döngüsü) | 18–23 | şimdilik kullanılmıyor |
| vur | 24–28 | baston vuruşu (v0.23: %10 büyük) |
| tirman | 29–32 | sarmaşıkta (durunca durur; v0.21: %30 büyük çizilir, `CONFIG.oyuncu.animOlcek`) |
| pogoHava | 49 | pogo açıkken havada (bastonun üstünde; v0.22: pogo kareleri %20 büyük) |
| pogoSek | 50 → 51 → 52 | değme anı: 50 sarı kıvılcım sadece o an, sonra 51, 52 (sekme); havada tekrar 49 |
| (eski pogo) | 33–40 | artık kullanılmıyor |
| uzat / cek | 41–43 / 44–48 | baston kancası uzatma / sandık çekme (v0.25: %16 büyük çizilir) |
| egil | 53–57 | yerde ↓ basılı: eğilerek yürüme (100 px/sn), dururken ilk karede durur (v0.21, kullanıcı görseli, %72 ölçek; v0.22: oyunda %16 küçük) |

## Sandık çekme (v0.14, bombanın yerine)
- Bomba tamamen kaldırıldı (eşyalar, tuş, HUD).
- Sandıklar (v0.28: %20 küçük, 32 px) ağırlıklı kutu: yerçekimiyle düşer, üstüne çıkılır (yüksek yerlere basamak), yürüyerek itilemez.
- C / L basılı tut: baston kanca gibi uzanır (0.2 sn). Önünde (bakılan yönde, aynı zeminde, ~30 px menzilde) sandık varsa takılır; sonra **geri yürüyerek** sandık peşinden çekilir (110 px/sn). Bırakınca, zıplayınca, hasar alınca veya sandık kenardan düşünce kanca bırakır.
- Sandığı açmak: baston vuruşu (X) ya da pogo ile üstüne inmek. Açık sandık da kutu olarak kalır (çekilebilir, üstüne çıkılır).
- Kırmızı takoz: artık bastonla (X) kırılır (eskiden sadece bomba kırıyordu).

## Kontroller
- Tam ekran: sağ üstteki "⛶ Tam ekran" butonu veya F tuşu (telefonda yataya kilitler)
- ← → (A/D): yürü
- ↑ (W) / SPACE / Z: zıpla (basılı tut = yüksek). Sarmaşığa değerken ↑ tırmanır; sarmaşıktan atlamak için SPACE/Z.
- ↓ (S) yerde: eğilerek yürü (v0.21); 1 karelik aralıklardan sadece eğilerek geçilir (v0.26)
- ↓ (S): **POGO** — sadece havadayken açılır: önce zıpla, havada ↓ basılı tut. Açılınca ↓ basılı kaldıkça zemine, düşmana, dikene, sandığa seker. Yerde dururken ↓ basmak pogo açmaz.
- X / K: baston vuruşu (yerde ve havada; düşmana vurur, mermi bozar, kasa/takoz kırar, sandık açar)
- C / L basılı tut: baston kancası — sandığı çek (geri yürü)
- R: bölümü yeniden başlat
- Mobil: ◀ ▶ ▲ | ▼POGO VUR ÇEK ZIPLA tuşları

## Sayılar
- Can: 3 kalp, Yaşam: 3. Hasar sonrası 1.5 sn dokunulmazlık.
- Yürüme 200 px/sn.
- **Zıplama yüksekliği** (v0.14 ölçüldü/ayarlandı): tepe = hız² / (2·yerçekimi). Eski: 520²/2800 ≈ 97 px (3 kare) — bölümde 4 karelik 27 basamak vardı, bu yüzden bazı yerlere zıplanamıyordu. Yeni: 625²/2800 ≈ **140 px ≈ 4.4 kare** → **en yüksek basamak 4 kare (128 px) olmalı**. Pogo 700 → ≈ 5.5 kare, pogo + zıpla basılı 790 → ≈ 7 kare, yaprak 950 → ≈ 10 kare.
- Bölüm taraması (v0.14): 4 kareyi aşan 5 duvarın dibine ara taş basamak eklendi (`level1.js` → `basamaklar`). 10 karelik olanlar sarmaşıkla çıkılan kule duvarları.
- **Yatay zıplama menzili** (v0.18 ölçüldü; havada tam sağa basılı, zıplama basılı, 60 Hz adımlar): yükseklik farkına göre en uzak iniş — 4 kare yukarı: 110 px (3.4 kare) · 3 yukarı: 137 px (4.3) · 2 yukarı: 153 px (4.8) · 1 yukarı: 167 px (5.2) · aynı hiza: 177 px (5.5) · 1 aşağı: 187 px (5.8) · 3 aşağı: 203 px (6.3).
- **Rahat zıplama kuralı**: bir atlayış, havada tam hızın **%65'iyle** yapılabiliyorsa rahat sayılır (telefonda kusursuz zamanlama gerekmesin). Pogo hesaba katılmaz. Örn. 3 kare yukarı + 3 kare boşluk (100. sütun şelalesi yanı) tam menzilde ancak bloğun ucuna 9 px'le iniliyordu → arasına kaya kondu.
- **Ara kayalar** (v0.18, `level1.js` → `kayalar`, 8 adet): tek yosunlu taş karosu (`sK`), çarpışmalı. Rahat zıplamayla ulaşılamayan yerler simülasyonla bulundu, her kaya tek tek denenerek en az kayayla çözüldü. Kontrol: patron, çıkış, 5 kontrol noktası, tüm sandıklar, elmaslar ve özel eşyalar pogo kullanmadan rahat zıplamayla ulaşılabilir.
- **Kontrol aracı**: `node araclar/erisim.js` → ulaşılamayan önemli yerleri listeler; `node araclar/erisim.js --coz` → çözüm için kaya önerir. Bölüme yeni platform/tepe/eşya eklenince çalıştır.
- Puan: elmas 100, büyük elmas / sandık 1000, kızıl elmas 500, altın para 50, düşman 200, patron 5000.
- **Toplanabilirler (v0.29)**: kaynak `assets/kaynak/toplanan_seti.png` → `python3 araclar/toplananKes.py` → `assets/toplanan.png` (6 satır × 6 karelik dönme; renkli hale silinir). Hepsi dönerek durur; oyundaki boylar `CONFIG.toplanBoy`.
  | Görsel | Ne | Etki |
  |---|---|---|
  | küçük altın taş (`elmas`) | elmaslar | +100 |
  | mavi elmas (`buyukelmas`) | özel eşya `buyuk`, sandık ödülü | +1000 |
  | kızıl yakut (`kizilelmas`) | özel eşya `kizil` | +500 |
  | kalp (`kalp`) | sandık ödülü `kalp` | +1 can kalbi (dolu ise +500) |
  | çapalı jeton (`yasam`) | özel eşya `yasam`, sandık ödülü `yasam` | +1 yaşam |
  | altın para (`altin`) | özel eşya `altin` (bölümde henüz yok) | +50 |
- Sandık açılınca ödülün görseli yukarı süzülür. 1 sandık (x 3734) çapalı jeton (+1 yaşam) verir.

## Düşmanlar
Görseller (v0.24): kaynak `assets/kaynak/dusman_seti.png` → `python3 araclar/dusmanKes.py` → her düşman `assets/d_<ad>.png` şeridi, mermiler `atesTopu.png` / `mizrak.png`, ölçüler `assetlar.js` → `ASSETLER.dusman` (hücre, ayak çizgisi, oyundaki görünür boy `boy`, animasyon kareleri). Kenardaki renkli hale temizlenir. Görseller sağa bakar, sola giderken çevrilir. Ölünce gövde kapanır, parçalanma animasyonu oynar, solup kaybolur (patronda bitince kapı açılır).
| Düşman | Animasyonlar (kare) | Boy (px) |
|---|---|---|
| gul (gül) | yuru 6, ol 4 | 36 |
| yilan | yuru 6, ol 4 | 22 |
| yuvarlak | yuru 6, ol 4 | 32 |
| ari | uc 4, ol 4 | 30 |
| orumcek | bekle 2, ol 4 | 34 |
| maymun | yuru 6 (v0.27, ayrı görsel `assets/kaynak/maymun_yuru.png`, şeridin sonuna eklendi), dur 1, at 4 (0.4 sn hazırlık), ol 4 + ateş topu | 38 |
| kopek | yuru 6, at 4, ol 5 + mızrak | 40 |
| boss | yuru 6, hazir 2 → atil 1 → dinlen 1, ol 4 | 84 |
- Gül (pembe küp): devriye yürür, 1 can
- Yılan (yeşil, alçak): yavaş devriye, 1 can
- Yuvarlak (pembe top): hızlı devriye, 1 can
- Arı (sarı top): havada bekler; 360 px yaklaşınca oyuncuyu kovalar (95 px/sn), 520 px uzaklaşınca bırakır
- Maymun: oyuncu **aynı zemine basınca** (yerde, ayak hizası aynı; v0.28) ve 420 px içindeyse dönüp 0.4 sn hazırlanıp ateş topu fırlatır (210 px/sn, 2.4 sn aralık)
- Mızraklı köpek: aynı şekilde mızrak fırlatır (280 px/sn, 1.8 sn aralık), 2 can
- Örümcek (mor): tavandan ipiyle inip çıkar, 1 can
- Patron (kırmızı büyük küp): 4 can; yürü → sarı uyarı → atılma → dinlen; 2 canın altında hızlanır ve zıplayarak atılır. Hasar sonrası 1.1 sn dokunulmaz. 520 px yaklaşınca uyanır.
- Uzaktaki düşmanlar (900 px) uyur. Mermiler 2.6 sn sonra kaybolur.

## 1. Bölüm — Unity seviyesinden aktarıldı
Kaynak: Unity projesindeki `SampleScene` (zemin, düşman, sandık, elmas, diken, sarmaşık, takoz konumları). 1 Unity birimi = 48 px. Dünya 5440 × 4544 px (170 × 142 karo), çok katlı:
- Alt kat (başlangıç, sol altta): uzun koridor, dikenli çukurlar, maymunlar, yeraltına inen merdiven
- Orta bölge: sarmaşıklarla çıkılan bloklar ve arılar
- Üst katlar: koridorlar, örümcekler, mızraklı köpekler
- En üst: patron (kırmızı takozlarla kapalı alanlar), patron ölünce sandık ve çıkış (helikopter yeri)

`level1.js`: `on` (zemin karoları) ve `arka` (arka plan karoları) satırları `araclar/karoUret.py` ile üretildi; çarpışma blokları `bloklar`. Kontrol noktaları: 5 adet. Çıkış patron öldükten sonra açılır.

Platform eklemek için `level1.js`'e alan eklenir: `platformlar: [{tip:'kutuk', x, y, n}]`, `hareketli: [{tip:'hover', y, min, max, n, hiz}]`, `asansorlar: [{x, alt, ust, hiz}]`, `bantlar: [{x, y, n, yon}]`, `catlaklar: [{x, y}]`, `yapraklar: [{x, y}]`, `kirilir: [[x, y, w, h]]`, `basamaklar: [[x, y, w, h]]` (taş basamak), `kayalar: [[x, y]]` (tek karo ara kaya) (piksel; n = orta parça sayısı).

## Dosyalar
- `araclar/dusmanKes.py` düşman görsellerini keser (Python, PIL, scipy)
- `araclar/zeminDose.py` zemin karo ızgarasını bloklardan yeniden döşer
- `araclar/karoUret.py` karo seti + bölüm ızgarası üretici (Python, PIL)
- `araclar/erisim.js` bölüm erişilebilirlik kontrolü (Node ile çalışır, oyuna dahil değil)
- `config.js` ayarlar ve sürüm · `level1.js` bölüm verisi (piksel) · `assetlar.js` karo numaraları ve obje boyutları (otomatik üretildi) · `assets/` görseller
- `main.js` oyun ayarı, ekran boyutlama · `boot.js` görsel yükleme, karakter animasyonları, yer tutucu görseller · `game.js` sahne, bölüm kurulumu, kamera · `oyuncu.js` oyuncu mekanikleri, sandık çekme, animasyon seçimi · `dusman.js` düşmanlar, patron, toplanabilirler, sandık açma · `ui.js` UI sahnesi (HUD, tuşlar, tam ekran, bitiş ekranı)
