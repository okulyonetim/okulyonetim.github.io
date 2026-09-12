/* Okul Yönetim — Taşıma raporunda Tatil Modu için doğrudan rapor-sonrası-hydrate köprüsü.
 * TransportReports.takip kendi prepare() aşamasında resmiTatiller verisini yeniden hydrate ettiği için,
 * Tatil Modu sentetik satırlarının silinmesini engeller. Rapor çağrısı süresince resmiTatiller hydrate
 * tamamlandığında ortak tatil görünümü yeniden uygulanır.
 */
(function(global){
'use strict';
if(global.TransportHolidayModeDirectFix)return;

const SYNTHETIC_FLAG='__dutyHolidayModeSource';
let installed=false;

const arr=type=>{const value=global.AppStore?.data?.(type);return Array.isArray(value)?value:[]};

async function runWithDirectHolidaySource(task){
  const source=global.DutyHolidayModeSource;
  if(!source)return task();
  await source.ensureSettingsLoaded?.();

  const sync=global.SyncEngine;
  const originalHydrate=typeof sync?.localHydrate==='function'?sync.localHydrate.bind(sync):null;
  const originalOfficial=arr('resmiTatiller').filter(row=>!row?.[SYNTHETIC_FLAG]);
  const apply=()=>global.AppStore?.setData?.('resmiTatiller',source.combinedHolidayRows?.()||originalOfficial);

  apply();
  if(originalHydrate){
    sync.localHydrate=async function(types,...rest){
      const result=await originalHydrate(types,...rest);
      const list=Array.isArray(types)?types:[types];
      if(list.includes('resmiTatiller'))apply();
      return result;
    };
  }

  try{return await task();}
  finally{
    if(originalHydrate)sync.localHydrate=originalHydrate;
    const current=arr('resmiTatiller').filter(row=>!row?.[SYNTHETIC_FLAG]);
    global.AppStore?.setData?.('resmiTatiller',current.length||!originalOfficial.length?current:originalOfficial);
  }
}

function patch(){
  const reports=global.TransportReports;
  if(!reports||typeof reports.takip!=='function')return false;
  if(reports.__holidayModeDirectFixPatched){installed=true;return true;}
  const original=reports.takip.bind(reports);
  reports.takip=(...args)=>runWithDirectHolidaySource(()=>original(...args));
  reports.__holidayModeDirectFixPatched=true;
  installed=true;
  return true;
}

function install(){
  patch();
  global.addEventListener?.('koruk:module-ready',event=>{
    if(event.detail?.name==='transport')setTimeout(patch,0);
  });
}

install();
global.TransportHolidayModeDirectFix={patch,runWithDirectHolidaySource,get installed(){return installed}};
})(window);
