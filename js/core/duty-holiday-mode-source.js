/* Okul Yönetim — Nöbet Programı Tatil Modu kaynağı.
 * Ayarlar > Tatil Modu içinde tutulan planlı tatilleri Nöbet Programı ve
 * okulun nöbet olmayan günlerde çalışmaması gereken bağlı süreçleriyle paylaşır.
 * dersProgrami verisine/davranışına dokunmaz.
 */
(function(global){
'use strict';
if(global.DutyHolidayModeSource)return;

const SYNTHETIC_FLAG='__dutyHolidayModeSource';
let managementPatched=false,servicePatched=false,settingsLoadPromise=null,observer=null,observerRoot=null,decorateQueued=false,serviceModalObserver=null;

const arr=type=>{const value=global.AppStore?.data?.(type);return Array.isArray(value)?value:[]};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const validIso=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
const localIso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const localDate=iso=>{const d=new Date(`${iso}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
const dateLabel=iso=>{const d=localDate(iso);return d?d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}):String(iso||'')};

function settingsRow(){
  const rows=arr('dersSaatleri');
  return rows.find(row=>row?.id==='ayarlar')||rows[0]||{};
}

function holidayModeRanges(){
  const cfg=settingsRow();
  const planned=Array.isArray(cfg.tatilAraliklari)?cfg.tatilAraliklari:[];
  const normalized=planned.map((row,index)=>({
    id:String(row?.id||`tatil-${index}`),
    ad:String(row?.ad||'Tatil').trim()||'Tatil',
    baslangicTarihi:String(row?.baslangicTarihi||'').slice(0,10),
    bitisTarihi:String(row?.bitisTarihi||'').slice(0,10),
    not:String(row?.not||'').trim()
  })).filter(row=>validIso(row.baslangicTarihi)&&validIso(row.bitisTarihi)&&row.bitisTarihi>=row.baslangicTarihi);
  if(normalized.length)return normalized;

  const start=String(cfg.tatilBaslangicTarihi||'').slice(0,10);
  const opening=String(cfg.okulAcilisTarihi||'').slice(0,10);
  if(!cfg.tatilModu||!validIso(start)||!validIso(opening))return[];
  const endDate=localDate(opening);
  if(!endDate)return[];
  endDate.setDate(endDate.getDate()-1);
  const end=localIso(endDate);
  if(end<start)return[];
  return[{id:'legacy-holiday',ad:'Tatil Modu',baslangicTarihi:start,bitisTarihi:end,not:String(cfg.tatilModuNotu||'').trim()}];
}

function modeHolidayForDate(iso){
  if(!validIso(iso))return null;
  return holidayModeRanges().find(row=>row.baslangicTarihi<=iso&&iso<=row.bitisTarihi)||null;
}

function officialHolidayForDate(iso){
  return arr('resmiTatiller').find(row=>!row?.[SYNTHETIC_FLAG]&&String(row?.tarih||'').slice(0,10)===iso)||null;
}

function holidayForDate(iso){
  const official=officialHolidayForDate(iso);
  if(official)return{...official,_dutySource:'resmi'};
  const range=modeHolidayForDate(iso);
  if(!range)return null;
  return{
    id:`tatil-modu:${range.id}:${iso}`,
    tarih:iso,
    ad:range.ad||'Tatil Modu',
    aciklama:range.ad||range.not||'Tatil Modu',
    not:range.not||'',
    _dutySource:'tatilModu',
    [SYNTHETIC_FLAG]:true
  };
}

function expandedModeRows(){
  const out=[];
  for(const range of holidayModeRanges()){
    const start=localDate(range.baslangicTarihi),end=localDate(range.bitisTarihi);
    if(!start||!end)continue;
    let guard=0;
    for(const d=new Date(start);d<=end&&guard<740;d.setDate(d.getDate()+1),guard++){
      const iso=localIso(d);
      out.push({
        id:`tatil-modu:${range.id}:${iso}`,
        tarih:iso,
        ad:range.ad||'Tatil Modu',
        aciklama:range.ad||range.not||'Tatil Modu',
        not:range.not||'',
        _dutySource:'tatilModu',
        [SYNTHETIC_FLAG]:true
      });
    }
  }
  return out;
}

function combinedHolidayRows(){
  const official=arr('resmiTatiller').filter(row=>!row?.[SYNTHETIC_FLAG]);
  const dates=new Set(official.map(row=>String(row?.tarih||'').slice(0,10)).filter(validIso));
  const mode=expandedModeRows().filter(row=>!dates.has(row.tarih));
  return[...official,...mode];
}

function firstDutyWorkday(monthValue){
  const match=/^(\d{4})-(\d{2})$/.exec(String(monthValue||''));
  if(!match)return'';
  const year=Number(match[1]),month=Number(match[2])-1,total=new Date(year,month+1,0).getDate();
  for(let day=1;day<=total;day++){
    const d=new Date(year,month,day),iso=localIso(d);
    if(d.getDay()===0||d.getDay()===6||holidayForDate(iso))continue;
    return iso;
  }
  return`${match[1]}-${match[2]}-01`;
}

async function ensureSettingsLoaded(){
  if(settingsLoadPromise)return settingsLoadPromise;
  settingsLoadPromise=(async()=>{
    if(!global.SyncEngine||!global.COL?.dersSaatleri)return false;
    global.SyncEngine.register?.('dersSaatleri',global.COL.dersSaatleri);
    await global.SyncEngine.localHydrate?.(['dersSaatleri']);
    global.SyncEngine.schedule?.(100);
    return true;
  })().catch(error=>{console.warn('[Nöbet/Tatil Modu] Tatil ayarları yüklenemedi:',error);return false});
  return settingsLoadPromise;
}

function modeLabel(range){return String(range?.ad||range?.not||'Tatil Modu').trim()||'Tatil Modu'}

function decorateGrid(root){
  root.querySelectorAll?.('.ka-duty-grid tbody tr').forEach(row=>{
    if(row.classList.contains('ka-duty-grid__holiday'))return;
    const marker=row.querySelector('[data-duty-chief],[data-duty-cell]');
    const iso=marker?.dataset?.dutyChief||marker?.dataset?.dutyCell||'';
    const range=modeHolidayForDate(iso);
    if(!range)return;
    const first=row.children?.[0]?.innerHTML||'',day=String(row.children?.[1]?.textContent||'').trim();
    const placeCount=Math.max(1,arr('nobetYerleri').length);
    row.className='ka-duty-grid__holiday ka-duty-grid__holiday-mode';
    row.dataset.dutyHolidayMode=iso;
    row.innerHTML=`<th scope="row">${first}</th><td class="ka-duty-grid__day">${esc(day)}</td><td class="ka-duty-grid__state" colspan="${placeCount}">🏖️ ${esc(modeLabel(range))} · Tatil Modu</td><td class="ka-duty-grid__empty">—</td>`;
  });
}

function holidayListSignature(ranges){
  return (ranges||[]).map(range=>[range.id,range.ad,range.baslangicTarihi,range.bitisTarihi,range.not].join('¦')).join('§');
}

function decorateHolidayList(root){
  const box=root.querySelector?.('.ka-duty-holidays');
  if(!box)return;
  const ranges=holidayModeRanges(),signature=holidayListSignature(ranges);
  if(box.dataset.dutyHolidayModeSignature!==signature){
    box.querySelectorAll('[data-duty-mode-holiday-range]').forEach(node=>node.remove());
    if(ranges.length&&box.querySelector('.ka-empty'))box.querySelector('.ka-empty')?.remove();
    ranges.forEach(range=>{
      const row=document.createElement('div');
      row.className='ka-duty-holiday';
      row.dataset.dutyModeHolidayRange=range.id;
      const span=range.baslangicTarihi===range.bitisTarihi?dateLabel(range.baslangicTarihi):`${dateLabel(range.baslangicTarihi)} – ${dateLabel(range.bitisTarihi)}`;
      row.innerHTML=`<span class="ka-badge">${esc(span)}</span><span class="ka-grow"><strong>🏖️ ${esc(modeLabel(range))}</strong><small class="ka-muted">Tatil Modu${range.not?` · ${esc(range.not)}`:''}</small></span>`;
      box.appendChild(row);
    });
    box.dataset.dutyHolidayModeSignature=signature;
  }
  const title=[...root.querySelectorAll('.ka-duty-summary-card h3')].find(node=>String(node.textContent||'').trim()==='Resmi Tatiller');
  if(title)title.textContent='Tatiller';
}

function decorateToday(root){
  const today=localIso(new Date()),holiday=holidayForDate(today);
  if(!holiday||holiday._dutySource!=='tatilModu')return;
  const card=[...root.querySelectorAll?.('.ka-duty-summary-card')||[]].find(node=>String(node.querySelector('h3')?.textContent||'').includes('Bugünün Nöbetçileri'));
  const body=card?.querySelector('.ka-card__body');
  if(!body)return;
  const html=`<div class="ka-empty">🏖️ Bugün tatil — ${esc(holiday.aciklama||holiday.ad||'Tatil Modu')}<div class="ka-muted">Tatil Modu kaynağından</div></div>`;
  if(body.innerHTML!==html)body.innerHTML=html;
}

function observeManagementRoot(){
  if(observer&&observerRoot?.isConnected)observer.observe(observerRoot,{childList:true,subtree:true});
}

function decorateDutyPage(){
  decorateQueued=false;
  const root=document.querySelector?.('.ka-duty-page');
  if(!root)return false;
  observer?.disconnect?.();
  try{
    decorateGrid(root);
    decorateHolidayList(root);
    decorateToday(root);
  }finally{
    observeManagementRoot();
  }
  return true;
}

function queueDecorate(){
  if(decorateQueued)return;
  decorateQueued=true;
  const run=()=>decorateDutyPage();
  if(typeof global.requestAnimationFrame==='function')global.requestAnimationFrame(run);
  else setTimeout(run,0);
}

function installObserver(){
  const root=document.getElementById?.('managementContent');
  if(!root||typeof MutationObserver==='undefined')return false;
  if(observer&&observerRoot===root){queueDecorate();return true;}
  observer?.disconnect?.();
  observerRoot=root;
  observer=new MutationObserver(()=>queueDecorate());
  observeManagementRoot();
  queueDecorate();
  return true;
}

function patchHolidayLookup(){
  const service=global.NobetService;
  if(!service||service.__holidayModeLookupPatched)return false;
  const original=typeof service.tatilMi==='function'?service.tatilMi.bind(service):null;
  service.tatilMi=function(list,iso){
    const official=original?.(list,iso)||(list||[]).find?.(row=>String(row?.tarih||'').slice(0,10)===iso);
    return official||modeHolidayForDate(iso)||null;
  };
  service.__holidayModeLookupPatched=true;
  return true;
}

function patchAutoDistribution(){
  const service=global.NobetService;
  if(!service||typeof service.otomatikDagitimUygula!=='function'||service.__holidayModePatched)return false;
  const original=service.otomatikDagitimUygula;
  service.otomatikDagitimUygula=function(args={}){
    const supplied=args.nobetTatilMiFn;
    return original.call(this,{...args,nobetTatilMiFn:iso=>Boolean(supplied?.(iso)||modeHolidayForDate(iso))});
  };
  service.__holidayModePatched=true;
  service.tatilModuTatiliMi=iso=>!!modeHolidayForDate(iso);
  patchHolidayLookup();
  return true;
}

async function withCombinedHolidayRows(task){
  const original=arr('resmiTatiller').filter(row=>!row?.[SYNTHETIC_FLAG]);
  global.AppStore?.setData?.('resmiTatiller',combinedHolidayRows());
  try{return await task();}
  finally{
    const current=arr('resmiTatiller'),clean=current.filter(row=>!row?.[SYNTHETIC_FLAG]);
    global.AppStore?.setData?.('resmiTatiller',clean.length||!original.length?clean:original);
  }
}

function ensureServiceModalScrollStyle(){
  if(document.getElementById?.('kaTransportModalScrollLockStyle'))return;
  const style=document.createElement?.('style');
  if(!style)return;
  style.id='kaTransportModalScrollLockStyle';
  style.textContent='html.ka-transport-modal-lock,html.ka-transport-modal-lock body{overflow:hidden!important;overscroll-behavior:none!important;}';
  document.head?.appendChild?.(style);
}

function syncServiceModalScrollLock(){
  const open=!!document.querySelector?.('[data-service-modal]');
  document.documentElement?.classList?.toggle?.('ka-transport-modal-lock',open);
  return open;
}

function installServiceModalScrollGuard(){
  ensureServiceModalScrollStyle();
  syncServiceModalScrollLock();
  if(serviceModalObserver||typeof MutationObserver==='undefined'||!document.body)return;
  serviceModalObserver=new MutationObserver(()=>syncServiceModalScrollLock());
  serviceModalObserver.observe(document.body,{childList:true,subtree:true});
}

function reportModal(){
  const modal=document.getElementById?.('kaManagementModal');
  if(!modal)return null;
  const title=String(modal.querySelector('.ka-modal__header strong')?.textContent||'').trim();
  return title==='Nöbet Raporu'?modal:null;
}

function refreshReportValidity(modal){
  const month=modal?.querySelector('[data-month]'),validity=modal?.querySelector('[data-validity]');
  if(!month||!validity)return;
  const next=firstDutyWorkday(month.value);
  if(next)validity.value=next;
}

function enhanceReportModal(){
  const modal=reportModal();
  if(!modal||modal.dataset.dutyHolidayModeEnhanced)return;
  modal.dataset.dutyHolidayModeEnhanced='1';
  refreshReportValidity(modal);
  modal.querySelector('[data-month]')?.addEventListener('change',()=>setTimeout(()=>refreshReportValidity(modal),0));
}

async function handleReportSave(event){
  const save=event.target?.closest?.('#kaManagementModal [data-save]');
  if(!save)return;
  const modal=reportModal();
  if(!modal||!modal.contains(save))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const month=modal.querySelector('[data-month]')?.value||'',orientation=modal.querySelector('[data-orientation]')?.value||'dikey';
  const validityInput=modal.querySelector('[data-validity]');
  const validity=validityInput?.value||firstDutyWorkday(month);
  save.disabled=true;
  const old=save.textContent;
  save.textContent='Hazırlanıyor…';
  try{
    await ensureSettingsLoaded();
    if(!global.ReportEngine&&global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/report-engine.js');
    global.DutyReportLivePlacesFix?.patch?.();
    if(typeof global.ManagementModule?.createDutyReport!=='function')throw new Error('Nöbet raporu hazır değil.');
    await withCombinedHolidayRows(()=>global.ManagementModule.createDutyReport(month,orientation,validity));
    modal.remove();
  }catch(error){
    console.error('[Nöbet/Tatil Modu] Rapor:',error);
    global.toast?.('Nöbet raporu açılamadı: '+(error?.message||error));
    save.disabled=false;
    save.textContent=old;
  }
}

function patchManagement(){
  const module=global.ManagementModule;
  if(!module||managementPatched)return false;
  managementPatched=true;
  if(typeof module.openPage==='function'){
    const originalOpen=module.openPage.bind(module);
    module.openPage=function(page,...rest){
      const result=originalOpen(page,...rest);
      if(page==='duty')ensureSettingsLoaded().finally(()=>{installObserver();queueDecorate();patchAutoDistribution();patchHolidayLookup()});
      return result;
    };
  }
  patchAutoDistribution();
  patchHolidayLookup();
  installObserver();
  if(document.querySelector?.('.ka-duty-page'))ensureSettingsLoaded().finally(queueDecorate);
  return true;
}

function install(){
  patchManagement();
  patchAutoDistribution();
  patchHolidayLookup();
  installServiceModalScrollGuard();
  global.AppStore?.subscribe?.('data.dersSaatleri',()=>{
    if(!document.querySelector?.('.ka-duty-page'))return;
    global.ManagementModule?.render?.();
    queueDecorate();
  });
  document.addEventListener?.('click',event=>{
    if(event.target?.closest?.('[data-duty-report]'))setTimeout(enhanceReportModal,0);
  });
  document.addEventListener?.('click',handleReportSave,true);
  global.addEventListener?.('koruk:module-ready',event=>{
    if(event.detail?.name==='management'){
      patchManagement();
      patchAutoDistribution();
      patchHolidayLookup();
      setTimeout(()=>{installObserver();queueDecorate()},0);
    }
    if(event.detail?.name==='transport'){
      patchHolidayLookup();
      ensureSettingsLoaded().finally(syncServiceModalScrollLock);
    }
  });
}

install();
global.DutyHolidayModeSource={
  ranges:holidayModeRanges,
  modeHolidayForDate,
  holidayForDate,
  combinedHolidayRows,
  firstDutyWorkday,
  ensureSettingsLoaded,
  decorate:decorateDutyPage,
  patchManagement,
  patchAutoDistribution,
  patchHolidayLookup,
  syncServiceModalScrollLock
};
})(window);
