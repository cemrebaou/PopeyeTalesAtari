// v1.79: Giriş ekranı — assets/ui/giris.jpg ekranı kaplar (oran korunur, taşan kenar kırpılır); dokununca / tuşa basınca oyun başlar.
// Görseldeki "Press Start" levhası hafifçe yanıp söner (üstüne açık bir parlama). Web'de adreste ?bolum=N varsa atlanır (BootSahnesi).
class GirisSahnesi extends Phaser.Scene {
  constructor() { super('Giris'); }

  create() {
    this.ciz();
    this.scale.on('resize', this.ciz, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.ciz, this));
    const basla = () => {
      if (this.basladi) return;
      this.basladi = true;
      sesCal(this, 'tik');
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => this.scene.start('Game'));
    };
    this.time.delayedCall(400, () => { this.input.once('pointerup', basla); this.input.keyboard.once('keydown', basla); });
  }

  ciz() {
    this.children.removeAll(true);
    this.tweens.killAll();
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setSize(W, H);
    const g = this.add.image(W / 2, H / 2, 'giris'), s = Math.max(W / g.width, H / g.height);
    g.setScale(s);
    // "Press Start" levhası: görselde ortada, alttan ~%7,5 yukarıda (1672×941'de 835, 870; 420×80)
    const p = this.add.rectangle(W / 2 + (835 - 836) * s, H / 2 + (870 - 470.5) * s, 400 * s, 64 * s, 0xfff2b0, 0.28).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: p, alpha: 0, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
