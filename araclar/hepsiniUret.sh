#!/usr/bin/env bash
# Tüm oyun görsellerini kaynak sayfalardan (assets/kaynak) yeniden üretir ve bölümü denetler.
# Depo kökünden: bash araclar/hepsiniUret.sh   (Python 3 + Pillow + NumPy + SciPy, Node gerekir)
set -e
cd "$(dirname "$0")/.."
python3 araclar/bolgeKaro.py
python3 araclar/zeminDose.py
python3 araclar/oyuncuEk.py
python3 araclar/yuzmeKes.py
python3 araclar/mayinKes.py
python3 araclar/dmayinKes.py
python3 araclar/yuzmeSes.py
python3 araclar/ayarUiKes.py
python3 araclar/dusmanKes.py
python3 araclar/yarasaOlKes.py   # dusmanKes'ten sonra (yarasa ölçeği)
python3 araclar/ekKareKes.py
python3 araclar/toplananKes.py
python3 araclar/kirTasKes.py
python3 araclar/kirParcaKes.py
python3 araclar/uiKes.py
python3 araclar/harfKes.py      # uiKes'ten sonra (rakamları ui'dan alır)
python3 araclar/harfAtlas.py    # harfKes'ten sonra: harfleri tek atlasa toplar
python3 araclar/bolum2Uret.py
python3 araclar/zeminDose.py level2
node araclar/erisim.js | tail -1
node araclar/erisim.js level2 | tail -1
python3 araclar/bolum4Uret.py
python3 araclar/zeminDose.py level4
node araclar/erisim.js level4 | tail -1   # kalanlar yetenek / zor atlayış isteyen yerler (OYUN.md 4. Bölüm)
python3 araclar/dukkanUret.py
python3 araclar/dukkanIkon.py
python3 araclar/nesne2Kes.py
python3 araclar/yumurtaKes.py
python3 araclar/kobraKes.py
