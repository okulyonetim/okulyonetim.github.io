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

/* SettingsModule mount sırasında önce kabuğu oluşturup localHydrate tamamlanana
   kadar içerik renderını bekliyordu. Android WebView'de hydrate gecikirse kullanıcı
   yalnızca "Ayarlar" başlığını görüyordu. Mount'u bir kez sarıp kabuk oluşur oluşmaz
   mevcut AppStore verisiyle render ediyor, hydrate tamamlanınca tekrar güncelliyoruz. */
function renderSettingsSafely(){
  try{global.SettingsModule?.render?.()}catch(error){console.warn('[Settings/first-render]',error?.message||error)}
}
function patchSettingsMount(){
  const mod=global.SettingsModule;
  if(!mod?.mount)return false;
  if(mod.mount.__korukImmediateRender){if(document.querySelector('[data-settings-module]'))renderSettingsSafely();return true}
  const original=mod.mount.bind(mod);
  const wrapped=function(root){
    let pending;
    try{pending=original(root)}catch(error){console.warn('[Settings/mount]',error?.message||error);renderSettingsSafely();return Promise.resolve(false)}
    renderSettingsSafely();
    return Promise.resolve(pending).then(value=>{renderSettingsSafely();return value},error=>{console.warn('[Settings/hydrate]',error?.message||error);renderSettingsSafely();return true});
  };
  wrapped.__korukImmediateRender=true;
  wrapped.__korukOriginal=original;
  mod.mount=wrapped;
  if(document.querySelector('[data-settings-module]'))renderSettingsSafely();
  return true;
}

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
  patchSettingsMount();
  guardSettingsRerenders();
  global.addEventListener('koruk:module-ready',event=>{if(event.detail?.name==='settings'){patchSettingsMount();setTimeout(renderSettingsSafely,0)}});
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
  global.addEventListener('koruk:app-ready',()=>{patchSettingsMount();guardSettingsRerenders();queueRestore()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){patchSettingsMount();guardSettingsRerenders();queueRestore()}});
  setInterval(restore,800);
}

global.KorukNativeRuntimeFixes={snapshotHolidayDraft:snapshot,restoreHolidayDraft:restore,guardSettingsRerenders,patchSettingsMount,renderSettingsSafely};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);

/* Koruk Asistan — Android uygulama içi güncelleme yöneticisi.
 * Her açılışta GitHub'daki kullanıcılara yayınlanmış latest release ile APK içine
 * gömülü version.json karşılaştırılır. Ayarlar ekranında mevcut sürüm ve kontrol
 * sonucu kalıcı olarak gösterilir.
 */
