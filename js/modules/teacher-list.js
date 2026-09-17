/* Koruk Asistan — Öğrenci Listesi / Ödev-Not rota yükleyicisi.
 * Öğrenci Listesi bağımsız StudentListPage yüzeyinde çalışır.
 */
(function(global){
'use strict';
const CORE='js/modules/teacher-list-core.js';
const STUDENT_PAGE='js/modules/student-list-page.js';
const LIVE_ENHANCER='js/modules/student-list-live-enhancer.js';
let corePromise=null,pagePromise=null,enhancerPromise=null;
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
  if(pagePromise)return pagePromise;
  if(!global.AppLoader?.loadScript)return Promise.reject(new Error('Uygulama yükleyicisi hazır değil.'));
  pagePromise=global.AppLoader.loadScript(STUDENT_PAGE).then(()=>{
    if(!global.StudentListPage)throw new Error('Öğrenci Listesi sayfası yüklenemedi.');
    return global.StudentListPage;
  }).catch(e=>{pagePromise=null;throw e});
  return pagePromise;
}
async function loadEnhancer(){
  if(global.StudentListLiveEnhancer)return global.StudentListLiveEnhancer;
  if(enhancerPromise)return enhancerPromise;
  if(!global.AppLoader?.loadScript)return null;
  enhancerPromise=global.AppLoader.loadScript(LIVE_ENHANCER).then(()=>global.StudentListLiveEnhancer||null).catch(e=>{enhancerPromise=null;console.warn('[StudentListLiveEnhancer]',e);return null});
  return enhancerPromise;
}
function claimStudentListSurface(){
  const root=document.getElementById('v2ModuleRoot');if(!root)return;
  root.innerHTML='<section class="ka-page ka-stack" data-student-list-route-loading><div class="ka-card"><div class="ka-card__body"><strong>Öğrenci Listesi Oluşturucu açılıyor…</strong><div class="ka-muted">Yerel sınıf ve öğrenci verileri hazırlanıyor.</div></div></div></section>';
}
global.TeacherListCoreLoader=loadCore;
const listProxy={
  __teacherListProxy:true,
  async open(){
    claimStudentListSurface();
    const page=await loadStudentPage();
    const result=await page.open();
    const enhancer=await loadEnhancer();
    enhancer?.install?.();
    return result;
  },
  close(){
    global.StudentListLiveEnhancer?.uninstall?.();
    return global.StudentListPage?.close?.()!==false;
  },
  async render(){const page=await loadStudentPage();const result=await page.render?.();global.StudentListLiveEnhancer?.refresh?.();return result;},
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
})(window);
