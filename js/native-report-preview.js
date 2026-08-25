/* ====================================================================
   js/native-report-preview.js
   Android/Capacitor rapor akışını tek standarda getirir:
   Önizleme -> Yazdır / PDF Kaydet -> PrintPlugin.
   ==================================================================== */
(function(){
  'use strict';

  let kurulumDenemesi = 0;
  let aktifRapor = null;

  function nativePrintVarMi(){
    try {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin);
    } catch (_) { return false; }
  }

  function temizDosyaAdi(ad){
    return String(ad || 'Rapor').replace(/[^\w\sÇĞİÖŞÜçğıöşü-]/g, '').trim().replace(/\s+/g, '_') || 'Rapor';
  }

  function onizlemeHtmlHazirla(html){
    const gizle = '<style id="native-rapor-onizleme-css">.rapor-toolbar{display:none!important}html,body{max-width:100%!important;overflow:auto!important}body{padding:0!important}</style>';
    const metin = String(html || '');
    return /<\/head>/i.test(metin) ? metin.replace(/<\/head>/i, gizle + '</head>') : gizle + metin;
  }

  function zoomEt(delta){const frame=document.getElementById('nativeRaporFrame'),win=frame&&frame.contentWindow;if(!win)return;try{if(typeof win.zoomAyarla==='function')win.zoomAyarla(delta);zoomEtiketiniGuncelle();}catch(_){}}
  function zoomSigdir(){const frame=document.getElementById('nativeRaporFrame'),win=frame&&frame.contentWindow;if(!win)return;try{if(typeof win.zoomSigdir==='function')win.zoomSigdir();zoomEtiketiniGuncelle();}catch(_){}}
  function zoomYuz(){const frame=document.getElementById('nativeRaporFrame'),win=frame&&frame.contentWindow;if(!win)return;try{if(typeof win.zoomSifirla==='function')win.zoomSifirla();zoomEtiketiniGuncelle();}catch(_){}}
  function zoomEtiketiniGuncelle(){const label=document.getElementById('nativeRaporZoomLabel'),frame=document.getElementById('nativeRaporFrame');if(!label||!frame||!frame.contentWindow)return;try{const z=Number(frame.contentWindow._zoom);if(Number.isFinite(z)&&z>0)label.textContent=Math.round(z)+'%';}catch(_){}}

  function onizlemeKapat(){
    document.getElementById('nativeRaporOnizleme')?.remove();aktifRapor=null;document.body.classList.remove('modal-open');
    if(document.body.dataset.nativeRaporOverflow!==undefined){document.body.style.overflow=document.body.dataset.nativeRaporOverflow;delete document.body.dataset.nativeRaporOverflow;}
    try{if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(true);}catch(_){}
  }

  async function gercekYazdir(){
    if(!aktifRapor||typeof aktifRapor.yazdir!=='function')return;
    const btn=document.getElementById('nativeRaporYazdirBtn');if(btn){btn.disabled=true;btn.textContent='Hazırlanıyor…';}
    try{await Promise.resolve(aktifRapor.yazdir(aktifRapor.html,aktifRapor.dosyaAdi,aktifRapor.yon));}
    catch(e){console.error('[NativeRaporOnizleme] Yazdırma hatası:',e);try{if(typeof toast==='function')toast('Yazdırma açılamadı: '+(e?.message||e));}catch(_){}}
    finally{if(btn){btn.disabled=false;btn.textContent='🖨 Yazdır / PDF Kaydet';}}
  }

  function onizlemeAc(html,dosyaAdi,yon,gercekYazdirFn){
    onizlemeKapat();const guvenliAd=temizDosyaAdi(dosyaAdi),guvenliYon=yon==='yatay'?'yatay':'dikey';aktifRapor={html:String(html||''),dosyaAdi:guvenliAd,yon:guvenliYon,yazdir:gercekYazdirFn};
    document.body.dataset.nativeRaporOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';document.body.classList.add('modal-open');try{if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(false);}catch(_){}
    const ov=document.createElement('div');ov.id='nativeRaporOnizleme';ov.className='ka-report-preview';ov.innerHTML=`<div class="ka-report-preview__toolbar"><button id="nativeRaporKapatBtn" type="button">✕ Kapat</button><div class="ka-report-preview__title">${guvenliAd.replace(/_/g,' ')}</div><span>${guvenliYon==='yatay'?'Yatay':'Dikey'}</span><button id="nativeRaporKucultBtn" type="button">−</button><span id="nativeRaporZoomLabel">100%</span><button id="nativeRaporBuyutBtn" type="button">+</button><button id="nativeRaporSigdirBtn" type="button">Sığdır</button><button id="nativeRaporYuzBtn" type="button">100%</button><button id="nativeRaporYazdirBtn" type="button">🖨 Yazdır / PDF Kaydet</button></div><div class="ka-report-preview__body"><iframe id="nativeRaporFrame" title="Rapor önizleme" class="ka-report-preview__frame"></iframe></div>`;document.body.appendChild(ov);
    const frame=document.getElementById('nativeRaporFrame');frame.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{zoomSigdir();zoomEtiketiniGuncelle();})),{once:true});frame.srcdoc=onizlemeHtmlHazirla(aktifRapor.html);
    document.getElementById('nativeRaporKapatBtn').onclick=onizlemeKapat;document.getElementById('nativeRaporKucultBtn').onclick=()=>zoomEt(-10);document.getElementById('nativeRaporBuyutBtn').onclick=()=>zoomEt(+10);document.getElementById('nativeRaporSigdirBtn').onclick=zoomSigdir;document.getElementById('nativeRaporYuzBtn').onclick=zoomYuz;document.getElementById('nativeRaporYazdirBtn').onclick=gercekYazdir;
  }

  function kur(){const mevcut=window.uygulamaHtmlYazdir;if(typeof mevcut!=='function'){if(kurulumDenemesi++<80)setTimeout(kur,100);return;}if(mevcut.__nativeRaporOnizlemeSarmali)return;const gercekYazdirFn=mevcut.bind(window);async function sarmal(html,dosyaAdi,yon){if(!nativePrintVarMi())return gercekYazdirFn(html,dosyaAdi,yon);onizlemeAc(html,dosyaAdi,yon,gercekYazdirFn);return{preview:true};}sarmal.__nativeRaporOnizlemeSarmali=true;sarmal.__gercekYazdir=gercekYazdirFn;window.uygulamaHtmlYazdir=sarmal;window.nativeRaporOnizlemeKapat=onizlemeKapat;}
  kur();
})();