(function(global){
'use strict';
if(global.KorukAppUpdateManager)return;

const RELEASE_API='https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases/latest';
const RELEASE_LIST_API='https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases?per_page=10';
let checkPromise=null,startupChecked=false,currentCache=null,startupTimer=null;
let updateState={phase:'idle',current:null,latest:null,error:null};
const native=()=>{try{return !!global.Capacitor?.isNativePlatform?.()}catch(_){return false}};
const toast=message=>global.toast?.(message)||console.log('[AppUpdate]',message);

function parseBuild(value){
  const m=String(value??'').match(/(\d+)/g);
  if(!m?.length)return 0;
  const n=Number(m[m.length-1]);
  return Number.isFinite(n)?n:0;
}
function versionLabel(info){
  const build=Number(info?.build||0),name=String(info?.name||'').trim();
  if(name&&name!==`Sürüm ${build}`&&name!==`Surum ${build}`)return name;
  return build?`1.2.${build}`:'—';
}
function settingsStatusText(){
  const current=updateState.current?versionLabel(updateState.current):'';
  const latest=updateState.latest?versionLabel(updateState.latest):'';
  if(updateState.phase==='checking')return current?`Kontrol ediliyor… • Mevcut sürüm: ${current}`:'Güncellemeler kontrol ediliyor…';
  if(updateState.phase==='update')return`Yeni güncelleme hazır: ${latest} • Mevcut: ${current||'—'}`;
  if(updateState.phase==='current')return`Uygulama güncel • Mevcut: ${current||'—'}${latest?` • Yayınlanan: ${latest}`:''}`;
  if(updateState.phase==='error')return`Kontrol edilemedi${current?` • Mevcut sürüm: ${current}`:''}`;
  return current?`Mevcut sürüm: ${current}`:'Mevcut sürüm okunuyor…';
}
function syncSettingsAction(){
  const btn=document.querySelector('[data-app-update-settings]');
  if(!btn)return;
  const status=btn.querySelector('[data-app-update-status]'),next=settingsStatusText();
  if(status&&status.textContent!==next)status.textContent=next;
  if(btn.dataset.updateState!==updateState.phase)btn.dataset.updateState=updateState.phase;
}
function setUpdateState(patch){updateState={...updateState,...patch};syncSettingsAction();return updateState}
async function currentBuild(){
  if(currentCache)return currentCache;
  const r=await fetch(`version.json?_=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`Mevcut sürüm okunamadı (HTTP ${r.status}).`);
  const j=await r.json(),build=Number(j?.kod||0);
  if(!Number.isFinite(build)||build<1)throw new Error('Mevcut sürüm numarası geçersiz.');
  currentCache={build,name:String(j?.surum||`Sürüm ${build}`)};
  setUpdateState({current:currentCache});
  return currentCache;
}
async function fetchReleaseJson(url){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),12000):null;
  try{
    const r=await fetch(`${url}${url.includes('?')?'&':'?'}_=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:controller?.signal});
    if(!r.ok){
      if(r.status===403)throw new Error('Güncelleme sunucusu geçici sorgu sınırına ulaştı. Birkaç dakika sonra yeniden deneyin.');
      throw new Error(`Güncelleme sunucusuna ulaşılamadı (HTTP ${r.status}).`);
    }
    return await r.json();
  }catch(err){
    if(err?.name==='AbortError')throw new Error('Güncelleme kontrolü zaman aşımına uğradı.');
    throw err;
  }finally{if(timer)clearTimeout(timer)}
}
function releaseInfo(j){
  const build=parseBuild(j?.tag_name||j?.name),asset=(Array.isArray(j?.assets)?j.assets:[]).find(x=>String(x?.name||'').toLowerCase().endsWith('.apk'));
  if(!build)throw new Error('Son sürüm numarası okunamadı.');
  if(!asset?.browser_download_url)throw new Error('Son sürüm APK dosyası bulunamadı.');
  return{build,name:String(j?.name||j?.tag_name||`Sürüm ${build}`),apkUrl:String(asset.browser_download_url),publishedAt:j?.published_at||''};
}
async function latestRelease(){
  try{return releaseInfo(await fetchReleaseJson(RELEASE_API))}
  catch(primary){
    try{
      const list=await fetchReleaseJson(RELEASE_LIST_API);
      for(const item of Array.isArray(list)?list:[]){
        if(item?.draft||item?.prerelease)continue;
        try{return releaseInfo(item)}catch(_){/* sonraki yayına bak */}
      }
    }catch(fallback){
      if(String(primary?.message||'').includes('sorgu sınırına'))throw primary;
      throw fallback;
    }
    throw primary;
  }
}
async function versionInfo(){
  const current=await currentBuild();
  const latest=await latestRelease();
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
  ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><strong>Yeni Güncelleme Hazır</strong><div class="ka-muted">Koruk Asistan için yeni APK sürümü bulundu.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-update-close>Kapat</button></div><div class="ka-modal__body ka-stack"><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><span>Mevcut sürüm</span><strong>${versionLabel(info.current)}</strong></div><div class="ka-row ka-row--between"><span>Yeni sürüm</span><strong>${versionLabel(info.latest)}</strong></div><div class="ka-muted">Güncelleme uygulama içinde indirilecek. Android kurulum ekranında yalnızca son yükleme onayını vermeniz gerekir.</div></div></article></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-update-later>Daha Sonra</button><button class="ka-btn" type="button" data-update-install>⬇️ Şimdi Güncelle</button></div></section>`;
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
function showUpToDateModal(info){
  closeUpdateModal();
  const ov=document.createElement('div');
  ov.id='kaAppUpdateModal';ov.className='ka-modal-backdrop';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><strong>Uygulama Güncel</strong><div class="ka-muted">Bu cihazdaki sürüm, yayınlanan son Android sürümüyle aynı veya daha yeni.</div></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-update-close>Kapat</button></div><div class="ka-modal__body ka-stack"><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><span>Mevcut sürüm</span><strong>${versionLabel(info.current)}</strong></div><div class="ka-row ka-row--between"><span>Yayınlanan son sürüm</span><strong>${versionLabel(info.latest)}</strong></div></div></article></div><div class="ka-modal__footer"><button class="ka-btn" type="button" data-update-close>Tamam</button></div></section>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.querySelectorAll('[data-update-close]').forEach(x=>x.addEventListener('click',close));
  ov.addEventListener('click',e=>{if(e.target===ov)close()});
  return ov;
}
async function performCheck(){
  let current=updateState.current||null;
  try{
    current=await currentBuild();
    const info=await versionInfo();
    return{native:true,...info};
  }catch(err){
    console.warn('[AppUpdate/check]',err?.message||err);
    return{native:true,current,error:err,updateAvailable:false};
  }
}
function presentResult(result,{manual=false,prompt=true}={}){
  if(result?.error){
    setUpdateState({phase:'error',current:result.current||updateState.current,error:result.error});
    if(manual)toast(result.error?.message||'Güncelleme kontrol edilemedi.');
    return result;
  }
  const phase=result.updateAvailable?'update':'current';
  setUpdateState({phase,current:result.current,latest:result.latest,error:null});
  if(result.updateAvailable){
    if(prompt)showUpdateModal(result);
    else if(manual)toast(`Yeni güncelleme hazır: ${versionLabel(result.latest)}`);
  }else if(manual){
    if(prompt)showUpToDateModal(result);
    toast(`Uygulama güncel. Mevcut sürüm ${versionLabel(result.current)}.`);
  }
  return result;
}
async function check({manual=false,prompt=true}={}){
  if(!native()){
    if(manual)toast('Güncelleme kontrolü Android uygulamasında kullanılabilir.');
    return{native:false,updateAvailable:false};
  }
  if(!checkPromise){
    setUpdateState({phase:'checking',error:null});
    checkPromise=performCheck().finally(()=>{checkPromise=null});
  }
  const result=await checkPromise;
  return presentResult(result,{manual,prompt});
}
function injectSettingsAction(){syncSettingsAction()}
function scheduleStartupCheck(delay){
  if(startupTimer)return;
  startupTimer=setTimeout(async()=>{
    startupTimer=null;
    const result=await check({manual:false,prompt:true});
    if(result?.error)startupChecked=false;
  },delay);
}
function retryStartupCheck(delay=350){
  if(startupChecked||checkPromise||updateState.phase!=='error')return;
  startupChecked=true;
  scheduleStartupCheck(delay);
}
function start(){
  syncSettingsAction();
  currentBuild().catch(err=>console.warn('[AppUpdate/current]',err?.message||err));
  if(!startupChecked){startupChecked=true;scheduleStartupCheck(1800)}
  global.addEventListener('koruk:app-ready',()=>{syncSettingsAction();if(!startupChecked){startupChecked=true;scheduleStartupCheck(1200)}});
  global.addEventListener('online',()=>retryStartupCheck(250));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){syncSettingsAction();retryStartupCheck()}});
}

global.KorukAppUpdateManager={check,currentBuild,latestRelease,versionInfo,showUpdateModal,showUpToDateModal,injectSettingsAction,syncSettingsAction,statusText:settingsStatusText,retryStartupCheck};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);