# v1.39: süs görsellerini (nesne3Kes.py'nin kaynak boyutunda kestiği assets/nesne/sus*.png) Real-ESRGAN x4 anime modeliyle
# 4 kat büyütür, sonra oyundaki çizim boyunun (js/sistemler/susler.js → SUS_ZEMIN / SUS_TAVAN) en büyük rastgele hâlinin
# (× 1,15) 4 katına LANCZOS ile küçültür. Böylece doku ekranda hiç büyütülmez. ASSETLER.nesne3 w×h güncellenir (ox aynı).
# Gerekenler: pip install spandrel (torch ile gelir). Model ilk çalıştırmada araclar/model/ içine indirilir (depoya girmez).
# Sıra: python3 araclar/nesne3Kes.py && python3 araclar/susBuyut.py
import json, os, re, urllib.request
import numpy as np, torch
from PIL import Image
from spandrel import ModelLoader
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = KOK + '/araclar/model/RealESRGAN_x4plus_anime_6B.pth'
if not os.path.exists(MD):
    os.makedirs(os.path.dirname(MD), exist_ok=True)
    urllib.request.urlretrieve('https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth', MD)
model = ModelLoader().load_from_file(MD).eval()
KAT = 4   # ekran büyütmesi payı (dünya px → doku px)

js = open(KOK + '/js/sistemler/susler.js', encoding='utf8').read()
BOY = {ad: int(b) for ad, b in re.findall(r"\['(sus\w+)', (\d+), \d+\]", js)}

def buyut(rgb):   # HxWx3 uint8 → 4× HxWx3 uint8
    t = torch.from_numpy(rgb).permute(2, 0, 1).float().div(255).unsqueeze(0)
    with torch.no_grad(): o = model(t)
    return (o.squeeze(0).clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8)

ap = KOK + '/js/veri/assetlar.js'
s = open(ap, encoding='utf8').read()
meta = json.loads(re.search(r'ASSETLER\.nesne3 = (\{.*?\});', s).group(1))
for ad, boy in BOY.items():
    p = KOK + '/assets/nesne/' + ad + '.png'
    im = np.array(Image.open(p).convert('RGBA'))
    pad = 8   # kenar etkisi olmasın diye saydam pay
    im = np.pad(im, ((pad, pad), (pad, pad), (0, 0)))
    a = im[..., 3:4].astype(np.float32) / 255
    rgb = (im[..., :3] * a + 0).astype(np.uint8)   # saydam yerler siyah: kenarda yeşil/sarı hale kalmaz
    # renk: önceden çarpılmış alfa ile büyüt, sonra böl; alfa ayrı büyütülür
    R = buyut(rgb).astype(np.float32); A = buyut(np.repeat(im[..., 3:4], 3, 2))[..., 0].astype(np.float32)
    A = np.where(A < 24, 0, A)
    R = np.where(A[..., None] > 0, np.clip(R * 255 / np.maximum(A[..., None], 1), 0, 255), 0)
    g = Image.fromarray(np.dstack([R.astype(np.uint8), A.astype(np.uint8)]))
    bb = g.getchannel('A').getbbox(); g = g.crop(bb)
    hedef = round(boy * 1.15 * KAT)
    kenar = g.width if ad == 'susCelenk' else g.height   # çelenkte boy = genişlik
    olc = hedef / kenar
    g = g.resize((max(1, round(g.width * olc)), max(1, round(g.height * olc))), Image.LANCZOS)
    g.save(p, optimize=True)
    meta[ad] = {'w': g.width, 'h': g.height, 'ox': meta[ad]['ox']}
    print(ad, g.size)
s = re.sub(r'ASSETLER\.nesne3 = \{.*?\};', 'ASSETLER.nesne3 = ' + json.dumps(meta) + ';', s, flags=re.S)
open(ap, 'w', encoding='utf8').write(s)
