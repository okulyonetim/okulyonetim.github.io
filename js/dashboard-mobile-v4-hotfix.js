/* Koruk Asistan — Dashboard mobil kararlılık ve kalıcı tercih katmanı */
(function(){
'use strict';
const PREF_KEY='oyDashboardV4KartDuzeni_v2';
const PREF_COL='oy_kullaniciTercihleri';
const DEFAULT_INFO=['personel','ogrenci','sinif','servis','hatirlatici','not'];
let remoteReady=false,remoteUid='',lastLocal='';
function g(name){try{return eval(name)}catch(_){try{return window[name]}catch(__){return null}}}
function css(){
  if(document.getElementById('db4-final-hotfix-css'))return;
  const s=document.createElement('style');s.id='db4-final-hotfix-css';s.textContent=`
#tab-panel.db4.db41{--d-text:#071b2f!important;--d-muted:#40546a!important;--d-line:#c7d2de!important;--d-surface:#fff!important;--d-surface2:#f4f7fb!important;--d-track:#c4cfdb!important;--d-fill:#087f7b!important}
[data-theme="dark"] #tab-panel.db4.db41{--d-text:#f8fbff!important;--d-muted:#c0ccd8!important;--d-line:#31516a!important;--d-surface:#0d2438!important;--d-surface2:#122c43!important;--d-track:#29465d!important;--d-fill:#2bd3ca!important}
.db41 .db41-head h2{flex:1;text-align:center!important;color:var(--d-text)!important}.db41 .db41-edit{color:var(--d-accent)!important;border-color:var(--d-line)!important;background:var(--d-surface2)!important}
.db41 .db41-info,.db41 .db41-info *{text-shadow:none!important}.db41 .db41-info .a,.db41 .db41-info .v,.db41 .db41-info .i{text-align:center!important}.db41 .db41-info .a{display:block!important;width:100%!important;color:var(--d-muted)!important;font-weight:800!important;white-space:normal!important;line-height:1.2!important}.db41 .db41-info .v{color:var(--d-text)!important}.db41 .db41-info:not(.dbx-rich){display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-height:102px!important;padding:12px 8px!important}
/* Zil kartı: sabit yükseklik yok; gerçek içerik iki sütunda dengeli. */
.db41 .db4-bell{position:relative!important;min-height:0!important;overflow:visible!important}.db41 .db4-bell:after{content:none!important;display:none!important}
.db41 .db4-bell #zilWidget{box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1.12fr) minmax(128px,.88fr)!important;align-items:center!important;gap:12px!important;min-height:112px!important;height:auto!important;max-height:none!important;padding:14px 15px!important;overflow:visible!important}
.db41 .db4-bell #zilWidget .zil-sol{min-width:0!important;display:flex!important;align-items:center!important;gap:10px!important}.db41 .db4-bell #zilWidget .zil-sol>div:last-child{min-width:0!important}.db41 .db4-bell #zilWidget .zil-etiket{font-size:16px!important;line-height:1.25!important;white-space:normal!important}.db41 .db4-bell #zilWidget .zil-pill{display:inline-flex!important;margin-top:5px!important}
.db41 .db4-bell #zilWidget .zil-sag{min-width:0!important;text-align:right!important;align-self:center!important}.db41 .db4-bell #zilWidget .zil-baslik-sag{font-size:11px!important;line-height:1.25!important;color:var(--d-muted)!important}.db41 .db4-bell #zilWidget .zil-sayac{font-size:34px!important;line-height:1!important;color:var(--d-text)!important;margin-top:4px!important}.db41 .db4-bell #zilWidget .zil-sayac span{font-size:13px!important;color:var(--d-muted)!important}
#tab-panel.db4.db41 .zil-progress{width:100%!important;max-width:none!important;height:8px!important;margin:9px 0 5px!important;border-radius:999px!important;background:var(--d-track)!important;border:1px solid color-mix(in srgb,var(--d-track),#000 12%)!important;box-shadow:inset 0 1px 2px rgba(7,27,47,.12)!important;overflow:hidden!important}
#tab-panel.db4.db41 .zil-progress-fill{height:100%!important;border-radius:999px!important;background:var(--d-fill)!important;background-image:none!important;box-shadow:none!important;animation:none!important}
#tab-panel.db4.db41 .zil-saat-araligi{font-size:11px!important;color:var(--d-muted)!important}
.db41 .db4-weather #heroHavaSatir{min-height:94px!important}.db41 .db4-weather,.db41 .db4-bell{border-width:1px!important}
@media(max-width:390px){.db41 .db4-bell #zilWidget{grid-template-columns:minmax(0,1fr) 118px!important;gap:8px!important;padding:12px!important}.db41 .db4-bell #zilWidget .zil-sayac{font-size:30px!important}.db41 .db4-bell #zilWidget .zil-etiket{font-size:14px!important}}
@media(max-width:560px){.db41 .db41-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch!important}.db41 .db41-info{border-color:var(--d-line)!important}}
`;
  document.head.appendChild(s);
}
function rawLocal(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'null')}catch(_){return null}}
function localPref(){const p=rawLocal();return p&&Array.isArray(p.info)&&p.info.length?p.info:null}
function setLocal(info){if(!Array.isArray(info)||!info.length)return;localStorage.setItem(PREF_KEY,JSON.stringify({info:[...new Set(info)]}));lastLocal=JSON.stringify([...new Set(info)])}
function identityReady(){
  const auth=g('auth'),u=g('AKTIF_KULLANICI'),r=g('AKTIF_ROL');
  if(!auth?.currentUser||!u)return false;
  return u.admin===true||!!r||!u.rolId;
}
function rerenderInfo(){const c=document.getElementById('db41InfoCard');if(c)c.remove();setTimeout(()=>{try{if(typeof window.dashboardBilgiKartlariYenile==='function')window.dashboardBilgiKartlariYenile()}catch(_){}},60)}
async function prefInit(){
  const auth=g('auth'),db=g('db');const uid=auth?.currentUser?.uid||'';
  if(!uid||!db||!identityReady())return;
  if(remoteReady&&remoteUid===uid)return;
  remoteReady=false;remoteUid=uid;
  try{
    const ref=db.collection(PREF_COL).doc(uid),snap=await ref.get();
    const remote=snap.exists?snap.data()?.dashboardBilgiKartlari:null;
    const local=localPref();
    if(Array.isArray(remote)&&remote.length){
      if(JSON.stringify(remote)!==JSON.stringify(local)){setLocal(remote);rerenderInfo();}
    }else if(local&&local.length){
      await ref.set({dashboardBilgiKartlari:local,dashboardBilgiKartlariGuncelleme:new Date().toISOString()},{merge:true});
    }else{
      setLocal(DEFAULT_INFO);
      await ref.set({dashboardBilgiKartlari:DEFAULT_INFO,dashboardBilgiKartlariGuncelleme:new Date().toISOString()},{merge:true});
      rerenderInfo();
    }
    remoteReady=true;lastLocal=JSON.stringify(localPref()||[]);
  }catch(e){console.warn('Dashboard kart tercihi okunamadı:',e);if(!localPref()){setLocal(DEFAULT_INFO);rerenderInfo();}}
}
async function prefSync(){
  if(!remoteReady||!identityReady())return;
  const local=localPref();if(!local||!local.length)return;
  const now=JSON.stringify(local);if(now===lastLocal)return;
  const auth=g('auth'),db=g('db');const uid=auth?.currentUser?.uid||'';if(!uid||!db)return;
  try{await db.collection(PREF_COL).doc(uid).set({dashboardBilgiKartlari:local,dashboardBilgiKartlariGuncelleme:new Date().toISOString()},{merge:true});lastLocal=now;}catch(e){console.warn('Dashboard kart tercihi kaydedilemedi:',e)}
}
function ensureCards(){
  if(!identityReady())return;
  if(!localPref()){setLocal(DEFAULT_INFO);rerenderInfo();return;}
  const grid=document.getElementById('db41InfoGrid');
  if(grid&&/Gösterilecek bilgi kartı seçilmedi/i.test(grid.textContent||''))rerenderInfo();
}
function run(){css();prefInit();ensureCards();prefSync();try{if(typeof window.dashboardBilgiKartlariYenile==='function')window.dashboardBilgiKartlariYenile()}catch(_){}}
document.addEventListener('DOMContentLoaded',()=>setTimeout(run,300));
setInterval(run,1000);
})();
