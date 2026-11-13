# Uygulama simgesi, açılış görseli ve giriş ekranı (v1.79):
#   kaynak/logo.png (512, saydam) → android-res/mipmap-*/ic_launcher(.png, _round, _foreground) + values/ic_launcher_background.xml
#   kaynak/giris.png → assets/ui/giris.jpg (oyundaki giriş ekranı) + android-res/drawable/splash.png (uygulama açılış görseli)
# Müzikler: kaynak/ses/muzik_<ad>.mp3 → ses/muzik/<ad>Muzik.mp3 (128 kb/sn; ffmpeg gerekir)
import os, subprocess
from PIL import Image
KOK = __file__.rsplit('/araclar/', 1)[0]
ZEMIN = (16, 42, 58)   # simge arka planı (logonun çerçeve içi tonu)
logo = Image.open(KOK + '/assets/kaynak/logo.png').convert('RGBA')
for ad, px in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    d = KOK + '/android-res/mipmap-' + ad; os.makedirs(d, exist_ok=True)
    kare = Image.new('RGBA', (px, px), ZEMIN + (255,))
    l = logo.resize((round(px * 0.94),) * 2, Image.LANCZOS)
    kare.alpha_composite(l, ((px - l.width) // 2,) * 2)
    kare.save(d + '/ic_launcher.png')
    maske = Image.new('L', (px * 4, px * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(maske).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
    yuv = kare.copy(); yuv.putalpha(maske.resize((px, px), Image.LANCZOS)); yuv.save(d + '/ic_launcher_round.png')
    f = round(px * 108 / 48)                      # uyarlanır simge ön katmanı: 108 dp, güvenli alan ortadaki 66 dp
    on = Image.new('RGBA', (f, f), (0, 0, 0, 0))
    l = logo.resize((round(f * 0.6),) * 2, Image.LANCZOS)
    on.alpha_composite(l, ((f - l.width) // 2,) * 2)
    on.save(d + '/ic_launcher_foreground.png')
os.makedirs(KOK + '/android-res/values', exist_ok=True)
open(KOK + '/android-res/values/ic_launcher_background.xml', 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % ZEMIN)
giris = Image.open(KOK + '/assets/kaynak/giris.png').convert('RGB')
giris.save(KOK + '/assets/ui/giris.jpg', quality=88, optimize=True)
os.makedirs(KOK + '/android-res/drawable', exist_ok=True)
giris.resize((1280, round(1280 * giris.height / giris.width)), Image.LANCZOS).save(KOK + '/android-res/drawable/splash.png', optimize=True)
os.makedirs(KOK + '/assets/ses/muzik', exist_ok=True)
for ad in ('bolum1', 'bolum2', 'bolum3', 'bolum4', 'patron2', 'patron3'):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', KOK + '/assets/kaynak/ses/muzik_' + ad + '.mp3',
                    '-b:a', '128k', KOK + '/assets/ses/muzik/' + ad + 'Muzik.mp3'], check=True)
print('tamam')
