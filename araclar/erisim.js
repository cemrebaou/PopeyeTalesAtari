// Bölüm erişilebilirlik kontrolü — kullanım (repo klasöründe):
//   node araclar/erisim.js          → rahat zıplamayla (havada tam hızın %65'i, pogo yok) ulaşılamayan önemli yerleri listeler
//   node araclar/erisim.js --coz    → ulaşılamayan yer kalmayana kadar ara kaya önerir (level1.js → kayalar'a eklenir)
// Model: gövde 18x30 px (eğik geçişleri de kapsasın diye; ayakta gövde 42 px, 1 karelik aralıklardan eğilerek geçilir), Arcade benzeri 60 Hz adımlar, ızgara çarpışması, zıplama 625, yerçekimi 1400, sarmaşığa tutunma.
// Kayalar, taşlar, bloklar ve basamaklar dahil edilir (takozlar kırılabildiği için geçilebilir sayılır). Önemli yerler: patron, çıkış, kontrol noktaları, sandıklar, elmaslar, özel eşyalar.
const fs=require('fs'),path=require('path');
const L=new Function(fs.readFileSync(path.join(__dirname,'..','level1.js'),'utf8')+';return LEVEL1;')();const T=32,W=L.genislik/T,H=L.yukseklik/T;
const BW=18,BH=30,dt=1/60,G=1400;
const temel=[...Array(H)].map(()=>new Uint8Array(W));
for(const [x,y,w,h] of L.bloklar.concat(L.basamaklar||[],(L.kayalar||[]).concat(L.taslar||[]).map(([x,y])=>[x,y,32,32])))for(let r=y/T;r<(y+h)/T;r++)for(let c=x/T;c<(x+w)/T;c++)temel[r][c]=1;
const vinesAll=L.sarmasiklar.map(([x,y,h],i)=>({id:i,x0:x-9,x1:x+9,y0:y-12,y1:y+h,c:Math.floor(x/T)}));
const spikeCells=new Set();L.dikenler.forEach(([x,y,w])=>{for(let c=Math.floor(x/T);c<=Math.floor((x+w-1)/T);c++)for(let r=Math.floor(y/T)-3;r<=Math.floor(y/T);r++)spikeCells.add(r+','+c);});
const itemCells=new Set();[...L.elmaslar,...L.sandiklar.map(s=>[s[0],s[1]-16]),...L.ozeller.map(o=>[o[1],o[2]]),...L.kontrol.map(k=>[k[0],k[1]-16])].forEach(([x,y])=>{for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++)itemCells.add((Math.floor(y/T)+dr)+','+(Math.floor(x/T)+dc));});
function degerlendir(kayalar,hiz,vys){
  const g=temel.map(r=>r.slice()); for(const [c,r] of kayalar) g[r][c]=1;
  const solid=(c,r)=>c<0||c>=W||(r>=0&&r<H&&g[r][c]===1);
  const stand=(r,c)=>r>1&&r<H&&g[r][c]&&!g[r-1][c];
  const segs=[],segOf={};
  for(let r=2;r<H;r++){let c=0;while(c<W){if(stand(r,c)){let s=c;while(c<W&&stand(r,c))c++;const sg={id:segs.length,r,c0:s,c1:c-1};segs.push(sg);for(let k=s;k<c;k++)segOf[r+','+k]=sg.id;}else c++;}}
  const hit=(x,y)=>{const c0=Math.floor(x/T),c1=Math.floor((x+BW-0.01)/T),r0=Math.floor(y/T),r1=Math.floor((y+BH-0.01)/T);for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)if(solid(c,r))return true;return false;};
  function at(x,y,vx,vy,tutun){const o={seg:new Set(),vine:new Set()};
    for(let i=0;i<300;i++){vy=Math.min(vy+G*dt,720);const nx=x+vx*dt;if(!hit(nx,y))x=nx;const ny=y+vy*dt;
      if(hit(x,ny)){if(vy>0){const fr=Math.floor((ny+BH)/T);for(const c of [Math.floor(x/T),Math.floor((x+BW-0.01)/T)]){const s=segOf[fr+','+c];if(s!==undefined)o.seg.add(s);}return o;}vy=0;continue;}
      y=ny;if(tutun)for(const v of vinesAll)if(x<v.x1&&x+BW>v.x0&&y<v.y1&&y+BH>v.y0)o.vine.add(v.id);if(y>L.yukseklik)return o;}return o;}
  const N=segs.length+vinesAll.length,E=[...Array(N)].map(()=>new Set());
  const add=(u,o)=>{o.seg.forEach(s=>E[u].add(s));o.vine.forEach(v=>E[u].add(segs.length+v));};
  for(const s of segs){const top=s.r*T-BH;
    for(const [x,d] of [[s.c0*T,-1],[(s.c1+1)*T-BW,1]]){
      for(const vx of hiz){for(const vy of vys)add(s.id,at(x,top,d*vx,vy,true));add(s.id,at(x+d*(BW+1),top,d*vx,0,true));}
      for(const vy of vys)add(s.id,at(x,top,0,vy,true));}}
  for(const v of vinesAll){const u=segs.length+v.id,cx=(v.x0+v.x1)/2-BW/2;
    for(let y=v.y0;y<=v.y1-BH+40;y+=16){for(const d of [-1,1]){for(const f of hiz)add(u,at(cx,y,d*f*0.7,-500,true));}add(u,at(cx,y,0,0,false));}
    for(const d of [-1,0,1])for(const f of hiz)add(u,at(cx,v.y0-BH+10,d*f,-260,true));}
  const segAt=(px,py)=>segs.find(s=>py>=s.r*T-40&&py<=s.r*T+8&&px>=s.c0*T-8&&px<=(s.c1+1)*T+8);
  const st=segAt(L.baslangic[0],L.baslangic[1]).id;const R=new Set([st]),q=[st];
  while(q.length){const u=q.shift();for(const v of E[u])if(!R.has(v)){R.add(v);q.push(v);}}
  const hedefler=[];const ekle=(ad,px,py,w)=>{const s=segAt(px,py);if(s)hedefler.push({ad,s,w});};
  L.kontrol.forEach(([x,y])=>ekle('kontrol',x,y,10));ekle('patron',L.boss[0],L.boss[1],30);ekle('cikis',L.cikis[0],L.cikis[1],30);
  L.sandiklar.forEach(([x,y])=>ekle('sandik',x,y,3));L.elmaslar.forEach(([x,y])=>ekle('elmas',x,y+30,1));L.ozeller.forEach(([t,x,y])=>ekle(t,x,y+30,3));
  let hs=0;const eksik=[];for(const h of hedefler){if(R.has(h.s.id))hs+=h.w;else eksik.push(h);}
  const kayaSet=new Set(kayalar.map(([c,r])=>r+','+c));
  const ulas=[...R].filter(i=>i<segs.length).map(i=>segs[i]).filter(s=>!(s.c0===s.c1&&kayaSet.has(s.r+','+s.c0)));
  let mesafe=0;for(const h of eksik){let m=1e9;for(const a of ulas){const dx=Math.max(0,h.s.c0-a.c1,a.c0-h.s.c1),dy=Math.max(0,a.r-h.s.r)*1.5+Math.max(0,h.s.r-a.r)*0.3;m=Math.min(m,Math.hypot(dx,dy));}mesafe+=m*h.w;}
  const skor=hs*1000+ulas.length*5-mesafe;
  return {segs,R,skor,hs,eksik,g};
}
function atislar(g,seg,hiz,vys){ // seg: {r,c0,c1}; dönen: iniş karoları "r,c" ve sarmaşık id'leri
  const solid=(c,r)=>c<0||c>=W||(r>=0&&r<H&&g[r][c]===1);
  const hit=(x,y)=>{const c0=Math.floor(x/T),c1=Math.floor((x+BW-0.01)/T),r0=Math.floor(y/T),r1=Math.floor((y+BH-0.01)/T);for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)if(solid(c,r))return true;return false;};
  const out=new Set();
  const at=(x,y,vx,vy)=>{for(let i=0;i<300;i++){vy=Math.min(vy+G*dt,720);const nx=x+vx*dt;if(!hit(nx,y))x=nx;const ny=y+vy*dt;
    if(hit(x,ny)){if(vy>0){const fr=Math.floor((ny+BH)/T);for(const c of [Math.floor(x/T),Math.floor((x+BW-0.01)/T)])if(solid(c,fr))out.add(fr+','+c);return;}vy=0;continue;}
    y=ny;for(const v of vinesAll)if(x<v.x1&&x+BW>v.x0&&y<v.y1&&y+BH>v.y0)out.add('v'+v.id);if(y>L.yukseklik)return;}};
  const top=seg.r*T-BH;
  for(const [x,d] of [[seg.c0*T,-1],[(seg.c1+1)*T-BW,1]]){for(const vx of hiz){for(const vy of vys)at(x,top,d*vx,vy);at(x+d*(BW+1),top,d*vx,0);}for(const vy of vys)at(x,top,0,vy);}
  return out;}
