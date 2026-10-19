/* Koruk Asistan — İzinler sayfası (bildirim + konum)
 * Bildirim: haber, duyuru, hatırlatıcı ve görev bildirimleri. Konum: ana sayfadaki hava durumu.
 * Giriş yapıldığında (koruk:app-ready) izin verilmemişse bir "İzinler" sayfası açılır. "Şimdi değil" denirse
 * 1 gün, sonra 3 gün, sonra 7 gün aralıkla yeniden gösterilir; iki izin de verilmişse bir daha gösterilmez.
 * Mevcut bildirim kaydı (PushService.tokenGetir) ve hava durumu (SchoolLiveStatus.refreshWeather) olduğu gibi kullanılır. */
(function(global){
'use strict';
if(global.KorukPermissionGate)return;
const KEY='ka-permission-gate',SESSION_KEY='ka-permission-gate-session',DAY=86400000,WAIT_DAYS=[0,1,3,7];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=(()=>{try{const k='__ka_pg';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage}catch(_){return null}})();
function read(){try{return JSON.parse(store?.getItem(KEY)||'{}')||{}}catch(_){return{}}}
function write(v){try{store?.setItem(KEY,JSON.stringify(v))}catch(_){}}
const native=()=>global.KorukPlatformAdapter?.isNative?.()===true;
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};

/* Bekleme süresi: gösterim sayısına göre 0 → 1 → 3 → 7 gün (en çok 7). */
function due(rec,now=Date.now()){const n=Math.max(0,Number(rec?.n)||0);if(!n)return true;return now-(Number(rec?.ts)||0)>=WAIT_DAYS[Math.min(n,WAIT_DAYS.length-1)]*DAY}

async function notifState(){try{const s=await global.KorukPlatformAdapter?.pushPermission?.();if(s==='granted')return'granted';if(s==='denied')return'denied';if(s==='prompt'||s==='default'||s==='prompt-with-rationale')return'prompt';return'unsupported'}catch(_){return'unsupported'}}
async function geoState(){
  if(!navigator.geolocation)return'unsupported';
  let q='';try{q=(await navigator.permissions?.query?.({name:'geolocation'}))?.state||''}catch(_){}
  const rec=read(),w=global.AppStore?.get?.('ui.weather'),fresh=t=>Number(t)>0&&Date.now()-Number(t)<3*DAY;
  if(q==='granted'||fresh(rec.geoOk)||fresh(w?.updatedAt))return'granted';
  /* Bazı WebView'ler reddedilen konumu "prompt" bildirir; bu cihazda reddedildiyse kendi kaydımıza güveniriz. */
  if(q==='denied'||rec.geoDenied)return'denied';
  return'prompt'}
async function states(){const[notif,geo]=await Promise.all([notifState(),geoState()]);return{notif,geo}}
const needed=s=>['notif','geo'].filter(k=>s[k]==='prompt'||s[k]==='denied');

async function askNotif(){
  try{
    if(!global.PushService&&global.AppLoader?.load){try{await global.AppLoader.load('communication')}catch(_){}}
    if(global.PushService?.tokenGetir)await global.PushService.tokenGetir({request:true});
    else await global.KorukPlatformAdapter?.pushToken?.({request:true});
  }catch(e){console.warn('[İzinler/bildirim]',e?.message||e)}
  return notifState()}
function askGeo(){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve('unsupported');
    navigator.geolocation.getCurrentPosition(()=>{const r=read();delete r.geoDenied;write({...r,geoOk:Date.now()});try{global.SchoolLiveStatus?.refreshWeather?.()}catch(_){}resolve('granted')},
      err=>{if(err?.code===1)write({...read(),geoDenied:Date.now()});resolve(err?.code===1?'denied':'prompt')},{enableHighAccuracy:false,timeout:15000,maximumAge:10*60*1000})})}

