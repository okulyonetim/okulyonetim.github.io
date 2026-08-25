/* Koruk Asistan — AppLoader v11
   Başlangıçta yalnız çekirdek yüklenir; özellikler ihtiyaç anında data + tek UI modülü olarak gelir. */
(function(){
'use strict';
if(window.AppLoader)return;
const loaded=new Set(),loading=new Map(),registry=new Map();
function normalize(src){return String(src||'').split('?')[0].replace(/^\.\//,'')}
function alreadyInDom(src){const n=normalize(src);return [...document.querySelectorAll('script[src]')].some(s=>normalize(s.getAttribute('src'))===n)}
function loadScript(src){const key=normalize(src);if(loaded.has(key)||alreadyInDom(src)){loaded.add(key);return Promise.resolve(key)}if(loading.has(key))return loading.get(key);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.dataset.korukLazy=key;s.onload=()=>{loaded.add(key);loading.delete(key);resolve(key)};s.onerror=()=>{loading.delete(key);reject(new Error('module-load:'+key))};document.head.appendChild(s)});loading.set(key,p);return p}
async function loadMany(files){for(const f of files||[])await loadScript(f)}
function define(name,files){registry.set(name,[...(files||[])])}
async function load(name){if(!registry.has(name))throw new Error('module-not-defined:'+name);await loadMany(registry.get(name));try{window.dispatchEvent(new CustomEvent('koruk:module-ready',{detail:{name}}))}catch(_){}return name}
function isLoaded(name){return(registry.get(name)||[]).every(x=>loaded.has(normalize(x))||alreadyInDom(x))}
function list(){return[...registry.entries()].map(([name,files])=>({name,files:[...files],loaded:isLoaded(name)}))}

/* V2 registry: sekiz ana alanın tamamı temiz modül mimarisinde. */
define('dashboard',['js/modules/dashboard.js']);
define('people',['js/modules/people-data.js','js/modules/people.js']);
define('academic',['js/modules/academic-data.js','js/deneme-sinavlari-stability.js','js/modules/academic.js']);
define('management',['js/core/repositories/takvim.repository.js','js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js','js/modules/management-data.js','js/modules/management.js']);
define('communication',['js/core/repositories/takvim.repository.js','js/core/repositories/mesajlasma.repository.js','js/core/services/mesajlasma.service.js','js/modules/communication-data.js','js/modules/communication.js']);
define('transport',['js/modules/people-data.js','js/modules/transport-data.js','js/modules/transport.js']);
define('documents',['js/modules/documents-data.js','js/modules/documents.js']);
define('settings',['js/modules/settings-data.js','js/modules/settings.js']);

/* Eski auth.js top-level let kullanıyor. Aynı gerçek oturum V2 Core/AppStore'a aktarılır. */
function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(user?.uid){window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;window.AppStore?.set?.('session.user',user);window.AppStore?.set?.('session.role',role||null);window.AppBootstrap?.start?.();return true}return false}
function syncAuthVisibility(){const login=document.getElementById('girisEkrani'),pending=document.getElementById('onayBekleniyorEkrani'),app=document.getElementById('app');if(!login||!pending||!app)return;syncLegacySession();const pendingActive=pending.classList.contains('active'),appReady=app.classList.contains('ready')||app.classList.contains('show'),loginActive=login.classList.contains('active')||(!pendingActive&&!appReady);login.hidden=!loginActive;pending.hidden=!pendingActive;app.hidden=!appReady;pending.classList.toggle('ka-hidden',!pendingActive)}
function bindShell(){const title=document.getElementById('v2ModuleTitle'),status=document.getElementById('v2ModuleStatus');document.querySelectorAll('[data-ka-module]').forEach(btn=>{if(btn.dataset.kaBound==='1')return;btn.dataset.kaBound='1';btn.addEventListener('click',async()=>{const name=btn.dataset.kaModule;if(title)title.textContent=btn.textContent.trim();if(status)status.textContent='Modül yükleniyor…';try{await load(name);if(status)status.textContent='Modül hazır.'}catch(e){if(status)status.textContent='Modül yüklenemedi: '+(e?.message||e)}})});syncAuthVisibility();['girisEkrani','onayBekleniyorEkrani','app'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(syncAuthVisibility).observe(el,{attributes:true,attributeFilter:['class']})});let n=0;const authBridge=setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(authBridge)},50);window.addEventListener('koruk:app-ready',()=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent='Cihaz verisi hazır'});window.addEventListener('koruk:sync-state',e=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent=(e.detail?.pending||0)+' bekleyen işlem'})}
window.AppLoader={define,load,loadMany,loadScript,isLoaded,list,bindShell,syncAuthVisibility,syncLegacySession};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindShell,{once:true});else bindShell();
})();
