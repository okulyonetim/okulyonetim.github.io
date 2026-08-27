import fs from 'node:fs';

// Guarded migration v2: canonical UI routing + explicit lifecycle close contracts.
function patchFile(path,patcher){const original=fs.readFileSync(path,'utf8'),next=patcher(original);if(next===original)throw new Error(`No changes generated for ${path}`);fs.writeFileSync(path,next,'utf8')}
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting.`);return src.replace(oldText,newText)}

patchFile('js/modules/teacher-list.js',src=>{
 src=once(src,
  "global.OgretmenListeUI={open:openUI,render:renderUI,newDraft,openRecord,openReport,exportExcel};",
  "function closeUI(){try{unsubscribe?.()}catch(_){}unsubscribe=null;editingId='';draft=null;selectedClass='';return true}\nglobal.OgretmenListeUI={open:openUI,close:closeUI,render:renderUI,newDraft,openRecord,openReport,exportExcel};",
  'OgretmenListeUI export');
 src=once(src,
  "global.OdevNotUI={open,close,render};",
  "global.OdevNotUI={open,close,render,get page(){return page}};",
  'OdevNotUI export');
 return src;
});

patchFile('js/core/shell-ui.js',src=>{
 const oldBlock=`  const studentPages={'student-attendance':'attendance','student-list':'student-list',homework:'homework',grades:'grades'};
  if(name==='tools'&&studentPages[page]){
    global.ToolsModule?.unmount?.();
    Promise.resolve(global.StudentPages?.open?.(studentPages[page],title)).catch(e=>{console.error('[Shell/student-page]',e);global.toast?.('Öğrenci sayfası açılamadı.');});
    if(title)setTitle(title);return true;
  }`;
 const newBlock=`  const studentPages={'student-attendance':'attendance','student-list':'student-list',homework:'homework',grades:'grades'};
  if(name==='tools'&&page==='student-attendance'){
    global.ToolsModule?.unmount?.();
    Promise.resolve(global.StudentPages?.open?.('attendance',title)).catch(e=>{console.error('[Shell/student-attendance]',e);global.toast?.('Öğrenci yoklama açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='tools'&&page==='student-list'){
    Promise.resolve(global.OgretmenListeUI?.open?.()).then(()=>requestAnimationFrame(()=>{const shell=root.querySelector('[data-tools-module]');if(shell){const head=shell.querySelector(':scope > .ka-row'),tabs=shell.querySelector('.ka-tabs');if(head)head.hidden=true;if(tabs)tabs.hidden=true}})).catch(e=>{console.error('[Shell/student-list]',e);global.toast?.('Öğrenci listesi oluşturucu açılamadı.');});
    if(title)setTitle(title);return true;
  }
  if(name==='tools'&&(page==='homework'||page==='grades')){
    global.ToolsModule?.unmount?.();
    Promise.resolve(global.OdevNotUI?.open?.(studentPages[page])).catch(e=>{console.error('[Shell/gradebook]',e);global.toast?.('Çizelge açılamadı.');});
    if(title)setTitle(title);return true;
  }`;
 src=once(src,oldBlock,newBlock,'student tool applySubpage routing');

 const oldLifecycle=`  closeHeaderPopover();closeMenu();
  if(!(name==='tools'&&FORM_PAGES[page]))cleanupFormPage();
  if(!(name==='tools'&&['student-attendance','student-list','homework','grades'].includes(page)))global.StudentPages?.close?.();`;
 const newLifecycle=`  const requestedGradePage=name==='tools'&&(page==='homework'||page==='grades')?page:'';
  if(global.OdevNotUI?.page&&global.OdevNotUI.page!==requestedGradePage&&global.OdevNotUI.close?.()===false)return false;
  if(!(name==='tools'&&page==='student-list'))global.OgretmenListeUI?.close?.();
  if(!(name==='tools'&&page==='student-attendance'))global.StudentPages?.close?.();
  closeHeaderPopover();closeMenu();
  if(!(name==='tools'&&FORM_PAGES[page]))cleanupFormPage();`;
 src=once(src,oldLifecycle,newLifecycle,'student tool route lifecycle');
 return src;
});

console.log('Student tool routing consolidated onto canonical UI engines.');
