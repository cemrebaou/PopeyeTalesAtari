# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.86 (`js/ayarlar.js` → `CONFIG.surum`) · Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Bu dosya oyunun **şu anki** tasarım belgesidir; sürüm sürüm değişiklikler `git log`'da.

## Klasör yapısı
```
index.html                 betikleri sırayla yükler
js/
  ayarlar.js               CONFIG (tüm sayılar), SESLER (yüklenen sesler), KIRTAS (taş türleri)
  veri/assetlar.js         görsel verileri — araclar/*.py üretir, elle düzenlenmez
  veri/level1.js           1. bölüm verisi (koordinatlar piksel, ızgara 32 px)
  veri/level2.js           2. bölüm verisi (araclar/bolum2Uret.py üretir)
  cekirdek/yardimci.js     yerdeMi, govdeRect, ses (sesCal / sesBaslat / sesDurdur), tam ekran, harfYazi, gorselYazi
  sahneler/BootSahnesi.js  yükleme çubuğu + görseller + tüm animasyon tanımları (sesler oyun açılınca arka planda: sesleriYukle)
  sahneler/OyunSahnesi.js  seviye kurulumu, kamera (P: tüm harita), çarpışmalar, klavye, ana döngü, şelale
  sistemler/oyuncu.js      oyuncu: girdi, hareket, baston (vur/çek/it/asıl), sarmaşık, hasar/ölüm, animasyon, adım sesleri
  sistemler/dusmanlar.js   düşmanlar, patron, mermiler, hasar ve ölüm
  sistemler/nesneler.js    toplanabilirler ve ödüller, sandık, kırılır taşlar, kontrol noktası, gizli yer, çıkış
  sistemler/efektler.js    uçan yazılar, parçacıklar, puan, bölüm sonu, arayüz köprüsü
  sahneler/ArayuzSahnesi.js HUD, dokunmatik tuşlar, tam ekran tuşu, bitiş ekranı
  main.js                  BOLUMLER listesi, ?bolum=N, Phaser oyununu başlatır, ekran boyutlama
assets/
  karo/ oyuncu/ dusman/ nesne/ ui/ harf/ ses/   oyunun kullandığı dosyalar
  kaynak/                  kullanıcının gönderdiği ham sayfalar (araçların girdisi, oyun yüklemez)
araclar/                   Python / Node araçları (aşağıda)
```
Sistem dosyaları `Object.assign(OyunSahnesi.prototype, {...})` ile sahneye yöntem ekler; hepsi aynı `this` (sahne) üzerinden çalışır.
Oyun `file://` ile değil bir web adresinden açılmalı (GitHub Pages, raw.githack.com, `python3 -m http.server`).

