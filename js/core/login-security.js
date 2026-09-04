/* Okul Yönetim — profil güvenliği + local-first giriş konumları
 * Konum kaydı mevcut kullanıcı istatistik belgesinde tutulur.
 * Veri akışı: DeviceData -> IndexedDB/AppStore -> SyncEngine -> Firestore.
 */
(function(global){
'use strict';
if(global.LoginSecurityFeature)return;

const STATS_TYPE='kullaniciIstatistikleri';
const LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const MAX_LOGIN_HISTORY=120;
let locationAttempted=false,locationSaving=false,locationSaved=false,leafletPromise=null,loginMap=null,locationUnsub=null,observer=null,locationRendering=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||null;
const isAdmin=()=>user()?.admin===true;
const validCoordinate=(lat,lng)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lng)>=-180&&Number(lng)<=180;

function platform(){
  try{
    if(global.Capacitor?.isNativePlatform?.()){
      const p=global.Capacitor.getPlatform?.();
      return p==='ios'?'ios':'android';
    }
  }catch(_){}
  return 'web';
}
function platformLabel(value){const p=String(value||'web').toLowerCase();if(p.includes('android'))return'Android Uygulaması';if(p.includes('ios')||p.includes('iphone')||p.includes('ipad'))return'iOS Uygulaması';return'Web';}
function dateFrom(value){
  if(!value)return null;
  try{
    if(typeof value.toDate==='function')return value.toDate();
    if(Number.isFinite(Number(value.seconds)))return new Date(Number(value.seconds)*1000);
    if(Number.isFinite(Number(value._seconds)))return new Date(Number(value._seconds)*1000);
    const d=new Date(value);return Number.isNaN(d.getTime())?null:d;
  }catch(_){return null}
}
function dateText(value){const d=dateFrom(value);return d?d.toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';}
function displayNameForUid(uid,fallback=''){
  const users=global.AppStore?.data?.('kullanicilar')||[],u=users.find(x=>String(x.uid||x.id||'')===String(uid||''));
  return u?.adSoyad||u?.ad||u?.displayName||u?.kullaniciAdi||fallback||'Kullanıcı';
}

async function prepareStats(all=false){
  const u=user();if(!u?.uid||!global.IstatistikService?.prepare||!global.DeviceData||!global.COL?.kullaniciIstatistikleri)return false;
  return global.IstatistikService.prepare(all&&u.admin===true);
}
async function saveLocation(lat,lng){
  if(locationSaved||locationSaving||!validCoordinate(lat,lng))return false;
  locationSaving=true;
  try{
    const u=user();if(!u?.uid)return false;
    await new Promise(resolve=>setTimeout(resolve,180));
    await prepareStats(false);
    const current=global.DeviceData.get(STATS_TYPE,u.uid)||{id:u.uid,uid:u.uid,ad:u.ad||u.adSoyad||u.kullaniciAdi||'Kullanıcı'};
    const record={lat:Number(lat),lng:Number(lng),platform:platform(),timestamp:new Date().toISOString()};
    const history=[...(Array.isArray(current.girisKayitlari)?current.girisKayitlari:[]),record].slice(-MAX_LOGIN_HISTORY);
    await global.DeviceData.set(STATS_TYPE,global.COL.kullaniciIstatistikleri,u.uid,{uid:u.uid,ad:current.ad||u.ad||u.adSoyad||u.kullaniciAdi||'Kullanıcı',girisKayitlari:history,sonGirisKonumu:record,guncellenmeTarihi:new Date().toISOString()},{merge:true});
    locationSaved=true;
    return true;
  }catch(e){console.warn('[Giriş konumu]',e?.message||e);return false}finally{locationSaving=false}
}
function recordLoginLocation(){
  if(!user()?.uid||locationAttempted||locationSaved)return;
  locationAttempted=true;
  const known=global.sonKonum;
  if(validCoordinate(known?.lat,known?.lng)){void saveLocation(known.lat,known.lng);return;}
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=Number(pos.coords?.latitude),lng=Number(pos.coords?.longitude);
    if(!validCoordinate(lat,lng))return;
    global.sonKonum={lat,lng};void saveLocation(lat,lng);
  },err=>console.warn('[Giriş konumu]',err?.message||'Konum izni alınamadı.'),{enableHighAccuracy:false,timeout:8000,maximumAge:60000});
}
const KonumGirisService={__localFirst:true,kaydet:recordLoginLocation,prepare:prepareStats,kayitlar(){return flattenLoginRecords()}};
global.KonumGirisService=KonumGirisService;

