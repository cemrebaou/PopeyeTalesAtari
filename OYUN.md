# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.09 (`config.js` → `surum`)
Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Görseller (v0.05, yeni set): zemin ve arka plan tek bir karo setinde (`assets/tileset.png`, 64 px kaynak, oyunda 32 px); objeler `assets/*.png` (platform parçaları, sarmaşık/ip/merdiven/zincir, kasa, taş blok, kırmızı takoz, dikenler, sandık, kapı, bayrak). Karakter, düşman, elmas, bomba ve arayüz hâlâ yer tutucu (renkli şekiller, `boot.js`).

## Görsel sistemi
- Zemin: 32 px ızgara, otomatik döşeme (üst sol/orta/sağ, sol/sağ duvar, iç dolgu, alt kenarlar, tek genişlikte sütun, tek blok). Üst katlar (Unity y > 16) yosunlu taş karolar. Alt katlardaki tüm toprak zeminler (v0.06) tek bir kesintisiz toprak dokusu (`assets/toprak.jpg`, 512 px, oyunda bir tekrar = `CONFIG.toprakDoku` 320 px) ile çizilir; doku dünya koordinatına hizalı olduğu için bloklar arasında dikiş olmaz. Çimen (v0.07): `assets/cimen.png` toprağın tüm açık üst kenarlarına şapka gibi döşenir; toprağın üst çizgisi çimen görselinin yarısına denk gelir (`level1.js` → `cimen`, çimen görselinin tek bir tekrarı (500 px) tam bir toprak karesi genişliğinde (`CONFIG.cimenGenislik` = 32 px), yükseklik orantılı ≈ 20 px).
- Arka plan: çarpışmasız, kare kare döşenen duvarlar; yükseğe göre 4 bant: köklü toprak (yeraltı) → kaya → taş duvar → harabe. Taş/harabe bandında rastgele pencere, delik, meşale yeri, sarmaşık ve sütun süsleri. Uzun boş dikey alanlarda 4 şelale (karo karo).
- Kontrol noktası: bayrak direği (geçince bayrak kalkar). Çıkış: taş kemerli kapı (patron ölünce açılır). Sandık kapalı/açık görselli.
- Platform türleri kodda hazır, bu bölümde kullanılmıyor: kütük, taş levha, ip köprü, yüzen ada, dal, ızgara (parçalı: sol + orta + sağ), uçan hareketli platform ve asansör (altı kristalli, ipsiz), konveyör bant, çatlak taş (3 aşama), zıplatan yaprak, mantar, kırılabilir kasa.
Not: görseller dosyadan yüklendiği için oyun `file://` ile değil bir web adresinden (GitHub Pages, githack, yerel sunucu) açılmalı.

## Kontroller
- ← → (A/D): yürü
- ↑ (W) / SPACE / Z: zıpla (basılı tut = yüksek). Sarmaşığa değerken ↑ tırmanır; sarmaşıktan atlamak için SPACE/Z.
- ↓ (S) basılı tut: **POGO** — baston çıkar; düşmanlara ve dikenlere zıplar, yerde de seker.
- X / K: baston salla (kısa menzil; düşmana vurur, mermileri bozar)
- C / L: **bomba at** (önce bomba topla; HUD'da "Bomba: n")
- R: bölümü yeniden başlat
- Mobil: ◀ ▶ ▲ ▼POGO VUR BOMBA ZIPLA tuşları

## Sayılar
- Can: 3 kalp, Yaşam: 3. Hasar sonrası 1.5 sn dokunulmazlık.
- Yürüme 200 px/sn, zıplama ≈ 3 tile, pogo ≈ 4 tile, pogo+zıpla basılı ≈ 5 tile.
- Puan: elmas 100, büyük elmas / sandık 1000, kızıl elmas 500, düşman 200, patron 5000.
- Bomba: fitil 1.3 sn, patlama yarıçapı 96 px, atma bekleme 0.4 sn.

## Bomba / takoz
- Bomba eşyası (siyah top) toplanınca +1 bomba. C ile atılır, yay çizer, zeminde seker, fitil bitince veya düşmana değince patlar.
- Patlama: düşmanlara 2 hasar (patrona 2 can), kırmızı takozları ve kırılabilir blokları yok eder, mermileri siler. Oyuncuya zarar vermez.
- Kırmızı takoz: sadece bombayla kırılır (baston/pogo kırmaz, üstünden pogo sekilebilir).

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
Kaynak: Unity projesindeki `SampleScene` (zemin, düşman, sandık, elmas, diken, sarmaşık, bomba, takoz konumları). 1 Unity birimi = 48 px. Dünya 5440 × 4544 px (170 × 142 karo), çok katlı:
- Alt kat (başlangıç, sol altta): uzun koridor, dikenli çukurlar, maymunlar, yeraltına inen merdiven
- Orta bölge: sarmaşıklarla çıkılan bloklar ve arılar
- Üst katlar: koridorlar, örümcekler, mızraklı köpekler
- En üst: patron (kırmızı takozlarla kapalı alanlar), patron ölünce sandık ve çıkış (helikopter yeri)

`level1.js` otomatik üretilmiştir: `on` (taş zemin karoları), `toprak` (toprak dokulu bölgeler) ve `arka` (arka plan karoları) satırları + çarpışma blokları. Kontrol noktaları: 5 adet. Çıkış patron öldükten sonra açılır.

Platform eklemek için `level1.js`'e alan eklenir: `platformlar: [{tip:'kutuk', x, y, n}]`, `hareketli: [{tip:'hover', y, min, max, n, hiz}]`, `asansorlar: [{x, alt, ust, hiz}]`, `bantlar: [{x, y, n, yon}]`, `catlaklar: [{x, y}]`, `yapraklar: [{x, y}]`, `kirilir: [[x, y, w, h]]` (piksel; n = orta parça sayısı).

## Dosyalar
- `config.js` ayarlar ve sürüm · `level1.js` bölüm verisi (piksel) · `assetlar.js` karo numaraları ve obje boyutları (otomatik üretildi) · `assets/` görseller
- `boot.js` görsel yükleme + yer tutucu görseller · `game.js` sahne ve bölüm kurulumu · `oyuncu.js` oyuncu mekanikleri · `dusman.js` düşmanlar, patron, bomba, toplanabilirler · `ui.js` HUD ve ekranlar
