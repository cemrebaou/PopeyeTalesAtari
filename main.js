// Oyun ekranı açıldığı pencereye/ekrana tam oturur (sabit 16:9 yok).
// Tuval cihaz piksel oranında çizilir (retina/telefon ekranlarında bulanıklık olmaz).
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const ekranW = () => Math.max(1, Math.round(window.innerWidth * DPR));
const ekranH = () => Math.max(1, Math.round(window.innerHeight * DPR));

const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  width: ekranW(),
  height: ekranH(),
  parent: 'oyun',
  backgroundColor: '#141c26',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: CONFIG.fizik.yercekimi }, debug: false }
  },
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / DPR },
  input: { activePointers: 4 },
  scene: [BootScene, GameScene, UIScene]
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