function passwordErrorMessage(error){
  const code=String(error?.code||error?.message||'');
  if(code.includes('wrong-password')||code.includes('invalid-credential'))return'Mevcut şifreniz hatalı.';
  if(code.includes('weak-password'))return'Yeni şifre en az 6 karakter olmalıdır.';
  if(code.includes('too-many-requests'))return'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';
  if(code.includes('network-request-failed'))return'Şifre değişikliği için internet bağlantısı gerekiyor.';
  if(code.includes('oturum-yok'))return'Oturum bulunamadı. Lütfen yeniden giriş yapın.';
  return'Şifre değiştirilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.';
}
function closePasswordModal(){document.querySelector('[data-profile-password-modal]')?.remove()}
function openPasswordModal(){
  closePasswordModal();
  const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.profilePasswordModal='';
  ov.innerHTML=`<form class="ka-modal" data-password-form><div class="ka-modal__header"><div><strong>Şifre Değiştir</strong><div class="ka-muted">Mevcut şifrenizi doğrulayarak yeni şifrenizi oluşturun.</div></div><button class="ka-icon-button" type="button" data-password-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Mevcut Şifre</span><input type="password" autocomplete="current-password" data-password-current required></label><label class="ka-field"><span class="ka-field__label">Yeni Şifre</span><input type="password" autocomplete="new-password" minlength="6" data-password-new required></label><label class="ka-field"><span class="ka-field__label">Yeni Şifre Tekrar</span><input type="password" autocomplete="new-password" minlength="6" data-password-repeat required></label><p class="ka-muted" data-password-message hidden></p></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-password-close>Vazgeç</button><button class="ka-btn" type="submit" data-password-save>Şifreyi Güncelle</button></div></form>`;
  document.body.appendChild(ov);
  ov.querySelectorAll('[data-password-close]').forEach(b=>b.addEventListener('click',closePasswordModal));
  ov.addEventListener('click',e=>{if(e.target===ov)closePasswordModal()});
  ov.querySelector('[data-password-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const current=ov.querySelector('[data-password-current]')?.value||'',next=ov.querySelector('[data-password-new]')?.value||'',repeat=ov.querySelector('[data-password-repeat]')?.value||'',msg=ov.querySelector('[data-password-message]'),btn=ov.querySelector('[data-password-save]');
    const show=text=>{if(msg){msg.hidden=false;msg.textContent=text}};
    if(!navigator.onLine)return show('Şifre değişikliği için internet bağlantısı gerekiyor.');
    if(!current||!next||!repeat)return show('Tüm şifre alanlarını doldurun.');
    if(next.length<6)return show('Yeni şifre en az 6 karakter olmalıdır.');
    if(next!==repeat)return show('Yeni şifreler birbiriyle eşleşmiyor.');
    if(current===next)return show('Yeni şifre mevcut şifreden farklı olmalıdır.');
    if(typeof global.kendiSifremiDegistir!=='function')return show('Şifre değiştirme servisi hazır değil.');
    if(btn){btn.disabled=true;btn.textContent='Güncelleniyor…'}if(msg)msg.hidden=true;
    try{await global.kendiSifremiDegistir(current,next);closePasswordModal();global.toast?.('Şifreniz başarıyla değiştirildi.');}
    catch(err){show(passwordErrorMessage(err));if(btn){btn.disabled=false;btn.textContent='Şifreyi Güncelle'}}
  });
  setTimeout(()=>ov.querySelector('[data-password-current]')?.focus(),30);
}
function enhanceProfile(){
  const page=document.querySelector('.ka-profile-page');if(!page||page.querySelector('[data-profile-password-card]'))return;
  const section=document.createElement('section');section.className='ka-profile-section';section.dataset.profilePasswordCard='';
  section.innerHTML=`<article class="ka-card"><div class="ka-card__body ka-row"><span class="ka-avatar" aria-hidden="true">🔐</span><div class="ka-grow"><strong>Hesap Güvenliği</strong><div class="ka-muted">Mevcut şifrenizi doğrulayarak giriş şifrenizi değiştirebilirsiniz.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-profile-password-open>Şifre Değiştir</button></div></article>`;
  const logout=page.querySelector('[data-profile-logout]');if(logout)page.insertBefore(section,logout);else page.appendChild(section);
  section.querySelector('[data-profile-password-open]')?.addEventListener('click',openPasswordModal);
}

