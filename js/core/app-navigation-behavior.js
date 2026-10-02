/* Koruk Asistan — Uygulama geneli gezinme davranışları.
 * 1) Rapor/PDF önizleme üst katmandır; kapanırken alttaki detay sayfasının geçmişini değiştirmez.
 * 2) Yeni bir sayfa/görünüm açıldığında içerik en üste alınır.
 * 3) Header okul markası her zaman Ana Sayfa'yı en üstten açar.
 * 4) Pull-to-refresh core.js içindeki ortak motor tarafından yönetilir; gezinme davranışları gesture motoruna müdahale etmez.
 * 5) Modülün kendi Geri butonu varsa ortak shell Geri çubuğu gizlenir; böylece aynı sayfada iki Geri butonu oluşmaz.
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

function normalizeShellBackButtons(){
  document.querySelectorAll('[data-ka-shell-back]').forEach(btn=>{
    if(btn.dataset.kaBackNormalized==='1')return;
    btn.dataset.kaBackNormalized='1';
    btn.classList.remove('ka-shell-back');
    btn.classList.add('ka-icon-button');
    btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.setAttribute('aria-label','Geri');
    btn.setAttribute('title','Geri');
  });
}

/* Bazı çizelge/form modülleri kendi "Geri" butonunu üretir. Shell'in
 * ortak Geri çubuğu da aynı anda görünürse kullanıcı iki Geri görür.
 * Modülün kendi geri davranışı varsa shell çubuğu tamamen gizlenir. */
function syncShellBackbar(){
  const bar=document.querySelector('[data-ka-shell-backbar]');
  if(!bar)return;
  const content=document.querySelector('.ka-app-content');
  const moduleRoot=document.getElementById('v2ModuleRoot');
  if(!content||!moduleRoot||!moduleRoot.children.length){
    bar.hidden=true;
    bar.style.display='none';
    return;
  }

  /* Daha önceki sürüm yalnızca v2ModuleRoot içini tarıyordu. Bazı çizelge
     modülleri geri butonunu app-content içinde root'un dışında oluşturduğu
     için bu kontrol iki buton sorununu yakalayamıyordu. Shell çubuğunun
     kendisini hariç tutarak tüm aktif içerik alanını tarıyoruz. */
  const localBack=[...content.querySelectorAll('button,a,[role="button"]')].find(el=>{
    if(el.closest('[data-ka-shell-backbar]'))return false;
    if(el.closest('[hidden],[aria-hidden="true"]'))return false;
    const style=global.getComputedStyle?global.getComputedStyle(el):null;
    if(style&&(style.display==='none'||style.visibility==='hidden'))return false;
    const text=String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim();
    return /(^|\s)geri(\s|$)/i.test(text)||/←\s*geri/i.test(text)||/‹\s*geri/i.test(text);
  });

  const show= !localBack;
  bar.hidden=!show;
  bar.style.display=show?'':'none';
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

/* Profil > Ders Programım, Ders Programı modülündeki mevcut tek öğretmen
 * raporunu kullanır. Öğretmen otomatik olarak oturumdaki bağlı kayıttan alınır. */
function profileScheduleReportMeta(){
  const rows=global.AppStore?.data?.('okulBilgileri');
  const list=Array.isArray(rows)?rows:[];
  const info=list.find(x=>x.id==='ayarlar')||list[0]||{};
  const school=String(info.okulAdi||info.ad||'Koruk İlkokulu - Ortaokulu').trim();
  const now=new Date(),year=now.getFullYear(),start=now.getMonth()>=7?year:year-1;
  return{school,title:'Ders Programı',year:`${start}-${start+1}`,subtitle:'',showSchool:true,showTitle:false,showYear:true,showSubtitle:false};
}
function profileTeacherId(){
  const u=global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
  return String(u.bagliOgretmenId||u.ogretmenId||'').trim();
}
async function openProfileScheduleReport(){
  const teacherId=profileTeacherId();
  if(!teacherId){global.toast?.('Bu kullanıcıya bağlı öğretmen kaydı bulunamadı.');return false;}
  try{
    if(!global.ScheduleReportRedesign)await global.AppLoader?.loadScript?.('js/core/schedule-report-redesign.js?v=942');
    if(!global.ScheduleReportRedesign?.individualBody)throw new Error('Ders programı rapor motoru hazır değil.');
    if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
    if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');
    const body=global.ScheduleReportRedesign.individualBody('teacher',[teacherId],profileScheduleReportMeta(),'single');
    if(!body)throw new Error('Öğretmen ders programı oluşturulamadı.');
    return await global.ReportEngine.printReport('Öğretmen Ders Programı',body,{
      fileName:'Öğretmen Ders Programı',yon:'yatay',logoGoster:false,tarihGoster:false,
      baslikGoster:false,compact:false,fontSize:7,kenarBosluk:3,
      extraHead:global.ScheduleReportRedesign.PRINT_STYLE
    });
  }catch(e){
    console.error('[Profile/ScheduleReport]',e);
    global.toast?.(e?.message||'Öğretmen ders programı raporu açılamadı.');
    return false;
  }
}
function bindProfileScheduleReport(){
  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-profile-view="schedule"]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    Promise.resolve(openProfileScheduleReport()).catch(e=>console.error('[Profile/ScheduleReport]',e));
  },true);
}

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
  reportObserver=new MutationObserver(()=>{normalizeShellBackButtons();syncShellBackbar();decorateReportOverlay();protectDetailBacks();});
  reportObserver.observe(document.body,{childList:true,subtree:true});
  normalizeShellBackButtons();
  syncShellBackbar();
  decorateReportOverlay();
  protectDetailBacks();

  global.addEventListener('popstate',event=>{
    if(!reportOverlay()){
      scrollTopSoon();
      return;
    }
    if(!reportOverlay())return;
    event.stopImmediatePropagation();
    event.preventDefault?.();
    closeReportOverlay();
    try{
      if(history.state?.kaShellGuard!=='active')history.pushState({...(history.state||{}),kaShellGuard:'active'},'');
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
      normalizeShellBackButtons();
      const result=original.apply(this,args);
      normalizeShellBackButtons();
      syncShellBackbar();
      if(result&&typeof result.then==='function')result.finally(()=>{normalizeShellBackButtons();syncShellBackbar();scrollTopSoon()});
      else scrollTopSoon();
      return result;
    };
  }
  return true;
}

