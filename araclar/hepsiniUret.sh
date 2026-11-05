#!/usr/bin/env bash
# Tüm oyun görsellerini kaynak sayfalardan (assets/kaynak) yeniden üretir ve bölümü denetler.
# Depo kökünden: bash araclar/hepsiniUret.sh   (Python 3 + Pillow + NumPy + SciPy, Node gerekir)
set -e
cd "$(dirname "$0")/.."
python3 araclar/bolgeKaro.py
python3 araclar/zeminDose.py
python3 araclar/oyuncuEk.py
python3 araclar/dusmanKes.py
python3 araclar/toplananKes.py
python3 araclar/kirTasKes.py
python3 araclar/kirParcaKes.py
python3 araclar/uiKes.py
python3 araclar/harfKes.py      # uiKes'ten sonra (rakamları ui'dan alır)
python3 araclar/harfAtlas.py    # harfKes'ten sonra: harfleri tek atlasa toplar
node araclar/erisim.js | tail -1