const ITEMS={
  notif:{icon:'🔔',title:'Bildirimler',text:'Haber, duyuru, hatırlatıcı ve görev bildirimlerini zamanında alın.',ask:'Bildirimleri aç'},
  geo:{icon:'📍',title:'Konum',text:'Ana sayfadaki hava durumunu bulunduğunuz yere göre gösterir.',ask:'Konumu aç'}
};
const STATE_TEXT={granted:'Açık',denied:'Kapalı',prompt:'Kapalı',unsupported:'Bu cihazda desteklenmiyor'};
function denyHelp(){return native()?'Telefon Ayarları › Uygulamalar › Koruk Asistan › İzinler bölümünden açabilirsiniz.':'Tarayıcının adres çubuğundaki site ayarlarından izni açabilirsiniz.'}
function itemHtml(key,state){
  const it=ITEMS[key],ok=state==='granted',blocked=state==='denied',na=state==='unsupported';
  return `<article class="kpm-item${ok?' is-on':''}" data-kpm-item="${key}"><span class="kpm-ic" aria-hidden="true">${it.icon}</span><div class="kpm-text"><b>${esc(it.title)}</b><small>${esc(it.text)}</small>${blocked?`<small class="kpm-help">Daha önce engellenmiş. ${esc(denyHelp())}</small>`:''}</div>${ok||na?`<span class="kpm-state${ok?' is-on':''}">${esc(STATE_TEXT[state])}</span>`:`<button class="ka-btn ka-btn--primary ka-btn--sm" type="button" data-kpm-ask="${key}">${esc(blocked?'Tekrar dene':it.ask)}</button>`}</article>`}
function sheetHtml(s){return `<section class="ka-modal kcz-form kpm-sheet" role="dialog" aria-modal="true" aria-labelledby="kpmTitle"><div class="ka-modal__header kpm-head"><div><h2 id="kpmTitle">Uygulamayı tam kullanın</h2><p>Bildirim ve konum izinlerini açarsanız önemli gelişmeleri kaçırmaz, hava durumunu görürsünüz.</p></div></div><div class="ka-modal__body ka-stack kpm-list" data-kpm-list>${['notif','geo'].map(k=>itemHtml(k,s[k])).join('')}</div><div class="ka-modal__footer"><span class="ka-grow"></span><button class="ka-btn ka-btn--secondary" type="button" data-kpm-close>Şimdi değil</button></div></section>`}

function close(){document.querySelector('[data-kpm-modal]')?.remove();if(!document.querySelector('.ka-modal-backdrop'))document.body.classList.remove('ka-layer-open')}
async function refresh(){
  const root=document.querySelector('[data-kpm-modal]');if(!root)return;
  const s=await states();root.querySelector('[data-kpm-list]').innerHTML=['notif','geo'].map(k=>itemHtml(k,s[k])).join('');
  const btn=root.querySelector('[data-kpm-close]');if(btn)btn.textContent=needed(s).length?'Şimdi değil':'Tamam';
  }
async function open({force=false}={}){
  if(document.querySelector('[data-kpm-modal]'))return false;
  const s=await states();
  if(!force&&!needed(s).length)return false;
  const rec=read();write({...rec,n:(Number(rec.n)||0)+1,ts:Date.now()});
  document.body.insertAdjacentHTML('beforeend',`<div class="ka-modal-backdrop" data-kpm-modal style="z-index:2600">${sheetHtml(s)}</div>`);
  const root=document.querySelector('[data-kpm-modal]');if(!root)return false;
  root.addEventListener('click',async e=>{
    if(e.target===root||e.target.closest('[data-kpm-close]'))return close();
    const b=e.target.closest('[data-kpm-ask]');if(!b)return;
    b.disabled=true;
    try{if(b.dataset.kpmAsk==='notif')await askNotif();else await askGeo()}catch(err){console.warn('[İzinler]',err?.message||err)}
    await refresh()});
  root.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  document.body.classList.add('ka-layer-open');root.querySelector('button')?.focus?.({preventScroll:true});
  return true}

/* Giriş sonrası: oturum başına en çok bir kez, başka pencere açık değilken. */
let tries=0;
async function check(){
  if(!user()?.uid)return;
  let seen=false;try{seen=sessionStorage.getItem(SESSION_KEY)==='1'}catch(_){}
  if(seen)return;
  if(!due(read()))return;
  if(document.querySelector('.ka-modal-backdrop:not([data-kpm-modal])')||document.getElementById('girisEkrani')?.offsetParent){if(++tries<6)setTimeout(check,4000);return}
  const s=await states();if(!needed(s).length)return;
  try{sessionStorage.setItem(SESSION_KEY,'1')}catch(_){}
  open()}
const schedule=(ms=2500)=>{tries=0;setTimeout(check,ms)};
global.addEventListener('koruk:app-ready',()=>schedule());
global.KorukPermissionGate={open,close,check,states,due,WAIT_DAYS};
})(window);
