/* Koruk Asistan — Öğrenci Listesi / Ödev-Not rota yükleyicisi.
 * Öğrenci Listesi bağımsız StudentListPage yüzeyine açılır.
 * Şablonlar öğretmen bazında ortak kullanılır; sınıf yalnızca öğrenci verisini belirler.
 */
(function(global){
'use strict';
const CORE='js/modules/teacher-list-core.js?v=1067';
const STUDENT_PAGE='js/modules/student-list-page.js?v=1066';
let corePromise=null,pagePromise=null;
const GLOBAL='__GENEL__';
function teacherId(){return global.AKTIF_KULLANICI?.bagliOgretmenId||global.AKTIF_KULLANICI?.ogretmenId||global.OgretmenListeService?.ogretmenId?.()||'';}
function installGlobalTemplateMode(){
  const svc=global.OgretmenListeService;
  if(!svc||svc.__globalTemplateMode)return !!svc;
  const originalGet=svc.sablonGetir.bind(svc);
  const originalSave=svc.sablonKaydet.bind(svc);
  svc.__globalTemplateMode=true;
  svc.sablonGetir=async function(sinif){
    const tid=teacherId();
    if(!tid||!global.DeviceData)return originalGet(sinif);
    const rows=(global.DeviceData.list('ogretmenListeSablon')||[]).filter(x=>x.ogretmenId===tid);
    const globalTpl=rows.find(x=>String(x.sinif||'')===GLOBAL);
    if(globalTpl)return globalTpl;
    const current=rows.find(x=>String(x.sinif||'')===String(sinif||'').trim());
    const fallback=current||rows.slice().sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')))[0]||null;
    if(fallback){
      try{await originalSave(GLOBAL,{...fallback,sinif:undefined,id:undefined});}catch(_){/* okuma yine de devam eder */}
      return fallback;
    }
    return originalGet(sinif);
  };
  svc.sablonKaydet=async function(_sinif,veri){
    const payload={...(veri||{})};
    delete payload.sinif;
    delete payload.id;
    return originalSave(GLOBAL,payload);
  };
  return true;
}
function loadCore(){
  if(global.OgretmenListeService){installGlobalTemplateMode();return Promise.resolve(true);}
  if(corePromise)return corePromise;
  if(!global.AppLoader?.loadScript)return Promise.reject(new Error('Uygulama yükleyicisi hazır değil.'));
  corePromise=global.AppLoader.loadScript(CORE).then(()=>{
    if(!global.OgretmenListeService)throw new Error('Öğrenci liste veri servisi yüklenemedi.');
    installGlobalTemplateMode();
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
      installGlobalTemplateMode();
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
  async open(){claimStudentListSurface();await loadCore();const page=await loadStudentPage();installGlobalTemplateMode();return page.open();},
  close(){return global.StudentListPage?.close?.()!==false;},
  async render(){await loadCore();const page=await loadStudentPage();installGlobalTemplateMode();return page.render?.();},
  async newDraft(){await loadCore();const page=await loadStudentPage();installGlobalTemplateMode();return page.newDraft?.();},
  async openRecord(id){await loadCore();const page=await loadStudentPage();installGlobalTemplateMode();return page.openRecord?.(id);}
};
global.OgretmenListeUI=listProxy;
const gradeProxy={
  __teacherListProxy:true,
  async open(...args){await loadCore();return global.OdevNotUI.open(...args);},
  close(){return true;},
  get page(){return '';}
};
if(!global.OdevNotUI)global.OdevNotUI=gradeProxy;
})(window);