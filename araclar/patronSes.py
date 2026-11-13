# Patron sesleri (v1.74): kaynak/ses/kobra_*.mp3, patron_dus.mp3 → ses/patron/<ad>.mp3 — baştaki / sondaki sessizlik kesilir,
# sonu kısa söndürülür, ses tepe -1 dB'ye getirilir (ffmpeg gerekir). [kaynak, ad, başlangıç sn, süre sn]
import subprocess, re
KOK = __file__.rsplit('/araclar/', 1)[0]
LISTE = [('kobra_tis', 'kobraTis', 0.35, 3.1), ('kobra_mizrak1', 'kobraMizrak1', 0, 0.7), ('kobra_mizrak2', 'kobraMizrak2', 0, 0.7),
         ('kobra_tukur', 'kobraTukur', 0, 0.5), ('kobra_zehirVur', 'kobraZehirVur', 0, 1.6), ('kobra_hasar1', 'kobraHasar1', 0, 1.27),
         ('kobra_hasar2', 'kobraHasar2', 0, 1.27), ('kobra_ol', 'kobraOl', 0.2, 5.3), ('patron_dus', 'patronDus', 0.27, 1.6)]
for kay, ad, bas, sure in LISTE:
    g = KOK + '/assets/kaynak/ses/' + kay + '.mp3'
    kes = ['-ss', str(bas), '-t', str(sure), '-i', g]
    o = subprocess.run(['ffmpeg', '-hide_banner', *kes, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tepe = float(re.search(r'max_volume: ([-\d.]+) dB', o).group(1))
    f = f'volume={-1 - tepe:.1f}dB,afade=t=out:st={sure - 0.12:.2f}:d=0.12'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *kes, '-af', f, '-ac', '1', '-b:a', '96k',
                    KOK + '/assets/ses/patron/' + ad + '.mp3'], check=True)
    print(ad, 'tepe', tepe)
