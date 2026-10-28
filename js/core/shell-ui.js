/* Koruk Asistan — V2 Shell UI
 * Kabuk: alt sekmeler, geri yığını, rota yöneticisi (routeModule), profil, arama, bildirimler, hızlı not, tema.
 * Menü yapısı AppNav'da (rol, sekmeler, sayfa kataloğu), sekme sayfaları NavPages'dadır; burada yalnız açma ve geri dönme vardır.
 */
(function(global){
'use strict';
if(global.ShellUI)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const nav=()=>global.AppNav;
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
function installButtonFeedback(){if(global.__kaButtonFeedbackInstalled)return;global.__kaButtonFeedbackInstalled=true;document.addEventListener('pointerdown',e=>{const b=e.target.closest?.('button:not(:disabled)');if(b)b.classList.add('ka-is-pressed')},true);const clear=e=>e.target.closest?.('button')?.classList.remove('ka-is-pressed');document.addEventListener('pointerup',clear,true);document.addEventListener('pointercancel',clear,true);/* düğme basışında bildirim gösterilmez; yalnız basılı görünümü verilir (bildirimler gerçek sonuç/hata içindir) */}
installButtonFeedback();
const SVG={
 search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 note:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const FORM_PAGES=Object.freeze({'form-maarif':'Maarif Model Raporları','form-belirli':'Belirli Günler ve Haftalar','form-sok':'ŞÖK','form-rehberlik':'Rehberlik','form-bep':'BEP Planları','form-zumre':'Zümre','form-kulup':'Sosyal Kulüpler','form-diger':'Diğer Evrak'});
const CUSTOM_PAGE_ROUTES=new Map();
let activeAction='home',visibilityObserver=null,headerPopover=null,themeTouched=false,browserBackBound=false,browserExitApproved=false,browserExitFromPop=false;
const homeView=()=>({kind:'route',name:'dashboard',bottom:'home',page:'',title:nav().tab('home')?.label||'Ana Sayfa'});
let navStack=[homeView()];
let routeEpoch=0;
const isTeacherUser=()=>nav().isTeacherUser();
/* Sayfa kapıları: öğretmen hesabına kapalı sayfaların listesi AppNav.TEACHER_HIDDEN'dadır (Personel İşleri sayfası vb. aynı kuralı PermissionService.isTeacherAccount ile uygular). */
const pageAllowed=(name,page='')=>nav().pageAllowed(name,page);
function navView(id){const i=global.NavPages?.info?.(id);return i?{kind:'nav',name:'nav',bottom:i.tab,page:i.id,title:i.title}:null}
function sameView(a,b){return !!a&&!!b&&a.kind===b.kind&&a.name===b.name&&a.bottom===b.bottom&&a.page===b.page&&a.title===b.title}
function sameSurface(a,b){if(!a||!b||a.kind!==b.kind)return false;if(a.kind==='route')return a.name===b.name&&(a.page||'')===(b.page||'');if(a.kind==='profile-detail'||a.kind==='nav')return a.page===b.page;return ['profile','search'].includes(a.kind)}
/* replaceNext: çok sayfalı aracın sayfaları arasında geçişte yeni sayfa geri yığınına eklenmez, mevcut sayfanın yerine geçer (routeModule {replace:true}). */
let replaceNext=false;
function rememberView(view){if(!view)return;if(replaceNext&&navStack.length){replaceNext=false;navStack[navStack.length-1]=view;syncShellBack();return}const top=navStack[navStack.length-1];if(sameView(top,view)){syncShellBack();return}if(sameSurface(top,view)){navStack[navStack.length-1]=view;syncShellBack();return}navStack.push(view);if(navStack.length>30)navStack.splice(0,navStack.length-30);syncShellBack()}
function registerPageRoute(page,handler){page=String(page||'').trim();if(!page||typeof handler!=='function')return()=>{};CUSTOM_PAGE_ROUTES.set(page,handler);return()=>{if(CUSTOM_PAGE_ROUTES.get(page)===handler)CUSTOM_PAGE_ROUTES.delete(page)}}
function installBuiltInPageRoutes(){if(global.__shellBuiltInPageRoutes)return;global.__shellBuiltInPageRoutes=true;
  /* "Veriler" menü öğesi (settings:data) hiç var olmamış bir global.KaDataPage'i
   * çağırıyordu — her tıklamada sessizce "Sayfa açılamadı." hatasına düşüyor, kullanıcı
   * boş bir ekranda kalıyordu. Bu sayfanın karşılığı zaten var: Ayarlar modülünün
   * "Depolama" (storage) sekmesi — aynı settings.storage izniyle korunuyor. */
  registerPageRoute('data',async(ctx)=>{
    const root=ctx?.root||$('#v2ModuleRoot');
    if(!root)return false;
    root.replaceChildren?.();
    if(!global.SettingsModule?.mount)await global.AppLoader?.load?.('settings');
    if(!global.SettingsModule?.mount)throw new Error('SettingsModule hazır değil.');
    const ok=await global.SettingsModule.mount(root);
    if(ok===false)throw new Error('SettingsModule.mount başarısız');
    return global.SettingsModule.openPage('storage','Veriler');
  });
  const openGradebook=async page=>{
    if(!global.AppLoader?.loadScript)throw new Error('Modül yükleyici hazır değil.');
    await global.AppLoader.loadScript('js/modules/tools.js');
    if(!global.OdevNotCizelgeleriService)throw new Error('Çizelge veri servisi yüklenemedi.');
    await global.AppLoader.loadScript('js/modules/gradebooks.js?v=1019');
    if(!global.GradebookPage?.open)throw new Error('Çizelge modülü yüklenemedi.');
    return global.GradebookPage.open(page);
  };
  /* PDF araçları ve Klasör Sırtlığı gerçek birer documents sayfası değildir; rapor motoru ilk kullanımda yüklenir. */
  const openPdfTool=mode=>async(ctx)=>{
    global.DocumentsModule?.unmount?.();global.EvrakTakipPage?.close?.();
    (ctx?.root||$('#v2ModuleRoot'))?.replaceChildren?.();
    if(!global.ReportEngine?.openPdfTools)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
    if(!global.ReportEngine?.openPdfTools)throw new Error('PDF araçları hazır değil.');
    global.ReportEngine.openPdfTools(mode);
    return true;
  };
  registerPageRoute('pdf-images',openPdfTool('images'));
  registerPageRoute('pdf-merge',openPdfTool('merge'));
  registerPageRoute('folder-spine',async(ctx)=>{
    const root=ctx?.root||$('#v2ModuleRoot');
    if(!nav().tool('folder-spine')||!nav().toolAllowed(nav().tool('folder-spine'))){global.toast?.('Klasör Sırtlığı yalnızca admin ve yönetici rolündekiler içindir.');return false}
    global.DocumentsModule?.unmount?.();
    if(!global.ReportEngine?.previewHtml)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
    if(!global.FolderSpine?.open)await global.AppLoader?.loadScript?.('js/modules/folder-spine.js?v=7');
    if(!global.FolderSpine?.open)throw new Error('folder-spine-load');
    return global.FolderSpine.open(root);
  });
  registerPageRoute('homework',async()=>openGradebook('homework'));
  registerPageRoute('grades',async()=>openGradebook('grades'));
  /* Kullanım Kılavuzu ve Uygulama Hakkında: ayrı bir modül/yetki anahtarı yoktur; her giriş yapmış kullanıcı açabilir.
   * İçerik ilk açılışta yüklenir (guide-data.js + guide.js); rehber kartları yine kullanıcının görebildiği modüllerle sınırlıdır. */
  registerPageRoute('guide',async(ctx)=>{const root=ctx?.root||$('#v2ModuleRoot');if(!root)return false;if(!await ensureGuide())return false;return global.KorukGuide.mountPage(root)});
  registerPageRoute('about',async(ctx)=>{const root=ctx?.root||$('#v2ModuleRoot');if(!root)return false;if(!await ensureGuide())return false;return global.KorukGuide.mountAbout(root)});}
async function ensureGuide(){
  try{
    if(!global.KorukGuide)await global.AppLoader?.loadMany?.(global.AppLoader.list().find(m=>m.name==='guide')?.files)
    if(!global.KorukGuide)throw new Error('Kılavuz hazır değil.');
    return true;
  }catch(e){console.error('[Shell/guide]',e);global.toast?.('Kılavuz yüklenemedi. Uygulamanın diğer bölümleri etkilenmedi.',{tur:'hata'});return false}
}
function setTitle(v){const el=$('#v2ModuleTitle');if(el)el.textContent=v||''}
function setBottomActive(tab){activeAction=tab||'';$$('[data-ka-tab]').forEach(b=>{const on=!!tab&&b.dataset.kaTab===tab;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')})}
/* Sayfada birden çok geri düğmesi var (telefon geri çubuğu + web üst çubuğu izi); durum hepsine uygulanır — yalnız ilkini güncellemek telefon düğmesini kalıcı gizli bırakıyordu. */
function syncShellBack(){const bs=[...document.querySelectorAll('[data-ka-shell-back]')],bar=document.querySelector('[data-ka-shell-backbar]');if(!bs.length)return;const show=navStack.length>1;bs.forEach(b=>{b.hidden=!show;b.setAttribute('aria-hidden',String(!show))});if(bar)bar.hidden=!show;try{global.dispatchEvent(new CustomEvent('koruk:shell-route',{detail:{view:currentView(),canBack:show}}))}catch(_){}}
function suspendModuleForShellSurface(){global.AppLoader?.suspendActiveModule?.()}
const moduleAllowed=name=>nav().moduleAllowed(name);
function closeHeaderPopover(){headerPopover?.remove();headerPopover=null;document.removeEventListener('pointerdown',outsideHeaderPopover,true)}
function outsideHeaderPopover(e){if(!headerPopover)return;if(headerPopover.contains(e.target)||e.target.closest('[data-ka-header-notification]'))return;closeHeaderPopover()}
function popoverBase(anchor,width=330){closeHeaderPopover();const r=anchor.getBoundingClientRect(),el=document.createElement('div'),w=Math.min(width,innerWidth-20),right=Math.max(10,Math.min(innerWidth-r.right,innerWidth-w-10));el.className='ka-card ka-header-popover';el.setAttribute('role','dialog');el.style.cssText=`position:fixed;z-index:1100;top:${Math.max(r.bottom+10,70)}px;right:${right}px;width:${w}px;max-height:calc(100dvh - ${Math.max(r.bottom+24,88)}px);overflow:auto;`;document.body.appendChild(el);headerPopover=el;setTimeout(()=>document.addEventListener('pointerdown',outsideHeaderPopover,true),0);return el}
function cleanupFormPage(){global.__kaFormPageObserver?.disconnect?.();global.__kaFormPageObserver=null}
function hideModuleChrome(root,name){if(name==='tools'){const h=root.querySelector('[data-tools-module] > .ka-row');if(h)h.hidden=true}else if(name==='settings'){const h=root.querySelector('[data-settings-module] > div:first-child');if(h)h.hidden=true}}
function applyFormPage(root,page,title){const wanted=FORM_PAGES[page];if(!wanted)return false;const ok=global.ToolsModule?.openPage?.('forms',wanted);if(ok===false)return false;hideModuleChrome(root,'tools');const applyFilter=()=>{const content=root.querySelector('#toolsContent');content?.querySelectorAll(':scope > section').forEach(section=>{const h=section.querySelector('h3');section.hidden=!h||!String(h.textContent||'').trim().startsWith(wanted)})};cleanupFormPage();requestAnimationFrame(()=>{applyFilter();const content=root.querySelector('#toolsContent');if(content){global.__kaFormPageObserver=new MutationObserver(applyFilter);global.__kaFormPageObserver.observe(content,{childList:true})}});if(title)setTitle(title);return true}
async function ensureToolsPageDependencies(page){
  const files=[];
  if(['student-list','homework','grades'].includes(page))files.push('js/modules/teacher-list.js');
  if(page==='homework'||page==='grades')files.push('js/modules/teacher-list-core.js?v=1065');
  if(page==='map')files.push('js/modules/map-ui.js');
  if(!files.length)return true;
  if(!global.AppLoader?.loadScript)throw new Error('Tools companion loader hazır değil.');
  for(const src of files)await global.AppLoader.loadScript(src);
  return true;
}
function applySubpage(name,page,title){
  const root=$('#v2ModuleRoot');if(!root||!page)return false;
  const studentPages={'student-attendance':'attendance','student-list':'student-list',homework:'homework',grades:'grades'};
  if(name==='tools'&&page==='student-attendance'){
    global.ToolsModule?.unmount?.();
    Promise.resolve(global.StudentPages?.open?.('attendance',title)).catch(e=>{console.error('[Shell/student-attendance]',e);global.toast?.('Öğrenci yoklama açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='tools'&&page==='student-list'){
    Promise.resolve(global.OgretmenListeUI?.open?.()).then(()=>requestAnimationFrame(()=>{const shell=root.querySelector('[data-tools-module]');if(shell){const head=shell.querySelector(':scope > .ka-row'),tabs=shell.querySelector('.ka-tabs');if(head)head.hidden=true;if(tabs)tabs.hidden=true}})).catch(e=>{console.error('[Shell/student-list]',e);global.toast?.('Öğrenci listesi oluşturucu açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='tools'&&(page==='homework'||page==='grades')){
    global.ToolsModule?.unmount?.();
    Promise.resolve(global.OdevNotUI?.open?.(studentPages[page])).catch(e=>{console.error('[Shell/gradebook]',e);global.toast?.('Çizelge açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='management'&&['staff','staff-leaves','leave-annual','leave-health','leave-excuse','leave-other','tasks','leaves','duty','puantaj','dilekce'].includes(page)){
    const ok=global.ManagementModule?.openPage?.(page,title);
    if(ok===false)return false;
    if(title)setTitle(title);
    return true;
  }
  if(name==='tools'&&FORM_PAGES[page])return applyFormPage(root,page,title);
  if(name==='documents'&&page==='evrak'&&global.EvrakTakipPage?.open){
    global.DocumentsModule?.unmount?.();
    Promise.resolve(global.EvrakTakipPage.open(root)).catch(e=>{console.error('[Shell/evrak]',e);global.toast?.('Evrak Takibi açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='documents'&&page==='dilimiz'&&global.DocumentsModule?.openDilimiz){
    global.DocumentsModule.openDilimiz({shell:true});
    requestAnimationFrame(()=>{const shell=root.querySelector('[data-documents-module]');if(shell){const head=shell.querySelector(':scope > .ka-row'),search=shell.querySelector('#documentsSearch')?.closest('.ka-field'),formButton=shell.querySelector('[data-document-form="teblig"]')?.closest('.ka-row');if(head)head.hidden=true;if(search)search.hidden=true;if(formButton)formButton.hidden=true}});
    if(title)setTitle(title);return true;
  }
  if(name==='documents'&&page==='teblig'&&global.DocumentsModule?.openTeblig){
    global.DocumentsModule.openTeblig({shell:true});
    requestAnimationFrame(()=>{const shell=root.querySelector('[data-documents-module]');if(shell){const head=shell.querySelector(':scope > .ka-row'),search=shell.querySelector('#documentsSearch')?.closest('.ka-field'),formButton=shell.querySelector('[data-document-form="teblig"]')?.closest('.ka-row');if(head)head.hidden=true;if(search)search.hidden=true;if(formButton)formButton.hidden=true}});
    if(title)setTitle(title);return true;
  }
  if(name==='academic'&&['schedule','written','trial','results','plans','calendar'].includes(page)){
    const ok=global.AcademicModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Akademik sayfa açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='management'&&['staff','staff-leaves','leave-annual','leave-health','leave-excuse','leave-other','tasks','leaves','duty','puantaj','dilekce'].includes(page)){
    const ok=global.ManagementModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Yönetim sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='communication'&&['announcements','messages','polls','news','notes','calendar'].includes(page)){
    const ok=global.CommunicationModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('İletişim sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='transport'&&['services','busSeats','classSeats'].includes(page)){
    const ok=global.TransportModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Taşıma sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='food'&&['daily','weekly','monthly','audit'].includes(page)){
    const ok=global.FoodMenuModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Yemek sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='settings'&&['school','social','lesson-hours','holiday','users','statistics','account','sync','roles','app','reminders','storage'].includes(page)){
    const ok=global.SettingsModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Ayarlar sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='people'&&['teachers','classes','students'].includes(page)){
    const ok=global.PeopleModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Kişiler sayfası açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='tools'&&['checklists','map','attendance'].includes(page)){
    const ok=global.ToolsModule?.openPage?.(page,title);
    if(ok===false)global.toast?.('Sayfa açılamadı.');
    if(title)setTitle(title);return true;
  }
  if(name==='academic'){
    const h=root.querySelector('[data-academic-module] > .ka-row h2');if(h&&title)h.textContent=title;
  }
  if(name==='communication'){
    const h=root.querySelector('[data-communication-module] > .ka-row h2');if(h&&title)h.textContent=title;
  }
  if(name==='management'){
    const h=root.querySelector('[data-management-module] > .ka-row h2');if(h&&title)h.textContent=title;
  }
  if(name==='tools')hideModuleChrome(root,'tools');
  if(name==='settings')hideModuleChrome(root,'settings');
  if(title)setTitle(title);
  return true;
}
const MODULE_ROOT_SELECTORS=Object.freeze({dashboard:'[data-dashboard-module]',people:'[data-people-module]',academic:'[data-academic-module]',management:'[data-management-module]',communication:'[data-communication-module]',transport:'[data-transport-module]',food:'[data-food-menu-module]',documents:'[data-documents-module]',reports:'[data-reports-module]',tools:'[data-tools-module]',settings:'[data-settings-module]'});
function moduleRouteMounted(name){const root=$('#v2ModuleRoot'),selector=MODULE_ROOT_SELECTORS[name];return !!(selector&&global.AppLoader?.moduleApi?.(name)&&root?.querySelector?.(selector))}
let routeDepth=0;
async function routeModule(name,opts={}){if(!routeDepth)replaceNext=opts?.replace===true;routeDepth++;try{return await routeModuleCore(name,opts)}finally{routeDepth--;if(!routeDepth)replaceNext=false}}
async function routeModuleCore(name,{bottom='',page='',title='',remember=true,parent=null}={}){
  const routeToken=++routeEpoch;
  if(!pageAllowed(name,page)){global.toast?.('Bu sayfa öğretmen kullanıcıları için gizli.');return false}
  /* bottom: alt sekme anahtarı; verilmezse (ya da bu rolde yoksa) rotadan hesaplanır. parent: geri dönülecek sekme sayfası (ör. "tools:sinav"). */
  bottom=nav().tab(bottom)?bottom:(name==='dashboard'&&!page?'home':nav().tabOf(name,page));
  const requestedGradePage=name==='tools'&&(page==='homework'||page==='grades')?page:'';
  /* Ödev/Not çizelgesi özel sayfa olduğu için başka bir rotaya geçerken
     kendi aboneliklerini ve modal/çalışma alanını mutlaka kapat. Aksi halde
     dashboard açıldıktan sonra sabit workspace tekrar görünür ve geri tuşu
     navStack'te dashboard kaldığı için uygulamadan çıkış uyarısına düşer. */
  if(!leaveToolSurfaces({gradebook:requestedGradePage,studentList:name==='tools'&&page==='student-list',attendance:name==='tools'&&page==='student-attendance',form:name==='tools'&&!!FORM_PAGES[page]}))return false;
  closeHeaderPopover();
  if(remember&&parent&&!webMode()){
    const pv=navView(parent);
    if(pv&&!sameView(navStack[navStack.length-1],pv))rememberView(pv);
  }
  if(name==='parentmeeting'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.ParentMeetingModule?.open)await global.AppLoader?.loadScript?.('js/modules/parent-meeting.js');
      if(!global.ParentMeetingModule?.open)throw new Error('Veli görüşme formu yüklenemedi.');
      setBottomActive(bottom);setTitle('Veli Görüşme Formu');
      global.ParentMeetingModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Veli Görüşme Formu'});
    }catch(e){
      console.error('[Shell/parentmeeting]',e);global.toast?.('Veli görüşme formu açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='monthflow'){
    try{
      if(!global.MonthlyFlowModule?.open)await global.AppLoader?.loadScript?.('js/modules/monthly-flow.js');
      if(!global.MonthlyFlowModule?.open)throw new Error('Aylık akış modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Aylık Yönetim Akışı');
      global.MonthlyFlowModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Aylık Yönetim Akışı'});
    }catch(e){
      console.error('[Shell/monthflow]',e);global.toast?.('Aylık yönetim akışı açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='gezi'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.GeziModule?.open)await global.AppLoader?.loadScript?.('js/modules/gezi.js');
      if(!global.GeziModule?.open)throw new Error('Gezi modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Gezi Planı');
      global.GeziModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Gezi Planı'});
    }catch(e){
      console.error('[Shell/gezi]',e);global.toast?.('Gezi planı modülü açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='tutanak'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.TutanakModule?.open)await global.AppLoader?.loadScript?.('js/modules/tutanak.js');
      if(!global.TutanakModule?.open)throw new Error('Tutanak modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Tutanak Hazırla');
      global.TutanakModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Tutanak Hazırla'});
    }catch(e){
      console.error('[Shell/tutanak]',e);global.toast?.('Tutanak modülü açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='bep-hazirla'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.BepModule?.open)await global.AppLoader?.loadScript?.('js/modules/bep.js');
      if(!global.BepModule?.open)throw new Error('BEP modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('BEP Dosyası Hazırla');
      global.BepModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'BEP Dosyası Hazırla'});
    }catch(e){
      console.error('[Shell/bep]',e);global.toast?.('BEP modülü açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='sinif-rehberlik'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.SinifBaglam)await global.AppLoader?.loadScript?.('js/modules/sinif-baglam.js?v=2');
      if(!global.RehberlikVeri)await global.AppLoader?.loadScript?.('js/modules/rehberlik-veri.js?v=2');
      if(!global.RehberlikCore)await global.AppLoader?.loadScript?.('js/modules/rehberlik-core.js?v=3');
      if(!global.RehberlikBelge)await global.AppLoader?.loadScript?.('js/modules/rehberlik-belge.js?v=4');
      if(!global.RehberlikModule?.open)await global.AppLoader?.loadScript?.('js/modules/rehberlik.js?v=4');
      if(!global.RehberlikModule?.open)throw new Error('Sınıf Rehberlik modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Sınıf Rehberlik');
      if(!global.RehberlikModule.open())throw new Error('Sınıf Rehberlik açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Sınıf Rehberlik'});
    }catch(e){
      console.error('[Shell/sinif-rehberlik]',e);global.toast?.('Sınıf Rehberlik açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='veli-toplantisi'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.SinifBaglam)await global.AppLoader?.loadScript?.('js/modules/sinif-baglam.js?v=2');
      if(!global.VeliToplantisiVeri)await global.AppLoader?.loadScript?.('js/modules/veli-toplantisi-veri.js?v=2');
      if(!global.VeliToplantisiModule?.open)await global.AppLoader?.loadScript?.('js/modules/veli-toplantisi.js?v=4');
      if(!global.VeliToplantisiModule?.open)throw new Error('Veli Toplantısı modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Veli Toplantısı');
      if(!global.VeliToplantisiModule.open())throw new Error('Veli Toplantısı açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Veli Toplantısı'});
    }catch(e){
      console.error('[Shell/veli-toplantisi]',e);global.toast?.('Veli Toplantısı açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='yazili-teslim'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
      if(!global.SinifBaglam)await global.AppLoader?.loadScript?.('js/modules/sinif-baglam.js?v=2');
      if(!global.YaziliTeslimCore)await global.AppLoader?.loadScript?.('js/modules/yazili-teslim-core.js?v=2');
      if(!global.YaziliTeslimModule?.open)await global.AppLoader?.loadScript?.('js/modules/yazili-teslim.js?v=2');
      if(!global.YaziliTeslimModule?.open)throw new Error('Yazılı Kâğıdı Teslim Tutanağı modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Yazılı Kâğıdı Teslim Tutanağı');
      if(!global.YaziliTeslimModule.open())throw new Error('Yazılı Kâğıdı Teslim Tutanağı açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Yazılı Kâğıdı Teslim Tutanağı'});
    }catch(e){
      console.error('[Shell/yazili-teslim]',e);global.toast?.('Yazılı Kâğıdı Teslim Tutanağı açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='ders-kesim'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
      if(!global.SinifBaglam)await global.AppLoader?.loadScript?.('js/modules/sinif-baglam.js?v=2');
      if(!global.DersKesimCore)await global.AppLoader?.loadScript?.('js/modules/ders-kesim-core.js?v=1');
      if(!global.DersKesimModule?.open)await global.AppLoader?.loadScript?.('js/modules/ders-kesim.js?v=1');
      if(!global.DersKesimModule?.open)throw new Error('Ders Kesim Raporu modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Ders Kesim Raporu');
      if(!global.DersKesimModule.open())throw new Error('Ders Kesim Raporu açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Ders Kesim Raporu'});
    }catch(e){
      console.error('[Shell/ders-kesim]',e);global.toast?.('Ders Kesim Raporu açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='maarif-oyun'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
      if(!global.SinifBaglam)await global.AppLoader?.loadScript?.('js/modules/sinif-baglam.js?v=2');
      if(!global.MaarifOyunVeri)await global.AppLoader?.loadScript?.('js/modules/maarif-oyun-veri.js?v=1');
      if(!global.MaarifOyunPlan)await global.AppLoader?.loadScript?.('js/modules/maarif-oyun-plan.js?v=1');
      if(!global.MaarifOyunModule?.open)await global.AppLoader?.loadScript?.('js/modules/maarif-oyun.js?v=3');
      if(!global.MaarifOyunModule?.open)throw new Error('Maarif’in Kalbinde Oyun modülü yüklenemedi.');
      const ad=(global.MaarifOyunVeri.SAYFALAR[page]||global.MaarifOyunVeri.SAYFALAR.nedir).ad;
      setBottomActive(bottom);setTitle(ad);
      if(!global.MaarifOyunModule.open(page))throw new Error('Maarif’in Kalbinde Oyun açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:ad});
    }catch(e){
      console.error('[Shell/maarif-oyun]',e);global.toast?.('Maarif’in Kalbinde Oyun açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='ogretmen-dosyasi'){
    try{
      if(!global.OgretmenDosyasi?.open)await global.AppLoader?.loadScript?.('js/modules/ogretmen-dosyasi.js?v=6');
      if(!global.OgretmenDosyasi?.open)throw new Error('Öğretmen Dosyası modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Öğretmen Dosyası');
      if(!await global.OgretmenDosyasi.open())throw new Error('Öğretmen Dosyası açılamadı.');
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Öğretmen Dosyası'});
    }catch(e){
      console.error('[Shell/ogretmen-dosyasi]',e);global.toast?.('Öğretmen Dosyası açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='tymm-olcek'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.TymmModule?.open)await global.AppLoader?.loadScript?.('js/modules/tymm-olcek.js');
      if(!global.TymmModule?.open)throw new Error('TYMM modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('TYMM İlkokul Ölçekleri');
      global.TymmModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'TYMM İlkokul Ölçekleri'});
    }catch(e){
      console.error('[Shell/tymm]',e);global.toast?.('TYMM modülü açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='idareci-pano'){
    try{
      if(!global.IdareciPano?.open)await global.AppLoader?.loadScript?.('js/modules/idareci-pano.js');
      if(!global.IdareciPano?.open)throw new Error('İdareci Pano modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Pano');
      const opened=await global.IdareciPano.open();
      if(opened===false){await routeModule('management',{bottom,remember});return true}
      if(remember)rememberView({kind:'route',name,bottom,page,title:'Pano'});
    }catch(e){
      console.error('[Shell/idareci-pano]',e);global.toast?.('İdareci Pano açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='dilekcehazirla'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.DilekceModule?.open)await global.AppLoader?.loadScript?.('js/modules/dilekce.js');
      if(!global.DilekceModule?.open)throw new Error('Dilekçe modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Dilekçe Oluştur');
      global.DilekceModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Dilekçe Oluştur'});
    }catch(e){
      console.error('[Shell/dilekce]',e);global.toast?.('Dilekçe modülü açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  if(name==='payroll'){
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
      if(!global.PayrollChangeModule?.open)await global.AppLoader?.loadScript?.('js/modules/payroll-change.js');
      if(!global.PayrollChangeModule?.open)throw new Error('Maaş değişikliği modülü yüklenemedi.');
      setBottomActive(bottom);setTitle('Maaş Değişikliği Bildirim Formu');
      global.PayrollChangeModule.open();if(remember)rememberView({kind:'route',name,bottom,page,title:'Maaş Değişikliği Bildirim Formu'});
    }catch(e){
      console.error('[Shell/payroll]',e);global.toast?.('Maaş değişikliği formu açılamadı.');
      await routeModule('management',{bottom,remember});
    }
    return true;
  }
  const meta=global.AppConfig?.module?.(name)||{label:name};
  if(meta.visible===false||global.PermissionService?.moduleLevel?.(name)==='hidden')return false;
  if(name==='committees'){
    setBottomActive(bottom);global.AppLoader?.setActiveModule?.(name);setTitle(title||'Kurul ve Komisyonlar');
    try{
      const root=$('#v2ModuleRoot');
      if(!global.CommitteesModule)await global.AppLoader?.loadScript?.('js/modules/committees.js?v=7');
      if(!global.CommitteesModule?.mount)throw new Error('CommitteesModule hazır değil');
      if(routeToken!==routeEpoch)return false;
      root?.replaceChildren?.();
      const ok=global.CommitteesModule.mount(root);
      if(ok===false)throw new Error('CommitteesModule.mount başarısız');
      if(remember)rememberView({kind:'route',name,bottom,page:page||'home',title:title||'Kurul ve Komisyonlar'});
      return true;
    }catch(e){console.error('[Shell/committees]',e);global.toast?.('Kurul ve Komisyonlar açılamadı.');return false}
  }
  if(name==='reports'){
    setBottomActive(bottom);
    global.AppLoader?.setActiveModule?.(name);
    setTitle(title||meta.label||name);
    try{
      const root=$('#v2ModuleRoot');
      if(!global.ReportsModule){
        await global.AppLoader?.loadScript?.('js/modules/reports.js?v=23');
      }
      if(!global.ReportsModule){
        await new Promise((resolve,reject)=>{
          const s=document.createElement('script');
          s.src='js/modules/reports.js?force=6';
          s.async=false;
          s.onload=resolve;
          s.onerror=()=>reject(new Error('reports.js yüklenemedi'));
          document.head.appendChild(s);
        });
      }
      if(routeToken!==routeEpoch)return false;
      if(!global.ReportsModule?.mount)throw new Error('ReportsModule hazır değil');
      root?.replaceChildren?.();
      const ok=await global.ReportsModule.mount(page||'home',root);
      if(ok===false)throw new Error('ReportsModule.mount başarısız');
      if(remember)rememberView({kind:'route',name,bottom,page:page||'home',title:title||meta.label||name});
      return true;
    }catch(e){
      console.error('[Shell/reports]',e);
      global.toast?.('Okul Raporları açılamadı.');
      return false;
    }
  }
  if(name==='tools'&&(['rubric-distribution','project-evaluation','rubric','project'].includes(page))){
    setBottomActive(bottom);
    global.AppLoader?.setActiveModule?.(name);
    setTitle(title||meta.label||name);
    try{
      await global.AppLoader?.loadScript?.('js/modules/rubric-settings.js?v=1066');
      await global.AppLoader?.loadScript?.('js/modules/rubric-tools.js');
      await global.AppLoader?.loadScript?.('js/modules/rubric-tools-engine.js');
      if(routeToken!==routeEpoch||AppStore?.get?.('ui.route')!==name)return false;
      $('#v2ModuleRoot')?.replaceChildren?.();
      const rubricPage=page==='rubric'||page==='rubric-distribution'?'rubric':'project';
      const ok=await global.RubricToolsModule?.openPage?.(rubricPage);
      if(ok===false){global.toast?.('Değerlendirme aracı açılamadı.');return false}
      if(remember)rememberView({kind:'route',name,bottom,page,title:title||meta.label||name});
      return true;
    }catch(e){
      console.error('[Shell/rubric-direct]',e);
      global.toast?.('Değerlendirme aracı açılamadı.');
      return false;
    }
  }
  const custom=page&&CUSTOM_PAGE_ROUTES.get(page);
  if(custom){
    setBottomActive(bottom);global.AppLoader?.setActiveModule?.(name);setTitle(title||meta.label||name);
    try{const ok=(await custom({name,bottom,page,title,root:$('#v2ModuleRoot')}))!==false;if(routeToken!==routeEpoch)return false;if(ok&&remember)rememberView({kind:'route',name,bottom,page,title:title||meta.label||name});return ok}catch(e){console.error('[Shell/custom-page]',page,e);global.toast?.('Sayfa açılamadı.');return false}
  }
  setBottomActive(bottom);const reuseModule=moduleRouteMounted(name);global.AppLoader?.setActiveModule?.(name);
  setTitle(title||meta.label||name);if(name==='tools'&&page)await ensureToolsPageDependencies(page);if(!reuseModule)await global.AppLoader?.load?.(name);
  /* Sayfa yüklenirken kullanıcı başka bir rotaya geçtiyse bu eski çağrı artık
     alt sayfa uygulamamalı. Aksi halde ör. Aylık İşler açılırken geciken
     documents/evrak çağrısı yeni ekrana tekrar Evrak Takibi basabiliyordu. */
  if(routeToken!==routeEpoch||AppStore?.get?.('ui.route')!==name)return false;
  if(page)applySubpage(name,page,title);
  if(name==='dashboard'||bottom==='home'){navStack=[homeView()];syncShellBack();}
  else if(remember)rememberView({kind:'route',name,bottom,page,title:title||meta.label||name});
  return true
}
const WEB_MEDIA='(min-width:1100px)';
function webMode(){try{return global.matchMedia?.(WEB_MEDIA).matches===true}catch(_){return false}}
function currentView(){return navStack[navStack.length-1]||null}
/* ── alt sekmeler: sekme kümesini rol (AppNav) belirler; ortadaki sekme yükseltilmiş Menü düğmesidir ── */
let lastRole='';
function renderBottomNav(){
  const bar=$('[data-ka-bottom-nav]');if(!bar||!nav())return;
  const role=nav().role(),tabs=nav().tabs(role),signed=!!user().uid,switched=signed&&!!lastRole&&role!==lastRole,sig=`${role}|${tabs.map(t=>`${t.key}:${t.label}:${t.icon}`).join('|')}`;
  lastRole=signed?role:'';
  if(bar.dataset.sig!==sig){
    bar.dataset.sig=sig;bar.dataset.role=role;
    bar.innerHTML=tabs.map((t,i)=>i===2?`<button class="ka-bottom-item ka-bottom-menu" type="button" data-ka-tab="${t.key}"><span class="ka-bottom-menu-icon">${nav().icon(t.icon,24,2.2)}</span><span>${esc(t.label)}</span></button>`:`<button class="ka-bottom-item" type="button" data-ka-tab="${t.key}"><span class="ka-bottom-icon">${nav().icon(t.icon,22,2)}</span><span>${esc(t.label)}</span></button>`).join('');
  }
  if(switched){navStack=[homeView()];home()}else setBottomActive(activeAction)
}
/* Araç sayfasından başka bir yüzeye geçerken açık araç çalışma alanlarını kapatır; bir araç kapanmayı reddederse false döner. */
function leaveToolSurfaces(keep={}){
  if(global.GradebookPage?.page&&global.GradebookPage.page!==keep.gradebook&&global.GradebookPage.close?.()===false)return false;
  if(!keep.studentList)global.OgretmenListeUI?.close?.();
  if(!keep.attendance)global.StudentPages?.close?.();
  if(!keep.form)cleanupFormPage();
  return true
}
/* Sekme sayfası (Menü, menü sayfası, Programım, Ben): NavPages çizer, geri yığınına "nav" görünümü olarak girer. */
function openPage(id,{remember=true,fresh=false}={}){
  closeHeaderPopover();
  const v=navView(id);
  if(!v||!global.NavPages)return home();
  if(!leaveToolSurfaces())return false;
  suspendModuleForShellSurface();
  if(fresh)navStack=[homeView()];
  if(!global.NavPages.render(v.page))return home();
  setBottomActive(v.bottom);setTitle(v.title);
  if(remember)rememberView(v);else syncShellBack();
  return true
}
function openTab(key){
  if(key==='home')return home();
  if(String(key).startsWith('tool:')){
    const t=nav().tool(String(key).slice(5));
    if(!t||!nav().toolAllowed(t))return home();
    navStack=[homeView()];
    return routeModule(t.route,{page:t.page,title:t.label,bottom:key});
  }
  return openPage(key,{fresh:true});
}
function syncVisibilityClasses(){for(const id of ['girisEkrani','onayBekleniyorEkrani','app']){const el=document.getElementById(id);if(el)el.classList.toggle('ka-hidden',el.hidden)}}
function observeVisibility(){if(visibilityObserver)return;syncVisibilityClasses();visibilityObserver=new MutationObserver(syncVisibilityClasses);for(const id of ['girisEkrani','onayBekleniyorEkrani','app']){const el=document.getElementById(id);if(el)visibilityObserver.observe(el,{attributes:true,attributeFilter:['hidden']})}}
function profileName(u){return u.adSoyad||[u.ad,u.soyad].filter(Boolean).join(' ')||u.displayName||u.kullaniciAdi||'Kullanıcı'}
function profileRole(u){return u.unvan||u.rolAdi||u.rol||u.brans||'Koruk Asistan Kullanıcısı'}
function profileBadge(){const u=user(),r=global.AKTIF_ROL||global.AppStore?.get?.('session.role')||arr('roller').find(x=>x.id===u.rolId)||{};return String(u.unvan||r.ad||r.rolAdi||u.rolAdi||(u.admin===true?'Yönetici':'')||'').replace(/\s+/g,' ').trim()}
function profileChip(){const b=profileBadge();return b?`<b class="ka-avatar-chip">${esc(b)}</b>`:''}
function profileTeacherId(){const u=user();return u.bagliOgretmenId||u.ogretmenId||''}
function linkedTeacher(){const id=profileTeacherId();return id?arr('ogretmenler').find(x=>String(x.id)===String(id))||null:null}
function profileInfo(){const u=user(),t=linkedTeacher(),name=t?[t.ad,t.soyad].filter(Boolean).join(' '):profileName(u),role=t?.brans||profileRole(u),photo=u.profilFotoUrl||u.photoURL||u.fotoUrl||t?.profilFotoUrl||t?.fotoUrl||'',username=u.kullaniciAdi?`@${u.kullaniciAdi}`:(u.email||'');return{u,t,name,role,photo,username}}
const PROFILE_DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const PROFILE_TASK_TYPES=[['sok','ŞÖK','🛡️'],['zumre','Zümre','👥'],['belirliGunler','Belirli Gün ve Haftalar','📅'],['rehberlik','Rehberlik','🧭'],['maarifRapor','Maarif Model','🏅'],['bepPlani','Yıllık / BEP Planı','📋'],['sosyalKulupler','Sosyal Kulüp','♡'],['digerEvrak','Diğer Evrak','📁']];
function profileRecordTeacherIds(type,row){if(!row)return[];if(type==='sosyalKulupler')return Array.isArray(row.ogretmenIdler)?row.ogretmenIdler.filter(Boolean):(row.ogretmenId?[row.ogretmenId]:[]);return row.ogretmenId?[row.ogretmenId]:[]}
function profileOwnSchedule(tid=profileTeacherId()){if(!tid)return[];return arr('dersProgrami').filter(x=>String(x.ogretmenId||'')===String(tid)).slice().sort((a,b)=>PROFILE_DAYS.indexOf(a.gun)-PROFILE_DAYS.indexOf(b.gun)||(Number(a.saat)||0)-(Number(b.saat)||0))}
function profileOwnDuties(tid=profileTeacherId()){if(!tid)return[];const today=new Date().toISOString().slice(0,10);return arr('nobetAtamalari').filter(x=>String(x.ogretmenId||'')===String(tid)).slice().sort((a,b)=>{const af=String(a.tarih||'')>=today,bf=String(b.tarih||'')>=today;if(af!==bf)return af?-1:1;return af?String(a.tarih||'').localeCompare(String(b.tarih||'')):String(b.tarih||'').localeCompare(String(a.tarih||''))})}
function profileOwnExams(tid=profileTeacherId(),uid=user().uid||''){if(!tid&&!uid)return[];return arr('sinavlar').filter(x=>(tid&&String(x.ogretmenId||'')===String(tid))||(!x.ogretmenId&&uid&&String(x.sahipUid||'')===String(uid))).slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))||String(a.ders||'').localeCompare(String(b.ders||''),'tr',{sensitivity:'base'}))}
function profileTaskTitle(type,row,label){if(type==='sosyalKulupler')return row.ad||row.kulupAdi||label;if(type==='zumre')return row.brans||row.ad||label;if(type==='sok')return row.sinif?`${row.sinif} ŞÖK`:(row.ad||label);if(type==='bepPlani')return row.ogrenciAdi||[row.brans,row.sinif].filter(Boolean).join(' · ')||label;if(type==='rehberlik')return row.ad||row.sinif||label;if(type==='maarifRapor')return [row.ders,row.sinif].filter(Boolean).join(' · ')||row.ad||label;return row.ad||row.baslik||row.konu||label}
function profileTaskMeta(row,label){return [label,row.sinif,row.brans||row.ders,row.tarih||row.baslangicTarihi||row.yillikPlanTarihi].filter(Boolean).join(' · ')}
function profileOwnCommittees(tid=profileTeacherId()){if(!tid)return[];return arr('kurulKomisyonlar').filter(r=>String(r.baskanId||'')===String(tid)||[...(Array.isArray(r.asilUyeler)?r.asilUyeler:[]),...(Array.isArray(r.yedekUyeler)?r.yedekUyeler:[])].some(m=>m?.tur==='ogretmen'&&String(m.id)===String(tid))).map(r=>({id:r.id,ad:r.ad||'Kurul / Komisyon',yil:r.egitimOgretimYili||'',rol:String(r.baskanId||'')===String(tid)?'Başkan':(Array.isArray(r.yedekUyeler)&&r.yedekUyeler.some(m=>m?.tur==='ogretmen'&&String(m.id)===String(tid))?'Yedek Üye':'Asil Üye')})).sort((a,b)=>String(b.yil).localeCompare(String(a.yil))||a.ad.localeCompare(b.ad,'tr'))}
function profileOwnTasks(tid=profileTeacherId()){if(!tid)return[];const rows=[];for(const [type,label,icon] of PROFILE_TASK_TYPES)for(const row of arr(type)){if(!profileRecordTeacherIds(type,row).map(String).includes(String(tid)))continue;rows.push({type,label,icon,row,title:profileTaskTitle(type,row,label),meta:profileTaskMeta(row,label)})}return rows.sort((a,b)=>String(a.label).localeCompare(String(b.label),'tr',{sensitivity:'base'})||String(a.title).localeCompare(String(b.title),'tr',{sensitivity:'base'}))}
function profileFmtDate(value){if(!value)return'—';const s=String(value).slice(0,10),d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?s:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'short',year:'numeric'})}
function profileContactHtml({handle='',phone='',email=''}){const seen=new Set();return [['@',String(handle||'').startsWith('@')?String(handle).slice(1):''],['☎',phone],['✉',email]].map(([icon,value])=>[icon,String(value||'').trim()]).filter(([,value])=>value).filter(([,value])=>{const key=value.toLocaleLowerCase('tr');if(seen.has(key))return false;seen.add(key);return true}).map(([icon,value])=>`<span class="ka-profile-contact__item"><b aria-hidden="true">${icon}</b><span>${esc(value)}</span></span>`).join('')}
async function profilePhotoUpdate(file){
  if(!file)return;const root=$('#v2ModuleRoot'),buttons=$$('[data-profile-photo-pick]',root);buttons.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true')});
  try{
    if(typeof global.kendiProfilFotografimiGuncelle!=='function')throw new Error('Profil fotoğrafı özelliği hazır değil.');
    await global.kendiProfilFotografimiGuncelle(file);global.toast?.('Profil fotoğrafınız güncellendi.');renderProfile({remember:false});
  }catch(e){console.error('[Profile/photo]',e);global.toast?.(e?.message||'Profil fotoğrafı güncellenemedi.');buttons.forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy')})}
}
async function profilePhotoCrop(file){
  const cropper=global.PhotoCropper;if(!file)return;
  if(!cropper){profilePhotoUpdate(file);return}
  try{const cropped=await cropper.open(file,{badge:profileBadge()});if(cropped)profilePhotoUpdate(cropped)}
  catch(e){console.error('[Profile/photo-crop]',e);global.toast?.(e?.message||'Fotoğraf açılamadı.')}
}
function renderProfile({remember=true}={}){
  closeHeaderPopover();suspendModuleForShellSurface();setBottomActive('me');if(remember)rememberView({kind:'profile'});setTitle('Profilim');
  const {u,t,name,role,photo,username}=profileInfo(),root=$('#v2ModuleRoot');if(!root)return;
  const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr'),schedule=profileOwnSchedule(),duties=profileOwnDuties(),exams=profileOwnExams(),tasks=profileOwnTasks(),committees=profileOwnCommittees(),phone=t?.telefon||u.telefon||'',email=t?.email||t?.eposta||u.email||'',handle=String(username||'').startsWith('@')?username:'';
  const contact=profileContactHtml({handle,phone,email});
  const stat=(icon,value,label)=>`<article class="ka-profile-stat"><span class="ka-profile-stat__icon" aria-hidden="true">${icon}</span><b>${value}</b><small>${esc(label)}</small></article>`;
  const action=(kind,icon,title,desc,count)=>`<button type="button" class="ka-profile-action" data-profile-view="${kind}"><span class="ka-profile-action__icon" aria-hidden="true">${icon}</span><span class="ka-profile-action__copy"><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="ka-profile-action__count"><b>${count}</b><small>kayıt</small></span><span class="ka-profile-action__chevron" aria-hidden="true">›</span></button>`;
  root.innerHTML=`<section class="ka-profile-page"><article class="ka-profile-hero"><div class="ka-profile-photo"><div class="ka-profile-avatar-wrap"><div class="ka-profile-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:esc(initials||'K')}</div>${profileChip()}<button type="button" class="ka-profile-photo-edit" data-profile-photo-pick aria-label="Profil fotoğrafını ${photo?'değiştir':'ekle'}"><span aria-hidden="true">📷</span></button></div><button type="button" class="ka-profile-photo-label" data-profile-photo-pick>${photo?'Fotoğrafı Değiştir':'Fotoğraf Ekle'}</button><input type="file" accept="image/jpeg,image/png,image/webp" data-profile-photo-input hidden></div><div class="ka-profile-copy"><span class="ka-profile-eyebrow">${esc(nav().roleLabel(nav().role()).toLocaleUpperCase('tr'))} PROFİLİ</span><h2>${esc(name)}</h2><p class="ka-profile-role">${esc(role)}</p>${contact?`<div class="ka-profile-contact">${contact}</div>`:''}</div></article><div class="ka-profile-stats" aria-label="Kişisel kayıt özeti">${stat('📅',schedule.length,'Ders')}${stat('🛡️',duties.length,'Nöbet')}${stat('📝',exams.length,'Sınav')}${stat('🗂️',tasks.length,'Görev')}</div><section class="ka-profile-section"><div class="ka-profile-section__head"><span>ÇALIŞMA ALANI</span><h3>Kişisel işlemlerim</h3><p>Yalnız öğretmen kaydınıza bağlı içeriklere hızlıca ulaşın.</p></div><div class="ka-profile-actions">${action('schedule','📅','Ders Programım','Haftalık ders programınız',schedule.length)}${action('duty','🛡️','Nöbetlerim','Size atanmış nöbetler',duties.length)}${action('exams','📝','Sınavlarım','Size atanmış yazılı sınavlar',exams.length)}${action('tasks','🗂️','Diğer Görevlerim','ŞÖK, zümre ve diğer görevler',tasks.length)}${action('committees','🏛️','Kurul ve Komisyonlar','Görev aldığınız kurul ve komisyonlar',committees.length)}</div></section></section>`;
  $$('[data-profile-view]',root).forEach(b=>b.addEventListener('click',()=>{const kind=b.dataset.profileView;if(kind==='schedule'||kind==='duty')openPage('program');else renderProfileDetail(kind)}));
  const photoInput=root.querySelector('[data-profile-photo-input]');$$('[data-profile-photo-pick]',root).forEach(b=>b.addEventListener('click',()=>photoInput?.click()));if(photoInput)photoInput.addEventListener('change',()=>{const file=photoInput.files?.[0];photoInput.value='';if(file)profilePhotoCrop(file)});
}
function profileCommitteeBody(rows){return rows.length?rows.map(x=>'<article class="ka-card"><div class="ka-card__body ka-row"><span class="ka-avatar">🏛️</span><div class="ka-grow"><strong>'+esc(x.ad)+'</strong><div class="ka-muted">'+esc(x.yil||'')+'</div></div><span class="ka-badge">'+esc(x.rol)+'</span></div></article>').join(''):'<div class="ka-empty">Görev aldığınız kurul veya komisyon bulunmuyor.</div>'}
/* Not: Bu sayfa her zaman ShellUI'nin genel geri çubuğuyla (data-ka-shell-back) birlikte
 * açılır (rememberView() navStack'e eklediği için). Burada ayrıca bir geri düğmesi
 * göstermek (eskiden data-profile-back, back()'i çağırıyordu — genel çubukla birebir
 * aynı işlev) ekranda iki geri düğmesine yol açıyordu. Kaldırıldı. */
function profileDetailHead(title,subtitle){return `<div class="ka-row"><div class="ka-grow"><h2>${esc(title)}</h2><p class="ka-muted">${esc(subtitle)}</p></div></div>`}
function profileExamBody(rows){return rows.length?rows.map(x=>`<button type="button" class="ka-profile-action" data-profile-exam-open="${esc(x.id)}"><span class="ka-profile-action__icon" aria-hidden="true">📝</span><span class="ka-profile-action__copy"><strong>${esc(x.ders||x.ad||'Yazılı sınav')}</strong><small>${esc([x.siniflar||x.sinif,x.donem,x.yaziliSirasi,profileFmtDate(x.tarih)].filter(Boolean).join(' · ')||'Sınıf bilgisi yok')}</small></span><span class="ka-profile-action__chevron" aria-hidden="true">›</span></button>`).join(''):'<div class="ka-empty">Size atanmış yazılı sınav kaydı bulunamadı.</div>'}
function profileTaskBody(rows){return rows.length?rows.map(x=>`<article class="ka-card"><div class="ka-card__body ka-row"><span class="ka-avatar">${x.icon}</span><div class="ka-grow"><strong>${esc(x.title)}</strong><div class="ka-muted">${esc(x.meta||x.label)}</div></div><span class="ka-badge">${esc(x.label)}</span></div></article>`).join(''):'<div class="ka-empty">Size bağlı ŞÖK, zümre, belirli gün/hafta, rehberlik, Maarif Model veya yıllık/BEP kaydı bulunamadı.</div>'}
async function openProfileExam(id){if(!id)return false;const ok=await routeModule('academic',{bottom:'me',page:'written',title:'Yazılı Sınavlar'});if(!ok)return false;const opened=global.AcademicModule?.openWrittenExam?.(id);if(opened===false)global.toast?.('Sınav kaydı açılamadı.');return opened!==false}
function renderProfileDetail(kind,{remember=true}={}){closeHeaderPopover();suspendModuleForShellSurface();setBottomActive('me');const root=$('#v2ModuleRoot');if(!root)return;const defs={exams:['Sınavlarım','Yalnız size atanmış yazılı sınavlar gösteriliyor.'],tasks:['Diğer Görevlerim','Yalnız öğretmen kaydınıza bağlı çizelge ve görevler gösteriliyor.'],committees:['Kurul ve Komisyonlar','Görev aldığınız kurul ve komisyonlar.']},def=defs[kind]||defs.tasks;setTitle(def[0]);if(remember)rememberView({kind:'profile-detail',page:kind,title:def[0]});let body='';if(kind==='exams')body=profileExamBody(profileOwnExams());else if(kind==='committees')body=profileCommitteeBody(profileOwnCommittees());else body=profileTaskBody(profileOwnTasks());root.innerHTML=`<section class="ka-stack">${profileDetailHead(def[0],def[1])}${body}</section>`;if(kind==='exams')root.querySelectorAll('[data-profile-exam-open]').forEach(b=>b.addEventListener('click',()=>openProfileExam(b.dataset.profileExamOpen)))}
function currentTheme(){return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'}
function syncThemeButton(){const dark=currentTheme()==='dark';global.AppStore?.set?.('ui.theme',dark?'dark':'light');const root=getComputedStyle(document.documentElement),systemBar=root.getPropertyValue('--ka-system-bar-bg').trim(),meta=$('meta[data-ka-theme-color]');if(meta&&systemBar)meta.content=systemBar}
async function applyTheme(theme,{persist=true}={}){const next=theme==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',next);document.documentElement.style.colorScheme=next;try{localStorage.setItem('ka-theme',next)}catch(_){}syncThemeButton();try{const root=getComputedStyle(document.documentElement),renk=root.getPropertyValue('--ka-system-bar-bg').trim(),acikMi=root.getPropertyValue('--ka-system-bar-icon-mode').trim()==='dark';const plugin=global.Capacitor?.Plugins?.StatusBarPlugin;if(plugin?.temaUygula&&renk)await plugin.temaUygula({renk,acikMi})}catch(e){console.warn('[Shell/theme/system-bars]',e)}if(persist){const uid=user().uid;if(uid&&global.KorukLocalFirst?.meta)await global.KorukLocalFirst.meta(uid,'theme',next).catch(()=>{})}window.dispatchEvent(new CustomEvent('koruk:theme-changed',{detail:{theme:next}}));return next}
function toggleTheme(){themeTouched=true;return applyTheme(currentTheme()==='dark'?'light':'dark')}
function themeChosen(){return themeTouched||global.KorukTheme?.touched===true}
async function persistChosenTheme(){const uid=user().uid;if(uid&&global.KorukLocalFirst?.meta){try{await global.KorukLocalFirst.meta(uid,'theme',currentTheme())}catch(_){}}}
async function hydrateTheme(){if(themeChosen()){syncThemeButton();persistChosenTheme();return currentTheme()}const uid=user().uid;let saved=global.AppStore?.get?.('ui.theme')||null;if(uid){try{saved=(await global.KorukLocalFirst?.meta?.(uid,'theme'))||saved}catch(_){}}if(themeChosen()){syncThemeButton();persistChosenTheme();return currentTheme()}if(saved!=='dark'&&saved!=='light'){try{saved=localStorage.getItem('ka-theme')||saved}catch(_){}}if(saved!=='dark'&&saved!=='light')saved=currentTheme();await applyTheme(saved,{persist:false});return saved}
function takeThemeOwnership(){if(!global.AppLoader)return;global.AppLoader.applyTheme=applyTheme;global.AppLoader.toggleTheme=toggleTheme}
function dateOf(x){const v=x?.tarih||x?.sonTarih||x?.baslangicTarihi||x?.olusturmaTarihi||x?.guncellenmeTarihi;if(!v)return null;try{const d=v?.toDate?v.toDate():new Date(String(v).length===10?`${v}T00:00:00`:v);return isNaN(d)?null:d}catch(_){return null}}
function notificationRows(){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),limit=new Date(today.getTime()+14*86400000),rows=[],u=user(),me=u.uid||'',tid=u.bagliOgretmenId||u.ogretmenId||'',teacher=isTeacherUser(),within=d=>!!d&&d>=today&&d<=limit;
  const pushUpcoming=(x,{type,icon,module,page='',routeTitle,date,time=''})=>{if(!within(date)||!pageAllowed(module,page))return;rows.push({kind:'upcoming',type,icon,title:x.baslik||x.ad||x.ders||x.sinavAdi||x.konu||x.aciklama||type,date,time,id:x.id,module,page,routeTitle,count:1})};
  for(const x of arr('hatirlaticilar')){if(x?.tamamlandi===true)continue;pushUpcoming(x,{type:'Hatırlatıcı',icon:'⏰',module:'communication',page:'calendar',routeTitle:'Takvim',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('sinavlar')){if(teacher&&tid&&x?.ogretmenId&&x.ogretmenId!==tid)continue;pushUpcoming(x,{type:'Yazılı Sınav',icon:'📝',module:'academic',page:'written',routeTitle:'Yazılı Sınavlar',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('denemeSinavlari')){if(teacher&&tid&&x?.ogretmenId&&x.ogretmenId!==tid)continue;pushUpcoming(x,{type:'Deneme Sınavı',icon:'🧪',module:'academic',page:'trial',routeTitle:'Deneme Sınavları',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('gorevler')){if(x?.tamamlandi===true||['tamamlandi','tamamlandı'].includes(String(x?.durum||'').toLocaleLowerCase('tr-TR')))continue;if(teacher&&tid&&Array.isArray(x?.sorumluOgretmenIdler)&&x.sorumluOgretmenIdler.length&&!x.sorumluOgretmenIdler.includes(tid))continue;const direct=pageAllowed('management','tasks');pushUpcoming(x,{type:'Görev',icon:'✓',module:direct?'management':'communication',page:direct?'tasks':'calendar',routeTitle:direct?'Aylık İşler':'Takvim',date:dateOf(x)})}
  if(me)for(const k of arr('konusmalar')){const unread=Number(k?.okunmayanlar?.[me]||0);if(unread<1)continue;const diger=Object.entries(k.katilimciAdlari||{}).filter(([id])=>id!==me).map(([,ad])=>ad).filter(Boolean).join(', '),title=k.grupMu?(k.grupAdi||'Grup mesajı'):(diger||'Yeni mesaj'),d=dateOf(k.sonMesaj||k)||now;rows.push({kind:'message',type:'Mesaj',icon:'💬',title,date:d,time:'',id:k.id,module:'communication',page:'messages',routeTitle:'Mesajlaşma',count:unread,meta:`${unread} okunmamış mesaj`})}
  if(me)for(const d of arr('duyurular')){if(d?.arsivlendi===true||d?.aktif===false||d?.okuyanlar?.[me])continue;const dt=dateOf(d)||now;rows.push({kind:'announcement',type:'Duyuru',icon:'📣',title:d.baslik||'Yeni duyuru',date:dt,time:'',id:d.id,module:'communication',page:'announcements',routeTitle:'Duyurular',count:1,meta:'Okunmamış duyuru'})}
  const priority=r=>r.kind==='upcoming'?0:r.kind==='message'?1:2;
  return rows.sort((a,b)=>priority(a)-priority(b)||(a.kind==='upcoming'?a.date-b.date:b.date-a.date)).slice(0,30)
}
function formatNoticeDate(d,time=''){const ds=new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);return `${ds}${time?` · ${time}`:''}`}
function updateNotificationBadge(){const rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),bell=$('[data-ka-header-notification]'),b=$('[data-ka-notification-count]');if(b){b.textContent=count>99?'99+':String(count);b.hidden=count<1}if(bell)bell.hidden=false}
function notificationTone(r){
  const t=String(r?.type||'').toLocaleLowerCase('tr-TR');
  if(r?.kind==='message')return 'message';
  if(r?.kind==='announcement')return 'announcement';
  if(t.includes('hatırlat'))return 'reminder';
  if(t.includes('deneme'))return 'trial';
  if(t.includes('sınav'))return 'exam';
  if(t.includes('görev'))return 'task';
  return 'default';
}
function openNotifications(){
  const anchor=$('[data-ka-header-notification]');if(!anchor)return;
  const p=popoverBase(anchor,332),rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),upcomingCount=rows.filter(r=>r.kind==='upcoming').length;
  p.classList.add('ka-notification-popover');
  p.innerHTML=`<div class="ka-notification-popover__head"><span class="ka-notification-popover__mark" aria-hidden="true">${SVG.note}</span><span class="ka-notification-popover__title"><strong>Bildirimler</strong><small>${upcomingCount?`${upcomingCount} yaklaşan etkinlik`:'Yaklaşan etkinlik yok'}</small></span>${count?`<span class="ka-notification-popover__count" aria-label="${count} bildirim">${count>99?'99+':count}</span>`:''}</div><div class="ka-notification-popover__list">${rows.length?rows.map((r,i)=>{const tone=notificationTone(r),meta=r.meta||formatNoticeDate(r.date,r.time),showDate=!r.meta;return `<button type="button" class="ka-notification-row ka-notification-row--${tone}" data-notice-index="${i}"><span class="ka-notification-row__icon" aria-hidden="true">${r.icon}</span><span class="ka-notification-row__copy"><span class="ka-notification-row__top"><strong>${esc(r.title)}</strong>${Number(r.count)>1?`<b class="ka-notification-row__quantity">${Number(r.count)>99?'99+':Number(r.count)}</b>`:''}</span><span class="ka-notification-row__meta"><b>${esc(r.type)}</b>${showDate?`<i aria-hidden="true"></i><span>${esc(meta)}</span>`:`<span>${esc(meta)}</span>`}</span></span><span class="ka-notification-row__chevron" aria-hidden="true">${SVG.chevron}</span></button>`}).join(''):'<div class="ka-notification-empty"><span aria-hidden="true">✓</span><strong>Yeni bildirim yok</strong><small>Yaklaşan etkinlik ve okunmamış bildirim bulunmuyor.</small></div>'}</div>`;
  $$('[data-notice-index]',p).forEach(b=>b.addEventListener('click',()=>{const r=rows[Number(b.dataset.noticeIndex)];if(!r)return;closeHeaderPopover();routeModule(r.module,{page:r.page||'',title:r.routeTitle||r.type})}))
}
function norm(v){return String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
const SEARCH_CATEGORIES=[['all','Tümü'],['tool','🧰 Sayfa'],['teacher','👩‍🏫 Öğretmen'],['student','👨‍🎓 Öğrenci'],['staff','🧑‍💼 Personel'],['service','🚌 Servis'],['note','📝 Not']];
function checkedSet(root,selector){return new Set($$(selector,root).filter(x=>x.checked).map(x=>x.value).filter(Boolean))}
function searchFilterState(root){return{category:root.querySelector('[data-search-category][aria-pressed="true"]')?.dataset.searchCategory||'all',classes:checkedSet(root,'[data-search-class]'),services:checkedSet(root,'[data-search-service]'),clubs:checkedSet(root,'[data-search-club]'),gender:root.querySelector('[data-search-gender][aria-pressed="true"]')?.dataset.searchGender||''}}
function searchActiveFilterCount(root){const f=searchFilterState(root);return f.classes.size+f.services.size+f.clubs.size+(f.gender?1:0)}
function searchRows(q,f={category:'all',classes:new Set(),services:new Set(),clubs:new Set(),gender:''}){
  const n=norm(q),rows=[],category=f.category||'all',advanced=!!(f.classes?.size||f.services?.size||f.clubs?.size||f.gender),accept=(cat,hay)=>!advanced&&(category==='all'||category===cat)&&(!n||norm(hay).includes(n)),studentAccept=(x,hay)=>{if(category!=='all'&&category!=='student')return false;if(f.classes?.size&&!f.classes.has(x.sinifId||''))return false;if(f.services?.size&&!f.services.has(x.servisId||''))return false;if(f.clubs?.size&&!f.clubs.has(x.kulupId||''))return false;if(f.gender&&norm(x.cinsiyet)!==norm(f.gender))return false;return!n||norm(hay).includes(n)},push=(cat,type,icon,title,meta,route,page,hay)=>{if(accept(cat,hay)&&pageAllowed(route,page))rows.push({cat,type,icon,title,meta,route,page})};
  if(!advanced&&n&&(category==='all'||category==='tool'))for(const t of nav().search(q))rows.push({cat:'tool',type:'Sayfa',icon:'🧰',title:t.label,meta:t.where||t.sub||'',route:t.route,page:t.page});
  for(const x of arr('ogretmenler')){const title=x.adSoyad||[x.ad,x.soyad].filter(Boolean).join(' ')||'Öğretmen';push('teacher','Öğretmen','👩‍🏫',title,x.brans||x.unvan||'','people','teachers',`${title} ${x.brans||''} ${x.unvan||''} ${x.telefon||''} ${x.email||''}`)}
  const classes=arr('siniflar'),services=arr('servisler'),clubs=arr('sosyalKulupler');
  for(const x of arr('veliler')){const title=x.ogrenciAdi||x.adSoyad||x.ad||'Öğrenci',sinif=classes.find(s=>s.id===x.sinifId),servis=services.find(s=>s.id===x.servisId),kulup=clubs.find(k=>k.id===x.kulupId),meta=[sinif?.ad,x.cinsiyet,x.veliAdi,servis?.guzergah||servis?.servisAdi,kulup?.ad].filter(Boolean).join(' · '),hay=`${title} ${meta} ${x.telefon||x.telefon1||''} ${x.ogrenciNo||''}`;if(studentAccept(x,hay))rows.push({cat:'student',type:'Öğrenci',icon:'👨‍🎓',title,meta,route:'people',page:'students'})}
  for(const x of arr('personel')){const title=x.adSoyad||[x.ad,x.soyad].filter(Boolean).join(' ')||'Personel';push('staff','Personel','🧑‍💼',title,x.gorev||x.unvan||'','management','staff',`${title} ${x.gorev||''} ${x.unvan||''} ${x.telefon||''} ${x.tc||''}`)}
  for(const x of services){const title=x.guzergah||x.servisAdi||x.plaka||'Servis',meta=[x.plaka,x.soforAdi].filter(Boolean).join(' · ');push('service','Servis','🚌',title,meta,'transport','services',`${title} ${meta} ${x.telefon||x.soforTelefon||''}`)}
  for(const x of arr('notlar')){const title=x.baslik||'Not',meta=String(x.icerik||'').slice(0,90);push('note','Not','📝',title,meta,'communication','notes',`${title} ${x.icerik||''} ${(x.etiketler||[]).join?.(' ')||''}`)}
  return rows.sort((a,b)=>(a.cat==='tool'?0:1)-(b.cat==='tool'?0:1)||String(a.title||'').localeCompare(String(b.title||''),'tr',{sensitivity:'base'})||String(a.type||'').localeCompare(String(b.type||''),'tr',{sensitivity:'base'})).slice(0,160)
}
function setSearchCategory(root,key){$$('[data-search-category]',root).forEach(x=>{const on=x.dataset.searchCategory===key;x.setAttribute('aria-pressed',on?'true':'false');x.classList.toggle('active',on)})}
function renderSearchResults(root,q){
  const out=root.querySelector('[data-shell-search-results]'),count=root.querySelector('[data-search-count]'),filterCount=root.querySelector('[data-search-filter-count]'),state=searchFilterState(root),activeFilters=searchActiveFilterCount(root),hasIntent=!!String(q||'').trim()||activeFilters>0||state.category!=='all';
  if(filterCount)filterCount.textContent=activeFilters?`${activeFilters} filtre`:'Filtre yok';
  if(count){count.hidden=!hasIntent;count.textContent=hasIntent?'0 sonuç':''}
  if(!out)return;
  if(!hasIntent){out.innerHTML=`<div class="ka-search-empty ka-search-empty--idle"><span aria-hidden="true">${SVG.search}</span><strong>Aramaya başlayın</strong><small>İsim, sınıf, telefon veya servis bilgisi yazın. İsterseniz yukarıdan bir kategori seçin.</small></div>`;return}
  const rows=searchRows(q,state);if(count)count.textContent=`${rows.length} sonuç`;
  out.innerHTML=rows.length?rows.map((r,i)=>`<button type="button" class="ka-search-result ka-search-result--${r.cat||'default'}" data-search-result="${i}"><span class="ka-search-result__icon" aria-hidden="true">${r.icon}</span><span class="ka-search-result__copy"><strong>${esc(r.title)}</strong><small><b>${esc(r.type)}</b>${r.meta?`<i aria-hidden="true"></i><span>${esc(r.meta)}</span>`:''}</small></span><span class="ka-search-result__arrow" aria-hidden="true">${SVG.chevron}</span></button>`).join(''):`<div class="ka-search-empty"><span aria-hidden="true">×</span><strong>Sonuç bulunamadı</strong><small>Arama metnini veya seçili filtreleri değiştirerek yeniden deneyin.</small></div>`;
  $$('[data-search-result]',out).forEach(b=>b.addEventListener('click',()=>{const r=rows[Number(b.dataset.searchResult)];if(r)routeModule(r.route,{page:r.page||'',title:r.cat==='tool'?r.title:r.type})}))
}
function renderSearch({remember=true}={}){
  closeHeaderPopover();suspendModuleForShellSurface();setBottomActive('');if(remember)rememberView({kind:'search'});setTitle('Arama');const root=$('#v2ModuleRoot');if(!root)return;
  const classes=[...arr('siniflar')].sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{sensitivity:'base'})),services=[...arr('servisler')].sort((a,b)=>String(a.guzergah||a.servisAdi||'').localeCompare(String(b.guzergah||b.servisAdi||''),'tr',{sensitivity:'base'})),clubs=[...arr('sosyalKulupler')].sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{sensitivity:'base'}));
  root.innerHTML=`<section class="ka-search-page"><header class="ka-search-hero"><span class="ka-search-hero__icon" aria-hidden="true">${SVG.search}</span><div class="ka-search-hero__copy"><span>HIZLI ERİŞİM</span><h2>Arama</h2><p>Sayfa, öğretmen, öğrenci, personel, servis ve notlarda hızlı arama yapın.</p></div></header><div class="ka-search-toolbar"><label class="ka-search-box">${SVG.search}<input type="search" data-shell-search-input placeholder="Sayfa, isim, sınıf, telefon veya servis ara…" autocomplete="off" aria-label="Kayıtlarda ara"><button type="button" class="ka-search-clear" data-search-clear aria-label="Aramayı temizle" hidden>${SVG.close}</button></label><div class="ka-search-categories" data-search-categories role="group" aria-label="Arama kategorileri">${SEARCH_CATEGORIES.map(([k,l],i)=>`<button type="button" class="ka-search-category ${i===0?'active':''}" data-search-category="${k}" aria-pressed="${i===0?'true':'false'}">${l}</button>`).join('')}</div></div><details class="ka-search-filters"><summary><span class="ka-search-filters__icon" aria-hidden="true">⚙️</span><span class="ka-search-filters__copy"><strong>Gelişmiş Filtreler</strong><small>Öğrencileri sınıf, servis, kulüp ve cinsiyete göre süzün.</small></span><span class="ka-search-filters__status"><b data-search-filter-count>Filtre yok</b><i aria-hidden="true">${SVG.chevron}</i></span></summary><div class="ka-search-filters__body"><section class="ka-search-filter-group"><div class="ka-search-filter-group__head"><strong>🚌 Servisler</strong><span>${services.length}</span></div><div class="ka-search-filter-options">${services.length?services.map(s=>`<label class="ka-search-filter-chip"><input type="checkbox" data-search-service value="${esc(s.id)}"><span>${esc(s.guzergah||s.servisAdi||s.plaka||'Servis')}</span></label>`).join(''):'<span class="ka-search-filter-empty">Servis kaydı yok.</span>'}</div></section><section class="ka-search-filter-group"><div class="ka-search-filter-group__head"><strong>🏫 Sınıflar</strong><span>${classes.length}</span></div><div class="ka-search-filter-options">${classes.length?classes.map(s=>`<label class="ka-search-filter-chip ka-search-filter-chip--short"><input type="checkbox" data-search-class value="${esc(s.id)}"><span>${esc(s.ad||'Sınıf')}</span></label>`).join(''):'<span class="ka-search-filter-empty">Sınıf kaydı yok.</span>'}</div></section><section class="ka-search-filter-group"><div class="ka-search-filter-group__head"><strong>♡ Sosyal Kulüpler</strong><span>${clubs.length}</span></div><div class="ka-search-filter-options">${clubs.length?clubs.map(k=>`<label class="ka-search-filter-chip"><input type="checkbox" data-search-club value="${esc(k.id)}"><span>${esc(k.ad||'Kulüp')}</span></label>`).join(''):'<span class="ka-search-filter-empty">Sosyal kulüp kaydı yok.</span>'}</div></section><section class="ka-search-filter-group"><div class="ka-search-filter-group__head"><strong>♀♂ Cinsiyet</strong></div><div class="ka-search-gender" role="group" aria-label="Cinsiyet filtresi"><button type="button" class="active" data-search-gender="" aria-pressed="true">Tümü</button><button type="button" data-search-gender="Kız" aria-pressed="false">Kız</button><button type="button" data-search-gender="Erkek" aria-pressed="false">Erkek</button></div></section><div class="ka-search-filter-actions"><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-search-reset>Filtreleri Temizle</button><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-search-print>🖨️ Yazdır</button></div></div></details><div class="ka-search-results-head"><div><strong>Arama Sonuçları</strong><small>Sayfalar ile kişi, servis ve not kayıtları gösterilir.</small></div><span class="ka-search-count" data-search-count hidden></span></div><div class="ka-search-results" data-shell-search-results></div></section>`;
  const input=root.querySelector('[data-shell-search-input]'),clear=root.querySelector('[data-search-clear]'),refresh=()=>{const value=input?.value||'';if(clear)clear.hidden=!String(value).trim();renderSearchResults(root,value)};
  input?.addEventListener('input',refresh);clear?.addEventListener('click',()=>{if(input)input.value='';refresh();input?.focus()});
  $$('[data-search-category]',root).forEach(b=>b.addEventListener('click',()=>{setSearchCategory(root,b.dataset.searchCategory||'all');refresh()}));
  for(const cb of $$('[data-search-service],[data-search-class],[data-search-club]',root))cb.addEventListener('change',()=>{if(searchActiveFilterCount(root)>0)setSearchCategory(root,'student');refresh()});
  $$('[data-search-gender]',root).forEach(b=>b.addEventListener('click',()=>{$$('[data-search-gender]',root).forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on?'true':'false');x.classList.toggle('active',on)});if(b.dataset.searchGender)setSearchCategory(root,'student');refresh()}));
  root.querySelector('[data-search-reset]')?.addEventListener('click',()=>{$$('[data-search-service],[data-search-class],[data-search-club]',root).forEach(x=>x.checked=false);const genders=$$('[data-search-gender]',root);genders.forEach((x,i)=>{x.setAttribute('aria-pressed',i===0?'true':'false');x.classList.toggle('active',i===0)});refresh()});
  root.querySelector('[data-search-print]')?.addEventListener('click',async e=>{
    const button=e.currentTarget;
    if(button.disabled)return;
    const value=input?.value||'',state=searchFilterState(root),rows=searchRows(value,state);
    if(!rows.length){global.toast?.('Yazdırılacak arama sonucu bulunamadı.');return}
    button.disabled=true;
    try{
      if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=9');
      if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');
      const escPrint=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const filterParts=[];
      if(value.trim())filterParts.push('Arama: '+value.trim());
      if(state.category&&state.category!=='all')filterParts.push('Kategori: '+(SEARCH_CATEGORIES.find(x=>x[0]===state.category)?.[1]||state.category));
      if(state.classes.size)filterParts.push('Sınıf: '+[...state.classes].map(id=>arr('siniflar').find(x=>x.id===id)?.ad).filter(Boolean).join(', '));
      if(state.services.size)filterParts.push('Servis: '+[...state.services].map(id=>arr('servisler').find(x=>x.id===id)?.guzergah||arr('servisler').find(x=>x.id===id)?.servisAdi).filter(Boolean).join(', '));
      if(state.clubs.size)filterParts.push('Kulüp: '+[...state.clubs].map(id=>arr('sosyalKulupler').find(x=>x.id===id)?.ad).filter(Boolean).join(', '));
      if(state.gender)filterParts.push('Cinsiyet: '+state.gender);
      const body=`<div class="ka-report-meta"><strong>Filtrelenmiş sonuçlar: ${rows.length}</strong>${filterParts.length?`<div class="ka-muted">${filterParts.map(escPrint).join(' · ')}</div>`:''}</div><table class="ka-table"><thead><tr><th style="width:36px">#</th><th>Ad / Başlık</th><th>Tür</th><th>Detay</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escPrint(r.title)}</td><td>${escPrint(r.type)}</td><td>${escPrint(r.meta||'')}</td></tr>`).join('')}</tbody></table>`;
      await global.ReportEngine.printReport('Arama Sonuçları',body,{fileName:'Arama_Sonuclari',yon:'dikey',logoGoster:false,tarihGoster:true,compact:true,fontSize:9,kenarBosluk:8});
    }catch(err){console.error('[Search/print]',err);global.toast?.('Arama sonuçları yazdırılamadı: '+(err?.message||err))}
    finally{button.disabled=false}
  });refresh();setTimeout(()=>input?.focus(),30)
}
function mountQuickNote(ov){document.body.appendChild(ov);document.body.classList.add('ka-layer-open');return ov}
function closeQuickNote(){document.getElementById('kaQuickNoteModal')?.remove();document.body.classList.remove('ka-layer-open')}
function quickNoteCloseAndRestore(){closeQuickNote()}
function openTextQuickNote(){closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Metin Notu</h3><p class="ka-muted">Hızlıca metin notu oluşturun</p></div><button type="button" class="ka-icon-button" data-note-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık</span><input data-note-title placeholder="Not başlığı..."></label><label class="ka-field"><span class="ka-field__label">Notunuz</span><textarea data-note-text rows="8" placeholder="Notunuzu yazın..."></textarea></label></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;mountQuickNote(ov);const close=quickNoteCloseAndRestore;ov.querySelector('[data-note-close]')?.addEventListener('click',close);ov.querySelector('[data-note-cancel]')?.addEventListener('click',close);ov.querySelector('[data-note-save]')?.addEventListener('click',async()=>{const baslik=ov.querySelector('[data-note-title]')?.value.trim()||'Hızlı Not',icerik=ov.querySelector('[data-note-text]')?.value.trim();if(!icerik)return;try{await global.NotlarService?.notKaydet?.(null,{baslik,icerik,tip:'metin',renk:'sari',tarih:new Date().toISOString().slice(0,10),etiketler:[]});close();global.toast?.('Not kaydedildi.')}catch(e){console.error('[QuickNote/text]',e);global.toast?.('Not kaydedilemedi.')}});setTimeout(()=>ov.querySelector('[data-note-title]')?.focus(),30)}
function openChecklistQuickNote(){closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Yapılacaklar</h3><p class="ka-muted">Kontrol edilebilir görev listesi</p></div><button type="button" class="ka-icon-button" data-note-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık</span><input data-note-title placeholder="Yapılacaklar başlığı..."></label><div class="ka-stack" data-check-list></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-check-add>+ Görev ekle</button></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;mountQuickNote(ov);const list=ov.querySelector('[data-check-list]'),add=()=>{const row=document.createElement('div');row.className='ka-row';row.innerHTML='<input type="checkbox" disabled><input class="ka-grow" data-check-text placeholder="Görev yazın..."><button type="button" class="ka-icon-button" data-check-remove>×</button>';list.appendChild(row);row.querySelector('[data-check-remove]').onclick=()=>row.remove();row.querySelector('[data-check-text]').focus()};ov.querySelector('[data-check-add]').onclick=add;add();const close=quickNoteCloseAndRestore;ov.querySelector('[data-note-close]')?.addEventListener('click',close);ov.querySelector('[data-note-cancel]')?.addEventListener('click',close);ov.querySelector('[data-note-save]')?.addEventListener('click',async()=>{const baslik=ov.querySelector('[data-note-title]')?.value.trim()||'Yapılacaklar',maddeler=[...ov.querySelectorAll('[data-check-text]')].map(x=>x.value.trim()).filter(Boolean).map(metin=>({metin,tamamlandi:false}));if(!maddeler.length)return;try{await global.NotlarService?.notKaydet?.(null,{baslik,icerik:'',maddeler,tip:'todo',renk:'sari',tarih:new Date().toISOString().slice(0,10),etiketler:[]});close();global.toast?.('Yapılacaklar kaydedildi.')}catch(e){console.error('[QuickNote/checklist]',e);global.toast?.('Liste kaydedilemedi.')}})}
function quickNoteCommonFields(title=''){return `<label class="ka-field"><span class="ka-field__label">Başlık</span><input data-note-title value="${esc(title)}" placeholder="Not başlığı..."></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-note-date value="${new Date().toISOString().slice(0,10)}"></label><label class="ka-field"><span class="ka-field__label">Etiketler</span><input data-note-tags placeholder="önemli, toplantı"></label></div>`}
function quickNotePayload(ov,tip,extra={}){return{baslik:ov.querySelector('[data-note-title]')?.value.trim()||({cizim:'Çizim',goruntu:'Görsel Not',tablo:'Tablo Notu'}[tip]||'Hızlı Not'),tip,renk:'sari',tarih:ov.querySelector('[data-note-date]')?.value||new Date().toISOString().slice(0,10),etiketler:String(ov.querySelector('[data-note-tags]')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),...extra}}
function openDrawingQuickNote(){closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Çizim</h3><p class="ka-muted">El yazısı, eskiz ve serbest çizim</p></div><button type="button" class="ka-icon-button" data-note-close>${SVG.close}</button></div><div class="ka-modal__body ka-stack">${quickNoteCommonFields()}<div class="ka-row ka-wrap"><label class="ka-field ka-grow"><span class="ka-field__label">Renk</span><input type="color" data-draw-color value="#1A2A2A"></label><label class="ka-field"><span class="ka-field__label">Kalınlık</span><input type="range" data-draw-size min="1" max="18" value="4"></label><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-draw-clear>Temizle</button></div><canvas data-draw-canvas width="900" height="560" style="width:100%;height:min(48dvh,420px);background:#fff;border:1px solid var(--ka-border);border-radius:14px;touch-action:none"></canvas></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;mountQuickNote(ov);const canvas=ov.querySelector('[data-draw-canvas]'),ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';let drawing=false,last=null;const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};canvas.addEventListener('pointerdown',e=>{drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);ctx.strokeStyle=ov.querySelector('[data-draw-color]').value;ctx.lineWidth=Number(ov.querySelector('[data-draw-size]').value)||4;ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p});['pointerup','pointercancel','pointerleave'].forEach(ev=>canvas.addEventListener(ev,()=>drawing=false));ov.querySelector('[data-draw-clear]').onclick=()=>ctx.clearRect(0,0,canvas.width,canvas.height);const close=quickNoteCloseAndRestore;ov.querySelector('[data-note-close]').onclick=close;ov.querySelector('[data-note-cancel]').onclick=close;ov.querySelector('[data-note-save]').onclick=async()=>{try{await global.NotlarService?.notKaydet?.(null,quickNotePayload(ov,'cizim',{cizimData:canvas.toDataURL('image/png')}));close();global.toast?.('Çizim kaydedildi.')}catch(e){console.error('[QuickNote/drawing]',e);global.toast?.('Çizim kaydedilemedi.')}}}
function openImageQuickNote(){closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Görsel Not</h3><p class="ka-muted">Fotoğraf veya görsel not</p></div><button type="button" class="ka-icon-button" data-note-close>${SVG.close}</button></div><div class="ka-modal__body ka-stack">${quickNoteCommonFields()}<label class="ka-field"><span class="ka-field__label">Görsel</span><input type="file" accept="image/*" data-image-input></label><div data-image-preview class="ka-empty">Görsel seçilmedi.</div></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;mountQuickNote(ov);let data='';const input=ov.querySelector('[data-image-input]'),preview=ov.querySelector('[data-image-preview]');input.onchange=()=>{const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{data=String(r.result||'');preview.className='';preview.innerHTML=`<img src="${data}" alt="Görsel önizleme" style="max-width:100%;max-height:45dvh;border-radius:14px;object-fit:contain">`};r.readAsDataURL(f)};const close=quickNoteCloseAndRestore;ov.querySelector('[data-note-close]').onclick=close;ov.querySelector('[data-note-cancel]').onclick=close;ov.querySelector('[data-note-save]').onclick=async()=>{if(!data)return global.toast?.('Önce bir görsel seçin.');try{await global.NotlarService?.notKaydet?.(null,quickNotePayload(ov,'goruntu',{goruntu:data}));close();global.toast?.('Görsel not kaydedildi.')}catch(e){console.error('[QuickNote/image]',e);global.toast?.('Görsel not kaydedilemedi.')}}}
function tableQuickHtml(rows,cols,values=[]){let h='<table class="ka-table"><tbody>';for(let r=0;r<rows;r++){h+='<tr>';for(let c=0;c<cols;c++){const v=values?.[r]?.[c]||'';h+=`<${r===0?'th':'td'}><input data-table-cell data-r="${r}" data-c="${c}" value="${esc(v)}" placeholder="${r===0?'Başlık '+(c+1):'...'}"></${r===0?'th':'td'}>`}h+='</tr>'}return h+'</tbody></table>'}
function openTableQuickNote(){closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Tablo Notu</h3><p class="ka-muted">Satır ve sütunlarla düzenli kayıt</p></div><button type="button" class="ka-icon-button" data-note-close>${SVG.close}</button></div><div class="ka-modal__body ka-stack">${quickNoteCommonFields()}<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Satır</span><input type="number" min="1" max="20" value="3" data-table-rows></label><label class="ka-field"><span class="ka-field__label">Sütun</span><input type="number" min="1" max="10" value="3" data-table-cols></label></div><div style="overflow:auto" data-table-wrap>${tableQuickHtml(3,3)}</div></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;mountQuickNote(ov);const rebuild=()=>{const vals=[];ov.querySelectorAll('[data-table-cell]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);(vals[r]??=[])[c]=x.value});const rows=Math.max(1,Math.min(20,Number(ov.querySelector('[data-table-rows]').value)||3)),cols=Math.max(1,Math.min(10,Number(ov.querySelector('[data-table-cols]').value)||3));ov.querySelector('[data-table-wrap]').innerHTML=tableQuickHtml(rows,cols,vals)};ov.querySelector('[data-table-rows]').onchange=rebuild;ov.querySelector('[data-table-cols]').onchange=rebuild;const close=quickNoteCloseAndRestore;ov.querySelector('[data-note-close]').onclick=close;ov.querySelector('[data-note-cancel]').onclick=close;ov.querySelector('[data-note-save]').onclick=async()=>{const rows=Number(ov.querySelector('[data-table-rows]').value)||3,cols=Number(ov.querySelector('[data-table-cols]').value)||3,tabloVeri=[];ov.querySelectorAll('[data-table-cell]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);(tabloVeri[r]??=[])[c]=x.value.trim()});try{await global.NotlarService?.notKaydet?.(null,quickNotePayload(ov,'tablo',{tabloVeri,tabloSatir:rows,tabloSutun:cols}));close();global.toast?.('Tablo notu kaydedildi.')}catch(e){console.error('[QuickNote/table]',e);global.toast?.('Tablo notu kaydedilemedi.')}}}
function openQuickNote(){closeHeaderPopover();closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note ka-quick-note-launcher"><div class="ka-modal__header"><div><h3>Hızlı Not</h3><p class="ka-muted">Ne eklemek istiyorsunuz?</p></div><button type="button" class="ka-icon-button" data-note-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-modal__body"><div class="ka-quick-note-grid"><button type="button" data-quick-kind="text"><span>📝</span><strong>Metin Notu</strong><small>Başlık ve metin</small></button><button type="button" data-quick-kind="check"><span>☑️</span><strong>Yapılacaklar</strong><small>Kontrol edilebilir görev listesi</small></button><button type="button" data-quick-kind="draw"><span>✏️</span><strong>Çizim</strong><small>El yazısı ve serbest çizim</small></button><button type="button" data-quick-kind="image"><span>🖼️</span><strong>Görsel Not</strong><small>Fotoğraf ve açıklama</small></button><button type="button" data-quick-kind="table"><span>▦</span><strong>Tablo Notu</strong><small>Satır ve sütunlarla kayıt</small></button></div><button type="button" class="ka-quick-note-all" data-quick-kind="all"><span>📚</span><div><strong>Notlarımı Görüntüle</strong><small>Tüm notlarınıza ulaşın</small></div><b>›</b></button></div></section>`;mountQuickNote(ov);ov.querySelector('[data-note-close]')?.addEventListener('click',quickNoteCloseAndRestore);ov.querySelector('[data-quick-kind="text"]')?.addEventListener('click',openTextQuickNote);ov.querySelector('[data-quick-kind="check"]')?.addEventListener('click',openChecklistQuickNote);ov.querySelector('[data-quick-kind="draw"]')?.addEventListener('click',openDrawingQuickNote);ov.querySelector('[data-quick-kind="image"]')?.addEventListener('click',openImageQuickNote);ov.querySelector('[data-quick-kind="table"]')?.addEventListener('click',openTableQuickNote);ov.querySelector('[data-quick-kind="all"]')?.addEventListener('click',()=>{quickNoteCloseAndRestore();routeModule('communication',{page:'notes',title:'Notlarım'})})}
function home({remember=true}={}){closeHeaderPopover();setBottomActive('home');return routeModule('dashboard',{bottom:'home',title:nav().tab('home')?.label||'Ana Sayfa',remember})}
async function restoreView(view){if(!view)return false;if(view.kind==='profile'){renderProfile({remember:false});syncShellBack();return true}if(view.kind==='profile-detail'){renderProfileDetail(view.page,{remember:false});syncShellBack();return true}if(view.kind==='search'){renderSearch({remember:false});syncShellBack();return true}if(view.kind==='nav'){openPage(view.page,{remember:false});syncShellBack();return true}if(view.kind==='route'){const ok=await routeModule(view.name,{bottom:view.bottom||'',page:view.page||'',title:view.title||'',remember:false});syncShellBack();return ok}return false}
function closeTransientForBack(){
  if(headerPopover){closeHeaderPopover();return true}
  if(document.getElementById('kaQuickNoteModal')){quickNoteCloseAndRestore();return true}
  const rubricSettings=document.querySelector('.ka-rubric-settings-backdrop');
  if(rubricSettings){
    rubricSettings.remove();
    return true;
  }
  const rubricOverlay=document.getElementById('kaRubricOverlay');
  if(rubricOverlay){
    rubricOverlay.remove();
    document.body.classList.remove('dlk-overlay-acik','ka-rubric-open');
    global._pullToRefreshAyarla?.(true);
    /* Kriter/Proje artık bağımsız route'tur: overlay kapanırken bir üst route'a dön. */
    global.ShellUI?.back?.();
    return true;
  }
  const modals=[...document.querySelectorAll('.ka-modal-backdrop,[role="dialog"]')].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden');
  const modal=modals[modals.length-1];
  if(modal){
    /* Android geri: açık modal varsa alttaki route'a kesinlikle geçme. */
    const close=modal.querySelector('[data-close],[data-modal-close],[data-note-close],[data-bus-close],[data-people-modal-close],[data-cizelge-cancel],[aria-label="Kapat"],[data-user-close],[data-role-close],[data-reference-close]');
    if(close){close.click();return true}
    modal.remove();
    return true;
  }
  if(global.TransportModule?.back?.())return true;
  if(global.PeopleModule?.back?.())return true;
  if(global.AcademicModule?.back?.())return true;
  return false
}
function visibleShellModule(){
  const root=$('#v2ModuleRoot');if(!root)return '';
  for(const [name,selector] of Object.entries(MODULE_ROOT_SELECTORS)){
    if(root.querySelector(selector))return name;
  }
  return '';
}
function rearmBrowserBack(){if(!browserBackBound)return;if(history.state?.kaShellGuard!=='active')history.pushState({kaShellGuard:'active'},'')}
async function handleAppBack({fromPop=false}={}){let handled=closeTransientForBack();const current=navStack[navStack.length-1];
if(!handled&&current?.kind==='route'&&current.name==='tools'&&['homework','grades'].includes(current.page)&&global.GradebookPage?.page){if(global.GradebookPage.close?.()===false)return true}
if(!handled&&current?.kind==='route'&&current.name==='settings'&&current.page!=='data'&&global.SettingsModule?.currentPage?.()!=='home'){handled=global.SettingsModule?.back?.()===true}
if(!handled&&navStack.length>1){navStack.pop();handled=await restoreView(navStack[navStack.length-1])}
if(!handled&&navStack.length===1&&navStack[0]?.kind==='route'&&navStack[0]?.name!=='dashboard'){
  navStack=[homeView()];
  handled=await routeModule('dashboard',{bottom:'home',remember:false});
}
if(!handled&&navStack.length===1&&navStack[0]?.name==='dashboard'){
  const visible=visibleShellModule();
  if(visible&&visible!=='dashboard'){
    navStack=[homeView()];
    handled=await routeModule('dashboard',{bottom:'home',remember:false});
  }
}
if(handled){if(fromPop)rearmBrowserBack();return true}if(!confirm('Uygulamadan çıkmak istediğinize emin misiniz?')){if(fromPop)rearmBrowserBack();return false}const nativeExit=global.AndroidUygulamadanCikKopru?.uygulamadanCik;if(nativeExit){try{nativeExit.call(global.AndroidUygulamadanCikKopru);return true}catch(e){console.error('[Shell/NativeExit]',e)}}const app=global.Capacitor?.Plugins?.App;if(app?.exitApp){try{await app.exitApp();return true}catch(_){}}if(fromPop){browserExitApproved=true;browserExitFromPop=true;history.back()}else{browserExitApproved=true;browserExitFromPop=false;history.back()}return true}
function installBackNavigation(){if(browserBackBound)return;browserBackBound=true;history.replaceState({kaShellGuard:'root'},'');history.pushState({kaShellGuard:'active'},'');window.addEventListener('popstate',()=>{if(browserExitApproved){const fromPop=browserExitFromPop;browserExitApproved=false;browserExitFromPop=false;if(fromPop)return;history.back();return}handleAppBack({fromPop:true})})}
function back(){return handleAppBack()}
async function openGuideHelp(){if(await ensureGuide())global.KorukGuide.openContext()}
function bindHeader(){document.addEventListener('click',e=>{const backBtn=e.target.closest('[data-ka-shell-back]');if(backBtn){e.preventDefault();back();return}const guideBtn=e.target.closest('[data-ka-guide-help]');if(guideBtn){e.preventDefault();openGuideHelp();return}const wxChip=e.target.closest('[data-ka-weather]');if(wxChip&&!wxChip.hidden){e.preventDefault();global.SchoolLiveStatus?.openWeather?.();return}const homeBtn=e.target.closest('[data-ka-home-trigger]');if(homeBtn){home();return}const searchBtn=e.target.closest('[data-ka-header-search]');if(searchBtn){e.preventDefault();renderSearch();return}const noticeBtn=e.target.closest('[data-ka-header-notification]');if(noticeBtn&&!noticeBtn.hidden){e.preventDefault();openNotifications()}})}
function bindBottom(){document.addEventListener('click',e=>{const btn=e.target.closest('[data-ka-tab]');if(!btn)return;e.preventDefault();openTab(btn.dataset.kaTab)})}
function hydrateHeader(){updateNotificationBadge();syncThemeButton()}
function onRoleChanged(){renderBottomNav()}
function init(){installBuiltInPageRoutes();installBackNavigation();observeVisibility();takeThemeOwnership();bindHeader();bindBottom();renderBottomNav();syncShellBack();hydrateHeader();hydrateTheme();window.addEventListener('koruk:app-ready',()=>{installBackNavigation();takeThemeOwnership();syncVisibilityClasses();hydrateHeader();hydrateTheme();renderBottomNav()});window.addEventListener('koruk:nav-role-changed',onRoleChanged);for(const ev of ['koruk:permissions-changed','koruk:app-config-changed','koruk:nav-layout-changed'])window.addEventListener(ev,renderBottomNav);global.AppStore?.subscribe?.('session.user',()=>{syncVisibilityClasses();hydrateHeader();hydrateTheme();renderBottomNav()});global.AppStore?.subscribe?.('data.ogretmenler',()=>{hydrateHeader();renderBottomNav()});for(const type of ['hatirlaticilar','sinavlar','denemeSinavlari','gorevler','konusmalar','duyurular'])global.AppStore?.subscribe?.('data.'+type,hydrateHeader)}
global.ShellUI={init,home,back,openTab,openPage,routeModule,registerPageRoute,renderProfile,renderSearch,openQuickNote,openNotifications,toggleTheme,applyTheme,syncVisibilityClasses,pageAllowed,canOpen:(name,page)=>moduleAllowed(name)&&pageAllowed(name,page||''),webMode,currentView,profileInfo};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);