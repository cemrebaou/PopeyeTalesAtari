# Popeye Tales (Atari) — OYUN.md

Sürüm: v0.04 (`config.js` → `surum`)
Motor: Phaser 3.80.1 (CDN), Arcade Physics.
Görseller: zemin ve platformlar `assets/` içindeki görseller; karakter, düşman, toplanabilir, diken, sarmaşık, takoz, bomba ve arayüz hâlâ yer tutucu (renkli şekiller, `boot.js`).
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
Kaynak: Unity projesindeki `SampleScene` (zemin, düşman, sandık, elmas, diken, sarmaşık, bomba, takoz konumları). 1 Unity birimi = 48 px. Dünya 5435 × 4531 px, çok katlı:
- Alt kat (başlangıç, sol altta): uzun koridor, dikenli çukurlar, maymunlar, yeraltına inen merdiven
- Orta bölge: sarmaşıklarla çıkılan bloklar ve arılar
- Üst katlar: koridorlar, örümcekler, mızraklı köpekler
- En üst: patron (kırmızı takozlarla kapalı alanlar), patron ölünce sandık ve çıkış (helikopter yeri)

`level1.js` otomatik üretilmiştir (zemin: 8 px ızgaradan birleştirilmiş bloklar). Kontrol noktaları: 5 adet. Çıkış patron öldükten sonra açılır.

Kullanılmayan ama kodda duran: tek yönlü platformlar (kütük, taş, köprü, ada, dal, mantar), hareketli platform, asansör, çatlak taş, konveyör bant, zıplatan yaprak, kırılabilir blok (`level1.js` içinde `platformlar`, `hareketli`, `asansorlar` vb. alanları eklenirse çalışır).

## Dosyalar
- `config.js` ayarlar ve sürüm · `level1.js` bölüm verisi (piksel) · `assetlar.js` görsel boyutları (otomatik üretildi) · `assets/` görseller
- `boot.js` görsel yükleme + yer tutucu görseller · `game.js` sahne ve bölüm kurulumu · `oyuncu.js` oyuncu mekanikleri · `dusman.js` düşmanlar, patron, bomba, toplanabilirler · `ui.js` HUD ve ekranlar
