// Oyunu başlatır. Ekran açıldığı pencereye / ekrana tam oturur (sabit en-boy oranı yok);
// tuval cihaz piksel oranında çizilir (retina / telefon ekranlarında bulanıklık olmaz).
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const ekranW = () => Math.max(1, Math.round(window.innerWidth * DPR));
const ekranH = () => Math.max(1, Math.round(window.innerHeight * DPR));

// Bölümler sırayla; adres çubuğunda ?bolum=2 ile doğrudan o bölüm açılır
const BOLUMLER = [LEVEL1, LEVEL2];
const ilkBolum = Math.min(BOLUMLER.length, Math.max(1, parseInt(new URLSearchParams(location.search).get('bolum')) || 1)) - 1;

const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  width: ekranW(),
  height: ekranH(),
  parent: 'oyun',
  backgroundColor: '#141c26',
  pixelArt: false,
  antialias: true,
  mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
  physics: { default: 'arcade', arcade: { gravity: { y: CONFIG.fizik.yercekimi }, debug: false } },
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / DPR },
  input: { activePointers: 4 },
  scene: [BootSahnesi, OyunSahnesi, ArayuzSahnesi]
});

// Pencere boyutu / telefon yönü / tam ekran değişince tuvali yeniden boyutla
let boyutZaman = null;
const yenidenBoyutla = () => {
  clearTimeout(boyutZaman);
  boyutZaman = setTimeout(() => {
    oyun.scale.resize(ekranW(), ekranH());
    oyun.scale.setZoom(1 / DPR);
  }, 60);
};
window.addEventListener('resize', yenidenBoyutla);
window.addEventListener('orientationchange', yenidenBoyutla);
document.addEventListener('fullscreenchange', yenidenBoyutla);
