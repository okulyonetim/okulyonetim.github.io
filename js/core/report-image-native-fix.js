/* Koruk Asistan — rapor PNG indirme/paylaşma köprüsü.
 * Rapor önizlemesindeki "Görsel" ve "Paylaş" düğmelerini (web, PWA ve Android APK) tek yerden yönetir:
 * raporu (iframe#kaReportFrame) html2canvas ile PNG'ye çizer; Android'de SavePlugin (uygulamaDosyaKaydet), tarayıcıda
 * Web Share / indirme kullanır. html2canvas önce uygulama içindeki yerel kopyadan, olmazsa CDN'den yüklenir
 * (okul ağlarında CDN engelli olabilir). Sonuç ve hata her zaman toast ile gösterilir. */
(function(global){
'use strict';
if(global.KAReportImageNativeFix)return;
const H2C_LOCAL='assets/vendor/html2canvas.min.js?v=1';
const H2C_CDN='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
// ~300 dpi A4 (2480x3508 ≈ 8,7 MP). Telefon WebView'inde daha büyük PNG tuvali belleği aşabilir; başarısız olursa ölçek kademeli düşer.
const MAX_SIDE=8192,MAX_AREA=9e6,MAX_SCALE=4,MIN_SCALE=1,RENDER_TIMEOUT=70000;
const clean=v=>(String(v||'Koruk_Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||'Koruk_Rapor');
const say=(msg,tur)=>{try{global.toast?.(msg,tur?{tur}:undefined)}catch(_){}};
const errText=e=>{const m=e&&typeof e==='object'?(e.message||e.errorMessage||''):String(e||'');return m&&m!=='[object Event]'?m:'bilinmeyen hata'};
const withTimeout=(promise,ms,msg)=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error(msg)),ms);Promise.resolve(promise).then(v=>{clearTimeout(t);ok(v)},e=>{clearTimeout(t);no(e)})});

