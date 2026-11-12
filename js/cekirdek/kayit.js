// v1.10: kalıcı kayıt (tarayıcıda localStorage): puan (dükkan parası), satın alınan yetenekler, kalp / vuruş gücü seviyeleri.
// Bölümler ve yeniden başlatmalar arasında korunur.
const DUKKAN_FIYAT = {
  // 1. bölüm en yüksek puan ≈ 5665 (elmas 930, özel 750, sandık 900, kasa 1000, kristal 825, düşman 760, patron 500).
  // 1. bölümden gelen puanla 1. kalp + 1. can + 1 yetenek alınabilir (750 + 750 + 2500 = 4000); yetenek = 3. seviye.
  yetenek: 2500,
  seviye: [750, 1500, 2500, 4000, 6000],          // kalp
  guc: [1500, 3000, 5000, 8000, 12000]            // v1.13: vuruş gücü (kaslı kol)
};
// acik: baştan sahip olunur · once: önce bu alınmalı
// v1.42: hiçbir yetenek baştan açık değil — yalnız yürüme, zıplama, eğilme ve bastonla vurma; gerisi dükkandan alınır
const YETENEKLER = {
  itTek:      { ad: 'İtme', aciklama: 'Önündeki tek sandığı ya da taşı iter.' },
  itCift:     { ad: 'Çift İtme', once: 'itTek', aciklama: 'Üst üste duran nesneleri birlikte iter.' },
  cekTek:     { ad: 'Çekme', aciklama: 'Bastonun kancasıyla tek nesneyi geri çeker.' },
  cekCift:    { ad: 'Çift Çekme', once: 'cekTek', aciklama: 'Üst üste duran nesneleri birlikte çeker.' },
  ciftZipla:  { ad: 'Çift Zıplama', aciklama: 'Havada bir kez daha zıplar, takla atar.' },
  kasaKir:    { ad: 'Kasa Kırma', aciklama: 'Tahta kasaları bastonla kırar.' },
  tasKir:     { ad: 'Taş Kırma', once: 'kasaKir', aciklama: 'Taş blokları bastonla kırar.' },
  asilma:     { ad: 'Bastonla Asılma', aciklama: 'Düşerken bastonu taşın kenarına takıp asılır.' },
  duvarZipla: { ad: 'Duvar Zıplama', aciklama: 'Havada duvara doğru basıp zıpla: duvardan ters yöne en yükseğe sıçrar.\nZıplamayı basılı tutarsan iki duvar arasında kendiliğinden sağa sola sıçrar.' },
  pogo:       { ad: 'Bastonla Zıplama', aciklama: 'Havada VUR basılı: bastonun üstünde seker, dikenlere basabilir.' }
};
const KAYIT = (() => {
  let k = {};
  try { k = JSON.parse(localStorage.getItem('popeyeTalesKayit')) || {}; } catch (e) { k = {}; }
  k = Object.assign({ puan: 0, yetenek: {}, kalp: 0, guc: 0 }, k);
  if (k.can && !k.guc) k.guc = k.can;   // v1.13: eski "can" seviyeleri vuruş gücüne döner
  delete k.can;
  return k;
})();
// v1.61: ayarlar (AyarSahnesi) — ses efektleri / müzik / ambiyans aç-kapa, grafik 0 düşük · 1 orta · 2 yüksek
function ayarAl() {
  KAYIT.ayar = Object.assign({ sfx: 1, muz: 1, amb: 1, gr: 2 }, KAYIT.ayar);
  return KAYIT.ayar;
}
const GR_DPR = [1, 1.5, 2];   // grafik seviyesine göre en yüksek çizim çözünürlüğü (cihaz pikseli oranı) — main.js DPR
// Sesin türü: müzik (muzik klasörü), ambiyans (şelale, deniz), gerisi efekt
function sesTur(ad) {
  if (SES_KLASOR.muzik.includes(ad)) return 'muz';
  if (ad === 'selale' || ad === 'yzAmbiyans') return 'amb';
  return 'sfx';
}
function sesAcik(ad) { return !!ayarAl()[sesTur(ad)]; }
// Çalan bütün seslere ayarı uygular (kapalı tür susar ama döngüsü sürer; açınca kaldığı yerden duyulur)
function sesAyarUygula(game) {
  game.sound.sounds.forEach(s => { try { s.setMute(!sesAcik(s.key)); } catch (e) { /* ses yok */ } });
}
// Grafik ayarını açık sahnelere anında uygular (çözünürlük hariç: o oyun yeniden açılınca)
function grafikUygula(game) {
  game.scene.getScenes(false).forEach(s => { if (s.grafikAyarla) s.grafikAyarla(); });
}
function kayitYaz() { try { localStorage.setItem('popeyeTalesKayit', JSON.stringify(KAYIT)); } catch (e) { /* özel pencere */ } }

// v1.33: bölüm başına kalıcı toplama kaydı — puana yazılan hiçbir şey yeniden toplanamaz (tekrar oynayınca eksikler toplanır).
//   alinan: { e<i>: elmas, o<i>: özel ödül, s<i>: sandık (açıldı), k<i>: kırılır taş (kasa: parası alındı · kristal: kırıldı) }
//   gizli: { <alan no>: 1 } bulunan gizli alanlar · yildiz: bölüm sonunda ödülü verilmiş mücevher sayısı · anahtar: kilitli kapı anahtarı
//   kod: bölüm verisinin özeti — bölüm değişirse (yeniden üretilirse) kayıt sıfırlanır (eski sıra numaraları uymaz)
function bolumKodu(L) {
  const s = JSON.stringify([L.elmaslar, L.ozeller, L.sandiklar, L.kirTaslar || [], L.gizliler || [], L.anahtar || 0, L.bonus || 0]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function bolumKaydi(no, L) {
  KAYIT.bolum = KAYIT.bolum || {};
  const kod = bolumKodu(L);
  let b = KAYIT.bolum[no];
  if (!b || b.kod !== kod) { b = KAYIT.bolum[no] = { kod, alinan: {}, gizli: {}, yildiz: 0, anahtar: 0 }; kayitYaz(); }
  return b;
}
function yetenekVar(ad) { return !!(KAYIT.yetenek[ad] || (YETENEKLER[ad] && YETENEKLER[ad].acik)); }
function canMaxi() { return CONFIG.oyuncu.canMax + KAYIT.kalp; }   // en fazla kalp
function vurusGucu() { return 1 + KAYIT.guc; }   // v1.13: baston / pogo vuruşunun hasarı
