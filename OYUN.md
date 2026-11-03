# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.15 (`config.js` → `surum`)
Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Görseller (v0.05, yeni set): zemin ve arka plan tek bir karo setinde (`assets/tileset.png`, 64 px kaynak, oyunda 32 px); objeler `assets/*.png` (platform parçaları, sarmaşık/ip/merdiven/zincir, kasa, taş blok, kırmızı takoz, dikenler, sandık, kapı, bayrak). Ana karakter (v0.14): `assets/oyuncu.png` sprite sheet (aşağıda). Düşman, elmas ve arayüz hâlâ yer tutucu (renkli şekiller, `boot.js`).

## Görsel sistemi
- Zemin: 32 px ızgara, otomatik döşeme (üst sol/orta/sağ, sol/sağ duvar, iç dolgu, alt kenarlar, tek genişlikte sütun, tek blok). Üst katlar (Unity y > 16) yosunlu taş karolar. Alt katlardaki tüm toprak zeminler (v0.06) tek bir kesintisiz toprak dokusu (`assets/toprak.jpg`, v0.15'te yeni 1024 px görsel, mipmap'li → her yakınlıkta keskin, oyunda bir tekrar = `CONFIG.toprakDoku` 320 px) ile çizilir; doku dünya koordinatına hizalı olduğu için bloklar arasında dikiş olmaz. Çimen (v0.15): toprağın tüm açık üst kenarlarına döşenir; görselin %35'i toprak çizgisinin üstüne taşar (`CONFIG.cimenUstOran`), dolu kısmı çizgiyi örter → toprağın üst kenarı görünmez. Çimen karakterin önünde çizilir (`CONFIG.cimenDerinlik` 10.5) → ayakkabının alt kısmı çimenin içinde kalır; ayrıca ayaklar gövdenin 2 px altına çizilir (`CONFIG.oyuncu.ayakGomme`). Bir tekrarı bir kare genişliğinde (`CONFIG.cimenGenislik` = 32 px, yükseklik ≈ 29 px). Oyunda `assets/cimen_k.png` kullanılır (orijinal 500 px `cimen.png`'nin kaliteli küçültülmüş 128 px sürümü — GPU'nun 500→32 px ezmesi kırık/pikselli görüntü yapıyordu). Yan kenarlar (v0.11): `assets/kenar_k.png` (orijinal `kenar.png`'den küçültüldü) dikey yosun şeridi, toprağın sol ve sağ açık kenarlarına kenar çizgisine ortalanarak döşenir, bir tekrarı bir kare yüksekliğinde (`level1.js` → `kenarlar`).
- Arka plan: çarpışmasız, kare kare döşenen duvarlar; yükseğe göre bantlar: yeraltı → kaya → taş duvar → harabe. Yeraltı (v0.12, `level1.js` → `yeraltiY` altı): ön plandaki toprakla aynı doku, karartılmış (`CONFIG.yeraltiKarartma`), dünyaya hizalı olduğu için önündeki toprakla kesintisiz devam eder; karanlık kısım arka plan (çarpışmasız), açık renkli toprak basılan zemin. Taş/harabe bandında rastgele pencere, delik, meşale yeri, sarmaşık ve sütun süsleri. Uzun boş dikey alanlarda 4 şelale (karo karo; en alt karo da normal şelale karosu).
- Kontrol noktası: bayrak direği (geçince bayrak kalkar). Çıkış: taş kemerli kapı (patron ölünce açılır). Sandık kapalı/açık görselli.
- Platform türleri kodda hazır, bu bölümde kullanılmıyor: kütük, taş levha, ip köprü, yüzen ada, dal, ızgara (parçalı: sol + orta + sağ), uçan hareketli platform ve asansör (altı kristalli, ipsiz), konveyör bant, çatlak taş (3 aşama), zıplatan yaprak, mantar, kırılabilir kasa.
Not: görseller dosyadan yüklendiği için oyun `file://` ile değil bir web adresinden (GitHub Pages, githack, yerel sunucu) açılmalı.

