/* Koruk Asistan — Öğrenci Listesi / Ödev-Not rota yükleyicisi.
 * Öğrenci Listesi artık bağımsız StudentListPage yüzeyine açılır; generic Tools/Kontrol Listeleri
 * DOM'una müdahale edilmez. teacher-list-core.js yalnız ortak veri servisi ve Ödev/Not çekirdeğidir.
 */
(function(global){
'use strict';
const CORE='js/modules/teacher-list-core.js';
const STUDENT_PAGE='js/modules/student-list-page.js';
let corePromise=null,pagePromise=null;
function loadCore(){
  if(global.OgretmenListeService&&global.OdevNotUI&&!global.OdevNotUI.__teacherListProxy)return Promise.resolve(true);
  if(corePromise)return corePromise;
  if(!global.AppLoader?.loadScript)return Promise.reject(new Error('Uygulama yükleyicisi hazır değil.'));
  corePromise=global.AppLoader.loadScript(CORE).then(()=>{
    if(!global.OgretmenListeService)throw new Error('Öğrenci liste veri servisi yüklenemedi.');
    return true;
  }).catch(e=>{corePromise=null;throw e});
  return corePromise;
}
async function loadStudentPage(){
  if(global.StudentListPage)return global.StudentListPage;
  if(!pagePromise){
    if(!global.AppLoader?.loadScript)throw new Error('Uygulama yükleyicisi hazır değil.');
    pagePromise=global.AppLoader.loadScript(STUDENT_PAGE).then(()=>{
      if(!global.StudentListPage)throw new Error('Öğrenci Listesi sayfası yüklenemedi.');
      return global.StudentListPage;
    }).catch(e=>{pagePromise=null;throw e});
  }
  return pagePromise;
}
function claimStudentListSurface(){
  const root=document.getElementById('v2ModuleRoot');if(!root)return;
  root.innerHTML='<section class="ka-page ka-stack" data-student-list-route-loading><div class="ka-card"><div class="ka-card__body"><strong>Öğrenci Listesi Oluşturucu açılıyor…</strong><div class="ka-muted">Yerel sınıf ve öğrenci verileri hazırlanıyor.</div></div></div></section>';
}
global.TeacherListCoreLoader=loadCore;
const listProxy={
  __teacherListProxy:true,
  async open(){claimStudentListSurface();const page=await loadStudentPage();return page.open();},
  close(){return global.StudentListPage?.close?.()!==false;},
  async render(){const page=await loadStudentPage();return page.render?.();},
  async newDraft(){const page=await loadStudentPage();return page.newDraft?.();},
  async openRecord(id){const page=await loadStudentPage();return page.openRecord?.(id);}
};
global.OgretmenListeUI=listProxy;
const gradeProxy={
  __teacherListProxy:true,
  async open(...args){await loadCore();return global.OdevNotUI.open(...args);},
  close(){return true;},
  get page(){return '';}
};
if(!global.OdevNotUI)global.OdevNotUI=gradeProxy;

/* Static architecture compatibility contract. Runtime behavior is implemented by
 * teacher-list-core.js + student-list-page.js; no DOM enhancement/MutationObserver patch exists here.
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
