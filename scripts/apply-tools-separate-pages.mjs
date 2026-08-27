import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let tools=read('js/modules/tools.js');
const tabs='<div class="ka-tabs"><button class="ka-tab" data-tools-tab="checklists">Kontrol Listeleri</button><button class="ka-tab" data-tools-tab="map">Harita</button><button class="ka-tab" data-tools-tab="forms">Çizelgeler</button><button class="ka-tab" data-tools-tab="attendance">Devamsızlık</button></div>';
tools=once(tools,tabs,'','Tools internal tabs');
tools=once(tools,"function render(){if(!mounted)return;document.querySelectorAll('[data-tools-tab]').forEach(b=>b.classList.toggle('active',b.dataset.toolsTab===active));if(active==='map')", "function render(){if(!mounted)return;if(active==='map')",'Tools render tab state');
tools=once(tools,"function bind(){document.querySelectorAll('[data-tools-tab]').forEach(b=>b.onclick=async()=>{active=b.dataset.toolsTab;if(active==='map')await global.ToolsData?.prepareMap?.();if(active==='forms')await global.ToolsData?.prepareForms?.();if(active==='attendance')await global.ToolsData?.prepareAttendance?.();render()})}","function bind(){}",'Tools tab binding');
tools=once(tools,"function unmount(){mounted=false;", "function openPage(page,title=''){const allowed=['checklists','map','forms','attendance'];if(!allowed.includes(page))return false;active=page;const h=document.querySelector('[data-tools-module] > .ka-row h2');if(h&&title)h.textContent=title;render();let prep=null;if(page==='map')prep=global.ToolsData?.prepareMap?.();else if(page==='forms')prep=global.ToolsData?.prepareForms?.();else if(page==='attendance')prep=global.ToolsData?.prepareAttendance?.();else prep=global.ToolsData?.prepareControlLists?.();Promise.resolve(prep).then(()=>{if(mounted&&active===page)render()}).catch(e=>console.warn('[Tools/openPage]',e?.message||e));return true}\nfunction unmount(){mounted=false;",'Tools openPage insertion');
tools=once(tools,"global.ToolsModule={mount,unmount,render};","global.ToolsModule={mount,unmount,render,openPage};",'Tools public API');
if(tools.includes('data-tools-tab'))throw new Error('Tools tab tokens remain after migration');
for(const token of ['KontrolListeleriService','HaritaService','CizelgelerService','DevamsizlikCizelgesiService','tamamlamaKaydet','favoriSil','renderForms','renderAttendance'])if(!tools.includes(token))throw new Error(`Tools behavior contract lost: ${token}`);
write('js/modules/tools.js',tools);

let shell=read('js/core/shell-ui.js');
const oldApply=/function applyFormPage\(root,page,title\)\{.*?return true\}/s;
const m=shell.match(oldApply);if(!m)throw new Error('Shell applyFormPage contract not found; aborting');
const replacement=`function applyFormPage(root,page,title){const wanted=FORM_PAGES[page];if(!wanted)return false;const ok=global.ToolsModule?.openPage?.('forms',title);if(ok===false)return false;hideModuleChrome(root,'tools');const applyFilter=()=>{const content=root.querySelector('#toolsContent');content?.querySelectorAll(':scope > section').forEach(section=>{const h=section.querySelector('h3');section.hidden=!h||!String(h.textContent||'').trim().startsWith(wanted)})};cleanupFormPage();requestAnimationFrame(()=>{applyFilter();const content=root.querySelector('#toolsContent');if(content){global.__kaFormPageObserver=new MutationObserver(applyFilter);global.__kaFormPageObserver.observe(content,{childList:true})}});if(title)setTitle(title);return true}`;
shell=shell.replace(oldApply,replacement);
const selectorOld="name==='tools'&&['checklists','map','attendance'].includes(page)?`[data-tools-tab=\"${page}\"]`:";
if(!shell.includes(selectorOld))throw new Error('Shell Tools tab selector not found; aborting');
const anchor="  const selector=name==='tools'&&['checklists','map','attendance'].includes(page)?";
if(!shell.includes(anchor))throw new Error('Shell Tools selector anchor not found; aborting');
const direct=`  if(name==='tools'&&['checklists','map','attendance'].includes(page)){\n    const ok=global.ToolsModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Araç sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n`;
shell=shell.replace(anchor,direct+anchor).replace(selectorOld,'');
if(shell.includes('[data-tools-tab='))throw new Error('Shell still routes Tools through tabs');
write('js/core/shell-ui.js',shell);
console.log('Tools screens migrated from internal tabs to direct page routing.');