function injectScript(win,src,msg){
 return new Promise((resolve,reject)=>{
  const d=win?.document;if(!d?.head)return reject(new Error('Görsel alanı hazır değil.'));
  const s=d.createElement('script');s.src=src;s.async=true;
  s.onload=()=>win.html2canvas?resolve(win.html2canvas):reject(new Error(msg));
  s.onerror=()=>reject(new Error(msg));
  d.head.appendChild(s);
 });
}
async function loadH2C(win){
 if(win?.html2canvas)return win.html2canvas;
 const local=new URL(H2C_LOCAL,global.document.baseURI).href;
 try{return await withTimeout(injectScript(win,local,'Yerel görsel motoru yüklenemedi.'),20000,'Yerel görsel motoru zaman aşımına uğradı.')}
 catch(localErr){
  console.warn('[ReportImage] yerel html2canvas yüklenemedi, CDN deneniyor:',localErr);
  try{return await withTimeout(injectScript(win,H2C_CDN,'Görsel motoru indirilemedi. İnternet bağlantısını kontrol edin.'),25000,'Görsel motoru indirilemedi (zaman aşımı).')}
  catch(cdnErr){throw cdnErr}
 }
}
const toBlob=canvas=>new Promise(ok=>{try{canvas.toBlob(b=>ok(b),'image/png')}catch(_){ok(null)}});
function scaleSteps(width,height){
 const first=Math.max(MIN_SCALE,Math.min(MAX_SCALE,MAX_SIDE/Math.max(width,height),Math.sqrt(MAX_AREA/(width*height))));
 const steps=[first,first*.7,first*.5,1.25,1].map(v=>Math.max(MIN_SCALE,Math.floor(v*100)/100));
 return steps.filter((v,i)=>steps.indexOf(v)===i&&v<=first);
}
async function render(){
 const frame=document.getElementById('kaReportFrame'),ov=document.getElementById('kaReportPreview');
 if(!frame||!ov||!frame.contentDocument)throw new Error('Rapor önizlemesi bulunamadı.');
 const d=frame.contentDocument,w=frame.contentWindow,root=d.querySelector('.ka-report')||d.body;
 if(d.fonts?.ready)try{await d.fonts.ready}catch(_){}
 for(const img of [...d.images])if(!img.complete)await new Promise(r=>{img.onload=r;img.onerror=r});
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const rect=root.getBoundingClientRect();
 if(!rect.width||!rect.height)throw new Error('Rapor sayfası ölçülemedi.');
 const h2c=await loadH2C(w);
 const width=Math.ceil(root.scrollWidth||rect.width);
 const height=Math.ceil(root.scrollHeight||rect.height);
 let lastErr=null;
 for(const scale of scaleSteps(width,height)){
  try{
   const canvas=await withTimeout(h2c(root,{scale,useCORS:true,allowTaint:false,backgroundColor:'#fff',foreignObjectRendering:false,logging:false,width,height,windowWidth:width,windowHeight:height,scrollX:0,scrollY:0,imageTimeout:20000}),RENDER_TIMEOUT,'Görsel oluşturma zaman aşımına uğradı.');
   const blob=await toBlob(canvas);
   try{canvas.width=canvas.height=0}catch(_){}
   if(blob&&blob.size>1024)return blob;
   lastErr=new Error('PNG oluşturulamadı (cihaz belleği yetmedi).');
  }catch(e){lastErr=e;console.warn('[ReportImage] ölçek',scale,'başarısız:',e)}
 }
 throw new Error(errText(lastErr)||'PNG oluşturulamadı.');
}
const b64=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>no(new Error('Görsel okunamadı.'));r.readAsDataURL(blob)});
function downloadBlob(blob,name){
 const u=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),4000);
}
// döner: 'kaydedildi' | 'paylasildi' | 'indirildi' | 'iptal'
async function action(share){
 const title=document.querySelector('#kaReportPreview .ka-report-preview__title b')?.textContent||'Koruk_Rapor',name=clean(title)+'.png';
 const blob=await render();
 if(typeof global.uygulamaDosyaKaydet==='function'){
  await global.uygulamaDosyaKaydet(await b64(blob),name,'image/png',!!share);
  return share?'paylasildi':'kaydedildi';
 }
 if(share&&typeof navigator.share==='function'){
  const file=new File([blob],name,{type:'image/png'});
  if(!navigator.canShare||navigator.canShare({files:[file]})){
   try{await navigator.share({title,files:[file]});return'paylasildi'}
   catch(e){if(e?.name==='AbortError')return'iptal';throw e}
  }
 }
 downloadBlob(blob,name);
 return share?'indirildi-paylasim-yok':'indirildi';
}
const DONE={
 kaydedildi:'Görsel İndirilenler klasörüne kaydedildi.',
 paylasildi:'Paylaşım menüsü açıldı.',
 indirildi:'Görsel indirildi.',
 'indirildi-paylasim-yok':'Bu cihaz görsel paylaşımını desteklemiyor; görsel indirildi.'
};
function start(){
 if(document.__korukReportImageFix)return;document.__korukReportImageFix=true;
 document.addEventListener('click',async e=>{
  const btn=e.target?.closest?.('.ka-report-preview__image,.ka-report-preview__share,[data-report-image],[data-report-share]');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(btn.dataset.busy)return;
  btn.dataset.busy='1';btn.disabled=true;
  const old=btn.innerHTML,share=btn.matches('.ka-report-preview__share,[data-report-share]');
  btn.textContent='Hazırlanıyor…';
  say(share?'Paylaşım için görsel hazırlanıyor…':'Görsel hazırlanıyor…');
  try{
   const r=await action(share);
   if(r!=='iptal')say(DONE[r]||'Tamamlandı.');
  }catch(err){
   console.error('[ReportImageNativeFix]',err);
   say((share?'Paylaşılamadı: ':'Görsel oluşturulamadı: ')+errText(err),'hata');
  }finally{btn.disabled=false;btn.dataset.busy='';btn.innerHTML=old}
 },true);
}
start();
global.KAReportImageNativeFix={render,action,start,scaleSteps};
})(window);
