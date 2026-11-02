const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  width: CONFIG.genislik,
  height: CONFIG.yukseklik,
  parent: 'oyun',
  backgroundColor: '#5ec8f2',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: CONFIG.fizik.yercekimi }, debug: false }
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  scene: [BootScene, GameScene]
});
