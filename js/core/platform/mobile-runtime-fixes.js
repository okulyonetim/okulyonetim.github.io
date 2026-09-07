/* Koruk Asistan — Android WebView çalışma zamanı düzeltmeleri.
 * MainActivity uygulama hazır olduğunda yükler.
 * Planlı tatil formunda seçilen ancak henüz kaydedilmeyen tarihlerin,
 * arka plan senkronu nedeniyle SettingsModule yeniden render olduğunda
 * eski değere dönmesini engeller.
 */
(function(global){
'use strict';
if(global.KorukNativeRuntimeFixes)return;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
let draft=null;
let saving=false;
let restoring=false;
let restoreQueued=false;

function card(){return q('[data-quality-holiday-card]')}
function rows(root){return qa('[data-quality-holiday-range-row]',root)}
function holidayField(el){return !!el?.matches?.('[data-quality-holiday-name],[data-quality-holiday-start],[data-quality-holiday-end],[data-quality-holiday-note]')&&!!el.closest?.('[data-quality-holiday-card]')}
function holidayEditorFocused(){const a=document.activeElement;return !!a&&holidayField(a)}

/* SettingsModule, ui.syncing/pendingWrites/lastSyncAt gibi arka plan durumları
   değiştiğinde tüm ayar sayfasını yeniden çiziyor. Android tarih seçici açıkken
   bu yeniden çizim input elementini DOM'dan koparıp seçimi eski değere çeviriyor.
   Settings lazy yüklendiği için AppStore.subscribe'ı burada erken sarıp yalnız
   tatil alanı aktifken bu teknik güncellemeleri ertelemek yeterli. */
function guardSettingsRerenders(){
  const store=global.AppStore;
  if(!store?.subscribe||store.subscribe.__korukHolidayGuard)return;
  const original=store.subscribe.bind(store);
  const guardedPaths=new Set(['ui.syncing','ui.pendingWrites','ui.lastSyncAt','meta.hydrated','data.dersSaatleri']);
  const wrapped=function(path,callback){
    if(!guardedPaths.has(path)||typeof callback!=='function')return original(path,callback);
    return original(path,(...args)=>{if(holidayEditorFocused())return;callback(...args)});
  };
  wrapped.__korukHolidayGuard=true;
  wrapped.__korukOriginal=original;
  store.subscribe=wrapped;
}

function snapshot(root=card()){
  if(restoring||!root)return;
  draft={dirty:true,rows:rows(root).map((row,i)=>({
    id:String(row.dataset.holidayId||`draft-${i}`),
    ad:q('[data-quality-holiday-name]',row)?.value||'',
    baslangicTarihi:q('[data-quality-holiday-start]',row)?.value||'',
    bitisTarihi:q('[data-quality-holiday-end]',row)?.value||'',
    not:q('[data-quality-holiday-note]',row)?.value||''
  }))};
}

function applyRow(row,item){
  row.dataset.holidayId=item.id||row.dataset.holidayId||'';
  const name=q('[data-quality-holiday-name]',row),start=q('[data-quality-holiday-start]',row),end=q('[data-quality-holiday-end]',row),note=q('[data-quality-holiday-note]',row);
  if(name)name.value=item.ad||'';
  if(start)start.value=item.baslangicTarihi||'';
  if(end)end.value=item.bitisTarihi||'';
  if(note)note.value=item.not||'';
  const title=row.querySelector('.ka-row strong');
  if(title)title.textContent=item.ad||'Tatil';
}

function restore(){
  if(restoring||!draft?.dirty)return;
  const root=card();if(!root)return;
  restoring=true;
  try{
    let current=rows(root);
    const add=q('[data-quality-holiday-add]',root);
    while(current.length<draft.rows.length&&add){add.click();current=rows(root)}
    while(current.length>draft.rows.length){
      const last=current[current.length-1],remove=q('[data-quality-holiday-remove]',last);
      if(!remove)break;
      remove.click();current=rows(root);
    }
    current.forEach((row,i)=>{if(draft.rows[i])applyRow(row,draft.rows[i])});
  }finally{restoring=false}
}

function queueRestore(){
  if(restoreQueued)return;
  restoreQueued=true;
  requestAnimationFrame(()=>{restoreQueued=false;restore()});
}

function fieldChanged(e){if(holidayField(e.target))snapshot(e.target.closest('[data-quality-holiday-card]'))}
function clicked(e){
  const root=e.target.closest?.('[data-quality-holiday-card]');if(!root)return;
  if(e.target.closest('[data-quality-holiday-save]'))saving=true;
  if(e.target.closest('[data-quality-holiday-add],[data-quality-holiday-remove]'))setTimeout(()=>snapshot(root),0);
}

function start(){
  guardSettingsRerenders();
  document.addEventListener('input',fieldChanged,true);
  document.addEventListener('change',fieldChanged,true);
  document.addEventListener('focusin',e=>{if(holidayField(e.target))snapshot(e.target.closest('[data-quality-holiday-card]'))},true);
  document.addEventListener('click',clicked,false);
  new MutationObserver(queueRestore).observe(document.documentElement,{childList:true,subtree:true});
  const subscribe=global.AppStore?.subscribe?.__korukOriginal||global.AppStore?.subscribe?.bind?.(global.AppStore);
  subscribe?.('data.dersSaatleri',()=>{
    if(saving){draft=null;saving=false;return}
    queueRestore();
  });
  global.addEventListener('koruk:app-ready',()=>{guardSettingsRerenders();queueRestore()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){guardSettingsRerenders();queueRestore()}});
  setInterval(restore,800);
}

global.KorukNativeRuntimeFixes={snapshotHolidayDraft:snapshot,restoreHolidayDraft:restore,guardSettingsRerenders};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);

