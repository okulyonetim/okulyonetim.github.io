/* Koruk Asistan — rapor PNG indirme/paylaşma köprüsü. */
(function(global){
'use strict';
if(global.KAReportImageNativeFix)return;
const H2C='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const clean=v=>(String(v||'Koruk_Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||'Koruk_Rapor');
function loadH2C(win){
 if(win?.html2canvas)return Promise.resolve(win.html2canvas);
 return new Promise((resolve,reject)=>{const d=win?.document;if(!d?.head)return reject(new Error('Görsel alanı hazır değil.'));const s=d.createElement('script');s.src=H2C;s.async=true;s.onload=()=>win.html2canvas?resolve(win.html2canvas):reject(new Error('Görsel motoru başlatılamadı.'));s.onerror=()=>reject(new Error('Görsel motoru indirilemedi.'));d.head.appendChild(s)});
}
async function render(){
 const frame=document.getElementById('kaReportFrame'),ov=document.getElementById('kaReportPreview');
 if(!frame||!ov||!frame.contentDocument)throw new Error('Rapor önizlemesi bulunamadı.');
 const d=frame.contentDocument,w=frame.contentWindow,root=d.querySelector('.ka-report')||d.body;
 if(d.fonts?.ready)try{await d.fonts.ready}catch(_){}
 for(const img of [...d.images])if(!img.complete)await new Promise(r=>{img.onload=r;img.onerror=r});
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const landscape=(ov.querySelector('.ka-report-preview__title small')?.textContent||'').includes('Yatay');
 const target=landscape?3508:2480,rect=root.getBoundingClientRect();
 if(!rect.width||!rect.height)throw new Error('Rapor sayfası ölçülemedi.');
 const h2c=await loadH2C(w),scale=Math.max(1,Math.min(4,target/rect.width));
 const canvas=await h2c(root,{scale,useCORS:true,allowTaint:false,backgroundColor:'#fff',foreignObjectRendering:false,logging:false,width:Math.ceil(root.scrollWidth||rect.width),height:Math.ceil(root.scrollHeight||rect.height),windowWidth:Math.ceil(root.scrollWidth||rect.width),windowHeight:Math.ceil(root.scrollHeight||rect.height),scrollX:0,scrollY:0,imageTimeout:20000});
 return new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(new Error('PNG oluşturulamadı.')),'image/png',1));
}
const b64=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=no;r.readAsDataURL(blob)});
async function action(share){
 const title=document.querySelector('#kaReportPreview .ka-report-preview__title b')?.textContent||'Koruk_Rapor',name=clean(title)+'.png',blob=await render(),file=new File([blob],name,{type:'image/png'});
 if(typeof global.uygulamaDosyaKaydet==='function')return global.uygulamaDosyaKaydet(await b64(blob),name,'image/png',!!share);
 if(share&&navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))return navigator.share({title,files:[file]});
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);return{downloaded:true};
}
function start(){
 if(document.__korukReportImageFix)return;document.__korukReportImageFix=true;
 document.addEventListener('click',async e=>{const btn=e.target.closest?.('.ka-report-preview__image,.ka-report-preview__share,[data-report-image],[data-report-share]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();if(btn.dataset.busy)return;btn.dataset.busy='1';btn.disabled=true;const old=btn.innerHTML,share=btn.matches('.ka-report-preview__share,[data-report-share]');btn.textContent='Hazırlanıyor…';try{await action(share);global.toast?.(share?'Paylaşım hazırlandı.':'Görsel İndirilenler klasörüne kaydedildi.')}catch(err){console.error('[ReportImageNativeFix]',err);global.toast?.('Görsel oluşturulamadı: '+(err?.message||err))}finally{btn.disabled=false;btn.dataset.busy='';btn.innerHTML=old}},true);
}
start();
global.KAReportImageNativeFix={render,action,start};
})(window);