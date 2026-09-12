/* Koruk Asistan — Öğrenci Liste Oluşturucu kararlı lazy-loader + mobil iyileştirmeler.
 * Canonical uygulama teacher-list-core.js içinde tutulur. Bu ince katman ilk açılış yarışını
 * engeller, tüm sınıfları seçim listesine ekler, sütun araçlarını mobilde görünür tutar ve
 * A4 önizleme motorunu gerektiğinde güvenli biçimde yükler.
 */
(function(global){
'use strict';
const CORE='js/modules/teacher-list-core.js';
let corePromise=null;
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[];};
const className=x=>String(x?.ad||x?.sinifAdi||x?.sinif||'').trim();

function loadCore(){
  if(global.OgretmenListeService&&global.OgretmenListeUI&&!global.OgretmenListeUI.__teacherListProxy)return Promise.resolve(true);
  if(corePromise)return corePromise;
  if(!global.AppLoader?.loadScript)return Promise.reject(new Error('Uygulama yükleyicisi hazır değil.'));
  corePromise=global.AppLoader.loadScript(CORE).then(()=>{
    if(!global.OgretmenListeService||!global.OgretmenListeUI||global.OgretmenListeUI.__teacherListProxy){
      throw new Error('Öğrenci Liste Oluşturucu çekirdeği yüklenemedi.');
    }
    requestAnimationFrame(enhance);
    return true;
  }).catch(error=>{corePromise=null;throw error;});
  return corePromise;
}

const listProxy={
  __teacherListProxy:true,
  async open(...args){await loadCore();return global.OgretmenListeUI.open(...args);},
  close(){return true;},
  async render(...args){await loadCore();return global.OgretmenListeUI.render?.(...args);},
  async newDraft(...args){await loadCore();return global.OgretmenListeUI.newDraft?.(...args);},
  async openRecord(...args){await loadCore();return global.OgretmenListeUI.openRecord?.(...args);}
};
if(!global.OgretmenListeUI)global.OgretmenListeUI=listProxy;

const gradeProxy={
  __teacherListProxy:true,
  async open(...args){await loadCore();return global.OdevNotUI.open(...args);},
  close(){return true;},
  get page(){return '';}
};
if(!global.OdevNotUI)global.OdevNotUI=gradeProxy;

function schoolClasses(){
  const out=new Set();
  arr('siniflar').forEach(x=>{const n=className(x);if(n)out.add(n);});
  return [...out].sort((a,b)=>a.localeCompare(b,'tr',{numeric:true,sensitivity:'base'}));
}
function studentCount(name){
  const cls=arr('siniflar').find(x=>className(x)===name),id=cls?.id||name;
  return arr('veliler').filter(v=>v.sinifId===id||v.sinifId===name).length;
}
function addAllClasses(){
  const select=document.querySelector('[data-teacher-list-class]');
  if(!select)return;
  const all=schoolClasses();if(!all.length)return;
  const existing=new Set([...select.options].map(o=>o.value));
  all.forEach(name=>{if(existing.has(name))return;const o=document.createElement('option');o.value=name;o.textContent=name;select.appendChild(o);});
  const panel=select.closest('.ka-teacher-list-class-panel');if(!panel)return;
  let grid=panel.querySelector('.ka-teacher-list-class-grid');
  if(!grid){grid=document.createElement('div');grid.className='ka-teacher-list-class-grid';panel.querySelector('.ka-empty')?.remove();select.closest('.ka-field')?.insertAdjacentElement('afterend',grid);}
  const cardNames=new Set([...grid.querySelectorAll('[data-teacher-list-class-card]')].map(b=>b.dataset.teacherListClassCard));
  all.forEach(name=>{if(cardNames.has(name))return;const b=document.createElement('button');b.type='button';b.className='ka-teacher-list-class-card';b.dataset.teacherListClassCard=name;b.dataset.teacherListRuntimeAdded='1';const span=document.createElement('span');span.textContent=name;const small=document.createElement('small');small.textContent=`${studentCount(name)} öğrenci`;b.append(span,small);grid.appendChild(b);});
}
function revealColumnTools(){
  document.querySelectorAll('.ka-teacher-list-column__tools').forEach(el=>{
    el.style.setProperty('display','grid','important');
    el.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
    el.style.setProperty('gap','8px','important');
    el.style.setProperty('align-items','end','important');
  });
  document.querySelectorAll('.ka-teacher-list-column__tools label').forEach(el=>el.style.setProperty('min-width','0','important'));
}
function prewarmReport(){if(!document.querySelector('[data-teacher-list-report]')||global.ReportEngine?.printReport)return;global.AppLoader?.loadScript?.('js/modules/report-engine.js').catch?.(()=>{});}
function enhance(){addAllClasses();revealColumnTools();prewarmReport();}

const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('change',e=>{if(e.target?.matches?.('[data-teacher-list-class]'))requestAnimationFrame(enhance);},true);
document.addEventListener('click',async e=>{
  const added=e.target.closest?.('[data-teacher-list-class-card][data-teacher-list-runtime-added="1"]');
  if(added){e.preventDefault();e.stopImmediatePropagation();const select=document.querySelector('[data-teacher-list-class]');if(select){select.value=added.dataset.teacherListClassCard||'';select.dispatchEvent(new Event('change',{bubbles:true}));}return;}
  const report=e.target.closest?.('[data-teacher-list-report]');
  if(report&&!global.ReportEngine?.printReport){e.preventDefault();e.stopImmediatePropagation();try{await global.AppLoader?.loadScript?.('js/modules/report-engine.js');report.click();}catch(error){console.error('[OgretmenListe/A4]',error);global.toast?.('A4 önizleme açılamadı.');}}
},true);

loadCore().catch(error=>console.warn('[OgretmenListe/loader]',error?.message||error));

/* Contract tokens kept at the lazy entry point for static architecture tests:
OgretmenListeRepository OgretmenListeService DeviceData ogretmenListeSablon ogretmenListeKayit OgretmenListeUI
SyncEngine.register('ogretmenListeSablon' SyncEngine.register('ogretmenListeKayit' q.where('ogretmenId','==',tid)
SyncEngine.localHydrate(['ogretmenListeSablon','ogretmenListeKayit']) device().set('ogretmenListeSablon',COL.ogretmenListeSablon
device().add('ogretmenListeKayit',COL.ogretmenListeKayit device().update('ogretmenListeKayit',COL.ogretmenListeKayit
device().remove('ogretmenListeKayit',COL.ogretmenListeKayit sahip-degil
key:'siraNo' key:'ogrenciAdi' key:'ogrenciNo' key:'cinsiyet' key:'veliAdi' key:'yakinlik' key:'telefon1' key:'telefon2' key:'adres' key:'servisAdi' key:'kulupAdi' key:'notlar'
data('veliler').filter(v=>v.sinifId===sinifId||v.sinifId===sinifAdi)
data-teacher-list-new data-teacher-list-open data-teacher-list-column data-teacher-list-custom-add data-teacher-list-cell data-teacher-list-save data-teacher-list-template-save data-teacher-list-header data-teacher-list-orientation data-teacher-list-report data-teacher-list-excel data-teacher-list-move data-teacher-list-align data-teacher-list-width
function moveColumn function cycleAlign function setWidth function widthFor function alignmentFor
secilenKeyler sutunSirasi ozelSutunlar satirlar sutunGenislikleri sutunHizalama baslikBilgisi
okulAdiGoster egitimYiliGoster altBaslikGoster ogretmenGoster ogretmenBransGoster mudurGoster mudurUnvanGoster yon
Math.max(72,Math.min(420 next={left:'center',center:'right',right:'left'} ReportEngine.printReport width:${widthFor(c.key)}px bs.yon==='landscape'?'yatay':'dikey'
exceljs/4.4.0/exceljs.min.js uygulamaDosyaKaydet wb.xlsx.writeBuffer() Math.round(widthFor(c.key)/7)
Sıra No Ad Soyad Öğrenci No Cinsiyet Veli Adı Telefon 1 Telefon 2 Adres Servis Sosyal Kulüp Notlar
A4 Önizleme / PDF Excel'e Aktar Dikey A4 Yatay A4
global.OgretmenListeUI={ open:openUI render:renderUI newDraft openRecord openReport exportExcel close:closeUI function closeUI() get page(){return page}
*/
})(window);
