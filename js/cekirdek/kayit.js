// v1.10: kalıcı kayıt (tarayıcıda localStorage): puan (dükkan parası), satın alınan yetenekler, kalp / can seviyeleri.
// Bölümler ve yeniden başlatmalar arasında korunur.
const DUKKAN_FIYAT = {
  // 1. bölüm en yüksek puan ≈ 5665 (elmas 930, özel 750, sandık 900, kasa 1000, kristal 825, düşman 760, patron 500).
  // 1. bölümden gelen puanla 1. kalp + 1. can + 1 yetenek alınabilir (750 + 750 + 2500 = 4000); yetenek = 3. seviye.
  yetenek: 2500,
  seviye: [750, 1500, 2500, 4000, 6000]
};
// acik: baştan sahip olunur · once: önce bu alınmalı
const YETENEKLER = {
  itTek:      { ad: 'İtme', acik: true, aciklama: 'Önündeki tek sandığı ya da taşı iter.' },
  itCift:     { ad: 'Çift İtme', once: 'itTek', aciklama: 'Üst üste duran nesneleri birlikte iter.' },
  cekTek:     { ad: 'Çekme', acik: true, aciklama: 'Bastonun kancasıyla tek nesneyi geri çeker.' },
  cekCift:    { ad: 'Çift Çekme', once: 'cekTek', aciklama: 'Üst üste duran nesneleri birlikte çeker.' },
  ciftZipla:  { ad: 'Çift Zıplama', aciklama: 'Havada bir kez daha zıplar, takla atar.' },
  kasaKir:    { ad: 'Kasa Kırma', acik: true, aciklama: 'Tahta kasaları bastonla kırar.' },
  tasKir:     { ad: 'Taş Kırma', once: 'kasaKir', aciklama: 'Taş blokları bastonla kırar.' },
  asilma:     { ad: 'Bastonla Asılma', aciklama: 'Düşerken bastonu taşın kenarına takıp asılır.' },
  duvarZipla: { ad: 'Duvar Zıplama', aciklama: 'Havada duvara doğru basıp zıpla: duvardan ters yöne en yükseğe sıçrar.\nZıplamayı basılı tutarsan iki duvar arasında kendiliğinden sağa sola sıçrar.' },
  pogo:       { ad: 'Bastonla Zıplama', aciklama: 'Havada VUR basılı: bastonun üstünde seker, dikenlere basabilir.' }
};
const KAYIT = (() => {
  let k = {};
  try { k = JSON.parse(localStorage.getItem('popeyeTalesKayit')) || {}; } catch (e) { k = {}; }
  return Object.assign({ puan: 0, yetenek: {}, kalp: 0, can: 0 }, k);
})();
function kayitYaz() { try { localStorage.setItem('popeyeTalesKayit', JSON.stringify(KAYIT)); } catch (e) { /* özel pencere */ } }
function yetenekVar(ad) { return !!(KAYIT.yetenek[ad] || (YETENEKLER[ad] && YETENEKLER[ad].acik)); }
function canMaxi() { return CONFIG.oyuncu.canMax + KAYIT.kalp; }   // en fazla kalp
