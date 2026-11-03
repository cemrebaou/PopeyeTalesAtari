const oyun = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'oyun',
  backgroundColor: '#5ec8f2',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: CONFIG.fizik.yercekimi }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  input: { activePointers: 4 },
  scene: [BootScene, GameScene]
});
