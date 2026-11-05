# assets/harf/<kod>.png harflerini tek atlasa toplar: assets/harf/harf.png + harf.json (Phaser JSON hash).
# Ayrı dosyaları siler. Oyun 116 ayrı dosya yerine tek dosya yükler (telefonda açılış hızlanır). harfKes.py'den sonra çalıştır.
import json, os, glob
from PIL import Image
D = 'assets/harf'
dosyalar = sorted(f for f in glob.glob(D + '/*.png') if os.path.basename(f) != 'harf.png')
imgs = [(os.path.basename(f)[:-4], Image.open(f).convert('RGBA')) for f in dosyalar]
imgs.sort(key=lambda t: -t[1].height)
G, P = 2048, 2
x = y = satirH = 0
yer = {}
for ad, im in imgs:
    if x + im.width > G: x, y, satirH = 0, y + satirH + P, 0
    yer[ad] = (x, y); x += im.width + P; satirH = max(satirH, im.height)
H = y + satirH
atlas = Image.new('RGBA', (G, H))
kareler = {}
for ad, im in imgs:
    px, py = yer[ad]; atlas.paste(im, (px, py))
    kareler[ad] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                   'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
                   'sourceSize': {'w': im.width, 'h': im.height}}
atlas.save(D + '/harf.png', optimize=True)
json.dump({'frames': kareler, 'meta': {'image': 'harf.png', 'size': {'w': G, 'h': H}, 'scale': 1}}, open(D + '/harf.json', 'w'), separators=(',', ':'))
for f in dosyalar: os.remove(f)   # tek tek dosyalar artık gerekmez
print('harf atlası', G, 'x', H, len(kareler), 'kare')
