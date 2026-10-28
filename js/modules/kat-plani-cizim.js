/* Koruk Asistan — Kat Planı · çizim ve çıktı
 * Tek çizim yolu: editör ekranı, önizleme, JPEG, PDF ve yazdırma AYNI fonksiyonlarla çizilir (ekranda gördüğünüz çıktıdır).
 *   planCiz(ctx,kat,resim,opt)   model düzleminde: altlık + kaçış yolları + semboller + "şu an buradasınız"
 *   sayfaCiz(kat,resim,ayar,i,o) başlıklı, lejantlı, onay bloklu tam sayfa tuvali (A3/A4 yatay içerik kutusu)
 *   jpegSigdir / pdfYap / yazdirGovde: çıktı biçimleri (sayfalar tek tek üretilir). Sayfa kenar boşluğu (10 mm) PDF ve yazdırmada sayfaya konurken eklenir.
 */
(function(global){
'use strict';
if(global.KatPlaniCizim)return;
const core=()=>global.KatPlaniCore;
const JSPDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const upper=s=>String(s||'').toLocaleUpperCase('tr-TR');
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

/* ───────── semboller (model birimi; s = kenar uzunluğu) ─────────
 * Her simge ±.75 birimlik kutuda çizilir (1 birim = sembolün yarı kenarı): kare rozette beyaz, sarı üçgende siyah.
 * Yeni sembol eklemek: core.SEMBOLLER'e satır + aşağıdaki IC tablosuna aynı kimlikle bir çizim işlevi. */
let _font=null;
function yazitipi(){
  if(_font)return _font;
  try{_font=getComputedStyle(document.documentElement).getPropertyValue('--ka-font').trim()||null}catch(_){}
  return _font||'system-ui,"Segoe UI",sans-serif';
}
let _olcu=null;
/* Oda adı kutusunun genişliği için yazı ölçüsü (editördeki isabet sınaması ile çizim aynı ölçüyü kullanır) */
function metinGenislik(t,fs){
  try{_olcu=_olcu||document.createElement('canvas').getContext('2d');_olcu.font='800 '+fs+'px '+yazitipi();return _olcu.measureText(t).width}
  catch(_){return String(t).length*fs*.6}
}
function rozet(c,s,renk){
  rr(c,-s/2,-s/2,s,s,s*.14);c.fillStyle=renk;c.fill();
  c.lineWidth=s*.05;c.strokeStyle='rgba(0,0,0,.45)';c.stroke();
}
function ucgen(c,u){
  c.beginPath();c.moveTo(0,-u*1.0);c.lineTo(u*1.02,u*.82);c.lineTo(-u*1.02,u*.82);c.closePath();
  c.fillStyle=core().RENK.sari;c.fill();c.lineWidth=u*.14;c.strokeStyle='#111';c.stroke();
}
const cizgi=(c,p)=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()};
const dolgu=(c,p)=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.closePath();c.fill()};
const daire=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()};
function ok(c,boy){                         /* sağa bakan ok */
  c.beginPath();c.moveTo(-boy,0);c.lineTo(boy*.55,0);c.stroke();
  c.beginPath();c.moveTo(boy,0);c.lineTo(boy*.25,-.34);c.lineTo(boy*.25,.34);c.closePath();c.fill();
}
function alev(c,k,bg){                      /* alev; bg: içindeki oyuğun rengi */
  c.save();c.scale(k,k);
  c.beginPath();c.moveTo(0,-.75);c.bezierCurveTo(.12,-.3,.55,-.1,.5,.3);c.bezierCurveTo(.45,.62,.2,.75,0,.75);c.bezierCurveTo(-.25,.75,-.5,.55,-.5,.25);c.bezierCurveTo(-.5,-.05,-.15,-.2,0,-.75);c.closePath();c.fill();
  c.fillStyle=bg;c.beginPath();c.moveTo(.02,.1);c.bezierCurveTo(.2,.28,.26,.45,.14,.58);c.bezierCurveTo(.08,.64,-.18,.64,-.2,.42);c.bezierCurveTo(-.22,.26,-.04,.2,.02,.1);c.closePath();c.fill();
  c.restore();
}
function merdivenIc(c){c.lineWidth=.16;cizgi(c,[[-.7,.62],[-.7,.3],[-.35,.3],[-.35,-.02],[0,-.02],[0,-.34],[.35,-.34],[.35,-.66],[.72,-.66]])}
const IC={
  sondurucu(c){
    rr(c,-.34,-.02,.68,.86,.12);c.fill();c.fillRect(-.12,-.34,.24,.34);
    c.lineWidth=.14;cizgi(c,[[-.12,-.36],[.3,-.42]]);
    c.lineWidth=.1;c.beginPath();c.moveTo(.3,-.42);c.quadraticCurveTo(.62,-.1,.5,.3);c.stroke();
  },
  hortum(c){
    c.lineWidth=.16;c.beginPath();c.arc(0,-.08,.5,0,Math.PI*2);c.stroke();daire(c,0,-.08,.16);
    c.lineWidth=.1;c.beginPath();c.moveTo(.36,.28);c.quadraticCurveTo(.7,.56,.2,.7);c.stroke();
  },
  alarm(c){
    daire(c,0,-.04,.3);c.lineWidth=.12;
    c.beginPath();c.arc(0,-.04,.56,Math.PI*.8,Math.PI*1.2);c.stroke();
    c.beginPath();c.arc(0,-.04,.56,-Math.PI*.2,Math.PI*.2);c.stroke();
    c.fillRect(-.4,.5,.8,.16);
  },
  ihbar(c){
    c.lineWidth=.12;rr(c,-.62,-.58,1.24,1.16,.1);c.stroke();
    [-.3,0,.3].forEach(x=>daire(c,x,-.26,.08));c.fillRect(-.4,.02,.8,.13);c.fillRect(-.4,.28,.5,.1);
  },
  siren(c){
    c.beginPath();c.moveTo(-.5,.32);c.quadraticCurveTo(-.5,-.55,0,-.55);c.quadraticCurveTo(.5,-.55,.5,.32);c.closePath();c.fill();
    c.fillRect(-.64,.3,1.28,.14);daire(c,0,.62,.1);daire(c,0,-.64,.08);
  },
  duman(c){
    c.lineWidth=.12;c.beginPath();c.arc(0,.1,.5,0,Math.PI*2);c.stroke();daire(c,0,.1,.16);
    [-150,-90,-30].forEach(d=>{const a=d*Math.PI/180;cizgi(c,[[Math.cos(a)*.66,.1+Math.sin(a)*.66],[Math.cos(a)*.82,.1+Math.sin(a)*.82]])});
  },
  yangin_kapisi(c,bg){
    c.lineWidth=.12;rr(c,-.44,-.72,.88,1.44,.06);c.stroke();
    c.save();c.translate(0,.1);alev(c,.4,bg);c.restore();
  },
  cikis(c,bg,aci){
    c.rotate((aci||0)*Math.PI/180);c.lineWidth=.2;ok(c,.62);
    c.lineWidth=.14;cizgi(c,[[.74,-.58],[.74,.58]]);
  },
  yangin_merdiveni(c){merdivenIc(c)},
  toplanma(c){
    c.lineWidth=.14;
    for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.translate(-.04,-.08);c.rotate(Math.PI/2);c.translate(-.74,0);c.beginPath();c.moveTo(0,0);c.lineTo(.5,0);c.stroke();c.beginPath();c.moveTo(.72,0);c.lineTo(.38,-.24);c.lineTo(.38,.24);c.closePath();c.fill();c.restore()}
  },
  ilkyardim(c){c.fillRect(-.17,-.56,.34,1.12);c.fillRect(-.56,-.17,1.12,.34)},
  aed(c,bg){
    c.beginPath();c.moveTo(0,.68);c.bezierCurveTo(-.85,.08,-.62,-.62,0,-.22);c.bezierCurveTo(.62,-.62,.85,.08,0,.68);c.closePath();c.fill();
    c.fillStyle=bg;dolgu(c,[[.1,-.3],[-.2,.12],[0,.12],[-.1,.5],[.22,0],[.02,0]]);
  },
  siginak(c,bg){
    dolgu(c,[[0,-.68],[.72,-.02],[.52,-.02],[.52,.62],[-.52,.62],[-.52,-.02],[-.72,-.02]]);
    c.fillStyle=bg;c.fillRect(-.14,.12,.28,.5);
  },
  pano(c){dolgu(c,[[.18,-.72],[-.4,.12],[-.04,.12],[-.2,.72],[.4,-.14],[.06,-.14]])},
  salter(c){
    c.lineWidth=.13;rr(c,-.46,-.7,.92,1.4,.1);c.stroke();
    c.lineWidth=.16;cizgi(c,[[0,.36],[.18,-.34]]);daire(c,.18,-.42,.13);daire(c,0,.4,.1);
  },
  dogalgaz(c,bg){alev(c,.95,bg)},
  kazan(c,bg){
    c.lineWidth=.14;rr(c,-.46,-.55,.92,1.05,.2);c.stroke();
    c.fillRect(-.12,-.78,.24,.22);c.fillRect(-.38,.5,.2,.22);c.fillRect(.18,.5,.2,.22);
    alev(c,.34,bg);
  },
  jenerator(c){
    c.lineWidth=.13;rr(c,-.7,-.42,1.4,.9,.12);c.stroke();
    dolgu(c,[[.1,-.3],[-.24,.1],[-.02,.1],[-.1,.4],[.24,-.06],[.02,-.06]]);
    c.fillRect(-.55,.46,.22,.18);c.fillRect(.33,.46,.22,.18);
  },
  kimyasal(c){
    c.lineWidth=.13;cizgi(c,[[-.2,-.7],[-.2,-.2],[-.68,.52],[.68,.52],[.2,-.2],[.2,-.7]]);cizgi(c,[[-.32,-.7],[.32,-.7]]);
    dolgu(c,[[-.44,.12],[.44,.12],[.68,.52],[-.68,.52]]);
  },
  asansor(c){
    c.lineWidth=.12;rr(c,-.62,-.72,1.24,1.44,.1);c.stroke();
    dolgu(c,[[-.24,-.5],[-.42,-.1],[-.06,-.1]]);dolgu(c,[[.24,.5],[.06,.1],[.42,.1]]);
  },
  merdiven(c){merdivenIc(c)},
  wc(c){c.save();c.scale(.01,.01);c.font='800 66px '+yazitipi();c.textAlign='center';c.textBaseline='middle';c.fillText('WC',0,4);c.restore()},
  engelli(c){
    daire(c,-.12,-.56,.12);c.lineWidth=.12;
    cizgi(c,[[-.12,-.32],[-.12,.12],[.28,.12],[.42,.5]]);cizgi(c,[[-.12,-.1],[.2,-.1]]);
    c.beginPath();c.arc(-.08,.26,.38,Math.PI*.25,Math.PI*1.5);c.stroke();
  },
  su(c){
    c.beginPath();c.moveTo(0,-.7);c.bezierCurveTo(.15,-.4,.55,.05,.55,.3);c.bezierCurveTo(.55,.62,.3,.78,0,.78);c.bezierCurveTo(-.3,.78,-.55,.62,-.55,.3);c.bezierCurveTo(-.55,.05,-.15,-.4,0,-.7);c.closePath();c.fill();
  }
};
/* Oda adı: beyaz zeminli, koyu çerçeveli yazı kutusu. s: boyut (yazı yüksekliği s/2) */
function etiketCiz(c,s,metin){
  const fs=s*.5,t=metin||'Oda adı';
  c.font='800 '+fs+'px '+yazitipi();c.textAlign='center';c.textBaseline='middle';
  const bw=c.measureText(t).width+fs*.9,bh=fs*1.6;
  rr(c,-bw/2,-bh/2,bw,bh,bh*.22);c.fillStyle='rgba(255,255,255,.94)';c.fill();c.lineWidth=fs*.09;c.strokeStyle='#111';c.stroke();
  c.fillStyle='#111';c.fillText(t,0,fs*.04);
}
function sembolCiz(c,tur,x,y,s,aci,metin){
  const sb=core().sembol(tur);if(!sb)return;
  const u=s/2;
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';
  if(sb.sekil==='yazi'){etiketCiz(c,s,metin);c.restore();return}
  let bg;
  if(sb.sekil==='ucgen'){ucgen(c,u);bg=sb.renk;c.fillStyle=c.strokeStyle='#111';c.translate(0,u*.24);c.scale(u*.62,u*.62)}
  else{rozet(c,s,sb.renk);bg=sb.renk;c.fillStyle=c.strokeStyle='#fff';c.scale(u,u)}
  if(IC[tur])IC[tur](c,bg,aci);
  c.restore();
}
/* Plandaki bir öğe: sembol + (varsa) altında etiketi. s: bu öğenin boyutu (genel boyut × kendi çarpanı) */
function ogeCiz(c,o,s){
  sembolCiz(c,o.tur,o.x,o.y,s,o.aci,o.not);
  if(o.tur==='etiket'||!o.not)return;
  const fs=s*.36;
  c.save();c.font='700 '+fs+'px '+yazitipi();c.textAlign='center';c.textBaseline='top';c.lineJoin='round';
  c.lineWidth=fs*.34;c.strokeStyle='rgba(255,255,255,.95)';c.strokeText(o.not,o.x,o.y+s*.5+fs*.12);
  c.fillStyle='#111';c.fillText(o.not,o.x,o.y+s*.5+fs*.12);c.restore();
}
/* "ŞU AN BURADASINIZ": kırmızı nokta + üstünde (sığmazsa altında) etiket */
function buradasinizCiz(c,x,y,sp,font){
  const K=core().RENK,r=sp*.46;
  c.save();c.lineJoin='round';
  c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=K.kirmizi;c.fill();
  c.lineWidth=sp*.08;c.strokeStyle='#fff';c.stroke();
  c.beginPath();c.arc(x,y,r*.42,0,Math.PI*2);c.fillStyle='#fff';c.fill();
  c.lineWidth=sp*.04;c.strokeStyle='rgba(0,0,0,.45)';c.beginPath();c.arc(x,y,r+sp*.04,0,Math.PI*2);c.stroke();
  const fs=sp*.5,txt='ŞU AN BURADASINIZ';
  c.font='800 '+fs+'px '+font;c.textAlign='center';c.textBaseline='middle';
  const tw=c.measureText(txt).width,bw=tw+fs*.9,bh=fs*1.55,ust=y-r-sp*.35-bh>=0,by=ust?y-r-sp*.3-bh:y+r+sp*.3;
  rr(c,x-bw/2,by,bw,bh,bh*.28);c.fillStyle=K.kirmizi;c.fill();c.lineWidth=sp*.05;c.strokeStyle='#fff';c.stroke();
  c.fillStyle='#fff';c.fillText(txt,x,by+bh/2+fs*.04);
  c.beginPath();c.moveTo(x-fs*.4,ust?by+bh:by);c.lineTo(x+fs*.4,ust?by+bh:by);c.lineTo(x,ust?y-r-sp*.04:y+r+sp*.04);c.closePath();c.fillStyle=K.kirmizi;c.fill();
  c.restore();
}
function yolCiz(c,k,y){
  const K=core().RENK,lw=core().yolKalinlik(k),p=y.noktalar;
  c.save();c.lineCap='round';c.lineJoin='round';
  c.lineWidth=lw*1.5;c.strokeStyle='#fff';c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();   /* beyaz zarf: altlık çizgileri üzerinde okunur */
  c.lineWidth=lw;c.strokeStyle=K.yol;c.beginPath();p.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();
  const boy=lw*2.9,gen=lw*2.5;
  core().okNoktalari(p,lw*16).forEach(o=>{
    c.save();c.translate(o.x,o.y);c.rotate(o.aci);if(o.uc)c.translate(-boy*.5,0);
    c.beginPath();c.moveTo(boy*.5,0);c.lineTo(-boy*.5,-gen*.5);c.lineTo(-boy*.5,gen*.5);c.closePath();
    c.fillStyle=K.yol;c.fill();c.lineWidth=lw*.22;c.strokeStyle='#fff';c.stroke();c.restore();
  });
  c.restore();
}
/* Model düzlemi. opt.bur: 'tum' (editör) | nokta sıra no | -1 (hiçbiri) */
function planCiz(c,k,resim,opt){
  opt=opt||{};const sp=core().sembolPx(k),font=yazitipi();
  c.save();
  c.fillStyle='#fff';c.fillRect(0,0,k.w,k.h);
  if(resim){try{c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(resim,0,0,k.w,k.h)}catch(_){}}
  else if(opt.izgara!==false){
    c.strokeStyle='#e5e7eb';c.lineWidth=Math.max(1,k.w/1200);const a=sp*3;
    for(let x=0;x<=k.w;x+=a){c.beginPath();c.moveTo(x,0);c.lineTo(x,k.h);c.stroke()}
    for(let y=0;y<=k.h;y+=a){c.beginPath();c.moveTo(0,y);c.lineTo(k.w,y);c.stroke()}
  }
  k.yollar.forEach(y=>yolCiz(c,k,y));
  k.ogeler.forEach(o=>ogeCiz(c,o,core().ogeBoyut(k,o)));
  k.buradasiniz.forEach((b,i)=>{if(opt.bur==='tum'||opt.bur===i)buradasinizCiz(c,b.x,b.y,sp*(b.boy||1),font)});
  c.restore();
}

