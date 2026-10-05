/* Koruk Asistan — rapor görsel/paylaşım Android/Web düzeltmesi.
 * Mevcut A4/PDF motoruna dokunmaz. Önizlemedeki gerçek A4 DOM'unu html2canvas ile PNG'ye çevirir.
 */
(function(global){
'use strict';
if(global.KAReportImageNativeFix)return;
let html2canvasPromise=null;
const fileName=v=>(String(v||'Koruk_Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||'Koruk_Rapor');
function loadHtml2Canvas(){
  if(global.html2canvas)return Promise.resolve(global.html2canvas);
  if(html2canvasPromise)return html2canvasPromise;
  html2canvasPromise=new Promise((resolve,reject)=>{
    const old=[...document.scripts].find(s=>/html2canvas/i.test(s.src||''));
    if(old){old.addEventListener('load',()=>resolve(global.html2canvas),{once:true});old.addEventListener('error',()=>reject(new Error('Görsel motoru yüklenemedi.')),{once:true});return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.async=true;s.onload=()=>global.html2canvas?resolve(global.html2canvas):reject(new Error('Görsel motoru başlatılamadı.'));s.onerror=()=>reject(new Error('Görsel motoru indirilemedi.'));document.head.appendChild(s);
  });
  return html2canvasPromise;
}
async function render(){
  const frame=document.getElementById('kaReportFrame');
  const ov=document.getElementById('kaReportPreview');
  if(!frame||!ov||!frame.contentDocument?.body)throw new Error('Rapor önizlemesi bulunamadı.');
  const root=frame.contentDocument.querySelector('.ka-report')||frame.contentDocument.body;
  for(const img of [...frame.contentDocument.images]){
    if(!img.complete)await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>ok()});
  }
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const h2c=await loadHtml2Canvas();
  const landscape=(ov.querySelector('.ka-report-preview__title small')?.textContent||'').includes('Yatay');
  const targetWidth=landscape?3508:2480;
  const rect=root.getBoundingClientRect();
  if(!rect.width||!rect.height)throw new Error('Rapor sayfası ölçülemedi.');
  const canvas=await h2c(root,{scale:targetWidth/rect.width,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,windowWidth:Math.ceil(rect.width),windowHeight:Math.ceil(rect.height),scrollX:0,scrollY:0});
  return await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(new Error('PNG oluşturulamadı.')),'image/png',1));
}
async function base64(blob){const r=new FileReader();return new Promise((ok,no)=>{r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=no;r.readAsDataURL(blob)})}
async function action(share){
  const ov=document.getElementById('kaReportPreview');
  const title=ov?.querySelector('.ka-report-preview__title b')?.textContent||'Koruk_Rapor';
  const name=fileName(title)+'.png';
  const blob=await render();
  const file=new File([blob],name,{type:'image/png'});
  if(typeof global.uygulamaDosyaKaydet==='function')return global.uygulamaDosyaKaydet(await base64(blob),name,'image/png',!!share);
  if(share&&navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))return navigator.share({title,files:[file]});
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);return{downloaded:true};
}
function start(){
  document.addEventListener('click',async e=>{
    const btn=e.target.closest?.('.ka-report-preview__image,.ka-report-preview__share,[data-report-image],[data-report-share]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.dataset.kaImageBusy==='1')return;
    btn.dataset.kaImageBusy='1';btn.disabled=true;const old=btn.innerHTML;btn.textContent='Hazırlanıyor…';
    try{await action(btn.matches('.ka-report-preview__share,[data-report-share]'));global.toast?.(btn.matches('.ka-report-preview__share,[data-report-share]')?'Paylaşım hazırlandı.':'Görsel İndirilenler klasörüne kaydedildi.');}
    catch(err){console.error('[ReportImageNativeFix]',err);global.toast?.('Görsel oluşturulamadı: '+(err?.message||err));}
    finally{btn.disabled=false;btn.dataset.kaImageBusy='0';btn.innerHTML=old;}
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
global.KAReportImageNativeFix={render,action};
})(window);