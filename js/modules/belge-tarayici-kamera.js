/* Koruk Asistan — Belge Tarayıcı › canlı kamera
 * getUserMedia ile arka kamerayı açar; küçültülmüş karelerde belge köşelerini sürekli arar (BelgeTarayiciCore.kenarBul, hızlı kip),
 * köşeler kıpırdamadan durduğunda "kararlı" süresini bildirir (otomatik çekim için), fener ve kare yakalama sağlar.
 * Görünüm ve düğmeler belge-tarayici.js'tedir; bu dosya yalnız kamera akışını yönetir.
 */
(function(global){
'use strict';
if(global.BelgeTarayiciKamera)return;
const D=typeof document!=='undefined'?document:null;
const DESTEK=()=>!!(global.navigator&&navigator.mediaDevices&&typeof navigator.mediaDevices.getUserMedia==='function');
const BEKLE=ms=>new Promise(r=>setTimeout(r,ms));
const sinirla=(v,a,b)=>v<a?a:v>b?b:v;

function hataKodu(e){
  const ad=String(e&&e.name||'');
  if(ad==='NotAllowedError'||ad==='SecurityError'||ad==='PermissionDeniedError')return'izin';
  if(ad==='NotFoundError'||ad==='DevicesNotFoundError'||ad==='OverconstrainedError')return'yok';
  if(ad==='NotReadableError'||ad==='TrackStartError'||ad==='AbortError')return'mesgul';
  return'bilinmeyen';
}
const MESAJ={izin:'Kamera izni verilmedi.',yok:'Bu cihazda kamera bulunamadı.',mesgul:'Kamera başka bir uygulama tarafından kullanılıyor.',bilinmeyen:'Kamera açılamadı.'};

/** Köşe kümeleri arasındaki en büyük kayma (0..1 normalleştirilmiş). */
function kayma(a,b){
  if(!a||!b)return 1;let m=0;
  for(let i=0;i<4;i++)m=Math.max(m,Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y));
  return m;
}

/**
 * ac(video, {onDurum, onBitti}) → denetleyici
 * onDurum({koseler|null, guven, kararliMs}) her algılama turunda çağrılır.
 */
async function ac(video,opts){
  opts=opts||{};
  if(!DESTEK())throw Object.assign(new Error('Bu tarayıcı kamera erişimini desteklemiyor.'),{kod:'yok'});
  let akis=null;
  const istekler=[
    {audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1440}}},
    {audio:false,video:{facingMode:{ideal:'environment'}}},
    {audio:false,video:true}
  ];
  let son=null;
  for(const c of istekler){
    try{akis=await navigator.mediaDevices.getUserMedia(c);break}
    catch(e){son=e;if(hataKodu(e)==='izin')break}
  }
  if(!akis){const k=hataKodu(son);throw Object.assign(new Error(MESAJ[k]),{kod:k})}
  const iz=akis.getVideoTracks()[0];
  video.muted=true;video.setAttribute('playsinline','');video.setAttribute('muted','');
  video.srcObject=akis;
  try{await video.play()}catch(_){}
  for(let i=0;i<40&&!(video.videoWidth>0);i++)await BEKLE(50);

  const kucuk=D.createElement('canvas'),kx=kucuk.getContext('2d',{willReadFrequently:true});
  let durdu=false,zamanlayici=0,onceki=null,kararliBas=0,fener=false;
  const yet=(()=>{try{return iz.getCapabilities?iz.getCapabilities():{}}catch(_){return{}}})();

  function tur(){
    if(durdu)return;
    let sonuc={koseler:null,guven:0,kararliMs:0};
    try{
      const vw=video.videoWidth,vh=video.videoHeight;
      if(vw>0&&vh>0&&video.readyState>=2&&global.BelgeTarayiciCore){
        const k=160/Math.max(vw,vh);
        kucuk.width=Math.max(8,Math.round(vw*k));kucuk.height=Math.max(8,Math.round(vh*k));
        kx.drawImage(video,0,0,kucuk.width,kucuk.height);
        const r=global.BelgeTarayiciCore.kenarBul(kx.getImageData(0,0,kucuk.width,kucuk.height),{hizli:true});
        if(r&&r.guven>=.3){
          const durgun=kayma(onceki,r.koseler)<.025;
          if(durgun){if(!kararliBas)kararliBas=performance.now()}else kararliBas=0;
          onceki=r.koseler;
          sonuc={koseler:r.koseler,guven:r.guven,kararliMs:kararliBas?performance.now()-kararliBas:0};
        }else{onceki=null;kararliBas=0}
      }
    }catch(_){onceki=null;kararliBas=0}
    try{opts.onDurum&&opts.onDurum(sonuc)}catch(_){}
    zamanlayici=setTimeout(tur,260);
  }
  zamanlayici=setTimeout(tur,200);
  iz.addEventListener('ended',()=>{if(!durdu&&opts.onBitti)opts.onBitti()});

  return{
    fenerVar:!!yet.torch,
    /** Tam çözünürlüklü kare (canvas). */
    cek(){
      const w=video.videoWidth,h=video.videoHeight;
      if(!(w>0&&h>0))throw new Error('Kamera görüntüsü henüz hazır değil.');
      const c=D.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(video,0,0,w,h);return c;
    },
    async fener(ac_){
      if(!yet.torch)return false;
      try{await iz.applyConstraints({advanced:[{torch:!!ac_}]});fener=!!ac_;return fener}catch(_){return false}
    },
    get fenerAcik(){return fener},
    boyut(){return{w:video.videoWidth,h:video.videoHeight}},
    canli(){return!durdu&&iz.readyState==='live'},
    durdur(){
      durdu=true;clearTimeout(zamanlayici);
      try{akis.getTracks().forEach(t=>t.stop())}catch(_){}
      try{video.pause()}catch(_){}
      try{video.srcObject=null}catch(_){}
    }
  };
}

const API={destek:DESTEK,ac,hataKodu,MESAJ,_t:{kayma}};
global.BelgeTarayiciKamera=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