## Ekran ve kamera (v0.14)
- Oyun açıldığı ekranın/pencerenin tamamını doldurur (sabit en-boy oranı yok, siyah bant yok). Ekran döner ya da pencere değişirse anında yeniden boyutlanır (`main.js`).
- Tuval cihaz piksel oranında (en fazla 2x) çizilir → telefon/retina ekranda keskin görüntü.
- Kamera yakınlığı ekrana göre: her zaman ≈ 360 px dünya yüksekliği görünür (`CONFIG.kamera.gorunurY`, eskisi 544 → ~1.5x yakın); dar/dikey ekranda en az 560 px genişlik (`minGorunurX`).
- Arayüz (HUD, dokunmatik tuşlar, tam ekran tuşu, bitiş ekranı) ayrı `UI` sahnesinde: kamera yakınlaştırmasından etkilenmez, ekran boyutuna göre ölçeklenir.
- Tam ekran tuşu: tam ekrana geçer ve telefonu **yatay kilitler** (`screen.orientation.lock('landscape')`; Android Chrome'da çalışır, iPhone Safari kilit desteklemez). Telefon dikey tutulursa üstte "Telefonu yan çevirin" uyarısı çıkar.

## Ana karakter sprite'ı (v0.14)
`assets/oyuncu.png`: 53 kare, 10 sütun, hücre 182×171 px (`CONFIG.oyuncu.kare`). Kaynak görsel düzensiz ızgaralıydı (satırlarda 10/8/11/12/8 kare); kareler tek tek tespit edilip kesildi, kirli kahverengi hale temizlendi, satırlar arası boy farkı (şapka genişliğine göre) eşitlendi. Her karede ayak çizgisi y=153, kafa hücrenin yatay ortasında (sola dönünce kayma olmaz). v0.15: zıplama kareleri (10–13) %10, tırmanma kareleri (29–32) %30 daha büyük — küçük hali büyütülmedi, orijinal büyük görselden tek adımda ölçeklendi (pikselleşme yok). 49–52: kullanıcının gönderdiği yeni pogo görselinden kesildi (aynı ölçek ve gövde hizası). Oyunda ayakta boy 48 px (`CONFIG.oyuncu.boy`), çarpışma gövdesi 18×38 px.
| Animasyon | Kareler | Ne zaman |
|---|---|---|
| dur | 0–3 | yerde dururken |
| kos | 4–9 | yürürken |
| zipla / dus / in | 10–12 / 13 / 14 | yükselirken / düşerken / yere inişte (toz) |
| sersem | 15–17 | hasar alınca (yıldızlar), ölünce |
| (yürüme döngüsü) | 18–23 | şimdilik kullanılmıyor |
| vur | 24–28 | baston vuruşu |
| tirman | 29–32 | sarmaşıkta (durunca durur) |
| pogoHava | 49 | pogo açıkken havada (bastonun üstünde) |
| pogoSek | 50 → 51 → 52 | değme anı: 50 sarı kıvılcım sadece o an, sonra 51, 52 (sekme); havada tekrar 49 |
| (eski pogo) | 33–40 | artık kullanılmıyor |
| uzat / cek | 41–43 / 44–48 | baston kancası uzatma / sandık çekme |

## Sandık çekme (v0.14, bombanın yerine)
- Bomba tamamen kaldırıldı (eşyalar, tuş, HUD).
- Sandıklar artık ağırlıklı kutu: yerçekimiyle düşer, üstüne çıkılır (yüksek yerlere basamak), yürüyerek itilemez.
- C / L basılı tut: baston kanca gibi uzanır (0.2 sn). Önünde (bakılan yönde, aynı zeminde, ~30 px menzilde) sandık varsa takılır; sonra **geri yürüyerek** sandık peşinden çekilir (110 px/sn). Bırakınca, zıplayınca, hasar alınca veya sandık kenardan düşünce kanca bırakır.
- Sandığı açmak: baston vuruşu (X) ya da pogo ile üstüne inmek. Açık sandık da kutu olarak kalır (çekilebilir, üstüne çıkılır).
- Kırmızı takoz: artık bastonla (X) kırılır (eskiden sadece bomba kırıyordu).

## Kontroller
- Tam ekran: sağ üstteki "⛶ Tam ekran" butonu veya F tuşu (telefonda yataya kilitler)
- ← → (A/D): yürü
- ↑ (W) / SPACE / Z: zıpla (basılı tut = yüksek). Sarmaşığa değerken ↑ tırmanır; sarmaşıktan atlamak için SPACE/Z.
- ↓ (S): **POGO** — sadece havadayken açılır: önce zıpla, havada ↓ basılı tut. Açılınca ↓ basılı kaldıkça zemine, düşmana, dikene, sandığa seker. Yerde dururken ↓ basmak pogo açmaz.
- X / K: baston vuruşu (yerde ve havada; düşmana vurur, mermi bozar, kasa/takoz kırar, sandık açar)
- C / L basılı tut: baston kancası — sandığı çek (geri yürü)
- R: bölümü yeniden başlat
- Mobil: ◀ ▶ ▲ | ▼POGO VUR ÇEK ZIPLA tuşları

## Sayılar
- Can: 3 kalp, Yaşam: 3. Hasar sonrası 1.5 sn dokunulmazlık.
- Yürüme 200 px/sn.
- **Zıplama yüksekliği** (v0.14 ölçüldü/ayarlandı): tepe = hız² / (2·yerçekimi). Eski: 520²/2800 ≈ 97 px (3 kare) — bölümde 4 karelik 27 basamak vardı, bu yüzden bazı yerlere zıplanamıyordu. Yeni: 625²/2800 ≈ **140 px ≈ 4.4 kare** → **en yüksek basamak 4 kare (128 px) olmalı**. Pogo 700 → ≈ 5.5 kare, pogo + zıpla basılı 790 → ≈ 7 kare, yaprak 950 → ≈ 10 kare.
- Bölüm taraması: 4 kareyi aşan 5 duvarın dibine ara taş basamak eklendi (`level1.js` → `basamaklar`: 5 ve 7 karelik duvarlar). 10 karelik olanlar sarmaşıkla çıkılan kule duvarları, dokunulmadı. Yeni tepe/duvar yaparken 4 kareyi geçme (geçecekse basamak, sarmaşık ya da yaprak koy).
- Puan: elmas 100, büyük elmas / sandık 1000, kızıl elmas 500, düşman 200, patron 5000.

## Düşmanlar
- Gül (pembe küp): devriye yürür, 1 can
- Yılan (yeşil, alçak): yavaş devriye, 1 can
- Yuvarlak (pembe top): hızlı devriye, 1 can
- Arı (sarı top): havada bekler; 360 px yaklaşınca oyuncuyu kovalar (95 px/sn), 520 px uzaklaşınca bırakır
- Maymun (kahve küp): menzile (420 px, aynı kat) girince 0.4 sn hazırlanıp ateş topu fırlatır (210 px/sn, 2.4 sn aralık)
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

`level1.js` otomatik üretilmiştir: `on` (taş zemin karoları), `toprak` (toprak dokulu bölgeler) ve `arka` (arka plan karoları) satırları + çarpışma blokları. Kontrol noktaları: 5 adet. Çıkış patron öldükten sonra açılır.

Platform eklemek için `level1.js`'e alan eklenir: `platformlar: [{tip:'kutuk', x, y, n}]`, `hareketli: [{tip:'hover', y, min, max, n, hiz}]`, `asansorlar: [{x, alt, ust, hiz}]`, `bantlar: [{x, y, n, yon}]`, `catlaklar: [{x, y}]`, `yapraklar: [{x, y}]`, `kirilir: [[x, y, w, h]]`, `basamaklar: [[x, y, w, h]]` (taş basamak; piksel; n = orta parça sayısı).

## Dosyalar
- `config.js` ayarlar ve sürüm · `level1.js` bölüm verisi (piksel) · `assetlar.js` karo numaraları ve obje boyutları (otomatik üretildi) · `assets/` görseller
- `main.js` oyun ayarı, ekran boyutlama · `boot.js` görsel yükleme, karakter animasyonları, yer tutucu görseller · `game.js` sahne, bölüm kurulumu, kamera · `oyuncu.js` oyuncu mekanikleri, sandık çekme, animasyon seçimi · `dusman.js` düşmanlar, patron, toplanabilirler, sandık açma · `ui.js` UI sahnesi (HUD, tuşlar, tam ekran, bitiş ekranı)
