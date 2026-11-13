// v1.77: Reklam katmanı (AdMob, Capacitor). Web'de hiçbir şey yapmaz; sadece telefondaki uygulamada çalışır.
//  • Açılış (app open): uygulama açılınca ve arka plandan dönünce (en az 60 sn arayla)
//  • Geçiş: bölüm sonu ekranında bir tuşa basılınca, her CONFIG.mobil.reklam.gecisSikligi bölümde bir (Reklam.bolumGecti)
//  • Ödüllü: Reklam.odulluIzle() hazır, henüz oyunda bir yere bağlı değil · Banner: kimliği kayıtlı, gösterilmiyor
// Eklenti "göster" çağrısını reklam kapanmadan da bitirebildiği için her reklamın gerçekten kapandığı olaylardan beklenir
// (yoksa reklam kapanınca "uygulamaya dönüldü" sanılıp üst üste açılış reklamı çıkar).
const Reklam = (() => {
  const C = CONFIG.mobil.reklam;
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const AdMob = native && window.capacitorStripe ? window.capacitorStripe.AdMob : null;
  const TEST = { gecis: 'ca-app-pub-3940256099942544/1033173712', odullu: 'ca-app-pub-3940256099942544/5224354917', acilis: 'ca-app-pub-3940256099942544/9257395921' };
  const opts = (k) => ({ adId: C.testModu ? TEST[k] : C[k], isTesting: C.testModu });
  const ACILIS_ARALIK = 60000, SAYAC = 'pt_gecis_say';
  let hazir = false, mesgul = false, sonReklam = 0, sonAcilis = 0, arkaPlandaydi = 0;
  const say = () => { try { return +localStorage.getItem(SAYAC) || 0; } catch (e) { return 0; } };
  const sayYaz = (v) => { try { localStorage.setItem(SAYAC, v); } catch (e) {} };
  const dinle = async (ad, f) => { try { return await AdMob.addListener(ad, f); } catch (e) { return { remove: () => {} }; } };
  async function kapanmayiBekle(olaylar, sureMs) {
    let bit, kapali = false;
    const bitti = new Promise((r) => { bit = r; }), tut = [];
    const son = () => { if (kapali) return; kapali = true; tut.forEach((t) => { try { t.remove(); } catch (e) {} }); bit(); };
    for (const o of olaylar) tut.push(await dinle(o, son));
    setTimeout(son, sureMs);
    return { bitti };
  }

  async function baslat() {
    if (!AdMob) return;
    try {
      await AdMob.initialize({ initializeForTesting: C.testModu });
      try {   // AB kullanıcıları için izin formu (gerekirse)
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) {}
      hazir = true;
      gecisHazirla();
      acilisGoster();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { arkaPlandaydi = Date.now(); return; }
        if (mesgul || Date.now() - sonReklam < 4000 || !arkaPlandaydi) return;   // başka reklam kapanınca da sayfa "geri gelir"
        if (Date.now() - arkaPlandaydi < 2000) return;
        acilisGoster();
      });
    } catch (e) { console.warn('AdMob başlatılamadı', e); }
  }

  async function gecisHazirla() { if (hazir) try { await AdMob.prepareInterstitial(opts('gecis')); } catch (e) {} }

  async function acilisGoster() {
    if (!hazir || mesgul || Date.now() - sonAcilis < ACILIS_ARALIK) return;
    mesgul = true;
    try {
      await AdMob.loadAppOpen(opts('acilis'));
      const kapandi = await kapanmayiBekle(['appOpenAdClosed', 'appOpenAdFailedToShow'], 60000);
      await AdMob.showAppOpen();
      sonAcilis = Date.now();
      await kapandi.bitti;
    } catch (e) {}
    mesgul = false; sonReklam = Date.now();
  }

  // Bölüm bitince çağrılır; reklam KAPANINCA döner (gösterilemezse hemen). Gösterilemezse sayaç sıfırlanmaz.
  async function bolumGecti() {
    const n = say() + 1;
    sayYaz(n);
    if (n < C.gecisSikligi || !hazir || mesgul) return;
    mesgul = true;
    let gosterildi = false;
    try {
      const kapandi = await kapanmayiBekle(['interstitialAdDismissed', 'interstitialAdFailedToShow'], 120000);
      await AdMob.showInterstitial();
      gosterildi = true;
      await kapandi.bitti;
    } catch (e) {}
    mesgul = false; sonReklam = Date.now();
    if (gosterildi) sayYaz(0);
    gecisHazirla();
  }

  // Ödüllü: yalnız ödül kazanıldıysa true (yarıda kapatılırsa false). Web'de true.
  async function odulluIzle() {
    if (!native) return true;
    if (!hazir || mesgul) return false;
    mesgul = true;
    let odul = false;
    const h = await dinle('onRewardedVideoAdReward', () => { odul = true; });
    try {
      const kapandi = await kapanmayiBekle(['onRewardedVideoAdDismissed', 'onRewardedVideoAdFailedToShow'], 300000);
      await AdMob.prepareRewardVideoAd(opts('odullu'));
      AdMob.showRewardVideoAd().then((r) => { if (r) odul = true; }, () => {});
      await kapandi.bitti;
    } catch (e) {}
    try { h.remove(); } catch (e) {}
    mesgul = false; sonReklam = Date.now();
    return odul;
  }

  return { baslat, bolumGecti, odulluIzle, native };
})();
