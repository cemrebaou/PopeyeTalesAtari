# Yüzme bölümü sesleri (v1.60): kaynak/ses/ → ses/yuzme/
#   firlatma.mp3 → yzFirlat (baştaki sessizlik kırpılır) · patlama.mp3 → yzPatla (aynı)
#   ambiance.mp3 → yzAmbiyans (olduğu gibi; oyunda son 1 sn'de bir sonrakiyle iç içe geçerek döner)
#   yuzme_sesi.mp3 → yzKulac1…N: içindeki kulaç sesleri tek tek kesilir (en çok 1.1 sn, sonu 0.3 sn sönümlü)
import subprocess, numpy as np
KOK = __file__.rsplit('/araclar/', 1)[0]
K, C = KOK + '/assets/kaynak/ses/', KOK + '/assets/ses/yuzme/'
def ff(*a): subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
kirp = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02'
ff('-i', K + 'firlatma.mp3', '-af', kirp, '-ac', '2', '-b:a', '128k', C + 'yzFirlat.mp3')
ff('-i', K + 'patlama.mp3', '-af', kirp, '-ac', '2', '-b:a', '128k', C + 'yzPatla.mp3')
ff('-i', K + 'ambiance.mp3', '-ac', '2', '-b:a', '128k', C + 'yzAmbiyans.mp3')
sr = 24000
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', K + 'yuzme_sesi.mp3', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, dtype=np.float32)
w = int(sr * 0.02); n = len(a) // w
db = 20 * np.log10(np.sqrt((a[:n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)
act = db > np.percentile(db, 35) + 6
bas = []; i = 0
while i < n:
    if act[i]:
        j = i
        while j < n and act[j:j + 10].any(): j += 1
        if (j - i) * 0.02 > 0.4: bas.append(i * 0.02)
        i = j
    else: i += 1
for k, t in enumerate(bas, 1):
    ff('-ss', str(max(0, t - 0.03)), '-t', '1.1', '-i', K + 'yuzme_sesi.mp3', '-af', 'afade=t=out:st=0.8:d=0.3,loudnorm=I=-20:TP=-2',
       '-ac', '2', '-ar', '44100', '-b:a', '96k', C + 'yzKulac%d.mp3' % k)
print(len(bas), 'kulaç')
