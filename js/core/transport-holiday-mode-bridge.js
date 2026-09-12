/* Okul Yönetim — Taşıma aylık takip çizelgesi / Tatil Modu köprüsü.
 * Aylık servis takip çizelgesini Nöbet Programı ile aynı birleşik tatil kaynağına bağlar.
 * Transport modülünün kendi rapor düzenine dokunmaz; yalnız rapor üretilirken tatil görünümünü
 * resmiTatiller + Ayarlar > Tatil Modu birleşimiyle çalıştırır.
 */
(function(global){
'use strict';
if(global.TransportHolidayModeBridge)return;

const SYNTHETIC_FLAG='__dutyHolidayModeSource';
let patched=false;

const arr=type=>{const value=global.AppStore?.data?.(type);return Array.isArray(value)?value:[]};

async function ensureHolidaySource(){
  const source=global.DutyHolidayModeSource;
  if(!source)return false;
  await source.ensureSettingsLoaded?.();
  return true;
}

async function withTransportHolidays(task){
  const ready=await ensureHolidaySource();
  const source=global.DutyHolidayModeSource;
  if(!ready||!source?.combinedHolidayRows||!global.AppStore?.setData)return task();

  const original=arr('resmiTatiller').filter(row=>!row?.[SYNTHETIC_FLAG]);
  global.AppStore.setData('resmiTatiller',source.combinedHolidayRows());
  try{
    return await task();
  }finally{
    const current=arr('resmiTatiller');
    const clean=current.filter(row=>!row?.[SYNTHETIC_FLAG]);
    global.AppStore.setData('resmiTatiller',clean.length||!original.length?clean:original);
  }
}

function reportPickerValues(modal){
  const year=modal?.querySelector?.('[data-year],#trYear');
  const month=modal?.querySelector?.('[data-month],#trMonth');
  return{year:Number(year?.value),month:Number(month?.value)};
}

function enhancePicker(servisId,modal){
  if(!modal||modal.dataset.transportHolidayModeBridge==='1')return modal;
  modal.dataset.transportHolidayModeBridge='1';
  const old=modal.querySelector?.('[data-print]');
  if(!old)return modal;
  const button=old.cloneNode(true);
  old.replaceWith(button);
  button.addEventListener('click',async()=>{
    const {year,month}=reportPickerValues(modal);
    button.disabled=true;
    const previous=button.textContent;
    button.textContent='Hazırlanıyor…';
    try{
      await global.TransportReports.takip(servisId,year,month);
      modal.remove();
    }catch(error){
      console.error('[Taşıma/Tatil Modu] Aylık takip:',error);
      global.toast?.('Takip çizelgesi hazırlanamadı: '+(error?.message||error));
      button.disabled=false;
      button.textContent=previous;
    }
  });
  return modal;
}

function patch(){
  const reports=global.TransportReports;
  if(!reports)return false;
  if(reports.__holidayModeBridgePatched){patched=true;return true;}
  if(typeof reports.takip!=='function'||typeof reports.takipSec!=='function')return false;

  const originalTakip=reports.takip.bind(reports);
  const originalTakipSec=reports.takipSec.bind(reports);

  reports.takip=function(...args){
    return withTransportHolidays(()=>originalTakip(...args));
  };

  reports.takipSec=function(servisId,...args){
    const result=originalTakipSec(servisId,...args);
    const modal=document.getElementById?.('transportReportPicker');
    enhancePicker(servisId,modal);
    return modal||result;
  };

  reports.__holidayModeBridgePatched=true;
  patched=true;
  return true;
}

function install(){
  patch();
  global.addEventListener?.('koruk:module-ready',event=>{
    if(event.detail?.name==='transport'){
      ensureHolidaySource().finally(()=>patch());
    }
  });
}

install();
global.TransportHolidayModeBridge={patch,withTransportHolidays,ensureHolidaySource,get patched(){return patched}};
})(window);
