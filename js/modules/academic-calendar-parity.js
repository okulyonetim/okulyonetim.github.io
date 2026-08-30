/* Koruk Asistan — Akademik Takvim klasik çalışma alanı paritesi
 * AcademicModule veri/servis sözleşmesini değiştirmez. Yalnız academic/calendar
 * sayfası açıldığında eski tam ekran poster görüntüleme ve admin yükleme UX'ini
 * mevcut AkademikTakvimService üzerinde yeniden üretir.
 */
(function(global){
'use strict';
if(global.AcademicCalendarParity)return;

const CACHE_NAME='koruk-akademik-takvim-poster-v1';
let overlay=null;
let objectUrl='';
let cacheUnsub=null;
let calendarPageActive=false;
let installed=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeUser=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const isAdmin=()=>activeUser().admin===true;
const rows=()=>{const v=global.AppStore?.data?.('akademikTakvim');return Array.isArray(v)?v:[]};
const current=()=>rows().find(x=>x?.id==='aktif')||rows()[0]||null;
const fmtDate=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})};

function revokeObjectUrl(){
  if(objectUrl&&global.URL?.revokeObjectURL){try{global.URL.revokeObjectURL(objectUrl)}catch(_){}}
  objectUrl='';
}

async function cachedSource(meta){
  revokeObjectUrl();
  if(!meta?.gorselUrl)return'';
  if(!global.caches?.open)return meta.gorselUrl;
  try{
    const cache=await global.caches.open(CACHE_NAME);
    let response=await cache.match(meta.gorselUrl);
    if(!response){
      response=await global.fetch(meta.gorselUrl,{cache:'no-store'});
      if(response?.ok)await cache.put(meta.gorselUrl,response.clone());
    }
    if(response?.ok){
      const blob=await response.blob();
      if(blob?.size&&global.URL?.createObjectURL){objectUrl=global.URL.createObjectURL(blob);return objectUrl;}
    }
  }catch(_){/* Ağ yoksa doğrudan URL denenir; cache yoksa boş durum tarayıcı tarafından yönetilir. */}
  return meta.gorselUrl;
}

async function refreshImageCache(meta){
  if(!meta?.gorselUrl||!global.caches?.open)return;
  try{
    const cache=await global.caches.open(CACHE_NAME);
    const response=await global.fetch(meta.gorselUrl,{cache:'no-store'});
    if(response?.ok)await cache.put(meta.gorselUrl,response.clone());
  }catch(_){/* çevrimdışıyken mevcut cache korunur */}
}

async function clearImageCache(){
  revokeObjectUrl();
  if(global.caches?.delete)try{await global.caches.delete(CACHE_NAME)}catch(_){}
}

function gestureBind(stage,img){
  if(!stage||!img)return;
  let zoom=1,panX=0,panY=0,startDistance=0,startZoom=1;
  let dragging=false,dragX=0,dragY=0,panStartX=0,panStartY=0;
  let tapCandidate=false,tapX=0,tapY=0,multiTouch=false,lastTap=0;
  const apply=()=>{img.style.transform=`translate3d(${panX}px,${panY}px,0) scale(${zoom})`};
  const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  const reset=()=>{zoom=1;panX=0;panY=0;apply()};
  const toggleZoom=()=>{if(zoom>1.02)reset();else{zoom=2.2;panX=0;panY=0;apply()}};

  stage.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      multiTouch=true;startDistance=distance(e.touches[0],e.touches[1]);startZoom=zoom;dragging=false;tapCandidate=false;
    }else if(e.touches.length===1){
      multiTouch=false;tapCandidate=true;tapX=e.touches[0].clientX;tapY=e.touches[0].clientY;
      if(zoom>1.02){dragging=true;dragX=tapX;dragY=tapY;panStartX=panX;panStartY=panY;}
    }
  },{passive:true});
  stage.addEventListener('touchmove',e=>{
    if(e.touches.length===2&&startDistance>0){
      zoom=Math.min(6,Math.max(1,startZoom*(distance(e.touches[0],e.touches[1])/startDistance)));apply();
    }else if(e.touches.length===1){
      const x=e.touches[0].clientX,y=e.touches[0].clientY;
      if(Math.abs(x-tapX)>10||Math.abs(y-tapY)>10)tapCandidate=false;
      if(dragging){panX=panStartX+(x-dragX);panY=panStartY+(y-dragY);apply();}
    }
  },{passive:true});
  stage.addEventListener('touchend',e=>{
    dragging=false;if(e.touches.length)return;
    if(tapCandidate&&!multiTouch){const now=Date.now();if(now-lastTap<300){toggleZoom();lastTap=0}else lastTap=now;}
    multiTouch=false;tapCandidate=false;
  },{passive:true});

  stage.addEventListener('dblclick',e=>{e.preventDefault();toggleZoom()});
  stage.addEventListener('wheel',e=>{
    e.preventDefault();const next=Math.min(6,Math.max(1,zoom*(e.deltaY<0?1.15:0.87)));zoom=next;if(zoom===1){panX=0;panY=0}apply();
  },{passive:false});
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||zoom<=1.02)return;dragging=true;dragX=e.clientX;dragY=e.clientY;panStartX=panX;panStartY=panY;stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove',e=>{if(!dragging||e.pointerType==='touch')return;panX=panStartX+(e.clientX-dragX);panY=panStartY+(e.clientY-dragY);apply()});
  stage.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')dragging=false});
  stage.addEventListener('pointercancel',()=>{dragging=false});
}

function closeOverlay(){
  cacheUnsub?.();cacheUnsub=null;
  overlay?.remove();overlay=null;
  revokeObjectUrl();
  document.body.classList.remove('modal-open');
}