const HIZ=[0,25,50,75,100,130],VY=[-625];
let kayalar=[];
let cur=degerlendir(kayalar,HIZ,VY);
console.log('ulaşılamayan önemli yer:',cur.eksik.length);
const COZ=process.argv.includes('--coz');
for(let it=0;COZ&&it<60&&cur.eksik.length;it++){
  const ulas=[...cur.R].filter(i=>i<cur.segs.length).map(i=>cur.segs[i]);
  const ulasTile=new Set();ulas.forEach(sg=>{for(let c=sg.c0;c<=sg.c1;c++)ulasTile.add(sg.r+','+c);});
  const ulasVine=new Set([...cur.R].filter(i=>i>=cur.segs.length).map(i=>'v'+(i-cur.segs.length)));
  const g=cur.g;const tried=new Set();let best=null;let full=0;
  for(const a of ulas){
    for(let c=a.c0-5;c<=a.c1+5;c++)for(let r=a.r-3;r<=a.r+6;r++){
      const k=c+','+r; if(tried.has(k))continue; tried.add(k);
      if(c<1||c>=W-1||r<4||r>=H-2) continue;
      if(g[r][c]||g[r-1][c]||g[r-2][c]||g[r-3][c]||g[r+1][c]) continue;
      if(g[r+2][c]||g[r+3][c]) continue;
      if(spikeCells.has(r+','+c)||itemCells.has(r+','+c)) continue;
      if(vinesAll.some(v=>Math.abs(v.c-c)<=1&&r*T>=v.y0-T&&r*T<=v.y1+T)) continue;
      g[r][c]=1;
      // 1) kayaya ulaşılan bir zeminden rahat atışla iniliyor mu (a ve komşuları)
      let ok=false;
      for(const a2 of ulas){ if(Math.abs(a2.r-r)>8||Math.max(0,c-a2.c1,a2.c0-c)>6) continue;
        if(atislar(g,a2,HIZ,VY).has(r+','+c)){ok=true;break;}}
      // 2) kayadan yeni bir yere geçiliyor mu
      let yeni=false;
      if(ok){for(const t of atislar(g,{r,c0:c,c1:c},HIZ,VY)){ if(t===r+','+c) continue; if(t[0]==='v'?!ulasVine.has(t):!ulasTile.has(t)){yeni=true;break;}}}
      g[r][c]=0;
      if(!ok||!yeni) continue;
      full++;
      const ev=degerlendir(kayalar.concat([[c,r]]),HIZ,VY);
      if(ev.skor>cur.skor&&(!best||ev.skor>best.ev.skor)) best={c,r,ev};
    }
  }
  if(!best){console.log('ilerleme yok; eksik:',cur.eksik.map(h=>h.ad+'@'+h.s.c0+'-'+h.s.c1+'/'+h.s.r).join(' '));break;}
  kayalar.push([best.c,best.r]);cur=best.ev;
  console.log('aday',full,'kaya',best.c,best.r,'hedef',cur.hs,'eksik',cur.eksik.length,'skor',Math.round(cur.skor));
}
if(COZ) console.log('önerilen kayalar (piksel):',JSON.stringify(kayalar.map(([c,r])=>[c*32,r*32])));
console.log(cur.eksik.length?'kalan: '+cur.eksik.map(h=>h.ad+' (sütun '+h.s.c0+'-'+h.s.c1+', satır '+h.s.r+')').join(', '):'Tüm önemli yerlere rahat zıplamayla ulaşılıyor.');
