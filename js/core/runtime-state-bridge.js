/* Koruk Asistan — Runtime State Bridge v2
 * Global lexical dizileri tek noktadan görünür kılar ve dashboard-kritik
 * son bilinen veriyi localStorage'da senkron önbellekler.
 */
(function(){
'use strict';
if(window.KorukRuntimeState)return;
const KEY='oyDashboardState_v2';
const NAMES=['ogretmenler','dersProgrami','siniflar','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','duyurular','haberler','gorevler','hatirlaticilar','ogretmenIzinleri','notlar','yillikPlanTanimlari'];
function get(n){try{switch(n){
 case'ogretmenler':return typeof ogretmenler!=='undefined'?ogretmenler:[];
 case'dersProgrami':return typeof dersProgrami!=='undefined'?dersProgrami:[];
 case'siniflar':return typeof siniflar!=='undefined'?siniflar:[];
 case'veliler':return typeof veliler!=='undefined'?veliler:[];
 case'servisler':return typeof servisler!=='undefined'?servisler:[];
 case'nobetAtamalari':return typeof nobetAtamalari!=='undefined'?nobetAtamalari:[];
 case'nobetYerleri':return typeof nobetYerleri!=='undefined'?nobetYerleri:[];
 case'sinavlar':return typeof sinavlar!=='undefined'?sinavlar:[];
 case'denemeSinavlari':return typeof denemeSinavlari!=='undefined'?denemeSinavlari:[];
 case'duyurular':return typeof duyurular!=='undefined'?duyurular:[];
 case'haberler':return typeof haberler!=='undefined'?haberler:[];
 case'gorevler':return typeof gorevler!=='undefined'?gorevler:[];
 case'hatirlaticilar':return typeof hatirlaticilar!=='undefined'?hatirlaticilar:[];
 case'ogretmenIzinleri':return typeof ogretmenIzinleri!=='undefined'?ogretmenIzinleri:[];
 case'notlar':return typeof notlar!=='undefined'?notlar:[];
 case'yillikPlanTanimlari':return typeof yillikPlanTanimlari!=='undefined'?yillikPlanTanimlari:[];
 default:return[];
 }}catch(_){return[]}}
function set(n,v){if(!Array.isArray(v))return;try{switch(n){
 case'ogretmenler':if(typeof ogretmenler!=='undefined')ogretmenler=v;break;
 case'dersProgrami':if(typeof dersProgrami!=='undefined')dersProgrami=v;break;
 case'siniflar':if(typeof siniflar!=='undefined')siniflar=v;break;
 case'veliler':if(typeof veliler!=='undefined')veliler=v;break;
 case'servisler':if(typeof servisler!=='undefined')servisler=v;break;
 case'nobetAtamalari':if(typeof nobetAtamalari!=='undefined')nobetAtamalari=v;break;
 case'nobetYerleri':if(typeof nobetYerleri!=='undefined')nobetYerleri=v;break;
 case'sinavlar':if(typeof sinavlar!=='undefined')sinavlar=v;break;
 case'denemeSinavlari':if(typeof denemeSinavlari!=='undefined')denemeSinavlari=v;break;
 case'duyurular':if(typeof duyurular!=='undefined')duyurular=v;break;
 case'haberler':if(typeof haberler!=='undefined')haberler=v;break;
 case'gorevler':if(typeof gorevler!=='undefined')gorevler=v;break;
 case'hatirlaticilar':if(typeof hatirlaticilar!=='undefined')hatirlaticilar=v;break;
 case'ogretmenIzinleri':if(typeof ogretmenIzinleri!=='undefined')ogretmenIzinleri=v;break;
 case'notlar':if(typeof notlar!=='undefined')notlar=v;break;
 case'yillikPlanTanimlari':if(typeof yillikPlanTanimlari!=='undefined')yillikPlanTanimlari=v;break;
 }}catch(_){}}
function expose(n){try{const d=Object.getOwnPropertyDescriptor(window,n);if(d&&!d.configurable)return;Object.defineProperty(window,n,{configurable:true,enumerable:false,get:()=>get(n),set:v=>set(n,v)})}catch(_){}}
let cached={};
try{cached=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){cached={}}
function applyCache(){NAMES.forEach(n=>{if(Array.isArray(cached[n])&&cached[n].length)set(n,cached[n])})}
applyCache();NAMES.forEach(expose);window.KorukDashboardCache=cached;
function snapshot(){const out={savedAt:Date.now()};NAMES.forEach(n=>{const v=get(n);if(Array.isArray(v))out[n]=v});return out}
let saveTimer=null;
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{const out=snapshot();localStorage.setItem(KEY,JSON.stringify(out));window.KorukDashboardCache=out}catch(e){console.warn('[state] dashboard cache yazılamadı',e)}},100)}
let signalQueued=false,lastSource='';
function signal(source){lastSource=source||'runtime';saveSoon();if(signalQueued)return;signalQueued=true;queueMicrotask(()=>{signalQueued=false;window.dispatchEvent(new CustomEvent('koruk:data-updated',{detail:{source:lastSource}}));window.dispatchEvent(new CustomEvent('koruk:dashboard-render',{detail:{source:lastSource}}))})}
function wrap(name){const old=window[name];if(typeof old!=='function'||old.__korukStateWrapped)return false;const fn=function(){const r=old.apply(this,arguments);signal(name);return r};fn.__korukStateWrapped=true;window[name]=fn;return true}
const RENDERS=['renderDashboard','renderDuyurular','renderDuyuruPanosu','renderDenemeSinavlari','renderSinavlar','renderSiniflar','renderOgrenciler','renderDersGrid','renderNobet','renderNobetler','renderGorevler','renderHatirlaticilar','renderEvrakTakibi','renderNotlar','renderHaberler','renderBugunIzinliOgretmenler','renderYillikPlanAnaSayfa'];
let tries=0;const timer=setInterval(()=>{RENDERS.forEach(wrap);if(++tries>120)clearInterval(timer)},50);
/* app.js'nin eski oyVeriOnbellek_v1 yüklemesi DOMContentLoaded sırasında
   bazı ortak dizileri eski değerle değiştirebilir. app.js listener'ı daha önce
   kaydedildiği için bu listener ondan sonra çalışır ve v2 cache'i yeniden uygular. */
document.addEventListener('DOMContentLoaded',()=>{applyCache();signal('cache-reapply')});
window.addEventListener('beforeunload',()=>{try{localStorage.setItem(KEY,JSON.stringify(snapshot()))}catch(_){}});
window.KorukRuntimeState={get,set,snapshot,save:saveSoon,signal,applyCache};
queueMicrotask(()=>signal('cache-bootstrap'));
})();