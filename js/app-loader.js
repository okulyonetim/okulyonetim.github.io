/* Koruk Asistan — AppLoader v15
   Başlangıçta yalnız çekirdek yüklenir; özellikler ihtiyaç anında data + tek UI modülü olarak gelir.
   Uygulama başlangıcının tek sahibi: tema + Firebase init + auth listener + Service Worker. */
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
async function load(name){if(!registry.has(name))throw new Error('module-not-defined:'+name);await loadMany(registry.get(name));try{window.dispatchEvent(new CustomEvent('koruk:module-ready',{detail:{name}}))}catch(_){}return name}
function isLoaded(name){return(registry.get(name)||[]).every(x=>loaded.has(normalize(x))||alreadyInDom(x))}
function list(){return[...registry.entries()].map(([name,files])=>({name,files:[...files],loaded:isLoaded(name)}))}

define('dashboard',['js/modules/dashboard.js']);
define('people',['js/modules/people-data.js','js/modules/people.js']);
define('academic',['js/modules/academic-data.js','js/deneme-sinavlari-stability.js','js/modules/academic.js']);
define('management',['js/core/repositories/takvim.repository.js','js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js','js/modules/management-data.js','js/modules/management.js']);
define('communication',['js/core/repositories/takvim.repository.js','js/core/repositories/mesajlasma.repository.js','js/core/services/mesajlasma.service.js','js/modules/settings-data.js','js/modules/communication-data.js','js/modules/communication.js']);
define('transport',['js/modules/people-data.js','js/modules/transport-data.js','js/modules/transport.js']);
define('documents',['js/modules/settings-data.js','js/modules/documents-data.js','js/modules/documents.js']);
define('settings',['js/modules/settings-data.js','js/modules/settings.js']);

function updateThemeChrome(){
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta){const color=getComputedStyle(document.documentElement).getPropertyValue('--ka-header-bg').trim();if(color)meta.setAttribute('content',color)}
  document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>{const dark=document.documentElement.getAttribute('data-theme')==='dark';btn.textContent=dark?'☀️':'🌙';btn.setAttribute('aria-label',dark?'Açık temaya geç':'Koyu temaya geç');btn.title=dark?'Açık temaya geç':'Koyu temaya geç'})
}
function applyTheme(theme,{persist=true}={}){const next=theme==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',next);if(persist)try{localStorage.setItem('oyTema',next)}catch(_){}window.AppStore?.set?.('ui.theme',next);requestAnimationFrame(updateThemeChrome);return next}
function applySavedTheme(){let theme='light';try{theme=localStorage.getItem('oyTema')==='dark'?'dark':'light'}catch(_){}return applyTheme(theme,{persist:false})}
function toggleTheme(){return applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')}
function registerServiceWorker(){if(!('serviceWorker'in navigator))return;window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(e=>console.warn('[SW]',e?.message||e)),{once:true})}
function startPlatform(){if(startupDone)return true;startupDone=true;applySavedTheme();registerServiceWorker();try{if(typeof firebaseyiBaslat!=='function'||!firebaseyiBaslat())return false;if(typeof authDinleyiciKur==='function')authDinleyiciKur();return true}catch(e){console.error('[AppLoader] Başlangıç hatası:',e);const warn=document.getElementById('configWarning');if(warn)warn.classList.remove('ka-hidden');return false}}

async function prepareAccountLocalData(user){
  if(!user?.uid||accountPreparedForUid===user.uid||!window.SyncEngine||!window.COL)return;
  accountPreparedForUid=user.uid;
  const types=[];
  if(COL.depolamaAyarlari){SyncEngine.register('depolamaAyarlari',COL.depolamaAyarlari);types.push('depolamaAyarlari')}
  if(COL.kullaniciIstatistikleri&&window.firebase?.firestore?.FieldPath){
    SyncEngine.register('kullaniciIstatistikleri',COL.kullaniciIstatistikleri,{query:q=>q.where(firebase.firestore.FieldPath.documentId(),'==',user.uid)});types.push('kullaniciIstatistikleri');
  }
  if(types.length){try{await SyncEngine.localHydrate(types);SyncEngine.schedule(80)}catch(e){console.warn('[AppLoader] Hesap cihaz verisi:',e?.message||e)}}
}
function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(user?.uid){window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;window.AppStore?.set?.('session.user',user);window.AppStore?.set?.('session.role',role||null);window.AppBootstrap?.start?.();prepareAccountLocalData(user);if(!dashboardRequested){dashboardRequested=true;load('dashboard').catch(e=>console.warn('[Dashboard]',e?.message||e))}return true}return false}
function syncAuthVisibility(){const login=document.getElementById('girisEkrani'),pending=document.getElementById('onayBekleniyorEkrani'),app=document.getElementById('app');if(!login||!pending||!app)return;syncLegacySession();const pendingActive=pending.classList.contains('active'),appReady=app.classList.contains('ready')||app.classList.contains('show'),loginActive=login.classList.contains('active')||(!pendingActive&&!appReady);login.hidden=!loginActive;pending.hidden=!pendingActive;app.hidden=!appReady;pending.classList.toggle('ka-hidden',!pendingActive)}
function setActiveModule(name){document.querySelectorAll('[data-ka-module]').forEach(btn=>{const active=btn.dataset.kaModule===name;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});window.AppStore?.set?.('ui.route',name)}
function bindShell(){
  startPlatform();
  document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>{if(btn.dataset.kaThemeBound==='1')return;btn.dataset.kaThemeBound='1';btn.addEventListener('click',toggleTheme)});updateThemeChrome();
  const title=document.getElementById('v2ModuleTitle'),status=document.getElementById('v2ModuleStatus');
  document.querySelectorAll('[data-ka-module]').forEach(btn=>{if(btn.dataset.kaBound==='1')return;btn.dataset.kaBound='1';btn.addEventListener('click',async()=>{const name=btn.dataset.kaModule;setActiveModule(name);if(title)title.textContent=btn.textContent.trim();if(status)status.textContent='Modül yükleniyor…';try{await load(name);if(status)status.textContent='Modül hazır.'}catch(e){if(status)status.textContent='Modül yüklenemedi: '+(e?.message||e)}})});
  syncAuthVisibility();['girisEkrani','onayBekleniyorEkrani','app'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(syncAuthVisibility).observe(el,{attributes:true,attributeFilter:['class']})});
  let n=0;const authBridge=setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(authBridge)},50);
  window.addEventListener('koruk:app-ready',()=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent='Cihaz verisi hazır';if(!dashboardRequested){dashboardRequested=true;load('dashboard').catch(()=>{})}});
  window.addEventListener('koruk:sync-state',e=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent=(e.detail?.pending||0)+' bekleyen işlem'});
  const initial=document.querySelector('[data-ka-module="dashboard"]');if(initial)setActiveModule('dashboard');
}
window.AppLoader={define,load,loadMany,loadScript,isLoaded,list,bindShell,syncAuthVisibility,syncLegacySession,setActiveModule,startPlatform,applyTheme,toggleTheme,prepareAccountLocalData};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindShell,{once:true});else bindShell();
})();