## Kontroller
| Klavye | Dokunmatik | İş |
|---|---|---|
| ← → (A/D) | sol: ◀ ▶ | yürü |
| ↓ (S) basılı | sol: ▼ (aç/kapa, basılı görünür) | eğil; 1 karelik aralıklardan sadece eğilerek geçilir. İleri basarken önünde 1 karelik geçit varsa otomatik eğilir. Zıplayınca kapanır. Sarmaşıkta ▼ basılı = aşağı in |
| SPACE / Z (↑ de) | sağ: ZIPLA | zıpla (basılı tut = yüksek); havada bir kez daha = çift zıplama (takla, ilk zıplamanın %85'i); sarmaşıktan atla |
| ↑ (W) | sağ: ▲ (ZIPLA'nın üstü) | sarmaşığa tırman |
| X / K / J | sağ: VUR | ilk basış her zaman baston vuruşu · basılı kalırsa vuruş bitince öndeki sandık/taşa kanca, geri yürüyerek çek · havada 0.15 sn basılı = pogo (bırakana kadar seker) |
| C / L basılı | — | doğrudan çek |
| F | Tam ekran tuşu | tam ekran + telefonda yatay kilit |
| R / P | — | bölümü yeniden başlat / tüm harita (kamera sabit); haritada fareyle tıklanan yere ışınlanır |
| 1 / 2 | — | 1. / 2. bölümü yükle (bilgisayarda). Adreste `?bolum=2` ile de doğrudan açılır |

Hareketler: baston vuruşu sandık/taşta sadece öndeki tek karoya (ayak hizası) ve en yakındakine değer; **açık sandığa** vurunca vuruş yönünde 2 karo yavaşlayarak kayar. Havada bir sarmaşığa ilk değişte kendiliğinden tutunur; atladığı sarmaşığa (ondan çıkana kadar) ancak ↑ ile tekrar tutunur. Yürürken önündeki sandık/taşı **iter**; havada düşerken duvara doğru basılıysa ve baston kancası yandaki taşa değiyorsa **bastonla asılır** (zıpla / ters yön / ↓ / duvar biterse bırakır; alttan kafa girince asılmaz; v1.10'dan beri duvardan sıçratmaz). Kafa tavana çarpınca geri düşer.

## Sayılar (hepsi `CONFIG`)
- Can 3, yaşam 3; hasar sonrası 1.5 sn dokunulmaz. Yürüme 200, eğik 100, itme 90 px/sn.
- Zıplama tepesi ≈ 140 px (4.4 karo) → en yüksek basamak 4 karo. Pogo ≈ 5.5 karo, pogo + zıpla basılı ≈ 7 karo.
- Yatay menzil (yükseklik farkına göre en uzak iniş): 4 yukarı 110 px · 3 yukarı 137 · 2 yukarı 153 · 1 yukarı 167 · aynı hiza 177 · 1 aşağı 187 · 3 aşağı 203.
- **Rahat zıplama kuralı**: atlayış havada tam hızın %65'iyle yapılabiliyorsa rahat sayılır; pogo hesaba katılmaz. `node araclar/erisim.js` bunu denetler.
- Oyuncu gövdesi 18×42 (eğik 18×26), görünür boy 60 px; animasyona göre görsel ölçek `CONFIG.oyuncu.animOlcek` (gövde değişmez).
- Puan: elmas 10, yakut 50, mavi elmas 100, altın para 5, çapalı altın 25, küçük elmas (tane) 15, kalp fazlası 50, düşman 20, patron 500.

## Görseller
- **Karolar** (`assets/karo/tileset.png`, 128 px kaynak → 32 px): 3 bölge × 9 karo — basılan üst (sol/orta/sağ), alt dolgu (sol/orta/sağ), arka plan (3 çeşit). Önek: `p` tapınak (satır < 48), `c` yosunlu parke taş (48–116), `d` toprak / kökler (117+) — 1. bölüm; `a` açık gri taş, `k` koyu taş, `m` mor kristal (biraz karartılmış) — 2. bölüm. Yeni bölgelerde arka plan karoları dolgunun en fazla %60'ı parlaklıkta (`ARKA_ORAN`). Bölümün `bolgeler: [[satır, önek], …]` alanı hangi satırdan itibaren hangi bölgenin döşeneceğini söyler. Zemin, çarpışma bloklarından otomatik döşenir (`araclar/zeminDose.py`): üstü açık → üst karo, yanı açık → kenarlı karo.
- **Şelale** `[x, w, y0, y1, önde]`: dikeyde kesintisiz doku, aşağı akar (`CONFIG.selaleHiz`); arka planın önünde, zeminin arkasında, uçları zemine girer. `önde=1`: oyuncunun ve zeminin önünde çizilir — ardındaki gizli zemin ve içine giren oyuncu görünmez; taşa taşmaz (tavanın altından çıkar, alttaki zeminin hizasında kesilir). Yan yana şelaleler farklı evrede akar. Sesi kadrajın `CONFIG.selaleDuyma` (420 px) dışından, şelalenin olduğu taraftaki hoparlörden kısık başlar; kadraja girdikçe artar ve iki taraftan gelir (uzaklaşırken tersi).
- **Sarmaşık / zincir**: görsel üstteki ilk taşın altından başlar (8 px içine girer), zeminin arkasında; tırmanma alanı veri `sarmasiklar`. Bölümde `tirmanma: 'zincir'` varsa zincir çizilir (`nesne/zincir.png`). Zeminde dururken ↑ ile tutunulur. Tırmanma animasyonu (v0.87): `oyuncu_tirman.gif`in 1–7. kareleri (0. kare alınmaz); kolun iç kenarı ipin dış kenarına değer (el ipe dıştan, v0.88); tırmanırken boy 1.17 (v0.88: %10 küçük).
- **Zemine oturma**: oyuncu, sandık ve taşlar zemin çizgisinin `zeminGomme` px altına çizilir (bölüm alanı; 1. bölüm 2, 2. bölüm 6) — çim / taş kenarını örter. Üst üste taş / kasa: üstteki, alttakinin üst kenarına `CONFIG.ustUsteGomme` (4 px) gömülür ve önünde çizilir (`gommeGuncelle`). Sandık zemine `CONFIG.sandikGomme` (3) fazla, oyuncu ayakları `CONFIG.oyuncu.ayakEk` (2) fazla gömülür. Kırılır taşlar (kasa hariç) yerde `tasZeminYukari` (2. bölüm 0, yoksa 3 px) yukarıda. Üst üste: üstteki, alttakinin çizim payına + `ustUsteGomme` (4) oturur. Çimsiz zeminde (ör. sahte duvar altı) nesneler gömülmez; zeminDose sahte duvarın altındaki zemini çimli döşer. Gövdeler yerinde kalır, sadece görsel kayar.
- **Gizli yerler**: her birinde en az bir mavi elmas ve yaşam ya da kalp çıkan sandık var.
- **Elmas yerleşimi**: elmas / özel ödül zemine, taşa ya da sandığa değiyorsa açılışta en yakın boş yere (sola / sağa, sonra yukarı) kayar (`bosYer`).
- **Sahte duvar** `sahte: [x, y, w, h]`: taş gibi döşenir ama çarpışması yok; karoları oyuncunun önünde ayrı katmanda, oyuncu içine girince %25'e saydamlaşır (gizli oda).
- **Oyuncu**: `oyuncu.png` (176×141 hücre) + `oyuncu2.png` (240×220: asılma, itme, duruma göre darbe kareleri, ölüm). Kare numaraları `BootSahnesi.oyuncuAnimasyonlari`.
- **Düşmanlar** `assets/dusman/<tip>.png` şerit, animasyon kareleri ve görünür boy `ASSETLER.dusman`; tümü `CONFIG.dusmanOlcek` (0.9).
- **Arayüz**: kalpler, yaşam şapkası, elmas/altın ikonları, rakamlar, 6 dokunmatik tuş (normal / basılı), taş panel. **Harfler**: Türkçe büyük/küçük, Q, noktalama, semboller (`harfYazi`, `{zipla}` gibi işaretler tuş görseli olur).

## Nesneler
- **Toplanabilirler** (dönen): küçük altın taş (elmas, +10), yakut (`kizil`, +50), mavi elmas (`buyuk`, +100), kalp (+1 can), altın para (`altin`, +5), çapalı altın (`capa`, +25, bir tık büyük). Altınlar tahta kasadan çıkar. Toplanabilirler katı değildir (üstüne basılmaz, pogo / kafa çarpması tetiklemez). Sesler: sarı elmas `para1-5` (rastgele), küçük altın `altin`, çapalı `capaAltin`, kristal taştan dökülen elmas `elmas` (her elmas çıkar çıkmaz `elmasDus`), yakut `kizilElmas`, mavi elmas `buyukElmas`, +1 yaşam `yasam`, kalp `can`.
- **Sandık**: üstüne çıkılır, itilir / çekilir, vurunca ya da pogo ile açılır; ödülü (kalp / yasam (şapka görseli) / kizil / buyuk) yukarı süzülür. Açık sandık vurulup kayarken düşmana çarparsa düşman ölür (patron 1 hasar). Düşen sandık düşmanın kafasına inerse düşman ölür (patron 1 hasar).
- **Kırılır taş** (`kirTaslar: [x, y, tür, sabit]`; türler `KIRTAS`): baston ya da pogo vuruşu — 1. ve 2. vuruş çatlatır (hafif sallanır), 3. kırar: havadaysa önce altındaki ilk desteğe düşer, enkaz orada oluşup solar. Uykuda durur (üst üste sağlam); altı boşalınca elle düşer ve ilk desteğe oturur, düşerken altındaki düşmanı ezer; itilen / çekilen taş o sırada fizikle hareket eder. `sabit=1` havada durur (sadece kırılır).
- **Tahta kasa** (`kasa` türü kırılır taş, boş bölgelere 40 adet): 2 vuruşta kırılır (`tahtaVur` → `tahtaKir`), %75 altın para, %25 çapalı altın düşürür. Kırılır taşlara da bastonla asılınır.
- **Taş parçaları** (`kirParca.png`, `araclar/kirParcaKes.py` ← `kaynak/kir_parca.png`): her vuruşta türünün küçük parçaları vuruş yönüne yay çizip uçar (`tasParcala`), kırılınca 7 parça. **Kristal** taş kırılınca 1–5 küçük elmas (`tane.png`, 9 px, +15) saçılır, sekip yerde durur.
- **Pogo sesi**: `sekme1 → 2 → 3` sırayla.
  Bölümde: patron kapısı (2 yosunlu), kapı önündeki çukur (8 tuğla — açılırsa patron düşüp yenilir), üst mavi elmas odası girişi (7 kristal sütun), sol mavi elmas odasının kapağı (12 sabit kristal, pogo ile), sol alt sandık odasının duvarı (3 toprak, geçit — alttaki gizli koridora açılır; koridorda mavi elmas, yakutlu sandık ve gizli yer sesi), eski basamaklar, ara kayalar ve tek başına duran bütün tek karolar (havadakiler sabit) — kırılmayan tek taş kalmadı.
- **Kontrol noktası** (5): bayrak kalkar, ses, yeniden doğma yeri. **Gizli yer** (`gizliler`): yaklaşınca bir kez ses (300 px içindekiler tek alan).
- **Çıkış**: patron ölünce ödül sandığı çıkar, kapı açılır; kapıdan girince bölüm biter.

## Düşmanlar
| Tip | Can | Davranış |
|---|---|---|
| gul, yilan | 1 | devriye (hız 55 / 45) |
| yuvarlak (pembe kirpi) | 1 | devriye (120); oyuncuyu kadrajda aynı zeminde görünce %25 hızlanıp üstüne koşar, geçince yavaşlar |
| maymun / kopek (mızraklı) | 1 / 2 | devriye; oyuncu aynı zemine basınca döner, 0.4 sn hazırlanıp ateş topu / mızrak atar (2.4 / 1.8 sn arayla) |
| ari | 1 | kamera görüş alanına girince kovalar (95 px/sn), 520 px uzaklaşınca bırakır; görünürken arı sesi |
| orumcek | 1 | tavandan ipiyle inip çıkar |
| kedi (2. bölüm) | 2 | devriye (70); oyuncu aynı zeminde 120 px'e gelince bıçakla ileri atılır (52 px menzil), 1 sn dinlenir |
| domuz (2. bölüm) | 3 | devriye (35); oyuncuyu 6 karoda görünce üstüne yürür, gövdeler arası ~14 px kalınca gürzü indirir, 1.5 sn dinlenir |
| kertenkele (2. bölüm) | 1 | maymun gibi: aynı zemindeyse üfleme okunu ağız hizasından, oklu kare görünürken atar (`ok.png`, 260 px/sn) |
| golem (2. bölüm, sadece mor) | 4 | domuz gibi: görünce üstüne yürür, yanına gelince yumruk |
| bitki (2. bölüm, sadece üst) | 1 | yerinde durur (duruşu ileri-geri akıcı), oyuncuya döner; 6 karo içindeyse ağzından alçak yayla zehir tükürür, önündeki 5. karoya düşer (`zehir.png`; `zehirAt` / çarpınca `zehirVur`) |
| fici (2. bölüm) | 2 | devriye; aynı zeminde 6 karo içinde görünce 0.5 sn kurulur, top olup yavaşça hızlanarak dönerek atılır (en çok 290 px/sn, en çok 12 karo ya da zemin ucuna kadar); sonra 2 sn yürür, oyuncu yine yakınsa tekrar döner. Dönerken vurulmaz, pogo işlemez |
| buyucu (2. bölüm) | 1 | maymun gibi; asalı kareler yavaşça (1.25 sn) oynar, sonunda 2 can götüren büyü atar (`buyu.png`) |
| yarasa (2. bölüm) | 2 | uçar; görünce oyuncunun 150 px yanına, biraz üstüne gelir; aynı hizadaysa durup ses dalgası atar (`dalga.png`, 230 px/sn, 2.2 sn arayla); 560 px uzaklaşınca evine döner |
| boss | 4 | 520 px'te uyanır; yürü → hazırlan → atıl → dinlen; yarı canın altında hızlanır, zıplayarak atılır; rastgele patron sesleri |
- Yeni düşmanlar ile maymun, yılan, gülün ayakları zemin çizgisinin 5 px altına çizilir (`DUSMAN_GOMME`). Düşman taşın / sandığın / zeminin içinde doğmaz: gövdesi dolu kareye değiyorsa aynı zeminde en yakın boş yere kayar (`dusmanBosX`); devriye alanı başlangıçtaki taş / sandıkta biter. Düz atılan mermiler 8 karo gidip kaybolur (`CONFIG.mermiMenzil`), düşmanlar en çok 9 karodan ateş eder (`CONFIG.atisMenzil`). Ölüm karesi olmayanlar (2. bölüm) devrilip söner. Yarasalar koridor ve iniş mağaralarının havasına dağıtılır. 2. bölüm düşmanları `bolum2Uret.py` ile zemin parçalarına dağıtılır (A katında çoğu kedi, K'de domuz, M'de kertenkele; başlangıç, kontrol noktası, zincir dibi, gizli oda ve iniş mağaraları boş).
- Yürüyenler bastıkları zemin parçasının (duvar / uçurum / dikene kadar) iki ucu arasında gider, asla düşmez; duvara çarpınca döner (0.35 sn tekrar dönmez → titreme yok).
- Çok canlılara ilk vuruş: beyaz parlama, geri savrulma, kısa sersemlik. Uzaktakiler (900 px) uyur. Mermiler 2.6 sn sonra kaybolur, baston mermiyi bozar; mermiler sandık ve tahta kasalardan geçer, kırılır taşlarda durur.

## Sesler
`SES_KLASOR` listesindeki `assets/ses/<klasör>/<ad>.mp3` yüklenir (klasörler: popeye, elmaslar, cevre, dusmanlar, patron, arayuz); kodda ses sadece adıyla çalınır. Kodda çalınıp listede olmayan ses sessizce atlanır — **eksik**: `kapiAcil` (çıkış kapısı açılınca) ve `kazanma` (kapıdan girince); dosyaları gelince `assets/ses/`'e koyup `SES_KLASOR`'a eklemek yeterli.

## 1. Bölüm
Unity projesindeki `SampleScene`'den aktarıldı (1 Unity birimi = 48 px). Dünya 5440 × 4544 px (170 × 142 karo), çok katlı: başlangıç sol altta, ortada sarmaşıklı bloklar ve arılar, üstte koridorlar, en üstte patron ve çıkış, altta yeraltı.
`level1.js` alanları: `bloklar` (çarpışma), `kayalar` (ara kaya), `dikenler`, `sarmasiklar`, `sandiklar`, `elmaslar`, `ozeller`, `kirTaslar`, `kontrol`, `ipuclari`, `dusmanlar`, `gizliler`, `selaleler`, `on` / `arka` (zeminDose.py üretir).

## 2. Bölüm — Mor Derinlikler
Dünya 7680 × 6336 px (240 × 198 karo); oynanır alan 1. bölümün 2 katı. 62 düşman (kedi, domuz, kertenkele, yarasa, golem, bitki, fıçı, büyücü), patron yok — çıkış kapısı baştan açık. Tırmanma zincirle.
Üç kat: üst **açık gri taş** (kırılır taşı `gri`), orta **koyu taş** (`koyu`), alt **mor kristal** (`mor`, ayrıca `kristal` taşlardan küçük elmas). Her katta üç koridor (üst / ana / alt), zincir, delik ve iniş mağaralarıyla bağlı. Tahta kasalar her katta.
Ana yol: üst kat ana koridor (sağa) → sağdaki büyük iniş mağarası → orta kat (sola) → soldaki iniş mağarası → alt kat (sağa) → kapı. Kontrol noktası 7.
Gizemler: üst kat en solda şelale — içine atlayan görünmez zemine basar, sola yürüyünce sahte duvarlı oda; sahte duvarlı odalar (orta kat üst koridor solu, alt kat üst koridor sağı); bastonla duvardan duvara asılarak çıkılan 3 baca; pogo ile çıkılan yüksek çıkıntılar; itilir taşla çıkılan raflar; kırılır taş kapılar.
Üretim: `python3 araclar/bolum2Uret.py && python3 araclar/zeminDose.py level2 && node araclar/erisim.js level2`. Erişim denetiminde ulaşılamayan olarak kalanlar bilinçli beceri ödülleri (baca, pogo, taş itme).

## Araçlar (`araclar/`)
Hepsi depo kökünden çalışır. Tümünü sırayla yeniden üretmek için: `bash araclar/hepsiniUret.sh`.
| Araç | Ne yapar |
|---|---|
| `bolgeKaro.py` | `kaynak/bolge_*.png` (6 bölge) → `karo/tileset.png` + `ASSETLER.tile` |
| `zeminDose.py [level2]` | bölüm dosyası → `on` / `arka` karo ızgaraları (bloklar değişince çalıştır; sahte duvarlar taş döşenir) |
| `bolum2Uret.py` | 2. bölümü (`level2.js`) baştan yazar; sonra zeminDose.py level2 |
| `erisim.js [level2]` | önemli yerlere rahat zıplamayla ulaşılıyor mu (zemin içinden zıplama, zeminden zincire tutunma dahil; `--coz`: çözüm için kaya önerir) |
| `oyuncuEk.py` | `kaynak/oyuncu_ek.png` vb. → `oyuncu/oyuncu2.png` |
| `oyuncuYeni.py` | `kaynak/oyuncu_taban.png` + `oyuncu_dur.gif`, `oyuncu_tirman.gif`, `oyuncu_ayakVur.gif`, `oyuncu_pogo.png`, `oyuncu_egil.png` → `oyuncu/oyuncu.png`: yeni duruş, tırmanma (arkadan), ayak vurma, koşma, pogo, eğik yürüme; her biri eski karelerin boyuna ölçeklenir. v0.78: 2 kat çözünürlük (hücre 352×282, ayak y=250), sadece kullanılan 64 kare 8 sütunda, kare listesi `ASSETLER.oyuncu.anim` |
| `dusmanKes.py` | `kaynak/dusman_seti*.png` → `dusman/*.png` + `ASSETLER.dusman` (seti3: kedi, domuz, kertenkele + ayrı kesilen üfleme oku; seti4: yarasa + ayrı kesilen ses dalgası; seti5: golem, bitki + zehir; seti6: fıçı (2 satır tek şeritte), büyücü + büyü) |
| `toplananKes.py` | `kaynak/toplanan_seti.png` → `nesne/toplanan.png` + `ASSETLER.toplanan` |
| `kirTasKes.py` | `kaynak/kirilir_taslar.png` → `nesne/kirTas.png` |
| `uiKes.py` | `kaynak/ui_seti.png`, `ui_ek.png` → `ui/*.png` + `ASSETLER.ui` |
| `harfKes.py` | `kaynak/harf_seti.png`, `ui_ek.png` + rakamlar → `harf/*.png` + `ASSETLER.harf` (uiKes'ten sonra) |
| `kirParcaKes.py` | `kaynak/kir_parca.png` → `nesne/kirParca.png` + `nesne/tane.png` + `ASSETLER.kirParca` |
| `harfAtlas.py` | `harf/*.png` → tek atlas `harf/harf.png` + `harf.json` (ayrı dosyaları siler; harfKes'ten sonra) |

## Sesler sırayla
Birden çok çeşidi olan sesler (para1–5, zipla1–3, adim1–3, boss1–13 …) rastgele değil sırayla çalar, sondan sonra başa döner (`sesSira`).

## Yayından önce silinecekler (geliştirme özellikleri)
- O tuşu: +10 000 puan (dükkan denemesi, v1.10)
- P: tüm harita + fareyle tıklanan yere ışınlanma (`haritaDegistir`, `girdiKur` içindeki `pointerdown`)
- 1 / 2 tuşları ile bölüm yükleme, adreste `?bolum=N` (`main.js`, `girdiKur`)
- Sol alttaki sürüm / bölüm yazısı

## Oyuncu
Görünür boy `CONFIG.oyuncu.boy` 66.21. Oyuncu sayfaları v0.78'den beri 2 kat çözünürlükte (oyun hep küçültür, büyütmez → net); `oyuncu2.png` 6 sütun, hücre 480×440. Eski kaynağı olmayan kareler (zıplama, düşme, iniş, sersem, vuruş, kanca uzatma, çekme) sadece 2 kat büyütüldü, yeni görsel gelince değiştirilecek. (v0.76'da %10 büyütüldü; çarpışma gövdesi aynı). Zıplama / düşme / iniş `oyuncu_zipla.gif`, çift zıplama taklası `oyuncu_takla.gif` (v0.79). Baston vuruşu `oyuncu_vur.gif` (bekleme ve dönüş kareleri hariç 6 kare, v0.83). Kanca uzatma (ilk 2 kare, bir kez) + çekme (3.–8. kareler, çektikçe döngü) `oyuncu_cek.gif` (v0.90). Eğik: durunca `egilDur` (GIF 1. kare), yürürken 2.–8. kareler döngü `oyuncu_egil.gif` (v0.82). Ayakta 5 sn'den uzun beklerse sabırsızca ayak vurur (`ayakVur`).

- **Ayak payı (v0.92)**: oyuncu ayağı `zeminGomme + ayakEk` kadar aşağı çizilir. Bölüm kendi `ayakEk`'ini verebilir (2. bölüm: zeminGomme 6, ayakEk −2 → 1. bölümle aynı 4 px). Bölümler birbirini etkilemez.
- **Bastonla asılma (v0.93)**: kareler `kaynak/oyuncu_asili.gif`ten (6 kare, döngü); baston boyu ve yeri eskisiyle aynı (`araclar/oyuncuEk.py`).
- **İtme (v0.94)**: `kaynak/oyuncu_it.gif` (8 kare). 1–7. kareler iterken yürürken döngü (`it`), 8. kare sadece iterken durunca (`itDur`: eller önde, ayaklar sabit); geri gidince / zıplayınca itme biter. oyuncu2.png 5 satır.
- **Bastonla zıplama (v0.95)**: açılınca / havadayken `pogoHava` karesi `kaynak/oyuncu_pogoHava.png` (karakter boyu şapka genişliğine göre eskisiyle aynı, baston ucu ayak çizgisinde). Sekme kareleri eski.
- **Tek / yığın itme (v0.96)**: önde tek nesne varsa `itAlt` (`kaynak/oyuncu_itAlt.gif`, eller aşağıda; 1–7 döngü, 8. kare dururken `itAltDur`); üst üste 2+ nesne varsa eski `it` / `itDur` (eller yukarıda) ve üstteki(ler) alttakiyle birlikte itilir (`yiginBul`). oyuncu2.png 6 satır.
- **Yarasa ölümü (v0.98)**: `kaynak/yarasa_ol.gif` → `dusman/yarasaOl.png` (`araclar/yarasaOlKes.py`). 1–4. kareler havada, 4. karede yere düşer, yere 30 px kala 5. kare, yere değince 6–9, 1 sn sonra solarak kaybolur (`yarasaOlum`).
- **Ek düşman şeritleri (v1.00, `araclar/ekKareKes.py`)**: ayrı GIF'lerden `dusman/<ad>.png`, ana şerit ölçeğinde; geçişte origin/gövde ofseti ayarlanır. `bitkiBekle` (çiçek saldırmazken duruş; saldırı eski), ölümler olduğu yerde: `bitkiOl` (biter → yok olur), `kertenkeleOl` (bukalemun), `kediOl` (bıçaklı leopar), `domuzOl` (yaban domuzu), `kopekOl` (mızraklı, v1.01), `maymunOl` (maymun, son 2 kare hariç, v1.02), `domuzSaldir` (yaban domuzu vuruşu, eskisi yerine; 0.8 sn, vuruş 0.5. sn, v1.03), `ficiOl` (dikenli fıçı, v1.04), `bossOl` (1. bölüm patronu, v1.05; solunca çıkış açılır), `buyucuOl` (büyücü, v1.06), `golemOl` (mor kaya, v1.07). v1.07: tüm ölümler hızlandı (10–15 fps, yarasa 12); leoparın yerdeki kareleri yere indirildi (`YER`) — son karede 1 sn kalıp solar.
- **Dükkan (v1.08)**: 2. bölümde başlangıcın solundaki 3 elmastan en soldakinin yerinde açık kapı (`js/veri/level2Ek.js` → `LEVEL2.dukkan.kapi`). Kapının önünde yerdeyken ↑ (W / ▲) → dükkana ışınlanır (↑ bu basışta zıplatmaz). Oda haritanın sağında, dünya dışında: 13×6 kare (64 px), tavan/duvar/zemin `kaynak/dukkan_karolar.png` parçaları, arka duvar koyu dolgu; kamera sabit, odanın tamamı. Solda satıcı (v1.09: boy 90, 5 GIF `kaynak/satici_*.gif` tek ızgarada; market her karede aynı en/boy, taban ortası ve alt kenarı sabit. `bekle` ana döngü, 8–9 sn'de bir `nadir1`/`nadir2`'den biri bir kez; `basparmak` eşya alınca, `para` para yetmeyince → `saticiTepki(ad)`), oyuncu sağında belirir, sağdaki kapıda ↑ → bölümdeki kapıya döner. Görseller: `araclar/dukkanUret.py`; kod: `js/sistemler/dukkan.js`. Satış şimdilik yok.
- **Dükkan v1.10**: dükkana girince sağdaki kapının önünde başlanır. Arka duvar koyu ve yukarı sürer; yan duvarlar ve zemin ekran oranı ne olursa olsun dışa doğru sürer (tavan görseli yok, çarpışması var). Satıcının yanına gelince **satış paneli** açılır: üstte bilgi kutusu (ad, açıklama, fiyat, AL / Alındı / Önce: …, para yetmezse satıcı `para`, alınca `basparmak`), altta simgeler (`kaynak/dukkan_ikonlar.png` → `dukkan/ikon.png`, `araclar/dukkanIkon.py`; baston vuruşu ve kancalı kol simgeleri kullanılmaz).
- **Yetenekler / kayıt (v1.10, `js/cekirdek/kayit.js`)**: yürüme, zıplama, baston vuruşu ve tırmanma temel. Satın alınan her şey ve **puan** tarayıcıda kalıcı (localStorage `popeyeTalesKayit`; puan bölümler arası taşınır, dükkanda harcanır). Baştan açık: İtme (tek), Çekme (tek), Kasa Kırma. Satın alınır: Çift İtme (önce İtme), Çift Çekme (önce Çekme; üst üste olanlar birlikte çekilir), Taş Kırma (önce Kasa Kırma; yoksa taş sadece sallanır), Çift Zıplama, Bastonla Asılma, Duvar Zıplama, Bastonla Zıplama (pogo). Kalp 1–5 (+1 en fazla kalp, `canMaxi()`), Can 1–5 (+1 yaşam, her bölüm başında da); soldan sırayla açılır.
- **Fiyatlar (`DUKKAN_FIYAT`)**: 1. bölüm en yüksek puan ≈ 5665 (elmas 930, özel 750, sandık 900, kasa 1000, kristal 825, düşman 760, patron 500). Yetenek 2500; kalp/can seviyeleri 750, 1500, 2500, 4000, 6000 → 1. bölüm puanıyla 1 kalp + 1 can + 1 yetenek (4000) alınır; yetenek = 3. seviye.
- **Duvar Zıplama (v1.10)**: havada duvara değerken zıpla basılı + duvara doğru yön → duvardan ters yöne, basılı tutma süresinden bağımsız tam zıplama (`duvarZiplaX` 230). Zıplama basılı kaldıkça karşı duvara değince kendiliğinden yine sıçrar (iki duvar arası sağa sola); bırakınca / yere inince biter.
