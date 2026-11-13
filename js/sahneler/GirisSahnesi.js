// v1.79: Giriş ekranı — dokununca / tuşa basınca oyun başlar. "Press Start" levhası hafifçe yanıp söner.
// v1.80: görsel (assets/ui/giris.jpg) geniş çizilmiş: 16:9 asıl resim tam ortasında, GIRIS_IC oranında. Asıl resim ekrana SIĞDIRILIR;
// ekran 16:9'dan geniş (ya da uzun) ise kenarlar görselin devamıyla dolar (girisYerlesim). Web'de adreste ?bolum=N varsa atlanır.
const GIRIS_IC = 3216 / 5250;   // araclar/mobilGorsel.py GENIS_IC ile aynı
function girisYerlesim(W, H) {
  const src = oyun.textures.get('giris').getSourceImage();
  const s = Math.min(W / (src.width * GIRIS_IC), H / (src.height * GIRIS_IC));
  return { s, k: s * src.width * GIRIS_IC / 1672 };   // s: görsel ölçeği · k: asıl resmin (1672×941) pikseli → ekran
}

// En baştaki sahne: yalnız giriş görselini yükler (yükleme ekranı onu kullanır), sonra Boot'a geçer
class OnSahnesi extends Phaser.Scene {
  constructor() { super('On'); }
  preload() { this.cameras.main.setBackgroundColor('#000000'); this.load.image('giris', 'assets/ui/giris.jpg'); }
  create() { this.scene.start('Boot'); }
}

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
    const Y = girisYerlesim(W, H), k = Y.k;
    this.add.image(W / 2, H / 2, 'giris').setScale(Y.s);
    // "Press Start" levhası: asıl resimde (1672×941) merkezi (835, 870), 400×64
    const p = this.add.rectangle(W / 2 + (835 - 836) * k, H / 2 + (870 - 470.5) * k, 400 * k, 64 * k, 0xfff2b0, 0.28).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: p, alpha: 0, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
