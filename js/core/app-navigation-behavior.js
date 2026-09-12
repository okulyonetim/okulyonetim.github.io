/* Okul Yönetim — Uygulama geneli gezinme davranışları.
 * 1) Rapor/PDF önizleme açıkken tarayıcı/Android geri tuşu önce önizlemeyi kapatır.
 * 2) Yeni bir sayfa/görünüm açıldığında içerik en üste alınır.
 * 3) Header okul markası her zaman Ana Sayfa'yı en üstten açar.
 */
(function(global){
'use strict';
if(global.AppNavigationBehavior)return;

let previewHistoryArmed=false;
let suppressNextPop=false;
let closingFromPop=false;
let reportObserver=null;
let shellWrapped=false;

function reportOverlay(){
  return document.getElementById('kaReportPreview')||document.getElementById('kaPdfPreview');
}

function scrollTopNow(){
  try{global.scrollTo({top:0,left:0,behavior:'auto'});}catch(_){global.scrollTo?.(0,0);}
  const appContent=document.querySelector('.ka-app-content');
  if(appContent&&appContent.scrollTop)appContent.scrollTop=0;
  const moduleRoot=document.getElementById('v2ModuleRoot');
  if(moduleRoot&&moduleRoot.scrollTop)moduleRoot.scrollTop=0;
}

function scrollTopSoon(){
  queueMicrotask(()=>requestAnimationFrame(()=>{scrollTopNow();requestAnimationFrame(scrollTopNow);}));
}

function closeReportOverlay(){
  if(document.getElementById('kaReportPreview')){
    if(typeof global.ReportEngine?.closePreview==='function')global.ReportEngine.closePreview();
    else document.getElementById('kaReportPreview')?.remove();
    return true;
  }
  if(document.getElementById('kaPdfPreview')){
    if(typeof global.ReportEngine?.closePdfPreview==='function')global.ReportEngine.closePdfPreview();
    else document.getElementById('kaPdfPreview')?.remove();
    return true;
  }
  return false;
}

function armPreviewHistory(){
  if(previewHistoryArmed||!reportOverlay())return;
  previewHistoryArmed=true;
  const current=history.state&&typeof history.state==='object'?history.state:{};
  history.pushState({...current,kaReportPreviewGuard:true},'');
}

function cleanupPreviewHistoryAfterManualClose(){
  if(!previewHistoryArmed||closingFromPop)return;
  previewHistoryArmed=false;
  suppressNextPop=true;
  history.back();
}

function syncPreviewHistory(){
  if(reportOverlay()){
    armPreviewHistory();
    return;
  }
  if(previewHistoryArmed)cleanupPreviewHistoryAfterManualClose();
}

function installPreviewGuard(){
  if(reportObserver||!document.body)return;
  reportObserver=new MutationObserver(syncPreviewHistory);
  reportObserver.observe(document.body,{childList:true,subtree:true});
  syncPreviewHistory();

  global.addEventListener('popstate',event=>{
    if(suppressNextPop){
      suppressNextPop=false;
      event.stopImmediatePropagation();
      return;
    }
    if(!reportOverlay()){
      scrollTopSoon();
      return;
    }
    event.stopImmediatePropagation();
    event.preventDefault?.();
    closingFromPop=true;
    previewHistoryArmed=false;
    closeReportOverlay();
    closingFromPop=false;
  },true);

  document.addEventListener('click',event=>{
    const close=event.target.closest?.('#kaReportPreview [data-report-close],#kaPdfPreview [data-pdf-close]');
    if(!close)return;
    setTimeout(cleanupPreviewHistoryAfterManualClose,0);
  },true);
}

function wrapShellNavigation(){
  if(shellWrapped||!global.ShellUI)return false;
  shellWrapped=true;
  for(const name of ['home','routeModule','renderProfile','renderSearch']){
    const original=global.ShellUI[name];
    if(typeof original!=='function')continue;
    global.ShellUI[name]=function(...args){
      const result=original.apply(this,args);
      if(result&&typeof result.then==='function')result.finally(scrollTopSoon);
      else scrollTopSoon();
      return result;
    };
  }
  return true;
}

function installNavigationScroll(){
  const wrap=()=>wrapShellNavigation();
  wrap();
  global.addEventListener('koruk:app-ready',()=>{wrap();scrollTopSoon();});
  global.addEventListener('koruk:module-ready',scrollTopSoon);

  document.addEventListener('click',event=>{
    const brand=event.target.closest?.('[data-ka-home-trigger]');
    if(brand){
      event.preventDefault();
      event.stopImmediatePropagation();
      const result=global.ShellUI?.home?.();
      if(result&&typeof result.finally==='function')result.finally(scrollTopSoon);else scrollTopSoon();
      return;
    }
    const nav=event.target.closest?.('[data-ka-shell-route],[data-dash-route],[data-ka-shell-action="home"],[data-ka-shell-action="profile"],[data-ka-shell-action="search"]');
    if(nav)scrollTopSoon();
  },true);

  global.AppStore?.subscribe?.('ui.route',scrollTopSoon);
}

function install(){
  installPreviewGuard();
  installNavigationScroll();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

global.AppNavigationBehavior={scrollTop:scrollTopNow,scrollTopSoon,closeReportOverlay,syncPreviewHistory};
})(window);
