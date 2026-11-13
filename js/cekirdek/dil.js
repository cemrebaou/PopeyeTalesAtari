// v1.80: Dil — oyun metinleri kodda Türkçe yazılır; harfYazi (yardimci.js) çizmeden önce cevir() ile seçili dile çevirir.
// Diller: İngilizce (varsayılan) ve Türkçe (Dig Popeye Dug ile aynı). Seçim KAYIT.dil'de kalıcı; ayarlardaki bayrak tuşu değiştirir.
// DIL_EN: birebir eşleşen metinler · DIL_KALIP: içinde sayı / değişken olan metinler (düzenli ifade → karşılık)
const DILLER = ['en', 'tr'];
const DIL_EN = {
  'Ayarlar': 'Settings', 'Efekt': 'Sound', 'Müzik': 'Music', 'Ambiyans': 'Ambience', 'Düşük': 'Low', 'Orta': 'Medium', 'Yüksek': 'High',
  'Bölümler': 'Levels', 'Dil': 'Language', 'Evet': 'Yes', 'Hayır': 'No',
  'Çözünürlük oyun yeniden açılınca değişir': 'Resolution changes after restarting the game',
  'Henüz yetenek yok': 'No skills yet', 'SÜRE': 'TIME', 'PATRON!': 'BOSS!', 'Süre doldu!': "Time's up!",
  'Kilitli. Anahtar gerek.': 'Locked. You need a key.', 'Kilitli.': 'Locked.', 'Anahtar! Alttaki kapı açıldı.': 'Key! The door below is open.',
  'Kontrol noktası!': 'Checkpoint!', 'Kapı açıldı!': 'Door opened!',
  'Bölüm Tamamlandı': 'Level Complete', 'Sonraki bölüm için dokun': 'Tap for the next level', 'Tekrar oynamak için dokun': 'Tap to play again',
  'Sonraki Bölüm': 'Next Level', '2x Yeniden Oyna': 'Play Again 2x', '2x bitti! Bir tur daha!': '2x cleared! One more round!',
  'Oyun bitti! 2x: düşmanlar 2 kat can, 2 kat vuruş': 'You won! 2x: enemies have double health and hit twice as hard',
  'OYUN BİTTİ': 'GAME OVER', 'Reklam İzle: Devam Et': 'Watch Ad: Continue', 'Baştan Başla': 'Restart Level', 'Reklam hazır değil': 'Ad is not ready',
  'Satın almak için bir simgeye dokun.': 'Tap an icon to buy.', 'Alındı': 'Owned', 'AL': 'BUY', 'Puan yetmiyor': 'Not enough coins',
  'En fazla kalp sayısı 1 artar.': 'Maximum hearts +1.',
  'İtme': 'Push', 'Çift İtme': 'Double Push', 'Çekme': 'Pull', 'Çift Çekme': 'Double Pull', 'Çift Zıplama': 'Double Jump',
  'Kasa Kırma': 'Crate Break', 'Taş Kırma': 'Stone Break', 'Bastonla Asılma': 'Cane Hang', 'Duvar Zıplama': 'Wall Jump', 'Bastonla Zıplama': 'Cane Bounce',
  'Önündeki tek sandığı ya da taşı iter.': 'Pushes a single chest or stone in front of you.',
  'Üst üste duran nesneleri birlikte iter.': 'Pushes stacked objects together.',
  'Bastonun kancasıyla tek nesneyi geri çeker.': 'Pulls a single object back with the cane hook.',
  'Üst üste duran nesneleri birlikte çeker.': 'Pulls stacked objects together.',
  'Havada bir kez daha zıplar, takla atar.': 'Jump once more in the air with a flip.',
  'Tahta kasaları bastonla kırar.': 'Breaks wooden crates with the cane.',
  'Taş blokları bastonla kırar.': 'Breaks stone blocks with the cane.',
  'Düşerken bastonu taşın kenarına takıp asılır.': 'Hooks the cane on a ledge while falling and hangs.',
  'Havada duvara doğru basıp zıpla: duvardan ters yöne en yükseğe sıçrar.\nZıplamayı basılı tutarsan iki duvar arasında kendiliğinden sağa sola sıçrar.':
    'In the air, press toward a wall and jump: leaps high off the wall.\nHold jump to keep bouncing between two walls.',
  'Havada VUR basılı: bastonun üstünde seker, dikenlere basabilir.': 'Hold HIT in the air: bounce on the cane, even on spikes.',
  '{sol} {sag} Yürü\n{zipla} Zıpla (basılı tut = daha yüksek)': '{sol} {sag} Walk\n{zipla} Jump (hold = higher)',
  '{saldir} Baston salla: düşmana vur': '{saldir} Swing the cane: hit enemies'
};
const DIL_KALIP = [
  [/^(\d+)\. BÖLÜM TAMAMLANDI!$/, 'LEVEL $1 COMPLETE!'],
  [/^Puan: (\d+)$/, 'Score: $1'],
  [/^Kalp (\d+)\. seviye$/, 'Heart level $1'], [/^Vuruş Gücü (\d+)\. seviye$/, 'Hit Power level $1'],
  [/^Önce: Kalp (\d+)\. seviye$/, 'First: Heart level $1'], [/^Önce: Vuruş Gücü (\d+)\. seviye$/, 'First: Hit Power level $1'],
  [/^Önce: (.+)$/, (m, a) => 'First: ' + cevir(a)],
  [/^Bastonun vuruş gücü (\d)'[a-z]+ yükselir\.$/, 'Cane hit power rises to $1.'],
  [/^(\d+)\. bölüme geçilsin mi\?$/, 'Go to level $1?']
];
function dilAl() { return DILLER.includes(KAYIT.dil) ? KAYIT.dil : 'en'; }
function cevir(metin) {
  if (dilAl() === 'tr') return metin;
  if (DIL_EN[metin] !== undefined) return DIL_EN[metin];
  for (const [re, k] of DIL_KALIP) if (re.test(metin)) return metin.replace(re, k);
  return metin;
}
