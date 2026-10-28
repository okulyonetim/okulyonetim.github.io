/* Koruk Asistan — Kat Planı · sayfa ve çıktı
 * Tek çizim yolu: editör ekranı, önizleme, JPEG, PDF ve yazdırma AYNI fonksiyonlarla çizilir (ekranda gördüğünüz çıktıdır).
 * Semboller ve çizgi/alan türleri kat-plani-simge.js'dedir; burada onları bir araya getiren sayfa ve çıktı biçimleri vardır.
 *   planCiz(ctx,kat,resim,opt)   model düzleminde: altlık + alanlar + plan çizgileri + güzergâhlar + semboller + "şu an buradasınız"
 *   sayfaCiz(kat,resim,ayar,i,o) başlıklı, lejantlı, onay bloklu tam sayfa tuvali (A3/A4 yatay içerik kutusu)
 *   jpegSigdir / pdfYap / yazdirGovde: çıktı biçimleri (sayfalar tek tek üretilir). Sayfa kenar boşluğu (10 mm) PDF ve yazdırmada sayfaya konurken eklenir.
 */
(function(global){
'use strict';
if(global.KatPlaniCizim)return;
const core=()=>global.KatPlaniCore,G=()=>global.KatPlaniSimge;
const JSPDF_SRC='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const upper=s=>String(s||'').toLocaleUpperCase('tr-TR');
const rr=(...a)=>G().rr(...a),yazitipi=()=>G().yazitipi();

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
/* Çizim sırası: alanlar (en altta) → plan çizgileri → güzergâhlar; semboller ve "buradasınız" üstte */
const YOL_SIRA=['alan','plan','guzergah'];
function yollariCiz(c,k){
  const C=core();
  YOL_SIRA.forEach(g=>k.yollar.forEach(y=>{if(C.yolStil(y.tur).grup===g)G().yolCizLw(c,y,C.yolKalinlik(k,y))}));
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
  yollariCiz(c,k);
  k.ogeler.forEach(o=>G().ogeCiz(c,o,core().ogeBoyut(k,o)));
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
  if(id.startsWith('yol:'))G().yolOrnek(c,id.slice(4),cx,cy,s*.95,s*.62);
  else if(id==='buradasiniz'){
    c.save();c.beginPath();c.arc(cx,cy,s*.4,0,Math.PI*2);c.fillStyle=K.kirmizi;c.fill();c.lineWidth=s*.07;c.strokeStyle='#fff';c.stroke();
    c.beginPath();c.arc(cx,cy,s*.17,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.restore();
  }else G().sembolCiz(c,id,cx,cy,s*.9,0);
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

global.KatPlaniCizim={buradasinizCiz,planCiz,sayfaCiz,jpegSigdir,pdfYap,yazdirGovde,resimYukle};
})(typeof window!=='undefined'?window:globalThis);
