/* Koruk Asistan — Excel görüntüleyici mobil üst bar + pinch zoom düzeltmeleri */
(function(){
'use strict';
let deneme=0,baslangicMesafe=0,baslangicZoom=1;
function mesafe(t){if(!t||t.length<2)return 0;const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy);}
function kur(){
  const d=window.DokumanOkuyucu;
  if(!d||!d.__zenginExcel){if(deneme++<120)setTimeout(kur,100);return;}
  if(window.__excelMobilFixKuruldu)return;
  const css=document.createElement('style');css.id='excel-mobile-fix-css';css.textContent=`
    .xrv-head{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:0!important;padding:0!important;overflow:visible!important;white-space:normal!important;background:#101419!important}
    .xrv-head-main{display:flex;align-items:center;gap:8px;padding:max(8px,env(safe-area-inset-top)) 8px 6px;min-width:0}
    .xrv-head-tools{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px 8px;border-top:1px solid #2d3742;flex-wrap:wrap;overflow:visible}
    .xrv-title{min-width:0!important;flex:1!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    .xrv-head-main .xrv-btn{flex:0 0 auto}
    .xrv-head-tools .xrv-btn{flex:0 0 auto;min-width:42px}
    .xrv-head-tools #xrvFit{min-width:118px}
    .xrv-tabs{position:relative;z-index:20;flex:0 0 auto;background:#20262d!important}
    .xrv-view{position:relative;z-index:1;touch-action:pan-x pan-y pinch-zoom!important;overflow:auto!important}
    .xrv-scene,.xrv-stage,.xrv-sheet{z-index:1!important}
    @media(max-width:640px){
      .xrv-head-tools{justify-content:space-between;gap:5px}
      .xrv-head-tools .xrv-btn{padding:8px 9px}
      .xrv-head-tools #xrvFit{min-width:auto;flex:1 1 120px}
      .xrv-zoom{flex:0 0 48px}
    }`;
  document.head.appendChild(css);

  const obs=new MutationObserver(()=>{
    const root=document.getElementById('xrv');
    if(!root||root.dataset.mobileFixed==='1')return;
    const head=root.querySelector('.xrv-head');if(!head)return;
    const close=root.querySelector('#xrvClose'),title=root.querySelector('.xrv-title'),down=root.querySelector('#xrvDownload');
    const minus=root.querySelector('#xrvMinus'),fit=root.querySelector('#xrvFit'),label=root.querySelector('#xrvZoom'),plus=root.querySelector('#xrvPlus');
    if(!close||!title||!down||!minus||!fit||!label||!plus)return;
    const main=document.createElement('div');main.className='xrv-head-main';
    const tools=document.createElement('div');tools.className='xrv-head-tools';
    main.append(close,title,down);tools.append(minus,label,plus,fit);head.replaceChildren(main,tools);
    const view=root.querySelector('#xrvView');
    if(view){
      view.addEventListener('touchstart',e=>{if(e.touches.length===2){baslangicMesafe=mesafe(e.touches);baslangicZoom=parseFloat((label.textContent||'100').replace('%',''))/100||1;}},{passive:true});
      view.addEventListener('touchmove',e=>{if(e.touches.length!==2||!baslangicMesafe)return;e.preventDefault();const oran=mesafe(e.touches)/baslangicMesafe;const hedef=Math.max(.15,Math.min(3,baslangicZoom*oran));const mevcut=parseFloat((label.textContent||'100').replace('%',''))/100||1;if(Math.abs(hedef-mevcut)>.03){if(hedef>mevcut)plus.click();else minus.click();}},{passive:false});
      view.addEventListener('touchend',e=>{if(e.touches.length<2)baslangicMesafe=0;},{passive:true});
      view.addEventListener('touchcancel',()=>{baslangicMesafe=0;},{passive:true});
    }
    root.dataset.mobileFixed='1';
  });
  obs.observe(document.body,{childList:true,subtree:true});
  window.__excelMobilFixKuruldu=true;
}
kur();
})();