/* ───────── tam sayfa ───────── */
function sigdirYazi(c,txt,maxW,px,agirlik,font){
  let f=px;c.font=agirlik+' '+f+'px '+font;
  while(f>px*.45&&c.measureText(txt).width>maxW){f-=px*.04;c.font=agirlik+' '+f+'px '+font}
  return f;
}
function lejantIkon(c,id,cx,cy,s){
  const K=core().RENK;
  if(id==='yol'){
    c.save();c.lineCap='round';c.lineWidth=s*.22;c.strokeStyle=K.yol;c.beginPath();c.moveTo(cx-s*.45,cy);c.lineTo(cx+s*.12,cy);c.stroke();
    c.beginPath();c.moveTo(cx+s*.5,cy);c.lineTo(cx+s*.06,cy-s*.3);c.lineTo(cx+s*.06,cy+s*.3);c.closePath();c.fillStyle=K.yol;c.fill();c.restore();
  }else if(id==='buradasiniz'){
    c.save();c.beginPath();c.arc(cx,cy,s*.4,0,Math.PI*2);c.fillStyle=K.kirmizi;c.fill();c.lineWidth=s*.07;c.strokeStyle='#fff';c.stroke();
    c.beginPath();c.arc(cx,cy,s*.17,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.restore();
  }else sembolCiz(c,id,cx,cy,s*.9,0);
}
/* Lejant yerleşimi: tüm satırlar tek yazı boyutuyla çizilir. Madde çoksa satır sayısı artırılır (3–6); yazı en büyük kalan seçenek alınır. */
function lejantDuzen(c,items,L,a4,font){
  const ust=a4?7.4:9,enBuyuk=a4?3.2:4,enIri=a4?6.6:8;
  c.save();c.font='600 100px '+font;
  const gen=Math.max(.01,...items.map(it=>c.measureText(it.ad).width/100));          /* 1 punto yazının en uzun maddedeki genişliği */
  c.restore();
  let en=null;
  for(let satir=3;satir<=6;satir++){
    const sat=(L.h-ust-1.5)/satir,ik=Math.min(sat*.82,enIri),kol=Math.max(1,Math.ceil(items.length/satir)),kw=(L.w-4)/kol;
    const fs=Math.min(sat*.5,enBuyuk,(kw-ik-4)/gen);
    if(!en||fs>en.fs+.05)en={satir,sat,ik,kw,fs,ust};
    if(items.length<=satir)break;
  }
  return en;
}
/* kat: normalleştirilmiş kat; resim: altlık görüntüsü ya da null; i: nokta sırası (-1: noktasız)
   o: {boyut:'A3'|'A4', ppm: milimetre başına piksel} */
function sayfaCiz(kat,resim,ayar,i,o){
  o=o||{};const C=core(),d=C.sayfaDuzen(o.boyut),ppm=o.ppm>0?o.ppm:6,font=yazitipi();
  const cv=document.createElement('canvas');cv.width=Math.round(d.w*ppm);cv.height=Math.round(d.h*ppm);
  const c=cv.getContext('2d');c.scale(ppm,ppm);                       /* bundan sonrası milimetre */
  c.fillStyle='#fff';c.fillRect(0,0,d.w,d.h);c.textBaseline='middle';
  /* başlık bandı */
  const katAd=upper(kat.ad),katW=d.boyut==='A4'?52:70;
  c.textAlign='left';c.fillStyle='#111';
  const f1=sigdirYazi(c,upper(ayar.baslik),d.w-katW-8,d.ust*.46,800,font);c.fillText(upper(ayar.baslik),0,d.ust*.33);
  const okul=upper(ayar.okulAdi);if(okul){sigdirYazi(c,okul,d.w-katW-8,d.ust*.27,600,font);c.fillStyle='#374151';c.fillText(okul,0,d.ust*.76)}
  rr(c,d.w-katW,0,katW,d.ust,d.ust*.16);c.fillStyle=C.RENK.yesil;c.fill();
  c.fillStyle='#fff';c.textAlign='center';sigdirYazi(c,katAd,katW-6,d.ust*.5,800,font);c.fillText(katAd,d.w-katW/2,d.ust/2+.2);
  c.strokeStyle='#111';c.lineWidth=.35;c.beginPath();c.moveTo(0,d.ust+d.bosluk*.4);c.lineTo(d.w,d.ust+d.bosluk*.4);c.stroke();
  /* plan alanı */
  const P=d.plan,f=C.fitRect(kat.w,kat.h,P);
  c.strokeStyle='#9ca3af';c.lineWidth=.3;c.strokeRect(P.x,P.y,P.w,P.h);
  c.save();c.beginPath();c.rect(P.x,P.y,P.w,P.h);c.clip();c.translate(f.x,f.y);c.scale(f.s,f.s);
  planCiz(c,kat,resim,{bur:i,izgara:false});c.restore();
  /* lejant */
  const L=d.lejant,items=C.lejant(kat),a4=d.boyut==='A4';
  c.strokeStyle='#111';c.lineWidth=.35;c.strokeRect(L.x,L.y,L.w,L.h);
  c.fillStyle='#111';c.textAlign='left';c.font='800 '+(a4?3.4:4.2)+'px '+font;c.fillText('LEJANT',L.x+3,L.y+(a4?3.8:4.6));
  const lz=lejantDuzen(c,items,L,a4,font);
  items.forEach((it,n)=>{
    const col=Math.floor(n/lz.satir),row=n%lz.satir,cx=L.x+2+col*lz.kw+lz.ik/2+1,cy=L.y+lz.ust+row*lz.sat+lz.sat/2;
    lejantIkon(c,it.id,cx,cy,lz.ik);
    c.fillStyle='#111';c.textAlign='left';c.font='600 '+lz.fs+'px '+font;c.fillText(it.ad,cx+lz.ik/2+1.6,cy+.1);
  });
  if(!items.length){c.fillStyle='#6b7280';c.font='500 '+(a4?3:3.6)+'px '+font;c.fillText('Henüz işaret konulmadı',L.x+3,L.y+L.h/2+2)}
  /* onay bloğu */
  const A=d.onay;c.strokeStyle='#111';c.lineWidth=.35;c.strokeRect(A.x,A.y,A.w,A.h);
  c.textAlign='center';const cxm=A.x+A.w/2,k=d.boyut==='A4'?.8:1;
  c.fillStyle='#111';c.font='800 '+(6.4*k)+'px '+font;c.fillText('UYGUNDUR',cxm,A.y+5.4*k+1);
  c.font='600 '+(3.8*k)+'px '+font;c.fillText(ayar.onayTarih||'',cxm,A.y+11.4*k+1);
  c.strokeStyle='#9ca3af';c.lineWidth=.2;c.beginPath();c.moveTo(A.x+6,A.y+A.h-11*k-1);c.lineTo(A.x+A.w-6,A.y+A.h-11*k-1);c.stroke();
  c.fillStyle='#111';sigdirYazi(c,ayar.onayAd||'',A.w-6,4.4*k,800,font);c.fillText(ayar.onayAd||'',cxm,A.y+A.h-7*k-.4);
  c.fillStyle='#374151';sigdirYazi(c,ayar.onayUnvan||'',A.w-6,3.6*k,500,font);c.fillText(ayar.onayUnvan||'',cxm,A.y+A.h-3*k-.4);
  void f1;
  return cv;
}

/* ───────── çıktı ───────── */
const blobYap=(c,tur,kalite)=>new Promise(ok=>c.toBlob(b=>ok(b),tur,kalite));
/* MEBBİS vb. için: JPEG, hedef bayta kadar kalite ve boyut düşürülerek. Dönüş: {blob,w,h,kalite,bayt} */
async function jpegSigdir(cv,hedef){
  hedef=hedef||150*1024;
  const olcekler=[1,.9,.8,.7,.6,.5],kaliteler=[.92,.85,.78,.7,.62,.55,.48,.4];
  let son=null;
  for(const k of olcekler){
    let c=cv;
    if(k<1){c=document.createElement('canvas');c.width=Math.round(cv.width*k);c.height=Math.round(cv.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.imageSmoothingQuality='high';x.drawImage(cv,0,0,c.width,c.height)}
    for(const q of kaliteler){
      const b=await blobYap(c,'image/jpeg',q);
      if(!b)continue;
      son={blob:b,w:c.width,h:c.height,kalite:q,bayt:b.size};
      if(b.size<=hedef)return son;
    }
  }
  return son;
}
async function jsPdfHazir(){
  if(global.jspdf?.jsPDF)return global.jspdf.jsPDF;
  if(!global.AppLoader?.loadScript)throw new Error('PDF kütüphanesi yükleyicisi hazır değil.');
  await global.AppLoader.loadScript(JSPDF_SRC);
  if(!global.jspdf?.jsPDF)throw new Error('PDF kütüphanesi yüklenemedi.');
  return global.jspdf.jsPDF;
}
/* Sayfaları (içerik kutusu boyutunda tuvaller) kenar boşluklu A3/A4 yatay PDF'e dizer. Bellek için sayfa sayfa üretilir:
   uret(i) tuval ya da tuval veren söz döndürür. Dönüş: Blob */
async function pdfYap(adet,uret,boyut,ilerleme){
  if(!(adet>0))throw new Error('Çıktı için sayfa yok.');
  const jsPDF=await jsPdfHazir(),d=core().sayfaDuzen(boyut),fmt=d.boyut==='A4'?'a4':'a3';
  const pdf=new jsPDF({unit:'mm',format:fmt,orientation:'l',compress:true});
  for(let i=0;i<adet;i++){
    const cv=await uret(i);
    if(i)pdf.addPage(fmt,'l');
    pdf.addImage(cv.toDataURL('image/jpeg',.93),'JPEG',d.m,d.m,d.w,d.h,undefined,'FAST');
    if(ilerleme)ilerleme(i+1,adet);
    await new Promise(r=>setTimeout(r,0));
  }
  return pdf.output('blob');
}
/* ReportEngine.printReport gövdesi: her sayfa bir A4 yatay tabaka (kenar boşluğu @page/akış tarafından verilir). */
async function yazdirGovde(adet,uret){
  const h=[];
  for(let i=0;i<adet;i++){const cv=await uret(i);h.push(`<div class="kpl-sayfa"><img class="kpl-gorsel" alt="Tahliye planı ${i+1}" src="${cv.toDataURL('image/jpeg',.9)}"></div>`);await new Promise(r=>setTimeout(r,0))}
  return'<section class="kpl-form">'+h.join('')+'</section>';
}
/* dataURL → HTMLImageElement */
function resimYukle(veri){
  return new Promise((ok,no)=>{if(!veri){ok(null);return}const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('Altlık görüntüsü okunamadı.'));im.src=veri});
}

global.KatPlaniCizim={sembolCiz,ogeCiz,metinGenislik,buradasinizCiz,yolCiz,planCiz,sayfaCiz,jpegSigdir,pdfYap,yazdirGovde,resimYukle,yazitipi,rr};
})(typeof window!=='undefined'?window:globalThis);
