/* Okul Yönetim — Uygulama geneli gezinme davranışları.
 * 1) Rapor/PDF önizleme üst katmandır; kapanırken alttaki detay sayfasının geçmişini değiştirmez.
 * 2) Yeni bir sayfa/görünüm açıldığında içerik en üste alınır.
 * 3) Header okul markası her zaman Ana Sayfa'yı en üstten açar.
 * 4) Pull-to-refresh core.js içindeki ortak motor tarafından yönetilir; gezinme davranışları gesture motoruna müdahale etmez.
 */
(function(global){
'use strict';
if(global.AppNavigationBehavior)return;

let reportObserver=null;
let shellWrapped=false;
const wrappedBackApis=new WeakSet();

function reportOverlay(){
  return document.getElementById('kaReportPreview')||document.getElementById('kaPdfPreview')||document.getElementById('kaPdfTools');
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
  if(document.getElementById('kaPdfTools')){
    if(typeof global.ReportEngine?.closePdfTools==='function')global.ReportEngine.closePdfTools();
    else document.getElementById('kaPdfTools')?.remove();
    return true;
  }
  return false;
}

/* ShellUI, modül içi detay geri fonksiyonlarını genel modal kontrolünden önce çağırır.
 * Rapor açıkken bu geri fonksiyonlarının alttaki detayı kapatmasına izin verme.
 * Rapor yüzeyi ayrıca standart modal olarak işaretlenir; Shell böylece önce onu kapatır. */
function protectModuleBack(api){
  if(!api||typeof api.back!=='function'||wrappedBackApis.has(api))return false;
  const original=api.back;
  api.back=function(...args){
    if(reportOverlay())return false;
    return original.apply(this,args);
  };
  wrappedBackApis.add(api);
  return true;
}

function protectDetailBacks(){
  protectModuleBack(global.TransportModule);
  protectModuleBack(global.PeopleModule);
}

function decorateReportOverlay(){
  const ov=reportOverlay();
  if(!ov)return false;
  ov.classList.add('ka-modal-backdrop');
  const close=ov.querySelector('[data-report-close],[data-pdf-close],[data-pdf-tools-close]');
  if(close)close.setAttribute('data-close','');
  protectDetailBacks();
  return true;
}

function installPreviewGuard(){
  if(reportObserver||!document.body)return;
  reportObserver=new MutationObserver(()=>{decorateReportOverlay();protectDetailBacks();});
  reportObserver.observe(document.body,{childList:true,subtree:true});
  decorateReportOverlay();
  protectDetailBacks();

  /* Eski sürüm rapor açılıp kapanırken history.pushState/history.back kullanıyordu.
   * Bu, rapor kapatıldığında alttaki servis/öğrenci detayını da geri götürüyordu.
   * Artık rapor bir transient üst katmandır; geçmişe ayrı kayıt eklenmez. */
  global.addEventListener('popstate',event=>{
    if(!reportOverlay()){
      scrollTopSoon();
      return;
    }
    /* Shell daha önce çalışmış olsa bile modül back fonksiyonları korunduğu için
       alttaki detay kapanmaz. Shell raporu kapatmışsa burada yapılacak iş kalmaz. */
    if(!reportOverlay())return;
    event.stopImmediatePropagation();
    event.preventDefault?.();
    closeReportOverlay();
    /* Rapor/PDF üst katmanı kapanırken ShellUI'nin gerçek sayfa geçmişi
       korunmalı. Popstate active guard'dan root guard'a düşürdüyse tekrar
       active guard kur; aksi halde sonraki geri basımı yanlış sayfaya
       taşıyabilir. */
    try{
      if(history.state?.kaShellGuard!=='active'){
        history.pushState({...(history.state||{}),kaShellGuard:'active'},'');
      }
    }catch(_){}
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
  const wrap=()=>{wrapShellNavigation();protectDetailBacks();decorateReportOverlay();};
  wrap();
  global.addEventListener('koruk:app-ready',()=>{wrap();scrollTopSoon();});
  global.addEventListener('koruk:module-ready',()=>{wrap();scrollTopSoon();});

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

/* Pull-to-refresh tek merkezden js/core/core.js tarafından yönetilir.
 * Bu dosyada ikinci bir touch engine bulunmaz; böylece Android WebView, Android
 * Chrome ve iOS Safari aynı gesture durum makinesini kullanır. */

function install(){
  installPreviewGuard();
  installNavigationScroll();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

global.AppNavigationBehavior={scrollTop:scrollTopNow,scrollTopSoon,closeReportOverlay,decorateReportOverlay,protectDetailBacks,clearPullRefresh:()=>{const el=document.getElementById('kaPullRefreshIndicator');if(el){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}};
})(window);