function flattenLoginRecords(){
  const stats=global.AppStore?.data?.(STATS_TYPE)||[],out=[];
  for(const s of stats){const uid=String(s.uid||s.id||''),fallback=s.ad||'';const history=Array.isArray(s.girisKayitlari)?s.girisKayitlari:[];for(const r of history){if(!validCoordinate(r?.lat,r?.lng))continue;out.push({...r,uid,displayName:displayNameForUid(uid,fallback)})}}
  return out.sort((a,b)=>(dateFrom(b.timestamp)?.getTime()||0)-(dateFrom(a.timestamp)?.getTime()||0));
}
function ensureLeafletCss(){
  if([...document.styleSheets].some(s=>String(s.href||'').includes('leaflet@1.9.4/dist/leaflet.css')))return Promise.resolve();
  return new Promise((resolve,reject)=>{const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>String(x.href||'').includes('leaflet@1.9.4/dist/leaflet.css'));if(existing){if(existing.sheet)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const link=document.createElement('link');link.rel='stylesheet';link.href=LEAFLET_CSS;link.onload=resolve;link.onerror=()=>reject(new Error('Harita stili yüklenemedi.'));document.head.appendChild(link)});
}
function ensureLeaflet(){
  if(global.L)return ensureLeafletCss().then(()=>true);
  if(leafletPromise)return leafletPromise;
  leafletPromise=Promise.all([ensureLeafletCss(),new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>String(s.src||'').includes('leaflet@1.9.4/dist/leaflet.js'));if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const script=document.createElement('script');script.src=LEAFLET_JS;script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('Harita kütüphanesi yüklenemedi.'));document.head.appendChild(script)})]).then(()=>!!global.L).catch(e=>{leafletPromise=null;throw e});
  return leafletPromise;
}
function locationSummaryHtml(records){
  const android=records.filter(r=>platformLabel(r.platform).startsWith('Android')).length,ios=records.filter(r=>platformLabel(r.platform).startsWith('iOS')).length,web=records.length-android-ios,users=new Set(records.map(r=>r.uid).filter(Boolean)).size;
  return `<div class="ka-statistics-summary"><article><span aria-hidden="true">⌖</span><div><small>Konum Kaydı</small><strong>${records.length}</strong></div></article><article><span aria-hidden="true">👥</span><div><small>Kullanıcı</small><strong>${users}</strong></div></article><article><span aria-hidden="true">📱</span><div><small>Mobil Uygulama</small><strong>${android+ios}</strong></div></article><article><span aria-hidden="true">🌐</span><div><small>Web</small><strong>${web}</strong></div></article></div>`;
}
function locationListHtml(records){
  const rows=records.slice(0,12);if(!rows.length)return'<div class="ka-empty">Henüz konum izni verilmiş bir giriş kaydı bulunmuyor.</div>';
  return rows.map((r,i)=>`<article class="ka-card ka-list-card"><div class="ka-card__body ka-row"><span class="ka-avatar" aria-hidden="true">${String(r.platform||'').includes('android')?'📱':String(r.platform||'').includes('ios')?'📱':'🌐'}</span><div class="ka-grow"><strong>${esc(r.displayName)}</strong><div class="ka-muted">${esc(platformLabel(r.platform))} · ${esc(dateText(r.timestamp))}</div><small class="ka-muted">${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)}</small></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-login-location-focus="${i}">Haritada Göster</button></div></article>`).join('');
}
async function drawLoginMap(section,records){
  const el=section.querySelector('[data-login-location-map]');if(!el)return;
  if(loginMap){try{loginMap.remove()}catch(_){}loginMap=null}
  if(!records.length){el.innerHTML='<div class="ka-map-loading">Gösterilecek konum kaydı yok.</div>';return}
  try{
    await ensureLeaflet();if(!el.isConnected)return;
    loginMap=global.L.map(el,{zoomControl:true,tap:true});
    global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(loginMap);
    const bounds=[];
    records.slice(0,80).forEach((r,i)=>{const pos=[Number(r.lat),Number(r.lng)],marker=global.L.marker(pos).addTo(loginMap);marker.bindPopup(`<strong>${esc(r.displayName)}</strong><br>${esc(platformLabel(r.platform))}<br>${esc(dateText(r.timestamp))}<br><small>${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)}</small>`);marker.__loginIndex=i;bounds.push(pos)});
    if(bounds.length===1)loginMap.setView(bounds[0],15);else loginMap.fitBounds(bounds,{padding:[28,28],maxZoom:16});
    section.querySelectorAll('[data-login-location-focus]').forEach(b=>b.addEventListener('click',()=>{const r=records[Number(b.dataset.loginLocationFocus)];if(!r||!loginMap)return;loginMap.setView([Number(r.lat),Number(r.lng)],16);for(const layer of Object.values(loginMap._layers||{})){if(layer?.__loginIndex===Number(b.dataset.loginLocationFocus)){layer.openPopup?.();break}}}));
    requestAnimationFrame(()=>loginMap?.invalidateSize());
  }catch(e){console.warn('[Giriş konum haritası]',e?.message||e);el.innerHTML='<div class="ka-map-loading">Harita yüklenemedi. Konum kayıtları aşağıdaki listede gösteriliyor.</div>'}
}
async function renderLocationSection(section,{refresh=false}={}){
  if(!section?.isConnected||!isAdmin()||locationRendering)return;
  locationRendering=true;
  const status=section.querySelector('[data-login-location-status]');if(status)status.textContent=refresh?'Yenileniyor…':'Konum kayıtları hazırlanıyor…';
  try{await global.IstatistikService?.prepare?.(true);const records=flattenLoginRecords();const summary=section.querySelector('[data-login-location-summary]'),list=section.querySelector('[data-login-location-list]');if(summary)summary.innerHTML=locationSummaryHtml(records);if(list)list.innerHTML=locationListHtml(records);if(status)status.textContent=records.length?`${records.length} giriş konumu · son ${Math.min(records.length,80)} kayıt haritada`:'Konum kaydı yok';await drawLoginMap(section,records)}catch(e){console.warn('[Giriş konumları]',e?.message||e);if(status)status.textContent='Konum kayıtları yüklenemedi.'}finally{locationRendering=false}
}
function enhanceStatistics(){
  if(!isAdmin())return;
  const page=document.querySelector('.ka-statistics-page');if(!page||page.querySelector('[data-login-location-section]'))return;
  const section=document.createElement('section');section.className='ka-card';section.dataset.loginLocationSection='';
  section.innerHTML=`<div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><div><strong>Giriş Konumları ve Platformlar</strong><div class="ka-muted">Kullanıcıların izin verdiği giriş konumlarını ve uygulamaya hangi platformdan bağlandıklarını görüntüleyin.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-login-location-refresh>↻ Yenile</button></div><div class="ka-muted" data-login-location-status>Konum kayıtları hazırlanıyor…</div><div data-login-location-summary></div><div class="ka-map-canvas-wrap"><div class="ka-map-canvas" data-login-location-map aria-label="Kullanıcı giriş konumları haritası"><div class="ka-map-loading">Harita hazırlanıyor…</div></div></div><div class="ka-stack" data-login-location-list></div></div>`;
  const summary=page.querySelector('.ka-statistics-summary');if(summary)summary.insertAdjacentElement('afterend',section);else page.appendChild(section);
  section.querySelector('[data-login-location-refresh]')?.addEventListener('click',()=>renderLocationSection(section,{refresh:true}));
  void renderLocationSection(section);
}
function enhance(){enhanceProfile();enhanceStatistics()}
function bind(){
  if(observer)return;
  observer=new MutationObserver(()=>queueMicrotask(enhance));observer.observe(document.body,{childList:true,subtree:true});
  global.addEventListener('koruk:app-ready',()=>{recordLoginLocation();enhance()});
  global.addEventListener('koruk:auth-local-restored',()=>recordLoginLocation());
  if(global.AppStore?.subscribe){global.AppStore.subscribe('session.user',u=>{if(u?.uid)recordLoginLocation()},{immediate:true});locationUnsub=global.AppStore.subscribe('data.'+STATS_TYPE,()=>{const section=document.querySelector('[data-login-location-section]');if(section&&isAdmin())void renderLocationSection(section)})}
  setTimeout(()=>{recordLoginLocation();enhance()},0);
  let checks=0;const authWatch=setInterval(()=>{checks++;if(user()?.uid){recordLoginLocation();clearInterval(authWatch)}else if(checks>=40)clearInterval(authWatch)},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
global.LoginSecurityFeature={openPasswordModal,recordLoginLocation,enhance,flattenLoginRecords};
})(window);
