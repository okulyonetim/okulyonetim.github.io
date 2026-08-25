/* Koruk Asistan — AppLoader v25
   Başlangıçta yalnız çekirdek yüklenir; özellikler ihtiyaç anında tek modül olarak gelir.
   Uygulama başlangıcının tek sahibi: tema + Firebase init + auth listener + Service Worker.
   Yetki görünürlüğünün tek sahibi: PermissionService (hidden / preview / read / edit).
 */
(function(){
'use strict';
if(window.AppLoader)return;
const loaded=new Set(),loading=new Map(),registry=new Map();
let startupDone=false,dashboardRequested=false,accountPreparedForUid='';
function normalize(src){return String(src||'').split('?')[0].replace(/^\.\//,'')}
function alreadyInDom(src){const n=normalize(src);return [...document.querySelectorAll('script[src]')].some(s=>normalize(s.getAttribute('src'))===n)}
function loadScript(src){const key=normalize(src);if(loaded.has(key)||alreadyInDom(src)){loaded.add(key);return Promise.resolve(key)}if(loading.has(key))return loading.get(key);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.dataset.korukLazy=key;s.onload=()=>{loaded.add(key);loading.delete(key);resolve(key)};s.onerror=()=>{loading.delete(key);reject(new Error('module-load:'+key))};document.head.appendChild(s)});loading.set(key,p);return p}
async function loadMany(files){for(const f of files||[])await loadScript(f)}
function define(name,files){registry.set(name,[...(files||[])])}
function isLoaded(name){return(registry.get(name)||[]).every(x=>loaded.has(normalize(x))||alreadyInDom(x))}
function list(){return[...registry.entries()].map(([name,files])=>({name,files:[...files],loaded:isLoaded(name)}))}

define('dashboard',['js/modules/dashboard.js']);
define('people',['js/modules/people.js']);
define('academic',['js/modules/settings-data.js','js/modules/academic-data.js','js/modules/academic.js']);
define('management',['js/modules/duty-data.js','js/modules/management-data.js','js/modules/management.js']);
define('communication',['js/modules/settings-data.js','js/modules/messaging-data.js','js/modules/communication-data.js','js/modules/communication.js']);
define('transport',['js/modules/report-engine.js','js/modules/transport-data.js','js/modules/transport-reports.js','js/modules/transport.js']);
define('documents',['js/modules/settings-data.js','js/modules/documents-data.js','js/modules/documents.js']);
define('tools',['js/modules/tools-data.js','js/modules/tools.js']);
define('settings',['js/modules/settings-data.js','js/modules/settings.js']);

/* ========================= PERMISSION SERVICE =========================
   Dört görünürlük/yetki seviyesi:
   hidden  : sayfa/buton hiç gösterilmez.
   preview : içerik görülebilir; yazma aksiyonları kapalıdır.
   read    : normal salt-okunur kullanım.
   edit    : tam düzenleme/yazma yetkisi.

   Eski roller geriye uyumludur:
   gizle -> hidden, goruntule -> read, duzenle -> edit.
   Yeni anahtarlar noktalı olabilir: transport.report.monthly gibi.
   Kullanıcıya özel yetki, rol yetkisinin üzerinde override kabul edilir.
 */
const PERMISSION_RANK={hidden:0,preview:1,read:2,edit:3};
const PERMISSION_CATALOG=[];
const BASE_PERMISSION_CATALOG=[
  ['module.dashboard','Ana Sayfa','page'],['module.people','Kadrolar','page'],['module.academic','Akademik','page'],
  ['module.management','Yönetim','page'],['module.communication','İletişim','page'],['module.transport','Taşıma','page'],
  ['module.documents','Dokümanlar','page'],['module.tools','Araçlar','page'],['module.settings','Ayarlar','page'],
  ['people.teachers','Öğretmenler','section'],['people.classes','Sınıflar','section'],['people.students','Öğrenciler','section'],
  ['people.students.edit','Öğrenci düzenleme','action'],['people.attendance.edit','Yoklama düzenleme','action'],
  ['academic.exams','Sınavlar','section'],['academic.exams.edit','Sınav düzenleme','action'],['academic.plans','Yıllık planlar','section'],
  ['management.duty','Nöbet','section'],['management.duty.edit','Nöbet düzenleme','action'],['management.personnel','Personel','section'],
  ['communication.messages','Mesajlaşma','section'],['communication.messages.send','Mesaj gönderme','action'],['communication.announcements','Duyurular','section'],
  ['transport.services','Servisler','section'],['transport.services.edit','Servis düzenleme','action'],['transport.seating','Oturma planı','section'],
  ['transport.seating.edit','Oturma planı düzenleme','action'],['transport.report.inspection','Denetim Formu','action'],['transport.report.monthly','Aylık Takip','action'],
  ['documents.view','Doküman görüntüleme','section'],['documents.edit','Doküman düzenleme','action'],
  ['tools.checklists','Kontrol Listeleri','section'],['tools.map','Harita','section'],['tools.schedules','Çizelgeler','section'],
  ['tools.attendance','Devamsızlık','section'],['tools.gradebook','Ödev / Not','section'],
  ['settings.roles','Rol Yönetimi','section'],['settings.roles.edit','Rol düzenleme','action'],['settings.users','Kullanıcı Yönetimi','section']
];
BASE_PERMISSION_CATALOG.forEach(([key,label,type])=>PERMISSION_CATALOG.push({key,label,type}));
function permissionNormalize(value){
  if(value===true)return'edit';if(value===false)return'hidden';
  const v=String(value??'').trim().toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
  if(['gizle','hidden','none','yok'].includes(v))return'hidden';
  if(['onizle','onizleme','preview'].includes(v))return'preview';
  if(['goruntule','oku','read','readonly','salt-okunur','saltonur'].includes(v))return'read';
  if(['duzenle','edit','tam','full','yonet'].includes(v))return'edit';
  return null;
}
function permissionValue(obj,key){
  if(!obj||typeof obj!=='object')return undefined;
  if(Object.prototype.hasOwnProperty.call(obj,key))return obj[key];
  return String(key||'').split('.').reduce((node,part)=>node&&typeof node==='object'?node[part]:undefined,obj);
}
function permissionKeys(key){const parts=String(key||'').split('.').filter(Boolean),out=[];for(let i=parts.length;i>0;i--)out.push(parts.slice(0,i).join('.'));return out}
function permissionSourceLevel(source,key){for(const candidate of permissionKeys(key)){const n=permissionNormalize(permissionValue(source,candidate));if(n)return n}return null}
function permissionSession(){return{user:window.AKTIF_KULLANICI||window.AppStore?.get?.('session.user')||null,role:window.AKTIF_ROL||window.AppStore?.get?.('session.role')||null}}
function permissionLevel(key,{fallback='edit'}={}){
  const {user,role}=permissionSession();
  if(user?.admin===true)return'edit';
  const userLevel=permissionSourceLevel(user?.yetkiler,key);if(userLevel)return userLevel;
  const roleLevel=permissionSourceLevel(role?.yetkiler,key);if(roleLevel)return roleLevel;
  return permissionNormalize(fallback)||'edit';
}
function moduleLevel(name){return permissionLevel('module.'+name,{fallback:'edit'})}
function permissionCan(key,min='read'){return PERMISSION_RANK[permissionLevel(key)]>=PERMISSION_RANK[permissionNormalize(min)||'read']}
function permissionRequire(key,min='edit'){if(!permissionCan(key,min)){const e=new Error('yetkisiz:'+key);e.code='permission-denied';e.permission=key;e.required=min;throw e}return true}
function permissionRegister(items){for(const item of items||[]){if(!item?.key)continue;const i=PERMISSION_CATALOG.findIndex(x=>x.key===item.key);if(i>=0)PERMISSION_CATALOG[i]={...PERMISSION_CATALOG[i],...item};else PERMISSION_CATALOG.push({...item})}return PERMISSION_CATALOG}
function permissionApply(root=document){
  root.querySelectorAll?.('[data-ka-module]').forEach(el=>{const level=moduleLevel(el.dataset.kaModule);el.dataset.permissionLevel=level;el.hidden=level==='hidden';el.setAttribute('aria-hidden',level==='hidden'?'true':'false')});
  root.querySelectorAll?.('[data-ka-permission]').forEach(el=>{const key=el.dataset.kaPermission,min=permissionNormalize(el.dataset.kaMinLevel)||'preview',level=permissionLevel(key),visible=PERMISSION_RANK[level]>=PERMISSION_RANK[min];el.dataset.permissionLevel=level;el.hidden=!visible;el.setAttribute('aria-hidden',visible?'false':'true')});
  root.querySelectorAll?.('[data-ka-requires-edit],[data-ka-write]').forEach(el=>{const key=el.dataset.kaPermission||el.dataset.kaRequiresEdit||el.dataset.kaWrite,editable=permissionCan(key||'module.'+(AppStore?.get?.('ui.route')||''),'edit');if('disabled'in el)el.disabled=!editable;el.setAttribute('aria-disabled',editable?'false':'true')});
}
function permissionApplyModule(name){
  const root=document.getElementById('v2ModuleRoot');if(!root)return moduleLevel(name);const level=moduleLevel(name);root.dataset.permissionMode=level;
  document.getElementById('kaPermissionPreviewNotice')?.remove();
  if(level==='preview'){
    const notice=document.createElement('div');notice.id='kaPermissionPreviewNotice';notice.className='ka-card';notice.innerHTML='<div class="ka-card__body ka-row ka-row--between"><div><strong>Önizleme modu</strong><div class="ka-muted">Bu sayfayı görebilirsiniz ancak değişiklik yapamazsınız.</div></div><span class="ka-badge">Salt önizleme</span></div>';root.prepend(notice);
  }
  permissionApply(root);return level;
}
function permissionRefresh(){permissionApply(document);const route=AppStore?.get?.('ui.route');if(route)requestAnimationFrame(()=>permissionApplyModule(route));try{window.dispatchEvent(new CustomEvent('koruk:permissions-changed'))}catch(_){}return true}
window.PermissionService={LEVELS:Object.freeze({...PERMISSION_RANK}),catalog:PERMISSION_CATALOG,normalize:permissionNormalize,level:permissionLevel,moduleLevel,can:permissionCan,canEdit:key=>permissionCan(key,'edit'),isPreview:key=>permissionLevel(key)==='preview',require:permissionRequire,register:permissionRegister,apply:permissionApply,applyModule:permissionApplyModule,refresh:permissionRefresh};
/* Eski servis sözleşmelerini merkezi sisteme bağlayan geçiş API'leri. */
if(typeof window.gorebilir!=='function')window.gorebilir=key=>PermissionService.can(key,'read');
if(typeof window.duzenleyebilir!=='function')window.duzenleyebilir=key=>PermissionService.can(key,'edit');
if(typeof window.kullaniciYonetimiYetkisiVar!=='function')window.kullaniciYonetimiYetkisiVar=()=>permissionSession().user?.admin===true||PermissionService.can('settings.users','edit');

async function load(name){
  if(!registry.has(name))throw new Error('module-not-defined:'+name);
  const level=moduleLevel(name);if(level==='hidden'){const e=new Error('module-forbidden:'+name);e.code='permission-hidden';throw e}
  await loadMany(registry.get(name));
  try{window.dispatchEvent(new CustomEvent('koruk:module-ready',{detail:{name,permissionLevel:level}}))}catch(_){}
  requestAnimationFrame(()=>permissionApplyModule(name));return name;
}

function updateThemeChrome(){const meta=document.querySelector('meta[name="theme-color"]');if(meta){const color=getComputedStyle(document.documentElement).getPropertyValue('--ka-header-bg').trim();if(color)meta.setAttribute('content',color)}document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>{const dark=document.documentElement.getAttribute('data-theme')==='dark';btn.textContent=dark?'☀️':'🌙';btn.setAttribute('aria-label',dark?'Açık temaya geç':'Koyu temaya geç');btn.title=dark?'Açık temaya geç':'Koyu temaya geç'})}
function applyTheme(theme,{persist=true}={}){const next=theme==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',next);if(persist)try{localStorage.setItem('oyTema',next)}catch(_){}window.AppStore?.set?.('ui.theme',next);requestAnimationFrame(updateThemeChrome);return next}
function applySavedTheme(){let theme='light';try{theme=localStorage.getItem('oyTema')==='dark'?'dark':'light'}catch(_){}return applyTheme(theme,{persist:false})}
function toggleTheme(){return applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')}
function registerServiceWorker(){if(!('serviceWorker'in navigator))return;window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(e=>console.warn('[SW]',e?.message||e)),{once:true})}
function startPlatform(){if(startupDone)return true;startupDone=true;applySavedTheme();registerServiceWorker();try{if(typeof firebaseyiBaslat!=='function'||!firebaseyiBaslat())return false;if(typeof authDinleyiciKur==='function')authDinleyiciKur();return true}catch(e){console.error('[AppLoader] Başlangıç hatası:',e);document.getElementById('configWarning')?.classList.remove('ka-hidden');return false}}
async function prepareAccountLocalData(user){if(!user?.uid||accountPreparedForUid===user.uid||!window.SyncEngine||!window.COL)return;accountPreparedForUid=user.uid;const types=[];if(COL.depolamaAyarlari){SyncEngine.register('depolamaAyarlari',COL.depolamaAyarlari);types.push('depolamaAyarlari')}if(COL.kullaniciIstatistikleri&&window.firebase?.firestore?.FieldPath){SyncEngine.register('kullaniciIstatistikleri',COL.kullaniciIstatistikleri,{query:q=>q.where(firebase.firestore.FieldPath.documentId(),'==',user.uid)});types.push('kullaniciIstatistikleri')}if(types.length){try{await SyncEngine.localHydrate(types);SyncEngine.schedule(80)}catch(e){console.warn('[AppLoader] Hesap cihaz verisi:',e?.message||e)}}}
function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(user?.uid){window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;window.AppStore?.set?.('session.user',user);window.AppStore?.set?.('session.role',role||null);window.AppBootstrap?.start?.();prepareAccountLocalData(user);permissionRefresh();if(!dashboardRequested&&moduleLevel('dashboard')!=='hidden'){dashboardRequested=true;load('dashboard').catch(e=>console.warn('[Dashboard]',e?.message||e))}return true}return false}
function syncAuthVisibility(){const login=document.getElementById('girisEkrani'),pending=document.getElementById('onayBekleniyorEkrani'),app=document.getElementById('app');if(!login||!pending||!app)return;syncLegacySession();const pendingActive=pending.classList.contains('active'),appReady=app.classList.contains('ready')||app.classList.contains('show'),loginActive=login.classList.contains('active')||(!pendingActive&&!appReady);login.hidden=!loginActive;pending.hidden=!pendingActive;app.hidden=!appReady;pending.classList.toggle('ka-hidden',!pendingActive)}
function setActiveModule(name){document.querySelectorAll('[data-ka-module]').forEach(btn=>{const active=btn.dataset.kaModule===name;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});window.AppStore?.set?.('ui.route',name)}
function bindShell(){
  startPlatform();
  document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>{if(btn.dataset.kaThemeBound==='1')return;btn.dataset.kaThemeBound='1';btn.addEventListener('click',toggleTheme)});updateThemeChrome();
  const title=document.getElementById('v2ModuleTitle'),status=document.getElementById('v2ModuleStatus');
  document.querySelectorAll('[data-ka-module]').forEach(btn=>{if(btn.dataset.kaBound==='1')return;btn.dataset.kaBound='1';btn.addEventListener('click',async()=>{const name=btn.dataset.kaModule;if(moduleLevel(name)==='hidden')return;setActiveModule(name);if(title)title.textContent=btn.textContent.trim();if(status)status.textContent='Modül yükleniyor…';try{await load(name);if(status)status.textContent=moduleLevel(name)==='preview'?'Modül önizleme modunda.':'Modül hazır.'}catch(e){if(status)status.textContent=e?.code==='permission-hidden'?'Bu modül rolünüz için gizli.':'Modül yüklenemedi: '+(e?.message||e)}})});
  document.addEventListener('click',e=>{const el=e.target.closest?.('[data-ka-write],[data-ka-requires-edit]');if(!el)return;const key=el.dataset.kaPermission||el.dataset.kaWrite||el.dataset.kaRequiresEdit||'module.'+(AppStore?.get?.('ui.route')||'');if(!PermissionService.can(key,'edit')){e.preventDefault();e.stopImmediatePropagation();try{toast?.('Bu işlem rolünüz için salt okunur veya önizleme modunda.')}catch(_){};}},true);
  syncAuthVisibility();permissionApply(document);
  ['girisEkrani','onayBekleniyorEkrani','app'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(syncAuthVisibility).observe(el,{attributes:true,attributeFilter:['class']})});
  let n=0;const authBridge=setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(authBridge)},50);
  window.addEventListener('koruk:app-ready',()=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent='Cihaz verisi hazır';permissionRefresh();if(!dashboardRequested&&moduleLevel('dashboard')!=='hidden'){dashboardRequested=true;load('dashboard').catch(()=>{})}});
  window.addEventListener('koruk:sync-state',e=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent=(e.detail?.pending||0)+' bekleyen işlem'});
  const initial=document.querySelector('[data-ka-module="dashboard"]');if(initial&&!initial.hidden)setActiveModule('dashboard');
}
window.AppLoader={define,load,loadMany,loadScript,isLoaded,list,bindShell,syncAuthVisibility,syncLegacySession,setActiveModule,startPlatform,applyTheme,toggleTheme,prepareAccountLocalData};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindShell,{once:true});else bindShell();
})();
