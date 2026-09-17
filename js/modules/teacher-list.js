/* Koruk Asistan — Öğrenci Listesi / Ödev-Not rota yükleyicisi.
 * Öğrenci Listesi bağımsız StudentListPage yüzeyinde çalışır.
 */
(function(global){
'use strict';
const CORE='js/modules/teacher-list-core.js';
const STUDENT_PAGE='js/modules/student-list-page.js';
const LIVE_ENHANCER='js/modules/student-list-live-enhancer.js';
const A11Y_ENHANCER='js/modules/student-list-a11y.js';
const DOCX='js/modules/student-list-docx.js';
let corePromise=null,pagePromise=null,enhancerPromise=null,a11yPromise=null,docxPromise=null;
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
async function loadA11y(){
  if(global.StudentListA11y)return global.StudentListA11y;
  if(a11yPromise)return a11yPromise;
  if(!global.AppLoader?.loadScript)return null;
  a11yPromise=global.AppLoader.loadScript(A11Y_ENHANCER).then(()=>global.StudentListA11y||null).catch(e=>{a11yPromise=null;console.warn('[StudentListA11y]',e);return null});
  return a11yPromise;
}
async function loadDocx(){
  if(global.StudentListDocx)return global.StudentListDocx;
  if(docxPromise)return docxPromise;
  if(!global.AppLoader?.loadScript)return null;
  docxPromise=global.AppLoader.loadScript(DOCX).then(()=>global.StudentListDocx||null).catch(e=>{docxPromise=null;console.warn('[StudentListDocx]',e);return null});
  return docxPromise;
}
function claimStudentListSurface(){
  const root=document.getElementById('v2ModuleRoot');if(!root)return;
  root.innerHTML='<section class="ka-page ka-stack" data-student-list-route-loading><div class="ka-card"><div class="ka-card__body"><strong>Öğrenci Listesi Oluşturucu açılıyor…</strong><div class="ka-muted">Yerel sınıf ve öğrenci verileri hazırlanıyor.</div></div></div></section>';
}
function safeName(v){return(String(v||'Ogrenci_Listesi').replace(/[\\/:*?"<>|]/g,'_').trim()||'Ogrenci_Listesi')+'.docx')}
function exportDocxFromLivePreview(){
  const root=document.getElementById('v2ModuleRoot');if(!root)return false;
  const table=root.querySelector('.sl-live-preview-table');if(!table)return false;
  const columns=[...table.querySelectorAll('thead th[data-sl-preview-col]')].map(th=>{
    const key=th.dataset.slPreviewCol||'';
    const label=th.querySelector('.sl-preview-head-content span')?.textContent?.trim()||th.textContent.trim();
    const css=th.getBoundingClientRect().width||parseFloat(th.style.width)||126;
    const input=root.querySelector(`[data-sl-width="${CSS.escape(key)}"]`);
    const width=input?Number(input.value)||css:css;
    const align=getComputedStyle(th).textAlign||'left';
    return{key,label,width,align};
  });
  if(!columns.length)return false;
  const rows=[...table.querySelectorAll('tbody tr')].map(tr=>columns.map((c,i)=>{
    const td=tr.children[i];if(!td)return'';
    const input=td.querySelector('input');return input?input.value:td.textContent.trim();
  }));
  const val=k=>root.querySelector(`[data-sl-head="${CSS.escape(k)}"]`)?.value||'';
  const title=root.querySelector('[data-sl-name]')?.value?.trim()||root.querySelector('.ka-teacher-list-workspace__head h3')?.textContent?.trim()||'Öğrenci Listesi';
  const school=root.querySelector('[data-sl-head="okulAdi"]')?.value||'';
  const year=root.querySelector('[data-sl-head="egitimYili"]')?.value||'';
  const teacher=val('ogretmen'),branch=val('brans'),principal=val('mudur');
  const orientation=val('yon')||'portrait';
  const docx=global.StudentListDocx;
  if(!docx?.generate)return false;
  const bytes=docx.generate({title,school,year,teacher,branch,principal,principalTitle:'Okul Müdürü',orientation,columns,rows});
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=safeName(title);
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  global.toast?.('Gerçek Word (.docx) dosyası hazırlandı.');
  return true;
}
function installDocxExport(){
  if(document.documentElement.dataset.slDocxExportInstalled==='1')return;
  document.documentElement.dataset.slDocxExportInstalled='1';
  document.addEventListener('click',async e=>{
    const button=e.target.closest?.('[data-sl-word]');if(!button)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const docx=await loadDocx();
    if(!docx)return global.toast?.('Word dışa aktarma modülü yüklenemedi.');
    try{if(!exportDocxFromLivePreview())global.toast?.('Canlı önizleme hazır değil.');}
    catch(err){console.error('[StudentListDocx]',err);global.toast?.('Word dosyası oluşturulamadı.');}
  },true);
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
    const a11y=await loadA11y();
    a11y?.install?.();
    installDocxExport();
    return result;
  },
  close(){
    global.StudentListLiveEnhancer?.uninstall?.();
    global.StudentListA11y?.uninstall?.();
    return global.StudentListPage?.close?.()!==false;
  },
  async render(){const page=await loadStudentPage();const result=await page.render?.();global.StudentListLiveEnhancer?.refresh?.();global.StudentListA11y?.refresh?.();return result;},
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
