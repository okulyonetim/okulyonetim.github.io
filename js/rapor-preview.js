/* ====================================================================
   Koruk Asistan — Rapor Önizleme Motoru
   Web/PWA raporlarında gerçek A4 kağıt önizlemesi, mobil araç çubuğu,
   zoom/sığdırma ve kurumsal çıktı görünümü sağlar.
   Native PrintPlugin akışını değiştirmez.
   ==================================================================== */
(function(){
'use strict';
let kuruldu=false, deneme=0;

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function dosyaAdi(v){return String(v||'Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g,'').trim().replace(/\s+/g,'_')||'Rapor';}

function kur(){
  if(kuruldu) return true;
  if(typeof window._raporPenceresiniAc!=='function') return false;
  const eski=window._raporPenceresiniAc;

  window._raporPenceresiniAc=function(htmlIcerik,baslik,secenekler){
    secenekler=secenekler||{};
    const nativeVarMi=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PrintPlugin);
    if(nativeVarMi) return eski.apply(this,arguments);

    const logoGoster=secenekler.logoGoster!==false;
    const ortaliBaslik=!!secenekler.ortaliBaslik;
    const servisRaporu=!!secenekler.servisRaporu;
    const ustBaslik=secenekler.ustBaslik||null;
    const yon=secenekler.yon==='yatay'?'yatay':'dikey';
    const okulAdi=(typeof window.okulBilgileriAyari!=='undefined'&&window.okulBilgileriAyari&&window.okulBilgileriAyari.okulAdi)||'Koruk İlkokulu - Ortaokulu';
    const tarih=new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',weekday:'long'});
    const base=window.location.origin+window.location.pathname.replace(/[^/]*$/,'');
    const logoSrc=base+'assets/logo.png';
    const isLandscape=yon==='yatay';
    const kagitW=isLandscape?'297mm':'210mm';
    const kagitH=isLandscape?'210mm':'297mm';
    const safeTitle=esc(baslik||'Rapor');
    const safeSchool=esc(okulAdi);
    const safeDate=esc(tarih);
    const safeFile=esc(dosyaAdi(baslik));
    const whatsappMesaj=encodeURIComponent((baslik||'Rapor')+' — '+okulAdi);

    const tamHtml=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${safeTitle} — ${safeSchool}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,Manrope,"Segoe UI",Arial,sans-serif;color:#24202a;background:#eeebf2;-webkit-print-color-adjust:exact;print-color-adjust:exact}button{font:inherit}
:root{--p:#6d28d9;--p2:#4c1d95;--ps:#f2ecff;--ink:#26212d;--muted:#716a78;--line:#ddd6e5;--warm:#d88a28;--warmbg:#fff4df;--paper:#fff;--shell:#f7f5f9}
.preview-shell{min-height:100dvh;padding:0 0 26px}.preview-top{position:sticky;top:0;z-index:20;background:rgba(247,245,249,.96);backdrop-filter:blur(16px);border-bottom:1px solid #ddd6e5;padding:12px max(12px,env(safe-area-inset-left)) 10px}
.preview-title{text-align:center;margin-bottom:10px}.preview-title strong{display:block;font-size:15px;letter-spacing:.02em}.preview-title span{display:block;margin-top:2px;color:var(--muted);font-size:11px}
.actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;max-width:900px;margin:auto}.act{min-height:50px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:750;cursor:pointer;box-shadow:0 3px 12px rgba(45,37,57,.05)}.act b{font-size:17px}.act.pdf{color:#b4232e}.act.png{color:var(--p)}.act.wa{color:#168b45}.act.print{color:#3d3744}
.workspace{padding:16px 12px 86px;overflow:auto}.paper-stage{width:max-content;min-width:100%;display:flex;justify-content:center}.paper-scene{position:relative}.paper{width:${kagitW};min-height:${kagitH};background:var(--paper);box-shadow:0 18px 55px rgba(31,25,39,.16);transform-origin:top left;overflow:hidden}.paper-inner{padding:${servisRaporu?'8mm':'7mm 8mm'};min-height:${kagitH}}
.report-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding-bottom:10px;margin-bottom:10px;border-bottom:1.5px solid #6d28d9}.report-logo{width:48px;height:48px;object-fit:contain}.report-logo.hidden{display:none}.report-head-text h1{margin:0;color:#3f247b;font-size:17px;line-height:1.15;font-weight:850;letter-spacing:-.02em}.report-head-text h2{margin:4px 0 0;color:#3e3943;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.report-date{margin-top:4px;color:#817887;font-size:7.5px}.report-mark{width:42px;height:42px;border-radius:12px;background:var(--ps);color:#6d28d9;display:grid;place-items:center;font-size:21px}
#report-content{font-size:9.5px;line-height:1.28}#report-content .bolum-baslik{margin:10px 0 6px!important;padding:5px 7px!important;background:#f2ecff!important;color:#4c1d95!important;border:0!important;border-left:3px solid #6d28d9!important;border-radius:2px!important;font-size:10px!important;font-weight:800!important}#report-content .ozet-kutu{background:#f7f4fb!important;border:1px solid #ded6e8!important;color:#4a4350!important;border-radius:6px!important}
#report-content table{width:100%!important;border-collapse:collapse!important;border-spacing:0!important;margin:0 0 9px!important;table-layout:auto}#report-content thead tr{background:#4c1d95!important;color:#fff!important}#report-content th{padding:5px 4px!important;border:1px solid #6a4aa4!important;background:#4c1d95!important;color:#fff!important;font-size:8px!important;font-weight:800!important;text-align:center!important}#report-content td{padding:5px 4px!important;border:1px solid #d8d2dc!important;background:#fff!important;color:#26212d!important;font-size:8.6px!important;text-align:center!important;vertical-align:middle!important;box-shadow:none!important}#report-content tbody tr:nth-child(even) td{background:#faf9fb!important}#report-content td:empty{background:#fbfafc!important}
.report-foot{margin-top:12px;padding-top:7px;border-top:1px solid #d9d0e6;text-align:center;color:#6d5d7d;font-size:7.5px}.report-foot b{color:#4c1d95}
.controls{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));z-index:25;transform:translateX(-50%);display:flex;align-items:center;gap:4px;padding:5px;background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(34,26,43,.18)}.controls button{height:38px;min-width:38px;border:0;border-radius:9px;background:transparent;color:#3e3745;font-weight:800;cursor:pointer}.controls button.fit{padding:0 12px;background:#6d28d9;color:#fff}.zoomlabel{min-width:48px;text-align:center;font-size:12px;font-weight:800;color:#4b4450}
@media(max-width:640px){.preview-top{padding-top:10px}.preview-title{margin-bottom:8px}.actions{gap:6px}.act{min-height:54px;flex-direction:column;gap:2px;padding:5px 2px;font-size:10px;border-radius:11px}.act b{font-size:19px}.workspace{padding:12px 8px 82px}.paper-inner{padding:${servisRaporu?'7mm':'6mm 7mm'}}.paper{box-shadow:0 12px 36px rgba(31,25,39,.2)}.report-head{gap:9px;padding-bottom:7px;margin-bottom:8px}.report-logo{width:40px;height:40px}.report-head-text h1{font-size:15px}.report-mark{width:34px;height:34px;font-size:18px}.controls{width:calc(100% - 20px);justify-content:center}.controls .fit{margin-left:auto}}
@media print{@page{size:A4 ${isLandscape?'landscape':'portrait'};margin:0}.preview-top,.controls{display:none!important}html,body,.preview-shell,.workspace,.paper-stage,.paper-scene{background:#fff!important;margin:0!important;padding:0!important;overflow:visible!important;width:auto!important;height:auto!important}.paper{transform:none!important;width:${kagitW}!important;min-height:${kagitH}!important;box-shadow:none!important}.paper-inner{min-height:${kagitH}!important}tr{break-inside:avoid;page-break-inside:avoid}.sayfa-sonu{page-break-before:always}}
</style></head><body><main class="preview-shell"><header class="preview-top"><div class="preview-title"><strong>RAPOR ÖNİZLEME</strong><span>Gerçek A4 çıktı görünümü</span></div><div class="actions"><button class="act pdf" onclick="window.print()"><b>📄</b><span>PDF İndir</span></button><button class="act png" onclick="pngKaydet()"><b>🖼️</b><span>PNG Kaydet</span></button><button class="act wa" onclick="raporPaylas()"><b>◉</b><span>WhatsApp</span></button><button class="act print" onclick="window.print()"><b>🖨️</b><span>Yazdır</span></button></div></header><section class="workspace" id="viewport"><div class="paper-stage"><div class="paper-scene" id="scene"><article class="paper" id="paper"><div class="paper-inner"><header class="report-head">${logoGoster?`<img class="report-logo" src="${logoSrc}" onerror="this.classList.add('hidden')">`:''}<div class="report-head-text">${ustBaslik?`<h2>${esc(ustBaslik)}</h2>`:''}<h1>${safeTitle}</h1>${!ustBaslik?`<h2>${safeSchool}</h2><div class="report-date">Oluşturulma: ${safeDate}</div>`:''}</div><div class="report-mark">▦</div></header><section id="report-content">${htmlIcerik}</section><footer class="report-foot"><b>${safeSchool}</b> &nbsp;•&nbsp; Koruk Asistan ile oluşturulmuştur.</footer></div></article></div></div></section><nav class="controls"><button onclick="zoomBy(-10)">−</button><span class="zoomlabel" id="zl">100%</span><button onclick="zoomBy(10)">+</button><button class="fit" onclick="fitPage()">▣ Sığdır</button></nav></main>
<script>
var Z=100,NW=0,NH=0;function paper(){return document.getElementById('paper')}function viewport(){return document.getElementById('viewport')}function measure(){var p=paper();p.style.transform='none';NW=p.offsetWidth;NH=p.offsetHeight}function apply(){var p=paper(),s=document.getElementById('scene');if(!NW)measure();var k=Z/100;p.style.transform='scale('+k+')';s.style.width=Math.ceil(NW*k)+'px';s.style.height=Math.ceil(NH*k)+'px';document.getElementById('zl').textContent=Z+'%'}function zoomBy(d){Z=Math.max(25,Math.min(180,Z+d));apply()}function fitPage(){measure();var v=viewport();var usable=Math.max(120,v.clientWidth-20);Z=Math.max(25,Math.min(100,Math.floor(usable/NW*100)));apply();v.scrollTo({left:0,top:0,behavior:'smooth'})}function removeDuplicateTitle(){var root=document.getElementById('report-content'),target=${JSON.stringify(String(baslik||'').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim())};if(!root||!target)return;Array.from(root.querySelectorAll('h1,h2,h3,.bolum-baslik')).some(function(el){var t=(el.textContent||'').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();if(t===target){el.style.display='none';return true}return false})}function raporPaylas(){var txt='${whatsappMesaj}';if(navigator.share){navigator.share({title:${JSON.stringify(String(baslik||'Rapor'))},text:decodeURIComponent(txt)}).catch(function(){})}else{location.href='https://wa.me/?text='+txt}}function pngKaydet(){var p=paper();if(window.html2canvas){window.html2canvas(p,{scale:2,backgroundColor:'#ffffff'}).then(savePng);return}var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';sc.onload=function(){window.html2canvas(p,{scale:2,backgroundColor:'#ffffff'}).then(savePng)};sc.onerror=function(){alert('PNG oluşturucu yüklenemedi. İnternet bağlantısını kontrol edin.')};document.head.appendChild(sc)}function savePng(c){var a=document.createElement('a');a.download='${safeFile}.png';a.href=c.toDataURL('image/png');a.click()}window.addEventListener('resize',function(){clearTimeout(window.__rf);window.__rf=setTimeout(fitPage,100)});requestAnimationFrame(function(){removeDuplicateTitle();requestAnimationFrame(fitPage)});
<\/script></body></html>`;

    try{
      const blob=new Blob([tamHtml],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const win=window.open(url,'_blank');
      if(!win) throw new Error('popup_blocked');
      setTimeout(()=>URL.revokeObjectURL(url),120000);
      return win;
    }catch(e){
      try{
        const win=window.open('','_blank','width=950,height=1000');
        if(win){win.document.write(tamHtml);win.document.close();return win;}
      }catch(_){ }
      return eski.apply(this,arguments);
    }
  };
  window._raporPenceresiniAc.__korukPreviewV3=true;
  kuruldu=true;
  return true;
}

const t=setInterval(()=>{if(kur()||++deneme>240)clearInterval(t)},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
window.addEventListener('load',()=>setTimeout(kur,0));
})();
