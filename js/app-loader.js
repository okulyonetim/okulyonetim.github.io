/* Koruk Asistan — AppLoader v2
   Başlangıçta yüzlerce JS yüklemek yerine özellik gruplarını ihtiyaç anında yükler.
   Yeni çekirdek: firebase-init.js + core.js + auth.js + app-loader.js.
   Geçiş süresince modül listeleri mevcut gerçek dosya yollarını kullanır. */
(function(){
'use strict';
if(window.AppLoader)return;

const loaded=new Set(),loading=new Map(),registry=new Map();
function normalize(src){return String(src||'').split('?')[0].replace(/^\.\//,'')}
function alreadyInDom(src){const n=normalize(src);return [...document.querySelectorAll('script[src]')].some(s=>normalize(s.getAttribute('src'))===n)}
function loadScript(src){
  const key=normalize(src);
  if(loaded.has(key)||alreadyInDom(src)){loaded.add(key);return Promise.resolve(key)}
  if(loading.has(key))return loading.get(key);
  const p=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.async=false;s.dataset.korukLazy=key;
    s.onload=()=>{loaded.add(key);loading.delete(key);resolve(key)};
    s.onerror=()=>{loading.delete(key);reject(new Error('module-load:'+key))};
    document.head.appendChild(s);
  });
  loading.set(key,p);return p;
}
async function loadMany(files){for(const f of files||[])await loadScript(f)}
function define(name,files){registry.set(name,[...(files||[])])}
async function load(name){if(!registry.has(name))throw new Error('module-not-defined:'+name);await loadMany(registry.get(name));try{window.dispatchEvent(new CustomEvent('koruk:module-ready',{detail:{name}}))}catch(_){}return name}
function isLoaded(name){return (registry.get(name)||[]).every(x=>loaded.has(normalize(x))||alreadyInDom(x))}
function list(){return [...registry.entries()].map(([name,files])=>({name,files:[...files],loaded:isLoaded(name)}))}

/* Geçiş registry'si. Yeni birleşik modüller üretildikçe her grup 1 dosyaya inecek. */
define('dashboard',['js/app.js','js/ui.js','js/alt-navigasyon.js','js/sistem-bar.js','js/hava-durumu.js']);
define('people',['js/core/repositories/siniflar.repository.js','js/core/services/siniflar.service.js','js/siniflar.js','js/ogrenciler-arama.js','js/ogretmen-detay.js','js/yoklama.js']);
define('academic',['js/core/repositories/sinavlar.repository.js','js/core/services/sinavlar.service.js','js/sinavlar.js','js/yillik-plan.js','js/ders-saatleri.js','js/akademik-takvim.js','js/sinav-sonuclari.js']);
define('management',['js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js','js/nobet.js','js/periyodik.js','js/personel.js','js/dilekce.js','js/puantaj.js','js/ogretmen-izin.js']);
define('communication',['js/mesajlasma.js','js/duyurular.js','js/anket.js','js/haberler.js','js/takvim.js','js/notlar.js']);
define('transport',['js/tasima.js','js/servis-oturma.js','js/sinif-oturma.js','js/tasima-takip.js','js/servis-denetim.js']);
define('documents',['js/dokumanlar.js','js/dokuman-okuyucu.js','js/raporlama.js','js/report-header-unifier.js','js/native-report-preview.js']);
define('settings',['js/kullanici-yonetimi.js','js/depolama-sinirlari.js','js/nav-duzeni-editor.js','js/role-ui-hardening.js']);

function bindShell(){
  const title=document.getElementById('v2ModuleTitle'),status=document.getElementById('v2ModuleStatus');
  document.querySelectorAll('[data-ka-module]').forEach(btn=>{
    if(btn.dataset.kaBound==='1')return;btn.dataset.kaBound='1';
    btn.addEventListener('click',async()=>{
      const name=btn.dataset.kaModule;
      if(title)title.textContent=btn.textContent.trim();
      if(status)status.textContent='Modül yükleniyor…';
      try{await load(name);if(status)status.textContent='Modül hazır.'}catch(e){if(status)status.textContent='Modül yüklenemedi: '+(e?.message||e)}
    });
  });
  window.addEventListener('koruk:app-ready',()=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent='Cihaz verisi hazır'});
  window.addEventListener('koruk:sync-state',e=>{const el=document.getElementById('v2SyncStatus');if(el)el.textContent=(e.detail?.pending||0)+' bekleyen işlem'});
}

window.AppLoader={define,load,loadMany,loadScript,isLoaded,list,bindShell};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindShell,{once:true});else bindShell();
})();
