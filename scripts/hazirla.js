// Android paketi hazırlığı (GitHub Actions: .github/workflows/derle.yml). Kullanım:
//   node scripts/hazirla.js www      -> www/ üretir: index.html + js + assets (assets/kaynak hariç) + lib (Phaser, Capacitor, AdMob);
//                                       index.html'deki CDN Phaser satırı yerel dosyalarla değişir
//   node scripts/hazirla.js config   -> capacitor.config.json
//   node scripts/hazirla.js android  -> Android projesine AdMob kimliği, yatay tam ekran, sürüm numarası, yayın imzası
// Ayarlar js/ayarlar.js → CONFIG.mobil (paket adı, oyun adı, reklam kimlikleri).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const kok = path.join(__dirname, '..');
const ctx = { window: {}, console };
vm.runInNewContext(fs.readFileSync(path.join(kok, 'js/ayarlar.js'), 'utf8') + ';this.CONFIG = CONFIG;', ctx);
const C = ctx.CONFIG, M = C.mobil;
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const adim = process.argv[2];

if (adim === 'www') {
  const www = path.join(kok, 'www');
  fs.rmSync(www, { recursive: true, force: true });
  fs.mkdirSync(path.join(www, 'lib'), { recursive: true });
  fs.cpSync(path.join(kok, 'js'), path.join(www, 'js'), { recursive: true });
  fs.cpSync(path.join(kok, 'assets'), path.join(www, 'assets'), { recursive: true, filter: (s) => !s.startsWith(path.join(kok, 'assets', 'kaynak')) });
  const nm = path.join(kok, 'node_modules');
  fs.copyFileSync(path.join(nm, 'phaser/dist/phaser.min.js'), path.join(www, 'lib/phaser.min.js'));
  fs.copyFileSync(path.join(nm, '@capacitor/core/dist/capacitor.js'), path.join(www, 'lib/capacitor.js'));
  fs.copyFileSync(path.join(nm, '@capacitor-community/admob/dist/plugin.js'), path.join(www, 'lib/admob.js'));
  let h = fs.readFileSync(path.join(kok, 'index.html'), 'utf8');
  const cdn = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/phaser@[^"]*"><\/script>/;
  if (!cdn.test(h)) throw new Error('index.html içinde CDN Phaser satırı bulunamadı');
  h = h.replace(cdn, '<script src="lib/capacitor.js"></script>\n<script src="lib/admob.js"></script>\n<script src="lib/phaser.min.js"></script>');
  fs.writeFileSync(path.join(www, 'index.html'), h);
  console.log('www/ hazır');
}

if (adim === 'config') {
  fs.writeFileSync(path.join(kok, 'capacitor.config.json'), JSON.stringify({
    appId: M.paketAdi, appName: M.oyunAdi, webDir: 'www', android: { backgroundColor: '#111111' }
  }, null, 2));
  console.log('capacitor.config.json yazıldı:', M.paketAdi);
}

if (adim === 'android') {
  const app = path.join(kok, 'android/app');
  const admobId = M.reklam.testModu ? TEST_APP_ID : M.reklam.uygulamaId;

  const strings = path.join(app, 'src/main/res/values/strings.xml');
  let s = fs.readFileSync(strings, 'utf8');
  if (!s.includes('admob_app_id')) s = s.replace('</resources>', `    <string name="admob_app_id">${admobId}</string>\n</resources>`);
  fs.writeFileSync(strings, s);

  const man = path.join(app, 'src/main/AndroidManifest.xml');
  let m = fs.readFileSync(man, 'utf8');
  if (!m.includes('gms.ads.APPLICATION_ID')) {
    m = m.replace(/<application([^>]*)>/, `<application$1>\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />`);
  }
  if (!m.includes('permission.AD_ID')) m = m.replace('<application', '<uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n    <application');
  if (!m.includes('screenOrientation')) m = m.replace('<activity', '<activity\n            android:screenOrientation="sensorLandscape"');   // yatay oyun
  fs.writeFileSync(man, m);

  // Tam ekran (durum çubuğu yok, çentik alanı kullanılır)
  const stil = path.join(app, 'src/main/res/values/styles.xml');
  let st = fs.readFileSync(stil, 'utf8');
  if (!st.includes('windowFullscreen')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>');
    st = st.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">#111111</item>');
  }
  fs.writeFileSync(stil, st);

  // Sürüm: Play'deki eski (Unity) sürümlerin üstünde kalsın diye taban + derleme numarası
  const gradle = path.join(app, 'build.gradle');
  const no = M.surumTaban + (+process.env.GITHUB_RUN_NUMBER || 1);
  let g = fs.readFileSync(gradle, 'utf8');
  g = g.replace(/versionCode \d+/, `versionCode ${no}`).replace(/versionName "[^"]*"/, `versionName "${C.surum.replace(/^v/, '')}"`);
  if (process.env.KEYSTORE_PATH && !g.includes('signingConfigs')) {
    g = g.replace('    buildTypes {', `    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {`).replace('minifyEnabled false', 'minifyEnabled false\n            signingConfig signingConfigs.release');
  }
  fs.writeFileSync(gradle, g);

  // Simge / açılış görseli: android-res/ varsa res klasörüne kopyalanır (yoksa Capacitor'ın varsayılanı kalır)
  const kaynak = path.join(kok, 'android-res'), res = path.join(app, 'src/main/res');
  if (fs.existsSync(kaynak)) fs.cpSync(kaynak, res, { recursive: true });

  console.log('Android ayarlandı. AdMob:', admobId, 'versionCode:', no, 'versionName:', C.surum);
}
