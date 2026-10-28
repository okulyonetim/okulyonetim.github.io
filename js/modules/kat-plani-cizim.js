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
function yazitipi(){try{return getComputedStyle(document.documentElement).getPropertyValue('--ka-font').trim()||'system-ui,"Segoe UI",sans-serif'}catch(_){return'system-ui,"Segoe UI",sans-serif'}}
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

/* ───────── semboller (model birimi; s = kenar uzunluğu) ───────── */
function rozet(c,s,renk){
  rr(c,-s/2,-s/2,s,s,s*.14);c.fillStyle=renk;c.fill();
  c.lineWidth=s*.05;c.strokeStyle='rgba(0,0,0,.45)';c.stroke();
}
function ok(c,u,boy){                       /* sağa bakan ok; u = yarım kenar */
  c.beginPath();c.moveTo(-boy,0);c.lineTo(boy*.55,0);c.stroke();
  c.beginPath();c.moveTo(boy,0);c.lineTo(boy*.25,-u*.34);c.lineTo(boy*.25,u*.34);c.closePath();c.fill();
}
function sembolCiz(c,tur,x,y,s,aci){
  const u=s/2,K=core().RENK;
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';
  if(tur==='pano'){                         /* sarı üzerine koyu işaret */
    c.beginPath();c.moveTo(0,-u*1.0);c.lineTo(u*1.02,u*.82);c.lineTo(-u*1.02,u*.82);c.closePath();
    c.fillStyle=K.sari;c.fill();c.lineWidth=u*.14;c.strokeStyle='#111';c.stroke();
    c.beginPath();c.moveTo(u*.12,-u*.5);c.lineTo(-u*.34,u*.1);c.lineTo(-u*.02,u*.1);c.lineTo(-u*.14,u*.62);c.lineTo(u*.36,-u*.1);c.lineTo(u*.04,-u*.1);c.closePath();
    c.fillStyle='#111';c.fill();
  }else{
    const sb=core().sembol(tur);rozet(c,s,sb?sb.renk:K.gri);
    c.fillStyle='#fff';c.strokeStyle='#fff';
    if(tur==='sondurucu'){
      rr(c,-u*.34,-u*.02,u*.68,u*.86,u*.12);c.fill();
      c.fillRect(-u*.12,-u*.34,u*.24,u*.34);
      c.lineWidth=u*.14;c.beginPath();c.moveTo(-u*.12,-u*.36);c.lineTo(u*.3,-u*.42);c.stroke();
      c.lineWidth=u*.1;c.beginPath();c.moveTo(u*.3,-u*.42);c.quadraticCurveTo(u*.62,-u*.1,u*.5,u*.3);c.stroke();
    }else if(tur==='hortum'){
      c.lineWidth=u*.16;c.beginPath();c.arc(0,-u*.08,u*.5,0,Math.PI*2);c.stroke();
      c.beginPath();c.arc(0,-u*.08,u*.16,0,Math.PI*2);c.fill();
      c.lineWidth=u*.1;c.beginPath();c.moveTo(u*.36,u*.28);c.quadraticCurveTo(u*.7,u*.56,u*.2,u*.7);c.stroke();
    }else if(tur==='alarm'){
      c.beginPath();c.arc(0,-u*.04,u*.3,0,Math.PI*2);c.fill();
      c.lineWidth=u*.12;
      c.beginPath();c.arc(0,-u*.04,u*.56,Math.PI*.8,Math.PI*1.2);c.stroke();
      c.beginPath();c.arc(0,-u*.04,u*.56,-Math.PI*.2,Math.PI*.2);c.stroke();
      c.fillRect(-u*.4,u*.5,u*.8,u*.16);
    }else if(tur==='ilkyardim'){
      c.fillRect(-u*.17,-u*.56,u*.34,u*1.12);c.fillRect(-u*.56,-u*.17,u*1.12,u*.34);
    }else if(tur==='cikis'){
      c.rotate((aci||0)*Math.PI/180);c.lineWidth=u*.2;ok(c,u,u*.62);
      c.lineWidth=u*.14;c.beginPath();c.moveTo(u*.74,-u*.58);c.lineTo(u*.74,u*.58);c.stroke();
    }else if(tur==='toplanma'){
      c.lineWidth=u*.14;
      for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.translate(-u*.04,-u*.08);c.rotate(Math.PI/2);c.translate(-u*.74,0);c.beginPath();c.moveTo(0,0);c.lineTo(u*.5,0);c.stroke();c.beginPath();c.moveTo(u*.72,0);c.lineTo(u*.38,-u*.24);c.lineTo(u*.38,u*.24);c.closePath();c.fill();c.restore()}
    }
  }
  c.restore();
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
  k.ogeler.forEach(o=>sembolCiz(c,o.tur,o.x,o.y,sp,o.aci));
  k.buradasiniz.forEach((b,i)=>{if(opt.bur==='tum'||opt.bur===i)buradasinizCiz(c,b.x,b.y,sp,font)});
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
  const L=d.lejant,items=C.lejant(kat);
  c.strokeStyle='#111';c.lineWidth=.35;c.strokeRect(L.x,L.y,L.w,L.h);
  c.fillStyle='#111';c.textAlign='left';c.font='800 '+(d.boyut==='A4'?3.4:4.2)+'px '+font;c.fillText('LEJANT',L.x+3,L.y+(d.boyut==='A4'?3.8:4.6));
  const ust=(d.boyut==='A4'?7.4:9),satir=3,sat=(L.h-ust-1.5)/satir,kol=Math.max(1,Math.ceil(items.length/satir)),kw=(L.w-4)/kol,ik=Math.min(sat*.82,d.boyut==='A4'?6.6:8);
  items.forEach((it,n)=>{
    const col=Math.floor(n/satir),row=n%satir,cx=L.x+2+col*kw+ik/2+1,cy=L.y+ust+row*sat+sat/2;
    lejantIkon(c,it.id,cx,cy,ik);
    c.fillStyle='#111';c.textAlign='left';const fs=sigdirYazi(c,it.ad,kw-ik-4,Math.min(sat*.5,d.boyut==='A4'?3.2:4),600,font);void fs;c.fillText(it.ad,cx+ik/2+1.6,cy+.1);
  });
  if(!items.length){c.fillStyle='#6b7280';c.font='500 '+(d.boyut==='A4'?3:3.6)+'px '+font;c.fillText('Henüz işaret konulmadı',L.x+3,L.y+L.h/2+2)}
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

global.KatPlaniCizim={sembolCiz,buradasinizCiz,yolCiz,planCiz,sayfaCiz,jpegSigdir,pdfYap,yazdirGovde,resimYukle,yazitipi,rr};
})(typeof window!=='undefined'?window:globalThis);