function installReportPreviewLayout(){
  if(document.querySelector('link[data-report-preview-layout]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='css/report-preview-layout.css?v=20261002';
  link.dataset.reportPreviewLayout='';
  document.head.appendChild(link);
}

function installNavigationScroll(){
  const wrap=()=>{installReportPreviewLayout();normalizeShellBackButtons();wrapShellNavigation();syncShellBackbar();protectDetailBacks();decorateReportOverlay();};
  wrap();
  global.addEventListener('koruk:app-ready',()=>{wrap();scrollTopSoon();});
  global.addEventListener('koruk:module-ready',()=>{wrap();scrollTopSoon();});

  document.addEventListener('click',event=>{
    const brand=event.target.closest?.('[data-ka-home-trigger]');
    if(brand){
      event.preventDefault();
      event.stopImmediatePropagation();
      const result=global.ShellUI?.home?.();
      if(result&&typeof result.finally==='function')result.finally(()=>{syncShellBackbar();scrollTopSoon()});else{syncShellBackbar();scrollTopSoon()}
      return;
    }
    const nav=event.target.closest?.('[data-ka-shell-route],[data-dash-route],[data-ka-shell-action="home"],[data-ka-shell-action="profile"],[data-ka-shell-action="search"]');
    if(nav){syncShellBackbar();scrollTopSoon()}
  },true);

  global.AppStore?.subscribe?.('ui.route',()=>{syncShellBackbar();scrollTopSoon()});
}

function install(){
  installPreviewGuard();
  bindProfileScheduleReport();
  installNavigationScroll();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

global.AppNavigationBehavior={scrollTop:scrollTopNow,scrollTopSoon,closeReportOverlay,decorateReportOverlay,protectDetailBacks,syncShellBackbar,clearPullRefresh:()=>{const el=document.getElementById('kaPullRefreshIndicator');if(el){el.classList.remove('is-armed','is-refreshing');el.style.setProperty('--ka-pull-y','0px');el.hidden=true}}};
})(window);
