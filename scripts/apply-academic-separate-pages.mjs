import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function write(path,v){fs.writeFileSync(path,v,'utf8')}
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let academic=read('js/modules/academic.js');
const tabs='<div class="ka-tabs" role="tablist"><button class="ka-tab" data-academic-tab="schedule" type="button">Ders Programı</button><button class="ka-tab" data-academic-tab="written" type="button">Yazılılar</button><button class="ka-tab" data-academic-tab="trial" type="button">Denemeler</button><button class="ka-tab" data-academic-tab="results" type="button">Sonuçlar</button><button class="ka-tab" data-academic-tab="plans" type="button">Yıllık Planlar</button><button class="ka-tab" data-academic-tab="calendar" type="button">Takvim</button></div>';
academic=once(academic,tabs,'','Academic internal tabs');
academic=once(academic,"function render(){if(!mounted)return;document.querySelectorAll('[data-academic-tab]').forEach(b=>b.classList.toggle('active',b.dataset.academicTab===active));const searchWrap=", "function render(){if(!mounted)return;const searchWrap=",'Academic render tab state');
academic=once(academic,"function bind(){document.querySelectorAll('[data-academic-tab]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.academicTab;query='';render()}));document.getElementById('academicSearch')?.addEventListener('input',e=>{query=e.target.value;render()})}","function bind(){document.getElementById('academicSearch')?.addEventListener('input',e=>{query=e.target.value;render()})}",'Academic tab binding');
academic=once(academic,"function unmount(){mounted=false;", "function openPage(page,title=''){const allowed=['schedule','written','trial','results','plans','calendar'];if(!allowed.includes(page))return false;active=page;query='';const h=document.querySelector('[data-academic-module] > .ka-row h2');if(h&&title)h.textContent=title;render();return true}\nfunction unmount(){mounted=false;",'Academic openPage insertion');
academic=once(academic,"window.AcademicModule={mount,unmount,render,prepareLocal,timerState,openSchedule(){active='schedule';render()}};","window.AcademicModule={mount,unmount,render,prepareLocal,timerState,openPage,openSchedule(){return openPage('schedule','Ders Programı')}};",'Academic public API');
if(academic.includes('data-academic-tab'))throw new Error('Academic tab tokens remain after migration');
write('js/modules/academic.js',academic);

let shell=read('js/core/shell-ui.js');
const marker="  const selector=name==='people'?`[data-people-tab=\"${page}\"]`:name==='academic'?`[data-academic-tab=\"${page}\"]`:name==='communication'?`[data-communication-tab=\"${page}\"]`:name==='management'?`[data-management-tab=\"${page}\"]`:name==='settings'?`[data-settings-tab=\"${page}\"]`:name==='tools'&&['checklists','map','attendance'].includes(page)?`[data-tools-tab=\"${page}\"]`:name==='tools'&&['rubric','project'].includes(page)?`[data-rubric-tool=\"${page}\"]`:'';";
const replacement="  if(name==='academic'&&['schedule','written','trial','results','plans','calendar'].includes(page)){\n    const ok=global.AcademicModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Akademik sayfa açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n  const selector=name==='people'?`[data-people-tab=\"${page}\"]`:name==='communication'?`[data-communication-tab=\"${page}\"]`:name==='management'?`[data-management-tab=\"${page}\"]`:name==='settings'?`[data-settings-tab=\"${page}\"]`:name==='tools'&&['checklists','map','attendance'].includes(page)?`[data-tools-tab=\"${page}\"]`:name==='tools'&&['rubric','project'].includes(page)?`[data-rubric-tool=\"${page}\"]`:'';";
shell=once(shell,marker,replacement,'Shell academic route');
if(shell.includes('[data-academic-tab='))throw new Error('Shell still routes Academic through tabs');
write('js/core/shell-ui.js',shell);

console.log('Academic screens migrated from internal tabs to direct page routing.');
