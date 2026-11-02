# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.03 (`config.js` → `surum`)
Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Görseller: zemin ve platformlar `assets/` içindeki yeni görseller; karakter, düşman, toplanabilir, diken, sarmaşık, kırılabilir blok ve arayüz hâlâ yer tutucu (renkli şekiller, `boot.js`).
Not: görseller dosyadan yüklendiği için oyun `file://` ile değil bir web adresinden (GitHub Pages, githack, yerel sunucu) açılmalı.

## Kontroller
- ← → (A/D): yürü
- ↑ (W) / SPACE / Z: zıpla (basılı tut = yüksek, bırak = kısa). Sarmaşığa değerken ↑ tırmanır; sarmaşıktan atlamak için SPACE/Z.
- ↓ (S) basılı tut: **POGO** — baston her zaman çıkar. Havada düşmanlara ve dikenlere zıplar, blokları kırar; yerde de zeminden seker (basılı tuttukça sürekli zıplar). Pogo sırasında ↑/SPACE basılıysa daha yüksek seker.
- X / K: baston salla (kısa menzil; düşmana vurur, blokları kırar)
- ↑ / ↓: sarmaşıkta tırman (zıpla ile bırak)
- R: bölümü yeniden başlat
- Mobil: ekranda ◀ ▶ ▲ ▼POGO VUR ZIPLA tuşları

## Sayılar
- Can: 3 kalp, Yaşam: 3. Hasar sonrası 1.5 sn dokunulmazlık.
- Yürüme 200 px/sn, zıplama ≈ 3 tile, pogo sekmesi ≈ 4 tile, pogo+zıpla basılı ≈ 5 tile, zıplatan yaprak ≈ 8 tile.
- Puan: elmas 100, sandık 1000, düşman 200, patron 5000.

## Platform türleri (görsel: `assets/`, boyutlar: `assetlar.js`)
- Zemin: kahve toprak, çimenli. Sol köşe, orta, sağ köşe + dolgu (sol kenar, orta, sağ kenar). Çarpışma görünmez bir gövde; görseller toprağın gerçek kenarlarına göre ~1 px bindirilerek döşenir ve arkada toprak renginde bir dolgu vardır (parçalar arası boşluk kalmaz).
- Tek yönlü (alttan geçilir): kütük (`kutuk`), taş levha (`tas`), ip köprü (`kopru`), yüzen ada (`ada`), ağaç dalı (`dal`), mantar (`mantar`, sadece tepesine basılır).
- Yatay hareketli: taş levha, 70 px/sn, iki sütun arasında gidip gelir.
- Asansör (`asansor`): dikey çıkıp iner, uçlarda 1 sn bekler, 60 px/sn.
- Çatlak taş (`catlak`): basınca 0.95 sn sallanır, düşer, 3 sn sonra geri gelir.
- Konveyör bant (`bant`): üstündeki oyuncuyu 70 px/sn iter (yön level verisinde).
- Zıplatan yaprak (`yaprak`): inince −850 hızıyla fırlatır.

## Düşmanlar
- Pembe küp (walker): devriye yürür, 1 can
- Turuncu yuvarlak (jumper): yürür + zıplar, 1 can
- Mor yuvarlak (flyer): havada sinüs hareketi, 1 can
- Kırmızı büyük küp (patron): 6 can, yürü → sarı uyarı → atılma → dinlen; 3 canın altında hızlanır. Hasar sonrası 1.1 sn dokunulmaz.

## 1. Bölüm — Orman Girişi (200 sütun × 32px)
1. 0–29: giriş, öğretici ipuçları, ilk yürüyen düşman, kütük platform
2. 30–59: ilk çukur, diken (pogo öğretisi), kütükler, taş levha
3. 60–84: kırılabilir duvar (baston öğretisi), asansör veya sarmaşıkla yüzen adaya çıkış + sandık
4. 85–97: geniş çukur: yatay hareketli taş platform (alt yol) veya çatlak taşlar (üst yol), uçan düşmanlar
5. 98–123: uzun diken yatağı, üstünde konveyör bant (sola iter) + kalp ödülü, çukur
6. 124–153: tırmanış (kütük, kütük, mantar, ip köprü) veya diken yatağı (alt yol, sandık ödülü); yaprak ile köprüye fırlama kısayolu (kalp sandığı)
7. 154–199: kontrol noktası, patron arenası (sütun 167'de kilitlenir; dal ve mantar platform), çıkış bayrağı sütun 197

Kontrol noktaları: sütun 55, 100, 126, 156. Çukura düşmek = bir yaşam kaybı, son kontrol noktasında canlanma.

## Dosyalar
- `config.js` ayarlar ve sürüm · `level1.js` bölüm verisi · `assetlar.js` görsel boyutları (otomatik üretildi) · `assets/` görseller
- `boot.js` görsel yükleme + yer tutucu görseller · `game.js` sahne ve bölüm kurulumu · `oyuncu.js` oyuncu mekanikleri · `dusman.js` düşman/patron/toplanabilirler · `ui.js` HUD ve ekranlar
