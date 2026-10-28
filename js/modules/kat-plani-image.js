/* Koruk Asistan — Kat Planı · altlık (kat projesi) hazırlama
 * Kat projesinin görüntüsünü ya da PDF sayfasını alır; kırpar; "Sadeleştir" ile tahliye planına uygun hale getirir:
 *   koyu zeminli CAD çıktısı → beyaz zemin, açık gri çizgi; renk süzgeciyle yalnız duvar (sarı/beyaz) çizgileri; silikleştirme; kalınlaştırma.
 * Sonuç, Firestore doküman sınırına (1 MiB) sığması için sıkıştırılır (16 gri seviye PNG ya da JPEG).
 * pikselIsle saf bir fonksiyondur (tuval gerektirmez) ve testlenir.
 */
(function(global){
'use strict';
if(global.KatPlaniImage)return;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const MAX_EDGE=3200;                    /* çalışma tuvalinin en uzun kenarı */
const SAKLA_KENAR=2400;                 /* kayıtlı altlığın en uzun kenarı (üst sınır) */
const HEDEF_BAYT=520*1024;              /* base64 ile ~700 KB: 1 MiB belge sınırının altında */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const VARSAYILAN={mod:'auto',renk:'tum',esik:14,silik:35,kalin:1};
function secenek(o){
  o=o||{};
  return{mod:['auto','koyu','acik'].includes(o.mod)?o.mod:'auto',renk:o.renk==='duvar'?'duvar':'tum',
    esik:clamp(num(o.esik,VARSAYILAN.esik),0,80),silik:clamp(num(o.silik,VARSAYILAN.silik),0,90),kalin:Math.round(clamp(num(o.kalin,VARSAYILAN.kalin),0,3))};
}

/* Zemin koyu mu? Örneklenen piksellerin ortancası (parlaklık) 110'un altındaysa koyu. */
function zeminKoyuMu(d,w,h){
  const hist=new Uint32Array(256);let n=0;
  const adim=Math.max(1,Math.floor(Math.sqrt(w*h/40000)));
  for(let y=0;y<h;y+=adim)for(let x=0;x<w;x+=adim){const i=(y*w+x)*4;hist[Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2])]++;n++}
  let acc=0;for(let v=0;v<256;v++){acc+=hist[v];if(acc>=n/2)return v<110}
  return false;
}
/* 3×3 en büyük değer süzgeci (ayrılabilir): çizgileri 1 piksel kalınlaştırır */
function genislet(ink,w,h){
  const tmp=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const o=y*w;for(let x=0;x<w;x++){let m=ink[o+x];if(x>0&&ink[o+x-1]>m)m=ink[o+x-1];if(x<w-1&&ink[o+x+1]>m)m=ink[o+x+1];tmp[o+x]=m}}
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){let m=tmp[y*w+x];if(y>0&&tmp[(y-1)*w+x]>m)m=tmp[(y-1)*w+x];if(y<h-1&&tmp[(y+1)*w+x]>m)m=tmp[(y+1)*w+x];ink[y*w+x]=m}}
}
/* RGBA verisini yerinde gri tonlu, beyaz zeminli çizim yapar. Dönüş: {koyuZemin} */
function pikselIsle(d,w,h,o){
  o=secenek(o);
  const koyu=o.mod==='koyu'||(o.mod==='auto'&&zeminKoyuMu(d,w,h));
  const n=w*h,ink=new Uint8Array(n),t=o.esik/100*255,span=Math.max(1,255-t);
  for(let p=0,i=0;p<n;p++,i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];let v;
    if(koyu){
      if(o.renk==='duvar'&&!(r>=130&&g>=110))v=0;           /* sarı / beyaz / turuncu: duvar; kırmızı, mavi, yeşil, macenta elenir */
      else v=Math.max(r,g,b);
    }else v=255-Math.round(.299*r+.587*g+.114*b);
    ink[p]=v<=t?0:Math.round((v-t)/span*255);
  }
  for(let k=0;k<o.kalin;k++)genislet(ink,w,h);
  const koyuCizgi=40+o.silik/100*160;                         /* en koyu çizgi gri düzeyi */
  for(let p=0,i=0;p<n;p++,i+=4){
    let out=255-ink[p]/255*(255-koyuCizgi);
    out=Math.round(out/17)*17;                                /* 16 gri seviye: PNG çok küçülür */
    d[i]=d[i+1]=d[i+2]=out;d[i+3]=255;
  }
  return{koyuZemin:koyu};
}
/* İçerik sınırı: beyaz olmayan piksellerin kutusu (işlenmiş görüntüde), {x,y,w,h} ya da null */
function icerikKutusu(d,w,h,pay){
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(d[(y*w+x)*4]<238){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(x1<0)return null;
  pay=Math.round(pay??Math.max(w,h)*.01);
  x0=Math.max(0,x0-pay);y0=Math.max(0,y0-pay);x1=Math.min(w-1,x1+pay);y1=Math.min(h-1,y1+pay);
  return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}

/* ───────── tuval işleri ───────── */
const tuval=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
function kucult(src,kenar){
  const k=Math.min(1,kenar/Math.max(src.width,src.height));
  if(k>=1)return src;
  const c=tuval(src.width*k,src.height*k),x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;
}
function kirp(src,r){
  const x=clamp(Math.round(r.x),0,src.width-1),y=clamp(Math.round(r.y),0,src.height-1),w=clamp(Math.round(r.w),1,src.width-x),h=clamp(Math.round(r.h),1,src.height-y);
  const c=tuval(w,h);c.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);return c;
}
/* Sadeleştirilmiş kopya üretir (kaynağı değiştirmez) */
function sadelestir(src,o){
  const c=tuval(src.width,src.height),x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(src,0,0);
  const im=x.getImageData(0,0,c.width,c.height),r=pikselIsle(im.data,c.width,c.height,o);
  x.putImageData(im,0,0);
  return{canvas:c,koyuZemin:r.koyuZemin};
}
const blobYap=(c,tur,kalite)=>new Promise(ok=>c.toBlob(b=>ok(b),tur,kalite));
const blobDataUrl=b=>new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result||''));fr.onerror=()=>no(new Error('okunamadı'));fr.readAsDataURL(b)});
/* En büyük kenar ve biçim düşürülerek hedef bayta sığdırılır: {veri(dataURL), w, h, bayt, tur} */
async function sikistir(src,hedef){
  hedef=hedef||HEDEF_BAYT;
  const adaylar=[[SAKLA_KENAR,'png'],[SAKLA_KENAR,'jpeg',.9],[2000,'png'],[2000,'jpeg',.85],[1600,'png'],[1600,'jpeg',.8],[1200,'jpeg',.75],[900,'jpeg',.7]];
  let son=null;
  for(const [kenar,tur,kal] of adaylar){
    const c=kucult(src,kenar),b=await blobYap(c,'image/'+tur,kal);
    if(!b)continue;
    son={blob:b,w:c.width,h:c.height,bayt:b.size,tur};
    if(b.size<=hedef)break;
  }
  if(!son)throw new Error('Görüntü sıkıştırılamadı.');
  son.veri=await blobDataUrl(son.blob);delete son.blob;
  return son;
}

