/* Okul Yönetim — Uygulama geneli gezinme davranışları.
 * 1) Rapor/PDF önizleme üst katmandır; kapanırken alttaki detay sayfasının geçmişini değiştirmez.
 * 2) Yeni bir sayfa/görünüm açıldığında içerik en üste alınır.
 * 3) Header okul markası her zaman Ana Sayfa'yı en üstten açar.
 * 4) Menü yüzeylerinde pull-to-refresh çalışır; takılı kalan yenileme göstergesi güvenle temizlenir.
 */
(function(global){
'use strict';
if(global.AppNavigationBehavior)return;

let reportObserver=null;
let shellWrapped=false;
let pullReliabilityInstalled=false;
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

function installPullRefreshReliability(){
  if(pullReliabilityInstalled)return;
  pullReliabilityInstalled=true;
  const ARM=96,DEAD=8;
  let tracking=false,armed=false,startX=0,startY=0,resetTimer=null;

  function indicator(){return document.getElementById('kaPullRefreshIndicator')}
  function clearIndicator(force=false){
    clearTimeout(resetTimer);resetTimer=null;
    const el=indicator();
    if(!el)return;
    if(!force&&el.classList.contains('is-refreshing'))return;
    el.classList.remove('is-armed','is-refreshing');
    el.style.setProperty('--ka-pull-y','0px');
    el.hidden=true;
  }
  function safetyReset(){
    clearTimeout(resetTimer);
    resetTimer=setTimeout(()=>clearIndicator(false),2600);
  }
  function menuScroller(target){
    const layer=target?.closest?.('.ka-menu-layer');
    if(!layer)return null;
    let node=target instanceof Element?target:null;
    while(node&&node!==layer){
      const cs=getComputedStyle(node);
      if((cs.overflowY==='auto'||cs.overflowY==='scroll'||cs.overflowY==='overlay')&&node.scrollHeight>node.clientHeight+2)return node;
      node=node.parentElement;
    }
    return layer;
  }
  function draw(raw){
    const el=indicator();if(!el)return;
    const visual=Math.min(78,Math.max(0,raw)*.48);
    armed=raw>=ARM;
    el.hidden=visual<2;
    el.classList.toggle('is-armed',armed);
    el.classList.remove('is-refreshing');
    el.style.setProperty('--ka-pull-y',`${Math.round(visual)}px`);
    const label=el.querySelector('span');if(label)label.textContent=armed?'Bırakınca yenile':'Yenilemek için çek';
    safetyReset();
  }
  document.addEventListener('touchstart',e=>{
    if(e.touches?.length!==1)return;
    const target=e.target instanceof Element?e.target:null;
    if(!target?.closest?.('.ka-menu-layer')||target.closest('.ka-bottom-nav,.ka-modal-backdrop,.dv3,[role="dialog"]'))return;
    const scroller=menuScroller(target);
    if((scroller&&scroller.scrollTop>1)||Number(global.scrollY||0)>1)return;
    tracking=true;armed=false;startX=e.touches[0].clientX;startY=e.touches[0].clientY;
  },{capture:true,passive:true});
  document.addEventListener('touchmove',e=>{
    if(!tracking||e.touches?.length!==1)return;
    const t=e.touches[0],dx=t.clientX-startX,dy=t.clientY-startY;
    if(dy<0||Math.abs(dx)>Math.abs(dy)+8){tracking=false;armed=false;clearIndicator(false);return}
    const scroller=menuScroller(e.target instanceof Element?e.target:null);
    if(scroller&&scroller.scrollTop>1){tracking=false;armed=false;clearIndicator(false);return}
    if(dy<=DEAD)return;
    e.preventDefault();draw(dy);
  },{capture:true,passive:false});
  const finish=()=>{
    if(!tracking){clearIndicator(false);return}
    const refresh=armed;tracking=false;armed=false;
    if(!refresh){clearIndicator(false);return}
    clearTimeout(resetTimer);resetTimer=null;
    const el=indicator();if(el){el.hidden=false;el.classList.remove('is-armed');el.classList.add('is-refreshing');el.style.setProperty('--ka-pull-y','74px');const label=el.querySelector('span');if(label)label.textContent='Yenileniyor…'}
    setTimeout(()=>global.location.reload(),100);
  };
  document.addEventListener('touchend',finish,{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{tracking=false;armed=false;clearIndicator(false)},{capture:true,passive:true});
  global.addEventListener('blur',()=>{tracking=false;armed=false;clearIndicator(false)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){tracking=false;armed=false;clearIndicator(false)}});

  const observer=new MutationObserver(()=>{
    const el=indicator();
    if(el&&!el.hidden&&!el.classList.contains('is-refreshing'))safetyReset();
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
}

function install(){
  installPreviewGuard();
  installNavigationScroll();
  installPullRefreshReliability();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

global.AppNavigationBehavior={scrollTop:scrollTopNow,scrollTopSoon,closeReportOverlay,decorateReportOverlay,protectDetailBacks,clearPullRefresh:()=>{const el=document.getElementById('kaPullRefreshIndicator');if(el){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}};
})(window);