function topBar(meta){
  const label=meta?.gorselUrl?'Değiştir':'Yükle';
  return `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;padding:12px 14px;background:var(--ka-card-raised-bg,#17211d);border-bottom:1px solid var(--ka-border);color:var(--ka-text,#fff);">
    <button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-academic-calendar-close>← Kapat</button>
    <div style="min-width:0;text-align:center"><strong>📅 Akademik Takvim</strong>${meta?.guncellenmeTarihi?`<div style="font-size:11px;opacity:.7">${esc(fmtDate(meta.guncellenmeTarihi))}${meta?.yukleyenAdi?` · ${esc(meta.yukleyenAdi)}`:''}</div>`:''}</div>
    <div>${isAdmin()?`<input type="file" accept="image/*" data-academic-calendar-file hidden><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-academic-calendar-pick>🖼️ ${label}</button>`:'<span style="display:inline-block;width:72px"></span>'}</div>
  </div>`;
}

async function renderOverlay(meta=current()){
  if(!overlay)return;
  overlay.innerHTML=`${topBar(meta)}<div data-academic-calendar-stage style="flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;background:#111815"><div class="ka-muted" data-academic-calendar-loading>${meta?.gorselUrl?'Takvim hazırlanıyor…':'Henüz bir akademik takvim görseli yüklenmemiş.'}</div></div><div style="padding:7px 12px;text-align:center;font-size:11px;color:rgba(255,255,255,.68);background:#111815">İki parmakla yakınlaştırın · yakınlaştırınca sürükleyin · çift dokunuşla hızlı yakınlaştırın</div>`;
  overlay.querySelector('[data-academic-calendar-close]')?.addEventListener('click',closeOverlay);
  const input=overlay.querySelector('[data-academic-calendar-file]');
  overlay.querySelector('[data-academic-calendar-pick]')?.addEventListener('click',()=>input?.click());
  input?.addEventListener('change',()=>uploadImage(input.files?.[0],meta));
  if(!meta?.gorselUrl)return;
  const stage=overlay.querySelector('[data-academic-calendar-stage]');
  const src=await cachedSource(meta);
  if(!overlay||!stage)return;
  stage.innerHTML=`<img data-academic-calendar-image src="${esc(src)}" alt="Akademik Takvim" draggable="false" style="display:block;max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;will-change:transform;user-select:none;-webkit-user-drag:none">`;
  const img=stage.querySelector('[data-academic-calendar-image]');
  img?.addEventListener('error',()=>{if(stage&&stage.isConnected)stage.innerHTML='<div class="ka-muted">Takvim görseli çevrimdışı kullanılamıyor. İnternet bağlantısı geldiğinde yeniden deneyin.</div>'},{once:true});
  gestureBind(stage,img);
  refreshImageCache(meta);
}

async function uploadImage(file,previous=current()){
  if(!file)return;
  if(!isAdmin()){global.toast?.('Bu işlem yalnızca yönetici tarafından yapılabilir.');return;}
  if(!String(file.type||'').startsWith('image/')){global.toast?.('Lütfen bir görsel dosyası seçin.');return;}
  const stage=overlay?.querySelector('[data-academic-calendar-stage]');
  if(stage)stage.innerHTML='<div class="ka-muted" data-academic-calendar-progress>Yükleniyor… %0</div>';
  try{
    const next=await global.AkademikTakvimService.gorselYukle(file,p=>{const el=overlay?.querySelector('[data-academic-calendar-progress]');if(el)el.textContent=`Yükleniyor… %${p}`},previous);
    await clearImageCache();
    global.toast?.('Akademik takvim güncellendi.');
    await renderOverlay(next);
  }catch(e){
    const msg=String(e?.message||e||'');
    if(msg.startsWith('depolama-siniri:'))global.toast?.(msg.slice('depolama-siniri:'.length));
    else if(msg!=='yetkisiz')global.toast?.('Yükleme hatası: '+msg);
    await renderOverlay(previous);
  }
}

function subscribeWhileOpen(){
  cacheUnsub?.();cacheUnsub=null;
  cacheUnsub=global.AppStore?.subscribe?.('data.akademikTakvim',()=>{if(overlay)requestAnimationFrame(()=>renderOverlay(current()))})||null;
}

function openOverlay(meta=current()){
  closeOverlay();
  overlay=document.createElement('section');
  overlay.id='kaAcademicCalendarOverlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Akademik Takvim');
  overlay.style.cssText='position:fixed;inset:0;z-index:1250;display:flex;flex-direction:column;background:#111815;color:#fff;';
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  subscribeWhileOpen();
  renderOverlay(meta);
  return true;
}

function install(){
  if(installed)return true;
  const mod=global.AcademicModule;
  if(!mod?.openPage)return false;
  const originalOpen=mod.openPage.bind(mod),originalUnmount=mod.unmount?.bind(mod);
  mod.openPage=function(page,title=''){
    const result=originalOpen(page,title);
    calendarPageActive=page==='calendar';
    if(calendarPageActive)requestAnimationFrame(()=>openOverlay(current()));
    else closeOverlay();
    return result;
  };
  if(originalUnmount)mod.unmount=function(){calendarPageActive=false;closeOverlay();return originalUnmount()};
  mod.openAcademicCalendar=()=>{calendarPageActive=true;return openOverlay(current())};
  installed=true;
  return true;
}

if(!install())global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='academic')install()});
global.AcademicCalendarParity={install,open:openOverlay,close:closeOverlay,current,uploadImage,CACHE_NAME,get active(){return calendarPageActive}};
})(window);