/* ───────── kaynak okuma (görsel / PDF) ───────── */
function scriptYukle(src,test){
  if(test())return Promise.resolve();
  if(global.AppLoader?.loadScript)return Promise.resolve(global.AppLoader.loadScript(src)).then(()=>{if(!test())throw new Error('PDF kütüphanesi yüklenemedi.')});
  return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=()=>test()?ok():no(new Error('PDF kütüphanesi yüklenemedi.'));s.onerror=()=>no(new Error('PDF kütüphanesi indirilemedi.'));document.head.appendChild(s)});
}
async function pdfAc(file){
  await scriptYukle(PDFJS,()=>typeof global.pdfjsLib!=='undefined');
  global.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
  const buf=await file.arrayBuffer();
  return global.pdfjsLib.getDocument({data:buf}).promise;
}
async function pdfSayfa(pdf,no){
  const page=await pdf.getPage(clamp(no,1,pdf.numPages)),v1=page.getViewport({scale:1});
  const scale=clamp(MAX_EDGE/Math.max(v1.width,v1.height),.5,6),vp=page.getViewport({scale}),c=tuval(vp.width,vp.height),x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:x,viewport:vp,background:'#ffffff'}).promise;
  return c;
}
async function gorselAc(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Görsel okunamadı.'));i.src=url});
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(!w||!h)throw new Error('Görsel boyutları okunamadı.');
    const c=tuval(w,h);c.getContext('2d').drawImage(img,0,0);return kucult(c,MAX_EDGE);
  }finally{URL.revokeObjectURL(url)}
}
/* Dosyayı açar. Dönüş: {canvas, sayfaSayisi, pdf} — PDF'te sayfa değiştirmek için pdfSayfa(pdf,no) kullanılır. */
async function dosyaAc(file){
  if(!file)throw new Error('Dosya seçilmedi.');
  const ad=String(file.name||'').toLowerCase(),tur=String(file.type||'').toLowerCase();
  if(tur==='application/pdf'||ad.endsWith('.pdf')){
    const pdf=await pdfAc(file);
    return{canvas:await pdfSayfa(pdf,1),sayfaSayisi:pdf.numPages,pdf};
  }
  if(/^image\//.test(tur)||/\.(png|jpe?g|webp|bmp)$/.test(ad))return{canvas:await gorselAc(file),sayfaSayisi:1,pdf:null};
  throw new Error('PDF, PNG, JPG veya WEBP dosyası seçin.');
}

global.KatPlaniImage={VARSAYILAN,HEDEF_BAYT,SAKLA_KENAR,secenek,pikselIsle,icerikKutusu,zeminKoyuMu,tuval,kucult,kirp,sadelestir,sikistir,dosyaAc,pdfSayfa};
if(typeof module!=='undefined'&&module.exports)module.exports=global.KatPlaniImage;
})(typeof window!=='undefined'?window:globalThis);