/* Koruk Asistan — Android uygulama içi güncelleme yöneticisi.
 * Her açılışta GitHub'daki latest release ile APK içine gömülü version.json
 * karşılaştırılır. Yeni sürüm varsa kullanıcıya uyarı gösterilir; Ayarlar >
 * Hesap ve Güvenlik alanına da manuel "Güncellemeleri Kontrol Et" eylemi eklenir.
 */
(function(global){
'use strict';
if(global.KorukAppUpdateManager)return;

const RELEASE_API='https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases/latest';
let checkPromise=null,startupChecked=false,settingsObserver=null;
const native=()=>{try{return !!global.Capacitor?.isNativePlatform?.()}catch(_){return false}};
const toast=message=>global.toast?.(message)||console.log('[AppUpdate]',message);

function parseBuild(value){
  const m=String(value??'').match(/(\d+)/g);
  if(!m?.length)return 0;
  const n=Number(m[m.length-1]);
  return Number.isFinite(n)?n:0;
}
async function currentBuild(){
  const r=await fetch(`version.json?_=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`Mevcut sürüm okunamadı (HTTP ${r.status}).`);
  const j=await r.json(),build=Number(j?.kod||0);
  if(!Number.isFinite(build)||build<1)throw new Error('Mevcut sürüm numarası geçersiz.');
  return{build,name:String(j?.surum||`Sürüm ${build}`)};
}
async function latestRelease(){
  const r=await fetch(`${RELEASE_API}?_=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!r.ok)throw new Error(`Güncelleme sunucusuna ulaşılamadı (HTTP ${r.status}).`);
  const j=await r.json(),build=parseBuild(j?.tag_name||j?.name),asset=(Array.isArray(j?.assets)?j.assets:[]).find(x=>String(x?.name||'').toLowerCase().endsWith('.apk'));
  if(!build)throw new Error('Son sürüm numarası okunamadı.');
  if(!asset?.browser_download_url)throw new Error('Son sürüm APK dosyası bulunamadı.');
  return{build,name:String(j?.name||j?.tag_name||`Sürüm ${build}`),apkUrl:String(asset.browser_download_url),publishedAt:j?.published_at||''};
}
async function versionInfo(){
  const [current,latest]=await Promise.all([currentBuild(),latestRelease()]);
  return{current,latest,updateAvailable:latest.build>current.build};
}
function updatePlugin(){
  try{return global.Capacitor?.Plugins?.UpdatePlugin||global.Capacitor?.registerPlugin?.('UpdatePlugin')||null}catch(_){return null}
}
function closeUpdateModal(){document.getElementById('kaAppUpdateModal')?.remove()}
function showUpdateModal(info){
  closeUpdateModal();
  const ov=document.createElement('div');
  ov.id='kaAppUpdateModal';ov.className='ka-modal-backdrop';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><strong>Yeni Güncelleme Hazır</strong><div class="ka-muted">Koruk Asistan için yeni APK sürümü bulundu.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-update-close>Kapat</button></div><div class="ka-modal__body ka-stack"><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><span>Mevcut sürüm</span><strong>${info.current.build}</strong></div><div class="ka-row ka-row--between"><span>Yeni sürüm</span><strong>${info.latest.build}</strong></div><div class="ka-muted">Güncelleme uygulama içinde indirilecek. Android kurulum ekranında yalnızca son yükleme onayını vermeniz gerekir.</div></div></article></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-update-later>Daha Sonra</button><button class="ka-btn" type="button" data-update-install>⬇️ Şimdi Güncelle</button></div></section>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.querySelector('[data-update-close]')?.addEventListener('click',close);
  ov.querySelector('[data-update-later]')?.addEventListener('click',close);
  ov.addEventListener('click',e=>{if(e.target===ov)close()});
  ov.querySelector('[data-update-install]')?.addEventListener('click',async e=>{
    const btn=e.currentTarget,plugin=updatePlugin();
    if(!plugin?.indirVeKur){toast('Uygulama güncelleme bileşeni hazır değil.');return}
    btn.disabled=true;btn.textContent='İndiriliyor…';
    try{await plugin.indirVeKur({url:info.latest.apkUrl});btn.textContent='Kurulum açılıyor…'}catch(err){console.error('[AppUpdate/install]',err);btn.disabled=false;btn.textContent='⬇️ Şimdi Güncelle';toast('Güncelleme indirilemedi: '+(err?.message||err))}
  });
  return ov;
}
async function check({manual=false,prompt=true}={}){
  if(!native()){
    if(manual)toast('Güncelleme kontrolü Android uygulamasında kullanılabilir.');
    return{native:false,updateAvailable:false};
  }
  if(checkPromise)return checkPromise;
  checkPromise=(async()=>{
    try{
      const info=await versionInfo();
      if(info.updateAvailable){if(prompt)showUpdateModal(info);else if(manual)toast(`Yeni sürüm hazır: ${info.latest.build}`)}
      else if(manual)toast(`Uygulama güncel. Sürüm ${info.current.build}.`);
      return{native:true,...info};
    }catch(err){
      console.warn('[AppUpdate/check]',err?.message||err);
      if(manual)toast(err?.message||'Güncelleme kontrol edilemedi.');
      return{native:true,error:err,updateAvailable:false};
    }finally{checkPromise=null}
  })();
  return checkPromise;
}
function injectSettingsAction(){
  if(!native()||document.querySelector('[data-app-update-settings]'))return;
  const body=document.querySelector('[data-settings-accordion="account"] .ka-settings-accordion__body');
  if(!body)return;
  const btn=document.createElement('button');
  btn.type='button';btn.className='ka-settings-accordion__item';btn.dataset.appUpdateSettings='';
  btn.innerHTML='<span><strong>Güncellemeleri Kontrol Et</strong><small>Yeni Android APK sürümünü kontrol edin</small></span><span aria-hidden="true">›</span>';
  btn.addEventListener('click',()=>{toast('Güncellemeler kontrol ediliyor…');check({manual:true,prompt:true})});
  body.appendChild(btn);
}
function start(){
  injectSettingsAction();
  if(!settingsObserver){settingsObserver=new MutationObserver(injectSettingsAction);settingsObserver.observe(document.documentElement,{childList:true,subtree:true})}
  if(!startupChecked){startupChecked=true;setTimeout(()=>check({manual:false,prompt:true}),1800)}
  global.addEventListener('koruk:app-ready',()=>{injectSettingsAction();if(!startupChecked){startupChecked=true;setTimeout(()=>check({manual:false,prompt:true}),1200)}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')injectSettingsAction()});
}

global.KorukAppUpdateManager={check,currentBuild,latestRelease,versionInfo,showUpdateModal,injectSettingsAction};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
